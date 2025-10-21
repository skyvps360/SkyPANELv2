# Complete Database Schema

## Overview

ContainerStacks uses PostgreSQL as its primary database with Row Level Security (RLS) for multi-tenant data isolation.

## Entity Relationship Diagram

```
┌──────────────┐       ┌─────────────────┐       ┌──────────────┐
│    users     │───────│ organizations   │───────│   wallets    │
└──────────────┘       └─────────────────┘       └──────────────┘
       │                       │                          │
       │                       │                          │
       ├───────────────────────┼──────────────────────────┤
       │                       │                          │
       ▼                       ▼                          ▼
┌──────────────┐       ┌─────────────────┐       ┌──────────────┐
│ vps_instances│       │   containers    │       │  invoices    │
└──────────────┘       └─────────────────┘       └──────────────┘
       │                       │                          │
       ▼                       ▼                          ▼
┌──────────────┐       ┌─────────────────┐       ┌──────────────┐
│  vps_plans   │       │ container_plans │       │ transactions │
└──────────────┘       └─────────────────┘       └──────────────┘
```

## Core Tables

### users
User accounts and authentication.

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  organization_id INTEGER REFERENCES organizations(id),
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);
```

**Indexes:**
- Primary key on `id`
- Unique index on `email`
- Index on `organization_id`
- Index on `role`

### organizations
Multi-tenant organization support.

```sql
CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### wallets
Prepaid wallet system for billing.

```sql
CREATE TABLE wallets (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER UNIQUE REFERENCES organizations(id),
  balance DECIMAL(10, 2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Constraints:**
- Balance must be non-negative
- One wallet per organization

## VPS & Container Management

### vps_plans
VPS service plans and pricing.

```sql
CREATE TABLE vps_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  linode_type VARCHAR(100),
  vcpus INTEGER,
  memory_mb INTEGER,
  disk_gb INTEGER,
  transfer_gb INTEGER,
  network_out_mbps INTEGER,
  base_cost DECIMAL(10, 4),
  markup_percentage DECIMAL(5, 2) DEFAULT 0,
  hourly_rate DECIMAL(10, 4),
  monthly_rate DECIMAL(10, 2),
  available_regions TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### vps_instances
Deployed VPS servers.

```sql
CREATE TABLE vps_instances (
  id SERIAL PRIMARY KEY,
  linode_id INTEGER,
  label VARCHAR(255),
  region VARCHAR(100),
  plan_id INTEGER REFERENCES vps_plans(id),
  organization_id INTEGER REFERENCES organizations(id),
  status VARCHAR(50),
  ipv4 VARCHAR(15),
  ipv6 VARCHAR(39),
  root_password VARCHAR(255),
  image VARCHAR(100),
  stackscript_id INTEGER,
  stackscript_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_billed_at TIMESTAMP
);
```

**Indexes:**
- Index on `organization_id` for RLS
- Index on `linode_id` for provider sync
- Index on `status` for filtering

### container_plans
Container service plans.

```sql
CREATE TABLE container_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  cpu_cores DECIMAL(3, 2),
  memory_mb INTEGER,
  disk_gb INTEGER,
  base_cost DECIMAL(10, 4),
  markup_percentage DECIMAL(5, 2) DEFAULT 0,
  hourly_rate DECIMAL(10, 4),
  monthly_rate DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### containers
Deployed containers.

```sql
CREATE TABLE containers (
  id SERIAL PRIMARY KEY,
  container_id VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  image VARCHAR(255),
  plan_id INTEGER REFERENCES container_plans(id),
  organization_id INTEGER REFERENCES organizations(id),
  status VARCHAR(50),
  ports JSONB,
  environment JSONB,
  volumes JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_billed_at TIMESTAMP
);
```

## Billing & Payments

### invoices
Billing records and invoices.

```sql
CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id),
  invoice_number VARCHAR(50) UNIQUE,
  amount DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'pending',
  billing_period_start TIMESTAMP,
  billing_period_end TIMESTAMP,
  line_items JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP
);
```

**Status Values:**
- `pending`: Awaiting payment
- `paid`: Successfully paid
- `failed`: Payment failed
- `cancelled`: Invoice cancelled

### transactions
Payment transaction history.

```sql
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id),
  amount DECIMAL(10, 2),
  type VARCHAR(50),
  status VARCHAR(50),
  payment_method VARCHAR(50),
  payment_id VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Transaction Types:**
- `deposit`: Wallet top-up
- `charge`: Resource billing
- `refund`: Payment refund
- `adjustment`: Manual adjustment

## Support System

### tickets
Support ticket system.

