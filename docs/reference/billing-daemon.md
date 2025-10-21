# Billing Daemon Installation and Management

## Overview

The ContainerStacks Billing Daemon is a standalone background process that performs automated hourly billing operations independently of the main application. This ensures billing continuity even during application downtime or maintenance.

## Features

- **Independent Operation**: Runs as a system service separate from the main application
- **Automatic Failover**: Built-in billing resumes automatically if daemon stops
- **Heartbeat Monitoring**: Updates status every 60 seconds for health tracking
- **Graceful Shutdown**: Completes current billing cycle before stopping
- **Database Coordination**: Prevents duplicate billing through shared status table

## Prerequisites

- Node.js 20+ installed
- PostgreSQL database with ContainerStacks schema
- Root or sudo access for systemd service installation
- Applied database migration `012_billing_daemon_status.sql`

## Installation

### 1. Install Dependencies

Ensure all npm dependencies are installed (including tsx):

```bash
cd /root/containerstacks
npm install
```

### 2. Verify Database Migration

Ensure the billing daemon status table exists. If the table doesn't exist, apply the migration:

```bash
node scripts/run-migration.js
```

### 3. Configure Environment Variables

The daemon uses the same `.env` file as your main application. Ensure these variables are set:

```bash
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/containerstacks

# Optional (defaults shown)
BILLING_INTERVAL_MINUTES=60
LOG_LEVEL=info
```

### 4. Install systemd Service

Copy the service file to systemd directory:

```bash
sudo cp systemd/containerstacks-billing-dev.service /etc/systemd/system/containerstacks-billing.service
```

**Important:** If your installation directory differs from `/root/containerstacks`, you must update the `WorkingDirectory` and `ExecStart` paths in the service file:

```bash
sudo nano /etc/systemd/system/containerstacks-billing.service
# Update these lines:
# WorkingDirectory=/your/path/to/containerstacks
# ExecStart=/your/path/to/containerstacks/node_modules/.bin/tsx scripts/billing-daemon/index.js
```

Reload systemd to recognize the new service:

```bash
sudo systemctl daemon-reload
```

### 5. Enable and Start the Service

Enable the service to start automatically on boot:

```bash
sudo systemctl enable containerstacks-billing.service
```

Start the service:

```bash
sudo systemctl start containerstacks-billing.service
```

## Managing the Daemon

### Check Service Status

View current status and recent logs:

```bash
sudo systemctl status containerstacks-billing.service
```

### Start the Daemon

```bash
sudo systemctl start containerstacks-billing.service
```

### Stop the Daemon

The daemon will complete the current billing cycle before stopping:

```bash
sudo systemctl stop containerstacks-billing.service
```

### Restart the Daemon

```bash
sudo systemctl restart containerstacks-billing.service
```

### Disable Auto-Start

Prevent the daemon from starting on boot:

```bash
sudo systemctl disable containerstacks-billing.service
```

## Viewing Logs

### View Recent Logs

```bash
sudo journalctl -u containerstacks-billing.service
```

### Follow Logs in Real-Time

```bash
sudo journalctl -u containerstacks-billing.service -f
```

### View Logs from Last Boot

```bash
sudo journalctl -u containerstacks-billing.service -b
```

### View Logs for Specific Time Range

```bash
# Last hour
sudo journalctl -u containerstacks-billing.service --since "1 hour ago"

# Last 30 minutes
sudo journalctl -u containerstacks-billing.service --since "30 minutes ago"

# Specific date range
sudo journalctl -u containerstacks-billing.service --since "2025-01-20" --until "2025-01-21"
```

### View Only Error Messages

```bash
sudo journalctl -u containerstacks-billing.service -p err
```

## Monitoring Daemon Health

### Check Daemon Status via API

The platform provides an API endpoint to check daemon health:

```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:3001/api/health/billing-daemon
```

### Check Status Page

Navigate to `/status` in your ContainerStacks dashboard to view:
- Daemon status (running/stopped/error)
- Last successful billing run timestamp
- Number of instances billed
- Warning indicators if daemon hasn't run in 90+ minutes

### Database Status Check

Query the daemon status directly from the database:

```sql
SELECT 
  daemon_instance_id,
  status,
  last_run_at,
  last_run_success,
  instances_billed,
  total_amount,
  heartbeat_at,
  EXTRACT(EPOCH FROM (NOW() - heartbeat_at))/60 as minutes_since_heartbeat
FROM billing_daemon_status
ORDER BY heartbeat_at DESC
LIMIT 1;
```

