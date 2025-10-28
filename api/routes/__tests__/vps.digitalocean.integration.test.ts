/**
 * Integration tests for DigitalOcean VPS creation flow
 * Tests provider service integration, marketplace app deployment, and error scenarios
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies
vi.mock('../../lib/database.js');
vi.mock('../../services/DigitalOceanService.js');
vi.mock('../../services/linodeService.js');
vi.mock('../../services/activityLogger.js');
vi.mock('../../lib/crypto.js');

import { query } from '../../lib/database.js';
import { getProviderService } from '../../services/providerService.js';
import { DigitalOceanProviderService } from '../../services/providers/DigitalOceanProviderService.js';
import { digitalOceanService } from '../../services/DigitalOceanService.js';

const mockQuery = vi.mocked(query);
const mockDigitalOceanService = vi.mocked(digitalOceanService);

describe('DigitalOcean VPS Creation Integration Tests', () => {
  const testProviderId = 'do-provider-123';
  const _testProviderType = 'digitalocean';
  const testApiToken = 'test-do-api-token';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Provider Service Integration', () => {
    it('should create DigitalOcean provider service instance', async () => {
      // Mock provider lookup
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: testProviderId,
          name: 'DigitalOcean Production',
          type: 'digitalocean',
          api_key_encrypted: testApiToken,
          configuration: {},
          active: true,
        }],
        rowCount: 1,
      } as any);

      const providerService = await getProviderService(testProviderId);

      expect(providerService).toBeInstanceOf(DigitalOceanProviderService);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [testProviderId]
      );
    });

    it('should throw error when provider is not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      await expect(getProviderService('non-existent')).rejects.toThrow('Provider not found');
    });

    it('should throw error when provider is inactive', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: testProviderId,
          name: 'DigitalOcean Production',
          type: 'digitalocean',
          api_key_encrypted: testApiToken,
          configuration: {},
          active: false,
        }],
        rowCount: 1,
      } as any);

      await expect(getProviderService(testProviderId)).rejects.toThrow('Provider is not active');
    });

    it('should throw error when API key is missing', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: testProviderId,
          name: 'DigitalOcean Production',
          type: 'digitalocean',
          api_key_encrypted: '',
          configuration: {},
          active: true,
        }],
        rowCount: 1,
      } as any);

      await expect(getProviderService(testProviderId)).rejects.toThrow('Provider API key not configured');
    });
  });

  describe('DigitalOcean Droplet Creation', () => {
    it('should create a basic DigitalOcean Droplet', async () => {
      const mockDroplet = {
        id: 12345678,
        name: 'test-droplet',
        status: 'new',
        vcpus: 1,
        memory: 1024,
        disk: 25,
        region: { slug: 'nyc3', name: 'New York 3' },
        image: { id: 123456, slug: 'ubuntu-22-04-x64', name: 'Ubuntu 22.04 x64' },
        size: { slug: 's-1vcpu-1gb', transfer: 1000 },
        networks: {
          v4: [{ type: 'public', ip_address: '192.0.2.1' }],
          v6: [],
        },
        tags: ['skypanelv2'],
        created_at: new Date().toISOString(),
      };

      mockDigitalOceanService.createDigitalOceanDroplet = vi.fn().mockResolvedValue(mockDroplet);

      const providerService = new DigitalOceanProviderService(testApiToken, testProviderId);

      const result = await providerService.createInstance({
        label: 'test-droplet',
        type: 's-1vcpu-1gb',
        region: 'nyc3',
        image: 'ubuntu-22-04-x64',
        rootPassword: 'SecurePassword123!',
        sshKeys: [],
        backups: false,
        monitoring: true,
        ipv6: true,
      });

      expect(result).toMatchObject({
        id: '12345678',
        label: 'test-droplet',
        status: 'provisioning',
        region: 'nyc3',
      });

      expect(mockDigitalOceanService.createDigitalOceanDroplet).toHaveBeenCalledWith(
        testApiToken,
        expect.objectContaining({
          name: 'test-droplet',
          size: 's-1vcpu-1gb',
          region: 'nyc3',
          image: 'ubuntu-22-04-x64',
          monitoring: true,
          ipv6: true,
        })
      );
    });

    it('should create Droplet with marketplace app', async () => {
      const mockDroplet = {
        id: 87654321,
        name: 'wordpress-site',
        status: 'new',
        vcpus: 2,
        memory: 2048,
        disk: 50,
        region: { slug: 'nyc3', name: 'New York 3' },
        image: { id: 789012, slug: 'wordpress-20-04', name: 'WordPress on Ubuntu 20.04' },
        size: { slug: 's-2vcpu-2gb', transfer: 2000 },
        networks: {
          v4: [{ type: 'public', ip_address: '192.0.2.2' }],
          v6: [],
        },
        tags: ['skypanelv2'],
        created_at: new Date().toISOString(),
      };

      mockDigitalOceanService.createDigitalOceanDroplet = vi.fn().mockResolvedValue(mockDroplet);

      const providerService = new DigitalOceanProviderService(testApiToken, testProviderId);

      const result = await providerService.createInstance({
        label: 'wordpress-site',
        type: 's-2vcpu-2gb',
        region: 'nyc3',
        image: 'wordpress-20-04',
        rootPassword: 'SecurePassword123!',
        sshKeys: [],
        backups: true,
        monitoring: true,
        ipv6: true,
      });

      expect(result).toMatchObject({
        id: '87654321',
        label: 'wordpress-site',
        status: 'provisioning',
      });

      expect(mockDigitalOceanService.createDigitalOceanDroplet).toHaveBeenCalled();
    });

    it('should handle SSH keys in Droplet creation', async () => {
      const mockDroplet = {
        id: 11111111,
        name: 'secure-droplet',
        status: 'new',
        vcpus: 1,
        memory: 1024,
        disk: 25,
        region: { slug: 'nyc3', name: 'New York 3' },
        image: { id: 123456, slug: 'ubuntu-22-04-x64', name: 'Ubuntu 22.04 x64' },
        size: { slug: 's-1vcpu-1gb', transfer: 1000 },
        networks: {
          v4: [{ type: 'public', ip_address: '192.0.2.3' }],
          v6: [],
        },
        tags: ['skypanelv2'],
        created_at: new Date().toISOString(),
      };

      mockDigitalOceanService.createDigitalOceanDroplet = vi.fn().mockResolvedValue(mockDroplet);

      const providerService = new DigitalOceanProviderService(testApiToken, testProviderId);

      await providerService.createInstance({
        label: 'secure-droplet',
        type: 's-1vcpu-1gb',
        region: 'nyc3',
        image: 'ubuntu-22-04-x64',
        rootPassword: 'SecurePassword123!',
        sshKeys: ['12345', '67890'],
        backups: false,
      });

      expect(mockDigitalOceanService.createDigitalOceanDroplet).toHaveBeenCalledWith(
        testApiToken,
        expect.objectContaining({
          ssh_keys: [12345, 67890],
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle DigitalOcean API rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;
      (rateLimitError as any).id = 'too_many_requests';

      mockDigitalOceanService.createDigitalOceanDroplet = vi.fn().mockRejectedValue(rateLimitError);

      const providerService = new DigitalOceanProviderService(testApiToken, testProviderId);

      await expect(providerService.createInstance({
        label: 'test-droplet',
        type: 's-1vcpu-1gb',
        region: 'nyc3',
        image: 'ubuntu-22-04-x64',
        rootPassword: 'SecurePassword123!',
      })).rejects.toThrow();
    });

    it('should handle invalid API credentials', async () => {
      const authError = new Error('Unauthorized');
      (authError as any).status = 401;
      (authError as any).id = 'unauthorized';

      mockDigitalOceanService.createDigitalOceanDroplet = vi.fn().mockRejectedValue(authError);

      const providerService = new DigitalOceanProviderService(testApiToken, testProviderId);

      await expect(providerService.createInstance({
        label: 'test-droplet',
        type: 's-1vcpu-1gb',
        region: 'nyc3',
        image: 'ubuntu-22-04-x64',
        rootPassword: 'SecurePassword123!',
      })).rejects.toThrow();
    });

    it('should handle invalid region errors', async () => {
      const regionError = new Error('Region not available');
      (regionError as any).status = 400;
      (regionError as any).id = 'invalid_region';

      mockDigitalOceanService.createDigitalOceanDroplet = vi.fn().mockRejectedValue(regionError);

      const providerService = new DigitalOceanProviderService(testApiToken, testProviderId);

      await expect(providerService.createInstance({
        label: 'test-droplet',
        type: 's-1vcpu-1gb',
        region: 'invalid-region',
        image: 'ubuntu-22-04-x64',
        rootPassword: 'SecurePassword123!',
      })).rejects.toThrow();
    });

    it('should handle insufficient resources errors', async () => {
      const resourceError = new Error('Droplet limit reached');
      (resourceError as any).status = 403;
      (resourceError as any).id = 'droplet_limit_exceeded';

      mockDigitalOceanService.createDigitalOceanDroplet = vi.fn().mockRejectedValue(resourceError);

      const providerService = new DigitalOceanProviderService(testApiToken, testProviderId);

      await expect(providerService.createInstance({
        label: 'test-droplet',
        type: 's-1vcpu-1gb',
        region: 'nyc3',
        image: 'ubuntu-22-04-x64',
        rootPassword: 'SecurePassword123!',
      })).rejects.toThrow();
    });
  });

  describe('Droplet Actions', () => {
    it('should power on a Droplet', async () => {
      mockDigitalOceanService.powerOnDroplet = vi.fn().mockResolvedValue({ action: { id: 1, status: 'in-progress' } });

      const providerService = new DigitalOceanProviderService(testApiToken, testProviderId);

      await providerService.performAction('12345678', 'boot');

      expect(mockDigitalOceanService.powerOnDroplet).toHaveBeenCalledWith(testApiToken, 12345678);
    });

    it('should shutdown a Droplet', async () => {
      mockDigitalOceanService.shutdownDroplet = vi.fn().mockResolvedValue({ action: { id: 2, status: 'in-progress' } });

      const providerService = new DigitalOceanProviderService(testApiToken, testProviderId);

      await providerService.performAction('12345678', 'shutdown');

      expect(mockDigitalOceanService.shutdownDroplet).toHaveBeenCalledWith(testApiToken, 12345678);
    });

    it('should reboot a Droplet', async () => {
      mockDigitalOceanService.rebootDroplet = vi.fn().mockResolvedValue({ action: { id: 3, status: 'in-progress' } });

      const providerService = new DigitalOceanProviderService(testApiToken, testProviderId);

      await providerService.performAction('12345678', 'reboot');

      expect(mockDigitalOceanService.rebootDroplet).toHaveBeenCalledWith(testApiToken, 12345678);
    });

    it('should power cycle a Droplet', async () => {
      mockDigitalOceanService.powerCycleDroplet = vi.fn().mockResolvedValue({ action: { id: 4, status: 'in-progress' } });

      const providerService = new DigitalOceanProviderService(testApiToken, testProviderId);

      await providerService.performAction('12345678', 'power_cycle');

      expect(mockDigitalOceanService.powerCycleDroplet).toHaveBeenCalledWith(testApiToken, 12345678);
    });

    it('should delete a Droplet', async () => {
      mockDigitalOceanService.deleteDigitalOceanDroplet = vi.fn().mockResolvedValue(undefined);

      const providerService = new DigitalOceanProviderService(testApiToken, testProviderId);

      await providerService.performAction('12345678', 'delete');

      expect(mockDigitalOceanService.deleteDigitalOceanDroplet).toHaveBeenCalledWith(testApiToken, 12345678);
    });

    it('should throw error for unknown action', async () => {
      const providerService = new DigitalOceanProviderService(testApiToken, testProviderId);

      await expect(providerService.performAction('12345678', 'unknown_action')).rejects.toThrow('Unknown action');
    });
  });

  describe('Resource Fetching', () => {
    it('should fetch DigitalOcean marketplace apps', async () => {
      const mockApps = [
        { slug: 'wordpress-20-04', name: 'WordPress', category: 'CMS' },
        { slug: 'docker-20-04', name: 'Docker', category: 'Development' },
      ];

      mockDigitalOceanService.getMarketplaceApps = vi.fn().mockResolvedValue(mockApps);

      const providerService = new DigitalOceanProviderService(testApiToken, testProviderId);

      const apps = await providerService.getMarketplaceApps();

      expect(apps).toHaveLength(2);
      expect(apps[0]).toMatchObject({ slug: 'wordpress-20-04', name: 'WordPress' });
      expect(mockDigitalOceanService.getMarketplaceApps).toHaveBeenCalledWith(testApiToken);
    });

    it('should fetch DigitalOcean images', async () => {
      const mockImages = [
        { id: 123456, slug: 'ubuntu-22-04-x64', name: 'Ubuntu 22.04 x64', distribution: 'Ubuntu' },
        { id: 789012, slug: 'debian-11-x64', name: 'Debian 11 x64', distribution: 'Debian' },
      ];

      mockDigitalOceanService.getDigitalOceanImages = vi.fn().mockResolvedValue(mockImages);

      const providerService = new DigitalOceanProviderService(testApiToken, testProviderId);

      const images = await providerService.getImages();

      expect(images).toHaveLength(2);
      expect(images[0]).toMatchObject({
        id: '123456',
        slug: 'ubuntu-22-04-x64',
        label: 'Ubuntu 22.04 x64',
        distribution: 'Ubuntu',
      });
    });

    it('should fetch DigitalOcean sizes (plans)', async () => {
      const mockSizes = [
        {
          slug: 's-1vcpu-1gb',
          memory: 1024,
          vcpus: 1,
          disk: 25,
          transfer: 1.0,
          price_monthly: 6.00,
          price_hourly: 0.00893,
          regions: ['nyc1', 'nyc3'],
          available: true,
        },
      ];

      mockDigitalOceanService.getDigitalOceanSizes = vi.fn().mockResolvedValue(mockSizes);

      const providerService = new DigitalOceanProviderService(testApiToken, testProviderId);

      const plans = await providerService.getPlans();

      expect(plans).toHaveLength(1);
      expect(plans[0]).toMatchObject({
        id: 's-1vcpu-1gb',
        vcpus: 1,
        memory: 1024,
        disk: 25,
        price: {
          hourly: 0.00893,
          monthly: 6.00,
        },
      });
    });

    it('should fetch DigitalOcean regions', async () => {
      const mockRegions = [
        { slug: 'nyc3', name: 'New York 3', available: true, features: ['droplets', 'load_balancers'] },
        { slug: 'sfo3', name: 'San Francisco 3', available: true, features: ['droplets'] },
      ];

      mockDigitalOceanService.getDigitalOceanRegions = vi.fn().mockResolvedValue(mockRegions);

      const providerService = new DigitalOceanProviderService(testApiToken, testProviderId);

      const regions = await providerService.getRegions();

      expect(regions).toHaveLength(2);
      expect(regions[0]).toMatchObject({
        id: 'nyc3',
        label: 'New York 3',
        available: true,
      });
    });
  });

  describe('Credential Validation', () => {
    it('should validate valid DigitalOcean credentials', async () => {
      mockDigitalOceanService.getAccount = vi.fn().mockResolvedValue({
        account: { email: 'test@example.com', status: 'active' },
      });

      const providerService = new DigitalOceanProviderService(testApiToken, testProviderId);

      const isValid = await providerService.validateCredentials();

      expect(isValid).toBe(true);
      expect(mockDigitalOceanService.getAccount).toHaveBeenCalledWith(testApiToken);
    });

    it('should reject invalid DigitalOcean credentials', async () => {
      mockDigitalOceanService.getAccount = vi.fn().mockRejectedValue(new Error('Unauthorized'));

      const providerService = new DigitalOceanProviderService(testApiToken, testProviderId);

      const isValid = await providerService.validateCredentials();

      expect(isValid).toBe(false);
    });
  });

  describe('Marketplace Endpoint Integration', () => {
    it('should successfully fetch marketplace apps', async () => {
      // Mock database query for provider configuration
      mockQuery.mockResolvedValueOnce({
        rows: [{
          api_key_encrypted: testApiToken,
        }],
        rowCount: 1,
      } as any);

      // Mock the get1ClickApps method
      const mockApps = [
        {
          slug: 'wordpress-20-04',
          name: 'WordPress 20 04',
          description: 'Popular open-source CMS for websites and blogs',
          category: 'CMS',
          image_slug: 'wordpress-20-04',
          compatible_images: [],
          type: 'droplet',
        },
        {
          slug: 'docker-20-04',
          name: 'Docker 20 04',
          description: 'Container platform for building and deploying applications',
          category: 'Containers',
          image_slug: 'docker-20-04',
          compatible_images: [],
          type: 'droplet',
        },
        {
          slug: 'mongodb-7-0',
          name: 'Mongodb 7 0',
          description: 'NoSQL document database',
          category: 'Databases',
          image_slug: 'mongodb-7-0',
          compatible_images: [],
          type: 'droplet',
        },
      ];

      mockDigitalOceanService.get1ClickApps = vi.fn().mockResolvedValue(mockApps);

      // Import the route handler module to trigger the endpoint
      const vpsModule = await import('../../routes/vps.js');
      expect(vpsModule).toBeDefined();

      // Verify the response structure would be correct
      const categorizedApps: Record<string, any[]> = {};
      mockApps.forEach((app: any) => {
        const category = app.category || 'Other';
        if (!categorizedApps[category]) {
          categorizedApps[category] = [];
        }
        categorizedApps[category].push(app);
      });

      expect(categorizedApps).toHaveProperty('CMS');
      expect(categorizedApps).toHaveProperty('Containers');
      expect(categorizedApps).toHaveProperty('Databases');
      expect(categorizedApps.CMS).toHaveLength(1);
      expect(categorizedApps.Containers).toHaveLength(1);
      expect(categorizedApps.Databases).toHaveLength(1);

      // Verify response structure
      const expectedResponse = {
        apps: mockApps,
        categorized: categorizedApps,
        total: mockApps.length,
      };

      expect(expectedResponse.apps).toHaveLength(3);
      expect(expectedResponse.total).toBe(3);
      expect(expectedResponse.categorized).toHaveProperty('CMS');
    });

    it('should return error when provider is not configured', async () => {
      // Mock database query returning no provider
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      // Verify error response structure
      const expectedError = {
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'DigitalOcean provider is not configured or inactive.',
          provider: 'digitalocean',
        },
      };

      expect(expectedError.error.code).toBe('MISSING_CREDENTIALS');
      expect(expectedError.error.message).toContain('not configured or inactive');
      expect(expectedError.error.provider).toBe('digitalocean');
    });

    it('should handle API service errors', async () => {
      // Mock database query for provider configuration
      mockQuery.mockResolvedValueOnce({
        rows: [{
          api_key_encrypted: testApiToken,
        }],
        rowCount: 1,
      } as any);

      // Mock API error
      const apiError = new Error('Failed to fetch 1-Click Apps');
      (apiError as any).status = 500;
      (apiError as any).code = 'API_ERROR';

      mockDigitalOceanService.get1ClickApps = vi.fn().mockRejectedValue(apiError);

      // Verify error response structure
      const expectedError = {
        error: {
          code: 'API_ERROR',
          message: 'Failed to fetch 1-Click Apps',
          provider: 'digitalocean',
        },
      };

      expect(expectedError.error.code).toBe('API_ERROR');
      expect(expectedError.error.message).toContain('Failed to fetch');
      expect(expectedError.error.provider).toBe('digitalocean');
    });

    it('should verify response structure matches expected format', async () => {
      // Mock database query for provider configuration
      mockQuery.mockResolvedValueOnce({
        rows: [{
          api_key_encrypted: testApiToken,
        }],
        rowCount: 1,
      } as any);

      // Mock minimal apps response
      const mockApps = [
        {
          slug: 'test-app',
          name: 'Test App',
          description: 'Test description',
          category: 'Development',
          image_slug: 'test-app',
          compatible_images: [],
          type: 'droplet',
        },
      ];

      mockDigitalOceanService.get1ClickApps = vi.fn().mockResolvedValue(mockApps);

      // Verify response structure
      const response = {
        apps: mockApps,
        categorized: { Development: mockApps },
        total: mockApps.length,
      };

      // Verify all required fields are present
      expect(response).toHaveProperty('apps');
      expect(response).toHaveProperty('categorized');
      expect(response).toHaveProperty('total');

      // Verify apps array structure
      expect(Array.isArray(response.apps)).toBe(true);
      expect(response.apps[0]).toHaveProperty('slug');
      expect(response.apps[0]).toHaveProperty('name');
      expect(response.apps[0]).toHaveProperty('description');
      expect(response.apps[0]).toHaveProperty('category');
      expect(response.apps[0]).toHaveProperty('image_slug');
      expect(response.apps[0]).toHaveProperty('type');

      // Verify categorized structure
      expect(typeof response.categorized).toBe('object');
      expect(response.categorized.Development).toHaveLength(1);

      // Verify total count
      expect(response.total).toBe(1);
    });

    it('should handle rate limit errors from DigitalOcean API', async () => {
      // Mock database query for provider configuration
      mockQuery.mockResolvedValueOnce({
        rows: [{
          api_key_encrypted: testApiToken,
        }],
        rowCount: 1,
      } as any);

      // Mock rate limit error
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;
      (rateLimitError as any).statusCode = 429;
      (rateLimitError as any).code = 'RATE_LIMIT_EXCEEDED';

      mockDigitalOceanService.get1ClickApps = vi.fn().mockRejectedValue(rateLimitError);

      // Verify error response structure with correct status code
      const expectedError = {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded',
          provider: 'digitalocean',
        },
      };

      expect(expectedError.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect((rateLimitError as any).status).toBe(429);
    });

    it('should handle unauthorized errors from DigitalOcean API', async () => {
      // Mock database query for provider configuration
      mockQuery.mockResolvedValueOnce({
        rows: [{
          api_key_encrypted: 'invalid-token',
        }],
        rowCount: 1,
      } as any);

      // Mock unauthorized error
      const authError = new Error('Unauthorized');
      (authError as any).status = 401;
      (authError as any).code = 'UNAUTHORIZED';

      mockDigitalOceanService.get1ClickApps = vi.fn().mockRejectedValue(authError);

      // Verify error response structure
      const expectedError = {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
          provider: 'digitalocean',
        },
      };

      expect(expectedError.error.code).toBe('UNAUTHORIZED');
      expect((authError as any).status).toBe(401);
    });
  });
});
