/**
 * Container Management Page
 * Handles Docker container creation, management, and monitoring
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  RefreshCw,
  Play,
  Square,
  Eye,
  Trash2,
  Container,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Status } from '@/components/ui/status';
import { toast } from 'sonner';
// Navigation provided by AppLayout
import { useAuth } from '../contexts/AuthContext';

interface ContainerPlanProfile {
  cpuCores?: number;
  memoryGb?: number;
  storageGb?: number;
  networkMbps?: number;
}

interface ContainerPlanOption {
  id: string;
  name: string;
  resource_profile?: ContainerPlanProfile;
  max_containers: number;
  price_monthly: number;
  is_public?: boolean;
}

interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: 'running' | 'stopped' | 'paused' | 'restarting' | 'starting' | 'stopping' | 'error' | 'missing';
  created: string;
  planId?: string;
  planName?: string | null;
  planProfile?: ContainerPlanProfile | null;
  ports: string[];
  volumes: string[];
  environment: Record<string, string>;
  runtime?: {
    startedAt?: string;
    state?: string;
    status?: string;
  };
  stats: {
    cpu: number;
    memory: number;
    network: {
      rx: number;
      tx: number;
    };
    uptime: string;
  };
}

interface CreateContainerForm {
  name: string;
  image: string;
  planId: string;
  ports: string;
  volumes: string;
  environment: string;
  command: string;
  restart: 'no' | 'always' | 'unless-stopped' | 'on-failure';
  autoStart: boolean;
}

const Containers: React.FC = () => {
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateContainerForm>({
    name: '',
    image: '',
    planId: '',
    ports: '',
    volumes: '',
    environment: '',
    command: '',
    restart: 'unless-stopped',
    autoStart: true
  });
  const [plans, setPlans] = useState<ContainerPlanOption[]>([]);
  const [creating, setCreating] = useState(false);
  const { token } = useAuth();

  const computeUptime = useCallback((startedAt?: string) => {
    if (!startedAt) return '';
    const started = new Date(startedAt);
    if (Number.isNaN(started.getTime())) return '';
    const diffMs = Date.now() - started.getTime();
    if (diffMs <= 0) return '0m';
    const minutes = Math.floor(diffMs / (60 * 1000));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) {
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    }
    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  }, []);

  const formatPortDisplay = useCallback((port: any) => {
    if (!port) return '';
    const protocol = port.protocol || port.type || 'tcp';
    const containerPort = port.containerPort ?? port.private ?? port.internal ?? port;
    const hostPort = port.hostPort ?? port.public ?? port.external;
    const hostIp = port.hostIp ?? port.ip;
    if (hostPort) {
      return `${hostIp ? hostIp + ':' : ''}${hostPort} → ${containerPort}/${protocol}`;
    }
    return `${containerPort}/${protocol}`;
  }, []);

  const parseEnvironmentInput = (value: string): Record<string, string> => {
    if (!value.trim()) return {};
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object') {
        return Object.fromEntries(
          Object.entries(parsed as Record<string, unknown>).map(([key, val]) => [key, String(val)])
        );
      }
    } catch {
    }
    const env: Record<string, string> = {};
    const segments = value.split(/\n|,/).map((segment) => segment.trim()).filter(Boolean);
    for (const segment of segments) {
      const [key, ...rest] = segment.split('=');
      if (!key) continue;
      env[key.trim()] = rest.join('=').trim();
    }
    return env;
  };

  const parsePortInput = (value: string) => {
    if (!value.trim()) return [] as Array<{ containerPort: number; hostPort?: number; protocol?: string }>;
    return value
      .split(/\n|,/)
      .map((segment) => segment.trim())
      .filter(Boolean)
      .map((segment) => {
        const [hostPart, containerPart] = segment.includes('->')
          ? segment.split('->').map((s) => s.trim())
          : segment.split(':').map((s) => s.trim());
        let hostPort: number | undefined;
        let container = containerPart ?? hostPart;
        if (container === hostPart) {
          hostPort = undefined;
        } else if (hostPart) {
          const parsedHost = Number(hostPart.replace(/[^0-9]/g, ''));
          if (!Number.isNaN(parsedHost) && (parsedHost < 1 || parsedHost > 65535)) {
            throw new Error('Invalid port number: must be 1-65535');
          }
          hostPort = Number.isNaN(parsedHost) ? undefined : parsedHost;
        }
        let protocol = 'tcp';
        if (container?.includes('/')) {
          const [port, proto] = container.split('/');
          container = port;
          protocol = proto?.toLowerCase() || 'tcp';
        }
        const containerPort = Number(container);
        if (Number.isNaN(containerPort)) {
          throw new Error(`Invalid port mapping: ${segment}`);
        }
        return { containerPort, hostPort, protocol };
      });
  };

  const parseVolumeInput = (value: string) => {
    if (!value.trim()) return [] as Array<{ source?: string; target: string; readOnly?: boolean }>;
    return value
      .split(/\n|,/)
      .map((segment) => segment.trim())
      .filter(Boolean)
      .map((segment) => {
        const [left, right] = segment.split(':');
        if (!right) {
          return { target: left.trim(), readOnly: false };
        }
        const [target, mode] = right.split(':');
        return {
          source: left.trim(),
          target: target.trim(),
          readOnly: mode?.trim().toLowerCase() === 'ro',
        };
      });
  };

  const normalizePlanProfile = useCallback(
    (profile?: ContainerPlanProfile | null): ContainerPlanProfile | null => {
      if (!profile) return null;
      return {
        cpuCores: Number(profile.cpuCores ?? 0),
        memoryGb: Number(profile.memoryGb ?? 0),
        storageGb: Number(profile.storageGb ?? 0),
        networkMbps: Number(profile.networkMbps ?? 0),
      };
    },
    []
  );

  const formatPlanSummary = useCallback(
    (profile?: ContainerPlanProfile | null): string => {
      if (!profile) return '—';
      const parts: string[] = [];
      if (profile.cpuCores) parts.push(`${profile.cpuCores} vCPU`);
      if (profile.memoryGb) parts.push(`${profile.memoryGb} GB RAM`);
      if (profile.storageGb) parts.push(`${profile.storageGb} GB storage`);
      if (profile.networkMbps) parts.push(`${profile.networkMbps} Mbps network`);
      return parts.length ? parts.join(' • ') : '—';
    },
    []
  );

  const loadContainers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/containers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load containers');

      const mapped: ContainerInfo[] = (payload.containers || []).map((c: any) => {
        const runtime = c.runtime?.docker;
        const env = c.config?.environment && typeof c.config.environment === 'object'
          ? Object.fromEntries(Object.entries(c.config.environment).map(([key, val]) => [key, String(val)]))
          : {};
        const configPorts = Array.isArray(c.config?.ports) ? c.config.ports : [];
        const runtimePorts = Array.isArray(runtime?.ports) ? runtime?.ports : [];
        const ports = Array.from(
          new Set(
            [...configPorts, ...runtimePorts]
              .map((port: any) => formatPortDisplay(port))
              .filter(Boolean)
          )
        );
        const configVolumes = Array.isArray(c.config?.volumes) ? c.config.volumes : [];
        const volumes = configVolumes.map((vol: any) => {
          if (typeof vol === 'string') return vol;
          const source = vol.source ?? '';
          const target = vol.target ?? '';
          const suffix = vol.readOnly ? ' (ro)' : '';
          return `${source}${source && target ? ':' : ''}${target}${suffix}`;
        });

        return {
          id: c.id,
          name: c.name,
          image: c.image,
          status: (c.status as any) || 'stopped',
          created: c.created_at,
          planId: c.plan_id ?? undefined,
          planName: c.plan_name ?? null,
          planProfile: normalizePlanProfile(c.plan_resource_profile),
          ports,
          volumes,
          environment: env,
          runtime: runtime
            ? {
                startedAt: runtime.startedAt,
                state: runtime.state,
                status: runtime.status,
              }
            : undefined,
          stats: {
            cpu: 0,
            memory: 0,
            network: { rx: 0, tx: 0 },
            uptime: computeUptime(runtime?.startedAt),
          },
        };
      });

      setContainers(mapped);
    } catch (error: any) {
      console.error('Failed to load containers:', error);
      toast.error(error.message || 'Failed to load containers');
    } finally {
      setLoading(false);
    }
  }, [token, computeUptime, formatPortDisplay, normalizePlanProfile]);

  const loadPlans = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/containers/plans', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load container plans');

      const available: ContainerPlanOption[] = Array.isArray(payload.plans)
        ? payload.plans.map((plan: any) => ({
            ...plan,
            resource_profile: normalizePlanProfile(plan.resource_profile) || undefined,
          }))
        : [];
      setPlans(available);
      setCreateForm((prev) => {
        if (prev.planId) return prev;
        return {
          ...prev,
          planId: available[0]?.id ?? '',
        };
      });
    } catch (error: any) {
      console.error('Failed to load container plans:', error);
      toast.error(error.message || 'Failed to load container plans');
    }
  }, [token, normalizePlanProfile]);

  useEffect(() => {
    loadContainers();
    loadPlans();
  }, [loadContainers, loadPlans]);

  const handleContainerAction = async (containerId: string, action: 'start' | 'stop' | 'restart') => {
    try {
      setContainers((prev) =>
        prev.map((container) =>
          container.id === containerId
            ? {
                ...container,
                status:
                  action === 'start'
                    ? 'starting'
                    : action === 'stop'
                      ? 'stopping'
                      : 'restarting',
              }
            : container
        )
      );

      const res = await fetch(`/api/containers/${containerId}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || `Failed to ${action} container`);

      const updated = payload.container;
      const runtime = updated?.runtime?.docker;
      setContainers((prev) =>
        prev.map((container) =>
          container.id === containerId
            ? {
                ...container,
                status: updated.status || container.status,
                runtime: runtime
                  ? {
                      startedAt: runtime.startedAt,
                      state: runtime.state,
                      status: runtime.status,
                    }
                  : container.runtime,
                stats: {
                  ...container.stats,
                  uptime: computeUptime(runtime?.startedAt),
                },
              }
            : container
        )
      );

      toast.success(`Container ${action}ed successfully`);
    } catch (error: any) {
      console.error(`Failed to ${action} container:`, error);
      toast.error(error.message || `Failed to ${action} container`);
      loadContainers();
    }
  };

  const handleContainerDelete = async (containerId: string) => {
    try {
      const res = await fetch(`/api/containers/${containerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload.error || 'Failed to delete container');
      }
      setContainers((prev) => prev.filter((container) => container.id !== containerId));
      toast.success('Container removed successfully');
    } catch (error: any) {
      console.error('Failed to remove container:', error);
      toast.error(error.message || 'Failed to remove container');
      loadContainers();
    }
  };

  const handleCreateContainer = async () => {
    if (!createForm.name || !createForm.image || !createForm.planId) {
      toast.error('Name, image, and Container Plan are required');
      return;
    }

    try {
      setCreating(true);
      const environment = parseEnvironmentInput(createForm.environment);
      let ports;
      try {
        ports = parsePortInput(createForm.ports);
      } catch (parseError: any) {
        throw new Error(parseError?.message || 'Invalid port mapping');
      }
      const volumes = parseVolumeInput(createForm.volumes);

      const res = await fetch('/api/containers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: createForm.name,
          image: createForm.image,
          planId: createForm.planId,
          ports,
          volumes,
          environment,
          command: createForm.command || undefined,
          restartPolicy: createForm.restart,
          autoStart: createForm.autoStart,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to create container');

      toast.success('Container created successfully');
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        image: '',
        planId: plans[0]?.id ?? '',
        ports: '',
        volumes: '',
        environment: '',
        command: '',
        restart: 'unless-stopped',
        autoStart: true,
      });
      loadContainers();
    } catch (error: any) {
      console.error('Failed to create container:', error);
      toast.error(error.message || 'Failed to create container');
    } finally {
      setCreating(false);
    }
  };

  const filteredContainers = containers.filter(container => {
    const matchesSearch = container.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         container.image.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || container.status === statusFilter;
    return matchesSearch && matchesStatus;
  });


  const getContainerStatusVariant = (status: string) => {
    switch (status) {
      case 'running':
        return 'running';
      case 'stopped':
        return 'stopped';
      case 'paused':
        return 'warning';
      case 'restarting':
        return 'loading';
      case 'starting':
        return 'provisioning';
      case 'stopping':
        return 'warning';
      case 'error':
        return 'error';
      case 'missing':
        return 'error';
      default:
        return 'offline';
    }
  };

  const getContainerProgressValue = (status: string) => {
    switch (status) {
      case 'starting':
        return 30;
      case 'stopping':
        return 70;
      case 'restarting':
        return 50;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading containers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Container Management</h1>
              <p className="mt-2 text-muted-foreground">
                Manage your Docker containers and monitor their performance
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={plans.length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Container
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground " />
                  <input
                    type="text"
                    placeholder="Search containers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border rounded-md bg-secondary text-foreground placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border rounded-md bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="all">All Status</option>
                  <option value="running">Running</option>
                  <option value="stopped">Stopped</option>
                  <option value="paused">Paused</option>
                  <option value="error">Error</option>
                  <option value="missing">Missing</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={loadContainers}
                  className="inline-flex items-center px-3 py-2 border border shadow-sm text-sm leading-4 font-medium rounded-md text-muted-foreground bg-secondary hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Container Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Play className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Running</p>
                  <p className="text-2xl font-bold text-foreground">
                    {containers.filter(c => c.status === 'running').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-secondary rounded-lg">
                  <Square className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Stopped</p>
                  <p className="text-2xl font-bold text-foreground">
                    {containers.filter(c => c.status === 'stopped').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg">
                    <Container className="h-6 w-6 text-primary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold text-foreground">{containers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Activity className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Avg CPU</p>
                  <p className="text-2xl font-bold text-foreground">
                    {(containers.reduce((sum, c) => sum + c.stats.cpu, 0) / containers.length || 0).toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Container List */}
        <Card>
          <CardHeader>
            <CardTitle>Containers ({filteredContainers.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Container
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Resources
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Uptime
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                {filteredContainers.map((container) => (
                  <tr key={container.id} className="hover:bg-secondary/80">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <Container className="h-8 w-8 text-muted-foreground " />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground">{container.name}</div>
                          <div className="text-sm text-muted-foreground">{container.image}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-2">
                        <Status 
                          variant={getContainerStatusVariant(container.status)}
                          label={container.status.charAt(0).toUpperCase() + container.status.slice(1)}
                          showPing={['running', 'starting', 'stopping', 'restarting'].includes(container.status)}
                          animated={['starting', 'stopping', 'restarting'].includes(container.status)}
                        />
                        {getContainerProgressValue(container.status) !== null && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{container.status}...</span>
                              <span>{getContainerProgressValue(container.status)}%</span>
                            </div>
                            <Progress value={getContainerProgressValue(container.status)} className="h-1.5" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      <div className="space-y-1">
                        {container.planName && (
                          <div className="font-medium text-foreground">{container.planName}</div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {formatPlanSummary(container.planProfile)}
                        </div>
                        {container.ports.length > 0 && (
                          <div className="text-xs text-muted-foreground truncate">
                            Ports: {container.ports.join(', ')}
                          </div>
                        )}
                        {container.volumes.length > 0 && (
                          <div className="text-xs text-muted-foreground truncate">
                            Volumes: {container.volumes.join(', ')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {container.stats.uptime}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {formatDate(container.created)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {container.status === 'running' ? (
                          <>
                            <button
                              onClick={() => handleContainerAction(container.id, 'stop')}
                              className="text-muted-foreground hover:text-foreground text-muted-foreground dark:hover:text-gray-200"
                              title="Stop"
                            >
                              <Square className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleContainerAction(container.id, 'restart')}
                              className="text-primary hover:text-primary/80"
                              title="Restart"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleContainerAction(container.id, 'start')}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            title="Start"
                          >
                            <Play className="h-4 w-4" />
                          </button>
                        )}
                        <Link
                          to={`/containers/${container.id}`}
                          className="text-primary hover:text-primary/80"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleContainerDelete(container.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Create Container Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 bg-background dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border w-full max-w-2xl shadow-lg rounded-md bg-card">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-foreground mb-4">Create New Container</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Container Name *</label>
                      <input
                        type="text"
                        value={createForm.name}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border rounded-md bg-secondary text-foreground placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        placeholder="my-container"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Docker Image *</label>
                      <input
                        type="text"
                        value={createForm.image}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, image: e.target.value }))}
                        className="w-full px-3 py-2 border border rounded-md bg-secondary text-foreground placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        placeholder="nginx:latest"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Container Plan *</label>
                      <select
                        value={createForm.planId}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, planId: e.target.value }))}
                        className="w-full px-3 py-2 border border rounded-md bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      >
                        {plans.length === 0 ? (
                          <option value="" disabled>No plans available</option>
                        ) : (
                          plans.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {plan.name} — {formatPlanSummary(plan.resource_profile)}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Start Command</label>
                      <input
                        type="text"
                        value={createForm.command}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, command: e.target.value }))}
                        className="w-full px-3 py-2 border border rounded-md bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        placeholder="Optional entry point command"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Port Mappings
                    </label>
                    <input
                      type="text"
                      value={createForm.ports}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, ports: e.target.value }))}
                      className="w-full px-3 py-2 border border rounded-md bg-secondary text-foreground placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      placeholder="80:8080/tcp, 443:8443/tcp"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Comma or newline separated (host:container[/protocol])</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Volume Mounts
                    </label>
                    <input
                      type="text"
                      value={createForm.volumes}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, volumes: e.target.value }))}
                      className="w-full px-3 py-2 border border rounded-md bg-secondary text-foreground placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      placeholder="/host/path:/container/path"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Comma-separated list (host:container[:ro])</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Environment Variables
                    </label>
                    <textarea
                      value={createForm.environment}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, environment: e.target.value }))}
                      className="w-full px-3 py-2 border border rounded-md bg-secondary text-foreground placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      rows={3}
                      placeholder='JSON or KEY=VALUE pairs (one per line)'
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Restart Policy
                    </label>
                    <select
                      value={createForm.restart}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, restart: e.target.value as any }))}
                      className="w-full px-3 py-2 border border rounded-md bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="no">No</option>
                      <option value="always">Always</option>
                      <option value="unless-stopped">Unless Stopped</option>
                      <option value="on-failure">On Failure</option>
                    </select>
                  </div>
                </div>

                  <div className="flex items-center space-x-2">
                    <input
                      id="auto-start"
                      type="checkbox"
                      checked={createForm.autoStart}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, autoStart: e.target.checked }))}
                      className="h-4 w-4 rounded border border bg-secondary text-primary focus:ring-primary"
                    />
                    <label htmlFor="auto-start" className="text-sm text-muted-foreground">
                      Auto-start container after provisioning
                    </label>
                  </div>

                <div className="flex items-center justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border rounded-md text-sm font-medium text-muted-foreground bg-secondary hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateContainer}
                    disabled={creating || plans.length === 0}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? 'Creating…' : 'Create Container'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Containers;
