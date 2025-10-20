/**
 * Tests for unified IP detection service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request } from 'express';
import {
  getClientIP,
  getIP,
  getValidatedClientIP,
  isValidIP,
  sanitizeIP,
  validateIPDetectionConfig,
  logIPDetection
} from '../ipDetection.js';

// Mock console methods to avoid noise in tests
const mockConsole = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

vi.stubGlobal('console', mockConsole);

// Helper function to create mock request objects
function createMockRequest(headers: Record<string, string | string[]> = {}, socketAddress?: string): Request {
  const mockSocket = {
    remoteAddress: socketAddress
  };

  return {
    headers,
    socket: mockSocket,
    connection: mockSocket,
    method: 'GET',
    path: '/test'
  } as unknown as Request;
}

describe('IP Detection Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isValidIP', () => {
    it('should validate IPv4 addresses correctly', () => {
      expect(isValidIP('192.168.1.1')).toBe(true);
      expect(isValidIP('10.0.0.1')).toBe(true);
      expect(isValidIP('172.16.0.1')).toBe(true);
      expect(isValidIP('8.8.8.8')).toBe(true);
      expect(isValidIP('127.0.0.1')).toBe(true);
      expect(isValidIP('255.255.255.255')).toBe(true);
    });

    it('should reject invalid IPv4 addresses', () => {
      expect(isValidIP('256.1.1.1')).toBe(false);
      expect(isValidIP('192.168.1')).toBe(false);
      expect(isValidIP('192.168.1.1.1')).toBe(false);
      expect(isValidIP('192.168.1.a')).toBe(false);
      expect(isValidIP('')).toBe(false);
      expect(isValidIP('not-an-ip')).toBe(false);
    });

    it('should validate IPv6 addresses correctly', () => {
      expect(isValidIP('::1')).toBe(true);
      expect(isValidIP('::')).toBe(true);
      expect(isValidIP('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
      expect(isValidIP('2001:db8::8a2e:370:7334')).toBe(true);
    });

    it('should handle edge cases', () => {
      expect(isValidIP(null as any)).toBe(false);
      expect(isValidIP(undefined as any)).toBe(false);
      expect(isValidIP(123 as any)).toBe(false);
      expect(isValidIP('  192.168.1.1  ')).toBe(true); // Should handle whitespace
    });
  });

  describe('sanitizeIP', () => {
    it('should remove invalid characters', () => {
      expect(sanitizeIP('192.168.1.1')).toBe('192.168.1.1');
      expect(sanitizeIP('  192.168.1.1  ')).toBe('192.168.1.1');
      expect(sanitizeIP('192.168.1.1<script>')).toBe('192.168.1.1');
      expect(sanitizeIP('192.168.1.1;DROP TABLE')).toBe('192.168.1.1');
    });

    it('should handle IPv6 addresses', () => {
      expect(sanitizeIP('2001:db8::1')).toBe('2001:db8::1');
      expect(sanitizeIP('  ::1  ')).toBe('::1');
    });

    it('should handle edge cases', () => {
      expect(sanitizeIP('')).toBe('');
      expect(sanitizeIP(null as any)).toBe('');
      expect(sanitizeIP(undefined as any)).toBe('');
    });
  });

  describe('getClientIP', () => {
    it('should extract IP from X-Forwarded-For header', () => {
      const req = createMockRequest({
        'x-forwarded-for': '203.0.113.1, 192.168.1.1, 10.0.0.1'
      });

      const result = getClientIP(req, { enableLogging: false });

      expect(result.ip).toBe('203.0.113.1');
      expect(result.source).toBe('x-forwarded-for');
      expect(result.isValid).toBe(true);
      expect(result.originalHeader).toBe('203.0.113.1, 192.168.1.1, 10.0.0.1');
    });

    it('should handle single IP in X-Forwarded-For', () => {
      const req = createMockRequest({
        'x-forwarded-for': '203.0.113.1'
      });

      const result = getClientIP(req, { enableLogging: false });

      expect(result.ip).toBe('203.0.113.1');
      expect(result.source).toBe('x-forwarded-for');
      expect(result.isValid).toBe(true);
    });

    it('should fallback to X-Real-IP when X-Forwarded-For is invalid', () => {
      const req = createMockRequest({
        'x-forwarded-for': 'invalid-ip',
        'x-real-ip': '203.0.113.2'
      });

      const result = getClientIP(req, { enableLogging: false });

      expect(result.ip).toBe('203.0.113.2');
      expect(result.source).toBe('x-real-ip');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Invalid X-Forwarded-For header: invalid-ip');
    });

    it('should fallback to socket address when headers are invalid', () => {
      const req = createMockRequest({
        'x-forwarded-for': 'invalid-ip',
        'x-real-ip': 'also-invalid'
      }, '203.0.113.3');

      const result = getClientIP(req, { enableLogging: false });

      expect(result.ip).toBe('203.0.113.3');
      expect(result.source).toBe('socket');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Invalid X-Forwarded-For header: invalid-ip');
      expect(result.warnings).toContain('Invalid X-Real-IP header: also-invalid');
    });

    it('should use fallback IP when no valid source is found', () => {
      const req = createMockRequest({
        'x-forwarded-for': 'invalid-ip',
        'x-real-ip': 'also-invalid'
      }, 'invalid-socket');

      const result = getClientIP(req, { enableLogging: false, fallbackIP: '127.0.0.1' });

      expect(result.ip).toBe('127.0.0.1');
      expect(result.source).toBe('fallback');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('No valid IP found in any source, using fallback');
    });

    it('should respect trustProxy option', () => {
      const req = createMockRequest({
        'x-forwarded-for': '203.0.113.1'
      }, '192.168.1.1');

      const result = getClientIP(req, { trustProxy: false, enableLogging: false });

      expect(result.ip).toBe('192.168.1.1');
      expect(result.source).toBe('socket');
      expect(result.isValid).toBe(true);
    });

    it('should handle array headers', () => {
      const req = createMockRequest({
        'x-forwarded-for': ['203.0.113.1', '192.168.1.1'],
        'x-real-ip': ['203.0.113.2']
      });

      const result = getClientIP(req, { enableLogging: false });

      expect(result.ip).toBe('203.0.113.1');
      expect(result.source).toBe('x-forwarded-for');
      expect(result.isValid).toBe(true);
    });

    it('should log IP detection when enabled', () => {
      const req = createMockRequest({
        'x-forwarded-for': '203.0.113.1'
      });

      getClientIP(req, { enableLogging: true });

      expect(mockConsole.log).toHaveBeenCalled();
    });

    it('should log warnings for invalid IPs', () => {
      const req = createMockRequest({
        'x-forwarded-for': 'invalid-ip'
      }, '203.0.113.1');

      getClientIP(req, { enableLogging: true });

      expect(mockConsole.warn).toHaveBeenCalled();
    });
  });

  describe('getIP', () => {
    it('should return just the IP string for backward compatibility', () => {
      const req = createMockRequest({
        'x-forwarded-for': '203.0.113.1'
      });

      const ip = getIP(req, { enableLogging: false });

      expect(typeof ip).toBe('string');
      expect(ip).toBe('203.0.113.1');
    });
  });

  describe('getValidatedClientIP', () => {
    it('should add warnings for localhost IPs', () => {
      const req = createMockRequest({}, '127.0.0.1');

      const result = getValidatedClientIP(req, { enableLogging: false });

      expect(result.ip).toBe('127.0.0.1');
      expect(result.warnings).toContain('Localhost IP detected - may indicate proxy misconfiguration');
    });

    it('should add warnings for private IP ranges', () => {
      const req = createMockRequest({}, '192.168.1.1');

      const result = getValidatedClientIP(req, { enableLogging: false });

      expect(result.ip).toBe('192.168.1.1');
      expect(result.warnings).toContain('Private IP range detected - verify proxy configuration');
    });

    it('should handle IPv6 localhost', () => {
      const req = createMockRequest({}, '::1');

      const result = getValidatedClientIP(req, { enableLogging: false });

      expect(result.ip).toBe('::1');
      expect(result.warnings).toContain('Localhost IP detected - may indicate proxy misconfiguration');
    });

    it('should not add warnings for public IPs', () => {
      const req = createMockRequest({}, '8.8.8.8');

      const result = getValidatedClientIP(req, { enableLogging: false });

      expect(result.ip).toBe('8.8.8.8');
      expect(result.warnings).toBeUndefined();
    });
  });

  describe('validateIPDetectionConfig', () => {
    it('should validate configuration and return warnings', () => {
      // Mock environment variables
      const originalEnv = process.env;
      process.env = { ...originalEnv };
      delete process.env.TRUST_PROXY;

      const result = validateIPDetectionConfig();

      expect(result.isValid).toBe(false);
      expect(result.warnings).toContain('TRUST_PROXY environment variable not set - using default (true)');

      process.env = originalEnv;
    });

    it('should validate fallback IP configuration', () => {
      const originalEnv = process.env;
      process.env = { 
        ...originalEnv, 
        TRUST_PROXY: 'true',
        IP_DETECTION_FALLBACK: 'invalid-ip'
      };

      const result = validateIPDetectionConfig();

      expect(result.isValid).toBe(false);
      expect(result.warnings).toContain('Invalid IP_DETECTION_FALLBACK: invalid-ip');

      process.env = originalEnv;
    });

    it('should return valid for proper configuration', () => {
      const originalEnv = process.env;
      process.env = { 
        ...originalEnv, 
        TRUST_PROXY: 'true',
        IP_DETECTION_FALLBACK: '127.0.0.1'
      };

      const result = validateIPDetectionConfig();

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);

      process.env = originalEnv;
    });
  });

  describe('logIPDetection', () => {
    it('should log IP detection results', () => {
      const req = createMockRequest({
        'x-forwarded-for': '203.0.113.1',
        'user-agent': 'test-agent'
      });

      const result = {
        ip: '203.0.113.1',
        source: 'x-forwarded-for' as const,
        isValid: true,
        originalHeader: '203.0.113.1'
      };

      logIPDetection(req, result);

      expect(mockConsole.log).toHaveBeenCalled();
      const logCall = mockConsole.log.mock.calls[0];
      expect(logCall[0]).toBe('IP Detection:');
      
      const logData = JSON.parse(logCall[1]);
      expect(logData.detectedIP).toBe('203.0.113.1');
      expect(logData.source).toBe('x-forwarded-for');
      expect(logData.headers['user-agent']).toBe('test-agent');
    });

    it('should log warnings for invalid results', () => {
      const req = createMockRequest({});

      const result = {
        ip: '127.0.0.1',
        source: 'fallback' as const,
        isValid: false,
        warnings: ['Test warning']
      };

      logIPDetection(req, result);

      expect(mockConsole.warn).toHaveBeenCalled();
      const warnCall = mockConsole.warn.mock.calls[0];
      expect(warnCall[0]).toBe('IP Detection Warning:');
    });
  });
});