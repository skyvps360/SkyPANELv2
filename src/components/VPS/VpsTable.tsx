import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Status } from "@/components/ui/status";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { VPSInstance } from "@/types/vps";

interface RegionShape {
  id: string;
  label: string;
}

interface VpsInstancesTableProps {
  instances: VPSInstance[];
  isLoading?: boolean;
  allowedRegions: RegionShape[];
  onAction: (instanceId: string, action: "boot" | "shutdown" | "reboot" | "delete") => void;
  onCopy: (value: string) => void;
  onSelectionChange?: (selectedInstances: VPSInstance[]) => void;
}

const STATUS_STYLES: Record<VPSInstance["status"], string> = {
  running: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  stopped: "bg-muted text-muted-foreground",
  provisioning: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  rebooting: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
  error: "bg-red-500/15 text-red-600 dark:text-red-300",
  restoring: "bg-primary/10 text-primary",
  backing_up: "bg-primary/10 text-primary",
};

const statusLabel = (status: VPSInstance["status"]): string => {
  switch (status) {
    case "running":
      return "Running";
    case "stopped":
      return "Stopped";
    case "provisioning":
      return "Provisioning";
    case "rebooting":
      return "Rebooting";
    case "error":
      return "Error";
    case "restoring":
      return "Restoring";
    case "backing_up":
      return "Backing Up";
    default:
      return status;
  }
};

const formatBytes = (bytes: number): string => {
  if (!bytes) return "0 GB";
  return `${Math.round(bytes / 1024)} GB`;
};

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    amount
  );

const formatDate = (date: string): string =>
  new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const getStatusVariant = (status: VPSInstance["status"]) => {
  switch (status) {
    case "running":
      return "running";
    case "stopped":
      return "stopped";
    case "provisioning":
      return "provisioning";
    case "rebooting":
      return "rebooting";
    case "error":
      return "error";
    case "restoring":
      return "loading";
    case "backing_up":
      return "loading";
    default:
      return "offline";
  }
};

const getProgressValue = (status: VPSInstance["status"], created?: string) => {
  if (status === "provisioning") {
    // Simulate progress based on time elapsed since creation
    if (created) {
      const createdTime = new Date(created).getTime();
      const now = Date.now();
      const elapsed = now - createdTime;
      const estimatedTotal = 5 * 60 * 1000; // 5 minutes
      return Math.min(90, (elapsed / estimatedTotal) * 100);
    }
    return 25;
  }
  if (status === "rebooting") return 60;
  if (status === "restoring") return 40;
  if (status === "backing_up") return 70;
  return null;
};

