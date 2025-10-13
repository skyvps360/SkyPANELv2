# VPS Detail Page Feature

## Quick Overview

The VPS Detail Page (`/vps/:id`) is a comprehensive management interface for Linode VPS instances, providing full control over all aspects of server management through a clean, modern UI.

## Access

Navigate to `/vps/:id` where `:id` is the UUID of your VPS instance from the database.

Example: `https://your-domain.com/vps/550e8400-e29b-41d4-a716-446655440000`

## Screenshots

*Note: Screenshots would be added here after deployment*

### Page Sections

1. **Header & Quick Actions**
   - Instance name and status
   - IP address and region
   - Quick action buttons for common operations

2. **Overview Tab**
   - Instance specifications (CPU, RAM, Storage, Transfer)
   - Detailed information (IPs, image, dates, pricing)

3. **Statistics Tab**
   - Real-time performance metrics
   - CPU, Network, and Disk I/O statistics

4. **Network Tab**
   - IPv4 and IPv6 addresses
   - IP allocation

5. **Disks Tab**
   - Disk management (create, resize, delete)
   - Disk status and filesystem info

6. **Backups Tab**
   - Backup management (enable/disable)
   - Manual snapshots
   - Restore operations

7. **Configurations Tab**
   - Configuration profiles
   - Kernel settings

8. **Volumes Tab**
   - Block storage volumes
   - Volume details

## Usage Guide

### Power Management

**Boot Instance**
1. Navigate to the VPS detail page
2. Click the "Boot" button (only visible when instance is stopped)
3. Wait for status to change to "running"

**Shutdown Instance**
1. Click the "Shutdown" button (only visible when running)
2. Instance will gracefully shutdown
3. Status will change to "stopped"

**Reboot Instance**
1. Click the "Reboot" button (only visible when running)
2. Instance will reboot
3. Status briefly shows "rebooting" then "running"

### Advanced Operations

**Resize Instance**
1. Click the "Resize" button
2. Select new plan size
3. Confirm the operation
4. Instance will resize (may take several minutes)

**Rebuild Instance**
1. Click the "Rebuild" button
2. Select new image/OS
3. Provide root password
4. Confirm (this will erase all data!)
5. Instance will be rebuilt with new OS

**Clone Instance**
1. Click the "Clone" button
2. Configure clone settings (region, label)
3. Confirm
4. New instance will be created

**Reset Root Password**
1. Click the "Reset Password" button
2. Enter new root password
3. Confirm
4. Password will be reset (instance must be offline)

### Backup Management

**Enable Backups**
1. Go to Backups tab
2. Click "Enable Backups"
3. Automatic backups will be scheduled

**Create Snapshot**
1. Go to Backups tab
2. Click "Create Snapshot"
3. Enter snapshot name
4. Manual snapshot will be created

**Restore Backup**
1. Go to Backups tab
2. Find the backup to restore
3. Click "Restore"
4. Confirm operation
5. Instance will be restored (may require reboot)

### Disk Management

**Create Disk**
1. Go to Disks tab
2. Click "Create Disk"
3. Enter disk label and size
4. Select filesystem type
5. Disk will be created

**Resize Disk**
1. Go to Disks tab
2. Find disk to resize
3. Click "Resize"
4. Enter new size
5. Confirm (instance must be offline)

**Delete Disk**
1. Go to Disks tab
2. Find disk to delete
3. Click "Delete"
4. Confirm operation

### Network Management

**View IP Addresses**
1. Go to Network tab
2. View all IPv4 and IPv6 addresses
3. Public and private IPs are listed separately

**Allocate New IP**
1. Go to Network tab
2. Click "Allocate IP"
3. Select IP type (public/private)
4. New IP will be allocated

## API Integration

All operations use the Linode API v4. The page makes real-time API calls to:
- Fetch instance details
- Perform power operations
- Manage backups
- Configure networking
- Monitor statistics

## Error Handling

The page handles errors gracefully:
- **Network errors**: Toast notification with error message
- **API errors**: Specific error messages from Linode API
- **Not found**: Displays "Instance not found" with back link
- **Permission errors**: Shows appropriate error message

## Loading States

Loading indicators are shown:
- Initial page load: Full-page spinner
- Tab content loading: Spinner in tab area
- Action execution: Button disabled with spinner
- Background updates: Silent refresh

## Security

- All endpoints require authentication
- Organization-scoped queries prevent unauthorized access
- Destructive operations require confirmation
- Activity logging tracks all changes
- Passwords are never stored or displayed

## Performance

- Lazy loading of tab content
- Efficient state management with React hooks
- Minimal re-renders
- Debounced actions
- Cached region/plan data

## Accessibility

- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support
- Proper focus management
- Screen reader friendly
- High contrast colors (WCAG AA)

## Mobile Support

The page is fully responsive:
- Mobile: Single column layout, scrollable tabs
- Tablet: Two-column specs grid, horizontal tabs
- Desktop: Four-column grid, full navigation

## Dark Mode

Full dark mode support with:
- Proper contrast ratios
- Consistent color scheme
- Smooth transitions
- User preference detection

## Troubleshooting

**Page not loading**
- Check internet connection
- Verify Linode API token is configured
- Check browser console for errors

**Actions not working**
- Ensure instance is in correct state (e.g., stopped for resize)
- Check API token permissions
- Review error messages in toast notifications

**Data not updating**
- Refresh the page
- Check Linode API status
- Verify organization access

**Slow performance**
- Check network connection
- Clear browser cache
- Check Linode API rate limits

## Support

For issues or questions:
1. Check the documentation in `/docs`
2. Review activity logs for operation history
3. Check Linode API status page
4. Contact system administrator

## Future Enhancements

Planned improvements:
- Real-time statistics charts
- Console/terminal access
- Firewall management UI
- SSH key management
- Alert configuration
- Batch operations
- Export functionality

## Technical Details

### API Endpoints Used
- All endpoints under `/api/vps/:id`
- See VPS_DETAIL_PAGE.md for complete list

### Component Structure
- Single React component with tab-based navigation
- UseEffect hooks for data fetching
- UseState for local state management
- Context-aware rendering based on instance state

### Dependencies
- React + React Router for UI
- Lucide React for icons
- Sonner for toast notifications
- Tailwind CSS for styling

### Browser Requirements
- Modern browser (Chrome, Firefox, Safari, Edge)
- JavaScript enabled
- No IE11 support

---

For complete technical documentation, see:
- `/docs/VPS_DETAIL_PAGE.md` - API reference
- `/docs/VPS_DETAIL_UI_STRUCTURE.md` - UI design guide
- `/docs/IMPLEMENTATION_SUMMARY.md` - Implementation details
