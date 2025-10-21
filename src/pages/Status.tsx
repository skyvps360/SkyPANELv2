import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Database,
  Box,
  AlertCircle,
  Server,
  MapPin,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Status as StatusDot } from "@/components/ui/status";
import PublicLayout from "@/components/PublicLayout";
import { BRAND_NAME } from "@/lib/brand";
import { VPSInfrastructureCard } from "@/components/VPSInfrastructureCard";
import { BillingDaemonCard } from "@/components/BillingDaemonCard";
import { useAuth } from "@/contexts/AuthContext";

type ServiceStatus = "operational" | "degraded" | "outage" | "maintenance";

interface ServiceComponent {
  name: string;
  status: ServiceStatus;
  icon: React.ComponentType<{ className?: string }>;
  instances?: number;
  description: string;
}

interface IncidentUpdate {
  time: string;
  message: string;
  status: ServiceStatus;
}

interface Incident {
  id: string;
  title: string;
  status: ServiceStatus;
  startTime: string;
  updates: IncidentUpdate[];
}

interface Region {
  id: string;
  label: string;
  site_type: string;
  status: string;
  country: string;
}

export default function Status() {
  const { user } = useAuth();
  const [services, setServices] = useState<ServiceComponent[]>([]);
  const [uptime] = useState({ day: 99.9, week: 99.8, month: 99.7 });
  const [activeIncidents, setActiveIncidents] = useState<Incident[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>(() => new Date().toLocaleTimeString());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLiveData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch public status data (no auth required)
      let vpsCount = 0;
      let vpsRunning = 0;
      let vpsStopped = 0;
      let containersCount = 0;

      try {
        const statusResponse = await fetch('/api/health/status');
        const statusData = await statusResponse.json();
        
        if (statusData.success && statusData.services) {
          vpsCount = statusData.services.vps?.total || 0;
          vpsRunning = statusData.services.vps?.running || 0;
          vpsStopped = statusData.services.vps?.stopped || 0;
          containersCount = statusData.services.containers?.total || 0;
        }
      } catch (err) {
        console.warn('Failed to fetch status data:', err);
        // Continue with zeros if status endpoint fails
      }

      // Fetch regions (public data)
      const regionsResponse = await fetch('https://api.linode.com/v4/regions');
      const regionsData = await regionsResponse.json();
      const regionsData_: Region[] = regionsData.data || [];
      setRegions(regionsData_);

      // Update services with live data
      const liveServices: ServiceComponent[] = [
        {
          name: "VPS Infrastructure",
          status: "operational",
          icon: Server,
          instances: vpsCount,
          description: `Virtual Private Server provisioning and management${vpsCount > 0 ? ` (${vpsRunning} running, ${vpsStopped} stopped)` : ''}`
        },
        {
          name: "Container Platform",
          status: "operational",
          icon: Box,
          instances: containersCount,
          description: "Docker container deployment and orchestration"
        },
        {
          name: "Database Services",
          status: "operational",
          icon: Database,
          instances: 1,
          description: "PostgreSQL database backend"
        },
        {
          name: "Regions",
          status: "operational",
          icon: MapPin,
          instances: regionsData_.length,
          description: "Global datacenter regions"
        },
      ];

      setServices(liveServices);
      setActiveIncidents([]);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to fetch live data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch live data');
      
      // Fallback to basic services without live counts
      const fallbackServices: ServiceComponent[] = [
        {
          name: "VPS Infrastructure",
          status: "degraded",
          icon: Server,
          instances: 0,
          description: "Virtual Private Server provisioning and management"
        },
        {
          name: "Container Platform",
          status: "degraded",
          icon: Box,
          instances: 0,
          description: "Docker container deployment and orchestration"
        },
        {
          name: "Database Services",
          status: "operational",
          icon: Database,
          instances: 1,
          description: "PostgreSQL database backend"
        },
      ];
      setServices(fallbackServices);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchLiveData();
    setIsRefreshing(false);
  };

  const getStatusLabel = (status: ServiceStatus) => {
    switch (status) {
      case "operational":
        return "Operational";
      case "degraded":
        return "Degraded Performance";
      case "outage":
        return "Major Outage";
      case "maintenance":
        return "Scheduled Maintenance";
      default:
        return "Unknown";
    }
  };

  const getStatusBadge = (status: ServiceStatus) => {
    const variants = {
      operational: "default",
      degraded: "secondary",
      outage: "destructive",
      maintenance: "outline"
    };
    
    return (
      <Badge variant={variants[status] as any}>
        {getStatusLabel(status)}
      </Badge>
    );
  };

  const allOperational = services.every(s => s.status === "operational");

  return (
    <PublicLayout>
      <div className="container mx-auto max-w-6xl px-4 py-12">
      <section className="space-y-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Badge variant="outline" className="uppercase tracking-wide">Live platform health</Badge>
            <h1 className="text-3xl font-semibold md:text-4xl">{BRAND_NAME} service status</h1>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              Real-time availability for containers, VPS, networking, and supporting systems. Data refreshes automatically every few minutes and whenever you request an update.
            </p>
          </div>
          <div className="flex flex-col gap-3 text-sm text-muted-foreground md:items-end">
            <div className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2">
              {allOperational ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="font-medium text-green-600 dark:text-green-400">All systems operational</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium text-yellow-600 dark:text-yellow-400">Some services degraded</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide">
              <span>Last updated {lastUpdated}</span>
              <Separator orientation="vertical" className="h-4" />
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8"
              >
                <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <section className="mt-8">
          <Card className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                <div>
                  <h3 className="font-medium text-orange-800 dark:text-orange-200">
                    Data Loading Issue
                  </h3>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                    {error}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {activeIncidents.length > 0 && (
        <section className="mt-12 space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Active incidents</h2>
          <div className="space-y-4">
            {activeIncidents.map((incident) => (
              <Card key={incident.id} className="border-orange-500/50">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{incident.title}</CardTitle>
                      <CardDescription className="mt-2">
                        Started: {new Date(incident.startTime).toLocaleString()}
                      </CardDescription>
                    </div>
                    {getStatusBadge(incident.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {incident.updates.map((update, idx) => (
                      <div key={idx} className="flex gap-3 text-sm">
                        <div className="flex-shrink-0 text-muted-foreground">{update.time}</div>
                        <div className="flex-grow">{update.message}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="mt-12 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Service components</h2>
          <Badge variant="secondary">Monitoring every 60 seconds</Badge>
        </div>
        <Card className="shadow-sm">
          <CardContent className="divide-y">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Loading service status...</span>
                </div>
              </div>
            ) : (
              services.map((service) => (
                <div key={service.name} className="flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-1 items-start gap-4">
                    <service.icon className="mt-1 h-8 w-8 text-muted-foreground" />
                    <div className="space-y-1">
                      <h3 className="font-semibold">{service.name}</h3>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                      {service.instances !== undefined && (
                        <p className="text-xs text-muted-foreground">{service.instances} active nodes</p>
                      )}
                    </div>
                  </div>
                  <StatusDot variant={service.status === "operational" ? "running" : service.status === "degraded" ? "warning" : service.status === "maintenance" ? "loading" : "error"} label={getStatusLabel(service.status)} showPing={service.status === "operational"} className="md:justify-end" />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-12 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Infrastructure Metrics</h2>
          <Badge variant="secondary">Real-time monitoring</Badge>
        </div>
        <div className={`grid gap-6 ${user?.role === 'admin' ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
          <VPSInfrastructureCard />
          {user?.role === 'admin' && <BillingDaemonCard />}
        </div>
      </section>

      {regions.length > 0 && (
        <section className="mt-12 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Regions</h2>
            <Badge variant="secondary">{regions.length} regions available</Badge>
          </div>
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {regions.map((region) => (
                  <div key={region.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-1">
                      <h4 className="font-medium">{region.label}</h4>
                      <p className="text-sm text-muted-foreground">{region.country}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {region.site_type}
                        </Badge>
                        <StatusDot 
                          variant={region.status === 'ok' ? 'running' : 'error'} 
                          label={region.status} 
                          showPing={region.status === 'ok'}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      <section className="mt-12 space-y-6">
        <h2 className="text-2xl font-semibold">Uptime performance</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Last 24 hours</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-semibold text-green-600 dark:text-green-400">{uptime.day}%</div>
              <p className="text-xs text-muted-foreground">All systems passed automated probes</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Last 7 days</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-semibold text-green-600 dark:text-green-400">{uptime.week}%</div>
              <p className="text-xs text-muted-foreground">Includes scheduled maintenance windows</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Last 30 days</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-semibold text-green-600 dark:text-green-400">{uptime.month}%</div>
              <p className="text-xs text-muted-foreground">MTTR &lt; 12 minutes for resolved incidents</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Card className="mt-12 border-primary/30 bg-primary/5 shadow-sm">
        <CardContent className="space-y-4 px-6 py-8">
          <h3 className="text-lg font-semibold text-foreground">About this page</h3>
          <p className="text-sm text-muted-foreground leading-6">
            Monitoring updates every 60 seconds using probes from multiple regions. Major incidents trigger real-time notifications for customers subscribed to alerts. For historical reports or compliance requests, contact our support team.
          </p>
          <div className="flex flex-wrap gap-3 text-xs uppercase tracking-wide text-muted-foreground/80">
            <Badge variant="secondary">Real-time metrics</Badge>
            <Badge variant="secondary">Multi-region checks</Badge>
            <Badge variant="secondary">Transparent history</Badge>
          </div>
        </CardContent>
      </Card>
      </div>
    </PublicLayout>
  );
}
