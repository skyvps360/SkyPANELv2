# Technology Stack

## Frontend
- **React 18** with TypeScript
- **Vite** for build tooling and development server
- **Tailwind CSS** for styling with custom design system
- **shadcn/ui** components with Radix UI primitives
- **React Router** for client-side routing
- **TanStack Query** for server state management
- **Zustand** for client state management
- **Framer Motion** for animations

## Backend
- **Node.js 20+** with Express.js
- **TypeScript** in ESM mode
- **PostgreSQL** for primary database
- **Redis** for caching and session management
- **Bull** for job queues
- **WebSockets** for SSH console bridge

## Key Libraries
- **JWT** for authentication
- **bcryptjs** for password hashing
- **nodemailer** with SMTP2GO for email
- **PayPal SDK** for payment processing
- **ssh2** for SSH connections
- **helmet** and **cors** for security
- **express-rate-limit** for API protection

## Development Tools
- **Vitest** for testing with jsdom
- **ESLint** with TypeScript rules
- **Nodemon** for development server
- **PM2** for production process management
- **Concurrently** for running multiple processes

## Common Commands

### Development
```bash
npm run dev              # Start both frontend and backend
npm run client:dev       # Start Vite dev server only
npm run server:dev       # Start Express server only
npm run kill-ports       # Free ports 3001 and 5173
```

### Building & Testing
```bash
npm run build           # TypeScript check + Vite build
npm run test            # Run Vitest tests once
npm run test:watch      # Run tests in watch mode
npm run lint            # Run ESLint
npm run check           # TypeScript type checking
```

### Database
```bash
node scripts/run-migration.js                    # Apply all pending migrations
node scripts/apply-single-migration.js <file>    # Apply specific migration
node scripts/reset-database.js --confirm         # Reset database
node scripts/db:fresh                           # Reset + migrate
```

### Production
```bash
npm run start           # Production server
npm run pm2:start       # Start with PM2
npm run pm2:reload      # Reload PM2 processes
npm run pm2:stop        # Stop PM2 processes
```

## Build Configuration
- **Vite** serves frontend on port 5173 with API proxy to port 3001
- **Express** API server runs on port 3001
- **TypeScript** strict mode disabled for faster development
- **Path aliases**: `@/*` maps to `src/*`
- **Environment variables**: `VITE_*` and `COMPANY-*` prefixes exposed to frontend