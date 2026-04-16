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
  // Embed Integration
  embedSecret: text("embed_secret"), // Secret key for signing customer JWT tokens for embed widget
  embedSecretCreatedAt: timestamp("embed_secret_created_at"), // When the embed secret was last generated
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  // Sub-organization hierarchy
  parentOrganizationId: varchar("parent_organization_id"), // Self-referential FK for org hierarchy (parent org → child orgs)
  // Soft delete
  deletedAt: timestamp("deleted_at"), // When set, record is considered deleted (soft delete)
  deletedBy: varchar("deleted_by"), // User ID who deleted this record
}, (table) => ({
  parentOrgIdx: index("idx_org_parent").on(table.parentOrganizationId),
}));

// Organization Applications - For businesses requesting to join the platform
export const organizationApplications = pgTable("organization_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Organization Details
  organizationName: text("organization_name").notNull(),
  slug: text("slug").notNull(), // Proposed URL-friendly identifier
  website: text("website"),
  industry: text("industry"),
  companySize: text("company_size"), // '1-10', '11-50', '51-200', '201-500', '500+'
  // Contact Information
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  contactRole: text("contact_role"), // e.g., 'CEO', 'CTO', 'Support Manager'
  // Business Details
  useCase: text("use_case"), // How they plan to use the platform
  expectedVolume: text("expected_volume"), // Expected monthly conversation volume
  currentSolution: text("current_solution"), // What they currently use
  // Application Status
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected', 'duplicate'
  duplicateOfOrgId: varchar("duplicate_of_org_id").references(() => organizations.id),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  // If approved, link to created organization
  approvedOrgId: varchar("approved_org_id").references(() => organizations.id),
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Organization Setup Tokens - Shareable links for organization contact to complete setup
export const organizationSetupTokens = pgTable("organization_setup_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(), // Secure random token for the setup link
  organizationId: varchar("organization_id").references(() => organizations.id), // Linked org (if already created)
  applicationId: varchar("application_id").references(() => organizationApplications.id), // Linked application (if from approval)
  // Contact details for the person who will complete setup
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactRole: text("contact_role"),
  // Organization details (pre-filled from admin or application)
  organizationName: text("organization_name").notNull(),
  organizationSlug: text("organization_slug").notNull(),
  // Token status
  status: text("status").notNull().default("pending"), // 'pending' | 'completed' | 'expired' | 'revoked'
  expiresAt: timestamp("expires_at").notNull(), // When the token becomes invalid
  completedAt: timestamp("completed_at"), // When setup was completed
  // Who created this invitation
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOrganizationSetupTokenSchema = createInsertSchema(organizationSetupTokens).omit({ id: true, createdAt: true });
export type InsertOrganizationSetupToken = z.infer<typeof insertOrganizationSetupTokenSchema>;
export type OrganizationSetupToken = typeof organizationSetupTokens.$inferSelect;

// ============================================
// AUDIT LOG - Track all changes for historical data preservation
// ============================================

// Audit Log - Records all significant changes to entities for historical tracking
export const auditLog = pgTable("audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // What was changed
  entityType: text("entity_type").notNull(), // 'organization' | 'user' | 'workspace' | 'customer'
  entityId: varchar("entity_id").notNull(), // ID of the entity that was changed
  
  // What kind of change
  action: text("action").notNull(), // 'create' | 'update' | 'delete' | 'restore'
  
  // Who made the change
  performedBy: varchar("performed_by"), // User ID who made the change (null for system actions)
  performedByType: text("performed_by_type").default("user"), // 'user' | 'system' | 'customer'
  
  // Organization scope for multi-tenant isolation
  organizationId: varchar("organization_id"), // Organization context (null for platform-level changes)
  
  // Change details
  fieldName: text("field_name"), // Which field was changed (null for create/delete)
  oldValue: text("old_value"), // Previous value (JSON stringified for complex types)
  newValue: text("new_value"), // New value (JSON stringified for complex types)
  
  // Full snapshot of entity at time of change (for name changes, deletions, etc.)
  entitySnapshot: jsonb("entity_snapshot"), // Complete entity state at time of change
  
  // Additional context
  reason: text("reason"), // Optional reason for the change
  metadata: jsonb("metadata"), // Additional context (IP address, user agent, etc.)
  
  // Timestamp
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_audit_log_entity").on(table.entityType, table.entityId),
  index("idx_audit_log_org").on(table.organizationId),
  index("idx_audit_log_performed_by").on(table.performedBy),
  index("idx_audit_log_created_at").on(table.createdAt),
]);

export const insertAuditLogSchema = createInsertSchema(auditLog).omit({ id: true, createdAt: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLog.$inferSelect;

// Conversation Merge Schema
export const conversationMergeSchema = z.object({
  targetConversationId: z.string().uuid('Invalid target conversation ID'),
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

// Legal Policies - Region-specific terms, privacy, cookie policies
export const legalPolicies = pgTable("legal_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Organization scope (null = platform-wide default)
  organizationId: varchar("organization_id").references(() => organizations.id),
  
  // Policy type
  type: text("type").notNull(), // 'terms' | 'privacy' | 'cookies'
  
  // Region targeting
  region: text("region").notNull().default("global"), // 'us' | 'eu' | 'uk' | 'caribbean' | 'global' etc.
  
  // Content
  title: text("title").notNull(),
  content: text("content").notNull(), // Full policy content (markdown)
  summary: text("summary"), // Brief summary of the policy
  
  // Versioning
  version: text("version").notNull().default("1.0"),
  effectiveDate: timestamp("effective_date").notNull().defaultNow(),
  
  // Generation metadata
  generatedByAi: boolean("generated_by_ai").notNull().default(false),
  aiModel: text("ai_model"), // e.g., 'gpt-5'
  generationPrompt: text("generation_prompt"), // Store prompt used for regeneration
  
  // Status
  status: text("status").notNull().default("draft"), // 'draft' | 'published' | 'archived'
  publishedAt: timestamp("published_at"),
  publishedBy: varchar("published_by").references(() => users.id),
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
}, (table) => ({
  uniqueOrgTypeRegion: unique().on(table.organizationId, table.type, table.region),
}));

export const insertLegalPolicySchema = createInsertSchema(legalPolicies).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLegalPolicy = z.infer<typeof insertLegalPolicySchema>;
export type LegalPolicy = typeof legalPolicies.$inferSelect;

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
  hasCompletedOnboarding: boolean("has_completed_onboarding").notNull().default(false), // Whether user has seen/completed welcome onboarding
  mustChangePassword: boolean("must_change_password").notNull().default(false), // Require password change on next login
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  // Soft delete
  deletedAt: timestamp("deleted_at"), // When set, record is considered deleted (soft delete)
  deletedBy: varchar("deleted_by"), // User ID who deleted this record
  // Two-Factor Authentication (TOTP)
  twoFactorSecret: text("two_factor_secret"), // Encrypted TOTP secret (null if 2FA not set up)
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  twoFactorBackupCodes: text("two_factor_backup_codes").array(), // Hashed backup codes
});

// Staff invite tokens for self-registration
export const staffInvites = pgTable("staff_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(), // Unique invite token
  email: text("email").notNull(), // Pre-filled email for the invite
  name: text("name"), // Optional pre-filled name
  role: text("role").notNull().default("agent"), // 'agent' | 'admin'
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  invitedBy: varchar("invited_by").notNull(), // User ID who created the invite
  expiresAt: timestamp("expires_at").notNull(), // When the invite expires
  usedAt: timestamp("used_at"), // When the invite was used (null if unused)
  usedBy: varchar("used_by"), // User ID who used the invite
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStaffInviteSchema = createInsertSchema(staffInvites).omit({
  id: true,
  createdAt: true,
});
export type InsertStaffInvite = z.infer<typeof insertStaffInviteSchema>;
export type StaffInvite = typeof staffInvites.$inferSelect;

// Workspaces table - sub-divisions within organizations
export const workspaces = pgTable("workspaces", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  companyName: text("company_name"), // Legal company name
  dba: text("dba").notNull(), // Doing Business As (required)
  phone: text("phone"), // Contact phone number
  email: text("email").notNull(), // Contact email (required)
  description: text("description"),
  slug: text("slug").notNull(), // URL-friendly identifier (auto-generated)
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
  // Soft delete
  deletedAt: timestamp("deleted_at"), // When set, record is considered deleted (soft delete)
  deletedBy: varchar("deleted_by"), // User ID who deleted this record
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
  // Notification preferences
  smsOptIn: boolean("sms_opt_in").notNull().default(false), // Customer opted in for SMS notifications
  emailOptIn: boolean("email_opt_in").notNull().default(true), // Customer opted in for email notifications
  // Soft delete
  deletedAt: timestamp("deleted_at"), // When set, record is considered deleted (soft delete)
  deletedBy: varchar("deleted_by"), // User ID who deleted this record
}, (table) => [
  // Partial unique index: ensures only ONE admin per customer organization
  // This prevents race conditions where concurrent signups could both become admin
  uniqueIndex("idx_customers_one_admin_per_org")
    .on(table.customerOrganizationId)
    .where(sql`${table.customerOrgRole} = 'admin'`),
]);

// ============================================
// CUSTOMER ORGANIZATION MEMBERSHIPS - Multi-org customer access
// ============================================
export const customerOrganizationMemberships = pgTable("customer_organization_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  role: text("role").notNull().default("member"), // 'admin' | 'member'
  status: text("status").notNull().default("active"), // 'active' | 'invited' | 'suspended'
  invitedBy: varchar("invited_by"),
  invitedAt: timestamp("invited_at").notNull().defaultNow(),
  joinedAt: timestamp("joined_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueCustomerOrg: unique().on(table.customerId, table.organizationId),
  orgIdx: index("idx_customer_org_memberships_org").on(table.organizationId),
  customerIdx: index("idx_customer_org_memberships_customer").on(table.customerId),
}));

// ============================================
// STATIONS - Customer workgroups managed by a customer admin
// ============================================
export const stations = pgTable("stations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  workspaceId: varchar("workspace_id").references(() => workspaces.id),
  departmentId: varchar("department_id").references(() => departments.id),
  isActive: boolean("is_active").notNull().default(true),
  settings: jsonb("settings"),
  externalId: text("external_id"),
  externalSystem: text("external_system"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  country: text("country").default("US"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  uniqueOrgSlug: unique().on(table.organizationId, table.slug),
  orgIdx: index("idx_stations_org").on(table.organizationId),
  externalIdx: index("idx_stations_external").on(table.organizationId, table.externalId, table.externalSystem),
}));

// Station Members - junction for customers in stations with roles
export const stationMembers = pgTable("station_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stationId: varchar("station_id").notNull().references(() => stations.id),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  role: text("role").notNull().default("member"), // 'admin' | 'member'
  invitedByCustomerId: varchar("invited_by_customer_id").references(() => customers.id),
  invitedAt: timestamp("invited_at").notNull().defaultNow(),
  joinedAt: timestamp("joined_at"),
  status: text("status").notNull().default("active"), // 'active' | 'invited' | 'suspended'
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueStationCustomer: unique().on(table.stationId, table.customerId),
  stationIdx: index("idx_station_members_station").on(table.stationId),
  customerIdx: index("idx_station_members_customer").on(table.customerId),
}));

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
  stationId: varchar("station_id").references(() => stations.id), // Station context for shared customer workgroup conversations
  customerLanguage: text("customer_language").default("en"), // Customer's preferred language for translation (ISO 639-1 code)
  // Customer engagement tracking fields
  lastCustomerReplyAt: timestamp("last_customer_reply_at"), // Last time customer sent a message
  lastAgentReplyAt: timestamp("last_agent_reply_at"), // Last time agent/AI sent a message
  customerLastViewedAt: timestamp("customer_last_viewed_at"), // Last time customer viewed conversation
  autoFollowupSentAt: timestamp("auto_followup_sent_at"), // Last time auto-followup was sent
  autoFollowupCount: integer("auto_followup_count").notNull().default(0), // Number of auto-followups sent
  participatingAgentIds: text("participating_agent_ids").array().default([]), // Array of agent IDs who have responded to this conversation
  // Tags for flexible categorization and filtering
  tags: text("tags").array().default([]), // Freeform tags e.g. ['billing', 'urgent', 'bug']
  // CSAT survey tracking
  surveyStatus: text("survey_status").notNull().default("not_sent"), // 'not_sent' | 'sent' | 'completed'
  surveyToken: text("survey_token"), // Unique token for secure survey link
  // SLA tracking
  slaFirstResponseAt: timestamp("sla_first_response_at"), // Deadline for first agent response
  slaResolutionAt: timestamp("sla_resolution_at"), // Deadline for resolution
  slaFirstResponseBreached: boolean("sla_first_response_breached").notNull().default(false),
  slaResolutionBreached: boolean("sla_resolution_breached").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  orgStatusIdx: index("idx_conversations_org_status").on(table.organizationId, table.status),
  orgUpdatedIdx: index("idx_conversations_org_updated").on(table.organizationId, table.updatedAt),
  customerIdx: index("idx_conversations_customer").on(table.customerId),
  agentIdx: index("idx_conversations_agent").on(table.assignedAgentId),
  workspaceStatusIdx: index("idx_conversations_workspace").on(table.workspaceId, table.status),
  statusPriorityIdx: index("idx_conversations_status_priority").on(table.status, table.priority),
}));

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
}, (table) => ({
  conversationTimestampIdx: index("idx_messages_conversation_timestamp").on(table.conversationId, table.timestamp),
  senderIdx: index("idx_messages_sender").on(table.senderId, table.senderType),
}));

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
  agentType: text("agent_type").notNull().default("general"), // 'sales' | 'support' | 'billing' | 'general'
  systemPrompt: text("system_prompt").notNull(), // AI personality and behavior instructions
  greeting: text("greeting"), // Custom greeting message when starting conversations
  isActive: boolean("is_active").notNull().default(true),
  autoTakeoverThreshold: integer("auto_takeover_threshold").notNull().default(70), // Confidence threshold for automatic handoff to humans
  specializations: text("specializations").array(), // Categories this agent handles well
  knowledgeBaseIds: text("knowledge_base_ids").array(), // Which knowledge base articles this agent can access
  knowledgeCollectionIds: text("knowledge_collection_ids").array(), // Which knowledge collections this agent can access
  maxTokens: integer("max_tokens").notNull().default(1000),
  temperature: integer("temperature").notNull().default(30), // Stored as integer (0-100), divided by 100 for API
  responseFormat: text("response_format").notNull().default('conversational'), // 'conversational' | 'step_by_step' | 'faq' | 'technical' | 'bullet_points'
  // Diagnostic flow settings for troubleshooting
  diagnosticFlowEnabled: boolean("diagnostic_flow_enabled").notNull().default(false), // Enable multi-step troubleshooting
  diagnosticQuestions: jsonb("diagnostic_questions"), // Array of {id, question, type, options?, followUpQuestionId?}
  includeResourceLinks: boolean("include_resource_links").notNull().default(true), // Include links to knowledge base articles in responses
  // External Research (Perplexity) settings
  externalResearchEnabled: boolean("external_research_enabled").notNull().default(false), // Enable Perplexity for real-time web research
  externalResearchSettings: jsonb("external_research_settings"), // { allowedDomains?: string[], maxQueriesPerHour?: number, searchRecency?: string }
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
  stationId: varchar("station_id").references(() => stations.id), // Station context for shared customer workgroup tickets
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
}, (table) => ({
  kbIdx: index("idx_knowledge_chunks_kb").on(table.knowledgeBaseId),
  categoryIdx: index("idx_knowledge_chunks_category").on(table.category),
}));

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
  organizationMemberships: many(customerOrganizationMemberships),
  stationMemberships: many(stationMembers),
}));

