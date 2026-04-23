/**
 * External Systems routes — admin CRUD for partner integrations
 * (RapidRMS, Square, Shopify, ...).
 *
 * Scoped to the authenticated user's selected organization (reseller). All
 * endpoints require an admin/owner role. Credentials and embed secret are
 * transparently encrypted at rest by the service layer.
 *
 * Endpoints:
 *   GET    /api/external-systems           — list integrations for current org
 *   GET    /api/external-systems/:id       — fetch one (no secrets in response)
 *   POST   /api/external-systems           — create
 *   PATCH  /api/external-systems/:id       — update
 *   DELETE /api/external-systems/:id       — remove
 *   POST   /api/external-systems/:id/test  — record health check result (provider probe lives elsewhere)
 */
import type { RouteContext } from './types';
import { requireAuth, requireRole } from '../auth';
import { zodErrorResponse } from '../middleware/errors';
import { z } from 'zod';
import { externalSystemsService } from '../services/external-systems.service';

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
  slug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/, 'lowercase alphanumeric + hyphens only'),
  name: z.string().min(1).max(200),
  apiEndpoint: z.string().url(),
  clientId: z.string().min(1).max(200),
  credentials: z.record(z.string()).refine(v => Object.keys(v).length > 0, 'at least one credential field required'),
  embedSecret: z.string().min(32, 'embedSecret must be at least 32 chars'),
  metadata: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  apiEndpoint: z.string().url().optional(),
  clientId: z.string().min(1).max(200).optional(),
  credentials: z.record(z.string()).optional(),
  embedSecret: z.string().min(32).optional(),
  metadata: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});

export function registerExternalSystemsRoutes({ app }: RouteContext) {
  // LIST
  app.get('/api/external-systems', requireAuth, async (req: any, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      if (!orgId) return res.status(400).json({ error: 'No organization context' });
      const rows = await externalSystemsService.listByOrg(orgId);
      res.json(rows);
    } catch (err: any) {
      console.error('[external-systems][list]', err);
      res.status(500).json({ error: err?.message || 'internal error' });
    }
  });

  // GET ONE
  app.get('/api/external-systems/:id', requireAuth, async (req: any, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      if (!orgId) return res.status(400).json({ error: 'No organization context' });
      const row = await externalSystemsService.getById(req.params.id, orgId);
      if (!row) return res.status(404).json({ error: 'not found' });
      res.json(row);
    } catch (err: any) {
      console.error('[external-systems][get]', err);
      res.status(500).json({ error: err?.message || 'internal error' });
    }
  });

  // CREATE
  app.post('/api/external-systems', requireAuth, requireRole('admin', 'owner'), async (req: any, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      if (!orgId) return res.status(400).json({ error: 'No organization context' });
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) return zodErrorResponse(res, parsed.error);
      const row = await externalSystemsService.create({
        ...parsed.data,
        organizationId: orgId,
        metadata: parsed.data.metadata || {},
        createdBy: (req.user as any)?.id,
      });
      res.status(201).json(row);
    } catch (err: any) {
      if (err?.code === '23505') {
        return res.status(409).json({ error: `integration "${req.body?.slug}" already exists for this org` });
      }
      console.error('[external-systems][create]', err);
      res.status(500).json({ error: err?.message || 'internal error' });
    }
  });

  // UPDATE
  app.patch('/api/external-systems/:id', requireAuth, requireRole('admin', 'owner'), async (req: any, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      if (!orgId) return res.status(400).json({ error: 'No organization context' });
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) return zodErrorResponse(res, parsed.error);
      const row = await externalSystemsService.update(req.params.id, orgId, parsed.data);
      if (!row) return res.status(404).json({ error: 'not found' });
      res.json(row);
    } catch (err: any) {
      console.error('[external-systems][update]', err);
      res.status(500).json({ error: err?.message || 'internal error' });
    }
  });

  // DELETE
  app.delete('/api/external-systems/:id', requireAuth, requireRole('admin', 'owner'), async (req: any, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      if (!orgId) return res.status(400).json({ error: 'No organization context' });
      const ok = await externalSystemsService.remove(req.params.id, orgId);
      if (!ok) return res.status(404).json({ error: 'not found' });
      res.status(204).send();
    } catch (err: any) {
      console.error('[external-systems][delete]', err);
      res.status(500).json({ error: err?.message || 'internal error' });
    }
  });

  // HEALTH-CHECK RECORD (provider-specific probe logic should live in a worker;
  // this endpoint just persists the probe outcome so the admin UI can show status)
  app.post('/api/external-systems/:id/health', requireAuth, requireRole('admin', 'owner'), async (req: any, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      if (!orgId) return res.status(400).json({ error: 'No organization context' });
      const exists = await externalSystemsService.getById(req.params.id, orgId);
      if (!exists) return res.status(404).json({ error: 'not found' });
      const ok = Boolean(req.body?.ok);
      const errorMessage = typeof req.body?.error === 'string' ? req.body.error : undefined;
      await externalSystemsService.recordHealth(req.params.id, ok, errorMessage);
      res.json({ ok: true });
    } catch (err: any) {
      console.error('[external-systems][health]', err);
      res.status(500).json({ error: err?.message || 'internal error' });
    }
  });
}
