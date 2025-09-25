import type { Express } from "express";
import { createServer, type Server } from "http";
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import passport from './auth';
import { requireAuth, requireRole } from './auth';
import { storage } from "./storage";
import ChatWebSocketServer from './websocket';
import { 
  insertCustomerSchema, 
  insertConversationSchema,
  insertTicketSchema,
  insertInternalMessageSchema,
  externalCustomerSyncSchema,
  externalTicketSyncSchema
} from '@shared/schema';

// Route-specific validation schemas
const messageCreateSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
  content: z.string().min(1, 'Message content cannot be empty').max(5000, 'Message too long')
});

const conversationCreateSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: z.enum(['open', 'pending', 'resolved', 'closed']).default('open')
});

const conversationStatusSchema = z.object({
  status: z.enum(['open', 'pending', 'resolved', 'closed'])
});

const conversationAssignSchema = z.object({
  agentId: z.string().uuid('Invalid agent ID')
});

const messageStatusSchema = z.object({
  status: z.enum(['sent', 'delivered', 'read'])
});

// Internal message validation schema
const internalMessageCreateSchema = z.object({
  content: z.string().min(1, 'Message content cannot be empty').max(5000, 'Message too long')
});

const customerStatusSchema = z.object({
  status: z.enum(['online', 'offline', 'away'])
});

// External API validation schemas
const apiKeySchema = z.object({
  apiKey: z.string().min(1, 'API key is required')
});

const ticketStatusUpdateSchema = z.object({
  status: z.enum(['open', 'in-progress', 'closed'])
});

const ticketAssignmentSchema = z.object({
  agentId: z.string().uuid('Invalid agent ID')
});

