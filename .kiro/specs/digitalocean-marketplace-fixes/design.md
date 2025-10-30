# Design Document

## Overview

This design addresses three critical issues in the marketplace application management system:

1. **Type Filtering**: Ensure only Droplet 1-click apps are shown (exclude Kubernetes apps)
2. **Name Normalization**: Properly format application names by removing vendor prefixes and using proper display names
3. **Category Accuracy**: Correctly categorize applications based on their actual purpose
4. **Provider Name Display**: Use admin-configured provider names instead of hardcoded provider types

The solution involves refactoring the DigitalOceanService's marketplace app processing logic and updating the MarketplaceManager UI component to use provider display names.

## Architecture

### Component Overview

```
┌─────────────────────────────────────┐
│   MarketplaceManager (Frontend)     │
│  - Displays provider display name   │
│  - Shows filtered/formatted apps    │
└──────────────┬──────────────────────┘
               │
               │ API Request
               ▼
┌─────────────────────────────────────┐
│  Admin Marketplace Route (Backend)  │
│  - Fetches provider config          │
│  - Calls provider service           │
└──────────────┬──────────────────────┘
               │
               │ Service Call
               ▼
┌─────────────────────────────────────┐
│   DigitalOceanService               │
│  - Fetches 1-click apps from API    │
│  - Filters by type=droplet          │
│  - Normalizes names & categories    │
│  - Returns formatted app list       │
└─────────────────────────────────────┘
```

### Data Flow

1. Admin selects a provider in MarketplaceManager
2. Frontend requests marketplace config from `/api/admin/providers/:id/marketplace`
3. Backend fetches provider details and calls `getMarketplaceApps()`
4. DigitalOceanService:
   - Requests apps from DigitalOcean API with `?type=droplet` filter
   - Processes each app through normalization pipeline
   - Returns formatted app list
5. Backend combines with saved marketplace config
6. Frontend displays apps with provider display name

## Components and Interfaces

### 1. DigitalOceanService Enhancements

#### Type Filtering

The API request already includes `?type=droplet` parameter, but we need to add additional validation:

```typescript
// In getMarketplaceApps()
const data = await this.makeRequest<{
  '1_clicks': RawDigitalOcean1ClickApp[];
}>(
  `${this.baseUrl}/1-clicks?type=droplet`,
  { method: 'GET' },
  apiToken
);

// Add explicit type filtering after receiving data
return apps
  .filter((app) => {
    const appType = this.normalizeString(app.type)?.toLowerCase();
    // Only include droplet apps, exclude kubernetes
    return appType === 'droplet' || !appType; // Default to droplet if type missing
  })
  .map((app) => {
    // ... existing mapping logic
  });
```

#### Name Normalization Pipeline

Create a comprehensive name mapping system:

