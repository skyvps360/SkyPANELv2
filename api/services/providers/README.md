# Provider Service Layer

This directory contains the provider service layer foundation for multi-provider VPS support. The architecture follows a factory pattern with a common interface that all provider implementations must follow.

## Documentation

- **[Architecture Guide](./ARCHITECTURE.md)** - Comprehensive architecture overview, design principles, and data flow
- **[API Documentation](./API_DOCUMENTATION.md)** - Complete API endpoint reference with request/response examples
- **[DigitalOcean Configuration](./DIGITALOCEAN_CONFIGURATION.md)** - DigitalOcean-specific setup and configuration guide
- **[Caching Documentation](./CACHING.md)** - Resource caching strategy and implementation details

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│                  (Routes, Controllers)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Provider Service Layer                      │
│                  (providerService.ts)                        │
│  - Database integration                                      │
│  - Credential management                                     │
│  - Provider instantiation                                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Provider Factory                          │
│                 (ProviderFactory.ts)                         │
│  - Creates provider instances based on type                  │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
┌──────────────────┐          ┌──────────────────┐
│ Linode Provider  │          │ DigitalOcean     │
│ Service          │          │ Provider Service │
└──────────────────┘          └──────────────────┘
         │                               │
         ▼                               ▼
┌──────────────────┐          ┌──────────────────┐
│ Linode API       │          │ DigitalOcean API │
└──────────────────┘          └──────────────────┘
```

## Components

### IProviderService (Interface)

Defines the contract that all provider implementations must follow:

- `getProviderType()` - Returns the provider type
- `createInstance()` - Creates a new VPS instance
- `getInstance()` - Gets details of a specific instance
- `listInstances()` - Lists all instances
- `performAction()` - Performs actions (boot, shutdown, reboot, delete)
- `getPlans()` - Gets available plans/sizes
- `getImages()` - Gets available OS images
- `getRegions()` - Gets available regions
- `validateCredentials()` - Validates API credentials

### BaseProviderService (Abstract Class)

Provides common functionality for all provider implementations:

- Token validation
- Error handling and normalization
- Standardized error creation
- Utility methods (sleep, etc.)

### ProviderFactory

Creates provider service instances based on provider type:

```typescript
const provider = ProviderFactory.createProvider('linode', apiToken);
```

Supported providers:
- `linode` - Linode/Akamai
- `digitalocean` - DigitalOcean

### Provider Implementations

#### LinodeProviderService

Wraps the existing `linodeService` with the `IProviderService` interface. Normalizes Linode-specific responses to the common format.

#### DigitalOceanProviderService

Wraps the existing `digitalOceanService` with the `IProviderService` interface. Normalizes DigitalOcean-specific responses to the common format.

### Error Normalization

The `errorNormalizer.ts` module provides utilities for standardizing error responses from different providers:

- `normalizeLinodeError()` - Normalizes Linode API errors
- `normalizeDigitalOceanError()` - Normalizes DigitalOcean API errors
- `parseErrorResponse()` - Parses fetch response errors
- `getUserFriendlyMessage()` - Converts error codes to user-friendly messages

### Provider Service (High-Level)

The `providerService.ts` module provides high-level functions for working with providers:

- `getProviderService(providerId)` - Gets a provider service by database ID
- `getProviderServiceByType(providerType)` - Gets a provider service by type
- `getActiveProviders()` - Lists all active providers
- `validateProviderCredentials(providerId)` - Validates provider credentials
- `getProviderInfo(providerId)` - Gets provider information

## Usage Examples

### Creating a VPS Instance

```typescript
import { getProviderService } from './services/providerService.js';

// Get provider service from database
const provider = await getProviderService(providerId);

// Create instance
const instance = await provider.createInstance({
  label: 'my-server',
  type: 'g6-nanode-1',
  region: 'us-east',
  image: 'linode/ubuntu22.04',
  rootPassword: 'secure-password',
  sshKeys: [],
  backups: false,
  privateIP: false,
});

console.log('Created instance:', instance.id);
```

### Listing Instances

```typescript
import { getProviderServiceByType } from './services/providerService.js';

// Get Linode provider
const provider = await getProviderServiceByType('linode');

// List all instances
const instances = await provider.listInstances();

