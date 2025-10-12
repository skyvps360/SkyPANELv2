import { Request } from 'express';
import { query } from '../lib/database.js';

export interface ActivityPayload {
  userId: string;
  organizationId?: string | null;
  eventType: string;
  entityType: string;
  entityId?: string | null;
  message?: string | null;
  status?: 'success' | 'warning' | 'error' | 'info';
  metadata?: any;
}

const getIp = (req?: Request): string | undefined => {
  if (!req) return undefined;
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string') return fwd.split(',')[0].trim();
  return (req.socket as any)?.remoteAddress || undefined;
};

export async function logActivity(payload: ActivityPayload, req?: Request): Promise<void> {
  try {
    const {
      userId,
      organizationId = null,
      eventType,
      entityType,
      entityId = null,
      message = null,
      status = 'info',
      metadata = {}
    } = payload;

    const ip = getIp(req);
    const ua = req?.headers['user-agent'] || undefined;

    await query(
      `INSERT INTO activity_logs (user_id, organization_id, event_type, entity_type, entity_id, message, status, ip_address, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [userId, organizationId, eventType, entityType, entityId, message, status, ip, ua, metadata]
    );
  } catch (e) {
    // Non-blocking: do not throw, but log to server console
    console.warn('Activity log insert failed:', e);
  }
}