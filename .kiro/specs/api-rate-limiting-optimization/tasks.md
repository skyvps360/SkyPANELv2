# Implementation Plan

- [x] 1. Create unified IP detection service

  - Implement centralized IP detection logic that handles X-Forwarded-For headers and proxy scenarios
  - Create validation and sanitization functions for IP addresses
  - Add comprehensive logging for IP detection debugging
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. Enhance configuration system for rate limiting

  - Add new environment variables for differentiated rate limits (anonymous, authenticated, admin)
  - Implement configuration validation with sensible defaults
  - Add trust proxy configuration options
  - Update config interface and validation logic
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

-

- [x] 3. Implement smart rate limiting middleware

  - [x] 3.1 Create user type classification logic

    - Implement function to determine if user is anonymous, authenticated, or admin
    - Add JWT token validation for user type detection

    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 3.2 Build dynamic rate limiter factory

    - Create factory function that generates rate limiters based on user type
    - Implement enhanced key generation using unified IP detection
    - Add custom response handler with detailed headers and error messages
    - _Requirements: 1.4, 1.5, 4.1, 4.3_

  - [ ]\* 3.3 Write unit tests for rate limiting logic
    - Test user type classification with various JWT scenarios
    - Test dynamic limit selection and key generation
    - Test custom response handling and header generation
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 4. Update Express application configuration

  - [x] 4.1 Add trust proxy configuration to Express app

        - Configure Express to trust proxy headers based on environment
        - Update app.ts to use tru

    st proxy settings - _Requirements: 2.1, 2.2_

  - [x] 4.2 Replace existing rate limiting middleware

    - Remove old rate limiting implementation from app.ts
    - Integrate new smart rate limiting middleware
    - Ensure backward compatibility with existing API responses
    - _Requirements: 4.1, 4.2, 4.4_

  - [x] 4.3 Add integration tests for proxy scenarios

    - Test rate limiting behind Vite development proxy
    - Test with various X-Forwarded-For header configurations
    - Test fallback behavior when proxy headers are missing
    - _Requirements: 2.1, 2.2, 2.5_

- [x] 5. Enhance activity logger integration

  - [x] 5.1 Update activity logger to use unified IP detection

    - Replace existing getIp function with unified IP detection service
    - Ensure consistent IP handling across all activity logging
    - _Requirements: 2.2, 2.3_

  - [x] 5.2 Add rate limiting event logging

    - Implement logging for rate limit violations with detailed metadata
    - Add activity log entries for security-relevant rate limiting events
    - Include endpoint, user type, and limit information in logs
    - _Requirements: 5.1, 5.2, 5.4_

  - [ ]\* 5.3 Write tests for activity logger IP consistency
    - Test that activity logger and rate limiter use same IP detection
    - Test rate limiting event logging with proper metadata
    - _Requirements: 2.2, 2.3, 5.1, 5.4_

- [x] 6. Consolidate existing rate limiting implementations

  - [x] 6.1 Remove duplicate rate limiting middleware

    - Remove admin-specific rate limiter from middleware/security.ts
    - Remove custom rate limiting logic from lib/security.ts
    - Update admin routes to use unified rate limiting approach
    - _Requirements: 4.1, 4.2_

  - [x] 6.2 Update admin routes with enhanced rate limiting

    - Apply appropriate admin-level rate limits to admin endpoints
    - Ensure admin operations have higher limits as specified
    - Maintain security while improving usability
    - _Requirements: 1.3, 4.3_

  - [x] 6.3 Add comprehensive integration tests

    - Test end-to-end rate limiting for all user types
    - Test rate limit enforcement across different API endpoints
    - Test backward compatibility with existing client applications
    - _Requirements: 1.1, 1.2, 1.3, 4.4_

- [x] 7. Add monitoring and observability features

  - [x] 7.1 Implement rate limiting metrics and logging

    - Add detailed logging for rate limit hits with IP, user, and endpoint info
    - Implement aggregated statistics for rate limiting effectiveness
    - Add clear error messages with guidance for users
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

  - [x] 7.2 Add configuration validation and startup checks

    - Validate all rate limiting configuration at application startup
    - Log warnings for invalid configurations and use defaults
    - Add health check endpoint information about rate limiting status
    - _Requirements: 3.4, 3.5_

  - [x] 7.3 Create monitoring dashboard components

    - Add rate limiting metrics to admin dashboard
    - Display current rate limit status and violations
    - Show IP detection accuracy and proxy configuration status
    - _Requirements: 5.2, 5.3_

- [x] 8. Update environment configuration and documentation


  - [x] 8.1 Update .env.example with new rate limiting variables

    - Add all new environment variables with sensible defaults
    - Document the purpose and recommended values for each setting
    - Include trust proxy configuration options
    - _Requirements: 3.1, 3.2_

  - [x] 8.2 Update API documentation

    - Document new rate limiting behavior and headers
    - Update error response documentation for rate limiting
    - Add guidance for different user types and their limits
    - _Requirements: 1.4, 1.5, 5.5_

  - [x] 8.3 Create operational runbook

    - Document troubleshooting steps for rate limiting issues
    - Add guidance for adjusting limits based on usage patterns
    - Include monitoring and alerting recommendations
    - _Requirements: 5.2, 5.3_
