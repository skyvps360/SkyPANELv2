/* eslint-disable @typescript-eslint/no-explicit-any */
import express, { Request, Response } from 'express';
import { authenticateToken, requireOrganization } from '../middleware/auth.js';
import { query } from '../lib/database.js';
import { linodeService } from '../services/linodeService.js';
import type {
  LinodeInstance,
  LinodeInstanceBackupsResponse,
  LinodeInstanceStatsResponse,
  LinodeBackupSummary,
  LinodeMetricTuple
} from '../services/linodeService.js';
import { logActivity } from '../services/activityLogger.js';

const router = express.Router();

router.use(authenticateToken, requireOrganization);

interface MetricPoint {
  timestamp: number;
  value: number;
}

interface MetricSummary {
  average: number;
  peak: number;
  last: number;
}

interface MetricSeriesPayload {
  series: MetricPoint[];
  summary: MetricSummary;
  unit: 'percent' | 'bitsPerSecond' | 'blocksPerSecond';
}

interface TransferPayload {
  usedGb: number;
  quotaGb: number;
  billableGb: number;
  utilizationPercent: number;
}

interface BackupsPayload {
  enabled: boolean;
  available: boolean;
  schedule: { day: string | null; window: string | null } | null;
  lastSuccessful: string | null;
  automatic: BackupSummaryPayload[];
  snapshot: BackupSummaryPayload | null;
  snapshotInProgress: BackupSummaryPayload | null;
}

interface BackupSummaryPayload {
  id: number | null;
  label: string | null;
  type: string | null;
  status: string | null;
  created: string | null;
  finished: string | null;
  updated: string | null;
  available: boolean;
  totalSizeMb: number;
  configs: string[];
}

interface PlanSpecs {
  vcpus: number;
  memory: number;
  disk: number;
  transfer: number;
}

interface PlanPricing {
  hourly: number;
  monthly: number;
}

interface PlanMeta {
  planRow: any;
  specs: PlanSpecs;
  pricing: PlanPricing;
  providerPlanId: string | null;
}

const normalizeProviderStatus = (status: string | null | undefined): string => {
  if (!status) return 'unknown';
  return status === 'offline' ? 'stopped' : status;
};

const isMetricTuple = (value: unknown): value is LinodeMetricTuple =>
  Array.isArray(value) &&
  value.length >= 2 &&
  typeof value[0] === 'number' &&
  typeof value[1] === 'number';

const normalizeSeries = (series: unknown): MetricPoint[] => {
  if (!Array.isArray(series)) {
    return [];
  }
  return (series as unknown[])
    .filter(isMetricTuple)
    .map(([timestamp, value]) => ({ timestamp, value }))
    .filter(point => Number.isFinite(point.timestamp) && Number.isFinite(point.value));
};

const summarizeSeries = (series: MetricPoint[]): MetricSummary => {
  if (series.length === 0) {
    return { average: 0, peak: 0, last: 0 };
  }
  let total = 0;
  let peak = -Infinity;
  for (const point of series) {
    total += point.value;
    if (point.value > peak) {
      peak = point.value;
    }
  }
  return {
    average: total / series.length,
    peak: peak === -Infinity ? 0 : peak,
    last: series[series.length - 1]?.value ?? 0,
  };
};

const deriveTimeframe = (collections: MetricPoint[][]): { start: number | null; end: number | null } => {
  const timestamps: number[] = [];
  collections.forEach(series => {
    series.forEach(point => {
      if (Number.isFinite(point.timestamp)) {
        timestamps.push(point.timestamp);
      }
    });
  });
  if (timestamps.length === 0) {
    return { start: null, end: null };
  }
  return {
    start: Math.min(...timestamps),
    end: Math.max(...timestamps),
  };
};

const bytesToGigabytes = (value: number): number => value / (1024 ** 3);

