/**
 * Error Normalizer Tests
 * Tests for error normalization utilities
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeLinodeError,
  normalizeDigitalOceanError,
  getUserFriendlyMessage,
} from '../errorNormalizer.js';

describe('errorNormalizer', () => {
  describe('normalizeLinodeError', () => {
    it('should normalize Linode validation error', () => {
      const error = {
        errors: [
          { field: 'region', reason: 'Region is not available' }
        ]
      };

      const normalized = normalizeLinodeError(error);
      expect(normalized.code).toBe('VALIDATION_ERROR');
      expect(normalized.message).toBe('Region is not available');
      expect(normalized.field).toBe('region');
      expect(normalized.provider).toBe('linode');
    });

    it('should normalize HTTP error', () => {
      const error = { status: 404, statusText: 'Not Found' };
      const normalized = normalizeLinodeError(error);
      expect(normalized.code).toBe('HTTP_404');
      expect(normalized.message).toBe('Not Found');
    });

    it('should normalize generic Error', () => {
      const error = new Error('Something went wrong');
      const normalized = normalizeLinodeError(error);
      expect(normalized.code).toBe('API_ERROR');
      expect(normalized.message).toBe('Something went wrong');
    });
  });

  describe('normalizeDigitalOceanError', () => {
    it('should normalize DigitalOcean error', () => {
      const error = {
        id: 'not_found',
        message: 'The resource you requested could not be found.'
      };

      const normalized = normalizeDigitalOceanError(error);
      expect(normalized.code).toBe('NOT_FOUND');
      expect(normalized.message).toBe('The resource you requested could not be found.');
      expect(normalized.provider).toBe('digitalocean');
    });

    it('should normalize HTTP error', () => {
      const error = { status: 401, statusText: 'Unauthorized' };
      const normalized = normalizeDigitalOceanError(error);
      expect(normalized.code).toBe('HTTP_401');
      expect(normalized.message).toBe('Authentication failed - invalid API token');
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return friendly message for known error codes', () => {
      const error = {
        code: 'MISSING_CREDENTIALS',
        message: 'API token not configured',
        provider: 'linode' as const
      };

      const message = getUserFriendlyMessage(error);
      expect(message).toBe('API credentials are not configured. Please contact your administrator.');
    });

    it('should return original message for unknown error codes', () => {
      const error = {
        code: 'CUSTOM_ERROR',
        message: 'Custom error message',
        provider: 'linode' as const
      };

      const message = getUserFriendlyMessage(error);
      expect(message).toBe('Custom error message');
    });

    it('should handle validation errors', () => {
      const error = {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input provided',
        provider: 'digitalocean' as const
      };

      const message = getUserFriendlyMessage(error);
      expect(message).toBe('Invalid input provided');
    });
  });
});
