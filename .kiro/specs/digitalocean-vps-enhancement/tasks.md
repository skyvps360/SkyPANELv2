# Implementation Plan

- [ ] 1. Create step configuration system for conditional VPS creation workflow
  - Implement `getActiveSteps` function that returns active steps based on provider type and marketplace app selection
  - Create TypeScript interfaces for `StepConfiguration` and `StepConfigurationOptions`
  - Add logic to handle step numbering when step 3 (OS selection) is skipped for DigitalOcean marketplace apps
  - _Requirements: 1.1, 1.3, 1.4, 8.1, 8.2_

- [ ] 2. Enhance VPS creation modal with conditional step logic
  - [ ] 2.1 Update CreateVPSSteps component to use step configuration system
    - Modify component to accept and use active steps configuration
    - Implement conditional rendering based on step configuration
    - Update step indicators to show correct step numbers when steps are skipped
    - _Requirements: 1.1, 1.2, 1.3, 7.1, 7.2_

  - [ ] 2.2 Implement enhanced navigation logic for step skipping
    - Update navigation handlers to respect active steps configuration
    - Implement proper back navigation that skips inactive steps
    - Add validation to prevent navigation to inactive steps
    - _Requirements: 1.5, 7.4, 8.3_

  - [ ] 2.3 Update step indicators and visual feedback
    - Modify step indicators to show correct total step count
    - Add visual indication for skipped steps in navigation sidebar
    - Update step description text to reflect conditional workflow
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [ ] 3. Implement marketplace app integration with automatic OS handling
  - [ ] 3.1 Update form handling for marketplace app selection
    - Modify form change handlers to automatically set image field when marketplace app is selected
    - Clear marketplace app selection when provider changes from DigitalOcean
    - Update form validation to handle conditional field requirements
    - _Requirements: 2.1, 2.5_

  - [ ] 3.2 Update VPS creation API payload handling
    - Modify backend VPS creation to handle marketplace app slug in request payload
    - Ensure OS image parameter is not included when marketplace app is provided
    - Update DigitalOcean provider service to use marketplace app for droplet creation
    - _Requirements: 2.2, 2.3, 2.4_

- [ ] 4. Implement per-user SSH key filtering
  - [ ] 4.1 Create database schema for user SSH key associations
    - Create migration for `user_ssh_keys` table with proper indexes
    - Add foreign key relationships to users table
    - Include fields for both Linode and DigitalOcean key IDs
    - _Requirements: 3.5, 5.3_

  - [ ] 4.2 Update SSH key API endpoints with user filtering
    - Modify existing SSH key endpoints to accept and use user_id parameter
    - Add authorization checks to prevent cross-user key access
    - Return 403 Forbidden error for unauthorized key access attempts
    - Filter out provider keys not associated with any platform user
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 4.3 Update frontend SSH key components with user filtering
    - Modify DigitalOceanConfiguration component to use user-filtered keys
    - Update Linode SSH key components to use user-filtered keys
    - Add proper error handling for SSH key fetch failures
    - _Requirements: 3.1, 3.2_

- [ ] 5. Create SSH key management page and functionality
  - [ ] 5.1 Create SSH key management page component
    - Create new page component at `/ssh-keys` route
    - Implement layout with key list, add form, and management actions
    - Add proper loading states and error handling
    - Display SSH keys with provider-specific status indicators
    - _Requirements: 4.1, 4.2, 5.5_

  - [ ] 5.2 Implement SSH key CRUD operations
    - Create add SSH key form with name and public key validation
    - Implement delete SSH key functionality with confirmation dialog
    - Add proper error handling for partial provider failures
    - Display success/error messages for operations
    - _Requirements: 4.3, 4.5, 6.1_

  - [ ] 5.3 Create SSH key synchronization service
    - Implement service to add SSH keys to both Linode and DigitalOcean
    - Handle partial failures gracefully with appropriate user feedback
    - Store provider-specific key IDs in database
    - Implement deletion from both providers with error handling
    - _Requirements: 5.1, 5.2, 5.4, 6.2, 6.3, 6.4, 6.5_

  - [ ] 5.4 Add SSH key management route to application
    - Add `/ssh-keys` route to App.tsx with proper authentication
    - Update navigation menu to include SSH key management link
    - Ensure proper access control for authenticated users only
    - _Requirements: 4.1_

- [ ] 6. Add comprehensive error handling and validation
  - [ ] 6.1 Implement step navigation error handling
    - Add validation for step navigation attempts
    - Implement automatic step correction for invalid navigation
    - Add fallback mechanisms for step configuration errors
    - _Requirements: 8.4_

  - [ ] 6.2 Add marketplace app validation
    - Validate marketplace app compatibility with selected region
    - Add error handling for invalid app slugs
    - Implement proper error messages for app-related failures
    - _Requirements: 2.1, 2.4_

  - [ ] 6.3 Implement SSH key operation error handling
    - Add comprehensive error handling for provider API failures
    - Implement retry mechanisms for transient failures
    - Display appropriate error messages for different failure types
    - Handle partial success scenarios with clear user feedback
    - _Requirements: 5.4, 6.4, 6.5_

- [ ]* 7. Add unit tests for step configuration logic
  - Write unit tests for `getActiveSteps` function with various scenarios
  - Test step navigation logic with different provider and app combinations
  - Add tests for edge cases like provider switching mid-flow
  - _Requirements: 8.5_

- [ ]* 8. Add integration tests for SSH key management
  - Create integration tests for user-filtered SSH key endpoints
  - Test cross-provider synchronization operations
  - Add tests for error scenarios and recovery mechanisms
  - _Requirements: 3.4, 5.1, 5.2, 6.2, 6.3_