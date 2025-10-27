# skypanelv2

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)](https://nodejs.org/)

SkyPanelV2 is an open-source cloud service reseller billing panel that enables service providers to resell cloud infrastructure from multiple providers (Linode, DigitalOcean, dedicated server providers) with custom billing, markup pricing, and white-label branding.

## 💝 Support Our Work
If you find my work helpful, consider supporting me:

[![PayPal](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/donate/?hosted_button_id=TEY7YEJC8X5HW)

## 🚀 Features

- **Multi-Provider Support**: Resell VPS from Linode, DigitalOcean, and dedicated servers
- **Custom Markup Pricing**: Set your own profit margins on base provider costs
- **Billing & Wallet System**: PayPal-integrated prepaid wallet with automatic hourly billing
- **White-Label Branding**: Fully customizable platform name, theme, and branding
- **Client Management**: Multi-tenant organization system with team collaboration
- **Admin Panel**: Manage plans, regions, users, and provider configurations
- **Real-Time Monitoring**: CPU, network, I/O metrics from provider APIs
- **Backup Management**: Automated backups, snapshots, and restoration
- **Support Ticketing**: Built-in ticket system with email notifications
- **API Access**: RESTful API with client-generated API keys

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Query** for data fetching
- **React Router** for navigation

### Backend
- **Node.js 20** with Express.js
- **TypeScript** for type safety
- **PostgreSQL** (migrated from Supabase) with Row Level Security (RLS)
- **Redis** for caching and Bull queues
- **InfluxDB** for metrics storage

### Integrations
- **PayPal SDK** for payment processing
- **SMTP2GO** for email notifications
- **Linode/Akamai API** for VPS provisioning
- **Docker Engine & Kubernetes** for container orchestration

## 📋 Prerequisites

- **Node.js** 20.x or higher
- **npm** (package manager)
- **PostgreSQL** 12+ database
- **Redis** server (for caching and Bull queues)
- **InfluxDB** (optional, for metrics storage)
- **Git** (for cloning the repository)
- **tsx** (installed via npm, for TypeScript execution)

## Example Images (rotated Regularly)

#### Homepage
<img width="1744" height="4521" alt="image" src="https://github.com/user-attachments/assets/9946df73-39e1-40da-a642-fd52faf99472" />

#### Login & Register Pages
<img width="1744" height="901" alt="image" src="https://github.com/user-attachments/assets/6415a34b-1479-4adf-a7a6-7301188b3a67" />
<img width="1744" height="901" alt="image" src="https://github.com/user-attachments/assets/b3f05823-fe36-443e-bb6f-75e305c08206" />

#### Forgot Password
<img width="1744" height="901" alt="image" src="https://github.com/user-attachments/assets/6eba2bb3-50a4-4ad4-b37c-01d7ba255b2c" />

#### Reset Forgot Password (SMTP Port 2525 smtp2go)
<img width="1744" height="901" alt="image" src="https://github.com/user-attachments/assets/06460344-b3f3-423a-9e3a-eb9f6f5f662e" />
<img width="1744" height="901" alt="image" src="https://github.com/user-attachments/assets/160e193a-56bf-46a8-915c-8f15f4ed3bff" />
<img width="1744" height="901" alt="image" src="https://github.com/user-attachments/assets/e2baaa2b-2d85-49ba-a15e-7bfa7b13e1d4" />

#### Updated Dashboard
<img width="1859" height="964" alt="image" src="https://github.com/user-attachments/assets/df382c78-3456-4f06-b340-0a38c221bcdf" />

#### VPS Page
<img width="1744" height="901" alt="image" src="https://github.com/user-attachments/assets/a3119176-28f3-4e74-8e67-29c055c41822" />
<img width="1744" height="901" alt="image" src="https://github.com/user-attachments/assets/1998e40c-e117-4f56-ba3a-d1905bab641b" />
<img width="1744" height="901" alt="image" src="https://github.com/user-attachments/assets/bd768634-2e49-4a40-80f1-4f2ca9668db0" />
<img width="1744" height="901" alt="image" src="https://github.com/user-attachments/assets/7b205aca-d50d-4859-9fec-d29ebf95bc18" />
<img width="1744" height="901" alt="image" src="https://github.com/user-attachments/assets/811ea291-0598-4c68-96db-b4697a80fc99" />
<img width="1744" height="975" alt="image" src="https://github.com/user-attachments/assets/fb1fb112-7a8a-4ac0-bb58-5a69ba163687" />

#### VPS/:id Page
<img width="1744" height="1253" alt="image" src="https://github.com/user-attachments/assets/7551e163-3fb9-46f9-a6aa-57b1ef6705f7" />
<img width="1744" height="1253" alt="image" src="https://github.com/user-attachments/assets/c137693a-518a-4155-ae74-a56962815a6a" />
<img width="1744" height="1730" alt="image" src="https://github.com/user-attachments/assets/357704a8-cd79-4a98-9930-a80eee8e9a64" />
<img width="1744" height="1253" alt="image" src="https://github.com/user-attachments/assets/728b812e-b248-453c-842b-6d8404115550" />
<img width="1744" height="1253" alt="image" src="https://github.com/user-attachments/assets/7c713ebb-8ae0-4f74-b992-4a56cd5fa5da" />
<img width="1744" height="1253" alt="image" src="https://github.com/user-attachments/assets/d6132aae-abf7-48fc-af2b-35cd92fdf636" />
<img width="1744" height="1243" alt="image" src="https://github.com/user-attachments/assets/dcb72608-903f-4b27-a10d-f8c2a35aeae4" />
<img width="1909" height="983" alt="image" src="https://github.com/user-attachments/assets/4bee7928-69ae-4b8b-a936-07830d2c3bad" />

#### ADMIN Panel / Company Team Panel ( MASSIVE WIP )
<img width="1744" height="1220" alt="image" src="https://github.com/user-attachments/assets/74968f3c-1154-46b3-9a48-6ae46fd1d3e0" />
<img width="1744" height="991" alt="image" src="https://github.com/user-attachments/assets/98a4f4d1-f2f7-4a9a-a295-78105e3f3652" />
<img width="1744" height="1954" alt="image" src="https://github.com/user-attachments/assets/4d47562a-b286-4acc-9f22-e2f1e4f70bab" />

#### Support Tickets Admin Page ( MASSIVE WIP )
<img width="1744" height="1338" alt="image" src="https://github.com/user-attachments/assets/29f20e74-d6fb-4abf-aa64-d6dc73c9a0b9" />

#### Containers Page (WIP Roadmap)
<img width="1744" height="975" alt="image" src="https://github.com/user-attachments/assets/60c1fe1b-5571-4fb7-924c-8ec60ba4c153" />

#### Client Facing Activity Logs
<img width="1744" height="944" alt="image" src="https://github.com/user-attachments/assets/eb8728b5-8baa-4ad0-a9cd-abd6f3fe569f" />

#### Billing
<img width="1744" height="1503" alt="image" src="https://github.com/user-attachments/assets/15a5868d-188a-4478-9c14-b4948cda2129" />
<img width="1744" height="901" alt="image" src="https://github.com/user-attachments/assets/a598a35b-503a-4160-9fe2-ec3f1633cba9" />

#### Billing HTML Invoice (Abides By `/admin` brand theme)
<img width="1744" height="954" alt="image" src="https://github.com/user-attachments/assets/7db9e211-e7fe-488d-b93e-a6ea475e004a" />

#### Command Pallete (WIP)
<img width="1744" height="1491" alt="image" src="https://github.com/user-attachments/assets/584e0ef1-7259-4dee-85d1-8d995b5a3621" />
<img width="1744" height="1491" alt="image" src="https://github.com/user-attachments/assets/6c2cf0b9-7d0f-4edb-b30a-4a8e6c0c56b5" />


#### AboutUs Page (WIP)
<img width="1744" height="2925" alt="image" src="https://github.com/user-attachments/assets/3bbf96ea-f9fd-4bbc-ba5b-5a59bb59f006" />

#### Contact Us Page (WIP)
<img width="1744" height="1811" alt="image" src="https://github.com/user-attachments/assets/61ac82ce-384f-4579-91e9-4866591575d0" />

#### FAQ Page (WIP)
<img width="1744" height="1885" alt="image" src="https://github.com/user-attachments/assets/c3464bfa-a2e8-40d9-a065-c7ad2112cdd7" />

### Status Page (WIP)
<img width="1744" height="3365" alt="image" src="https://github.com/user-attachments/assets/5d6dc617-cad4-49f0-bc2d-cfbcbb0f49cf" />

#### TOS / Terms Of Service (WIP Not LEGIT Yet) - Missing shared header & footer
<img width="1744" height="1444" alt="image" src="https://github.com/user-attachments/assets/4bcc16ca-625a-4559-8e2a-2a015f4d116d" />

#### Privacy Policy (WIP Not LEGIT Yet) - Missing shared header & footer
<img width="1744" height="1591" alt="image" src="https://github.com/user-attachments/assets/d8e84b6c-87e9-4a45-83bf-c49524ca101e" />

## 🏗️ Setup & Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/skyvps360/skypanelv2
   cd skypanelv2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory (you can copy `.env.example` with `cp .env.example .env`) and update values as needed. Key variables from `.env.example`:

    ```env
   # App
   NODE_ENV=development
   PORT=3001
   CLIENT_URL=http://localhost:5173
   VITE_API_URL=http://localhost:3001/api
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=7d

   # PostgreSQL
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/skypanelv2
   # For Neon/Cloud Postgres:
   # DATABASE_URL=postgresql://username:password@ep-example.us-east-1.aws.neon.tech/skypanelv2?sslmode=require

   # PayPal
   PAYPAL_CLIENT_ID=your-paypal-client-id
   PAYPAL_CLIENT_SECRET=your-paypal-client-secret
   PAYPAL_MODE=sandbox

   # SMTP2GO Email
   SMTP2GO_API_KEY=your-smtp2go-api-key
   SMTP2GO_USERNAME=your-smtp2go-username
   SMTP2GO_PASSWORD=your-smtp2go-password
   FROM_EMAIL=noreply@skypanelv2.com
   FROM_NAME=SkyPanelV2 Support

   # Linode (VPS)
   LINODE_API_TOKEN=your-linode-api-token
   LINODE_API_URL=https://api.linode.com/v4

   # Optional: DigitalOcean
   DIGITALOCEAN_API_TOKEN=your-digitalocean-api-token

   # Docker
   DOCKER_HOST=unix:///var/run/docker.sock
   DOCKER_REGISTRY_URL=registry.skypanelv2.com

   # Redis
   REDIS_URL=redis://localhost:6379
   REDIS_PASSWORD=

   # Encryption for API keys
   ENCRYPTION_KEY=your-32-character-encryption-key

   # Rate limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100

   # Uploads
   MAX_FILE_SIZE=10485760
   UPLOAD_PATH=./uploads

   # Metrics (optional)
   INFLUXDB_URL=http://localhost:8086
   INFLUXDB_TOKEN=your-influxdb-token
   INFLUXDB_ORG=skypanelv2
   INFLUXDB_BUCKET=metrics

   # Backups
   BACKUP_STORAGE_PROVIDER=local
   BACKUP_RETENTION_DAYS=30
   ```

   #### White-label Branding
   - Set `COMPANY_NAME` in `.env` to customize the brand name displayed across the UI (navigation, home page hero/footer, login/register copy, and labels in API docs).
   - Alternatively, you can use `VITE_COMPANY_NAME` if you prefer the standard Vite prefix.
   - Example:

     ```env
     COMPANY_NAME=SkyVPS360
     # or
     VITE_COMPANY_NAME=SkyVPS360
     ```

   - After changing the brand variable, restart the dev server so the UI picks up the new value.
   - See `.env.example` for a reference configuration that includes `COMPANY_NAME`.

5. **Set up the database**
   
   **Option 1: Using migration scripts (Recommended)**
   ```bash
   # Apply all migrations in order
   node scripts/apply-migration.js
   
   # Or apply a specific migration
   node scripts/apply-single-migration.js migrations/001_initial_schema.sql
   ```
   
   **Option 2: Manual setup**
   - Run SQL files in `migrations/` directory in numerical order (001, 002, 003, etc.)
   - Ensure all migrations complete successfully
   
   **Important Notes:**
   - Row Level Security (RLS) policies are automatically applied during migrations
   - The initial schema creates default admin user (email: `admin@skypanelv2.com`, password: `admin123`)
   - Change the default admin password immediately after first login

6. **Start the development servers**
   ```bash
   npm run dev  # Starts both client (Vite) and server (Nodemon)
   ```

   Or start them separately:
   ```bash
   npm run client:dev  # Frontend only
   npm run server:dev  # Backend only
   ```

7. **Access the application**
   Open [http://localhost:5173](http://localhost:5173) in your browser

## 🎯 Usage

### User Roles
- **Service Provider Admin**: Full platform configuration and billing management
- **Organization Admin**: Manage organization users, billing, and resources
- **Developer**: Deploy containers, manage applications, and access logs
- **Collaborator**: Limited access to specific projects and resources

### Core Workflows
1. **Container Deployment**: Select from marketplace or upload custom images
2. **VPS Provisioning**: Create instances from integrated cloud providers
3. **Billing Management**: Add funds via PayPal and track usage
4. **Monitoring**: View metrics, logs, and set up alerts
5. **Collaboration**: Invite team members and manage permissions

## 🚦 Development

### Available Scripts

**Development:**
- `npm run dev` - Start both frontend and backend (uses `concurrently`)
- `npm run client:dev` - Start frontend only (Vite dev server)
- `npm run server:dev` - Start backend only (Nodemon with hot reload)
- `npm run kill-ports` - Free ports `3001` and `5173` if conflicts occur

**Production:**
- `npm run build` - Build production assets (`tsc` + `vite build`)
- `npm run start` - Start production server (Node + Vite preview)
- `npm run pm2:start` - Start with PM2 process manager
- `npm run pm2:reload` - Reload PM2 processes (zero-downtime)
- `npm run pm2:stop` - Stop and delete PM2 processes
- `npm run pm2:list` - List PM2 processes

**Database & Setup:**
- `npm run seed:admin` - Create initial admin user
- `node scripts/apply-migration.js` - Apply all database migrations
- `node scripts/seed-admin.js` - Alternative admin seeding
- `node scripts/test-connection.js` - Test database connectivity

**Testing & Quality:**
- `npm run test` - Run Vitest tests (single run)
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run check` - Run TypeScript type checking

### Ports & Preview
- Frontend serves at `http://localhost:5173`
- Backend runs on `http://localhost:3001` with API under `http://localhost:3001/api`
- If a port is in use (`EADDRINUSE`), run `npm run kill-ports` and restart `npm run dev`

### Admin & Seeding
- To quickly access the Admin Panel, run `npm run seed:admin` to create an initial admin user (see script in `scripts/seed-admin.js`).
- Configure provider settings and allowed regions in the Admin Panel. If no specific Linode regions are configured, the UI falls back to showing all available regions when a valid `LINODE_API_TOKEN` is present.

### Code Guidelines
- Use functional React components with hooks
- Follow the data model in architecture docs for database schemas
- Maintain TypeScript strictness and RLS for security
- Update documentation for feature changes

### Troubleshooting
- **Vite loads but API fails**: Confirm `PORT=3001` in `.env` and backend is running
- **Region dropdown empty**: Verify `LINODE_API_TOKEN`, provider configuration in Admin Panel, and network connectivity
- **Port conflicts**: Use `npm run kill-ports` before `npm run dev`
- **Missing table errors**: Ensure migrations are applied via `node scripts/apply-migration.js`
- **Branding not updating**: Ensure `COMPANY_NAME` (or `VITE_COMPANY_NAME`) is set in `.env` and restart dev server
- **Database connection errors**: Check `DATABASE_URL` format and PostgreSQL service status
- **Redis connection issues**: Verify `REDIS_URL` and ensure Redis server is running
- **PayPal integration fails**: Confirm `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and `PAYPAL_MODE` are correct
- **Email notifications not sending**: Verify SMTP2GO credentials and test with `node scripts/test-smtp.js`
- **Billing not running**: Check application logs for hourly billing execution

## 🚀 Deployment

### Production Deployment Options

**1. PM2 Process Manager (Recommended for Node.js hosting):**
```bash
# Build and start with PM2
npm run pm2:start

# Zero-downtime reload
npm run pm2:reload

# Stop all processes
npm run pm2:stop
```

**2. Systemd Service (Linux servers):**

- Create a custom systemd unit for the API/backend as needed
- Suitable for VPS/dedicated server deployments

**3. Cloud Platforms:**

- **Vercel**: Configuration included in `vercel.json`
- **Neon/Supabase**: Compatible with cloud PostgreSQL providers
- Update `DATABASE_URL` to use cloud database connection string

### Production Checklist

- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Update `JWT_SECRET` to a strong random key
- [ ] Configure production `DATABASE_URL` with SSL enabled
- [ ] Set up Redis for production caching
- [ ] Configure PayPal production credentials (`PAYPAL_MODE=live`)
- [ ] Set up SMTP2GO for email notifications
- [ ] Update `CLIENT_URL` to production domain
- [ ] Configure `ENCRYPTION_KEY` for API key storage
- [ ] Set appropriate rate limiting values for production traffic
- [ ] Configure `TRUST_PROXY` based on infrastructure (e.g., `1` for nginx, `2` for Cloudflare + nginx)
- [ ] Set up InfluxDB for metrics (optional but recommended)
- [ ] Configure backup retention (`BACKUP_RETENTION_DAYS`)
- [ ] Set up monitoring and alerting
- [ ] Change default admin password

## 📚 Additional Documentation

Detailed documentation is available in the `docs/` directory:

- **[Getting Started Guide](docs/getting-started/)** - Step-by-step setup instructions
- **[Architecture Documentation](docs/architecture/)** - System design and technical architecture
- **[API Reference](docs/api/)** - RESTful API documentation and OpenAPI spec
- **[Reference Guides](docs/reference/)** - Configuration options and best practices
- **[Troubleshooting Guide](docs/troubleshooting/)** - Common issues and solutions

### API Documentation

The project includes comprehensive OpenAPI documentation:

- **Interactive API Docs**: Available at `/api-docs` when running the application
- **OpenAPI Spec**: See `openapi.json` for complete API specification
- **Postman/Insomnia**: Import `openapi.json` for API testing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, create a ticket through the in-app support system or refer to the [Additional Documentation](#-additional-documentation).

---

⭐️ From [skyvps360](https://github.com/skyvps360) | **Made with ❤️ for the container orchestration community**

