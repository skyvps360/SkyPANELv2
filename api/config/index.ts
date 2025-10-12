/**
 * Configuration module for ContainerStacks API
 */

export interface Config {
  PORT: number;
  NODE_ENV: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  DATABASE_URL: string;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  PAYPAL_CLIENT_ID: string;
  PAYPAL_CLIENT_SECRET: string;
  PAYPAL_MODE: string;
  SMTP2GO_API_KEY?: string;
  LINODE_API_TOKEN?: string;
}

// Use getter functions to read env vars at runtime, not at import time
function getConfig(): Config {
  const config = {
    PORT: parseInt(process.env.PORT || '3001', 10),
    NODE_ENV: process.env.NODE_ENV || 'development',
    JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    DATABASE_URL: process.env.DATABASE_URL || '',
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID || '',
    PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET || '',
    PAYPAL_MODE: process.env.PAYPAL_MODE || 'sandbox',
    SMTP2GO_API_KEY: process.env.SMTP2GO_API_KEY,
    LINODE_API_TOKEN: process.env.LINODE_API_TOKEN,
  };

  // Debug logging
  console.log('Config loaded:', {
    hasPayPalClientId: !!config.PAYPAL_CLIENT_ID,
    hasPayPalClientSecret: !!config.PAYPAL_CLIENT_SECRET,
    paypalMode: config.PAYPAL_MODE
  });

  return config;
}

// Export a proxy that reads config values dynamically
export const config = new Proxy({} as Config, {
  get(target, prop: keyof Config) {
    return getConfig()[prop];
  }
});

export function validateConfig(): void {
  const requiredEnvVars = [
    'DATABASE_URL',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars);
    console.error('Please check your .env file and ensure all required variables are set.');
    // Don't exit in development, just warn
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }

  // Validate JWT secret in production
  if (process.env.NODE_ENV === 'production' && config.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
    console.error('JWT_SECRET must be changed in production!');
    process.exit(1);
  }

  console.log('Configuration validated successfully');
}