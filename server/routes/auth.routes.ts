import type { RouteContext } from './types';
import { z } from 'zod';
import { compare, hash } from 'bcryptjs';
import passport from '../auth';
import { requireAuth, requireRole } from '../auth';
import { storage } from '../storage';
import { authLimiter, csrfProtection } from './shared';

export function registerAuthRoutes({ app }: RouteContext) {
  app.post('/api/auth/login', authLimiter, csrfProtection, (req, res, next) => {
    passport.authenticate('local', async (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ error: 'Authentication error' });
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || 'Invalid credentials' });
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
          
          req.session.save((saveErr) => {
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
            
            res.json({ 
              user, 
              workspaces,
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

      req.session.regenerate((regenerateErr: any) => {
        if (regenerateErr) {
          return res.status(500).json({ error: 'Session regeneration failed' });
        }

        (req.session as any).customerId = customer.id;
        (req.session as any).userType = 'customer';

        const { portalPassword: _, ...customerData } = customer;
        res.json({ customer: customerData, message: 'Login successful' });
      });
    } catch (error) {
      console.error('Customer portal login error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request data' });
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
        return res.status(400).json({ error: 'Invalid request data' });
      }
      res.status(500).json({ error: 'Failed to set password' });
    }
  });
}
