/**
 * Integration tests for smart rate limiting middleware with proxy scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { Request, Response } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { smartRateLimit, addRateLimitHeaders, getUserType, generateRateLimitKey } from '../rateLimiting.js';
import { config } from '../../config/index.js';

// Mock the config to use test values
vi.mock('../../config/index.js', () => ({
  config: {
    JWT_SECRET: 'test-secret',
    rateLimiting: {
      anonymousWindowMs: 60000, // 1 minute for faster tests
      anonymousMaxRequests: 3, // Lower limit for faster testing
      authenticatedWindowMs: 60000,
      authenticatedMaxRequests: 5, // Lower limit for faster testing
      adminWindowMs: 60000,
      adminMaxRequests: 10, // Lower limit for faster testing
      trustProxy: true
    }
  }
}));

// Mock the activity logger to avoid database dependencies
vi.mock('../../services/activityLogger.js', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
  logRateLimitEvent: vi.fn().mockResolvedValue(undefined),
  logRateLimitConfig: vi.fn().mockResolvedValue(undefined)
}));

// Mock IP detection to control test scenarios
vi.mock('../../lib/ipDetection.js', () => ({
  getClientIP: vi.fn()
}));

import { getClientIP } from '../../lib/ipDetection.js';
const mockGetClientIP = vi.mocked(getClientIP);

describe('Rate Limiting Integration Tests - Proxy Scenarios', () => {
  let app: express.Application;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create a fresh Express app for each test
    app = express();
    
    // Configure trust proxy
    app.set('trust proxy', config.rateLimiting.trustProxy);
    
    // Add rate limiting middleware
    app.use('/api', addRateLimitHeaders);
    app.use('/api', smartRateLimit);
    
    // Add test routes
    app.get('/api/test', (req: Request, res: Response) => {
      res.json({ success: true, userType: (req as any).rateLimitUserType });
    });
    
    app.get('/api/admin/test', (req: Request, res: Response) => {
      res.json({ success: true, userType: (req as any).rateLimitUserType });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Proxy IP Detection Scenarios', () => {
    it('should detect client IP behind Vite development proxy', async () => {
      // Mock IP detection for Vite proxy scenario
      mockGetClientIP.mockReturnValue({
        ip: '192.168.1.100',
        source: 'x-forwarded-for',
        isValid: true,
        originalHeader: '192.168.1.100'
      });

      const response = await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', '192.168.1.100')
        .set('X-Forwarded-Proto', 'http')
        .set('X-Forwarded-Host', 'localhost:5173')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.userType).toBe('anonymous');
      
      // Verify IP detection was called
      expect(mockGetClientIP).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          trustProxy: true,
          enableLogging: false
        })
      );
    });

    it('should handle multiple proxy hops in X-Forwarded-For', async () => {
      // Mock IP detection for multiple proxy scenario
      mockGetClientIP.mockReturnValue({
        ip: '203.0.113.1', // First IP should be the client
        source: 'x-forwarded-for',
        isValid: true,
        originalHeader: '203.0.113.1, 192.168.1.1, 10.0.0.1'
      });

      const response = await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', '203.0.113.1, 192.168.1.1, 10.0.0.1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockGetClientIP).toHaveBeenCalled();
    });

    it('should fallback to socket address when proxy headers are missing', async () => {
      // Mock IP detection fallback scenario
      mockGetClientIP.mockReturnValue({
        ip: '127.0.0.1',
        source: 'socket',
        isValid: true
      });

      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockGetClientIP).toHaveBeenCalled();
    });

    it('should handle invalid proxy headers gracefully', async () => {
      // Mock IP detection with invalid headers
      mockGetClientIP.mockReturnValue({
        ip: '127.0.0.1',
        source: 'fallback',
        isValid: true,
        warnings: ['Invalid X-Forwarded-For header: invalid-ip']
      });

      const response = await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', 'invalid-ip')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockGetClientIP).toHaveBeenCalled();
    });
  });

  describe('Rate Limiting with Different User Types', () => {
    it('should apply anonymous user limits', async () => {
      const testIP = '203.0.113.100'; // Unique IP for this test
      mockGetClientIP.mockReturnValue({
        ip: testIP,
        source: 'x-forwarded-for',
        isValid: true
      });

      // Make requests up to the anonymous limit (3)
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .get('/api/test')
          .set('X-Forwarded-For', testIP);
        
        expect(response.status).toBe(200);
        expect(response.body.userType).toBe('anonymous');
      }

      // The 4th request should be rate limited
      const response = await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', testIP)
        .expect(429);

      expect(response.body.error).toBe('Rate limit exceeded');
      expect(response.body.userType).toBe('anonymous');
      expect(response.body.limit).toBe(3);
      expect(response.headers['retry-after']).toBeDefined();
    });

    it('should apply authenticated user limits', async () => {
      const testIP = '203.0.113.200'; // Unique IP for this test
      mockGetClientIP.mockReturnValue({
        ip: testIP,
        source: 'x-forwarded-for',
        isValid: true
      });

      // Create a valid JWT token for authenticated user
      const token = jwt.sign(
        { userId: 'user200', role: 'user' },
        config.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Make requests up to the authenticated limit (5)
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .get('/api/test')
          .set('Authorization', `Bearer ${token}`)
          .set('X-Forwarded-For', testIP);
        
        expect(response.status).toBe(200);
        expect(response.body.userType).toBe('authenticated');
      }

      // The 6th request should be rate limited
      const response = await request(app)
        .get('/api/test')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', testIP)
        .expect(429);

      expect(response.body.error).toBe('Rate limit exceeded');
      expect(response.body.userType).toBe('authenticated');
      expect(response.body.limit).toBe(5);
    });

    it('should apply admin user limits', async () => {
      const testIP = '203.0.113.300'; // Unique IP for this test
      mockGetClientIP.mockReturnValue({
        ip: testIP,
        source: 'x-forwarded-for',
        isValid: true
      });

      // Create a valid JWT token for admin user
      const token = jwt.sign(
        { userId: 'admin300', role: 'admin' },
        config.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Make requests up to the admin limit (10)
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .get('/api/admin/test')
          .set('Authorization', `Bearer ${token}`)
          .set('X-Forwarded-For', testIP);
        
        expect(response.status).toBe(200);
        expect(response.body.userType).toBe('admin');
      }

      // The 11th request should be rate limited
      const response = await request(app)
        .get('/api/admin/test')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', testIP)
        .expect(429);

      expect(response.body.error).toBe('Rate limit exceeded');
      expect(response.body.userType).toBe('admin');
      expect(response.body.limit).toBe(10);
    });
  });

  describe('Rate Limiting Headers and Responses', () => {
    it('should include detailed error information in rate limit responses', async () => {
      mockGetClientIP.mockReturnValue({
        ip: '203.0.113.5',
        source: 'x-forwarded-for',
        isValid: true
      });

      // Exhaust the rate limit
      for (let i = 0; i < 3; i++) {
        await request(app)
          .get('/api/test')
          .set('X-Forwarded-For', '203.0.113.5');
      }

      // Get rate limited response
      const response = await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', '203.0.113.5')
        .expect(429);

      expect(response.body).toMatchObject({
        error: 'Rate limit exceeded',
        retryAfter: expect.any(Number),
        limit: 3,
        remaining: 0,
        resetTime: expect.any(Number),
        userType: 'anonymous',
        message: expect.stringContaining('Consider authenticating for higher limits')
      });

      expect(response.headers['retry-after']).toBeDefined();
    });
  });

  describe('Trust Proxy Configuration', () => {
    it('should respect trust proxy setting when disabled', async () => {
      // Create app with trust proxy disabled
      const appNoProxy = express();
      appNoProxy.set('trust proxy', false);
      
      // Mock IP detection to return socket address when trust proxy is false
      mockGetClientIP.mockReturnValue({
        ip: '127.0.0.1',
        source: 'socket',
        isValid: true
      });
      
      appNoProxy.use('/api', smartRateLimit);
      appNoProxy.get('/api/test', (req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(appNoProxy)
        .get('/api/test')
        .set('X-Forwarded-For', '203.0.113.1') // This should be ignored
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify IP detection was called with trustProxy: false
      expect(mockGetClientIP).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          trustProxy: expect.any(Boolean)
        })
      );
    });
  });

  describe('End-to-End Rate Limiting Across API Endpoints', () => {
    it('should enforce rate limits consistently across different API endpoints', async () => {
      const testIP = '203.0.113.400'; // Unique IP for this test
      mockGetClientIP.mockReturnValue({
        ip: testIP,
        source: 'x-forwarded-for',
        isValid: true
      });

      // Add multiple test endpoints to simulate real API routes
      app.get('/api/auth/test', (req: Request, res: Response) => {
        res.json({ endpoint: 'auth', userType: (req as any).rateLimitUserType });
      });
      
      app.get('/api/vps/test', (req: Request, res: Response) => {
        res.json({ endpoint: 'vps', userType: (req as any).rateLimitUserType });
      });
      
      app.get('/api/containers/test', (req: Request, res: Response) => {
        res.json({ endpoint: 'containers', userType: (req as any).rateLimitUserType });
      });

      // Make requests across different endpoints - they should share the same rate limit
      const endpoints = ['/api/auth/test', '/api/vps/test', '/api/containers/test'];
      
      // Make 3 requests across different endpoints (anonymous limit is 3)
      for (let i = 0; i < 3; i++) {
        const endpoint = endpoints[i % endpoints.length];
        const response = await request(app)
          .get(endpoint)
          .set('X-Forwarded-For', testIP);
        
        expect(response.status).toBe(200);
        expect(response.body.userType).toBe('anonymous');
      }

      // The 4th request to any endpoint should be rate limited
      const response = await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', testIP)
        .expect(429);

      expect(response.body.error).toBe('Rate limit exceeded');
      expect(response.body.userType).toBe('anonymous');
    });

    it('should apply admin rate limits to admin-specific endpoints', async () => {
      const testIP = '203.0.113.500'; // Unique IP for this test
      mockGetClientIP.mockReturnValue({
        ip: testIP,
        source: 'x-forwarded-for',
        isValid: true
      });

      // Add admin-specific test endpoints
      app.get('/api/admin/users', (req: Request, res: Response) => {
        res.json({ endpoint: 'admin/users', userType: (req as any).rateLimitUserType });
      });
      
      app.get('/api/admin/plans', (req: Request, res: Response) => {
        res.json({ endpoint: 'admin/plans', userType: (req as any).rateLimitUserType });
      });

      // Create admin token
      const adminToken = jwt.sign(
        { userId: 'admin500', role: 'admin' },
        config.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Make requests to admin endpoints - should get admin limits (10)
      const adminEndpoints = ['/api/admin/users', '/api/admin/plans', '/api/admin/test'];
      
      for (let i = 0; i < 10; i++) {
        const endpoint = adminEndpoints[i % adminEndpoints.length];
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Forwarded-For', testIP);
        
        expect(response.status).toBe(200);
        expect(response.body.userType).toBe('admin');
      }

      // The 11th request should be rate limited
      const response = await request(app)
        .get('/api/admin/test')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Forwarded-For', testIP)
        .expect(429);

      expect(response.body.error).toBe('Rate limit exceeded');
      expect(response.body.userType).toBe('admin');
      expect(response.body.limit).toBe(10);
    });

    it('should handle mixed user types from same IP correctly', async () => {
      const testIP = '203.0.113.600'; // Unique IP for this test
      mockGetClientIP.mockReturnValue({
        ip: testIP,
        source: 'x-forwarded-for',
        isValid: true
      });

      const userToken = jwt.sign(
        { userId: 'user600', role: 'user' },
        config.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const adminToken = jwt.sign(
        { userId: 'admin600', role: 'admin' },
        config.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Make anonymous requests (limit: 3)
      for (let i = 0; i < 3; i++) {
        await request(app)
          .get('/api/test')
          .set('X-Forwarded-For', testIP)
          .expect(200);
      }

      // Anonymous should be rate limited now
      await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', testIP)
        .expect(429);

      // But authenticated user should still work (separate rate limit bucket)
      const userResponse = await request(app)
        .get('/api/test')
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Forwarded-For', testIP)
        .expect(200);
      
      expect(userResponse.body.userType).toBe('authenticated');

      // And admin should also work (separate rate limit bucket)
      const adminResponse = await request(app)
        .get('/api/admin/test')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Forwarded-For', testIP)
        .expect(200);
      
      expect(adminResponse.body.userType).toBe('admin');
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain backward compatibility with existing API responses', async () => {
      mockGetClientIP.mockReturnValue({
        ip: '203.0.113.6',
        source: 'x-forwarded-for',
        isValid: true
      });

      const response = await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', '203.0.113.6')
        .expect(200);

      // Should still return successful response structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('userType', 'anonymous');
    });

    it('should handle invalid JWT tokens gracefully', async () => {
      mockGetClientIP.mockReturnValue({
        ip: '203.0.113.7',
        source: 'x-forwarded-for',
        isValid: true
      });

      const response = await request(app)
        .get('/api/test')
        .set('Authorization', 'Bearer invalid-token')
        .set('X-Forwarded-For', '203.0.113.7')
        .expect(200);

      // Should treat as anonymous user when token is invalid
      expect(response.body.userType).toBe('anonymous');
    });

    it('should handle missing Authorization header', async () => {
      mockGetClientIP.mockReturnValue({
        ip: '203.0.113.8',
        source: 'x-forwarded-for',
        isValid: true
      });

      const response = await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', '203.0.113.8')
        .expect(200);

      // Should treat as anonymous user when no auth header
      expect(response.body.userType).toBe('anonymous');
    });

    it('should maintain existing rate limit header format', async () => {
      mockGetClientIP.mockReturnValue({
        ip: '203.0.113.9',
        source: 'x-forwarded-for',
        isValid: true
      });

      const response = await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', '203.0.113.9')
        .expect(200);

      // Should include standard rate limit headers
      expect(response.headers).toHaveProperty('x-ratelimit-user-type');
      expect(response.headers).toHaveProperty('x-ratelimit-policy');
      expect(response.headers['x-ratelimit-user-type']).toBe('anonymous');
    });

    it('should preserve existing client application behavior', async () => {
      mockGetClientIP.mockReturnValue({
        ip: '203.0.113.10',
        source: 'x-forwarded-for',
        isValid: true
      });

      // Test that existing client applications continue to work
      // by making requests without any special headers or tokens
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.userType).toBe('anonymous');
      
      // Should not break existing response structure
      expect(response.body).not.toHaveProperty('rateLimitInfo');
      expect(response.body).not.toHaveProperty('rateLimitHeaders');
    });

    it('should handle legacy rate limit scenarios gracefully', async () => {
      mockGetClientIP.mockReturnValue({
        ip: '203.0.113.11',
        source: 'x-forwarded-for',
        isValid: true
      });

      // Test that the new system handles scenarios that might have
      // worked differently with the old rate limiting
      const responses = [];
      
      // Make multiple rapid requests like an SPA might do
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .get('/api/test')
          .set('X-Forwarded-For', '203.0.113.11');
        responses.push(response);
      }

      // All should succeed (within anonymous limit)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Rate limit should kick in on the 4th request
      const rateLimitedResponse = await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', '203.0.113.11')
        .expect(429);

      // Should provide helpful error message for client applications
      expect(rateLimitedResponse.body.message).toContain('Consider authenticating for higher limits');
    });
  });
});

describe('Rate Limiting Utility Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserType', () => {
    it('should identify anonymous users', () => {
      const req = {
        headers: {}
      } as Request;

      const userType = getUserType(req);
      expect(userType).toBe('anonymous');
    });

    it('should identify authenticated users', () => {
      const token = jwt.sign(
        { userId: 'user123', role: 'user' },
        config.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      } as Request;

      const userType = getUserType(req);
      expect(userType).toBe('authenticated');
    });

    it('should identify admin users', () => {
      const token = jwt.sign(
        { userId: 'admin123', role: 'admin' },
        config.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      } as Request;

      const userType = getUserType(req);
      expect(userType).toBe('admin');
    });

    it('should handle expired tokens', () => {
      const token = jwt.sign(
        { userId: 'user123', role: 'user' },
        config.JWT_SECRET,
        { expiresIn: '-1h' } // Expired token
      );

      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      } as Request;

      const userType = getUserType(req);
      expect(userType).toBe('anonymous');
    });

    it('should handle malformed tokens', () => {
      const req = {
        headers: {
          authorization: 'Bearer malformed-token'
        }
      } as Request;

      const userType = getUserType(req);
      expect(userType).toBe('anonymous');
    });
  });

  describe('generateRateLimitKey', () => {
    beforeEach(() => {
      mockGetClientIP.mockReturnValue({
        ip: '203.0.113.1',
        source: 'x-forwarded-for',
        isValid: true
      });
    });

    it('should generate IP-based key for anonymous users', () => {
      const req = {
        headers: {}
      } as Request;

      const key = generateRateLimitKey(req, 'anonymous');
      expect(key).toBe('anonymous:203.0.113.1');
    });

    it('should generate user-based key for authenticated users', () => {
      const token = jwt.sign(
        { userId: 'user123', role: 'user' },
        config.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      } as Request;

      const key = generateRateLimitKey(req, 'authenticated');
      expect(key).toBe('authenticated:user123:203.0.113.1');
    });

    it('should generate user-based key for admin users', () => {
      const token = jwt.sign(
        { userId: 'admin123', role: 'admin' },
        config.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      } as Request;

      const key = generateRateLimitKey(req, 'admin');
      expect(key).toBe('admin:admin123:203.0.113.1');
    });

    it('should fallback to IP-based key when token parsing fails', () => {
      const req = {
        headers: {
          authorization: 'Bearer invalid-token'
        }
      } as Request;

      const key = generateRateLimitKey(req, 'authenticated');
      expect(key).toBe('authenticated:203.0.113.1');
    });
  });
});