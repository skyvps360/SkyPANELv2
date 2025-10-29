/**
 * Admin Routes for SkyPanelV2
 * Manage support tickets and VPS plans
 */
import express, { Request, Response } from "express";
import { body, param, validationResult } from "express-validator";
import { authenticateToken } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { query } from "../lib/database.js";
import { linodeService } from "../services/linodeService.js";
import { digitalOceanService } from "../services/DigitalOceanService.js";
import { logActivity } from "../services/activityLogger.js";
import {
  themeService,
  type StoredThemePreset,
} from "../services/themeService.js";
import { ProviderResourceCache } from "../services/providerResourceCache.js";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import {
  auditLogger,
  adminSecurityHeaders,
  requestSizeLimit,
} from "../middleware/security.js";
import { encryptSecret } from "../lib/crypto.js";
import { normalizeProviderToken, getProviderTokenByType } from "../lib/providerTokens.js";
import {
  DEFAULT_DIGITALOCEAN_ALLOWED_REGIONS,
  DEFAULT_LINODE_ALLOWED_REGIONS,
  DIGITALOCEAN_REGION_COUNTRY_MAP,
  normalizeRegionList,
  parseStoredAllowedRegions,
} from "../lib/providerRegions.js";

const router = express.Router();

// Apply security middleware to all admin routes
router.use(adminSecurityHeaders);
router.use(requestSizeLimit(500)); // 500KB limit for admin operations

// Enhanced Rate Limiting:
// Admin routes automatically receive higher rate limits (1000 requests per 15 minutes)
// through the unified smart rate limiting middleware in app.ts. The middleware detects
// admin users via JWT token validation and applies appropriate limits based on user type.
// This provides better usability for admin operations while maintaining security.

// Helper to detect missing-table errors from Supabase
const isMissingTableError = (err: any): boolean => {
  const msg = (err?.message || "").toLowerCase();
  return (
    msg.includes("could not find the table") ||
    (msg.includes("relation") && msg.includes("does not exist")) ||
    msg.includes("schema cache")
  );
};

const allowedThemePresetIds = new Set([
  "teal",
  "mono",
  "violet",
  "emerald",
  "amber",
  "rose",
  "blue",
  "slate",
  "orange",
  "zinc",
  "stone",
  "custom",
]);

const mergeCustomPreset = (
  incoming: unknown,
  existing: StoredThemePreset | null | undefined
): StoredThemePreset | null => {
  if (incoming && typeof incoming === "object") {
    return incoming as StoredThemePreset;
  }
  return existing ?? null;
};

router.get("/theme", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const theme = await themeService.getThemeConfig();
    res.json({ theme });
  } catch (err: unknown) {
    console.error("Admin theme fetch error:", err);
    res.status(500).json({ error: "Failed to load theme configuration" });
  }
});

router.put(
  "/theme",
  authenticateToken,
  requireAdmin,
  [
    body("presetId").isString().trim().notEmpty(),
    body("customPreset").optional().isObject(),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { presetId: presetIdRaw, customPreset } = req.body as {
        presetId: string;
        customPreset?: unknown;
      };
      const presetId = presetIdRaw.trim();

      if (!allowedThemePresetIds.has(presetId)) {
        res.status(400).json({ error: "Invalid theme preset id" });
        return;
      }

      const currentConfig = await themeService.getThemeConfig();
      const mergedCustomPreset = mergeCustomPreset(
        customPreset,
        currentConfig.customPreset
      );

      const theme = await themeService.updateThemeConfig({
        presetId,
        customPreset: mergedCustomPreset,
        updatedBy: req.user?.id ?? null,
      });

      if (req.user?.id) {
        await logActivity(
          {
            userId: req.user.id,
            organizationId: req.user.organizationId ?? null,
            eventType: "theme_update",
            entityType: "theme",
            entityId: theme.presetId,
            message: `Theme updated to ${theme.presetId}`,
            status: "success",
            metadata: {
              presetId: theme.presetId,
              hasCustomPreset: Boolean(theme.customPreset),
            },
          },
          req
        );
      }

      res.json({ theme });
    } catch (err: unknown) {
      console.error("Admin theme update error:", err);
      res.status(500).json({ error: "Failed to update theme" });
    }
  }
);

// List all support tickets (admin only)
router.get(
  "/tickets",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const result = await query(
        "SELECT * FROM support_tickets ORDER BY created_at DESC"
      );

      res.json({ tickets: result.rows || [] });
    } catch (err: any) {
      console.error("Admin tickets list error:", err);
      res.status(500).json({ error: err.message || "Failed to fetch tickets" });
    }
  }
);

// Update ticket status
router.patch(
  "/tickets/:id/status",
  authenticateToken,
  requireAdmin,
  [
    param("id").isUUID().withMessage("Invalid ticket id"),
    body("status")
      .isIn(["open", "in_progress", "resolved", "closed"])
      .withMessage("Invalid status"),
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
        "UPDATE support_tickets SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *",
        [status, new Date().toISOString(), id]
      );

      if (result.rows.length === 0) {
        throw new Error("Ticket not found");
      }

      res.json({ ticket: result.rows[0] });
    } catch (err: any) {
      console.error("Admin ticket status update error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to update ticket status" });
    }
  }
);

// Delete a ticket (admin)
router.delete(
  "/tickets/:id",
  authenticateToken,
  requireAdmin,
  [param("id").isUUID()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ error: "Invalid input", details: errors.array() });
      }

      const { id } = req.params;
      await query("DELETE FROM support_tickets WHERE id = $1", [id]);
      res.status(204).send();
    } catch (err: any) {
      console.error("Admin ticket delete error:", err);
      res.status(500).json({ error: err.message || "Failed to delete ticket" });
    }
  }
);

