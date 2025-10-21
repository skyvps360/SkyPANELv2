/**
 * Database module for ContainerStacks Billing Daemon
 * Handles PostgreSQL connection with connection pooling and retry logic
 */

import pg from 'pg';

const { Pool } = pg;

let pool = null;

/**
 * Initialize database connection pool
 * @param {string} databaseUrl - PostgreSQL connection string
 * @returns {Pool} PostgreSQL connection pool
 */
export function initializeDatabase(databaseUrl) {
  if (pool) {
    return pool;
  }

  pool = new Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on('error', (err) => {
    console.error('❌ Unexpected database pool error:', err);
  });

  console.log('✅ Database connection pool initialized');
  return pool;
}

/**
 * Connect to database with retry logic and exponential backoff
 * @param {string} databaseUrl - PostgreSQL connection string
 * @param {number} maxRetries - Maximum number of retry attempts (default: 5)
 * @returns {Promise<Pool>} PostgreSQL connection pool
 */
export async function connectWithRetry(databaseUrl, maxRetries = 5) {
  let retries = 0;
  let delay = 1000; // Start with 1 second delay

  while (retries < maxRetries) {
    try {
      const dbPool = initializeDatabase(databaseUrl);
      
      // Test the connection
      const client = await dbPool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      console.log('✅ Database connection established successfully');
      return dbPool;
    } catch (error) {
      retries++;
      console.error(`❌ Database connection attempt ${retries}/${maxRetries} failed:`, error.message);
      
      if (retries >= maxRetries) {
        throw new Error(`Failed to connect to database after ${maxRetries} attempts`);
      }
      
      console.log(`⏳ Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Exponential backoff: double the delay for next retry
      delay *= 2;
    }
  }
}

/**
 * Insert or update daemon status record
 * @param {string} daemonInstanceId - Unique daemon instance identifier
 * @param {Object} statusData - Status data to insert/update
 * @returns {Promise<Object>} Inserted/updated status record
 */
export async function upsertDaemonStatus(daemonInstanceId, statusData) {
  const {
    status = 'running',
    lastRunAt = null,
    lastRunSuccess = null,
    instancesBilled = 0,
    totalAmount = 0,
    totalHours = 0,
    errorMessage = null,
    startedAt = new Date(),
    heartbeatAt = new Date(),
    metadata = {}
  } = statusData;

  const query = `
    INSERT INTO billing_daemon_status (
      daemon_instance_id, status, last_run_at, last_run_success,
      instances_billed, total_amount, total_hours, error_message,
      started_at, heartbeat_at, metadata, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
    ON CONFLICT (daemon_instance_id)
    DO UPDATE SET
      status = EXCLUDED.status,
      last_run_at = EXCLUDED.last_run_at,
      last_run_success = EXCLUDED.last_run_success,
      instances_billed = EXCLUDED.instances_billed,
      total_amount = EXCLUDED.total_amount,
      total_hours = EXCLUDED.total_hours,
      error_message = EXCLUDED.error_message,
      heartbeat_at = EXCLUDED.heartbeat_at,
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
    RETURNING *
  `;

  const values = [
    daemonInstanceId,
    status,
    lastRunAt,
    lastRunSuccess,
    instancesBilled,
    totalAmount,
    totalHours,
    errorMessage,
    startedAt,
    heartbeatAt,
    JSON.stringify(metadata)
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Update daemon heartbeat timestamp
 * @param {string} daemonInstanceId - Unique daemon instance identifier
 * @returns {Promise<void>}
 */
export async function updateHeartbeat(daemonInstanceId) {
  const query = `
    UPDATE billing_daemon_status
    SET heartbeat_at = NOW(), updated_at = NOW()
    WHERE daemon_instance_id = $1
  `;

  await pool.query(query, [daemonInstanceId]);
}

/**
 * Update daemon status after billing run
 * @param {string} daemonInstanceId - Unique daemon instance identifier
 * @param {Object} billingResult - Result from billing execution
 * @returns {Promise<void>}
 */
export async function updateBillingRunStatus(daemonInstanceId, billingResult) {
  const query = `
    UPDATE billing_daemon_status
    SET 
      last_run_at = NOW(),
      last_run_success = $2,
      instances_billed = $3,
      total_amount = $4,
      total_hours = $5,
      error_message = $6,
      heartbeat_at = NOW(),
      updated_at = NOW()
    WHERE daemon_instance_id = $1
  `;

  const errorMessage = billingResult.errors && billingResult.errors.length > 0
    ? billingResult.errors.join('; ')
    : null;

  const values = [
    daemonInstanceId,
    billingResult.success,
    billingResult.billedInstances,
    billingResult.totalAmount,
    billingResult.totalHours,
    errorMessage
  ];

  await pool.query(query, values);
}

/**
 * Read daemon status from database
 * @param {string} daemonInstanceId - Unique daemon instance identifier
 * @returns {Promise<Object|null>} Daemon status record or null if not found
 */
export async function getDaemonStatus(daemonInstanceId) {
  const query = `
    SELECT * FROM billing_daemon_status
    WHERE daemon_instance_id = $1
  `;

  const result = await pool.query(query, [daemonInstanceId]);
  return result.rows[0] || null;
}

/**
 * Close database connection pool
 * @returns {Promise<void>}
 */
export async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✅ Database connection pool closed');
  }
}