```sql
CREATE TABLE tickets (
  id SERIAL PRIMARY KEY,
  ticket_number VARCHAR(50) UNIQUE,
  subject VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'open',
  priority VARCHAR(50) DEFAULT 'medium',
  category VARCHAR(100),
  user_id INTEGER REFERENCES users(id),
  organization_id INTEGER REFERENCES organizations(id),
  assigned_to INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);
```

**Status Values:**
- `open`: New ticket
- `in_progress`: Being worked on
- `resolved`: Issue resolved
- `closed`: Ticket closed

**Priority Levels:**
- `low`: Non-urgent
- `medium`: Normal priority
- `high`: Important
- `urgent`: Critical issue

### ticket_messages
Ticket conversation history.

```sql
CREATE TABLE ticket_messages (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  attachments JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Activity & Notifications

### activity_logs
Audit trail for user actions.

```sql
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  organization_id INTEGER REFERENCES organizations(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(255),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- Index on `user_id`
- Index on `organization_id`
- Index on `created_at` for time-based queries
- Index on `action` for filtering

### notifications
User notifications.

```sql
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  organization_id INTEGER REFERENCES organizations(id),
  title VARCHAR(255) NOT NULL,
  message TEXT,
  type VARCHAR(50),
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP
);
```

**Notification Types:**
- `info`: General information
- `success`: Successful operation
- `warning`: Warning message
- `error`: Error or failure
- `billing`: Billing related
- `support`: Support ticket update

## Security & Configuration

### user_api_keys
API key management for programmatic access.

```sql
CREATE TABLE user_api_keys (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  organization_id INTEGER REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### password_reset_tokens
Password reset token tracking.

```sql
CREATE TABLE password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### theme_settings
Custom theme configurations.

```sql
CREATE TABLE theme_settings (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  colors JSONB NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Provider Configuration

### provider_configs
Cloud provider API configurations.

```sql
CREATE TABLE provider_configs (
  id SERIAL PRIMARY KEY,
  provider_name VARCHAR(50) NOT NULL,
  api_endpoint VARCHAR(255),
  credentials JSONB,
  settings JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### stackscript_configs
StackScript deployment configurations.

```sql
CREATE TABLE stackscript_configs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  script_id INTEGER,
  script_data JSONB,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### networking_config
Network and IP address management.

```sql
CREATE TABLE networking_config (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Row Level Security (RLS)

RLS policies ensure users can only access data belonging to their organization.

### Example RLS Policy for vps_instances

```sql
-- Enable RLS
ALTER TABLE vps_instances ENABLE ROW LEVEL SECURITY;

-- Policy for regular users
CREATE POLICY vps_instances_user_policy ON vps_instances
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id')::INTEGER);

-- Policy for admins (see all)
CREATE POLICY vps_instances_admin_policy ON vps_instances
  FOR ALL
  USING (current_setting('app.current_user_role') = 'admin');
```

Similar policies are applied to:
- `containers`
- `invoices`
- `transactions`
- `tickets`
- `activity_logs`
- `notifications`

## Indexes

Key indexes for performance:

```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_org ON users(organization_id);

-- Resource queries
CREATE INDEX idx_vps_org ON vps_instances(organization_id);
CREATE INDEX idx_vps_linode ON vps_instances(linode_id);
CREATE INDEX idx_containers_org ON containers(organization_id);

-- Billing queries
CREATE INDEX idx_invoices_org ON invoices(organization_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_transactions_org ON transactions(organization_id);

-- Activity logs
CREATE INDEX idx_activity_user ON activity_logs(user_id);
CREATE INDEX idx_activity_org ON activity_logs(organization_id);
CREATE INDEX idx_activity_time ON activity_logs(created_at DESC);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);
```

## Data Types

### JSONB Columns

JSONB is used for flexible, semi-structured data:

- **stackscript_data**: StackScript variables
- **ports**: Container port mappings
- **environment**: Container environment variables
- **volumes**: Container volume mounts
- **line_items**: Invoice line items
- **metadata**: Transaction metadata
- **details**: Activity log details
- **colors**: Theme color configurations
- **credentials**: Encrypted provider credentials

### Timestamps

All tables include:
- `created_at`: Record creation time
- `updated_at`: Last modification time (updated via trigger)

## Database Triggers

### Update Timestamp Trigger

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Backup & Maintenance

### Recommended Backup Strategy

1. **Daily full backups** of entire database
2. **Hourly incremental backups** for critical tables
3. **Point-in-time recovery** enabled
4. **30-day retention** minimum

### Maintenance Tasks

- **VACUUM ANALYZE**: Weekly on all tables
- **REINDEX**: Monthly on heavily updated tables
- **Partition pruning**: For activity_logs if using partitioning
- **Archival**: Move old invoices/transactions to archive tables

---

**Next**: [API Design](./api-design.md) | [Security](./security.md)
