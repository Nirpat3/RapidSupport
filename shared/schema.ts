import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, unique, customType, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
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

// ============================================
// REGIONS - Must be defined first for FK references
// ============================================

// Regions table - Country/locale configurations for multi-region support
export const regions = pgTable("regions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Region identification
  isoCode: text("iso_code").notNull().unique(), // ISO 3166-1 alpha-2 (e.g., 'US', 'UK', 'DE', 'IN')
  name: text("name").notNull(), // Display name (e.g., 'United States', 'Germany')
  
  // Locale settings
  defaultLocale: text("default_locale").notNull().default("en"), // Primary language (e.g., 'en', 'de', 'hi')
  supportedLocales: text("supported_locales").array().default(sql`ARRAY['en']::text[]`), // All supported languages
  timezone: text("timezone").default("UTC"), // Default timezone (e.g., 'America/New_York')
  
  // Currency and formatting
  currency: text("currency").default("USD"), // ISO 4217 currency code
  currencySymbol: text("currency_symbol").default("$"),
  dateFormat: text("date_format").default("MM/DD/YYYY"), // Date display format
  
  // Regional branding (optional overrides)
  logo: text("logo"), // Region-specific logo if different
  primaryColor: text("primary_color"), // Region-specific color
  
  // Domain configuration
  subdomain: text("subdomain"), // e.g., 'us', 'de', 'in' for us.domain.com
  customDomain: text("custom_domain"), // Full custom domain if needed
  
  // Status
  isActive: boolean("is_active").notNull().default(true),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Organizations table - for multi-tenant support
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // URL-friendly identifier (e.g., 'acme', 'techco')
  // Region and locale settings
  regionId: varchar("region_id").references(() => regions.id), // Default region for this organization
  defaultLocale: text("default_locale").default("en"), // Default language (ISO 639-1)
  supportedLocales: text("supported_locales").array().default(sql`ARRAY['en']::text[]`), // Available languages
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

// Brand Voice Configuration - Centralized AI tone and style settings (Singleton table)
export const brandConfig = pgTable("brand_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Core Brand Identity
  companyName: text("company_name").notNull().default("Your Company"),
  industryVertical: text("industry_vertical"), // e.g., "SaaS", "E-commerce", "Healthcare"
  
  // Brand Voice Attributes
  tone: text("tone").notNull().default("professional yet approachable"), // Overall emotional quality
  voice: text("voice").notNull().default("empathetic and solution-focused"), // Personality characteristics
  style: text("style").notNull().default("concise with actionable next steps"), // Writing style
  
  // Communication Guidelines
  dosList: text("dos_list").array().default(sql`ARRAY['Be empathetic and understanding', 'Provide clear next steps', 'Use customer-friendly language', 'Acknowledge customer concerns']::text[]`),
  dontsList: text("donts_list").array().default(sql`ARRAY['Use jargon without explanation', 'Make promises we cannot keep', 'Be overly formal or robotic', 'Ignore customer emotions']::text[]`),
  
  // Few-Shot Examples (optional training examples)
  exampleInteractions: text("example_interactions").array(), // JSON strings of example Q&A pairs
  
  // Vocabulary Preferences
  preferredTerms: text("preferred_terms").array(), // Terms the brand prefers (e.g., "client" vs "customer")
  avoidedTerms: text("avoided_terms").array(), // Terms to avoid
  
  // Response Characteristics
  formalityLevel: integer("formality_level").notNull().default(5), // 1-10 scale (1=casual, 10=very formal)
  empathyLevel: integer("empathy_level").notNull().default(8), // 1-10 scale
  technicalDepth: integer("technical_depth").notNull().default(5), // 1-10 scale
  
  // Escalation Preferences
  escalationThreshold: integer("escalation_threshold").notNull().default(30), // Confidence % below which to escalate
  
  // Active Status
  isActive: boolean("is_active").notNull().default(true),
  
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
  isPlatformAdmin: boolean("is_platform_admin").notNull().default(false), // Platform-level admin who manages all organizations
  organizationId: varchar("organization_id").references(() => organizations.id), // Staff belong to organizations
  status: text("status").notNull().default("offline"), // 'online' | 'away' | 'busy' | 'offline'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Workspaces table - sub-divisions within organizations
export const workspaces = pgTable("workspaces", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  slug: text("slug").notNull(), // URL-friendly identifier
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  isDefault: boolean("is_default").notNull().default(false), // Default workspace for new org members
  // Region and locale settings (override organization defaults)
  regionId: varchar("region_id").references(() => regions.id), // Override region for this workspace
  locale: text("locale"), // Override locale for this workspace (null = use org default)
  // Reseller configuration
  isReseller: boolean("is_reseller").notNull().default(false), // Is this a reseller workspace
  parentWorkspaceId: varchar("parent_workspace_id"), // Parent workspace for hierarchy (self-referential)
  settings: jsonb("settings"), // Workspace-specific settings (JSON)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Workspace Members - junction table for users to workspaces (supports cross-org access)
export const workspaceMembers = pgTable("workspace_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id),
  role: text("role").notNull().default("member"), // 'owner' | 'admin' | 'member' | 'viewer'
  invitedBy: varchar("invited_by").references(() => users.id),
  invitedAt: timestamp("invited_at").notNull().defaultNow(),
  joinedAt: timestamp("joined_at"),
  status: text("status").notNull().default("pending"), // 'pending' | 'active' | 'suspended'
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueUserWorkspace: unique().on(table.userId, table.workspaceId),
}));

// Departments table - divisions within workspaces (e.g., Sales, Technical Support, Billing)
export const departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  slug: text("slug").notNull(), // URL-friendly identifier
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id),
  isDefault: boolean("is_default").notNull().default(false), // Default department for new workspace members
  primaryAiAgentId: varchar("primary_ai_agent_id"), // Default AI agent for this department (set after aiAgents table)
  settings: jsonb("settings"), // Department-specific settings (JSON)
  icon: text("icon").default("Building2"), // Lucide icon name
  color: text("color").default("#6366f1"), // Hex color
  displayOrder: integer("display_order").notNull().default(0), // Order in department list
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Department Members - junction table for workspace members to departments
export const departmentMembers = pgTable("department_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceMemberId: varchar("workspace_member_id").notNull().references(() => workspaceMembers.id),
  departmentId: varchar("department_id").notNull().references(() => departments.id),
  role: text("role").notNull().default("member"), // 'lead' | 'member' | 'viewer'
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueMemberDepartment: unique().on(table.workspaceMemberId, table.departmentId),
}));

// Customer Organizations table - Business accounts for customer portal
// Represents a business/company that has multiple customer users
export const customerOrganizations = pgTable("customer_organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Business identification
  name: text("name").notNull(), // Business name (e.g., "Acme Corp")
  slug: text("slug").notNull().unique(), // URL-friendly identifier
  
  // Optional support ID for verification
  supportId: text("support_id").unique(), // Unique support ID that customers can share (e.g., "ACME-2024-001")
  requireSupportId: boolean("require_support_id").notNull().default(false), // Toggle: require support ID for new members
  
  // Multi-tenant scoping (links to staff organization)
  organizationId: varchar("organization_id").references(() => organizations.id), // Which staff org serves this customer org
  
  // Settings
  settings: jsonb("settings"), // JSON for additional settings
  
  // Status
  isActive: boolean("is_active").notNull().default(true),
  
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
  
  // Customer organization membership (business account)
  customerOrganizationId: varchar("customer_organization_id").references(() => customerOrganizations.id), // Which business this customer belongs to
  customerOrgRole: text("customer_org_role").default("member"), // 'admin' | 'member' - admin can see all org conversations
  
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
}, (table) => [
  // Partial unique index: ensures only ONE admin per customer organization
  // This prevents race conditions where concurrent signups could both become admin
  uniqueIndex("idx_customers_one_admin_per_org")
    .on(table.customerOrganizationId)
    .where(sql`${table.customerOrgRole} = 'admin'`),
]);

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
  workspaceId: varchar("workspace_id").references(() => workspaces.id), // Workspace scoping for conversations
  departmentId: varchar("department_id").references(() => departments.id), // Department routing for conversations
  customerLanguage: text("customer_language").default("en"), // Customer's preferred language for translation (ISO 639-1 code)
  // Customer engagement tracking fields
  lastCustomerReplyAt: timestamp("last_customer_reply_at"), // Last time customer sent a message
  lastAgentReplyAt: timestamp("last_agent_reply_at"), // Last time agent/AI sent a message
  customerLastViewedAt: timestamp("customer_last_viewed_at"), // Last time customer viewed conversation
  autoFollowupSentAt: timestamp("auto_followup_sent_at"), // Last time auto-followup was sent
  autoFollowupCount: integer("auto_followup_count").notNull().default(0), // Number of auto-followups sent
  participatingAgentIds: text("participating_agent_ids").array().default([]), // Array of agent IDs who have responded to this conversation
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
  translatedContent: text("translated_content"), // Translated version of content (null if no translation needed)
  originalLanguage: text("original_language"), // ISO 639-1 code of original content language
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

