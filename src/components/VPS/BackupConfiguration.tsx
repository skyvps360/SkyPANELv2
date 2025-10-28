/**
 * BackupConfiguration Component
 * Handles backup frequency selection and pricing display
 */

import React, { useState, useEffect } from "react";
import { Shield, DollarSign, Calendar, Clock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { VPSPlan } from "@/types/vps";

interface BackupConfigurationProps {
  planId: string;
  backupsEnabled: boolean;
  backupFrequency?: "daily" | "weekly" | "none";
  onBackupsChange: (enabled: boolean) => void;
  onFrequencyChange: (frequency: "daily" | "weekly" | "none") => void;
  token: string;
}

export const BackupConfiguration: React.FC<BackupConfigurationProps> = ({
  planId,
  backupsEnabled,
  backupFrequency = "weekly",
  onBackupsChange,
  onFrequencyChange,
  token,
}) => {
  const [plan, setPlan] = useState<VPSPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlan = async () => {
      if (!planId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await fetch("/api/vps/plans", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch plans");
        }

        const selectedPlan = (data.plans || []).find(
          (p: VPSPlan) => p.id === planId
        );

        setPlan(selectedPlan || null);
      } catch (err) {
        console.error("Failed to fetch plan details:", err);
        setPlan(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [planId, token]);

  // Calculate backup pricing
  const weeklyBackupPrice = plan
    ? (plan.backup_price_monthly || 0) + (plan.backup_upcharge_monthly || 0)
    : 0;

  const dailyBackupPrice = weeklyBackupPrice * 1.5; // Daily is 1.5x weekly

  // Determine available backup frequencies
  const hasWeeklyBackups = plan?.weekly_backups_enabled !== false;
  const hasDailyBackups = plan?.daily_backups_enabled === true;
  const hasBothOptions = hasWeeklyBackups && hasDailyBackups;

  // Auto-select frequency when backups are enabled
  useEffect(() => {
    if (backupsEnabled && backupFrequency === "none") {
      // Default to weekly if available, otherwise daily
      if (hasWeeklyBackups) {
        onFrequencyChange("weekly");
      } else if (hasDailyBackups) {
        onFrequencyChange("daily");
      }
    } else if (!backupsEnabled && backupFrequency !== "none") {
      onFrequencyChange("none");
    }
  }, [
    backupsEnabled,
    backupFrequency,
    hasWeeklyBackups,
    hasDailyBackups,
    onFrequencyChange,
  ]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium text-foreground">Backups</Label>
        </div>
        <div className="text-sm text-muted-foreground">Loading backup options...</div>
      </div>
    );
  }

  if (!plan) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Enable/Disable Backups */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={backupsEnabled}
          onChange={(e) => onBackupsChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 text-primary focus:ring-primary border rounded"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              Enable Backups
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Automatic backups of your server (additional cost applies)
          </p>
        </div>
      </label>

      {/* Backup Frequency Selection */}
      {backupsEnabled && (
        <div className="ml-7 space-y-3 pl-4 border-l-2 border-primary/20">
          {hasBothOptions ? (
            <>
              <Label className="text-sm font-medium text-foreground">
                Backup Frequency
              </Label>
              <div className="space-y-3">
                {/* Weekly Backups Option */}
                {hasWeeklyBackups && (
                  <label
                    htmlFor="weekly"
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                      backupFrequency === "weekly"
                        ? "border-primary bg-primary/10 dark:bg-primary/20"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <input
                      type="radio"
                      id="weekly"
                      name="backup-frequency"
                      value="weekly"
                      checked={backupFrequency === "weekly"}
                      onChange={() => onFrequencyChange("weekly")}
                      className="mt-1 h-4 w-4 text-primary focus:ring-primary border rounded-full"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">
                            Weekly Backups
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
                          <DollarSign className="h-3.5 w-3.5" />
                          <span>{weeklyBackupPrice.toFixed(2)}/mo</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Automatic weekly backups of your entire server
                      </p>
                    </div>
                  </label>
                )}

                {/* Daily Backups Option */}
                {hasDailyBackups && (
                  <label
                    htmlFor="daily"
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                      backupFrequency === "daily"
                        ? "border-primary bg-primary/10 dark:bg-primary/20"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <input
                      type="radio"
                      id="daily"
                      name="backup-frequency"
                      value="daily"
                      checked={backupFrequency === "daily"}
                      onChange={() => onFrequencyChange("daily")}
                      className="mt-1 h-4 w-4 text-primary focus:ring-primary border rounded-full"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">
                            Daily Backups
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            +50%
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
                          <DollarSign className="h-3.5 w-3.5" />
                          <span>{dailyBackupPrice.toFixed(2)}/mo</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Automatic daily backups for maximum data protection
                      </p>
                    </div>
                  </label>
                )}
              </div>
            </>
          ) : (
            // Single option available - just show the pricing
            <div className="rounded-lg bg-muted p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {hasDailyBackups ? (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium text-foreground">
                    {hasDailyBackups ? "Daily Backups" : "Weekly Backups"}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span>
                    {hasDailyBackups
                      ? dailyBackupPrice.toFixed(2)
                      : weeklyBackupPrice.toFixed(2)}
                    /mo
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {hasDailyBackups
                  ? "Automatic daily backups of your entire server"
                  : "Automatic weekly backups of your entire server"}
              </p>
            </div>
          )}

          {/* Backup Pricing Breakdown */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Base backup cost:</span>
              <span className="font-medium text-foreground">
                ${(plan.backup_price_monthly || 0).toFixed(2)}/mo
              </span>
            </div>
            {(plan.backup_upcharge_monthly || 0) > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Service markup:</span>
                <span className="font-medium text-foreground">
                  ${(plan.backup_upcharge_monthly || 0).toFixed(2)}/mo
                </span>
              </div>
            )}
            {backupFrequency === "daily" && hasDailyBackups && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Daily multiplier:</span>
                <span className="font-medium text-foreground">×1.5</span>
              </div>
            )}
            <div className="pt-1.5 border-t border-border flex items-center justify-between text-xs font-semibold">
              <span className="text-foreground">Total backup cost:</span>
              <span className="text-primary">
                $
                {backupFrequency === "daily"
                  ? dailyBackupPrice.toFixed(2)
                  : weeklyBackupPrice.toFixed(2)}
                /mo
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
