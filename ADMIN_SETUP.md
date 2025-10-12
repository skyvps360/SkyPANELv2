# Admin User Setup

This document provides instructions for setting up and managing the default admin user for ContainerStacks.

## Default Admin Credentials

- **Email**: `admin@containerstacks.com`
- **Password**: `admin123`
- **Role**: `admin`

## First Login Instructions

1. Navigate to the login page at `http://localhost:5173/login`
2. Enter the default credentials above
3. **IMMEDIATELY** change the password after first login for security

## Database Setup

### Running the Seed Script

To create the default admin user, run one of the following commands:

**Using npm script (recommended):**
```bash
npm run seed:admin
```

**Using Node.js directly:**
```bash
node scripts/seed-admin.js
```

This will create:
- Default admin user with hashed password
- Default organization ("ContainerStacks Admin")
- Organization membership for the admin user
- Initial wallet with $1000 USD balance

### Prerequisites

Make sure you have the following environment variables set in your `.env` file:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The script will automatically check if the admin user already exists and skip creation if found.

## Security Recommendations

### 1. Change Default Password
After first login, immediately change the password:
1. Go to Settings → Account
2. Update your password to a strong, unique password
3. Save changes

### 2. Update Admin Email (Optional)
You can change the admin email address:
1. Go to Settings → Account
2. Update the email address
3. Verify the new email address

### 3. Create Additional Admin Users
For production use, create additional admin users instead of sharing the default account:
1. Go to Settings → Users
2. Invite new users with admin privileges
3. Disable or delete the default admin account if desired

## Script Features

The `seed-admin.js` script includes:

- ✅ **Environment validation**: Checks for required Supabase credentials
- ✅ **Idempotent operation**: Safe to run multiple times
- ✅ **Comprehensive setup**: Creates user, organization, membership, and wallet
- ✅ **Error handling**: Detailed error messages and graceful failure handling
- ✅ **Status verification**: Confirms successful creation of all components

## Troubleshooting

### Issue: Cannot login with default credentials
**Solution:**
1. Run the seed script: `npm run seed:admin`
2. Check the script output for any errors
3. Verify environment variables are set correctly

### Issue: Script fails with environment errors
**Solution:**
1. Ensure `.env` file exists with required variables:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
2. Restart the application after updating environment variables

### Issue: Admin user exists but cannot access admin features
**Solution:**
1. Run the seed script again - it will verify existing setup
2. Check the console output for any missing components
3. Contact support if issues persist

## Production Considerations

### 1. Environment Variables
Ensure these are properly set in production:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### 2. Security Hardening
- Change default password immediately
- Consider disabling the default admin account after creating other admin users
- Use strong, unique passwords
- Enable two-factor authentication if available
- Regularly audit admin user access

### 3. Backup and Recovery
- Regularly backup your Supabase database
- Test admin user recovery procedures
- Document any custom admin user configurations

---

**Note:** This setup is designed for development and testing. For production deployments, follow additional security best practices and consider using more sophisticated user management systems.