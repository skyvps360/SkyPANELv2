# Requirements Document

## Introduction

This feature extends the VPS management system to support multiple cloud providers (Linode and DigitalOcean) within a unified interface. Users will be able to select their preferred provider during VPS creation, with the system dynamically adapting the creation workflow to match provider-specific requirements. The feature leverages the existing admin provider configuration system and integrates with the DigitalOcean API alongside the current Linode implementation.

## Glossary

- **VPS System**: The virtual private server management interface accessible at `/vps`
- **Provider Selector**: A dropdown component that allows users to choose between configured cloud providers
- **Admin Provider Configuration**: The administrative interface at `/admin#providers` where providers are enabled and configured
- **Creation Modal**: The multi-step dialog for provisioning new VPS instances
- **Linode Provider**: The existing cloud infrastructure provider (Akamai/Linode)
- **DigitalOcean Provider**: The new cloud infrastructure provider being integrated
- **Marketplace Scripts**: DigitalOcean's equivalent to Linode StackScripts for one-click application deployment
- **StackScripts**: Linode's automation scripts for server configuration
- **VPS Detail Page**: The instance-specific page at `/vps/:id` showing VPS information and controls
- **Provider-Specific Workflow**: The conditional rendering of creation steps based on selected provider

## Requirements

### Requirement 1

**User Story:** As a platform user, I want to select between available cloud providers when creating a VPS, so that I can choose the infrastructure that best meets my needs.

#### Acceptance Criteria

1. WHEN THE VPS System displays the Creation Modal, THE VPS System SHALL render the Provider Selector as the first input field before the LABEL field
2. THE Provider Selector SHALL display only providers that are marked as active in the Admin Provider Configuration
3. WHEN a user selects a provider from the Provider Selector, THE VPS System SHALL filter available plans to show only plans associated with the selected provider
4. THE Provider Selector SHALL default to Linode Provider if no provider is pre-selected
5. WHEN no active providers exist in the Admin Provider Configuration, THE VPS System SHALL display an error message indicating that VPS creation is unavailable

### Requirement 2

**User Story:** As a platform user creating a VPS with DigitalOcean Provider, I want to see DigitalOcean-specific deployment options in step 2, so that I can deploy applications using DigitalOcean Marketplace Scripts.

#### Acceptance Criteria

1. WHEN the user selects DigitalOcean Provider AND proceeds to step 2 of the Creation Modal, THE VPS System SHALL display Marketplace Scripts instead of StackScripts
2. THE VPS System SHALL fetch available Marketplace Scripts from the DigitalOcean API through the backend
3. WHEN the user selects Linode Provider AND proceeds to step 2, THE VPS System SHALL display StackScripts as currently implemented
4. THE VPS System SHALL render deployment options with provider-appropriate labels and descriptions
5. WHEN Marketplace Scripts fail to load, THE VPS System SHALL display an error message and allow the user to retry or skip the deployment selection

### Requirement 3

**User Story:** As a platform user creating a VPS with DigitalOcean Provider, I want to select from DigitalOcean operating systems in step 3, so that I can choose the appropriate OS for my server.

#### Acceptance Criteria

1. WHEN the user selects DigitalOcean Provider AND proceeds to step 3 of the Creation Modal, THE VPS System SHALL display operating systems available from the DigitalOcean API
2. THE VPS System SHALL fetch DigitalOcean OS images through the backend API endpoint
3. WHEN the user selects Linode Provider AND proceeds to step 3, THE VPS System SHALL display Linode images as currently implemented
4. THE VPS System SHALL group operating systems by distribution family for improved usability
5. WHEN OS images fail to load, THE VPS System SHALL display an error message and provide a retry option

### Requirement 4

**User Story:** As a platform user creating a VPS with DigitalOcean Provider, I want to configure DigitalOcean-specific options in step 4, so that my server is provisioned with the correct settings.

#### Acceptance Criteria

1. WHEN the user selects DigitalOcean Provider AND proceeds to step 4 of the Creation Modal, THE VPS System SHALL display configuration options that match DigitalOcean API requirements
2. THE VPS System SHALL replace the backup toggle with DigitalOcean-specific backup options if different from Linode
3. THE VPS System SHALL replace the private IP toggle with DigitalOcean-specific networking options if different from Linode
4. THE VPS System SHALL maintain the root password field for both providers
5. WHEN the user selects Linode Provider AND proceeds to step 4, THE VPS System SHALL display Linode-specific options as currently implemented

