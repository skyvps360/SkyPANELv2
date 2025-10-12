# ContainerStacks

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)](https://nodejs.org/)

ContainerStacks is an open-source Container-as-a-Service (CaaS) platform that enables service providers to offer comprehensive Docker container hosting, management, and orchestration services. It includes built-in billing, monitoring, collaboration features, and supports multi-tenant environments with white-label capabilities.

## 🚀 Features

- **Container Management**: Deploy, scale, and monitor Docker containers with ease
- **VPS Hosting**: Integrated VPS management with reseller markup pricing
- **Multi-Tenancy**: Organization-based access control and resource quotas
- **Billing & Wallet**: PayPal-integrated billing with account wallets and invoices
- **Monitoring & Logs**: Real-time metrics, performance insights, and log management
- **Marketplace**: Pre-built applications and custom image registry
- **Collaboration**: Team management, permissions, and shared workspaces
- **Admin Panel**: Platform configuration, user management, and system settings
- **Support System**: Ticket-based support with email notifications
- **Backup & Restore**: Automated backups with encryption and point-in-time recovery

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
- **npm** or **yarn**
- **PostgreSQL** database
- **Redis** server
- **InfluxDB** (optional for metrics)

## 🏗️ Setup & Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/skyvps360/containerstacks
   cd containerstacks
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
<<<<<<< HEAD
   Create a `.env` file in the root directory (you can copy `.env.example` with `cp .env.example .env`) and update values as needed. Key variables from `.env.example`:
=======
   Create a `.env` file in the root directory you can copy the .env.example with `cp .env.example .env`:
>>>>>>> df09eb41fb17c522dd07fe9ccf35e1b77af9f13d
   ```env
   # App
   NODE_ENV=development
   PORT=3001
   CLIENT_URL=http://localhost:5173
   VITE_API_URL=http://localhost:3001/api
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=7d

   # PostgreSQL
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/containerstacks
   # For Neon/Cloud Postgres:
   # DATABASE_URL=postgresql://username:password@ep-example.us-east-1.aws.neon.tech/containerstacks?sslmode=require

   # PayPal
   PAYPAL_CLIENT_ID=your-paypal-client-id
   PAYPAL_CLIENT_SECRET=your-paypal-client-secret
   PAYPAL_MODE=sandbox

   # SMTP2GO Email
   SMTP2GO_API_KEY=your-smtp2go-api-key
   SMTP2GO_USERNAME=your-smtp2go-username
   SMTP2GO_PASSWORD=your-smtp2go-password
   FROM_EMAIL=noreply@containerstacks.com
   FROM_NAME=ContainerStacks

   # Linode (VPS)
   LINODE_API_TOKEN=your-linode-api-token
   LINODE_API_URL=https://api.linode.com/v4

   # Optional: DigitalOcean
   DIGITALOCEAN_API_TOKEN=your-digitalocean-api-token

   # Docker
   DOCKER_HOST=unix:///var/run/docker.sock
   DOCKER_REGISTRY_URL=registry.containerstacks.com

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
   INFLUXDB_ORG=containerstacks
   INFLUXDB_BUCKET=metrics

   # Backups
   BACKUP_STORAGE_PROVIDER=local
   BACKUP_RETENTION_DAYS=30
   ```

4. **Set up the database**
   - Run migrations from `migrations/` or use the provided scripts in `scripts/`
   - Ensure Row Level Security policies are applied as per the architecture docs

5. **Start the development servers**
   ```bash
   npm run dev  # Starts both client (Vite) and server (Nodemon)
   ```

   Or start them separately:
   ```bash
   npm run client:dev  # Frontend only
   npm run server:dev  # Backend only
   ```

6. **Access the application**
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

## 📚 Documentation

- **[Technical Architecture](./.trae/documents/ContainerStacks_Technical_Architecture.md)**: Detailed system design and API specifications
- **[Product Requirements](./.trae/documents/ContainerStacks_PRD.md)**: Feature descriptions and user flows
- **[Windsurf Rules](./.windsurf/rules.json)**: Development guidelines for the project
- **[Trae Project Rules](./.trae/rules/project_rules.md)**: IDE automation and workflow conventions

## 🚦 Development

### Available Scripts
- `npm run dev` - Start both frontend and backend (uses `concurrently`)
- `npm run client:dev` - Start frontend only
- `npm run server:dev` - Start backend only
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run check` - Run TypeScript checks
- `npm run kill-ports` - Free ports `3001` and `5173` if conflicts occur
- `npm run seed:admin` - Seed an initial admin user

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
- Vite loads but API fails: confirm `PORT=3001` and `VITE_API_URL=http://localhost:3001/api` in `.env`
- Region dropdown empty: verify `LINODE_API_TOKEN`, provider configuration, and network connectivity
- Port conflicts: use `npm run kill-ports` before `npm run dev`
- Missing table errors: ensure migrations are applied and review server logs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, create a ticket through the in-app support system or refer to the [documentation](#documentation).

---

**Made with ❤️ for the container orchestration community**
