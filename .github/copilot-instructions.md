# ContainerStacks AI Coding Guide

## Architecture Snapshot
- React 18 + Vite frontend under `src/` talking to an Express + TypeScript API under `api/`
- ESM everywhere (`package.json` uses `"type": "module"`); keep `.js` extensions on TS imports and use `tsx`-friendly syntax
- DB access is raw SQL via `api/lib/database.ts` (pg Pool helpers); migrations live in `migrations/*.sql`
- Services in `api/services/` wrap external systems (PayPal, Linode, activity logs) and should be reused before adding new API calls

## Local Development
- `npm run kill-ports && npm run dev` starts Vite (5173) and the API (3001) via `concurrently`
- Backend restarts through `nodemon.json` (`tsx api/server.ts`); keep server entry-compatible with ESM
- Vite proxies `/api/*` to `http://localhost:3001` (`vite.config.ts`); new endpoints under `/api` work automatically
- Environment config comes from the real `.env` (not `.env.example`); critical vars: `DATABASE_URL`, `PORT=3001`, `VITE_API_URL`

## Database Workflow
- Run `node scripts/run-migration.js` after updating SQL in `migrations/` to apply/verify Postgres schema locally
- Avoid `scripts/seed-admin.js` unless you still target Supabase; prefer SQL migrations or Postgres-specific seeds
- API code expects tables like `organizations`, `wallets`, `activity_logs`; helpers often guard for missing tables, so add schema before relying on them

## Backend Conventions
- Register new routers in `api/app.ts`; follow existing pattern (`app.use('/api/<area>', <router>)`)
- Each router (e.g., `api/routes/vps.ts`) composes middleware: `authenticateToken`, `requireOrganization`, etc.—reuse for auth/role checks
- Use `logActivity` (`api/services/activityLogger.ts`) for audit trails on meaningful events
- External integrations read tokens at runtime via `config` proxy; confirm new env vars are validated in `api/config/index.ts`

## Frontend Patterns
- Routing defined in `src/App.tsx` with `ProtectedRoute`/`AdminRoute`; wrap new private pages to enforce auth
- `AuthContext` (`src/contexts/AuthContext.tsx`) persists `auth_token` in `localStorage`; mimic existing fetch usage for new auth flows
- Shared API calls go through `src/lib/api.ts`; extend the client instead of scattering `fetch`
- Styling relies on Tailwind (`src/index.css`, `tailwind.config.js`); components live under `src/components/**`

## Deployment & Verification
- `npm run build` runs `tsc -b` then `vite build`; ensure backend TS stays type-safe (`npm run check`) and linted (`npm run lint`)
- API health check is `/api/health`; use it when scripting probes or readiness checks
- Default ports: frontend `5173`, API `3001`; update docs/configs if you diverge

_Feel free to ping for clarification—flag any section that needs more depth or examples._