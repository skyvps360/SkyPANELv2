-- Migration: Add provider_id foreign key to vps_instances
-- This migration adds a direct reference from vps_instances to service_providers
-- and populates it for existing instances

-- Add provider_id column to vps_instances if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'vps_instances'
      AND column_name = 'provider_id'
  ) THEN
    ALTER TABLE vps_instances 
      ADD COLUMN provider_id UUID REFERENCES service_providers(id) ON DELETE SET NULL;
    
    RAISE NOTICE 'Added provider_id column to vps_instances';
  ELSE
    RAISE NOTICE 'provider_id column already exists in vps_instances';
  END IF;
END $$;

-- Create index on provider_id for performance
CREATE INDEX IF NOT EXISTS idx_vps_instances_provider_id ON vps_instances(provider_id);

-- Populate provider_id for existing Linode instances
-- This links instances to the Linode provider based on provider_type
DO $$
DECLARE
  linode_provider_id UUID;
  updated_count INTEGER;
BEGIN
  -- Get the Linode provider ID
  SELECT id INTO linode_provider_id 
  FROM service_providers 
  WHERE type = 'linode' 
  LIMIT 1;
  
  IF linode_provider_id IS NOT NULL THEN
    -- Update instances that have provider_type='linode' but no provider_id
    UPDATE vps_instances 
    SET provider_id = linode_provider_id
    WHERE provider_type = 'linode' 
      AND provider_id IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % existing Linode instances with provider_id', updated_count;
    
    -- Also update instances with NULL provider_type (legacy instances)
    -- Assume they are Linode instances
    UPDATE vps_instances 
    SET provider_id = linode_provider_id,
        provider_type = 'linode'
    WHERE provider_type IS NULL 
      AND provider_id IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % legacy instances with Linode provider_id', updated_count;
  ELSE
    RAISE WARNING 'No Linode provider found in service_providers table';
  END IF;
END $$;

-- Add comment to document the column
COMMENT ON COLUMN vps_instances.provider_id IS 'Foreign key reference to service_providers table for direct provider lookup';

-- Log the migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 016_add_provider_id_to_vps_instances.sql completed successfully';
  RAISE NOTICE 'vps_instances now has provider_id foreign key to service_providers';
END $$;
