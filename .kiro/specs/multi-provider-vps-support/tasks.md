# Implementation Plan

- [x] 1. Set up provider service layer foundation

  - Create provider service interface and factory pattern for routing operations to provider-specific implementations
  - Implement base provider class with common functionality
  - Create provider factory that instantiates correct provider based on type
  - Add error normalization utilities for standardizing provider responses
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 2. Implement DigitalOcean provider client

- [x] 2.1 Create DigitalOcean API client with authentication

  - Write DigitalOcean provider class implementing IProviderService interface
  - Add API authentication using encrypted keys from service_providers table
  - Implement rate limiting and retry logic for DigitalOcean API
  - _Requirements: 5.3, 7.3, 7.4_

- [x] 2.2 Implement Droplet lifecycle methods

  - Code createDroplet() method for VPS provisioning
  - Code getDroplet() method for fetching instance details
  - Code listDroplets() method for listing all instances
  - Code performDropletAction() for power operations
  - _Requirements: 5.1, 5.2, 6.2_

- [x] 2.3 Implement DigitalOcean resource fetching methods

  - Code getMarketplaceApps() for 1-Click applications
  - Code getImages() for OS image listing
  - Code getSizes() for Droplet size/plan listing
  - Code getRegions() for available regions
  - _Requirements: 2.2, 3.2, 4.1_

- [x] 2.4 Add response normalization for DigitalOcean

  - Write transformation functions to convert DigitalOcean responses to common format
  - Handle DigitalOcean-specific error codes and map to standardized errors
  - _Requirements: 10.4, 10.5_

- [x] 3. Update database schema and migrations

  - [x] 3.1 Add provider_id column to vps_instances

    - Write migration to add provider_id UUID foreign key to vps_instances
    - Create index on provider_id for performance
    - Add migration to populate provider_id for existing Linode instances
    - _Requirements: 5.4, 8.3_

  - [x] 3.2 Create data migration script for existing instances

    - Write script to set provider_type='linode' for existing instances
    - Link existing instances to Linode provider via provider_id
    - Verify data integrity after migration
    - _Requirements: 5.4_

- [x] 4. Add DigitalOcean-specific backend endpoints

  - [x] 4.1 Create marketplace apps endpoint

        - Add GET /api/vps/digitalocean/marketplace route
        - Fetch apps from DigitalOcean provider service
        - Return formatted ma

    rketplace app list with categories - _Requirements: 2.2_

  - [x] 4.2 Create DigitalOcean images endpoint

    - Add GET /api/vps/digitalocean/images route
    - Fetch OS images from DigitalOcean provider service
    - Support filtering by type (distribution, application)
    - _Requirements: 3.2_

  - [x] 4.3 Create DigitalOcean sizes endpoint

    - Add GET /api/vps/digitalocean/sizes route
    - Fetch Droplet sizes from DigitalOcean provider service
    - Return sizes with pricing and region availability
    - _Requirements: 1.3_

- [x] 5. Update VPS creation endpoint for multi-provider support

  - [x] 5.1 Modify POST /api/vps to accept provider parameters

    - Add provider_id and provider_type to request body validation
    - Extract provider details from service_providers table

    - Route creation request through provider service factory
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 5.2 Implement provider-specific creation logic

    - Add conditional logic to handle Linode vs DigitalOcean parameters
    - Store provider_id and provider_type in vps_instances table
    - Handle marketplace apps for DigitalOcean
    - Handle StackScripts for Linode
    - _Requirements: 2.1, 5.4_

  - [x] 5.3 Update billing integration for multi-provider

    - Ensure billing service works with both providers
    - Use provider-specific pricing from vps_plans
    - _Requirements: 5.1_

- [x] 6. Update VPS detail endpoint for multi-provider support

  - Modify GET /api/vps/:id to route based on provider_type
  - Fetch instance details from appropriate provider service
  - Normalize response format for frontend consumption
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 7. Create provider selector frontend component

  - [x] 7.1 Build ProviderSelector component

    - Create React component with dropdown for provider selection
    - Fetch active providers from /api/admin/providers
    - Display provider name and optional icon
    - Emit provider_id and provider_type on selection
    - _Requirements: 1.1, 1.2, 1.4, 1.5_

  - [x] 7.2 Integrate provider selector into VPS creation modal

    - Add ProviderSelector as first field before LABEL
    - Update form state to include provider_id and provider_type
    - Filter available plans based on selected provider
    - _Requirements: 1.1, 1.3_

- [x] 8. Create DigitalOcean marketplace component

