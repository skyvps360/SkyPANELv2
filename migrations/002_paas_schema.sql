-- SkyPanelV2 PaaS Expansion
-- Date: 2025-01-15
-- Adds tables required for managed PaaS capabilities.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clusters represent logical container control planes
CREATE TABLE IF NOT EXISTS paas_clusters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) UNIQUE NOT NULL,
    description TEXT,
    region VARCHAR(100) NOT NULL,
    orchestrator VARCHAR(100) NOT NULL,
    high_availability BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paas_clusters_slug ON paas_clusters(slug);

-- Nodes belong to clusters and represent underlying compute
CREATE TABLE IF NOT EXISTS paas_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_id UUID NOT NULL REFERENCES paas_clusters(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    role VARCHAR(50) DEFAULT 'worker',
    status VARCHAR(50) DEFAULT 'active',
    cpu_total INTEGER NOT NULL,
    cpu_allocated INTEGER DEFAULT 0,
    memory_total_mb INTEGER NOT NULL,
    memory_allocated_mb INTEGER DEFAULT 0,
    storage_total_gb INTEGER NOT NULL,
    storage_allocated_gb INTEGER DEFAULT 0,
    public_ip INET,
    private_ip INET,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paas_nodes_cluster ON paas_nodes(cluster_id);

-- Container images available to templates
CREATE TABLE IF NOT EXISTS paas_container_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    registry_id UUID,
    tag VARCHAR(100) NOT NULL,
    display_name VARCHAR(200),
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plans define compute resources for containers
CREATE TABLE IF NOT EXISTS paas_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    description TEXT,
    cpu_millicores INTEGER NOT NULL,
    memory_mb INTEGER NOT NULL,
    storage_gb INTEGER NOT NULL,
    network_mbps INTEGER DEFAULT 100,
    max_containers INTEGER DEFAULT 1,
    price_hourly NUMERIC(10,4) NOT NULL,
    price_monthly NUMERIC(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paas_plans_slug ON paas_plans(slug);

-- Templates define deployable workloads
CREATE TABLE IF NOT EXISTS paas_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) UNIQUE NOT NULL,
    description TEXT,
    image_id UUID REFERENCES paas_container_images(id) ON DELETE SET NULL,
    default_plan_id UUID REFERENCES paas_plans(id) ON DELETE SET NULL,
    region_scope TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    env_schema JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paas_templates_slug ON paas_templates(slug);

-- External registries for images
CREATE TABLE IF NOT EXISTS paas_registries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    username VARCHAR(150),
    password_encrypted TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Object storage integrations for build artifacts or volumes
CREATE TABLE IF NOT EXISTS paas_storage_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    provider VARCHAR(100) NOT NULL,
    endpoint VARCHAR(255),
    bucket VARCHAR(255),
    region VARCHAR(100),
    access_key_encrypted TEXT,
    secret_key_encrypted TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Domain management for ingress
CREATE TABLE IF NOT EXISTS paas_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_id UUID REFERENCES paas_clusters(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    managed BOOLEAN DEFAULT TRUE,
    dns_provider VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (cluster_id, domain)
);

-- Port management per cluster
CREATE TABLE IF NOT EXISTS paas_port_pools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_id UUID REFERENCES paas_clusters(id) ON DELETE CASCADE,
    range_start INTEGER NOT NULL,
    range_end INTEGER NOT NULL,
    reserved JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Traefik configuration per cluster
CREATE TABLE IF NOT EXISTS paas_traefik_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_id UUID UNIQUE REFERENCES paas_clusters(id) ON DELETE CASCADE,
    dashboard_enabled BOOLEAN DEFAULT FALSE,
    api_insecure BOOLEAN DEFAULT FALSE,
    entrypoints TEXT[] DEFAULT '{"web","websecure"}',
    certificate_resolvers JSONB DEFAULT '{}',
    middleware JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- End-user deployments (container apps)
CREATE TABLE IF NOT EXISTS paas_deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES paas_templates(id) ON DELETE SET NULL,
    plan_id UUID REFERENCES paas_plans(id) ON DELETE SET NULL,
    cluster_id UUID REFERENCES paas_clusters(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'provisioning',
    name VARCHAR(150) NOT NULL,
    endpoint VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    billing_hourly_rate NUMERIC(10,4) DEFAULT 0,
    billing_started_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paas_deployments_org ON paas_deployments(organization_id);
CREATE INDEX IF NOT EXISTS idx_paas_deployments_status ON paas_deployments(status);

-- Track template enablement per region
CREATE TABLE IF NOT EXISTS paas_template_regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES paas_templates(id) ON DELETE CASCADE,
    region VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    UNIQUE(template_id, region)
);

-- Maintain updated_at triggers
CREATE TRIGGER trigger_paas_clusters_updated
    BEFORE UPDATE ON paas_clusters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_paas_nodes_updated
    BEFORE UPDATE ON paas_nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_paas_images_updated
    BEFORE UPDATE ON paas_container_images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_paas_plans_updated
    BEFORE UPDATE ON paas_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_paas_templates_updated
    BEFORE UPDATE ON paas_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_paas_registries_updated
    BEFORE UPDATE ON paas_registries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_paas_storage_targets_updated
    BEFORE UPDATE ON paas_storage_targets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_paas_domains_updated
    BEFORE UPDATE ON paas_domains
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_paas_port_pools_updated
    BEFORE UPDATE ON paas_port_pools
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_paas_traefik_updated
    BEFORE UPDATE ON paas_traefik_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_paas_deployments_updated
    BEFORE UPDATE ON paas_deployments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
