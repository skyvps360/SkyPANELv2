---
inclusion: always
---

# Provider API Usage & Integration Patterns

## API Configuration

**Linode**:
- Base URL: `https://api.linode.com/v4` (from `.env.example`)
- Authentication: Bearer token via `LINODE_API_TOKEN`
- Token validation: Check via `api/lib/diagnostics.ts` health endpoints

**DigitalOcean**:
- Authentication: Bearer token via `DIGITALOCEAN_API_TOKEN`
- Token validation: Check via `api/lib/diagnostics.ts` health endpoints
- Marketplace apps: Support `appSlug` and `appData` for one-click applications

## Error Handling Patterns

All provider API calls must use `handleProviderError()` from `api/lib/errorHandling.ts`:

- **401/403**: Map to `ErrorCodes.UNAUTHORIZED` - invalid/expired tokens
- **404**: Map to `ErrorCodes.RESOURCE_NOT_FOUND` - instance/resource not found
- **429**: Map to `ErrorCodes.PROVIDER_RATE_LIMIT` - rate limit exceeded
- **408/5xx**: Map to `ErrorCodes.PROVIDER_UNAVAILABLE` - timeout or server error
- Retryable errors: Map to `ErrorCodes.PROVIDER_TIMEOUT` with 504 status

Always log provider errors with context: `logError(\`\${provider} \${operation}\`, error)`

## Provider Abstraction Layer

**Critical Rules**:
- NEVER call provider APIs directly from routes - use `api/services/` layer
- Provider-specific logic belongs in service implementations, not controllers
- Normalize provider responses to common interfaces defined in `src/types/provider.ts`
- Store both internal IDs and provider IDs (e.g., `linode_id`, `droplet_id`)

**Common Provider Interfaces**:
- `ProviderPlan`: Normalized plan/size with vcpus, memory, disk, transfer, pricing
- `ProviderImage`: OS images with slug, distribution, version, minDiskSize
- `ProviderRegion`: Data center regions with slug, features, availability

## Backup Pricing Specifics

**DigitalOcean**:
- Supports both daily and weekly backup schedules
- Separate pricing: `hourly_daily`, `monthly_daily`, `hourly_weekly`, `monthly_weekly`
- Frontend must allow users to choose backup frequency
- Skip OS selection when marketplace app is chosen (app provides its own image)

**Linode**:
- Standard backup pricing: `hourly` and `monthly` in `backup_price`
- No frequency selection needed

## Token Validation

Use `checkProviderTokens()` from `api/lib/diagnostics.ts`:
- Returns `{ configured: boolean, valid?: boolean, error?: string, tokenPreview?: string }`
- Validate tokens on startup and expose via `/api/health` endpoints
- Show token preview (first/last chars) for debugging without exposing full token

## Rate Limiting & Retries

- Implement exponential backoff for retryable errors (timeouts, 5xx)
- Respect provider rate limits (429 responses)
- Use `smartRateLimit` middleware on all `/api/` routes
- Track provider API call metrics via `rateLimitMetrics` service

## VPS Creation Flow

**Required Parameters** (from `CreateInstanceParams`):
- Provider-agnostic: region, plan, image, label, root_password
- Provider-specific: Include when needed (e.g., DO marketplace `appSlug`)
- SSH keys: Sync to both providers before VPS creation
- Backups: Include backup frequency for DigitalOcean

**Validation**:
- Check wallet balance BEFORE API call
- Validate region/plan/image compatibility
- Enforce marketplace app requirements (compatible images, required UDFs)

## Frontend Integration

**API Client** (`src/lib/api.ts`):
- Never hardcode provider URLs in components
- Use centralized API client or service wrappers
- Handle provider errors with user-friendly messages

**VPS Workflow** (`src/lib/vpsStepConfiguration.ts`):
- Centralize step logic - don't duplicate in pages
- Skip OS selection for DO marketplace apps
- Show backup frequency selector only for DigitalOcean

**Configuration Components**:
- `DigitalOceanConfiguration.tsx`: Handle DO-specific options (marketplace apps, backup frequency)
- Use zod schemas for form validation
- Respect provider-specific constraints from API responses
