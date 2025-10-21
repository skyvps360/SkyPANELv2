# Design Document

## Overview

This design implements three major improvements to the ContainerStacks platform:

1. Real VPS infrastructure metrics on the `/status` page
2. A standalone billing daemon that operates independently of the main application
3. Real platform statistics on the `/about` page

The design ensures billing continuity through a separate daemon process, provides accurate system monitoring, and displays meaningful platform metrics to users.

**Key Design Decisions:**

- **Daemon-First Billing**: The standalone daemon takes priority over the built-in billing scheduler. When the daemon is active, the application's internal billing is paused to prevent duplicate charges.
- **Database-Based Coordination**: A `billing_daemon_status` table serves as the coordination mechanism between the daemon and the application, using heartbeat timestamps to determine daemon health.
- **Real-Time Updates**: The status page uses 30-second polling intervals to meet the requirement for near real-time VPS metric updates.
- **All-Time Statistics**: The about page displays cumulative all-time statistics rather than current active counts to showcase platform growth and scale.

## Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  ┌──────────────┐              ┌──────────────┐            │
│  │ Status Page  │              │  About Page  │            │
│  └──────┬───────┘              └──────┬───────┘            │
└─────────┼──────────────────────────────┼──────────────────┘
          │                              │
          │ API Calls                    │ API Calls
          │                              │
┌─────────▼──────────────────────────────▼──────────────────┐
│                  Backend API (Express)                      │
│  ┌────────────────────────────────────────────────────┐   │
│  │           New API Routes                            │   │
│  │  • GET /api/health/stats                           │   │
│  │  • GET /api/health/billing-daemon                  │   │
│  │  • GET /api/health/platform-stats                  │   │
│  └────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────┐   │
│  │           New Services                              │   │
│  │  • PlatformStatsService                            │   │
│  │  • DaemonStatusService                             │   │
│  └────────────────────────────────────────────────────┘   │
└────────────────────────────────┬───────────────────────────┘
                                 │
                                 │ Database Access
                                 │
┌────────────────────────────────▼───────────────────────────┐
│                    PostgreSQL Database                      │
│  • vps_instances                                           │
│  • users, organizations                                    │
│  • containers                                              │
│  • billing_daemon_status (new table)                      │
└────────────────────────────────────────────────────────────┘
                                 ▲
                                 │ Direct DB Access
                                 │
┌────────────────────────────────┴───────────────────────────┐
│              Standalone Billing Daemon                      │
│  • Runs as systemd service (Linux)                         │
│  • Runs as Windows Service (Windows)                       │
│  • Executes hourly billing independently                   │
│  • Updates daemon status table with heartbeat              │
│  • Takes priority over built-in billing                    │
└────────────────────────────────────────────────────────────┘

                    Coordination Flow
