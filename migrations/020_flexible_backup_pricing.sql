-- Migration: Flexible Backup Pricing
-- Description: Add support for provider-specific backup frequencies (daily/weekly) and admin-configurable backup upcharges

-- Add backup frequency configuration to vps_plans
ALTER TABLE vps_plans
ADD COLUMN IF NOT EXISTS daily_backups_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS weekly_backups_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS backup_upcharge_monthly DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS backup_upcharge_hourly DECIMAL(10,6) DEFAULT 0;

-- Add backup frequency selection to vps_instances
ALTER TABLE vps_instances
ADD COLUMN IF NOT EXISTS backup_frequency VARCHAR(20) DEFAULT 'weekly'
  CHECK (backup_frequency IN ('daily', 'weekly', 'none'));

-- Add column comments for documentation
COMMENT ON COLUMN vps_plans.daily_backups_enabled IS 'Whether daily backups are available for this plan (DigitalOcean only)';
COMMENT ON COLUMN vps_plans.weekly_backups_enabled IS 'Whether weekly backups are available for this plan';
COMMENT ON COLUMN vps_plans.backup_upcharge_monthly IS 'Admin markup on backup pricing (monthly, USD)';
COMMENT ON COLUMN vps_plans.backup_upcharge_hourly IS 'Admin markup on backup pricing (hourly, USD)';
COMMENT ON COLUMN vps_instances.backup_frequency IS 'Selected backup frequency: daily, weekly, or none';

-- Update existing plans for backward compatibility
-- Set weekly backups enabled for all existing plans
UPDATE vps_plans
SET weekly_backups_enabled = true
WHERE weekly_backups_enabled IS NULL;

-- Set daily backups disabled for Linode plans (Linode only supports weekly)
UPDATE vps_plans
SET daily_backups_enabled = false
WHERE provider_id IN (
  SELECT id FROM service_providers WHERE type = 'linode'
);

-- Set backup upcharge to 0 for all existing plans
UPDATE vps_plans
SET backup_upcharge_monthly = 0,
    backup_upcharge_hourly = 0
WHERE backup_upcharge_monthly IS NULL;

-- Update existing VPS instances with backup frequency
-- Set to 'weekly' where backups are enabled in configuration
UPDATE vps_instances
SET backup_frequency = 'weekly'
WHERE configuration::jsonb->>'backups_enabled' = 'true'
  AND backup_frequency IS NULL;

-- Set to 'none' where backups are disabled
UPDATE vps_instances
SET backup_frequency = 'none'
WHERE (configuration::jsonb->>'backups_enabled' = 'false' OR configuration::jsonb->>'backups_enabled' IS NULL)
  AND backup_frequency IS NULL;
