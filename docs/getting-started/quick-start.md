# Quick Start Guide

Get ContainerStacks up and running in under 15 minutes.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20.x or higher
- **npm** (comes with Node.js)
- **PostgreSQL** 12 or higher
- **Git**
- (Optional) **Redis** for caching and queue management

## Step-by-Step Installation

### 1. Clone the Repository

```bash
git clone https://github.com/skyvps360/containerstacks.git
cd containerstacks
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required frontend and backend dependencies.

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration. Minimum required variables:

```env
# Application
NODE_ENV=development
PORT=3001
CLIENT_URL=http://localhost:5173
VITE_API_URL=http://localhost:3001/api

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/containerstacks

# Encryption (for API keys)
ENCRYPTION_KEY=a-32-character-encryption-key-here

# Company Branding (optional)
COMPANY-NAME=ContainerStacks
```

**Important**: Change `JWT_SECRET` and `ENCRYPTION_KEY` to secure random values in production!

### 4. Set Up the Database

Create a PostgreSQL database:

```bash
createdb containerstacks
```

Or using psql:

```sql
CREATE DATABASE containerstacks;
```

Run migrations to set up the database schema:

```bash
node scripts/run-migration.js
```

### 5. Create an Admin User (Optional)

```bash
npm run seed:admin
```

Follow the prompts to create your first admin user.

### 6. Start the Development Server

```bash
npm run dev
```

This starts both the frontend (Vite) and backend (Express) servers concurrently.

### 7. Access the Application

Open your browser and navigate to:

```
http://localhost:5173
```

- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:3001/api`
- **API Health Check**: `http://localhost:3001/api/health`

## First Login

If you created an admin user in step 5, log in with those credentials. Otherwise, click "Register" to create a new account.

## Next Steps

Now that ContainerStacks is running, you can:

1. **Configure a Provider**: Set up Linode or other cloud provider credentials in the Admin panel
2. **Create Plans**: Define VPS and Container plans with pricing
3. **Add Funds**: Use the wallet system to add credits via PayPal (requires PayPal configuration)
4. **Deploy Resources**: Create your first VPS or container

## Common Issues

### Port Already in Use

If you see `EADDRINUSE` errors:

```bash
npm run kill-ports
npm run dev
```

### Database Connection Failed

Verify your `DATABASE_URL` is correct and PostgreSQL is running:

```bash
psql $DATABASE_URL -c "SELECT 1;"
```

### Missing Environment Variables

Check that all required variables in `.env` are set. The application will warn you about missing critical variables on startup.

## Getting Help

- Review the [Installation Guide](./installation.md) for detailed setup
- Check [Troubleshooting](../troubleshooting/common-issues.md) for common problems
- Create an issue on [GitHub](https://github.com/skyvps360/containerstacks/issues)

---

**Next**: [Installation Guide](./installation.md) | [Configuration](./configuration.md)
