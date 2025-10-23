# Design Document

## Overview

This design addresses the critical bug where contact method data saved through the admin interface doesn't appear on the public Contact page. The issue appears to be in the data flow between the admin save operations, database persistence, and public data retrieval. The design focuses on identifying and fixing the broken links in this chain while ensuring robust error handling and data validation.

## Architecture

### Current Data Flow (Broken)
```
Admin Interface → API Save → Database → API Retrieve → Public Display
     ✓              ?           ?           ?              ✗
```

### Target Data Flow (Fixed)
```
Admin Interface → API Save → Database → API Retrieve → Public Display
     ✓              ✓           ✓           ✓              ✓
```

### Key Components to Investigate

1. **Admin Contact Method Forms** - Verify data is being sent correctly
2. **Admin API Endpoints** - Ensure PUT operations are working
3. **Database Schema** - Verify contact_methods table structure
4. **Public API Endpoint** - Ensure GET operations return correct data
5. **Public Contact Page** - Verify data rendering logic

## Root Cause Analysis

### Potential Issues to Investigate

1. **API Endpoint Mismatch**
   - Admin saves to different endpoint than public reads from
   - Incorrect method_type parameter handling
   - Missing or incorrect authentication middleware

2. **Database Schema Issues**
   - JSONB config field not storing data correctly
   - Missing or incorrect indexes
   - Trigger issues with updated_at timestamps

3. **Data Serialization Problems**
   - JSONB data not being serialized correctly on save
   - JSONB data not being deserialized correctly on retrieval
   - Type mismatches between admin forms and database schema

4. **API Response Structure Issues**
   - Public API not returning data in expected format
   - Missing or incorrect data transformation
   - Active/inactive filtering not working correctly

## Components and Interfaces

### Database Schema Verification

The contact_methods table should have this structure:
```sql
CREATE TABLE contact_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    method_type VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### API Endpoint Verification

#### Admin Save Endpoint
```typescript
PUT /api/admin/contact/methods/:method_type
Content-Type: application/json
Authorization: Bearer <admin-token>

Body:
{
  title: string,
  description: string,
  is_active: boolean,
  config: {
    // Method-specific configuration
    email_address?: string,
    response_time?: string,
    phone_number?: string,
    availability_text?: string,
    dashboard_link?: string,
    priority_queues?: Array<{label: string, response_time: string}>,
    address_line1?: string,
    address_line2?: string,
    city?: string,
    state?: string,
    postal_code?: string,
    country?: string,
    appointment_required?: string
  }
}
```

#### Public Retrieve Endpoint
```typescript
GET /api/contact/config
Content-Type: application/json

Response:
{
  categories: ContactCategory[],
  methods: {
    email?: {
      title: string,
      description: string,
      is_active: boolean,
      email_address: string,
      response_time: string
    },
    phone?: {
      title: string,
      description: string,
      is_active: boolean,
      phone_number: string,
      availability_text: string
    },
    ticket?: {
      title: string,
      description: string,
      is_active: boolean,
      dashboard_link: string,
      priority_queues: Array<{label: string, response_time: string}>
    },
    office?: {
      title: string,
      description: string,
      is_active: boolean,
      address_line1: string,
      address_line2?: string,
      city: string,
      state: string,
      postal_code: string,
      country: string,
      appointment_required?: string
    }
  },
  availability: PlatformAvailability[],
  emergency_support_text: string | null
}
```

### Data Models

#### Contact Method Database Model
```typescript
interface ContactMethodDB {
  id: string;
  method_type: 'email' | 'phone' | 'ticket' | 'office';
  title: string;
  description: string | null;
  config: Record<string, any>; // JSONB field
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

#### Contact Method API Models
```typescript
interface EmailConfig {
  email_address: string;
  response_time: string;
}

interface PhoneConfig {
  phone_number: string;
  availability_text: string;
}

interface TicketConfig {
  dashboard_link: string;
  priority_queues: Array<{
    label: string;
    response_time: string;
  }>;
}

interface OfficeConfig {
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  appointment_required?: string;
}
```

## Diagnostic Strategy

### Step 1: Database Verification
1. Check if contact_methods table exists and has correct schema
2. Verify seed data was inserted correctly
3. Test direct database queries to see if data is being saved

### Step 2: Admin API Testing
1. Test PUT endpoints with curl/Postman to verify they work
2. Check database after API calls to see if data is persisted
3. Verify JSONB config field is storing data correctly

### Step 3: Public API Testing
1. Test GET /api/contact/config endpoint directly
2. Verify response structure matches expected format
3. Check if active/inactive filtering is working

### Step 4: Frontend Integration Testing
1. Verify admin forms are sending correct data
2. Check public page is processing API response correctly
3. Test error handling and fallback scenarios

## Error Handling

### Database Level
- Add comprehensive logging for all contact method operations
- Implement transaction rollback for failed operations
- Add data validation constraints at database level

### API Level
- Return detailed error messages for debugging
- Log all API requests and responses
- Implement proper HTTP status codes

### Frontend Level
- Display specific error messages to administrators
- Implement retry mechanisms for failed operations
- Add loading states and success feedback

## Testing Strategy

### Unit Tests
- Test individual API endpoints with various data combinations
- Test database operations with different JSONB configurations
- Test data serialization/deserialization

### Integration Tests
- Test complete admin save workflow
- Test complete public retrieval workflow
- Test error scenarios and edge cases

### End-to-End Tests
- Test admin interface → database → public display workflow
- Test with different contact method configurations
- Test active/inactive toggling

## Implementation Plan

### Phase 1: Diagnosis
1. Create diagnostic scripts to test each component
2. Identify the exact point of failure in the data flow
3. Document current vs expected behavior

### Phase 2: Fix Implementation
1. Fix identified issues in order of severity
2. Add comprehensive logging and error handling
3. Implement data validation improvements

### Phase 3: Testing and Validation
1. Run comprehensive tests on fixed components
2. Verify end-to-end workflow works correctly
3. Add monitoring and alerting for future issues

## Monitoring and Maintenance

### Logging
- Log all contact method save operations
- Log all contact method retrieval operations
- Log any data validation failures

### Health Checks
- Add endpoint to verify contact method data integrity
- Monitor API response times and error rates
- Alert on contact method configuration issues

### Documentation
- Document the complete data flow for future reference
- Create troubleshooting guide for common issues
- Maintain API documentation with examples