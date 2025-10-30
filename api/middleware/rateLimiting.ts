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
import { logRateLimitEvent } from '../services/activityLogger.js';
import { recordRateLimitEvent } from '../services/rateLimitMetrics.js';
import {
  getRateLimitOverrideForUser,
  type RateLimitOverride,
} from '../services/rateLimitOverrideService.js';
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
interface TokenPayload {
  userId?: string;
  role?: string;
  [key: string]: unknown;
}

function decodeToken(req: Request): TokenPayload | null {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
      return null;
    }
    return jwt.verify(token, config.JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function getUserType(req: Request): UserType {
  const decoded = decodeToken(req);

  if (!decoded?.userId) {
    return 'anonymous';
  }

  if (decoded.role === 'admin') {
    return 'admin';
  }

  return 'authenticated';
}

function getAuthenticatedUserId(req: Request): string | undefined {
  const decoded = decodeToken(req);
  return decoded?.userId;
}

/**
 * Enhanced key generation using unified IP detection
 */
export function generateRateLimitKey(req: Request, userType: UserType): string {
  const ipResult = getClientIP(req, {
    trustProxy: Boolean(config.rateLimiting.trustProxy),
    enableLogging: false,
  });

  const clientIP = ipResult.ip;

  if (userType !== 'anonymous') {
    const userId = getAuthenticatedUserId(req);
    if (userId) {
      return `${userType}:${userId}:${clientIP}`;
    }
  }

  return `${userType}:${clientIP}`;
}

interface LimitConfig {
  limit: number;
  windowMs: number;
}

function getBaseLimitConfig(userType: UserType): LimitConfig {
  const rateLimitConfig = config.rateLimiting;

  switch (userType) {
    case 'admin':
      return {
        limit: rateLimitConfig.adminMaxRequests,
        windowMs: rateLimitConfig.adminWindowMs,
      };
    case 'authenticated':
      return {
        limit: rateLimitConfig.authenticatedMaxRequests,
        windowMs: rateLimitConfig.authenticatedWindowMs,
      };
    default:
      return {
        limit: rateLimitConfig.anonymousMaxRequests,
        windowMs: rateLimitConfig.anonymousWindowMs,
      };
  }
}

interface OverrideLimiterEntry {
  limiter: RateLimitRequestHandler;
  limit: number;
  windowMs: number;
  reason: string | null;
}

const overrideLimiterCache = new Map<string, OverrideLimiterEntry>();

function buildOverrideLimiter(userType: UserType, override: RateLimitOverride, userId: string): RateLimitRequestHandler {
  const handler = createCustomHandler(userType, {
    limit: override.maxRequests,
    windowMs: override.windowMs,
    reason: override.reason ?? null,
    overrideUserId: userId,
  });

  return rateLimit({
    windowMs: override.windowMs,
    max: override.maxRequests,
    keyGenerator: (req: Request) => generateRateLimitKey(req, userType),
    handler,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  });
}

function getOverrideLimiter(userType: UserType, override: RateLimitOverride, userId: string): RateLimitRequestHandler {
  const cacheKey = `${userType}:${userId}`;
  const cached = overrideLimiterCache.get(cacheKey);

  if (cached && cached.limit === override.maxRequests && cached.windowMs === override.windowMs && cached.reason === (override.reason ?? null)) {
    return cached.limiter;
  }

  const limiter = buildOverrideLimiter(userType, override, userId);
  overrideLimiterCache.set(cacheKey, {
    limiter,
    limit: override.maxRequests,
    windowMs: override.windowMs,
    reason: override.reason ?? null,
  });

  return limiter;
}

/**
 * Custom response handler with detailed headers and error messages
 */
interface HandlerOptions {
  limit?: number;
  windowMs?: number;
  reason?: string | null;
  overrideUserId?: string;
}

export function createCustomHandler(userType: UserType, options: HandlerOptions = {}) {
  return async (req: Request, res: Response): Promise<void> => {
    const ipResult = getClientIP(req, {
      trustProxy: Boolean(config.rateLimiting.trustProxy),
      enableLogging: true,
    });

    const baseConfig = getBaseLimitConfig(userType);
    const limit = options.limit ?? baseConfig.limit;
    const windowMs = options.windowMs ?? baseConfig.windowMs;
    const overrideReason = options.reason ?? null;

    const resetTime = Date.now() + windowMs;
    const retryAfter = Math.ceil(windowMs / 1000);
    const currentCount = limit + 1; // Exceeded, so at least limit + 1
    
    // Create detailed response with enhanced guidance
    const guidanceMessage = userType === 'anonymous' 
      ? 'Consider creating an account for higher rate limits and better service access.'
      : userType === 'authenticated'
      ? 'You have reached your request limit. Please wait before making additional requests.'
      : 'Admin rate limit reached. If this is unexpected, please check for automated processes.';

    const overrideSuffix = overrideReason
      ? ` Override granted: ${overrideReason}.`
      : options.overrideUserId
      ? ' Override granted for this account.'
      : '';
    
    const response: RateLimitResponse = {
      error: 'Rate limit exceeded',
      retryAfter,
      limit,
      remaining: 0,
      resetTime,
      userType,
      message: `Too many requests. ${guidanceMessage}${overrideSuffix}`
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

    if (!userId && options.overrideUserId) {
      userId = options.overrideUserId;
    }
    
    // Record metrics event for monitoring and analysis
    recordRateLimitEvent(req, userType, limit, currentCount, windowMs, resetTime, userId);
    
    // Log rate limit violation for monitoring using enhanced rate limit logging
    try {
      const authReq = req as AuthenticatedRequest;
      await logRateLimitEvent({
        userId: authReq.user?.id ?? options.overrideUserId,
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
}

/**
 * Creates a rate limiter for a specific user type
 */
export function createRateLimiter(userType: UserType): RateLimitRequestHandler {
  const { windowMs, limit } = getBaseLimitConfig(userType);

  return rateLimit({
    windowMs,
    max: limit,
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
export async function smartRateLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userType = getUserType(req);

    (req as any).rateLimitUserType = userType;

    const authReq = req as AuthenticatedRequest;
    const authenticatedUserId = authReq.user?.id ?? getAuthenticatedUserId(req);
    const baseConfig = getBaseLimitConfig(userType);

    let effectiveLimit = baseConfig.limit;
    let effectiveWindowMs = baseConfig.windowMs;
    let limiter: RateLimitRequestHandler;

    let override: RateLimitOverride | null = null;
    if (authenticatedUserId && userType !== 'anonymous') {
      override = await getRateLimitOverrideForUser(authenticatedUserId);
    }

    if (override) {
      effectiveLimit = override.maxRequests;
      effectiveWindowMs = override.windowMs;
      limiter = getOverrideLimiter(userType, override, authenticatedUserId!);
    } else {
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
    }

    recordRateLimitEvent(
      req,
      userType,
      effectiveLimit,
      1,
      effectiveWindowMs,
      Date.now() + effectiveWindowMs,
      authenticatedUserId,
    );

    limiter(req, res, next);
  } catch (error) {
    console.error('Smart rate limiting failed:', error);
    next(error);
  }
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
export async function addRateLimitHeaders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userType = getUserType(req);
    const baseConfig = getBaseLimitConfig(userType);

    let limit = baseConfig.limit;
    let windowMs = baseConfig.windowMs;

    const authReq = req as AuthenticatedRequest;
    const authenticatedUserId = authReq.user?.id ?? getAuthenticatedUserId(req);

    if (authenticatedUserId && userType !== 'anonymous') {
      const override = await getRateLimitOverrideForUser(authenticatedUserId);
      if (override) {
        limit = override.maxRequests;
        windowMs = override.windowMs;
      }
    }

    res.set({
      'X-RateLimit-User-Type': userType,
      'X-RateLimit-Policy': `${limit} requests per ${Math.ceil(windowMs / 60000)} minutes`,
    });
  } catch (error) {
    console.error('Failed to attach rate limit headers:', error);
  } finally {
    next();
  }
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
  const baseConfig = getBaseLimitConfig(userType);

  let windowMs = baseConfig.windowMs;
  let max = baseConfig.limit;

  const authReq = req as AuthenticatedRequest;
  const authenticatedUserId = authReq.user?.id ?? getAuthenticatedUserId(req);

  if (authenticatedUserId && userType !== 'anonymous') {
    const override = await getRateLimitOverrideForUser(authenticatedUserId);
    if (override) {
      windowMs = override.windowMs;
      max = override.maxRequests;
    }
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