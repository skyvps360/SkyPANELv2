-- Manage which Linode StackScripts appear in the VPS creation wizard
-- Stores admin-configured metadata so the UI can override labels or hide entries

CREATE TABLE IF NOT EXISTS vps_stackscript_configs (
  stackscript_id INTEGER PRIMARY KEY,
  label TEXT,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vps_stackscript_configs_enabled ON vps_stackscript_configs(is_enabled);
CREATE INDEX IF NOT EXISTS idx_vps_stackscript_configs_order ON vps_stackscript_configs(display_order);
