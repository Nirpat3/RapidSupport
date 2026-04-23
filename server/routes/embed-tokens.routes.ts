/**
 * Embed token minting — RapidRMS (or any activated external system) calls
 * this server-to-server to get a short-lived signed token. The mobile app
 * then drops that token into an iframe URL.
 *
 *   POST /api/embed/token
 *     Headers: Authorization: Bearer <embedSecret of external system>
 *     Body:
 *       {
 *         externalSystemSlug: "rapidrms",
 *         externalStoreId: "store-12345",    // partner's ID for the store
 *         username: "John Doe",
 *         email?: "john@acme.com",
 *         phone?: "+1-555-1234",
 *         externalUserId?: "user-789",        // optional partner user id
 *         ttlSec?: 3600                        // default 3600, max 86400
 *       }
 *     Response (201):
 *       {
 *         token: "eyJ...ABC",
 *         expiresAt: "2026-04-23T...",
 *         iframeUrl: "https://<host>/embed/chat?token=..."
 *       }
 *
 * Auth uses constant-time compare against the decrypted embedSecret of the
 * external system matching the slug + token. No rate limit yet — front with
 * a generic rate limiter later if abuse shows up.
 */
import type { RouteContext } from './types';
import { zodErrorResponse } from '../middleware/errors';
import { z } from 'zod';
import { db } from '../db';
import { externalSystems } from '@shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { AIDataProtectionService } from '../services/ai-data-protection';
import { storesService } from '../services/stores.service';
import { signEmbedToken } from '../services/embed-tokens';

/** Per-integration rate limiter (key = sha256 of bearer, or IP fallback). */
const embedTokenLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => {
    const m = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
    return m ? 'embedSecret:' + crypto.createHash('sha256').update(m[1]).digest('hex').slice(0, 16) : 'ip:' + (req.ip || 'unknown');
  },
  message: { error: 'rate_limited', message: 'too many token mints — 100/min per integration' },
});

const MAX_TTL_SEC = 24 * 60 * 60; // 24h
const DEFAULT_TTL_SEC = 60 * 60;  // 1h

const bodySchema = z.object({
  externalSystemSlug: z.string().min(1).max(64),
  externalStoreId: z.string().min(1).max(200),
  username: z.string().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  externalUserId: z.string().max(200).optional(),
  ttlSec: z.number().int().min(60).max(MAX_TTL_SEC).optional(),
});

/** Resolve the external_system + embedSecret from slug + Bearer token. Returns null on failure. */
async function resolveIntegration(req: any, slug: string): Promise<{ id: string; organizationId: string; embedSecret: string } | null> {
  const authHeader = String(req.headers.authorization || '');
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const providedToken = match[1].trim();
  if (providedToken.length < 32) return null;

  const rows = await db.select().from(externalSystems).where(eq(externalSystems.slug, slug));
  for (const row of rows) {
    if (!row.isActive) continue;
    try {
      const decrypted = AIDataProtectionService.decryptSensitiveData(row.embedSecretEncrypted);
      if (!decrypted || decrypted === '[DECRYPTION_FAILED]') continue;
      if (decrypted.length === providedToken.length &&
          crypto.timingSafeEqual(Buffer.from(decrypted), Buffer.from(providedToken))) {
        return { id: row.id, organizationId: row.organizationId, embedSecret: decrypted };
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

export function registerEmbedTokenRoutes({ app }: RouteContext) {
  app.post('/api/embed/token', embedTokenLimiter, async (req, res) => {
    try {
      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) return zodErrorResponse(res, parsed.error);
      const { externalSystemSlug, externalStoreId, username, email, phone, externalUserId, ttlSec } = parsed.data;

      const integration = await resolveIntegration(req, externalSystemSlug);
      if (!integration) return res.status(401).json({ error: 'invalid or missing integration token' });

      // Look up the store by (externalSystemId, externalId). Reject if not
      // yet imported — the partner is expected to POST /api/partner/stores
      // before any user embed session.
      const store = await storesService.getByExternal(integration.id, externalStoreId);
      if (!store) {
        return res.status(404).json({
          error: 'store_not_registered',
          message: `Store ${externalStoreId} has not been registered. POST /api/partner/stores first.`,
        });
      }
      if (!store.isActive) {
        return res.status(403).json({ error: 'store_inactive' });
      }

      const iat = Math.floor(Date.now() / 1000);
      const exp = iat + (ttlSec || DEFAULT_TTL_SEC);
      const token = signEmbedToken({
        storeId: store.id,
        organizationId: integration.organizationId,
        externalSystemId: integration.id,
        iss: externalSystemSlug,
        username,
        email,
        phone,
        externalUserId,
        iat,
        exp,
      }, integration.embedSecret);

      // Build iframe URL using the request's host (works whether behind
      // Cloudflare tunnel, Replit, or local). Falls back to a configurable
      // EMBED_PUBLIC_URL env if set.
      const hostBase = process.env.EMBED_PUBLIC_URL
        || `${req.protocol}://${req.get('host')}`;
      const iframeUrl = `${hostBase.replace(/\/$/, '')}/embed/chat?token=${encodeURIComponent(token)}`;

      res.status(201).json({
        token,
        expiresAt: new Date(exp * 1000).toISOString(),
        iframeUrl,
      });
    } catch (err: any) {
      console.error('[embed-token][mint]', err);
      res.status(500).json({ error: err?.message || 'internal error' });
    }
  });
}
