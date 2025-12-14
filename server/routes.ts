import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import crypto from "crypto";
import rateLimit from 'express-rate-limit';
import { DocumentProcessor } from './document-processor';
import { AIDocumentAnalyzer } from './ai-document-analyzer';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { hash, compare } from 'bcryptjs';
import passport from './auth';
import { requireAuth, requireRole } from './auth';
import { storage } from "./storage";
import ChatWebSocketServer from './websocket';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AIService } from './ai-service';
import { db } from './db';
import { eq } from 'drizzle-orm';
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
  updateKnowledgeBaseSchema,
  insertUploadedFileSchema,
  updateUploadedFileSchema,
  insertPostSchema,
  insertPostCommentSchema,
  insertPostLikeSchema,
  insertPostViewSchema,
  insertAiAgentSchema,
  updateAiAgentSchema,
  insertSupportCategorySchema,
  updateSupportCategorySchema,
  customers,
  conversations
} from '@shared/schema';
import { WebScraper } from './web-scraper';
import { KnowledgeRetrievalService } from './knowledge-retrieval';

// Route-specific validation schemas
const messageCreateSchema = z.object({
  conversationId: z.string(),
  content: z.string().min(1, 'Message content cannot be empty').max(5000, 'Message too long')
});

// Helper function to generate mock AI learning data for demonstration
async function generateMockLearningData() {
  const agents = await storage.getAllAiAgents();
  if (agents.length === 0) {
    // Return empty array if no agents exist
    return [];
  }

  const sampleQueries = [
    "How do I cancel my subscription?",
    "What are your refund policies?", 
    "I can't log into my account",
    "How do I upgrade my plan?",
    "Why was I charged twice?",
    "Can I get a discount for students?",
    "How do I export my data?",
    "What payment methods do you accept?",
    "Is there a mobile app available?",
    "How do I contact support?",
    "Where can I find my invoice?",
    "How do I reset my password?",
    "What features are included in premium?",
    "Can I share my account with others?",
    "How do I delete my account?",
    "When will my subscription renew?",
    "Can I pause my subscription?",
    "How do I update my payment method?",
    "What's your privacy policy?",
    "How do I report a bug?"
  ];

  const sampleResponses = [
    "To cancel your subscription, go to your account settings and click 'Cancel Subscription'. You can also contact our support team for assistance.",
    "Our refund policy allows for full refunds within 30 days of purchase. Please see our terms of service for complete details.",
    "If you're having trouble logging in, try resetting your password using the 'Forgot Password' link on the login page.",
    "You can upgrade your plan anytime from your billing settings. Simply select the plan you want and confirm the upgrade.",
    "Double charges can occur due to payment processing issues. Please contact our billing team to resolve this immediately.",
    "Yes! We offer a 50% student discount. Please verify your student status through our education portal.",
    "You can export your data from the Settings > Data Export section. We support JSON, CSV, and XML formats.",
    "We accept all major credit cards, PayPal, and bank transfers for annual plans.",
    "Yes, our mobile app is available on both iOS and Android. Search for 'SupportBoard' in your app store.",
    "You can reach our support team through live chat, email at support@supportboard.com, or this help portal.",
    "Your invoices are available in your account dashboard under the 'Billing' section.",
    "Click the 'Forgot Password' link on the login page and follow the instructions sent to your email.",
    "Premium includes unlimited conversations, priority support, advanced analytics, and API access.",
    "Account sharing isn't permitted under our terms. Consider our team plans for multiple users.",
    "To delete your account, go to Settings > Account > Delete Account. This action is permanent.",
    "Your subscription renews automatically on the same date each month. Check your billing settings for details.",
    "You can pause your subscription for up to 6 months from your account settings.",
    "Update your payment method in Settings > Billing > Payment Methods.",
    "Our privacy policy is available at supportboard.com/privacy and explains how we handle your data.",
    "Please report bugs through our contact form or email support@supportboard.com with details."
  ];

  const mockEntries = [];
  const numEntries = Math.min(25, sampleQueries.length);

  for (let i = 0; i < numEntries; i++) {
    const agent = agents[i % agents.length];
    const confidence = 30 + (i * 3) + (Math.random() * 40); // Mix of low and high confidence
    const humanTookOver = confidence < 60 || Math.random() < 0.3;
    const wasHelpful = confidence > 70 ? (Math.random() > 0.2) : (Math.random() > 0.6);
    
    mockEntries.push({
      id: `mock-learning-${i}`,
      agentId: agent.id,
      agentName: agent.name,
      conversationId: `mock-conv-${i}`,
      customerQuery: sampleQueries[i],
      aiResponse: sampleResponses[i],
      confidence: Math.round(confidence),
      humanTookOver,
      customerSatisfaction: wasHelpful ? (4 + Math.round(Math.random())) : (Math.random() < 0.5 ? null : (1 + Math.round(Math.random() * 2))),
      knowledgeUsed: [`kb-${(i % 5) + 1}`, `kb-${(i % 3) + 3}`],
      improvementSuggestion: !wasHelpful && Math.random() > 0.5 ? 
        ["Response was too generic", "Needs more specific steps", "Outdated information", "Missing context"][i % 4] : null,
      wasHelpful,
      createdAt: new Date(Date.now() - (i * 86400000 / 5)).toISOString() // Spread over last 5 days
    });
  }

  return mockEntries;
}

const conversationCreateSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: z.enum(['open', 'pending', 'resolved', 'closed']).default('open'),
  assignedAgentId: z.string().uuid('Invalid agent ID').optional()
});

const conversationStatusSchema = z.object({
  status: z.enum(['open', 'pending', 'resolved', 'closed'])
});

const conversationAssignSchema = z.object({
  agentId: z.string().uuid('Invalid agent ID')
});

const followupUpdateSchema = z.object({
  followupDate: z.string().datetime().nullable()
}).refine(
  (data) => {
    if (data.followupDate === null) return true;
    const date = new Date(data.followupDate);
    return date > new Date();
  },
  {
    message: 'Follow-up date must be in the future',
    path: ['followupDate']
  }
);

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

// Image-specific upload configuration for knowledge base
const imageUploadDir = './uploads/knowledge-base-images';
if (!fs.existsSync(imageUploadDir)) {
  fs.mkdirSync(imageUploadDir, { recursive: true });
}

const imageUploadStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, imageUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, 'kb-img-' + uniqueSuffix + '-' + sanitizedName);
  }
});

const imageUpload = multer({
  storage: imageUploadStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Video-specific upload configuration for knowledge base
const videoUploadDir = './uploads/knowledge-base-videos';
if (!fs.existsSync(videoUploadDir)) {
  fs.mkdirSync(videoUploadDir, { recursive: true });
}

const videoUploadStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, videoUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, 'kb-video-' + uniqueSuffix + '-' + sanitizedName);
  }
});

const videoUpload = multer({
  storage: videoUploadStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedMimes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only video files (mp4, webm, quicktime) are allowed'));
    }
  }
});

