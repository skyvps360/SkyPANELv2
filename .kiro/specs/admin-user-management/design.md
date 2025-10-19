# Design Document

## Overview

This design document outlines the implementation of enhanced user management capabilities for the ContainerStacks admin panel. The system will extend the existing `/admin#user-management` page to provide comprehensive user management actions including viewing detailed user information, editing user profiles, and implementing secure user impersonation functionality.

The design leverages the existing shadcn/ui component library and follows the established patterns in the ContainerStacks codebase, particularly the admin panel architecture and authentication system.

## Architecture

### Component Architecture

The user management system will be built using a modular component architecture:

```
AdminUserManagement/
├── UserManagementTable (enhanced existing table)
├── UserActionMenu (new dropdown component)
├── UserProfileModal (new modal for viewing user details)
├── UserEditModal (new modal for editing user information)
├── ImpersonationBanner (new banner component)
└── hooks/
    ├── useUserManagement (new hook for user operations)
    ├── useImpersonation (new hook for impersonation logic)
    └── useUserModals (new hook for modal state management)
```

### API Architecture

The system will extend the existing admin API with new endpoints:

```
/api/admin/users (existing - GET)
/api/admin/users/:id (new - GET, PUT)
/api/admin/users/:id/impersonate (new - POST)
/api/admin/impersonation/exit (new - POST)
```

### State Management

The system will use React's built-in state management with custom hooks:
- Local component state for UI interactions
- Context for impersonation state (global)
- React Query for server state management (future enhancement)

## Components and Interfaces

### 1. Enhanced UserManagementTable

**Location**: `src/pages/Admin.tsx` (modify existing table)

**Purpose**: Add action column to existing user table

**Key Changes**:
- Add "Actions" column header
- Add `UserActionMenu` component to each row
- Maintain existing search and filter functionality

### 2. UserActionMenu Component

**Location**: `src/components/admin/UserActionMenu.tsx`

**Purpose**: Dropdown menu with user management actions

**Interface**:
```typescript
interface UserActionMenuProps {
  user: AdminUserRecord;
  onView: (user: AdminUserRecord) => void;
  onEdit: (user: AdminUserRecord) => void;
  onImpersonate: (user: AdminUserRecord) => void;
}
```

**Implementation**:
- Uses shadcn/ui `DropdownMenu` component
- Three action items: "View Details", "Edit User", "Act as User"
- Keyboard accessible
- Consistent with existing admin UI patterns

### 3. UserProfileModal Component

**Location**: `src/components/admin/UserProfileModal.tsx`

**Purpose**: Display comprehensive user information in read-only format

**Interface**:
```typescript
interface UserProfileModalProps {
  user: AdminUserRecord | null;
  isOpen: boolean;
  onClose: () => void;
}
```

**Content Sections**:
- Basic Information (name, email, role)
- Account Details (creation date, last updated, status)
- Organization Memberships (with roles)
- Activity Summary (last login, resource usage)

### 4. UserEditModal Component

**Location**: `src/components/admin/UserEditModal.tsx`

**Purpose**: Form-based user information editing

**Interface**:
```typescript
interface UserEditModalProps {
  user: AdminUserRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: string, updates: UserUpdateData) => Promise<void>;
}

interface UserUpdateData {
  name?: string;
  email?: string;
  role?: string;
  // Organization memberships handled separately
}
```

**Features**:
- Form validation using react-hook-form
- Real-time validation feedback
- Optimistic updates with error handling
- Confirmation dialog for role changes

### 5. ImpersonationBanner Component

**Location**: `src/components/admin/ImpersonationBanner.tsx`

**Purpose**: Persistent banner shown during user impersonation

**Interface**:
```typescript
interface ImpersonationBannerProps {
  impersonatedUser: {
    id: string;
    name: string;
    email: string;
  };
  onExitImpersonation: () => void;
}
```

**Features**:
- Fixed position at top of viewport
- High z-index to appear above all content
- Clear "Exit Impersonation" button
- User identification information

## Data Models

### Extended AdminUserRecord

The existing `AdminUserRecord` interface will be extended for detailed views:

