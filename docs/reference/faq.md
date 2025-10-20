# Frequently Asked Questions (FAQ)

## General Questions

### What is ContainerStacks?

ContainerStacks is an open-source cloud service reseller billing panel that enables service providers to resell VPS and container infrastructure from multiple cloud providers (Linode, DigitalOcean, etc.) with custom pricing, billing automation, and white-label branding.

### Is ContainerStacks free to use?

Yes, ContainerStacks is open-source and licensed under the MIT License. You're free to use, modify, and distribute it. However, you'll need to pay for the underlying cloud infrastructure (Linode, etc.) and payment processing fees (PayPal).

### What cloud providers are supported?

Currently supported:
- **Linode/Akamai** - Full VPS provisioning and management
- **Docker** - Container deployment and orchestration

Planned future support:
- DigitalOcean
- Vultr
- AWS EC2
- Other dedicated server providers

### Can I white-label ContainerStacks?

Yes! You can customize:
- Company name via `COMPANY-NAME` environment variable
- Theme colors and branding via Admin → Theme
- Logo and favicon
- Email templates

### Do I need coding knowledge to use ContainerStacks?

No coding knowledge is required to:
- Deploy and configure the platform
- Manage users and organizations
- Create plans and pricing
- Handle support tickets

Basic coding knowledge is helpful for:
- Custom theme modifications
- Adding new features
- Debugging issues

## Installation & Setup

### What are the minimum system requirements?

- 2 CPU cores
- 4GB RAM
- 20GB storage
- Node.js 20+
- PostgreSQL 12+
- (Optional) Redis for caching

### How long does installation take?

With all prerequisites installed, setup typically takes 10-15 minutes following the [Quick Start Guide](../getting-started/quick-start.md).

### Can I install on shared hosting?

Shared hosting typically doesn't support Node.js applications. You'll need a VPS, dedicated server, or cloud platform that supports Node.js and PostgreSQL.

### Do I need a domain name?

For production use, yes. For development and testing, you can use localhost.

### How do I get SSL/HTTPS working?

Use Let's Encrypt with Certbot for free SSL certificates. See the [Installation Guide](../getting-started/installation.md#6-set-up-ssl-with-lets-encrypt) for details.

## Features & Functionality

### How does the wallet system work?

ContainerStacks uses a prepaid wallet system:
1. Users add funds via PayPal
2. Resources (VPS, containers) are billed hourly
3. Charges are automatically deducted from wallet balance
4. Users receive low-balance notifications
5. Resources may be suspended if wallet depleted

### Can I set my own pricing?

Yes! You set:
- Base cost from provider
- Your markup percentage
- Final hourly/monthly rates

The platform automatically calculates billing based on your configured pricing.

### How are users billed?

Billing is automatic and hourly:
- Every hour, the system calculates usage charges
- Charges are deducted from user wallets
- Invoices are generated for transparency
- Users can view billing history

### Can users deploy custom applications?

Yes! Users can:
- Deploy Docker containers with custom images
- Use StackScripts for VPS customization
- Access SSH for full control
- Configure custom networking

### What monitoring features are available?

ContainerStacks provides:
- CPU usage graphs
- Network bandwidth tracking
- Disk I/O metrics
- Real-time status monitoring
- Resource usage history

### Is there a support ticket system?

Yes, built-in support includes:
- Ticket creation and tracking
- Email notifications
- Priority levels (low, medium, high, urgent)
- Status tracking (open, in progress, resolved, closed)
- Admin ticket management

## Billing & Payments

### What payment methods are supported?

Currently:
- PayPal (credit cards via PayPal)

Planned:
- Stripe
- Cryptocurrency

### How does PayPal integration work?

Users add funds to their wallet via PayPal:
1. User requests to add funds
2. Redirected to PayPal checkout
3. Payment completed
4. Funds added to wallet automatically
5. Receipt email sent

### Can I offer different pricing for different users?

Currently, pricing is the same for all users based on plan selection. Custom per-user pricing is planned for future releases.

### Are there transaction fees?

PayPal charges standard transaction fees (typically 2.9% + $0.30). You should factor this into your markup pricing.

### Can I issue refunds?

Refunds must be processed manually through your PayPal account. Future versions will include built-in refund management.

## Technical Questions

### What database does ContainerStacks use?

PostgreSQL is the primary database. It was migrated from Supabase for better control and self-hosting capabilities.

### Do I need Redis?