const upload = multer({
  storage: uploadStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 15, // Max 15 files per request
    fieldSize: 1024 * 1024, // 1MB form field limit
    fieldNameSize: 100 // Field name size limit
  },
  fileFilter: function (req, file, cb) {
    // Strict allowlist of supported document and image types
    const allowedMimes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    
    // Validate file extension matches MIME type
    const fileExt = file.originalname.toLowerCase().split('.').pop();
    const validExtensions = ['pdf', 'txt', 'docx', 'doc', 'jpg', 'jpeg', 'png', 'gif', 'webp'];
    
    if (allowedMimes.includes(file.mimetype) && fileExt && validExtensions.includes(fileExt)) {
      cb(null, true);
    } else {
      const error = new Error(`Unsupported file type: ${file.mimetype}. Only PDF, TXT, DOCX, and image files are supported.`);
      (error as any).code = 'UNSUPPORTED_FILE_TYPE';
      cb(error);
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

// Third-party integration API schema
const startConversationSchema = z.object({
  customer: z.object({
    name: z.string().min(1, 'Customer name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().optional(),
    company: z.string().optional(),
  }),
  contextData: z.record(z.any()).optional(), // Custom context from 3rd party (product info, page URL, etc.)
  organizationId: z.string().optional(), // For multi-tenant support
  initialMessage: z.string().optional(), // Optional first message to start the conversation
  aiEnabled: z.boolean().optional().default(true), // Whether AI should respond automatically
});

/**
 * Process uploaded file for AI training by extracting text and creating knowledge base article
 */
async function processFileForAITraining(
  uploadedFile: any, 
  category: string, 
  tags: string[], 
  userId: string
): Promise<void> {
  try {
    console.log(`Processing file ${uploadedFile.originalName} for AI training...`);
    
    // Only process document types that can be converted to knowledge base articles
    const supportedMimeTypes = [
      'text/plain',
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!supportedMimeTypes.includes(uploadedFile.mimeType)) {
      console.log(`Skipping AI training for ${uploadedFile.originalName} - unsupported type ${uploadedFile.mimeType}`);
      await storage.updateUploadedFile(uploadedFile.id, { 
        status: 'processed',
        processedAt: new Date()
      });
      return;
    }

    // Extract text content using DocumentProcessor
    const documentContent = await DocumentProcessor.extractText(
      uploadedFile.filePath,
      uploadedFile.originalName,
      uploadedFile.mimeType
    );

    // Format content for knowledge base
    const content = DocumentProcessor.formatForKnowledgeBase(documentContent);
    
    console.log(`Successfully extracted ${documentContent.metadata?.wordCount || 0} words from ${uploadedFile.originalName}`);

    // Create knowledge base article from the file
    const articleData = {
      title: uploadedFile.originalName.replace(/\.[^/.]+$/, ''), // Remove file extension
      content,
      category,
      tags,
      priority: 50, // Default priority
      isActive: true,
      sourceType: 'file' as const,
      fileName: uploadedFile.originalName,
      fileType: uploadedFile.mimeType,
      fileSize: uploadedFile.size,
      filePath: uploadedFile.filePath,
      assignedAgentIds: [], // No agent assignments by default
      createdBy: userId,
    };

    const knowledgeArticle = await storage.createKnowledgeBase(articleData);
    console.log(`Created knowledge base article ${knowledgeArticle.id} for file ${uploadedFile.originalName}`);

    // ✅ AUTOMATIC INDEXING: Index the article asynchronously (non-blocking)
    setImmediate(async () => {
      try {
        // Mark as indexing
        await storage.updateKnowledgeBase(knowledgeArticle.id, { indexingStatus: 'indexing' });
        
        const knowledgeRetrieval = KnowledgeRetrievalService.getInstance();
        await knowledgeRetrieval.reindexArticle(knowledgeArticle.id);
        
        // Mark as indexed with timestamp
        await storage.updateKnowledgeBase(knowledgeArticle.id, { 
          indexingStatus: 'indexed',
          indexedAt: new Date()
        });
        console.log(`✅ Successfully indexed article ${knowledgeArticle.id} for AI search`);
      } catch (indexError) {
        // Mark as failed with error message
        await storage.updateKnowledgeBase(knowledgeArticle.id, { 
          indexingStatus: 'failed',
          indexingError: indexError instanceof Error ? indexError.message : String(indexError)
        });
        console.error(`⚠️ Warning: Failed to index article ${knowledgeArticle.id}:`, indexError);
      }
    });

    // Link the uploaded file to the knowledge base article
    await storage.linkFileToKnowledgeBase(uploadedFile.id, knowledgeArticle.id);

    // Mark file as successfully processed
    await storage.updateUploadedFile(uploadedFile.id, { 
      status: 'processed',
      processedAt: new Date()
    });

    console.log(`Successfully processed file ${uploadedFile.originalName} for AI training`);
  } catch (error) {
    console.error(`Error processing file ${uploadedFile.originalName}:`, error);
    throw error;
  }
}

export async function registerRoutes(app: Express, sessionStore?: any): Promise<{ server: Server, wsServer?: any }> {
  // Rate limiting for authentication
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: { error: 'Too many authentication attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Rate limiting for file uploads
  const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 upload requests per windowMs
    message: { error: 'Too many file upload attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Global API rate limiter - prevents DDoS attacks
  const globalApiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 200, // 200 requests per minute per IP
    message: { error: 'Too many requests, please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip static assets and health checks
      return req.path === '/api/health' || !req.path.startsWith('/api');
    },
  });

  // Stricter rate limiter for message sending - prevents spam
  const messageLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 messages per minute per IP
    message: { error: 'You are sending messages too quickly. Please wait a moment.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Rate limiter for creating new conversations - prevents abuse
  const conversationCreateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 new conversations per hour per IP
    message: { error: 'You have reached the maximum number of new conversations. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply global rate limiter to all API routes
  app.use('/api', globalApiLimiter);

  // CSRF protection middleware
  const csrfProtection = (req: any, res: any, next: any) => {
    // Skip CSRF for GET requests
    if (req.method === 'GET') {
      return next();
    }
    
    const origin = req.get('Origin');
    const referer = req.get('Referer');
    const host = req.get('Host');
    
    console.log('[CSRF] Checking request:', { origin, referer, host, path: req.path });
    
    // In development/Replit environment, be more permissive with origin checks
    // Allow requests from Replit preview hosts
    if (origin && host) {
      const originHost = origin.replace(/^https?:\/\//, '').split('/')[0];
      const hostWithoutPort = host.split(':')[0];
      
      // Check if origins match (case-insensitive)
      if (originHost.toLowerCase() !== hostWithoutPort.toLowerCase()) {
        // Allow Replit domains
        if (originHost.includes('.replit.dev') || originHost.includes('.kirk.replit.dev')) {
          console.log('[CSRF] Allowing Replit domain:', originHost);
        } else {
          console.log('[CSRF] Origin mismatch - Origin:', originHost, 'Host:', hostWithoutPort);
          return res.status(403).json({ error: 'Invalid origin' });
        }
      }
    }
    
    // Check referer header as fallback only if no origin
    if (!origin && referer && host) {
      const refererHost = referer.replace(/^https?:\/\//, '').split('/')[0];
      const hostWithoutPort = host.split(':')[0];
      
      if (refererHost.toLowerCase() !== hostWithoutPort.toLowerCase()) {
        if (!refererHost.includes('.replit.dev')) {
          console.log('[CSRF] Referer mismatch - Referer:', refererHost, 'Host:', hostWithoutPort);
          return res.status(403).json({ error: 'Invalid referer' });
        }
      }
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
          console.error('Session regeneration error:', regenerateErr);
          return res.status(500).json({ error: 'Session regeneration failed' });
        }
        
        req.logIn(user, (loginErr) => {
          if (loginErr) {
            console.error('Login error:', loginErr);
            return res.status(500).json({ error: 'Login failed' });
          }
          
          // Save session explicitly to ensure it's persisted
          req.session.save((saveErr) => {
            if (saveErr) {
              console.error('Session save error:', saveErr);
              return res.status(500).json({ error: 'Session save failed' });
            }
            
            console.log('✅ Login successful:', user.email, '| Session ID:', req.sessionID);
            res.json({ user, message: 'Login successful' });
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

  // Customer portal authentication routes
  app.post('/api/portal/auth/login', authLimiter, csrfProtection, async (req, res) => {
    try {
      const loginData = z.object({
        email: z.string().email(),
        password: z.string(),
      }).parse(req.body);

      // Find customer by email
      const customer = await storage.getCustomerByEmail(loginData.email);
      if (!customer) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Check if customer has portal access
      if (!customer.hasPortalAccess || !customer.portalPassword) {
        return res.status(403).json({ error: 'Portal access not granted. Please contact support.' });
      }

      // Check password
      const isValidPassword = await compare(loginData.password, customer.portalPassword);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Update last login timestamp
      await storage.updateCustomerPortalLastLogin(customer.id);

      // Store customer info in session
      req.session.regenerate((regenerateErr: any) => {
        if (regenerateErr) {
          return res.status(500).json({ error: 'Session regeneration failed' });
        }

        // Store customer ID and type in session
        (req.session as any).customerId = customer.id;
        (req.session as any).userType = 'customer';

        // Return customer info (without password)
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
      const customerId = (req.session as any).customerId;
      const userType = (req.session as any).userType;

      if (!customerId || userType !== 'customer') {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const customer = await storage.getCustomer(customerId);
      if (!customer || !customer.hasPortalAccess) {
        return res.status(401).json({ error: 'Portal access not granted' });
      }

      // Return customer info (without password)
      const { portalPassword: _, ...customerData } = customer;
      res.json({ customer: customerData });
    } catch (error) {
      console.error('Get customer portal auth error:', error);
      res.status(500).json({ error: 'Failed to get customer info' });
    }
  });

  // Set customer portal password (staff only)
  app.post('/api/portal/set-password', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const passwordData = z.object({
        customerId: z.string().uuid(),
        password: z.string().min(6, "Password must be at least 6 characters"),
      }).parse(req.body);

      // Hash password
      const hashedPassword = await hash(passwordData.password, 10);

      // Update customer with hashed password and grant portal access
      await storage.setCustomerPortalPassword(passwordData.customerId, hashedPassword);

      res.json({ message: 'Portal access granted successfully' });
    } catch (error) {
      console.error('Set portal password error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request data' });
      }
      res.status(500).json({ error: 'Failed to set portal password' });
    }
  });

  // Customer portal stats
  app.get('/api/customer-portal/stats', async (req, res) => {
    try {
      const customerId = (req.session as any).customerId;
      const userType = (req.session as any).userType;

      if (!customerId || userType !== 'customer') {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const conversations = await storage.getConversationsByCustomer(customerId);
      
      const stats = {
        totalConversations: conversations.length,
        openConversations: conversations.filter(c => c.status === 'open' || c.status === 'in_progress').length,
        closedConversations: conversations.filter(c => c.status === 'closed' || c.status === 'resolved').length,
        pendingFeedback: 0, // Will implement when feedback feature is added
      };

      res.json(stats);
    } catch (error) {
      console.error('Get customer portal stats error:', error);
      res.status(500).json({ error: 'Failed to get stats' });
    }
  });

  // Customer portal all conversations
  app.get('/api/customer-portal/conversations', async (req, res) => {
    try {
      const customerId = (req.session as any).customerId;
      const userType = (req.session as any).userType;

      if (!customerId || userType !== 'customer') {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const conversations = await storage.getConversationsByCustomer(customerId);
      
      // Map all conversations - sort by priority first (urgent > high > medium > low), then by date
      const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      
      // Get agent info for all assigned agents
      const agentIds = [...new Set(conversations.filter(c => c.assignedAgentId).map(c => c.assignedAgentId as string))];
      const agentMap = new Map<string, { name: string }>();
      for (const agentId of agentIds) {
        const agent = await storage.getUser(agentId);
        if (agent) {
          agentMap.set(agentId, { name: agent.name || 'Support Agent' });
        }
      }
      
      const allConversations = conversations
        .sort((a, b) => {
          // First sort by priority
          const aPriority = priorityOrder[a.priority || 'low'] ?? 3;
          const bPriority = priorityOrder[b.priority || 'low'] ?? 3;
          if (aPriority !== bPriority) return aPriority - bPriority;
          // Then by date (most recent first)
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        })
        .map(conv => ({
          id: conv.id,
          subject: conv.subject || 'Untitled Conversation',
          status: conv.status,
          priority: conv.priority || 'low',
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          unreadCount: 0, // Can implement unread tracking later
          assignedAgentId: conv.assignedAgentId || null,
          assignedAgentName: conv.assignedAgentId ? agentMap.get(conv.assignedAgentId)?.name || 'Support Agent' : null,
        }));

      res.json(allConversations);
    } catch (error) {
      console.error('Get customer portal all conversations error:', error);
      res.status(500).json({ error: 'Failed to get conversations' });
    }
  });

  // Customer portal recent conversations
  app.get('/api/customer-portal/conversations/recent', async (req, res) => {
    try {
      const customerId = (req.session as any).customerId;
      const userType = (req.session as any).userType;

      if (!customerId || userType !== 'customer') {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const conversations = await storage.getConversationsByCustomer(customerId);
      
      // Get recent 5 conversations, sorted by last message time
      const recentConversations = conversations
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5)
        .map(conv => ({
          id: conv.id,
          subject: conv.subject || 'Untitled Conversation',
          status: conv.status,
          lastMessageAt: conv.updatedAt,
          unreadCount: 0, // Can implement unread tracking later
        }));

      res.json(recentConversations);
    } catch (error) {
      console.error('Get customer portal recent conversations error:', error);
      res.status(500).json({ error: 'Failed to get conversations' });
    }
  });

  // Create new conversation for portal customer
  app.post('/api/customer-portal/conversations/create', conversationCreateLimiter, async (req, res) => {
    try {
      const customerId = (req.session as any).customerId;
      const userType = (req.session as any).userType;

      if (!customerId || userType !== 'customer') {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const createData = z.object({
        subject: z.string().min(1, 'Subject is required'),
        message: z.string().min(1, 'Message is required'),
      }).parse(req.body);

      // Get customer info
      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      // Create conversation
      const conversation = await storage.createConversation({
        customerId: customerId,
        subject: createData.subject,
        status: 'open',
        priority: 'medium',
        channel: 'portal',
      });

      // Create initial message
      await storage.createMessage({
        conversationId: conversation.id,
        content: createData.message,
        senderType: 'customer',
        senderId: customerId,
        senderName: customer.name || customer.email || 'Customer',
        createdAt: new Date().toISOString(),
      });

      res.json({ conversationId: conversation.id });
    } catch (error) {
      console.error('Create portal conversation error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0]?.message || 'Invalid request data' });
      }
      res.status(500).json({ error: 'Failed to create conversation' });
    }
  });

  // Get single conversation with messages for portal customer
  app.get('/api/customer-portal/conversation/:conversationId', async (req, res) => {
    try {
      const customerId = (req.session as any).customerId;
      const userType = (req.session as any).userType;

      if (!customerId || userType !== 'customer') {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { conversationId } = req.params;

      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // Verify customer owns this conversation
      if (conversation.customerId !== customerId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Update customerLastViewedAt for read receipt tracking (async, don't block response)
      storage.updateConversation(conversationId, {
        customerLastViewedAt: new Date(),
      }).catch(err => console.error('Failed to update customerLastViewedAt:', err));

      // Broadcast read receipt to staff via WebSocket
      const wsServer = (app as any).wsServer;
      if (wsServer && wsServer.broadcastToStaff) {
        wsServer.broadcastToStaff({
          type: 'customer_read_receipt',
          conversationId,
          customerId,
          viewedAt: new Date().toISOString(),
        });
      }

      // Get messages
      const messages = await storage.getMessagesByConversation(conversationId);

      res.json({
        id: conversation.id,
        subject: conversation.subject || 'Untitled Conversation',
        status: conversation.status,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        customerLastViewedAt: conversation.customerLastViewedAt,
        messages: messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          senderType: msg.senderType,
          senderName: msg.senderName || 'Support',
          createdAt: msg.createdAt,
          isRead: msg.isRead,
        })),
      });
    } catch (error) {
      console.error('Get portal conversation error:', error);
      res.status(500).json({ error: 'Failed to get conversation' });
    }
  });

  // Mark conversation as read by customer (explicit read receipt)
  app.post('/api/customer-portal/conversation/:conversationId/read', async (req, res) => {
    try {
      const customerId = (req.session as any).customerId;
      const userType = (req.session as any).userType;

      if (!customerId || userType !== 'customer') {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { conversationId } = req.params;

      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // Verify customer owns this conversation
      if (conversation.customerId !== customerId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const viewedAt = new Date();
      
      // Update customerLastViewedAt
      await storage.updateConversation(conversationId, {
        customerLastViewedAt: viewedAt,
      });

      // Broadcast read receipt to staff via WebSocket
      const wsServer = (app as any).wsServer;
      if (wsServer && wsServer.broadcastToStaff) {
        wsServer.broadcastToStaff({
          type: 'customer_read_receipt',
          conversationId,
          customerId,
          viewedAt: viewedAt.toISOString(),
        });
      }

      res.json({ success: true, viewedAt: viewedAt.toISOString() });
    } catch (error) {
      console.error('Mark conversation as read error:', error);
      res.status(500).json({ error: 'Failed to mark conversation as read' });
    }
  });

  // Send message to conversation for portal customer
  app.post('/api/customer-portal/conversation/:conversationId/messages', messageLimiter, async (req, res) => {
    try {
      const customerId = (req.session as any).customerId;
      const userType = (req.session as any).userType;

      if (!customerId || userType !== 'customer') {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { conversationId } = req.params;
      const { content } = z.object({
        content: z.string().min(1, 'Message cannot be empty'),
      }).parse(req.body);

      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // Verify customer owns this conversation
      if (conversation.customerId !== customerId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Check if conversation is closed - reopen if so
      if (conversation.status === 'closed' || conversation.status === 'resolved') {
        console.log(`[portal-chat] Reopening closed conversation: ${conversationId}`);
        await storage.updateConversationStatus(conversationId, 'open');
      }

      // Get customer info
      const customer = await storage.getCustomer(customerId);

      // Create message
      const message = await storage.createMessage({
        conversationId,
        content,
        senderType: 'customer',
        senderId: customerId,
        senderName: customer?.name || customer?.email || 'Customer',
        createdAt: new Date().toISOString(),
      });

      // Update conversation timestamp
      await storage.updateConversation(conversationId, {
        updatedAt: new Date().toISOString(),
      });

      // Broadcast message notification to staff
      const wsServer = (app as any).wsServer;
      if (wsServer && wsServer.broadcastNewMessageToStaff) {
        const fullConversation = await storage.getConversationWithCustomer(conversationId);
        if (fullConversation && fullConversation.customer) {
          wsServer.broadcastNewMessageToStaff(fullConversation, fullConversation.customer, {
            id: message.id,
            content: message.content,
            senderType: message.senderType,
            timestamp: message.timestamp
          });
        }
      }

      // Broadcast new_message event so agent conversation view refreshes
      if (wsServer && wsServer.broadcastNewMessage) {
        wsServer.broadcastNewMessage(conversationId, {
          messageId: message.id,
          conversationId: conversationId,
          content: message.content,
          userId: customerId,
          userName: customer?.name || customer?.email || 'Customer',
          userRole: 'customer',
          senderType: 'customer',
          timestamp: message.createdAt || new Date().toISOString(),
          status: message.status
        });
        console.log(`[portal-chat] Broadcast new_message event for customer message: ${message.id}`);
      }

      // Trigger AI response asynchronously (don't block the response)
      // Only generate AI response if AI is enabled for this conversation
      if (conversation && conversation.aiAssistanceEnabled !== false) {
        (async () => {
          try {
            console.log(`[portal-chat] Generating AI response for conversation: ${conversationId}`);
            const aiResponse = await AIService.generateSmartAgentResponse(
              content,
              conversationId
            );
          
          if (aiResponse && aiResponse.response) {
            // Create AI message with senderType 'ai' for proper frontend rendering
            const SYSTEM_AI_AGENT_ID = 'ai-system-agent-001';
            const aiMessageCreatedAt = new Date().toISOString();
            const aiMessage = await storage.createMessage({
              conversationId,
              content: aiResponse.response,
              senderId: SYSTEM_AI_AGENT_ID,
              senderType: 'ai',
              senderName: 'Alex (AI Assistant)',
              createdAt: aiMessageCreatedAt,
            });
            console.log(`[portal-chat] AI response created: ${aiMessage.id}`);
            
            // Broadcast AI message via WebSocket
            if (wsServer && wsServer.broadcastNewMessage) {
              wsServer.broadcastNewMessage(conversationId, {
                messageId: aiMessage.id,
                conversationId: aiMessage.conversationId,
                content: aiMessage.content,
                userId: SYSTEM_AI_AGENT_ID,
                userName: 'Alex (AI Assistant)',
                userRole: 'ai',
                senderType: aiMessage.senderType,
                timestamp: aiMessage.createdAt || aiMessageCreatedAt,
                status: aiMessage.status
              });
            }
          }
        } catch (aiError) {
          console.error('[portal-chat] AI response generation failed:', aiError);
        }
        })();
      } else {
        console.log(`[portal-chat] AI response skipped - AI is disabled for conversation: ${conversationId}`);
      }

      res.json({ messageId: message.id });
    } catch (error) {
      console.error('Send portal message error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0]?.message || 'Invalid request data' });
      }
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  // Update customer profile
  app.put('/api/customer-portal/profile', async (req, res) => {
    try {
      const customerId = (req.session as any).customerId;
      const userType = (req.session as any).userType;

      if (!customerId || userType !== 'customer') {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const profileData = z.object({
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        company: z.string().optional(),
      }).parse(req.body);

      await storage.updateCustomerProfile(customerId, profileData);

      res.json({ message: 'Profile updated successfully' });
    } catch (error) {
      console.error('Update customer profile error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request data' });
      }
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  // Change customer password
  app.post('/api/customer-portal/change-password', async (req, res) => {
    try {
      const customerId = (req.session as any).customerId;
      const userType = (req.session as any).userType;

      if (!customerId || userType !== 'customer') {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const passwordData = z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(6),
      }).parse(req.body);

      const customer = await storage.getCustomer(customerId);
      
      // Verify current password
      const isValid = await compare(passwordData.currentPassword, customer.portalPassword || '');
      if (!isValid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Hash and update new password
      const hashedPassword = await hash(passwordData.newPassword, 10);
      await storage.setCustomerPortalPassword(customerId, hashedPassword);

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change customer password error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request data' });
      }
      res.status(500).json({ error: 'Failed to change password' });
    }
  });

  // Get customer portal feedback
  app.get('/api/customer-portal/feedback', async (req, res) => {
    try {
      const customerId = (req.session as any).customerId;
      const userType = (req.session as any).userType;

      if (!customerId || userType !== 'customer') {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const feedbackList = await storage.getCustomerFeedback(customerId);

      res.json(feedbackList);
    } catch (error) {
      console.error('Get customer portal feedback error:', error);
      res.status(500).json({ error: 'Failed to get feedback' });
    }
  });

  // Get all feedback for staff (admin and agents)
  app.get('/api/staff/feedback', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const feedbackList = await storage.getAllFeedback();

      res.json(feedbackList);
    } catch (error) {
      console.error('Get staff feedback error:', error);
      res.status(500).json({ error: 'Failed to get feedback' });
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

  // Get staff members (agents and admins) for assignment
  app.get('/api/users/staff', requireAuth, requireRole(['agent', 'admin']), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Filter to only agents and admins, remove passwords
      const staffUsers = users
        .filter(user => user.role === 'agent' || user.role === 'admin')
        .map(user => {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        });
      res.json(staffUsers);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch staff' });
    }
  });

  // Get single user by ID (admin only)
  app.get('/api/users/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  // Create new user (admin only)
  app.post('/api/users', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const createUserSchema = z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(1),
        role: z.enum(['admin', 'agent']).default('agent'),
      });
      
      const data = createUserSchema.parse(req.body);
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      
      // Hash the password
      const hashedPassword = await hash(data.password, 10);
      
      const user = await storage.createUser({
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: data.role,
        status: 'offline',
      });
      
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      console.error('Failed to create user:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  // Update user (admin only)
  app.put('/api/users/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const updateUserSchema = z.object({
        email: z.string().email().optional(),
        password: z.string().min(6).optional(),
        name: z.string().min(1).optional(),
        role: z.enum(['admin', 'agent']).optional(),
      });
      
      const data = updateUserSchema.parse(req.body);
      
      // Check if user exists
      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // If email is being updated, check for duplicates
      if (data.email && data.email !== existingUser.email) {
        const emailUser = await storage.getUserByEmail(data.email);
        if (emailUser) {
          return res.status(400).json({ error: 'Email already exists' });
        }
      }
      
      // Prepare update data
      const updateData: any = { ...data };
      if (data.password) {
        updateData.password = await hash(data.password, 10);
      }
      
      const user = await storage.updateUser(id, updateData);
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      console.error('Failed to update user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  // Toggle user status (enable/disable) - admin only
  app.put('/api/users/:id/toggle-status', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if user exists
      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Toggle between 'disabled' and 'offline'
      const newStatus = existingUser.status === 'disabled' ? 'offline' : 'disabled';
      await storage.updateUserStatus(id, newStatus);
      
      const updatedUser = await storage.getUser(id);
      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found after update' });
      }
      
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Failed to toggle user status:', error);
      res.status(500).json({ error: 'Failed to toggle user status' });
    }
  });

  // Delete user (admin only)
  app.delete('/api/users/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if user exists
      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Prevent deleting yourself
      if (req.user && req.user.id === id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }
      
      // Delete all user permissions first (cascade)
      await storage.deleteAllUserPermissions(id);
      await storage.deleteUser(id);
      res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      console.error('Failed to delete user:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  // User Permission Management routes (admin only)
  app.get('/api/permissions/users-with-permissions', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const usersWithPermissions = await storage.getAllUsersWithPermissions();
      // Remove passwords from response
      const safeData = usersWithPermissions.map(item => ({
        user: (() => {
          const { password, ...userWithoutPassword } = item.user;
          return userWithoutPassword;
        })(),
        permissions: item.permissions
      }));
      res.json(safeData);
    } catch (error) {
      console.error('Failed to fetch users with permissions:', error);
      res.status(500).json({ error: 'Failed to fetch users with permissions' });
    }
  });

  app.get('/api/permissions/user/:userId', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { userId } = req.params;
      const permissions = await storage.getUserPermissions(userId);
      res.json(permissions);
    } catch (error) {
      console.error('Failed to fetch user permissions:', error);
      res.status(500).json({ error: 'Failed to fetch user permissions' });
    }
  });

  app.post('/api/permissions/set', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { userId, feature, permission } = z.object({
        userId: z.string(),
        feature: z.string(),
        permission: z.enum(['hidden', 'view', 'edit'])
      }).parse(req.body);

      const result = await storage.setUserPermission(userId, feature, permission);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      console.error('Failed to set user permission:', error);
      res.status(500).json({ error: 'Failed to set user permission' });
    }
  });

  app.delete('/api/permissions/:userId/:feature', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { userId, feature } = req.params;
      await storage.deleteUserPermission(userId, feature);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete user permission:', error);
      res.status(500).json({ error: 'Failed to delete user permission' });
    }
  });

  app.get('/api/permissions/my-permissions', requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      const permissions = await storage.getUserPermissions(req.user.id);
      res.json(permissions);
    } catch (error) {
      console.error('Failed to fetch user permissions:', error);
      res.status(500).json({ error: 'Failed to fetch user permissions' });
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

  // Get conversations for a specific customer
  app.get('/api/customers/:customerId/conversations', requireAuth, async (req, res) => {
    try {
      // Validate customer ID
      const customerId = z.string().uuid().parse(req.params.customerId);
      
      // Verify customer exists
      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      // Get conversations for this customer
      const conversations = await storage.getConversationsByCustomer(customerId);
      
      // Enrich conversations with last message and agent info
      const enrichedConversations = await Promise.all(
        conversations.map(async (conv) => {
          try {
            // Get last message for this conversation
            const messages = await storage.getMessagesByConversation(conv.id);
            const lastMessage = messages[messages.length - 1];
            
            let lastMessageData = null;
            if (lastMessage) {
              lastMessageData = {
                content: lastMessage.content,
                timestamp: lastMessage.timestamp,
                sender: lastMessage.senderType
              };
            }
            
            // Get agent info if assigned
            let agentName = null;
            if (conv.assignedAgentId) {
              const agent = await storage.getUser(conv.assignedAgentId);
              agentName = agent?.name || null;
            }
            
            return {
              ...conv,
              lastMessage: lastMessageData,
              agentName,
              messageCount: messages.length
            };
          } catch (error) {
            console.error(`Error enriching conversation ${conv.id}:`, error);
            return {
              ...conv,
              lastMessage: null,
              agentName: null,
              messageCount: 0
            };
          }
        })
      );
      
      res.json(enrichedConversations);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid customer ID', 
          details: fromZodError(error).toString() 
        });
      }
      console.error('Failed to fetch customer conversations:', error);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  });

  // Conversation management routes
  app.get('/api/conversations', requireAuth, async (req, res) => {
    try {
      // Disable all caching to debug issue
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.set('Surrogate-Control', 'no-store');
      const user = req.user as any;
      let conversations: any[];
      
      if (user.role === 'admin' || user.role === 'agent') {
        // Both admins and agents can see ALL conversations
        // Assignment is just a category/filter, not a visibility restriction
        const allConversations = await storage.getAllConversations();
        console.log(`${user.role} ${user.name} requesting conversations, found ${allConversations.length} conversations`);
        
        // Mark each conversation with assignment status for filtering
        conversations = allConversations.map(conv => ({
          ...conv,
          isAssigned: !!conv.assignedAgentId,
          isAssignedToMe: conv.assignedAgentId === user.id
        }));
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
      
      // Disable ETags to prevent 304 caching issues
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.set('ETag', ''); // Clear ETag
      
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

  // Notification routes
  app.get('/api/notifications/unread-counts', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const unreadCounts = await storage.getUnreadCountsByConversation(user.id);
      res.json(unreadCounts);
    } catch (error) {
      console.error('Failed to fetch unread counts:', error);
      res.status(500).json({ error: 'Failed to fetch unread counts' });
    }
  });

  app.put('/api/notifications/:conversationId/read', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { conversationId } = req.params;
      
      // Validate conversation ID is a non-empty string
      if (!conversationId || typeof conversationId !== 'string' || conversationId.trim() === '') {
        return res.status(400).json({ error: 'Invalid conversation ID' });
      }
      
      await storage.markConversationAsRead(user.id, conversationId);
      res.json({ message: 'Conversation marked as read' });
    } catch (error) {
      console.error('Failed to mark conversation as read:', error);
      res.status(500).json({ error: 'Failed to mark conversation as read' });
    }
  });

  // Message-level unread tracking routes
  app.get('/api/unread-counts', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const unreadCounts = await storage.getUnreadMessageCountsPerConversation(user.id);
      res.json(unreadCounts);
    } catch (error) {
      console.error('Failed to fetch unread message counts:', error);
      res.status(500).json({ error: 'Failed to fetch unread message counts' });
    }
  });

  app.post('/api/conversations/:conversationId/mark-read', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Validate conversation ID is a valid UUID
      const uuidSchema = z.object({
        conversationId: z.string().uuid('Invalid conversation ID format')
      });
      
      const validation = uuidSchema.safeParse(req.params);
      if (!validation.success) {
        const readableError = fromZodError(validation.error);
        return res.status(400).json({ error: readableError.message });
      }
      
      const { conversationId } = validation.data;
      
      const success = await storage.markAllConversationMessagesAsRead(conversationId, user.id);
      
      if (!success) {
        return res.status(404).json({ error: 'Conversation not found or access denied' });
      }
      
      res.json({ message: 'All messages marked as read' });
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
      res.status(500).json({ error: 'Failed to mark messages as read' });
    }
  });

  app.get('/api/conversations/:id/messages', requireAuth, async (req, res) => {
    try {
      // Disable caching for real-time message updates
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const user = req.user as any;
      const messages = await storage.getMessagesByConversation(req.params.id);
      
      // Get read status for all messages
      const messageIds = messages.map(m => m.id);
      const readStatus = await storage.getMessagesReadStatus(messageIds, user.id);
      
      // AI System Agent ID used for AI-generated messages
      const AI_SYSTEM_AGENT_ID = 'ai-system-agent-001';
      
      // Enrich messages with sender information and read status
      const enrichedMessages = await Promise.all(
        messages.map(async (message) => {
          let sender;
          let effectiveSenderType = message.senderType;
          
          // Check if this is an AI message
          const isAiMessage = message.senderId === AI_SYSTEM_AGENT_ID;
          
          if (isAiMessage) {
            effectiveSenderType = 'ai';
            sender = {
              id: AI_SYSTEM_AGENT_ID,
              name: 'Alex (AI Assistant)',
              role: 'ai'
            };
          } else if (message.senderType === 'system') {
            // System messages have a special sender
            sender = {
              id: 'system',
              name: 'System',
              role: 'system'
            };
          } else if (message.senderType === 'customer') {
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
            senderType: effectiveSenderType,
            scope: message.scope,
            timestamp: message.timestamp,
            status: message.status,
            isRead: readStatus.get(message.id) || false,
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
      // Accept any string ID for backwards compatibility with old data
      const conversationId = z.string().parse(req.params.id);
      
      // Validate request body
      const { status } = conversationStatusSchema.parse(req.body);
      const user = req.user as any;
      
      console.log(`[PATCH /api/conversations/:id/status] Updating conversation ${conversationId} to status: ${status}`);
      
      // Check if conversation exists
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        console.log(`[PATCH /api/conversations/:id/status] Conversation ${conversationId} not found`);
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      const previousStatus = conversation.status;
      console.log(`[PATCH /api/conversations/:id/status] Current status: ${previousStatus}, updating to: ${status}`);
      
      await storage.updateConversationStatus(conversationId, status);
      
      // Verify the update
      const updatedConversation = await storage.getConversation(conversationId);
      console.log(`[PATCH /api/conversations/:id/status] Status after update: ${updatedConversation?.status}`);
      
      // Create system message for status change
      let systemMessageContent = '';
      if (status === 'closed') {
        systemMessageContent = `Conversation closed by ${user.name}`;
      } else if (status === 'resolved') {
        systemMessageContent = `Conversation marked as resolved by ${user.name}`;
      } else if (status === 'open') {
        systemMessageContent = `Conversation reopened by ${user.name}`;
      } else if (status === 'pending') {
        systemMessageContent = `Conversation status changed to pending by ${user.name}`;
      }
      
      // Only create system message if status actually changed
      if (systemMessageContent && previousStatus !== status) {
        const systemMessage = await storage.createMessage({
          conversationId,
          senderId: 'system',
          senderType: 'system',
          content: systemMessageContent,
          scope: 'public'
        });
        
        // Broadcast system message via WebSocket
        const wsServer = (req.app as any).wsServer;
        if (wsServer) {
          wsServer.broadcastNewMessage(conversationId, {
            messageId: systemMessage.id,
            conversationId: systemMessage.conversationId,
            content: systemMessage.content,
            senderId: systemMessage.senderId,
            senderType: systemMessage.senderType,
            scope: systemMessage.scope,
            timestamp: systemMessage.timestamp,
            status: systemMessage.status
          });
        }
      }
      
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

  // Bulk close conversations
  app.post('/api/conversations/bulk/close', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { conversationIds } = z.object({
        conversationIds: z.array(z.string()).min(1, 'At least one conversation ID is required')
      }).parse(req.body);
      
      const user = req.user as any;
      
      console.log(`[POST /api/conversations/bulk/close] Closing ${conversationIds.length} conversations`);
      
      // Update all conversations
      const results = [];
      for (const conversationId of conversationIds) {
        try {
          const conversation = await storage.getConversation(conversationId);
          if (!conversation) {
            console.log(`[POST /api/conversations/bulk/close] Conversation ${conversationId} not found`);
            continue;
          }
          
          const previousStatus = conversation.status;
          
          // Update status
          await storage.updateConversationStatus(conversationId, 'closed');
          
          // Create system message for closure
          const systemMessage = await storage.createMessage({
            conversationId,
            senderId: 'system',
            senderType: 'system',
            content: `Conversation closed by ${user.name}`,
            scope: 'public'
          });
          
          // Broadcast via WebSocket
          const wsServer = (req.app as any).wsServer;
          if (wsServer) {
            wsServer.broadcastNewMessage(conversationId, {
              messageId: systemMessage.id,
              conversationId: systemMessage.conversationId,
              content: systemMessage.content,
              senderId: systemMessage.senderId,
              senderType: systemMessage.senderType,
              scope: systemMessage.scope,
              timestamp: systemMessage.timestamp,
              status: systemMessage.status
            });
          }
          
          results.push({ conversationId, success: true });
        } catch (err) {
          console.error(`[POST /api/conversations/bulk/close] Error closing conversation ${conversationId}:`, err);
          results.push({ conversationId, success: false, error: String(err) });
        }
      }
      
      res.json({ message: `${conversationIds.length} conversation(s) closed successfully`, results });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: fromZodError(error).toString() 
        });
      }
      res.status(500).json({ error: 'Failed to close conversations' });
    }
  });

  // Toggle AI assistance for conversation
  app.patch('/api/conversations/:id/ai-assistance', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      // Validate conversation ID
      const conversationId = z.string().parse(req.params.id);
      
      // Validate request body
      const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body);
      const user = req.user as any;
      
      // Check if conversation exists
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      // Authorization: any staff member (agent or admin) can toggle AI for any conversation
      
      // Toggle AI assistance
      await storage.toggleAiAssistance(conversationId, enabled);
      
      // Log the activity
      await storage.createActivityLog({
        agentId: user.id,
        conversationId,
        action: enabled ? 'ai_enabled' : 'ai_disabled',
        details: `AI assistance ${enabled ? 'enabled' : 'disabled'} by ${user.name}`
      });
      
      // Broadcast AI toggle update via WebSocket
      const wsServer = (req.app as any).wsServer;
      if (wsServer) {
        wsServer.broadcastConversationUpdate(conversationId, {
          id: conversationId,
          aiAssistanceEnabled: enabled,
          updatedAt: new Date().toISOString()
        });
      }
      
      res.json({ 
        message: `AI assistance ${enabled ? 'enabled' : 'disabled'} successfully`,
        aiAssistanceEnabled: enabled
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: fromZodError(error).toString() 
        });
      }
      console.error('Error toggling AI assistance:', error);
      res.status(500).json({ error: 'Failed to toggle AI assistance' });
    }
  });

  // Schedule follow-up for conversation
  app.put('/api/conversations/:id/followup', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      // Validate conversation ID
      const conversationId = z.string().uuid().parse(req.params.id);
      
      // Validate request body
      const { followupDate } = followupUpdateSchema.parse(req.body);
      const user = req.user as any;
      
      // Check if conversation exists
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      // Authorization: only assigned agent or admin can set follow-up
      if (user.role === 'agent' && conversation.assignedAgentId !== user.id) {
        return res.status(403).json({ error: 'You can only set follow-ups for conversations assigned to you' });
      }
      
      // Update conversation with follow-up date (convert to Date or null)
      const followupDateObj = followupDate ? new Date(followupDate) : null;
      await storage.updateConversation(conversationId, {
        followupDate: followupDateObj
      } as any);
      
      // Log the follow-up activity
      const actionType = followupDate ? 'followup_set' : 'followup_cleared';
      const details = followupDate 
        ? `Follow-up scheduled for ${new Date(followupDate).toLocaleDateString()} by ${user.name}`
        : `Follow-up cleared by ${user.name}`;
      
      await storage.createActivityLog({
        agentId: user.id,
        conversationId,
        action: actionType,
        details
      });
      
      // Create system message for follow-up change
      let systemMessageContent = '';
      if (followupDate) {
        const followupDateFormatted = new Date(followupDate).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        systemMessageContent = `Conversation moved to follow-up by ${user.name}. Scheduled for ${followupDateFormatted}`;
      } else {
        systemMessageContent = `Follow-up cleared by ${user.name}`;
      }
      
      const systemMessage = await storage.createMessage({
        conversationId,
        senderId: 'system',
        senderType: 'system',
        content: systemMessageContent,
        scope: 'public'
      });
      
      // Broadcast follow-up update via WebSocket
      const wsServer = (req.app as any).wsServer;
      if (wsServer) {
        wsServer.broadcastConversationUpdate(conversationId, {
          id: conversationId,
          followupDate: followupDate,
          updatedAt: new Date().toISOString()
        });
        
        // Broadcast system message
        wsServer.broadcastNewMessage(conversationId, {
          messageId: systemMessage.id,
          conversationId: systemMessage.conversationId,
          content: systemMessage.content,
          senderId: systemMessage.senderId,
          senderType: systemMessage.senderType,
          scope: systemMessage.scope,
          timestamp: systemMessage.timestamp,
          status: systemMessage.status
        });
      }
      
      res.json({ 
        message: followupDate ? 'Follow-up scheduled successfully' : 'Follow-up cleared successfully',
        followupDate: followupDate
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: fromZodError(error).toString() 
        });
      }
      console.error('Error scheduling follow-up:', error);
      res.status(500).json({ error: 'Failed to schedule follow-up' });
    }
  });

  // Conversation rating routes
  app.post('/api/conversations/:id/rating', async (req, res) => {
    try {
      const conversationId = z.string().uuid().parse(req.params.id);
      
      // Validate request body - rating (1-5), optional feedback text, optional customer details
      const ratingSchema = z.object({
        rating: z.number().int().min(1).max(5),
        feedback: z.string().optional(),
        customerName: z.string().optional(),
        customerEmail: z.string().email().optional(),
      });
      
      const { rating, feedback, customerName, customerEmail } = ratingSchema.parse(req.body);
      
      // Check if conversation exists
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      // Check if rating already exists
      const existingRating = await storage.getConversationRating(conversationId);
      if (existingRating) {
        return res.status(400).json({ error: 'Conversation already rated' });
      }
      
      // Get all messages for sentiment analysis
      const messages = await storage.getMessagesByConversation(conversationId);
      
      // Perform AI sentiment analysis on the conversation
      const sentimentAnalysis = await AIService.analyzeConversationSentiment(messages);
      
      // Create the rating record
      const newRating = await storage.createConversationRating({
        conversationId,
        customerId: conversation.customerId,
        rating,
        feedback: feedback || null,
        primaryAgentId: conversation.assignedAgentId,
        aiSentimentScore: sentimentAnalysis.sentimentScore,
        aiSentimentLabel: sentimentAnalysis.sentimentLabel,
        aiAnalysisSummary: sentimentAnalysis.summary,
        aiConfidence: sentimentAnalysis.confidence,
        customerName: customerName || null,
        customerEmail: customerEmail || null,
      });
      
      res.status(201).json(newRating);
    } catch (error) {
      console.error('Error creating conversation rating:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: fromZodError(error).toString() 
        });
      }
      res.status(500).json({ error: 'Failed to create rating' });
    }
  });

  // Get conversation rating
  app.get('/api/conversations/:id/rating', async (req, res) => {
    try {
      const conversationId = z.string().uuid().parse(req.params.id);
      
      const rating = await storage.getConversationRating(conversationId);
      if (!rating) {
        return res.status(404).json({ error: 'No rating found for this conversation' });
      }
      
      res.json(rating);
    } catch (error) {
      console.error('Error fetching conversation rating:', error);
      res.status(500).json({ error: 'Failed to fetch rating' });
    }
  });

  // Get agent performance statistics
  app.get('/api/agents/:agentId/performance', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const agentId = z.string().uuid().parse(req.params.agentId);
      const user = req.user as any;
      
      // Authorization: agents can only view their own stats, admins can view all
      if (user.role === 'agent' && user.id !== agentId) {
        return res.status(403).json({ error: 'You can only view your own performance statistics' });
      }
      
      // Get query params for date range
      const periodStart = req.query.periodStart ? new Date(req.query.periodStart as string) : undefined;
      const periodEnd = req.query.periodEnd ? new Date(req.query.periodEnd as string) : undefined;
      
      const stats = await storage.getAgentPerformanceStats(agentId, periodStart, periodEnd);
      
      res.json(stats);
    } catch (error) {
      console.error('Error fetching agent performance:', error);
      res.status(500).json({ error: 'Failed to fetch performance statistics' });
    }
  });

  // Calculate and store agent performance statistics for a period
  app.post('/api/agents/:agentId/performance/calculate', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const agentId = z.string().uuid().parse(req.params.agentId);
      
      const periodSchema = z.object({
        periodStart: z.string().transform(s => new Date(s)),
        periodEnd: z.string().transform(s => new Date(s)),
      });
      
      const { periodStart, periodEnd } = periodSchema.parse(req.body);
      
      const stats = await storage.calculateAndStoreAgentStats(agentId, periodStart, periodEnd);
      
      res.status(201).json(stats);
    } catch (error) {
      console.error('Error calculating agent performance:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: fromZodError(error).toString() 
        });
      }
      res.status(500).json({ error: 'Failed to calculate performance statistics' });
    }
  });

  // Get all agents' performance statistics (admin only)
  app.get('/api/agents/performance/all', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const periodStart = req.query.periodStart ? new Date(req.query.periodStart as string) : undefined;
      const periodEnd = req.query.periodEnd ? new Date(req.query.periodEnd as string) : undefined;
      
      const stats = await storage.getAllAgentsPerformanceStats(periodStart, periodEnd);
      
      res.json(stats);
    } catch (error) {
      console.error('Error fetching all agents performance:', error);
      res.status(500).json({ error: 'Failed to fetch performance statistics' });
    }
  });

  // Activity Notification routes
  // Get all activity notifications for current user
  app.get('/api/activity/notifications', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const unreadOnly = req.query.unreadOnly === 'true';
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const search = req.query.search as string | undefined;
      
      const notifications = await storage.getActivityNotifications(user.id, {
        unreadOnly,
        limit,
        search,
      });
      
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching activity notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  // Get unread activity notification count
  app.get('/api/activity/notifications/unread-count', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const count = await storage.getUnreadActivityCount(user.id);
      res.json({ count });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({ error: 'Failed to fetch unread count' });
    }
  });

  // Mark a notification as read
  app.patch('/api/activity/notifications/:id/read', requireAuth, async (req, res) => {
    try {
      const notificationId = z.string().uuid().parse(req.params.id);
      await storage.markActivityNotificationAsRead(notificationId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid notification ID' });
      }
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  });

  // Mark all notifications as read
  app.patch('/api/activity/notifications/read-all', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      await storage.markAllActivityNotificationsAsRead(user.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  });

  // Create a notification (for testing or system use)
  app.post('/api/activity/notifications', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const notificationData = z.object({
        userId: z.string().uuid(),
        type: z.enum(['mention', 'tag', 'reminder', 'assignment', 'comment', 'system']),
        title: z.string(),
        message: z.string(),
        link: z.string().optional(),
        linkType: z.enum(['conversation', 'post', 'knowledge_base', 'custom']).optional(),
        relatedId: z.string().uuid().optional(),
        triggeredBy: z.string().uuid().optional(),
      }).parse(req.body);
      
      const notification = await storage.createActivityNotification(notificationData);
      res.status(201).json(notification);
    } catch (error) {
      console.error('Error creating notification:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: fromZodError(error).toString() 
        });
      }
      res.status(500).json({ error: 'Failed to create notification' });
    }
  });

  // Delete a notification
  app.delete('/api/activity/notifications/:id', requireAuth, async (req, res) => {
    try {
      const notificationId = z.string().uuid().parse(req.params.id);
      await storage.deleteActivityNotification(notificationId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting notification:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid notification ID' });
      }
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  });

  // Message management routes
  app.post('/api/messages', requireAuth, async (req, res) => {
    try {
      // Validate request body
      const { conversationId, content } = messageCreateSchema.parse(req.body);
      const user = req.user as any;
      
      console.log(`[POST /api/messages] Staff ${user.name} (${user.role}) sending message to conversation ${conversationId}`);
      
      // Check if conversation exists
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      // Any staff member (agent or admin) can message any conversation
      
      // Reopen conversation if it was closed
      if (conversation.status === 'closed') {
        console.log(`[messages] Reopening closed conversation: ${conversationId}`);
        await storage.updateConversationStatus(conversationId, 'open');
      }
      
      // Determine sender type from user role
      const senderType = user.role === 'admin' ? 'admin' : 'agent';
      
      console.log(`[POST /api/messages] Creating message with senderId=${user.id}, senderType=${senderType}, scope=public`);
      const message = await storage.createMessage({
        conversationId,
        senderId: user.id,
        senderType,
        content,
        scope: 'public'
      });
      console.log(`[POST /api/messages] Message created successfully: ${message.id}`);
      
      // Auto-disable AI assistance when an agent responds
      if (conversation.aiAssistanceEnabled) {
        await storage.toggleAiAssistance(conversationId, false);
      }
      
      // Log the response activity
      await storage.createActivityLog({
        agentId: user.id,
        conversationId,
        action: 'responded',
        details: `Sent ${senderType} message: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`
      });

      // Track this agent as a participating agent in the conversation
      await storage.addParticipatingAgent(conversationId, user.id);

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
        
        // Broadcast unread count updates to affected users
        // Customer now has an unread message from the agent
        if (conversation.customerId) {
          wsServer.broadcastUnreadCountUpdate(conversation.customerId);
        }
        
        // Also update all staff members who can see this conversation
        const allUsers = await storage.getAllUsers();
        for (const staffUser of allUsers) {
          // Skip the sender (they already marked their message as read)
          if (staffUser.id !== user.id) {
            wsServer.broadcastUnreadCountUpdate(staffUser.id);
          }
        }
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
      
      // Track this agent as a participating agent in the conversation
      await storage.addParticipatingAgent(conversationId, user.id);
      
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
        
        // Broadcast unread count updates to staff members (excluding sender)
        const allUsers = await storage.getAllUsers();
        for (const staffUser of allUsers) {
          // Skip the sender (they already marked their message as read)
          if (staffUser.id !== user.id) {
            wsServer.broadcastUnreadCountUpdate(staffUser.id);
          }
        }
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

  // Message Rating Routes
  // Rate a message (like/dislike)
  app.post('/api/messages/:messageId/rate', async (req, res) => {
    try {
      const { messageId } = req.params;
      const { rating } = req.body;

      // Validate rating
      if (rating !== 'like' && rating !== 'dislike') {
        return res.status(400).json({ error: 'Rating must be either "like" or "dislike"' });
      }

      // Determine user/customer from session
      const user = req.user as any;
      const userId = user?.id || null;
      const customerId = req.body.customerId || null; // For customer ratings

      // Rate the message
      const messageRating = await storage.rateMessage(messageId, userId, customerId, rating);

      res.status(200).json(messageRating);
    } catch (error) {
      console.error('Message rating error:', error);
      res.status(500).json({ error: 'Failed to rate message' });
    }
  });

  // Get rating summary for a message
  app.get('/api/messages/:messageId/rating', async (req, res) => {
    try {
      const { messageId } = req.params;

      // Get the rating summary
      const summary = await storage.getMessageRatingSummary(messageId);

      // Determine user rating if authenticated
      const user = req.user as any;
      if (user) {
        const userRating = await storage.getMessageRating(messageId, user.id, null);
        summary.userRating = userRating?.rating || null;
      }

      res.status(200).json(summary);
    } catch (error) {
      console.error('Get message rating error:', error);
      res.status(500).json({ error: 'Failed to get message rating' });
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

  // Conversation creation route - allows agents to start conversations with customers
  app.post('/api/conversations', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const user = req.user as any;
      const { initialMessage, ...restBody } = req.body;
      
      // Validate request body
      const conversationData = conversationCreateSchema.parse({
        ...restBody,
        title: restBody.title || restBody.subject || 'New Conversation',
        assignedAgentId: restBody.assignedAgentId || user.id, // Auto-assign creating agent
      });
      
      // Check if customer exists
      const customer = await storage.getCustomer(conversationData.customerId);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      const conversation = await storage.createConversation(conversationData);
      
      // Broadcast new conversation to all staff so they see it immediately
      const wsServer = (req.app as any).wsServer;
      if (wsServer && wsServer.broadcastNewConversation) {
        wsServer.broadcastNewConversation(conversation, customer, 'New conversation started by agent');
      }
      
      // If initial message provided, create it as agent message
      if (initialMessage && typeof initialMessage === 'string' && initialMessage.trim()) {
        const message = await storage.createMessage({
          conversationId: conversation.id,
          content: initialMessage.trim(),
          senderType: user.role === 'admin' ? 'admin' : 'agent',
          senderId: user.id,
          senderName: user.name,
          createdAt: new Date().toISOString(),
          scope: 'public'
        });
        
        // Broadcast the message via WebSocket
        const wsServer = (req.app as any).wsServer;
        if (wsServer && wsServer.broadcastNewMessage) {
          wsServer.broadcastNewMessage(conversation.id, {
            messageId: message.id,
            conversationId: conversation.id,
            content: message.content,
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            senderType: message.senderType,
            timestamp: message.createdAt || new Date().toISOString(),
            status: message.status
          });
        }
        
        console.log(`[conversations] Agent ${user.name} started conversation with customer ${customer.name}, initial message: ${message.id}`);
      }
      
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
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      
      // First try to find by sessionId
      let conversation = await storage.getConversationBySession(sessionId);
      
      // If not found by session, try to find by IP address
      if (!conversation && clientIP !== 'unknown') {
        conversation = await storage.getConversationByIP(clientIP);
      }
      
      // Return conversation with IP address
      if (conversation) {
        res.json({
          ...conversation,
          ipAddress: clientIP
        });
      } else {
        res.json({
          conversationId: null,
          customerId: null,
          customerInfo: null,
          ipAddress: clientIP
        });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to check session' });
    }
  });

  // Get personalized suggested questions
  app.get('/api/customer-chat/suggested-questions', async (req, res) => {
    try {
      const { customerId, sessionId } = req.query;
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      
      const questions = await AIService.generatePersonalizedQuestions(
        customerId as string | null,
        sessionId as string || '',
        clientIP
      );
      
      res.json({ questions });
    } catch (error) {
      console.error('Failed to generate personalized questions:', error);
      res.status(500).json({ 
        error: 'Failed to generate suggested questions',
        questions: [
          "How do I reset my password?",
          "What are your pricing plans?",
          "How can I upgrade my account?",
          "I need help with billing",
        ]
      });
    }
  });

  // Create anonymous customer and conversation
  app.post('/api/customer-chat/create-customer', async (req, res) => {
    try {
      console.log('=== Customer Creation Request Started ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      // If no sessionId provided, generate one
      if (!req.body.sessionId) {
        req.body.sessionId = randomUUID();
        console.log('Generated sessionId:', req.body.sessionId);
      }
      
      // Get client IP from request instead of client-provided value
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      req.body.ipAddress = clientIP;
      console.log('Client IP set to:', clientIP);
      
      console.log('Validating customer data with schema...');
      const customerData = createAnonymousCustomerSchema.parse(req.body);
      console.log('Schema validation passed:', JSON.stringify(customerData, null, 2));
      console.log('contextData from customerData:', customerData.contextData);
      console.log('contextData type:', typeof customerData.contextData);
      
      console.log('Calling storage.createAnonymousCustomer...');
      const wsServer = (app as any).wsServer;
      const dataToPass = {
        ...customerData,
        sessionId: req.body.sessionId
      };
      console.log('Data being passed to storage:', JSON.stringify(dataToPass, null, 2));
      console.log('contextData in dataToPass:', dataToPass.contextData);
      const result = await storage.createAnonymousCustomer(dataToPass, wsServer);
      
      console.log('Customer created successfully - ID:', result.customerId);
      console.log('=== Customer Creation Request Completed ===');
      res.status(201).json(result);
    } catch (error) {
      console.error('=== Customer Creation Failed ===');
      console.error('Error type:', error instanceof z.ZodError ? 'Validation error' : 'Server error');
      console.error('Full error details:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('Request body that failed:', JSON.stringify(req.body, null, 2));
      
      if (error instanceof z.ZodError) {
        console.error('Zod validation errors:', error.errors);
        return res.status(400).json({ 
          error: 'Invalid customer data', 
          details: fromZodError(error).toString() 
        });
      }
      console.error('=== End Customer Creation Error ===');
      res.status(500).json({ error: 'Failed to create customer' });
    }
  });

  // Get messages for customer conversation
  app.get('/api/customer-chat/messages/:conversationId', async (req, res) => {
    try {
      const { conversationId } = req.params;
      console.log(`[customer-chat/messages] Fetching messages for conversation: ${conversationId}`);
      const messages = await storage.getCustomerChatMessages(conversationId);
      console.log(`[customer-chat/messages] Returned ${messages.length} messages:`, messages.map(m => ({ id: m.id, senderType: m.senderType, content: m.content.substring(0, 50) })));
      
      // Disable caching for real-time message updates
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.json(messages);
    } catch (error) {
      console.error('[customer-chat/messages] Error fetching messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  // Send message from customer
  app.post('/api/customer-chat/send-message', messageLimiter, async (req, res) => {
    try {
      const messageData = sendCustomerMessageSchema.parse(req.body);
      
      // Check if conversation exists and reopen if closed
      const existingConversation = await storage.getConversation(messageData.conversationId);
      if (existingConversation && existingConversation.status === 'closed') {
        console.log(`[send-message] Reopening closed conversation: ${messageData.conversationId}`);
        await storage.updateConversationStatus(messageData.conversationId, 'open');
      }
      
      const message = await storage.createCustomerMessage(messageData);
      
      // Get conversation and customer details for notifications
      const conversation = await storage.getConversationWithCustomer(messageData.conversationId);
      if (conversation && conversation.customer) {
        // Create notifications for all staff members
        await storage.createNotificationsForAllStaff(messageData.conversationId);
        
        // Broadcast message notification to staff
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

        // AI response is triggered by the client via /api/ai/smart-response endpoint
        // This prevents duplicate AI responses and gives the client control over AI triggering
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

  // Upload files for customer chat messages
  const customerChatUploadDir = './uploads/customer-chat';
  if (!fs.existsSync(customerChatUploadDir)) {
    fs.mkdirSync(customerChatUploadDir, { recursive: true });
  }

  const customerChatStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, customerChatUploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      cb(null, 'chat-' + uniqueSuffix + '-' + sanitizedName);
    }
  });

  const customerChatUpload = multer({
    storage: customerChatStorage,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
      files: 5, // Max 5 files per message
    },
    fileFilter: function (req, file, cb) {
      const allowedMimes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only images, PDF, TXT, and DOCX are allowed'));
      }
    }
  });

  app.post('/api/customer-chat/upload-files', customerChatUpload.array('files', 5), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const { messageId } = req.body;

      if (!messageId) {
        return res.status(400).json({ error: 'Message ID is required' });
      }

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const attachments = await Promise.all(
        files.map(async (file) => {
          return await storage.createAttachment({
            messageId,
            filename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            filePath: file.path,
          });
        })
      );

      res.status(201).json({ attachments });
    } catch (error) {
      console.error('Failed to upload customer chat files:', error);
      res.status(500).json({ error: 'Failed to upload files' });
    }
  });

  // Serve customer chat attachments
  app.get('/api/customer-chat/files/:filename', (req, res) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(customerChatUploadDir, filename);
      
      // Security: Prevent directory traversal
      const resolvedPath = path.resolve(filePath);
      const resolvedDir = path.resolve(customerChatUploadDir);
      
      if (!resolvedPath.startsWith(resolvedDir)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.sendFile(resolvedPath);
    } catch (error) {
      console.error('Failed to serve customer chat file:', error);
      res.status(500).json({ error: 'Failed to serve file' });
    }
  });

  // REMOVED: /api/customer-chat/send-ai-message endpoint for security
  // AI messages are now created server-side in /api/ai/smart-response to prevent client spoofing

  // Get conversation status for customer (public endpoint - no auth required)
  app.get('/api/customer-chat/conversation/:id/status', async (req, res) => {
    try {
      const conversationId = z.string().uuid().parse(req.params.id);
      
      console.log(`[GET /api/customer-chat/conversation/:id/status] Fetching status for conversation ${conversationId}`);
      
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        console.log(`[GET /api/customer-chat/conversation/:id/status] Conversation ${conversationId} not found`);
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      console.log(`[GET /api/customer-chat/conversation/:id/status] Returning status: ${conversation.status} for conversation ${conversationId}`);
      
      // Return minimal info - just what customer needs to know
      res.json({
        id: conversation.id,
        status: conversation.status,
        assignedAgentId: conversation.assignedAgentId
      });
    } catch (error) {
      console.error('[GET /api/customer-chat/conversation/:id/status] Error fetching conversation status:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid conversation ID' });
      }
      res.status(500).json({ error: 'Failed to fetch conversation status' });
    }
  });

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
      const { agentId, customerMessage, conversationHistory } = req.body;
      
      if (!customerMessage || typeof customerMessage !== 'string') {
        return res.status(400).json({ error: 'Customer message is required' });
      }

      if (!agentId || typeof agentId !== 'string') {
        return res.status(400).json({ error: 'Agent ID is required' });
      }

      // Use smart response generation with knowledge base integration
      const response = await AIService.generateSmartAgentResponse(
        customerMessage,
        `test-conversation-${Date.now()}`,
        agentId
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

  // Generate streaming AI agent response (ChatGPT-like experience)
  app.post('/api/ai/smart-response-stream', async (req, res) => {
    const requestId = `stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[${requestId}] ===== AI STREAMING RESPONSE START =====`);
    
    try {
      // Validate request data
      const streamResponseSchema = z.object({
        conversationId: z.string().uuid(),
        customerMessage: z.string().min(1).max(5000),
        customerId: z.string().uuid(),
        agentId: z.string().uuid().optional()
      });

      const { conversationId, customerMessage, customerId, agentId } = streamResponseSchema.parse(req.body);

      // Check if conversation exists
      const conversation = await storage.getConversationWithCustomer(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // Security: Verify customer owns this conversation
      if (conversation.customerId !== customerId) {
        return res.status(403).json({ error: 'Access denied to this conversation' });
      }

      const wsServer = (app as any).wsServer;
      if (!wsServer) {
        console.log(`[${requestId}] ERROR: WebSocket server not available`);
        return res.status(503).json({ error: 'Streaming not available' });
      }

      const streamId = requestId; // Use request ID as stream ID
      let fullResponse = '';
      let metadata: any = null;
      let isFirst = true;

      console.log(`[${requestId}] Starting AI stream generation...`);
      
      // Start streaming
      try {
        for await (const chunk of AIService.generateSmartAgentResponseStream(
          customerMessage,
          conversationId,
          agentId
        )) {
          if (chunk.type === 'token') {
            fullResponse += chunk.data;
            wsServer.streamAIToken(conversationId, {
              streamId,
              token: chunk.data,
              isFirst
            });
            isFirst = false;
          } else if (chunk.type === 'metadata') {
            metadata = chunk.data;
          }
        }

        console.log(`[${requestId}] Stream complete. Response length: ${fullResponse.length}`);

        // Create and persist AI message
        const SYSTEM_AI_AGENT_ID = 'ai-system-agent-001';
        const messageData = {
          conversationId,
          content: fullResponse,
          senderId: SYSTEM_AI_AGENT_ID,
          senderType: 'agent' as const
        };

        const message = await storage.createMessage(messageData);
        console.log(`[${requestId}] AI message persisted. Message ID: ${message.id}`);

        // Send stream completion with metadata
        wsServer.streamAIComplete(conversationId, {
          streamId,
          messageId: message.id,
          fullResponse,
          confidence: metadata?.confidence || 50,
          requiresHumanTakeover: metadata?.requiresHumanTakeover || false,
          format: metadata?.format,
          agentId: metadata?.agentId
        });

        // IMPORTANT: Also broadcast as legacy new_message for backward compatibility
        // This ensures clients that don't understand streaming events still receive the AI response
        wsServer.broadcastNewMessage(conversationId, {
          messageId: message.id,
          conversationId: message.conversationId,
          content: message.content,
          userId: SYSTEM_AI_AGENT_ID,
          userName: 'Alex (AI Assistant)',
          userRole: 'agent',
          senderType: message.senderType,
          timestamp: message.timestamp,
          status: message.status,
          format: metadata?.format
        });

        // Broadcast unread count updates
        if (conversation.customerId) {
          wsServer.broadcastUnreadCountUpdate(conversation.customerId);
        }

        // Update all staff members
        const allUsers = await storage.getAllUsers();
        for (const staffUser of allUsers) {
          wsServer.broadcastUnreadCountUpdate(staffUser.id);
        }

        // If AI requires human takeover, notify staff
        if (metadata?.requiresHumanTakeover && wsServer.broadcastToStaff) {
          wsServer.broadcastToStaff({
            type: 'ai_assistance_required',
            conversationId,
            customerName: conversation.customer?.name,
            customerId: conversation.customer?.id,
            message: `Alex (AI Assistant) needs help with: ${customerMessage.slice(0, 100)}`,
            timestamp: new Date().toISOString()
          });
        }

        res.json({
          success: true,
          streamId,
          messageId: message.id
        });

      } catch (streamError) {
        console.error(`[${requestId}] Streaming error:`, streamError);
        wsServer.streamAIError(conversationId, {
          streamId,
          error: 'An error occurred while generating the response'
        });
        throw streamError;
      }

    } catch (error) {
      console.error(`[${requestId}] Error:`, error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: 'Failed to generate AI response' });
    }
  });

  // Generate smart AI agent response for customer chat and persist message
  app.post('/api/ai/smart-response', async (req, res) => {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[${requestId}] ===== AI SMART RESPONSE REQUEST START =====`);
    console.log(`[${requestId}] Request body:`, JSON.stringify(req.body, null, 2));
    
    try {
      // Validate request data with proper schema
      const smartResponseSchema = z.object({
        conversationId: z.string().uuid(),
        customerMessage: z.string().min(1).max(5000), // Align with other message limits
        customerId: z.string().uuid(), // Required for authorization
        agentId: z.string().uuid().optional()
      });

      const { conversationId, customerMessage, customerId, agentId } = smartResponseSchema.parse(req.body);
      console.log(`[${requestId}] Validated - ConvID: ${conversationId}, Message: "${customerMessage.substring(0, 50)}..."`);

      // Check if conversation exists
      const conversation = await storage.getConversationWithCustomer(conversationId);
      if (!conversation) {
        console.log(`[${requestId}] ERROR: Conversation not found`);
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // Security: Verify customer owns this conversation
      if (conversation.customerId !== customerId) {
        console.log(`[${requestId}] ERROR: Access denied - customer mismatch`);
        return res.status(403).json({ error: 'Access denied to this conversation' });
      }

      console.log(`[${requestId}] Generating AI response...`);
      // Generate AI response
      const aiResponse = await AIService.generateSmartAgentResponse(
        customerMessage,
        conversationId,
        agentId
      );
      console.log(`[${requestId}] AI response generated. Length: ${aiResponse.response?.length || 0} chars`);

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

        console.log(`[${requestId}] Creating AI message in database...`);
        const message = await storage.createMessage(messageData);
        console.log(`[${requestId}] AI message created. Message ID: ${message.id}`);
        
        // Broadcast AI message to conversation participants
        if (conversation.customer) {
          const wsServer = (app as any).wsServer;
          if (wsServer && wsServer.broadcastNewMessage) {
            wsServer.broadcastNewMessage(conversationId, {
              messageId: message.id,
              conversationId: message.conversationId,
              content: message.content,
              userId: SYSTEM_AI_AGENT_ID,
              userName: 'Alex (AI Assistant)',
              userRole: 'agent',
              senderType: message.senderType,
              timestamp: message.timestamp,
              status: message.status,
              format: aiResponse.format // Include AI response format for step-by-step rendering
            });
            
            // Broadcast unread count updates to affected users
            // Customer now has an unread message from the AI
            if (conversation.customerId) {
              wsServer.broadcastUnreadCountUpdate(conversation.customerId);
            }
            
            // Also update all staff members who can see this conversation
            const allUsers = await storage.getAllUsers();
            for (const staffUser of allUsers) {
              wsServer.broadcastUnreadCountUpdate(staffUser.id);
            }
          }
          
          // If AI requires human takeover, send urgent notification to all staff
          if (aiResponse.requiresHumanTakeover && wsServer && wsServer.broadcastToStaff) {
            wsServer.broadcastToStaff({
              type: 'ai_assistance_required',
              conversationId,
              customerName: conversation.customer.name,
              customerId: conversation.customer.id,
              message: `Alex (AI Assistant) is consulting with colleagues about: ${customerMessage.slice(0, 100)}${customerMessage.length > 100 ? '...' : ''}`,
              timestamp: new Date().toISOString(),
              priority: 'high'
            });
          }
        }
      }

      console.log(`[${requestId}] ===== AI SMART RESPONSE REQUEST END (SUCCESS) =====`);
      res.json({
        success: true,
        data: aiResponse
      });
    } catch (error) {
      console.log(`[${requestId}] ===== AI SMART RESPONSE REQUEST END (ERROR) =====`);
      console.error(`[${requestId}] Error:`, error);
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

  // ============================================
  // AI TRAINING & CORRECTION ENDPOINTS
  // ============================================

  // Get all AI agents
  app.get('/api/ai/agents', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const agents = await storage.getAllAiAgents();
      res.json(agents);
    } catch (error) {
      console.error('Failed to fetch AI agents:', error);
      res.status(500).json({ error: 'Failed to fetch AI agents' });
    }
  });

  // Create new AI agent (Admin only)
  app.post('/api/ai/agents', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = req.user as any;
      const data = insertAiAgentSchema.parse({
        ...req.body,
        createdBy: user.id
      });
      
      const agent = await storage.createAiAgent(data);
      res.status(201).json(agent);
    } catch (error) {
      console.error('Failed to create AI agent:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: fromZodError(error).toString() 
        });
      }
      res.status(500).json({ error: 'Failed to create AI agent' });
    }
  });

  // Update AI agent (Admin only)
  app.put('/api/ai/agents/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const data = updateAiAgentSchema.parse(req.body);
      
      await storage.updateAiAgent(id, data);
      const updatedAgent = await storage.getAiAgent(id);
      
      res.json(updatedAgent);
    } catch (error) {
      console.error('Failed to update AI agent:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: fromZodError(error).toString() 
        });
      }
      res.status(500).json({ error: 'Failed to update AI agent' });
    }
  });

  // Delete AI agent (Admin only)
  app.delete('/api/ai/agents/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      
      await storage.deleteAiAgent(id);
      res.json({ message: 'AI agent deleted successfully' });
    } catch (error) {
      console.error('Failed to delete AI agent:', error);
      res.status(500).json({ error: 'Failed to delete AI agent' });
    }
  });

  // ============= SUPPORT CATEGORIES MANAGEMENT =============
  
  // Get all support categories (Public - for customer chat widget)
  app.get('/api/support-categories/public', async (req, res) => {
    try {
      const categories = await storage.getVisibleSupportCategories();
      res.json(categories);
    } catch (error) {
      console.error('Failed to fetch public support categories:', error);
      res.status(500).json({ error: 'Failed to fetch support categories' });
    }
  });

  // Get all support categories (Admin - includes hidden ones)
  app.get('/api/support-categories', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const categories = await storage.getAllSupportCategories();
      res.json(categories);
    } catch (error) {
      console.error('Failed to fetch support categories:', error);
      res.status(500).json({ error: 'Failed to fetch support categories' });
    }
  });

  // Get single support category
  app.get('/api/support-categories/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const category = await storage.getSupportCategory(id);
      
      if (!category) {
        return res.status(404).json({ error: 'Support category not found' });
      }
      
      res.json(category);
    } catch (error) {
      console.error('Failed to fetch support category:', error);
      res.status(500).json({ error: 'Failed to fetch support category' });
    }
  });

  // Create support category (Admin only)
  app.post('/api/support-categories', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = req.user as any;
      const data = insertSupportCategorySchema.parse({
        ...req.body,
        createdBy: user.id
      });
      
      const category = await storage.createSupportCategory(data);
      res.status(201).json(category);
    } catch (error) {
      console.error('Failed to create support category:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: fromZodError(error).toString() 
        });
      }
      res.status(500).json({ error: 'Failed to create support category' });
    }
  });

  // Update support category (Admin only)
  app.put('/api/support-categories/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const data = updateSupportCategorySchema.parse(req.body);
      
      await storage.updateSupportCategory(id, data);
      const updatedCategory = await storage.getSupportCategory(id);
      
      res.json(updatedCategory);
    } catch (error) {
      console.error('Failed to update support category:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: fromZodError(error).toString() 
        });
      }
      res.status(500).json({ error: 'Failed to update support category' });
    }
  });

  // Delete support category (Admin only)
  app.delete('/api/support-categories/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      
      await storage.deleteSupportCategory(id);
      res.json({ message: 'Support category deleted successfully' });
    } catch (error) {
      console.error('Failed to delete support category:', error);
      res.status(500).json({ error: 'Failed to delete support category' });
    }
  });

  // Seed default support categories (Admin only - for initial setup)
  app.post('/api/support-categories/seed', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = req.user as any;
      
      // Check if categories already exist
      const existing = await storage.getAllSupportCategories();
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Categories already exist. Delete existing ones first or update them.' });
      }
      
      // Default categories
      const defaultCategories = [
        {
          name: 'Billing',
          slug: 'billing',
          description: 'Payments, invoices & subscriptions',
          icon: 'CreditCard',
          color: '#6366f1',
          displayOrder: 0,
          isVisible: true,
          isActive: true,
          suggestedQuestions: [
            "How do I update my payment method?",
            "Where can I find my invoice?",
            "How do I cancel my subscription?"
          ],
          createdBy: user.id
        },
        {
          name: 'Sales',
          slug: 'sales',
          description: 'Pricing, plans & demos',
          icon: 'DollarSign',
          color: '#10b981',
          displayOrder: 1,
          isVisible: true,
          isActive: true,
          suggestedQuestions: [
            "What pricing plans are available?",
            "Can I get a demo?",
            "Is there a discount for annual billing?"
          ],
          createdBy: user.id
        },
        {
          name: 'Technical Support',
          slug: 'technical',
          description: 'Setup, errors & troubleshooting',
          icon: 'Wrench',
          color: '#f59e0b',
          displayOrder: 2,
          isVisible: true,
          isActive: true,
          suggestedQuestions: [
            "How do I reset my password?",
            "I'm getting an error, can you help?",
            "How do I set up integrations?"
          ],
          createdBy: user.id
        },
        {
          name: 'General',
          slug: 'general',
          description: 'Other questions & feedback',
          icon: 'HelpCircle',
          color: '#8b5cf6',
          displayOrder: 3,
          isVisible: true,
          isActive: true,
          suggestedQuestions: [
            "I have a general question",
            "I'd like to provide feedback",
            "How can I contact your team?"
          ],
          createdBy: user.id
        }
      ];
      
      const createdCategories = [];
      for (const cat of defaultCategories) {
        const created = await storage.createSupportCategory(cat);
        createdCategories.push(created);
      }
      
      res.status(201).json({ 
        message: 'Default categories seeded successfully',
        categories: createdCategories
      });
    } catch (error) {
      console.error('Failed to seed support categories:', error);
      res.status(500).json({ error: 'Failed to seed support categories' });
    }
  });

  // Get AI learning data for training/correction interface
  app.get('/api/ai/learning', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { agentId, limit = 50, offset = 0 } = req.query;
      
      const learningEntries = await storage.getAiLearningEntries({
        agentId: agentId as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      // If no real data exists, return mock data for demonstration
      if (learningEntries.length === 0) {
        const mockData = await generateMockLearningData();
        res.json({
          success: true,
          data: mockData
        });
      } else {
        res.json({
          success: true,
          data: learningEntries
        });
      }
    } catch (error) {
      console.error('Failed to fetch AI learning data:', error);
      res.status(500).json({ error: 'Failed to fetch AI learning data' });
    }
  });

  // Submit feedback on AI responses for training
  app.post('/api/ai/learning/feedback', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { entryId, wasHelpful, improvementSuggestion, customerSatisfaction } = req.body;
      
      if (!entryId || typeof wasHelpful !== 'boolean') {
        return res.status(400).json({ error: 'Entry ID and feedback rating are required' });
      }

      await storage.updateAiLearningFeedback(entryId, {
        wasHelpful,
        improvementSuggestion: improvementSuggestion || null,
        customerSatisfaction: customerSatisfaction || null
      });

      res.json({
        success: true,
        message: 'Feedback submitted successfully'
      });
    } catch (error) {
      console.error('Failed to submit AI learning feedback:', error);
      res.status(500).json({ error: 'Failed to submit feedback' });
    }
  });

  // Submit response corrections for AI training
  app.post('/api/ai/learning/correction', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { entryId, improvedResponse, reasoning, knowledgeToAdd } = req.body;
      const user = req.user as any;
      
      if (!entryId || !improvedResponse || !reasoning) {
        return res.status(400).json({ error: 'Entry ID, improved response, and reasoning are required' });
      }

      // Store the correction
      await storage.createAiResponseCorrection({
        learningEntryId: entryId,
        improvedResponse,
        reasoning,
        knowledgeToAdd: knowledgeToAdd || null,
        submittedBy: user.id
      });

      // Update the learning entry to mark it as having a correction
      await storage.updateAiLearningFeedback(entryId, {
        wasHelpful: false, // Mark as not helpful since it needed correction
        improvementSuggestion: `Correction provided: ${reasoning}`
      });

      res.json({
        success: true,
        message: 'Correction submitted successfully'
      });
    } catch (error) {
      console.error('Failed to submit AI response correction:', error);
      res.status(500).json({ error: 'Failed to submit correction' });
    }
  });

  // AI Training Q&A - Ask a question and get AI response with sources
  app.post('/api/ai-training/ask', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { question, agentId } = req.body;
      
      if (!question || !agentId) {
        return res.status(400).json({ error: 'Question and agent ID are required' });
      }

      // Get the AI agent
      const agent = await storage.getAiAgent(agentId);
      if (!agent) {
        return res.status(404).json({ error: 'AI agent not found' });
      }

      // Generate AI response with source tracking
      const aiResponse = await AIService.generateSmartAgentResponse(
        question,
        'temp-training-conversation',
        agentId
      );

      // Get detailed knowledge base articles used
      const knowledgeBaseIds = aiResponse.knowledgeUsed || [];
      const sources = knowledgeBaseIds.length > 0 
        ? await storage.getKnowledgeBaseArticles(knowledgeBaseIds)
        : [];

      res.json({
        success: true,
        response: aiResponse.response,
        confidence: aiResponse.confidence,
        knowledgeUsed: knowledgeBaseIds,
        sources: sources.map((kb, index) => ({
          id: kb.id,
          title: kb.title,
          content: kb.content,
          category: kb.category,
          relevance: kb.effectiveness ? kb.effectiveness / 100 : 0.85 - (index * 0.05)
        }))
      });
    } catch (error) {
      console.error('Failed to generate AI response for training:', error);
      res.status(500).json({ error: 'Failed to generate AI response' });
    }
  });

  // AI Training - Submit correction and update knowledge base
  app.post('/api/ai-training/correct', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { question, originalResponse, correctedResponse, reasoning, knowledgeBaseId, agentId } = req.body;
      const user = req.user as any;
      
      if (!question || !correctedResponse || !reasoning || !knowledgeBaseId) {
        return res.status(400).json({ 
          error: 'Question, corrected response, reasoning, and knowledge base ID are required' 
        });
      }

      // Get the knowledge base article
      const kb = await storage.getKnowledgeBase(knowledgeBaseId);
      if (!kb) {
        return res.status(404).json({ error: 'Knowledge base article not found' });
      }

      // Get latest version number
      const latestVersion = await storage.getLatestVersionNumber(knowledgeBaseId);

      // Create version snapshot before update
      await storage.createKnowledgeBaseVersion({
        knowledgeBaseId,
        version: latestVersion + 1,
        title: kb.title,
        content: correctedResponse, // Store the corrected response as the new content
        category: kb.category,
        tags: kb.tags || [],
        changeReason: `Correction: ${reasoning}`,
        changedBy: user.id
      });

      // Update the knowledge base with corrected content
      await storage.updateKnowledgeBase(knowledgeBaseId, {
        content: correctedResponse
      });

      // Create learning entry for the correction if agentId is provided
      if (agentId) {
        // Create a temporary conversation for the training session
        const tempCustomer = await storage.createCustomer({
          name: 'Training Session',
          email: `training-${Date.now()}@system.local`
        });

        const tempConversation = await storage.createConversation({
          customerId: tempCustomer.id,
          status: 'closed',
          priority: 'low',
          isAnonymous: false
        });

        await storage.createAiAgentLearning({
          agentId,
          conversationId: tempConversation.id,
          customerQuery: question,
          aiResponse: originalResponse || 'N/A',
          confidence: 0, // Mark as corrected
          humanTookOver: true,
          knowledgeUsed: [knowledgeBaseId],
          wasHelpful: false,
          improvementSuggestion: `Correction applied: ${reasoning}. New response: ${correctedResponse.substring(0, 200)}...`
        });
      }

      res.json({
        success: true,
        message: 'Knowledge base updated and version created',
        version: latestVersion + 1
      });
    } catch (error) {
      console.error('Failed to submit correction and update knowledge base:', error);
      res.status(500).json({ error: 'Failed to submit correction' });
    }
  });

  // Get version history for a knowledge base article
  app.get('/api/knowledge-base/:id/versions', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { id } = req.params;
      
      const versions = await storage.getKnowledgeBaseVersions(id);
      
      res.json({
        success: true,
        versions
      });
    } catch (error) {
      console.error('Failed to fetch knowledge base versions:', error);
      res.status(500).json({ error: 'Failed to fetch version history' });
    }
  });

  // AI Learning Dashboard API endpoints
  app.get('/api/ai/learning-metrics', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { agent, intent, timeRange } = req.query;
      
      const filters: any = {};
      if (agent && agent !== 'all') filters.agentId = agent as string;
      if (intent && intent !== 'all') filters.intentCategory = intent as string;
      
      // Calculate date range
      const now = new Date();
      const timeRangeMap: Record<string, number> = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        '90d': 90 * 24 * 60 * 60 * 1000
      };
      const millisecondsAgo = timeRangeMap[timeRange as string] || timeRangeMap['7d'];
      const startDate = new Date(now.getTime() - millisecondsAgo);
      
      const learningEntries = await storage.getAiLearningEntriesFiltered(filters, startDate);
      
      // Enrich with agent names
      const enrichedEntries = await Promise.all(learningEntries.map(async entry => {
        const agent = await storage.getAiAgent(entry.agentId);
        return {
          ...entry,
          agentName: agent?.name || 'Unknown Agent'
        };
      }));
      
      res.json(enrichedEntries);
    } catch (error) {
      console.error('Failed to fetch AI learning metrics:', error);
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  });

  app.get('/api/ai/agent-stats', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { timeRange } = req.query;
      
      // Calculate date range
      const now = new Date();
      const timeRangeMap: Record<string, number> = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        '90d': 90 * 24 * 60 * 60 * 1000
      };
      const millisecondsAgo = timeRangeMap[timeRange as string] || timeRangeMap['7d'];
      const startDate = new Date(now.getTime() - millisecondsAgo);
      
      const learningEntries = await storage.getAiLearningEntriesFiltered({}, startDate);
      
      // Group by agent
      const agentGroups = learningEntries.reduce((acc, entry) => {
        if (!acc[entry.agentId]) {
          acc[entry.agentId] = [];
        }
        acc[entry.agentId].push(entry);
        return acc;
      }, {} as Record<string, typeof learningEntries>);
      
      // Calculate stats for each agent
      const stats = await Promise.all(Object.entries(agentGroups).map(async ([agentId, entries]) => {
        const agent = await storage.getAiAgent(agentId);
        const totalResponses = entries.length;
        const avgQuality = Math.round(entries.reduce((sum, e) => sum + (e.qualityScore || 0), 0) / totalResponses);
        const avgTone = Math.round(entries.reduce((sum, e) => sum + (e.toneScore || 0), 0) / totalResponses);
        const avgRelevance = Math.round(entries.reduce((sum, e) => sum + (e.relevanceScore || 0), 0) / totalResponses);
        const avgCompleteness = Math.round(entries.reduce((sum, e) => sum + (e.completenessScore || 0), 0) / totalResponses);
        const avgConfidence = Math.round(entries.reduce((sum, e) => sum + (e.confidence || 0), 0) / totalResponses);
        const humanTakeovers = entries.filter(e => e.humanTookOver).length;
        const humanTakeoverRate = Math.round((humanTakeovers / totalResponses) * 100);
        const satisfactionEntries = entries.filter(e => e.customerSatisfaction !== null);
        const avgCustomerSatisfaction = satisfactionEntries.length > 0
          ? satisfactionEntries.reduce((sum, e) => sum + (e.customerSatisfaction || 0), 0) / satisfactionEntries.length
          : 0;
        
        return {
          agentId,
          agentName: agent?.name || 'Unknown Agent',
          totalResponses,
          avgQuality,
          avgTone,
          avgRelevance,
          avgCompleteness,
          avgConfidence,
          humanTakeoverRate,
          avgCustomerSatisfaction
        };
      }));
      
      res.json(stats);
    } catch (error) {
      console.error('Failed to fetch agent stats:', error);
      res.status(500).json({ error: 'Failed to fetch agent stats' });
    }
  });

  // =====================================================================
  // AI Learning System - Message Feedback, Corrections, Knowledge Gaps
  // =====================================================================

  // Submit feedback on an AI message (thumbs up/down)
  app.post('/api/ai/message-feedback', async (req, res) => {
    try {
      const { messageId, conversationId, feedbackType, sessionId, feedbackReason } = req.body;
      
      if (!messageId || !conversationId || !feedbackType) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      if (!['thumbs_up', 'thumbs_down'].includes(feedbackType)) {
        return res.status(400).json({ error: 'Invalid feedback type' });
      }
      
      const feedback = await storage.createAiMessageFeedback({
        messageId,
        conversationId,
        feedbackType,
        sessionId,
        feedbackReason
      });
      
      // If negative feedback, add to training queue for review
      if (feedbackType === 'thumbs_down') {
        // Get the message content from conversation messages
        const messages = await storage.getMessages(conversationId);
        const message = messages.find(m => m.id === messageId);
        if (message) {
          await storage.addToTrainingQueue({
            sourceType: 'feedback',
            sourceId: feedback.id,
            trainingData: JSON.stringify({
              messageId,
              content: message.content,
              feedbackType,
              reason: feedbackReason
            }),
            status: 'pending',
            priority: feedbackReason ? 80 : 50 // Higher priority if user gave a reason
          });
        }
      }
      
      res.json({ success: true, feedback });
    } catch (error) {
      console.error('Failed to submit message feedback:', error);
      res.status(500).json({ error: 'Failed to submit feedback' });
    }
  });

  // Get feedback stats for dashboard
  app.get('/api/ai/feedback-stats', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const stats = await storage.getAiMessageFeedbackStats();
      res.json(stats);
    } catch (error) {
      console.error('Failed to fetch feedback stats:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // Submit a correction to an AI response
  app.post('/api/ai/corrections', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { 
        originalMessageId, 
        conversationId, 
        originalAiResponse, 
        correctedResponse, 
        customerQuery,
        correctionType,
        correctionNotes 
      } = req.body;
      
      if (!originalAiResponse || !correctedResponse || !customerQuery) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      const user = req.user as any;
      
      const correction = await storage.createAiCorrection({
        originalMessageId,
        conversationId,
        originalAiResponse,
        correctedResponse,
        customerQuery,
        correctionType: correctionType || 'factual_error',
        correctionNotes,
        correctedBy: user.id
      });
      
      res.json({ success: true, correction });
    } catch (error) {
      console.error('Failed to submit correction:', error);
      res.status(500).json({ error: 'Failed to submit correction' });
    }
  });

  // Get pending corrections for review
  app.get('/api/ai/corrections', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { status, limit } = req.query;
      const corrections = await storage.getAiCorrections({
        status: status as string,
        limit: limit ? parseInt(limit as string) : undefined
      });
      res.json(corrections);
    } catch (error) {
      console.error('Failed to fetch corrections:', error);
      res.status(500).json({ error: 'Failed to fetch corrections' });
    }
  });

  // Apply a correction to the knowledge base
  app.post('/api/ai/corrections/:id/apply', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Mark the correction as applied
      await storage.updateAiCorrection(id, { appliedToKnowledge: true });
      
      // Update training queue item to approved and applied
      const queueItems = await storage.getTrainingQueueItems('pending');
      const matchingItem = queueItems.find(item => item.sourceId === id && item.sourceType === 'correction');
      if (matchingItem) {
        await storage.updateTrainingQueueItem(matchingItem.id, { status: 'applied', appliedAt: new Date() });
      }
      
      res.json({ success: true, message: 'Correction applied to knowledge base' });
    } catch (error) {
      console.error('Failed to apply correction:', error);
      res.status(500).json({ error: 'Failed to apply correction' });
    }
  });

  // Update/dismiss a correction
  app.patch('/api/ai/corrections/:id', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (status) {
        await storage.updateAiCorrection(id, { appliedToKnowledge: status === 'applied' });
      }
      
      res.json({ success: true, message: 'Correction updated' });
    } catch (error) {
      console.error('Failed to update correction:', error);
      res.status(500).json({ error: 'Failed to update correction' });
    }
  });

  // Get knowledge gaps (unanswered questions)
  app.get('/api/ai/knowledge-gaps', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { status, priority, limit } = req.query;
      const gaps = await storage.getKnowledgeGaps({
        status: status as string,
        priority: priority as string,
        limit: limit ? parseInt(limit as string) : undefined
      });
      res.json(gaps);
    } catch (error) {
      console.error('Failed to fetch knowledge gaps:', error);
      res.status(500).json({ error: 'Failed to fetch knowledge gaps' });
    }
  });

  // Get knowledge gap stats
  app.get('/api/ai/knowledge-gaps/stats', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const stats = await storage.getKnowledgeGapStats();
      res.json(stats);
    } catch (error) {
      console.error('Failed to fetch knowledge gap stats:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // Update knowledge gap status (mark as addressed)
  app.patch('/api/ai/knowledge-gaps/:id', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { id } = req.params;
      const { status, resolvedByArticleId, assignedTo, priority, suggestedCategory, suggestedTitle, suggestedContent } = req.body;
      
      const updates: any = {};
      if (status) updates.status = status;
      if (resolvedByArticleId) updates.resolvedByArticleId = resolvedByArticleId;
      if (assignedTo) updates.assignedTo = assignedTo;
      if (priority) updates.priority = priority;
      if (suggestedCategory) updates.suggestedCategory = suggestedCategory;
      if (suggestedTitle) updates.suggestedTitle = suggestedTitle;
      if (suggestedContent) updates.suggestedContent = suggestedContent;
      
      await storage.updateKnowledgeGap(id, updates);
      
      res.json({ success: true, message: 'Knowledge gap updated' });
    } catch (error) {
      console.error('Failed to update knowledge gap:', error);
      res.status(500).json({ error: 'Failed to update knowledge gap' });
    }
  });

  // Get training queue items
  app.get('/api/ai/training-queue', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { status } = req.query;
      const items = await storage.getTrainingQueueItems(status as string);
      res.json(items);
    } catch (error) {
      console.error('Failed to fetch training queue:', error);
      res.status(500).json({ error: 'Failed to fetch training queue' });
    }
  });

  // Process a training queue item
  app.patch('/api/ai/training-queue/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const { status, approvedBy } = req.body;
      
      const updates: any = { status };
      if (status === 'applied') {
        updates.appliedAt = new Date();
      }
      if (approvedBy) {
        updates.approvedBy = approvedBy;
      }
      
      await storage.updateTrainingQueueItem(id, updates);
      
      res.json({ success: true, message: 'Training queue item updated' });
    } catch (error) {
      console.error('Failed to update training queue item:', error);
      res.status(500).json({ error: 'Failed to update item' });
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

  /**
   * Start Conversation API - For Third-Party Integration
   * 
   * Allows external applications to create conversations with pre-filled customer data,
   * bypassing the customer information form. Perfect for embedding support chat in 
   * your app with customer context already known.
   * 
   * @endpoint POST /api/integrations/start-conversation
   * @auth API Key required (X-API-Key header or Authorization: Bearer <key>)
   * @body {
   *   customer: { name, email, phone?, company? },
   *   contextData?: { productId, pageUrl, customFields, etc. },
   *   organizationId?: string,
   *   initialMessage?: string,
   *   aiEnabled?: boolean
   * }
   * @returns {
   *   conversationId: string,
   *   customerId: string,
   *   sessionId: string,
   *   websocketUrl: string,
   *   chatUrl: string
   * }
   */
  app.post('/api/integrations/start-conversation', requireApiKey, externalApiLimiter, async (req, res) => {
    try {
      console.log('=== Third-Party Conversation Start Request ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      // Validate request data
      const data = startConversationSchema.parse(req.body);
      console.log('Validation passed');
      
      // Step 1: Find or create customer
      let customer = await storage.getCustomerByEmail(data.customer.email);
      
      if (!customer) {
        console.log('Customer not found, creating new customer');
        // Create new customer with provided data
        customer = await storage.createCustomer({
          name: data.customer.name,
          email: data.customer.email,
          phone: data.customer.phone || null,
          company: data.customer.company || null,
          ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
          tags: null,
        } as any); // Cast to allow organizationId field
        
        // Update organizationId if provided (since it's not in the insert schema)
        if (data.organizationId) {
          await db
            .update(customers)
            .set({ organizationId: data.organizationId, updatedAt: new Date() })
            .where(eq(customers.id, customer.id));
        }
        
        console.log('Customer created:', customer.id);
      } else {
        console.log('Existing customer found:', customer.id);
        // Update customer info if provided and different
        if (data.customer.name || data.customer.phone || data.customer.company) {
          const updates = {
            name: data.customer.name || customer.name,
            email: customer.email,
            phone: data.customer.phone || customer.phone || undefined,
            company: data.customer.company || customer.company || undefined,
          };
          console.log('Updating customer with:', updates);
          await storage.updateCustomerProfile(customer.id, updates);
        }
      }
      
      // Step 2: Create conversation with context data
      const sessionId = randomUUID();
      console.log('Creating conversation for customer:', customer.id);
      
      const conversation = await storage.createConversation({
        customerId: customer.id,
        title: `Support Request from ${customer.name}`,
        status: 'open',
        priority: 'medium',
        isAnonymous: false,
        sessionId: sessionId,
      });
      
      // Update additional fields that aren't in the insert schema
      await db
        .update(conversations)
        .set({
          aiAssistanceEnabled: data.aiEnabled ?? true,
          contextData: data.contextData ? JSON.stringify(data.contextData) : null,
          organizationId: data.organizationId || null,
          updatedAt: new Date()
        })
        .where(eq(conversations.id, conversation.id));
      
      console.log('Conversation created:', conversation.id);
      
      // Step 3: Send initial message if provided
      if (data.initialMessage) {
        console.log('Sending initial message');
        const message = await storage.createMessage({
          conversationId: conversation.id,
          senderId: customer.id,
          senderType: 'customer',
          content: data.initialMessage,
          scope: 'public',
        });
        
        // Broadcast initial message via WebSocket
        const wsServer = (app as any).wsServer;
        if (wsServer && wsServer.broadcastNewMessage) {
          wsServer.broadcastNewMessage(conversation.id, {
            messageId: message.id,
            conversationId: message.conversationId,
            content: message.content,
            userId: message.senderId,
            userName: customer.name,
            userRole: 'customer',
            senderType: message.senderType,
            timestamp: message.timestamp,
            status: message.status
          });
        }
        
        // Broadcast to staff
        if (wsServer && wsServer.broadcastNewMessageToStaff) {
          wsServer.broadcastNewMessageToStaff(conversation, customer, {
            id: message.id,
            content: message.content,
            senderType: message.senderType,
            timestamp: message.timestamp
          });
        }
        
        // Create notifications for staff
        await storage.createNotificationsForAllStaff(conversation.id);
        console.log('Initial message sent and notifications created');
      }
      
      // Step 4: Return conversation details for integration
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : `http://localhost:${process.env.PORT || 5000}`;
      
      const response = {
        success: true,
        conversationId: conversation.id,
        customerId: customer.id,
        sessionId: sessionId,
        websocketUrl: baseUrl.replace('http', 'ws'),
        chatUrl: `${baseUrl}/customer-chat/${conversation.id}?sessionId=${sessionId}`,
        message: 'Conversation started successfully'
      };
      
      console.log('=== Conversation Start Response ===');
      console.log(JSON.stringify(response, null, 2));
      
      res.status(201).json(response);
    } catch (error) {
      console.error('=== Conversation Start Error ===');
      console.error('Error details:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid request data', 
          details: fromZodError(error).toString()
        });
      }
      res.status(500).json({ 
        success: false,
        error: 'Failed to start conversation',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

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

  // Helper function to synchronize agent assignments
  async function syncAgentKnowledgeAssignments(articleId: string, assignedAgentIds: string[] = []) {
    try {
      // Get all AI agents
      const allAgents = await storage.getAllAiAgents?.() || [];
      
      for (const agent of allAgents) {
        const currentKbIds = agent.knowledgeBaseIds || [];
        const shouldHaveAccess = assignedAgentIds.includes(agent.id);
        const currentlyHasAccess = currentKbIds.includes(articleId);
        
        if (shouldHaveAccess && !currentlyHasAccess) {
          // Add article to agent's knowledge base
          const updatedKbIds = [...currentKbIds, articleId];
          await storage.updateAiAgent?.(agent.id, { knowledgeBaseIds: updatedKbIds });
        } else if (!shouldHaveAccess && currentlyHasAccess) {
          // Remove article from agent's knowledge base
          const updatedKbIds = currentKbIds.filter(id => id !== articleId);
          await storage.updateAiAgent?.(agent.id, { knowledgeBaseIds: updatedKbIds });
        }
      }
    } catch (error) {
      console.error('Error syncing agent knowledge assignments:', error);
      // Don't throw - this is a secondary operation
    }
  }

  // Knowledge Base Management API routes
  // Search knowledge base using enhanced semantic and hybrid search
  app.get('/api/search/knowledge', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { query, maxResults, minScore, agentId, expandScope } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Search query is required' });
      }

      const knowledgeRetrieval = KnowledgeRetrievalService.getInstance();
      const results = await knowledgeRetrieval.search(query, [], {
        maxResults: maxResults ? parseInt(maxResults as string) : 5,
        minScore: minScore ? parseFloat(minScore as string) : 0.15,
        useSemanticSearch: true,
        expandScope: expandScope === 'true' || true // Default to true to search all articles
      });

      res.json(results);
    } catch (error) {
      console.error('Failed to search knowledge base:', error);
      res.status(500).json({ error: 'Failed to search knowledge base' });
    }
  });

  // Search articles (alias for knowledge search for backward compatibility)
  app.get('/api/search/articles', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { query, maxResults, minScore } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Search query is required' });
      }

      const knowledgeRetrieval = KnowledgeRetrievalService.getInstance();
      const results = await knowledgeRetrieval.search(query, [], {
        maxResults: maxResults ? parseInt(maxResults as string) : 5,
        minScore: minScore ? parseFloat(minScore as string) : 0.15,
        useSemanticSearch: true,
        expandScope: false
      });

      // Transform results to focus on article information
      const articleResults = results.map((result: any) => ({
        id: result.chunk.articleId,
        title: result.chunk.title,
        content: result.chunk.content,
        score: result.score,
        matchType: result.matchType,
        metadata: result.chunk.metadata
      }));

      res.json(articleResults);
    } catch (error) {
      console.error('Failed to search articles:', error);
      res.status(500).json({ error: 'Failed to search articles' });
    }
  });

  // Get all knowledge base articles (with optional filtering)
  app.get('/api/knowledge-base', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { indexingStatus, category } = req.query;
      let articles = await storage.getAllKnowledgeBase();
      
      // Filter by indexing status if provided
      if (indexingStatus && typeof indexingStatus === 'string') {
        articles = articles.filter(article => article.indexingStatus === indexingStatus);
      }
      
      // Filter by category if provided
      if (category && typeof category === 'string') {
        articles = articles.filter(article => article.category === category);
      }
      
      res.json(articles);
    } catch (error) {
      console.error('Failed to fetch knowledge base articles:', error);
      res.status(500).json({ error: 'Failed to fetch knowledge base articles' });
    }
  });

  // Get all active knowledge base articles (public access)
  app.get('/api/public/knowledge-base', async (req, res) => {
    try {
      const { category, tag } = req.query;
      const allArticles = await storage.getAllKnowledgeBase();
      
      // Filter to only return active articles
      let publicArticles = allArticles.filter(article => article.isActive);
      
      // Filter by category if specified
      if (category && typeof category === 'string') {
        publicArticles = publicArticles.filter(article => 
          article.category.toLowerCase() === category.toLowerCase()
        );
      }
      
      // Filter by tag if specified
      if (tag && typeof tag === 'string') {
        publicArticles = publicArticles.filter(article => 
          article.tags?.some(t => t.toLowerCase() === tag.toLowerCase())
        );
      }
      
      // Return only necessary fields for public viewing
      const sanitizedArticles = publicArticles.map(article => ({
        id: article.id,
        title: article.title,
        category: article.category,
        tags: article.tags || [],
        usageCount: article.usageCount || 0,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt
      }));
      
      res.json(sanitizedArticles);
    } catch (error) {
      console.error('Failed to fetch public knowledge base articles:', error);
      res.status(500).json({ error: 'Failed to fetch knowledge base articles' });
    }
  });

  // Get specific knowledge base article (public access for shared articles)
  app.get('/api/public/knowledge-base/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const article = await storage.getKnowledgeBase(id);
      
      if (!article) {
        return res.status(404).json({ error: 'Knowledge base article not found' });
      }
      
      // Only return active articles for public access
      if (!article.isActive) {
        return res.status(404).json({ error: 'Knowledge base article not found' });
      }
      
      // Return only necessary fields for public viewing
      const publicArticle = {
        id: article.id,
        title: article.title,
        content: article.content,
        category: article.category,
        tags: article.tags,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt
      };
      
      res.json(publicArticle);
    } catch (error) {
      console.error('Failed to fetch public knowledge base article:', error);
      res.status(500).json({ error: 'Failed to fetch knowledge base article' });
    }
  });

  // Public support search - AI-powered knowledge base search without authentication
  app.post('/api/public/support/search', async (req, res) => {
    try {
      const { question } = req.body;
      
      if (!question) {
        return res.status(400).json({ error: 'Question is required' });
      }

      // Get a default AI agent for public support (first active agent)
      const agents = await storage.getAllAiAgents();
      const publicAgent = agents.find(a => a.isActive) || agents[0];
      
      if (!publicAgent) {
        return res.status(503).json({ error: 'Support service temporarily unavailable' });
      }

      // Get relevant knowledge base articles
      const searchResults = await AIService.getRelevantKnowledge(
        question,
        publicAgent.knowledgeBaseIds || []
      );

      // Get full article data for sources
      const knowledgeBaseIds = searchResults.map(r => r.id);
      const allSources = knowledgeBaseIds.length > 0 
        ? await storage.getKnowledgeBaseArticles(knowledgeBaseIds)
        : [];
      
      // Filter to only return active/published articles
      const sources = allSources.filter(kb => kb.isActive);

      // Format knowledge base content for AI
      const knowledgeContent = searchResults.map(r => 
        `[${r.title}]\n${r.content}`
      );

      // Generate AI response without creating sessions
      const aiResponse = await AIService.generateAgentResponse(
        question,
        [], // Empty conversation history for public searches
        knowledgeContent
      );

      res.json({
        response: aiResponse.response,
        confidence: aiResponse.confidence,
        sources: sources.map((kb, idx) => ({
          id: kb.id,
          title: kb.title,
          category: kb.category,
          relevanceScore: searchResults.find(r => r.id === kb.id)?.score || 0.8
        }))
      });
    } catch (error) {
      console.error('Failed to search public support:', error);
      res.status(500).json({ error: 'Failed to search support articles' });
    }
  });

  // Public support chat - AI-powered conversational support without authentication
  app.post('/api/public/support/chat', async (req, res) => {
    try {
      const { message, sessionId } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Get a default AI agent for public support (first active agent)
      const agents = await storage.getAllAiAgents();
      const publicAgent = agents.find(a => a.isActive) || agents[0];
      
      if (!publicAgent) {
        return res.status(503).json({ error: 'Support service temporarily unavailable' });
      }

      // Get relevant knowledge base articles
      const searchResults = await AIService.getRelevantKnowledge(
        message,
        publicAgent.knowledgeBaseIds || []
      );

      // Format knowledge base content for AI
      const knowledgeContent = searchResults.map(r => 
        `[${r.title}]\n${r.content}`
      );

      // Generate AI response without creating sessions
      const aiResponse = await AIService.generateAgentResponse(
        message,
        [], // Empty conversation history for now (future: load from sessionId)
        knowledgeContent
      );

      // Get sources
      const knowledgeBaseIds = searchResults.map(r => r.id);
      const allSources = knowledgeBaseIds.length > 0 
        ? await storage.getKnowledgeBaseArticles(knowledgeBaseIds)
        : [];
      
      const sources = allSources.filter(kb => kb.isActive);

      res.json({
        response: aiResponse.response,
        confidence: aiResponse.confidence,
        sources: sources.map((kb) => ({
          id: kb.id,
          title: kb.title,
          category: kb.category,
          relevanceScore: searchResults.find(r => r.id === kb.id)?.score || 0.8
        })),
        sessionId: sessionId || `session_${Date.now()}`
      });
    } catch (error) {
      console.error('Failed to process chat message:', error);
      res.status(500).json({ error: 'Failed to process message' });
    }
  });

  // Get specific knowledge base article (authenticated access)
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
      
      // ✅ AUTOMATIC INDEXING: Index the article asynchronously (non-blocking)
      setImmediate(async () => {
        try {
          // Mark as indexing
          await storage.updateKnowledgeBase(newArticle.id, { indexingStatus: 'indexing' });
          
          const knowledgeRetrieval = KnowledgeRetrievalService.getInstance();
          await knowledgeRetrieval.reindexArticle(newArticle.id);
          
          // Mark as indexed with timestamp
          await storage.updateKnowledgeBase(newArticle.id, { 
            indexingStatus: 'indexed',
            indexedAt: new Date()
          });
          console.log(`✅ Successfully indexed manually created article ${newArticle.id} for AI search`);
        } catch (indexError) {
          // Mark as failed with error message
          await storage.updateKnowledgeBase(newArticle.id, { 
            indexingStatus: 'failed',
            indexingError: indexError instanceof Error ? indexError.message : String(indexError)
          });
          console.error(`⚠️ Warning: Failed to index article ${newArticle.id}:`, indexError);
        }
      });
      
      // Sync agent assignments
      if (validationResult.data.assignedAgentIds) {
        await syncAgentKnowledgeAssignments(newArticle.id, validationResult.data.assignedAgentIds);
      }
      
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
      
      // ✅ AUTOMATIC RE-INDEXING: Re-index the article asynchronously (non-blocking)
      setImmediate(async () => {
        try {
          // Mark as indexing
          await storage.updateKnowledgeBase(id, { indexingStatus: 'indexing' });
          
          const knowledgeRetrieval = KnowledgeRetrievalService.getInstance();
          await knowledgeRetrieval.reindexArticle(id);
          
          // Mark as indexed with timestamp
          await storage.updateKnowledgeBase(id, { 
            indexingStatus: 'indexed',
            indexedAt: new Date()
          });
          console.log(`✅ Successfully re-indexed updated article ${id} for AI search`);
        } catch (indexError) {
          // Mark as failed with error message
          await storage.updateKnowledgeBase(id, { 
            indexingStatus: 'failed',
            indexingError: indexError instanceof Error ? indexError.message : String(indexError)
          });
          console.error(`⚠️ Warning: Failed to re-index article ${id}:`, indexError);
        }
      });
      
      // Sync agent assignments if they changed
      if (validationResult.data.assignedAgentIds !== undefined) {
        await syncAgentKnowledgeAssignments(id, validationResult.data.assignedAgentIds || []);
      }
      
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

      // First, get and delete all associated images
      const associatedImages = await storage.getKnowledgeBaseImages(id);
      
      // Delete image files from disk asynchronously with path confinement
      const fileDeletePromises = associatedImages.map(async (image) => {
        try {
          if (fs.existsSync(image.filePath)) {
            // Ensure file path is within the expected directory to prevent arbitrary file deletion
            const resolvedFilePath = path.resolve(image.filePath);
            const resolvedUploadDir = path.resolve(imageUploadDir);
            
            if (!resolvedFilePath.startsWith(resolvedUploadDir)) {
              console.error(`Security: Attempted to delete file outside upload directory: ${image.filePath}`);
              return;
            }
            
            await fs.promises.unlink(resolvedFilePath);
          }
        } catch (fileError) {
          console.error(`Failed to delete image file ${image.filePath}:`, fileError);
          // Continue with deletion even if file removal fails
        }
      });
      
      // Wait for all file deletions to complete (or fail)
      await Promise.allSettled(fileDeletePromises);
      
      // Delete image records from database
      const imageDeletePromises = associatedImages.map(async (image) => {
        try {
          await storage.deleteKnowledgeBaseImage(image.id);
        } catch (dbError) {
          console.error(`Failed to delete image record ${image.id}:`, dbError);
          // Continue with deletion even if DB cleanup fails
        }
      });
      
      // Wait for all database deletions to complete
      await Promise.allSettled(imageDeletePromises);

      // Remove from all agent assignments before deleting article
      await syncAgentKnowledgeAssignments(id, []);
      
      // Finally, delete the article itself
      await storage.deleteKnowledgeBase(id);
      
      const deletedImageCount = associatedImages.length;
      const message = deletedImageCount > 0 
        ? `Knowledge base article and ${deletedImageCount} associated image(s) deleted successfully`
        : 'Knowledge base article deleted successfully';
        
      res.json({ success: true, message });
    } catch (error) {
      console.error('Failed to delete knowledge base article:', error);
      res.status(500).json({ error: 'Failed to delete knowledge base article' });
    }
  });

  // Reindex all knowledge base articles for AI search
  app.post('/api/knowledge-base/reindex-all', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      console.log('Starting bulk knowledge base reindexing...');
      
      // Get all active articles that need indexing
      const articles = await storage.getAllKnowledgeBase();
      const pendingArticles = articles.filter(a => a.isActive && a.indexingStatus !== 'indexed');
      
      console.log(`Found ${pendingArticles.length} articles to reindex`);
      
      // Mark all pending articles as 'indexing' first
      for (const article of pendingArticles) {
        await storage.updateKnowledgeBase(article.id, { indexingStatus: 'indexing' });
      }
      
      // Start async reindexing (non-blocking) with status updates
      (async () => {
        const knowledgeRetrievalService = KnowledgeRetrievalService.getInstance();
        let successCount = 0;
        let failCount = 0;
        
        for (const article of pendingArticles) {
          try {
            await knowledgeRetrievalService.reindexArticle(article.id);
            await storage.updateKnowledgeBase(article.id, { 
              indexingStatus: 'indexed',
              indexedAt: new Date()
            });
            successCount++;
            console.log(`Reindexed: ${article.title}`);
          } catch (error) {
            await storage.updateKnowledgeBase(article.id, { 
              indexingStatus: 'failed',
              indexingError: error instanceof Error ? error.message : String(error)
            });
            failCount++;
            console.error(`Failed to reindex ${article.title}:`, error);
          }
        }
        
        console.log(`Bulk reindexing complete: ${successCount} succeeded, ${failCount} failed`);
      })();
      
      res.json({ 
        success: true, 
        message: `Started reindexing ${pendingArticles.length} articles. This may take a few minutes.`,
        count: pendingArticles.length
      });
    } catch (error) {
      console.error('Failed to start bulk reindexing:', error);
      res.status(500).json({ error: 'Failed to start bulk reindexing' });
    }
  });

  // Reindex a single knowledge base article
  app.post('/api/knowledge-base/:id/reindex', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { id } = req.params;
      
      const article = await storage.getKnowledgeBase(id);
      if (!article) {
        return res.status(404).json({ error: 'Article not found' });
      }
      
      // Mark as indexing immediately
      await storage.updateKnowledgeBase(id, { indexingStatus: 'indexing' });
      
      // Start async reindexing with status updates
      (async () => {
        const knowledgeRetrievalService = KnowledgeRetrievalService.getInstance();
        try {
          await knowledgeRetrievalService.reindexArticle(id);
          await storage.updateKnowledgeBase(id, { 
            indexingStatus: 'indexed',
            indexedAt: new Date()
          });
          console.log(`Successfully reindexed article: ${article.title}`);
        } catch (error) {
          await storage.updateKnowledgeBase(id, { 
            indexingStatus: 'failed',
            indexingError: error instanceof Error ? error.message : String(error)
          });
          console.error(`Failed to reindex article ${id}:`, error);
        }
      })();
      
      res.json({ 
        success: true, 
        message: `Started reindexing "${article.title}". This may take a moment.`
      });
    } catch (error) {
      console.error('Failed to reindex article:', error);
      res.status(500).json({ error: 'Failed to reindex article' });
    }
  });

  // Knowledge Base Image routes

  // Get images for a knowledge base article
  app.get('/api/knowledge-base/:id/images', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { id } = req.params;

      // Check if article exists
      const existingArticle = await storage.getKnowledgeBase(id);
      if (!existingArticle) {
        return res.status(404).json({ error: 'Knowledge base article not found' });
      }

      const images = await storage.getKnowledgeBaseImages(id);
      res.json(images);
    } catch (error) {
      console.error('Failed to get knowledge base images:', error);
      res.status(500).json({ error: 'Failed to get knowledge base images' });
    }
  });

  // Upload images for a knowledge base article
  app.post('/api/knowledge-base/:id/images', requireAuth, requireRole(['admin', 'agent']), imageUpload.array('images', 10), async (req, res) => {
    try {
      const { id } = req.params;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No images provided' });
      }

      // Check if article exists
      const existingArticle = await storage.getKnowledgeBase(id);
      if (!existingArticle) {
        return res.status(404).json({ error: 'Knowledge base article not found' });
      }

      const uploadedImages = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const imageData = {
          knowledgeBaseId: id,
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          filePath: file.path,
          description: '', // Can be updated later
          displayOrder: i // Set initial order based on upload order
        };

        const uploadedImage = await storage.createKnowledgeBaseImage(imageData);
        uploadedImages.push(uploadedImage);
      }

      res.status(201).json(uploadedImages);
    } catch (error) {
      console.error('Failed to upload knowledge base images:', error);
      res.status(500).json({ error: 'Failed to upload knowledge base images' });
    }
  });

  // Delete a knowledge base image
  app.delete('/api/knowledge-base/:articleId/images/:imageId', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { articleId, imageId } = req.params;

      // Check if article exists
      const existingArticle = await storage.getKnowledgeBase(articleId);
      if (!existingArticle) {
        return res.status(404).json({ error: 'Knowledge base article not found' });
      }

      // Get the image to delete the file from disk
      const images = await storage.getKnowledgeBaseImages(articleId);
      const imageToDelete = images.find(img => img.id === imageId);
      
      if (!imageToDelete) {
        return res.status(404).json({ error: 'Image not found' });
      }

      // Delete file from disk with path confinement
      if (fs.existsSync(imageToDelete.filePath)) {
        // Ensure file path is within the expected directory to prevent arbitrary file deletion
        const resolvedFilePath = path.resolve(imageToDelete.filePath);
        const resolvedUploadDir = path.resolve(imageUploadDir);
        
        if (!resolvedFilePath.startsWith(resolvedUploadDir)) {
          console.error(`Security: Attempted to delete file outside upload directory: ${imageToDelete.filePath}`);
          return res.status(403).json({ error: 'Access denied' });
        }
        
        fs.unlinkSync(resolvedFilePath);
      }

      // Delete from database
      await storage.deleteKnowledgeBaseImage(imageId);

      res.json({ success: true, message: 'Image deleted successfully' });
    } catch (error) {
      console.error('Failed to delete knowledge base image:', error);
      res.status(500).json({ error: 'Failed to delete knowledge base image' });
    }
  });

  // Update image order
  app.put('/api/knowledge-base/:articleId/images/:imageId/order', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { articleId, imageId } = req.params;
      const { displayOrder } = req.body;

      if (typeof displayOrder !== 'number') {
        return res.status(400).json({ error: 'Display order must be a number' });
      }

      // Check if article exists
      const existingArticle = await storage.getKnowledgeBase(articleId);
      if (!existingArticle) {
        return res.status(404).json({ error: 'Knowledge base article not found' });
      }

      await storage.updateKnowledgeBaseImageOrder(imageId, displayOrder);
      res.json({ success: true, message: 'Image order updated successfully' });
    } catch (error) {
      console.error('Failed to update image order:', error);
      res.status(500).json({ error: 'Failed to update image order' });
    }
  });

  // Serve knowledge base images with authentication and path validation
  app.get('/api/knowledge-base/images/:filename', requireAuth, requireRole(['admin', 'agent']), (req, res) => {
    try {
      const { filename } = req.params;
      
      // Validate filename to prevent path traversal attacks
      if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ error: 'Invalid filename' });
      }
      
      const imagePath = path.join(imageUploadDir, filename);
      const resolvedPath = path.resolve(imagePath);
      const resolvedUploadDir = path.resolve(imageUploadDir);
      
      // Ensure the resolved path is within the upload directory
      if (!resolvedPath.startsWith(resolvedUploadDir)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      if (!fs.existsSync(resolvedPath)) {
        return res.status(404).json({ error: 'Image not found' });
      }

      // Set appropriate content type based on file extension
      const ext = path.extname(filename).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
      };
      
      const mimeType = mimeTypes[ext] || 'application/octet-stream';
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      
      res.sendFile(resolvedPath);
    } catch (error) {
      console.error('Failed to serve image:', error);
      res.status(500).json({ error: 'Failed to serve image' });
    }
  });

  // Knowledge Base Video routes

  // Get videos for a knowledge base article
  app.get('/api/knowledge-base/:id/videos', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { id } = req.params;

      // Check if article exists
      const existingArticle = await storage.getKnowledgeBase(id);
      if (!existingArticle) {
        return res.status(404).json({ error: 'Knowledge base article not found' });
      }

      const videos = await storage.getKnowledgeBaseVideos(id);
      res.json(videos);
    } catch (error) {
      console.error('Failed to get knowledge base videos:', error);
      res.status(500).json({ error: 'Failed to get knowledge base videos' });
    }
  });

  // Add YouTube video to knowledge base article
  app.post('/api/knowledge-base/:id/videos/youtube', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { id } = req.params;
      const { title, youtubeUrl, description, tags, displayOrder } = req.body;
      const user = req.user as any;

      // Validate required fields
      if (!title || !youtubeUrl) {
        return res.status(400).json({ error: 'Title and YouTube URL are required' });
      }

      // Check if article exists
      const existingArticle = await storage.getKnowledgeBase(id);
      if (!existingArticle) {
        return res.status(404).json({ error: 'Knowledge base article not found' });
      }

      // Extract YouTube video ID from URL
      let youtubeId = '';
      try {
        const url = new URL(youtubeUrl);
        if (url.hostname.includes('youtube.com') && url.searchParams.has('v')) {
          // https://www.youtube.com/watch?v=VIDEO_ID
          youtubeId = url.searchParams.get('v') || '';
        } else if (url.hostname.includes('youtu.be')) {
          // https://youtu.be/VIDEO_ID
          youtubeId = url.pathname.slice(1);
        }
      } catch (err) {
        return res.status(400).json({ error: 'Invalid YouTube URL' });
      }

      if (!youtubeId) {
        return res.status(400).json({ error: 'Could not extract video ID from YouTube URL' });
      }

      const videoData = {
        knowledgeBaseId: id,
        videoType: 'youtube' as const,
        youtubeUrl,
        youtubeId,
        title,
        description: description || null,
        tags: tags ? (Array.isArray(tags) ? tags : [tags]) : null,
        displayOrder: displayOrder !== undefined ? displayOrder : 0,
        createdBy: user.id,
        filename: null,
        originalName: null,
        mimeType: null,
        size: null,
        filePath: null,
        duration: null,
        thumbnailPath: null,
      };

      const createdVideo = await storage.createKnowledgeBaseVideo(videoData);
      res.json(createdVideo);
    } catch (error) {
      console.error('Failed to add YouTube video:', error);
      res.status(500).json({ error: 'Failed to add YouTube video' });
    }
  });

  // Upload internal video file to knowledge base article
  app.post('/api/knowledge-base/:id/videos/upload', requireAuth, requireRole(['admin', 'agent']), videoUpload.single('video'), async (req, res) => {
    try {
      const { id } = req.params;
      const file = req.file;
      const user = req.user as any;

      if (!file) {
        return res.status(400).json({ error: 'No video file provided' });
      }

      const { title, description, tags, displayOrder } = req.body;

      // Validate required fields
      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }

      // Check if article exists
      const existingArticle = await storage.getKnowledgeBase(id);
      if (!existingArticle) {
        // Clean up uploaded file
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          console.error('Failed to clean up file:', err);
        }
        return res.status(404).json({ error: 'Knowledge base article not found' });
      }

      const videoData = {
        knowledgeBaseId: id,
        videoType: 'internal' as const,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        filePath: file.path,
        title,
        description: description || null,
        tags: tags ? (Array.isArray(tags) ? tags : [tags]) : null,
        displayOrder: displayOrder !== undefined ? parseInt(displayOrder) : 0,
        createdBy: user.id,
        youtubeUrl: null,
        youtubeId: null,
        duration: null,
        thumbnailPath: null,
      };

      const createdVideo = await storage.createKnowledgeBaseVideo(videoData);
      res.json(createdVideo);
    } catch (error) {
      console.error('Failed to upload video:', error);
      
      // Clean up uploaded file if there was an error
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.error('Failed to clean up file:', err);
        }
      }
      
      res.status(500).json({ error: 'Failed to upload video' });
    }
  });

  // Delete a video from knowledge base article
  app.delete('/api/knowledge-base/:articleId/videos/:videoId', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { articleId, videoId } = req.params;

      // Check if article exists
      const existingArticle = await storage.getKnowledgeBase(articleId);
      if (!existingArticle) {
        return res.status(404).json({ error: 'Knowledge base article not found' });
      }

      // Get video to check if it's internal (need to delete file)
      const videos = await storage.getKnowledgeBaseVideos(articleId);
      const video = videos.find(v => v.id === videoId);

      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      // Delete the database record
      await storage.deleteKnowledgeBaseVideo(videoId);

      // If it's an internal video, delete the file
      if (video.videoType === 'internal' && video.filePath) {
        try {
          if (fs.existsSync(video.filePath)) {
            fs.unlinkSync(video.filePath);
          }
        } catch (err) {
          console.error('Failed to delete video file:', err);
          // Continue anyway - database record is deleted
        }
      }

      res.json({ success: true, message: 'Video deleted successfully' });
    } catch (error) {
      console.error('Failed to delete knowledge base video:', error);
      res.status(500).json({ error: 'Failed to delete knowledge base video' });
    }
  });

  // Update video order
  app.put('/api/knowledge-base/:articleId/videos/:videoId/order', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { articleId, videoId } = req.params;
      const { displayOrder } = req.body;

      if (typeof displayOrder !== 'number') {
        return res.status(400).json({ error: 'Display order must be a number' });
      }

      // Check if article exists
      const existingArticle = await storage.getKnowledgeBase(articleId);
      if (!existingArticle) {
        return res.status(404).json({ error: 'Knowledge base article not found' });
      }

      await storage.updateKnowledgeBaseVideoOrder(videoId, displayOrder);
      res.json({ success: true, message: 'Video order updated successfully' });
    } catch (error) {
      console.error('Failed to update video order:', error);
      res.status(500).json({ error: 'Failed to update video order' });
    }
  });

  // Create knowledge base articles from file uploads with AI analysis
  app.post('/api/knowledge-base/from-files', requireAuth, requireRole(['admin', 'agent']), upload.array('files', 10), async (req, res) => {
    try {
      const user = req.user as any;
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files provided' });
      }

      const { category, tags, priority, assignedAgentIds, useAiAnalysis = 'true' } = req.body;
      const shouldUseAI = useAiAnalysis === 'true' || useAiAnalysis === true;

      // If AI analysis is disabled, category is required
      if (!shouldUseAI && !category) {
        return res.status(400).json({ error: 'Category is required when AI analysis is disabled' });
      }

      const articles = [];
      const errors = [];
      
      for (const file of files) {
        try {
          // Validate document before processing
          DocumentProcessor.validateDocument(file.path, file.mimetype);
          
          // Extract text content
          const documentContent = await DocumentProcessor.extractText(
            file.path, 
            file.originalname, 
            file.mimetype
          );
          
          // Format content for knowledge base
          const content = DocumentProcessor.formatForKnowledgeBase(documentContent);
          
          console.log(`Successfully extracted text from ${file.originalname}: ${documentContent.metadata?.wordCount || 0} words`);

          let aiAnalysis = null;
          let finalCategory = category || 'General'; // Default to General if not provided
          let finalTags: string[] = tags ? tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : [];
          let finalTitle = file.originalname.replace(/\.[^/.]+$/, '');
          let finalAgentIds: string[] = [];
          
          // Safely parse assignedAgentIds
          if (assignedAgentIds) {
            try {
              finalAgentIds = JSON.parse(assignedAgentIds);
            } catch (parseError) {
              console.warn('Failed to parse assignedAgentIds, using empty array');
              finalAgentIds = [];
            }
          }

          // Use AI to analyze document if enabled
          if (shouldUseAI) {
            try {
              console.log(`[AI Analysis] Analyzing document: ${file.originalname}`);
              aiAnalysis = await AIDocumentAnalyzer.analyzeDocument(content, finalTitle);
              
              // Use AI suggestions if manual inputs not provided
              if (!category && aiAnalysis.category) {
                finalCategory = aiAnalysis.category;
                console.log(`[AI Analysis] Using AI-suggested category: ${finalCategory}`);
              }
              
              if ((!tags || tags.length === 0) && aiAnalysis.tags.length > 0) {
                finalTags = aiAnalysis.tags;
                console.log(`[AI Analysis] Using AI-suggested tags: ${finalTags.join(', ')}`);
              } else if (tags && aiAnalysis.tags.length > 0) {
                // Merge manual tags with AI tags, removing duplicates
                finalTags = Array.from(new Set([...finalTags, ...aiAnalysis.tags]));
                console.log(`[AI Analysis] Merged tags: ${finalTags.join(', ')}`);
              }
              
              if (aiAnalysis.suggestedTitle) {
                finalTitle = aiAnalysis.suggestedTitle;
                console.log(`[AI Analysis] Using AI-suggested title: ${finalTitle}`);
              }

              // Auto-assign to AI agents based on category if not manually assigned
              if ((!assignedAgentIds || finalAgentIds.length === 0) && aiAnalysis) {
                const agentSuggestion = AIDocumentAnalyzer.suggestAgentAssignment(aiAnalysis);
                const allAgents = await storage.getAllAiAgents();
                const matchingAgents = allAgents.filter(agent => 
                  agentSuggestion.suggestedAgentNames.includes(agent.name)
                );
                finalAgentIds = matchingAgents.map(agent => agent.id);
                console.log(`[AI Analysis] Auto-assigned to agents: ${agentSuggestion.suggestedAgentNames.join(', ')}`);
              }
            } catch (aiError) {
              console.error(`[AI Analysis] Error analyzing document, proceeding with manual inputs:`, aiError);
            }
          }

          const articleData = {
            title: finalTitle,
            content,
            category: finalCategory || 'General',
            tags: finalTags,
            priority: priority ? parseInt(priority) : 50,
            isActive: true,
            sourceType: 'file' as const,
            fileName: file.originalname,
            fileType: file.mimetype,
            fileSize: file.size,
            filePath: file.path,
            assignedAgentIds: finalAgentIds,
            createdBy: user.id,
          };

          const article = await storage.createKnowledgeBase(articleData);
          
          // ✅ AUTOMATIC INDEXING: Index the article asynchronously (non-blocking)
          setImmediate(async () => {
            try {
              // Mark as indexing
              await storage.updateKnowledgeBase(article.id, { indexingStatus: 'indexing' });
              
              const knowledgeRetrieval = KnowledgeRetrievalService.getInstance();
              await knowledgeRetrieval.reindexArticle(article.id);
              
              // Mark as indexed with timestamp
              await storage.updateKnowledgeBase(article.id, { 
                indexingStatus: 'indexed',
                indexedAt: new Date()
              });
              console.log(`✅ Successfully indexed uploaded document ${article.id} for AI search`);
            } catch (indexError) {
              // Mark as failed with error message
              await storage.updateKnowledgeBase(article.id, { 
                indexingStatus: 'failed',
                indexingError: indexError instanceof Error ? indexError.message : String(indexError)
              });
              console.error(`⚠️ Warning: Failed to index article ${article.id}:`, indexError);
            }
          });
          
          // Create FAQs if AI analysis generated them
          if (aiAnalysis && aiAnalysis.faqs && aiAnalysis.faqs.length > 0) {
            console.log(`[AI Analysis] Creating ${aiAnalysis.faqs.length} FAQs for article: ${article.title}`);
            const faqData = aiAnalysis.faqs.map((faq, index) => ({
              knowledgeBaseId: article.id,
              question: faq.question,
              answer: faq.answer,
              displayOrder: index,
              isAiGenerated: true,
              usageCount: 0,
              helpful: 0,
              notHelpful: 0,
            }));
            
            await storage.createKnowledgeBaseFaqsBatch(faqData);
          }

          // Update AI agents to include this article in their knowledge base
          if (finalAgentIds.length > 0) {
            for (const agentId of finalAgentIds) {
              try {
                const agent = await storage.getAiAgent(agentId);
                if (agent) {
                  const currentKbIds = agent.knowledgeBaseIds || [];
                  if (!currentKbIds.includes(article.id)) {
                    await storage.updateAiAgent(agentId, {
                      knowledgeBaseIds: [...currentKbIds, article.id]
                    });
                  }
                }
              } catch (agentError) {
                console.error(`Error updating agent ${agentId} with knowledge base:`, agentError);
              }
            }
          }

          articles.push({
            ...article,
            aiAnalysis: aiAnalysis ? {
              category: aiAnalysis.category,
              tags: aiAnalysis.tags,
              keywords: aiAnalysis.keywords,
              summary: aiAnalysis.summary,
              faqCount: aiAnalysis.faqs.length
            } : null
          });
        } catch (fileError) {
          console.error(`Error processing file ${file.originalname}:`, fileError);
          errors.push({
            filename: file.originalname,
            error: fileError instanceof Error ? fileError.message : 'Unknown error'
          });
        }
      }
      
      // If any files failed, return error response
      if (errors.length > 0) {
        return res.status(422).json({ 
          error: 'Document processing failed',
          details: errors,
          processed: articles.length,
          failed: errors.length
        });
      }

      res.status(201).json({ 
        success: true, 
        message: `${articles.length} knowledge articles created successfully`,
        articles 
      });
    } catch (error) {
      console.error('Failed to create knowledge base articles from files:', error);
      res.status(500).json({ error: 'Failed to create knowledge base articles from files' });
    }
  });

  // Create knowledge base article from URL
  app.post('/api/knowledge-base/from-url', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const user = req.user as any;
      const { url, category, tags, priority, assignedAgentIds } = req.body;
      
      // Validate required fields
      if (!url || !category) {
        return res.status(400).json({ error: 'URL and category are required' });
      }

      console.log(`Starting URL import for: ${url}`);

      // Scrape content from URL
      const scrapedContent = await WebScraper.scrapeUrl(url);
      
      // Format content for knowledge base
      const formattedContent = WebScraper.formatForKnowledgeBase(scrapedContent);

      // Handle assignedAgentIds - can be array or string
      let parsedAgentIds: string[] = [];
      if (assignedAgentIds) {
        if (Array.isArray(assignedAgentIds)) {
          parsedAgentIds = assignedAgentIds;
        } else if (typeof assignedAgentIds === 'string') {
          try {
            parsedAgentIds = JSON.parse(assignedAgentIds);
          } catch {
            // If parsing fails, treat as empty array
            parsedAgentIds = [];
          }
        }
      }

      const articleData = {
        title: scrapedContent.title,
        content: formattedContent,
        category,
        tags: tags ? tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : [],
        priority: priority ? parseInt(priority) : 50,
        isActive: true,
        sourceType: 'url' as const,
        sourceUrl: url,
        urlTitle: scrapedContent.title,
        urlDescription: scrapedContent.description,
        assignedAgentIds: parsedAgentIds,
        createdBy: user.id,
      };

      const article = await storage.createKnowledgeBase(articleData);
      
      // ✅ AUTOMATIC INDEXING: Index the article asynchronously (non-blocking)
      setImmediate(async () => {
        try {
          // Mark as indexing
          await storage.updateKnowledgeBase(article.id, { indexingStatus: 'indexing' });
          
          const knowledgeRetrieval = KnowledgeRetrievalService.getInstance();
          await knowledgeRetrieval.reindexArticle(article.id);
          
          // Mark as indexed with timestamp
          await storage.updateKnowledgeBase(article.id, { 
            indexingStatus: 'indexed',
            indexedAt: new Date()
          });
          console.log(`✅ Successfully indexed URL-imported article ${article.id} for AI search`);
        } catch (indexError) {
          // Mark as failed with error message
          await storage.updateKnowledgeBase(article.id, { 
            indexingStatus: 'failed',
            indexingError: indexError instanceof Error ? indexError.message : String(indexError)
          });
          console.error(`⚠️ Warning: Failed to index article ${article.id}:`, indexError);
        }
      });
      
      console.log(`Successfully created knowledge base article from URL: ${url}, Article ID: ${article.id}`);
      
      // Return article directly for frontend compatibility
      res.status(201).json(article);
    } catch (error) {
      console.error('Failed to create knowledge base article from URL:', error);
      
      // Return specific error messages for common scraping failures
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          return res.status(408).json({ error: 'URL request timeout - the website took too long to respond' });
        }
        if (error.message.includes('Content too large') || error.message.includes('too large')) {
          return res.status(413).json({ error: 'Content too large - the webpage exceeds the size limit' });
        }
        if (error.message.includes('content type')) {
          return res.status(400).json({ error: 'Unsupported content type - only HTML pages are supported' });
        }
        if (error.message.includes('No meaningful content')) {
          return res.status(400).json({ error: 'No meaningful content found on the page' });
        }
        if (error.message.includes('Invalid URL') || error.message.includes('not allowed') || error.message.includes('private/reserved')) {
          return res.status(400).json({ error: error.message });
        }
        if (error.message.includes('HTTP 4') || error.message.includes('HTTP 5')) {
          return res.status(400).json({ error: `Website error: ${error.message}` });
        }
        if (error.message.includes('DNS resolution') || error.message.includes('Unable to resolve')) {
          return res.status(400).json({ error: 'Unable to resolve hostname - please check the URL' });
        }
      }
      
      res.status(500).json({ error: 'Failed to scrape content from URL' });
    }
  });

  // Analytics Routes
  // Get comprehensive agent analytics
  app.get('/api/analytics/agents', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      
      // Parse date parameters
      const parsedDateFrom = dateFrom ? new Date(dateFrom as string) : undefined;
      const parsedDateTo = dateTo ? new Date(dateTo as string) : undefined;

      // Validate dates if provided
      if (dateFrom && isNaN(parsedDateFrom!.getTime())) {
        return res.status(400).json({ error: 'Invalid dateFrom parameter' });
      }
      if (dateTo && isNaN(parsedDateTo!.getTime())) {
        return res.status(400).json({ error: 'Invalid dateTo parameter' });
      }

      const analytics = await storage.getAgentAnalytics(parsedDateFrom, parsedDateTo);
      res.json(analytics);
    } catch (error) {
      console.error('Failed to fetch agent analytics:', error);
      res.status(500).json({ error: 'Failed to fetch agent analytics' });
    }
  });

  // File Management API routes
  
  // Get all uploaded files with filtering and pagination
  app.get('/api/files', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search, 
        category, 
        status, 
        tags,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const parsedPage = parseInt(page as string);
      const parsedLimit = Math.min(parseInt(limit as string), 50); // Cap at 50
      const parsedTags = tags ? (tags as string).split(',').map(tag => tag.trim()) : undefined;

      const options = {
        page: parsedPage,
        limit: parsedLimit,
        search: search as string,
        category: category as string,
        status: status as string,
        tags: parsedTags,
        sortBy: sortBy as 'createdAt' | 'originalName' | 'size',
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      const result = await storage.getAllUploadedFiles(options);
      res.json(result);
    } catch (error) {
      console.error('Failed to fetch uploaded files:', error);
      res.status(500).json({ error: 'Failed to fetch uploaded files' });
    }
  });

  // Get specific uploaded file by ID
  app.get('/api/files/:id', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { id } = req.params;
      const file = await storage.getUploadedFile(id);
      
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      res.json(file);
    } catch (error) {
      console.error('Failed to fetch file:', error);
      res.status(500).json({ error: 'Failed to fetch file' });
    }
  });

  // Upload files with duplicate detection and processing
  app.post('/api/files/upload', uploadLimiter, requireAuth, requireRole(['admin', 'agent']), upload.array('files', 15), async (req, res) => {
    try {
      const user = req.user as any;
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files provided' });
      }

      const { category = 'General', tags } = req.body;
      const parsedTags = tags ? tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : [];

      const results = [];
      const errors = [];

      for (const file of files) {
        try {
          // Calculate SHA-256 hash for duplicate detection using streaming
          const hash = crypto.createHash('sha256');
          const stream = fs.createReadStream(file.path);
          
          const sha256Hash = await new Promise<string>((resolve, reject) => {
            stream.on('data', chunk => hash.update(chunk));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
          });

          // Check for existing file with same hash
          const existingFile = await storage.getUploadedFileByHash(sha256Hash);
          
          if (existingFile) {
            // File is a duplicate
            const duplicateData = {
              originalName: file.originalname,
              storedName: file.filename,
              mimeType: file.mimetype,
              size: file.size,
              sha256Hash,
              filePath: file.path,
              category,
              tags: parsedTags,
              status: 'uploaded' as const,
              duplicateOfId: existingFile.id,
              createdBy: user.id,
            };

            const uploadedFile = await storage.createUploadedFile(duplicateData);
            results.push({ 
              file: uploadedFile, 
              isDuplicate: true, 
              originalFile: existingFile 
            });
          } else {
            // New file
            const fileData = {
              originalName: file.originalname,
              storedName: file.filename,
              mimeType: file.mimetype,
              size: file.size,
              sha256Hash,
              filePath: file.path,
              category,
              tags: parsedTags,
              status: 'uploaded' as const,
              createdBy: user.id,
            };

            const uploadedFile = await storage.createUploadedFile(fileData);
            results.push({ 
              file: uploadedFile, 
              isDuplicate: false 
            });

            // Mark file for processing
            await storage.updateUploadedFile(uploadedFile.id, { status: 'processing' });
            
            // Process file for AI training asynchronously
            setTimeout(async () => {
              try {
                await processFileForAITraining(uploadedFile, category, parsedTags, user.id);
              } catch (error) {
                console.error(`Failed to process file ${uploadedFile.originalName} for AI training:`, error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
                await storage.updateUploadedFile(uploadedFile.id, { 
                  status: 'error',
                  errorMessage
                });
              }
            }, 100); // Minimal delay to allow response to return
          }
        } catch (fileError) {
          console.error(`Error processing file ${file.originalname}:`, fileError);
          errors.push({
            filename: file.originalname,
            error: fileError instanceof Error ? fileError.message : 'Unknown error'
          });
        }
      }

      if (errors.length > 0) {
        return res.status(422).json({ 
          error: 'Some files failed to process',
          results,
          errors
        });
      }

      res.status(201).json({ results });
    } catch (error) {
      console.error('Failed to upload files:', error);
      res.status(500).json({ error: 'Failed to upload files' });
    }
  });

  // Update file metadata
  app.put('/api/files/:id', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = updateUploadedFileSchema.parse(req.body);

      // Check if file exists
      const existingFile = await storage.getUploadedFile(id);
      if (!existingFile) {
        return res.status(404).json({ error: 'File not found' });
      }

      await storage.updateUploadedFile(id, updateData);
      const updatedFile = await storage.getUploadedFile(id);
      
      res.json(updatedFile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid file data',
          details: fromZodError(error).toString()
        });
      }
      console.error('Failed to update file:', error);
      res.status(500).json({ error: 'Failed to update file' });
    }
  });

  // Delete uploaded file
  app.delete('/api/files/:id', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { id } = req.params;

      // Check if file exists
      const existingFile = await storage.getUploadedFile(id);
      if (!existingFile) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Delete file from disk if it exists
      if (fs.existsSync(existingFile.filePath)) {
        const resolvedFilePath = path.resolve(existingFile.filePath);
        const resolvedUploadDir = path.resolve('./uploads');
        
        // Security check: ensure file is within uploads directory
        if (resolvedFilePath.startsWith(resolvedUploadDir)) {
          fs.unlinkSync(existingFile.filePath);
        }
      }

      // Delete from database (this also removes related records)
      await storage.deleteUploadedFile(id);
      
      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete file:', error);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  });

  // Link file to knowledge base article
  app.post('/api/files/:fileId/link-knowledge-base/:knowledgeBaseId', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { fileId, knowledgeBaseId } = req.params;

      // Verify both file and knowledge base exist
      const [file, knowledgeBase] = await Promise.all([
        storage.getUploadedFile(fileId),
        storage.getKnowledgeBase(knowledgeBaseId)
      ]);

      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }
      if (!knowledgeBase) {
        return res.status(404).json({ error: 'Knowledge base article not found' });
      }

      const link = await storage.linkFileToKnowledgeBase(fileId, knowledgeBaseId);
      res.status(201).json(link);
    } catch (error) {
      console.error('Failed to link file to knowledge base:', error);
      res.status(500).json({ error: 'Failed to link file to knowledge base' });
    }
  });

  // Unlink file from knowledge base article
  app.delete('/api/files/:fileId/unlink-knowledge-base/:knowledgeBaseId', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { fileId, knowledgeBaseId } = req.params;

      await storage.unlinkFileFromKnowledgeBase(fileId, knowledgeBaseId);
      res.status(204).send();
    } catch (error) {
      console.error('Failed to unlink file from knowledge base:', error);
      res.status(500).json({ error: 'Failed to unlink file from knowledge base' });
    }
  });

  // Get files linked to a knowledge base article
  app.get('/api/knowledge-base/:id/linked-files', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { id } = req.params;
      const files = await storage.getFilesLinkedToKnowledgeBase(id);
      res.json(files);
    } catch (error) {
      console.error('Failed to fetch linked files:', error);
      res.status(500).json({ error: 'Failed to fetch linked files' });
    }
  });

  // Get file usage statistics
  app.get('/api/files/:id/usage-stats', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if file exists
      const file = await storage.getUploadedFile(id);
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      const stats = await storage.getFileUsageStats(id);
      res.json(stats);
    } catch (error) {
      console.error('Failed to fetch file usage stats:', error);
      res.status(500).json({ error: 'Failed to fetch file usage stats' });
    }
  });

  // Increment file usage for AI agent
  app.post('/api/files/:id/usage/:agentId', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { id: fileId, agentId } = req.params;

      // Verify both file and agent exist
      const [file, agent] = await Promise.all([
        storage.getUploadedFile(fileId),
        storage.getAiAgent(agentId)
      ]);

      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }
      if (!agent) {
        return res.status(404).json({ error: 'AI agent not found' });
      }

      await storage.incrementFileUsage(fileId, agentId);
      res.status(204).send();
    } catch (error) {
      console.error('Failed to increment file usage:', error);
      res.status(500).json({ error: 'Failed to increment file usage' });
    }
  });

  // Serve uploaded files
  app.get('/api/files/:id/download', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { id } = req.params;
      const file = await storage.getUploadedFile(id);
      
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Security check: ensure file path is within uploads directory
      const resolvedFilePath = path.resolve(file.filePath);
      const resolvedUploadDir = path.resolve('./uploads');
      
      if (!resolvedFilePath.startsWith(resolvedUploadDir)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (!fs.existsSync(file.filePath)) {
        return res.status(404).json({ error: 'File not found on disk' });
      }

      res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
      res.setHeader('Content-Type', file.mimeType);
      res.sendFile(path.resolve(file.filePath));
    } catch (error) {
      console.error('Failed to serve file:', error);
      res.status(500).json({ error: 'Failed to serve file' });
    }
  });

  // Get top performing knowledge articles
  app.get('/api/analytics/knowledge-articles', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      const parsedLimit = parseInt(limit as string);
      
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return res.status(400).json({ error: 'Limit must be between 1 and 100' });
      }

      const topArticles = await storage.getTopKnowledgeArticles(parsedLimit);
      res.json(topArticles);
    } catch (error) {
      console.error('Failed to fetch top knowledge articles:', error);
      res.status(500).json({ error: 'Failed to fetch top knowledge articles' });
    }
  });

  // Get agent workload metrics
  app.get('/api/analytics/workload', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const workloadMetrics = await storage.getAgentWorkloadMetrics();
      res.json(workloadMetrics);
    } catch (error) {
      console.error('Failed to fetch agent workload metrics:', error);
      res.status(500).json({ error: 'Failed to fetch agent workload metrics' });
    }
  });

  // Get file usage analytics
  app.get('/api/analytics/files/usage', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { limit = 10, agentId } = req.query;
      const parsedLimit = Math.min(parseInt(limit as string) || 10, 50);
      
      // Get most used files with usage statistics
      const files = await storage.getTopUsedFiles(parsedLimit, agentId as string);
      res.json(files);
    } catch (error) {
      console.error('Failed to fetch file usage analytics:', error);
      res.status(500).json({ error: 'Failed to fetch file usage analytics' });
    }
  });

  // Get file effectiveness metrics
  app.get('/api/analytics/files/effectiveness', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      const parsedLimit = Math.min(parseInt(limit as string) || 10, 50);
      
      // Get files with effectiveness metrics based on AI training integration
      const effectiveness = await storage.getFileEffectivenessMetrics(parsedLimit);
      res.json(effectiveness);
    } catch (error) {
      console.error('Failed to fetch file effectiveness metrics:', error);
      res.status(500).json({ error: 'Failed to fetch file effectiveness metrics' });
    }
  });

  // Get agent-specific file usage statistics
  app.get('/api/analytics/files/by-agent', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      // Get file usage breakdown by agent
      const agentFileUsage = await storage.getAgentFileUsageSummary();
      res.json(agentFileUsage);
    } catch (error) {
      console.error('Failed to fetch agent file usage analytics:', error);
      res.status(500).json({ error: 'Failed to fetch agent file usage analytics' });
    }
  });

  // ========================================
  // FEED MODULE ROUTES
  // ========================================

  // Create new post (admin/agent only)
  app.post('/api/feed/posts', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const user = req.user as any;
      
      // Extract hashtags from content
      const content = req.body.content || '';
      const hashtagRegex = /#(\w+)/g;
      const tags: string[] = [];
      let match;
      while ((match = hashtagRegex.exec(content)) !== null) {
        tags.push(match[1]);
      }
      
      const postData = insertPostSchema.parse({
        ...req.body,
        authorId: user.id,
        tags: tags.length > 0 ? tags : undefined,
      });
      
      const post = await storage.createPost(postData);
      res.status(201).json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      console.error('Failed to create post:', error);
      res.status(500).json({ error: 'Failed to create post' });
    }
  });

  // Get single post (must come before :filter to avoid UUID conflicts)
  app.get('/api/feed/posts/:id([0-9a-f-]{36})', requireAuth, async (req, res) => {
    try {
      const post = await storage.getPost(req.params.id);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }
      res.json(post);
    } catch (error) {
      console.error('Failed to fetch post:', error);
      res.status(500).json({ error: 'Failed to fetch post' });
    }
  });

  // Update post (author or admin only)
  app.patch('/api/feed/posts/:id', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const post = await storage.getPost(req.params.id);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Check authorization
      if (post.authorId !== user.id && user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized to update this post' });
      }

      await storage.updatePost(req.params.id, req.body);
      const updatedPost = await storage.getPost(req.params.id);
      res.json(updatedPost);
    } catch (error) {
      console.error('Failed to update post:', error);
      res.status(500).json({ error: 'Failed to update post' });
    }
  });

  // Delete post (author or admin only)
  app.delete('/api/feed/posts/:id', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const post = await storage.getPost(req.params.id);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Check authorization
      if (post.authorId !== user.id && user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized to delete this post' });
      }

      await storage.deletePost(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete post:', error);
      res.status(500).json({ error: 'Failed to delete post' });
    }
  });

  // Add comment to post
  app.post('/api/feed/posts/:id/comments', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const commentData = insertPostCommentSchema.parse({
        postId: req.params.id,
        authorId: user.id,
        authorType: user.role === 'admin' || user.role === 'agent' ? 'staff' : 'customer',
        content: req.body.content,
      });

      const comment = await storage.createPostComment(commentData);
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      console.error('Failed to create comment:', error);
      res.status(500).json({ error: 'Failed to create comment' });
    }
  });

  // Get post comments
  app.get('/api/feed/posts/:id/comments', requireAuth, async (req, res) => {
    try {
      const comments = await storage.getPostComments(req.params.id);
      res.json(comments);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      res.status(500).json({ error: 'Failed to fetch comments' });
    }
  });

  // Like post
  app.post('/api/feed/posts/:id/like', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user.id;
      const userType: 'staff' | 'customer' = user.role === 'admin' || user.role === 'agent' ? 'staff' : 'customer';
      
      // Check if already liked
      const hasLiked = await storage.hasUserLikedPost(req.params.id, userId);
      if (hasLiked) {
        return res.status(400).json({ error: 'Post already liked' });
      }

      const like = await storage.likePost(req.params.id, userId, userType);
      res.status(201).json(like);
    } catch (error) {
      console.error('Failed to like post:', error);
      res.status(500).json({ error: 'Failed to like post' });
    }
  });

  // Unlike post
  app.delete('/api/feed/posts/:id/like', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      await storage.unlikePost(req.params.id, user.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to unlike post:', error);
      res.status(500).json({ error: 'Failed to unlike post' });
    }
  });

  // Record post view
  app.post('/api/feed/posts/:id/view', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user.id;
      const userType: 'staff' | 'customer' = user.role === 'admin' || user.role === 'agent' ? 'staff' : 'customer';
      
      const view = await storage.recordPostView(req.params.id, userId, userType);
      res.status(201).json(view);
    } catch (error) {
      console.error('Failed to record view:', error);
      res.status(500).json({ error: 'Failed to record view' });
    }
  });

  // Get post stats
  app.get('/api/feed/posts/:id/stats', requireAuth, async (req, res) => {
    try {
      const stats = await storage.getPostStats(req.params.id);
      res.json(stats);
    } catch (error) {
      console.error('Failed to fetch post stats:', error);
      res.status(500).json({ error: 'Failed to fetch post stats' });
    }
  });

  // Mark post as read
  app.post('/api/feed/posts/:id/read', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      await storage.markPostAsRead(req.params.id, user.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to mark post as read:', error);
      res.status(500).json({ error: 'Failed to mark post as read' });
    }
  });

  // Get all tags
  app.get('/api/feed/tags', async (req, res) => {
    try {
      const tags = await storage.getAllTags();
      res.json(tags);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
      res.status(500).json({ error: 'Failed to fetch tags' });
    }
  });

  // Get unread posts count
  app.get('/api/feed/unread-count', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const count = await storage.getUnreadPostsCount(user.id);
      res.json({ count });
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
      res.status(500).json({ error: 'Failed to fetch unread count' });
    }
  });

  // Get posts with visibility filtering (must come after all :id routes)
  app.get('/api/feed/posts/:filter(all|internal|urgent|targeted|customer)?', async (req, res) => {
    try {
      const { filter } = req.params;
      const { page, limit } = req.query;
      
      // Check if this is a customer portal request (no staff auth, but has customer session)
      const customerId = (req.session as any).customerId;
      const customerUserType = (req.session as any).userType;
      
      // For customer portal requests
      if (customerId && customerUserType === 'customer') {
        const customer = await storage.getCustomer(customerId);
        if (!customer || !customer.hasPortalAccess) {
          return res.status(401).json({ error: 'Portal access not granted' });
        }
        
        // Map filter to visibility option
        let visibility: string | undefined = filter;
        if (filter === 'customer' || filter === 'all' || !filter) {
          visibility = undefined; // Get all posts customer has access to
        } else if (filter === 'urgent') {
          // Special handling for urgent - we'll filter after fetching
          visibility = undefined;
        }
        
        // Get posts visible to this customer
        const options = {
          visibility: visibility === 'urgent' ? undefined : visibility,
          userId: customerId,
          userType: 'customer' as const,
        };
        
        const result = await storage.getPosts(options);
        
        // Filter for urgent posts if requested
        let postsToReturn = result.posts;
        if (filter === 'urgent') {
          postsToReturn = result.posts.filter(post => post.isUrgent);
        }
        
        // Enrich posts with author names
        const postsWithAuthors = await Promise.all(
          postsToReturn.map(async (post) => {
            const author = await storage.getUser(post.authorId);
            return {
              ...post,
              author: {
                id: author?.id || post.authorId,
                name: author?.name || 'Unknown'
              }
            };
          })
        );
        
        return res.json(postsWithAuthors);
      }
      
      // For staff requests, require authentication
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const user = req.user as any;
      const userId = user.id;
      const userType: 'staff' | 'customer' = user.role === 'admin' || user.role === 'agent' ? 'staff' : 'customer';
      
      // Check authorization for internal posts
      if (filter === 'internal' && userType !== 'staff') {
        return res.status(403).json({ error: 'Access denied to internal posts' });
      }
      
      // Map filter to visibility option
      let visibility: string | undefined = filter;
      if (filter === 'all' || !filter) {
        visibility = undefined; // Get all posts user has access to
      } else if (filter === 'urgent') {
        // Special handling for urgent - we'll filter after fetching
        visibility = undefined;
      }
      
      const search = req.query.search as string | undefined;
      const tags = req.query.tags as string | string[] | undefined;
      
      const options = {
        visibility: visibility === 'urgent' ? undefined : visibility,
        userId,
        userType,
        search,
        tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      };

      const result = await storage.getPosts(options);
      
      // Filter for urgent posts if requested
      let postsToReturn = result.posts;
      if (filter === 'urgent') {
        postsToReturn = result.posts.filter(post => post.isUrgent);
      }
      
      // Enrich posts with author names
      const postsWithAuthors = await Promise.all(
        postsToReturn.map(async (post) => {
          const author = await storage.getUser(post.authorId);
          return {
            ...post,
            authorName: author?.name || 'Unknown'
          };
        })
      );
      
      res.json(postsWithAuthors);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      res.status(500).json({ error: 'Failed to fetch posts' });
    }
  });

  // ============================================
  // WIDGET API - FOR 3RD PARTY EMBEDS WITH API KEY AUTH
  // ============================================

  // Enhanced API Key validation middleware using database
  const validateApiKey = async (req: any, res: any, next: any) => {
    try {
      const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
      
      if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
      }

      // Query API key from database
      const [keyRecord] = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.key, apiKey))
        .limit(1);

      if (!keyRecord) {
        return res.status(401).json({ error: 'Invalid API key' });
      }

      if (!keyRecord.isActive) {
        return res.status(403).json({ error: 'API key is inactive' });
      }

      if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
        return res.status(403).json({ error: 'API key has expired' });
      }

      // Update last used timestamp
      await db
        .update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, keyRecord.id));

      // Attach API key info to request for use in routes
      req.apiKey = keyRecord;
      next();
    } catch (error) {
      console.error('API key validation error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  };

  // Check if API key has specific permission
  const hasPermission = (permission: string) => {
    return (req: any, res: any, next: any) => {
      if (!req.apiKey.permissions.includes(permission)) {
        return res.status(403).json({ error: `Missing permission: ${permission}` });
      }
      next();
    };
  };

  // Get conversation history for a customer (requires 'history' permission)
  app.get('/api/widget/conversations/:customerId', validateApiKey, hasPermission('history'), async (req, res) => {
    try {
      const { customerId } = req.params;
      const organizationId = req.apiKey.organizationId;
      
      // Verify customer belongs to this organization
      const customer = await db
        .select()
        .from(customers)
        .where(and(
          eq(customers.id, customerId),
          eq(customers.organizationId, organizationId)
        ))
        .limit(1);

      if (customer.length === 0) {
        return res.status(404).json({ error: 'Customer not found or access denied' });
      }
      
      const customerConversations = await db
        .select()
        .from(conversations)
        .where(and(
          eq(conversations.customerId, customerId),
          eq(conversations.organizationId, organizationId)
        ))
        .orderBy(desc(conversations.createdAt));

      res.json({ success: true, data: customerConversations });
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  });

  // Get messages for a specific conversation (requires 'history' permission)
  app.get('/api/widget/conversations/:conversationId/messages', validateApiKey, hasPermission('history'), async (req, res) => {
    try {
      const { conversationId } = req.params;
      const organizationId = req.apiKey.organizationId;
      
      // Verify conversation belongs to this organization
      const conversation = await db
        .select()
        .from(conversations)
        .where(and(
          eq(conversations.id, conversationId),
          eq(conversations.organizationId, organizationId)
        ))
        .limit(1);

      if (conversation.length === 0) {
        return res.status(404).json({ error: 'Conversation not found or access denied' });
      }
      
      const conversationMessages = await storage.getCustomerChatMessages(conversationId);
      
      res.json({ success: true, data: conversationMessages });
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  // Get support tickets for a customer (requires 'tickets' permission)
  app.get('/api/widget/tickets/:customerId', validateApiKey, hasPermission('tickets'), async (req, res) => {
    try {
      const { customerId } = req.params;
      const organizationId = req.apiKey.organizationId;
      
      // Verify customer belongs to this organization
      const customer = await db
        .select()
        .from(customers)
        .where(and(
          eq(customers.id, customerId),
          eq(customers.organizationId, organizationId)
        ))
        .limit(1);

      if (customer.length === 0) {
        return res.status(404).json({ error: 'Customer not found or access denied' });
      }
      
      const customerTickets = await db
        .select()
        .from(tickets)
        .where(and(
          eq(tickets.customerId, customerId),
          eq(tickets.organizationId, organizationId)
        ))
        .orderBy(desc(tickets.createdAt));

      res.json({ success: true, data: customerTickets });
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      res.status(500).json({ error: 'Failed to fetch tickets' });
    }
  });

  // Get feed posts visible to customers (requires 'feed' permission)
  app.get('/api/widget/feed', validateApiKey, hasPermission('feed'), async (req, res) => {
    try {
      // Get posts visible to all customers or public
      const feedPosts = await db
        .select()
        .from(posts)
        .where(
          or(
            eq(posts.visibility, 'all_customers'),
            eq(posts.visibility, 'public')
          )
        )
        .orderBy(desc(posts.createdAt))
        .limit(20);

      // Enrich with author names
      const postsWithAuthors = await Promise.all(
        feedPosts.map(async (post) => {
          const author = await storage.getUser(post.authorId);
          return {
            ...post,
            authorName: author?.name || 'Unknown'
          };
        })
      );

      res.json({ success: true, data: postsWithAuthors });
    } catch (error) {
      console.error('Failed to fetch feed:', error);
      res.status(500).json({ error: 'Failed to fetch feed' });
    }
  });

  // Create or get customer with API key (requires 'chat' permission)
  app.post('/api/widget/customer', validateApiKey, hasPermission('chat'), async (req, res) => {
    try {
      const { name, email, phone, company, contextData } = req.body;
      const organizationId = req.apiKey.organizationId;
      
      // Find or create customer scoped to this organization
      let customer = await db
        .select()
        .from(customers)
        .where(and(
          eq(customers.email, email),
          eq(customers.organizationId, organizationId)
        ))
        .limit(1);
      
      if (customer.length === 0) {
        const [newCustomer] = await db
          .insert(customers)
          .values({
            name,
            email,
            phone: phone || '',
            company: company || '',
            status: 'online',
            organizationId,
          })
          .returning();
        customer = [newCustomer];
      }

      res.json({ success: true, data: customer[0] });
    } catch (error) {
      console.error('Failed to create/get customer:', error);
      res.status(500).json({ error: 'Failed to process customer' });
    }
  });

  // Brand Configuration API routes
  app.get('/api/brand-config', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const config = await storage.getBrandConfig();
      if (!config) {
        return res.status(404).json({ error: 'Brand configuration not found' });
      }
      res.json(config);
    } catch (error) {
      console.error('Failed to fetch brand config:', error);
      res.status(500).json({ error: 'Failed to fetch brand configuration' });
    }
  });

  app.put('/api/brand-config', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const updates = req.body;
      const updatedConfig = await storage.updateBrandConfig(updates);
      res.json(updatedConfig);
    } catch (error) {
      console.error('Failed to update brand config:', error);
      res.status(500).json({ error: 'Failed to update brand configuration' });
    }
  });

  // Engagement Settings API routes
  app.get('/api/engagement-settings', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      let settings = await storage.getEngagementSettings();
      
      // If no settings exist, create default settings
      if (!settings) {
        settings = await storage.upsertEngagementSettings({
          emailNotificationsEnabled: true,
          emailBatchingDelayMinutes: 5,
          emailRateLimitHours: 4,
          autoFollowupEnabled: true,
          autoFollowupDelayHours: 24,
          maxAutoFollowups: 3,
          autoCloseEnabled: true,
          autoCloseDays: 7,
          followupMessageTemplate: "Hi! Just checking in to see if you still need help with this. Please let us know if there's anything else we can assist you with.",
        });
      }
      
      res.json(settings);
    } catch (error) {
      console.error('Failed to fetch engagement settings:', error);
      res.status(500).json({ error: 'Failed to fetch engagement settings' });
    }
  });

  app.put('/api/engagement-settings', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const updates = req.body;
      const updatedSettings = await storage.upsertEngagementSettings(updates);
      res.json(updatedSettings);
    } catch (error) {
      console.error('Failed to update engagement settings:', error);
      res.status(500).json({ error: 'Failed to update engagement settings' });
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
