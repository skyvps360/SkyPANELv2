# Backend Guide

The API under `api/` is a TypeScript Express app that exposes authentication, billing, support, container, and VPS management endpoints. This guide documents the moving pieces so future changes remain consistent and safe.

## Server Entry Points

- `api/server.ts` boots the HTTP server, spins up the WebSocket SSH bridge (`initSSHBridge`), and starts the hourly billing scheduler (`BillingService.runHourlyBilling`).
- `api/app.ts` wires middleware and routers. Key middleware includes Helmet (CSP), express-rate-limit, CORS, JSON body parsing, and a request logger.
- Health checks: `GET /api/health` returns `{ success: true }` for readiness probes.

## Configuration & Environment

- Configuration is centralised in `api/config/index.ts`. Values are read lazily through a Proxy so reloads pick up `.env` edits without restarting nodemon.
- Critical variables: `DATABASE_URL`, `JWT_SECRET`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE`, `LINODE_API_TOKEN`, `SSH_CRED_SECRET`, optional `SMTP2GO_API_KEY`.
- `validateConfig()` enforces `DATABASE_URL` and, in production, a non-default JWT secret.

## Middleware

- `authenticateToken` verifies bearer JWTs, loads the user from PostgreSQL, and attaches `req.user` with `organizationId` if available.
- `requireOrganization` rejects requests when no organization is associated with the authenticated user.
- `requireAdmin` wraps `requireRole(['admin'])` for privileged endpoints.
- Security warnings (missing tables, etc.) are logged but not fatal to preserve developer ergonomics when migrations lag behind.

## Routing Modules

All routers live under `api/routes/` and are mounted in `app.ts`.

- `auth.ts`: registration, login, logout, profile updates, organization changes, password change, preference updates, API key lifecycle, and debug helpers. Integrates with `AuthService` and `logActivity`.
- `payments.ts`: wallet top-ups, PayPal capture, wallet deductions, transaction history, and refunds. Uses `PayPalService` and enforces organization membership.
- `admin.ts`: support ticket triage, VPS plan/provider CRUD, container pricing, networking config, StackScript configuration, schema diagnostics, and Linode catalog passthroughs. Guarded by `requireAdmin`.
- `containers.ts`: organization-scoped container listing (future CRUD can build on this pattern).
- `vps.ts`: comprehensive Linode orchestration—listing instances, fetching deep metrics, provisioning, lifecycle actions (boot/shutdown/reboot/delete), backup scheduling, firewall management, rDNS, hostname updates. Applies extensive validation and activity logging.
- `support.ts`: organization ticket submission and reply threads.
- `activity.ts`: fetches recent activity, filtered listings, summaries, and CSV exports. Ensures the `activity_logs` table exists before querying.

For path-level details consult [API Reference](api-endpoints.md).

## Services & Utilities

- **AuthService**: Handles user registration, login, password changes, token refresh, and organization bootstrap (including optional wallets and members).
- **PayPalService**: Wraps `@paypal/paypal-server-sdk` to create/capture orders, manage wallet balances via `payment_transactions`, and orchestrate refunds/payouts.
- **BillingService**: Performs hourly billing for active VPS instances, writes `vps_billing_cycles`, and deducts wallet funds through `PayPalService`. Also provides summaries and history endpoints.
- **linodeService**: A large gateway around the Linode REST API covering instance lifecycle, marketplace apps, StackScripts, metrics, firewalls, networking, and rDNS helpers.
- **activityLogger**: Provides `logActivity` and guarantees the `activity_logs` table exists. Most sensitive routes call this service.
- **sshBridge**: Adds a WebSocket server that authenticates with JWT, checks instance ownership, decrypts stored root passwords, and proxies SSH traffic via `ssh2`.
- **database.ts**: Exposes a pooled `pg` client, simple `query` helper, and a `transaction` wrapper to ensure consistent commits/rollbacks.
- **crypto.ts**: AES-256-GCM encryption for secrets stored in `configuration.auth.password_enc` (used by SSH terminal bridge).

## Background Tasks & Schedulers

- Hourly scheduler launched in `server.ts` executes `BillingService.runHourlyBilling()`, with an initial run five seconds after boot to catch up on missed periods.
- `setImmediate` hooks in `vps.ts` schedule post-provisioning tasks (custom rDNS configuration). Failures are logged but do not abort the main request.

## Error Handling & Logging

- Every route logs to the console when something unexpected occurs. Fatal errors bubble up to the global error handler in `app.ts` returning `500` with a safe payload.
- Activity logging provides an audit trail for user-sensitive actions (API keys, billing, VPS lifecycle, backups, firewalls, rDNS adjustments).

## Extending the Backend

- Add new routers under `api/routes/` and mount them in `app.ts` using the `/api/<area>` convention.
- Reuse `authenticateToken`, `requireOrganization`, and `requireAdmin` for access control.
- Prefer adding logic to services under `api/services/` so controllers remain thin and testable.
- Update migrations when persistent state changes; run `node scripts/run-migration.js` to apply new SQL locally.
