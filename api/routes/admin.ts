/**
 * Admin Routes for ContainerStacks
 * Manage support tickets and VPS plans
 */
import express, { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/auth.js';
import { query, transaction } from '../lib/database.js';
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
        `INSERT INTO ticket_replies (ticket_id, user_id, message, is_admin_reply, created_at) 
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
      console.error('Admin ticket reply error:', err);
      res.status(500).json({ error: err.message || 'Failed to add reply' });
    }
  }
);

// List VPS plans
router.get('/plans', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('vps_plans')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    res.json({ plans: data || [] });
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

      const { base_price, markup_price, active } = req.body as any;
      if (typeof base_price !== 'undefined') updateFields.base_price = base_price;
      if (typeof markup_price !== 'undefined') updateFields.markup_price = markup_price;
      if (typeof active !== 'undefined') updateFields.active = active;
      updateFields.updated_at = new Date().toISOString();

      const { data, error } = await supabaseAdmin
        .from('vps_plans')
        .update(updateFields)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      res.json({ plan: data });
    } catch (err: any) {
      console.error('Admin plan update error:', err);
      res.status(500).json({ error: err.message || 'Failed to update plan' });
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
      const { data: provider, error: providerError } = await supabaseAdmin
        .from('service_providers')
        .select('id')
        .eq('id', provider_id)
        .single();

      if (providerError || !provider) {
        res.status(400).json({ error: 'Provider not found' });
        return;
      }

      const now = new Date().toISOString();
      const { data, error } = await supabaseAdmin
        .from('vps_plans')
        .insert({
          name,
          provider_id,
          provider_plan_id,
          base_price,
          markup_price,
          specifications,
          active,
          created_at: now,
          updated_at: now
        })
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      res.status(201).json({ plan: data });
    } catch (err: any) {
      console.error('Admin plan create error:', err);
      res.status(500).json({ error: err.message || 'Failed to create plan' });
    }
  }
);

// Providers: list and create
router.get('/providers', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('service_providers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    res.json({ providers: data || [] });
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
    body('configuration').optional().isObject(),
    body('active').optional().isBoolean()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { name, type, apiKey, configuration = {}, active = true } = req.body as any;
      const api_key_encrypted = Buffer.from(apiKey).toString('base64');

      const now = new Date().toISOString();
      const { data, error } = await supabaseAdmin
        .from('service_providers')
        .insert({
          name,
          type,
          api_key_encrypted,
          configuration,
          active,
          created_at: now,
          updated_at: now
        })
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      res.status(201).json({ provider: data });
    } catch (err: any) {
      console.error('Admin provider create error:', err);
      res.status(500).json({ error: err.message || 'Failed to create provider' });
    }
  }
);

// Container pricing configuration: get and upsert
router.get('/container/pricing', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('container_pricing_config')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1);
    if (error) {
      if (isMissingTableError(error)) {
        // Gracefully handle missing table with a safe default
        return res.json({ pricing: null, warning: 'container_pricing_config table not found. Apply migrations.' });
      }
      throw new Error(error.message);
    }
    res.json({ pricing: data?.[0] || null });
  } catch (err: any) {
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
      // Upsert single row (create if none exists)
      const { data: existing, error: readErr } = await supabaseAdmin
        .from('container_pricing_config')
        .select('id')
        .limit(1);
      if (readErr) {
        if (isMissingTableError(readErr)) {
          return res.status(400).json({ error: 'container_pricing_config table not found. Apply migrations before updating.' });
        }
        throw new Error(readErr.message);
      }
      let result;
      if (existing && existing.length > 0) {
        result = await supabaseAdmin
          .from('container_pricing_config')
          .update(payload)
          .eq('id', existing[0].id)
          .select('*')
          .single();
      } else {
        result = await supabaseAdmin
          .from('container_pricing_config')
          .insert({ ...payload, created_at: now })
          .select('*')
          .single();
      }
      if (result.error) {
        if (isMissingTableError(result.error)) {
          return res.status(400).json({ error: 'container_pricing_config table not found. Apply migrations before inserting.' });
        }
        throw new Error(result.error.message);
      }
      res.json({ pricing: result.data });
    } catch (err: any) {
      console.error('Admin container pricing upsert error:', err);
      res.status(500).json({ error: err.message || 'Failed to save pricing config' });
    }
  }
);

// Container plans CRUD
router.get('/container/plans', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('container_plans')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      if (isMissingTableError(error)) {
        return res.json({ plans: [], warning: 'container_plans table not found. Apply migrations.' });
      }
      throw new Error(error.message);
    }
    res.json({ plans: data || [] });
  } catch (err: any) {
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
      const { data, error } = await supabaseAdmin
        .from('container_plans')
        .insert({ ...req.body, created_at: now, updated_at: now })
        .select('*')
        .single();
      if (error) {
        if (isMissingTableError(error)) {
          return res.status(400).json({ error: 'container_plans table not found. Apply migrations before creating.' });
        }
        throw new Error(error.message);
      }
      res.status(201).json({ plan: data });
    } catch (err: any) {
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
      const update = { ...req.body, updated_at: new Date().toISOString() };
      const { data, error } = await supabaseAdmin
        .from('container_plans')
        .update(update)
        .eq('id', id)
        .select('*')
        .single();
      if (error) {
        if (isMissingTableError(error)) {
          return res.status(400).json({ error: 'container_plans table not found. Apply migrations before updating.' });
        }
        throw new Error(error.message);
      }
      res.json({ plan: data });
    } catch (err: any) {
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
      const { error } = await supabaseAdmin
        .from('container_plans')
        .delete()
        .eq('id', id);
      if (error) {
        if (isMissingTableError(error)) {
          return res.status(400).json({ error: 'container_plans table not found. Apply migrations before deleting.' });
        }
        throw new Error(error.message);
      }
      res.status(204).send();
    } catch (err: any) {
      console.error('Admin container plan delete error:', err);
      res.status(500).json({ error: err.message || 'Failed to delete container plan' });
    }
  }
);

// Schema check endpoint to report missing tables for quick diagnostics
router.get('/schema/check', authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  const requiredTables = ['container_pricing_config', 'container_plans'];
  const result: Record<string, { exists: boolean; error?: string }> = {};
  for (const table of requiredTables) {
    try {
      const { error } = await supabaseAdmin.from(table as any).select('id').limit(1);
      if (error) {
        if (isMissingTableError(error)) {
          result[table] = { exists: false, error: 'missing' };
        } else {
          result[table] = { exists: false, error: error.message };
        }
      } else {
        result[table] = { exists: true };
      }
    } catch (e: any) {
      result[table] = { exists: false, error: e.message };
    }
  }
  res.json({ schema: result });
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

export default router;