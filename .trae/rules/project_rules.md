# ContainerStacks Project Rules

Purpose: maintain consistent development, security, testing, and deployment practices across the repo.

## Stack Overview
- Frontend: React 18 + Vite + TypeScript, Tailwind CSS, shadcn UI.
- Backend: Node.js + Express + TypeScript.
- Data: PostgreSQL migrations under `migrations/`.
- Tooling: ESLint, Vitest, PM2, Vercel.

## Environments & Ports
- Frontend dev: `npm run client:dev` → `http://localhost:5173` (Vite with `--host`).
- Backend dev: `npm run server:dev` (Nodemon runs `tsx api/server.ts`), `PORT` defaults to `3001`.
- Full dev: `npm run dev` starts both; if ports conflict, run `npm run kill-ports`.
- Production: `npm run build` then `npm run start` (Node API + `vite preview --port 5173 --strictPort`).
- PM2: `npm run pm2:start`, `pm2:reload`, `pm2:stop`, `pm2:list` for managed processes.

## Configuration & Secrets
- Copy `.env.example` → `.env`; populate required values: `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL`, `LINODE_API_TOKEN`, `SMTP2GO_*`, `PAYPAL_*`, etc.
- Never commit secrets; `.env*` files are ignored by `.gitignore`.
- `api/config/index.ts` reads env at runtime; keep `CLIENT_URL` and `PORT` aligned.

## Code Organization
- Frontend (`src/`):
  - Components in `src/components/` and `src/components/ui/`; pages in `src/pages/`.
  - Shared logic in `src/hooks/`, `src/contexts/`, and `src/lib/`.
  - Theming in `src/theme/`.
- Backend (`api/`):
  - HTTP routes in `api/routes/`; middleware in `api/middleware/`.
  - Business logic in `api/services/`; shared utilities in `api/lib/`.
  - Server entry at `api/server.ts`; configuration in `api/config/`.
- Database: migrations in `migrations/*.sql`; operational scripts in `scripts/`.

## Coding Standards
- TypeScript everywhere; avoid `any`, prefer explicit types.
- React: PascalCase components; hooks live in `src/hooks` and use `useX` naming.
- UI: prefer shadcn UI components + Tailwind utility classes; keep custom CSS minimal.
- Imports: use path alias `@/*` per `tsconfig.json`.
- Keep functions small and focused; favor composition over large monoliths.

## API & Security
- Do not modify `openapi.json`; it mirrors the official Linode API and serves as vendor reference only.
- Validate inputs (`express-validator` on backend, `zod` on client when applicable).
- Apply security: `middleware/security.ts`, `middleware/auth.ts`, `middleware/rateLimiting.ts` as appropriate.
- Do not log secrets; use `services/activityLogger.ts` for audit-safe logging.
- Return consistent error shapes: `error`, `message`, optional `details`.
- When adding or editing API calls, always update the `/api-docs` page to reflect new or changed endpoints (see `src/pages/ApiDocs.tsx` and `docs/api/complete-api-reference.md`).

## Database & Migrations
- Add new migrations with next sequential number; never modify existing migrations.
- Apply all migrations: `node scripts/run-migration.js`; single migration: `node scripts/apply-single-migration.js`.
- Connectivity sanity: `node scripts/test-connection.js`.

## Testing & Quality
- Tests: `npm run test` (Vitest) or `npm run test:watch`.
- Static checks: `npm run lint` (ESLint) and `npm run check` (TypeScript).
- Add/extend tests for new features, services, and complex UI states.

## Admin Bootstrap
- Seed an initial admin: `npm run seed:admin` (or `node scripts/create-test-admin.js`).

## Commits, PRs, Releases
- Prefer Conventional Commits; keep messages clear and scoped.
- Small, focused PRs with context; include screenshots for UI and notes for API changes.
- Do not commit `.env`, DB dumps, or local-only artifacts.

## Performance & UX
- Use `@tanstack/react-query` for fetching/caching; avoid redundant requests.
- Memoize expensive components; virtualize long lists; maintain accessibility.
- Optimize images and payloads; avoid blocking the main thread.

## Deployment
- Frontend deploys to Vercel; API managed via PM2 (`ecosystem.config.cjs`).
- Verify `CLIENT_URL` and `PORT` across environments before release.

## Support & Troubleshooting
- Email checks: `node scripts/test-smtp.js`.
- Platform sanity: `node scripts/check-admin-users.js`, `node scripts/check-platform-settings.js`.

## Change Management
- Make changes minimal and consistent with existing style.
- Update `docs/` when public APIs or UX change.
- Keep this rules file up to date as practices evolve.