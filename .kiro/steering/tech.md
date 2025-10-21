# Technology Stack

## Frontend

- **React 18** with TypeScript for type safety
- **Vite** for fast development and optimized production builds
- **React Router v7** for client-side routing
- **TanStack Query (React Query)** for server state management and data fetching
- **Zustand** for client-side state management
- **Tailwind CSS** with CSS variables for theming
- **shadcn/ui** component library (Radix UI primitives)
- **Framer Motion** for animations
- **Recharts** for data visualization
- **xterm.js** for terminal/SSH console

## Backend

- **Node.js 20+** with Express.js
- **TypeScript** with ES modules (`"type": "module"`)
- **PostgreSQL** database with Row Level Security (RLS)
- **Redis** for caching and Bull queue management
- **InfluxDB** for metrics storage (optional)

## Key Libraries & Integrations

- **Authentication**: JWT tokens with bcryptjs password hashing
- **Payment Processing**: PayPal Server SDK
- **Email**: Nodemailer with SMTP2GO
- **Cloud Providers**: Linode/Akamai API, DigitalOcean API
- **Container Management**: Dockerode, SSH2
- **Security**: Helmet, CORS, express-rate-limit, express-validator
- **Real-Time**: WebSockets (ws), Server-Sent Events for notifications

## Build System & Tools

- **TypeScript Compiler**: `tsc` for type checking and builds
- **Vite**: Frontend bundler with HMR
- **tsx**: TypeScript execution for backend (via `--import tsx`)
- **Nodemon**: Development hot reload for backend
- **Concurrently**: Run multiple dev servers simultaneously
- **PM2**: Production process management
- **Vitest**: Testing framework with jsdom
- **ESLint**: Code linting with TypeScript support

## Common Commands

### Development
```bash
npm run dev              # Start both frontend (5173) and backend (3001)
npm run client:dev       # Frontend only
npm run server:dev       # Backend only with hot reload
npm run kill-ports       # Free ports 3001 and 5173
```

### Production
```bash
npm run build            # Build frontend and compile TypeScript
npm run start            # Start production server
npm run pm2:start        # Start with PM2 process manager
npm run pm2:reload       # Zero-downtime reload
npm run pm2:stop         # Stop PM2 processes
```

### Database
```bash
node scripts/apply-migration.js              # Apply all migrations
node scripts/apply-single-migration.js <file> # Apply specific migration
npm run seed:admin                           # Create admin user
node scripts/test-connection.js              # Test database connection
```

### Testing & Quality
```bash
npm run test             # Run tests once
npm run test:watch       # Run tests in watch mode
npm run lint             # Run ESLint
npm run check            # TypeScript type checking
```

## Configuration

- **Environment Variables**: `.env` file (copy from `.env.example`)
- **TypeScript**: `tsconfig.json` with path aliases (`@/*` → `./src/*`)
- **Tailwind**: `tailwind.config.js` with custom theme and CSS variables
- **Vite**: `vite.config.ts` with proxy to backend API
- **shadcn/ui**: `components.json` for component configuration

## Architecture Notes

- Frontend uses path alias `@/` for imports (e.g., `@/components/ui/button`)
- Backend uses ES modules with `.js` extensions in imports
- API routes are prefixed with `/api/` and proxied in development
- Rate limiting with smart differentiation based on user authentication
- Trust proxy configuration for proper IP detection behind proxies
