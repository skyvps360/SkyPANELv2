# Implementation Plan

## Overview
This implementation plan addresses three critical enhancements to the DigitalOcean VPS creation workflow:
1. Conditional step logic to skip OS selection when a marketplace app is selected
2. Per-user SSH key filtering for security and usability
3. Dedicated SSH key management page with cross-provider synchronization

## Tasks

- [x] 1. Implement step configuration system for conditional workflow





  - Create `src/lib/vpsStepConfiguration.ts` with step configuration logic
  - Implement `getActiveSteps()` function that determines which steps to display based on provider type and marketplace app selection
  - Implement step renumbering logic to maintain sequential display numbers
  - Add TypeScript interfaces for `StepConfiguration` and `StepConfigurationOptions`
  - _Requirements: 1.1, 1.3, 1.4, 7.1, 7.2, 8.1, 8.2_

- [x] 2. Update VPS creation modal to use conditional step logic




  - [x] 2.1 Integrate step configuration system into VPS.tsx


    - Import and use `getActiveSteps()` function in VPS page component
    - Add state management for active steps based on provider and marketplace selection
    - Update step navigation handlers (`handleNext`, `handleBack`) to respect active steps only
    - Implement logic to recalculate active steps when provider or marketplace app changes
    - _Requirements: 1.1, 1.2, 1.5, 7.4, 8.3_

  - [x] 2.2 Enhance step indicator and navigation UI


    - Update step indicator component to show correct step numbers (e.g., "Step 3 of 3" instead of "Step 4 of 4")
    - Add visual indicators for skipped steps in navigation sidebar
    - Implement dynamic step descriptions based on marketplace app selection
    - Add "Skipped" badge for inactive steps in step navigation
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

  - [x] 2.3 Update marketplace app selection handler


    - Modify `onFormChange` handler to automatically set image field when marketplace app is selected
    - Clear marketplace app selection when provider changes from DigitalOcean to another provider
    - Trigger step recalculation when marketplace app selection changes
    - _Requirements: 1.1, 1.2, 2.1, 2.5_

- [x] 3. Update VPS creation API payload handling





  - [x] 3.1 Modify frontend VPS creation request


    - Update `handleCreateInstance` in VPS.tsx to correctly set image field for marketplace apps
    - Ensure marketplace app slug is used as the image parameter when app is selected
    - Remove redundant `appSlug` field in favor of using `image` field directly
    - _Requirements: 2.1, 2.2_

  - [x] 3.2 Update backend VPS creation endpoint


    - Modify `api/routes/vps.ts` POST `/api/vps` endpoint to handle marketplace app image parameter
    - Update DigitalOcean payload construction to use image field for both OS and marketplace apps
    - Ensure no separate OS image parameter is included when marketplace app is provided
    - Add validation to prevent conflicting image and marketplace app parameters
    - _Requirements: 2.2, 2.3, 2.4_

- [x] 4. Implement database schema for user SSH keys

  - Create migration file `migrations/018_user_ssh_keys.sql`
  - Define `user_ssh_keys` table with columns: id, user_id, name, public_key, fingerprint, linode_key_id, digitalocean_key_id, created_at, updated_at
  - Add foreign key constraint to users table with CASCADE delete
  - Create indexes on user_id and fingerprint columns for efficient queries
  - Add unique constraint on (user_id, fingerprint) to prevent duplicate keys
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5. Implement backend SSH key management API





  - [x] 5.1 Create SSH key routes file


    - Create `api/routes/sshKeys.ts` with route definitions
    - Add authentication middleware to all SSH key routes
    - Register SSH key routes in `api/app.ts`
    - _Requirements: 3.3, 3.4, 4.1, 4.2_

  - [x] 5.2 Implement GET /api/ssh-keys endpoint

    - Add user-based filtering using authenticated user ID from JWT token
    - Query `user_ssh_keys` table with user_id filter
    - Return SSH keys with provider-specific IDs and status
    - Add authorization check to prevent cross-user access (403 Forbidden)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.2_

  - [x] 5.3 Implement POST /api/ssh-keys endpoint

    - Accept name and public_key in request body
    - Generate SSH key fingerprint for uniqueness validation
    - Call Linode API to add SSH key and capture key ID
    - Call DigitalOcean API to add SSH key and capture key ID
    - Store SSH key in database with both provider IDs
    - Handle partial success when one provider fails
    - Return success status with provider-specific errors if any
    - _Requirements: 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 5.4 Implement DELETE /api/ssh-keys/:keyId endpoint

    - Verify SSH key belongs to authenticated user
    - Retrieve provider-specific key IDs from database
    - Call Linode API to delete SSH key using linode_key_id
    - Call DigitalOcean API to delete SSH key using digitalocean_key_id
    - Delete SSH key record from database
    - Handle partial success when one provider fails
    - Return success status with provider-specific warnings if any
    - _Requirements: 4.5, 6.2, 6.3, 6.4, 6.5_

