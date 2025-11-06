import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, unique, customType } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

const vector = customType<{ data: number[], driverData: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value);
  },
});

// Organizations table - for multi-tenant support
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // URL-friendly identifier (e.g., 'acme', 'techco')
  // Branding
  logo: text("logo"), // URL or path to logo
  primaryColor: text("primary_color").default("#2563eb"), // Hex color for primary brand color
  secondaryColor: text("secondary_color").default("#64748b"), // Hex color for secondary brand color
  // Custom domain support
  customDomain: text("custom_domain"), // e.g., 'support.acme.com'
  subdomain: text("subdomain"), // e.g., 'acme' for acme.supportboard.com
  // Organization settings
  welcomeMessage: text("welcome_message"), // Custom welcome message for customer chat
  aiEnabled: boolean("ai_enabled").notNull().default(true), // Enable/disable AI for this org
  knowledgeBaseEnabled: boolean("knowledge_base_enabled").notNull().default(true),
  // Contact info
  supportEmail: text("support_email"),
  supportPhone: text("support_phone"),
  website: text("website"),
  // Status
  status: text("status").notNull().default("active"), // 'active' | 'suspended' | 'trial'
  trialEndsAt: timestamp("trial_ends_at"), // For trial accounts
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Users table - for agents and admins
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("agent"), // 'agent' | 'admin'
  organizationId: varchar("organization_id").references(() => organizations.id), // Staff belong to organizations
  status: text("status").notNull().default("offline"), // 'online' | 'away' | 'busy' | 'offline'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Customers table
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"), // Customer phone number
  company: text("company"), // Optional company name / business name
  ipAddress: text("ip_address"), // Track IP for session management
  tags: text("tags").array(), // Array of tags for categorization
  status: text("status").notNull().default("offline"), // 'online' | 'away' | 'busy' | 'offline'
  organizationId: varchar("organization_id").references(() => organizations.id), // Multi-tenant organization scoping
  // Portal access fields
  portalPassword: text("portal_password"), // Hashed password for portal login (nullable - not all customers have portal access)
  hasPortalAccess: boolean("has_portal_access").notNull().default(false), // Whether customer can access portal
  portalLastLogin: timestamp("portal_last_login"), // Last time customer logged into portal
  // External sync fields
  externalId: text("external_id"), // ID from external system
  externalSystem: text("external_system"), // Name of external system (e.g., "zendesk", "jira")
  syncStatus: text("sync_status").default("not_synced"), // 'synced' | 'pending' | 'failed' | 'not_synced'
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Conversations table
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  assignedAgentId: varchar("assigned_agent_id").references(() => users.id),
  status: text("status").notNull().default("open"), // 'open' | 'pending' | 'resolved' | 'closed'
  priority: text("priority").notNull().default("medium"), // 'low' | 'medium' | 'high' | 'urgent'
  title: text("title"),
  isAnonymous: boolean("is_anonymous").notNull().default(false), // Track anonymous customer conversations
  sessionId: text("session_id"), // Track anonymous sessions before customer info collected
  followupDate: timestamp("followup_date"), // When this conversation needs follow-up (nullable)
  aiAssistanceEnabled: boolean("ai_assistance_enabled").notNull().default(true), // Toggle AI auto-response
  contextData: text("context_data"), // JSON string for custom context from 3rd party integrations (product info, page context, etc.)
  organizationId: varchar("organization_id").references(() => organizations.id), // Multi-tenant organization scoping
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Messages table
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id),
  senderId: varchar("sender_id").notNull(),
  senderType: text("sender_type").notNull(), // 'customer' | 'agent' | 'admin' | 'system' | 'ai'
  content: text("content").notNull(),
  scope: text("scope").notNull().default("public"), // 'public' | 'internal' - internal messages are staff-only
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  status: text("status").notNull().default("sent"), // 'sent' | 'delivered' | 'read'
});

// Notifications table - tracks per-user unread conversations
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  readAt: timestamp("read_at"),
});

// Message Reads table - tracks which messages each user has read (for per-message unread tracking)
export const messageReads = pgTable("message_reads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull().references(() => messages.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  readAt: timestamp("read_at").notNull().defaultNow(),
}, (table) => ({
  // Ensure each user can only mark a message as read once
  uniqueMessageUser: unique().on(table.messageId, table.userId),
}));

// Message Ratings table - tracks like/dislike ratings on messages
export const messageRatings = pgTable("message_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull().references(() => messages.id),
  userId: varchar("user_id").references(() => users.id), // Can be null for anonymous ratings
  customerId: varchar("customer_id").references(() => customers.id), // For customer ratings
  rating: text("rating").notNull(), // 'like' | 'dislike'
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  // Ensure each user/customer can only rate a message once
  uniqueMessageRating: unique().on(table.messageId, table.userId, table.customerId),
}));

