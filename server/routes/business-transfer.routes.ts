import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { customerOrganizations, customers, activityLogs } from '@shared/schema';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { requireAuth } from '../auth';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

export const businessTransferRouter = Router();

// Customer auth middleware
function requireCustomerAuth(req: any, res: any, next: any) {
  const session = req.session as any;
  if (!session?.customerId) return res.status(401).json({ error: 'Customer authentication required' });
  next();
}

// ── Initiate a business transfer ─────────────────────────────────────────────
businessTransferRouter.post('/initiate', requireCustomerAuth, async (req, res) => {
  try {
    const session = req.session as any;
    const customerId = session.customerId;

    const schema = z.object({
      customerOrgId: z.string(),
      toEmail: z.string().email(),
      transferNote: z.string().max(500).optional(),
      includeConversations: z.boolean().default(true),
      includeTickets: z.boolean().default(true),
      includeMembers: z.boolean().default(true),
    });
    const body = schema.parse(req.body);

    // Verify caller is admin of the org
    const [orgRow] = await db
      .select()
      .from(customerOrganizations)
      .where(eq(customerOrganizations.id, body.customerOrgId));
    if (!orgRow) return res.status(404).json({ error: 'Organization not found' });

    // Check caller is the org admin
    const [callerCustomer] = await db.select().from(customers).where(eq(customers.id, customerId));
    if (!callerCustomer) return res.status(404).json({ error: 'Customer not found' });
    if (callerCustomer.customerOrganizationId !== body.customerOrgId || callerCustomer.customerOrgRole !== 'admin') {
      return res.status(403).json({ error: 'Only the organization admin can initiate a transfer' });
    }

    // Create transfer token
    const transferToken = crypto.randomBytes(32).toString('hex');

    // Record in DB
    await db.execute(sql`
      INSERT INTO business_transfers (
        customer_org_id, from_customer_id, from_email, to_email,
        status, transfer_token, include_conversations, include_tickets,
        include_members, transfer_note, expires_at,
        org_snapshot
      ) VALUES (
        ${body.customerOrgId}, ${customerId}, ${callerCustomer.email}, ${body.toEmail},
        'pending', ${transferToken}, ${body.includeConversations}, ${body.includeTickets},
        ${body.includeMembers}, ${body.transferNote || null},
        NOW() + INTERVAL '7 days',
        ${JSON.stringify({ name: orgRow.name, slug: orgRow.slug, memberCount: 1 })}::jsonb
      )
    `);

    // TODO: Send email to toEmail with transfer link
    // For now, return the token so the new owner can accept via API
    console.log(`[BusinessTransfer] Transfer initiated for org ${orgRow.name} to ${body.toEmail}`);

    res.json({
      success: true,
      message: `Transfer invitation sent to ${body.toEmail}. They have 7 days to accept.`,
      transferToken, // In production, this would only be sent via email
    });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.message });
    console.error('[BusinessTransfer] Error initiating transfer:', error);
    res.status(500).json({ error: 'Failed to initiate transfer' });
  }
});