// Email Queue table - smart batching for customer email notifications (prevents spam)
export const emailQueue = pgTable("email_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipientEmail: text("recipient_email").notNull(),
  recipientType: text("recipient_type").notNull(), // 'customer' | 'agent'
  recipientId: varchar("recipient_id").notNull(), // customer_id or user_id
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id),
  emailType: text("email_type").notNull(), // 'new_message' | 'followup' | 'digest' | 'conversation_closed'
  subject: text("subject").notNull(),
  content: text("content").notNull(), // HTML email content
  messageIds: text("message_ids").array(), // IDs of messages included in this email (for batching)
  scheduledFor: timestamp("scheduled_for").notNull(), // When to send this email
  sentAt: timestamp("sent_at"), // When actually sent (null = pending)
  status: text("status").notNull().default("pending"), // 'pending' | 'sent' | 'failed' | 'cancelled'
  errorMessage: text("error_message"), // Error message if failed
  attempts: integer("attempts").notNull().default(0), // Number of send attempts
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Customer Engagement Settings table - configurable settings for auto-followup and email notifications
export const engagementSettings = pgTable("engagement_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id),
  // Email notification settings
  emailNotificationsEnabled: boolean("email_notifications_enabled").notNull().default(true),
  emailBatchingDelayMinutes: integer("email_batching_delay_minutes").notNull().default(5), // Wait X min before sending
  emailRateLimitHours: integer("email_rate_limit_hours").notNull().default(4), // Max 1 email per X hours per conversation
  // Auto-followup settings
  autoFollowupEnabled: boolean("auto_followup_enabled").notNull().default(true),
  autoFollowupDelayHours: integer("auto_followup_delay_hours").notNull().default(24), // Send followup after X hours of inactivity
  maxAutoFollowups: integer("max_auto_followups").notNull().default(3), // Max number of followups before giving up
  // Auto-close settings
  autoCloseEnabled: boolean("auto_close_enabled").notNull().default(true),
  autoCloseDays: integer("auto_close_days").notNull().default(7), // Auto-close after X days of inactivity
  // Templates
  followupMessageTemplate: text("followup_message_template").default("Hi! Just checking in to see if you still need help with this. Please let us know if there's anything else we can assist you with."),
  // AI Settings - Global defaults for AI assistance
  aiGlobalEnabled: boolean("ai_global_enabled").notNull().default(true), // Master toggle for all AI responses
  aiAnonymousChatEnabled: boolean("ai_anonymous_chat_enabled").notNull().default(true), // AI for anonymous chat widget
  aiCustomerPortalEnabled: boolean("ai_customer_portal_enabled").notNull().default(true), // AI for logged-in customer portal
  aiStaffConversationsEnabled: boolean("ai_staff_conversations_enabled").notNull().default(true), // AI for staff-initiated conversations
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// AI Agents table - for configuring different AI assistant personalities and capabilities
export const aiAgents = pgTable("ai_agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // e.g., "Technical Support Bot", "Billing Assistant"
  description: text("description"), // What this agent specializes in
  systemPrompt: text("system_prompt").notNull(), // AI personality and behavior instructions
  greeting: text("greeting"), // Custom greeting message when starting conversations
  isActive: boolean("is_active").notNull().default(true),
  autoTakeoverThreshold: integer("auto_takeover_threshold").notNull().default(70), // Confidence threshold for automatic handoff to humans
  specializations: text("specializations").array(), // Categories this agent handles well
  knowledgeBaseIds: text("knowledge_base_ids").array(), // Which knowledge base articles this agent can access
  maxTokens: integer("max_tokens").notNull().default(1000),
  temperature: integer("temperature").notNull().default(30), // Stored as integer (0-100), divided by 100 for API
  responseFormat: text("response_format").notNull().default('conversational'), // 'conversational' | 'step_by_step' | 'faq' | 'technical' | 'bullet_points'
  // Diagnostic flow settings for troubleshooting
  diagnosticFlowEnabled: boolean("diagnostic_flow_enabled").notNull().default(false), // Enable multi-step troubleshooting
  diagnosticQuestions: jsonb("diagnostic_questions"), // Array of {id, question, type, options?, followUpQuestionId?}
  includeResourceLinks: boolean("include_resource_links").notNull().default(true), // Include links to knowledge base articles in responses
  organizationId: varchar("organization_id").references(() => organizations.id), // Multi-tenant organization scoping
  workspaceId: varchar("workspace_id").references(() => workspaces.id), // Workspace scoping for AI agents
  departmentId: varchar("department_id").references(() => departments.id), // Department-specific AI agent
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Support Categories table - customizable customer chat routing categories
export const supportCategories = pgTable("support_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // e.g., "Billing", "Technical Support"
  slug: text("slug").notNull().unique(), // URL-friendly identifier (e.g., "billing", "technical")
  description: text("description"), // Brief description shown to customers
  icon: text("icon").notNull().default("HelpCircle"), // Lucide icon name
  color: text("color").default("#6366f1"), // Category color (hex)
  displayOrder: integer("display_order").notNull().default(0), // Order in category selection
  isVisible: boolean("is_visible").notNull().default(true), // Show/hide category
  isActive: boolean("is_active").notNull().default(true), // Enable/disable category
  // AI Agent linking
  aiAgentId: varchar("ai_agent_id").references(() => aiAgents.id), // Linked AI agent for this category
  // Suggested questions for this category
  suggestedQuestions: text("suggested_questions").array(), // Pre-defined questions for customers
  // Organization scoping
  organizationId: varchar("organization_id").references(() => organizations.id),
  workspaceId: varchar("workspace_id").references(() => workspaces.id), // Workspace scoping for categories
  departmentId: varchar("department_id").references(() => departments.id), // Department routing for category
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
  helpful: integer("helpful").notNull().default(0), // Positive feedback count
  notHelpful: integer("not_helpful").notNull().default(0), // Negative feedback count
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
  workspaceId: varchar("workspace_id").references(() => workspaces.id), // Workspace scoping for knowledge base articles
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

// AI Message Feedback table - tracks thumbs up/down on individual AI messages for learning
export const aiMessageFeedback = pgTable("ai_message_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull().references(() => messages.id),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id),
  feedbackType: text("feedback_type").notNull(), // 'thumbs_up' | 'thumbs_down'
  feedbackReason: text("feedback_reason"), // Optional reason: 'incorrect', 'unhelpful', 'too_long', 'off_topic', 'perfect', 'helpful'
  customerQuery: text("customer_query"), // The question that prompted this response
  aiResponse: text("ai_response"), // The AI response that was rated
  knowledgeUsed: text("knowledge_used").array(), // Which KB articles were used
  confidenceScore: integer("confidence_score"), // AI's confidence when generating this response
  customerId: varchar("customer_id").references(() => customers.id),
  sessionId: text("session_id"), // Anonymous session tracking
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// AI Corrections table - tracks when humans correct/override AI responses for training
export const aiCorrections = pgTable("ai_corrections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id),
  originalMessageId: varchar("original_message_id").references(() => messages.id),
  customerQuery: text("customer_query").notNull(), // What the customer asked
  originalAiResponse: text("original_ai_response").notNull(), // What the AI said (incorrect)
  correctedResponse: text("corrected_response").notNull(), // What the human staff said instead
  correctionType: text("correction_type").notNull(), // 'factual_error', 'tone_issue', 'incomplete', 'wrong_context', 'other'
  correctionNotes: text("correction_notes"), // Staff notes about why correction was needed
  shouldLearnFrom: boolean("should_learn_from").notNull().default(true), // Flag if this should be used for training
  appliedToKnowledge: boolean("applied_to_knowledge").notNull().default(false), // Has this been added to KB?
  suggestedKbArticleId: varchar("suggested_kb_article_id").references(() => knowledgeBase.id),
  correctedBy: varchar("corrected_by").notNull().references(() => users.id),
  reviewedBy: varchar("reviewed_by").references(() => users.id), // Manager review
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Knowledge Gaps table - tracks questions the AI couldn't answer well
export const knowledgeGaps = pgTable("knowledge_gaps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerQuery: text("customer_query").notNull(), // The unanswered question
  queryNormalized: text("query_normalized"), // Normalized/cleaned version for grouping
  occurrenceCount: integer("occurrence_count").notNull().default(1), // How many times this was asked
  avgConfidence: integer("avg_confidence"), // Average AI confidence when answering
  lastAskedAt: timestamp("last_asked_at").notNull().defaultNow(),
  status: text("status").notNull().default("open"), // 'open' | 'in_progress' | 'resolved' | 'ignored'
  suggestedCategory: text("suggested_category"), // AI-suggested category for new article
  suggestedTitle: text("suggested_title"), // AI-suggested title for new article
  suggestedContent: text("suggested_content"), // AI-drafted content for new article
  relatedKbArticleIds: text("related_kb_article_ids").array(), // Possibly related existing articles
  resolvedByArticleId: varchar("resolved_by_article_id").references(() => knowledgeBase.id),
  assignedTo: varchar("assigned_to").references(() => users.id), // Staff member working on this
  priority: text("priority").notNull().default("medium"), // 'low' | 'medium' | 'high' based on occurrence
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// AI Training Queue table - items queued for AI model improvement
export const aiTrainingQueue = pgTable("ai_training_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceType: text("source_type").notNull(), // 'correction' | 'feedback' | 'gap' | 'example'
  sourceId: varchar("source_id").notNull(), // ID from source table
  trainingData: text("training_data").notNull(), // JSON with Q&A pair, context, etc.
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected' | 'applied'
  priority: integer("priority").notNull().default(50), // 0-100, higher = more important
  qualityScore: integer("quality_score"), // Validated quality of training data
  approvedBy: varchar("approved_by").references(() => users.id),
  appliedAt: timestamp("applied_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
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

// ============================================================================
// DOCUMENTATION FRAMEWORK TABLES
// Structured documentation system with versioning, relationships, and AI integration
// ============================================================================

// Document Domains - controlled vocabulary for document categorization
export const docDomains = pgTable("doc_domains", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // e.g., "POS", "Payments", "Loyalty", "Inventory"
  slug: text("slug").notNull(), // URL-friendly identifier
  description: text("description"),
  icon: text("icon").default("Folder"), // Lucide icon name
  color: text("color").default("#6366f1"), // Hex color
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  uniqueSlugWorkspace: unique().on(table.slug, table.workspaceId),
}));

// Document Intents - controlled vocabulary for document purpose/type
export const docIntents = pgTable("doc_intents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // e.g., "Feature Guide", "API Reference", "Playbook", "Troubleshooting"
  slug: text("slug").notNull(), // URL-friendly identifier
  description: text("description"),
  icon: text("icon").default("FileText"), // Lucide icon name
  color: text("color").default("#10b981"), // Hex color
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  uniqueSlugWorkspace: unique().on(table.slug, table.workspaceId),
}));

// Documents - main structured documentation table
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull(), // URL-friendly identifier
  title: text("title").notNull(),
  
  // Classification
  domainId: varchar("domain_id").references(() => docDomains.id), // Domain (POS, Payments, etc.)
  intentId: varchar("intent_id").references(() => docIntents.id), // Intent (Feature Guide, API Ref, etc.)
  
  // Status and lifecycle
  status: text("status").notNull().default("draft"), // 'draft' | 'review' | 'active' | 'deprecated' | 'archived'
  
  // Access control
  roleAccess: text("role_access").array().default(sql`ARRAY['member']::text[]`), // Which workspace roles can access
  isPublic: boolean("is_public").notNull().default(false), // Public to customers via portal
  
  // Versioning
  currentVersionId: varchar("current_version_id"), // Reference to active version (set after first version created)
  currentVersion: text("current_version").default("0.0.0"), // Semver string for display
  
  // AI Agent linking
  aiAgentIds: text("ai_agent_ids").array(), // Which AI agents can use this document
  aiActions: text("ai_actions").array(), // Executable actions AI can perform: ["restart_service", "check_status"]
  
  // Metadata
  tags: text("tags").array(),
  summary: text("summary"), // Brief summary for search results
  
  // Workspace scoping
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id),
  organizationId: varchar("organization_id").references(() => organizations.id),
  
  // Audit fields
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  uniqueSlugWorkspace: unique().on(table.slug, table.workspaceId),
}));