## Troubleshooting

## Troubleshooting

### Exit Code 203/EXEC Error

**Symptom**: Service fails to start with error code 203/EXEC

```
Process: 240526 ExecStart=/usr/bin/npx tsx scripts/billing-daemon/index.js (code=exited, status=203/EXEC)
```

**Cause**: This error indicates that the command specified in `ExecStart` cannot be executed. Common causes:
- npm dependencies (including tsx) are not installed
- The path to tsx in the service file is incorrect
- The working directory path doesn't match your installation

**Solutions**:

1. **Install dependencies** in your ContainerStacks directory:
   ```bash
   cd /root/containerstacks  # or your installation path
   npm install
   ```

2. **Verify tsx is available**:
   ```bash
   ls -la /root/containerstacks/node_modules/.bin/tsx
   # Should show: lrwxrwxrwx ... tsx -> ../tsx/dist/cli.mjs
   ```

3. **Check service file paths**:
   ```bash
   sudo systemctl cat containerstacks-billing.service
   ```
   
   Ensure these paths match your installation:
   - `WorkingDirectory=/root/containerstacks` (or your path)
   - `ExecStart=/root/containerstacks/node_modules/.bin/tsx scripts/billing-daemon/index.js`
   - `EnvironmentFile=/root/containerstacks/.env`

4. **Update service file if needed**:
   ```bash
   sudo nano /etc/systemd/system/containerstacks-billing.service
   # Update the paths to match your installation
   ```

