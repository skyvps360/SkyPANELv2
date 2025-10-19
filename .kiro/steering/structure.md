# Project Structure

ContainerStacks follows a monorepo structure with frontend and backend code in a single repository.

## Root Directory Layout

```
├── src/                    # React frontend application
├── api/                    # Express backend application
├── migrations/             # Database schema migrations (ordered)
├── scripts/                # Node.js utility scripts
├── docs/                   # Project documentation
├── public/                 # Static assets
├── stackscripts/           # Linode deployment scripts
└── dist/                   # Build output
```

## Frontend Structure (`src/`)

```
src/
├── components/             # Reusable UI components
│   ├── ui/                # shadcn/ui base components
│   └── ...                # Custom components
├── pages/                 # Route components
├── contexts/              # React contexts (Auth, Theme)
├── hooks/                 # Custom React hooks
├── services/              # API client functions
├── lib/                   # Utility functions and API helpers
├── types/                 # TypeScript type definitions
├── assets/                # Images, icons, etc.
├── theme/                 # Theme configuration
├── App.tsx                # Main app component with routing
├── main.tsx               # React entry point
└── index.css              # Global styles and Tailwind imports
```

## Backend Structure (`api/`)

```
api/
├── config/                # Configuration and validation
├── lib/                   # Database helpers and utilities
├── middleware/            # Express middleware functions
├── routes/                # API route handlers by domain
├── services/              # Business logic and external integrations
├── app.ts                 # Express app configuration
├── server.ts              # Server entry point
└── index.ts               # Vercel deployment entry
```

## Key Conventions

### File Naming
- **React components**: PascalCase (`UserProfile.tsx`)
- **Pages**: PascalCase (`Dashboard.tsx`)
- **Hooks**: camelCase with `use` prefix (`useAuth.ts`)
- **Services**: camelCase (`authService.ts`)
- **API routes**: lowercase (`auth.js`, `containers.js`)
- **Types**: PascalCase interfaces (`User`, `Container`)

### Import Paths
- Use `@/` alias for `src/` directory imports
- Relative imports for API modules
- Group imports: external libraries, internal modules, relative imports

### Route Organization
- **Frontend routes**: Defined in `App.tsx` with route guards
- **API routes**: Grouped by domain in `api/routes/`
- **Protected routes**: Use `ProtectedRoute` or `AdminRoute` wrappers
- **API endpoints**: Follow `/api/{domain}` pattern

### Component Structure
- **Pages**: Top-level route components in `src/pages/`
- **Components**: Reusable UI in `src/components/`
- **Layouts**: Shared layouts like `AppLayout`
- **UI primitives**: shadcn/ui components in `src/components/ui/`

### State Management
- **Global auth**: `AuthContext` with JWT handling
- **Theme**: `ThemeContext` for dark/light mode
- **Local state**: React hooks (`useState`, `useEffect`)
- **Server state**: React Query for API data

### Database Migrations
- **Naming**: `{number}_{description}.sql` (e.g., `001_initial_schema.sql`)
- **Order**: Sequential numbering for proper application
- **Scripts**: Use `scripts/run-migration.js` to apply all migrations

### Configuration
- **Environment**: `.env` file with validation in `api/config/`
- **TypeScript**: Shared `tsconfig.json` with path mapping
- **Vite**: Custom env prefix for white-label branding
- **Tailwind**: Extended theme with CSS variables

### Security Patterns
- **Authentication**: JWT tokens with `authenticateToken` middleware
- **Authorization**: Role-based guards (`requireAdmin`, `requireOrganization`)
- **CORS**: Configured origins in `api/app.ts`
- **Rate limiting**: Applied to all `/api/` routes
- **Input validation**: Express-validator for API endpoints