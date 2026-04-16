import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { organizations, customers, resellerAssignments, conversations, users, activityLogs } from '@shared/schema';
import { eq, and, desc, ilike, or, isNull, sql, count } from 'drizzle-orm';
import { requireAuth } from '../auth';

function requireAdmin(req: any, res: any, next: any) {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  if (user.role !== 'admin' && !user.isPlatformAdmin) return res.status(403).json({ error: 'Admin access required' });
  next();
}

export const resellerRouter = Router();

// ── List all reseller organizations ──────────────────────────────────────────
resellerRouter.get('/', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const orgId = user.organizationId || (req.session as any)?.selectedOrganizationId;

    const resellers = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        logo: organizations.logo,
        status: organizations.status,
        resellerTier: organizations.resellerTier,
        resellerSupportEmail: organizations.resellerSupportEmail,
        parentOrganizationId: organizations.parentOrganizationId,
        createdAt: organizations.createdAt,
      })
      .from(organizations)
      .where(and(
        eq(organizations.isReseller, true),
        eq(organizations.parentOrganizationId, orgId),
        isNull(organizations.deletedAt)
      ))
      .orderBy(desc(organizations.createdAt));

    res.json(resellers);
  } catch (error) {
    console.error('[Resellers] Error fetching resellers:', error);
    res.status(500).json({ error: 'Failed to fetch resellers' });
  }
});

// ── Get single reseller ───────────────────────────────────────────────────────
resellerRouter.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const [reseller] = await db
      .select()
      .from(organizations)
      .where(and(eq(organizations.id, id), eq(organizations.isReseller, true), isNull(organizations.deletedAt)));

    if (!reseller) return res.status(404).json({ error: 'Reseller not found' });
    res.json(reseller);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reseller' });
  }
});

// ── Create a new reseller organization ───────────────────────────────────────
resellerRouter.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const orgId = user.organizationId || (req.session as any)?.selectedOrganizationId;

    const schema = z.object({
      name: z.string().min(2).max(100),
      slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
      resellerSupportEmail: z.string().email().optional(),
      resellerTier: z.number().int().min(1).max(5).default(1),
      primaryColor: z.string().optional(),
      website: z.string().optional(),
    });

    const body = schema.parse(req.body);

    // Check slug uniqueness
    const existing = await db.select({ id: organizations.id }).from(organizations)
      .where(eq(organizations.slug, body.slug));
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Slug already in use' });
    }

    const [newReseller] = await db.insert(organizations).values({
      name: body.name,
      slug: body.slug,
      isReseller: true,
      resellerTier: body.resellerTier,
      resellerSupportEmail: body.resellerSupportEmail || null,
      parentOrganizationId: orgId,
      primaryColor: body.primaryColor || '#6366f1',
      website: body.website || null,
      status: 'active',
    }).returning();

    // Audit log
    await db.insert(activityLogs).values({
      organizationId: orgId,
      userId: user.id,
      action: 'create',
      entityType: 'reseller',
      entityId: newReseller.id,
      description: `Created reseller organization: ${newReseller.name}`,
    }).catch(() => {});

    res.status(201).json(newReseller);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.message });
    res.status(500).json({ error: 'Failed to create reseller' });
  }
});

// ── Update reseller ───────────────────────────────────────────────────────────
resellerRouter.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      name: z.string().min(2).max(100).optional(),
      resellerSupportEmail: z.string().email().nullable().optional(),
      resellerTier: z.number().int().min(1).max(5).optional(),
      status: z.enum(['active', 'suspended']).optional(),
    });
    const body = schema.parse(req.body);

    const [updated] = await db.update(organizations)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(organizations.id, id), eq(organizations.isReseller, true)))
      .returning();

    if (!updated) return res.status(404).json({ error: 'Reseller not found' });
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.message });
    res.status(500).json({ error: 'Failed to update reseller' });
  }
});

// ── Delete reseller ───────────────────────────────────────────────────────────
resellerRouter.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    // Soft delete
    await db.update(organizations)
      .set({ deletedAt: new Date(), deletedBy: user.id })
      .where(and(eq(organizations.id, id), eq(organizations.isReseller, true)));

    // Unassign all customers from this reseller
    await db.update(customers)
      .set({ resellerId: null, resellerAssignedAt: null })
      .where(eq(customers.resellerId, id));

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete reseller' });
  }
});

