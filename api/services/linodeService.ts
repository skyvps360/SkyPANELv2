/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Linode API Service for ContainerStacks
 * Handles integration with Linode API for VPS management
 */

import { config } from '../config/index.js';
import { promises as dns } from 'dns';

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

export type LinodeMetricTuple = [number, number];

export interface LinodeInstanceStatsSeries {
  cpu?: LinodeMetricTuple[];
  io?: {
    io?: LinodeMetricTuple[];
    swap?: LinodeMetricTuple[];
  };
  netv4?: {
    in?: LinodeMetricTuple[];
    out?: LinodeMetricTuple[];
    private_in?: LinodeMetricTuple[];
    private_out?: LinodeMetricTuple[];
  };
  netv6?: {
    in?: LinodeMetricTuple[];
    out?: LinodeMetricTuple[];
    private_in?: LinodeMetricTuple[];
    private_out?: LinodeMetricTuple[];
  };
}

export interface LinodeInstanceStatsResponse extends LinodeInstanceStatsSeries {
  title?: string;
  data?: LinodeInstanceStatsSeries | null;
}

export type LinodeTransferUsage =
  | number
  | {
      total?: number;
      in?: number;
      out?: number;
      ingress?: number;
      egress?: number;
      inbound?: number;
      outbound?: number;
      bytes?: number;
      amount?: number;
      used?: number;
    };

export interface LinodeInstanceTransferResponse {
  used: LinodeTransferUsage;
  quota: number;
  billable: number;
}

export interface AccountTransferResponse {
  used: number;
  quota: number;
  billable: number;
  region_transfers?: Array<{
    id?: string;
    used?: number;
    quota?: number;
    billable?: number;
  }>;
}

export interface LinodeBackupDisk {
  label?: string;
  size?: number;
  filesystem?: string;
}

export interface LinodeBackupSummary {
  id?: number;
  label?: string | null;
  type?: string;
  status?: string;
  created?: string;
  updated?: string;
  finished?: string | null;
  available?: boolean;
  configs?: string[];
  disks?: LinodeBackupDisk[];
}

export interface LinodeSnapshotCollection {
  current?: LinodeBackupSummary | null;
  in_progress?: LinodeBackupSummary | null;
}

export interface LinodeInstanceBackupsResponse {
  automatic?: LinodeBackupSummary[];
  snapshot?: LinodeSnapshotCollection | null;
}

export interface LinodeIPsResponse {
  ipv4?: Record<string, any[]>;
  ipv6?: Record<string, any>;
}

export interface LinodeFirewallsResponse {
  data?: any[];
}

export interface LinodeInstanceConfigsResponse {
  data?: any[];
}

export interface LinodeEventsResponse {
  data?: any[];
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
   * Update a Linode instance (e.g., label/hostname)
   */
  async updateLinodeInstance(instanceId: number, updateData: { label?: string; [key: string]: any }): Promise<LinodeInstance> {
    try {
      if (!this.apiToken) {
        throw new Error('Linode API token not configured');
      }

      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Linode API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating Linode instance:', error);
      throw error;
    }
  }

  /**
   * Fetch runtime statistics for a specific instance (last 24 hours)
   */
  async getLinodeInstanceStats(instanceId: number): Promise<LinodeInstanceStatsResponse> {
    try {
      if (!this.apiToken) {
        throw new Error('Linode API token not configured');
      }

      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/stats`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`.trim());
      }

