/**
 * VPS Management Page
 * Handles Linode VPS instance creation, management, and monitoring
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Server, 
  Plus, 
  Play, 
  Square, 
  Trash2, 
  Settings, 
  Terminal, 
  Eye,
  RefreshCw,
  Search,
  Filter,
  Monitor,
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  MapPin,
  DollarSign,
  Clock,
  Power,
  PowerOff
} from 'lucide-react';
import { toast } from 'sonner';
// Navigation provided by AppLayout
import { useAuth } from '../contexts/AuthContext';

interface VPSInstance {
  id: string;
  label: string;
  status: 'running' | 'stopped' | 'provisioning' | 'rebooting' | 'error';
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

interface CreateVPSForm {
  label: string;
  type: string;
  region: string;
  image: string;
  rootPassword: string;
  sshKeys: string[];
  backups: boolean;
  privateIP: boolean;
}

interface LinodeType {
  id: string;
  label: string;
  disk: number;
  memory: number;
  vcpus: number;
  transfer: number;
  region?: string;
  price: {
    hourly: number;
    monthly: number;
  };
}

interface LinodeRegion {
  id: string;
  label: string;
  country: string;
}

const VPS: React.FC = () => {
  const [instances, setInstances] = useState<VPSInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; label: string; input: string; loading: boolean; error: string }>({ open: false, id: '', label: '', input: '', loading: false, error: '' });
  const [selectedInstance, setSelectedInstance] = useState<VPSInstance | null>(null);
  const [createForm, setCreateForm] = useState<CreateVPSForm>({
    label: '',
    type: '',
    region: 'us-east',
    image: 'linode/ubuntu22.04',
    rootPassword: '',
    sshKeys: [],
    backups: false,
    privateIP: false
  });
  const { token } = useAuth();
  const [linodeTypes, setLinodeTypes] = useState<LinodeType[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Regions allowed by admin configuration: derive strictly from configured VPS plans
  const allowedRegions: LinodeRegion[] = useMemo(() => {
    const ids = Array.from(new Set((linodeTypes || [])
      .map(t => t.region)
      .filter((r): r is string => typeof r === 'string' && r.trim().length > 0)));
    return ids.map(id => ({ id, label: id, country: '' }));
  }, [linodeTypes]);

  const osImages = [
    { id: 'linode/ubuntu24.04', label: 'Ubuntu 24.04 LTS' },
    { id: 'linode/ubuntu22.04', label: 'Ubuntu 22.04 LTS' },
    { id: 'linode/ubuntu20.04', label: 'Ubuntu 20.04 LTS' },
    { id: 'linode/debian12', label: 'Debian 12' },
    { id: 'linode/debian11', label: 'Debian 11' },
    { id: 'linode/debian10', label: 'Debian 10' },
    { id: 'linode/centos-stream9', label: 'CentOS Stream 9' },
    { id: 'linode/centos-stream8', label: 'CentOS Stream 8' },
    { id: 'linode/rocky9', label: 'Rocky Linux 9' },
    { id: 'linode/rocky8', label: 'Rocky Linux 8' },
    { id: 'linode/almalinux9', label: 'AlmaLinux 9' },
    { id: 'linode/almalinux8', label: 'AlmaLinux 8' },
    { id: 'linode/fedora39', label: 'Fedora 39' },
    { id: 'linode/fedora38', label: 'Fedora 38' },
    { id: 'linode/alpine3.19', label: 'Alpine 3.19' },
    { id: 'linode/alpine3.18', label: 'Alpine 3.18' },
    { id: 'linode/arch', label: 'Arch Linux' },
    { id: 'linode/gentoo', label: 'Gentoo' },
    { id: 'linode/opensuse-leap15.5', label: 'openSUSE Leap 15.5' },
    { id: 'linode/slackware15.0', label: 'Slackware 15.0' }
  ];

  useEffect(() => {
    // Load plans first so instance mapping can derive specs and pricing
    (async () => {
      await loadVPSPlans();
      await loadInstances();
    })();
  }, []);

  // Simple polling: refresh instances while any are provisioning or rebooting
  useEffect(() => {
    const hasPending = instances.some(i => i.status === 'provisioning' || i.status === 'rebooting');
    if (!hasPending) return;
    const interval = setInterval(() => {
      loadInstances();
    }, 10000);
    return () => clearInterval(interval);
  }, [instances]);

  const loadVPSPlans = async () => {
    setLoadingPlans(true);
    try {
      const res = await fetch('/api/admin/plans', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load VPS plans');

      // Map admin plans to LinodeType format
      const mappedPlans: LinodeType[] = (payload.plans || []).map((plan: any) => {
        const specs = plan.specifications || {};
        const basePrice = Number(plan.base_price || 0);
        const markupPrice = Number(plan.markup_price || 0);
        const totalPrice = basePrice + markupPrice;

        // Normalize spec fields from various sources
        const disk =
          (typeof specs.disk === 'number' ? specs.disk : undefined) ??
          (typeof specs.storage_gb === 'number' ? specs.storage_gb : undefined) ??
          0;

        const memoryMb =
          (typeof specs.memory === 'number' ? specs.memory : undefined) ??
          (typeof specs.memory_gb === 'number' ? specs.memory_gb * 1024 : undefined) ??
          0;

        const vcpus =
          (typeof specs.vcpus === 'number' ? specs.vcpus : undefined) ??
          (typeof specs.cpu_cores === 'number' ? specs.cpu_cores : undefined) ??
          0;

        const transferGb =
          (typeof specs.transfer === 'number' ? specs.transfer : undefined) ??
          (typeof specs.transfer_gb === 'number' ? specs.transfer_gb : undefined) ??
          (typeof specs.bandwidth_gb === 'number' ? specs.bandwidth_gb : undefined) ??
          0;

        const region = plan.region_id || specs.region || '';

        return {
          id: plan.provider_plan_id || plan.id,
          label: `${plan.name} - $${totalPrice.toFixed(2)}/mo`,
          disk: disk,
          memory: memoryMb,
          vcpus: vcpus,
          transfer: transferGb,
          region,
          price: {
            hourly: totalPrice / 730,
            monthly: totalPrice
          }
        };
      });

      setLinodeTypes(mappedPlans);
    } catch (error: any) {
      console.error('Failed to load VPS plans:', error);
      toast.error(error.message || 'Failed to load VPS plans');
    } finally {
      setLoadingPlans(false);
    }
  };

  const loadInstances = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vps', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load VPS instances');

      const mapped: VPSInstance[] = (payload.instances || []).map((i: any) => {
        // Prefer API-provided plan specs/pricing; fallback to loaded plans; else zeros
        const apiSpecs = i.plan_specs || null;
        const apiPricing = i.plan_pricing || null;
        const planForType = linodeTypes.find(t => t.id === (i.configuration?.type || ''));
        const specs = apiSpecs ? {
          vcpus: Number(apiSpecs.vcpus || 0),
          memory: Number(apiSpecs.memory || 0),
          disk: Number(apiSpecs.disk || 0),
          transfer: Number(apiSpecs.transfer || 0),
        } : planForType ? {
          vcpus: planForType.vcpus,
          memory: planForType.memory,
          disk: planForType.disk,
          transfer: planForType.transfer,
        } : { vcpus: 0, memory: 0, disk: 0, transfer: 0 };
        const pricing = apiPricing ? {
          hourly: Number(apiPricing.hourly || 0),
          monthly: Number(apiPricing.monthly || 0),
        } : planForType ? {
          hourly: planForType.price.hourly,
          monthly: planForType.price.monthly,
        } : { hourly: 0, monthly: 0 };
        // Normalize status: treat provider 'offline' as 'stopped' for UI/actions
        const normalizedStatus = ((i.status as any) || 'provisioning') === 'offline' ? 'stopped' : ((i.status as any) || 'provisioning');
        return ({
        id: i.id,
        label: i.label,
        status: normalizedStatus,
        type: i.configuration?.type || '',
        region: i.configuration?.region || '',
        regionLabel: i.region_label || undefined,
        image: i.configuration?.image || '',
        ipv4: i.ip_address ? [i.ip_address] : [],
        ipv6: '',
        created: i.created_at,
        specs,
        stats: { cpu: 0, memory: 0, disk: 0, network: { in: 0, out: 0 }, uptime: '' },
        pricing
      });
      });

      setInstances(mapped);
    } catch (error: any) {
      console.error('Failed to load VPS instances:', error);
      toast.error(error.message || 'Failed to load VPS instances');
    } finally {
      setLoading(false);
    }
  };

  const handleInstanceAction = async (instanceId: string, action: 'boot' | 'shutdown' | 'reboot' | 'delete') => {
    try {
      if (action === 'delete') {
        const inst = instances.find(i => i.id === instanceId);
        setDeleteModal({ open: true, id: instanceId, label: inst?.label || '', input: '', loading: false, error: '' });
        return;
      }
      let url = `/api/vps/${instanceId}`;
      let method: 'POST' | 'DELETE' = 'POST';
      if (action === 'boot') url += '/boot';
      else if (action === 'shutdown') url += '/shutdown';
      else if (action === 'reboot') url += '/reboot';

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Failed to ${action} instance`);

      // Refresh from server for accurate status/IP sync
      await loadInstances();
      toast.success(`Instance ${action} initiated successfully`);
    } catch (error: any) {
      console.error(`Failed to ${action} instance:`, error);
      toast.error(error.message || `Failed to ${action} instance`);
    }
  };

  const confirmDeleteInstance = async () => {
    try {
      if (deleteModal.input.trim() !== deleteModal.label.trim()) {
        setDeleteModal(m => ({ ...m, error: 'Name does not match. Type the exact server name.' }));
        return;
      }
      setDeleteModal(m => ({ ...m, loading: true, error: '' }));
      const res = await fetch(`/api/vps/${deleteModal.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete instance');
      setDeleteModal({ open: false, id: '', label: '', input: '', loading: false, error: '' });
      await loadInstances();
      toast.success('Instance deleted');
    } catch (err: any) {
      setDeleteModal(m => ({ ...m, loading: false, error: err.message || 'Failed to delete instance' }));
      console.error('Delete instance error:', err);
    }
  };

  const handleCreateInstance = async () => {
    if (!createForm.label || !createForm.rootPassword) {
      toast.error('Label and root password are required');
      return;
    }

    try {
      const res = await fetch('/api/vps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          label: createForm.label,
          type: createForm.type,
          region: createForm.region,
          image: createForm.image,
          rootPassword: createForm.rootPassword,
          sshKeys: createForm.sshKeys,
          backups: createForm.backups,
          privateIP: createForm.privateIP,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to create VPS');
      }

      // Refresh list from server to reflect new instance
      await loadInstances();

      setShowCreateModal(false);
      setCreateForm({
        label: '',
        type: '',
        region: 'us-east',
        image: 'linode/ubuntu22.04',
        rootPassword: '',
        sshKeys: [],
        backups: false,
        privateIP: false
      });
      toast.success('VPS instance creation initiated');
    } catch (error) {
      console.error('Failed to create VPS instance:', error);
      toast.error('Failed to create VPS instance');
    }
  };

  const filteredInstances = instances.filter(instance => {
    const matchesSearch = instance.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         instance.ipv4[0].includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || instance.status === statusFilter;
    const matchesRegion = regionFilter === 'all' || instance.region === regionFilter;
    return matchesSearch && matchesStatus && matchesRegion;
  });

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'running':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'stopped':
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800';
      case 'provisioning':
        return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20';
      case 'rebooting':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
      case 'error':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800';
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 GB';
    const gb = bytes / 1024;
    return `${gb.toFixed(0)} GB`;
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

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading VPS instances...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">VPS Management</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Manage your VPS instances and monitor their performance
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-800"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create VPS
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search instances..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
              >
                <option value="all">All Status</option>
                <option value="running">Running</option>
                <option value="stopped">Stopped</option>
                <option value="provisioning">Provisioning</option>
                <option value="rebooting">Rebooting</option>
              </select>
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
              >
                <option value="all">All Regions</option>
                {allowedRegions.map(region => (
                  <option key={region.id} value={region.id}>{region.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={loadInstances}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-800"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* VPS Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Power className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Running</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {instances.filter(i => i.status === 'running').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <PowerOff className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Stopped</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {instances.filter(i => i.status === 'stopped').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Server className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{instances.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Monthly Cost</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(instances.reduce((sum, i) => sum + i.pricing.monthly, 0))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* VPS List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">VPS Instances ({filteredInstances.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Instance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Specs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Resources
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredInstances.map((instance) => (
                  <tr key={instance.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <Server className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{instance.label}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                  {instance.ipv4[0]} • {(instance.regionLabel || allowedRegions.find(r => r.id === instance.region)?.label || instance.region)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(instance.status)}`}>
                        {instance.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div className="space-y-1">
                        <div className="flex items-center">
                          <Cpu className="h-3 w-3 text-gray-400 dark:text-gray-500 mr-1" />
                          <span>{instance.specs.vcpus} vCPU</span>
                        </div>
                        <div className="flex items-center">
                          <MemoryStick className="h-3 w-3 text-gray-400 dark:text-gray-500 mr-1" />
                          <span>{formatBytes(instance.specs.memory)}</span>
                        </div>
                        <div className="flex items-center">
                          <HardDrive className="h-3 w-3 text-gray-400 dark:text-gray-500 mr-1" />
                          <span>{instance.specs.disk} GB</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div className="space-y-1">
                        <div>CPU: {instance.stats.cpu}%</div>
                        <div>Memory: {instance.stats.memory}%</div>
                        <div>Disk: {instance.stats.disk}%</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div className="space-y-1">
                        <div>{formatCurrency(instance.pricing.monthly)}/mo</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(instance.pricing.hourly)}/hr</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {instance.status === 'running' ? (
                          <>
                            <button
                              onClick={() => handleInstanceAction(instance.id, 'shutdown')}
                              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                              title="Shutdown"
                            >
                              <Square className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleInstanceAction(instance.id, 'reboot')}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Reboot"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                          </>
                        ) : instance.status === 'stopped' ? (
                          <button
                            onClick={() => handleInstanceAction(instance.id, 'boot')}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            title="Boot"
                          >
                            <Play className="h-4 w-4" />
                          </button>
                        ) : null}
                        <Link
                          to={`/vps/${instance.id}`}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleInstanceAction(instance.id, 'delete')}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete"
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
        </div>

        {/* Create VPS Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Create New VPS Instance</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Label *
                    </label>
                    <input
                      type="text"
                      value={createForm.label}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, label: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                      placeholder="my-server"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Plan
                    </label>
                    <select
                      value={createForm.type}
                      onChange={(e) => {
                        const newType = e.target.value;
                        const selectedType = linodeTypes.find(t => t.id === newType);
                        setCreateForm(prev => ({
                          ...prev,
                          type: newType,
                          // Respect pre-configured region from the plan
                          region: selectedType?.region || prev.region,
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                    >
                      <option value="">Click to choose plan</option>
                      {linodeTypes.map(type => (
                        <option key={type.id} value={type.id}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Image
                    </label>
                    <select
                      value={createForm.image}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, image: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                    >
                      {osImages.map(image => (
                        <option key={image.id} value={image.id}>
                          {image.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Root Password *
                    </label>
                    <input
                      type="password"
                      value={createForm.rootPassword}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, rootPassword: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                      placeholder="Enter a strong password"
                    />
                  </div>

                  <div className="flex items-center space-x-6">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={createForm.backups}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, backups: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Enable Backups (+20%)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={createForm.privateIP}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, privateIP: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Private IP</span>
                    </label>
                  </div>

                  {/* Plan Details */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Plan Details</h4>
                    {createForm.type && linodeTypes.length > 0 ? (
                      (() => {
                        const selectedType = linodeTypes.find(t => t.id === createForm.type);
                        if (!selectedType) return null;
  const selectedRegion = selectedType.region ? allowedRegions.find(r => r.id === selectedType.region) : null;
                        return (
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">vCPUs:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">{selectedType.vcpus}</span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Memory:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">{formatBytes(selectedType.memory)}</span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Storage:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">{selectedType.disk} GB</span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Transfer:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">{selectedType.transfer} GB</span>
                            </div>
                            {selectedRegion && (
                              <div className="col-span-2">
                                <span className="text-gray-600 dark:text-gray-400">Region:</span>
                                <span className="ml-2 font-medium text-gray-900 dark:text-white">{selectedRegion.label}</span>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Select a plan above to view specifications and pricing details
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateInstance}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-800"
                  >
                    Create VPS
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {deleteModal.open && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-full max-w-lg shadow-lg rounded-md bg-white dark:bg-gray-800">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Confirm Delete</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">To confirm deletion, type the server name exactly:</p>
                <p className="mt-2 text-sm font-mono px-2 py-1 inline-block bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded">{deleteModal.label}</p>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Server name</label>
                  <input
                    type="text"
                    value={deleteModal.input}
                    onChange={(e) => setDeleteModal(m => ({ ...m, input: e.target.value, error: '' }))}
                    placeholder="Type the server name to confirm"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  {deleteModal.error && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{deleteModal.error}</p>
                  )}
                </div>
                <div className="flex items-center justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setDeleteModal({ open: false, id: '', label: '', input: '', loading: false, error: '' })}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-red-400 dark:focus:ring-offset-gray-800"
                    disabled={deleteModal.loading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteInstance}
                    disabled={deleteModal.loading || deleteModal.input.trim() !== deleteModal.label.trim()}
                    className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${deleteModal.input.trim() === deleteModal.label.trim() ? 'bg-red-600 hover:bg-red-700' : 'bg-red-400 cursor-not-allowed'}`}
                  >
                    {deleteModal.loading ? 'Deleting...' : 'Delete Server'}
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

export default VPS;