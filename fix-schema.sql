-- Fix ContainerStacks Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Add missing columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'America/New_York',
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Create user_api_keys table
CREATE TABLE IF NOT EXISTS user_api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    key_name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(20) NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    active BOOLEAN DEFAULT TRUE
);

-- Add missing columns to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS website VARCHAR(255),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_active ON user_api_keys(active);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Enable RLS on user_api_keys table
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_api_keys
CREATE POLICY IF NOT EXISTS "Users can view own API keys" ON user_api_keys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own API keys" ON user_api_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own API keys" ON user_api_keys
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own API keys" ON user_api_keys
    FOR DELETE USING (auth.uid() = user_id);

-- Update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_api_keys_updated_at') THEN
        CREATE TRIGGER update_user_api_keys_updated_at
            BEFORE UPDATE ON user_api_keys
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;