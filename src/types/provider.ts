/**
 * Provider Types
 * Type definitions for multi-provider VPS support
 */

export type ProviderType = 'linode' | 'digitalocean' | 'aws' | 'gcp';

export interface Provider {
  id: string;
  name: string;
  type: ProviderType;
  active: boolean;
  configuration: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ProviderPlan {
  id: string;
  label: string;
  vcpus: number;
  memory: number; // MB
  disk: number; // GB
  transfer: number; // GB
  price: {
    hourly: number;
    monthly: number;
  };
  backup_price?: {
    hourly: number;
    monthly: number;
    // DigitalOcean-specific: separate pricing for daily vs weekly
    hourly_weekly?: number;
    monthly_weekly?: number;
    hourly_daily?: number;
    monthly_daily?: number;
  };
  regions: string[];
}

export interface ProviderImage {
  id: string;
  slug: string;
  name: string;
  distribution: string;
  version?: string;
  description?: string;
  minDiskSize?: number;
}

export interface ProviderRegion {
  id: string;
  name: string;
  slug: string;
  available: boolean;
  features: string[];
}
