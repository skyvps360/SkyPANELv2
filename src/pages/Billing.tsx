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
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { paymentService, type WalletTransaction, type PaymentHistory } from '../services/paymentService';
// Navigation provided by AppLayout

const Billing: React.FC = () => {
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [addFundsAmount, setAddFundsAmount] = useState('');
  const [addFundsLoading, setAddFundsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'history'>('overview');

  useEffect(() => {
    loadBillingData();
  }, []);

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

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'cancelled':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading billing information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Billing &amp; Payments</h1>
          <p className="mt-2 text-gray-600">
            Manage your wallet, add funds, and view payment history
          </p>
        </div>

        {/* Wallet Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Wallet className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Wallet Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(walletBalance)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <ArrowUpRight className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    transactions
                      .filter(tx => tx.type === 'credit')
                      .reduce((sum, tx) => sum + tx.amount, 0)
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <ArrowDownLeft className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Spent This Month</p>
                <p className="text-2xl font-bold text-gray-900">
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Funds to Wallet</h2>
          <div className="flex items-center space-x-4">
            <div className="flex-1 max-w-xs">
              <label htmlFor="amount" className="sr-only">Amount</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  id="amount"
                  value={addFundsAmount}
                  onChange={(e) => setAddFundsAmount(e.target.value)}
                  placeholder="0.00"
                  min="1"
                  step="0.01"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <button
              onClick={handleAddFunds}
              disabled={addFundsLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addFundsLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Funds via PayPal
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Funds will be added to your wallet after successful PayPal payment
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'transactions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Wallet Transactions
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {transactions.slice(0, 5).map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-center">
                          <div className={`p-2 rounded-lg ${transaction.type === 'credit' ? 'bg-green-100' : 'bg-red-100'}`}>
                            {transaction.type === 'credit' ? (
                              <ArrowUpRight className="h-4 w-4 text-green-600" />
                            ) : (
                              <ArrowDownLeft className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{transaction.description}</p>
                            <p className="text-xs text-gray-500">{formatDate(transaction.createdAt)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Balance: {formatCurrency(transaction.balanceAfter)}
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
                  <h3 className="text-lg font-medium text-gray-900">Wallet Transactions</h3>
                  <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </button>
                </div>
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transactions.map((transaction) => (
                        <tr key={transaction.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              transaction.type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {transaction.type === 'credit' ? 'Credit' : 'Debit'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(transaction.createdAt)}
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
                  <h3 className="text-lg font-medium text-gray-900">Payment History</h3>
                  <div className="flex items-center space-x-2">
                    <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </button>
                    <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </button>
                  </div>
                </div>
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Provider
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paymentHistory.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {payment.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(payment.amount)} {payment.currency}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {payment.provider.charAt(0).toUpperCase() + payment.provider.slice(1)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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