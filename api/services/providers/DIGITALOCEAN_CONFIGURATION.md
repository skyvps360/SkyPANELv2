# DigitalOcean Provider Configuration Guide

## Overview

This guide covers DigitalOcean-specific configuration options, features, and best practices for the multi-provider VPS system.

## API Token Setup

### Obtaining a DigitalOcean API Token

1. Log in to your DigitalOcean account
2. Navigate to **API** → **Tokens/Keys**
3. Click **Generate New Token**
4. Enter a token name (e.g., "SkyPanel Integration")
5. Select **Read and Write** scope
6. Copy the generated token (it will only be shown once)

### Configuring the Token in SkyPanel

1. Navigate to **Admin** → **Providers**
2. Click **Add Provider**
3. Fill in the form:
   - **Name:** DigitalOcean Production
   - **Type:** digitalocean
   - **API Token:** Paste your token
4. Click **Save**
5. The system will validate the token automatically

## Droplet Configuration Options

### Basic Options

#### Label (Required)
- **Field:** `label`
- **Type:** String
- **Description:** Human-readable name for the Droplet
- **Constraints:** 
  - Must be unique within your account
  - 1-255 characters
  - Alphanumeric, dashes, and underscores only
- **Example:** `web-server-01`

#### Region (Required)
- **Field:** `region`
- **Type:** String (slug)
- **Description:** Datacenter location for the Droplet
- **Available Regions:**
  - `nyc1`, `nyc3` - New York
  - `sfo3` - San Francisco
  - `ams3` - Amsterdam
  - `sgp1` - Singapore
  - `lon1` - London
  - `fra1` - Frankfurt
  - `tor1` - Toronto
  - `blr1` - Bangalore
- **Example:** `nyc3`

#### Size (Required)
- **Field:** `type`
- **Type:** String (slug)
- **Description:** Droplet size/plan
- **Common Sizes:**
  - `s-1vcpu-1gb` - Basic: 1 vCPU, 1GB RAM, 25GB SSD ($6/mo)
  - `s-1vcpu-2gb` - Basic: 1 vCPU, 2GB RAM, 50GB SSD ($12/mo)
  - `s-2vcpu-2gb` - Basic: 2 vCPU, 2GB RAM, 60GB SSD ($18/mo)
  - `s-2vcpu-4gb` - Basic: 2 vCPU, 4GB RAM, 80GB SSD ($24/mo)
  - `c-2` - CPU-Optimized: 2 vCPU, 4GB RAM ($42/mo)
  - `m-2vcpu-16gb` - Memory-Optimized: 2 vCPU, 16GB RAM ($90/mo)
- **Example:** `s-1vcpu-1gb`

#### Image (Required)
- **Field:** `image`
- **Type:** String (slug or ID)
- **Description:** Operating system or application image
- **Distribution Images:**
  - `ubuntu-22-04-x64` - Ubuntu 22.04 LTS
  - `ubuntu-20-04-x64` - Ubuntu 20.04 LTS
  - `debian-11-x64` - Debian 11
  - `debian-10-x64` - Debian 10
  - `centos-stream-9-x64` - CentOS Stream 9
  - `fedora-38-x64` - Fedora 38
  - `rocky-9-x64` - Rocky Linux 9
- **Example:** `ubuntu-22-04-x64`

#### Root Password (Required)
- **Field:** `rootPassword`
- **Type:** String
- **Description:** Root user password
- **Constraints:**
  - Minimum 8 characters
  - Must include uppercase, lowercase, and numbers
  - Special characters recommended
- **Example:** `SecureP@ssw0rd123`

### SSH Keys (Optional)

- **Field:** `sshKeys`
- **Type:** Array of strings (SSH key IDs)
- **Description:** SSH keys to add to the Droplet for authentication
- **Setup:**
  1. Add SSH keys to your DigitalOcean account first
  2. Get the key ID from the DigitalOcean API or dashboard
  3. Pass the IDs as strings in the array
- **Example:** `["12345", "67890"]`

### Networking Options

#### IPv6 (Optional)
- **Field:** `ipv6`
- **Type:** Boolean
- **Default:** `false`
- **Description:** Enable IPv6 networking
- **Benefits:**
  - Future-proof networking
  - Additional IP addresses
  - Better routing in some regions
