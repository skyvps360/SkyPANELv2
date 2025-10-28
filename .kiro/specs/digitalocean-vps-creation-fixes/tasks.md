# Implementation Plan

## Overview
This implementation plan addresses critical issues in the DigitalOcean VPS creation workflow, implements per-user SSH key filtering, and creates a dedicated SSH key management interface. Tasks are organized to build incrementally, starting with database schema, then backend services, and finally frontend components.

---

## Database & Schema

- [ ] 1. Create SSH keys database table and migration
  - Create migration file `migrations/018_ssh_keys_table.sql`
  - Define `ssh_keys` table with columns: id (UUID), user_id (FK to users), label, public_key, fingerprint, linode_id, digitalocean_id, created_at, updated_at
  - Add indexes on user_id, linode_id, and digitalocean_id for query performance
  - Add unique constraint on (user_id, label) to prevent duplicate key names per user
  - Include trigger for automatic updated_at timestamp management
  - _Requirements: 3.1, 3.2, 4.1, 5.1, 5.2, 6.1, 6.2_

---

## Backend Services & API

- [ ] 2. Create SSH key service for cross-provider management
  - Create `api/services/sshKeyService.ts` with SSHKeyService class
  - Implement `getUserSSHKeys(userId)` method to fetch user-scoped SSH keys from database
  - Implement `addSSHKey(userId, label, publicKey)` method that adds key to both Linode and DigitalOcean APIs, stores in database with provider IDs, and handles partial failures gracefully
  - Implement `deleteSSHKey(userId, keyId)` method that removes key from both provider APIs, deletes from database, and handles partial failures
  - Add SSH key format validation using standard SSH public key regex patterns
  - Add fingerprint calculation for SSH keys using crypto library
  - _Requirements: 3.1, 3.2, 4.2, 5.1, 5.2, 5.3, 5.4, 6.2, 6.3, 6.4_

- [ ] 3. Create SSH key API routes
  - Create `api/routes/sshKeys.ts` with Express router
  - Implement GET `/api/ssh-keys` endpoint that returns only authenticated user's SSH keys
  - Implement POST `/api/ssh-keys` endpoint that validates input, calls sshKeyService.addSSHKey(), returns 201 on success or 207 with warnings on partial failure
  - Implement DELETE `/api/ssh-keys/:id` endpoint that validates ownership, calls sshKeyService.deleteSSHKey(), returns success or warnings
  - Add authentication middleware to all routes using authenticateToken
  - Add authorization check to ensure users can only access their own SSH keys (403 Forbidden for unauthorized access)
  - Register SSH key routes in `api/app.ts` under `/api/ssh-keys` path
  - _Requirements: 3.3, 3.4, 4.2, 5.1, 5.2, 6.2, 6.3_

- [ ] 4. Update VPS creation route to support marketplace apps and filter SSH keys
  - Modify POST `/api/vps` route in `api/routes/vps.ts` to accept appSlug and appData fields for DigitalOcean marketplace apps
  - Add conditional logic: if appSlug is provided, use it as the image parameter for DigitalOcean Droplet creation instead of separate OS image
  - Update SSH key handling to filter by user_id using sshKeyService.getUserSSHKeys() before attaching to VPS
  - Map user's SSH key IDs to provider-specific key IDs (linode_id or digitalocean_id) based on provider type
  - Validate that only user's own SSH keys can be attached to VPS instances
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3_

---

## Frontend Components - SSH Key Management

- [ ] 5. Create SSH Keys management page
  - Create `src/pages/SSHKeys.tsx` page component
  - Implement state management for SSH keys list, loading states, and modals
  - Create fetchKeys() function that calls GET `/api/ssh-keys` endpoint
  - Display SSH keys in card layout showing label, fingerprint, provider IDs, and created date
  - Add "Add SSH Key" button that opens modal for new key creation
  - Add delete button for each key with confirmation dialog
  - Show provider-specific status indicators (Linode ID, DigitalOcean ID) for each key
  - Display warning messages for partial failures (key added to one provider but not the other)
  - _Requirements: 4.1, 4.2, 4.3, 5.5_

- [ ] 6. Create SSH key add/delete modals
  - Create AddSSHKeyModal component with form fields for label and public key
  - Add client-side validation for SSH key format (check for valid SSH public key structure)
  - Implement handleAddKey() function that calls POST `/api/ssh-keys` endpoint
  - Handle 201 success response and 207 partial success response with appropriate toast messages
  - Create DeleteSSHKeyModal component with confirmation checkbox and password verification
  - Implement handleDeleteKey() function that calls DELETE `/api/ssh-keys/:id` endpoint
  - Show detailed error messages for provider-specific failures
  - Refresh SSH keys list after successful add/delete operations
  - _Requirements: 4.3, 4.5, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 7. Add SSH Keys route to application
  - Add route for `/ssh-keys` in `src/App.tsx` using ProtectedRoute wrapper
  - Import SSHKeys page component
  - Add navigation link to SSH Keys page in AppLayout sidebar/navigation menu
  - Ensure route is accessible to all authenticated users (not admin-only)
  - _Requirements: 4.1_