      const data = await response.json();
      return data as LinodeInstanceStatsResponse;
    } catch (error) {
      console.error('Error fetching Linode instance stats:', error);
      throw error;
    }
  }

  /**
   * Fetch current-month transfer usage for an instance
   */
  async getLinodeInstanceTransfer(instanceId: number): Promise<LinodeInstanceTransferResponse> {
    try {
      if (!this.apiToken) {
        throw new Error('Linode API token not configured');
      }

      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/transfer`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`.trim());
      }

      const data = await response.json();
      return data as LinodeInstanceTransferResponse;
    } catch (error) {
      console.error('Error fetching Linode transfer usage:', error);
      throw error;
    }
  }

  async getAccountTransfer(): Promise<AccountTransferResponse> {
    try {
      if (!this.apiToken) {
        throw new Error('Linode API token not configured');
      }

      const response = await fetch(`${this.baseUrl}/account/transfer`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`.trim());
      }

      const data = await response.json();
      return data as AccountTransferResponse;
    } catch (error) {
      console.error('Error fetching Linode account transfer usage:', error);
      throw error;
    }
  }

  /**
   * Fetch available backups for an instance
   */
  async getLinodeInstanceBackups(instanceId: number): Promise<LinodeInstanceBackupsResponse> {
    try {
      if (!this.apiToken) {
        throw new Error('Linode API token not configured');
      }

      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/backups`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`.trim());
      }

      const data = await response.json();
      return data as LinodeInstanceBackupsResponse;
    } catch (error) {
      console.error('Error fetching Linode backups:', error);
      throw error;
    }
  }

  async enableLinodeBackups(instanceId: number): Promise<void> {
    try {
      if (!this.apiToken) {
        throw new Error('API token not configured');
      }

      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/backups/enable`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        
        // Parse the response to check for specific error conditions
        let errorMessage = `API error: ${response.status} ${response.statusText}`;
        
        try {
          const errorData = JSON.parse(text);
          if (errorData.errors && Array.isArray(errorData.errors)) {
            const errorReasons = errorData.errors.map((err: any) => err.reason || '').join(' ');
            
            // Check for the 24-hour waiting period error and replace with generic message
            if (errorReasons.includes('Please wait 24 hours before reactivating backups')) {
              throw new Error('Please wait 24 hours before reactivating backups for this VPS instance');
            }
            
            // Remove any Linode branding from other error messages
            const sanitizedReasons = errorReasons.replace(/\bLinode\b/gi, 'VPS instance');
            if (sanitizedReasons.trim()) {
              errorMessage = sanitizedReasons;
            }
          }
        } catch (parseError) {
          // If we can't parse the JSON, fall back to sanitizing the raw text
          const sanitizedText = text.replace(/\bLinode\b/gi, 'VPS instance');
          if (sanitizedText.trim()) {
            errorMessage += ` ${sanitizedText}`;
          }
        }
        
        throw new Error(errorMessage.trim());
      }
    } catch (error) {
      console.error('Error enabling backups:', error);
      throw error;
    }
  }

  async cancelLinodeBackups(instanceId: number): Promise<void> {
    try {
      if (!this.apiToken) {
        throw new Error('API token not configured');
      }

      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/backups/cancel`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        
        // Parse the response to check for specific error conditions
        let errorMessage = `API error: ${response.status} ${response.statusText}`;
        
        try {
          const errorData = JSON.parse(text);
          if (errorData.errors && Array.isArray(errorData.errors)) {
            const errorReasons = errorData.errors.map((err: any) => err.reason || '').join(' ');
            
            // Remove any Linode branding from error messages
            const sanitizedReasons = errorReasons.replace(/\bLinode\b/gi, 'VPS instance');
            if (sanitizedReasons.trim()) {
              errorMessage = sanitizedReasons;
            }
          }
        } catch (parseError) {
          // If we can't parse the JSON, fall back to sanitizing the raw text
          const sanitizedText = text.replace(/\bLinode\b/gi, 'VPS instance');
          if (sanitizedText.trim()) {
            errorMessage += ` ${sanitizedText}`;
          }
        }
        
        throw new Error(errorMessage.trim());
      }
    } catch (error) {
      console.error('Error disabling backups:', error);
      throw error;
    }
  }

  async updateLinodeBackupSchedule(
    instanceId: number,
    schedule: { day?: string | null; window?: string | null }
  ): Promise<void> {
    try {
      if (!this.apiToken) {
        throw new Error('Linode API token not configured');
      }

      const scheduleFields: Record<string, unknown> = {};

      if (schedule.day !== undefined) {
        scheduleFields.day = schedule.day ?? null;
      }
      if (schedule.window !== undefined) {
        scheduleFields.window = schedule.window ?? null;
      }

      if (Object.keys(scheduleFields).length === 0) {
        return;
      }

      const payload = { backups: { schedule: scheduleFields } };

      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`.trim());
      }
    } catch (error) {
      console.error('Error updating Linode backup schedule:', error);
      throw error;
    }
  }

  async createLinodeBackup(instanceId: number, label?: string): Promise<Record<string, unknown>> {
    try {
      if (!this.apiToken) {
        throw new Error('Linode API token not configured');
      }

      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/backups`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(label ? { label } : {}),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`.trim());
      }

      const data = await response.json().catch(() => ({}));
      return data as Record<string, unknown>;
    } catch (error) {
      console.error('Error creating Linode backup snapshot:', error);
      throw error;
    }
  }

  async restoreLinodeBackup(
    instanceId: number,
    backupId: number,
    options: { overwrite?: boolean; targetInstanceId?: number } = {}
  ): Promise<void> {
    try {
      if (!this.apiToken) {
        throw new Error('Linode API token not configured');
      }

      const targetInstanceId = options.targetInstanceId ?? instanceId;
      const payload: Record<string, unknown> = {
        linode_id: targetInstanceId,
      };

      if (options.overwrite !== undefined) {
        payload.overwrite = Boolean(options.overwrite);
      }

      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/backups/${backupId}/restore`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`.trim());
      }
    } catch (error) {
      console.error('Error restoring Linode backup:', error);
      throw error;
    }
  }

  async getLinodeInstanceIPs(instanceId: number): Promise<LinodeIPsResponse> {
    try {
      if (!this.apiToken) {
        throw new Error('Linode API token not configured');
      }

      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/ips`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`.trim());
      }

      const data = await response.json();
      return data as LinodeIPsResponse;
    } catch (error) {
      console.error('Error fetching Linode IP assignments:', error);
      throw error;
    }
  }

  async getLinodeInstanceFirewalls(instanceId: number): Promise<LinodeFirewallsResponse> {
    try {
      if (!this.apiToken) {
        throw new Error('Linode API token not configured');
      }

      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/firewalls`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`.trim());
      }

      const data = await response.json();
      return data as LinodeFirewallsResponse;
    } catch (error) {
      console.error('Error fetching Linode firewalls:', error);
      throw error;
    }
  }

  async listFirewalls(): Promise<Record<string, unknown>[]> {
    try {
      if (!this.apiToken) {
        throw new Error('Linode API token not configured');
      }

      const pageSize = 100;
      let page = 1;
      let totalPages = 1;
      const results: Record<string, unknown>[] = [];

      while (page <= totalPages) {
        const response = await fetch(`${this.baseUrl}/networking/firewalls?page=${page}&page_size=${pageSize}`, {
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`.trim());
        }

        const payload = await response.json();
        const data = Array.isArray(payload?.data) ? payload.data : [];
        results.push(...(data as Record<string, unknown>[]));
        const pages = Number(payload?.pages ?? 1);
        totalPages = Number.isFinite(pages) && pages > 0 ? pages : 1;
        page += 1;
      }

      return results;
    } catch (error) {
      console.error('Error listing firewalls:', error);
      throw error;
    }
  }

  async getLinodeInstanceConfigs(instanceId: number): Promise<LinodeInstanceConfigsResponse> {
    try {
      if (!this.apiToken) {
        throw new Error('Linode API token not configured');
      }

      const response = await fetch(`${this.baseUrl}/linode/instances/${instanceId}/configs`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`.trim());
      }

      const data = await response.json();
      return data as LinodeInstanceConfigsResponse;
    } catch (error) {
      console.error('Error fetching Linode configuration profiles:', error);
      throw error;
    }
  }

  async getFirewallDevices(firewallId: number): Promise<Record<string, unknown>[]> {
    try {
      if (!this.apiToken) {
        throw new Error('Linode API token not configured');
      }

      const response = await fetch(`${this.baseUrl}/networking/firewalls/${firewallId}/devices`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`.trim());
      }

      const payload = await response.json();
      const devices = Array.isArray(payload?.data) ? payload.data : [];
      return devices as Record<string, unknown>[];
    } catch (error) {
      console.error(`Error fetching devices for firewall ${firewallId}:`, error);
      throw error;
    }
  }

  async attachFirewallToLinode(firewallId: number, instanceId: number): Promise<void> {
    try {
      if (!this.apiToken) {
        throw new Error('Linode API token not configured');
      }

      const response = await fetch(`${this.baseUrl}/networking/firewalls/${firewallId}/devices`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ type: 'linode', id: instanceId }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`.trim());
      }
    } catch (error) {
      console.error(`Error attaching firewall ${firewallId} to Linode ${instanceId}:`, error);
      throw error;
    }
  }

  async detachFirewallFromLinode(firewallId: number, deviceId: number): Promise<void> {
    try {
      if (!this.apiToken) {
        throw new Error('Linode API token not configured');
      }

      const response = await fetch(`${this.baseUrl}/networking/firewalls/${firewallId}/devices/${deviceId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`.trim());
      }
    } catch (error) {
      console.error(`Error detaching firewall ${firewallId} device ${deviceId}:`, error);
      throw error;
    }
  }

  async getLinodeInstanceEvents(instanceId: number, params: { page?: number; pageSize?: number } = {}): Promise<LinodeEventsResponse> {
    try {
      if (!this.apiToken) {
        throw new Error('Linode API token not configured');
      }

      const page = params.page && params.page > 0 ? params.page : 1;
      const pageSize = params.pageSize && params.pageSize >= 25 ? Math.min(params.pageSize, 100) : 25;

      const search = new URLSearchParams();
      search.set('page', String(page));
      search.set('page_size', String(pageSize));

      const filter = {
        '+order': 'desc',
        '+order_by': 'created',
        'entity.type': 'linode',
        'entity.id': instanceId,
      };

      const headers = {
        ...this.getHeaders(),
        'X-Filter': JSON.stringify(filter),
      };

      const response = await fetch(`${this.baseUrl}/account/events?${search.toString()}`, {
        headers,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Linode API error: ${response.status} ${response.statusText} ${text}`.trim());
      }

      const data = await response.json();
      return data as LinodeEventsResponse;
    } catch (error) {
      console.error('Error fetching Linode events:', error);
      throw error;
    }
  }

  async updateIPAddressReverseDNS(address: string, rdns: string | null): Promise<Record<string, unknown>> {
    try {
      if (!this.apiToken) {
        throw new Error('Linode API token not configured');
      }

      const response = await fetch(`${this.baseUrl}/networking/ips/${encodeURIComponent(address)}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ rdns }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        // Try to parse Linode's error structure for a clearer message
        try {
          const data = JSON.parse(text);
          if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
            const reason = data.errors.map((e: any) => e?.reason || '').join(' ').trim();
            const sanitized = reason.replace(/\bLinode\b/gi, 'VPS provider');
            if (sanitized) {
              throw new Error(sanitized);
            }
          }
        } catch {
          // fall through to generic error below
        }
        throw new Error(`Linode API error: ${response.status} ${response.statusText}`);
      }

      const payload = await response.json().catch(() => ({}));
      return payload as Record<string, unknown>;
    } catch (error) {
      console.error(`Error updating rDNS for ${address}:`, error);
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
   * Set up custom rDNS for a newly created VPS instance (DEPRECATED - use setupCustomRDNSAsync)
   * This will set the rDNS to use skyvps360.xyz domain instead of linodeusercontent.com
   */
  async setupCustomRDNS(instanceId: number): Promise<void> {
    console.warn('setupCustomRDNS is deprecated, use setupCustomRDNSAsync instead');
    return this.setupCustomRDNSAsync(instanceId, `instance-${instanceId}`);
  }

  /**
   * Set up custom rDNS for a newly created VPS instance (Async Background Version)
   * This will set the rDNS to use skyvps360.xyz domain instead of linodeusercontent.com
   * This method is designed to run in the background without blocking VPS creation
   */
  async setupCustomRDNSAsync(instanceId: number, label: string = `instance-${instanceId}`): Promise<void> {
    const logPrefix = `[rDNS-${instanceId}]`;
    
    try {
      if (!this.apiToken) {
        throw new Error('Linode API token not configured');
      }

      console.log(`${logPrefix} Starting background rDNS setup for VPS ${label}`);

      // Wait for VPS to be in running state before attempting rDNS setup
      const maxStatusAttempts = 20; // up to ~10 minutes
      const statusIntervalMs = 30000; // 30 seconds
      let instance: LinodeInstance | null = null;
      
      for (let attempt = 1; attempt <= maxStatusAttempts; attempt++) {
        try {
          instance = await this.getLinodeInstance(instanceId);
          console.log(`${logPrefix} VPS status check ${attempt}/${maxStatusAttempts}: ${instance.status}`);
          
          if (instance.status === 'running') {
            console.log(`${logPrefix} VPS is running, proceeding with rDNS setup`);
            break;
          }
          
          if (instance.status === 'offline' || instance.status === 'stopped') {
            console.warn(`${logPrefix} VPS is ${instance.status}, skipping rDNS setup`);
            return;
          }
          
          // Wait before next status check
          await new Promise(res => setTimeout(res, statusIntervalMs));
        } catch (statusErr) {
          console.warn(`${logPrefix} Failed to check VPS status (attempt ${attempt}):`, statusErr);
          if (attempt === maxStatusAttempts) {
            throw new Error('VPS status check failed after maximum attempts');
          }
          await new Promise(res => setTimeout(res, statusIntervalMs));
        }
      }

      if (!instance || instance.status !== 'running') {
        throw new Error(`VPS not in running state after ${maxStatusAttempts} attempts`);
      }
      
      if (!instance.ipv4 || instance.ipv4.length === 0) {
        console.warn(`${logPrefix} No IPv4 addresses found, skipping rDNS setup`);
        return;
      }

      // Get the primary public IPv4 address (first in the array)
      const primaryIPv4 = instance.ipv4[0];
      
      // Create the custom rDNS hostname: 0.0.0.0.ip.rev.skyvps360.xyz
      const reversedIP = primaryIPv4.split('.').reverse().join('.');
      const customRDNS = `${reversedIP}.ip.rev.skyvps360.xyz`;

      console.log(`${logPrefix} Setting up custom rDNS for ${primaryIPv4}: ${customRDNS}`);

      // Directly update the rDNS (same approach as manual editing)
      // No forward DNS check needed - Linode API handles this internally
      await this.updateIPAddressReverseDNS(primaryIPv4, customRDNS);

      console.log(`${logPrefix} Successfully set custom rDNS for VPS ${label} (${primaryIPv4}) to ${customRDNS}`);
    } catch (error) {
      console.error(`${logPrefix} Error setting up custom rDNS for VPS ${label}:`, error);
      // Don't throw the error - we don't want rDNS setup failure to affect anything else
      // The VPS is still functional without custom rDNS
    }
  }
}

export const linodeService = new LinodeService();