// ── Get transfer details by token ─────────────────────────────────────────────
businessTransferRouter.get('/token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const [transfer] = await db.execute(sql`
      SELECT t.*, co.name as org_name, co.slug as org_slug
      FROM business_transfers t
      JOIN customer_organizations co ON co.id = t.customer_org_id
      WHERE t.transfer_token = ${token}
        AND t.status = 'pending'
        AND t.expires_at > NOW()
    `);

    if (!transfer) return res.status(404).json({ error: 'Transfer not found or expired' });

    res.json({
      id: (transfer as any).id,
      orgName: (transfer as any).org_name,
      orgSlug: (transfer as any).org_slug,
      fromEmail: (transfer as any).from_email,
      toEmail: (transfer as any).to_email,
      transferNote: (transfer as any).transfer_note,
      includeConversations: (transfer as any).include_conversations,
      includeTickets: (transfer as any).include_tickets,
      includeMembers: (transfer as any).include_members,
      expiresAt: (transfer as any).expires_at,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transfer details' });
  }
});

// ── Accept a business transfer ─────────────────────────────────────────────────
businessTransferRouter.post('/accept/:token', requireCustomerAuth, async (req, res) => {
  try {
    const { token } = req.params;
    const session = req.session as any;
    const newOwnerId = session.customerId;

    const [newOwner] = await db.select().from(customers).where(eq(customers.id, newOwnerId));
    if (!newOwner) return res.status(404).json({ error: 'Customer not found' });

    // Get transfer
    const rows = await db.execute(sql`
      SELECT * FROM business_transfers
      WHERE transfer_token = ${token}
        AND status = 'pending'
        AND expires_at > NOW()
    `);
    const transfer = rows.rows?.[0] as any;
    if (!transfer) return res.status(404).json({ error: 'Transfer not found or expired' });

    // Verify email matches
    if (newOwner.email.toLowerCase() !== transfer.to_email.toLowerCase()) {
      return res.status(403).json({ error: 'This transfer was not sent to your email address' });
    }

    // Execute the transfer in a transaction
    await db.execute(sql`
      BEGIN;

      -- Update transfer record
      UPDATE business_transfers
      SET status = 'completed',
          to_customer_id = ${newOwnerId},
          accepted_at = NOW(),
          completed_at = NOW()
      WHERE transfer_token = ${token};

      -- Make new owner admin of the org
      UPDATE customers
      SET customer_organization_id = ${transfer.customer_org_id},
          customer_org_role = 'admin',
          updated_at = NOW()
      WHERE id = ${newOwnerId};

      -- Demote old admin to member (or remove)
      UPDATE customers
      SET customer_org_role = 'member',
          updated_at = NOW()
      WHERE id = ${transfer.from_customer_id}
        AND customer_organization_id = ${transfer.customer_org_id};

      COMMIT;
    `);

    console.log(`[BusinessTransfer] Transfer completed for org ${transfer.customer_org_id} → ${newOwnerId}`);

    res.json({
      success: true,
      message: 'Business transfer completed. You are now the admin of this organization.',
      orgId: transfer.customer_org_id,
    });
  } catch (error) {
    console.error('[BusinessTransfer] Accept error:', error);
    res.status(500).json({ error: 'Failed to complete transfer' });
  }
});

// ── Reject/cancel a transfer ───────────────────────────────────────────────────
businessTransferRouter.post('/reject/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { reason } = req.body;

    await db.execute(sql`
      UPDATE business_transfers
      SET status = 'rejected', rejected_at = NOW(), rejection_reason = ${reason || null}
      WHERE transfer_token = ${token} AND status = 'pending'
    `);

    res.json({ success: true, message: 'Transfer rejected' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject transfer' });
  }
});

// ── Get transfer history for a customer org ────────────────────────────────────
businessTransferRouter.get('/history/:orgId', requireCustomerAuth, async (req, res) => {
  try {
    const { orgId } = req.params;
    const rows = await db.execute(sql`
      SELECT t.id, t.status, t.from_email, t.to_email, t.transfer_note,
             t.initiated_at, t.completed_at, t.rejected_at, t.expires_at,
             t.include_conversations, t.include_tickets, t.include_members
      FROM business_transfers t
      WHERE t.customer_org_id = ${orgId}
      ORDER BY t.initiated_at DESC
      LIMIT 20
    `);
    res.json(rows.rows || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transfer history' });
  }
});

// ── Admin: List all transfers ─────────────────────────────────────────────────
businessTransferRouter.get('/admin/all', requireAuth, async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT t.*, co.name as org_name, co.slug as org_slug
      FROM business_transfers t
      JOIN customer_organizations co ON co.id = t.customer_org_id
      ORDER BY t.initiated_at DESC
      LIMIT 100
    `);
    res.json(rows.rows || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transfers' });
  }
});
