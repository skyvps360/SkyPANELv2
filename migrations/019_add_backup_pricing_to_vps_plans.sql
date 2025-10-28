-- Migration: Add backup pricing fields to vps_plans table
-- This allows admins to configure backup pricing per plan instead of using hardcoded percentages

-- Add backup pricing fields
ALTER TABLE vps_plans 
ADD COLUMN IF NOT EXISTS backup_price_monthly DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS backup_price_hourly DECIMAL(10,6) DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN vps_plans.backup_price_monthly IS 'Monthly backup price for this plan (USD)';
COMMENT ON COLUMN vps_plans.backup_price_hourly IS 'Hourly backup price for this plan (USD)';
