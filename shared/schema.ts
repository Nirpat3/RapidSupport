import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - for agents and admins
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("agent"), // 'agent' | 'admin'
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Messages table
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id),
  senderId: varchar("sender_id").notNull(),
  senderType: text("sender_type").notNull(), // 'customer' | 'agent' | 'admin'
  content: text("content").notNull(),
  scope: text("scope").notNull().default("public"), // 'public' | 'internal' - internal messages are staff-only
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  status: text("status").notNull().default("sent"), // 'sent' | 'delivered' | 'read'
});

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
  createdBy: varchar("created_by").references(() => users.id),
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
}));

export const knowledgeBaseImagesRelations = relations(knowledgeBaseImages, ({ one }) => ({
  knowledgeBase: one(knowledgeBase, {
    fields: [knowledgeBaseImages.knowledgeBaseId],
    references: [knowledgeBase.id],
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

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  name: true,
  role: true,
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
});

export const updateKnowledgeBaseSchema = insertKnowledgeBaseSchema.partial();

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
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;
export type AiTicketGeneration = z.infer<typeof aiTicketGenerationSchema>;
export type ExternalCustomerSync = z.infer<typeof externalCustomerSyncSchema>;
export type ExternalTicketSync = z.infer<typeof externalTicketSyncSchema>;
export type AnonymousCustomer = z.infer<typeof anonymousCustomerSchema>;
export type AnonymousConversation = z.infer<typeof anonymousConversationSchema>;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;
export type Attachment = typeof attachments.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertAgentWorkload = z.infer<typeof insertAgentWorkloadSchema>;
export type AgentWorkload = typeof agentWorkload.$inferSelect;
export type InsertAiAgent = z.infer<typeof insertAiAgentSchema>;
export type AiAgent = typeof aiAgents.$inferSelect;
export type InsertKnowledgeBase = z.infer<typeof insertKnowledgeBaseSchema>;
export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type InsertKnowledgeBaseImage = z.infer<typeof insertKnowledgeBaseImageSchema>;
export type KnowledgeBaseImage = typeof knowledgeBaseImages.$inferSelect;
export type InsertAiAgentLearning = z.infer<typeof insertAiAgentLearningSchema>;
export type AiAgentLearning = typeof aiAgentLearning.$inferSelect;
export type InsertAiAgentSession = z.infer<typeof insertAiAgentSessionSchema>;
export type AiAgentSession = typeof aiAgentSessions.$inferSelect;
