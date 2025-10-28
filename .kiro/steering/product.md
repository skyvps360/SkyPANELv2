---
inclusion: always
---

# Product Overview

SkyPanelV2 is an open-source cloud service reseller control panel with multi-provider support. It enables resellers to provision and manage VPS instances from Linode and DigitalOcean through a unified interface with white-label branding capabilities.

## Core Features

- **Multi-provider VPS management**: Unified interface for Linode and DigitalOcean with provider abstraction and normalized APIs
- **Billing system**: PayPal-backed prepaid wallet system with hourly reconciliation, invoices, and transaction tracking
- **Real-time notifications**: PostgreSQL LISTEN/NOTIFY with Server-Sent Events for activity, billing, and support updates
- **White-label branding**: Environment-driven company name, theme toggles, and customizable UI
- **Secure access**: JWT authentication with role-based access (admin/user), impersonation support, and rate limiting
- **SSH console**: WebSocket-based SSH bridge for direct VPS terminal access
- **Support system**: Ticket management with chat features
- **Activity logging**: Comprehensive audit trail across all operations

## User Roles

- **Admin**: Full platform access including user management, provider configuration, platform settings, and user impersonation
- **User**: Self-service portal for VPS provisioning, billing management, support tickets, and SSH console access

## Business Model

Resellers configure their provider API keys, set pricing margins, and offer branded VPS services to end customers. The platform handles provisioning, billing reconciliation, and customer self-service.
