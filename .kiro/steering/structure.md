# Project Structure

## Root Directory

```
containerstacks/
├── api/                    # Backend Express.js application
├── src/                    # Frontend React application
├── migrations/             # PostgreSQL database migrations
├── scripts/                # Utility scripts for setup and maintenance
├── docs/                   # Project documentation
├── public/                 # Static assets
├── stackscripts/           # Cloud provider provisioning scripts
├── dist/                   # Production build output
└── node_modules/           # Dependencies
```

## Backend Structure (`api/`)

```
api/
├── config/                 # Configuration management
│   └── index.ts           # Centralized config with validation
├── lib/                    # Shared utilities
│   ├── crypto.ts          # Encryption/decryption utilities
│   ├── database.ts        # PostgreSQL connection pool
│   ├── ipDetection.ts     # IP address detection for rate limiting
│   └── security.ts        # Security utilities
├── middleware/             # Express middleware
│   ├── auth.ts            # JWT authentication
│   ├── rateLimiting.ts    # Smart rate limiting
│   └── security.ts        # Security headers and validation
├── routes/                 # API route handlers
│   ├── auth.ts            # Authentication endpoints
│   ├── vps.ts             # VPS management
│   ├── containers.ts      # Container management
│   ├── payments.ts        # PayPal integration
│   ├── invoices.ts        # Billing and invoices
│   ├── admin.ts           # Admin panel operations
│   ├── support.ts         # Support tickets
│   ├── activity.ts        # Activity logs
│   ├── notifications.ts   # Real-time notifications
│   ├── theme.ts           # White-label theming
│   └── health.ts          # Health checks
├── services/               # Business logic layer
│   ├── authService.ts     # Authentication logic
│   ├── billingService.ts  # Hourly billing automation
│   ├── linodeService.ts   # Linode API integration
│   ├── paypalService.ts   # PayPal payment processing
│   ├── emailService.ts    # SMTP email notifications
│   ├── invoiceService.ts  # Invoice generation
│   ├── notificationService.ts  # SSE notifications
│   ├── activityLogger.ts  # Activity tracking
│   ├── themeService.ts    # Theme management
│   └── sshBridge.ts       # SSH console bridge
├── app.ts                  # Express app configuration
├── server.ts               # HTTP server entry point
└── index.ts                # Main entry point
```

## Frontend Structure (`src/`)

```
src/
├── components/             # React components
│   ├── ui/                # shadcn/ui components (Button, Dialog, etc.)
│   ├── admin/             # Admin-specific components
│   ├── VPS/               # VPS management components
│   ├── data-table/        # Reusable table components
│   ├── icons/             # Custom icon components
│   ├── AppLayout.tsx      # Main authenticated layout
│   ├── AppSidebar.tsx     # Navigation sidebar
│   ├── Navigation.tsx     # Top navigation bar
│   ├── PublicLayout.tsx   # Public pages layout
│   └── NotificationDropdown.tsx  # Real-time notifications
├── contexts/               # React Context providers
│   ├── AuthContext.tsx    # Authentication state
│   ├── ThemeContext.tsx   # Theme management
│   └── ImpersonationContext.tsx  # Admin impersonation
├── hooks/                  # Custom React hooks
│   ├── use-mobile.tsx     # Mobile detection
│   ├── use-mobile-navigation.tsx
│   ├── use-mobile-performance.tsx
│   ├── use-form-persistence.tsx
│   └── useTheme.ts        # Theme hook
├── lib/                    # Utility functions
│   ├── api.ts             # Axios API client
│   ├── utils.ts           # General utilities (cn, etc.)
│   ├── brand.ts           # White-label branding helpers
│   ├── color.ts           # Color manipulation
│   └── breadcrumbs.ts     # Breadcrumb generation
├── pages/                  # Route page components
│   ├── Home.tsx           # Public landing page
│   ├── Login.tsx          # Authentication
│   ├── Register.tsx
│   ├── Dashboard.tsx      # Main dashboard
│   ├── VPS.tsx            # VPS list
│   ├── VPSDetail.tsx      # VPS management
│   ├── VpsSshConsole.tsx  # SSH terminal
│   ├── Containers.tsx     # Container list
│   ├── ContainerDetail.tsx
│   ├── Billing.tsx        # Billing and wallet
│   ├── InvoiceDetail.tsx
│   ├── Support.tsx        # Support tickets
│   ├── Admin.tsx          # Admin panel
│   ├── Settings.tsx       # User settings
│   ├── Activity.tsx       # Activity logs
│   └── ApiDocs.tsx        # API documentation
├── services/               # Frontend service layer
│   └── paymentService.ts  # Payment processing
├── theme/                  # Theme configuration
│   └── presets.ts         # Theme presets
├── types/                  # TypeScript type definitions
│   ├── vps.ts             # VPS types
│   └── react-table.d.ts   # Table types
├── App.tsx                 # Root component with routing
├── main.tsx                # React entry point
└── index.css               # Global styles and CSS variables
```

## Database Migrations (`migrations/`)

Sequential SQL files that must be applied in order:
- `001_initial_schema.sql` - Core tables and RLS policies
- `002_container_pricing.sql` - Container billing
- `003_update_vps_schema.sql` - VPS enhancements
- `004_user_api_keys.sql` - API key management
- `005_activity_logs.sql` - Activity tracking
- `006_billing_tracking.sql` - Billing automation
- `007_networking_config.sql` - Network configuration
- `008_notifications.sql` - Notification system
- `009_ticket_chat_features.sql` - Support tickets
- `010_theme_settings.sql` - White-label theming
- `011_password_reset.sql` - Password reset tokens

## Scripts (`scripts/`)

Utility scripts for database and system management:
- `apply-migration.js` - Apply all migrations
- `apply-single-migration.js` - Apply specific migration
- `seed-admin.js` - Create admin user
- `test-connection.js` - Test database connectivity
- `test-smtp.js` - Test email configuration
- `test-hourly-billing.js` - Test billing automation

## Key Conventions

### Import Paths
- Frontend: Use `@/` alias for `src/` imports
- Backend: Use `.js` extensions in imports (ES modules)

### Component Organization
- UI components in `src/components/ui/` (shadcn/ui)
- Feature components in `src/components/<feature>/`
- Page components in `src/pages/`

### API Routes
- All routes prefixed with `/api/`
- RESTful conventions (GET, POST, PUT, DELETE)
- Authentication via JWT in Authorization header

### Database
- PostgreSQL with Row Level Security (RLS)
- Migrations applied sequentially
- Connection pooling via `pg` library

### Styling
- Tailwind CSS with utility classes
- CSS variables for theming in `src/index.css`
- Component variants via `class-variance-authority`