### Requirement 5

**User Story:** As a platform user, I want the VPS creation process to communicate with the correct provider API, so that my VPS is provisioned on the infrastructure I selected.

#### Acceptance Criteria

1. WHEN the user submits the Creation Modal with DigitalOcean Provider selected, THE VPS System SHALL send the creation request to the DigitalOcean API integration endpoint
2. THE VPS System SHALL include the selected provider identifier in the creation request payload
3. WHEN the backend receives a creation request, THE VPS System SHALL route the request to the appropriate provider API based on the provider identifier
4. THE VPS System SHALL store the provider type in the vps_instances table for future reference
5. WHEN VPS creation fails, THE VPS System SHALL display provider-specific error messages to the user

### Requirement 6

**User Story:** As a platform user viewing a VPS instance, I want to see provider-specific information and controls on the VPS Detail Page, so that I can manage my server appropriately.

#### Acceptance Criteria

1. WHEN THE VPS Detail Page loads for a DigitalOcean instance, THE VPS System SHALL display DigitalOcean-specific metrics and information
2. THE VPS Detail Page SHALL fetch instance details from the appropriate provider API based on the stored provider type
3. WHEN THE VPS Detail Page loads for a Linode instance, THE VPS System SHALL display Linode-specific information as currently implemented
4. THE VPS Detail Page SHALL display the provider name or logo to clearly indicate which infrastructure hosts the instance
5. WHEN provider-specific actions are available, THE VPS Detail Page SHALL render controls appropriate to the provider

### Requirement 7

**User Story:** As a platform administrator, I want to configure which providers are available for VPS creation, so that I can control which infrastructure options are offered to users.

#### Acceptance Criteria

1. THE Admin Provider Configuration SHALL allow administrators to enable or disable the DigitalOcean Provider
2. WHEN an administrator disables a provider, THE VPS System SHALL immediately remove that provider from the Provider Selector
3. THE Admin Provider Configuration SHALL require API credentials for DigitalOcean Provider before it can be activated
4. WHEN an administrator saves provider configuration, THE VPS System SHALL validate the API credentials before marking the provider as active
5. THE Admin Provider Configuration SHALL display the current status of each configured provider

### Requirement 8

**User Story:** As a platform administrator, I want DigitalOcean VPS plans to be managed through the same admin interface as Linode plans, so that I have a unified plan management experience.

#### Acceptance Criteria

1. THE Admin Provider Configuration SHALL allow administrators to create VPS plans associated with DigitalOcean Provider
2. WHEN creating a VPS plan, THE Admin Provider Configuration SHALL require the administrator to specify the associated provider
3. THE VPS System SHALL store the provider association in the vps_plans table using the provider_id foreign key
4. THE Admin Provider Configuration SHALL display plans grouped by provider for clarity
5. WHEN a provider is disabled, THE VPS System SHALL hide associated plans from the user-facing Provider Selector but retain them in the database

### Requirement 9

**User Story:** As a platform user, I want the VPS table to display provider information for each instance, so that I can quickly identify which infrastructure hosts my servers.

#### Acceptance Criteria

1. THE VPS System SHALL display a provider indicator column in the VPS instances table
2. WHEN rendering the VPS table, THE VPS System SHALL show the provider name or icon for each instance
3. THE VPS System SHALL allow users to filter instances by provider
4. WHEN a user applies a provider filter, THE VPS System SHALL display only instances from the selected provider
5. THE VPS System SHALL persist the provider filter selection in the user's session

### Requirement 10

**User Story:** As a developer, I want the backend to abstract provider-specific API calls, so that adding additional providers in the future is straightforward.

#### Acceptance Criteria

1. THE VPS System SHALL implement a provider service layer that abstracts API interactions
2. WHEN the backend needs to perform a provider operation, THE VPS System SHALL route the request through the provider service layer
3. THE provider service layer SHALL determine the appropriate API client based on the provider type
4. THE VPS System SHALL handle provider-specific response formats and normalize them to a common internal format
5. WHEN a provider API call fails, THE provider service layer SHALL return standardized error responses
