---
inclusion: always
---

# Technology Stack

## Frontend

- **Framework**: React 18 with TypeScript
- **Build tool**: Vite 6
- **Routing**: React Router v7
- **State management**: Zustand for global state, TanStack Query v5 for server state
- **UI library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theme system
- **Forms**: React Hook Form with Zod validation
- **Animations**: Framer Motion
- **Notifications**: Sonner toasts, react-hot-toast

## Backend

- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js (ESM modules)
- **Database**: PostgreSQL 12+ with raw SQL queries
- **Caching**: Redis 6+ with ioredis client
- **Authentication**: JWT tokens with bcryptjs password hashing
- **Email**: Nodemailer with SMTP2GO
- **Job queue**: Bull with Redis backend
- **Security**: Helmet, CORS, express-rate-limit, custom rate limiting middleware
- **WebSockets**: ws library for SSH bridge, Server-Sent Events for notifications

## External Integrations

- **Payment**: PayPal REST SDK
- **Cloud providers**: Linode API v4, DigitalOcean API v2
- **SSH**: ssh2 library for terminal access
- **Monitoring**: Optional InfluxDB 2.x for metrics

## Development Tools

- **Type checking**: TypeScript 5.8
- **Linting**: ESLint 9 with typescript-eslint
- **Testing**: Vitest with React Testing Library and Supertest
- **Process management**: Nodemon for dev, PM2 for production
- **Concurrency**: concurrently for running dev servers

## Common Commands

### Development
```bash
npm run dev              # Start both frontend (Vite) and backend (Nodemon) concurrently
npm run client:dev       # Start Vite dev server only (port 5173)
npm run server:dev       # Start Express API only (port 3001)
npm run kill-ports       # Kill processes on ports 3001 and 5173
npm run dev-up           # Kill ports then start dev servers
```

### Building
```bash
npm run build            # TypeScript compile + Vite build
npm run check            # TypeScript type checking without emit
npm run lint             # Run ESLint
```

### Testing
```bash
npm run test             # Run Vitest once
npm run test:watch       # Run Vitest in watch mode
```

### Production
```bash
npm run start            # Start production servers (Express + Vite preview)
npm run pm2:start        # Build and start with PM2
npm run pm2:reload       # Reload PM2 processes
npm run pm2:stop         # Stop and delete PM2 processes
npm run pm2:list         # List PM2 processes
```

### Database
```bash
node scripts/run-migration.js                           # Apply all pending migrations
node scripts/apply-single-migration.js <file>           # Apply specific migration
node scripts/test-connection.js                         # Test database connectivity
npm run db:reset                                        # Reset database (with confirmation prompt)
npm run db:reset:confirm                                # Reset database (auto-confirm, no prompt)
npm run db:fresh                                        # Reset database and run all migrations
```

### Admin Utilities
```bash
node scripts/create-test-admin.js --email <email> --password <pass>
node scripts/promote-to-admin.js --email <email>
node scripts/update-admin-password.js --email <email> --password <pass>
```

### Other Utilities
```bash
node scripts/test-hourly-billing.js    # Dry-run billing workflow
node scripts/test-smtp.js              # Test email configuration
```

## Configuration

- Environment variables in `.env` (see `.env.example`)
- TypeScript config: `tsconfig.json` (paths alias `@/*` to `src/*`)
- Vite config: `vite.config.ts` (proxy `/api/` to port 3001, custom env prefix)
- Tailwind config: `tailwind.config.js`
- PM2 config: `ecosystem.config.cjs`
- Nodemon config: `nodemon.json`

## Module System

- **Type**: ESM (ES Modules) throughout
- **Import style**: Use `.js` extensions in imports even for `.ts` files
- **Node loader**: Use `--import tsx` for running TypeScript files directly