┌────────────────────────────────────────────────────────────┐
│  Built-In Billing Scheduler (api/server.ts)               │
│  1. Check daemon heartbeat in database                     │
│  2. If heartbeat < 90 min ago: Skip billing (daemon active)│
│  3. If heartbeat > 90 min ago: Run billing (daemon down)  │
└────────────────────────────────────────────────────────────┘
```


## Components and Interfaces

### 1. Backend API Routes

#### `/api/health/stats` (New)
Returns VPS infrastructure statistics.

**Response:**
```typescript
{
  vps: {
    total: number;
    byStatus: {
      running: number;
      stopped: number;
      provisioning: number;
      rebooting: number;
      error: number;
    };
    resources: {
      totalVCPUs: number;
      totalMemoryGB: number;
      totalDiskGB: number;
    };
  };
  lastUpdated: string;
}
```

#### `/api/health/billing-daemon` (New)

Returns billing daemon status.

**Response:**

```typescript
{
  status: 'running' | 'stopped' | 'error' | 'unknown';
  lastRun: string | null;
  lastRunSuccess: boolean;
  instancesBilled: number;
  totalAmount: number;
  nextScheduledRun: string | null;
  uptimeMinutes: number | null;
  isStale: boolean; // true if last heartbeat > 90 minutes ago
  warningThresholdExceeded: boolean; // true if no run in 90+ minutes
}
```

#### `/api/health/platform-stats` (New)

Returns platform-wide statistics for the about page.

**Response:**

```typescript
{
  users: {
    total: number; // All-time total registered users
    admins: number;
    regular: number;
  };
  organizations: {
    total: number; // All-time total organizations
  };
  vps: {
    total: number; // All-time total VPS instances ever created
    active: number; // Currently active VPS instances
  };
  containers: {
    total: number; // All-time total containers ever created
  };
  support: {
    totalTickets: number; // All-time total support tickets
    openTickets: number;
  };
  plans: {
    vpsPlans: number; // Currently available VPS plans
    containerPlans: number;
  };
  regions: {
    total: number; // Currently available regions
  };
  cacheExpiry: string;
}
```

**Note:** Statistics represent all-time cumulative totals to showcase platform growth and scale, except for plans and regions which show current availability.


### 2. Backend Services

#### PlatformStatsService (New)
Located at `api/services/platformStatsService.ts`

**Methods:**
- `getVPSStats()`: Aggregates VPS instance data
- `getPlatformStats()`: Aggregates all platform statistics
- `getCachedStats()`: Returns cached statistics (5-minute TTL)

**Caching Strategy:**
- Use in-memory cache with 5-minute expiration
- Invalidate cache on significant events (VPS creation/deletion)

#### DaemonStatusService (New)

Located at `api/services/daemonStatusService.ts`

**Methods:**

- `getDaemonStatus()`: Reads daemon status from database
- `checkDaemonHealth()`: Determines if daemon is healthy based on last run time
- `getDaemonMetrics()`: Returns billing metrics from last run
- `isDaemonActive()`: Returns true if daemon heartbeat is within 90 minutes
- `shouldRunBuiltInBilling()`: Returns true if daemon is inactive and built-in billing should run

**Coordination Logic:**

The service implements the coordination mechanism between the daemon and built-in billing:

- If daemon heartbeat is within 90 minutes: daemon is considered active
- If daemon is active: built-in billing scheduler is paused
- If daemon is inactive (no heartbeat for 90+ minutes): built-in billing resumes automatically

### 3. Standalone Billing Daemon

#### File Structure
```
scripts/
  billing-daemon/
    index.js              # Main daemon entry point
    config.js             # Configuration and environment
    database.js           # Database connection
    billing.js            # Billing logic (reuses BillingService)
    status.js             # Status file management
    logger.js             # Logging utilities
    
systemd/
  containerstacks-billing.service   # systemd unit file
  
windows/
  install-service.ps1   # Windows service installer
  containerstacks-billing.xml       # Windows service config
