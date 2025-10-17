/**
 * Invoice Detail Page
 * Displays and allows downloading of invoices
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, ChevronLeft, Loader } from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '../components/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Invoice {
  id: string;
  organizationId: string;
  invoiceNumber: string;
  htmlContent: string;
  data: Record<string, unknown>;
  totalAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const loadInvoice = useCallback(async () => {
    if (!id) {
      navigate('/billing');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/invoices/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Invoice not found');
        } else {
          toast.error('Failed to load invoice');
        }
        navigate('/billing');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setInvoice(data.invoice);
      }
    } catch (error) {
      console.error('Failed to load invoice:', error);
      toast.error('Failed to load invoice');
      navigate('/billing');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  const handleDownload = async () => {
    if (!id) return;

    setDownloading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/invoices/${id}/download`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        toast.error('Failed to download invoice');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoice?.invoiceNumber || id}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Invoice downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download invoice');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <Loader className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading invoice...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!invoice) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => navigate('/billing')}
              className="flex items-center text-blue-600 dark:text-blue-400 hover:underline mb-4"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Billing
            </button>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">Invoice not found</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate('/billing')}
              className="flex items-center text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Billing
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4 mr-2" />
              {downloading ? 'Downloading...' : 'Download as HTML'}
            </button>
          </div>

          {/* Invoice HTML Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
            <div
              className="p-4 sm:p-8 prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: invoice.htmlContent }}
            />
          </div>

          {/* Invoice Metadata */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                Invoice Number
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {invoice.invoiceNumber}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                Total Amount
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {invoice.currency} ${invoice.totalAmount.toFixed(2)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                Date
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {new Date(invoice.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default InvoiceDetail;
