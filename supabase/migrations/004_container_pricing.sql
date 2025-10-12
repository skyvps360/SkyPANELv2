-- Container pricing config and plans
-- Defines unit pricing for custom containers and named presets

-- Pricing config: unit prices used to calculate custom container cost
CREATE TABLE IF NOT EXISTS container_pricing_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    price_per_cpu DECIMAL(10,2) NOT NULL DEFAULT 0.00,          -- per vCPU core
    price_per_ram_gb DECIMAL(10,2) NOT NULL DEFAULT 0.00,       -- per GB RAM
    price_per_storage_gb DECIMAL(10,2) NOT NULL DEFAULT 0.00,   -- per GB storage
    price_per_network_mbps DECIMAL(10,2) NOT NULL DEFAULT 0.00, -- per Mbps
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Named container plans (optional presets)
CREATE TABLE IF NOT EXISTS container_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    cpu_cores INT NOT NULL CHECK (cpu_cores > 0),
    ram_gb INT NOT NULL CHECK (ram_gb > 0),
    storage_gb INT NOT NULL CHECK (storage_gb > 0),
    network_mbps INT NOT NULL CHECK (network_mbps >= 0),
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    markup_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_container_plans_active ON container_plans(active);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_container_pricing_config_updated_at
    BEFORE UPDATE ON container_pricing_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_container_plans_updated_at
    BEFORE UPDATE ON container_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (enabled but admin uses service role)
ALTER TABLE container_pricing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE container_plans ENABLE ROW LEVEL SECURITY;

-- For now, allow authenticated users to read container plans; pricing config is admin-only
CREATE POLICY "Users can view container plans" ON container_plans
    FOR SELECT USING (true);

CREATE POLICY "Admins manage container plans" ON container_plans
    FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Pricing config read for all, write for admin
CREATE POLICY "Users can view pricing config" ON container_pricing_config
    FOR SELECT USING (true);

CREATE POLICY "Admins manage pricing config" ON container_pricing_config
    FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));