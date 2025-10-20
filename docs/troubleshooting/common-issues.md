# Common Issues and Solutions

This guide covers frequently encountered issues and their solutions.

## Installation Issues

### Port Already in Use (EADDRINUSE)

**Problem**: Error when starting dev server:
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solution**:
```bash
npm run kill-ports
npm run dev
```

Or manually:
```bash
# Linux/Mac
lsof -ti:3001 | xargs kill -9
lsof -ti:5173 | xargs kill -9

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Database Connection Failed

**Problem**: Cannot connect to PostgreSQL

**Solutions**:

1. Check PostgreSQL is running:
```bash
sudo systemctl status postgresql
```

2. Verify DATABASE_URL in `.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/containerstacks
```

3. Test connection:
```bash
psql $DATABASE_URL -c "SELECT 1;"
```

4. Check PostgreSQL logs:
```bash
tail -f /var/log/postgresql/postgresql-14-main.log
```

### NPM Install Fails

**Problem**: Errors during `npm install`

**Solutions**:

1. Clear npm cache:
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

2. Use correct Node version:
```bash
node --version  # Should be v20.x.x
nvm use 20
```

3. Check for conflicting global packages:
```bash
npm list -g --depth=0
```

## Runtime Issues

### Region Dropdown Empty

**Problem**: No regions shown when creating VPS

**Solutions**:

1. Verify Linode API token in `.env`:
```env
LINODE_API_TOKEN=your-actual-token
```

2. Check token has correct permissions in Linode Cloud Manager

3. Test API connectivity:
```bash
curl -H "Authorization: Bearer $LINODE_API_TOKEN" \
  https://api.linode.com/v4/regions
```

4. Check provider configuration in Admin panel

5. Review server logs for API errors:
```bash
pm2 logs containerstacks-api
```

### Wallet Balance Not Updating

**Problem**: PayPal payment completed but wallet balance unchanged

**Solutions**:

1. Check PayPal webhook configuration

2. Review transaction logs:
```sql
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10;
```

3. Verify PayPal credentials in `.env`:
```env
PAYPAL_CLIENT_ID=your-id
PAYPAL_CLIENT_SECRET=your-secret
PAYPAL_MODE=sandbox  # or 'live'
```

4. Check backend logs for payment processing errors

### VPS Creation Fails

**Problem**: VPS creation returns error

**Solutions**:

1. Check wallet has sufficient balance

2. Verify plan exists and is active:
```sql
SELECT * FROM vps_plans WHERE is_active = true;
```

3. Ensure region is allowed in provider config

4. Check Linode API logs for specific error

5. Verify organization exists:
```sql
SELECT * FROM organizations WHERE id = <org_id>;
```

### Authentication Token Expired

**Problem**: "Token expired" or "Unauthorized" errors

**Solutions**:

1. Logout and login again

2. Clear browser localStorage:
```javascript
localStorage.clear()
```

3. Check JWT_SECRET hasn't changed in `.env`

4. Verify token expiration settings:
```env
JWT_EXPIRES_IN=7d
```

## Build Issues

### TypeScript Compilation Errors

**Problem**: `tsc` shows type errors

**Solutions**:

1. Clean build:
```bash
rm -rf dist
npm run build
```

2. Update TypeScript:
```bash
npm install -D typescript@latest
```

3. Check tsconfig.json is correct

4. Verify all @types packages installed:
```bash
npm install -D @types/node @types/express @types/react
```

### Vite Build Fails

**Problem**: Build fails with Vite errors

**Solutions**:

1. Clear Vite cache:
```bash
rm -rf node_modules/.vite
```

2. Check for circular dependencies

3. Increase Node memory:
```bash
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

## Database Issues

### Missing Table Errors

**Problem**: "relation does not exist" errors

**Solutions**:

1. Run migrations:
```bash
node scripts/run-migration.js
```

2. Check migration files exist:
```bash
ls -la migrations/
```

3. Verify migration order (numbered files)

4. Check database user has permissions:
```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO containerstacks_user;
```

### Row Level Security Blocks Queries

**Problem**: RLS prevents data access

**Solutions**:

1. Check organization_id is set correctly