export const customerOrganizationMembershipsRelations = relations(customerOrganizationMemberships, ({ one }) => ({
  customer: one(customers, {
    fields: [customerOrganizationMemberships.customerId],
    references: [customers.id],
  }),
  organization: one(organizations, {
    fields: [customerOrganizationMemberships.organizationId],
    references: [organizations.id],
  }),
}));

export const stationsRelations = relations(stations, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [stations.organizationId],
    references: [organizations.id],
  }),
  workspace: one(workspaces, {
    fields: [stations.workspaceId],
    references: [workspaces.id],
  }),
  members: many(stationMembers),
  conversations: many(conversations),
}));

export const stationMembersRelations = relations(stationMembers, ({ one }) => ({
  station: one(stations, {
    fields: [stationMembers.stationId],
    references: [stations.id],
  }),
  customer: one(customers, {
    fields: [stationMembers.customerId],
    references: [customers.id],
  }),
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
  station: one(stations, {
    fields: [conversations.stationId],
    references: [stations.id],
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
  parentOrganizationId: true,
});

export const updateOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export const insertOrganizationApplicationSchema = createInsertSchema(organizationApplications).pick({
  organizationName: true,
  slug: true,
  website: true,
  industry: true,
  companySize: true,
  contactName: true,
  contactEmail: true,
  contactPhone: true,
  contactRole: true,
  useCase: true,
  expectedVolume: true,
  currentSolution: true,
});

export const updateOrganizationApplicationSchema = createInsertSchema(organizationApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

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
  companyName: true,
  dba: true,
  phone: true,
  email: true,
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

export const insertCustomerOrganizationMembershipSchema = createInsertSchema(customerOrganizationMemberships).omit({
  id: true,
  createdAt: true,
});

export const insertStationSchema = createInsertSchema(stations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStationMemberSchema = createInsertSchema(stationMembers).omit({
  id: true,
  createdAt: true,
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
  phone: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  ipAddress: z.string().optional(),
  contextData: z.record(z.any()).optional(), // Custom context data from 3rd party integrations
  organizationId: z.string().optional(), // Platform organization ID for multi-tenant scoping
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

export type InsertConversationRating = z.infer<typeof insertConversationRatingSchema>;
export type ConversationRating = typeof conversationRatings.$inferSelect;

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
  agentType: true,
  systemPrompt: true,
  greeting: true,
  isActive: true,
  autoTakeoverThreshold: true,
  specializations: true,
  knowledgeBaseIds: true,
  knowledgeCollectionIds: true,
  maxTokens: true,
  temperature: true,
  responseFormat: true,
  diagnosticFlowEnabled: true,
  diagnosticQuestions: true,
  includeResourceLinks: true,
  externalResearchEnabled: true,
  externalResearchSettings: true,
  organizationId: true,
  workspaceId: true,
  departmentId: true,
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
export type InsertOrganizationApplication = z.infer<typeof insertOrganizationApplicationSchema>;
export type OrganizationApplication = typeof organizationApplications.$inferSelect;
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
export type InsertCustomerOrganizationMembership = z.infer<typeof insertCustomerOrganizationMembershipSchema>;
export type CustomerOrganizationMembership = typeof customerOrganizationMemberships.$inferSelect;
export type InsertStation = z.infer<typeof insertStationSchema>;
export type Station = typeof stations.$inferSelect;
export type InsertStationMember = z.infer<typeof insertStationMemberSchema>;
export type StationMember = typeof stationMembers.$inferSelect;
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
  organizationId: varchar("organization_id").references(() => organizations.id), // Multi-tenant organization scoping
  userId: varchar("user_id").references(() => users.id), // Track which user triggered the AI call
  
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

// ============================================
// CLOUD STORAGE INTEGRATION - Marketplace Connections
// ============================================

// Cloud Storage OAuth Configurations - Workspace-level OAuth app credentials
export const cloudStorageOAuthConfigs = pgTable("cloud_storage_oauth_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Multi-tenant scoping
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id),
  
  // Provider info
  provider: text("provider").notNull(), // 'google_drive' | 'onedrive' | 'dropbox'
  
  // OAuth App Credentials (encrypted at rest in production)
  clientId: text("client_id").notNull(),
  clientSecret: text("client_secret").notNull(),
  
  // Configuration status
  isEnabled: boolean("is_enabled").notNull().default(true),
  
  // Metadata
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("cloud_storage_oauth_org_idx").on(table.organizationId),
  workspaceIdx: index("cloud_storage_oauth_workspace_idx").on(table.workspaceId),
  uniqueConfig: uniqueIndex("cloud_storage_oauth_unique_idx").on(table.workspaceId, table.provider),
}));

// Cloud Storage Connections - OAuth connections to Google Drive, OneDrive, Dropbox
export const cloudStorageConnections = pgTable("cloud_storage_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Multi-tenant scoping
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id),
  
  // Provider info
  provider: text("provider").notNull(), // 'google_drive' | 'onedrive' | 'dropbox'
  displayName: text("display_name").notNull(), // User-friendly name for the connection
  accountEmail: text("account_email"), // Email associated with the cloud account
  accountName: text("account_name"), // Display name of the cloud account
  
  // OAuth tokens (encrypted at rest)
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  scopes: text("scopes").array(), // Granted OAuth scopes
  
  // Connection status
  status: text("status").notNull().default("connected"), // 'connected' | 'error' | 'expired' | 'disconnected'
  errorMessage: text("error_message"),
  
  // Sync configuration
  syncMode: text("sync_mode").notNull().default("manual"), // 'manual' | 'scheduled' | 'realtime'
  syncIntervalMinutes: integer("sync_interval_minutes").default(60),
  lastSyncAt: timestamp("last_sync_at"),
  nextSyncAt: timestamp("next_sync_at"),
  
  // Metadata
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("cloud_storage_conn_org_idx").on(table.organizationId),
  workspaceIdx: index("cloud_storage_conn_workspace_idx").on(table.workspaceId),
  providerIdx: index("cloud_storage_conn_provider_idx").on(table.provider),
  statusIdx: index("cloud_storage_conn_status_idx").on(table.status),
  uniqueConnection: uniqueIndex("cloud_storage_conn_unique_idx").on(table.workspaceId, table.provider, table.accountEmail),
}));

// Cloud Storage Folders - Selected folders to sync from cloud storage
export const cloudStorageFolders = pgTable("cloud_storage_folders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Connection reference
  connectionId: varchar("connection_id").notNull().references(() => cloudStorageConnections.id, { onDelete: 'cascade' }),
  
  // Folder info from provider
  providerFolderId: text("provider_folder_id").notNull(), // The folder ID in the provider's system
  folderName: text("folder_name").notNull(),
  folderPath: text("folder_path"), // Full path like /Documents/Support
  
  // Sync settings
  syncEnabled: boolean("sync_enabled").notNull().default(true),
  includeSubfolders: boolean("include_subfolders").notNull().default(true),
  
  // Sync state
  syncCursor: text("sync_cursor"), // Provider-specific cursor/token for delta sync
  lastImportedAt: timestamp("last_imported_at"),
  filesImported: integer("files_imported").notNull().default(0),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  connectionIdx: index("cloud_storage_folder_conn_idx").on(table.connectionId),
  uniqueFolder: uniqueIndex("cloud_storage_folder_unique_idx").on(table.connectionId, table.providerFolderId),
}));

