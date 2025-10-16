/**
 * PayPal Service for ContainerStacks
 * Handles wallet management, payments, and PayPal integration
 */

import {
  Client,
  Environment,
  OrdersController,
  CheckoutPaymentIntent,
  OrderApplicationContextUserAction,
  OrderApplicationContextShippingPreference,
  ItemCategory
} from '@paypal/paypal-server-sdk';
import { config } from '../config/index.js';
import { query, transaction } from '../lib/database.js';

// Initialize PayPal client
let paypalClient: Client;
let ordersController: OrdersController;

function getPayPalClient() {
  if (!paypalClient) {
    const isProduction = config.PAYPAL_MODE === 'production' || config.PAYPAL_MODE === 'live';
    const environment = isProduction ? Environment.Production : Environment.Sandbox;
    
    console.log('PayPal Client Configuration:', {
      mode: config.PAYPAL_MODE,
      environment: isProduction ? 'Production' : 'Sandbox',
      hasClientId: !!config.PAYPAL_CLIENT_ID,
      hasClientSecret: !!config.PAYPAL_CLIENT_SECRET
    });
    
    paypalClient = new Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: config.PAYPAL_CLIENT_ID,
        oAuthClientSecret: config.PAYPAL_CLIENT_SECRET,
      },
      environment,
    });
    ordersController = new OrdersController(paypalClient);
  }
  return { client: paypalClient, orders: ordersController };
}

