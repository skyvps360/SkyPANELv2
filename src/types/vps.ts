import type { ProviderType } from './provider';

export interface VPSListRowSelection {
  [id: string]: boolean;
}

export interface VPSInstance {
  id: string;
  label: string;
  status: "running" | "stopped" | "provisioning" | "rebooting" | "error" | "restoring" | "backing_up";
  type: string;
  region: string;
  regionLabel?: string;
  image: string;
  ipv4: string[];
  ipv6: string;
  created: string;
  provider_id?: string | null;
  provider_type?: ProviderType | null;
  specs: {
    vcpus: number;
    memory: number;
    disk: number;
    transfer: number;
  };
  stats: {
    cpu: number;
    memory: number;
    disk: number;
    network: {
      in: number;
      out: number;
    };
    uptime: string;
  };
  pricing: {
    hourly: number;
    monthly: number;
  };
  progress?: {
    percent: number | null;
    action: string | null;
    status: string | null;
    message: string | null;
    created: string | null;
  };
}

export interface CreateVPSForm {
  provider_id: string;
  provider_type: ProviderType;
  label: string;
  type: string;
  region: string;
  image: string;
  rootPassword: string;
  sshKeys: string[];
  backups: boolean;
  privateIP: boolean;
  // DigitalOcean-specific
  monitoring?: boolean;
  ipv6?: boolean;
  vpc_uuid?: string;
  // Marketplace/StackScript
  appSlug?: string;
  appData?: Record<string, any>;
  stackscriptId?: number;
  stackscriptData?: Record<string, any>;
}
