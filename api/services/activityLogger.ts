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

let ensurePromise: Promise<void> | null = null;

export const ensureActivityLogsTable = async (): Promise<void> => {
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    try {
      await query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    } catch (err: any) {
      // Non-critical: some providers restrict extension creation; continue if that happens.
      if (err?.code !== '42501') {
        console.warn('Activity logs extension check failed:', err);
      }
    }

    await query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        organization_id UUID,
        event_type VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100) NOT NULL,
        entity_id VARCHAR(255),
        message TEXT,
        status VARCHAR(50) DEFAULT 'info' CHECK (status IN ('success', 'warning', 'error', 'info')),
        ip_address VARCHAR(64),
        user_agent TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const indexStatements = [
      'CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_activity_logs_org_id ON activity_logs(organization_id)',
      'CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_activity_logs_event_type ON activity_logs(event_type)'
    ];

    for (const stmt of indexStatements) {
      await query(stmt);
    }
  })().catch(err => {
    ensurePromise = null;
    throw err;
  });

  return ensurePromise;
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

    await ensureActivityLogsTable();

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