```typescript
interface DetailedUserRecord extends AdminUserRecord {
  status: 'active' | 'inactive' | 'suspended';
  last_login?: string;
  preferences?: Record<string, any>;
  activity_summary?: {
    vps_count: number;
    container_count: number;
    last_activity?: string;
  };
}
```

### Impersonation State

```typescript
interface ImpersonationState {
  isImpersonating: boolean;
  originalAdmin: {
    id: string;
    name: string;
    email: string;
    token: string;
  } | null;
  impersonatedUser: {
    id: string;
    name: string;
    email: string;
  } | null;
}
```

### API Request/Response Types

```typescript
// GET /api/admin/users/:id
interface GetUserResponse {
  user: DetailedUserRecord;
}

// PUT /api/admin/users/:id
interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: string;
}

interface UpdateUserResponse {
  user: DetailedUserRecord;
}

// POST /api/admin/users/:id/impersonate
interface ImpersonateRequest {
  userId: string;
}

interface ImpersonateResponse {
  impersonationToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}
```

## Error Handling

### Client-Side Error Handling

1. **Network Errors**: Toast notifications with retry options
2. **Validation Errors**: Inline form validation with clear messaging
3. **Permission Errors**: Redirect to login or show access denied message
4. **Impersonation Errors**: Graceful fallback to admin session

### Server-Side Error Handling

1. **Authentication Failures**: Return 401 with clear error messages
2. **Authorization Failures**: Return 403 for insufficient permissions
3. **Validation Failures**: Return 400 with detailed field errors
4. **Database Errors**: Return 500 with generic error message (log details)

### Error Recovery

- Automatic retry for transient network errors
- Session restoration for impersonation failures
- Form state preservation during validation errors
- Graceful degradation when features are unavailable

## Testing Strategy

### Unit Testing

1. **Component Testing**:
   - UserActionMenu dropdown functionality
   - Modal open/close behavior
   - Form validation logic
   - Impersonation banner display

2. **Hook Testing**:
   - useUserManagement CRUD operations
   - useImpersonation state management
   - useUserModals modal state coordination

3. **Utility Testing**:
   - API client functions
   - Data transformation utilities
   - Validation functions

### Integration Testing

1. **API Integration**:
   - User CRUD operations end-to-end
   - Impersonation flow testing
   - Error handling scenarios

2. **Component Integration**:
   - Modal interactions with parent components
   - Form submission and data flow
   - Navigation during impersonation

### Security Testing

1. **Authentication Testing**:
   - Admin role verification
   - Token validation during impersonation
   - Session management security

2. **Authorization Testing**:
   - Permission checks for user operations
   - Impersonation restrictions
   - Data access controls

## Implementation Phases

### Phase 1: Core Infrastructure
- Create base components and hooks
- Implement user detail API endpoints
- Add action menu to existing table

### Phase 2: User Management Operations
- Implement user profile modal
- Add user editing functionality
- Create user update API endpoints

### Phase 3: Impersonation System
- Implement impersonation API endpoints
- Create impersonation banner component
- Add session management logic

### Phase 4: Polish and Testing
- Add comprehensive error handling
- Implement loading states and optimizations
- Add accessibility improvements
- Complete testing coverage

## Security Considerations

### Authentication and Authorization

1. **Admin Verification**: All user management operations require admin role
2. **Token Validation**: Impersonation tokens have limited scope and expiration
3. **Audit Logging**: All administrative actions are logged for compliance
4. **Permission Boundaries**: Clear separation between admin and user permissions

### Impersonation Security

1. **Session Isolation**: Admin and impersonated user sessions are kept separate
2. **Limited Duration**: Impersonation sessions have automatic expiration
3. **Activity Logging**: All actions during impersonation are logged with admin context
4. **Restricted Actions**: Certain sensitive operations are blocked during impersonation

### Data Protection

1. **Input Validation**: All user inputs are validated and sanitized
2. **SQL Injection Prevention**: Parameterized queries for all database operations
3. **XSS Protection**: Proper escaping of user-generated content
4. **CSRF Protection**: Token-based protection for state-changing operations