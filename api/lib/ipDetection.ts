/**
 * Unified IP Detection Service
 * 
 * Provides centralized IP detection logic that handles X-Forwarded-For headers
 * and proxy scenarios consistently across the application.
 */

import { Request } from 'express';

export interface IPDetectionResult {
  ip: string;
  source: 'x-forwarded-for' | 'x-real-ip' | 'socket' | 'fallback';
  originalHeader?: string;
  isValid: boolean;
  warnings?: string[];
}

export interface IPDetectionOptions {
  trustProxy?: boolean;
  enableLogging?: boolean;
  fallbackIP?: string;
}

/**
 * Validates if a string is a valid IP address (IPv4 or IPv6)
 */
export function isValidIP(ip: string): boolean {
  if (!ip || typeof ip !== 'string') {
    return false;
  }

  // Remove any whitespace
  ip = ip.trim();

  // IPv4 validation
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (ipv4Regex.test(ip)) {
    return true;
  }

  // IPv6 validation - comprehensive approach
  // Handle special cases first
  if (ip === '::1' || ip === '::') {
    return true;
  }

  // Check if it contains only valid IPv6 characters
  if (!/^[0-9a-fA-F:]+$/.test(ip)) {
    return false;
  }

  // Split by double colon to handle compression
  const parts = ip.split('::');
  
  // Can only have one double colon
  if (parts.length > 2) {
    return false;
  }

  if (parts.length === 2) {
    // Compressed format
    const left = parts[0] ? parts[0].split(':') : [];
    const right = parts[1] ? parts[1].split(':') : [];
    
    // Total groups should not exceed 8
    if (left.length + right.length >= 8) {
      return false;
    }
    
    // Validate each group
    const allGroups = [...left, ...right];
    for (const group of allGroups) {
      if (group && (group.length > 4 || !/^[0-9a-fA-F]+$/.test(group))) {
        return false;
      }
    }
    
    return true;
  } else {
    // Full format - must have exactly 8 groups
    const groups = ip.split(':');
    if (groups.length !== 8) {
      return false;
    }
    
    // Validate each group
    for (const group of groups) {
      if (!group || group.length > 4 || !/^[0-9a-fA-F]+$/.test(group)) {
        return false;
      }
    }
    
    return true;
  }
}

/**
 * Sanitizes an IP address by removing invalid characters and normalizing format
 */
export function sanitizeIP(ip: string): string {
  if (!ip || typeof ip !== 'string') {
    return '';
  }

  // Remove whitespace and common invalid characters, but preserve valid IP characters
  let sanitized = ip.trim();
  
  // For IPv4, only allow digits and dots
  if (/^\d+\.\d+\.\d+\.\d+/.test(sanitized)) {
    sanitized = sanitized.replace(/[^0-9.]/g, '');
  } else {
    // For IPv6, allow hex digits, colons
    sanitized = sanitized.replace(/[^0-9a-fA-F:]/g, '');
  }
  
  return sanitized;
}

/**
 * Extracts the first valid IP from X-Forwarded-For header
 */
