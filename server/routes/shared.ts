import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { anonymousCustomerSchema } from '@shared/schema';

export const messageCreateSchema = z.object({
  conversationId: z.string(),
  content: z.string().min(1, 'Message content cannot be empty').max(5000, 'Message too long')
});

export const conversationCreateSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: z.enum(['open', 'pending', 'resolved', 'closed']).default('open'),
  assignedAgentId: z.string().uuid('Invalid agent ID').optional()
});

export const conversationStatusSchema = z.object({
  status: z.enum(['open', 'pending', 'resolved', 'closed'])
});

export const conversationAssignSchema = z.object({
  agentId: z.string().uuid('Invalid agent ID')
});

export const followupUpdateSchema = z.object({
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

export const messageStatusSchema = z.object({
  status: z.enum(['sent', 'delivered', 'read'])
});

export const internalMessageCreateSchema = z.object({
  content: z.string().min(1, 'Message content cannot be empty').max(5000, 'Message too long')
});

export const customerStatusSchema = z.object({
  status: z.enum(['online', 'offline', 'away'])
});

export const ticketProofreadSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional()
}).refine(data => data.title || data.description, {
  message: 'At least one of title or description must be provided'
});

export const apiKeySchema = z.object({
  apiKey: z.string().min(1, 'API key is required')
});

export const ticketStatusUpdateSchema = z.object({
  status: z.enum(['open', 'in-progress', 'closed'])
});

export const ticketAssignmentSchema = z.object({
  agentId: z.string().uuid('Invalid agent ID')
});

export const createAnonymousCustomerSchema = anonymousCustomerSchema.extend({
  sessionId: z.string().optional()
});

export const sendCustomerMessageSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
  customerId: z.string().uuid('Invalid customer ID'),
  content: z.string().min(1, 'Message content cannot be empty').max(5000, 'Message too long'),
  language: z.string().optional()
});

export const startConversationSchema = z.object({
  customer: z.object({
    name: z.string().min(1, 'Customer name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().optional(),
    company: z.string().optional(),
  }),
  contextData: z.record(z.any()).optional(),
  organizationId: z.string().optional(),
  initialMessage: z.string().optional(),
  aiEnabled: z.boolean().optional().default(true),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again shortly' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.path === '/api/health' || !req.path.startsWith('/api');
  },
});

export const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'You are sending messages too quickly. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const conversationCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'You have reached the maximum number of new conversations. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

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

export const imageUpload = multer({
  storage: imageUploadStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

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

export const videoUpload = multer({
  storage: videoUploadStorage,
  limits: {
    fileSize: 100 * 1024 * 1024,
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

export const upload = multer({
  storage: uploadStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 15,
    fieldSize: 1024 * 1024,
    fieldNameSize: 100
  },
  fileFilter: function (req, file, cb) {
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

export const customerChatUpload = multer({
  storage: customerChatStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 5
  },
  fileFilter: function (req, file, cb) {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Please upload images, PDFs, or documents.'));
    }
  }
});

export const csrfProtection = (req: any, res: any, next: any) => {
  if (req.method === 'GET') {
    return next();
  }
  
  const origin = req.get('Origin');
  const referer = req.get('Referer');
  const host = req.get('Host');
  
  if (origin && host) {
    const originHost = origin.replace(/^https?:\/\//, '').split('/')[0];
    const hostWithoutPort = host.split(':')[0];
    
    if (originHost.toLowerCase() !== hostWithoutPort.toLowerCase()) {
      if (originHost.includes('.replit.dev') || originHost.includes('.kirk.replit.dev')) {
        // Allow Replit domains
      } else {
        return res.status(403).json({ error: 'Invalid origin' });
      }
    }
  }
  
  if (!origin && referer && host) {
    const refererHost = referer.replace(/^https?:\/\//, '').split('/')[0];
    const hostWithoutPort = host.split(':')[0];
    
    if (refererHost.toLowerCase() !== hostWithoutPort.toLowerCase()) {
      if (!refererHost.includes('.replit.dev')) {
        return res.status(403).json({ error: 'Invalid referer' });
      }
    }
  }
  
  next();
};
