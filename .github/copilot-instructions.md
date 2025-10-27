# ContainerStacks AI Guide

## System Overview
- Single repo hosts React 18 + Vite frontend (`src/`) and Express API (`api/`); `package.json` is ESM so imports use `import` syntax and often reference sibling modules via `.js` extensions.
- Environment values load via `dotenv` inside `api/app.ts`; `api/config/index.ts` proxies per-access reads and extends rate-limit + trust-proxy settings, while the frontend reads `VITE_*` or `COMPANY-*` prefixes (see `vite.config.ts`).
- PostgreSQL backs all state; apply SQL in `migrations/` using the helper scripts and note some tables are optional so services guard with `try/catch`.
- Core capabilities span Linode provisioning, PayPal wallet billing, hourly cost reconciliation, activity notifications, and admin impersonation.

## Backend
- `api/server.ts` boots Express from `api/app.ts`, attaches the SSH WebSocket bridge (`services/sshBridge.ts`), and schedules hourly billing via `BillingService.runHourlyBilling()`.
- Routes under `api/routes` handle validation/auth then defer to service modules (e.g. `routes/vps.ts` delegates to `services/linodeService.ts`); follow this separation when adding features.
- Database access should go through `query`/`transaction` in `api/lib/database.ts`; wrap multi-step mutations in `transaction` so audit + wallet tables stay in sync.
- Use `logActivity` from `api/services/activityLogger.ts` for user-visible events; it auto-ensures `activity_logs`, triggers the Postgres `notify_new_activity` function, and feeds the SSE layer.
- Real-time notifications listen via `notificationService` (LISTEN/NOTIFY) and surface through `api/routes/notifications.ts`; ensure migrations `008_notifications.sql` and `009_fix_notification_filtering.sql` run whenever schema changes.
- Rate limiting is centralized in `api/middleware/rateLimiting.ts`; endpoints mounted outside `/api` should still reuse `smartRateLimit` or `createCustomRateLimiter` to keep metrics consistent.
- Always read config through the exported `config` proxy to honor dynamic env overrides (avoid destructuring at module scope).

## Frontend
- Routing lives in `src/App.tsx`; `ProtectedRoute`/`AdminRoute` wrap pages with `AppLayout`, React Query, and impersonation banners by default.
- Auth + impersonation state come from `contexts/AuthContext.tsx` and `contexts/ImpersonationContext.tsx`; they persist JWTs in `localStorage`, decode tokens client-side, and redirect on role changes.
- Use `buildApiUrl` from `src/lib/api.ts` (or the service helpers in `src/services/`) so API requests respect `VITE_API_URL` and the dev proxy.
- Stick to the shadcn-style components in `src/components/ui` and Tailwind utilities; UI-first atoms (e.g. `Button`, `Badge`) already encode theming + dark mode.
- `components/NotificationDropdown.tsx` consumes the SSE stream at `/api/notifications/stream`; update unread counts through the provided REST endpoints instead of mutating local state manually.
- React Query defaults to a 30s `staleTime` and refetch-on-focus; keep new queries idempotent and return JSON since hooks rely on standard fetch semantics.

## Workflows & Tooling
- Run `node scripts/run-migration.js` (or `node scripts/apply-single-migration.js migrations/NNN_name.sql`) after editing SQL; scripts sort filenames and skip already-applied statements.
- Start local dev with `npm run dev` (concurrently Vite + Nodemon); if ports 3001/5173 stick, execute `npm run kill-ports` first.
- Nodemon executes `tsx api/server.ts`; keep new backend entrypoints compatible with tsx/ESM and mirror the existing `.js` import suffix convention.
- Run tests via `npm run test`; backend integration specs (e.g. `api/middleware/__tests__/rateLimiting.integration.test.ts`) use Vitest + Supertest, so lean on Vitest for new coverage.
- Production builds call `npm run build` (`tsc -b` + `vite build`); PM2 recipes live in `ecosystem.config.cjs` for multi-process preview environments.

## Conventions & Tips
- For new API routes, compose `authenticateToken`, `requireOrganization`, and service calls, and guard optional tables with the existing `try/catch` fallbacks to keep partially-migrated databases usable.
- Encrypt or decrypt sensitive provider secrets with helpers in `api/lib/crypto.ts`; see the VPS routes for how passwords are stored and retrieved.
- Call `logActivity` with `suppressNotification: true` for silent audit entries; omit it to push events into the SSE stream users see.
- The SSH console expects a JWT token in the query string (`/api/vps/:id/ssh?token=...`); reuse the existing bridge instead of adding new WebSocket servers.
- Migration filenames include duplicates (e.g. `005_activity_logs.sql` and `005_update_vps_plans_schema.sql`); reference them by full filename when scripting to avoid ambiguity.
- Always fetch config/env dynamically (e.g. read `config.LINODE_API_TOKEN` inside functions) so hot reloads and tests that monkey-patch env vars behave correctly.
- Set `COMPANY_BRAND_NAME` in `.env` (falls back to `COMPANY_NAME`) to brand PayPal orders and other server-side messaging without touching source.
