import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import passport from './auth';
import { requireAuth, requireRole } from './auth';
import { storage } from "./storage";
import ChatWebSocketServer from './websocket';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AIService } from './ai-service';
import { 
  insertCustomerSchema, 
  insertConversationSchema,
  insertTicketSchema,
  insertInternalMessageSchema,
  externalCustomerSyncSchema,
  externalTicketSyncSchema,
  anonymousCustomerSchema,
  anonymousConversationSchema,
  updateAgentStatusSchema,
  aiTicketGenerationSchema,
  insertKnowledgeBaseSchema,
  updateKnowledgeBaseSchema
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

// Ticket validation schemas
const ticketProofreadSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional()
}).refine(data => data.title || data.description, {
  message: 'At least one of title or description must be provided'
});

// File upload configuration
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const uploadStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: uploadStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Max 5 files per request
  },
  fileFilter: function (req, file, cb) {
    // Allow common file types
    const allowedMimes = [
      'image/jpeg',
      'image/png', 
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  }
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

// Customer chat validation schemas
const createAnonymousCustomerSchema = anonymousCustomerSchema.extend({
  sessionId: z.string().optional()
});

const sendCustomerMessageSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
  customerId: z.string().uuid('Invalid customer ID'),
  content: z.string().min(1, 'Message content cannot be empty').max(5000, 'Message too long')
});

