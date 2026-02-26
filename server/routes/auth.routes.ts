import type { RouteContext } from './types';
import { z } from 'zod';
import { compare, hash } from 'bcryptjs';
import passport from '../auth';
import { requireAuth, requireRole } from '../auth';
import { storage } from '../storage';
import { authLimiter, csrfProtection } from './shared';
import { db } from '../db';
import { organizationMembers, organizations } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { zodErrorResponse } from '../middleware/errors';
import { pending2FASessions } from './two-factor.routes';
import { randomUUID } from 'crypto';

export function registerAuthRoutes({ app }: RouteContext) {
  app.post('/api/auth/login', authLimiter, csrfProtection, (req, res, next) => {
    passport.authenticate('local', async (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ error: 'Authentication error' });
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || 'Invalid credentials' });
      }

      // Check for 2FA requirement
      if (user.twoFactorEnabled) {
        const tempToken = randomUUID();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        pending2FASessions.set(tempToken, { userId: user.id, expiresAt });
        
        return res.json({ 
          requiresTwoFactor: true, 
          tempToken,
          message: 'Two-factor authentication required' 
        });
      }
      
      req.session.regenerate(async (regenerateErr: any) => {
        if (regenerateErr) {
          console.error('Session regeneration error:', regenerateErr);
          return res.status(500).json({ error: 'Session regeneration failed' });
        }
        
        req.logIn(user, async (loginErr) => {
          if (loginErr) {
            console.error('Login error:', loginErr);
            return res.status(500).json({ error: 'Login failed' });
          }
          
          // Fetch user's workspaces to determine routing
          let workspaces: Array<{ id: string; name: string; role: string }> = [];
          try {
            const memberships = await storage.getWorkspaceMembersByUser(user.id);
            const activeMembers = memberships.filter(m => m.status === 'active');
            workspaces = await Promise.all(
              activeMembers.map(async (m) => {
                const ws = await storage.getWorkspace(m.workspaceId);
                return ws ? { id: ws.id, name: ws.name, role: m.role } : null;
              })
            ).then(results => results.filter(Boolean) as Array<{ id: string; name: string; role: string }>);
          } catch (wsErr) {
            console.error('Error fetching workspaces:', wsErr);
          }
          
          req.session.save(async (saveErr) => {
            if (saveErr) {
              console.error('Session save error:', saveErr);
              return res.status(500).json({ error: 'Session save failed' });
            }
            
            console.log('✅ Login successful:', user.email, '| Session ID:', req.sessionID, '| Workspaces:', workspaces.length);
            
            // Determine redirect based on role and workspace count
            let redirectTo = '/dashboard';
            if (workspaces.length > 1) {
              redirectTo = '/workspace-select';
            } else if (user.role === 'agent') {
              redirectTo = '/conversations';
            }
            
            // Enrich user with organization name if they have an organizationId
            let organizationName = null;
            if (user.organizationId) {
              try {
                const org = await storage.getOrganization(user.organizationId);
                organizationName = org?.name || null;
              } catch (orgErr) {
                console.error('Error fetching organization:', orgErr);
              }
            }

            // Fetch all organization memberships for multi-org users
            let orgMemberships: Array<{ organizationId: string; organizationName: string; role: string }> = [];
            try {
              const members = await db.select().from(organizationMembers)
                .where(and(
                  eq(organizationMembers.userId, user.id),
                  eq(organizationMembers.status, 'active')
                ));
              orgMemberships = await Promise.all(
                members.map(async (m) => {
                  const org = await storage.getOrganization(m.organizationId);
                  return org ? { organizationId: org.id, organizationName: org.name, role: m.role } : null;
                })
              ).then(results => results.filter(Boolean) as Array<{ organizationId: string; organizationName: string; role: string }>);
            } catch (orgErr) {
              console.error('Error fetching org memberships:', orgErr);
            }

            // If user has primary org but no membership entry, include it
            if (user.organizationId && !orgMemberships.find((m: any) => m.organizationId === user.organizationId)) {
              orgMemberships.unshift({ organizationId: user.organizationId, organizationName: organizationName || 'Primary Organization', role: 'admin' });
            }

            // Store selected org in session (default to primary org)
            (req.session as any).selectedOrganizationId = user.organizationId || (orgMemberships.length > 0 ? orgMemberships[0].organizationId : null);

            // Update redirect for multi-org selection
            if (orgMemberships.length > 1 && !user.organizationId) {
              redirectTo = '/org-select';
            }
            
            res.json({ 
              user: { ...user, organizationName }, 
              workspaces,
              organizations: orgMemberships,
              redirectTo,
              message: 'Login successful' 
            });
          });
        });
      });
    })(req, res, next);
  });

  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error('Session destroy error:', destroyErr);
        }
        
        res.clearCookie('sessionId', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
        
        res.json({ message: 'Logout successful' });
      });
    });
  });

  app.get('/api/auth/me', (req, res) => {
    if (req.isAuthenticated()) {
      res.json({ user: req.user });
    } else {
      res.status(401).json({ error: 'Not authenticated' });
    }
  });

  app.post('/api/auth/complete-onboarding', requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      await storage.completeUserOnboarding(userId);
      res.json({ success: true, message: 'Onboarding completed' });
    } catch (error) {
      console.error('Complete onboarding error:', error);
      res.status(500).json({ error: 'Failed to complete onboarding' });
    }
  });

  app.post('/api/portal/auth/login', authLimiter, csrfProtection, async (req, res) => {
    try {
      const loginData = z.object({
        email: z.string().email(),
        password: z.string(),
      }).parse(req.body);

      const customer = await storage.getCustomerByEmail(loginData.email);
      if (!customer) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      if (!customer.hasPortalAccess || !customer.portalPassword) {
        return res.status(403).json({ error: 'Portal access not granted. Please contact support.' });
      }

      const isValidPassword = await compare(loginData.password, customer.portalPassword);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      await storage.updateCustomerPortalLastLogin(customer.id);

      // Fetch customer's organization memberships for multi-org portal access
      let customerOrgMemberships: Array<{ organizationId: string; organizationName: string; role: string }> = [];
      try {
        const memberships = await storage.getCustomerOrganizationMemberships(customer.id);
        const activeMemberships = memberships.filter(m => m.status === 'active');
        customerOrgMemberships = await Promise.all(
          activeMemberships.map(async (m) => {
            const org = await storage.getOrganization(m.organizationId);
            return org ? { organizationId: org.id, organizationName: org.name, role: m.role } : null;
          })
        ).then(results => results.filter(Boolean) as Array<{ organizationId: string; organizationName: string; role: string }>);
      } catch (orgErr) {
        console.error('Error fetching customer org memberships:', orgErr);
      }

      // If customer has a legacy organizationId but no membership entry, include it
      if (customer.organizationId && !customerOrgMemberships.find(m => m.organizationId === customer.organizationId)) {
        const org = await storage.getOrganization(customer.organizationId);
        if (org) {
          customerOrgMemberships.unshift({ organizationId: org.id, organizationName: org.name, role: 'member' });
        }
      }

      // Fetch customer's stations
      let customerStations: Array<{ stationId: string; stationName: string; role: string; organizationId: string }> = [];
      try {
        const stationList = await storage.getStationsByCustomer(customer.id);
        customerStations = stationList.map(s => ({
          stationId: s.id,
          stationName: s.name,
          role: 'member',
          organizationId: s.organizationId,
        }));
      } catch (stErr) {
        console.error('Error fetching customer stations:', stErr);
      }

      req.session.regenerate((regenerateErr: any) => {
        if (regenerateErr) {
          return res.status(500).json({ error: 'Session regeneration failed' });
        }

        (req.session as any).customerId = customer.id;
        (req.session as any).userType = 'customer';
        (req.session as any).selectedOrganizationId = customer.organizationId || (customerOrgMemberships.length > 0 ? customerOrgMemberships[0].organizationId : null);

        const { portalPassword: _, ...customerData } = customer;
        
        // Determine redirect: if multi-org, go to org selection
        const redirectTo = customerOrgMemberships.length > 1 ? '/portal/org-select' : '/portal';
        
        res.json({ 
          customer: customerData, 
          organizations: customerOrgMemberships,
          stations: customerStations,
          redirectTo,
          message: 'Login successful' 
        });
      });
    } catch (error) {
      console.error('Customer portal login error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(zodErrorResponse(error));
      }
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.post('/api/portal/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Customer portal logout error:', err);
        return res.status(500).json({ error: 'Logout failed' });
      }
      
      res.clearCookie('sessionId', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      
      res.json({ message: 'Logout successful' });
    });
  });

  app.get('/api/portal/auth/me', async (req, res) => {
    try {
      const customerId = (req.session as any)?.customerId;
      const userType = (req.session as any)?.userType;
      
      if (!customerId || userType !== 'customer') {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        return res.status(401).json({ error: 'Customer not found' });
      }

      const { portalPassword: _, ...customerData } = customer;
      res.json({ customer: customerData });
    } catch (error) {
      console.error('Get customer session error:', error);
      res.status(500).json({ error: 'Failed to get session' });
    }
  });

  // Organization context selection for staff users
  app.post('/api/auth/select-organization', requireAuth, async (req, res) => {
    try {
      const { organizationId } = z.object({
        organizationId: z.string(),
      }).parse(req.body);

      const userId = (req.user as any)?.id;
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ error: 'User not found' });

      // Verify user has access to this organization (either primary org or via membership)
      let hasAccess = user.organizationId === organizationId || user.isPlatformAdmin;
      if (!hasAccess) {
        const members = await db.select().from(organizationMembers)
          .where(and(
            eq(organizationMembers.userId, userId),
            eq(organizationMembers.organizationId, organizationId),
            eq(organizationMembers.status, 'active')
          ));
        hasAccess = members.length > 0;
      }

      if (!hasAccess) {
        return res.status(403).json({ error: 'No access to this organization' });
      }

      (req.session as any).selectedOrganizationId = organizationId;
      const org = await storage.getOrganization(organizationId);

      req.session.save(() => {
        res.json({ 
          selectedOrganizationId: organizationId, 
          organizationName: org?.name || null,
          message: 'Organization context updated' 
        });
      });
    } catch (error) {
      console.error('Select organization error:', error);
      res.status(500).json({ error: 'Failed to select organization' });
    }
  });

  // Organization context selection for customer portal
  app.post('/api/portal/auth/select-organization', async (req, res) => {
    try {
      const customerId = (req.session as any)?.customerId;
      if (!customerId) return res.status(401).json({ error: 'Not authenticated' });

      const { organizationId } = z.object({
        organizationId: z.string(),
      }).parse(req.body);

      // Verify customer has membership in this organization
      const membership = await storage.getCustomerOrganizationMembership(customerId, organizationId);
      const customer = await storage.getCustomer(customerId);
      
      const hasAccess = membership?.status === 'active' || customer?.organizationId === organizationId;
      if (!hasAccess) {
        return res.status(403).json({ error: 'No access to this organization' });
      }

      (req.session as any).selectedOrganizationId = organizationId;
      const org = await storage.getOrganization(organizationId);

      req.session.save(() => {
        res.json({ 
          selectedOrganizationId: organizationId,
          organizationName: org?.name || null,
          branding: org ? { logo: org.logo, primaryColor: org.primaryColor, secondaryColor: org.secondaryColor, welcomeMessage: org.welcomeMessage } : null,
          message: 'Organization context updated' 
        });
      });
    } catch (error) {
      console.error('Customer select organization error:', error);
      res.status(500).json({ error: 'Failed to select organization' });
    }
  });

  app.post('/api/portal/set-password', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { customerId, password } = z.object({
        customerId: z.string().uuid(),
        password: z.string().min(6, 'Password must be at least 6 characters'),
      }).parse(req.body);

      const hashedPassword = await hash(password, 10);
      await storage.setCustomerPortalPassword(customerId, hashedPassword);
      
      res.json({ success: true, message: 'Portal access granted successfully' });
    } catch (error) {
      console.error('Set customer password error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(zodErrorResponse(error));
      }
      res.status(500).json({ error: 'Failed to set password' });
    }
  });
}
