# Multi-Provider VPS API Documentation

## Overview

The multi-provider VPS system extends the existing VPS management API to support multiple cloud infrastructure providers (Linode and DigitalOcean). This document describes the new and modified API endpoints, request/response formats, and integration patterns.

## Architecture

### Provider Service Layer

The provider service layer abstracts provider-specific API implementations behind a common interface (`IProviderService`). This allows the system to:

- Route operations to the appropriate provider based on configuration
- Normalize provider-specific responses to a common format
- Handle provider-specific errors consistently
- Cache provider resources to reduce API calls

```
┌─────────────────┐
│  VPS Router     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Provider Service│
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌──────────────┐
│ Linode │ │ DigitalOcean │
└────────┘ └──────────────┘
```

### Provider Factory

The `ProviderFactory` creates provider-specific service instances based on provider type:

```typescript
const provider = ProviderFactory.createProvider('digitalocean', apiToken, providerId);
```

### Error Normalization

All provider errors are normalized to a common format:

```typescript
interface ProviderError {
  code: string;           // Standardized error code
  message: string;        // Human-readable message
  field?: string;         // Field that caused the error (for validation)
  provider: ProviderType; // Provider that generated the error
  originalError?: any;    // Original error for debugging
}
```

## API Endpoints

### Provider Management

#### GET `/api/admin/providers`

List all configured providers.

**Authentication:** Required (Admin)

**Response:**
```json
{
  "providers": [
    {
      "id": "uuid",
      "name": "Linode",
      "type": "linode",
      "active": true,
      "configuration": {},
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": "uuid",
      "name": "DigitalOcean",
      "type": "digitalocean",
      "active": true,
      "configuration": {},
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST `/api/admin/providers`

Create a new provider configuration.

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "name": "DigitalOcean Production",
  "type": "digitalocean",
  "api_key": "your-api-token",
  "configuration": {
    "default_region": "nyc3"
  }
}
```

**Response:**
```json
{
  "success": true,
  "provider": {
    "id": "uuid",
    "name": "DigitalOcean Production",
    "type": "digitalocean",
    "active": true
  }
}
```

#### PUT `/api/admin/providers/:id`