export async function registerRoutes(app: Express, sessionStore?: any): Promise<{ server: Server, wsServer?: any }> {
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
      const {
        page = 1,
        limit = 10,
        search,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const options = {
        page: parseInt(page as string, 10),
        limit: Math.min(parseInt(limit as string, 10), 100), // Cap at 100 items per page
        search: search as string,
        status: status as string,
        sortBy: (sortBy as string) as 'createdAt' | 'updatedAt' | 'name',
        sortOrder: (sortOrder as string) as 'asc' | 'desc'
      };

      const result = await storage.getAllCustomers(options);
      res.json(result);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
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
      const user = req.user as any;
      let conversations: any[];
      
      if (user.role === 'admin') {
        // Admins can see all conversations
        conversations = await storage.getAllConversations();
        console.log(`Admin user ${user.name} requesting conversations, found ${conversations.length} conversations`);
      } else if (user.role === 'agent') {
        // Agents can see conversations assigned to them AND unassigned conversations
        const assignedConversations = await storage.getConversationsByAgent(user.id);
        const unassignedConversations = await storage.getUnassignedConversations();
        
        // Combine and mark which are assigned vs unassigned
        conversations = [
          ...assignedConversations.map(conv => ({ ...conv, isAssigned: true })),
          ...unassignedConversations.map(conv => ({ ...conv, isAssigned: false }))
        ];
      } else {
        // Customers or other roles - return empty for now
        conversations = [];
      }
      
      // Enrich conversations with last message and unread count
      console.log(`Starting enrichment for ${conversations.length} conversations`);
      const enrichedConversations = await Promise.all(
        conversations.map(async (conv) => {
          try {
            // Get last message for this conversation
            const messages = await storage.getMessagesByConversation(conv.id);
            const lastMessage = messages[messages.length - 1];
          
          // Calculate unread count (messages not seen by current user)
          // For now, we'll mark conversations as unread if they have recent activity
          // and haven't been visited by the current user recently
          const unreadCount = 0; // TODO: Implement proper read tracking
          
          let lastMessageData = null;
          if (lastMessage) {
            // Get sender information
            let sender;
            if (lastMessage.senderType === 'customer') {
              const customer = await storage.getCustomer(lastMessage.senderId);
              sender = {
                id: customer?.id || lastMessage.senderId,
                name: customer?.name || 'Unknown Customer',
                role: 'customer'
              };
            } else {
              const userSender = await storage.getUser(lastMessage.senderId);
              sender = {
                id: userSender?.id || lastMessage.senderId,
                name: userSender?.name || 'Unknown User',
                role: userSender?.role || lastMessage.senderType
              };
            }
            
            lastMessageData = {
              content: lastMessage.content,
              timestamp: lastMessage.timestamp,
              sender: lastMessage.senderType === 'customer' ? 'customer' : 'agent'
            };
          }
          
          return {
            ...conv,
            lastMessage: lastMessageData || {
              content: 'No messages yet',
              timestamp: conv.createdAt,
              sender: 'customer'
            },
            unreadCount
          };
          } catch (error) {
            console.error(`Error enriching conversation ${conv.id}:`, error);
            return {
              ...conv,
              lastMessage: {
                content: 'Error loading messages',
                timestamp: conv.createdAt,
                sender: 'customer'
              },
              unreadCount: 0
            };
          }
        })
      );
      console.log(`Enrichment completed, ${enrichedConversations.length} conversations enriched`);
      
      console.log(`Sending ${enrichedConversations.length} conversations to client`);
      res.json(enrichedConversations);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  });

  // Get only unassigned conversations for agents to claim
  app.get('/api/conversations/unassigned', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const unassignedConversations = await storage.getUnassignedConversations();
      res.json(unassignedConversations);
    } catch (error) {
      console.error('Failed to fetch unassigned conversations:', error);
      res.status(500).json({ error: 'Failed to fetch unassigned conversations' });
    }
  });

  // Get individual conversation by ID
  app.get('/api/conversations/:id', requireAuth, async (req, res) => {
    try {
      const conversationId = req.params.id;
      
      // Validate UUID format
      if (!z.string().uuid().safeParse(conversationId).success) {
        return res.status(400).json({ error: 'Invalid conversation ID format' });
      }
      
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      res.json(conversation);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      res.status(500).json({ error: 'Failed to fetch conversation' });
    }
  });

  // Manually assign or reassign a conversation
  app.put('/api/conversations/:id/assign', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { id: conversationId } = req.params;
      const { agentId } = req.body;
      const user = req.user as any;

      // Validate agent ID
      if (!agentId || typeof agentId !== 'string') {
        return res.status(400).json({ error: 'Agent ID is required' });
      }

      // Verify agent exists and is valid
      const agent = await storage.getUser(agentId);
      if (!agent || !['agent', 'admin'].includes(agent.role)) {
        return res.status(400).json({ error: 'Invalid agent ID' });
      }

      // Get current conversation to check previous assignment
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      const previousAgentId = conversation.assignedAgentId;

      // Check if this is a no-op (same agent)
      if (previousAgentId === agentId) {
        return res.json({ message: 'Conversation is already assigned to this agent' });
      }

      // Assign conversation
      await storage.assignConversation(conversationId, agentId);

      // Update workload tracking
      if (previousAgentId && previousAgentId !== agentId) {
        // Decrease previous agent's workload
        const previousWorkload = await storage.getAgentWorkload(previousAgentId);
        if (previousWorkload) {
          await storage.updateAgentWorkload(previousAgentId, Math.max(0, previousWorkload.activeConversations - 1));
        }
      }

      // Increase new agent's workload
      const newWorkload = await storage.getAgentWorkload(agentId);
      if (newWorkload) {
        await storage.updateAgentWorkload(agentId, newWorkload.activeConversations + 1);
      }

      // Log the assignment
      const actionType = previousAgentId ? 'reassigned' : 'assigned';
      let details;
      
      if (previousAgentId) {
        // Get previous agent name for better details
        const previousAgent = await storage.getUser(previousAgentId);
        details = `Reassigned from ${previousAgent?.name || previousAgentId} to ${agent.name} by ${user.name}`;
      } else {
        details = `Manually assigned to ${agent.name} by ${user.name}`;
      }

      await storage.createActivityLog({
        agentId,
        conversationId,
        action: actionType,
        details
      });

      res.json({ message: 'Conversation assigned successfully' });
    } catch (error) {
      console.error('Failed to assign conversation:', error);
      res.status(500).json({ error: 'Failed to assign conversation' });
    }
  });

  // Agent takes over an unassigned conversation
  app.put('/api/conversations/:id/take-over', requireAuth, requireRole(['agent', 'admin']), async (req, res) => {
    try {
      const { id: conversationId } = req.params;
      const user = req.user as any;

      // Get conversation to verify it's unassigned
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      if (conversation.assignedAgentId) {
        return res.status(400).json({ error: 'Conversation is already assigned' });
      }

      // Check if agent has capacity
      const agentWorkload = await storage.getAgentWorkload(user.id);
      if (agentWorkload && agentWorkload.activeConversations >= agentWorkload.maxCapacity) {
        return res.status(400).json({ error: 'Agent has reached maximum capacity' });
      }

      // Assign to current user
      await storage.assignConversation(conversationId, user.id);

      // Update workload
      if (agentWorkload) {
        await storage.updateAgentWorkload(user.id, agentWorkload.activeConversations + 1);
      }

      // Log the takeover
      await storage.createActivityLog({
        agentId: user.id,
        conversationId,
        action: 'took_over',
        details: `Taken over by ${user.name}`
      });

      res.json({ message: 'Conversation taken over successfully' });
    } catch (error) {
      console.error('Failed to take over conversation:', error);
      res.status(500).json({ error: 'Failed to take over conversation' });
    }
  });

  app.get('/api/conversations/:id/messages', requireAuth, async (req, res) => {
    try {
      const messages = await storage.getMessagesByConversation(req.params.id);
      
      // Enrich messages with sender information
      const enrichedMessages = await Promise.all(
        messages.map(async (message) => {
          let sender;
          
          if (message.senderType === 'customer') {
            // Get customer data
            const customer = await storage.getCustomer(message.senderId);
            sender = {
              id: customer?.id || message.senderId,
              name: customer?.name || 'Unknown Customer',
              role: 'customer'
            };
          } else {
            // Get user data (agent/admin)
            const user = await storage.getUser(message.senderId);
            sender = {
              id: user?.id || message.senderId,
              name: user?.name || 'Unknown User',
              role: user?.role || message.senderType
            };
          }
          
          return {
            id: message.id,
            content: message.content,
            senderId: message.senderId,
            senderType: message.senderType,
            scope: message.scope,
            timestamp: message.timestamp,
            status: message.status,
            sender
          };
        })
      );
      
      res.json(enrichedMessages);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  app.patch('/api/conversations/:id/assign', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      // Validate conversation ID
      const conversationId = z.string().uuid().parse(req.params.id);
      
      // Validate request body
      const { agentId } = conversationAssignSchema.parse(req.body);
      const user = req.user as any;
      
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
      
      const previousAgentId = conversation.assignedAgentId;
      
      // Check if this is a no-op (same agent)
      if (previousAgentId === agentId) {
        return res.json({ message: 'Conversation is already assigned to this agent' });
      }
      
      // Assign conversation
      await storage.assignConversation(conversationId, agentId);
      
      // Update workload tracking
      if (previousAgentId && previousAgentId !== agentId) {
        // Decrease previous agent's workload
        const previousWorkload = await storage.getAgentWorkload(previousAgentId);
        if (previousWorkload) {
          await storage.updateAgentWorkload(previousAgentId, Math.max(0, previousWorkload.activeConversations - 1));
        }
      }
      
      // Increase new agent's workload (only if not reassigning to same agent)
      if (!previousAgentId || previousAgentId !== agentId) {
        const newWorkload = await storage.getAgentWorkload(agentId);
        if (newWorkload) {
          await storage.updateAgentWorkload(agentId, newWorkload.activeConversations + 1);
        }
      }
      
      // Log the assignment/reassignment
      const actionType = previousAgentId ? 'reassigned' : 'assigned';
      let details;
      
      if (previousAgentId) {
        // Get previous agent name for better details
        const previousAgent = await storage.getUser(previousAgentId);
        details = `Reassigned from ${previousAgent?.name || previousAgentId} to ${agent.name} by ${user.name}`;
      } else {
        details = `Manually assigned to ${agent.name} by ${user.name}`;
      }

      await storage.createActivityLog({
        agentId,
        conversationId,
        action: actionType,
        details
      });
      
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
      
      // Log the response activity
      await storage.createActivityLog({
        agentId: user.id,
        conversationId,
        action: 'responded',
        details: `Sent ${senderType} message: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`
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
              role: sender?.role || message.senderType
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
      
      const totalCustomers = customers.customers.length;
      const onlineCustomers = customers.customers.filter((c: any) => c.status === 'online').length;
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

  // ============================================
  // CUSTOMER CHAT WIDGET API ENDPOINTS
  // ============================================

  // Check for existing conversation by session/IP
  app.get('/api/customer-chat/check-session/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const conversation = await storage.getConversationBySession(sessionId);
      
      if (conversation) {
        res.json(conversation);
      } else {
        res.json(null);
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to check session' });
    }
  });

  // Create anonymous customer and conversation
  app.post('/api/customer-chat/create-customer', async (req, res) => {
    try {
      // If no sessionId provided, generate one
      if (!req.body.sessionId) {
        req.body.sessionId = randomUUID();
      }
      
      // Get client IP from request instead of client-provided value
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      req.body.ipAddress = clientIP;
      
      const customerData = createAnonymousCustomerSchema.parse(req.body);
      const wsServer = (app as any).wsServer;
      const result = await storage.createAnonymousCustomer({
        ...customerData,
        sessionId: req.body.sessionId
      }, wsServer);
      
      console.log('Customer created successfully - ID:', result.customerId);
      res.status(201).json(result);
    } catch (error) {
      console.error('Customer creation failed:', error instanceof z.ZodError ? 'Validation error' : 'Server error');
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid customer data', 
          details: fromZodError(error).toString() 
        });
      }
      res.status(500).json({ error: 'Failed to create customer' });
    }
  });

  // Get messages for customer conversation
  app.get('/api/customer-chat/messages/:conversationId', async (req, res) => {
    try {
      const { conversationId } = req.params;
      const messages = await storage.getCustomerChatMessages(conversationId);
      
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  // Send message from customer
  app.post('/api/customer-chat/send-message', async (req, res) => {
    try {
      const messageData = sendCustomerMessageSchema.parse(req.body);
      const message = await storage.createCustomerMessage(messageData);
      
      // Get conversation and customer details for notifications
      const conversation = await storage.getConversationWithCustomer(messageData.conversationId);
      if (conversation && conversation.customer) {
        // Broadcast message notification to staff if conversation is unassigned
        const wsServer = (app as any).wsServer;
        if (wsServer && wsServer.broadcastNewMessageToStaff) {
          wsServer.broadcastNewMessageToStaff(conversation, conversation.customer, {
            id: message.id,
            content: message.content,
            senderType: message.senderType,
            timestamp: message.timestamp
          });
        }
        
        // Also broadcast to conversation participants via standard WebSocket
        if (wsServer && wsServer.broadcastNewMessage) {
          wsServer.broadcastNewMessage(messageData.conversationId, {
            messageId: message.id,
            conversationId: message.conversationId,
            content: message.content,
            userId: message.senderId,
            userName: conversation.customer.name,
            userRole: 'customer',
            senderType: message.senderType,
            timestamp: message.timestamp,
            status: message.status
          });
        }
      }
      
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid message data', 
          details: fromZodError(error).toString() 
        });
      }
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  // REMOVED: /api/customer-chat/send-ai-message endpoint for security
  // AI messages are now created server-side in /api/ai/smart-response to prevent client spoofing

  // Get activity logs for agent or conversation
  app.get('/api/activity-logs', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const user = req.user as any;
      const { agentId, conversationId } = req.query;

      let logs;
      if (conversationId && typeof conversationId === 'string') {
        logs = await storage.getActivityLogsByConversation(conversationId);
      } else if (agentId && typeof agentId === 'string') {
        // Only admins can view other agents' logs
        if (user.role !== 'admin' && agentId !== user.id) {
          return res.status(403).json({ error: 'Access denied' });
        }
        logs = await storage.getActivityLogsByAgent(agentId);
      } else if (user.role === 'agent') {
        // Default to current agent's logs
        logs = await storage.getActivityLogsByAgent(user.id);
      } else {
        return res.status(400).json({ error: 'Agent ID or Conversation ID required' });
      }

      res.json(logs);
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
      res.status(500).json({ error: 'Failed to fetch activity logs' });
    }
  });

  // Update agent status (online, offline, away, busy)
  app.put('/api/agents/:id/status', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { id: agentId } = req.params;
      const { status } = updateAgentStatusSchema.parse(req.body);
      const user = req.user as any;

      // Agents can only update their own status, admins can update anyone's
      if (user.role === 'agent' && agentId !== user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await storage.updateUserStatus(agentId, status);

      // Log status change
      await storage.createActivityLog({
        agentId,
        action: 'status_changed',
        details: `Status changed to ${status}`
      });

      res.json({ message: 'Status updated successfully' });
    } catch (error) {
      console.error('Failed to update agent status:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid status data', 
          details: fromZodError(error).toString() 
        });
      }
      res.status(500).json({ error: 'Failed to update status' });
    }
  });

  // ============================================
  // AI ASSISTANT ENDPOINTS
  // ============================================

  // Proofread message endpoint
  app.post('/api/ai/proofread-message', requireAuth, async (req, res) => {
    try {
      const { message, isCustomerMessage, conversationHistory } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required' });
      }

      const result = await AIService.proofreadMessage(message, {
        isCustomerMessage: isCustomerMessage || false,
        conversationHistory: conversationHistory || []
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Proofreading failed:', error);
      res.status(500).json({ error: 'Failed to proofread message' });
    }
  });

  // Analyze conversation for ticket generation
  app.post('/api/ai/analyze-conversation', requireAuth, async (req, res) => {
    try {
      const { conversationId } = req.body;
      
      if (!conversationId) {
        return res.status(400).json({ error: 'Conversation ID is required' });
      }

      // Get conversation messages
      const messages = await storage.getMessagesByConversation(conversationId);
      const conversation = await storage.getConversationWithCustomer(conversationId);
      
      const analysis = await AIService.analyzeConversation(messages, conversation?.customer);

      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('Conversation analysis failed:', error);
      res.status(500).json({ error: 'Failed to analyze conversation' });
    }
  });

  // Generate AI agent response
  app.post('/api/ai/generate-response', async (req, res) => {
    try {
      const { customerMessage, conversationHistory, knowledgeBase } = req.body;
      
      if (!customerMessage || typeof customerMessage !== 'string') {
        return res.status(400).json({ error: 'Customer message is required' });
      }

      const response = await AIService.generateAgentResponse(
        customerMessage,
        conversationHistory || [],
        knowledgeBase || []
      );

      res.json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('AI response generation failed:', error);
      res.status(500).json({ error: 'Failed to generate AI response' });
    }
  });

  // Generate smart AI agent response for customer chat and persist message
  app.post('/api/ai/smart-response', async (req, res) => {
    try {
      // Validate request data with proper schema
      const smartResponseSchema = z.object({
        conversationId: z.string().uuid(),
        customerMessage: z.string().min(1).max(5000), // Align with other message limits
        customerId: z.string().uuid(), // Required for authorization
        agentId: z.string().uuid().optional()
      });

      const { conversationId, customerMessage, customerId, agentId } = smartResponseSchema.parse(req.body);

      // Check if conversation exists
      const conversation = await storage.getConversationWithCustomer(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // Security: Verify customer owns this conversation
      if (conversation.customerId !== customerId) {
        return res.status(403).json({ error: 'Access denied to this conversation' });
      }

      // Generate AI response
      const aiResponse = await AIService.generateSmartAgentResponse(
        conversationId,
        customerMessage,
        agentId
      );

      // Server-side: Create and persist AI message to prevent client spoofing
      if (aiResponse.response) {
        // TODO: Use proper system agent UUID instead of hardcoded string
        // For now, using consistent system identifier
        const SYSTEM_AI_AGENT_ID = 'ai-system-agent-001';
        
        const messageData = {
          conversationId,
          content: aiResponse.response,
          senderId: SYSTEM_AI_AGENT_ID,
          senderType: 'agent' as const
        };

        const message = await storage.createMessage(messageData);
        
        // Broadcast AI message to conversation participants
        if (conversation.customer) {
          const wsServer = (app as any).wsServer;
          if (wsServer && wsServer.broadcastNewMessage) {
            wsServer.broadcastNewMessage(conversationId, {
              messageId: message.id,
              conversationId: message.conversationId,
              content: message.content,
              userId: SYSTEM_AI_AGENT_ID,
              userName: 'AI Assistant',
              userRole: 'agent',
              senderType: message.senderType,
              timestamp: message.timestamp,
              status: message.status
            });
          }
        }
      }

      res.json({
        success: true,
        data: aiResponse
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid AI response request', 
          details: fromZodError(error).toString() 
        });
      }
      console.error('Smart AI response generation failed:', error);
      res.status(500).json({ error: 'Failed to generate smart AI response' });
    }
  });

  // Get active AI conversations for staff takeover dashboard
  app.get('/api/ai/active-conversations', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const activeSessions = await storage.getActiveAiConversations();
      res.json(activeSessions);
    } catch (error) {
      console.error('Failed to fetch active AI conversations:', error);
      res.status(500).json({ error: 'Failed to fetch active AI conversations' });
    }
  });

  // Auto-assign conversation to best available agent (for AI handover)
  app.post('/api/ai/auto-handover/:conversationId', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { reason = 'Automatic handover due to low AI confidence' } = req.body;

      // Check if conversation exists
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // Find best available agent
      const bestAgent = await storage.findBestAvailableAgent();
      if (!bestAgent) {
        return res.status(503).json({ error: 'No agents available for handover' });
      }

      // Perform handover to best agent
      const success = await AIService.handoverToHuman(conversationId, bestAgent.id, reason);
      
      if (success) {
        // Log the auto-handover activity
        await storage.createActivityLog({
          agentId: bestAgent.id,
          conversationId,
          action: 'took_over',
          details: `Auto-assigned from AI: ${reason}`
        });

        // Broadcast takeover notification
        const wsServer = (app as any).wsServer;
        if (wsServer && wsServer.broadcastToStaff) {
          wsServer.broadcastToStaff({
            type: 'conversation_handover',
            conversationId,
            humanAgentId: bestAgent.id,
            humanAgentName: bestAgent.name,
            reason,
            isAutomatic: true,
            timestamp: new Date().toISOString()
          });
        }

        res.json({ 
          success: true,
          message: 'Auto-handover successful', 
          agentId: bestAgent.id,
          agentName: bestAgent.name 
        });
      } else {
        res.status(400).json({ error: 'No active AI session found for this conversation' });
      }
    } catch (error) {
      console.error('Failed to auto-handover conversation:', error);
      res.status(500).json({ error: 'Failed to auto-handover conversation' });
    }
  });

  // Hand over conversation from AI to human agent
  app.post('/api/ai/handover/:conversationId', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { reason = 'Manual takeover by staff' } = req.body;
      const user = req.user as any;

      // Check if conversation exists
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // Perform handover
      const success = await AIService.handoverToHuman(conversationId, user.id, reason);
      
      if (success) {
        // Log the takeover activity
        await storage.createActivityLog({
          agentId: user.id,
          conversationId,
          action: 'took_over',
          details: `Took over AI conversation: ${reason}`
        });

        // Broadcast takeover notification to all staff
        const wsServer = (app as any).wsServer;
        if (wsServer && wsServer.broadcastToStaff) {
          wsServer.broadcastToStaff({
            type: 'conversation_handover',
            conversationId,
            humanAgentId: user.id,
            humanAgentName: user.name,
            reason,
            timestamp: new Date().toISOString()
          });
        }

        res.json({
          success: true,
          message: 'Conversation handed over to human agent',
          agentId: user.id,
          agentName: user.name
        });
      } else {
        res.status(400).json({ error: 'No active AI session found for this conversation' });
      }
    } catch (error) {
      console.error('AI handover failed:', error);
      res.status(500).json({ error: 'Failed to handover conversation' });
    }
  });

  // Record customer feedback for AI learning
  app.post('/api/ai/feedback', async (req, res) => {
    try {
      const { conversationId, messageId, isHelpful, customerSatisfaction, feedbackText } = req.body;
      
      if (!conversationId || !messageId || typeof isHelpful !== 'boolean') {
        return res.status(400).json({ error: 'Conversation ID, message ID, and feedback rating are required' });
      }

      await AIService.recordCustomerFeedback(
        conversationId, 
        messageId, 
        isHelpful, 
        customerSatisfaction, 
        feedbackText
      );

      res.json({
        success: true,
        message: 'Feedback recorded successfully'
      });
    } catch (error) {
      console.error('AI feedback recording failed:', error);
      res.status(500).json({ error: 'Failed to record feedback' });
    }
  });

  // Check AI service health
  app.get('/api/ai/health', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const isHealthy = await AIService.checkServiceHealth();
      res.json({
        success: true,
        healthy: isHealthy,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: 'Health check failed' });
    }
  });

  // File upload endpoint for chat attachments
  app.post('/api/upload-attachment', upload.array('files', 5), async (req, res) => {
    try {
      const { messageId } = req.body;
      
      if (!messageId) {
        return res.status(400).json({ error: 'Message ID is required' });
      }

      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const attachments = [];
      
      for (const file of files) {
        const attachment = await storage.createAttachment({
          messageId,
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          filePath: file.path,
        });
        attachments.push(attachment);
      }

      res.status(201).json({ 
        success: true, 
        attachments,
        message: `${attachments.length} file(s) uploaded successfully` 
      });
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ error: 'Failed to upload files' });
    }
  });

  // Serve uploaded files
  app.get('/api/attachments/:filename', (req, res) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(uploadDir, filename);
      
      // Security check to prevent path traversal
      const normalizedPath = path.normalize(filePath);
      if (!normalizedPath.startsWith(path.normalize(uploadDir))) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      res.sendFile(path.resolve(filePath));
    } catch (error) {
      console.error('File serving error:', error);
      res.status(500).json({ error: 'Failed to serve file' });
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
        data: customers.customers,
        total: customers.total
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

  // ============ INTERNAL TICKET API ROUTES ============
  
  // Get all tickets for internal use (staff only)
  app.get('/api/tickets', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const tickets = await storage.getAllTickets();
      res.json(tickets);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      res.status(500).json({ error: 'Failed to fetch tickets' });
    }
  });

  // Generate AI ticket from conversation
  app.post('/api/conversations/:id/generate-ticket', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { id: conversationId } = req.params;
      const user = req.user as any;
      
      // Validate conversation exists and user has access
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      // For agents, ensure they can only generate tickets for assigned conversations
      if (user.role === 'agent' && conversation.assignedAgentId !== user.id) {
        return res.status(403).json({ error: 'You can only generate tickets for conversations assigned to you' });
      }
      
      // Check if OpenAI service is available
      const isAiAvailable = await AIService.checkServiceHealth();
      if (!isAiAvailable) {
        return res.status(503).json({ 
          error: 'AI service is currently unavailable. Please try again later or create the ticket manually.' 
        });
      }
      
      // Generate AI ticket suggestions
      const aiTicketData = await AIService.generateTicketFromConversation(conversationId);
      
      // Validate the AI-generated data against schema
      const validatedData = aiTicketGenerationSchema.safeParse(aiTicketData);
      if (!validatedData.success) {
        console.error('AI generated invalid ticket data:', validatedData.error);
        return res.status(500).json({ 
          error: 'AI generated invalid ticket data. Please try again or create the ticket manually.' 
        });
      }
      
      res.json(validatedData.data);
    } catch (error) {
      console.error('Failed to generate AI ticket:', error);
      res.status(500).json({ error: 'Failed to generate AI ticket suggestions' });
    }
  });

  // Create ticket (manual or AI-generated)
  app.post('/api/tickets', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const user = req.user as any;
      const ticketData = insertTicketSchema.parse(req.body);
      
      // If conversation is specified, verify user has access
      if (ticketData.conversationId) {
        const conversation = await storage.getConversation(ticketData.conversationId);
        if (!conversation) {
          return res.status(404).json({ error: 'Associated conversation not found' });
        }
        
        // For agents, ensure they can only create tickets for assigned conversations
        if (user.role === 'agent' && conversation.assignedAgentId !== user.id) {
          return res.status(403).json({ error: 'You can only create tickets for conversations assigned to you' });
        }
      }
      
      // Ensure customer exists
      const customer = await storage.getCustomer(ticketData.customerId);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      // Map AI generation data if present to ticket schema fields
      const ticketCreateData: any = { ...ticketData };
      if (ticketData.isAiGenerated && ticketData.aiConfidenceScore) {
        // Store original AI-generated content for reference
        ticketCreateData.aiGeneratedTitle = ticketData.title;
        ticketCreateData.aiGeneratedDescription = ticketData.description;
      }
      
      // Create the ticket
      const ticket = await storage.createTicket(ticketCreateData);
      
      res.status(201).json(ticket);
    } catch (error) {
      console.error('Failed to create ticket:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid ticket data', 
          details: fromZodError(error).toString() 
        });
      }
      res.status(500).json({ error: 'Failed to create ticket' });
    }
  });

  // AI proofread ticket content
  app.post('/api/tickets/proofread', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const content = ticketProofreadSchema.parse(req.body);
      
      // Check if OpenAI service is available
      const isAiAvailable = await AIService.checkServiceHealth();
      if (!isAiAvailable) {
        return res.status(503).json({ 
          error: 'AI service is currently unavailable. Please check your content manually.' 
        });
      }
      
      const results = await AIService.proofreadTicketContent(content);
      res.json(results);
    } catch (error) {
      console.error('Failed to proofread ticket content:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid content data', 
          details: fromZodError(error).toString() 
        });
      }
      res.status(500).json({ error: 'Failed to proofread ticket content' });
    }
  });

  // Update ticket status
  app.put('/api/tickets/:id/status', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = ticketStatusUpdateSchema.parse(req.body);
      
      await storage.updateTicketStatus(id, status);
      res.json({ message: 'Ticket status updated successfully' });
    } catch (error) {
      console.error('Failed to update ticket status:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid status', 
          details: fromZodError(error).toString() 
        });
      }
      res.status(500).json({ error: 'Failed to update ticket status' });
    }
  });

  // Assign ticket to agent
  app.put('/api/tickets/:id/assign', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { id } = req.params;
      const { agentId } = ticketAssignmentSchema.parse(req.body);
      
      // Verify agent exists and is active
      const agent = await storage.getUser(agentId);
      if (!agent || agent.role !== 'agent') {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      await storage.assignTicket(id, agentId);
      res.json({ message: 'Ticket assigned successfully' });
    } catch (error) {
      console.error('Failed to assign ticket:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid agent ID', 
          details: fromZodError(error).toString() 
        });
      }
      res.status(500).json({ error: 'Failed to assign ticket' });
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

  // Knowledge Base Management API routes
  // Get all knowledge base articles
  app.get('/api/knowledge-base', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const articles = await storage.getAllKnowledgeBase();
      res.json(articles);
    } catch (error) {
      console.error('Failed to fetch knowledge base articles:', error);
      res.status(500).json({ error: 'Failed to fetch knowledge base articles' });
    }
  });

  // Get specific knowledge base article
  app.get('/api/knowledge-base/:id', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { id } = req.params;
      const article = await storage.getKnowledgeBase(id);
      
      if (!article) {
        return res.status(404).json({ error: 'Knowledge base article not found' });
      }
      
      res.json(article);
    } catch (error) {
      console.error('Failed to fetch knowledge base article:', error);
      res.status(500).json({ error: 'Failed to fetch knowledge base article' });
    }
  });

  // Create new knowledge base article
  app.post('/api/knowledge-base', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const user = req.user as any;
      
      // Validate using Drizzle-Zod schema
      const validationResult = insertKnowledgeBaseSchema.extend({
        priority: z.coerce.number().int().min(1).max(100).default(50),
      }).safeParse({
        ...req.body,
        createdBy: user.id,
      });

      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Invalid knowledge base data', 
          details: fromZodError(validationResult.error).toString() 
        });
      }

      const newArticle = await storage.createKnowledgeBase(validationResult.data);
      res.status(201).json(newArticle);
    } catch (error) {
      console.error('Failed to create knowledge base article:', error);
      res.status(500).json({ error: 'Failed to create knowledge base article' });
    }
  });

  // Update knowledge base article
  app.put('/api/knowledge-base/:id', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { id } = req.params;

      // Check if article exists
      const existingArticle = await storage.getKnowledgeBase(id);
      if (!existingArticle) {
        return res.status(404).json({ error: 'Knowledge base article not found' });
      }

      // Validate using Drizzle-Zod schema
      const validationResult = updateKnowledgeBaseSchema.extend({
        priority: z.coerce.number().int().min(1).max(100).optional(),
      }).safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Invalid knowledge base data', 
          details: fromZodError(validationResult.error).toString() 
        });
      }

      await storage.updateKnowledgeBase(id, validationResult.data);
      
      // Return updated article
      const updatedArticle = await storage.getKnowledgeBase(id);
      res.json(updatedArticle);
    } catch (error) {
      console.error('Failed to update knowledge base article:', error);
      res.status(500).json({ error: 'Failed to update knowledge base article' });
    }
  });

  // Delete knowledge base article
  app.delete('/api/knowledge-base/:id', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { id } = req.params;

      // Check if article exists
      const existingArticle = await storage.getKnowledgeBase(id);
      if (!existingArticle) {
        return res.status(404).json({ error: 'Knowledge base article not found' });
      }

      await storage.deleteKnowledgeBase(id);
      res.json({ success: true, message: 'Knowledge base article deleted successfully' });
    } catch (error) {
      console.error('Failed to delete knowledge base article:', error);
      res.status(500).json({ error: 'Failed to delete knowledge base article' });
    }
  });

  const httpServer = createServer(app);
  
  // Initialize WebSocket server for real-time chat
  // Pass the session store for authentication
  const wsServer = new ChatWebSocketServer(httpServer, sessionStore);
  
  // Store WebSocket server reference for use in message broadcasting
  (app as any).wsServer = wsServer;

  return { server: httpServer, wsServer };
}
