# Requirements Document

## Introduction

The About page (`/about`) is experiencing API errors when attempting to fetch platform statistics from the `/api/health/platform-stats` endpoint. The root cause is a data structure mismatch between the backend API response format and the frontend's expected format. This feature aims to fix the API response structure inconsistency to ensure the About page displays platform statistics correctly without errors.

## Glossary

- **About Page**: The public-facing page at `/about` that displays platform information and statistics
- **Platform Stats Endpoint**: The backend API endpoint at `/api/health/platform-stats` that returns aggregated platform statistics
- **Frontend Client**: The React component (AboutUs.tsx) that consumes the platform statistics API
- **Backend Service**: The Express.js route handler and PlatformStatsService that provides platform statistics
- **Response Wrapper**: The JSON structure that wraps the actual data in the API response

## Requirements

### Requirement 1

**User Story:** As a visitor to the About page, I want to see accurate platform statistics without encountering errors, so that I can understand the scale and activity of the platform.

#### Acceptance Criteria

1. WHEN a user navigates to the `/about` page, THE Frontend Client SHALL successfully fetch platform statistics from the Platform Stats Endpoint without errors
2. WHEN the Platform Stats Endpoint returns data, THE Backend Service SHALL provide statistics in a format that matches the Frontend Client's expectations
3. WHEN platform statistics are displayed, THE About Page SHALL show all required metrics including user counts, organization counts, VPS counts, container counts, support ticket counts, plan counts, and region counts
4. WHEN the API request completes successfully, THE Frontend Client SHALL display the statistics within the "At a glance" card without showing error messages

### Requirement 2

**User Story:** As a developer maintaining the API, I want consistent response structures across all endpoints, so that frontend integration is predictable and maintainable.

#### Acceptance Criteria

1. THE Platform Stats Endpoint SHALL return platform statistics directly in the response data object without unnecessary nesting
2. THE Backend Service SHALL maintain backward compatibility with any existing consumers of the endpoint including VPS creation and management endpoints
3. WHEN the endpoint returns data, THE Response Wrapper SHALL include only essential metadata (success, timestamp) alongside the statistics
4. THE Backend Service SHALL document the response structure clearly in code comments
5. THE Backend Service SHALL NOT modify the response structure of any VPS-related endpoints including VPS creation, listing, or management APIs

### Requirement 3

**User Story:** As a user experiencing slow network conditions, I want the platform statistics to load efficiently with appropriate caching, so that the About page remains responsive.

#### Acceptance Criteria

1. THE Backend Service SHALL cache platform statistics for 5 minutes to reduce database load
2. WHEN cached data is available and valid, THE Platform Stats Endpoint SHALL return cached data instead of querying the database
3. THE Backend Service SHALL include cache expiry information in the response
4. WHEN the cache expires, THE Backend Service SHALL refresh statistics from the database automatically on the next request

### Requirement 4

**User Story:** As a developer working on VPS features, I want the platform statistics fix to be isolated to the About page endpoint, so that VPS creation and management functionality remains unaffected.

#### Acceptance Criteria

1. THE Backend Service SHALL limit changes to the `/api/health/platform-stats` endpoint only
2. THE Backend Service SHALL NOT modify any endpoints under `/api/vps` including creation, listing, updates, or deletion
3. WHEN VPS instances are created or managed, THE Backend Service SHALL continue to use existing response structures without modification
4. THE Backend Service SHALL maintain all existing VPS-related API contracts and response formats
