# VPS Detail Page Documentation

## Overview
The VPS Detail Page provides comprehensive management capabilities for individual VPS instances through the Linode API. Located at `/vps/:id`, this page offers full control over VPS lifecycle, configuration, monitoring, and maintenance.

## Features Implemented

### 1. Instance Information
- Real-time status monitoring (running, stopped, provisioning, etc.)
- Instance specifications (vCPUs, RAM, Storage, Transfer)
- Network information (IPv4, IPv6 addresses)
- Region and image details
- Pricing information (hourly/monthly)

### 2. Quick Actions Panel
Users can perform common operations directly from the top action bar:
- **Boot** - Start a stopped instance
- **Shutdown** - Gracefully shutdown a running instance
- **Reboot** - Restart the instance
- **Resize** - Change instance plan/size
- **Rebuild** - Reinstall with a new image
- **Clone** - Create a copy of the instance
- **Reset Password** - Reset root password
- **Delete** - Permanently remove the instance

### 3. Tabbed Interface

#### Overview Tab
- Visual display of instance specifications (CPU, Memory, Disk, Transfer)
- Detailed instance information including:
  - Label and Provider ID
  - IP addresses (IPv4 and IPv6)
  - Region and image
  - Creation date
  - Backup status
  - Monthly cost

#### Statistics Tab
- Real-time performance metrics
- CPU usage statistics
- Network I/O data
- Disk I/O statistics
- Historical data visualization

#### Network Tab
- List of IPv4 addresses (public and private)
- IPv6 configuration
- RDNS settings
- Ability to allocate additional IP addresses

#### Disks Tab
- View all attached disks
- Disk size and filesystem information
- Disk status (ready, active, etc.)
- Create new disks
- Resize existing disks
- Delete disks

#### Backups Tab
- Enable/disable automatic backups
- Create manual snapshots
- View backup schedule
- List of automatic backups
- Restore from backups
- Cancel backup service

#### Configurations Tab
- View configuration profiles
- Kernel and boot settings
- Root device configuration
- Interface settings

#### Volumes Tab
- List attached block storage volumes
- Volume size and status
- Filesystem paths
- Attach/detach volumes

## API Endpoints

All endpoints are prefixed with `/api/vps/:id`

### Instance Management
- `GET /api/vps/:id` - Get instance details
- `PUT /api/vps/:id` - Update instance settings
- `DELETE /api/vps/:id` - Delete instance
- `POST /api/vps/:id/boot` - Boot instance
- `POST /api/vps/:id/shutdown` - Shutdown instance
- `POST /api/vps/:id/reboot` - Reboot instance

### Advanced Operations
- `POST /api/vps/:id/resize` - Resize instance
- `POST /api/vps/:id/rebuild` - Rebuild with new image
- `POST /api/vps/:id/rescue` - Boot into rescue mode
- `POST /api/vps/:id/clone` - Clone instance
- `POST /api/vps/:id/migrate` - Migrate to new datacenter
- `POST /api/vps/:id/mutate` - Upgrade instance type
- `POST /api/vps/:id/password` - Reset root password

### Monitoring & Stats
- `GET /api/vps/:id/stats` - Get performance statistics
- `GET /api/vps/:id/transfer` - Get network transfer data

### Backups
- `GET /api/vps/:id/backups` - List backups
- `POST /api/vps/:id/backups/enable` - Enable backups
- `POST /api/vps/:id/backups/cancel` - Cancel backup service
- `POST /api/vps/:id/backups/snapshot` - Create manual snapshot
- `POST /api/vps/:id/backups/:backupId/restore` - Restore from backup

### Storage Management
- `GET /api/vps/:id/disks` - List disks
- `POST /api/vps/:id/disks` - Create new disk
- `DELETE /api/vps/:id/disks/:diskId` - Delete disk
- `POST /api/vps/:id/disks/:diskId/resize` - Resize disk

### Configuration
- `GET /api/vps/:id/configs` - List configuration profiles

### Networking
- `GET /api/vps/:id/ips` - Get IP addresses
- `POST /api/vps/:id/ips` - Allocate new IP address

### Volumes
- `GET /api/vps/:id/volumes` - List attached volumes

## Backend Service Methods

The following methods were added to `linodeService.ts`:

### Instance Operations
- `resizeLinodeInstance(instanceId, type)` - Resize to different plan
- `rebuildLinodeInstance(instanceId, params)` - Rebuild with new image
- `rescueLinodeInstance(instanceId, devices?)` - Boot into rescue mode
- `cloneLinodeInstance(instanceId, params)` - Clone to new instance
- `migrateLinodeInstance(instanceId, params?)` - Migrate datacenter
- `mutateLinodeInstance(instanceId)` - Upgrade instance type
- `resetLinodePassword(instanceId, rootPass)` - Reset root password
- `updateLinodeInstance(instanceId, params)` - Update settings

### Monitoring
- `getLinodeStats(instanceId)` - Get performance statistics
- `getLinodeTransfer(instanceId)` - Get transfer data

### Backups
- `getLinodeBackups(instanceId)` - List backups
- `enableLinodeBackups(instanceId)` - Enable backup service
- `cancelLinodeBackups(instanceId)` - Cancel backups
- `createLinodeSnapshot(instanceId, label)` - Create snapshot
- `restoreLinodeBackup(instanceId, backupId, params?)` - Restore backup

### Storage
- `getLinodeDisks(instanceId)` - List disks
- `createLinodeDisk(instanceId, params)` - Create disk
- `deleteLinodeDisk(instanceId, diskId)` - Delete disk
- `resizeLinodeDisk(instanceId, diskId, size)` - Resize disk

### Configuration & Networking
- `getLinodeConfigs(instanceId)` - List configurations
- `getLinodeIPs(instanceId)` - Get IP addresses
- `allocateLinodeIP(instanceId, params)` - Allocate new IP
- `getLinodeVolumes(instanceId)` - List volumes

## User Interface Components

### Status Indicators
- Color-coded status badges (green=running, gray=stopped, yellow=provisioning, red=error)
- Real-time status updates after actions

### Action Buttons
- Context-aware buttons based on current state
- Disabled state during operations
- Visual feedback with icons

### Data Display
- Formatted byte sizes (B, KB, MB, GB, TB)
- Human-readable dates
- Organized card layouts for specifications

### Loading States
- Spinner during initial page load
- Action loading indicators
- Skeleton screens for data fetching

### Error Handling
- Toast notifications for success/error messages
- Confirmation dialogs for destructive actions
- Error recovery suggestions

## Activity Logging

All VPS operations are logged to the activity log with:
- User who performed the action
- Organization ID
- Event type (vps.boot, vps.shutdown, vps.delete, etc.)
- Timestamp
- Status (success/failure)
- Relevant metadata

## Security

- All endpoints require authentication
- Organization-scoped queries prevent cross-organization access
- Destructive operations require confirmation
- Password reset requires the instance to be powered off (Linode API requirement)

## Future Enhancements

Potential improvements for future iterations:
1. Modal forms for resize/rebuild with image/plan selection
2. Real-time statistics charts with historical data
3. Console/terminal access (Lish)
4. Firewall management interface
5. Disk cloning functionality
6. Configuration profile creation/editing
7. Automatic backup scheduling
8. Alert configuration for resource usage
9. Bandwidth usage graphs
10. SSH key management

## Technical Notes

- The page fetches instance details on mount and updates after actions
- Tab-based content loading (lazy loading for better performance)
- Uses React hooks for state management
- Responsive design with Tailwind CSS
- Dark mode support throughout
- Accessibility features (ARIA labels, keyboard navigation)
