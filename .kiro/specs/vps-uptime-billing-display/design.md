# Design Document

## Overview

This feature adds VPS uptime tracking to the billing page by calculating and displaying the total hours each VPS instance has been active in a user's account. The implementation involves creating a new backend API endpoint to calculate VPS uptime statistics, updating the frontend billing page to display this information in a dedicated section, and enhancing the CSV export functionality to include uptime data.

The design leverages existing database tables (`vps_instances`, `vps_billing_cycles`) and follows the established patterns in the ContainerStacks codebase for API routes, service layer logic, and React component structure.

## Architecture

### Backend Components

1. **API Route** (`api/routes/vps.ts`)
   - New endpoint: `GET /api/vps/uptime-summary`
   - Returns aggregated uptime data for all VPS instances in the user's organization
   - Calculates active hours from creation timestamp to current time (or deletion time)

2. **Service Layer** (optional enhancement to `api/services/billingService.ts`)
   - Add utility methods for uptime calculations if complex logic is needed
   - Reuse existing billing cycle data for accuracy

### Frontend Components

1. **Billing Page** (`src/pages/Billing.tsx`)
   - Add new state for VPS uptime data
   - Create new section displaying VPS uptime statistics
   - Integrate uptime data into existing overview cards
   - Update CSV export to include uptime information

2. **API Service** (`src/lib/api.ts` or `src/services/paymentService.ts`)
   - Add method to fetch VPS uptime data from the new endpoint

### Data Flow

```
User loads Billing Page
  ↓
Frontend calls GET /api/vps/uptime-summary
  ↓
Backend queries vps_instances table
  ↓
Backend calculates active hours for each VPS
  ↓
Backend aggregates total hours and costs
  ↓
Frontend receives uptime data
  ↓
Frontend displays in dedicated section
```

## Components and Interfaces

### Backend API Endpoint

**Route:** `GET /api/vps/uptime-summary`

**Authentication:** Required (JWT token)