Redis is optional but recommended for:
- Session caching
- Rate limiting
- Background job queues
- Improved performance

### How are API keys stored securely?

API keys and sensitive credentials are:
- Encrypted using AES-256
- Stored in encrypted format in database
- Decrypted only when needed
- Never exposed in API responses

### Is the platform scalable?

Yes! ContainerStacks can scale:
- **Vertically**: Upgrade server resources
- **Horizontally**: Run multiple API instances behind load balancer
- **Database**: Use PostgreSQL read replicas
- **Caching**: Redis cluster for distributed caching

### Can I customize the frontend?

Absolutely! The frontend is built with React and Tailwind CSS:
- Modify components in `src/components/`
- Customize styles in `src/index.css`
- Add new pages in `src/pages/`
- Extend with new features

### How do I backup data?

Regular PostgreSQL backups are recommended:
```bash
pg_dump containerstacks | gzip > backup-$(date +%Y%m%d).sql.gz
```

See [Deployment Guide](../deployment/backup.md) for automated backup strategies.

## Security

### Is ContainerStacks secure?

ContainerStacks implements security best practices:
- JWT authentication
- Password hashing with bcrypt
- Row Level Security (RLS) in database
- Input validation and sanitization
- Rate limiting
- Helmet security headers
- CORS protection
- Encrypted sensitive data

### How are passwords stored?

Passwords are hashed using bcrypt with salt before storage. Plain-text passwords are never stored.

### What about user data isolation?

Multi-tenancy is enforced through:
- Organization-based data isolation
- PostgreSQL Row Level Security (RLS)
- Server-side authorization checks
- API middleware validation

### Can admins access user data?

Yes, admins have full platform access for:
- Support purposes
- Billing management
- System administration

All admin actions are logged in activity logs for audit trails.

### How often should I update?

Check for updates regularly:
- Security patches: Apply immediately
- Feature updates: Review changelog and test before deploying
- Subscribe to GitHub releases for notifications

## Troubleshooting

### Why can't I see any regions when creating a VPS?

Common causes:
1. Linode API token not configured
2. Token lacks necessary permissions
3. Provider configuration not set in Admin panel
4. Network connectivity issues

See [Common Issues](../troubleshooting/common-issues.md#region-dropdown-empty) for solutions.

### Ports 3001 or 5173 already in use?

Run:
```bash
npm run kill-ports
npm run dev
```

### Database connection keeps failing?

Verify:
1. PostgreSQL is running
2. DATABASE_URL is correct in `.env`
3. Database user has proper permissions
4. Firewall allows connections

### Build fails with TypeScript errors?

Try:
```bash
rm -rf node_modules dist
npm install
npm run build
```

### My changes aren't showing up?

For frontend changes:
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear browser cache
3. Restart dev server

For backend changes:
1. Restart backend (nodemon should auto-restart)
2. Check for syntax errors in console

## Development

### How do I contribute?

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

See [Contributing Guide](../development/contributing.md) for details.

### Where can I get help?

- Review [documentation](../README.md)
- Check [GitHub Issues](https://github.com/skyvps360/containerstacks/issues)
- Create a new issue for bugs or feature requests
- Join community discussions

### Can I add new cloud providers?

Yes! Follow the pattern in `api/services/linodeService.ts` to create new provider integrations. Contributions are welcome!

### How do I report a bug?

Create a GitHub issue with:
- Description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details
- Error messages/logs

### Is there a roadmap?

Check GitHub for:
- Open issues (planned features)
- Milestones (release planning)
- Project boards (development status)

## Business & Licensing

### Can I use ContainerStacks commercially?

Yes! The MIT License allows commercial use without restrictions.

### Do I need to credit ContainerStacks?

Not required by the license, but appreciated! You can keep or remove attribution as you wish.

### Can I sell ContainerStacks?

Yes, you can sell installations, customizations, or hosting services based on ContainerStacks.

### What if I modify the code?

You can modify freely. The MIT License doesn't require you to share modifications, though community contributions are encouraged.

### Is there commercial support available?

Community support is available via GitHub. For commercial support, consulting, or custom development, contact the project maintainers.

## Still Have Questions?

If your question isn't answered here:
- Review the [complete documentation](../README.md)
- Search [GitHub Issues](https://github.com/skyvps360/containerstacks/issues)
- Create a new issue for your question

---

**Related**: [Troubleshooting](../troubleshooting/common-issues.md) | [Getting Started](../getting-started/quick-start.md)
