# System Architecture

## Overview

ContainerStacks is a full-stack TypeScript application built with a modern React frontend and Express backend, designed to provide cloud infrastructure reselling capabilities with multi-provider support.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  React 18 + TypeScript + Vite                        │   │
│  │  - Tailwind CSS + shadcn/ui Components               │   │
│  │  - React Router for routing                          │   │
│  │  - Zustand for state management                      │   │
│  │  - React Query for data fetching                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ HTTP/WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                         Backend                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Node.js + Express + TypeScript                      │   │
│  │  - RESTful API                                       │   │
│  │  - JWT Authentication                                │   │
│  │  - Rate Limiting & Security                          │   │
│  │  - WebSocket for notifications                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
           │                    │                    │
           ▼                    ▼                    ▼
    ┌───────────┐        ┌──────────┐        ┌──────────┐
    │PostgreSQL │        │  Redis   │        │ External │
    │ Database  │        │  Cache   │        │   APIs   │
    └───────────┘        └──────────┘        └──────────┘
                                                    │
                                  ┌─────────────────┼─────────────────┐
                                  │                 │                 │
                              ┌────────┐     ┌──────────┐     ┌──────────┐
                              │ Linode │     │  PayPal  │     │ SMTP2GO  │
                              │   API  │     │    API   │     │   Email  │
                              └────────┘     └──────────┘     └──────────┘
