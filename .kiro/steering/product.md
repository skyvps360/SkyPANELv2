---
inclusion: always
---

# Product Domain & Architecture Rules

SkyPanelV2 is a multi-tenant cloud reseller control plane supporting VPS management across Linode and DigitalOcean with prepaid billing and white-label branding.

## Core Architecture Principles

**Multi-Provider Abstraction**:
- Provider interface normalizes Linode and DigitalOcean APIs
- Each VPS instance links to a provider via `provider_id` column
- Provider credentials encrypted at rest using environment encryption keys
- NEVER put provider-specific logic in routes - use `api/services/` abstraction layer

**Multi-Tenant Organization Model**:
- All resources (VPS, SSH keys, billing) scoped to `organization_id`
- Users belong to one organization and can ONLY access their org's resources
- ALWAYS filter queries by organization: `WHERE organization_id = ?`
- Admin users have platform-wide access but still respect org boundaries in UI

**Prepaid Wallet Billing**:
- Users prepay via PayPal, funds stored in wallet
- Hourly billing jobs reconcile usage and deduct from wallet
- NEVER allow operations if `wallet_balance < estimated_cost`
- All transactions logged to `activity_logs` table for audit trail

**White-Label Reseller**:
- Branding controlled by environment variables: `COMPANY_NAME`, `COMPANY_LOGO`, etc.
- Theme settings stored in database per installation
- Email templates use environment-driven branding

## Critical Implementation Rules

**Resource Ownership & Security**:
- Check organization ownership before ANY resource operation
- Log all state changes to `activity_logs` table with user context
- Hash API keys before storage, encrypt provider credentials
- Sync SSH keys to providers on creation
- Apply rate limiting per-user and per-IP

**Provider Integration**:
- VPS operations are asynchronous (create, delete, resize) - use job queues
- Handle provider rate limits and implement retries with exponential backoff
- Validate provider responses before updating database state
- Store both internal IDs and provider-specific IDs (e.g., `linode_id`, `droplet_id`)

**Billing Operations**:
- Validate wallet balance BEFORE starting billable operations
- Hourly billing jobs MUST be idempotent (safe to run multiple times)
- All financial transactions require `activity_logs` entries
- Track refunds and credits separately from charges

**Real-Time Communication**:
- Use PostgreSQL LISTEN/NOTIFY for cross-process events
- Server-Sent Events (SSE) for pushing notifications to frontend
- WebSocket connections for SSH console sessions
- Filter notifications by user permissions and organization

**Database Transactions**:
- Use transactions for multi-table operations (e.g., create VPS + log activity + deduct wallet)
- Rollback on any failure to maintain consistency
- Access database through `api/lib/database.ts` singleton

## Feature Development Checklist

When adding new features:
1. Maintain provider abstraction - no provider-specific code in routes
2. Add activity log entries for all state changes
3. Validate wallet balance for billable operations
4. Filter all queries by organization_id
5. Use database transactions for multi-step operations
6. Follow existing async patterns (Bull job queues for long operations)
7. Add rate limiting for new endpoints
8. Update TypeScript types in `src/types/` and backend interfaces