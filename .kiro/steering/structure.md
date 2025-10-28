# Project Structure

## Root Layout

- `api/` - Express backend application
- `src/` - React frontend application
- `migrations/` - PostgreSQL schema migrations (versioned SQL files)
- `scripts/` - Node utilities for migrations, admin tasks, and diagnostics
- `public/` - Static assets served by Vite
- `dist/` - Build output (gitignored)
- `.kiro/` - Kiro AI assistant configuration and steering rules

## Backend Structure (`api/`)

```
api/
├── app.ts              # Express app configuration and middleware setup
├── server.ts           # Server entry point with SSH bridge and billing scheduler
├── index.ts            # Vercel serverless entry point
├── config/             # Configuration management with environment proxy
├── lib/                # Shared utilities (database, crypto, security, IP detection)
├── middleware/         # Auth, rate limiting, security middleware
├── routes/             # Express route handlers (modular by feature)
│   └── admin/          # Admin-specific routes
└── services/           # Business logic layer
```

### Backend Conventions

- **Database access**: Use `api/lib/database.ts` (`query`, `transaction`) for all DB operations
- **Activity logging**: Use `logActivity()` from `api/services/activityLogger.ts` for audit trails
- **Notifications**: Emit via `notificationService` which uses PostgreSQL LISTEN/NOTIFY
- **Rate limiting**: Apply via `smartRateLimit` or `createCustomRateLimiter` from middleware
- **Authentication**: JWT tokens validated via `authenticateToken` middleware
- **Service layer**: Business logic lives in `api/services/`, routes stay thin
- **ESM imports**: Always use `.js` extension in imports, even for `.ts` files

## Frontend Structure (`src/`)

```
src/
├── main.tsx            # React app entry point
├── App.tsx             # Root component with routing
├── index.css           # Global styles and Tailwind directives
├── components/         # React components
│   ├── ui/             # shadcn/ui primitives (Button, Dialog, etc.)
│   ├── admin/          # Admin-specific components
│   ├── billing/        # Billing-related components
│   ├── Dashboard/      # Dashboard widgets
│   ├── VPS/            # VPS management components
│   └── data-table/     # TanStack Table components
├── pages/              # Route page components
├── contexts/           # React contexts (Auth, Theme, Breadcrumb, Impersonation)
├── hooks/              # Custom React hooks (mobile, theme, form persistence)
├── lib/                # Utilities and helpers
│   ├── api.ts          # Axios instance with auth headers
│   ├── utils.ts        # cn() helper for className merging
│   └── brand.ts        # White-label branding utilities
├── services/           # Frontend API service wrappers
├── theme/              # Theme presets and configuration
└── types/              # TypeScript type definitions
```

### Frontend Conventions

- **Component imports**: Use `@/` alias for src imports (e.g., `@/components/ui/button`)
- **Styling**: Use `cn()` helper from `@/lib/utils` to merge Tailwind classes
- **API calls**: Use `src/lib/api.ts` axios instance or service wrappers for consistent auth
- **State management**: 
  - Server state: TanStack Query with `useQuery`, `useMutation`
  - Global state: Zustand stores
  - Context: React Context for auth, theme, breadcrumbs
- **Forms**: React Hook Form + Zod for validation
- **UI components**: Prefer shadcn/ui components from `@/components/ui/`
- **Routing**: React Router v7 with nested routes in `App.tsx`

## Database Migrations (`migrations/`)

- **Naming**: `###_description.sql` (e.g., `001_initial_schema.sql`)
- **Sequential**: Apply in order via `scripts/run-migration.js`
- **Idempotent**: Use `IF NOT EXISTS` and `ON CONFLICT` clauses
- **Triggers**: Include `updated_at` triggers for timestamp columns
- **Indexes**: Add indexes for foreign keys and frequently queried columns

## Scripts (`scripts/`)

Operational utilities for:
- Migration management (`run-migration.js`, `apply-single-migration.js`)
- Admin user management (`create-test-admin.js`, `promote-to-admin.js`)
- Testing (`test-connection.js`, `test-smtp.js`, `test-hourly-billing.js`)
- Diagnostics (`check-admin-users.js`, `check-platform-settings.js`)

## Configuration Files

- `tsconfig.json` - TypeScript config with path aliases (`@/*` → `./src/*`)
- `vite.config.ts` - Vite config with API proxy to port 3001
- `tailwind.config.js` - Tailwind with CSS variables and shadcn theme
- `components.json` - shadcn/ui configuration
- `eslint.config.js` - ESLint 9 flat config
- `.env` - Environment variables (never commit)
- `.env.example` - Template for required environment variables
