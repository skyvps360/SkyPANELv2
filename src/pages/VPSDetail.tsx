import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  type LucideIcon,
  ArrowLeft,
  RefreshCw,
  Power,
  PowerOff,
  RotateCcw,
  Server,
  Cpu,
  HardDrive,
  Network,
  ShieldCheck,
  Activity,
  AlertTriangle,
  Globe2,
  Shield,
  Cog
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

interface MetricPoint {
  timestamp: number;
  value: number;
}

interface MetricSummary {
  average: number;
  peak: number;
  last: number;
}

interface MetricSeries {
  series: MetricPoint[];
  summary: MetricSummary;
  unit: 'percent' | 'bitsPerSecond' | 'blocksPerSecond';
}

interface MetricGroup {
  timeframe: { start: number | null; end: number | null };
  cpu?: MetricSeries;
  network?: {
    inbound?: MetricSeries;
    outbound?: MetricSeries;
    privateIn?: MetricSeries;
    privateOut?: MetricSeries;
  };
  io?: {
    read?: MetricSeries;
    swap?: MetricSeries;
  };
}

interface TransferInfo {
  usedGb: number;
  quotaGb: number;
  billableGb: number;
  utilizationPercent: number;
}

interface BackupSummary {
  id: number | null;
  label: string | null;
  type: string | null;
  status: string | null;
  created: string | null;
  finished: string | null;
  updated: string | null;
  available: boolean;
  totalSizeMb: number;
  configs: string[];
}

interface BackupsInfo {
  enabled: boolean;
  available: boolean;
  schedule: { day: string | null; window: string | null } | null;
  lastSuccessful: string | null;
  automatic: BackupSummary[];
  snapshot: BackupSummary | null;
  snapshotInProgress: BackupSummary | null;
}

interface BackupPricing {
  monthly: number;
  hourly: number;
  currency: string;
}

interface IPv4Address {
  address: string;
  type: string | null;
  public: boolean;
  rdns: string | null;
  gateway: string | null;
  subnetMask: string | null;
  prefix: number | null;
  region: string | null;
}

interface IPv6Assignment {
  address: string | null;
  prefix: number | null;
  rdns: string | null;
  region: string | null;
  type: string | null;
  gateway: string | null;
}

interface IPv6Range {
  range: string | null;
  prefix: number | null;
  region: string | null;
  routeTarget: string | null;
  type: string | null;
}

interface NetworkingInfo {
  ipv4: {
    public: IPv4Address[];
    private: IPv4Address[];
    shared: IPv4Address[];
    reserved: IPv4Address[];
  };
  ipv6: {
    linkLocal: IPv6Assignment | null;
    slaac: IPv6Assignment | null;
    global: IPv6Range[];
    ranges: IPv6Range[];
    pools: IPv6Range[];
  } | null;
}

interface FirewallRule {
  action?: string;
  protocol?: string;
  ports?: string;
  label?: string;
  description?: string | null;
  addresses?: {
    ipv4?: string[];
    ipv6?: string[];
  };
}

interface FirewallSummary {
  id: number;
  label: string | null;
  status: string | null;
  tags: string[];
  created: string | null;
  updated: string | null;
  pendingChanges: boolean;
  rules: {
    inbound: FirewallRule[];
    outbound: FirewallRule[];
  } | null;
}

interface ProviderConfigSummary {
  id: number;
  label: string | null;
  kernel: string | null;
  rootDevice: string | null;
  runLevel: string | null;
  comments: string | null;
  virtMode?: string | null;
  memoryLimit?: number | null;
  interfaces: unknown[];
  helpers: Record<string, unknown> | null;
  created: string | null;
  updated: string | null;
}

interface InstanceEventSummary {
  id: number;
  action: string;
  status: string | null;
  message: string | null;
  created: string | null;
  username: string | null;
  percentComplete: number | null;
  entityLabel: string | null;
}

type TabId = 'overview' | 'backups' | 'networking' | 'activity' | 'firewall' | 'configurations';

