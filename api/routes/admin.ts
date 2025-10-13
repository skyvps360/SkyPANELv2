/**
 * Admin Routes for ContainerStacks
 * Manage support tickets and VPS plans
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import express, { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/auth.js';
import { query } from '../lib/database.js';
import { linodeService } from '../services/linodeService.js';

const router = express.Router();

// Helper to detect missing-table errors from Supabase
const isMissingTableError = (err: any): boolean => {
  const msg = (err?.message || '').toLowerCase();
  return (
    msg.includes('could not find the table') ||
    msg.includes('relation') && msg.includes('does not exist') ||
    msg.includes('schema cache')
  );
};

// List all support tickets (admin only)
router.get('/tickets', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM support_tickets ORDER BY created_at DESC'
    );

    res.json({ tickets: result.rows || [] });
  } catch (err: any) {
    console.error('Admin tickets list error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch tickets' });
  }
});

// Update ticket status
router.patch(
  '/tickets/:id/status',
  authenticateToken,
  requireAdmin,
  [
    param('id').isUUID().withMessage('Invalid ticket id'),
    body('status').isIn(['open', 'in_progress', 'resolved', 'closed']).withMessage('Invalid status')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const { status } = req.body as { status: string };

      const result = await query(
        'UPDATE support_tickets SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *',
        [status, new Date().toISOString(), id]
      );

      if (result.rows.length === 0) {
        throw new Error('Ticket not found');
      }

      res.json({ ticket: result.rows[0] });
    } catch (err: any) {
      console.error('Admin ticket status update error:', err);
      res.status(500).json({ error: err.message || 'Failed to update ticket status' });
    }
  }
);

// Delete a ticket (admin)
router.delete(
  '/tickets/:id',
  authenticateToken,
  requireAdmin,
  [param('id').isUUID()],
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await query('DELETE FROM support_tickets WHERE id = $1', [id]);
      res.status(204).send();
    } catch (err: any) {
      console.error('Admin ticket delete error:', err);
      res.status(500).json({ error: err.message || 'Failed to delete ticket' });
    }
  }
);

// Reply to a ticket (admin)
router.post(
  '/tickets/:id/replies',
  authenticateToken,
  requireAdmin,
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

      // Create reply
      const replyResult = await query(
        `INSERT INTO support_ticket_replies (ticket_id, user_id, message, is_staff_reply, created_at) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [id, (req as any).user?.id, message, true, new Date().toISOString()]
      );

      if (replyResult.rows.length === 0) {
        throw new Error('Failed to create reply');
      }

      // Touch ticket updated_at
      await query(
        'UPDATE support_tickets SET updated_at = $1 WHERE id = $2',
        [new Date().toISOString(), id]
      );

      res.status(201).json({ reply: replyResult.rows[0] });
    } catch (err: any) {
      if (isMissingTableError(err)) {
        return res.status(400).json({ error: 'support_ticket_replies table not found. Apply migrations before replying.' });
      }
      console.error('Admin ticket reply error:', err);
      res.status(500).json({ error: err.message || 'Failed to add reply' });
    }
  }
);

// List VPS plans
router.get('/plans', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM vps_plans WHERE active = true ORDER BY created_at DESC'
    );

    res.json({ plans: result.rows || [] });
  } catch (err: any) {
    console.error('Admin plans list error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch plans' });
  }
});

// Update VPS plan pricing/active state
router.put(
  '/plans/:id',
  authenticateToken,
  requireAdmin,
  [
    param('id').isUUID().withMessage('Invalid plan id'),
    body('name').optional().isString().trim().notEmpty(),
    body('base_price').optional().isFloat({ min: 0 }),
    body('markup_price').optional().isFloat({ min: 0 }),
    body('active').optional().isBoolean()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const updateFields: any = {};

      const { name, base_price, markup_price, active } = req.body as any;
      if (typeof name !== 'undefined') updateFields.name = name;
      if (typeof base_price !== 'undefined') updateFields.base_price = base_price;
      if (typeof markup_price !== 'undefined') updateFields.markup_price = markup_price;
      if (typeof active !== 'undefined') updateFields.active = active;
      updateFields.updated_at = new Date().toISOString();

      const setClauses: string[] = [];
      const values: any[] = [];
      let idx = 1;
      for (const [key, val] of Object.entries(updateFields)) {
        setClauses.push(`${key} = $${idx}`);
        values.push(val);
        idx++;
      }
      values.push(id);

      const result = await query(
        `UPDATE vps_plans SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Plan not found');
      }

      res.json({ plan: result.rows[0] });
    } catch (err: any) {
      console.error('Admin plan update error:', err);
      res.status(500).json({ error: err.message || 'Failed to update plan' });
    }
  }
);

// Delete a VPS plan
router.delete(
  '/plans/:id',
  authenticateToken,
  requireAdmin,
  [param('id').isUUID()],
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await query('DELETE FROM vps_plans WHERE id = $1', [id]);
      res.status(204).send();
    } catch (err: any) {
      console.error('Admin VPS plan delete error:', err);
      res.status(500).json({ error: err.message || 'Failed to delete VPS plan' });
    }
  }
);

// Create a new VPS plan
router.post(
  '/plans',
  authenticateToken,
  requireAdmin,
  [
    body('name').isString().trim().notEmpty(),
    body('provider_id').isUUID(),
    body('provider_plan_id').isString().trim().notEmpty(),
    body('base_price').isFloat({ min: 0 }),
    body('markup_price').isFloat({ min: 0 }),
    body('active').optional().isBoolean(),
    body('specifications').optional().isObject()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const {
        name,
        provider_id,
        provider_plan_id,
        base_price,
        markup_price,
        active = true,
        specifications = {}
      } = req.body as any;

      // Ensure provider exists
      const providerCheck = await query(
        'SELECT id FROM service_providers WHERE id = $1 LIMIT 1',
        [provider_id]
      );

      if (providerCheck.rows.length === 0) {
        res.status(400).json({ error: 'Provider not found' });
        return;
      }

      const now = new Date().toISOString();
      const insertResult = await query(
        `INSERT INTO vps_plans (name, provider_id, provider_plan_id, base_price, markup_price, specifications, active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          name,
          provider_id,
          provider_plan_id,
          base_price,
          markup_price,
          specifications,
          active,
          now,
          now,
        ]
      );

      res.status(201).json({ plan: insertResult.rows[0] });
    } catch (err: any) {
      console.error('Admin plan create error:', err);
      res.status(500).json({ error: err.message || 'Failed to create plan' });
    }
  }
);

// Providers: list and create
router.get('/providers', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM service_providers ORDER BY created_at DESC'
    );

    res.json({ providers: result.rows || [] });
  } catch (err: any) {
    console.error('Admin providers list error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch providers' });
  }
});

router.post(
  '/providers',
  authenticateToken,
  requireAdmin,
  [
    body('name').isString().trim().notEmpty(),
    body('type').isIn(['linode', 'digitalocean', 'aws', 'gcp']),
    body('apiKey').isString().trim().notEmpty(),
    body('active').optional().isBoolean()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, type, apiKey, active = true } = req.body;
      const result = await query(
        `INSERT INTO service_providers (name, type, api_key_encrypted, active)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [name, type, apiKey, active]
      );

      res.status(201).json({ provider: result.rows[0] });
    } catch (err: any) {
      console.error('Admin provider create error:', err);
      res.status(500).json({ error: err.message || 'Failed to create provider' });
    }
  }
);

// Update a provider
router.put(
  '/providers/:id',
  authenticateToken,
  requireAdmin,
  [
    param('id').isUUID(),
    body('name').optional().isString().trim().notEmpty(),
    body('active').optional().isBoolean()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { name, active } = req.body;
      
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(name);
      }
      if (active !== undefined) {
        updates.push(`active = $${paramCount++}`);
        values.push(active);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const result = await query(
        `UPDATE service_providers SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Provider not found' });
      }

      res.json({ provider: result.rows[0] });
    } catch (err: any) {
      console.error('Admin provider update error:', err);
      res.status(500).json({ error: err.message || 'Failed to update provider' });
    }
  }
);

// Delete a provider
router.delete(
  '/providers/:id',
  authenticateToken,
  requireAdmin,
  [param('id').isUUID()],
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await query('DELETE FROM service_providers WHERE id = $1', [id]);
      res.status(204).send();
    } catch (err: any) {
      console.error('Admin provider delete error:', err);
      res.status(500).json({ error: err.message || 'Failed to delete provider' });
    }
  }
);

// Container pricing configuration: get and upsert
router.get('/container/pricing', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM container_pricing_config ORDER BY updated_at DESC LIMIT 1'
    );
    res.json({ pricing: result.rows?.[0] || null });
  } catch (err: any) {
    if (isMissingTableError(err)) {
      return res.json({ pricing: null, warning: 'container_pricing_config table not found. Apply migrations.' });
    }
    console.error('Admin container pricing get error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch pricing config' });
  }
});

router.put(
  '/container/pricing',
  authenticateToken,
  requireAdmin,
  [
    body('price_per_cpu').isFloat({ min: 0 }),
    body('price_per_ram_gb').isFloat({ min: 0 }),
    body('price_per_storage_gb').isFloat({ min: 0 }),
    body('price_per_network_mbps').isFloat({ min: 0 }),
    body('currency').optional().isString().isLength({ min: 3, max: 3 })
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const now = new Date().toISOString();
      const payload = { ...req.body, updated_at: now };
      try {
        const existing = await query(
          'SELECT id FROM container_pricing_config LIMIT 1'
        );

        if (existing.rows.length > 0) {
          const updateRes = await query(
            `UPDATE container_pricing_config
             SET price_per_cpu = $1,
                 price_per_ram_gb = $2,
                 price_per_storage_gb = $3,
                 price_per_network_mbps = $4,
                 currency = COALESCE($5, currency),
                 updated_at = $6
             WHERE id = $7
             RETURNING *`,
            [
              payload.price_per_cpu,
              payload.price_per_ram_gb,
              payload.price_per_storage_gb,
              payload.price_per_network_mbps,
              payload.currency || null,
              now,
              existing.rows[0].id,
            ]
          );
          return res.json({ pricing: updateRes.rows[0] });
        } else {
          const insertRes = await query(
            `INSERT INTO container_pricing_config
             (price_per_cpu, price_per_ram_gb, price_per_storage_gb, price_per_network_mbps, currency, created_at, updated_at)
             VALUES ($1, $2, $3, $4, COALESCE($5, 'USD'), $6, $7)
             RETURNING *`,
            [
              payload.price_per_cpu,
              payload.price_per_ram_gb,
              payload.price_per_storage_gb,
              payload.price_per_network_mbps,
              payload.currency || null,
              now,
              now,
            ]
          );
          return res.json({ pricing: insertRes.rows[0] });
        }
      } catch (err: any) {
        if (isMissingTableError(err)) {
          return res.status(400).json({ error: 'container_pricing_config table not found. Apply migrations before updating.' });
        }
        throw err;
      }
    } catch (err: any) {
      console.error('Admin container pricing upsert error:', err);
      res.status(500).json({ error: err.message || 'Failed to save pricing config' });
    }
  }
);

// Container plans CRUD
router.get('/container/plans', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM container_plans ORDER BY created_at DESC'
    );
    res.json({ plans: result.rows || [] });
  } catch (err: any) {
    if (isMissingTableError(err)) {
      return res.json({ plans: [], warning: 'container_plans table not found. Apply migrations.' });
    }
    console.error('Admin container plans list error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch container plans' });
  }
});

router.post(
  '/container/plans',
  authenticateToken,
  requireAdmin,
  [
    body('name').isString().trim().notEmpty(),
    body('cpu_cores').isInt({ min: 1 }),
    body('ram_gb').isInt({ min: 1 }),
    body('storage_gb').isInt({ min: 1 }),
    body('network_mbps').isInt({ min: 0 }),
    body('base_price').isFloat({ min: 0 }),
    body('markup_price').isFloat({ min: 0 }),
    body('active').optional().isBoolean()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const now = new Date().toISOString();
      const insertRes = await query(
        `INSERT INTO container_plans (name, cpu_cores, ram_gb, storage_gb, network_mbps, base_price, markup_price, active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, true), $9, $10)
         RETURNING *`,
        [
          req.body.name,
          req.body.cpu_cores,
          req.body.ram_gb,
          req.body.storage_gb,
          req.body.network_mbps,
          req.body.base_price,
          req.body.markup_price,
          req.body.active,
          now,
          now,
        ]
      );
      res.status(201).json({ plan: insertRes.rows[0] });
    } catch (err: any) {
      if (isMissingTableError(err)) {
        return res.status(400).json({ error: 'container_plans table not found. Apply migrations before creating.' });
      }
      console.error('Admin container plan create error:', err);
      res.status(500).json({ error: err.message || 'Failed to create container plan' });
    }
  }
);

router.put(
  '/container/plans/:id',
  authenticateToken,
  requireAdmin,
  [
    param('id').isUUID(),
    body('name').optional().isString().trim().notEmpty(),
    body('cpu_cores').optional().isInt({ min: 1 }),
    body('ram_gb').optional().isInt({ min: 1 }),
    body('storage_gb').optional().isInt({ min: 1 }),
    body('network_mbps').optional().isInt({ min: 0 }),
    body('base_price').optional().isFloat({ min: 0 }),
    body('markup_price').optional().isFloat({ min: 0 }),
    body('active').optional().isBoolean()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const { id } = req.params;
      const update: any = { ...req.body, updated_at: new Date().toISOString() };
      const setClauses: string[] = [];
      const values: any[] = [];
      let idx = 1;
      for (const [key, val] of Object.entries(update)) {
        setClauses.push(`${key} = $${idx}`);
        values.push(val);
        idx++;
      }
      values.push(id);
      const result = await query(
        `UPDATE container_plans SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );
      if (result.rows.length === 0) {
        throw new Error('Container plan not found');
      }
      res.json({ plan: result.rows[0] });
    } catch (err: any) {
      if (isMissingTableError(err)) {
        return res.status(400).json({ error: 'container_plans table not found. Apply migrations before updating.' });
      }
      console.error('Admin container plan update error:', err);
      res.status(500).json({ error: err.message || 'Failed to update container plan' });
    }
  }
);

router.delete(
  '/container/plans/:id',
  authenticateToken,
  requireAdmin,
  [param('id').isUUID()],
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await query(
        'DELETE FROM container_plans WHERE id = $1',
        [id]
      );
      res.status(204).send();
    } catch (err: any) {
      if (isMissingTableError(err)) {
        return res.status(400).json({ error: 'container_plans table not found. Apply migrations before deleting.' });
      }
      console.error('Admin container plan delete error:', err);
      res.status(500).json({ error: err.message || 'Failed to delete container plan' });
    }
  }
);

// Schema check endpoint to report missing tables for quick diagnostics
router.get('/schema/check', authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  const requiredTables = ['container_pricing_config', 'container_plans'];
  const result: Record<string, { exists: boolean; error?: string }> = {};
  try {
    for (const table of requiredTables) {
      const check = await query(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.tables 
           WHERE table_schema = 'public' AND table_name = $1
         ) AS exists`,
        [table]
      );
      const exists = check.rows[0]?.exists === true;
      result[table] = { exists };
    }
    res.json({ schema: result });
  } catch (e: any) {
    for (const table of requiredTables) {
      result[table] = { exists: false, error: e.message };
    }
    res.json({ schema: result });
  }
});

// Get Linode plans (types)
router.get('/linode/plans', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const plans = await linodeService.getLinodeTypes();
    res.json({ plans });
  } catch (err: any) {
    console.error('Error fetching Linode plans:', err);
    res.status(500).json({ 
      error: err.message || 'Failed to fetch Linode plans',
      details: 'Make sure LINODE_API_TOKEN is configured in environment variables'
    });
  }
});

// Get Linode regions
router.get('/linode/regions', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const regions = await linodeService.getLinodeRegions();
    res.json({ regions });
  } catch (err: any) {
    console.error('Error fetching Linode regions:', err);
    res.status(500).json({ 
      error: err.message || 'Failed to fetch Linode regions',
      details: 'Make sure LINODE_API_TOKEN is configured in environment variables'
    });
  }
});

// Get Linode StackScripts
router.get('/linode/stackscripts', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const mine = String(req.query.mine || '').toLowerCase() === 'true';
    const stackscripts = await linodeService.getLinodeStackScripts(mine);
    res.json({ stackscripts });
  } catch (err: any) {
    console.error('Error fetching Linode StackScripts:', err);
    res.status(500).json({ 
      error: err.message || 'Failed to fetch StackScripts',
      details: 'Make sure LINODE_API_TOKEN is configured in environment variables'
    });
  }
});

// StackScript Configs: List all configs
router.get('/stackscripts/configs', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM vps_stackscript_configs ORDER BY display_order ASC, label ASC');
    res.json({ configs: result.rows || [] });
  } catch (err: any) {
    console.error('Error fetching StackScript configs:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch StackScript configs' });
  }
});

// StackScript Configs: Update a config
router.put('/stackscripts/configs/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { label, description, is_enabled, display_order, metadata } = req.body;
    const now = new Date().toISOString();
    
    // Parse metadata if it's a string, otherwise use as-is (or default to empty object)
    let metadataValue = {};
    if (metadata !== undefined && metadata !== null) {
      metadataValue = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
    }
    
    const result = await query(
      `UPDATE vps_stackscript_configs SET
        label = COALESCE($1, label),
        description = COALESCE($2, description),
        is_enabled = COALESCE($3, is_enabled),
        display_order = COALESCE($4, display_order),
        metadata = COALESCE($5, metadata),
        updated_at = $6
      WHERE stackscript_id = $7 RETURNING *`,
      [label, description, is_enabled, display_order, metadataValue, now, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Config not found' });
    }
    res.json({ config: result.rows[0] });
  } catch (err: any) {
    console.error('Error updating StackScript config:', err);
    res.status(500).json({ error: err.message || 'Failed to update StackScript config' });
  }
});

// StackScript Configs: Create or update a config
router.post('/stackscripts/configs', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { stackscript_id, label, description, is_enabled, display_order, metadata } = req.body;
    const now = new Date().toISOString();
    
    // Parse metadata if it's a string, otherwise use as-is (or default to empty object)
    let metadataValue = {};
    if (metadata !== undefined && metadata !== null) {
      metadataValue = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
    }
    
    const result = await query(
      `INSERT INTO vps_stackscript_configs
        (stackscript_id, label, description, is_enabled, display_order, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, COALESCE($4, TRUE), COALESCE($5, 0), $6, $7, $7)
       ON CONFLICT (stackscript_id) DO UPDATE SET
         label = EXCLUDED.label,
         description = EXCLUDED.description,
         is_enabled = EXCLUDED.is_enabled,
         display_order = EXCLUDED.display_order,
         metadata = EXCLUDED.metadata,
         updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [stackscript_id, label, description, is_enabled, display_order, metadataValue, now]
    );
    res.status(201).json({ config: result.rows[0] });
  } catch (err: any) {
    console.error('Error upserting StackScript config:', err);
    res.status(500).json({ error: err.message || 'Failed to upsert StackScript config' });
  }
});

// StackScript Configs: Delete a config
router.delete('/stackscripts/configs/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM vps_stackscript_configs WHERE stackscript_id = $1', [id]);
    res.status(204).send();
  } catch (err: any) {
    console.error('Error deleting StackScript config:', err);
    res.status(500).json({ error: err.message || 'Failed to delete StackScript config' });
  }
});

export default router;