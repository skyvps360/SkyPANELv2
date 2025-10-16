import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { paymentService } from '../services/paymentService';

const BillingPaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Capturing your PayPal payment...');
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('token');

    if (!orderId) {
      setStatus('error');
      setMessage('Missing PayPal order token.');
      return;
    }

    const capturePayment = async () => {
      setIsCapturing(true);
      try {
        const result = await paymentService.capturePayment(orderId);

        if (result.success) {
          setStatus('success');
          setMessage('Payment captured successfully. Your wallet will reflect the funds shortly.');
        } else {
          setStatus('error');
          setMessage(result.error || 'Failed to capture PayPal payment.');
        }
      } catch (error) {
        console.error('PayPal capture error:', error);
        setStatus('error');
        setMessage('Failed to capture PayPal payment.');
      } finally {
        setIsCapturing(false);
      }
    };

    capturePayment();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-8 max-w-lg w-full text-center">
        <div className="flex justify-center mb-4">
          {status === 'processing' && <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />}
          {status === 'success' && <CheckCircle className="h-12 w-12 text-green-500" />}
          {status === 'error' && <XCircle className="h-12 w-12 text-red-500" />}
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
          {status === 'processing' && 'Completing Payment'}
          {status === 'success' && 'Payment Successful'}
          {status === 'error' && 'Payment Issue'}
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
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
            disabled={isCapturing && status === 'processing'}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillingPaymentSuccess;
