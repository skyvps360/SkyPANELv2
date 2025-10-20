# API Reference

All API endpoints are served from the Express application under `/api`. Unless noted, request and response bodies are JSON. Authentication uses bearer JWT tokens returned by `/api/auth/login` or `/api/auth/register`.

## Rate Limiting

ContainerStacks implements intelligent rate limiting to prevent abuse while maintaining optimal user experience. Rate limits are applied based on user authentication status and role.

### Rate Limit Tiers

| User Type | Requests per 15 minutes | Use Case |
| --- | --- | --- |
| **Anonymous** | 200 | Public endpoints, login, registration |
| **Authenticated** | 500 | Normal application usage with JWT token |
| **Admin** | 1000 | Administrative operations and bulk actions |

### Rate Limit Headers

All API responses include rate limiting information in headers:

```http
X-RateLimit-Limit: 500          # Maximum requests allowed in window
X-RateLimit-Remaining: 487      # Requests remaining in current window
X-RateLimit-Reset: 1640995200   # Unix timestamp when window resets
X-RateLimit-Used: 13            # Requests used in current window
```

### Rate Limit Exceeded Response

When rate limits are exceeded, the API returns HTTP 429 with retry information:

```json
{
  "error": "Too many requests. Please try again later.",
  "retryAfter": 847,              // Seconds until window resets
  "limit": 500,                   // Current rate limit
  "remaining": 0,                 // Requests remaining (always 0)
  "resetTime": 1640995200,        // Unix timestamp when window resets
  "userType": "authenticated"     // User classification for this request
}
```

### Rate Limiting Best Practices

**For Client Applications:**
- Monitor rate limit headers to avoid hitting limits
- Implement exponential backoff when receiving 429 responses
- Cache responses when possible to reduce API calls
- Use WebSocket connections for real-time features instead of polling

**For Authenticated Users:**
- Login to access higher rate limits (500 vs 200 requests)
- Batch operations when possible to reduce API calls
- Consider the 15-minute window when planning bulk operations

**For Administrators:**
- Admin accounts have the highest limits (1000 requests per 15 minutes)
- Use admin endpoints efficiently for bulk operations
- Monitor rate limiting metrics in the admin dashboard

### IP Detection and Proxy Support

Rate limiting uses accurate IP detection that works behind proxies:
- Supports X-Forwarded-For headers from trusted proxies
- Works correctly behind Vite development server
- Handles multiple proxy hops (Cloudflare, nginx, etc.)
- Falls back to socket remote address when proxy headers unavailable

## Auth (`/api/auth`)

| Method | Path | Auth Required | Description | Notes |
| --- | --- | --- | --- | --- |
| POST | `/register` | No | Register a user and optional organization. | Returns `{ user, token }`; fails if email already exists. |
| POST | `/login` | No | Authenticate with email/password. | Logs activity on success; returns `{ user, token }`. |
| POST | `/logout` | Bearer | Stateless logout acknowledgement. | Logs activity; clients remove the token locally. |
| POST | `/verify-email` | No | Placeholder for email verification. | Currently returns a message stating the feature is not implemented. |
| POST | `/forgot-password` | No | Begin password reset flow. | Returns generic success message; full reset flow not implemented. |
| POST | `/reset-password` | No | Complete password reset. | Always throws `Password reset not implemented`. |
| POST | `/refresh` | Bearer | Issue a new JWT for the current user. | Uses `AuthService.refreshToken`. |
| GET | `/me` | Bearer | Fetch the current authenticated user. | Reflects the user object attached by middleware. |
| GET | `/debug/user` | Bearer | Debug helper returning DB snapshot for current user. | Useful when verifying migrations/tables locally. |
| PUT | `/profile` | Bearer | Update first/last name, phone, timezone. | Dynamically updates `users` table and returns refreshed user payload. |
| PUT | `/organization` | Bearer (with org) | Update organization metadata (name, website, address, tax ID). | Requires the user to belong to an organization. |
| PUT | `/password` | Bearer | Change password after confirming the current one. | Reuses `AuthService.login` to verify the old password before updating. |
| PUT | `/preferences` | Bearer | Merge notification/security preferences JSON into `users.preferences`. | Creates structure lazily if absent. |
| GET | `/api-keys` | Bearer | List active API keys for the user. | Supports legacy column names; hides inactive keys. |
| POST | `/api-keys` | Bearer | Create a new API key. | Returns plaintext key once; stored hashed in DB. Logs activity. |
| DELETE | `/api-keys/:id` | Bearer | Revoke an API key by ID. | Marks key inactive and logs the event. |

