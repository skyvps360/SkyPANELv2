import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixSchema() {
  try {
    console.log('🔧 Fixing activity_logs table schema...');
    
    // First, let's see the current table definition
    console.log('Current table definition:');
    const tableDef = await pool.query(`
      SELECT column_name, is_nullable, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'activity_logs' 
      ORDER BY ordinal_position
    `);
    console.table(tableDef.rows);
    
    // Try to alter the column to allow NULL
    console.log('Attempting to alter user_id column to allow NULL...');
    await pool.query('ALTER TABLE activity_logs ALTER COLUMN user_id DROP NOT NULL');
    console.log('✅ Successfully altered user_id column');
    
    // Verify the change
    const result = await pool.query(`
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'activity_logs' 
      AND column_name = 'user_id'
    `);
    
    console.log('Updated user_id column info:', result.rows);
    
    await pool.end();
    console.log('✅ Schema fix completed');
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

fixSchema();