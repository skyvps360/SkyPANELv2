-- Migration: Create billing_daemon_status table
-- Description: Tracks the status and health of the standalone billing daemon
-- Requirements: 3.8, 4.5

CREATE TABLE IF NOT EXISTS billing_daemon_status (
  id SERIAL PRIMARY KEY,
  daemon_instance_id VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL, -- 'running', 'stopped', 'error'
  last_run_at TIMESTAMP WITH TIME ZONE,
  last_run_success BOOLEAN,
  instances_billed INTEGER DEFAULT 0,
  total_amount DECIMAL(10, 2) DEFAULT 0,
  total_hours DECIMAL(10, 2) DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  heartbeat_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for query performance
CREATE INDEX idx_billing_daemon_status_heartbeat 
  ON billing_daemon_status(heartbeat_at);

CREATE INDEX idx_billing_daemon_status_instance 
  ON billing_daemon_status(daemon_instance_id);

-- Add comment to table
COMMENT ON TABLE billing_daemon_status IS 'Tracks the status and health of the standalone billing daemon for coordination with built-in billing';

-- Add comments to key columns
COMMENT ON COLUMN billing_daemon_status.daemon_instance_id IS 'Unique identifier for daemon instance (hostname + PID)';
COMMENT ON COLUMN billing_daemon_status.status IS 'Current daemon status: running, stopped, or error';
COMMENT ON COLUMN billing_daemon_status.last_run_at IS 'Timestamp of last billing execution';
COMMENT ON COLUMN billing_daemon_status.last_run_success IS 'Whether last billing run completed successfully';
COMMENT ON COLUMN billing_daemon_status.instances_billed IS 'Number of VPS instances billed in last run';
COMMENT ON COLUMN billing_daemon_status.total_amount IS 'Total amount charged in last run';
COMMENT ON COLUMN billing_daemon_status.total_hours IS 'Total billable hours processed in last run';
COMMENT ON COLUMN billing_daemon_status.heartbeat_at IS 'Last heartbeat timestamp (updated every 60 seconds)';
COMMENT ON COLUMN billing_daemon_status.metadata IS 'Additional daemon information (OS, version, etc.)';
