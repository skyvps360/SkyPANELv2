import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';

const BillingPaymentCancel: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-8 max-w-lg w-full text-center">
        <div className="flex justify-center mb-4">
          <XCircle className="h-12 w-12 text-yellow-500" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">Payment Cancelled</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          The PayPal payment was cancelled. Your wallet balance has not changed. You can restart the process whenever you are ready.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate('/billing')}
            className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
          >
            Back to Billing
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillingPaymentCancel;
