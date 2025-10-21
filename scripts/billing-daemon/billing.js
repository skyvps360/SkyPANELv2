/**
 * Billing module for ContainerStacks Billing Daemon
 * Wraps the main application's BillingService with error handling and status updates
 */

import { BillingService } from '../../api/services/billingService.ts';
import * as logger from './logger.js';
import * as status from './status.js';

/**
 * Execute billing process
 * Calls BillingService.runHourlyBilling() and handles errors
 * @param {string} daemonInstanceId - Unique daemon instance identifier
 * @returns {Promise<Object>} Billing result
 */
export async function executeBilling(daemonInstanceId) {
  logger.info('🔄 Starting billing execution...');
  
  let billingResult = {
    success: false,
    billedInstances: 0,
    totalAmount: 0,
    totalHours: 0,
    failedInstances: [],
    errors: []
  };

  try {
    // Call the main application's billing service
    billingResult = await BillingService.runHourlyBilling();
    
    // Log the result
    logger.logBillingResult(billingResult);
    
    // Update daemon status with billing results
    await status.updateBillingRunStatus(daemonInstanceId, billingResult);
    
    return billingResult;
  } catch (error) {
    logger.error('❌ Critical error during billing execution', error);
    
    // Update result with error information
    billingResult.success = false;
    billingResult.errors.push(`Critical error: ${error.message}`);
    
    // Update daemon status with error
    await status.updateBillingRunStatus(daemonInstanceId, billingResult);
    
    return billingResult;
  }
}

/**
 * Start billing interval timer
 * Executes billing at specified interval
 * @param {string} daemonInstanceId - Unique daemon instance identifier
 * @param {number} intervalMinutes - Billing interval in minutes
 * @returns {NodeJS.Timeout} Timer interval
 */
export function startBillingTimer(daemonInstanceId, intervalMinutes) {
  const intervalMs = intervalMinutes * 60 * 1000;
  
  logger.info(`⏰ Starting billing timer (${intervalMinutes}-minute interval)`);
  
  // Execute billing immediately on startup
  executeBilling(daemonInstanceId).catch(error => {
    logger.error('Error in initial billing execution', error);
  });
  
  // Then execute on interval
  const timer = setInterval(async () => {
    await executeBilling(daemonInstanceId);
  }, intervalMs);

  // Ensure timer doesn't prevent process from exiting
  timer.unref();

  return timer;
}

/**
 * Stop billing timer
 * @param {NodeJS.Timeout} timer - Timer to stop
 */
export function stopBillingTimer(timer) {
  if (timer) {
    clearInterval(timer);
    logger.info('⏰ Billing timer stopped');
  }
}
