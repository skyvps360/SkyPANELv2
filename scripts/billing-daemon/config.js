/**
 * Configuration module for ContainerStacks Billing Daemon
 * Loads and validates environment variables and system configuration
 */

import os from 'os';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Detect the operating system
 * @returns {string} OS platform (linux, win32, darwin, or default to linux)
 */
export function detectOS() {
  const platform = os.platform();
  console.log(`🖥️  Detected OS: ${platform}`);
  
  // Default to Ubuntu/Linux if OS is not recognized
  if (!['linux', 'win32', 'darwin'].includes(platform)) {
    console.log(`⚠️  Unknown OS platform "${platform}", defaulting to Linux`);
    return 'linux';
  }
  
  return platform;
}

/**
 * Load and validate configuration from environment variables
 * @returns {Object} Configuration object
 * @throws {Error} If required configuration is missing
 */
export function loadConfig() {
  const config = {
    databaseUrl: process.env.DATABASE_URL,
    billingIntervalMinutes: parseInt(process.env.BILLING_INTERVAL_MINUTES || '60', 10),
    logLevel: process.env.LOG_LEVEL || 'info',
    os: detectOS(),
    hostname: os.hostname(),
    pid: process.pid
  };

  // Validate required configuration
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  if (isNaN(config.billingIntervalMinutes) || config.billingIntervalMinutes < 1) {
    throw new Error('BILLING_INTERVAL_MINUTES must be a positive number');
  }

  // Validate log level
  const validLogLevels = ['error', 'warn', 'info', 'debug'];
  if (!validLogLevels.includes(config.logLevel)) {
    console.warn(`⚠️  Invalid LOG_LEVEL "${config.logLevel}", defaulting to "info"`);
    config.logLevel = 'info';
  }

  console.log('✅ Configuration loaded successfully');
  console.log(`   - Database: ${config.databaseUrl.split('@')[1] || 'configured'}`);
  console.log(`   - Billing Interval: ${config.billingIntervalMinutes} minutes`);
  console.log(`   - Log Level: ${config.logLevel}`);
  console.log(`   - Hostname: ${config.hostname}`);
  console.log(`   - PID: ${config.pid}`);

  return config;
}

/**
 * Get the daemon instance ID (hostname + PID)
 * @returns {string} Unique daemon instance identifier
 */
export function getDaemonInstanceId() {
  return `${os.hostname()}-${process.pid}`;
}
