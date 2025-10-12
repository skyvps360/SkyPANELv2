#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

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

async function seedAdminUser() {
  try {
    log('🚀 Starting admin user seeding process...', 'blue');

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
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '003_seed_admin_user.sql');
    
    if (!fs.existsSync(migrationPath)) {
      log(`❌ Migration file not found: ${migrationPath}`, 'red');
      process.exit(1);
    }

    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    log('✅ Migration file loaded', 'green');

    // Check if admin user already exists
    log('🔍 Checking if admin user already exists...', 'blue');
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('email', 'admin@containerstacks.com')
      .single();

    if (existingUser) {
      log('✅ Admin user already exists:', 'green');
      log(`   Email: ${existingUser.email}`, 'green');
      log(`   Name: ${existingUser.name}`, 'green');
      log(`   Role: ${existingUser.role}`, 'green');
      
      // Check organization
      const { data: organization } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('owner_id', existingUser.id)
        .single();

      if (organization) {
        log('✅ Organization exists:', 'green');
        log(`   Name: ${organization.name}`, 'green');
        log(`   Slug: ${organization.slug}`, 'green');

        // Check wallet
        const { data: wallet } = await supabase
          .from('wallets')
          .select('id, balance, currency')
          .eq('organization_id', organization.id)
          .single();

        if (wallet) {
          log('✅ Wallet exists:', 'green');
          log(`   Balance: $${wallet.balance} ${wallet.currency}`, 'green');
        }
      }

      log('', 'reset');
      log('ℹ️  Admin user setup is already complete!', 'blue');
      log('', 'reset');
      log('📋 Admin Credentials:', 'blue');
      log('   Email: admin@containerstacks.com', 'blue');
      log('   Password: admin123', 'blue');
      log('', 'reset');
      return;
    }

    // Execute the seeding
    log('📝 Creating admin user...', 'blue');

    // Enable pgcrypto extension
    await supabase.rpc('exec', { 
      query: 'CREATE EXTENSION IF NOT EXISTS pgcrypto;' 
    });

    // Create admin user
    const hashedPassword = await hashPassword('admin123');
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        email: 'admin@containerstacks.com',
        password_hash: hashedPassword,
        name: 'Admin User',
        role: 'admin'
      })
      .select()
      .single();

    if (userError) {
      log(`❌ Failed to create admin user: ${userError.message}`, 'red');
      process.exit(1);
    }

    log('✅ Admin user created', 'green');

    const adminUserId = user.id;

    // Create organization
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: 'ContainerStacks Admin',
        slug: 'containerstacks-admin',
        owner_id: adminUserId,
        settings: {}
      })
      .select()
      .single();

    if (orgError) {
      log(`❌ Failed to create organization: ${orgError.message}`, 'red');
      process.exit(1);
    }

    log('✅ Organization created', 'green');

    const orgId = orgData.id;

    // Create organization membership
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: orgId,
        user_id: adminUserId,
        role: 'admin'
      });

    if (memberError) {
      log(`⚠️  Warning: Could not create organization membership: ${memberError.message}`, 'yellow');
    } else {
      log('✅ Organization membership created', 'green');
    }

    // Create wallet
    const { error: walletError } = await supabase
      .from('wallets')
      .insert({
        organization_id: orgId,
        balance: 1000.00,
        currency: 'USD'
      });

    if (walletError) {
      log(`❌ Failed to create wallet: ${walletError.message}`, 'red');
      process.exit(1);
    }

    log('✅ Wallet created with $1000 USD balance', 'green');

    log('', 'reset');
    log('🎉 Admin user seeding completed successfully!', 'green');
    log('', 'reset');
    log('📋 Default Admin Credentials:', 'blue');
    log('   Email: admin@containerstacks.com', 'blue');
    log('   Password: admin123', 'blue');
    log('', 'reset');
    log('⚠️  IMPORTANT: Please change the default password after first login!', 'yellow');
    log('', 'reset');

  } catch (error) {
    log('❌ Error during admin user seeding:', 'red');
    log(error.message, 'red');
    if (error.stack) {
      log('Stack trace:', 'red');
      log(error.stack, 'red');
    }
    process.exit(1);
  }
}

// Password hashing function using bcrypt (same as backend)
async function hashPassword(password) {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

// Run the seeding function when called directly
seedAdminUser();

export { seedAdminUser };