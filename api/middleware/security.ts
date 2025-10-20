/**
 * Security middleware for admin operations
 */
import { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth.js';
import { logActivity } from '../services/activityLogger.js';

/**
 * Middleware to log all admin operations for audit purposes
 */
export const auditLogger = (operation: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Log the start of the operation
    const originalSend = res.send;
    res.send = function(data) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      
      // Log the operation completion
      if (req.user?.id) {
        logActivity({
          userId: req.user.id,
          organizationId: req.user.organizationId ?? null,
          eventType: 'admin_operation',
          entityType: 'system',
          entityId: operation,
          message: `Admin operation: ${operation} (${req.method} ${req.path})`,
          status: statusCode >= 400 ? 'error' : 'success',
          metadata: {
            operation,
            method: req.method,
            path: req.path,
            status_code: statusCode,
            duration_ms: duration,
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
            request_size: req.headers['content-length'] || 0,
            response_size: data ? data.length : 0
          }
        }, req).catch(err => {
          console.error('Failed to log admin operation:', err);
        });
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

/**
 * Middleware to validate admin session and add security headers
 */
export const adminSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Add security headers for admin operations
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  
  next();
};

/**
 * Middleware to validate request size and prevent DoS
 */
export const requestSizeLimit = (maxSizeKB: number = 100) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxSizeBytes = maxSizeKB * 1024;
    
    if (contentLength > maxSizeBytes) {
      res.status(413).json({ 
        error: 'Request too large',
        maxSize: `${maxSizeKB}KB`
      });
      return;
    }
    
    next();
  };
};

/**
 * Middleware to validate sensitive operations with additional confirmation
 */
export const requireConfirmation = (operationType: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const confirmation = req.headers['x-admin-confirmation'] || req.body.confirmation;
    
    if (!confirmation || confirmation !== 'confirmed') {
      res.status(400).json({
        error: `This ${operationType} operation requires explicit confirmation`,
        requiresConfirmation: true,
        confirmationHeader: 'x-admin-confirmation',
        confirmationValue: 'confirmed'
      });
      return;
    }
    
    next();
  };
};