## Payments (`/api/payments`)

| Method | Path | Auth Required | Description | Notes |
| --- | --- | --- | --- | --- |
| POST | `/create-payment` | Bearer + org | Create a PayPal order to add wallet funds. | Validates amount/currency/description before delegating to PayPal. |
| POST | `/capture-payment/:orderId` | Bearer | Capture a previously approved PayPal order. | Credits organization wallet and marks `payment_transactions` as completed. |
| GET | `/wallet/balance` | Bearer + org | Retrieve organization wallet balance. | Reads directly from `wallets`. |
| POST | `/wallet/deduct` | Bearer + org | Deduct wallet funds (e.g., VPS creation). | Records a debit transaction; fails on insufficient funds. |
| GET | `/wallet/transactions` | Bearer + org | Paginated wallet ledger (credits/debits). | Default limit 50; includes pagination metadata. |
| GET | `/history` | Bearer + org | Paginated payment history (PayPal + internal). | Supports optional `status` filter. |
| POST | `/refund` | Bearer + org | Issue a payout/refund to an email address. | Validates funds, generates PayPal payout, debits wallet. |

## Admin (`/api/admin`) — requires `role === 'admin'`

| Method | Path | Description | Notes |
| --- | --- | --- | --- |
| GET | `/tickets` | List all support tickets. | Ordered newest first. |
| PATCH | `/tickets/:id/status` | Update ticket status. | Allowed statuses: `open`, `in_progress`, `resolved`, `closed`. |
| DELETE | `/tickets/:id` | Delete a support ticket. | Returns HTTP 204 on success. |
| POST | `/tickets/:id/replies` | Post a staff reply. | Marks reply as staff and updates ticket timestamp. |
| GET | `/tickets/:id/replies` | List replies for a ticket. | Joins `users` for sender metadata. |
| GET | `/plans` | List active VPS plans. | Filters by `active = true`. |
| POST | `/plans` | Create a VPS plan. | Requires `provider_id`, pricing, and specification JSON. |
| PUT | `/plans/:id` | Update VPS plan pricing/metadata. | Fields are optional; updates `updated_at`. |
| DELETE | `/plans/:id` | Remove a VPS plan. | Hard delete from `vps_plans`. |
| GET | `/providers` | List service providers. | Reflects `service_providers` table. |
| POST | `/providers` | Create a provider entry. | Stores encrypted API key payload as provided. |
| PUT | `/providers/:id` | Update provider name/active state. | Touches `updated_at`. |
| DELETE | `/providers/:id` | Delete a provider. | Hard delete. |
| GET | `/container/pricing` | Fetch container pricing config. | Returns latest row or warning if table missing. |
| PUT | `/container/pricing` | Upsert pricing config. | Creates or updates `container_pricing_config`. |
| GET | `/networking/rdns` | Read default rDNS base domain. | Falls back to `ip.rev.skyvps360.xyz`. |
| PUT | `/networking/rdns` | Update rDNS base domain. | Upserts into `networking_config`. |
| GET | `/container/plans` | List container plans. | Warns if table missing (migration not applied). |
| POST | `/container/plans` | Create container plan. | Requires CPU/RAM/storage/network/pricing fields. |
| PUT | `/container/plans/:id` | Update container plan metadata. | Any subset of fields accepted. |
| DELETE | `/container/plans/:id` | Delete container plan. | Hard delete. |
| GET | `/schema/check` | Report existence of key tables. | Helps diagnose missing migrations. |
| GET | `/linode/plans` | Proxy Linode instance types. | Requires configured `LINODE_API_TOKEN`. |
| GET | `/linode/regions` | Proxy Linode regions. | Requires configured `LINODE_API_TOKEN`. |
| GET | `/linode/stackscripts` | Proxy Linode StackScripts. | Accepts `?mine=true` to filter to owned scripts. |
| GET | `/stackscripts/configs` | List stored StackScript configs. | Ordered by `display_order`. |
| POST | `/stackscripts/configs` | Upsert StackScript config. | Inserts or updates by `stackscript_id`. |
| PUT | `/stackscripts/configs/:id` | Update existing StackScript config. | Accepts optional label/description/enabled/order/metadata. |
| DELETE | `/stackscripts/configs/:id` | Delete StackScript config. | Removes by `stackscript_id`. |

## Containers (`/api/containers`)

