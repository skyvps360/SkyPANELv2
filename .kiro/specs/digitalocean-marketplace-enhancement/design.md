# Design Document

## Overview

This design enhances the DigitalOcean marketplace integration by replacing the current image-based approach with proper 1-Click Apps API integration. The solution involves modifying the `DigitalOceanService` backend service to use the official `/v2/1-clicks` endpoint, updating the API route handler, and ensuring the frontend `DigitalOceanMarketplace` component properly displays the expanded catalog.

The key architectural change is moving from fetching "application" type images (which returns a limited subset) to using the dedicated 1-Click Apps endpoint that provides the complete marketplace catalog with proper metadata, categorization, and version information.

## Architecture

### System Components

```mermaid
graph TD
    A[VPS Creation Modal] --> B[DigitalOceanMarketplace Component]
    B --> C[Frontend API Client]
    C --> D[/api/vps/digitalocean/marketplace Route]
    D --> E[DigitalOceanService]
    E --> F[DigitalOcean API /v2/1-clicks]
    
    B --> G[Search & Filter Logic]
    B --> H[Category Grouping]
    B --> I[App Selection Handler]
    
    style E fill:#e1f5ff
    style B fill:#fff4e1
    style D fill:#e8f5e9
```

### Data Flow

1. **Marketplace Loading**: When user reaches step 2 (Marketplace Apps) in VPS creation modal
   - `DigitalOceanMarketplace` component mounts and calls `fetchApps()`
   - Frontend makes GET request to `/api/vps/digitalocean/marketplace`
   - Backend route fetches DigitalOcean provider credentials from database
   - `DigitalOceanService.get1ClickApps()` calls `/v2/1-clicks?type=droplet`
   - Response is transformed to `MarketplaceApp[]` format
   - Apps are categorized and returned to frontend
   - Component renders apps grouped by category

2. **App Selection**: When user clicks on a marketplace app
   - `handleAppSelect()` is called with selected app
   - `onSelect()` callback updates parent form state with `appSlug` and `appData`
   - Selected app is visually highlighted with checkmark indicator
   - Form data is carried forward to subsequent steps

3. **VPS Creation**: When user completes the wizard and submits
   - Form data including `appSlug` is sent to VPS creation endpoint
   - Backend includes app slug in Droplet creation request
   - DigitalOcean provisions Droplet with 1-Click App pre-installed

## Components and Interfaces

### Backend Service Layer

#### DigitalOceanService.ts

**New Method: `get1ClickApps()`**

```typescript
/**
 * Get 1-Click Apps from DigitalOcean Marketplace
 * Uses the official /v2/1-clicks endpoint for complete catalog
 */
async get1ClickApps(apiToken: string): Promise<DigitalOceanMarketplaceApp[]> {
  try {
    if (!apiToken) throw new Error('DigitalOcean API token not provided');

    const data = await this.makeRequest<{ 
      '1_clicks': Array<{
        slug: string;
        type: string;
      }>
    }>(
      `${this.baseUrl}/1-clicks?type=droplet`,
      { method: 'GET' },
      apiToken
    );

    // Transform API response to MarketplaceApp format
    return (data['1_clicks'] || []).map(app => ({
      slug: app.slug,
      name: this.formatAppName(app.slug),
      description: this.getAppDescription(app.slug),
      category: this.getAppCategory(app.slug),
      image_slug: app.slug,
      compatible_images: [],
      type: app.type,
    }));
  } catch (error) {
    console.error('Error fetching DigitalOcean 1-Click Apps:', error);
    throw error;
  }
}
```

**Helper Methods**