// Attachments table - for file uploads in messages
export const attachments = pgTable("attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull().references(() => messages.id),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(), // File size in bytes
  filePath: text("file_path").notNull(), // Path to stored file
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Activity logs table - track agent assignments and activities
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").references(() => users.id), // Made nullable for system events
  conversationId: varchar("conversation_id").references(() => conversations.id),
  action: text("action").notNull(), // 'assigned' | 'unassigned' | 'responded' | 'status_changed' | 'took_over' | 'queued'
  details: text("details"), // Additional context like previous agent, status change, etc.
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// Agent workload tracking - to help with auto-assignment
export const agentWorkload = pgTable("agent_workload", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  activeConversations: integer("active_conversations").notNull().default(0),
  maxCapacity: integer("max_capacity").notNull().default(5), // Configurable per agent
  lastActivity: timestamp("last_activity").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Conversation Ratings table - ratings and feedback when conversations are closed
export const conversationRatings = pgTable("conversation_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  rating: integer("rating").notNull(), // 1-5 star rating
  feedback: text("feedback"), // Optional text feedback from customer
  tags: text("tags").array(), // Optional tags like "helpful", "slow response", "resolved quickly"
  // AI-analyzed sentiment
  aiSentimentScore: integer("ai_sentiment_score"), // AI-analyzed sentiment (0-100, 50 = neutral)
  aiSentimentLabel: text("ai_sentiment_label"), // 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive'
  aiAnalysisSummary: text("ai_analysis_summary"), // AI summary of conversation tone and customer sentiment
  aiConfidence: integer("ai_confidence"), // AI confidence in sentiment analysis (0-100)
  // Staff attribution
  primaryAgentId: varchar("primary_agent_id").references(() => users.id), // Main agent who handled conversation
  contributingAgentIds: text("contributing_agent_ids").array(), // All agents who participated
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Agent Performance Stats table - aggregated performance metrics per agent
export const agentPerformanceStats = pgTable("agent_performance_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  // Time period for these stats
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  // Conversation metrics
  totalConversations: integer("total_conversations").notNull().default(0),
  primaryConversations: integer("primary_conversations").notNull().default(0), // Where agent was primary handler
  contributedConversations: integer("contributed_conversations").notNull().default(0), // Where agent participated
  closedConversations: integer("closed_conversations").notNull().default(0),
  // Rating metrics
  averageRating: integer("average_rating"), // Average rating (multiplied by 100 for precision, e.g., 4.5 = 450)
  totalRatings: integer("total_ratings").notNull().default(0),
  fiveStarCount: integer("five_star_count").notNull().default(0),
  fourStarCount: integer("four_star_count").notNull().default(0),
  threeStarCount: integer("three_star_count").notNull().default(0),
  twoStarCount: integer("two_star_count").notNull().default(0),
  oneStarCount: integer("one_star_count").notNull().default(0),
  // Sentiment metrics
  averageSentiment: integer("average_sentiment"), // Average AI sentiment score (0-100)
  positiveConversations: integer("positive_conversations").notNull().default(0),
  neutralConversations: integer("neutral_conversations").notNull().default(0),
  negativeConversations: integer("negative_conversations").notNull().default(0),
  // Response time metrics (in seconds)
  avgFirstResponseTime: integer("avg_first_response_time"),
  avgResolutionTime: integer("avg_resolution_time"),
  // Activity metrics
  totalMessages: integer("total_messages").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Activity Notifications table - for user notifications (tags, reminders, mentions)
export const activityNotifications = pgTable("activity_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id), // Who should see this notification
  type: text("type").notNull(), // 'mention' | 'tag' | 'reminder' | 'assignment' | 'comment' | 'system'
  title: text("title").notNull(), // Brief notification title
  message: text("message").notNull(), // Notification message/description
  link: text("link"), // URL to navigate to when clicked (e.g., /admin/conversations/123)
  linkType: text("link_type"), // 'conversation' | 'post' | 'knowledge_base' | 'custom'
  relatedId: varchar("related_id"), // ID of related entity (conversation, post, etc.)
  triggeredBy: varchar("triggered_by").references(() => users.id), // User who triggered this notification
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// AI Agents table - for configuring different AI assistant personalities and capabilities
export const aiAgents = pgTable("ai_agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // e.g., "Technical Support Bot", "Billing Assistant"
  description: text("description"), // What this agent specializes in
  systemPrompt: text("system_prompt").notNull(), // AI personality and behavior instructions
  isActive: boolean("is_active").notNull().default(true),
  autoTakeoverThreshold: integer("auto_takeover_threshold").notNull().default(70), // Confidence threshold for automatic handoff to humans
  specializations: text("specializations").array(), // Categories this agent handles well
  knowledgeBaseIds: text("knowledge_base_ids").array(), // Which knowledge base articles this agent can access
  maxTokens: integer("max_tokens").notNull().default(1000),
  temperature: integer("temperature").notNull().default(30), // Stored as integer (0-100), divided by 100 for API
  responseFormat: text("response_format").notNull().default('conversational'), // 'conversational' | 'step_by_step' | 'faq' | 'technical' | 'bullet_points'
  organizationId: varchar("organization_id").references(() => organizations.id), // Multi-tenant organization scoping
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Knowledge Base table - stores reusable knowledge articles for AI agents
export const knowledgeBase = pgTable("knowledge_base", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(), // The actual knowledge content
  category: text("category").notNull(), // e.g., "Technical", "Billing", "Product Info"
  tags: text("tags").array(), // Searchable tags
  isActive: boolean("is_active").notNull().default(true),
  priority: integer("priority").notNull().default(50), // Higher priority = more likely to be used
  usageCount: integer("usage_count").notNull().default(0), // Track how often this knowledge is referenced
  effectiveness: integer("effectiveness").notNull().default(50), // Track how effective this knowledge is (0-100)
  // File upload support
  sourceType: text("source_type").notNull().default("manual"), // 'manual' | 'file' | 'url'
  fileName: text("file_name"), // Original filename for file uploads
  fileType: text("file_type"), // MIME type for file uploads
  fileSize: integer("file_size"), // File size in bytes
  filePath: text("file_path"), // Storage path for uploaded files
  // Website URL support
  sourceUrl: text("source_url"), // URL if content was scraped from a website
  urlTitle: text("url_title"), // Title extracted from URL
  urlDescription: text("url_description"), // Meta description from URL
  // Agent assignment
  assignedAgentIds: text("assigned_agent_ids").array(), // Which specific agents can access this knowledge
  organizationId: varchar("organization_id").references(() => organizations.id), // Multi-tenant organization scoping
  createdBy: varchar("created_by").references(() => users.id),
  // Indexing status tracking
  indexingStatus: text("indexing_status").notNull().default("pending"), // 'pending' | 'indexing' | 'indexed' | 'failed'
  indexedAt: timestamp("indexed_at"), // When indexing completed successfully
  indexingError: text("indexing_error"), // Error message if indexing failed
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Knowledge Base Images table - stores images attached to knowledge articles
export const knowledgeBaseImages = pgTable("knowledge_base_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  knowledgeBaseId: varchar("knowledge_base_id").notNull().references(() => knowledgeBase.id),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(), // File size in bytes
  filePath: text("file_path").notNull(), // Path to stored file
  description: text("description"), // Optional description/alt text for the image
  displayOrder: integer("display_order").notNull().default(0), // Order of images in the article
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Knowledge Base Videos table - stores videos (YouTube and internal) attached to knowledge articles
export const knowledgeBaseVideos = pgTable("knowledge_base_videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  knowledgeBaseId: varchar("knowledge_base_id").notNull().references(() => knowledgeBase.id),
  
  // Video source type
  videoType: text("video_type").notNull(), // 'youtube' | 'internal'
  
  // YouTube videos
  youtubeUrl: text("youtube_url"), // Full YouTube URL
  youtubeId: text("youtube_id"), // Extracted YouTube video ID (e.g., 'dQw4w9WgXcQ')
  
  // Internal videos (uploaded files)
  filename: text("filename"), // Generated filename
  originalName: text("original_name"), // Original upload filename
  mimeType: text("mime_type"), // video/mp4, video/webm, etc.
  size: integer("size"), // File size in bytes
  filePath: text("file_path"), // Path to stored video file
  duration: integer("duration"), // Video duration in seconds
  
  // Common fields for all videos
  title: text("title").notNull(), // Video title/label
  description: text("description"), // Optional description
  tags: text("tags").array(), // Video tags for search/categorization
  thumbnailPath: text("thumbnail_path"), // Path to thumbnail image
  displayOrder: integer("display_order").notNull().default(0), // Order of videos in the article
  
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Knowledge Base FAQs table - AI-generated frequently asked questions for knowledge articles
export const knowledgeBaseFaqs = pgTable("knowledge_base_faqs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  knowledgeBaseId: varchar("knowledge_base_id").notNull().references(() => knowledgeBase.id),
  question: text("question").notNull(), // AI-generated question
  answer: text("answer").notNull(), // AI-generated answer based on article content
  displayOrder: integer("display_order").notNull().default(0), // Order of FAQs in the article
  isAiGenerated: boolean("is_ai_generated").notNull().default(true), // Track if AI generated this FAQ
  usageCount: integer("usage_count").notNull().default(0), // How often this FAQ is viewed/used
  helpful: integer("helpful").notNull().default(0), // Positive feedback count
  notHelpful: integer("not_helpful").notNull().default(0), // Negative feedback count
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// AI Agent Learning table - tracks AI interactions to improve responses over time
export const aiAgentLearning = pgTable("ai_agent_learning", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => aiAgents.id),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id),
  customerQuery: text("customer_query").notNull(), // What the customer asked
  aiResponse: text("ai_response").notNull(), // What the AI responded
  confidence: integer("confidence").notNull(), // AI confidence in response (0-100)
  humanTookOver: boolean("human_took_over").notNull().default(false), // Did a human need to take over?
  customerSatisfaction: integer("customer_satisfaction"), // Customer feedback (1-5 stars)
  knowledgeUsed: text("knowledge_used").array(), // Which knowledge base articles were referenced
  improvementSuggestion: text("improvement_suggestion"), // Human feedback for improvement
  wasHelpful: boolean("was_helpful"), // Simple yes/no feedback
  
  // Enhanced response tracking
  responseFormat: text("response_format").default('conversational'), // 'conversational' | 'step_by_step' | 'faq' | 'technical' | 'bullet_points'
  intentCategory: text("intent_category"), // Detected intent: 'sales', 'technical', 'billing', 'general'
  qualityScore: integer("quality_score"), // Overall quality (0-100): grammar, completeness, relevance
  toneScore: integer("tone_score"), // Tone appropriateness (0-100): friendly, professional, empathetic
  relevanceScore: integer("relevance_score"), // How relevant to customer query (0-100)
  completenessScore: integer("completeness_score"), // How complete the answer is (0-100)
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// AI Agent Sessions table - tracks which conversations are being handled by AI vs humans
export const aiAgentSessions = pgTable("ai_agent_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id),
  agentId: varchar("agent_id").notNull().references(() => aiAgents.id),
  status: text("status").notNull().default("active"), // 'active' | 'handed_over' | 'completed'
  handoverReason: text("handover_reason"), // Why was conversation handed over to human
  humanAgentId: varchar("human_agent_id").references(() => users.id), // Which human took over
  messageCount: integer("message_count").notNull().default(0),
  avgConfidence: integer("avg_confidence").notNull().default(0), // Average confidence across all messages
  startedAt: timestamp("started_at").notNull().defaultNow(),
  handedOverAt: timestamp("handed_over_at"),
  completedAt: timestamp("completed_at"),
});

// Tickets table - separate from conversations for better ticket management
export const tickets = pgTable("tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("open"), // 'open' | 'in-progress' | 'closed'
  priority: text("priority").notNull().default("medium"), // 'low' | 'medium' | 'high' | 'urgent'
  category: text("category").notNull().default("General"),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  assignedAgentId: varchar("assigned_agent_id").references(() => users.id),
  conversationId: varchar("conversation_id").references(() => conversations.id), // Link to conversation if escalated
  organizationId: varchar("organization_id").references(() => organizations.id), // Multi-tenant organization scoping
  // AI-related fields for automated ticket generation
  isAiGenerated: boolean("is_ai_generated").notNull().default(false), // Track if AI generated title/description
  aiConfidenceScore: integer("ai_confidence_score"), // AI confidence in generated content (0-100)
  aiGeneratedTitle: text("ai_generated_title"), // Original AI-generated title before human edits
  aiGeneratedDescription: text("ai_generated_description"), // Original AI-generated description before human edits  
  aiProcessedAt: timestamp("ai_processed_at"), // When AI processing occurred
  conversationContext: text("conversation_context"), // Summary of conversation context used by AI
  // External sync fields
  externalId: text("external_id"), // ID from external system
  externalSystem: text("external_system"), // Name of external system
  syncStatus: text("sync_status").default("not_synced"), // 'synced' | 'pending' | 'failed' | 'not_synced'
  lastSyncAt: timestamp("last_sync_at"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Uploaded Files table - central file management for all uploaded files
export const uploadedFiles = pgTable("uploaded_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  originalName: text("original_name").notNull(), // User's original filename
  storedName: text("stored_name").notNull(), // System-generated storage filename
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(), // File size in bytes
  sha256Hash: text("sha256_hash").notNull().unique(), // For duplicate detection
  filePath: text("file_path").notNull(), // Storage path
  category: text("category").notNull().default("General"), // File categorization
  tags: text("tags").array(), // Searchable tags
  status: text("status").notNull().default("uploaded"), // 'uploaded' | 'processing' | 'processed' | 'error'
  errorMessage: text("error_message"), // Error details when status is 'error'
  duplicateOfId: varchar("duplicate_of_id"), // Will be foreign key but can't self-reference here
  processedAt: timestamp("processed_at"), // When file was processed for AI training
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Join table linking uploaded files to knowledge base articles
export const knowledgeBaseFiles = pgTable("knowledge_base_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileId: varchar("file_id").notNull().references(() => uploadedFiles.id),
  knowledgeBaseId: varchar("knowledge_base_id").notNull().references(() => knowledgeBase.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// AI Agent File Usage tracking - track which files are used by which agents
export const aiAgentFileUsage = pgTable("ai_agent_file_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileId: varchar("file_id").notNull().references(() => uploadedFiles.id),
  agentId: varchar("agent_id").notNull().references(() => aiAgents.id),
  usageCount: integer("usage_count").notNull().default(0),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Knowledge Base Versions table - tracks version history of knowledge base articles
export const knowledgeBaseVersions = pgTable("knowledge_base_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  knowledgeBaseId: varchar("knowledge_base_id").notNull().references(() => knowledgeBase.id),
  version: integer("version").notNull(), // Version number (1, 2, 3, etc.)
  title: text("title").notNull(), // Title at this version
  content: text("content").notNull(), // Content at this version
  category: text("category").notNull(),
  tags: text("tags").array(),
  changeReason: text("change_reason"), // Why was this change made
  changedBy: varchar("changed_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Knowledge Chunks table - stores persistent vector embeddings for RAG
export const knowledgeChunks = pgTable("knowledge_chunks", {
  id: varchar("id").primaryKey(), // Format: {knowledgeBaseId}_chunk_{index}
  knowledgeBaseId: varchar("knowledge_base_id").notNull().references(() => knowledgeBase.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  category: text("category").notNull(),
  tags: text("tags").array(),
  priority: integer("priority").notNull().default(50),
  wordCount: integer("word_count").notNull(),
  sourceTitle: text("source_title").notNull(),
  sourceCategory: text("source_category").notNull(),
  chunkTitle: text("chunk_title"),
  hasStructure: boolean("has_structure").notNull().default(false),
  embedding: vector("embedding"), // 1536-dimensional vector for OpenAI embeddings
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// API Keys table - for 3rd party integrations and widget authentication
export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // Descriptive name for the API key (e.g., "Production Website Widget")
  key: text("key").notNull().unique(), // The actual API key
  customerId: varchar("customer_id").references(() => customers.id), // Optional: link to a specific customer
  organizationName: text("organization_name"), // Name of the organization using this key
  allowedDomains: text("allowed_domains").array(), // Whitelist of domains that can use this key
  permissions: text("permissions").array().notNull().default(sql`ARRAY['chat']::text[]`), // Permissions: 'chat', 'history', 'tickets', 'feed'
  isActive: boolean("is_active").notNull().default(true),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"), // Optional expiration date
  createdBy: varchar("created_by").references(() => users.id), // Admin who created the key
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  assignedConversations: many(conversations),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  conversations: many(conversations),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  customer: one(customers, {
    fields: [conversations.customerId],
    references: [customers.id],
  }),
  assignedAgent: one(users, {
    fields: [conversations.assignedAgentId],
    references: [users.id],
  }),
  messages: many(messages),
  tickets: many(tickets),
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
  customer: one(customers, {
    fields: [tickets.customerId],
    references: [customers.id],
  }),
  assignedAgent: one(users, {
    fields: [tickets.assignedAgentId],
    references: [users.id],
  }),
  conversation: one(conversations, {
    fields: [tickets.conversationId],
    references: [conversations.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  attachments: many(attachments),
  reads: many(messageReads),
}));

export const messageReadsRelations = relations(messageReads, ({ one }) => ({
  message: one(messages, {
    fields: [messageReads.messageId],
    references: [messages.id],
  }),
  user: one(users, {
    fields: [messageReads.userId],
    references: [users.id],
  }),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  message: one(messages, {
    fields: [attachments.messageId],
    references: [messages.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  agent: one(users, {
    fields: [activityLogs.agentId],
    references: [users.id],
  }),
  conversation: one(conversations, {
    fields: [activityLogs.conversationId],
    references: [conversations.id],
  }),
}));

export const agentWorkloadRelations = relations(agentWorkload, ({ one }) => ({
  agent: one(users, {
    fields: [agentWorkload.agentId],
    references: [users.id],
  }),
}));

export const aiAgentsRelations = relations(aiAgents, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [aiAgents.createdBy],
    references: [users.id],
  }),
  sessions: many(aiAgentSessions),
  learningEntries: many(aiAgentLearning),
}));

export const knowledgeBaseRelations = relations(knowledgeBase, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [knowledgeBase.createdBy],
    references: [users.id],
  }),
  images: many(knowledgeBaseImages),
  videos: many(knowledgeBaseVideos),
  files: many(knowledgeBaseFiles),
}));

export const knowledgeBaseImagesRelations = relations(knowledgeBaseImages, ({ one }) => ({
  knowledgeBase: one(knowledgeBase, {
    fields: [knowledgeBaseImages.knowledgeBaseId],
    references: [knowledgeBase.id],
  }),
}));

export const knowledgeBaseVideosRelations = relations(knowledgeBaseVideos, ({ one }) => ({
  knowledgeBase: one(knowledgeBase, {
    fields: [knowledgeBaseVideos.knowledgeBaseId],
    references: [knowledgeBase.id],
  }),
  createdBy: one(users, {
    fields: [knowledgeBaseVideos.createdBy],
    references: [users.id],
  }),
}));

export const aiAgentLearningRelations = relations(aiAgentLearning, ({ one }) => ({
  agent: one(aiAgents, {
    fields: [aiAgentLearning.agentId],
    references: [aiAgents.id],
  }),
  conversation: one(conversations, {
    fields: [aiAgentLearning.conversationId],
    references: [conversations.id],
  }),
}));

export const aiAgentSessionsRelations = relations(aiAgentSessions, ({ one }) => ({
  conversation: one(conversations, {
    fields: [aiAgentSessions.conversationId],
    references: [conversations.id],
  }),
  agent: one(aiAgents, {
    fields: [aiAgentSessions.agentId],
    references: [aiAgents.id],
  }),
  humanAgent: one(users, {
    fields: [aiAgentSessions.humanAgentId],
    references: [users.id],
  }),
}));

// New File Management Relations
export const uploadedFilesRelations = relations(uploadedFiles, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [uploadedFiles.createdBy],
    references: [users.id],
  }),
  duplicateOf: one(uploadedFiles, {
    fields: [uploadedFiles.duplicateOfId],
    references: [uploadedFiles.id],
  }),
  knowledgeBaseFiles: many(knowledgeBaseFiles),
  aiAgentUsage: many(aiAgentFileUsage),
}));

export const knowledgeBaseFilesRelations = relations(knowledgeBaseFiles, ({ one }) => ({
  file: one(uploadedFiles, {
    fields: [knowledgeBaseFiles.fileId],
    references: [uploadedFiles.id],
  }),
  knowledgeBase: one(knowledgeBase, {
    fields: [knowledgeBaseFiles.knowledgeBaseId],
    references: [knowledgeBase.id],
  }),
}));

export const aiAgentFileUsageRelations = relations(aiAgentFileUsage, ({ one }) => ({
  file: one(uploadedFiles, {
    fields: [aiAgentFileUsage.fileId],
    references: [uploadedFiles.id],
  }),
  agent: one(aiAgents, {
    fields: [aiAgentFileUsage.agentId],
    references: [aiAgents.id],
  }),
}));

// Insert schemas
export const insertOrganizationSchema = createInsertSchema(organizations).pick({
  name: true,
  slug: true,
  logo: true,
  primaryColor: true,
  secondaryColor: true,
  customDomain: true,
  subdomain: true,
  welcomeMessage: true,
  aiEnabled: true,
  knowledgeBaseEnabled: true,
  supportEmail: true,
  supportPhone: true,
  website: true,
  status: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  name: true,
  role: true,
  organizationId: true,
});

export const insertCustomerSchema = createInsertSchema(customers).pick({
  name: true,
  email: true,
  phone: true,
  company: true,
  ipAddress: true,
  tags: true,
});

// Anonymous customer schema for chat widget
export const anonymousCustomerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone is required"),
  company: z.string().min(1, "Business name is required"),
  ipAddress: z.string().optional(),
  contextData: z.record(z.any()).optional(), // Custom context data from 3rd party integrations
});

// Customer portal login schema
export const customerPortalLoginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Customer portal signup/set password schema
export const customerPortalSetPasswordSchema = z.object({
  customerId: z.string().uuid(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const insertTicketSchema = createInsertSchema(tickets).pick({
  title: true,
  description: true,
  status: true,
  priority: true,
  category: true,
  customerId: true,
  assignedAgentId: true,
  conversationId: true,
  isAiGenerated: true,
  aiConfidenceScore: true,
  aiGeneratedTitle: true,
  aiGeneratedDescription: true,
  conversationContext: true,
});

// AI ticket generation schema specifically for AI-generated content
export const aiTicketGenerationSchema = z.object({
  conversationId: z.string().uuid(),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().default("General"),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  aiConfidenceScore: z.number().int().min(0).max(100),
  conversationContext: z.string().optional(),
});

// External sync schemas
export const externalCustomerSyncSchema = insertCustomerSchema.extend({
  externalId: z.string().optional(),
  externalSystem: z.string().optional(),
});

export const externalTicketSyncSchema = insertTicketSchema.extend({
  externalId: z.string().optional(),
  externalSystem: z.string().optional(),
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  customerId: true,
  assignedAgentId: true,
  status: true,
  priority: true,
  title: true,
  isAnonymous: true,
  sessionId: true,
});

// Anonymous conversation creation schema
export const anonymousConversationSchema = z.object({
  title: z.string().optional(),
  sessionId: z.string().optional(),
  isAnonymous: z.boolean().default(true),
});

// Message scope enum for validation
export const messageScope = z.enum(['public', 'internal']);

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  senderId: true,
  senderType: true,
  content: true,
  scope: true,
});

// Separate schema for internal messages with stricter validation
export const insertInternalMessageSchema = insertMessageSchema.extend({
  scope: z.literal('internal'),
  senderType: z.enum(['agent', 'admin']), // Only staff can send internal messages
});

// Notification schemas
export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  conversationId: true,
  isRead: true,
});

export const markNotificationReadSchema = z.object({
  conversationId: z.string().uuid(),
});

// Message Reads schemas
export const insertMessageReadSchema = createInsertSchema(messageReads).pick({
  messageId: true,
  userId: true,
});

export const markConversationReadSchema = z.object({
  conversationId: z.string().uuid(),
});

// Attachment schemas
export const insertAttachmentSchema = createInsertSchema(attachments).pick({
  messageId: true,
  filename: true,
  originalName: true,
  mimeType: true,
  size: true,
  filePath: true,
});

// Activity log schemas
export const insertActivityLogSchema = createInsertSchema(activityLogs).pick({
  agentId: true,
  conversationId: true,
  action: true,
  details: true,
}).extend({
  agentId: z.string().uuid().optional(), // Made optional for system events
});

// Agent workload schemas
export const insertAgentWorkloadSchema = createInsertSchema(agentWorkload).pick({
  agentId: true,
  activeConversations: true,
  maxCapacity: true,
});

// Agent status update schema
export const updateAgentStatusSchema = z.object({
  status: z.enum(['online', 'away', 'busy', 'offline']),
});

// Conversation Rating schemas
export const insertConversationRatingSchema = createInsertSchema(conversationRatings).omit({
  id: true,
  createdAt: true,
});

// Agent Performance Stats schemas
export const insertAgentPerformanceStatsSchema = createInsertSchema(agentPerformanceStats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Activity Notifications schemas
export const insertActivityNotificationSchema = createInsertSchema(activityNotifications).omit({
  id: true,
  createdAt: true,
  readAt: true,
});

// API Keys schemas
export const insertApiKeySchema = createInsertSchema(apiKeys).pick({
  name: true,
  key: true,
  customerId: true,
  organizationName: true,
  allowedDomains: true,
  permissions: true,
  isActive: true,
  expiresAt: true,
  createdBy: true,
});

export const updateApiKeySchema = insertApiKeySchema.partial();

// AI Agent schemas
export const insertAiAgentSchema = createInsertSchema(aiAgents).pick({
  name: true,
  description: true,
  systemPrompt: true,
  isActive: true,
  autoTakeoverThreshold: true,
  specializations: true,
  knowledgeBaseIds: true,
  maxTokens: true,
  temperature: true,
  responseFormat: true,
  createdBy: true,
});

export const updateAiAgentSchema = insertAiAgentSchema.partial();

// Knowledge Base schemas
export const insertKnowledgeBaseSchema = createInsertSchema(knowledgeBase).pick({
  title: true,
  content: true,
  category: true,
  tags: true,
  isActive: true,
  priority: true,
  createdBy: true,
  assignedAgentIds: true,
  sourceType: true,
  fileName: true,
  fileType: true,
  fileSize: true,
  filePath: true,
  sourceUrl: true,
  urlTitle: true,
  urlDescription: true,
});

export const updateKnowledgeBaseSchema = insertKnowledgeBaseSchema.partial();

// Knowledge Base Videos schemas
export const insertKnowledgeBaseVideoSchema = createInsertSchema(knowledgeBaseVideos).pick({
  knowledgeBaseId: true,
  videoType: true,
  youtubeUrl: true,
  youtubeId: true,
  filename: true,
  originalName: true,
  mimeType: true,
  size: true,
  filePath: true,
  duration: true,
  title: true,
  description: true,
  tags: true,
  thumbnailPath: true,
  displayOrder: true,
  createdBy: true,
});

export type InsertKnowledgeBaseVideo = z.infer<typeof insertKnowledgeBaseVideoSchema>;
export type KnowledgeBaseVideo = typeof knowledgeBaseVideos.$inferSelect;

// Knowledge Base FAQs schemas
export const insertKnowledgeBaseFaqSchema = createInsertSchema(knowledgeBaseFaqs).pick({
  knowledgeBaseId: true,
  question: true,
  answer: true,
  displayOrder: true,
  isAiGenerated: true,
  usageCount: true,
  helpful: true,
  notHelpful: true,
});

export type InsertKnowledgeBaseFaq = z.infer<typeof insertKnowledgeBaseFaqSchema>;
export type KnowledgeBaseFaq = typeof knowledgeBaseFaqs.$inferSelect;

// File Management schemas
export const insertUploadedFileSchema = createInsertSchema(uploadedFiles).pick({
  originalName: true,
  storedName: true,
  mimeType: true,
  size: true,
  sha256Hash: true,
  filePath: true,
  category: true,
  tags: true,
  status: true,
  errorMessage: true,
  duplicateOfId: true,
  processedAt: true,
  createdBy: true,
});

export const updateUploadedFileSchema = insertUploadedFileSchema.partial();

export const insertKnowledgeBaseFileSchema = createInsertSchema(knowledgeBaseFiles).pick({
  fileId: true,
  knowledgeBaseId: true,
});

export const insertAiAgentFileUsageSchema = createInsertSchema(aiAgentFileUsage).pick({
  fileId: true,
  agentId: true,
  usageCount: true,
  lastUsedAt: true,
});

export const updateAiAgentFileUsageSchema = insertAiAgentFileUsageSchema.partial();

// Knowledge Base Images schemas
export const insertKnowledgeBaseImageSchema = createInsertSchema(knowledgeBaseImages).pick({
  knowledgeBaseId: true,
  filename: true,
  originalName: true,
  mimeType: true,
  size: true,
  filePath: true,
  description: true,
  displayOrder: true,
});

// AI Agent Learning schemas
export const insertAiAgentLearningSchema = createInsertSchema(aiAgentLearning).pick({
  agentId: true,
  conversationId: true,
  customerQuery: true,
  aiResponse: true,
  confidence: true,
  humanTookOver: true,
  customerSatisfaction: true,
  knowledgeUsed: true,
  improvementSuggestion: true,
  wasHelpful: true,
  responseFormat: true,
  intentCategory: true,
  qualityScore: true,
  toneScore: true,
  relevanceScore: true,
  completenessScore: true,
});

// AI Agent Session schemas
export const insertAiAgentSessionSchema = createInsertSchema(aiAgentSessions).pick({
  conversationId: true,
  agentId: true,
  status: true,
  handoverReason: true,
  humanAgentId: true,
  messageCount: true,
  avgConfidence: true,
});

// Types
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;
export type AiTicketGeneration = z.infer<typeof aiTicketGenerationSchema>;
export type ExternalCustomerSync = z.infer<typeof externalCustomerSyncSchema>;
export type ExternalTicketSync = z.infer<typeof externalTicketSyncSchema>;
export type AnonymousCustomer = z.infer<typeof anonymousCustomerSchema>;
export type AnonymousConversation = z.infer<typeof anonymousConversationSchema>;
export type CustomerPortalLogin = z.infer<typeof customerPortalLoginSchema>;
export type CustomerPortalSetPassword = z.infer<typeof customerPortalSetPasswordSchema>;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;
export type Attachment = typeof attachments.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertAgentWorkload = z.infer<typeof insertAgentWorkloadSchema>;
export type AgentWorkload = typeof agentWorkload.$inferSelect;
export type InsertConversationRating = z.infer<typeof insertConversationRatingSchema>;
export type ConversationRating = typeof conversationRatings.$inferSelect;
export type InsertAgentPerformanceStats = z.infer<typeof insertAgentPerformanceStatsSchema>;
export type AgentPerformanceStats = typeof agentPerformanceStats.$inferSelect;
export type InsertActivityNotification = z.infer<typeof insertActivityNotificationSchema>;
export type ActivityNotification = typeof activityNotifications.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertAiAgent = z.infer<typeof insertAiAgentSchema>;
export type AiAgent = typeof aiAgents.$inferSelect;
export type InsertKnowledgeBase = z.infer<typeof insertKnowledgeBaseSchema>;
export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type InsertKnowledgeBaseImage = z.infer<typeof insertKnowledgeBaseImageSchema>;
export type KnowledgeBaseImage = typeof knowledgeBaseImages.$inferSelect;
export const insertKnowledgeChunkSchema = createInsertSchema(knowledgeChunks).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertKnowledgeChunk = z.infer<typeof insertKnowledgeChunkSchema>;
export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect;
export type InsertAiAgentLearning = z.infer<typeof insertAiAgentLearningSchema>;
export type AiAgentLearning = typeof aiAgentLearning.$inferSelect;
export type InsertAiAgentSession = z.infer<typeof insertAiAgentSessionSchema>;
export type AiAgentSession = typeof aiAgentSessions.$inferSelect;
export type InsertUploadedFile = z.infer<typeof insertUploadedFileSchema>;
export type UploadedFile = typeof uploadedFiles.$inferSelect;
export type InsertKnowledgeBaseFile = z.infer<typeof insertKnowledgeBaseFileSchema>;
export type KnowledgeBaseFile = typeof knowledgeBaseFiles.$inferSelect;
export type InsertAiAgentFileUsage = z.infer<typeof insertAiAgentFileUsageSchema>;
export type AiAgentFileUsage = typeof aiAgentFileUsage.$inferSelect;

// ========================================
// FEED MODULE SCHEMA
// ========================================

// Posts table - social media style feed posts
export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  authorId: varchar("author_id").notNull().references(() => users.id), // Staff/admin who created the post
  content: text("content").notNull(), // Main post content
  tags: text("tags").array(), // Array of hashtags extracted from content
  images: text("images").array(), // Array of image URLs/paths
  links: text("links").array(), // Array of external links
  attachedArticleIds: text("attached_article_ids").array(), // Knowledge base article IDs
  visibility: text("visibility").notNull().default("internal"), // 'internal' | 'all_customers' | 'targeted'
  targetedUserIds: text("targeted_user_ids").array(), // Specific user/customer IDs when visibility='targeted'
  isUrgent: boolean("is_urgent").notNull().default(false), // Urgent/priority flag
  organizationId: varchar("organization_id").references(() => organizations.id), // Multi-tenant organization scoping
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Post comments table
export const postComments = pgTable("post_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => posts.id),
  authorId: varchar("author_id").notNull(), // Can be user or customer ID
  authorType: text("author_type").notNull(), // 'staff' | 'customer'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Post likes table
export const postLikes = pgTable("post_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => posts.id),
  userId: varchar("user_id").notNull(), // Can be user or customer ID
  userType: text("user_type").notNull(), // 'staff' | 'customer'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Post views table - track who viewed each post
export const postViews = pgTable("post_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => posts.id),
  userId: varchar("user_id").notNull(), // Can be user or customer ID
  userType: text("user_type").notNull(), // 'staff' | 'customer'
  viewedAt: timestamp("viewed_at").notNull().defaultNow(),
});

// Post reads table - track read/unread status for notifications
export const postReads = pgTable("post_reads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => posts.id),
  userId: varchar("user_id").notNull(), // Can be user or customer ID
  readAt: timestamp("read_at").notNull().defaultNow(),
});

// Feed module relations
export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  comments: many(postComments),
  likes: many(postLikes),
  views: many(postViews),
}));

export const postCommentsRelations = relations(postComments, ({ one }) => ({
  post: one(posts, {
    fields: [postComments.postId],
    references: [posts.id],
  }),
}));

export const postLikesRelations = relations(postLikes, ({ one }) => ({
  post: one(posts, {
    fields: [postLikes.postId],
    references: [posts.id],
  }),
}));

export const postViewsRelations = relations(postViews, ({ one }) => ({
  post: one(posts, {
    fields: [postViews.postId],
    references: [posts.id],
  }),
}));

export const postReadsRelations = relations(postReads, ({ one }) => ({
  post: one(posts, {
    fields: [postReads.postId],
    references: [posts.id],
  }),
}));

// Knowledge Base Version relations
export const knowledgeBaseVersionsRelations = relations(knowledgeBaseVersions, ({ one }) => ({
  knowledgeBase: one(knowledgeBase, {
    fields: [knowledgeBaseVersions.knowledgeBaseId],
    references: [knowledgeBase.id],
  }),
  changedBy: one(users, {
    fields: [knowledgeBaseVersions.changedBy],
    references: [users.id],
  }),
}));

// User Permissions table - granular permission control per user per feature
export const userPermissions = pgTable("user_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  feature: text("feature").notNull(), // 'conversations' | 'dashboard' | 'customers' | 'ai-agents' | etc.
  permission: text("permission").notNull().default("view"), // 'hidden' | 'view' | 'edit'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  uniqueUserFeature: unique().on(table.userId, table.feature),
}));

// Relations for user permissions
export const userPermissionsRelations = relations(userPermissions, ({ one }) => ({
  user: one(users, {
    fields: [userPermissions.userId],
    references: [users.id],
  }),
}));

// Feed module insert schemas
export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).refine(
  (data) => {
    if (!data.links) return true;
    return data.links.every(link => {
      try {
        const url = new URL(link);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    });
  },
  { message: "All links must be valid http or https URLs", path: ['links'] }
).refine(
  (data) => {
    if (!data.images) return true;
    return data.images.every(img => {
      try {
        const url = new URL(img);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    });
  },
  { message: "All image URLs must be valid http or https URLs", path: ['images'] }
);

export const insertPostCommentSchema = createInsertSchema(postComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPostLikeSchema = createInsertSchema(postLikes).omit({
  id: true,
  createdAt: true,
});

export const insertPostViewSchema = createInsertSchema(postViews).omit({
  id: true,
  viewedAt: true,
});

export const insertPostReadSchema = createInsertSchema(postReads).omit({
  id: true,
  readAt: true,
});

// Feed module types
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;
export type InsertPostComment = z.infer<typeof insertPostCommentSchema>;
export type PostComment = typeof postComments.$inferSelect;
export type InsertPostLike = z.infer<typeof insertPostLikeSchema>;
export type PostLike = typeof postLikes.$inferSelect;
export type InsertPostView = z.infer<typeof insertPostViewSchema>;
export type PostView = typeof postViews.$inferSelect;
export type InsertPostRead = z.infer<typeof insertPostReadSchema>;
export type PostRead = typeof postReads.$inferSelect;

// Post with engagement stats
export type PostWithStats = Post & {
  viewCount: number;
  likeCount: number;
  commentCount: number;
  hasLiked: boolean;
  authorName: string;
};

// Knowledge Base Versions insert schema and types
export const insertKnowledgeBaseVersionSchema = createInsertSchema(knowledgeBaseVersions).omit({
  id: true,
  createdAt: true,
});

export type InsertKnowledgeBaseVersion = z.infer<typeof insertKnowledgeBaseVersionSchema>;
export type KnowledgeBaseVersion = typeof knowledgeBaseVersions.$inferSelect;

// User Permissions insert schema and types
export const insertUserPermissionSchema = createInsertSchema(userPermissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserPermission = z.infer<typeof insertUserPermissionSchema>;
export type UserPermission = typeof userPermissions.$inferSelect;

// Available features for permissions
export const PERMISSION_FEATURES = [
  'conversations',
  'activity',
  'dashboard',
  'customers',
  'ai-agents',
  'ai-dashboard',
  'ai-training',
  'ai-takeover',
  'knowledge-base',
  'file-management',
  'analytics',
  'feedback',
  'feed',
  'settings',
  'user-management'
] as const;

export type PermissionFeature = typeof PERMISSION_FEATURES[number];
export type PermissionLevel = 'hidden' | 'view' | 'edit';

// Message Ratings insert schema and types
export const insertMessageRatingSchema = createInsertSchema(messageRatings).omit({
  id: true,
  createdAt: true,
});

export type InsertMessageRating = z.infer<typeof insertMessageRatingSchema>;
export type MessageRating = typeof messageRatings.$inferSelect;
