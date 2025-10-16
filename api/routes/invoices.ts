/**
 * Invoice Routes for ContainerStacks
 * Handles invoice listing, viewing, and export
 */

import express, { Request, Response } from 'express';
import { param, query, validationResult } from 'express-validator';
import { authenticateToken, requireOrganization } from '../middleware/auth.js';
import { InvoiceService } from '../services/invoiceService.js';
import { PayPalService } from '../services/paypalService.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * List invoices for the organization
 */
router.get(
  '/',
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

      const invoices = await InvoiceService.listInvoices(organizationId, limit, offset);

      res.json({
        success: true,
        invoices,
        pagination: {
          limit,
          offset,
          hasMore: invoices.length === limit,
        },
      });
    } catch (error) {
      console.error('List invoices error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * Get invoice details and view as HTML
 */
router.get(
  '/:id',
  [
    param('id')
      .isUUID()
      .withMessage('Invoice ID must be a valid UUID'),
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

      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      const invoice = await InvoiceService.getInvoice(id, organizationId);

      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
      }

      // Return JSON with invoice details
      res.json({
        success: true,
        invoice,
      });
    } catch (error) {
      console.error('Get invoice error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * Download invoice as HTML file
 */
router.get(
  '/:id/download',
  [
    param('id')
      .isUUID()
      .withMessage('Invoice ID must be a valid UUID'),
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

      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      const invoice = await InvoiceService.getInvoice(id, organizationId);

      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
      }

      // Set response headers for HTML download
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="invoice-${invoice.invoiceNumber}.html"`
      );

      // Send HTML content
      res.send(invoice.htmlContent);
    } catch (error) {
      console.error('Download invoice error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * Create invoice from payment transactions
 */
router.post(
  '/from-transactions',
  requireOrganization,
  async (req: Request, res: Response) => {
    try {
      const organizationId = (req as any).user.organizationId;
      const invoiceNumber = `INV-${Date.now()}`;

      // Get recent transactions for this organization
      const transactions = await PayPalService.getWalletTransactions(
        organizationId,
        50,
        0
      );

      if (transactions.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No transactions found to create invoice',
        });
      }

      // Generate invoice data
      const invoiceData = InvoiceService.generateInvoiceFromTransactions(
        organizationId,
        transactions,
        invoiceNumber
      );

      // Generate HTML
      const htmlContent = InvoiceService.generateInvoiceHTML(invoiceData);

      // Store invoice
      const invoiceId = await InvoiceService.createInvoice(
        organizationId,
        invoiceNumber,
        htmlContent,
        invoiceData as unknown as Record<string, unknown>,
        invoiceData.total,
        'USD'
      );

      res.json({
        success: true,
        invoiceId,
        invoiceNumber,
      });
    } catch (error) {
      console.error('Create invoice from transactions error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

export default router;
