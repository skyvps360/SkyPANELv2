/**
 * DigitalOcean API Service for SkyPanelV2
 * Handles integration with DigitalOcean API for VPS management
 * Parallel to linodeService.ts - does NOT replace it
 */

// DigitalOcean Droplet Size (equivalent to Linode Type)
export interface DigitalOceanSize {
  slug: string;
  memory: number;
  vcpus: number;
  disk: number;
  transfer: number;
  price_monthly: number;
  price_hourly: number;
  backup_price_monthly_weekly?: number;  // 20% of base price
  backup_price_monthly_daily?: number;   // 30% of base price
  backup_price_hourly_weekly?: number;
  backup_price_hourly_daily?: number;
  regions: string[];
  available: boolean;
  description: string;
}

// DigitalOcean Region
export interface DigitalOceanRegion {
  slug: string;
  name: string;
  sizes: string[];
  features: string[];
  available: boolean;
}

// DigitalOcean Droplet (equivalent to Linode Instance)
export interface DigitalOceanDroplet {
  id: number;
  name: string;
  memory: number;
  vcpus: number;
  disk: number;
  locked: boolean;
  status: string;
  kernel: {
    id: number;
    name: string;
    version: string;
  } | null;
  created_at: string;
  features: string[];
  backup_ids: number[];
  snapshot_ids: number[];
  image: {
    id: number;
    name: string;
    distribution: string;
    slug: string | null;
    public: boolean;
  };
  size: {
    slug: string;
    memory: number;
    vcpus: number;
    disk: number;
    transfer: number;
    price_monthly: number;
    price_hourly: number;
  };
  size_slug: string;
  networks: {
    v4: Array<{
      ip_address: string;
      netmask: string;
      gateway: string;
      type: string;
    }>;
    v6: Array<{
      ip_address: string;
      netmask: number;
      gateway: string;
      type: string;
    }>;
  };
  region: {
    slug: string;
    name: string;
    features: string[];
    available: boolean;
  };
  tags: string[];
  vpc_uuid: string | null;
}

// DigitalOcean Image
export interface DigitalOceanImage {
  id: number;
  name: string;
  distribution: string;
  slug: string | null;
  public: boolean;
  regions: string[];
  created_at: string;
  min_disk_size: number;
  type: string;
  size_gigabytes: number;
  description: string;
  tags: string[];
  status: string;
}

// Pagination Links Structure
export interface DigitalOceanPaginationLinks {
  first?: string;
  prev?: string;
  next?: string;
  last?: string;
}

// Pagination Meta Structure
export interface DigitalOceanPaginationMeta {
  total?: number;
}

// Generic Paginated Response Structure
export interface DigitalOceanPaginatedResponse<T> {
  links?: {
    pages?: DigitalOceanPaginationLinks;
  };
  meta?: DigitalOceanPaginationMeta;
  [key: string]: T | any;
}

// Create Droplet Request
export interface CreateDigitalOceanDropletRequest {
  name: string;
  region: string;
  size: string;
  image: string | number;
  ssh_keys?: (string | number)[];
  backups?: boolean;
  ipv6?: boolean;
  monitoring?: boolean;
  tags?: string[];
  user_data?: string;
  private_networking?: boolean;
  vpc_uuid?: string;
}

// Droplet Action Response
export interface DigitalOceanAction {
  id: number;
  status: string;
  type: string;
  started_at: string;
  completed_at: string | null;
  resource_id: number;
  resource_type: string;
  region: {
    slug: string;
    name: string;
  } | null;
}

// SSH Key
export interface DigitalOceanSSHKey {
  id: number;
  fingerprint: string;
  public_key: string;
  name: string;
}

// Marketplace App (1-Click Application)
export interface DigitalOceanMarketplaceApp {
  slug: string;
  name: string;
  description: string;
  category: string;
  categories?: string[];
  image_slug: string;
  compatible_images?: string[];
  type: string;
  badge?: string;
  vendor?: string;
  links?: Record<string, any>;
}

type RawDigitalOcean1ClickApp = {
  slug?: string;
  type?: string;
  name?: string;
  description?: string;
  summary?: string;
  group_description?: string;
  short_description?: string;
  categories?: unknown;
  category?: string;
  badge?: string;
  vendor?: string;
  vendor_name?: string;
  image_slug?: string;
  icon_slug?: string;
  icon?: string;
  compatible_images?: unknown;
  compatible_distro_slugs?: unknown;
  links?: Record<string, any>;
  [key: string]: unknown;
};

class DigitalOceanService {
  private readonly baseUrl = 'https://api.digitalocean.com/v2';
  
  // Rate limiting configuration
  private readonly maxRequestsPerMinute = 250;
  private readonly maxRequestsPerHour = 5000;
  private requestTimestamps: number[] = [];
  
  // Retry configuration
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second base delay

  constructor() {
    // API token comes from database via admin UI, not environment
  }

  /**
   * Test API connection with provided credentials
   */
  async testConnection(apiToken: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!apiToken) {
        return { success: false, message: 'API token not provided' };
      }

      // Test the connection by fetching account info
      const response = await fetch(`${this.baseUrl}/account`, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const _errorText = await response.text().catch(() => '');
        return {
          success: false,
          message: `API authentication failed: ${response.status} ${response.statusText}`
        };
      }

