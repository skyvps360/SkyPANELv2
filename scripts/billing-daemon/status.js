/**
 * Status management module for ContainerStacks Billing Daemon
 * Handles daemon instance ID generation, heartbeat updates, and status tracking
 */

import os from 'os';
import * as database from './database.js';
import * as logger from './logger.js';

/**
 * Generate unique daemon instance ID
 * Format: hostname-pid
 * @returns {string} Unique daemon instance identifier
 */
export function generateDaemonInstanceId() {
  const hostname = os.hostname();
  const pid = process.pid;
  return `${hostname}-${pid}`;
}

/**
 * Initialize daemon status in database
 * @param {string} daemonInstanceId - Unique daemon instance identifier
 * @param {Object} config - Daemon configuration
 * @returns {Promise<void>}
 */
export async function initializeDaemonStatus(daemonInstanceId, config) {
  try {
    const metadata = {
      os: config.os,
      hostname: config.hostname,
      pid: config.pid,
      billingIntervalMinutes: config.billingIntervalMinutes,
      nodeVersion: process.version,
      startTime: new Date().toISOString()
    };

    await database.upsertDaemonStatus(daemonInstanceId, {
      status: 'running',
      startedAt: new Date(),
      heartbeatAt: new Date(),
      metadata
    });

    logger.info(`✅ Daemon status initialized: ${daemonInstanceId}`);
  } catch (error) {
    logger.error('Failed to initialize daemon status', error);
    throw error;
  }
}

/**
 * Update daemon heartbeat
 * Updates the heartbeat_at timestamp to indicate daemon is still alive
 * @param {string} daemonInstanceId - Unique daemon instance identifier
 * @returns {Promise<void>}
 */
export async function updateHeartbeat(daemonInstanceId) {
  try {
    await database.updateHeartbeat(daemonInstanceId);
    logger.debug(`💓 Heartbeat updated for ${daemonInstanceId}`);
  } catch (error) {
    logger.error('Failed to update heartbeat', error);
    // Don't throw - heartbeat failures shouldn't stop the daemon
  }
}

/**
 * Update daemon status after billing run
 * @param {string} daemonInstanceId - Unique daemon instance identifier
 * @param {Object} billingResult - Result from billing execution
 * @returns {Promise<void>}
 */
export async function updateBillingRunStatus(daemonInstanceId, billingResult) {
  try {
    await database.updateBillingRunStatus(daemonInstanceId, billingResult);
    logger.info(`📊 Billing run status updated for ${daemonInstanceId}`);
  } catch (error) {
    logger.error('Failed to update billing run status', error);
    // Don't throw - status update failures shouldn't stop the daemon
  }
}

/**
 * Update daemon status to stopped
 * @param {string} daemonInstanceId - Unique daemon instance identifier
 * @returns {Promise<void>}
 */
export async function markDaemonStopped(daemonInstanceId) {
  try {
    await database.upsertDaemonStatus(daemonInstanceId, {
      status: 'stopped',
      heartbeatAt: new Date()
    });
    logger.info(`🛑 Daemon marked as stopped: ${daemonInstanceId}`);
  } catch (error) {
    logger.error('Failed to mark daemon as stopped', error);
    throw error;
  }
}

/**
 * Start heartbeat timer
 * Updates heartbeat every 60 seconds
 * @param {string} daemonInstanceId - Unique daemon instance identifier
 * @returns {NodeJS.Timeout} Timer interval
 */
export function startHeartbeatTimer(daemonInstanceId) {
  const HEARTBEAT_INTERVAL = 60 * 1000; // 60 seconds

  logger.info('💓 Starting heartbeat timer (60-second interval)');
  
  const timer = setInterval(async () => {
    await updateHeartbeat(daemonInstanceId);
  }, HEARTBEAT_INTERVAL);

  // Ensure timer doesn't prevent process from exiting
  timer.unref();

  return timer;
}

/**
 * Stop heartbeat timer
 * @param {NodeJS.Timeout} timer - Timer to stop
 */
export function stopHeartbeatTimer(timer) {
  if (timer) {
    clearInterval(timer);
    logger.info('💓 Heartbeat timer stopped');
  }
}