Update an existing provider configuration.

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "name": "DigitalOcean Production",
  "api_key": "new-api-token",
  "active": true,
  "configuration": {
    "default_region": "sfo3"
  }
}
```

#### DELETE `/api/admin/providers/:id`

Delete a provider configuration.

**Authentication:** Required (Admin)

**Response:**
```json
{
  "success": true,
  "message": "Provider deleted successfully"
}
```

### VPS Instance Management

#### POST `/api/vps`

Create a new VPS instance with the selected provider.

**Authentication:** Required

**Request Body (DigitalOcean):**
```json
{
  "provider_id": "uuid-of-digitalocean-provider",
  "provider_type": "digitalocean",
  "label": "my-web-server",
  "type": "s-1vcpu-1gb",
  "region": "nyc3",
  "image": "ubuntu-22-04-x64",
  "rootPassword": "secure-password-here",
  "sshKeys": ["12345", "67890"],
  "backups": false,
  "monitoring": true,
  "ipv6": true,
  "vpc_uuid": null,
  "appSlug": "wordpress",
  "tags": ["production", "web"]
}
```

**Request Body (Linode):**
```json
{
  "provider_id": "uuid-of-linode-provider",
  "provider_type": "linode",
  "label": "my-web-server",
  "type": "g6-nanode-1",
  "region": "us-east",
  "image": "linode/ubuntu22.04",
  "rootPassword": "secure-password-here",
  "sshKeys": ["ssh-rsa AAAA..."],
  "backups": false,
  "privateIP": false,
  "stackscriptId": 12345,
  "stackscriptData": {
    "hostname": "myserver"
  },
  "tags": ["production", "web"]
}
```

**Response:**
```json
{
  "success": true,
  "instance": {
    "id": "internal-uuid",
    "provider_id": "provider-uuid",
    "provider_type": "digitalocean",
    "provider_instance_id": "droplet-id",
    "label": "my-web-server",
    "status": "provisioning",
    "ip_address": null,
    "region": "nyc3",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### GET `/api/vps/:id`

Get details of a specific VPS instance. Automatically routes to the correct provider based on the instance's `provider_type`.

**Authentication:** Required

**Response:**
```json
{
  "instance": {
    "id": "internal-uuid",
    "provider_id": "provider-uuid",
    "provider_type": "digitalocean",
    "provider_instance_id": "droplet-id",
    "label": "my-web-server",
    "status": "running",
    "ip_address": "192.0.2.1",
    "ipv6_address": "2001:db8::1",
    "region": "nyc3",
    "plan_specs": {
      "vcpus": 1,
      "memory": 1024,
      "disk": 25,
      "transfer": 1000
    },
    "hourly_rate": 0.00893,
    "monthly_rate": 6.00,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

#### POST `/api/vps/:id/action`

Perform an action on a VPS instance. Automatically routes to the correct provider.

**Authentication:** Required

**Request Body:**
```json
{
  "action": "reboot"
}
```

**Supported Actions:**
- `boot` / `power_on` - Start the instance
- `shutdown` - Gracefully shut down the instance
- `power_off` - Force power off the instance
- `reboot` - Restart the instance
- `power_cycle` - Force restart (DigitalOcean only)
- `delete` - Delete the instance

**Response:**
```json
{
  "success": true,
  "message": "Action reboot initiated successfully"
}
```

### DigitalOcean-Specific Endpoints

#### GET `/api/vps/digitalocean/marketplace`

Fetch DigitalOcean 1-Click marketplace applications.

**Authentication:** Required

**Query Parameters:**
- `provider_id` (optional) - Specific provider ID to use

**Response:**
```json
{
  "apps": [
    {
      "slug": "wordpress",
      "name": "WordPress",
      "description": "WordPress is a popular content management system",
      "category": "CMS",
      "image_slug": "wordpress-20-04",
      "compatible_images": ["ubuntu-20-04-x64", "ubuntu-22-04-x64"]
    },
    {
      "slug": "docker",
      "name": "Docker",
      "description": "Docker container platform",
      "category": "Development",
      "image_slug": "docker-20-04",
      "compatible_images": ["ubuntu-20-04-x64", "ubuntu-22-04-x64"]
    }
  ]
}
```

#### GET `/api/vps/digitalocean/images`

Fetch available DigitalOcean OS images.

**Authentication:** Required

**Query Parameters:**
- `provider_id` (optional) - Specific provider ID to use
- `type` (optional) - Filter by type: `distribution`, `application`, `custom`

**Response:**
```json
{
  "images": [
    {
      "id": "123456",
      "slug": "ubuntu-22-04-x64",
      "label": "Ubuntu 22.04 x64",
      "description": "Ubuntu 22.04 LTS",
      "distribution": "Ubuntu",
      "public": true,
      "minDiskSize": 15
    },
    {
      "id": "123457",
      "slug": "debian-11-x64",
      "label": "Debian 11 x64",
      "description": "Debian 11",
      "distribution": "Debian",
      "public": true,
      "minDiskSize": 15
    }
  ]
}
```

#### GET `/api/vps/digitalocean/sizes`

Fetch available DigitalOcean Droplet sizes (plans).

**Authentication:** Required

**Query Parameters:**
- `provider_id` (optional) - Specific provider ID to use

**Response:**
```json
{
  "sizes": [
    {
      "id": "s-1vcpu-1gb",
      "label": "Basic - 1GB",
      "vcpus": 1,
      "memory": 1024,
      "disk": 25,
      "transfer": 1000,
      "price": {
        "hourly": 0.00893,
        "monthly": 6.00
      },
      "regions": ["nyc1", "nyc3", "sfo3", "ams3"]
    }
  ]
}
```

#### GET `/api/vps/digitalocean/regions`

Fetch available DigitalOcean regions.

**Authentication:** Required

**Query Parameters:**
- `provider_id` (optional) - Specific provider ID to use

**Response:**
```json
{
  "regions": [
    {
      "id": "nyc3",
      "label": "New York 3",
      "available": true,
      "capabilities": ["droplets", "load_balancers", "volumes"]
    },
    {
      "id": "sfo3",
      "label": "San Francisco 3",
      "available": true,
      "capabilities": ["droplets", "load_balancers", "volumes"]
    }
  ]
}
```

### Linode-Specific Endpoints

The existing Linode endpoints remain unchanged:

- `GET /api/vps/linode/stackscripts` - List StackScripts
- `GET /api/vps/linode/images` - List Linode images
- `GET /api/vps/linode/types` - List Linode plans
- `GET /api/vps/linode/regions` - List Linode regions

## Error Responses

All endpoints return standardized error responses:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "field": "fieldName"
}
```

### Common Error Codes

- `MISSING_CREDENTIALS` - API credentials not configured
- `INVALID_CREDENTIALS` - API credentials are invalid
- `PROVIDER_NOT_FOUND` - Provider ID not found
- `PROVIDER_INACTIVE` - Provider is disabled
- `INVALID_ACTION` - Unsupported action requested
- `RATE_LIMIT_EXCEEDED` - Provider API rate limit reached
- `INSUFFICIENT_RESOURCES` - Not enough resources available
- `VALIDATION_ERROR` - Input validation failed
- `API_ERROR` - Provider API returned an error
- `UNKNOWN_ERROR` - Unexpected error occurred

## Caching

Provider resources are cached to reduce API calls and improve performance:

| Resource | Cache Duration | Cache Key |
|----------|---------------|-----------|
| Plans/Sizes | 1 hour | `provider:{providerId}:plans` |
| Images | 1 hour | `provider:{providerId}:images` |
| Regions | 1 hour | `provider:{providerId}:regions` |
| Marketplace Apps | 6 hours | `provider:{providerId}:marketplace` |

Cache is automatically invalidated when:
- Provider configuration is updated
- Provider is disabled/enabled
- Manual cache clear is triggered

## Rate Limiting

Provider API calls are subject to rate limiting:

### Linode
- 1,600 requests per hour per token
- Automatic retry with exponential backoff

### DigitalOcean
- 5,000 requests per hour per token
- 250 requests per minute per token
- Automatic retry with exponential backoff

## Authentication

All endpoints require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <jwt-token>
```

Admin endpoints additionally require the user to have admin privileges.

## Database Schema

### service_providers Table

Stores provider configurations:

```sql
CREATE TABLE service_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('linode', 'digitalocean', 'aws', 'gcp')),
  api_key_encrypted TEXT NOT NULL,
  configuration JSONB NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### vps_instances Table

Enhanced with provider tracking:

```sql
ALTER TABLE vps_instances 
  ADD COLUMN provider_type VARCHAR(50),
  ADD COLUMN provider_id UUID REFERENCES service_providers(id) ON DELETE SET NULL;

CREATE INDEX idx_vps_instances_provider_type ON vps_instances(provider_type);
CREATE INDEX idx_vps_instances_provider_id ON vps_instances(provider_id);
```

### vps_plans Table

Already includes provider association:

```sql
CREATE TABLE vps_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES service_providers(id) ON DELETE CASCADE,
  provider_plan_id VARCHAR(255) NOT NULL,
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  markup_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  specifications JSONB NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Integration Examples

### Creating a DigitalOcean VPS

```typescript
import { api } from '@/lib/api';

const createVPS = async () => {
  const response = await api.post('/api/vps', {
    provider_id: 'digitalocean-provider-uuid',
    provider_type: 'digitalocean',
    label: 'my-wordpress-site',
    type: 's-1vcpu-1gb',
    region: 'nyc3',
    image: 'ubuntu-22-04-x64',
    rootPassword: 'SecurePassword123!',
    sshKeys: [],
    backups: false,
    monitoring: true,
    ipv6: true,
    appSlug: 'wordpress'
  });
  
  return response.data.instance;
};
```

### Fetching Provider Resources

```typescript
import { api } from '@/lib/api';

const fetchMarketplaceApps = async (providerId: string) => {
  const response = await api.get('/api/vps/digitalocean/marketplace', {
    params: { provider_id: providerId }
  });
  
  return response.data.apps;
};
```

### Performing Instance Actions

```typescript
import { api } from '@/lib/api';

const rebootInstance = async (instanceId: string) => {
  const response = await api.post(`/api/vps/${instanceId}/action`, {
    action: 'reboot'
  });
  
  return response.data;
};
```

## Migration Guide

### For Existing Linode Installations

1. Existing VPS instances will continue to work without changes
2. Run migration `016_add_provider_id_to_vps_instances.sql` to add provider tracking
3. Run `scripts/migrate-vps-provider-data.js` to populate provider data for existing instances
4. Linode provider will be automatically created if it doesn't exist

### Adding DigitalOcean Support

1. Navigate to Admin → Providers
2. Click "Add Provider"
3. Select "DigitalOcean" as provider type
4. Enter your DigitalOcean API token
5. Configure default settings
6. Enable the provider
7. Create VPS plans for DigitalOcean sizes

## Security Considerations

- API tokens are stored encrypted in the database
- Provider credentials are never exposed in API responses
- Rate limiting prevents abuse of provider APIs
- Input validation prevents injection attacks
- Provider isolation ensures users can only access their own resources

## Troubleshooting

### Provider Not Available

**Symptom:** Provider doesn't appear in the provider selector

**Solution:**
- Verify provider is marked as `active` in the database
- Check that API credentials are configured
- Validate credentials using the admin interface

### API Errors

**Symptom:** Provider API calls fail with authentication errors

**Solution:**
- Verify API token is correct and not expired
- Check provider account status
- Review rate limiting status

### Cache Issues

**Symptom:** Stale data appears in dropdowns

**Solution:**
- Update provider configuration to invalidate cache
- Wait for cache TTL to expire
- Manually clear cache if needed

## Future Enhancements

- Support for AWS EC2
- Support for Google Cloud Compute Engine
- Provider-specific monitoring integrations
- Automated failover between providers
- Cost optimization recommendations
