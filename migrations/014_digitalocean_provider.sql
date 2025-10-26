-- Migration: Add DigitalOcean provider support
-- This migration ensures DigitalOcean is supported alongside Linode
-- Does NOT modify existing Linode functionality

-- Verify service_providers table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'service_providers'
  ) THEN
    RAISE EXCEPTION 'service_providers table does not exist. Please run migration 003_update_vps_schema.sql first.';
  END IF;
END $$;

-- Update the CHECK constraint on service_providers.type to ensure digitalocean is included
-- First, drop the existing constraint if it exists
ALTER TABLE service_providers DROP CONSTRAINT IF EXISTS service_providers_type_check;

-- Add the constraint with all supported providers
ALTER TABLE service_providers 
  ADD CONSTRAINT service_providers_type_check 
  CHECK (type IN ('linode', 'digitalocean', 'aws', 'gcp'));

-- Create a table to store provider-specific metadata
CREATE TABLE IF NOT EXISTS provider_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  metadata_key VARCHAR(255) NOT NULL,
  metadata_value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id, metadata_key)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_provider_metadata_provider_id ON provider_metadata(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_metadata_key ON provider_metadata(metadata_key);

-- Add trigger for updated_at on provider_metadata
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_provider_metadata_updated_at'
  ) THEN
    CREATE TRIGGER update_provider_metadata_updated_at
    BEFORE UPDATE ON provider_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Ensure vps_instances has provider_type column for quick filtering
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'vps_instances'
      AND column_name = 'provider_type'
  ) THEN
    ALTER TABLE vps_instances ADD COLUMN provider_type VARCHAR(50);
    CREATE INDEX IF NOT EXISTS idx_vps_instances_provider_type ON vps_instances(provider_type);
  END IF;
END $$;

-- Add comments to document the schema
COMMENT ON TABLE provider_metadata IS 'Stores provider-specific metadata and configuration';
COMMENT ON COLUMN service_providers.type IS 'Provider type: linode, digitalocean, aws, gcp';
COMMENT ON COLUMN vps_instances.provider_type IS 'Cached provider type for quick filtering';

-- Create DigitalOcean provider if it doesn't exist
INSERT INTO service_providers (name, type, api_key_encrypted, configuration, active)
SELECT 'DigitalOcean', 'digitalocean', '', '{}', false
WHERE NOT EXISTS (
  SELECT 1 FROM service_providers WHERE type = 'digitalocean'
);

-- Seed popular DigitalOcean VPS plans
DO $$
DECLARE
  v_provider_id UUID;
