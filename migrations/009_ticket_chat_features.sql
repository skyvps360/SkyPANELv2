-- Migration 009: Support Ticket Chat Features
-- Add real-time messaging capabilities and closure restrictions

-- Add has_staff_reply column to support_tickets
ALTER TABLE support_tickets 
ADD COLUMN IF NOT EXISTS has_staff_reply BOOLEAN DEFAULT FALSE;

-- Update existing tickets that have staff replies
UPDATE support_tickets st
SET has_staff_reply = TRUE
WHERE EXISTS (
    SELECT 1 FROM support_ticket_replies str
    WHERE str.ticket_id = st.id AND str.is_staff_reply = TRUE
);

-- Create function to notify on new ticket message
CREATE OR REPLACE FUNCTION notify_new_ticket_message()
RETURNS TRIGGER AS $$
DECLARE
    ticket_org_id UUID;
    payload JSON;
BEGIN
    -- Get the organization_id from the ticket
    SELECT organization_id INTO ticket_org_id
    FROM support_tickets
    WHERE id = NEW.ticket_id;

    -- Build notification payload
    payload := json_build_object(
        'type', 'ticket_message',
        'ticket_id', NEW.ticket_id,
        'message_id', NEW.id,
        'organization_id', ticket_org_id,
        'is_staff_reply', NEW.is_staff_reply,
        'message', NEW.message,
        'created_at', NEW.created_at
    );

    -- Notify on ticket-specific channel
    PERFORM pg_notify('ticket_' || NEW.ticket_id::text, payload::text);
    
    -- Also notify on organization channel
    PERFORM pg_notify('org_tickets_' || ticket_org_id::text, payload::text);
    
    -- If it's a staff reply, update has_staff_reply flag
    IF NEW.is_staff_reply = TRUE THEN
        UPDATE support_tickets 
        SET has_staff_reply = TRUE 
        WHERE id = NEW.ticket_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new ticket messages
DROP TRIGGER IF EXISTS trigger_notify_ticket_message ON support_ticket_replies;
CREATE TRIGGER trigger_notify_ticket_message
    AFTER INSERT ON support_ticket_replies
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_ticket_message();

-- Create function to notify on ticket status change
CREATE OR REPLACE FUNCTION notify_ticket_status_change()
RETURNS TRIGGER AS $$
DECLARE
    payload JSON;
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        payload := json_build_object(
            'type', 'ticket_status_change',
            'ticket_id', NEW.id,
            'organization_id', NEW.organization_id,
            'old_status', OLD.status,
            'new_status', NEW.status,
            'updated_at', NEW.updated_at
        );

        -- Notify on ticket-specific channel
        PERFORM pg_notify('ticket_' || NEW.id::text, payload::text);
        
        -- Also notify on organization channel
        PERFORM pg_notify('org_tickets_' || NEW.organization_id::text, payload::text);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for ticket status changes
DROP TRIGGER IF EXISTS trigger_notify_ticket_status ON support_tickets;
CREATE TRIGGER trigger_notify_ticket_status
    AFTER UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION notify_ticket_status_change();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_support_ticket_replies_ticket_id ON support_ticket_replies(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_replies_created_at ON support_ticket_replies(created_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_has_staff_reply ON support_tickets(has_staff_reply);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- Add comment explaining the has_staff_reply column
COMMENT ON COLUMN support_tickets.has_staff_reply IS 'Indicates whether at least one staff member has replied to this ticket. Users can only close tickets after receiving a staff reply.';
