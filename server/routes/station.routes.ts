import type { RouteContext } from './types';
import { z } from 'zod';
import { requireAuth, requireRole } from '../auth';
import { storage } from '../storage';

function getSelectedOrgId(req: any): string | null {
  return (req.session as any)?.selectedOrganizationId || (req.user as any)?.organizationId || null;
}

export function registerStationRoutes({ app }: RouteContext) {
  // ============================================
  // STATION CRUD (org-scoped)
  // ============================================

  app.get('/api/stations', requireAuth, async (req, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      if (!orgId) {
        return res.status(400).json({ error: 'Organization context required' });
      }
      const stationList = await storage.getStationsByOrganization(orgId);
      res.json({ stations: stationList });
    } catch (error) {
      console.error('Error fetching stations:', error);
      res.status(500).json({ error: 'Failed to fetch stations' });
    }
  });

  app.get('/api/stations/:id', requireAuth, async (req, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      const station = await storage.getStation(req.params.id);
      if (!station) {
        return res.status(404).json({ error: 'Station not found' });
      }
      if (orgId && station.organizationId !== orgId && !(req.user as any)?.isPlatformAdmin) {
        return res.status(403).json({ error: 'Access denied to this station' });
      }
      const members = await storage.getStationMembers(station.id);
      res.json({ station, members });
    } catch (error) {
      console.error('Error fetching station:', error);
      res.status(500).json({ error: 'Failed to fetch station' });
    }
  });

  app.post('/api/stations', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      if (!orgId) {
        return res.status(400).json({ error: 'Organization context required' });
      }

      const data = z.object({
        name: z.string().min(1),
        slug: z.string().min(1),
        description: z.string().optional(),
        workspaceId: z.string().optional(),
        departmentId: z.string().optional(),
      }).parse(req.body);

      const station = await storage.createStation({ ...data, organizationId: orgId });
      res.status(201).json({ station });
    } catch (error) {
      console.error('Error creating station:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to create station' });
    }
  });

  app.patch('/api/stations/:id', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      const station = await storage.getStation(req.params.id);
      if (!station) return res.status(404).json({ error: 'Station not found' });
      if (orgId && station.organizationId !== orgId && !(req.user as any)?.isPlatformAdmin) {
        return res.status(403).json({ error: 'Access denied to this station' });
      }

      const updates = z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      }).parse(req.body);

      const updated = await storage.updateStation(req.params.id, updates);
      res.json({ station: updated });
    } catch (error) {
      console.error('Error updating station:', error);
      res.status(500).json({ error: 'Failed to update station' });
    }
  });

  app.delete('/api/stations/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      const station = await storage.getStation(req.params.id);
      if (!station) return res.status(404).json({ error: 'Station not found' });
      if (orgId && station.organizationId !== orgId && !(req.user as any)?.isPlatformAdmin) {
        return res.status(403).json({ error: 'Access denied to this station' });
      }

      await storage.deleteStation(req.params.id);
      res.json({ message: 'Station deleted' });
    } catch (error) {
      console.error('Error deleting station:', error);
      res.status(500).json({ error: 'Failed to delete station' });
    }
  });

  // ============================================
  // STATION MEMBERS (org-scoped via station)
  // ============================================

  app.get('/api/stations/:id/members', requireAuth, async (req, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      const station = await storage.getStation(req.params.id);
      if (!station) return res.status(404).json({ error: 'Station not found' });
      if (orgId && station.organizationId !== orgId && !(req.user as any)?.isPlatformAdmin) {
        return res.status(403).json({ error: 'Access denied to this station' });
      }

      const members = await storage.getStationMembers(req.params.id);
      res.json({ members });
    } catch (error) {
      console.error('Error fetching station members:', error);
      res.status(500).json({ error: 'Failed to fetch station members' });
    }
  });

  app.post('/api/stations/:id/members', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      const station = await storage.getStation(req.params.id);
      if (!station) return res.status(404).json({ error: 'Station not found' });
      if (orgId && station.organizationId !== orgId && !(req.user as any)?.isPlatformAdmin) {
        return res.status(403).json({ error: 'Access denied to this station' });
      }

      const data = z.object({
        customerId: z.string(),
        role: z.enum(['admin', 'member']).default('member'),
      }).parse(req.body);

      const member = await storage.addStationMember({
        stationId: req.params.id,
        customerId: data.customerId,
        role: data.role,
        joinedAt: new Date(),
      });
      res.status(201).json({ member });
    } catch (error) {
      console.error('Error adding station member:', error);
      res.status(500).json({ error: 'Failed to add station member' });
    }
  });

  app.patch('/api/stations/:id/members/:memberId/role', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      const station = await storage.getStation(req.params.id);
      if (!station) return res.status(404).json({ error: 'Station not found' });
      if (orgId && station.organizationId !== orgId && !(req.user as any)?.isPlatformAdmin) {
        return res.status(403).json({ error: 'Access denied to this station' });
      }

      const { role } = z.object({
        role: z.enum(['admin', 'member']),
      }).parse(req.body);

      await storage.updateStationMemberRole(req.params.memberId, role);
      res.json({ message: 'Member role updated' });
    } catch (error) {
      console.error('Error updating station member role:', error);
      res.status(500).json({ error: 'Failed to update member role' });
    }
  });

  app.delete('/api/stations/:id/members/:memberId', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      const station = await storage.getStation(req.params.id);
      if (!station) return res.status(404).json({ error: 'Station not found' });
      if (orgId && station.organizationId !== orgId && !(req.user as any)?.isPlatformAdmin) {
        return res.status(403).json({ error: 'Access denied to this station' });
      }

      await storage.removeStationMember(req.params.memberId);
      res.json({ message: 'Member removed from station' });
    } catch (error) {
      console.error('Error removing station member:', error);
      res.status(500).json({ error: 'Failed to remove member' });
    }
  });

  // ============================================
  // CUSTOMER ORGANIZATION MEMBERSHIPS (org-scoped)
  // ============================================

  app.get('/api/customer-memberships/:customerId', requireAuth, async (req, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      const memberships = await storage.getCustomerOrganizationMemberships(req.params.customerId);
      const filtered = orgId && !(req.user as any)?.isPlatformAdmin
        ? memberships.filter(m => m.organizationId === orgId)
        : memberships;
      const enriched = await Promise.all(
        filtered.map(async (m) => {
          const org = await storage.getOrganization(m.organizationId);
          return { ...m, organizationName: org?.name || null, organizationLogo: org?.logo || null };
        })
      );
      res.json({ memberships: enriched });
    } catch (error) {
      console.error('Error fetching customer memberships:', error);
      res.status(500).json({ error: 'Failed to fetch memberships' });
    }
  });

  app.post('/api/customer-memberships', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      if (!orgId) {
        return res.status(400).json({ error: 'Organization context required' });
      }

      const data = z.object({
        customerId: z.string(),
        role: z.enum(['admin', 'member']).default('member'),
      }).parse(req.body);

      const membership = await storage.createCustomerOrganizationMembership({
        customerId: data.customerId,
        organizationId: orgId,
        role: data.role,
        status: 'active',
        joinedAt: new Date(),
      });
      res.status(201).json({ membership });
    } catch (error) {
      console.error('Error creating customer membership:', error);
      res.status(500).json({ error: 'Failed to create membership' });
    }
  });

  app.delete('/api/customer-memberships/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      await storage.deleteCustomerOrganizationMembership(req.params.id);
      res.json({ message: 'Membership removed' });
    } catch (error) {
      console.error('Error deleting customer membership:', error);
      res.status(500).json({ error: 'Failed to delete membership' });
    }
  });

  // ============================================
  // SUB-ORGANIZATION HIERARCHY (org-scoped)
  // ============================================

  app.get('/api/organizations/:id/children', requireAuth, async (req, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      if (orgId && req.params.id !== orgId && !(req.user as any)?.isPlatformAdmin) {
        return res.status(403).json({ error: 'Access denied' });
      }
      const children = await storage.getChildOrganizations(req.params.id);
      res.json({ organizations: children });
    } catch (error) {
      console.error('Error fetching child organizations:', error);
      res.status(500).json({ error: 'Failed to fetch child organizations' });
    }
  });

  // ============================================
  // CUSTOMER PORTAL - My Stations
  // ============================================

  app.get('/api/portal/my-stations', async (req, res) => {
    try {
      const customerId = (req.session as any)?.customerId;
      if (!customerId) return res.status(401).json({ error: 'Not authenticated' });

      const stationList = await storage.getStationsByCustomer(customerId);
      const selectedOrgId = (req.session as any)?.selectedOrganizationId;
      const filtered = selectedOrgId ? stationList.filter(s => s.organizationId === selectedOrgId) : stationList;
      res.json({ stations: filtered });
    } catch (error) {
      console.error('Error fetching customer stations:', error);
      res.status(500).json({ error: 'Failed to fetch stations' });
    }
  });

  app.get('/api/portal/my-organizations', async (req, res) => {
    try {
      const customerId = (req.session as any)?.customerId;
      if (!customerId) return res.status(401).json({ error: 'Not authenticated' });

      const memberships = await storage.getCustomerOrganizationMemberships(customerId);
      const enriched = await Promise.all(
        memberships.filter(m => m.status === 'active').map(async (m) => {
          const org = await storage.getOrganization(m.organizationId);
          return org ? { 
            organizationId: org.id, 
            organizationName: org.name, 
            organizationLogo: org.logo,
            primaryColor: org.primaryColor,
            role: m.role 
          } : null;
        })
      ).then(results => results.filter(Boolean));

      const customer = await storage.getCustomer(customerId);
      if (customer?.organizationId && !enriched.find((m: any) => m?.organizationId === customer.organizationId)) {
        const org = await storage.getOrganization(customer.organizationId);
        if (org) {
          enriched.unshift({ organizationId: org.id, organizationName: org.name, organizationLogo: org.logo, primaryColor: org.primaryColor, role: 'member' });
        }
      }

      res.json({ organizations: enriched });
    } catch (error) {
      console.error('Error fetching customer organizations:', error);
      res.status(500).json({ error: 'Failed to fetch organizations' });
    }
  });
}
