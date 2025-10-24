/**
 * Billing utilities for calculating monthly spent across the application
 */

import { paymentService } from '../services/paymentService';

export interface MonthlySpendResult {
  monthlySpend: number;
  error: string | null;
  hasDiscrepancy: boolean;
  serverValue?: number;
}

/**
 * Robust date parser for transaction createdAt values
 */
const parseDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  try {
    if (/^\d+$/.test(dateString)) {
      const ts = parseInt(dateString, 10);
      return new Date(ts < 10000000000 ? ts * 1000 : ts);
    }
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

/**
 * Calculate monthly spent from wallet transactions with calendar month boundaries
 * This is the same logic used in the Billing page for consistency
 */
export const calculateMonthlySpent = async (billingSummary?: { totalSpentThisMonth?: number }): Promise<MonthlySpendResult> => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const pageSize = 100;
    let offset = 0;
    let hasMore = true;
    let pagesFetched = 0;
    const maxPages = 20; // safety cap
    let monthlyTotal = 0;
    let foundAny = false;

    while (hasMore && pagesFetched < maxPages) {
      const result = await paymentService.getWalletTransactions(pageSize, offset);
      const pageTxs = result.transactions || [];
      if (pageTxs.length === 0) {
        hasMore = false;
        break;
      }

      // Filter to current month boundaries
      for (const tx of pageTxs) {
        const created = parseDate(tx.createdAt);
        if (!created) continue;
        if (created >= monthStart && created <= monthEnd) {
          foundAny = true;
          const isDebit = tx.type === 'debit' || (typeof tx.amount === 'number' && tx.amount < 0);
          if (isDebit) {
            monthlyTotal += Math.abs(tx.amount || 0);
          }
        }
      }

      hasMore = result.hasMore;
      offset += pageSize;
      pagesFetched += 1;

      // Optimization: if the oldest transaction in this page is before monthStart and API is sorted by date desc,
      // additional pages are unlikely to include current month. We keep going only if hasMore remains true.
    }

    const computedMonthlySpent = Number(monthlyTotal.toFixed(2));
    
    // Compare against server summary if available and flag discrepancies beyond small threshold
    const serverValue = billingSummary?.totalSpentThisMonth;
    let hasDiscrepancy = false;
    if (typeof serverValue === 'number') {
      const diff = Math.abs(serverValue - monthlyTotal);
      const threshold = Math.max(0.01, serverValue * 0.005); // 0.5% or $0.01
      hasDiscrepancy = diff > threshold;
    }

    return {
      monthlySpend: computedMonthlySpent,
      error: !foundAny ? 'No current-month transactions found' : null,
      hasDiscrepancy,
      serverValue
    };
  } catch (err) {
    console.error('Monthly spent calculation error:', err);
    return {
      monthlySpend: 0,
      error: 'Failed to calculate monthly spent',
      hasDiscrepancy: false
    };
  }
};

/**
 * Get monthly spent with fallback to server billing summary
 * Returns the computed value or server value with proper fallback logic
 */
export const getMonthlySpendWithFallback = async (): Promise<number> => {
  try {
    // Try to get billing summary from server first
    let billingSummary;
    try {
      const summaryResult = await paymentService.getBillingSummary();
      if (summaryResult.success && summaryResult.summary) {
        billingSummary = summaryResult.summary;
      }
    } catch (error) {
      // Billing summary might fail due to organization requirements, continue with local calculation
      console.warn('Failed to load billing summary, using local calculation:', error);
    }

    // Calculate monthly spent locally
    const result = await calculateMonthlySpent(billingSummary);
    
    // Use computed value or server value as fallback
    const displayValue = result.monthlySpend ?? billingSummary?.totalSpentThisMonth ?? 0;
    
    return displayValue;
  } catch (error) {
    console.error('Failed to get monthly spent:', error);
    return 0;
  }
};