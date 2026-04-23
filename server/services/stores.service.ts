/**
 * Stores service — stores (customer_organizations) are the businesses being
 * supported. A store can be created three ways:
 *
 *   1. Manually by a reseller admin (admin UI / POST /api/stores)
 *   2. Pushed in by a partner system via POST /api/partner/stores (auth: Bearer <integration embedSecret>)
 *   3. Pulled from a partner's API on demand (future: uses external_systems.credentials)
 *
 * Imported stores are keyed by (externalSystemId, externalId) so re-imports
 * idempotently upsert instead of duplicating.
 */
import { db } from '../db';
import { customerOrganizations, type CustomerOrganization } from '@shared/schema';
import { and, eq, isNull } from 'drizzle-orm';

export interface StoreInput {
  name: string;
  slug?: string;
  supportId?: string;
  organizationId: string; // reseller staff org that owns this store
  workspaceId?: string | null; // optional: pin conversations to a workspace
  externalSystemId?: string | null;
  externalId?: string | null;
  externalMetadata?: Record<string, any>;
  settings?: Record<string, any>;
  isActive?: boolean;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function shortId(): string {
  return Math.random().toString(36).slice(2, 8);
}

async function ensureUniqueSlug(base: string): Promise<string> {
  let candidate = base || `store-${shortId()}`;
  for (let i = 0; i < 5; i++) {
    const [exists] = await db.select({ id: customerOrganizations.id })
      .from(customerOrganizations)
      .where(eq(customerOrganizations.slug, candidate));
    if (!exists) return candidate;
    candidate = `${base}-${shortId()}`;
  }
  // Last-ditch suffix
  return `${base}-${Date.now()}`;
}

export const storesService = {
  async listByOrg(organizationId: string): Promise<CustomerOrganization[]> {
    return db.select().from(customerOrganizations)
      .where(eq(customerOrganizations.organizationId, organizationId));
  },

  async getById(id: string, organizationId: string): Promise<CustomerOrganization | null> {
    const [row] = await db.select().from(customerOrganizations)
      .where(and(eq(customerOrganizations.id, id), eq(customerOrganizations.organizationId, organizationId)));
    return row || null;
  },

  async getByExternal(externalSystemId: string, externalId: string): Promise<CustomerOrganization | null> {
    const [row] = await db.select().from(customerOrganizations)
      .where(and(
        eq(customerOrganizations.externalSystemId, externalSystemId),
        eq(customerOrganizations.externalId, externalId),
      ));
    return row || null;
  },

  async create(input: StoreInput): Promise<CustomerOrganization> {
    const slug = await ensureUniqueSlug(input.slug || slugify(input.name));
    const [row] = await db.insert(customerOrganizations).values({
      name: input.name,
      slug,
      supportId: input.supportId,
      organizationId: input.organizationId,
      workspaceId: input.workspaceId ?? null,
      externalSystemId: input.externalSystemId ?? null,
      externalId: input.externalId ?? null,
      externalMetadata: input.externalMetadata || {},
      settings: input.settings || {},
      isActive: input.isActive ?? true,
    }).returning();
    return row;
  },

  /**
   * Upsert by (externalSystemId, externalId). Creates on first import, updates
   * name/metadata on subsequent pushes. Used by partner push endpoint.
   */
  async upsertFromPartner(externalSystemId: string, organizationId: string, input: Omit<StoreInput, 'organizationId' | 'externalSystemId'>): Promise<{ store: CustomerOrganization; created: boolean }> {
    if (!input.externalId) {
      throw new Error('externalId is required for partner-upsert');
    }
    const existing = await this.getByExternal(externalSystemId, input.externalId);
    if (existing) {
      // Verify the existing record belongs to the same reseller (defense in depth)
      if (existing.organizationId !== organizationId) {
        throw new Error(`Store ${input.externalId} already exists under a different reseller`);
      }
      const [updated] = await db.update(customerOrganizations).set({
        name: input.name,
        externalMetadata: input.externalMetadata || existing.externalMetadata || {},
        updatedAt: new Date(),
      }).where(eq(customerOrganizations.id, existing.id)).returning();
      return { store: updated, created: false };
    }
    const created = await this.create({
      ...input,
      organizationId,
      externalSystemId,
    });
    return { store: created, created: true };
  },

  async update(id: string, organizationId: string, patch: Partial<StoreInput>): Promise<CustomerOrganization | null> {
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (patch.name !== undefined) updates.name = patch.name;
    if (patch.supportId !== undefined) updates.supportId = patch.supportId;
    if (patch.workspaceId !== undefined) updates.workspaceId = patch.workspaceId;
    if (patch.settings !== undefined) updates.settings = patch.settings;
    if (patch.externalMetadata !== undefined) updates.externalMetadata = patch.externalMetadata;
    if (patch.isActive !== undefined) updates.isActive = patch.isActive;
    const [row] = await db.update(customerOrganizations).set(updates)
      .where(and(eq(customerOrganizations.id, id), eq(customerOrganizations.organizationId, organizationId)))
      .returning();
    return row || null;
  },

  async remove(id: string, organizationId: string): Promise<boolean> {
    const result = await db.delete(customerOrganizations)
      .where(and(eq(customerOrganizations.id, id), eq(customerOrganizations.organizationId, organizationId)))
      .returning({ id: customerOrganizations.id });
    return result.length > 0;
  },

  /** List all manually-created stores (no externalSystemId) in an org — admin UI convenience. */
  async listManualOnly(organizationId: string): Promise<CustomerOrganization[]> {
    return db.select().from(customerOrganizations)
      .where(and(
        eq(customerOrganizations.organizationId, organizationId),
        isNull(customerOrganizations.externalSystemId),
      ));
  },
};
