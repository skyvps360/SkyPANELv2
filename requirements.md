# Requirements Document

## Introduction

This feature addresses critical issues in the DigitalOcean VPS creation workflow that prevent users from successfully deploying VPS instances with 1-Click marketplace applications. Currently, when users select a DigitalOcean 1-Click marketplace app, the system still requires OS selection in step 3, which causes deployment failures because 1-Click apps include their own pre-configured operating system. Additionally, SSH keys are being displayed globally to all users instead of being filtered per-user, creating security and usability concerns. Finally, users lack a dedicated interface to manage their SSH keys across both Linode and DigitalOcean providers.

The enhancement will implement conditional step logic to skip OS selection when a marketplace app is selected, implement per-user SSH key filtering, and create a dedicated SSH key management page that synchronizes keys across both cloud providers.

## Glossary

- **1-Click App**: A DigitalOcean marketplace application that includes a pre-configured operating system and software stack
- **Marketplace App**: Pre-configured applications available in the DigitalOcean marketplace catalog
- **VPS Creation Modal**: The multi-step wizard interface for provisioning new VPS instances
- **Step Skipping**: Conditional logic that bypasses certain wizard steps based on user selections
- **SSH Key**: A cryptographic key pair used for secure server authentication
- **Per-User Filtering**: Displaying only resources (like SSH keys) that belong to the authenticated user
- **Provider**: Cloud infrastructure provider (Linode or DigitalOcean)
- **SSH Key Management Page**: A dedicated interface at `/ssh-keys` for managing SSH keys across providers

## Requirements

### Requirement 1

**User Story:** As a user creating a DigitalOcean VPS with a 1-Click marketplace app, I want the OS selection step to be automatically skipped, so that I can successfully deploy the VPS without encountering image validation errors.

#### Acceptance Criteria

1. WHEN a user selects a DigitalOcean 1-Click marketplace app in step 2, THE VPS Creation Modal SHALL skip step 3 (Operating System selection)
2. WHEN a user selects "None" for marketplace apps in step 2, THE VPS Creation Modal SHALL display step 3 (Operating System selection) as normal
3. WHEN step 3 is skipped due to marketplace app selection, THE VPS Creation Modal SHALL renumber subsequent steps to maintain sequential numbering
4. THE VPS Creation Modal SHALL display step 4 (Finalize & Review) as step 3 WHEN a marketplace app is selected
5. WHEN a user navigates back from step 4 to step 2 and changes their marketplace selection from an app to "None", THE VPS Creation Modal SHALL re-enable step 3 (Operating System selection)

### Requirement 2

**User Story:** As a user creating a DigitalOcean VPS with a marketplace app, I want the system to automatically use the OS included in the marketplace app, so that my VPS is provisioned correctly without manual OS configuration.

#### Acceptance Criteria

1. WHEN a user selects a DigitalOcean 1-Click marketplace app, THE system SHALL automatically set the image field to the marketplace app's image slug
2. WHEN the VPS creation request is sent to the backend, THE system SHALL include the marketplace app slug in the request payload
3. THE backend SHALL NOT include a separate OS image parameter WHEN a marketplace app slug is provided
4. WHEN the DigitalOcean API receives the VPS creation request with a marketplace app, THE API SHALL provision the Droplet with the app's pre-configured OS
5. THE system SHALL clear the marketplace app selection and restore normal OS selection WHEN the user changes provider from DigitalOcean to another provider

### Requirement 3

**User Story:** As a user viewing SSH keys during VPS creation, I want to see only my own SSH keys, so that I don't accidentally select another user's keys or see sensitive key information that doesn't belong to me.

#### Acceptance Criteria

1. WHEN the VPS creation modal displays SSH keys for Linode, THE system SHALL filter SSH keys to show only keys belonging to the authenticated user
2. WHEN the VPS creation modal displays SSH keys for DigitalOcean, THE system SHALL filter SSH keys to show only keys belonging to the authenticated user
3. THE backend API endpoint for fetching SSH keys SHALL accept a user_id parameter and filter results accordingly
4. THE backend API endpoint SHALL return a 403 Forbidden error IF a user attempts to access SSH keys belonging to another user
5. THE system SHALL NOT display SSH keys from the provider's account that are not associated with any user in the platform

