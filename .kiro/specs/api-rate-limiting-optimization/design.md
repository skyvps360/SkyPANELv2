# Design Document

## Overview

This design implements an optimized rate limiting system for ContainerStacks that addresses current limitations with restrictive limits and IP detection issues. The solution provides differentiated rate limits based on user authentication status, proper IP detection behind proxies, and comprehensive configuration options while maintaining security and backward compatibility.

## Architecture

### Current State Analysis

The existing implementation has several components that need consolidation:
- Main rate limiter in `api/app.ts` using express-rate-limit
- Admin-specific rate limiter in `api/middleware/security.ts`
- Custom rate limiting logic in `api/lib/security.ts`
- IP detection in `api/services/activityLogger.ts`

### Proposed Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Vite Proxy    │───▶│  Express App     │───▶│  Rate Limiter   │
│  (Development)  │    │  (Trust Proxy)   │    │  (Unified)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
┌─────────────────┐             │                        ▼
│ Reverse Proxy   │─────────────┘              ┌─────────────────┐
│  (Production)   │                            │  IP Detection   │
└─────────────────┘                            │   (Consistent)  │
                                               └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │ Activity Logger │
                                               │  (Enhanced)     │
                                               └─────────────────┘
```

## Components and Interfaces

### 1. Enhanced Rate Limiting Configuration

**Location:** `api/config/index.ts`

```typescript
interface RateLimitConfig {
  // Anonymous user limits
  anonymousWindowMs: number;
  anonymousMaxRequests: number;
  
  // Authenticated user limits  
  authenticatedWindowMs: number;
  authenticatedMaxRequests: number;
  
  // Admin user limits
  adminWindowMs: number;
  adminMaxRequests: number;
  
  // Trust proxy configuration
  trustProxy: boolean | string | number;
}
```

**Environment Variables:**
- `RATE_LIMIT_ANONYMOUS_WINDOW_MS` (default: 900000 - 15 minutes)
- `RATE_LIMIT_ANONYMOUS_MAX` (default: 200)
- `RATE_LIMIT_AUTHENTICATED_WINDOW_MS` (default: 900000)
- `RATE_LIMIT_AUTHENTICATED_MAX` (default: 500)
- `RATE_LIMIT_ADMIN_WINDOW_MS` (default: 900000)
- `RATE_LIMIT_ADMIN_MAX` (default: 1000)
- `TRUST_PROXY` (default: true)

### 2. Unified IP Detection Service

**Location:** `api/lib/ipDetection.ts`

```typescript
interface IPDetectionService {
  getClientIP(req: Request): string;
  isValidIP(ip: string): boolean;
  logIPDetection(req: Request, detectedIP: string): void;
}
```

**Functionality:**
- Standardized IP extraction logic
- Support for X-Forwarded-For headers
- Fallback to socket remote address
- IP validation and sanitization
- Consistent logging across all components

### 3. Smart Rate Limiting Middleware

**Location:** `api/middleware/rateLimiting.ts`

```typescript
interface SmartRateLimiter {
  createLimiter(userType: 'anonymous' | 'authenticated' | 'admin'): RateLimitMiddleware;
  getUserType(req: AuthenticatedRequest): 'anonymous' | 'authenticated' | 'admin';
  enhancedKeyGenerator(req: Request): string;
  customHandler(req: Request, res: Response): void;
}
```

**Features:**
- Dynamic rate limit selection based on user authentication
- Enhanced key generation using proper IP detection
- Custom response handling with detailed headers
- Integration with activity logging
- Backward compatible with existing express-rate-limit

### 4. Enhanced Activity Logger Integration

**Location:** `api/services/activityLogger.ts` (enhanced)

**Changes:**
- Use unified IP detection service
- Log rate limiting events as security activities
- Enhanced metadata for rate limit violations
- Consistent IP handling across all log entries

## Data Models

### Rate Limit Store Enhancement

The existing express-rate-limit memory store will be enhanced with:

```typescript
interface RateLimitEntry {
  key: string;           // Enhanced key with proper IP
  count: number;         // Current request count
  resetTime: number;     // Window reset timestamp
  userType: string;      // User classification
  lastIP: string;        // Last detected IP
  violations: number;    // Consecutive violations
}
```

### Activity Log Enhancement

Existing activity_logs table will be enhanced with rate limiting events:

```sql
-- New event types for rate limiting
INSERT INTO activity_logs (
  user_id, 
  event_type, 
  entity_type, 
  message, 
  status, 
  ip_address, 
  metadata
) VALUES (
  $1, 
  'rate_limit_exceeded', 
  'api_request', 
  'Rate limit exceeded for endpoint', 
  'warning', 
  $2, 
  '{"endpoint": "/api/vps", "limit": 500, "window": "15min"}'
);
```

## Error Handling

### Rate Limit Exceeded Response

```typescript
interface RateLimitResponse {
  error: string;
  retryAfter: number;        // Seconds until reset
  limit: number;             // Current limit
  remaining: number;         // Requests remaining
  resetTime: number;         // Unix timestamp
  userType: string;          // User classification
}
```

### IP Detection Fallback

```typescript
const ipDetectionFallback = {
  primary: 'x-forwarded-for',
  secondary: 'x-real-ip', 
  tertiary: 'socket.remoteAddress',
  default: '127.0.0.1'
};
```

### Configuration Validation

```typescript
interface ConfigValidation {
  validateRateLimits(): ValidationResult;
  validateTrustProxy(): ValidationResult;
  logConfigWarnings(): void;
  useDefaults(): RateLimitConfig;
}
```

## Testing Strategy

### Unit Tests

1. **IP Detection Tests**
   - Test X-Forwarded-For header parsing
   - Test fallback to socket remote address
   - Test IP validation and sanitization
   - Test proxy trust configuration

2. **Rate Limiting Logic Tests**
   - Test user type classification
   - Test dynamic limit selection
   - Test key generation with proper IPs
   - Test window reset behavior

3. **Configuration Tests**
   - Test environment variable parsing
   - Test validation logic
   - Test default value fallbacks
   - Test invalid configuration handling

### Integration Tests

1. **End-to-End Rate Limiting**
   - Test anonymous user limits
   - Test authenticated user limits  
   - Test admin user limits
   - Test limit enforcement across different endpoints

2. **Proxy Scenarios**
   - Test behind Vite development proxy
   - Test behind reverse proxy (nginx/cloudflare)
   - Test with multiple proxy hops
   - Test without proxy configuration

3. **Activity Logging Integration**
   - Test IP consistency between rate limiter and activity logger
   - Test rate limit violation logging
   - Test metadata accuracy

### Performance Tests

1. **Rate Limiter Performance**
   - Test memory usage with high request volumes
   - Test response time impact
   - Test cleanup of expired entries

2. **IP Detection Performance**
   - Test header parsing performance
   - Test regex validation performance

## Implementation Phases

### Phase 1: IP Detection Foundation
- Implement unified IP detection service
- Add trust proxy configuration to Express app
- Update activity logger to use unified IP detection
- Add comprehensive logging for IP detection

### Phase 2: Enhanced Rate Limiting
- Implement smart rate limiting middleware
- Add differentiated limits for user types
- Enhance configuration with new environment variables
- Add detailed rate limit response headers

### Phase 3: Integration and Cleanup
- Replace existing rate limiting implementations
- Update all middleware to use unified approach
- Add comprehensive error handling
- Implement activity logging for rate limit events

### Phase 4: Monitoring and Optimization
- Add rate limiting metrics and monitoring
- Implement configuration validation
- Add performance optimizations
- Create documentation and operational guides