BEGIN
  -- Get the DigitalOcean provider ID
  SELECT id INTO v_provider_id FROM service_providers WHERE type = 'digitalocean' LIMIT 1;
  
  IF v_provider_id IS NOT NULL THEN
    -- Insert plans only if they don't exist
    INSERT INTO vps_plans (provider_id, name, provider_plan_id, base_price, markup_price, specifications, active)
    SELECT v_provider_id, 'Basic Droplet 1GB', 's-1vcpu-1gb', 6.00, 2.00, 
      '{"vcpus": 1, "memory": 1024, "disk": 25, "transfer": 1000, "price_monthly": 6.00, "price_hourly": 0.00893}'::jsonb, true
    WHERE NOT EXISTS (SELECT 1 FROM vps_plans WHERE provider_id = v_provider_id AND provider_plan_id = 's-1vcpu-1gb');
    
    INSERT INTO vps_plans (provider_id, name, provider_plan_id, base_price, markup_price, specifications, active)
    SELECT v_provider_id, 'Basic Droplet 2GB', 's-1vcpu-2gb', 12.00, 3.00,
      '{"vcpus": 1, "memory": 2048, "disk": 50, "transfer": 2000, "price_monthly": 12.00, "price_hourly": 0.01786}'::jsonb, true
    WHERE NOT EXISTS (SELECT 1 FROM vps_plans WHERE provider_id = v_provider_id AND provider_plan_id = 's-1vcpu-2gb');
    
    INSERT INTO vps_plans (provider_id, name, provider_plan_id, base_price, markup_price, specifications, active)
    SELECT v_provider_id, 'Basic Droplet 4GB', 's-2vcpu-4gb', 24.00, 6.00,
      '{"vcpus": 2, "memory": 4096, "disk": 80, "transfer": 4000, "price_monthly": 24.00, "price_hourly": 0.03571}'::jsonb, true
    WHERE NOT EXISTS (SELECT 1 FROM vps_plans WHERE provider_id = v_provider_id AND provider_plan_id = 's-2vcpu-4gb');
    
    INSERT INTO vps_plans (provider_id, name, provider_plan_id, base_price, markup_price, specifications, active)
    SELECT v_provider_id, 'General Purpose 8GB', 's-4vcpu-8gb', 48.00, 12.00,
      '{"vcpus": 4, "memory": 8192, "disk": 160, "transfer": 5000, "price_monthly": 48.00, "price_hourly": 0.07143}'::jsonb, true
    WHERE NOT EXISTS (SELECT 1 FROM vps_plans WHERE provider_id = v_provider_id AND provider_plan_id = 's-4vcpu-8gb');
    
    INSERT INTO vps_plans (provider_id, name, provider_plan_id, base_price, markup_price, specifications, active)
    SELECT v_provider_id, 'General Purpose 16GB', 's-8vcpu-16gb', 96.00, 24.00,
      '{"vcpus": 8, "memory": 16384, "disk": 320, "transfer": 6000, "price_monthly": 96.00, "price_hourly": 0.14286}'::jsonb, true
    WHERE NOT EXISTS (SELECT 1 FROM vps_plans WHERE provider_id = v_provider_id AND provider_plan_id = 's-8vcpu-16gb');
    
    INSERT INTO vps_plans (provider_id, name, provider_plan_id, base_price, markup_price, specifications, active)
    SELECT v_provider_id, 'CPU-Optimized 4GB', 'c-2', 42.00, 10.00,
      '{"vcpus": 2, "memory": 4096, "disk": 25, "transfer": 4000, "price_monthly": 42.00, "price_hourly": 0.0625}'::jsonb, true
    WHERE NOT EXISTS (SELECT 1 FROM vps_plans WHERE provider_id = v_provider_id AND provider_plan_id = 'c-2');
    
    INSERT INTO vps_plans (provider_id, name, provider_plan_id, base_price, markup_price, specifications, active)
    SELECT v_provider_id, 'CPU-Optimized 8GB', 'c-4', 84.00, 20.00,
      '{"vcpus": 4, "memory": 8192, "disk": 50, "transfer": 5000, "price_monthly": 84.00, "price_hourly": 0.125}'::jsonb, true
    WHERE NOT EXISTS (SELECT 1 FROM vps_plans WHERE provider_id = v_provider_id AND provider_plan_id = 'c-4');
    
    INSERT INTO vps_plans (provider_id, name, provider_plan_id, base_price, markup_price, specifications, active)
    SELECT v_provider_id, 'Memory-Optimized 16GB', 'm-2vcpu-16gb', 120.00, 30.00,
      '{"vcpus": 2, "memory": 16384, "disk": 50, "transfer": 5000, "price_monthly": 120.00, "price_hourly": 0.17857}'::jsonb, true
    WHERE NOT EXISTS (SELECT 1 FROM vps_plans WHERE provider_id = v_provider_id AND provider_plan_id = 'm-2vcpu-16gb');
    
    RAISE NOTICE '✅ DigitalOcean provider and plans seeded successfully';
  END IF;
END $$;

-- Log the migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 014_digitalocean_provider.sql completed successfully';
  RAISE NOTICE 'DigitalOcean is now supported as a VPS provider';
END $$;