const mapBackupSummary = (backup: LinodeBackupSummary | null | undefined): BackupSummaryPayload | null => {
  if (!backup || typeof backup !== 'object') {
    return null;
  }
  const disks = Array.isArray(backup.disks) ? backup.disks : [];
  const totalSizeMb = disks.reduce<number>((sum, disk) => {
    const diskSize = typeof (disk as { size?: unknown }).size === 'number' ? (disk as { size?: number }).size! : 0;
    return sum + diskSize;
  }, 0);

  return {
    id: typeof backup.id === 'number' ? backup.id : null,
    label: typeof backup.label === 'string' ? backup.label : null,
    type: typeof backup.type === 'string' ? backup.type : null,
    status: typeof backup.status === 'string' ? backup.status : null,
    created: typeof backup.created === 'string' ? backup.created : null,
    finished: typeof backup.finished === 'string' ? backup.finished : null,
    updated: typeof backup.updated === 'string' ? backup.updated : null,
    available: Boolean((backup as { available?: boolean }).available),
    totalSizeMb,
    configs: Array.isArray(backup.configs) ? backup.configs : [],
  };
};

let regionLabelCache: Map<string, string> | null = null;

const ensureRegionLabelCache = async (): Promise<Map<string, string>> => {
  if (regionLabelCache) {
    return regionLabelCache;
  }
  try {
    const regions = await linodeService.getLinodeRegions();
    regionLabelCache = new Map(regions.map(region => [region.id, region.label]));
  } catch (err) {
    console.warn('Failed to populate region label cache:', err);
    regionLabelCache = new Map();
  }
  return regionLabelCache;
};

const resolveRegionLabel = async (regionId: string | null): Promise<string | null> => {
  if (!regionId) {
    return null;
  }
  const cache = await ensureRegionLabelCache();
  if (cache.has(regionId)) {
    return cache.get(regionId) ?? null;
  }
  try {
    const regions = await linodeService.getLinodeRegions();
    regionLabelCache = new Map(regions.map(region => [region.id, region.label]));
    return regionLabelCache.get(regionId) ?? null;
  } catch (err) {
    console.warn('Failed to refresh region labels:', err);
    return null;
  }
};

