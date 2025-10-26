/**
 * Script to seed DigitalOcean provider and plans
 * Run this after applying migration 014_digitalocean_provider.sql
 * Does NOT modify existing Linode data
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

/**
 * Check if DigitalOcean provider already exists
 */
async function checkExistingProvider() {
  const result = await pool.query(
    "SELECT id, name, type, active FROM service_providers WHERE type = 'digitalocean' LIMIT 1"
  );
  return result.rows[0] || null;
}

/**
 * Create DigitalOcean provider entry
 */
async function createDigitalOceanProvider() {
  console.log('Creating DigitalOcean provider...');
  
  // Empty token - admin will add it through /admin#providers UI
  const result = await pool.query(
    `INSERT INTO service_providers (name, type, api_key_encrypted, configuration, active)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, type, active`,
    [
      'DigitalOcean',
      'digitalocean',
      '', // Empty - admin configures through UI
      JSON.stringify({}),
      false // Start as inactive until API token is configured
    ]
  );

  return result.rows[0];
}

/**
 * Seed popular DigitalOcean droplet sizes as VPS plans
 * Based on current DigitalOcean pricing as of 2025
 */
async function seedDigitalOceanPlans(providerId) {
  console.log('Seeding DigitalOcean VPS plans...');

  // Popular DigitalOcean droplet sizes
  const plans = [
    {
      name: 'Basic Droplet 1GB',
      provider_plan_id: 's-1vcpu-1gb',
      base_price: 6.00,
      markup_price: 2.00,
      specifications: {
        vcpus: 1,
        memory: 1024,
        disk: 25,
        transfer: 1000,
        price_monthly: 6.00,
        price_hourly: 0.00893
      }
    },
    {
      name: 'Basic Droplet 2GB',
      provider_plan_id: 's-1vcpu-2gb',
      base_price: 12.00,
      markup_price: 3.00,
      specifications: {
        vcpus: 1,
        memory: 2048,
        disk: 50,
        transfer: 2000,
        price_monthly: 12.00,
        price_hourly: 0.01786
      }
    },
    {
      name: 'Basic Droplet 4GB',
      provider_plan_id: 's-2vcpu-4gb',
      base_price: 24.00,
      markup_price: 6.00,
      specifications: {
        vcpus: 2,
        memory: 4096,
        disk: 80,
        transfer: 4000,
        price_monthly: 24.00,
        price_hourly: 0.03571
      }
    },
    {
      name: 'General Purpose 8GB',
      provider_plan_id: 's-4vcpu-8gb',
      base_price: 48.00,
      markup_price: 12.00,
      specifications: {
        vcpus: 4,
        memory: 8192,
        disk: 160,
        transfer: 5000,
        price_monthly: 48.00,
        price_hourly: 0.07143
      }
    },
    {
      name: 'General Purpose 16GB',
      provider_plan_id: 's-8vcpu-16gb',
      base_price: 96.00,
      markup_price: 24.00,
      specifications: {
        vcpus: 8,
        memory: 16384,
        disk: 320,
        transfer: 6000,
        price_monthly: 96.00,
        price_hourly: 0.14286
      }
    },
    {
      name: 'CPU-Optimized 4GB',
      provider_plan_id: 'c-2',
      base_price: 42.00,
      markup_price: 10.00,
      specifications: {
        vcpus: 2,
        memory: 4096,
        disk: 25,
        transfer: 4000,
        price_monthly: 42.00,
        price_hourly: 0.0625
      }
    },
    {
      name: 'CPU-Optimized 8GB',
      provider_plan_id: 'c-4',
      base_price: 84.00,
      markup_price: 20.00,
      specifications: {
        vcpus: 4,
        memory: 8192,
        disk: 50,
        transfer: 5000,
        price_monthly: 84.00,
        price_hourly: 0.125
      }
    },
    {
      name: 'Memory-Optimized 16GB',
      provider_plan_id: 'm-2vcpu-16gb',
      base_price: 120.00,
      markup_price: 30.00,
      specifications: {
        vcpus: 2,
        memory: 16384,
        disk: 50,
        transfer: 5000,
        price_monthly: 120.00,
        price_hourly: 0.17857
      }
    }
  ];

  let insertedCount = 0;
  let skippedCount = 0;

  for (const plan of plans) {
    try {
      // Check if plan already exists
      const existCheck = await pool.query(
        'SELECT id FROM vps_plans WHERE provider_id = $1 AND provider_plan_id = $2',
        [providerId, plan.provider_plan_id]
      );

      if (existCheck.rows.length > 0) {
        console.log(`  ⏭️  Skipping existing plan: ${plan.name}`);
        skippedCount++;
        continue;
      }

      await pool.query(
        `INSERT INTO vps_plans (provider_id, name, provider_plan_id, base_price, markup_price, specifications, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          providerId,
          plan.name,
          plan.provider_plan_id,
          plan.base_price,
          plan.markup_price,
          JSON.stringify(plan.specifications),
          true
        ]
      );

      console.log(`  ✅ Created plan: ${plan.name} (${plan.provider_plan_id})`);
      insertedCount++;
    } catch (error) {
      console.error(`  ❌ Failed to create plan ${plan.name}:`, error.message);
    }
  }

  console.log(`\n📊 Summary: ${insertedCount} plans created, ${skippedCount} plans skipped`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting DigitalOcean provider and plans seeding...\n');

  try {
    // Check for existing provider
    const existingProvider = await checkExistingProvider();

    let providerId;
    if (existingProvider) {
      console.log(`✅ DigitalOcean provider already exists (ID: ${existingProvider.id})`);
      console.log(`   Name: ${existingProvider.name}`);
      console.log(`   Active: ${existingProvider.active}\n`);
      providerId = existingProvider.id;
    } else {
      const newProvider = await createDigitalOceanProvider();
      console.log(`✅ Created DigitalOcean provider (ID: ${newProvider.id})`);
      console.log(`   Name: ${newProvider.name}`);
      console.log(`   Active: ${newProvider.active}\n`);
      providerId = newProvider.id;
    }

    // Seed plans
    await seedDigitalOceanPlans(providerId);

    console.log('\n✅ DigitalOcean seeding completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run the migration: node scripts/run-migration.js');
    console.log('   2. Visit /admin#providers to add your DigitalOcean API token');
    console.log('   3. Activate the DigitalOcean provider in the admin UI');
    console.log('   4. Visit /admin#vps-plans to see the DigitalOcean plans');
  } catch (error) {
    console.error('❌ Error seeding DigitalOcean:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