```typescript
/**
 * Format app slug into human-readable name
 * Example: "wordpress-20-04" -> "WordPress 20.04"
 */
private formatAppName(slug: string): string {
  // Split on hyphens, capitalize words, handle version numbers
  return slug
    .split('-')
    .map(word => {
      // Keep version numbers as-is (e.g., "20", "04")
      if (/^\d+$/.test(word)) return word;
      // Capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Get category for app based on slug patterns
 * Uses common naming conventions in DigitalOcean marketplace
 */
private getAppCategory(slug: string): string {
  const slugLower = slug.toLowerCase();
  
  // Database apps
  if (slugLower.includes('mysql') || slugLower.includes('postgres') || 
      slugLower.includes('mongodb') || slugLower.includes('redis') ||
      slugLower.includes('mariadb')) {
    return 'Databases';
  }
  
  // CMS platforms
  if (slugLower.includes('wordpress') || slugLower.includes('drupal') ||
      slugLower.includes('joomla') || slugLower.includes('ghost')) {
    return 'CMS';
  }
  
  // Container platforms
  if (slugLower.includes('docker') || slugLower.includes('kubernetes') ||
      slugLower.includes('k3s')) {
    return 'Containers';
  }
  
  // Development frameworks
  if (slugLower.includes('node') || slugLower.includes('ruby') ||
      slugLower.includes('python') || slugLower.includes('php') ||
      slugLower.includes('django') || slugLower.includes('rails')) {
    return 'Development';
  }
  
  // Monitoring & Analytics
  if (slugLower.includes('monitoring') || slugLower.includes('grafana') ||
      slugLower.includes('prometheus') || slugLower.includes('elk')) {
    return 'Monitoring';
  }
  
  // Web servers
  if (slugLower.includes('nginx') || slugLower.includes('apache') ||
      slugLower.includes('caddy')) {
    return 'Web Servers';
  }
  
  return 'Other';
}

/**
 * Get description for app based on slug
 * Provides basic descriptions for common apps
 */
private getAppDescription(slug: string): string {
  const descriptions: Record<string, string> = {
    'wordpress': 'Popular open-source CMS for websites and blogs',
    'docker': 'Container platform for building and deploying applications',
    'mongodb': 'NoSQL document database',
    'mysql': 'Open-source relational database',
    'nodejs': 'JavaScript runtime for server-side applications',
    'lemp': 'Linux, Nginx, MySQL, PHP stack',
    'lamp': 'Linux, Apache, MySQL, PHP stack',
    // Add more as needed
  };
  
  // Try exact match first
  const baseSlug = slug.split('-')[0];
  return descriptions[baseSlug] || 'Pre-configured marketplace application';
}
```

**Methods to Remove**

- `getMarketplaceApps()` - Replaced by `get1ClickApps()`
- `categorizeApp()` - Replaced by `getAppCategory()`

### API Route Layer

#### api/routes/vps.ts

**Updated Route Handler**

```typescript
router.get(
  "/digitalocean/marketplace",
  async (_req: Request, res: Response) => {
    try {
      // Fetch the DigitalOcean provider configuration
      const providerResult = await query(
        "SELECT api_key_encrypted FROM service_providers WHERE type = 'digitalocean' AND active = true LIMIT 1"
      );

      if (providerResult.rows.length === 0) {
        res.status(503).json({
          error: {
            code: "MISSING_CREDENTIALS",
            message: "DigitalOcean provider is not configured or inactive.",
            provider: "digitalocean",
          },
        });
        return;
      }

      const apiToken = providerResult.rows[0].api_key_encrypted;

      // Import DigitalOcean service
      const { digitalOceanService } = await import(
        "../services/DigitalOceanService.js"
      );

      // Fetch 1-Click Apps using new method
      const apps = await digitalOceanService.get1ClickApps(apiToken);

      // Group apps by category for better organization
      const categorizedApps: Record<string, any[]> = {};
      apps.forEach((app: any) => {
        const category = app.category || "Other";
        if (!categorizedApps[category]) {
          categorizedApps[category] = [];
        }
        categorizedApps[category].push(app);
      });

      res.json({
        apps,
        categorized: categorizedApps,
        total: apps.length,
      });
    } catch (err: any) {
      console.error("DigitalOcean marketplace fetch error:", err);

      // Determine appropriate status code
      const statusCode = err.status || err.statusCode || 500;

      res.status(statusCode).json({
        error: {
          code: err.code || "API_ERROR",
          message:
            err.message || "Failed to fetch DigitalOcean marketplace apps",
          provider: "digitalocean",
        },
      });
    }
  }
);
```

### Frontend Component Layer

#### DigitalOceanMarketplace.tsx