export interface PaymentIntent {
  amount: number;
  currency: string;
  description: string;
  organizationId: string;
  userId: string;
  clientBaseUrl?: string;
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
  currency: string;
  type: 'credit' | 'debit';
  description: string;
  paymentId?: string;
  balanceBefore: number | null;
  balanceAfter: number | null;
  createdAt: string;
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export class PayPalService {
  /**
   * Create a PayPal payment order
   */
  static async createPayment(paymentIntent: PaymentIntent): Promise<PaymentResult> {
    try {
      if (!config.PAYPAL_CLIENT_ID || !config.PAYPAL_CLIENT_SECRET) {
        console.error('PayPal credentials missing:', {
          hasClientId: !!config.PAYPAL_CLIENT_ID,
          hasClientSecret: !!config.PAYPAL_CLIENT_SECRET
        });
        return {
          success: false,
          error: 'PayPal configuration not found'
        };
      }

      const currency = paymentIntent.currency;
      const amountValue = paymentIntent.amount.toFixed(2);
      const itemName = paymentIntent.description?.substring(0, 127) || 'Wallet Credit';

      const clientBaseUrl = paymentIntent.clientBaseUrl || process.env.CLIENT_URL || 'http://localhost:5173';

      const request = {
        body: {
          intent: CheckoutPaymentIntent.CAPTURE,
          purchaseUnits: [
            {
              amount: {
                currencyCode: currency,
                value: amountValue,
                breakdown: {
                  itemTotal: {
                    currencyCode: currency,
                    value: amountValue,
                  },
                },
              },
              description: paymentIntent.description,
              customId: paymentIntent.organizationId,
              items: [
                {
                  name: itemName,
                  quantity: '1',
                  category: ItemCategory.DIGITALGOODS,
                  unitAmount: {
                    currencyCode: currency,
                    value: amountValue,
                  },
                },
              ],
            },
          ],
          applicationContext: {
            brandName: 'ContainerStacks',
            returnUrl: `${clientBaseUrl}/billing/payment/success`,
            cancelUrl: `${clientBaseUrl}/billing/payment/cancel`,
            userAction: OrderApplicationContextUserAction.PAYNOW,
            shippingPreference: OrderApplicationContextShippingPreference.NOSHIPPING,
          },
        },
      };

      console.log('Creating PayPal order with request:', JSON.stringify(request, null, 2));

      const { orders } = getPayPalClient();
      const response = await orders.ordersCreate(request);

      console.log('PayPal response:', { statusCode: response.statusCode, hasResult: !!response.result });

      if (response.statusCode === 201 && response.result) {
        const order = response.result;
        const approvalUrl = order.links?.find(link => link.rel === 'approve')?.href;

        // Store payment transaction in database
        await query(
          `INSERT INTO payment_transactions (organization_id, amount, currency, payment_method, payment_provider, provider_transaction_id, status, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [paymentIntent.organizationId, paymentIntent.amount, paymentIntent.currency, 'paypal', 'paypal', order.id, 'pending', paymentIntent.description]
        );

        return {
          success: true,
          paymentId: order.id,
          approvalUrl,
        };
      }

      console.error('PayPal order creation failed - unexpected response:', response);
      return {
        success: false,
        error: 'Failed to create PayPal order',
      };
    } catch (error: unknown) {
      console.error('PayPal payment creation error:', error);
      if (typeof error === 'object' && error !== null) {
        const err = error as Record<string, unknown>;
        console.error('Error details:', {
          message: err.message,
          statusCode: err.statusCode,
          body: err.body,
          stack: err.stack
        });
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment creation failed',
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

      const { orders } = getPayPalClient();
      const response = await orders.ordersCapture(request);

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
             RETURNING id, organization_id, amount, description`,
            [orderId]
          );

          if (result.rows.length > 0) {
            const paymentTransaction = result.rows[0];
            // Add funds to organization wallet
            const credited = await this.addFundsToWallet(
              paymentTransaction.organization_id,
              parseFloat(paymentTransaction.amount),
              paymentTransaction.description || `PayPal payment ${orderId}`,
              orderId,
              paymentTransaction.id,
              {
                capture_id: capture.id,
              }
            );

            if (!credited) {
              console.error('PayPal capture succeeded but wallet update failed for order:', orderId);
              return {
                success: false,
                error: 'Payment captured but wallet update failed. Please contact support.',
              };
            }
          }

          return {
            success: true,
            paymentId: orderId,
          };
        }

        await query(
          `UPDATE payment_transactions
             SET status = 'failed',
                 metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
                 updated_at = NOW()
             WHERE provider_transaction_id = $1 AND status <> 'completed'`,
          [
            orderId,
            JSON.stringify({
              capture_status: capture?.status ?? order.status ?? 'FAILED',
              failure_time: new Date().toISOString(),
            }),
          ]
        );
      } else {
        await query(
          `UPDATE payment_transactions
             SET status = 'failed',
                 metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
                 updated_at = NOW()
             WHERE provider_transaction_id = $1 AND status <> 'completed'`,
          [
            orderId,
            JSON.stringify({
              capture_status: 'NO_RESPONSE',
              failure_time: new Date().toISOString(),
            }),
          ]
        );
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
    paymentId?: string,
    paymentTransactionId?: string,
    extraMetadata: Record<string, unknown> = {}
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
        const newBalance = Number((currentBalance + amount).toFixed(2));

        // Update wallet balance
        await client.query(
          'UPDATE wallets SET balance = $1, updated_at = NOW() WHERE organization_id = $2',
          [newBalance, organizationId]
        );

        const metadataUpdate: Record<string, unknown> = {
          balance_before: currentBalance,
          balance_after: newBalance,
          ...extraMetadata,
        };

        if (paymentId) {
          metadataUpdate.payment_id = paymentId;
        }

        if (paymentTransactionId) {
          await client.query(
            `UPDATE payment_transactions
             SET metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
                 status = 'completed',
                 updated_at = NOW()
             WHERE id = $2 AND organization_id = $1`,
            [organizationId, paymentTransactionId, JSON.stringify(metadataUpdate)]
          );
        } else {
          await client.query(
            `INSERT INTO payment_transactions (organization_id, amount, currency, payment_method, payment_provider, status, description, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [organizationId, amount, 'USD', 'wallet_credit', 'internal', 'completed', description, JSON.stringify(metadataUpdate)]
          );
        }

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

        const newBalance = Number((currentBalance - amount).toFixed(2));

        // Update wallet balance
        await client.query(
          'UPDATE wallets SET balance = $1, updated_at = NOW() WHERE organization_id = $2',
          [newBalance, organizationId]
        );

        // Record transaction in payment_transactions table
        await client.query(
          `INSERT INTO payment_transactions (organization_id, amount, currency, payment_method, payment_provider, status, description, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            organizationId,
            -amount,
            'USD',
            'wallet_debit',
            'internal',
            'completed',
            description,
            JSON.stringify({ balance_before: currentBalance, balance_after: newBalance }),
          ]
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
        `WITH ordered AS (
           SELECT
             id,
             organization_id,
             amount,
              currency,
             payment_method,
             description,
             provider_transaction_id,
             created_at,
             metadata,
             SUM(amount) OVER (
               PARTITION BY organization_id
               ORDER BY created_at ASC, id ASC
             ) AS balance_after
           FROM payment_transactions
           WHERE organization_id = $1 AND status = 'completed'
         )
         SELECT
           id,
           organization_id,
           amount,
            currency,
           payment_method,
           description,
           provider_transaction_id,
           created_at,
           metadata,
           balance_after
         FROM ordered
         ORDER BY created_at DESC, id DESC
         LIMIT $2 OFFSET $3`,
        [organizationId, limit, offset]
      );

      return result.rows.map(row => {
        const amount = toNumber(row.amount) ?? 0;
        const metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {});
        const metadataBalance =
          metadata.balance_after ??
          metadata.balanceAfter ??
          metadata.balance ??
          null;
        const rawBalance =
          metadataBalance !== null && metadataBalance !== undefined
            ? metadataBalance
            : row.balance_after ?? null;
        const balanceAfter = toNumber(rawBalance);

        const metadataBefore =
          metadata.balance_before ??
          metadata.balanceBefore ??
          null;
        const balanceBefore =
          toNumber(metadataBefore) ??
          (balanceAfter !== null
            ? parseFloat((balanceAfter - amount).toFixed(2))
            : null);

        return {
          id: row.id,
          organizationId: row.organization_id,
          amount,
          currency: row.currency || 'USD',
          type: amount >= 0 ? 'credit' : 'debit',
          description: row.description ?? 'Wallet adjustment',
          paymentId: row.provider_transaction_id || undefined,
          balanceBefore,
          balanceAfter,
          createdAt: row.created_at,
        };
      });
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

      const { client } = getPayPalClient();
  const payoutsApi = (client as unknown as { payouts?: { payoutsPost: (payload: unknown) => Promise<unknown> } }).payouts;

      if (!payoutsApi?.payoutsPost) {
        console.error('PayPal payouts API is not available in the current SDK client.');
        return {
          success: false,
          error: 'PayPal payouts are not configured',
        };
      }

      const response = await payoutsApi.payoutsPost(request) as {
        statusCode?: number;
        result?: { batchHeader?: { payoutBatchId?: string } };
      };

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