### Requirement 4

**User Story:** As a user managing my infrastructure, I want a dedicated page to manage my SSH keys, so that I can add, view, and delete SSH keys that will be available when creating VPS instances on either Linode or DigitalOcean.

#### Acceptance Criteria

1. THE system SHALL provide a dedicated page at the route `/ssh-keys` for SSH key management
2. WHEN a user navigates to `/ssh-keys`, THE system SHALL display all SSH keys associated with the authenticated user across both Linode and DigitalOcean providers
3. THE SSH key management page SHALL allow users to add new SSH keys with a name and public key content
4. WHEN a user adds a new SSH key, THE system SHALL synchronize the key to both Linode and DigitalOcean provider accounts
5. THE SSH key management page SHALL allow users to delete existing SSH keys with confirmation

### Requirement 5

**User Story:** As a user adding an SSH key, I want the key to be automatically available on both Linode and DigitalOcean, so that I can use the same key when creating VPS instances on either provider without manual duplication.

#### Acceptance Criteria

1. WHEN a user adds an SSH key through the `/ssh-keys` page, THE system SHALL call the Linode API to add the key to the Linode account
2. WHEN a user adds an SSH key through the `/ssh-keys` page, THE system SHALL call the DigitalOcean API to add the key to the DigitalOcean account
3. THE system SHALL store the SSH key in the database with associations to both provider key IDs
4. IF adding the key to one provider fails, THE system SHALL still add it to the other provider and display a partial success message
5. THE system SHALL display the provider-specific key IDs for each SSH key to help with troubleshooting

### Requirement 6

**User Story:** As a user deleting an SSH key, I want the key to be removed from both Linode and DigitalOcean, so that the key is no longer available for use and my key management stays synchronized.

#### Acceptance Criteria

1. WHEN a user deletes an SSH key through the `/ssh-keys` page, THE system SHALL display a confirmation dialog before proceeding
2. WHEN the user confirms deletion, THE system SHALL call the Linode API to remove the key from the Linode account
3. WHEN the user confirms deletion, THE system SHALL call the DigitalOcean API to remove the key from the DigitalOcean account
4. THE system SHALL remove the SSH key record from the database after successful deletion from both providers
5. IF deletion from one provider fails, THE system SHALL still remove it from the other provider and the database, and display a warning message

### Requirement 7

**User Story:** As a user creating a VPS, I want to see clear visual feedback about which steps are active and which are skipped, so that I understand the workflow and can navigate confidently through the creation process.

#### Acceptance Criteria

1. THE VPS Creation Modal SHALL display step indicators showing the current step number and total steps
2. WHEN step 3 is skipped due to marketplace app selection, THE step indicators SHALL show "Step 3 of 3" instead of "Step 4 of 4" for the finalization step
3. THE VPS Creation Modal SHALL visually indicate skipped steps in the step navigation sidebar
4. WHEN a user clicks "Back" from the finalization step with a marketplace app selected, THE system SHALL navigate to step 2 (Marketplace Apps) instead of step 3 (OS Selection)
5. THE VPS Creation Modal SHALL update the step description text to reflect the conditional workflow

### Requirement 8

**User Story:** As a developer maintaining the codebase, I want the step logic to be centralized and maintainable, so that future changes to the VPS creation workflow are easy to implement and test.

#### Acceptance Criteria

1. THE system SHALL implement a step configuration function that returns the active steps based on provider type and form data
2. THE step configuration function SHALL accept parameters for provider type and marketplace app selection
3. THE VPS Creation Modal SHALL use the step configuration function to determine which steps to display
4. THE system SHALL maintain backward compatibility with Linode VPS creation workflow (all 4 steps)
5. THE step navigation logic SHALL be unit tested to verify correct step skipping behavior
