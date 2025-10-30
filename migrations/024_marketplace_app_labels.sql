-- Migration: Marketplace App Display Name Overrides
-- Description: Adds table to store admin-defined display names for provider marketplace applications.
-- Date: 2025-10-30

CREATE TABLE IF NOT EXISTS provider_marketplace_labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  app_slug TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT provider_marketplace_labels_unique UNIQUE (provider_id, app_slug)
);

CREATE INDEX IF NOT EXISTS idx_provider_marketplace_labels_provider_id
  ON provider_marketplace_labels(provider_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_provider_marketplace_labels_updated_at'
  ) THEN
    CREATE TRIGGER update_provider_marketplace_labels_updated_at
      BEFORE UPDATE ON provider_marketplace_labels
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMENT ON TABLE provider_marketplace_labels IS 'Stores local display-name overrides for provider marketplace applications.';
COMMENT ON COLUMN provider_marketplace_labels.display_name IS 'Admin-defined display label applied within the SkyPanel UI.';