// Reply to a ticket (admin)
router.post(
  "/tickets/:id/replies",
  authenticateToken,
  requireAdmin,
  [
    param("id").isUUID().withMessage("Invalid ticket id"),
    body("message").isLength({ min: 1 }).withMessage("Message is required"),
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

      // Get ticket details for activity logging
      const ticketRes = await query(
        "SELECT organization_id, created_by, subject FROM support_tickets WHERE id = $1",
        [id]
      );

      if (ticketRes.rows.length === 0) {
        res.status(404).json({ error: "Ticket not found" });
        return;
      }

      const ticket = ticketRes.rows[0];

      // Create reply
      const replyResult = await query(
        `INSERT INTO support_ticket_replies (ticket_id, user_id, message, is_staff_reply, created_at) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [id, (req as any).user?.id, message, true, new Date().toISOString()]
      );

      if (replyResult.rows.length === 0) {
        throw new Error("Failed to create reply");
      }

      // Touch ticket updated_at
      await query("UPDATE support_tickets SET updated_at = $1 WHERE id = $2", [
        new Date().toISOString(),
        id,
      ]);

      // Log activity notification for the ticket creator
      await logActivity(
        {
          userId: ticket.created_by,
          organizationId: ticket.organization_id,
          eventType: "ticket_reply",
          entityType: "support_ticket",
          entityId: id,
          message: `Staff replied to your ticket: "${ticket.subject}"`,
          status: "info",
          metadata: {
            ticket_id: id,
            reply_preview: message.substring(0, 100),
            is_staff_reply: true,
          },
        },
        req
      );

      const replyRow = replyResult.rows[0];
      res.status(201).json({
        reply: {
          id: replyRow.id,
          ticket_id: replyRow.ticket_id,
          message: replyRow.message,
          created_at: replyRow.created_at,
          sender_type: "admin",
          sender_name: "Staff Member",
        },
      });
    } catch (err: any) {
      if (isMissingTableError(err)) {
        return res.status(400).json({
          error:
            "support_ticket_replies table not found. Apply migrations before replying.",
        });
      }
      console.error("Admin ticket reply error:", err);
      res.status(500).json({ error: err.message || "Failed to add reply" });
    }
  }
);

// List replies for a ticket (admin)
router.get(
  "/tickets/:id/replies",
  authenticateToken,
  requireAdmin,
  [param("id").isUUID().withMessage("Invalid ticket id")],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const ticketCheck = await query(
        "SELECT id FROM support_tickets WHERE id = $1",
        [id]
      );
      if (ticketCheck.rows.length === 0) {
        res.status(404).json({ error: "Ticket not found" });
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
        sender_type: r.is_staff_reply ? "admin" : "user",
        sender_name: r.is_staff_reply
          ? "Staff Member"
          : r.sender_name || r.sender_email || "Unknown",
      }));
      res.json({ replies });
    } catch (err: any) {
      if (isMissingTableError(err)) {
        return res.status(400).json({
          error:
            "support_ticket_replies table not found. Apply migrations before listing replies.",
        });
      }
      console.error("Admin list replies error:", err);
      res.status(500).json({ error: err.message || "Failed to fetch replies" });
    }
  }
);

/**
 * GET /api/admin/vps-plans
 * 
 * Retrieve all VPS plans with backup pricing information for admin management.
 * 
 * Authentication: Admin role required
 * 
 * Response includes:
 * - Plan configuration (name, provider, active status)
 * - Base pricing from provider
 * - Backup pricing (base + upcharge)
 * - Backup frequency configuration (daily/weekly enabled)
 * - Plan specifications and metadata
 * 
 * See: repo-docs/FLEXIBLE_BACKUP_PRICING_API.md for detailed documentation
 */
router.get(
  "/plans",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const result = await query(
        `SELECT 
          id, name, provider_id, provider_plan_id, 
          base_price, markup_price,
          backup_price_monthly, backup_price_hourly,
          backup_upcharge_monthly, backup_upcharge_hourly,
          daily_backups_enabled, weekly_backups_enabled,
          specifications, active, created_at, updated_at
         FROM vps_plans 
         WHERE active = true 
         ORDER BY created_at DESC`
      );

      res.json({ plans: result.rows || [] });
    } catch (err: any) {
      console.error("Admin plans list error:", err);
      res.status(500).json({ error: err.message || "Failed to fetch plans" });
    }
  }
);

/**
 * PUT /api/admin/vps-plans/:id
 * 
 * Update an existing VPS plan's backup configuration and pricing.
 * 
 * Authentication: Admin role required
 * 
 * Accepts same fields as POST endpoint for updates:
 * - Pricing updates (base_price, markup_price)
 * - Backup configuration (backup frequencies, upcharges)
 * - Plan metadata (name, active status)
 * 
 * Validation:
 * - Same validation rules as plan creation
 * - Plan must exist and belong to valid provider
 * 
 * See: repo-docs/FLEXIBLE_BACKUP_PRICING_API.md for detailed documentation
 */
router.put(
  "/plans/:id",
  authenticateToken,
  requireAdmin,
  [
    param("id").isUUID().withMessage("Invalid plan id"),
    body("name").optional().isString().trim().notEmpty(),
    body("provider_id").optional().isUUID().withMessage("Invalid provider_id"),
    body("base_price").optional().isFloat({ min: 0 }),
    body("markup_price").optional().isFloat({ min: 0 }),
    body("active").optional().isBoolean(),
    body("backup_price_monthly").optional().isFloat({ min: 0 }),
    body("backup_price_hourly").optional().isFloat({ min: 0 }),
    body("backup_upcharge_monthly").optional().isFloat({ min: 0 }),
    body("backup_upcharge_hourly").optional().isFloat({ min: 0 }),
    body("daily_backups_enabled").optional().isBoolean(),
    body("weekly_backups_enabled").optional().isBoolean(),
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

      const { 
        name, 
        provider_id, 
        base_price, 
        markup_price, 
        active,
        backup_price_monthly,
        backup_price_hourly,
        backup_upcharge_monthly,
        backup_upcharge_hourly,
        daily_backups_enabled,
        weekly_backups_enabled
      } = req.body as any;

      // If provider_id is being updated, validate it exists
      if (typeof provider_id !== "undefined") {
        const providerCheck = await query(
          "SELECT id FROM service_providers WHERE id = $1 LIMIT 1",
          [provider_id]
        );

        if (providerCheck.rows.length === 0) {
          res.status(400).json({ error: "Provider not found" });
          return;
        }
        updateFields.provider_id = provider_id;
      }

      // Validate backup frequency configuration
      // If both are being updated, check that at least one is enabled
      if (typeof daily_backups_enabled !== "undefined" && typeof weekly_backups_enabled !== "undefined") {
        if (!daily_backups_enabled && !weekly_backups_enabled) {
          res.status(400).json({ error: "At least one backup frequency must be enabled" });
          return;
        }
      } else if (typeof daily_backups_enabled !== "undefined" || typeof weekly_backups_enabled !== "undefined") {
        // If only one is being updated, fetch current values to validate
        const currentPlanResult = await query(
          "SELECT daily_backups_enabled, weekly_backups_enabled FROM vps_plans WHERE id = $1",
          [id]
        );
        
        if (currentPlanResult.rows.length === 0) {
          res.status(404).json({ error: "Plan not found" });
          return;
        }
        
        const currentPlan = currentPlanResult.rows[0];
        const newDailyEnabled = typeof daily_backups_enabled !== "undefined" 
          ? daily_backups_enabled 
          : currentPlan.daily_backups_enabled;
        const newWeeklyEnabled = typeof weekly_backups_enabled !== "undefined" 
          ? weekly_backups_enabled 
          : currentPlan.weekly_backups_enabled;
        
        if (!newDailyEnabled && !newWeeklyEnabled) {
          res.status(400).json({ error: "At least one backup frequency must be enabled" });
          return;
        }
      }

      if (typeof name !== "undefined") updateFields.name = name;
      if (typeof base_price !== "undefined")
        updateFields.base_price = base_price;
      if (typeof markup_price !== "undefined")
        updateFields.markup_price = markup_price;
      if (typeof active !== "undefined") updateFields.active = active;
      if (typeof backup_price_monthly !== "undefined")
        updateFields.backup_price_monthly = backup_price_monthly;
      if (typeof backup_price_hourly !== "undefined")
        updateFields.backup_price_hourly = backup_price_hourly;
      if (typeof backup_upcharge_monthly !== "undefined")
        updateFields.backup_upcharge_monthly = backup_upcharge_monthly;
      if (typeof backup_upcharge_hourly !== "undefined")
        updateFields.backup_upcharge_hourly = backup_upcharge_hourly;
      if (typeof daily_backups_enabled !== "undefined")
        updateFields.daily_backups_enabled = daily_backups_enabled;
      if (typeof weekly_backups_enabled !== "undefined")
        updateFields.weekly_backups_enabled = weekly_backups_enabled;
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
        `UPDATE vps_plans SET ${setClauses.join(
          ", "
        )} WHERE id = $${idx} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error("Plan not found");
      }

      res.json({ plan: result.rows[0] });
    } catch (err: any) {
      console.error("Admin plan update error:", err);
      res.status(500).json({ error: err.message || "Failed to update plan" });
    }
  }
);

// Delete a VPS plan
router.delete(
  "/plans/:id",
  authenticateToken,
  requireAdmin,
  [param("id").isUUID()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      await query("DELETE FROM vps_plans WHERE id = $1", [id]);
      res.status(204).send();
    } catch (err: any) {
      console.error("Admin VPS plan delete error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to delete VPS plan" });
    }
  }
);

/**
 * POST /api/admin/vps-plans
 * 
 * Create a new VPS plan with backup configuration.
 * 
 * Authentication: Admin role required
 * 
 * Required fields:
 * - name: Plan display name
 * - provider_id: UUID of the service provider
 * - provider_plan_id: Provider's plan identifier
 * - base_price: Base monthly cost from provider
 * - markup_price: Admin markup on base price
 * 
 * Optional backup fields:
 * - backup_price_monthly/hourly: Base backup cost from provider
 * - backup_upcharge_monthly/hourly: Admin markup on backup cost
 * - daily_backups_enabled: Allow daily backups (DigitalOcean only)
 * - weekly_backups_enabled: Allow weekly backups (default: true)
 * 
 * Validation:
 * - At least one backup frequency must be enabled if backups offered
 * - Provider must exist and be active
 * - Hourly prices should equal monthly / 730
 * 
 * See: repo-docs/FLEXIBLE_BACKUP_PRICING_API.md for detailed documentation
 */
