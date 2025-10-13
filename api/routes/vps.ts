import express, { Request, Response } from 'express';
import { authenticateToken, requireOrganization } from '../middleware/auth.js';
import { query } from '../lib/database.js';
import { linodeService } from '../services/linodeService.js';
import { logActivity } from '../services/activityLogger.js';

const router = express.Router();

router.use(authenticateToken, requireOrganization);

// Get Linode Marketplace apps (limited to selected slugs)
router.get('/apps', async (req: Request, res: Response) => {
  try {
    const slugsParam = String(req.query.slugs || '').trim();
    const slugs = slugsParam ? slugsParam.split(',').map(s => s.trim()).filter(Boolean) : [];
    const apps = await linodeService.listMarketplaceApps(slugs.length > 0 ? slugs : undefined);
    res.json({ apps });
  } catch (err: any) {
    console.error('Apps fetch error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch Marketplace apps' });
  }
});

// Get available Linode images
router.get('/images', async (req: Request, res: Response) => {
  try {
    const images = await linodeService.getLinodeImages();
    res.json({ images });
  } catch (err: any) {
    console.error('Images fetch error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch images' });
  }
});

// Get available Linode stack scripts
router.get('/stackscripts', async (req: Request, res: Response) => {
  try {
    const mine = String(req.query.mine || '').toLowerCase() === 'true';
    const stackscripts = await linodeService.getLinodeStackScripts(mine);
    return res.json({ stackscripts });
  } catch (err: any) {
    console.error('StackScripts fetch error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch stack scripts' });
  }
});

// List VPS instances for the user's organization
router.get('/', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const result = await query(
      'SELECT * FROM vps_instances WHERE organization_id = $1 ORDER BY created_at DESC',
      [organizationId]
    );

    const rows = result.rows || [];

    // Fetch region metadata once to map id -> human label
    let regionLabelMap: Record<string, string> = {};
    try {
      const regions = await linodeService.getLinodeRegions();
      regionLabelMap = Object.fromEntries(regions.map(r => [r.id, r.label]));
    } catch (e) {
      // Non-fatal: if regions fail to load, we simply won't provide labels
      console.warn('Failed to fetch Linode regions for labeling:', e);
    }

    // Enrich each instance with latest Linode details and persist status/IP updates
    const enriched = await Promise.all(rows.map(async (row) => {
      try {
        const instanceId = Number(row.provider_instance_id);
        if (!Number.isFinite(instanceId)) return row;
        const detail = await linodeService.getLinodeInstance(instanceId);

        // If status or IP changed, update DB
        const currentIp = Array.isArray(detail.ipv4) && detail.ipv4.length > 0 ? detail.ipv4[0] : null;
        // Normalize provider 'offline' to our UI 'stopped'
        const normalized = detail.status === 'offline' ? 'stopped' : detail.status;
        if (row.status !== normalized || row.ip_address !== currentIp) {
          await query(
            'UPDATE vps_instances SET status = $1, ip_address = $2, updated_at = NOW() WHERE id = $3',
            [normalized, currentIp, row.id]
          );
          row.status = normalized;
          row.ip_address = currentIp;
        }

        // Also keep configuration in sync for image/region when available
        const conf = row.configuration || {};
        const newConf = { ...conf, image: detail.image || conf.image, region: detail.region || conf.region, type: detail.type || conf.type };
        row.configuration = newConf;

        // Attach region label for UI convenience
        const regionCode = newConf.region || '';
        (row as any).region_label = regionLabelMap[regionCode] || null;

        // Attach plan specs and pricing for UI without admin dependency
        let planSpecs = { vcpus: 0, memory: 0, disk: 0, transfer: 0 };
        let planPricing = { hourly: 0, monthly: 0 };
        try {
          // Try by stored plan_id first
          let planRow: any = null;
          if (row.plan_id) {
            const byId = await query('SELECT * FROM vps_plans WHERE id = $1 LIMIT 1', [row.plan_id]);
            planRow = byId.rows[0] || null;
          }
          // Fallback: lookup by provider_plan_id using configuration.type
          if (!planRow && newConf.type) {
            const byProviderId = await query('SELECT * FROM vps_plans WHERE provider_plan_id = $1 LIMIT 1', [newConf.type]);
            planRow = byProviderId.rows[0] || null;
          }

          if (planRow) {
            const specs = planRow.specifications || {};
            const disk = (typeof specs.disk === 'number' ? specs.disk : undefined) ??
                         (typeof specs.storage_gb === 'number' ? specs.storage_gb : undefined) ?? 0;
            const memoryMb = (typeof specs.memory === 'number' ? specs.memory : undefined) ??
                             (typeof specs.memory_gb === 'number' ? specs.memory_gb * 1024 : undefined) ?? 0;
            const vcpus = (typeof specs.vcpus === 'number' ? specs.vcpus : undefined) ??
                           (typeof specs.cpu_cores === 'number' ? specs.cpu_cores : undefined) ?? 0;
            const transferGb = (typeof specs.transfer === 'number' ? specs.transfer : undefined) ??
                               (typeof specs.transfer_gb === 'number' ? specs.transfer_gb : undefined) ??
                               (typeof specs.bandwidth_gb === 'number' ? specs.bandwidth_gb : undefined) ?? 0;

            const basePrice = Number(planRow.base_price || 0);
            const markupPrice = Number(planRow.markup_price || 0);
            const monthly = basePrice + markupPrice;

            planSpecs = { vcpus, memory: memoryMb, disk, transfer: transferGb };
            planPricing = { hourly: monthly / 730, monthly };
          } else if (detail && detail.specs) {
            // Fallback to Linode detail specs when plan is not found
            planSpecs = {
              vcpus: Number(detail.specs.vcpus || 0),
              memory: Number(detail.specs.memory || 0),
              disk: Number(detail.specs.disk || 0),
              transfer: Number(detail.specs.transfer || 0)
            };
          }
        } catch (e) {
          console.warn('Failed to attach plan specs/pricing:', e);
        }

        (row as any).plan_specs = planSpecs;
        (row as any).plan_pricing = planPricing;
      } catch (e) {
        console.warn('Failed to enrich instance with Linode details:', e);
      }
      // Ensure normalized status is returned even if DB was already current
      if (row.status === 'offline') (row as any).status = 'stopped';
      return row;
    }));

    res.json({ instances: enriched });
  } catch (err: any) {
    console.error('VPS list error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch VPS instances' });
  }
});

