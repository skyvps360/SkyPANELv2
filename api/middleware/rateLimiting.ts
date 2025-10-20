/**
 * Smart Rate Limiting Middleware
 * 
 * Provides differentiated rate limiting based on user authentication status
 * with proper IP detection and comprehensive logging.
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { getClientIP } from '../lib/ipDetection.js';
import { logActivity, logRateLimitEvent } from '../services/activityLogger.js';
import { recordRateLimitEvent } from '../services/rateLimitMetrics.js';
import type { AuthenticatedRequest } from './auth.js';

export type UserType = 'anonymous' | 'authenticated' | 'admin';

export interface RateLimitResponse {
  error: string;
  retryAfter: number;        // Seconds until reset
  limit: number;             // Current limit
  remaining: number;         // Requests remaining
  resetTime: number;         // Unix timestamp
  userType: string;          // User classification
  message?: string;          // Additional guidance
}

/**
 * Determines user type based on JWT token and user role
 */
export function getUserType(req: Request): UserType {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return 'anonymous';
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    
    if (!decoded || !decoded.userId) {
      return 'anonymous';
    }

    // Check if user has admin role from the token
    // Note: This is a quick check - full user validation happens in auth middleware
    if (decoded.role === 'admin') {
      return 'admin';
    }

    // If we have a valid token with a user ID, consider them authenticated
    return 'authenticated';
  } catch {
    // Invalid or expired token - treat as anonymous
    return 'anonymous';
  }
}

/**
 * Enhanced key generation using unified IP detection
 */
export function generateRateLimitKey(req: Request, userType: UserType): string {
  const ipResult = getClientIP(req, { 
    trustProxy: Boolean(config.rateLimiting.trustProxy),
    enableLogging: false // Disable logging here to avoid spam
  });
  
  const clientIP = ipResult.ip;
  
  // For authenticated users, include user ID if available
  if (userType !== 'anonymous') {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      
      if (token) {
        const decoded = jwt.verify(token, config.JWT_SECRET) as any;
        if (decoded?.userId) {
          return `${userType}:${decoded.userId}:${clientIP}`;
        }
      }
    } catch {
      // Fall back to IP-only key if token parsing fails
    }
  }
  
  // Default to IP-based key
  return `${userType}:${clientIP}`;
}

/**
 * Custom response handler with detailed headers and error messages
 */
export function createCustomHandler(userType: UserType) {
  return async (req: Request, res: Response): Promise<void> => {
    const ipResult = getClientIP(req, { 
      trustProxy: Boolean(config.rateLimiting.trustProxy),
      enableLogging: true 
    });
    
    // Get rate limit configuration for this user type
    const rateLimitConfig = config.rateLimiting;
    let limit: number;
    let windowMs: number;
    
    switch (userType) {
      case 'admin':
        limit = rateLimitConfig.adminMaxRequests;
        windowMs = rateLimitConfig.adminWindowMs;
        break;
      case 'authenticated':
        limit = rateLimitConfig.authenticatedMaxRequests;
        windowMs = rateLimitConfig.authenticatedWindowMs;
        break;
      default:
        limit = rateLimitConfig.anonymousMaxRequests;
        windowMs = rateLimitConfig.anonymousWindowMs;
    }
    
    const resetTime = Date.now() + windowMs;
    const retryAfter = Math.ceil(windowMs / 1000);
    const currentCount = limit + 1; // Exceeded, so at least limit + 1
    
    // Create detailed response with enhanced guidance
    const guidanceMessage = userType === 'anonymous' 
      ? 'Consider creating an account for higher rate limits and better service access.'
      : userType === 'authenticated'
      ? 'You have reached your request limit. Please wait before making additional requests.'
      : 'Admin rate limit reached. If this is unexpected, please check for automated processes.';
    
    const response: RateLimitResponse = {
      error: 'Rate limit exceeded',
      retryAfter,
      limit,
      remaining: 0,
      resetTime,
      userType,
      message: `Too many requests. ${guidanceMessage}`
    };
    
    // Set standard rate limit headers
    res.set({
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
      'Retry-After': retryAfter.toString(),
      'X-RateLimit-Policy': `${limit} requests per ${Math.ceil(windowMs / 60000)} minutes for ${userType} users`
    });
    
    // Get user ID for logging
    let userId: string | undefined;
    try {
      const authReq = req as AuthenticatedRequest;
      userId = authReq.user?.id;
    } catch {
      // No user ID available for anonymous requests
    }
    
    // Record metrics event for monitoring and analysis
    recordRateLimitEvent(req, userType, limit, currentCount, windowMs, resetTime, userId);
    
    // Log rate limit violation for monitoring using enhanced rate limit logging
    try {
      const authReq = req as AuthenticatedRequest;
      await logRateLimitEvent({
        userId: authReq.user?.id,
        organizationId: authReq.user?.organizationId,
        endpoint: req.path,
        userType,
        limit,
        windowMs,
        currentCount,
        resetTime,
        clientIP: ipResult.ip,
        userAgent: req.headers['user-agent'] as string
      }, req);
    } catch (error) {
      console.error('Failed to log rate limit violation:', error);
    }
    
    res.status(429).json(response);
  };
}/**

 * Creates a rate limiter for a specific user type
 */
