# Installation Guide

Complete installation instructions for ContainerStacks.

## System Requirements

### Minimum Requirements
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB free space
- **OS**: Ubuntu 20.04+, macOS 11+, or Windows 10+ with WSL2

### Software Requirements
- **Node.js**: v20.x or higher
- **npm**: v9.x or higher (comes with Node.js)
- **PostgreSQL**: v12 or higher
- **Git**: Latest version

### Optional but Recommended
- **Redis**: v6.x or higher (for caching and queues)
- **Docker**: For container management features
- **PM2**: For production process management

## Installation Steps

### 1. Install Node.js

#### Ubuntu/Debian
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### macOS (using Homebrew)
```bash
brew install node@20
```

#### Windows
Download and install from [nodejs.org](https://nodejs.org/)

Verify installation:
```bash
node --version  # Should show v20.x.x
npm --version   # Should show v9.x.x
```

### 2. Install PostgreSQL

#### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### macOS (using Homebrew)
```bash
brew install postgresql@14
brew services start postgresql@14
```

#### Windows
Download and install from [postgresql.org](https://www.postgresql.org/download/windows/)

Verify installation:
```bash
psql --version  # Should show PostgreSQL 12+
```

### 3. Install Redis (Optional but Recommended)

#### Ubuntu/Debian
```bash
sudo apt-get install -y redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

#### macOS (using Homebrew)
```bash
brew install redis
brew services start redis
```

#### Windows
Use WSL2 or download from [redis.io](https://redis.io/download)

Verify installation:
```bash
redis-cli ping  # Should return PONG
```

### 4. Clone ContainerStacks Repository

```bash
git clone https://github.com/skyvps360/containerstacks.git
cd containerstacks
```

### 5. Install Project Dependencies

```bash
npm install
```

This installs all required packages for both frontend and backend.

### 6. Configure Environment Variables

Create `.env` file:
```bash
cp .env.example .env
```

Edit `.env` with your settings. See [Configuration Guide](./configuration.md) for detailed explanations.

**Minimum required configuration:**

```env
# App
NODE_ENV=development
PORT=3001
CLIENT_URL=http://localhost:5173
VITE_API_URL=http://localhost:3001/api

# Security (CHANGE THESE!)
JWT_SECRET=change-this-to-a-long-random-string-in-production
ENCRYPTION_KEY=a-32-character-random-string-here

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/containerstacks
```

### 7. Set Up PostgreSQL Database

#### Create Database

Using psql:
```bash
sudo -u postgres psql
```

In psql:
```sql
CREATE DATABASE containerstacks;
CREATE USER containerstacks_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE containerstacks TO containerstacks_user;
\q
```

Update your `DATABASE_URL` in `.env`:
```env
DATABASE_URL=postgresql://containerstacks_user:secure_password@localhost:5432/containerstacks
```

#### Run Migrations

```bash
node scripts/run-migration.js
```

This creates all necessary tables and schema.

### 8. Create Admin User

```bash
npm run seed:admin
```

Follow prompts to create your first admin account.

### 9. Start Development Server

```bash
npm run dev
```

This starts:
- **Frontend** (Vite) on `http://localhost:5173`
- **Backend** (Express) on `http://localhost:3001`

### 10. Verify Installation

Open your browser to `http://localhost:5173`

You should see the ContainerStacks login page. Log in with the admin credentials you created.

## Production Installation

### Additional Steps for Production

#### 1. Use Production Environment Variables

Update `.env`:
```env
NODE_ENV=production
CLIENT_URL=https://your-domain.com
VITE_API_URL=https://your-domain.com/api
```

#### 2. Build the Application

```bash
npm run build
```

This creates optimized production builds in `dist/` directory.

#### 3. Install PM2

```bash
npm install -g pm2
```

#### 4. Start with PM2

```bash
npm run pm2:start
```

#### 5. Configure Nginx (Recommended)

Install Nginx:
```bash
sudo apt-get install nginx
```

Create Nginx configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/containerstacks/dist;
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

#### 6. Set Up SSL with Let's Encrypt

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

#### 7. Configure Firewall

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

## Docker Installation (Alternative)

### Using Docker Compose

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: containerstacks
      POSTGRES_USER: containerstacks
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  app:
    build: .
    ports:
      - "3001:3001"
      - "5173:5173"
    environment:
      DATABASE_URL: postgresql://containerstacks:secure_password@postgres:5432/containerstacks
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - .:/app
      - /app/node_modules

volumes:
  postgres_data:
  redis_data:
```

Start with Docker:
```bash
docker-compose up -d
```

## Cloud Provider Setup

### Required API Credentials

#### Linode API Token
1. Log in to [Linode Cloud Manager](https://cloud.linode.com/)
2. Go to Profile → API Tokens
3. Create a new Personal Access Token
4. Add to `.env`:
```env
LINODE_API_TOKEN=your-linode-api-token
```

#### PayPal Credentials
1. Create a [PayPal Developer](https://developer.paypal.com/) account
2. Create a REST API app
3. Get Client ID and Secret
4. Add to `.env`:
```env
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
PAYPAL_MODE=sandbox  # or 'live' for production
```

#### SMTP2GO Email
1. Sign up at [SMTP2GO](https://www.smtp2go.com/)
2. Get API credentials
3. Add to `.env`:
```env
SMTP2GO_API_KEY=your-api-key
FROM_EMAIL=noreply@your-domain.com
FROM_NAME=YourCompanyName
```

## Post-Installation Tasks

### 1. Configure Provider Settings

Log in as admin and navigate to:
- Admin → Providers
- Add Linode API credentials
- Configure allowed regions

### 2. Create VPS and Container Plans

Navigate to:
- Admin → VPS Plans
- Admin → Container Plans

Define plans with pricing and specifications.

### 3. Test Email Delivery

Create a test support ticket to verify email notifications work.

### 4. Set Up Backups

Configure automated backups:
```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * pg_dump containerstacks | gzip > /backups/containerstacks-$(date +\%Y\%m\%d).sql.gz
```

### 5. Monitor Logs

```bash
# View PM2 logs
pm2 logs

# View Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## Upgrading

To upgrade ContainerStacks:

```bash
# Pull latest code
git pull origin main

# Install new dependencies
npm install

# Run new migrations
node scripts/run-migration.js

# Rebuild
npm run build

# Restart with PM2
npm run pm2:reload
```

## Troubleshooting Installation

### Common Issues

#### Port Already in Use
```bash
npm run kill-ports
```

#### Database Connection Failed
Check PostgreSQL is running:
```bash
sudo systemctl status postgresql
```

#### Permission Denied
Ensure user has database permissions:
```sql
GRANT ALL PRIVILEGES ON DATABASE containerstacks TO containerstacks_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO containerstacks_user;
```

#### Node Version Issues
Use nvm to manage Node versions:
```bash
nvm install 20
nvm use 20
```

### Getting Help

- Check [Troubleshooting Guide](../troubleshooting/common-issues.md)
- Review [GitHub Issues](https://github.com/skyvps360/containerstacks/issues)
- Create a new issue with installation logs

---

**Next**: [Configuration Guide](./configuration.md) | [First Steps](./first-steps.md)
