# ContainerStacks Documentation

Welcome to the comprehensive documentation for ContainerStacks - an open-source cloud service reseller billing panel with multi-provider support and white-label branding.

## Documentation Structure

### Getting Started
- [Quick Start Guide](./getting-started/quick-start.md) - Get up and running in minutes
- [Installation](./getting-started/installation.md) - Detailed installation instructions
- [Configuration](./getting-started/configuration.md) - Environment variables and settings
- [First Steps](./getting-started/first-steps.md) - Initial setup and admin user creation

### Architecture & Design
- [System Architecture](./architecture/system-architecture.md) - High-level system design
- [Database Schema](./architecture/database-schema.md) - Complete database structure
- [API Design](./architecture/api-design.md) - RESTful API patterns and conventions
- [Security Model](./architecture/security.md) - Authentication, authorization, and data protection
- [Technology Stack](./architecture/tech-stack.md) - Frontend, backend, and infrastructure technologies

### User Guides
- [Dashboard Overview](./user-guides/dashboard.md) - Understanding your dashboard
- [Managing VPS](./user-guides/vps-management.md) - Create and manage virtual private servers
- [Managing Containers](./user-guides/container-management.md) - Deploy and manage containers
- [Billing & Payments](./user-guides/billing.md) - Wallet system, invoices, and PayPal integration
- [Support Tickets](./user-guides/support.md) - Creating and tracking support tickets
- [Activity Logs](./user-guides/activity.md) - Viewing and filtering activity history
- [Settings & Profile](./user-guides/settings.md) - Managing your account settings

### Admin Guides
- [Admin Dashboard](./admin-guides/admin-dashboard.md) - Overview of admin capabilities
- [Plan Management](./admin-guides/plan-management.md) - VPS and Container plan configuration
- [User Management](./admin-guides/user-management.md) - Managing users and organizations
- [Provider Configuration](./admin-guides/providers.md) - Setting up Linode and other providers
- [Infrastructure Management](./admin-guides/infrastructure.md) - Servers, containers, and networking
- [Support Management](./admin-guides/support-management.md) - Managing support tickets
- [Theme Customization](./admin-guides/theme.md) - Customizing platform appearance
- [Rate Limiting](./admin-guides/rate-limiting.md) - Configuring API rate limits
- [Networking & IPAM](./admin-guides/networking.md) - IP address management
- [StackScripts](./admin-guides/stackscripts.md) - Managing deployment scripts

### API Reference
- [Authentication](./api/authentication.md) - Login, registration, and token management
- [VPS Endpoints](./api/vps.md) - Virtual server management APIs
- [Container Endpoints](./api/containers.md) - Container management APIs
- [Billing Endpoints](./api/billing.md) - Invoices, payments, and wallet APIs
- [Support Endpoints](./api/support.md) - Ticket management APIs
- [Admin Endpoints](./api/admin.md) - Administrative APIs
- [Notifications](./api/notifications.md) - Real-time notification APIs
- [Activity Logs](./api/activity.md) - Activity tracking APIs
- [Theme API](./api/theme.md) - Theme customization APIs

### Development
- [Development Setup](./development/setup.md) - Setting up your development environment
- [Project Structure](./development/project-structure.md) - Understanding the codebase
- [Frontend Development](./development/frontend.md) - React, Vite, and component development
- [Backend Development](./development/backend.md) - Express, TypeScript, and API development
- [Database Development](./development/database.md) - Migrations and query patterns
- [Testing](./development/testing.md) - Unit tests, integration tests, and E2E tests
- [Code Style Guide](./development/code-style.md) - Coding conventions and best practices
- [Contributing](./development/contributing.md) - How to contribute to the project

### Deployment
- [Production Deployment](./deployment/production.md) - Deploying to production
- [Docker Deployment](./deployment/docker.md) - Containerized deployment
- [Environment Variables](./deployment/environment.md) - Production configuration
- [Database Migration](./deployment/migrations.md) - Running migrations in production
- [Monitoring & Logs](./deployment/monitoring.md) - Application monitoring
- [Backup & Recovery](./deployment/backup.md) - Data backup strategies
- [Scaling](./deployment/scaling.md) - Horizontal and vertical scaling

### Integrations
- [Linode/Akamai Integration](./integrations/linode.md) - VPS provisioning with Linode
- [PayPal Integration](./integrations/paypal.md) - Payment processing
- [Email (SMTP2GO)](./integrations/email.md) - Email notifications
- [Redis Integration](./integrations/redis.md) - Caching and queue management
- [Docker Integration](./integrations/docker.md) - Container orchestration

### Troubleshooting
- [Common Issues](./troubleshooting/common-issues.md) - Frequently encountered problems
- [Port Conflicts](./troubleshooting/port-conflicts.md) - Resolving EADDRINUSE errors
- [Database Issues](./troubleshooting/database.md) - Connection and query problems
- [API Errors](./troubleshooting/api-errors.md) - Debugging API responses
- [Build & Compilation](./troubleshooting/build-errors.md) - TypeScript and build issues
- [Performance](./troubleshooting/performance.md) - Optimization and debugging slow operations

### Reference
- [Glossary](./reference/glossary.md) - Terms and definitions
- [FAQ](./reference/faq.md) - Frequently asked questions
- [Changelog](./reference/changelog.md) - Version history and updates
- [License](./reference/license.md) - MIT License details

## Quick Links

- **GitHub Repository**: [skyvps360/containerstacks](https://github.com/skyvps360/containerstacks)
- **Report Issues**: [GitHub Issues](https://github.com/skyvps360/containerstacks/issues)
- **Community Support**: Create a ticket in-app or via GitHub Discussions

## Contributing to Documentation

Documentation improvements are always welcome! Please see our [Contributing Guide](./development/contributing.md) for details on how to submit documentation updates.

---

**Last Updated**: 2025-10-20  
**Version**: 1.0.0
