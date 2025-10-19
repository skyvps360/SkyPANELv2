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
  failedInstances: string[];
  errors: string[];
}

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
          const billingSuccess = await this.billVPSInstance(instance);
          if (billingSuccess) {
            result.billedInstances++;
            result.totalAmount += instance.hourlyRate;
            console.log(`✅ Successfully billed VPS ${instance.label} (${instance.id}) - $${instance.hourlyRate.toFixed(4)}`);
          } else {
            result.failedInstances.push(instance.id);
            result.errors.push(`Failed to bill VPS ${instance.label} (${instance.id})`);
            console.error(`❌ Failed to bill VPS ${instance.label} (${instance.id})`);
          }
        } catch (error) {
          result.failedInstances.push(instance.id);
          result.errors.push(`Error billing VPS ${instance.label}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          console.error(`❌ Error billing VPS ${instance.label}:`, error);
        }
      }

      if (result.failedInstances.length > 0) {
        result.success = false;
      }

      console.log(`🏁 Billing completed: ${result.billedInstances} billed, ${result.failedInstances.length} failed, $${result.totalAmount.toFixed(2)} total`);
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
      WHERE vi.status IN ('running', 'provisioning')
        AND (
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
   * Bill a specific VPS instance for one hour
   */
  private static async billVPSInstance(instance: VPSBillingInfo): Promise<boolean> {
    try {
      return await transaction(async (client) => {
        const now = new Date();
        const billingPeriodStart = instance.lastBilledAt || instance.createdAt;
        const billingPeriodEnd = now;

        // Calculate actual hours to bill (minimum 1 hour)
        const hoursToCharge = Math.max(1, Math.ceil((billingPeriodEnd.getTime() - billingPeriodStart.getTime()) / (60 * 60 * 1000)));
        const totalAmount = instance.hourlyRate * hoursToCharge;

        // Check if organization has sufficient wallet balance
        const walletResult = await client.query(
          'SELECT balance FROM wallets WHERE organization_id = $1',
          [instance.organizationId]
        );

        if (walletResult.rows.length === 0) {
          console.error(`No wallet found for organization ${instance.organizationId}`);
          return false;
        }

        const currentBalance = parseFloat(walletResult.rows[0].balance);
        if (currentBalance < totalAmount) {
          console.warn(`Insufficient balance for VPS ${instance.label}: required $${totalAmount.toFixed(4)}, available $${currentBalance.toFixed(2)}`);
          
          // Create a failed billing cycle record
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
            JSON.stringify({ reason: 'insufficient_balance', hours_charged: hoursToCharge })
          ]);

          return false;
        }

        // Deduct funds from wallet
        const deductionSuccess = await PayPalService.deductFundsFromWallet(
          instance.organizationId,
          totalAmount,
          `VPS Hourly Billing - ${instance.label} (${hoursToCharge}h)`
        );

        if (!deductionSuccess) {
          console.error(`Failed to deduct funds for VPS ${instance.label}`);
          return false;
        }

        // Get the transaction ID from the most recent payment transaction
        const transactionResult = await client.query(`
          SELECT id FROM payment_transactions 
          WHERE organization_id = $1 
            AND description LIKE $2
            AND status = 'completed'
          ORDER BY created_at DESC 
          LIMIT 1
        `, [instance.organizationId, `%${instance.label}%`]);

        const paymentTransactionId = transactionResult.rows[0]?.id;

        // Create billing cycle record
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
          JSON.stringify({ hours_charged: hoursToCharge })
        ]);

        // Update last_billed_at timestamp
        await client.query(
          'UPDATE vps_instances SET last_billed_at = $1 WHERE id = $2',
          [now, instance.id]
        );

        return true;
      });
    } catch (error) {
      console.error(`Error billing VPS instance ${instance.id}:`, error);
      return false;
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
          bc.payment_transaction_id,
          bc.created_at
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
        paymentTransactionId: row.payment_transaction_id
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

      // Get total spent this month
      const monthlyResult = await query(`
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM vps_billing_cycles
        WHERE organization_id = $1 
          AND status = 'billed'
          AND created_at >= $2
      `, [organizationId, startOfMonth]);

      // Get total spent all time
      const allTimeResult = await query(`
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM vps_billing_cycles
        WHERE organization_id = $1 AND status = 'billed'
      `, [organizationId]);

      // Get active VPS count and monthly estimate
      const activeVPSResult = await query(`
        SELECT 
          COUNT(*) as count,
          COALESCE(SUM((base_price + markup_price)), 0) as monthly_estimate
        FROM vps_instances vi
        LEFT JOIN vps_plans vp ON (vp.id = vi.plan_id OR vp.provider_plan_id = vi.plan_id)
        WHERE vi.organization_id = $1 
          AND vi.status IN ('running', 'provisioning')
      `, [organizationId]);

      return {
        totalSpentThisMonth: parseFloat(monthlyResult.rows[0].total),
        totalSpentAllTime: parseFloat(allTimeResult.rows[0].total),
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
   * Stop billing for a VPS instance (when deleted or stopped)
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