export async function registerRoutes(app: Express): Promise<{ server: Server, wsServer?: any }> {
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

  app.get('/api/customers/:id', requireAuth, async (req, res) => {
    try {
      // Validate customer ID
      const customerId = z.string().uuid().parse(req.params.id);
      
      // Get customer
      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      res.json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid customer ID', 
          details: fromZodError(error).toString() 
        });
      }
      res.status(500).json({ error: 'Failed to fetch customer' });
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
      // Validate conversation ID
      const conversationId = z.string().uuid().parse(req.params.id);
      
      // Validate request body
      const { agentId } = conversationAssignSchema.parse(req.body);
      
      // Check if conversation exists
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      // Check if agent exists
      const agent = await storage.getUser(agentId);
      if (!agent || (agent.role !== 'agent' && agent.role !== 'admin')) {
        return res.status(400).json({ error: 'Invalid agent ID' });
      }
      
      await storage.assignConversation(conversationId, agentId);
      res.json({ message: 'Conversation assigned successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: fromZodError(error).toString() 
        });
      }
      res.status(500).json({ error: 'Failed to assign conversation' });
    }
  });

  app.patch('/api/conversations/:id/status', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      // Validate conversation ID
      const conversationId = z.string().uuid().parse(req.params.id);
      
      // Validate request body
      const { status } = conversationStatusSchema.parse(req.body);
      
      // Check if conversation exists
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      await storage.updateConversationStatus(conversationId, status);
      res.json({ message: 'Conversation status updated successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: fromZodError(error).toString() 
        });
      }
      res.status(500).json({ error: 'Failed to update conversation status' });
    }
  });

  // Message management routes
  app.post('/api/messages', requireAuth, async (req, res) => {
    try {
      // Validate request body
      const { conversationId, content } = messageCreateSchema.parse(req.body);
      const user = req.user as any;
      
      // Check if conversation exists
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      // Check access permissions - agents can only message assigned conversations, admins can message any
      if (user.role === 'agent' && conversation.assignedAgentId !== user.id) {
        return res.status(403).json({ error: 'You can only send messages to conversations assigned to you' });
      }
      
      // Determine sender type from user role
      const senderType = user.role === 'admin' ? 'admin' : 'agent';
      
      const message = await storage.createMessage({
        conversationId,
        senderId: user.id,
        senderType,
        content,
        scope: 'public'
      });
      
      // Broadcast the new message to WebSocket clients
      const wsServer = (req.app as any).wsServer;
      if (wsServer) {
        wsServer.broadcastNewMessage(conversationId, {
          messageId: message.id,
          conversationId: message.conversationId,
          content: message.content,
          userId: message.senderId,
          userName: user.name,
          userRole: user.role,
          senderType: message.senderType,
          timestamp: message.timestamp,
          status: message.status
        });
      }
      
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

  app.patch('/api/messages/:id/status', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      // Validate message ID
      const messageId = z.string().uuid().parse(req.params.id);
      
      // Validate request body
      const { status } = messageStatusSchema.parse(req.body);
      
      await storage.updateMessageStatus(messageId, status);
      res.json({ message: 'Message status updated successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: fromZodError(error).toString() 
        });
      }
      res.status(500).json({ error: 'Failed to update message status' });
    }
  });

  // ============================================
  // INTERNAL STAFF MESSAGE ENDPOINTS
  // ============================================

  // Get internal messages for a conversation (staff only)
  app.get('/api/conversations/:id/internal-messages', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      // Validate conversation ID
      const conversationId = z.string().uuid().parse(req.params.id);
      const user = req.user as any;
      
      // Check if conversation exists
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      // Check access permissions - agents can only view internal messages for assigned conversations
      if (user.role === 'agent' && conversation.assignedAgentId !== user.id) {
        return res.status(403).json({ error: 'You can only view internal messages for conversations assigned to you' });
      }
      
      const messages = await storage.getMessagesByConversationAndScope(conversationId, 'internal');
      
      // Enrich messages with sender information
      const enrichedMessages = await Promise.all(
        messages.map(async (message) => {
          const sender = await storage.getUser(message.senderId);
          return {
            id: message.id,
            content: message.content,
            senderId: message.senderId,
            senderType: message.senderType,
            scope: message.scope,
            timestamp: message.timestamp,
            status: message.status,
            sender: {
              id: sender?.id || message.senderId,
              name: sender?.name || 'Unknown User',
              role: sender?.role || message.senderType,
              avatar: sender?.avatar
            }
          };
        })
      );
      
      res.json(enrichedMessages);
    } catch (error) {
      console.error('Internal messages fetch error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid conversation ID', 
          details: fromZodError(error).toString() 
        });
      }
      res.status(500).json({ error: 'Failed to fetch internal messages' });
    }
  });

  // Create internal message (staff only)
  app.post('/api/conversations/:id/internal-messages', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      // Validate conversation ID
      const conversationId = z.string().uuid().parse(req.params.id);
      
      // Validate request body
      const { content } = internalMessageCreateSchema.parse(req.body);
      const user = req.user as any;
      
      // Check if conversation exists
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      // Check access permissions - agents can only send internal messages for assigned conversations
      if (user.role === 'agent' && conversation.assignedAgentId !== user.id) {
        return res.status(403).json({ error: 'You can only send internal messages for conversations assigned to you' });
      }
      
      // Determine sender type from user role
      const senderType = user.role === 'admin' ? 'admin' : 'agent';
      
      const message = await storage.createInternalMessage({
        conversationId,
        senderId: user.id,
        senderType,
        content,
        scope: 'internal'
      });
      
      // Broadcast internal message only to staff members via WebSocket
      const wsServer = (req.app as any).wsServer;
      if (wsServer) {
        wsServer.broadcastInternalMessage(conversationId, {
          messageId: message.id,
          conversationId: message.conversationId,
          content: message.content,
          userId: message.senderId,
          userName: user.name,
          userRole: user.role,
          senderType: message.senderType,
          scope: message.scope,
          timestamp: message.timestamp,
          status: message.status
        });
      }
      
      res.status(201).json(message);
    } catch (error) {
      console.error('Internal message creation error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: fromZodError(error).toString() 
        });
      }
      res.status(500).json({ error: 'Failed to create internal message' });
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
      // Validate customer ID
      const customerId = z.string().uuid().parse(req.params.id);
      
      // Validate request body
      const { status } = customerStatusSchema.parse(req.body);
      
      // Check if customer exists
      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      await storage.updateCustomerStatus(customerId, status);
      res.json({ message: 'Customer status updated successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: fromZodError(error).toString() 
        });
      }
      res.status(500).json({ error: 'Failed to update customer status' });
    }
  });

  // Conversation creation route
  app.post('/api/conversations', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      // Validate request body
      const conversationData = conversationCreateSchema.parse({
        ...req.body,
        title: req.body.title || 'New Conversation'
      });
      
      // Check if customer exists
      const customer = await storage.getCustomer(conversationData.customerId);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      const conversation = await storage.createConversation(conversationData);
      res.status(201).json(conversation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: fromZodError(error).toString() 
        });
      }
      res.status(500).json({ error: 'Failed to create conversation' });
    }
  });

  // API Key authentication middleware for external APIs
  const requireApiKey = (req: any, res: any, next: any) => {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    
    // Simple API key validation (in production, use proper key management)
    if (!apiKey || apiKey !== process.env.EXTERNAL_API_KEY) {
      return res.status(401).json({ error: 'Invalid or missing API key' });
    }
    
    next();
  };

  // External API rate limiting
  const externalApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: 'Too many API requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // ============================================
  // EXTERNAL SYNC API ENDPOINTS FOR 3RD PARTY SYSTEMS
  // ============================================

  // External Customer Sync API
  app.get('/api/external/customers', requireApiKey, externalApiLimiter, async (req, res) => {
    try {
      const customers = await storage.getAllCustomers();
      res.json({
        success: true,
        data: customers,
        total: customers.length
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch customers', success: false });
    }
  });

  app.get('/api/external/customers/:id', requireApiKey, externalApiLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const customer = await storage.getCustomer(id);
      
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found', success: false });
      }
      
      res.json({
        success: true,
        data: customer
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch customer', success: false });
    }
  });

  app.post('/api/external/customers/sync', requireApiKey, externalApiLimiter, async (req, res) => {
    try {
      const customerData = externalCustomerSyncSchema.parse(req.body);
      const customer = await storage.syncCustomerFromExternal(customerData);
      
      res.status(201).json({
        success: true,
        data: customer,
        message: 'Customer synced successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid customer data', 
          details: fromZodError(error).toString(),
          success: false
        });
      }
      res.status(500).json({ error: 'Failed to sync customer', success: false });
    }
  });

  app.put('/api/external/customers/:id/sync-status', requireApiKey, externalApiLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, externalId } = req.body;
      
      await storage.updateCustomerSyncStatus(id, status, externalId);
      
      res.json({
        success: true,
        message: 'Customer sync status updated'
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update customer sync status', success: false });
    }
  });

  // External Ticket Sync API
  app.get('/api/external/tickets', requireApiKey, externalApiLimiter, async (req, res) => {
    try {
      const tickets = await storage.getAllTickets();
      res.json({
        success: true,
        data: tickets,
        total: tickets.length
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tickets', success: false });
    }
  });

  app.get('/api/external/tickets/:id', requireApiKey, externalApiLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const ticket = await storage.getTicket(id);
      
      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found', success: false });
      }
      
      res.json({
        success: true,
        data: ticket
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch ticket', success: false });
    }
  });

  app.post('/api/external/tickets/sync', requireApiKey, externalApiLimiter, async (req, res) => {
    try {
      const ticketData = externalTicketSyncSchema.parse(req.body);
      const ticket = await storage.syncTicketFromExternal(ticketData);
      
      res.status(201).json({
        success: true,
        data: ticket,
        message: 'Ticket synced successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid ticket data', 
          details: fromZodError(error).toString(),
          success: false
        });
      }
      res.status(500).json({ error: 'Failed to sync ticket', success: false });
    }
  });

  app.put('/api/external/tickets/:id/status', requireApiKey, externalApiLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = ticketStatusUpdateSchema.parse(req.body);
      
      await storage.updateTicketStatus(id, status);
      
      res.json({
        success: true,
        message: 'Ticket status updated'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid status', 
          details: fromZodError(error).toString(),
          success: false
        });
      }
      res.status(500).json({ error: 'Failed to update ticket status', success: false });
    }
  });

  app.put('/api/external/tickets/:id/assign', requireApiKey, externalApiLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const { agentId } = ticketAssignmentSchema.parse(req.body);
      
      await storage.assignTicket(id, agentId);
      
      res.json({
        success: true,
        message: 'Ticket assigned successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid agent ID', 
          details: fromZodError(error).toString(),
          success: false
        });
      }
      res.status(500).json({ error: 'Failed to assign ticket', success: false });
    }
  });

  app.put('/api/external/tickets/:id/sync-status', requireApiKey, externalApiLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, externalId } = req.body;
      
      await storage.updateTicketSyncStatus(id, status, externalId);
      
      res.json({
        success: true,
        message: 'Ticket sync status updated'
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update ticket sync status', success: false });
    }
  });

  // Webhook endpoint for external systems to notify of changes
  app.post('/api/external/webhook', requireApiKey, externalApiLimiter, async (req, res) => {
    try {
      const { event, type, id, data } = req.body;
      
      // Log webhook for debugging (in production, process according to event type)
      console.log('Webhook received:', { event, type, id, timestamp: new Date() });
      
      // Process webhook based on event type
      switch (event) {
        case 'ticket.created':
        case 'ticket.updated':
          if (data && type === 'ticket') {
            await storage.syncTicketFromExternal(data);
          }
          break;
        case 'customer.created':
        case 'customer.updated':
          if (data && type === 'customer') {
            await storage.syncCustomerFromExternal(data);
          }
          break;
      }
      
      res.json({
        success: true,
        message: 'Webhook processed successfully'
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to process webhook', success: false });
    }
  });

  const httpServer = createServer(app);
  
  // Initialize WebSocket server for real-time chat
  // Note: We need to pass the session store for authentication
  const wsServer = new ChatWebSocketServer(httpServer, null);
  
  // Store WebSocket server reference for use in message broadcasting
  (app as any).wsServer = wsServer;

  return { server: httpServer, wsServer };
}
