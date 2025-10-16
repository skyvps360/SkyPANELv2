# Testing the Real-Time Notification System

## Quick Start Guide

### 1. Start the Application
```bash
npm run dev
```

This will start both the frontend (port 5173) and API (port 3001).

### 2. Log In
Navigate to `http://localhost:5173` and log in with your credentials.

### 3. Observe the Notification Bell

**Location**: Top right navigation bar, positioned between:
- **Left**: Theme toggle (Sun/Moon icon)
- **Right**: User avatar dropdown

**What to look for**:
- 🔔 Bell icon
- Red badge with unread count (if notifications exist)
- Badge has a pulse animation to draw attention

## Testing Real-Time Updates

### Method 1: Create a VPS Instance
1. Navigate to **VPS** page
2. Click **Create VPS Instance**
3. Fill out the form and submit
4. **Watch**: The notification bell should immediately update with a new notification
5. **Toast**: A small popup notification appears briefly in the corner

### Method 2: Perform Other Activities
Try these actions to trigger notifications:
- Create a container
- Update billing settings
- Make a payment
- Any action that logs to the activity system

### Method 3: Manual Database Insert (for testing)
```sql
INSERT INTO activity_logs (
  user_id, 
  event_type, 
  entity_type, 
  message, 
  status
) VALUES (
  'YOUR_USER_ID_HERE',
  'test',
  'notification',
  'Test notification message',
  'info'
);
```

## Testing Notification Interactions

### Opening the Dropdown
1. Click the bell icon
2. Dropdown appears below the icon
3. Shows up to 20 recent unread notifications

### Viewing Notifications
- **Unread**: Blue background highlight
- **Status Colors**:
  - 🟢 Green = Success
  - 🔴 Red = Error
  - 🟡 Yellow = Warning
  - 🔵 Blue = Info
- **Timestamps**: Relative times ("just now", "5m ago", "2h ago", "3d ago")

### Marking as Read

**Single Notification**:
1. Hover over a notification
2. Click the checkmark icon on the right
3. Blue background disappears
4. Badge count decrements by 1

**All Notifications**:
1. Click the double-checkmark icon in the dropdown header
2. All notifications marked as read
3. Badge count goes to 0
4. Success toast appears

### View Full Activity
1. Scroll to bottom of notification dropdown
2. Click "View all activity"
3. Navigates to Activity page with full history

## Real-Time Testing

### Test Live Updates
1. Open the app in **two browser windows** (or different browsers)
2. Log in as the same user in both
3. In **Window 1**: Trigger an activity (create VPS, etc.)
4. In **Window 2**: Watch the notification bell update **immediately**
   - Badge count increases
   - Toast notification appears
   - New notification in dropdown (if open)

### Test Connection Resilience
1. Open browser DevTools → Network tab
2. Observe the `/api/notifications/stream` connection (EventStream)
3. Look for periodic heartbeat comments
4. **Simulate disconnect**: Disable network briefly
5. **Observe**: Connection automatically reconnects when network returns

## Mobile Testing

### Mobile View
1. Resize browser window to mobile width (< 640px)
2. Notification bell appears in mobile header
3. Same functionality as desktop
4. Dropdown adapts to smaller screen

### Mobile Interaction
- Tap bell icon to open
- Tap outside dropdown to close
- Scroll through notifications
- Mark as read works on tap

## Debugging

### Check SSE Connection
**Browser DevTools → Network Tab**:
- Filter by `stream`
- Should see `/api/notifications/stream?token=...`
- Type: `eventsource`
- Status: `pending` (stays open)
- Preview tab shows incoming messages

### Console Logs
**Frontend** (`Ctrl+Shift+J`):
```
Notification stream connected
```

**Backend** (terminal where `npm run dev` is running):
```
Notification service connected to database
Notification service listening on channel: new_activity
```

### Database Verification
```sql
-- Check if notification columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'activity_logs' 
  AND column_name IN ('is_read', 'read_at');

-- Check for unread notifications
SELECT COUNT(*) FROM activity_logs WHERE is_read = FALSE;

-- View recent notifications
SELECT id, message, status, is_read, created_at 
FROM activity_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

## Common Issues & Solutions

### Issue: Badge doesn't update in real-time
**Solution**: 
- Check browser console for SSE connection errors
- Verify backend notification service started
- Check terminal for "Notification service listening" message

### Issue: "Unauthorized" error on SSE connection
**Solution**:
- Token might be expired - log out and log back in
- Check that token is being passed in URL correctly

### Issue: Notifications not appearing
**Solution**:
- Verify migration ran successfully
- Check PostgreSQL trigger exists: `\d+ activity_logs` in psql
- Ensure `is_read` column defaults to `FALSE`

### Issue: Dropdown won't close
**Solution**:
- Click outside the dropdown area
- Press Escape key (if keyboard navigation implemented)

## Expected Behavior Summary

✅ **Real-time**: Notifications appear instantly without page refresh  
✅ **Badge**: Shows unread count with pulse animation  
✅ **Position**: Between theme toggle and user menu  
✅ **Dropdown**: Clean, scrollable list with status colors  
✅ **Interactions**: Mark as read (single or all)  
✅ **Toast**: Brief popup for new notifications  
✅ **Responsive**: Works on mobile and desktop  
✅ **Dark Mode**: Fully supports light/dark themes  
✅ **Performance**: Efficient SSE connection with heartbeat  
✅ **Security**: Token-based authentication  

---

**Ready to Test!** 🎉

Start the dev server with `npm run dev` and follow the steps above to see the real-time notification system in action.
