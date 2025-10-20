/**
 * Configuration system tests
 */

import { describe, it, expect } from 'vitest';
import { validateRateLimitConfig, RateLimitConfig } from '../index.js';

describe('Configuration System', () => {
  describe('validateRateLimitConfig', () => {
    it('should validate correct rate limiting configuration', () => {
      const validConfig: RateLimitConfig = {
        anonymousWindowMs: 900000, // 15 minutes
        anonymousMaxRequests: 200,
        authenticatedWindowMs: 900000,
        authenticatedMaxRequests: 500,
        adminWindowMs: 900000,
        adminMaxRequests: 1000,
        trustProxy: true
      };

      const result = validateRateLimitConfig(validConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject window times that are too short', () => {
      const invalidConfig: RateLimitConfig = {
        anonymousWindowMs: 30000, // 30 seconds - too short
        anonymousMaxRequests: 200,
        authenticatedWindowMs: 900000,
        authenticatedMaxRequests: 500,
        adminWindowMs: 900000,
        adminMaxRequests: 1000,
        trustProxy: true
      };

      const result = validateRateLimitConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Anonymous window must be between 60000 and 86400000 ms');
    });

    it('should reject window times that are too long', () => {
      const invalidConfig: RateLimitConfig = {
        anonymousWindowMs: 90000000, // 25 hours - too long
        anonymousMaxRequests: 200,
        authenticatedWindowMs: 900000,
        authenticatedMaxRequests: 500,
        adminWindowMs: 900000,
        adminMaxRequests: 1000,
        trustProxy: true
      };

      const result = validateRateLimitConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Anonymous window must be between 60000 and 86400000 ms');
    });

    it('should reject request limits that are too low', () => {
      const invalidConfig: RateLimitConfig = {
        anonymousWindowMs: 900000,
        anonymousMaxRequests: 0, // Too low
        authenticatedWindowMs: 900000,
        authenticatedMaxRequests: 500,
        adminWindowMs: 900000,
        adminMaxRequests: 1000,
        trustProxy: true
      };

      const result = validateRateLimitConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Anonymous max requests must be between 1 and 10000');
    });

    it('should reject request limits that are too high', () => {
      const invalidConfig: RateLimitConfig = {
        anonymousWindowMs: 900000,
        anonymousMaxRequests: 15000, // Too high
        authenticatedWindowMs: 900000,
        authenticatedMaxRequests: 500,
        adminWindowMs: 900000,
        adminMaxRequests: 1000,
        trustProxy: true
      };

      const result = validateRateLimitConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Anonymous max requests must be between 1 and 10000');
    });

    it('should enforce logical hierarchy of limits', () => {
      const invalidConfig: RateLimitConfig = {
        anonymousWindowMs: 900000,
        anonymousMaxRequests: 600, // Higher than authenticated
        authenticatedWindowMs: 900000,
        authenticatedMaxRequests: 500,
        adminWindowMs: 900000,
        adminMaxRequests: 400, // Lower than authenticated
        trustProxy: true
      };

      const result = validateRateLimitConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Authenticated user limits should be higher than or equal to anonymous user limits');
      expect(result.errors).toContain('Admin user limits should be higher than or equal to authenticated user limits');
    });

    it('should allow equal limits across user types', () => {
      const validConfig: RateLimitConfig = {
        anonymousWindowMs: 900000,
        anonymousMaxRequests: 500,
        authenticatedWindowMs: 900000,
        authenticatedMaxRequests: 500, // Equal to anonymous
        adminWindowMs: 900000,
        adminMaxRequests: 500, // Equal to others
        trustProxy: true
      };

      const result = validateRateLimitConfig(validConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle multiple validation errors', () => {
      const invalidConfig: RateLimitConfig = {
        anonymousWindowMs: 30000, // Too short
        anonymousMaxRequests: 0, // Too low
        authenticatedWindowMs: 900000,
        authenticatedMaxRequests: 500,
        adminWindowMs: 900000,
        adminMaxRequests: 1000,
        trustProxy: true
      };

      const result = validateRateLimitConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});