```typescript
private readonly APP_NAME_MAP: Record<string, string> = {
  // Vendor-prefixed apps
  'sharklabs-openwebui': 'OpenWebUI',
  'sharklabs-piholevpn': 'Pi-hole + VPN',
  'sharklabs-counterstrike2': 'Counter-Strike 2 Server',
  'sharklabs-erpodoo': 'Odoo ERP',
  'sharklabs-conduktorconsole': 'Conduktor Console',
  'sharklabs-foldinghome': 'Folding@home',
  'sharklabs-ollamawithopenwe': 'Ollama with OpenWebUI',
  
  // Standard apps (comprehensive list)
  'openwebui': 'OpenWebUI',
  'ollama': 'Ollama',
  'jupyter': 'Jupyter Notebook',
  'pihole': 'Pi-hole',
  'openvpn': 'OpenVPN',
  'wireguard': 'WireGuard',
  'wordpress': 'WordPress',
  'nextcloud': 'Nextcloud',
  'docker': 'Docker',
  'nginx': 'Nginx',
  'apache': 'Apache',
  'mysql': 'MySQL',
  'postgresql': 'PostgreSQL',
  'mongodb': 'MongoDB',
  'redis': 'Redis',
  'nodejs': 'Node.js',
  // ... (expand with all known apps)
};

private formatAppName(slug: string): string {
  const lowerSlug = slug.toLowerCase();
  
  // 1. Check exact match
  if (this.APP_NAME_MAP[lowerSlug]) {
    return this.APP_NAME_MAP[lowerSlug];
  }
  
  // 2. Check partial matches (for versioned apps)
  for (const [key, name] of Object.entries(this.APP_NAME_MAP)) {
    if (lowerSlug.startsWith(key + '-') || lowerSlug.includes(key)) {
      // Extract version if present
      const versionMatch = slug.match(/-(\d+)-?(\d+)?/);
      if (versionMatch) {
        const version = versionMatch[2] 
          ? `${versionMatch[1]}.${versionMatch[2]}` 
          : versionMatch[1];
        return `${name} ${version}`;
      }
      return name;
    }
  }
  
  // 3. Fallback: capitalize and format
  return this.capitalizeSlug(slug);
}

private capitalizeSlug(slug: string): string {
  return slug
    .split('-')
    .map(word => {
      if (/^\d+$/.test(word)) return word; // Keep numbers
      if (['js', 'ui', 'api', 'cms', 'vpn', 'sql'].includes(word.toLowerCase())) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}
```

#### Category Mapping System

Create a two-tier categorization system:

```typescript
private readonly APP_CATEGORY_MAP: Record<string, string> = {
  // AI/ML Tools
  'sharklabs-openwebui': 'Development',
  'openwebui': 'Development',
  'ollama': 'Development',
  'jupyter': 'Development',
  
  // Security/VPN
  'sharklabs-piholevpn': 'Security',
  'pihole': 'Security',
  'openvpn': 'Security',
  'wireguard': 'Security',
  'vault': 'Security',
  'bitwarden': 'Security',
  
  // Gaming
  'sharklabs-counterstrike2': 'Gaming',
  'minecraft': 'Gaming',
  'terraria': 'Gaming',
  'csgo': 'Gaming',
  'valheim': 'Gaming',
  
  // Business/ERP
  'sharklabs-erpodoo': 'Productivity',
  'odoo': 'Productivity',
  'erpnext': 'Productivity',
  
  // ... (comprehensive mapping)
};

private getAppCategory(slug: string): string {
  const lowerSlug = slug.toLowerCase();
  
  // 1. Check exact match in category map
  if (this.APP_CATEGORY_MAP[lowerSlug]) {
    return this.APP_CATEGORY_MAP[lowerSlug];
  }
  
  // 2. Check partial matches
  for (const [key, category] of Object.entries(this.APP_CATEGORY_MAP)) {
    if (lowerSlug.startsWith(key + '-') || lowerSlug.includes(key)) {
      return category;
    }
  }
  
  // 3. Pattern-based categorization (fallback)
  return this.categorizeByPattern(lowerSlug);
}

private categorizeByPattern(slug: string): string {
  // Database patterns
  if (/mysql|postgres|mongodb|redis|mariadb|cassandra|influxdb/.test(slug)) {
    return 'Databases';
  }
  
  // CMS patterns
  if (/wordpress|drupal|joomla|ghost|strapi/.test(slug)) {
    return 'CMS';
  }
  
  // Container patterns
  if (/docker|kubernetes|k3s|rancher|portainer/.test(slug)) {
    return 'Containers';
  }
  
  // Development patterns
  if (/node|ruby|python|php|django|rails|laravel/.test(slug)) {
    return 'Development';
  }
  
  // Security patterns (excluding gaming)
  if (/vpn|security|auth|vault|firewall/.test(slug) && !/game|server/.test(slug)) {
    return 'Security';
  }
  
  // Gaming patterns (explicit)
  if (/game|minecraft|terraria|csgo|counter.*strike|valheim|ark|rust/.test(slug)) {
    return 'Gaming';
  }
  
  // Monitoring patterns
  if (/monitor|grafana|prometheus|elk|kibana|nagios/.test(slug)) {
    return 'Monitoring';
  }
  
  // Web server patterns
  if (/nginx|apache|caddy|traefik|haproxy|lemp|lamp/.test(slug)) {
    return 'Web Servers';
  }
  
  // E-commerce patterns
  if (/magento|shopify|woocommerce|prestashop|commerce|shop/.test(slug)) {
    return 'E-commerce';
  }
  
  // Communication patterns
  if (/mattermost|rocket|slack|matrix|jitsi|nextcloud|chat|meet/.test(slug)) {
    return 'Communication';
  }
  
  // Media patterns
  if (/plex|jellyfin|emby|media|streaming/.test(slug)) {
    return 'Media';
  }
  
  return 'Other';
}
```

