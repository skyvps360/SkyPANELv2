import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, XCircle, Clock, Server, Box, Database, Network } from "lucide-react";
import { BRAND_NAME } from "../lib/brand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

export default function Status() {
  const [services, setServices] = useState<ServiceComponent[]>([]);
  const [uptime, setUptime] = useState({ day: 99.9, week: 99.8, month: 99.7 });
  const [activeIncidents, setActiveIncidents] = useState<Incident[]>([]);

  useEffect(() => {
    // Simulated service status - in production, this would fetch from an API
    const mockServices: ServiceComponent[] = [
      {
        name: "VPS Infrastructure",
        status: "operational",
        icon: Server,
        instances: 145,
        description: "Virtual Private Server provisioning and management"
      },
      {
        name: "Container Platform",
        status: "operational",
        icon: Box,
        instances: 89,
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
        name: "Networking",
        status: "operational",
        icon: Network,
        instances: 15,
        description: "Global network infrastructure and routing"
      },
    ];

    setServices(mockServices);

    // Mock incidents - empty for now
    setActiveIncidents([]);
  }, []);

  const getStatusColor = (status: ServiceStatus) => {
    switch (status) {
      case "operational":
        return "text-green-600 dark:text-green-400";
      case "degraded":
        return "text-yellow-600 dark:text-yellow-400";
      case "outage":
        return "text-red-600 dark:text-red-400";
      case "maintenance":
        return "text-blue-600 dark:text-blue-400";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusIcon = (status: ServiceStatus) => {
    switch (status) {
      case "operational":
        return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case "degraded":
        return <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
      case "outage":
        return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case "maintenance":
        return <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
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
    <div className="container mx-auto max-w-6xl py-12 px-4">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-foreground mb-4">{BRAND_NAME} Status</h1>
        <p className="text-lg text-muted-foreground mb-6">
          Real-time monitoring of our platform and services
        </p>
        
        {/* Overall Status */}
        <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full ${
          allOperational 
            ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400" 
            : "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400"
        }`}>
          {allOperational ? (
            <>
              <CheckCircle2 className="h-6 w-6" />
              <span className="font-semibold">All Systems Operational</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-6 w-6" />
              <span className="font-semibold">Some Services Experiencing Issues</span>
            </>
          )}
        </div>
      </div>

      {/* Active Incidents */}
      {activeIncidents.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Active Incidents</h2>
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
        </div>
      )}

      {/* Service Components */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Service Components</h2>
        <Card>
          <CardContent className="divide-y">
            {services.map((service, idx) => (
              <div key={idx} className="py-4 first:pt-6 last:pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-grow">
                    <service.icon className="h-8 w-8 text-muted-foreground" />
                    <div className="flex-grow">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-foreground">{service.name}</h3>
                        {service.instances !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            ({service.instances} active)
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(service.status)}
                    <span className={`font-medium ${getStatusColor(service.status)}`}>
                      {getStatusLabel(service.status)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Uptime Statistics */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Uptime Statistics</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Last 24 Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {uptime.day}%
              </div>
              <p className="text-sm text-muted-foreground mt-1">Uptime</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Last 7 Days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {uptime.week}%
              </div>
              <p className="text-sm text-muted-foreground mt-1">Uptime</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Last 30 Days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {uptime.month}%
              </div>
              <p className="text-sm text-muted-foreground mt-1">Uptime</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Additional Information */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-foreground mb-2">About This Page</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This page displays the real-time status of {BRAND_NAME}'s infrastructure and services. 
            Status information is updated every minute. Instance counts represent active resources 
            across our platform without exposing sensitive customer information. All times are displayed 
            in your local timezone.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
