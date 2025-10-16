-- Notifications Enhancement
-- Adds notification tracking to activity_logs and creates PostgreSQL trigger for real-time notifications

-- Add is_read and read_at columns to activity_logs
ALTER TABLE activity_logs 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Create index for unread notifications
CREATE INDEX IF NOT EXISTS idx_activity_logs_is_read ON activity_logs(user_id, is_read, created_at DESC);

-- Create a function to notify on new activity
CREATE OR REPLACE FUNCTION notify_new_activity() 
RETURNS TRIGGER AS $$
BEGIN
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
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to send notifications on new activity
DROP TRIGGER IF EXISTS activity_notify_trigger ON activity_logs;
CREATE TRIGGER activity_notify_trigger
  AFTER INSERT ON activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_activity();

-- Create a function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE activity_logs
  SET is_read = TRUE, read_at = NOW()
  WHERE id = notification_id AND user_id = user_id_param AND is_read = FALSE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Create a function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE activity_logs
  SET is_read = TRUE, read_at = NOW()
  WHERE user_id = user_id_param AND is_read = FALSE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;