// Cloud Storage Sync Runs - Logging of sync operations
export const cloudStorageSyncRuns = pgTable("cloud_storage_sync_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  connectionId: varchar("connection_id").notNull().references(() => cloudStorageConnections.id, { onDelete: 'cascade' }),
  folderId: varchar("folder_id").references(() => cloudStorageFolders.id, { onDelete: 'set null' }),
  
  // Sync details
  syncType: text("sync_type").notNull(), // 'full' | 'delta' | 'manual'
  status: text("status").notNull().default("running"), // 'running' | 'completed' | 'failed' | 'cancelled'
  
  // Stats
  filesScanned: integer("files_scanned").notNull().default(0),
  filesImported: integer("files_imported").notNull().default(0),
  filesSkipped: integer("files_skipped").notNull().default(0),
  filesFailed: integer("files_failed").notNull().default(0),
  
  // Timing
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  
  // Error tracking
  errorMessage: text("error_message"),
  errorDetails: jsonb("error_details"),
}, (table) => ({
  connectionIdx: index("cloud_storage_sync_conn_idx").on(table.connectionId),
  statusIdx: index("cloud_storage_sync_status_idx").on(table.status),
}));

// Cloud Storage Files - Track imported files to avoid duplicates
export const cloudStorageFiles = pgTable("cloud_storage_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // References
  connectionId: varchar("connection_id").notNull().references(() => cloudStorageConnections.id, { onDelete: 'cascade' }),
  folderId: varchar("folder_id").references(() => cloudStorageFolders.id, { onDelete: 'set null' }),
  knowledgeBaseId: varchar("knowledge_base_id").references(() => knowledgeBase.id, { onDelete: 'set null' }),
  
  // File info from provider
  providerFileId: text("provider_file_id").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path"),
  mimeType: text("mime_type"),
  fileSize: integer("file_size"),
  
  // Version tracking for delta sync
  providerVersion: text("provider_version"), // ETag or version ID
  providerModifiedAt: timestamp("provider_modified_at"),
  contentHash: text("content_hash"), // Hash of file content for change detection
  
  // Import status
  importStatus: text("import_status").notNull().default("pending"), // 'pending' | 'importing' | 'imported' | 'failed' | 'skipped'
  importError: text("import_error"),
  lastImportedAt: timestamp("last_imported_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  connectionIdx: index("cloud_storage_file_conn_idx").on(table.connectionId),
  folderIdx: index("cloud_storage_file_folder_idx").on(table.folderId),
  kbIdx: index("cloud_storage_file_kb_idx").on(table.knowledgeBaseId),
  uniqueFile: uniqueIndex("cloud_storage_file_unique_idx").on(table.connectionId, table.providerFileId),
}));

// Cloud Storage OAuth Configs insert schema and types
export const insertCloudStorageOAuthConfigSchema = createInsertSchema(cloudStorageOAuthConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCloudStorageOAuthConfig = z.infer<typeof insertCloudStorageOAuthConfigSchema>;
export type CloudStorageOAuthConfig = typeof cloudStorageOAuthConfigs.$inferSelect;

// Cloud Storage Connections insert schema and types
export const insertCloudStorageConnectionSchema = createInsertSchema(cloudStorageConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCloudStorageConnection = z.infer<typeof insertCloudStorageConnectionSchema>;
export type CloudStorageConnection = typeof cloudStorageConnections.$inferSelect;

// Cloud Storage Folders insert schema and types
export const insertCloudStorageFolderSchema = createInsertSchema(cloudStorageFolders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCloudStorageFolder = z.infer<typeof insertCloudStorageFolderSchema>;
export type CloudStorageFolder = typeof cloudStorageFolders.$inferSelect;

// Cloud Storage Sync Runs insert schema and types
export const insertCloudStorageSyncRunSchema = createInsertSchema(cloudStorageSyncRuns).omit({
  id: true,
  startedAt: true,
});
export type InsertCloudStorageSyncRun = z.infer<typeof insertCloudStorageSyncRunSchema>;
export type CloudStorageSyncRun = typeof cloudStorageSyncRuns.$inferSelect;

// Cloud Storage Files insert schema and types
export const insertCloudStorageFileSchema = createInsertSchema(cloudStorageFiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCloudStorageFile = z.infer<typeof insertCloudStorageFileSchema>;
export type CloudStorageFile = typeof cloudStorageFiles.$inferSelect;

// ============================================
// RAG EVALUATION & QUALITY TRACKING
// ============================================

// RAG Query Traces - Log every retrieval for evaluation and improvement
export const ragQueryTraces = pgTable("rag_query_traces", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Context
  organizationId: varchar("organization_id").references(() => organizations.id),
  workspaceId: varchar("workspace_id").references(() => workspaces.id),
  conversationId: varchar("conversation_id").references(() => conversations.id),
  customerId: varchar("customer_id").references(() => customers.id),
  
  // Query details
  query: text("query").notNull(),
  queryEmbedding: vector("query_embedding"), // For similarity analysis
  expandedTerms: text("expanded_terms").array(), // Synonyms/expansions used
  
  // Retrieval results
  retrievedChunkIds: text("retrieved_chunk_ids").array(), // Ordered list of chunk IDs
  retrievedScores: text("retrieved_scores").array(), // Corresponding scores as strings
  searchType: text("search_type").notNull().default("hybrid"), // 'keyword' | 'semantic' | 'hybrid'
  totalChunksSearched: integer("total_chunks_searched"),
  retrievalTimeMs: integer("retrieval_time_ms"),
  
  // Generation
  generatedResponse: text("generated_response"),
  responseTimeMs: integer("response_time_ms"),
  tokensUsed: integer("tokens_used"),
  modelUsed: text("model_used"),
  
  // Quality signals
  confidenceScore: integer("confidence_score"), // 0-100: AI's confidence in the response
  uncertaintyDetected: boolean("uncertainty_detected").default(false), // Did AI admit uncertainty?
  humanTakeoverTriggered: boolean("human_takeover_triggered").default(false),
  
  // Feedback
  userRating: integer("user_rating"), // 1-5 stars from user
  agentRating: integer("agent_rating"), // 1-5 from human agent review
  feedbackNote: text("feedback_note"),
  wasHelpful: boolean("was_helpful"),
  
  // Analysis
  relevanceGap: boolean("relevance_gap").default(false), // Retrieved content wasn't relevant
  missingInfo: boolean("missing_info").default(false), // KB lacked needed information
  incorrectInfo: boolean("incorrect_info").default(false), // KB had wrong information
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("rag_trace_org_idx").on(table.organizationId),
  convIdx: index("rag_trace_conv_idx").on(table.conversationId),
  createdIdx: index("rag_trace_created_idx").on(table.createdAt),
}));

// Document Quality Scores - Track quality metrics for knowledge articles
export const documentQualityScores = pgTable("document_quality_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  knowledgeBaseId: varchar("knowledge_base_id").notNull().references(() => knowledgeBase.id, { onDelete: 'cascade' }),
  
  // Structure quality (0-100)
  hasHeadings: boolean("has_headings").default(false),
  hasFAQs: boolean("has_faqs").default(false),
  hasStepByStep: boolean("has_step_by_step").default(false),
  hasImages: boolean("has_images").default(false),
  structureScore: integer("structure_score").default(0),
  
  // Content quality (0-100)
  wordCount: integer("word_count").default(0),
  avgSentenceLength: integer("avg_sentence_length").default(0),
  readabilityScore: integer("readability_score").default(0), // Flesch-Kincaid style
  contentScore: integer("content_score").default(0),
  
  // Chunking quality
  chunkCount: integer("chunk_count").default(0),
  avgChunkSize: integer("avg_chunk_size").default(0), // In tokens
  chunkSizeVariance: integer("chunk_size_variance").default(0),
  chunkingScore: integer("chunking_score").default(0),
  
  // Overall
  overallScore: integer("overall_score").default(0),
  lastAnalyzedAt: timestamp("last_analyzed_at"),
  issues: text("issues").array(), // List of detected issues
  suggestions: text("suggestions").array(), // Improvement suggestions
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  kbIdx: uniqueIndex("doc_quality_kb_idx").on(table.knowledgeBaseId),
}));

// RAG Query Traces insert schema and types
export const insertRagQueryTraceSchema = createInsertSchema(ragQueryTraces).omit({
  id: true,
  createdAt: true,
});
export type InsertRagQueryTrace = z.infer<typeof insertRagQueryTraceSchema>;
export type RagQueryTrace = typeof ragQueryTraces.$inferSelect;

// Document Quality Scores insert schema and types
export const insertDocumentQualityScoreSchema = createInsertSchema(documentQualityScores).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDocumentQualityScore = z.infer<typeof insertDocumentQualityScoreSchema>;
export type DocumentQualityScore = typeof documentQualityScores.$inferSelect;

// ============================================================================
// RBAC (Role-Based Access Control) for AI Assistance
// ============================================================================

// AI Roles - Define roles that can be assigned to users for AI access control
export const aiRoles = pgTable("ai_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text("name").notNull(), // e.g., "Cashier", "Manager", "Admin", "Sales Rep"
  description: text("description"),
  isDefault: boolean("is_default").notNull().default(false), // Default role for new users
  isSystemRole: boolean("is_system_role").notNull().default(false), // Built-in system roles
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("ai_roles_org_idx").on(table.organizationId),
  nameIdx: index("ai_roles_name_idx").on(table.organizationId, table.name),
}));

// AI Permissions - Define granular permissions for data/resource access
export const aiPermissions = pgTable("ai_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  namespace: text("namespace").notNull(), // e.g., "pos", "inventory", "hr", "finance", "crm"
  action: text("action").notNull(), // e.g., "read", "write", "delete", "export"
  resource: text("resource").notNull(), // e.g., "sales_daily", "sales_monthly", "employee_schedule"
  description: text("description"),
  sensitivityLevel: integer("sensitivity_level").notNull().default(1), // 1=low, 2=medium, 3=high, 4=critical
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("ai_perms_org_idx").on(table.organizationId),
  resourceIdx: index("ai_perms_resource_idx").on(table.namespace, table.resource),
}));

// AI Role Permissions - Map roles to permissions (many-to-many)
export const aiRolePermissions = pgTable("ai_role_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roleId: varchar("role_id").notNull().references(() => aiRoles.id, { onDelete: 'cascade' }),
  permissionId: varchar("permission_id").notNull().references(() => aiPermissions.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  rolePermIdx: uniqueIndex("ai_role_perms_idx").on(table.roleId, table.permissionId),
}));

