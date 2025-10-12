import express, { Request, Response } from 'express';
import { authenticateToken, requireOrganization } from '../middleware/auth.js';
import { query } from '../lib/database.js';

const router = express.Router();

router.use(authenticateToken, requireOrganization);

// List VPS instances for the user's organization
router.get('/', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const result = await query(
      'SELECT * FROM vps_instances WHERE organization_id = $1 ORDER BY created_at DESC',
      [organizationId]
    );

    res.json({ instances: result.rows || [] });
  } catch (err: any) {
    console.error('VPS list error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch VPS instances' });
  }
});

export default router;