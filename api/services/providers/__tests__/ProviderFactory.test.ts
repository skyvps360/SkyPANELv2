/**
 * Provider Factory Tests
 * Tests for the provider factory and service layer
 */

import { describe, it, expect } from 'vitest';
import { ProviderFactory } from '../ProviderFactory.js';
import { LinodeProviderService } from '../LinodeProviderService.js';
import { DigitalOceanProviderService } from '../DigitalOceanProviderService.js';

describe('ProviderFactory', () => {
  describe('createProvider', () => {
    it('should create a Linode provider service', () => {
      const provider = ProviderFactory.createProvider('linode', 'test-token');
      expect(provider).toBeInstanceOf(LinodeProviderService);
      expect(provider.getProviderType()).toBe('linode');
    });

    it('should create a DigitalOcean provider service', () => {
      const provider = ProviderFactory.createProvider('digitalocean', 'test-token');
      expect(provider).toBeInstanceOf(DigitalOceanProviderService);
      expect(provider.getProviderType()).toBe('digitalocean');
    });

    it('should throw error for unsupported provider', () => {
      expect(() => {
        ProviderFactory.createProvider('aws' as any, 'test-token');
      }).toThrow("Provider type 'aws' is not yet implemented");
    });

    it('should throw error for unknown provider', () => {
      expect(() => {
        ProviderFactory.createProvider('unknown' as any, 'test-token');
      }).toThrow('Unknown provider type: unknown');
    });
  });

  describe('getSupportedProviders', () => {
    it('should return list of supported providers', () => {
      const providers = ProviderFactory.getSupportedProviders();
      expect(providers).toContain('linode');
      expect(providers).toContain('digitalocean');
      expect(providers).toHaveLength(2);
    });
  });

  describe('isProviderSupported', () => {
    it('should return true for supported providers', () => {
      expect(ProviderFactory.isProviderSupported('linode')).toBe(true);
      expect(ProviderFactory.isProviderSupported('digitalocean')).toBe(true);
    });

    it('should return false for unsupported providers', () => {
      expect(ProviderFactory.isProviderSupported('aws')).toBe(false);
      expect(ProviderFactory.isProviderSupported('unknown')).toBe(false);
    });
  });
});
