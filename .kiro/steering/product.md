# Product Overview

ContainerStacks is an open-source cloud service reseller billing panel that enables service providers to resell VPS and container infrastructure from multiple cloud providers (Linode, DigitalOcean, dedicated servers) with custom markup pricing and white-label branding.

## Core Value Proposition

- Multi-provider VPS reselling with custom markup pricing
- PayPal-integrated prepaid wallet system with automatic hourly billing
- White-label branding via `COMPANY-NAME` or `VITE_COMPANY_NAME` environment variable
- Multi-tenant organization system with role-based access control
- Real-time monitoring, backup management, and support ticketing

## User Roles

- **Service Provider Admin**: Full platform configuration and billing management
- **Organization Admin**: Manage organization users, billing, and resources
- **Developer**: Deploy containers, manage applications, access logs
- **Collaborator**: Limited access to specific projects and resources

## Key Features

- VPS provisioning and management via provider APIs (Linode, DigitalOcean)
- Container deployment and orchestration
- Automated hourly billing with wallet system
- Real-time metrics (CPU, network, I/O) from provider APIs
- Backup/snapshot management and restoration
- Support ticket system with email notifications
- RESTful API with client-generated API keys
- SSH console access via WebSocket bridge
