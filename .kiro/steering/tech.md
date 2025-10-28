# Tech Stack

## Frontend

- **Framework**: React 18 with TypeScript
- **Build tool**: Vite 6
- **Styling**: Tailwind CSS with CSS variables for theming
- **UI components**: shadcn/ui (Radix UI primitives)
- **State management**: Zustand for global state, TanStack Query v5 for server state
- **Routing**: React Router v7
- **Forms**: React Hook Form with Zod validation
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Utilities**: clsx + tailwind-merge via `cn()` helper

## Backend

- **Runtime**: Node.js 20+
- **Framework**: Express.js (ESM modules)
- **Language**: TypeScript
- **Database**: PostgreSQL 12+ with pg driver
- **Caching/Queues**: Redis with ioredis and Bull
- **Authentication**: JWT with bcryptjs
- **Email**: Nodemailer with SMTP2GO
- **WebSockets**: ws library for SSH bridge (ssh2)
- **Security**: Helmet, CORS, express-rate-limit, express-validator

## Development Tools

- **Package manager**: npm
- **Linting**: ESLint 9 with TypeScript ESLint
- **Testing**: Vitest with React Testing Library and Supertest
- **Process manager**: PM2 for production, Nodemon for development
- **Concurrency**: concurrently for running dev servers

## Common Commands

### Development
```bash
npm run dev              # Start both frontend (5173) and backend (3001)
npm run client:dev       # Start Vite dev server only
npm run server:dev       # Start Express with Nodemon only
npm run kill-ports       # Free ports 3001 and 5173
```

### Building
```bash
npm run build            # TypeScript check + Vite build
npm run check            # TypeScript type checking only
```

### Testing
```bash
npm run test             # Run Vitest once
npm run test:watch       # Run Vitest in watch mode
npm run lint             # Run ESLint
```

### Production
```bash
npm run start            # Start production servers
npm run pm2:start        # Build and start with PM2
npm run pm2:reload       # Reload PM2 processes
npm run pm2:stop         # Stop and delete PM2 processes
npm run pm2:list         # List PM2 processes
```

### Database
```bash
node scripts/run-migration.js                           # Apply all pending migrations
node scripts/apply-single-migration.js <file>           # Apply specific migration
node scripts/test-connection.js                         # Test database connection
```

### Admin Utilities
```bash
node scripts/create-test-admin.js --email <email> --password <pass>
node scripts/promote-to-admin.js --email <email>
node scripts/update-admin-password.js --email <email> --password <pass>
node scripts/check-admin-users.js
```

### Other Utilities
```bash
node scripts/test-hourly-billing.js     # Dry-run billing workflow
node scripts/test-smtp.js               # Test email configuration
```

## Module System

- **Type**: ESM (ES Modules)
- **Import style**: Use `.js` extensions in imports even for `.ts` files
- **Example**: `import { foo } from './bar.js'`

## Environment Variables

Configuration is managed through `.env` file. Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `ENCRYPTION_KEY` - 32-character key for API key encryption
- `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` - PayPal credentials
- `LINODE_API_TOKEN` - Required for Linode integration
- `DIGITALOCEAN_API_TOKEN` - Optional for DigitalOcean
- `REDIS_URL` - Redis connection string
- `SMTP2GO_*` - Email service credentials
- `COMPANY_NAME` / `VITE_COMPANY_NAME` - White-label branding
- `PORT` - API server port (default: 3001)
- `NODE_ENV` - Environment mode (development/production)
