# ContainerStacks Billing Daemon

A standalone billing daemon that runs independently of the main ContainerStacks application to ensure continuous billing even during application downtime.

## Features

- **Independent Operation**: Runs as a separate process from the main application
- **Automatic Failover**: Built-in billing resumes if daemon stops
- **Heartbeat Monitoring**: Updates status every 60 seconds
- **Graceful Shutdown**: Completes current billing cycle before stopping
- **Error Recovery**: Continues operation even if individual billing runs fail
- **OS Detection**: Automatically detects and adapts to Linux, Windows, or macOS

## Architecture

The daemon consists of six modules:

- **index.js**: Main entry point and process orchestration
- **config.js**: Configuration loading and OS detection
- **database.js**: PostgreSQL connection with retry logic
- **logger.js**: Configurable logging with systemd integration
- **status.js**: Daemon status management and heartbeat
- **billing.js**: Billing execution wrapper

## Requirements

- Node.js 20+
- npm/npx (for tsx execution)
- PostgreSQL database with `billing_daemon_status` table
- Environment variables configured (see Configuration)

**Note**: This daemon imports TypeScript files from the main application and requires `tsx` for execution.

## Configuration

The daemon uses environment variables from your `.env` file:

```bash
# Required
DATABASE_URL=postgresql://user:password@host:port/database

# Optional
BILLING_INTERVAL_MINUTES=60  # Default: 60 minutes
LOG_LEVEL=info               # Options: error, warn, info, debug
```

## Running the Daemon

### Manual Execution

```bash
# From the project root
npx tsx scripts/billing-daemon/index.js
```

### As a systemd Service (Linux)

#### Production Installation (Recommended)

For production environments, use the secure service configuration:

```bash
# 1. Create a dedicated user for security
sudo useradd -r -s /bin/false -d /opt/containerstacks containerstacks

# 2. Set up the application directory
sudo mkdir -p /opt/containerstacks
sudo cp -r . /opt/containerstacks/
sudo chown -R containerstacks:containerstacks /opt/containerstacks
sudo chmod 600 /opt/containerstacks/.env

# 3. Install and start the service
sudo cp systemd/containerstacks-billing.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable containerstacks-billing
sudo systemctl start containerstacks-billing
```

#### Development/Testing Installation

For development or testing environments where you want to run as root:

```bash
# 1. Copy the development service file
sudo cp systemd/containerstacks-billing-dev.service /etc/systemd/system/containerstacks-billing.service

# 2. Install and start the service
sudo systemctl daemon-reload
sudo systemctl enable containerstacks-billing
sudo systemctl start containerstacks-billing
```

**Note**: The systemd service file has been updated to use `npx tsx` instead of `node` to properly handle TypeScript imports. If you're updating from an older version, make sure to copy the updated service file and reload systemd.

#### Service Management

```bash
# Check service status
sudo systemctl status containerstacks-billing

# View logs
sudo journalctl -u containerstacks-billing -f

# Stop the service
sudo systemctl stop containerstacks-billing

# Restart the service
sudo systemctl restart containerstacks-billing
```

### Stopping the Daemon

The daemon handles graceful shutdown on:
- `SIGTERM` (systemd stop, kill command)
- `SIGINT` (Ctrl+C)

It will:
1. Stop accepting new billing cycles
2. Complete any in-progress billing
3. Update status to 'stopped' in database
4. Close all database connections
5. Exit cleanly

## Monitoring

The daemon updates its status in the `billing_daemon_status` table:

- **heartbeat_at**: Updated every 60 seconds (daemon is alive)
- **last_run_at**: Timestamp of last billing execution
- **last_run_success**: Whether last billing completed successfully
- **instances_billed**: Number of VPS instances billed in last run
- **total_amount**: Total amount charged in last run
- **status**: Current daemon status (running, stopped, error)

## Coordination with Built-In Billing

The main application checks the daemon's heartbeat before running its built-in billing:

- If daemon heartbeat is within 90 minutes: Built-in billing is paused
- If daemon heartbeat exceeds 90 minutes: Built-in billing resumes automatically

This ensures no duplicate charges while providing automatic failover.

## Logging

Logs are written to stdout/stderr with timestamps and log levels:

```
[2025-01-15T10:30:00.000Z] [INFO] 🚀 ContainerStacks Billing Daemon Starting...
[2025-01-15T10:30:01.000Z] [INFO] ✅ Database connection established successfully
[2025-01-15T10:30:02.000Z] [INFO] 🎉 Billing daemon is now running
```

For systemd services, logs are captured by journald and can be viewed with:

```bash
journalctl -u containerstacks-billing -f
```

## Troubleshooting

### Daemon won't start

1. Check DATABASE_URL is correct
2. Verify database is accessible
3. Ensure `billing_daemon_status` table exists (run migration 012)
4. Check logs for specific error messages

### Billing not running

1. Check daemon status in database: `SELECT * FROM billing_daemon_status;`
2. Verify heartbeat_at is recent (within last 2 minutes)
3. Check logs for billing errors
4. Verify VPS instances exist and need billing

### Multiple daemons running

Each daemon instance has a unique ID (hostname-PID). Only one daemon should run per environment. Check:

```sql
SELECT daemon_instance_id, status, heartbeat_at 
FROM billing_daemon_status 
WHERE heartbeat_at > NOW() - INTERVAL '5 minutes';
```

## Development

To test the daemon locally:

1. Ensure your `.env` file is configured
2. Run the migration to create the status table
3. Start the daemon: `npx tsx scripts/billing-daemon/index.js`
4. Monitor logs and database status
5. Stop with Ctrl+C to test graceful shutdown

## Security Considerations

- Run daemon as dedicated system user with minimal privileges
- Protect `.env` file with restricted permissions (600)
- Use SSL for database connections in production
- Monitor daemon status and set up alerts for failures
