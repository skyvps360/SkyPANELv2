-- Add display_order column to service_providers table
ALTER TABLE service_providers
  ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Set initial display_order based on created_at (oldest first)
UPDATE service_providers
SET display_order = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
  FROM service_providers
) AS subquery
WHERE service_providers.id = subquery.id;

-- Make display_order NOT NULL after setting initial values
ALTER TABLE service_providers
  ALTER COLUMN display_order SET NOT NULL;

-- Add index for efficient ordering
CREATE INDEX IF NOT EXISTS idx_service_providers_display_order ON service_providers(display_order);
