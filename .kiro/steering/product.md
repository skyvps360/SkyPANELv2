# Product Overview

ContainerStacks is an open-source cloud service reseller billing panel that enables service providers to resell cloud infrastructure from multiple providers (Linode, DigitalOcean, dedicated servers) with custom billing, markup pricing, and white-label branding.

## Core Features

- **Multi-Provider VPS Management**: Provision and manage VPS instances from Linode/Akamai and DigitalOcean
- **Container Orchestration**: Docker and Kubernetes integration for container management (WIP)
- **Billing & Wallet System**: PayPal-integrated prepaid wallet with automatic hourly billing
- **White-Label Branding**: Customizable platform name, theme colors, and branding via environment variables
- **Multi-Tenant Architecture**: Organization-based user management with role-based access control
- **Admin Panel**: Comprehensive platform configuration, user management, and provider settings
- **Support Ticketing**: Built-in ticket system with email notifications via SMTP2GO
- **Real-Time Monitoring**: CPU, network, I/O metrics from provider APIs
- **API Access**: RESTful API with client-generated API keys for programmatic access

## User Roles

- **Admin**: Full platform configuration, billing management, and user impersonation
- **Organization Admin**: Manage organization users, billing, and resources
- **Developer**: Deploy containers, manage applications, access logs
- **Collaborator**: Limited access to specific projects and resources

## Key Workflows

1. VPS provisioning from integrated cloud providers with custom markup pricing
2. Prepaid wallet funding via PayPal with automatic hourly resource billing
3. Real-time SSH console access and server management
4. Support ticket creation and management with email notifications
5. Activity logging for audit trails and compliance
