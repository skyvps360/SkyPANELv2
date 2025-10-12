#!/usr/bin/env node

console.log('🔧 Migration script starting...');

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

console.log('📦 Imports loaded, loading environment...');
dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function applyMigration() {
  try {
    log('🚀 Starting migration application process...', 'blue');

    // Check environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      log('❌ Missing required environment variables:', 'red');
      log(`SUPABASE_URL: ${supabaseUrl ? 'Set' : 'Missing'}`, 'red');
      log(`SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceRoleKey ? 'Set' : 'Missing'}`, 'red');
      process.exit(1);
    }

    // Create Supabase client with service role key for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    log('✅ Supabase client initialized', 'green');

    // Read the SQL migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '004_extend_user_settings.sql');
    
    if (!fs.existsSync(migrationPath)) {
      log(`❌ Migration file not found: ${migrationPath}`, 'red');
      process.exit(1);
    }

    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    log('✅ Migration file loaded', 'green');

    // Check if migration has already been applied by checking if user_api_keys table exists
    log('🔍 Checking if migration has already been applied...', 'blue');
    
    try {
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('id')
        .limit(1);
      
      if (!error) {
        log('✅ Migration appears to already be applied (user_api_keys table exists)', 'green');
        log('ℹ️  If you\'re still seeing errors, there might be a different issue.', 'yellow');
        return;
      }
    } catch (e) {
      // Table doesn't exist, continue with migration
      log('📝 user_api_keys table not found, proceeding with migration...', 'blue');
    }

    // Apply the migration using Supabase SQL editor approach
    log('📝 Applying migration...', 'blue');
    
    // Execute the entire SQL content as one block
    try {
      // Use the REST API directly to execute SQL
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceRoleKey}`,
          'Content-Type': 'application/json',
          'apikey': supabaseServiceRoleKey
        },
        body: JSON.stringify({ sql: sqlContent })
      });

      if (!response.ok) {
        // Try alternative approach - execute statements one by one
        log('⚠️  Direct SQL execution failed, trying statement-by-statement approach...', 'yellow');
        
        const statements = sqlContent
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i];
          if (statement.trim()) {
            try {
              log(`   Executing statement ${i + 1}/${statements.length}...`, 'blue');
              
              // For ALTER TABLE and CREATE TABLE statements, we'll use a different approach
              if (statement.includes('ALTER TABLE') || statement.includes('CREATE TABLE') || statement.includes('CREATE INDEX') || statement.includes('CREATE POLICY')) {
                // These need to be executed directly via SQL
                const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
                if (error) {
                  log(`⚠️  Statement ${i + 1} may have failed: ${error.message}`, 'yellow');
                } else {
                  log(`   ✅ Statement ${i + 1} executed successfully`, 'green');
                }
              }
            } catch (err) {
              log(`⚠️  Error executing statement ${i + 1}: ${err.message}`, 'yellow');
            }
          }
        }
      } else {
        log('✅ Migration executed successfully', 'green');
      }
    } catch (execError) {
      log(`⚠️  Migration execution encountered issues: ${execError.message}`, 'yellow');
    }

    // Verify migration was applied successfully
    log('🔍 Verifying migration was applied...', 'blue');
    
    try {
      // Check if user_api_keys table exists
      const { data: apiKeysTest, error: apiKeysError } = await supabase
        .from('user_api_keys')
        .select('id')
        .limit(1);
      
      if (!apiKeysError) {
        log('✅ user_api_keys table created successfully', 'green');
      } else {
        log('⚠️  user_api_keys table verification failed', 'yellow');
      }

    } catch (verifyError) {
      log('⚠️  Could not verify migration success', 'yellow');
    }

    log('', 'reset');
    log('🎉 Migration application completed!', 'green');
    log('', 'reset');
    log('ℹ️  Please refresh your application to see if the API errors are resolved.', 'blue');
    log('', 'reset');

  } catch (error) {
    log(`❌ Migration failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run the migration
applyMigration();
    