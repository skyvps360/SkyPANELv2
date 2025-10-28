# DigitalOceanOSSelection Component

A React component for selecting DigitalOcean operating system images during VPS creation.

## Features

- Fetches OS images from `/api/vps/digitalocean/images` endpoint
- Groups images by distribution family (Ubuntu, Debian, CentOS, etc.)
- Search functionality to filter images by name, distribution, or slug
- Marketplace app compatibility filtering
- Visual distribution icons with color coding
- Responsive grid layout
- Loading and error states

## Props

```typescript
interface DigitalOceanOSSelectionProps {
  selectedImage: string | null;           // Currently selected image slug
  onSelect: (imageSlug: string) => void;  // Callback when image is selected
  compatibleWith?: string[];              // Optional: filter by marketplace app compatibility
  token: string;                          // JWT authentication token
}
```

## Usage

### Basic Usage

```tsx
import DigitalOceanOSSelection from '@/components/VPS/DigitalOceanOSSelection';

function VPSCreationModal() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const token = localStorage.getItem('token') || '';

  return (
    <DigitalOceanOSSelection
      selectedImage={selectedImage}
      onSelect={(imageSlug) => setSelectedImage(imageSlug)}
      token={token}
    />
  );
}
```

### With Marketplace App Compatibility

```tsx
import DigitalOceanOSSelection from '@/components/VPS/DigitalOceanOSSelection';

function VPSCreationModal() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const token = localStorage.getItem('token') || '';

  return (
    <DigitalOceanOSSelection
      selectedImage={selectedImage}
      onSelect={(imageSlug) => setSelectedImage(imageSlug)}
      compatibleWith={selectedApp?.compatible_images}
      token={token}
    />
  );
}
```

## API Response Format

The component expects the `/api/vps/digitalocean/images` endpoint to return:

```json
{
  "images": [
    {
      "id": 123456,
      "slug": "ubuntu-22-04-x64",
      "name": "Ubuntu 22.04 x64",
      "distribution": "Ubuntu",
      "description": "Ubuntu 22.04 LTS",
      "type": "base",
      "public": true,
      "min_disk_size": 15,
      "size_gigabytes": 2.5,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "grouped": {
    "Ubuntu": [...],
    "Debian": [...]
  },
  "total": 50
}
```

## Distribution Color Mapping

The component uses predefined colors for common distributions:

- Ubuntu: Orange to Red
- Debian: Red to Gray
- CentOS: Emerald
- Rocky Linux: Green to Emerald
- AlmaLinux: Rose to Pink
- Fedora: Blue to Indigo
- Alpine: Cyan to Sky
- Arch Linux: Sky to Blue
- openSUSE: Lime to Green
- Gentoo: Purple to Violet
- FreeBSD: Red to Orange

## Requirements Addressed

This component addresses the following requirements from the spec:

- **3.1**: Displays DigitalOcean OS images when provider is selected
- **3.2**: Fetches images from backend API endpoint
- **3.3**: Groups images by distribution family
- **3.4**: Filters by marketplace app compatibility
- **3.5**: Provides error handling and retry functionality
