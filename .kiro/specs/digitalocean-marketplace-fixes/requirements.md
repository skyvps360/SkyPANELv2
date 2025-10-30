# Requirements Document

## Introduction

This feature addresses critical issues with DigitalOcean marketplace application display in the admin marketplace manager. The system currently shows incorrect categories, improper naming conventions, and includes Kubernetes 1-click apps when only Droplet 1-click apps should be displayed. This feature will ensure accurate categorization, proper display names, and correct filtering based on the DigitalOcean API specification.

## Glossary

- **Marketplace Manager**: The admin interface component that displays and manages available 1-click applications from cloud providers
- **1-Click App**: Pre-configured application images available through a cloud provider's marketplace
- **Droplet App**: 1-click applications designed for VPS instances (Droplets)
- **Kubernetes App**: 1-click applications designed for Kubernetes clusters
- **Provider Service**: The backend service class that interfaces with a cloud provider's API (e.g., DigitalOceanService, LinodeService)
- **Provider Display Name**: The custom name assigned by administrators to a provider instance via the admin providers interface
- **App Slug**: The unique identifier for a marketplace application (e.g., "sharklabs-openwebui")
- **Display Name**: The human-readable name shown to users (e.g., "OpenWebUI")
- **Category**: The classification group for marketplace applications (e.g., "Development", "Security", "Gaming")

## Requirements

### Requirement 1

**User Story:** As an administrator, I want to see only Droplet 1-click applications in the marketplace manager, so that I don't accidentally enable Kubernetes apps for VPS provisioning.

#### Acceptance Criteria

1. WHEN the Provider Service fetches marketplace applications, THE Provider Service SHALL filter results to include only applications where the type field equals "droplet"
2. WHEN the Provider Service receives applications with type "kubernetes", THE Provider Service SHALL exclude those applications from the returned results
3. WHEN the Marketplace Manager displays the application list, THE Marketplace Manager SHALL show only Droplet-compatible applications
4. WHEN an application has both droplet and kubernetes variants, THE Provider Service SHALL include only the droplet variant

### Requirement 2

**User Story:** As an administrator, I want marketplace applications to display with proper, human-readable names, so that I can easily identify applications without technical prefixes or slugs.

#### Acceptance Criteria

1. WHEN the Provider Service processes an application with slug "sharklabs-openwebui", THE Provider Service SHALL set the display name to "OpenWebUI"
2. WHEN the Provider Service processes an application with slug "sharklabs-piholevpn", THE Provider Service SHALL set the display name to "Pi-hole + VPN"
3. WHEN the Provider Service processes an application with a vendor prefix (e.g., "sharklabs-"), THE Provider Service SHALL remove the vendor prefix from the display name
4. WHEN the Provider Service processes a known application slug, THE Provider Service SHALL use the predefined proper name from the name mapping table
5. WHEN the Provider Service processes an unknown application slug, THE Provider Service SHALL generate a display name by capitalizing words and removing hyphens

### Requirement 3

**User Story:** As an administrator, I want marketplace applications categorized accurately based on their actual purpose, so that I can quickly find applications by their functional category.

#### Acceptance Criteria

1. WHEN the Provider Service categorizes "openwebui" or "sharklabs-openwebui", THE Provider Service SHALL assign the category "Development"
2. WHEN the Provider Service categorizes "pihole" or "sharklabs-piholevpn", THE Provider Service SHALL assign the category "Security"
3. WHEN the Provider Service categorizes "sharklabs-counterstrike2", THE Provider Service SHALL assign the category "Gaming"
4. WHEN the Provider Service categorizes an application, THE Provider Service SHALL first check the specific app mapping table before applying pattern-based categorization
5. WHEN the Provider Service cannot determine a category from mappings or patterns, THE Provider Service SHALL assign the category "Other"
6. WHEN the provider API provides a category field, THE Provider Service SHALL validate it against known categories before using it
7. WHEN an application matches multiple category patterns, THE Provider Service SHALL use the most specific category match

### Requirement 4

**User Story:** As an administrator, I want the marketplace manager to display accurate descriptions for each application, so that I understand what each application does before enabling it.

#### Acceptance Criteria

1. WHEN the Provider Service processes an application with a description from the API, THE Provider Service SHALL use the API-provided description
2. WHEN the Provider Service processes a known application without an API description, THE Provider Service SHALL use the predefined description from the description mapping table
3. WHEN the Provider Service processes an unknown application without an API description, THE Provider Service SHALL use the default description "Pre-configured marketplace application ready for deployment"
4. WHEN the provider API provides multiple description fields, THE Provider Service SHALL prioritize in order: group_description, short_description, summary, description

### Requirement 5

**User Story:** As a developer, I want the marketplace app processing logic to be maintainable and testable, so that future updates to app mappings are straightforward and reliable.

#### Acceptance Criteria

1. THE Provider Service SHALL maintain app name mappings in a centralized data structure
2. THE Provider Service SHALL maintain category mappings in a centralized data structure
3. THE Provider Service SHALL maintain description mappings in a centralized data structure
4. WHEN a new application needs custom mapping, THE Provider Service SHALL allow adding the mapping without modifying core logic
5. THE Provider Service SHALL log warnings when encountering unmapped vendor-prefixed applications

### Requirement 6

**User Story:** As an administrator, I want the marketplace manager to display the provider name I configured, so that I can identify which provider's marketplace I'm managing without seeing hardcoded provider type names.

#### Acceptance Criteria

1. WHEN the Marketplace Manager displays the provider selector, THE Marketplace Manager SHALL show the Provider Display Name configured by the administrator
2. WHEN the Marketplace Manager displays error messages, THE Marketplace Manager SHALL reference the Provider Display Name instead of the provider type
3. WHEN the Marketplace Manager displays the card title, THE Marketplace Manager SHALL use generic terminology like "Marketplace Controls" instead of provider-specific names
4. WHEN the Marketplace Manager displays descriptions, THE Marketplace Manager SHALL use generic terminology like "marketplace applications" instead of provider-specific terminology