#### Description Mapping

```typescript
private readonly APP_DESCRIPTION_MAP: Record<string, string> = {
  // AI/ML
  'sharklabs-openwebui': 'Web interface for running AI models locally with Ollama',
  'openwebui': 'Web interface for running AI models locally',
  'ollama': 'Run large language models locally',
  
  // Security
  'sharklabs-piholevpn': 'Network-wide ad blocker with VPN capabilities',
  'pihole': 'Network-wide ad blocker and DNS sinkhole',
  'openvpn': 'Open-source VPN solution for secure connections',
  
  // Gaming
  'sharklabs-counterstrike2': 'Counter-Strike 2 dedicated game server',
  'minecraft': 'Minecraft dedicated game server',
  
  // ... (comprehensive descriptions)
};

private getAppDescription(slug: string): string {
  const lowerSlug = slug.toLowerCase();
  
  // Check exact match
  if (this.APP_DESCRIPTION_MAP[lowerSlug]) {
    return this.APP_DESCRIPTION_MAP[lowerSlug];
  }
  
  // Check partial matches
  for (const [key, description] of Object.entries(this.APP_DESCRIPTION_MAP)) {
    if (lowerSlug.startsWith(key + '-') || lowerSlug.includes(key)) {
      return description;
    }
  }
  
  return 'Pre-configured marketplace application ready for deployment';
}
```

### 2. MarketplaceManager UI Updates

Update the component to use provider display names instead of hardcoded "DigitalOcean":

```typescript
// Current state includes provider info
const [selectedProvider, setSelectedProvider] = useState<ProviderSummary | null>(null);

// Update when provider is selected
const handleProviderChange = (providerId: string) => {
  setSelectedProviderId(providerId);
  const provider = providers.find(p => p.id === providerId);
  setSelectedProvider(provider || null);
};

// Use provider display name in UI
<CardTitle>
  {selectedProvider ? `${selectedProvider.name} Marketplace Controls` : 'Marketplace Controls'}
</CardTitle>

<CardDescription>
  {selectedProvider 
    ? `Allow or block marketplace applications for ${selectedProvider.name}`
    : 'Allow or block marketplace applications for provisioning'
  }
</CardDescription>
```

## Data Models

### RawDigitalOcean1ClickApp (Input from API)

```typescript
type RawDigitalOcean1ClickApp = {
  slug?: string;
  type?: string;  // 'droplet' or 'kubernetes'
  name?: string;
  description?: string;
  summary?: string;
  group_description?: string;
  short_description?: string;
  categories?: unknown;
  category?: string;
  badge?: string;
  vendor?: string;
  vendor_name?: string;
  image_slug?: string;
  icon_slug?: string;
  icon?: string;
  compatible_images?: unknown;
  compatible_distro_slugs?: unknown;
  links?: Record<string, any>;
  [key: string]: unknown;
};
```

### DigitalOceanMarketplaceApp (Output)

```typescript
export interface DigitalOceanMarketplaceApp {
  slug: string;
  name: string;
  description: string;
  category: string;
  categories?: string[];
  image_slug: string;
  compatible_images?: string[];
  type: string;  // Always 'droplet' after filtering
  badge?: string;
  vendor?: string;
  links?: Record<string, any>;
}
```

