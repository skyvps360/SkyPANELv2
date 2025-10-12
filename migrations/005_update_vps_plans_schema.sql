-- Migration: Update vps_plans table schema to match application code
-- This updates the vps_plans table to use provider_id (UUID) instead of provider (VARCHAR)

-- Drop the old provider column and add the new structure
ALTER TABLE vps_plans DROP COLUMN IF EXISTS provider;
ALTER TABLE vps_plans DROP COLUMN IF EXISTS cpu_cores;
ALTER TABLE vps_plans DROP COLUMN IF EXISTS memory_gb;
ALTER TABLE vps_plans DROP COLUMN IF EXISTS storage_gb;
ALTER TABLE vps_plans DROP COLUMN IF EXISTS bandwidth_gb;
ALTER TABLE vps_plans DROP COLUMN IF EXISTS price_monthly;
ALTER TABLE vps_plans DROP COLUMN IF EXISTS price_hourly;
ALTER TABLE vps_plans DROP COLUMN IF EXISTS available;

-- Add new columns to match the application code
ALTER TABLE vps_plans ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES service_providers(id) ON DELETE CASCADE;
ALTER TABLE vps_plans ADD COLUMN IF NOT EXISTS base_price DECIMAL(10,2) NOT NULL DEFAULT 0.00;
ALTER TABLE vps_plans ADD COLUMN IF NOT EXISTS markup_price DECIMAL(10,2) NOT NULL DEFAULT 0.00;
ALTER TABLE vps_plans ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}';
ALTER TABLE vps_plans ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_vps_plans_provider_id ON vps_plans(provider_id);
CREATE INDEX IF NOT EXISTS idx_vps_plans_active ON vps_plans(active);
