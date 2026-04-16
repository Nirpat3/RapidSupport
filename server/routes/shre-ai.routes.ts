import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { shreAiConfigs } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { callShreAI, buildShreMessages } from "../services/shre-ai.service";
import { storage } from "../storage";

export const shreAiRouter = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
  next();
}

function requireAdmin(req: any, res: any, next: any) {
  const user = req.user as any;
  if (user?.role !== "admin" && user?.role !== "platform_admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

const configSchema = z.object({
  endpoint: z.string().url("Must be a valid URL").or(z.string().max(0)),
  apiKey: z.string().max(500),
  systemPrompt: z.string().max(4000).optional(),
  isEnabled: z.boolean().optional(),
  autoReplyOnNew: z.boolean().optional(),
  handoffKeywords: z.string().max(500).optional(),
});

// GET /api/shre-ai/config — get current org's config
shreAiRouter.get("/config", requireAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const orgId = user.organizationId || (req.session as any)?.selectedOrganizationId;
    if (!orgId) {
      // Return a default empty config if no org context
      return res.json({
        endpoint: "",
        apiKey: "",
        systemPrompt: null,
        isEnabled: false,
        autoReplyOnNew: false,
        handoffKeywords: "human,agent,speak to someone,real person",
        totalReplies: 0,
        totalHandoffs: 0,
      });
    }

    const [config] = await db
      .select()
      .from(shreAiConfigs)
      .where(eq(shreAiConfigs.organizationId, orgId))
      .limit(1);

    if (!config) {
      return res.json({
        endpoint: "",
        apiKey: "",
        systemPrompt: null,
        isEnabled: false,
        autoReplyOnNew: false,
        handoffKeywords: "human,agent,speak to someone,real person",
        totalReplies: 0,
        totalHandoffs: 0,
      });
    }

    // Mask API key in response
    res.json({
      ...config,
      apiKey: config.apiKey ? "***" + config.apiKey.slice(-4) : "",
    });
  } catch (error) {
    console.error("Shre AI get config error:", error);
    res.status(500).json({ error: "Failed to get configuration" });
  }
});

// POST /api/shre-ai/config — save or update config
shreAiRouter.post("/config", requireAuth, requireAdmin, async (req, res) => {
  try {
    const user = req.user as any;
    const orgId = user.organizationId || (req.session as any)?.selectedOrganizationId;
    if (!orgId) return res.status(400).json({ error: "No organization" });

    const body = configSchema.parse(req.body);

    const [existing] = await db
      .select()
      .from(shreAiConfigs)
      .where(eq(shreAiConfigs.organizationId, orgId))
      .limit(1);

    const apiKey = body.apiKey?.startsWith("***")
      ? existing?.apiKey || ""  // keep existing if masked
      : body.apiKey || existing?.apiKey || "";

    if (existing) {
      const [updated] = await db
        .update(shreAiConfigs)
        .set({
          endpoint: body.endpoint || existing.endpoint,
          apiKey,
          systemPrompt: body.systemPrompt ?? existing.systemPrompt,
          isEnabled: body.isEnabled ?? existing.isEnabled,
          autoReplyOnNew: body.autoReplyOnNew ?? existing.autoReplyOnNew,
          handoffKeywords: body.handoffKeywords ?? existing.handoffKeywords,
          updatedAt: new Date(),
        })
        .where(eq(shreAiConfigs.organizationId, orgId))
        .returning();
      return res.json({ success: true, config: { ...updated, apiKey: "***" + apiKey.slice(-4) } });
    } else {
      const [created] = await db
        .insert(shreAiConfigs)
        .values({
          organizationId: orgId,
          endpoint: body.endpoint || "",
          apiKey,
          systemPrompt: body.systemPrompt,
          isEnabled: body.isEnabled ?? false,
          autoReplyOnNew: body.autoReplyOnNew ?? false,
          handoffKeywords: body.handoffKeywords ?? "human,agent,speak to someone,real person",
        })
        .returning();
      return res.json({ success: true, config: { ...created, apiKey: "***" + apiKey.slice(-4) } });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0]?.message || "Validation error" });
    }
    console.error("Shre AI save config error:", error);
    res.status(500).json({ error: "Failed to save configuration" });
  }
});

