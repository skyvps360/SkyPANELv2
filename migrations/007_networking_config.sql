-- Networking configuration for rDNS templates

CREATE TABLE IF NOT EXISTS networking_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rdns_base_domain TEXT NOT NULL DEFAULT 'ip.rev.skyvps360.xyz',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to maintain updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_networking_config_updated_at'
  ) THEN
    CREATE TRIGGER update_networking_config_updated_at
    BEFORE UPDATE ON networking_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;