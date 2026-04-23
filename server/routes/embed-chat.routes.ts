/**
 * Embed chat — bootstrap endpoint for iframe customer sessions.
 *
 *   POST /api/embed/chat/session
 *     Body: { token }   // the HMAC token minted at /api/embed/token
 *     Response:
 *       {
 *         sessionId, customerId, conversationId,
 *         orgSlug, storeName, username,
 *         wsUrl, expiresAt
 *       }
 *
 * Flow:
 *   1. Verify HMAC signature against the external_system's embedSecret
 *   2. Look up the store (customer_organization) by payload.storeId
 *   3. Upsert the customer — by (externalSystem, externalUserId) if provided,
 *      otherwise by (email, orgId). Link to the store.
 *   4. Find an OPEN conversation for this customer (within the last 24h) or
 *      create a new one, pre-populated with contextData from the token.
 *   5. Return a session blob the iframe can use to open a WebSocket chat.
 *
 * This endpoint is the "glue" between the partner-signed token and the
 * existing RapidSupport customer-chat / conversation stack.
 */
import type { RouteContext } from './types';
import { zodErrorResponse } from '../middleware/errors';
import { z } from 'zod';
import { db } from '../db';
import {
  externalSystems, customerOrganizations, customers, conversations, organizations,
  type Customer, type Conversation,
} from '@shared/schema';
import { and, desc, eq, gte } from 'drizzle-orm';
import { AIDataProtectionService } from '../services/ai-data-protection';
import { verifyEmbedToken, type EmbedTokenPayload } from '../services/embed-tokens';
import { randomUUID } from 'crypto';

const sessionSchema = z.object({
  token: z.string().min(10),
});

async function loadEmbedSecret(externalSystemId: string): Promise<string | null> {
  const [row] = await db.select().from(externalSystems).where(eq(externalSystems.id, externalSystemId));
  if (!row || !row.isActive) return null;
  const secret = AIDataProtectionService.decryptSensitiveData(row.embedSecretEncrypted);
  return secret && secret !== '[DECRYPTION_FAILED]' ? secret : null;
}

/** Find-or-create customer tied to the store + this embed session. */
async function upsertEmbedCustomer(
  payload: EmbedTokenPayload,
  store: typeof customerOrganizations.$inferSelect,
): Promise<Customer> {
  // Primary lookup: by (externalSystem, externalId) if partner gave us a userId
  if (payload.externalUserId) {
    const [byExternal] = await db.select().from(customers)
      .where(and(
        eq(customers.externalSystem, payload.iss),
        eq(customers.externalId, payload.externalUserId),
      ));
    if (byExternal) return byExternal;
  }

  // Secondary lookup: by email within the reseller org
  const effectiveEmail = payload.email
    || `${payload.externalUserId || randomUUID().slice(0, 8)}@${payload.iss}.embed`;

  const [byEmail] = await db.select().from(customers)
    .where(and(
      eq(customers.email, effectiveEmail),
      eq(customers.organizationId, payload.organizationId),
    ));

  if (byEmail) {
    // Ensure they're linked to the right store + backfill external refs
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (byEmail.customerOrganizationId !== store.id) updates.customerOrganizationId = store.id;
    if (!byEmail.externalSystem && payload.externalUserId) {
      updates.externalSystem = payload.iss;
      updates.externalId = payload.externalUserId;
    }
    if (Object.keys(updates).length > 1) {
      const [updated] = await db.update(customers).set(updates).where(eq(customers.id, byEmail.id)).returning();
      return updated;
    }
    return byEmail;
  }

  // Create new
  const [created] = await db.insert(customers).values({
    name: payload.username,
    email: effectiveEmail,
    phone: payload.phone,
    company: store.name,
    organizationId: payload.organizationId,
    customerOrganizationId: store.id,
    customerOrgRole: 'member',
    externalSystem: payload.iss,
    externalId: payload.externalUserId,
    syncStatus: 'synced',
    lastSyncAt: new Date(),
    status: 'online',
  }).returning();
  return created;
}

/** Find a recent open conversation, or create a new one. */
async function findOrCreateConversation(
  customer: Customer,
  payload: EmbedTokenPayload,
  storeName: string,
): Promise<Conversation> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [existing] = await db.select().from(conversations)
    .where(and(
      eq(conversations.customerId, customer.id),
      eq(conversations.status, 'open'),
      gte(conversations.createdAt, cutoff),
    ))
    .orderBy(desc(conversations.createdAt))
    .limit(1);
  if (existing) return existing;

  const sessionId = randomUUID();
  const [created] = await db.insert(conversations).values({
    customerId: customer.id,
    status: 'open',
    priority: 'medium',
    isAnonymous: false, // we know identity from the token
    sessionId,
    organizationId: payload.organizationId,
    contextData: JSON.stringify({
      source: 'embed-iframe',
      externalSystem: payload.iss,
      externalSystemId: payload.externalSystemId,
      storeId: payload.storeId,
      storeName,
      embedUser: {
        username: payload.username,
        email: payload.email,
        externalUserId: payload.externalUserId,
      },
    }),
    aiAssistanceEnabled: true,
  }).returning();
  return created;
}

export function registerEmbedChatRoutes({ app }: RouteContext) {
  app.post('/api/embed/chat/session', async (req, res) => {
    try {
      const parsed = sessionSchema.safeParse(req.body);
      if (!parsed.success) return zodErrorResponse(res, parsed.error);

      // Peek into payload to get externalSystemId (unauthenticated read — still
      // HMAC-verified below before we trust any of it).
      const parts = parsed.data.token.split('.');
      if (parts.length !== 2) return res.status(401).json({ error: 'malformed token' });
      let peekPayload: EmbedTokenPayload;
      try {
        const json = Buffer.from(parts[0].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
        peekPayload = JSON.parse(json);
      } catch {
        return res.status(401).json({ error: 'undecodable payload' });
      }

      if (!peekPayload.externalSystemId) return res.status(401).json({ error: 'token missing externalSystemId' });
      const secret = await loadEmbedSecret(peekPayload.externalSystemId);
      if (!secret) return res.status(401).json({ error: 'integration not found or inactive' });

      const verified = verifyEmbedToken(parsed.data.token, secret);
      if (!verified.ok) return res.status(401).json({ error: `invalid token: ${verified.reason}` });
      const payload = verified.payload;

      // Load the store + reseller org
      const [store] = await db.select().from(customerOrganizations).where(eq(customerOrganizations.id, payload.storeId));
      if (!store || !store.isActive) return res.status(404).json({ error: 'store not found or inactive' });
      if (store.organizationId !== payload.organizationId) {
        return res.status(401).json({ error: 'store does not belong to token organization' });
      }
      const [org] = await db.select().from(organizations).where(eq(organizations.id, payload.organizationId));

      const customer = await upsertEmbedCustomer(payload, store);
      const conversation = await findOrCreateConversation(customer, payload, store.name);

      // Build a WebSocket URL the iframe can connect to
      const wsProto = req.secure ? 'wss' : 'ws';
      const wsUrl = `${wsProto}://${req.get('host')}/ws`;

      res.json({
        sessionId: conversation.sessionId || conversation.id,
        customerId: customer.id,
        conversationId: conversation.id,
        orgSlug: org?.slug || null,
        storeName: store.name,
        storeId: store.id,
        username: payload.username,
        wsUrl,
        expiresAt: new Date(payload.exp * 1000).toISOString(),
      });
    } catch (err: any) {
      console.error('[embed-chat][session]', err);
      res.status(500).json({ error: err?.message || 'internal error' });
    }
  });
}
