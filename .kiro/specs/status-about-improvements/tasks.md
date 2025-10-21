# Implementation Plan

- [x] 1. Create database migration for billing daemon status table

  - Create migration file `012_billing_daemon_status.sql` in `migrations/` directory
  - Define `billing_daemon_status` table with all required fields (daemon_instance_id, status, last_run_at, last_run_success, instances_billed, total_amount, total_hours, error_message, started_at, heartbeat_at, metadata, timestamps)
  - Add indexes on `heartbeat_at` and `daemon_instance_id` columns for query performance
  - _Requirements: 3.8, 4.5_

- [x] 2. Implement backend services for platform statistics

  - [x] 2.1 Create PlatformStatsService

    - Create `api/services/platformStatsService.ts`
    - Implement `getVPSStats()` method to aggregate VPS instance data by status and calculate total resources (vCPUs, memory, disk)
    - Implement `getPlatformStats()` method to aggregate all-time statistics (users, organizations, VPS, containers, tickets, plans, regions)
    - Implement in-memory caching with 5-minute TTL using simple object with timestamp validation
    - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [x] 2.2 Create DaemonStatusService

    - Create `api/services/daemonStatusService.ts`
    - Implement `getDaemonStatus()` to read daemon status from database
    - Implement `isDaemonActive()` to check if heartbeat is within 90 minutes
    - Implement `shouldRunBuiltInBilling()` to determine if built-in billing should run
    - Implement `checkDaemonHealth()` to calculate warning threshold status
    - _Requirements: 3.12, 4.1, 4.2, 4.3, 4.4, 4.5_

-

- [x] 3. Add new API endpoints to existing health routes

  - [x] 3.1 Implement GET /api/health/stats endpoint

    - Add endpoint to existing `api/routes/health.ts` file
    - Call PlatformStatsService.getVPSStats()
    - Return VPS infrastructure metrics with proper error handling
    - Add authentication middleware for detailed metrics
    - _Requirements: 1.1, 1.2, 1.3, 6.1, 6.4_

  - [x] 3.2 Implement GET /api/health/billing-daemon endpoint

    - Add endpoint to existing `api/routes/health.ts` file
    - Call DaemonStatusService.getDaemonStatus()
    - Return daemon status with warning threshold calculation
    - Add admin-only authentication middleware
    - _Requirements: 3.12, 4.1, 4.2, 4.3, 4.4, 6.2, 6.4_

  - [x] 3.3 Implement GET /api/health/platform-stats endpoint

    - Add endpoint to existing `api/routes/health.ts` file
    - Call PlatformStatsService.getPlatformStats()
    - Return all-time platform statistics
    - Allow public access with sanitized data
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 6.3, 6.5_

- [x] 4. Implement standalone billing daemon

  - [x] 4.1 Create daemon directory structure

    - Create `scripts/billing-daemon/` directory
    - Set up basic file structure (index.js, config.js, database.js, billing.js, status.js, logger.js)
    - _Requirements: 3.1_

  - [x] 4.2 Implement daemon configuration module

        - Create `scripts/billing-daemon/config.js`
        - Load environment variables (DATABASE_URL, BILLING_INTERVAL_MINUTES, LOG_L

    EVEL) - Implement OS detection using `os.platform()` with default to Ubuntu/Linux - Validate required configuration on startup - _Requirements: 3.2, 3.3, 3.4_

  - [x] 4.3 Implement daemon database module

    - Create `scripts/billing-daemon/database.js`
    - Set up PostgreSQL connection using pg library with connection pooling
    - Implement connection retry logic with exponential backoff
    - Create methods for status table operations (insert, update, read)
    - _Requirements: 3.4_

  - [x] 4.4 Implement daemon logger module

    - Create `scripts/billing-daemon/logger.js`
    - Set up logging with configurable log levels
    - Log to console/journal for systemd integration
    - _Requirements: 3.6_

  - [x] 4.5 Implement daemon status management

    - Create `scripts/billing-daemon/status.js`
    - Generate unique daemon instance ID (hostname + PID)
    - Implement heartbeat update function (updates every 60 seconds)
    - Implement status update function for billing run results
    - _Requirements: 3.8, 4.5_

  - [x] 4.6 Implement daemon billing module

    - Create `scripts/billing-daemon/billing.js`
    - Import and reuse BillingService.runHourlyBilling() from main application
    - Wrap billing execution with error handling and status updates
    - _Requirements: 3.5, 3.6, 3.7, 3.11_

  - [x] 4.7 Implement main daemon process

    - Create `scripts/billing-daemon/index.js`
    - Initialize configuration, database connection, and logger
    - Insert/update daemon status record on startup
    - Set up SIGTERM and SIGINT signal handlers for graceful shutdown
    - Start heartbeat timer (60-second interval)
    - Start billing interval timer (60-minute interval)
    - Implement graceful shutdown logic (complete current cycle, update status to 'stopped', close connections)
    - _Requirements: 3.1, 3.5, 3.6, 3.8, 3.9_

