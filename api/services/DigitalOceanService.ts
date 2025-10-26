/**
 * DigitalOcean API Service for ContainerStacks
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

class DigitalOceanService {
  private readonly baseUrl = 'https://api.digitalocean.com/v2';

  constructor() {
    // API token comes from database via admin UI, not environment
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
   * Get all available sizes (instance types)
   */
  async getDigitalOceanSizes(apiToken: string): Promise<DigitalOceanSize[]> {
    try {
      if (!apiToken) throw new Error('DigitalOcean API token not provided');

      const response = await fetch(`${this.baseUrl}/sizes?per_page=200`, {
        headers: this.getHeaders(apiToken),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`DigitalOcean API error: ${response.status} ${response.statusText} ${errorText}`);
      }

      const data = await response.json();
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

      const response = await fetch(`${this.baseUrl}/regions?per_page=200`, {
        headers: this.getHeaders(apiToken),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`DigitalOcean API error: ${response.status} ${response.statusText} ${errorText}`);
      }

      const data = await response.json();
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

      const response = await fetch(url, {
        headers: this.getHeaders(apiToken),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`DigitalOcean API error: ${response.status} ${response.statusText} ${errorText}`);
      }

      const data = await response.json();
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

      const response = await fetch(`${this.baseUrl}/droplets`, {
        method: 'POST',
        headers: this.getHeaders(apiToken),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`DigitalOcean API error: ${response.status} ${response.statusText} ${errorText}`);
      }

      const data = await response.json();
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

      const response = await fetch(`${this.baseUrl}/droplets/${dropletId}`, {
        headers: this.getHeaders(apiToken),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`DigitalOcean API error: ${response.status} ${response.statusText} ${errorText}`);
      }

      const data = await response.json();
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

      const response = await fetch(`${this.baseUrl}/droplets?per_page=200`, {
        headers: this.getHeaders(apiToken),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`DigitalOcean API error: ${response.status} ${response.statusText} ${errorText}`);
      }

      const data = await response.json();
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

      const response = await fetch(`${this.baseUrl}/droplets/${dropletId}`, {
        method: 'DELETE',
        headers: this.getHeaders(apiToken),
      });

      if (!response.ok && response.status !== 204) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`DigitalOcean API error: ${response.status} ${response.statusText} ${errorText}`);
      }
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

      const response = await fetch(`${this.baseUrl}/droplets/${dropletId}/actions`, {
        method: 'POST',
        headers: this.getHeaders(apiToken),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`DigitalOcean API error: ${response.status} ${response.statusText} ${errorText}`);
      }

      const data = await response.json();
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

      const response = await fetch(`${this.baseUrl}/account/keys`, {
        headers: this.getHeaders(apiToken),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`DigitalOcean API error: ${response.status} ${response.statusText} ${errorText}`);
      }

      const data = await response.json();
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

      const response = await fetch(`${this.baseUrl}/account/keys`, {
        method: 'POST',
        headers: this.getHeaders(apiToken),
        body: JSON.stringify({
          name,
          public_key: publicKey,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`DigitalOcean API error: ${response.status} ${response.statusText} ${errorText}`);
      }

      const data = await response.json();
      return data.ssh_key;
    } catch (error) {
      console.error('Error creating DigitalOcean SSH key:', error);
      throw error;
    }
  }

  /**
   * Get account information
   */
  async getAccount(apiToken: string): Promise<any> {
    try {
      if (!apiToken) throw new Error('DigitalOcean API token not provided');

      const response = await fetch(`${this.baseUrl}/account`, {
        headers: this.getHeaders(apiToken),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`DigitalOcean API error: ${response.status} ${response.statusText} ${errorText}`);
      }

      const data = await response.json();
      return data.account;
    } catch (error) {
      console.error('Error fetching DigitalOcean account:', error);
      throw error;
    }
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
