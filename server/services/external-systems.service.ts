/**
 * External Systems service — CRUD for partner integrations (RapidRMS, Square,
 * Shopify, etc.). Credentials + embed secret are AES-256-GCM encrypted at
 * rest via the existing AIDataProtectionService helpers.
 *
 * Callers never see ciphertext; the service transparently decrypts on read
 * and encrypts on write.
 */
import { db } from '../db';
import { externalSystems, type ExternalSystem, type InsertExternalSystem } from '@shared/schema';
import { and, eq } from 'drizzle-orm';
import { AIDataProtectionService } from './ai-data-protection';
import crypto from 'crypto';

export interface ExternalSystemDto {
  id: string;
  organizationId: string;
  slug: string;
  name: string;
  apiEndpoint: string;
  clientId: string;
  credentials: Record<string, string>; // decrypted
  embedSecret: string; // decrypted
  metadata: Record<string, any>;
  isActive: boolean;
  lastHealthCheck: Date | null;
  lastError: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

/** Safe DTO — omits the actual embed secret + credentials, returns only metadata. */
export interface ExternalSystemPublicDto {
  id: string;
  organizationId: string;
  slug: string;
  name: string;
  apiEndpoint: string;
  clientId: string;
  credentialKeys: string[]; // field names only, not values
  embedSecretFingerprint: string; // first 8 chars of SHA-256 for verification
  metadata: Record<string, any>;
  isActive: boolean;
  lastHealthCheck: Date | null;
  lastError: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

function encrypt(plaintext: string): string {
  return AIDataProtectionService.encryptSensitiveData(plaintext);
}

function decrypt(ciphertext: string): string {
  return AIDataProtectionService.decryptSensitiveData(ciphertext);
}

function fingerprint(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex').slice(0, 8);
}

function toPublic(row: ExternalSystem): ExternalSystemPublicDto {
  let credentialKeys: string[] = [];
  let embedSecretFp = '';
  try {
    const credsJson = decrypt(row.credentialsEncrypted);
    if (credsJson && credsJson !== '[DECRYPTION_FAILED]') {
      credentialKeys = Object.keys(JSON.parse(credsJson));
    }
    const embedSecret = decrypt(row.embedSecretEncrypted);
    if (embedSecret && embedSecret !== '[DECRYPTION_FAILED]') {
      embedSecretFp = fingerprint(embedSecret);
    }
  } catch {
    /* return partial */
  }
  return {
    id: row.id,
    organizationId: row.organizationId,
    slug: row.slug,
    name: row.name,
    apiEndpoint: row.apiEndpoint,
    clientId: row.clientId,
    credentialKeys,
    embedSecretFingerprint: embedSecretFp,
    metadata: (row.metadata as Record<string, any>) || {},
    isActive: row.isActive,
    lastHealthCheck: row.lastHealthCheck,
    lastError: row.lastError,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Full DTO with decrypted secrets — ONLY for server-side internal use (e.g. signing embed tokens). Never return to HTTP responses. */
function toInternal(row: ExternalSystem): ExternalSystemDto {
  const credsRaw = decrypt(row.credentialsEncrypted);
  const credentials = credsRaw && credsRaw !== '[DECRYPTION_FAILED]' ? JSON.parse(credsRaw) : {};
  const embedSecret = decrypt(row.embedSecretEncrypted);
  return {
    id: row.id,
    organizationId: row.organizationId,
    slug: row.slug,
    name: row.name,
    apiEndpoint: row.apiEndpoint,
    clientId: row.clientId,
    credentials,
    embedSecret: embedSecret && embedSecret !== '[DECRYPTION_FAILED]' ? embedSecret : '',
    metadata: (row.metadata as Record<string, any>) || {},
    isActive: row.isActive,
    lastHealthCheck: row.lastHealthCheck,
    lastError: row.lastError,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const externalSystemsService = {
  async listByOrg(organizationId: string): Promise<ExternalSystemPublicDto[]> {
    const rows = await db.select().from(externalSystems).where(eq(externalSystems.organizationId, organizationId));
    return rows.map(toPublic);
  },

  async getById(id: string, organizationId: string): Promise<ExternalSystemPublicDto | null> {
    const [row] = await db.select().from(externalSystems)
      .where(and(eq(externalSystems.id, id), eq(externalSystems.organizationId, organizationId)));
    return row ? toPublic(row) : null;
  },

  /** Server-internal — returns decrypted creds + embed secret. Never expose via HTTP. */
  async getByIdInternal(id: string): Promise<ExternalSystemDto | null> {
    const [row] = await db.select().from(externalSystems).where(eq(externalSystems.id, id));
    return row ? toInternal(row) : null;
  },

  /** Server-internal — resolve by (organizationId, slug) for embed-token path. */
  async getByOrgAndSlugInternal(organizationId: string, slug: string): Promise<ExternalSystemDto | null> {
    const [row] = await db.select().from(externalSystems)
      .where(and(eq(externalSystems.organizationId, organizationId), eq(externalSystems.slug, slug)));
    return row ? toInternal(row) : null;
  },

  async create(input: Omit<InsertExternalSystem, 'credentials' | 'embedSecret'> & {
    credentials: Record<string, string>;
    embedSecret: string;
    createdBy?: string;
  }): Promise<ExternalSystemPublicDto> {
    const credentialsEncrypted = encrypt(JSON.stringify(input.credentials));
    const embedSecretEncrypted = encrypt(input.embedSecret);
    const [row] = await db.insert(externalSystems).values({
      organizationId: input.organizationId,
      slug: input.slug,
      name: input.name,
      apiEndpoint: input.apiEndpoint,
      clientId: input.clientId,
      credentialsEncrypted,
      embedSecretEncrypted,
      metadata: input.metadata || {},
      isActive: input.isActive ?? true,
      createdBy: input.createdBy,
    }).returning();
    return toPublic(row);
  },

  async update(id: string, organizationId: string, patch: {
    name?: string;
    apiEndpoint?: string;
    clientId?: string;
    credentials?: Record<string, string>;
    embedSecret?: string;
    metadata?: Record<string, any>;
    isActive?: boolean;
  }): Promise<ExternalSystemPublicDto | null> {
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (patch.name !== undefined) updates.name = patch.name;
    if (patch.apiEndpoint !== undefined) updates.apiEndpoint = patch.apiEndpoint;
    if (patch.clientId !== undefined) updates.clientId = patch.clientId;
    if (patch.credentials !== undefined) updates.credentialsEncrypted = encrypt(JSON.stringify(patch.credentials));
    if (patch.embedSecret !== undefined) updates.embedSecretEncrypted = encrypt(patch.embedSecret);
    if (patch.metadata !== undefined) updates.metadata = patch.metadata;
    if (patch.isActive !== undefined) updates.isActive = patch.isActive;

    const [row] = await db.update(externalSystems).set(updates)
      .where(and(eq(externalSystems.id, id), eq(externalSystems.organizationId, organizationId)))
      .returning();
    return row ? toPublic(row) : null;
  },

  async remove(id: string, organizationId: string): Promise<boolean> {
    const result = await db.delete(externalSystems)
      .where(and(eq(externalSystems.id, id), eq(externalSystems.organizationId, organizationId)))
      .returning({ id: externalSystems.id });
    return result.length > 0;
  },

  /**
   * Health check — ping the configured apiEndpoint with the decrypted creds.
   * Actual probe logic is provider-specific; this just records the result.
   */
  async recordHealth(id: string, ok: boolean, errorMessage?: string): Promise<void> {
    await db.update(externalSystems).set({
      lastHealthCheck: new Date(),
      lastError: ok ? null : (errorMessage || 'unknown error').slice(0, 500),
      updatedAt: new Date(),
    }).where(eq(externalSystems.id, id));
  },
};