-

- [x] 5. Create systemd service configuration

  - Create `systemd/containerstacks-billing.service` file
  - Configure service to run as root user with working directory `/root/containerstacks`
  - Set up automatic restart on failure with 10-second delay
  - Configure to load environment from `/root/containerstacks/.env`
  - Add dependency on network and postgresql services
  - _Requirements: 3.1, 3.10_

- [x] 6. Implement built-in billing coordination

  - Update hourly billing scheduler in `api/server.ts`
  - Add check to DaemonStatusService.isDaemonActive() before running billing
  - Skip built-in billing if daemon is active (heartbeat within 90 minutes)
  - Log coordination decisions for debugging
  - _Requirements: 3.11, 3.13_

- [x] 7. Update Status page frontend

  - [x] 7.1 Remove networking section

    - Remove networking status card/section from `src/pages/Status.tsx`
    - Remove networking-related service from services array
    - Ensure no broken UI elements after removal
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 7.2 Create VPS Infrastructure status card

    - Create new component for VPS infrastructure metrics display
    - Fetch data from `/api/health/stats` using React Query with 30-second refetch interval
    - Display total VPS count, status breakdown (running, stopped, provisioning, error), and total resources
    - Show last updated timestamp
    - Implement loading skeleton and error states
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 7.3 Create Billing Daemon status card

    - Create new component for billing daemon status display
    - Fetch data from `/api/health/billing-daemon` using React Query with 30-second refetch interval
    - Display daemon status, last run timestamp, instances billed, and total amount
    - Show warning badge when `warningThresholdExceeded` is true (no run in 90+ minutes)
    - Display clear warning message: "Billing daemon has not run in over 90 minutes"
    - Implement loading skeleton and error states
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 7.4 Integrate new cards into Status page

    - Add VPS Infrastructure and Billing Daemon cards to Status page layout
    - Configure React Query to refetch on window focus

    - Ensure responsive design and consistent styling
    - _Requirements: 1.4, 1.5_

- [x] 8. Update About page frontend

  - Locate "At a Glance" section in `src/pages/AboutUs.tsx`
  - Fetch data from `/api/health/platform-stats` using React Query with 5-minute cache
  - Update labels to reflect all-time statistics: "Total Users", "Total Organizations", "Total VPS Deployed", "Total Containers", "Total Tickets Handled"
  - Display current availability: "Available VPS Plans", "Supported Regions"
  - Implement loading skeleton while fetching data
  - Handle error states with fallback message
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

- [x] 9. Apply database migration




  - Run migration script to create `billing_daemon_status` table

  - Verify table creation and indexes
-

- [x] 10. Create daemon installation documentation



  - Create documentation file in `docs/` directory for daemon installation
  - Document systemd service installation steps
  - Document how to start, stop, and check daemon status
  - Document troubleshooting steps for common issues
  - Include instructions for viewing daemon logs using journalctl
  - _Requirements: 3.1, 3.10_
