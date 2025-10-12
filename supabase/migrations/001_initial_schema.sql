-- ContainerStacks Database Schema
-- Initial migration with all core tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for authentication and profile management
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organizations table for multi-tenancy
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wallets table for account balance management
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    balance DECIMAL(12,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table for billing management
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    line_items JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Support tickets table
CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ticket replies table
CREATE TABLE ticket_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_admin_reply BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service providers table for cloud provider integration
CREATE TABLE service_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('linode', 'digitalocean', 'aws', 'gcp')),
    api_key_encrypted TEXT NOT NULL,
    configuration JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- VPS plans table for reseller functionality
CREATE TABLE vps_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID REFERENCES service_providers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    provider_plan_id VARCHAR(100) NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    markup_price DECIMAL(10,2) NOT NULL,
    specifications JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- VPS instances table
CREATE TABLE vps_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES vps_plans(id) ON DELETE RESTRICT,
    provider_instance_id VARCHAR(100) NOT NULL,
    label VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'provisioning',
    ip_address INET,
    configuration JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Containers table
CREATE TABLE containers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    image VARCHAR(255) NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    config JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'stopped',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Metrics table for monitoring
CREATE TABLE metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    container_id UUID REFERENCES containers(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,
    value DECIMAL(10,4) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Backups table
CREATE TABLE backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    container_id UUID REFERENCES containers(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    backup_type VARCHAR(20) DEFAULT 'manual' CHECK (backup_type IN ('manual', 'scheduled')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    file_path TEXT,
    file_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Organization members table for collaboration
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_wallets_organization_id ON wallets(organization_id);
CREATE INDEX idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_support_tickets_organization_id ON support_tickets(organization_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_ticket_replies_ticket_id ON ticket_replies(ticket_id);
CREATE INDEX idx_vps_instances_organization_id ON vps_instances(organization_id);
CREATE INDEX idx_vps_instances_plan_id ON vps_instances(plan_id);
CREATE INDEX idx_containers_organization_id ON containers(organization_id);
CREATE INDEX idx_containers_status ON containers(status);
CREATE INDEX idx_metrics_container_id ON metrics(container_id);
CREATE INDEX idx_metrics_timestamp ON metrics(timestamp);
CREATE INDEX idx_backups_container_id ON backups(container_id);
CREATE INDEX idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_organization_members_user_id ON organization_members(user_id);

-- Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE vps_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE containers ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Organizations
CREATE POLICY "Users can view their own organizations" ON organizations
    FOR SELECT USING (
        owner_id = auth.uid() OR 
        id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update their own organizations" ON organizations
    FOR UPDATE USING (
        owner_id = auth.uid() OR 
        id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    );

-- RLS Policies for Wallets
CREATE POLICY "Users can manage their organization's wallets" ON wallets
    FOR ALL USING (organization_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid() OR 
        id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
    ));

-- RLS Policies for Invoices
CREATE POLICY "Users can view their organization's invoices" ON invoices
    FOR SELECT USING (organization_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid() OR 
        id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
    ));

-- RLS Policies for Support Tickets
CREATE POLICY "Users can manage their organization's tickets" ON support_tickets
    FOR ALL USING (organization_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid() OR 
        id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
    ));

-- RLS Policies for Ticket Replies
CREATE POLICY "Users can view replies to their tickets" ON ticket_replies
    FOR SELECT USING (ticket_id IN (
        SELECT id FROM support_tickets WHERE organization_id IN (
            SELECT id FROM organizations WHERE owner_id = auth.uid() OR 
            id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
        )
    ));

-- RLS Policies for VPS Instances
CREATE POLICY "Users can manage their organization's VPS instances" ON vps_instances
    FOR ALL USING (organization_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid() OR 
        id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
    ));

-- RLS Policies for Containers
CREATE POLICY "Users can manage their organization's containers" ON containers
    FOR ALL USING (organization_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid() OR 
        id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
    ));

-- RLS Policies for Metrics
CREATE POLICY "Users can view metrics for their containers" ON metrics
    FOR SELECT USING (container_id IN (
        SELECT id FROM containers WHERE organization_id IN (
            SELECT id FROM organizations WHERE owner_id = auth.uid() OR 
            id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
        )
    ));

-- RLS Policies for Backups
CREATE POLICY "Users can manage backups for their organization" ON backups
    FOR ALL USING (organization_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid() OR 
        id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
    ));

-- RLS Policies for Organization Members
CREATE POLICY "Users can view organization members" ON organization_members
    FOR SELECT USING (organization_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid() OR 
        id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
    ));

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON users TO anon;
GRANT ALL PRIVILEGES ON organizations TO authenticated;
GRANT ALL PRIVILEGES ON wallets TO authenticated;
GRANT ALL PRIVILEGES ON invoices TO authenticated;
GRANT ALL PRIVILEGES ON support_tickets TO authenticated;
GRANT ALL PRIVILEGES ON ticket_replies TO authenticated;
GRANT ALL PRIVILEGES ON service_providers TO authenticated;
GRANT ALL PRIVILEGES ON vps_plans TO authenticated;
GRANT ALL PRIVILEGES ON vps_instances TO authenticated;
GRANT ALL PRIVILEGES ON containers TO authenticated;
GRANT ALL PRIVILEGES ON metrics TO authenticated;
GRANT ALL PRIVILEGES ON backups TO authenticated;
GRANT ALL PRIVILEGES ON organization_members TO authenticated;

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_providers_updated_at BEFORE UPDATE ON service_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vps_plans_updated_at BEFORE UPDATE ON vps_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vps_instances_updated_at BEFORE UPDATE ON vps_instances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_containers_updated_at BEFORE UPDATE ON containers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();