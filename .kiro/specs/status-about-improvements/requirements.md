# Requirements Document

## Introduction

This specification addresses improvements to the `/status` and `/about` pages to display real platform data, and the creation of a standalone billing daemon that operates independently of the main application to ensure continuous billing even during application downtime.

## Glossary

- **Platform**: The ContainerStacks application system
- **Status Page**: The `/status` route displaying system health and metrics
- **About Page**: The `/about` route displaying platform information
- **Billing Daemon**: A standalone background process that performs hourly billing operations
- **VPS Instance**: A virtual private server deployed through the platform
- **BillingService**: The existing service class in `api/services/billingService.ts`
- **System Daemon**: An OS-level service that runs independently of the main application

## Requirements

### Requirement 1: Status Page VPS Infrastructure Metrics

**User Story:** As a platform administrator, I want to see accurate VPS infrastructure statistics on the status page, so that I can monitor the current state of deployed resources.

#### Acceptance Criteria

1. WHEN THE Status_Page loads, THE Platform SHALL retrieve the total count of active VPS instances from the database
2. WHEN THE Status_Page loads, THE Platform SHALL display the count of VPS instances grouped by status (running, stopped, provisioning, error)
3. WHEN THE Status_Page loads, THE Platform SHALL calculate and display total allocated resources (vCPUs, memory, disk) across all VPS instances
4. WHEN a VPS instance status changes, THE Platform SHALL reflect the updated count within 30 seconds on the Status_Page
5. WHERE real-time updates are enabled, THE Platform SHALL use polling or WebSocket connections to update VPS metrics without page refresh

### Requirement 2: Remove Networking Section from Status Page

**User Story:** As a platform administrator, I want the incorrect networking section removed from the status page, so that only accurate information is displayed.

#### Acceptance Criteria

1. THE Platform SHALL remove all networking-related status indicators from the Status_Page
2. THE Platform SHALL remove any API endpoints that serve networking status data to the Status_Page
3. THE Platform SHALL ensure no broken UI elements remain after networking section removal

### Requirement 3: Standalone Billing Daemon

**User Story:** As a platform operator, I want a standalone billing daemon that runs independently of the main application, so that billing continues even when the application is down.

#### Acceptance Criteria

1. THE Platform SHALL provide a standalone billing daemon script that can run as an OS service
2. WHEN the daemon starts, THE Billing_Daemon SHALL detect the operating system (Linux, Windows, macOS)
3. WHERE the OS is not detected, THE Billing_Daemon SHALL default to Ubuntu/Linux configuration
4. THE Billing_Daemon SHALL connect to the PostgreSQL database using environment variables
5. THE Billing_Daemon SHALL execute the hourly billing process every 60 minutes
6. WHEN billing execution fails, THE Billing_Daemon SHALL log errors and retry on the next cycle
7. THE Billing_Daemon SHALL use the same billing logic as BillingService.runHourlyBilling()
8. THE Billing_Daemon SHALL create a status file indicating last successful run timestamp
9. THE Billing_Daemon SHALL support graceful shutdown on SIGTERM and SIGINT signals
10. WHERE systemd is available, THE Platform SHALL provide a systemd service unit file for the daemon
11. The new Billing_Daemon SHALL be compatible with the existing BillingService class thats already in use
12. THE Platform SHALL provide a GET /api/health/billing-daemon endpoint that returns the billing daemon status
13. The new Billing_Daemon SHALL be written so if it is running our built in hourly billing function within our containerstacks application will be paused in favour of the new Billing_Daemon and if the Billing_Daemon is not active we fall back to our built in hourly billing system.

### Requirement 4: Billing Daemon Status Display

**User Story:** As a platform administrator, I want to see the billing daemon status on the status page, so that I can verify billing operations are running correctly.

#### Acceptance Criteria

1. WHEN THE Status_Page loads, THE Platform SHALL display the billing daemon status (running, stopped, error)
2. WHEN THE Status_Page loads, THE Platform SHALL display the timestamp of the last successful billing run
3. WHEN THE Status_Page loads, THE Platform SHALL display the number of instances billed in the last run
4. WHEN the billing daemon has not run in over 90 minutes, THE Platform SHALL display a warning indicator
5. THE Platform SHALL read daemon status from a status file or database table updated by the daemon

### Requirement 5: About Page Real Platform Data

**User Story:** As a platform visitor, I want to see accurate "At a Glance" statistics on the about page, so that I understand the platform's actual scale and capabilities.

#### Acceptance Criteria

1. WHEN THE About_Page loads, THE Platform SHALL display the total number of registered users (all-time)
2. WHEN THE About_Page loads, THE Platform SHALL display the total number of organizations (all-time)
3. WHEN THE About_Page loads, THE Platform SHALL display the total number of deployed VPS instances (all-time)
4. WHEN THE About_Page loads, THE Platform SHALL display the total number of deployed containers (all-time)
5. WHEN THE About_Page loads, THE Platform SHALL display the total number of support tickets (all-time)
6. WHEN THE About_Page loads, THE Platform SHALL display the total number of available VPS plans
7. WHEN THE About_Page loads, THE Platform SHALL display the total number of available regions
8. THE Platform SHALL cache these statistics for 5 minutes to reduce database load

### Requirement 6: API Endpoints for Real Platform Statistics

**User Story:** As a frontend developer, I want API endpoints that provide real platform statistics, so that I can display accurate data on status and about pages.

#### Acceptance Criteria

1. THE Platform SHALL provide a GET /api/health/stats endpoint that returns VPS infrastructure metrics
2. THE Platform SHALL provide a GET /api/health/billing-daemon endpoint that returns billing daemon status
3. THE Platform SHALL provide a GET /api/health/platform-stats endpoint that returns platform-wide statistics
4. WHEN an authenticated admin requests these endpoints, THE Platform SHALL return detailed metrics
5. WHEN an unauthenticated user requests platform-stats, THE Platform SHALL return public-safe aggregated data
6. THE Platform SHALL implement rate limiting on these endpoints to prevent abuse