- [ ] 8. Create DigitalOcean marketplace component

  - Build DigitalOceanMarketplace React component
  - Fetch marketplace apps from /api/vps/digitalocean/marketplace
  - Display apps grouped by category with descriptions
  - Handle app selection and configuration
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 9. Create DigitalOcean OS selection component

  - Build DigitalOceanOSSelection React component

  - Fetch OS images from /api/vps/digitalocean/images
  - Group images by distribution family
  - Filter by marketplace app compatibility if applicable
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 10. Create DigitalOcean configuration component

  - Build DigitalOceanConfiguration React component

  - Render DigitalOcean-specific fields (monitoring, IPv6, VPC)
  - Maintain common fields (root password, SSH keys)
  - Validate configuration before submission
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 11. Implement dynamic step rendering in VPS creation modal

  - [x] 11.1 Create step renderer component

    - Build CreateVPSSteps component with provider-based conditional rendering
    - Render appropriate components for each step based on provider_type
    - Maintain step navigation and validation
    - _Requirements: 2.1, 3.1, 4.1_

  - [x] 11.2 Update VPS creation modal to use dynamic steps

    - Replace hardcoded Linode steps with dynamic step renderer
    - Pass provider_type to step renderer
    - Update form submission to include provider parameters
    - _Requirements: 2.3, 3.3, 4.5_

-

- [x] 12. Update VPS table to display provider information

  - [x] 12.1 Add provider column to VPS table

    - Add provider_type column to VpsInstancesTable component
    - Display provider name or icon for each instance
    - _Requirements: 9.1, 9.2_

  - [x] 12.2 Add provider filtering to VPS table

    - Add provider filter dropdown to VPS page
    - Filter instances by selected provider
    - Persist filter selection in session
    - _Requirements: 9.3, 9.4, 9.5_

-

- [x] 13. Update VPS detail page for multi-provider support

  - Modify VPSDetail component to detect provider_type
  - Fetch instance details from appropriate provider endpoint
  - Display provider-specific information and metrics
  - Show provider name or logo on detail page
  - Render provider-appropriate action buttons
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 14. Enhance admin provider management UI

  - [x] 14.1 Update provider configuration interface

    - Display DigitalOcean provider in admin providers section
    - Add API credential input fields for DigitalOcean
    - Add enable/disable toggle for each provider
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 14.2 Add provider validation and status display

    - Implement API credential validation before activation
    - Display provider status (active, inactive, error)
    - Show last successful API call timestamp
    - _Requirements: 7.4, 7.5_

- [x] 15. Update admin VPS plan management for multi-provider

  - Add provider selection dropdown to plan creation form
  - Display plans grouped by provider in admin interface
  - Filter plans by provider in admin view
  - Validate provider_id when creating/updating plans
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 16. Update TypeScript types for multi-provider support

  - Add Provider, ProviderType, ProviderPlan interfaces to src/types/provider.ts
  - Update VPSInstance interface to include provider_id and provider_type
  - Update CreateVPSForm interface with provider fields and DigitalOcean options
  - Export provider-related types for use across frontend
  - _Requirements: 1.1, 5.1, 6.1_

-

- [x] 17. Implement error handling and user feedback

  - Add provider-specific error messages to frontend
  - Display helpful error messages for API credential issues
  - Handle provider unavailability gracefully
  - Show loading states during provider API calls
  - _Requirements: 1.5, 2.5, 3.5, 5.5_

- [x] 18. Add caching for provider resources

  - Implement caching for provider plans (1 hour TTL)
  - Implement caching for OS images (1 hour TTL)
  - Implement caching for marketplace apps (6 hours TTL)
  - Add cache invalidation on provider configuration change
  - _Requirements: 1.3, 2.2, 3.2_

- [-] 19. Write integration tests for multi-provider VPS creation

  - [x] 19.1 Test DigitalOcean VPS creation flow

    - Write test for end-to-end DigitalOcean VPS creation
    - Test marketplace app deployment
    - Test error scenarios (invalid credentials, rate limits)
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ] 19.2 Test provider switching and filtering

    - Write test for provider selection in creation modal
    - Test plan filtering by provider
    - Test instance filtering by provider in VPS table
    - _Requirements: 1.3, 9.3, 9.4_

  - [ ] 19.3 Test admin provider management
    - Write test for provider activation/deactivation
    - Test API credential validation
    - Test plan creation per provider
    - _Requirements: 7.1, 7.2, 7.4, 8.1_

- [x] 20. Update documentation and add inline code comments


  - Document provider service layer architecture
  - Add JSDoc comments to provider interfaces and methods
  - Document DigitalOcean-specific configuration options
  - Update API documentation with new endpoints
  - _Requirements: All_
