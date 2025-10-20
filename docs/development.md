# Development Workflow

This guide explains how to set up ContainerStacks locally, run both frontend and API, apply migrations, and keep code quality high.

## Prerequisites

- Node.js 20+
- npm 9+
- PostgreSQL 14+ (local or remote)
- A PayPal Sandbox account (for wallet testing)
- A Linode API token (for VPS provisioning features)

## Environment Configuration

1. Copy `.env.example` to `.env` and fill in required values. At minimum set:
   - `DATABASE_URL` — e.g. `postgresql://user:pass@localhost:5432/containerstacks`
   - `JWT_SECRET`
   - `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` (sandbox or live)
   - `PAYPAL_MODE` (`sandbox` during development)
   - `LINODE_API_TOKEN`
   - `SSH_CRED_SECRET` (32-byte random string for encrypting stored passwords)
2. Restart the dev server when changing environment variables that affect the backend.

### Rate Limiting Configuration

The application includes intelligent rate limiting with different limits for user types:

- **Development**: Set `TRUST_PROXY=true` to work correctly behind Vite's development proxy
- **Production**: Configure `TRUST_PROXY` based on your deployment (e.g., `1` for single reverse proxy)
- **Custom Limits**: Adjust rate limits via environment variables:
  - `RATE_LIMIT_ANONYMOUS_MAX` (default: 200 per 15 minutes)
  - `RATE_LIMIT_AUTHENTICATED_MAX` (default: 500 per 15 minutes)
  - `RATE_LIMIT_ADMIN_MAX` (default: 1000 per 15 minutes)

Rate limiting configuration is validated at startup and warnings are logged for invalid values.

## Install Dependencies

```bash
npm install
```

## Database Setup

- Run all migrations: `node scripts/run-migration.js`
- Apply a single migration: `node scripts/apply-single-migration.js <filename.sql>`
- Re-run the latest migration after editing: `node scripts/apply-migration.js`
- Clean a migration artifact: `node scripts/clean-migration.js`
- Verify networking config tables: `node scripts/verify-networking-config.js`

> Migrations create a default admin (`admin@containerstacks.com` / `admin123`). Update the password immediately via `scripts/update-admin-password.js` in shared environments.

## Start the App

- Frontend + API together: `npm run dev`
  - Runs Vite on port `5173`
  - Runs Express API on port `3001` via `nodemon` + `tsx`
- Kill stray ports if the previous run crashed: `npm run kill-ports`

### Standalone Processes

- Frontend only: `npm run client:dev`
- API only: `npm run server:dev`

## Code Quality

- Type-check: `npm run check`
- Lint: `npm run lint`
- Build (type-check + production bundle): `npm run build`

Lint is configured via `eslint.config.js` (ESLint flat config) and includes React hooks rules. No automated tests currently ship with the project; add them under `tests/` or alongside modules when extending functionality.

## Useful Scripts

| Script | Purpose |
| --- | --- |
| `scripts/run-migration.js` | Apply every SQL migration and verify resulting tables. |
| `scripts/apply-migration.js` | Reapply the most recent migration (handy after edits). |
| `scripts/apply-migration-simple.js` | Lightweight runner for a single SQL file. |
| `scripts/apply-stackscript-migration.js` | Synchronise stackscript config migrations. |
| `scripts/seed-admin.js` | Create/refresh the admin seed user. |
| `scripts/update-admin-password.js` | Rotate the admin password. |
| `scripts/test-connection.js` | Smoke-test `DATABASE_URL` connectivity. |
| `scripts/fix-schema.js` | Attempts to patch common schema drift issues. |
| `scripts/verify-networking-config.js` | Ensures networking config tables exist. |
| `scripts/debug-admin-login.js` | Diagnose login issues with the admin account. |

> Unless you are sure of the effects, run scripts against a non-production database. Always back up data before destructive schema operations.

## Frontend Tips

- API calls should go through `src/lib/api.ts` or `AuthContext` helpers to preserve auth headers.
- Tailwind utilities live in `src/index.css` and `tailwind.config.js`. Use `clsx` and `tailwind-merge` for conditional styling.
- Keep protected pages wrapped in `ProtectedRoute` or `AdminRoute` add-ins defined in `App.tsx`.

## Backend Tips

- When adding routes, import and mount them in `api/app.ts` under the `/api/<area>` prefix.
- Use the helpers in `api/lib/database.ts` (`query`, `transaction`) rather than creating ad-hoc pools.
- Reuse `logActivity` to capture significant user actions.
- Long-running or recurring tasks can hook into the scheduler pattern used by `BillingService` in `api/server.ts`.

## Debugging

- Express logs every incoming request with an ISO timestamp; watch the API console for quick feedback.
- For deep SQL debugging, enable verbose logging in PostgreSQL or wrap queries with additional console output locally.
- WebSocket SSH issues usually stem from invalid JWTs or missing `SSH_CRED_SECRET`; check console warnings emitted by `sshBridge`.

## Version Control

- Keep docs in `docs/` synchronized with significant architectural or API changes.
- Avoid rewriting migrations once they have been applied to a shared environment; add a new migration instead.

Follow this workflow to get a fully functional local environment and maintain parity with production deployments.
