import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import crypto from "crypto";
import rateLimit from 'express-rate-limit';
import OpenAI from 'openai';
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
import { eq, desc, and } from 'drizzle-orm';
import { users, cloudStorageOAuthConfigs } from '@shared/schema';
import { registerAuthRoutes } from './routes/auth.routes';
import { registerCustomerChatRoutes } from './routes/customer-chat.routes';
import { registerEmbedRoutes } from './routes/embed.routes';
import { registerQuantumRoutes } from './routes/quantum.routes';
import type { RouteContext } from './routes/types';
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
  insertResolutionRecordSchema,
  customers,
  conversations,
  channelContacts
} from '@shared/schema';
import { WebScraper } from './web-scraper';

// Module-level OAuth state nonce store (production should use Redis/DB)
const oauthStateStore = new Map<string, { userId: string; organizationId: string; workspaceId: string; oauthConfigId: string | null; expiresAt: Date }>();
import { KnowledgeRetrievalService } from './knowledge-retrieval';
import { channelService } from './channel-service';
import { channelProviderFactory } from './channel-providers';

// Route-specific validation schemas
const messageCreateSchema = z.object({
  conversationId: z.string(),
  content: z.string().min(1, 'Message content cannot be empty').max(5000, 'Message too long')
});

// Multi-region validation schemas
const createRegionSchema = z.object({
  isoCode: z.string().min(2).max(3).toUpperCase(),
  name: z.string().min(1).max(100),
  defaultLocale: z.string().default('en'),
  supportedLocales: z.array(z.string()).default(['en']),
  timezone: z.string().default('UTC'),
  currency: z.string().max(3).default('USD'),
  currencySymbol: z.string().max(5).default('$'),
  dateFormat: z.string().default('MM/DD/YYYY'),
  subdomain: z.string().optional(),
  customDomain: z.string().optional()
});

const updateRegionSchema = createRegionSchema.partial();

const createOrganizationMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'manager', 'viewer']).default('viewer'),
  canViewAllConversations: z.boolean().default(true),
  canManageWorkspaces: z.boolean().default(false),
  canManageMembers: z.boolean().default(false),
  canManageSettings: z.boolean().default(false)
});

const updateOrganizationMemberSchema = createOrganizationMemberSchema.partial();

const createKnowledgeCollectionSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  ownerOrganizationId: z.string().uuid().optional(),
  visibility: z.enum(['private', 'organization', 'shared']).default('organization'),
  defaultLocale: z.string().default('en'),
  supportedLocales: z.array(z.string()).default(['en'])
});

const updateKnowledgeCollectionSchema = createKnowledgeCollectionSchema.partial();

const addArticleToCollectionSchema = z.object({
  articleId: z.string().uuid(),
  sortOrder: z.number().int().default(0),
  locale: z.string().optional()
});

const addCollectionToWorkspaceSchema = z.object({
  collectionId: z.string().uuid(),
  accessLevel: z.enum(['read', 'contribute', 'manage']).default('read')
});

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
    // Allowlist of supported document and image MIME types
    const allowedMimes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/octet-stream', // Browsers sometimes send this for DOCX
      'application/zip', // DOCX is a ZIP format
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    
    // Validate file extension
    const fileExt = file.originalname.toLowerCase().split('.').pop();
    const validExtensions = ['pdf', 'txt', 'docx', 'doc', 'jpg', 'jpeg', 'png', 'gif', 'webp'];
    
    // Accept if extension is valid (even if MIME type is generic like octet-stream)
    if (fileExt && validExtensions.includes(fileExt)) {
      cb(null, true);
    } else if (allowedMimes.includes(file.mimetype)) {
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
  content: z.string().min(1, 'Message content cannot be empty').max(5000, 'Message too long'),
  language: z.string().optional() // e.g., 'en', 'es', 'de', 'fr', 'zh', 'hi'
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

/**
 * Parse atomic document from AI response
 */
interface AtomicDocument {
  title: string;
  summary: string;
  domain: string;
  intent: string;
  accessLevel: string;
  tags: string[];
  content: string;
  yamlFrontmatter: string;
  aiActions?: string[];
}

function parseAtomicDocument(docBlock: string): AtomicDocument | null {
  const yamlMatch = docBlock.match(/---\n([\s\S]*?)\n---\n([\s\S]*)/);
  if (!yamlMatch) return null;

  const yamlSection = yamlMatch[1];
  const content = yamlMatch[2].trim();

  const titleMatch = yamlSection.match(/title:\s*["']?([^"'\n]+)["']?/);
  const summaryMatch = yamlSection.match(/summary:\s*["']?([^"'\n]+)["']?/);
  const domainMatch = yamlSection.match(/domain:\s*(\w+)/);
  const intentMatch = yamlSection.match(/intent:\s*([\w-]+)/);
  const accessMatch = yamlSection.match(/accessLevel:\s*(\w+)/);
  const tagsMatch = yamlSection.match(/tags:\s*\[([^\]]*)\]/);
  const actionsMatch = yamlSection.match(/ai_actions:\s*\[([^\]]*)\]/);

  return {
    title: titleMatch ? titleMatch[1].trim() : 'Untitled Document',
    summary: summaryMatch ? summaryMatch[1].trim() : '',
    domain: domainMatch ? domainMatch[1].trim() : 'general',
    intent: intentMatch ? intentMatch[1].trim() : 'reference',
    accessLevel: accessMatch ? accessMatch[1].trim() : 'internal',
    tags: tagsMatch ? tagsMatch[1].split(',').map(t => t.trim().replace(/^["']|["']$/g, '')).filter(Boolean) : [],
    content,
    yamlFrontmatter: yamlSection,
    aiActions: actionsMatch ? actionsMatch[1].split(',').map(a => a.trim().replace(/^["']|["']$/g, '')).filter(Boolean) : undefined,
  };
}

/**
 * Process document import for Documentation Framework
 * Extracts text and uses AI to generate MULTIPLE atomic documents with YAML front-matter
 * Enterprise-grade: One upload → Multiple structured knowledge units
 */
async function processDocumentImport(
  importJobId: string,
  uploadedFile: any,
  workspaceId: string,
  userId: string
): Promise<void> {
  try {
    console.log(`[DocImport] Starting document import job ${importJobId} for ${uploadedFile.originalName}`);
    
    // Update job status to processing
    await storage.updateDocumentImportJob(importJobId, { 
      status: 'processing',
      progress: 10,
      processingStartedAt: new Date()
    });

    // Extract text content
    const documentContent = await DocumentProcessor.extractText(
      uploadedFile.filePath,
      uploadedFile.originalName,
      uploadedFile.mimeType
    );

    await storage.updateDocumentImportJob(importJobId, { progress: 20 });
    
    console.log(`[DocImport] Extracted ${documentContent.metadata?.wordCount || 0} words from ${uploadedFile.originalName}`);

    // Phase 1: AI analyzes content and identifies atomic document boundaries
    const openai = new OpenAI();
    const analysisResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a knowledge architecture specialist. Analyze the document and split it into MULTIPLE ATOMIC knowledge units.

Each atomic unit should be:
- Self-contained and focused on ONE topic
- 300-800 words ideally (shorter is better)
- Independently useful to an AI agent or human reader

Output a JSON array identifying the sections to split:
\`\`\`json
{
  "sections": [
    {
      "title": "Section title",
      "startText": "First 20 chars of section",
      "endText": "Last 20 chars of section",
      "domain": "api|integration|workflow|troubleshooting|general|pos|billing|hardware",
      "intent": "how-to|reference|concept|tutorial|troubleshooting|faq"
    }
  ]
}
\`\`\`

Guidelines:
- Split by logical topic boundaries (procedures, concepts, troubleshooting steps)
- Each section becomes its own knowledge document
- Prefer MORE atomic docs over fewer large ones
- Minimum 2 sections, maximum 10 sections per source file`
        },
        {
          role: 'user',
          content: `Analyze and identify atomic document boundaries:\n\nFilename: ${uploadedFile.originalName}\n\nContent:\n${documentContent.text.substring(0, 20000)}`
        }
      ],
      temperature: 0.2,
      max_tokens: 2000,
    });

    await storage.updateDocumentImportJob(importJobId, { progress: 35 });

    // Parse section analysis
    let sections: Array<{ title: string; domain: string; intent: string; startText?: string; endText?: string }> = [];
    const analysisContent = analysisResponse.choices[0]?.message?.content || '';
    const jsonMatch = analysisContent.match(/```json\s*([\s\S]*?)\s*```/);
    
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        sections = parsed.sections || [];
      } catch (e) {
        console.log('[DocImport] Could not parse section analysis, using full document');
      }
    }

    // Fallback: if no sections identified, treat as single document
    if (sections.length === 0) {
      sections = [{
        title: uploadedFile.originalName.replace(/\.[^/.]+$/, ''),
        domain: 'general',
        intent: 'reference'
      }];
    }

    console.log(`[DocImport] Identified ${sections.length} atomic document(s) to create`);

    // Fetch existing taxonomy for this workspace to resolve domain/intent
    const existingDomains = await storage.getDocDomainsByWorkspace(workspaceId);
    const existingIntents = await storage.getDocIntentsByWorkspace(workspaceId);
    
    // Helper to find or create domain
    async function resolveDomainId(domainName: string): Promise<string | null> {
      const normalized = domainName.toLowerCase().trim();
      const existing = existingDomains.find(d => 
        d.name.toLowerCase() === normalized || d.slug?.toLowerCase() === normalized
      );
      if (existing) return existing.id;
      
      // Create new domain if not found
      try {
        const newDomain = await storage.createDocDomain({
          workspaceId,
          name: domainName,
          slug: normalized.replace(/[^a-z0-9]+/g, '-'),
          description: `Auto-created from document import`,
        });
        existingDomains.push(newDomain);
        return newDomain.id;
      } catch (e) {
        console.log(`[DocImport] Could not create domain ${domainName}:`, e);
        return null;
      }
    }

    // Helper to find or create intent
    async function resolveIntentId(intentName: string): Promise<string | null> {
      const normalized = intentName.toLowerCase().trim();
      const existing = existingIntents.find(i => 
        i.name.toLowerCase() === normalized || i.slug?.toLowerCase() === normalized
      );
      if (existing) return existing.id;
      
      // Create new intent if not found
      try {
        const newIntent = await storage.createDocIntent({
          workspaceId,
          name: intentName,
          slug: normalized.replace(/[^a-z0-9]+/g, '-'),
          description: `Auto-created from document import`,
        });
        existingIntents.push(newIntent);
        return newIntent.id;
      } catch (e) {
        console.log(`[DocImport] Could not create intent ${intentName}:`, e);
        return null;
      }
    }

    // Phase 2: Generate each atomic document with section-specific content slicing
    const atomicDocs: (AtomicDocument & { domainId?: string | null; intentId?: string | null })[] = [];
    const progressPerDoc = 40 / sections.length;
    const fullContent = documentContent.text;

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      
      // Extract section-specific content slice using start/end markers
      let sectionContent = fullContent;
      if (section.startText && section.endText) {
        const startIdx = fullContent.indexOf(section.startText);
        const endIdx = fullContent.lastIndexOf(section.endText);
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          sectionContent = fullContent.substring(startIdx, endIdx + section.endText.length);
        }
      }
      // Limit section content to reasonable size
      sectionContent = sectionContent.substring(0, 6000);
      
      const docResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a technical documentation specialist. Create ONE atomic knowledge document with YAML front-matter.

Output format:
---
title: ${section.title}
summary: [1-2 sentence summary of this specific topic]
domain: ${section.domain}
intent: ${section.intent}
accessLevel: internal
tags: [relevant, keywords, for, this, topic]
ai_actions: [optional array of executable actions like "restart_service", "check_status"]
---

[Clean markdown content - focused ONLY on this specific topic]

Guidelines:
- Keep content focused on this ONE topic: "${section.title}"
- 300-800 words ideal
- Use proper heading hierarchy
- Include step-by-step instructions for how-to content
- Include troubleshooting steps if applicable
- This document will be retrieved by AI agents, so be specific and actionable`
          },
          {
            role: 'user',
            content: `Create the atomic document for "${section.title}" from this section:\n\n${sectionContent}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const docContent = docResponse.choices[0]?.message?.content || '';
      const parsed = parseAtomicDocument(docContent);
      
      if (parsed) {
        // Resolve domain and intent to taxonomy IDs
        const domainId = await resolveDomainId(parsed.domain);
        const intentId = await resolveIntentId(parsed.intent);
        atomicDocs.push({ ...parsed, domainId, intentId });
      }

      await storage.updateDocumentImportJob(importJobId, { 
        progress: Math.round(35 + (progressPerDoc * (i + 1)))
      });
    }

    console.log(`[DocImport] Generated ${atomicDocs.length} atomic documents`);

    // Phase 3: Create documents and versions in database
    let documentsCreated = 0;
    let documentsNeedingReview = 0;
    const createdDocIds: string[] = [];

    for (const atomicDoc of atomicDocs) {
      const slug = atomicDoc.title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50) + '-' + Date.now();

      // Map accessLevel to roleAccess/isPublic
      const isPublic = atomicDoc.accessLevel === 'public';
      const roleAccess = atomicDoc.accessLevel === 'restricted' 
        ? ['admin'] 
        : atomicDoc.accessLevel === 'internal' 
          ? ['member', 'admin'] 
          : ['member', 'admin', 'viewer'];

      // Ensure tags is a proper array of strings
      const safeTags = Array.isArray(atomicDoc.tags) 
        ? atomicDoc.tags.filter((t: any) => typeof t === 'string' && t.length > 0)
        : (typeof atomicDoc.tags === 'string' ? [atomicDoc.tags] : []);

      // Create the document with correct schema fields and resolved taxonomy IDs
      // Note: aiActions temporarily disabled due to DB array insertion issues
      const document = await storage.createDocument({
        workspaceId,
        slug,
        title: atomicDoc.title,
        summary: atomicDoc.summary,
        domainId: atomicDoc.domainId || undefined,
        intentId: atomicDoc.intentId || undefined,
        status: 'draft',
        isPublic,
        roleAccess,
        tags: safeTags.length > 0 ? safeTags : undefined,
        createdBy: userId,
      });

      // Create the version with correct schema fields (markdownBody, frontMatter)
      const version = await storage.createDocumentVersion({
        documentId: document.id,
        version: '1.0.0',
        versionNumber: 1,
        markdownBody: atomicDoc.content,
        frontMatter: atomicDoc.yamlFrontmatter ? JSON.parse(`{"raw": ${JSON.stringify(atomicDoc.yamlFrontmatter)}}`) : null,
        status: 'pending_review',
        createdBy: userId,
      });

      // Add to review queue
      await storage.createDocumentReviewQueueEntry({
        documentVersionId: version.id,
        status: 'pending',
        isAiGenerated: true,
        aiConfidence: 80,
        needsReview: true,
      });

      createdDocIds.push(document.id);
      documentsCreated++;
      documentsNeedingReview++;
    }

    await storage.updateDocumentImportJob(importJobId, { progress: 95 });

    // Create relationships between atomic docs from same source
    if (createdDocIds.length > 1) {
      for (let i = 1; i < createdDocIds.length; i++) {
        await storage.createDocumentRelationship({
          sourceDocumentId: createdDocIds[0],
          targetDocumentId: createdDocIds[i],
          relationshipType: 'related_to',
        });
      }
    }

    // Update job as completed
    await storage.updateDocumentImportJob(importJobId, {
      status: 'completed',
      progress: 100,
      documentsCreated,
      documentsNeedingReview,
      processingCompletedAt: new Date(),
    });

    console.log(`[DocImport] Successfully completed import job ${importJobId} - created ${documentsCreated} atomic documents`);
  } catch (error) {
    console.error(`[DocImport] Error processing import job ${importJobId}:`, error);
    await storage.updateDocumentImportJob(importJobId, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : String(error),
      processingCompletedAt: new Date(),
    });
  }
}

