/**
 * Tests for Provider Resource Cache
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProviderResourceCache } from '../../providerResourceCache.js';

describe('ProviderResourceCache', () => {
  const testProviderId = 'test-provider-123';
  const testPlans = [
    { id: 'plan-1', label: 'Basic', vcpus: 1, memory: 1024 },
    { id: 'plan-2', label: 'Standard', vcpus: 2, memory: 2048 },
  ];
  const testImages = [
    { id: 'img-1', label: 'Ubuntu 22.04', distribution: 'Ubuntu' },
    { id: 'img-2', label: 'Debian 11', distribution: 'Debian' },
  ];

  beforeEach(() => {
    // Clear all caches before each test
    ProviderResourceCache.clearAll();
  });

  describe('Plans Caching', () => {
    it('should return null on cache miss', () => {
      const cached = ProviderResourceCache.getCachedPlans(testProviderId);
      expect(cached).toBeNull();
    });

    it('should cache and retrieve plans', () => {
      ProviderResourceCache.setCachedPlans(testProviderId, testPlans);
      const cached = ProviderResourceCache.getCachedPlans(testProviderId);
      expect(cached).toEqual(testPlans);
    });

    it('should isolate caches by provider ID', () => {
      const provider1 = 'provider-1';
      const provider2 = 'provider-2';
      const plans1 = [{ id: 'p1', label: 'Plan 1' }];
      const plans2 = [{ id: 'p2', label: 'Plan 2' }];

      ProviderResourceCache.setCachedPlans(provider1, plans1);
      ProviderResourceCache.setCachedPlans(provider2, plans2);

      expect(ProviderResourceCache.getCachedPlans(provider1)).toEqual(plans1);
      expect(ProviderResourceCache.getCachedPlans(provider2)).toEqual(plans2);
    });
  });

  describe('Images Caching', () => {
    it('should return null on cache miss', () => {
      const cached = ProviderResourceCache.getCachedImages(testProviderId);
      expect(cached).toBeNull();
    });

    it('should cache and retrieve images', () => {
      ProviderResourceCache.setCachedImages(testProviderId, testImages);
      const cached = ProviderResourceCache.getCachedImages(testProviderId);
      expect(cached).toEqual(testImages);
    });
  });

  describe('Marketplace Caching', () => {
    it('should return null on cache miss', () => {
      const cached = ProviderResourceCache.getCachedMarketplace(testProviderId);
      expect(cached).toBeNull();
    });

    it('should cache and retrieve marketplace apps', () => {
      const apps = [{ slug: 'wordpress', name: 'WordPress' }];
      ProviderResourceCache.setCachedMarketplace(testProviderId, apps);
      const cached = ProviderResourceCache.getCachedMarketplace(testProviderId);
      expect(cached).toEqual(apps);
    });
  });

  describe('Regions Caching', () => {
    it('should return null on cache miss', () => {
      const cached = ProviderResourceCache.getCachedRegions(testProviderId);
      expect(cached).toBeNull();
    });

    it('should cache and retrieve regions', () => {
      const regions = [{ id: 'us-east', label: 'US East' }];
      ProviderResourceCache.setCachedRegions(testProviderId, regions);
      const cached = ProviderResourceCache.getCachedRegions(testProviderId);
      expect(cached).toEqual(regions);
    });
  });

  describe('Cache Invalidation', () => {
    beforeEach(() => {
      // Set up caches for testing
      ProviderResourceCache.setCachedPlans(testProviderId, testPlans);
      ProviderResourceCache.setCachedImages(testProviderId, testImages);
      ProviderResourceCache.setCachedMarketplace(testProviderId, []);
      ProviderResourceCache.setCachedRegions(testProviderId, []);
    });

    it('should invalidate all resources for a provider', () => {
      ProviderResourceCache.invalidateProvider(testProviderId);

      expect(ProviderResourceCache.getCachedPlans(testProviderId)).toBeNull();
      expect(ProviderResourceCache.getCachedImages(testProviderId)).toBeNull();
      expect(ProviderResourceCache.getCachedMarketplace(testProviderId)).toBeNull();
      expect(ProviderResourceCache.getCachedRegions(testProviderId)).toBeNull();
    });

    it('should invalidate specific resource type', () => {
      ProviderResourceCache.invalidateResource(testProviderId, 'plans');

      expect(ProviderResourceCache.getCachedPlans(testProviderId)).toBeNull();
      expect(ProviderResourceCache.getCachedImages(testProviderId)).toEqual(testImages);
    });

    it('should clear all caches', () => {
      const provider2 = 'provider-2';
      ProviderResourceCache.setCachedPlans(provider2, testPlans);

      ProviderResourceCache.clearAll();

      expect(ProviderResourceCache.getCachedPlans(testProviderId)).toBeNull();
      expect(ProviderResourceCache.getCachedPlans(provider2)).toBeNull();
    });
  });

  describe('Cache Statistics', () => {
    it('should return empty stats when no caches exist', () => {
      const stats = ProviderResourceCache.getStats();
      expect(stats.plans.size).toBe(0);
      expect(stats.images.size).toBe(0);
      expect(stats.marketplace.size).toBe(0);
      expect(stats.regions.size).toBe(0);
    });

    it('should return accurate cache statistics', () => {
      const provider1 = 'provider-1';
      const provider2 = 'provider-2';

      ProviderResourceCache.setCachedPlans(provider1, testPlans);
      ProviderResourceCache.setCachedPlans(provider2, testPlans);
      ProviderResourceCache.setCachedImages(provider1, testImages);

      const stats = ProviderResourceCache.getStats();
      expect(stats.plans.size).toBe(2);
      expect(stats.plans.providers).toContain(provider1);
      expect(stats.plans.providers).toContain(provider2);
      expect(stats.images.size).toBe(1);
      expect(stats.images.providers).toContain(provider1);
    });
  });

  describe('Cache Configuration', () => {
    it('should allow TTL configuration', () => {
      const newTTL = 5000; // 5 seconds
      ProviderResourceCache.configureTTL('plans', newTTL);
      // Configuration change is logged but we can't easily test TTL expiration
      // without waiting or mocking time
    });

    it('should allow enabling/disabling cache', () => {
      ProviderResourceCache.setCacheEnabled('plans', false);
      ProviderResourceCache.setCachedPlans(testProviderId, testPlans);
      
      // When disabled, cache should not be valid
      const cached = ProviderResourceCache.getCachedPlans(testProviderId);
      expect(cached).toBeNull();

      // Re-enable and verify it works
      ProviderResourceCache.setCacheEnabled('plans', true);
      ProviderResourceCache.setCachedPlans(testProviderId, testPlans);
      const cachedAfterEnable = ProviderResourceCache.getCachedPlans(testProviderId);
      expect(cachedAfterEnable).toEqual(testPlans);
    });
  });
});
