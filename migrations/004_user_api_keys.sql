-- Migration: Add missing columns to user_api_keys table for API key management
-- Run this after the initial schema to add API key functionality

-- Add missing columns to user_api_keys if they don't exist
ALTER TABLE user_api_keys
ADD COLUMN IF NOT EXISTS key_name VARCHAR(255) NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS key_hash TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS key_prefix VARCHAR(255) NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_active ON user_api_keys(active);

-- Row Level Security for multi-tenancy
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can manage their own API keys" ON user_api_keys;
CREATE POLICY "Users can manage their own API keys" ON user_api_keys
    FOR ALL USING (user_id = current_setting('app.current_user_id', true)::UUID);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_api_keys_updated_at ON user_api_keys;
CREATE TRIGGER update_user_api_keys_updated_at
    BEFORE UPDATE ON user_api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