**Authorization:** Organization-scoped (user can only see their org's VPS data)

**Response Schema:**
```typescript
interface VPSUptimeSummary {
  totalActiveHours: number;
  totalEstimatedCost: number;
  vpsInstances: Array<{
    id: string;
    label: string;
    status: string;
    createdAt: string;
    deletedAt: string | null;
    activeHours: number;
    hourlyRate: number;
    estimatedCost: number;
    lastBilledAt: string | null;
  }>;
}
```

**Implementation Details:**
- Query `vps_instances` table filtered by `organization_id`
- Join with `vps_plans` to get hourly rates
- Calculate active hours: `(NOW() - created_at) / 3600000` (in hours)
- For deleted VPS: use deletion timestamp instead of NOW()
- Sum all active hours for total
- Multiply hours by rates for cost estimates

### Frontend Component Updates

**New State Variables:**
```typescript
interface VPSUptimeData {
  totalActiveHours: number;
  totalEstimatedCost: number;
  vpsInstances: Array<{
    id: string;
    label: string;
    status: string;
    activeHours: number;
    hourlyRate: number;
    estimatedCost: number;
  }>;
}

const [vpsUptimeData, setVpsUptimeData] = useState<VPSUptimeData | null>(null);
const [uptimeLoading, setUptimeLoading] = useState(false);
```

**New UI Section:**
- Add a new Card component in the billing overview section
- Display total active hours across all VPS instances
- Show a table or list of individual VPS instances with their uptime
- Include columns: VPS Label, Status, Active Hours, Hourly Rate, Estimated Cost

**CSV Export Enhancement:**
- Add VPS uptime data to existing export functions
- New CSV file: `vps-uptime-report.csv`
- Columns: VPS Label, Status, Created Date, Active Hours, Hourly Rate, Estimated Cost

## Data Models

### Database Tables (Existing)

**vps_instances:**
```sql
- id (UUID)
- organization_id (UUID)
- label (VARCHAR)
- status (VARCHAR)
- created_at (TIMESTAMP)
- last_billed_at (TIMESTAMP)
- plan_id (VARCHAR)
```

**vps_plans:**
```sql
- id (UUID)
- provider_plan_id (VARCHAR)
- base_price (DECIMAL)
- markup_price (DECIMAL)
```

**vps_billing_cycles:**
```sql
- id (UUID)
- vps_instance_id (UUID)
- billing_period_start (TIMESTAMP)
- billing_period_end (TIMESTAMP)
- hourly_rate (DECIMAL)
- total_amount (DECIMAL)
- status (VARCHAR)
```

### Calculation Logic

**Active Hours Calculation:**
```typescript
const activeHours = (endTime - startTime) / (1000 * 60 * 60);
// where:
// - startTime = vps_instances.created_at
// - endTime = NOW() or deletion timestamp
```

**Hourly Rate Calculation:**
```typescript
const hourlyRate = (base_price + markup_price) / 730;
// 730 = average hours per month (365 days * 24 hours / 12 months)
```

**Estimated Cost Calculation:**
```typescript
const estimatedCost = activeHours * hourlyRate;
```

## Error Handling

### Backend Error Scenarios

1. **No VPS Instances Found**
   - Return empty array with zero totals
   - HTTP 200 with empty data structure

2. **Database Query Failure**
   - Log error to console
   - Return HTTP 500 with error message
   - Frontend displays error toast

3. **Missing Plan Data**
   - Use fallback hourly rate (e.g., $0.027/hour)
   - Log warning about missing plan

4. **Invalid Timestamps**
   - Skip invalid records
   - Log warning
   - Continue processing valid records

### Frontend Error Scenarios

1. **API Request Failure**
   - Display error toast notification
   - Show "Unable to load VPS uptime data" message
   - Provide retry button

2. **No Data Available**
   - Display "No VPS instances found" message
   - Hide uptime section if no data

3. **Loading State**
   - Show skeleton loader while fetching data
   - Disable export button during load

## Testing Strategy

### Backend Testing

1. **Unit Tests**
   - Test uptime calculation logic with various timestamps
   - Test hourly rate calculation from plan data
   - Test aggregation of multiple VPS instances
   - Test handling of deleted VPS instances

2. **Integration Tests**
   - Test API endpoint with authenticated requests
   - Test organization-scoped data filtering
   - Test response format and data types
   - Test error handling for missing data

### Frontend Testing

1. **Component Tests**
   - Test rendering of uptime data
   - Test loading states
   - Test error states
   - Test CSV export functionality

2. **Integration Tests**
   - Test data fetching on page load
   - Test interaction with existing billing components
   - Test responsive layout on mobile devices

### Manual Testing Scenarios

1. **User with multiple VPS instances**
   - Verify all instances are listed
   - Verify total hours calculation is correct
   - Verify costs match expected values

2. **User with no VPS instances**
   - Verify empty state is displayed
   - Verify no errors occur

3. **User with deleted VPS instances**
   - Verify deleted instances show correct active hours
   - Verify they're marked as deleted in the UI

4. **CSV Export**
   - Verify exported file contains all VPS data
   - Verify formatting is correct
   - Verify calculations match UI display

## Performance Considerations

1. **Database Query Optimization**
   - Use indexed columns (organization_id, created_at)
   - Limit result set if needed (pagination for large datasets)
   - Use single query with JOIN instead of multiple queries

2. **Frontend Rendering**
   - Memoize calculation functions
   - Use React.memo for list items if many VPS instances
   - Lazy load uptime section if below the fold

3. **Caching Strategy**
   - Consider caching uptime data for 5-10 minutes
   - Invalidate cache on VPS creation/deletion
   - Use React Query for automatic cache management

## Security Considerations

1. **Authorization**
   - Verify user belongs to organization
   - Use existing `requireOrganization` middleware
   - Prevent cross-organization data access

2. **Data Validation**
   - Validate organization_id from JWT token
   - Sanitize any user inputs (though none expected)
   - Validate timestamp calculations to prevent overflow

3. **Rate Limiting**
   - Use existing rate limiting middleware
   - No special rate limits needed for this endpoint

## UI/UX Design

### Desktop Layout

```
┌─────────────────────────────────────────────────────────┐
│ Billing & Payments                                      │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│ │ Wallet      │ │ This Month  │ │ Spent This  │       │
│ │ Balance     │ │             │ │ Month       │       │
│ └─────────────┘ └─────────────┘ └─────────────┘       │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ VPS Uptime Summary                                  ││
│ │                                                     ││
│ │ Total Active Hours: 1,234.5 hours                  ││
│ │ Estimated Total Cost: $33.33                       ││
│ │                                                     ││
│ │ ┌─────────────────────────────────────────────────┐││
│ │ │ VPS Label    Status   Hours   Rate    Cost     │││
│ │ │ web-server-1 running  720.0   $0.027  $19.44   │││
│ │ │ db-server-1  stopped  514.5   $0.027  $13.89   │││
│ │ └─────────────────────────────────────────────────┘││
│ │                                                     ││
│ │ [Export VPS Uptime Report]                         ││
│ └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Mobile Layout

- Stack cards vertically
- Use collapsible sections for VPS list
- Horizontal scroll for table if needed
- Simplified view showing only essential data

### Visual Design

- Use existing Card component from shadcn/ui
- Match color scheme with existing billing cards
- Use Clock or Timer icon for uptime section
- Green color for active hours (consistent with credits)
- Muted text for secondary information

## Implementation Notes

1. **Reuse Existing Patterns**
   - Follow existing API route structure in `api/routes/vps.ts`
   - Use existing authentication middleware
   - Follow existing React component patterns in `src/pages/Billing.tsx`

2. **Code Organization**
   - Keep uptime calculation logic in backend
   - Frontend only handles display and formatting
   - Reuse existing utility functions (formatCurrency, formatDate)

3. **Backward Compatibility**
   - Feature is additive, no breaking changes
   - Existing billing functionality remains unchanged
   - Gracefully handle missing data

4. **Future Enhancements**
   - Add filtering by date range
   - Add charts/graphs for uptime trends
   - Add alerts for high usage
   - Add comparison with previous periods