router.post(
  "/plans",
  authenticateToken,
  requireAdmin,
  [
    body("name").isString().trim().notEmpty(),
    body("provider_id").isUUID(),
    body("provider_plan_id").isString().trim().notEmpty(),
    body("base_price").isFloat({ min: 0 }),
    body("markup_price").isFloat({ min: 0 }),
    body("active").optional().isBoolean(),
    body("specifications").optional().isObject(),
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
        specifications = {},
        backup_price_monthly = 0,
        backup_price_hourly = 0,
        backup_upcharge_monthly = 0,
        backup_upcharge_hourly = 0,
        daily_backups_enabled = false,
        weekly_backups_enabled = true,
      } = req.body as any;

      // Ensure provider exists
      const providerCheck = await query(
        "SELECT id FROM service_providers WHERE id = $1 LIMIT 1",
        [provider_id]
      );

      if (providerCheck.rows.length === 0) {
        res.status(400).json({ error: "Provider not found" });
        return;
      }

      // Validate backup frequency configuration
      if (!daily_backups_enabled && !weekly_backups_enabled) {
        res.status(400).json({ error: "At least one backup frequency must be enabled" });
        return;
      }

      const now = new Date().toISOString();
      const insertResult = await query(
        `INSERT INTO vps_plans (
          name, provider_id, provider_plan_id, base_price, markup_price,
          backup_price_monthly, backup_price_hourly,
          backup_upcharge_monthly, backup_upcharge_hourly,
          daily_backups_enabled, weekly_backups_enabled,
          specifications, active, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
         RETURNING *`,
        [
          name,
          provider_id,
          provider_plan_id,
          base_price,
          markup_price,
          backup_price_monthly,
          backup_price_hourly,
          backup_upcharge_monthly,
          backup_upcharge_hourly,
          daily_backups_enabled,
          weekly_backups_enabled,
          specifications,
          active,
          now,
          now,
        ]
      );

      res.status(201).json({ plan: insertResult.rows[0] });
    } catch (err: any) {
      console.error("Admin plan create error:", err);
      res.status(500).json({ error: err.message || "Failed to create plan" });
    }
  }
);

// Providers: list and create
router.get(
  "/providers",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const result = await query(
        "SELECT * FROM service_providers ORDER BY display_order ASC NULLS LAST, created_at DESC"
      );

      // Enhance providers with validation status and last API call from configuration
      const providers = result.rows.map((provider) => ({
        ...provider,
        validation_status:
          provider.configuration?.validation_status || "unknown",
        validation_message: provider.configuration?.validation_message || null,
        last_api_call: provider.configuration?.last_api_call || null,
      }));

      res.json({ providers });
    } catch (err: any) {
      console.error("Admin providers list error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to fetch providers" });
    }
  }
);

router.post(
  "/providers",
  authenticateToken,
  requireAdmin,
  [
    body("name").isString().trim().notEmpty(),
    body("type").isIn(["linode", "digitalocean", "aws", "gcp"]),
    body("apiKey").isString().trim().notEmpty(),
    body("active").optional().isBoolean(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

  const { name, type, apiKey, active = true } = req.body;

  const encryptedApiKey = encryptSecret(apiKey);
      
      // Get the next display_order value
      const maxOrderResult = await query(
        "SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM service_providers"
      );
      const nextOrder = maxOrderResult.rows[0].next_order;
      
      const result = await query(
        `INSERT INTO service_providers (name, type, api_key_encrypted, active, display_order)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [name, type, encryptedApiKey, active, nextOrder]
      );

      const newProvider = result.rows[0];

      // Invalidate cache for the new provider (in case it was previously cached)
      ProviderResourceCache.invalidateProvider(newProvider.id);

      res.status(201).json({ provider: newProvider });
    } catch (err: any) {
      console.error("Admin provider create error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to create provider" });
    }
  }
);

// Reorder providers (must be before /providers/:id to avoid route conflict)
router.put(
  "/providers/reorder",
  authenticateToken,
  requireAdmin,
  [
    body("providerIds")
      .isArray({ min: 1 })
      .withMessage("providerIds must be a non-empty array"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { providerIds } = req.body;

      console.log("Received reorder request:", { providerIds });

      // Update display_order for each provider
      for (let i = 0; i < providerIds.length; i++) {
        await query(
          "UPDATE service_providers SET display_order = $1, updated_at = NOW() WHERE id = $2",
          [i + 1, providerIds[i]]
        );
      }

      res.json({
        success: true,
        message: "Provider order updated successfully",
      });
    } catch (err: any) {
      console.error("Admin provider reorder error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to reorder providers" });
    }
  }
);

// Update a provider
router.put(
  "/providers/:id",
  authenticateToken,
  requireAdmin,
  [
    param("id").isUUID(),
    body("name").optional().isString().trim().notEmpty(),
    body("active").optional().isBoolean(),
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
        return res.status(400).json({ error: "No fields to update" });
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const result = await query(
        `UPDATE service_providers SET ${updates.join(
          ", "
        )} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Provider not found" });
      }

      const updatedProvider = result.rows[0];

      // Invalidate cache when provider configuration changes
      ProviderResourceCache.invalidateProvider(updatedProvider.id);

      res.json({ provider: updatedProvider });
    } catch (err: any) {
      console.error("Admin provider update error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to update provider" });
    }
  }
);

// Fetch provider region configuration and availability
router.get(
  "/providers/:id/regions",
  authenticateToken,
  requireAdmin,
  [param("id").isUUID()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const providerResult = await query(
        `SELECT id, name, type, api_key_encrypted, allowed_regions
           FROM service_providers
          WHERE id = $1
          LIMIT 1`,
        [id]
      );

      if (providerResult.rows.length === 0) {
        return res.status(404).json({ error: "Provider not found" });
      }

      const provider = providerResult.rows[0];
      const providerType = provider.type as "linode" | "digitalocean";

      if (!["linode", "digitalocean"].includes(providerType)) {
        return res
          .status(400)
          .json({ error: "Region management is only supported for Linode and DigitalOcean" });
      }

      let allowedRegions: string[] = [];
      try {
        const overridesResult = await query(
          "SELECT region FROM provider_region_overrides WHERE provider_id = $1",
          [id]
        );

        if (overridesResult.rows.length > 0) {
          allowedRegions = normalizeRegionList(
            overridesResult.rows
              .map((row) => row.region)
              .filter((value): value is string => typeof value === "string")
          );
        }
      } catch (overrideErr: any) {
        const message = String(overrideErr?.message || "").toLowerCase();
        const missingTable = message.includes("relation") && message.includes("provider_region_overrides");
        if (!missingTable) {
          throw overrideErr;
        }
      }

      if (allowedRegions.length === 0) {
        allowedRegions = parseStoredAllowedRegions(provider.allowed_regions ?? null);
      }

      const mode: "default" | "custom" = allowedRegions.length > 0 ? "custom" : "default";

      const token = await normalizeProviderToken(provider.id, provider.api_key_encrypted);
      if (!token) {
        return res.status(503).json({ error: "Provider credentials not available" });
      }

      let allRegions: Array<{
        id: string;
        label: string;
        country: string;
        capabilities: string[];
        status: string;
      }> = [];

      if (providerType === "linode") {
        const linodeRegions = await linodeService.getLinodeRegions();
        allRegions = linodeRegions.map((region) => ({
          id: region.id,
          label: region.label,
          country: region.country ?? "",
          capabilities: Array.isArray(region.capabilities) ? region.capabilities : [],
          status: region.status ?? "unknown",
        }));
      } else {
        const digitalOceanRegions = await digitalOceanService.getDigitalOceanRegions(token);
        allRegions = digitalOceanRegions.map((region) => ({
          id: region.slug,
          label: region.name,
          country:
            typeof region.slug === "string"
              ? DIGITALOCEAN_REGION_COUNTRY_MAP[region.slug.toLowerCase()] ?? ""
              : "",
          capabilities: Array.isArray(region.features) ? region.features : [],
          status: region.available ? "ok" : "unavailable",
        }));
      }

      const normalizedDefaultSet = new Set(
        (providerType === "linode"
          ? DEFAULT_LINODE_ALLOWED_REGIONS
          : DEFAULT_DIGITALOCEAN_ALLOWED_REGIONS
        ).map((slug) => slug.toLowerCase())
      );

      const effectiveAllowedSet =
        mode === "custom"
          ? new Set(allowedRegions)
          : new Set(
              allRegions
                .map((region) =>
                  typeof region.id === "string" ? region.id.toLowerCase() : ""
                )
                .filter(Boolean)
            );

      const regions = allRegions.map((region) => {
        const slug = typeof region.id === "string" ? region.id.toLowerCase() : "";
        return {
          id: region.id,
          label: region.label || region.id,
          country: region.country,
          status: region.status,
          capabilities: region.capabilities,
          allowed: slug ? effectiveAllowedSet.has(slug) : false,
          isDefault: slug ? normalizedDefaultSet.has(slug) : false,
        };
      });

      res.json({
        provider: {
          id: provider.id,
          name: provider.name,
          type: providerType,
        },
        mode,
        allowedRegions,
        defaultRegions: Array.from(normalizedDefaultSet),
        regions,
        fetchedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("Admin provider regions fetch error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to fetch provider regions" });
    }
  }
);

