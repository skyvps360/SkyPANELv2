---
inclusion: always
---

# Project Structure

## Root Directory

```
├── api/                    # Backend Express application
├── src/                    # Frontend React application
├── migrations/             # PostgreSQL schema migrations
├── scripts/                # Utility scripts for operations
├── public/                 # Static assets
├── repo-docs/              # Additional documentation
├── .kiro/                  # Kiro AI assistant configuration
├── .github/                # GitHub workflows and templates
└── [config files]          # Various configuration files
```

## Backend Structure (`api/`)

```
api/
├── app.ts                  # Express app setup, middleware, routes
├── server.ts               # Server entry point, starts HTTP and SSH bridge
├── index.ts                # Module exports
├── config/                 # Configuration management
│   └── index.ts            # Environment variable validation and config proxy
├── lib/                    # Shared utilities
│   ├── database.ts         # PostgreSQL query helpers, transactions
│   ├── crypto.ts           # Encryption/decryption for API keys
│   ├── security.ts         # Security utilities
│   └── ipDetection.ts      # IP address detection for rate limiting
├── middleware/             # Express middleware
│   ├── auth.ts             # JWT authentication, role checks
│   ├── rateLimiting.ts     # Smart rate limiting (anonymous/auth/admin)
│   └── security.ts         # Security headers and validation
├── routes/                 # API route handlers
│   ├── auth.ts             # Login, register, password reset
│   ├── vps.ts              # VPS management endpoints
│   ├── payments.ts         # PayPal wallet deposits
│   ├── invoices.ts         # Invoice retrieval
│   ├── support.ts          # Support ticket system
│   ├── admin.ts            # Admin user management
│   ├── admin/              # Admin-specific routes
│   │   ├── contact.ts      # Contact method management
│   │   └── platform.ts     # Platform settings
│   └── [other routes]
└── services/               # Business logic layer
    ├── authService.ts      # Authentication logic
    ├── billingService.ts   # Hourly billing reconciliation
    ├── linodeService.ts    # Linode API integration
    ├── DigitalOceanService.ts  # DigitalOcean API integration
    ├── providerService.ts  # Multi-provider abstraction
    ├── providerResourceCache.ts  # Provider data caching
    ├── activityLogger.ts   # Activity log creation
    ├── notificationService.ts  # Real-time notification streaming
    ├── emailService.ts     # Email sending via SMTP2GO
    ├── sshBridge.ts        # WebSocket SSH terminal bridge
    └── providers/          # Provider-specific implementations
```

## Frontend Structure (`src/`)

```
src/
├── main.tsx                # React app entry point
├── App.tsx                 # Root component, routing, providers
├── index.css               # Global styles, Tailwind imports
├── pages/                  # Page components (route targets)
│   ├── Dashboard.tsx
│   ├── VPS.tsx
│   ├── VPSDetail.tsx
│   ├── VpsSshConsole.tsx
│   ├── Billing.tsx
│   ├── Admin.tsx
│   └── [other pages]
├── components/             # Reusable UI components
│   ├── ui/                 # shadcn/ui primitives (button, dialog, etc.)
│   ├── admin/              # Admin-specific components
│   ├── billing/            # Billing-related components
│   ├── VPS/                # VPS-related components
│   ├── data-table/         # TanStack Table components
│   ├── AppLayout.tsx       # Main layout wrapper with sidebar
│   ├── Navigation.tsx      # Top navigation bar
│   └── [other components]
├── contexts/               # React Context providers
│   ├── AuthContext.tsx     # User authentication state
│   ├── ThemeContext.tsx    # Theme management (light/dark)
│   ├── ImpersonationContext.tsx  # Admin impersonation state
│   └── BreadcrumbContext.tsx     # Breadcrumb navigation
├── hooks/                  # Custom React hooks
│   ├── use-mobile.tsx      # Mobile detection
│   ├── use-form-persistence.tsx  # Form state persistence
│   └── [other hooks]
├── lib/                    # Frontend utilities
│   ├── api.ts              # Axios instance, API helpers
│   ├── utils.ts            # General utilities (cn, etc.)
│   ├── brand.ts            # Branding utilities
│   ├── billingUtils.ts     # Billing calculations
│   └── vpsStepConfiguration.ts  # VPS creation wizard logic
├── services/               # API service wrappers
│   └── paymentService.ts   # PayPal integration
├── types/                  # TypeScript type definitions
│   ├── vps.ts
│   ├── provider.ts
│   ├── faq.ts
│   └── [other types]
└── theme/                  # Theme configuration
    └── presets.ts          # Theme color presets
```

## Database Migrations (`migrations/`)

Sequential SQL files applied in order:
- `001_initial_schema.sql` - Core tables (users, wallets, transactions)
- `002_container_pricing.sql` - Container service tables
- `003_update_vps_schema.sql` - VPS instance tables
- `004_user_api_keys.sql` - Encrypted API key storage
- `005_activity_logs.sql` - Activity logging
- `006_billing_tracking.sql` - Billing reconciliation
- `007_networking_config.sql` - Network configuration
- `008_notifications.sql` - Notification system with triggers
- `009_ticket_chat_features.sql` - Support ticket enhancements
- `010_theme_settings.sql` - Theme preferences
- `011_password_reset.sql` - Password reset tokens
- `012_faq_management.sql` - FAQ system
- `013_contact_management.sql` - Contact methods
- `014_digitalocean_provider.sql` - DigitalOcean provider support
- `015_fix_activity_logs_system_events.sql` - Activity log fixes
- `016_add_provider_id_to_vps_instances.sql` - Provider tracking
- `017_add_provider_display_order.sql` - Provider ordering

## Scripts Directory (`scripts/`)

Operational utilities:
- `run-migration.js` - Apply all pending migrations
- `apply-single-migration.js` - Apply specific migration file
- `create-test-admin.js` - Create admin user
- `promote-to-admin.js` - Elevate user to admin
- `update-admin-password.js` - Change admin password
- `test-connection.js` - Test database connectivity
- `test-hourly-billing.js` - Test billing workflow
- `test-smtp.js` - Test email configuration
- `check-admin-users.js` - List admin users
- `migrate-vps-provider-data.js` - Data migration helper

## Key Architectural Patterns

### Backend
- **Service layer**: Business logic in `api/services/`, routes are thin controllers
- **Database access**: Use `api/lib/database.ts` helpers (`query`, `transaction`)
- **Activity logging**: Call `logActivity()` from `activityLogger.ts` for audit trail
- **Provider abstraction**: `providerService.ts` normalizes Linode/DigitalOcean APIs
- **Caching**: `providerResourceCache.ts` caches provider data with TTL

### Frontend
- **API calls**: Use `src/lib/api.ts` axios instance or service wrappers
- **State management**: TanStack Query for server state, Zustand for global client state
- **Routing**: React Router with protected route wrappers (`ProtectedRoute`, `AdminRoute`)
- **Forms**: React Hook Form + Zod schemas for validation
- **UI components**: shadcn/ui pattern (copy components into `src/components/ui/`)

### Database
- **Migrations**: Sequential SQL files, no ORM
- **Transactions**: Use `transaction()` helper for multi-step operations
- **Notifications**: PostgreSQL triggers emit NOTIFY events for real-time updates

### Authentication
- **JWT tokens**: Stored in localStorage, sent via Authorization header
- **Role-based access**: Middleware checks `user.role` for admin routes
- **Impersonation**: Admins can impersonate users via special JWT claims
