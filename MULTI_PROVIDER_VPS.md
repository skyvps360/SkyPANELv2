# Multi-Provider VPS Support

## Overview

SkyPanelV2 supports multiple cloud infrastructure providers (Linode and DigitalOcean) through a unified interface. This document provides an overview of the multi-provider VPS feature and links to detailed documentation.

## Features

- **Multiple Provider Support**: Manage VPS instances from Linode and DigitalOcean in a single interface
- **Unified API**: Consistent API across all providers with normalized responses
- **Provider Abstraction**: Provider-specific implementations hidden behind common interfaces
- **Dynamic UI**: Frontend adapts based on selected provider
- **Resource Caching**: Intelligent caching reduces API calls and improves performance
- **Error Normalization**: Standardized error handling across all providers
- **Admin Management**: Configure and manage providers through admin interface

## Supported Providers

### Linode (Akamai)
- **Status**: Fully supported (required)
- **Features**: StackScripts, backups, private IP, SSH keys
- **API**: Linode API v4
- **Documentation**: [Linode API Docs](https://www.linode.com/docs/api/)

### DigitalOcean
- **Status**: Fully supported (optional)
- **Features**: Marketplace apps, monitoring, IPv6, VPC, backups
- **API**: DigitalOcean API v2
- **Documentation**: [DigitalOcean API Docs](https://docs.digitalocean.com/reference/api/)

### Future Providers
- AWS EC2 (planned)
- Google Cloud Compute Engine (planned)

## Quick Start

### For Administrators

1. **Configure Provider**
   - Navigate to Admin → Providers
   - Click "Add Provider"
   - Select provider type (Linode or DigitalOcean)
   - Enter API token
   - Configure settings
   - Enable provider

2. **Create VPS Plans**
   - Navigate to Admin → VPS Plans
   - Click "Add Plan"
   - Select provider
   - Configure plan details
   - Set pricing

3. **Verify Setup**
   - Check provider status in admin interface
   - Test API credentials
   - Verify plans are visible to users

### For Users

1. **Create VPS Instance**
   - Navigate to VPS page
   - Click "Create VPS"
   - Select provider from dropdown
   - Choose plan
   - Configure deployment options (StackScripts or Marketplace apps)
   - Select operating system
   - Configure instance settings
   - Submit

2. **Manage Instances**
   - View all instances in VPS table
   - Filter by provider
   - Click instance to view details
   - Perform actions (boot, shutdown, reboot, delete)

## Architecture

The multi-provider system is built on several key architectural patterns:

### Provider Service Layer

All provider-specific implementations are abstracted behind a common interface (`IProviderService`). This allows:

- Consistent API across providers
- Easy addition of new providers
- Simplified testing with mock providers
- Isolated provider-specific logic

```
Frontend → API Routes → Provider Service → Provider Factory → Provider Implementation → Provider API
```

### Normalization

Provider responses are normalized to a common format:

- **Instances**: Common status, specs, networking
- **Plans**: Common pricing, resources, regions
- **Images**: Common distribution, version, size
- **Regions**: Common availability, capabilities
- **Errors**: Common error codes and messages

### Caching

Provider resources are cached to improve performance:

- Plans/Sizes: 1 hour TTL
- Images: 1 hour TTL
- Regions: 1 hour TTL
- Marketplace Apps: 6 hours TTL

### Factory Pattern

Provider instances are created through a factory that handles:

- Provider type detection
- API token management
- Configuration loading
- Instance creation

## Documentation

### Backend Documentation

- **[Provider Service Architecture](./api/services/providers/ARCHITECTURE.md)** - Detailed architecture overview
- **[API Documentation](./api/services/providers/API_DOCUMENTATION.md)** - Complete API reference
- **[Provider Service README](./api/services/providers/README.md)** - Provider service layer documentation
- **[Caching Documentation](./api/services/providers/CACHING.md)** - Resource caching details

### Provider-Specific Documentation

- **[DigitalOcean Configuration](./api/services/providers/DIGITALOCEAN_CONFIGURATION.md)** - DigitalOcean setup and configuration

### Database Documentation

- **Migration 014**: `migrations/014_digitalocean_provider.sql` - DigitalOcean provider support
- **Migration 016**: `migrations/016_add_provider_id_to_vps_instances.sql` - Provider tracking in instances

### Frontend Documentation

- **Provider Selector**: `src/components/VPS/ProviderSelector.tsx`
- **Dynamic Steps**: `src/components/VPS/CreateVPSSteps.tsx`
- **DigitalOcean Components**:
  - `src/components/VPS/DigitalOceanMarketplace.tsx`
  - `src/components/VPS/DigitalOceanOSSelection.tsx`
  - `src/components/VPS/DigitalOceanConfiguration.tsx`

## Key Components

### Backend

#### Provider Service Layer (`api/services/providers/`)
- `IProviderService.ts` - Common interface
- `BaseProviderService.ts` - Base implementation
- `ProviderFactory.ts` - Factory for creating providers
- `LinodeProviderService.ts` - Linode implementation
- `DigitalOceanProviderService.ts` - DigitalOcean implementation
- `errorNormalizer.ts` - Error normalization

#### High-Level Service (`api/services/`)
- `providerService.ts` - Database integration and provider management
- `providerResourceCache.ts` - Resource caching
- `linodeService.ts` - Linode API client
- `DigitalOceanService.ts` - DigitalOcean API client

#### API Routes (`api/routes/`)
- `vps.ts` - VPS management endpoints
- `admin.ts` - Provider management endpoints

### Frontend

#### Components (`src/components/VPS/`)
- `ProviderSelector.tsx` - Provider selection dropdown
- `CreateVPSSteps.tsx` - Dynamic step rendering
- `DigitalOceanMarketplace.tsx` - Marketplace app selection
- `DigitalOceanOSSelection.tsx` - OS image selection
- `DigitalOceanConfiguration.tsx` - Configuration options
- `VpsTable.tsx` - Instance table with provider filtering
- `ProviderErrorDisplay.tsx` - Error display component

#### Services (`src/services/`)
- API service wrappers for provider endpoints

#### Types (`src/types/`)
- `vps.ts` - VPS and provider type definitions
- `provider.ts` - Provider-specific types

## Database Schema

### service_providers

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

### vps_instances

Enhanced with provider tracking:

```sql
ALTER TABLE vps_instances 
  ADD COLUMN provider_type VARCHAR(50),
  ADD COLUMN provider_id UUID REFERENCES service_providers(id) ON DELETE SET NULL;
```

### vps_plans

Links plans to providers:

```sql
CREATE TABLE vps_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES service_providers(id) ON DELETE CASCADE,
  provider_plan_id VARCHAR(255) NOT NULL,
  -- ... other columns
);
```

## API Endpoints

### Provider Management

- `GET /api/admin/providers` - List all providers
- `POST /api/admin/providers` - Create provider
- `PUT /api/admin/providers/:id` - Update provider
- `DELETE /api/admin/providers/:id` - Delete provider

### VPS Management

- `POST /api/vps` - Create VPS (multi-provider)
- `GET /api/vps/:id` - Get VPS details (multi-provider)
- `POST /api/vps/:id/action` - Perform action (multi-provider)

### DigitalOcean-Specific

- `GET /api/vps/digitalocean/marketplace` - List marketplace apps
- `GET /api/vps/digitalocean/images` - List OS images
- `GET /api/vps/digitalocean/sizes` - List Droplet sizes
- `GET /api/vps/digitalocean/regions` - List regions

### Linode-Specific

- `GET /api/vps/linode/stackscripts` - List StackScripts
- `GET /api/vps/linode/images` - List images
- `GET /api/vps/linode/types` - List plans
- `GET /api/vps/linode/regions` - List regions

## Configuration

### Environment Variables

#### Linode (Required)
```env
LINODE_API_TOKEN=your-linode-token
```

#### DigitalOcean (Optional)
```env
DIGITALOCEAN_API_TOKEN=your-digitalocean-token
```

### Provider Configuration

Providers are configured through the admin interface or directly in the database:

```sql
INSERT INTO service_providers (name, type, api_key_encrypted, active)
VALUES ('DigitalOcean Production', 'digitalocean', 'your-api-token', true);
```

## Migration Guide

### Migrating from Linode-Only

1. **Run Migrations**
   ```bash
   node scripts/run-migration.js
   ```

2. **Migrate Existing Data**
   ```bash
   node scripts/migrate-vps-provider-data.js
   ```

3. **Verify Migration**
   - Check that existing instances have `provider_type='linode'`
   - Verify Linode provider exists in `service_providers`
   - Test existing VPS functionality

4. **Add DigitalOcean (Optional)**
   - Configure DigitalOcean provider in admin
   - Create DigitalOcean VPS plans
   - Test DigitalOcean VPS creation

## Testing

### Unit Tests

```bash
# Test provider factory
npm test -- api/services/providers/__tests__/ProviderFactory.test.ts

# Test error normalization
npm test -- api/services/providers/__tests__/errorNormalizer.test.ts

# Test caching
npm test -- api/services/providers/__tests__/providerResourceCache.test.ts
```

### Integration Tests

```bash
# Test DigitalOcean VPS creation
npm test -- api/routes/__tests__/vps.digitalocean.integration.test.ts
```

## Troubleshooting

### Provider Not Available

**Symptom**: Provider doesn't appear in provider selector

**Solutions**:
- Verify provider is marked as `active` in database
- Check API credentials are configured
- Validate credentials in admin interface

### API Errors

**Symptom**: Provider API calls fail

**Solutions**:
- Verify API token is correct and not expired
- Check provider account status
- Review rate limiting status
- Check provider API status page

### Cache Issues

**Symptom**: Stale data in dropdowns

**Solutions**:
- Update provider configuration to invalidate cache
- Wait for cache TTL to expire
- Restart application to clear cache

### Instance Creation Fails

**Symptom**: VPS creation fails with error

**Solutions**:
- Verify all required fields are provided
- Check provider account has sufficient resources
- Verify region/plan/image compatibility
- Review provider API error message

## Performance

### Caching Benefits

- **80-90% reduction** in API calls
- **~500ms to ~10ms** response time improvement
- **Rate limit protection** for high-traffic scenarios
- **Cost reduction** from fewer API calls

### Database Optimization

- Indexes on `provider_type` and `provider_id`
- Efficient joins with `service_providers` table
- Optimized queries for filtering by provider

### API Rate Limits

- **Linode**: 1,600 requests/hour per token
- **DigitalOcean**: 5,000 requests/hour, 250 requests/minute per token
- Automatic retry with exponential backoff

## Security

- API tokens stored encrypted in database
- Tokens never exposed in API responses
- Provider isolation ensures users can only access their own resources
- Input validation prevents injection attacks
- Rate limiting prevents abuse

## Best Practices

### For Administrators

1. **Use separate API tokens** for each environment (dev, staging, production)
2. **Monitor provider status** regularly
3. **Set up alerts** for provider API failures
4. **Review costs** regularly across providers
5. **Keep API tokens secure** and rotate periodically

### For Developers

1. **Always use the provider service layer** instead of calling provider APIs directly
2. **Handle errors gracefully** with user-friendly messages
3. **Leverage caching** to reduce API calls
4. **Test with multiple providers** to ensure compatibility
5. **Document provider-specific behavior** when adding new features

## Future Enhancements

- AWS EC2 support
- Google Cloud Compute Engine support
- Multi-provider cost comparison
- Automated failover between providers
- Provider-specific monitoring integrations
- Reserved instance management
- Automated right-sizing recommendations

## Support

### Documentation
- [Architecture Guide](./api/services/providers/ARCHITECTURE.md)
- [API Documentation](./api/services/providers/API_DOCUMENTATION.md)
- [DigitalOcean Configuration](./api/services/providers/DIGITALOCEAN_CONFIGURATION.md)

### Provider Documentation
- [Linode API](https://www.linode.com/docs/api/)
- [DigitalOcean API](https://docs.digitalocean.com/reference/api/)

### Community
- GitHub Issues
- Project Documentation
- Provider Support Channels

## License

See [LICENSE](./LICENSE) file for details.
