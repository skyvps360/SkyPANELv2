/**
 * Logger module for ContainerStacks Billing Daemon
 * Provides configurable logging with support for systemd journal integration
 */

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

let currentLogLevel = 'info';

/**
 * Initialize logger with specified log level
 * @param {string} logLevel - Log level (error, warn, info, debug)
 */
export function initLogger(logLevel = 'info') {
  if (LOG_LEVELS[logLevel] !== undefined) {
    currentLogLevel = logLevel;
  } else {
    console.warn(`⚠️  Invalid log level "${logLevel}", using "info"`);
    currentLogLevel = 'info';
  }
  
  console.log(`📝 Logger initialized with level: ${currentLogLevel}`);
}

/**
 * Check if a log level should be logged
 * @param {string} level - Log level to check
 * @returns {boolean} True if level should be logged
 */
function shouldLog(level) {
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLogLevel];
}

/**
 * Format log message with timestamp and level
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @returns {string} Formatted log message
 */
function formatMessage(level, message) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
}

/**
 * Log error message
 * @param {string} message - Error message
 * @param {Error} [error] - Optional error object
 */
export function error(message, err = null) {
  if (shouldLog('error')) {
    console.error(formatMessage('error', message));
    if (err && err.stack) {
      console.error(err.stack);
    }
  }
}

/**
 * Log warning message
 * @param {string} message - Warning message
 */
export function warn(message) {
  if (shouldLog('warn')) {
    console.warn(formatMessage('warn', message));
  }
}

/**
 * Log info message
 * @param {string} message - Info message
 */
export function info(message) {
  if (shouldLog('info')) {
    console.log(formatMessage('info', message));
  }
}

/**
 * Log debug message
 * @param {string} message - Debug message
 */
export function debug(message) {
  if (shouldLog('debug')) {
    console.log(formatMessage('debug', message));
  }
}

/**
 * Log billing result summary
 * @param {Object} result - Billing result object
 */
export function logBillingResult(result) {
  if (result.success) {
    info(`✅ Billing completed successfully: ${result.billedInstances} instances, ${result.totalHours}h, $${result.totalAmount.toFixed(2)}`);
  } else {
    error(`❌ Billing completed with errors: ${result.billedInstances} billed, ${result.failedInstances.length} failed`);
    if (result.errors.length > 0) {
      result.errors.forEach(err => error(`   - ${err}`));
    }
  }
}
