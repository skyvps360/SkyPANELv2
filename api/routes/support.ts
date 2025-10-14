import express, { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken, requireOrganization } from '../middleware/auth.js';
import { query } from '../lib/database.js';

const router = express.Router();

router.use(authenticateToken, requireOrganization);

const isMissingTableError = (err: any): boolean => {
  const msg = (err?.message || '').toLowerCase();
  return (
    msg.includes('could not find the table') ||
    (msg.includes('relation') && msg.includes('does not exist')) ||
    msg.includes('schema cache')
  );
};

// List support tickets for the user's organization
router.get('/tickets', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const result = await query(
      'SELECT * FROM support_tickets WHERE organization_id = $1 ORDER BY created_at DESC',
      [organizationId]
    );

    res.json({ tickets: result.rows || [] });
  } catch (err: any) {
    console.error('Support tickets list error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch tickets' });
  }
});

// Create a new support ticket
router.post(
  '/tickets',
  [
    body('subject').isLength({ min: 3 }).withMessage('Subject is required'),
    body('message').isLength({ min: 10 }).withMessage('Message is required'),
    body('priority').isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
    body('category').isLength({ min: 2 }).withMessage('Category is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      const userId = (req as any).user.id;
      const { subject, message, priority, category } = req.body;

      const result = await query(
        `INSERT INTO support_tickets (organization_id, created_by, subject, message, priority, category, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [organizationId, userId, subject, message, priority, category, 'open']
      );

      res.status(201).json({ ticket: result.rows[0] });
    } catch (err: any) {
      console.error('Create ticket error:', err);
      res.status(500).json({ error: err.message || 'Failed to create ticket' });
    }
  }
);

// List replies for a ticket (organization scoped)
router.get(
  '/tickets/:id/replies',
  [param('id').isUUID().withMessage('Invalid ticket id')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      const ticketCheck = await query(
        'SELECT id FROM support_tickets WHERE id = $1 AND organization_id = $2',
        [id, organizationId]
      );
      if (ticketCheck.rows.length === 0) {
        res.status(404).json({ error: 'Ticket not found' });
        return;
      }

      const repliesRes = await query(
        `SELECT r.id, r.ticket_id, r.message, r.is_staff_reply, r.created_at,
                u.name as sender_name, u.email as sender_email
           FROM support_ticket_replies r
           JOIN users u ON u.id = r.user_id
          WHERE r.ticket_id = $1
          ORDER BY r.created_at ASC`,
        [id]
      );

      const replies = (repliesRes.rows || []).map((r: any) => ({
        id: r.id,
        ticket_id: r.ticket_id,
        message: r.message,
        created_at: r.created_at,
        sender_type: r.is_staff_reply ? 'admin' : 'user',
        sender_name: r.is_staff_reply ? 'Staff Member' : (r.sender_name || r.sender_email || 'Unknown'),
      }));

      res.json({ replies });
    } catch (err: any) {
      if (isMissingTableError(err)) {
        return res.status(400).json({ error: 'support_ticket_replies table not found. Apply migrations before listing replies.' });
      }
      console.error('List ticket replies error:', err);
      res.status(500).json({ error: err.message || 'Failed to fetch replies' });
    }
  }
);

// Reply to a ticket (organization scoped, user reply)
router.post(
  '/tickets/:id/replies',
  [
    param('id').isUUID().withMessage('Invalid ticket id'),
    body('message').isLength({ min: 1 }).withMessage('Message is required')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const { message } = req.body as { message: string };
      const organizationId = (req as any).user.organizationId;
      const userId = (req as any).user.id;

      const ticketCheck = await query(
        'SELECT id FROM support_tickets WHERE id = $1 AND organization_id = $2',
        [id, organizationId]
      );
      if (ticketCheck.rows.length === 0) {
        res.status(404).json({ error: 'Ticket not found' });
        return;
      }

      const now = new Date().toISOString();
      const insertRes = await query(
        `INSERT INTO support_ticket_replies (ticket_id, user_id, message, is_staff_reply, created_at)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [id, userId, message, false, now]
      );
      if (insertRes.rows.length === 0) {
        throw new Error('Failed to create reply');
      }
      await query('UPDATE support_tickets SET updated_at = $1 WHERE id = $2', [now, id]);

      const replyRow = insertRes.rows[0];
      const userRes = await query('SELECT name, email FROM users WHERE id = $1', [userId]);
      const senderName = userRes.rows[0]?.name || userRes.rows[0]?.email || 'Unknown';

      res.status(201).json({
        reply: {
          id: replyRow.id,
          ticket_id: replyRow.ticket_id,
          message: replyRow.message,
          created_at: replyRow.created_at,
          sender_type: 'user',
          sender_name: senderName,
        }
      });
    } catch (err: any) {
      if (isMissingTableError(err)) {
        return res.status(400).json({ error: 'support_ticket_replies table not found. Apply migrations before replying.' });
      }
      console.error('Create ticket reply error:', err);
      res.status(500).json({ error: err.message || 'Failed to add reply' });
    }
  }
);

export default router;