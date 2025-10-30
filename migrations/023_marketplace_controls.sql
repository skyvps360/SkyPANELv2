-- Migration: Admin Marketplace Controls
-- Description: Adds admin-managed allowlist for DigitalOcean marketplace applications.
-- Date: 2025-10-30

-- Ensure service_providers has an allowed_marketplace_apps column for legacy compatibility
ALTER TABLE service_providers
ADD COLUMN IF NOT EXISTS allowed_marketplace_apps JSONB NOT NULL DEFAULT '[]';

-- Table storing explicit marketplace overrides per provider
CREATE TABLE IF NOT EXISTS provider_marketplace_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  app_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT provider_marketplace_overrides_unique UNIQUE (provider_id, app_slug)
);

CREATE INDEX IF NOT EXISTS idx_provider_marketplace_overrides_provider_id
  ON provider_marketplace_overrides(provider_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_provider_marketplace_overrides_updated_at'
  ) THEN
    CREATE TRIGGER update_provider_marketplace_overrides_updated_at
      BEFORE UPDATE ON provider_marketplace_overrides
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMENT ON TABLE provider_marketplace_overrides IS 'Stores admin-defined allowlist of provider marketplace applications.';
COMMENT ON COLUMN provider_marketplace_overrides.app_slug IS 'DigitalOcean marketplace slug (normalized to lowercase).';
