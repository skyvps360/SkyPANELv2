# Requirements Document

## Introduction

This feature adds VPS uptime tracking information to the billing page, displaying the total hours each VPS server has been active under the user's account. In ContainerStacks, users are charged hourly for VPS instances regardless of their operational state (running, stopped, etc.) - billing only stops when a VPS is permanently deleted. This feature will provide transparency by showing users exactly how many hours they've been billed for each VPS instance.

## Glossary

- **VPS Instance**: A Virtual Private Server provisioned through ContainerStacks from cloud providers (Linode, DigitalOcean)
- **Billing System**: The automated hourly billing service that charges users for VPS resources
- **Active Hours**: The total number of hours a VPS has existed in the user's account, regardless of its operational state
- **Organization**: A tenant entity in the multi-tenant system that owns VPS instances and has a wallet for billing
- **Billing Page**: The frontend page at `/billing` that displays wallet balance, transactions, and payment history
- **Billing Cycle**: A record in the database tracking a specific billing period for a VPS instance

## Requirements

### Requirement 1

**User Story:** As a user, I want to see the total active hours for each of my VPS instances on the billing page, so that I can understand how long I've been charged for each server.

#### Acceptance Criteria

1. WHEN THE Billing System displays VPS billing information, THE Billing Page SHALL show the total active hours for each VPS instance
2. THE Billing System SHALL calculate active hours as the time elapsed between the VPS creation timestamp and the current timestamp
3. THE Billing Page SHALL display active hours in a human-readable format with hours and decimal precision
4. WHERE a VPS instance has been deleted, THE Billing System SHALL calculate active hours from creation to deletion timestamp
5. THE Billing Page SHALL group VPS uptime information in a dedicated section within the billing overview

### Requirement 2

**User Story:** As a user, I want to see the total hours across all my VPS instances, so that I can understand my overall resource usage.

#### Acceptance Criteria

1. THE Billing Page SHALL display an aggregate total of active hours across all VPS instances for the organization
2. THE Billing System SHALL sum the active hours from all VPS instances owned by the user's organization
3. THE Billing Page SHALL update the total active hours calculation when the page loads
4. THE Billing Page SHALL display the aggregate hours in a summary card alongside other billing metrics
5. WHERE an organization has zero VPS instances, THE Billing Page SHALL display zero total active hours

### Requirement 3

**User Story:** As a user, I want to see how the active hours relate to my billing charges, so that I can verify the accuracy of my charges.

#### Acceptance Criteria

1. THE Billing Page SHALL display the hourly rate for each VPS instance alongside its active hours
2. THE Billing System SHALL calculate the estimated total cost by multiplying active hours by the hourly rate
3. THE Billing Page SHALL show both the active hours and the corresponding cost for each VPS instance
4. THE Billing Page SHALL display a breakdown showing VPS label, active hours, hourly rate, and total cost
5. WHERE billing cycles exist in the database, THE Billing System SHALL use actual billed hours from billing cycle records

### Requirement 4

**User Story:** As a user, I want the VPS uptime information to be accurate and up-to-date, so that I can trust the billing information displayed.

#### Acceptance Criteria

1. THE Billing System SHALL retrieve VPS instance data from the database including creation timestamps
2. THE Billing System SHALL calculate active hours using the current server timestamp for precision
3. WHERE a VPS has a last_billed_at timestamp, THE Billing System SHALL include unbilled hours in the active hours calculation
4. THE Billing Page SHALL fetch fresh VPS uptime data when the billing page loads
5. THE Billing System SHALL handle timezone conversions correctly to ensure accurate hour calculations

### Requirement 5

**User Story:** As a user, I want to export VPS uptime data along with my billing information, so that I can maintain records for accounting purposes.

#### Acceptance Criteria

1. THE Billing Page SHALL include VPS uptime data in the CSV export functionality
2. WHEN THE User clicks the export button, THE Billing System SHALL generate a CSV file containing VPS labels, active hours, hourly rates, and total costs
3. THE Billing System SHALL format the exported data with appropriate column headers
4. THE Billing Page SHALL provide a download link for the generated CSV file
5. THE Billing System SHALL include a timestamp in the exported filename for record-keeping
