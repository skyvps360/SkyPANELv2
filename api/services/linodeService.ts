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
  stackscript_id?: number;
  stackscript_data?: Record<string, any>;
}

export interface LinodeImage {
  id: string;
  label: string;
  description: string;
  created: string;
  type: string;
  is_public: boolean;
  vendor: string;
  size: number;
  deprecated: boolean;
  expiry: string | null;
  eol: string | null;
  status: string;
  capabilities: string[];
}

export interface LinodeStackScript {
  id: number;
  username: string;
  label: string;
  description?: string;
  images: string[];
  is_public: boolean;
  created: string;
  updated: string;
  rev_note: string;
  script: string;
  user_defined_fields: Array<{
    name: string;
    label: string;
    default: string;
    example: string;
    oneof: string;
  }>;
  deployments_active: number;
  deployments_total: number;
}

export interface CreateStackScriptRequest {
  label: string;
  script: string;
  images: string[];
  description?: string;
  is_public?: boolean; // default false
  rev_note?: string;
  user_defined_fields?: Array<{
    name: string;
    label: string;
    default?: string;
    example?: string;
    oneof?: string;
  }>;
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

  /**
   * Fetch Linode Marketplace apps. Optionally filter by slug list.
   * Also fetches the underlying StackScript details to get user_defined_fields.
   */
  async listMarketplaceApps(slugs?: string[]): Promise<any[]> {
    try {
      if (!this.apiToken) throw new Error('Linode API token not configured');
      const url = new URL(`${this.baseUrl}/linode/apps`);
      // The API supports pagination; fetch first page which contains the needed slugs
      const response = await fetch(url.toString(), { headers: this.getHeaders() });
      if (!response.ok) {
        const txt = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${txt}`);
      }
      const data = await response.json();
      let apps: any[] = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      if (Array.isArray(slugs) && slugs.length > 0) {
        const set = new Set(slugs.map(s => String(s).toLowerCase()));
        apps = apps.filter(a => set.has(String(a?.slug || '').toLowerCase()));
      }

      // For each marketplace app, fetch the underlying StackScript to get user_defined_fields
      const appsWithFields = await Promise.all(apps.map(async (app) => {
        try {
          if (app.stackscript_id) {
            const stackscript = await this.getStackScript(app.stackscript_id);
            return {
              ...app,
              user_defined_fields: stackscript?.user_defined_fields || []
            };
          }
          return {
            ...app,
            user_defined_fields: []
          };
        } catch (error) {
          console.warn(`Failed to fetch StackScript ${app.stackscript_id} for app ${app.slug}:`, error);
          return {
            ...app,
            user_defined_fields: []
          };
        }
      }));

      return appsWithFields;
    } catch (error) {
      console.error('Error fetching Linode Marketplace apps:', error);
      throw error;
    }
  }

  /**
   * Fetch a single Marketplace app by slug.
   */
  async getMarketplaceApp(slug: string): Promise<any | null> {
    const apps = await this.listMarketplaceApps([slug]);
    return apps[0] || null;
  }

  /**
   * Create instance using a Marketplace app (uses app's underlying StackScript)
   */
  async createInstanceWithMarketplaceApp(params: {
    label: string;
    type: string;
    region: string;
    image: string;
    rootPassword: string;
    sshKeys?: string[];
    backups?: boolean;
    privateIP?: boolean;
    appSlug: string;
    appData: Record<string, any>;
  }): Promise<LinodeInstance> {
    const {
      label,
      type,
      region,
      image,
      rootPassword,
      sshKeys = [],
      backups = false,
      privateIP = false,
      appSlug,
      appData
    } = params;

    const app = await this.getMarketplaceApp(appSlug);
    if (!app) throw new Error(`Marketplace app not found: ${appSlug}`);

    const allowedImages: string[] = Array.isArray(app?.images) ? app.images : [];
    if (allowedImages.length > 0 && !allowedImages.includes(image)) {
      throw new Error('Selected image is not compatible with the chosen Marketplace app');
    }

    const udfs: any[] = Array.isArray(app?.user_defined_fields) ? app.user_defined_fields : [];
    const missing = udfs.filter(f => {
      const name = f?.name;
      if (!name) return false;
      const required = Boolean(f?.required) || String(f?.label || '').toLowerCase().includes('(required)');
      if (!required) return false;
      const val = appData[name];
      return val === undefined || val === null || String(val).trim() === '';
    });
    if (missing.length > 0) {
      const first = missing[0];
      throw new Error(`Missing required app field: ${first?.label || first?.name}`);
    }

    const createReq: CreateLinodeRequest = {
      type,
      region,
      image,
      label,
      root_pass: rootPassword,
      authorized_keys: sshKeys,
      backups_enabled: backups,
      private_ip: privateIP,
      stackscript_id: Number(app?.stackscript_id),
      stackscript_data: appData || {}
    };

    return this.createLinodeInstance(createReq);
  }

  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get Linode profile for current token (to determine username)
   */
  async getLinodeProfile(): Promise<{ username: string }> {
    try {
      if (!this.apiToken) throw new Error('Linode API token not configured');
      const response = await fetch(`${this.baseUrl}/profile`, {
        headers: this.getHeaders(),
      });
      if (!response.ok) {
        const txt = await response.text().catch(() => '');
        throw new Error(`Linode API error (profile): ${response.status} ${response.statusText} ${txt}`);
      }
      const data = await response.json();
      return { username: String(data.username || '') };
    } catch (error) {
      console.error('Error fetching Linode profile:', error);
      throw error;
    }
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
   * Fetch all available Linode images
   */
  async getLinodeImages(): Promise<LinodeImage[]> {
    try {
      if (!this.apiToken) {
        throw new Error('Linode API token not configured');
      }
      const isDebug = process.env.LOG_LEVEL === 'debug' || process.env.NODE_ENV !== 'production'
      if (isDebug) {
        console.log('Fetching Linode images')
      }
      const response = await fetch(`${this.baseUrl}/images`, {
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
        console.log('Fetched Linode images:', data.data.length)
      }
      return data.data.map((image: any) => ({
        id: image.id,
        label: image.label,
        description: image.description,
        created: image.created,
        type: image.type,
        is_public: image.is_public,
        vendor: image.vendor,
        size: image.size,
        deprecated: image.deprecated,
        expiry: image.expiry,
        eol: image.eol,
        status: image.status,
        capabilities: image.capabilities,
      }));
    } catch (error) {
      console.error('Error fetching Linode images:', error);
      throw error;
    }
  }

  /**
   * Fetch Linode StackScripts.
   * When mineOnly is true, use X-Filter to return only scripts owned by the account.
   */
  async getLinodeStackScripts(mineOnly: boolean = false): Promise<LinodeStackScript[]> {
    try {
      if (!this.apiToken) {
        throw new Error('Linode API token not configured');
      }
      const isDebug = process.env.LOG_LEVEL === 'debug' || process.env.NODE_ENV !== 'production'
      if (isDebug) {
        console.log('Fetching Linode stack scripts')
      }
      const headers: Record<string, string> = {
        ...(this.getHeaders() as Record<string, string>),
      };
      if (mineOnly) {
        // Use Linode's filter mechanism to fetch only owned StackScripts
        headers['X-Filter'] = JSON.stringify({ mine: true });
      }
      const response = await fetch(`${this.baseUrl}/linode/stackscripts`, {
        headers,
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
        console.log('Fetched Linode stack scripts:', data.data.length)
      }
      return data.data.map((stackscript: any) => ({
        id: stackscript.id,
        label: stackscript.label,
        description: stackscript.description,
        images: stackscript.images,
        is_public: stackscript.is_public,
        created: stackscript.created,
        updated: stackscript.updated,
        rev_note: stackscript.rev_note,
        script: stackscript.script,
        user_defined_fields: stackscript.user_defined_fields || [],
        deployments_active: stackscript.deployments_active,
        deployments_total: stackscript.deployments_total,
        // expose mine flag when available so callers can see ownership
        mine: stackscript.mine === true,
      }));
    } catch (error) {
      console.error('Error fetching Linode stack scripts:', error);
      throw error;
    }
  }

  /**
   * Create a new StackScript
   */
  async createStackScript(req: CreateStackScriptRequest): Promise<LinodeStackScript> {
    try {
      if (!this.apiToken) throw new Error('Linode API token not configured');
      const body: any = {
        label: req.label,
        script: req.script,
        images: req.images,
        is_public: req.is_public ?? false,
        rev_note: req.rev_note ?? 'Initial version created via ContainerStacks',
        description: req.description ?? req.label,
        user_defined_fields: req.user_defined_fields ?? [],
      };
      const response = await fetch(`${this.baseUrl}/linode/stackscripts`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const txt = await response.text().catch(() => '');
        throw new Error(`Linode API error (create StackScript): ${response.status} ${response.statusText} ${txt}`);
      }
      const data = await response.json();
      return data as LinodeStackScript;
    } catch (error) {
      console.error('Error creating Linode StackScript:', error);
      throw error;
    }
  }

  /**
   * Update an existing StackScript by id
   */
  async updateStackScript(id: number, req: Partial<CreateStackScriptRequest>): Promise<LinodeStackScript> {
    try {
      if (!this.apiToken) throw new Error('Linode API token not configured');
      const body: any = { ...req };
      const response = await fetch(`${this.baseUrl}/linode/stackscripts/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const txt = await response.text().catch(() => '');
        throw new Error(`Linode API error (update StackScript): ${response.status} ${response.statusText} ${txt}`);
      }
      const data = await response.json();
      return data as LinodeStackScript;
    } catch (error) {
      console.error('Error updating Linode StackScript:', error);
      throw error;
    }
  }

