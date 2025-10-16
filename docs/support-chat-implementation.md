# Support Ticket Live Chat Implementation

## Overview
Transformed the support ticket system into a real-time live chat experience with PostgreSQL LISTEN/NOTIFY and Server-Sent Events (SSE).

## Completed Features

### 1. Database Changes (Migration 009)
✅ **File**: `migrations/009_ticket_chat_features.sql`

- Added `has_staff_reply` column to `support_tickets` table
- Created PostgreSQL NOTIFY triggers for real-time message broadcasting
- Created `notify_new_ticket_message()` function
  - Notifies on `ticket_{id}` channel
  - Notifies on `org_tickets_{org_id}` channel
  - Auto-updates `has_staff_reply` flag when staff replies
- Created `notify_ticket_status_change()` function
- Added indexes for performance optimization

### 2. Backend API (support.ts)
✅ **File**: `api/routes/support.ts`

**New Endpoints:**
- `GET /api/support/tickets/:id/stream` - SSE endpoint for real-time updates
  - Uses query param token for EventSource authentication
  - Streams ticket_message and ticket_status_change events
  - Auto-reconnect with heartbeat
  
- `PATCH /api/support/tickets/:id/close` - Close ticket endpoint
  - **Business Rule**: Users can only close if `has_staff_reply = TRUE`
  - Returns 403 error if user tries to close before staff reply
  - No delete function for regular users (only admins can delete)

### 3. Frontend Chat Interface (Support.tsx)
✅ **File**: `src/pages/Support.tsx`

**Major UI/UX Improvements:**
- Full-height split view layout (ticket list | chat area)
- Modern chat bubbles with proper alignment
  - User messages: left-aligned, white/gray background
  - Staff messages: right-aligned, blue background
- Real-time message streaming via SSE
- **Auto-scroll** implementation:
  - Scrolls to bottom when ticket is opened
  - Scrolls to bottom when new message arrives
  - Uses `useRef` + `scrollIntoView({ behavior: 'smooth' })`
  - Includes timeout delay for DOM update

**Features:**
- Live message updates (no refresh needed)
- Toast notifications for new staff replies
- Status change notifications
- Close ticket button (only shows if `has_staff_reply = true`)
- Optimistic UI updates for sent messages
- Enter to send, Shift+Enter for new line
- Relative timestamps ("Just now", "5m ago", etc.)
- Search and filter tickets
- Status and priority badges with icons
- Dark mode support throughout

### 4. User Restrictions
✅ **Implemented**:
- Users CANNOT close tickets until staff replies
- Users CANNOT delete tickets (only admins can)
- Clear warning message: "You can close this ticket after receiving a reply from our support team"
- Backend validation prevents premature closure

## Technical Architecture

### Real-Time Flow
```
1. User sends message → POST /api/support/tickets/:id/replies
2. Backend inserts into support_ticket_replies table
3. PostgreSQL trigger fires → NOTIFY on ticket_{id} channel
4. SSE connection listening → receives notification
5. Frontend updates React state → new message appears
6. Auto-scroll triggers → scrolls to bottom
```

### Auto-Scroll Logic
```typescript
const messagesEndRef = useRef<HTMLDivElement>(null);

const scrollToBottom = useCallback(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, []);

// Scroll when ticket opens
setTimeout(scrollToBottom, 100);

// Scroll when new message arrives
useEffect(() => {
  if (selectedTicket && selectedTicket.messages.length > 0) {
    scrollToBottom();
  }
}, [selectedTicket?.messages.length, scrollToBottom]);
```

## Testing Checklist

### User Experience
- [ ] Open a ticket - verify auto-scroll to bottom
- [ ] Send a message - verify auto-scroll after sending
- [ ] Receive staff reply - verify toast notification appears
- [ ] Verify "Close Ticket" button NOT shown before staff reply
- [ ] Receive staff reply - verify "Close Ticket" button appears
- [ ] Click "Close Ticket" - verify ticket closes successfully
- [ ] Try to close before staff reply - verify error message
- [ ] Verify NO delete button for users

### Real-Time Updates
- [ ] Have admin reply in another browser
- [ ] Verify message appears instantly without refresh
- [ ] Verify auto-scroll happens on new message
- [ ] Check status change updates in real-time
- [ ] Verify SSE connection stays alive (check console logs)

### UI/UX
- [ ] Messages properly aligned (user left, staff right)
- [ ] Blue background for staff messages
- [ ] White/gray background for user messages
- [ ] Timestamps showing correctly
- [ ] Search and filters work
- [ ] Status badges display correctly
- [ ] Priority badges display correctly
- [ ] Dark mode works properly
- [ ] Mobile responsive

### Admin
- [ ] Admin can reply to tickets
- [ ] Admin can change ticket status
- [ ] Admin can delete tickets
- [ ] Admin replies update `has_staff_reply` flag

## Next Steps (Optional Enhancements)

1. **Typing Indicators**: Show "Staff is typing..." using additional NOTIFY channel
2. **File Attachments**: Allow users to attach screenshots
3. **Ticket Assignment**: Assign tickets to specific staff members
4. **Canned Responses**: Pre-written responses for common questions
5. **Email Notifications**: Send email when staff replies
6. **Read Receipts**: Show when staff has read user messages

## Files Modified/Created

### Created
- `migrations/009_ticket_chat_features.sql`

### Modified
- `api/routes/support.ts` - Added SSE stream and close endpoints
- `src/pages/Support.tsx` - Complete rewrite to chat interface

### Existing (Admin side already has reply functionality)
- `api/routes/admin.ts` - Admin ticket management
- `src/pages/Admin.tsx` - Admin ticket interface

## Database Channels

- `ticket_{uuid}` - Ticket-specific updates
- `org_tickets_{uuid}` - Organization-wide ticket updates

## Environment Requirements

- PostgreSQL with LISTEN/NOTIFY support (9.0+)
- All existing environment variables remain the same

## Notes

- EventSource API cannot send custom headers, so token is passed as query parameter
- SSE is one-way communication (server → client), which is perfect for this use case
- PostgreSQL NOTIFY is lightweight and doesn't require external message brokers
- Auto-scroll uses smooth behavior for better UX
- Optimistic UI updates provide instant feedback while waiting for SSE confirmation
