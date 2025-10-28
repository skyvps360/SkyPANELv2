/**
 * Unit tests for DigitalOceanService.get1ClickApps method
 * Tests API integration, response transformation, and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { digitalOceanService } from '../DigitalOceanService.js';

describe('DigitalOceanService.get1ClickApps', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('Successful API Response', () => {
    it('should fetch and transform 1-Click Apps correctly', async () => {
      // Mock the makeRequest method
      const mockResponse = {
        '1_clicks': [
          { slug: 'wordpress-20-04', type: 'droplet' },
          { slug: 'docker-20-04', type: 'droplet' },
          { slug: 'mongodb-7-0', type: 'droplet' },
        ]
      };

      const makeRequestSpy = vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockResolvedValue(mockResponse);

      const result = await digitalOceanService.get1ClickApps('test-token');

      // Verify makeRequest was called with correct parameters
      expect(makeRequestSpy).toHaveBeenCalledWith(
        'https://api.digitalocean.com/v2/1-clicks?type=droplet',
        { method: 'GET' },
        'test-token'
      );

      // Verify transformation to MarketplaceApp format
      expect(result).toHaveLength(3);
      
      // Check first app (WordPress)
      expect(result[0]).toEqual({
        slug: 'wordpress-20-04',
        name: 'Wordpress 20 04',
        description: 'Popular open-source CMS for websites and blogs',
        category: 'CMS',
        image_slug: 'wordpress-20-04',
        compatible_images: [],
        type: 'droplet',
      });

      // Check second app (Docker)
      expect(result[1]).toEqual({
        slug: 'docker-20-04',
        name: 'Docker 20 04',
        description: 'Container platform for building and deploying applications',
        category: 'Containers',
        image_slug: 'docker-20-04',
        compatible_images: [],
        type: 'droplet',
      });

      // Check third app (MongoDB)
      expect(result[2]).toEqual({
        slug: 'mongodb-7-0',
        name: 'Mongodb 7 0',
        description: 'NoSQL document database',
        category: 'Databases',
        image_slug: 'mongodb-7-0',
        compatible_images: [],
        type: 'droplet',
      });
    });

    it('should handle empty 1_clicks array', async () => {
      const mockResponse = {
        '1_clicks': []
      };

      vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockResolvedValue(mockResponse);

      const result = await digitalOceanService.get1ClickApps('test-token');

      expect(result).toEqual([]);
    });

    it('should handle response with missing 1_clicks field', async () => {
      const mockResponse = {};

      vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockResolvedValue(mockResponse);

      const result = await digitalOceanService.get1ClickApps('test-token');

      expect(result).toEqual([]);
    });

    it('should transform multiple apps with different categories', async () => {
      const mockResponse = {
        '1_clicks': [
          { slug: 'mysql-8-0', type: 'droplet' },
          { slug: 'nginx-1-22', type: 'droplet' },
          { slug: 'nodejs-18-04', type: 'droplet' },
          { slug: 'grafana-9', type: 'droplet' },
          { slug: 'unknown-app', type: 'droplet' },
        ]
      };

      vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockResolvedValue(mockResponse);

      const result = await digitalOceanService.get1ClickApps('test-token');

      expect(result).toHaveLength(5);
      expect(result[0].category).toBe('Databases');
      expect(result[1].category).toBe('Web Servers');
      expect(result[2].category).toBe('Development');
      expect(result[3].category).toBe('Monitoring');
      expect(result[4].category).toBe('Other');
    });
  });

  describe('Error Handling - Missing Token', () => {
    it('should throw error when API token is not provided', async () => {
      await expect(digitalOceanService.get1ClickApps('')).rejects.toThrow(
        'DigitalOcean API token not provided'
      );
    });

    it('should throw error when API token is null', async () => {
      await expect(digitalOceanService.get1ClickApps(null as any)).rejects.toThrow(
        'DigitalOcean API token not provided'
      );
    });

    it('should throw error when API token is undefined', async () => {
      await expect(digitalOceanService.get1ClickApps(undefined as any)).rejects.toThrow(
        'DigitalOcean API token not provided'
      );
    });

    it('should not call makeRequest when token is missing', async () => {
      const makeRequestSpy = vi.spyOn(digitalOceanService as any, 'makeRequest');

      try {
        await digitalOceanService.get1ClickApps('');
      } catch {
        // Expected to throw
      }

      expect(makeRequestSpy).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling - API Failures', () => {
    it('should throw error when API returns 401 Unauthorized', async () => {
      const apiError = new Error('DigitalOcean API error: 401 Unauthorized');
      (apiError as any).status = 401;
      (apiError as any).statusText = 'Unauthorized';

      vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockRejectedValue(apiError);

      await expect(digitalOceanService.get1ClickApps('invalid-token')).rejects.toThrow(
        'DigitalOcean API error: 401 Unauthorized'
      );
    });

    it('should throw error when API returns 403 Forbidden', async () => {
      const apiError = new Error('DigitalOcean API error: 403 Forbidden');
      (apiError as any).status = 403;
      (apiError as any).statusText = 'Forbidden';

      vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockRejectedValue(apiError);

      await expect(digitalOceanService.get1ClickApps('test-token')).rejects.toThrow(
        'DigitalOcean API error: 403 Forbidden'
      );
    });

    it('should throw error when API returns 404 Not Found', async () => {
      const apiError = new Error('DigitalOcean API error: 404 Not Found');
      (apiError as any).status = 404;
      (apiError as any).statusText = 'Not Found';

      vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockRejectedValue(apiError);

      await expect(digitalOceanService.get1ClickApps('test-token')).rejects.toThrow(
        'DigitalOcean API error: 404 Not Found'
      );
    });

    it('should throw error when API returns 429 Rate Limit', async () => {
      const apiError = new Error('Rate limit exceeded and max retries reached');
      (apiError as any).status = 429;

      vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockRejectedValue(apiError);

      await expect(digitalOceanService.get1ClickApps('test-token')).rejects.toThrow(
        'Rate limit exceeded and max retries reached'
      );
    });

    it('should throw error when API returns 500 Internal Server Error', async () => {
      const apiError = new Error('DigitalOcean API error: 500 Internal Server Error');
      (apiError as any).status = 500;
      (apiError as any).statusText = 'Internal Server Error';

      vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockRejectedValue(apiError);

      await expect(digitalOceanService.get1ClickApps('test-token')).rejects.toThrow(
        'DigitalOcean API error: 500 Internal Server Error'
      );
    });

    it('should throw error when API returns 503 Service Unavailable', async () => {
      const apiError = new Error('DigitalOcean API error: 503 Service Unavailable');
      (apiError as any).status = 503;
      (apiError as any).statusText = 'Service Unavailable';

      vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockRejectedValue(apiError);

      await expect(digitalOceanService.get1ClickApps('test-token')).rejects.toThrow(
        'DigitalOcean API error: 503 Service Unavailable'
      );
    });

    it('should throw error on network failure', async () => {
      const networkError = new Error('Network request failed');

      vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockRejectedValue(networkError);

      await expect(digitalOceanService.get1ClickApps('test-token')).rejects.toThrow(
        'Network request failed'
      );
    });

    it('should preserve error status and data from API', async () => {
      const apiError = new Error('DigitalOcean API error: 400 Bad Request');
      (apiError as any).status = 400;
      (apiError as any).statusText = 'Bad Request';
      (apiError as any).data = { message: 'Invalid request parameters' };

      vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockRejectedValue(apiError);

      try {
        await digitalOceanService.get1ClickApps('test-token');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.statusText).toBe('Bad Request');
        expect(error.data).toEqual({ message: 'Invalid request parameters' });
      }
    });
  });

  describe('Integration with Helper Methods', () => {
    it('should use formatAppName for each app', async () => {
      const mockResponse = {
        '1_clicks': [
          { slug: 'test-app-1-2', type: 'droplet' }
        ]
      };

      vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockResolvedValue(mockResponse);

      const formatAppNameSpy = vi.spyOn(digitalOceanService as any, 'formatAppName');

      await digitalOceanService.get1ClickApps('test-token');

      expect(formatAppNameSpy).toHaveBeenCalledWith('test-app-1-2');
    });

    it('should use getAppDescription for each app', async () => {
      const mockResponse = {
        '1_clicks': [
          { slug: 'wordpress', type: 'droplet' }
        ]
      };

      vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockResolvedValue(mockResponse);

      const getAppDescriptionSpy = vi.spyOn(digitalOceanService as any, 'getAppDescription');

      await digitalOceanService.get1ClickApps('test-token');

      expect(getAppDescriptionSpy).toHaveBeenCalledWith('wordpress');
    });

    it('should use getAppCategory for each app', async () => {
      const mockResponse = {
        '1_clicks': [
          { slug: 'mysql-8-0', type: 'droplet' }
        ]
      };

      vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockResolvedValue(mockResponse);

      const getAppCategorySpy = vi.spyOn(digitalOceanService as any, 'getAppCategory');

      await digitalOceanService.get1ClickApps('test-token');

      expect(getAppCategorySpy).toHaveBeenCalledWith('mysql-8-0');
    });
  });
});
