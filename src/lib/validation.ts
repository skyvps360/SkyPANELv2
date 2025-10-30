/**
 * Frontend validation utilities for VPS creation and SSH key management
 */

/**
 * SSH public key validation
 */
export interface SSHKeyValidationResult {
  valid: boolean;
  error?: string;
}

// SSH public key validation regex
// Matches common SSH key formats: ssh-rsa, ssh-ed25519, ecdsa-sha2-nistp256, etc.
const SSH_KEY_REGEX = /^(ssh-rsa|ssh-ed25519|ecdsa-sha2-nistp256|ecdsa-sha2-nistp384|ecdsa-sha2-nistp521|ssh-dss)\s+[A-Za-z0-9+/]+[=]{0,3}(\s+.*)?$/;

/**
 * Validates SSH public key format
 */
export function validateSSHPublicKey(publicKey: string): SSHKeyValidationResult {
  if (!publicKey || !publicKey.trim()) {
    return {
      valid: false,
      error: 'SSH public key is required'
    };
  }

  const trimmedKey = publicKey.trim();

  // Check if key matches expected format
  if (!SSH_KEY_REGEX.test(trimmedKey)) {
    return {
      valid: false,
      error: 'Invalid SSH public key format. Must start with ssh-rsa, ssh-ed25519, or ecdsa-sha2-*'
    };
  }

  // Check key length (typical SSH keys are at least 100 characters)
  if (trimmedKey.length < 100) {
    return {
      valid: false,
      error: 'SSH public key appears to be too short. Please provide a complete key.'
    };
  }

  // Check for common mistakes
  if (trimmedKey.includes('PRIVATE KEY')) {
    return {
      valid: false,
      error: 'This appears to be a private key. Please provide your public key instead.'
    };
  }

  if (trimmedKey.includes('BEGIN') || trimmedKey.includes('END')) {
    return {
      valid: false,
      error: 'Invalid format. SSH public keys should not contain BEGIN/END markers.'
    };
  }

  return { valid: true };
}

/**
 * Marketplace app validation
 */
export interface MarketplaceApp {
  slug: string;
  name: string;
  regions?: string[];
  available?: boolean;
  display_name?: string;
}

export interface MarketplaceAppValidationResult {
  valid: boolean;
  error?: string;
  errorCode?: 'INVALID_APP_SLUG' | 'APP_NOT_AVAILABLE' | 'REGION_INCOMPATIBLE';
}

/**
 * Validates marketplace app selection and region compatibility
 */
export function validateMarketplaceApp(
  appSlug: string | null | undefined,
  region: string,
  availableApps: MarketplaceApp[]
): MarketplaceAppValidationResult {
  // If no app selected, validation passes
  if (!appSlug) {
    return { valid: true };
  }

  // Check if app exists in available apps
  const app = availableApps.find(a => a.slug === appSlug);
  
  if (!app) {
    return {
      valid: false,
      error: `Marketplace app "${appSlug}" not found`,
      errorCode: 'INVALID_APP_SLUG'
    };
  }

  // Check if app is available
  const friendlyName = app.display_name || app.name || app.slug;

  if (app.available === false) {
    return {
      valid: false,
      error: `Marketplace app "${friendlyName}" is currently unavailable`,
      errorCode: 'APP_NOT_AVAILABLE'
    };
  }

  // Check region compatibility if app has region restrictions
  if (app.regions && app.regions.length > 0) {
    if (!app.regions.includes(region)) {
      return {
        valid: false,
        error: `Marketplace app "${friendlyName}" is not available in region "${region}". Available regions: ${app.regions.join(', ')}`,
        errorCode: 'REGION_INCOMPATIBLE'
      };
    }
  }

  return { valid: true };
}

/**
 * Password validation for DigitalOcean droplets
 */
export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
  strength?: 'weak' | 'medium' | 'strong';
}

/**
 * Validates password strength for VPS root password
 */
export function validatePassword(password: string): PasswordValidationResult {
  if (!password) {
    return {
      valid: false,
      error: 'Password is required'
    };
  }

  if (password.length < 8) {
    return {
      valid: false,
      error: 'Password must be at least 8 characters',
      strength: 'weak'
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one uppercase letter',
      strength: 'weak'
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one lowercase letter',
      strength: 'weak'
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one number',
      strength: 'weak'
    };
  }

  // Calculate strength
  let strength: 'weak' | 'medium' | 'strong' = 'medium';
  
  if (password.length >= 12 && /[^A-Za-z0-9]/.test(password)) {
    strength = 'strong';
  } else if (password.length < 10) {
    strength = 'weak';
  }

  return {
    valid: true,
    strength
  };
}

/**
 * VPS label validation
 */
export interface LabelValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates VPS instance label
 */
export function validateVPSLabel(label: string): LabelValidationResult {
  if (!label || !label.trim()) {
    return {
      valid: false,
      error: 'Label is required'
    };
  }

  const trimmedLabel = label.trim();

  if (trimmedLabel.length < 3) {
    return {
      valid: false,
      error: 'Label must be at least 3 characters'
    };
  }

  if (trimmedLabel.length > 64) {
    return {
      valid: false,
      error: 'Label must be less than 64 characters'
    };
  }

  // Check for valid characters (alphanumeric, hyphens, underscores)
  if (!/^[a-zA-Z0-9\-_]+$/.test(trimmedLabel)) {
    return {
      valid: false,
      error: 'Label can only contain letters, numbers, hyphens, and underscores'
    };
  }

  // Cannot start or end with hyphen
  if (trimmedLabel.startsWith('-') || trimmedLabel.endsWith('-')) {
    return {
      valid: false,
      error: 'Label cannot start or end with a hyphen'
    };
  }

  return { valid: true };
}