// ── Get customers assigned to a reseller ─────────────────────────────────────
resellerRouter.get('/:id/customers', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { q } = req.query;

    const conditions = [eq(customers.resellerId, id), isNull(customers.deletedAt)];
    if (q && typeof q === 'string') {
      conditions.push(or(
        ilike(customers.name, `%${q}%`),
        ilike(customers.email, `%${q}%`),
      ) as any);
    }

    const assigned = await db.select({
      id: customers.id,
      name: customers.name,
      email: customers.email,
      phone: customers.phone,
      company: customers.company,
      resellerAssignedAt: customers.resellerAssignedAt,
      createdAt: customers.createdAt,
    })
    .from(customers)
    .where(and(...conditions))
    .orderBy(desc(customers.resellerAssignedAt));

    res.json(assigned);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reseller customers' });
  }
});

// ── Assign a customer to a reseller ──────────────────────────────────────────
resellerRouter.post('/:id/customers', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id: resellerId } = req.params;
    const user = (req as any).user;

    const schema = z.object({
      customerId: z.string(),
      notes: z.string().optional(),
    });
    const { customerId, notes } = schema.parse(req.body);

    // Verify reseller exists
    const [reseller] = await db.select({ id: organizations.id, name: organizations.name })
      .from(organizations).where(and(eq(organizations.id, resellerId), eq(organizations.isReseller, true)));
    if (!reseller) return res.status(404).json({ error: 'Reseller not found' });

    // Verify customer exists
    const [customer] = await db.select({ id: customers.id }).from(customers).where(eq(customers.id, customerId));
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    // Deactivate previous assignment
    await db.update(resellerAssignments)
      .set({ isActive: false })
      .where(and(eq(resellerAssignments.customerId, customerId), eq(resellerAssignments.isActive, true)));

    // Update customer record
    await db.update(customers)
      .set({ resellerId, resellerAssignedAt: new Date(), updatedAt: new Date() })
      .where(eq(customers.id, customerId));

    // Log the assignment
    await db.insert(resellerAssignments).values({
      customerId,
      resellerId,
      assignedBy: user.id,
      notes: notes || null,
      isActive: true,
    });

    res.json({ success: true, message: 'Customer assigned to reseller' });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.message });
    res.status(500).json({ error: 'Failed to assign customer' });
  }
});

// ── Remove customer from reseller ─────────────────────────────────────────────
resellerRouter.delete('/:id/customers/:customerId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id: resellerId, customerId } = req.params;

    await db.update(customers)
      .set({ resellerId: null, resellerAssignedAt: null, updatedAt: new Date() })
      .where(and(eq(customers.id, customerId), eq(customers.resellerId, resellerId)));

    await db.update(resellerAssignments)
      .set({ isActive: false })
      .where(and(eq(resellerAssignments.customerId, customerId), eq(resellerAssignments.resellerId, resellerId)));

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove customer from reseller' });
  }
});

// ── Escalate conversation from reseller to parent org ────────────────────────
resellerRouter.post('/escalate/:conversationId', requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const user = (req as any).user;

    const schema = z.object({
      escalationNote: z.string().min(1).max(1000),
    });
    const { escalationNote } = schema.parse(req.body);

    const [conv] = await db.select().from(conversations).where(eq(conversations.id, conversationId));
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    if (conv.isEscalated) return res.status(409).json({ error: 'Already escalated' });

    const [updated] = await db.update(conversations)
      .set({
        isEscalated: true,
        escalatedAt: new Date(),
        escalatedBy: user.id,
        escalationNote,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversationId))
      .returning();

    // Broadcast escalation event via WebSocket
    const wsServer = (req.app as any).wsServer;
    if (wsServer?.broadcastToOrg) {
      wsServer.broadcastToOrg(conv.organizationId, {
        type: 'conversation_escalated',
        conversationId,
        escalatedBy: user.name,
        escalationNote,
      });
    }

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.message });
    res.status(500).json({ error: 'Failed to escalate conversation' });
  }
});

// ── Get reseller stats ────────────────────────────────────────────────────────
resellerRouter.get('/:id/stats', requireAuth, async (req, res) => {
  try {
    const { id: resellerId } = req.params;

    const [customerRow] = await db
      .select({ cnt: count() })
      .from(customers)
      .where(and(eq(customers.resellerId, resellerId), isNull(customers.deletedAt)));

    const [convRow] = await db
      .select({ cnt: count() })
      .from(conversations)
      .where(eq(conversations.resellerId, resellerId));

    const [escalatedRow] = await db
      .select({ cnt: count() })
      .from(conversations)
      .where(and(eq(conversations.resellerId, resellerId), eq(conversations.isEscalated, true)));

    res.json({
      totalCustomers: customerRow?.cnt ?? 0,
      totalConversations: convRow?.cnt ?? 0,
      escalated: escalatedRow?.cnt ?? 0,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});
