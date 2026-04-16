import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { customerOrganizations, customers } from '@shared/schema';
import { eq, and, or } from 'drizzle-orm';
import { requireAuth } from '../auth';
import { sql } from 'drizzle-orm';

export const externalAppLinksRouter = Router();

function requireCustomerAuth(req: any, res: any, next: any) {
  const session = req.session as any;
  if (!session?.customerId) return res.status(401).json({ error: 'Customer authentication required' });
  next();
}

// ── Get all external app links for an org ─────────────────────────────────────
externalAppLinksRouter.get('/org/:orgId', requireCustomerAuth, async (req, res) => {
  try {
    const { orgId } = req.params;
    const rows = await db.execute(sql`
      SELECT id, app_name, app_type, external_store_id, external_client_id,
             external_workspace_id, external_user_id, api_endpoint,
             is_active, last_synced_at, sync_status, sync_error,
             external_user_data, created_at, updated_at
      FROM external_app_links
      WHERE customer_org_id = ${orgId}
      ORDER BY created_at DESC
    `);
    res.json(rows.rows || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch external app links' });
  }
});

// ── Create / link an external app ─────────────────────────────────────────────
externalAppLinksRouter.post('/org/:orgId', requireCustomerAuth, async (req, res) => {
  try {
    const { orgId } = req.params;
    const schema = z.object({
      appName: z.string().min(1).max(100),
      appType: z.enum(['ecommerce', 'crm', 'erp', 'pos', 'custom']).default('custom'),
      externalStoreId: z.string().optional(),
      externalClientId: z.string().optional(),
      externalWorkspaceId: z.string().optional(),
      externalUserId: z.string().optional(),
      apiEndpoint: z.string().url().optional(),
      webhookSecret: z.string().optional(),
    });
    const body = schema.parse(req.body);

    const rows = await db.execute(sql`
      INSERT INTO external_app_links (
        customer_org_id, app_name, app_type, external_store_id, external_client_id,
        external_workspace_id, external_user_id, api_endpoint, webhook_secret
      ) VALUES (
        ${orgId}, ${body.appName}, ${body.appType},
        ${body.externalStoreId || null}, ${body.externalClientId || null},
        ${body.externalWorkspaceId || null}, ${body.externalUserId || null},
        ${body.apiEndpoint || null}, ${body.webhookSecret || null}
      )
      RETURNING *
    `);

    // Also update the quick-lookup columns on customer_organizations
    if (body.externalStoreId) {
      await db.execute(sql`
        UPDATE customer_organizations SET store_id = ${body.externalStoreId}
        WHERE id = ${orgId}
      `);
    }
    if (body.externalClientId) {
      await db.execute(sql`
        UPDATE customer_organizations SET client_id = ${body.externalClientId}
        WHERE id = ${orgId}
      `);
    }
    if (body.externalWorkspaceId) {
      await db.execute(sql`
        UPDATE customer_organizations SET external_workspace_id = ${body.externalWorkspaceId}
        WHERE id = ${orgId}
      `);
    }

    res.status(201).json(rows.rows?.[0] || {});
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.message });
    res.status(500).json({ error: 'Failed to create external app link' });
  }
});

// ── Update external app link ───────────────────────────────────────────────────
externalAppLinksRouter.patch('/:linkId', requireCustomerAuth, async (req, res) => {
  try {
    const { linkId } = req.params;
    const schema = z.object({
      appName: z.string().min(1).max(100).optional(),
      externalStoreId: z.string().nullable().optional(),
      externalClientId: z.string().nullable().optional(),
      externalWorkspaceId: z.string().nullable().optional(),
      externalUserId: z.string().nullable().optional(),
      apiEndpoint: z.string().url().nullable().optional(),
      isActive: z.boolean().optional(),
    });
    const body = schema.parse(req.body);

    const sets: string[] = ['updated_at = NOW()'];
    if (body.appName !== undefined) sets.push(`app_name = '${body.appName.replace(/'/g, "''")}'`);
    if (body.externalStoreId !== undefined) sets.push(`external_store_id = ${body.externalStoreId ? `'${body.externalStoreId}'` : 'NULL'}`);
    if (body.externalClientId !== undefined) sets.push(`external_client_id = ${body.externalClientId ? `'${body.externalClientId}'` : 'NULL'}`);
    if (body.externalWorkspaceId !== undefined) sets.push(`external_workspace_id = ${body.externalWorkspaceId ? `'${body.externalWorkspaceId}'` : 'NULL'}`);
    if (body.externalUserId !== undefined) sets.push(`external_user_id = ${body.externalUserId ? `'${body.externalUserId}'` : 'NULL'}`);
    if (body.isActive !== undefined) sets.push(`is_active = ${body.isActive}`);

    const rows = await db.execute(sql.raw(`
      UPDATE external_app_links SET ${sets.join(', ')}
      WHERE id = '${linkId}'
      RETURNING *
    `));

    res.json(rows.rows?.[0] || {});
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.message });
    res.status(500).json({ error: 'Failed to update link' });
  }
});

