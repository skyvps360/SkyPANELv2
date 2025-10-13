# VPS Detail Page - UI Structure

## Page Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ ← Back to VPS List                                                  │
│                                                                       │
│ VPS-NAME                                              [Status Badge] │
│ 192.168.1.100 • US East                                              │
├─────────────────────────────────────────────────────────────────────┤
│ Quick Actions Bar                                                    │
│ [Shutdown] [Reboot] [Resize] [Rebuild] [Clone] [Password] [Delete]  │
├─────────────────────────────────────────────────────────────────────┤
│ Tabs:                                                                 │
│ [Overview] [Statistics] [Network] [Disks] [Backups] [Configs] [...] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ Tab Content Area                                                      │
│                                                                       │
│ ┌──────────────┬──────────────┬──────────────┬──────────────┐      │
│ │   CPU        │   Memory     │   Storage    │   Transfer   │      │
│ │   4 vCPUs    │   8 GB       │   160 GB     │   5 TB       │      │
│ └──────────────┴──────────────┴──────────────┴──────────────┘      │
│                                                                       │
│ Instance Details                                                      │
│ ┌─────────────────────────────────────────────────────────────┐    │
│ │ Label:          my-vps-instance                              │    │
│ │ Provider ID:    12345678                                     │    │
│ │ IP Address:     192.168.1.100                                │    │
│ │ IPv6:           2001:db8::1                                  │    │
│ │ Region:         US East (Newark)                             │    │
│ │ Image:          Ubuntu 22.04 LTS                             │    │
│ │ Created:        2024-01-15 10:30:00                          │    │
│ │ Backups:        Enabled                                      │    │
│ │ Monthly Cost:   $40.00                                       │    │
│ └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Tab Views

### 1. Overview Tab
- **Specifications Grid**: 4-column responsive grid showing vCPUs, Memory, Storage, Transfer
- **Instance Details Card**: Key-value pairs of all instance metadata
- **Visual styling**: Color-coded cards with icons

### 2. Statistics Tab
```
┌─────────────────────────────────────────────────────────────────────┐
│ Performance Statistics                                               │
│                                                                       │
│ CPU Usage:        [Graph placeholder]                                │
│ Network Traffic:  [Graph placeholder]                                │
│ Disk I/O:         [Graph placeholder]                                │
│                                                                       │
│ Raw Statistics Data (JSON view for now)                              │
└─────────────────────────────────────────────────────────────────────┘
```

### 3. Network Tab
```
┌─────────────────────────────────────────────────────────────────────┐
│ Network Configuration                         [Allocate IP Button]   │
│                                                                       │
│ IPv4 Addresses:                                                       │
│ • 192.168.1.100         Public                                        │
│ • 10.0.0.5              Private                                       │
│                                                                       │
│ IPv6:                                                                 │
│ • 2001:db8::1/64        SLAAC                                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 4. Disks Tab
```
┌─────────────────────────────────────────────────────────────────────┐
│ Disks                                         [Create Disk Button]   │
│                                                                       │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │ Ubuntu 22.04 Disk                              [Ready Badge]   │  │
│ │ 25600 MB • ext4                                                │  │
│ │                                              [Resize] [Delete] │  │
│ └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │ Swap Disk                                      [Ready Badge]   │  │
│ │ 512 MB • swap                                                  │  │
│ │                                              [Resize] [Delete] │  │
│ └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 5. Backups Tab
```
┌─────────────────────────────────────────────────────────────────────┐
│ Backups                         [Create Snapshot] [Cancel Backups]   │
│                                                                       │
│ Status: Enabled                                                       │
│                                                                       │
│ Automatic Backups:                                                    │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │ Daily Backup                     2024-01-20 03:00:00           │  │
│ └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│ Snapshots:                                                            │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │ Pre-upgrade snapshot             2024-01-18 15:30:00           │  │
│ │                                              [Restore] [Delete]│  │
│ └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 6. Configurations Tab
```
┌─────────────────────────────────────────────────────────────────────┐
│ Configuration Profiles                                               │
│                                                                       │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │ My Ubuntu Profile                                              │  │
│ │ Kernel: linode/latest-64bit • Root: /dev/sda                  │  │
│ └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 7. Volumes Tab
```
┌─────────────────────────────────────────────────────────────────────┐
│ Block Storage Volumes                                                │
│                                                                       │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │ storage-volume-1                       /mnt/storage            │  │
│ │ 50 GB • active                                                 │  │
│ └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│ Or: [Empty state with icon]                                          │
│     No volumes attached                                              │
└─────────────────────────────────────────────────────────────────────┘
```

## Action Buttons Behavior

### State-Dependent Actions
- **Running State**:
  - Shows: Shutdown, Reboot buttons (active)
  - Boot button hidden
  
- **Stopped/Offline State**:
  - Shows: Boot button (active, green)
  - Shutdown/Reboot hidden

- **Provisioning/Rebooting State**:
  - All power actions disabled
  - Shows status indicator

### Always Available Actions
- Resize (opens modal)
- Rebuild (opens modal)
- Clone (opens modal)
- Reset Password (opens modal)
- Delete (red, confirmation required)

## Color Scheme

### Status Colors
- **Green**: Running, Ready, Active, Success
- **Gray**: Stopped, Offline, Inactive
- **Yellow**: Provisioning, Rebooting, Booting, Processing
- **Red**: Error, Failed
- **Blue**: General information, links

### Component Colors
- **Background**: Gray-50 (light) / Gray-900 (dark)
- **Cards**: White (light) / Gray-800 (dark)
- **Borders**: Gray-200 (light) / Gray-700 (dark)
- **Text**: Gray-900 (light) / White (dark)
- **Secondary Text**: Gray-600 (light) / Gray-400 (dark)

## Responsive Design

### Desktop (lg+)
- 4-column specification grid
- Full navigation visible
- All tabs displayed inline

### Tablet (md)
- 2-column specification grid
- Collapsed side navigation
- Tabs scrollable horizontally

### Mobile (sm)
- 1-column specification grid
- Hamburger menu
- Tabs in dropdown or scrollable

## Icons Used

From lucide-react:
- Server: Main VPS icon
- Play: Boot action
- Square: Shutdown action
- RefreshCw: Reboot action
- Trash2: Delete action
- Maximize2: Resize action
- RotateCcw: Rebuild action
- Copy: Clone action
- Key: Password reset
- HardDrive: Disks
- Network: Network tab
- Shield: Backups
- Database: Backups
- Settings: Configurations
- Layers: Volumes
- BarChart3: Statistics
- Cpu: CPU specs
- MemoryStick: Memory specs
- Activity: Statistics icon
- AlertCircle: Errors
- CheckCircle: Success states
- Power/PowerOff: Power actions
- Globe: Network
- Clock: Time-based info

## Loading States

### Initial Page Load
```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                       │
│                         ⟳ Loading...                                 │
│                    Loading VPS details...                            │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Tab Content Loading
- Shows skeleton/spinner in tab content area
- Maintains tab navigation active
- Previous tab content not cleared until new content ready

### Action Loading
- Disable all action buttons
- Show spinner on active button
- Display toast notification when complete

## Error States

### Instance Not Found
```
┌─────────────────────────────────────────────────────────────────────┐
│                         ⚠                                            │
│                  VPS instance not found                              │
│                  [Back to VPS List]                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### API Error
- Toast notification with error message
- Tab content shows error icon with message
- Retry button provided where appropriate

## Accessibility

- Semantic HTML structure
- ARIA labels on buttons
- Keyboard navigation support
- Focus visible states
- Screen reader friendly
- Color contrast WCAG AA compliant
