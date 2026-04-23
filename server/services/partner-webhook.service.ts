/**
 * Partner webhook — fires outbound notifications to the partner system when
 * support events happen (conversation resolved/closed, message sent, etc.).
 *
 * Non-blocking, best-effort. Webhook URL lives in external_systems.metadata.webhookUrl.
 * Payload is HMAC-signed with the integration's embedSecret so the partner can
 * verify authenticity (header: X-Shre-Signature: sha256=<hex>).
 *
 * Retry policy: 3 attempts with exponential backoff (1s, 4s, 16s). Failures are
 * logged but never thrown — the support flow must not stall waiting for a
 * partner webhook.
 */
import { db } from '../db';
import { externalSystems } from '@shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { AIDataProtectionService } from './ai-data-protection';

export type PartnerWebhookEvent =
  | 'conversation.resolved'
  | 'conversation.closed'
  | 'conversation.message_sent';

export interface PartnerWebhookPayload {
  event: PartnerWebhookEvent;
  conversationId: string;
  storeId: string;
  externalId: string | null;
  [extra: string]: any;
}

const RETRY_DELAYS_MS = [1_000, 4_000, 16_000];
const HTTP_TIMEOUT_MS = 5_000;

async function fireOnce(url: string, body: string, signature: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'RapidSupport-Webhook/1.0',
        'X-Shre-Signature': `sha256=${signature}`,
      },
      body,
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fires a webhook asynchronously. Resolves immediately — retries happen in
 * the background via an untracked promise chain. Callers should `void` the
 * return value since we intentionally never throw.
 */
export async function firePartnerWebhook(
  externalSystemId: string,
  payload: PartnerWebhookPayload,
): Promise<void> {
  try {
    const [row] = await db.select().from(externalSystems).where(eq(externalSystems.id, externalSystemId));
    if (!row || !row.isActive) return;

    const metadata = (row.metadata as Record<string, any>) || {};
    const webhookUrl = String(metadata.webhookUrl || '').trim();
    if (!webhookUrl || !/^https?:\/\//i.test(webhookUrl)) return; // not configured

    const embedSecret = AIDataProtectionService.decryptSensitiveData(row.embedSecretEncrypted);
    if (!embedSecret || embedSecret === '[DECRYPTION_FAILED]') return;

    const body = JSON.stringify({
      ...payload,
      integrationId: externalSystemId,
      slug: row.slug,
      timestamp: new Date().toISOString(),
    });
    const signature = crypto.createHmac('sha256', embedSecret).update(body).digest('hex');

    // Background retry loop — the outer await returns after the first attempt
    // dispatches; subsequent retries run without blocking the caller.
    void (async () => {
      for (let i = 0; i < RETRY_DELAYS_MS.length + 1; i++) {
        if (i > 0) await delay(RETRY_DELAYS_MS[i - 1]);
        const ok = await fireOnce(webhookUrl, body, signature);
        if (ok) return;
        if (i === RETRY_DELAYS_MS.length) {
          console.warn(`[partner-webhook] giving up after ${i + 1} attempts: ${payload.event} → ${webhookUrl}`);
        }
      }
    })();
  } catch (err) {
    console.error('[partner-webhook] dispatch error:', (err as Error).message);
  }
}