// AI User Roles - Assign roles to users with scope (org/workspace/department level)
export const aiUserRoles = pgTable("ai_user_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: varchar("role_id").notNull().references(() => aiRoles.id, { onDelete: 'cascade' }),
  scopeType: text("scope_type").notNull().default("organization"), // 'organization' | 'workspace' | 'department'
  scopeId: varchar("scope_id").notNull(), // ID of the scope entity
  grantedBy: varchar("granted_by").references(() => users.id),
  expiresAt: timestamp("expires_at"), // Optional: role assignment expiration
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userRoleIdx: index("ai_user_roles_user_idx").on(table.userId),
  roleIdx: index("ai_user_roles_role_idx").on(table.roleId),
  scopeIdx: index("ai_user_roles_scope_idx").on(table.scopeType, table.scopeId),
}));

// AI Resource Scopes - Define data sources and their connection details
export const aiResourceScopes = pgTable("ai_resource_scopes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text("name").notNull(), // e.g., "POS Database", "HR System", "CRM"
  resource: text("resource").notNull(), // Resource identifier matching aiPermissions
  dataSourceType: text("data_source_type").notNull(), // 'azure_sql' | 'azure_cosmos' | 'aws_rds' | 'aws_dynamodb' | 'postgresql' | 'internal'
  connectionSecretKey: text("connection_secret_key"), // Reference to secret containing connection string
  tableOrCollection: text("table_or_collection"), // Target table/collection name
  queryTemplate: text("query_template"), // Parameterized query template for this resource
  rowLevelFilters: jsonb("row_level_filters"), // { "organizationId": "{{org_id}}", "workspaceId": "{{workspace_id}}" }
  metadata: jsonb("metadata"), // Additional connector-specific configuration
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("ai_resource_scopes_org_idx").on(table.organizationId),
  resourceIdx: index("ai_resource_scopes_resource_idx").on(table.resource),
}));

// AI Policy Rules - Define access policies for AI agents
export const aiPolicyRules = pgTable("ai_policy_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  agentId: varchar("agent_id").references(() => aiAgents.id, { onDelete: 'cascade' }), // Null means applies to all agents
  name: text("name").notNull(),
  description: text("description"),
  intentPatterns: text("intent_patterns").array(), // Intent patterns this rule matches (regex)
  resourcePatterns: text("resource_patterns").array(), // Resource patterns (e.g., "pos.*", "sales.*")
  requiredPermissions: text("required_permissions").array(), // Required permission IDs
  fallbackResponseTemplate: text("fallback_response_template"), // Template for denied access
  escalationPolicy: text("escalation_policy"), // 'notify_admin' | 'request_approval' | 'deny_silently'
  priority: integer("priority").notNull().default(0), // Higher = checked first
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("ai_policy_rules_org_idx").on(table.organizationId),
  agentIdx: index("ai_policy_rules_agent_idx").on(table.agentId),
  priorityIdx: index("ai_policy_rules_priority_idx").on(table.priority),
}));

// AI Access Audit - Log all AI access decisions for compliance and debugging
export const aiAccessAudit = pgTable("ai_access_audit", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  conversationId: varchar("conversation_id").references(() => conversations.id),
  messageId: varchar("message_id"),
  userId: varchar("user_id").references(() => users.id),
  customerId: varchar("customer_id").references(() => customers.id),
  agentId: varchar("agent_id").references(() => aiAgents.id),
  requestedResource: text("requested_resource").notNull(),
  requestedAction: text("requested_action").notNull(),
  decision: text("decision").notNull(), // 'allowed' | 'denied' | 'escalated'
  decisionReason: text("decision_reason"),
  policyRuleId: varchar("policy_rule_id").references(() => aiPolicyRules.id),
  userRoles: text("user_roles").array(), // Snapshot of user's roles at decision time
  matchedPermissions: text("matched_permissions").array(), // Permissions that were checked
  dataQuery: text("data_query"), // Sanitized version of query executed (if allowed)
  responseLatencyMs: integer("response_latency_ms"),
  metadata: jsonb("metadata"), // Additional context
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("ai_access_audit_org_idx").on(table.organizationId),
  convIdx: index("ai_access_audit_conv_idx").on(table.conversationId),
  userIdx: index("ai_access_audit_user_idx").on(table.userId),
  decisionIdx: index("ai_access_audit_decision_idx").on(table.decision),
  createdIdx: index("ai_access_audit_created_idx").on(table.createdAt),
}));

// RBAC Schema insert schemas and types
export const insertAiRoleSchema = createInsertSchema(aiRoles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAiRole = z.infer<typeof insertAiRoleSchema>;
export type AiRole = typeof aiRoles.$inferSelect;

export const insertAiPermissionSchema = createInsertSchema(aiPermissions).omit({
  id: true,
  createdAt: true,
});
export type InsertAiPermission = z.infer<typeof insertAiPermissionSchema>;
export type AiPermission = typeof aiPermissions.$inferSelect;

export const insertAiRolePermissionSchema = createInsertSchema(aiRolePermissions).omit({
  id: true,
  createdAt: true,
});
export type InsertAiRolePermission = z.infer<typeof insertAiRolePermissionSchema>;
export type AiRolePermission = typeof aiRolePermissions.$inferSelect;

export const insertAiUserRoleSchema = createInsertSchema(aiUserRoles).omit({
  id: true,
  createdAt: true,
});
export type InsertAiUserRole = z.infer<typeof insertAiUserRoleSchema>;
export type AiUserRole = typeof aiUserRoles.$inferSelect;

export const insertAiResourceScopeSchema = createInsertSchema(aiResourceScopes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAiResourceScope = z.infer<typeof insertAiResourceScopeSchema>;
export type AiResourceScope = typeof aiResourceScopes.$inferSelect;

export const insertAiPolicyRuleSchema = createInsertSchema(aiPolicyRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAiPolicyRule = z.infer<typeof insertAiPolicyRuleSchema>;
export type AiPolicyRule = typeof aiPolicyRules.$inferSelect;

export const insertAiAccessAuditSchema = createInsertSchema(aiAccessAudit).omit({
  id: true,
  createdAt: true,
});
export type InsertAiAccessAudit = z.infer<typeof insertAiAccessAuditSchema>;
export type AiAccessAudit = typeof aiAccessAudit.$inferSelect;

// ============================================
// EMAIL INTEGRATION - Organization email support
// ============================================

// Email Integrations - Configuration for organization support emails
export const emailIntegrations = pgTable("email_integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  workspaceId: varchar("workspace_id").references(() => workspaces.id, { onDelete: 'cascade' }),
  
  // Email address configuration
  inboundEmail: text("inbound_email").notNull(), // support@company.com
  displayName: text("display_name"), // "Company Support"
  replyToEmail: text("reply_to_email"), // Optional different reply-to address
  
  // Provider configuration
  provider: text("provider").notNull().default("imap"), // 'imap' | 'gmail' | 'outlook' | 'microsoft_graph'
  
  // IMAP/SMTP settings (encrypted in practice)
  imapHost: text("imap_host"),
  imapPort: integer("imap_port").default(993),
  imapSecure: boolean("imap_secure").default(true),
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port").default(587),
  smtpSecure: boolean("smtp_secure").default(true),
  username: text("username"),
  password: text("password"), // Should be encrypted
  
  // OAuth tokens (for Gmail/Outlook)
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  
  // Polling configuration
  pollingEnabled: boolean("polling_enabled").notNull().default(true),
  pollingIntervalMinutes: integer("polling_interval_minutes").notNull().default(5),
  lastPolledAt: timestamp("last_polled_at"),
  lastSyncStatus: text("last_sync_status"), // 'success' | 'error' | 'partial'
  lastSyncError: text("last_sync_error"),
  
  // Auto-response configuration
  autoResponseEnabled: boolean("auto_response_enabled").notNull().default(false),
  autoResponseConfidenceThreshold: integer("auto_response_confidence_threshold").default(80), // Min confidence % to auto-send
  autoResponseMode: text("auto_response_mode").default("draft"), // 'draft' | 'auto_send' | 'suggest'
  autoResponseKnowledgeCollectionId: varchar("auto_response_knowledge_collection_id").references(() => knowledgeCollections.id),
  
  // Ticket creation settings
  autoCreateTicket: boolean("auto_create_ticket").notNull().default(true),
  defaultPriority: text("default_priority").default("medium"), // 'low' | 'medium' | 'high' | 'urgent'
  defaultCategoryId: varchar("default_category_id").references(() => supportCategories.id),
  
  // AI agent assignment
  aiAgentId: varchar("ai_agent_id").references(() => aiAgents.id),
  
  // Status
  isActive: boolean("is_active").notNull().default(true),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("email_integrations_org_idx").on(table.organizationId),
  workspaceIdx: index("email_integrations_workspace_idx").on(table.workspaceId),
  inboundEmailIdx: uniqueIndex("email_integrations_inbound_email_idx").on(table.inboundEmail),
}));

// Email Messages - Incoming support emails
export const emailMessages = pgTable("email_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  integrationId: varchar("integration_id").notNull().references(() => emailIntegrations.id, { onDelete: 'cascade' }),
  
  // Email identifiers
  messageId: text("message_id").notNull(), // RFC 2822 Message-ID
  threadId: text("thread_id"), // For grouping related emails
  inReplyTo: text("in_reply_to"), // Parent message ID
  references: text("references").array(), // Email References header
  
  // Email content
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name"),
  toEmails: text("to_emails").array().notNull(),
  ccEmails: text("cc_emails").array(),
  bccEmails: text("bcc_emails").array(),
  subject: text("subject"),
  bodyText: text("body_text"),
  bodyHtml: text("body_html"),
  
  // Attachments info (stored separately)
  hasAttachments: boolean("has_attachments").default(false),
  attachmentCount: integer("attachment_count").default(0),
  
  // Customer/Conversation mapping
  customerId: varchar("customer_id").references(() => customers.id),
  conversationId: varchar("conversation_id").references(() => conversations.id),
  ticketId: varchar("ticket_id").references(() => tickets.id),
  
  // AI analysis
  classification: text("classification"), // Intent classification result
  classificationConfidence: integer("classification_confidence"), // 0-100
  sentiment: text("sentiment"), // 'positive' | 'neutral' | 'negative'
  priority: text("priority"), // AI-suggested priority
  suggestedCategory: text("suggested_category"),
  aiSummary: text("ai_summary"), // AI-generated summary
  
  // Auto-response
  autoResponseSent: boolean("auto_response_sent").default(false),
  autoResponseId: varchar("auto_response_id"),
  autoResponseContent: text("auto_response_content"),
  
  // Processing status
  status: text("status").notNull().default("pending"), // 'pending' | 'processed' | 'replied' | 'escalated' | 'archived'
  isRead: boolean("is_read").default(false),
  assignedToUserId: varchar("assigned_to_user_id").references(() => users.id),
  
  // Direction
  direction: text("direction").notNull().default("inbound"), // 'inbound' | 'outbound'
  
  // Timestamps
  receivedAt: timestamp("received_at").notNull(),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("email_messages_org_idx").on(table.organizationId),
  integrationIdx: index("email_messages_integration_idx").on(table.integrationId),
  messageIdIdx: uniqueIndex("email_messages_message_id_idx").on(table.messageId, table.integrationId),
  threadIdx: index("email_messages_thread_idx").on(table.threadId),
  customerIdx: index("email_messages_customer_idx").on(table.customerId),
  conversationIdx: index("email_messages_conversation_idx").on(table.conversationId),
  statusIdx: index("email_messages_status_idx").on(table.status),
  receivedIdx: index("email_messages_received_idx").on(table.receivedAt),
}));