instances.forEach(instance => {
  console.log(`${instance.label}: ${instance.status}`);
});
```

### Performing Actions

```typescript
import { getProviderService } from './services/providerService.js';

const provider = await getProviderService(providerId);

// Reboot instance
await provider.performAction(instanceId, 'reboot');

// Power off instance
await provider.performAction(instanceId, 'power_off');

// Delete instance
await provider.performAction(instanceId, 'delete');
```

### Getting Plans and Images

```typescript
import { getProviderServiceByType } from './services/providerService.js';

const provider = await getProviderServiceByType('digitalocean');

// Get available plans
const plans = await provider.getPlans();
console.log('Available plans:', plans.length);

// Get available images
const images = await provider.getImages();
console.log('Available images:', images.length);

// Get available regions
const regions = await provider.getRegions();
console.log('Available regions:', regions.length);
```

### Error Handling

```typescript
import { getProviderService } from './services/providerService.js';
import { getUserFriendlyMessage } from './services/providers/errorNormalizer.js';

try {
  const provider = await getProviderService(providerId);
  await provider.createInstance(params);
} catch (error) {
  if (error.code) {
    // Provider error
    const message = getUserFriendlyMessage(error);
    console.error('Provider error:', message);
  } else {
    // Generic error
    console.error('Error:', error.message);
  }
}
```

## Data Models

### ProviderInstance

Normalized instance representation:

```typescript
{
  id: string;
  label: string;
  status: 'running' | 'stopped' | 'provisioning' | 'rebooting' | 'error' | 'unknown';
  ipv4: string[];
  ipv6?: string;
  region: string;
  specs: {
    vcpus: number;
    memory: number; // MB
    disk: number; // GB
    transfer: number; // GB
  };
  created: string;
  image?: string;
  tags?: string[];
}
```

### ProviderPlan

Normalized plan representation:

```typescript
{
  id: string;
  label: string;
  vcpus: number;
  memory: number; // MB
  disk: number; // GB
  transfer: number; // GB
  price: {
    hourly: number;
    monthly: number;
  };
  regions: string[];
  type_class?: string;
}
```

### ProviderImage

Normalized image representation:

```typescript
{
  id: string;
  slug?: string;
  label: string;
  description?: string;
  distribution?: string;
  version?: string;
  minDiskSize?: number;
  public: boolean;
}
```

### ProviderRegion

Normalized region representation:

```typescript
{
  id: string;
  label: string;
  country?: string;
  available: boolean;
  capabilities?: string[];
}
```

## Testing

Tests are located in the `__tests__` directory:

- `ProviderFactory.test.ts` - Tests for the provider factory
- `errorNormalizer.test.ts` - Tests for error normalization

Run tests:

```bash
npm run test api/services/providers/__tests__/
```

## Adding New Providers

To add a new provider (e.g., AWS, GCP):

1. Create a new provider service class that extends `BaseProviderService`
2. Implement all methods from `IProviderService`
3. Add normalization methods for provider-specific responses
4. Update `ProviderFactory` to include the new provider
5. Add tests for the new provider
6. Update this README

Example:

```typescript
// AWSProviderService.ts
export class AWSProviderService extends BaseProviderService {
  constructor(apiToken: string) {
    super(apiToken, 'aws');
  }

  async createInstance(params: CreateInstanceParams): Promise<ProviderInstance> {
    // Implementation
  }

  // ... implement other methods
}
```

Then update `ProviderFactory.ts`:

```typescript
case 'aws':
  return new AWSProviderService(apiToken);
```

## Additional Documentation

For more detailed information, see:

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Complete architecture documentation with diagrams and design patterns
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Full API endpoint reference with examples
- **[DIGITALOCEAN_CONFIGURATION.md](./DIGITALOCEAN_CONFIGURATION.md)** - DigitalOcean-specific configuration guide
- **[CACHING.md](./CACHING.md)** - Caching strategy and implementation details

## Requirements Covered

This implementation covers the following requirements from the spec:

- **10.1**: Provider service layer abstracts API interactions
- **10.2**: Backend routes requests through provider service layer
- **10.3**: Provider service layer determines appropriate API client
- **10.4**: Provider-specific response formats are normalized
- **10.5**: Provider API call failures return standardized error responses
