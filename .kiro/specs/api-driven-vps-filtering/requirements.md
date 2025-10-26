# Requirements Document

## Introduction

The VPS plan management system currently uses hardcoded slug prefix matching to categorize DigitalOcean droplet sizes (e.g., `s-` for standard, `c-` for CPU-optimized). This approach is fragile and doesn't respect the actual data returned by the provider APIs. This feature will refactor the filtering logic to be API-driven, using the actual classification fields provided by each provider's API.

## Glossary

- **VPS Plan**: A virtual private server configuration that defines compute resources (CPU, RAM, disk, etc.) and pricing
- **Provider**: A cloud infrastructure service (Linode or DigitalOcean) that offers VPS instances
- **Type Class**: A category that groups VPS plans by their intended use case (e.g., standard, CPU-optimized, memory-optimized)
- **Admin Interface**: The administrative dashboard where VPS plans are created and managed
- **Linode Type**: A Linode-specific VPS plan configuration returned by the Linode API
- **DigitalOcean Size**: A DigitalOcean-specific droplet configuration returned by the DigitalOcean API
- **Slug**: A unique identifier string for a VPS plan (e.g., `s-1vcpu-1gb`, `g6-standard-2`)
- **Mapping Function**: Code that transforms provider-specific API responses into a common format

## Requirements

### Requirement 1: API-Driven Classification

**User Story:** As a platform administrator, I want VPS plan filtering to use the classification data provided by each provider's API, so that the system remains accurate as providers update their offerings.

#### Acceptance Criteria

1. WHEN the System fetches DigitalOcean droplet sizes, THE System SHALL use the `description` field from the DigitalOcean API response to determine the type class
2. WHEN the System fetches Linode types, THE System SHALL use the `class` field from the Linode API response to determine the type class
3. WHEN the System maps provider responses to the common format, THE System SHALL preserve the original classification data without hardcoded slug prefix matching
4. WHEN a provider adds new plan types, THE System SHALL automatically support them without code changes to slug prefix logic

### Requirement 2: Consistent Type Class Mapping

**User Story:** As a platform administrator, I want consistent type class values across both providers, so that I can filter plans by category regardless of the provider.

#### Acceptance Criteria

1. WHEN the System maps DigitalOcean descriptions to type classes, THE System SHALL use a mapping table that converts provider-specific values to standardized categories
2. WHEN the System maps Linode classes to type classes, THE System SHALL use a mapping table that converts provider-specific values to standardized categories
3. THE System SHALL support the following standardized type classes: `standard`, `cpu`, `memory`, `storage`, `premium`, `gpu`, `accelerated`
4. WHEN a provider uses a classification that does not map to a standard category, THE System SHALL assign a default type class of `standard`

### Requirement 3: Filter Plans by Type Class

**User Story:** As a platform administrator, I want to filter available VPS plans by type class when creating new plans, so that I can quickly find the appropriate plan for my needs.

#### Acceptance Criteria

1. WHEN the Admin Interface displays the plan type filter dropdown, THE Admin Interface SHALL show options for all supported type classes
2. WHEN the Administrator selects a type class filter, THE Admin Interface SHALL display only plans matching that type class
3. WHEN the Administrator selects "all" in the type class filter, THE Admin Interface SHALL display all available plans
4. THE Admin Interface SHALL apply the type class filter to the `type_class` field in the mapped plan data

### Requirement 4: Preserve Backward Compatibility

**User Story:** As a platform administrator, I want existing VPS plans to continue working after the refactor, so that there is no disruption to current services.

#### Acceptance Criteria

1. WHEN the System loads existing VPS plans from the database, THE System SHALL continue to display them correctly
2. WHEN the System applies the new mapping logic, THE System SHALL not modify existing plan records in the database
3. THE System SHALL maintain the existing `LinodeType` interface structure for UI compatibility
4. WHEN the System encounters plans created before the refactor, THE System SHALL handle them without errors

### Requirement 5: Provider-Specific Mapping Configuration

**User Story:** As a platform administrator, I want the mapping logic to be configurable per provider, so that I can adjust classifications if providers change their API responses.

#### Acceptance Criteria

1. THE System SHALL define separate mapping functions for DigitalOcean and Linode
2. WHEN DigitalOcean returns a `description` field value, THE System SHALL map it to a type class using the DigitalOcean mapping configuration
3. WHEN Linode returns a `class` field value, THE System SHALL map it to a type class using the Linode mapping configuration
4. THE System SHALL log a warning when an unmapped classification value is encountered
5. THE System SHALL allow administrators to view the current mapping configuration through code inspection
