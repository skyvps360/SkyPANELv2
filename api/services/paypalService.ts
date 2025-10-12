/**
 * PayPal Service for ContainerStacks
 * Handles wallet management, payments, and PayPal integration
 */

import { Client, Environment } from '@paypal/paypal-server-sdk';
import { config } from '../config/index.js';
import { query, transaction } from '../lib/database.js';

// Initialize PayPal client
const paypalClient = new Client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: config.PAYPAL_CLIENT_ID || '',
    oAuthClientSecret: config.PAYPAL_CLIENT_SECRET || '',
  },
  environment: config.PAYPAL_MODE === 'production' ? Environment.Production : Environment.Sandbox,
});

export interface PaymentIntent {
  amount: number;
  currency: string;
  description: string;
  organizationId: string;
  userId: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  approvalUrl?: string;
  error?: string;
}

export interface WalletTransaction {
  id: string;
  organizationId: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  paymentId?: string;
  createdAt: string;
}

export class PayPalService {
  /**
   * Create a PayPal payment order
   */
  static async createPayment(paymentIntent: PaymentIntent): Promise<PaymentResult> {
    try {
      if (!config.PAYPAL_CLIENT_ID || !config.PAYPAL_CLIENT_SECRET) {
        return {
          success: false,
          error: 'PayPal configuration not found'
        };
      }

      const request = {
        body: {
          intent: 'CAPTURE',
          purchaseUnits: [
            {
              amount: {
                currencyCode: paymentIntent.currency,
                value: paymentIntent.amount.toFixed(2),
              },
              description: paymentIntent.description,
              customId: paymentIntent.organizationId,
            },
          ],
          applicationContext: {
            returnUrl: `${process.env.CLIENT_URL}/billing/payment/success`,
            cancelUrl: `${process.env.CLIENT_URL}/billing/payment/cancel`,
            userAction: 'PAY_NOW',
          },
        },
      };

      const response = await paypalClient.orders.ordersCreate(request);

      if (response.statusCode === 201 && response.result) {
        const order = response.result;
        const approvalUrl = order.links?.find(link => link.rel === 'approve')?.href;

        // Store payment transaction in database
        await query(
          `INSERT INTO payment_transactions (id, organization_id, amount, currency, payment_method, payment_provider, provider_transaction_id, status, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [order.id, paymentIntent.organizationId, paymentIntent.amount, paymentIntent.currency, 'paypal', 'paypal', order.id, 'pending', paymentIntent.description]
        );

        return {
          success: true,
          paymentId: order.id,
          approvalUrl,
        };
      }

      return {
        success: false,
        error: 'Failed to create PayPal order',
      };
    } catch (error) {
      console.error('PayPal payment creation error:', error);
      return {
        success: false,
        error: 'Payment creation failed',
      };
    }
  }

  /**
   * Capture a PayPal payment after approval
   */
  static async capturePayment(orderId: string): Promise<PaymentResult> {
    try {
      const request = {
        id: orderId,
        body: {},
      };

      const response = await paypalClient.orders.ordersCapture(request);

      if (response.statusCode === 201 && response.result) {
        const order = response.result;
        const capture = order.purchaseUnits?.[0]?.payments?.captures?.[0];

        if (capture && capture.status === 'COMPLETED') {
          // Update payment intent status
          // Update payment transaction status
          const result = await query(
            `UPDATE payment_transactions 
             SET status = 'completed', updated_at = NOW() 
             WHERE provider_transaction_id = $1 
             RETURNING organization_id, amount`,
            [orderId]
          );

          if (result.rows.length > 0) {
            const paymentTransaction = result.rows[0];
            // Add funds to organization wallet
            await this.addFundsToWallet(
              paymentTransaction.organization_id,
              paymentTransaction.amount,
              `PayPal payment ${orderId}`,
              orderId
            );
          }

          return {
            success: true,
            paymentId: orderId,
          };
        }
      }

      return {
        success: false,
        error: 'Payment capture failed',
      };
    } catch (error) {
      console.error('PayPal payment capture error:', error);
      return {
        success: false,
        error: 'Payment capture failed',
      };
    }
  }

  /**
   * Add funds to organization wallet
   */
  static async addFundsToWallet(
    organizationId: string,
    amount: number,
    description: string,
    paymentId?: string
  ): Promise<boolean> {
    try {
      // Use database transaction for atomic operation
      return await transaction(async (client) => {
        // Get current wallet balance
        const walletResult = await client.query(
          'SELECT balance FROM wallets WHERE organization_id = $1',
          [organizationId]
        );

        if (walletResult.rows.length === 0) {
          console.error('Wallet not found for organization:', organizationId);
          return false;
        }

        const currentBalance = parseFloat(walletResult.rows[0].balance);
        const newBalance = currentBalance + amount;

        // Update wallet balance
        await client.query(
          'UPDATE wallets SET balance = $1, updated_at = NOW() WHERE organization_id = $2',
          [newBalance, organizationId]
        );

        // Record transaction in payment_transactions table
        await client.query(
          `INSERT INTO payment_transactions (organization_id, amount, currency, payment_method, payment_provider, status, description, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [organizationId, amount, 'USD', 'wallet_credit', 'internal', 'completed', description, JSON.stringify({ payment_id: paymentId, balance_after: newBalance })]
        );

        return true;
      });
    } catch (error) {
      console.error('Failed to add funds to wallet:', error);
      return false;
    }
  }

