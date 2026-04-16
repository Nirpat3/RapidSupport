import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { customers, customerOrganizations } from '@shared/schema';
import { eq, and, or, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export const customerOrgSocialRouter = Router();

function requireCustomerAuth(req: any, res: any, next: any) {
  const session = req.session as any;
  if (!session?.customerId) return res.status(401).json({ error: 'Customer authentication required' });
  next();
}

// Helper: verify customer belongs to org
async function verifyOrgMember(customerId: string, orgId: string): Promise<boolean> {
  const [c] = await db.select({ id: customers.id, orgId: customers.customerOrganizationId })
    .from(customers).where(eq(customers.id, customerId));
  return c?.orgId === orgId;
}

// ── Get org info ─────────────────────────────────────────────────────────────
customerOrgSocialRouter.get('/org/:orgId', requireCustomerAuth, async (req, res) => {
  try {
    const { orgId } = req.params;
    const session = req.session as any;

    if (!await verifyOrgMember(session.customerId, orgId)) {
      return res.status(403).json({ error: 'Not a member of this organization' });
    }

    const rows = await db.execute(sql`
      SELECT co.*, COUNT(DISTINCT m.id) as member_count
      FROM customer_organizations co
      LEFT JOIN customers m ON m.customer_organization_id = co.id
      WHERE co.id = ${orgId}
      GROUP BY co.id
    `);
    res.json(rows.rows?.[0] || null);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch org info' });
  }
});

// ── Get org members ───────────────────────────────────────────────────────────
customerOrgSocialRouter.get('/org/:orgId/members', requireCustomerAuth, async (req, res) => {
  try {
    const { orgId } = req.params;
    const session = req.session as any;

    if (!await verifyOrgMember(session.customerId, orgId)) {
      return res.status(403).json({ error: 'Not a member of this organization' });
    }

    const members = await db.execute(sql`
      SELECT id, name, email, company, status, customer_org_role, portal_last_login, created_at
      FROM customers
      WHERE customer_organization_id = ${orgId}
        AND deleted_at IS NULL
      ORDER BY customer_org_role DESC, name ASC
    `);

    res.json(members.rows || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// ── Org announcements / posts ─────────────────────────────────────────────────

// List org posts
customerOrgSocialRouter.get('/org/:orgId/posts', requireCustomerAuth, async (req, res) => {
  try {
    const { orgId } = req.params;
    const session = req.session as any;
    const { type, page = '1', limit = '20' } = req.query;

    if (!await verifyOrgMember(session.customerId, orgId)) {
      return res.status(403).json({ error: 'Not a member of this organization' });
    }

    const offset = (Number(page) - 1) * Number(limit);
    const typeFilter = type ? `AND p.type = '${String(type).replace(/'/g, "''")}'` : '';

    const posts = await db.execute(sql.raw(`
      SELECT p.*,
             COALESCE(r.reply_count, 0) as reply_count_actual
      FROM customer_org_posts p
      LEFT JOIN (
        SELECT post_id, COUNT(*) as reply_count
        FROM customer_org_post_replies
        GROUP BY post_id
      ) r ON r.post_id = p.id
      WHERE p.customer_org_id = '${orgId}'
        AND p.status = 'active'
        ${typeFilter}
      ORDER BY p.is_pinned DESC, p.created_at DESC
      LIMIT ${Number(limit)} OFFSET ${offset}
    `));

    res.json(posts.rows || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Create org post / announcement
customerOrgSocialRouter.post('/org/:orgId/posts', requireCustomerAuth, async (req, res) => {
  try {
    const { orgId } = req.params;
    const session = req.session as any;
    const customerId = session.customerId;

    if (!await verifyOrgMember(customerId, orgId)) {
      return res.status(403).json({ error: 'Not a member of this organization' });
    }

    const schema = z.object({
      type: z.enum(['announcement', 'post', 'pinned']).default('post'),
      title: z.string().max(200).optional(),
      content: z.string().min(1).max(5000),
      isUrgent: z.boolean().default(false),
      targetMemberIds: z.array(z.string()).optional(),
    });
    const body = schema.parse(req.body);

    const [author] = await db.select({ name: customers.name, role: customers.customerOrgRole })
      .from(customers).where(eq(customers.id, customerId));

    // Only admins can post 'announcement' or 'pinned'
    if (['announcement', 'pinned'].includes(body.type) && author?.role !== 'admin') {
      return res.status(403).json({ error: 'Only organization admins can post announcements' });
    }

    const rows = await db.execute(sql`
      INSERT INTO customer_org_posts (
        customer_org_id, author_id, author_name, type, title, content,
        is_urgent, is_pinned, target,
        target_member_ids
      ) VALUES (
        ${orgId}, ${customerId}, ${author?.name || 'Unknown'},
        ${body.type}, ${body.title || null}, ${body.content},
        ${body.isUrgent}, ${body.type === 'pinned'},
        ${body.targetMemberIds?.length ? 'members' : 'all'},
        ${body.targetMemberIds ? `ARRAY[${body.targetMemberIds.map(id => `'${id}'`).join(',')}]` : '{}'}::text[]
      )
      RETURNING *
    `);

    res.status(201).json(rows.rows?.[0] || {});
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.message });
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Delete org post (author or admin)
customerOrgSocialRouter.delete('/org/:orgId/posts/:postId', requireCustomerAuth, async (req, res) => {
  try {
    const { orgId, postId } = req.params;
    const session = req.session as any;
    const customerId = session.customerId;

    const [c] = await db.select({ role: customers.customerOrgRole })
      .from(customers).where(eq(customers.id, customerId));

    await db.execute(sql`
      UPDATE customer_org_posts
      SET status = 'deleted', updated_at = NOW()
      WHERE id = ${postId}
        AND customer_org_id = ${orgId}
        AND (author_id = ${customerId} OR ${c?.role === 'admin'})
    `);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Get replies for a post
customerOrgSocialRouter.get('/posts/:postId/replies', requireCustomerAuth, async (req, res) => {
  try {
    const { postId } = req.params;
    const rows = await db.execute(sql`
      SELECT * FROM customer_org_post_replies
      WHERE post_id = ${postId}
      ORDER BY created_at ASC
    `);
    res.json(rows.rows || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch replies' });
  }
});

// Add reply to post
customerOrgSocialRouter.post('/posts/:postId/replies', requireCustomerAuth, async (req, res) => {
  try {
    const { postId } = req.params;
    const session = req.session as any;
    const customerId = session.customerId;

    const { content } = z.object({ content: z.string().min(1).max(2000) }).parse(req.body);
    const [author] = await db.select({ name: customers.name }).from(customers).where(eq(customers.id, customerId));

    const rows = await db.execute(sql`
      INSERT INTO customer_org_post_replies (post_id, author_id, author_name, content)
      VALUES (${postId}, ${customerId}, ${author?.name || 'Unknown'}, ${content})
      RETURNING *
    `);

    res.status(201).json(rows.rows?.[0] || {});
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.message });
    res.status(500).json({ error: 'Failed to add reply' });
  }
});

// ── Direct Messages ───────────────────────────────────────────────────────────

// Get DM thread with another org member
customerOrgSocialRouter.get('/org/:orgId/dm/:memberId', requireCustomerAuth, async (req, res) => {
  try {
    const { orgId, memberId } = req.params;
    const session = req.session as any;
    const customerId = session.customerId;

    if (!await verifyOrgMember(customerId, orgId)) {
      return res.status(403).json({ error: 'Not a member of this organization' });
    }

    const messages = await db.execute(sql`
      SELECT m.*, 
             fc.name as from_name,
             tc.name as to_name
      FROM customer_org_dms m
      JOIN customers fc ON fc.id = m.from_customer_id
      JOIN customers tc ON tc.id = m.to_customer_id
      WHERE m.customer_org_id = ${orgId}
        AND (
          (m.from_customer_id = ${customerId} AND m.to_customer_id = ${memberId})
          OR
          (m.from_customer_id = ${memberId} AND m.to_customer_id = ${customerId})
        )
      ORDER BY m.created_at ASC
      LIMIT 100
    `);

    // Mark received messages as read
    await db.execute(sql`
      UPDATE customer_org_dms
      SET is_read = true, read_at = NOW()
      WHERE customer_org_id = ${orgId}
        AND from_customer_id = ${memberId}
        AND to_customer_id = ${customerId}
        AND is_read = false
    `);

    res.json(messages.rows || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a DM
customerOrgSocialRouter.post('/org/:orgId/dm/:memberId', requireCustomerAuth, async (req, res) => {
  try {
    const { orgId, memberId } = req.params;
    const session = req.session as any;
    const customerId = session.customerId;

    if (!await verifyOrgMember(customerId, orgId)) {
      return res.status(403).json({ error: 'Not a member of this organization' });
    }
    if (!await verifyOrgMember(memberId, orgId)) {
      return res.status(404).json({ error: 'Recipient is not a member of this organization' });
    }

    const { content } = z.object({ content: z.string().min(1).max(5000) }).parse(req.body);

    const rows = await db.execute(sql`
      INSERT INTO customer_org_dms (customer_org_id, from_customer_id, to_customer_id, content)
      VALUES (${orgId}, ${customerId}, ${memberId}, ${content})
      RETURNING *
    `);
    res.status(201).json(rows.rows?.[0] || {});
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.message });
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get DM conversation list (all threads for current customer in org)
customerOrgSocialRouter.get('/org/:orgId/dm-inbox', requireCustomerAuth, async (req, res) => {
  try {
    const { orgId } = req.params;
    const session = req.session as any;
    const customerId = session.customerId;

    const threads = await db.execute(sql`
      WITH last_messages AS (
        SELECT 
          CASE WHEN from_customer_id = ${customerId} THEN to_customer_id ELSE from_customer_id END as partner_id,
          MAX(created_at) as last_at
        FROM customer_org_dms
        WHERE customer_org_id = ${orgId}
          AND (from_customer_id = ${customerId} OR to_customer_id = ${customerId})
        GROUP BY partner_id
      ),
      unread_counts AS (
        SELECT from_customer_id as partner_id, COUNT(*) as unread
        FROM customer_org_dms
        WHERE customer_org_id = ${orgId}
          AND to_customer_id = ${customerId}
          AND is_read = false
        GROUP BY from_customer_id
      )
      SELECT 
        c.id as partner_id, c.name as partner_name, c.email as partner_email,
        c.customer_org_role as partner_role,
        lm.last_at, COALESCE(uc.unread, 0) as unread_count
      FROM last_messages lm
      JOIN customers c ON c.id = lm.partner_id
      LEFT JOIN unread_counts uc ON uc.partner_id = lm.partner_id
      ORDER BY lm.last_at DESC
    `);

    res.json(threads.rows || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch DM inbox' });
  }
});

// Get total unread DM count
customerOrgSocialRouter.get('/org/:orgId/unread-count', requireCustomerAuth, async (req, res) => {
  try {
    const { orgId } = req.params;
    const session = req.session as any;
    const customerId = session.customerId;

    const rows = await db.execute(sql`
      SELECT COUNT(*) as unread
      FROM customer_org_dms
      WHERE customer_org_id = ${orgId}
        AND to_customer_id = ${customerId}
        AND is_read = false
    `);

    res.json({ unread: Number((rows.rows?.[0] as any)?.unread || 0) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});