2. Verify RLS policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'vps_instances';
```

3. Ensure user role is correct in JWT token

4. For admin users, verify admin policy exists

### Migration Conflicts

**Problem**: Duplicate migration errors

**Solutions**:

1. Check for duplicate migration files:
```bash
ls migrations/ | sort
```

2. Reset migration tracking (development only):
```sql
DROP TABLE IF EXISTS schema_migrations;
```

3. Run migrations again:
```bash
node scripts/run-migration.js
```

## Performance Issues

### Slow API Responses

**Problem**: API endpoints taking too long

**Solutions**:

1. Enable query logging to find slow queries:
```sql
ALTER DATABASE containerstacks SET log_min_duration_statement = 1000;
```

2. Add missing indexes:
```sql
CREATE INDEX idx_vps_org ON vps_instances(organization_id);
CREATE INDEX idx_activity_time ON activity_logs(created_at DESC);
```

3. Use connection pooling (should be default)

4. Check Redis is running for caching

5. Monitor with:
```bash
pm2 monit
```

### High Memory Usage

**Problem**: Node process consuming too much memory

**Solutions**:

1. Restart PM2:
```bash
pm2 restart all
```

2. Increase memory limit:
```bash
NODE_OPTIONS=--max-old-space-size=2048 pm2 restart all
```

3. Check for memory leaks with:
```bash
node --inspect api/server.ts
```

4. Review large data queries (use pagination)

### Frontend Performance

**Problem**: React app slow or laggy

**Solutions**:

1. Check browser console for errors

2. Disable React DevTools in production

3. Use React.memo for expensive components

4. Implement virtual scrolling for large lists

5. Optimize images (compress, lazy load)

## Email Issues

### Emails Not Sending

**Problem**: No emails received

**Solutions**:

1. Verify SMTP2GO credentials:
```env
SMTP2GO_API_KEY=your-key
FROM_EMAIL=noreply@your-domain.com
```

2. Check email service logs

3. Test email configuration:
```bash
node -e "require('./api/services/emailService.js').sendEmail({to:'test@example.com',subject:'Test',text:'Test'})"
```

4. Verify sender domain is verified

5. Check spam folder

## Docker Issues

### Container Won't Start

**Problem**: Docker container fails to start

**Solutions**:

1. Check Docker daemon is running:
```bash
sudo systemctl status docker
```

2. View container logs:
```bash
docker logs containerstacks_app_1
```

3. Check docker-compose.yml configuration

4. Rebuild images:
```bash
docker-compose build --no-cache
docker-compose up -d
```

### Volume Permissions

**Problem**: Permission denied in Docker volumes

**Solutions**:

1. Fix ownership:
```bash
sudo chown -R $USER:$USER .
```

2. Update docker-compose.yml with user:
```yaml
services:
  app:
    user: "${UID}:${GID}"
```

## Payment Issues

### PayPal Sandbox Not Working

**Problem**: Sandbox payments fail

**Solutions**:

1. Use sandbox test accounts from PayPal Developer

2. Verify PAYPAL_MODE:
```env
PAYPAL_MODE=sandbox
```

3. Check PayPal sandbox status page

4. Use sandbox-specific credentials

### Payment Webhooks Not Received

**Problem**: Payment completes but app doesn't update

**Solutions**:

1. Verify webhook URL is publicly accessible

2. Check PayPal webhook configuration

3. Review webhook logs in PayPal Developer Dashboard

4. Test webhook with ngrok for local development:
```bash
ngrok http 3001
```

## Security Issues

### CORS Errors

**Problem**: Frontend can't access API

**Solutions**:

1. Check CORS configuration in api/app.ts

2. Verify allowed origins in `.env`:
```env
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://your-domain.com
```

3. Ensure credentials: true for cookies

### Rate Limit Exceeded

**Problem**: "Too Many Requests" errors

**Solutions**:

1. Wait for rate limit window to reset

2. Check rate limit configuration:
```env
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

3. For development, temporarily increase limits

4. Implement exponential backoff in client

## Still Having Issues?

If your problem isn't listed here:

1. Check [GitHub Issues](https://github.com/skyvps360/containerstacks/issues)
2. Review application logs:
   ```bash
   pm2 logs
   ```
3. Enable debug logging:
   ```env
   LOG_LEVEL=debug
   ```
4. Create a new issue with:
   - Error message
   - Steps to reproduce
   - Environment details
   - Relevant logs

---

**Related**: [Installation](../getting-started/installation.md) | [Development Setup](../development/setup.md)
