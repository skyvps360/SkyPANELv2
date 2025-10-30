-- Description: Create table for per-user rate limit overrides
-- Adds support for granting elevated API quotas to specific users

CREATE TABLE IF NOT EXISTS user_rate_limit_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    max_requests INTEGER NOT NULL CHECK (max_requests > 0),
    window_ms INTEGER NOT NULL CHECK (window_ms > 0),
    reason TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT user_rate_limit_overrides_unique_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_rate_limit_overrides_expires_at
    ON user_rate_limit_overrides (expires_at);

CREATE INDEX IF NOT EXISTS idx_user_rate_limit_overrides_created_by
    ON user_rate_limit_overrides (created_by);

-- Reuse global updated_at trigger for automatic timestamp maintenance
CREATE TRIGGER update_user_rate_limit_overrides_updated_at
BEFORE UPDATE ON user_rate_limit_overrides
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
