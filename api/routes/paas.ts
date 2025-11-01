import express from "express";
import { body, validationResult } from "express-validator";

import { authenticateToken } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { paasService } from "../services/paasService.js";

const router = express.Router();

const ensureValid = (req: AuthenticatedRequest, res: express.Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return false;
  }
  return true;
};

router.get("/catalog", authenticateToken, async (_req: AuthenticatedRequest, res) => {
  try {
    const catalog = await paasService.listCatalog();
    res.json({ success: true, catalog });
  } catch (error) {
    console.error("Failed to fetch PaaS catalog", error);
    res.status(500).json({ success: false, error: "Failed to load PaaS catalog" });
  }
});

router.get("/deployments", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.json({ success: true, deployments: [] });
    }
    const deployments = await paasService.listDeployments(req.user.organizationId);
    res.json({ success: true, deployments });
  } catch (error) {
    console.error("Failed to list deployments", error);
    res.status(500).json({ success: false, error: "Failed to list deployments" });
  }
});

router.post(
  "/deployments",
  authenticateToken,
  [
    body("templateId").isUUID(),
    body("planId").isUUID(),
    body("clusterId").isUUID(),
    body("name").isString().notEmpty(),
  ],
  async (req: AuthenticatedRequest, res) => {
    if (!ensureValid(req, res)) return;
    try {
      if (!req.user?.id || !req.user.organizationId) {
        return res.status(403).json({ success: false, error: "Missing organization context" });
      }
      const deployment = await paasService.createDeployment({
        organizationId: req.user.organizationId,
        userId: req.user.id,
        templateId: req.body.templateId,
        planId: req.body.planId,
        clusterId: req.body.clusterId,
        name: req.body.name,
        endpoint: req.body.endpoint ?? null,
        metadata: req.body.metadata ?? {},
      });
      if (!deployment) {
        return res.status(400).json({ success: false, error: "Selected plan is not available" });
      }
      res.status(201).json({ success: true, deployment });
    } catch (error) {
      console.error("Failed to create deployment", error);
      res.status(500).json({ success: false, error: "Failed to create deployment" });
    }
  },
);

export default router;
