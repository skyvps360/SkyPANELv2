# SkyPANELv2 – Project Rules (Workspace)

These rules codify how to contribute and operate within this workspace so changes remain consistent, secure, and easy to maintain.

## Core Principles

- Favor simple, targeted fixes that address root causes.
- Preserve existing architecture and naming; avoid gratuitous refactors.
- Keep secrets out of source control; use environment variables.
- Write tests for nontrivial logic and any new step/navigation rules.

## Tech & Tooling Baselines

- Runtime: `Node.js 20+`, TypeScript everywhere (`type: module`).
- Frontend: React 18, Vite, Tailwind, TanStack Query, Zustand.
- Backend: Express, PostgreSQL, Redis (optional), Bull, Nodemailer.
- Commands:
  - Dev-up: `npm run dev-up` (Always Preferred: kill ports 3001, 5173 + Start frontend + backend concurrently).
  - Dev: `npm run dev` (Start frontend + backend concurrently).
  - Lint: `npm run lint`.
  - Type-check: `npm run check`.
  - Build: `npm run build`.
  - Preview: `npm run preview`.
  - Tests: `npm run test` or `npm run test:watch`.
  - DB lifecycle: `npm run db:fresh`, `npm run db:reset`, `node scripts/run-migration.js`, `node scripts/apply-single-migration.js migrations/<migration-file.sql>`.

## Backend Rules

- Routing & Middleware
  - Use `authenticateToken` for protected routes.
  - Admin routes must also use `requireAdmin`, `adminSecurityHeaders`, and `requestSizeLimit(500)`.
  - Apply rate limiting globally for `/api/`: `addRateLimitHeaders` and `smartRateLimit`.
  - Respect `config.rateLimiting.trustProxy` for accurate IP detection.

- Database Access
  - Use `api/lib/database.ts` (`query`, `transaction`) only; never create ad‑hoc `pg` pools.
  - Always parameterize SQL; no string interpolation.
  - Migrations live in `migrations/` and are forward‑only. Add a new file; never edit historical migrations.

- Activity & Audit
  - Log significant, user‑visible, or admin actions via `logActivity` (in `api/services/activityLogger.ts`).
  - Prefer structured metadata for audit fields; avoid logging tokens or secrets.

- Error Handling & Validation
  - Validate inputs with `express-validator` and return helpful 400 responses.
  - Normalize provider errors using standardized `ProviderError` shape (see `api/services/providers/IProviderService.ts`).
  - Server errors return `{ error: string }` without leaking sensitive details.

- Security
  - Keep `helmet` CSP settings aligned with current UI needs (images/scripts/styles).
  - Do not log API tokens. Use `encryptSecret` and provider token helpers in `api/lib/crypto.ts` and `api/lib/providerTokens.ts`.
  - Rate limiting metrics are enabled; do not remove `initializeMetricsCollection()` or `startMetricsPersistence()`.

## Provider Integration Rules

- Use the provider service layer (`api/services/providerService.ts`) and interface contracts in `api/services/providers/IProviderService.ts`.
- Normalize instances/plans/images/regions through provider implementations (Linode/DigitalOcean).
- VPS creation parameters should follow `CreateInstanceParams` and include provider‑specific fields when needed.
- Marketplace Apps (DigitalOcean):
  - Frontend must skip OS selection when a DO marketplace app is chosen.
  - Backend should accept `appSlug` and `appData`; when provided, rely on the app’s image and avoid separate OS selection requirements.
  - Enforce compatible image validation and required UDFs as per app metadata.

## Frontend Rules

- API access goes through `src/lib/api.ts` or service wrappers; never hardcode URLs.
- Centralize VPS workflow steps in `src/lib/vpsStepConfiguration.ts`; do not duplicate step logic inside pages.
- Use `zod` for form schemas/validation and shadcn UI components for consistency.
- Respect theming via `ThemeContext` and presets in `src/theme/presets.ts`; admin theme updates flow through `themeService` API.
- For long lists/tables, prefer TanStack Table and keep cells lightweight.

## SSH Keys Rules

- UI route `/ssh-keys` manages keys; show only the authenticated user’s keys.
- Adding keys must sync to both Linode and DigitalOcean accounts.
- Backend endpoints must accept `user_id` and enforce ownership filtering; return 403 when accessing another user’s keys.

## Rate Limiting & Metrics

- Keep `smartRateLimit` active on `/api/` routes.
- Validate and tune config via `api/routes/health.ts` endpoints; do not disable metrics aggregation.
- Persisted metrics table is managed by `rateLimitMetrics` service; do not alter schema outside migrations.

## Migrations & Data Changes

- Create a new incremented migration file for schema changes; include indexes.
- Test migrations with:
  - `node scripts/run-migration.js`
  - `node scripts/test-connection.js`
  - Optional helpers: `check-schema.js`, `scripts/check-platform-settings.js`.

## Testing Guidance

- Use Vitest (`vitest.config.ts`) with React Testing Library for UI.
- Add unit tests for step navigation logic (VPS modal), provider error normalization, and rate limiting behavior.
- Keep tests deterministic; avoid network calls, use stubs/mocks for provider clients.

## Build, Preview, and Deployment

- Local dev: `npm run dev`.
- Production preview: `npm run start` or `npm run pm2:start`.
- PM2 processes are defined in `ecosystem.config.cjs`; do not change names (`skypanelv2-api`, `skypanelv2-ui`).

## Environment & Secrets

- Copy `.env.example` → `.env`; generate `SSH_CRED_SECRET` with `node scripts/generate-ssh-secret.js`.
- Required keys: `DATABASE_URL`, `JWT_SECRET`, provider tokens (`LINODE_API_TOKEN`, optional `DIGITALOCEAN_API_TOKEN`), PayPal credentials, branding keys.
- Never commit `.env` or plain‑text provider tokens.
- The api keys for digitalocean and for linode are inputted in `/admin#providers`

## Style & Naming

- Components: PascalCase filenames; one component per file.
- Utility libs: camelCase functions; colocate domain helpers under `src/lib/`.
- Types live in `src/types/`; prefer explicit interfaces over `any`.
- Keep imports path‑based (`vite-tsconfig-paths`) and avoid deep relative chains.

## Pull Request Expectations

- Include scope, rationale, and risk notes.
- Reference scripts used for migrations or health checks.
- Provide screenshots for UI changes and list impacted routes.
- Ensure `npm run lint` and `npm run test` pass before review.

## AI Assistant Working Agreements (Trae)

- Announce planned actions briefly before making changes.
- Use project scripts and existing abstractions; avoid introducing new toolchains.
- For UI changes, run and review a local preview before completion.
- Prefer focused patches; do not mix unrelated fixes.
- When implementing multi‑step changes, track progress and validate with tests when available.
- Always do as requested and act like a professional developer.
- Use MCP Puppeteer for UI tests; do not use Playwright.
- Always use PostgreSQL MCP for database operations. Also always use postgreSQL for database migrations never use supabase.

---

Updates to these rules should be proposed via PR and aligned with the existing architecture and documentation in `README.md` and `repo-docs/`.

