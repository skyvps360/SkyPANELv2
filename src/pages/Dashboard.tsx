/**
 * Dashboard Component
 * Main overview page showing containers, VPS instances, billing, and recent activity
 */

import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Container, 
  Wallet, 
  Activity, 
  TrendingUp, 
  AlertTriangle,
  Plus,
  Eye,
  Settings,
  Play,
  Pause,
  Square,
  Monitor,
  HardDrive,
  Cpu,
  MemoryStick
} from 'lucide-react';
// Layout provides Navigation and Sidebar globally
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Mock data interfaces
interface ContainerStats {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error';
  image: string;
  cpu: number;
  memory: number;
  uptime: string;
}

interface VPSStats {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'provisioning';
  plan: string;
  location: string;
  cpu: number;
  memory: number;
  storage: number;
  ip: string;
}

interface BillingStats {
  walletBalance: number;
  monthlySpend: number;
  lastPayment: {
    amount: number;
    date: string;
  };
}

interface ActivityItem {
  id: string;
  type: 'container' | 'vps' | 'billing' | 'support';
  message: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'info';
}

const Dashboard: React.FC = () => {
  const [containers, setContainers] = useState<ContainerStats[]>([]);
  const [vpsInstances, setVpsInstances] = useState<VPSStats[]>([]);
  const [billing, setBilling] = useState<BillingStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [containersRes, vpsRes, walletRes, paymentsRes] = await Promise.all([
        fetch('/api/containers', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/vps', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/payments/wallet/balance', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/payments/history?limit=1&status=completed', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const [containersData, vpsData, walletData, paymentsData] = await Promise.all([
        containersRes.json(), vpsRes.json(), walletRes.json(), paymentsRes.json()
      ]);

      if (!containersRes.ok) throw new Error(containersData.error || 'Failed to load containers');
      if (!vpsRes.ok) throw new Error(vpsData.error || 'Failed to load VPS instances');
      if (!walletRes.ok) throw new Error(walletData.error || 'Failed to load wallet');
      if (!paymentsRes.ok) throw new Error(paymentsData.error || 'Failed to load payment history');

      const containersMapped: ContainerStats[] = (containersData.containers || []).map((c: any) => ({
        id: c.id,
        name: c.name || c.container_name || 'container',
        status: (c.status as any) || 'running',
        image: c.image || '',
        cpu: 0,
        memory: 0,
        uptime: '',
      }));
      setContainers(containersMapped);

      const vpsMapped: VPSStats[] = (vpsData.instances || []).map((i: any) => ({
        id: i.id,
        name: i.label || 'instance',
        status: (i.status as any) || 'provisioning',
        plan: i.configuration?.type || '',
        location: i.configuration?.region || '',
        cpu: 0,
        memory: 0,
        storage: 0,
        ip: i.ip_address || '',
      }));
      setVpsInstances(vpsMapped);

      const lastPaymentItem = (paymentsData.payments || [])[0];
      setBilling({
        walletBalance: walletData.balance ?? 0,
        monthlySpend: 0,
        lastPayment: {
          amount: lastPaymentItem?.amount ?? 0,
          date: lastPaymentItem?.created_at ?? ''
        }
      });

      setRecentActivity([]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'running':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20';
      case 'stopped':
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800';
      case 'error':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20';
      case 'provisioning':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'container':
        return <Container className="h-4 w-4" />;
      case 'vps':
        return <Server className="h-4 w-4" />;
      case 'billing':
        return <Wallet className="h-4 w-4" />;
      case 'support':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityStatusColor = (status: string): string => {
    switch (status) {
      case 'success':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20';
      case 'error':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20';
      case 'info':
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Overview of your containers, VPS instances, and account status
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Container className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Containers</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {containers.filter(c => c.status === 'running').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Server className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">VPS Instances</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {vpsInstances.filter(v => v.status === 'running').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Wallet className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Wallet Balance</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {billing ? formatCurrency(billing.walletBalance) : '$0.00'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Monthly Spend</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {billing ? formatCurrency(billing.monthlySpend) : '$0.00'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Containers Overview */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Containers</h2>
                <Link
                  to="/containers"
                  className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Container
                </Link>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {containers.slice(0, 3).map((container) => (
                  <div key={container.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Container className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{container.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{container.image}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">CPU: {container.cpu}%</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Memory: {container.memory}%</p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(container.status)}`}>
                        {container.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Link
                  to="/containers"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium"
                >
                  View all containers →
                </Link>
              </div>
            </div>
          </div>

          {/* VPS Overview */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">VPS Instances</h2>
                <Link
                  to="/vps"
                  className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New VPS
                </Link>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {vpsInstances.slice(0, 3).map((vps) => (
                  <div key={vps.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Server className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{vps.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{vps.plan} • {vps.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">CPU: {vps.cpu}%</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Memory: {vps.memory}%</p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(vps.status)}`}>
                        {vps.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Link
                  to="/vps"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium"
                >
                  View all VPS instances →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${getActivityStatusColor(activity.status)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 dark:text-white">{activity.message}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{activity.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <Link
                to="/activity"
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium"
              >
                View all activity →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;