// Update provider region allowlist
router.put(
  "/providers/:id/regions",
  authenticateToken,
  requireAdmin,
  [
    param("id").isUUID(),
    body("mode").optional().isString(),
    body("regions").optional().isArray(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const modeRaw =
        typeof req.body.mode === "string" ? req.body.mode.toLowerCase().trim() : "custom";
      const mode: "default" | "custom" = modeRaw === "default" ? "default" : "custom";

      const providerResult = await query(
        `SELECT id, name, type, api_key_encrypted
           FROM service_providers
          WHERE id = $1
          LIMIT 1`,
        [id]
      );

      if (providerResult.rows.length === 0) {
        return res.status(404).json({ error: "Provider not found" });
      }

      const provider = providerResult.rows[0];
      const providerType = provider.type as "linode" | "digitalocean";

      if (!["linode", "digitalocean"].includes(providerType)) {
        return res
          .status(400)
          .json({ error: "Region management is only supported for Linode and DigitalOcean" });
      }

      let requestedRegions: string[] = [];

      if (mode === "custom") {
        if (!Array.isArray(req.body.regions)) {
          return res
            .status(400)
            .json({ error: "regions must be an array when mode is custom" });
        }

        requestedRegions = normalizeRegionList(
          req.body.regions.filter((value: unknown): value is string => typeof value === "string")
        );

        if (requestedRegions.length === 0) {
          return res
            .status(400)
            .json({ error: "Select at least one region or switch to default mode" });
        }
      }

      const token = await normalizeProviderToken(provider.id, provider.api_key_encrypted);

      if (mode === "custom") {
        if (!token) {
          return res.status(503).json({ error: "Provider credentials not available" });
        }

        let validRegionSlugs: Set<string> = new Set();

        if (providerType === "linode") {
          const linodeRegions = await linodeService.getLinodeRegions();
          validRegionSlugs = new Set(
            linodeRegions
              .map((region) => region.id?.toLowerCase())
              .filter((value): value is string => Boolean(value))
          );
        } else {
          const digitalOceanRegions = await digitalOceanService.getDigitalOceanRegions(token);
          validRegionSlugs = new Set(
            digitalOceanRegions
              .map((region) => region.slug?.toLowerCase())
              .filter((value): value is string => Boolean(value))
          );
        }

        const invalidSelections = requestedRegions.filter((region) => !validRegionSlugs.has(region));
        if (invalidSelections.length > 0) {
          return res.status(400).json({
            error: "One or more selected regions are not available from the provider",
            invalidRegions: invalidSelections,
          });
        }
      }

      const jsonPayload =
        mode === "custom" ? JSON.stringify(requestedRegions) : JSON.stringify([]);

      await query("BEGIN");
      try {
        await query("DELETE FROM provider_region_overrides WHERE provider_id = $1", [id]);

        if (mode === "custom") {
          for (const region of requestedRegions) {
            await query(
              `INSERT INTO provider_region_overrides (provider_id, region)
               VALUES ($1, $2)
               ON CONFLICT (provider_id, region)
               DO UPDATE SET updated_at = NOW()`,
              [id, region]
            );
          }
        }

        await query(
          "UPDATE service_providers SET allowed_regions = $2::jsonb, updated_at = NOW() WHERE id = $1",
          [id, jsonPayload]
        );

        await query("COMMIT");
      } catch (txnError) {
        await query("ROLLBACK");
        throw txnError;
      }

      ProviderResourceCache.invalidateProvider(id);

      res.json({
        success: true,
        mode,
        allowedRegions: requestedRegions,
        message:
          mode === "custom"
            ? `Configured ${requestedRegions.length} allowed region${requestedRegions.length === 1 ? "" : "s"}`
            : "Reverted to provider defaults",
      });
    } catch (err: any) {
      console.error("Admin provider regions update error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to update provider regions" });
    }
  }
);

// Delete a provider
router.delete(
  "/providers/:id",
  authenticateToken,
  requireAdmin,
  [param("id").isUUID()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ error: "Invalid input", details: errors.array() });
      }

      const { id } = req.params;

      // Invalidate cache before deleting provider
      ProviderResourceCache.invalidateProvider(id);

      await query("DELETE FROM service_providers WHERE id = $1", [id]);
      res.status(204).send();
    } catch (err: any) {
      console.error("Admin provider delete error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to delete provider" });
    }
  }
);

// Validate provider credentials
router.post(
  "/providers/:id/validate",
  authenticateToken,
  requireAdmin,
  [param("id").isUUID()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ error: "Invalid input", details: errors.array() });
      }

      const { id } = req.params;

      // Fetch provider details
      const providerResult = await query(
        "SELECT * FROM service_providers WHERE id = $1",
        [id]
      );

      if (providerResult.rows.length === 0) {
        return res.status(404).json({ error: "Provider not found" });
      }

      const provider = providerResult.rows[0];
      const apiToken = await normalizeProviderToken(
        provider.id,
        provider.api_key_encrypted
      );

      if (!apiToken) {
        return res.status(400).json({
          error: "Provider API token is not configured",
        });
      }
      let validationStatus: "valid" | "invalid" = "invalid";
      let validationMessage = "";

      try {
        // Test API connectivity based on provider type
        if (provider.type === "linode") {
          // Test Linode API
          const testResult = await linodeService.testConnection(apiToken);
          validationStatus = testResult.success ? "valid" : "invalid";
          validationMessage = testResult.message || "";
        } else if (provider.type === "digitalocean") {
          // Test DigitalOcean API
          const testResult = await digitalOceanService.testConnection(
            apiToken
          );
          validationStatus = testResult.success ? "valid" : "invalid";
          validationMessage = testResult.message || "";
        } else {
          validationStatus = "invalid";
          validationMessage = "Provider type not supported for validation";
        }

        // Update provider with validation status and last API call timestamp
        await query(
          `UPDATE service_providers 
           SET configuration = jsonb_set(
             jsonb_set(
               COALESCE(configuration, '{}'::jsonb),
               '{validation_status}',
               $1::jsonb
             ),
             '{validation_message}',
             $2::jsonb
           ),
           updated_at = NOW()
           WHERE id = $3`,
          [
            JSON.stringify(validationStatus),
            JSON.stringify(validationMessage),
            id,
          ]
        );

        // If validation succeeded, also update last_api_call timestamp
        if (validationStatus === "valid") {
          await query(
            `UPDATE service_providers 
             SET configuration = jsonb_set(
               COALESCE(configuration, '{}'::jsonb),
               '{last_api_call}',
               $1::jsonb
             )
             WHERE id = $2`,
            [JSON.stringify(new Date().toISOString()), id]
          );
        }

        res.json({
          validation_status: validationStatus,
          validation_message: validationMessage,
          last_api_call:
            validationStatus === "valid" ? new Date().toISOString() : null,
        });
      } catch (validationError: any) {
        validationStatus = "invalid";
        validationMessage =
          validationError.message || "Failed to validate credentials";

        // Update provider with error status
        await query(
          `UPDATE service_providers 
           SET configuration = jsonb_set(
             jsonb_set(
               COALESCE(configuration, '{}'::jsonb),
               '{validation_status}',
               $1::jsonb
             ),
             '{validation_message}',
             $2::jsonb
           ),
           updated_at = NOW()
           WHERE id = $3`,
          [
            JSON.stringify(validationStatus),
            JSON.stringify(validationMessage),
            id,
          ]
        );

        res.json({
          validation_status: validationStatus,
          validation_message: validationMessage,
          last_api_call: null,
        });
      }
    } catch (err: any) {
      console.error("Admin provider validation error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to validate provider" });
    }
  }
);

// Container pricing configuration: get and upsert
router.get(
  "/container/pricing",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const result = await query(
        "SELECT * FROM container_pricing_config ORDER BY updated_at DESC LIMIT 1"
      );
      res.json({ pricing: result.rows?.[0] || null });
    } catch (err: any) {
      if (isMissingTableError(err)) {
        return res.json({
          pricing: null,
          warning:
            "container_pricing_config table not found. Apply migrations.",
        });
      }
      console.error("Admin container pricing get error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to fetch pricing config" });
    }
  }
);

router.put(
  "/container/pricing",
  authenticateToken,
  requireAdmin,
  [
    body("price_per_cpu").isFloat({ min: 0 }),
    body("price_per_ram_gb").isFloat({ min: 0 }),
    body("price_per_storage_gb").isFloat({ min: 0 }),
    body("price_per_network_mbps").isFloat({ min: 0 }),
    body("currency").optional().isString().isLength({ min: 3, max: 3 }),
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
          "SELECT id FROM container_pricing_config LIMIT 1"
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
          return res.status(400).json({
            error:
              "container_pricing_config table not found. Apply migrations before updating.",
          });
        }
        throw err;
      }
    } catch (err: any) {
      console.error("Admin container pricing upsert error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to save pricing config" });
    }
  }
);

