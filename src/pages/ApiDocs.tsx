import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Rocket, ShieldCheck, Sparkles, Terminal } from 'lucide-react';
import { toast } from 'sonner';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BRAND_NAME } from '../lib/brand';

type EndpointDefinition = {
  method: string;
  path: string;
  description: string;
  auth?: boolean;
  body?: unknown;
  params?: Record<string, unknown>;
  response?: unknown;
};

type SectionDefinition = {
  title: string;
  base: string;
  description: string;
  endpoints: EndpointDefinition[];
};

const methodStyles: Record<string, string> = {
  GET: 'bg-emerald-500/10 text-emerald-600',
  POST: 'bg-blue-500/10 text-blue-600',
  PUT: 'bg-amber-500/10 text-amber-600',
  PATCH: 'bg-indigo-500/10 text-indigo-600',
  DELETE: 'bg-red-500/10 text-red-600',
  DEFAULT: 'bg-muted text-foreground',
};

const formatJson = (value: unknown) => JSON.stringify(value, null, 2);

const buildCurlCommand = (base: string, endpoint: EndpointDefinition) => {
  const lines = [`curl -X ${endpoint.method} "${base}${endpoint.path}"`];

  if (endpoint.auth) {
    lines.push('-H "Authorization: Bearer YOUR_TOKEN"');
  }

  if (endpoint.body) {
    lines.push('-H "Content-Type: application/json"');
    lines.push(`-d '${JSON.stringify(endpoint.body)}'`);
  }

  return lines
    .map((line, index) => (index === 0 ? line : `  ${line}`))
    .join(' \\\n');
};