// Email Attachments - Files attached to emails
export const emailAttachments = pgTable("email_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  emailMessageId: varchar("email_message_id").notNull().references(() => emailMessages.id, { onDelete: 'cascade' }),
  
  fileName: text("file_name").notNull(),
  fileType: text("file_type"), // MIME type
  fileSize: integer("file_size"), // bytes
  contentId: text("content_id"), // For inline attachments
  isInline: boolean("is_inline").default(false),
  
  // Storage
  storagePath: text("storage_path"), // Local or cloud storage path
  storageUrl: text("storage_url"), // Public URL if available
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  messageIdx: index("email_attachments_message_idx").on(table.emailMessageId),
}));

// Email Auto-Reply Rules - Organization-specific rules for auto-responses
export const emailAutoReplyRules = pgTable("email_auto_reply_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  integrationId: varchar("integration_id").references(() => emailIntegrations.id, { onDelete: 'cascade' }),
  
  name: text("name").notNull(),
  description: text("description"),
  
  // Matching conditions
  matchType: text("match_type").notNull().default("all"), // 'all' | 'any'
  conditions: jsonb("conditions").notNull().default(sql`'[]'::jsonb`), // Array of condition objects
  // Condition format: [{ field: 'subject' | 'from' | 'body', operator: 'contains' | 'equals' | 'regex', value: string }]
  
  // Response configuration
  responseType: text("response_type").notNull().default("template"), // 'template' | 'ai_generated' | 'kb_search'
  templateContent: text("template_content"), // For template type
  useKnowledgeBase: boolean("use_knowledge_base").default(true),
  knowledgeCollectionId: varchar("knowledge_collection_id").references(() => knowledgeCollections.id),
  
  // AI settings
  aiAgentId: varchar("ai_agent_id").references(() => aiAgents.id),
  confidenceThreshold: integer("confidence_threshold").default(75),
  
  // Actions
  createTicket: boolean("create_ticket").default(true),
  assignToCategory: varchar("assign_to_category").references(() => supportCategories.id),
  ticketPriority: text("ticket_priority").default("medium"), // Priority for created tickets
  
  // Scheduling
  isActive: boolean("is_active").notNull().default(true),
  activeHoursStart: text("active_hours_start"), // "09:00"
  activeHoursEnd: text("active_hours_end"), // "17:00"
  activeTimezone: text("active_timezone").default("UTC"),
  activeDays: text("active_days").array().default(sql`ARRAY['mon','tue','wed','thu','fri']::text[]`),
  
  // Rate limiting
  maxRepliesPerHour: integer("max_replies_per_hour").default(50),
  repliesSentThisHour: integer("replies_sent_this_hour").default(0),
  hourlyCountResetAt: timestamp("hourly_count_reset_at"),
  
  rulePriority: integer("rule_priority").notNull().default(0), // Higher = checked first
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("email_auto_reply_rules_org_idx").on(table.organizationId),
  integrationIdx: index("email_auto_reply_rules_integration_idx").on(table.integrationId),
  priorityIdx: index("email_auto_reply_rules_priority_idx").on(table.rulePriority),
}));

// Email Processing Log - Audit trail for email processing
export const emailProcessingLog = pgTable("email_processing_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  emailMessageId: varchar("email_message_id").notNull().references(() => emailMessages.id, { onDelete: 'cascade' }),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  
  action: text("action").notNull(), // 'received' | 'classified' | 'auto_responded' | 'ticket_created' | 'assigned' | 'escalated'
  status: text("status").notNull(), // 'success' | 'error' | 'skipped'
  details: jsonb("details"), // Additional action-specific data
  errorMessage: text("error_message"),
  
  // AI-related
  aiTokensUsed: integer("ai_tokens_used"),
  aiModel: text("ai_model"),
  aiLatencyMs: integer("ai_latency_ms"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  messageIdx: index("email_processing_log_message_idx").on(table.emailMessageId),
  orgIdx: index("email_processing_log_org_idx").on(table.organizationId),
  actionIdx: index("email_processing_log_action_idx").on(table.action),
}));

// Email Templates - Reusable response templates
export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  
  name: text("name").notNull(),
  description: text("description"),
  subject: text("subject"),
  bodyHtml: text("body_html").notNull(),
  bodyText: text("body_text"), // Plain text fallback
  
  // Template variables (for personalization)
  variables: text("variables").array().default(sql`ARRAY[]::text[]`), // ['customer_name', 'ticket_id', etc.]
  
  // Categorization
  category: text("category"), // 'acknowledgment' | 'resolution' | 'followup' | 'escalation'
  isDefault: boolean("is_default").default(false),
  
  // Usage tracking
  usageCount: integer("usage_count").default(0),
  lastUsedAt: timestamp("last_used_at"),
  
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("email_templates_org_idx").on(table.organizationId),
  categoryIdx: index("email_templates_category_idx").on(table.category),
}));

// Insert schemas and types for email integration
export const insertEmailIntegrationSchema = createInsertSchema(emailIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEmailIntegration = z.infer<typeof insertEmailIntegrationSchema>;
export type EmailIntegration = typeof emailIntegrations.$inferSelect;

export const insertEmailMessageSchema = createInsertSchema(emailMessages).omit({
  id: true,
  createdAt: true,
});
export type InsertEmailMessage = z.infer<typeof insertEmailMessageSchema>;
export type EmailMessage = typeof emailMessages.$inferSelect;

export const insertEmailAttachmentSchema = createInsertSchema(emailAttachments).omit({
  id: true,
  createdAt: true,
});
export type InsertEmailAttachment = z.infer<typeof insertEmailAttachmentSchema>;
export type EmailAttachment = typeof emailAttachments.$inferSelect;

export const insertEmailAutoReplyRuleSchema = createInsertSchema(emailAutoReplyRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEmailAutoReplyRule = z.infer<typeof insertEmailAutoReplyRuleSchema>;
export type EmailAutoReplyRule = typeof emailAutoReplyRules.$inferSelect;

export const insertEmailProcessingLogSchema = createInsertSchema(emailProcessingLog).omit({
  id: true,
  createdAt: true,
});
export type InsertEmailProcessingLog = z.infer<typeof insertEmailProcessingLogSchema>;
export type EmailProcessingLog = typeof emailProcessingLog.$inferSelect;

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;

// ============================================
// WEBHOOKS - External system notifications
// ============================================

export const webhooks = pgTable("webhooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  workspaceId: varchar("workspace_id").references(() => workspaces.id, { onDelete: 'cascade' }),
  
  name: text("name").notNull(),
  description: text("description"),
  url: text("url").notNull(),
  secret: text("secret"), // HMAC signing secret
  
  events: text("events").array().notNull().default(sql`ARRAY['conversation.created']::text[]`),
  
  headers: jsonb("headers").default(sql`'{}'::jsonb`),
  
  isActive: boolean("is_active").notNull().default(true),
  
  lastTriggeredAt: timestamp("last_triggered_at"),
  lastStatus: text("last_status"),
  failureCount: integer("failure_count").default(0),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("webhooks_org_idx").on(table.organizationId),
  workspaceIdx: index("webhooks_workspace_idx").on(table.workspaceId),
}));

export const webhookLogs = pgTable("webhook_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webhookId: varchar("webhook_id").notNull().references(() => webhooks.id, { onDelete: 'cascade' }),
  
  event: text("event").notNull(),
  payload: jsonb("payload"),
  
  responseStatus: integer("response_status"),
  responseBody: text("response_body"),
  responseTimeMs: integer("response_time_ms"),
  
  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  webhookIdx: index("webhook_logs_webhook_idx").on(table.webhookId),
  createdAtIdx: index("webhook_logs_created_at_idx").on(table.createdAt),
}));

// ============================================
// CUSTOM DOMAINS - White-label domain support
// ============================================

export const customDomains = pgTable("custom_domains", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  
  domain: text("domain").notNull().unique(),
  subdomain: text("subdomain"),
  
  domainType: text("domain_type").notNull().default("chat"),
  
  sslStatus: text("ssl_status").notNull().default("pending"),
  sslExpiresAt: timestamp("ssl_expires_at"),
  
  dnsVerified: boolean("dns_verified").notNull().default(false),
  dnsVerifiedAt: timestamp("dns_verified_at"),
  dnsRecords: jsonb("dns_records").default(sql`'[]'::jsonb`),
  
  isActive: boolean("is_active").notNull().default(false),
  isPrimary: boolean("is_primary").notNull().default(false),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("custom_domains_org_idx").on(table.organizationId),
  domainIdx: index("custom_domains_domain_idx").on(table.domain),
}));

// ============================================
// ERROR LOGS - System monitoring and errors
// ============================================

export const systemErrorLogs = pgTable("system_error_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: 'cascade' }),
  workspaceId: varchar("workspace_id").references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'set null' }),
  
  level: text("level").notNull().default("error"),
  category: text("category").notNull(),
  message: text("message").notNull(),
  
  stackTrace: text("stack_trace"),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
  
  requestPath: text("request_path"),
  requestMethod: text("request_method"),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  
  isResolved: boolean("is_resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolutionNotes: text("resolution_notes"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("system_error_logs_org_idx").on(table.organizationId),
  levelIdx: index("system_error_logs_level_idx").on(table.level),
  createdAtIdx: index("system_error_logs_created_at_idx").on(table.createdAt),
  categoryIdx: index("system_error_logs_category_idx").on(table.category),
}));

// ============================================
// RATE LIMIT TRACKING - API usage monitoring
// ============================================

export const rateLimitTracking = pgTable("rate_limit_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  workspaceId: varchar("workspace_id").references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull().default("GET"),
  
  requestCount: integer("request_count").notNull().default(1),
  windowStart: timestamp("window_start").notNull().defaultNow(),
  windowEnd: timestamp("window_end").notNull(),
  
  limitReached: boolean("limit_reached").notNull().default(false),
  limitReachedAt: timestamp("limit_reached_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("rate_limit_tracking_org_idx").on(table.organizationId),
  endpointIdx: index("rate_limit_tracking_endpoint_idx").on(table.endpoint),
  windowIdx: index("rate_limit_tracking_window_idx").on(table.windowStart, table.windowEnd),
}));

// ============================================
// DATA EXPORTS - Backup and export tracking
// ============================================

export const dataExports = pgTable("data_exports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  requestedBy: varchar("requested_by").notNull().references(() => users.id),
  
  exportType: text("export_type").notNull(),
  
  status: text("status").notNull().default("pending"),
  progress: integer("progress").default(0),
  
  filePath: text("file_path"),
  fileSize: integer("file_size"),
  downloadUrl: text("download_url"),
  expiresAt: timestamp("expires_at"),
  
  includedData: text("included_data").array().default(sql`ARRAY[]::text[]`),
  dateRangeStart: timestamp("date_range_start"),
  dateRangeEnd: timestamp("date_range_end"),
  
  errorMessage: text("error_message"),
  
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("data_exports_org_idx").on(table.organizationId),
  statusIdx: index("data_exports_status_idx").on(table.status),
}));

