/**
 * Rate Limiting Monitoring Dashboard Component
 * 
 * Provides comprehensive monitoring and visualization of rate limiting
 * metrics, configuration status, and system health.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Shield, AlertTriangle, CheckCircle, TrendingUp, Users, Clock, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { buildApiUrl } from '@/lib/api';

interface RateLimitMetrics {
  totalRequests: number;
  rateLimitedRequests: number;
  rateLimitHitRate: number;
  anonymousRequests: number;
  authenticatedRequests: number;
  adminRequests: number;
  anonymousViolations: number;
  authenticatedViolations: number;
  adminViolations: number;
  timeWindow: string;
  startTime: string;
  endTime: string;
  topViolatingIPs: Array<{ ip: string; violations: number; userType: string }>;
  topViolatingEndpoints: Array<{ endpoint: string; violations: number }>;
  configEffectiveness: {
    anonymousLimitUtilization: number;
    authenticatedLimitUtilization: number;
    adminLimitUtilization: number;
    recommendedAdjustments: string[];
  };
}

interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'error';
  timestamp: string;
  rateLimiting: {
    configValid: boolean;
    trustProxyEnabled: boolean;
    limitsConfigured: boolean;
    metricsEnabled: boolean;
  };
  configuration: {
    anonymousLimit: number;
    authenticatedLimit: number;
    adminLimit: number;
    windowMs: number;
  };
  issues: string[];
  recommendations: string[];
}

interface RateLimitMonitoringProps {
  token: string;
}

export const RateLimitMonitoring: React.FC<RateLimitMonitoringProps> = ({ token }) => {
  const [metrics, setMetrics] = useState<RateLimitMetrics | null>(null);
  const [healthCheck, setHealthCheck] = useState<HealthCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh] = useState(true);
  const [refreshInterval] = useState(30); // seconds

  const authHeader = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch(buildApiUrl('/api/health/metrics?window=15'), {
        headers: authHeader,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.status}`);
      }

      const data = await response.json();
      setMetrics(data.metrics);
      setLastUpdated(new Date());
    } catch (error: any) {
      console.error('Failed to fetch rate limit metrics:', error);
      toast.error('Failed to load rate limiting metrics');
    }
  }, [authHeader]);

  const fetchHealthCheck = useCallback(async () => {
    try {
      const response = await fetch(buildApiUrl('/api/health/rate-limiting'), {
        headers: authHeader,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch health check: ${response.status}`);
      }

      const data = await response.json();
      setHealthCheck(data);
    } catch (error: any) {
      console.error('Failed to fetch rate limit health check:', error);
      toast.error('Failed to load rate limiting health status');
    }
  }, [authHeader]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchMetrics(), fetchHealthCheck()]);
    } finally {
      setLoading(false);
    }
  }, [fetchMetrics, fetchHealthCheck]);

  // Initial load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshData();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshData]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  if (!metrics || !healthCheck) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading rate limiting monitoring data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-muted-foreground" />
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Rate Limiting Monitor</h2>
            <p className="text-sm text-muted-foreground">
              Real-time monitoring of API rate limiting effectiveness and system health
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Badge variant="outline" className="text-xs">
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Never updated'}
          </Badge>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            {getStatusIcon(healthCheck.status)}
            <div>
              <p className="text-sm font-medium text-muted-foreground">System Status</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold capitalize">{healthCheck.status}</p>
                <Badge variant={getStatusBadgeVariant(healthCheck.status)} className="text-xs">
                  {healthCheck.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Hit Rate</p>
              <p className="text-2xl font-bold">{formatPercentage(metrics.rateLimitHitRate)}</p>
              <p className="text-xs text-muted-foreground">
                {formatNumber(metrics.rateLimitedRequests)} of {formatNumber(metrics.totalRequests)} requests
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <Users className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
              <p className="text-2xl font-bold">{formatNumber(metrics.totalRequests)}</p>
              <p className="text-xs text-muted-foreground">Last {metrics.timeWindow}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <Clock className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Window</p>
              <p className="text-2xl font-bold">{Math.round(healthCheck.configuration.windowMs / 60000)}m</p>
              <p className="text-xs text-muted-foreground">Rate limit window</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="user-types">User Types</TabsTrigger>
          <TabsTrigger value="violations">Violations</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Request Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Request Distribution</CardTitle>
                <CardDescription>Breakdown by user authentication type</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Anonymous</span>
                    <span className="text-sm text-muted-foreground">
                      {formatNumber(metrics.anonymousRequests)} requests
                    </span>
                  </div>
                  <Progress 
                    value={(metrics.anonymousRequests / metrics.totalRequests) * 100} 
                    className="h-2"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Authenticated</span>
                    <span className="text-sm text-muted-foreground">
                      {formatNumber(metrics.authenticatedRequests)} requests
                    </span>
                  </div>
                  <Progress 
                    value={(metrics.authenticatedRequests / metrics.totalRequests) * 100} 
                    className="h-2"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Admin</span>
                    <span className="text-sm text-muted-foreground">
                      {formatNumber(metrics.adminRequests)} requests
                    </span>
                  </div>
                  <Progress 
                    value={(metrics.adminRequests / metrics.totalRequests) * 100} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Configuration Effectiveness */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Limit Utilization</CardTitle>
                <CardDescription>Average percentage of limits being used</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Anonymous Users</span>
                    <span className="text-sm text-muted-foreground">
                      {formatPercentage(metrics.configEffectiveness.anonymousLimitUtilization)}
                    </span>
                  </div>
                  <Progress 
                    value={metrics.configEffectiveness.anonymousLimitUtilization} 
                    className="h-2"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Authenticated Users</span>
                    <span className="text-sm text-muted-foreground">
                      {formatPercentage(metrics.configEffectiveness.authenticatedLimitUtilization)}
                    </span>
                  </div>
                  <Progress 
                    value={metrics.configEffectiveness.authenticatedLimitUtilization} 
                    className="h-2"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Admin Users</span>
                    <span className="text-sm text-muted-foreground">
                      {formatPercentage(metrics.configEffectiveness.adminLimitUtilization)}
                    </span>
                  </div>
                  <Progress 
                    value={metrics.configEffectiveness.adminLimitUtilization} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          {metrics.configEffectiveness.recommendedAdjustments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recommendations</CardTitle>
                <CardDescription>System-generated suggestions for optimization</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {metrics.configEffectiveness.recommendedAdjustments.map((recommendation, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span>{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="user-types" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Anonymous Users</CardTitle>
                <CardDescription>Unauthenticated requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Requests</span>
                    <span className="font-medium">{formatNumber(metrics.anonymousRequests)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Violations</span>
                    <span className="font-medium text-red-600">{formatNumber(metrics.anonymousViolations)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Limit</span>
                    <span className="font-medium">{formatNumber(healthCheck.configuration.anonymousLimit)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Authenticated Users</CardTitle>
                <CardDescription>Requests with valid tokens</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Requests</span>
                    <span className="font-medium">{formatNumber(metrics.authenticatedRequests)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Violations</span>
                    <span className="font-medium text-red-600">{formatNumber(metrics.authenticatedViolations)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Limit</span>
                    <span className="font-medium">{formatNumber(healthCheck.configuration.authenticatedLimit)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Admin Users</CardTitle>
                <CardDescription>Administrative requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Requests</span>
                    <span className="font-medium">{formatNumber(metrics.adminRequests)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Violations</span>
                    <span className="font-medium text-red-600">{formatNumber(metrics.adminViolations)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Limit</span>
                    <span className="font-medium">{formatNumber(healthCheck.configuration.adminLimit)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="violations" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Top Violating IPs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Violating IPs</CardTitle>
                <CardDescription>IP addresses with the most rate limit violations</CardDescription>
              </CardHeader>
              <CardContent>
                {metrics.topViolatingIPs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No violations detected</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>IP Address</TableHead>
                        <TableHead>User Type</TableHead>
                        <TableHead className="text-right">Violations</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.topViolatingIPs.map((ip, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm">{ip.ip}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {ip.userType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{ip.violations}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Top Violating Endpoints */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Violating Endpoints</CardTitle>
                <CardDescription>API endpoints with the most rate limit violations</CardDescription>
              </CardHeader>
              <CardContent>
                {metrics.topViolatingEndpoints.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No violations detected</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Endpoint</TableHead>
                        <TableHead className="text-right">Violations</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.topViolatingEndpoints.map((endpoint, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm">{endpoint.endpoint}</TableCell>
                          <TableCell className="text-right font-medium">{endpoint.violations}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Configuration Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configuration Status</CardTitle>
                <CardDescription>Current rate limiting configuration health</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Configuration Valid</span>
                  <Badge variant={healthCheck.rateLimiting.configValid ? 'default' : 'destructive'}>
                    {healthCheck.rateLimiting.configValid ? 'Valid' : 'Invalid'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Trust Proxy Enabled</span>
                  <Badge variant={healthCheck.rateLimiting.trustProxyEnabled ? 'default' : 'secondary'}>
                    {healthCheck.rateLimiting.trustProxyEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Limits Configured</span>
                  <Badge variant={healthCheck.rateLimiting.limitsConfigured ? 'default' : 'destructive'}>
                    {healthCheck.rateLimiting.limitsConfigured ? 'Configured' : 'Missing'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Metrics Enabled</span>
                  <Badge variant={healthCheck.rateLimiting.metricsEnabled ? 'default' : 'secondary'}>
                    {healthCheck.rateLimiting.metricsEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Current Limits */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Limits</CardTitle>
                <CardDescription>Active rate limiting configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Anonymous Users</span>
                    <span className="text-sm text-muted-foreground">
                      {healthCheck.configuration.anonymousLimit} requests / {Math.round(healthCheck.configuration.windowMs / 60000)}min
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Authenticated Users</span>
                    <span className="text-sm text-muted-foreground">
                      {healthCheck.configuration.authenticatedLimit} requests / {Math.round(healthCheck.configuration.windowMs / 60000)}min
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Admin Users</span>
                    <span className="text-sm text-muted-foreground">
                      {healthCheck.configuration.adminLimit} requests / {Math.round(healthCheck.configuration.windowMs / 60000)}min
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Issues and Recommendations */}
          {(healthCheck.issues.length > 0 || healthCheck.recommendations.length > 0) && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {healthCheck.issues.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-red-600">Issues</CardTitle>
                    <CardDescription>Configuration problems that need attention</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {healthCheck.issues.map((issue, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {healthCheck.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-blue-600">Recommendations</CardTitle>
                    <CardDescription>Suggested improvements for better performance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {healthCheck.recommendations.map((recommendation, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span>{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};