/**
 * Billing Service for ContainerStacks
 * Handles automated VPS billing, hourly charges, and billing cycle management
 */

import { query, transaction } from '../lib/database.js';
import { PayPalService } from './paypalService.js';

export interface VPSBillingInfo {
  id: string;
  organizationId: string;
  label: string;
  status: string;
  hourlyRate: number;
  lastBilledAt: Date | null;
  createdAt: Date;
}

export interface BillingCycle {
  id: string;
  vpsInstanceId: string;
  organizationId: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  hourlyRate: number;
  totalAmount: number;
  status: 'pending' | 'billed' | 'failed' | 'refunded';
  paymentTransactionId?: string;
}

export interface BillingResult {
  success: boolean;
  billedInstances: number;
  totalAmount: number;
  totalHours: number;
  failedInstances: string[];
  errors: string[];
}

const MS_PER_HOUR = 60 * 60 * 1000;

export class BillingService {
  /**
   * Ensure the vps_instances.last_billed_at column exists.
   * Creates it if missing to avoid errors during billing.
   */
  private static async ensureLastBilledColumnExists(): Promise<boolean> {
    try {
      const check = await query(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_name = 'vps_instances' AND column_name = 'last_billed_at'
         ) AS exists`
      );
      const exists = Boolean(check.rows[0]?.exists);
      if (!exists) {
        await query(`ALTER TABLE vps_instances ADD COLUMN IF NOT EXISTS last_billed_at TIMESTAMP WITH TIME ZONE`);
        await query(`CREATE INDEX IF NOT EXISTS idx_vps_instances_last_billed_at ON vps_instances(last_billed_at)`);
        console.log('✅ Added missing column vps_instances.last_billed_at');
      }
      return true;
    } catch (err) {
      console.warn('⚠️ Could not verify or create last_billed_at column:', err);
      return false;
    }
  }
  /**
   * Run hourly billing for all active VPS instances
   */
  static async runHourlyBilling(): Promise<BillingResult> {
    console.log('🔄 Starting hourly VPS billing process...');
    
    const result: BillingResult = {
      success: true,
      billedInstances: 0,
      totalAmount: 0,
      totalHours: 0,
      failedInstances: [],
      errors: []
    };

    try {
      // Ensure schema prerequisites
      const hasColumn = await this.ensureLastBilledColumnExists();
      if (!hasColumn) {
        console.warn('Skipping hourly billing because last_billed_at column is missing.');
        return result;
      }
      // Get all active VPS instances that need billing
      const activeInstances = await this.getActiveVPSInstances();
      console.log(`📊 Found ${activeInstances.length} active VPS instances to process`);

      for (const instance of activeInstances) {
        try {
          const billingOutcome = await this.billVPSInstance(instance);
          if (!billingOutcome.success) {
            result.failedInstances.push(instance.id);
            result.errors.push(`Failed to bill VPS ${instance.label} (${instance.id})`);
            console.error(`❌ Failed to bill VPS ${instance.label} (${instance.id})`);
            continue;
          }

          if (billingOutcome.hoursCharged === 0) {
            console.log(`⏭️ No billable hours yet for VPS ${instance.label} (${instance.id}); skipping.`);
            continue;
          }

          result.billedInstances++;
          result.totalAmount += billingOutcome.amountCharged;
          result.totalHours += billingOutcome.hoursCharged;
          console.log(
            `✅ Successfully billed VPS ${instance.label} (${instance.id}) - ${billingOutcome.hoursCharged}h @ $${instance.hourlyRate.toFixed(4)}/h (charged $${billingOutcome.amountCharged.toFixed(4)})`
          );
        } catch (error) {
          result.failedInstances.push(instance.id);
          result.errors.push(`Error billing VPS ${instance.label}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          console.error(`❌ Error billing VPS ${instance.label}:`, error);
        }
      }

      if (result.failedInstances.length > 0) {
        result.success = false;
      }