// Networking: rDNS configuration get and upsert
router.get(
  "/networking/rdns",
  authenticateToken,
  requireAdmin,
  async (_req: Request, res: Response) => {
    try {
      const result = await query(
        "SELECT * FROM networking_config ORDER BY updated_at DESC LIMIT 1"
      );
      const config = result.rows?.[0] || null;
      if (config) {
        return res.json({ config });
      }
      // Fallback to default if no row exists
      return res.json({ config: { rdns_base_domain: "ip.rev.skyvps360.xyz" } });
    } catch (err: any) {
      if (isMissingTableError(err)) {
        return res.json({
          config: { rdns_base_domain: "ip.rev.skyvps360.xyz" },
          warning: "networking_config table not found. Apply migrations.",
        });
      }
      console.error("Admin networking rDNS get error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to fetch rDNS configuration" });
    }
  }
);

router.put(
  "/networking/rdns",
  authenticateToken,
  requireAdmin,
  [
    body("rdns_base_domain")
      .isString()
      .trim()
      .isLength({ min: 3, max: 255 })
      .withMessage("Invalid rDNS base domain"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const now = new Date().toISOString();
      // Normalize domain: remove leading/trailing dots and spaces
      const baseDomainRaw: string = String(
        req.body.rdns_base_domain || ""
      ).trim();
      const baseDomain = baseDomainRaw.replace(/^\.+|\.+$/g, "");

      // Upsert: update latest row or insert a new one if none exists
      try {
        const latest = await query(
          "SELECT id FROM networking_config ORDER BY updated_at DESC LIMIT 1"
        );
        if (latest.rows?.length) {
          const id = latest.rows[0].id;
          const upd = await query(
            "UPDATE networking_config SET rdns_base_domain = $1, updated_at = $2 WHERE id = $3 RETURNING *",
            [baseDomain, now, id]
          );
          return res.json({ config: upd.rows[0] });
        } else {
          const ins = await query(
            "INSERT INTO networking_config (rdns_base_domain, created_at, updated_at) VALUES ($1, $2, $2) RETURNING *",
            [baseDomain, now]
          );
          return res.json({ config: ins.rows[0] });
        }
      } catch (err: any) {
        if (isMissingTableError(err)) {
          return res.status(400).json({
            error:
              "networking_config table not found. Apply migrations before updating.",
          });
        }
        throw err;
      }
    } catch (err: any) {
      console.error("Admin networking rDNS upsert error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to save rDNS configuration" });
    }
  }
);

// Container plans CRUD
router.get(
  "/container/plans",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const result = await query(
        "SELECT * FROM container_plans ORDER BY created_at DESC"
      );
      res.json({ plans: result.rows || [] });
    } catch (err: any) {
      if (isMissingTableError(err)) {
        return res.json({
          plans: [],
          warning: "container_plans table not found. Apply migrations.",
        });
      }
      console.error("Admin container plans list error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to fetch container plans" });
    }
  }
);

router.post(
  "/container/plans",
  authenticateToken,
  requireAdmin,
  [
    body("name").isString().trim().notEmpty(),
    body("cpu_cores").isInt({ min: 1 }),
    body("ram_gb").isInt({ min: 1 }),
    body("storage_gb").isInt({ min: 1 }),
    body("network_mbps").isInt({ min: 0 }),
    body("base_price").isFloat({ min: 0 }),
    body("markup_price").isFloat({ min: 0 }),
    body("active").optional().isBoolean(),
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
        return res.status(400).json({
          error:
            "container_plans table not found. Apply migrations before creating.",
        });
      }
      console.error("Admin container plan create error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to create container plan" });
    }
  }
);

router.put(
  "/container/plans/:id",
  authenticateToken,
  requireAdmin,
  [
    param("id").isUUID(),
    body("name").optional().isString().trim().notEmpty(),
    body("cpu_cores").optional().isInt({ min: 1 }),
    body("ram_gb").optional().isInt({ min: 1 }),
    body("storage_gb").optional().isInt({ min: 1 }),
    body("network_mbps").optional().isInt({ min: 0 }),
    body("base_price").optional().isFloat({ min: 0 }),
    body("markup_price").optional().isFloat({ min: 0 }),
    body("active").optional().isBoolean(),
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
        `UPDATE container_plans SET ${setClauses.join(
          ", "
        )} WHERE id = $${idx} RETURNING *`,
        values
      );
      if (result.rows.length === 0) {
        throw new Error("Container plan not found");
      }
      res.json({ plan: result.rows[0] });
    } catch (err: any) {
      if (isMissingTableError(err)) {
        return res.status(400).json({
          error:
            "container_plans table not found. Apply migrations before updating.",
        });
      }
      console.error("Admin container plan update error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to update container plan" });
    }
  }
);

router.delete(
  "/container/plans/:id",
  authenticateToken,
  requireAdmin,
  [param("id").isUUID()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ error: "Invalid input", details: errors.array() });
      }

      const { id } = req.params;
      await query("DELETE FROM container_plans WHERE id = $1", [id]);
      res.status(204).send();
    } catch (err: any) {
      if (isMissingTableError(err)) {
        return res.status(400).json({
          error:
            "container_plans table not found. Apply migrations before deleting.",
        });
      }
      console.error("Admin container plan delete error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to delete container plan" });
    }
  }
);

// List all containers across organizations
router.get(
  "/containers",
  authenticateToken,
  requireAdmin,
  async (_req: Request, res: Response) => {
    try {
      const result = await query(
        `SELECT 
        c.id,
        c.name,
        c.image,
        c.organization_id,
        c.config,
        c.status,
        c.created_by,
        c.created_at,
        c.updated_at,
        org.name AS organization_name,
        org.slug AS organization_slug,
        u.email AS creator_email,
        u.name AS creator_name
       FROM containers c
       LEFT JOIN organizations org ON org.id = c.organization_id
       LEFT JOIN users u ON u.id = c.created_by
       ORDER BY c.created_at DESC`
      );
      res.json({ containers: result.rows || [] });
    } catch (err: any) {
      if (isMissingTableError(err)) {
        return res.json({
          containers: [],
          warning: "containers table not found. Apply migrations.",
        });
      }
      console.error("Admin containers list error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to fetch containers" });
    }
  }
);

// List all VPS servers for admins
router.get(
  "/servers",
  authenticateToken,
  requireAdmin,
  async (_req: Request, res: Response) => {
    try {
      const result = await query(
        `SELECT 
        v.id,
        v.organization_id,
        v.plan_id,
        v.provider_instance_id,
        v.label,
        v.status,
        v.ip_address,
        v.configuration,
        v.created_at,
        v.updated_at,
        org.name AS organization_name,
        org.slug AS organization_slug,
        u.id AS owner_id,
        u.name AS owner_name,
        u.email AS owner_email,
        plan_data.id AS plan_record_id,
        plan_data.name AS plan_name,
        plan_data.provider_plan_id AS plan_provider_plan_id,
        plan_data.specifications AS plan_specifications,
        sp.name AS provider_name
      FROM vps_instances v
      LEFT JOIN organizations org ON org.id = v.organization_id
      LEFT JOIN users u ON u.id = org.owner_id
      LEFT JOIN LATERAL (
        SELECT p.*
        FROM vps_plans p
        WHERE (p.id::text = v.plan_id) OR (p.provider_plan_id = v.plan_id)
        ORDER BY (p.id::text = v.plan_id)::int DESC
        LIMIT 1
      ) AS plan_data ON TRUE
      LEFT JOIN service_providers sp ON sp.id = plan_data.provider_id
      ORDER BY v.created_at DESC`
      );

      const rows = result.rows || [];

      let regionLabelMap: Record<string, string> = {};
      try {
        const regions = await linodeService.getLinodeRegions();
        regionLabelMap = Object.fromEntries(
          regions.map((r) => [r.id, r.label])
        );
      } catch (regionErr) {
        console.warn(
          "Admin servers: failed to fetch Linode regions",
          regionErr
        );
      }

      const enriched = await Promise.all(
        rows.map(async (row) => {
          const configuration =
            row.configuration && typeof row.configuration === "object"
              ? row.configuration
              : {};
          let status = row.status;
          let ipAddress = row.ip_address;
          let regionCode = configuration?.region ?? null;

          try {
            const instanceId = Number(row.provider_instance_id);
            if (Number.isFinite(instanceId)) {
              const detail = await linodeService.getLinodeInstance(instanceId);
              const currentIp =
                Array.isArray(detail.ipv4) && detail.ipv4.length > 0
                  ? detail.ipv4[0]
                  : null;
              const normalizedStatus =
                detail.status === "offline" ? "stopped" : detail.status;
              if (normalizedStatus !== status || currentIp !== ipAddress) {
                await query(
                  "UPDATE vps_instances SET status = $1, ip_address = $2, updated_at = NOW() WHERE id = $3",
                  [normalizedStatus, currentIp, row.id]
                );
                status = normalizedStatus;
                ipAddress = currentIp;
              }

              configuration.image = configuration.image || detail.image || null;
              configuration.region =
                configuration.region || detail.region || null;
              configuration.type = configuration.type || detail.type || null;
              regionCode = configuration.region || regionCode;
            }
          } catch (detailErr) {
            console.warn(
              `Admin servers: unable to refresh instance ${row.provider_instance_id}`,
              detailErr
            );
          }

          const regionLabel = regionCode
            ? regionLabelMap[regionCode] || null
            : null;

          return {
            ...row,
            status,
            ip_address: ipAddress,
            configuration,
            region_label: regionLabel,
          };
        })
      );

      res.json({ servers: enriched });
    } catch (err: any) {
      if (isMissingTableError(err)) {
        return res.json({
          servers: [],
          warning: "vps_instances table not found. Apply migrations.",
        });
      }
      console.error("Admin servers list error:", err);
      res.status(500).json({ error: err.message || "Failed to fetch servers" });
    }
  }
);

