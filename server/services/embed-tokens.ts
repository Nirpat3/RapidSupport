/**
 * Embed tokens — HMAC-SHA256 signed tokens for iframe-embed authentication.
 *
 * Format: `<base64url(payload)>.<base64url(hmac)>`
 * Shorter than JWT, dependency-free, symmetric-key only.
 *
 * Signed with the integration's `embedSecret`. The partner backend (RapidRMS)
 * calls us server-to-server to mint a token, then embeds it in an iframe URL
 * `https://rapidsupport.../embed/chat?token=...`. The iframe route verifies
 * the HMAC, decodes the payload, and opens chat pre-scoped to the store.
 */
import crypto from 'crypto';

export interface EmbedTokenPayload {
  /** RapidSupport's internal customer_organization (store) id */
  storeId: string;
  /** The reseller staff organization that serves this store */
  organizationId: string;
  /** The external_system id that vouched for this session */
  externalSystemId: string;
  /** External-system slug (e.g. 'rapidrms') — appears as `iss` */
  iss: string;
  /** Display username shown in the chat UI */
  username: string;
  /** Optional email — used for auto-creating the customer record if missing */
  email?: string;
  /** Optional phone — ditto */
  phone?: string;
  /** Optional external user id (partner's user ID for this session) */
  externalUserId?: string;
  /** Issued at (epoch seconds) */
  iat: number;
  /** Expires at (epoch seconds) */
  exp: number;
}

function base64urlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(input: string): Buffer {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (input.length % 4)) % 4);
  return Buffer.from(b64, 'base64');
}

export function signEmbedToken(payload: EmbedTokenPayload, secret: string): string {
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const hmac = crypto.createHmac('sha256', secret).update(payloadB64).digest();
  const sigB64 = base64urlEncode(hmac);
  return `${payloadB64}.${sigB64}`;
}

export type VerifyResult =
  | { ok: true; payload: EmbedTokenPayload }
  | { ok: false; reason: string };

export function verifyEmbedToken(token: string, secret: string): VerifyResult {
  const parts = token.split('.');
  if (parts.length !== 2) return { ok: false, reason: 'malformed token' };
  const [payloadB64, sigB64] = parts;

  const expected = crypto.createHmac('sha256', secret).update(payloadB64).digest();
  let provided: Buffer;
  try {
    provided = base64urlDecode(sigB64);
  } catch {
    return { ok: false, reason: 'invalid signature encoding' };
  }
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    return { ok: false, reason: 'signature mismatch' };
  }

  let payload: EmbedTokenPayload;
  try {
    payload = JSON.parse(base64urlDecode(payloadB64).toString('utf8'));
  } catch {
    return { ok: false, reason: 'invalid payload encoding' };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) {
    return { ok: false, reason: 'expired' };
  }
  if (typeof payload.iat !== 'number' || payload.iat > nowSec + 120) {
    // Allow 2-min clock skew in the future; reject anything further ahead
    return { ok: false, reason: 'issued-in-future' };
  }

  return { ok: true, payload };
}