// Document Versions - versioned content with semver and audit history
export const documentVersions = pgTable("document_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => documents.id, { onDelete: 'cascade' }),
  
  // Version info
  version: text("version").notNull(), // Semver: "1.0.0", "1.1.0", etc.
  versionNumber: integer("version_number").notNull(), // Sequential number for ordering
  
  // Content
  frontMatter: jsonb("front_matter"), // YAML front-matter as JSON (metadata)
  markdownBody: text("markdown_body").notNull(), // The actual markdown content
  
  // File source (if converted from uploaded file)
  sourceFileId: varchar("source_file_id").references(() => uploadedFiles.id),
  
  // Change tracking
  changeLog: text("change_log"), // What changed in this version
  
  // Status
  status: text("status").notNull().default("draft"), // 'draft' | 'pending_review' | 'published' | 'rejected'
  publishedAt: timestamp("published_at"),
  
  // Audit
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueVersionDoc: unique().on(table.documentId, table.version),
}));

// Document Relationships - links between documents
export const documentRelationships = pgTable("document_relationships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceDocumentId: varchar("source_document_id").notNull().references(() => documents.id, { onDelete: 'cascade' }),
  targetDocumentId: varchar("target_document_id").notNull().references(() => documents.id, { onDelete: 'cascade' }),
  
  // Relationship type
  relationshipType: text("relationship_type").notNull(), // 'depends_on' | 'related' | 'emits' | 'consumes' | 'supersedes' | 'references'
  
  // Optional description
  description: text("description"),
  
  // Ordering
  displayOrder: integer("display_order").notNull().default(0),
  
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueRelationship: unique().on(table.sourceDocumentId, table.targetDocumentId, table.relationshipType),
}));

