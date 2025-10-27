#!/usr/bin/env node

/**
 * Migration Runner for SkyPanelV2 PostgreSQL
 * This script runs the database migration and tests the connection
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const { Pool } = pg;

async function runMigration() {
  console.log('🚀 Starting SkyPanelV2 PostgreSQL Migration...\n');

  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set!');
    console.log('Please set your PostgreSQL connection string in the .env file:');
    console.log('DATABASE_URL=postgresql://username:password@localhost:5432/skypanelv2_db_name');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Test connection
    console.log('🔌 Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    client.release();

    // Read and run all migrations in order
    const migrationsDir = join(__dirname, '..', 'migrations');
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log('📄 Found migrations:', files.join(', '));
    for (const file of files) {
      const migrationPath = join(migrationsDir, file);
      console.log(`🔄 Running migration ${file}...`);
      const migrationSQL = readFileSync(migrationPath, 'utf8');
      try {
        await pool.query(migrationSQL);
        console.log(`✅ Migration ${file} applied`);
      } catch (err) {
        const msg = (err?.message || '').toLowerCase();
        if (
          msg.includes('already exists') ||
          msg.includes('duplicate') ||
          msg.includes('relation') && msg.includes('already exists')
        ) {
          console.log(`ℹ️  Migration ${file} skipped: ${err.message}`);
          continue;
        }
        throw err;
      }
    }

    // Verify tables were created
    console.log('🔍 Verifying tables...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log('📊 Created tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Check if admin user was created
    const adminResult = await pool.query(
      "SELECT email, name, role FROM users WHERE email = 'admin@skypanelv2.com'"
    );

    if (adminResult.rows.length > 0) {
      console.log('\n👤 Default admin user created:');
      console.log(`  Email: ${adminResult.rows[0].email}`);
      console.log(`  Name: ${adminResult.rows[0].name}`);
      console.log(`  Role: ${adminResult.rows[0].role}`);
      console.log('  Password: admin123');
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('Your SkyPanelV2 application is now ready to use PostgreSQL.');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Connection refused. Please ensure:');
      console.log('  1. PostgreSQL is running');
      console.log('  2. Database exists');
      console.log('  3. Connection string is correct');
    } else if (error.code === '28P01') {
      console.log('\n💡 Authentication failed. Please check:');
      console.log('  1. Username and password are correct');
      console.log('  2. User has permission to access the database');
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration().catch(console.error);