interface TabDefinition {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

interface PlanSpecs {
  vcpus: number;
  memory: number;
  disk: number;
  transfer: number;
}

interface PlanPricing {
  hourly: number;
  monthly: number;
  currency: string;
}

interface PlanInfo {
  id: string | null;
  name: string | null;
  providerPlanId: string | null;
  specs: PlanSpecs;
  pricing: PlanPricing;
}

interface ProviderInfo {
  id: number;
  label: string;
  status: string;
  region: string;
  image: string;
  ipv4: string[];
  ipv6?: string;
  created: string;
  updated: string;
  specs: {
    vcpus: number;
    memory: number;
    disk: number;
    transfer: number;
  };
}

interface VpsInstanceDetail {
  id: string;
  label: string;
  status: string;
  ipAddress: string | null;
  providerInstanceId: string;
  createdAt: string | null;
  updatedAt: string | null;
  region: string | null;
  regionLabel: string | null;
  configuration: Record<string, unknown>;
  image: string | null;
  plan: PlanInfo;
  provider: ProviderInfo | null;
  metrics: MetricGroup | null;
  transfer: TransferInfo | null;
  backups: BackupsInfo | null;
  networking: NetworkingInfo | null;
  firewalls: FirewallSummary[];
  providerConfigs: ProviderConfigSummary[];
  activity: InstanceEventSummary[];
  backupPricing: BackupPricing | null;
}

interface VpsDetailResponse {
  instance: VpsInstanceDetail;
}

const statusStyles: Record<string, string> = {
  running: 'border border-green-200 text-green-700 bg-green-100 dark:border-green-900/60 dark:text-green-200 dark:bg-green-900/30',
  stopped: 'border border-gray-200 text-gray-700 bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:bg-gray-800/60',
  provisioning: 'border border-blue-200 text-blue-700 bg-blue-100 dark:border-blue-900/60 dark:text-blue-200 dark:bg-blue-900/30',
  rebooting: 'border border-amber-200 text-amber-700 bg-amber-100 dark:border-amber-900/60 dark:text-amber-200 dark:bg-amber-900/30',
  error: 'border border-red-200 text-red-700 bg-red-100 dark:border-red-900/60 dark:text-red-200 dark:bg-red-900/30',
  unknown: 'border border-slate-200 text-slate-700 bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:bg-slate-800/60',
};

const formatDateTime = (value: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

const formatRelativeTime = (value: string | null): string => {
  if (!value) return '';
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '';
  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? '' : 's'} ago`;
};

const formatMemory = (memoryMb: number): string => {
  if (!Number.isFinite(memoryMb) || memoryMb <= 0) return '—';
  if (memoryMb >= 1024) {
    return `${(memoryMb / 1024).toFixed(1)} GB`;
  }
  return `${memoryMb} MB`;
};

const formatStorage = (disk: number): string => {
  if (!Number.isFinite(disk) || disk <= 0) return '—';
  const diskGb = disk >= 1024 ? disk / 1024 : disk;
  return `${diskGb % 1 === 0 ? diskGb.toFixed(0) : diskGb.toFixed(1)} GB`;
};

const formatTransferAllowance = (transferGb: number): string => {
  if (!Number.isFinite(transferGb) || transferGb <= 0) return '—';
  return `${transferGb} GB`;
};

const formatCurrency = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return '$0.00';
  return `$${value.toFixed(2)}`;
};

const formatPercent = (value: number): string => `${Math.max(0, value).toFixed(1)}%`;

const formatNetworkRate = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return '0 Mbps';
  const mbps = value / 1_000_000;
  return `${mbps.toFixed(mbps >= 10 ? 1 : 2)} Mbps`;
};

const formatBlocks = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return '0 blk/s';
  return `${value.toFixed(value >= 10 ? 1 : 2)} blk/s`;
};

const formatSizeFromMb = (sizeMb: number): string => {
  if (!Number.isFinite(sizeMb) || sizeMb <= 0) return '—';
  if (sizeMb >= 1024) {
    return `${(sizeMb / 1024).toFixed(2)} GB`;
  }
  return `${sizeMb.toFixed(0)} MB`;
};

const statusActionLabel: Record<'boot' | 'shutdown' | 'reboot', string> = {
  boot: 'Power On',
  shutdown: 'Power Off',
  reboot: 'Reboot',
};

const VPSDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();

  const [detail, setDetail] = useState<VpsInstanceDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<'boot' | 'shutdown' | 'reboot' | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const tabDefinitions = useMemo<TabDefinition[]>(() => [
    { id: 'overview', label: 'Overview', icon: Server },
    { id: 'backups', label: 'Backups', icon: ShieldCheck },
    { id: 'networking', label: 'Networking', icon: Globe2 },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'firewall', label: 'Firewalls', icon: Shield },
    { id: 'configurations', label: 'Configurations', icon: Cog },
  ], []);

  const backupPricing = useMemo<BackupPricing | null>(() => {
    if (detail?.backupPricing) {
      return detail.backupPricing;
    }
    const baseMonthly = detail?.plan?.pricing?.monthly ?? 0;
    if (!Number.isFinite(baseMonthly) || baseMonthly <= 0) {
      return null;
    }
    const estimatedMonthly = Number(baseMonthly) * 0.2;
    return {
      monthly: estimatedMonthly,
      hourly: estimatedMonthly / 730,
      currency: detail?.plan?.pricing?.currency ?? 'USD',
    };
  }, [detail?.backupPricing, detail?.plan?.pricing?.currency, detail?.plan?.pricing?.monthly]);

  const formatEventAction = (value: string | null | undefined): string => {
    if (!value) return '—';
    return value
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  const formatStatusLabel = (value: string | null | undefined): string => {
    if (!value) return 'Unknown';
    return value
      .replace(/_/g, ' ')
      .split(' ')
      .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  };

  const summarizeFirewallRule = (rule: FirewallRule): string => {
    const action = (rule.action || 'ACCEPT').toUpperCase();
    const protocol = rule.protocol ? rule.protocol.toUpperCase() : 'ANY';
    const ports = rule.ports ? rule.ports : 'all ports';
    return `${action} ${protocol} ${ports}`;
  };

  const statusBadgeClasses = (status: string | null | undefined): string => {
    switch (status) {
      case 'completed':
      case 'finished':
        return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200';
      case 'failed':
        return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200';
      case 'in_progress':
      case 'started':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200';
      case 'scheduled':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300';
    }
  };

  const ipv4Categories = useMemo(() => {
    const ipv4 = detail?.networking?.ipv4;
    return [
      { label: 'Public IPv4', accent: 'text-emerald-500', addresses: ipv4?.public ?? [] },
      { label: 'Private IPv4', accent: 'text-purple-500', addresses: ipv4?.private ?? [] },
      { label: 'Shared IPv4', accent: 'text-blue-500', addresses: ipv4?.shared ?? [] },
      { label: 'Reserved IPv4', accent: 'text-amber-500', addresses: ipv4?.reserved ?? [] },
    ];
  }, [detail?.networking?.ipv4]);

  const ipv6Info = detail?.networking?.ipv6 ?? null;
  const firewallSummaries = detail?.firewalls ?? [];
  const eventFeed = detail?.activity ?? [];
  const providerConfigs = detail?.providerConfigs ?? [];

  const loadData = useCallback(async (options?: { silent?: boolean }) => {
    if (!id) return;
    const silent = options?.silent === true;
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetch(`/api/vps/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error((payload as { error?: string }).error || 'Failed to load instance');
      }
      const parsed = payload as VpsDetailResponse;
      if (!parsed || !parsed.instance) {
        throw new Error('Malformed response from server');
      }
      setDetail(parsed.instance);
    } catch (err) {
      console.error('Failed to load VPS instance detail:', err);
      const message = err instanceof Error ? err.message : 'Failed to load instance';
      setError(message);
      toast.error(message);
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [id, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const performAction = useCallback(async (action: 'boot' | 'shutdown' | 'reboot') => {
    if (!detail) return;
    setActionLoading(action);
    try {
      const response = await fetch(`/api/vps/${detail.id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `Failed to ${statusActionLabel[action].toLowerCase()} instance`);
      }
      toast.success(`${statusActionLabel[action]} request sent`);
      await loadData({ silent: true });
    } catch (err) {
      console.error(`Failed to ${action} VPS instance:`, err);
      const message = err instanceof Error ? err.message : `Failed to ${action} instance`;
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  }, [detail, loadData, token]);

  const allowStart = detail?.status === 'stopped';
  const allowStop = detail?.status === 'running';
  const allowReboot = detail?.status === 'running' || detail?.status === 'rebooting';

  const cpuSummary = detail?.metrics?.cpu?.summary;
  const inboundSummary = detail?.metrics?.network?.inbound?.summary;
  const outboundSummary = detail?.metrics?.network?.outbound?.summary;
  const ioSummary = detail?.metrics?.io?.read?.summary;
  const swapSummary = detail?.metrics?.io?.swap?.summary;

  const timeframeLabel = useMemo(() => {
    if (!detail?.metrics?.timeframe?.start || !detail.metrics.timeframe.end) return null;
    const start = new Date(detail.metrics.timeframe.start).toLocaleString();
    const end = new Date(detail.metrics.timeframe.end).toLocaleString();
    return `${start} → ${end}`;
  }, [detail?.metrics?.timeframe?.end, detail?.metrics?.timeframe?.start]);

  if (loading && !detail) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="space-y-6 animate-pulse">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-72 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
            <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
            <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900/60 rounded-2xl shadow-sm p-8 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">Unable to load server details</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">{error}</p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => loadData()}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
              <Link
                to="/vps"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to instances
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3 text-sm text-blue-600 dark:text-blue-400">
              <Link to="/vps" className="inline-flex items-center gap-1 hover:underline">
                <ArrowLeft className="h-4 w-4" />
                Back to VPS
              </Link>
              <span className="text-gray-400 dark:text-gray-500">/</span>
              <span className="text-gray-600 dark:text-gray-300">{detail?.id}</span>
            </div>
            <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold text-gray-900 dark:text-white">
              <Server className="h-8 w-8 text-blue-500" />
              {detail?.label || 'Cloud Instance'}
            </h1>
            {detail?.status && (
              <div className="mt-3 inline-flex items-center gap-2">
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${statusStyles[detail.status] || statusStyles.unknown}`}>
                  <span className="inline-block h-2 w-2 rounded-full bg-current"></span>
                  {detail.status.toUpperCase()}
                </span>
                {detail?.updatedAt && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Updated {formatRelativeTime(detail.updatedAt)}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => loadData({ silent: true })}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-blue-500' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Instance Feature Views</p>
                <div className="flex flex-wrap gap-2">
                  {tabDefinitions.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-500'
                            : 'border border-transparent bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800/70 dark:text-gray-200 dark:hover:bg-gray-800'
                        }`}
                      >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {activeTab === 'overview' && (
              <>
                <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
                  <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Instance Overview</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Metadata and quick actions for this server.</p>
                  </div>
                  <div className="px-6 py-5">
                    <dl className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Instance ID</dt>
                        <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-200 break-all">{detail?.id}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Provider Reference</dt>
                        <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-200">{detail?.providerInstanceId}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Public IPv4</dt>
                        <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-200">{detail?.ipAddress || 'Not yet assigned'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Region</dt>
                        <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-200">
                          {detail?.regionLabel || detail?.region || 'Unknown'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Created</dt>
                        <dd className="mt-1 text-sm text-gray-800 dark:text-gray-300">{formatDateTime(detail?.createdAt || null)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Last Updated</dt>
                        <dd className="mt-1 text-sm text-gray-800 dark:text-gray-300">{formatDateTime(detail?.updatedAt || null)}</dd>
                      </div>
                    </dl>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={!allowStart || actionLoading === 'boot'}
                        onClick={() => performAction('boot')}
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-green-400 ${allowStart ? 'bg-green-600 hover:bg-green-500' : 'bg-green-600/50 cursor-not-allowed'} ${actionLoading === 'boot' ? 'opacity-75' : ''}`}
                      >
                        <Power className="h-4 w-4" />
                        {actionLoading === 'boot' ? 'Starting…' : 'Power On'}
                      </button>
                      <button
                        type="button"
                        disabled={!allowStop || actionLoading === 'shutdown'}
                        onClick={() => performAction('shutdown')}
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-red-400 ${allowStop ? 'bg-red-600 hover:bg-red-500' : 'bg-red-600/50 cursor-not-allowed'} ${actionLoading === 'shutdown' ? 'opacity-75' : ''}`}
                      >
                        <PowerOff className="h-4 w-4" />
                        {actionLoading === 'shutdown' ? 'Stopping…' : 'Power Off'}
                      </button>
                      <button
                        type="button"
                        disabled={!allowReboot || actionLoading === 'reboot'}
                        onClick={() => performAction('reboot')}
                        className={`inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 ${(!allowReboot || actionLoading === 'reboot') ? 'opacity-75' : ''}`}
                      >
                        <RotateCcw className={`h-4 w-4 ${actionLoading === 'reboot' ? 'animate-spin' : ''}`} />
                        {actionLoading === 'reboot' ? 'Rebooting…' : 'Reboot'}
                      </button>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
                  <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Plan & Resources</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Reserved capacity and current pricing for this server.</p>
                  </div>
                  <div className="px-6 py-5">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                          <span>vCPUs</span>
                          <Cpu className="h-4 w-4 text-blue-500" />
                        </div>
                        <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{detail?.plan.specs.vcpus ?? 0}</p>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                          <span>Memory</span>
                          <Activity className="h-4 w-4 text-purple-500" />
                        </div>
                        <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{formatMemory(detail?.plan.specs.memory ?? 0)}</p>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                          <span>Storage</span>
                          <HardDrive className="h-4 w-4 text-emerald-500" />
                        </div>
                        <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{formatStorage(detail?.plan.specs.disk ?? 0)}</p>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                          <span>Transfer</span>
                          <Network className="h-4 w-4 text-orange-500" />
                        </div>
                        <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{formatTransferAllowance(detail?.plan.specs.transfer ?? 0)}</p>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Plan</p>
                        <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">{detail?.plan.name || 'Custom Plan'}</p>
                        {detail?.plan.providerPlanId && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">Provider type: {detail.plan.providerPlanId}</p>
                        )}
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Pricing</p>
                        <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">{formatCurrency(detail?.plan.pricing.monthly ?? 0)} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">/ month</span></p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(detail?.plan.pricing.hourly ?? 0)} hourly billable</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
                  <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Performance Snapshot</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Aggregated metrics from the last 24 hours.</p>
                  </div>
                  <div className="px-6 py-5 space-y-5">
                    {timeframeLabel && (
                      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Observation window: {timeframeLabel}</p>
                    )}

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                          <span>CPU Utilization</span>
                          <Cpu className="h-4 w-4 text-blue-500" />
                        </div>
                        <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{cpuSummary ? formatPercent(cpuSummary.last) : '—'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Avg {cpuSummary ? formatPercent(cpuSummary.average) : '—'} · Peak {cpuSummary ? formatPercent(cpuSummary.peak) : '—'}</p>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                          <span>Inbound Traffic</span>
                          <Network className="h-4 w-4 text-emerald-500" />
                        </div>
                        <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{inboundSummary ? formatNetworkRate(inboundSummary.last) : '—'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Avg {inboundSummary ? formatNetworkRate(inboundSummary.average) : '—'} · Peak {inboundSummary ? formatNetworkRate(inboundSummary.peak) : '—'}</p>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                          <span>Outbound Traffic</span>
                          <Network className="h-4 w-4 text-orange-500" />
                        </div>
                        <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{outboundSummary ? formatNetworkRate(outboundSummary.last) : '—'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Avg {outboundSummary ? formatNetworkRate(outboundSummary.average) : '—'} · Peak {outboundSummary ? formatNetworkRate(outboundSummary.peak) : '—'}</p>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                          <span>I/O Activity</span>
                          <Activity className="h-4 w-4 text-purple-500" />
                        </div>
                        <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{ioSummary ? formatBlocks(ioSummary.last) : '—'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Swap {swapSummary ? formatBlocks(swapSummary.last) : '—'} · Avg {ioSummary ? formatBlocks(ioSummary.average) : '—'}</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
                  <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Network Transfer</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Current billing cycle utilisation.</p>
                  </div>
                  <div className="px-6 py-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{detail?.transfer ? `${detail.transfer.usedGb.toFixed(2)} GB used of ${detail.transfer.quotaGb.toFixed(0)} GB` : 'Usage data unavailable'}</p>
                      {detail?.transfer && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">Billable {detail.transfer.billableGb.toFixed(2)} GB</span>
                      )}
                    </div>
                    <div className="h-3 w-full rounded-full bg-gray-200 dark:bg-gray-800">
                      <div
                        className="h-3 rounded-full bg-blue-500 transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, detail?.transfer?.utilizationPercent ?? 0))}%` }}
                      />
                    </div>
                    {detail?.transfer && detail.transfer.utilizationPercent >= 90 && (
                      <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-100/70 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/30 dark:text-amber-200">
                        <AlertTriangle className="h-4 w-4" />
                        You are nearing the included transfer quota for this billing cycle.
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}

            {activeTab === 'backups' && (
              <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
                <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Backup Protection</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Automatic snapshots captured by the underlying platform.</p>
                </div>
                <div className="px-6 py-5 space-y-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <ShieldCheck className={`h-4 w-4 ${detail?.backups?.enabled ? 'text-green-500' : 'text-gray-400'}`} />
                      <span className="font-medium text-gray-800 dark:text-gray-200">{detail?.backups?.enabled ? 'Backups Enabled' : 'Backups Disabled'}</span>
                    </div>
                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {detail?.backups?.schedule
                        ? `Schedule: ${detail.backups.schedule.day ?? 'Any day'} · Window ${detail.backups.schedule.window ?? 'Automatic'}`
                        : 'No schedule data available'}
                    </div>
                  </div>

                  {backupPricing && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-800 dark:border-blue-900/40 dark:bg-blue-900/30 dark:text-blue-200">
                      <p className="font-semibold">Plan add-on pricing</p>
                      <p className="mt-1 text-xs">
                        Enabling backups adds {formatCurrency(backupPricing.monthly)} / month ({formatCurrency(backupPricing.hourly)} hourly) — 20% of your selected plan.
                      </p>
                    </div>
                  )}

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Last successful backup</p>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{detail?.backups?.lastSuccessful ? `${formatDateTime(detail.backups.lastSuccessful)} (${formatRelativeTime(detail.backups.lastSuccessful)})` : 'No successful backups recorded yet'}</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Automatic backups</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Most recent restore points (up to 5 shown).</p>
                    </div>
                    {detail?.backups?.automatic && detail.backups.automatic.length > 0 ? (
                      <div className="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
                        {detail.backups.automatic.slice(0, 5).map((backup) => (
                          <div key={backup.id ?? backup.created ?? Math.random()} className="flex flex-col gap-2 bg-white px-4 py-3 text-sm dark:bg-gray-900/60 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{backup.label || `Backup ${backup.id ?? ''}`}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{backup.created ? `${formatDateTime(backup.created)} (${formatRelativeTime(backup.created)})` : 'Pending'}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className={`text-xs font-semibold uppercase tracking-wide ${backup.available ? 'text-green-500' : 'text-amber-500'}`}>{backup.status || 'pending'}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{formatSizeFromMb(backup.totalSizeMb)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
                        No automatic backups captured yet.
                      </div>
                    )}

                    {detail?.backups?.snapshot || detail?.backups?.snapshotInProgress ? (
                      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-900/30 dark:text-blue-200">
                        <p className="font-semibold">Manual snapshots</p>
                        {detail?.backups?.snapshot ? (
                          <p className="text-xs">Current snapshot from {detail.backups.snapshot.created ? formatDateTime(detail.backups.snapshot.created) : 'unknown time'}.</p>
                        ) : (
                          <p className="text-xs">A snapshot is currently running.</p>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'networking' && (
              <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
                <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Networking</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Current IPv4/IPv6 assignments and routing details.</p>
                </div>
                <div className="px-6 py-5 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">IPv4 addresses</h3>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Public, private, shared, and reserved allocations.</p>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      {ipv4Categories.map(category => (
                        <div key={category.label} className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{category.label}</p>
                          {category.addresses.length > 0 ? (
                            <ul className="mt-2 space-y-2 text-sm text-gray-700 dark:text-gray-200">
                              {category.addresses.map(addr => (
                                <li key={`${category.label}-${addr.address}`} className="rounded-lg bg-white px-3 py-2 shadow-sm dark:bg-gray-900/60">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-gray-900 dark:text-white">{addr.address}</span>
                                    {addr.prefix !== null && (
                                      <span className="text-xs text-gray-500 dark:text-gray-400">/{addr.prefix}</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatStatusLabel(addr.type)} · {addr.public ? 'Public' : 'Private'}
                                    {addr.region ? ` · ${addr.region}` : ''}
                                  </p>
                                  {addr.gateway && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Gateway: {addr.gateway}</p>
                                  )}
                                  {addr.rdns && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">rDNS: {addr.rdns}</p>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">No addresses assigned.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">IPv6 assignments</h3>
                    {ipv6Info ? (
                      <div className="mt-4 space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          {ipv6Info.slaac && (
                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">SLAAC</p>
                              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{ipv6Info.slaac.address}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Prefix /{ipv6Info.slaac.prefix ?? '—'}</p>
                              {ipv6Info.slaac.gateway && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">Gateway: {ipv6Info.slaac.gateway}</p>
                              )}
                            </div>
                          )}
                          {ipv6Info.linkLocal && (
                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Link-local</p>
                              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{ipv6Info.linkLocal.address}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Prefix /{ipv6Info.linkLocal.prefix ?? '—'}</p>
                              {ipv6Info.linkLocal.gateway && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">Gateway: {ipv6Info.linkLocal.gateway}</p>
                              )}
                            </div>
                          )}
                        </div>
                        {(ipv6Info.global ?? []).length > 0 && (
                          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/60">
                            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Global prefixes</p>
                            <ul className="mt-2 space-y-2 text-xs text-gray-600 dark:text-gray-300">
                              {(ipv6Info.global ?? []).map((range, index) => (
                                <li key={`global-${index}`} className="flex flex-col gap-1 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/60">
                                  <span className="font-semibold text-gray-800 dark:text-white">{range.range ?? '—'}/{range.prefix ?? '—'}</span>
                                  <span>{range.region ?? 'Region unknown'}</span>
                                  {range.routeTarget && <span>Route: {range.routeTarget}</span>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {(ipv6Info.ranges ?? []).length > 0 && (
                          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/60">
                            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Ranged allocations</p>
                            <ul className="mt-2 space-y-2 text-xs text-gray-600 dark:text-gray-300">
                              {(ipv6Info.ranges ?? []).map((range, index) => (
                                <li key={`range-${index}`} className="flex flex-col gap-1 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/60">
                                  <span className="font-semibold text-gray-800 dark:text-white">{range.range ?? '—'}/{range.prefix ?? '—'}</span>
                                  <span>{range.region ?? 'Region unknown'}</span>
                                  {range.routeTarget && <span>Route: {range.routeTarget}</span>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {(ipv6Info.pools ?? []).length > 0 && (
                          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/60">
                            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Pool assignments</p>
                            <ul className="mt-2 space-y-2 text-xs text-gray-600 dark:text-gray-300">
                              {(ipv6Info.pools ?? []).map((pool, index) => (
                                <li key={`pool-${index}`} className="flex flex-col gap-1 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/60">
                                  <span className="font-semibold text-gray-800 dark:text-white">{pool.range ?? '—'}/{pool.prefix ?? '—'}</span>
                                  <span>{pool.region ?? 'Region unknown'}</span>
                                  {pool.routeTarget && <span>Route: {pool.routeTarget}</span>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">No IPv6 assignments reported by the provider.</p>
                    )}
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'activity' && (
              <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
                <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Provider Activity Feed</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Recent Linode events for this instance.</p>
                </div>
                <div className="px-6 py-5">
                  {eventFeed.length > 0 ? (
                    <div className="divide-y divide-gray-200 dark:divide-gray-800">
                      {eventFeed.map(event => (
                        <div key={event.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatEventAction(event.action)}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{event.message || 'No additional details provided.'}</p>
                            {event.entityLabel && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">Entity: {event.entityLabel}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-start gap-1 text-xs text-gray-500 dark:text-gray-400 sm:items-end">
                            <span>{formatDateTime(event.created)}</span>
                            {event.username && <span>By {event.username}</span>}
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${statusBadgeClasses(event.status)}`}>
                              {formatStatusLabel(event.status)}
                            </span>
                            {event.percentComplete !== null && (
                              <span>{event.percentComplete}% complete</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
                      No provider events recorded in the last 90 days.
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeTab === 'firewall' && (
              <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
                <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Firewall Management</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Firewalls attached to this instance and their rule summaries.</p>
                </div>
                <div className="px-6 py-5 space-y-4">
                  {firewallSummaries.length > 0 ? (
                    firewallSummaries.map(firewall => {
                      const inbound = firewall.rules?.inbound ?? [];
                      const outbound = firewall.rules?.outbound ?? [];
                      return (
                        <div key={firewall.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-base font-semibold text-gray-900 dark:text-white">{firewall.label || `Firewall ${firewall.id}`}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {firewall.created ? `Created ${formatDateTime(firewall.created)}` : 'Creation date unknown'}
                              </p>
                              {firewall.tags.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {firewall.tags.map(tag => (
                                    <span key={tag} className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-start gap-1 text-xs text-gray-500 dark:text-gray-400 sm:items-end">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${statusBadgeClasses(firewall.status)}`}>
                                {formatStatusLabel(firewall.status)}
                              </span>
                              {firewall.pendingChanges && (
                                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-200">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  Pending changes
                                </span>
                              )}
                              {firewall.updated && <span>Updated {formatRelativeTime(firewall.updated)}</span>}
                            </div>
                          </div>
                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Inbound rules ({inbound.length})</p>
                              {inbound.length > 0 ? (
                                <ul className="mt-2 space-y-2 text-xs text-gray-600 dark:text-gray-300">
                                  {inbound.slice(0, 5).map((rule, index) => (
                                    <li key={`inbound-${firewall.id}-${index}`} className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/60">
                                      <p className="font-semibold text-gray-800 dark:text-white">{summarizeFirewallRule(rule)}</p>
                                      {rule.addresses?.ipv4 && rule.addresses.ipv4.length > 0 && (
                                        <p>IPv4: {rule.addresses.ipv4.join(', ')}</p>
                                      )}
                                      {rule.addresses?.ipv6 && rule.addresses.ipv6.length > 0 && (
                                        <p>IPv6: {rule.addresses.ipv6.join(', ')}</p>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">No inbound rules.</p>
                              )}
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Outbound rules ({outbound.length})</p>
                              {outbound.length > 0 ? (
                                <ul className="mt-2 space-y-2 text-xs text-gray-600 dark:text-gray-300">
                                  {outbound.slice(0, 5).map((rule, index) => (
                                    <li key={`outbound-${firewall.id}-${index}`} className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/60">
                                      <p className="font-semibold text-gray-800 dark:text-white">{summarizeFirewallRule(rule)}</p>
                                      {rule.addresses?.ipv4 && rule.addresses.ipv4.length > 0 && (
                                        <p>IPv4: {rule.addresses.ipv4.join(', ')}</p>
                                      )}
                                      {rule.addresses?.ipv6 && rule.addresses.ipv6.length > 0 && (
                                        <p>IPv6: {rule.addresses.ipv6.join(', ')}</p>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">No outbound rules.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
                      No firewalls are currently attached to this instance.
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeTab === 'configurations' && (
              <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
                <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Configurations</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Provider configuration profiles along with our stored configuration payload.</p>
                </div>
                <div className="px-6 py-5 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Provider profiles</h3>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Mirrors Linode configuration profiles attached to this instance.</p>
                    {providerConfigs.length > 0 ? (
                      <div className="mt-4 space-y-4">
                        {providerConfigs.map(config => {
                          const interfaces = Array.isArray(config.interfaces) ? config.interfaces : [];
                          return (
                            <div key={config.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <p className="text-base font-semibold text-gray-900 dark:text-white">{config.label || `Config ${config.id}`}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Kernel: {config.kernel || 'default'} · Root device: {config.rootDevice || '—'}
                                  </p>
                                  {config.runLevel && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Run level: {config.runLevel}</p>
                                  )}
                                  {config.virtMode && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Virtualization: {config.virtMode}</p>
                                  )}
                                </div>
                                <div className="flex flex-col items-start gap-1 text-xs text-gray-500 dark:text-gray-400 sm:items-end">
                                  {config.created && <span>Created {formatRelativeTime(config.created)}</span>}
                                  {config.updated && <span>Updated {formatRelativeTime(config.updated)}</span>}
                                  {config.memoryLimit && config.memoryLimit > 0 && <span>Memory limit: {config.memoryLimit} MB</span>}
                                </div>
                              </div>
                              <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Interfaces ({interfaces.length})</p>
                                  {interfaces.length > 0 ? (
                                    <ul className="mt-2 space-y-2 text-xs text-gray-600 dark:text-gray-300">
                                      {interfaces.slice(0, 6).map((iface, index) => {
                                        const data = (iface ?? {}) as Record<string, unknown>;
                                        const purpose = typeof data['purpose'] === 'string' ? String(data['purpose']) : null;
                                        const ipamAddress = typeof data['ipam_address'] === 'string' ? String(data['ipam_address']) : null;
                                        const ipv4Block = data['ipv4'] as { address?: unknown } | undefined;
                                        const ipv4Addresses = Array.isArray(ipv4Block?.address) ? (ipv4Block?.address as unknown[]).filter((value): value is string => typeof value === 'string') : [];
                                        return (
                                          <li key={`iface-${config.id}-${index}`} className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/60">
                                            <span className="font-semibold text-gray-800 dark:text-white">Interface {index + 1}</span>
                                            {purpose && <p>Purpose: {formatStatusLabel(purpose)}</p>}
                                            {ipamAddress && <p>IPAM: {ipamAddress}</p>}
                                            {ipv4Addresses.length > 0 && <p>IPv4: {ipv4Addresses.join(', ')}</p>}
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  ) : (
                                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">No interfaces defined.</p>
                                  )}
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Helpers</p>
                                  {config.helpers ? (
                                    <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                                      {Object.entries(config.helpers).map(([key, value]) => (
                                        <li key={`${config.id}-helper-${key}`} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/60">
                                          <span className="font-medium text-gray-800 dark:text-white">{formatStatusLabel(key)}</span>
                                          <span>{value ? 'Enabled' : 'Disabled'}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">No helpers configuration reported.</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
                        No provider configurations available for this instance.
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Control plane configuration</h3>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">JSON payload stored in ContainerStacks.</p>
                    <pre className="mt-3 max-h-80 overflow-y-auto whitespace-pre-wrap break-all rounded-xl bg-gray-900/90 px-3 py-3 text-xs text-gray-100">
                      {JSON.stringify(detail?.configuration, null, 2)}
                    </pre>
                  </div>
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Provider Telemetry</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Details reported by the infrastructure provider.</p>
              </div>
              <div className="px-6 py-5 space-y-4 text-sm text-gray-700 dark:text-gray-200">
                <div className="flex items-center justify-between">
                  <span>Image</span>
                  <span className="font-medium">{detail?.image || detail?.provider?.image || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Provider status</span>
                  <span className="font-medium">{detail?.provider ? detail.provider.status : 'Unavailable'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Region code</span>
                  <span className="font-medium">{detail?.provider?.region || detail?.region || '—'}</span>
                </div>
                {detail?.provider?.ipv6 && (
                  <div className="flex items-center justify-between">
                    <span>IPv6 SLAAC</span>
                    <span className="font-medium break-all">{detail.provider.ipv6}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span>Created</span>
                  <span className="font-medium">{formatDateTime(detail?.provider?.created || null)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Last update</span>
                  <span className="font-medium">{formatDateTime(detail?.provider?.updated || null)}</span>
                </div>
                {detail?.provider?.ipv4?.length ? (
                  <div>
                    <span className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Provider IPv4 list</span>
                    <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                      {detail.provider.ipv4.map(ip => (
                        <li key={ip} className="rounded bg-gray-100 px-2 py-1 dark:bg-gray-800">{ip}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default VPSDetail;