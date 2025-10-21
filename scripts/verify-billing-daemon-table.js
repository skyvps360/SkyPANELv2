#!/usr/bin/env node

/**
 * Verify billing_daemon_status table exists and has correct structure
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const { Pool } = pg;

async function verifyTable() {
  try {
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable is not set!');
      process.exit(1);
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    console.log('🔌 Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Database connection successful!\n');

    // Check if table exists
    console.log('🔍 Checking if billing_daemon_status table exists...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'billing_daemon_status'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.error('❌ Table billing_daemon_status does not exist!');
      client.release();
      await pool.end();
      process.exit(1);
    }

    console.log('✅ Table billing_daemon_status exists\n');

    // Get table structure
    console.log('📋 Table structure:');
    const columns = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'billing_daemon_status'
      ORDER BY ordinal_position;
    `);

    console.table(columns.rows);

    // Check indexes
    console.log('\n🔍 Checking indexes...');
    const indexes = await client.query(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'billing_daemon_status'
      AND schemaname = 'public';
    `);

    console.log('✅ Indexes found:');
    indexes.rows.forEach(idx => {
      console.log(`  - ${idx.indexname}`);
    });

    // Check for required indexes
    const requiredIndexes = [
      'idx_billing_daemon_status_heartbeat',
      'idx_billing_daemon_status_instance'
    ];

    const foundIndexNames = indexes.rows.map(idx => idx.indexname);
    const missingIndexes = requiredIndexes.filter(idx => !foundIndexNames.includes(idx));

    if (missingIndexes.length > 0) {
      console.log('\n⚠️  Missing indexes:', missingIndexes.join(', '));
    } else {
      console.log('\n✅ All required indexes are present');
    }

    // Get row count
    const countResult = await client.query('SELECT COUNT(*) FROM billing_daemon_status;');
    console.log(`\n📊 Current row count: ${countResult.rows[0].count}`);

    client.release();
    await pool.end();

    console.log('\n🎉 Verification complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyTable();
