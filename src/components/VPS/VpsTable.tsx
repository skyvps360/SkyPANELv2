import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

export function VpsInstancesTable({
  instances,
  isLoading,
  allowedRegions,
  onAction,
  onCopy,
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
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 48,
      },
      {
        accessorKey: "label",
        header: "Server",
        cell: ({ row }) => {
          const instance = row.original;
          const regionLabel =
            instance.regionLabel || regionLookup.get(instance.region) || instance.region;
          return (
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">{instance.label}</span>
                <Badge className={cn("border-transparent", STATUS_STYLES[instance.status])}>
                  {statusLabel(instance.status)}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {instance.ipv4[0] && <span className="font-mono">{instance.ipv4[0]}</span>}
                <span>{regionLabel}</span>
              </div>
            </div>
          );
        },
      },
      {
        id: "specs",
        header: "Resources",
        cell: ({ row }) => {
          const instance = row.original;
          return (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div>
                <div className="text-muted-foreground">CPU</div>
                <div className="font-medium text-foreground">{instance.specs.vcpus} vCPU</div>
              </div>
              <div>
                <div className="text-muted-foreground">Memory</div>
                <div className="font-medium text-foreground">{formatBytes(instance.specs.memory)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Storage</div>
                <div className="font-medium text-foreground">{formatBytes(instance.specs.disk)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Transfer</div>
                <div className="font-medium text-foreground">{formatBytes(instance.specs.transfer)}</div>
              </div>
            </div>
          );
        },
      },
      {
        id: "pricing",
        header: "Billing",
        cell: ({ row }) => {
          const { pricing } = row.original;
          return (
            <div className="space-y-1 text-sm">
              <div className="text-muted-foreground">Hourly</div>
              <div className="font-medium text-foreground">{formatCurrency(pricing.hourly)}</div>
              <div className="text-muted-foreground">Monthly</div>
              <div className="font-medium text-foreground">{formatCurrency(pricing.monthly)}</div>
            </div>
          );
        },
      },
      {
        accessorKey: "created",
        header: "Created",
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {formatDate(row.original.created)}
          </div>
        ),
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
            <div className="flex items-center justify-end gap-2">
              {isRunning && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onAction(instance.id, "shutdown")}
                  >
                    Stop
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAction(instance.id, "reboot")}
                  >
                    Reboot
                  </Button>
                </>
              )}
              {isStopped && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onAction(instance.id, "boot")}
                  disabled={isTransitioning}
                >
                  Start
                </Button>
              )}
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/vps/${instance.id}`}>Details</Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
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
      },
    ],
    [onAction, onCopy, regionLookup]
  );

  return (
    <DataTable
      columns={columns}
      data={instances}
      isLoading={isLoading}
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
