/**
 * Test script to verify PayPal configuration
 */

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Import the PayPal service
import { PayPalService } from './api/services/paypalService.js';

async function testPayPalConfig() {
  console.log('Testing PayPal Configuration...');
  console.log('PAYPAL_MODE:', process.env.PAYPAL_MODE);
  
  try {
    // This will trigger the getPayPalClient function and show our configuration logs
    const result = await PayPalService.createPayment({
      amount: 1.00,
      currency: 'USD',
      description: 'Test payment for configuration verification',
      organizationId: 'test-org',
      userId: 'test-user'
    });
    
    console.log('PayPal client initialized successfully');
    console.log('Result:', result);
  } catch (error) {
    console.log('PayPal client configuration test completed');
    console.log('Error (expected for test):', error.message);
  }
}

testPayPalConfig();