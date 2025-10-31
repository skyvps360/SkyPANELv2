import express, { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken, requireOrganization } from '../middleware/auth.js';
import { query } from '../lib/database.js';
import { dockerEngineService } from '../services/dockerEngineService.js';
import { logActivity } from '../services/activityLogger.js';

const router = express.Router();

router.use(authenticateToken, requireOrganization);

const isMissingTableError = (err: any): boolean => {
  const msg = (err?.message || '').toLowerCase();
  return (
    msg.includes('relation "containers" does not exist') ||
    msg.includes('relation "container_plans" does not exist') ||
    msg.includes('schema cache')
  );
};

router.get('/plans', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const result = await query(
      `SELECT cp.*
       FROM container_plans cp
       LEFT JOIN organization_container_plans ocp
         ON ocp.plan_id = cp.id AND ocp.organization_id = $1
       WHERE cp.active = TRUE
         AND (cp.is_public = TRUE OR ocp.organization_id IS NOT NULL)
       ORDER BY cp.created_at DESC`,
      [organizationId]
    );
    res.json({ plans: result.rows || [] });
  } catch (err: any) {
    if (isMissingTableError(err)) {
      return res.json({ plans: [] });
    }
    console.error('Containers plans fetch failed:', err);
    res.status(500).json({ error: err.message || 'Failed to load container plans' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const result = await query(
      `SELECT c.*, cp.name AS plan_name, cp.resource_profile, cp.max_containers, cp.price_monthly
       FROM containers c
       LEFT JOIN container_plans cp ON cp.id = c.plan_id
       WHERE c.organization_id = $1
       ORDER BY c.created_at DESC`,
      [organizationId]
    );

    const rows = result.rows || [];
    // Return containers as-is from the database; status/runtimes are updated by a background sync job.
    res.json({ containers: rows });
  } catch (err: any) {
    if (isMissingTableError(err)) {
      return res.json({ containers: [] });
    }
    console.error('Containers list error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch containers' });
  }
});

router.post(
  '/',
  [
    body('name').isString().trim().notEmpty(),
    body('image').isString().trim().notEmpty(),
    body('planId').isUUID(),
    body('ports').optional().isArray(),
    body('volumes').optional().isArray(),
    body('environment').optional().isObject(),
    body('command').optional(),
    body('restartPolicy').optional().isIn(['no', 'always', 'unless-stopped', 'on-failure']),
    body('autoStart').optional().isBoolean(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid input', details: errors.array() });
    }

    const organizationId = (req as any).user.organizationId;
    const userId = (req as any).user.id;
    const { name, image, planId, ports = [], volumes = [], environment = {}, command, restartPolicy, autoStart } = req.body;

    try {
      const planResult = await query(
        `SELECT cp.*,
                (cp.is_public = TRUE OR ocp.organization_id IS NOT NULL) AS accessible
         FROM container_plans cp
         LEFT JOIN organization_container_plans ocp
           ON ocp.plan_id = cp.id AND ocp.organization_id = $1
         WHERE cp.id = $2`,
        [organizationId, planId]
      );

      const plan = planResult.rows?.[0];
      if (!plan || !plan.active || !plan.accessible) {
        return res.status(403).json({ error: 'Selected plan is not available' });
      }

      const countResult = await query(
        'SELECT COUNT(*)::int AS count FROM containers WHERE organization_id = $1 AND plan_id = $2',
        [organizationId, planId]
      );
      const currentCount = countResult.rows?.[0]?.count ?? 0;
      if (currentCount >= plan.max_containers) {
        return res.status(400).json({ error: 'Plan container quota exceeded' });
      }

      const dockerPayload = {
        name,
        image,
        env: environment,
        command,
        restartPolicy: restartPolicy ?? 'unless-stopped',
        // Port mapping supports multiple property name aliases for backwards compatibility:
        // - containerPort (standard), internal, private: the container's internal port
        // - hostPort (standard), public: the host machine port to bind to
        ports: Array.isArray(ports)
          ? ports.map((port: any) => ({
              containerPort: Number(port.containerPort ?? port.internal ?? port.private ?? port),
              hostPort: port.hostPort ? Number(port.hostPort) : port.public ? Number(port.public) : undefined,
              protocol: port.protocol ?? 'tcp',
              hostIp: port.hostIp,
            }))
          : [],
        volumes: Array.isArray(volumes)
          ? volumes.map((volume: any) => ({
              source: volume.source ?? volume.host,
              target: volume.target ?? volume.container ?? volume.path,
              readOnly: volume.readOnly ?? volume.ro ?? false,
              type: volume.type,
            }))
          : [],
        autoStart: autoStart ?? true,
      };

      const dockerContainer = await dockerEngineService.createContainer(dockerPayload);

      try {
        const config = {
          ports,
          volumes,
          environment,
          command,
          restartPolicy: restartPolicy ?? 'unless-stopped',
        };

        const desiredState = dockerPayload.autoStart ? 'running' : 'stopped';
        const status = dockerContainer.state || 'created';
        const runtime = {
          docker: dockerContainer,
        };
        const now = new Date().toISOString();

        const insert = await query(
          `INSERT INTO containers (name, image, organization_id, config, status, created_by, plan_id, docker_id, desired_state, runtime, last_status_sync, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
           RETURNING *`,
          [
            name,
            image,
            organizationId,
            config,
            status,
            userId,
            planId,
            dockerContainer.dockerId,
            desiredState,
            runtime,
            now,
            now,
          ]
        );

        const containerRow = insert.rows[0];

        await logActivity({
          userId,
          organizationId,
          entityType: 'container',
          entityId: containerRow.id,
          eventType: 'container_created',
          message: `Created container ${name} (${dockerContainer.dockerId})`,
          status: 'success',
          metadata: {
            image,
            planId,
            dockerId: dockerContainer.dockerId,
          },
        });

        res.status(201).json({ container: containerRow, runtime });
      } catch (dbErr) {
        if (dockerContainer?.dockerId) {
          try {
            await dockerEngineService.removeContainer(dockerContainer.dockerId, true);
          } catch (cleanupErr) {
            console.error('Rollback failed:', cleanupErr);
          }
        }
        throw dbErr;
      }
    } catch (err: any) {
      if (isMissingTableError(err)) {
        return res.status(400).json({ error: 'Required tables missing. Run migrations.' });
      }
      console.error('Container create error:', err);
      res.status(500).json({ error: err.message || 'Failed to create container' });
    }
  }
);

