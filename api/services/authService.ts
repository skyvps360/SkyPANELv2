import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto-js';
import { query, transaction } from '../lib/database.js';
import { config } from '../config/index.js';
import { v4 as uuidv4 } from 'uuid';

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export class AuthService {
  static async register(data: RegisterData) {
    try {
      // Check if user already exists
      const existingUserResult = await query(
        'SELECT id FROM users WHERE email = $1',
        [data.email]
      );

      if (existingUserResult.rows.length > 0) {
        throw new Error('User already exists with this email');
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(data.password, saltRounds);

      // Use transaction to ensure data consistency
      const result = await transaction(async (client) => {
        const userId = uuidv4();
        const now = new Date().toISOString();

        // Create user
        const userResult = await client.query(
          `INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7) 
           RETURNING *`,
          [userId, data.email, hashedPassword, `${data.firstName} ${data.lastName}`, 'user', now, now]
        );

        const user = userResult.rows[0];
        let organizationId = null;

        // Create organization if provided
        if (data.organizationName) {
          const orgId = uuidv4();
          const slug = data.organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-');
          
          const orgResult = await client.query(
            `INSERT INTO organizations (id, name, slug, owner_id, settings, created_at, updated_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING *`,
            [orgId, data.organizationName, slug, userId, '{}', now, now]
          );

          organizationId = orgResult.rows[0].id;

          // Add user to organization as owner (if organization_members table exists)
          try {
            await client.query(
              `INSERT INTO organization_members (organization_id, user_id, role, created_at) 
               VALUES ($1, $2, $3, $4)`,
              [organizationId, userId, 'owner', now]
            );
          } catch (err) {
            // Table might not exist yet, continue without error
            console.warn('organization_members table not found, skipping member creation');
          }

          // Create wallet for organization
          try {
            await client.query(
              `INSERT INTO wallets (id, organization_id, balance, currency, created_at, updated_at) 
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [uuidv4(), organizationId, 0, 'USD', now, now]
            );
          } catch (err) {
            // Table might not exist yet, continue without error
            console.warn('wallets table not found, skipping wallet creation');
          }
        }

        return { user, organizationId };
      });

      // Generate JWT token
      const token = jwt.sign(
        { userId: result.user.id, email: result.user.email },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN }
      );

      return {
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.name.split(' ')[0] || '',
          lastName: result.user.name.split(' ').slice(1).join(' ') || '',
          role: result.user.role,
          emailVerified: true,
          organizationId: result.organizationId
        },
        token
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  static async login(data: LoginData) {
    try {
      // Get user by email
      const userResult = await query(
        'SELECT * FROM users WHERE email = $1',
        [data.email]
      );

      if (userResult.rows.length === 0) {
        throw new Error('Invalid email or password');
      }

      const user = userResult.rows[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(data.password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      // Get user's organization (if organization_members table exists)
      let orgMember = null;
      try {
        const orgResult = await query(
          'SELECT organization_id, role FROM organization_members WHERE user_id = $1',
          [user.id]
        );
        orgMember = orgResult.rows[0] || null;
      } catch (err) {
        // Table might not exist yet, continue without error
        console.warn('organization_members table not found, skipping organization lookup');
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN }
      );

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.name.split(' ')[0] || '',
          lastName: user.name.split(' ').slice(1).join(' ') || '',
          role: user.role,
          emailVerified: true,
          organizationId: orgMember?.organization_id,
          organizationRole: orgMember?.role
        },
        token
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  static async verifyEmail(token: string) {
    try {
      // Since we don't have email verification in the current schema,
      // we'll just return success for now
      return { message: 'Email verification not implemented in current schema' };
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  }

  static async requestPasswordReset(email: string) {
    try {
      const result = await query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        // Don't reveal if email exists
        return { message: 'If the email exists, a reset link has been sent' };
      }

      // Since we don't have reset_token and reset_expires fields in the current schema,
      // we'll just return a message for now
      return { 
        message: 'Password reset not implemented in current schema'
      };
    } catch (error) {
      console.error('Password reset request error:', error);
      throw error;
    }
  }

  static async resetPassword(token: string, newPassword: string) {
    try {
      // Since we don't have reset_token and reset_expires fields in the current schema,
      // we'll just return an error for now
      throw new Error('Password reset not implemented in current schema');
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }

  static async refreshToken(userId: string) {
    try {
      const userResult = await query(
        'SELECT id, email, role FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Generate new JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN }
      );

      return { token };
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }

  static async changePassword(userId: string, newPassword: string) {
    try {
      // Hash the new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password in database
      const result = await query(
        'UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3',
        [hashedPassword, new Date().toISOString(), userId]
      );

      if (result.rowCount === 0) {
        throw new Error('User not found');
      }

      return { success: true };
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }
}