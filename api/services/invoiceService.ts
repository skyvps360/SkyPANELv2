/**
 * Invoice Service for ContainerStacks
 * Handles invoice generation, storage, and export
 */

import { query } from '../lib/database.js';

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  organizationId: string;
  title?: string;
  description?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  createdAt: Date;
  dueDate?: Date;
  status: 'draft' | 'issued' | 'paid' | 'cancelled';
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export class InvoiceService {
  /**
   * Generate HTML invoice from transaction data
   */
  static generateInvoiceHTML(
    invoiceData: InvoiceData,
    companyName: string = 'ContainerStacks',
    companyLogo?: string
  ): string {
    const formattedDate = invoiceData.createdAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const itemsHTML = invoiceData.items
      .map(
        item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${item.description}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">$${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">$${item.amount.toFixed(2)}</td>
      </tr>
    `
      )
      .join('');

    const logoHTML = companyLogo
      ? `<img src="${companyLogo}" alt="Logo" style="height: 60px; margin-bottom: 20px;" />`
      : '';

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${invoiceData.invoiceNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
          color: #333;
          line-height: 1.6;
        }
        .container {
          max-width: 850px;
          margin: 0 auto;
          padding: 40px;
          background: white;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          border-bottom: 2px solid #007bff;
          padding-bottom: 20px;
        }
        .company-info {
          flex: 1;
        }
        .company-info h1 {
          font-size: 28px;
          color: #007bff;
          margin: 10px 0;
        }
        .invoice-info {
          text-align: right;
        }
        .invoice-info h2 {
          font-size: 32px;
          color: #007bff;
          margin-bottom: 10px;
        }
        .invoice-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin: 20px 0 40px 0;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 5px;
        }
        .invoice-meta-item {
          display: flex;
          flex-direction: column;
        }
        .invoice-meta-label {
          font-weight: 600;
          color: #666;
          font-size: 12px;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .invoice-meta-value {
          font-size: 16px;
          color: #333;
        }
        table {
          width: 100%;
          margin: 30px 0;
          border-collapse: collapse;
        }
        table thead {
          background: #f8f9fa;
        }
        table th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #333;
          border-bottom: 2px solid #dee2e6;
        }
        table td {
          padding: 12px;
          border-bottom: 1px solid #e0e0e0;
        }
        table tr:last-child td {
          border-bottom: none;
        }
        .totals {
          display: flex;
          justify-content: flex-end;
          margin: 30px 0;
        }
        .totals-section {
          width: 300px;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #e0e0e0;
        }
        .totals-row.total {
          border-bottom: 2px solid #007bff;
          font-size: 18px;
          font-weight: 600;
          color: #007bff;
          padding: 15px 0;
        }
        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          margin-top: 20px;
        }
        .status-badge.issued {
          background: #e3f2fd;
          color: #1976d2;
        }
        .status-badge.paid {
          background: #e8f5e9;
          color: #388e3c;
        }
        .status-badge.draft {
          background: #fff3e0;
          color: #f57c00;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 100%;
            margin: 0;
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="company-info">
            ${logoHTML}
            <h1>${companyName}</h1>
            <p style="color: #666;">Billing & Payments</p>
          </div>
          <div class="invoice-info">
            <h2>INVOICE</h2>
            <p style="font-size: 18px; color: #007bff; font-weight: 600;">${invoiceData.invoiceNumber}</p>
          </div>
        </div>

        <div class="invoice-meta">
          <div class="invoice-meta-item">
            <span class="invoice-meta-label">Invoice Date</span>
            <span class="invoice-meta-value">${formattedDate}</span>
          </div>
          <div class="invoice-meta-item">
            <span class="invoice-meta-label">Invoice Status</span>
            <span class="invoice-meta-value" style="text-transform: capitalize;">${invoiceData.status}</span>
          </div>
          ${invoiceData.dueDate ? `
          <div class="invoice-meta-item">
            <span class="invoice-meta-label">Due Date</span>
            <span class="invoice-meta-value">${invoiceData.dueDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}</span>
          </div>
          ` : ''}
          <div class="invoice-meta-item">
            <span class="invoice-meta-label">Organization ID</span>
            <span class="invoice-meta-value" style="font-family: monospace; font-size: 14px;">${invoiceData.organizationId}</span>
          </div>
        </div>

        ${invoiceData.title ? `<h3 style="margin-bottom: 20px; color: #333;">${invoiceData.title}</h3>` : ''}
        ${invoiceData.description ? `<p style="margin-bottom: 30px; color: #666;">${invoiceData.description}</p>` : ''}

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: center;">Quantity</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-section">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>$${invoiceData.subtotal.toFixed(2)}</span>
            </div>
            ${invoiceData.tax > 0 ? `
            <div class="totals-row">
              <span>Tax:</span>
              <span>$${invoiceData.tax.toFixed(2)}</span>
            </div>
            ` : ''}
            <div class="totals-row total">
              <span>Total:</span>
              <span>${invoiceData.currency} $${invoiceData.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div style="text-align: right;">
          <span class="status-badge ${invoiceData.status}">${invoiceData.status.toUpperCase()}</span>
        </div>

        <div class="footer">
          <p style="margin: 10px 0;">Thank you for your business with ${companyName}</p>
          <p style="margin: 10px 0; color: #999;">This is an automated invoice. Please retain this document for your records.</p>
          <p style="margin: 10px 0; color: #999;">Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} UTC</p>
        </div>
      </div>
    </body>
    </html>
    `;

    return html;
  }

  /**
   * Create and store an invoice
   */
  static async createInvoice(
    organizationId: string,
    invoiceNumber: string,
    htmlContent: string,
    data: Record<string, unknown>,
    totalAmount: number,
    currency: string = 'USD'
  ): Promise<string> {
    try {
      const result = await query(
        `INSERT INTO billing_invoices (
          organization_id, 
          invoice_number, 
          html_content, 
          data, 
          total_amount, 
          currency
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id`,
        [organizationId, invoiceNumber, htmlContent, JSON.stringify(data), totalAmount, currency]
      );

      return result.rows[0].id;
    } catch (error) {
      console.error('Failed to create invoice:', error);
      throw error;
    }
  }

  /**
   * Get invoice by ID
   */
  static async getInvoice(invoiceId: string, organizationId: string) {
    try {
      const result = await query(
        `SELECT 
          id, 
          organization_id, 
          invoice_number, 
          html_content, 
          data, 
          total_amount, 
          currency, 
          created_at, 
          updated_at
        FROM billing_invoices
        WHERE id = $1 AND organization_id = $2`,
        [invoiceId, organizationId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        organizationId: row.organization_id,
        invoiceNumber: row.invoice_number,
        htmlContent: row.html_content,
        data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
        totalAmount: parseFloat(row.total_amount),
        currency: row.currency,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.error('Failed to get invoice:', error);
      return null;
    }
  }

  /**
   * List invoices for organization
   */
  static async listInvoices(organizationId: string, limit: number = 50, offset: number = 0) {
    try {
      const result = await query(
        `SELECT 
          id, 
          organization_id, 
          invoice_number, 
          total_amount, 
          currency, 
          created_at
        FROM billing_invoices
        WHERE organization_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3`,
        [organizationId, limit, offset]
      );

      return result.rows.map(row => ({
        id: row.id,
        organizationId: row.organization_id,
        invoiceNumber: row.invoice_number,
        totalAmount: parseFloat(row.total_amount),
        currency: row.currency,
        createdAt: row.created_at,
      }));
    } catch (error) {
      console.error('Failed to list invoices:', error);
      return [];
    }
  }

  /**
   * Generate invoice from payment transactions
   */
  static generateInvoiceFromTransactions(
    organizationId: string,
    transactions: Array<{description?: string; amount: string | number; createdAt?: string}>,
    invoiceNumber: string
  ): InvoiceData {
    const items: InvoiceItem[] = transactions.map(tx => {
      const amount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount;
      return {
        description: tx.description || 'Wallet transaction',
        quantity: 1,
        unitPrice: amount,
        amount,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const tax = 0; // No tax for wallet adjustments
    const total = subtotal + tax;

    return {
      id: `inv-${Date.now()}`,
      invoiceNumber,
      organizationId,
      title: 'Billing Statement',
      description: `Payment transactions from ${transactions[transactions.length - 1]?.createdAt || 'unknown'} to ${transactions[0]?.createdAt || 'unknown'}`,
      items,
      subtotal,
      tax,
      total,
      currency: 'USD',
      createdAt: new Date(),
      status: 'issued',
    };
  }
}
