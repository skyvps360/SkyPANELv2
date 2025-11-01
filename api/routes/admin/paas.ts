import express from "express";
import { body, param, validationResult } from "express-validator";

import { authenticateToken, requireAdmin } from "../../middleware/auth.js";
import type { AuthenticatedRequest } from "../../middleware/auth.js";
import { paasService } from "../../services/paasService.js";

const router = express.Router();

const handleValidation = (req: AuthenticatedRequest, res: express.Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return false;
  }
  return true;
};

router.get(
  "/overview",
  authenticateToken,
  requireAdmin,
  async (_req: AuthenticatedRequest, res) => {
    try {
      const overview = await paasService.getOverview();
      res.json({ success: true, overview });
    } catch (error) {
      console.error("Failed to fetch PaaS overview", error);
      res.status(500).json({ success: false, error: "Failed to load PaaS overview" });
    }
  },
);

router.post(
  "/clusters",
  authenticateToken,
  requireAdmin,
  [
    body("name").isString().notEmpty(),
    body("slug").isString().isLength({ min: 3 }),
    body("region").isString().notEmpty(),
    body("orchestrator").isString().notEmpty(),
  ],
  async (req: AuthenticatedRequest, res) => {
    if (!handleValidation(req, res)) return;
    try {
      const cluster = await paasService.createCluster(req.body);
      res.status(201).json({ success: true, cluster });
    } catch (error) {
      console.error("Failed to create cluster", error);
      res.status(500).json({ success: false, error: "Failed to create cluster" });
    }
  },
);

router.put(
  "/clusters/:id",
  authenticateToken,
  requireAdmin,
  [param("id").isUUID()],
  async (req: AuthenticatedRequest, res) => {
    if (!handleValidation(req, res)) return;
    try {
      const cluster = await paasService.updateCluster(req.params.id, req.body);
      res.json({ success: true, cluster });
    } catch (error) {
      console.error("Failed to update cluster", error);
      res.status(500).json({ success: false, error: "Failed to update cluster" });
    }
  },
);

