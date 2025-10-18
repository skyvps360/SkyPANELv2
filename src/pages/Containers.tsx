/**
 * Container Management Page
 * Handles Docker container creation, management, and monitoring
 */

import React, { useState, useEffect } from 'react';
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
  Activity, 
  Cpu, 
  MemoryStick 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Status } from '@/components/ui/status';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
// Navigation provided by AppLayout
import { useAuth } from '../contexts/AuthContext';

interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: 'running' | 'stopped' | 'paused' | 'restarting' | 'starting' | 'stopping' | 'error';
  created: string;
  ports: string[];
  volumes: string[];
  environment: Record<string, string>;
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
  ports: string;
  volumes: string;
  environment: string;
  command: string;
  restart: 'no' | 'always' | 'unless-stopped' | 'on-failure';
}

const Containers: React.FC = () => {
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState<ContainerInfo | null>(null);
  const [createForm, setCreateForm] = useState<CreateContainerForm>({
    name: '',
    image: '',
    ports: '',
    volumes: '',
    environment: '',
    command: '',
    restart: 'unless-stopped'
  });
  const { token } = useAuth();

  useEffect(() => {
    loadContainers();
  }, []);

  const loadContainers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/containers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load containers');

      const mapped: ContainerInfo[] = (payload.containers || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        image: c.image,
        status: (c.status as any) || 'stopped',
        created: c.created_at,
        ports: c.config?.ports ?? [],
        volumes: c.config?.volumes ?? [],
        environment: c.config?.environment ?? {},
        stats: { cpu: 0, memory: 0, network: { rx: 0, tx: 0 }, uptime: '' }
      }));

      setContainers(mapped);
    } catch (error: any) {
      console.error('Failed to load containers:', error);
      toast.error(error.message || 'Failed to load containers');
    } finally {
      setLoading(false);
    }
  };

  const handleContainerAction = async (containerId: string, action: 'start' | 'stop' | 'restart' | 'remove') => {
    try {
      // Set intermediate status for progress indication
      if (action === 'start') {
        setContainers(prev => prev.map(container => 
          container.id === containerId ? { ...container, status: 'starting' } : container
        ));
      } else if (action === 'stop') {
        setContainers(prev => prev.map(container => 
          container.id === containerId ? { ...container, status: 'stopping' } : container
        ));
      } else if (action === 'restart') {
        setContainers(prev => prev.map(container => 
          container.id === containerId ? { ...container, status: 'restarting' } : container
        ));
      }

      // Mock API call - replace with actual Docker API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setContainers(prev => prev.map(container => {
        if (container.id === containerId) {
          let newStatus = container.status;
          switch (action) {
            case 'start':
              newStatus = 'running';
              break;
            case 'stop':
              newStatus = 'stopped';
              break;
            case 'restart':
              newStatus = 'running';
              break;
          }
          return { ...container, status: newStatus };
        }
        return container;
      }));

      if (action === 'remove') {
        setContainers(prev => prev.filter(c => c.id !== containerId));
      }

      toast.success(`Container ${action}ed successfully`);
    } catch (error) {
      console.error(`Failed to ${action} container:`, error);
      toast.error(`Failed to ${action} container`);
      // Revert status on error
      loadContainers();
    }
  };

  const handleCreateContainer = async () => {
    if (!createForm.name || !createForm.image) {
      toast.error('Name and image are required');
      return;
    }

    try {
      // Mock API call - replace with actual Docker API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const newContainer: ContainerInfo = {
        id: `c${Date.now()}`,
        name: createForm.name,
        image: createForm.image,
        status: 'running',
        created: new Date().toISOString(),
        ports: createForm.ports ? createForm.ports.split(',').map(p => p.trim()) : [],
        volumes: createForm.volumes ? createForm.volumes.split(',').map(v => v.trim()) : [],
        environment: createForm.environment ? JSON.parse(createForm.environment) : {},
        stats: {
          cpu: 0,
          memory: 0,
          network: { rx: 0, tx: 0 },
          uptime: '0h'
        }
      };

      setContainers(prev => [...prev, newContainer]);
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        image: '',
        ports: '',
        volumes: '',
        environment: '',
        command: '',
        restart: 'unless-stopped'
      });
      toast.success('Container created successfully');
    } catch (error) {
      console.error('Failed to create container:', error);
      toast.error('Failed to create container');
    }
  };

  const filteredContainers = containers.filter(container => {
    const matchesSearch = container.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         container.image.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || container.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'running':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'stopped':
        return 'text-muted-foreground bg-gray-100 text-muted-foreground bg-card';
      case 'paused':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
      case 'restarting':
        return 'text-primary bg-primary/10 dark:text-primary dark:bg-primary/20';
      case 'error':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
      default:
        return 'text-muted-foreground bg-gray-100 text-muted-foreground bg-card';
    }
  };

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

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
                        <div className="flex items-center">
                          <Cpu className="h-3 w-3 text-muted-foreground  mr-1" />
                          <span>{container.stats.cpu}%</span>
                        </div>
                        <div className="flex items-center">
                          <MemoryStick className="h-3 w-3 text-muted-foreground  mr-1" />
                          <span>{container.stats.memory}%</span>
                        </div>
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
                          onClick={() => handleContainerAction(container.id, 'remove')}
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
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Container Name *
                      </label>
                      <input
                        type="text"
                        value={createForm.name}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border rounded-md bg-secondary text-foreground placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        placeholder="my-container"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Docker Image *
                      </label>
                      <input
                        type="text"
                        value={createForm.image}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, image: e.target.value }))}
                        className="w-full px-3 py-2 border border rounded-md bg-secondary text-foreground placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        placeholder="nginx:latest"
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
                      placeholder="80:8080, 443:8443"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Comma-separated list (host:container)</p>
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
                    <p className="text-xs text-muted-foreground mt-1">Comma-separated list (host:container)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Environment Variables (JSON)
                    </label>
                    <textarea
                      value={createForm.environment}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, environment: e.target.value }))}
                      className="w-full px-3 py-2 border border rounded-md bg-secondary text-foreground placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      rows={3}
                      placeholder='{"NODE_ENV": "production", "PORT": "3000"}'
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

                <div className="flex items-center justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border rounded-md text-sm font-medium text-muted-foreground bg-secondary hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateContainer}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    Create Container
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
