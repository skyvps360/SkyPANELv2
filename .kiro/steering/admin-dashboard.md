---
inclusion: always
---

# Admin Dashboard Rules & Architecture

The `/admin` panel is the central control plane for platform administrators to manage support, infrastructure, users, orginizations and their respective memebers, and system configuration.

## Access Control

**Authentication & Authorization**:
- Admin routes protected by `requireAdmin` middleware (`api/middleware/auth.ts`)
- Requires user role `admin` in JWT token
- All admin API routes prefixed with `/api/admin/`
- Enhanced rate limits: 1000 requests per 15 minutes (vs 100 for regular users)
- Security middleware: `adminSecurityHeaders` and `requestSizeLimit(500)` (500KB limit)

**Frontend Access**:
- Route: `/admin` (component: `src/pages/Admin.tsx`)
- Hash-based navigation for sections: `/admin#support`, `/admin#vps-plans`, etc.
- No hash = dashboard view

## Admin Sections

The admin panel has 17 distinct sections accessible via hash navigation:

### Core Operations
1. **dashboard** - Mission control overview with key metrics and alerts
2. **support** - Support ticket queue management and replies
3. **user-management** - User access control, impersonation, profile management

### Infrastructure Management
4. **servers** - VPS/dedicated server fleet monitoring (all organizations)
5. **containers** - Container instance oversight across all tenants
6. **vps-plans** - VPS plan catalog with pricing and markup configuration
7. **container-plans** - Container plan blueprints and pricing formulas

### Provider Configuration
8. **providers** - Cloud provider credentials, validation, and ordering
9. **regions** - Regional access control (allowed regions per provider)
10. **marketplace** - Marketplace app enablement (DigitalOcean one-click apps)
11. **stackscripts** - Linode StackScript configuration and ordering

### System Configuration
12. **networking** - rDNS base domain configuration
13. **theme** - Platform-wide theme preset selection
14. **rate-limiting** - Rate limit monitoring and per-user overrides
15. **faq-management** - FAQ categories and items (CategoryManager, FAQItemManager)
16. **platform** - Platform availability settings (maintenance mode, status messages)
17. **contact-management** - Contact form categories and methods

## Dashboard View (Mission Control)

**Strategic Panels** (6 quick-access cards):
- Support Operations: Open/urgent/in-progress ticket counts
- Compute Fleet: Active/provisioning/attention server counts
- Containers: Running/provisioning containers + active plans
- Plan Catalog: Active/hidden plans + average markup
- Organization Access: Total members + admin count
- Cloud Providers: Active/inactive provider count

**Live Feed Metrics**:
- Builds in flight: Provisioning servers + containers
- Critical attention: Attention servers + containers + urgent tickets
- Organization stats: Total orgs, orgs with servers, orgs with containers

**Dashboard Highlights** (4 items each):
- Ticket highlights: Urgent/high priority tickets sorted by priority then updated_at
- Server alerts: Non-running/non-active servers
- Container builds: Provisioning/deploying/pending/building containers

## Support Ticket Management

**Features**:
- View all tickets across all organizations
- Filter by status: all, open, in_progress, resolved, closed
- Priority levels: low, medium, high, urgent (with color-coded badges)
- Reply to tickets as admin (sender_type: "admin")
- Update ticket status via PATCH `/api/admin/tickets/:id/status`
- View ticket message history
- Delete tickets with confirmation dialog

**API Endpoints**:
- `GET /api/admin/tickets` - List all tickets
- `GET /api/admin/tickets/:id/replies` - Get ticket messages
- `POST /api/admin/tickets/:id/replies` - Send admin reply
- `PATCH /api/admin/tickets/:id/status` - Update ticket status
- `DELETE /api/admin/tickets/:id` - Delete ticket

## VPS Plan Management

**Features**:
- View plans grouped by provider
- Filter by provider and plan type (standard, cpu, memory, storage, premium, gpu)
- Add new plans from upstream provider plans (Linode types or DigitalOcean sizes)
- Configure markup pricing on top of base provider price
- Set backup pricing and upcharges (separate for daily/weekly on DigitalOcean)
- Enable/disable plans (active flag)
- Edit existing plan pricing
- Delete plans with confirmation

