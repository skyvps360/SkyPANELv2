import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { query } from '../lib/database.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    organizationId?: string;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    
    // Get user from database
    const userResult = await query(
      'SELECT id, email, role FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      console.error('Authentication - User lookup failed:', {
        decodedUserId: decoded.userId,
        userExists: false
      });
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = userResult.rows[0];

    // Get user's organization (if organization_members table exists)
    let orgMember = null;
    try {
      const orgResult = await query(
        'SELECT organization_id FROM organization_members WHERE user_id = $1',
        [user.id]
      );
      orgMember = orgResult.rows[0] || null;
    } catch (err) {
      // Table might not exist yet, continue without error
      console.warn('organization_members table not found, skipping organization lookup');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: orgMember?.organization_id
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

export const requireAdmin = requireRole(['admin']);

export const requireOrganization = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.organizationId) {
    return res.status(403).json({ error: 'Organization membership required' });
  }
  next();
};