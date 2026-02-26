import { storage } from "../storage";
import { requireAuth, requireRole } from "../auth";
import { insertSlaPolicySchema } from "@shared/schema";
import { zodErrorResponse } from "../middleware/errors";
import { z } from "zod";
import type { RouteContext } from "./types";

export function registerSlaRoutes({ app }: RouteContext) {
  // GET /api/sla-policies — list org's SLA policies
  app.get("/api/sla-policies", requireAuth, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(400).json({ error: "Organization ID not found" });
      }
      const policies = await storage.getSlaPolicies(organizationId);
      res.json(policies);
    } catch (error) {
      console.error("[SLA Routes] Error fetching policies:", error);
      res.status(500).json({ error: "Failed to fetch SLA policies" });
    }
  });

  // POST /api/sla-policies — create policy
  app.post("/api/sla-policies", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(400).json({ error: "Organization ID not found" });
      }
      
      const parsed = insertSlaPolicySchema.safeParse({
        ...req.body,
        organizationId
      });

      if (!parsed.success) {
        return res.status(400).json(zodErrorResponse(parsed.error));
      }

      const policy = await storage.createSlaPolicy(parsed.data);
      res.status(201).json(policy);
    } catch (error) {
      console.error("[SLA Routes] Error creating policy:", error);
      res.status(500).json({ error: "Failed to create SLA policy" });
    }
  });

  // PATCH /api/sla-policies/:id — update policy
  app.patch("/api/sla-policies/:id", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const organizationId = req.user?.organizationId;
      
      const policy = await storage.getSlaPolicy(id);
      if (!policy || policy.organizationId !== organizationId) {
        return res.status(404).json({ error: "SLA policy not found" });
      }

      const updates = insertSlaPolicySchema.partial().parse(req.body);
      const updatedPolicy = await storage.updateSlaPolicy(id, updates);
      res.json(updatedPolicy);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(zodErrorResponse(error));
      }
      console.error("[SLA Routes] Error updating policy:", error);
      res.status(500).json({ error: "Failed to update SLA policy" });
    }
  });

  // DELETE /api/sla-policies/:id — delete policy
  app.delete("/api/sla-policies/:id", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const organizationId = req.user?.organizationId;
      
      const policy = await storage.getSlaPolicy(id);
      if (!policy || policy.organizationId !== organizationId) {
        return res.status(404).json({ error: "SLA policy not found" });
      }

      await storage.deleteSlaPolicy(id);
      res.json({ message: "SLA policy deleted successfully" });
    } catch (error) {
      console.error("[SLA Routes] Error deleting policy:", error);
      res.status(500).json({ error: "Failed to delete SLA policy" });
    }
  });

  // GET /api/admin/sla/overview — stats
  app.get("/api/admin/sla/overview", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(400).json({ error: "Organization ID not found" });
      }
      const stats = await storage.getSlaOverview(organizationId);
      res.json(stats);
    } catch (error) {
      console.error("[SLA Routes] Error fetching overview:", error);
      res.status(500).json({ error: "Failed to fetch SLA overview" });
    }
  });
}
