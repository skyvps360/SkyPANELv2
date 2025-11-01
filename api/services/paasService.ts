import { query, transaction } from "../lib/database.js";
import type { PoolClient } from "pg";

export interface ClusterInput {
  name: string;
  slug: string;
  description?: string | null;
  region: string;
  orchestrator: string;
  highAvailability?: boolean;
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface NodeInput {
  clusterId: string;
  name: string;
  role?: string;
  status?: string;
  cpuTotal: number;
  cpuAllocated?: number;
  memoryTotalMb: number;
  memoryAllocatedMb?: number;
  storageTotalGb: number;
  storageAllocatedGb?: number;
  publicIp?: string | null;
  privateIp?: string | null;
  metadata?: Record<string, unknown>;
}

export interface PlanInput {
  name: string;
  slug: string;
  description?: string | null;
  cpuMillicores: number;
  memoryMb: number;
  storageGb: number;
  networkMbps?: number;
  maxContainers?: number;
  priceHourly: number;
  priceMonthly: number;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

export interface TemplateInput {
  name: string;
  slug: string;
  description?: string | null;
  imageId?: string | null;
  defaultPlanId?: string | null;
  regionScope?: string[];
  isActive?: boolean;
  metadata?: Record<string, unknown>;
  envSchema?: unknown;
}

export interface RegistryInput {
  name: string;
  endpoint: string;
  username?: string | null;
  passwordEncrypted?: string | null;
  isDefault?: boolean;
  metadata?: Record<string, unknown>;
}

export interface StorageTargetInput {
  name: string;
  provider: string;
  endpoint?: string | null;
  bucket?: string | null;
  region?: string | null;
  accessKeyEncrypted?: string | null;
  secretKeyEncrypted?: string | null;
  isDefault?: boolean;
  metadata?: Record<string, unknown>;
}

export interface TraefikConfigInput {
  clusterId: string;
  dashboardEnabled?: boolean;
  apiInsecure?: boolean;
  entrypoints?: string[];
  certificateResolvers?: Record<string, unknown>;
  middleware?: Record<string, unknown>;
}

export interface DomainInput {
  clusterId: string;
  domain: string;
  status?: string;
  managed?: boolean;
  dnsProvider?: string | null;
  metadata?: Record<string, unknown>;
}

export interface PortPoolInput {
  clusterId: string;
  rangeStart: number;
  rangeEnd: number;
  reserved?: unknown[];
  metadata?: Record<string, unknown>;
}

export interface ImageInput {
  name: string;
  registryId?: string | null;
  tag: string;
  displayName?: string | null;
  description?: string | null;
  isPublic?: boolean;
  metadata?: Record<string, unknown>;
}

export interface DeploymentInput {
  organizationId: string;
  userId: string;
  templateId: string;
  planId: string;
  clusterId: string;
  name: string;
  endpoint?: string | null;
  metadata?: Record<string, unknown>;
  hourlyRate: number;
}

const toSnakeCaseMap = <T extends Record<string, unknown>>(input: T): Record<string, unknown> => {
  const entries = Object.entries(input).map(([key, value]) => {
    const snake = key
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .replace(/-/g, "_")
      .toLowerCase();
    return [snake, value];
  });
  return Object.fromEntries(entries);
};

export const paasService = {
  async getOverview() {
    const [clusters, nodes, plans, templates, registries, storage, domains, portPools, images, traefik] = await Promise.all([
      query("SELECT * FROM paas_clusters ORDER BY name"),
      query("SELECT * FROM paas_nodes ORDER BY name"),
      query("SELECT * FROM paas_plans ORDER BY name"),
      query("SELECT * FROM paas_templates ORDER BY name"),
      query("SELECT * FROM paas_registries ORDER BY name"),
      query("SELECT * FROM paas_storage_targets ORDER BY name"),
      query("SELECT * FROM paas_domains ORDER BY domain"),
      query("SELECT * FROM paas_port_pools ORDER BY range_start"),
      query("SELECT * FROM paas_container_images ORDER BY name"),
      query("SELECT * FROM paas_traefik_configs"),
    ]);

    const templateRegions = await query(
      "SELECT template_id, region, is_enabled FROM paas_template_regions",
    );

    return {
      clusters: clusters.rows,
      nodes: nodes.rows,
      plans: plans.rows,
      templates: templates.rows,
      templateRegions: templateRegions.rows,
      registries: registries.rows,
      storageTargets: storage.rows,
      domains: domains.rows,
      portPools: portPools.rows,
      images: images.rows,
      traefik: traefik.rows,
    };
  },

  async createCluster(input: ClusterInput) {
    const payload = toSnakeCaseMap({
      ...input,
      highAvailability: input.highAvailability ?? true,
      metadata: input.metadata ?? {},
    });

    const result = await query(
      `INSERT INTO paas_clusters (name, slug, description, region, orchestrator, high_availability, status, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        payload.name,
        payload.slug,
        payload.description ?? null,
        payload.region,
        payload.orchestrator,
        payload.high_availability ?? true,
        payload.status ?? "active",
        payload.metadata ?? {},
      ],
    );
    return result.rows[0];
  },

  async updateCluster(id: string, input: Partial<ClusterInput>) {
    const payload = toSnakeCaseMap(input);
    const fields = Object.keys(payload);
    if (fields.length === 0) {
      const { rows } = await query("SELECT * FROM paas_clusters WHERE id = $1", [id]);
      return rows[0] ?? null;
    }

    const updates = fields.map((field, index) => `${field} = $${index + 2}`);
    const values = fields.map((field) => payload[field]);
    const { rows } = await query(
      `UPDATE paas_clusters SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    return rows[0] ?? null;
  },

  async deleteCluster(id: string) {
    await query("DELETE FROM paas_clusters WHERE id = $1", [id]);
  },

  async createNode(input: NodeInput) {
    const payload = toSnakeCaseMap({
      ...input,
      metadata: input.metadata ?? {},
    });
    const { rows } = await query(
      `INSERT INTO paas_nodes (
        cluster_id, name, role, status, cpu_total, cpu_allocated, memory_total_mb, memory_allocated_mb,
        storage_total_gb, storage_allocated_gb, public_ip, private_ip, metadata
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
      ) RETURNING *`,
      [
        payload.cluster_id,
        payload.name,
        payload.role ?? "worker",
        payload.status ?? "active",
        payload.cpu_total,
        payload.cpu_allocated ?? 0,
        payload.memory_total_mb,
        payload.memory_allocated_mb ?? 0,
        payload.storage_total_gb,
        payload.storage_allocated_gb ?? 0,
        payload.public_ip ?? null,
        payload.private_ip ?? null,
        payload.metadata ?? {},
      ],
    );
    return rows[0];
  },

  async updateNode(id: string, input: Partial<NodeInput>) {
    const payload = toSnakeCaseMap(input);
    const fields = Object.keys(payload);
    if (!fields.length) {
      const { rows } = await query("SELECT * FROM paas_nodes WHERE id = $1", [id]);
      return rows[0] ?? null;
    }
    const updates = fields.map((field, index) => `${field} = $${index + 2}`);
    const values = fields.map((field) => payload[field]);
    const { rows } = await query(
      `UPDATE paas_nodes SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    return rows[0] ?? null;
  },

  async deleteNode(id: string) {
    await query("DELETE FROM paas_nodes WHERE id = $1", [id]);
  },

  async createPlan(input: PlanInput) {
    const payload = toSnakeCaseMap({
      ...input,
      metadata: input.metadata ?? {},
    });
    const { rows } = await query(
      `INSERT INTO paas_plans (
        name, slug, description, cpu_millicores, memory_mb, storage_gb, network_mbps, max_containers,
        price_hourly, price_monthly, is_active, metadata
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
      ) RETURNING *`,
      [
        payload.name,
        payload.slug,
        payload.description ?? null,
        payload.cpu_millicores,
        payload.memory_mb,
        payload.storage_gb,
        payload.network_mbps ?? 100,
        payload.max_containers ?? 1,
        payload.price_hourly,
        payload.price_monthly,
        payload.is_active ?? true,
        payload.metadata ?? {},
      ],
    );
    return rows[0];
  },

  async updatePlan(id: string, input: Partial<PlanInput>) {
    const payload = toSnakeCaseMap(input);
    const fields = Object.keys(payload);
    if (!fields.length) {
      const { rows } = await query("SELECT * FROM paas_plans WHERE id = $1", [id]);
      return rows[0] ?? null;
    }
    const updates = fields.map((field, index) => `${field} = $${index + 2}`);
    const values = fields.map((field) => payload[field]);
    const { rows } = await query(
      `UPDATE paas_plans SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    return rows[0] ?? null;
  },

  async deletePlan(id: string) {
    await query("DELETE FROM paas_plans WHERE id = $1", [id]);
  },

  async createTemplate(input: TemplateInput) {
    const payload = toSnakeCaseMap({
      ...input,
      metadata: input.metadata ?? {},
      envSchema: input.envSchema ?? [],
    });
    const { rows } = await query(
      `INSERT INTO paas_templates (
        name, slug, description, image_id, default_plan_id, region_scope, is_active, metadata, env_schema
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9
      ) RETURNING *`,
      [
        payload.name,
        payload.slug,
        payload.description ?? null,
        payload.image_id ?? null,
        payload.default_plan_id ?? null,
        payload.region_scope ?? null,
        payload.is_active ?? true,
        payload.metadata ?? {},
        payload.env_schema ?? [],
      ],
    );
    return rows[0];
  },

  async updateTemplate(id: string, input: Partial<TemplateInput>) {
    const payload = toSnakeCaseMap(input);
    const fields = Object.keys(payload);
    if (!fields.length) {
      const { rows } = await query("SELECT * FROM paas_templates WHERE id = $1", [id]);
      return rows[0] ?? null;
    }
    const updates = fields.map((field, index) => `${field} = $${index + 2}`);
    const values = fields.map((field) => payload[field]);
    const { rows } = await query(
      `UPDATE paas_templates SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    return rows[0] ?? null;
  },

  async deleteTemplate(id: string) {
    await query("DELETE FROM paas_templates WHERE id = $1", [id]);
  },

  async setTemplateRegions(
    templateId: string,
    regions: Array<{ region: string; isEnabled: boolean }>,
  ) {
    await transaction(async (client: PoolClient) => {
      await client.query("DELETE FROM paas_template_regions WHERE template_id = $1", [
        templateId,
      ]);
      for (const region of regions) {
        await client.query(
          `INSERT INTO paas_template_regions (template_id, region, is_enabled)
           VALUES ($1,$2,$3)`,
          [templateId, region.region, region.isEnabled],
        );
      }
    });
  },

  async createRegistry(input: RegistryInput) {
    const payload = toSnakeCaseMap({
      ...input,
      metadata: input.metadata ?? {},
    });
    const { rows } = await query(
      `INSERT INTO paas_registries (
        name, endpoint, username, password_encrypted, is_default, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        payload.name,
        payload.endpoint,
        payload.username ?? null,
        payload.password_encrypted ?? null,
        payload.is_default ?? false,
        payload.metadata ?? {},
      ],
    );
    return rows[0];
  },

  async updateRegistry(id: string, input: Partial<RegistryInput>) {
    const payload = toSnakeCaseMap(input);
    const fields = Object.keys(payload);
    if (!fields.length) {
      const { rows } = await query("SELECT * FROM paas_registries WHERE id = $1", [id]);
      return rows[0] ?? null;
    }
    const updates = fields.map((field, index) => `${field} = $${index + 2}`);
    const values = fields.map((field) => payload[field]);
    const { rows } = await query(
      `UPDATE paas_registries SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    return rows[0] ?? null;
  },

  async deleteRegistry(id: string) {
    await query("DELETE FROM paas_registries WHERE id = $1", [id]);
  },

  async createStorageTarget(input: StorageTargetInput) {
    const payload = toSnakeCaseMap({
      ...input,
      metadata: input.metadata ?? {},
    });
    const { rows } = await query(
      `INSERT INTO paas_storage_targets (
        name, provider, endpoint, bucket, region, access_key_encrypted, secret_key_encrypted, is_default, metadata
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9
      ) RETURNING *`,
      [
        payload.name,
        payload.provider,
        payload.endpoint ?? null,
        payload.bucket ?? null,
        payload.region ?? null,
        payload.access_key_encrypted ?? null,
        payload.secret_key_encrypted ?? null,
        payload.is_default ?? false,
        payload.metadata ?? {},
      ],
    );
    return rows[0];
  },

  async updateStorageTarget(id: string, input: Partial<StorageTargetInput>) {
    const payload = toSnakeCaseMap(input);
    const fields = Object.keys(payload);
    if (!fields.length) {
      const { rows } = await query("SELECT * FROM paas_storage_targets WHERE id = $1", [id]);
      return rows[0] ?? null;
    }
    const updates = fields.map((field, index) => `${field} = $${index + 2}`);
    const values = fields.map((field) => payload[field]);
    const { rows } = await query(
      `UPDATE paas_storage_targets SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    return rows[0] ?? null;
  },

  async deleteStorageTarget(id: string) {
    await query("DELETE FROM paas_storage_targets WHERE id = $1", [id]);
  },

  async upsertTraefikConfig(input: TraefikConfigInput) {
    const payload = toSnakeCaseMap({
      ...input,
      entrypoints: input.entrypoints ?? ["web", "websecure"],
      certificateResolvers: input.certificateResolvers ?? {},
      middleware: input.middleware ?? {},
    });
    const { rows } = await query(
      `INSERT INTO paas_traefik_configs (
        cluster_id, dashboard_enabled, api_insecure, entrypoints, certificate_resolvers, middleware
      ) VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (cluster_id)
      DO UPDATE SET
        dashboard_enabled = EXCLUDED.dashboard_enabled,
        api_insecure = EXCLUDED.api_insecure,
        entrypoints = EXCLUDED.entrypoints,
        certificate_resolvers = EXCLUDED.certificate_resolvers,
        middleware = EXCLUDED.middleware,
        updated_at = NOW()
      RETURNING *`,
      [
        payload.cluster_id,
        payload.dashboard_enabled ?? false,
        payload.api_insecure ?? false,
        payload.entrypoints,
        payload.certificate_resolvers,
        payload.middleware,
      ],
    );
    return rows[0];
  },

  async createDomain(input: DomainInput) {
    const payload = toSnakeCaseMap({
      ...input,
      metadata: input.metadata ?? {},
    });
    const { rows } = await query(
      `INSERT INTO paas_domains (cluster_id, domain, status, managed, dns_provider, metadata)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        payload.cluster_id,
        payload.domain,
        payload.status ?? "pending",
        payload.managed ?? true,
        payload.dns_provider ?? null,
        payload.metadata ?? {},
      ],
    );
    return rows[0];
  },

  async updateDomain(id: string, input: Partial<DomainInput>) {
    const payload = toSnakeCaseMap(input);
    const fields = Object.keys(payload);
    if (!fields.length) {
      const { rows } = await query("SELECT * FROM paas_domains WHERE id = $1", [id]);
      return rows[0] ?? null;
    }
    const updates = fields.map((field, index) => `${field} = $${index + 2}`);
    const values = fields.map((field) => payload[field]);
    const { rows } = await query(
      `UPDATE paas_domains SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    return rows[0] ?? null;
  },

  async deleteDomain(id: string) {
    await query("DELETE FROM paas_domains WHERE id = $1", [id]);
  },

  async createPortPool(input: PortPoolInput) {
    const payload = toSnakeCaseMap({
      ...input,
      metadata: input.metadata ?? {},
      reserved: input.reserved ?? [],
    });
    const { rows } = await query(
      `INSERT INTO paas_port_pools (cluster_id, range_start, range_end, reserved, metadata)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [
        payload.cluster_id,
        payload.range_start,
        payload.range_end,
        payload.reserved ?? [],
        payload.metadata ?? {},
      ],
    );
    return rows[0];
  },

  async updatePortPool(id: string, input: Partial<PortPoolInput>) {
    const payload = toSnakeCaseMap(input);
    const fields = Object.keys(payload);
    if (!fields.length) {
      const { rows } = await query("SELECT * FROM paas_port_pools WHERE id = $1", [id]);
      return rows[0] ?? null;
    }
    const updates = fields.map((field, index) => `${field} = $${index + 2}`);
    const values = fields.map((field) => payload[field]);
    const { rows } = await query(
      `UPDATE paas_port_pools SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    return rows[0] ?? null;
  },

  async deletePortPool(id: string) {
    await query("DELETE FROM paas_port_pools WHERE id = $1", [id]);
  },

  async createImage(input: ImageInput) {
    const payload = toSnakeCaseMap({
      ...input,
      metadata: input.metadata ?? {},
    });
    const { rows } = await query(
      `INSERT INTO paas_container_images (name, registry_id, tag, display_name, description, is_public, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        payload.name,
        payload.registry_id ?? null,
        payload.tag,
        payload.display_name ?? null,
        payload.description ?? null,
        payload.is_public ?? false,
        payload.metadata ?? {},
      ],
    );
    return rows[0];
  },

  async updateImage(id: string, input: Partial<ImageInput>) {
    const payload = toSnakeCaseMap(input);
    const fields = Object.keys(payload);
    if (!fields.length) {
      const { rows } = await query("SELECT * FROM paas_container_images WHERE id = $1", [id]);
      return rows[0] ?? null;
    }
    const updates = fields.map((field, index) => `${field} = $${index + 2}`);
    const values = fields.map((field) => payload[field]);
    const { rows } = await query(
      `UPDATE paas_container_images SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    return rows[0] ?? null;
  },

  async deleteImage(id: string) {
    await query("DELETE FROM paas_container_images WHERE id = $1", [id]);
  },

  async listCatalog() {
    const { rows: templates } = await query(
      `SELECT t.*, p.name AS plan_name, p.price_hourly, p.price_monthly, c.name AS cluster_name, c.region
       FROM paas_templates t
       LEFT JOIN paas_plans p ON t.default_plan_id = p.id
       LEFT JOIN paas_clusters c ON c.id = t.metadata->>'cluster_id'
       WHERE t.is_active = TRUE`,
    );

    const { rows: plans } = await query(
      `SELECT * FROM paas_plans WHERE is_active = TRUE ORDER BY price_hourly`
    );

    const { rows: clusters } = await query(
      `SELECT * FROM paas_clusters WHERE status = 'active' ORDER BY name`
    );

    const { rows: regions } = await query(
      `SELECT template_id, region, is_enabled FROM paas_template_regions`
    );

    return { templates, plans, clusters, templateRegions: regions };
  },

  async createDeployment(input: DeploymentInput) {
    const payload = toSnakeCaseMap({
      ...input,
      metadata: input.metadata ?? {},
    });
    const { rows } = await query(
      `INSERT INTO paas_deployments (
        organization_id, user_id, template_id, plan_id, cluster_id, status, name, endpoint, metadata, billing_hourly_rate, billing_started_at
      ) VALUES (
        $1,$2,$3,$4,$5,'provisioning',$6,$7,$8,$9,NOW()
      ) RETURNING *`,
      [
        payload.organization_id,
        payload.user_id,
        payload.template_id,
        payload.plan_id,
        payload.cluster_id,
        payload.name,
        payload.endpoint ?? null,
        payload.metadata ?? {},
        payload.hourly_rate ?? 0,
      ],
    );
    return rows[0];
  },

  async listDeployments(organizationId: string) {
    const { rows } = await query(
      `SELECT d.*, t.name AS template_name, p.name AS plan_name, c.name AS cluster_name
       FROM paas_deployments d
       LEFT JOIN paas_templates t ON d.template_id = t.id
       LEFT JOIN paas_plans p ON d.plan_id = p.id
       LEFT JOIN paas_clusters c ON d.cluster_id = c.id
       WHERE d.organization_id = $1
       ORDER BY d.created_at DESC`,
      [organizationId],
    );
    return rows;
  },
};