// Insert schemas and types
export const insertWebhookSchema = createInsertSchema(webhooks).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type Webhook = typeof webhooks.$inferSelect;

export const insertWebhookLogSchema = createInsertSchema(webhookLogs).omit({ id: true, createdAt: true });
export type InsertWebhookLog = z.infer<typeof insertWebhookLogSchema>;
export type WebhookLog = typeof webhookLogs.$inferSelect;

export const insertCustomDomainSchema = createInsertSchema(customDomains).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomDomain = z.infer<typeof insertCustomDomainSchema>;
export type CustomDomain = typeof customDomains.$inferSelect;

export const insertSystemErrorLogSchema = createInsertSchema(systemErrorLogs).omit({ id: true, createdAt: true });
export type InsertSystemErrorLog = z.infer<typeof insertSystemErrorLogSchema>;
export type SystemErrorLog = typeof systemErrorLogs.$inferSelect;

export const insertRateLimitTrackingSchema = createInsertSchema(rateLimitTracking).omit({ id: true, createdAt: true });
export type InsertRateLimitTracking = z.infer<typeof insertRateLimitTrackingSchema>;
export type RateLimitTracking = typeof rateLimitTracking.$inferSelect;

export const insertDataExportSchema = createInsertSchema(dataExports).omit({ id: true, createdAt: true });
export type InsertDataExport = z.infer<typeof insertDataExportSchema>;
export type DataExport = typeof dataExports.$inferSelect;

// ==============================================
// AGENTIC AI CONFIGURATION SYSTEM
// ==============================================

// AI Tools Registry - configurable tool definitions (internal + external)
export const aiTools = pgTable("ai_tools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  toolType: text("tool_type").notNull().default("internal"), // 'internal' | 'external_api' | 'webhook' | 'integration'
  category: text("category").notNull().default("general"), // 'knowledge' | 'crm' | 'ticketing' | 'communication' | 'data' | 'general'
  parametersSchema: jsonb("parameters_schema"), // JSON Schema for function parameters
  requiresApproval: boolean("requires_approval").notNull().default(false),
  isDestructive: boolean("is_destructive").notNull().default(false),
  // External tool configuration
  endpointUrl: text("endpoint_url"), // For external API / webhook tools
  httpMethod: text("http_method").default("POST"), // GET | POST | PUT | DELETE
  headers: jsonb("headers"), // Default headers for external API calls
  authType: text("auth_type"), // 'none' | 'api_key' | 'bearer' | 'oauth2'
  authConfig: jsonb("auth_config"), // { keyName, keyValue (ref to secret), tokenUrl, etc. }
  requestTemplate: jsonb("request_template"), // Template for transforming params → request body
  responseMapping: jsonb("response_mapping"), // How to extract result from response
  timeoutMs: integer("timeout_ms").default(30000),
  retryCount: integer("retry_count").default(0),
  // Scope
  isSystemTool: boolean("is_system_tool").notNull().default(false), // Built-in tools that can't be deleted
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: 'cascade' }),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("ai_tools_org_idx").on(table.organizationId),
  typeIdx: index("ai_tools_type_idx").on(table.toolType),
  nameIdx: index("ai_tools_name_idx").on(table.name),
}));

// AI Agent Tool Assignments - which tools are available to which agents
export const aiAgentTools = pgTable("ai_agent_tools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => aiAgents.id, { onDelete: 'cascade' }),
  toolId: varchar("tool_id").notNull().references(() => aiTools.id, { onDelete: 'cascade' }),
  isEnabled: boolean("is_enabled").notNull().default(true),
  overrideParams: jsonb("override_params"), // Agent-specific parameter overrides
  maxCallsPerConversation: integer("max_calls_per_conversation").default(5),
  requiresApprovalOverride: boolean("requires_approval_override"), // Override tool-level approval
  customInstructions: text("custom_instructions"), // Agent-specific usage instructions for this tool
  priority: integer("priority").notNull().default(0), // Tool priority for this agent
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  agentIdx: index("ai_agent_tools_agent_idx").on(table.agentId),
  toolIdx: index("ai_agent_tools_tool_idx").on(table.toolId),
  uniqueAssignment: index("ai_agent_tools_unique_idx").on(table.agentId, table.toolId),
}));

// AI Guardrails - configurable safety rules per agent
export const aiGuardrails = pgTable("ai_guardrails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => aiAgents.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  description: text("description"),
  guardrailType: text("guardrail_type").notNull(), // 'confidence_threshold' | 'rate_limit' | 'content_filter' | 'action_allowlist' | 'action_blocklist' | 'escalation_rule' | 'token_limit' | 'topic_restriction'
  config: jsonb("config").notNull(), // Type-specific config:
  // confidence_threshold: { threshold: number, action: 'block' | 'escalate' | 'warn' }
  // rate_limit: { maxCalls: number, windowSeconds: number, scope: 'conversation' | 'customer' | 'agent' }
  // content_filter: { blockedPatterns: string[], blockedTopics: string[], action: 'block' | 'redact' | 'warn' }
  // action_allowlist: { allowedTools: string[] }
  // action_blocklist: { blockedTools: string[] }
  // escalation_rule: { conditions: object[], escalateTo: 'human' | 'agent', targetAgentId?: string }
  // token_limit: { maxInputTokens: number, maxOutputTokens: number, maxTotalPerConversation: number }
  // topic_restriction: { allowedTopics: string[], blockedTopics: string[], action: 'redirect' | 'block' }
  isActive: boolean("is_active").notNull().default(true),
  priority: integer("priority").notNull().default(0),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: 'cascade' }),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  agentIdx: index("ai_guardrails_agent_idx").on(table.agentId),
  typeIdx: index("ai_guardrails_type_idx").on(table.guardrailType),
  orgIdx: index("ai_guardrails_org_idx").on(table.organizationId),
}));

// AI Workflows - decision trees and playbooks per agent
export const aiWorkflows = pgTable("ai_workflows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => aiAgents.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  description: text("description"),
  triggerType: text("trigger_type").notNull().default("manual"), // 'on_conversation_start' | 'on_intent' | 'on_keyword' | 'manual' | 'on_escalation'
  triggerConditions: jsonb("trigger_conditions"), // { intents?: string[], keywords?: string[], customConditions?: object }
  steps: jsonb("steps").notNull(), // Array of workflow steps:
  // [{ id, type: 'message'|'tool_call'|'condition'|'agent_handoff'|'wait'|'collect_input',
  //    config: { message?, toolId?, condition?, targetAgentId?, inputField?, timeout? },
  //    nextStepId?, onSuccess?, onFailure? }]
  variables: jsonb("variables"), // Workflow-level variables { name: string, type: string, defaultValue? }
  maxExecutionSteps: integer("max_execution_steps").notNull().default(20),
  timeoutSeconds: integer("timeout_seconds").notNull().default(300),
  isActive: boolean("is_active").notNull().default(true),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: 'cascade' }),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  agentIdx: index("ai_workflows_agent_idx").on(table.agentId),
  triggerIdx: index("ai_workflows_trigger_idx").on(table.triggerType),
  orgIdx: index("ai_workflows_org_idx").on(table.organizationId),
}));

// AI Agent Connections - input sources that trigger agent conversations
export const aiAgentConnections = pgTable("ai_agent_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => aiAgents.id, { onDelete: 'cascade' }),
  channelType: text("channel_type").notNull(), // 'chat_widget' | 'email' | 'form' | 'whatsapp' | 'telegram' | 'messenger' | 'api' | 'webhook'
  channelId: varchar("channel_id"), // Reference to specific channel config (e.g., external channel integration ID)
  name: text("name").notNull(),
  description: text("description"),
  config: jsonb("config"), // Channel-specific config:
  // chat_widget: { widgetId, theme, position }
  // email: { emailAccountId, autoReply }
  // form: { formId, fieldMappings }
  // webhook: { inboundUrl, secret, responseFormat }
  isActive: boolean("is_active").notNull().default(true),
  priority: integer("priority").notNull().default(0), // If multiple agents listen on same channel
  filterRules: jsonb("filter_rules"), // When to route to this agent: { keywords?, customerSegment?, businessHours? }
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: 'cascade' }),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  agentIdx: index("ai_agent_connections_agent_idx").on(table.agentId),
  channelIdx: index("ai_agent_connections_channel_idx").on(table.channelType),
  orgIdx: index("ai_agent_connections_org_idx").on(table.organizationId),
}));

// AI Agent Chains - multi-agent routing and delegation rules
export const aiAgentChains = pgTable("ai_agent_chains", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  sourceAgentId: varchar("source_agent_id").notNull().references(() => aiAgents.id, { onDelete: 'cascade' }),
  targetAgentId: varchar("target_agent_id").notNull().references(() => aiAgents.id, { onDelete: 'cascade' }),
  routingType: text("routing_type").notNull().default("intent"), // 'intent' | 'keyword' | 'condition' | 'always' | 'fallback'
  routingConditions: jsonb("routing_conditions").notNull(), // Type-specific:
  // intent: { intents: string[], minConfidence: number }
  // keyword: { keywords: string[], matchMode: 'any' | 'all' }
  // condition: { field: string, operator: string, value: any }
  // always: {} (always route to target)
  // fallback: { afterSteps: number } (route after N failed steps)
  delegationMode: text("delegation_mode").notNull().default("handoff"), // 'handoff' | 'consult' | 'parallel'
  // handoff: fully transfer conversation to target agent
  // consult: ask target agent and return answer to source
  // parallel: both agents contribute (source synthesizes)
  returnToSource: boolean("return_to_source").notNull().default(false), // After target finishes, return to source
  contextPassthrough: jsonb("context_pass_through"), // What context to share: { shareHistory: bool, shareToolResults: bool, customContext: string }
  priority: integer("priority").notNull().default(0), // Higher = checked first
  isActive: boolean("is_active").notNull().default(true),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: 'cascade' }),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  sourceIdx: index("ai_agent_chains_source_idx").on(table.sourceAgentId),
  targetIdx: index("ai_agent_chains_target_idx").on(table.targetAgentId),
  orgIdx: index("ai_agent_chains_org_idx").on(table.organizationId),
  routingIdx: index("ai_agent_chains_routing_idx").on(table.routingType),
}));

// Drizzle Relations for new agentic tables
export const aiToolsRelations = relations(aiTools, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [aiTools.organizationId],
    references: [organizations.id],
  }),
  createdByUser: one(users, {
    fields: [aiTools.createdBy],
    references: [users.id],
  }),
  agentAssignments: many(aiAgentTools),
}));

export const aiAgentToolsRelations = relations(aiAgentTools, ({ one }) => ({
  agent: one(aiAgents, {
    fields: [aiAgentTools.agentId],
    references: [aiAgents.id],
  }),
  tool: one(aiTools, {
    fields: [aiAgentTools.toolId],
    references: [aiTools.id],
  }),
}));

