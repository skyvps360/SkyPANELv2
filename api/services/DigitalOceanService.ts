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
  image_slug: string;
  compatible_images?: string[];
  type: string;
}

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

      const data = await this.makeRequest<{ sizes: DigitalOceanSize[] }>(
        `${this.baseUrl}/sizes?per_page=200`,
        { method: 'GET' },
        apiToken
      );

      return data.sizes || [];
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

      const data = await this.makeRequest<{ regions: DigitalOceanRegion[] }>(
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
   * Get all available images
   */
  async getDigitalOceanImages(apiToken: string, type?: 'distribution' | 'application'): Promise<DigitalOceanImage[]> {
    try {
      if (!apiToken) throw new Error('DigitalOcean API token not provided');

      let url = `${this.baseUrl}/images?per_page=100`;
      if (type) {
        url += `&type=${type}`;
      }

      const data = await this.makeRequest<{ images: DigitalOceanImage[] }>(
        url,
        { method: 'GET' },
        apiToken
      );

      return data.images || [];
    } catch (error) {
      console.error('Error fetching DigitalOcean images:', error);
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

      const data = await this.makeRequest<{ droplets: DigitalOceanDroplet[] }>(
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
        '1_clicks': Array<{
          slug: string;
          type: string;
        }>
      }>(
        `${this.baseUrl}/1-clicks?type=droplet`,
        { method: 'GET' },
        apiToken
      );

      // Transform API response to MarketplaceApp format
      return (data['1_clicks'] || []).map(app => ({
        slug: app.slug,
        name: this.formatAppName(app.slug),
        description: this.getAppDescription(app.slug),
        category: this.getAppCategory(app.slug),
        image_slug: app.slug,
        compatible_images: [],
        type: app.type,
      }));
    } catch (error: any) {
      // Log detailed error information
      if (error.status) {
        console.error(`Error fetching DigitalOcean 1-Click Apps: API returned ${error.status} ${error.statusText || ''}`, {
          status: error.status,
          message: error.message,
          data: error.data
        });
      } else {
        console.error('Error fetching DigitalOcean 1-Click Apps:', error.message || error);
      }
      
      // Re-throw error to be handled by caller
      throw error;
    }
  }

  /**
   * Format app slug into human-readable name
   * Example: "wordpress-20-04" -> "WordPress 20 04"
   */
  private formatAppName(slug: string): string {
    // Split on hyphens, capitalize words, handle version numbers
    return slug
      .split('-')
      .map(word => {
        // Keep version numbers as-is (e.g., "20", "04")
        if (/^\d+$/.test(word)) return word;
        // Capitalize first letter
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }

  /**
   * Get category for app based on slug patterns
   * Uses common naming conventions in DigitalOcean marketplace
   */
  private getAppCategory(slug: string): string {
    const slugLower = slug.toLowerCase();
    
    // Database apps
    if (slugLower.includes('mysql') || slugLower.includes('postgres') || 
        slugLower.includes('mongodb') || slugLower.includes('redis') ||
        slugLower.includes('mariadb')) {
      return 'Databases';
    }
    
    // CMS platforms
    if (slugLower.includes('wordpress') || slugLower.includes('drupal') ||
        slugLower.includes('joomla') || slugLower.includes('ghost')) {
      return 'CMS';
    }
    
    // Container platforms
    if (slugLower.includes('docker') || slugLower.includes('kubernetes') ||
        slugLower.includes('k3s')) {
      return 'Containers';
    }
    
    // Development frameworks
    if (slugLower.includes('node') || slugLower.includes('ruby') ||
        slugLower.includes('python') || slugLower.includes('php') ||
        slugLower.includes('django') || slugLower.includes('rails')) {
      return 'Development';
    }
    
    // Monitoring & Analytics
    if (slugLower.includes('monitoring') || slugLower.includes('grafana') ||
        slugLower.includes('prometheus') || slugLower.includes('elk')) {
      return 'Monitoring';
    }
    
    // Web servers
    if (slugLower.includes('nginx') || slugLower.includes('apache') ||
        slugLower.includes('caddy')) {
      return 'Web Servers';
    }
    
    return 'Other';
  }

  /**
   * Get description for app based on slug
   * Provides basic descriptions for common apps
   */
  private getAppDescription(slug: string): string {
    const descriptions: Record<string, string> = {
      'wordpress': 'Popular open-source CMS for websites and blogs',
      'docker': 'Container platform for building and deploying applications',
      'mongodb': 'NoSQL document database',
      'mysql': 'Open-source relational database',
      'nodejs': 'JavaScript runtime for server-side applications',
      'lemp': 'Linux, Nginx, MySQL, PHP stack',
      'lamp': 'Linux, Apache, MySQL, PHP stack',
      'nginx': 'High-performance web server and reverse proxy',
      'apache': 'Popular open-source web server',
      'redis': 'In-memory data structure store',
      'postgres': 'Advanced open-source relational database',
      'postgresql': 'Advanced open-source relational database',
      'drupal': 'Open-source CMS and web application framework',
      'joomla': 'Open-source CMS for publishing web content',
      'ghost': 'Modern open-source publishing platform',
      'kubernetes': 'Container orchestration platform',
      'k3s': 'Lightweight Kubernetes distribution',
      'grafana': 'Analytics and monitoring platform',
      'prometheus': 'Monitoring and alerting toolkit',
      'python': 'Python programming language runtime',
      'ruby': 'Ruby programming language runtime',
      'php': 'PHP programming language runtime',
      'django': 'High-level Python web framework',
      'rails': 'Ruby on Rails web application framework',
      'mariadb': 'Open-source relational database (MySQL fork)',
      'elk': 'Elasticsearch, Logstash, and Kibana stack',
      'caddy': 'Modern web server with automatic HTTPS',
    };
    
    // Try exact match first
    const baseSlug = slug.split('-')[0].toLowerCase();
    return descriptions[baseSlug] || 'Pre-configured marketplace application';
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
