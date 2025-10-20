-- Fix Notification Filtering
-- Updates the notification trigger to only send notifications for user-relevant events
-- This prevents system events, rate limiting, and admin operations from showing as notifications

-- Update the notification function to filter out system events
CREATE OR REPLACE FUNCTION notify_new_activity() 
RETURNS TRIGGER AS $$
BEGIN
  -- Only send notifications for user-relevant events
  -- Exclude system events, rate limiting, admin operations, and impersonation
  IF NEW.event_type IN (
    -- VPS operations (user should be notified)
    'vps.create', 'vps.boot', 'vps.shutdown', 'vps.reboot', 'vps.delete',
    'vps.backups.enable', 'vps.backups.disable', 'vps.backups.schedule', 
    'vps.backups.snapshot', 'vps.backups.restore',
    'vps.firewall.attach', 'vps.firewall.detach',
    'vps.network.rdns', 'vps.hostname.update',
    
    -- Authentication events (login only, logout not needed)
    'auth.login',
    
    -- API key management (user should be notified)
    'api_key.create', 'api_key.revoke',
    
    -- Support ticket events (user should be notified)
    'ticket_reply',
    
    -- User profile updates (user should be notified)
    'user_update'
  ) THEN
    PERFORM pg_notify(
      'new_activity',
      json_build_object(
        'id', NEW.id,
        'user_id', NEW.user_id,
        'organization_id', NEW.organization_id,
        'event_type', NEW.event_type,
        'entity_type', NEW.entity_type,
        'entity_id', NEW.entity_id,
        'message', NEW.message,
        'status', NEW.status,
        'created_at', NEW.created_at,
        'is_read', NEW.is_read
      )::text
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The trigger already exists, so we don't need to recreate it
-- The updated function will automatically be used by the existing trigger

-- Add a comment to document the filtering logic
COMMENT ON FUNCTION notify_new_activity() IS 
'Sends real-time notifications only for user-relevant events. Excludes system events like rate_limit_violation, rate_limit_config, admin_operation, impersonation events, auth.logout, and theme_update to prevent notification spam.';