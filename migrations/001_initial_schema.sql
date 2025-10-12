-- ContainerStacks PostgreSQL Migration Script
-- This script creates all the necessary tables for the ContainerStacks application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    phone VARCHAR(50),
    timezone VARCHAR(100),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{}',
    website VARCHAR(500),
    address TEXT,
    tax_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create organization_members table
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_api_keys table
CREATE TABLE IF NOT EXISTS user_api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    permissions JSONB DEFAULT '{}',
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create containers table
CREATE TABLE IF NOT EXISTS containers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    image VARCHAR(500) NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    config JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'stopped',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vps_instances table
CREATE TABLE IF NOT EXISTS vps_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id VARCHAR(255) NOT NULL,
    provider_instance_id VARCHAR(255) NOT NULL,
    label VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'provisioning',
    ip_address INET,
    configuration JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create support_ticket_replies table
CREATE TABLE IF NOT EXISTS support_ticket_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_staff_reply BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vps_plans table
CREATE TABLE IF NOT EXISTS vps_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(100) NOT NULL,
    provider_plan_id VARCHAR(255) NOT NULL,
    cpu_cores INTEGER NOT NULL,
    memory_gb INTEGER NOT NULL,
    storage_gb INTEGER NOT NULL,
    bandwidth_gb INTEGER,
    price_monthly DECIMAL(10,2) NOT NULL,
    price_hourly DECIMAL(10,4) NOT NULL,
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50) NOT NULL,
    payment_provider VARCHAR(50) NOT NULL,
    provider_transaction_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_org_id ON wallets(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_containers_org_id ON containers(organization_id);
CREATE INDEX IF NOT EXISTS idx_containers_created_by ON containers(created_by);
CREATE INDEX IF NOT EXISTS idx_vps_instances_org_id ON vps_instances(organization_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_org_id ON support_tickets(organization_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_by ON support_tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_support_ticket_replies_ticket_id ON support_ticket_replies(ticket_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_org_id ON payment_transactions(organization_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_api_keys_updated_at BEFORE UPDATE ON user_api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_containers_updated_at BEFORE UPDATE ON containers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vps_instances_updated_at BEFORE UPDATE ON vps_instances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vps_plans_updated_at BEFORE UPDATE ON vps_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: admin123)
DO $$
DECLARE
    admin_user_id UUID;
    admin_org_id UUID;
BEGIN
    -- Insert admin user if not exists
    INSERT INTO users (id, email, password_hash, name, role) 
    VALUES (
        uuid_generate_v4(),
        'admin@containerstacks.com',
        '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO9G',
        'System Administrator',
        'admin'
    ) ON CONFLICT (email) DO NOTHING
    RETURNING id INTO admin_user_id;
    
    -- Get admin user id if it already exists
    IF admin_user_id IS NULL THEN
        SELECT id INTO admin_user_id FROM users WHERE email = 'admin@containerstacks.com';
    END IF;
    
    -- Insert default organization for admin user
    INSERT INTO organizations (id, name, slug, owner_id)
    VALUES (
        uuid_generate_v4(),
        'ContainerStacks Admin',
        'containerstacks-admin',
        admin_user_id
    ) ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO admin_org_id;
    
    -- Get organization id if it already exists
    IF admin_org_id IS NULL THEN
        SELECT id INTO admin_org_id FROM organizations WHERE slug = 'containerstacks-admin';
    END IF;
    
    -- Add admin user to organization members
    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (admin_org_id, admin_user_id, 'owner')
    ON CONFLICT (organization_id, user_id) DO NOTHING;
    
    -- Create wallet for admin organization
    INSERT INTO wallets (organization_id, balance)
    VALUES (admin_org_id, 0.00)
    ON CONFLICT DO NOTHING;
    
END $$;

-- VPS plans will be managed through the admin panel