// List users for admin management view
router.get(
  "/users",
  authenticateToken,
  requireAdmin,
  auditLogger("list_users"),
  async (_req: Request, res: Response) => {
    try {
      const result = await query(
        `SELECT 
        u.id,
        u.email,
        u.name,
        u.role,
        u.created_at,
        u.updated_at,
        COALESCE(
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'organizationId', om.organization_id,
              'organizationName', org.name,
              'organizationSlug', org.slug,
              'role', om.role
            )
          ) FILTER (WHERE om.organization_id IS NOT NULL),
          '[]'::jsonb
        ) AS organizations
      FROM users u
      LEFT JOIN organization_members om ON om.user_id = u.id
      LEFT JOIN organizations org ON org.id = om.organization_id
      GROUP BY u.id
      ORDER BY u.created_at DESC`
      );
      res.json({ users: result.rows || [] });
    } catch (err: any) {
      console.error("Admin users list error:", err);
      res.status(500).json({ error: err.message || "Failed to fetch users" });
    }
  }
);

// Get detailed user information by ID
router.get(
  "/users/:id",
  authenticateToken,
  requireAdmin,
  auditLogger("view_user_details"),
  [param("id").isUUID().withMessage("Invalid user id")],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;

      // Get detailed user information with organization memberships
      const userResult = await query(
        `SELECT 
          u.id,
          u.email,
          u.name,
          u.role,
          u.phone,
          u.timezone,
          u.preferences,
          u.created_at,
          u.updated_at,
          COALESCE(
            jsonb_agg(
              DISTINCT jsonb_build_object(
                'organizationId', om.organization_id,
                'organizationName', org.name,
                'organizationSlug', org.slug,
                'role', om.role,
                'joinedAt', om.created_at
              )
            ) FILTER (WHERE om.organization_id IS NOT NULL),
            '[]'::jsonb
          ) AS organizations
        FROM users u
        LEFT JOIN organization_members om ON om.user_id = u.id
        LEFT JOIN organizations org ON org.id = om.organization_id
        WHERE u.id = $1
        GROUP BY u.id`,
        [id]
      );

      if (userResult.rows.length === 0) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const user = userResult.rows[0];

      // Get activity summary - VPS count
      const vpsCountResult = await query(
        `SELECT COUNT(*) as vps_count
         FROM vps_instances v
         JOIN organizations org ON org.id = v.organization_id
         JOIN organization_members om ON om.organization_id = org.id
         WHERE om.user_id = $1`,
        [id]
      );

      // Get activity summary - Container count
      let containerCount = 0;
      try {
        const containerCountResult = await query(
          `SELECT COUNT(*) as container_count
           FROM containers c
           JOIN organizations org ON org.id = c.organization_id
           JOIN organization_members om ON om.organization_id = org.id
           WHERE om.user_id = $1`,
          [id]
        );
        containerCount = parseInt(
          containerCountResult.rows[0]?.container_count || "0"
        );
      } catch (containerErr: any) {
        if (!isMissingTableError(containerErr)) {
          console.warn(
            "Error fetching container count for user:",
            containerErr
          );
        }
      }

      // Get last activity from activity logs
      let lastActivity = null;
      try {
        const activityResult = await query(
          `SELECT created_at
           FROM activity_logs
           WHERE user_id = $1
           ORDER BY created_at DESC
           LIMIT 1`,
          [id]
        );
        lastActivity = activityResult.rows[0]?.created_at || null;
      } catch (activityErr: any) {
        if (!isMissingTableError(activityErr)) {
          console.warn("Error fetching last activity for user:", activityErr);
        }
      }

      // Build detailed user response
      const detailedUser = {
        ...user,
        status: "active", // Default status - could be enhanced with actual status tracking
        activity_summary: {
          vps_count: parseInt(vpsCountResult.rows[0]?.vps_count || "0"),
          container_count: containerCount,
          last_activity: lastActivity,
        },
      };

      res.json({ user: detailedUser });
    } catch (err: any) {
      console.error("Admin user detail error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to fetch user details" });
    }
  }
);

// Update user information
router.put(
  "/users/:id",
  authenticateToken,
  requireAdmin,
  auditLogger("update_user"),
  [
    param("id").isUUID().withMessage("Invalid user id"),
    body("name")
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1 })
      .withMessage("Name must not be empty"),
    body("email").optional().isEmail().withMessage("Invalid email format"),
    body("role").optional().isIn(["admin", "user"]).withMessage("Invalid role"),
    body("phone").optional().isString().trim(),
    body("timezone").optional().isString().trim(),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const rawBody = req.body as {
        name?: string;
        email?: string;
        role?: string;
        phone?: string;
        timezone?: string;
      };

      // Sanitize input data
      const { sanitizeUserInput } = await import("../lib/security.js");
      const { name, email, role, phone, timezone } = sanitizeUserInput(rawBody);

      // Check if user exists
      const userCheck = await query(
        "SELECT id, email, name, role FROM users WHERE id = $1",
        [id]
      );
      if (userCheck.rows.length === 0) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const existingUser = userCheck.rows[0];

      // Enhanced security validation for user updates
      const { validateUserUpdateRequest } = await import("../lib/security.js");
      const securityValidation = validateUserUpdateRequest(
        req.user!,
        existingUser,
        { name, email, role, phone, timezone }
      );

      if (!securityValidation.isValid) {
        res.status(403).json({ error: securityValidation.error });
        return;
      }

      // Check if email is already taken by another user
      if (email && email !== existingUser.email) {
        const emailCheck = await query(
          "SELECT id FROM users WHERE email = $1 AND id != $2",
          [email, id]
        );
        if (emailCheck.rows.length > 0) {
          res
            .status(400)
            .json({ error: "Email is already taken by another user" });
          return;
        }
      }

      // Build update query dynamically
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (name !== undefined) {
        updateFields.push(`name = $${paramCount++}`);
        values.push(name);
      }
      if (email !== undefined) {
        updateFields.push(`email = $${paramCount++}`);
        values.push(email);
      }
      if (role !== undefined) {
        updateFields.push(`role = $${paramCount++}`);
        values.push(role);
      }
      if (phone !== undefined) {
        updateFields.push(`phone = $${paramCount++}`);
        values.push(phone);
      }
      if (timezone !== undefined) {
        updateFields.push(`timezone = $${paramCount++}`);
        values.push(timezone);
      }

      if (updateFields.length === 0) {
        res.status(400).json({ error: "No fields to update" });
        return;
      }

      // Add updated_at timestamp
      updateFields.push(`updated_at = $${paramCount++}`);
      values.push(new Date().toISOString());
      values.push(id);

      // Execute update
      const updateResult = await query(
        `UPDATE users SET ${updateFields.join(
          ", "
        )} WHERE id = $${paramCount} RETURNING id, email, name, role, phone, timezone, created_at, updated_at`,
        values
      );

      const updatedUser = updateResult.rows[0];

      // Enhanced audit logging for user modifications
      if (req.user?.id) {
        const changes: Record<string, { from: any; to: any }> = {};
        const changeDescriptions: string[] = [];

        if (name !== undefined && name !== existingUser.name) {
          changes.name = { from: existingUser.name, to: name };
          changeDescriptions.push(`name: "${existingUser.name}" → "${name}"`);
        }
        if (email !== undefined && email !== existingUser.email) {
          changes.email = { from: existingUser.email, to: email };
          changeDescriptions.push(
            `email: "${existingUser.email}" → "${email}"`
          );
        }
        if (role !== undefined && role !== existingUser.role) {
          changes.role = { from: existingUser.role, to: role };
          changeDescriptions.push(`role: "${existingUser.role}" → "${role}"`);
        }
        if (phone !== undefined) {
          changes.phone = { from: "[hidden]", to: "[updated]" };
          changeDescriptions.push(`phone updated`);
        }
        if (timezone !== undefined) {
          changes.timezone = { from: "[hidden]", to: timezone };
          changeDescriptions.push(`timezone updated`);
        }

        const { generateAuditMetadata } = await import("../lib/security.js");
        const auditMetadata = generateAuditMetadata(
          req,
          "user_update",
          existingUser,
          changes
        );

        await logActivity(
          {
            userId: req.user.id,
            organizationId: req.user.organizationId ?? null,
            eventType: "user_update",
            entityType: "user",
            entityId: id,
            message: `Admin updated user ${
              existingUser.name || existingUser.email
            }: ${changeDescriptions.join(", ")}`,
            status: "success",
            metadata: {
              ...auditMetadata,
              target_user_id: id,
              target_user_email: existingUser.email,
              change_descriptions: changeDescriptions,
              updated_fields: Object.keys(rawBody),
              security_validated: true,
            },
          },
          req
        );
      }

      res.json({ user: updatedUser });
    } catch (err: any) {
      console.error("Admin user update error:", err);
      res.status(500).json({ error: err.message || "Failed to update user" });
    }
  }
);