function extractFromForwardedFor(header: string): { ip: string; isValid: boolean; warnings?: string[] } {
  if (!header) {
    return { ip: '', isValid: false };
  }

  const warnings: string[] = [];
  const ips = header.split(',').map(ip => ip.trim());
  
  if (ips.length > 1) {
    warnings.push(`Multiple IPs in X-Forwarded-For header: ${ips.length} entries`);
  }

  // Take the first IP (leftmost is the original client)
  const firstIP = ips[0];
  const sanitized = sanitizeIP(firstIP);
  const valid = isValidIP(sanitized);

  if (!valid && sanitized) {
    warnings.push(`Invalid IP format in X-Forwarded-For: ${firstIP}`);
  }

  return {
    ip: sanitized,
    isValid: valid,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Gets the client IP address from a request with comprehensive proxy support
 */
export function getClientIP(req: Request, options: IPDetectionOptions = {}): IPDetectionResult {
  const {
    trustProxy = true,
    enableLogging = true,
    fallbackIP = '127.0.0.1'
  } = options;

  const warnings: string[] = [];
  let result: IPDetectionResult;

  // Try X-Forwarded-For header first (most common proxy header)
  if (trustProxy && req.headers['x-forwarded-for']) {
    const forwardedFor = req.headers['x-forwarded-for'];
    const headerValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    
    const extraction = extractFromForwardedFor(headerValue);
    
    if (extraction.isValid) {
      result = {
        ip: extraction.ip,
        source: 'x-forwarded-for',
        originalHeader: headerValue,
        isValid: true,
        warnings: extraction.warnings
      };
    } else {
      warnings.push(`Invalid X-Forwarded-For header: ${headerValue}`);
      if (extraction.warnings) {
        warnings.push(...extraction.warnings);
      }
    }
  }

  // Try X-Real-IP header as fallback
  if (!result && trustProxy && req.headers['x-real-ip']) {
    const realIP = req.headers['x-real-ip'];
    const headerValue = Array.isArray(realIP) ? realIP[0] : realIP;
    const sanitized = sanitizeIP(headerValue);
    
    if (isValidIP(sanitized)) {
      result = {
        ip: sanitized,
        source: 'x-real-ip',
        originalHeader: headerValue,
        isValid: true
      };
    } else {
      warnings.push(`Invalid X-Real-IP header: ${headerValue}`);
    }
  }

  // Try socket remote address
  if (!result) {
    const socketIP = (req.socket as any)?.remoteAddress || req.connection?.remoteAddress;
    
    if (socketIP) {
      const sanitized = sanitizeIP(socketIP);
      
      if (isValidIP(sanitized)) {
        result = {
          ip: sanitized,
          source: 'socket',
          isValid: true
        };
      } else {
        warnings.push(`Invalid socket remote address: ${socketIP}`);
      }
    }
  }

  // Use fallback IP if nothing else worked
  if (!result) {
    warnings.push('No valid IP found in any source, using fallback');
    result = {
      ip: fallbackIP,
      source: 'fallback',
      isValid: isValidIP(fallbackIP)
    };
  }

  // Add warnings to result
  if (warnings.length > 0) {
    result.warnings = warnings;
  }

  // Log IP detection for debugging
  if (enableLogging) {
    logIPDetection(req, result);
  }

  return result;
}

/**
 * Logs IP detection results for debugging and monitoring
 */
export function logIPDetection(req: Request, result: IPDetectionResult): void {
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    detectedIP: result.ip,
    source: result.source,
    isValid: result.isValid,
    headers: {
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip'],
      'user-agent': req.headers['user-agent']
    },
    socketAddress: (req.socket as any)?.remoteAddress,
    warnings: result.warnings
  };

  // Log with appropriate level based on validity and warnings
  if (!result.isValid || result.warnings) {
    console.warn('IP Detection Warning:', JSON.stringify(logData, null, 2));
  } else {
    // Always log in development, or when explicitly enabled
    console.log('IP Detection:', JSON.stringify(logData, null, 2));
  }
}

/**
 * Simple wrapper function for backward compatibility
 * Returns just the IP string like the original getIp function
 */
export function getIP(req: Request, options: IPDetectionOptions = {}): string {
  const result = getClientIP(req, options);
  return result.ip;
}

/**
 * Enhanced IP detection with validation for security-sensitive operations
 */
export function getValidatedClientIP(req: Request, options: IPDetectionOptions = {}): IPDetectionResult {
  const result = getClientIP(req, options);
  
  // Additional validation for security-sensitive operations
  if (result.ip === '127.0.0.1' || result.ip === '::1') {
    if (!result.warnings) {
      result.warnings = [];
    }
    result.warnings.push('Localhost IP detected - may indicate proxy misconfiguration');
  }

  // Check for private IP ranges that might indicate proxy issues
  if (result.ip.startsWith('192.168.') || result.ip.startsWith('10.') || result.ip.startsWith('172.')) {
    if (!result.warnings) {
      result.warnings = [];
    }
    result.warnings.push('Private IP range detected - verify proxy configuration');
  }

  return result;
}

/**
 * Configuration validation for IP detection settings
 */
export function validateIPDetectionConfig(): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  // Check if trust proxy is properly configured
  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy === undefined) {
    warnings.push('TRUST_PROXY environment variable not set - using default (true)');
  }

  // Validate fallback IP if provided
  const fallbackIP = process.env.IP_DETECTION_FALLBACK;
  if (fallbackIP && !isValidIP(fallbackIP)) {
    warnings.push(`Invalid IP_DETECTION_FALLBACK: ${fallbackIP}`);
  }

  return {
    isValid: warnings.length === 0,
    warnings
  };
}