export const aiGuardrailsRelations = relations(aiGuardrails, ({ one }) => ({
  agent: one(aiAgents, {
    fields: [aiGuardrails.agentId],
    references: [aiAgents.id],
  }),
  organization: one(organizations, {
    fields: [aiGuardrails.organizationId],
    references: [organizations.id],
  }),
}));

export const aiWorkflowsRelations = relations(aiWorkflows, ({ one }) => ({
  agent: one(aiAgents, {
    fields: [aiWorkflows.agentId],
    references: [aiAgents.id],
  }),
  organization: one(organizations, {
    fields: [aiWorkflows.organizationId],
    references: [organizations.id],
  }),
}));

export const aiAgentConnectionsRelations = relations(aiAgentConnections, ({ one }) => ({
  agent: one(aiAgents, {
    fields: [aiAgentConnections.agentId],
    references: [aiAgents.id],
  }),
  organization: one(organizations, {
    fields: [aiAgentConnections.organizationId],
    references: [organizations.id],
  }),
}));

export const aiAgentChainsRelations = relations(aiAgentChains, ({ one }) => ({
  sourceAgent: one(aiAgents, {
    fields: [aiAgentChains.sourceAgentId],
    references: [aiAgents.id],
  }),
  targetAgent: one(aiAgents, {
    fields: [aiAgentChains.targetAgentId],
    references: [aiAgents.id],
  }),
  organization: one(organizations, {
    fields: [aiAgentChains.organizationId],
    references: [organizations.id],
  }),
}));

// Insert schemas and types for agentic system
export const insertAiToolSchema = createInsertSchema(aiTools).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAiTool = z.infer<typeof insertAiToolSchema>;
export type AiTool = typeof aiTools.$inferSelect;

export const insertAiAgentToolSchema = createInsertSchema(aiAgentTools).omit({ id: true, createdAt: true });
export type InsertAiAgentTool = z.infer<typeof insertAiAgentToolSchema>;
export type AiAgentTool = typeof aiAgentTools.$inferSelect;

export const insertAiGuardrailSchema = createInsertSchema(aiGuardrails).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAiGuardrail = z.infer<typeof insertAiGuardrailSchema>;
export type AiGuardrail = typeof aiGuardrails.$inferSelect;

export const insertAiWorkflowSchema = createInsertSchema(aiWorkflows).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAiWorkflow = z.infer<typeof insertAiWorkflowSchema>;
export type AiWorkflow = typeof aiWorkflows.$inferSelect;

export const insertAiAgentConnectionSchema = createInsertSchema(aiAgentConnections).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAiAgentConnection = z.infer<typeof insertAiAgentConnectionSchema>;
export type AiAgentConnection = typeof aiAgentConnections.$inferSelect;

export const insertAiAgentChainSchema = createInsertSchema(aiAgentChains).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAiAgentChain = z.infer<typeof insertAiAgentChainSchema>;
export type AiAgentChain = typeof aiAgentChains.$inferSelect;

// ==============================================
// PARTNER INTEGRATIONS - Third-party marketplace
// ==============================================

export const partnerIntegrations = pgTable("partner_integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("pos"),
  logoUrl: text("logo_url"),
  websiteUrl: text("website_url"),
  documentationUrl: text("documentation_url"),
  supportedFeatures: text("supported_features").array().default(sql`ARRAY['stations','users','chat']::text[]`),
  setupInstructions: text("setup_instructions"),
  webhookEvents: text("webhook_events").array(),
  isActive: boolean("is_active").notNull().default(true),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const organizationPartnerConnections = pgTable("organization_partner_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  partnerId: varchar("partner_id").notNull().references(() => partnerIntegrations.id),
  apiKeyHash: text("api_key_hash").notNull(),
  apiKeyPrefix: text("api_key_prefix").notNull(),
  status: text("status").notNull().default("active"),
  permissions: text("permissions").array().notNull().default(sql`ARRAY['stations:read','stations:write','users:read','users:write','chat']::text[]`),
  externalAccountId: text("external_account_id"),
  settings: jsonb("settings"),
  webhookUrl: text("webhook_url"),
  webhookSecret: text("webhook_secret"),
  lastUsedAt: timestamp("last_used_at"),
  activatedBy: varchar("activated_by").references(() => users.id),
  activatedAt: timestamp("activated_at").notNull().defaultNow(),
  deactivatedAt: timestamp("deactivated_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  uniqueOrgPartner: unique().on(table.organizationId, table.partnerId),
  orgIdx: index("idx_org_partner_conn_org").on(table.organizationId),
  partnerIdx: index("idx_org_partner_conn_partner").on(table.partnerId),
}));

export const partnerIntegrationsRelations = relations(partnerIntegrations, ({ many }) => ({
  connections: many(organizationPartnerConnections),
}));

export const organizationPartnerConnectionsRelations = relations(organizationPartnerConnections, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationPartnerConnections.organizationId],
    references: [organizations.id],
  }),
  partner: one(partnerIntegrations, {
    fields: [organizationPartnerConnections.partnerId],
    references: [partnerIntegrations.id],
  }),
}));

export const insertPartnerIntegrationSchema = createInsertSchema(partnerIntegrations).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPartnerIntegration = z.infer<typeof insertPartnerIntegrationSchema>;
export type PartnerIntegration = typeof partnerIntegrations.$inferSelect;

export const insertOrganizationPartnerConnectionSchema = createInsertSchema(organizationPartnerConnections).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrganizationPartnerConnection = z.infer<typeof insertOrganizationPartnerConnectionSchema>;
export type OrganizationPartnerConnection = typeof organizationPartnerConnections.$inferSelect;

// ============================================
// RESOLUTION MEMORY SYSTEM
// Enhanced resolution tracking with detailed steps, outcomes, and learnings
// ============================================

export const resolutionSteps = pgTable("resolution_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resolutionId: varchar("resolution_id").notNull().references(() => resolutionRecords.id, { onDelete: 'cascade' }),
  stepNumber: integer("step_number").notNull(),
  action: text("action").notNull(),
  result: text("result").notNull(), // 'success' | 'failed' | 'partial' | 'skipped'
  details: text("details"),
  errorMessage: text("error_message"),
  timeSpentSeconds: integer("time_spent_seconds"),
  toolUsed: text("tool_used"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const resolutionLearnings = pgTable("resolution_learnings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  resolutionId: varchar("resolution_id").references(() => resolutionRecords.id),
  issueCategory: text("issue_category").notNull(),
  issueSignature: text("issue_signature").notNull(),
  learningType: text("learning_type").notNull(), // 'what_worked' | 'what_failed' | 'what_to_avoid' | 'prerequisite' | 'tip'
  content: text("content").notNull(),
  confidence: integer("confidence").notNull().default(80),
  timesApplied: integer("times_applied").notNull().default(0),
  timesSuccessful: integer("times_successful").notNull().default(0),
  stationId: varchar("station_id").references(() => stations.id),
  applicableStations: text("applicable_stations").array(),
  isGlobal: boolean("is_global").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  orgCategoryIdx: index("resolution_learnings_org_cat_idx").on(table.organizationId, table.issueCategory),
  signatureIdx: index("resolution_learnings_sig_idx").on(table.issueSignature),
  stationIdx: index("resolution_learnings_station_idx").on(table.stationId),
  typeIdx: index("resolution_learnings_type_idx").on(table.learningType),
}));

export const stationResolutionMemory = pgTable("station_resolution_memory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stationId: varchar("station_id").notNull().references(() => stations.id),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  issueCategory: text("issue_category").notNull(),
  issuePattern: text("issue_pattern").notNull(),
  commonCauses: text("common_causes").array(),
  provenSolution: text("proven_solution").notNull(),
  solutionSteps: jsonb("solution_steps"), // [{step, action, notes}]
  avoidActions: text("avoid_actions").array(),
  prerequisites: text("prerequisites").array(),
  successRate: integer("success_rate").notNull().default(0),
  timesUsed: integer("times_used").notNull().default(0),
  lastUsedAt: timestamp("last_used_at"),
  relatedResolutionIds: text("related_resolution_ids").array(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  stationCategoryIdx: index("station_res_mem_station_cat_idx").on(table.stationId, table.issueCategory),
  orgIdx: index("station_res_mem_org_idx").on(table.organizationId),
  patternIdx: index("station_res_mem_pattern_idx").on(table.issuePattern),
}));

// ============================================
// IMAGE ERROR DETECTION
// OCR-extracted error signatures for pattern matching
// ============================================

export const imageErrorSignatures = pgTable("image_error_signatures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  imageUrl: text("image_url"),
  extractedText: text("extracted_text").notNull(),
  errorSignature: text("error_signature").notNull(),
  errorType: text("error_type"), // 'error_dialog' | 'stack_trace' | 'warning' | 'status_screen' | 'receipt_error'
  normalizedPattern: text("normalized_pattern").notNull(),
  matchedResolutionId: varchar("matched_resolution_id").references(() => resolutionRecords.id),
  matchedLearningId: varchar("matched_learning_id").references(() => resolutionLearnings.id),
  matchConfidence: integer("match_confidence").notNull().default(0),
  solutionProvided: text("solution_provided"),
  solutionSteps: jsonb("solution_steps"),
  conversationId: varchar("conversation_id").references(() => conversations.id),
  customerId: varchar("customer_id").references(() => customers.id),
  stationId: varchar("station_id").references(() => stations.id),
  wasHelpful: boolean("was_helpful"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("image_error_sig_org_idx").on(table.organizationId),
  signatureIdx: index("image_error_sig_signature_idx").on(table.errorSignature),
  patternIdx: index("image_error_sig_pattern_idx").on(table.normalizedPattern),
  stationIdx: index("image_error_sig_station_idx").on(table.stationId),
}));

// ============================================
// AI SENSITIVE DATA PROTECTION
// Rules for detecting and blocking sensitive data in AI responses
// ============================================

export const aiSensitiveDataRules = pgTable("ai_sensitive_data_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id),
  ruleName: text("rule_name").notNull(),
  ruleType: text("rule_type").notNull(), // 'pattern' | 'keyword' | 'data_type' | 'field_name'
  pattern: text("pattern").notNull(),
  action: text("action").notNull().default("redact"), // 'redact' | 'block' | 'mask' | 'warn'
  replacement: text("replacement").default("[REDACTED]"),
  description: text("description"),
  severity: text("severity").notNull().default("high"), // 'critical' | 'high' | 'medium' | 'low'
  isSystemRule: boolean("is_system_rule").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("ai_sensitive_rules_org_idx").on(table.organizationId),
  typeIdx: index("ai_sensitive_rules_type_idx").on(table.ruleType),
}));

export const aiDataAccessLog = pgTable("ai_data_access_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id),
  agentId: varchar("agent_id").references(() => aiAgents.id),
  conversationId: varchar("conversation_id").references(() => conversations.id),
  dataType: text("data_type").notNull(), // 'user_info' | 'password' | 'api_key' | 'pii' | 'financial'
  action: text("action").notNull(), // 'blocked' | 'redacted' | 'allowed' | 'warned'
  ruleId: varchar("rule_id").references(() => aiSensitiveDataRules.id),
  originalContent: text("original_content"), // encrypted
  redactedContent: text("redacted_content"),
  requestedBy: text("requested_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("ai_data_access_log_org_idx").on(table.organizationId),
  agentIdx: index("ai_data_access_log_agent_idx").on(table.agentId),
  actionIdx: index("ai_data_access_log_action_idx").on(table.action),
}));

