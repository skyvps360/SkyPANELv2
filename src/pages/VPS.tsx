/**
 * VPS Management Page
 * Handles Linode VPS instance creation, management, and monitoring
 */

import React, { useState, useEffect } from 'react';
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
  const [selectedInstance, setSelectedInstance] = useState<VPSInstance | null>(null);
  const [createForm, setCreateForm] = useState<CreateVPSForm>({
    label: '',
    type: 'g6-nanode-1',
    region: 'us-east',
    image: 'linode/ubuntu22.04',
    rootPassword: '',
    sshKeys: [],
    backups: false,
    privateIP: false
  });
  const { token } = useAuth();

  // Mock data for Linode types and regions
  const linodeTypes: LinodeType[] = [
    {
      id: 'g6-nanode-1',
      label: 'Nanode 1GB',
      disk: 25,
      memory: 1024,
      vcpus: 1,
      transfer: 1000,
      price: { hourly: 0.0075, monthly: 5 }
    },
    {
      id: 'g6-standard-1',
      label: 'Linode 2GB',
      disk: 50,
      memory: 2048,
      vcpus: 1,
      transfer: 2000,
      price: { hourly: 0.015, monthly: 10 }
    },
    {
      id: 'g6-standard-2',
      label: 'Linode 4GB',
      disk: 80,
      memory: 4096,
      vcpus: 2,
      transfer: 4000,
      price: { hourly: 0.03, monthly: 20 }
    },
    {
      id: 'g6-standard-4',
      label: 'Linode 8GB',
      disk: 160,
      memory: 8192,
      vcpus: 4,
      transfer: 5000,
      price: { hourly: 0.06, monthly: 40 }
    }
  ];

  const linodeRegions: LinodeRegion[] = [
    { id: 'us-east', label: 'Newark, NJ', country: 'US' },
    { id: 'us-west', label: 'Fremont, CA', country: 'US' },
    { id: 'us-central', label: 'Dallas, TX', country: 'US' },
    { id: 'eu-west', label: 'London, UK', country: 'UK' },
    { id: 'eu-central', label: 'Frankfurt, DE', country: 'DE' },
    { id: 'ap-south', label: 'Singapore, SG', country: 'SG' },
    { id: 'ap-northeast', label: 'Tokyo, JP', country: 'JP' }
  ];

  const linodeImages = [
    'linode/ubuntu22.04',
    'linode/ubuntu20.04',
    'linode/debian11',
    'linode/centos7',
    'linode/fedora37',
    'linode/alpine3.17'
  ];

  useEffect(() => {
    loadInstances();
  }, []);

  const loadInstances = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vps', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load VPS instances');

      const mapped: VPSInstance[] = (payload.instances || []).map((i: any) => ({
        id: i.id,
        label: i.label,
        status: (i.status as any) || 'provisioning',
        type: i.configuration?.type || '',
        region: i.configuration?.region || '',
        image: i.configuration?.image || '',
        ipv4: i.ip_address ? [i.ip_address] : [],
        ipv6: '',
        created: i.created_at,
        specs: { vcpus: 0, memory: 0, disk: 0, transfer: 0 },
        stats: { cpu: 0, memory: 0, disk: 0, network: { in: 0, out: 0 }, uptime: '' },
        pricing: { hourly: 0, monthly: 0 }
      }));

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
      // Mock API call - replace with actual Linode API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setInstances(prev => prev.map(instance => {
        if (instance.id === instanceId) {
          let newStatus = instance.status;
          switch (action) {
            case 'boot':
              newStatus = 'running';
              break;
            case 'shutdown':
              newStatus = 'stopped';
              break;
            case 'reboot':
              newStatus = 'rebooting';
              setTimeout(() => {
                setInstances(current => current.map(inst => 
                  inst.id === instanceId ? { ...inst, status: 'running' } : inst
                ));
              }, 3000);
              break;
          }
          return { ...instance, status: newStatus };
        }
        return instance;
      }));

      if (action === 'delete') {
        setInstances(prev => prev.filter(i => i.id !== instanceId));
      }

      toast.success(`Instance ${action} initiated successfully`);
    } catch (error) {
      console.error(`Failed to ${action} instance:`, error);
      toast.error(`Failed to ${action} instance`);
    }
  };

  const handleCreateInstance = async () => {
    if (!createForm.label || !createForm.rootPassword) {
      toast.error('Label and root password are required');
      return;
    }

    try {
      // Mock API call - replace with actual Linode API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const selectedType = linodeTypes.find(t => t.id === createForm.type)!;
      const selectedRegion = linodeRegions.find(r => r.id === createForm.region)!;
      
      const newInstance: VPSInstance = {
        id: `vps${Date.now()}`,
        label: createForm.label,
        status: 'provisioning',
        type: createForm.type,
        region: createForm.region,
        image: createForm.image,
        ipv4: [`192.168.1.${Math.floor(Math.random() * 255)}`],
        ipv6: `2600:3c01::f03c:92ff:fe1a:${Math.random().toString(16).substr(2, 4)}`,
        created: new Date().toISOString(),
        specs: {
          vcpus: selectedType.vcpus,
          memory: selectedType.memory,
          disk: selectedType.disk,
          transfer: selectedType.transfer
        },
        stats: {
          cpu: 0,
          memory: 0,
          disk: 0,
          network: { in: 0, out: 0 },
          uptime: '0h'
        },
        pricing: selectedType.price
      };

      setInstances(prev => [...prev, newInstance]);
      
      // Simulate provisioning completion
      setTimeout(() => {
        setInstances(current => current.map(inst => 
          inst.id === newInstance.id ? { ...inst, status: 'running' } : inst
        ));
      }, 5000);

      setShowCreateModal(false);
      setCreateForm({
        label: '',
        type: 'g6-nanode-1',
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
        return 'text-green-600 bg-green-100';
      case 'stopped':
        return 'text-gray-600 bg-gray-100';
      case 'provisioning':
        return 'text-blue-600 bg-blue-100';
      case 'rebooting':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading VPS instances...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">VPS Management</h1>
              <p className="mt-2 text-gray-600">
                Manage your Linode VPS instances and monitor their performance
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create VPS
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search instances..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Regions</option>
                {linodeRegions.map(region => (
                  <option key={region.id} value={region.id}>{region.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={loadInstances}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* VPS Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Power className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Running</p>
                <p className="text-2xl font-bold text-gray-900">
                  {instances.filter(i => i.status === 'running').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <PowerOff className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Stopped</p>
                <p className="text-2xl font-bold text-gray-900">
                  {instances.filter(i => i.status === 'stopped').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Server className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{instances.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Monthly Cost</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(instances.reduce((sum, i) => sum + i.pricing.monthly, 0))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* VPS List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">VPS Instances ({filteredInstances.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Instance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Specs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resources
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInstances.map((instance) => (
                  <tr key={instance.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <Server className="h-8 w-8 text-gray-400" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{instance.label}</div>
                          <div className="text-sm text-gray-500">
                            {instance.ipv4[0]} • {linodeRegions.find(r => r.id === instance.region)?.label}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(instance.status)}`}>
                        {instance.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="space-y-1">
                        <div className="flex items-center">
                          <Cpu className="h-3 w-3 text-gray-400 mr-1" />
                          <span>{instance.specs.vcpus} vCPU</span>
                        </div>
                        <div className="flex items-center">
                          <MemoryStick className="h-3 w-3 text-gray-400 mr-1" />
                          <span>{formatBytes(instance.specs.memory)}</span>
                        </div>
                        <div className="flex items-center">
                          <HardDrive className="h-3 w-3 text-gray-400 mr-1" />
                          <span>{instance.specs.disk} GB</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="space-y-1">
                        <div>CPU: {instance.stats.cpu}%</div>
                        <div>Memory: {instance.stats.memory}%</div>
                        <div>Disk: {instance.stats.disk}%</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="space-y-1">
                        <div>{formatCurrency(instance.pricing.monthly)}/mo</div>
                        <div className="text-xs text-gray-500">{formatCurrency(instance.pricing.hourly)}/hr</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {instance.status === 'running' ? (
                          <>
                            <button
                              onClick={() => handleInstanceAction(instance.id, 'shutdown')}
                              className="text-gray-600 hover:text-gray-900"
                              title="Shutdown"
                            >
                              <Square className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleInstanceAction(instance.id, 'reboot')}
                              className="text-blue-600 hover:text-blue-900"
                              title="Reboot"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                          </>
                        ) : instance.status === 'stopped' ? (
                          <button
                            onClick={() => handleInstanceAction(instance.id, 'boot')}
                            className="text-green-600 hover:text-green-900"
                            title="Boot"
                          >
                            <Play className="h-4 w-4" />
                          </button>
                        ) : null}
                        <Link
                          to={`/vps/${instance.id}`}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleInstanceAction(instance.id, 'delete')}
                          className="text-red-600 hover:text-red-900"
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
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create New VPS Instance</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Label *
                    </label>
                    <input
                      type="text"
                      value={createForm.label}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, label: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="my-server"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Plan
                      </label>
                      <select
                        value={createForm.type}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {linodeTypes.map(type => (
                          <option key={type.id} value={type.id}>
                            {type.label} - {formatCurrency(type.price.monthly)}/mo
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Region
                      </label>
                      <select
                        value={createForm.region}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, region: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {linodeRegions.map(region => (
                          <option key={region.id} value={region.id}>
                            {region.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Image
                    </label>
                    <select
                      value={createForm.image}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, image: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {linodeImages.map(image => (
                        <option key={image} value={image}>
                          {image}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Root Password *
                    </label>
                    <input
                      type="password"
                      value={createForm.rootPassword}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, rootPassword: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter a strong password"
                    />
                  </div>

                  <div className="flex items-center space-x-6">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={createForm.backups}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, backups: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Enable Backups (+20%)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={createForm.privateIP}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, privateIP: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Private IP</span>
                    </label>
                  </div>

                  {/* Plan Details */}
                  {createForm.type && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Plan Details</h4>
                      {(() => {
                        const selectedType = linodeTypes.find(t => t.id === createForm.type)!;
                        return (
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">vCPUs:</span>
                              <span className="ml-2 font-medium">{selectedType.vcpus}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Memory:</span>
                              <span className="ml-2 font-medium">{formatBytes(selectedType.memory)}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Storage:</span>
                              <span className="ml-2 font-medium">{selectedType.disk} GB SSD</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Transfer:</span>
                              <span className="ml-2 font-medium">{selectedType.transfer} GB</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateInstance}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Create VPS
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