- **Cost:** Free
- **Example:** `true`

#### Private Networking / VPC (Optional)
- **Field:** `vpc_uuid`
- **Type:** String (UUID) or null
- **Description:** Virtual Private Cloud for private networking
- **Use Cases:**
  - Database servers
  - Internal microservices
  - Multi-tier applications
- **Setup:**
  1. Create a VPC in DigitalOcean dashboard
  2. Copy the VPC UUID
  3. Pass it in the configuration
- **Example:** `"47e5c00a-42c6-4a28-9c4d-6c8c6e6e6e6e"`

### Backup and Monitoring

#### Backups (Optional)
- **Field:** `backups`
- **Type:** Boolean
- **Default:** `false`
- **Description:** Enable automated weekly backups
- **Features:**
  - Weekly backups retained for 4 weeks
  - Automatic rotation
  - One-click restore
- **Cost:** 20% of Droplet price
- **Example:** `true`

#### Monitoring (Optional)
- **Field:** `monitoring`
- **Type:** Boolean
- **Default:** `false`
- **Description:** Enable DigitalOcean monitoring agent
- **Metrics Collected:**
  - CPU usage
  - Memory usage
  - Disk I/O
  - Network bandwidth
  - Disk usage
- **Cost:** Free
- **Example:** `true`

### Tags (Optional)

- **Field:** `tags`
- **Type:** Array of strings
- **Description:** Tags for organizing and filtering Droplets
- **Use Cases:**
  - Environment labels (production, staging, development)
  - Application grouping
  - Cost tracking
  - Automation targeting
- **Constraints:**
  - Maximum 255 characters per tag
  - Lowercase letters, numbers, dashes, and underscores only
- **Example:** `["production", "web", "wordpress"]`

## 1-Click Applications (Marketplace)

DigitalOcean offers pre-configured application images through their Marketplace.

### Popular Applications

#### WordPress
- **Slug:** `wordpress`
- **Description:** Popular CMS platform
- **Base Image:** Ubuntu 20.04
- **Includes:** WordPress, MySQL, Apache
- **Min Size:** `s-1vcpu-1gb`

#### Docker
- **Slug:** `docker`
- **Description:** Container platform
- **Base Image:** Ubuntu 20.04
- **Includes:** Docker CE, Docker Compose
- **Min Size:** `s-1vcpu-1gb`

#### LAMP Stack
- **Slug:** `lamp`
- **Description:** Linux, Apache, MySQL, PHP
- **Base Image:** Ubuntu 20.04
- **Includes:** Apache 2.4, MySQL 8.0, PHP 8.0
- **Min Size:** `s-1vcpu-1gb`

#### Node.js
- **Slug:** `nodejs`
- **Description:** JavaScript runtime
- **Base Image:** Ubuntu 20.04
- **Includes:** Node.js LTS, npm, PM2
- **Min Size:** `s-1vcpu-1gb`

#### MongoDB
- **Slug:** `mongodb`
- **Description:** NoSQL database
- **Base Image:** Ubuntu 20.04
- **Includes:** MongoDB Community Edition
- **Min Size:** `s-2vcpu-2gb`

### Using Marketplace Apps

When creating a Droplet with a marketplace app:

1. Select the app from the marketplace list
2. The `image` field will be automatically set to the app's image slug
3. The app will be pre-installed and configured on first boot
4. Access credentials are typically emailed or available in `/root/.digitalocean_password`

**Example Configuration:**
```json
{
  "label": "wordpress-site",
  "type": "s-1vcpu-1gb",
  "region": "nyc3",
  "image": "wordpress-20-04",
  "appSlug": "wordpress",
  "rootPassword": "SecurePassword123!",
  "monitoring": true,
  "backups": true
}
```

## Droplet Actions

### Supported Actions

#### Power On / Boot
- **Action:** `boot` or `power_on`
- **Description:** Start a powered-off Droplet
- **Duration:** ~30 seconds
- **Billing:** Resumes hourly billing

