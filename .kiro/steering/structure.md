---
inclusion: always
---

# Project Structure & Code Conventions

## Directory Layout

**Root**: `api/` (backend), `src/` (frontend), `migrations/` (SQL), `scripts/` (utilities)

**Backend** (`api/`):
- `app.ts` - Express configuration
- `server.ts` - Dev entry, `index.ts` - Production entry
- `config/` - Configuration, `lib/` - Database & utilities
- `middleware/` - Auth, rate limiting, `routes/` - API handlers
- `services/` - Business logic & external integrations

**Frontend** (`src/`):
- `App.tsx` - Routing, `main.tsx` - Entry point
- `components/` - UI components, `pages/` - Route components
- `contexts/` - React contexts, `hooks/` - Custom hooks
- `lib/` - Utilities & API client, `services/` - Service layer
- `types/` - TypeScript definitions, `theme/` - Theme config

## Code Conventions

**File Naming**:
- Components & Pages: PascalCase (`UserProfile.tsx`, `Dashboard.tsx`)
- Utilities & Services: camelCase (`apiClient.ts`, `authService.ts`)
- Types: camelCase with `.types.ts` suffix (`user.types.ts`)

**Import Rules**:
- Frontend: Use `@/` alias for `src/` imports (e.g., `import { api } from '@/lib/api'`)
- Backend: Use relative imports with `.js` extension for ESM (e.g., `import { db } from './lib/database.js'`)
- Group imports: external libraries first, then internal modules, then relative imports

**Component Patterns**:
- Functional components with hooks only (no class components)
- Default export for main component, named exports for utilities
- Co-locate related components in subdirectories with `index.ts` for clean imports

**API Conventions**:
- All routes prefixed with `/api/`
- RESTful patterns with consistent JSON response format: `{ success: boolean, data?: any, error?: string }`
- Group related routes in separate files under `api/routes/`
- Use middleware for auth, validation, and error handling

**Database Patterns**:
- Sequential numbered migrations (`001_`, `002_`, etc.)
- Always use transactions for multi-table operations
- Access database through `api/lib/database.ts` singleton
- Log all state changes to `activity_logs` table for audit trails

**Environment Variables**:
- Frontend: Prefix with `VITE_` or `COMPANY_` to expose to client
- Backend: No prefix required, accessed via `process.env`
- Validate required variables on application startup
- Use `.env` for local development, never commit secrets

**Testing**:
- Use Vitest for all tests (frontend and backend)
- Co-locate unit tests with source files
- Mock external services and provider APIs
- Run tests once with `npm run test`, avoid watch mode in CI