/**
 * Unit tests for DigitalOceanService.getDigitalOceanImages pagination logic
 * Tests pagination support, error handling, and URL validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { digitalOceanService } from '../DigitalOceanService.js';

describe('DigitalOceanService.getDigitalOceanImages - Pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Multiple Pages of Images', () => {
    it('should fetch all pages when multiple pages exist', async () => {
      const page1Response = {
        images: [
          { id: 1, name: 'Ubuntu 22.04', distribution: 'Ubuntu', slug: 'ubuntu-22-04-x64' },
          { id: 2, name: 'Debian 12', distribution: 'Debian', slug: 'debian-12-x64' },
        ],
        links: {
          pages: {
            next: 'https://api.digitalocean.com/v2/images?page=2&per_page=200',
            last: 'https://api.digitalocean.com/v2/images?page=3&per_page=200',
          },
        },
        meta: { total: 450 },
      };

      const page2Response = {
        images: [
          { id: 3, name: 'Rocky Linux 9', distribution: 'Rocky Linux', slug: 'rockylinux-9-x64' },
          { id: 4, name: 'Fedora 39', distribution: 'Fedora', slug: 'fedora-39-x64' },
        ],
        links: {
          pages: {
            next: 'https://api.digitalocean.com/v2/images?page=3&per_page=200',
            last: 'https://api.digitalocean.com/v2/images?page=3&per_page=200',
          },
        },
        meta: { total: 450 },
      };

      const page3Response = {
        images: [
          { id: 5, name: 'Alpine 3.18', distribution: 'Alpine', slug: 'alpine-3-18-x64' },
        ],
        links: {
          pages: {},
        },
        meta: { total: 450 },
      };

      const makeRequestSpy = vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockResolvedValueOnce(page1Response)
        .mockResolvedValueOnce(page2Response)
        .mockResolvedValueOnce(page3Response);

      const result = await digitalOceanService.getDigitalOceanImages('test-token');

      expect(makeRequestSpy).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(5);
      expect(result[0].name).toBe('Ubuntu 22.04');
      expect(result[2].name).toBe('Rocky Linux 9');
      expect(result[4].name).toBe('Alpine 3.18');
    });

    it('should stop pagination when no next link is present', async () => {
      const page1Response = {
        images: [
          { id: 1, name: 'Ubuntu 22.04', distribution: 'Ubuntu', slug: 'ubuntu-22-04-x64' },
        ],
        links: {
          pages: {},
        },
      };

      const makeRequestSpy = vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockResolvedValueOnce(page1Response);

      const result = await digitalOceanService.getDigitalOceanImages('test-token');

      expect(makeRequestSpy).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
    });

    it('should handle empty pages in pagination', async () => {
      const page1Response = {
        images: [
          { id: 1, name: 'Ubuntu 22.04', distribution: 'Ubuntu', slug: 'ubuntu-22-04-x64' },
        ],
        links: {
          pages: {
            next: 'https://api.digitalocean.com/v2/images?page=2&per_page=200',
          },
        },
      };

      const page2Response = {
        images: [],
        links: {
          pages: {},
        },
      };

      const makeRequestSpy = vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockResolvedValueOnce(page1Response)
        .mockResolvedValueOnce(page2Response);

      const result = await digitalOceanService.getDigitalOceanImages('test-token');

      expect(makeRequestSpy).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(1);
    });
  });

  describe('per_page=200 Parameter Validation', () => {
    it('should use per_page=200 in initial request', async () => {
      const mockResponse = {
        images: [
          { id: 1, name: 'Ubuntu 22.04', distribution: 'Ubuntu', slug: 'ubuntu-22-04-x64' },
        ],
        links: { pages: {} },
      };

      const makeRequestSpy = vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockResolvedValueOnce(mockResponse);

      await digitalOceanService.getDigitalOceanImages('test-token');

      expect(makeRequestSpy).toHaveBeenCalledWith(
        'https://api.digitalocean.com/v2/images?per_page=200',
        { method: 'GET' },
        'test-token'
      );
    });

    it('should use per_page=200 with type filter', async () => {
      const mockResponse = {
        images: [
          { id: 1, name: 'Ubuntu 22.04', distribution: 'Ubuntu', slug: 'ubuntu-22-04-x64' },
        ],
        links: { pages: {} },
      };

      const makeRequestSpy = vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockResolvedValueOnce(mockResponse);

      await digitalOceanService.getDigitalOceanImages('test-token', 'distribution');

      expect(makeRequestSpy).toHaveBeenCalledWith(
        'https://api.digitalocean.com/v2/images?per_page=200&type=distribution',
        { method: 'GET' },
        'test-token'
      );
    });
  });

  describe('Type Filtering with Pagination', () => {
    it('should apply type=distribution filter across all pages', async () => {
      const page1Response = {
        images: [
          { id: 1, name: 'Ubuntu 22.04', distribution: 'Ubuntu', slug: 'ubuntu-22-04-x64', type: 'base' },
        ],
        links: {
          pages: {
            next: 'https://api.digitalocean.com/v2/images?page=2&per_page=200&type=distribution',
          },
        },
      };

      const page2Response = {
        images: [
          { id: 2, name: 'Debian 12', distribution: 'Debian', slug: 'debian-12-x64', type: 'base' },
        ],
        links: { pages: {} },
      };

      const makeRequestSpy = vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockResolvedValueOnce(page1Response)
        .mockResolvedValueOnce(page2Response);

      const result = await digitalOceanService.getDigitalOceanImages('test-token', 'distribution');

      expect(makeRequestSpy).toHaveBeenCalledTimes(2);
      expect(makeRequestSpy).toHaveBeenNthCalledWith(
        1,
        'https://api.digitalocean.com/v2/images?per_page=200&type=distribution',
        { method: 'GET' },
        'test-token'
      );
      expect(result).toHaveLength(2);
    });

    it('should apply type=application filter across all pages', async () => {
      const page1Response = {
        images: [
          { id: 1, name: 'WordPress', distribution: 'Ubuntu', slug: 'wordpress-20-04', type: 'application' },
        ],
        links: {
          pages: {
            next: 'https://api.digitalocean.com/v2/images?page=2&per_page=200&type=application',
          },
        },
      };

      const page2Response = {
        images: [
          { id: 2, name: 'Docker', distribution: 'Ubuntu', slug: 'docker-20-04', type: 'application' },
        ],
        links: { pages: {} },
      };

      const makeRequestSpy = vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockResolvedValueOnce(page1Response)
        .mockResolvedValueOnce(page2Response);

      const result = await digitalOceanService.getDigitalOceanImages('test-token', 'application');

      expect(makeRequestSpy).toHaveBeenCalledTimes(2);
      expect(makeRequestSpy).toHaveBeenNthCalledWith(
        1,
        'https://api.digitalocean.com/v2/images?per_page=200&type=application',
        { method: 'GET' },
        'test-token'
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('Pagination Error Handling with Partial Results', () => {
    it('should return partial results when pagination fails mid-fetch', async () => {
      const page1Response = {
        images: [
          { id: 1, name: 'Ubuntu 22.04', distribution: 'Ubuntu', slug: 'ubuntu-22-04-x64' },
          { id: 2, name: 'Debian 12', distribution: 'Debian', slug: 'debian-12-x64' },
        ],
        links: {
          pages: {
            next: 'https://api.digitalocean.com/v2/images?page=2&per_page=200',
          },
        },
      };

      const networkError = new Error('Network request failed');

      const makeRequestSpy = vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockResolvedValueOnce(page1Response)
        .mockRejectedValueOnce(networkError);

      const result = await digitalOceanService.getDigitalOceanImages('test-token');

      expect(makeRequestSpy).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Ubuntu 22.04');
      expect(result[1].name).toBe('Debian 12');
    });

    it('should throw error when first page fails', async () => {
      const apiError = new Error('DigitalOcean API error: 401 Unauthorized');
      (apiError as any).status = 401;

      const makeRequestSpy = vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockRejectedValueOnce(apiError);

      await expect(digitalOceanService.getDigitalOceanImages('test-token')).rejects.toThrow(
        'DigitalOcean API error: 401 Unauthorized'
      );

      expect(makeRequestSpy).toHaveBeenCalledTimes(1);
    });

    it('should return partial results on rate limit error during pagination', async () => {
      const page1Response = {
        images: [
          { id: 1, name: 'Ubuntu 22.04', distribution: 'Ubuntu', slug: 'ubuntu-22-04-x64' },
        ],
        links: {
          pages: {
            next: 'https://api.digitalocean.com/v2/images?page=2&per_page=200',
          },
        },
      };

      const rateLimitError = new Error('Rate limit exceeded and max retries reached');
      (rateLimitError as any).status = 429;

      const makeRequestSpy = vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockResolvedValueOnce(page1Response)
        .mockRejectedValueOnce(rateLimitError);

      const result = await digitalOceanService.getDigitalOceanImages('test-token');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Ubuntu 22.04');
    });

    it('should return partial results on server error during pagination', async () => {
      const page1Response = {
        images: [
          { id: 1, name: 'Ubuntu 22.04', distribution: 'Ubuntu', slug: 'ubuntu-22-04-x64' },
          { id: 2, name: 'Debian 12', distribution: 'Debian', slug: 'debian-12-x64' },
        ],
        links: {
          pages: {
            next: 'https://api.digitalocean.com/v2/images?page=2&per_page=200',
          },
        },
      };

      const serverError = new Error('DigitalOcean API error: 500 Internal Server Error');
      (serverError as any).status = 500;

      const makeRequestSpy = vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockResolvedValueOnce(page1Response)
        .mockRejectedValueOnce(serverError);

      const result = await digitalOceanService.getDigitalOceanImages('test-token');

      expect(makeRequestSpy).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });
  });

  describe('Invalid Pagination URL Handling', () => {
    it('should stop pagination on invalid URL format', async () => {
      const page1Response = {
        images: [
          { id: 1, name: 'Ubuntu 22.04', distribution: 'Ubuntu', slug: 'ubuntu-22-04-x64' },
        ],
        links: {
          pages: {
            next: 'not-a-valid-url',
          },
        },
      };

      const makeRequestSpy = vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockResolvedValueOnce(page1Response);

      const result = await digitalOceanService.getDigitalOceanImages('test-token');

      expect(makeRequestSpy).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
    });

    it('should stop pagination on non-DigitalOcean domain', async () => {
      const page1Response = {
        images: [
          { id: 1, name: 'Ubuntu 22.04', distribution: 'Ubuntu', slug: 'ubuntu-22-04-x64' },
        ],
        links: {
          pages: {
            next: 'https://malicious-site.com/v2/images?page=2',
          },
        },
      };

      const makeRequestSpy = vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockResolvedValueOnce(page1Response);

      const result = await digitalOceanService.getDigitalOceanImages('test-token');

      expect(makeRequestSpy).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
    });

    it('should handle missing links object gracefully', async () => {
      const mockResponse = {
        images: [
          { id: 1, name: 'Ubuntu 22.04', distribution: 'Ubuntu', slug: 'ubuntu-22-04-x64' },
        ],
      };

      const makeRequestSpy = vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockResolvedValueOnce(mockResponse);

      const result = await digitalOceanService.getDigitalOceanImages('test-token');

      expect(makeRequestSpy).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
    });

    it('should handle missing pages object gracefully', async () => {
      const mockResponse = {
        images: [
          { id: 1, name: 'Ubuntu 22.04', distribution: 'Ubuntu', slug: 'ubuntu-22-04-x64' },
        ],
        links: {},
      };

      const makeRequestSpy = vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockResolvedValueOnce(mockResponse);

      const result = await digitalOceanService.getDigitalOceanImages('test-token');

      expect(makeRequestSpy).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
    });

    it('should return partial results when invalid URL is encountered', async () => {
      const page1Response = {
        images: [
          { id: 1, name: 'Ubuntu 22.04', distribution: 'Ubuntu', slug: 'ubuntu-22-04-x64' },
          { id: 2, name: 'Debian 12', distribution: 'Debian', slug: 'debian-12-x64' },
        ],
        links: {
          pages: {
            next: 'invalid-url-format',
          },
        },
      };

      const makeRequestSpy = vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockResolvedValueOnce(page1Response);

      const result = await digitalOceanService.getDigitalOceanImages('test-token');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Ubuntu 22.04');
      expect(result[1].name).toBe('Debian 12');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty images array in response', async () => {
      const mockResponse = {
        images: [],
        links: { pages: {} },
      };

      const makeRequestSpy = vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockResolvedValueOnce(mockResponse);

      const result = await digitalOceanService.getDigitalOceanImages('test-token');

      expect(makeRequestSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });

    it('should handle missing images field in response', async () => {
      const mockResponse = {
        links: { pages: {} },
      };

      const makeRequestSpy = vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockResolvedValueOnce(mockResponse);

      const result = await digitalOceanService.getDigitalOceanImages('test-token');

      expect(makeRequestSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });

    it('should throw error when API token is not provided', async () => {
      await expect(digitalOceanService.getDigitalOceanImages('')).rejects.toThrow(
        'DigitalOcean API token not provided'
      );
    });

    it('should accumulate images from many pages', async () => {
      const createPageResponse = (pageNum: number, hasNext: boolean) => ({
        images: [
          { id: pageNum * 10 + 1, name: `Image ${pageNum * 10 + 1}`, distribution: 'Ubuntu', slug: `ubuntu-${pageNum}` },
          { id: pageNum * 10 + 2, name: `Image ${pageNum * 10 + 2}`, distribution: 'Debian', slug: `debian-${pageNum}` },
        ],
        links: {
          pages: hasNext ? {
            next: `https://api.digitalocean.com/v2/images?page=${pageNum + 1}&per_page=200`,
          } : {},
        },
      });

      const makeRequestSpy = vi.spyOn(digitalOceanService as any, 'makeRequest')
        .mockResolvedValueOnce(createPageResponse(1, true))
        .mockResolvedValueOnce(createPageResponse(2, true))
        .mockResolvedValueOnce(createPageResponse(3, true))
        .mockResolvedValueOnce(createPageResponse(4, true))
        .mockResolvedValueOnce(createPageResponse(5, false));

      const result = await digitalOceanService.getDigitalOceanImages('test-token');

      expect(makeRequestSpy).toHaveBeenCalledTimes(5);
      expect(result).toHaveLength(10);
      expect(result[0].id).toBe(11);
      expect(result[9].id).toBe(52);
    });
  });
});