      const data = await response.json();
      return {
        success: true,
        message: `Connected successfully to account: ${data.account?.email || 'Unknown'}`
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Connection test failed'
      };
    }
  }

  /**
   * Get API token from database for a specific provider
   * This should be called by routes that have access to the provider ID
   */
  private async getApiToken(providerId?: string): Promise<string> {
    if (!providerId) {
      throw new Error('Provider ID required to fetch DigitalOcean API token');
    }
    
    // This will be implemented by the route handlers
    // For now, throw an error - routes must pass the token directly
    throw new Error('API token must be provided by route handler');
  }

  private getHeaders(apiToken: string): HeadersInit {
    return {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Check if we're within rate limits
   */
  private checkRateLimit(): void {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;

    // Clean up old timestamps
    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > oneHourAgo);

    // Check minute limit
    const recentRequests = this.requestTimestamps.filter(ts => ts > oneMinuteAgo);
    if (recentRequests.length >= this.maxRequestsPerMinute) {
      throw new Error('Rate limit exceeded: too many requests per minute');
    }

    // Check hour limit
    if (this.requestTimestamps.length >= this.maxRequestsPerHour) {
      throw new Error('Rate limit exceeded: too many requests per hour');
    }

    // Record this request
    this.requestTimestamps.push(now);
  }

  /**
   * Sleep utility for retry logic
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Make an API request with retry logic
   */
  private async makeRequest<T>(
    url: string,
    options: RequestInit,
    apiToken: string,
    retryCount = 0
  ): Promise<T> {
    try {
      // Check rate limits before making request
      this.checkRateLimit();

      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(apiToken),
          ...options.headers,
        },
      });

      // Handle rate limiting from API
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : this.retryDelay * Math.pow(2, retryCount);
        
        if (retryCount < this.maxRetries) {
          console.log(`Rate limited by DigitalOcean API, retrying after ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
          await this.sleep(delay);
          return this.makeRequest<T>(url, options, apiToken, retryCount + 1);
        }
        
        throw new Error('Rate limit exceeded and max retries reached');
      }

      // Handle server errors with retry
      if (response.status >= 500 && retryCount < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, retryCount);
        console.log(`Server error ${response.status}, retrying after ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
        await this.sleep(delay);
        return this.makeRequest<T>(url, options, apiToken, retryCount + 1);
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        
        const error: any = new Error(`DigitalOcean API error: ${response.status} ${response.statusText}`);
        error.status = response.status;
        error.statusText = response.statusText;
        error.data = errorData;
        throw error;
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      // Don't retry on client errors (4xx except 429)
      if (error instanceof Error && 'status' in error) {
        const status = (error as any).status;
        if (status >= 400 && status < 500 && status !== 429) {
          throw error;
        }
      }

      // Retry on network errors
      if (retryCount < this.maxRetries && !(error instanceof Error && error.message.includes('Rate limit'))) {
        const delay = this.retryDelay * Math.pow(2, retryCount);
        console.log(`Network error, retrying after ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
        await this.sleep(delay);
        return this.makeRequest<T>(url, options, apiToken, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Get all available sizes (instance types)
   */
  async getDigitalOceanSizes(apiToken: string): Promise<DigitalOceanSize[]> {
    try {
      if (!apiToken) throw new Error('DigitalOcean API token not provided');

      const data = await this.makeRequest<DigitalOceanPaginatedResponse<DigitalOceanSize[]> & { sizes: DigitalOceanSize[] }>(
        `${this.baseUrl}/sizes?per_page=200`,
        { method: 'GET' },
        apiToken
      );

      const sizes = data.sizes || [];
      
      // Calculate backup pricing for each size
      // DigitalOcean charges 20% for weekly backups and 30% for daily backups
      return sizes.map(size => ({
        ...size,
        backup_price_monthly_weekly: size.price_monthly * 0.20,
        backup_price_monthly_daily: size.price_monthly * 0.30,
        backup_price_hourly_weekly: size.price_hourly * 0.20,
        backup_price_hourly_daily: size.price_hourly * 0.30,
      }));
    } catch (error) {
      console.error('Error fetching DigitalOcean sizes:', error);
      throw error;
    }
  }

  /**
   * Get all available regions
   */
  async getDigitalOceanRegions(apiToken: string): Promise<DigitalOceanRegion[]> {
    try {
      if (!apiToken) throw new Error('DigitalOcean API token not provided');

      const data = await this.makeRequest<DigitalOceanPaginatedResponse<DigitalOceanRegion[]> & { regions: DigitalOceanRegion[] }>(
        `${this.baseUrl}/regions?per_page=200`,
        { method: 'GET' },
        apiToken
      );

      return data.regions || [];
    } catch (error) {
      console.error('Error fetching DigitalOcean regions:', error);
      throw error;
    }
  }

  /**
   * Get all available images with pagination support
   */
  async getDigitalOceanImages(apiToken: string, type?: 'distribution' | 'application'): Promise<DigitalOceanImage[]> {
    const startTime = Date.now();
    
    try {
      if (!apiToken) throw new Error('DigitalOcean API token not provided');

      console.log(`Starting DigitalOcean images fetch${type ? ` (type: ${type})` : ''}`);

      const allImages: DigitalOceanImage[] = [];
      let url = `${this.baseUrl}/images?per_page=200`;
      if (type) {
        url += `&type=${type}`;
      }

      let pageCount = 0;
      let hasPartialResults = false;

      while (url) {
        pageCount++;
        const pageStartTime = Date.now();
        
        try {
          const data = await this.makeRequest<DigitalOceanPaginatedResponse<DigitalOceanImage[]> & { images: DigitalOceanImage[] }>(
            url,
            { method: 'GET' },
            apiToken
          );

          const pageTime = Date.now() - pageStartTime;
          const imagesInPage = data.images?.length || 0;

          console.log(`Fetched page ${pageCount}: ${imagesInPage} images in ${pageTime}ms`);

          if (data.images && data.images.length > 0) {
            allImages.push(...data.images);
          }

          // Check for next page and validate URL
          if (data.links?.pages?.next) {
            try {
              // Validate pagination URL before following it
              const nextUrl = new URL(data.links.pages.next);
              
              // Additional validation: ensure it's a DigitalOcean API URL
              if (!nextUrl.hostname.includes('digitalocean.com')) {
                console.warn(`Invalid pagination URL domain: ${nextUrl.hostname}, stopping pagination`);
                hasPartialResults = allImages.length > 0;
                break;
              }
              
              url = data.links.pages.next;
            } catch (urlError) {
              console.warn('Invalid pagination URL format, stopping pagination', {
                url: data.links.pages.next,
                error: urlError instanceof Error ? urlError.message : String(urlError)
              });
              hasPartialResults = allImages.length > 0;
              break;
            }
          } else {
            url = '';
          }
        } catch (pageError) {
          // Handle pagination failure gracefully
          const errorMessage = pageError instanceof Error ? pageError.message : String(pageError);
          const errorStatus = (pageError as any)?.status;
          
          console.error(`Failed to fetch page ${pageCount} of DigitalOcean images`, {
            page: pageCount,
            error: errorMessage,
            status: errorStatus,
            imagesCollectedSoFar: allImages.length
          });

          // If we have partial results, return them with a warning
          if (allImages.length > 0) {
            console.warn(`WARNING: Returning partial results - ${allImages.length} images from ${pageCount - 1} successfully fetched page(s). Pagination failed at page ${pageCount}.`);
            hasPartialResults = true;
            break;
          }

          // If no results yet, re-throw the error
          throw pageError;
        }
      }

      const totalTime = Date.now() - startTime;
      const avgTimePerPage = pageCount > 0 ? Math.round(totalTime / pageCount) : 0;

      if (hasPartialResults) {
        console.warn(`DigitalOcean images fetch completed with PARTIAL RESULTS:`, {
          totalImages: allImages.length,
          pagesRetrieved: pageCount - 1,
          totalTime: `${totalTime}ms`,
          avgTimePerPage: `${avgTimePerPage}ms`,
          type: type || 'all',
          status: 'partial'
        });
      } else {
        console.log(`DigitalOcean images fetch completed successfully:`, {
          totalImages: allImages.length,
          pagesRetrieved: pageCount,
          totalTime: `${totalTime}ms`,
          avgTimePerPage: `${avgTimePerPage}ms`,
          type: type || 'all',
          status: 'complete'
        });
      }
      
      return allImages;
    } catch (error) {
      const totalTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStatus = (error as any)?.status;
      
      console.error('Error fetching DigitalOcean images', {
        error: errorMessage,
        httpStatus: errorStatus,
        type: type || 'all',
        totalTime: `${totalTime}ms`,
        status: 'failed'
      });
      
      throw error;
    }
  }

  /**
   * Create a new Droplet (VPS instance)
   */
  async createDigitalOceanDroplet(apiToken: string, request: CreateDigitalOceanDropletRequest): Promise<DigitalOceanDroplet> {
    try {
      if (!apiToken) throw new Error('DigitalOcean API token not provided');

      const data = await this.makeRequest<{ droplet: DigitalOceanDroplet }>(
        `${this.baseUrl}/droplets`,
        {
          method: 'POST',
          body: JSON.stringify(request),
        },
        apiToken
      );

      return data.droplet;
    } catch (error) {
      console.error('Error creating DigitalOcean droplet:', error);
      throw error;
    }
  }

  /**
   * Get a specific Droplet by ID
   */
  async getDigitalOceanDroplet(apiToken: string, dropletId: number): Promise<DigitalOceanDroplet> {
    try {
      if (!apiToken) throw new Error('DigitalOcean API token not provided');

      const data = await this.makeRequest<{ droplet: DigitalOceanDroplet }>(
        `${this.baseUrl}/droplets/${dropletId}`,
        { method: 'GET' },
        apiToken
      );

      return data.droplet;
    } catch (error) {
      console.error('Error fetching DigitalOcean droplet:', error);
      throw error;
    }
  }

  /**
   * List all Droplets
   */
  async listDigitalOceanDroplets(apiToken: string): Promise<DigitalOceanDroplet[]> {
    try {
      if (!apiToken) throw new Error('DigitalOcean API token not provided');

      const data = await this.makeRequest<DigitalOceanPaginatedResponse<DigitalOceanDroplet[]> & { droplets: DigitalOceanDroplet[] }>(
        `${this.baseUrl}/droplets?per_page=200`,
        { method: 'GET' },
        apiToken
      );

      return data.droplets || [];
    } catch (error) {
      console.error('Error listing DigitalOcean droplets:', error);
      throw error;
    }
  }

  private normalizeMetricsResponse(response: any): Array<{ timestamp: number; value: number }> {
    const points: Array<{ timestamp: number; value: number }> = [];

    const pushPoint = (rawTimestamp: any, rawValue: any) => {
      const numericValue = typeof rawValue === 'number' ? rawValue : Number(rawValue);
      if (!Number.isFinite(numericValue)) {
        return;
      }

      const convertTimestamp = (value: any): number | null => {
        if (typeof value === 'number' && Number.isFinite(value)) {
          return value > 1e12 ? Math.round(value / 1000) : value;
        }
        if (typeof value === 'string') {
          const numericTimestamp = Number(value);
          if (Number.isFinite(numericTimestamp)) {
            return numericTimestamp > 1e12
              ? Math.round(numericTimestamp / 1000)
              : numericTimestamp;
          }
          const parsed = Date.parse(value);
          if (!Number.isNaN(parsed)) {
            return Math.round(parsed / 1000);
          }
        }
        if (value && typeof value === 'object') {
          if ('time' in value) {
            return convertTimestamp((value as any).time);
          }
          if ('timestamp' in value) {
            return convertTimestamp((value as any).timestamp);
          }
        }
        return null;
      };

      const timestamp = convertTimestamp(rawTimestamp);
      if (timestamp !== null && Number.isFinite(timestamp)) {
        points.push({ timestamp, value: numericValue });
      }
    };

    const processEntry = (entry: any) => {
      if (Array.isArray(entry)) {
        if (entry.length >= 2) {
          pushPoint(entry[0], entry[1]);
        }
        return;
      }
      if (entry && typeof entry === 'object') {
        const timestamp = entry.time ?? entry.timestamp ?? entry[0] ?? entry?.values?.[0]?.[0];
        const value = entry.value ?? entry[1] ?? entry?.values?.[0]?.[1];
        if (timestamp !== undefined && value !== undefined) {
          pushPoint(timestamp, value);
        }
      }
    };

    const processCollection = (collection: any) => {
      if (Array.isArray(collection)) {
        collection.forEach(processEntry);
      }
    };

    if (!response) {
      return points;
    }

    if (Array.isArray(response.data)) {
      processCollection(response.data);
    }

    if (response.data && Array.isArray(response.data.result)) {
      response.data.result.forEach((result: any) => {
        if (Array.isArray(result.values)) {
          processCollection(result.values);
        }
      });
    }

    if (Array.isArray(response.result)) {
      response.result.forEach((result: any) => {
        if (Array.isArray(result.values)) {
          processCollection(result.values);
        } else {
          processEntry(result);
        }
      });
    }

    if (Array.isArray(response.values)) {
      processCollection(response.values);
    }

    if (response.metrics && Array.isArray(response.metrics)) {
      response.metrics.forEach((metric: any) => {
        if (Array.isArray(metric.data)) {
          processCollection(metric.data);
        }
        if (Array.isArray(metric.values)) {
          processCollection(metric.values);
        }
      });
    }

    return points.sort((a, b) => a.timestamp - b.timestamp);
  }

  async getDropletMetricSeries(
    apiToken: string,
    dropletId: number,
    metric: string,
    options?: { start?: Date; end?: Date; granularity?: string }
  ): Promise<Array<{ timestamp: number; value: number }>> {
    if (!apiToken) {
      throw new Error('DigitalOcean API token not provided');
    }
    if (!Number.isFinite(dropletId)) {
      throw new Error('Droplet ID must be a finite number');
    }

    const end = options?.end ?? new Date();
    const start = options?.start ?? new Date(end.getTime() - 6 * 60 * 60 * 1000);
    const granularity = options?.granularity ?? '5m';

    const params = new URLSearchParams({
      host_id: String(dropletId),
      start: start.toISOString(),
      end: end.toISOString(),
      granularity,
    });

    const url = `${this.baseUrl}/monitoring/metrics/droplet/${metric}?${params.toString()}`;

    const response = await this.makeRequest<any>(url, { method: 'GET' }, apiToken);
    return this.normalizeMetricsResponse(response);
  }

  /**
   * Delete a Droplet by ID
   */
  async deleteDigitalOceanDroplet(apiToken: string, dropletId: number): Promise<void> {
    try {
      if (!apiToken) throw new Error('DigitalOcean API token not provided');

      await this.makeRequest<void>(
        `${this.baseUrl}/droplets/${dropletId}`,
        { method: 'DELETE' },
        apiToken
      );
    } catch (error) {
      console.error('Error deleting DigitalOcean droplet:', error);
      throw error;
    }
  }

  /**
   * Perform an action on a Droplet (power on, power off, reboot, etc.)
   */
  async performDropletAction(apiToken: string, dropletId: number, actionType: string, params?: Record<string, any>): Promise<DigitalOceanAction> {
    try {
      if (!apiToken) throw new Error('DigitalOcean API token not provided');

      const body = { type: actionType, ...params };

      const data = await this.makeRequest<{ action: DigitalOceanAction }>(
        `${this.baseUrl}/droplets/${dropletId}/actions`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
        apiToken
      );

      return data.action;
    } catch (error) {
      console.error('Error performing DigitalOcean droplet action:', error);
      throw error;
    }
  }

  /**
   * Reboot a Droplet
   */
  async rebootDroplet(apiToken: string, dropletId: number): Promise<DigitalOceanAction> {
    return this.performDropletAction(apiToken, dropletId, 'reboot');
  }

  /**
   * Power cycle a Droplet (hard reboot)
   */
  async powerCycleDroplet(apiToken: string, dropletId: number): Promise<DigitalOceanAction> {
    return this.performDropletAction(apiToken, dropletId, 'power_cycle');
  }

  /**
   * Power off a Droplet
   */
  async powerOffDroplet(apiToken: string, dropletId: number): Promise<DigitalOceanAction> {
    return this.performDropletAction(apiToken, dropletId, 'power_off');
  }

  /**
   * Power on a Droplet
   */
  async powerOnDroplet(apiToken: string, dropletId: number): Promise<DigitalOceanAction> {
    return this.performDropletAction(apiToken, dropletId, 'power_on');
  }

  /**
   * Shutdown a Droplet (graceful)
   */
  async shutdownDroplet(apiToken: string, dropletId: number): Promise<DigitalOceanAction> {
    return this.performDropletAction(apiToken, dropletId, 'shutdown');
  }

  /**
   * Get SSH keys associated with account
   */
  async getSSHKeys(apiToken: string): Promise<DigitalOceanSSHKey[]> {
    try {
      if (!apiToken) throw new Error('DigitalOcean API token not provided');

      const data = await this.makeRequest<{ ssh_keys: DigitalOceanSSHKey[] }>(
        `${this.baseUrl}/account/keys`,
        { method: 'GET' },
        apiToken
      );

      return data.ssh_keys || [];
    } catch (error) {
      console.error('Error fetching DigitalOcean SSH keys:', error);
      throw error;
    }
  }

  /**
   * Create a new SSH key
   */
  async createSSHKey(apiToken: string, name: string, publicKey: string): Promise<DigitalOceanSSHKey> {
    try {
      if (!apiToken) throw new Error('DigitalOcean API token not provided');

      const data = await this.makeRequest<{ ssh_key: DigitalOceanSSHKey }>(
        `${this.baseUrl}/account/keys`,
        {
          method: 'POST',
          body: JSON.stringify({
            name,
            public_key: publicKey,
          }),
        },
        apiToken
      );

      return data.ssh_key;
    } catch (error) {
      console.error('Error creating DigitalOcean SSH key:', error);
      throw error;
    }
  }

  /**
   * Delete an SSH key
   */
  async deleteSSHKey(apiToken: string, keyId: number): Promise<void> {
    try {
      if (!apiToken) throw new Error('DigitalOcean API token not provided');

      await this.makeRequest<void>(
        `${this.baseUrl}/account/keys/${keyId}`,
        { method: 'DELETE' },
        apiToken
      );
    } catch (error) {
      console.error('Error deleting DigitalOcean SSH key:', error);
      throw error;
    }
  }

  /**
   * Get VPCs (Virtual Private Clouds)
   */
  async getVPCs(apiToken: string): Promise<any[]> {
    try {
      if (!apiToken) throw new Error('DigitalOcean API token not provided');

      const data = await this.makeRequest<{ vpcs: any[] }>(
        `${this.baseUrl}/vpcs`,
        { method: 'GET' },
        apiToken
      );

      return data.vpcs || [];
    } catch (error) {
      console.error('Error fetching DigitalOcean VPCs:', error);
      throw error;
    }
  }

  /**
   * Get account information
   */
  async getAccount(apiToken: string): Promise<any> {
    try {
      if (!apiToken) throw new Error('DigitalOcean API token not provided');

      const data = await this.makeRequest<{ account: any }>(
        `${this.baseUrl}/account`,
        { method: 'GET' },
        apiToken
      );

      return data.account;
    } catch (error) {
      console.error('Error fetching DigitalOcean account:', error);
      throw error;
    }
  }

  /**
   * Get 1-Click Apps from DigitalOcean Marketplace
   * Uses the official /v2/1-clicks endpoint for complete catalog
   */
  async get1ClickApps(apiToken: string): Promise<DigitalOceanMarketplaceApp[]> {
    try {
      if (!apiToken) {
        const error = new Error('DigitalOcean API token not provided');
        console.error('Error fetching DigitalOcean 1-Click Apps: Missing API token');
        throw error;
      }

      const data = await this.makeRequest<{
        '1_clicks': RawDigitalOcean1ClickApp[];
      }>(
        `${this.baseUrl}/1-clicks?type=droplet`,
        { method: 'GET' },
        apiToken
      );

      const apps = Array.isArray(data['1_clicks']) ? data['1_clicks'] : [];

      return apps
        .map((app) => {
          const normalizedSlug = this.normalizeString(app.slug)?.toLowerCase();
          if (!normalizedSlug) {
            return null;
          }

          const name =
            this.normalizeString(app.name) ||
            this.formatAppName(normalizedSlug);

          const description =
            this.normalizeString(app.group_description) ||
            this.normalizeString(app.short_description) ||
            this.normalizeString(app.summary) ||
            this.normalizeString(app.description) ||
            this.getAppDescription(normalizedSlug);

          let categoriesList: string[] = Array.isArray(app.categories)
            ? (app.categories as unknown[])
                .map((category) => this.normalizeCategory(category))
                .filter((category): category is string => Boolean(category))
            : [];

          const explicitCategory = this.normalizeCategory(app.category);
          if (explicitCategory && !categoriesList.includes(explicitCategory)) {
            categoriesList = [explicitCategory, ...categoriesList];
          }

          const uniqueCategories = categoriesList.filter(
            (value, index, array) => array.indexOf(value) === index
          );
          const primaryCategory =
            uniqueCategories[0] || this.getAppCategory(normalizedSlug) || 'Other';

          const compatibleImages = Array.isArray(app.compatible_images)
            ? (app.compatible_images as unknown[])
                .map((value) => this.normalizeString(value))
                .filter((value): value is string => Boolean(value))
            : Array.isArray(app.compatible_distro_slugs)
              ? (app.compatible_distro_slugs as unknown[])
                  .map((value) => this.normalizeString(value))
                  .filter((value): value is string => Boolean(value))
              : undefined;

          const imageSlug =
            this.normalizeString(app.image_slug) ||
            this.normalizeString(app.icon_slug) ||
            this.normalizeString(app.icon) ||
            normalizedSlug;

          const vendor =
            this.normalizeString(app.vendor_name) ||
            this.normalizeString(app.vendor);

          const links =
            app.links && typeof app.links === 'object' ? (app.links as Record<string, any>) : undefined;

          return {
            slug: normalizedSlug,
            type: this.normalizeString(app.type) || 'droplet',
            name,
            description,
            category: primaryCategory,
            categories: uniqueCategories.length > 0 ? uniqueCategories : undefined,
            image_slug: imageSlug,
            compatible_images: compatibleImages,
            badge: this.normalizeString(app.badge),
            vendor,
            links,
          } as DigitalOceanMarketplaceApp;
        })
        .filter((app): app is DigitalOceanMarketplaceApp => Boolean(app));
    } catch (error: any) {
      if (error.status) {
        console.error(
          `Error fetching DigitalOcean 1-Click Apps: API returned ${error.status} ${error.statusText || ''}`,
          {
            status: error.status,
            message: error.message,
            data: error.data,
          }
        );
      } else {
        console.error('Error fetching DigitalOcean 1-Click Apps:', error.message || error);
      }

      throw error;
    }
  }

  /**
   * Format app slug into human-readable name
   * Uses proper names for known applications
   */
  private formatAppName(slug: string): string {
    // Known app name mappings for proper formatting
    const nameMap: Record<string, string> = {
      // AI/ML Tools
      'sharklabs-openwebui': 'OpenWebUI',
      'openwebui': 'OpenWebUI',
      'ollama': 'Ollama',
      'jupyter': 'Jupyter Notebook',
      'jupyternotebook': 'Jupyter Notebook',
      
      // VPN/Security
      'sharklabs-piholevpn': 'Pi-hole + VPN',
      'pihole': 'Pi-hole',
      'openvpn': 'OpenVPN',
      'wireguard': 'WireGuard',
      
      // Development Tools
      'sharklabs-counterstrike2': 'Counter-Strike 2 Server',
      'sharklabs-erpodoo': 'Odoo ERP',
      'sharklabs-conduktorconsole': 'Conduktor Console',
      'sharklabs-foldinghome': 'Folding@home',
      'sharklabs-ollamawithopenwe': 'Ollama with OpenWebUI',
      
      // Popular Apps
      'wordpress': 'WordPress',
      'nextcloud': 'Nextcloud',
      'docker': 'Docker',
      'nginx': 'Nginx',
      'apache': 'Apache',
      'mysql': 'MySQL',
      'postgresql': 'PostgreSQL',
      'mongodb': 'MongoDB',
      'redis': 'Redis',
      'nodejs': 'Node.js',
      'lemp': 'LEMP Stack',
      'lamp': 'LAMP Stack',
      'grafana': 'Grafana',
      'prometheus': 'Prometheus',
      'elasticsearch': 'Elasticsearch',
      'kibana': 'Kibana',
      'logstash': 'Logstash',
      'jenkins': 'Jenkins',
      'gitlab': 'GitLab',
      'mattermost': 'Mattermost',
      'rocketchat': 'Rocket.Chat',
      'jitsi': 'Jitsi Meet',
      'plex': 'Plex Media Server',
      'jellyfin': 'Jellyfin',
      'minecraft': 'Minecraft Server',
      'terraria': 'Terraria Server',
      'magento': 'Magento',
      'prestashop': 'PrestaShop',
      'drupal': 'Drupal',
      'joomla': 'Joomla',
      'ghost': 'Ghost',
    };

    // Check for exact match first
    const lowerSlug = slug.toLowerCase();
    if (nameMap[lowerSlug]) {
      return nameMap[lowerSlug];
    }

    // Check for partial matches (for versioned apps)
    for (const [key, name] of Object.entries(nameMap)) {
      if (lowerSlug.startsWith(key + '-') || lowerSlug.includes(key)) {
        // Extract version if present
        const versionMatch = slug.match(/-(\d+)-?(\d+)?/);
        if (versionMatch) {
          const version = versionMatch[2] ? `${versionMatch[1]}.${versionMatch[2]}` : versionMatch[1];
          return `${name} ${version}`;
        }
        return name;
      }
    }

    // Fallback: capitalize each word and handle common patterns
    return slug
      .split('-')
      .map(word => {
        // Keep version numbers as-is
        if (/^\d+$/.test(word)) return word;
        // Handle special cases
        if (word.toLowerCase() === 'js') return 'JS';
        if (word.toLowerCase() === 'ui') return 'UI';
        if (word.toLowerCase() === 'api') return 'API';
        if (word.toLowerCase() === 'cms') return 'CMS';
        if (word.toLowerCase() === 'vpn') return 'VPN';
        if (word.toLowerCase() === 'sql') return 'SQL';
        // Capitalize first letter
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }

  private normalizeString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private normalizeCategory(value: unknown): string | undefined {
    const raw = this.normalizeString(value);
    if (!raw) {
      return undefined;
    }

    const hasFormattingHints = /[A-Z]/.test(raw.slice(1)) || raw.includes('/') || raw.includes('&');
    const sanitized = raw.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

    if (!sanitized) {
      return undefined;
    }

    if (hasFormattingHints && raw === sanitized) {
      return raw;
    }

    return sanitized
      .split(' ')
      .filter(Boolean)
      .map((part) => {
        const upper = part.toUpperCase();
        if (upper.length <= 3) {
          return upper;
        }
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(' ');
  }

  /**
   * Get category for app based on slug patterns
   * Uses specific app mappings and fallback patterns
   */
  private getAppCategory(slug: string): string {
    const slugLower = slug.toLowerCase();
    
    // Specific app mappings for accurate categorization
    const categoryMap: Record<string, string> = {
      // AI/ML Tools
      'sharklabs-openwebui': 'Development',
      'openwebui': 'Development',
      'ollama': 'Development',
      'jupyter': 'Development',
      'jupyternotebook': 'Development',
      'sharklabs-ollamawithopenwe': 'Development',
      
      // Security/VPN
      'sharklabs-piholevpn': 'Security',
      'pihole': 'Security',
      'openvpn': 'Security',
      'wireguard': 'Security',
      'vault': 'Security',
      'bitwarden': 'Security',
      'keycloak': 'Security',
      'authelia': 'Security',
      'fail2ban': 'Security',
      'crowdsec': 'Security',
      
      // Business/ERP
      'sharklabs-erpodoo': 'Productivity',
      'odoo': 'Productivity',
      'erpnext': 'Productivity',
      
      // Development Tools
      'sharklabs-conduktorconsole': 'Development',
      'jenkins': 'Development',
      'gitlab': 'Development',
      'gitea': 'Development',
      'sonarqube': 'Development',
      'nexus': 'Development',
      
      // Scientific Computing
      'sharklabs-foldinghome': 'Other',
      'foldinghome': 'Other',
      
      // Gaming (actual game servers)
      'sharklabs-counterstrike2': 'Gaming',
      'minecraft': 'Gaming',
      'terraria': 'Gaming',
      'csgo': 'Gaming',
      'valheim': 'Gaming',
      'ark': 'Gaming',
      'rust': 'Gaming',
      'gameserver': 'Gaming',
    };

    // Check for exact matches first
    if (categoryMap[slugLower]) {
      return categoryMap[slugLower];
    }

    // Check for partial matches
    for (const [key, category] of Object.entries(categoryMap)) {
      if (slugLower.startsWith(key + '-') || slugLower.includes(key)) {
        return category;
      }
    }

    // Fallback to pattern matching
    
    // Database apps
    if (slugLower.includes('mysql') || slugLower.includes('postgres') || 
        slugLower.includes('mongodb') || slugLower.includes('redis') ||
        slugLower.includes('mariadb') || slugLower.includes('cassandra') ||
        slugLower.includes('influxdb') || slugLower.includes('neo4j') ||
        slugLower.includes('elasticsearch') || slugLower.includes('clickhouse') ||
        slugLower.includes('couchdb') || slugLower.includes('sqlite')) {
      return 'Databases';
    }
    
    // CMS platforms
    if (slugLower.includes('wordpress') || slugLower.includes('drupal') ||
        slugLower.includes('joomla') || slugLower.includes('ghost') ||
        slugLower.includes('strapi') || slugLower.includes('directus') ||
        slugLower.includes('craft') || slugLower.includes('typo3') ||
        slugLower.includes('wagtail') || slugLower.includes('contentful')) {
      return 'CMS';
    }
    
    // Container platforms
    if (slugLower.includes('docker') || slugLower.includes('kubernetes') ||
        slugLower.includes('k3s') || slugLower.includes('rancher') ||
        slugLower.includes('portainer') || slugLower.includes('containerd')) {
      return 'Containers';
    }
    
    // Development frameworks and tools
    if (slugLower.includes('node') || slugLower.includes('ruby') ||
        slugLower.includes('python') || slugLower.includes('php') ||
        slugLower.includes('django') || slugLower.includes('rails') ||
        slugLower.includes('laravel') || slugLower.includes('symfony') ||
        slugLower.includes('flask') || slugLower.includes('fastapi') ||
        slugLower.includes('express') || slugLower.includes('nextjs') ||
        slugLower.includes('react') || slugLower.includes('vue') ||
        slugLower.includes('angular') || slugLower.includes('nuxt') ||
        slugLower.includes('gatsby') || slugLower.includes('svelte') ||
        slugLower.includes('golang') || slugLower.includes('java') ||
        slugLower.includes('dotnet') || slugLower.includes('spring') ||
        slugLower.includes('vscode') || slugLower.includes('code-server')) {
      return 'Development';
    }
    
    // Monitoring, Analytics & Observability
    if (slugLower.includes('monitoring') || slugLower.includes('grafana') ||
        slugLower.includes('prometheus') || slugLower.includes('elk') ||
        slugLower.includes('kibana') || slugLower.includes('logstash') ||
        slugLower.includes('jaeger') || slugLower.includes('zipkin') ||
        slugLower.includes('datadog') || slugLower.includes('newrelic') ||
        slugLower.includes('sentry') || slugLower.includes('uptimerobot') ||
        slugLower.includes('nagios') || slugLower.includes('zabbix') ||
        slugLower.includes('collectd') || slugLower.includes('telegraf') ||
        slugLower.includes('metabase') || slugLower.includes('superset')) {
      return 'Monitoring';
    }
    
    // Web servers and reverse proxies
    if (slugLower.includes('nginx') || slugLower.includes('apache') ||
        slugLower.includes('caddy') || slugLower.includes('traefik') ||
        slugLower.includes('haproxy') || slugLower.includes('envoy') ||
        slugLower.includes('lighttpd') || slugLower.includes('httpd') ||
        (slugLower.includes('lemp') || slugLower.includes('lamp'))) {
      return 'Web Servers';
    }
    
    // E-commerce platforms
    if (slugLower.includes('magento') || slugLower.includes('shopify') ||
        slugLower.includes('woocommerce') || slugLower.includes('prestashop') ||
        slugLower.includes('opencart') || slugLower.includes('bigcommerce') ||
        slugLower.includes('spree') || slugLower.includes('sylius') ||
        slugLower.includes('commerce') || slugLower.includes('shop')) {
      return 'E-commerce';
    }
    
    // Communication & Collaboration
    if (slugLower.includes('mattermost') || slugLower.includes('rocket') ||
        slugLower.includes('slack') || slugLower.includes('discord') ||
        slugLower.includes('matrix') || slugLower.includes('element') ||
        slugLower.includes('jitsi') || slugLower.includes('bigbluebutton') ||
        slugLower.includes('nextcloud') || slugLower.includes('owncloud') ||
        slugLower.includes('seafile') || slugLower.includes('syncthing') ||
        slugLower.includes('chat') || slugLower.includes('meet')) {
      return 'Communication';
    }
    
    // Media & Entertainment
    if (slugLower.includes('plex') || slugLower.includes('jellyfin') ||
        slugLower.includes('emby') || slugLower.includes('kodi') ||
        slugLower.includes('subsonic') || slugLower.includes('airsonic') ||
        slugLower.includes('navidrome') || slugLower.includes('photoprism') ||
        slugLower.includes('immich') || slugLower.includes('pixelfed') ||
        slugLower.includes('media') || slugLower.includes('streaming')) {
      return 'Media';
    }
    
    // Productivity & Office
    if (slugLower.includes('onlyoffice') || slugLower.includes('collabora') ||
        slugLower.includes('etherpad') || slugLower.includes('hedgedoc') ||
        slugLower.includes('bookstack') || slugLower.includes('dokuwiki') ||
        slugLower.includes('tiddlywiki') || slugLower.includes('outline') ||
        slugLower.includes('notion') || slugLower.includes('obsidian') ||
        slugLower.includes('office') || slugLower.includes('wiki')) {
      return 'Productivity';
    }
    
    return 'Other';
  }

  /**
   * Get description for app based on slug
   * Provides accurate descriptions for known apps
   */
  private getAppDescription(slug: string): string {
    const descriptions: Record<string, string> = {
      // AI/ML Tools
      'sharklabs-openwebui': 'Web interface for running AI models locally with Ollama',
      'openwebui': 'Web interface for running AI models locally',
      'ollama': 'Run large language models locally',
      'jupyter': 'Interactive computing environment for data science',
      'jupyternotebook': 'Interactive computing environment for data science',
      'sharklabs-ollamawithopenwe': 'Ollama AI models with web interface',
      
      // Security/VPN
      'sharklabs-piholevpn': 'Network-wide ad blocker with VPN capabilities',
      'pihole': 'Network-wide ad blocker and DNS sinkhole',
      'openvpn': 'Open-source VPN solution for secure connections',
      'wireguard': 'Modern, fast, and secure VPN protocol',
      'vault': 'Secrets management and data protection platform',
      'bitwarden': 'Open-source password manager and vault',
      
      // Business/ERP
      'sharklabs-erpodoo': 'Complete business management suite with ERP, CRM, and more',
      'odoo': 'All-in-one business management software',
      
      // Development Tools
      'sharklabs-conduktorconsole': 'Apache Kafka management and monitoring platform',
      'jenkins': 'Automation server for CI/CD pipelines',
      'gitlab': 'Complete DevOps platform with Git repository management',
      'gitea': 'Lightweight Git service with web interface',
      
      // Gaming
      'sharklabs-counterstrike2': 'Counter-Strike 2 dedicated game server',
      'minecraft': 'Minecraft dedicated game server',
      'terraria': 'Terraria dedicated game server',
      
      // Scientific Computing
      'sharklabs-foldinghome': 'Distributed computing for disease research',
      
      // CMS
      'wordpress': 'Popular open-source CMS for websites and blogs',
      'drupal': 'Flexible open-source CMS and framework',
      'joomla': 'User-friendly CMS for building websites',
      'ghost': 'Modern publishing platform for blogs and newsletters',
      'strapi': 'Headless CMS for building APIs quickly',
      
      // Containers
      'docker': 'Container platform for building and deploying applications',
      'kubernetes': 'Container orchestration platform',
      'rancher': 'Complete container management platform',
      'portainer': 'Lightweight container management UI',
      
      // Databases
      'mongodb': 'NoSQL document database',
      'mysql': 'Open-source relational database',
      'postgres': 'Advanced open-source relational database',
      'postgresql': 'Advanced open-source relational database',
      'redis': 'In-memory data structure store',
      'mariadb': 'MySQL-compatible relational database',
      'elasticsearch': 'Distributed search and analytics engine',
      'influxdb': 'Time series database for metrics and events',
      
      // Development Stacks
      'nodejs': 'JavaScript runtime for server-side applications',
      'lemp': 'Linux, Nginx, MySQL, PHP stack',
      'lamp': 'Linux, Apache, MySQL, PHP stack',
      'django': 'High-level Python web framework',
      'rails': 'Ruby web application framework',
      'laravel': 'PHP web application framework',
      'nextjs': 'React framework for production applications',
      
      // Web Servers
      'nginx': 'High-performance web server and reverse proxy',
      'apache': 'Popular open-source web server',
      'caddy': 'Automatic HTTPS web server',
      'traefik': 'Modern reverse proxy and load balancer',
      
      // Monitoring
      'grafana': 'Analytics and monitoring platform',
      'prometheus': 'Systems monitoring and alerting toolkit',
      'elk': 'Elasticsearch, Logstash, and Kibana stack',
      'nagios': 'IT infrastructure monitoring system',
      
      // Communication
      'mattermost': 'Open-source team collaboration platform',
      'nextcloud': 'Self-hosted file sync and collaboration platform',
      'jitsi': 'Open-source video conferencing solution',
      'rocketchat': 'Open-source team communication platform',
      
      // E-commerce
      'magento': 'Feature-rich e-commerce platform',
      'woocommerce': 'WordPress e-commerce plugin',
      'prestashop': 'Open-source e-commerce solution',
      
      // Media
      'plex': 'Media server for streaming content',
      'jellyfin': 'Free media server software',
      'photoprism': 'AI-powered photo management',
      
      // Programming Languages
      'python': 'Python programming language runtime',
      'ruby': 'Ruby programming language runtime',
      'php': 'PHP programming language runtime',
      'k3s': 'Lightweight Kubernetes distribution',
    };
    
    // Try exact match first
    const lowerSlug = slug.toLowerCase();
    if (descriptions[lowerSlug]) {
      return descriptions[lowerSlug];
    }

    // Try partial matches for versioned apps
    for (const [key, description] of Object.entries(descriptions)) {
      if (lowerSlug.startsWith(key + '-') || lowerSlug.includes(key)) {
        return description;
      }
    }
    
    return 'Pre-configured marketplace application ready for deployment';
  }

  /**
   * Resize a Droplet
   */
  async resizeDroplet(apiToken: string, dropletId: number, newSize: string, disk: boolean = false): Promise<DigitalOceanAction> {
    return this.performDropletAction(apiToken, dropletId, 'resize', {
      size: newSize,
      disk,
    });
  }

  /**
   * Rebuild a Droplet with a new image
   */
  async rebuildDroplet(apiToken: string, dropletId: number, image: string | number): Promise<DigitalOceanAction> {
    return this.performDropletAction(apiToken, dropletId, 'rebuild', { image });
  }

  /**
   * Rename a Droplet
   */
  async renameDroplet(apiToken: string, dropletId: number, name: string): Promise<DigitalOceanAction> {
    return this.performDropletAction(apiToken, dropletId, 'rename', { name });
  }

  /**
   * Enable backups on a Droplet
   */
  async enableBackups(apiToken: string, dropletId: number): Promise<DigitalOceanAction> {
    return this.performDropletAction(apiToken, dropletId, 'enable_backups');
  }

  /**
   * Disable backups on a Droplet
   */
  async disableBackups(apiToken: string, dropletId: number): Promise<DigitalOceanAction> {
    return this.performDropletAction(apiToken, dropletId, 'disable_backups');
  }

  /**
   * Create a snapshot of a Droplet
   */
  async createSnapshot(apiToken: string, dropletId: number, snapshotName: string): Promise<DigitalOceanAction> {
    return this.performDropletAction(apiToken, dropletId, 'snapshot', {
      name: snapshotName,
    });
  }
}

// Export a singleton instance
export const digitalOceanService = new DigitalOceanService();
