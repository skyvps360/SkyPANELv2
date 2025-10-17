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
}
