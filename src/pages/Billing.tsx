/**
 * Billing Page Component
 * Handles wallet management, payments, and billing history
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, 
  Plus, 
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Filter,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { paymentService, type WalletTransaction, type PaymentHistory } from '../services/paymentService';
import Pagination from '../components/ui/Pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// Navigation provided by AppLayout

interface FilterState {
  status: string;
  dateFrom: string;
  dateTo: string;
}

interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
}

const Billing: React.FC = () => {
  const navigate = useNavigate();
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [addFundsAmount, setAddFundsAmount] = useState('');
  const [addFundsLoading, setAddFundsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'history'>('overview');
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    dateFrom: '',
    dateTo: ''
  });

  // Pagination states for each tab
  const [overviewPagination, setOverviewPagination] = useState<PaginationState>({
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0,
  });

  const [transactionsPagination, setTransactionsPagination] = useState<PaginationState>({
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0,
  });

  const [historyPagination, setHistoryPagination] = useState<PaginationState>({
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0,
  });

  // Define load functions with useCallback
  const loadOverviewData = React.useCallback(async () => {
    try {
      const offset = (overviewPagination.currentPage - 1) * overviewPagination.itemsPerPage;
      const result = await paymentService.getWalletTransactions(
        overviewPagination.itemsPerPage,
        offset
      );
      setTransactions(result.transactions);
      
      // Fetch total count - we'll approximate based on hasMore
      if (result.hasMore) {
        setOverviewPagination(prev => ({
          ...prev,
          totalItems: Math.max(prev.totalItems, offset + result.transactions.length + 1)
        }));
      } else {
        setOverviewPagination(prev => ({
          ...prev,
          totalItems: offset + result.transactions.length
        }));
      }
    } catch (error) {
      console.error('Failed to load overview data:', error);
      toast.error('Failed to load recent activity');
    }
  }, [overviewPagination.currentPage, overviewPagination.itemsPerPage]);

  const loadTransactionsData = React.useCallback(async () => {
    try {
      const offset = (transactionsPagination.currentPage - 1) * transactionsPagination.itemsPerPage;
      const result = await paymentService.getWalletTransactions(
        transactionsPagination.itemsPerPage,
        offset
      );
      setTransactions(result.transactions);
      
      if (result.hasMore) {
        setTransactionsPagination(prev => ({
          ...prev,
          totalItems: Math.max(prev.totalItems, offset + result.transactions.length + 1)
        }));
      } else {
        setTransactionsPagination(prev => ({
          ...prev,
          totalItems: offset + result.transactions.length
        }));
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
      toast.error('Failed to load wallet transactions');
    }
  }, [transactionsPagination.currentPage, transactionsPagination.itemsPerPage]);

  const loadHistoryData = React.useCallback(async () => {
    try {
      const offset = (historyPagination.currentPage - 1) * historyPagination.itemsPerPage;
      const result = await paymentService.getPaymentHistory(
        historyPagination.itemsPerPage,
        offset,
        filters.status
      );
      setPaymentHistory(result.payments);
      
      if (result.hasMore) {
        setHistoryPagination(prev => ({
          ...prev,
          totalItems: Math.max(prev.totalItems, offset + result.payments.length + 1)
        }));
      } else {
        setHistoryPagination(prev => ({
          ...prev,
          totalItems: offset + result.payments.length
        }));
      }
    } catch (error) {
      console.error('Failed to load payment history:', error);
      toast.error('Failed to load payment history');
    }
  }, [historyPagination.currentPage, historyPagination.itemsPerPage, filters.status]);

  const loadBillingData = React.useCallback(async () => {
    setLoading(true);
    try {
      const balance = await paymentService.getWalletBalance();
      if (balance) {
        setWalletBalance(balance.balance);
      }
      
      // Load initial data based on active tab
      await loadOverviewData();
    } catch (error) {
      console.error('Failed to load billing data:', error);
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  }, [loadOverviewData]);

  // Initial load
  useEffect(() => {
    loadBillingData();
  }, [loadBillingData]);

  // Reload data when filter status changes
  useEffect(() => {
    if (filters.status && activeTab === 'history') {
      setHistoryPagination(prev => ({ ...prev, currentPage: 1 }));
    }
  }, [filters.status, activeTab]);

  // Load data when tab or pagination changes
  useEffect(() => {
    if (activeTab === 'overview') {
      loadOverviewData();
    } else if (activeTab === 'transactions') {
      loadTransactionsData();
    } else if (activeTab === 'history') {
      loadHistoryData();
    }
  }, [activeTab, loadOverviewData, loadTransactionsData, loadHistoryData]);

  const handleAddFunds = async () => {
    if (!addFundsAmount || parseFloat(addFundsAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setAddFundsLoading(true);
    try {
      const result = await paymentService.createPayment({
        amount: parseFloat(addFundsAmount),
        currency: 'USD',
        description: `Add $${addFundsAmount} to wallet`
      });

      if (result.success && result.approvalUrl) {
        // Open PayPal payment window
        paymentService.openPayPalPayment(result.approvalUrl);
        setAddFundsAmount('');
        toast.success('Payment window opened. Complete the payment to add funds.');
      } else {
        toast.error(result.error || 'Failed to create payment');
      }
    } catch (error) {
      console.error('Add funds error:', error);
      toast.error('Failed to initiate payment');
    } finally {
      setAddFundsLoading(false);
    }
  };

  const formatCurrency = (amount: number | null | undefined): string => {
    // Handle null, undefined, or NaN values
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '$0.00';
    }
    
    // Always format as positive amount to avoid double negatives
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString: string | null | undefined): string => {
    // Handle null, undefined, or empty strings
    if (!dateString) {
      return 'N/A';
    }

    try {
      let date: Date;
      
      // Check if it's a Unix timestamp (number as string)
      if (/^\d+$/.test(dateString)) {
        const timestamp = parseInt(dateString);
        // Check if it's in seconds (Unix timestamp) or milliseconds
        date = new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);
      } else {
        // Try to parse as ISO string or other date format
        date = new Date(dateString);
      }

      // Check if the date is valid
      if (isNaN(date.getTime())) {
        // If parsing failed, try to show the original string as fallback
        console.warn('Failed to parse date:', dateString);
        return dateString.length > 20 ? dateString.substring(0, 20) + '...' : dateString;
      }

      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      // Return the original string as fallback instead of "Invalid Date"
      return dateString.length > 20 ? dateString.substring(0, 20) + '...' : dateString;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
      case 'failed':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
      case 'cancelled':
        return 'text-muted-foreground bg-gray-100 text-muted-foreground bg-card';
      case 'refunded':
        return 'text-purple-600 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/20';
      default:
        return 'text-muted-foreground bg-gray-100 text-muted-foreground bg-card';
    }
  };

  const exportToCSV = (data: Array<Record<string, string>>, filename: string, headers: string[]) => {
    try {
      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header.toLowerCase().replace(/\s+/g, '')];
            // Escape commas and quotes in values
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value || '';
          }).join(',')
        )
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`${filename} downloaded successfully`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  const handleExportTransactions = () => {
    const headers = ['Description', 'Type', 'Amount', 'Date', 'Balance After'];
    const exportData = transactions.map(transaction => ({
      description: transaction.description,
      type: transaction.type === 'credit' ? 'Credit' : 'Debit',
      amount: `${transaction.type === 'credit' ? '+' : '-'}${formatCurrency(transaction.amount)}`,
      date: formatDate(transaction.createdAt),
      balanceafter: formatCurrency(transaction.balanceAfter)
    }));
    
    exportToCSV(exportData, 'wallet-transactions.csv', headers);
  };

  const handleExportPaymentHistory = () => {
    const headers = ['Description', 'Amount', 'Status', 'Provider', 'Date'];
    const exportData = paymentHistory.map(payment => ({
      description: payment.description,
      amount: `${formatCurrency(payment.amount)} ${payment.currency}`,
      status: payment.status.charAt(0).toUpperCase() + payment.status.slice(1),
      provider: payment.provider.charAt(0).toUpperCase() + payment.provider.slice(1),
      date: formatDate(payment.createdAt)
    }));
    
    exportToCSV(exportData, 'payment-history.csv', headers);
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      dateFrom: '',
      dateTo: ''
    });
    setShowFilter(false);
  };

  const hasActiveFilters = filters.status || filters.dateFrom || filters.dateTo;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading billing information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Billing &amp; Payments</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your wallet, add funds, and view payment history
          </p>
        </div>

        {/* Wallet Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Wallet Balance</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(walletBalance)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <ArrowUpRight className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(
                    transactions
                      .filter(tx => tx.type === 'credit')
                      .reduce((sum, tx) => sum + tx.amount, 0)
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <ArrowDownLeft className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Spent This Month</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(
                    transactions
                      .filter(tx => tx.type === 'debit')
                      .reduce((sum, tx) => sum + tx.amount, 0)
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Add Funds Section */}
        <div className="bg-card p-6 mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Add Funds to Wallet</h2>
          <div className="flex items-center space-x-4">
            <div className="flex-1 max-w-xs">
              <label htmlFor="amount" className="sr-only">Amount</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-5 w-5 text-muted-foreground " />
                </div>
                <input
                  type="number"
                  id="amount"
                  value={addFundsAmount}
                  onChange={(e) => setAddFundsAmount(e.target.value)}
                  placeholder="0.00"
                  min="1"
                  step="0.01"
                  className="block w-full pl-10 pr-3 py-2 border border rounded-md bg-secondary text-foreground placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                />
              </div>
            </div>
            <button
              onClick={handleAddFunds}
              disabled={addFundsLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addFundsLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Funds via PayPal
            </button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Funds will be added to your wallet after successful PayPal payment
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-card">
          <div className="border-b border">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-gray-300 hover:border-input dark:hover:border-gray-600'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'transactions'
                    ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-gray-300 hover:border-input dark:hover:border-gray-600'
                }`}
              >
                Wallet Transactions
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'history'
                    ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-gray-300 hover:border-input dark:hover:border-gray-600'
                }`}
              >
                Payment History
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {transactions.map((transaction) => (
                      <div 
                        key={transaction.id} 
                        onClick={() => navigate(`/billing/transaction/${transaction.id}`)}
                        className="flex items-center justify-between py-3 px-3 -mx-3 border-b border-border border last:border-b-0 rounded-md cursor-pointer hover:bg-secondary/80/50 transition-colors"
                      >
                        <div className="flex items-center">
                          <div className={`p-2 rounded-lg ${transaction.type === 'credit' ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                            {transaction.type === 'credit' ? (
                              <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                            ) : (
                              <ArrowDownLeft className="h-4 w-4 text-red-600 dark:text-red-400" />
                            )}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-foreground">{transaction.description}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(transaction.createdAt)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium ${transaction.type === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Balance: {transaction.balanceAfter !== null && transaction.balanceAfter !== undefined && !isNaN(transaction.balanceAfter)
                              ? formatCurrency(transaction.balanceAfter)
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {overviewPagination.totalItems > 0 && (
                    <Pagination
                      currentPage={overviewPagination.currentPage}
                      totalItems={overviewPagination.totalItems}
                      itemsPerPage={overviewPagination.itemsPerPage}
                      onPageChange={(page) => setOverviewPagination(prev => ({ ...prev, currentPage: page }))}
                      onItemsPerPageChange={(itemsPerPage) => setOverviewPagination(prev => ({ ...prev, itemsPerPage, currentPage: 1 }))}
                      className="mt-4"
                    />
                  )}
                </div>
              </div>
            )}

            {activeTab === 'transactions' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-foreground">Wallet Transactions</h3>
                  <button 
                    onClick={handleExportTransactions}
                    className="inline-flex items-center px-3 py-2 border border shadow-sm text-sm leading-4 font-medium rounded-md text-muted-foreground bg-secondary hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-800"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </button>
                </div>
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 dark:ring-gray-700 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Balance After
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {transactions.map((transaction) => (
                        <tr 
                          key={transaction.id}
                          onClick={() => navigate(`/billing/transaction/${transaction.id}`)}
                          className="cursor-pointer hover:bg-secondary/80 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            {transaction.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              transaction.type === 'credit' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            }`}>
                              {transaction.type === 'credit' ? 'Credit' : 'Debit'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {formatDate(transaction.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {formatCurrency(transaction.balanceAfter)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {transactionsPagination.totalItems > 0 && (
                  <Pagination
                    currentPage={transactionsPagination.currentPage}
                    totalItems={transactionsPagination.totalItems}
                    itemsPerPage={transactionsPagination.itemsPerPage}
                    onPageChange={(page) => setTransactionsPagination(prev => ({ ...prev, currentPage: page }))}
                    onItemsPerPageChange={(itemsPerPage) => setTransactionsPagination(prev => ({ ...prev, itemsPerPage, currentPage: 1 }))}
                    className="mt-4"
                  />
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-foreground">Payment History</h3>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => setShowFilter(!showFilter)}
                      className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-800 ${
                        hasActiveFilters 
                          ? 'border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:bg-blue-900/20' 
                          : 'border text-muted-foreground bg-secondary hover:bg-secondary/80'
                      }`}
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                      {hasActiveFilters && (
                        <span className="ml-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-blue-100 bg-blue-600 rounded-full">
                          {[filters.status, filters.dateFrom, filters.dateTo].filter(Boolean).length}
                        </span>
                      )}
                    </button>
                    <button 
                      onClick={handleExportPaymentHistory}
                      className="inline-flex items-center px-3 py-2 border border shadow-sm text-sm leading-4 font-medium rounded-md text-muted-foreground bg-secondary hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-800"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export as CSV
                    </button>
                  </div>
                </div>

                {/* Filter Panel */}
                {showFilter && (
                  <div className="bg-muted rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-foreground">Filter Options</h4>
                      <button
                        onClick={() => setShowFilter(false)}
                        className="text-muted-foreground hover:text-muted-foreground dark:hover:text-gray-300"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="status-filter" className="block text-sm font-medium text-muted-foreground mb-1">
                          Status
                        </label>
                        <select
                          id="status-filter"
                          value={filters.status}
                          onChange={(e) => handleFilterChange('status', e.target.value)}
                          className="block w-full px-3 py-2 border border rounded-md bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                        >
                          <option value="">All Statuses</option>
                          <option value="completed">Completed</option>
                          <option value="pending">Pending</option>
                          <option value="failed">Failed</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="refunded">Refunded</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="date-from" className="block text-sm font-medium text-muted-foreground mb-1">
                          From Date
                        </label>
                        <input
                          type="date"
                          id="date-from"
                          value={filters.dateFrom}
                          onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                          className="block w-full px-3 py-2 border border rounded-md bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                        />
                      </div>
                      <div>
                        <label htmlFor="date-to" className="block text-sm font-medium text-muted-foreground mb-1">
                          To Date
                        </label>
                        <input
                          type="date"
                          id="date-to"
                          value={filters.dateTo}
                          onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                          className="block w-full px-3 py-2 border border rounded-md bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                        />
                      </div>
                    </div>
                    {hasActiveFilters && (
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={clearFilters}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          Clear Filters
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 dark:ring-gray-700 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Provider
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {paymentHistory.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            {payment.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            {formatCurrency(payment.amount)} {payment.currency}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {payment.provider.charAt(0).toUpperCase() + payment.provider.slice(1)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {formatDate(payment.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {historyPagination.totalItems > 0 && (
                  <Pagination
                    currentPage={historyPagination.currentPage}
                    totalItems={historyPagination.totalItems}
                    itemsPerPage={historyPagination.itemsPerPage}
                    onPageChange={(page) => setHistoryPagination(prev => ({ ...prev, currentPage: page }))}
                    onItemsPerPageChange={(itemsPerPage) => setHistoryPagination(prev => ({ ...prev, itemsPerPage, currentPage: 1 }))}
                    className="mt-4"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Billing;