const resolvePlanMeta = async (
  instanceRow: any,
  providerDetail: LinodeInstance | null
): Promise<PlanMeta> => {
  let planRow: any = null;
  const configuration = (instanceRow?.configuration && typeof instanceRow.configuration === 'object')
    ? instanceRow.configuration
    : {};
  const configuredType = typeof configuration?.type === 'string' ? configuration.type : undefined;
  const providerType = providerDetail?.type;

  const planIdCandidate = instanceRow?.plan_id;

  try {
    if (planIdCandidate) {
      const res = await query('SELECT * FROM vps_plans WHERE id = $1 LIMIT 1', [planIdCandidate]);
      planRow = res.rows[0] ?? null;
    }
    if (!planRow && configuredType) {
      const res = await query('SELECT * FROM vps_plans WHERE provider_plan_id = $1 LIMIT 1', [configuredType]);
      planRow = res.rows[0] ?? null;
    }
    if (!planRow && providerType) {
      const res = await query('SELECT * FROM vps_plans WHERE provider_plan_id = $1 LIMIT 1', [providerType]);
      planRow = res.rows[0] ?? null;
    }
  } catch (err) {
    console.warn('Failed to resolve VPS plan metadata:', err);
  }

  const providerPlanId = typeof planRow?.provider_plan_id === 'string'
    ? String(planRow.provider_plan_id)
    : configuredType ?? providerType ?? null;

  const specs: PlanSpecs = { vcpus: 0, memory: 0, disk: 0, transfer: 0 };
  const pricing: PlanPricing = { hourly: 0, monthly: 0 };

  if (planRow) {
    const rawSpecs = (planRow.specifications && typeof planRow.specifications === 'object')
      ? planRow.specifications
      : {};

    const sanitizeNumber = (value: any): number | undefined => {
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
      }
      return undefined;
    };

    const pickNumber = (candidates: Array<number | undefined>): number => {
      for (const candidate of candidates) {
        if (typeof candidate === 'number' && Number.isFinite(candidate)) {
          return candidate;
        }
      }
      return 0;
    };

    const storageMb = sanitizeNumber(rawSpecs.storage_mb);
    const storageGb = sanitizeNumber(rawSpecs.storage_gb);
    const memoryMb = sanitizeNumber(rawSpecs.memory_mb);
    const memoryGb = sanitizeNumber(rawSpecs.memory_gb);

    const diskValues: Array<number | undefined> = [
      sanitizeNumber(rawSpecs.disk),
      storageMb,
      storageGb !== undefined ? storageGb * 1024 : undefined,
    ];

    const memoryValues: Array<number | undefined> = [
      sanitizeNumber(rawSpecs.memory),
      memoryMb,
      memoryGb !== undefined ? memoryGb * 1024 : undefined,
    ];

    const cpuValues: Array<number | undefined> = [
      sanitizeNumber(rawSpecs.vcpus),
      sanitizeNumber(rawSpecs.cpu_cores),
    ];

    const transferValues: Array<number | undefined> = [
      sanitizeNumber(rawSpecs.transfer),
      sanitizeNumber(rawSpecs.transfer_gb),
      sanitizeNumber(rawSpecs.bandwidth_gb),
    ];

    specs.disk = pickNumber(diskValues);
    specs.memory = pickNumber(memoryValues);
    specs.vcpus = pickNumber(cpuValues);
    specs.transfer = pickNumber(transferValues);

    const basePrice = Number(planRow.base_price ?? 0);
    const markupPrice = Number(planRow.markup_price ?? 0);
    const monthly = basePrice + markupPrice;
    pricing.monthly = monthly;
    pricing.hourly = monthly > 0 ? monthly / 730 : 0;
  } else if (providerDetail?.specs) {
    specs.vcpus = Number(providerDetail.specs.vcpus ?? 0);
    specs.memory = Number(providerDetail.specs.memory ?? 0);
    specs.disk = Number(providerDetail.specs.disk ?? 0);
    specs.transfer = Number(providerDetail.specs.transfer ?? 0);
  }

  return { planRow, specs, pricing, providerPlanId: providerPlanId ?? null };
};

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
  const isTruthy = (value: any) => String(value || '').toLowerCase() === 'true';
  const configuredOnly = isTruthy((req.query as any).configured || (req.query as any).allowed || (req.query as any).allowedOnly);
  const mineOnly = isTruthy(req.query.mine);

  try {
    if (configuredOnly) {
      let configs: any[] = [];
      try {
        const configRes = await query(
          `SELECT stackscript_id, label, description, is_enabled, display_order, metadata
             FROM vps_stackscript_configs
            WHERE is_enabled = TRUE
            ORDER BY display_order ASC, created_at ASC`
        );
        configs = configRes.rows || [];
      } catch (configErr: any) {
        const msg = String(configErr?.message || '').toLowerCase();
        if (msg.includes('does not exist') || msg.includes('relation') && msg.includes('vps_stackscript_configs')) {
          console.warn('StackScript config table missing; returning empty configured list');
          return res.json({ stackscripts: [] });
        }
        throw configErr;
      }

      if (configs.length === 0) {
        return res.json({ stackscripts: [] });
      }

      let ownedScripts: any[] = [];
      const scriptMap = new Map<number, any>();
      try {
        ownedScripts = await linodeService.getLinodeStackScripts(true);
        ownedScripts.forEach(script => scriptMap.set(script.id, script));
      } catch (err) {
        console.warn('Failed to fetch owned StackScripts list, will query individually:', err);
      }

      const enriched: any[] = [];
      for (const row of configs) {
        const stackscriptId = Number(row.stackscript_id);
        let script = scriptMap.get(stackscriptId);
        if (!script) {
          try {
            const single = await linodeService.getStackScript(stackscriptId);
            if (single) {
              script = single;
              scriptMap.set(single.id, single);
            }
          } catch (err) {
            console.warn(`Failed to fetch StackScript ${stackscriptId}:`, err);
          }
        }

        if (!script) {
          continue;
        }

        const displayLabel = row.label || script.label || `StackScript ${stackscriptId}`;
        const displayDescription = row.description || script.description || script.rev_note || '';
        const metadata = (row.metadata && typeof row.metadata === 'object') ? row.metadata : {};

        enriched.push({
          ...script,
          label: displayLabel,
          description: displayDescription,
          config: {
            stackscript_id: stackscriptId,
            label: row.label,
            description: row.description,
            is_enabled: row.is_enabled !== false,
            display_order: Number(row.display_order || 0),
            metadata,
          }
        });
      }

      enriched.sort((a, b) => {
        const orderA = Number(a?.config?.display_order ?? 0);
        const orderB = Number(b?.config?.display_order ?? 0);
        if (orderA !== orderB) return orderA - orderB;
        return String(a?.label || '').localeCompare(String(b?.label || ''), undefined, { sensitivity: 'base' });
      });

      return res.json({ stackscripts: enriched });
    }

    const stackscripts = await linodeService.getLinodeStackScripts(mineOnly);
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

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req as any).user.organizationId;
    const detailRes = await query(
      'SELECT * FROM vps_instances WHERE id = $1 AND organization_id = $2 LIMIT 1',
      [id, organizationId]
    );

    if (detailRes.rows.length === 0) {
      res.status(404).json({ error: 'Instance not found' });
      return;
    }

    const instanceRow = detailRes.rows[0];
    let configuration = (instanceRow?.configuration && typeof instanceRow.configuration === 'object')
      ? instanceRow.configuration
      : {};
    const providerInstanceId = Number(instanceRow.provider_instance_id);

    let providerDetail: LinodeInstance | null = null;
    if (Number.isFinite(providerInstanceId)) {
      try {
        providerDetail = await linodeService.getLinodeInstance(providerInstanceId);
      } catch (err) {
        console.warn(`Failed to fetch provider detail for instance ${instanceRow.provider_instance_id}:`, err);
      }
    }

    if (providerDetail) {
      const newConfiguration = {
        ...configuration,
        image: providerDetail.image || configuration?.image,
        region: providerDetail.region || configuration?.region,
        type: providerDetail.type || configuration?.type,
      };
      configuration = newConfiguration;
    }

    const normalizedStatus = normalizeProviderStatus(providerDetail?.status ?? instanceRow.status);
    const providerIp = Array.isArray(providerDetail?.ipv4) && providerDetail.ipv4.length > 0
      ? providerDetail.ipv4[0]
      : instanceRow.ip_address ?? null;

    if (instanceRow.status !== normalizedStatus || instanceRow.ip_address !== providerIp) {
      try {
        await query(
          'UPDATE vps_instances SET status = $1, ip_address = $2, updated_at = NOW() WHERE id = $3',
          [normalizedStatus, providerIp, instanceRow.id]
        );
      } catch (err) {
        console.warn('Failed to synchronize instance cache fields:', err);
      }
      instanceRow.status = normalizedStatus;
      instanceRow.ip_address = providerIp;
    } else {
      instanceRow.status = normalizedStatus;
      instanceRow.ip_address = providerIp;
    }

    const regionCode = providerDetail?.region ?? configuration?.region ?? null;
    const regionLabel = await resolveRegionLabel(typeof regionCode === 'string' ? regionCode : null);

    const planMeta = await resolvePlanMeta(instanceRow, providerDetail);

    let metrics: {
      timeframe: { start: number | null; end: number | null };
      cpu?: MetricSeriesPayload;
      network?: {
        inbound?: MetricSeriesPayload;
        outbound?: MetricSeriesPayload;
        privateIn?: MetricSeriesPayload;
        privateOut?: MetricSeriesPayload;
      };
      io?: {
        read?: MetricSeriesPayload;
        swap?: MetricSeriesPayload;
      };
    } | null = null;

    if (providerDetail && Number.isFinite(providerInstanceId)) {
      try {
        const stats: LinodeInstanceStatsResponse = await linodeService.getLinodeInstanceStats(providerInstanceId);
        const cpuSeries = normalizeSeries(stats?.cpu);
        const ipv4InSeries = normalizeSeries(stats?.netv4?.in);
        const ipv4OutSeries = normalizeSeries(stats?.netv4?.out);
        const ipv4PrivateInSeries = normalizeSeries(stats?.netv4?.private_in);
        const ipv4PrivateOutSeries = normalizeSeries(stats?.netv4?.private_out);
        const ioSeries = normalizeSeries(stats?.io?.io);
        const swapSeries = normalizeSeries(stats?.io?.swap);

        metrics = {
          timeframe: deriveTimeframe([
            cpuSeries,
            ipv4InSeries,
            ipv4OutSeries,
            ipv4PrivateInSeries,
            ipv4PrivateOutSeries,
            ioSeries,
            swapSeries,
          ]),
          cpu: { series: cpuSeries, summary: summarizeSeries(cpuSeries), unit: 'percent' },
          network: {
            inbound: { series: ipv4InSeries, summary: summarizeSeries(ipv4InSeries), unit: 'bitsPerSecond' },
            outbound: { series: ipv4OutSeries, summary: summarizeSeries(ipv4OutSeries), unit: 'bitsPerSecond' },
          },
          io: {
            read: { series: ioSeries, summary: summarizeSeries(ioSeries), unit: 'blocksPerSecond' },
            swap: { series: swapSeries, summary: summarizeSeries(swapSeries), unit: 'blocksPerSecond' },
          },
        };

        if (ipv4PrivateInSeries.length > 0 || ipv4PrivateOutSeries.length > 0) {
          metrics.network = metrics.network ?? {};
          metrics.network.privateIn = {
            series: ipv4PrivateInSeries,
            summary: summarizeSeries(ipv4PrivateInSeries),
            unit: 'bitsPerSecond',
          };
          metrics.network.privateOut = {
            series: ipv4PrivateOutSeries,
            summary: summarizeSeries(ipv4PrivateOutSeries),
            unit: 'bitsPerSecond',
          };
        }
      } catch (err) {
        console.warn('Failed to fetch instance metrics:', err);
      }
    }

    let transfer: TransferPayload | null = null;
    if (providerDetail && Number.isFinite(providerInstanceId)) {
      try {
        const transferData = await linodeService.getLinodeInstanceTransfer(providerInstanceId);
        const usedGb = bytesToGigabytes(Number(transferData?.used ?? 0));
        const quotaGb = Number(transferData?.quota ?? 0);
        const billableGb = Number(transferData?.billable ?? 0);
        const utilizationPercent = quotaGb > 0 ? Math.min(100, Math.max(0, (usedGb / quotaGb) * 100)) : 0;
        transfer = { usedGb, quotaGb, billableGb, utilizationPercent };
      } catch (err) {
        console.warn('Failed to fetch transfer usage:', err);
      }
    }

    let backups: BackupsPayload | null = null;
    if (providerDetail && Number.isFinite(providerInstanceId)) {
      const providerBackups = providerDetail.backups ?? null;
      let backupCollection: LinodeInstanceBackupsResponse | null = null;
      try {
        backupCollection = await linodeService.getLinodeInstanceBackups(providerInstanceId);
      } catch (err) {
        console.warn('Failed to fetch instance backups:', err);
      }

      const automatic = Array.isArray(backupCollection?.automatic)
        ? backupCollection!.automatic
            .map(mapBackupSummary)
            .filter((item): item is BackupSummaryPayload => Boolean(item))
        : [];

      const snapshot = mapBackupSummary(backupCollection?.snapshot?.current);
      const snapshotInProgress = mapBackupSummary(backupCollection?.snapshot?.in_progress);

      backups = {
        enabled: Boolean(providerBackups?.enabled),
        available: Boolean(providerBackups?.available),
        schedule: providerBackups?.schedule
          ? {
              day: providerBackups.schedule.day ?? null,
              window: providerBackups.schedule.window ?? null,
            }
          : null,
        lastSuccessful: providerBackups?.last_successful ?? null,
        automatic,
        snapshot,
        snapshotInProgress,
      };
    }

    res.json({
      instance: {
        id: instanceRow.id,
        label: instanceRow.label,
        status: instanceRow.status,
        ipAddress: instanceRow.ip_address ?? null,
        providerInstanceId: instanceRow.provider_instance_id,
        createdAt: instanceRow.created_at ?? null,
        updatedAt: instanceRow.updated_at ?? null,
        region: typeof regionCode === 'string' ? regionCode : null,
        regionLabel,
        configuration,
        image: configuration?.image ?? providerDetail?.image ?? null,
        plan: {
          id: planMeta.planRow?.id ?? null,
          name: typeof planMeta.planRow?.name === 'string' ? planMeta.planRow.name : null,
          providerPlanId: planMeta.providerPlanId,
          specs: planMeta.specs,
          pricing: {
            hourly: planMeta.pricing.hourly,
            monthly: planMeta.pricing.monthly,
            currency: 'USD',
          },
        },
        provider: providerDetail
          ? {
              id: providerDetail.id,
              label: providerDetail.label,
              status: normalizeProviderStatus(providerDetail.status),
              region: providerDetail.region,
              image: providerDetail.image,
              ipv4: providerDetail.ipv4,
              ipv6: providerDetail.ipv6,
              created: providerDetail.created,
              updated: providerDetail.updated,
              specs: providerDetail.specs,
            }
          : null,
        metrics,
        transfer,
        backups,
      },
    });
  } catch (err: any) {
    console.error('VPS detail error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch VPS instance details' });
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