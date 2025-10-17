# Shadcn UI Migration Guide

This document describes the Shadcn UI integration and migration status for ContainerStacks.

## Overview

ContainerStacks has been migrated to use [Shadcn UI](https://ui.shadcn.com/), a collection of re-usable components built with Radix UI and Tailwind CSS.

## What's Been Done

### 1. Infrastructure Setup ✅
- **Tailwind Configuration**: Updated `tailwind.config.js` with Shadcn UI design tokens
- **CSS Variables**: Configured in `src/index.css` for light and dark modes
- **Components Config**: Created `components.json` for Shadcn CLI
- **Utility Functions**: `cn()` helper already available in `src/lib/utils.ts`

### 2. Available Shadcn UI Components (25 total)
Located in `src/components/ui/`:
- accordion
- alert-dialog
- alert
- avatar
- badge
- button
- card
- checkbox
- dialog
- dropdown-menu
- input
- label
- popover
- progress (newly added)
- scroll-area
- select
- separator
- sheet
- skeleton (newly added)
- switch
- table
- tabs
- textarea
- tooltip
- Pagination

### 3. Fully Converted Pages

#### Login (`src/pages/Login.tsx`)
- Uses: Card, Button, Input, Label, Checkbox
- Follows Shadcn UI design patterns
- Status: ✅ Complete

#### Register (`src/pages/Register.tsx`)
- Uses: Card, Button, Input, Label, Checkbox
- Password visibility toggle with Shadcn Button
- Status: ✅ Complete

#### Dashboard (`src/pages/Dashboard.tsx`)
- Uses: Card, CardContent, Badge, Button, Skeleton
- Stats cards with consistent design
- Loading states with Skeleton components
- Status: ✅ Complete

#### Home (`src/pages/Home.tsx`)
- Uses: Card, CardContent, Button
- Landing page with feature cards
- Hero section with CTA buttons
- Status: ✅ Complete

#### Payment Pages
- `BillingPaymentSuccess.tsx`: Card, Button ✅
- `BillingPaymentCancel.tsx`: Card, Button ✅

### 4. Component-Level Conversions

#### Navigation (`src/components/Navigation.tsx`)
- Uses: Button, DropdownMenu, Avatar, Badge, Sheet, Separator
- Mobile-responsive with Sheet component
- Status: ✅ Already using Shadcn UI

#### Sidebar (`src/components/Sidebar.tsx`)
- Uses: Button, Tooltip
- Collapsible design
- Status: ✅ Already using Shadcn UI

### 5. Pages Ready for Conversion

All remaining pages have Shadcn UI imports added and are ready to use Shadcn components:
- Activity.tsx
- Admin.tsx
- ApiDocs.tsx
- Billing.tsx
- Containers.tsx
- ContainerDetail.tsx
- InvoiceDetail.tsx
- Settings.tsx
- Support.tsx
- TransactionDetail.tsx
- VPS.tsx
- VPSDetail.tsx

These pages can now progressively replace custom Tailwind classes with Shadcn components.

## Design Token Reference

### Color System
The application uses CSS variables for consistent theming:

```css
--background: Background color
--foreground: Text color
--primary: Primary brand color
--primary-foreground: Text on primary
--secondary: Secondary color
--secondary-foreground: Text on secondary
--muted: Muted background
--muted-foreground: Muted text
--accent: Accent color
--accent-foreground: Text on accent
--destructive: Error/danger color
--destructive-foreground: Text on destructive
--border: Border color
--input: Input border color
--ring: Focus ring color
--card: Card background
--card-foreground: Card text
--popover: Popover background
--popover-foreground: Popover text
```

### Usage Example

**Before (Custom Tailwind):**
```tsx
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Title</h2>
  <p className="text-gray-600 dark:text-gray-400">Description</p>
</div>
```

**After (Shadcn UI):**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

## Common Patterns

### Buttons
```tsx
// Primary button
<Button>Click me</Button>

// Secondary button
<Button variant="secondary">Click me</Button>

// Outline button
<Button variant="outline">Click me</Button>

// Destructive button
<Button variant="destructive">Delete</Button>

// Ghost button
<Button variant="ghost">Subtle</Button>

// Link button
<Button variant="link">Link</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
```

### Cards
```tsx
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description text</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Main content */}
  </CardContent>
  <CardFooter>
    {/* Footer actions */}
  </CardFooter>
</Card>
```

### Badges
```tsx
<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="destructive">Error</Badge>
```

### Loading States
```tsx
// Skeleton for loading
<Skeleton className="h-12 w-12 rounded-full" />
<Skeleton className="h-4 w-48" />

// Spinner in button
<Button disabled>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Loading...
</Button>
```

## Migration Guidelines

When converting remaining pages:

1. **Import components** - Already done for all pages
2. **Replace card divs** with `<Card>` components
3. **Replace custom buttons** with `<Button>` components
4. **Replace status badges** with `<Badge>` components
5. **Use semantic color classes**: Instead of `text-gray-600 dark:text-gray-400`, use `text-muted-foreground`
6. **Use design tokens**: Instead of `bg-white dark:bg-gray-800`, use `bg-card`

## Adding New Components

To add more Shadcn UI components:

```bash
npx shadcn@latest add [component-name]
```

Examples:
```bash
npx shadcn@latest add command
npx shadcn@latest add calendar
npx shadcn@latest add form
```

Note: Due to network restrictions, you may need to manually copy component code from https://ui.shadcn.com/docs/components/

## Benefits

1. **Consistency**: Unified design system across the application
2. **Accessibility**: Radix UI primitives are fully accessible
3. **Dark Mode**: Built-in dark mode support through CSS variables
4. **Maintainability**: Less custom CSS, more reusable components
5. **Type Safety**: Full TypeScript support
6. **Customization**: Easy to customize through Tailwind utilities

## Resources

- [Shadcn UI Documentation](https://ui.shadcn.com/)
- [Radix UI Documentation](https://www.radix-ui.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
