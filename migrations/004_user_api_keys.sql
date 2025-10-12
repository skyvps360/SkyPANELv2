-- Migration: Ensure user_api_keys table has correct structure for API key management
-- This migration handles transition from old schema to new schema

-- First, check if we need to migrate from old 'name' column to 'key_name'
DO $$
BEGIN
    -- If 'name' column exists and 'key_name' doesn't, we need to migrate
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_api_keys' AND column_name = 'name')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_api_keys' AND column_name = 'key_name') THEN
        
        -- Add new columns
        ALTER TABLE user_api_keys 
        ADD COLUMN key_name VARCHAR(255),
        ADD COLUMN key_prefix VARCHAR(255),
        ADD COLUMN active BOOLEAN DEFAULT TRUE;
        
        -- Migrate data from 'name' to 'key_name'
        UPDATE user_api_keys SET key_name = name WHERE key_name IS NULL;
        
        -- Set key_prefix for existing records (generate from existing data)
        UPDATE user_api_keys SET key_prefix = 'sk_live_...' WHERE key_prefix IS NULL;
        
        -- Make key_name and key_prefix NOT NULL
        ALTER TABLE user_api_keys 
        ALTER COLUMN key_name SET NOT NULL,
        ALTER COLUMN key_prefix SET NOT NULL;
        
        -- Drop old 'name' column
        ALTER TABLE user_api_keys DROP COLUMN name;
    END IF;
    
    -- Add any other missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_api_keys' AND column_name = 'key_name') THEN
        ALTER TABLE user_api_keys ADD COLUMN key_name VARCHAR(255) NOT NULL DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_api_keys' AND column_name = 'key_prefix') THEN
        ALTER TABLE user_api_keys ADD COLUMN key_prefix VARCHAR(255) NOT NULL DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_api_keys' AND column_name = 'active') THEN
        ALTER TABLE user_api_keys ADD COLUMN active BOOLEAN DEFAULT TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_api_keys' AND column_name = 'updated_at') THEN
        ALTER TABLE user_api_keys ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

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