// Schema check endpoint to report missing tables for quick diagnostics
router.get(
  "/schema/check",
  authenticateToken,
  requireAdmin,
  async (_req: Request, res: Response) => {
    const requiredTables = ["container_pricing_config", "container_plans"];
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
  }
);

// Get upstream provider plans (types)
router.get(
  "/upstream/plans",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const plans = await linodeService.getLinodeTypes();
      
      // Linode API includes backup pricing in the response
      // Map it to our format for consistency
      const plansWithBackupPricing = plans.map((plan: any) => ({
        ...plan,
        backup_price_monthly: plan.addons?.backups?.price?.monthly || 0,
        backup_price_hourly: plan.addons?.backups?.price?.hourly || 0,
      }));
      
      res.json({ plans: plansWithBackupPricing });
    } catch (err: any) {
      console.error("Error fetching upstream provider plans:", err);
      res.status(500).json({
        error: err.message || "Failed to fetch upstream provider plans",
        details:
          "Make sure upstream provider API token is configured in environment variables",
      });
    }
  }
);

// Get upstream provider regions
router.get(
  "/upstream/regions",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const regions = await linodeService.getLinodeRegions();
      res.json({ regions });
    } catch (err: any) {
      console.error("Error fetching upstream provider regions:", err);
      res.status(500).json({
        error: err.message || "Failed to fetch upstream provider regions",
        details:
          "Make sure upstream provider API token is configured in environment variables",
      });
    }
  }
);

// Get upstream provider StackScripts
router.get(
  "/upstream/stackscripts",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const mine = String(req.query.mine || "").toLowerCase() === "true";
      const stackscripts = await linodeService.getLinodeStackScripts(mine);
      res.json({ stackscripts });
    } catch (err: any) {
      console.error("Error fetching upstream provider StackScripts:", err);
      res.status(500).json({
        error: err.message || "Failed to fetch StackScripts",
        details:
          "Make sure upstream provider API token is configured in environment variables",
      });
    }
  }
);

// DigitalOcean API endpoints (parallel to Linode endpoints above)
// Get DigitalOcean sizes (droplet plans)
router.get(
  "/digitalocean/sizes",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const providerToken = await getProviderTokenByType("digitalocean");

      if (!providerToken) {
        return res.status(400).json({
          error: "DigitalOcean provider not found or not active",
          details: "Please configure DigitalOcean provider in /admin#providers",
        });
      }

      const sizes = await digitalOceanService.getDigitalOceanSizes(
        providerToken.token
      );
      
      // DigitalOcean backup pricing:
      // - Weekly backups: 20% of droplet cost (4 weeks retention)
      // - Daily backups: 30% of droplet cost (7 days retention)
      // We default to weekly (20%) as it's the most common choice
      const sizesWithBackupPricing = sizes.map((size: any) => ({
        ...size,
        backup_price_monthly: size.price_monthly * 0.20, // 20% for weekly backups (default)
        backup_price_hourly: size.price_hourly * 0.20,
        // Note: Admins can manually adjust to 30% for daily backups if needed
      }));
      
      res.json({ sizes: sizesWithBackupPricing });
    } catch (err: any) {
      console.error("Error fetching DigitalOcean sizes:", err);
      res.status(500).json({
        error: err.message || "Failed to fetch DigitalOcean sizes",
        details:
          "Check that your DigitalOcean API token is valid in /admin#providers",
      });
    }
  }
);

// Get DigitalOcean regions
router.get(
  "/digitalocean/regions",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const providerToken = await getProviderTokenByType("digitalocean");

      if (!providerToken) {
        return res.status(400).json({
          error: "DigitalOcean provider not found or not active",
          details: "Please configure DigitalOcean provider in /admin#providers",
        });
      }

      const regions = await digitalOceanService.getDigitalOceanRegions(
        providerToken.token
      );
      res.json({ regions });
    } catch (err: any) {
      console.error("Error fetching DigitalOcean regions:", err);
      res.status(500).json({
        error: err.message || "Failed to fetch DigitalOcean regions",
        details:
          "Check that your DigitalOcean API token is valid in /admin#providers",
      });
    }
  }
);

// Get DigitalOcean images
router.get(
  "/digitalocean/images",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const providerToken = await getProviderTokenByType("digitalocean");

      if (!providerToken) {
        return res.status(400).json({
          error: "DigitalOcean provider not found or not active",
          details: "Please configure DigitalOcean provider in /admin#providers",
        });
      }
 
      const type = req.query.type as "distribution" | "application" | undefined;
      const images = await digitalOceanService.getDigitalOceanImages(
        providerToken.token,
        type
      );
      res.json({ images });
    } catch (err: any) {
      console.error("Error fetching DigitalOcean images:", err);
      res.status(500).json({
        error: err.message || "Failed to fetch DigitalOcean images",
        details:
          "Check that your DigitalOcean API token is valid in /admin#providers",
      });
    }
  }
);

// StackScript Configs: List all configs
router.get(
  "/stackscripts/configs",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const result = await query(
        "SELECT * FROM vps_stackscript_configs ORDER BY display_order ASC, label ASC"
      );
      res.json({ configs: result.rows || [] });
    } catch (err: any) {
      console.error("Error fetching StackScript configs:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to fetch StackScript configs" });
    }
  }
);

// StackScript Configs: Update a config
router.put(
  "/stackscripts/configs/:id",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { label, description, is_enabled, display_order, metadata } =
        req.body;
      const now = new Date().toISOString();

      // Parse metadata if it's a string, otherwise use as-is (or default to empty object)
      let metadataValue = {};
      if (metadata !== undefined && metadata !== null) {
        metadataValue =
          typeof metadata === "string" ? JSON.parse(metadata) : metadata;
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
        return res.status(404).json({ error: "Config not found" });
      }
      res.json({ config: result.rows[0] });
    } catch (err: any) {
      console.error("Error updating StackScript config:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to update StackScript config" });
    }
  }
);

// StackScript Configs: Create or update a config
router.post(
  "/stackscripts/configs",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const {
        stackscript_id,
        label,
        description,
        is_enabled,
        display_order,
        metadata,
      } = req.body;
      const now = new Date().toISOString();

      // Parse metadata if it's a string, otherwise use as-is (or default to empty object)
      let metadataValue = {};
      if (metadata !== undefined && metadata !== null) {
        metadataValue =
          typeof metadata === "string" ? JSON.parse(metadata) : metadata;
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
        [
          stackscript_id,
          label,
          description,
          is_enabled,
          display_order,
          metadataValue,
          now,
        ]
      );
      res.status(201).json({ config: result.rows[0] });
    } catch (err: any) {
      console.error("Error upserting StackScript config:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to upsert StackScript config" });
    }
  }
);

