# Implementation Plan

- [x] 1. Create backend API endpoint for VPS uptime data

  - Create new route `GET /api/vps/uptime-summary` in `api/routes/vps.ts`
  - Implement database query to fetch VPS instances with creation timestamps and plan data
  - Calculate active hours for each VPS instance (current time - created_at)
  - Calculate hourly rates from vps_plans table (base_price + markup_price) / 730
  - Calculate estimated costs (active hours \* hourly rate)
  - Aggregate total active hours and total estimated cost across all VPS instances
  - Return JSON response with VPSUptimeSummary structure
  - Add error handling for database failures and missing plan data
  - _Requirements: 1.1, 1.2, 1.4, 2.1, 2.2, 3.1, 3.2, 3.5, 4.1, 4.2, 4.3, 4.5_

- [x] 2. Add frontend service method to fetch VPS uptime data

  - Add `getVPSUptimeSummary()` method to `src/services/paymentService.ts` or create new service file
  - Implement API call to `GET /api/vps/uptime-summary` endpoint

  - Add TypeScript interface for VPSUptimeSummary response type
  - Handle API errors and return appropriate error messages
  - _Requirements: 4.4_

- [x] 3. Update Billing page to display VPS uptime summary

  - Add state variables for VPS uptime data and loading state in `src/pages/Billing.tsx`

  - Create `loadVPSUptimeData()` function to fetch uptime data on page load
  - Add useEffect hook to load uptime data when component mounts
  - Create new Card component section for "VPS Uptime Summary"
  - Display total active hours in summary card with Clock/Timer icon
  - Display total estimated cost in summary card
  - Handle loading state with skeleton loader
  - Handle error state with error message and retry button
  - Handle empty state when no VPS instances exist
  - _Requirements: 1.1, 1.3, 2.3, 2.4, 2.5, 4.4_

- [x] 4. Create VPS uptime details table

  - Create table component to display individual VPS uptime details

  - Add columns: VPS Label, Status, Active Hours, Hourly Rate, Estimated Cost
  - Format active hours with decimal precision (e.g., "1,234.5 hours")
  - Format hourly rate using existing formatCurrency utility
  - Format estimated cost using existing formatCurrency utility
  - Add responsive design for mobile devices (horizontal scroll or stacked cards)
  - Style table to match existing billing page design patterns
  - _Requirements: 1.1, 1.3, 3.1, 3.2, 3.3, 3.4_

- [x] 5. Implement CSV export for VPS uptime data

  - Create `handleExportVPSUptime()` function
    ptime summary section
  - Create `handleExportVPSUptime()` function
  - Format VPS uptime data for CSV export with headers: VPS Label, Status, Created Date, Active Hours, Hourly Rate, Estimated Cost
  - Use existing `exportToCSV()` utility function
  - Generate filename with timestamp: `vps-uptime-report-YYYY-MM-DD.csv`
  - Show success toast notification on successful export
  - Handle export errors with error toast notification
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 6. Add VPS uptime card to billing overview section


  - Display total active hours across all VPS instances
    (alongside Wallet Balance, This Month, Spent This Month)
  - Display total active hours across all VPS instances
  - Use appropriate icon (Clock or Timer from lucide-react)
  - Match styling with existing overview cards
  - Update grid layout to accommodate new card (change from 3 columns to 4, or add to second row)
  - _Requirements: 2.4_

- [ ]\* 7. Add error handling and edge cases

  - Handle case where VPS has no associated plan (use fallback rate)
  - Handle case where timestamps are invalid or null
  - Handle case where organization has no VPS instances
  - Add console logging for debugging
  - Add user-friendly error messages
  - _Requirements: 1.4, 2.5, 4.5_

- [ ]\* 8. Optimize performance and add caching
  - Add memoization for calculation functions if needed
  - Consider adding React Query for automatic caching
  - Optimize database query with proper indexes
  - Test performance with large datasets (100+ VPS instances)
  - _Requirements: 4.1, 4.2_
