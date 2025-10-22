# Design Document

## Overview

The Admin FAQ Management system will enable administrators to dynamically manage FAQ content through a dedicated admin interface. The system will store FAQ categories, items, and latest updates in PostgreSQL database tables and render them dynamically on the public FAQ page. The admin interface will provide CRUD operations with drag-and-drop reordering capabilities using shadcn/ui components.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                          │
├─────────────────────────────────────────────────────────────┤
│  Public FAQ Page (/faq)                                     │
│  - Fetches FAQ data from API                                │
│  - Renders categories, items, and updates dynamically       │
│                                                              │
│  Admin FAQ Manager (/admin#faq-management)                  │
│  - Category management (CRUD + reorder)                     │
│  - FAQ item management (CRUD + reorder)                     │
│  - Latest updates management (CRUD + reorder)               │
│  - Drag-and-drop interface using @dnd-kit                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                              │
├─────────────────────────────────────────────────────────────┤
│  Public Routes:                                             │
│  - GET /api/faq/categories (with items)                     │
│  - GET /api/faq/updates                                     │
│                                                              │
│  Admin Routes (authenticated):                              │
│  - GET/POST/PUT/DELETE /api/admin/faq/categories            │
│  - POST /api/admin/faq/categories/reorder                   │
│  - GET/POST/PUT/DELETE /api/admin/faq/items                 │
│  - POST /api/admin/faq/items/reorder                        │
│  - GET/POST/PUT/DELETE /api/admin/faq/updates               │
│  - POST /api/admin/faq/updates/reorder                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Database Layer (PostgreSQL)               │
├─────────────────────────────────────────────────────────────┤
│  Tables:                                                    │
│  - faq_categories                                           │
│  - faq_items                                                │
│  - faq_updates                                              │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Database Schema

#### Table: faq_categories
```sql
CREATE TABLE faq_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_faq_categories_display_order ON faq_categories(display_order);
CREATE INDEX idx_faq_categories_active ON faq_categories(is_active);
```

#### Table: faq_items
```sql
CREATE TABLE faq_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES faq_categories(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_faq_items_category_id ON faq_items(category_id);
CREATE INDEX idx_faq_items_display_order ON faq_items(display_order);
CREATE INDEX idx_faq_items_active ON faq_items(is_active);
```

#### Table: faq_updates
```sql
CREATE TABLE faq_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    published_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_faq_updates_published_date ON faq_updates(published_date DESC);
CREATE INDEX idx_faq_updates_display_order ON faq_updates(display_order);
CREATE INDEX idx_faq_updates_active ON faq_updates(is_active);
```

### API Endpoints

#### Public Endpoints

**GET /api/faq/categories**
- Returns all active FAQ categories with their active items, ordered by display_order
- Response:
```typescript
{
  categories: Array<{
    id: string;
    name: string;
    description: string;
    display_order: number;
    items: Array<{
      id: string;
      question: string;
      answer: string;
      display_order: number;
    }>;
  }>;
}
```

**GET /api/faq/updates**
- Returns all active latest updates, ordered by display_order
- Response:
```typescript
{
  updates: Array<{
    id: string;
    title: string;
    description: string;
    published_date: string;
    display_order: number;
  }>;
}
```

#### Admin Endpoints

**GET /api/admin/faq/categories**
- Returns all FAQ categories (including inactive), ordered by display_order
- Requires admin authentication

**POST /api/admin/faq/categories**
- Creates a new FAQ category
- Body: `{ name: string, description?: string, display_order?: number, is_active?: boolean }`
- Requires admin authentication

**PUT /api/admin/faq/categories/:id**
- Updates an existing FAQ category
- Body: `{ name?: string, description?: string, is_active?: boolean }`
- Requires admin authentication

**DELETE /api/admin/faq/categories/:id**
- Deletes a FAQ category (cascades to items)
- Requires admin authentication

**POST /api/admin/faq/categories/reorder**
- Updates display_order for multiple categories
- Body: `{ categories: Array<{ id: string, display_order: number }> }`
- Requires admin authentication

**GET /api/admin/faq/items**
- Returns all FAQ items (including inactive), optionally filtered by category_id
- Query params: `?category_id=uuid`
- Requires admin authentication

**POST /api/admin/faq/items**
- Creates a new FAQ item
- Body: `{ category_id: string, question: string, answer: string, display_order?: number, is_active?: boolean }`
- Requires admin authentication

**PUT /api/admin/faq/items/:id**
- Updates an existing FAQ item
- Body: `{ category_id?: string, question?: string, answer?: string, is_active?: boolean }`
- Requires admin authentication

**DELETE /api/admin/faq/items/:id**
- Deletes a FAQ item
- Requires admin authentication

**POST /api/admin/faq/items/reorder**
- Updates display_order for multiple items within a category
- Body: `{ items: Array<{ id: string, display_order: number }> }`
- Requires admin authentication

**GET /api/admin/faq/updates**
- Returns all latest updates (including inactive), ordered by display_order
- Requires admin authentication

**POST /api/admin/faq/updates**
- Creates a new latest update
- Body: `{ title: string, description: string, published_date?: string, display_order?: number, is_active?: boolean }`
- Requires admin authentication

**PUT /api/admin/faq/updates/:id**
- Updates an existing latest update
- Body: `{ title?: string, description?: string, published_date?: string, is_active?: boolean }`
- Requires admin authentication

**DELETE /api/admin/faq/updates/:id**
- Deletes a latest update
- Requires admin authentication

**POST /api/admin/faq/updates/reorder**
- Updates display_order for multiple updates
- Body: `{ updates: Array<{ id: string, display_order: number }> }`
- Requires admin authentication

### Frontend Components

#### Admin FAQ Management Page (`src/pages/Admin.tsx` - new tab)

The admin interface will be added as a new tab in the existing Admin page component.

**Component Structure:**
```
AdminFAQManagement
├── CategoryManager
│   ├── CategoryList (with drag-and-drop)
│   ├── CategoryForm (create/edit dialog)
│   └── CategoryDeleteDialog
├── FAQItemManager
│   ├── ItemList (with drag-and-drop, grouped by category)
│   ├── ItemForm (create/edit dialog with rich text editor)
│   └── ItemDeleteDialog
└── UpdatesManager
    ├── UpdatesList (with drag-and-drop)
    ├── UpdateForm (create/edit dialog)
    └── UpdateDeleteDialog
```

**Key Features:**
- Tabs to switch between Categories, FAQ Items, and Latest Updates
- Drag-and-drop reordering using `@dnd-kit/core` and `@dnd-kit/sortable`
- Inline editing with dialogs for create/update operations
- Confirmation dialogs for delete operations
- Visual indicators for active/inactive items
- Search and filter capabilities

#### Public FAQ Page Updates (`src/pages/FAQ.tsx`)

The existing FAQ page will be updated to fetch data from the API instead of using hardcoded data.

**Changes:**
- Replace hardcoded `faqs` array with API call to `/api/faq/categories`
- Replace hardcoded "Latest updates" section with API call to `/api/faq/updates`
- Add loading states and error handling
- Maintain existing UI/UX design
- Add empty state when no FAQ content exists

### TypeScript Interfaces

```typescript
// Shared types
interface FAQCategory {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FAQItem {
  id: string;
  category_id: string;
  question: string;
  answer: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FAQUpdate {
  id: string;
  title: string;
  description: string;
  published_date: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// API response types
interface FAQCategoryWithItems extends FAQCategory {
  items: FAQItem[];
}

// Form types
interface CategoryFormData {
  name: string;
  description?: string;
  is_active?: boolean;
}

interface ItemFormData {
  category_id: string;
  question: string;
  answer: string;
  is_active?: boolean;
}

interface UpdateFormData {
  title: string;
  description: string;
  published_date?: string;
  is_active?: boolean;
}
```

## Data Models

### FAQ Category Model
- **id**: UUID primary key
- **name**: Category name (e.g., "Getting Started", "VPS Hosting")
- **description**: Optional description of the category
- **display_order**: Integer for ordering categories
- **is_active**: Boolean flag to show/hide category
- **created_at**: Timestamp
- **updated_at**: Timestamp

### FAQ Item Model
- **id**: UUID primary key
- **category_id**: Foreign key to faq_categories
- **question**: The FAQ question text
- **answer**: The FAQ answer text (supports plain text, can be extended for rich text)
- **display_order**: Integer for ordering items within a category
- **is_active**: Boolean flag to show/hide item
- **created_at**: Timestamp
- **updated_at**: Timestamp

### FAQ Update Model
- **id**: UUID primary key
- **title**: Update title (e.g., "New API endpoints for theme controls")
- **description**: Update description/details
- **published_date**: Date when the update was published
- **display_order**: Integer for ordering updates
- **is_active**: Boolean flag to show/hide update
- **created_at**: Timestamp
- **updated_at**: Timestamp

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
3. **Validation Errors** (400): Invalid input data
4. **Not Found Errors** (404): Resource doesn't exist
5. **Database Errors** (500): Database connection or query failures
6. **Constraint Violations** (409): Attempting to delete category with items

### Frontend Error Handling
- Display toast notifications for all API errors
- Show inline validation errors in forms
- Provide retry mechanisms for failed operations
- Graceful degradation when FAQ data cannot be loaded

## Testing Strategy

### Unit Tests
- API route handlers validation logic
- Database query functions
- Frontend component rendering
- Form validation logic

### Integration Tests
- End-to-end API flows (create → read → update → delete)
- Drag-and-drop reordering functionality
- Category deletion with cascading items
- Public FAQ page data fetching

### Manual Testing Checklist
- [ ] Create FAQ category with valid data
- [ ] Create FAQ category with invalid data (validation)
- [ ] Update FAQ category
- [ ] Delete FAQ category (with and without items)
- [ ] Reorder FAQ categories using drag-and-drop
- [ ] Create FAQ item with valid data
- [ ] Create FAQ item with invalid data (validation)
- [ ] Update FAQ item
- [ ] Move FAQ item to different category
- [ ] Delete FAQ item
- [ ] Reorder FAQ items within category using drag-and-drop
- [ ] Create latest update with valid data
- [ ] Update latest update
- [ ] Delete latest update
- [ ] Reorder latest updates using drag-and-drop
- [ ] Verify public FAQ page displays database content
- [ ] Verify public FAQ page handles empty state
- [ ] Verify public FAQ page search functionality works with database content
- [ ] Test admin navigation to FAQ management page
- [ ] Test permissions (non-admin cannot access)

## UI/UX Design Considerations

### Admin Interface Design Principles
1. **Consistency**: Follow existing admin panel design patterns
2. **Clarity**: Clear labels and intuitive workflows
3. **Feedback**: Immediate visual feedback for all actions
4. **Safety**: Confirmation dialogs for destructive actions
5. **Efficiency**: Keyboard shortcuts and bulk operations where applicable

### Drag-and-Drop UX
- Visual drag handle indicator
- Smooth animations during drag
- Clear drop zone indicators
- Immediate order update on drop
- Undo capability (via manual reordering)

### Form Design
- Clear field labels and placeholders
- Inline validation with helpful error messages
- Required field indicators
- Character count for text fields
- Rich text editor for answer fields (future enhancement)

### Responsive Design
- Mobile-friendly admin interface
- Touch-friendly drag-and-drop on tablets
- Responsive table layouts
- Collapsible sections for mobile

## Migration Strategy

### Database Migration
A new migration file will be created: `migrations/012_faq_management.sql`

This migration will:
1. Create the three new tables (faq_categories, faq_items, faq_updates)
2. Create necessary indexes
3. Add triggers for updated_at columns
4. Optionally seed initial data from existing hardcoded FAQ content

### Data Seeding
The migration can optionally include INSERT statements to populate the database with the current hardcoded FAQ content, ensuring a smooth transition without content loss.

### Backward Compatibility
- The public FAQ page will gracefully handle empty database state
- If no FAQ data exists, display a helpful message
- Admin can populate content through the new interface

## Performance Considerations

### Database Optimization
- Indexes on display_order and is_active columns for fast queries
- Efficient JOIN queries for fetching categories with items
- Connection pooling for concurrent requests

### Frontend Optimization
- Lazy loading of FAQ data on public page
- Debounced search input
- Optimistic UI updates for drag-and-drop
- Caching of FAQ data with cache invalidation on updates

### API Optimization
- Pagination for large FAQ lists (future enhancement)
- Compression of API responses
- Rate limiting on public endpoints to prevent abuse

## Security Considerations

### Authentication & Authorization
- All admin endpoints require valid JWT token
- Role-based access control (admin role required)
- Token expiration and refresh handling

### Input Validation
- Server-side validation for all inputs
- SQL injection prevention via parameterized queries
- XSS prevention by sanitizing user input
- Maximum length constraints on text fields

### Data Protection
- No sensitive data stored in FAQ tables
- Audit logging for admin actions (future enhancement)
- HTTPS enforcement for all API calls

## Future Enhancements

### Phase 2 Features
1. **Rich Text Editor**: Support for formatted text, images, and links in answers
2. **FAQ Analytics**: Track view counts and search queries
3. **Multi-language Support**: Translations for FAQ content
4. **Version History**: Track changes to FAQ items over time
5. **Bulk Operations**: Import/export FAQ content via CSV/JSON
6. **Search Optimization**: Full-text search with PostgreSQL
7. **FAQ Voting**: Allow users to vote on helpful answers
8. **Related Questions**: Suggest related FAQs based on content
9. **FAQ Templates**: Pre-built FAQ templates for common scenarios
10. **Scheduled Publishing**: Schedule FAQ updates for future dates

### Technical Debt Considerations
- Consider moving to a headless CMS for FAQ management (future)
- Implement caching layer (Redis) for frequently accessed FAQ data
- Add comprehensive logging and monitoring
- Implement automated testing pipeline
