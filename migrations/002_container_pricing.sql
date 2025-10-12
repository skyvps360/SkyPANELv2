-- Container pricing and plans schema for PostgreSQL

-- Pricing config table
CREATE TABLE IF NOT EXISTS container_pricing_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  price_per_cpu NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_per_ram_gb NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_per_storage_gb NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_per_network_mbps NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Plans table
CREATE TABLE IF NOT EXISTS container_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  cpu_cores INTEGER NOT NULL,
  ram_gb INTEGER NOT NULL,
  storage_gb INTEGER NOT NULL,
  network_mbps INTEGER NOT NULL DEFAULT 0,
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  markup_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Triggers to maintain updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_container_pricing_config_updated_at'
  ) THEN
    CREATE TRIGGER update_container_pricing_config_updated_at
    BEFORE UPDATE ON container_pricing_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_container_plans_updated_at'
  ) THEN
    CREATE TRIGGER update_container_plans_updated_at
    BEFORE UPDATE ON container_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;