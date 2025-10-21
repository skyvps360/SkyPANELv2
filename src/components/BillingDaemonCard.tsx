import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, Clock, DollarSign, Server } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Status } from "@/components/ui/status";
import { apiClient } from "@/lib/api";

interface DaemonStatus {
  status: "running" | "stopped" | "error" | "unknown";
  lastRun: string | null;
  lastRunSuccess: boolean;
  instancesBilled: number;
  totalAmount: number;
  nextScheduledRun: string | null;
  uptimeMinutes: number | null;
  isStale: boolean;
  warningThresholdExceeded: boolean;
}

export function BillingDaemonCard() {
  const { data, isLoading, isError, error } = useQuery<{ daemon: DaemonStatus }>({
    queryKey: ["billing-daemon-status"],
    queryFn: async () => {
      const response = await apiClient.get("/health/billing-daemon");
      return response;
    },
    refetchInterval: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Billing Daemon</CardTitle>
          </div>
          <CardDescription>Automated hourly billing service</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border-red-500/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Billing Daemon</CardTitle>
          </div>
          <CardDescription>Automated hourly billing service</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <Status variant="error" label="Error loading data" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {error instanceof Error ? error.message : "Failed to load billing daemon status"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const { daemon } = data;

  // Determine status variant for display
  const getStatusVariant = () => {
    if (daemon.warningThresholdExceeded) return "warning";
    if (daemon.status === "running") return "running";
    if (daemon.status === "stopped") return "stopped";
    if (daemon.status === "error") return "error";
    return "offline";
  };

  const getStatusLabel = () => {
    if (daemon.warningThresholdExceeded) return "Warning";
    if (daemon.status === "running") return "Running";
    if (daemon.status === "stopped") return "Stopped";
    if (daemon.status === "error") return "Error";
    return "Unknown";
  };

  const formatLastRun = (lastRun: string | null) => {
    if (!lastRun) return "Never";
    const date = new Date(lastRun);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return date.toLocaleString();
  };

  return (
    <Card className={daemon.warningThresholdExceeded ? "border-yellow-500/50" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Billing Daemon</CardTitle>
          </div>
          <Status 
            variant={getStatusVariant()} 
            label={getStatusLabel()} 
            showPing={daemon.status === "running" && !daemon.warningThresholdExceeded}
          />
        </div>
        <CardDescription>Automated hourly billing service</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Warning Message */}
        {daemon.warningThresholdExceeded && (
          <div className="flex items-start gap-2 rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 p-3">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Billing daemon has not run in over 90 minutes
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                Built-in billing may have taken over. Check daemon logs for issues.
              </p>
            </div>
          </div>
        )}

        {/* Last Run Information */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Last Run</span>
            </div>
            <span className="text-sm font-medium">{formatLastRun(daemon.lastRun)}</span>
          </div>

          {daemon.lastRun && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Server className="h-4 w-4" />
                  <span>Instances Billed</span>
                </div>
                <Badge variant="secondary">{daemon.instancesBilled}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>Total Amount</span>
                </div>
                <span className="text-sm font-semibold">
                  ${daemon.totalAmount.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  <span>Status</span>
                </div>
                <Badge variant={daemon.lastRunSuccess ? "default" : "destructive"}>
                  {daemon.lastRunSuccess ? "Success" : "Failed"}
                </Badge>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
