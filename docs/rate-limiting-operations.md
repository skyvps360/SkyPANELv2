# Rate Limiting Operations Runbook

This runbook provides operational guidance for managing, monitoring, and troubleshooting the ContainerStacks rate limiting system.

## Overview

ContainerStacks implements intelligent rate limiting with differentiated limits based on user authentication status. The system is designed to prevent abuse while maintaining optimal user experience for legitimate usage.

## Rate Limiting Architecture

### User Classification
- **Anonymous Users**: Unauthenticated requests (200 requests/15min)
- **Authenticated Users**: Valid JWT token holders (500 requests/15min)
- **Admin Users**: Administrative role holders (1000 requests/15min)

### IP Detection
- Uses unified IP detection service for consistent client identification
- Supports X-Forwarded-For headers from trusted proxies
- Falls back to socket remote address when proxy headers unavailable
- Configurable trust proxy settings for different deployment scenarios

## Configuration Management

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_ANONYMOUS_WINDOW_MS` | 900000 | Window duration for anonymous users (15 minutes) |
| `RATE_LIMIT_ANONYMOUS_MAX` | 200 | Max requests for anonymous users per window |
| `RATE_LIMIT_AUTHENTICATED_WINDOW_MS` | 900000 | Window duration for authenticated users |
| `RATE_LIMIT_AUTHENTICATED_MAX` | 500 | Max requests for authenticated users per window |
| `RATE_LIMIT_ADMIN_WINDOW_MS` | 900000 | Window duration for admin users |
| `RATE_LIMIT_ADMIN_MAX` | 1000 | Max requests for admin users per window |
| `TRUST_PROXY` | true | Proxy trust configuration |

### Trust Proxy Configuration

Choose the appropriate `TRUST_PROXY` setting for your deployment:

```bash
# Development (behind Vite proxy)
TRUST_PROXY=true

# Single reverse proxy (nginx, Apache)
TRUST_PROXY=1

# Multiple proxy hops (Cloudflare + nginx)
TRUST_PROXY=2

# Specific subnet
TRUST_PROXY=10.0.0.0/8

# Loopback only
TRUST_PROXY=loopback

# Disable proxy trust
TRUST_PROXY=false
```

### Configuration Validation

The system validates configuration at startup:
- Minimum window: 60,000ms (1 minute)
- Maximum window: 86,400,000ms (24 hours)
- Minimum requests: 1
- Maximum requests: 10,000
- Logical hierarchy: admin ≥ authenticated ≥ anonymous

Invalid configurations trigger warnings and fallback to defaults.

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Rate Limit Hit Rate**
   - Percentage of requests hitting rate limits
   - Target: <5% for normal operations
   - Alert threshold: >10% sustained over 15 minutes

2. **User Type Distribution**
   - Ratio of anonymous vs authenticated vs admin requests
   - Helps identify authentication issues or abuse patterns

3. **IP Detection Accuracy**
   - Percentage of requests with proper IP detection
   - Monitor for proxy configuration issues

4. **False Positive Rate**
   - Legitimate users hitting rate limits
   - May indicate limits are too restrictive

### Monitoring Queries

```sql
-- Rate limit violations in last hour
SELECT 
  event_type,
  COUNT(*) as violations,
  COUNT(DISTINCT ip_address) as unique_ips
FROM activity_logs 
WHERE event_type = 'rate_limit_exceeded' 
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY event_type;

-- Top IPs hitting rate limits
SELECT 
  ip_address,
  COUNT(*) as violations,
  MAX(created_at) as last_violation
FROM activity_logs 
WHERE event_type = 'rate_limit_exceeded' 
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY ip_address
ORDER BY violations DESC
LIMIT 10;
```

### Log Analysis

Rate limiting events are logged with structured metadata:

```json
{
  "event_type": "rate_limit_exceeded",
  "ip_address": "192.168.1.100",
  "user_id": 123,
  "metadata": {
    "endpoint": "/api/vps",
    "userType": "authenticated",
    "limit": 500,
    "window": "15min",
    "remaining": 0
  }
}
```

## Troubleshooting Guide

### Common Issues

#### 1. Users Reporting Rate Limit Errors

**Symptoms:**
- HTTP 429 responses
- "Too many requests" errors in client applications
- User complaints about application slowness

**Diagnosis:**
```bash
# Check recent rate limit violations
grep "rate_limit_exceeded" /var/log/containerstacks/app.log | tail -20

# Check user's recent activity
SELECT * FROM activity_logs 
WHERE user_id = <USER_ID> 
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

