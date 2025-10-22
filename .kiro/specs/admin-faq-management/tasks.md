# Implementation Plan

- [x] 1. Create database schema and migration

  - Create migration file `migrations/012_faq_management.sql` with tables for faq_categories, faq_items, and faq_updates
  - Add indexes for display_order, is_active, and foreign key columns
  - Add triggers for updated_at columns
  - Include optional data seeding from existing hardcoded FAQ content
  - _Requirements: 1.1, 2.1, 3.1, 5.1, 6.1_

-

- [x] 2. Implement backend API routes for FAQ categories

  - [x] 2.1 Create public FAQ routes file `api/routes/faq.ts`

    - Implement GET /api/faq/categories endpoint to fetch active categories with items
    - Implement GET /api/faq/updates endpoint to fetch active updates
    - Add proper error handling and response formatting
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 2.2 Create admin FAQ routes file `api/routes/adminFaq.ts`

    - Implement GET /api/admin/faq/categories endpoint
    - Implement POST /api/admin/faq/categories endpoint with validation
    - Implement PUT /api/admin/faq/categories/:id endpoint
    - Implement DELETE /api/admin/faq/categories/:id endpoint
    - Implement POST /api/admin/faq/categories/reorder endpoint
    - Add authentication and admin role checks
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 2.3 Register FAQ routes in Express app

    - Import and mount public FAQ routes at /api/faq
    - Import and mount admin FAQ routes at /api/admin/faq
    - Update `api/app.ts` to include new route handlers
    - _Requirements: 1.1, 6.1_

- [x] 3. Implement backend API routes for FAQ items

  - [x] 3.1 Add FAQ item endpoints to admin FAQ routes

    - Implement GET /api/admin/faq/items endpoint with optional category filter
    - Implement POST /api/admin/faq/items endpoint with validation
    - Implement PUT /api/admin/faq/items/:id endpoint
    - Implement DELETE /api/admin/faq/items/:id endpoint

    - Implement POST /api/admin/faq/items/reorder endpoint
    - _Requirements: 3.1, 3.2, 3.3, 4.2, 4.4_

- [x] 4. Implement backend API routes for latest updates

  - [x] 4.1 Add latest updates endpoints to admin FAQ routes

    - Implement GET /api/admin/faq/updates endpoint
    - Implement POST /api/admin/faq/updates endpoint with validation
    - Implement PUT /api/admin/faq/updates/:id endpoint
    - Implement DELETE /api/admin/faq/updates/:id endpoint
    - Implement POST /api/admin/faq/updates/reorder endpoint
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

-

- [x] 5. Create TypeScript types for FAQ data

  - Create `src/types/faq.ts` with interfaces for FAQCategory, FAQItem, FAQUpdate
  - Add form data types and API response types
  - Export types for use in components and API calls
  - _Requirements: 1.1, 2.1, 3.1, 5.1_

-

- [x] 6. Update public FAQ page to use API data

  - [x] 6.1 Modify FAQ page to fetch data from API

    - Replace hardcoded faqs array with API call to /api/faq/categories
    - Replace hardcoded latest updates with API call to /api/faq/updates
    - Add loading states using React Query or useState/useEffect
    - Add error handling with user-friendly messages
    - Maintain existing UI design and search functionality

    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 6.2 Add empty state handling

    - Display helpful message when no FAQ content exists
    - Provide link to contact support as fallback
    - _Requirements: 6.4_

- [x] 7. Create admin FAQ management components

  - [x] 7.1 Add FAQ Management tab to Admin page

    - Update Admin.tsx to include new "faq-management" tab in ADMIN_SECTIONS
    - Add navigation item in admin sidebar with appropriate icon
    - Create tab content container for FAQ management interface
    - _Requirements: 1.1, 1.2, 7.1_

  - [x] 7.2 Create CategoryManager component

    - Build category list with display of name, description, and item count
    - Add create category button and dialog form
    - Implement delete category with confirmation dialog

    - Implement delete category with confirmation dialog
    - Add active/inactive toggle switch
    - _Requirements: 2.1, 2.2, 2.3, 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 7.3 Implement drag-and-drop for categories

    - Install and configure @dnd-kit/core and @dnd-kit/sortable
    - Add drag handles to category list items
    - Implement drag-and-drop reordering with visual feedback
    - Call reorder API endpoint on drop
    - Update local state optimistically
    - _Requirements: 4.1, 4.3, 4.4_

  - [x] 7.4 Create FAQItemManager component

    - Build item list grouped by category with accordion or tabs
    - Display question and answer preview
    - Add create item button and dialog form with category selector
    - Implement edit item functionality with dialog
    - Implement delete item with confirmation dialog
    - Add active/inactive toggle switch
    - _Requirements: 3.1, 3.2, 3.3, 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 7.5 Implement drag-and-drop for FAQ items

    - Add drag handles to item list
    - Implement drag-and-drop reordering within categories
    - Call reorder API endpoint on drop
    - Update local state optimistically
    - _Requirements: 4.2, 4.3, 4.4_

  - [x] 7.6 Create UpdatesManager component

    - Build updates list with title, description, and date
    - Add create update button and dialog form
    - Implement edit update functionality with dialog
    - Implement delete update with confirmation dialog
    - Add date picker for published_date field
    - Add active/inactive toggle switch
    - _Requirements: 5.1, 5.2, 5.3, 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 7.7 Implement drag-and-drop for latest updates

    - Add drag handles to updates list
    - Implement drag-and-drop reordering
    - Call reorder API endpoint on drop
    - Update local state optimistically
    - _Requirements: 5.5, 4.3, 4.4_

-

- [x] 8. Add form validation and error handling

  - Add client-side validation for all forms using react-hook-form or similar
  - Display inline validation errors
  - Handle API errors with toast notifications
  - Add loading states for all async operations
  - _Requirements: 7.3, 7.4, 7.5_

- [x] 9. Apply database migration

  - Run migration script to create FAQ tables
  - Verify tables and indexes are created correctly
  - Test data seeding if included
  - _Requirements: 1.1, 2.1, 3.1, 5.1_

- [x] 10. Integration and end-to-end testing


  - Test complete workflow: create category → add items → reorder → view on public page
  - Test delete category with items (cascade behavior)
  - Test drag-and-drop reordering for all entity types

  - Test public FAQ page with empty database
  - Test public FAQ page search with database content
  - Verify admin authentication and authorization
  - Test responsive design on mobile and tablet
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_
