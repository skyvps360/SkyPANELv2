/**
 * Payment Service for ContainerStacks Frontend
 * Handles PayPal payments and wallet management
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface PaymentIntent {
  amount: number;
  currency: string;
  description: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  approvalUrl?: string;
  error?: string;
}

export interface WalletBalance {
  balance: number;
}

export interface WalletTransaction {
  id: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  paymentId?: string;
  balanceAfter: number | null;
  createdAt: string;
}

export interface PaymentHistory {
  id: string;
  amount: number;
  currency: string;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  provider: string;
  providerPaymentId?: string;
  createdAt: string;
  updatedAt: string;
}

class PaymentService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  /**
   * Create a payment intent for adding funds to wallet
   */
  async createPayment(paymentIntent: PaymentIntent): Promise<PaymentResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/payments/create-payment`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(paymentIntent),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to create payment',
        };
      }

      return {
        success: true,
        paymentId: data.paymentId,
        approvalUrl: data.approvalUrl,
      };
    } catch (error) {
      console.error('Create payment error:', error);
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  /**
   * Capture a PayPal payment after user approval
   */
  async capturePayment(orderId: string): Promise<PaymentResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/payments/capture-payment/${orderId}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to capture payment',
        };
      }

      return {
        success: true,
        paymentId: data.paymentId,
      };
    } catch (error) {
      console.error('Capture payment error:', error);
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  /**
   * Get wallet balance for the organization
   */
  async getWalletBalance(): Promise<WalletBalance | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/payments/wallet/balance`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Failed to get wallet balance:', data.error);
        return null;
      }

      return {
        balance: data.balance,
      };
    } catch (error) {
      console.error('Get wallet balance error:', error);
      return null;
    }
  }

  /**
   * Get wallet transactions for the organization
   */
  async getWalletTransactions(
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    transactions: WalletTransaction[];
    hasMore: boolean;
  }> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/payments/wallet/transactions?limit=${limit}&offset=${offset}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('Failed to get wallet transactions:', data.error);
        return { transactions: [], hasMore: false };
      }

      return {
        transactions: (data.transactions || []).map((tx: any) => {
          const amountValue = typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount;
          const amount = Number.isFinite(amountValue) ? amountValue : 0;
          const balanceRaw = tx.balanceAfter ?? tx.balance_after;
          const balanceAfter =
            typeof balanceRaw === 'string'
              ? parseFloat(balanceRaw)
              : typeof balanceRaw === 'number' && Number.isFinite(balanceRaw)
                ? balanceRaw
                : null;
          const type = tx.type ?? (amount >= 0 ? 'credit' : 'debit');
          const createdAt = tx.createdAt ?? tx.created_at ?? '';

          return {
            id: tx.id,
            amount,
            type,
            description: tx.description ?? 'Unknown transaction',
            paymentId: tx.paymentId ?? tx.payment_id,
            balanceAfter,
            createdAt,
          };
        }),
        hasMore: data.pagination.hasMore,
      };
    } catch (error) {
      console.error('Get wallet transactions error:', error);
      return { transactions: [], hasMore: false };
    }
  }

  /**
   * Get payment history for the organization
   */
  async getPaymentHistory(
    limit: number = 50,
    offset: number = 0,
    status?: string
  ): Promise<{
    payments: PaymentHistory[];
    hasMore: boolean;
  }> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (status) {
        params.append('status', status);
      }

      const response = await fetch(
        `${API_BASE_URL}/payments/history?${params.toString()}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('Failed to get payment history:', data.error);
        return { payments: [], hasMore: false };
      }

      return {
        payments: data.payments.map((payment: any) => ({
          id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          description: payment.description,
          status: payment.status,
          provider: payment.provider,
          providerPaymentId: payment.provider_payment_id,
          createdAt: payment.created_at,
          updatedAt: payment.updated_at,
        })),
        hasMore: data.pagination.hasMore,
      };
    } catch (error) {
      console.error('Get payment history error:', error);
      return { payments: [], hasMore: false };
    }
  }

  /**
   * Create a refund/payout
   */
  async createRefund(
    email: string,
    amount: number,
    currency: string,
    reason: string
  ): Promise<PaymentResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/payments/refund`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          email,
          amount,
          currency,
          reason,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to create refund',
        };
      }

      return {
        success: true,
        paymentId: data.payoutId,
      };
    } catch (error) {
      console.error('Create refund error:', error);
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  /**
   * List invoices for the organization
   */
  async getInvoices(
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    invoices: Array<{
      id: string;
      invoiceNumber: string;
      totalAmount: number;
      currency: string;
      createdAt: string;
    }>;
    hasMore: boolean;
  }> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/invoices?limit=${limit}&offset=${offset}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('Failed to get invoices:', data.error);
        return { invoices: [], hasMore: false };
      }

      return {
        invoices: data.invoices,
        hasMore: data.pagination.hasMore,
      };
    } catch (error) {
      console.error('Get invoices error:', error);
      return { invoices: [], hasMore: false };
    }
  }

  /**
   * Open PayPal payment window
   */
  openPayPalPayment(approvalUrl: string): void {
    const popup = window.open(
      approvalUrl,
      'paypal-payment',
      'width=600,height=700,scrollbars=yes,resizable=yes'
    );

    if (!popup) {
      throw new Error('Popup blocked. Please allow popups for this site.');
    }

    // Listen for popup close or completion
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        // Refresh wallet balance after payment
        this.getWalletBalance();
      }
    }, 1000);
  }
}

export const paymentService = new PaymentService();