---

## Frontend Components - VPS Creation Flow

- [ ] 8. Implement dynamic step configuration for VPS creation modal
  - Create `getActiveSteps()` function in `src/pages/VPS.tsx` that returns filtered step array based on provider type and marketplace app selection
  - Add skip property to step configuration objects
  - Implement logic: if provider is DigitalOcean AND marketplace app is selected (appSlug exists), mark OS selection step (step 3) as skip: true
  - Update totalSteps to be computed from activeSteps.length instead of hardcoded value
  - Update step navigation (handleNext, handleBack) to use activeSteps array instead of fixed step numbers
  - Update step indicators to show correct "Step X of Y" based on active steps count
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 7.1, 7.2, 7.3, 8.1, 8.2, 8.3_

- [ ] 9. Update DigitalOceanMarketplace component to pass full app data
  - Modify `src/components/VPS/DigitalOceanMarketplace.tsx` onSelect handler signature to accept (appSlug: string | null, appData: MarketplaceApp | null)
  - Update handleAppSelect() to pass both app.slug and full app object to parent
  - Update handleNoneSelect() to pass null for both appSlug and appData
  - Ensure component properly clears marketplace selection when "None" is selected
  - _Requirements: 1.1, 1.2, 2.1, 2.5_

- [ ] 10. Update CreateVPSSteps to handle marketplace app selection
  - Modify `src/components/VPS/CreateVPSSteps.tsx` step 2 DigitalOcean branch to accept appSlug and appData from formData
  - Update DigitalOceanMarketplace onSelect callback to update both formData.appSlug and formData.appData
  - Ensure marketplace app data is properly stored in form state for submission
  - _Requirements: 1.1, 2.1, 2.2_

- [ ] 11. Update VPS creation form submission to include marketplace app data
  - Modify handleCreateInstance() in `src/pages/VPS.tsx` to include appSlug and appData in request body when creating DigitalOcean VPS
  - Add conditional logic: if appSlug exists, send it in the request; otherwise send image field
  - Ensure marketplace app selection is cleared when provider is changed from DigitalOcean to another provider
  - Clear appSlug and appData when user selects "None" in marketplace apps step
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 12. Update VPS creation to use filtered SSH keys
  - Modify SSH key fetching in VPS creation modal to call GET `/api/ssh-keys` endpoint
  - Update SSH key selection UI to display only user's own SSH keys (no global keys)
  - Remove any existing logic that fetches SSH keys globally from provider APIs
  - Update SSH key display to show which providers each key is available on (Linode, DigitalOcean, or both)
  - Filter available SSH keys based on selected provider (only show keys with corresponding provider ID)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

---

## Visual Feedback & Navigation

- [ ] 13. Implement step navigation visual feedback
  - Update step indicator component to visually distinguish skipped steps (grayed out or hidden)
  - Ensure "Back" button from finalization step navigates to correct previous active step (step 2 when step 3 is skipped)
  - Update step description text to reflect conditional workflow (e.g., "Step 3 of 3" instead of "Step 4 of 4" when OS step is skipped)
  - Add visual indicator or tooltip explaining why OS selection is skipped when marketplace app is selected
  - _Requirements: 1.3, 1.4, 7.1, 7.2, 7.3, 7.4, 7.5_

---

## Testing & Validation

- [ ]* 14. Write unit tests for step configuration logic
  - Test getActiveSteps() returns 3 steps for DigitalOcean with marketplace app
  - Test getActiveSteps() returns 4 steps for DigitalOcean without marketplace app
  - Test getActiveSteps() returns 4 steps for Linode (always shows all steps)
  - Test step navigation correctly skips over disabled steps
  - Test step numbering updates correctly when steps are skipped
  - _Requirements: 8.5_

- [ ]* 15. Write integration tests for SSH key management
  - Test GET `/api/ssh-keys` returns only authenticated user's keys
  - Test POST `/api/ssh-keys` creates key in both providers and database
  - Test DELETE `/api/ssh-keys/:id` removes key from both providers and database
  - Test unauthorized access to another user's SSH keys returns 403
  - Test partial failure scenarios (one provider succeeds, other fails)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 6.2, 6.3_

- [ ]* 16. Write integration tests for VPS creation with marketplace apps
  - Test VPS creation with DigitalOcean marketplace app uses app slug as image
  - Test VPS creation without marketplace app uses selected OS image
  - Test marketplace app selection properly skips OS selection step
  - Test SSH keys are filtered by user and provider
  - Test provider switching clears marketplace app selection
  - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2_

---

## Notes

- Tasks marked with `*` are optional testing tasks that can be skipped for faster MVP delivery
- All core implementation tasks must be completed in order
- Each task builds on previous tasks, so sequential execution is recommended
- SSH key management functionality is independent and can be developed in parallel with VPS creation fixes
- Ensure proper error handling and user feedback for all API operations
- Test with both Linode and DigitalOcean providers to ensure cross-provider compatibility