**Plan Creation Flow**:
1. Select provider (must have active provider configured)
2. Choose plan type filter (standard, cpu, memory, etc.)
3. Select specific plan from upstream provider
4. Set markup price (added to base price)
5. Configure backup pricing and upcharges
6. Set active status

**Type Class Mapping**:
- Backend normalizes provider-specific classifications to standard types
- DigitalOcean descriptions mapped: "basic" → "standard", "cpu-optimized" → "cpu", etc.
- Frontend uses `type_class` field for filtering

**Pagination**:
- Plans grouped by provider with 5 plans per page
- State tracked in `providerPlanPages` object keyed by provider ID

## Container Plan Management

**Features**:
- Define container blueprints with CPU, RAM, storage, network specs
- Pricing calculated from base pricing configuration (per-CPU, per-GB-RAM, etc.)
- Add markup on top of calculated base price
- Enable/disable plans
- Edit and delete plans

**Pricing Configuration**:
- `price_per_cpu` - Cost per CPU core
- `price_per_ram_gb` - Cost per GB of RAM
- `price_per_storage_gb` - Cost per GB of storage
- `price_per_network_mbps` - Cost per Mbps of network bandwidth
- Base price auto-calculated: `(cpu × cpu_price) + (ram × ram_price) + ...`

## Provider Management

**Features**:
- Add/edit/delete cloud providers (Linode, DigitalOcean, AWS, GCP)
- Store encrypted API tokens via `ENCRYPTION_KEY`
- Validate provider credentials with "Validate" button
- Drag-and-drop reordering (display order for frontend)
- Track validation status: valid, invalid, pending, unknown
- Track last API call timestamp
- Active/inactive toggle

**Validation Statuses**:
- Valid: Green badge with checkmark
- Invalid: Red badge with alert icon
- Pending: Secondary badge with clock icon
- Unknown: Secondary badge with question mark

**Provider Configuration**:
- `allowed_regions`: Array of region slugs users can deploy to
- `allowed_marketplace_apps`: Array of marketplace app slugs (DigitalOcean)
- Encrypted `api_key_encrypted` field

**Drag-and-Drop**:
- Uses `@dnd-kit` library for sortable provider list
- Updates `display_order` field on backend
- Affects provider selection order in frontend

## Region Access Management

**Component**: `RegionAccessManager`

**Features**:
- Configure allowed regions per provider
- Separate configuration for Linode and DigitalOcean
- Defaults: `DEFAULT_LINODE_ALLOWED_REGIONS`, `DEFAULT_DIGITALOCEAN_ALLOWED_REGIONS`
- Region selection restricts where users can deploy VPS instances
- Stored in provider `configuration.allowed_regions` array

## Marketplace Management

**Component**: `MarketplaceManager`

**Features**:
- Enable/disable DigitalOcean marketplace apps (one-click applications)
- Configure display names for marketplace apps
- Stored in provider `configuration.allowed_marketplace_apps`
- Frontend skips OS selection when marketplace app is chosen

## StackScript Management

**Features**:
- Configure Linode StackScripts for VPS deployment
- Fetch available StackScripts from Linode API (mine=true)
- Enable/disable StackScripts for user selection
- Set custom labels and descriptions
- Drag-and-drop ordering via `display_order` field
- Search/filter available StackScripts

**API Endpoints**:
- `GET /api/admin/stackscripts/configs` - Get configured StackScripts
- `POST /api/admin/stackscripts/configs` - Save StackScript configuration
- `GET /api/admin/upstream/stackscripts?mine=true` - Fetch from Linode

## User Management

**Features**:
- View all users across all organizations
- Filter by role (admin, user, etc.)
- Search by name, email, or organization
- View user profile with full details (UserProfileModal)
- Edit user details (UserEditModal)
- Impersonate users for troubleshooting
- Admin-to-admin impersonation requires confirmation dialog

**User Actions** (UserActionMenu):
- View Profile: Opens detailed user modal
- Edit User: Opens edit modal
- Impersonate: Start impersonation session
- Delete User: (if implemented)

**Impersonation**:
- Uses `ImpersonationContext` from `@/contexts/ImpersonationContext`
- Admin-to-admin requires explicit confirmation
- Logs impersonation activity for audit trail

**Event-Driven Focus**:
- Listen for `admin:focus-user` custom event
- Automatically switches to user-management tab and opens user profile
- Used for deep-linking from other parts of the app

## Server & Container Monitoring

