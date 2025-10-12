/**
 * Linode API Service for ContainerStacks
 * Handles integration with Linode API for VPS management
 */

import { config } from '../config/index.js';

export interface LinodeType {
  id: string;
  label: string;
  disk: number;
  memory: number;
  vcpus: number;
  transfer: number;
  price: {
    hourly: number;
    monthly: number;
  };
  type_class: string;
  successor?: string;
}

export interface LinodeRegion {
  id: string;
  label: string;
  country: string;
  capabilities: string[];
  status: string;
  resolvers: {
    ipv4: string;
    ipv6: string;
  };
}

export interface LinodeInstance {
  id: number;
  label: string;
  group: string;
  status: string;
  created: string;
  updated: string;
  type: string;
  ipv4: string[];
  ipv6: string;
  image: string;
  region: string;
  specs: {
    disk: number;
    memory: number;
    vcpus: number;
    gpus: number;
    transfer: number;
  };
  alerts: {
    cpu: number;
    network_in: number;
    network_out: number;
    transfer_quota: number;
    io: number;
  };
  backups: {
    enabled: boolean;
    available: boolean;
    schedule: {
      day: string;
      window: string;
    };
    last_successful: string;
  };
  hypervisor: string;
  watchdog_enabled: boolean;
  tags: string[];
  host_uuid: string;
  has_user_data: boolean;
}

export interface CreateLinodeRequest {
  type: string;
  region: string;
  image: string;
  label: string;
  root_pass: string;
  authorized_keys?: string[];
  backups_enabled?: boolean;
  private_ip?: boolean;
  tags?: string[];
  group?: string;
}

class LinodeService {
  private readonly apiToken: string;
  private readonly baseUrl = 'https://api.linode.com/v4';

  constructor() {
    // Read directly from process.env first to avoid any timing issues
    this.apiToken = process.env.LINODE_API_TOKEN || config.LINODE_API_TOKEN || '';
    if (!this.apiToken) {
      console.warn('LINODE_API_TOKEN not configured');
    }
  }

  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Fetch all available Linode types (plans)
   */
  async getLinodeTypes(): Promise<LinodeType[]> {
    try {
      if (!this.apiToken) {
        throw new Error('Linode API token not configured');
      }
      const isDebug = process.env.LOG_LEVEL === 'debug' || process.env.NODE_ENV !== 'production'
      if (isDebug) {
        console.log('Fetching Linode types')
      }
      const response = await fetch(`${this.baseUrl}/linode/types`, {
        headers: this.getHeaders(),
      });
      if (isDebug) {
        console.log('Linode API response status:', response.status)
      }
      if (!response.ok) {
        if (isDebug) {
          const errorText = await response.text()
          console.error('Linode API error response:', errorText)
        }
        throw new Error(`Linode API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (isDebug) {
        console.log('Fetched Linode types:', data.data.length)
      }
      return data.data.map((type: any) => ({
        id: type.id,
        label: type.label,
        disk: type.disk,
        memory: type.memory,
        vcpus: type.vcpus,
        transfer: type.transfer,
        price: type.price,
        type_class: type.type_class,
        successor: type.successor,
      }));
    } catch (error) {
      console.error('Error fetching Linode types:', error);
      throw error;
    }
  }

  /**
   * Fetch all available Linode regions
   */
  async getLinodeRegions(): Promise<LinodeRegion[]> {
    try {
      if (!this.apiToken) {
        throw new Error('Linode API token not configured');
      }
      const isDebug = process.env.LOG_LEVEL === 'debug' || process.env.NODE_ENV !== 'production'
      if (isDebug) {
        console.log('Fetching Linode regions')
      }
      const response = await fetch(`${this.baseUrl}/regions`, {
        headers: this.getHeaders(),
      });
      if (isDebug) {
        console.log('Linode API response status:', response.status)
      }
      if (!response.ok) {
        if (isDebug) {
          const errorText = await response.text()
          console.error('Linode API error response:', errorText)
        }
        throw new Error(`Linode API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (isDebug) {
        console.log('Fetched Linode regions:', data.data.length)
      }
      return data.data.map((region: any) => ({
        id: region.id,
        label: region.label,
        country: region.country,
        capabilities: region.capabilities,
        status: region.status,
        resolvers: region.resolvers,
      }));
    } catch (error) {
      console.error('Error fetching Linode regions:', error);
      throw error;
    }
  }

  /**
   * Fetch all Linode instances for the account
   */
  async getLinodeInstances(): Promise<LinodeInstance[]> {
    try {
      if (!this.apiToken) {
        throw new Error('Linode API token not configured');
      }

      const response = await fetch(`${this.baseUrl}/linode/instances`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Linode API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching Linode instances:', error);
      throw error;
    }
  }

  /**
   * Create a new Linode instance
   */
  async createLinodeInstance(createRequest: CreateLinodeRequest): Promise<LinodeInstance> {
    try {
      if (!this.apiToken) {
        throw new Error('Linode API token not configured');
      }

      const response = await fetch(`${this.baseUrl}/linode/instances`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(createRequest),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Linode API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating Linode instance:', error);
      throw error;
    }
  }

  /**
   * Get a specific Linode instance
   */
  async getLinodeInstance(instanceId: number): Promise<LinodeInstance> {
    try {
      if (!this.apiToken) {
        throw new Error('Linode API token not configured');
      }

      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Linode API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching Linode instance:', error);
      throw error;
    }
  }

  /**
   * Boot a Linode instance
   */
  async bootLinodeInstance(instanceId: number): Promise<void> {
    try {
      if (!this.apiToken) {
        throw new Error('Linode API token not configured');
      }

      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/boot`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Linode API error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error booting Linode instance:', error);
      throw error;
    }
  }

  /**
   * Shutdown a Linode instance
   */
  async shutdownLinodeInstance(instanceId: number): Promise<void> {
    try {
      if (!this.apiToken) {
        throw new Error('Linode API token not configured');
      }

      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/shutdown`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Linode API error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error shutting down Linode instance:', error);
      throw error;
    }
  }

  /**
   * Reboot a Linode instance
   */
  async rebootLinodeInstance(instanceId: number): Promise<void> {
    try {
      if (!this.apiToken) {
        throw new Error('Linode API token not configured');
      }

      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/reboot`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Linode API error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error rebooting Linode instance:', error);
      throw error;
    }
  }

  /**
   * Delete a Linode instance
   */
  async deleteLinodeInstance(instanceId: number): Promise<void> {
    try {
      if (!this.apiToken) {
        throw new Error('Linode API token not configured');
      }

      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Linode API error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting Linode instance:', error);
      throw error;
    }
  }
}

export const linodeService = new LinodeService();