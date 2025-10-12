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

## 🏗️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd containerstacks
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   # Database
   DATABASE_URL=postgresql://username:password@localhost:5432/containerstacks

   # Redis
   REDIS_URL=redis://localhost:6379

   # JWT
   JWT_SECRET=your-secret-key

   # PayPal
   PAYPAL_CLIENT_ID=your-paypal-client-id
   PAYPAL_CLIENT_SECRET=your-paypal-client-secret

   # Email
   SMTP_HOST=smtp2go.com
   SMTP_USER=your-smtp-username
   SMTP_PASS=your-smtp-password

   # Other configurations...
   ```

4. **Set up the database**
   - Run migrations from `migrations/` or use the provided scripts
   - Ensure Row Level Security policies are applied as per the architecture docs

5. **Start the development servers**
   ```bash
   npm run dev  # Starts both client and server
   ```

   Or separately:
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

## 🚦 Development

### Available Scripts
- `npm run dev` - Start both frontend and backend
- `npm run client:dev` - Start frontend only
- `npm run server:dev` - Start backend only
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run check` - Run TypeScript checks

### Code Guidelines
- Use functional React components with hooks
- Follow the data model in architecture docs for database schemas
- Maintain TypeScript strictness and RLS for security
- Update documentation for feature changes

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
