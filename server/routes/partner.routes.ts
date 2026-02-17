import type { RouteContext } from './types';
import { z } from 'zod';
import { requireAuth, requireRole } from '../auth';
import { storage } from '../storage';
import { db } from '../db';
import { customers, stations, stationMembers, customerOrganizationMemberships } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';

function getSelectedOrgId(req: any): string | null {
  return (req.session as any)?.selectedOrganizationId || (req.user as any)?.organizationId || req.query?.organizationId || null;
}

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function generateApiKey(): string {
  const prefix = 'nova_pk_';
  const random = crypto.randomBytes(32).toString('hex');
  return prefix + random;
}

function generateTempPassword(): string {
  return crypto.randomBytes(16).toString('base64url');
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const partnerApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const validatePartnerApiKey = async (req: any, res: any, next: any) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

    if (!apiKey) {
      return res.status(401).json({ error: 'API key required. Provide via X-API-Key header or Authorization: Bearer <key>' });
    }

    const keyHash = hashApiKey(apiKey as string);
    const connection = await storage.getPartnerConnectionByApiKeyHash(keyHash);

    if (!connection) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    if (connection.status !== 'active') {
      return res.status(403).json({ error: 'Partner connection is not active' });
    }

    const partner = await storage.getPartnerIntegration(connection.partnerId);
    if (!partner || !partner.isActive) {
      return res.status(403).json({ error: 'Partner integration is not active' });
    }

    await storage.updatePartnerConnection(connection.id, { lastUsedAt: new Date() } as any);

    req.partnerConnection = connection;
    req.partnerIntegration = partner;
    req.partnerOrgId = connection.organizationId;
    next();
  } catch (error) {
    console.error('Partner API key validation error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

const hasPartnerPermission = (permission: string) => {
  return (req: any, res: any, next: any) => {
    const permissions = req.partnerConnection?.permissions || [];
    if (!permissions.includes(permission)) {
      return res.status(403).json({ error: `Missing permission: ${permission}` });
    }
    next();
  };
};

export function registerPartnerRoutes({ app }: RouteContext) {

  // ============================================
  // ADMIN ROUTES - Partner Marketplace Management
  // ============================================

  app.get('/api/admin/partner-integrations', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const integrations = await storage.getAllPartnerIntegrations();
      res.json({ integrations });
    } catch (error) {
      console.error('Error fetching partner integrations:', error);
      res.status(500).json({ error: 'Failed to fetch partner integrations' });
    }
  });

  app.get('/api/admin/partner-integrations/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const integration = await storage.getPartnerIntegration(req.params.id);
      if (!integration) return res.status(404).json({ error: 'Partner integration not found' });
      res.json({ integration });
    } catch (error) {
      console.error('Error fetching partner integration:', error);
      res.status(500).json({ error: 'Failed to fetch partner integration' });
    }
  });

  const createPartnerSchema = z.object({
    name: z.string().min(1).max(100),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
    displayName: z.string().min(1).max(200),
    description: z.string().optional(),
    category: z.enum(['pos', 'crm', 'erp', 'ecommerce', 'communication', 'analytics', 'other']).default('pos'),
    logoUrl: z.string().url().optional().nullable(),
    websiteUrl: z.string().url().optional().nullable(),
    documentationUrl: z.string().url().optional().nullable(),
    supportedFeatures: z.array(z.string()).optional(),
    setupInstructions: z.string().optional(),
    webhookEvents: z.array(z.string()).optional(),
    isPublic: z.boolean().optional(),
  });

  app.post('/api/admin/partner-integrations', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const data = createPartnerSchema.parse(req.body);
      const existing = await storage.getPartnerIntegrationBySlug(data.slug);
      if (existing) {
        return res.status(409).json({ error: 'A partner integration with this slug already exists' });
      }
      const integration = await storage.createPartnerIntegration(data as any);
      res.status(201).json({ integration });
    } catch (error: any) {
      if (error?.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: error.errors });
      console.error('Error creating partner integration:', error);
      res.status(500).json({ error: 'Failed to create partner integration' });
    }
  });

  app.patch('/api/admin/partner-integrations/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const existing = await storage.getPartnerIntegration(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Partner integration not found' });
      const integration = await storage.updatePartnerIntegration(req.params.id, req.body);
      res.json({ integration });
    } catch (error) {
      console.error('Error updating partner integration:', error);
      res.status(500).json({ error: 'Failed to update partner integration' });
    }
  });

  app.delete('/api/admin/partner-integrations/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      await storage.deletePartnerIntegration(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting partner integration:', error);
      res.status(500).json({ error: 'Failed to delete partner integration' });
    }
  });

  // ============================================
  // ADMIN ROUTES - Organization Partner Connections
  // ============================================

  app.get('/api/admin/partner-connections', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      if (!orgId) return res.status(400).json({ error: 'No organization selected' });
      const connections = await storage.getPartnerConnectionsByOrganization(orgId);
      const enriched = await Promise.all(connections.map(async (conn) => {
        const partner = await storage.getPartnerIntegration(conn.partnerId);
        return { ...conn, partner, apiKeyHash: undefined };
      }));
      res.json({ connections: enriched });
    } catch (error) {
      console.error('Error fetching partner connections:', error);
      res.status(500).json({ error: 'Failed to fetch partner connections' });
    }
  });

  const activatePartnerSchema = z.object({
    partnerId: z.string().min(1),
    externalAccountId: z.string().optional(),
    webhookUrl: z.string().url().optional(),
    settings: z.record(z.any()).optional(),
    permissions: z.array(z.string()).optional(),
  });

  app.post('/api/admin/partner-connections/activate', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      if (!orgId) return res.status(400).json({ error: 'No organization selected' });

      const data = activatePartnerSchema.parse(req.body);

      const partner = await storage.getPartnerIntegration(data.partnerId);
      if (!partner) return res.status(404).json({ error: 'Partner integration not found' });
      if (!partner.isActive) return res.status(400).json({ error: 'Partner integration is not active' });

      const existing = await storage.getPartnerConnectionByOrgAndPartner(orgId, data.partnerId);
      if (existing && existing.status === 'active') {
        return res.status(409).json({ error: 'This partner integration is already activated for your organization' });
      }

      const rawApiKey = generateApiKey();
      const keyHash = hashApiKey(rawApiKey);
      const keyPrefix = rawApiKey.substring(0, 16) + '...';

      const userId = (req.user as any)?.id;

      if (existing) {
        const connection = await storage.updatePartnerConnection(existing.id, {
          apiKeyHash: keyHash,
          apiKeyPrefix: keyPrefix,
          status: 'active',
          activatedBy: userId,
          activatedAt: new Date(),
          deactivatedAt: null,
          permissions: data.permissions || ['stations:read', 'stations:write', 'users:read', 'users:write', 'chat'],
          externalAccountId: data.externalAccountId,
          webhookUrl: data.webhookUrl,
          settings: data.settings,
        } as any);
        return res.json({
          connection: { ...connection, apiKeyHash: undefined },
          apiKey: rawApiKey,
          message: 'Partner connection reactivated. Save this API key securely - it will not be shown again.',
        });
      }

      const connection = await storage.createPartnerConnection({
        organizationId: orgId,
        partnerId: data.partnerId,
        apiKeyHash: keyHash,
        apiKeyPrefix: keyPrefix,
        status: 'active',
        permissions: data.permissions || ['stations:read', 'stations:write', 'users:read', 'users:write', 'chat'],
        externalAccountId: data.externalAccountId,
        webhookUrl: data.webhookUrl,
        settings: data.settings,
        activatedBy: userId,
      } as any);

      res.status(201).json({
        connection: { ...connection, apiKeyHash: undefined },
        apiKey: rawApiKey,
        message: 'Partner connection activated. Save this API key securely - it will not be shown again.',
        embedCode: `<!-- Nova AI Partner Integration (${partner.displayName}) -->\n<script>\n  window.NOVA_AI_CONFIG = {\n    partnerApiKey: '${rawApiKey}',\n    partnerId: '${partner.slug}'\n  };\n</script>`,
      });
    } catch (error: any) {
      if (error?.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: error.errors });
      console.error('Error activating partner connection:', error);
      res.status(500).json({ error: 'Failed to activate partner connection' });
    }
  });

  app.post('/api/admin/partner-connections/:id/rotate-key', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const connection = await storage.getPartnerConnection(req.params.id);
      if (!connection) return res.status(404).json({ error: 'Connection not found' });

      const orgId = getSelectedOrgId(req);
      if (connection.organizationId !== orgId) return res.status(403).json({ error: 'Access denied' });

      const rawApiKey = generateApiKey();
      const keyHash = hashApiKey(rawApiKey);
      const keyPrefix = rawApiKey.substring(0, 16) + '...';

      await storage.updatePartnerConnection(connection.id, {
        apiKeyHash: keyHash,
        apiKeyPrefix: keyPrefix,
      } as any);

      res.json({
        apiKey: rawApiKey,
        apiKeyPrefix: keyPrefix,
        message: 'API key rotated. Save this new key securely - the old key is now invalid.',
      });
    } catch (error) {
      console.error('Error rotating partner API key:', error);
      res.status(500).json({ error: 'Failed to rotate API key' });
    }
  });

  app.post('/api/admin/partner-connections/:id/deactivate', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const connection = await storage.getPartnerConnection(req.params.id);
      if (!connection) return res.status(404).json({ error: 'Connection not found' });

      const orgId = getSelectedOrgId(req);
      if (connection.organizationId !== orgId) return res.status(403).json({ error: 'Access denied' });

      await storage.updatePartnerConnection(connection.id, {
        status: 'inactive',
        deactivatedAt: new Date(),
      } as any);

      res.json({ success: true, message: 'Partner connection deactivated' });
    } catch (error) {
      console.error('Error deactivating partner connection:', error);
      res.status(500).json({ error: 'Failed to deactivate partner connection' });
    }
  });

  // ============================================
  // PUBLIC PARTNER API v1 - For third-party systems
  // ============================================

  const registerStationSchema = z.object({
    externalId: z.string().min(1, 'External station ID is required'),
    name: z.string().min(1, 'Station name is required').max(200),
    description: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional().default('US'),
    contactPhone: z.string().optional(),
    contactEmail: z.string().email().optional(),
    metadata: z.record(z.any()).optional(),
  });

  app.post('/api/partner/v1/stations', partnerApiLimiter, validatePartnerApiKey, hasPartnerPermission('stations:write'), async (req: any, res) => {
    try {
      const data = registerStationSchema.parse(req.body);
      const orgId = req.partnerOrgId;
      const partnerSlug = req.partnerIntegration.slug;

      let station = await storage.getStationByExternalId(orgId, data.externalId, partnerSlug);

      if (station) {
        station = await storage.updateStation(station.id, {
          name: data.name,
          description: data.description,
          address: data.address,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          country: data.country || 'US',
          contactPhone: data.contactPhone,
          contactEmail: data.contactEmail,
          settings: data.metadata ? { ...(station.settings as any || {}), partnerMetadata: data.metadata } : station.settings,
          isActive: true,
        } as any);

        return res.json({
          station: {
            id: station.id,
            externalId: station.externalId,
            name: station.name,
            slug: station.slug,
            isActive: station.isActive,
          },
          created: false,
          message: 'Station updated',
        });
      }

      const slug = slugify(data.name) + '-' + data.externalId.substring(0, 8);

      station = await storage.createStation({
        name: data.name,
        slug,
        description: data.description,
        organizationId: orgId,
        externalId: data.externalId,
        externalSystem: partnerSlug,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        country: data.country || 'US',
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail,
        settings: data.metadata ? { partnerMetadata: data.metadata } : null,
        isActive: true,
      } as any);

      res.status(201).json({
        station: {
          id: station.id,
          externalId: station.externalId,
          name: station.name,
          slug: station.slug,
          isActive: station.isActive,
        },
        created: true,
        message: 'Station registered',
      });
    } catch (error: any) {
      if (error?.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: error.errors });
      console.error('Error registering station:', error);
      res.status(500).json({ error: 'Failed to register station' });
    }
  });

  const registerUsersSchema = z.object({
    stationExternalId: z.string().min(1, 'Station external ID is required'),
    users: z.array(z.object({
      externalId: z.string().min(1, 'User external ID is required'),
      name: z.string().min(1, 'User name is required').max(200),
      email: z.string().email('Valid email is required'),
      phone: z.string().optional(),
      role: z.enum(['admin', 'member']).default('member'),
      metadata: z.record(z.any()).optional(),
    })).min(1, 'At least one user is required').max(100, 'Maximum 100 users per request'),
  });

  app.post('/api/partner/v1/stations/users', partnerApiLimiter, validatePartnerApiKey, hasPartnerPermission('users:write'), async (req: any, res) => {
    try {
      const data = registerUsersSchema.parse(req.body);
      const orgId = req.partnerOrgId;
      const partnerSlug = req.partnerIntegration.slug;

      const station = await storage.getStationByExternalId(orgId, data.stationExternalId, partnerSlug);
      if (!station) {
        return res.status(404).json({ error: `Station with external ID '${data.stationExternalId}' not found. Register the station first.` });
      }

      const results: Array<{
        externalId: string;
        customerId: string;
        email: string;
        name: string;
        created: boolean;
        portalAccess: boolean;
        activationToken?: string;
      }> = [];

      for (const userData of data.users) {
        let customer = await storage.getCustomerByEmail(userData.email);
        let created = false;

        if (!customer) {
          const tempPassword = generateTempPassword();
          const bcrypt = await import('bcryptjs');
          const hashedPassword = await bcrypt.hash(tempPassword, 10);

          customer = await storage.createCustomer({
            name: userData.name,
            email: userData.email,
            phone: userData.phone || null,
            tags: null,
          } as any);

          await db.update(customers)
            .set({
              organizationId: orgId,
              externalId: userData.externalId,
              externalSystem: partnerSlug,
              hasPortalAccess: true,
              portalPassword: hashedPassword,
              syncStatus: 'synced',
              lastSyncAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(customers.id, customer.id));

          created = true;

          results.push({
            externalId: userData.externalId,
            customerId: customer.id,
            email: userData.email,
            name: userData.name,
            created: true,
            portalAccess: true,
            activationToken: tempPassword,
          });
        } else {
          await db.update(customers)
            .set({
              name: userData.name,
              phone: userData.phone || customer.phone,
              organizationId: orgId,
              externalId: userData.externalId,
              externalSystem: partnerSlug,
              hasPortalAccess: true,
              syncStatus: 'synced',
              lastSyncAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(customers.id, customer.id));

          results.push({
            externalId: userData.externalId,
            customerId: customer.id,
            email: userData.email,
            name: userData.name,
            created: false,
            portalAccess: true,
          });
        }

        const existingMemberships = await db.select()
          .from(customerOrganizationMemberships)
          .where(and(
            eq(customerOrganizationMemberships.customerId, customer.id),
            eq(customerOrganizationMemberships.organizationId, orgId)
          ));

        if (existingMemberships.length === 0) {
          await db.insert(customerOrganizationMemberships).values({
            customerId: customer.id,
            organizationId: orgId,
            role: userData.role || 'member',
            status: 'active',
            joinedAt: new Date(),
          });
        }

        const existingStationMember = await db.select()
          .from(stationMembers)
          .where(and(
            eq(stationMembers.stationId, station.id),
            eq(stationMembers.customerId, customer.id)
          ));

        if (existingStationMember.length === 0) {
          await db.insert(stationMembers).values({
            stationId: station.id,
            customerId: customer.id,
            role: userData.role || 'member',
            status: 'active',
            joinedAt: new Date(),
          });
        }
      }

      res.status(201).json({
        stationId: station.id,
        stationName: station.name,
        users: results,
        message: `${results.filter(r => r.created).length} users created, ${results.filter(r => !r.created).length} users updated`,
      });
    } catch (error: any) {
      if (error?.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: error.errors });
      console.error('Error registering users:', error);
      res.status(500).json({ error: 'Failed to register users' });
    }
  });

  app.get('/api/partner/v1/stations', partnerApiLimiter, validatePartnerApiKey, hasPartnerPermission('stations:read'), async (req: any, res) => {
    try {
      const orgId = req.partnerOrgId;
      const partnerSlug = req.partnerIntegration.slug;
      const allStations = await storage.getStationsByOrganization(orgId);
      const partnerStations = allStations.filter((s: any) => s.externalSystem === partnerSlug);

      res.json({
        stations: partnerStations.map((s: any) => ({
          id: s.id,
          externalId: s.externalId,
          name: s.name,
          slug: s.slug,
          isActive: s.isActive,
          address: s.address,
          city: s.city,
          state: s.state,
          zipCode: s.zipCode,
          country: s.country,
        })),
        total: partnerStations.length,
      });
    } catch (error) {
      console.error('Error fetching partner stations:', error);
      res.status(500).json({ error: 'Failed to fetch stations' });
    }
  });

  app.get('/api/partner/v1/stations/:externalId', partnerApiLimiter, validatePartnerApiKey, hasPartnerPermission('stations:read'), async (req: any, res) => {
    try {
      const orgId = req.partnerOrgId;
      const partnerSlug = req.partnerIntegration.slug;
      const station = await storage.getStationByExternalId(orgId, req.params.externalId, partnerSlug);

      if (!station) {
        return res.status(404).json({ error: 'Station not found' });
      }

      const members = await storage.getStationMembers(station.id);

      res.json({
        station: {
          id: station.id,
          externalId: station.externalId,
          name: station.name,
          slug: station.slug,
          isActive: station.isActive,
          address: station.address,
          city: station.city,
          state: station.state,
          zipCode: station.zipCode,
          country: station.country,
        },
        members: members.map((m: any) => ({
          customerId: m.customerId,
          role: m.role,
          status: m.status,
        })),
      });
    } catch (error) {
      console.error('Error fetching partner station:', error);
      res.status(500).json({ error: 'Failed to fetch station' });
    }
  });

  app.patch('/api/partner/v1/stations/:externalId/deactivate', partnerApiLimiter, validatePartnerApiKey, hasPartnerPermission('stations:write'), async (req: any, res) => {
    try {
      const orgId = req.partnerOrgId;
      const partnerSlug = req.partnerIntegration.slug;
      const station = await storage.getStationByExternalId(orgId, req.params.externalId, partnerSlug);

      if (!station) {
        return res.status(404).json({ error: 'Station not found' });
      }

      await storage.updateStation(station.id, { isActive: false } as any);

      res.json({ success: true, message: 'Station deactivated' });
    } catch (error) {
      console.error('Error deactivating station:', error);
      res.status(500).json({ error: 'Failed to deactivate station' });
    }
  });

  app.delete('/api/partner/v1/stations/:externalId/users/:userExternalId', partnerApiLimiter, validatePartnerApiKey, hasPartnerPermission('users:write'), async (req: any, res) => {
    try {
      const orgId = req.partnerOrgId;
      const partnerSlug = req.partnerIntegration.slug;
      const station = await storage.getStationByExternalId(orgId, req.params.externalId, partnerSlug);

      if (!station) {
        return res.status(404).json({ error: 'Station not found' });
      }

      const [customer] = await db.select().from(customers).where(
        and(
          eq(customers.externalId, req.params.userExternalId),
          eq(customers.externalSystem, partnerSlug),
          eq(customers.organizationId, orgId)
        )
      );

      if (!customer) {
        return res.status(404).json({ error: 'User not found' });
      }

      await db.delete(stationMembers).where(
        and(
          eq(stationMembers.stationId, station.id),
          eq(stationMembers.customerId, customer.id)
        )
      );

      res.json({ success: true, message: 'User removed from station' });
    } catch (error) {
      console.error('Error removing user from station:', error);
      res.status(500).json({ error: 'Failed to remove user from station' });
    }
  });

  app.get('/api/partner/v1/users/:externalId', partnerApiLimiter, validatePartnerApiKey, hasPartnerPermission('users:read'), async (req: any, res) => {
    try {
      const orgId = req.partnerOrgId;
      const partnerSlug = req.partnerIntegration.slug;

      const [customer] = await db.select().from(customers).where(
        and(
          eq(customers.externalId, req.params.externalId),
          eq(customers.externalSystem, partnerSlug),
          eq(customers.organizationId, orgId)
        )
      );

      if (!customer) {
        return res.status(404).json({ error: 'User not found' });
      }

      const memberStations = await db.select().from(stationMembers).where(eq(stationMembers.customerId, customer.id));
      const stationDetails = await Promise.all(memberStations.map(async (m) => {
        const s = await storage.getStation(m.stationId);
        return s ? { id: s.id, externalId: s.externalId, name: s.name, role: m.role } : null;
      }));

      res.json({
        user: {
          id: customer.id,
          externalId: customer.externalId,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          hasPortalAccess: customer.hasPortalAccess,
        },
        stations: stationDetails.filter(Boolean),
      });
    } catch (error) {
      console.error('Error fetching partner user:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  const bulkRegisterSchema = z.object({
    stations: z.array(z.object({
      externalId: z.string().min(1),
      name: z.string().min(1).max(200),
      description: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      country: z.string().optional().default('US'),
      contactPhone: z.string().optional(),
      contactEmail: z.string().email().optional(),
      users: z.array(z.object({
        externalId: z.string().min(1),
        name: z.string().min(1).max(200),
        email: z.string().email(),
        phone: z.string().optional(),
        role: z.enum(['admin', 'member']).default('member'),
      })).optional(),
    })).min(1, 'At least one station is required').max(50, 'Maximum 50 stations per request'),
  });

  app.post('/api/partner/v1/bulk/register', partnerApiLimiter, validatePartnerApiKey, hasPartnerPermission('stations:write'), hasPartnerPermission('users:write'), async (req: any, res) => {
    try {
      const data = bulkRegisterSchema.parse(req.body);
      const orgId = req.partnerOrgId;
      const partnerSlug = req.partnerIntegration.slug;

      const results: Array<{
        stationExternalId: string;
        stationId: string;
        stationCreated: boolean;
        users: Array<{ externalId: string; customerId: string; created: boolean; activationToken?: string }>;
      }> = [];

      for (const stationData of data.stations) {
        let station = await storage.getStationByExternalId(orgId, stationData.externalId, partnerSlug);
        let stationCreated = false;

        if (!station) {
          const slug = slugify(stationData.name) + '-' + stationData.externalId.substring(0, 8);
          station = await storage.createStation({
            name: stationData.name,
            slug,
            description: stationData.description,
            organizationId: orgId,
            externalId: stationData.externalId,
            externalSystem: partnerSlug,
            address: stationData.address,
            city: stationData.city,
            state: stationData.state,
            zipCode: stationData.zipCode,
            country: stationData.country || 'US',
            contactPhone: stationData.contactPhone,
            contactEmail: stationData.contactEmail,
            isActive: true,
          } as any);
          stationCreated = true;
        }

        const userResults: Array<{ externalId: string; customerId: string; created: boolean; activationToken?: string }> = [];

        if (stationData.users) {
          for (const userData of stationData.users) {
            let customer = await storage.getCustomerByEmail(userData.email);
            let userCreated = false;
            let activationToken: string | undefined;

            if (!customer) {
              const tempPassword = generateTempPassword();
              const bcrypt = await import('bcryptjs');
              const hashedPassword = await bcrypt.hash(tempPassword, 10);

              customer = await storage.createCustomer({
                name: userData.name,
                email: userData.email,
                phone: userData.phone || null,
                tags: null,
              } as any);

              await db.update(customers)
                .set({
                  organizationId: orgId,
                  externalId: userData.externalId,
                  externalSystem: partnerSlug,
                  hasPortalAccess: true,
                  portalPassword: hashedPassword,
                  syncStatus: 'synced',
                  lastSyncAt: new Date(),
                  updatedAt: new Date(),
                })
                .where(eq(customers.id, customer.id));

              userCreated = true;
              activationToken = tempPassword;
            } else {
              await db.update(customers)
                .set({
                  organizationId: orgId,
                  externalId: userData.externalId,
                  externalSystem: partnerSlug,
                  hasPortalAccess: true,
                  syncStatus: 'synced',
                  lastSyncAt: new Date(),
                  updatedAt: new Date(),
                })
                .where(eq(customers.id, customer.id));
            }

            const existingMembership = await db.select()
              .from(customerOrganizationMemberships)
              .where(and(
                eq(customerOrganizationMemberships.customerId, customer.id),
                eq(customerOrganizationMemberships.organizationId, orgId)
              ));

            if (existingMembership.length === 0) {
              await db.insert(customerOrganizationMemberships).values({
                customerId: customer.id,
                organizationId: orgId,
                role: userData.role || 'member',
                status: 'active',
                joinedAt: new Date(),
              });
            }

            const existingStationMember = await db.select()
              .from(stationMembers)
              .where(and(
                eq(stationMembers.stationId, station.id),
                eq(stationMembers.customerId, customer.id)
              ));

            if (existingStationMember.length === 0) {
              await db.insert(stationMembers).values({
                stationId: station.id,
                customerId: customer.id,
                role: userData.role || 'member',
                status: 'active',
                joinedAt: new Date(),
              });
            }

            userResults.push({
              externalId: userData.externalId,
              customerId: customer.id,
              created: userCreated,
              activationToken,
            });
          }
        }

        results.push({
          stationExternalId: stationData.externalId,
          stationId: station.id,
          stationCreated,
          users: userResults,
        });
      }

      res.status(201).json({
        results,
        summary: {
          stationsCreated: results.filter(r => r.stationCreated).length,
          stationsUpdated: results.filter(r => !r.stationCreated).length,
          usersCreated: results.reduce((sum, r) => sum + r.users.filter(u => u.created).length, 0),
          usersUpdated: results.reduce((sum, r) => sum + r.users.filter(u => !u.created).length, 0),
        },
        message: 'Bulk registration completed',
      });
    } catch (error: any) {
      if (error?.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: error.errors });
      console.error('Error in bulk registration:', error);
      res.status(500).json({ error: 'Failed to complete bulk registration' });
    }
  });

  app.get('/api/partner/v1/health', partnerApiLimiter, validatePartnerApiKey, async (req: any, res) => {
    try {
      const partner = req.partnerIntegration;
      const connection = req.partnerConnection;
      res.json({
        status: 'ok',
        partner: partner.displayName,
        organizationId: connection.organizationId,
        permissions: connection.permissions,
        connectedAt: connection.activatedAt,
      });
    } catch (error) {
      res.status(500).json({ status: 'error', message: 'Health check failed' });
    }
  });

  app.get('/api/marketplace/integrations', async (req, res) => {
    try {
      const integrations = await storage.getAllPartnerIntegrations(true);
      const publicIntegrations = integrations.filter(i => i.isPublic);
      res.json({
        integrations: publicIntegrations.map(i => ({
          id: i.id,
          name: i.name,
          slug: i.slug,
          displayName: i.displayName,
          description: i.description,
          category: i.category,
          logoUrl: i.logoUrl,
          websiteUrl: i.websiteUrl,
          supportedFeatures: i.supportedFeatures,
        })),
      });
    } catch (error) {
      console.error('Error fetching marketplace integrations:', error);
      res.status(500).json({ error: 'Failed to fetch integrations' });
    }
  });
}
