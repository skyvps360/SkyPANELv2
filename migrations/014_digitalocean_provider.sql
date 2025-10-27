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

-- Log the migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 014_digitalocean_provider.sql completed successfully';
  RAISE NOTICE 'DigitalOcean is now supported as a VPS provider';
END $$;