#### Shutdown
- **Action:** `shutdown`
- **Description:** Gracefully shut down the Droplet (sends ACPI signal)
- **Duration:** ~30 seconds
- **Billing:** Continues until powered off

#### Power Off
- **Action:** `power_off`
- **Description:** Force power off (equivalent to pulling the plug)
- **Duration:** Immediate
- **Billing:** Continues until powered off
- **Warning:** May cause data corruption

#### Reboot
- **Action:** `reboot`
- **Description:** Gracefully restart the Droplet
- **Duration:** ~60 seconds
- **Billing:** No interruption

#### Power Cycle
- **Action:** `power_cycle`
- **Description:** Force restart (equivalent to pressing reset button)
- **Duration:** ~60 seconds
- **Billing:** No interruption
- **Warning:** May cause data corruption

#### Delete
- **Action:** `delete`
- **Description:** Permanently delete the Droplet
- **Duration:** Immediate
- **Billing:** Stops immediately
- **Warning:** Cannot be undone

## Rate Limits

DigitalOcean enforces the following rate limits:

- **5,000 requests per hour** per API token
- **250 requests per minute** per API token

The system automatically handles rate limiting with:
- Exponential backoff retry logic
- Request queuing
- Rate limit header monitoring

## Best Practices

### Security

1. **Use SSH Keys:** Always configure SSH keys instead of relying solely on passwords
2. **Enable Monitoring:** Track resource usage and detect anomalies
3. **Use VPCs:** Isolate sensitive services on private networks
4. **Regular Backups:** Enable automated backups for production systems
5. **Update Regularly:** Keep OS and applications updated

### Performance

1. **Choose Appropriate Size:** Start small and scale up as needed
2. **Select Nearby Region:** Choose a region close to your users
3. **Enable IPv6:** Improve routing and reduce latency
4. **Monitor Resources:** Use monitoring to identify bottlenecks

### Cost Optimization

1. **Right-Size Droplets:** Don't over-provision resources
2. **Use Snapshots:** Create snapshots instead of keeping idle Droplets
3. **Delete Unused Resources:** Remove Droplets you're not using
4. **Consider Reserved Instances:** For long-term workloads (not yet supported)

### Reliability

1. **Enable Backups:** Protect against data loss
2. **Use Multiple Regions:** Distribute workload geographically
3. **Implement Health Checks:** Monitor application availability
4. **Plan for Failures:** Design for redundancy

## Troubleshooting

### Common Issues

#### Droplet Creation Fails

**Symptom:** Error creating Droplet

**Possible Causes:**
- Invalid API token
- Insufficient account balance
- Region capacity issues
- Invalid configuration

**Solutions:**
1. Verify API token is correct and has write permissions
2. Check DigitalOcean account balance
3. Try a different region
4. Validate all configuration parameters

#### Cannot Connect to Droplet

**Symptom:** SSH connection fails

**Possible Causes:**
- Droplet still provisioning
- Firewall blocking connections
- Incorrect SSH key
- Wrong IP address

**Solutions:**
1. Wait for Droplet status to be "active"
2. Check DigitalOcean Cloud Firewall rules
3. Verify SSH key was added correctly
4. Confirm you're using the correct IP address

#### Rate Limit Exceeded

**Symptom:** API calls fail with 429 error

**Possible Causes:**
- Too many API requests in short time
- Multiple users sharing same token

**Solutions:**
1. Wait for rate limit to reset (shown in error response)
2. Implement request throttling
3. Use separate API tokens for different environments

## API Reference

For detailed API documentation, see:
- [DigitalOcean API Documentation](https://docs.digitalocean.com/reference/api/)
- [Droplet API Reference](https://docs.digitalocean.com/reference/api/api-reference/#tag/Droplets)
- [SkyPanel API Documentation](./API_DOCUMENTATION.md)

## Support

For DigitalOcean-specific issues:
- [DigitalOcean Community](https://www.digitalocean.com/community)
- [DigitalOcean Support](https://www.digitalocean.com/support)
- [DigitalOcean Status](https://status.digitalocean.com/)

For SkyPanel integration issues:
- Check the [API Documentation](./API_DOCUMENTATION.md)
- Review the [Provider Service README](./README.md)
- Contact your system administrator
