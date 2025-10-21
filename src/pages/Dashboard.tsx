/**
 * Dashboard Component
 * Main overview page showing containers, VPS instances, billing, and recent activity
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Server, 
  Container, 
  Wallet, 
  Activity, 
  TrendingUp, 
  AlertTriangle,
  Plus
} from 'lucide-react';
// Layout provides Navigation and Sidebar globally
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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

interface MetricSummary {
  average: number;
  peak: number;
  last: number;
}

interface VpsMetrics {
  cpu?: MetricSummary | null;
  network?: {
    inbound?: MetricSummary | null;
    outbound?: MetricSummary | null;
  };
  io?: {
    read?: MetricSummary | null;
    swap?: MetricSummary | null;
  };
}

interface VPSStats {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'provisioning';
  plan: string;
  location: string;
  cpu: number;
  memory: number | null; // null indicates no memory data available
  storage: number;
  ip: string;
  metrics?: VpsMetrics;
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
  const navigate = useNavigate();

  const loadDashboardData = useCallback(async () => {
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

      // Fetch detailed metrics for each VPS instance
      const vpsWithMetrics = await Promise.all(
        (vpsData.instances || []).map(async (i: any) => {
          let cpu = 0;
          let memory = null; // Use null to indicate no memory data available
          let metrics: VpsMetrics | undefined = undefined;
          
          try {
            // Fetch detailed VPS data including metrics
            const detailRes = await fetch(`/api/vps/${i.id}`, { 
              headers: { Authorization: `Bearer ${token}` } 
            });
            
            if (detailRes.ok) {
              const detailData = await detailRes.json();
              
              // Extract CPU usage from metrics (API returns 0-100 percentage)
              cpu = detailData.metrics?.cpu?.summary?.last || 0;
              
              // Memory metrics are not available in the API
              // Set to null to indicate unavailable data
              memory = null;

              // Capture metric summaries for consistent display
              const cpuSummary: MetricSummary | null = detailData.metrics?.cpu?.summary ?? null;
              const inboundSummary: MetricSummary | null = detailData.metrics?.network?.inbound?.summary ?? null;
              const outboundSummary: MetricSummary | null = detailData.metrics?.network?.outbound?.summary ?? null;
              const ioSummary: MetricSummary | null = detailData.metrics?.io?.read?.summary ?? null;
              const swapSummary: MetricSummary | null = detailData.metrics?.io?.swap?.summary ?? null;

              metrics = {
                cpu: cpuSummary,
                network: { inbound: inboundSummary, outbound: outboundSummary },
                io: { read: ioSummary, swap: swapSummary },
              };
            }
          } catch (error) {
            console.warn(`Failed to fetch metrics for VPS ${i.id}:`, error);
            // Keep default values
          }
          
          return {
            id: i.id,
            name: i.label || 'instance',
            status: (i.status as any) || 'provisioning',
            plan: i.configuration?.type || '',
            location: i.configuration?.region || '',
            cpu: Math.round(cpu * 100) / 100, // Round to 2 decimal places
            memory: memory, // null indicates no data available
            storage: 0,
            ip: i.ip_address || '',
            metrics,
          };
        })
      );
      
      setVpsInstances(vpsWithMetrics);

      const lastPaymentItem = (paymentsData.payments || [])[0];
      setBilling({
        walletBalance: walletData.balance ?? 0,
        monthlySpend: 0,
        lastPayment: {
          amount: lastPaymentItem?.amount ?? 0,
          date: lastPaymentItem?.created_at ?? ''
        }
      });

      try {
        const actRes = await fetch('/api/activity/recent?limit=10', { headers: { Authorization: `Bearer ${token}` } });
        const actData = await actRes.json();
        if (actRes.ok) {
          const mapped: ActivityItem[] = (actData.activities || []).map((a: any) => ({
            id: a.id,
            type: a.type || a.entity_type || 'activity',
            message: a.message || `${a.event_type}`,
            timestamp: a.timestamp || a.created_at,
            status: a.status || 'info'
          }));
          setRecentActivity(mapped);
        }
      } catch (e) {
        console.warn('Failed to load recent activity', e);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
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
        return 'text-primary bg-primary/10 dark:bg-primary/20';
      default:
        return 'text-muted-foreground text-muted-foreground bg-muted';
    }
  };

  const handleVpsClick = (vpsId: string) => {
    navigate(`/vps/${vpsId}`);
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-5 w-96 mt-2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <Skeleton className="h-5 w-32 mt-4" />
                <Skeleton className="h-8 w-20 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your containers, VPS instances, and account status
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg">
                    <Container className="h-6 w-6 text-primary" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Containers</p>
                <p className="text-2xl font-bold">
                  {containers.filter(c => c.status === 'running').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Server className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">VPS Instances</p>
                <p className="text-2xl font-bold">
                  {vpsInstances.filter(v => v.status === 'running').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Wallet className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Wallet Balance</p>
                <p className="text-2xl font-bold">
                  {billing ? formatCurrency(billing.walletBalance) : '$0.00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Monthly Spend</p>
                <p className="text-2xl font-bold">
                  {billing ? formatCurrency(billing.monthlySpend) : '$0.00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* VPS Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>VPS Instances</CardTitle>
              <Button asChild size="sm">
                <Link to="/vps">
                  <Plus className="h-4 w-4 mr-2" />
                  New VPS
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {vpsInstances.slice(0, 3).map((vps) => (
                <div 
                  key={vps.id} 
                  className="p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleVpsClick(vps.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Server className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium">{vps.name}</p>
                        <p className="text-xs text-muted-foreground">{vps.plan} • {vps.location}</p>
                      </div>
                    </div>
                    <Badge variant={vps.status === 'running' ? 'default' : vps.status === 'stopped' ? 'secondary' : 'outline'}>
                      {vps.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            {vpsInstances.length > 0 && (
              <div className="mt-4">
                <Link
                  to="/vps"
                  className="text-sm text-primary hover:underline font-medium"
                >
                  View all VPS instances →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Containers Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Containers</CardTitle>
              <Button asChild size="sm">
                <Link to="/containers">
                  <Plus className="h-4 w-4 mr-2" />
                  New Container
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {containers.slice(0, 3).map((container) => (
                <div key={container.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Container className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium">{container.name}</p>
                      <p className="text-xs text-muted-foreground">{container.image}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">CPU: {container.cpu}%</p>
                      <p className="text-xs text-muted-foreground">Memory: {container.memory}%</p>
                    </div>
                    <Badge variant={container.status === 'running' ? 'default' : container.status === 'stopped' ? 'secondary' : 'destructive'}>
                      {container.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            {containers.length > 0 && (
              <div className="mt-4">
                <Link
                  to="/containers"
                  className="text-sm text-primary hover:underline font-medium"
                >
                  View all containers →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-4">
                <div className={`p-2 rounded-lg ${getActivityStatusColor(activity.status)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm">{activity.message}</p>
                  <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
          {recentActivity.length > 0 && (
            <div className="mt-6">
              <Link
                to="/activity"
                className="text-sm text-primary hover:underline font-medium"
              >
                View all activity →
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
