# Design Document

## Overview

This design refactors the VPS plan filtering system to use API-provided classification data instead of hardcoded slug prefix matching. The solution introduces provider-specific mapping functions that transform API responses into a common format while preserving the original classification information.

## Architecture

### Current State

The current implementation in `src/pages/Admin.tsx` uses hardcoded logic to determine type classes:

```typescript
// Current approach (problematic)
const typeClass = slug.startsWith('s-') ? 'standard' : 
                  slug.startsWith('c-') ? 'cpu' : 
                  slug.startsWith('m-') ? 'memory' : 'standard';
```

This approach:
- Is fragile and breaks when providers introduce new slug patterns
- Doesn't use the classification data provided by the APIs
- Requires code changes when providers update their offerings

### Proposed State

The new implementation will:
1. Extract classification data from API responses
2. Use provider-specific mapping functions to normalize classifications
3. Store the normalized `type_class` in the mapped data structure
4. Filter plans based on the stored `type_class` value

## Components and Interfaces

### 1. Type Class Mapping Configuration

Create mapping tables that convert provider-specific classifications to standardized type classes.

#### DigitalOcean Description Mapping

Based on the DigitalOcean API specification, the `description` field contains values like:
- "Basic" → `standard`
- "General Purpose" → `standard`
- "CPU-Optimized" → `cpu`
- "Memory-Optimized" → `memory`
- "Storage-Optimized" → `storage`

```typescript
const DIGITALOCEAN_TYPE_CLASS_MAP: Record<string, string> = {
  'basic': 'standard',
  'general purpose': 'standard',
  'cpu-optimized': 'cpu',
  'memory-optimized': 'memory',
  'storage-optimized': 'storage',
  // Add more mappings as needed
};
```

#### Linode Class Mapping

Based on the Linode API specification, the `class` field contains values like:
- "nanode" → `standard`
- "standard" → `standard`
- "dedicated" → `cpu`
- "highmem" → `memory`
- "premium" → `premium`
- "gpu" → `gpu`
- "accelerated" → `accelerated`

```typescript
const LINODE_TYPE_CLASS_MAP: Record<string, string> = {
  'nanode': 'standard',
  'standard': 'standard',
  'dedicated': 'cpu',
  'highmem': 'memory',
  'premium': 'premium',
  'gpu': 'gpu',
  'accelerated': 'accelerated',
};
```

### 2. Mapping Functions

#### DigitalOcean Size Mapping

Update the `fetchDigitalOceanSizes` function to use the `description` field:

```typescript
const fetchDigitalOceanSizes = async () => {
  // ... fetch logic ...
  
  const mappedSizes: LinodeType[] = (data.sizes || []).map((size: any) => {
    // Extract description and normalize it
    const description = (size.description || '').toLowerCase().trim();
    
    // Map to type class using the mapping table
    const typeClass = DIGITALOCEAN_TYPE_CLASS_MAP[description] || 'standard';
    
    // Log warning if unmapped
    if (!DIGITALOCEAN_TYPE_CLASS_MAP[description] && description) {
      console.warn(`Unmapped DigitalOcean description: "${size.description}"`);
    }
    
    return {
      id: size.slug,
      label: size.description || size.slug,
      disk: size.disk * 1024,
      memory: size.memory,
      vcpus: size.vcpus,
      transfer: size.transfer * 1024,
      price: {
        hourly: size.price_hourly,
        monthly: size.price_monthly
      },
      type_class: typeClass
    };
  });
  
  setLinodeTypes(mappedSizes);
};
```

#### Linode Type Mapping

Update the Linode type fetching to use the `class` field:

```typescript
const fetchLinodeTypes = async () => {
  // ... fetch logic ...
  
  const mappedTypes: LinodeType[] = (data.data || []).map((type: any) => {
    // Extract class and normalize it
    const linodeClass = (type.class || '').toLowerCase().trim();
    
    // Map to type class using the mapping table
    const typeClass = LINODE_TYPE_CLASS_MAP[linodeClass] || 'standard';
    
    // Log warning if unmapped
    if (!LINODE_TYPE_CLASS_MAP[linodeClass] && linodeClass) {
      console.warn(`Unmapped Linode class: "${type.class}"`);
    }
    
    return {
      id: type.id,
      label: type.label,
      disk: type.disk,
      memory: type.memory,
      vcpus: type.vcpus,
      transfer: type.transfer,
      price: {
        hourly: type.price.hourly,
        monthly: type.price.monthly
      },
      type_class: typeClass
    };
  });
  
  setLinodeTypes(mappedTypes);
};
```

### 3. Filtering Logic

Simplify the `filteredPlanTypes` useMemo hook to use the stored `type_class`:

```typescript
const filteredPlanTypes = useMemo(() => {
  if (planTypeFilter === 'all') return linodeTypes;
  
  return linodeTypes.filter(type => {
    const typeClass = (type.type_class || '').toLowerCase();
    return typeClass === planTypeFilter.toLowerCase();
  });
}, [linodeTypes, planTypeFilter]);
```

## Data Models

### LinodeType Interface

The existing `LinodeType` interface already includes `type_class`:

