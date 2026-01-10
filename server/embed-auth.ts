import crypto from 'crypto';

interface CustomerTokenPayload {
  email: string;
  name: string;
  externalId?: string;
  company?: string;
  phone?: string;
  orgSlug: string;
  pageContext?: {
    url?: string;
    title?: string;
    feature?: string;
    metadata?: Record<string, string>;
  };
  iat?: number;
  exp?: number;
}

interface VerifiedCustomer {
  email: string;
  name: string;
  externalId?: string;
  company?: string;
  phone?: string;
  orgSlug: string;
  pageContext?: {
    url?: string;
    title?: string;
    feature?: string;
    metadata?: Record<string, string>;
  };
}

const EMBED_SECRETS: Record<string, string> = {};

export function registerEmbedSecret(orgSlug: string, secret: string): void {
  EMBED_SECRETS[orgSlug] = secret;
}

export function getEmbedSecret(orgSlug: string): string | undefined {
  return EMBED_SECRETS[orgSlug] || process.env[`EMBED_SECRET_${orgSlug.toUpperCase().replace(/-/g, '_')}`];
}

export function generateEmbedSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function createCustomerToken(payload: CustomerTokenPayload, secret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  
  const fullPayload = {
    ...payload,
    iat: payload.iat || now,
    exp: payload.exp || now + 3600,
  };
  
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyCustomerToken(token: string, orgSlug: string): VerifiedCustomer | null {
  try {
    const secret = getEmbedSecret(orgSlug);
    if (!secret) {
      console.error(`[EmbedAuth] No secret found for org: ${orgSlug}`);
      return null;
    }
    
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('[EmbedAuth] Invalid token format');
      return null;
    }
    
    const [encodedHeader, encodedPayload, providedSignature] = parts;
    
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');
    
    if (providedSignature !== expectedSignature) {
      console.error('[EmbedAuth] Invalid signature');
      return null;
    }
    
    const payload: CustomerTokenPayload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf-8')
    );
    
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      console.error('[EmbedAuth] Token expired');
      return null;
    }
    
    if (payload.orgSlug !== orgSlug) {
      console.error('[EmbedAuth] Org mismatch');
      return null;
    }
    
    if (!payload.email || !payload.name) {
      console.error('[EmbedAuth] Missing required fields');
      return null;
    }
    
    return {
      email: payload.email,
      name: payload.name,
      externalId: payload.externalId,
      company: payload.company,
      phone: payload.phone,
      orgSlug: payload.orgSlug,
      pageContext: payload.pageContext,
    };
  } catch (error) {
    console.error('[EmbedAuth] Token verification failed:', error);
    return null;
  }
}

export function createSimpleToken(customerId: string, orgSlug: string): string | null {
  // Enforce organization-specific secret - do NOT fallback to SESSION_SECRET
  // This prevents cross-tenant token forgery if global secret leaks
  const secret = getEmbedSecret(orgSlug);
  if (!secret) {
    console.error(`[EmbedAuth] No embed secret configured for org: ${orgSlug} - cannot create session token. Configure EMBED_SECRET_${orgSlug.toUpperCase().replace(/-/g, '_')} or register secret via registerEmbedSecret()`);
    return null;
  }
  
  const payload = {
    customerId,
    orgSlug,
    ts: Date.now(),
  };
  
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64url');
  
  return `${data}.${signature}`;
}

export function verifySimpleToken(token: string, orgSlug: string): { customerId: string } | null {
  try {
    // Enforce organization-specific secret - do NOT fallback to SESSION_SECRET
    const secret = getEmbedSecret(orgSlug);
    if (!secret) {
      console.error(`[EmbedAuth] No embed secret configured for org: ${orgSlug} - cannot verify token`);
      return null;
    }
    const [data, signature] = token.split('.');
    
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('base64url');
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    
    if (Date.now() - payload.ts > 24 * 60 * 60 * 1000) {
      return null;
    }
    
    if (payload.orgSlug !== orgSlug) {
      return null;
    }
    
    return { customerId: payload.customerId };
  } catch {
    return null;
  }
}