5. **Reload and restart**:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart containerstacks-billing
   sudo systemctl status containerstacks-billing
   ```

### Daemon Won't Start

**Symptom**: Service fails to start or immediately stops

**Solutions**:

1. Check service logs for errors:
   ```bash
   sudo journalctl -u containerstacks-billing.service -n 50
   ```

2. Verify Node.js is installed and accessible:
   ```bash
   which node
   node --version
   ```

3. Check file permissions:
   ```bash
   ls -la /root/containerstacks/scripts/billing-daemon/
   ```

4. Verify database connection:
   ```bash
   node scripts/test-connection.js
   ```

5. Check environment file exists and is readable:
   ```bash
   ls -la /root/containerstacks/.env
   ```

### Database Connection Errors

**Symptom**: Logs show "Connection refused" or "Authentication failed"

**Solutions**:

1. Verify DATABASE_URL in `.env` file:
   ```bash
   grep DATABASE_URL /root/containerstacks/.env
   ```

2. Test database connection:
   ```bash
   psql "$DATABASE_URL" -c "SELECT 1;"
   ```

3. Check PostgreSQL is running:
   ```bash
   sudo systemctl status postgresql
   ```

4. Verify database user permissions:
   ```sql
   -- Connect as postgres user
   \c containerstacks
   \du
   ```

### Daemon Stops Unexpectedly

**Symptom**: Service status shows "failed" or "inactive"

**Solutions**:

1. Check for crash logs:
   ```bash
   sudo journalctl -u containerstacks-billing.service -p err -n 100
   ```

2. Verify system resources:
   ```bash
   free -h
   df -h
   ```

3. Check for out-of-memory errors:
   ```bash
   sudo dmesg | grep -i "out of memory"
   ```

4. Review daemon error messages in database:
   ```sql
   SELECT error_message, last_run_at 
   FROM billing_daemon_status 
   WHERE error_message IS NOT NULL 
   ORDER BY last_run_at DESC 
   LIMIT 5;
   ```

### Billing Not Running

**Symptom**: No billing activity for extended period

**Solutions**:

1. Check daemon heartbeat:
   ```bash
   sudo journalctl -u containerstacks-billing.service | grep -i heartbeat | tail -5
   ```

2. Verify billing interval configuration:
   ```bash
   grep BILLING_INTERVAL_MINUTES /root/containerstacks/.env
   ```

3. Check for billing execution errors:
   ```bash
   sudo journalctl -u containerstacks-billing.service | grep -i "billing" | tail -20
   ```

4. Verify VPS instances exist to bill:
   ```sql
   SELECT COUNT(*) FROM vps_instances WHERE status = 'running';
   ```

### Duplicate Billing Charges

**Symptom**: Users charged twice for the same period

**Solutions**:

1. Check if both daemon and built-in billing are running:
   ```bash
   # Check daemon status
   sudo systemctl status containerstacks-billing.service
   
   # Check application logs for built-in billing
   pm2 logs containerstacks-api | grep -i "billing"
   ```

2. Verify coordination logic is working:
   ```sql
   SELECT 
     daemon_instance_id,
     heartbeat_at,
     EXTRACT(EPOCH FROM (NOW() - heartbeat_at))/60 as minutes_since_heartbeat
   FROM billing_daemon_status
   ORDER BY heartbeat_at DESC
   LIMIT 1;
   ```

3. If daemon heartbeat is recent (< 90 minutes), built-in billing should be paused
4. Check application logs for coordination messages:
   ```bash
   pm2 logs containerstacks-api | grep -i "daemon is active"
   ```

### High Memory Usage

**Symptom**: Daemon consuming excessive memory

**Solutions**:

1. Check current memory usage:
   ```bash
   ps aux | grep "billing-daemon"
   ```

2. Review billing batch size and optimize if needed
3. Restart daemon to clear memory:
   ```bash
   sudo systemctl restart containerstacks-billing.service
   ```

4. Consider adjusting billing interval if processing large numbers of instances

### Permission Denied Errors

**Symptom**: Logs show "EACCES" or "Permission denied"

**Solutions**:

1. Verify service runs as correct user:
   ```bash
   sudo systemctl cat containerstacks-billing.service | grep User
   ```

2. Check file ownership:
   ```bash
   ls -la /root/containerstacks/scripts/billing-daemon/
   ```

3. Ensure .env file is readable:
   ```bash
   sudo chmod 600 /root/containerstacks/.env
   sudo chown root:root /root/containerstacks/.env
   ```

## Coordination with Built-In Billing

The daemon and main application coordinate automatically to prevent duplicate billing:

1. **Daemon Active** (heartbeat < 90 minutes ago):
   - Daemon performs all billing operations
   - Built-in billing scheduler is paused
   - Application logs: "Billing daemon is active, skipping built-in billing"

2. **Daemon Inactive** (heartbeat > 90 minutes ago):
   - Built-in billing resumes automatically
   - No manual intervention required
   - Application performs hourly billing as fallback

3. **Status Page Warning**:
   - Warning appears if daemon hasn't run in 90+ minutes
   - Indicates potential daemon failure
   - Built-in billing provides automatic failover

## Best Practices

### Monitoring

- Check daemon status daily via `/status` page
- Set up alerts for daemon failures (monitor heartbeat_at timestamp)
- Review billing logs weekly for anomalies
- Monitor database for failed billing runs

### Maintenance

- Keep Node.js updated to latest LTS version
- Review daemon logs monthly for recurring errors
- Test daemon restart during maintenance windows
- Verify billing accuracy after daemon updates

### Backup

- Include daemon status table in database backups
- Document custom configuration changes
- Keep copy of systemd service file in version control

### Security

- Restrict .env file permissions (600)
- Run daemon as dedicated user (not root) in production
- Use read-only database credentials where possible
- Rotate database passwords periodically

## Uninstalling the Daemon

If you need to remove the daemon and rely solely on built-in billing:

1. Stop and disable the service:
   ```bash
   sudo systemctl stop containerstacks-billing.service
   sudo systemctl disable containerstacks-billing.service
   ```

2. Remove the service file:
   ```bash
   sudo rm /etc/systemd/system/containerstacks-billing.service
   sudo systemctl daemon-reload
   ```

3. The built-in billing will automatically resume after 90 minutes

4. Optionally, clean up the status table:
   ```sql
   TRUNCATE TABLE billing_daemon_status;
   ```

## Additional Resources

- [Billing Service Documentation](./billing-service.md)
- [Database Schema Reference](./database-schema.md)
- [API Endpoints Documentation](../api/health-endpoints.md)
- [Troubleshooting Guide](../troubleshooting/common-issues.md)

## Support

For issues not covered in this guide:

1. Check application logs: `pm2 logs containerstacks-api`
2. Review daemon logs: `sudo journalctl -u containerstacks-billing.service`
3. Consult the [GitHub Issues](https://github.com/yourusername/containerstacks/issues)
4. Contact support through the platform ticket system
