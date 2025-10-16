/**
 * Billing Page Component
 * Handles wallet management, payments, and billing history
 */

import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Wallet, 
  Plus, 
  History, 
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Calendar,
  Filter,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { paymentService, type WalletTransaction, type PaymentHistory } from '../services/paymentService';
// Navigation provided by AppLayout

interface FilterState {
  status: string;
  dateFrom: string;
  dateTo: string;
}

const Billing: React.FC = () => {
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [filteredPaymentHistory, setFilteredPaymentHistory] = useState<PaymentHistory[]>([]);
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

  useEffect(() => {
    loadBillingData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [paymentHistory, filters]);

  const loadBillingData = async () => {
    setLoading(true);
    try {
      const [balance, transactionsData, historyData] = await Promise.all([
        paymentService.getWalletBalance(),
        paymentService.getWalletTransactions(10),
        paymentService.getPaymentHistory(10)
      ]);

      if (balance) {
        setWalletBalance(balance.balance);
      }
      setTransactions(transactionsData.transactions);
      setPaymentHistory(historyData.payments);
    } catch (error) {
      console.error('Failed to load billing data:', error);
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

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
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800';
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800';
    }
  };

  const exportToCSV = (data: any[], filename: string, headers: string[]) => {
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
    const exportData = filteredPaymentHistory.map(payment => ({
      description: payment.description,
      amount: `${formatCurrency(payment.amount)} ${payment.currency}`,
      status: payment.status.charAt(0).toUpperCase() + payment.status.slice(1),
      provider: payment.provider.charAt(0).toUpperCase() + payment.provider.slice(1),
      date: formatDate(payment.createdAt)
    }));
    
    exportToCSV(exportData, 'payment-history.csv', headers);
  };

  const applyFilters = () => {
    let filtered = [...paymentHistory];

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(payment => payment.status === filters.status);
    }

    // Filter by date range
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(payment => {
        const paymentDate = new Date(payment.createdAt);
        return paymentDate >= fromDate;
      });
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(payment => {
        const paymentDate = new Date(payment.createdAt);
        return paymentDate <= toDate;
      });
    }

    setFilteredPaymentHistory(filtered);
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading billing information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Billing &amp; Payments</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage your wallet, add funds, and view payment history
          </p>
        </div>

        {/* Wallet Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Wallet Balance</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(walletBalance)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <ArrowUpRight className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">This Month</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(
                    transactions
                      .filter(tx => tx.type === 'credit')
                      .reduce((sum, tx) => sum + tx.amount, 0)
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <ArrowDownLeft className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Spent This Month</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Funds to Wallet</h2>
          <div className="flex items-center space-x-4">
            <div className="flex-1 max-w-xs">
              <label htmlFor="amount" className="sr-only">Amount</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="number"
                  id="amount"
                  value={addFundsAmount}
                  onChange={(e) => setAddFundsAmount(e.target.value)}
                  placeholder="0.00"
                  min="1"
                  step="0.01"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                />
              </div>
            </div>
            <button
              onClick={handleAddFunds}
              disabled={addFundsLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addFundsLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Funds via PayPal
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Funds will be added to your wallet after successful PayPal payment
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'transactions'
                    ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                Wallet Transactions
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'history'
                    ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
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
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {transactions.slice(0, 5).map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                        <div className="flex items-center">
                          <div className={`p-2 rounded-lg ${transaction.type === 'credit' ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                            {transaction.type === 'credit' ? (
                              <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                            ) : (
                              <ArrowDownLeft className="h-4 w-4 text-red-600 dark:text-red-400" />
                            )}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{transaction.description}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(transaction.createdAt)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium ${transaction.type === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Balance: {transaction.balanceAfter !== null && transaction.balanceAfter !== undefined && !isNaN(transaction.balanceAfter)
                              ? formatCurrency(transaction.balanceAfter)
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'transactions' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Wallet Transactions</h3>
                  <button 
                    onClick={handleExportTransactions}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-800"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </button>
                </div>
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 dark:ring-gray-700 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Balance After
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {transactions.map((transaction) => (
                        <tr key={transaction.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {transaction.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              transaction.type === 'credit' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            }`}>
                              {transaction.type === 'credit' ? 'Credit' : 'Debit'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(transaction.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatCurrency(transaction.balanceAfter)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Payment History</h3>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => setShowFilter(!showFilter)}
                      className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-800 ${
                        hasActiveFilters 
                          ? 'border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:bg-blue-900/20' 
                          : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
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
                      className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-800"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </button>
                  </div>
                </div>

                {/* Filter Panel */}
                {showFilter && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">Filter Options</h4>
                      <button
                        onClick={() => setShowFilter(false)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Status
                        </label>
                        <select
                          id="status-filter"
                          value={filters.status}
                          onChange={(e) => handleFilterChange('status', e.target.value)}
                          className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                        >
                          <option value="">All Statuses</option>
                          <option value="completed">Completed</option>
                          <option value="pending">Pending</option>
                          <option value="failed">Failed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="date-from" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          From Date
                        </label>
                        <input
                          type="date"
                          id="date-from"
                          value={filters.dateFrom}
                          onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                          className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                        />
                      </div>
                      <div>
                        <label htmlFor="date-to" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          To Date
                        </label>
                        <input
                          type="date"
                          id="date-to"
                          value={filters.dateTo}
                          onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                          className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
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
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Provider
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredPaymentHistory.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {payment.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {formatCurrency(payment.amount)} {payment.currency}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {payment.provider.charAt(0).toUpperCase() + payment.provider.slice(1)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(payment.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Billing;