**Servers Section**:
- View all VPS instances across all organizations
- Filter by status (running, provisioning, error, stopped, etc.)
- Search by label, IP, organization, owner, plan, provider, region
- Shows: label, status, IP, organization, owner, plan, provider, region, created date
- Status badges: color-coded (green=running, blue=provisioning, red=error, gray=stopped)

**Containers Section**:
- View all container instances across all organizations
- Filter by status
- Search by name, image, organization, creator
- Shows: name, image, status, organization, creator, created date

## Theme Management

**Features**:
- Select platform-wide theme preset for all users
- Available presets: teal, mono, violet, emerald, amber, rose, blue, slate, orange, zinc, stone, aurora, midnight, sage, custom
- Shows last theme update timestamp
- Uses `ThemeContext` and `themeService` API
- Applies immediately to all users on save

**API Endpoints**:
- `GET /api/admin/theme` - Get current theme configuration
- `PUT /api/admin/theme` - Update theme preset

## Rate Limiting Management

**Component**: `RateLimitMonitoring`

**Features**:
- Monitor rate limit metrics across all users
- View per-user rate limit overrides
- Create/update/delete user-specific rate limit overrides
- Override default limits for specific users (e.g., API integrations)

## FAQ Management

**Components**: `CategoryManager`, `FAQItemManager`

**Features**:
- Manage FAQ categories (name, description, display_order, is_active)
- Manage FAQ items within categories
- Drag-and-drop ordering for both categories and items
- Enable/disable categories and items
- CRUD operations via `/api/admin/faq/*` endpoints

## Platform Availability

**Component**: `PlatformAvailabilityManager`

**Features**:
- Enable/disable maintenance mode
- Set platform status messages
- Configure availability settings
- Affects all users platform-wide

## Contact Management

**Components**: `ContactCategoryManager`, `ContactMethodManager`

**Features**:
- Manage contact form categories
- Configure contact methods (email, phone, chat, etc.)
- Control what options users see in contact forms

## Networking Configuration

**rDNS Settings**:
- Configure base domain for reverse DNS records
- Default: `ip.rev.skyvps360.xyz`
- Applied to VPS instances for PTR records
- API: `GET/PUT /api/admin/networking/rdns`

## Activity Logging

**All admin actions must log to `activity_logs` table**:
- User ID (admin performing action)
- Organization ID (if applicable)
- Event type (e.g., `admin.plan.create`, `admin.ticket.reply`)
- Entity type and ID
- Status (success/failure)
- Metadata (relevant details)

Use `logActivity()` from `api/services/activityLogger.js`

## Security Considerations

**Audit Trail**:
- All admin actions logged via `auditLogger` middleware
- Track who did what and when
- Impersonation sessions logged separately

**Data Access**:
- Admins can view ALL organizations' data
- Respect organization boundaries in UI (show org name/slug)
- Never expose sensitive data (passwords, full API keys)
- Show token previews only (first/last chars)

**Rate Limiting**:
- Admin routes get 1000 req/15min (vs 100 for users)
- Detected via JWT token role field
- Applied automatically by smart rate limit middleware

## Frontend Patterns

**Hash Navigation**:
- Use `location.hash` to determine active section
- Update hash on tab change: `navigate({ pathname: '/admin', hash: '#section' })`
- Dashboard has no hash (or empty hash)

**State Management**:
- Local state for each section's data
- Fetch data on tab change via `useEffect` watching `activeTab`
- Refresh button re-fetches current section's data

**Event-Driven Actions**:
- Custom events for cross-component communication
- `admin:focus-ticket` - Jump to support tab and open specific ticket
- `admin:focus-user` - Jump to user-management tab and open user profile

**Modals & Dialogs**:
- Use shadcn/ui Dialog and AlertDialog components
- Confirmation dialogs for destructive actions (delete, impersonate admin)
- Profile/edit modals for detailed user management

## Common Pitfalls

- Don't forget to filter by `organization_id` when showing org-specific data
- Always validate provider tokens before allowing operations
- Check wallet balance before billable operations (even in admin)
- Use transactions for multi-table operations
- Log all state changes to activity_logs
- Respect provider rate limits even in admin operations
- Show user-friendly error messages, not raw API errors
- Paginate large lists (plans, users, tickets)
- Use optimistic UI updates with rollback on error