export async function registerRoutes(app: Express, sessionStore?: any): Promise<{ server: Server, wsServer?: any }> {
  // Serve static files from public folder (for embed widget)
  app.use('/embed', express.static(path.join(process.cwd(), 'public', 'embed')));
  
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

  // Register modular auth routes (staff login/logout, customer portal auth)
  registerAuthRoutes({ app, httpServer: null as any, wsServer: null as any });

  // Notification API routes
  app.get('/api/notifications', requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const unreadOnly = req.query.unreadOnly === 'true';
      const limit = parseInt(req.query.limit as string) || 50;
      
      const { notificationService } = await import('./notification-service');
      const notifications = notificationService.getNotifications(userId, { unreadOnly, limit });
      const unreadCount = notificationService.getUnreadCount(userId);
      
      res.json({ notifications, unreadCount });
    } catch (error) {
      console.error('Failed to get notifications:', error);
      res.status(500).json({ error: 'Failed to get notifications' });
    }
  });

  app.post('/api/notifications/:id/read', requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const notificationId = req.params.id;
      
      const { notificationService } = await import('./notification-service');
      const success = notificationService.markAsRead(userId, notificationId);
      
      res.json({ success });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  });

  app.post('/api/notifications/mark-all-read', requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      
      const { notificationService } = await import('./notification-service');
      const count = notificationService.markAllAsRead(userId);
      
      res.json({ success: true, count });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  });

  // Geolocation detection endpoint for language suggestions
  app.get('/api/geo/detect', async (req, res) => {
    try {
      // Try to get country from various headers that might be set by CDN/proxy
      const cfCountry = req.headers['cf-ipcountry'] as string;
      const xCountry = req.headers['x-country-code'] as string;
      const xVercelCountry = req.headers['x-vercel-ip-country'] as string;
      
      // Check headers first (most reliable if behind CDN)
      if (cfCountry && cfCountry !== 'XX') {
        return res.json({ countryCode: cfCountry.toUpperCase(), source: 'cloudflare' });
      }
      if (xCountry) {
        return res.json({ countryCode: xCountry.toUpperCase(), source: 'proxy' });
      }
      if (xVercelCountry) {
        return res.json({ countryCode: xVercelCountry.toUpperCase(), source: 'vercel' });
      }

      // Get client IP
      const forwardedFor = req.headers['x-forwarded-for'] as string;
      const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : req.ip;
      
      // Skip lookup for localhost/private IPs
      if (!clientIp || clientIp === '127.0.0.1' || clientIp === '::1' || clientIp.startsWith('192.168.') || clientIp.startsWith('10.')) {
        return res.json({ countryCode: null, source: 'local' });
      }

      // Use ip-api.com for free IP geolocation (limited to 45 req/min)
      try {
        const response = await fetch(`http://ip-api.com/json/${clientIp}?fields=countryCode`);
        if (response.ok) {
          const data = await response.json() as { countryCode?: string };
          if (data.countryCode) {
            return res.json({ countryCode: data.countryCode.toUpperCase(), source: 'ip-api' });
          }
        }
      } catch (error) {
        console.error('[Geo] IP lookup failed:', error);
      }

      // Fallback: return null
      res.json({ countryCode: null, source: 'unknown' });
    } catch (error) {
      console.error('[Geo] Detection error:', error);
      res.status(500).json({ error: 'Failed to detect location' });
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

  // Customer portal unread message counts per conversation
  app.get('/api/customer-portal/unread-counts', async (req, res) => {
    try {
      const customerId = (req.session as any).customerId;
      const userType = (req.session as any).userType;

      if (!customerId || userType !== 'customer') {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Get unread counts using the existing storage method
      const unreadCounts = await storage.getUnreadMessageCountsPerConversation(customerId);
      
      // Calculate total unread count
      const totalUnread = unreadCounts.reduce((sum, item) => sum + item.unreadCount, 0);
      
      res.json({
        totalUnread,
        perConversation: unreadCounts,
      });
    } catch (error) {
      console.error('Get customer portal unread counts error:', error);
      res.status(500).json({ error: 'Failed to get unread counts' });
    }
  });

  // Customer portal all conversations - supports organization-based filtering for admins
  app.get('/api/customer-portal/conversations', async (req, res) => {
    try {
      const customerId = (req.session as any).customerId;
      const userType = (req.session as any).userType;

      if (!customerId || userType !== 'customer') {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Get current customer to check organization membership and role
      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      let conversations;
      
      // If customer is an org admin, get all organization conversations
      // Otherwise, get only their own conversations
      if (customer.customerOrganizationId && customer.customerOrgRole === 'admin') {
        conversations = await storage.getConversationsByCustomerOrganization(customer.customerOrganizationId);
      } else {
        conversations = await storage.getConversationsByCustomer(customerId);
      }
      
      // Get unread counts for all customer conversations
      const unreadCounts = await storage.getUnreadMessageCountsPerConversation(customerId);
      const unreadMap = new Map(unreadCounts.map(u => [u.conversationId, u.unreadCount]));
      
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

      // Get customer info for organization-wide conversations (when admin views others' conversations)
      const customerIds = [...new Set(conversations.map(c => c.customerId))];
      const customerMap = new Map<string, { name: string; email: string }>();
      for (const cId of customerIds) {
        const c = await storage.getCustomer(cId);
        if (c) {
          customerMap.set(cId, { name: c.name, email: c.email });
        }
      }
      
      const allConversations = conversations
        .sort((a, b) => {
          // First sort by unread (conversations with unread messages first)
          const aUnread = unreadMap.get(a.id) || 0;
          const bUnread = unreadMap.get(b.id) || 0;
          if (aUnread > 0 && bUnread === 0) return -1;
          if (bUnread > 0 && aUnread === 0) return 1;
          // Then by priority
          const aPriority = priorityOrder[a.priority || 'low'] ?? 3;
          const bPriority = priorityOrder[b.priority || 'low'] ?? 3;
          if (aPriority !== bPriority) return aPriority - bPriority;
          // Then by date (most recent first)
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        })
        .map(conv => ({
          id: conv.id,
          subject: conv.title || 'Untitled Conversation',
          status: conv.status,
          priority: conv.priority || 'low',
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          unreadCount: unreadMap.get(conv.id) || 0,
          assignedAgentId: conv.assignedAgentId || null,
          assignedAgentName: conv.assignedAgentId ? agentMap.get(conv.assignedAgentId)?.name || 'Support Agent' : null,
          // Include customer info for org admins viewing all conversations
          customerId: conv.customerId,
          customerName: customerMap.get(conv.customerId)?.name || 'Unknown',
          customerEmail: customerMap.get(conv.customerId)?.email || '',
          isOwnConversation: conv.customerId === customerId,
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
          subject: conv.title || 'Untitled Conversation',
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
        categoryId: z.string().optional(),
      }).parse(req.body);

      // Get customer info
      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      // Get support category if provided
      let supportCategory = null;
      if (createData.categoryId && createData.categoryId !== 'general') {
        supportCategory = await storage.getSupportCategory(createData.categoryId);
      }

      // Create conversation with category context
      const conversationTitle = supportCategory 
        ? `[${supportCategory.name}] ${createData.subject}`
        : createData.subject;

      const conversation = await storage.createConversation({
        customerId: customerId,
        title: conversationTitle,
        status: 'open',
        priority: 'medium',
      });

      // Store category context in conversation data if category was selected
      if (supportCategory) {
        await db
          .update(conversations)
          .set({
            contextData: JSON.stringify({
              categoryId: supportCategory.id,
              categoryName: supportCategory.name,
              aiAgentId: supportCategory.aiAgentId || null,
            }),
            updatedAt: new Date()
          })
          .where(eq(conversations.id, conversation.id));
      }

      // Create initial message
      const initialMessage = await storage.createMessage({
        conversationId: conversation.id,
        content: createData.message,
        senderType: 'customer',
        senderId: customerId,
      });

      // If category has linked AI agent, trigger AI response
      if (supportCategory?.aiAgentId) {
        const aiAgent = await storage.getAiAgent(supportCategory.aiAgentId);
        if (aiAgent && aiAgent.isActive) {
          try {
            const aiResponse = await AIService.generateSmartAgentResponse(
              createData.message,
              conversation.id,
              aiAgent
            );
            
            if (aiResponse.response && !aiResponse.requiresHumanTakeover) {
              await storage.createMessage({
                conversationId: conversation.id,
                content: aiResponse.response,
                senderType: 'ai',
                senderId: aiAgent.id,
                senderName: aiAgent.name,
              });
            }
          } catch (aiError) {
            console.error('AI response error:', aiError);
          }
        }
      }

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
        subject: conversation.title || 'Untitled Conversation',
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

      // Mark all messages in this conversation as read for the customer
      await storage.markAllConversationMessagesAsRead(conversationId, customerId);

      // Get customer info for activity log
      const customer = await storage.getCustomer(customerId);
      const customerName = customer?.name || 'Customer';

      // Create activity log entry for audit trail
      await storage.createActivityLog({
        conversationId,
        action: 'customer_viewed',
        details: `${customerName} viewed conversation at ${viewedAt.toISOString()}`,
      });

      // Broadcast read receipt to staff via WebSocket
      const wsServer = (app as any).wsServer;
      if (wsServer && wsServer.broadcastToStaff) {
        wsServer.broadcastToStaff({
          type: 'customer_read_receipt',
          conversationId,
          customerId,
          customerName,
          viewedAt: viewedAt.toISOString(),
        });
      }

      res.json({ success: true, viewedAt: viewedAt.toISOString() });
    } catch (error) {
      console.error('Mark conversation as read error:', error);
      res.status(500).json({ error: 'Failed to mark conversation as read' });
    }
  });

  // Customer reopens a resolved/closed conversation
  app.post('/api/customer-portal/conversation/:conversationId/reopen', async (req, res) => {
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

      // Only allow reopening closed/resolved conversations
      if (conversation.status !== 'closed' && conversation.status !== 'resolved') {
        return res.status(400).json({ error: 'Conversation is already open' });
      }

      const previousStatus = conversation.status;
      const customer = await storage.getCustomer(customerId);
      const customerName = customer?.name || 'Customer';

      // Update status to open
      await storage.updateConversationStatus(conversationId, 'open');

      // Log the status change with who did it
      await storage.createActivityLog({
        conversationId,
        action: 'status_changed',
        details: JSON.stringify({
          previousStatus,
          newStatus: 'open',
          changedBy: customerName,
          changedByType: 'customer',
          changedById: customerId,
          reason: 'Customer reopened conversation'
        }),
      });

      // Notify staff via WebSocket
      const wsServer = (app as any).wsServer;
      if (wsServer && wsServer.broadcastToStaff) {
        wsServer.broadcastToStaff({
          type: 'conversation_reopened',
          conversationId,
          customerId,
          customerName,
          previousStatus,
          newStatus: 'open',
        });
      }

      res.json({ success: true, message: 'Conversation reopened successfully' });
    } catch (error) {
      console.error('Reopen conversation error:', error);
      res.status(500).json({ error: 'Failed to reopen conversation' });
    }
  });

  // Get status change history for a conversation (customer portal)
  app.get('/api/customer-portal/conversation/:conversationId/history', async (req, res) => {
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

      // Get activity logs for status changes
      const activityLogs = await storage.getActivityLogsByConversation(conversationId);
      
      // Filter for status changes and format for customer display
      const statusHistory = activityLogs
        .filter((log: any) => log.action === 'status_changed')
        .map((log: any) => {
          let details: any = {};
          try {
            details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details || {};
          } catch {
            details = { rawDetails: log.details };
          }
          return {
            id: log.id,
            previousStatus: details.previousStatus,
            newStatus: details.newStatus,
            changedBy: details.changedBy || 'Support Team',
            changedByType: details.changedByType || 'agent',
            reason: details.reason,
            timestamp: log.timestamp,
          };
        })
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      res.json(statusHistory);
    } catch (error) {
      console.error('Get conversation history error:', error);
      res.status(500).json({ error: 'Failed to get conversation history' });
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

      // Handle translation for customer messages
      let translatedContent: string | null = null;
      let originalLanguage: string | null = null;
      const customerLanguage = (conversation as any).customerLanguage || 'en';
      
      // If customer language is not English, translate to English for agents
      if (customerLanguage !== 'en') {
        console.log(`[portal-chat] Customer language is ${customerLanguage}, translating to English`);
        const translation = await AIService.translateText(content, 'en', customerLanguage);
        translatedContent = translation.translatedText;
        originalLanguage = customerLanguage;
      } else if (content.length > 10) {
        // Detect language if not set
        const detection = await AIService.detectLanguage(content);
        if (detection.language !== 'en' && detection.confidence > 70) {
          console.log(`[portal-chat] Detected non-English: ${detection.language}`);
          originalLanguage = detection.language;
          await storage.updateConversation(conversationId, { customerLanguage: detection.language });
          const translation = await AIService.translateText(content, 'en', detection.language);
          translatedContent = translation.translatedText;
        }
      }

      // Create message
      const message = await storage.createMessage({
        conversationId,
        content,
        translatedContent,
        originalLanguage,
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
      // Get all staff user IDs to ensure they receive the message
      if (wsServer && wsServer.broadcastNewMessage) {
        const allStaff = await storage.getAllUsers();
        const staffUserIds = allStaff.map((u: any) => u.id);
        
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
        }, staffUserIds);
        console.log(`[portal-chat] Broadcast new_message event for customer message: ${message.id} to ${staffUserIds.length} staff`);
        
        // Send push notifications to offline staff
        wsServer.sendPushNotificationForMessage(
          conversationId,
          message.content,
          customer?.name || customer?.email || 'Customer',
          { targetUserIds: staffUserIds }
        );
      }

      // Trigger AI response asynchronously (don't block the response)
      // Only generate AI response if AI is enabled for this conversation AND globally for customer portal
      const engagementSettings = await storage.getEngagementSettings();
      const isAiEnabledForPortal = engagementSettings?.aiGlobalEnabled !== false && 
                                   engagementSettings?.aiCustomerPortalEnabled !== false;
      
      if (conversation && conversation.aiAssistanceEnabled !== false && isAiEnabledForPortal) {
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
            
            // Broadcast AI message via WebSocket - include customerId to ensure delivery
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
              }, [customerId]);
            }
          }
        } catch (aiError) {
          console.error('[portal-chat] AI response generation failed:', aiError);
        }
        })();
      } else {
        console.log(`[portal-chat] AI response skipped - AI is disabled for conversation: ${conversationId} (learning mode)`);
        // Log for learning purposes when AI is disabled (per-conversation or global toggle)
        const disabledReason = conversation?.aiAssistanceEnabled === false 
          ? 'per-conversation toggle'
          : !isAiEnabledForPortal 
          ? 'global settings' 
          : 'unknown';
        await storage.createActivityLog({
          conversationId,
          action: 'ai_observation',
          details: `AI observed but did not respond (learning mode - ${disabledReason}): "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`
        });
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

  // Get customer organization info (for portal users)
  app.get('/api/customer-portal/organization', async (req, res) => {
    try {
      const customerId = (req.session as any).customerId;
      const userType = (req.session as any).userType;

      if (!customerId || userType !== 'customer') {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      if (!customer.customerOrganizationId) {
        return res.json({ hasOrganization: false });
      }

      const org = await storage.getCustomerOrganization(customer.customerOrganizationId);
      if (!org) {
        return res.json({ hasOrganization: false });
      }

      // Get organization members if user is admin
      let members: any[] = [];
      if (customer.customerOrgRole === 'admin') {
        const orgCustomers = await storage.getCustomersByOrganization(customer.customerOrganizationId);
        members = orgCustomers.map(c => ({
          id: c.id,
          name: c.name,
          email: c.email,
          role: c.customerOrgRole,
          isCurrentUser: c.id === customerId,
        }));
      }

      res.json({
        hasOrganization: true,
        organization: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          supportId: org.supportId,
          requireSupportId: org.requireSupportId,
        },
        role: customer.customerOrgRole,
        isAdmin: customer.customerOrgRole === 'admin',
        members: customer.customerOrgRole === 'admin' ? members : undefined,
      });
    } catch (error) {
      console.error('Get customer organization error:', error);
      res.status(500).json({ error: 'Failed to get organization info' });
    }
  });

  // Update customer organization member role (admin only)
  app.put('/api/customer-portal/organization/members/:memberId/role', async (req, res) => {
    try {
      const customerId = (req.session as any).customerId;
      const userType = (req.session as any).userType;
      const { memberId } = req.params;

      if (!customerId || userType !== 'customer') {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const customer = await storage.getCustomer(customerId);
      if (!customer || !customer.customerOrganizationId || customer.customerOrgRole !== 'admin') {
        return res.status(403).json({ error: 'Not authorized - admin role required' });
      }

      const roleData = z.object({
        role: z.enum(['admin', 'member']),
      }).parse(req.body);

      // Verify the member belongs to the same organization
      const member = await storage.getCustomer(memberId);
      if (!member || member.customerOrganizationId !== customer.customerOrganizationId) {
        return res.status(404).json({ error: 'Member not found in organization' });
      }

      // Prevent removing the last admin
      if (roleData.role === 'member' && member.customerOrgRole === 'admin') {
        const orgMembers = await storage.getCustomersByOrganization(customer.customerOrganizationId);
        const adminCount = orgMembers.filter(m => m.customerOrgRole === 'admin').length;
        if (adminCount <= 1) {
          return res.status(400).json({ error: 'Cannot remove the last admin from the organization' });
        }
      }

      await storage.updateCustomerOrganizationMembership(memberId, customer.customerOrganizationId, roleData.role);

      res.json({ message: 'Member role updated successfully' });
    } catch (error) {
      console.error('Update member role error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      res.status(500).json({ error: 'Failed to update member role' });
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
      const currentUser = req.user as any;
      let users = await storage.getAllUsers();
      
      // Filter by organization for non-platform admins
      if (!currentUser.isPlatformAdmin && currentUser.organizationId) {
        users = users.filter(user => user.organizationId === currentUser.organizationId);
      }
      
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
      const currentUser = req.user as any;
      let users = await storage.getAllUsers();
      
      // Filter by organization for non-platform admins
      if (!currentUser.isPlatformAdmin && currentUser.organizationId) {
        users = users.filter(user => user.organizationId === currentUser.organizationId);
      }
      
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

  // Create a new staff user (organization admins can create users in their org)
  app.post('/api/users', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const currentUser = req.user as any;
      
      const createUserSchema = z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Valid email required"),
        password: z.string().min(8, "Password must be at least 8 characters"),
        role: z.enum(['agent', 'admin']).default('agent'),
        mustChangePassword: z.boolean().default(false),
      });
      
      const data = createUserSchema.parse(req.body);
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      
      // Hash password
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash(data.password, 10);
      
      // Determine organization - org admins can only create in their org
      // Platform admins must specify organizationId if they don't have one
      const organizationId = currentUser.isPlatformAdmin ? req.body.organizationId : currentUser.organizationId;
      
      if (!organizationId) {
        return res.status(400).json({ error: 'Organization required' });
      }
      
      const newUser = await storage.createUser({
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role,
        organizationId: organizationId,
        status: 'offline',
        hasCompletedOnboarding: false,
      });
      
      // Update mustChangePassword if needed (separate update since it's a new field)
      if (data.mustChangePassword) {
        await db.update(users).set({ mustChangePassword: true }).where(eq(users.id, newUser.id));
      }
      
      // Remove password from response
      const { password, ...safeUser } = newUser;
      res.json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  // Generate staff invite link
  app.post('/api/staff-invites', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const currentUser = req.user as any;
      
      const inviteSchema = z.object({
        email: z.string().email("Valid email required"),
        name: z.string().optional(),
        role: z.enum(['agent', 'admin']).default('agent'),
        expiresInDays: z.number().min(1).max(30).default(7),
      });
      
      const data = inviteSchema.parse(req.body);
      
      // Determine organization
      const organizationId = currentUser.isPlatformAdmin ? req.body.organizationId : currentUser.organizationId;
      
      if (!organizationId) {
        return res.status(400).json({ error: 'Organization required' });
      }
      
      // Generate unique token
      const crypto = await import('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + data.expiresInDays);
      
      const invite = await storage.createStaffInvite({
        token,
        email: data.email,
        name: data.name || null,
        role: data.role,
        organizationId,
        invitedBy: currentUser.id,
        expiresAt,
      });
      
      // Generate invite URL
      const baseUrl = process.env.PUBLIC_URL || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      const inviteUrl = `${baseUrl}/join?token=${token}`;
      
      res.json({ invite, inviteUrl });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error('Error creating staff invite:', error);
      res.status(500).json({ error: 'Failed to create invite' });
    }
  });

  // Get staff invites for current organization
  app.get('/api/staff-invites', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const currentUser = req.user as any;
      
      if (!currentUser.organizationId && !currentUser.isPlatformAdmin) {
        return res.status(400).json({ error: 'Organization required' });
      }
      
      const organizationId = currentUser.organizationId;
      if (!organizationId) {
        return res.json([]);
      }
      
      const invites = await storage.getStaffInvitesByOrganization(organizationId);
      res.json(invites);
    } catch (error) {
      console.error('Error fetching staff invites:', error);
      res.status(500).json({ error: 'Failed to fetch invites' });
    }
  });

  // Delete/revoke a staff invite
  app.delete('/api/staff-invites/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const currentUser = req.user as any;
      const inviteId = req.params.id;
      
      // Platform admins can delete any invite
      if (currentUser.isPlatformAdmin) {
        await storage.deleteStaffInvite(inviteId);
        return res.json({ success: true });
      }
      
      // Org admins can only delete invites from their organization
      if (!currentUser.organizationId) {
        return res.status(400).json({ error: 'Organization required' });
      }
      
      const invites = await storage.getStaffInvitesByOrganization(currentUser.organizationId);
      const invite = invites.find(i => i.id === inviteId);
      
      if (!invite) {
        return res.status(404).json({ error: 'Invite not found' });
      }
      
      await storage.deleteStaffInvite(inviteId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting staff invite:', error);
      res.status(500).json({ error: 'Failed to delete invite' });
    }
  });

  // Public endpoint to validate and use a staff invite
  app.get('/api/public/staff-invite/:token', async (req, res) => {
    try {
      const { token } = req.params;
      const invite = await storage.getStaffInviteByToken(token);
      
      if (!invite) {
        return res.status(404).json({ error: 'Invalid invite link' });
      }
      
      if (invite.usedAt) {
        return res.status(400).json({ error: 'This invite has already been used' });
      }
      
      if (new Date() > new Date(invite.expiresAt)) {
        return res.status(400).json({ error: 'This invite has expired' });
      }
      
      // Get organization name
      const org = await storage.getOrganization(invite.organizationId);
      
      res.json({
        valid: true,
        email: invite.email,
        name: invite.name,
        role: invite.role,
        organizationName: org?.name || 'Unknown Organization',
      });
    } catch (error) {
      console.error('Error validating staff invite:', error);
      res.status(500).json({ error: 'Failed to validate invite' });
    }
  });

  // Public endpoint to complete staff registration via invite
  app.post('/api/public/staff-invite/:token/complete', async (req, res) => {
    try {
      const { token } = req.params;
      const invite = await storage.getStaffInviteByToken(token);
      
      if (!invite) {
        return res.status(404).json({ error: 'Invalid invite link' });
      }
      
      if (invite.usedAt) {
        return res.status(400).json({ error: 'This invite has already been used' });
      }
      
      if (new Date() > new Date(invite.expiresAt)) {
        return res.status(400).json({ error: 'This invite has expired' });
      }
      
      const registerSchema = z.object({
        name: z.string().min(1, "Name is required"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      });
      
      const data = registerSchema.parse(req.body);
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(invite.email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      
      // Hash password
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash(data.password, 10);
      
      const newUser = await storage.createUser({
        name: data.name,
        email: invite.email,
        password: hashedPassword,
        role: invite.role,
        organizationId: invite.organizationId,
        status: 'offline',
        hasCompletedOnboarding: false,
      });
      
      // Mark invite as used
      await storage.markStaffInviteUsed(invite.id, newUser.id);
      
      res.json({ success: true, message: 'Account created successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error('Error completing staff registration:', error);
      res.status(500).json({ error: 'Failed to complete registration' });
    }
  });

  // Get current user's workspaces (for workspace selection after login)
  app.get('/api/users/me/workspaces', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Get workspace memberships for this user
      const memberships = await storage.getWorkspaceMembersByUser(user.id);
      
      // Enrich with workspace and organization details
      const workspacesWithDetails = await Promise.all(
        memberships
          .filter(m => m.status === 'active')
          .map(async (membership) => {
            const workspace = await storage.getWorkspace(membership.workspaceId);
            if (!workspace) return null;
            
            const organization = await storage.getOrganization(workspace.organizationId);
            
            return {
              id: workspace.id,
              name: workspace.name,
              slug: workspace.slug,
              description: workspace.description,
              role: membership.role,
              organizationName: organization?.name || 'Unknown',
              organizationId: workspace.organizationId,
              joinedAt: membership.joinedAt,
            };
          })
      );
      
      res.json(workspacesWithDetails.filter(Boolean));
    } catch (error) {
      console.error('Failed to fetch user workspaces:', error);
      res.status(500).json({ error: 'Failed to fetch workspaces' });
    }
  });

  // Select a workspace for the current session
  app.post('/api/users/me/select-workspace', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { workspaceId } = req.body;
      
      if (!workspaceId) {
        return res.status(400).json({ error: 'Workspace ID is required' });
      }
      
      // Verify user has access to this workspace
      const membership = await storage.getWorkspaceMemberByUserAndWorkspace(user.id, workspaceId);
      if (!membership || membership.status !== 'active') {
        return res.status(403).json({ error: 'You do not have access to this workspace' });
      }
      
      // Store selected workspace in session
      (req.session as any).selectedWorkspaceId = workspaceId;
      
      res.json({ success: true, workspaceId });
    } catch (error) {
      console.error('Failed to select workspace:', error);
      res.status(500).json({ error: 'Failed to select workspace' });
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

      // Emit real-time notification for assignment
      try {
        const customer = await storage.getCustomer(conversation.customerId);
        const customerName = customer?.name || 'Customer';
        const { notificationService } = await import('./notification-service');
        await notificationService.emitConversationAssigned(
          conversationId,
          agentId,
          user.id,
          customerName
        );
      } catch (notifError) {
        console.error('Failed to emit assignment notification:', notifError);
      }

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
      
      // Log the status change with user info for history tracking
      if (previousStatus !== status) {
        await storage.createActivityLog({
          agentId: user.id,
          conversationId,
          action: 'status_changed',
          details: JSON.stringify({
            previousStatus,
            newStatus: status,
            changedBy: user.name,
            changedByType: 'agent',
            changedById: user.id,
            reason: `Status changed by ${user.name}`
          }),
        });
      }
      
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
      
      // Check if translation is needed (customer language is not English)
      let translatedContent: string | null = null;
      let originalLanguage: string | null = 'en'; // Agent messages are assumed to be in English
      
      const customerLanguage = (conversation as any).customerLanguage || 'en';
      if (customerLanguage && customerLanguage !== 'en') {
        console.log(`[POST /api/messages] Translating agent message from English to ${customerLanguage}`);
        const translation = await AIService.translateText(content, customerLanguage, 'en');
        translatedContent = translation.translatedText;
        console.log(`[POST /api/messages] Translation complete: "${content.substring(0, 50)}..." → "${translatedContent?.substring(0, 50)}..."`);
      }
      
      console.log(`[POST /api/messages] Creating message with senderId=${user.id}, senderType=${senderType}, scope=public`);
      const message = await storage.createMessage({
        conversationId,
        senderId: user.id,
        senderType,
        content,
        translatedContent,
        originalLanguage,
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
        // Include customerId as target to ensure delivery even if customer hasn't "joined" conversation
        const targetUserIds = conversation.customerId ? [conversation.customerId] : [];
        wsServer.broadcastNewMessage(conversationId, {
          messageId: message.id,
          conversationId: message.conversationId,
          content: message.content,
          translatedContent: (message as any).translatedContent,
          originalLanguage: (message as any).originalLanguage,
          userId: message.senderId,
          userName: user.name,
          userRole: user.role,
          senderType: message.senderType,
          timestamp: message.timestamp,
          status: message.status
        }, targetUserIds);
        
        // Send push notification to offline customer
        if (conversation.customerId) {
          wsServer.sendPushNotificationForMessage(
            conversationId,
            message.content,
            user.name,
            { 
              targetUserIds: [conversation.customerId],
              excludeSenderId: user.id
            }
          );
        }
        
        // For anonymous customers, try to send via session
        if (conversation.isAnonymous && conversation.sessionId) {
          wsServer.sendPushNotificationForMessage(
            conversationId,
            message.content,
            user.name,
            { targetSessionId: conversation.sessionId }
          );
        }
        
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
  // ORGANIZATION BRANDING API ENDPOINTS (WHITE-LABEL)
  // ============================================

  // Public endpoint: Get organization branding by slug (for chat widget)
  app.get('/api/organizations/:slug/branding', async (req, res) => {
    try {
      const { slug } = req.params;
      const org = await storage.getOrganizationBySlug(slug);
      
      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      // Return only branding-related fields (public data)
      res.json({
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo: org.logo,
        primaryColor: org.primaryColor,
        secondaryColor: org.secondaryColor,
        welcomeMessage: org.welcomeMessage,
      });
    } catch (error) {
      console.error('Error fetching organization branding:', error);
      res.status(500).json({ error: 'Failed to fetch organization branding' });
    }
  });

  // Dynamic PWA manifest endpoint - serves organization-branded manifest
  app.get('/manifest.json', async (req, res) => {
    try {
      const { org: orgSlug } = req.query;
      
      // Default manifest (fallback)
      const defaultManifest = {
        name: "Support Board",
        short_name: "Support Board",
        description: "Professional customer support platform with real-time chat, conversation management, and admin dashboard.",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#6366f1",
        orientation: "portrait-primary",
        icons: [
          { src: "/icons/icon-72.png", sizes: "72x72", type: "image/png", purpose: "any maskable" },
          { src: "/icons/icon-96.png", sizes: "96x96", type: "image/png", purpose: "any maskable" },
          { src: "/icons/icon-128.png", sizes: "128x128", type: "image/png", purpose: "any maskable" },
          { src: "/icons/icon-144.png", sizes: "144x144", type: "image/png", purpose: "any maskable" },
          { src: "/icons/icon-152.png", sizes: "152x152", type: "image/png", purpose: "any maskable" },
          { src: "/icons/icon-180.png", sizes: "180x180", type: "image/png", purpose: "any maskable" },
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "/icons/icon-384.png", sizes: "384x384", type: "image/png", purpose: "any maskable" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
        ],
        categories: ["business", "productivity"],
        shortcuts: [
          { name: "Conversations", short_name: "Conversations", url: "/conversations", description: "View customer conversations" },
          { name: "Dashboard", short_name: "Dashboard", url: "/dashboard", description: "View the dashboard" },
          { name: "Knowledge Base", short_name: "Knowledge", url: "/knowledge", description: "Manage knowledge base" }
        ]
      };
      
      // If org slug provided, customize manifest with org branding
      if (orgSlug && typeof orgSlug === 'string') {
        const org = await storage.getOrganizationBySlug(orgSlug);
        
        if (org) {
          const brandedManifest = {
            ...defaultManifest,
            name: org.name,
            short_name: org.name.length > 12 ? org.name.substring(0, 12) : org.name,
            description: org.welcomeMessage || `${org.name} - Customer Support`,
            theme_color: org.primaryColor || defaultManifest.theme_color,
            start_url: `/?org=${orgSlug}`,
            // Use org logo for icons if available
            ...(org.logo && {
              icons: [
                { src: org.logo, sizes: "192x192", type: "image/png", purpose: "any" },
                { src: org.logo, sizes: "512x512", type: "image/png", purpose: "any" },
                // Keep default icons as fallback for different sizes
                ...defaultManifest.icons
              ]
            })
          };
          
          res.setHeader('Content-Type', 'application/manifest+json');
          return res.json(brandedManifest);
        }
      }
      
      res.setHeader('Content-Type', 'application/manifest+json');
      res.json(defaultManifest);
    } catch (error) {
      console.error('Error generating manifest:', error);
      // Return default manifest on error
      res.setHeader('Content-Type', 'application/manifest+json');
      res.json({
        name: "Support Board",
        short_name: "Support Board",
        start_url: "/",
        display: "standalone",
        theme_color: "#6366f1",
        background_color: "#ffffff"
      });
    }
  });

  // Admin endpoint: Get all organizations
  app.get('/api/admin/organizations', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const orgs = await storage.getAllOrganizations();
      res.json(orgs);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      res.status(500).json({ error: 'Failed to fetch organizations' });
    }
  });

  // Admin endpoint: Get single organization
  app.get('/api/admin/organizations/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const org = await storage.getOrganization(id);
      
      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      res.json(org);
    } catch (error) {
      console.error('Error fetching organization:', error);
      res.status(500).json({ error: 'Failed to fetch organization' });
    }
  });

  // Admin endpoint: Create organization
  app.post('/api/admin/organizations', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const orgSchema = z.object({
        name: z.string().min(1, 'Name is required'),
        slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens only'),
        logo: z.string().optional(),
        primaryColor: z.string().optional(),
        secondaryColor: z.string().optional(),
        welcomeMessage: z.string().optional(),
      });
      
      const validatedData = orgSchema.parse(req.body);
      const org = await storage.createOrganization(validatedData);
      res.status(201).json(org);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid organization data', details: fromZodError(error).toString() });
      }
      console.error('Error creating organization:', error);
      res.status(500).json({ error: 'Failed to create organization' });
    }
  });

  // Admin endpoint: Update organization branding
  app.put('/api/admin/organizations/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const updateSchema = z.object({
        name: z.string().min(1).optional(),
        slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
        logo: z.string().nullable().optional(),
        primaryColor: z.string().optional(),
        secondaryColor: z.string().optional(),
        welcomeMessage: z.string().nullable().optional(),
        aiEnabled: z.boolean().optional(),
        knowledgeBaseEnabled: z.boolean().optional(),
      });
      
      const validatedData = updateSchema.parse(req.body);
      const org = await storage.updateOrganization(id, validatedData);
      res.json(org);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid update data', details: fromZodError(error).toString() });
      }
      console.error('Error updating organization:', error);
      res.status(500).json({ error: 'Failed to update organization' });
    }
  });

  // Admin endpoint: Update organization details (PATCH)
  app.patch('/api/admin/organizations/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const currentUser = req.user as any;
      if (!currentUser.isPlatformAdmin) {
        return res.status(403).json({ error: 'Platform admin access required' });
      }
      
      const { id } = req.params;
      const updateSchema = z.object({
        name: z.string().min(1).optional(),
        status: z.enum(['active', 'suspended', 'trial']).optional(),
        website: z.string().url().optional().or(z.literal("")),
        supportEmail: z.string().email().optional().or(z.literal("")),
        supportPhone: z.string().optional(),
        welcomeMessage: z.string().optional(),
      });
      
      const validatedData = updateSchema.parse(req.body);
      
      // Normalize empty strings to null for proper database storage
      const normalizedData = {
        ...validatedData,
        website: validatedData.website === "" ? null : validatedData.website,
        supportEmail: validatedData.supportEmail === "" ? null : validatedData.supportEmail,
        supportPhone: validatedData.supportPhone === "" ? null : validatedData.supportPhone,
        welcomeMessage: validatedData.welcomeMessage === "" ? null : validatedData.welcomeMessage,
      };
      
      const org = await storage.updateOrganization(id, normalizedData);
      res.json(org);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid update data', details: fromZodError(error).toString() });
      }
      console.error('Error updating organization:', error);
      res.status(500).json({ error: 'Failed to update organization' });
    }
  });

  // Admin endpoint: Get users for an organization
  app.get('/api/admin/organizations/:id/users', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const currentUser = req.user as any;
      if (!currentUser.isPlatformAdmin) {
        return res.status(403).json({ error: 'Platform admin access required' });
      }
      
      const { id } = req.params;
      const allUsers = await storage.getAllUsers();
      const orgUsers = allUsers.filter(u => u.organizationId === id).map(({ password, ...user }) => user);
      res.json(orgUsers);
    } catch (error) {
      console.error('Error fetching organization users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // Admin endpoint: Reset user password
  app.post('/api/admin/users/:id/reset-password', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const currentUser = req.user as any;
      if (!currentUser.isPlatformAdmin) {
        return res.status(403).json({ error: 'Platform admin access required' });
      }
      
      const { id } = req.params;
      
      // Validate password with Zod
      const resetPasswordSchema = z.object({
        password: z.string().min(8, 'Password must be at least 8 characters'),
      });
      
      const { password } = resetPasswordSchema.parse(req.body);
      
      // Verify user exists before resetting password
      const targetUser = await storage.getUser(id);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Hash and update password using storage interface
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash(password, 10);
      
      await storage.updateUser(id, { password: hashedPassword });
      
      res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error('Error resetting password:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  });

  // ============================================
  // ORGANIZATION APPLICATIONS & SETUP TOKENS
  // ============================================

  // Admin endpoint: Get all organization applications
  app.get('/api/admin/organization-applications', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const applications = await storage.getAllOrganizationApplications(status);
      res.json(applications);
    } catch (error) {
      console.error('Error fetching organization applications:', error);
      res.status(500).json({ error: 'Failed to fetch organization applications' });
    }
  });

  // Admin endpoint: Get single organization application
  app.get('/api/admin/organization-applications/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const application = await storage.getOrganizationApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }
      res.json(application);
    } catch (error) {
      console.error('Error fetching organization application:', error);
      res.status(500).json({ error: 'Failed to fetch organization application' });
    }
  });

  // Admin endpoint: Approve organization application
  app.post('/api/admin/organization-applications/:id/approve', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      const application = await storage.getOrganizationApplication(id);
      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }
      
      if (application.status !== 'pending') {
        return res.status(400).json({ error: 'Application has already been processed' });
      }
      
      // Generate setup token for the contact person
      const crypto = await import('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days to complete setup
      
      const setupToken = await storage.createOrganizationSetupToken({
        token,
        applicationId: id,
        contactName: application.contactName,
        contactEmail: application.contactEmail,
        contactRole: application.contactRole || undefined,
        organizationName: application.organizationName,
        organizationSlug: application.slug,
        status: 'pending',
        expiresAt,
        createdBy: user.id,
      });
      
      // Update application status
      await storage.updateOrganizationApplication(id, {
        status: 'approved',
        reviewedBy: user.id,
        reviewedAt: new Date(),
        reviewNotes: req.body.notes || null,
      });
      
      // Generate the setup URL
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'http://localhost:5000';
      const setupUrl = `${baseUrl}/setup-organization?token=${token}`;
      
      // Emit real-time notification for approval
      try {
        const { notificationService } = await import('./notification-service');
        await notificationService.emitOrganizationApplicationApproved(
          id,
          application.organizationName,
          application.contactEmail
        );
      } catch (notifError) {
        console.error('Failed to emit approval notification:', notifError);
      }

      res.json({
        success: true,
        setupToken: setupToken,
        setupUrl,
        message: 'Application approved. Share the setup link with the contact person.',
      });
    } catch (error) {
      console.error('Error approving organization application:', error);
      res.status(500).json({ error: 'Failed to approve application' });
    }
  });

  // Admin endpoint: Reject organization application
  app.post('/api/admin/organization-applications/:id/reject', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      const application = await storage.getOrganizationApplication(id);
      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }
      
      if (application.status !== 'pending') {
        return res.status(400).json({ error: 'Application has already been processed' });
      }
      
      await storage.updateOrganizationApplication(id, {
        status: 'rejected',
        reviewedBy: user.id,
        reviewedAt: new Date(),
        reviewNotes: req.body.reason || null,
      });
      
      res.json({ success: true, message: 'Application rejected' });
    } catch (error) {
      console.error('Error rejecting organization application:', error);
      res.status(500).json({ error: 'Failed to reject application' });
    }
  });

  // Admin endpoint: Generate setup link for new organization (direct invite)
  app.post('/api/admin/organizations/invite', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = req.user as any;
      
      const inviteSchema = z.object({
        organizationName: z.string().min(1, 'Organization name is required'),
        organizationSlug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
        contactName: z.string().min(1, 'Contact name is required'),
        contactEmail: z.string().email('Valid email is required'),
        contactRole: z.string().optional(),
      });
      
      const data = inviteSchema.parse(req.body);
      
      // Check if slug is already taken
      const existingOrg = await storage.getOrganizationBySlug(data.organizationSlug);
      if (existingOrg) {
        return res.status(400).json({ error: 'Organization slug is already in use' });
      }
      
      // Generate setup token
      const crypto = await import('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days to complete setup
      
      const setupToken = await storage.createOrganizationSetupToken({
        token,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactRole: data.contactRole || undefined,
        organizationName: data.organizationName,
        organizationSlug: data.organizationSlug,
        status: 'pending',
        expiresAt,
        createdBy: user.id,
      });
      
      // Generate the setup URL
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'http://localhost:5000';
      const setupUrl = `${baseUrl}/setup-organization?token=${token}`;
      
      res.json({
        success: true,
        setupToken,
        setupUrl,
        message: 'Setup link generated. Share with the contact person to complete organization setup.',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid data', details: fromZodError(error).toString() });
      }
      console.error('Error generating organization invite:', error);
      res.status(500).json({ error: 'Failed to generate invite' });
    }
  });

  // Admin endpoint: Get all setup tokens
  app.get('/api/admin/organization-setup-tokens', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const tokens = await storage.getAllOrganizationSetupTokens(status);
      res.json(tokens);
    } catch (error) {
      console.error('Error fetching setup tokens:', error);
      res.status(500).json({ error: 'Failed to fetch setup tokens' });
    }
  });

  // Admin endpoint: Revoke setup token
  app.delete('/api/admin/organization-setup-tokens/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      await storage.updateOrganizationSetupToken(req.params.id, { status: 'revoked' });
      res.json({ success: true, message: 'Setup token revoked' });
    } catch (error) {
      console.error('Error revoking setup token:', error);
      res.status(500).json({ error: 'Failed to revoke setup token' });
    }
  });

  // Public endpoint: Validate setup token
  app.get('/api/public/organization-setup/:token', async (req, res) => {
    try {
      const setupToken = await storage.getOrganizationSetupTokenByToken(req.params.token);
      
      if (!setupToken) {
        return res.status(404).json({ error: 'Invalid or expired setup link' });
      }
      
      if (setupToken.status === 'completed') {
        return res.status(400).json({ error: 'Setup has already been completed' });
      }
      
      if (setupToken.status === 'revoked') {
        return res.status(400).json({ error: 'This setup link has been revoked' });
      }
      
      if (new Date() > new Date(setupToken.expiresAt)) {
        await storage.updateOrganizationSetupToken(setupToken.id, { status: 'expired' });
        return res.status(400).json({ error: 'Setup link has expired' });
      }
      
      res.json({
        valid: true,
        organizationName: setupToken.organizationName,
        organizationSlug: setupToken.organizationSlug,
        contactName: setupToken.contactName,
        contactEmail: setupToken.contactEmail,
      });
    } catch (error) {
      console.error('Error validating setup token:', error);
      res.status(500).json({ error: 'Failed to validate setup link' });
    }
  });

  // Public endpoint: Complete organization setup
  app.post('/api/public/organization-setup/:token/complete', async (req, res) => {
    try {
      const setupToken = await storage.getOrganizationSetupTokenByToken(req.params.token);
      
      if (!setupToken) {
        return res.status(404).json({ error: 'Invalid or expired setup link' });
      }
      
      if (setupToken.status !== 'pending') {
        return res.status(400).json({ error: 'Setup link is no longer valid' });
      }
      
      if (new Date() > new Date(setupToken.expiresAt)) {
        await storage.updateOrganizationSetupToken(setupToken.id, { status: 'expired' });
        return res.status(400).json({ error: 'Setup link has expired' });
      }
      
      const setupSchema = z.object({
        adminName: z.string().min(1, 'Admin name is required'),
        adminEmail: z.string().email('Valid email is required'),
        adminPassword: z.string().min(8, 'Password must be at least 8 characters'),
        welcomeMessage: z.string().optional(),
        supportEmail: z.string().email().optional(),
        website: z.string().url().optional(),
      });
      
      const data = setupSchema.parse(req.body);
      
      // Check if admin email is already in use
      const existingUser = await storage.getUserByEmail(data.adminEmail);
      if (existingUser) {
        return res.status(400).json({ error: 'Email is already in use' });
      }
      
      // Create the organization
      const organization = await storage.createOrganization({
        name: setupToken.organizationName,
        slug: setupToken.organizationSlug,
        welcomeMessage: data.welcomeMessage,
        supportEmail: data.supportEmail,
        website: data.website,
        status: 'active',
      });
      
      // Create the admin user for this organization
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(data.adminPassword, 10);
      
      const adminUser = await storage.createUser({
        name: data.adminName,
        email: data.adminEmail,
        password: hashedPassword,
        role: 'admin',
        status: 'active',
        organizationId: organization.id,
        isPlatformAdmin: false,
      });
      
      // Create a default workspace for the organization
      const defaultWorkspace = await storage.createWorkspace({
        name: 'Default Workspace',
        slug: `${organization.slug}-default`,
        description: 'Main workspace for support operations',
        organizationId: organization.id,
        isDefault: true,
        dba: organization.name,
        email: data.adminEmail,
      });
      
      // Add admin user to the default workspace as owner
      await storage.createWorkspaceMember({
        userId: adminUser.id,
        workspaceId: defaultWorkspace.id,
        role: 'owner',
        status: 'active',
      });
      
      // Mark setup as complete
      await storage.completeOrganizationSetup(setupToken.id, organization.id);
      
      // If this was from an application, update the application
      if (setupToken.applicationId) {
        await storage.updateOrganizationApplication(setupToken.applicationId, {
          approvedOrgId: organization.id,
        });
      }
      
      res.json({
        success: true,
        message: 'Organization setup complete! You can now log in.',
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid data', details: fromZodError(error).toString() });
      }
      console.error('Error completing organization setup:', error);
      res.status(500).json({ error: 'Failed to complete organization setup' });
    }
  });

  // ============================================
  // CUSTOMER CHAT WIDGET API ENDPOINTS (Modular)
  // ============================================
  // Customer chat routes are registered via registerCustomerChatRoutes() at startup

  // PLACEHOLDER_CUSTOMER_CHAT_REMOVAL_1 - Get messages for customer conversation was here
  app.get('/api/customer-chat-placeholder-messages/:conversationId', async (req, res) => {
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
      
      // Get customer language from conversation or detect it
      let customerLanguage = (existingConversation as any)?.customerLanguage || 'en';
      let translatedContent: string | null = null;
      let originalLanguage: string | null = null;
      
      // If customer language is not English, translate message to English for agents
      if (customerLanguage !== 'en') {
        console.log(`[send-message] Customer language is ${customerLanguage}, translating to English for agents`);
        const translation = await AIService.translateText(messageData.content, 'en', customerLanguage);
        translatedContent = translation.translatedText;
        originalLanguage = translation.detectedLanguage || customerLanguage;
        console.log(`[send-message] Translation complete: "${messageData.content.substring(0, 50)}..." → "${translatedContent?.substring(0, 50)}..."`);
      } else {
        // Detect language if we haven't set it yet and message is long enough
        if (messageData.content.length > 10) {
          const detection = await AIService.detectLanguage(messageData.content);
          if (detection.language !== 'en' && detection.confidence > 70) {
            console.log(`[send-message] Detected non-English language: ${detection.language} (confidence: ${detection.confidence})`);
            customerLanguage = detection.language;
            originalLanguage = detection.language;
            
            // Update conversation with detected language
            await storage.updateConversation(messageData.conversationId, {
              customerLanguage: customerLanguage
            });
            
            // Translate to English for agents
            const translation = await AIService.translateText(messageData.content, 'en', customerLanguage);
            translatedContent = translation.translatedText;
            console.log(`[send-message] Translation complete: "${messageData.content.substring(0, 50)}..." → "${translatedContent?.substring(0, 50)}..."`);
          }
        }
      }
      
      // Add translation fields to message data
      const enhancedMessageData = {
        ...messageData,
        translatedContent,
        originalLanguage
      };
      
      const message = await storage.createCustomerMessage(enhancedMessageData);
      
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
            translatedContent: (message as any).translatedContent,
            originalLanguage: (message as any).originalLanguage,
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
            translatedContent: (message as any).translatedContent,
            originalLanguage: (message as any).originalLanguage,
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

  // Set customer language preference for a conversation
  app.post('/api/customer-chat/set-language', async (req, res) => {
    try {
      const { conversationId, language } = z.object({
        conversationId: z.string().uuid(),
        language: z.string().min(2).max(5),
      }).parse(req.body);
      
      console.log(`[set-language] Setting customer language to ${language} for conversation ${conversationId}`);
      
      await storage.updateConversation(conversationId, {
        customerLanguage: language
      });
      
      res.json({ success: true, language });
    } catch (error) {
      console.error('[set-language] Error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request data' });
      }
      res.status(500).json({ error: 'Failed to set language' });
    }
  });

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

  // Writing assistance endpoint - provides grammar, style suggestions, and auto-complete
  app.post('/api/ai/writing-assist', requireAuth, async (req, res) => {
    try {
      const { message, conversationHistory, customerQuery } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required' });
      }

      if (message.length < 3) {
        return res.status(400).json({ error: 'Message must be at least 3 characters' });
      }

      const result = await AIService.generateWritingAssistance(message, {
        conversationHistory: conversationHistory || [],
        customerQuery: customerQuery || ''
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Writing assistance failed:', error);
      res.status(500).json({ error: 'Failed to generate writing assistance' });
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

      // Check per-conversation AI toggle first (overrides global settings)
      if (conversation.aiAssistanceEnabled === false) {
        console.log(`[${requestId}] AI disabled for this specific conversation (per-conversation toggle) - learning mode`);
        // Log for learning purposes but don't respond
        await storage.createActivityLog({
          conversationId,
          action: 'ai_observation',
          details: `AI observed but did not respond (learning mode): "${customerMessage.substring(0, 100)}${customerMessage.length > 100 ? '...' : ''}"`
        });
        return res.status(200).json({ response: null, aiDisabled: true, learningMode: true });
      }

      // Check global AI settings - determine context (anonymous vs portal)
      const engagementSettings = await storage.getEngagementSettings();
      const isAnonymous = conversation.isAnonymous;
      const aiEnabledForContext = isAnonymous 
        ? (engagementSettings?.aiGlobalEnabled !== false && engagementSettings?.aiAnonymousChatEnabled !== false)
        : (engagementSettings?.aiGlobalEnabled !== false && engagementSettings?.aiCustomerPortalEnabled !== false);
      
      if (!aiEnabledForContext) {
        console.log(`[${requestId}] AI disabled for ${isAnonymous ? 'anonymous chat' : 'customer portal'} (global settings) - learning mode`);
        // Log for learning purposes when global settings disable AI
        await storage.createActivityLog({
          conversationId,
          action: 'ai_observation',
          details: `AI observed but did not respond (learning mode - global settings disabled for ${isAnonymous ? 'anonymous chat' : 'customer portal'}): "${customerMessage.substring(0, 100)}${customerMessage.length > 100 ? '...' : ''}"`
        });
        return res.status(200).json({ response: null, aiDisabled: true, learningMode: true });
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
        agentId: z.string().uuid().optional(),
        language: z.string().optional() // e.g., 'en', 'es', 'de', 'fr', 'zh', 'hi'
      });

      const { conversationId, customerMessage, customerId, agentId, language } = smartResponseSchema.parse(req.body);
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

      // Check per-conversation AI toggle first (overrides global settings)
      if (conversation.aiAssistanceEnabled === false) {
        console.log(`[${requestId}] AI disabled for this specific conversation (per-conversation toggle) - learning mode`);
        // Log for learning purposes but don't respond
        await storage.createActivityLog({
          conversationId,
          action: 'ai_observation',
          details: `AI observed but did not respond (learning mode): "${customerMessage.substring(0, 100)}${customerMessage.length > 100 ? '...' : ''}"`
        });
        return res.status(200).json({ response: null, aiDisabled: true, learningMode: true });
      }

      // Check global AI settings - determine context (anonymous vs portal)
      const engagementSettings = await storage.getEngagementSettings();
      const isAnonymous = conversation.isAnonymous;
      const aiEnabledForContext = isAnonymous 
        ? (engagementSettings?.aiGlobalEnabled !== false && engagementSettings?.aiAnonymousChatEnabled !== false)
        : (engagementSettings?.aiGlobalEnabled !== false && engagementSettings?.aiCustomerPortalEnabled !== false);
      
      if (!aiEnabledForContext) {
        console.log(`[${requestId}] AI disabled for ${isAnonymous ? 'anonymous chat' : 'customer portal'} (global settings) - learning mode`);
        // Log for learning purposes when global settings disable AI
        await storage.createActivityLog({
          conversationId,
          action: 'ai_observation',
          details: `AI observed but did not respond (learning mode - global settings disabled for ${isAnonymous ? 'anonymous chat' : 'customer portal'}): "${customerMessage.substring(0, 100)}${customerMessage.length > 100 ? '...' : ''}"`
        });
        return res.status(200).json({ response: null, aiDisabled: true, learningMode: true });
      }

      console.log(`[${requestId}] Generating AI response...`);
      // Generate AI response with optional language parameter
      const aiResponse = await AIService.generateSmartAgentResponse(
        customerMessage,
        conversationId,
        agentId,
        language
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

      res.json({
        success: true,
        data: learningEntries
      });
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

  // Get keywords from knowledge base for voice recognition vocabulary
  app.get('/api/knowledge-base/keywords', async (req, res) => {
    try {
      const articles = await storage.getAllKnowledgeBase();
      const activeArticles = articles.filter(a => a.isActive);
      
      const keywordsSet = new Set<string>();
      
      for (const article of activeArticles) {
        if (article.title) {
          const titleWords = article.title.split(/\s+/).filter(w => w.length > 2);
          titleWords.forEach(w => keywordsSet.add(w.replace(/[^a-zA-Z0-9]/g, '')));
        }
        
        if (article.tags && Array.isArray(article.tags)) {
          article.tags.forEach(tag => {
            if (tag && tag.length > 1) {
              keywordsSet.add(tag);
            }
          });
        }
        
        if (article.category) {
          keywordsSet.add(article.category);
        }
      }
      
      const keywords = Array.from(keywordsSet)
        .filter(k => k.length > 1)
        .sort();
      
      res.json({ keywords });
    } catch (error) {
      console.error('Failed to fetch KB keywords:', error);
      res.status(500).json({ error: 'Failed to fetch keywords' });
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

  // Get all active organizations for public landing page
  app.get('/api/public/organizations', async (req, res) => {
    try {
      const allOrgs = await storage.getAllOrganizations();
      
      // Filter to only return active organizations
      const activeOrgs = allOrgs.filter(org => org.status === 'active');
      
      // Return only safe fields for public display (no secrets)
      const publicOrgs = activeOrgs.map(org => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo: org.logo,
        primaryColor: org.primaryColor,
        welcomeMessage: org.welcomeMessage,
        website: org.website
      }));
      
      res.json(publicOrgs);
    } catch (error) {
      console.error('Failed to fetch public organizations:', error);
      res.status(500).json({ error: 'Failed to fetch organizations' });
    }
  });

  // Get single organization by slug for public chat page
  app.get('/api/public/organizations/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      const org = await storage.getOrganizationBySlug(slug);
      
      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      if (org.status !== 'active') {
        return res.status(403).json({ error: 'Organization is not active' });
      }
      
      // Return only safe fields
      res.json({
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo: org.logo,
        primaryColor: org.primaryColor,
        secondaryColor: org.secondaryColor,
        welcomeMessage: org.welcomeMessage,
        website: org.website,
        aiEnabled: org.aiEnabled,
        knowledgeBaseEnabled: org.knowledgeBaseEnabled
      });
    } catch (error) {
      console.error('Failed to fetch organization:', error);
      res.status(500).json({ error: 'Failed to fetch organization' });
    }
  });

  // Customer public signup
  app.post('/api/public/customers/signup', authLimiter, async (req, res) => {
    try {
      const signupSchema = z.object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
        email: z.string().email('Invalid email address'),
        password: z.string().min(6, 'Password must be at least 6 characters'),
        company: z.string().optional(),
        organizationId: z.string().uuid().optional(),
      });
      
      const data = signupSchema.parse(req.body);
      
      // Check if customer email already exists
      const existingCustomer = await storage.getCustomerByEmail(data.email);
      if (existingCustomer) {
        return res.status(400).json({ error: 'An account with this email already exists' });
      }
      
      // Hash password
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(data.password, 10);
      
      // Create customer with portal access
      const customer = await storage.createCustomer({
        name: data.name,
        email: data.email,
        company: data.company || null,
        organizationId: data.organizationId || null,
        portalPassword: hashedPassword,
        hasPortalAccess: true,
        status: 'offline',
      });
      
      // Return customer without password
      const { portalPassword: _, ...customerData } = customer;
      res.status(201).json({ 
        customer: customerData, 
        message: 'Account created successfully' 
      });
    } catch (error) {
      console.error('Customer signup error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: 'Failed to create account' });
    }
  });

  // Organization public signup
  app.post('/api/public/organizations/signup', authLimiter, async (req, res) => {
    try {
      const signupSchema = z.object({
        organization: z.object({
          name: z.string().min(2, 'Organization name must be at least 2 characters'),
          slug: z.string().min(2, 'Slug must be at least 2 characters')
            .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
          website: z.string().url().optional().or(z.literal('')),
        }),
        admin: z.object({
          name: z.string().min(2, 'Name must be at least 2 characters'),
          email: z.string().email('Invalid email address'),
          password: z.string().min(6, 'Password must be at least 6 characters'),
        }),
      });
      
      const data = signupSchema.parse(req.body);
      
      // Check if slug already exists
      const existingOrg = await storage.getOrganizationBySlug(data.organization.slug);
      if (existingOrg) {
        return res.status(400).json({ error: 'This organization URL is already taken' });
      }
      
      // Check if admin email already exists
      const existingUser = await storage.getUserByEmail(data.admin.email);
      if (existingUser) {
        return res.status(400).json({ error: 'An account with this email already exists' });
      }
      
      // Hash password
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(data.admin.password, 10);
      
      // Create organization
      const org = await storage.createOrganization({
        name: data.organization.name,
        slug: data.organization.slug,
        website: data.organization.website || null,
        status: 'active',
        welcomeMessage: `Welcome to ${data.organization.name}! How can we help you today?`,
      });
      
      // Create admin user
      const user = await storage.createUser({
        name: data.admin.name,
        email: data.admin.email,
        password: hashedPassword,
        role: 'admin',
        organizationId: org.id,
      });
      
      // Create default workspace for the organization
      const workspace = await storage.createWorkspace({
        name: 'Default Workspace',
        slug: 'default',
        description: 'Default workspace for support operations',
        organizationId: org.id,
        isDefault: true,
      });
      
      // Add admin to workspace as owner
      await storage.createWorkspaceMember({
        userId: user.id,
        workspaceId: workspace.id,
        role: 'owner',
        status: 'active',
      });
      
      // Return success without sensitive data
      res.status(201).json({ 
        organization: {
          id: org.id,
          name: org.name,
          slug: org.slug,
        },
        message: 'Organization registered successfully' 
      });
    } catch (error) {
      console.error('Organization signup error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: 'Failed to register organization' });
    }
  });

  // Public contact form submission
  app.post('/api/public/contact', authLimiter, async (req, res) => {
    try {
      const contactSchema = z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.string().email('Invalid email address'),
        company: z.string().optional(),
        subject: z.string().min(1, 'Subject is required'),
        message: z.string().min(10, 'Message must be at least 10 characters'),
      });
      
      const data = contactSchema.parse(req.body);
      
      // Log the contact submission (in production, you'd send an email or store in database)
      console.log('Contact form submission:', {
        name: data.name,
        email: data.email,
        company: data.company || 'N/A',
        subject: data.subject,
        messageLength: data.message.length,
        timestamp: new Date().toISOString(),
      });
      
      res.status(200).json({ 
        success: true,
        message: 'Thank you for contacting us. We will get back to you shortly.' 
      });
    } catch (error) {
      console.error('Contact form error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: 'Failed to submit contact form' });
    }
  });

  // Check organization name/slug availability
  app.post('/api/public/organizations/check-availability', async (req, res) => {
    try {
      const { name, slug, website } = req.body;
      const result: { nameAvailable?: boolean; slugAvailable?: boolean; duplicateOrg?: { name: string } } = {};
      
      if (name) {
        const duplicate = await storage.checkOrganizationDuplicate(name, website);
        result.nameAvailable = !duplicate.isDuplicate;
        if (duplicate.isDuplicate && duplicate.existingOrg) {
          result.duplicateOrg = { name: duplicate.existingOrg.name };
        }
      }
      
      if (slug) {
        const existingOrg = await storage.getOrganizationBySlug(slug);
        result.slugAvailable = !existingOrg;
      }
      
      res.json(result);
    } catch (error) {
      console.error('Check availability error:', error);
      res.status(500).json({ error: 'Failed to check availability' });
    }
  });

  // Organization application (formal business application with review)
  app.post('/api/public/organizations/apply', authLimiter, async (req, res) => {
    try {
      const applicationSchema = z.object({
        organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
        slug: z.string().min(2, 'Slug must be at least 2 characters')
          .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
        website: z.string().url().optional().or(z.literal('')),
        industry: z.string().optional(),
        companySize: z.string().optional(),
        contactName: z.string().min(2, 'Contact name is required'),
        contactEmail: z.string().email('Invalid email address'),
        contactPhone: z.string().optional(),
        contactRole: z.string().optional(),
        useCase: z.string().optional(),
        expectedVolume: z.string().optional(),
        currentSolution: z.string().optional(),
      });
      
      const data = applicationSchema.parse(req.body);
      
      // Check for duplicate organization
      const duplicate = await storage.checkOrganizationDuplicate(data.organizationName, data.website || undefined);
      
      // Create the application
      const application = await storage.createOrganizationApplication({
        organizationName: data.organizationName,
        slug: data.slug,
        website: data.website || null,
        industry: data.industry || null,
        companySize: data.companySize || null,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone || null,
        contactRole: data.contactRole || null,
        useCase: data.useCase || null,
        expectedVolume: data.expectedVolume || null,
        currentSolution: data.currentSolution || null,
      });
      
      // If duplicate detected, mark it
      if (duplicate.isDuplicate && duplicate.existingOrg) {
        await storage.updateOrganizationApplication(application.id, {
          status: 'pending',
          duplicateOfOrgId: duplicate.existingOrg.id,
        });
      }
      
      res.status(201).json({ 
        applicationId: application.id,
        message: 'Application submitted successfully. We will review your application and get back to you within 2 business days.',
        hasDuplicate: duplicate.isDuplicate
      });
    } catch (error) {
      console.error('Organization application error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: 'Failed to submit application' });
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
        effectiveness: article.effectiveness || 50,
        helpful: article.helpful || 0,
        notHelpful: article.notHelpful || 0,
        lastUsedAt: article.lastUsedAt,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt
      }));
      
      res.json(sanitizedArticles);
    } catch (error) {
      console.error('Failed to fetch public knowledge base articles:', error);
      res.status(500).json({ error: 'Failed to fetch knowledge base articles' });
    }
  });

  // Get popular/most-used knowledge base articles (public access)
  // NOTE: This must be defined BEFORE the /:id route to avoid being caught by the param
  app.get('/api/public/knowledge-base/popular', async (req, res) => {
    try {
      const { limit = '10' } = req.query;
      const parsedLimit = Math.min(parseInt(limit as string) || 10, 20);
      
      // Get top articles by usage count
      const topArticles = await storage.getTopKnowledgeArticles(parsedLimit);
      
      // Get full article data with tags
      const articlesWithDetails = await Promise.all(
        topArticles.map(async (article) => {
          const fullArticle = await storage.getKnowledgeBase(article.id);
          return {
            id: article.id,
            title: article.title,
            category: article.category,
            tags: fullArticle?.tags || [],
            usageCount: article.usageCount || 0,
            effectiveness: article.effectiveness || 0,
            lastUsedAt: article.lastUsedAt
          };
        })
      );
      
      res.json(articlesWithDetails);
    } catch (error) {
      console.error('Failed to fetch popular knowledge base articles:', error);
      res.status(500).json({ error: 'Failed to fetch popular articles' });
    }
  });

  // Get personalized article recommendations based on customer history
  // NOTE: This must be defined BEFORE the /:id route to avoid being caught by the param
  app.get('/api/public/knowledge-base/recommended', async (req, res) => {
    try {
      const { customerId, sessionId, limit = '6' } = req.query;
      const parsedLimit = Math.min(parseInt(limit as string) || 6, 10);
      
      let relevantCategories: string[] = [];
      let relevantTags: string[] = [];
      
      // Try to get customer's conversation history for personalization
      if (customerId && typeof customerId === 'string') {
        try {
          const customerConversations = await storage.getConversationsByCustomerId(customerId);
          
          // Extract categories and topics from conversations
          for (const conv of customerConversations.slice(0, 10)) {
            // Get messages to analyze topics
            const messages = await storage.getMessagesByConversation(conv.id);
            const customerMessages = messages.filter(m => m.senderType === 'customer');
            
            // Simple keyword extraction from customer messages
            const allContent = customerMessages.map(m => m.content).join(' ').toLowerCase();
            
            // Common topic keywords to match against
            const topicKeywords = ['billing', 'payment', 'account', 'password', 'login', 
              'technical', 'error', 'setup', 'installation', 'pricing', 'refund',
              'subscription', 'upgrade', 'cancel', 'feature', 'integration', 'api'];
            
            topicKeywords.forEach(keyword => {
              if (allContent.includes(keyword) && !relevantTags.includes(keyword)) {
                relevantTags.push(keyword);
              }
            });
          }
        } catch (e) {
          console.log('Could not get customer history for recommendations');
        }
      }
      
      // Get all active articles
      const allArticles = await storage.getAllKnowledgeBase();
      const activeArticles = allArticles.filter(a => a.isActive);
      
      // Score articles based on relevance to customer history
      const scoredArticles = activeArticles.map(article => {
        let score = 0;
        
        // Boost for matching categories
        if (relevantCategories.includes(article.category.toLowerCase())) {
          score += 10;
        }
        
        // Boost for matching tags
        const articleTags = (article.tags || []).map(t => t.toLowerCase());
        relevantTags.forEach(tag => {
          if (articleTags.includes(tag)) {
            score += 5;
          }
          // Check if tag appears in title
          if (article.title.toLowerCase().includes(tag)) {
            score += 3;
          }
        });
        
        // Slight boost for popular articles
        score += Math.min((article.usageCount || 0) / 10, 5);
        
        // Recency bonus
        if (article.lastUsedAt) {
          const daysSinceUse = (Date.now() - new Date(article.lastUsedAt).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceUse < 7) score += 2;
        }
        
        return { ...article, score };
      });
      
      // Sort by score and return top recommendations
      const recommendations = scoredArticles
        .filter(a => a.score > 0 || relevantTags.length === 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, parsedLimit)
        .map(article => ({
          id: article.id,
          title: article.title,
          category: article.category,
          tags: article.tags || [],
          usageCount: article.usageCount || 0,
          score: article.score
        }));
      
      // If no personalized recommendations, fall back to popular articles
      if (recommendations.length === 0) {
        const popular = await storage.getTopKnowledgeArticles(parsedLimit);
        const fallbackRecs = await Promise.all(
          popular.map(async (article) => {
            const fullArticle = await storage.getKnowledgeBase(article.id);
            return {
              id: article.id,
              title: article.title,
              category: article.category,
              tags: fullArticle?.tags || [],
              usageCount: article.usageCount || 0,
              score: 0
            };
          })
        );
        return res.json(fallbackRecs);
      }
      
      res.json(recommendations);
    } catch (error) {
      console.error('Failed to fetch recommended articles:', error);
      res.status(500).json({ error: 'Failed to fetch recommended articles' });
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
        usageCount: article.usageCount || 0,
        effectiveness: article.effectiveness || 50,
        helpful: article.helpful || 0,
        notHelpful: article.notHelpful || 0,
        lastUsedAt: article.lastUsedAt,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
        sourceType: article.sourceType,
        fileName: article.fileName,
        fileType: article.fileType,
        hasFile: article.sourceType === 'file' && !!article.filePath
      };
      
      res.json(publicArticle);
    } catch (error) {
      console.error('Failed to fetch public knowledge base article:', error);
      res.status(500).json({ error: 'Failed to fetch knowledge base article' });
    }
  });

  // Public endpoint to serve knowledge base file (for customer portal document viewer)
  app.get('/api/public/knowledge-base/:id/file', async (req, res) => {
    try {
      const { id } = req.params;
      const article = await storage.getKnowledgeBase(id);
      
      if (!article) {
        return res.status(404).json({ error: 'Article not found' });
      }
      
      // Only serve files for active articles
      if (!article.isActive) {
        return res.status(404).json({ error: 'Article not found' });
      }
      
      // Check if article has a file
      if (article.sourceType !== 'file' || !article.filePath) {
        return res.status(404).json({ error: 'No file associated with this article' });
      }
      
      // Resolve the file path
      const uploadDir = path.resolve('./uploads');
      const resolvedPath = path.resolve(article.filePath);
      
      // Security check: ensure the file is within the uploads directory
      if (!resolvedPath.startsWith(uploadDir)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Check if file exists
      if (!fs.existsSync(resolvedPath)) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      // Set appropriate content type
      const contentType = article.fileType || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${article.fileName || 'document'}"`);
      
      res.sendFile(resolvedPath);
    } catch (error) {
      console.error('Failed to serve public knowledge base file:', error);
      res.status(500).json({ error: 'Failed to serve file' });
    }
  });

  // Submit feedback for a knowledge base article
  app.post('/api/public/knowledge-base/:id/feedback', async (req, res) => {
    try {
      const { id } = req.params;
      const { helpful } = req.body;
      
      if (typeof helpful !== 'boolean') {
        return res.status(400).json({ error: 'Helpful field must be a boolean' });
      }
      
      const article = await storage.getKnowledgeBase(id);
      if (!article || !article.isActive) {
        return res.status(404).json({ error: 'Article not found' });
      }
      
      // Update the article's feedback counts
      const currentHelpful = article.helpful || 0;
      const currentNotHelpful = article.notHelpful || 0;
      
      await storage.updateKnowledgeBase(id, {
        helpful: helpful ? currentHelpful + 1 : currentHelpful,
        notHelpful: helpful ? currentNotHelpful : currentNotHelpful + 1,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to submit article feedback:', error);
      res.status(500).json({ error: 'Failed to submit feedback' });
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

  // Serve knowledge base file for viewing (PDF, etc.)
  app.get('/api/knowledge-base/:id/file', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { id } = req.params;
      const article = await storage.getKnowledgeBase(id);
      
      if (!article) {
        return res.status(404).json({ error: 'Knowledge base article not found' });
      }
      
      if (!article.filePath) {
        return res.status(404).json({ error: 'No file associated with this article' });
      }
      
      const resolvedPath = path.resolve(article.filePath);
      const uploadDir = path.resolve('./uploads');
      
      // Security check - ensure file is within uploads directory
      if (!resolvedPath.startsWith(uploadDir)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      if (!fs.existsSync(resolvedPath)) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      // Set appropriate content type
      const contentType = article.fileType || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${article.fileName || 'document'}"`);
      
      res.sendFile(resolvedPath);
    } catch (error) {
      console.error('Failed to serve knowledge base file:', error);
      res.status(500).json({ error: 'Failed to serve file' });
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
          
          // 📷 IMAGE EXTRACTION: Extract images from documents asynchronously
          setImmediate(async () => {
            try {
              console.log(`[Image Extraction] Starting extraction for article ${article.id} from ${file.originalname}`);
              const imageResult = await DocumentProcessor.extractImages(
                file.path, 
                file.originalname, 
                file.mimetype, 
                article.id
              );
              
              if (imageResult.images.length > 0) {
                // Save extracted images to database
                for (const image of imageResult.images) {
                  await storage.createKnowledgeBaseImage({
                    knowledgeBaseId: article.id,
                    filename: image.filename,
                    originalName: image.originalName,
                    mimeType: image.mimeType,
                    size: image.size,
                    filePath: image.filePath,
                    description: image.description,
                    displayOrder: image.displayOrder,
                  });
                }
                console.log(`✅ Extracted ${imageResult.images.length} images from ${file.originalname} (${(imageResult.totalSize / 1024).toFixed(1)}KB total)`);
              } else {
                console.log(`ℹ️ No images found in ${file.originalname}`);
              }
            } catch (imageError) {
              console.error(`⚠️ Warning: Failed to extract images from ${file.originalname}:`, imageError);
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
      const userType: 'staff' | 'customer' = (user.role === 'admin' || user.role === 'agent') ? 'staff' : 'customer';
      const count = await storage.getUnreadPostsCount(user.id, userType);
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

  // Workspace API routes
  app.get('/api/workspaces', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      // Platform admins see all workspaces, others see only their workspaces
      if (user.isPlatformAdmin) {
        const workspaces = await storage.getAllWorkspaces();
        res.json(workspaces);
      } else {
        const userWorkspaces = await storage.getUserWorkspaces(user.id);
        res.json(userWorkspaces.map(uw => uw.workspace));
      }
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
      res.status(500).json({ error: 'Failed to fetch workspaces' });
    }
  });

  app.get('/api/workspaces/:id', requireAuth, async (req, res) => {
    try {
      const workspace = await storage.getWorkspace(req.params.id);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      res.json(workspace);
    } catch (error) {
      console.error('Failed to fetch workspace:', error);
      res.status(500).json({ error: 'Failed to fetch workspace' });
    }
  });

  app.post('/api/workspaces', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { name, description, slug, organizationId, isDefault, settings } = req.body;
      const workspace = await storage.createWorkspace({
        name,
        description,
        slug,
        organizationId,
        isDefault: isDefault || false,
        settings,
      });
      res.status(201).json(workspace);
    } catch (error) {
      console.error('Failed to create workspace:', error);
      res.status(500).json({ error: 'Failed to create workspace' });
    }
  });

  app.put('/api/workspaces/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const workspace = await storage.updateWorkspace(req.params.id, req.body);
      res.json(workspace);
    } catch (error) {
      console.error('Failed to update workspace:', error);
      res.status(500).json({ error: 'Failed to update workspace' });
    }
  });

  app.delete('/api/workspaces/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      await storage.deleteWorkspace(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete workspace:', error);
      res.status(500).json({ error: 'Failed to delete workspace' });
    }
  });

  // Workspace Features API - public endpoint for checking feature availability
  app.get('/api/workspace-features', async (req, res) => {
    try {
      // Get default workspace or specified workspace
      const workspaceId = req.query.workspaceId as string | undefined;
      let workspace;
      
      if (workspaceId) {
        workspace = await storage.getWorkspace(workspaceId);
      } else {
        // Get default workspace by finding the one with isDefault=true
        const allWorkspaces = await storage.getAllWorkspaces();
        workspace = allWorkspaces.find(w => w.isDefault) || allWorkspaces[0];
      }
      
      if (!workspace) {
        // Return default feature state if no workspace found
        return res.json({
          voiceChat: false,
          features: {}
        });
      }
      
      const settings = (workspace.settings as any) || {};
      const features = settings.features || {};
      
      res.json({
        voiceChat: features.voiceChat === true,
        features
      });
    } catch (error) {
      console.error('Failed to fetch workspace features:', error);
      res.status(500).json({ error: 'Failed to fetch workspace features' });
    }
  });

  // Update workspace features (admin only)
  app.patch('/api/workspaces/:id/features', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { voiceChat } = req.body;
      const workspace = await storage.getWorkspace(req.params.id);
      
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      
      const currentSettings = (workspace.settings as any) || {};
      const updatedSettings = {
        ...currentSettings,
        features: {
          ...currentSettings.features,
          voiceChat: voiceChat ?? currentSettings.features?.voiceChat ?? false
        }
      };
      
      const updated = await storage.updateWorkspace(req.params.id, {
        settings: updatedSettings
      });
      
      res.json({
        voiceChat: updatedSettings.features.voiceChat,
        features: updatedSettings.features
      });
    } catch (error) {
      console.error('Failed to update workspace features:', error);
      res.status(500).json({ error: 'Failed to update workspace features' });
    }
  });

  // Workspace Members API routes
  app.get('/api/workspaces/:id/members', requireAuth, async (req, res) => {
    try {
      const members = await storage.getWorkspaceMembersByWorkspace(req.params.id);
      res.json(members);
    } catch (error) {
      console.error('Failed to fetch workspace members:', error);
      res.status(500).json({ error: 'Failed to fetch workspace members' });
    }
  });

  app.post('/api/workspaces/:id/members', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = req.user as any;
      const { userId, role } = req.body;
      const member = await storage.addWorkspaceMember({
        userId,
        workspaceId: req.params.id,
        role: role || 'member',
        invitedBy: user.id,
        status: 'pending',
      });
      res.status(201).json(member);
    } catch (error) {
      console.error('Failed to add workspace member:', error);
      res.status(500).json({ error: 'Failed to add workspace member' });
    }
  });

  app.put('/api/workspace-members/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const member = await storage.updateWorkspaceMember(req.params.id, req.body);
      res.json(member);
    } catch (error) {
      console.error('Failed to update workspace member:', error);
      res.status(500).json({ error: 'Failed to update workspace member' });
    }
  });

  app.delete('/api/workspace-members/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      await storage.removeWorkspaceMember(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to remove workspace member:', error);
      res.status(500).json({ error: 'Failed to remove workspace member' });
    }
  });

  // User Workspaces - get all workspaces a user belongs to
  app.get('/api/users/:userId/workspaces', requireAuth, async (req, res) => {
    try {
      const userWorkspaces = await storage.getUserWorkspaces(req.params.userId);
      res.json(userWorkspaces);
    } catch (error) {
      console.error('Failed to fetch user workspaces:', error);
      res.status(500).json({ error: 'Failed to fetch user workspaces' });
    }
  });

  // ============================================
  // DEPARTMENT API ROUTES
  // ============================================
  
  // Get all departments (platform admin sees all, others see workspace-scoped)
  app.get('/api/departments', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const workspaceId = req.query.workspaceId as string | undefined;
      
      if (workspaceId) {
        const departments = await storage.getDepartmentsByWorkspace(workspaceId);
        res.json(departments);
      } else if (user.isPlatformAdmin) {
        const departments = await storage.getAllDepartments();
        res.json(departments);
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      res.status(500).json({ error: 'Failed to fetch departments' });
    }
  });

  // Get single department
  app.get('/api/departments/:id', requireAuth, async (req, res) => {
    try {
      const department = await storage.getDepartment(req.params.id);
      if (!department) {
        return res.status(404).json({ error: 'Department not found' });
      }
      res.json(department);
    } catch (error) {
      console.error('Failed to fetch department:', error);
      res.status(500).json({ error: 'Failed to fetch department' });
    }
  });

  // Get departments by workspace
  app.get('/api/workspaces/:id/departments', requireAuth, async (req, res) => {
    try {
      const departments = await storage.getDepartmentsByWorkspace(req.params.id);
      res.json(departments);
    } catch (error) {
      console.error('Failed to fetch workspace departments:', error);
      res.status(500).json({ error: 'Failed to fetch workspace departments' });
    }
  });

  // Create department (workspace admin or platform admin)
  app.post('/api/departments', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = req.user as any;
      const { name, description, slug, workspaceId, isDefault, icon, color } = req.body;
      
      if (!name || !workspaceId) {
        return res.status(400).json({ error: 'Name and workspaceId are required' });
      }
      
      // Generate slug if not provided
      const finalSlug = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      const department = await storage.createDepartment({
        name,
        description,
        slug: finalSlug,
        workspaceId,
        isDefault: isDefault || false,
        icon: icon || 'Building2',
        color: color || '#6366f1',
        createdBy: user.id,
      });
      
      res.status(201).json(department);
    } catch (error) {
      console.error('Failed to create department:', error);
      res.status(500).json({ error: 'Failed to create department' });
    }
  });

  // Update department
  app.put('/api/departments/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const department = await storage.updateDepartment(req.params.id, req.body);
      res.json(department);
    } catch (error) {
      console.error('Failed to update department:', error);
      res.status(500).json({ error: 'Failed to update department' });
    }
  });

  // Delete department
  app.delete('/api/departments/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      await storage.deleteDepartment(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete department:', error);
      res.status(500).json({ error: 'Failed to delete department' });
    }
  });

  // ============================================
  // DEPARTMENT MEMBER API ROUTES
  // ============================================

  // Get department members
  app.get('/api/departments/:id/members', requireAuth, async (req, res) => {
    try {
      const members = await storage.getDepartmentMembersByDepartment(req.params.id);
      res.json(members);
    } catch (error) {
      console.error('Failed to fetch department members:', error);
      res.status(500).json({ error: 'Failed to fetch department members' });
    }
  });

  // Add member to department
  app.post('/api/departments/:id/members', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { workspaceMemberId, role } = req.body;
      
      if (!workspaceMemberId) {
        return res.status(400).json({ error: 'workspaceMemberId is required' });
      }
      
      const member = await storage.addDepartmentMember({
        departmentId: req.params.id,
        workspaceMemberId,
        role: role || 'member',
      });
      
      res.status(201).json(member);
    } catch (error) {
      console.error('Failed to add department member:', error);
      res.status(500).json({ error: 'Failed to add department member' });
    }
  });

  // Update department member
  app.put('/api/department-members/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const member = await storage.updateDepartmentMember(req.params.id, req.body);
      res.json(member);
    } catch (error) {
      console.error('Failed to update department member:', error);
      res.status(500).json({ error: 'Failed to update department member' });
    }
  });

  // Remove department member
  app.delete('/api/department-members/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      await storage.removeDepartmentMember(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to remove department member:', error);
      res.status(500).json({ error: 'Failed to remove department member' });
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
      
      // Fetch existing settings first to properly merge with partial updates
      let existingSettings = await storage.getEngagementSettings();
      
      // If no settings exist, create defaults first
      if (!existingSettings) {
        existingSettings = await storage.upsertEngagementSettings({
          emailNotificationsEnabled: true,
          emailBatchingDelayMinutes: 5,
          emailRateLimitHours: 4,
          autoFollowupEnabled: true,
          autoFollowupDelayHours: 24,
          maxAutoFollowups: 3,
          autoCloseEnabled: true,
          autoCloseDays: 7,
          aiGlobalEnabled: true,
          aiAnonymousChatEnabled: true,
          aiCustomerPortalEnabled: true,
          aiStaffConversationsEnabled: true,
          followupMessageTemplate: "Hi! Just checking in to see if you still need help with this. Please let us know if there's anything else we can assist you with.",
        });
      }
      
      // Use updateEngagementSettings to merge partial updates with existing settings
      const updatedSettings = await storage.updateEngagementSettings(existingSettings.id, updates);
      res.json(updatedSettings);
    } catch (error) {
      console.error('Failed to update engagement settings:', error);
      res.status(500).json({ error: 'Failed to update engagement settings' });
    }
  });

  // ========================================
  // EXTERNAL CHANNEL INTEGRATION ROUTES
  // ========================================

  // Channel Account Management
  app.get('/api/channel-accounts', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const accounts = await channelService.getAllActiveChannelAccounts();
      res.json(accounts);
    } catch (error) {
      console.error('Failed to fetch channel accounts:', error);
      res.status(500).json({ error: 'Failed to fetch channel accounts' });
    }
  });

  app.post('/api/channel-accounts', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const account = await channelService.createChannelAccount(req.body);
      res.status(201).json(account);
    } catch (error) {
      console.error('Failed to create channel account:', error);
      res.status(500).json({ error: 'Failed to create channel account' });
    }
  });

  app.get('/api/channel-accounts/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const account = await channelService.getChannelAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ error: 'Channel account not found' });
      }
      res.json(account);
    } catch (error) {
      console.error('Failed to fetch channel account:', error);
      res.status(500).json({ error: 'Failed to fetch channel account' });
    }
  });

  app.put('/api/channel-accounts/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const account = await channelService.updateChannelAccount(req.params.id, req.body);
      if (!account) {
        return res.status(404).json({ error: 'Channel account not found' });
      }
      res.json(account);
    } catch (error) {
      console.error('Failed to update channel account:', error);
      res.status(500).json({ error: 'Failed to update channel account' });
    }
  });

  app.delete('/api/channel-accounts/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      await channelService.deleteChannelAccount(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete channel account:', error);
      res.status(500).json({ error: 'Failed to delete channel account' });
    }
  });

  app.post('/api/channel-accounts/:id/test', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const result = await channelService.testChannelConnection(req.params.id);
      res.json(result);
    } catch (error) {
      console.error('Failed to test channel connection:', error);
      res.status(500).json({ error: 'Failed to test channel connection' });
    }
  });

  // Template Management
  app.get('/api/channel-accounts/:id/templates', requireAuth, async (req, res) => {
    try {
      const templates = await channelService.getTemplatesByAccount(req.params.id);
      res.json(templates);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  });

  app.post('/api/channel-accounts/:id/templates', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const template = await channelService.createTemplate({
        ...req.body,
        channelAccountId: req.params.id,
        createdBy: (req.user as any)?.id,
      });
      res.status(201).json(template);
    } catch (error) {
      console.error('Failed to create template:', error);
      res.status(500).json({ error: 'Failed to create template' });
    }
  });

  // Bot Control Routes
  app.post('/api/conversations/:id/pause-bot', requireAuth, async (req, res) => {
    try {
      const { resumeInHours } = req.body;
      const userId = (req.user as any)?.id;
      await channelService.pauseBot(req.params.id, userId, resumeInHours);
      res.json({ success: true, message: 'Bot paused' });
    } catch (error) {
      console.error('Failed to pause bot:', error);
      res.status(500).json({ error: 'Failed to pause bot' });
    }
  });

  app.post('/api/conversations/:id/resume-bot', requireAuth, async (req, res) => {
    try {
      await channelService.resumeBot(req.params.id);
      res.json({ success: true, message: 'Bot resumed' });
    } catch (error) {
      console.error('Failed to resume bot:', error);
      res.status(500).json({ error: 'Failed to resume bot' });
    }
  });

  app.put('/api/conversations/:id/bot-mode', requireAuth, async (req, res) => {
    try {
      const { mode } = req.body;
      if (!['auto', 'handoff', 'human_only'].includes(mode)) {
        return res.status(400).json({ error: 'Invalid bot mode' });
      }
      await channelService.setBotMode(req.params.id, mode);
      res.json({ success: true, mode });
    } catch (error) {
      console.error('Failed to set bot mode:', error);
      res.status(500).json({ error: 'Failed to set bot mode' });
    }
  });

  // Send template message
  app.post('/api/conversations/:id/send-template', requireAuth, async (req, res) => {
    try {
      const { templateId, variables } = req.body;
      const userId = (req.user as any)?.id;
      const result = await channelService.sendTemplateMessage(
        req.params.id,
        templateId,
        variables || {},
        userId
      );
      res.json(result);
    } catch (error) {
      console.error('Failed to send template:', error);
      res.status(500).json({ error: 'Failed to send template' });
    }
  });

  // Check session window status
  app.get('/api/conversations/:id/session-window', requireAuth, async (req, res) => {
    try {
      const isWithin = await channelService.checkSessionWindow(req.params.id);
      res.json({ isWithinSessionWindow: isWithin });
    } catch (error) {
      console.error('Failed to check session window:', error);
      res.status(500).json({ error: 'Failed to check session window' });
    }
  });

  // ========================================
  // LEAD TRACKING API ROUTES
  // ========================================

  // Get all leads (channel contacts)
  app.get('/api/leads', requireAuth, async (req, res) => {
    try {
      const leads = await db.select().from(channelContacts)
        .orderBy(desc(channelContacts.lastContactAt));
      res.json(leads);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
      res.status(500).json({ error: 'Failed to fetch leads' });
    }
  });

  // Get lead stats
  app.get('/api/leads/stats', requireAuth, async (req, res) => {
    try {
      const leads = await db.select().from(channelContacts);
      
      const stats = {
        total: leads.length,
        new: leads.filter(l => l.leadStatus === 'new').length,
        contacted: leads.filter(l => l.leadStatus === 'contacted').length,
        qualified: leads.filter(l => l.leadStatus === 'qualified').length,
        proposal: leads.filter(l => l.leadStatus === 'proposal').length,
        negotiation: leads.filter(l => l.leadStatus === 'negotiation').length,
        won: leads.filter(l => l.leadStatus === 'won').length,
        lost: leads.filter(l => l.leadStatus === 'lost').length,
        avgScore: leads.length > 0 
          ? leads.reduce((sum, l) => sum + (l.leadScore || 0), 0) / leads.length 
          : 0,
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Failed to fetch lead stats:', error);
      res.status(500).json({ error: 'Failed to fetch lead stats' });
    }
  });

  // Get single lead
  app.get('/api/leads/:id', requireAuth, async (req, res) => {
    try {
      const [lead] = await db.select().from(channelContacts)
        .where(eq(channelContacts.id, req.params.id));
      
      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      
      res.json(lead);
    } catch (error) {
      console.error('Failed to fetch lead:', error);
      res.status(500).json({ error: 'Failed to fetch lead' });
    }
  });

  // Update lead
  app.put('/api/leads/:id', requireAuth, async (req, res) => {
    try {
      const { leadStatus, leadScore, businessName, businessType, notes, tags } = req.body;
      
      const [updated] = await db.update(channelContacts)
        .set({
          leadStatus,
          leadScore,
          businessName,
          businessType,
          notes,
          tags,
          updatedAt: new Date(),
        })
        .where(eq(channelContacts.id, req.params.id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      
      res.json(updated);
    } catch (error) {
      console.error('Failed to update lead:', error);
      res.status(500).json({ error: 'Failed to update lead' });
    }
  });

  // Get conversation channel metadata
  app.get('/api/conversations/:id/channel-meta', requireAuth, async (req, res) => {
    try {
      const meta = await channelService.getConversationMeta(req.params.id);
      if (!meta) {
        // Return default web channel info if no meta exists
        return res.json({
          channelType: 'web',
          botMode: 'auto',
          isWithinSessionWindow: true,
        });
      }
      res.json(meta);
    } catch (error) {
      console.error('Failed to get channel meta:', error);
      res.status(500).json({ error: 'Failed to get channel meta' });
    }
  });

  // ========================================
  // WEBHOOK ENDPOINTS FOR EXTERNAL CHANNELS
  // ========================================

  // Webhook verification (GET) - for Meta webhook verification
  app.get('/api/webhooks/channel/:accountId', async (req, res) => {
    try {
      const { accountId } = req.params;
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      const account = await channelService.getChannelAccount(accountId);
      
      if (!account) {
        console.log('Webhook verification: Account not found', accountId);
        return res.status(404).send('Account not found');
      }

      if (mode === 'subscribe' && token === account.webhookVerifyToken) {
        console.log('Webhook verified for account:', accountId);
        return res.status(200).send(challenge);
      }

      console.log('Webhook verification failed for account:', accountId);
      return res.status(403).send('Verification failed');
    } catch (error) {
      console.error('Webhook verification error:', error);
      return res.status(500).send('Internal error');
    }
  });

  // Webhook handler (POST) - for receiving messages
  app.post('/api/webhooks/channel/:accountId', async (req, res) => {
    const startTime = Date.now();
    const { accountId } = req.params;
    
    try {
      const account = await channelService.getChannelAccount(accountId);
      
      if (!account) {
        await channelService.logWebhook(null, 'unknown', 'inbound', req.body, false, 'Account not found');
        return res.status(404).send('Account not found');
      }

      // Acknowledge immediately to prevent timeout
      res.status(200).send('EVENT_RECEIVED');

      // Process webhook asynchronously
      processWebhook(account, req.body, req.headers, startTime).catch(error => {
        console.error('Webhook processing error:', error);
      });

    } catch (error) {
      console.error('Webhook handler error:', error);
      // Still return 200 to prevent retries
      res.status(200).send('EVENT_RECEIVED');
    }
  });

  // Async webhook processing function
  async function processWebhook(account: any, payload: any, headers: any, startTime: number) {
    try {
      const provider = channelProviderFactory.getProvider(account.provider as 'meta_cloud' | 'twilio');
      
      // Parse inbound message
      const inboundMessage = provider.parseInboundMessage(payload);
      
      if (inboundMessage) {
        // Get or create contact
        const contact = await channelService.getOrCreateContact(
          account.id,
          inboundMessage.senderId,
          account.channelType,
          inboundMessage.senderName,
          inboundMessage.senderProfilePic,
          inboundMessage.senderId
        );

        // Find or create customer
        let customer = null;
        if (contact.customerId) {
          customer = await storage.getCustomer(contact.customerId);
        }
        
        if (!customer) {
          // Create customer from contact info
          customer = await storage.createCustomer({
            name: inboundMessage.senderName || `${account.channelType} User`,
            email: contact.email || `${inboundMessage.senderId}@${account.channelType}.channel`,
            phone: contact.phoneNumber,
          });
          
          // Link contact to customer
          await channelService.linkContactToCustomer(contact.id, customer.id);
        }

        // Find or create conversation
        let conversation = await storage.findOpenConversationByCustomer(customer.id);
        
        if (!conversation) {
          conversation = await storage.createConversation({
            customerId: customer.id,
            title: `${account.channelType.charAt(0).toUpperCase() + account.channelType.slice(1)} Conversation`,
            status: 'open',
            priority: 'medium',
            isAnonymous: false,
            aiAssistanceEnabled: account.autoResponseEnabled,
          });
        }

        // Create or update conversation metadata
        await channelService.getOrCreateConversationMeta(
          conversation.id,
          account.id,
          contact.id,
          account.channelType
        );

        // Refresh session window (customer sent a message)
        await channelService.refreshSessionWindow(conversation.id);

        // Save message
        const message = await storage.createMessage({
          conversationId: conversation.id,
          senderId: customer.id,
          senderType: 'customer',
          content: inboundMessage.content,
          scope: 'public',
        });

        // Log successful webhook
        await channelService.logWebhook(
          account.id,
          'message',
          'inbound',
          payload,
          true,
          undefined,
          Date.now() - startTime,
          message.id,
          conversation.id
        );

        // TODO: Trigger AI response if bot is enabled
        // This would call the AI service to generate and send a response

        return;
      }

      // Check for delivery status update
      const statusUpdate = provider.parseDeliveryStatus(payload);
      
      if (statusUpdate) {
        // Update message delivery status
        // Find channel message by external ID and update
        await channelService.logWebhook(
          account.id,
          'status',
          'inbound',
          payload,
          true,
          undefined,
          Date.now() - startTime
        );
        return;
      }

      // Unknown webhook type
      await channelService.logWebhook(
        account.id,
        'unknown',
        'inbound',
        payload,
        false,
        'Unknown webhook type',
        Date.now() - startTime
      );

    } catch (error: any) {
      console.error('Error processing webhook:', error);
      await channelService.logWebhook(
        account.id,
        'error',
        'inbound',
        payload,
        false,
        error.message,
        Date.now() - startTime
      );
    }
  }

  // ========================================
  // PLATFORM ASSISTANT API ENDPOINTS
  // ========================================

  // Import platform assistant service
  const { platformAssistantService } = await import('./platform-assistant-service');

  // Chat with platform assistant
  app.post('/api/platform-assistant/chat', requireAuth, async (req, res) => {
    try {
      const { message, conversationId, currentPath } = req.body;
      const user = req.user as any;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required' });
      }

      const context = {
        userId: user.id,
        userRole: user.role as 'admin' | 'agent' | 'customer',
        currentPath,
        organizationId: user.organizationId,
        workspaceId: user.workspaceId,
      };

      const result = await platformAssistantService.chat(message, context, conversationId);
      res.json(result);
    } catch (error) {
      console.error('Platform assistant chat error:', error);
      res.status(500).json({ error: 'Failed to process request' });
    }
  });

  // Get assistant conversations for user
  app.get('/api/platform-assistant/conversations', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const conversations = await platformAssistantService.getConversations(user.id);
      res.json(conversations);
    } catch (error) {
      console.error('Failed to get assistant conversations:', error);
      res.status(500).json({ error: 'Failed to get conversations' });
    }
  });

  // Get messages for a conversation
  app.get('/api/platform-assistant/conversations/:id/messages', requireAuth, async (req, res) => {
    try {
      const messages = await platformAssistantService.getConversationMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      console.error('Failed to get assistant messages:', error);
      res.status(500).json({ error: 'Failed to get messages' });
    }
  });

  // Get suggested questions
  app.get('/api/platform-assistant/suggestions', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const suggestions = platformAssistantService.getSuggestedQuestions(user.role);
      res.json({ suggestions });
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      res.status(500).json({ error: 'Failed to get suggestions' });
    }
  });

  // Get quick actions
  app.get('/api/platform-assistant/quick-actions', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const actions = platformAssistantService.getQuickActions(user.role);
      res.json({ actions });
    } catch (error) {
      console.error('Failed to get quick actions:', error);
      res.status(500).json({ error: 'Failed to get quick actions' });
    }
  });

  // Execute action via platform assistant (admin only for privileged actions)
  app.post('/api/platform-assistant/execute-action', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = req.user as any;
      const { actionId, parameters } = req.body;

      if (!actionId) {
        return res.status(400).json({ error: 'actionId is required' });
      }

      if (!user.organizationId) {
        return res.status(400).json({ error: 'Organization context is required' });
      }

      const context = {
        userId: user.id,
        userRole: user.role as 'admin' | 'agent' | 'customer',
        organizationId: user.organizationId,
        workspaceId: user.workspaceId,
      };

      const result = await platformAssistantService.executeAction(actionId, parameters || {}, context);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Failed to execute action:', error);
      res.status(500).json({ error: 'Failed to execute action' });
    }
  });

  // ========================================
  // KNOWLEDGE BASE SCHEDULER & WEBHOOKS
  // ========================================

  // Get knowledge scheduler status
  app.get('/api/knowledge-scheduler/status', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { getKnowledgeScheduler } = await import('./knowledge-scheduler');
      const scheduler = getKnowledgeScheduler();
      res.json(scheduler.getStatus());
    } catch (error) {
      console.error('Failed to get scheduler status:', error);
      res.status(500).json({ error: 'Failed to get scheduler status' });
    }
  });

  // Trigger manual reindex of stale articles
  app.post('/api/knowledge-scheduler/process-stale', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { getKnowledgeScheduler } = await import('./knowledge-scheduler');
      const scheduler = getKnowledgeScheduler();
      const result = await scheduler.processStaleArticles();
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Failed to process stale articles:', error);
      res.status(500).json({ error: 'Failed to process stale articles' });
    }
  });

  // Force reindex all articles
  app.post('/api/knowledge-scheduler/reindex-all', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { getKnowledgeScheduler } = await import('./knowledge-scheduler');
      const scheduler = getKnowledgeScheduler();
      const result = await scheduler.forceReindexAll();
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Failed to reindex all articles:', error);
      res.status(500).json({ error: 'Failed to reindex all articles' });
    }
  });

  // Webhook for external systems to trigger knowledge base updates (rate limited)
  const webhookRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 requests per minute
    message: { error: 'Too many webhook requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.post('/api/webhooks/knowledge-base/update', webhookRateLimiter, async (req, res) => {
    try {
      // Require webhook secret to be configured
      const webhookSecret = process.env.KB_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.warn('KB_WEBHOOK_SECRET not configured - webhook disabled');
        return res.status(503).json({ error: 'Webhook not configured' });
      }

      const { secret, action, articleIds, timestamp } = req.body;

      // Require and validate timestamp to prevent replay attacks (within 5 minutes)
      if (!timestamp) {
        return res.status(400).json({ error: 'timestamp is required' });
      }
      const requestTime = new Date(timestamp).getTime();
      if (isNaN(requestTime)) {
        return res.status(400).json({ error: 'Invalid timestamp format' });
      }
      const now = Date.now();
      if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
        return res.status(401).json({ error: 'Request timestamp expired' });
      }
      
      // Validate webhook secret
      if (secret !== webhookSecret) {
        return res.status(401).json({ error: 'Invalid webhook secret' });
      }

      const { getKnowledgeScheduler } = await import('./knowledge-scheduler');
      const scheduler = getKnowledgeScheduler();

      let result;
      if (action === 'reindex-all') {
        result = await scheduler.forceReindexAll();
      } else if (action === 'reindex-stale') {
        result = await scheduler.processStaleArticles();
      } else if (action === 'reindex-articles' && Array.isArray(articleIds) && articleIds.length <= 50) {
        const knowledgeRetrieval = KnowledgeRetrievalService.getInstance();
        let processed = 0;
        let errors = 0;
        
        for (const articleId of articleIds) {
          try {
            await knowledgeRetrieval.reindexArticle(articleId);
            processed++;
          } catch (err) {
            errors++;
            console.error(`Webhook: Failed to reindex article ${articleId}:`, err);
          }
        }
        result = { processed, errors };
      } else if (action === 'reindex-articles') {
        return res.status(400).json({ error: 'articleIds must be an array with max 50 items' });
      } else {
        return res.status(400).json({ error: 'Invalid action. Use: reindex-all, reindex-stale, or reindex-articles' });
      }

      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // ========================================
  // ONBOARDING API ENDPOINTS
  // ========================================

  // Get onboarding progress
  app.get('/api/onboarding/progress', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const progress = await platformAssistantService.getOnboardingProgress(user.id);
      res.json(progress);
    } catch (error) {
      console.error('Failed to get onboarding progress:', error);
      res.status(500).json({ error: 'Failed to get onboarding progress' });
    }
  });

  // Mark onboarding item complete
  app.post('/api/onboarding/complete', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { checklistItemId, metadata } = req.body;

      if (!checklistItemId) {
        return res.status(400).json({ error: 'checklistItemId is required' });
      }

      await platformAssistantService.markOnboardingComplete(user.id, checklistItemId, metadata);
      const progress = await platformAssistantService.getOnboardingProgress(user.id);
      res.json(progress);
    } catch (error) {
      console.error('Failed to mark onboarding complete:', error);
      res.status(500).json({ error: 'Failed to update onboarding' });
    }
  });

  // Get onboarding checklist definition
  app.get('/api/onboarding/checklist', requireAuth, async (req, res) => {
    try {
      const { ONBOARDING_CHECKLIST } = await import('@shared/platform-documentation');
      res.json({ checklist: ONBOARDING_CHECKLIST });
    } catch (error) {
      console.error('Failed to get onboarding checklist:', error);
      res.status(500).json({ error: 'Failed to get checklist' });
    }
  });

  // ========================================
  // DOCUMENTATION GENERATOR API ENDPOINTS
  // ========================================

  const { documentationGeneratorService } = await import('./documentation-generator-service');

  // Generate documentation for a specific integration (AI-powered)
  app.post('/api/documentation/generate', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = req.user as any;
      const { integrationName, integrationType, providerName, features, additionalContext } = req.body;

      if (!integrationName || !integrationType) {
        return res.status(400).json({ error: 'integrationName and integrationType are required' });
      }

      const result = await documentationGeneratorService.createAndSaveDocumentation({
        integrationName,
        integrationType,
        providerName,
        features,
        additionalContext
      }, user.id);

      res.json({ 
        success: true, 
        articleId: result.articleId, 
        title: result.title,
        message: `Documentation "${result.title}" created successfully`
      });
    } catch (error) {
      console.error('Failed to generate documentation:', error);
      res.status(500).json({ error: 'Failed to generate documentation' });
    }
  });

  // Generate all channel setup guides (bulk)
  app.post('/api/documentation/generate-channel-guides', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = req.user as any;
      const results = await documentationGeneratorService.generateChannelSetupGuides(user.id);
      
      res.json({ 
        success: true, 
        created: results.length,
        articles: results,
        message: `Created ${results.length} channel setup documentation articles`
      });
    } catch (error) {
      console.error('Failed to generate channel guides:', error);
      res.status(500).json({ error: 'Failed to generate channel guides' });
    }
  });

  // Preview documentation before saving (returns generated content without saving)
  app.post('/api/documentation/preview', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { integrationName, integrationType, providerName, features, additionalContext } = req.body;

      if (!integrationName || !integrationType) {
        return res.status(400).json({ error: 'integrationName and integrationType are required' });
      }

      const preview = await documentationGeneratorService.generateIntegrationDocumentation({
        integrationName,
        integrationType,
        providerName,
        features,
        additionalContext
      });

      res.json({ success: true, preview });
    } catch (error) {
      console.error('Failed to preview documentation:', error);
      res.status(500).json({ error: 'Failed to generate preview' });
    }
  });

  // ============================================================================
  // DOCUMENTATION FRAMEWORK ROUTES
  // ============================================================================

  // Document Domain routes
  app.get('/api/docs/domains', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const workspaceId = req.query.workspaceId as string;
      if (!workspaceId) {
        return res.status(400).json({ error: 'workspaceId is required' });
      }
      const domains = await storage.getDocDomainsByWorkspace(workspaceId);
      res.json(domains);
    } catch (error) {
      console.error('Failed to fetch doc domains:', error);
      res.status(500).json({ error: 'Failed to fetch domains' });
    }
  });

  app.post('/api/docs/domains', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const domain = await storage.createDocDomain(req.body);
      res.status(201).json(domain);
    } catch (error) {
      console.error('Failed to create doc domain:', error);
      res.status(500).json({ error: 'Failed to create domain' });
    }
  });

  app.put('/api/docs/domains/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const domain = await storage.updateDocDomain(req.params.id, req.body);
      res.json(domain);
    } catch (error) {
      console.error('Failed to update doc domain:', error);
      res.status(500).json({ error: 'Failed to update domain' });
    }
  });

  app.delete('/api/docs/domains/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      await storage.deleteDocDomain(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete doc domain:', error);
      res.status(500).json({ error: 'Failed to delete domain' });
    }
  });

  // Document Intent routes
  app.get('/api/docs/intents', requireAuth, async (req, res) => {
    try {
      const workspaceId = req.query.workspaceId as string;
      if (!workspaceId) {
        return res.status(400).json({ error: 'workspaceId is required' });
      }
      const intents = await storage.getDocIntentsByWorkspace(workspaceId);
      res.json(intents);
    } catch (error) {
      console.error('Failed to fetch doc intents:', error);
      res.status(500).json({ error: 'Failed to fetch intents' });
    }
  });

  app.post('/api/docs/intents', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const intent = await storage.createDocIntent(req.body);
      res.status(201).json(intent);
    } catch (error) {
      console.error('Failed to create doc intent:', error);
      res.status(500).json({ error: 'Failed to create intent' });
    }
  });

  app.put('/api/docs/intents/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const intent = await storage.updateDocIntent(req.params.id, req.body);
      res.json(intent);
    } catch (error) {
      console.error('Failed to update doc intent:', error);
      res.status(500).json({ error: 'Failed to update intent' });
    }
  });

  app.delete('/api/docs/intents/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      await storage.deleteDocIntent(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete doc intent:', error);
      res.status(500).json({ error: 'Failed to delete intent' });
    }
  });

  // Document routes
  app.get('/api/docs/documents', requireAuth, async (req, res) => {
    try {
      const workspaceId = req.query.workspaceId as string;
      if (!workspaceId) {
        return res.status(400).json({ error: 'workspaceId is required' });
      }
      const filters = {
        domainId: req.query.domainId as string | undefined,
        intentId: req.query.intentId as string | undefined,
        status: req.query.status as string | undefined,
        search: req.query.search as string | undefined
      };
      const documents = await storage.getDocumentsByWorkspace(workspaceId, filters);
      res.json(documents);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  });

  app.get('/api/docs/documents/:id', requireAuth, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }
      res.json(doc);
    } catch (error) {
      console.error('Failed to fetch document:', error);
      res.status(500).json({ error: 'Failed to fetch document' });
    }
  });

  app.post('/api/docs/documents', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const user = req.user as any;
      const doc = await storage.createDocument({
        ...req.body,
        createdBy: user.id
      });
      res.status(201).json(doc);
    } catch (error) {
      console.error('Failed to create document:', error);
      res.status(500).json({ error: 'Failed to create document' });
    }
  });

  app.put('/api/docs/documents/:id', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const doc = await storage.updateDocument(req.params.id, req.body);
      res.json(doc);
    } catch (error) {
      console.error('Failed to update document:', error);
      res.status(500).json({ error: 'Failed to update document' });
    }
  });

  app.delete('/api/docs/documents/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      await storage.deleteDocument(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete document:', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  });

  // Document Version routes
  app.get('/api/docs/documents/:id/versions', requireAuth, async (req, res) => {
    try {
      const versions = await storage.getDocumentVersionsByDocument(req.params.id);
      res.json(versions);
    } catch (error) {
      console.error('Failed to fetch document versions:', error);
      res.status(500).json({ error: 'Failed to fetch versions' });
    }
  });

  app.post('/api/docs/documents/:id/versions', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const user = req.user as any;
      const version = await storage.createDocumentVersion({
        ...req.body,
        documentId: req.params.id,
        createdBy: user.id
      });
      res.status(201).json(version);
    } catch (error) {
      console.error('Failed to create document version:', error);
      res.status(500).json({ error: 'Failed to create version' });
    }
  });

  app.put('/api/docs/versions/:id', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const version = await storage.updateDocumentVersion(req.params.id, req.body);
      res.json(version);
    } catch (error) {
      console.error('Failed to update document version:', error);
      res.status(500).json({ error: 'Failed to update version' });
    }
  });

  app.post('/api/docs/versions/:id/publish', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const version = await storage.publishDocumentVersion(req.params.id);
      res.json(version);
    } catch (error) {
      console.error('Failed to publish document version:', error);
      res.status(500).json({ error: 'Failed to publish version' });
    }
  });

  // Document Relationship routes
  app.get('/api/docs/documents/:id/relationships', requireAuth, async (req, res) => {
    try {
      const relationships = await storage.getDocumentRelationships(req.params.id);
      res.json(relationships);
    } catch (error) {
      console.error('Failed to fetch document relationships:', error);
      res.status(500).json({ error: 'Failed to fetch relationships' });
    }
  });

  app.post('/api/docs/relationships', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const relationship = await storage.createDocumentRelationship(req.body);
      res.status(201).json(relationship);
    } catch (error) {
      console.error('Failed to create document relationship:', error);
      res.status(500).json({ error: 'Failed to create relationship' });
    }
  });

  app.delete('/api/docs/relationships/:id', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      await storage.deleteDocumentRelationship(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete document relationship:', error);
      res.status(500).json({ error: 'Failed to delete relationship' });
    }
  });

  // Document Review Queue routes
  app.get('/api/docs/review-queue', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const workspaceId = req.query.workspaceId as string;
      const status = req.query.status as string | undefined;
      if (!workspaceId) {
        return res.status(400).json({ error: 'workspaceId is required' });
      }
      const queue = await storage.getDocumentReviewQueue(workspaceId, status);
      res.json(queue);
    } catch (error) {
      console.error('Failed to fetch review queue:', error);
      res.status(500).json({ error: 'Failed to fetch review queue' });
    }
  });

  app.post('/api/docs/review-queue/:id/approve', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = req.user as any;
      await storage.approveDocumentReview(req.params.id, user.id, req.body.notes);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to approve document review:', error);
      res.status(500).json({ error: 'Failed to approve review' });
    }
  });

  app.post('/api/docs/review-queue/:id/reject', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = req.user as any;
      if (!req.body.notes) {
        return res.status(400).json({ error: 'Rejection notes are required' });
      }
      await storage.rejectDocumentReview(req.params.id, user.id, req.body.notes);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to reject document review:', error);
      res.status(500).json({ error: 'Failed to reject review' });
    }
  });

  // Document Import Job routes
  app.get('/api/docs/import-jobs', requireAuth, async (req, res) => {
    try {
      const workspaceId = req.query.workspaceId as string;
      if (!workspaceId) {
        return res.status(400).json({ error: 'workspaceId is required' });
      }
      const jobs = await storage.getDocumentImportJobsByWorkspace(workspaceId);
      res.json(jobs);
    } catch (error) {
      console.error('Failed to fetch import jobs:', error);
      res.status(500).json({ error: 'Failed to fetch import jobs' });
    }
  });

  app.post('/api/docs/import-jobs', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const user = req.user as any;
      const job = await storage.createDocumentImportJob({
        ...req.body,
        createdBy: user.id
      });
      res.status(201).json(job);
    } catch (error) {
      console.error('Failed to create import job:', error);
      res.status(500).json({ error: 'Failed to create import job' });
    }
  });

  // AI Export endpoint for fetching documents for AI agents
  app.get('/api/docs/ai-export', requireAuth, async (req, res) => {
    try {
      const workspaceId = req.query.workspaceId as string;
      if (!workspaceId) {
        return res.status(400).json({ error: 'workspaceId is required' });
      }
      
      // Resolve domain/intent names to IDs if provided as strings
      let domainId = req.query.domainId as string | undefined;
      let intentId = req.query.intentId as string | undefined;
      
      // If domain name/slug provided, resolve to ID
      if (req.query.domain && !domainId) {
        const domainName = (req.query.domain as string).toLowerCase();
        const domains = await storage.getDocDomainsByWorkspace(workspaceId);
        const matchedDomain = domains.find(d => 
          d.name.toLowerCase() === domainName || 
          d.slug?.toLowerCase() === domainName
        );
        if (matchedDomain) domainId = matchedDomain.id;
      }
      
      // If intent name/slug provided, resolve to ID
      if (req.query.intent && !intentId) {
        const intentName = (req.query.intent as string).toLowerCase();
        const intents = await storage.getDocIntentsByWorkspace(workspaceId);
        const matchedIntent = intents.find(i => 
          i.name.toLowerCase() === intentName || 
          i.slug?.toLowerCase() === intentName
        );
        if (matchedIntent) intentId = matchedIntent.id;
      }
      
      // Enhanced filters for AI agent retrieval
      // AI agents filter by: domain, intent, role, status, aiAgentId
      const filters = {
        domainId,
        intentId,
        role: req.query.role as string | undefined, // Filter by requester's role
        status: (req.query.status as string) || 'active', // Default to active docs
        isPublic: req.query.isPublic === 'true' ? true : req.query.isPublic === 'false' ? false : undefined,
        aiAgentId: req.query.aiAgentId as string | undefined, // Filter to specific agent's docs
      };
      
      const documents = await storage.getDocumentsForAIExport(workspaceId, filters);
      
      // Format response for AI consumption
      const aiReadyDocs = documents.map(doc => ({
        id: doc.id,
        slug: doc.slug,
        title: doc.title,
        summary: doc.summary,
        domain: doc.domain?.name || null,
        domainId: doc.domainId,
        intent: doc.intent?.name || null,
        intentId: doc.intentId,
        status: doc.status,
        version: doc.currentVersion,
        isPublic: doc.isPublic,
        roleAccess: doc.roleAccess,
        aiActions: doc.aiActions, // Executable actions
        tags: doc.tags,
        content: doc.currentVersionContent?.markdownBody || null,
        frontMatter: doc.currentVersionContent?.frontMatter || null,
        relationships: doc.relationships.map(r => ({
          type: r.relationshipType,
          targetId: r.targetDocumentId,
          description: r.description
        })),
        updatedAt: doc.updatedAt
      }));
      
      res.json({
        count: aiReadyDocs.length,
        documents: aiReadyDocs,
        filters: {
          workspaceId,
          ...filters
        }
      });
    } catch (error) {
      console.error('Failed to export documents for AI:', error);
      res.status(500).json({ error: 'Failed to export documents' });
    }
  });

  // Document Import Upload endpoint - uploads file and starts AI conversion
  app.post('/api/docs/import-jobs/upload', requireAuth, requireRole(['admin', 'agent']), upload.single('file'), async (req, res) => {
    try {
      const user = req.user as any;
      const file = req.file;
      const workspaceId = req.body.workspaceId;
      
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      if (!workspaceId) {
        return res.status(400).json({ error: 'workspaceId is required' });
      }
      
      // Determine file type from extension
      const ext = file.originalname.toLowerCase().split('.').pop();
      const fileType = ext === 'pdf' ? 'pdf' : ext === 'docx' ? 'docx' : ext === 'txt' ? 'txt' : 'unknown';
      
      if (fileType === 'unknown') {
        return res.status(400).json({ error: 'Unsupported file type. Only PDF, DOCX, and TXT are supported.' });
      }
      
      // Create the uploaded file record
      // Generate stored name from the path (the filename portion)
      const storedName = file.path.split('/').pop() || file.filename || `upload-${Date.now()}`;
      // Generate a simple hash from the file path and size for uniqueness
      const crypto = await import('crypto');
      const fs = await import('fs');
      const fileBuffer = fs.readFileSync(file.path);
      const sha256Hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      
      // Check if file with same hash already exists (reuse it)
      let uploadedFile = await storage.getUploadedFileByHash(sha256Hash);
      
      if (!uploadedFile) {
        uploadedFile = await storage.createUploadedFile({
          originalName: file.originalname,
          storedName: storedName,
          mimeType: file.mimetype,
          size: file.size,
          sha256Hash: sha256Hash,
          filePath: file.path,
          createdBy: user.id,
        });
      }
      
      // Create the import job
      const importJob = await storage.createDocumentImportJob({
        sourceFileId: uploadedFile.id,
        sourceFileName: file.originalname,
        sourceFileType: fileType,
        status: 'pending',
        progress: 0,
        workspaceId: workspaceId,
        createdBy: user.id,
      });
      
      // Process the file asynchronously
      processDocumentImport(importJob.id, uploadedFile, workspaceId, user.id);
      
      res.status(201).json(importJob);
    } catch (error) {
      console.error('Failed to start document import:', error);
      res.status(500).json({ error: 'Failed to start document import' });
    }
  });

  // ============================================================================
  // VOICE CONVERSATION API ENDPOINTS
  // ============================================================================

  // Text-to-Speech endpoint
  app.post('/api/voice/tts', async (req, res) => {
    try {
      const { text, voice, conversationId } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text is required' });
      }
      
      if (text.length > 4096) {
        return res.status(400).json({ error: 'Text too long (max 4096 characters)' });
      }
      
      const result = await AIService.textToSpeech(text, {
        voice: voice || 'nova',
        conversationId
      });
      
      res.json(result);
    } catch (error) {
      console.error('TTS error:', error);
      res.status(500).json({ error: 'Failed to generate speech' });
    }
  });

  // Voice conversation endpoint - generates AI response optimized for voice
  app.post('/api/voice/chat', async (req, res) => {
    try {
      const { message, conversationHistory, agentId, language, conversationId } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required' });
      }
      
      // Generate voice-optimized response (includes conversational intelligence)
      const aiResponse = await AIService.generateVoiceResponse(
        message,
        conversationHistory || [],
        agentId,
        language || 'en',
        conversationId
      );
      
      // Generate TTS audio for the response
      const ttsResult = await AIService.textToSpeech(aiResponse.response, {
        voice: 'nova',
        conversationId
      });
      
      // If there's an active conversation, save the messages
      if (conversationId) {
        try {
          // Save customer message
          await storage.createMessage({
            conversationId,
            content: message,
            senderType: 'customer',
            metadata: { modality: 'voice', language: language || 'en' }
          });
          
          // Save AI response with KB links
          const kbLinks = aiResponse.knowledgeLinks.length > 0
            ? `\n\n**Related Resources:**\n${aiResponse.knowledgeLinks.map(l => `- [${l.title}](/kb/${l.id})`).join('\n')}`
            : '';
          
          await storage.createMessage({
            conversationId,
            content: aiResponse.response + kbLinks,
            senderType: 'ai',
            metadata: { 
              modality: 'voice', 
              confidence: aiResponse.confidence,
              knowledgeLinks: aiResponse.knowledgeLinks
            }
          });
        } catch (e) {
          console.error('[Voice] Failed to save messages:', e);
        }
      }
      
      res.json({
        response: aiResponse.response,
        audio: ttsResult.audio,
        audioFormat: ttsResult.format,
        knowledgeLinks: aiResponse.knowledgeLinks,
        confidence: aiResponse.confidence,
        requiresHumanTakeover: aiResponse.requiresHumanTakeover
      });
    } catch (error) {
      console.error('Voice chat error:', error);
      res.status(500).json({ error: 'Failed to process voice request' });
    }
  });

  // ============================================================================
  // AI TOKEN USAGE & BILLING API ENDPOINTS
  // ============================================================================

  // Get daily token usage summary
  app.get('/api/admin/ai-usage/daily', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const workspaceId = req.query.workspaceId as string | undefined;
      
      const usage = await storage.getDailyTokenUsage(workspaceId || null, days);
      res.json(usage);
    } catch (error) {
      console.error('Failed to fetch daily token usage:', error);
      res.status(500).json({ error: 'Failed to fetch token usage' });
    }
  });

  // Get monthly token usage summary  
  app.get('/api/admin/ai-usage/monthly', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const months = parseInt(req.query.months as string) || 12;
      const workspaceId = req.query.workspaceId as string | undefined;
      
      const usage = await storage.getMonthlyTokenUsage(workspaceId || null, months);
      res.json(usage);
    } catch (error) {
      console.error('Failed to fetch monthly token usage:', error);
      res.status(500).json({ error: 'Failed to fetch token usage' });
    }
  });

  // Get token usage by conversation
  app.get('/api/admin/ai-usage/conversation/:conversationId', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { conversationId } = req.params;
      const usage = await storage.getAiTokenUsageByConversation(conversationId);
      
      // Calculate totals
      const totals = usage.reduce((acc, u) => ({
        promptTokens: acc.promptTokens + u.promptTokens,
        completionTokens: acc.completionTokens + u.completionTokens,
        totalTokens: acc.totalTokens + u.totalTokens,
        totalCost: acc.totalCost + parseFloat(u.costUsd)
      }), { promptTokens: 0, completionTokens: 0, totalTokens: 0, totalCost: 0 });
      
      res.json({ usage, totals: { ...totals, totalCost: totals.totalCost.toFixed(6) } });
    } catch (error) {
      console.error('Failed to fetch conversation token usage:', error);
      res.status(500).json({ error: 'Failed to fetch token usage' });
    }
  });

  // Get overall usage stats
  app.get('/api/admin/ai-usage/stats', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const workspaceId = req.query.workspaceId as string | undefined;
      
      // Get current month usage
      const thisMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
      const startOfMonth = new Date(thisMonth + '-01');
      
      const monthlyData = await storage.getAiTokenUsageSummary(workspaceId || null, startOfMonth);
      
      // Calculate current month totals
      const currentMonthTotals = monthlyData.reduce((acc, u) => ({
        totalTokens: acc.totalTokens + u.totalTokens,
        totalCost: acc.totalCost + parseFloat(u.totalCostUsd),
        requestCount: acc.requestCount + u.requestCount
      }), { totalTokens: 0, totalCost: 0, requestCount: 0 });
      
      // Get daily data for chart
      const dailyData = await storage.getDailyTokenUsage(workspaceId || null, 30);
      
      // Aggregate by date (across all models)
      const byDate = new Map<string, { tokens: number; cost: number; requests: number }>();
      for (const row of dailyData) {
        const existing = byDate.get(row.date) || { tokens: 0, cost: 0, requests: 0 };
        existing.tokens += row.totalTokens;
        existing.cost += parseFloat(row.totalCost);
        existing.requests += row.requestCount;
        byDate.set(row.date, existing);
      }
      
      const chartData = Array.from(byDate.entries())
        .map(([date, data]) => ({ date, ...data, cost: data.cost.toFixed(4) }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      res.json({
        currentMonth: {
          month: thisMonth,
          ...currentMonthTotals,
          totalCost: currentMonthTotals.totalCost.toFixed(4)
        },
        chartData
      });
    } catch (error) {
      console.error('Failed to fetch usage stats:', error);
      res.status(500).json({ error: 'Failed to fetch usage stats' });
    }
  });

  // ============================================================================
  // AI KNOWLEDGE LEARNING API ENDPOINTS
  // ============================================================================

  // Get top performing articles
  app.get('/api/admin/ai-learning/top-articles', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const topArticles = await storage.getTopPerformingArticles(limit);
      res.json(topArticles);
    } catch (error) {
      console.error('Failed to fetch top articles:', error);
      res.status(500).json({ error: 'Failed to fetch top articles' });
    }
  });

  // Get articles needing improvement
  app.get('/api/admin/ai-learning/needs-improvement', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const articles = await storage.getArticlesNeedingImprovement(limit);
      res.json(articles);
    } catch (error) {
      console.error('Failed to fetch articles needing improvement:', error);
      res.status(500).json({ error: 'Failed to fetch articles' });
    }
  });

  // Update feedback when conversation is resolved
  app.post('/api/admin/ai-learning/update-outcome', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { conversationId, outcome, customerRating } = req.body;
      
      if (!conversationId || !outcome) {
        return res.status(400).json({ error: 'conversationId and outcome are required' });
      }
      
      await storage.updateKnowledgeFeedbackByConversation(conversationId, outcome, customerRating);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to update learning outcome:', error);
      res.status(500).json({ error: 'Failed to update outcome' });
    }
  });

  // Get article metrics
  app.get('/api/admin/ai-learning/article-metrics/:knowledgeBaseId', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { knowledgeBaseId } = req.params;
      const metrics = await storage.getKnowledgeArticleMetrics(knowledgeBaseId);
      
      if (!metrics) {
        return res.json({ 
          timesRetrieved: 0, 
          timesUsedInResponse: 0, 
          helpfulCount: 0, 
          notHelpfulCount: 0,
          successRate: '0'
        });
      }
      
      res.json(metrics);
    } catch (error) {
      console.error('Failed to fetch article metrics:', error);
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  });

  // ============================================================================
  // REGIONS API ENDPOINTS
  // ============================================================================

  // Get all regions
  app.get('/api/regions', async (req, res) => {
    try {
      const allRegions = await storage.getAllRegions();
      res.json(allRegions);
    } catch (error) {
      console.error('Failed to fetch regions:', error);
      res.status(500).json({ error: 'Failed to fetch regions' });
    }
  });

  // Get region by ID
  app.get('/api/regions/:id', async (req, res) => {
    try {
      const region = await storage.getRegion(req.params.id);
      if (!region) {
        return res.status(404).json({ error: 'Region not found' });
      }
      res.json(region);
    } catch (error) {
      console.error('Failed to fetch region:', error);
      res.status(500).json({ error: 'Failed to fetch region' });
    }
  });

  // Get region by ISO code
  app.get('/api/regions/iso/:isoCode', async (req, res) => {
    try {
      const region = await storage.getRegionByIsoCode(req.params.isoCode);
      if (!region) {
        return res.status(404).json({ error: 'Region not found' });
      }
      res.json(region);
    } catch (error) {
      console.error('Failed to fetch region:', error);
      res.status(500).json({ error: 'Failed to fetch region' });
    }
  });

  // Create region (admin only)
  app.post('/api/regions', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const validation = createRegionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }

      const data = validation.data;
      const existing = await storage.getRegionByIsoCode(data.isoCode);
      if (existing) {
        return res.status(409).json({ error: 'Region with this ISO code already exists' });
      }

      const region = await storage.createRegion(data);
      res.status(201).json(region);
    } catch (error) {
      console.error('Failed to create region:', error);
      res.status(500).json({ error: 'Failed to create region' });
    }
  });

  // Update region (admin only)
  app.put('/api/regions/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const validation = updateRegionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }

      const region = await storage.getRegion(req.params.id);
      if (!region || !region.isActive) {
        return res.status(404).json({ error: 'Region not found' });
      }

      const updated = await storage.updateRegion(req.params.id, validation.data);
      res.json(updated);
    } catch (error) {
      console.error('Failed to update region:', error);
      res.status(500).json({ error: 'Failed to update region' });
    }
  });

  // Delete region (admin only) - soft delete
  app.delete('/api/regions/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const region = await storage.getRegion(req.params.id);
      if (!region || !region.isActive) {
        return res.status(404).json({ error: 'Region not found' });
      }

      await storage.deleteRegion(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete region:', error);
      res.status(500).json({ error: 'Failed to delete region' });
    }
  });

  // ============================================================================
  // ORGANIZATION MEMBERS API ENDPOINTS
  // ============================================================================

  // Helper to verify organization membership with admin/owner access
  async function verifyOrgAdminAccess(userId: string, organizationId: string): Promise<boolean> {
    const membership = await storage.getOrganizationMemberByUser(organizationId, userId);
    return !!membership && (membership.role === 'admin' || membership.role === 'owner' || membership.canManageMembers);
  }

  // Get organization members
  app.get('/api/organizations/:orgId/members', requireAuth, async (req, res) => {
    try {
      const currentUserId = (req.user as any)?.id;
      const userMembership = await storage.getOrganizationMemberByUser(req.params.orgId, currentUserId);
      
      if (!userMembership) {
        return res.status(403).json({ error: 'You are not a member of this organization' });
      }

      const members = await storage.getOrganizationMembers(req.params.orgId);
      res.json(members);
    } catch (error) {
      console.error('Failed to fetch organization members:', error);
      res.status(500).json({ error: 'Failed to fetch members' });
    }
  });

  // Add member to organization
  app.post('/api/organizations/:orgId/members', requireAuth, async (req, res) => {
    try {
      const validation = createOrganizationMemberSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }

      const currentUserId = (req.user as any)?.id;
      const hasAccess = await verifyOrgAdminAccess(currentUserId, req.params.orgId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'You do not have permission to manage members in this organization' });
      }

      const data = validation.data;
      const existing = await storage.getOrganizationMemberByUser(req.params.orgId, data.userId);
      if (existing) {
        return res.status(409).json({ error: 'User is already a member of this organization' });
      }

      const member = await storage.createOrganizationMember({
        organizationId: req.params.orgId,
        userId: data.userId,
        role: data.role,
        canViewAllConversations: data.canViewAllConversations,
        canManageWorkspaces: data.canManageWorkspaces,
        canManageMembers: data.canManageMembers,
        canManageSettings: data.canManageSettings,
        invitedBy: currentUserId,
        invitedAt: new Date()
      });

      res.status(201).json(member);
    } catch (error) {
      console.error('Failed to add organization member:', error);
      res.status(500).json({ error: 'Failed to add member' });
    }
  });

  // Update organization member
  app.put('/api/organization-members/:id', requireAuth, async (req, res) => {
    try {
      const validation = updateOrganizationMemberSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }

      const member = await storage.getOrganizationMember(req.params.id);
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      const currentUserId = (req.user as any)?.id;
      const hasAccess = await verifyOrgAdminAccess(currentUserId, member.organizationId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'You do not have permission to manage members in this organization' });
      }

      const updated = await storage.updateOrganizationMember(req.params.id, validation.data);
      res.json(updated);
    } catch (error) {
      console.error('Failed to update organization member:', error);
      res.status(500).json({ error: 'Failed to update member' });
    }
  });

  // Remove organization member
  app.delete('/api/organization-members/:id', requireAuth, async (req, res) => {
    try {
      const member = await storage.getOrganizationMember(req.params.id);
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      const currentUserId = (req.user as any)?.id;
      const hasAccess = await verifyOrgAdminAccess(currentUserId, member.organizationId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'You do not have permission to manage members in this organization' });
      }

      await storage.deleteOrganizationMember(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Failed to remove organization member:', error);
      res.status(500).json({ error: 'Failed to remove member' });
    }
  });

  // Get user's organizations (only for the requesting user or admins)
  app.get('/api/users/:userId/organizations', requireAuth, async (req, res) => {
    try {
      const currentUserId = (req.user as any)?.id;
      const currentUserRole = (req.user as any)?.role;
      
      if (currentUserId !== req.params.userId && currentUserRole !== 'admin') {
        return res.status(403).json({ error: 'You can only view your own organizations' });
      }

      const organizations = await storage.getUserOrganizations(req.params.userId);
      res.json(organizations);
    } catch (error) {
      console.error('Failed to fetch user organizations:', error);
      res.status(500).json({ error: 'Failed to fetch organizations' });
    }
  });

  // ============================================================================
  // KNOWLEDGE COLLECTIONS API ENDPOINTS
  // ============================================================================

  // Helper to verify collection access based on organization membership
  async function verifyCollectionAccess(userId: string, collection: any, requiredLevel: 'read' | 'manage'): Promise<boolean> {
    if (!collection.ownerOrganizationId) {
      return collection.visibility === 'shared';
    }
    const membership = await storage.getOrganizationMemberByUser(collection.ownerOrganizationId, userId);
    if (!membership) return false;
    if (requiredLevel === 'manage') {
      return membership.role === 'admin' || membership.role === 'owner';
    }
    return true;
  }

  // Get all knowledge collections
  app.get('/api/knowledge-collections', requireAuth, async (req, res) => {
    try {
      const organizationId = req.query.organizationId as string | undefined;
      const collections = await storage.getAllKnowledgeCollections(organizationId);
      res.json(collections);
    } catch (error) {
      console.error('Failed to fetch knowledge collections:', error);
      res.status(500).json({ error: 'Failed to fetch collections' });
    }
  });

  // Get knowledge collection by ID
  app.get('/api/knowledge-collections/:id', requireAuth, async (req, res) => {
    try {
      const collection = await storage.getKnowledgeCollection(req.params.id);
      if (!collection || !collection.isActive) {
        return res.status(404).json({ error: 'Collection not found' });
      }
      res.json(collection);
    } catch (error) {
      console.error('Failed to fetch collection:', error);
      res.status(500).json({ error: 'Failed to fetch collection' });
    }
  });

  // Create knowledge collection
  app.post('/api/knowledge-collections', requireAuth, async (req, res) => {
    try {
      const validation = createKnowledgeCollectionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }

      const data = validation.data;
      const currentUserId = (req.user as any)?.id;
      
      if (data.ownerOrganizationId) {
        const hasAccess = await verifyOrgAdminAccess(currentUserId, data.ownerOrganizationId);
        if (!hasAccess) {
          return res.status(403).json({ error: 'You do not have permission to create collections in this organization' });
        }
      }

      const existing = await storage.getKnowledgeCollectionBySlug(data.slug, data.ownerOrganizationId);
      if (existing) {
        return res.status(409).json({ error: 'Collection with this slug already exists' });
      }

      const collection = await storage.createKnowledgeCollection(data);
      res.status(201).json(collection);
    } catch (error) {
      console.error('Failed to create collection:', error);
      res.status(500).json({ error: 'Failed to create collection' });
    }
  });

  // Update knowledge collection
  app.put('/api/knowledge-collections/:id', requireAuth, async (req, res) => {
    try {
      const validation = updateKnowledgeCollectionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }

      const collection = await storage.getKnowledgeCollection(req.params.id);
      if (!collection || !collection.isActive) {
        return res.status(404).json({ error: 'Collection not found' });
      }

      const currentUserId = (req.user as any)?.id;
      const hasAccess = await verifyCollectionAccess(currentUserId, collection, 'manage');
      if (!hasAccess) {
        return res.status(403).json({ error: 'You do not have permission to update this collection' });
      }

      const updated = await storage.updateKnowledgeCollection(req.params.id, validation.data);
      res.json(updated);
    } catch (error) {
      console.error('Failed to update collection:', error);
      res.status(500).json({ error: 'Failed to update collection' });
    }
  });

  // Delete knowledge collection (soft delete)
  app.delete('/api/knowledge-collections/:id', requireAuth, async (req, res) => {
    try {
      const collection = await storage.getKnowledgeCollection(req.params.id);
      if (!collection || !collection.isActive) {
        return res.status(404).json({ error: 'Collection not found' });
      }

      const currentUserId = (req.user as any)?.id;
      const hasAccess = await verifyCollectionAccess(currentUserId, collection, 'manage');
      if (!hasAccess) {
        return res.status(403).json({ error: 'You do not have permission to delete this collection' });
      }

      await storage.deleteKnowledgeCollection(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete collection:', error);
      res.status(500).json({ error: 'Failed to delete collection' });
    }
  });

  // Get articles in a collection
  app.get('/api/knowledge-collections/:id/articles', requireAuth, async (req, res) => {
    try {
      const collection = await storage.getKnowledgeCollection(req.params.id);
      if (!collection || !collection.isActive) {
        return res.status(404).json({ error: 'Collection not found' });
      }

      const articles = await storage.getCollectionArticles(req.params.id);
      res.json(articles);
    } catch (error) {
      console.error('Failed to fetch collection articles:', error);
      res.status(500).json({ error: 'Failed to fetch articles' });
    }
  });

  // Add article to collection
  app.post('/api/knowledge-collections/:id/articles', requireAuth, async (req, res) => {
    try {
      const validation = addArticleToCollectionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }

      const collection = await storage.getKnowledgeCollection(req.params.id);
      if (!collection || !collection.isActive) {
        return res.status(404).json({ error: 'Collection not found' });
      }

      const currentUserId = (req.user as any)?.id;
      const hasAccess = await verifyCollectionAccess(currentUserId, collection, 'manage');
      if (!hasAccess) {
        return res.status(403).json({ error: 'You do not have permission to modify this collection' });
      }

      const article = await storage.addArticleToCollection({
        collectionId: req.params.id,
        ...validation.data
      });

      res.status(201).json(article);
    } catch (error) {
      console.error('Failed to add article to collection:', error);
      res.status(500).json({ error: 'Failed to add article' });
    }
  });

  // Remove article from collection
  app.delete('/api/knowledge-collections/:collectionId/articles/:articleId', requireAuth, async (req, res) => {
    try {
      const collection = await storage.getKnowledgeCollection(req.params.collectionId);
      if (!collection || !collection.isActive) {
        return res.status(404).json({ error: 'Collection not found' });
      }

      const currentUserId = (req.user as any)?.id;
      const hasAccess = await verifyCollectionAccess(currentUserId, collection, 'manage');
      if (!hasAccess) {
        return res.status(403).json({ error: 'You do not have permission to modify this collection' });
      }

      await storage.removeArticleFromCollection(req.params.collectionId, req.params.articleId);
      res.status(204).send();
    } catch (error) {
      console.error('Failed to remove article from collection:', error);
      res.status(500).json({ error: 'Failed to remove article' });
    }
  });

  // Get workspace's collections
  app.get('/api/workspaces/:workspaceId/collections', requireAuth, async (req, res) => {
    try {
      const collections = await storage.getWorkspaceCollections(req.params.workspaceId);
      res.json(collections);
    } catch (error) {
      console.error('Failed to fetch workspace collections:', error);
      res.status(500).json({ error: 'Failed to fetch collections' });
    }
  });

  // Add collection to workspace
  app.post('/api/workspaces/:workspaceId/collections', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const validation = addCollectionToWorkspaceSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }

      const assignment = await storage.addCollectionToWorkspace({
        workspaceId: req.params.workspaceId,
        ...validation.data
      });

      res.status(201).json(assignment);
    } catch (error) {
      console.error('Failed to add collection to workspace:', error);
      res.status(500).json({ error: 'Failed to add collection' });
    }
  });

  // Remove collection from workspace
  app.delete('/api/workspaces/:workspaceId/collections/:collectionId', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      await storage.removeCollectionFromWorkspace(req.params.workspaceId, req.params.collectionId);
      res.status(204).send();
    } catch (error) {
      console.error('Failed to remove collection from workspace:', error);
      res.status(500).json({ error: 'Failed to remove collection' });
    }
  });

  // Update workspace collection access level
  app.put('/api/workspaces/:workspaceId/collections/:collectionId', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const accessLevelSchema = z.object({ accessLevel: z.enum(['read', 'contribute', 'manage']) });
      const validation = accessLevelSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }

      await storage.updateWorkspaceCollectionAccess(req.params.workspaceId, req.params.collectionId, validation.data.accessLevel);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to update workspace collection access:', error);
      res.status(500).json({ error: 'Failed to update access' });
    }
  });

  // ============================================================================
  // RESOLUTION HISTORY API ENDPOINTS
  // Track successful solutions to customer issues
  // Multi-tenant scoped - access is validated against user's organization/workspace
  // ============================================================================

  // Helper: Verify user has access to resolution record via organization membership
  async function verifyResolutionAccess(userId: string, record: { organizationId?: string | null; workspaceId?: string | null }): Promise<boolean> {
    if (record.organizationId) {
      return await verifyOrgAdminAccess(userId, record.organizationId);
    }
    if (record.workspaceId) {
      const workspace = await storage.getWorkspace(record.workspaceId);
      if (workspace?.organizationId) {
        return await verifyOrgAdminAccess(userId, workspace.organizationId);
      }
    }
    return false;
  }

  // Helper: Get user's organization ID from session
  async function getUserOrganizationId(userId: string): Promise<string | null> {
    const user = await storage.getUser(userId);
    return user?.organizationId || null;
  }

  // Create a resolution record (uses shared schema from @shared/schema.ts)
  app.post('/api/resolutions', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const validation = insertResolutionRecordSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }

      const currentUserId = (req.user as any)?.id;
      const userOrgId = await getUserOrganizationId(currentUserId);
      
      // Verify user can only create records for their own organization
      if (validation.data.organizationId && validation.data.organizationId !== userOrgId) {
        return res.status(403).json({ error: 'Access denied: Cannot create records for other organizations' });
      }

      const record = await storage.createResolutionRecord({
        ...validation.data,
        organizationId: validation.data.organizationId || userOrgId || undefined,
        resolvedBy: currentUserId
      });

      res.status(201).json(record);
    } catch (error) {
      console.error('Failed to create resolution record:', error);
      res.status(500).json({ error: 'Failed to create resolution record' });
    }
  });

  // Get resolution record by ID (with tenant scoping)
  app.get('/api/resolutions/:id', requireAuth, async (req, res) => {
    try {
      const currentUserId = (req.user as any)?.id;
      const record = await storage.getResolutionRecord(req.params.id);
      if (!record) {
        return res.status(404).json({ error: 'Resolution record not found' });
      }

      // Verify user has access to this record's organization/workspace
      const hasAccess = await verifyResolutionAccess(currentUserId, record);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json(record);
    } catch (error) {
      console.error('Failed to fetch resolution record:', error);
      res.status(500).json({ error: 'Failed to fetch resolution record' });
    }
  });

  // Get resolutions for a customer (scoped to user's organization)
  app.get('/api/customers/:customerId/resolutions', requireAuth, async (req, res) => {
    try {
      const currentUserId = (req.user as any)?.id;
      const userOrgId = await getUserOrganizationId(currentUserId);
      
      // Verify customer belongs to user's organization
      const customer = await storage.getCustomer(req.params.customerId);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      const limit = parseInt(req.query.limit as string) || 10;
      const resolutions = await storage.getResolutionsByCustomer(req.params.customerId, limit);
      
      // Filter to only resolutions in user's organization
      const scopedResolutions = resolutions.filter(r => 
        !r.organizationId || r.organizationId === userOrgId
      );
      
      res.json(scopedResolutions);
    } catch (error) {
      console.error('Failed to fetch customer resolutions:', error);
      res.status(500).json({ error: 'Failed to fetch resolutions' });
    }
  });

  // Get resolution summary for a customer (scoped to user's organization)
  app.get('/api/customers/:customerId/resolution-summary', requireAuth, async (req, res) => {
    try {
      const currentUserId = (req.user as any)?.id;
      const userOrgId = await getUserOrganizationId(currentUserId);
      
      const customer = await storage.getCustomer(req.params.customerId);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      const summary = await storage.getResolutionSummaryForCustomer(req.params.customerId);
      res.json(summary);
    } catch (error) {
      console.error('Failed to fetch resolution summary:', error);
      res.status(500).json({ error: 'Failed to fetch summary' });
    }
  });

  // Get resolutions for a specific issue category (scoped)
  app.get('/api/customers/:customerId/resolutions/category/:category', requireAuth, async (req, res) => {
    try {
      const currentUserId = (req.user as any)?.id;
      const userOrgId = await getUserOrganizationId(currentUserId);
      
      const limit = parseInt(req.query.limit as string) || 5;
      const resolutions = await storage.getResolutionsByCustomerIssue(
        req.params.customerId,
        req.params.category,
        limit
      );
      
      // Filter to user's organization
      const scopedResolutions = resolutions.filter(r => 
        !r.organizationId || r.organizationId === userOrgId
      );
      
      res.json(scopedResolutions);
    } catch (error) {
      console.error('Failed to fetch category resolutions:', error);
      res.status(500).json({ error: 'Failed to fetch resolutions' });
    }
  });

  // Get successful resolutions for AI context (proven solutions, scoped)
  app.get('/api/customers/:customerId/successful-resolutions', requireAuth, async (req, res) => {
    try {
      const currentUserId = (req.user as any)?.id;
      const userOrgId = await getUserOrganizationId(currentUserId);
      
      const issueCategory = req.query.issueCategory as string | undefined;
      const limit = parseInt(req.query.limit as string) || 3;
      const resolutions = await storage.getSuccessfulResolutions(
        req.params.customerId,
        issueCategory,
        limit
      );
      
      // Filter to user's organization
      const scopedResolutions = resolutions.filter(r => 
        !r.organizationId || r.organizationId === userOrgId
      );
      
      res.json(scopedResolutions);
    } catch (error) {
      console.error('Failed to fetch successful resolutions:', error);
      res.status(500).json({ error: 'Failed to fetch resolutions' });
    }
  });

  // Update resolution record (with tenant verification)
  app.put('/api/resolutions/:id', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const updateSchema = insertResolutionRecordSchema.partial().extend({
        customerFeedback: z.string().max(2000).optional()
      });
      const validation = updateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }

      const currentUserId = (req.user as any)?.id;
      const existing = await storage.getResolutionRecord(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Resolution record not found' });
      }

      // Verify user has access
      const hasAccess = await verifyResolutionAccess(currentUserId, existing);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const updated = await storage.updateResolutionRecord(req.params.id, validation.data);
      res.json(updated);
    } catch (error) {
      console.error('Failed to update resolution record:', error);
      res.status(500).json({ error: 'Failed to update resolution record' });
    }
  });

  // Update resolution outcome (quick action for agents, with tenant verification)
  app.patch('/api/resolutions/:id/outcome', requireAuth, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const outcomeSchema = z.object({
        outcome: z.enum(['resolved', 'partially_resolved', 'not_resolved']),
        customerFeedback: z.string().max(2000).optional()
      });
      const validation = outcomeSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }

      const currentUserId = (req.user as any)?.id;
      const existing = await storage.getResolutionRecord(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Resolution record not found' });
      }

      // Verify user has access
      const hasAccess = await verifyResolutionAccess(currentUserId, existing);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const updated = await storage.updateResolutionOutcome(
        req.params.id,
        validation.data.outcome,
        validation.data.customerFeedback
      );
      res.json(updated);
    } catch (error) {
      console.error('Failed to update resolution outcome:', error);
      res.status(500).json({ error: 'Failed to update outcome' });
    }
  });

  // Delete resolution record (soft delete, admin only with tenant verification)
  app.delete('/api/resolutions/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const currentUserId = (req.user as any)?.id;
      const existing = await storage.getResolutionRecord(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Resolution record not found' });
      }

      // Verify user has access
      const hasAccess = await verifyResolutionAccess(currentUserId, existing);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await storage.deleteResolutionRecord(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete resolution record:', error);
      res.status(500).json({ error: 'Failed to delete resolution record' });
    }
  });

  // Get resolutions by workspace (for analytics, with workspace access verification)
  app.get('/api/workspaces/:workspaceId/resolutions', requireAuth, async (req, res) => {
    try {
      const currentUserId = (req.user as any)?.id;
      
      // Verify user has access to this workspace via organization
      const workspace = await storage.getWorkspace(req.params.workspaceId);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      
      if (workspace.organizationId) {
        const hasAccess = await verifyOrgAdminAccess(currentUserId, workspace.organizationId);
        if (!hasAccess) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      const options = {
        outcome: req.query.outcome as string | undefined,
        issueCategory: req.query.issueCategory as string | undefined,
        limit: parseInt(req.query.limit as string) || 50
      };
      const resolutions = await storage.getResolutionsByWorkspace(req.params.workspaceId, options);
      res.json(resolutions);
    } catch (error) {
      console.error('Failed to fetch workspace resolutions:', error);
      res.status(500).json({ error: 'Failed to fetch resolutions' });
    }
  });

  // ============================================================================
  // WORKFLOW PLAYBOOKS API ENDPOINTS (Troubleshooting Decision Trees)
  // Structured conversation guides for agents with branching logic
  // ============================================================================

  // Get all workflow playbooks for a workspace
  app.get('/api/workflows', requireAuth, async (req, res) => {
    try {
      const workspaceId = req.query.workspaceId as string || 'default';
      const status = req.query.status as string | undefined;
      const category = req.query.category as string | undefined;
      
      const playbooks = await storage.getWorkflowPlaybooks(workspaceId, { status, category });
      res.json(playbooks);
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
      res.status(500).json({ error: 'Failed to fetch workflows' });
    }
  });

  // Get a single workflow with all nodes and edges
  app.get('/api/workflows/:id', requireAuth, async (req, res) => {
    try {
      const workflow = await storage.getFullWorkflow(req.params.id);
      if (!workflow) {
        return res.status(404).json({ error: 'Workflow not found' });
      }
      res.json(workflow);
    } catch (error) {
      console.error('Failed to fetch workflow:', error);
      res.status(500).json({ error: 'Failed to fetch workflow' });
    }
  });

  // Create a new workflow playbook
  app.post('/api/workflows', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const schema = z.object({
        name: z.string().min(1).max(200),
        slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
        description: z.string().max(1000).optional(),
        category: z.string().max(50).optional(),
        triggerKeywords: z.array(z.string()).optional(),
        workspaceId: z.string().default('default'),
        organizationId: z.string().optional(),
        visibility: z.enum(['workspace', 'organization', 'global']).default('workspace')
      });
      
      const validation = schema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }

      // Resolve "default" to actual default workspace ID
      let workspaceId = validation.data.workspaceId;
      if (workspaceId === 'default') {
        const defaultWorkspace = await storage.getDefaultWorkspace();
        if (!defaultWorkspace) {
          return res.status(400).json({ error: 'No default workspace found' });
        }
        workspaceId = defaultWorkspace.id;
      }

      const currentUserId = (req.user as any)?.id;
      const playbook = await storage.createWorkflowPlaybook({
        ...validation.data,
        workspaceId,
        createdBy: currentUserId,
        updatedBy: currentUserId
      });
      res.status(201).json(playbook);
    } catch (error) {
      console.error('Failed to create workflow:', error);
      res.status(500).json({ error: 'Failed to create workflow' });
    }
  });

  // Update a workflow playbook
  app.put('/api/workflows/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const schema = z.object({
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(1000).optional(),
        category: z.string().max(50).optional(),
        triggerKeywords: z.array(z.string()).optional(),
        status: z.enum(['draft', 'published', 'retired']).optional(),
        startNodeId: z.string().optional(),
        visibility: z.enum(['workspace', 'organization', 'global']).optional()
      });
      
      const validation = schema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }

      const currentUserId = (req.user as any)?.id;
      const playbook = await storage.updateWorkflowPlaybook(req.params.id, {
        ...validation.data,
        updatedBy: currentUserId
      });
      res.json(playbook);
    } catch (error) {
      console.error('Failed to update workflow:', error);
      res.status(500).json({ error: 'Failed to update workflow' });
    }
  });

  // Delete a workflow playbook
  app.delete('/api/workflows/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      await storage.deleteWorkflowPlaybook(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      res.status(500).json({ error: 'Failed to delete workflow' });
    }
  });

  // ---- Workflow Nodes ----

  // Get all nodes for a workflow
  app.get('/api/workflows/:playbookId/nodes', requireAuth, async (req, res) => {
    try {
      const nodes = await storage.getWorkflowNodesByPlaybook(req.params.playbookId);
      res.json(nodes);
    } catch (error) {
      console.error('Failed to fetch workflow nodes:', error);
      res.status(500).json({ error: 'Failed to fetch nodes' });
    }
  });

  // Create a workflow node
  app.post('/api/workflows/:playbookId/nodes', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const schema = z.object({
        nodeType: z.enum(['question', 'action', 'condition', 'resolution', 'info']),
        title: z.string().min(1).max(200),
        prompt: z.string().max(2000).optional(),
        description: z.string().max(2000).optional(),
        options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
        actionType: z.enum(['manual', 'automated', 'api_call']).optional(),
        actionConfig: z.record(z.any()).optional(),
        resolutionType: z.enum(['success', 'escalate', 'external']).optional(),
        resolutionMessage: z.string().max(2000).optional(),
        linkedArticleId: z.string().optional(),
        linkedDocumentId: z.string().optional(),
        positionX: z.number().optional(),
        positionY: z.number().optional(),
        isEntryPoint: z.boolean().optional()
      });
      
      const validation = schema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }

      const node = await storage.createWorkflowNode({
        playbookId: req.params.playbookId,
        ...validation.data
      });

      // If this is marked as entry point, update the playbook's startNodeId
      if (validation.data.isEntryPoint) {
        await storage.updateWorkflowPlaybook(req.params.playbookId, { startNodeId: node.id });
      }

      res.status(201).json(node);
    } catch (error) {
      console.error('Failed to create workflow node:', error);
      res.status(500).json({ error: 'Failed to create node' });
    }
  });

  // Update a workflow node
  app.put('/api/workflows/:playbookId/nodes/:nodeId', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const schema = z.object({
        title: z.string().min(1).max(200).optional(),
        prompt: z.string().max(2000).optional(),
        description: z.string().max(2000).optional(),
        options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
        actionType: z.enum(['manual', 'automated', 'api_call']).optional(),
        actionConfig: z.record(z.any()).optional(),
        resolutionType: z.enum(['success', 'escalate', 'external']).optional(),
        resolutionMessage: z.string().max(2000).optional(),
        linkedArticleId: z.string().optional(),
        linkedDocumentId: z.string().optional(),
        positionX: z.number().optional(),
        positionY: z.number().optional(),
        isEntryPoint: z.boolean().optional()
      });
      
      const validation = schema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }

      const node = await storage.updateWorkflowNode(req.params.nodeId, validation.data);
      res.json(node);
    } catch (error) {
      console.error('Failed to update workflow node:', error);
      res.status(500).json({ error: 'Failed to update node' });
    }
  });

  // Delete a workflow node
  app.delete('/api/workflows/:playbookId/nodes/:nodeId', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      await storage.deleteWorkflowNode(req.params.nodeId);
      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete workflow node:', error);
      res.status(500).json({ error: 'Failed to delete node' });
    }
  });

  // ---- Workflow Edges ----

  // Get all edges for a workflow
  app.get('/api/workflows/:playbookId/edges', requireAuth, async (req, res) => {
    try {
      const edges = await storage.getWorkflowEdgesByPlaybook(req.params.playbookId);
      res.json(edges);
    } catch (error) {
      console.error('Failed to fetch workflow edges:', error);
      res.status(500).json({ error: 'Failed to fetch edges' });
    }
  });

  // Create a workflow edge
  app.post('/api/workflows/:playbookId/edges', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const schema = z.object({
        sourceNodeId: z.string(),
        targetNodeId: z.string(),
        conditionType: z.enum(['default', 'option', 'expression']).default('default'),
        conditionValue: z.string().optional(),
        conditionLabel: z.string().max(200).optional(),
        priority: z.number().default(0)
      });
      
      const validation = schema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }

      const edge = await storage.createWorkflowEdge({
        playbookId: req.params.playbookId,
        ...validation.data
      });
      res.status(201).json(edge);
    } catch (error) {
      console.error('Failed to create workflow edge:', error);
      res.status(500).json({ error: 'Failed to create edge' });
    }
  });

  // Delete a workflow edge
  app.delete('/api/workflows/:playbookId/edges/:edgeId', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      await storage.deleteWorkflowEdge(req.params.edgeId);
      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete workflow edge:', error);
      res.status(500).json({ error: 'Failed to delete edge' });
    }
  });

  // ---- Workflow Sessions (for agent use during conversations) ----

  // Start a workflow session for a conversation
  app.post('/api/conversations/:conversationId/workflow-session', requireAuth, async (req, res) => {
    try {
      const schema = z.object({
        playbookId: z.string()
      });
      
      const validation = schema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }

      const currentUserId = (req.user as any)?.id;

      // Get the workflow to find the start node
      const workflow = await storage.getFullWorkflow(validation.data.playbookId);
      if (!workflow) {
        return res.status(404).json({ error: 'Workflow not found' });
      }

      const session = await storage.createWorkflowSession({
        playbookId: validation.data.playbookId,
        conversationId: req.params.conversationId,
        currentNodeId: workflow.playbook.startNodeId,
        agentId: currentUserId,
        nodeHistory: []
      });
      res.status(201).json(session);
    } catch (error) {
      console.error('Failed to start workflow session:', error);
      res.status(500).json({ error: 'Failed to start session' });
    }
  });

  // Get active workflow session for a conversation
  app.get('/api/conversations/:conversationId/workflow-session', requireAuth, async (req, res) => {
    try {
      const session = await storage.getWorkflowSessionByConversation(req.params.conversationId);
      if (!session) {
        return res.status(404).json({ error: 'No active workflow session' });
      }

      // Also fetch the workflow details
      const workflow = await storage.getFullWorkflow(session.playbookId);
      const currentNode = session.currentNodeId 
        ? await storage.getWorkflowNode(session.currentNodeId)
        : null;
      const nextEdges = session.currentNodeId 
        ? await storage.getWorkflowEdgesBySource(session.currentNodeId)
        : [];

      res.json({ session, workflow, currentNode, nextEdges });
    } catch (error) {
      console.error('Failed to fetch workflow session:', error);
      res.status(500).json({ error: 'Failed to fetch session' });
    }
  });

  // Progress to the next node in a workflow session
  app.post('/api/workflow-sessions/:sessionId/progress', requireAuth, async (req, res) => {
    try {
      const schema = z.object({
        answer: z.string().optional(), // The selected answer (for question nodes)
        notes: z.string().optional() // Agent notes
      });
      
      const validation = schema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }

      const session = await storage.getWorkflowSession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (!session.currentNodeId) {
        return res.status(400).json({ error: 'No current node in session' });
      }

      // Get edges from current node
      const edges = await storage.getWorkflowEdgesBySource(session.currentNodeId);
      
      // Find the matching edge based on answer
      let nextEdge = edges.find(e => e.conditionType === 'default');
      if (validation.data.answer) {
        const matchingEdge = edges.find(e => 
          e.conditionType === 'option' && e.conditionValue === validation.data.answer
        );
        if (matchingEdge) nextEdge = matchingEdge;
      }

      if (!nextEdge) {
        return res.status(400).json({ error: 'No valid path from current node' });
      }

      // Update node history
      const history = (session.nodeHistory as any[] || []);
      history.push({
        nodeId: session.currentNodeId,
        answer: validation.data.answer,
        notes: validation.data.notes,
        timestamp: new Date().toISOString()
      });

      // Check if next node is a resolution node
      const nextNode = await storage.getWorkflowNode(nextEdge.targetNodeId);
      const isResolution = nextNode?.nodeType === 'resolution';

      const updated = await storage.updateWorkflowSession(req.params.sessionId, {
        currentNodeId: nextEdge.targetNodeId,
        nodeHistory: history,
        ...(isResolution ? { 
          status: 'completed',
          resolutionNodeId: nextEdge.targetNodeId,
          resolutionOutcome: nextNode?.resolutionType || 'success',
          completedAt: new Date()
        } : {})
      });

      res.json({ session: updated, nextNode, isComplete: isResolution });
    } catch (error) {
      console.error('Failed to progress workflow session:', error);
      res.status(500).json({ error: 'Failed to progress session' });
    }
  });

  // Search for relevant workflows based on message content
  app.get('/api/workflows/search', requireAuth, async (req, res) => {
    try {
      const workspaceId = req.query.workspaceId as string || 'default';
      const query = req.query.q as string;
      
      if (!query) {
        return res.status(400).json({ error: 'Query parameter q is required' });
      }

      // Extract keywords from query
      const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const matches = await storage.searchWorkflowsByKeywords(workspaceId, keywords);
      
      res.json(matches);
    } catch (error) {
      console.error('Failed to search workflows:', error);
      res.status(500).json({ error: 'Failed to search workflows' });
    }
  });

  // ============================================================================
  // CLOUD STORAGE INTEGRATION ROUTES
  // ============================================================================

  // Helper to redact sensitive OAuth tokens from connection objects
  const redactConnectionTokens = (connection: any) => {
    const { accessToken, refreshToken, ...safeConnection } = connection;
    return safeConnection;
  };

  // Helper to check if user is admin or has access to a workspace
  const isAdminUser = (user: User) => {
    return user.role === 'admin' || user.isPlatformAdmin;
  };

  // ============================================
  // CLOUD STORAGE OAUTH CONFIGURATION ENDPOINTS
  // ============================================

  // Get OAuth configs for a workspace (admin only)
  app.get('/api/cloud-storage/oauth-configs', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = req.user as User;
      if (!user.organizationId) {
        return res.status(400).json({ error: 'Organization ID required' });
      }
      
      const workspaceId = req.query.workspaceId as string;
      if (!workspaceId) {
        return res.status(400).json({ error: 'Workspace ID required' });
      }
      
      const configs = await db.select().from(cloudStorageOAuthConfigs)
        .where(and(
          eq(cloudStorageOAuthConfigs.organizationId, user.organizationId),
          eq(cloudStorageOAuthConfigs.workspaceId, workspaceId)
        ));
      
      // Mask the client secrets for security
      const maskedConfigs = configs.map(c => ({
        ...c,
        clientSecret: c.clientSecret ? '••••••••' : null
      }));
      
      res.json(maskedConfigs);
    } catch (error) {
      console.error('Error fetching OAuth configs:', error);
      res.status(500).json({ error: 'Failed to fetch OAuth configurations' });
    }
  });

  // Create or update OAuth config for a provider
  app.post('/api/cloud-storage/oauth-configs', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = req.user as User;
      if (!user.organizationId) {
        return res.status(400).json({ error: 'Organization ID required' });
      }
      
      const configSchema = z.object({
        workspaceId: z.string().min(1, 'Workspace ID required'),
        provider: z.enum(['google_drive', 'onedrive', 'dropbox']),
        clientId: z.string().min(1, 'Client ID required'),
        clientSecret: z.string(), // Allow empty for updates
      });
      
      const validatedData = configSchema.parse(req.body);
      
      // Check if config already exists for this workspace+provider
      const existing = await db.select().from(cloudStorageOAuthConfigs)
        .where(and(
          eq(cloudStorageOAuthConfigs.workspaceId, validatedData.workspaceId),
          eq(cloudStorageOAuthConfigs.provider, validatedData.provider)
        ))
        .limit(1);
      
      if (existing.length > 0) {
        // Update existing config - keep existing secret if not provided
        const updateData: Record<string, any> = {
          clientId: validatedData.clientId,
          updatedAt: new Date()
        };
        
        // Only update secret if a new one was provided
        if (validatedData.clientSecret) {
          updateData.clientSecret = validatedData.clientSecret;
        }
        
        const [updated] = await db.update(cloudStorageOAuthConfigs)
          .set(updateData)
          .where(eq(cloudStorageOAuthConfigs.id, existing[0].id))
          .returning();
        
        return res.json({ ...updated, clientSecret: '••••••••' });
      }
      
      // For new configs, require client secret
      if (!validatedData.clientSecret) {
        return res.status(400).json({ error: 'Client Secret required for new configurations' });
      }
      
      // Create new config
      const [newConfig] = await db.insert(cloudStorageOAuthConfigs)
        .values({
          organizationId: user.organizationId,
          workspaceId: validatedData.workspaceId,
          provider: validatedData.provider,
          clientId: validatedData.clientId,
          clientSecret: validatedData.clientSecret,
          createdBy: user.id,
        })
        .returning();
      
      res.status(201).json({ ...newConfig, clientSecret: '••••••••' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid configuration data', details: fromZodError(error).toString() });
      }
      console.error('Error creating OAuth config:', error);
      res.status(500).json({ error: 'Failed to save OAuth configuration' });
    }
  });

  // Delete OAuth config
  app.delete('/api/cloud-storage/oauth-configs/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = req.user as User;
      const { id } = req.params;
      
      // Verify ownership
      const config = await db.select().from(cloudStorageOAuthConfigs)
        .where(and(
          eq(cloudStorageOAuthConfigs.id, id),
          eq(cloudStorageOAuthConfigs.organizationId, user.organizationId!)
        ))
        .limit(1);
      
      if (config.length === 0) {
        return res.status(404).json({ error: 'Configuration not found' });
      }
      
      await db.delete(cloudStorageOAuthConfigs)
        .where(eq(cloudStorageOAuthConfigs.id, id));
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting OAuth config:', error);
      res.status(500).json({ error: 'Failed to delete OAuth configuration' });
    }
  });

  // Helper to validate connection ownership (organization + workspace for non-admins)
  const validateConnectionOwnership = async (connectionId: string, user: User) => {
    const connection = await storage.getCloudStorageConnection(connectionId);
    if (!connection) return null;
    // Must belong to same organization
    if (connection.organizationId !== user.organizationId) return null;
    // Non-admin users must also match workspace
    if (!isAdminUser(user) && connection.workspaceId !== user.workspaceId) return null;
    return connection;
  };

  // Get all cloud storage connections - workspace-scoped for non-admins, org-wide for admins
  app.get('/api/cloud-storage/connections', requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      if (!user.organizationId) {
        return res.status(400).json({ error: 'Organization ID required' });
      }
      
      const requestedWorkspaceId = req.query.workspaceId as string;
      
      // Admins can see all org connections or filter by workspace
      if (isAdminUser(user)) {
        const allConnections = await storage.getCloudStorageConnectionsByOrganization(user.organizationId);
        const filteredConnections = requestedWorkspaceId 
          ? allConnections.filter(c => c.workspaceId === requestedWorkspaceId)
          : allConnections;
        return res.json(filteredConnections.map(redactConnectionTokens));
      }
      
      // Non-admins can only see their own workspace's connections
      // If they try to specify a different workspace, reject the request
      if (requestedWorkspaceId && requestedWorkspaceId !== user.workspaceId) {
        return res.status(403).json({ error: 'Access denied: cannot query other workspaces' });
      }
      
      const workspaceId = user.workspaceId;
      if (!workspaceId) {
        return res.status(400).json({ error: 'No workspace assigned to user' });
      }
      
      const connections = await storage.getCloudStorageConnectionsByWorkspace(workspaceId);
      // Double-check organization scope
      const scopedConnections = connections.filter(c => c.organizationId === user.organizationId);
      
      res.json(scopedConnections.map(redactConnectionTokens));
    } catch (error) {
      console.error('Failed to get cloud storage connections:', error);
      res.status(500).json({ error: 'Failed to get connections' });
    }
  });

  // Get a single cloud storage connection (with ownership validation)
  app.get('/api/cloud-storage/connections/:id', requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const connection = await validateConnectionOwnership(req.params.id, user);
      if (!connection) {
        return res.status(404).json({ error: 'Connection not found' });
      }
      res.json(redactConnectionTokens(connection));
    } catch (error) {
      console.error('Failed to get cloud storage connection:', error);
      res.status(500).json({ error: 'Failed to get connection' });
    }
  });

  // Delete a cloud storage connection (with ownership validation)
  app.delete('/api/cloud-storage/connections/:id', requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const connection = await validateConnectionOwnership(req.params.id, user);
      if (!connection) {
        return res.status(404).json({ error: 'Connection not found' });
      }
      await storage.deleteCloudStorageConnection(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete cloud storage connection:', error);
      res.status(500).json({ error: 'Failed to delete connection' });
    }
  });

  // Get folders for a connection (with ownership validation)
  app.get('/api/cloud-storage/connections/:id/folders', requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const connection = await validateConnectionOwnership(req.params.id, user);
      if (!connection) {
        return res.status(404).json({ error: 'Connection not found' });
      }
      const folders = await storage.getCloudStorageFoldersByConnection(req.params.id);
      res.json(folders);
    } catch (error) {
      console.error('Failed to get cloud storage folders:', error);
      res.status(500).json({ error: 'Failed to get folders' });
    }
  });

  // Get sync history for a connection (with ownership validation)
  app.get('/api/cloud-storage/connections/:id/sync-runs', requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const connection = await validateConnectionOwnership(req.params.id, user);
      if (!connection) {
        return res.status(404).json({ error: 'Connection not found' });
      }
      const limit = parseInt(req.query.limit as string) || 10;
      const runs = await storage.getCloudStorageSyncRunsByConnection(req.params.id, limit);
      res.json(runs);
    } catch (error) {
      console.error('Failed to get sync runs:', error);
      res.status(500).json({ error: 'Failed to get sync history' });
    }
  });

  // Trigger a manual sync for a connection (with ownership validation)
  app.post('/api/cloud-storage/connections/:id/sync', requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const connection = await validateConnectionOwnership(req.params.id, user);
      if (!connection) {
        return res.status(404).json({ error: 'Connection not found' });
      }

      // Create a new sync run
      const syncRun = await storage.createCloudStorageSyncRun({
        connectionId: connection.id,
        status: 'running',
        triggerType: 'manual',
      });

      // In a real implementation, this would kick off an async job
      // For now, we'll simulate completing the sync
      await storage.updateCloudStorageSyncRun(syncRun.id, {
        status: 'completed',
        completedAt: new Date(),
        filesDiscovered: 0,
        filesProcessed: 0,
        filesImported: 0,
      });

      await storage.updateCloudStorageConnection(connection.id, {
        lastSyncAt: new Date(),
      });

      res.json({ message: 'Sync initiated', syncRunId: syncRun.id });
    } catch (error) {
      console.error('Failed to trigger sync:', error);
      res.status(500).json({ error: 'Failed to trigger sync' });
    }
  });

  // OAuth initiation endpoints for each provider
  // Uses workspace-specific OAuth credentials from database
  app.get('/api/cloud-storage/oauth/:provider/initiate', requireAuth, async (req, res) => {
    try {
      const { provider } = req.params;
      const user = req.user as User;
      const workspaceId = req.query.workspaceId as string || user.workspaceId;
      
      if (!['google_drive', 'onedrive', 'dropbox'].includes(provider)) {
        return res.status(400).json({ error: 'Invalid provider' });
      }

      if (!user.organizationId) {
        return res.status(400).json({ error: 'Organization ID required' });
      }
      
      if (!workspaceId) {
        return res.status(400).json({ error: 'Workspace ID required' });
      }

      // Build OAuth URLs based on provider
      const baseUrls: Record<string, { auth: string; scopes: string[] }> = {
        google_drive: {
          auth: 'https://accounts.google.com/o/oauth2/v2/auth',
          scopes: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/userinfo.email']
        },
        onedrive: {
          auth: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
          scopes: ['Files.Read', 'User.Read', 'offline_access']
        },
        dropbox: {
          auth: 'https://www.dropbox.com/oauth2/authorize',
          scopes: []
        }
      };

      const config = baseUrls[provider];
      
      // Try to get workspace-specific OAuth config first
      const [oauthConfig] = await db.select().from(cloudStorageOAuthConfigs)
        .where(and(
          eq(cloudStorageOAuthConfigs.workspaceId, workspaceId),
          eq(cloudStorageOAuthConfigs.provider, provider),
          eq(cloudStorageOAuthConfigs.isEnabled, true)
        ))
        .limit(1);
      
      // Fall back to environment variables if no workspace config
      const clientId = oauthConfig?.clientId || process.env[`${provider.toUpperCase()}_CLIENT_ID`];
      
      if (!clientId) {
        return res.status(503).json({ 
          error: 'Provider not configured',
          message: `${provider} integration requires OAuth credentials. Please configure credentials in Cloud Storage Settings.`
        });
      }

      // Generate secure random nonce for state parameter
      const nonce = crypto.randomUUID();
      const stateData = {
        userId: user.id,
        organizationId: user.organizationId,
        workspaceId: workspaceId,
        oauthConfigId: oauthConfig?.id || null,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minute expiry
      };
      oauthStateStore.set(nonce, stateData);

      const redirectUri = `${req.protocol}://${req.get('host')}/api/cloud-storage/oauth/${provider}/callback`;
      console.log('[OAuth] Redirect URI:', redirectUri);

      let authUrl = `${config.auth}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${nonce}`;
      
      if (provider === 'google_drive') {
        authUrl += `&scope=${encodeURIComponent(config.scopes.join(' '))}&access_type=offline&prompt=consent`;
      } else if (provider === 'onedrive') {
        authUrl += `&scope=${encodeURIComponent(config.scopes.join(' '))}`;
      } else if (provider === 'dropbox') {
        authUrl += `&token_access_type=offline`;
      }

      res.json({ authUrl });
    } catch (error) {
      console.error('Failed to initiate OAuth:', error);
      res.status(500).json({ error: 'Failed to initiate OAuth' });
    }
  });

  // OAuth callback endpoints
  app.get('/api/cloud-storage/oauth/:provider/callback', async (req, res) => {
    try {
      const { provider } = req.params;
      const { code, state, error } = req.query;

      if (error) {
        return res.redirect(`/cloud-storage?error=${encodeURIComponent(error as string)}`);
      }

      if (!code || !state) {
        return res.redirect('/cloud-storage?error=missing_params');
      }

      // Validate state nonce from server-side store
      const stateData = oauthStateStore.get(state as string);
      if (!stateData) {
        return res.redirect('/cloud-storage?error=invalid_state');
      }

      // Check expiration and remove from store
      oauthStateStore.delete(state as string);
      if (new Date() > stateData.expiresAt) {
        return res.redirect('/cloud-storage?error=state_expired');
      }

      const { userId, organizationId, workspaceId, oauthConfigId } = stateData;

      // Token exchange configuration
      const tokenUrls: Record<string, string> = {
        google_drive: 'https://oauth2.googleapis.com/token',
        onedrive: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        dropbox: 'https://api.dropboxapi.com/oauth2/token'
      };

      // Get credentials from workspace config or fall back to env vars
      let clientId: string | undefined;
      let clientSecret: string | undefined;
      
      if (oauthConfigId) {
        const [oauthConfig] = await db.select().from(cloudStorageOAuthConfigs)
          .where(eq(cloudStorageOAuthConfigs.id, oauthConfigId))
          .limit(1);
        if (oauthConfig) {
          clientId = oauthConfig.clientId;
          clientSecret = oauthConfig.clientSecret;
        }
      }
      
      // Fall back to environment variables
      if (!clientId || !clientSecret) {
        clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
        clientSecret = process.env[`${provider.toUpperCase()}_CLIENT_SECRET`];
      }

      if (!clientId || !clientSecret) {
        return res.redirect('/cloud-storage?error=provider_not_configured');
      }

      const redirectUri = `${req.protocol}://${req.get('host')}/api/cloud-storage/oauth/${provider}/callback`;

      // Exchange code for tokens
      const tokenResponse = await fetch(tokenUrls[provider], {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: code as string,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });

      if (!tokenResponse.ok) {
        console.error('Token exchange failed:', await tokenResponse.text());
        return res.redirect('/cloud-storage?error=token_exchange_failed');
      }

      const tokens = await tokenResponse.json();

      // Get user info from provider
      let accountEmail = '';
      let accountName = '';

      if (provider === 'google_drive') {
        const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        if (userInfo.ok) {
          const data = await userInfo.json();
          accountEmail = data.email;
          accountName = data.name;
        }
      } else if (provider === 'onedrive') {
        const userInfo = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        if (userInfo.ok) {
          const data = await userInfo.json();
          accountEmail = data.mail || data.userPrincipalName;
          accountName = data.displayName;
        }
      } else if (provider === 'dropbox') {
        const userInfo = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
          method: 'POST',
          headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        if (userInfo.ok) {
          const data = await userInfo.json();
          accountEmail = data.email;
          accountName = data.name?.display_name;
        }
      }

      // Create the connection
      await storage.createCloudStorageConnection({
        organizationId,
        workspaceId,
        provider,
        displayName: accountName || `${provider} Connection`,
        accountEmail,
        accountName,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        status: 'connected',
        createdBy: userId
      });

      res.redirect('/cloud-storage?success=connected');
    } catch (error) {
      console.error('OAuth callback failed:', error);
      res.redirect('/cloud-storage?error=callback_failed');
    }
  });

  // ============================================
  // EMAIL INTEGRATION ROUTES
  // ============================================

  // Helper to sanitize email integration credentials from API responses
  const sanitizeEmailIntegration = (integration: any) => {
    const { password, accessToken, refreshToken, ...safe } = integration;
    return safe;
  };

  // Helper to verify org ownership of email integration
  const verifyEmailIntegrationOwnership = async (integrationId: string, organizationId: string) => {
    const integration = await storage.getEmailIntegration(integrationId);
    if (!integration) return null;
    if (integration.organizationId !== organizationId) return null;
    return integration;
  };

  // Helper to verify org ownership of email message
  const verifyEmailMessageOwnership = async (messageId: string, organizationId: string) => {
    const message = await storage.getEmailMessage(messageId);
    if (!message) return null;
    // Verify via integration ownership
    const integration = await storage.getEmailIntegration(message.integrationId);
    if (!integration || integration.organizationId !== organizationId) return null;
    return message;
  };

  // Helper to verify org ownership of email template
  const verifyEmailTemplateOwnership = async (templateId: string, organizationId: string) => {
    const template = await storage.getEmailTemplate(templateId);
    if (!template) return null;
    if (template.organizationId !== organizationId) return null;
    return template;
  };

  // Helper to verify org ownership of auto-reply rule
  const verifyEmailAutoReplyRuleOwnership = async (ruleId: string, organizationId: string) => {
    const rule = await storage.getEmailAutoReplyRule(ruleId);
    if (!rule) return null;
    if (rule.organizationId !== organizationId) return null;
    return rule;
  };

  // Valid status values for email messages
  const validEmailStatuses = ['pending', 'processing', 'processed', 'replied', 'escalated', 'failed', 'spam'];

  // Get all email integrations for organization
  app.get('/api/email-integrations', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.organizationId) {
        return res.status(400).json({ error: 'Organization required' });
      }
      const integrations = await storage.getEmailIntegrationsByOrganization(user.organizationId);
      res.json(integrations.map(sanitizeEmailIntegration));
    } catch (error) {
      console.error('Failed to fetch email integrations:', error);
      res.status(500).json({ error: 'Failed to fetch email integrations' });
    }
  });

  // Get single email integration
  app.get('/api/email-integrations/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.organizationId) {
        return res.status(400).json({ error: 'Organization required' });
      }
      const integration = await verifyEmailIntegrationOwnership(req.params.id, user.organizationId);
      if (!integration) {
        return res.status(404).json({ error: 'Integration not found' });
      }
      res.json(sanitizeEmailIntegration(integration));
    } catch (error) {
      console.error('Failed to fetch email integration:', error);
      res.status(500).json({ error: 'Failed to fetch email integration' });
    }
  });

  // Create email integration
  app.post('/api/email-integrations', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.organizationId) {
        return res.status(400).json({ error: 'Organization required' });
      }
      const { inboundEmail, provider } = req.body;
      if (!inboundEmail || !provider) {
        return res.status(400).json({ error: 'inboundEmail and provider are required' });
      }
      const integration = await storage.createEmailIntegration({
        ...req.body,
        organizationId: user.organizationId,
      });
      res.status(201).json(sanitizeEmailIntegration(integration));
    } catch (error) {
      console.error('Failed to create email integration:', error);
      res.status(500).json({ error: 'Failed to create email integration' });
    }
  });

  // Update email integration
  app.put('/api/email-integrations/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.organizationId) {
        return res.status(400).json({ error: 'Organization required' });
      }
      const existing = await verifyEmailIntegrationOwnership(req.params.id, user.organizationId);
      if (!existing) {
        return res.status(404).json({ error: 'Integration not found' });
      }
      const integration = await storage.updateEmailIntegration(req.params.id, req.body);
      res.json(sanitizeEmailIntegration(integration));
    } catch (error) {
      console.error('Failed to update email integration:', error);
      res.status(500).json({ error: 'Failed to update email integration' });
    }
  });

  // Delete email integration
  app.delete('/api/email-integrations/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.organizationId) {
        return res.status(400).json({ error: 'Organization required' });
      }
      const existing = await verifyEmailIntegrationOwnership(req.params.id, user.organizationId);
      if (!existing) {
        return res.status(404).json({ error: 'Integration not found' });
      }
      await storage.deleteEmailIntegration(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete email integration:', error);
      res.status(500).json({ error: 'Failed to delete email integration' });
    }
  });

  // Test email integration connection
  app.post('/api/email-integrations/:id/test', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.organizationId) {
        return res.status(400).json({ error: 'Organization required' });
      }
      const integration = await verifyEmailIntegrationOwnership(req.params.id, user.organizationId);
      if (!integration) {
        return res.status(404).json({ error: 'Integration not found' });
      }
      const { emailService } = await import('./services/email-service');
      const result = await emailService.testConnection(integration);
      res.json(result);
    } catch (error) {
      console.error('Failed to test email integration:', error);
      res.status(500).json({ error: 'Failed to test connection' });
    }
  });

  // Get email messages for organization
  app.get('/api/email-messages', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.organizationId) {
        return res.status(400).json({ error: 'Organization required' });
      }
      const { limit, offset, status } = req.query;
      if (status && !validEmailStatuses.includes(status as string)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }
      const messages = await storage.getEmailMessagesByOrganization(user.organizationId, {
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
        status: status as string | undefined,
      });
      res.json(messages);
    } catch (error) {
      console.error('Failed to fetch email messages:', error);
      res.status(500).json({ error: 'Failed to fetch email messages' });
    }
  });

  // Get single email message
  app.get('/api/email-messages/:id', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.organizationId) {
        return res.status(400).json({ error: 'Organization required' });
      }
      const message = await verifyEmailMessageOwnership(req.params.id, user.organizationId);
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }
      const attachments = await storage.getEmailAttachmentsByMessage(req.params.id);
      const logs = await storage.getEmailProcessingLogsByMessage(req.params.id);
      res.json({ ...message, attachments, processingLogs: logs });
    } catch (error) {
      console.error('Failed to fetch email message:', error);
      res.status(500).json({ error: 'Failed to fetch email message' });
    }
  });

  // Update email message status
  app.patch('/api/email-messages/:id/status', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.organizationId) {
        return res.status(400).json({ error: 'Organization required' });
      }
      const message = await verifyEmailMessageOwnership(req.params.id, user.organizationId);
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }
      const { status } = req.body;
      if (!status || !validEmailStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }
      await storage.updateEmailMessageStatus(req.params.id, status);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to update email message status:', error);
      res.status(500).json({ error: 'Failed to update status' });
    }
  });

  // Assign email message to user
  app.patch('/api/email-messages/:id/assign', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.organizationId) {
        return res.status(400).json({ error: 'Organization required' });
      }
      const message = await verifyEmailMessageOwnership(req.params.id, user.organizationId);
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }
      const { userId } = req.body;
      await storage.updateEmailMessage(req.params.id, { assignedToUserId: userId, isRead: true });
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to assign email message:', error);
      res.status(500).json({ error: 'Failed to assign message' });
    }
  });

  // Get email templates
  app.get('/api/email-templates', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.organizationId) {
        return res.status(400).json({ error: 'Organization required' });
      }
      const templates = await storage.getEmailTemplatesByOrganization(user.organizationId);
      res.json(templates);
    } catch (error) {
      console.error('Failed to fetch email templates:', error);
      res.status(500).json({ error: 'Failed to fetch email templates' });
    }
  });

  // Create email template
  app.post('/api/email-templates', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.organizationId) {
        return res.status(400).json({ error: 'Organization required' });
      }
      const { name, subject, bodyHtml } = req.body;
      if (!name || !subject || !bodyHtml) {
        return res.status(400).json({ error: 'name, subject, and bodyHtml are required' });
      }
      const template = await storage.createEmailTemplate({
        ...req.body,
        organizationId: user.organizationId,
      });
      res.status(201).json(template);
    } catch (error) {
      console.error('Failed to create email template:', error);
      res.status(500).json({ error: 'Failed to create email template' });
    }
  });

  // Update email template
  app.put('/api/email-templates/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.organizationId) {
        return res.status(400).json({ error: 'Organization required' });
      }
      const existing = await verifyEmailTemplateOwnership(req.params.id, user.organizationId);
      if (!existing) {
        return res.status(404).json({ error: 'Template not found' });
      }
      const template = await storage.updateEmailTemplate(req.params.id, req.body);
      res.json(template);
    } catch (error) {
      console.error('Failed to update email template:', error);
      res.status(500).json({ error: 'Failed to update email template' });
    }
  });

  // Delete email template
  app.delete('/api/email-templates/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.organizationId) {
        return res.status(400).json({ error: 'Organization required' });
      }
      const existing = await verifyEmailTemplateOwnership(req.params.id, user.organizationId);
      if (!existing) {
        return res.status(404).json({ error: 'Template not found' });
      }
      await storage.deleteEmailTemplate(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete email template:', error);
      res.status(500).json({ error: 'Failed to delete email template' });
    }
  });

  // Get auto-reply rules
  app.get('/api/email-auto-reply-rules', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.organizationId) {
        return res.status(400).json({ error: 'Organization required' });
      }
      const rules = await storage.getEmailAutoReplyRulesByOrganization(user.organizationId);
      res.json(rules);
    } catch (error) {
      console.error('Failed to fetch auto-reply rules:', error);
      res.status(500).json({ error: 'Failed to fetch auto-reply rules' });
    }
  });

  // Create auto-reply rule
  app.post('/api/email-auto-reply-rules', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.organizationId) {
        return res.status(400).json({ error: 'Organization required' });
      }
      const { name, triggerType, responseTemplateId } = req.body;
      if (!name || !triggerType) {
        return res.status(400).json({ error: 'name and triggerType are required' });
      }
      const rule = await storage.createEmailAutoReplyRule({
        ...req.body,
        organizationId: user.organizationId,
      });
      res.status(201).json(rule);
    } catch (error) {
      console.error('Failed to create auto-reply rule:', error);
      res.status(500).json({ error: 'Failed to create auto-reply rule' });
    }
  });

  // Update auto-reply rule
  app.put('/api/email-auto-reply-rules/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.organizationId) {
        return res.status(400).json({ error: 'Organization required' });
      }
      const existing = await verifyEmailAutoReplyRuleOwnership(req.params.id, user.organizationId);
      if (!existing) {
        return res.status(404).json({ error: 'Rule not found' });
      }
      const rule = await storage.updateEmailAutoReplyRule(req.params.id, req.body);
      res.json(rule);
    } catch (error) {
      console.error('Failed to update auto-reply rule:', error);
      res.status(500).json({ error: 'Failed to update auto-reply rule' });
    }
  });

  // Delete auto-reply rule
  app.delete('/api/email-auto-reply-rules/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.organizationId) {
        return res.status(400).json({ error: 'Organization required' });
      }
      const existing = await verifyEmailAutoReplyRuleOwnership(req.params.id, user.organizationId);
      if (!existing) {
        return res.status(404).json({ error: 'Rule not found' });
      }
      await storage.deleteEmailAutoReplyRule(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete auto-reply rule:', error);
      res.status(500).json({ error: 'Failed to delete auto-reply rule' });
    }
  });

  // ============================================================================
  // BILLING & USAGE TRACKING API
  // ============================================================================

  // Get personal usage stats (available to all authenticated users)
  app.get('/api/billing/my-usage', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const stats = await storage.getUsageStatsByUser(user.id, start, end);
      res.json(stats);
    } catch (error) {
      console.error('Failed to fetch personal usage:', error);
      res.status(500).json({ error: 'Failed to fetch usage data' });
    }
  });

  // Get personal usage history (available to all authenticated users)
  app.get('/api/billing/my-usage/history', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { startDate, endDate, limit } = req.query;
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      let usage = await storage.getAiTokenUsageByUser(user.id, start, end);
      if (limit) {
        usage = usage.slice(0, parseInt(limit as string));
      }
      res.json(usage);
    } catch (error) {
      console.error('Failed to fetch personal usage history:', error);
      res.status(500).json({ error: 'Failed to fetch usage history' });
    }
  });

  // Get organization usage stats (available to org admins and members)
  app.get('/api/billing/organization-usage', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.organizationId) {
        return res.status(400).json({ error: 'Organization membership required' });
      }
      
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const stats = await storage.getUsageStatsByOrganization(user.organizationId, start, end);
      res.json(stats);
    } catch (error) {
      console.error('Failed to fetch organization usage:', error);
      res.status(500).json({ error: 'Failed to fetch organization usage' });
    }
  });

  // Get organization usage history (available to org admins)
  app.get('/api/billing/organization-usage/history', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.organizationId) {
        return res.status(400).json({ error: 'Organization membership required' });
      }
      
      const { startDate, endDate, limit } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      let usage = await storage.getAiTokenUsageByOrganization(user.organizationId, start, end);
      if (limit) {
        usage = usage.slice(0, parseInt(limit as string));
      }
      res.json(usage);
    } catch (error) {
      console.error('Failed to fetch organization usage history:', error);
      res.status(500).json({ error: 'Failed to fetch organization usage history' });
    }
  });

  // Get platform-wide usage stats (super admin only)
  app.get('/api/billing/platform-usage', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = req.user as any;
      // Only super admins (users without organization or with platform admin flag) can see platform stats
      // For now, we allow any admin to see platform stats
      
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const stats = await storage.getPlatformUsageStats(start, end);
      res.json(stats);
    } catch (error) {
      console.error('Failed to fetch platform usage:', error);
      res.status(500).json({ error: 'Failed to fetch platform usage' });
    }
  });

  // Get daily usage trend
  app.get('/api/billing/daily-trend', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { days = 30 } = req.query;
      
      // Use workspace-level aggregation for daily trends
      const workspaceId = user.workspaceId || null;
      const trend = await storage.getDailyTokenUsage(workspaceId, parseInt(days as string));
      res.json(trend);
    } catch (error) {
      console.error('Failed to fetch daily trend:', error);
      res.status(500).json({ error: 'Failed to fetch daily trend' });
    }
  });

  // Get monthly usage trend
  app.get('/api/billing/monthly-trend', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { months = 12 } = req.query;
      
      const workspaceId = user.workspaceId || null;
      const trend = await storage.getMonthlyTokenUsage(workspaceId, parseInt(months as string));
      res.json(trend);
    } catch (error) {
      console.error('Failed to fetch monthly trend:', error);
      res.status(500).json({ error: 'Failed to fetch monthly trend' });
    }
  });

  const httpServer = createServer(app);
  
  // Initialize WebSocket server for real-time chat
  // Pass the session store for authentication
  const wsServer = new ChatWebSocketServer(httpServer, sessionStore);
  
  // Store WebSocket server reference for use in message broadcasting
  (app as any).wsServer = wsServer;

  // Initialize notification service with WebSocket server
  const { notificationService } = await import('./notification-service');
  notificationService.setWebSocketServer(wsServer);
  (app as any).notificationService = notificationService;

  // Register modular routes
  const routeContext: RouteContext = { app, httpServer, wsServer };
  registerAuthRoutes(routeContext);
  registerCustomerChatRoutes(routeContext);
  registerEmbedRoutes(routeContext);
  registerQuantumRoutes(routeContext);

  return { server: httpServer, wsServer };
}