router.delete(
  "/clusters/:id",
  authenticateToken,
  requireAdmin,
  [param("id").isUUID()],
  async (req: AuthenticatedRequest, res) => {
    if (!handleValidation(req, res)) return;
    try {
      await paasService.deleteCluster(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete cluster", error);
      res.status(500).json({ success: false, error: "Failed to delete cluster" });
    }
  },
);

router.post(
  "/nodes",
  authenticateToken,
  requireAdmin,
  [
    body("clusterId").isUUID(),
    body("name").isString().notEmpty(),
    body("cpuTotal").isInt({ min: 1 }),
    body("memoryTotalMb").isInt({ min: 128 }),
    body("storageTotalGb").isInt({ min: 1 }),
  ],
  async (req: AuthenticatedRequest, res) => {
    if (!handleValidation(req, res)) return;
    try {
      const node = await paasService.createNode(req.body);
      res.status(201).json({ success: true, node });
    } catch (error) {
      console.error("Failed to create node", error);
      res.status(500).json({ success: false, error: "Failed to create node" });
    }
  },
);

router.put(
  "/nodes/:id",
  authenticateToken,
  requireAdmin,
  [param("id").isUUID()],
  async (req: AuthenticatedRequest, res) => {
    if (!handleValidation(req, res)) return;
    try {
      const node = await paasService.updateNode(req.params.id, req.body);
      res.json({ success: true, node });
    } catch (error) {
      console.error("Failed to update node", error);
      res.status(500).json({ success: false, error: "Failed to update node" });
    }
  },
);

router.delete(
  "/nodes/:id",
  authenticateToken,
  requireAdmin,
  [param("id").isUUID()],
  async (req: AuthenticatedRequest, res) => {
    if (!handleValidation(req, res)) return;
    try {
      await paasService.deleteNode(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete node", error);
      res.status(500).json({ success: false, error: "Failed to delete node" });
    }
  },
);

router.post(
  "/plans",
  authenticateToken,
  requireAdmin,
  [
    body("name").isString().notEmpty(),
    body("slug").isString().notEmpty(),
    body("cpuMillicores").isInt({ min: 100 }),
    body("memoryMb").isInt({ min: 128 }),
    body("storageGb").isInt({ min: 1 }),
    body("priceHourly").isFloat({ min: 0 }),
    body("priceMonthly").isFloat({ min: 0 }),
  ],
  async (req: AuthenticatedRequest, res) => {
    if (!handleValidation(req, res)) return;
    try {
      const plan = await paasService.createPlan(req.body);
      res.status(201).json({ success: true, plan });
    } catch (error) {
      console.error("Failed to create plan", error);
      res.status(500).json({ success: false, error: "Failed to create plan" });
    }
  },
);

router.put(
  "/plans/:id",
  authenticateToken,
  requireAdmin,
  [param("id").isUUID()],
  async (req: AuthenticatedRequest, res) => {
    if (!handleValidation(req, res)) return;
    try {
      const plan = await paasService.updatePlan(req.params.id, req.body);
      res.json({ success: true, plan });
    } catch (error) {
      console.error("Failed to update plan", error);
      res.status(500).json({ success: false, error: "Failed to update plan" });
    }
  },
);

router.delete(
  "/plans/:id",
  authenticateToken,
  requireAdmin,
  [param("id").isUUID()],
  async (req: AuthenticatedRequest, res) => {
    if (!handleValidation(req, res)) return;
    try {
      await paasService.deletePlan(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete plan", error);
      res.status(500).json({ success: false, error: "Failed to delete plan" });
    }
  },
);

router.post(
  "/templates",
  authenticateToken,
  requireAdmin,
  [
    body("name").isString().notEmpty(),
    body("slug").isString().notEmpty(),
  ],
  async (req: AuthenticatedRequest, res) => {
    if (!handleValidation(req, res)) return;
    try {
      const template = await paasService.createTemplate(req.body);
      res.status(201).json({ success: true, template });
    } catch (error) {
      console.error("Failed to create template", error);
      res.status(500).json({ success: false, error: "Failed to create template" });
    }
  },
);

router.put(
  "/templates/:id",
  authenticateToken,
  requireAdmin,
  [param("id").isUUID()],
  async (req: AuthenticatedRequest, res) => {
    if (!handleValidation(req, res)) return;
    try {
      const template = await paasService.updateTemplate(req.params.id, req.body);
      res.json({ success: true, template });
    } catch (error) {
      console.error("Failed to update template", error);
      res.status(500).json({ success: false, error: "Failed to update template" });
    }
  },
);

router.delete(
  "/templates/:id",
  authenticateToken,
  requireAdmin,
  [param("id").isUUID()],
  async (req: AuthenticatedRequest, res) => {
    if (!handleValidation(req, res)) return;
    try {
      await paasService.deleteTemplate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete template", error);
      res.status(500).json({ success: false, error: "Failed to delete template" });
    }
  },
);

router.post(
  "/templates/:id/regions",
  authenticateToken,
  requireAdmin,
  [param("id").isUUID(), body("regions").isArray()],
  async (req: AuthenticatedRequest, res) => {
    if (!handleValidation(req, res)) return;
    try {
      const regions = Array.isArray(req.body.regions) ? req.body.regions : [];
      await paasService.setTemplateRegions(req.params.id, regions);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to update template regions", error);
      res.status(500).json({ success: false, error: "Failed to update template regions" });
    }
  },
);

router.post(
  "/registries",
  authenticateToken,
  requireAdmin,
  [body("name").isString().notEmpty(), body("endpoint").isString().notEmpty()],
  async (req: AuthenticatedRequest, res) => {
    if (!handleValidation(req, res)) return;
    try {
      const registry = await paasService.createRegistry(req.body);
      res.status(201).json({ success: true, registry });
    } catch (error) {
      console.error("Failed to create registry", error);
      res.status(500).json({ success: false, error: "Failed to create registry" });
    }
  },
);

router.put(
  "/registries/:id",
  authenticateToken,
  requireAdmin,
  [param("id").isUUID()],
  async (req: AuthenticatedRequest, res) => {
    if (!handleValidation(req, res)) return;
    try {
      const registry = await paasService.updateRegistry(req.params.id, req.body);
      res.json({ success: true, registry });
    } catch (error) {
      console.error("Failed to update registry", error);
      res.status(500).json({ success: false, error: "Failed to update registry" });
    }
  },
);

router.delete(
  "/registries/:id",
  authenticateToken,
  requireAdmin,
  [param("id").isUUID()],
  async (req: AuthenticatedRequest, res) => {
    if (!handleValidation(req, res)) return;
    try {
      await paasService.deleteRegistry(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete registry", error);
      res.status(500).json({ success: false, error: "Failed to delete registry" });
    }
  },
);

router.post(
  "/storage",
  authenticateToken,
  requireAdmin,
  [body("name").isString().notEmpty(), body("provider").isString().notEmpty()],
  async (req: AuthenticatedRequest, res) => {
    if (!handleValidation(req, res)) return;
    try {
      const target = await paasService.createStorageTarget(req.body);
      res.status(201).json({ success: true, storage: target });
    } catch (error) {
      console.error("Failed to create storage target", error);
      res.status(500).json({ success: false, error: "Failed to create storage target" });
    }
  },
);

router.put(
  "/storage/:id",
  authenticateToken,
  requireAdmin,
  [param("id").isUUID()],
  async (req: AuthenticatedRequest, res) => {
    if (!handleValidation(req, res)) return;
    try {
      const target = await paasService.updateStorageTarget(req.params.id, req.body);
      res.json({ success: true, storage: target });
    } catch (error) {
      console.error("Failed to update storage target", error);
      res.status(500).json({ success: false, error: "Failed to update storage target" });
    }
  },
);

router.delete(
  "/storage/:id",
  authenticateToken,
  requireAdmin,
  [param("id").isUUID()],
  async (req: AuthenticatedRequest, res) => {
    if (!handleValidation(req, res)) return;
    try {
      await paasService.deleteStorageTarget(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete storage target", error);
      res.status(500).json({ success: false, error: "Failed to delete storage target" });
    }
  },
);

router.post(
  "/traefik",
  authenticateToken,
  requireAdmin,
  [body("clusterId").isUUID()],
  async (req: AuthenticatedRequest, res) => {
    if (!handleValidation(req, res)) return;
    try {
      const config = await paasService.upsertTraefikConfig(req.body);
      res.json({ success: true, config });
    } catch (error) {
      console.error("Failed to update Traefik configuration", error);
      res.status(500).json({ success: false, error: "Failed to update Traefik configuration" });
    }
  },
);

router.post(
  "/domains",
  authenticateToken,
  requireAdmin,
  [body("clusterId").isUUID(), body("domain").isString().notEmpty()],
  async (req: AuthenticatedRequest, res) => {
    if (!handleValidation(req, res)) return;
    try {
      const domain = await paasService.createDomain(req.body);
      res.status(201).json({ success: true, domain });
    } catch (error) {
      console.error("Failed to create domain", error);
      res.status(500).json({ success: false, error: "Failed to create domain" });
    }
  },
);

router.put(
  "/domains/:id",
  authenticateToken,
  requireAdmin,
  [param("id").isUUID()],
  async (req: AuthenticatedRequest, res) => {
    if (!handleValidation(req, res)) return;
    try {
      const domain = await paasService.updateDomain(req.params.id, req.body);
      res.json({ success: true, domain });
    } catch (error) {
      console.error("Failed to update domain", error);
      res.status(500).json({ success: false, error: "Failed to update domain" });
    }
  },
);

router.delete(
  "/domains/:id",
  authenticateToken,
  requireAdmin,
  [param("id").isUUID()],
  async (req: AuthenticatedRequest, res) => {
    if (!handleValidation(req, res)) return;
    try {
      await paasService.deleteDomain(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete domain", error);
      res.status(500).json({ success: false, error: "Failed to delete domain" });
    }
  },
);

router.post(
  "/ports",
  authenticateToken,
  requireAdmin,
  [
    body("clusterId").isUUID(),
    body("rangeStart").isInt({ min: 1 }),
    body("rangeEnd").isInt({ min: 1 }),
  ],
  async (req: AuthenticatedRequest, res) => {
    if (!handleValidation(req, res)) return;
    try {
      const portPool = await paasService.createPortPool(req.body);
      res.status(201).json({ success: true, portPool });
    } catch (error) {
      console.error("Failed to create port pool", error);
      res.status(500).json({ success: false, error: "Failed to create port pool" });
    }
  },
);

router.put(
  "/ports/:id",
  authenticateToken,
  requireAdmin,
  [param("id").isUUID()],
  async (req: AuthenticatedRequest, res) => {
    if (!handleValidation(req, res)) return;
    try {
      const portPool = await paasService.updatePortPool(req.params.id, req.body);
      res.json({ success: true, portPool });
    } catch (error) {
      console.error("Failed to update port pool", error);
      res.status(500).json({ success: false, error: "Failed to update port pool" });
    }
  },
);

router.delete(
  "/ports/:id",
  authenticateToken,
  requireAdmin,
  [param("id").isUUID()],
  async (req: AuthenticatedRequest, res) => {
    if (!handleValidation(req, res)) return;
    try {
      await paasService.deletePortPool(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete port pool", error);
      res.status(500).json({ success: false, error: "Failed to delete port pool" });
    }
  },
);

router.post(
  "/images",
  authenticateToken,
  requireAdmin,
  [body("name").isString().notEmpty(), body("tag").isString().notEmpty()],
  async (req: AuthenticatedRequest, res) => {
    if (!handleValidation(req, res)) return;
    try {
      const image = await paasService.createImage(req.body);
      res.status(201).json({ success: true, image });
    } catch (error) {
      console.error("Failed to create image", error);
      res.status(500).json({ success: false, error: "Failed to create image" });
    }
  },
);

router.put(
  "/images/:id",
  authenticateToken,
  requireAdmin,
  [param("id").isUUID()],
  async (req: AuthenticatedRequest, res) => {
    if (!handleValidation(req, res)) return;
    try {
      const image = await paasService.updateImage(req.params.id, req.body);
      res.json({ success: true, image });
    } catch (error) {
      console.error("Failed to update image", error);
      res.status(500).json({ success: false, error: "Failed to update image" });
    }
  },
);

router.delete(
  "/images/:id",
  authenticateToken,
  requireAdmin,
  [param("id").isUUID()],
  async (req: AuthenticatedRequest, res) => {
    if (!handleValidation(req, res)) return;
    try {
      await paasService.deleteImage(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete image", error);
      res.status(500).json({ success: false, error: "Failed to delete image" });
    }
  },
);

export default router;
