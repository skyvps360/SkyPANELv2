# Requirements Document

## Introduction

ContainerStacks currently implements restrictive API rate limiting (100 requests per 15 minutes) that impacts user experience in the modern SPA environment. Additionally, the system has IP detection issues when operating behind proxies, causing rate limiting to potentially use proxy server IPs instead of actual client IPs. This feature addresses these limitations by optimizing rate limits for better user experience while maintaining security, and fixing IP detection to work properly in all deployment scenarios.

## Glossary

- **Rate_Limiter**: The express-rate-limit middleware that controls API request frequency
- **Client_IP**: The actual IP address of the end user making requests
- **Proxy_IP**: The IP address of intermediate servers (Vite dev server, reverse proxies)
- **SPA**: Single Page Application that makes multiple concurrent API requests
- **Express_App**: The main Express.js application server
- **Trust_Proxy**: Express.js configuration that enables proper IP detection behind proxies
- **Activity_Logger**: Service that logs user activities with IP addresses
- **Admin_Operations**: API endpoints requiring administrative privileges
- **Anonymous_User**: Unauthenticated user accessing public endpoints
- **Authenticated_User**: User with valid JWT token accessing protected endpoints

## Requirements

### Requirement 1

**User Story:** As a user of the ContainerStacks application, I want to perform normal application operations without encountering rate limiting errors, so that I can have a smooth user experience.

#### Acceptance Criteria

1. WHEN an Authenticated_User performs normal application usage, THE Rate_Limiter SHALL allow at least 500 requests per 15-minute window
2. WHEN an Anonymous_User accesses public endpoints, THE Rate_Limiter SHALL allow at least 200 requests per 15-minute window  
3. WHEN an admin performs Admin_Operations, THE Rate_Limiter SHALL allow at least 1000 requests per 15-minute window
4. WHEN rate limits are exceeded, THE Express_App SHALL return HTTP 429 with clear retry-after headers
5. WHERE rate limiting is applied, THE Express_App SHALL include current limit status in response headers

### Requirement 2

**User Story:** As a system administrator, I want accurate IP address detection and logging, so that I can properly monitor and secure the application.

#### Acceptance Criteria

1. WHEN the Express_App operates behind a proxy, THE Rate_Limiter SHALL detect the actual Client_IP instead of Proxy_IP
2. WHEN Trust_Proxy configuration is enabled, THE Activity_Logger SHALL use the same IP detection method as Rate_Limiter
3. WHEN logging activities, THE Activity_Logger SHALL record the actual Client_IP in all activity records
4. WHEN rate limiting occurs, THE Rate_Limiter SHALL log the actual Client_IP being limited
5. WHERE X-Forwarded-For headers exist, THE Express_App SHALL extract the first IP address as Client_IP

### Requirement 3

**User Story:** As a developer, I want configurable rate limiting settings, so that I can adjust limits based on deployment environment and usage patterns.

#### Acceptance Criteria

1. THE Express_App SHALL read rate limit values from environment variables with sensible defaults
2. WHEN environment variables are updated, THE Rate_Limiter SHALL use new values after application restart
3. THE Express_App SHALL support separate rate limit configurations for different user types
4. THE Express_App SHALL validate rate limit configuration values at startup
5. WHERE rate limit configuration is invalid, THE Express_App SHALL log warnings and use default values

### Requirement 4

**User Story:** As a security-conscious operator, I want consolidated and consistent rate limiting across all API endpoints, so that the application is protected from abuse while maintaining usability.

#### Acceptance Criteria

1. THE Express_App SHALL use a single, consistent rate limiting implementation across all API routes
2. WHEN multiple rate limiting middlewares exist, THE Express_App SHALL consolidate them into unified logic
3. THE Rate_Limiter SHALL apply appropriate limits based on endpoint sensitivity and user authentication status
4. THE Express_App SHALL maintain backward compatibility with existing rate limit headers and responses
5. WHERE custom rate limiting is needed for specific endpoints, THE Express_App SHALL extend the base rate limiting logic

### Requirement 5

**User Story:** As a system administrator, I want comprehensive logging and monitoring of rate limiting events, so that I can understand usage patterns and adjust limits appropriately.

#### Acceptance Criteria

1. WHEN rate limits are exceeded, THE Rate_Limiter SHALL log detailed information including Client_IP, user ID, and endpoint
2. THE Express_App SHALL provide metrics on rate limiting effectiveness and false positive rates
3. WHEN rate limiting occurs frequently, THE Rate_Limiter SHALL log aggregated statistics for analysis
4. THE Activity_Logger SHALL record rate limiting events as security-relevant activities
5. WHERE rate limiting impacts user experience, THE Express_App SHALL provide clear error messages with guidance