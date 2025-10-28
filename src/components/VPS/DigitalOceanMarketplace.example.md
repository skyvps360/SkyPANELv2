# DigitalOcean Marketplace Component

## Overview
This component displays DigitalOcean 1-Click marketplace applications grouped by category, allowing users to select an app for deployment during VPS creation.

## Features
- Fetches marketplace apps from `/api/vps/digitalocean/marketplace`
- Groups apps by category (CMS, Databases, Development, etc.)
- Search functionality to filter apps
- "None" option to provision without a marketplace app
- Loading and error states
- Responsive grid layout

## Usage

```tsx
import DigitalOceanMarketplace from '@/components/VPS/DigitalOceanMarketplace';

function VPSCreationStep2() {
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [appData, setAppData] = useState<any>(null);
  const { token } = useAuth();

  const handleAppSelect = (appSlug: string | null, app: any) => {
    setSelectedApp(appSlug);
    setAppData(app);
  };

  return (
    <DigitalOceanMarketplace
      selectedApp={selectedApp}
      onSelect={handleAppSelect}
      token={token}
    />
  );
}
```

## Props

- `selectedApp`: Currently selected app slug (or null for none)
- `onSelect`: Callback when an app is selected, receives (appSlug, appData)
- `token`: Authentication token for API requests

## API Response Format

The component expects the following response from `/api/vps/digitalocean/marketplace`:

```json
{
  "apps": [
    {
      "slug": "wordpress-20-04",
      "name": "WordPress",
      "description": "WordPress is a popular content management system",
      "category": "CMS",
      "image_slug": "wordpress-20-04",
      "compatible_images": [],
      "type": "application"
    }
  ],
  "categorized": {
    "CMS": [...],
    "Databases": [...],
    "Development": [...]
  },
  "total": 50
}
```

## Integration with VPS Creation Flow

This component should be used in Step 2 of the VPS creation modal when the user has selected DigitalOcean as their provider. It replaces the Linode StackScripts component for DigitalOcean instances.

The selected app data should be included in the VPS creation request:

```typescript
const body = {
  provider_id: createForm.provider_id,
  provider_type: 'digitalocean',
  label: createForm.label,
  type: createForm.type,
  region: createForm.region,
  image: createForm.image,
  rootPassword: createForm.rootPassword,
  appSlug: selectedApp,
  appData: appData,
  // ... other fields
};
```
