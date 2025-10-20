# Complete API Reference

This document provides a comprehensive reference for all API endpoints in ContainerStacks.

## Base URL

- Development: `http://localhost:3001/api`
- Production: `https://your-domain.com/api`

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Get a token by logging in through `/api/auth/login`.

## Common Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": { ... }
}
```

## Authentication Endpoints

### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully"
}
```

### POST /api/auth/login
Login and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user"
  }
}
```

### POST /api/auth/logout
Logout current user.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### POST /api/auth/refresh
Refresh JWT token.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "token": "new-jwt-token",
  "user": { ... }
}
```

### GET /api/auth/me
Get current user profile.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user",
  "organizationId": 1
}
```

### POST /api/auth/forgot-password
Request password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

### POST /api/auth/reset-password
Reset password with token.

**Request Body:**
```json
{
  "token": "reset-token-here",
  "newPassword": "newSecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

## VPS Endpoints

### GET /api/vps
List all VPS instances for the current organization.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status

**Response:**
```json
{
  "vpsInstances": [
    {
      "id": 1,
      "linodeId": 12345,
      "label": "my-server",
      "region": "us-east",
      "status": "running",
      "ipv4": "192.0.2.1",
      "ipv6": "2001:db8::1",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 48,
    "itemsPerPage": 10
  }
}
```

### GET /api/vps/:id
Get details of a specific VPS instance.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": 1,
  "linodeId": 12345,
  "label": "my-server",
  "region": "us-east",
  "plan": {
    "name": "Dedicated 4GB",
    "vcpus": 2,
    "memoryMb": 4096,
    "diskGb": 80
  },
  "status": "running",
  "ipv4": "192.0.2.1",
  "ipv6": "2001:db8::1",
  "image": "linode/ubuntu22.04",
  "createdAt": "2025-01-01T00:00:00Z"
}
```

### POST /api/vps
Create a new VPS instance.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "planId": 1,
  "region": "us-east",
  "label": "my-new-server",
  "image": "linode/ubuntu22.04",
  "rootPassword": "secureRootPassword123",
  "stackscriptId": null,
  "stackscriptData": null
}
```

**Response:**
```json
{
  "success": true,
  "vpsInstance": {
    "id": 2,
    "linodeId": 12346,
    "label": "my-new-server",
    "status": "provisioning"
  }
}
```

### DELETE /api/vps/:id
Delete a VPS instance.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "VPS instance deleted successfully"
}
```

### POST /api/vps/:id/reboot
Reboot a VPS instance.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "VPS reboot initiated"
}
```

### POST /api/vps/:id/resize
Resize a VPS instance.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "planId": 2
}
```

**Response:**
```json
{
  "success": true,
  "message": "VPS resize initiated"
}
```

### GET /api/vps/:id/stats
Get resource usage statistics for a VPS.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "cpu": {
    "usage": 23.5,
    "history": [...]
  },
  "network": {
    "in": 1024000,
    "out": 512000
  },
  "io": {
    "read": 100000,
    "write": 50000
  }
}
```

### GET /api/vps/plans
List available VPS plans.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "plans": [
    {
      "id": 1,
      "name": "Dedicated 4GB",
      "vcpus": 2,
      "memoryMb": 4096,
      "diskGb": 80,
      "transferGb": 4000,
      "hourlyRate": "0.0300",
      "monthlyRate": "20.00",
      "availableRegions": ["us-east", "us-west", "eu-central"]
    }
  ]
}
```

### GET /api/vps/regions
List available regions.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "regions": [
    {
      "id": "us-east",
      "label": "Newark, NJ",
      "country": "US"
    }
  ]
}
```

### GET /api/vps/images
List available OS images.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "images": [
    {
      "id": "linode/ubuntu22.04",
      "label": "Ubuntu 22.04 LTS",
      "vendor": "Ubuntu"
    }
  ]
}
```

## Container Endpoints

### GET /api/containers
List all containers for the current organization.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "containers": [
    {
      "id": 1,
      "containerId": "abc123",
      "name": "my-app",
      "image": "nginx:latest",
      "status": "running",
      "ports": {"80/tcp": 8080},
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### POST /api/containers
Create a new container.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "my-app",
  "image": "nginx:latest",
  "planId": 1,
  "ports": {"80/tcp": 8080},
  "environment": {"ENV": "production"},
  "volumes": {"/data": "/host/data"}
}
```