  /**
   * Deduct funds from organization wallet
   */
  static async deductFundsFromWallet(
    organizationId: string,
    amount: number,
    description: string
  ): Promise<boolean> {
    try {
      return await transaction(async (client) => {
        // Get current wallet balance
        const walletResult = await client.query(
          'SELECT balance FROM wallets WHERE organization_id = $1',
          [organizationId]
        );

        if (walletResult.rows.length === 0) {
          console.error('Wallet not found for organization:', organizationId);
          return false;
        }

        const currentBalance = parseFloat(walletResult.rows[0].balance);
        
        if (currentBalance < amount) {
          console.error('Insufficient funds');
          return false;
        }

        const newBalance = currentBalance - amount;

        // Update wallet balance
        await client.query(
          'UPDATE wallets SET balance = $1, updated_at = NOW() WHERE organization_id = $2',
          [newBalance, organizationId]
        );

        // Record transaction in payment_transactions table
        await client.query(
          `INSERT INTO payment_transactions (organization_id, amount, currency, payment_method, payment_provider, status, description, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [organizationId, -amount, 'USD', 'wallet_debit', 'internal', 'completed', description, JSON.stringify({ balance_after: newBalance })]
        );

        return true;
      });
    } catch (error) {
      console.error('Failed to deduct funds from wallet:', error);
      return false;
    }
  }

  /**
   * Get wallet balance for organization
   */
  static async getWalletBalance(organizationId: string): Promise<number | null> {
    try {
      const result = await query(
        'SELECT balance FROM wallets WHERE organization_id = $1',
        [organizationId]
      );

      if (result.rows.length === 0) {
        console.error('Wallet not found for organization:', organizationId);
        return null;
      }

      return parseFloat(result.rows[0].balance);
    } catch (error) {
      console.error('Get wallet balance error:', error);
      return null;
    }
  }

  /**
   * Get wallet transactions for organization
   */
  static async getWalletTransactions(
    organizationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<WalletTransaction[]> {
    try {
      const result = await query(
        `SELECT id, organization_id, amount, payment_method as type, description, 
                provider_transaction_id as paymentId, created_at
         FROM payment_transactions 
         WHERE organization_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [organizationId, limit, offset]
      );

      return result.rows.map(row => ({
        id: row.id,
        organizationId: row.organization_id,
        amount: parseFloat(row.amount),
        type: row.type.includes('credit') ? 'credit' : 'debit',
        description: row.description,
        paymentId: row.paymentid,
        createdAt: row.created_at
      }));
    } catch (error) {
      console.error('Get wallet transactions error:', error);
      return [];
    }
  }

  /**
   * Create a payout to user (for refunds, etc.)
   */
  static async createPayout(
    recipientEmail: string,
    amount: number,
    currency: string,
    note: string
  ): Promise<PaymentResult> {
    try {
      if (!config.PAYPAL_CLIENT_ID || !config.PAYPAL_CLIENT_SECRET) {
        return {
          success: false,
          error: 'PayPal configuration not found'
        };
      }

      const request = {
        body: {
          senderBatchHeader: {
            senderBatchId: `batch_${Date.now()}`,
            emailSubject: 'ContainerStacks Payout',
            emailMessage: note,
          },
          items: [
            {
              recipientType: 'EMAIL',
              amount: {
                value: amount.toFixed(2),
                currency,
              },
              receiver: recipientEmail,
              note,
              senderItemId: `item_${Date.now()}`,
            },
          ],
        },
      };

      const response = await paypalClient.payouts.payoutsPost(request);

      if (response.statusCode === 201 && response.result) {
        return {
          success: true,
          paymentId: response.result.batchHeader?.payoutBatchId,
        };
      }

      return {
        success: false,
        error: 'Failed to create payout',
      };
    } catch (error) {
      console.error('PayPal payout creation error:', error);
      return {
        success: false,
        error: 'Payout creation failed',
      };
    }
  }
}