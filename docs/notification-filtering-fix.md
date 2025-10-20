# Notification Filtering Fix

## Problem
The notification system was showing API calls and system events as user notifications because all activity logs were being treated as notifications. This caused notification spam with events like:

- Rate limiting violations (`rate_limit_violation`)
- System configuration events (`rate_limit_config`)
- Admin operations (`admin_operation`)
- User impersonation events (`impersonation_*`)
- Theme updates (`theme_update`)
- User logout events (`auth.logout`)

## Root Cause
The PostgreSQL trigger `notify_new_activity()` was sending notifications for **every** activity log entry without filtering. The trigger was created in migration `008_notifications.sql` and would fire on all `INSERT` operations to the `activity_logs` table.

## Solution
Created migration `009_fix_notification_filtering.sql` that updates the `notify_new_activity()` function to only send notifications for user-relevant events:

### Events that WILL trigger notifications:
- **VPS operations**: `vps.create`, `vps.boot`, `vps.shutdown`, `vps.reboot`, `vps.delete`
- **VPS management**: `vps.backups.*`, `vps.firewall.*`, `vps.network.rdns`, `vps.hostname.update`
- **Authentication**: `auth.login` (login events only)
- **API keys**: `api_key.create`, `api_key.revoke`
- **Support**: `ticket_reply`
- **User profile**: `user_update`

### Events that will NOT trigger notifications:
- **Rate limiting**: `rate_limit_violation`, `rate_limit_config`
- **Admin operations**: `admin_operation`
- **Impersonation**: `impersonation_start`, `impersonation_end`, `impersonation_target`, `impersonation_ended`
- **System events**: `theme_update`, `auth.logout`

## Implementation Details

1. **Database trigger update**: Modified the `notify_new_activity()` function to include a whitelist filter
2. **Backward compatibility**: All activity logs are still recorded for audit purposes
3. **Real-time filtering**: Only filtered events are sent via PostgreSQL's `pg_notify()` to the notification service
4. **Cleanup**: Marked existing system event notifications as read to clean up the notification queue

## Files Changed
- `migrations/009_fix_notification_filtering.sql` - New migration with updated trigger function
- Applied cleanup to mark existing system notifications as read

## Testing
The fix was tested by inserting test events:
- ✅ VPS create event → Triggers notification
- ❌ Rate limit violation → Does NOT trigger notification  
- ❌ Admin operation → Does NOT trigger notification
- ✅ API key creation → Triggers notification

## Impact
- Users will no longer see system events and API calls in their notification dropdown
- Notifications are now limited to meaningful user actions and events
- Activity logs continue to capture all events for audit and debugging purposes
- Real-time notification performance is improved by reducing unnecessary events