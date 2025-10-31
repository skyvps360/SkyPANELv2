-- Container orchestration enhancements

-- Extend container_plans with resource profile, price, visibility, and quota controls
ALTER TABLE container_plans
  ADD COLUMN IF NOT EXISTS resource_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS max_containers INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE container_plans
SET resource_profile = jsonb_build_object(
  'cpuCores', cpu_cores,
  'memoryGb', ram_gb,
  'storageGb', storage_gb,
  'networkMbps', network_mbps
)
WHERE resource_profile = '{}'::jsonb;

-- Extend containers table to track Docker state
ALTER TABLE containers
  ADD COLUMN IF NOT EXISTS docker_id VARCHAR(128),
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES container_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS desired_state VARCHAR(32) DEFAULT 'stopped',
  ADD COLUMN IF NOT EXISTS last_status_sync TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS runtime JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_containers_plan_id ON containers(plan_id);
CREATE INDEX IF NOT EXISTS idx_containers_docker_id ON containers(docker_id);

-- Track organization plan assignments
CREATE TABLE IF NOT EXISTS organization_container_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES container_plans(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_org_container_plan ON organization_container_plans(organization_id, plan_id);

-- Swarm node inventory
CREATE TABLE IF NOT EXISTS container_swarm_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  docker_id VARCHAR(128) NOT NULL,
  hostname VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL,
  availability VARCHAR(32) NOT NULL DEFAULT 'active',
  status JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_container_swarm_nodes_updated_at'
  ) THEN
    CREATE TRIGGER update_container_swarm_nodes_updated_at
    BEFORE UPDATE ON container_swarm_nodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'container_plans'
      AND column_name = 'base_price'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'container_plans'
      AND column_name = 'markup_price'
  ) THEN
    UPDATE container_plans
    SET price_monthly = COALESCE(base_price, 0) + COALESCE(markup_price, 0)
    WHERE price_monthly = 0;
  END IF;
END $$;
