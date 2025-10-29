-- Migration: Admin Region Controls
-- Description: Add provider_region_overrides table to manage admin-defined region allowlists for infrastructure providers.
-- Date: 2025-10-28

CREATE TABLE IF NOT EXISTS provider_region_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  region TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT provider_region_overrides_unique UNIQUE (provider_id, region)
);

CREATE INDEX IF NOT EXISTS idx_provider_region_overrides_provider_id
  ON provider_region_overrides(provider_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_provider_region_overrides_updated_at'
  ) THEN
    CREATE TRIGGER update_provider_region_overrides_updated_at
      BEFORE UPDATE ON provider_region_overrides
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Seed overrides based on existing allowed_regions configurations for active providers
INSERT INTO provider_region_overrides (provider_id, region)
SELECT
  sp.id,
  LOWER(TRIM(region_value))
FROM service_providers sp
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(sp.allowed_regions, '[]'::jsonb)) AS region_value
WHERE jsonb_array_length(COALESCE(sp.allowed_regions, '[]'::jsonb)) > 0
  AND sp.type IN ('linode', 'digitalocean')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE provider_region_overrides IS 'Stores admin-defined region allowlists per infrastructure provider.';
COMMENT ON COLUMN provider_region_overrides.region IS 'Normalized provider region identifier (slug).';