      console.log(
        `🏁 Billing completed: ${result.billedInstances} billed, ${result.failedInstances.length} failed, ${result.totalHours}h charged, $${result.totalAmount.toFixed(2)} total`
      );
      return result;

    } catch (error) {
      console.error('💥 Critical error in hourly billing process:', error);
      result.success = false;
      result.errors.push(`Critical billing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Get all active VPS instances that need billing
   */
  private static async getActiveVPSInstances(): Promise<VPSBillingInfo[]> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const result = await query(`
      SELECT 
        vi.id,
        vi.organization_id,
        vi.label,
        vi.status,
        vi.last_billed_at,
        vi.created_at,
        COALESCE(
          -- Try to get hourly rate from VPS plan
          (SELECT (base_price + markup_price) / 730 
           FROM vps_plans 
           WHERE id::text = vi.plan_id OR provider_plan_id = vi.plan_id
           LIMIT 1),
          -- Fallback to a default rate if plan not found
          0.027
        ) as hourly_rate
      FROM vps_instances vi
      WHERE (
          vi.last_billed_at IS NULL 
          OR vi.last_billed_at <= $1
        )
      ORDER BY vi.created_at ASC
    `, [oneHourAgo]);

    return result.rows.map(row => ({
      id: row.id,
      organizationId: row.organization_id,
      label: row.label,
      status: row.status,
      hourlyRate: parseFloat(row.hourly_rate),
      lastBilledAt: row.last_billed_at ? new Date(row.last_billed_at) : null,
      createdAt: new Date(row.created_at)
    }));
  }

  /**
   * Bill a specific VPS instance for any fully elapsed hours since the last charge.
   */
  private static async billVPSInstance(
    instance: VPSBillingInfo
  ): Promise<{ success: boolean; amountCharged: number; hoursCharged: number }> {
    try {
      return await transaction(async (client) => {
        const now = new Date();
        const billingPeriodStart = instance.lastBilledAt ?? instance.createdAt;
        const elapsedMs = Math.max(0, now.getTime() - billingPeriodStart.getTime());
        const rawHoursElapsed = elapsedMs / MS_PER_HOUR;
        const hoursToCharge = Math.floor(rawHoursElapsed);

        if (hoursToCharge < 1) {
          return { success: true, amountCharged: 0, hoursCharged: 0 };
        }

        const billingPeriodEnd = new Date(billingPeriodStart.getTime() + hoursToCharge * MS_PER_HOUR);
        const totalAmount = Number((instance.hourlyRate * hoursToCharge).toFixed(4));

        const walletResult = await client.query(
          'SELECT balance FROM wallets WHERE organization_id = $1',
          [instance.organizationId]
        );

        if (walletResult.rows.length === 0) {
          console.error(`No wallet found for organization ${instance.organizationId}`);
          return { success: false, amountCharged: 0, hoursCharged: hoursToCharge };
        }

        const currentBalance = parseFloat(walletResult.rows[0].balance);
        if (currentBalance < totalAmount) {
          console.warn(
            `Insufficient balance for VPS ${instance.label}: required $${totalAmount.toFixed(4)}, available $${currentBalance.toFixed(2)}`
          );

          await client.query(`
            INSERT INTO vps_billing_cycles (
              vps_instance_id, organization_id, billing_period_start, billing_period_end,
              hourly_rate, total_amount, status, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            instance.id,
            instance.organizationId,
            billingPeriodStart,
            billingPeriodEnd,
            instance.hourlyRate,
            totalAmount,
            'failed',
            JSON.stringify({ reason: 'insufficient_balance', hours_charged: hoursToCharge, elapsed_hours: rawHoursElapsed })
          ]);

          return { success: false, amountCharged: 0, hoursCharged: hoursToCharge };
        }

        const deductionSuccess = await PayPalService.deductFundsFromWallet(
          instance.organizationId,
          totalAmount,
          `VPS Hourly Billing - ${instance.label} (${hoursToCharge}h)`
        );

        if (!deductionSuccess) {
          console.error(`Failed to deduct funds for VPS ${instance.label}`);

          await client.query(`
            INSERT INTO vps_billing_cycles (
              vps_instance_id, organization_id, billing_period_start, billing_period_end,
              hourly_rate, total_amount, status, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            instance.id,
            instance.organizationId,
            billingPeriodStart,
            billingPeriodEnd,
            instance.hourlyRate,
            totalAmount,
            'failed',
            JSON.stringify({ reason: 'wallet_deduction_failed', hours_charged: hoursToCharge, elapsed_hours: rawHoursElapsed })
          ]);

          return { success: false, amountCharged: 0, hoursCharged: hoursToCharge };
        }

        const transactionResult = await client.query(`
          SELECT id FROM payment_transactions 
          WHERE organization_id = $1 
            AND description LIKE $2
            AND status = 'completed'
          ORDER BY created_at DESC 
          LIMIT 1
        `, [instance.organizationId, `%${instance.label}%`]);

        const paymentTransactionId = transactionResult.rows[0]?.id;

        await client.query(`
          INSERT INTO vps_billing_cycles (
            vps_instance_id, organization_id, billing_period_start, billing_period_end,
            hourly_rate, total_amount, status, payment_transaction_id, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          instance.id,
          instance.organizationId,
          billingPeriodStart,
          billingPeriodEnd,
          instance.hourlyRate,
          totalAmount,
          'billed',
          paymentTransactionId,
          JSON.stringify({ hours_charged: hoursToCharge, elapsed_hours: rawHoursElapsed })
        ]);

        await client.query(
          'UPDATE vps_instances SET last_billed_at = $1 WHERE id = $2',
          [billingPeriodEnd, instance.id]
        );

        return { success: true, amountCharged: totalAmount, hoursCharged: hoursToCharge };
      });
    } catch (error) {
      console.error(`Error billing VPS instance ${instance.id}:`, error);
      return { success: false, amountCharged: 0, hoursCharged: 0 };
    }
  }

  /**
   * Get billing history for an organization
   */
  static async getBillingHistory(
    organizationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<BillingCycle[]> {
    try {
      const result = await query(`
        SELECT 
          bc.id,
          bc.vps_instance_id,
          bc.organization_id,
          bc.billing_period_start,
          bc.billing_period_end,
          bc.hourly_rate,
          bc.total_amount,
          bc.status,
          bc.payment_transaction_id
        FROM vps_billing_cycles bc
        WHERE bc.organization_id = $1
        ORDER BY bc.created_at DESC
        LIMIT $2 OFFSET $3
      `, [organizationId, limit, offset]);

      return result.rows.map(row => ({
        id: row.id,
        vpsInstanceId: row.vps_instance_id,
        organizationId: row.organization_id,
        billingPeriodStart: new Date(row.billing_period_start),
        billingPeriodEnd: new Date(row.billing_period_end),
        hourlyRate: parseFloat(row.hourly_rate),
        totalAmount: parseFloat(row.total_amount),
        status: row.status,
        paymentTransactionId: row.payment_transaction_id ?? undefined
      }));
    } catch (error) {
      console.error('Error getting billing history:', error);
      return [];
    }
  }

  /**
   * Get billing summary for an organization
   */
  static async getBillingSummary(organizationId: string): Promise<{
    totalSpentThisMonth: number;
    totalSpentAllTime: number;
    activeVPSCount: number;
    monthlyEstimate: number;
  }> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get total wallet debits for the organization
      const spendingResult = await query(`
        SELECT 
          COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END), 0) AS total_spent_all_time,
          COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END) FILTER (WHERE created_at >= $2), 0) AS total_spent_this_month
        FROM payment_transactions
        WHERE organization_id = $1
          AND status = 'completed'
      `, [organizationId, startOfMonth]);

      // Get active VPS count and monthly estimate
      // Note: All VPS instances are billed hourly regardless of status (running, stopped, etc.)
      // Only deleted instances (removed from table) stop billing
      const activeVPSResult = await query(`
        SELECT 
          COUNT(*) as count,
          COALESCE(SUM((base_price + markup_price)), 0) as monthly_estimate
        FROM vps_instances vi
        LEFT JOIN vps_plans vp ON (vp.id = vi.plan_id OR vp.provider_plan_id = vi.plan_id)
        WHERE vi.organization_id = $1
      `, [organizationId]);

      const totals = spendingResult.rows[0] ?? { total_spent_this_month: 0, total_spent_all_time: 0 };

      return {
        totalSpentThisMonth: Number(totals.total_spent_this_month) || 0,
        totalSpentAllTime: Number(totals.total_spent_all_time) || 0,
        activeVPSCount: parseInt(activeVPSResult.rows[0].count),
        monthlyEstimate: parseFloat(activeVPSResult.rows[0].monthly_estimate || '0')
      };
    } catch (error) {
      console.error('Error getting billing summary:', error);
      return {
        totalSpentThisMonth: 0,
        totalSpentAllTime: 0,
        activeVPSCount: 0,
        monthlyEstimate: 0
      };
    }
  }

  /**
   * Handle VPS creation billing (initial charge)
   */
  static async billVPSCreation(
    vpsInstanceId: string,
    organizationId: string,
    hourlyRate: number,
    label: string
  ): Promise<boolean> {
    try {
      console.log(`💳 Processing initial billing for VPS ${label} - $${hourlyRate.toFixed(4)}/hour`);

      const success = await PayPalService.deductFundsFromWallet(
        organizationId,
        hourlyRate,
        `VPS Creation - ${label} (Initial Hour)`
      );

      if (success) {
        // Update last_billed_at to current time, if column exists
        try {
          await this.ensureLastBilledColumnExists();
          await query('UPDATE vps_instances SET last_billed_at = NOW() WHERE id = $1', [vpsInstanceId]);
        } catch (updateErr) {
          // Do not fail initial billing if timestamp update fails
          console.warn(`Initial billing succeeded but timestamp update failed for VPS ${label}:`, updateErr);
        }

        console.log(`✅ Successfully charged initial hour for VPS ${label}`);
        return true;
      } else {
        console.error(`❌ Failed to charge initial hour for VPS ${label}`);
        return false;
      }
    } catch (error) {
      console.error(`Error billing VPS creation for ${label}:`, error);
      return false;
    }
  }

  /**
   * Stop billing for a VPS instance (when deleted)
   * Note: Stopping/powering off a VPS does NOT stop billing - you are charged for reserved resources
   * Billing only stops when the VPS is permanently deleted
   */
  static async stopVPSBilling(vpsInstanceId: string): Promise<void> {
    try {
      // Update the VPS instance to mark it as no longer billable
      try {
        await this.ensureLastBilledColumnExists();
        await query('UPDATE vps_instances SET last_billed_at = NOW() WHERE id = $1', [vpsInstanceId]);
      } catch (err) {
        console.warn('Failed to update last_billed_at when stopping billing:', err);
      }
      
      console.log(`🛑 Stopped billing for VPS instance ${vpsInstanceId}`);
    } catch (error) {
      console.error(`Error stopping billing for VPS ${vpsInstanceId}:`, error);
    }
  }
}