// ── Delete external app link ───────────────────────────────────────────────────
externalAppLinksRouter.delete('/:linkId', requireCustomerAuth, async (req, res) => {
  try {
    const { linkId } = req.params;
    await db.execute(sql`DELETE FROM external_app_links WHERE id = ${linkId}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete link' });
  }
});

// ── PUBLIC: Look up customer org by external ID ────────────────────────────────
// Used by 3rd party apps to find which Nova org a store/client belongs to
externalAppLinksRouter.get('/lookup', async (req, res) => {
  try {
    const { storeId, clientId, workspaceId, appName } = req.query;

    if (!storeId && !clientId && !workspaceId) {
      return res.status(400).json({ error: 'Provide at least one: storeId, clientId, or workspaceId' });
    }

    const conditions: string[] = [];
    if (storeId) conditions.push(`l.external_store_id = '${String(storeId).replace(/'/g, "''")}'`);
    if (clientId) conditions.push(`l.external_client_id = '${String(clientId).replace(/'/g, "''")}'`);
    if (workspaceId) conditions.push(`l.external_workspace_id = '${String(workspaceId).replace(/'/g, "''")}'`);
    if (appName) conditions.push(`l.app_name ILIKE '${String(appName).replace(/'/g, "''")}%'`);

    const rows = await db.execute(sql.raw(`
      SELECT
        l.id as link_id, l.app_name, l.app_type,
        l.external_store_id, l.external_client_id, l.external_workspace_id,
        l.external_user_data,
        co.id as org_id, co.name as org_name, co.slug as org_slug,
        co.store_id, co.client_id, co.external_workspace_id as org_workspace_id
      FROM external_app_links l
      JOIN customer_organizations co ON co.id = l.customer_org_id
      WHERE l.is_active = true
        AND (${conditions.join(' OR ')})
      LIMIT 5
    `));

    res.json({ results: rows.rows || [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to look up' });
  }
});

// ── PUBLIC: Sync user data from external app ───────────────────────────────────
// External app pushes their user data to keep profiles in sync
externalAppLinksRouter.post('/sync', async (req, res) => {
  try {
    const schema = z.object({
      webhookSecret: z.string(),
      externalStoreId: z.string().optional(),
      externalClientId: z.string().optional(),
      externalWorkspaceId: z.string().optional(),
      userData: z.record(z.unknown()), // Flexible — any user data
    });
    const body = schema.parse(req.body);

    // Find the link by webhook secret
    const rows = await db.execute(sql`
      SELECT id FROM external_app_links
      WHERE webhook_secret = ${body.webhookSecret} AND is_active = true
      LIMIT 1
    `);
    const link = rows.rows?.[0] as any;
    if (!link) return res.status(401).json({ error: 'Invalid webhook secret' });

    // Update user data
    await db.execute(sql`
      UPDATE external_app_links
      SET external_user_data = ${JSON.stringify(body.userData)}::jsonb,
          last_synced_at = NOW(),
          sync_status = 'synced',
          sync_error = NULL,
          updated_at = NOW()
      WHERE id = ${link.id}
    `);

    res.json({ success: true, synced: true });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.message });
    res.status(500).json({ error: 'Failed to sync' });
  }
});

// ── Admin: Get org detail with external links ──────────────────────────────────
externalAppLinksRouter.get('/admin/org/:orgId', requireAuth, async (req, res) => {
  try {
    const { orgId } = req.params;

    const [org] = await db.execute(sql`
      SELECT co.*, 
             COUNT(DISTINCT m.id) as member_count,
             COUNT(DISTINCT l.id) as link_count
      FROM customer_organizations co
      LEFT JOIN customer_organization_memberships m ON m.organization_id = co.id
      LEFT JOIN external_app_links l ON l.customer_org_id = co.id
      WHERE co.id = ${orgId}
      GROUP BY co.id
    `);

    const links = await db.execute(sql`
      SELECT * FROM external_app_links WHERE customer_org_id = ${orgId} ORDER BY created_at DESC
    `);

    const transfers = await db.execute(sql`
      SELECT * FROM business_transfers
      WHERE customer_org_id = ${orgId}
      ORDER BY initiated_at DESC LIMIT 10
    `);

    res.json({
      org,
      externalLinks: links.rows || [],
      transferHistory: transfers.rows || [],
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch org details' });
  }
});
