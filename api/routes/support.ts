import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, requireOrganization } from '../middleware/auth.js';
import { query } from '../lib/database.js';

const router = express.Router();

router.use(authenticateToken, requireOrganization);

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

export default router;