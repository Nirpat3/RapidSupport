/**
 * Stores routes — admin CRUD for stores (businesses being supported) + a
 * partner push endpoint for auto-provisioning from an external system.
 *
 * Admin endpoints (session auth, reseller admin/owner role):
 *   GET    /api/stores            — list stores in current reseller org
 *   GET    /api/stores/:id        — fetch one
 *   POST   /api/stores            — manual create
 *   PATCH  /api/stores/:id        — update
 *   DELETE /api/stores/:id        — remove
 *
 * Partner push endpoint (Bearer auth using external_systems.embedSecret):
 *   POST   /api/partner/stores    — upsert one or many stores by externalId
 *     Body: { externalSystemSlug, stores: [{ externalId, name, metadata?, supportId? }] }
 */
import type { RouteContext } from './types';
import { requireAuth, requireRole } from '../auth';
import { zodErrorResponse } from '../middleware/errors';
import { z } from 'zod';
import { storesService } from '../services/stores.service';
import { externalSystemsService } from '../services/external-systems.service';
import { db } from '../db';
import { externalSystems } from '@shared/schema';
import { and, eq } from 'drizzle-orm';
import crypto from 'crypto';
import { AIDataProtectionService } from '../services/ai-data-protection';

function getSelectedOrgId(req: any): string | null {
  return (
    (req.session as any)?.selectedOrganizationId ||
    (req.user as any)?.organizationId ||
    req.query?.organizationId ||
    req.body?.organizationId ||
    null
  );
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(120).optional(),
  supportId: z.string().max(100).optional(),
  externalSystemId: z.string().optional(),
  externalId: z.string().max(200).optional(),
  externalMetadata: z.record(z.any()).optional(),
  settings: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  supportId: z.string().max(100).optional(),
  settings: z.record(z.any()).optional(),
  externalMetadata: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});

const partnerPushSchema = z.object({
  externalSystemSlug: z.string().min(1).max(64),
  stores: z.array(z.object({
    externalId: z.string().min(1).max(200),
    name: z.string().min(1).max(200),
    supportId: z.string().max(100).optional(),
    metadata: z.record(z.any()).optional(),
  })).min(1).max(500),
});

/**
 * Resolve the calling integration from the Authorization header. Bearer value
 * must match the integration's embedSecret (constant-time compare against the
 * decrypted plaintext).
 */
async function resolvePartnerIntegration(req: any): Promise<{ orgId: string; externalSystemId: string; slug: string } | null> {
  const authHeader = String(req.headers.authorization || '');
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const providedToken = match[1].trim();
  if (!providedToken || providedToken.length < 32) return null;

  const slug = String(req.body?.externalSystemSlug || '');
  if (!slug) return null;

  // Look up any row matching the slug — across all orgs — then compare token
  const rows = await db.select().from(externalSystems).where(eq(externalSystems.slug, slug));
  for (const row of rows) {
    if (!row.isActive) continue;
    try {
      const decrypted = AIDataProtectionService.decryptSensitiveData(row.embedSecretEncrypted);
      if (!decrypted || decrypted === '[DECRYPTION_FAILED]') continue;
      // Constant-time compare to avoid timing leaks
      if (decrypted.length === providedToken.length &&
          crypto.timingSafeEqual(Buffer.from(decrypted), Buffer.from(providedToken))) {
        return { orgId: row.organizationId, externalSystemId: row.id, slug };
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

export function registerStoresRoutes({ app }: RouteContext) {
  // ── Admin CRUD ──

  app.get('/api/stores', requireAuth, async (req: any, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      if (!orgId) return res.status(400).json({ error: 'No organization context' });
      const rows = await storesService.listByOrg(orgId);
      res.json(rows);
    } catch (err: any) {
      console.error('[stores][list]', err);
      res.status(500).json({ error: err?.message || 'internal error' });
    }
  });

  app.get('/api/stores/:id', requireAuth, async (req: any, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      if (!orgId) return res.status(400).json({ error: 'No organization context' });
      const row = await storesService.getById(req.params.id, orgId);
      if (!row) return res.status(404).json({ error: 'not found' });
      res.json(row);
    } catch (err: any) {
      console.error('[stores][get]', err);
      res.status(500).json({ error: err?.message || 'internal error' });
    }
  });

  app.post('/api/stores', requireAuth, requireRole('admin', 'owner'), async (req: any, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      if (!orgId) return res.status(400).json({ error: 'No organization context' });
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) return zodErrorResponse(res, parsed.error);

      // If externalSystemId is provided, verify it belongs to the current org
      if (parsed.data.externalSystemId) {
        const extSys = await externalSystemsService.getById(parsed.data.externalSystemId, orgId);
        if (!extSys) return res.status(400).json({ error: 'externalSystemId does not belong to this org' });
      }

      const row = await storesService.create({ ...parsed.data, organizationId: orgId });
      res.status(201).json(row);
    } catch (err: any) {
      console.error('[stores][create]', err);
      res.status(500).json({ error: err?.message || 'internal error' });
    }
  });

  app.patch('/api/stores/:id', requireAuth, requireRole('admin', 'owner'), async (req: any, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      if (!orgId) return res.status(400).json({ error: 'No organization context' });
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) return zodErrorResponse(res, parsed.error);
      const row = await storesService.update(req.params.id, orgId, parsed.data);
      if (!row) return res.status(404).json({ error: 'not found' });
      res.json(row);
    } catch (err: any) {
      console.error('[stores][update]', err);
      res.status(500).json({ error: err?.message || 'internal error' });
    }
  });

  app.delete('/api/stores/:id', requireAuth, requireRole('admin', 'owner'), async (req: any, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      if (!orgId) return res.status(400).json({ error: 'No organization context' });
      const ok = await storesService.remove(req.params.id, orgId);
      if (!ok) return res.status(404).json({ error: 'not found' });
      res.status(204).send();
    } catch (err: any) {
      console.error('[stores][delete]', err);
      res.status(500).json({ error: err?.message || 'internal error' });
    }
  });

  // ── Partner push (auth via Bearer embedSecret) ──

  app.post('/api/partner/stores', async (req, res) => {
    try {
      const parsed = partnerPushSchema.safeParse(req.body);
      if (!parsed.success) return zodErrorResponse(res, parsed.error);

      const integration = await resolvePartnerIntegration(req);
      if (!integration) return res.status(401).json({ error: 'invalid or missing integration token' });

      const results = {
        created: 0,
        updated: 0,
        errors: [] as Array<{ externalId: string; error: string }>,
      };

      for (const store of parsed.data.stores) {
        try {
          const { created } = await storesService.upsertFromPartner(
            integration.externalSystemId,
            integration.orgId,
            {
              name: store.name,
              externalId: store.externalId,
              supportId: store.supportId,
              externalMetadata: store.metadata || {},
            },
          );
          if (created) results.created++; else results.updated++;
        } catch (e: any) {
          results.errors.push({ externalId: store.externalId, error: e?.message || 'unknown error' });
        }
      }

      res.status(202).json(results);
    } catch (err: any) {
      console.error('[stores][partner-push]', err);
      res.status(500).json({ error: err?.message || 'internal error' });
    }
  });
}
