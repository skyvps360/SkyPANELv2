-- Fix Activity Logs for System Events
-- Allow NULL user_id for system-level events like rate limiting configuration

-- Remove the NOT NULL constraint from user_id to allow system events
ALTER TABLE activity_logs ALTER COLUMN user_id DROP NOT NULL;

-- Add a check constraint to ensure that either user_id is provided OR it's a system event
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_user_or_system_check 
CHECK (
  user_id IS NOT NULL OR 
  (user_id IS NULL AND entity_type = 'system')
);

-- Add a comment to document the change
COMMENT ON COLUMN activity_logs.user_id IS 'User ID for user events, NULL for system events';
COMMENT ON CONSTRAINT activity_logs_user_or_system_check ON activity_logs IS 'Ensures user_id is provided for user events, or NULL for system events only';