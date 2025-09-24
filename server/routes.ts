import type { Express } from "express";
import { createServer, type Server } from "http";
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import passport from './auth';
import { requireAuth, requireRole } from './auth';
import { storage } from "./storage";
import { 
  insertMessageSchema, 
  insertCustomerSchema, 
  insertConversationSchema 
} from '@shared/schema';

export async function registerRoutes(app: Express): Promise<Server> {
  // Rate limiting for authentication
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: { error: 'Too many authentication attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // CSRF protection middleware
  const csrfProtection = (req: any, res: any, next: any) => {
    // Skip CSRF for GET requests
    if (req.method === 'GET') {
      return next();
    }
    
    const origin = req.get('Origin');
    const referer = req.get('Referer');
    const host = req.get('Host');
    
    // Check origin header
    if (origin && !origin.includes(host)) {
      return res.status(403).json({ error: 'Invalid origin' });
    }
    
    // Check referer header as fallback
    if (!origin && referer && !referer.includes(host)) {
      return res.status(403).json({ error: 'Invalid referer' });
    }
    
    next();
  };

  // Authentication routes
  app.post('/api/auth/login', authLimiter, csrfProtection, (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ error: 'Authentication error' });
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || 'Invalid credentials' });
      }
      
      // Regenerate session to prevent fixation
      req.session.regenerate((regenerateErr: any) => {
        if (regenerateErr) {
          return res.status(500).json({ error: 'Session regeneration failed' });
        }
        
        req.logIn(user, (loginErr) => {
          if (loginErr) {
            return res.status(500).json({ error: 'Login failed' });
          }
          res.json({ user, message: 'Login successful' });
        });
      });
    })(req, res, next);
  });

  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      
      // Destroy the session and clear cookie
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error('Session destroy error:', destroyErr);
        }
        
        // Clear the session cookie
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

  // User management routes (admin only)
  app.get('/api/users', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const safeUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // Customer management routes
  app.get('/api/customers', requireAuth, async (req, res) => {
    try {
      const customers = await storage.getAllCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch customers' });
    }
  });

  // Conversation management routes
  app.get('/api/conversations', requireAuth, async (req, res) => {
    try {
      const conversations = await storage.getAllConversations();
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  });

  app.get('/api/conversations/:id/messages', requireAuth, async (req, res) => {
    try {
      const messages = await storage.getMessagesByConversation(req.params.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  app.patch('/api/conversations/:id/assign', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { agentId } = req.body;
      await storage.assignConversation(req.params.id, agentId);
      res.json({ message: 'Conversation assigned successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to assign conversation' });
    }
  });

  app.patch('/api/conversations/:id/status', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { status } = req.body;
      await storage.updateConversationStatus(req.params.id, status);
      res.json({ message: 'Conversation status updated successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update conversation status' });
    }
  });

  // Message management routes
  app.post('/api/messages', requireAuth, async (req, res) => {
    try {
      const { conversationId, content } = req.body;
      const user = req.user as any;
      
      // Validate required fields
      if (!conversationId || !content) {
        return res.status(400).json({ error: 'conversationId and content are required' });
      }
      
      // Determine sender type from user role
      const senderType = user.role === 'admin' ? 'admin' : 'agent';
      
      const message = await storage.createMessage({
        conversationId,
        senderId: user.id,
        senderType,
        content,
        timestamp: new Date()
      });
      
      res.status(201).json(message);
    } catch (error) {
      console.error('Message creation error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: fromZodError(error).toString() 
        });
      }
      res.status(500).json({ error: 'Failed to create message' });
    }
  });

  app.patch('/api/messages/:id/status', requireAuth, async (req, res) => {
    try {
      const { status } = req.body;
      await storage.updateMessageStatus(req.params.id, status);
      res.json({ message: 'Message status updated successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update message status' });
    }
  });

  // Dashboard and analytics routes
  app.get('/api/dashboard/stats', requireAuth, async (req, res) => {
    try {
      const [conversations, customers, users] = await Promise.all([
        storage.getAllConversations(),
        storage.getAllCustomers(),
        storage.getAllUsers()
      ]);

      // Calculate statistics
      const totalConversations = conversations.length;
      const openConversations = conversations.filter(c => c.status === 'open').length;
      const pendingConversations = conversations.filter(c => c.status === 'pending').length;
      const resolvedConversations = conversations.filter(c => c.status === 'resolved').length;
      
      const totalCustomers = customers.length;
      const onlineCustomers = customers.filter(c => c.status === 'online').length;
      const totalAgents = users.filter(u => u.role === 'agent').length;
      const onlineAgents = users.filter(u => u.role === 'agent' && u.status === 'online').length;

      const stats = {
        conversations: {
          total: totalConversations,
          open: openConversations,
          pending: pendingConversations,
          resolved: resolvedConversations
        },
        customers: {
          total: totalCustomers,
          online: onlineCustomers
        },
        agents: {
          total: totalAgents,
          online: onlineAgents
        }
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
  });

  // Enhanced conversation routes with filtering
  app.get('/api/conversations/by-status/:status', requireAuth, async (req, res) => {
    try {
      const conversations = await storage.getAllConversations();
      const filtered = conversations.filter(c => c.status === req.params.status);
      res.json(filtered);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch conversations by status' });
    }
  });

  app.get('/api/conversations/by-agent/:agentId', requireAuth, async (req, res) => {
    try {
      const conversations = await storage.getAllConversations();
      const filtered = conversations.filter(c => c.assignedAgentId === req.params.agentId);
      res.json(filtered);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch conversations by agent' });
    }
  });

  // Customer management routes
  app.post('/api/customers', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      // Validate request body
      const customerData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(customerData);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: fromZodError(error).toString() 
        });
      }
      res.status(500).json({ error: 'Failed to create customer' });
    }
  });

  app.patch('/api/customers/:id/status', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { status } = req.body;
      await storage.updateCustomerStatus(req.params.id, status);
      res.json({ message: 'Customer status updated successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update customer status' });
    }
  });

  // Conversation creation route
  app.post('/api/conversations', requireAuth, async (req, res) => {
    try {
      const { customerId, title, priority } = req.body;
      
      if (!customerId) {
        return res.status(400).json({ error: 'Customer ID is required' });
      }
      
      const conversation = await storage.createConversation({
        customerId,
        title: title || 'New Conversation',
        priority: priority || 'medium',
        status: 'open'
      });
      
      res.status(201).json(conversation);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create conversation' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
