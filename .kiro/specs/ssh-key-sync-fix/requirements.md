# Requirements Document

## Introduction

This feature addresses critical issues in the SSH key management system where keys are added to the platform database but fail to synchronize with cloud provider APIs (Linode and DigitalOcean). Additionally, notifications expose provider names which violates the white-label reseller model.

## Glossary

- **SSH Key Management System**: The platform component that manages user SSH keys and synchronizes them across cloud providers
- **Provider API**: The Linode or DigitalOcean REST API used for SSH key operations
- **White-Label**: A reseller model where the platform hides underlying provider names from end users
- **Notification System**: The real-time notification mechanism that informs users of system events
- **Activity Logger**: The system component that records user actions and system events

## Requirements

### Requirement 1: SSH Key Provider Synchronization

**User Story:** As a user, I want my SSH keys to be automatically synchronized to all configured cloud providers, so that I can use them when creating VPS instances.

#### Acceptance Criteria

1. WHEN a user adds an SSH key through the `/ssh-keys` page, THE SSH Key Management System SHALL successfully create the key in both Linode and DigitalOcean provider accounts
2. WHEN the SSH key creation succeeds on the platform database, THE SSH Key Management System SHALL verify that the provider API calls completed successfully before confirming to the user
3. IF a provider API call fails during SSH key creation, THEN THE SSH Key Management System SHALL log the specific error details including provider name, HTTP status code, and error message
4. WHEN a user deletes an SSH key, THE SSH Key Management System SHALL remove the key from both provider accounts and the platform database
5. WHERE a provider API is unavailable or returns an error, THE SSH Key Management System SHALL store the key in the database with a null provider key ID and notify the user of the partial failure

### Requirement 2: White-Label Notification Messages

**User Story:** As a platform administrator, I want all user-facing notifications to hide provider names, so that the platform maintains its white-label branding.

#### Acceptance Criteria

1. WHEN an SSH key is successfully added, THE Notification System SHALL display a message stating "SSH key '[key_name]' has been added to your account" without mentioning provider names
2. WHEN an SSH key is successfully deleted, THE Notification System SHALL display a message stating "SSH key '[key_name]' has been removed from your account" without mentioning provider names
3. IF an SSH key operation partially fails, THEN THE Notification System SHALL display "SSH key '[key_name]' was added to your account with some synchronization issues" without exposing specific provider names
4. WHEN logging activity for SSH key operations, THE Activity Logger SHALL record provider-specific details in metadata but SHALL NOT include provider names in user-visible messages
5. WHERE error messages need to be shown to users, THE Notification System SHALL use generic terms like "cloud provider" instead of "Linode" or "DigitalOcean"

### Requirement 3: SSH Key API Integration Debugging

**User Story:** As a developer, I want comprehensive logging of SSH key API calls, so that I can diagnose synchronization failures.

#### Acceptance Criteria

1. WHEN an SSH key API call is initiated, THE SSH Key Management System SHALL log the attempt with timestamp, provider type, and operation type
2. WHEN a provider API returns an error response, THE SSH Key Management System SHALL log the complete error details including status code, response body, and request parameters
3. WHEN SSH key synchronization completes, THE SSH Key Management System SHALL log the final state including which providers succeeded and which failed
4. WHERE API tokens are logged, THE SSH Key Management System SHALL mask sensitive token values showing only the first 4 and last 4 characters
5. WHILE debugging mode is enabled, THE SSH Key Management System SHALL log the complete request and response payloads for SSH key operations

### Requirement 4: Provider API Token Retrieval

**User Story:** As the system, I need to reliably retrieve provider API tokens from the database, so that SSH key operations can authenticate with provider APIs.

#### Acceptance Criteria

1. WHEN the SSH Key Management System needs to perform a provider operation, THE SSH Key Management System SHALL query the service_providers table for active provider credentials
2. WHEN provider credentials are retrieved, THE SSH Key Management System SHALL decrypt the api_key_encrypted field using the platform encryption key
3. IF no active provider credentials are found, THEN THE SSH Key Management System SHALL log a warning and skip that provider's synchronization
4. WHEN decryption of provider credentials fails, THE SSH Key Management System SHALL log the error and continue with other providers
5. WHERE multiple providers are configured, THE SSH Key Management System SHALL attempt synchronization with all active providers regardless of individual failures
