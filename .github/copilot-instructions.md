# SkyPanelV2 Copilot Instructions
## Architecture & Entry Points
- Backend starts in `api/server.ts`; it wraps the Express app from `api/app.ts`, then wires `initSSHBridge` and kicks off the hourly `BillingService` scheduler—preserve those hooks whenever you touch server startup.
- `api/app.ts` loads `dotenv` before anything else, validates config, boots the notification service, then mounts middleware (helmet, smart rate limiting, CORS) ahead of every `/api` route; new routers must be registered after those middleware calls.
- Frontend bootstraps through `src/main.tsx` and `src/App.tsx`, where React Router, Auth/Theme/Impersonation providers, and the shared `QueryClient` live; wrap new protected pages with the existing `ProtectedRoute` helpers.
- Real-time updates flow via the SSE endpoint in `api/routes/notifications.ts`, which authenticates using a `token` query param and relays events emitted by `notificationService`.
## Backend Conventions
- TypeScript files compile at runtime through `tsx`; keep ESM import paths with explicit `.js` extensions (e.g., `./services/foo.js`) or imports will break.
- Read runtime configuration via the `config` proxy (`api/config/index.ts`) instead of `process.env` so hot reloads pick up new values and validation stays centralized.
- Reuse the Postgres helpers in `api/lib/database.ts` (`query`, `transaction`) and the provider abstraction in `api/services/providerService.ts`; provider-specific work should go through `ProviderFactory` so caching and error normalization stay consistent.
- Authenticated routes should use `authenticateToken` from `api/middleware/auth.js`, and anything customer-facing should add rate-limit headers via the existing middleware stack.
## Frontend Patterns
- Networking goes through `src/lib/api.ts`; it centralizes `API_BASE_URL`, auth headers, and PayPal helpers—extend it rather than hand-rolling `fetch` logic.
- Global auth state lives in `src/contexts/AuthContext.tsx` with JWT storage in `localStorage`; impersonation UX is layered via `ImpersonationContext` and the banner components in `src/components/admin`.
- Styling combines Tailwind with shadcn-derived components in `src/components/ui`; honor the `@/*` path alias defined in `tsconfig.json` when adding imports.
- Data fetching leans on TanStack Query (default staleTime 30s) with optimistic refetch on window focus; prefer hooks that use `useQuery`/`useMutation` patterns for new API calls.
## Database & Migrations
- SQL migrations live in `migrations/*.sql` and run in filename order; use `node scripts/run-migration.js` or `npm run db:fresh` (reset + migrate) during development.
- Database scripts in `scripts/` accept flags like `--confirm`; consult `scripts/README.md` for reset, admin seeding, billing tests, and SMTP checks before inventing new tooling.
- Encryption-sensitive fields (provider tokens, SSH keys) rely on `SSH_CRED_SECRET`; ensure test data includes a 32+ character secret or decryption will fail.
## Development Workflow
- `npm run dev` launches Vite (`client:dev`) and the API (`server:dev`) concurrently; stop stray listeners with `npm run kill-ports` if ports 3001/5173 are stuck.
- CI-style checks are `npm run build` (tsc project build + Vite), `npm run lint`, and `npm run test` (Vitest). Run these locally before large refactors.
- For backend-only work you can iterate with `npm run server:dev`; for frontend-only changes use `npm run client:dev` and mocked API responses or local server.
- When debugging rate limits or notifications, tail the console logs—`smartRateLimit` prints warnings and SSE routes log connection/auth issues at runtime.
## Security & Compliance
- All new API endpoints must surface consistent error shapes (`{ success: false, error }`) like the global error handler in `api/app.ts` expects.
- Preserve helmet’s CSP config; if you must relax it, update both backend middleware and any corresponding Vite dev settings.
- SSE and websocket helpers trust `config.rateLimiting.trustProxy`; keep that in sync with deployment proxies or IP-based features (rate limiting, geo) will misbehave.
- Provider integrations live under `api/services/providers/`; follow the documented factory/interface pattern (`README.md` in that folder) when adding capabilities so DigitalOcean and Linode stay parity.
