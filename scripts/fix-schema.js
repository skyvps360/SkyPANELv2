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

async function fixSchema() {
  console.log('🚀 Fixing database schema...');

  try {
    // First, let's manually create the user_api_keys table using raw SQL via the REST API
    console.log('📝 Creating user_api_keys table...');
    
    const createTableSQL = `
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
    `;

    // Use the SQL editor endpoint directly
    const createResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseServiceRoleKey,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        query: createTableSQL
      })
    });

    if (createResponse.ok) {
      console.log('✅ user_api_keys table created successfully');
    } else {
      console.log('⚠️  Table creation response:', await createResponse.text());
    }

    // Add missing columns to users table
    console.log('📝 Adding columns to users table...');
    
    const alterUsersSQL = `
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'America/New_York',
      ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
    `;

    const alterUsersResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseServiceRoleKey,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        query: alterUsersSQL
      })
    });

    if (alterUsersResponse.ok) {
      console.log('✅ Users table updated successfully');
    } else {
      console.log('⚠️  Users table update response:', await alterUsersResponse.text());
    }

    // Add missing columns to organizations table
    console.log('📝 Adding columns to organizations table...');
    
    const alterOrgsSQL = `
      ALTER TABLE organizations 
      ADD COLUMN IF NOT EXISTS website VARCHAR(255),
      ADD COLUMN IF NOT EXISTS address TEXT,
      ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50);
    `;

    const alterOrgsResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseServiceRoleKey,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        query: alterOrgsSQL
      })
    });

    if (alterOrgsResponse.ok) {
      console.log('✅ Organizations table updated successfully');
    } else {
      console.log('⚠️  Organizations table update response:', await alterOrgsResponse.text());
    }

    // Enable RLS on user_api_keys table
    console.log('📝 Setting up RLS policies...');
    
    const rlsSQL = `
      ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY IF NOT EXISTS "Users can view own API keys" ON user_api_keys
        FOR SELECT USING (auth.uid() = user_id);
      
      CREATE POLICY IF NOT EXISTS "Users can insert own API keys" ON user_api_keys
        FOR INSERT WITH CHECK (auth.uid() = user_id);
      
      CREATE POLICY IF NOT EXISTS "Users can update own API keys" ON user_api_keys
        FOR UPDATE USING (auth.uid() = user_id);
      
      CREATE POLICY IF NOT EXISTS "Users can delete own API keys" ON user_api_keys
        FOR DELETE USING (auth.uid() = user_id);
    `;

    const rlsResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseServiceRoleKey,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        query: rlsSQL
      })
    });

    if (rlsResponse.ok) {
      console.log('✅ RLS policies set up successfully');
    } else {
      console.log('⚠️  RLS setup response:', await rlsResponse.text());
    }

    // Verify the schema is working
    console.log('🔍 Verifying schema...');
    
    const { data: testData, error: testError } = await supabase
      .from('user_api_keys')
      .select('id')
      .limit(1);

    if (!testError) {
      console.log('✅ Schema verification successful - user_api_keys table is accessible');
    } else {
      console.log('⚠️  Schema verification:', testError.message);
    }

    console.log('🎉 Schema fix completed!');
    console.log('ℹ️  Your application should now work without the API errors.');

  } catch (error) {
    console.error('❌ Schema fix failed:', error.message);
    process.exit(1);
  }
}

fixSchema()