- [x] 6. Update existing SSH key endpoints with user filtering





  - [x] 6.1 Update Linode SSH key endpoint


    - Modify GET `/api/vps/linode/ssh-keys` to accept user_id parameter
    - Add database query to filter SSH keys by user_id
    - Return only SSH keys associated with the authenticated user
    - Add authorization check to prevent unauthorized access
    - _Requirements: 3.1, 3.3, 3.4_

  - [x] 6.2 Update DigitalOcean SSH key endpoint

    - Modify GET `/api/vps/digitalocean/ssh-keys` to accept user_id parameter
    - Add database query to filter SSH keys by user_id
    - Return only SSH keys associated with the authenticated user
    - Add authorization check to prevent unauthorized access
    - _Requirements: 3.2, 3.3, 3.4_

- [x] 7. Create SSH key management page





  - [x] 7.1 Create SSH key management page component


    - Create `src/pages/SSHKeys.tsx` with page layout
    - Add route `/ssh-keys` in `src/App.tsx` with ProtectedRoute wrapper
    - Implement page header with title and description
    - Add "Add SSH Key" button to trigger creation modal
    - _Requirements: 4.1, 4.2_

  - [x] 7.2 Implement SSH key list display


    - Use TanStack Query to fetch SSH keys from GET `/api/ssh-keys`
    - Display SSH keys in a table or card layout
    - Show key name, fingerprint, creation date, and provider status
    - Display provider-specific key IDs for Linode and DigitalOcean
    - Add visual indicators for provider sync status (active/error)
    - Implement loading and error states
    - _Requirements: 4.2, 5.5_

  - [x] 7.3 Create SSH key form component


    - Create `src/components/SSHKeys/SSHKeyForm.tsx`
    - Add form fields for key name and public key content
    - Implement validation using React Hook Form and Zod
    - Validate SSH public key format
    - Add submit handler to call POST `/api/ssh-keys`
    - Display success/error messages with provider-specific details
    - Handle partial success scenarios with appropriate messaging
    - _Requirements: 4.3, 4.4, 5.4_

  - [x] 7.4 Implement SSH key deletion with confirmation


    - Create `src/components/SSHKeys/DeleteSSHKeyDialog.tsx`
    - Add delete button to each SSH key in the list
    - Show confirmation dialog with warning about cross-provider deletion
    - Display which providers the key will be removed from
    - Call DELETE `/api/ssh-keys/:keyId` on confirmation
    - Handle partial success with warning messages
    - Refresh SSH key list after successful deletion
    - _Requirements: 4.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8. Update VPS creation modal to use filtered SSH keys





  - [x] 8.1 Update Linode SSH key fetching


    - Modify SSH key fetch in VPS.tsx to pass user_id parameter
    - Update API call to use filtered endpoint
    - Ensure only user's SSH keys are displayed in VPS creation modal
    - _Requirements: 3.1, 3.3_

  - [x] 8.2 Update DigitalOcean SSH key fetching


    - Modify SSH key fetch in DigitalOceanConfiguration component to pass user_id parameter
    - Update API call to use filtered endpoint
    - Ensure only user's SSH keys are displayed in VPS creation modal
    - _Requirements: 3.2, 3.3_

- [x] 9. Add navigation menu item for SSH key management





  - Update navigation menu in `src/components/Navigation.tsx` or `src/components/AppLayout.tsx`
  - Add "SSH Keys" menu item with appropriate icon (Key icon from lucide-react)
  - Position menu item logically near VPS or Settings sections
  - Ensure menu item is visible to authenticated users
  - _Requirements: 4.1_

- [x] 10. Add comprehensive error handling and validation






  - [x] 10.1 Add frontend validation

    - Validate SSH public key format before submission
    - Add client-side validation for marketplace app and region compatibility
    - Display user-friendly error messages for validation failures
    - _Requirements: 2.1, 4.3_


  - [x] 10.2 Add backend error handling

    - Implement error handling for provider API failures
    - Add retry logic for transient API errors
    - Log errors with appropriate context for debugging
    - Return structured error responses with error codes
    - _Requirements: 5.4, 6.5_


  - [x] 10.3 Add marketplace app validation

    - Validate marketplace app availability before VPS creation
    - Check region compatibility for selected marketplace apps
    - Display clear error messages when app is not available in selected region
    - _Requirements: 2.1, 2.4_