**Resolution:**
1. Verify user authentication status (anonymous vs authenticated)
2. Check if user is making excessive requests (possible client bug)
3. Consider temporary limit increase if legitimate usage
4. Investigate client application for request optimization

#### 2. Incorrect IP Detection

**Symptoms:**
- Multiple users sharing same IP in logs
- Rate limiting affecting entire office/network
- Proxy IP addresses in activity logs instead of client IPs

**Diagnosis:**
```bash
# Check IP detection in logs
grep "IP detection" /var/log/containerstacks/app.log | tail -10

# Verify trust proxy configuration
echo $TRUST_PROXY
```

**Resolution:**
1. Verify `TRUST_PROXY` configuration matches deployment
2. Check X-Forwarded-For headers in requests
3. Update proxy configuration if needed
4. Restart application after configuration changes

#### 3. Rate Limiting Not Working

**Symptoms:**
- No rate limit headers in responses
- Abuse requests not being blocked
- Rate limiting appears disabled

**Diagnosis:**
```bash
# Check rate limiting middleware initialization
grep "Rate limiting" /var/log/containerstacks/app.log | head -5

# Verify configuration loading
grep "Config loaded" /var/log/containerstacks/app.log | tail -1
```

**Resolution:**
1. Verify rate limiting middleware is properly initialized
2. Check for configuration validation errors
3. Ensure environment variables are properly set
4. Restart application to reload configuration

#### 4. Performance Issues

**Symptoms:**
- Slow API responses
- High memory usage
- Rate limiting causing bottlenecks

**Diagnosis:**
```bash
# Check memory usage
ps aux | grep node

# Monitor rate limiting performance
grep "Rate limit" /var/log/containerstacks/app.log | grep "ms"
```

**Resolution:**
1. Monitor rate limiting memory store size
2. Consider Redis-based store for high-traffic deployments
3. Optimize rate limiting key generation
4. Review window sizes and cleanup intervals

### Emergency Procedures

#### Disable Rate Limiting Temporarily

```bash
# Set very high limits (emergency only)
export RATE_LIMIT_ANONYMOUS_MAX=10000
export RATE_LIMIT_AUTHENTICATED_MAX=10000
export RATE_LIMIT_ADMIN_MAX=10000

# Restart application
pm2 restart containerstacks
```

#### Block Abusive IP

```bash
# Add to firewall (example for iptables)
iptables -A INPUT -s <ABUSIVE_IP> -j DROP

# Or use nginx rate limiting
# Add to nginx.conf:
# limit_req_zone $binary_remote_addr zone=abuse:10m rate=1r/m;
```

## Capacity Planning

### Adjusting Rate Limits

Consider increasing limits when:
- Legitimate users frequently hit limits
- Application usage patterns change
- New features require more API calls
- User base grows significantly

Consider decreasing limits when:
- Abuse patterns detected
- Server resources are constrained
- Cost optimization needed

### Scaling Considerations

For high-traffic deployments:
1. **Redis Store**: Replace memory store with Redis for distributed rate limiting
2. **Multiple Instances**: Ensure consistent rate limiting across load-balanced instances
3. **CDN Integration**: Use CDN-level rate limiting for static content
4. **Database Optimization**: Monitor activity logging performance

## Best Practices

### Configuration Management
- Use infrastructure as code for environment variables
- Document all configuration changes
- Test configuration changes in staging first
- Monitor impact of configuration changes

### Monitoring
- Set up automated alerts for rate limiting metrics
- Regular review of rate limiting effectiveness
- Monitor false positive rates
- Track user experience impact

### Security
- Regular review of rate limiting logs for abuse patterns
- Coordinate with security team on threat response
- Document incident response procedures
- Regular testing of rate limiting effectiveness

## Maintenance Tasks

### Daily
- Review rate limiting alerts and metrics
- Check for unusual traffic patterns
- Monitor application performance impact

### Weekly
- Analyze rate limiting effectiveness
- Review configuration for optimization opportunities
- Check for false positives affecting users

### Monthly
- Comprehensive review of rate limiting logs
- Capacity planning based on usage trends
- Update documentation based on operational learnings
- Test emergency procedures

## Contact Information

For rate limiting issues:
- **Development Team**: Rate limiting implementation and configuration
- **Operations Team**: Infrastructure and monitoring
- **Security Team**: Abuse patterns and threat response
- **Support Team**: User impact and communication

## References

- [API Documentation](api-endpoints.md) - Rate limiting headers and responses
- [Backend Guide](backend.md) - Technical implementation details
- [Development Guide](development.md) - Local development configuration
- [Architecture Documentation](architecture.md) - System design overview