  /**
   * Find a StackScript by label (exact match)
   */
  async findStackScriptByLabel(label: string): Promise<LinodeStackScript | null> {
    const scripts = await this.getLinodeStackScripts();
    const match = scripts.find(s => String(s.label).trim().toLowerCase() === String(label).trim().toLowerCase());
    return match || null;
  }

  /**
   * Fetch a single StackScript by ID
   */
  async getStackScript(stackscriptId: number): Promise<LinodeStackScript | null> {
    try {
      if (!this.apiToken) {
        throw new Error('Linode API token not configured');
      }
      const response = await fetch(`${this.baseUrl}/linode/stackscripts/${stackscriptId}`, {
        headers: this.getHeaders(),
      });
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const txt = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${txt}`);
      }

      const stackscript = await response.json();
      return {
        id: stackscript.id,
        username: stackscript.username,
        label: stackscript.label,
        description: stackscript.description,
        images: stackscript.images,
        is_public: stackscript.is_public,
        created: stackscript.created,
        updated: stackscript.updated,
        rev_note: stackscript.rev_note,
        script: stackscript.script,
        user_defined_fields: stackscript.user_defined_fields || [],
        deployments_active: stackscript.deployments_active,
        deployments_total: stackscript.deployments_total,
      };
    } catch (error) {
      console.error(`Error fetching StackScript ${stackscriptId}:`, error);
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

  /**
   * Resize a Linode instance
   */
  async resizeLinodeInstance(instanceId: number, type: string): Promise<void> {
    try {
      if (!this.apiToken) throw new Error('Linode API token not configured');
      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/resize`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ type }),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`);
      }
    } catch (error) {
      console.error('Error resizing Linode instance:', error);
      throw error;
    }
  }

  /**
   * Rebuild a Linode instance
   */
  async rebuildLinodeInstance(instanceId: number, params: { image: string; root_pass: string; authorized_keys?: string[] }): Promise<LinodeInstance> {
    try {
      if (!this.apiToken) throw new Error('Linode API token not configured');
      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/rebuild`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(params),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error rebuilding Linode instance:', error);
      throw error;
    }
  }

  /**
   * Boot Linode into rescue mode
   */
  async rescueLinodeInstance(instanceId: number, devices?: any): Promise<void> {
    try {
      if (!this.apiToken) throw new Error('Linode API token not configured');
      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/rescue`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ devices }),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`);
      }
    } catch (error) {
      console.error('Error entering rescue mode:', error);
      throw error;
    }
  }

  /**
   * Clone a Linode instance
   */
  async cloneLinodeInstance(instanceId: number, params: { region?: string; type?: string; label?: string; disks?: number[]; configs?: number[] }): Promise<LinodeInstance> {
    try {
      if (!this.apiToken) throw new Error('Linode API token not configured');
      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/clone`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(params),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error cloning Linode instance:', error);
      throw error;
    }
  }

  /**
   * Migrate a Linode instance
   */
  async migrateLinodeInstance(instanceId: number, params?: { region?: string; placement_group?: { id: number } }): Promise<void> {
    try {
      if (!this.apiToken) throw new Error('Linode API token not configured');
      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/migrate`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(params || {}),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`);
      }
    } catch (error) {
      console.error('Error migrating Linode instance:', error);
      throw error;
    }
  }

  /**
   * Mutate/upgrade a Linode instance
   */
  async mutateLinodeInstance(instanceId: number): Promise<void> {
    try {
      if (!this.apiToken) throw new Error('Linode API token not configured');
      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/mutate`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`);
      }
    } catch (error) {
      console.error('Error mutating Linode instance:', error);
      throw error;
    }
  }

  /**
   * Reset root password for a Linode instance
   */
  async resetLinodePassword(instanceId: number, rootPass: string): Promise<void> {
    try {
      if (!this.apiToken) throw new Error('Linode API token not configured');
      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/password`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ root_pass: rootPass }),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`);
      }
    } catch (error) {
      console.error('Error resetting Linode password:', error);
      throw error;
    }
  }

  /**
   * Get Linode instance statistics
   */
  async getLinodeStats(instanceId: number): Promise<any> {
    try {
      if (!this.apiToken) throw new Error('Linode API token not configured');
      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/stats`, {
        headers: this.getHeaders(),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching Linode stats:', error);
      throw error;
    }
  }

  /**
   * Get Linode instance transfer data
   */
  async getLinodeTransfer(instanceId: number): Promise<any> {
    try {
      if (!this.apiToken) throw new Error('Linode API token not configured');
      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/transfer`, {
        headers: this.getHeaders(),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching Linode transfer:', error);
      throw error;
    }
  }

  /**
   * List Linode backups
   */
  async getLinodeBackups(instanceId: number): Promise<any> {
    try {
      if (!this.apiToken) throw new Error('Linode API token not configured');
      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/backups`, {
        headers: this.getHeaders(),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching Linode backups:', error);
      throw error;
    }
  }

  /**
   * Enable backups for a Linode instance
   */
  async enableLinodeBackups(instanceId: number): Promise<void> {
    try {
      if (!this.apiToken) throw new Error('Linode API token not configured');
      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/backups/enable`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`);
      }
    } catch (error) {
      console.error('Error enabling Linode backups:', error);
      throw error;
    }
  }

  /**
   * Cancel backups for a Linode instance
   */
  async cancelLinodeBackups(instanceId: number): Promise<void> {
    try {
      if (!this.apiToken) throw new Error('Linode API token not configured');
      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/backups/cancel`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`);
      }
    } catch (error) {
      console.error('Error canceling Linode backups:', error);
      throw error;
    }
  }

  /**
   * Create a snapshot backup
   */
  async createLinodeSnapshot(instanceId: number, label: string): Promise<any> {
    try {
      if (!this.apiToken) throw new Error('Linode API token not configured');
      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/backups`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ label }),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating Linode snapshot:', error);
      throw error;
    }
  }

  /**
   * Restore a backup
   */
  async restoreLinodeBackup(instanceId: number, backupId: number, params?: { linode_id?: number; overwrite?: boolean }): Promise<void> {
    try {
      if (!this.apiToken) throw new Error('Linode API token not configured');
      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/backups/${backupId}/restore`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(params || {}),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`);
      }
    } catch (error) {
      console.error('Error restoring Linode backup:', error);
      throw error;
    }
  }

  /**
   * List Linode disks
   */
  async getLinodeDisks(instanceId: number): Promise<any[]> {
    try {
      if (!this.apiToken) throw new Error('Linode API token not configured');
      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/disks`, {
        headers: this.getHeaders(),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`);
      }
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching Linode disks:', error);
      throw error;
    }
  }

  /**
   * Create a Linode disk
   */
  async createLinodeDisk(instanceId: number, params: { label: string; size: number; filesystem?: string; image?: string }): Promise<any> {
    try {
      if (!this.apiToken) throw new Error('Linode API token not configured');
      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/disks`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(params),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating Linode disk:', error);
      throw error;
    }
  }

  /**
   * Delete a Linode disk
   */
  async deleteLinodeDisk(instanceId: number, diskId: number): Promise<void> {
    try {
      if (!this.apiToken) throw new Error('Linode API token not configured');
      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/disks/${diskId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`);
      }
    } catch (error) {
      console.error('Error deleting Linode disk:', error);
      throw error;
    }
  }

  /**
   * Resize a Linode disk
   */
  async resizeLinodeDisk(instanceId: number, diskId: number, size: number): Promise<void> {
    try {
      if (!this.apiToken) throw new Error('Linode API token not configured');
      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/disks/${diskId}/resize`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ size }),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`);
      }
    } catch (error) {
      console.error('Error resizing Linode disk:', error);
      throw error;
    }
  }

  /**
   * List Linode configuration profiles
   */
  async getLinodeConfigs(instanceId: number): Promise<any[]> {
    try {
      if (!this.apiToken) throw new Error('Linode API token not configured');
      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/configs`, {
        headers: this.getHeaders(),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`);
      }
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching Linode configs:', error);
      throw error;
    }
  }

  /**
   * Get Linode networking information
   */
  async getLinodeIPs(instanceId: number): Promise<any> {
    try {
      if (!this.apiToken) throw new Error('Linode API token not configured');
      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/ips`, {
        headers: this.getHeaders(),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching Linode IPs:', error);
      throw error;
    }
  }

  /**
   * Allocate a new IPv4 address
   */
  async allocateLinodeIP(instanceId: number, params: { type: 'ipv4'; public: boolean }): Promise<any> {
    try {
      if (!this.apiToken) throw new Error('Linode API token not configured');
      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/ips`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(params),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error allocating Linode IP:', error);
      throw error;
    }
  }

  /**
   * List Linode volumes
   */
  async getLinodeVolumes(instanceId: number): Promise<any[]> {
    try {
      if (!this.apiToken) throw new Error('Linode API token not configured');
      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/volumes`, {
        headers: this.getHeaders(),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`);
      }
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching Linode volumes:', error);
      throw error;
    }
  }

  /**
   * Update a Linode instance
   */
  async updateLinodeInstance(instanceId: number, params: Partial<{ label: string; tags: string[]; watchdog_enabled: boolean; alerts?: any }>): Promise<LinodeInstance> {
    try {
      if (!this.apiToken) throw new Error('Linode API token not configured');
      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(params),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error updating Linode instance:', error);
      throw error;
    }
  }
}

export const linodeService = new LinodeService();