// ============================================================
// COMMUNICATION MODULE
// ============================================================

export const commPosts = pgTable("comm_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  workspaceId: varchar("workspace_id"),
  authorId: varchar("author_id").notNull(),
  authorType: varchar("author_type").notNull(), // 'superadmin' | 'staff' | 'customer'
  type: varchar("type").notNull(), // 'announcement' | 'workspace_feed' | 'retail_feed' | 'community'
  title: varchar("title"),
  content: text("content").notNull(),
  tags: text("tags").array().default([]),
  isPinned: boolean("is_pinned").default(false),
  status: varchar("status").default("active"), // 'active' | 'archived'
  stationId: varchar("station_id"),
  // Audience: who receives this post
  audience: varchar("audience").default("org_staff"), // 'platform' | 'org_staff' | 'org_customers' | 'org_all' | 'workspace_staff' | 'workspace_customers' | 'workspace_all'
  // Visibility: for community/feed posts
  visibility: varchar("visibility").default("public"), // 'public' | 'private'
  // Selected org IDs when audience = 'selected_orgs'
  targetOrgIds: text("target_org_ids").array().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const commPostTargets = pgTable("comm_post_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => commPosts.id, { onDelete: "cascade" }),
  customerOrgId: varchar("customer_org_id"), // null = visible to all retailers
  createdAt: timestamp("created_at").defaultNow(),
});

export const commPostReads = pgTable("comm_post_reads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => commPosts.id, { onDelete: "cascade" }),
  readerId: varchar("reader_id").notNull(),
  readerType: varchar("reader_type").notNull(), // 'staff' | 'customer'
  readAt: timestamp("read_at").defaultNow(),
});

export const commPostReactions = pgTable("comm_post_reactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => commPosts.id, { onDelete: "cascade" }),
  reactorId: varchar("reactor_id").notNull(),
  reactorType: varchar("reactor_type").notNull(), // 'staff' | 'customer'
  emoji: varchar("emoji").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const commPostComments = pgTable("comm_post_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => commPosts.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull(),
  authorType: varchar("author_type").notNull(), // 'staff' | 'customer'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const commChannels = pgTable("comm_channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  type: varchar("type").notNull(), // 'internal' | 'customer_facing' | 'customer_internal'
  customerOrgId: varchar("customer_org_id"), // set for customer_internal and customer_facing
  createdByType: varchar("created_by_type").notNull(), // 'staff' | 'customer'
  createdById: varchar("created_by_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const commChannelMembers = pgTable("comm_channel_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: varchar("channel_id").notNull().references(() => commChannels.id, { onDelete: "cascade" }),
  memberId: varchar("member_id").notNull(),
  memberType: varchar("member_type").notNull(), // 'staff' | 'customer'
  role: varchar("role").default("member"), // 'owner' | 'member'
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const commChannelMessages = pgTable("comm_channel_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: varchar("channel_id").notNull().references(() => commChannels.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull(),
  authorType: varchar("author_type").notNull(), // 'staff' | 'customer'
  content: text("content").notNull(),
  attachments: jsonb("attachments"),
  isEdited: boolean("is_edited").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const commDirectThreads = pgTable("comm_direct_threads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  participantAId: varchar("participant_a_id").notNull(),
  participantAType: varchar("participant_a_type").notNull(), // 'staff' | 'customer'
  participantBId: varchar("participant_b_id").notNull(),
  participantBType: varchar("participant_b_type").notNull(),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const commDirectMessages = pgTable("comm_direct_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").notNull().references(() => commDirectThreads.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull(),
  senderType: varchar("sender_type").notNull(), // 'staff' | 'customer'
  content: text("content").notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Communication module insert schemas and types
export const insertCommPostSchema = createInsertSchema(commPosts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCommPost = z.infer<typeof insertCommPostSchema>;
export type CommPost = typeof commPosts.$inferSelect;

export const insertCommPostTargetSchema = createInsertSchema(commPostTargets).omit({ id: true, createdAt: true });
export type InsertCommPostTarget = z.infer<typeof insertCommPostTargetSchema>;
export type CommPostTarget = typeof commPostTargets.$inferSelect;

export const insertCommPostReadSchema = createInsertSchema(commPostReads).omit({ id: true, readAt: true });
export type InsertCommPostRead = z.infer<typeof insertCommPostReadSchema>;
export type CommPostRead = typeof commPostReads.$inferSelect;

export const insertCommPostReactionSchema = createInsertSchema(commPostReactions).omit({ id: true, createdAt: true });
export type InsertCommPostReaction = z.infer<typeof insertCommPostReactionSchema>;
export type CommPostReaction = typeof commPostReactions.$inferSelect;

export const insertCommPostCommentSchema = createInsertSchema(commPostComments).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCommPostComment = z.infer<typeof insertCommPostCommentSchema>;
export type CommPostComment = typeof commPostComments.$inferSelect;

export const insertCommChannelSchema = createInsertSchema(commChannels).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCommChannel = z.infer<typeof insertCommChannelSchema>;
export type CommChannel = typeof commChannels.$inferSelect;

export const insertCommChannelMemberSchema = createInsertSchema(commChannelMembers).omit({ id: true, joinedAt: true });
export type InsertCommChannelMember = z.infer<typeof insertCommChannelMemberSchema>;
export type CommChannelMember = typeof commChannelMembers.$inferSelect;

export const insertCommChannelMessageSchema = createInsertSchema(commChannelMessages).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCommChannelMessage = z.infer<typeof insertCommChannelMessageSchema>;
export type CommChannelMessage = typeof commChannelMessages.$inferSelect;

export const insertCommDirectThreadSchema = createInsertSchema(commDirectThreads).omit({ id: true, createdAt: true, lastMessageAt: true });
export type InsertCommDirectThread = z.infer<typeof insertCommDirectThreadSchema>;
export type CommDirectThread = typeof commDirectThreads.$inferSelect;

export const insertCommDirectMessageSchema = createInsertSchema(commDirectMessages).omit({ id: true, createdAt: true, readAt: true });
export type InsertCommDirectMessage = z.infer<typeof insertCommDirectMessageSchema>;
export type CommDirectMessage = typeof commDirectMessages.$inferSelect;

// Schema exports for new tables
export const insertResolutionStepSchema = createInsertSchema(resolutionSteps).omit({ id: true, createdAt: true });
export type InsertResolutionStep = z.infer<typeof insertResolutionStepSchema>;
export type ResolutionStep = typeof resolutionSteps.$inferSelect;

export const insertResolutionLearningSchema = createInsertSchema(resolutionLearnings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResolutionLearning = z.infer<typeof insertResolutionLearningSchema>;
export type ResolutionLearning = typeof resolutionLearnings.$inferSelect;

export const insertStationResolutionMemorySchema = createInsertSchema(stationResolutionMemory).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStationResolutionMemory = z.infer<typeof insertStationResolutionMemorySchema>;
export type StationResolutionMemory = typeof stationResolutionMemory.$inferSelect;

export const insertImageErrorSignatureSchema = createInsertSchema(imageErrorSignatures).omit({ id: true, createdAt: true });
export type InsertImageErrorSignature = z.infer<typeof insertImageErrorSignatureSchema>;
export type ImageErrorSignature = typeof imageErrorSignatures.$inferSelect;

export const insertAiSensitiveDataRuleSchema = createInsertSchema(aiSensitiveDataRules).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAiSensitiveDataRule = z.infer<typeof insertAiSensitiveDataRuleSchema>;
export type AiSensitiveDataRule = typeof aiSensitiveDataRules.$inferSelect;

export const insertAiDataAccessLogSchema = createInsertSchema(aiDataAccessLog).omit({ id: true, createdAt: true });
export type InsertAiDataAccessLog = z.infer<typeof insertAiDataAccessLogSchema>;
export type AiDataAccessLog = typeof aiDataAccessLog.$inferSelect;

// ============================================================
// SAVED REPLIES (Canned Responses for agents)
// ============================================================
export const savedReplies = pgTable("saved_replies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 100 }).notNull().default("General"),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  isShared: boolean("is_shared").notNull().default(true), // true = visible to all agents in org
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSavedReplySchema = createInsertSchema(savedReplies).omit({ id: true, createdAt: true, updatedAt: true, usageCount: true, organizationId: true, createdById: true });
export type InsertSavedReply = z.infer<typeof insertSavedReplySchema>;
export type SavedReply = typeof savedReplies.$inferSelect;

// ============================================================
// SLA POLICIES
// ============================================================
export const slaPolicies = pgTable("sla_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  name: varchar("name", { length: 255 }).notNull(),
  priority: text("priority").notNull(), // 'low' | 'medium' | 'high' | 'urgent'
  firstResponseMinutes: integer("first_response_minutes").notNull(), // e.g. 60 = 1 hour
  resolutionMinutes: integer("resolution_minutes").notNull(), // e.g. 480 = 8 hours
  businessHoursOnly: boolean("business_hours_only").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSlaPolicySchema = createInsertSchema(slaPolicies).omit({ id: true, createdAt: true, updatedAt: true, organizationId: true });
export type InsertSlaPolicy = z.infer<typeof insertSlaPolicySchema>;
export type SlaPolicy = typeof slaPolicies.$inferSelect;

// ─────────────────────────────────────────────
// Shre AI configuration (per organization)
// ─────────────────────────────────────────────
export const shreAiConfigs = pgTable("shre_ai_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }).unique(),
  endpoint: text("endpoint").notNull().default(""),
  apiKey: text("api_key").notNull().default(""),
  systemPrompt: text("system_prompt"),
  isEnabled: boolean("is_enabled").notNull().default(false),
  autoReplyOnNew: boolean("auto_reply_on_new").notNull().default(false),
  handoffKeywords: text("handoff_keywords").notNull().default("human,agent,speak to someone,real person"),
  totalReplies: integer("total_replies").notNull().default(0),
  totalHandoffs: integer("total_handoffs").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertShreAiConfigSchema = createInsertSchema(shreAiConfigs).omit({ id: true, createdAt: true, updatedAt: true, organizationId: true, totalReplies: true, totalHandoffs: true });
export type InsertShreAiConfig = z.infer<typeof insertShreAiConfigSchema>;
export type ShreAiConfig = typeof shreAiConfigs.$inferSelect;

// ============================================================
// TICKET COMMENTS — per-ticket comment thread (agents + customers)
// ============================================================
export const ticketComments = pgTable("ticket_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  authorId: varchar("author_id"), // userId or customerId — nullable for system messages
  authorType: text("author_type").notNull().default("agent"), // 'agent' | 'customer' | 'system'
  authorName: text("author_name"), // Denormalized display name
  content: text("content").notNull(),
  isInternal: boolean("is_internal").notNull().default(false), // true = agent-only note, not visible to customer
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTicketCommentSchema = createInsertSchema(ticketComments).omit({ id: true, createdAt: true });
export type InsertTicketComment = z.infer<typeof insertTicketCommentSchema>;
export type TicketComment = typeof ticketComments.$inferSelect;