```

#### Daemon Architecture

**Main Process Flow:**

1. Load configuration from environment variables
2. Detect operating system
3. Connect to PostgreSQL database
4. Generate unique daemon instance ID (hostname + PID)
5. Insert/update daemon status record in database
6. Set up signal handlers (SIGTERM, SIGINT)
7. Start heartbeat timer (updates every 60 seconds)
8. Start hourly billing interval timer
9. On each billing interval:
   - Execute billing logic using BillingService.runHourlyBilling()
   - Update status in database with results
   - Log results
10. On shutdown signal:
    - Complete current billing cycle if in progress
    - Update status to 'stopped' in database
    - Close database connections
    - Exit gracefully

**Heartbeat Mechanism:**

- Every 60 seconds, update `heartbeat_at` timestamp in database
- This allows the application to detect if daemon is still running
- If heartbeat stops for 90+ minutes, application assumes daemon is down and resumes built-in billing

**Configuration (Environment Variables):**
```bash
DATABASE_URL=postgresql://...
BILLING_INTERVAL_MINUTES=60
LOG_LEVEL=info
STATUS_FILE_PATH=/var/run/containerstacks-billing.status
```


## Data Models

### New Database Table: `billing_daemon_status`

```sql
CREATE TABLE IF NOT EXISTS billing_daemon_status (
  id SERIAL PRIMARY KEY,
  daemon_instance_id VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL, -- 'running', 'stopped', 'error'
  last_run_at TIMESTAMP WITH TIME ZONE,
  last_run_success BOOLEAN,
  instances_billed INTEGER DEFAULT 0,
  total_amount DECIMAL(10, 2) DEFAULT 0,
  total_hours DECIMAL(10, 2) DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  heartbeat_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_billing_daemon_status_heartbeat 
  ON billing_daemon_status(heartbeat_at);
CREATE INDEX idx_billing_daemon_status_instance 
  ON billing_daemon_status(daemon_instance_id);
```

**Fields Explanation:**
- `daemon_instance_id`: Unique identifier for daemon instance (hostname + PID)
- `status`: Current daemon status
- `last_run_at`: Timestamp of last billing execution
- `last_run_success`: Whether last run completed successfully
- `instances_billed`: Number of VPS instances billed in last run
- `total_amount`: Total amount charged in last run
- `heartbeat_at`: Last heartbeat timestamp (updated every minute)
- `metadata`: Additional daemon information (OS, version, etc.)

### Existing Tables (No Changes Required)
- `vps_instances`: Already contains status and billing information
- `users`: Contains user count data
- `organizations`: Contains organization data
- `containers`: Contains container data
- `tickets`: Contains support ticket data


## Error Handling

### API Error Responses
- **500 Internal Server Error**: Database connection failures
- **503 Service Unavailable**: When statistics cannot be computed
- **429 Too Many Requests**: Rate limiting exceeded

### Daemon Error Handling
1. **Database Connection Failures**:
   - Retry connection with exponential backoff
   - Log error and continue to next cycle
   - Update status to 'error' in database when possible

2. **Billing Execution Failures**:
   - Log detailed error information
   - Mark run as failed in status table
   - Continue to next scheduled run
   - Send alert if failures exceed threshold (3 consecutive)

3. **Graceful Shutdown**:
   - On SIGTERM/SIGINT, complete current billing cycle
   - Update status to 'stopped'
   - Close all database connections
   - Exit with code 0

### Frontend Error Handling
- Display "Data unavailable" message when API calls fail
- Show last successful update timestamp
- Provide retry button for manual refresh


## Testing Strategy

### Unit Tests
1. **PlatformStatsService**:
   - Test VPS statistics aggregation
   - Test caching mechanism
   - Test cache invalidation

2. **DaemonStatusService**:
   - Test status retrieval
   - Test health check logic
   - Test stale daemon detection

3. **Billing Daemon**:
   - Test OS detection logic
   - Test configuration loading
   - Test billing execution
   - Test status updates
   - Test signal handling

### Integration Tests
1. **API Endpoints**:
   - Test `/api/health/stats` with various VPS states
   - Test `/api/health/billing-daemon` with different daemon states
   - Test `/api/health/platform-stats` with real data

2. **Daemon Integration**:
   - Test daemon startup and shutdown
   - Test billing execution with test VPS instances
   - Test database status updates
   - Test heartbeat mechanism

### Manual Testing
1. Start daemon as systemd service
2. Verify status appears on `/status` page
3. Stop daemon and verify warning appears
4. Verify VPS counts match database
5. Verify about page statistics are accurate


## Implementation Notes

### OS Detection Strategy
The daemon will detect the operating system using Node.js `os.platform()`:
- `linux`: Use systemd service
- `win32`: Use Windows Service
- `darwin`: Use launchd (macOS)
- Default: Assume Ubuntu/Linux behavior

### Billing Logic Reuse

The daemon will import and reuse the existing `BillingService.runHourlyBilling()` method to ensure consistency between daemon and application billing.

### Built-In Billing Coordination

**Design Decision:** To prevent duplicate billing charges, the application's built-in billing scheduler must coordinate with the daemon.

**Implementation:**

Located in `api/server.ts` where the hourly billing cron job is configured:

```typescript
// Before executing billing
const daemonStatus = await DaemonStatusService.isDaemonActive();
if (daemonStatus) {
  logger.info('Billing daemon is active, skipping built-in billing');
  return;
}

// Proceed with built-in billing
await BillingService.runHourlyBilling();
```

**Rationale:** This approach ensures:

- No code duplication - both use the same billing logic
- Automatic failover - if daemon stops, built-in billing resumes
- No configuration required - coordination happens automatically via database
- No race conditions - daemon heartbeat provides clear active/inactive signal

### Systemd Service Configuration

```ini
[Unit]
Description=ContainerStacks Billing Daemon
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/root/containerstacks
ExecStart=/usr/bin/node /root/containerstacks/scripts/billing-daemon/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment="NODE_ENV=production"
EnvironmentFile=/root/containerstacks/.env

[Install]
WantedBy=multi-user.target
```

**Note:** This configuration assumes the repository is located at `/root/containerstacks` (which is `~/containerstacks` for root user). The `EnvironmentFile` points to your existing `.env` file to reuse database credentials.

### Networking Section Removal

**Requirement:** Remove all networking-related status indicators from the status page as they display incorrect information.

**Implementation:**

- Remove networking status card/section from `src/pages/Status.tsx`
- Remove any API endpoints that serve networking status data (if they exist)
- Ensure no broken UI elements or layout issues after removal
- Update any related components or utilities that reference networking status

### Status Page Updates

Remove the networking section from `src/pages/Status.tsx` and replace with:

1. VPS Infrastructure card showing real metrics
2. Billing Daemon card showing daemon status

**Real-Time Update Strategy:**

- Use React Query with 30-second refetch interval to meet the requirement for updates within 30 seconds of VPS status changes
- Implement automatic background refetching when window regains focus
- Display last updated timestamp to users
- Show loading states during data refresh

**Billing Daemon Warning Display:**

- When `warningThresholdExceeded` is true (no run in 90+ minutes), display warning badge
- Show clear messaging: "Billing daemon has not run in over 90 minutes"
- Provide troubleshooting link or instructions for administrators

### About Page Updates

Update `src/pages/AboutUs.tsx` "At a Glance" section to fetch and display real statistics from `/api/health/platform-stats`.

**Display Strategy:**

- Show all-time cumulative statistics to demonstrate platform growth
- Use appropriate labels: "Total Users", "Total VPS Deployed", "Total Tickets Handled"
- Display current availability for plans and regions: "Available VPS Plans", "Supported Regions"
- Cache data on frontend for 5 minutes to reduce unnecessary API calls
- Show loading skeleton while fetching data

### Caching Strategy
- Cache platform statistics for 5 minutes in memory
- Use simple object with timestamp for cache validation
- Clear cache on server restart
- Consider Redis for multi-instance deployments (future enhancement)


## Security Considerations

### API Endpoint Security
- `/api/health/stats`: Require authentication for detailed metrics
- `/api/health/billing-daemon`: Admin-only access
- `/api/health/platform-stats`: Public access with sanitized data (no sensitive info)
- Apply rate limiting to prevent abuse

### Daemon Security
- Run daemon as dedicated system user with minimal privileges
- Store database credentials in environment file with restricted permissions (600)
- Use read-only database user for status queries where possible
- Validate all environment variables on startup

### Database Security
- Use parameterized queries to prevent SQL injection
- Limit daemon database user permissions to only required tables
- Encrypt database connection with SSL in production

## Performance Considerations

### Database Query Optimization
- Add indexes on frequently queried columns (status, created_at)
- Use COUNT queries with WHERE clauses for efficiency
- Implement query result caching for expensive aggregations

### Frontend Performance

- Implement polling with 30-second intervals for status page (meets requirement 1.4)
- Use React Query for automatic caching and background updates
- Show loading skeletons during data fetch
- Implement stale-while-revalidate pattern to show cached data while fetching updates

### Daemon Performance
- Use connection pooling for database access
- Batch billing operations where possible
- Implement timeout for billing operations (max 5 minutes)
- Monitor memory usage and implement cleanup