export function VpsInstancesTable({
  instances,
  isLoading,
  allowedRegions,
  onAction,
  onCopy,
  onSelectionChange,
}: VpsInstancesTableProps) {
  const regionLookup = useMemo(() => {
    const map = new Map<string, string>();
    allowedRegions.forEach((region) => {
      map.set(region.id, region.label || region.id);
    });
    return map;
  }, [allowedRegions]);

  const columns = useMemo<ColumnDef<VPSInstance>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() 
                ? true 
                : table.getIsSomePageRowsSelected() 
                ? "indeterminate" 
                : false
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="touch-manipulation"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="touch-manipulation"
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 48,
        meta: {
          className: "w-12 min-w-[48px]"
        }
      },
      {
        accessorKey: "label",
        header: "Server",
        cell: ({ row }) => {
          const instance = row.original;
          const regionLabel =
            instance.regionLabel || regionLookup.get(instance.region) || instance.region;
          const progressValue = getProgressValue(instance.status, instance.created);
          const showPing = ["running", "provisioning", "rebooting", "restoring", "backing_up"].includes(instance.status);
          
          return (
            <div className="space-y-2 min-w-[200px]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground text-sm sm:text-base truncate max-w-[150px] sm:max-w-none">
                  {instance.label}
                </span>
                <Status 
                  variant={getStatusVariant(instance.status)}
                  label={statusLabel(instance.status)}
                  showPing={showPing}
                  animated={instance.status === "provisioning"}
                />
              </div>
              {progressValue !== null && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{statusLabel(instance.status)}...</span>
                    <span>{Math.round(progressValue)}%</span>
                  </div>
                  <Progress value={progressValue} className="h-1.5" />
                </div>
              )}
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {instance.ipv4[0] && <span className="font-mono text-xs">{instance.ipv4[0]}</span>}
                <span className="text-xs">{regionLabel}</span>
              </div>
            </div>
          );
        },
        meta: {
          className: "sticky left-0 bg-card z-10 min-w-[200px] border-r border-border"
        }
      },
      {
        id: "specs",
        header: "Resources",
        cell: ({ row }) => {
          const instance = row.original;
          return (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs min-w-[160px]">
              <div>
                <div className="text-muted-foreground text-xs">CPU</div>
                <div className="font-medium text-foreground text-xs">{instance.specs.vcpus} vCPU</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Memory</div>
                <div className="font-medium text-foreground text-xs">{formatBytes(instance.specs.memory)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Storage</div>
                <div className="font-medium text-foreground text-xs">{formatBytes(instance.specs.disk)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Transfer</div>
                <div className="font-medium text-foreground text-xs">{formatBytes(instance.specs.transfer)}</div>
              </div>
            </div>
          );
        },
        meta: {
          className: "min-w-[160px]"
        }
      },
      {
        id: "pricing",
        header: "Billing",
        cell: ({ row }) => {
          const { pricing } = row.original;
          return (
            <div className="space-y-1 text-xs min-w-[100px]">
              <div className="text-muted-foreground text-xs">Hourly</div>
              <div className="font-medium text-foreground text-xs">{formatCurrency(pricing.hourly)}</div>
              <div className="text-muted-foreground text-xs">Monthly</div>
              <div className="font-medium text-foreground text-xs">{formatCurrency(pricing.monthly)}</div>
            </div>
          );
        },
        meta: {
          className: "min-w-[100px]"
        }
      },
      {
        accessorKey: "created",
        header: "Created",
        cell: ({ row }) => (
          <div className="text-xs text-muted-foreground min-w-[100px]">
            {formatDate(row.original.created)}
          </div>
        ),
        meta: {
          className: "min-w-[100px] hidden sm:table-cell"
        }
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const instance = row.original;
          const isRunning = instance.status === "running";
          const isStopped = instance.status === "stopped";
          const isTransitioning =
            instance.status === "provisioning" || instance.status === "rebooting";

          return (
            <div className="flex items-center justify-end gap-1 sm:gap-2 min-w-[180px]">
              {isRunning && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onAction(instance.id, "shutdown")}
                    className="touch-manipulation min-h-[36px] text-xs px-2 sm:px-3"
                  >
                    <span className="hidden sm:inline">Stop</span>
                    <span className="sm:hidden">⏹</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAction(instance.id, "reboot")}
                    className="touch-manipulation min-h-[36px] text-xs px-2 sm:px-3"
                  >
                    <span className="hidden sm:inline">Reboot</span>
                    <span className="sm:hidden">🔄</span>
                  </Button>
                </>
              )}
              {isStopped && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onAction(instance.id, "boot")}
                  disabled={isTransitioning}
                  className="touch-manipulation min-h-[36px] text-xs px-2 sm:px-3"
                >
                  <span className="hidden sm:inline">Start</span>
                  <span className="sm:hidden">▶</span>
                </Button>
              )}
              <Button variant="ghost" size="sm" asChild className="touch-manipulation min-h-[36px] text-xs px-2 sm:px-3">
                <Link to={`/vps/${instance.id}`}>
                  <span className="hidden sm:inline">Details</span>
                  <span className="sm:hidden">📋</span>
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 touch-manipulation min-h-[36px] min-w-[36px]">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Open actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => onCopy(instance.ipv4[0] ?? "")}>
                    Copy IPv4
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCopy(instance.id)}>
                    Copy instance ID
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={`/vps/${instance.id}`}>View details</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onAction(instance.id, "delete")}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        size: 220,
        meta: {
          className: "min-w-[180px]"
        }
      },
    ],
    [onAction, onCopy, regionLookup]
  );

  return (
    <DataTable
      columns={columns}
      data={instances}
      isLoading={isLoading}
      onSelectionChange={onSelectionChange}
      emptyState={
        <div className="py-10 text-center">
          <p className="text-base font-medium text-foreground">No VPS instances found</p>
          <p className="text-sm text-muted-foreground">
            Start by provisioning a server to see it appear in this list.
          </p>
        </div>
      }
    />
  );
}