### DELETE /api/containers/:id
Delete a container.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Container deleted successfully"
}
```

### POST /api/containers/:id/start
Start a container.

**Headers:** `Authorization: Bearer <token>`

### POST /api/containers/:id/stop
Stop a container.

**Headers:** `Authorization: Bearer <token>`

### POST /api/containers/:id/restart
Restart a container.

**Headers:** `Authorization: Bearer <token>`

### GET /api/containers/:id/logs
Get container logs.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `tail` (optional): Number of lines to return

## Billing Endpoints

### GET /api/invoices
List invoices for the current organization.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page`, `limit`, `status`

**Response:**
```json
{
  "invoices": [
    {
      "id": 1,
      "invoiceNumber": "INV-2025-001",
      "amount": "50.00",
      "status": "paid",
      "billingPeriodStart": "2025-01-01T00:00:00Z",
      "billingPeriodEnd": "2025-01-31T23:59:59Z",
      "createdAt": "2025-02-01T00:00:00Z"
    }
  ]
}
```

### GET /api/invoices/:id
Get invoice details.

**Headers:** `Authorization: Bearer <token>`

### GET /api/payments/wallet
Get wallet balance.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "balance": "150.00",
  "currency": "USD"
}
```

### POST /api/payments/add-funds
Add funds to wallet via PayPal.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "amount": "100.00"
}
```

**Response:**
```json
{
  "success": true,
  "approvalUrl": "https://paypal.com/checkout?token=..."
}
```

### GET /api/payments/transactions
List payment transactions.

**Headers:** `Authorization: Bearer <token>`

## Support Endpoints

### GET /api/support/tickets
List support tickets.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "tickets": [
    {
      "id": 1,
      "ticketNumber": "TKT-2025-001",
      "subject": "Server not responding",
      "status": "open",
      "priority": "high",
      "createdAt": "2025-01-15T00:00:00Z"
    }
  ]
}
```

### POST /api/support/tickets
Create a new support ticket.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "subject": "Server issue",
  "description": "Detailed description...",
  "category": "technical",
  "priority": "medium"
}
```

### GET /api/support/tickets/:id
Get ticket details and messages.

**Headers:** `Authorization: Bearer <token>`

### POST /api/support/tickets/:id/messages
Add a message to a ticket.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "message": "Here's an update..."
}
```

### PATCH /api/support/tickets/:id
Update ticket status.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "status": "resolved"
}
```

## Admin Endpoints

### GET /api/admin/users
List all users (admin only).

**Headers:** `Authorization: Bearer <token>`

### GET /api/admin/plans
Manage VPS and container plans (admin only).

### POST /api/admin/plans
Create a new plan (admin only).

### PUT /api/admin/plans/:id
Update a plan (admin only).

### DELETE /api/admin/plans/:id
Delete a plan (admin only).

### GET /api/admin/providers
Get provider configurations (admin only).

### PUT /api/admin/providers/:id
Update provider configuration (admin only).

## Activity Endpoints

### GET /api/activity
Get activity logs for current user/organization.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page`, `limit`
- `action`: Filter by action type
- `startDate`, `endDate`: Date range

**Response:**
```json
{
  "activities": [
    {
      "id": 1,
      "action": "vps.create",
      "resourceType": "vps",
      "resourceId": "123",
      "details": {...},
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ]
}
```

## Notification Endpoints

### GET /api/notifications
Get notifications for current user.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `unreadOnly`: boolean

### POST /api/notifications/:id/mark-read
Mark notification as read.

**Headers:** `Authorization: Bearer <token>`

### POST /api/notifications/mark-all-read
Mark all notifications as read.

**Headers:** `Authorization: Bearer <token>`

## Theme Endpoints

### GET /api/theme
Get current theme settings.

**Headers:** `Authorization: Bearer <token>`

### PUT /api/theme
Update theme settings (admin only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "custom-theme",
  "colors": {
    "primary": "#3b82f6",
    "secondary": "#8b5cf6"
  }
}
```

## Health Check

### GET /api/health
Check API health status.

**No authentication required**

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00Z",
  "uptime": 86400,
  "database": "connected",
  "redis": "connected"
}
```

## Rate Limiting

API requests are rate-limited based on user role:

- **Anonymous**: 100 requests per 15 minutes
- **Authenticated users**: 1000 requests per 15 minutes
- **Admin users**: 5000 requests per 15 minutes

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Time when limit resets

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Resource created |
| 400 | Bad request (validation error) |
| 401 | Unauthorized (not authenticated) |
| 403 | Forbidden (not authorized) |
| 404 | Resource not found |
| 429 | Too many requests (rate limited) |
| 500 | Internal server error |

---

**Next**: [Development Guide](../development/setup.md)
