# Implementation Plan

- [x] 1. Create white-label messaging utility module


  - Create `api/lib/whiteLabel.ts` with message generation functions
  - Implement `getSSHKeySuccessMessage()` function that returns generic success messages
  - Implement `getSSHKeyDeleteMessage()` function that returns generic delete messages
  - Implement `getActivityLogMessage()` function for activity log entries
  - Export TypeScript interfaces for provider results
  - _Requirements: 2.1, 2.4_

- [x] 2. Enhance SSH key route with improved logging and white-label messages


  - [x] 2.1 Add detailed logging to `getProviderTokens()` function


    - Log database query execution and row count
    - Log each provider type found and token presence (masked)
    - Log decryption attempts and failures with specific error details
    - Validate that decrypted tokens are non-empty strings
    - _Requirements: 1.3, 4.1, 4.2, 4.4_
  
  - [x] 2.2 Enhance POST endpoint logging for SSH key creation


    - Add pre-API-call logging with token preview (first 4 + last 4 chars)
    - Add success logging with provider-specific IDs
    - Add failure logging with complete error details (status, message, response data)
    - Log the final synchronization state (which providers succeeded/failed)
    - _Requirements: 1.1, 1.3, 3.1, 3.2, 3.3_
  
  - [x] 2.3 Update POST endpoint to use white-label messages


    - Import white-label utility functions
    - Build provider results array from API call outcomes
    - Use `getSSHKeySuccessMessage()` to generate response message
    - Update activity log to use `getActivityLogMessage()`
    - Update activity log metadata to use white-label structure
    - _Requirements: 2.1, 2.4_
  
  - [x] 2.4 Enhance DELETE endpoint logging for SSH key deletion


    - Add pre-API-call logging for each provider
    - Add success/failure logging with error details
    - Log the final deletion state
    - _Requirements: 1.4, 3.1, 3.2, 3.3_
  
  - [x] 2.5 Update DELETE endpoint to use white-label messages


    - Build provider results array from deletion outcomes
    - Use `getSSHKeyDeleteMessage()` to generate response message
    - Update activity log to use `getActivityLogMessage()`
    - Update activity log metadata to use white-label structure
    - _Requirements: 2.2, 2.4_
  
  - _Requirements: 1.1, 1.3, 1.4, 2.1, 2.2, 2.4, 3.1, 3.2, 3.3, 4.1, 4.2, 4.4_

- [x] 3. Update frontend SSH keys page for white-label compliance


  - [x] 3.1 Update page header and descriptions


    - Change page description from "Manage your SSH keys across Linode and DigitalOcean providers" to "Manage your SSH keys across all cloud providers"
    - Update card description to remove specific provider names
    - Update dialog description to use generic "cloud providers" terminology
    - _Requirements: 2.5_
  
  - [x] 3.2 Update toast notification messages


    - Change success toast from "synchronized to both Linode and DigitalOcean" to "synchronized to all cloud providers"
    - Change delete toast to use generic provider terminology
    - Update partial success messages to avoid provider names
    - _Requirements: 2.1, 2.2, 2.5_
  
  - [x] 3.3 Update provider status display


    - Replace provider name badges ("Linode", "DigitalOcean") with generic "Provider 1", "Provider 2" or sync status
    - Update provider status section to show count instead of names
    - Remove provider-specific ID display from user view (keep in DOM for debugging)
    - _Requirements: 2.5_
  
  - _Requirements: 2.1, 2.2, 2.5_

- [x] 4. Update SSH key delete dialog component


  - Modify `src/components/SSHKeys/DeleteSSHKeyDialog.tsx` to remove provider name references
  - Update confirmation message to use generic "cloud providers" terminology
  - Remove provider-specific details from warning messages
  - _Requirements: 2.2, 2.5_

- [x] 5. Add diagnostic logging utility for debugging


  - Create helper function to log provider token status on server startup
  - Add endpoint or admin tool to test provider API connectivity
  - Implement token masking utility for safe logging (show first 4 + last 4 chars)
  - _Requirements: 3.1, 3.4, 4.3_

- [x] 6. Verify and test SSH key synchronization


  - [x] 6.1 Test SSH key creation with both providers configured

    - Verify key is created in database with correct provider IDs
    - Verify key appears in Linode account via API
    - Verify key appears in DigitalOcean account via API
    - Verify activity log contains white-label message
    - Verify frontend shows generic success message
    - _Requirements: 1.1, 1.2, 2.1, 2.4_
  
  - [x] 6.2 Test SSH key deletion with both providers configured

    - Verify key is removed from database
    - Verify key is removed from Linode account via API
    - Verify key is removed from DigitalOcean account via API
    - Verify activity log contains white-label message
    - Verify frontend shows generic success message
    - _Requirements: 1.4, 2.2, 2.4_
  
  - [x] 6.3 Test partial failure scenarios

    - Test with one provider API unavailable
    - Verify partial success message is shown
    - Verify key is still saved in database
    - Verify activity log reflects partial success
    - _Requirements: 1.5, 2.3_
  
  - [x] 6.4 Test error scenarios

    - Test with no providers configured
    - Test with invalid API tokens
    - Test with invalid SSH key format
    - Verify appropriate error messages are shown
    - Verify errors are logged with sufficient detail
    - _Requirements: 1.3, 3.2, 4.3, 4.4_
  
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 3.2, 4.3, 4.4_

- [x] 7. Update documentation and admin guidance



  - Document the white-label messaging approach for future developers
  - Add troubleshooting guide for SSH key synchronization issues
  - Document how to verify provider API connectivity
  - Add notes about token encryption and retrieval process
  - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2_
