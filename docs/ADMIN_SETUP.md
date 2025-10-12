# Admin and Database Setup

This guide ensures the admin pages work without database errors and that all required tables exist in Supabase.

## Prerequisites

- Supabase project created and reachable
- Environment variables configured in `.env` and `.env.local` as per `.env.example`
- Service Role key set in server environment (`SUPABASE_SERVICE_ROLE_KEY`)

## Apply Migrations

Run the migrations found in the repository to create the missing tables:

- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_payment_tables.sql`
- `supabase/migrations/003_seed_admin_user.sql` (optional for local testing)
- `supabase/migrations/004_container_pricing.sql` (creates `container_pricing_config` and `container_plans`)

### Using Supabase SQL Editor (recommended)

1. Open Supabase Dashboard → SQL.
2. Paste the content of each file in order and execute.
3. Confirm tables exist in the Table Editor.

### Using Supabase CLI

If you prefer CLI, run:

```
supabase db push
```

Ensure the CLI is linked to your project and `supabase/config.toml` is properly configured.

## Verify Schema

Start the API server and call the schema check endpoint:

- `GET /api/admin/schema/check` (requires admin auth)

Expected response:

```
{
  "schema": {
    "container_pricing_config": { "exists": true },
    "container_plans": { "exists": true }
  }
}
```

If `exists: false`, re-apply `004_container_pricing.sql`.

## Troubleshooting

- Error: "Could not find the table 'public.container_pricing_config' in the schema cache"
  - Cause: Tables missing. Apply `004_container_pricing.sql`.
  - After applying, restart the API server.

- Error persists after migration
  - Check that migrations executed against the correct Supabase project.
  - Verify `SUPABASE_URL` and keys match the project.
  - Clear cached connections by restarting your dev server.

## Security and Validation

- Admin endpoints require `authenticateToken` and `requireAdmin`.
- All pricing and plan mutations validate payloads server-side.
- Missing-table cases return safe responses without leaking internals.