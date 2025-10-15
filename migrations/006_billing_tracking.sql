-- Billing Tracking Schema
-- Tracks VPS billing cycles to prevent double-charging and ensure accurate billing

CREATE TABLE IF NOT EXISTS vps_billing_cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vps_instance_id UUID NOT NULL REFERENCES vps_instances(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  billing_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  billing_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  hourly_rate DECIMAL(10,4) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'billed', 'failed', 'refunded')),
  payment_transaction_id UUID REFERENCES payment_transactions(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient billing queries
CREATE INDEX IF NOT EXISTS idx_vps_billing_cycles_vps_id ON vps_billing_cycles(vps_instance_id);
CREATE INDEX IF NOT EXISTS idx_vps_billing_cycles_org_id ON vps_billing_cycles(organization_id);
CREATE INDEX IF NOT EXISTS idx_vps_billing_cycles_period ON vps_billing_cycles(billing_period_start, billing_period_end);
CREATE INDEX IF NOT EXISTS idx_vps_billing_cycles_status ON vps_billing_cycles(status);
CREATE INDEX IF NOT EXISTS idx_vps_billing_cycles_created_at ON vps_billing_cycles(created_at);

-- Add trigger for updated_at
CREATE TRIGGER update_vps_billing_cycles_updated_at 
BEFORE UPDATE ON vps_billing_cycles 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add last_billed_at column to vps_instances for tracking
ALTER TABLE vps_instances 
ADD COLUMN IF NOT EXISTS last_billed_at TIMESTAMP WITH TIME ZONE;

-- Create index for last_billed_at
CREATE INDEX IF NOT EXISTS idx_vps_instances_last_billed_at ON vps_instances(last_billed_at);