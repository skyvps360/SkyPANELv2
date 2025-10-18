-- Add password reset columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMP;

-- Create index for reset token lookups
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token) 
WHERE reset_token IS NOT NULL;
