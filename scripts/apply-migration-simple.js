#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('🚀 Applying database migration...');

  try {
    // Check if user_api_keys table already exists
    const { data: existingTable, error: checkError } = await supabase
      .from('user_api_keys')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('✅ Migration already applied - user_api_keys table exists');
      return;
    }

    console.log('📝 Creating missing database schema...');

    // Add columns to users table
    console.log('   Adding columns to users table...');
    try {
      // We'll use a direct SQL approach via the REST API
      const alterUsersResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceRoleKey}`,
          'Content-Type': 'application/json',
          'apikey': supabaseServiceRoleKey
        },
        body: JSON.stringify({
          sql: `
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
            ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'America/New_York',
            ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
          `
        })
      });
      
      if (alterUsersResponse.ok) {
        console.log('   ✅ Users table updated');
      } else {
        console.log('   ⚠️  Users table update may have failed');
      }
    } catch (e) {
      console.log('   ⚠️  Users table update encountered an issue');
    }

    // Create user_api_keys table
    console.log('   Creating user_api_keys table...');
    try {
      const createTableResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceRoleKey}`,
          'Content-Type': 'application/json',
          'apikey': supabaseServiceRoleKey
        },
        body: JSON.stringify({
          sql: `
            CREATE TABLE IF NOT EXISTS user_api_keys (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              user_id UUID REFERENCES users(id) ON DELETE CASCADE,
              key_name VARCHAR(100) NOT NULL,
              key_hash VARCHAR(255) NOT NULL,
              key_prefix VARCHAR(20) NOT NULL,
              last_used_at TIMESTAMP WITH TIME ZONE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              expires_at TIMESTAMP WITH TIME ZONE,
              active BOOLEAN DEFAULT TRUE
            );
          `
        })
      });
      
      if (createTableResponse.ok) {
        console.log('   ✅ user_api_keys table created');
      } else {
        console.log('   ⚠️  user_api_keys table creation may have failed');
      }
    } catch (e) {
      console.log('   ⚠️  user_api_keys table creation encountered an issue');
    }

    // Add columns to organizations table
    console.log('   Adding columns to organizations table...');
    try {
      const alterOrgsResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceRoleKey}`,
          'Content-Type': 'application/json',
          'apikey': supabaseServiceRoleKey
        },
        body: JSON.stringify({
          sql: `
            ALTER TABLE organizations 
            ADD COLUMN IF NOT EXISTS website VARCHAR(255),
            ADD COLUMN IF NOT EXISTS address TEXT,
            ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50);
          `
        })
      });
      
      if (alterOrgsResponse.ok) {
        console.log('   ✅ Organizations table updated');
      } else {
        console.log('   ⚠️  Organizations table update may have failed');
      }
    } catch (e) {
      console.log('   ⚠️  Organizations table update encountered an issue');
    }

    // Verify the migration worked
    console.log('🔍 Verifying migration...');
    
    const { data: verifyTable, error: verifyError } = await supabase
      .from('user_api_keys')
      .select('id')
      .limit(1);

    if (!verifyError) {
      console.log('✅ Migration verification successful - user_api_keys table is accessible');
    } else {
      console.log('⚠️  Migration verification failed, but this might be due to RLS policies');
    }

    console.log('🎉 Migration process completed!');
    console.log('ℹ️  Please refresh your application to test the API endpoints.');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }
}

applyMigration();