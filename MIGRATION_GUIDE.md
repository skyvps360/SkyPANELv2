# Database Migration Guide

## Running Migrations

To apply all database migrations and ensure your database is up to date:

### Prerequisites
- PostgreSQL database running and accessible
- `.env` file configured with `DATABASE_URL`

### Steps

1. **Ensure your `.env` file has the DATABASE_URL set:**
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/containerstacks
   ```

2. **Run the migration script:**
   ```bash
   node scripts/run-migration.js
   ```

## Important Tables

### platform_settings
This table is required for theme management and other platform-wide settings. It's created by the `010_theme_settings.sql` migration.

**If you encounter "platform_settings does not exist" errors:**
- Ensure all migrations have been run using the command above
- Check that the `010_theme_settings.sql` migration completed successfully

### Verifying Migrations

After running migrations, you can verify which tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected tables include:
- `activity_logs`
- `container_plans`
- `container_pricing_config`
- `networking_config`
- `organizations`
- `organization_members`
- `platform_settings` ← Required for theme management
- `service_providers`
- `support_tickets`
- `support_ticket_replies`
- `users`
- `vps_instances`
- `vps_plans`
- `vps_stackscript_configs`
- `wallets`

## Troubleshooting

### Error: "relation 'platform_settings' does not exist"
**Solution:** Run `node scripts/run-migration.js` to create missing tables.

### Error: "Cannot find package 'pg'"
**Solution:** Install dependencies with `npm install`

### Authentication Errors
**Solution:** Check that your DATABASE_URL credentials are correct and the database user has CREATE TABLE permissions.

## Manual Migration (if needed)

If the automated migration script fails, you can run migrations manually:

```bash
psql $DATABASE_URL -f migrations/010_theme_settings.sql
```

Or connect to your database and run the SQL directly:

```sql
-- From migrations/010_theme_settings.sql
CREATE TABLE IF NOT EXISTS platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trigger function
CREATE OR REPLACE FUNCTION update_platform_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_platform_settings_updated_at ON platform_settings;
CREATE TRIGGER update_platform_settings_updated_at
BEFORE UPDATE ON platform_settings
FOR EACH ROW
EXECUTE FUNCTION update_platform_settings_updated_at();

-- Insert default theme
INSERT INTO platform_settings (key, value)
VALUES ('theme', jsonb_build_object('presetId', 'teal'))
ON CONFLICT (key) DO NOTHING;
```