// Create a new VPS instance via Linode API
router.post('/', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const {
      label,
      type,
      region,
      image,
      rootPassword,
      sshKeys = [],
      backups = false,
      privateIP = false,
      appSlug,
      appData,
      stackscriptId,
      stackscriptData,
    } = req.body || {};

    if (!label || !type || !image || !rootPassword) {
      res.status(400).json({ error: 'label, type, image, and rootPassword are required' });
      return;
    }

    // Validate/normalize the requested Linode plan type
    // Accept either a Linode type id (e.g. 'g6-standard-2') or an internal plan UUID
    let linodeTypeId: string | undefined = undefined;
    try {
      const availableTypes = await linodeService.getLinodeTypes();
      const set = new Set(availableTypes.map(t => t.id));
      if (set.has(type)) {
        linodeTypeId = type;
      }
    } catch (e) {
      // If Linode types cannot be fetched, we will still attempt plan lookup below
      console.warn('Failed to fetch Linode types for validation:', e);
    }

    // Resolve region from the pre-configured VPS plan when available
    // Plans store Linode type id in provider_plan_id and region under specifications.region
    let regionToUse: string | undefined = region;
    let planIdForInstance: string | undefined = undefined;
    try {
      // First, try lookup by provider_plan_id (expected frontend value)
      let planRes = await query(
        'SELECT id, provider_plan_id, specifications FROM vps_plans WHERE provider_plan_id = $1 LIMIT 1',
        [type]
      );
      // If not found, user may have passed internal plan UUID; try that
      if (planRes.rows.length === 0) {
        planRes = await query(
          'SELECT id, provider_plan_id, specifications FROM vps_plans WHERE id = $1 LIMIT 1',
          [type]
        );
      }

      if (planRes.rows.length > 0) {
        const planRow = planRes.rows[0];
        planIdForInstance = String(planRow.id);
        const specs = planRow.specifications || {};
        // Prefer provider_plan_id from plan row when available
        if (!linodeTypeId && typeof planRow.provider_plan_id === 'string' && planRow.provider_plan_id.trim().length > 0) {
          linodeTypeId = planRow.provider_plan_id.trim();
        }
        if (specs && typeof specs.region === 'string' && specs.region.trim().length > 0) {
          regionToUse = specs.region.trim();
        }
      }
    } catch (lookupErr) {
      console.warn('Failed to lookup plan for type:', type, lookupErr);
    }

    if (!linodeTypeId) {
      res.status(400).json({ error: 'Invalid Linode plan type. Provide a valid Linode type id (e.g. g6-standard-2) or a configured plan UUID from /admin.' });
      return;
    }

    if (!regionToUse) {
      res.status(400).json({ error: 'Region is required (plan specifications.region or request body)' });
      return;
    }

    // Create Linode instance (Marketplace app takes precedence when provided)
    const created = appSlug
      ? await linodeService.createInstanceWithMarketplaceApp({
          label,
          type: linodeTypeId,
          region: regionToUse,
          image,
          rootPassword,
          sshKeys,
          backups,
          privateIP,
          appSlug,
          appData: appData || {}
        })
      : await linodeService.createLinodeInstance({
          type: linodeTypeId,
          region: regionToUse,
          image,
          label,
          root_pass: rootPassword,
          authorized_keys: sshKeys,
          backups_enabled: backups,
          private_ip: privateIP,
          stackscript_id: stackscriptId,
          stackscript_data: stackscriptData,
          tags: ['containerstacks'],
          group: 'containerstacks'
        });

    // Persist instance record
    const configuration = {
      type: linodeTypeId,
      region: regionToUse,
      image,
      backups,
      privateIP,
      stackscriptId,
      stackscriptData,
      appSlug,
      appData,
    };

    const ip = Array.isArray(created.ipv4) && created.ipv4.length > 0 ? created.ipv4[0] : null;
    const status = created.status || 'provisioning';

    const insertRes = await query(
      `INSERT INTO vps_instances (organization_id, plan_id, provider_instance_id, label, status, ip_address, configuration)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        organizationId,
        // Prefer actual plan row id when available; otherwise fall back to provider plan id
        planIdForInstance || type,
        String(created.id),
        label,
        status,
        ip,
        configuration,
      ]
    );
    const instance = insertRes.rows[0];
    // Log instance creation
    try {
      const user = (req as any).user;
      await logActivity({
        userId: user.id,
        organizationId: user.organizationId,
        eventType: 'vps.create',
        entityType: 'vps',
        entityId: String(instance.id),
        message: `Created VPS '${label}' (${instance.provider_instance_id})`,
        status: 'success',
        metadata: { label, type, region: regionToUse, image }
      }, req as any);
    } catch {}

    res.status(201).json({ instance });
  } catch (err: any) {
    console.error('VPS create error:', err);
    res.status(500).json({ error: err.message || 'Failed to create VPS instance' });
  }
});

export default router;

// Instance actions: boot
router.post('/:id/boot', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req as any).user.organizationId;
    const rowRes = await query('SELECT * FROM vps_instances WHERE id = $1 AND organization_id = $2', [id, organizationId]);
    if (rowRes.rows.length === 0) return res.status(404).json({ error: 'Instance not found' });
    const row = rowRes.rows[0];
    const providerId = Number(row.provider_instance_id);
    await linodeService.bootLinodeInstance(providerId);
    const detail = await linodeService.getLinodeInstance(providerId);
    const ip = Array.isArray(detail.ipv4) && detail.ipv4.length > 0 ? detail.ipv4[0] : null;
    await query('UPDATE vps_instances SET status = $1, ip_address = $2, updated_at = NOW() WHERE id = $3', [detail.status, ip, id]);
    // Log boot action
    try {
      const user = (req as any).user;
      await logActivity({
        userId: user.id,
        organizationId: user.organizationId,
        eventType: 'vps.boot',
        entityType: 'vps',
        entityId: String(id),
        message: `Booted VPS '${row.label}'`,
        status: 'success'
      }, req as any);
    } catch {}
    res.json({ status: detail.status });
  } catch (err: any) {
    console.error('VPS boot error:', err);
    res.status(500).json({ error: err.message || 'Failed to boot VPS instance' });
  }
});

// Instance actions: shutdown
router.post('/:id/shutdown', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req as any).user.organizationId;
    const rowRes = await query('SELECT * FROM vps_instances WHERE id = $1 AND organization_id = $2', [id, organizationId]);
    if (rowRes.rows.length === 0) return res.status(404).json({ error: 'Instance not found' });
    const row = rowRes.rows[0];
    const providerId = Number(row.provider_instance_id);
    await linodeService.shutdownLinodeInstance(providerId);
    const detail = await linodeService.getLinodeInstance(providerId);
    const ip = Array.isArray(detail.ipv4) && detail.ipv4.length > 0 ? detail.ipv4[0] : null;
    await query('UPDATE vps_instances SET status = $1, ip_address = $2, updated_at = NOW() WHERE id = $3', [detail.status, ip, id]);
    // Log shutdown action
    try {
      const user = (req as any).user;
      await logActivity({
        userId: user.id,
        organizationId: user.organizationId,
        eventType: 'vps.shutdown',
        entityType: 'vps',
        entityId: String(id),
        message: `Shutdown VPS '${row.label}'`,
        status: 'success'
      }, req as any);
    } catch {}
    res.json({ status: detail.status });
  } catch (err: any) {
    console.error('VPS shutdown error:', err);
    res.status(500).json({ error: err.message || 'Failed to shutdown VPS instance' });
  }
});

// Instance actions: reboot
router.post('/:id/reboot', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req as any).user.organizationId;
    const rowRes = await query('SELECT * FROM vps_instances WHERE id = $1 AND organization_id = $2', [id, organizationId]);
    if (rowRes.rows.length === 0) return res.status(404).json({ error: 'Instance not found' });
    const row = rowRes.rows[0];
    const providerId = Number(row.provider_instance_id);
    await linodeService.rebootLinodeInstance(providerId);
    const detail = await linodeService.getLinodeInstance(providerId);
    const ip = Array.isArray(detail.ipv4) && detail.ipv4.length > 0 ? detail.ipv4[0] : null;
    await query('UPDATE vps_instances SET status = $1, ip_address = $2, updated_at = NOW() WHERE id = $3', [detail.status, ip, id]);
    // Log reboot action
    try {
      const user = (req as any).user;
      await logActivity({
        userId: user.id,
        organizationId: user.organizationId,
        eventType: 'vps.reboot',
        entityType: 'vps',
        entityId: String(id),
        message: `Rebooted VPS '${row.label}'`,
        status: 'success'
      }, req as any);
    } catch {}
    res.json({ status: detail.status });
  } catch (err: any) {
    console.error('VPS reboot error:', err);
    res.status(500).json({ error: err.message || 'Failed to reboot VPS instance' });
  }
});

// Delete instance
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req as any).user.organizationId;
    const rowRes = await query('SELECT * FROM vps_instances WHERE id = $1 AND organization_id = $2', [id, organizationId]);
    if (rowRes.rows.length === 0) return res.status(404).json({ error: 'Instance not found' });
    const row = rowRes.rows[0];
    const providerId = Number(row.provider_instance_id);
    await linodeService.deleteLinodeInstance(providerId);
    await query('DELETE FROM vps_instances WHERE id = $1', [id]);
    // Log delete action
    try {
      const user = (req as any).user;
      await logActivity({
        userId: user.id,
        organizationId: user.organizationId,
        eventType: 'vps.delete',
        entityType: 'vps',
        entityId: String(id),
        message: `Deleted VPS '${row.label}'`,
        status: 'success'
      }, req as any);
    } catch {}
    res.json({ deleted: true });
  } catch (err: any) {
    console.error('VPS delete error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete VPS instance' });
  }
});