// POST /api/shre-ai/test — test connection
shreAiRouter.post("/test", requireAuth, requireAdmin, async (req, res) => {
  try {
    const user = req.user as any;
    const orgId = user.organizationId || (req.session as any)?.selectedOrganizationId;
    const { message } = z.object({ message: z.string().min(1).max(500) }).parse(req.body);

    const [config] = await db
      .select()
      .from(shreAiConfigs)
      .where(eq(shreAiConfigs.organizationId, orgId))
      .limit(1);

    if (!config?.endpoint || !config?.apiKey) {
      return res.json({ success: false, error: "Please save your API endpoint and key first" });
    }

    const response = await callShreAI(
      { apiKey: config.apiKey, endpoint: config.endpoint, systemPrompt: config.systemPrompt || "" },
      [{ role: "user", content: message }],
      { conversationId: "test" }
    );

    res.json({ success: true, reply: response.reply });
  } catch (error: any) {
    res.json({ success: false, error: error.message || "Connection failed" });
  }
});

// GET /api/shre-ai/stats
shreAiRouter.get("/stats", requireAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const orgId = user.organizationId || (req.session as any)?.selectedOrganizationId;

    const [config] = await db
      .select()
      .from(shreAiConfigs)
      .where(eq(shreAiConfigs.organizationId, orgId))
      .limit(1);

    res.json({
      totalReplies: config?.totalReplies || 0,
      handoffs: config?.totalHandoffs || 0,
      avgResponseMs: 0,
      last24h: 0,
    });
  } catch {
    res.json({ totalReplies: 0, handoffs: 0, avgResponseMs: 0, last24h: 0 });
  }
});

// POST /api/shre-ai/reply — internal use: send a message to Shre AI and get a reply
shreAiRouter.post("/reply", requireAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const orgId = user.organizationId;
    const { conversationId } = z.object({ conversationId: z.string() }).parse(req.body);

    const [config] = await db
      .select()
      .from(shreAiConfigs)
      .where(eq(shreAiConfigs.organizationId, orgId))
      .limit(1);

    if (!config?.isEnabled || !config?.endpoint || !config?.apiKey) {
      return res.status(400).json({ error: "Shre AI is not configured or disabled" });
    }

    const messages = await storage.getMessagesByConversation(conversationId);
    const conversation = await storage.getConversation(conversationId);

    const shreMessages = buildShreMessages(
      messages.map(m => ({ senderType: m.senderType, content: m.content })),
      config.systemPrompt || ""
    );

    if (shreMessages.filter(m => m.role !== "system").length === 0) {
      return res.status(400).json({ error: "No messages to process" });
    }

    const startTime = Date.now();
    const response = await callShreAI(
      { apiKey: config.apiKey, endpoint: config.endpoint, systemPrompt: config.systemPrompt || "" },
      shreMessages,
      {
        conversationId,
        customerName: conversation?.customer?.name,
      }
    );
    const elapsed = Date.now() - startTime;

    // Check if handoff is needed
    const handoffKeywords = (config.handoffKeywords || "").split(",").map(k => k.trim().toLowerCase());
    const needsHandoff =
      response.handoffRequired ||
      handoffKeywords.some(kw => kw && response.reply.toLowerCase().includes(kw));

    // Increment reply counter
    await db
      .update(shreAiConfigs)
      .set({
        totalReplies: (config.totalReplies || 0) + 1,
        totalHandoffs: needsHandoff ? (config.totalHandoffs || 0) + 1 : (config.totalHandoffs || 0),
        updatedAt: new Date(),
      })
      .where(eq(shreAiConfigs.organizationId, orgId));

    res.json({ reply: response.reply, handoffRequired: needsHandoff, elapsedMs: elapsed });
  } catch (error: any) {
    console.error("Shre AI reply error:", error);
    res.status(500).json({ error: error.message || "Failed to get Shre AI reply" });
  }
});
