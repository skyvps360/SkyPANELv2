-- Migration: User SSH Keys
-- Description: Create user_ssh_keys table for per-user SSH key management with cross-provider synchronization
-- Date: 2025-10-28

-- Create user_ssh_keys table
CREATE TABLE IF NOT EXISTS user_ssh_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  public_key TEXT NOT NULL,
  fingerprint VARCHAR(255) NOT NULL,
  linode_key_id VARCHAR(50),
  digitalocean_key_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate keys for the same user
  CONSTRAINT unique_user_fingerprint UNIQUE(user_id, fingerprint)
);

-- Create indexes for efficient queries
CREATE INDEX idx_user_ssh_keys_user_id ON user_ssh_keys(user_id);
CREATE INDEX idx_user_ssh_keys_fingerprint ON user_ssh_keys(fingerprint);

-- Add comment to table
COMMENT ON TABLE user_ssh_keys IS 'Stores SSH keys per user with provider-specific IDs for Linode and DigitalOcean';

-- Add comments to columns
COMMENT ON COLUMN user_ssh_keys.user_id IS 'Foreign key to users table';
COMMENT ON COLUMN user_ssh_keys.name IS 'User-friendly name for the SSH key';
COMMENT ON COLUMN user_ssh_keys.public_key IS 'The SSH public key content';
COMMENT ON COLUMN user_ssh_keys.fingerprint IS 'SSH key fingerprint for uniqueness validation';
COMMENT ON COLUMN user_ssh_keys.linode_key_id IS 'Linode provider key ID (nullable if sync fails)';
COMMENT ON COLUMN user_ssh_keys.digitalocean_key_id IS 'DigitalOcean provider key ID (nullable if sync fails)';
COMMENT ON COLUMN user_ssh_keys.created_at IS 'Timestamp when the key was created';
COMMENT ON COLUMN user_ssh_keys.updated_at IS 'Timestamp when the key was last updated';
