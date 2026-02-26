import { type RouteContext } from "./types";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import { insertSavedReplySchema } from "@shared/schema";
import { z } from "zod";
import { zodErrorResponse } from "../middleware/errors";

async function resolveOrgId(user: any): Promise<string | null> {
  if (user?.organizationId) return user.organizationId;
  if (user?.isPlatformAdmin || user?.role === 'admin') {
    const orgs = await storage.getAllOrganizations();
    return orgs[0]?.id ?? null;
  }
  return null;
}

export function registerSavedRepliesRoutes({ app }: RouteContext) {
  // List saved replies with optional category filter and search
  app.get("/api/saved-replies", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const organizationId = await resolveOrgId(user);
      if (!organizationId) {
        return res.status(403).json({ error: "No organization associated with user" });
      }

      const { category, q } = req.query;
      const replies = await storage.getSavedReplies(organizationId, {
        category: category as string,
        search: q as string,
        userId: user?.id
      });
      
      res.json(replies);
    } catch (error) {
      console.error("Error fetching saved replies:", error);
      res.status(500).json({ error: "Failed to fetch saved replies" });
    }
  });

  // Create a new saved reply
  app.post("/api/saved-replies", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const organizationId = await resolveOrgId(user);
      if (!organizationId) {
        return res.status(403).json({ error: "No organization associated with user" });
      }

      const validatedData = insertSavedReplySchema.parse(req.body);

      const reply = await storage.createSavedReply({
        ...validatedData,
        organizationId,
        createdById: user?.id
      } as any);
      res.status(201).json(reply);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(zodErrorResponse(error));
      }
      console.error("Error creating saved reply:", error);
      res.status(500).json({ error: "Failed to create saved reply" });
    }
  });

  // Update a saved reply
  app.patch("/api/saved-replies/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { id } = req.params;
      const organizationId = user?.organizationId;
      
      const existing = await storage.getSavedReply(id);
      if (!existing) {
        return res.status(404).json({ error: "Saved reply not found" });
      }

      if (existing.organizationId !== organizationId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Only author or admin can update
      if (existing.createdById !== user?.id && user?.role !== "admin") {
        return res.status(403).json({ error: "Only the author or an admin can update this reply" });
      }

      const validatedData = insertSavedReplySchema.partial().parse(req.body);
      const updated = await storage.updateSavedReply(id, validatedData);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(zodErrorResponse(error));
      }
      console.error("Error updating saved reply:", error);
      res.status(500).json({ error: "Failed to update saved reply" });
    }
  });

  // Delete a saved reply
  app.delete("/api/saved-replies/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { id } = req.params;
      const organizationId = user?.organizationId;
      
      const existing = await storage.getSavedReply(id);
      if (!existing) {
        return res.status(404).json({ error: "Saved reply not found" });
      }

      if (existing.organizationId !== organizationId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Only author or admin can delete
      if (existing.createdById !== user?.id && user?.role !== "admin") {
        return res.status(403).json({ error: "Only the author or an admin can delete this reply" });
      }

      await storage.deleteSavedReply(id);
      res.json({ message: "Saved reply deleted" });
    } catch (error) {
      console.error("Error deleting saved reply:", error);
      res.status(500).json({ error: "Failed to delete saved reply" });
    }
  });

  // Increment usage count
  app.post("/api/saved-replies/:id/use", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { id } = req.params;
      const organizationId = user?.organizationId;
      
      const existing = await storage.getSavedReply(id);
      if (!existing || existing.organizationId !== organizationId) {
        return res.status(404).json({ error: "Saved reply not found" });
      }

      await storage.incrementSavedReplyUsage(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error incrementing usage count:", error);
      res.status(500).json({ error: "Failed to update usage count" });
    }
  });
}
