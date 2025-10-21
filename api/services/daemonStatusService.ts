/**
 * Daemon Status Service for ContainerStacks
 * Manages billing daemon status and coordination with built-in billing
 */

import { query } from '../lib/database.js';

interface DaemonStatus {
  status: 'running' | 'stopped' | 'error' | 'unknown';
  lastRun: string | null;
  lastRunSuccess: boolean;
  instancesBilled: number;
  totalAmount: number;
  totalHours: number;
  nextScheduledRun: string | null;
  uptimeMinutes: number | null;
  isStale: boolean;
  warningThresholdExceeded: boolean;
  errorMessage?: string;
}

interface DaemonStatusRow {
  id: number;
  daemon_instance_id: string;
  status: string;
  last_run_at: Date | null;
  last_run_success: boolean | null;
  instances_billed: number;
  total_amount: string;
  total_hours: string;
  error_message: string | null;
  started_at: Date | null;
  heartbeat_at: Date | null;
  metadata: any;
  created_at: Date;
  updated_at: Date;
}

export class DaemonStatusService {
  private static readonly HEARTBEAT_THRESHOLD_MS = 90 * 60 * 1000; // 90 minutes
  private static readonly BILLING_INTERVAL_MS = 60 * 60 * 1000; // 60 minutes

  /**
   * Get the current daemon status from the database
   */
  static async getDaemonStatus(): Promise<DaemonStatus> {
    try {
      // Get the most recent daemon status record
      const result = await query(`
        SELECT 
          id,
          daemon_instance_id,
          status,
          last_run_at,
          last_run_success,
          instances_billed,
          total_amount,
          total_hours,
          error_message,
          started_at,
          heartbeat_at,
          metadata,
          created_at,
          updated_at
        FROM billing_daemon_status
        ORDER BY heartbeat_at DESC NULLS LAST, updated_at DESC
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        // No daemon status found - daemon has never run
        return {
          status: 'unknown',
          lastRun: null,
          lastRunSuccess: false,
          instancesBilled: 0,
          totalAmount: 0,
          totalHours: 0,
          nextScheduledRun: null,
          uptimeMinutes: null,
          isStale: true,
          warningThresholdExceeded: true
        };
      }

      const row: DaemonStatusRow = result.rows[0];
      const now = new Date();

      // Check if daemon is active based on heartbeat
      const isActive = this.isDaemonActiveFromRow(row, now);
      const warningThresholdExceeded = this.checkWarningThreshold(row, now);

      // Calculate uptime if daemon is running
      let uptimeMinutes: number | null = null;
      if (row.started_at && isActive) {
        const uptimeMs = now.getTime() - new Date(row.started_at).getTime();
        uptimeMinutes = Math.floor(uptimeMs / (60 * 1000));
      }

      // Calculate next scheduled run if daemon is active
      let nextScheduledRun: string | null = null;
      if (isActive && row.last_run_at) {
        const nextRun = new Date(new Date(row.last_run_at).getTime() + this.BILLING_INTERVAL_MS);
        nextScheduledRun = nextRun.toISOString();
      }

      return {
        status: isActive ? (row.status as any) : 'stopped',
        lastRun: row.last_run_at ? new Date(row.last_run_at).toISOString() : null,
        lastRunSuccess: row.last_run_success ?? false,
        instancesBilled: row.instances_billed || 0,
        totalAmount: parseFloat(row.total_amount) || 0,
        totalHours: parseFloat(row.total_hours) || 0,
        nextScheduledRun,
        uptimeMinutes,
        isStale: !isActive,
        warningThresholdExceeded,
        errorMessage: row.error_message || undefined
      };
    } catch (error) {
      console.error('Error fetching daemon status:', error);
      
      // Return unknown status on error
      return {
        status: 'unknown',
        lastRun: null,
        lastRunSuccess: false,
        instancesBilled: 0,
        totalAmount: 0,
        totalHours: 0,
        nextScheduledRun: null,
        uptimeMinutes: null,
        isStale: true,
        warningThresholdExceeded: true,
        errorMessage: 'Failed to fetch daemon status from database'
      };
    }
  }

  /**
   * Check if daemon is active based on heartbeat timestamp
   */
  static async isDaemonActive(): Promise<boolean> {
    try {
      const result = await query(`
        SELECT heartbeat_at
        FROM billing_daemon_status
        ORDER BY heartbeat_at DESC NULLS LAST
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        return false;
      }

      const row = result.rows[0];
      return this.isDaemonActiveFromRow(row, new Date());
    } catch (error) {
      console.error('Error checking daemon active status:', error);
      return false;
    }
  }

