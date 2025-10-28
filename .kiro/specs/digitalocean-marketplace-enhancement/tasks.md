# Implementation Plan

- [x] 1. Implement helper methods in DigitalOceanService

  - Create `formatAppName()` method to convert slugs to human-readable names
  - Create `getAppCategory()` method to categorize apps based on slug patterns
  - Create `getAppDescription()` method to provide descriptions for common apps
  - _Requirements: 1.4, 2.1, 2.5, 4.3_

- [x] 2. Implement get1ClickApps method in DigitalOceanService

  - [x] 2.1 Create get1ClickApps method that calls /v2/1-clicks endpoint

    - Add method signature with apiToken parameter

    - Implement API call to `/v2/1-clicks?type=droplet` using makeRequest
    - Add token validation that throws error if not provided
    - _Requirements: 1.1, 1.4, 4.2, 4.5_

  - [x] 2.2 Transform API response to MarketplaceApp format

    - Map `1_clicks` array from response
    - Call formatAppName() for each app slug
    - Call getAppDescription() for each app slug
    - Call getAppCategory() for each app slug
    - Set image_slug to app.slug value
    - Set type from API response
    - _Requirements: 1.4, 2.1, 2.5_

  - [x] 2.3 Add error handling for API failures

    - Wrap implementation in try-catch block
    - Log errors with descriptive message
    - Re-throw errors to be handled by caller

    - _Requirements: 5.2, 5.3_

- [x] 3. Update API route to use new method

  - [x] 3.1 Modify /digitalocean/marketplace route handler

    - Replace `getMarketplaceApps()` call with `get1ClickApps()`
    - Maintain existing error handling structure
    - Keep response format unchanged (apps, categorized, total)
    - _Requirements: 4.4, 5.3_

  - [x] 3.2 Verify error responses include proper fields

    - Ensure error responses contain code, message, and provider fields
    - Maintain HTTP status code mapping from service errors
    - _Requirements: 5.3_

- [x] 4. Remove deprecated methods from DigitalOceanService

  - Remove `getMarketplaceApps()` method
  - Remove `categorizeApp()` private method
  - Update any internal references if they exist
  - _Requirements: 4.1, 4.3_

-

- [x] 5. Verify frontend compatibility

  - [x] 5.1 Review DigitalOceanMarketplace component

    - Confirm component expects apps array with slug, name, description, category fields
    - Verify search functionality works with name, description, and category
    - Confirm category grouping logic is compatible
    - _Requirements: 2.2, 3.1, 3.2, 3.3, 3.4_

  - [x] 5.2 Test app selection flow

    - Verify onSelect callback receives appSlug and appData
    - Confirm selected app is stored in form data
    - Check that form data is passed to VPS creation endpoint
    - _Requirements: 6.1, 6.2_

- [x] 6. Add integration tests for marketplace endpoint

  - Write test for successful marketplace fetch
  - Write test for missing provider configuration
  - Write test for API service errors
  - Verify response structure matches expected format
  - _Requirements: 1.1, 1.3, 5.3_

- [x] 7. Add unit tests for helper methods





  - Test formatAppName with various slug formats
  - Test getAppCategory with different app types
  - Test getAppDescription for known and unknown apps
  - _Requirements: 2.1, 2.5_

- [x] 8. Add unit tests for get1ClickApps method



  - Mock makeRequest to return sample 1-Click Apps response
  - Verify transformation to MarketplaceApp format
  - Test error handling for missing token
  - Test error handling for API failures
  - _Requirements: 1.4, 5.1, 5.2_
