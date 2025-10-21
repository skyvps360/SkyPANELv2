# Project Structure

## Root Directory

```
containerstacks/
├── api/                    # Backend Express.js application
├── src/                    # Frontend React application
├── migrations/             # PostgreSQL database migrations
├── scripts/                # Utility scripts (seeding, migrations, testing)
├── docs/                   # Project documentation
├── public/                 # Static assets (favicon, etc.)
├── stackscripts/           # Linode StackScripts for VPS provisioning
├── .kiro/                  # Kiro IDE configuration and steering rules
├── .env                    # Environment variables (not in git)
├── .env.example            # Environment template
├── components.json         # shadcn/ui configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── vite.config.ts          # Vite build configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies and scripts
```

## Backend Structure (`api/`)

```
api/
├── config/                 # Configuration management and validation
├── lib/                    # Shared utilities (database, crypto, security)
├── middleware/             # Express middleware (auth, rate limiting, security)
├── routes/                 # API route handlers (auth, vps, payments, etc.)
├── services/               # Business logic (billing, email, Linode, PayPal)
├── app.ts                  # Express app setup and middleware configuration
├── server.ts               # Server entry point with billing scheduler
└── index.ts                # Vercel serverless entry point
```

### Backend Conventions

- **Routes**: RESTful endpoints under `/api/*` (e.g., `/api/vps`, `/api/auth`)
- **Services**: Business logic separated from route handlers
- **Middleware**: Authentication via JWT, rate limiting with Redis, security headers
- **Database**: PostgreSQL with `pg` driver, connection pooling, RLS policies
- **Error Handling**: Centralized error middleware in `app.ts`

## Frontend Structure (`src/`)

```
src/
├── components/             # React components
│   ├── ui/                # shadcn/ui components (Button, Dialog, etc.)
│   ├── admin/             # Admin-specific components
│   ├── VPS/               # VPS management components
│   ├── data-table/        # Reusable table components
│   └── *.tsx              # Layout and navigation components
├── pages/                  # Route pages (Dashboard, VPS, Billing, etc.)
├── contexts/               # React contexts (Auth, Theme, Impersonation)
├── hooks/                  # Custom React hooks (mobile, theme, forms)
├── services/               # API client services (payment, etc.)
├── lib/                    # Utilities (api client, brand config, utils)
├── types/                  # TypeScript type definitions
├── theme/                  # Theme presets and configuration
├── App.tsx                 # Root component with routing
├── main.tsx                # React entry point
└── index.css               # Global styles and Tailwind imports
```

### Frontend Conventions

- **Components**: Functional components with hooks, organized by feature
- **Pages**: One file per route, located in `src/pages/`
- **Styling**: Tailwind CSS with CSS variables for theming
- **State**: Zustand for global state, React Query for server state
- **Routing**: React Router v7 with nested routes in `App.tsx`
- **API Calls**: Centralized in `src/lib/api.ts` with axios

## Database Migrations (`migrations/`)

- Sequential numbered SQL files (e.g., `001_initial_schema.sql`)
- Applied via scripts in `scripts/` directory
- Include schema changes, RLS policies, and indexes

## Scripts (`scripts/`)

- `seed-admin.js` - Create initial admin user
- `apply-migration.js` - Apply database migrations
- `test-hourly-billing.js` - Test billing logic
- `update-admin-password.js` - Reset admin password
- Other utility scripts for debugging and maintenance

## Configuration Files

- **components.json**: shadcn/ui configuration with path aliases
- **tailwind.config.js**: Tailwind with custom theme and animations
- **vite.config.ts**: Vite with React plugin, proxy to backend API
- **tsconfig.json**: TypeScript with path aliases (`@/*` → `./src/*`)
- **eslint.config.js**: ESLint with React and TypeScript rules
- **nodemon.json**: Backend hot reload configuration
- **ecosystem.config.cjs**: PM2 process management for production

## Key Patterns

### API Proxy
- Vite dev server proxies `/api/*` to `http://localhost:3001`
- WebSocket support for SSH console and notifications
- SSE (Server-Sent Events) for real-time notification streaming

### Authentication Flow
- JWT tokens stored in localStorage
- Auth context provides user state and methods
- Protected routes check authentication in `App.tsx`
- Middleware validates tokens on backend routes

### Multi-Tenancy
- Organizations with role-based access control
- Row Level Security (RLS) in PostgreSQL
- User roles: Service Provider Admin, Org Admin, Developer, Collaborator

### White-Label Branding
- `COMPANY-NAME` or `VITE_COMPANY_NAME` environment variable
- Brand configuration in `src/lib/brand.ts`
- Theme customization via `src/theme/presets.ts`
- Dynamic theme switching with `next-themes`
