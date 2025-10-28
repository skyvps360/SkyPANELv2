# DigitalOceanConfiguration Component

## Overview

The `DigitalOceanConfiguration` component provides a comprehensive configuration interface for DigitalOcean Droplet creation. It handles DigitalOcean-specific options while maintaining common VPS configuration fields like root password and SSH keys.

## Features

- **Root Password Management**: Required field with strength validation and visual feedback
- **SSH Key Selection**: Multi-select interface for existing SSH keys from DigitalOcean account
- **Backups**: Toggle for automatic weekly backups (+20% cost)
- **Monitoring**: Toggle for free detailed monitoring and alerting
- **IPv6**: Toggle for IPv6 address assignment
- **VPC Network**: Optional VPC selection filtered by region
- **Configuration Summary**: Real-time summary of selected options

## Usage

```tsx
import DigitalOceanConfiguration from '@/components/VPS/DigitalOceanConfiguration';
import { useState } from 'react';
import type { CreateVPSForm } from '@/types/vps';

function CreateVPSModal() {
  const [formData, setFormData] = useState<Partial<CreateVPSForm>>({
    rootPassword: '',
    sshKeys: [],
    backups: false,
    monitoring: true, // Recommended default
    ipv6: true, // Recommended default
    vpc_uuid: undefined
  });

  const handleChange = (updates: Partial<CreateVPSForm>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  return (
    <DigitalOceanConfiguration
      formData={formData}
      onChange={handleChange}
      token={authToken}
      region={selectedRegion} // e.g., 'nyc3'
    />
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `formData` | `Partial<CreateVPSForm>` | Yes | Current form state containing configuration values |
| `onChange` | `(updates: Partial<CreateVPSForm>) => void` | Yes | Callback to update form state with partial updates |
| `token` | `string` | Yes | Authentication token for API requests |
| `region` | `string` | No | Selected region to filter VPCs (e.g., 'nyc3', 'sfo3') |

## Form Data Structure

The component expects and updates the following fields in `CreateVPSForm`:

```typescript
{
  rootPassword: string;        // Required, validated for strength
  sshKeys: string[];          // Array of SSH key IDs
  backups: boolean;           // Enable automatic backups
  monitoring?: boolean;       // Enable monitoring (DigitalOcean-specific)
  ipv6?: boolean;            // Enable IPv6 (DigitalOcean-specific)
  vpc_uuid?: string;         // VPC network ID (DigitalOcean-specific)
}
```

## Password Validation

The component enforces strong password requirements:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

Password strength is displayed with a visual indicator:
- **Weak** (Red): Basic requirements not met
- **Medium** (Yellow): Meets basic requirements
- **Strong** (Green): Meets all requirements including special characters

## API Endpoints

The component makes requests to the following endpoints:

### SSH Keys
```
GET /api/vps/digitalocean/ssh-keys
Authorization: Bearer {token}

Response:
{
  ssh_keys: [
    {
      id: number,
      name: string,
      fingerprint: string,
      public_key: string
    }
  ]
}
```

### VPCs
```
GET /api/vps/digitalocean/vpcs?region={region}
Authorization: Bearer {token}

Response:
{
  vpcs: [
    {
      id: string,
      name: string,
      region: string,
      ip_range: string
    }
  ]
}
```

## Validation

Before submitting the form, ensure:

```typescript
function validateConfiguration(formData: Partial<CreateVPSForm>): boolean {
  // Root password is required and valid
  if (!formData.rootPassword || formData.rootPassword.length < 8) {
    return false;
  }
  
  // Password must meet strength requirements
  const hasUpper = /[A-Z]/.test(formData.rootPassword);
  const hasLower = /[a-z]/.test(formData.rootPassword);
  const hasNumber = /[0-9]/.test(formData.rootPassword);
  
  if (!hasUpper || !hasLower || !hasNumber) {
    return false;
  }
  
  return true;
}
```

## Integration with VPS Creation Flow

This component is designed to be used as Step 4 in the VPS creation modal when DigitalOcean is the selected provider:

```tsx
// In VPS.tsx or CreateVPSModal.tsx
{createStep === 4 && createForm.provider_type === 'digitalocean' && (
  <DigitalOceanConfiguration
    formData={createForm}
    onChange={(updates) => setCreateForm(prev => ({ ...prev, ...updates }))}
    token={token}
    region={createForm.region}
  />
)}
```

## Styling

The component uses Tailwind CSS and follows the application's design system:
- Consistent spacing with `space-y-*` utilities
- Responsive design with mobile-first approach
- Dark mode support via `dark:` variants
- Accessible form controls with proper labels and ARIA attributes

## Accessibility

- All form controls have associated labels
- Checkbox inputs are keyboard accessible
- Password visibility toggle has proper ARIA labels
- Loading states are indicated with spinners
- Error messages are clearly displayed

## Notes

- SSH keys and VPCs are optional and won't block VPS creation if unavailable
- The component gracefully handles API failures for optional resources
- VPC selection is automatically filtered by the selected region
- The configuration summary provides a quick overview before submission
- Backup costs are clearly indicated (+20% of Droplet cost)
- Monitoring is free and recommended for production workloads