**No structural changes required** - The component already has the correct structure:
- Search functionality across name, description, and category
- Category-based grouping and display
- App selection with visual feedback
- Error handling with retry capability
- Loading states

The component will automatically benefit from the expanded catalog once the backend changes are deployed.

## Data Models

### MarketplaceApp Interface

```typescript
interface MarketplaceApp {
  slug: string;              // Unique identifier (e.g., "wordpress-20-04")
  name: string;              // Human-readable name (e.g., "WordPress 20.04")
  description: string;       // App description
  category: string;          // Category for grouping (e.g., "CMS", "Databases")
  image_slug: string;        // Image identifier for deployment
  compatible_images?: string[]; // Compatible base images (optional)
  type: string;              // App type (e.g., "droplet", "kubernetes")
}
```

### DigitalOcean API Response

```typescript
// Response from /v2/1-clicks?type=droplet
interface OneClickAppsResponse {
  '1_clicks': Array<{
    slug: string;    // e.g., "wordpress-20-04"
    type: string;    // e.g., "droplet"
  }>;
}
```

### VPS Form Data

```typescript
interface CreateVPSForm {
  // ... existing fields
  appSlug?: string | null;           // Selected marketplace app slug
  appData?: MarketplaceApp | null;   // Full app metadata
  // ... other fields
}
```

## Error Handling

### Backend Error Scenarios

1. **Missing API Token**
   - Thrown by: `get1ClickApps()`
   - Error: `"DigitalOcean API token not provided"`
   - HTTP Status: 500

2. **API Request Failure**
   - Thrown by: `makeRequest()`
   - Includes: HTTP status code, error message from DigitalOcean
   - Retry logic: Up to 3 retries with exponential backoff for rate limits

3. **Provider Not Configured**
   - Thrown by: API route
   - Error code: `"MISSING_CREDENTIALS"`
   - HTTP Status: 503

### Frontend Error Handling

1. **Network Errors**
   - Display: `ProviderErrorDisplay` component
   - Action: Retry button to re-fetch apps

2. **Empty Results**
   - Display: "No marketplace apps found" message
   - Action: Clear search button (if search is active)

3. **Loading States**
   - Display: Spinner with "Loading marketplace apps..." message

## Testing Strategy

### Unit Tests

1. **DigitalOceanService.get1ClickApps()**
   - Test successful API response transformation
   - Test error handling for missing token
   - Test error handling for API failures
   - Mock `makeRequest()` to avoid actual API calls

2. **Helper Methods**
   - `formatAppName()`: Test slug-to-name conversion
   - `getAppCategory()`: Test category assignment logic
   - `getAppDescription()`: Test description lookup

### Integration Tests

1. **API Route `/digitalocean/marketplace`**
   - Test successful marketplace fetch
   - Test error when provider not configured
   - Test error handling for service failures
   - Verify response structure (apps, categorized, total)

2. **Frontend Component**
   - Test app rendering with mock data
   - Test search functionality
   - Test category grouping
   - Test app selection
   - Test error display and retry

### Manual Testing

1. **Marketplace Display**
   - Verify expanded catalog shows 50+ apps
   - Verify apps are properly categorized
   - Verify search works across all fields
   - Verify "None" option is available

2. **VPS Creation Flow**
   - Select marketplace app and complete wizard
   - Verify app slug is included in creation request
   - Verify Droplet is provisioned with selected app

3. **Error Scenarios**
   - Test with invalid API token
   - Test with inactive provider
   - Test retry functionality

## Migration Notes

### Backward Compatibility

- The `MarketplaceApp` interface remains unchanged
- The API route path `/digitalocean/marketplace` remains unchanged
- The frontend component interface remains unchanged
- Existing VPS instances are not affected

### Deployment Steps

1. Deploy backend changes (service + route)
2. Verify marketplace endpoint returns expanded catalog
3. Frontend automatically picks up new data (no changes needed)
4. Monitor error logs for any API issues

### Rollback Plan

If issues arise:
1. Revert `DigitalOceanService.ts` to use `getMarketplaceApps()`
2. Revert API route to call `getMarketplaceApps()`
3. System returns to previous image-based approach
