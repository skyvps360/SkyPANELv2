-- Align vps_plans schema with backend expectations and add service_providers

-- Create service_providers table (if missing)
CREATE TABLE IF NOT EXISTS service_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('linode','digitalocean','aws','gcp')),
  api_key_encrypted TEXT NOT NULL,
  configuration JSONB NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns to vps_plans to support admin APIs
ALTER TABLE vps_plans
  ADD COLUMN IF NOT EXISTS provider_id UUID,
  ADD COLUMN IF NOT EXISTS base_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS markup_price NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS specifications JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

-- Add foreign key constraint for provider_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'vps_plans_provider_id_fkey'
  ) THEN
    ALTER TABLE vps_plans
      ADD CONSTRAINT vps_plans_provider_id_fkey
      FOREIGN KEY (provider_id) REFERENCES service_providers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Ensure updated_at trigger exists for service_providers and vps_plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_service_providers_updated_at'
  ) THEN
    CREATE TRIGGER update_service_providers_updated_at
    BEFORE UPDATE ON service_providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_vps_plans_updated_at'
  ) THEN
    CREATE TRIGGER update_vps_plans_updated_at
    BEFORE UPDATE ON vps_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Optional: backfill base_price from legacy price_monthly if present and base_price is NULL
DO $$
BEGIN
  -- Only run backfill if legacy column exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'vps_plans'
      AND column_name = 'price_monthly'
  ) THEN
    UPDATE vps_plans
    SET base_price = price_monthly
    WHERE base_price IS NULL AND price_monthly IS NOT NULL;
  END IF;
END $$;