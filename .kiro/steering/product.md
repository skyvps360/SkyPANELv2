# Product Overview

SkyPanelV2 is an open-source cloud service reseller control plane with multi-provider support and white-label branding capabilities.

## Core Features

- **Multi-provider VPS management**: Linode (required) and DigitalOcean (optional) integration for instance provisioning, plan catalogs, and stackscript automation
- **Billing system**: PayPal-backed prepaid wallet system with hourly reconciliation, invoices, and transaction tracking
- **White-label branding**: Environment-driven company name, branding, and theme customization
- **Real-time notifications**: PostgreSQL LISTEN/NOTIFY with Server-Sent Events for activity, billing, and support updates
- **Support system**: Multi-tenant ticket management with chat features and staff replies
- **SSH console**: WebSocket-based SSH bridge for direct VPS terminal access
- **Activity logging**: Comprehensive audit trail across all user and system actions
- **Multi-tenant organizations**: Role-based access with owner/admin/member permissions

## User Roles

- **Admin**: Platform administrators with full system access
- **User**: Organization owners and members with scoped access to their resources

## Key Integrations

- PayPal REST SDK for payments
- Linode/Akamai API (required)
- DigitalOcean API (optional)
- SMTP2GO for email notifications
- Redis for rate limiting and queues
- Optional InfluxDB for metrics collection
