import React, { useState } from 'react';
import { Copy, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function ApiDocs() {
  const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const toggleSection = (sectionTitle: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionTitle) 
        ? prev.filter(s => s !== sectionTitle)
        : [...prev, sectionTitle]
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const sections = [
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
          method: 'GET', 
          path: '/me', 
          description: 'Get current user profile',
          auth: true,
          response: { id: 1, email: 'user@example.com', firstName: 'John', lastName: 'Doe', role: 'user' }
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
      ],
    },
    {
      title: 'Payments',
      base: `${apiBase}/payments`,
      description: 'Payment processing and billing management',
      endpoints: [
        { 
          method: 'POST', 
          path: '/create-payment-intent', 
          description: 'Create PayPal payment intent for container deployment',
          auth: true,
          body: { amount: 10.00, currency: 'USD', containerId: 'container_123' },
          response: { paymentId: 'PAYID-123', approvalUrl: 'https://paypal.com/approve/...' }
        },
        { 
          method: 'POST', 
          path: '/capture-payment', 
          description: 'Capture completed payment after user approval',
          auth: true,
          body: { paymentId: 'PAYID-123', payerId: 'PAYER-123' },
          response: { success: true, transactionId: 'TXN-456', status: 'completed' }
        },
        { 
          method: 'GET', 
          path: '/history', 
          description: 'Get user payment history',
          auth: true,
          response: [{ id: 1, amount: 10.00, status: 'completed', date: '2024-01-01T00:00:00Z', description: 'Container deployment' }]
        },
        { 
          method: 'GET', 
          path: '/invoices', 
          description: 'Get user invoices',
          auth: true,
          response: [{ id: 1, number: 'INV-001', amount: 10.00, status: 'paid', date: '2024-01-01T00:00:00Z' }]
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
          response: { id: 'cont_123', name: 'my-app', status: 'running', image: 'nginx:latest', port: 80, url: 'https://my-app.containerstacks.com' }
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
          description: 'List all VPS instances for organization',
          auth: true,
          response: [{ 
            id: 'vps_123', 
            name: 'my-server', 
            status: 'running', 
            ip_address: '192.168.1.100', 
            plan: 'nanode-1gb', 
            region: 'us-east', 
            created_at: '2024-01-01T00:00:00Z' 
          }]
        },
        { 
          method: 'POST', 
          path: '/', 
          description: 'Create new VPS instance',
          auth: true,
          body: { 
            name: 'my-server', 
            plan: 'nanode-1gb', 
            region: 'us-east', 
            image: 'linode/ubuntu22.04',
            root_pass: 'secure_password123'
          },
          response: { 
            id: 'vps_123', 
            name: 'my-server', 
            status: 'provisioning', 
            message: 'VPS creation started' 
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
            priority: 'medium'
          },
          response: { 
            id: 'ticket_123', 
            subject: 'Container deployment issue', 
            status: 'open',
            message: 'Support ticket created successfully'
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
            download_url: 'https://api.containerstacks.com/downloads/activity_export_123.csv',
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
          method: 'POST', 
          path: '/tickets/:id/replies', 
          description: 'Reply to a support ticket',
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
          path: '/linode/plans', 
          description: 'Fetch available plans from Linode API',
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
          path: '/linode/regions', 
          description: 'Fetch available regions from Linode API',
          auth: true,
          response: [{ 
            id: 'us-east', 
            label: 'Newark, NJ', 
            country: 'us',
            status: 'ok'
          }]
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
      ],
    },
  ];

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200';
      case 'POST': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200';
      case 'PUT': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200';
      case 'DELETE': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200';
      case 'PATCH': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">API Documentation</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-100">
          Base URL: <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">{apiBase}</code>
        </p>
      </div>

      {/* API Notes at the top */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Important Notes:</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• All authenticated endpoints require an <code className="px-1 bg-blue-100 dark:bg-blue-800 rounded">Authorization: Bearer &lt;token&gt;</code> header</li>
          <li>• Admin endpoints require a user with <code className="px-1 bg-blue-100 dark:bg-blue-800 rounded">admin</code> role</li>
          <li>• All requests should include <code className="px-1 bg-blue-100 dark:bg-blue-800 rounded">Content-Type: application/json</code> header</li>
          <li>• Rate limiting is applied to all endpoints (see response headers for limits)</li>
        </ul>
      </div>

      {/* API Sections */}
      <div className="space-y-4">
        {sections.map((section) => {
          const isExpanded = expandedSections.includes(section.title);
          return (
            <div key={section.title} className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => toggleSection(section.title)}
              >
                <div className="flex items-center space-x-3">
                  {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">{section.title}</h2>
                    {section.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-200">{section.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <code className="text-xs text-gray-500 dark:text-gray-200">{section.base}</code>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(section.base);
                    }}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                  <div className="space-y-4">
                    {section.endpoints.map((endpoint, index) => (
                      <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <span className={`text-xs font-semibold px-2 py-1 rounded ${getMethodColor(endpoint.method)}`}>
                              {endpoint.method}
                            </span>
                            <code className="text-sm font-mono text-gray-700 dark:text-gray-100">
                              {section.base}{endpoint.path}
                            </code>
                            <button
                              onClick={() => copyToClipboard(`${section.base}${endpoint.path}`)}
                              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                          {endpoint.auth !== undefined && (
                            <span className={`text-xs px-2 py-1 rounded ${
                              endpoint.auth 
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200' 
                                : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                            }`}>
                              {endpoint.auth ? 'Auth Required' : 'Public'}
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-100 mb-3">{endpoint.description}</p>

                        {endpoint.body && (
                          <div className="mb-3">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Request Body:</h4>
                            <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded text-xs overflow-x-auto">
                              <code className="text-gray-800 dark:text-gray-100">{JSON.stringify(endpoint.body, null, 2)}</code>
                            </pre>
                          </div>
                        )}

                        {endpoint.response && (
                          <div className="mb-3">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Response:</h4>
                            <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded text-xs overflow-x-auto">
                              <code className="text-gray-800 dark:text-gray-100">{JSON.stringify(endpoint.response, null, 2)}</code>
                            </pre>
                          </div>
                        )}

                        {/* cURL Example */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">cURL Example:</h4>
                          <div className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto relative">
                            <code>
                              {`curl -X ${endpoint.method} "${section.base}${endpoint.path}" \\`}
                              {endpoint.auth && (
                                <>
                                  {'\n  -H "Authorization: Bearer YOUR_TOKEN" \\'}
                                </>
                              )}
                              {endpoint.body && (
                                <>
                                  {'\n  -H "Content-Type: application/json" \\'}
                                  {`\n  -d '${JSON.stringify(endpoint.body)}'`}
                                </>
                              )}
                            </code>
                            <button
                              onClick={() => copyToClipboard(
                                `curl -X ${endpoint.method} "${section.base}${endpoint.path}"` +
                                (endpoint.auth ? ' \\\n  -H "Authorization: Bearer YOUR_TOKEN"' : '') +
                                (endpoint.body ? ' \\\n  -H "Content-Type: application/json" \\\n  -d \'' + JSON.stringify(endpoint.body) + '\'' : '')
                              )}
                              className="absolute top-2 right-2 p-1 hover:bg-gray-700 rounded"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}