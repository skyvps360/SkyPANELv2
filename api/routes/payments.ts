/**
 * Payment Routes for ContainerStacks
 * Handles PayPal payments, wallet management, and billing
 */

import express, { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { PayPalService } from '../services/paypalService.js';
import { authenticateToken, requireOrganization } from '../middleware/auth.js';
import { query as dbQuery, transaction } from '../lib/database.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * Create a payment intent for adding funds to wallet
 */
router.post(
  '/create-payment',
  [
    body('amount')
      .isFloat({ min: 1 })
      .withMessage('Amount must be a positive number'),
    body('currency')
      .isIn(['USD', 'EUR', 'GBP'])
      .withMessage('Currency must be USD, EUR, or GBP'),
    body('description')
      .isLength({ min: 1, max: 255 })
      .withMessage('Description is required and must be less than 255 characters'),
  ],
  requireOrganization,
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { amount, currency, description } = req.body;
      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;

      const result = await PayPalService.createPayment({
        amount: parseFloat(amount),
        currency,
        description,
        organizationId,
        userId,
      });

      if (result.success) {
        res.json({
          success: true,
          paymentId: result.paymentId,
          approvalUrl: result.approvalUrl,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error('Create payment error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * Capture a PayPal payment after user approval
 */
router.post(
  '/capture-payment/:orderId',
  [
    param('orderId')
      .isLength({ min: 1 })
      .withMessage('Order ID is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { orderId } = req.params;

      const result = await PayPalService.capturePayment(orderId);

      if (result.success) {
        res.json({
          success: true,
          paymentId: result.paymentId,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error('Capture payment error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * Get wallet balance for the organization
 */
router.get('/wallet/balance', requireOrganization, async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;

    const balance = await PayPalService.getWalletBalance(organizationId);

    if (balance !== null) {
      res.json({
        success: true,
        balance,
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Wallet not found',
      });
    }
  } catch (error) {
    console.error('Get wallet balance error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * Get wallet transactions for the organization
 */
router.get(
  '/wallet/transactions',
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer'),
  ],
  requireOrganization,
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const organizationId = (req as any).user.organizationId;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const transactions = await PayPalService.getWalletTransactions(
        organizationId,
        limit,
        offset
      );

      res.json({
        success: true,
        transactions,
        pagination: {
          limit,
          offset,
          hasMore: transactions.length === limit,
        },
      });
    } catch (error) {
      console.error('Get wallet transactions error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * Get payment history for the organization
 */
router.get(
  '/history',
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer'),
    query('status')
      .optional()
      .isIn(['pending', 'completed', 'failed', 'cancelled'])
      .withMessage('Status must be pending, completed, failed, or cancelled'),
  ],
  requireOrganization,
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const organizationId = (req as any).user.organizationId;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status as string;

      let query = supabaseAdmin
        .from('payment_intents')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('status', status);
      }

      const { data: payments, error } = await query;

      if (error) {
        console.error('Failed to get payment history:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to retrieve payment history',
        });
      }

      res.json({
        success: true,
        payments: payments || [],
        pagination: {
          limit,
          offset,
          hasMore: (payments || []).length === limit,
        },
      });
    } catch (error) {
      console.error('Get payment history error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * Create a refund/payout
 */
router.post(
  '/refund',
  [
    body('email')
      .isEmail()
      .withMessage('Valid email is required'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be a positive number'),
    body('currency')
      .isIn(['USD', 'EUR', 'GBP'])
      .withMessage('Currency must be USD, EUR, or GBP'),
    body('reason')
      .isLength({ min: 1, max: 255 })
      .withMessage('Reason is required and must be less than 255 characters'),
  ],
  requireOrganization,
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { email, amount, currency, reason } = req.body;
      const organizationId = (req as any).user.organizationId;

      // Check if organization has sufficient funds
      const balance = await PayPalService.getWalletBalance(organizationId);
      if (balance === null || balance < parseFloat(amount)) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient funds for refund',
        });
      }

      // Create payout
      const result = await PayPalService.createPayout(
        email,
        parseFloat(amount),
        currency,
        reason
      );

      if (result.success) {
        // Deduct funds from wallet
        await PayPalService.deductFundsFromWallet(
          organizationId,
          parseFloat(amount),
          `Refund: ${reason}`
        );

        res.json({
          success: true,
          payoutId: result.paymentId,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error('Create refund error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

export default router;