export function createRateLimiter(userType: UserType): RateLimitRequestHandler {
  const rateLimitConfig = config.rateLimiting;
  
  let windowMs: number;
  let max: number;
  
  switch (userType) {
    case 'admin':
      windowMs = rateLimitConfig.adminWindowMs;
      max = rateLimitConfig.adminMaxRequests;
      break;
    case 'authenticated':
      windowMs = rateLimitConfig.authenticatedWindowMs;
      max = rateLimitConfig.authenticatedMaxRequests;
      break;
    default: // anonymous
      windowMs = rateLimitConfig.anonymousWindowMs;
      max = rateLimitConfig.anonymousMaxRequests;
  }
  
  return rateLimit({
    windowMs,
    max,
    keyGenerator: (req: Request) => generateRateLimitKey(req, userType),
    handler: createCustomHandler(userType),
    standardHeaders: true,
    legacyHeaders: false,
    // Add current limit info to successful responses
    // Rate limit reached logging is handled in the custom handler
    // Never skip - we want to track all requests
    // Add rate limit headers to all responses
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  });
}

// Pre-create rate limiters to avoid creating them during request handling
const anonymousLimiter = createRateLimiter('anonymous');
const authenticatedLimiter = createRateLimiter('authenticated');
const adminLimiter = createRateLimiter('admin');

/**
 * Smart rate limiting middleware that dynamically selects limits based on user type
 */
export function smartRateLimit(req: Request, res: Response, next: NextFunction): void {
  const userType = getUserType(req);
  
  // Add user type to request for debugging
  (req as any).rateLimitUserType = userType;
  
  // Get user ID for metrics
  let userId: string | undefined;
  try {
    const authReq = req as AuthenticatedRequest;
    userId = authReq.user?.id;
  } catch {
    // No user ID available for anonymous requests
  }
  
  // Record successful request metrics (before rate limiting check)
  const rateLimitConfig = config.rateLimiting;
  let limit: number;
  let windowMs: number;
  
  switch (userType) {
    case 'admin':
      limit = rateLimitConfig.adminMaxRequests;
      windowMs = rateLimitConfig.adminWindowMs;
      break;
    case 'authenticated':
      limit = rateLimitConfig.authenticatedMaxRequests;
      windowMs = rateLimitConfig.authenticatedWindowMs;
      break;
    default:
      limit = rateLimitConfig.anonymousMaxRequests;
      windowMs = rateLimitConfig.anonymousWindowMs;
  }
  
  // Record the request attempt for metrics (assuming it will be successful)
  // The actual count will be updated if rate limited
  recordRateLimitEvent(req, userType, limit, 1, windowMs, Date.now() + windowMs, userId);
  
  // Select the appropriate pre-created rate limiter
  let limiter: RateLimitRequestHandler;
  switch (userType) {
    case 'admin':
      limiter = adminLimiter;
      break;
    case 'authenticated':
      limiter = authenticatedLimiter;
      break;
    default:
      limiter = anonymousLimiter;
  }
  
  // Apply the appropriate rate limiter
  limiter(req, res, next);
}

/**
 * Factory function for creating rate limiters with custom configuration
 */
export interface RateLimiterFactoryOptions {
  windowMs?: number;
  maxRequests?: number;
  userType?: UserType;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export function createCustomRateLimiter(options: RateLimiterFactoryOptions = {}): RateLimitRequestHandler {
  const {
    windowMs = config.rateLimiting.authenticatedWindowMs,
    maxRequests = config.rateLimiting.authenticatedMaxRequests,
    userType = 'authenticated',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;
  
  return rateLimit({
    windowMs,
    max: maxRequests,
    keyGenerator: (req: Request) => generateRateLimitKey(req, userType),
    handler: createCustomHandler(userType),
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    skipFailedRequests,
    // Rate limit reached logging is handled in the custom handler
  });
}

/**
 * Middleware to add rate limit information to response headers for all requests
 */
export function addRateLimitHeaders(req: Request, res: Response, next: NextFunction): void {
  const userType = getUserType(req);
  const rateLimitConfig = config.rateLimiting;
  
  let limit: number;
  
  switch (userType) {
    case 'admin':
      limit = rateLimitConfig.adminMaxRequests;
      break;
    case 'authenticated':
      limit = rateLimitConfig.authenticatedMaxRequests;
      break;
    default:
      limit = rateLimitConfig.anonymousMaxRequests;
  }
  
  // Add informational headers about current user's limits
  res.set({
    'X-RateLimit-User-Type': userType,
    'X-RateLimit-Policy': `${limit} requests per ${Math.ceil(rateLimitConfig.anonymousWindowMs / 60000)} minutes`
  });
  
  next();
}

/**
 * Utility function to check if a request would be rate limited without actually applying the limit
 */
export async function checkRateLimit(req: Request): Promise<{
  allowed: boolean;
  userType: UserType;
  limit: number;
  remaining: number;
  resetTime: number;
}> {
  const userType = getUserType(req);
  const rateLimitConfig = config.rateLimiting;
  
  let windowMs: number;
  let max: number;
  
  switch (userType) {
    case 'admin':
      windowMs = rateLimitConfig.adminWindowMs;
      max = rateLimitConfig.adminMaxRequests;
      break;
    case 'authenticated':
      windowMs = rateLimitConfig.authenticatedWindowMs;
      max = rateLimitConfig.authenticatedMaxRequests;
      break;
    default:
      windowMs = rateLimitConfig.anonymousWindowMs;
      max = rateLimitConfig.anonymousMaxRequests;
  }
  
  // This is a simplified check - in a real implementation, you'd check the actual store
  // For now, we'll return optimistic values
  return {
    allowed: true,
    userType,
    limit: max,
    remaining: max - 1,
    resetTime: Date.now() + windowMs
  };
}