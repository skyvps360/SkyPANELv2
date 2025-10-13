/**
 * VPS Detail Page
 * Comprehensive management page for individual VPS instances with full Linode API control
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Server, 
  Play, 
  Square, 
  RefreshCw, 
  Trash2, 
  Settings,
  ArrowLeft,
  Activity,
  HardDrive,
  Network,
  Shield,
  Database,
  Clock,
  AlertCircle,
  CheckCircle,
  Power,
  PowerOff,
  Maximize2,
  Copy,
  Download,
  Upload,
  Save,
  Edit2,
  RotateCcw,
  Move,
  Layers,
  Terminal,
  Key,
  BarChart3,
  Cpu,
  MemoryStick,
  Globe
} from 'lucide-react';
import { toast } from 'sonner';

interface VPSInstance {
  id: string;
  label: string;
  status: string;
  ip_address: string;
  provider_instance_id: string;
  created_at: string;
  updated_at: string;
  configuration: any;
  linode_detail: any;
  region_label: string;
  plan_specs: {
    vcpus: number;
    memory: number;
    disk: number;
    transfer: number;
  };
  plan_pricing: {
    hourly: number;
    monthly: number;
  };
}

export default function VPSDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [instance, setInstance] = useState<VPSInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<any>(null);
  const [backups, setBackups] = useState<any>(null);
  const [disks, setDisks] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  const [ips, setIps] = useState<any>(null);
  const [volumes, setVolumes] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [showResizeModal, setShowResizeModal] = useState(false);
  const [showRebuildModal, setShowRebuildModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);

  useEffect(() => {
    loadInstance();
  }, [id]);

  useEffect(() => {
    if (instance && activeTab === 'stats') {
      loadStats();
    } else if (instance && activeTab === 'backups') {
      loadBackups();
    } else if (instance && activeTab === 'disks') {
      loadDisks();
    } else if (instance && activeTab === 'configs') {
      loadConfigs();
    } else if (instance && activeTab === 'network') {
      loadIPs();
    } else if (instance && activeTab === 'volumes') {
      loadVolumes();
    }
  }, [instance, activeTab]);

  const loadInstance = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/vps/${id}`);
      if (!res.ok) throw new Error('Failed to load VPS instance');
      const data = await res.json();
      setInstance(data.instance);
    } catch (error: any) {
      console.error('Failed to load VPS instance:', error);
      toast.error(error.message || 'Failed to load VPS instance');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch(`/api/vps/${id}/stats`);
      if (!res.ok) throw new Error('Failed to load stats');
      const data = await res.json();
      setStats(data.stats);
    } catch (error: any) {
      console.error('Failed to load stats:', error);
      toast.error('Failed to load statistics');
    }
  };

  const loadBackups = async () => {
    try {
      const res = await fetch(`/api/vps/${id}/backups`);
      if (!res.ok) throw new Error('Failed to load backups');
      const data = await res.json();
      setBackups(data.backups);
    } catch (error: any) {
      console.error('Failed to load backups:', error);
      toast.error('Failed to load backups');
    }
  };

  const loadDisks = async () => {
    try {
      const res = await fetch(`/api/vps/${id}/disks`);
      if (!res.ok) throw new Error('Failed to load disks');
      const data = await res.json();
      setDisks(data.disks);
    } catch (error: any) {
      console.error('Failed to load disks:', error);
      toast.error('Failed to load disks');
    }
  };

  const loadConfigs = async () => {
    try {
      const res = await fetch(`/api/vps/${id}/configs`);
      if (!res.ok) throw new Error('Failed to load configs');
      const data = await res.json();
      setConfigs(data.configs);
    } catch (error: any) {
      console.error('Failed to load configs:', error);
      toast.error('Failed to load configurations');
    }
  };

  const loadIPs = async () => {
    try {
      const res = await fetch(`/api/vps/${id}/ips`);
      if (!res.ok) throw new Error('Failed to load IPs');
      const data = await res.json();
      setIps(data.ips);
    } catch (error: any) {
      console.error('Failed to load IPs:', error);
      toast.error('Failed to load network information');
    }
  };

  const loadVolumes = async () => {
    try {
      const res = await fetch(`/api/vps/${id}/volumes`);
      if (!res.ok) throw new Error('Failed to load volumes');
      const data = await res.json();
      setVolumes(data.volumes);
    } catch (error: any) {
      console.error('Failed to load volumes:', error);
      toast.error('Failed to load volumes');
    }
  };

  const handleAction = async (action: string, endpoint: string, body?: any) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/vps/${id}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || `Failed to ${action}`);
      }
      toast.success(`${action} initiated successfully`);
      setTimeout(() => loadInstance(), 2000);
    } catch (error: any) {
      console.error(`Failed to ${action}:`, error);
      toast.error(error.message || `Failed to ${action}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${instance?.label}? This action cannot be undone.`)) {
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch(`/api/vps/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete VPS');
      toast.success('VPS deleted successfully');
      navigate('/vps');
    } catch (error: any) {
      console.error('Failed to delete VPS:', error);
      toast.error(error.message || 'Failed to delete VPS');
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'running':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
      case 'stopped':
      case 'offline':
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800';
      case 'provisioning':
      case 'rebooting':
      case 'booting':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
      case 'error':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      default:
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading VPS details...</p>
        </div>
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">VPS instance not found</p>
          <Link to="/vps" className="mt-4 inline-block text-blue-600 dark:text-blue-400">
            Back to VPS List
          </Link>
        </div>
      </div>
    );
  }

  const detail = instance.linode_detail || {};

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link to="/vps" className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to VPS List
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{instance.label}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {instance.ip_address || 'No IP assigned'} • {instance.region_label || detail.region}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(instance.status)}`}>
                {instance.status}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            {instance.status === 'running' ? (
              <>
                <button
                  onClick={() => handleAction('Shutdown', '/shutdown')}
                  disabled={actionLoading}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  <PowerOff className="h-4 w-4 mr-2" />
                  Shutdown
                </button>
                <button
                  onClick={() => handleAction('Reboot', '/reboot')}
                  disabled={actionLoading}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reboot
                </button>
              </>
            ) : instance.status === 'stopped' || instance.status === 'offline' ? (
              <button
                onClick={() => handleAction('Boot', '/boot')}
                disabled={actionLoading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-green-700 dark:text-green-400 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                <Power className="h-4 w-4 mr-2" />
                Boot
              </button>
            ) : null}
            <button
              onClick={() => setShowResizeModal(true)}
              disabled={actionLoading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              <Maximize2 className="h-4 w-4 mr-2" />
              Resize
            </button>
            <button
              onClick={() => setShowRebuildModal(true)}
              disabled={actionLoading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Rebuild
            </button>
            <button
              onClick={() => setShowCloneModal(true)}
              disabled={actionLoading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              <Copy className="h-4 w-4 mr-2" />
              Clone
            </button>
            <button
              onClick={() => setShowPasswordModal(true)}
              disabled={actionLoading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              <Key className="h-4 w-4 mr-2" />
              Reset Password
            </button>
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="inline-flex items-center px-4 py-2 border border-red-300 dark:border-red-600 rounded-md shadow-sm text-sm font-medium text-red-700 dark:text-red-400 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview', icon: Server },
                { id: 'stats', label: 'Statistics', icon: BarChart3 },
                { id: 'network', label: 'Network', icon: Network },
                { id: 'disks', label: 'Disks', icon: HardDrive },
                { id: 'backups', label: 'Backups', icon: Database },
                { id: 'configs', label: 'Configurations', icon: Settings },
                { id: 'volumes', label: 'Volumes', icon: Layers },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm inline-flex items-center`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Specs */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Specifications</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center">
                        <Cpu className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">vCPUs</span>
                      </div>
                      <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                        {instance.plan_specs.vcpus || detail.specs?.vcpus || 0}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center">
                        <MemoryStick className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Memory</span>
                      </div>
                      <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                        {(instance.plan_specs.memory || detail.specs?.memory || 0) / 1024} GB
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center">
                        <HardDrive className="h-5 w-5 text-purple-600 dark:text-purple-400 mr-2" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Storage</span>
                      </div>
                      <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                        {(instance.plan_specs.disk || detail.specs?.disk || 0) / 1024} GB
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center">
                        <Network className="h-5 w-5 text-orange-600 dark:text-orange-400 mr-2" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Transfer</span>
                      </div>
                      <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                        {(instance.plan_specs.transfer || detail.specs?.transfer || 0) / 1000} TB
                      </p>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Instance Details</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Label</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{instance.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Provider ID</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{instance.provider_instance_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">IP Address</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{instance.ip_address || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">IPv6</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{detail.ipv6 || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Region</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{instance.region_label || detail.region}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Image</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{detail.image || instance.configuration?.image || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Created</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(instance.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Backups</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{detail.backups?.enabled ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Monthly Cost</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">${instance.plan_pricing.monthly.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Statistics Tab */}
            {activeTab === 'stats' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Performance Statistics</h3>
                {stats ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Statistics data available. Displaying CPU, network, and disk I/O metrics.
                    </p>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <pre className="text-xs overflow-x-auto text-gray-900 dark:text-white">
                        {JSON.stringify(stats, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Loading statistics...</p>
                  </div>
                )}
              </div>
            )}

            {/* Network Tab */}
            {activeTab === 'network' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Network Configuration</h3>
                {ips ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">IPv4 Addresses</h4>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        {ips.ipv4?.public?.map((ip: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center py-2">
                            <span className="text-sm text-gray-900 dark:text-white">{ip.address}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Public</span>
                          </div>
                        ))}
                        {ips.ipv4?.private?.map((ip: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center py-2">
                            <span className="text-sm text-gray-900 dark:text-white">{ip.address}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Private</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">IPv6</h4>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <p className="text-sm text-gray-900 dark:text-white">{ips.ipv6?.slaac?.address || detail.ipv6 || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Network className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Loading network information...</p>
                  </div>
                )}
              </div>
            )}

            {/* Disks Tab */}
            {activeTab === 'disks' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Disks</h3>
                </div>
                {disks.length > 0 ? (
                  <div className="space-y-3">
                    {disks.map((disk) => (
                      <div key={disk.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">{disk.label}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {disk.size} MB • {disk.filesystem}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            disk.status === 'ready' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                          }`}>
                            {disk.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <HardDrive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No disks found</p>
                  </div>
                )}
              </div>
            )}

            {/* Backups Tab */}
            {activeTab === 'backups' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Backups</h3>
                  <div className="space-x-2">
                    {detail.backups?.enabled ? (
                      <>
                        <button
                          onClick={() => setShowSnapshotModal(true)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Create Snapshot
                        </button>
                        <button
                          onClick={() => handleAction('Cancel backups', '/backups/cancel')}
                          className="inline-flex items-center px-3 py-2 border border-red-300 dark:border-red-600 rounded-md text-sm font-medium text-red-700 dark:text-red-400 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          Cancel Backups
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleAction('Enable backups', '/backups/enable')}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Enable Backups
                      </button>
                    )}
                  </div>
                </div>
                {backups ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Backups {detail.backups?.enabled ? 'enabled' : 'disabled'}
                    </p>
                    {backups.automatic?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Automatic Backups</h4>
                        <div className="space-y-2">
                          {backups.automatic.map((backup: any) => (
                            <div key={backup.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-900 dark:text-white">{backup.label || backup.type}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(backup.created)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {backups.snapshot?.current && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Snapshots</h4>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-900 dark:text-white">{backups.snapshot.current.label}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(backups.snapshot.current.created)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Loading backups...</p>
                  </div>
                )}
              </div>
            )}

            {/* Configurations Tab */}
            {activeTab === 'configs' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Configuration Profiles</h3>
                {configs.length > 0 ? (
                  <div className="space-y-3">
                    {configs.map((config) => (
                      <div key={config.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 dark:text-white">{config.label}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Kernel: {config.kernel} • Root Device: {config.root_device}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No configurations found</p>
                  </div>
                )}
              </div>
            )}

            {/* Volumes Tab */}
            {activeTab === 'volumes' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Block Storage Volumes</h3>
                {volumes.length > 0 ? (
                  <div className="space-y-3">
                    {volumes.map((volume) => (
                      <div key={volume.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="flex justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">{volume.label}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {volume.size} GB • {volume.status}
                            </p>
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">{volume.filesystem_path}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Layers className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No volumes attached</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals can be implemented here */}
      {/* For brevity, modal implementations are simplified - they would need full forms */}
    </div>
  );
}