// StackScript Configs: Delete a config
router.delete(
  "/stackscripts/configs/:id",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await query(
        "DELETE FROM vps_stackscript_configs WHERE stackscript_id = $1",
        [id]
      );
      res.status(204).send();
    } catch (err: any) {
      console.error("Error deleting StackScript config:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to delete StackScript config" });
    }
  }
);

// User Impersonation: Initiate impersonation
router.post(
  "/users/:id/impersonate",
  authenticateToken,
  requireAdmin,
  auditLogger("start_impersonation"),
  [
    param("id").isUUID().withMessage("Invalid user id"),
    body("confirmAdminImpersonation").optional().isBoolean(),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id: targetUserId } = req.params;
      const { confirmAdminImpersonation = false } = req.body;
      const adminUser = req.user!;

      // Note: Rate limiting for impersonation is now handled by the unified smart rate limiting middleware
      // Admin users have higher limits (1000 requests per 15 minutes) which should be sufficient for normal operations

      // Check if target user exists
      const targetUserResult = await query(
        "SELECT id, email, name, role FROM users WHERE id = $1",
        [targetUserId]
      );

      if (targetUserResult.rows.length === 0) {
        res.status(404).json({ error: "Target user not found" });
        return;
      }

      const targetUser = targetUserResult.rows[0];

      // Enhanced security validation
      const { validateImpersonationRequest } = await import(
        "../lib/security.js"
      );
      const securityValidation = validateImpersonationRequest(
        adminUser,
        targetUser,
        confirmAdminImpersonation
      );

      if (!securityValidation.isValid) {
        if (securityValidation.requiresConfirmation) {
          res.status(400).json({
            error: securityValidation.error,
            requiresConfirmation: true,
            targetUser: securityValidation.metadata?.targetUser,
          });
        } else {
          res.status(403).json({ error: securityValidation.error });
        }
        return;
      }

      // Get target user's organization (if any)
      let targetUserOrgId = null;
      try {
        const orgResult = await query(
          "SELECT organization_id FROM organization_members WHERE user_id = $1 LIMIT 1",
          [targetUserId]
        );
        if (orgResult.rows.length > 0) {
          targetUserOrgId = orgResult.rows[0].organization_id;
        } else {
          // Fallback: check if user owns an organization
          const ownerOrgResult = await query(
            "SELECT id FROM organizations WHERE owner_id = $1 LIMIT 1",
            [targetUserId]
          );
          if (ownerOrgResult.rows.length > 0) {
            targetUserOrgId = ownerOrgResult.rows[0].id;
          }
        }
      } catch (orgErr) {
        console.warn("Error fetching target user organization:", orgErr);
      }

      // Generate impersonation token with limited scope and expiration (1 hour)
      const impersonationPayload = {
        userId: targetUser.id,
        originalAdminId: adminUser.id,
        isImpersonating: true,
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour expiration
      };

      const impersonationToken = jwt.sign(
        impersonationPayload,
        config.JWT_SECRET
      );

      // Enhanced audit logging for impersonation
      const { generateAuditMetadata } = await import("../lib/security.js");
      const auditMetadata = generateAuditMetadata(
        req,
        "impersonation_start",
        targetUser,
        {
          admin_confirmation: confirmAdminImpersonation,
          target_user_role: targetUser.role,
          impersonation_token_expires: new Date(
            impersonationPayload.exp * 1000
          ).toISOString(),
        }
      );

      await logActivity(
        {
          userId: adminUser.id,
          organizationId: adminUser.organizationId ?? null,
          eventType: "impersonation_start",
          entityType: "user",
          entityId: targetUserId,
          message: `Admin ${adminUser.email} started impersonating user ${
            targetUser.email
          }${
            targetUser.role === "admin"
              ? " (admin-to-admin with confirmation)"
              : ""
          }`,
          status: "warning", // Changed to warning for security audit
          metadata: auditMetadata,
        },
        req
      );

      // Also log activity for the target user
      await logActivity(
        {
          userId: targetUserId,
          organizationId: targetUserOrgId,
          eventType: "impersonation_target",
          entityType: "user",
          entityId: adminUser.id,
          message: `Your account is being accessed by admin ${adminUser.email}`,
          status: "warning",
          metadata: {
            admin_user_id: adminUser.id,
            admin_user_email: adminUser.email,
            impersonation_started_at: new Date().toISOString(),
          },
        },
        req
      );

      res.json({
        impersonationToken,
        user: {
          id: targetUser.id,
          email: targetUser.email,
          name: targetUser.name,
          role: targetUser.role,
          organizationId: targetUserOrgId,
        },
        originalAdmin: {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.email,
        },
        expiresAt: new Date(impersonationPayload.exp * 1000).toISOString(),
      });
    } catch (err: any) {
      console.error("Admin impersonation initiation error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to initiate impersonation" });
    }
  }
);

// User Impersonation: Exit impersonation
router.post(
  "/impersonation/exit",
  authenticateToken,
  auditLogger("exit_impersonation"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;

      // Verify this is an impersonation session by checking the token
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];

      if (!token) {
        res.status(400).json({ error: "No token provided" });
        return;
      }

      let decoded: any;
      try {
        decoded = jwt.verify(token, config.JWT_SECRET);
      } catch {
        res.status(400).json({ error: "Invalid token" });
        return;
      }

      // Check if this is actually an impersonation token
      if (!decoded.isImpersonating || !decoded.originalAdminId) {
        res.status(400).json({ error: "Not an impersonation session" });
        return;
      }

      // Get original admin user details
      const adminResult = await query(
        "SELECT id, email, name, role FROM users WHERE id = $1",
        [decoded.originalAdminId]
      );

      if (adminResult.rows.length === 0) {
        res.status(400).json({ error: "Original admin user not found" });
        return;
      }

      const originalAdmin = adminResult.rows[0];

      // Get admin's organization
      let adminOrgId = null;
      try {
        const orgResult = await query(
          "SELECT organization_id FROM organization_members WHERE user_id = $1 LIMIT 1",
          [originalAdmin.id]
        );
        if (orgResult.rows.length > 0) {
          adminOrgId = orgResult.rows[0].organization_id;
        } else {
          // Fallback: check if admin owns an organization
          const ownerOrgResult = await query(
            "SELECT id FROM organizations WHERE owner_id = $1 LIMIT 1",
            [originalAdmin.id]
          );
          if (ownerOrgResult.rows.length > 0) {
            adminOrgId = ownerOrgResult.rows[0].id;
          }
        }
      } catch (orgErr) {
        console.warn("Error fetching admin organization:", orgErr);
      }

      // Generate new admin token (standard session)
      const adminTokenPayload = {
        userId: originalAdmin.id,
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
      };

      const adminToken = jwt.sign(adminTokenPayload, config.JWT_SECRET);

      // Enhanced audit logging for impersonation exit
      const impersonationDuration =
        Math.floor(Date.now() / 1000) - (decoded.iat || 0);
      const { generateAuditMetadata } = await import("../lib/security.js");
      const auditMetadata = generateAuditMetadata(
        req,
        "impersonation_end",
        user,
        {
          impersonation_duration_seconds: impersonationDuration,
          impersonation_duration_human: `${Math.floor(
            impersonationDuration / 60
          )} minutes`,
          original_admin_restored: true,
        }
      );

      await logActivity(
        {
          userId: originalAdmin.id,
          organizationId: adminOrgId,
          eventType: "impersonation_end",
          entityType: "user",
          entityId: user.id,
          message: `Admin ${originalAdmin.email} ended impersonation of user ${
            user.email
          } (duration: ${Math.floor(impersonationDuration / 60)} minutes)`,
          status: "info",
          metadata: auditMetadata,
        },
        req
      );

      // Also log for the impersonated user
      await logActivity(
        {
          userId: user.id,
          organizationId: user.organizationId ?? null,
          eventType: "impersonation_ended",
          entityType: "user",
          entityId: originalAdmin.id,
          message: `Admin access to your account by ${originalAdmin.email} has ended`,
          status: "info",
          metadata: {
            admin_user_id: originalAdmin.id,
            admin_user_email: originalAdmin.email,
            impersonation_ended_at: new Date().toISOString(),
          },
        },
        req
      );

      res.json({
        adminToken,
        admin: {
          id: originalAdmin.id,
          email: originalAdmin.email,
          name: originalAdmin.name,
          role: originalAdmin.role,
          organizationId: adminOrgId,
        },
        message: "Impersonation session ended successfully",
      });
    } catch (err: any) {
      console.error("Admin impersonation exit error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to exit impersonation" });
    }
  }
);

export default router;