## Error Handling

### Type Filtering Errors

```typescript
// Log when non-droplet apps are filtered out
.filter((app) => {
  const appType = this.normalizeString(app.type)?.toLowerCase();
  const isDroplet = appType === 'droplet' || !appType;
  
  if (!isDroplet) {
    console.debug(`Filtered out non-droplet app: ${app.slug} (type: ${appType})`);
  }
  
  return isDroplet;
})
```

### Unmapped Vendor Apps Warning

```typescript
private formatAppName(slug: string): string {
  const lowerSlug = slug.toLowerCase();
  
  // Check for vendor prefixes that aren't mapped
  if (lowerSlug.includes('-') && !this.APP_NAME_MAP[lowerSlug]) {
    const prefix = lowerSlug.split('-')[0];
    if (['sharklabs', 'digitalocean', 'do'].includes(prefix)) {
      console.warn(`Unmapped vendor app detected: ${slug}. Consider adding to APP_NAME_MAP.`);
    }
  }
  
  // ... rest of logic
}
```

### API Response Validation

```typescript
// Validate that we're actually getting droplet apps
const apps = Array.isArray(data['1_clicks']) ? data['1_clicks'] : [];

if (apps.length === 0) {
  console.warn('No 1-click apps returned from DigitalOcean API');
}

const nonDropletCount = apps.filter(app => 
  app.type && app.type.toLowerCase() !== 'droplet'
).length;

if (nonDropletCount > 0) {
  console.warn(`Received ${nonDropletCount} non-droplet apps despite type=droplet filter`);
}
```

## Testing Strategy

### Unit Tests

1. **Type Filtering Tests**
   - Verify droplet apps are included
   - Verify kubernetes apps are excluded
   - Verify apps without type default to droplet

2. **Name Normalization Tests**
   - Test exact matches from APP_NAME_MAP
   - Test partial matches with versions
   - Test vendor prefix removal
   - Test fallback capitalization

3. **Category Mapping Tests**
   - Test exact category matches
   - Test partial matches
   - Test pattern-based categorization
   - Verify gaming apps aren't miscategorized as security

4. **Description Tests**
   - Test exact description matches
   - Test partial matches
   - Test fallback description

### Integration Tests

1. **API Response Processing**
   - Mock DigitalOcean API response with mixed app types
   - Verify only droplet apps are returned
   - Verify all apps have proper names and categories

2. **UI Display Tests**
   - Verify provider display name is shown
   - Verify no hardcoded "DigitalOcean" references
   - Verify apps display with correct formatting

### Manual Testing Checklist

1. Select a DigitalOcean provider in marketplace manager
2. Verify provider's custom name is displayed (not "DigitalOcean")
3. Verify "OpenWebUI" appears (not "sharklabs-openwebui")
4. Verify "Pi-hole + VPN" is in Security category (not Gaming)
5. Verify "Counter-Strike 2 Server" is in Gaming category
6. Verify no Kubernetes apps appear in the list
7. Search for specific apps and verify correct categorization
8. Filter by category and verify apps are correctly grouped

## Implementation Notes

### Mapping Data Maintenance

All mapping data structures (APP_NAME_MAP, APP_CATEGORY_MAP, APP_DESCRIPTION_MAP) should be:
- Defined as private readonly class properties
- Organized by functional groups with comments
- Easy to extend without modifying core logic
- Alphabetically sorted within groups for maintainability

### Performance Considerations

- Mapping lookups are O(1) for exact matches
- Partial matching requires iteration but only for unmapped apps
- Pattern-based categorization is fallback only
- All processing happens once during API response transformation

### Future Extensibility

This design can be extended to support:
- Linode marketplace apps with similar mapping structures
- Admin-configurable app mappings via database
- Automatic mapping updates from external sources
- Multi-language app names and descriptions
