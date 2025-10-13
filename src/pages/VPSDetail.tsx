import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
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
  AlertTriangle
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

            <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Configuration JSON</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Raw configuration stored in our control plane.</p>
              </div>
              <div className="px-6 py-5">
                <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-all rounded-xl bg-gray-900/90 px-3 py-3 text-xs text-gray-100">
                  {JSON.stringify(detail?.configuration, null, 2)}
                </pre>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default VPSDetail;