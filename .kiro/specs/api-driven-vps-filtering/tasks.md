# Implementation Plan

- [x] 1. Add type class mapping configuration

  - Create mapping tables for DigitalOcean and Linode classifications
  - Add DIGITALOCEAN_TYPE_CLASS_MAP constant with description-to-type-class mappings
  - Add LINODE_TYPE_CLASS_MAP constant with class-to-type-class mappings
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4_

- [x] 2. Update DigitalOcean size mapping function

  - Modify fetchDigitalOceanSizes to extract the description field from API response
  - Implement mapping logic using DIGITALOCEAN_TYPE_CLASS_MAP
  - Add console warning for unmapped description values
  - Set type_class field in mapped LinodeType objects
  - _Requirements: 1.1, 1.3, 2.1, 2.4, 5.1, 5.2, 5.4_

- [x] 3. Update Linode type mapping function

  - Modify Linode type fetching to extract the class field from API response
  - Implement mapping logic using LINODE_TYPE_CLASS_MAP
  - Add console warning for unmapped class values
  - Set type_class field in mapped LinodeType objects
  - _Requirements: 1.2, 1.3, 2.2, 2.4, 5.1, 5.3, 5.4_

- [x] 4. Simplify plan type filtering logic

  - Remove hardcoded slug prefix matching from filteredPlanTypes useMemo
  - Update filter logic to use type_class field directly
  - Ensure case-insensitive comparison
  - Maintain "all" filter behavior to show all plans
  - _Requirements: 1.4, 3.1, 3.2, 3.3, 3.4, 4.3_

- [ ] 5. Verify backward compatibility

  - Test that existing VPS plans continue to display correctly
  - Verify LinodeType interface structure is maintained

  - Ensure no database modifications occur
  - Test with plans created before the refactor
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 6. Add inline documentation
  - Document the purpose of mapping tables
  - Add comments explaining the mapping logic
  - Document the default behavior for unmapped values
  - Add JSDoc comments for mapping functions
  - _Requirements: 5.5_