// Document Review Queue - approval workflow for AI-generated or edited documents
export const documentReviewQueue = pgTable("document_review_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentVersionId: varchar("document_version_id").notNull().references(() => documentVersions.id, { onDelete: 'cascade' }),
  
  // Review status
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected' | 'needs_changes'
  
  // Reviewer info
  reviewerId: varchar("reviewer_id").references(() => users.id),
  reviewNotes: text("review_notes"),
  
  // AI conversion metadata
  isAiGenerated: boolean("is_ai_generated").notNull().default(false),
  aiConfidence: integer("ai_confidence"), // 0-100 confidence score
  needsReview: boolean("needs_review").notNull().default(true), // AI flagged for human review
  
  // Timestamps
  assignedAt: timestamp("assigned_at"),
  decidedAt: timestamp("decided_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Document Import Jobs - tracks AI conversion pipeline state
export const documentImportJobs = pgTable("document_import_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Source file
  sourceFileId: varchar("source_file_id").notNull().references(() => uploadedFiles.id),
  sourceFileName: text("source_file_name").notNull(),
  sourceFileType: text("source_file_type").notNull(), // 'pdf' | 'docx' | 'txt' | 'html'
  
  // Job status
  status: text("status").notNull().default("pending"), // 'pending' | 'processing' | 'completed' | 'failed'
  progress: integer("progress").notNull().default(0), // 0-100 percentage
  
  // Results
  documentsCreated: integer("documents_created").notNull().default(0),
  documentsNeedingReview: integer("documents_needing_review").notNull().default(0),
  
  // Error tracking
  errorMessage: text("error_message"),
  
  // Processing metadata
  processingStartedAt: timestamp("processing_started_at"),
  processingCompletedAt: timestamp("processing_completed_at"),
  
  // Workspace scoping
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Document Chunks - vector embeddings for RAG (similar to knowledgeChunks)
export const documentChunks = pgTable("document_chunks", {
  id: varchar("id").primaryKey(), // Format: {documentVersionId}_chunk_{index}
  documentVersionId: varchar("document_version_id").notNull().references(() => documentVersions.id, { onDelete: 'cascade' }),
  documentId: varchar("document_id").notNull().references(() => documents.id, { onDelete: 'cascade' }),
  
  // Content
  content: text("content").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  
  // Metadata for filtering
  domain: text("domain"), // Copied from document for fast filtering
  intent: text("intent"), // Copied from document for fast filtering
  tags: text("tags").array(),
  
  // Vector embedding
  embedding: vector("embedding"), // 1536-dimensional for OpenAI
  
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

export const insertBrandConfigSchema = createInsertSchema(brandConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateBrandConfigSchema = createInsertSchema(brandConfig).partial().omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  name: true,
  role: true,
  isPlatformAdmin: true,
  organizationId: true,
});

export const insertWorkspaceSchema = createInsertSchema(workspaces).pick({
  name: true,
  description: true,
  slug: true,
  organizationId: true,
  isDefault: true,
  settings: true,
});

export const insertWorkspaceMemberSchema = createInsertSchema(workspaceMembers).pick({
  userId: true,
  workspaceId: true,
  role: true,
  invitedBy: true,
  status: true,
});

export const insertDepartmentSchema = createInsertSchema(departments).pick({
  name: true,
  description: true,
  slug: true,
  workspaceId: true,
  isDefault: true,
  primaryAiAgentId: true,
  settings: true,
  icon: true,
  color: true,
  displayOrder: true,
  isActive: true,
  createdBy: true,
});

export const updateDepartmentSchema = createInsertSchema(departments).partial().omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDepartmentMemberSchema = createInsertSchema(departmentMembers).pick({
  workspaceMemberId: true,
  departmentId: true,
  role: true,
});

// Customer Organization insert schema
export const insertCustomerOrganizationSchema = createInsertSchema(customerOrganizations).pick({
  name: true,
  slug: true,
  supportId: true,
  requireSupportId: true,
  organizationId: true,
  settings: true,
  isActive: true,
});

export const insertCustomerSchema = createInsertSchema(customers).pick({
  name: true,
  email: true,
  phone: true,
  company: true,
  ipAddress: true,
  tags: true,
  customerOrganizationId: true,
  customerOrgRole: true,
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
  aiAssistanceEnabled: true,
  customerLanguage: true,
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

// ============================================================================
// DOCUMENTATION FRAMEWORK SCHEMAS
// ============================================================================

// Document Domains schemas
export const insertDocDomainSchema = createInsertSchema(docDomains).pick({
  name: true,
  slug: true,
  description: true,
  icon: true,
  color: true,
  displayOrder: true,
  isActive: true,
  workspaceId: true,
  createdBy: true,
});

export const updateDocDomainSchema = insertDocDomainSchema.partial();

export type InsertDocDomain = z.infer<typeof insertDocDomainSchema>;
export type DocDomain = typeof docDomains.$inferSelect;

// Document Intents schemas
export const insertDocIntentSchema = createInsertSchema(docIntents).pick({
  name: true,
  slug: true,
  description: true,
  icon: true,
  color: true,
  displayOrder: true,
  isActive: true,
  workspaceId: true,
  createdBy: true,
});

export const updateDocIntentSchema = insertDocIntentSchema.partial();

export type InsertDocIntent = z.infer<typeof insertDocIntentSchema>;
export type DocIntent = typeof docIntents.$inferSelect;

// Documents schemas
export const insertDocumentSchema = createInsertSchema(documents).pick({
  slug: true,
  title: true,
  domainId: true,
  intentId: true,
  status: true,
  roleAccess: true,
  isPublic: true,
  aiAgentIds: true,
  tags: true,
  summary: true,
  workspaceId: true,
  organizationId: true,
  createdBy: true,
});

export const updateDocumentSchema = insertDocumentSchema.partial();

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// Document Versions schemas
export const insertDocumentVersionSchema = createInsertSchema(documentVersions).pick({
  documentId: true,
  version: true,
  versionNumber: true,
  frontMatter: true,
  markdownBody: true,
  sourceFileId: true,
  changeLog: true,
  status: true,
  createdBy: true,
});

export const updateDocumentVersionSchema = insertDocumentVersionSchema.partial();

export type InsertDocumentVersion = z.infer<typeof insertDocumentVersionSchema>;
export type DocumentVersion = typeof documentVersions.$inferSelect;

// Document Relationships schemas
export const insertDocumentRelationshipSchema = createInsertSchema(documentRelationships).pick({
  sourceDocumentId: true,
  targetDocumentId: true,
  relationshipType: true,
  description: true,
  displayOrder: true,
  createdBy: true,
});

export const updateDocumentRelationshipSchema = insertDocumentRelationshipSchema.partial();

export type InsertDocumentRelationship = z.infer<typeof insertDocumentRelationshipSchema>;
export type DocumentRelationship = typeof documentRelationships.$inferSelect;

// Document Review Queue schemas
export const insertDocumentReviewQueueSchema = createInsertSchema(documentReviewQueue).pick({
  documentVersionId: true,
  status: true,
  reviewerId: true,
  reviewNotes: true,
  isAiGenerated: true,
  aiConfidence: true,
  needsReview: true,
});

export const updateDocumentReviewQueueSchema = insertDocumentReviewQueueSchema.partial();

export type InsertDocumentReviewQueue = z.infer<typeof insertDocumentReviewQueueSchema>;
export type DocumentReviewQueue = typeof documentReviewQueue.$inferSelect;

// Document Import Jobs schemas
export const insertDocumentImportJobSchema = createInsertSchema(documentImportJobs).pick({
  sourceFileId: true,
  sourceFileName: true,
  sourceFileType: true,
  status: true,
  workspaceId: true,
  createdBy: true,
});

export const updateDocumentImportJobSchema = insertDocumentImportJobSchema.partial();

export type InsertDocumentImportJob = z.infer<typeof insertDocumentImportJobSchema>;
export type DocumentImportJob = typeof documentImportJobs.$inferSelect;

// Document Chunks schemas
export const insertDocumentChunkSchema = createInsertSchema(documentChunks).pick({
  id: true,
  documentVersionId: true,
  documentId: true,
  content: true,
  chunkIndex: true,
  domain: true,
  intent: true,
  tags: true,
});

export type InsertDocumentChunk = z.infer<typeof insertDocumentChunkSchema>;
export type DocumentChunk = typeof documentChunks.$inferSelect;

// AI Agent schemas
export const insertAiAgentSchema = createInsertSchema(aiAgents).pick({
  name: true,
  description: true,
  systemPrompt: true,
  greeting: true,
  isActive: true,
  autoTakeoverThreshold: true,
  specializations: true,
  knowledgeBaseIds: true,
  maxTokens: true,
  temperature: true,
  responseFormat: true,
  diagnosticFlowEnabled: true,
  diagnosticQuestions: true,
  includeResourceLinks: true,
  createdBy: true,
});

export const updateAiAgentSchema = insertAiAgentSchema.partial();

// Support Categories schemas
export const insertSupportCategorySchema = createInsertSchema(supportCategories).pick({
  name: true,
  slug: true,
  description: true,
  icon: true,
  color: true,
  displayOrder: true,
  isVisible: true,
  isActive: true,
  aiAgentId: true,
  suggestedQuestions: true,
  organizationId: true,
  createdBy: true,
});

export const updateSupportCategorySchema = insertSupportCategorySchema.partial();

export type InsertSupportCategory = z.infer<typeof insertSupportCategorySchema>;
export type SupportCategory = typeof supportCategories.$inferSelect;

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

// AI Message Feedback schemas
export const insertAiMessageFeedbackSchema = createInsertSchema(aiMessageFeedback).pick({
  messageId: true,
  conversationId: true,
  feedbackType: true,
  feedbackReason: true,
  customerQuery: true,
  aiResponse: true,
  knowledgeUsed: true,
  confidenceScore: true,
  customerId: true,
  sessionId: true,
  ipAddress: true,
});

// AI Corrections schemas
export const insertAiCorrectionSchema = createInsertSchema(aiCorrections).pick({
  conversationId: true,
  originalMessageId: true,
  customerQuery: true,
  originalAiResponse: true,
  correctedResponse: true,
  correctionType: true,
  correctionNotes: true,
  shouldLearnFrom: true,
  appliedToKnowledge: true,
  suggestedKbArticleId: true,
  correctedBy: true,
});

// Knowledge Gaps schemas
export const insertKnowledgeGapSchema = createInsertSchema(knowledgeGaps).pick({
  customerQuery: true,
  queryNormalized: true,
  occurrenceCount: true,
  avgConfidence: true,
  status: true,
  suggestedCategory: true,
  suggestedTitle: true,
  suggestedContent: true,
  relatedKbArticleIds: true,
  resolvedByArticleId: true,
  assignedTo: true,
  priority: true,
});

// AI Training Queue schemas
export const insertAiTrainingQueueSchema = createInsertSchema(aiTrainingQueue).pick({
  sourceType: true,
  sourceId: true,
  trainingData: true,
  status: true,
  priority: true,
  qualityScore: true,
  approvedBy: true,
});

// Types
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;
export type InsertBrandConfig = z.infer<typeof insertBrandConfigSchema>;
export type UpdateBrandConfig = z.infer<typeof updateBrandConfigSchema>;
export type BrandConfig = typeof brandConfig.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;
export type Workspace = typeof workspaces.$inferSelect;
export type InsertWorkspaceMember = z.infer<typeof insertWorkspaceMemberSchema>;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type UpdateDepartment = z.infer<typeof updateDepartmentSchema>;
export type Department = typeof departments.$inferSelect;
export type InsertDepartmentMember = z.infer<typeof insertDepartmentMemberSchema>;
export type DepartmentMember = typeof departmentMembers.$inferSelect;
export type InsertCustomerOrganization = z.infer<typeof insertCustomerOrganizationSchema>;
export type CustomerOrganization = typeof customerOrganizations.$inferSelect;
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
export type InsertAiMessageFeedback = z.infer<typeof insertAiMessageFeedbackSchema>;
export type AiMessageFeedback = typeof aiMessageFeedback.$inferSelect;
export type InsertAiCorrection = z.infer<typeof insertAiCorrectionSchema>;
export type AiCorrection = typeof aiCorrections.$inferSelect;
export type InsertKnowledgeGap = z.infer<typeof insertKnowledgeGapSchema>;
export type KnowledgeGap = typeof knowledgeGaps.$inferSelect;
export type InsertAiTrainingQueue = z.infer<typeof insertAiTrainingQueueSchema>;
export type AiTrainingQueue = typeof aiTrainingQueue.$inferSelect;

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

// Email Queue insert schema and types
export const insertEmailQueueSchema = createInsertSchema(emailQueue).omit({
  id: true,
  sentAt: true,
  createdAt: true,
});

export type InsertEmailQueue = z.infer<typeof insertEmailQueueSchema>;
export type EmailQueue = typeof emailQueue.$inferSelect;

// Engagement Settings insert schema and types
export const insertEngagementSettingsSchema = createInsertSchema(engagementSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateEngagementSettingsSchema = insertEngagementSettingsSchema.partial();

export type InsertEngagementSettings = z.infer<typeof insertEngagementSettingsSchema>;
export type UpdateEngagementSettings = z.infer<typeof updateEngagementSettingsSchema>;
export type EngagementSettings = typeof engagementSettings.$inferSelect;

// ========================================
// EXTERNAL CHANNEL INTEGRATION SCHEMA
// ========================================

// Channel type enum values
export const CHANNEL_TYPES = ['whatsapp', 'facebook', 'instagram', 'web', 'api'] as const;
export type ChannelType = typeof CHANNEL_TYPES[number];

// Provider type enum values
export const CHANNEL_PROVIDERS = ['meta_cloud', 'twilio', 'internal'] as const;
export type ChannelProvider = typeof CHANNEL_PROVIDERS[number];

// Bot mode enum values
export const BOT_MODES = ['auto', 'handoff', 'human_only'] as const;
export type BotMode = typeof BOT_MODES[number];

// Channel Accounts table - stores connected messaging channel configurations
export const channelAccounts = pgTable("channel_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // Display name (e.g., "Main WhatsApp Support")
  channelType: text("channel_type").notNull(), // 'whatsapp' | 'facebook' | 'instagram'
  provider: text("provider").notNull(), // 'meta_cloud' | 'twilio'
  
  // Workspace/Organization scoping
  workspaceId: varchar("workspace_id").references(() => workspaces.id),
  organizationId: varchar("organization_id").references(() => organizations.id),
  
  // Connection credentials (encrypted/secured in production)
  phoneNumber: text("phone_number"), // For WhatsApp
  phoneNumberId: text("phone_number_id"), // Meta WhatsApp Phone Number ID
  businessAccountId: text("business_account_id"), // Meta Business Account ID
  pageId: text("page_id"), // Facebook Page ID for Messenger/Instagram
  accessToken: text("access_token"), // Meta access token (should be encrypted)
  appSecret: text("app_secret"), // Meta app secret for webhook validation
  webhookVerifyToken: text("webhook_verify_token"), // Webhook verification token
  
  // Twilio-specific fields
  twilioAccountSid: text("twilio_account_sid"),
  twilioAuthToken: text("twilio_auth_token"),
  twilioMessagingSid: text("twilio_messaging_sid"),
  
  // AI Agent routing
  defaultAiAgentId: varchar("default_ai_agent_id").references(() => aiAgents.id),
  salesAiAgentId: varchar("sales_ai_agent_id").references(() => aiAgents.id),
  supportAiAgentId: varchar("support_ai_agent_id").references(() => aiAgents.id),
  
  // Configuration
  isActive: boolean("is_active").notNull().default(true),
  autoResponseEnabled: boolean("auto_response_enabled").notNull().default(true),
  defaultBotMode: text("default_bot_mode").notNull().default("auto"), // 'auto' | 'handoff' | 'human_only'
  businessHoursOnly: boolean("business_hours_only").notNull().default(false),
  businessHoursStart: text("business_hours_start").default("09:00"), // HH:MM format
  businessHoursEnd: text("business_hours_end").default("17:00"), // HH:MM format
  businessHoursTimezone: text("business_hours_timezone").default("UTC"),
  
  // Status tracking
  status: text("status").notNull().default("pending"), // 'pending' | 'connected' | 'disconnected' | 'error'
  lastError: text("last_error"),
  lastHealthCheck: timestamp("last_health_check"),
  webhookUrl: text("webhook_url"), // Generated webhook URL for this account
  
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Channel Contacts table - external channel customer identities
export const channelContacts = pgTable("channel_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelAccountId: varchar("channel_account_id").notNull().references(() => channelAccounts.id),
  customerId: varchar("customer_id").references(() => customers.id), // Link to internal customer when identified
  
  // External identifiers
  channelType: text("channel_type").notNull(), // 'whatsapp' | 'facebook' | 'instagram'
  externalId: text("external_id").notNull(), // WhatsApp phone, Facebook PSID, Instagram IGSID
  displayName: text("display_name"), // Name from the platform
  profilePicUrl: text("profile_pic_url"), // Profile picture URL
  
  // Contact metadata
  phoneNumber: text("phone_number"), // Normalized phone number for WhatsApp
  email: text("email"), // If collected
  
  // Opt-in/consent tracking (important for compliance)
  hasOptedIn: boolean("has_opted_in").notNull().default(true),
  optInTimestamp: timestamp("opt_in_timestamp"),
  optOutTimestamp: timestamp("opt_out_timestamp"),
  
  // Engagement tracking
  firstContactAt: timestamp("first_contact_at").notNull().defaultNow(),
  lastContactAt: timestamp("last_contact_at").notNull().defaultNow(),
  messageCount: integer("message_count").notNull().default(0),
  
  // Lead qualification fields (internal CRM)
  leadStatus: text("lead_status").default("new"), // 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
  leadScore: integer("lead_score").default(0), // 0-100 qualification score
  leadSource: text("lead_source"), // 'organic' | 'campaign' | 'referral'
  businessName: text("business_name"), // Captured business name
  businessType: text("business_type"), // Industry/vertical
  numberOfLocations: integer("number_of_locations"), // For enterprise qualification
  notes: text("notes"), // Agent notes about this contact
  tags: text("tags").array(), // Custom tags for segmentation
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  uniqueChannelContact: unique().on(table.channelAccountId, table.externalId),
}));

// Extend conversations for channel support - Channel Conversation Metadata
export const channelConversationMeta = pgTable("channel_conversation_meta", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id).unique(),
  
  // Channel linking
  channelAccountId: varchar("channel_account_id").references(() => channelAccounts.id),
  channelContactId: varchar("channel_contact_id").references(() => channelContacts.id),
  channelType: text("channel_type").notNull().default("web"), // 'whatsapp' | 'facebook' | 'instagram' | 'web' | 'api'
  externalConversationId: text("external_conversation_id"), // Provider's conversation/thread ID
  
  // Bot control
  botMode: text("bot_mode").notNull().default("auto"), // 'auto' | 'handoff' | 'human_only'
  botPausedAt: timestamp("bot_paused_at"), // When bot was manually paused
  botPausedBy: varchar("bot_paused_by").references(() => users.id),
  botResumeAt: timestamp("bot_resume_at"), // Scheduled auto-resume time
  
  // WhatsApp 24-hour window tracking
  lastCustomerMessageAt: timestamp("last_customer_message_at"),
  sessionExpiresAt: timestamp("session_expires_at"), // 24h after last customer message
  isWithinSessionWindow: boolean("is_within_session_window").notNull().default(true),
  
  // Intent/routing metadata
  detectedIntent: text("detected_intent"), // 'sales' | 'support' | 'billing' | 'general'
  routedToAgentType: text("routed_to_agent_type"), // 'sales_bot' | 'support_bot' | 'human'
  currentAiAgentId: varchar("current_ai_agent_id").references(() => aiAgents.id),
  
  // SLA tracking
  slaPolicyId: varchar("sla_policy_id"),
  slaDueAt: timestamp("sla_due_at"),
  slaBreachedAt: timestamp("sla_breached_at"),
  firstResponseAt: timestamp("first_response_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Channel Messages table - tracks external message metadata
export const channelMessages = pgTable("channel_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull().references(() => messages.id),
  channelAccountId: varchar("channel_account_id").notNull().references(() => channelAccounts.id),
  
  // External identifiers
  externalMessageId: text("external_message_id"), // Provider's message ID
  direction: text("direction").notNull(), // 'inbound' | 'outbound'
  
  // Message type details
  messageType: text("message_type").notNull().default("text"), // 'text' | 'image' | 'video' | 'audio' | 'document' | 'template' | 'interactive'
  templateId: varchar("template_id"), // If sent using a template
  templateName: text("template_name"),
  templateLanguage: text("template_language"),
  
  // Media handling
  mediaUrl: text("media_url"), // URL for media messages
  mediaMimeType: text("media_mime_type"),
  mediaSize: integer("media_size"),
  localMediaPath: text("local_media_path"), // Local copy of media
  
  // Delivery tracking
  deliveryStatus: text("delivery_status").notNull().default("sent"), // 'sent' | 'delivered' | 'read' | 'failed'
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  failureReason: text("failure_reason"),
  
  // Cost tracking (for billing)
  messageCategory: text("message_category"), // 'authentication' | 'marketing' | 'utility' | 'service'
  estimatedCost: integer("estimated_cost"), // Cost in cents/microdollars
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Channel Templates table - WhatsApp/Meta approved message templates
export const channelTemplates = pgTable("channel_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelAccountId: varchar("channel_account_id").notNull().references(() => channelAccounts.id),
  
  // Template identification
  name: text("name").notNull(), // Template name/identifier
  externalId: text("external_id"), // Provider's template ID
  language: text("language").notNull().default("en"), // ISO language code
  category: text("category").notNull(), // 'AUTHENTICATION' | 'MARKETING' | 'UTILITY'
  
  // Template content
  headerType: text("header_type"), // 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'
  headerText: text("header_text"),
  headerMediaUrl: text("header_media_url"),
  bodyText: text("body_text").notNull(), // Template body with {{variable}} placeholders
  footerText: text("footer_text"),
  
  // Buttons
  buttonType: text("button_type"), // 'NONE' | 'QUICK_REPLY' | 'CALL_TO_ACTION'
  buttons: jsonb("buttons"), // Array of button configurations
  
  // Approval status
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
  rejectionReason: text("rejection_reason"),
  approvedAt: timestamp("approved_at"),
  
  // Usage tracking
  usageCount: integer("usage_count").notNull().default(0),
  lastUsedAt: timestamp("last_used_at"),
  
  // Categorization
  purpose: text("purpose"), // 'follow_up' | 'demo_reminder' | 'onboarding' | 'support_update'
  tags: text("tags").array(),
  
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  uniqueTemplate: unique().on(table.channelAccountId, table.name, table.language),
}));

// Internal Leads table - CRM for lead tracking without external CRM
export const internalLeads = pgTable("internal_leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelContactId: varchar("channel_contact_id").references(() => channelContacts.id),
  customerId: varchar("customer_id").references(() => customers.id),
  conversationId: varchar("conversation_id").references(() => conversations.id),
  
  // Lead information
  companyName: text("company_name"),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  
  // Qualification data
  status: text("status").notNull().default("new"), // 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
  source: text("source").notNull(), // 'whatsapp' | 'facebook' | 'instagram' | 'web' | 'manual'
  qualificationScore: integer("qualification_score").default(0), // 0-100
  
  // Business details (for B2B)
  industry: text("industry"),
  companySize: text("company_size"), // 'small' | 'medium' | 'enterprise'
  numberOfLocations: integer("number_of_locations"),
  estimatedValue: integer("estimated_value"), // Deal value in cents
  
  // Product interest
  productsInterested: text("products_interested").array(),
  servicesInterested: text("services_interested").array(),
  
  // Sales process
  assignedTo: varchar("assigned_to").references(() => users.id),
  nextFollowUpDate: timestamp("next_follow_up_date"),
  lastContactDate: timestamp("last_contact_date"),
  notes: text("notes"),
  
  // Outcome tracking
  wonDate: timestamp("won_date"),
  lostDate: timestamp("lost_date"),
  lostReason: text("lost_reason"),
  
  organizationId: varchar("organization_id").references(() => organizations.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Channel Webhook Logs table - for debugging and auditing
export const channelWebhookLogs = pgTable("channel_webhook_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelAccountId: varchar("channel_account_id").references(() => channelAccounts.id),
  
  // Request details
  eventType: text("event_type").notNull(), // 'message' | 'status' | 'delivery' | 'read' | 'error'
  direction: text("direction").notNull(), // 'inbound' | 'outbound'
  rawPayload: jsonb("raw_payload"), // Complete webhook payload for debugging
  
  // Processing status
  processedSuccessfully: boolean("processed_successfully").notNull().default(false),
  errorMessage: text("error_message"),
  processingTimeMs: integer("processing_time_ms"),
  
  // Linking
  relatedMessageId: varchar("related_message_id"),
  relatedConversationId: varchar("related_conversation_id"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Channel Account insert schema and types
export const insertChannelAccountSchema = createInsertSchema(channelAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  webhookUrl: true,
  lastHealthCheck: true,
});

export const updateChannelAccountSchema = insertChannelAccountSchema.partial();

export type InsertChannelAccount = z.infer<typeof insertChannelAccountSchema>;
export type UpdateChannelAccount = z.infer<typeof updateChannelAccountSchema>;
export type ChannelAccount = typeof channelAccounts.$inferSelect;

// Channel Contact insert schema and types
export const insertChannelContactSchema = createInsertSchema(channelContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertChannelContact = z.infer<typeof insertChannelContactSchema>;
export type ChannelContact = typeof channelContacts.$inferSelect;

// Channel Conversation Meta insert schema and types
export const insertChannelConversationMetaSchema = createInsertSchema(channelConversationMeta).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertChannelConversationMeta = z.infer<typeof insertChannelConversationMetaSchema>;
export type ChannelConversationMeta = typeof channelConversationMeta.$inferSelect;

// Channel Message insert schema and types
export const insertChannelMessageSchema = createInsertSchema(channelMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertChannelMessage = z.infer<typeof insertChannelMessageSchema>;
export type ChannelMessage = typeof channelMessages.$inferSelect;

// Channel Template insert schema and types
export const insertChannelTemplateSchema = createInsertSchema(channelTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateChannelTemplateSchema = insertChannelTemplateSchema.partial();

export type InsertChannelTemplate = z.infer<typeof insertChannelTemplateSchema>;
export type UpdateChannelTemplate = z.infer<typeof updateChannelTemplateSchema>;
export type ChannelTemplate = typeof channelTemplates.$inferSelect;

// Internal Lead insert schema and types
export const insertInternalLeadSchema = createInsertSchema(internalLeads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateInternalLeadSchema = insertInternalLeadSchema.partial();

export type InsertInternalLead = z.infer<typeof insertInternalLeadSchema>;
export type UpdateInternalLead = z.infer<typeof updateInternalLeadSchema>;
export type InternalLead = typeof internalLeads.$inferSelect;

// Channel Webhook Log insert schema and types
export const insertChannelWebhookLogSchema = createInsertSchema(channelWebhookLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertChannelWebhookLog = z.infer<typeof insertChannelWebhookLogSchema>;
export type ChannelWebhookLog = typeof channelWebhookLogs.$inferSelect;

// Conversation with channel info type
export type ConversationWithChannel = Conversation & {
  channelMeta?: ChannelConversationMeta;
  channelContact?: ChannelContact;
  channelAccount?: ChannelAccount;
};

// ============================================
// ONBOARDING AND PLATFORM ASSISTANT TABLES
// ============================================

// Onboarding Progress - Tracks user onboarding completion
export const onboardingProgress = pgTable("onboarding_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  organizationId: varchar("organization_id"),
  workspaceId: varchar("workspace_id"),
  
  // Checklist item tracking
  checklistItemId: text("checklist_item_id").notNull(), // e.g., 'profile', 'knowledge', 'ai_agent'
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  
  // Optional context
  metadata: jsonb("metadata"), // Additional data about completion
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userChecklistUnique: unique().on(table.userId, table.checklistItemId),
}));

// Platform Assistant Conversations - Stores assistant chat history
export const platformAssistantConversations = pgTable("platform_assistant_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  // Conversation state
  title: text("title").default("New Conversation"),
  isActive: boolean("is_active").notNull().default(true),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Platform Assistant Messages - Individual messages in assistant conversations
export const platformAssistantMessages = pgTable("platform_assistant_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => platformAssistantConversations.id),
  
  role: text("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  
  // For assistant messages with actions
  actionType: text("action_type"), // 'navigate' | 'configure' | 'explain'
  actionPayload: jsonb("action_payload"), // e.g., { path: '/settings', prefill: { ... } }
  
  // References to pages/features discussed
  relatedPages: text("related_pages").array(), // Array of page paths
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Onboarding Progress insert schema and types
export const insertOnboardingProgressSchema = createInsertSchema(onboardingProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOnboardingProgress = z.infer<typeof insertOnboardingProgressSchema>;
export type OnboardingProgress = typeof onboardingProgress.$inferSelect;

// Platform Assistant Conversation insert schema and types
export const insertPlatformAssistantConversationSchema = createInsertSchema(platformAssistantConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPlatformAssistantConversation = z.infer<typeof insertPlatformAssistantConversationSchema>;
export type PlatformAssistantConversation = typeof platformAssistantConversations.$inferSelect;

// Platform Assistant Message insert schema and types
export const insertPlatformAssistantMessageSchema = createInsertSchema(platformAssistantMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertPlatformAssistantMessage = z.infer<typeof insertPlatformAssistantMessageSchema>;
export type PlatformAssistantMessage = typeof platformAssistantMessages.$inferSelect;

// ============================================
// PUSH NOTIFICATIONS TABLES
// ============================================

// Push Subscriptions - Store web push subscription info for users
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id), // null for anonymous customers
  sessionId: varchar("session_id"), // For anonymous customer notifications
  
  // Push subscription data from browser
  endpoint: text("endpoint").notNull(),
  p256dhKey: text("p256dh_key").notNull(), // Public key
  authKey: text("auth_key").notNull(), // Auth secret
  
  // Device info
  userAgent: text("user_agent"),
  deviceType: text("device_type"), // 'mobile' | 'tablet' | 'desktop'
  
  // Notification preferences
  enabledTypes: text("enabled_types").array().default(sql`ARRAY['message', 'mention', 'assignment']::text[]`),
  
  // Status
  isActive: boolean("is_active").notNull().default(true),
  lastUsedAt: timestamp("last_used_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Push Notification Logs - Track sent notifications
export const pushNotificationLogs = pgTable("push_notification_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subscriptionId: varchar("subscription_id").notNull().references(() => pushSubscriptions.id),
  
  // Notification content
  title: text("title").notNull(),
  body: text("body").notNull(),
  icon: text("icon"),
  url: text("url"), // Click action URL
  
  // Notification type
  type: text("type").notNull(), // 'message' | 'mention' | 'assignment' | 'status'
  referenceId: varchar("reference_id"), // Message ID, conversation ID, etc.
  
  // Delivery status
  status: text("status").notNull().default("pending"), // 'pending' | 'sent' | 'failed' | 'clicked'
  error: text("error"), // Error message if failed
  sentAt: timestamp("sent_at"),
  clickedAt: timestamp("clicked_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Push Subscription insert schema and types
export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

// Push Notification Log insert schema and types
export const insertPushNotificationLogSchema = createInsertSchema(pushNotificationLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertPushNotificationLog = z.infer<typeof insertPushNotificationLogSchema>;
export type PushNotificationLog = typeof pushNotificationLogs.$inferSelect;

// ============================================
// AI TOKEN USAGE TRACKING
// ============================================

// AI Token Usage - Track token consumption per API call
export const aiTokenUsage = pgTable("ai_token_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Context references
  conversationId: varchar("conversation_id").references(() => conversations.id),
  messageId: varchar("message_id").references(() => messages.id),
  agentId: varchar("agent_id").references(() => aiAgents.id),
  workspaceId: varchar("workspace_id").references(() => workspaces.id),
  
  // Model info
  model: text("model").notNull(), // e.g., "gpt-4o-mini", "gpt-4o"
  operation: text("operation").notNull(), // e.g., "chat_response", "embedding", "intent_classification"
  
  // Token counts
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  
  // Cost tracking (in USD, calculated from model pricing)
  costUsd: text("cost_usd").notNull().default("0.00"), // Store as text to avoid float precision issues
  
  // Timing
  latencyMs: integer("latency_ms"), // Response time in milliseconds
  occurredAt: timestamp("occurred_at").notNull().defaultNow(),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// AI Token Usage Summary - Daily aggregates for billing
export const aiTokenUsageSummary = pgTable("ai_token_usage_summary", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Grouping dimensions
  workspaceId: varchar("workspace_id").references(() => workspaces.id),
  date: text("date").notNull(), // YYYY-MM-DD format for easy querying
  model: text("model").notNull(),
  
  // Aggregated counts
  totalPromptTokens: integer("total_prompt_tokens").notNull().default(0),
  totalCompletionTokens: integer("total_completion_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  totalCostUsd: text("total_cost_usd").notNull().default("0.00"),
  requestCount: integer("request_count").notNull().default(0),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  uniqueWorkspaceDateModel: unique().on(table.workspaceId, table.date, table.model),
}));

// AI Token Usage insert schema and types
export const insertAiTokenUsageSchema = createInsertSchema(aiTokenUsage).omit({
  id: true,
  createdAt: true,
});

export type InsertAiTokenUsage = z.infer<typeof insertAiTokenUsageSchema>;
export type AiTokenUsage = typeof aiTokenUsage.$inferSelect;

// AI Token Usage Summary insert schema and types
export const insertAiTokenUsageSummarySchema = createInsertSchema(aiTokenUsageSummary).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAiTokenUsageSummary = z.infer<typeof insertAiTokenUsageSummarySchema>;
export type AiTokenUsageSummary = typeof aiTokenUsageSummary.$inferSelect;

// ============================================
// AI KNOWLEDGE LEARNING SYSTEM
// ============================================

// AI Knowledge Feedback - Track which KB articles helped in conversations
export const aiKnowledgeFeedback = pgTable("ai_knowledge_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // References
  conversationId: varchar("conversation_id").references(() => conversations.id),
  messageId: varchar("message_id").references(() => messages.id),
  knowledgeBaseId: varchar("knowledge_base_id").references(() => knowledgeBase.id),
  agentId: varchar("agent_id").references(() => aiAgents.id),
  
  // Query context
  userQuery: text("user_query").notNull(), // The original customer query
  queryIntent: text("query_intent"), // Classified intent of the query
  
  // Article usage details
  similarityScore: text("similarity_score"), // How similar was this article to the query
  wasUsedInResponse: boolean("was_used_in_response").notNull().default(true),
  wasLinkProvided: boolean("was_link_provided").notNull().default(false),
  
  // Outcome tracking (updated after conversation resolution)
  outcome: text("outcome").notNull().default("pending"), // 'pending' | 'helpful' | 'not_helpful' | 'partial'
  customerRating: integer("customer_rating"), // If customer rated the conversation
  agentFeedback: text("agent_feedback"), // Agent notes on article usefulness
  
  // Learning signals
  customerClickedLink: boolean("customer_clicked_link").default(false),
  conversationResolved: boolean("conversation_resolved").default(false),
  requiredHumanTakeover: boolean("required_human_takeover").default(false),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Knowledge Article Metrics - Aggregated success metrics per article
export const knowledgeArticleMetrics = pgTable("knowledge_article_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  knowledgeBaseId: varchar("knowledge_base_id").notNull().references(() => knowledgeBase.id),
  
  // Usage counts
  timesRetrieved: integer("times_retrieved").notNull().default(0),
  timesUsedInResponse: integer("times_used_in_response").notNull().default(0),
  timesLinkClicked: integer("times_link_clicked").notNull().default(0),
  
  // Outcome metrics
  helpfulCount: integer("helpful_count").notNull().default(0),
  notHelpfulCount: integer("not_helpful_count").notNull().default(0),
  partialCount: integer("partial_count").notNull().default(0),
  
  // Calculated scores
  successRate: text("success_rate").default("0"), // helpfulCount / (helpfulCount + notHelpfulCount)
  relevanceScore: text("relevance_score").default("0"), // Weighted score for ranking boost
  
  // Timestamps for decay calculation
  lastHelpfulAt: timestamp("last_helpful_at"),
  lastUsedAt: timestamp("last_used_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  uniqueKnowledgeBase: unique().on(table.knowledgeBaseId),
}));

// AI Knowledge Feedback insert schema and types
export const insertAiKnowledgeFeedbackSchema = createInsertSchema(aiKnowledgeFeedback).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAiKnowledgeFeedback = z.infer<typeof insertAiKnowledgeFeedbackSchema>;
export type AiKnowledgeFeedback = typeof aiKnowledgeFeedback.$inferSelect;

// Knowledge Article Metrics insert schema and types
export const insertKnowledgeArticleMetricsSchema = createInsertSchema(knowledgeArticleMetrics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertKnowledgeArticleMetrics = z.infer<typeof insertKnowledgeArticleMetricsSchema>;
export type KnowledgeArticleMetrics = typeof knowledgeArticleMetrics.$inferSelect;

// ============================================
// CONVERSATIONAL INTELLIGENCE SYSTEM
// ============================================

// Customer Memory - Long-term memory for customer preferences, issues, and patterns
export const customerMemory = pgTable("customer_memory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  
  // Memory type categorization
  memoryType: text("memory_type").notNull(), // 'preference' | 'issue' | 'interaction' | 'feedback' | 'context'
  
  // Memory content
  key: text("key").notNull(), // e.g., 'preferred_language', 'device_type', 'past_issue_printer'
  value: text("value").notNull(), // The actual memory value
  confidence: integer("confidence").notNull().default(80), // 0-100 confidence in this memory
  
  // Source tracking
  source: text("source").notNull(), // 'explicit' (user told us) | 'inferred' (AI detected) | 'behavioral' (pattern)
  sourceConversationId: varchar("source_conversation_id").references(() => conversations.id),
  
  // Temporal relevance
  lastAccessed: timestamp("last_accessed").notNull().defaultNow(),
  accessCount: integer("access_count").notNull().default(1),
  expiresAt: timestamp("expires_at"), // Optional expiration for temporary memories
  
  // Status
  isActive: boolean("is_active").notNull().default(true),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Sentiment Tracking - Real-time sentiment analysis per message
export const sentimentTracking = pgTable("sentiment_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // References
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id),
  messageId: varchar("message_id").references(() => messages.id),
  customerId: varchar("customer_id").references(() => customers.id),
  
  // Sentiment scores (-1 to 1 scale, stored as integer -100 to 100)
  overallSentiment: integer("overall_sentiment").notNull().default(0), // -100 negative to 100 positive
  frustrationLevel: integer("frustration_level").notNull().default(0), // 0-100
  urgencyLevel: integer("urgency_level").notNull().default(0), // 0-100
  satisfactionLevel: integer("satisfaction_level").notNull().default(50), // 0-100
  
  // Emotion detection
  primaryEmotion: text("primary_emotion"), // 'neutral' | 'happy' | 'frustrated' | 'confused' | 'angry' | 'anxious'
  emotionConfidence: integer("emotion_confidence").notNull().default(50), // 0-100
  
  // Escalation tracking
  escalationTriggered: boolean("escalation_triggered").notNull().default(false),
  escalationReason: text("escalation_reason"), // Why escalation was triggered
  
  // Voice-specific (if from voice input)
  modality: text("modality").notNull().default("text"), // 'text' | 'voice'
  voiceToneIndicators: text("voice_tone_indicators").array(), // ['rushed', 'hesitant', 'emphatic']
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Conversation Intelligence - Multi-turn reasoning state and context
export const conversationIntelligence = pgTable("conversation_intelligence", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id).unique(),
  
  // Conversation state tracking
  currentIntent: text("current_intent"), // Latest classified intent
  intentHistory: text("intent_history").array(), // Track how intent evolved
  topicStack: text("topic_stack").array(), // Stack of active topics for context switching
  
  // Problem understanding
  problemStatement: text("problem_statement"), // AI's understanding of the core issue
  problemConfidence: integer("problem_confidence").notNull().default(0), // 0-100
  clarificationAsked: boolean("clarification_asked").notNull().default(false),
  clarificationAnswered: boolean("clarification_answered").notNull().default(false),
  
  // Solution tracking
  solutionsAttempted: text("solutions_attempted").array(), // What solutions have been tried
  currentSolutionStep: integer("current_solution_step").default(0), // For multi-step solutions
  solutionSuccessful: boolean("solution_successful"),
  
  // Proactive suggestions
  predictedNextIssues: text("predicted_next_issues").array(), // What they might ask next
  suggestedResources: text("suggested_resources").array(), // KB articles to recommend
  
  // Conversation quality
  averageSentiment: integer("average_sentiment").notNull().default(0), // Running average
  frustrationPeaks: integer("frustration_peaks").notNull().default(0), // Count of high frustration moments
  turnsToResolution: integer("turns_to_resolution"), // How many exchanges to resolve
  
  // Memory references used
  memoriesUsed: text("memories_used").array(), // Which customer memories were applied
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Proactive Suggestions - Pattern-based recommendations
export const proactiveSuggestions = pgTable("proactive_suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Trigger pattern
  triggerType: text("trigger_type").notNull(), // 'keyword' | 'intent' | 'sentiment' | 'sequence' | 'time'
  triggerPattern: text("trigger_pattern").notNull(), // The pattern that triggers this suggestion
  
  // Suggestion content
  suggestionType: text("suggestion_type").notNull(), // 'article' | 'action' | 'question' | 'escalation'
  suggestionContent: text("suggestion_content").notNull(), // What to suggest
  suggestionPriority: integer("suggestion_priority").notNull().default(50), // 0-100
  
  // Targeting
  applicableIntents: text("applicable_intents").array(), // Which intents this applies to
  applicableCategories: text("applicable_categories").array(), // Which support categories
  
  // Performance tracking
  timesShown: integer("times_shown").notNull().default(0),
  timesAccepted: integer("times_accepted").notNull().default(0),
  timesIgnored: integer("times_ignored").notNull().default(0),
  successRate: integer("success_rate").notNull().default(0), // 0-100
  
  isActive: boolean("is_active").notNull().default(true),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Customer Memory insert schema and types
export const insertCustomerMemorySchema = createInsertSchema(customerMemory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCustomerMemory = z.infer<typeof insertCustomerMemorySchema>;
export type CustomerMemory = typeof customerMemory.$inferSelect;

// Sentiment Tracking insert schema and types
export const insertSentimentTrackingSchema = createInsertSchema(sentimentTracking).omit({
  id: true,
  createdAt: true,
});
export type InsertSentimentTracking = z.infer<typeof insertSentimentTrackingSchema>;
export type SentimentTracking = typeof sentimentTracking.$inferSelect;

// Conversation Intelligence insert schema and types
export const insertConversationIntelligenceSchema = createInsertSchema(conversationIntelligence).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertConversationIntelligence = z.infer<typeof insertConversationIntelligenceSchema>;
export type ConversationIntelligence = typeof conversationIntelligence.$inferSelect;

// Proactive Suggestions insert schema and types
export const insertProactiveSuggestionsSchema = createInsertSchema(proactiveSuggestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProactiveSuggestions = z.infer<typeof insertProactiveSuggestionsSchema>;
export type ProactiveSuggestions = typeof proactiveSuggestions.$inferSelect;

// ============================================
// MULTI-REGION & KNOWLEDGE COLLECTIONS
// ============================================

// Organization Members - For org-level oversight roles (separate from workspace membership)
export const organizationMembers = pgTable("organization_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  // Role at organization level
  role: text("role").notNull().default("viewer"), // 'owner' | 'admin' | 'manager' | 'viewer'
  
  // Permissions
  canViewAllConversations: boolean("can_view_all_conversations").notNull().default(true), // See all workspace conversations
  canManageWorkspaces: boolean("can_manage_workspaces").notNull().default(false),
  canManageMembers: boolean("can_manage_members").notNull().default(false),
  canManageSettings: boolean("can_manage_settings").notNull().default(false),
  
  // Status
  status: text("status").notNull().default("active"), // 'active' | 'invited' | 'suspended'
  invitedBy: varchar("invited_by").references(() => users.id),
  invitedAt: timestamp("invited_at"),
  acceptedAt: timestamp("accepted_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  uniqueOrgUser: unique().on(table.organizationId, table.userId),
}));

// Knowledge Collections - Groupings of KB articles that can be shared across workspaces
export const knowledgeCollections = pgTable("knowledge_collections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Collection info
  name: text("name").notNull(),
  description: text("description"),
  slug: text("slug").notNull(), // URL-friendly identifier
  
  // Ownership
  ownerOrganizationId: varchar("owner_organization_id").references(() => organizations.id),
  
  // Visibility/sharing
  visibility: text("visibility").notNull().default("organization"), // 'private' | 'organization' | 'shared'
  
  // Locale settings
  defaultLocale: text("default_locale").notNull().default("en"),
  supportedLocales: text("supported_locales").array().default(sql`ARRAY['en']::text[]`),
  
  // Status
  isActive: boolean("is_active").notNull().default(true),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Knowledge Collection Articles - Junction table linking articles to collections
export const knowledgeCollectionArticles = pgTable("knowledge_collection_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  collectionId: varchar("collection_id").notNull().references(() => knowledgeCollections.id),
  articleId: varchar("article_id").notNull().references(() => knowledgeBase.id),
  
  // Ordering within collection
  sortOrder: integer("sort_order").notNull().default(0),
  
  // Locale override (if article has translations)
  locale: text("locale"), // null = use article's default
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueCollectionArticle: unique().on(table.collectionId, table.articleId),
}));

// Workspace Knowledge Collections - Which collections a workspace can access
export const workspaceKnowledgeCollections = pgTable("workspace_knowledge_collections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id),
  collectionId: varchar("collection_id").notNull().references(() => knowledgeCollections.id),
  
  // Access level
  accessLevel: text("access_level").notNull().default("read"), // 'read' | 'contribute' | 'manage'
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueWorkspaceCollection: unique().on(table.workspaceId, table.collectionId),
}));

// Region insert schema and types
export const insertRegionSchema = createInsertSchema(regions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRegion = z.infer<typeof insertRegionSchema>;
export type Region = typeof regions.$inferSelect;

// Organization Members insert schema and types
export const insertOrganizationMemberSchema = createInsertSchema(organizationMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOrganizationMember = z.infer<typeof insertOrganizationMemberSchema>;
export type OrganizationMember = typeof organizationMembers.$inferSelect;

// Knowledge Collections insert schema and types
export const insertKnowledgeCollectionSchema = createInsertSchema(knowledgeCollections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertKnowledgeCollection = z.infer<typeof insertKnowledgeCollectionSchema>;
export type KnowledgeCollection = typeof knowledgeCollections.$inferSelect;

// Knowledge Collection Articles insert schema and types
export const insertKnowledgeCollectionArticleSchema = createInsertSchema(knowledgeCollectionArticles).omit({
  id: true,
  createdAt: true,
});
export type InsertKnowledgeCollectionArticle = z.infer<typeof insertKnowledgeCollectionArticleSchema>;
export type KnowledgeCollectionArticle = typeof knowledgeCollectionArticles.$inferSelect;

// Workspace Knowledge Collections insert schema and types
export const insertWorkspaceKnowledgeCollectionSchema = createInsertSchema(workspaceKnowledgeCollections).omit({
  id: true,
  createdAt: true,
});
export type InsertWorkspaceKnowledgeCollection = z.infer<typeof insertWorkspaceKnowledgeCollectionSchema>;
export type WorkspaceKnowledgeCollection = typeof workspaceKnowledgeCollections.$inferSelect;

// ============================================
// RESOLUTION HISTORY
// Track successful solutions to customer issues for recurring problem handling
// ============================================

export const resolutionRecords = pgTable("resolution_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Tenant scoping
  organizationId: varchar("organization_id").references(() => organizations.id),
  workspaceId: varchar("workspace_id").references(() => workspaces.id),
  
  // Link to customer and conversation
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  conversationId: varchar("conversation_id").references(() => conversations.id),
  
  // Issue categorization
  issueCategory: text("issue_category").notNull(), // e.g., 'billing', 'technical', 'account'
  issueType: text("issue_type"), // More specific: 'payment_failed', 'login_issue', etc.
  issueDescription: text("issue_description"), // Brief description of the problem
  
  // Solution details
  solutionSource: text("solution_source").notNull(), // 'kb_article' | 'manual_steps' | 'external_link' | 'agent_action'
  solutionReference: varchar("solution_reference"), // KB article ID if from knowledge base
  solutionTitle: text("solution_title"), // Title of the solution for quick display
  solutionSteps: text("solution_steps"), // Detailed steps taken to resolve
  solutionExternalUrl: text("solution_external_url"), // If external resource was used
  
  // Outcome tracking
  outcome: text("outcome").notNull().default("resolved"), // 'resolved' | 'partially_resolved' | 'not_resolved'
  resolutionTimeMinutes: integer("resolution_time_minutes"), // How long it took to resolve
  
  // Agent and notes
  resolvedBy: varchar("resolved_by").references(() => users.id),
  agentNotes: text("agent_notes"), // Private notes for agents
  customerFeedback: text("customer_feedback"), // Customer's feedback if provided
  
  // Tags for flexible categorization
  tags: text("tags").array(),
  
  // Metadata
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  customerIssueCategoryIdx: index("resolution_customer_issue_idx").on(table.customerId, table.issueCategory, table.outcome),
  workspaceIdx: index("resolution_workspace_idx").on(table.workspaceId),
  organizationIdx: index("resolution_organization_idx").on(table.organizationId),
  outcomeIdx: index("resolution_outcome_idx").on(table.outcome, table.createdAt),
}));

// Resolution Records insert schema and types
export const insertResolutionRecordSchema = createInsertSchema(resolutionRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertResolutionRecord = z.infer<typeof insertResolutionRecordSchema>;
export type ResolutionRecord = typeof resolutionRecords.$inferSelect;

// ============================================
// WORKFLOW PLAYBOOKS (Decision Trees / Troubleshooting Flows)
// Structured conversation guides for agents with branching logic
// ============================================

// Main workflow/playbook container
export const workflowPlaybooks = pgTable("workflow_playbooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Identity
  name: text("name").notNull(), // e.g., "PAX Disconnection Troubleshooting"
  slug: text("slug").notNull(), // URL-friendly identifier
  description: text("description"), // Brief description of what this workflow handles
  
  // Categorization
  category: text("category"), // e.g., "hardware", "billing", "technical"
  triggerKeywords: text("trigger_keywords").array(), // Keywords that suggest this workflow: ["pax", "disconnected", "terminal"]
  
  // Status and versioning
  status: text("status").notNull().default("draft"), // 'draft' | 'published' | 'retired'
  version: integer("version").notNull().default(1),
  
  // Entry point
  startNodeId: varchar("start_node_id"), // The first node in the workflow
  
  // Tenant scoping
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id),
  organizationId: varchar("organization_id").references(() => organizations.id),
  
  // Visibility
  visibility: text("visibility").notNull().default("workspace"), // 'workspace' | 'organization' | 'global'
  
  // Audit
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  uniqueSlugWorkspace: unique().on(table.slug, table.workspaceId),
  workspaceIdx: index("workflow_playbook_workspace_idx").on(table.workspaceId),
  statusIdx: index("workflow_playbook_status_idx").on(table.status),
  categoryIdx: index("workflow_playbook_category_idx").on(table.category),
}));

// Workflow nodes - individual steps in the decision tree
export const workflowNodes = pgTable("workflow_nodes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Parent workflow
  playbookId: varchar("playbook_id").notNull().references(() => workflowPlaybooks.id, { onDelete: 'cascade' }),
  
  // Node type determines behavior
  nodeType: text("node_type").notNull(), // 'question' | 'action' | 'condition' | 'resolution' | 'info'
  
  // Content
  title: text("title").notNull(), // Short title: "Check Power Status"
  prompt: text("prompt"), // Question to ask or action to perform: "Did the customer experience a power outage?"
  description: text("description"), // Extended instructions for the agent
  
  // For 'question' nodes - predefined answer options
  options: jsonb("options"), // Array: [{ value: 'power_outage', label: 'Yes, power outage' }, { value: 'pax_update', label: 'No, PAX was updated' }]
  
  // For 'action' nodes - automated or manual steps
  actionType: text("action_type"), // 'manual' | 'automated' | 'api_call'
  actionConfig: jsonb("action_config"), // Configuration for automated actions
  
  // For 'resolution' nodes
  resolutionType: text("resolution_type"), // 'success' | 'escalate' | 'external'
  resolutionMessage: text("resolution_message"), // Final message or next steps
  
  // Knowledge base integration
  linkedArticleId: varchar("linked_article_id"), // Link to KB article for reference
  linkedDocumentId: varchar("linked_document_id").references(() => documents.id),
  
  // Position for visual editor
  positionX: integer("position_x").default(0),
  positionY: integer("position_y").default(0),
  
  // Metadata
  isEntryPoint: boolean("is_entry_point").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  playbookIdx: index("workflow_node_playbook_idx").on(table.playbookId),
  nodeTypeIdx: index("workflow_node_type_idx").on(table.nodeType),
}));

// Workflow edges - connections between nodes with branching logic
export const workflowEdges = pgTable("workflow_edges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Connection
  playbookId: varchar("playbook_id").notNull().references(() => workflowPlaybooks.id, { onDelete: 'cascade' }),
  sourceNodeId: varchar("source_node_id").notNull().references(() => workflowNodes.id, { onDelete: 'cascade' }),
  targetNodeId: varchar("target_node_id").notNull().references(() => workflowNodes.id, { onDelete: 'cascade' }),
  
  // Condition for this path (when does this edge apply?)
  conditionType: text("condition_type").notNull().default("default"), // 'default' | 'option' | 'expression'
  conditionValue: text("condition_value"), // The value that triggers this edge (e.g., 'power_outage')
  conditionLabel: text("condition_label"), // Display label: "If power outage"
  
  // Ordering for fallback paths
  priority: integer("priority").notNull().default(0), // Lower = higher priority
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  playbookIdx: index("workflow_edge_playbook_idx").on(table.playbookId),
  sourceIdx: index("workflow_edge_source_idx").on(table.sourceNodeId),
  targetIdx: index("workflow_edge_target_idx").on(table.targetNodeId),
}));

// Workflow sessions - tracks agent progress through a workflow for a conversation
export const workflowSessions = pgTable("workflow_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Links
  playbookId: varchar("playbook_id").notNull().references(() => workflowPlaybooks.id),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id),
  
  // Progress tracking
  currentNodeId: varchar("current_node_id").references(() => workflowNodes.id),
  status: text("status").notNull().default("active"), // 'active' | 'completed' | 'abandoned' | 'escalated'
  
  // History of visited nodes and answers
  nodeHistory: jsonb("node_history"), // Array: [{ nodeId, answer, timestamp }]
  
  // Outcome
  resolutionNodeId: varchar("resolution_node_id").references(() => workflowNodes.id),
  resolutionOutcome: text("resolution_outcome"), // 'success' | 'escalated' | 'unresolved'
  resolutionNotes: text("resolution_notes"),
  
  // Agent and timing
  agentId: varchar("agent_id").references(() => users.id),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  conversationIdx: index("workflow_session_conversation_idx").on(table.conversationId),
  playbookIdx: index("workflow_session_playbook_idx").on(table.playbookId),
  statusIdx: index("workflow_session_status_idx").on(table.status),
}));

// Workflow Playbooks insert schema and types
export const insertWorkflowPlaybookSchema = createInsertSchema(workflowPlaybooks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertWorkflowPlaybook = z.infer<typeof insertWorkflowPlaybookSchema>;
export type WorkflowPlaybook = typeof workflowPlaybooks.$inferSelect;

// Workflow Nodes insert schema and types
export const insertWorkflowNodeSchema = createInsertSchema(workflowNodes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertWorkflowNode = z.infer<typeof insertWorkflowNodeSchema>;
export type WorkflowNode = typeof workflowNodes.$inferSelect;

// Workflow Edges insert schema and types
export const insertWorkflowEdgeSchema = createInsertSchema(workflowEdges).omit({
  id: true,
  createdAt: true,
});
export type InsertWorkflowEdge = z.infer<typeof insertWorkflowEdgeSchema>;
export type WorkflowEdge = typeof workflowEdges.$inferSelect;

// Workflow Sessions insert schema and types
export const insertWorkflowSessionSchema = createInsertSchema(workflowSessions).omit({
  id: true,
  startedAt: true,
});
export type InsertWorkflowSession = z.infer<typeof insertWorkflowSessionSchema>;
export type WorkflowSession = typeof workflowSessions.$inferSelect;
