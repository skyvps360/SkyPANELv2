---
inclusion: always
---

# Technology Stack & Commands

## Stack Overview

**Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + TanStack Query + Zustand
**Backend**: Node.js 20+ + Express + TypeScript (ESM) + PostgreSQL + Redis + Bull queues
**Key Libraries**: JWT auth, bcryptjs, nodemailer, PayPal SDK, ssh2, helmet, cors, express-rate-limit

## Critical Configuration

- Frontend runs on port 5173, backend API on port 3001
- TypeScript strict mode is DISABLED for faster development
- Path alias `@/*` maps to `src/*` in frontend code
- Environment variables: `VITE_*` and `COMPANY_*` prefixes are exposed to frontend
- ESM modules required - use `.js` extensions in imports for backend files

## Common Commands

**Development**:
- `npm run dev` - Start both frontend and backend concurrently
- `npm run client:dev` - Vite dev server only
- `npm run server:dev` - Express server only with nodemon
- `npm run kill-ports` - Free ports 3001 and 5173

**Testing & Quality**:
- `npm run test` - Run Vitest tests once (use this, not watch mode)
- `npm run lint` - ESLint check
- `npm run check` - TypeScript type checking
- `npm run build` - Full production build with type checking

**Database**:
- `node scripts/run-migration.js` - Apply all pending migrations
- `node scripts/apply-single-migration.js <file>` - Apply specific migration
- `node scripts/reset-database.js --confirm` - Reset database (destructive)

**Production**:
- `npm run start` - Production server
- `npm run pm2:start` - Start with PM2 process manager
- `npm run pm2:reload` - Zero-downtime reload