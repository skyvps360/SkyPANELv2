-- Add allowed_regions column to service_providers table

-- Add the allowed_regions column as a JSONB array
ALTER TABLE service_providers 
ADD COLUMN IF NOT EXISTS allowed_regions JSONB NOT NULL DEFAULT '[]';

-- Update existing providers with their allowed regions
-- Linode regions (based on common Linode regions)
UPDATE service_providers 
SET allowed_regions = '[
  "us-east", "us-west", "us-central", "us-southeast",
  "eu-west", "eu-central", "ap-south", "ap-southeast", 
  "ap-northeast", "ca-central"
]'::jsonb
WHERE type = 'linode' AND allowed_regions = '[]'::jsonb;

-- DigitalOcean regions (based on common DigitalOcean regions)
UPDATE service_providers 
SET allowed_regions = '[
  "nyc1", "nyc3", "ams3", "sfo3", "sgp1", "lon1", 
  "fra1", "tor1", "blr1", "syd1"
]'::jsonb
WHERE type = 'digitalocean' AND allowed_regions = '[]'::jsonb;

-- Create index for better query performance on allowed_regions
CREATE INDEX IF NOT EXISTS idx_service_providers_allowed_regions 
ON service_providers USING GIN (allowed_regions);