```

## Core Components

### Frontend (src/)

#### Technology Stack
- **React 18**: Modern functional components with hooks
- **TypeScript**: Full type safety across the codebase
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: High-quality, accessible UI components
- **React Router**: Client-side routing
- **Zustand**: Lightweight state management

#### Directory Structure
```
src/
├── components/        # Reusable UI components
│   ├── ui/           # shadcn/ui base components
│   ├── admin/        # Admin-specific components
│   ├── VPS/          # VPS management components
│   └── ...
├── pages/            # Page components (routes)
├── contexts/         # React contexts (Auth, Theme, Impersonation)
├── hooks/            # Custom React hooks
├── lib/              # Utilities and helpers
├── services/         # API service layer
├── theme/            # Theme configuration and presets
└── types/            # TypeScript type definitions
```

#### Key Features
- **Authentication Context**: Manages user session and JWT tokens
- **Theme System**: Customizable themes with dark mode support
- **Impersonation**: Admin capability to impersonate users
- **Real-time Notifications**: WebSocket-based notification system
- **Responsive Design**: Mobile-first approach with Tailwind

### Backend (api/)

#### Technology Stack
- **Node.js 20+**: Runtime environment
- **Express.js**: Web framework
- **TypeScript**: Type-safe backend code
- **PostgreSQL**: Primary database with pg driver
- **Redis**: Caching and Bull queue system
- **JWT**: Authentication tokens
- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing

#### Directory Structure
```
api/
├── config/           # Configuration management
├── lib/              # Database and utility functions
├── middleware/       # Express middleware (auth, rate limiting)
├── routes/           # API route handlers
│   ├── auth.ts
│   ├── vps.ts
│   ├── containers.ts
│   ├── billing.ts
│   ├── support.ts
│   └── ...
├── services/         # Business logic and external integrations
│   ├── linodeService.ts
│   ├── paypalService.ts
│   ├── emailService.ts
│   └── ...
├── app.ts            # Express app configuration
└── server.ts         # Server entry point
```

#### API Routes

| Route | Purpose |
|-------|---------|
| `/api/auth` | Authentication and user management |
| `/api/vps` | VPS instance management |
| `/api/containers` | Container management |
| `/api/payments` | PayPal payment processing |
| `/api/invoices` | Billing and invoice management |
| `/api/support` | Support ticket system |
| `/api/admin` | Administrative operations |
| `/api/activity` | Activity log tracking |
| `/api/notifications` | Real-time notifications |
| `/api/theme` | Theme customization |
| `/api/health` | Health check endpoint |

### Database (PostgreSQL)

#### Key Tables

- **users**: User accounts and profiles
- **organizations**: Multi-tenant organization support
- **wallets**: Prepaid wallet system
- **vps_plans**: VPS plan configurations
- **container_plans**: Container plan configurations
- **vps_instances**: Deployed VPS servers
- **containers**: Deployed containers
- **invoices**: Billing records
- **transactions**: Payment transactions
- **tickets**: Support ticket system
- **activity_logs**: Audit trail
- **notifications**: User notifications
- **user_api_keys**: API key management
- **theme_settings**: Custom theme configurations
- **provider_configs**: Cloud provider settings
- **stackscript_configs**: Deployment script configurations
- **networking_config**: Network and IP management

#### Security
- Row Level Security (RLS) policies
- Encrypted sensitive data
- Parameterized queries to prevent SQL injection
- Organization-based data isolation

### External Integrations

#### Linode/Akamai API
- **Purpose**: VPS provisioning and management
- **Features**: 
  - Create/delete/reboot instances
  - Manage backups and snapshots
  - Retrieve metrics (CPU, network, I/O)
  - IP address management
  - StackScript deployment

#### PayPal SDK
- **Purpose**: Payment processing
- **Features**:
  - Create payment orders
  - Capture payments
  - Handle payment webhooks
  - Refund processing

#### SMTP2GO
- **Purpose**: Transactional email
- **Features**:
  - User registration emails
  - Password reset emails
  - Ticket notifications
  - Billing alerts
  - System notifications

#### Redis
- **Purpose**: Caching and queue management
- **Features**:
  - Session caching
  - Rate limit tracking
  - Bull queues for background jobs
  - Real-time notification delivery

## Authentication & Authorization

### JWT Token Flow

1. User logs in with email/password
2. Server validates credentials
3. JWT token generated with user ID, email, role
4. Token returned to client
5. Client stores token in localStorage
6. Token included in Authorization header for API requests
7. Middleware validates token and extracts user info

### User Roles

- **admin**: Full platform access, can manage all resources
- **user**: Regular user, can manage own resources
- **organization_admin**: Manage organization users and resources

### Protected Routes

Frontend routes use `ProtectedRoute` and `AdminRoute` wrappers to enforce authentication and authorization.

## Data Flow

### Creating a VPS Instance

1. **Frontend**: User selects plan, region, and configuration
2. **API Request**: POST to `/api/vps` with configuration
3. **Validation**: Middleware checks authentication, wallet balance
4. **Provider API**: Call Linode API to create instance
5. **Database**: Store instance details in `vps_instances` table
6. **Billing**: Deduct initial cost from wallet, create invoice
7. **Notification**: Send real-time notification to user
8. **Response**: Return instance details to frontend

### Hourly Billing Cycle

1. **Cron Job**: Runs every hour via Bull queue
2. **Query Active Resources**: Fetch all running VPS and containers
3. **Calculate Charges**: Hourly rate × number of hours
4. **Update Wallet**: Deduct charges from user wallets
5. **Create Invoice**: Generate invoice records
6. **Notifications**: Alert users of low balance
7. **Auto-suspension**: Suspend resources if wallet depleted

## Scalability Considerations

### Horizontal Scaling
- Stateless API servers can be load balanced
- Redis for session sharing across instances
- PostgreSQL connection pooling

### Vertical Scaling
- Optimize database queries with indexes
- Use Redis for expensive computations
- Implement caching strategies

### Background Jobs
- Bull queues for async operations
- Separate worker processes for long-running tasks
- Retry mechanisms for failed jobs

## Monitoring & Observability

### Application Logs
- Structured logging with timestamps
- Request/response logging
- Error tracking and stack traces

### Metrics
- API endpoint latency
- Database query performance
- External API response times
- Rate limit violations

### Health Checks
- `/api/health` endpoint for liveness probes
- Database connectivity checks
- Redis connectivity checks
- External API availability

## Security Architecture

### Defense in Depth

1. **Transport Security**: HTTPS/TLS for all connections
2. **Input Validation**: Express-validator for all inputs
3. **Output Encoding**: XSS prevention
4. **Authentication**: JWT with secure secrets
5. **Authorization**: Role-based access control
6. **Rate Limiting**: Smart rate limiting per user type
7. **SQL Injection**: Parameterized queries only
8. **CSRF Protection**: CORS configuration
9. **Security Headers**: Helmet middleware
10. **Data Encryption**: Sensitive data encrypted at rest

### API Security

- JWT token expiration and refresh
- Rate limiting per IP and user
- Request validation and sanitization
- CORS with allowed origins
- Security headers (CSP, HSTS, etc.)

## Performance Optimization

### Frontend
- Code splitting with React.lazy
- Image optimization
- Memoization with React.memo and useMemo
- Virtual scrolling for large lists

### Backend
- Database connection pooling
- Redis caching for frequent queries
- Pagination for large result sets
- Efficient database indexes
- Async/await for non-blocking I/O

### Database
- Proper indexing on frequently queried columns
- Query optimization with EXPLAIN
- Connection pooling
- Read replicas for scaling reads

---

**Next**: [Database Schema](./database-schema.md) | [API Design](./api-design.md)