| Method | Path | Auth Required | Description | Notes |
| --- | --- | --- | --- | --- |
| GET | `/` | Bearer + org | List containers for the organization. | Returns raw DB rows ordered by `created_at DESC`. |

## VPS (`/api/vps`)

All VPS endpoints require authentication and organization membership. Linode IDs are pulled from `provider_instance_id` stored in PostgreSQL.

### Reference Data

| Method | Path | Description | Notes |
| --- | --- | --- | --- |
| GET | `/apps` | Fetch Linode Marketplace apps. | Optional `?slugs=a,b` filter. |
| GET | `/images` | List available Linode images. | Proxy through `linodeService`. |
| GET | `/stackscripts` | List StackScripts. | Supports `?mine=true` and `?configured=true` (respect admin-configured allowlist). |

### Instances

| Method | Path | Description | Notes |
| --- | --- | --- | --- |
| GET | `/` | List VPS instances. | Enriches with provider status, region labels, plan specs/pricing. |
| GET | `/:id` | Fetch detailed instance info. | Includes metrics, transfer usage, backups, firewalls, networking, events, pricing estimates. |
| POST | `/` | Provision a new VPS. | Validates wallet funds, resolves plan/region, handles StackScripts/Marketplace apps, encrypts root password, schedules rDNS setup, triggers initial billing, logs activity. |
| DELETE | `/:id` | Delete an instance. | Requires re-entering account password; calls Linode delete and removes local record. |
| PUT | `/:id/hostname` | Update instance label/hostname. | Validates format, updates Linode and local cache, logs activity. |

### Lifecycle Actions

| Method | Path | Description | Notes |
| --- | --- | --- | --- |
| POST | `/:id/boot` | Boot the instance. | Updates cached status/IP and logs activity. |
| POST | `/:id/shutdown` | Shutdown the instance. | Updates status/IP and logs activity. |
| POST | `/:id/reboot` | Reboot the instance. | Updates status/IP and logs activity. |

### Backups

| Method | Path | Description | Notes |
| --- | --- | --- | --- |
| POST | `/:id/backups/enable` | Enable Linode backups. | Validates ownership; logs activity. |
| POST | `/:id/backups/disable` | Disable backups. | Logs activity. |
| POST | `/:id/backups/schedule` | Update backup schedule. | Accepts optional `day` and `window`; validates allowed values. |
| POST | `/:id/backups/snapshot` | Trigger manual snapshot. | Optional `label`; logs result. |
| POST | `/:id/backups/:backupId/restore` | Restore from snapshot. | Accepts `overwrite` flag; logs metadata about the restore. |

### Firewalls & Networking

| Method | Path | Description | Notes |
| --- | --- | --- | --- |
| POST | `/:id/firewalls/attach` | Attach a firewall to the instance. | Requires `firewallId` in body. |
| POST | `/:id/firewalls/detach` | Detach a firewall device. | Requires `firewallId` and `deviceId`. |
| POST | `/:id/networking/rdns` | Update reverse DNS for an assigned IP. | Verifies the IP belongs to the instance before updating. |

## Support (`/api/support`)

| Method | Path | Auth Required | Description | Notes |
| --- | --- | --- | --- | --- |
| GET | `/tickets` | Bearer + org | List organization support tickets. | Ordered newest first. |
| POST | `/tickets` | Bearer + org | Create a support ticket. | Requires subject, message, priority, category. |
| GET | `/tickets/:id/replies` | Bearer + org | List replies for a ticket. | Ensures ticket belongs to current organization. |
| POST | `/tickets/:id/replies` | Bearer + org | Add a reply to a ticket. | Updates ticket `updated_at`; marks reply as user-generated. |

## Activity (`/api/activity`)

| Method | Path | Auth Required | Description | Notes |
| --- | --- | --- | --- | --- |
| GET | `/recent` | Bearer | Recent activity for the current user (and org when available). | Limit default 10, max 100. |
| GET | `/` | Bearer + org | Filtered activity list for organization. | Supports `type`, `status`, `from`, `to`, `limit`, `offset`. |
| GET | `/summary` | Bearer + org | Aggregate counts by entity type and status. | Useful for dashboards. |
| GET | `/export` | Bearer + org | CSV export of activity log. | Streams CSV with download headers. |

## Health

| Method | Path | Auth Required | Description |
| --- | --- | --- | --- |
| GET | `/api/health` | No | Simple readiness check returning `{ success: true, message: 'ok' }`. |

When introducing new endpoints keep this reference updated so frontend, QA, and ops teams have a single source of truth.
