# Architecture Overview

ContainerStacks is split into a React + Vite single-page application and an Express + TypeScript API that share one repository. PostgreSQL stores system state, while selected external services (PayPal, Linode, SMTP2GO) power payments and infrastructure orchestration.

## System Components

- **Frontend (`src/`)**: React 18 with TypeScript, Tailwind, and React Router. Auth state lives in `AuthContext`, route protection is provided by `ProtectedRoute` and `AdminRoute`, and shared API helpers sit in `src/lib/api.ts`.
- **API (`api/`)**: Express application written in TypeScript (compiled at runtime via `tsx`). Routes are grouped by domain (auth, payments, admin, containers, vps, support, activity). Security hardening is handled through Helmet, CORS rules, and express-rate-limit.
- **Database (PostgreSQL)**: Accessed via `api/lib/database.ts` using a pooled connection. Schema migrations live under `migrations/` and cover users, organizations, wallets, containers, VPS instances, billing, networking, and activity logging.
- **Worker-like Services**: `BillingService` performs hourly VPS billing; `initSSHBridge` exposes a WebSocket bridge backed by `ssh2` to stream shell sessions from Linode instances. Both attach to the HTTP server created in `api/server.ts`.
- **External Integrations**:
  - **Linode** via `api/services/linodeService.ts` for provisioning, metrics, firewalls, backups, and StackScripts.
  - **PayPal** via `api/services/paypalService.ts` for wallet top-ups, payment capture, refunds, and ledger tracking.
  - **SMTP2GO** is accounted for in configuration (email delivery hooks), but currently unused until email flows are implemented.

## Request Lifecycle (Happy Path)

```text
Browser (React) → fetch('/api/...')
  → Vite proxy sends request to Express API (api/app.ts)
    → Security middleware (Helmet, rate limit, CORS, JSON body parser)
    → Route-level auth guards (authenticateToken, requireOrganization, requireAdmin)
    → Controller invokes domain service (AuthService, PayPalService, linodeService, etc.)
      → Database access via pg Pool helpers (query / transaction)
      → External API calls when needed
    ← JSON response returned to frontend
```

WebSocket SSH sessions reuse the same Express server and share JWT authentication before opening an SSH channel to the target VPS.

## Directory Map (Selected)

- `src/`: SPA source (pages, components, hooks, contexts, services, assets).
- `api/`: Express entry point (`server.ts` → `app.ts`), configuration, middleware, database helpers, routers, and services.
- `migrations/`: Ordered SQL files for schema evolution.
- `scripts/`: Node utilities to run migrations, manage StackScripts, inspect networking config, seed admins, and debug environment issues.
- `stackscripts/`: Shell scripts deployed to Linode during provisioning.
- `docs/`: This documentation set.

## Cross-Cutting Concerns

- **Configuration**: Centralised in `api/config/index.ts` with runtime validation; environment variables are read lazily through a proxy to keep hot-reloads functional.
- **Audit Trail**: `api/services/activityLogger.ts` inserts structured events into `activity_logs`. Most sensitive routes log relevant actions (login/logout, API key lifecycle, VPS operations, billing results).
- **Error Handling**: Global Express error handler returns safe messages (stack traces suppressed in production). Billing and provisioning services log warnings but avoid crashing the process.
- **Security**: JWT secrets, PayPal credentials, Linode API tokens, and SSH encryption keys are required for production. Helmets’ CSP limits script/style sources; rate limiting defaults to 100 requests per 15 minutes per IP.

Refer back to this document when evaluating architectural changes or new integrations to ensure new work aligns with existing layers.
