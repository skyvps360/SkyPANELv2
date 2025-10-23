# Design Document

## Overview

The Admin Contact Management system will enable administrators to dynamically manage Contact page content through a dedicated admin interface, following the same patterns established by the FAQ management system. The system will store contact categories, contact methods, and availability schedules in PostgreSQL database tables and render them dynamically on the public Contact page. The admin interface will provide CRUD operations with drag-and-drop reordering capabilities using shadcn/ui components. Additionally, the admin navigation will be reorganized to group Theme, FAQ Management, and Contact Management under a unified "Platform" settings section.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                          │
├─────────────────────────────────────────────────────────────┤
│  Public Contact Page (/contact)                             │
│  - Fetches contact data from API                            │
│  - Renders categories, methods, and availability            │
│                                                              │
│  Admin Contact Manager (/admin#contact-management)          │
│  - Category management (CRUD + reorder)                     │
│  - Contact method management (CRUD)                         │
│  - Drag-and-drop interface using @dnd-kit                   │
│                                                              │
│  Admin Platform Settings (/admin#platform)                  │
│  - Availability schedule management                         │
│  - Consolidated settings view                               │
│                                                              │
│  Admin Navigation Reorganization                            │
│  - New "Platform" section in sidebar                        │
│  - Groups Theme, FAQ, and Contact Management                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                              │
├─────────────────────────────────────────────────────────────┤
│  Public Routes:                                             │
│  - GET /api/contact/config                                  │
│                                                              │
│  Admin Routes (authenticated):                              │
│  - GET/POST/PUT/DELETE /api/admin/contact/categories        │
│  - POST /api/admin/contact/categories/reorder               │
│  - GET/POST/PUT/DELETE /api/admin/contact/methods           │
│  - GET/PUT /api/admin/platform/availability                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Database Layer (PostgreSQL)               │
├─────────────────────────────────────────────────────────────┤
│  Tables:                                                    │
│  - contact_categories                                       │
│  - contact_methods                                          │
│  - platform_availability                                    │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Database Schema

#### Table: contact_categories
```sql
CREATE TABLE contact_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label VARCHAR(255) NOT NULL,
    value VARCHAR(255) NOT NULL UNIQUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_contact_categories_display_order ON contact_categories(display_order);
CREATE INDEX idx_contact_categories_active ON contact_categories(is_active);
CREATE INDEX idx_contact_categories_value ON contact_categories(value);
```

#### Table: contact_methods
```sql
CREATE TABLE contact_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    method_type VARCHAR(50) NOT NULL UNIQUE, -- 'email', 'ticket', 'phone', 'office'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    config JSONB NOT NULL DEFAULT '{}', -- Method-specific configuration
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_contact_methods_type ON contact_methods(method_type);
CREATE INDEX idx_contact_methods_active ON contact_methods(is_active);
```

**config JSONB structure by method_type:**

- **email**: `{ "email_address": string, "response_time": string }`
- **ticket**: `{ "dashboard_link": string, "priority_queues": Array<{ label: string, response_time: string }> }`
- **phone**: `{ "phone_number": string, "availability_text": string }`
- **office**: `{ "address_line1": string, "address_line2": string, "city": string, "state": string, "postal_code": string, "country": string, "appointment_required": string }`

#### Table: platform_availability
```sql
CREATE TABLE platform_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    day_of_week VARCHAR(20) NOT NULL UNIQUE, -- 'monday', 'tuesday', etc.
    is_open BOOLEAN DEFAULT TRUE,
    hours_text VARCHAR(255), -- e.g., "9:00 AM – 6:00 PM EST"
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_platform_availability_display_order ON platform_availability(display_order);

-- Note: platform_settings table already exists from migration 010_theme_settings.sql
-- Schema: key TEXT PRIMARY KEY, value JSONB NOT NULL, updated_at TIMESTAMPTZ
-- Emergency support text is stored as: { "text": "..." }
```

### API Endpoints

#### Public Endpoints

**GET /api/contact/config**
- Returns all active contact configuration including categories, methods, and availability
- Response:
```typescript
{
  categories: Array<{
    id: string;
    label: string;
    value: string;
    display_order: number;
  }>;
  methods: {
    email?: {
      title: string;
      description: string;
      email_address: string;
      response_time: string;
    };
    ticket?: {
      title: string;
      description: string;
      dashboard_link: string;
      priority_queues: Array<{ label: string; response_time: string }>;
    };
    phone?: {
      title: string;
      description: string;
      phone_number: string;
      availability_text: string;
    };
    office?: {
      title: string;
      description: string;
      address_line1: string;
      address_line2?: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
      appointment_required: string;
    };
  };
  availability: Array<{
    day_of_week: string;
    is_open: boolean;
    hours_text: string;
    display_order: number;
  }>;
  emergency_support_text?: string;
}
```

#### Admin Endpoints

**GET /api/admin/contact/categories**
- Returns all contact categories (including inactive), ordered by display_order
- Requires admin authentication

**POST /api/admin/contact/categories**
- Creates a new contact category
- Body: `{ label: string, value: string, display_order?: number, is_active?: boolean }`
- Requires admin authentication

**PUT /api/admin/contact/categories/:id**
- Updates an existing contact category
- Body: `{ label?: string, value?: string, is_active?: boolean }`
- Requires admin authentication

**DELETE /api/admin/contact/categories/:id**
- Deletes a contact category
- Requires admin authentication

**POST /api/admin/contact/categories/reorder**
- Updates display_order for multiple categories
- Body: `{ categories: Array<{ id: string, display_order: number }> }`
- Requires admin authentication

**GET /api/admin/contact/methods**
- Returns all contact methods (including inactive)
- Requires admin authentication

**GET /api/admin/contact/methods/:method_type**
- Returns a specific contact method by type
- Requires admin authentication

**PUT /api/admin/contact/methods/:method_type**
- Updates a contact method
- Body: `{ title?: string, description?: string, is_active?: boolean, config?: object }`
- Requires admin authentication

**GET /api/admin/platform/availability**
- Returns all availability schedules and emergency support text
- Requires admin authentication

**PUT /api/admin/platform/availability**
- Updates availability schedules
- Body: `{ schedules: Array<{ day_of_week: string, is_open: boolean, hours_text: string }>, emergency_support_text?: string }`
- Requires admin authentication

### Frontend Components

#### Admin Navigation Reorganization

Update `src/pages/Admin.tsx` to reorganize the sidebar navigation:

**Current Structure:**
```
- Dashboard
- Support
- VPS Plans
- Container Plans
- Containers
- Servers
- Providers
- Stackscripts
- Networking
- Theme
- User Management
- Rate Limiting
- FAQ Management
```

**New Structure:**
```
- Dashboard
- Support
- VPS Plans
- Container Plans
- Containers
- Servers
- Providers
- Stackscripts
- Networking
- User Management
- Rate Limiting
- Settings
  └─ Platform
     ├─ Theme
     ├─ FAQ Management
     └─ Contact Management
```

#### Admin Contact Management Page

Add a new tab in `src/pages/Admin.tsx` for contact management.

**Component Structure:**
```
AdminContactManagement
├── Tabs
│   ├── Categories Tab
│   │   ├── CategoryList (with drag-and-drop)
│   │   ├── CategoryForm (create/edit dialog)
│   │   └── CategoryDeleteDialog
│   └── Contact Methods Tab
│       ├── EmailMethodForm
│       ├── TicketMethodForm
│       ├── PhoneMethodForm
│       └── OfficeMethodForm
```

**Key Features:**
- Tabs to switch between Categories and Contact Methods
- Drag-and-drop reordering for categories using `@dnd-kit/core` and `@dnd-kit/sortable`
- Individual forms for each contact method type with method-specific fields
- Toggle switches to enable/disable methods
- Visual indicators for active/inactive items
- Real-time preview of changes

#### Admin Platform Settings Page

Add a new tab in `src/pages/Admin.tsx` for platform-wide settings.

**Component Structure:**
```
AdminPlatformSettings
├── Tabs
│   ├── Availability Tab
│   │   ├── AvailabilityScheduleForm
│   │   └── EmergencySupportTextForm
│   ├── Theme Tab (existing)
│   └── General Tab (future)
```

**Key Features:**
- Day-by-day availability configuration
- Toggle for open/closed status
- Time input fields with validation
- Emergency support text editor
- Save button with loading state

#### Public Contact Page Updates

Update `src/pages/Contact.tsx` to fetch data from the API instead of using hardcoded data.

**Changes:**
- Replace hardcoded category options with API call to `/api/contact/config`
- Replace hardcoded contact method cards with database-driven content
- Replace hardcoded availability schedule with database-driven content
- Add loading states and error handling
- Maintain existing UI/UX design
- Add fallback to default content when database is empty

### TypeScript Interfaces

```typescript
// Shared types
interface ContactCategory {
  id: string;
  label: string;
  value: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ContactMethod {
  id: string;
  method_type: 'email' | 'ticket' | 'phone' | 'office';
  title: string;
  description: string | null;
  is_active: boolean;
  config: EmailConfig | TicketConfig | PhoneConfig | OfficeConfig;
  created_at: string;
  updated_at: string;
}

interface EmailConfig {
  email_address: string;
  response_time: string;
}

interface TicketConfig {
  dashboard_link: string;
  priority_queues: Array<{
    label: string;
    response_time: string;
  }>;
}

interface PhoneConfig {
  phone_number: string;
  availability_text: string;
}

interface OfficeConfig {
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  appointment_required: string;
}

interface PlatformAvailability {
  id: string;
  day_of_week: string;
  is_open: boolean;
  hours_text: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// API response types
interface ContactConfig {
  categories: ContactCategory[];
  methods: {
    email?: ContactMethod;
    ticket?: ContactMethod;
    phone?: ContactMethod;
    office?: ContactMethod;
  };
  availability: PlatformAvailability[];
  emergency_support_text?: string;
}

// Form types
interface CategoryFormData {
  label: string;
  value: string;
  is_active?: boolean;
}

interface MethodFormData {
  title: string;
  description?: string;
  is_active?: boolean;
  config: EmailConfig | TicketConfig | PhoneConfig | OfficeConfig;
}

interface AvailabilityFormData {
  schedules: Array<{
    day_of_week: string;
    is_open: boolean;
    hours_text: string;
  }>;
  emergency_support_text?: string;
}
```

## Data Models

### Contact Category Model
- **id**: UUID primary key
- **label**: Display text for the category (e.g., "General inquiry")
- **value**: Internal value for the category (e.g., "general")
- **display_order**: Integer for ordering categories in dropdown
- **is_active**: Boolean flag to show/hide category
- **created_at**: Timestamp
- **updated_at**: Timestamp

### Contact Method Model
- **id**: UUID primary key
- **method_type**: Type of contact method ('email', 'ticket', 'phone', 'office')
- **title**: Method title (e.g., "Email our team")
- **description**: Method description
- **is_active**: Boolean flag to show/hide method
- **config**: JSONB containing method-specific configuration
- **created_at**: Timestamp
- **updated_at**: Timestamp

### Platform Availability Model
- **id**: UUID primary key
- **day_of_week**: Day name (e.g., "monday", "tuesday")
- **is_open**: Boolean flag indicating if open on this day
- **hours_text**: Display text for hours (e.g., "9:00 AM – 6:00 PM EST")
- **display_order**: Integer for ordering days (0=Monday, 6=Sunday)
- **created_at**: Timestamp
- **updated_at**: Timestamp

### Platform Settings Model
- **key**: TEXT primary key (e.g., "emergency_support_text")
- **value**: JSONB value (e.g., `{ "text": "..." }`)
- **updated_at**: Timestamp with time zone

## Error Handling

### API Error Responses
All API endpoints will return consistent error responses:
```typescript
{
  error: string;  // Human-readable error message
  code?: string;  // Optional error code for client-side handling
}
```

### Common Error Scenarios
1. **Authentication Errors** (401): User not authenticated or token expired
2. **Authorization Errors** (403): User is not an admin
3. **Validation Errors** (400): Invalid input data (e.g., invalid email format, duplicate category value)
4. **Not Found Errors** (404): Resource doesn't exist
5. **Database Errors** (500): Database connection or query failures
6. **Constraint Violations** (409): Attempting to create duplicate category value

### Frontend Error Handling
- Display toast notifications for all API errors
- Show inline validation errors in forms
- Provide retry mechanisms for failed operations
- Graceful degradation when contact data cannot be loaded (fallback to defaults)

## Testing Strategy

### Unit Tests
- API route handlers validation logic
- Database query functions
- Frontend component rendering
- Form validation logic
- Email and phone number format validation

### Integration Tests
- End-to-end API flows (create → read → update → delete)
- Drag-and-drop reordering functionality
- Contact method configuration updates
- Public Contact page data fetching
- Availability schedule updates

### Manual Testing Checklist
- [ ] Create contact category with valid data
- [ ] Create contact category with invalid data (validation)
- [ ] Update contact category
- [ ] Delete contact category
- [ ] Reorder contact categories using drag-and-drop
- [ ] Update email contact method with valid email
- [ ] Update email contact method with invalid email (validation)
- [ ] Toggle email method visibility
- [ ] Update ticket contact method with priority queues
- [ ] Add/remove priority queue entries
- [ ] Update phone contact method with valid phone number
- [ ] Toggle phone method visibility
- [ ] Update office contact method with complete address
- [ ] Toggle office method visibility
- [ ] Update availability schedule for all days
- [ ] Mark specific days as closed
- [ ] Update emergency support text
- [ ] Verify public Contact page displays database content
- [ ] Verify public Contact page handles empty state (fallback)
- [ ] Verify contact form dropdown shows database categories
- [ ] Test admin navigation to Contact Management page
- [ ] Test admin navigation to Platform settings page
- [ ] Verify Theme and FAQ Management still accessible under Platform
- [ ] Test permissions (non-admin cannot access)

## UI/UX Design Considerations

### Admin Interface Design Principles
1. **Consistency**: Follow existing admin panel design patterns from FAQ management
2. **Clarity**: Clear labels and intuitive workflows
3. **Feedback**: Immediate visual feedback for all actions
4. **Safety**: Confirmation dialogs for destructive actions
5. **Efficiency**: Keyboard shortcuts and bulk operations where applicable

### Navigation Reorganization
- Collapsible "Settings" section with "Platform" subsection
- Clear visual hierarchy with indentation
- Active state indicators for current page
- Smooth transitions when expanding/collapsing sections

### Form Design
- Clear field labels and placeholders
- Inline validation with helpful error messages
- Required field indicators
- Method-specific forms with contextual help text
- Toggle switches for enable/disable actions
- Character count for text fields where applicable

### Drag-and-Drop UX
- Visual drag handle indicator
- Smooth animations during drag
- Clear drop zone indicators
- Immediate order update on drop
- Consistent with FAQ management drag-and-drop

### Responsive Design
- Mobile-friendly admin interface
- Touch-friendly drag-and-drop on tablets
- Responsive form layouts
- Collapsible sections for mobile

## Migration Strategy

### Database Migration
A new migration file will be created: `migrations/013_contact_management.sql`

This migration will:
1. Create the three new tables (contact_categories, contact_methods, platform_availability, platform_settings)
2. Create necessary indexes
3. Add triggers for updated_at columns
4. Seed initial data from existing hardcoded Contact page content

### Data Seeding
The migration will include INSERT statements to populate the database with:
- Default contact categories (General inquiry, Pricing & sales, Technical support, Billing, Partnership, Other)
- Default contact methods with current hardcoded values
- Default availability schedule (Weekdays, Saturday, Sunday)
- Default emergency support text

### Backward Compatibility
- The public Contact page will gracefully handle empty database state
- If no contact data exists, display fallback to hardcoded defaults
- Admin can override defaults through the new interface

## Performance Considerations

### Database Optimization
- Indexes on display_order, is_active, and method_type columns for fast queries
- JSONB indexing for config field if needed for complex queries
- Connection pooling for concurrent requests
- Single API call to fetch all contact configuration

### Frontend Optimization
- Single API call to fetch complete contact configuration
- Caching of contact data with cache invalidation on updates
- Debounced form inputs for real-time validation
- Optimistic UI updates for drag-and-drop

### API Optimization
- Combine all contact data into single endpoint for public page
- Compression of API responses
- Rate limiting on public endpoints to prevent abuse

## Security Considerations

### Authentication & Authorization
- All admin endpoints require valid JWT token
- Role-based access control (admin role required)
- Token expiration and refresh handling

### Input Validation
- Server-side validation for all inputs
- Email format validation
- Phone number format validation
- URL validation for dashboard links
- SQL injection prevention via parameterized queries
- XSS prevention by sanitizing user input
- Maximum length constraints on text fields

### Data Protection
- No sensitive data stored in contact tables
- Audit logging for admin actions (future enhancement)
- HTTPS enforcement for all API calls

## Future Enhancements

### Phase 2 Features
1. **Multi-language Support**: Translations for contact content
2. **Contact Form Submissions**: Store and manage form submissions in database
3. **Auto-responder**: Automated email responses to contact form submissions
4. **Contact Analytics**: Track form submission rates and popular categories
5. **Custom Fields**: Allow admins to add custom fields to contact form
6. **Integration with CRM**: Sync contact submissions with external CRM systems
7. **Live Chat Integration**: Add live chat as a contact method
8. **Business Hours Automation**: Automatically show/hide contact methods based on business hours
9. **Holiday Schedule**: Configure special hours for holidays
10. **Contact Method Priority**: Reorder contact method cards on public page

### Technical Debt Considerations
- Consider moving to a headless CMS for all content management (future)
- Implement caching layer (Redis) for frequently accessed contact data
- Add comprehensive logging and monitoring
- Implement automated testing pipeline
- Add version history for contact configuration changes

