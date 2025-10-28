# Requirements Document

## Introduction

This feature enhances the DigitalOcean marketplace integration in SkyPanelV2 to provide access to the full catalog of DigitalOcean 1-Click Apps. Currently, the system only fetches "application" type images, which represents a limited subset of available marketplace offerings. DigitalOcean provides a dedicated 1-Click Apps API endpoint (`/v2/1-clicks`) that exposes hundreds of pre-configured applications across various categories including databases, development tools, CMS platforms, monitoring solutions, and more.

The enhancement will replace the current image-based marketplace fetching with proper 1-Click Apps API integration, providing users with the complete marketplace experience including detailed app metadata, version information, and proper categorization.

## Glossary

- **1-Click App**: A pre-configured application available in the DigitalOcean Marketplace that can be deployed on a Droplet with minimal setup
- **Droplet**: DigitalOcean's term for a virtual private server (VPS) instance
- **Marketplace**: DigitalOcean's catalog of pre-configured applications and development stacks
- **App Slug**: A unique identifier for a marketplace application (e.g., "wordpress", "docker", "mongodb-7-0")
- **DigitalOcean Service**: The backend service class that handles API communication with DigitalOcean
- **Marketplace Component**: The React component that displays available 1-Click Apps in the VPS creation modal
- **VPS Creation Modal**: The multi-step dialog where users configure and provision new VPS instances

## Requirements

### Requirement 1

**User Story:** As a user provisioning a DigitalOcean VPS, I want to see the complete catalog of DigitalOcean 1-Click Apps, so that I can choose from all available pre-configured applications.

#### Acceptance Criteria

1. WHEN the VPS Creation Modal displays the Marketplace Apps step for DigitalOcean provider, THE Marketplace Component SHALL fetch 1-Click Apps from the `/v2/1-clicks?type=droplet` API endpoint
2. THE DigitalOcean Service SHALL return a list containing all available 1-Click Apps with their metadata including slug, name, and type
3. THE Marketplace Component SHALL display at minimum 50 distinct 1-Click Apps when the DigitalOcean marketplace catalog is available
4. WHEN the API request to `/v2/1-clicks` succeeds, THE DigitalOcean Service SHALL transform the response into the MarketplaceApp interface format
5. IF the `/v2/1-clicks` API endpoint returns an error, THEN THE DigitalOcean Service SHALL throw an error with the HTTP status code and error message

### Requirement 2

**User Story:** As a user browsing marketplace apps, I want to see detailed information about each 1-Click App including its category and description, so that I can make informed decisions about which application to deploy.

#### Acceptance Criteria

1. THE DigitalOcean Service SHALL extract and return the category field from each 1-Click App response
2. THE Marketplace Component SHALL group 1-Click Apps by their category field for organized display
3. WHEN a 1-Click App includes a description field, THE Marketplace Component SHALL display the description text below the app name
4. THE Marketplace Component SHALL display a default description "Marketplace application" WHEN the 1-Click App response does not include a description field
5. THE DigitalOcean Service SHALL preserve all metadata fields from the 1-Click Apps API response including slug, name, type, and category

### Requirement 3

**User Story:** As a user searching for specific marketplace apps, I want the search functionality to work across the expanded catalog, so that I can quickly find applications by name, description, or category.

#### Acceptance Criteria

1. WHEN a user enters text in the marketplace search input, THE Marketplace Component SHALL filter 1-Click Apps by matching the search term against app name
2. WHEN a user enters text in the marketplace search input, THE Marketplace Component SHALL filter 1-Click Apps by matching the search term against app description
3. WHEN a user enters text in the marketplace search input, THE Marketplace Component SHALL filter 1-Click Apps by matching the search term against app category
4. THE Marketplace Component SHALL perform case-insensitive matching for all search operations
5. WHEN the search term matches zero 1-Click Apps, THE Marketplace Component SHALL display a "No marketplace apps found" message with an option to clear the search

### Requirement 4

**User Story:** As a developer maintaining the codebase, I want the marketplace integration to use proper API endpoints and remove deprecated workarounds, so that the system remains maintainable and aligned with DigitalOcean's official API.

#### Acceptance Criteria

1. THE DigitalOcean Service SHALL remove the `getMarketplaceApps` method that fetches application-type images
2. THE DigitalOcean Service SHALL implement a new `get1ClickApps` method that calls the `/v2/1-clicks?type=droplet` endpoint
3. THE DigitalOcean Service SHALL remove the `categorizeApp` private method that performs heuristic-based categorization
4. THE API route `/digitalocean/marketplace` SHALL call the new `get1ClickApps` method instead of `getMarketplaceApps`
5. THE DigitalOcean Service SHALL maintain backward compatibility with the existing MarketplaceApp interface structure

### Requirement 5

**User Story:** As a user creating a VPS, I want the marketplace apps to load reliably with proper error handling, so that temporary API issues do not prevent me from provisioning instances.

#### Acceptance Criteria

1. WHEN the `/v2/1-clicks` API request fails with a rate limit error, THE DigitalOcean Service SHALL retry the request up to 3 times with exponential backoff
2. WHEN the `/v2/1-clicks` API request fails after all retries, THE DigitalOcean Service SHALL throw an error containing the HTTP status code and error message
3. WHEN the marketplace API route encounters an error, THE API route SHALL return a JSON response with error code, message, and provider fields
4. THE Marketplace Component SHALL display the ProviderErrorDisplay component WHEN the marketplace fetch fails
5. WHEN a user clicks the retry button in ProviderErrorDisplay, THE Marketplace Component SHALL re-fetch the 1-Click Apps from the API

### Requirement 6

**User Story:** As a user deploying a 1-Click App, I want the selected app to be properly passed to the Droplet creation API, so that my VPS is provisioned with the correct pre-configured application.

#### Acceptance Criteria

1. WHEN a user selects a 1-Click App in the Marketplace Component, THE VPS Creation Modal SHALL store the app slug in the form data
2. WHEN a user proceeds to create a VPS with a selected 1-Click App, THE CreateDigitalOceanDropletRequest SHALL include the app slug in the request payload
3. THE DigitalOcean Service `createDigitalOceanDroplet` method SHALL accept an optional `user_data` field for 1-Click App installation scripts
4. WHEN the Droplet creation request includes a 1-Click App slug, THE DigitalOcean Service SHALL format the request according to DigitalOcean's 1-Click Apps deployment specification
5. THE VPS Creation Modal SHALL allow users to select "None" to provision a base OS without any marketplace application
