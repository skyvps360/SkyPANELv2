# Technology Stack

## Frontend

- **React 18** with TypeScript
- **Vite** for development and building
- **Tailwind CSS** with CSS variables for theming
- **shadcn/ui** component library (Radix UI primitives)
- **React Router v7** for navigation
- **Zustand** for state management
- **React Query** for data fetching
- **Framer Motion** for animations
- **xterm.js** for terminal/SSH console

## Backend

- **Node.js 20+** with Express.js
- **TypeScript** (ESM modules)
- **PostgreSQL** with Row Level Security (RLS)
- **Redis** for caching and Bull queues
- **InfluxDB** for metrics storage (optional)

## Key Integrations

- **PayPal SDK** for payment processing
- **SMTP2GO** for email notifications
- **Linode/Akamai API** for VPS provisioning
- **DigitalOcean API** for VPS provisioning
- **Docker Engine** for container orchestration
- **WebSocket (ws)** for SSH bridge

## Build System

- **Vite 6** with React plugin and tsconfig paths
- **TypeScript 5.8** with strict mode disabled for flexibility
- **ESLint** with React hooks and refresh plugins
- **Vitest** for testing
- **Nodemon** for backend hot reload
- **PM2** for production process management

## Common Commands

### Development
```bash
npm run dev              # Start both frontend (5173) and backend (3001)
npm run client:dev       # Start frontend only
npm run server:dev       # Start backend only
npm run kill-ports       # Free ports 3001 and 5173
```

### Building & Testing
```bash
npm run build            # Build frontend for production
npm run check            # TypeScript type checking
npm run lint             # Run ESLint
npm run test             # Run tests once
npm run test:watch       # Run tests in watch mode
```

### Production
```bash
npm run pm2:start        # Build and start with PM2
npm run pm2:reload       # Reload PM2 processes
npm run pm2:stop         # Stop and delete PM2 processes
npm run pm2:list         # List PM2 processes
```

### Database & Setup
```bash
npm run seed:admin       # Create initial admin user
node scripts/apply-migration.js  # Apply database migrations
```

## Environment Configuration

- Environment variables in `.env` (copy from `.env.example`)
- White-label branding via `COMPANY-NAME` or `VITE_COMPANY_NAME`
- Vite exposes env vars with `VITE_` and `COMPANY-` prefixes
- Backend runs on port 3001, frontend on 5173
- API available at `http://localhost:3001/api`

## Path Aliases

- `@/*` maps to `./src/*` (configured in tsconfig.json and vite.config.ts)
- Use for imports: `import { Button } from '@/components/ui/button'`