router.post(
  '/:id/actions',
  [
    param('id').isUUID(),
    body('action').isIn(['start', 'stop', 'restart']),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid input', details: errors.array() });
    }

    const organizationId = (req as any).user.organizationId;
    const userId = (req as any).user.id;
    const { action } = req.body;
    const { id } = req.params;

    try {
      const { rows } = await query(
        'SELECT * FROM containers WHERE id = $1 AND organization_id = $2',
        [id, organizationId]
      );
      const container = rows[0];
      if (!container) {
        return res.status(404).json({ error: 'Container not found' });
      }

      if (!container.docker_id) {
        return res.status(400).json({ error: 'Container is not linked to Docker yet' });
      }

      if (action === 'start') {
        await dockerEngineService.startContainer(container.docker_id);
      } else if (action === 'stop') {
        await dockerEngineService.stopContainer(container.docker_id);
      } else if (action === 'restart') {
        await dockerEngineService.restartContainer(container.docker_id);
      }

      const detail = await dockerEngineService.inspectContainer(container.docker_id);
      const status = detail?.state || detail?.status || (action === 'stop' ? 'stopped' : 'running');
      const desiredState = action === 'stop' ? 'stopped' : 'running';
      const runtime = detail
        ? { docker: detail }
        : container.runtime && typeof container.runtime === 'object'
          ? container.runtime
          : {};
      const now = new Date().toISOString();

      const update = await query(
        'UPDATE containers SET status = $1, desired_state = $2, runtime = $3, last_status_sync = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
        [status, desiredState, runtime, now, id]
      );

      await logActivity({
        userId,
        organizationId,
        entityType: 'container',
        entityId: id,
        eventType: `container_${action}`,
        message: `${action} container ${container.name}`,
        status: 'success',
        metadata: {
          dockerId: container.docker_id,
        },
      });

      res.json({ container: update.rows[0], runtime });
    } catch (err: any) {
      console.error('Container action error:', err);
      res.status(500).json({ error: err.message || `Failed to ${req.body.action} container` });
    }
  }
);

router.delete(
  '/:id',
  [param('id').isUUID()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid input', details: errors.array() });
    }

    const organizationId = (req as any).user.organizationId;
    const userId = (req as any).user.id;
    const { id } = req.params;

    try {
      const { rows } = await query(
        'SELECT * FROM containers WHERE id = $1 AND organization_id = $2',
        [id, organizationId]
      );
      const container = rows[0];
      if (!container) {
        return res.status(404).json({ error: 'Container not found' });
      }

      if (container.docker_id) {
        try {
          await dockerEngineService.removeContainer(container.docker_id, true);
        } catch (dockerErr) {
          console.warn(`Failed to remove Docker container ${container.docker_id}`, dockerErr);
        }
      }

      await query('DELETE FROM containers WHERE id = $1', [id]);

      await logActivity({
        userId,
        organizationId,
        entityType: 'container',
        entityId: id,
        eventType: 'container_deleted',
        message: `Deleted container ${container.name}`,
        status: 'success',
        metadata: {
          dockerId: container.docker_id,
        },
      });

      res.status(204).send();
    } catch (err: any) {
      console.error('Container delete error:', err);
      res.status(500).json({ error: err.message || 'Failed to delete container' });
    }
  }
);

export default router;
