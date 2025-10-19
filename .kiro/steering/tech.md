# Technology Stack

ContainerStacks is built as a full-stack TypeScript application with React frontend and Express backend sharing a single repository.

## Frontend Stack

- **React 18** with TypeScript
- **Vite** for development and building (port 5173)
- **shadcn/ui** - Heavily used for all UI components (built on Radix UI primitives)
- **Tailwind CSS** for styling with custom theme
- **React Router** for navigation
- **Zustand** for state management
- **React Query** for data fetching and API state management
- **Framer Motion** for animations

## Backend Stack

- **Node.js 20+** with Express.js (API-heavy architecture)
- **TypeScript** compiled at runtime via `tsx`
- **PostgreSQL** with connection pooling for data persistence
- **Redis** for caching and Bull queues
- **JWT** for authentication and session management
- **WebSocket** for SSH terminal sessions to VPS instances

## Key Libraries

- **UI Components**: Radix UI primitives with shadcn/ui
- **Styling**: Tailwind CSS with `clsx` and `tailwind-merge`
- **Forms**: React Hook Form with validation
- **Charts**: Recharts for data visualization
- **Terminal**: xterm.js for SSH console
- **Security**: Helmet, CORS, rate limiting

## External Integrations

- **PayPal SDK** for payment processing and wallet management
- **Linode API** for VPS provisioning and management
- **DigitalOcean API** for additional VPS options
- **SMTP2GO** for email notifications and support tickets
- **Docker Engine** for optional container management features
- **Multiple Provider APIs** for dedicated server integration

## Development Commands

```bash
# Install dependencies
npm install

# Start both frontend and backend
npm run dev

# Start services individually
npm run client:dev  # Frontend only (port 5173)
npm run server:dev  # Backend only (port 3001)

# Kill conflicting ports
npm run kill-ports

# Code quality
npm run check      # TypeScript type checking
npm run lint       # ESLint
npm run build      # Production build

# Database
node scripts/run-migration.js           # Apply all migrations
node scripts/apply-single-migration.js  # Apply specific migration
node scripts/seed-admin.js             # Create admin user

# Production deployment
npm run pm2:start   # Start with PM2
npm run pm2:reload  # Reload PM2 processes
npm run pm2:stop    # Stop PM2 processes
```

## Build System

- **Vite** handles frontend bundling with React plugin and TypeScript paths
- **tsx** compiles and runs TypeScript backend code
- **Concurrently** manages parallel dev processes
- **PM2** for production process management
- **ESLint** with TypeScript and React rules
- **Tailwind** with custom theme and animations