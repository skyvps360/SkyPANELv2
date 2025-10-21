#!/usr/bin/env node

/**
 * ContainerStacks Billing Daemon
 * Standalone billing daemon that runs independently of the main application
 * Ensures continuous billing even during application downtime
 */

import * as config from './config.js';
import * as database from './database.js';
import * as logger from './logger.js';
import * as status from './status.js';
import * as billing from './billing.js';

// Global state
let daemonConfig = null;
let daemonInstanceId = null;
let heartbeatTimer = null;
let billingTimer = null;
let isShuttingDown = false;

/**
 * Initialize the daemon
 */
async function initialize() {
  try {
    console.log('🚀 ContainerStacks Billing Daemon Starting...');
    console.log('================================================');
    
    // Load configuration
    daemonConfig = config.loadConfig();
    
    // Initialize logger
    logger.initLogger(daemonConfig.logLevel);
    
    // Generate daemon instance ID
    daemonInstanceId = status.generateDaemonInstanceId();
    logger.info(`🆔 Daemon Instance ID: ${daemonInstanceId}`);
    
    // Connect to database with retry logic
    logger.info('🔌 Connecting to database...');
    await database.connectWithRetry(daemonConfig.databaseUrl);
    
    // Initialize daemon status in database
    await status.initializeDaemonStatus(daemonInstanceId, daemonConfig);
    
    logger.info('✅ Daemon initialization complete');
    console.log('================================================');
    
  } catch (error) {
    console.error('❌ Failed to initialize daemon:', error);
    process.exit(1);
  }
}

/**
 * Start the daemon timers
 */
function startTimers() {
  try {
    // Start heartbeat timer (60-second interval)
    heartbeatTimer = status.startHeartbeatTimer(daemonInstanceId);
    
    // Start billing timer (configurable interval, default 60 minutes)
    billingTimer = billing.startBillingTimer(
      daemonInstanceId,
      daemonConfig.billingIntervalMinutes
    );
    
    logger.info('✅ All timers started successfully');
  } catch (error) {
    logger.error('Failed to start timers', error);
    throw error;
  }
}

/**
 * Graceful shutdown handler
 * Completes current cycle, updates status, and closes connections
 */
async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    logger.warn('⚠️  Shutdown already in progress...');
    return;
  }
  
  isShuttingDown = true;
  logger.info(`\n🛑 Received ${signal} signal, initiating graceful shutdown...`);
  
  try {
    // Stop timers to prevent new operations
    logger.info('⏸️  Stopping timers...');
    status.stopHeartbeatTimer(heartbeatTimer);
    billing.stopBillingTimer(billingTimer);
    
    // Mark daemon as stopped in database
    logger.info('📝 Updating daemon status to stopped...');
    await status.markDaemonStopped(daemonInstanceId);
    
    // Close database connections
    logger.info('🔌 Closing database connections...');
    await database.closeDatabase();
    
    logger.info('✅ Graceful shutdown complete');
    console.log('================================================');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', error);
    process.exit(1);
  }
}

/**
 * Setup signal handlers for graceful shutdown
 */
function setupSignalHandlers() {
  // Handle SIGTERM (systemd stop, kill command)
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  
  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('💥 Uncaught exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('💥 Unhandled promise rejection:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
  });
  
  logger.info('✅ Signal handlers configured');
}

/**
 * Main entry point
 */
async function main() {
  try {
    // Initialize daemon
    await initialize();
    
    // Setup signal handlers for graceful shutdown
    setupSignalHandlers();
    
    // Start timers
    startTimers();
    
    logger.info('🎉 Billing daemon is now running');
    logger.info(`📊 Billing will run every ${daemonConfig.billingIntervalMinutes} minutes`);
    logger.info('💓 Heartbeat updates every 60 seconds');
    logger.info('🛑 Press Ctrl+C to stop gracefully');
    console.log('================================================');
    
  } catch (error) {
    console.error('❌ Fatal error in main process:', error);
    process.exit(1);
  }
}

// Start the daemon
main();
