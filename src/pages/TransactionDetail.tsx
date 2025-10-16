import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { paymentService, type PaymentTransactionDetail } from '../services/paymentService';

const TransactionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<PaymentTransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('Missing transaction ID.');
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchTransaction = async () => {
      try {
        const result = await paymentService.getTransactionById(id);
        if (!isMounted) {
          return;
        }

        if (result.success && result.transaction) {
          setTransaction(result.transaction);
          setError(null);
        } else {
          setError(result.error || 'Failed to load transaction details.');
        }
      } catch (err) {
        console.error('Load transaction detail error:', err);
        if (isMounted) {
          setError('Failed to load transaction details.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTransaction();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined || Number.isNaN(amount)) {
      return '$0.00';
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (value: string): string => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handlePrintInvoice = async () => {
    if (!transaction) {
      return;
    }

    setInvoiceLoading(true);
    try {
      const result = await paymentService.createInvoiceFromTransaction(transaction.id);
      if (!result.success || !result.invoiceId) {
        toast.error(result.error || 'Failed to generate invoice.');
        return;
      }

      toast.success(`Invoice ${result.invoiceNumber} generated.`);
      const apiBase = import.meta.env.VITE_API_URL || '/api';
      const downloadUrl = `${apiBase}/invoices/${result.invoiceId}/download`;
      window.open(downloadUrl, '_blank', 'noopener');
    } catch (err) {
      console.error('Print invoice error:', err);
      toast.error('Failed to generate invoice.');
    } finally {
      setInvoiceLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center text-gray-600 dark:text-gray-300">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p>Loading transaction details...</p>
        </div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 w-full max-w-md text-center">
          <div className="flex justify-center mb-3">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Transaction Not Available</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error || 'We could not find the requested transaction.'}</p>
          <button
            onClick={() => navigate('/billing')}
            className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Billing
          </button>
        </div>
      </div>
    );
  }

  const metadataEntries = transaction.metadata ? Object.entries(transaction.metadata) : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/billing')}
            className="inline-flex items-center px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Billing
          </button>
          <button
            onClick={handlePrintInvoice}
            disabled={invoiceLoading}
            className="inline-flex items-center px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
          >
            {invoiceLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Printer className="h-4 w-4 mr-2" />
            )}
            Print Invoice
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transaction Details</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Review the transaction information and generate an invoice for your records.</p>
            </div>
            <span
              className={`mt-4 md:mt-0 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                transaction.status === 'completed'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  : transaction.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
              }`}
            >
              {transaction.status.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Summary</h2>
              <div className="space-y-2 text-gray-700 dark:text-gray-300">
                <p><span className="font-medium">Description:</span> {transaction.description}</p>
                <p><span className="font-medium">Amount:</span> {formatCurrency(Math.abs(transaction.amount))} {transaction.type === 'credit' ? '(Credit)' : '(Debit)'}</p>
                <p><span className="font-medium">Balance After:</span> {transaction.balanceAfter !== null ? formatCurrency(transaction.balanceAfter) : 'N/A'}</p>
                <p><span className="font-medium">Created At:</span> {formatDate(transaction.createdAt)}</p>
                <p><span className="font-medium">Updated At:</span> {formatDate(transaction.updatedAt)}</p>
              </div>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Payment Source</h2>
              <div className="space-y-2 text-gray-700 dark:text-gray-300">
                <p><span className="font-medium">Provider:</span> {transaction.provider || 'Internal'}</p>
                <p><span className="font-medium">Method:</span> {transaction.paymentMethod}</p>
                <p><span className="font-medium">Provider Reference:</span> {transaction.providerPaymentId || 'N/A'}</p>
                <p><span className="font-medium">Transaction ID:</span> {transaction.id}</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Additional Details</h2>
            {metadataEntries.length > 0 ? (
              <div className="bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-md p-4">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                  {metadataEntries.map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{key}</dt>
                      <dd className="text-sm text-gray-700 dark:text-gray-300">
                        {typeof value === 'object' && value !== null
                          ? JSON.stringify(value)
                          : String(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">No additional metadata stored for this transaction.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetail;