  /**
   * Helper to check if daemon is active from a row
   */
  private static isDaemonActiveFromRow(row: any, now: Date): boolean {
    if (!row.heartbeat_at) {
      return false;
    }

    const heartbeatTime = new Date(row.heartbeat_at).getTime();
    const nowTime = now.getTime();
    const timeSinceHeartbeat = nowTime - heartbeatTime;

    return timeSinceHeartbeat < this.HEARTBEAT_THRESHOLD_MS;
  }

  /**
   * Determine if built-in billing should run
   * Returns true if daemon is inactive (no heartbeat within 90 minutes)
   */
  static async shouldRunBuiltInBilling(): Promise<boolean> {
    const isActive = await this.isDaemonActive();
    return !isActive;
  }

  /**
   * Check if warning threshold is exceeded (no run in 90+ minutes)
   */
  static async checkDaemonHealth(): Promise<boolean> {
    try {
      const result = await query(`
        SELECT last_run_at, heartbeat_at
        FROM billing_daemon_status
        ORDER BY heartbeat_at DESC NULLS LAST, updated_at DESC
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        return true; // Warning: no daemon status found
      }

      const row = result.rows[0];
      return this.checkWarningThreshold(row, new Date());
    } catch (error) {
      console.error('Error checking daemon health:', error);
      return true; // Warning on error
    }
  }

  /**
   * Helper to check warning threshold from a row
   */
  private static checkWarningThreshold(row: any, now: Date): boolean {
    // Check both last_run_at and heartbeat_at
    // Warning if either:
    // 1. No last run recorded
    // 2. Last run was more than 90 minutes ago
    // 3. No heartbeat or heartbeat is stale

    if (!row.last_run_at && !row.heartbeat_at) {
      return true; // No activity at all
    }

    const nowTime = now.getTime();

    // Check heartbeat first (more critical)
    if (row.heartbeat_at) {
      const heartbeatTime = new Date(row.heartbeat_at).getTime();
      const timeSinceHeartbeat = nowTime - heartbeatTime;
      
      if (timeSinceHeartbeat >= this.HEARTBEAT_THRESHOLD_MS) {
        return true; // Heartbeat is stale
      }
    }

    // Check last run
    if (row.last_run_at) {
      const lastRunTime = new Date(row.last_run_at).getTime();
      const timeSinceLastRun = nowTime - lastRunTime;
      
      if (timeSinceLastRun >= this.HEARTBEAT_THRESHOLD_MS) {
        return true; // No billing run in 90+ minutes
      }
    }

    return false; // All checks passed
  }

  /**
   * Get daemon metrics for monitoring
   */
  static async getDaemonMetrics(): Promise<{
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    totalInstancesBilled: number;
    totalAmountBilled: number;
  }> {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_runs,
          COUNT(*) FILTER (WHERE last_run_success = true) as successful_runs,
          COUNT(*) FILTER (WHERE last_run_success = false) as failed_runs,
          COALESCE(SUM(instances_billed), 0) as total_instances_billed,
          COALESCE(SUM(total_amount), 0) as total_amount_billed
        FROM billing_daemon_status
        WHERE last_run_at IS NOT NULL
      `);

      const row = result.rows[0] || {
        total_runs: 0,
        successful_runs: 0,
        failed_runs: 0,
        total_instances_billed: 0,
        total_amount_billed: 0
      };

      return {
        totalRuns: parseInt(row.total_runs) || 0,
        successfulRuns: parseInt(row.successful_runs) || 0,
        failedRuns: parseInt(row.failed_runs) || 0,
        totalInstancesBilled: parseInt(row.total_instances_billed) || 0,
        totalAmountBilled: parseFloat(row.total_amount_billed) || 0
      };
    } catch (error) {
      console.error('Error fetching daemon metrics:', error);
      return {
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        totalInstancesBilled: 0,
        totalAmountBilled: 0
      };
    }
  }
}