export default function ApiDocs() {
  const apiBase = (import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.host}/api`).replace(/\/$/, '');
  const sections = useMemo<SectionDefinition[]>(() => [
  
      {
        title: 'Auth',
        base: `${apiBase}/auth`,
        description: 'Authentication and user management endpoints',
        endpoints: [
          { 
            method: 'POST', 
            path: '/register', 
            description: 'Register a new user account',
            auth: false,
            body: { email: 'user@example.com', password: 'password123', firstName: 'John', lastName: 'Doe' },
            response: { success: true, message: 'User registered successfully' }
          },
          { 
            method: 'POST', 
            path: '/login', 
            description: 'Login and receive JWT token',
            auth: false,
            body: { email: 'user@example.com', password: 'password123' },
            response: { success: true, token: 'jwt_token_here', user: { id: 1, email: 'user@example.com' } }
          },
          { 
            method: 'POST', 
            path: '/logout', 
            description: 'Logout current user',
            auth: true,
            response: { success: true, message: 'Logged out successfully' }
          },
          { 
            method: 'POST', 
            path: '/verify-email', 
            description: 'Verify user email address (placeholder)',
            auth: false,
            body: { token: 'verification_token_here' },
            response: { success: false, message: 'Email verification not implemented' }
          },
          { 
            method: 'POST', 
            path: '/forgot-password', 
            description: 'Initiate password reset flow (placeholder)',
            auth: false,
            body: { email: 'user@example.com' },
            response: { success: true, message: 'Password reset email sent (not implemented)' }
          },
          { 
            method: 'POST', 
            path: '/reset-password', 
            description: 'Complete password reset (placeholder)',
            auth: false,
            body: { token: 'reset_token', newPassword: 'newpassword123' },
            response: { success: false, error: 'Password reset not implemented' }
          },
          { 
            method: 'POST', 
            path: '/refresh', 
            description: 'Refresh JWT token for current user',
            auth: true,
            response: { success: true, token: 'new_jwt_token_here', user: { id: 1, email: 'user@example.com' } }
          },
          { 
            method: 'GET', 
            path: '/me', 
            description: 'Get current user profile',
            auth: true,
            response: { id: 1, email: 'user@example.com', firstName: 'John', lastName: 'Doe', role: 'user' }
          },
          { 
            method: 'GET', 
            path: '/debug/user', 
            description: 'Debug helper returning database snapshot for current user',
            auth: true,
            response: { user: { id: 1, email: 'user@example.com' }, organization: { id: 1, name: 'My Org' }, debug_info: 'Database snapshot data' }
          },
          { 
            method: 'PUT', 
            path: '/profile', 
            description: 'Update profile fields',
            auth: true,
            body: { firstName: 'John', lastName: 'Smith' },
            response: { success: true, message: 'Profile updated successfully' }
          },
          { 
            method: 'GET', 
            path: '/api-keys', 
            description: 'List user API keys',
            auth: true,
            response: [{ id: 1, name: 'My API Key', key: 'ak_***', created_at: '2024-01-01T00:00:00Z' }]
          },
          { 
            method: 'POST', 
            path: '/api-keys', 
            description: 'Create a new API key',
            auth: true,
            body: { name: 'My New API Key' },
            response: { id: 2, name: 'My New API Key', key: 'ak_1234567890abcdef', created_at: '2024-01-01T00:00:00Z' }
          },
          { 
            method: 'DELETE', 
            path: '/api-keys/:id', 
            description: 'Delete an API key',
            auth: true,
            response: { success: true, message: 'API key deleted successfully' }
          },
          { 
            method: 'GET', 
            path: '/organization', 
            description: 'Get current user organization details',
            auth: true,
            response: { id: 1, name: 'My Company', website: 'https://mycompany.com', address: '123 Main St', taxId: 'TAX123', created_at: '2024-01-01T00:00:00Z' }
          },
          { 
            method: 'PUT', 
            path: '/organization', 
            description: 'Update organization details',
            auth: true,
            body: { name: 'My Company', website: 'https://mycompany.com', address: '123 Main St', taxId: 'TAX123' },
            response: { success: true, message: 'Organization updated successfully', organization: { id: 1, name: 'My Company', website: 'https://mycompany.com' } }
          },
          { 
            method: 'PUT', 
            path: '/password', 
            description: 'Update user password',
            auth: true,
            body: { currentPassword: 'oldpassword123', newPassword: 'newpassword123' },
            response: { success: true, message: 'Password updated successfully' }
          },
          { 
            method: 'PUT', 
            path: '/preferences', 
            description: 'Update user preferences',
            auth: true,
            body: { theme: 'dark', notifications: true, language: 'en' },
            response: { success: true, message: 'Preferences updated successfully' }
          },
        ],
      },
      {
        title: 'Payments',
        base: `${apiBase}/payments`,
        description: 'Payment processing and billing management',
        endpoints: [
          { 
            method: 'POST', 
            path: '/create-payment', 
            description: 'Create a PayPal payment for adding funds to wallet',
            auth: true,
            body: { amount: 50.00, currency: 'USD', description: 'Wallet top-up' },
            response: { success: true, paymentId: 'PAYID-123', approvalUrl: 'https://paypal.com/approve/...' }
          },
          { 
            method: 'POST', 
            path: '/capture-payment/:orderId', 
            description: 'Capture a PayPal payment after user approval',
            auth: true,
            response: { success: true, transactionId: 'TXN-456', status: 'completed', amount: 50.00 }
          },
          { 
            method: 'GET', 
            path: '/wallet/balance', 
            description: 'Get wallet balance for the organization',
            auth: true,
            response: { balance: 150.75, currency: 'USD', last_updated: '2024-01-01T00:00:00Z' }
          },
          { 
            method: 'POST', 
            path: '/wallet/deduct', 
            description: 'Deduct funds from wallet for services',
            auth: true,
            body: { amount: 20.00, description: 'VPS instance creation' },
            response: { success: true, transaction_id: 'txn_456', remaining_balance: 130.75 }
          },
          { 
            method: 'GET', 
            path: '/wallet/transactions', 
            description: 'Get wallet transaction history with pagination',
            auth: true,
            params: { limit: '20', offset: '0' },
            response: { 
              transactions: [
                { id: 'txn_123', type: 'credit', amount: 50.00, description: 'Wallet top-up', date: '2024-01-01T00:00:00Z' },
                { id: 'txn_124', type: 'debit', amount: 20.00, description: 'VPS instance creation', date: '2024-01-01T01:00:00Z' }
              ],
              pagination: { page: 1, limit: 20, total: 45 }
            }
          },
          { 
            method: 'GET', 
            path: '/history', 
            description: 'Get payment history with filtering options',
            auth: true,
            params: { limit: '20', offset: '0', status: 'completed' },
            response: { 
              payments: [
                { id: 'pay_123', amount: 50.00, status: 'completed', date: '2024-01-01T00:00:00Z', description: 'Wallet top-up', currency: 'USD' }
              ],
              pagination: { page: 1, limit: 20, total: 15 }
            }
          },
          { 
            method: 'GET', 
            path: '/transactions/:id', 
            description: 'Get detailed information about a specific transaction',
            auth: true,
            response: { 
              id: 'txn_123', 
              type: 'credit', 
              amount: 50.00, 
              description: 'Wallet top-up', 
              date: '2024-01-01T00:00:00Z',
              status: 'completed',
              paypal_order_id: 'ORDER-123',
              organization_id: 'org_456'
            }
          },
          { 
            method: 'POST', 
            path: '/refund', 
            description: 'Process a refund to a user via PayPal',
            auth: true,
            body: { 
              email: 'user@example.com', 
              amount: 25.00, 
              currency: 'USD', 
              reason: 'Service cancellation' 
            },
            response: { 
              success: true, 
              refund_id: 'REFUND-123', 
              status: 'pending',
              message: 'Refund initiated successfully'
            }
          },
        ],
      },
      {
        title: 'Containers',
        base: `${apiBase}/containers`,
        description: 'Container management and deployment operations',
        endpoints: [
          { 
            method: 'GET', 
            path: '/', 
            description: 'List all user containers',
            auth: true,
            response: [{ id: 'cont_123', name: 'my-app', status: 'running', image: 'nginx:latest', created_at: '2024-01-01T00:00:00Z' }]
          },
          { 
            method: 'POST', 
            path: '/', 
            description: 'Create and deploy new container',
            auth: true,
            body: { name: 'my-app', image: 'nginx:latest', port: 80, environment: { NODE_ENV: 'production' } },
            response: { id: 'cont_123', name: 'my-app', status: 'creating', message: 'Container deployment started' }
          },
          { 
            method: 'GET', 
            path: '/:id', 
            description: 'Get detailed container information',
            auth: true,
            response: { id: 'cont_123', name: 'my-app', status: 'running', image: 'nginx:latest', port: 80, url: 'https://my-app.apps.skypanelv2.com' }
          },
          { 
            method: 'POST', 
            path: '/:id/start', 
            description: 'Start stopped container',
            auth: true,
            response: { success: true, message: 'Container started successfully' }
          },
          { 
            method: 'POST', 
            path: '/:id/stop', 
            description: 'Stop running container',
            auth: true,
            response: { success: true, message: 'Container stopped successfully' }
          },
          { 
            method: 'GET', 
            path: '/:id/logs', 
            description: 'Get container logs',
            auth: true,
            response: { logs: ['2024-01-01 00:00:00 Starting nginx...', '2024-01-01 00:00:01 Server ready'] }
          },
          { 
            method: 'DELETE', 
            path: '/:id', 
            description: 'Delete container permanently',
            auth: true,
            response: { success: true, message: 'Container deleted successfully' }
          },
        ],
      },
      {
        title: 'VPS',
        base: `${apiBase}/vps`,
        description: 'Virtual Private Server management and operations',
        endpoints: [
          {
            method: 'GET',
            path: '/',
            description: 'List all VPS instances for the active organization',
            auth: true,
            response: {
              instances: [
                {
                  id: '2d1ffa7d-9c8a-4f29-8c6a-4fd6f05b7011',
                  provider_instance_id: '55512345',
                  label: 'production-web-1',
                  status: 'running',
                  ip_address: '203.0.113.12',
                  configuration: {
                    type: 'g6-standard-2',
                    region: 'us-east',
                    image: 'ubuntu-24-04-lts'
                  },
                  plan_specs: {
                    vcpus: 2,
                    memory: 4096,
                    disk: 81920,
                    transfer: 4000
                  },
                  plan_pricing: {
                    hourly: 0.027,
                    monthly: 20.0
                  },
                  region_label: 'Newark, NJ'
                }
              ]
            }
          },
          { 
            method: 'POST', 
            path: '/', 
            description: 'Provision a new VPS instance',
            auth: true,
            body: { 
              label: 'production-web-1',
              type: 'g6-standard-2',
              region: 'us-east',
              image: 'ubuntu-24-04-lts',
              rootPassword: 'secure_password123',
              sshKeys: ['ssh-ed25519 AAAAC3Nza... user@laptop'],
              backups: true,
              privateIP: false
            },
            response: { 
              instance: {
                id: '2d1ffa7d-9c8a-4f29-8c6a-4fd6f05b7011',
                provider_instance_id: '55512345',
                status: 'provisioning',
                ip_address: null,
                label: 'production-web-1'
              }
            }
          },
          {
            method: 'GET',
            path: '/:id',
            description: 'Retrieve enriched detail for a specific VPS instance',
            auth: true,
            response: {
              instance: {
                id: '2d1ffa7d-9c8a-4f29-8c6a-4fd6f05b7011',
                providerInstanceId: '55512345',
                label: 'production-web-1',
                status: 'running',
                ipAddress: '203.0.113.12',
                region: 'us-east',
                regionLabel: 'Newark, NJ',
                plan: {
                  id: 'plan_standard_2vcpu',
                  name: 'Standard 2 vCPU',
                  providerPlanId: 'g6-standard-2',
                  specs: { vcpus: 2, memory: 4096, disk: 81920, transfer: 4000 },
                  pricing: { hourly: 0.027, monthly: 20.0, currency: 'USD' }
                },
                metrics: {
                  timeframe: { start: 1728702000000, end: 1728788400000 },
                  cpu: { summary: { average: 18.3, peak: 72.5, last: 21.9 } },
                  network: {
                    inbound: { summary: { average: 1200000, peak: 8200000, last: 1500000 } },
                    outbound: { summary: { average: 950000, peak: 6500000, last: 1100000 } }
                  },
                  io: {
                    read: { summary: { average: 12.4, peak: 44.8, last: 18.1 } },
                    swap: { summary: { average: 0, peak: 0, last: 0 } }
                  }
                },
                transfer: {
                  usedGb: 125.4,
                  quotaGb: 4000,
                  billableGb: 0,
                  utilizationPercent: 3.1
                },
                backups: {
                  enabled: true,
                  available: true,
                  schedule: { day: 'Sunday', window: 'W2' },
                  lastSuccessful: '2024-10-10T04:12:22Z',
                  automatic: [
                    { id: 9876501, label: 'Automatic Backup', created: '2024-10-10T04:12:22Z', status: 'successful', totalSizeMb: 15360 }
                  ],
                  snapshot: null,
                  snapshotInProgress: null
                }
              }
            }
          },
          { 
            method: 'POST', 
            path: '/:id/boot', 
            description: 'Boot/start VPS instance',
            auth: true,
            response: { success: true, message: 'VPS boot initiated' }
          },
          { 
            method: 'POST', 
            path: '/:id/shutdown', 
            description: 'Shutdown VPS instance gracefully',
            auth: true,
            response: { success: true, message: 'VPS shutdown initiated' }
          },
          { 
            method: 'POST', 
            path: '/:id/reboot', 
            description: 'Reboot VPS instance',
            auth: true,
            response: { success: true, message: 'VPS reboot initiated' }
          },
          { 
            method: 'DELETE', 
            path: '/:id', 
            description: 'Delete VPS instance permanently',
            auth: true,
            response: { success: true, message: 'VPS deletion initiated' }
          },
          {
            method: 'GET',
            path: '/apps',
            description: 'List marketplace application blueprints (StackScript wrappers)',
            auth: true,
            response: {
              apps: [
                {
                  slug: 'wordpress-marketplace-app',
                  label: 'Managed WordPress',
                  stackscript_id: 123456,
                  user_defined_fields: [
                    { name: 'db_password', label: 'Database Password', default: null }
                  ]
                }
              ]
            }
          },
          {
            method: 'GET',
            path: '/images',
            description: 'List available base images for VPS creation',
            auth: true,
            response: {
              images: [
                {
                  id: 'ubuntu-24-04-lts',
                  label: 'Ubuntu 24.04 LTS',
                  description: 'Latest Ubuntu LTS release',
                  is_public: true
                }
              ]
            }
          },
          {
            method: 'GET',
            path: '/stackscripts',
            description: 'List available deployment scripts. Supports `configured=true` to return whitelisted scripts.',
            auth: true,
            response: {
              stackscripts: [
                {
                  id: 78901,
                  label: `${BRAND_NAME} WordPress`,
                  description: 'Deploys WordPress with optimal defaults',
                  images: ['ubuntu-24-04-lts'],
                  config: {
                    stackscript_id: 78901,
                    label: 'Managed WordPress',
                    is_enabled: true,
                    display_order: 1
                  }
                }
              ]
            }
          },
          { 
            method: 'POST', 
            path: '/:id/backups/enable', 
            description: 'Enable automatic backups for VPS instance',
            auth: true,
            response: { success: true, message: 'Backups enabled successfully' }
          },
          { 
            method: 'POST', 
            path: '/:id/backups/disable', 
            description: 'Disable automatic backups for VPS instance',
            auth: true,
            response: { success: true, message: 'Backups disabled successfully' }
          },
          { 
            method: 'POST', 
            path: '/:id/backups/schedule', 
            description: 'Update backup schedule for VPS instance',
            auth: true,
            body: { day: 'Sunday', window: 'W2' },
            response: { success: true, message: 'Backup schedule updated successfully' }
          },
          { 
            method: 'POST', 
            path: '/:id/backups/snapshot', 
            description: 'Create manual backup snapshot',
            auth: true,
            body: { label: 'Manual backup before update' },
            response: { success: true, message: 'Snapshot creation initiated', backup_id: 'backup_123' }
          },
          { 
            method: 'POST', 
            path: '/:id/backups/:backupId/restore', 
            description: 'Restore VPS from backup',
            auth: true,
            body: { overwrite: true },
            response: { success: true, message: 'Restore initiated successfully' }
          },
          { 
            method: 'POST', 
            path: '/:id/firewalls/attach', 
            description: 'Attach firewall to VPS instance',
            auth: true,
            body: { firewall_id: 'fw_123' },
            response: { success: true, message: 'Firewall attached successfully' }
          },
          { 
            method: 'POST', 
            path: '/:id/firewalls/detach', 
            description: 'Detach firewall from VPS instance',
            auth: true,
            body: { firewall_id: 'fw_123' },
            response: { success: true, message: 'Firewall detached successfully' }
          },
          { 
            method: 'POST', 
            path: '/:id/networking/rdns', 
            description: 'Update reverse DNS for VPS instance',
            auth: true,
            body: { ip_address: '203.0.113.12', rdns: 'server.example.com' },
            response: { success: true, message: 'Reverse DNS updated successfully' }
          },
          { 
            method: 'PUT', 
            path: '/:id/hostname', 
            description: 'Update VPS hostname',
            auth: true,
            body: { hostname: 'new-server-name' },
            response: { success: true, message: 'Hostname updated successfully' }
          },
        ],
      },
      {
        title: 'Support',
        base: `${apiBase}/support`,
        description: 'Support ticket management and customer service operations',
        endpoints: [
          { 
            method: 'GET', 
            path: '/tickets', 
            description: 'List all support tickets for current user',
            auth: true,
            response: [{ 
              id: 'ticket_123', 
              subject: 'Container deployment issue', 
              status: 'open', 
              priority: 'medium',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T12:00:00Z'
            }]
          },
          { 
            method: 'POST', 
            path: '/tickets', 
            description: 'Create a new support ticket',
            auth: true,
            body: { 
              subject: 'Container deployment issue', 
              message: 'I am having trouble deploying my container...',
              priority: 'medium',
              category: 'technical'
            },
            response: { 
              id: 'ticket_123', 
              subject: 'Container deployment issue', 
              status: 'open',
              message: 'Support ticket created successfully'
            }
          },
          { 
            method: 'GET', 
            path: '/tickets/:id/replies', 
            description: 'Get all replies for a specific support ticket',
            auth: true,
            response: [{ 
              id: 'reply_123', 
              ticket_id: 'ticket_123',
              message: 'Thank you for contacting support. We are looking into your issue.',
              author: 'support@skypanelv2.com',
              author_type: 'staff',
              created_at: '2024-01-01T13:00:00Z'
            }]
          },
          { 
            method: 'POST', 
            path: '/tickets/:id/replies', 
            description: 'Add a reply to a support ticket',
            auth: true,
            body: { 
              message: 'I tried the suggested solution but the issue persists...'
            },
            response: { 
              id: 'reply_124', 
              ticket_id: 'ticket_123',
              message: 'Reply added successfully',
              created_at: '2024-01-01T14:00:00Z'
            }
          },
          { 
            method: 'GET', 
            path: '/tickets/:id/stream', 
            description: 'Real-time Server-Sent Events (SSE) stream for ticket updates and replies. Token passed via query parameter.',
            auth: true,
            params: { token: 'your_jwt_token' },
            response: { 
              type: 'event-stream',
              events: [
                'data: {"type":"connected","message":"Connected to ticket stream"}',
                'data: {"type":"ticket_message","ticket_id":"ticket_123","message_id":"msg_456","message":"New reply","is_staff_reply":true,"created_at":"2024-01-01T14:30:00Z"}',
                'data: {"type":"ticket_status_change","ticket_id":"ticket_123","new_status":"resolved"}'
              ]
            }
          },
        ],
      },
      {
        title: 'Notifications',
        base: `${apiBase}/notifications`,
        description: 'Real-time notification system for activity updates and alerts',
        endpoints: [
          { 
            method: 'GET', 
            path: '/stream', 
            description: 'Server-Sent Events (SSE) stream for real-time notifications. Token passed via query parameter.',
            auth: true,
            params: { token: 'your_jwt_token' },
            response: { 
              type: 'event-stream',
              events: [
                'data: {"type":"connected","message":"Notification stream connected"}',
                'data: {"type":"notification","data":{"id":"notif_123","user_id":"user_456","event_type":"vps.created","entity_type":"vps","message":"VPS instance created successfully","status":"success","created_at":"2024-01-01T15:00:00Z","is_read":false}}',
                ':heartbeat (every 30 seconds)'
              ]
            }
          },
          { 
            method: 'GET', 
            path: '/unread-count', 
            description: 'Get count of unread notifications for current user',
            auth: true,
            response: { count: 5 }
          },
          { 
            method: 'GET', 
            path: '/unread', 
            description: 'Get recent unread notifications (default limit: 20, max: 100)',
            auth: true,
            params: { limit: '20' },
            response: { 
              notifications: [
                {
                  id: 'notif_123',
                  user_id: 'user_456',
                  organization_id: 'org_789',
                  event_type: 'vps.created',
                  entity_type: 'vps',
                  entity_id: 'vps_001',
                  message: 'VPS instance created successfully',
                  status: 'success',
                  metadata: { instance_name: 'production-web-1' },
                  created_at: '2024-01-01T15:00:00Z',
                  is_read: false,
                  read_at: null
                }
              ]
            }
          },
          { 
            method: 'GET', 
            path: '/', 
            description: 'Get all notifications (read and unread) with pagination',
            auth: true,
            params: { limit: '50', offset: '0' },
            response: { 
              notifications: [
                {
                  id: 'notif_123',
                  user_id: 'user_456',
                  event_type: 'container.deployed',
                  entity_type: 'container',
                  message: 'Container deployed successfully',
                  status: 'success',
                  created_at: '2024-01-01T14:00:00Z',
                  is_read: true,
                  read_at: '2024-01-01T14:05:00Z'
                }
              ],
              pagination: { page: 1, limit: 50, total: 125 }
            }
          },
          { 
            method: 'PATCH', 
            path: '/:id/read', 
            description: 'Mark a specific notification as read',
            auth: true,
            response: { 
              success: true, 
              notification: {
                id: 'notif_123',
                is_read: true,
                read_at: '2024-01-01T16:00:00Z'
              }
            }
          },
          { 
            method: 'PATCH', 
            path: '/read-all', 
            description: 'Mark all notifications as read for current user',
            auth: true,
            response: { 
              success: true, 
              message: 'All notifications marked as read',
              count: 12
            }
          },
        ],
      },
      {
        title: 'Activity',
        base: `${apiBase}/activity`,
        description: 'Activity logging and audit trail for user and organization actions',
        endpoints: [
          { 
            method: 'GET', 
            path: '/recent', 
            description: 'Get recent activity for current user or organization',
            auth: true,
            response: [{ 
              id: 'activity_123', 
              action: 'container.created', 
              resource: 'my-app',
              user: 'john@example.com',
              timestamp: '2024-01-01T00:00:00Z',
              details: { container_id: 'cont_123', image: 'nginx:latest' }
            }]
          },
          { 
            method: 'GET', 
            path: '/', 
            description: 'List all activity logs with pagination (organization scoped)',
            auth: true,
            response: { 
              activities: [{ 
                id: 'activity_123', 
                action: 'vps.created', 
                resource: 'my-server',
                user: 'admin@example.com',
                timestamp: '2024-01-01T00:00:00Z'
              }],
              pagination: { page: 1, limit: 20, total: 150 }
            }
          },
          { 
            method: 'GET', 
            path: '/summary', 
            description: 'Get activity summary statistics',
            auth: true,
            response: { 
              total_actions: 1250,
              actions_today: 45,
              top_actions: [
                { action: 'container.created', count: 120 },
                { action: 'vps.boot', count: 85 }
              ]
            }
          },
          { 
            method: 'GET', 
            path: '/export', 
            description: 'Export activity logs as CSV or JSON',
            auth: true,
            response: { 
              download_url: 'https://api.skypanelv2.com/downloads/activity_export_123.csv',
              expires_at: '2024-01-01T23:59:59Z'
            }
          },
        ],
      },
      {
        title: 'Admin',
        base: `${apiBase}/admin`,
        description: 'Administrative operations for platform management (admin access required)',
        endpoints: [
          { 
            method: 'GET', 
            path: '/tickets', 
            description: 'List all support tickets across all users',
            auth: true,
            response: [{ 
              id: 'ticket_123', 
              subject: 'Container issue', 
              status: 'open', 
              user_email: 'user@example.com',
              created_at: '2024-01-01T00:00:00Z'
            }]
          },
          { 
            method: 'PATCH', 
            path: '/tickets/:id/status', 
            description: 'Update support ticket status',
            auth: true,
            body: { status: 'resolved' },
            response: { success: true, message: 'Ticket status updated' }
          },
          { 
            method: 'DELETE', 
            path: '/tickets/:id', 
            description: 'Delete support ticket',
            auth: true,
            response: { success: true, message: 'Ticket deleted' }
          },
          { 
            method: 'GET', 
            path: '/tickets/:id/replies', 
            description: 'Get all replies for a specific support ticket (admin view)',
            auth: true,
            response: [{ 
              id: 'reply_123', 
              ticket_id: 'ticket_123',
              message: 'Thank you for contacting support. We are looking into your issue.',
              sender_type: 'admin',
              sender_name: 'Support Team',
              created_at: '2024-01-01T13:00:00Z'
            }]
          },
          { 
            method: 'POST', 
            path: '/tickets/:id/replies', 
            description: 'Reply to a support ticket as admin',
            auth: true,
            body: { message: 'Thank you for contacting support...' },
            response: { success: true, message: 'Reply added to ticket' }
          },
          { 
            method: 'GET', 
            path: '/plans', 
            description: 'List all VPS plans',
            auth: true,
            response: [{ 
              id: 'plan_123', 
              name: 'Nanode 1GB', 
              memory: 1024, 
              vcpus: 1, 
              disk: 25000,
              price: 5.00
            }]
          },
          { 
            method: 'POST', 
            path: '/plans', 
            description: 'Create new VPS plan',
            auth: true,
            body: { 
              name: 'Custom Plan', 
              memory: 2048, 
              vcpus: 2, 
              disk: 50000,
              price: 10.00
            },
            response: { id: 'plan_124', message: 'VPS plan created successfully' }
          },
          { 
            method: 'PUT', 
            path: '/plans/:id', 
            description: 'Update existing VPS plan',
            auth: true,
            body: { price: 12.00 },
            response: { success: true, message: 'VPS plan updated' }
          },
          { 
            method: 'DELETE', 
            path: '/plans/:id', 
            description: 'Delete VPS plan',
            auth: true,
            response: { success: true, message: 'VPS plan deleted' }
          },
          { 
            method: 'GET', 
            path: '/providers', 
            description: 'List all cloud providers',
            auth: true,
            response: [{ 
              id: 'provider_123', 
              name: 'Linode', 
              type: 'linode',
              status: 'active'
            }]
          },
          { 
            method: 'POST', 
            path: '/providers', 
            description: 'Create new cloud provider',
            auth: true,
            body: { 
              name: 'AWS', 
              type: 'aws', 
              api_key: 'aws_key_123',
              secret: 'aws_secret_123'
            },
            response: { id: 'provider_124', message: 'Provider created successfully' }
          },
          { 
            method: 'PUT', 
            path: '/providers/:id', 
            description: 'Update cloud provider configuration',
            auth: true,
            body: { status: 'inactive' },
            response: { success: true, message: 'Provider updated' }
          },
          { 
            method: 'DELETE', 
            path: '/providers/:id', 
            description: 'Delete cloud provider',
            auth: true,
            response: { success: true, message: 'Provider deleted' }
          },
          { 
            method: 'GET', 
            path: '/container/pricing', 
            description: 'Get container pricing configuration',
            auth: true,
            response: { 
              base_price: 0.01, 
              memory_price: 0.005, 
              cpu_price: 0.02,
              storage_price: 0.001
            }
          },
          { 
            method: 'PUT', 
            path: '/container/pricing', 
            description: 'Update container pricing configuration',
            auth: true,
            body: { base_price: 0.015 },
            response: { success: true, message: 'Container pricing updated' }
          },
          { 
            method: 'GET', 
            path: '/networking/rdns', 
            description: 'Get default reverse DNS base domain configuration',
            auth: true,
            response: { 
              base_domain: 'ip.rev.skyvps360.xyz',
              updated_at: '2024-01-01T00:00:00Z'
            }
          },
          { 
            method: 'PUT', 
            path: '/networking/rdns', 
            description: 'Update default reverse DNS base domain',
            auth: true,
            body: { base_domain: 'custom.rdns.domain.com' },
            response: { success: true, message: 'rDNS base domain updated successfully' }
          },
          { 
            method: 'GET', 
            path: '/container/plans', 
            description: 'List all container plans',
            auth: true,
            response: [{ 
              id: 'cplan_123', 
              name: 'Starter', 
              memory: 512, 
              cpu: 0.5,
              price: 5.00
            }]
          },
          { 
            method: 'POST', 
            path: '/container/plans', 
            description: 'Create new container plan',
            auth: true,
            body: { 
              name: 'Pro', 
              memory: 1024, 
              cpu: 1.0,
              price: 10.00
            },
            response: { id: 'cplan_124', message: 'Container plan created' }
          },
          { 
            method: 'PUT', 
            path: '/container/plans/:id', 
            description: 'Update container plan',
            auth: true,
            body: { price: 12.00 },
            response: { success: true, message: 'Container plan updated' }
          },
          { 
            method: 'DELETE', 
            path: '/container/plans/:id', 
            description: 'Delete container plan',
            auth: true,
            response: { success: true, message: 'Container plan deleted' }
          },
          { 
            method: 'GET', 
            path: '/schema/check', 
            description: 'Check database schema health and integrity',
            auth: true,
            response: { 
              status: 'healthy', 
              tables: 15, 
              migrations_pending: 0,
              last_check: '2024-01-01T00:00:00Z'
            }
          },
          { 
            method: 'GET', 
            path: '/upstream/plans', 
            description: 'Fetch available plans from upstream provider',
            auth: true,
            response: [{ 
              id: 'g6-nanode-1', 
              label: 'Nanode 1GB', 
              memory: 1024,
              vcpus: 1,
              price: { hourly: 0.0075, monthly: 5.0 }
            }]
          },
          { 
            method: 'GET', 
            path: '/upstream/regions', 
            description: 'Fetch available regions from upstream provider',
            auth: true,
            response: [{ 
              id: 'us-east', 
              label: 'Newark, NJ', 
              country: 'us',
              status: 'ok'
            }]
          },
          { 
            method: 'GET', 
            path: '/upstream/stackscripts', 
            description: 'Fetch available StackScripts from upstream provider',
            auth: true,
            response: [{ 
              id: 123456, 
              label: 'WordPress Setup', 
              description: 'Automated WordPress installation',
              images: ['ubuntu20.04'],
              deployments_total: 1500,
              is_public: true
            }]
          },
          { 
            method: 'GET', 
            path: '/stackscripts/configs', 
            description: 'Get StackScript configurations',
            auth: true,
            response: [{ 
              id: 'config_123', 
              stackscript_id: 123456,
              label: 'WordPress Pro',
              is_enabled: true,
              display_order: 1,
              created_at: '2024-01-01T00:00:00Z'
            }]
          },
          { 
            method: 'POST', 
            path: '/stackscripts/configs', 
            description: 'Create StackScript configuration',
            auth: true,
            body: { 
              stackscript_id: 123456,
              label: 'Custom WordPress',
              is_enabled: true,
              display_order: 2
            },
            response: { id: 'config_124', message: 'StackScript configuration created successfully' }
          },
          { 
            method: 'PUT', 
            path: '/stackscripts/configs/:id', 
            description: 'Update StackScript configuration',
            auth: true,
            body: { 
              label: 'Updated WordPress Config',
              is_enabled: false
            },
            response: { success: true, message: 'StackScript configuration updated successfully' }
          },
          { 
            method: 'DELETE', 
            path: '/stackscripts/configs/:id', 
            description: 'Delete StackScript configuration',
            auth: true,
            response: { success: true, message: 'StackScript configuration deleted successfully' }
          },
          { 
            method: 'GET', 
            path: '/contact', 
            description: 'Get all contact methods (admin view)',
            auth: true,
            response: [{ 
              id: 1, 
              name: 'Email Support', 
              value: 'support@example.com', 
              type: 'email',
              is_active: true,
              created_at: '2024-01-01T00:00:00Z'
            }]
          },
          { 
            method: 'POST', 
            path: '/contact', 
            description: 'Create new contact method',
            auth: true,
            body: { 
              name: 'Live Chat', 
              value: 'https://chat.example.com', 
              type: 'chat',
              is_active: true
            },
            response: { id: 3, message: 'Contact method created successfully' }
          },
          { 
            method: 'PUT', 
            path: '/contact/:id', 
            description: 'Update existing contact method',
            auth: true,
            body: { 
              name: 'Updated Email Support',
              value: 'newsupport@example.com',
              is_active: false
            },
            response: { success: true, message: 'Contact method updated successfully' }
          },
          { 
            method: 'DELETE', 
            path: '/contact/:id', 
            description: 'Delete contact method',
            auth: true,
            response: { success: true, message: 'Contact method deleted successfully' }
          },
          { 
            method: 'GET', 
            path: '/platform', 
            description: 'Get platform configuration and settings',
            auth: true,
            response: { 
              platform_name: 'SkyPanelV2',
              maintenance_mode: false,
              registration_enabled: true,
              max_containers_per_user: 10,
              max_vps_per_user: 5,
              default_currency: 'USD',
              updated_at: '2024-01-01T00:00:00Z'
            }
          },
          { 
            method: 'PUT', 
            path: '/platform', 
            description: 'Update platform configuration',
            auth: true,
            body: { 
              platform_name: 'Updated Platform Name',
              maintenance_mode: true,
              max_containers_per_user: 15
            },
            response: { success: true, message: 'Platform configuration updated successfully' }
          },
          { 
            method: 'GET', 
            path: '/faq', 
            description: 'Get all FAQ items (admin view with additional details)',
            auth: true,
            response: [{ 
              id: 1, 
              question: 'How do I deploy a container?', 
              answer: 'To deploy a container, navigate to...',
              category_id: 1,
              category_name: 'General',
              sort_order: 1,
              is_active: true,
              view_count: 150,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            }]
          },
          { 
            method: 'POST', 
            path: '/faq', 
            description: 'Create new FAQ item',
            auth: true,
            body: { 
              question: 'What payment methods do you accept?',
              answer: 'We accept credit cards, PayPal, and bank transfers.',
              category_id: 2,
              sort_order: 1,
              is_active: true
            },
            response: { id: 2, message: 'FAQ item created successfully' }
          },
          { 
            method: 'PUT', 
            path: '/faq/:id', 
            description: 'Update existing FAQ item',
            auth: true,
            body: { 
              question: 'Updated question?',
              answer: 'Updated answer with more details.',
              is_active: false
            },
            response: { success: true, message: 'FAQ item updated successfully' }
          },
          { 
            method: 'DELETE', 
            path: '/faq/:id', 
            description: 'Delete FAQ item',
            auth: true,
            response: { success: true, message: 'FAQ item deleted successfully' }
          },
        ],
      },
      {
        title: 'FAQ',
        base: `${apiBase}/faq`,
        description: 'Frequently Asked Questions management',
        endpoints: [
          { 
            method: 'GET', 
            path: '/categories', 
            description: 'Get all FAQ categories',
            auth: false,
            response: [{ 
              id: 1, 
              name: 'General', 
              description: 'General questions about the platform',
              sort_order: 1,
              is_active: true
            }]
          },
          { 
            method: 'GET', 
            path: '/updates', 
            description: 'Get recent FAQ updates',
            auth: false,
            response: [{ 
              id: 1, 
              title: 'Updated pricing information', 
              content: 'We have updated our pricing structure...',
              created_at: '2024-01-01T00:00:00Z'
            }]
          },
        ],
      },
      {
        title: 'Contact',
        base: `${apiBase}/contact`,
        description: 'Contact configuration and management',
        endpoints: [
          { 
            method: 'GET', 
            path: '/config', 
            description: 'Get contact configuration including available methods',
            auth: false,
            response: { 
              methods: [
                { id: 1, name: 'Email Support', value: 'support@example.com', type: 'email', is_active: true },
                { id: 2, name: 'Phone Support', value: '+1-555-0123', type: 'phone', is_active: true }
              ]
            }
          },
        ],
      },
      {
        title: 'Notifications (Admin)',
        base: `${apiBase}/notifications`,
        description: 'Admin-oriented notification management overview',
        endpoints: [
          { 
            method: 'GET', 
            path: '/stream', 
            description: 'Server-sent events stream for real-time notifications',
            auth: true,
            response: 'Server-sent events stream with notification data'
          },
          { 
            method: 'GET', 
            path: '/unread-count', 
            description: 'Get count of unread notifications',
            auth: true,
            response: { count: 5 }
          },
          { 
            method: 'GET', 
            path: '/unread', 
            description: 'Get all unread notifications',
            auth: true,
            response: [{ 
              id: 'notif_123', 
              title: 'Container deployed successfully', 
              message: 'Your container my-app has been deployed',
              type: 'success',
              created_at: '2024-01-01T00:00:00Z'
            }]
          },
          { 
            method: 'GET', 
            path: '/', 
            description: 'Get all notifications with pagination',
            auth: true,
            response: { 
              notifications: [{ 
                id: 'notif_123', 
                title: 'Container deployed', 
                message: 'Your container has been deployed successfully',
                type: 'success',
                is_read: false,
                created_at: '2024-01-01T00:00:00Z'
              }],
              pagination: { page: 1, limit: 20, total: 50 }
            }
          },
          { 
            method: 'PATCH', 
            path: '/:id/read', 
            description: 'Mark a specific notification as read',
            auth: true,
            response: { success: true, message: 'Notification marked as read' }
          },
          { 
            method: 'PATCH', 
            path: '/read-all', 
            description: 'Mark all notifications as read',
            auth: true,
            response: { success: true, message: 'All notifications marked as read' }
          },
        ],
      },
      {
        title: 'Theme',
        base: `${apiBase}/theme`,
        description: 'Theme customization and branding configuration',
        endpoints: [
          { 
            method: 'GET', 
            path: '/', 
            description: 'Get current theme configuration',
            auth: false,
            response: { 
              theme: {
                name: 'default',
                colors: {
                  primary: '#3b82f6',
                  secondary: '#8b5cf6',
                  accent: '#10b981',
                  background: '#ffffff',
                  foreground: '#1f2937'
                },
                isActive: true
              }
            }
          },
        ],
      },
      {
        title: 'Health',
        base: `${apiBase}`,
        description: 'API health monitoring and system status checks',
        endpoints: [
          { 
            method: 'GET', 
            path: '/health', 
            description: 'Check API health and system status',
            auth: false,
            response: { 
              status: 'healthy', 
              timestamp: '2024-01-01T00:00:00Z',
              version: '1.0.0',
              uptime: 86400,
              database: 'connected',
              redis: 'connected',
              services: {
                containers: 'operational',
                vps: 'operational',
                payments: 'operational'
              }
            }
          },
          { 
            method: 'GET', 
            path: '/health/detailed', 
            description: 'Get detailed health information including memory and CPU usage',
            auth: false,
            response: { 
              status: 'healthy',
              uptime: 86400,
              memory: { heapUsed: 45.2, heapTotal: 120.5, rss: 180.3, external: 2.1 },
              cpu: { user: 12500, system: 3200 },
              timestamp: '2024-01-01T00:00:00Z'
            }
          },
          { 
            method: 'GET', 
            path: '/health/rate-limiting', 
            description: 'Get rate limiting metrics and status',
            auth: false,
            response: { 
              status: 'operational',
              metrics: {
                totalRequests: 15420,
                blockedRequests: 23,
                limitExceededCount: 5
              }
            }
          },
          { 
            method: 'GET', 
            path: '/health/metrics', 
            description: 'Get performance metrics for monitoring',
            auth: false,
            response: { 
              requestCount: 15420,
              averageResponseTime: 45.2,
              errorRate: 0.5,
              activeConnections: 12
            }
          },
          { 
            method: 'GET', 
            path: '/health/config-validation', 
            description: 'Validate rate limiting configuration',
            auth: false,
            response: { 
              status: 'valid',
              warnings: [],
              config: {
                windowMs: 900000,
                maxRequests: 100
              }
            }
          },
        ],
      },
      {
        title: 'Invoices',
        base: `${apiBase}/invoices`,
        description: 'Invoice management and generation for billing transactions',
        endpoints: [
          { 
            method: 'GET', 
            path: '/', 
            description: 'List invoices for the organization',
            auth: true,
            params: { limit: '20', offset: '0' },
            response: { 
              invoices: [
                { 
                  id: 'inv_123', 
                  invoiceNumber: 'INV-2024-001', 
                  amount: 150.75, 
                  currency: 'USD',
                  status: 'paid', 
                  dueDate: '2024-01-15T00:00:00Z',
                  createdAt: '2024-01-01T00:00:00Z',
                  organizationId: 'org_456'
                }
              ],
              pagination: { page: 1, limit: 20, total: 5 }
            }
          },
          { 
            method: 'GET', 
            path: '/:id', 
            description: 'Get detailed invoice information',
            auth: true,
            response: { 
              id: 'inv_123', 
              invoiceNumber: 'INV-2024-001', 
              amount: 150.75, 
              currency: 'USD',
              status: 'paid', 
              dueDate: '2024-01-15T00:00:00Z',
              createdAt: '2024-01-01T00:00:00Z',
              organizationId: 'org_456',
              lineItems: [
                { description: 'VPS Instance - January 2024', amount: 50.00, quantity: 1 },
                { description: 'Container Hosting - January 2024', amount: 100.75, quantity: 1 }
              ]
            }
          },
          { 
            method: 'GET', 
            path: '/:id/download', 
            description: 'Download invoice as HTML file',
            auth: true,
            response: 'HTML file download with Content-Disposition header'
          },
          { 
            method: 'POST', 
            path: '/from-transaction/:transactionId', 
            description: 'Create invoice from a specific wallet transaction',
            auth: true,
            body: { includeCompanyDetails: true },
            response: { 
              success: true, 
              invoice: { 
                id: 'inv_124', 
                invoiceNumber: 'INV-2024-002', 
                amount: 75.50, 
                status: 'generated' 
              }
            }
          },
          { 
            method: 'POST', 
            path: '/from-transactions', 
            description: 'Create invoice from multiple wallet transactions',
            auth: true,
            body: { 
              transactionIds: ['txn_123', 'txn_124', 'txn_125'],
              includeCompanyDetails: true,
              customDescription: 'Monthly services invoice'
            },
            response: { 
              success: true, 
              invoice: { 
                id: 'inv_125', 
                invoiceNumber: 'INV-2024-003', 
                amount: 225.00, 
                status: 'generated',
                transactionCount: 3
              }
            }
          },
        ],
      },
    
  ], [apiBase]);

  const defaultOpenSections = useMemo(
    () => sections.slice(0, 2).map(section => section.title),
    [sections]
  );
  const [openSections, setOpenSections] = useState<string[]>(defaultOpenSections);

  useEffect(() => {
    setOpenSections(defaultOpenSections);
  }, [defaultOpenSections]);

  const totalEndpoints = useMemo(
    () => sections.reduce((sum, section) => sum + section.endpoints.length, 0),
    [sections]
  );

  const authenticatedEndpoints = useMemo(
    () =>
      sections.reduce(
        (count, section) =>
          count + section.endpoints.filter(endpoint => endpoint.auth).length,
        0
      ),
    [sections]
  );

  const publicEndpoints = totalEndpoints - authenticatedEndpoints;
  const authCoverage = totalEndpoints
    ? Math.round((authenticatedEndpoints / totalEndpoints) * 100)
    : 0;

  const createSectionId = (title: string) =>
    `section-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  const copyToClipboard = (value: string) => {
    void navigator.clipboard.writeText(value);
    toast.success('Copied to clipboard!');
  };

  const scrollToSection = (title: string) => {
    const sectionId = createSectionId(title);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setOpenSections(previous =>
      previous.includes(title) ? previous : [...previous, title]
    );
  };

  return (
    <div className="space-y-8">
      <Card className="border-border">
        <CardHeader className="gap-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <Badge variant="secondary" className="w-fit text-xs uppercase tracking-wide">
                API Reference
              </Badge>
              <CardTitle className="text-3xl">{BRAND_NAME} API Documentation</CardTitle>
              <CardDescription>
                Build on top of {BRAND_NAME} with secure REST endpoints for authentication, infrastructure management, billing,
                and more.
              </CardDescription>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              <Badge variant="outline" className="font-mono text-xs">
                {apiBase}
              </Badge>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => copyToClipboard(apiBase)}>
                <Copy className="h-4 w-4" />
                Copy base URL
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Separator />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/30 p-3">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total endpoints</p>
                <p className="text-lg font-semibold text-foreground">{totalEndpoints}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/30 p-3">
              <ShieldCheck className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Secured coverage</p>
                <p className="text-lg font-semibold text-foreground">{authCoverage}%</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/30 p-3">
              <Terminal className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Public endpoints</p>
                <p className="text-lg font-semibold text-foreground">{publicEndpoints}</p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="gap-3 text-sm text-muted-foreground">
          <Rocket className="h-4 w-4 text-primary" />
          <span>
            Need sandbox credentials or webhook setup help? Reach out to our support team and we'll get you moving fast.
          </span>
        </CardFooter>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Quick navigation</CardTitle>
              <CardDescription>Jump directly to the endpoints you need.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[320px] pr-2">
                <div className="space-y-2">
                  {sections.map(section => (
                    <Button
                      key={section.title}
                      variant="ghost"
                      className="w-full justify-between text-sm"
                      onClick={() => scrollToSection(section.title)}
                    >
                      <span className="flex items-center gap-2">
                        <Terminal className="h-4 w-4 text-muted-foreground" />
                        {section.title}
                      </span>
                      <Badge variant="secondary" className="text-xs font-normal">
                        {section.endpoints.length}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Integration checklist</CardTitle>
              <CardDescription>Keep production launches smooth and secure.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="rounded-lg border border-dashed border-border/80 p-3">
                <span className="font-medium text-foreground">Authentication</span>
                <p>Send bearer tokens over HTTPS only and rotate credentials every 90 days.</p>
              </div>
              <div className="rounded-lg border border-dashed border-border/80 p-3">
                <span className="font-medium text-foreground">Idempotency</span>
                <p>
                  Use unique <code className="font-mono">Idempotency-Key</code> headers when retrying POST requests.
                </p>
              </div>
              <div className="rounded-lg border border-dashed border-border/80 p-3">
                <span className="font-medium text-foreground">Pagination</span>
                <p>
                  All collection endpoints accept <code className="font-mono">page</code> and <code className="font-mono">limit</code> query params.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Authentication & headers</CardTitle>
              <CardDescription>Most endpoints require a valid bearer token and JSON payloads.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Include <code className="font-mono">Authorization: Bearer {'<token>'}</code> on secured routes. Admin endpoints additionally require the authenticated user to have the <code className="font-mono">admin</code> role.
              </p>
              <p>
                All POST, PUT, and PATCH requests expect <code className="font-mono">Content-Type: application/json</code>. Rate limiting is applied globally; check response headers for the remaining request budget.
              </p>
            </CardContent>
          </Card>

          <Accordion type="multiple" value={openSections} onValueChange={setOpenSections} className="space-y-4">
            {sections.map(section => {
              const sectionId = createSectionId(section.title);
              return (
                <AccordionItem
                  key={section.title}
                  value={section.title}
                  id={sectionId}
                  className="overflow-hidden rounded-lg border border-border bg-card"
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex w-full items-start justify-between gap-4">
                      <div className="space-y-2 text-left">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-border/70 font-mono text-[10px] uppercase tracking-widest">
                            {section.endpoints.length} endpoints
                          </Badge>
                          <span className="text-base font-semibold text-foreground">{section.title}</span>
                        </div>
                        {section.description ? (
                          <p className="text-sm text-muted-foreground">{section.description}</p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="hidden text-xs font-mono md:inline">{section.base}</code>
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label="Copy section base URL"
                          className={buttonVariants({ variant: 'ghost', size: 'icon' })}
                          onClick={event => {
                            event.preventDefault();
                            event.stopPropagation();
                            copyToClipboard(section.base);
                          }}
                          onKeyDown={event => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              event.stopPropagation();
                              copyToClipboard(section.base);
                            }
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 px-4 pb-4">
                      {section.endpoints.map(endpoint => {
                        const methodStyle = methodStyles[endpoint.method] ?? methodStyles.DEFAULT;
                        const tabs: Array<{ value: string; label: string; content: React.ReactNode }> = [
                          {
                            value: 'curl',
                            label: 'cURL',
                            content: (
                              <div className="relative">
                                <pre className="overflow-x-auto rounded-md bg-black p-4 text-xs text-emerald-300">
                                  <code>{buildCurlCommand(section.base, endpoint)}</code>
                                </pre>
                                <Button
                                  variant="secondary"
                                  size="icon"
                                  className="absolute right-2 top-2 h-7 w-7"
                                  onClick={() => copyToClipboard(buildCurlCommand(section.base, endpoint))}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            ),
                          },
                        ];

                        if (endpoint.body) {
                          tabs.push({
                            value: 'body',
                            label: 'Request body',
                            content: (
                              <div className="relative">
                                <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs text-foreground">
                                  <code>{formatJson(endpoint.body)}</code>
                                </pre>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-2 top-2 h-7 w-7"
                                  onClick={() => copyToClipboard(formatJson(endpoint.body))}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            ),
                          });
                        }

                        if (endpoint.params) {
                          tabs.push({
                            value: 'params',
                            label: 'Query params',
                            content: (
                              <div className="relative">
                                <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs text-foreground">
                                  <code>{formatJson(endpoint.params)}</code>
                                </pre>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-2 top-2 h-7 w-7"
                                  onClick={() => copyToClipboard(formatJson(endpoint.params))}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            ),
                          });
                        }

                        if (endpoint.response) {
                          tabs.push({
                            value: 'response',
                            label: 'Response',
                            content: (
                              <div className="relative">
                                <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs text-foreground">
                                  <code>{formatJson(endpoint.response)}</code>
                                </pre>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-2 top-2 h-7 w-7"
                                  onClick={() => copyToClipboard(formatJson(endpoint.response))}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            ),
                          });
                        }

                        return (
                          <Card key={`${section.title}-${endpoint.method}-${endpoint.path}`} className="border border-dashed border-border/80">
                            <CardHeader className="space-y-3 pb-0">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-3">
                                  <Badge className={`font-mono text-xs ${methodStyle}`} variant="secondary">
                                    {endpoint.method}
                                  </Badge>
                                  <code className="text-sm font-mono text-foreground">
                                    {section.base}
                                    {endpoint.path}
                                  </code>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => copyToClipboard(`${section.base}${endpoint.path}`)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                              <CardDescription className="text-sm text-muted-foreground">
                                {endpoint.description}
                              </CardDescription>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={
                                    endpoint.auth
                                      ? 'border-amber-500/60 text-amber-600'
                                      : 'border-emerald-500/50 text-emerald-600'
                                  }
                                >
                                  {endpoint.auth ? 'Auth required' : 'Public'}
                                </Badge>
                                {endpoint.params ? (
                                  <Badge variant="outline" className="border-border/70 text-muted-foreground">
                                    Query params
                                  </Badge>
                                ) : null}
                                {endpoint.body ? (
                                  <Badge variant="outline" className="border-border/70 text-muted-foreground">
                                    JSON body
                                  </Badge>
                                ) : null}
                              </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                              <Tabs defaultValue="curl" className="w-full">
                                <TabsList className="justify-start">
                                  {tabs.map(tab => (
                                    <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                                      {tab.label}
                                    </TabsTrigger>
                                  ))}
                                </TabsList>
                                {tabs.map(tab => (
                                  <TabsContent key={tab.value} value={tab.value}>
                                    {tab.content}
                                  </TabsContent>
                                ))}
                              </Tabs>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </div>
    </div>
  );
}