```typescript
interface LinodeType {
  id: string;
  label: string;
  disk: number;
  memory: number;
  vcpus: number;
  transfer: number;
  price: {
    hourly: number;
    monthly: number;
  };
  type_class: string;  // This field will now be populated correctly
}
```

### API Response Structures

#### DigitalOcean Size Response

```json
{
  "slug": "s-1vcpu-1gb",
  "memory": 1024,
  "vcpus": 1,
  "disk": 25,
  "transfer": 1,
  "price_monthly": 5,
  "price_hourly": 0.00744,
  "description": "Basic",
  "available": true
}
```

#### Linode Type Response

```json
{
  "id": "g6-standard-2",
  "label": "Linode 4GB",
  "class": "standard",
  "disk": 81920,
  "memory": 4096,
  "vcpus": 2,
  "transfer": 4000,
  "price": {
    "hourly": 0.036,
    "monthly": 24
  }
}
```

## Error Handling

### Unmapped Classifications

When a provider returns a classification value that isn't in the mapping table:

1. Log a warning to the console with the unmapped value
2. Default to `standard` type class
3. Continue processing without throwing an error

```typescript
if (!DIGITALOCEAN_TYPE_CLASS_MAP[description] && description) {
  console.warn(`Unmapped DigitalOcean description: "${size.description}". Defaulting to 'standard'.`);
}
```

### Missing Classification Fields

When a provider response doesn't include the expected classification field:

1. Use an empty string as the normalized value
2. Apply the default mapping (which will result in `standard`)
3. Continue processing without throwing an error

```typescript
const description = (size.description || '').toLowerCase().trim();
const typeClass = DIGITALOCEAN_TYPE_CLASS_MAP[description] || 'standard';
```

### API Fetch Failures

Existing error handling for API fetch failures remains unchanged. The mapping logic only applies to successful responses.

## Testing Strategy

### Unit Testing Approach

1. **Mapping Function Tests**
   - Test each mapping table with known provider values
   - Verify correct type class assignment
   - Test default behavior for unmapped values
   - Test handling of missing/null classification fields

2. **Filter Logic Tests**
   - Test filtering with each type class value
   - Test "all" filter shows all plans
   - Test case-insensitive filtering
   - Test empty results when no plans match

### Integration Testing Approach

1. **Provider API Integration**
   - Verify DigitalOcean API returns expected `description` field
   - Verify Linode API returns expected `class` field
   - Test with real API responses (if available in test environment)

2. **UI Integration**
   - Verify filter dropdown shows correct options
   - Verify selecting a filter updates the displayed plans
   - Verify plan creation uses correct type class

### Manual Testing Checklist

1. Load admin interface and navigate to VPS Plans section
2. Select DigitalOcean provider and verify sizes load correctly
3. Apply each type class filter and verify correct plans display
4. Select Linode provider and verify types load correctly
5. Apply each type class filter and verify correct plans display
6. Create a new VPS plan and verify it uses the correct type class
7. Check browser console for any unmapped classification warnings

## Design Decisions and Rationales

### Decision 1: Use Mapping Tables Instead of Direct Assignment

**Rationale:** Provider classification values may not match our standardized type classes exactly. Mapping tables provide:
- Flexibility to normalize different provider terminologies
- Easy updates when providers change their classification schemes
- Clear documentation of how provider values map to our system

### Decision 2: Default to 'standard' for Unmapped Values

**Rationale:** 
- Most VPS plans are general-purpose/standard configurations
- Prevents errors when providers introduce new classifications
- Allows the system to continue functioning while administrators update mappings

### Decision 3: Log Warnings for Unmapped Classifications

**Rationale:**
- Alerts administrators to new provider classifications
- Doesn't break the user experience
- Provides actionable information for system maintenance

### Decision 4: Maintain LinodeType Interface Structure

**Rationale:**
- Minimizes changes to existing UI components
- Preserves backward compatibility
- Reduces risk of introducing bugs in unrelated code

### Decision 5: Provider-Specific Mapping Functions

**Rationale:**
- Each provider has different API response structures
- Allows independent evolution of provider integrations
- Makes code easier to understand and maintain

## Migration Path

### Phase 1: Update Mapping Functions
- Add mapping tables to Admin.tsx
- Update fetchDigitalOceanSizes to use description field
- Update Linode fetching to use class field (if not already)

### Phase 2: Simplify Filter Logic
- Remove hardcoded slug prefix matching
- Update filteredPlanTypes to use type_class field

### Phase 3: Testing and Validation
- Test with both providers
- Verify all type classes work correctly
- Check for console warnings about unmapped values

### Phase 4: Documentation
- Update code comments
- Document mapping tables
- Add inline documentation for future maintainers

## Future Enhancements

### 1. Dynamic Mapping Configuration

Store mapping tables in the database or configuration files instead of hardcoding them. This would allow administrators to update mappings without code changes.

### 2. Provider-Specific Type Class Extensions

Allow providers to define custom type classes beyond the standard set. This would support provider-specific features while maintaining compatibility.

### 3. Automated Mapping Discovery

Implement a system that analyzes provider API responses and suggests mappings for new classification values.

### 4. Type Class Metadata

Extend the type class system to include metadata like descriptions, icons, and recommended use cases for each class.
