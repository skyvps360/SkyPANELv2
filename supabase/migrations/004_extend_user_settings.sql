-- Extend user settings support
-- Add fields for phone, timezone, and preferences

-- Add additional user profile fields
ALTER TABLE users 
ADD COLUMN phone VARCHAR(20),
ADD COLUMN timezone VARCHAR(50) DEFAULT 'America/New_York',
ADD COLUMN preferences JSONB DEFAULT '{}';

-- Add user API keys table
CREATE TABLE user_api_keys (
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

-- Add organization settings fields
ALTER TABLE organizations 
ADD COLUMN website VARCHAR(255),
ADD COLUMN address TEXT,
ADD COLUMN tax_id VARCHAR(50);

-- Update users table to include notification preferences in preferences JSONB
-- Default notification preferences structure:
-- {
--   "notifications": {
--     "email": true,
--     "sms": false,
--     "containerAlerts": true,
--     "billingAlerts": true,
--     "securityAlerts": true,
--     "maintenanceAlerts": true
--   },
--   "security": {
--     "twoFactorEnabled": false
--   }
-- }

-- Create indexes for performance
CREATE INDEX idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX idx_user_api_keys_active ON user_api_keys(active);
CREATE INDEX idx_users_email ON users(email);

-- Update RLS policies for new tables
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only access their own API keys
CREATE POLICY "Users can view own API keys" ON user_api_keys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own API keys" ON user_api_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys" ON user_api_keys
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys" ON user_api_keys
    FOR DELETE USING (auth.uid() = user_id);