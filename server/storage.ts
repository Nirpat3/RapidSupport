import {
  users,
  customers,
  customerOrganizations,
  conversations,
  messages,
  notifications,
  messageReads,
  messageRatings,
  tickets,
  attachments,
  activityLogs,
  agentWorkload,
  aiAgents,
  supportCategories,
  knowledgeBase,
  knowledgeBaseImages,
  knowledgeBaseVideos,
  knowledgeBaseFaqs,
  aiAgentLearning,
  aiAgentSessions,
  aiMessageFeedback,
  aiCorrections,
  knowledgeGaps,
  aiTrainingQueue,
  uploadedFiles,
  knowledgeBaseFiles,
  aiAgentFileUsage,
  knowledgeBaseVersions,
  knowledgeChunks,
  posts,
  postComments,
  postLikes,
  postViews,
  postReads,
  conversationRatings,
  agentPerformanceStats,
  activityNotifications,
  userPermissions,
  brandConfig,
  workspaces,
  workspaceMembers,
  departments,
  departmentMembers,
  organizations,
  auditLog,
  type User,
  type Organization,
  type InsertOrganization,
  type InsertUser,
  type Workspace,
  type InsertWorkspace,
  type WorkspaceMember,
  type InsertWorkspaceMember,
  type Department,
  type InsertDepartment,
  type UpdateDepartment,
  type DepartmentMember,
  type InsertDepartmentMember,
  type CustomerOrganization,
  type InsertCustomerOrganization,
  type Customer,
  type InsertCustomer,
  type BrandConfig,
  type UpdateBrandConfig,
  type InsertBrandConfig,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type Notification,
  type InsertNotification,
  type Ticket,
  type InsertTicket,
  type ExternalCustomerSync,
  type ExternalTicketSync,
  type AnonymousCustomer,
  type Attachment,
  type InsertAttachment,
  type ActivityLog,
  type InsertActivityLog,
  type AgentWorkload,
  type InsertAgentWorkload,
  type AiAgent,
  type InsertAiAgent,
  type SupportCategory,
  type InsertSupportCategory,
  type KnowledgeBase,
  type InsertKnowledgeBase,
  type KnowledgeBaseImage,
  type InsertKnowledgeBaseImage,
  type KnowledgeBaseVideo,
  type InsertKnowledgeBaseVideo,
  type KnowledgeBaseFaq,
  type InsertKnowledgeBaseFaq,
  type AiAgentLearning,
  type InsertAiAgentLearning,
  type AiAgentSession,
  type InsertAiAgentSession,
  type UploadedFile,
  type InsertUploadedFile,
  type KnowledgeBaseFile,
  type InsertKnowledgeBaseFile,
  type AiAgentFileUsage,
  type InsertAiAgentFileUsage,
  type KnowledgeBaseVersion,
  type InsertKnowledgeBaseVersion,
  type KnowledgeChunk,
  type InsertKnowledgeChunk,
  type Post,
  type InsertPost,
  type PostComment,
  type InsertPostComment,
  type PostLike,
  type InsertPostLike,
  type PostView,
  type InsertPostView,
  type PostRead,
  type InsertPostRead,
  type ConversationRating,
  type InsertConversationRating,
  type AgentPerformanceStats,
  type InsertAgentPerformanceStats,
  type ActivityNotification,
  type InsertActivityNotification,
  type UserPermission,
  type InsertUserPermission,
  type MessageRating,
  type InsertMessageRating,
  type AiMessageFeedback,
  type InsertAiMessageFeedback,
  type AiCorrection,
  type InsertAiCorrection,
  type KnowledgeGap,
  type InsertKnowledgeGap,
  type AiTrainingQueue,
  type InsertAiTrainingQueue,
  emailQueue,
  engagementSettings,
  type EmailQueue,
  type InsertEmailQueue,
  type EngagementSettings,
  type InsertEngagementSettings,
  docDomains,
  docIntents,
  documents,
  documentVersions,
  documentRelationships,
  documentReviewQueue,
  documentImportJobs,
  documentChunks,
  type DocDomain,
  type InsertDocDomain,
  type DocIntent,
  type InsertDocIntent,
  type Document,
  type InsertDocument,
  type DocumentVersion,
  type InsertDocumentVersion,
  type DocumentRelationship,
  type InsertDocumentRelationship,
  type DocumentReviewQueue,
  type InsertDocumentReviewQueue,
  type DocumentImportJob,
  type InsertDocumentImportJob,
  type DocumentChunk,
  type InsertDocumentChunk,
  aiTokenUsage,
  aiTokenUsageSummary,
  aiKnowledgeFeedback,
  knowledgeArticleMetrics,
  customerMemory,
  sentimentTracking,
  conversationIntelligence,
  proactiveSuggestions,
  type AiTokenUsage,
  type InsertAiTokenUsage,
  type AiTokenUsageSummary,
  type InsertAiTokenUsageSummary,
  type AiKnowledgeFeedback,
  type InsertAiKnowledgeFeedback,
  type KnowledgeArticleMetrics,
  type InsertKnowledgeArticleMetrics,
  type CustomerMemory,
  type InsertCustomerMemory,
  type SentimentTracking,
  type InsertSentimentTracking,
  type ConversationIntelligence,
  type InsertConversationIntelligence,
  type ProactiveSuggestions,
  type InsertProactiveSuggestions,
  regions,
  organizationMembers,
  knowledgeCollections,
  knowledgeCollectionArticles,
  workspaceKnowledgeCollections,
  type Region,
  type InsertRegion,
  type OrganizationMember,
  type InsertOrganizationMember,
  type KnowledgeCollection,
  type InsertKnowledgeCollection,
  type KnowledgeCollectionArticle,
  type InsertKnowledgeCollectionArticle,
  type WorkspaceKnowledgeCollection,
  type InsertWorkspaceKnowledgeCollection,
  resolutionRecords,
  type ResolutionRecord,
  type InsertResolutionRecord,
  workflowPlaybooks,
  workflowNodes,
  workflowEdges,
  workflowSessions,
  type WorkflowPlaybook,
  type InsertWorkflowPlaybook,
  type WorkflowNode,
  type InsertWorkflowNode,
  type WorkflowEdge,
  type InsertWorkflowEdge,
  type WorkflowSession,
  type InsertWorkflowSession,
  legalPolicies,
  type LegalPolicy,
  type InsertLegalPolicy,
  organizationApplications,
  type OrganizationApplication,
  type InsertOrganizationApplication,
  organizationSetupTokens,
  type OrganizationSetupToken,
  type InsertOrganizationSetupToken,
  type AuditLog,
  type InsertAuditLog,
  cloudStorageConnections,
  cloudStorageFolders,
  cloudStorageSyncRuns,
  cloudStorageFiles,
  type CloudStorageConnection,
  type InsertCloudStorageConnection,
  type CloudStorageFolder,
  type InsertCloudStorageFolder,
  type CloudStorageSyncRun,
  type InsertCloudStorageSyncRun,
  type CloudStorageFile,
  type InsertCloudStorageFile,
  aiRoles,
  aiPermissions,
  aiRolePermissions,
  aiUserRoles,
  aiResourceScopes,
  aiPolicyRules,
  aiAccessAudit,
  type AiRole,
  type InsertAiRole,
  type AiPermission,
  type InsertAiPermission,
  type AiRolePermission,
  type InsertAiRolePermission,
  type AiUserRole,
  type InsertAiUserRole,
  type AiResourceScope,
  type InsertAiResourceScope,
  type AiPolicyRule,
  type InsertAiPolicyRule,
  type AiAccessAudit,
  type InsertAiAccessAudit,
  emailIntegrations,
  emailMessages,
  emailAttachments,
  emailAutoReplyRules,
  emailProcessingLog,
  emailTemplates,
  type EmailIntegration,
  type InsertEmailIntegration,
  type EmailMessage,
  type InsertEmailMessage,
  type EmailAttachment,
  type InsertEmailAttachment,
  type EmailAutoReplyRule,
  type InsertEmailAutoReplyRule,
  type EmailProcessingLog,
  type InsertEmailProcessingLog,
  type EmailTemplate,
  type InsertEmailTemplate,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, isNull, inArray, gte, lte, lt, asc } from "drizzle-orm";
import { KnowledgeRetrievalService } from "./knowledge-retrieval";

// Updated interface for all CRUD operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStatus(id: string, status: string): Promise<void>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  completeUserOnboarding(userId: string): Promise<void>;
  getAllAgents(includeDeleted?: boolean): Promise<User[]>;
  getAllUsers(includeDeleted?: boolean): Promise<User[]>;

  // Customer Organization operations (business accounts for customer portal)
  getCustomerOrganization(id: string): Promise<CustomerOrganization | undefined>;
  getCustomerOrganizationBySlug(slug: string): Promise<CustomerOrganization | undefined>;
  getCustomerOrganizationBySupportId(supportId: string): Promise<CustomerOrganization | undefined>;
  getCustomerOrganizationByName(name: string): Promise<CustomerOrganization | undefined>;
  getOrCreateCustomerOrganization(companyName: string): Promise<CustomerOrganization>;
  createCustomerOrganization(org: InsertCustomerOrganization): Promise<CustomerOrganization>;
  updateCustomerOrganization(id: string, updates: Partial<InsertCustomerOrganization>): Promise<CustomerOrganization>;
  getCustomersByOrganization(customerOrgId: string): Promise<Customer[]>;
  getConversationsByCustomerOrganization(customerOrgId: string): Promise<Conversation[]>;
  
  // Customer operations
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  getCustomerByEmailAndOrg(email: string, organizationId: string): Promise<Customer | undefined>;
  updateCustomerOrganizationId(customerId: string, organizationId: string): Promise<void>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomerStatus(id: string, status: string): Promise<void>;
  updateCustomerOrganizationMembership(customerId: string, customerOrgId: string, role: string): Promise<void>;
  getAllCustomers(options?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: 'createdAt' | 'updatedAt' | 'name';
    sortOrder?: 'asc' | 'desc';
    includeDeleted?: boolean;
  }): Promise<{ customers: Customer[]; total: number; page: number; totalPages: number }>;
  setCustomerPortalPassword(customerId: string, hashedPassword: string): Promise<void>;
  updateCustomerPortalLastLogin(customerId: string): Promise<void>;
  updateCustomerProfile(customerId: string, profileData: { name: string; email: string; phone?: string; company?: string }): Promise<void>;

  // Conversation operations
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversationWithCustomer(id: string): Promise<any | null>;
  getConversationsByCustomer(customerId: string): Promise<Conversation[]>;
  findOpenConversationByCustomer(customerId: string): Promise<Conversation | null>;
  getConversationsByAgent(agentId: string): Promise<Conversation[]>;
  getAllConversations(): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversationStatus(id: string, status: string): Promise<void>;
  assignConversation(id: string, agentId: string): Promise<void>;

  // Message operations
  getMessagesByConversation(conversationId: string): Promise<Message[]>;
  getMessagesByConversationAndScope(conversationId: string, scope: 'public' | 'internal'): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  createInternalMessage(message: InsertMessage & { scope: 'internal' }): Promise<Message>;
  updateMessageStatus(id: string, status: string): Promise<void>;

  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  markConversationAsRead(userId: string, conversationId: string): Promise<void>;
  getUnreadNotificationsForUser(userId: string): Promise<Notification[]>;
  getUnreadCountsByConversation(userId: string): Promise<Array<{ conversationId: string; count: number }>>;
  createNotificationsForAllStaff(conversationId: string): Promise<void>;
  
  // Message Read operations - for per-message unread tracking
  createMessageRead(messageId: string, userId: string): Promise<void>;
  markAllConversationMessagesAsRead(conversationId: string, userId: string): Promise<boolean>; // Returns true if conversation found, false otherwise
  getUnreadMessageCountsPerConversation(userId: string): Promise<Array<{ conversationId: string; unreadCount: number }>>;
  getMessagesReadStatus(messageIds: string[], userId: string): Promise<Map<string, boolean>>; // Returns Map of messageId => isRead

  // Ticket operations
  getTicket(id: string): Promise<Ticket | undefined>;
  getTicketsByCustomer(customerId: string): Promise<Ticket[]>;
  getTicketsByAgent(agentId: string): Promise<Ticket[]>;
  getAllTickets(): Promise<Ticket[]>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicketStatus(id: string, status: string): Promise<void>;
  assignTicket(id: string, agentId: string): Promise<void>;

  // External sync operations
  syncCustomerFromExternal(data: ExternalCustomerSync): Promise<Customer>;
  syncTicketFromExternal(data: ExternalTicketSync): Promise<Ticket>;
  updateCustomerSyncStatus(id: string, status: string, externalId?: string): Promise<void>;
  updateTicketSyncStatus(id: string, status: string, externalId?: string): Promise<void>;
  getCustomerByExternalId(externalId: string, externalSystem: string): Promise<Customer | undefined>;
  getTicketByExternalId(externalId: string, externalSystem: string): Promise<Ticket | undefined>;

  // Customer chat operations for anonymous customers
  getConversationBySession(sessionId: string): Promise<{ conversationId: string; customerId: string; customerInfo: AnonymousCustomer } | null>;
  getConversationByIP(ipAddress: string): Promise<{ conversationId: string; customerId: string; customerInfo: AnonymousCustomer } | null>;
  createAnonymousCustomer(customerData: AnonymousCustomer & { sessionId: string }): Promise<{ customerId: string; conversationId: string; customerInfo: AnonymousCustomer }>;
  getCustomerChatMessages(conversationId: string): Promise<Array<{ id: string; content: string; translatedContent?: string | null; originalLanguage?: string | null; senderType: 'customer' | 'agent' | 'ai'; senderName: string; timestamp: string; attachments?: Attachment[] }>>;
  createCustomerMessage(messageData: { conversationId: string; customerId: string; content: string; translatedContent?: string | null; originalLanguage?: string | null }): Promise<Message>;
  findExistingCustomer(email: string, phone: string, company: string): Promise<Customer | undefined>;
  getAnonymousCustomer(customerId: string): Promise<{ id: string; name: string; email: string; sessionId: string } | null>;

  // Attachment operations
  createAttachment(attachment: InsertAttachment): Promise<Attachment>;
  getAttachmentsByMessage(messageId: string): Promise<Attachment[]>;
  deleteAttachment(id: string): Promise<void>;

  // Activity log operations
  createActivityLog(activityLog: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogsByAgent(agentId: string): Promise<ActivityLog[]>;
  getActivityLogsByConversation(conversationId: string): Promise<ActivityLog[]>;

  // Agent workload operations
  getAgentWorkload(agentId: string): Promise<AgentWorkload | undefined>;
  updateAgentWorkload(agentId: string, activeConversations: number): Promise<void>;
  getAvailableAgents(): Promise<Array<{ user: User; workload: AgentWorkload }>>;
  findBestAvailableAgent(): Promise<User | null>;

  // Assignment operations
  autoAssignConversation(conversationId: string): Promise<User | null>;
  getUnassignedConversations(): Promise<Conversation[]>;

  // AI Agent operations
  getAiAgent(id: string): Promise<AiAgent | undefined>;
  getActiveAiAgents(): Promise<AiAgent[]>;
  getAllAiAgents(): Promise<AiAgent[]>;
  getAgentsBySpecialization(specialization: string): Promise<AiAgent[]>;
  createAiAgent(agent: InsertAiAgent): Promise<AiAgent>;
  updateAiAgent(id: string, updates: Partial<InsertAiAgent>): Promise<void>;
  deleteAiAgent(id: string): Promise<void>;

  // Support Categories operations
  getSupportCategory(id: string): Promise<SupportCategory | undefined>;
  getSupportCategoryBySlug(slug: string): Promise<SupportCategory | undefined>;
  getAllSupportCategories(): Promise<SupportCategory[]>;
  getVisibleSupportCategories(): Promise<SupportCategory[]>;
  createSupportCategory(category: InsertSupportCategory): Promise<SupportCategory>;
  updateSupportCategory(id: string, updates: Partial<InsertSupportCategory>): Promise<void>;
  deleteSupportCategory(id: string): Promise<void>;

  // Brand Configuration operations
  getBrandConfig(): Promise<BrandConfig | undefined>;
  updateBrandConfig(updates: Partial<UpdateBrandConfig>): Promise<BrandConfig>;

  // Workspace operations
  getWorkspace(id: string): Promise<Workspace | undefined>;
  getWorkspacesByOrganization(organizationId: string): Promise<Workspace[]>;
  getAllWorkspaces(includeDeleted?: boolean): Promise<Workspace[]>;
  getDefaultWorkspace(): Promise<Workspace | undefined>;
  createWorkspace(workspace: InsertWorkspace): Promise<Workspace>;
  updateWorkspace(id: string, updates: Partial<InsertWorkspace>): Promise<Workspace>;
  deleteWorkspace(id: string): Promise<void>;

  // Workspace Member operations
  getWorkspaceMember(id: string): Promise<WorkspaceMember | undefined>;
  getWorkspaceMembersByWorkspace(workspaceId: string): Promise<WorkspaceMember[]>;
  getWorkspaceMembersByUser(userId: string): Promise<WorkspaceMember[]>;
  getWorkspaceMemberByUserAndWorkspace(userId: string, workspaceId: string): Promise<WorkspaceMember | undefined>;
  getUserWorkspaces(userId: string): Promise<Array<{ workspace: Workspace; membership: WorkspaceMember }>>;
  addWorkspaceMember(member: InsertWorkspaceMember): Promise<WorkspaceMember>;
  createWorkspaceMember(member: InsertWorkspaceMember): Promise<WorkspaceMember>;
  updateWorkspaceMember(id: string, updates: Partial<InsertWorkspaceMember>): Promise<WorkspaceMember>;
  removeWorkspaceMember(id: string): Promise<void>;

  // Department operations
  getDepartment(id: string): Promise<Department | undefined>;
  getDepartmentsByWorkspace(workspaceId: string): Promise<Department[]>;
  getAllDepartments(): Promise<Department[]>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: string, updates: Partial<UpdateDepartment>): Promise<Department>;
  deleteDepartment(id: string): Promise<void>;

  // Department Member operations
  getDepartmentMember(id: string): Promise<DepartmentMember | undefined>;
  getDepartmentMembersByDepartment(departmentId: string): Promise<DepartmentMember[]>;
  getDepartmentMembersByWorkspaceMember(workspaceMemberId: string): Promise<DepartmentMember[]>;
  addDepartmentMember(member: InsertDepartmentMember): Promise<DepartmentMember>;
  updateDepartmentMember(id: string, updates: Partial<InsertDepartmentMember>): Promise<DepartmentMember>;
  removeDepartmentMember(id: string): Promise<void>;

  // Organization operations (for white-label branding)
  getOrganization(id: string): Promise<Organization | undefined>;
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  getAllOrganizations(includeDeleted?: boolean): Promise<Organization[]>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: string, updates: Partial<InsertOrganization>, performedBy?: string): Promise<Organization>;

  // Organization Application operations (business signup)
  getOrganizationApplication(id: string): Promise<OrganizationApplication | undefined>;
  getAllOrganizationApplications(status?: string): Promise<OrganizationApplication[]>;
  createOrganizationApplication(app: InsertOrganizationApplication): Promise<OrganizationApplication>;
  updateOrganizationApplication(id: string, updates: Partial<OrganizationApplication>): Promise<OrganizationApplication>;
  checkOrganizationDuplicate(name: string, website?: string): Promise<{ isDuplicate: boolean; existingOrg?: Organization }>;
  
  // Organization Setup Token operations (shareable invitation links)
  getOrganizationSetupToken(id: string): Promise<OrganizationSetupToken | undefined>;
  getOrganizationSetupTokenByToken(token: string): Promise<OrganizationSetupToken | undefined>;
  getAllOrganizationSetupTokens(status?: string): Promise<OrganizationSetupToken[]>;
  createOrganizationSetupToken(token: InsertOrganizationSetupToken): Promise<OrganizationSetupToken>;
  updateOrganizationSetupToken(id: string, updates: Partial<OrganizationSetupToken>): Promise<OrganizationSetupToken>;
  completeOrganizationSetup(tokenId: string, organizationId: string): Promise<void>;
  
  // Soft Delete operations - marks records as deleted without removing them
  softDeleteOrganization(id: string, deletedBy: string, reason?: string): Promise<void>;
  softDeleteUser(id: string, deletedBy: string, reason?: string): Promise<void>;
  softDeleteWorkspace(id: string, deletedBy: string, reason?: string): Promise<void>;
  softDeleteCustomer(id: string, deletedBy: string, reason?: string): Promise<void>;
  restoreOrganization(id: string, restoredBy: string): Promise<void>;
  restoreUser(id: string, restoredBy: string): Promise<void>;
  restoreWorkspace(id: string, restoredBy: string): Promise<void>;
  restoreCustomer(id: string, restoredBy: string): Promise<void>;
  
  // Audit Log operations - tracks all significant changes for historical data preservation
  createAuditLog(entry: InsertAuditLog): Promise<AuditLog>;
  getAuditLogsForEntity(entityType: string, entityId: string): Promise<AuditLog[]>;
  getAuditLogsByOrganization(organizationId: string, options?: { limit?: number; offset?: number }): Promise<AuditLog[]>;
  getRecentAuditLogs(options?: { limit?: number; entityTypes?: string[] }): Promise<AuditLog[]>;

  // Knowledge Base operations
  getKnowledgeBase(id: string): Promise<KnowledgeBase | undefined>;
  getKnowledgeBaseArticles(ids: string[]): Promise<KnowledgeBase[]>;
  getAllKnowledgeBase(): Promise<KnowledgeBase[]>;
  createKnowledgeBase(knowledge: InsertKnowledgeBase): Promise<KnowledgeBase>;
  updateKnowledgeBase(id: string, updates: Partial<InsertKnowledgeBase>): Promise<void>;
  deleteKnowledgeBase(id: string): Promise<void>;
  updateKnowledgeBaseUsage(id: string): Promise<void>;

  // Knowledge Base Version operations
  createKnowledgeBaseVersion(version: InsertKnowledgeBaseVersion): Promise<KnowledgeBaseVersion>;
  getKnowledgeBaseVersions(knowledgeBaseId: string): Promise<KnowledgeBaseVersion[]>;
  getLatestVersionNumber(knowledgeBaseId: string): Promise<number>;

  // Knowledge Base Image operations
  getKnowledgeBaseImages(knowledgeBaseId: string): Promise<KnowledgeBaseImage[]>;
  createKnowledgeBaseImage(image: InsertKnowledgeBaseImage): Promise<KnowledgeBaseImage>;
  deleteKnowledgeBaseImage(id: string): Promise<void>;
  updateKnowledgeBaseImageOrder(id: string, displayOrder: number): Promise<void>;
  updateKnowledgeBaseEffectiveness(id: string, adjustment: number): Promise<void>;

  // Knowledge Base Video operations
  getKnowledgeBaseVideos(knowledgeBaseId: string): Promise<KnowledgeBaseVideo[]>;
  createKnowledgeBaseVideo(video: InsertKnowledgeBaseVideo): Promise<KnowledgeBaseVideo>;
  deleteKnowledgeBaseVideo(id: string): Promise<void>;
  updateKnowledgeBaseVideoOrder(id: string, displayOrder: number): Promise<void>;

  // Knowledge Base FAQ operations
  getKnowledgeBaseFaqs(knowledgeBaseId: string): Promise<KnowledgeBaseFaq[]>;
  createKnowledgeBaseFaq(faq: InsertKnowledgeBaseFaq): Promise<KnowledgeBaseFaq>;
  createKnowledgeBaseFaqsBatch(faqs: InsertKnowledgeBaseFaq[]): Promise<KnowledgeBaseFaq[]>;
  deleteKnowledgeBaseFaq(id: string): Promise<void>;
  updateKnowledgeBaseFaqOrder(id: string, displayOrder: number): Promise<void>;
  updateKnowledgeBaseFaqFeedback(id: string, helpful: boolean): Promise<void>;

  // Knowledge Chunk operations (for persistent vector embeddings)
  getKnowledgeChunks(knowledgeBaseIds: string[]): Promise<KnowledgeChunk[]>;
  getKnowledgeChunksByIds(chunkIds: string[]): Promise<KnowledgeChunk[]>;
  createKnowledgeChunk(chunk: InsertKnowledgeChunk): Promise<KnowledgeChunk>;
  createKnowledgeChunksBatch(chunks: InsertKnowledgeChunk[]): Promise<KnowledgeChunk[]>;
  deleteKnowledgeChunksByArticle(knowledgeBaseId: string): Promise<void>;
  searchKnowledgeChunksByVector(queryEmbedding: number[], limit: number): Promise<Array<{ chunk: KnowledgeChunk; similarity: number }>>;

  // AI Agent Learning operations
  getAiAgentLearning(id: string): Promise<AiAgentLearning | undefined>;
  getAiAgentLearningByConversation(conversationId: string): Promise<AiAgentLearning[]>;
  getAiAgentLearningByAgent(agentId: string): Promise<AiAgentLearning[]>;
  createAiAgentLearning(learning: InsertAiAgentLearning): Promise<AiAgentLearning>;
  updateAiAgentLearning(id: string, updates: Partial<InsertAiAgentLearning>): Promise<void>;
  
  // AI Message Feedback operations (thumbs up/down on individual messages)
  createAiMessageFeedback(feedback: InsertAiMessageFeedback): Promise<AiMessageFeedback>;
  getAiMessageFeedback(messageId: string): Promise<AiMessageFeedback | undefined>;
  getAiMessageFeedbackStats(): Promise<{ thumbsUp: number; thumbsDown: number; total: number }>;
  
  // AI Corrections operations (human corrections to AI responses)
  createAiCorrection(correction: InsertAiCorrection): Promise<AiCorrection>;
  getAiCorrections(filters?: { status?: string; limit?: number }): Promise<AiCorrection[]>;
  updateAiCorrection(id: string, updates: Partial<AiCorrection>): Promise<void>;
  getPendingCorrectionsCount(): Promise<number>;
  
  // Knowledge Gaps operations (unanswered questions tracking)
  createOrUpdateKnowledgeGap(query: string, confidence: number): Promise<KnowledgeGap>;
  getKnowledgeGaps(filters?: { status?: string; priority?: string; limit?: number }): Promise<KnowledgeGap[]>;
  updateKnowledgeGap(id: string, updates: Partial<KnowledgeGap>): Promise<void>;
  getKnowledgeGapStats(): Promise<{ open: number; inProgress: number; resolved: number }>;
  
  // AI Training Queue operations
  addToTrainingQueue(item: InsertAiTrainingQueue): Promise<AiTrainingQueue>;
  getTrainingQueueItems(status?: string): Promise<AiTrainingQueue[]>;
  updateTrainingQueueItem(id: string, updates: Partial<AiTrainingQueue>): Promise<void>;
  
  // AI Training & Correction operations
  getAiLearningEntries(filters: { agentId?: string; limit?: number; offset?: number }): Promise<any[]>;
  getAiLearningEntriesFiltered(filters: { agentId?: string; intentCategory?: string }, startDate: Date): Promise<any[]>;
  updateAiLearningFeedback(id: string, feedback: { wasHelpful?: boolean; improvementSuggestion?: string | null; customerSatisfaction?: number | null }): Promise<void>;
  createAiResponseCorrection(correction: { learningEntryId: string; improvedResponse: string; reasoning: string; knowledgeToAdd?: string | null; submittedBy: string }): Promise<void>;

  // AI Agent Session operations
  getAiAgentSession(id: string): Promise<AiAgentSession | undefined>;
  getAiAgentSessionByConversation(conversationId: string): Promise<AiAgentSession | undefined>;
  getAiAgentSessionsByAgent(agentId: string): Promise<AiAgentSession[]>;
  createAiAgentSession(session: InsertAiAgentSession): Promise<AiAgentSession>;
  updateAiAgentSession(id: string, updates: Partial<InsertAiAgentSession>): Promise<void>;
  getActiveAiConversations(): Promise<any[]>;

  // Additional conversation operations
  updateConversation(id: string, updates: Partial<InsertConversation>): Promise<void>;
  toggleAiAssistance(conversationId: string, enabled: boolean): Promise<void>;
  setConversationContextData(conversationId: string, contextData: Record<string, any>): Promise<void>;

  // File Management operations
  getUploadedFile(id: string): Promise<UploadedFile | undefined>;
  getUploadedFileByHash(sha256Hash: string): Promise<UploadedFile | undefined>;
  getAllUploadedFiles(options?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
    tags?: string[];
    sortBy?: 'createdAt' | 'originalName' | 'size';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ files: UploadedFile[]; total: number; page: number; totalPages: number }>;
  createUploadedFile(file: InsertUploadedFile): Promise<UploadedFile>;
  updateUploadedFile(id: string, updates: Partial<InsertUploadedFile>): Promise<void>;
  deleteUploadedFile(id: string): Promise<void>;
  
  // Knowledge Base File links
  linkFileToKnowledgeBase(fileId: string, knowledgeBaseId: string): Promise<KnowledgeBaseFile>;
  unlinkFileFromKnowledgeBase(fileId: string, knowledgeBaseId: string): Promise<void>;
  getFilesLinkedToKnowledgeBase(knowledgeBaseId: string): Promise<UploadedFile[]>;
  getKnowledgeBaseLinkedToFile(fileId: string): Promise<KnowledgeBase[]>;
  
  // AI Agent File Usage tracking
  incrementFileUsage(fileId: string, agentId: string): Promise<void>;
  getFileUsageByAgent(agentId: string): Promise<AiAgentFileUsage[]>;
  getFileUsageByFile(fileId: string): Promise<AiAgentFileUsage[]>;
  getFileUsageStats(fileId: string): Promise<{ totalUsage: number; agentUsage: Array<{ agent: AiAgent; usage: AiAgentFileUsage }> }>;
  
  // File Analytics
  getTopUsedFiles(limit: number, agentId?: string): Promise<Array<{ file: UploadedFile; totalUsage: number; lastUsed?: Date }>>;
  getFileEffectivenessMetrics(limit: number): Promise<Array<{ file: UploadedFile; usageCount: number; effectivenessScore: number }>>;
  getAgentFileUsageSummary(): Promise<Array<{ agentId: string; agentName: string; fileCount: number; totalUsage: number }>>;

  // Feed Module operations
  // Post operations
  createPost(post: InsertPost): Promise<Post>;
  getPost(id: string): Promise<Post | undefined>;
  getPosts(options?: { 
    visibility?: string; 
    userId?: string; 
    userType?: 'staff' | 'customer';
    search?: string;
    tags?: string[];
    page?: number;
    limit?: number;
  }): Promise<{ posts: Post[]; total: number; page: number; totalPages: number }>;
  updatePost(id: string, updates: Partial<InsertPost>): Promise<void>;
  deletePost(id: string): Promise<void>;
  getAllTags(): Promise<string[]>;

  // Post comment operations
  createPostComment(comment: InsertPostComment): Promise<PostComment>;
  getPostComments(postId: string): Promise<PostComment[]>;
  deletePostComment(id: string): Promise<void>;

  // Post like operations
  likePost(postId: string, userId: string, userType: 'staff' | 'customer'): Promise<PostLike>;
  unlikePost(postId: string, userId: string): Promise<void>;
  getPostLikes(postId: string): Promise<PostLike[]>;
  hasUserLikedPost(postId: string, userId: string): Promise<boolean>;

  // Post view operations
  recordPostView(postId: string, userId: string, userType: 'staff' | 'customer'): Promise<PostView>;
  getPostViews(postId: string): Promise<PostView[]>;
  getPostStats(postId: string): Promise<{ views: number; likes: number; comments: number }>;

  // Post read operations for notifications
  markPostAsRead(postId: string, userId: string): Promise<void>;
  getUnreadPostsCount(userId: string, userType: 'staff' | 'customer'): Promise<number>;
  getUnreadPosts(userId: string): Promise<Post[]>;
  hasUserReadPost(postId: string, userId: string): Promise<boolean>;

  // Conversation Rating operations
  createConversationRating(rating: InsertConversationRating): Promise<ConversationRating>;
  getConversationRating(conversationId: string): Promise<ConversationRating | undefined>;
  getRatingsByAgent(agentId: string): Promise<ConversationRating[]>;
  getAverageRatingByAgent(agentId: string): Promise<number | null>;
  getCustomerFeedback(customerId: string): Promise<Array<{
    id: string;
    conversationId: string;
    conversationSubject: string;
    rating: number;
    feedback: string | null;
    sentiment: number | null;
    createdAt: string;
  }>>;
  getAllFeedback(): Promise<Array<{
    id: string;
    conversationId: string;
    conversationSubject: string;
    customerName: string;
    customerEmail: string;
    rating: number;
    feedback: string | null;
    sentiment: number | null;
    customerTone: string | null;
    resolutionQuality: string | null;
    createdAt: string;
  }>>;

  // Message Rating operations
  rateMessage(messageId: string, userId: string | null, customerId: string | null, rating: 'like' | 'dislike'): Promise<MessageRating>;
  getMessageRating(messageId: string, userId: string | null, customerId: string | null): Promise<MessageRating | undefined>;
  getMessageRatingSummary(messageId: string): Promise<{ likes: number; dislikes: number; userRating: 'like' | 'dislike' | null }>;

  // Agent Performance Stats operations
  calculateAndStoreAgentStats(agentId: string, periodStart: Date, periodEnd: Date): Promise<AgentPerformanceStats>;
  getAgentPerformanceStats(agentId: string, periodStart?: Date, periodEnd?: Date): Promise<AgentPerformanceStats[]>;
  getAllAgentsPerformanceStats(periodStart?: Date, periodEnd?: Date): Promise<Array<{ agent: User; stats: AgentPerformanceStats }>>;

  // Activity Notification operations
  createActivityNotification(notification: InsertActivityNotification): Promise<ActivityNotification>;
  getActivityNotifications(userId: string, options?: { unreadOnly?: boolean; limit?: number; search?: string }): Promise<ActivityNotification[]>;
  getUnreadActivityCount(userId: string): Promise<number>;
  markActivityNotificationAsRead(id: string): Promise<void>;
  markAllActivityNotificationsAsRead(userId: string): Promise<void>;
  deleteActivityNotification(id: string): Promise<void>;

  // User Permission operations
  getUserPermissions(userId: string): Promise<UserPermission[]>;
  setUserPermission(userId: string, feature: string, permission: string): Promise<UserPermission>;
  deleteUserPermission(userId: string, feature: string): Promise<void>;
  deleteAllUserPermissions(userId: string): Promise<void>;
  getUserPermissionForFeature(userId: string, feature: string): Promise<UserPermission | undefined>;
  getAllUsersWithPermissions(): Promise<Array<{ user: User; permissions: UserPermission[] }>>;

  // Email Queue operations
  createEmailQueueEntry(entry: InsertEmailQueue): Promise<EmailQueue>;
  getPendingEmails(scheduledBefore?: Date): Promise<EmailQueue[]>;
  getEmailQueueByConversation(conversationId: string, recipientId: string): Promise<EmailQueue | undefined>;
  updateEmailQueueEntry(id: string, updates: Partial<EmailQueue>): Promise<void>;
  cancelPendingEmailsForConversation(conversationId: string, recipientId: string): Promise<void>;
  markEmailAsSent(id: string): Promise<void>;
  markEmailAsFailed(id: string, errorMessage: string): Promise<void>;

  // Engagement Settings operations
  getEngagementSettings(organizationId?: string): Promise<EngagementSettings | undefined>;
  upsertEngagementSettings(settings: InsertEngagementSettings): Promise<EngagementSettings>;
  updateEngagementSettings(id: string, updates: Partial<InsertEngagementSettings>): Promise<EngagementSettings>;

  // Follow-up tracking operations
  getConversationsNeedingFollowup(delayHours: number, maxFollowups: number): Promise<Conversation[]>;
  getInactiveConversationsForAutoClose(inactiveDays: number): Promise<Conversation[]>;
  
  // Multi-agent participation tracking
  addParticipatingAgent(conversationId: string, agentId: string): Promise<void>;

  // ============================================================================
  // DOCUMENTATION FRAMEWORK OPERATIONS
  // ============================================================================

  // Document Domain operations
  getDocDomain(id: string): Promise<DocDomain | undefined>;
  getDocDomainsByWorkspace(workspaceId: string): Promise<DocDomain[]>;
  createDocDomain(domain: InsertDocDomain): Promise<DocDomain>;
  updateDocDomain(id: string, updates: Partial<InsertDocDomain>): Promise<DocDomain>;
  deleteDocDomain(id: string): Promise<void>;

  // Document Intent operations
  getDocIntent(id: string): Promise<DocIntent | undefined>;
  getDocIntentsByWorkspace(workspaceId: string): Promise<DocIntent[]>;
  createDocIntent(intent: InsertDocIntent): Promise<DocIntent>;
  updateDocIntent(id: string, updates: Partial<InsertDocIntent>): Promise<DocIntent>;
  deleteDocIntent(id: string): Promise<void>;

  // Document operations
  getDocument(id: string): Promise<Document | undefined>;
  getDocumentBySlug(slug: string, workspaceId: string): Promise<Document | undefined>;
  getDocumentsByWorkspace(workspaceId: string, filters?: { 
    domainId?: string; 
    intentId?: string; 
    status?: string; 
    search?: string;
  }): Promise<Document[]>;
  createDocument(doc: InsertDocument): Promise<Document>;
  updateDocument(id: string, updates: Partial<InsertDocument>): Promise<Document>;
  deleteDocument(id: string): Promise<void>;

  // Document Version operations
  getDocumentVersion(id: string): Promise<DocumentVersion | undefined>;
  getDocumentVersionsByDocument(documentId: string): Promise<DocumentVersion[]>;
  getLatestDocumentVersion(documentId: string): Promise<DocumentVersion | undefined>;
  createDocumentVersion(version: InsertDocumentVersion): Promise<DocumentVersion>;
  updateDocumentVersion(id: string, updates: Partial<InsertDocumentVersion>): Promise<DocumentVersion>;
  publishDocumentVersion(id: string): Promise<DocumentVersion>;

  // Document Relationship operations
  getDocumentRelationships(documentId: string): Promise<DocumentRelationship[]>;
  createDocumentRelationship(relationship: InsertDocumentRelationship): Promise<DocumentRelationship>;
  deleteDocumentRelationship(id: string): Promise<void>;

  // Document Review Queue operations
  getDocumentReviewQueue(workspaceId: string, status?: string): Promise<Array<DocumentReviewQueue & { version: DocumentVersion; document: Document }>>;
  createDocumentReviewQueueEntry(entry: InsertDocumentReviewQueue): Promise<DocumentReviewQueue>;
  updateDocumentReviewQueueEntry(id: string, updates: Partial<InsertDocumentReviewQueue>): Promise<DocumentReviewQueue>;
  approveDocumentReview(id: string, reviewerId: string, notes?: string): Promise<void>;
  rejectDocumentReview(id: string, reviewerId: string, notes: string): Promise<void>;

  // Document Import Job operations
  getDocumentImportJob(id: string): Promise<DocumentImportJob | undefined>;
  getDocumentImportJobsByWorkspace(workspaceId: string): Promise<DocumentImportJob[]>;
  createDocumentImportJob(job: InsertDocumentImportJob): Promise<DocumentImportJob>;
  updateDocumentImportJob(id: string, updates: Partial<InsertDocumentImportJob>): Promise<DocumentImportJob>;

  // Document Chunk operations (for RAG)
  getDocumentChunksByDocument(documentId: string): Promise<DocumentChunk[]>;
  createDocumentChunk(chunk: InsertDocumentChunk): Promise<DocumentChunk>;
  createDocumentChunksBatch(chunks: InsertDocumentChunk[]): Promise<DocumentChunk[]>;
  deleteDocumentChunksByVersion(versionId: string): Promise<void>;
  searchDocumentChunksByVector(queryEmbedding: number[], workspaceId: string, limit: number): Promise<Array<{ chunk: DocumentChunk; similarity: number }>>;

  // AI Export endpoint helper
  getDocumentsForAIExport(workspaceId: string, filters?: { domain?: string; role?: string; status?: string }): Promise<Array<Document & { currentVersionContent: DocumentVersion | null; relationships: DocumentRelationship[] }>>;

  // ============================================================================
  // AI TOKEN USAGE TRACKING OPERATIONS
  // ============================================================================
  
  // Token Usage operations
  createAiTokenUsage(usage: InsertAiTokenUsage): Promise<AiTokenUsage>;
  getAiTokenUsageByConversation(conversationId: string): Promise<AiTokenUsage[]>;
  getAiTokenUsageByWorkspace(workspaceId: string, startDate?: Date, endDate?: Date): Promise<AiTokenUsage[]>;
  getAiTokenUsageSummary(workspaceId: string | null, startDate?: Date, endDate?: Date): Promise<AiTokenUsageSummary[]>;
  updateOrCreateUsageSummary(workspaceId: string | null, date: string, model: string, tokens: { prompt: number; completion: number; total: number; cost: string }): Promise<void>;
  getDailyTokenUsage(workspaceId: string | null, days: number): Promise<Array<{ date: string; model: string; totalTokens: number; totalCost: string; requestCount: number }>>;
  getMonthlyTokenUsage(workspaceId: string | null, months: number): Promise<Array<{ month: string; totalTokens: number; totalCost: string; requestCount: number }>>;
  
  // Billing & Usage Analytics
  getAiTokenUsageByUser(userId: string, startDate?: Date, endDate?: Date): Promise<AiTokenUsage[]>;
  getAiTokenUsageByOrganization(organizationId: string, startDate?: Date, endDate?: Date): Promise<AiTokenUsage[]>;
  getUsageStatsByUser(userId: string, startDate?: Date, endDate?: Date): Promise<{ totalTokens: number; totalCost: string; requestCount: number; byModel: Record<string, { tokens: number; cost: string; count: number }> }>;
  getUsageStatsByOrganization(organizationId: string, startDate?: Date, endDate?: Date): Promise<{ totalTokens: number; totalCost: string; requestCount: number; byModel: Record<string, { tokens: number; cost: string; count: number }>; byUser: Record<string, { userId: string; name: string; tokens: number; cost: string; count: number }> }>;
  getPlatformUsageStats(startDate?: Date, endDate?: Date): Promise<{ totalTokens: number; totalCost: string; requestCount: number; byOrganization: Record<string, { orgId: string; name: string; tokens: number; cost: string; count: number }> }>;

  // ============================================================================
  // AI KNOWLEDGE LEARNING OPERATIONS
  // ============================================================================
  
  // Knowledge Feedback operations
  createAiKnowledgeFeedback(feedback: InsertAiKnowledgeFeedback): Promise<AiKnowledgeFeedback>;
  getAiKnowledgeFeedbackByConversation(conversationId: string): Promise<AiKnowledgeFeedback[]>;
  getAiKnowledgeFeedbackByArticle(knowledgeBaseId: string): Promise<AiKnowledgeFeedback[]>;
  updateAiKnowledgeFeedback(id: string, updates: Partial<InsertAiKnowledgeFeedback>): Promise<void>;
  updateKnowledgeFeedbackByConversation(conversationId: string, outcome: string, customerRating?: number): Promise<void>;

  // Knowledge Article Metrics operations
  getKnowledgeArticleMetrics(knowledgeBaseId: string): Promise<KnowledgeArticleMetrics | undefined>;
  updateKnowledgeArticleMetrics(knowledgeBaseId: string, updates: { 
    incrementRetrieved?: boolean; 
    incrementUsed?: boolean;
    incrementLinkClicked?: boolean;
    markHelpful?: boolean;
    markNotHelpful?: boolean;
    markPartial?: boolean;
  }): Promise<void>;
  getTopPerformingArticles(limit: number): Promise<Array<{ article: KnowledgeBase; metrics: KnowledgeArticleMetrics }>>;
  getArticlesNeedingImprovement(limit: number): Promise<Array<{ article: KnowledgeBase; metrics: KnowledgeArticleMetrics }>>;

  // ============================================================================
  // LEGAL POLICY OPERATIONS
  // ============================================================================
  
  createLegalPolicy(policy: InsertLegalPolicy): Promise<LegalPolicy>;
  getLegalPolicy(id: string): Promise<LegalPolicy | undefined>;
  getLegalPoliciesByOrganization(organizationId: string | null): Promise<LegalPolicy[]>;
  getLegalPolicyByTypeAndRegion(organizationId: string | null, type: string, region: string): Promise<LegalPolicy | undefined>;
  updateLegalPolicy(id: string, updates: Partial<InsertLegalPolicy>): Promise<LegalPolicy>;
  deleteLegalPolicy(id: string): Promise<void>;
  getPublishedPolicies(organizationId: string | null): Promise<LegalPolicy[]>;

  // ============================================================================
  // CLOUD STORAGE INTEGRATION OPERATIONS
  // ============================================================================
  
  // Cloud Storage Connection operations
  createCloudStorageConnection(connection: InsertCloudStorageConnection): Promise<CloudStorageConnection>;
  getCloudStorageConnection(id: string): Promise<CloudStorageConnection | undefined>;
  getCloudStorageConnectionsByWorkspace(workspaceId: string): Promise<CloudStorageConnection[]>;
  getCloudStorageConnectionsByOrganization(organizationId: string): Promise<CloudStorageConnection[]>;
  updateCloudStorageConnection(id: string, updates: Partial<InsertCloudStorageConnection>): Promise<CloudStorageConnection>;
  deleteCloudStorageConnection(id: string): Promise<void>;
  
  // Cloud Storage Folder operations
  createCloudStorageFolder(folder: InsertCloudStorageFolder): Promise<CloudStorageFolder>;
  getCloudStorageFolder(id: string): Promise<CloudStorageFolder | undefined>;
  getCloudStorageFoldersByConnection(connectionId: string): Promise<CloudStorageFolder[]>;
  updateCloudStorageFolder(id: string, updates: Partial<InsertCloudStorageFolder>): Promise<CloudStorageFolder>;
  deleteCloudStorageFolder(id: string): Promise<void>;
  
  // Cloud Storage Sync Run operations
  createCloudStorageSyncRun(run: InsertCloudStorageSyncRun): Promise<CloudStorageSyncRun>;
  getCloudStorageSyncRun(id: string): Promise<CloudStorageSyncRun | undefined>;
  getCloudStorageSyncRunsByConnection(connectionId: string, limit?: number): Promise<CloudStorageSyncRun[]>;
  updateCloudStorageSyncRun(id: string, updates: Partial<InsertCloudStorageSyncRun>): Promise<CloudStorageSyncRun>;
  
  // Cloud Storage File operations  
  createCloudStorageFile(file: InsertCloudStorageFile): Promise<CloudStorageFile>;
  getCloudStorageFile(id: string): Promise<CloudStorageFile | undefined>;
  getCloudStorageFileByProviderId(connectionId: string, providerFileId: string): Promise<CloudStorageFile | undefined>;
  getCloudStorageFilesByFolder(folderId: string): Promise<CloudStorageFile[]>;
  updateCloudStorageFile(id: string, updates: Partial<InsertCloudStorageFile>): Promise<CloudStorageFile>;
  deleteCloudStorageFile(id: string): Promise<void>;

  // ============================================================================
  // AI RBAC (Role-Based Access Control) OPERATIONS
  // ============================================================================
  
  // AI Roles
  createAiRole(role: InsertAiRole): Promise<AiRole>;
  getAiRole(id: string): Promise<AiRole | undefined>;
  getAiRolesByOrganization(organizationId: string): Promise<AiRole[]>;
  getDefaultAiRole(organizationId: string): Promise<AiRole | undefined>;
  updateAiRole(id: string, updates: Partial<InsertAiRole>): Promise<AiRole>;
  deleteAiRole(id: string): Promise<void>;
  
  // AI Permissions
  createAiPermission(permission: InsertAiPermission): Promise<AiPermission>;
  getAiPermission(id: string): Promise<AiPermission | undefined>;
  getAiPermissionsByOrganization(organizationId: string): Promise<AiPermission[]>;
  updateAiPermission(id: string, updates: Partial<InsertAiPermission>): Promise<AiPermission>;
  deleteAiPermission(id: string): Promise<void>;
  
  // AI Role Permissions
  createAiRolePermission(rolePermission: InsertAiRolePermission): Promise<AiRolePermission>;
  getAiRolePermissions(roleId: string): Promise<AiRolePermission[]>;
  deleteAiRolePermission(roleId: string, permissionId: string): Promise<void>;
  
  // AI User Roles
  createAiUserRole(userRole: InsertAiUserRole): Promise<AiUserRole>;
  getAiUserRoles(userId: string, organizationId: string): Promise<AiUserRole[]>;
  deleteAiUserRole(id: string): Promise<void>;
  
  // AI Resource Scopes
  createAiResourceScope(scope: InsertAiResourceScope): Promise<AiResourceScope>;
  getAiResourceScope(id: string): Promise<AiResourceScope | undefined>;
  getAiResourceScopesByOrganization(organizationId: string): Promise<AiResourceScope[]>;
  getAiResourceScopeByResource(organizationId: string, resource: string): Promise<AiResourceScope | undefined>;
  updateAiResourceScope(id: string, updates: Partial<InsertAiResourceScope>): Promise<AiResourceScope>;
  deleteAiResourceScope(id: string): Promise<void>;
  
  // AI Policy Rules
  createAiPolicyRule(rule: InsertAiPolicyRule): Promise<AiPolicyRule>;
  getAiPolicyRule(id: string): Promise<AiPolicyRule | undefined>;
  getAiPolicyRulesByOrganization(organizationId: string): Promise<AiPolicyRule[]>;
  getActiveAiPolicyRules(organizationId: string, agentId?: string): Promise<AiPolicyRule[]>;
  updateAiPolicyRule(id: string, updates: Partial<InsertAiPolicyRule>): Promise<AiPolicyRule>;
  deleteAiPolicyRule(id: string): Promise<void>;
  
  // AI Access Audit
  createAiAccessAudit(audit: InsertAiAccessAudit): Promise<AiAccessAudit>;
  getAiAccessAuditsByOrganization(organizationId: string, limit?: number): Promise<AiAccessAudit[]>;
  getAiAccessAuditsByUser(userId: string, limit?: number): Promise<AiAccessAudit[]>;
  
  // Email Integration Operations
  getEmailIntegration(id: string): Promise<EmailIntegration | undefined>;
  getEmailIntegrationByEmail(email: string): Promise<EmailIntegration | undefined>;
  getEmailIntegrationsByOrganization(organizationId: string): Promise<EmailIntegration[]>;
  createEmailIntegration(integration: InsertEmailIntegration): Promise<EmailIntegration>;
  updateEmailIntegration(id: string, updates: Partial<InsertEmailIntegration>): Promise<EmailIntegration>;
  deleteEmailIntegration(id: string): Promise<void>;
  updateEmailIntegrationPollingStatus(id: string, status: string, error?: string): Promise<void>;
  
  // Email Message Operations
  getEmailMessage(id: string): Promise<EmailMessage | undefined>;
  getEmailMessageByMessageId(messageId: string, integrationId: string): Promise<EmailMessage | undefined>;
  getEmailMessagesByOrganization(organizationId: string, options?: { limit?: number; offset?: number; status?: string }): Promise<EmailMessage[]>;
  getEmailMessagesByIntegration(integrationId: string, options?: { limit?: number; offset?: number; status?: string }): Promise<EmailMessage[]>;
  getEmailMessagesByCustomer(customerId: string): Promise<EmailMessage[]>;
  getEmailMessagesByThread(threadId: string): Promise<EmailMessage[]>;
  createEmailMessage(message: InsertEmailMessage): Promise<EmailMessage>;
  updateEmailMessage(id: string, updates: Partial<InsertEmailMessage>): Promise<EmailMessage>;
  updateEmailMessageStatus(id: string, status: string): Promise<void>;
  
  // Email Attachment Operations
  getEmailAttachmentsByMessage(messageId: string): Promise<EmailAttachment[]>;
  createEmailAttachment(attachment: InsertEmailAttachment): Promise<EmailAttachment>;
  
  // Email Auto-Reply Rules
  getEmailAutoReplyRule(id: string): Promise<EmailAutoReplyRule | undefined>;
  getEmailAutoReplyRulesByOrganization(organizationId: string): Promise<EmailAutoReplyRule[]>;
  getEmailAutoReplyRulesByIntegration(integrationId: string): Promise<EmailAutoReplyRule[]>;
  getActiveEmailAutoReplyRules(organizationId: string): Promise<EmailAutoReplyRule[]>;
  createEmailAutoReplyRule(rule: InsertEmailAutoReplyRule): Promise<EmailAutoReplyRule>;
  updateEmailAutoReplyRule(id: string, updates: Partial<InsertEmailAutoReplyRule>): Promise<EmailAutoReplyRule>;
  deleteEmailAutoReplyRule(id: string): Promise<void>;
  incrementRuleReplyCount(ruleId: string): Promise<void>;
  
  // Email Processing Log
  createEmailProcessingLog(log: InsertEmailProcessingLog): Promise<EmailProcessingLog>;
  getEmailProcessingLogsByMessage(messageId: string): Promise<EmailProcessingLog[]>;
  
  // Email Templates
  getEmailTemplate(id: string): Promise<EmailTemplate | undefined>;
  getEmailTemplatesByOrganization(organizationId: string): Promise<EmailTemplate[]>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: string, updates: Partial<InsertEmailTemplate>): Promise<EmailTemplate>;
  deleteEmailTemplate(id: string): Promise<void>;
  incrementTemplateUsage(templateId: string): Promise<void>;
}

// Database implementation using blueprint: javascript_database
export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  async updateUserStatus(id: string, status: string): Promise<void> {
    await db
      .update(users)
      .set({ status, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async completeUserOnboarding(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ hasCompletedOnboarding: true, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async getAllAgents(includeDeleted: boolean = false): Promise<User[]> {
    if (includeDeleted) {
      return await db.select().from(users).where(eq(users.role, 'agent'));
    }
    // Filter out soft-deleted agents
    return await db.select().from(users).where(
      and(eq(users.role, 'agent'), isNull(users.deletedAt))
    );
  }

  async getAllUsers(includeDeleted: boolean = false): Promise<User[]> {
    if (includeDeleted) {
      return await db.select().from(users).orderBy(desc(users.updatedAt));
    }
    // Filter out soft-deleted users
    return await db.select().from(users)
      .where(isNull(users.deletedAt))
      .orderBy(desc(users.updatedAt));
  }

  // Customer Organization operations (business accounts for customer portal)
  async getCustomerOrganization(id: string): Promise<CustomerOrganization | undefined> {
    const [org] = await db.select().from(customerOrganizations).where(eq(customerOrganizations.id, id));
    return org || undefined;
  }

  async getCustomerOrganizationBySlug(slug: string): Promise<CustomerOrganization | undefined> {
    const [org] = await db.select().from(customerOrganizations).where(eq(customerOrganizations.slug, slug));
    return org || undefined;
  }

  async getCustomerOrganizationBySupportId(supportId: string): Promise<CustomerOrganization | undefined> {
    const [org] = await db.select().from(customerOrganizations).where(eq(customerOrganizations.supportId, supportId));
    return org || undefined;
  }

  async getCustomerOrganizationByName(name: string): Promise<CustomerOrganization | undefined> {
    const normalizedName = name.trim().toLowerCase();
    const allOrgs = await db.select().from(customerOrganizations);
    return allOrgs.find(org => org.name.trim().toLowerCase() === normalizedName) || undefined;
  }

  async getOrCreateCustomerOrganization(companyName: string): Promise<CustomerOrganization> {
    // Generate slug first - this is the unique key
    const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'org';
    
    // Try to find existing organization by slug (unique, case-insensitive via normalization)
    const existingOrg = await this.getCustomerOrganizationBySlug(slug);
    if (existingOrg) {
      return existingOrg;
    }

    // Create new organization with generated slug and support ID
    // Use upsert pattern to handle race conditions - if slug already exists, return existing
    const supportId = this.generateSupportId(companyName);
    
    try {
      const [newOrg] = await db
        .insert(customerOrganizations)
        .values({
          name: companyName.trim(),
          slug,
          supportId,
          requireSupportId: false,
          updatedAt: new Date(),
        })
        .onConflictDoNothing({ target: customerOrganizations.slug })
        .returning();
      
      // If insert succeeded, return new org
      if (newOrg) {
        return newOrg;
      }
      
      // If conflict occurred, fetch and return existing org
      const conflictOrg = await this.getCustomerOrganizationBySlug(slug);
      if (conflictOrg) {
        return conflictOrg;
      }
      
      // This should never happen, but fallback to re-querying by name
      const fallbackOrg = await this.getCustomerOrganizationByName(companyName);
      if (fallbackOrg) {
        return fallbackOrg;
      }
      
      throw new Error(`Failed to create or find organization for "${companyName}"`);
    } catch (error) {
      // Handle unique constraint violation (in case onConflictDoNothing doesn't catch it)
      console.error('Error creating customer organization:', error);
      const existingBySlug = await this.getCustomerOrganizationBySlug(slug);
      if (existingBySlug) {
        return existingBySlug;
      }
      throw error;
    }
  }

  private generateSupportId(companyName: string): string {
    // Generate a support ID like "ACME-7X3K" 
    const prefix = companyName.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, 'X').padEnd(4, 'X');
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${suffix}`;
  }

  async createCustomerOrganization(org: InsertCustomerOrganization): Promise<CustomerOrganization> {
    const [newOrg] = await db
      .insert(customerOrganizations)
      .values({
        ...org,
        updatedAt: new Date(),
      })
      .returning();
    return newOrg;
  }

  async updateCustomerOrganization(id: string, updates: Partial<InsertCustomerOrganization>): Promise<CustomerOrganization> {
    const [org] = await db
      .update(customerOrganizations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(customerOrganizations.id, id))
      .returning();
    return org;
  }

  async getCustomersByOrganization(customerOrgId: string): Promise<Customer[]> {
    return await db.select().from(customers).where(eq(customers.customerOrganizationId, customerOrgId));
  }

  async getConversationsByCustomerOrganization(customerOrgId: string): Promise<Conversation[]> {
    // Get all customers in the organization, then get their conversations
    const orgCustomers = await this.getCustomersByOrganization(customerOrgId);
    if (orgCustomers.length === 0) return [];
    
    const customerIds = orgCustomers.map(c => c.id);
    return await db.select().from(conversations)
      .where(inArray(conversations.customerId, customerIds))
      .orderBy(desc(conversations.updatedAt));
  }

  // Customer operations
  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.email, email));
    return customer || undefined;
  }

  async getCustomerByEmailAndOrg(email: string, organizationId: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers)
      .where(and(eq(customers.email, email), eq(customers.organizationId, organizationId)));
    return customer || undefined;
  }

  async updateCustomerOrganizationId(customerId: string, organizationId: string): Promise<void> {
    // Security: Only allow setting organizationId when it's currently NULL
    // This prevents cross-tenant reassignment attacks
    const result = await db
      .update(customers)
      .set({ organizationId, updatedAt: new Date() })
      .where(and(
        eq(customers.id, customerId),
        isNull(customers.organizationId)
      ))
      .returning({ id: customers.id });
    
    if (result.length === 0) {
      // Either customer not found or organizationId was already set - verify which case
      const existing = await this.getCustomer(customerId);
      if (!existing) {
        throw new Error(`Customer ${customerId} not found`);
      }
      if (existing.organizationId !== null && existing.organizationId !== organizationId) {
        throw new Error(`Security violation: Cannot reassign customer ${customerId} from org ${existing.organizationId} to ${organizationId}`);
      }
      // If already set to same org, that's fine - no-op
    }
    console.log(`[Security] Updated customer ${customerId} organizationId to ${organizationId}`);
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const [customer] = await db
      .insert(customers)
      .values({
        ...insertCustomer,
        updatedAt: new Date(),
      })
      .returning();
    return customer;
  }

  async updateCustomerStatus(id: string, status: string): Promise<void> {
    await db
      .update(customers)
      .set({ status, updatedAt: new Date() })
      .where(eq(customers.id, id));
  }

  async updateCustomerOrganizationMembership(customerId: string, customerOrgId: string, role: string): Promise<void> {
    await db
      .update(customers)
      .set({ 
        customerOrganizationId: customerOrgId, 
        customerOrgRole: role,
        updatedAt: new Date() 
      })
      .where(eq(customers.id, customerId));
  }

  async getAllCustomers(options?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: 'createdAt' | 'updatedAt' | 'name';
    sortOrder?: 'asc' | 'desc';
    includeDeleted?: boolean;
  }): Promise<{ customers: Customer[]; total: number; page: number; totalPages: number }> {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeDeleted = false
    } = options || {};

    let query = db.select().from(customers).$dynamic();
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(customers).$dynamic();

    // Apply filters
    const whereConditions: any[] = [];
    
    // Filter out soft-deleted customers by default
    if (!includeDeleted) {
      whereConditions.push(isNull(customers.deletedAt));
    }
    
    if (search) {
      const searchLower = `%${search.toLowerCase()}%`;
      whereConditions.push(
        or(
          sql`lower(${customers.name}) like ${searchLower}`,
          sql`lower(${customers.email}) like ${searchLower}`,
          sql`lower(${customers.company}) like ${searchLower}`
        )
      );
    }

    if (status) {
      whereConditions.push(eq(customers.status, status));
    }

    if (whereConditions.length > 0) {
      const whereClause = whereConditions.length === 1 ? whereConditions[0] : and(...whereConditions);
      query = query.where(whereClause);
      countQuery = countQuery.where(whereClause);
    }

    // Apply sorting
    const sortColumn = sortBy === 'createdAt' ? customers.createdAt
                      : sortBy === 'updatedAt' ? customers.updatedAt 
                      : customers.name;
    
    query = query.orderBy(sortOrder === 'desc' ? desc(sortColumn) : sortColumn);

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);

    // Execute queries
    const [customerResults, countResult] = await Promise.all([
      query,
      countQuery
    ]);

    const total = countResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      customers: customerResults,
      total,
      page,
      totalPages
    };
  }

  async setCustomerPortalPassword(customerId: string, hashedPassword: string): Promise<void> {
    await db
      .update(customers)
      .set({ 
        portalPassword: hashedPassword,
        hasPortalAccess: true,
        updatedAt: new Date()
      })
      .where(eq(customers.id, customerId));
  }

  async updateCustomerPortalLastLogin(customerId: string): Promise<void> {
    await db
      .update(customers)
      .set({ 
        portalLastLogin: new Date(),
        updatedAt: new Date()
      })
      .where(eq(customers.id, customerId));
  }

  async updateCustomerProfile(customerId: string, profileData: { name: string; email: string; phone?: string; company?: string }): Promise<void> {
    await db
      .update(customers)
      .set({ 
        ...profileData,
        updatedAt: new Date()
      })
      .where(eq(customers.id, customerId));
  }

  // Conversation operations
  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async getConversationWithCustomer(id: string): Promise<any | null> {
    const [result] = await db
      .select({
        id: conversations.id,
        customerId: conversations.customerId,
        assignedAgentId: conversations.assignedAgentId,
        title: conversations.title,
        status: conversations.status,
        priority: conversations.priority,
        followupDate: conversations.followupDate,
        isAnonymous: conversations.isAnonymous,
        sessionId: conversations.sessionId,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        customer: {
          id: customers.id,
          name: customers.name,
          email: customers.email,
          company: customers.company,
          phone: customers.phone,
          status: customers.status,
        }
      })
      .from(conversations)
      .leftJoin(customers, eq(conversations.customerId, customers.id))
      .where(eq(conversations.id, id));

    return result || null;
  }

  async getConversationsByCustomer(customerId: string): Promise<Conversation[]> {
    return await db
      .select({
        id: conversations.id,
        customerId: conversations.customerId,
        assignedAgentId: conversations.assignedAgentId,
        status: conversations.status,
        priority: conversations.priority,
        title: conversations.title,
        followupDate: conversations.followupDate,
        isAnonymous: conversations.isAnonymous,
        sessionId: conversations.sessionId,
        aiAssistanceEnabled: conversations.aiAssistanceEnabled,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
      })
      .from(conversations)
      .where(eq(conversations.customerId, customerId))
      .orderBy(desc(conversations.updatedAt));
  }

  async findOpenConversationByCustomer(customerId: string): Promise<Conversation | null> {
    const [result] = await db
      .select()
      .from(conversations)
      .where(and(
        eq(conversations.customerId, customerId),
        eq(conversations.status, 'open')
      ))
      .orderBy(desc(conversations.updatedAt))
      .limit(1);
    
    return result || null;
  }

  async getConversationsByAgent(agentId: string): Promise<any[]> {
    return await db
      .select({
        id: conversations.id,
        customerId: conversations.customerId,
        assignedAgentId: conversations.assignedAgentId,
        title: conversations.title,
        status: conversations.status,
        priority: conversations.priority,
        followupDate: conversations.followupDate,
        isAnonymous: conversations.isAnonymous,
        sessionId: conversations.sessionId,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        customer: {
          id: customers.id,
          name: customers.name,
          email: customers.email,
          company: customers.company,
          phone: customers.phone,
          status: customers.status,
        }
      })
      .from(conversations)
      .leftJoin(customers, eq(conversations.customerId, customers.id))
      .where(eq(conversations.assignedAgentId, agentId))
      .orderBy(desc(conversations.updatedAt));
  }

  async getAllConversations(): Promise<any[]> {
    return await db
      .select({
        id: conversations.id,
        customerId: conversations.customerId,
        assignedAgentId: conversations.assignedAgentId,
        title: conversations.title,
        status: conversations.status,
        priority: conversations.priority,
        followupDate: conversations.followupDate,
        isAnonymous: conversations.isAnonymous,
        sessionId: conversations.sessionId,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        customer: {
          id: customers.id,
          name: customers.name,
          email: customers.email,
          company: customers.company,
          phone: customers.phone,
          status: customers.status,
        }
      })
      .from(conversations)
      .leftJoin(customers, eq(conversations.customerId, customers.id))
      .orderBy(desc(conversations.updatedAt));
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values({
        ...insertConversation,
        updatedAt: new Date(),
      })
      .returning();
    return conversation;
  }

  async updateConversationStatus(id: string, status: string): Promise<void> {
    await db
      .update(conversations)
      .set({ status, updatedAt: new Date() })
      .where(eq(conversations.id, id));
  }

  async assignConversation(id: string, agentId: string): Promise<void> {
    await db
      .update(conversations)
      .set({ assignedAgentId: agentId, updatedAt: new Date() })
      .where(eq(conversations.id, id));
  }

  // Message operations
  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    // Return ALL messages (both public and internal) for staff to see
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.timestamp);
  }

  async getMessagesByConversationAndScope(conversationId: string, scope: 'public' | 'internal'): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(and(
        eq(messages.conversationId, conversationId),
        eq(messages.scope, scope)
      ))
      .orderBy(messages.timestamp);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    // Ensure scope defaults to 'public' if not provided
    const messageData = {
      ...insertMessage,
      scope: insertMessage.scope || 'public'
    };

    const [message] = await db
      .insert(messages)
      .values(messageData)
      .returning();
    
    // Automatically mark the message as read for the sender
    // (users shouldn't see their own messages as unread)
    // Skip this for system messages and customer messages as they're not in the users table
    if (insertMessage.senderType !== 'system' && insertMessage.senderType !== 'customer') {
      await db.insert(messageReads).values({
        messageId: message.id,
        userId: insertMessage.senderId
      });
    }
    
    // Only update conversation timestamp for public messages (customer-facing activity)
    if (messageData.scope === 'public') {
      await db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, insertMessage.conversationId));
    }
    
    return message;
  }

  async createInternalMessage(insertMessage: InsertMessage & { scope: 'internal' }): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values({
        ...insertMessage,
        scope: 'internal'
      })
      .returning();
    
    // Automatically mark the message as read for the sender
    // (users shouldn't see their own messages as unread)
    await db.insert(messageReads).values({
      messageId: message.id,
      userId: insertMessage.senderId
    });
    
    // Internal messages don't update conversation timestamp (hidden from customer view)
    return message;
  }

  async updateMessageStatus(id: string, status: string): Promise<void> {
    await db
      .update(messages)
      .set({ status })
      .where(eq(messages.id, id));
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [result] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return result;
  }

  async markConversationAsRead(userId: string, conversationId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.conversationId, conversationId),
        eq(notifications.isRead, false)
      ));
  }

  async getUnreadNotificationsForUser(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ))
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadCountsByConversation(userId: string): Promise<Array<{ conversationId: string; count: number }>> {
    const result = await db
      .select({
        conversationId: notifications.conversationId,
        count: sql<number>`count(*)::int`
      })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ))
      .groupBy(notifications.conversationId);
    
    return result;
  }

  async createNotificationsForAllStaff(conversationId: string): Promise<void> {
    // Get all staff (agents and admins)
    const staff = await db
      .select()
      .from(users)
      .where(or(
        eq(users.role, 'agent'),
        eq(users.role, 'admin')
      ));
    
    // Create notifications for all staff
    if (staff.length > 0) {
      await db.insert(notifications).values(
        staff.map(user => ({
          userId: user.id,
          conversationId,
          isRead: false
        }))
      );
    }
  }

  // Message Read operations - for per-message unread tracking
  async createMessageRead(messageId: string, userId: string): Promise<void> {
    await db.insert(messageReads).values({
      messageId,
      userId
    });
  }

  async markAllConversationMessagesAsRead(conversationId: string, userId: string): Promise<boolean> {
    // Get the conversation to verify membership
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));
    
    if (!conversation) {
      return false; // Conversation doesn't exist
    }
    
    // Check if userId is a staff member (from users table)
    const [staffUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId));
    
    const isStaff = !!staffUser;
    const isAdmin = staffUser?.role === 'admin';
    
    // Verify membership based on role
    let hasAccess = false;
    if (isAdmin) {
      // Admins can access all conversations
      hasAccess = true;
    } else if (isStaff) {
      // Staff can access assigned conversations or unassigned conversations
      hasAccess = conversation.assignedAgentId === userId || conversation.assignedAgentId === null;
    } else {
      // For non-staff, check if userId matches customerId
      // This works for both registered and anonymous customers (they all have customer IDs)
      hasAccess = conversation.customerId === userId;
    }
    
    if (!hasAccess) {
      return false; // User is not authorized to access this conversation
    }
    
    // Get all messages in the conversation that haven't been read by this user
    // Filter by scope based on user role
    const unreadMessages = await db
      .select({ id: messages.id })
      .from(messages)
      .leftJoin(
        messageReads,
        and(
          eq(messageReads.messageId, messages.id),
          eq(messageReads.userId, userId)
        )
      )
      .where(and(
        eq(messages.conversationId, conversationId),
        isNull(messageReads.id), // Message hasn't been read by this user
        // Staff can see all messages, customers only see public messages
        isStaff ? sql`true` : eq(messages.scope, 'public')
      ));

    // Create read entries for all unread messages
    if (unreadMessages.length > 0) {
      await db.insert(messageReads).values(
        unreadMessages.map(msg => ({
          messageId: msg.id,
          userId
        }))
      );
    }
    
    return true; // Successfully marked messages as read
  }

  async getUnreadMessageCountsPerConversation(userId: string): Promise<Array<{ conversationId: string; unreadCount: number }>> {
    // Check if userId is a staff member (from users table)
    const [staffUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId));
    
    const isStaff = !!staffUser;
    const isAdmin = staffUser?.role === 'admin';
    
    // Build conversation filter based on user role and membership
    let conversationFilter;
    if (isAdmin) {
      // Admins can see all conversations
      conversationFilter = sql`true`;
    } else if (isStaff) {
      // Agents can see conversations assigned to them or unassigned conversations
      conversationFilter = or(
        eq(conversations.assignedAgentId, userId),
        isNull(conversations.assignedAgentId)
      );
    } else {
      // For non-staff (customers), only show conversations where they are the customer
      // This works for both registered and anonymous customers (they all have customer IDs)
      conversationFilter = eq(conversations.customerId, userId);
    }
    
    // Get all messages for conversations involving this user
    // Count those that don't have a read entry for this user
    const result = await db
      .select({
        conversationId: messages.conversationId,
        unreadCount: sql<number>`count(*)::int`
      })
      .from(messages)
      .innerJoin(
        conversations,
        eq(messages.conversationId, conversations.id)
      )
      .leftJoin(
        messageReads,
        and(
          eq(messageReads.messageId, messages.id),
          eq(messageReads.userId, userId)
        )
      )
      .where(and(
        isNull(messageReads.id), // Message hasn't been read by this user
        conversationFilter, // Only count messages from conversations the user can access
        // Filter by message scope based on user role
        isStaff
          ? sql`true` // Staff can see all messages (public and internal)
          : eq(messages.scope, 'public') // Customers only see public messages
      ))
      .groupBy(messages.conversationId);

    return result;
  }

  async getMessagesReadStatus(messageIds: string[], userId: string): Promise<Map<string, boolean>> {
    if (messageIds.length === 0) {
      return new Map();
    }

    // Get all message reads for this user and these messages
    const reads = await db
      .select({ messageId: messageReads.messageId })
      .from(messageReads)
      .where(
        and(
          eq(messageReads.userId, userId),
          inArray(messageReads.messageId, messageIds)
        )
      );

    // Create a Map with all messageIds set to false, then update the ones that are read
    const readStatus = new Map<string, boolean>();
    messageIds.forEach(id => readStatus.set(id, false));
    reads.forEach(read => readStatus.set(read.messageId, true));

    return readStatus;
  }

  // Ticket operations
  async getTicket(id: string): Promise<Ticket | undefined> {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    return ticket || undefined;
  }

  async getTicketsByCustomer(customerId: string): Promise<Ticket[]> {
    return await db
      .select()
      .from(tickets)
      .where(eq(tickets.customerId, customerId))
      .orderBy(desc(tickets.createdAt));
  }

  async getTicketsByAgent(agentId: string): Promise<Ticket[]> {
    return await db
      .select()
      .from(tickets)
      .where(eq(tickets.assignedAgentId, agentId))
      .orderBy(desc(tickets.createdAt));
  }

  async getAllTickets(): Promise<Ticket[]> {
    return await db
      .select()
      .from(tickets)
      .orderBy(desc(tickets.createdAt));
  }

  async createTicket(insertTicket: InsertTicket): Promise<Ticket> {
    const [ticket] = await db
      .insert(tickets)
      .values({
        ...insertTicket,
        updatedAt: new Date(),
      })
      .returning();
    return ticket;
  }

  async updateTicketStatus(id: string, status: string): Promise<void> {
    const updateData: any = { status, updatedAt: new Date() };
    if (status === 'closed') {
      updateData.resolvedAt = new Date();
    }
    
    await db
      .update(tickets)
      .set(updateData)
      .where(eq(tickets.id, id));
  }

  async assignTicket(id: string, agentId: string): Promise<void> {
    await db
      .update(tickets)
      .set({ assignedAgentId: agentId, updatedAt: new Date() })
      .where(eq(tickets.id, id));
  }

  // External sync operations
  async syncCustomerFromExternal(data: ExternalCustomerSync): Promise<Customer> {
    // Check if customer already exists by external ID
    if (data.externalId && data.externalSystem) {
      const existing = await this.getCustomerByExternalId(data.externalId, data.externalSystem);
      if (existing) {
        // Update existing customer
        const [updated] = await db
          .update(customers)
          .set({
            name: data.name,
            email: data.email,
            company: data.company,
            tags: data.tags,
            syncStatus: 'synced',
            lastSyncAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(customers.id, existing.id))
          .returning();
        return updated;
      }
    }

    // Create new customer
    const [customer] = await db
      .insert(customers)
      .values({
        ...data,
        syncStatus: 'synced',
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return customer;
  }

  async syncTicketFromExternal(data: ExternalTicketSync): Promise<Ticket> {
    // Check if ticket already exists by external ID
    if (data.externalId && data.externalSystem) {
      const existing = await this.getTicketByExternalId(data.externalId, data.externalSystem);
      if (existing) {
        // Update existing ticket
        const [updated] = await db
          .update(tickets)
          .set({
            title: data.title,
            description: data.description,
            status: data.status,
            priority: data.priority,
            category: data.category,
            syncStatus: 'synced',
            lastSyncAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(tickets.id, existing.id))
          .returning();
        return updated;
      }
    }

    // Create new ticket
    const [ticket] = await db
      .insert(tickets)
      .values({
        ...data,
        syncStatus: 'synced',
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return ticket;
  }

  async updateCustomerSyncStatus(id: string, status: string, externalId?: string): Promise<void> {
    const updateData: any = { syncStatus: status, lastSyncAt: new Date(), updatedAt: new Date() };
    if (externalId) {
      updateData.externalId = externalId;
    }
    
    await db
      .update(customers)
      .set(updateData)
      .where(eq(customers.id, id));
  }

  async updateTicketSyncStatus(id: string, status: string, externalId?: string): Promise<void> {
    const updateData: any = { syncStatus: status, lastSyncAt: new Date(), updatedAt: new Date() };
    if (externalId) {
      updateData.externalId = externalId;
    }
    
    await db
      .update(tickets)
      .set(updateData)
      .where(eq(tickets.id, id));
  }

  async getCustomerByExternalId(externalId: string, externalSystem: string): Promise<Customer | undefined> {
    const [customer] = await db
      .select()
      .from(customers)
      .where(and(
        eq(customers.externalId, externalId),
        eq(customers.externalSystem, externalSystem)
      ));
    return customer || undefined;
  }

  async getTicketByExternalId(externalId: string, externalSystem: string): Promise<Ticket | undefined> {
    const [ticket] = await db
      .select()
      .from(tickets)
      .where(and(
        eq(tickets.externalId, externalId),
        eq(tickets.externalSystem, externalSystem)
      ));
    return ticket || undefined;
  }

  // Customer chat operations for anonymous customers
  async getConversationBySession(sessionId: string): Promise<{ conversationId: string; customerId: string; customerInfo: AnonymousCustomer } | null> {
    const [conversation] = await db
      .select({
        id: conversations.id,
        customerId: conversations.customerId,
        customer: customers,
      })
      .from(conversations)
      .innerJoin(customers, eq(conversations.customerId, customers.id))
      .where(eq(conversations.sessionId, sessionId));

    if (!conversation) {
      return null;
    }

    return {
      conversationId: conversation.id,
      customerId: conversation.customerId,
      customerInfo: {
        name: conversation.customer.name,
        email: conversation.customer.email,
        phone: conversation.customer.phone || '',
        company: conversation.customer.company || '',
        ipAddress: conversation.customer.ipAddress || '',
      },
    };
  }

  async getConversationByIP(ipAddress: string): Promise<{ conversationId: string; customerId: string; customerInfo: AnonymousCustomer } | null> {
    const [conversation] = await db
      .select({
        id: conversations.id,
        customerId: conversations.customerId,
        customer: customers,
      })
      .from(conversations)
      .innerJoin(customers, eq(conversations.customerId, customers.id))
      .where(eq(customers.ipAddress, ipAddress))
      .orderBy(desc(conversations.createdAt))
      .limit(1);

    if (!conversation) {
      return null;
    }

    return {
      conversationId: conversation.id,
      customerId: conversation.customerId,
      customerInfo: {
        name: conversation.customer.name,
        email: conversation.customer.email,
        phone: conversation.customer.phone || '',
        company: conversation.customer.company || '',
        ipAddress: conversation.customer.ipAddress || '',
      },
    };
  }

  async findExistingCustomer(email: string, phone: string, company: string): Promise<Customer | undefined> {
    // Since email is unique in the database, we can find existing customer by email alone
    // This prevents unique constraint violations when user changes company/phone
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.email, email));
    return customer || undefined;
  }

  async getAnonymousCustomer(customerId: string): Promise<{ id: string; name: string; email: string; sessionId: string } | null> {
    // Get customer and their most recent conversation's sessionId for verification
    const [result] = await db
      .select({
        id: customers.id,
        name: customers.name,
        email: customers.email,
        sessionId: conversations.sessionId,
      })
      .from(customers)
      .innerJoin(conversations, eq(conversations.customerId, customers.id))
      .where(eq(customers.id, customerId))
      .orderBy(desc(conversations.createdAt))
      .limit(1);

    if (!result || !result.sessionId) {
      return null;
    }

    return {
      id: result.id,
      name: result.name,
      email: result.email,
      sessionId: result.sessionId,
    };
  }

  async createAnonymousCustomer(customerData: AnonymousCustomer & { sessionId: string }, wsServer?: any): Promise<{ customerId: string; conversationId: string; customerInfo: AnonymousCustomer }> {
    console.log('=== createAnonymousCustomer called ===');
    console.log('customerData received:', JSON.stringify(customerData, null, 2));
    console.log('customerData.contextData:', customerData.contextData);
    console.log('customerData.contextData type:', typeof customerData.contextData);
    
    // First check if customer already exists by email (primary identifier)
    const existingCustomer = await this.getCustomerByEmail(customerData.email);

    let customer: Customer;
    let customerOrg: CustomerOrganization | null = null;
    
    if (existingCustomer) {
      // Update existing customer with new info
      const updateData: any = { 
        updatedAt: new Date(),
        name: customerData.name, // Update name in case it changed
      };
      if (customerData.ipAddress) {
        updateData.ipAddress = customerData.ipAddress;
      }
      if (customerData.phone) {
        updateData.phone = customerData.phone;
      }
      if (customerData.company) {
        updateData.company = customerData.company;
      }
      // Security: Only backfill organizationId if customer has NULL (legacy) - never overwrite existing org
      // This prevents cross-tenant takeover attacks
      if (customerData.organizationId) {
        if (existingCustomer.organizationId === null) {
          // Safe backfill for legacy customer
          updateData.organizationId = customerData.organizationId;
        } else if (existingCustomer.organizationId !== customerData.organizationId) {
          // Cross-tenant violation - throw error to prevent takeover
          throw new Error(`Security violation: Cannot reassign customer ${existingCustomer.id} from org ${existingCustomer.organizationId} to ${customerData.organizationId}`);
        }
        // If already matches, no update needed
      }
      
      // Handle organization membership for existing customer
      if (customerData.company && customerData.company.trim()) {
        customerOrg = await this.getOrCreateCustomerOrganization(customerData.company);
        
        // If customer is not in this org yet, link them
        if (existingCustomer.customerOrganizationId !== customerOrg.id) {
          // Step 1: Link as member first (safe, no race condition)
          updateData.customerOrganizationId = customerOrg.id;
          updateData.customerOrgRole = 'member';
          
          await db
            .update(customers)
            .set(updateData)
            .where(eq(customers.id, existingCustomer.id));
          
          // Step 2: Try to claim admin if no admin exists
          // Protected by partial unique index idx_customers_one_admin_per_org
          try {
            const claimAdminResult = await db.execute(sql`
              UPDATE customers 
              SET customer_org_role = 'admin', updated_at = NOW()
              WHERE id = ${existingCustomer.id}
              AND customer_organization_id = ${customerOrg.id}
              AND NOT EXISTS (
                SELECT 1 FROM customers 
                WHERE customer_organization_id = ${customerOrg.id} 
                AND customer_org_role = 'admin'
                AND id != ${existingCustomer.id}
              )
              RETURNING *
            `);
            
            // Refresh customer data - db.execute returns { rows } for pg driver
            // Re-fetch to get properly typed camelCase record
            const rows = (claimAdminResult as any).rows || claimAdminResult;
            if (rows && rows.length > 0) {
              const refreshedCustomer = await this.getCustomer(existingCustomer.id);
              customer = refreshedCustomer || { ...existingCustomer, ...updateData, customerOrgRole: 'admin' };
              console.log(`Existing customer ${customer.id} claimed admin for org ${customerOrg.name}`);
            } else {
              const refreshedCustomer = await this.getCustomer(existingCustomer.id);
              customer = refreshedCustomer || { ...existingCustomer, ...updateData };
              console.log(`Existing customer linked to org ${customerOrg.name} as member (admin exists)`);
            }
          } catch (err: any) {
            // Unique constraint violation means another customer already claimed admin
            if (err.code === '23505') {
              const refreshedCustomer = await this.getCustomer(existingCustomer.id);
              customer = refreshedCustomer || { ...existingCustomer, ...updateData };
              console.log(`Existing customer linked to org as member (concurrent admin claim resolved)`);
            } else {
              throw err;
            }
          }
        } else {
          // Customer already in this org, just update other fields
          await db
            .update(customers)
            .set(updateData)
            .where(eq(customers.id, existingCustomer.id));
          customer = { ...existingCustomer, ...updateData };
        }
      } else {
        // No company - just update the customer
        await db
          .update(customers)
          .set(updateData)
          .where(eq(customers.id, existingCustomer.id));
        customer = { ...existingCustomer, ...updateData };
      }
    } else {
      // Handle organization membership for new customer
      let orgId: string | null = null;
      
      if (customerData.company && customerData.company.trim()) {
        customerOrg = await this.getOrCreateCustomerOrganization(customerData.company);
        orgId = customerOrg.id;
        console.log(`New customer will join org ${customerOrg?.name}`);
      }
      
      // Create new customer with organization membership
      // Strategy: Insert as 'member', then try to claim admin if no admin exists
      // This prevents race conditions - at most one customer can claim admin per org
      if (orgId) {
        // Step 1: Insert as member (safe, no race condition possible)
        const customerValues: any = {
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          company: customerData.company,
          ipAddress: customerData.ipAddress,
          status: 'online',
          customerOrganizationId: orgId,
          customerOrgRole: 'member', // Start as member
          organizationId: customerData.organizationId || null, // Platform organization for multi-tenant scoping
        };
        
        [customer] = await db
          .insert(customers)
          .values(customerValues)
          .returning();
        
        // Step 2: Try to claim admin if no admin exists for this org
        // This UPDATE is protected by partial unique index idx_customers_one_admin_per_org
        // which ensures only ONE customer can have admin role per organization
        try {
          const claimAdminResult = await db.execute(sql`
            UPDATE customers 
            SET customer_org_role = 'admin', updated_at = NOW()
            WHERE id = ${customer.id}
            AND customer_organization_id = ${orgId}
            AND NOT EXISTS (
              SELECT 1 FROM customers 
              WHERE customer_organization_id = ${orgId} 
              AND customer_org_role = 'admin'
              AND id != ${customer.id}
            )
            RETURNING *
          `);
          
          // Check if we claimed admin - db.execute returns { rows } for pg driver
          // Also need to re-fetch customer since raw SQL returns snake_case columns
          const rows = (claimAdminResult as any).rows || claimAdminResult;
          if (rows && rows.length > 0) {
            // Refresh customer to get properly typed record with camelCase fields
            const refreshedCustomer = await this.getCustomer(customer.id);
            if (refreshedCustomer) {
              customer = refreshedCustomer;
            }
            console.log(`Customer ${customer.id} claimed admin role for org ${orgId}`);
          } else {
            console.log(`Customer ${customer.id} joined org ${orgId} as member (admin already exists)`);
          }
        } catch (err: any) {
          // Unique constraint violation means another customer already claimed admin
          if (err.code === '23505') {
            console.log(`Customer ${customer.id} joined org ${orgId} as member (concurrent admin claim resolved)`);
          } else {
            throw err;
          }
        }
      } else {
        // No org - create customer without org membership
        const customerValues: any = {
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          company: customerData.company,
          ipAddress: customerData.ipAddress,
          status: 'online',
          customerOrganizationId: null,
          customerOrgRole: null,
          organizationId: customerData.organizationId || null, // Platform organization for multi-tenant scoping
        };
        
        [customer] = await db
          .insert(customers)
          .values(customerValues)
          .returning();
      }
    }

    // Create new conversation
    const contextDataToStore = customerData.contextData ? JSON.stringify(customerData.contextData) : null;
    console.log('=== Creating conversation ===');
    console.log('contextData to store:', contextDataToStore);
    console.log('contextData to store type:', typeof contextDataToStore);
    
    const conversationValues = {
      customerId: customer.id,
      title: `Chat with ${customerData.name}`,
      isAnonymous: true,
      sessionId: customerData.sessionId,
      status: 'open',
      priority: 'medium',
      contextData: contextDataToStore,
    };
    console.log('Conversation values:', JSON.stringify(conversationValues, null, 2));
    
    const [conversation] = await db
      .insert(conversations)
      .values(conversationValues)
      .returning();
    
    console.log('Conversation created - context_data field:', conversation.contextData);

    // Try to auto-assign conversation to an available agent
    const assignedAgent = await this.autoAssignConversation(conversation.id);
    
    if (assignedAgent) {
      console.log(`Auto-assigned conversation ${conversation.id} to agent ${assignedAgent.name} (${assignedAgent.id})`);
    } else {
      console.log(`No available agents for conversation ${conversation.id}. Added to unassigned queue.`);
      
      // Log system event for unassigned queue
      await this.createActivityLog({
        conversationId: conversation.id,
        action: 'queued',
        details: 'Added to unassigned queue - no available agents'
        // agentId is null for system events
      });
    }

    // Broadcast new conversation notification to staff via WebSocket
    if (wsServer && wsServer.broadcastNewConversation) {
      const conversationWithAssignment = { ...conversation, assignedAgentId: assignedAgent?.id || null };
      wsServer.broadcastNewConversation(conversationWithAssignment, customer, 'New customer conversation started');
    }

    return {
      customerId: customer.id,
      conversationId: conversation.id,
      customerInfo: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone || '',
        company: customer.company || '',
        ipAddress: customer.ipAddress || '',
      },
    };
  }

  async getCustomerChatMessages(conversationId: string): Promise<Array<{ id: string; content: string; senderType: 'customer' | 'agent' | 'ai'; senderName: string; timestamp: string; attachments?: Attachment[] }>> {
    const messageResults = await db
      .select({
        message: messages,
        customer: customers,
        agent: users,
      })
      .from(messages)
      .leftJoin(customers, eq(messages.senderId, customers.id))
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(and(
        eq(messages.conversationId, conversationId),
        eq(messages.scope, 'public') // Only public messages for customer chat
      ))
      .orderBy(messages.timestamp);

    // Fetch attachments for all messages in parallel
    const messagesWithAttachments = await Promise.all(
      messageResults.map(async (result) => {
        const message = result.message;
        let senderName = 'Unknown';
        let senderType: 'customer' | 'agent' | 'ai' = message.senderType as 'customer' | 'agent';
        
        // Check if this is an AI message - either the system AI agent or any AI agent from aiAgents table
        // The system AI agent ID is used for all AI-generated messages
        const AI_SYSTEM_AGENT_ID = 'ai-system-agent-001';
        const isAiMessage = message.senderId === AI_SYSTEM_AGENT_ID || 
                           (!result.customer && !result.agent && (message.senderType === 'agent' || message.senderType === 'admin'));
        
        if (isAiMessage) {
          senderType = 'ai';
          senderName = 'Alex (AI Assistant)';
        } else if (message.senderType === 'customer' && result.customer) {
          senderName = result.customer.name;
        } else if ((message.senderType === 'agent' || message.senderType === 'admin') && result.agent) {
          senderName = result.agent.name;
        }

        const messageAttachments = await this.getAttachmentsByMessage(message.id);

        return {
          id: message.id,
          content: message.content,
          translatedContent: message.translatedContent,
          originalLanguage: message.originalLanguage,
          senderType,
          senderName,
          timestamp: message.timestamp.toISOString(),
          attachments: messageAttachments.length > 0 ? messageAttachments : undefined,
        };
      })
    );

    return messagesWithAttachments;
  }

  async createCustomerMessage(messageData: { conversationId: string; customerId: string; content: string; translatedContent?: string | null; originalLanguage?: string | null }): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values({
        conversationId: messageData.conversationId,
        senderId: messageData.customerId,
        senderType: 'customer',
        content: messageData.content,
        translatedContent: messageData.translatedContent || null,
        originalLanguage: messageData.originalLanguage || null,
        scope: 'public',
        status: 'sent',
      })
      .returning();

    return message;
  }

  // Attachment operations
  async createAttachment(attachment: InsertAttachment): Promise<Attachment> {
    const [newAttachment] = await db
      .insert(attachments)
      .values(attachment)
      .returning();
    return newAttachment;
  }

  async getAttachmentsByMessage(messageId: string): Promise<Attachment[]> {
    return await db
      .select()
      .from(attachments)
      .where(eq(attachments.messageId, messageId))
      .orderBy(attachments.createdAt);
  }

  async deleteAttachment(id: string): Promise<void> {
    await db.delete(attachments).where(eq(attachments.id, id));
  }

  // Activity log operations
  async createActivityLog(activityLog: InsertActivityLog): Promise<ActivityLog> {
    const [log] = await db
      .insert(activityLogs)
      .values(activityLog)
      .returning();
    return log;
  }

  async getActivityLogsByAgent(agentId: string): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.agentId, agentId))
      .orderBy(desc(activityLogs.timestamp));
  }

  async getActivityLogsByConversation(conversationId: string): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.conversationId, conversationId!))
      .orderBy(desc(activityLogs.timestamp));
  }

  // Agent workload operations
  async getAgentWorkload(agentId: string): Promise<AgentWorkload | undefined> {
    const [workload] = await db
      .select()
      .from(agentWorkload)
      .where(eq(agentWorkload.agentId, agentId));
    return workload || undefined;
  }

  async updateAgentWorkload(agentId: string, activeConversations: number): Promise<void> {
    await db
      .update(agentWorkload)
      .set({ 
        activeConversations, 
        lastActivity: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(agentWorkload.agentId, agentId));
  }

  async getAvailableAgents(): Promise<Array<{ user: User; workload: AgentWorkload }>> {
    const results = await db
      .select({
        user: users,
        workload: agentWorkload,
      })
      .from(users)
      .leftJoin(agentWorkload, eq(users.id, agentWorkload.agentId))
      .where(and(
        or(eq(users.role, 'agent'), eq(users.role, 'admin')),
        eq(users.status, 'online')
      ));

    // Initialize workload records for agents that don't have them and filter by capacity
    const agentsWithWorkload = [];
    for (const result of results) {
      let workload = result.workload;
      
      // If agent doesn't have a workload record, create one with defaults
      if (!workload) {
        await db.insert(agentWorkload).values({
          agentId: result.user.id,
          activeConversations: 0,
          maxCapacity: 5, // Default capacity
          lastActivity: new Date(),
          updatedAt: new Date()
        }).onConflictDoNothing();
        
        // Create the workload object for immediate use
        workload = {
          id: '', // Will be set by database
          agentId: result.user.id,
          activeConversations: 0,
          maxCapacity: 5,
          lastActivity: new Date(),
          updatedAt: new Date()
        };
      }
      
      // Only include agents with capacity
      if (workload && workload.activeConversations < workload.maxCapacity) {
        agentsWithWorkload.push({
          user: result.user,
          workload: workload as AgentWorkload
        });
      }
    }

    return agentsWithWorkload;
  }

  async findBestAvailableAgent(): Promise<User | null> {
    const availableAgents = await this.getAvailableAgents();
    
    if (availableAgents.length === 0) {
      return null;
    }

    // Sort by current workload (ascending) to find agent with least conversations
    availableAgents.sort((a, b) => a.workload.activeConversations - b.workload.activeConversations);
    
    return availableAgents[0].user;
  }

  async autoAssignConversation(conversationId: string): Promise<User | null> {
    const bestAgent = await this.findBestAvailableAgent();
    
    if (!bestAgent) {
      // Log that conversation was added to unassigned queue
      await this.createActivityLog({
        conversationId,
        action: 'queued',
        details: 'No available agents; added to unassigned queue'
      });
      return null;
    }

    // Assign conversation to agent
    await this.assignConversation(conversationId, bestAgent.id);
    
    // Update agent workload
    const currentWorkload = await this.getAgentWorkload(bestAgent.id);
    if (currentWorkload) {
      await this.updateAgentWorkload(bestAgent.id, currentWorkload.activeConversations + 1);
    }
    
    // Log the assignment
    await this.createActivityLog({
      agentId: bestAgent.id,
      conversationId,
      action: 'assigned',
      details: `Auto-assigned to ${bestAgent.name} by system`
    });

    return bestAgent;
  }

  async getUnassignedConversations(): Promise<Conversation[]> {
    try {
      console.log('Executing getUnassignedConversations query...');
      const results = await db
        .select({
          id: conversations.id,
          customerId: conversations.customerId,
          assignedAgentId: conversations.assignedAgentId,
          title: conversations.title,
          status: conversations.status,
          priority: conversations.priority,
          followupDate: conversations.followupDate, // Add missing field
          isAnonymous: conversations.isAnonymous,
          sessionId: conversations.sessionId,
          aiAssistanceEnabled: conversations.aiAssistanceEnabled,
          createdAt: conversations.createdAt,
          updatedAt: conversations.updatedAt,
          customer: {
            id: customers.id,
            name: customers.name,
            email: customers.email,
            company: customers.company,
            phone: customers.phone,
            status: customers.status,
          }
        })
        .from(conversations)
        .leftJoin(customers, eq(conversations.customerId, customers.id))
        .where(and(
          isNull(conversations.assignedAgentId),
          eq(conversations.status, 'open')
        ))
        .orderBy(desc(conversations.createdAt));
      
      console.log(`getUnassignedConversations found ${results.length} results:`, results.map(r => r.id));
      return results;
    } catch (error) {
      console.error('Error in getUnassignedConversations:', error);
      return [];
    }
  }

  // AI Agent operations
  async getAiAgent(id: string): Promise<AiAgent | undefined> {
    try {
      const [agent] = await db.select().from(aiAgents).where(eq(aiAgents.id, id));
      return agent || undefined;
    } catch (error) {
      console.error('Error fetching AI agent:', error);
      return undefined;
    }
  }

  async getActiveAiAgents(): Promise<AiAgent[]> {
    try {
      return await db.select().from(aiAgents).where(eq(aiAgents.isActive, true));
    } catch (error) {
      console.error('Error fetching active AI agents:', error);
      return [];
    }
  }

  async getAllAiAgents(): Promise<AiAgent[]> {
    try {
      return await db.select().from(aiAgents).orderBy(desc(aiAgents.createdAt));
    } catch (error) {
      console.error('Error fetching all AI agents:', error);
      return [];
    }
  }

  async getAgentsBySpecialization(specialization: string): Promise<AiAgent[]> {
    try {
      const agents = await db.select().from(aiAgents).where(eq(aiAgents.isActive, true));
      return agents.filter(agent => 
        agent.specializations && 
        agent.specializations.some(spec => 
          spec.toLowerCase().includes(specialization.toLowerCase())
        )
      );
    } catch (error) {
      console.error('Error fetching agents by specialization:', error);
      return [];
    }
  }

  async createAiAgent(agent: InsertAiAgent): Promise<AiAgent> {
    try {
      const [result] = await db.insert(aiAgents).values(agent).returning();
      return result;
    } catch (error) {
      console.error('Error creating AI agent:', error);
      throw error;
    }
  }

  async updateAiAgent(id: string, updates: Partial<InsertAiAgent>): Promise<void> {
    try {
      await db.update(aiAgents).set({ ...updates, updatedAt: new Date() }).where(eq(aiAgents.id, id));
    } catch (error) {
      console.error('Error updating AI agent:', error);
      throw error;
    }
  }

  async deleteAiAgent(id: string): Promise<void> {
    try {
      await db.delete(aiAgents).where(eq(aiAgents.id, id));
    } catch (error) {
      console.error('Error deleting AI agent:', error);
      throw error;
    }
  }

  // Support Categories operations
  async getSupportCategory(id: string): Promise<SupportCategory | undefined> {
    try {
      const [category] = await db.select().from(supportCategories).where(eq(supportCategories.id, id));
      return category || undefined;
    } catch (error) {
      console.error('Error fetching support category:', error);
      return undefined;
    }
  }

  async getSupportCategoryBySlug(slug: string): Promise<SupportCategory | undefined> {
    try {
      const [category] = await db.select().from(supportCategories).where(eq(supportCategories.slug, slug));
      return category || undefined;
    } catch (error) {
      console.error('Error fetching support category by slug:', error);
      return undefined;
    }
  }

  async getAllSupportCategories(): Promise<SupportCategory[]> {
    try {
      return await db.select().from(supportCategories).orderBy(supportCategories.displayOrder);
    } catch (error) {
      console.error('Error fetching all support categories:', error);
      return [];
    }
  }

  async getVisibleSupportCategories(): Promise<SupportCategory[]> {
    try {
      return await db.select().from(supportCategories)
        .where(and(eq(supportCategories.isVisible, true), eq(supportCategories.isActive, true)))
        .orderBy(supportCategories.displayOrder);
    } catch (error) {
      console.error('Error fetching visible support categories:', error);
      return [];
    }
  }

  async createSupportCategory(category: InsertSupportCategory): Promise<SupportCategory> {
    try {
      const [result] = await db.insert(supportCategories).values(category).returning();
      return result;
    } catch (error) {
      console.error('Error creating support category:', error);
      throw error;
    }
  }

  async updateSupportCategory(id: string, updates: Partial<InsertSupportCategory>): Promise<void> {
    try {
      await db.update(supportCategories).set({ ...updates, updatedAt: new Date() }).where(eq(supportCategories.id, id));
    } catch (error) {
      console.error('Error updating support category:', error);
      throw error;
    }
  }

  async deleteSupportCategory(id: string): Promise<void> {
    try {
      await db.delete(supportCategories).where(eq(supportCategories.id, id));
    } catch (error) {
      console.error('Error deleting support category:', error);
      throw error;
    }
  }

  // Brand Configuration operations
  async getBrandConfig(): Promise<BrandConfig | undefined> {
    try {
      const [config] = await db.select().from(brandConfig).limit(1);
      return config || undefined;
    } catch (error) {
      console.error('Error fetching brand config:', error);
      return undefined;
    }
  }

  async updateBrandConfig(updates: Partial<UpdateBrandConfig>): Promise<BrandConfig> {
    try {
      const [config] = await db.select().from(brandConfig).limit(1);
      
      if (!config) {
        const [newConfig] = await db.insert(brandConfig).values({
          ...updates,
          updatedAt: new Date(),
        } as InsertBrandConfig).returning();
        return newConfig;
      }

      const [updatedConfig] = await db
        .update(brandConfig)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(brandConfig.id, config.id))
        .returning();
      
      return updatedConfig;
    } catch (error) {
      console.error('Error updating brand config:', error);
      throw error;
    }
  }

  // Workspace operations
  async getWorkspace(id: string): Promise<Workspace | undefined> {
    try {
      const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id));
      return workspace || undefined;
    } catch (error) {
      console.error('Error fetching workspace:', error);
      return undefined;
    }
  }

  async getWorkspacesByOrganization(organizationId: string): Promise<Workspace[]> {
    try {
      return await db.select().from(workspaces).where(eq(workspaces.organizationId, organizationId)).orderBy(desc(workspaces.createdAt));
    } catch (error) {
      console.error('Error fetching workspaces by organization:', error);
      return [];
    }
  }

  async getAllWorkspaces(includeDeleted: boolean = false): Promise<Workspace[]> {
    try {
      if (includeDeleted) {
        return await db.select().from(workspaces).orderBy(desc(workspaces.createdAt));
      }
      // Filter out soft-deleted workspaces
      return await db.select().from(workspaces)
        .where(isNull(workspaces.deletedAt))
        .orderBy(desc(workspaces.createdAt));
    } catch (error) {
      console.error('Error fetching all workspaces:', error);
      return [];
    }
  }

  async getDefaultWorkspace(): Promise<Workspace | undefined> {
    try {
      const allWorkspaces = await this.getAllWorkspaces();
      return allWorkspaces.find(w => w.isDefault) || allWorkspaces[0];
    } catch (error) {
      console.error('Error fetching default workspace:', error);
      return undefined;
    }
  }

  async createWorkspace(workspace: InsertWorkspace): Promise<Workspace> {
    try {
      const [result] = await db.insert(workspaces).values(workspace).returning();
      return result;
    } catch (error) {
      console.error('Error creating workspace:', error);
      throw error;
    }
  }

  async updateWorkspace(id: string, updates: Partial<InsertWorkspace>): Promise<Workspace> {
    try {
      const [result] = await db.update(workspaces).set({ ...updates, updatedAt: new Date() }).where(eq(workspaces.id, id)).returning();
      return result;
    } catch (error) {
      console.error('Error updating workspace:', error);
      throw error;
    }
  }

  async deleteWorkspace(id: string): Promise<void> {
    try {
      await db.delete(workspaces).where(eq(workspaces.id, id));
    } catch (error) {
      console.error('Error deleting workspace:', error);
      throw error;
    }
  }

  // Workspace Member operations
  async getWorkspaceMember(id: string): Promise<WorkspaceMember | undefined> {
    try {
      const [member] = await db.select().from(workspaceMembers).where(eq(workspaceMembers.id, id));
      return member || undefined;
    } catch (error) {
      console.error('Error fetching workspace member:', error);
      return undefined;
    }
  }

  async getWorkspaceMembersByWorkspace(workspaceId: string): Promise<WorkspaceMember[]> {
    try {
      return await db.select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspaceId));
    } catch (error) {
      console.error('Error fetching workspace members:', error);
      return [];
    }
  }

  async getWorkspaceMembersByUser(userId: string): Promise<WorkspaceMember[]> {
    try {
      return await db.select().from(workspaceMembers).where(eq(workspaceMembers.userId, userId));
    } catch (error) {
      console.error('Error fetching user workspace memberships:', error);
      return [];
    }
  }

  async getWorkspaceMemberByUserAndWorkspace(userId: string, workspaceId: string): Promise<WorkspaceMember | undefined> {
    try {
      const [member] = await db.select().from(workspaceMembers).where(
        and(
          eq(workspaceMembers.userId, userId),
          eq(workspaceMembers.workspaceId, workspaceId)
        )
      );
      return member || undefined;
    } catch (error) {
      console.error('Error fetching workspace member by user and workspace:', error);
      return undefined;
    }
  }

  async getUserWorkspaces(userId: string): Promise<Array<{ workspace: Workspace; membership: WorkspaceMember }>> {
    try {
      const memberships = await db.select().from(workspaceMembers).where(and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.status, 'active')
      ));
      
      const result: Array<{ workspace: Workspace; membership: WorkspaceMember }> = [];
      for (const membership of memberships) {
        const workspace = await this.getWorkspace(membership.workspaceId);
        if (workspace) {
          result.push({ workspace, membership });
        }
      }
      return result;
    } catch (error) {
      console.error('Error fetching user workspaces:', error);
      return [];
    }
  }

  async addWorkspaceMember(member: InsertWorkspaceMember): Promise<WorkspaceMember> {
    try {
      const [result] = await db.insert(workspaceMembers).values(member).returning();
      return result;
    } catch (error) {
      console.error('Error adding workspace member:', error);
      throw error;
    }
  }

  async createWorkspaceMember(member: InsertWorkspaceMember): Promise<WorkspaceMember> {
    return this.addWorkspaceMember(member);
  }

  async updateWorkspaceMember(id: string, updates: Partial<InsertWorkspaceMember>): Promise<WorkspaceMember> {
    try {
      const [result] = await db.update(workspaceMembers).set(updates).where(eq(workspaceMembers.id, id)).returning();
      return result;
    } catch (error) {
      console.error('Error updating workspace member:', error);
      throw error;
    }
  }

  async removeWorkspaceMember(id: string): Promise<void> {
    try {
      await db.delete(workspaceMembers).where(eq(workspaceMembers.id, id));
    } catch (error) {
      console.error('Error removing workspace member:', error);
      throw error;
    }
  }

  // Department operations
  async getDepartment(id: string): Promise<Department | undefined> {
    try {
      const [department] = await db.select().from(departments).where(eq(departments.id, id));
      return department;
    } catch (error) {
      console.error('Error fetching department:', error);
      throw error;
    }
  }

  async getDepartmentsByWorkspace(workspaceId: string): Promise<Department[]> {
    try {
      return await db.select().from(departments)
        .where(eq(departments.workspaceId, workspaceId))
        .orderBy(departments.displayOrder);
    } catch (error) {
      console.error('Error fetching departments by workspace:', error);
      throw error;
    }
  }

  async getAllDepartments(): Promise<Department[]> {
    try {
      return await db.select().from(departments).orderBy(departments.name);
    } catch (error) {
      console.error('Error fetching all departments:', error);
      throw error;
    }
  }

  async createDepartment(department: InsertDepartment): Promise<Department> {
    try {
      const [newDepartment] = await db.insert(departments).values(department).returning();
      return newDepartment;
    } catch (error) {
      console.error('Error creating department:', error);
      throw error;
    }
  }

  async updateDepartment(id: string, updates: Partial<UpdateDepartment>): Promise<Department> {
    try {
      const [updated] = await db.update(departments)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(departments.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating department:', error);
      throw error;
    }
  }

  async deleteDepartment(id: string): Promise<void> {
    try {
      // First delete department members
      await db.delete(departmentMembers).where(eq(departmentMembers.departmentId, id));
      // Then delete the department
      await db.delete(departments).where(eq(departments.id, id));
    } catch (error) {
      console.error('Error deleting department:', error);
      throw error;
    }
  }

  // Department Member operations
  async getDepartmentMember(id: string): Promise<DepartmentMember | undefined> {
    try {
      const [member] = await db.select().from(departmentMembers).where(eq(departmentMembers.id, id));
      return member;
    } catch (error) {
      console.error('Error fetching department member:', error);
      throw error;
    }
  }

  async getDepartmentMembersByDepartment(departmentId: string): Promise<DepartmentMember[]> {
    try {
      return await db.select().from(departmentMembers)
        .where(eq(departmentMembers.departmentId, departmentId));
    } catch (error) {
      console.error('Error fetching department members:', error);
      throw error;
    }
  }

  async getDepartmentMembersByWorkspaceMember(workspaceMemberId: string): Promise<DepartmentMember[]> {
    try {
      return await db.select().from(departmentMembers)
        .where(eq(departmentMembers.workspaceMemberId, workspaceMemberId));
    } catch (error) {
      console.error('Error fetching department memberships:', error);
      throw error;
    }
  }

  async addDepartmentMember(member: InsertDepartmentMember): Promise<DepartmentMember> {
    try {
      const [newMember] = await db.insert(departmentMembers).values(member).returning();
      return newMember;
    } catch (error) {
      console.error('Error adding department member:', error);
      throw error;
    }
  }

  async updateDepartmentMember(id: string, updates: Partial<InsertDepartmentMember>): Promise<DepartmentMember> {
    try {
      const [updated] = await db.update(departmentMembers)
        .set(updates)
        .where(eq(departmentMembers.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating department member:', error);
      throw error;
    }
  }

  async removeDepartmentMember(id: string): Promise<void> {
    try {
      await db.delete(departmentMembers).where(eq(departmentMembers.id, id));
    } catch (error) {
      console.error('Error removing department member:', error);
      throw error;
    }
  }

  // Organization operations (for white-label branding)
  async getOrganization(id: string): Promise<Organization | undefined> {
    try {
      const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
      return org || undefined;
    } catch (error) {
      console.error('Error fetching organization:', error);
      return undefined;
    }
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    try {
      const [org] = await db.select().from(organizations).where(eq(organizations.slug, slug));
      return org || undefined;
    } catch (error) {
      console.error('Error fetching organization by slug:', error);
      return undefined;
    }
  }

  async getAllOrganizations(includeDeleted: boolean = false): Promise<Organization[]> {
    try {
      if (includeDeleted) {
        return await db.select().from(organizations).orderBy(desc(organizations.createdAt));
      }
      // Filter out soft-deleted organizations
      return await db.select().from(organizations)
        .where(isNull(organizations.deletedAt))
        .orderBy(desc(organizations.createdAt));
    } catch (error) {
      console.error('Error fetching all organizations:', error);
      return [];
    }
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    try {
      const [newOrg] = await db.insert(organizations).values(org).returning();
      return newOrg;
    } catch (error) {
      console.error('Error creating organization:', error);
      throw error;
    }
  }

  async updateOrganization(id: string, updates: Partial<InsertOrganization>, performedBy?: string): Promise<Organization> {
    try {
      // Get current org state for audit logging
      const currentOrg = await this.getOrganization(id);
      
      const [updatedOrg] = await db.update(organizations)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(organizations.id, id))
        .returning();
      
      // Create audit log entries for significant field changes (like name)
      if (currentOrg && performedBy) {
        const fieldsToTrack = ['name', 'slug', 'status', 'customDomain', 'subdomain'];
        for (const field of fieldsToTrack) {
          const oldVal = (currentOrg as any)[field];
          const newVal = (updates as any)[field];
          if (newVal !== undefined && oldVal !== newVal) {
            await this.createAuditLog({
              entityType: 'organization',
              entityId: id,
              action: 'update',
              performedBy: performedBy,
              performedByType: 'user',
              organizationId: id,
              fieldName: field,
              oldValue: oldVal?.toString() || null,
              newValue: newVal?.toString() || null,
              entitySnapshot: currentOrg as any,
            });
          }
        }
      }
      
      return updatedOrg;
    } catch (error) {
      console.error('Error updating organization:', error);
      throw error;
    }
  }

  // Organization Application operations (business signup)
  async getOrganizationApplication(id: string): Promise<OrganizationApplication | undefined> {
    try {
      const [app] = await db.select().from(organizationApplications).where(eq(organizationApplications.id, id));
      return app || undefined;
    } catch (error) {
      console.error('Error fetching organization application:', error);
      return undefined;
    }
  }

  async getAllOrganizationApplications(status?: string): Promise<OrganizationApplication[]> {
    try {
      if (status) {
        return await db.select().from(organizationApplications)
          .where(eq(organizationApplications.status, status))
          .orderBy(desc(organizationApplications.createdAt));
      }
      return await db.select().from(organizationApplications)
        .orderBy(desc(organizationApplications.createdAt));
    } catch (error) {
      console.error('Error fetching organization applications:', error);
      return [];
    }
  }

  async createOrganizationApplication(app: InsertOrganizationApplication): Promise<OrganizationApplication> {
    try {
      const [created] = await db.insert(organizationApplications).values(app).returning();
      return created;
    } catch (error) {
      console.error('Error creating organization application:', error);
      throw error;
    }
  }

  async updateOrganizationApplication(id: string, updates: Partial<OrganizationApplication>): Promise<OrganizationApplication> {
    try {
      const [updated] = await db.update(organizationApplications)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(organizationApplications.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating organization application:', error);
      throw error;
    }
  }

  async checkOrganizationDuplicate(name: string, website?: string): Promise<{ isDuplicate: boolean; existingOrg?: Organization }> {
    try {
      const normalizedName = name.toLowerCase().trim();
      const existingOrgs = await db.select().from(organizations);
      
      for (const org of existingOrgs) {
        if (org.name.toLowerCase().trim() === normalizedName) {
          return { isDuplicate: true, existingOrg: org };
        }
        if (website && org.website && org.website.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '') === 
            website.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')) {
          return { isDuplicate: true, existingOrg: org };
        }
      }
      
      return { isDuplicate: false };
    } catch (error) {
      console.error('Error checking organization duplicate:', error);
      return { isDuplicate: false };
    }
  }

  // ============================================
  // ORGANIZATION SETUP TOKEN OPERATIONS
  // ============================================

  async getOrganizationSetupToken(id: string): Promise<OrganizationSetupToken | undefined> {
    try {
      const [token] = await db.select().from(organizationSetupTokens).where(eq(organizationSetupTokens.id, id));
      return token || undefined;
    } catch (error) {
      console.error('Error fetching organization setup token:', error);
      return undefined;
    }
  }

  async getOrganizationSetupTokenByToken(token: string): Promise<OrganizationSetupToken | undefined> {
    try {
      const [result] = await db.select().from(organizationSetupTokens).where(eq(organizationSetupTokens.token, token));
      return result || undefined;
    } catch (error) {
      console.error('Error fetching organization setup token by token:', error);
      return undefined;
    }
  }

  async getAllOrganizationSetupTokens(status?: string): Promise<OrganizationSetupToken[]> {
    try {
      if (status) {
        return await db.select().from(organizationSetupTokens)
          .where(eq(organizationSetupTokens.status, status))
          .orderBy(desc(organizationSetupTokens.createdAt));
      }
      return await db.select().from(organizationSetupTokens)
        .orderBy(desc(organizationSetupTokens.createdAt));
    } catch (error) {
      console.error('Error fetching organization setup tokens:', error);
      return [];
    }
  }

  async createOrganizationSetupToken(token: InsertOrganizationSetupToken): Promise<OrganizationSetupToken> {
    try {
      const [created] = await db.insert(organizationSetupTokens).values(token).returning();
      return created;
    } catch (error) {
      console.error('Error creating organization setup token:', error);
      throw error;
    }
  }

  async updateOrganizationSetupToken(id: string, updates: Partial<OrganizationSetupToken>): Promise<OrganizationSetupToken> {
    try {
      const [updated] = await db.update(organizationSetupTokens)
        .set(updates)
        .where(eq(organizationSetupTokens.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating organization setup token:', error);
      throw error;
    }
  }

  async completeOrganizationSetup(tokenId: string, organizationId: string): Promise<void> {
    try {
      await db.update(organizationSetupTokens)
        .set({ 
          status: 'completed', 
          completedAt: new Date(),
          organizationId: organizationId 
        })
        .where(eq(organizationSetupTokens.id, tokenId));
    } catch (error) {
      console.error('Error completing organization setup:', error);
      throw error;
    }
  }

  // ============================================
  // SOFT DELETE OPERATIONS
  // ============================================

  async softDeleteOrganization(id: string, deletedBy: string, reason?: string): Promise<void> {
    try {
      const org = await this.getOrganization(id);
      if (!org) throw new Error('Organization not found');
      
      const now = new Date();
      
      // Create audit log entry with snapshot
      await this.createAuditLog({
        entityType: 'organization',
        entityId: id,
        action: 'delete',
        performedBy: deletedBy,
        performedByType: 'user',
        organizationId: id,
        entitySnapshot: org as any,
        reason: reason,
      });
      
      // Soft delete by setting deletedAt
      await db.update(organizations)
        .set({ deletedAt: now, deletedBy: deletedBy, updatedAt: now })
        .where(eq(organizations.id, id));
    } catch (error) {
      console.error('Error soft deleting organization:', error);
      throw error;
    }
  }

  async softDeleteUser(id: string, deletedBy: string, reason?: string): Promise<void> {
    try {
      const user = await this.getUser(id);
      if (!user) throw new Error('User not found');
      
      const now = new Date();
      
      // Create audit log entry with snapshot
      await this.createAuditLog({
        entityType: 'user',
        entityId: id,
        action: 'delete',
        performedBy: deletedBy,
        performedByType: 'user',
        organizationId: user.organizationId || undefined,
        entitySnapshot: { ...user, password: '[REDACTED]' } as any,
        reason: reason,
      });
      
      // Soft delete by setting deletedAt
      await db.update(users)
        .set({ deletedAt: now, deletedBy: deletedBy, updatedAt: now })
        .where(eq(users.id, id));
    } catch (error) {
      console.error('Error soft deleting user:', error);
      throw error;
    }
  }

  async softDeleteWorkspace(id: string, deletedBy: string, reason?: string): Promise<void> {
    try {
      const workspace = await this.getWorkspace(id);
      if (!workspace) throw new Error('Workspace not found');
      
      const now = new Date();
      
      // Create audit log entry with snapshot
      await this.createAuditLog({
        entityType: 'workspace',
        entityId: id,
        action: 'delete',
        performedBy: deletedBy,
        performedByType: 'user',
        organizationId: workspace.organizationId,
        entitySnapshot: workspace as any,
        reason: reason,
      });
      
      // Soft delete by setting deletedAt
      await db.update(workspaces)
        .set({ deletedAt: now, deletedBy: deletedBy, updatedAt: now })
        .where(eq(workspaces.id, id));
    } catch (error) {
      console.error('Error soft deleting workspace:', error);
      throw error;
    }
  }

  async softDeleteCustomer(id: string, deletedBy: string, reason?: string): Promise<void> {
    try {
      const customer = await this.getCustomer(id);
      if (!customer) throw new Error('Customer not found');
      
      const now = new Date();
      
      // Create audit log entry with snapshot
      await this.createAuditLog({
        entityType: 'customer',
        entityId: id,
        action: 'delete',
        performedBy: deletedBy,
        performedByType: 'user',
        organizationId: customer.organizationId || undefined,
        entitySnapshot: { ...customer, portalPassword: '[REDACTED]' } as any,
        reason: reason,
      });
      
      // Soft delete by setting deletedAt
      await db.update(customers)
        .set({ deletedAt: now, deletedBy: deletedBy, updatedAt: now })
        .where(eq(customers.id, id));
    } catch (error) {
      console.error('Error soft deleting customer:', error);
      throw error;
    }
  }

  async restoreOrganization(id: string, restoredBy: string): Promise<void> {
    try {
      const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
      if (!org) throw new Error('Organization not found');
      
      // Create audit log entry for restoration
      await this.createAuditLog({
        entityType: 'organization',
        entityId: id,
        action: 'restore',
        performedBy: restoredBy,
        performedByType: 'user',
        organizationId: id,
      });
      
      // Restore by clearing deletedAt
      await db.update(organizations)
        .set({ deletedAt: null, deletedBy: null, updatedAt: new Date() })
        .where(eq(organizations.id, id));
    } catch (error) {
      console.error('Error restoring organization:', error);
      throw error;
    }
  }

  async restoreUser(id: string, restoredBy: string): Promise<void> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      if (!user) throw new Error('User not found');
      
      // Create audit log entry for restoration
      await this.createAuditLog({
        entityType: 'user',
        entityId: id,
        action: 'restore',
        performedBy: restoredBy,
        performedByType: 'user',
        organizationId: user.organizationId || undefined,
      });
      
      // Restore by clearing deletedAt
      await db.update(users)
        .set({ deletedAt: null, deletedBy: null, updatedAt: new Date() })
        .where(eq(users.id, id));
    } catch (error) {
      console.error('Error restoring user:', error);
      throw error;
    }
  }

  async restoreWorkspace(id: string, restoredBy: string): Promise<void> {
    try {
      const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id));
      if (!workspace) throw new Error('Workspace not found');
      
      // Create audit log entry for restoration
      await this.createAuditLog({
        entityType: 'workspace',
        entityId: id,
        action: 'restore',
        performedBy: restoredBy,
        performedByType: 'user',
        organizationId: workspace.organizationId,
      });
      
      // Restore by clearing deletedAt
      await db.update(workspaces)
        .set({ deletedAt: null, deletedBy: null, updatedAt: new Date() })
        .where(eq(workspaces.id, id));
    } catch (error) {
      console.error('Error restoring workspace:', error);
      throw error;
    }
  }

  async restoreCustomer(id: string, restoredBy: string): Promise<void> {
    try {
      const [customer] = await db.select().from(customers).where(eq(customers.id, id));
      if (!customer) throw new Error('Customer not found');
      
      // Create audit log entry for restoration
      await this.createAuditLog({
        entityType: 'customer',
        entityId: id,
        action: 'restore',
        performedBy: restoredBy,
        performedByType: 'user',
        organizationId: customer.organizationId || undefined,
      });
      
      // Restore by clearing deletedAt
      await db.update(customers)
        .set({ deletedAt: null, deletedBy: null, updatedAt: new Date() })
        .where(eq(customers.id, id));
    } catch (error) {
      console.error('Error restoring customer:', error);
      throw error;
    }
  }

  // ============================================
  // AUDIT LOG OPERATIONS
  // ============================================

  async createAuditLog(entry: InsertAuditLog): Promise<AuditLog> {
    try {
      const [created] = await db.insert(auditLog).values(entry).returning();
      return created;
    } catch (error) {
      console.error('Error creating audit log entry:', error);
      throw error;
    }
  }

  async getAuditLogsForEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    try {
      return await db.select().from(auditLog)
        .where(and(
          eq(auditLog.entityType, entityType),
          eq(auditLog.entityId, entityId)
        ))
        .orderBy(desc(auditLog.createdAt));
    } catch (error) {
      console.error('Error fetching audit logs for entity:', error);
      return [];
    }
  }

  async getAuditLogsByOrganization(organizationId: string, options?: { limit?: number; offset?: number }): Promise<AuditLog[]> {
    try {
      const limit = options?.limit ?? 100;
      const offset = options?.offset ?? 0;
      
      return await db.select().from(auditLog)
        .where(eq(auditLog.organizationId, organizationId))
        .orderBy(desc(auditLog.createdAt))
        .limit(limit)
        .offset(offset);
    } catch (error) {
      console.error('Error fetching audit logs by organization:', error);
      return [];
    }
  }

  async getRecentAuditLogs(options?: { limit?: number; entityTypes?: string[] }): Promise<AuditLog[]> {
    try {
      const limit = options?.limit ?? 50;
      
      if (options?.entityTypes && options.entityTypes.length > 0) {
        return await db.select().from(auditLog)
          .where(inArray(auditLog.entityType, options.entityTypes))
          .orderBy(desc(auditLog.createdAt))
          .limit(limit);
      }
      
      return await db.select().from(auditLog)
        .orderBy(desc(auditLog.createdAt))
        .limit(limit);
    } catch (error) {
      console.error('Error fetching recent audit logs:', error);
      return [];
    }
  }

  // Knowledge Base operations
  async getKnowledgeBase(id: string): Promise<KnowledgeBase | undefined> {
    try {
      const [article] = await db.select().from(knowledgeBase).where(eq(knowledgeBase.id, id));
      return article || undefined;
    } catch (error) {
      console.error('Error fetching knowledge base article:', error);
      return undefined;
    }
  }

  async getKnowledgeBaseArticles(ids: string[]): Promise<KnowledgeBase[]> {
    try {
      if (ids.length === 0) {
        // If no IDs provided, return all active knowledge base articles
        return await db.select().from(knowledgeBase).where(eq(knowledgeBase.isActive, true)).orderBy(desc(knowledgeBase.priority), desc(knowledgeBase.createdAt));
      }
      // Use inArray instead of ANY for proper array handling
      return await db.select().from(knowledgeBase).where(inArray(knowledgeBase.id, ids));
    } catch (error) {
      console.error('Error fetching knowledge base articles:', error);
      return [];
    }
  }

  async getAllKnowledgeBase(): Promise<KnowledgeBase[]> {
    try {
      return await db.select().from(knowledgeBase).orderBy(desc(knowledgeBase.priority), desc(knowledgeBase.createdAt));
    } catch (error) {
      console.error('Error fetching all knowledge base articles:', error);
      return [];
    }
  }

  async createKnowledgeBase(knowledge: InsertKnowledgeBase): Promise<KnowledgeBase> {
    try {
      const [result] = await db.insert(knowledgeBase).values(knowledge).returning();
      
      // Auto-reindex the newly created article for smart search
      try {
        const retrievalService = KnowledgeRetrievalService.getInstance();
        console.log(`Auto-reindexing new knowledge base article: ${result.title}`);
        // Trigger background reindexing for the new article
        setImmediate(() => {
          retrievalService.reindexArticle(result.id).catch(error => {
            console.error('Background reindexing failed for new article:', error);
          });
        });
      } catch (indexError) {
        console.error('Error during auto-reindexing after create:', indexError);
        // Don't throw - article creation should succeed even if indexing fails
      }
      
      return result;
    } catch (error) {
      console.error('Error creating knowledge base article:', error);
      throw error;
    }
  }

  async updateKnowledgeBase(id: string, updates: Partial<InsertKnowledgeBase>): Promise<void> {
    try {
      await db.update(knowledgeBase).set({ ...updates, updatedAt: new Date() }).where(eq(knowledgeBase.id, id));
      
      // Auto-reindex the updated article for smart search
      try {
        const retrievalService = KnowledgeRetrievalService.getInstance();
        console.log(`Auto-reindexing updated knowledge base article: ${id}`);
        // Trigger background reindexing for the updated article
        setImmediate(() => {
          retrievalService.reindexArticle(id).catch(error => {
            console.error('Background reindexing failed for updated article:', error);
          });
        });
      } catch (indexError) {
        console.error('Error during auto-reindexing after update:', indexError);
        // Don't throw - article update should succeed even if indexing fails
      }
    } catch (error) {
      console.error('Error updating knowledge base article:', error);
      throw error;
    }
  }

  async deleteKnowledgeBase(id: string): Promise<void> {
    try {
      await db.delete(knowledgeBase).where(eq(knowledgeBase.id, id));
      
      // Clear cache for the deleted article
      try {
        const retrievalService = KnowledgeRetrievalService.getInstance();
        retrievalService.clearCache(id);
        console.log(`Cleared search cache for deleted knowledge base article: ${id}`);
      } catch (indexError) {
        console.error('Error during cache clearing after delete:', indexError);
        // Don't throw - article deletion should succeed even if cache clearing fails
      }
    } catch (error) {
      console.error('Error deleting knowledge base article:', error);
      throw error;
    }
  }

  async updateKnowledgeBaseUsage(id: string): Promise<void> {
    try {
      await db.update(knowledgeBase).set({ 
        usageCount: sql`${knowledgeBase.usageCount} + 1`,
        lastUsedAt: new Date(),
        updatedAt: new Date()
      }).where(eq(knowledgeBase.id, id));
    } catch (error) {
      console.error('Error updating knowledge base usage:', error);
    }
  }

  // Knowledge Base Version operations
  async createKnowledgeBaseVersion(version: InsertKnowledgeBaseVersion): Promise<KnowledgeBaseVersion> {
    try {
      const [createdVersion] = await db.insert(knowledgeBaseVersions).values(version).returning();
      return createdVersion;
    } catch (error) {
      console.error('Error creating knowledge base version:', error);
      throw error;
    }
  }

  async getKnowledgeBaseVersions(knowledgeBaseId: string): Promise<KnowledgeBaseVersion[]> {
    try {
      return await db.select().from(knowledgeBaseVersions)
        .where(eq(knowledgeBaseVersions.knowledgeBaseId, knowledgeBaseId))
        .orderBy(desc(knowledgeBaseVersions.version));
    } catch (error) {
      console.error('Error fetching knowledge base versions:', error);
      return [];
    }
  }

  async getLatestVersionNumber(knowledgeBaseId: string): Promise<number> {
    try {
      const versions = await db.select().from(knowledgeBaseVersions)
        .where(eq(knowledgeBaseVersions.knowledgeBaseId, knowledgeBaseId))
        .orderBy(desc(knowledgeBaseVersions.version))
        .limit(1);
      
      return versions.length > 0 ? versions[0].version : 0;
    } catch (error) {
      console.error('Error fetching latest version number:', error);
      return 0;
    }
  }

  // Knowledge Base Image operations
  async getKnowledgeBaseImages(knowledgeBaseId: string): Promise<KnowledgeBaseImage[]> {
    try {
      return await db.select().from(knowledgeBaseImages)
        .where(eq(knowledgeBaseImages.knowledgeBaseId, knowledgeBaseId))
        .orderBy(knowledgeBaseImages.displayOrder, knowledgeBaseImages.createdAt);
    } catch (error) {
      console.error('Error fetching knowledge base images:', error);
      return [];
    }
  }

  async createKnowledgeBaseImage(image: InsertKnowledgeBaseImage): Promise<KnowledgeBaseImage> {
    try {
      const [createdImage] = await db.insert(knowledgeBaseImages).values(image).returning();
      return createdImage;
    } catch (error) {
      console.error('Error creating knowledge base image:', error);
      throw error;
    }
  }

  async deleteKnowledgeBaseImage(id: string): Promise<void> {
    try {
      await db.delete(knowledgeBaseImages).where(eq(knowledgeBaseImages.id, id));
    } catch (error) {
      console.error('Error deleting knowledge base image:', error);
      throw error;
    }
  }

  async updateKnowledgeBaseImageOrder(id: string, displayOrder: number): Promise<void> {
    try {
      await db.update(knowledgeBaseImages).set({ displayOrder }).where(eq(knowledgeBaseImages.id, id));
    } catch (error) {
      console.error('Error updating knowledge base image order:', error);
      throw error;
    }
  }

  async updateKnowledgeBaseEffectiveness(id: string, adjustment: number): Promise<void> {
    try {
      await db.update(knowledgeBase).set({ 
        effectiveness: sql`LEAST(GREATEST(${knowledgeBase.effectiveness} + ${adjustment}, 0), 100)`,
        updatedAt: new Date()
      }).where(eq(knowledgeBase.id, id));
    } catch (error) {
      console.error('Error updating knowledge base effectiveness:', error);
    }
  }

  // Knowledge Base Video operations
  async getKnowledgeBaseVideos(knowledgeBaseId: string): Promise<KnowledgeBaseVideo[]> {
    try {
      return await db.select().from(knowledgeBaseVideos)
        .where(eq(knowledgeBaseVideos.knowledgeBaseId, knowledgeBaseId))
        .orderBy(knowledgeBaseVideos.displayOrder, knowledgeBaseVideos.createdAt);
    } catch (error) {
      console.error('Error fetching knowledge base videos:', error);
      return [];
    }
  }

  async createKnowledgeBaseVideo(video: InsertKnowledgeBaseVideo): Promise<KnowledgeBaseVideo> {
    try {
      const [createdVideo] = await db.insert(knowledgeBaseVideos).values(video).returning();
      return createdVideo;
    } catch (error) {
      console.error('Error creating knowledge base video:', error);
      throw error;
    }
  }

  async deleteKnowledgeBaseVideo(id: string): Promise<void> {
    try {
      await db.delete(knowledgeBaseVideos).where(eq(knowledgeBaseVideos.id, id));
    } catch (error) {
      console.error('Error deleting knowledge base video:', error);
      throw error;
    }
  }

  async updateKnowledgeBaseVideoOrder(id: string, displayOrder: number): Promise<void> {
    try {
      await db.update(knowledgeBaseVideos).set({ displayOrder }).where(eq(knowledgeBaseVideos.id, id));
    } catch (error) {
      console.error('Error updating knowledge base video order:', error);
      throw error;
    }
  }

  // Knowledge Base FAQ operations
  async getKnowledgeBaseFaqs(knowledgeBaseId: string): Promise<KnowledgeBaseFaq[]> {
    try {
      return await db.select().from(knowledgeBaseFaqs)
        .where(eq(knowledgeBaseFaqs.knowledgeBaseId, knowledgeBaseId))
        .orderBy(knowledgeBaseFaqs.displayOrder, knowledgeBaseFaqs.createdAt);
    } catch (error) {
      console.error('Error fetching knowledge base FAQs:', error);
      return [];
    }
  }

  async createKnowledgeBaseFaq(faq: InsertKnowledgeBaseFaq): Promise<KnowledgeBaseFaq> {
    try {
      const [createdFaq] = await db.insert(knowledgeBaseFaqs).values(faq).returning();
      return createdFaq;
    } catch (error) {
      console.error('Error creating knowledge base FAQ:', error);
      throw error;
    }
  }

  async createKnowledgeBaseFaqsBatch(faqs: InsertKnowledgeBaseFaq[]): Promise<KnowledgeBaseFaq[]> {
    try {
      if (faqs.length === 0) return [];
      const createdFaqs = await db.insert(knowledgeBaseFaqs).values(faqs).returning();
      return createdFaqs;
    } catch (error) {
      console.error('Error creating knowledge base FAQs batch:', error);
      throw error;
    }
  }

  async deleteKnowledgeBaseFaq(id: string): Promise<void> {
    try {
      await db.delete(knowledgeBaseFaqs).where(eq(knowledgeBaseFaqs.id, id));
    } catch (error) {
      console.error('Error deleting knowledge base FAQ:', error);
      throw error;
    }
  }

  async updateKnowledgeBaseFaqOrder(id: string, displayOrder: number): Promise<void> {
    try {
      await db.update(knowledgeBaseFaqs).set({ displayOrder }).where(eq(knowledgeBaseFaqs.id, id));
    } catch (error) {
      console.error('Error updating knowledge base FAQ order:', error);
      throw error;
    }
  }

  async updateKnowledgeBaseFaqFeedback(id: string, helpful: boolean): Promise<void> {
    try {
      if (helpful) {
        await db.update(knowledgeBaseFaqs)
          .set({ helpful: sql`${knowledgeBaseFaqs.helpful} + 1` })
          .where(eq(knowledgeBaseFaqs.id, id));
      } else {
        await db.update(knowledgeBaseFaqs)
          .set({ notHelpful: sql`${knowledgeBaseFaqs.notHelpful} + 1` })
          .where(eq(knowledgeBaseFaqs.id, id));
      }
    } catch (error) {
      console.error('Error updating knowledge base FAQ feedback:', error);
      throw error;
    }
  }

  // Knowledge Chunk operations (for persistent vector embeddings)
  async getKnowledgeChunks(knowledgeBaseIds: string[]): Promise<KnowledgeChunk[]> {
    try {
      if (knowledgeBaseIds.length === 0) {
        return await db.select().from(knowledgeChunks);
      }
      return await db.select().from(knowledgeChunks)
        .where(inArray(knowledgeChunks.knowledgeBaseId, knowledgeBaseIds))
        .orderBy(knowledgeChunks.knowledgeBaseId, knowledgeChunks.chunkIndex);
    } catch (error) {
      console.error('Error fetching knowledge chunks:', error);
      return [];
    }
  }

  async getKnowledgeChunksByIds(chunkIds: string[]): Promise<KnowledgeChunk[]> {
    try {
      if (chunkIds.length === 0) return [];
      return await db.select().from(knowledgeChunks)
        .where(inArray(knowledgeChunks.id, chunkIds));
    } catch (error) {
      console.error('Error fetching knowledge chunks by IDs:', error);
      return [];
    }
  }

  async createKnowledgeChunk(chunk: InsertKnowledgeChunk): Promise<KnowledgeChunk> {
    try {
      const [createdChunk] = await db.insert(knowledgeChunks).values(chunk).returning();
      return createdChunk;
    } catch (error) {
      console.error('Error creating knowledge chunk:', error);
      throw error;
    }
  }

  async createKnowledgeChunksBatch(chunks: InsertKnowledgeChunk[]): Promise<KnowledgeChunk[]> {
    try {
      if (chunks.length === 0) return [];
      const createdChunks = await db.insert(knowledgeChunks)
        .values(chunks)
        .onConflictDoUpdate({
          target: knowledgeChunks.id,
          set: {
            content: sql`excluded.content`,
            title: sql`excluded.title`,
            category: sql`excluded.category`,
            tags: sql`excluded.tags`,
            priority: sql`excluded.priority`,
            wordCount: sql`excluded.word_count`,
            sourceTitle: sql`excluded.source_title`,
            sourceCategory: sql`excluded.source_category`,
            chunkTitle: sql`excluded.chunk_title`,
            hasStructure: sql`excluded.has_structure`,
            embedding: sql`excluded.embedding`,
          }
        })
        .returning();
      return createdChunks;
    } catch (error) {
      console.error('Error creating knowledge chunks batch:', error);
      throw error;
    }
  }

  async deleteKnowledgeChunksByArticle(knowledgeBaseId: string): Promise<void> {
    try {
      await db.delete(knowledgeChunks).where(eq(knowledgeChunks.knowledgeBaseId, knowledgeBaseId));
    } catch (error) {
      console.error('Error deleting knowledge chunks:', error);
      throw error;
    }
  }

  async searchKnowledgeChunksByVector(queryEmbedding: number[], limit: number = 10): Promise<Array<{ chunk: KnowledgeChunk; similarity: number }>> {
    try {
      const embeddingStr = JSON.stringify(queryEmbedding);
      
      const results = await db.execute(sql`
        SELECT 
          *,
          1 - (embedding <=> ${embeddingStr}::vector) as similarity
        FROM ${knowledgeChunks}
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> ${embeddingStr}::vector
        LIMIT ${limit}
      `);
      
      return results.rows.map((row: any) => ({
        chunk: {
          id: row.id,
          knowledgeBaseId: row.knowledge_base_id,
          title: row.title,
          content: row.content,
          chunkIndex: row.chunk_index,
          category: row.category,
          tags: row.tags || [],
          priority: row.priority,
          wordCount: row.word_count,
          sourceTitle: row.source_title,
          sourceCategory: row.source_category,
          chunkTitle: row.chunk_title,
          hasStructure: row.has_structure,
          embedding: row.embedding ? JSON.parse(row.embedding) : null,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        },
        similarity: row.similarity,
      }));
    } catch (error) {
      console.error('Error searching knowledge chunks by vector:', error);
      return [];
    }
  }

  // AI Agent Learning operations
  async getAiAgentLearning(id: string): Promise<AiAgentLearning | undefined> {
    try {
      const [learning] = await db.select().from(aiAgentLearning).where(eq(aiAgentLearning.id, id));
      return learning || undefined;
    } catch (error) {
      console.error('Error fetching AI agent learning:', error);
      return undefined;
    }
  }

  async getAiAgentLearningByConversation(conversationId: string): Promise<AiAgentLearning[]> {
    try {
      return await db.select().from(aiAgentLearning).where(eq(aiAgentLearning.conversationId, conversationId)).orderBy(desc(aiAgentLearning.createdAt));
    } catch (error) {
      console.error('Error fetching AI agent learning by conversation:', error);
      return [];
    }
  }

  async getAiAgentLearningByAgent(agentId: string): Promise<AiAgentLearning[]> {
    try {
      return await db.select().from(aiAgentLearning).where(eq(aiAgentLearning.agentId, agentId)).orderBy(desc(aiAgentLearning.createdAt));
    } catch (error) {
      console.error('Error fetching AI agent learning by agent:', error);
      return [];
    }
  }

  async createAiAgentLearning(learning: InsertAiAgentLearning): Promise<AiAgentLearning> {
    try {
      const [result] = await db.insert(aiAgentLearning).values(learning).returning();
      return result;
    } catch (error) {
      console.error('Error creating AI agent learning:', error);
      throw error;
    }
  }

  async updateAiAgentLearning(id: string, updates: Partial<InsertAiAgentLearning>): Promise<void> {
    try {
      await db.update(aiAgentLearning).set(updates).where(eq(aiAgentLearning.id, id));
    } catch (error) {
      console.error('Error updating AI agent learning:', error);
      throw error;
    }
  }

  // AI Message Feedback operations (thumbs up/down on individual messages)
  async createAiMessageFeedback(feedback: InsertAiMessageFeedback): Promise<AiMessageFeedback> {
    try {
      const [result] = await db.insert(aiMessageFeedback).values(feedback).returning();
      return result;
    } catch (error) {
      console.error('Error creating AI message feedback:', error);
      throw error;
    }
  }

  async getAiMessageFeedback(messageId: string): Promise<AiMessageFeedback | undefined> {
    try {
      const [feedback] = await db.select().from(aiMessageFeedback).where(eq(aiMessageFeedback.messageId, messageId));
      return feedback || undefined;
    } catch (error) {
      console.error('Error fetching AI message feedback:', error);
      return undefined;
    }
  }

  async getAiMessageFeedbackStats(): Promise<{ thumbsUp: number; thumbsDown: number; total: number }> {
    try {
      const results = await db.select({
        feedbackType: aiMessageFeedback.feedbackType,
        count: sql<number>`count(*)::int`
      })
      .from(aiMessageFeedback)
      .groupBy(aiMessageFeedback.feedbackType);

      const thumbsUp = results.find(r => r.feedbackType === 'thumbs_up')?.count || 0;
      const thumbsDown = results.find(r => r.feedbackType === 'thumbs_down')?.count || 0;
      return { thumbsUp, thumbsDown, total: thumbsUp + thumbsDown };
    } catch (error) {
      console.error('Error fetching AI message feedback stats:', error);
      return { thumbsUp: 0, thumbsDown: 0, total: 0 };
    }
  }

  // AI Corrections operations (human corrections to AI responses)
  async createAiCorrection(correction: InsertAiCorrection): Promise<AiCorrection> {
    try {
      const [result] = await db.insert(aiCorrections).values(correction).returning();
      
      // Auto-add to training queue for learning
      await this.addToTrainingQueue({
        sourceType: 'correction',
        sourceId: result.id,
        trainingData: JSON.stringify({
          query: correction.customerQuery,
          incorrectResponse: correction.originalAiResponse,
          correctResponse: correction.correctedResponse,
          correctionType: correction.correctionType,
          notes: correction.correctionNotes
        }),
        status: 'pending',
        priority: 70 // Corrections are high priority
      });
      
      return result;
    } catch (error) {
      console.error('Error creating AI correction:', error);
      throw error;
    }
  }

  async getAiCorrections(filters?: { status?: string; limit?: number }): Promise<AiCorrection[]> {
    try {
      let query = db.select().from(aiCorrections).$dynamic();
      
      if (filters?.status === 'pending') {
        query = query.where(eq(aiCorrections.appliedToKnowledge, false));
      }
      
      query = query.orderBy(desc(aiCorrections.createdAt));
      
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      
      return await query;
    } catch (error) {
      console.error('Error fetching AI corrections:', error);
      return [];
    }
  }

  async updateAiCorrection(id: string, updates: Partial<AiCorrection>): Promise<void> {
    try {
      await db.update(aiCorrections).set(updates).where(eq(aiCorrections.id, id));
    } catch (error) {
      console.error('Error updating AI correction:', error);
      throw error;
    }
  }

  async getPendingCorrectionsCount(): Promise<number> {
    try {
      const [result] = await db.select({ count: sql<number>`count(*)::int` })
        .from(aiCorrections)
        .where(eq(aiCorrections.appliedToKnowledge, false));
      return result?.count || 0;
    } catch (error) {
      console.error('Error getting pending corrections count:', error);
      return 0;
    }
  }

  // Knowledge Gaps operations (unanswered questions tracking)
  async createOrUpdateKnowledgeGap(query: string, confidence: number): Promise<KnowledgeGap> {
    try {
      const normalizedQuery = query.toLowerCase().trim().replace(/[^\w\s]/g, '');
      
      // Check for existing similar gap
      const existing = await db.select().from(knowledgeGaps)
        .where(eq(knowledgeGaps.queryNormalized, normalizedQuery))
        .limit(1);
      
      if (existing.length > 0) {
        // Update existing gap
        const updated = await db.update(knowledgeGaps)
          .set({
            occurrenceCount: sql`${knowledgeGaps.occurrenceCount} + 1`,
            avgConfidence: sql`(${knowledgeGaps.avgConfidence} * ${knowledgeGaps.occurrenceCount} + ${confidence}) / (${knowledgeGaps.occurrenceCount} + 1)`,
            lastAskedAt: new Date(),
            priority: existing[0].occurrenceCount >= 5 ? 'high' : existing[0].occurrenceCount >= 3 ? 'medium' : 'low',
            updatedAt: new Date()
          })
          .where(eq(knowledgeGaps.id, existing[0].id))
          .returning();
        return updated[0];
      }
      
      // Create new gap
      const [result] = await db.insert(knowledgeGaps).values({
        customerQuery: query,
        queryNormalized: normalizedQuery,
        occurrenceCount: 1,
        avgConfidence: confidence,
        status: 'open',
        priority: 'low'
      }).returning();
      
      return result;
    } catch (error) {
      console.error('Error creating/updating knowledge gap:', error);
      throw error;
    }
  }

  async getKnowledgeGaps(filters?: { status?: string; priority?: string; limit?: number }): Promise<KnowledgeGap[]> {
    try {
      let query = db.select().from(knowledgeGaps).$dynamic();
      
      const conditions: any[] = [];
      if (filters?.status) {
        conditions.push(eq(knowledgeGaps.status, filters.status));
      }
      if (filters?.priority) {
        conditions.push(eq(knowledgeGaps.priority, filters.priority));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      query = query.orderBy(desc(knowledgeGaps.occurrenceCount), desc(knowledgeGaps.lastAskedAt));
      
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      
      return await query;
    } catch (error) {
      console.error('Error fetching knowledge gaps:', error);
      return [];
    }
  }

  async updateKnowledgeGap(id: string, updates: Partial<KnowledgeGap>): Promise<void> {
    try {
      await db.update(knowledgeGaps).set({ ...updates, updatedAt: new Date() }).where(eq(knowledgeGaps.id, id));
    } catch (error) {
      console.error('Error updating knowledge gap:', error);
      throw error;
    }
  }

  async getKnowledgeGapStats(): Promise<{ open: number; inProgress: number; resolved: number }> {
    try {
      const results = await db.select({
        status: knowledgeGaps.status,
        count: sql<number>`count(*)::int`
      })
      .from(knowledgeGaps)
      .groupBy(knowledgeGaps.status);

      return {
        open: results.find(r => r.status === 'open')?.count || 0,
        inProgress: results.find(r => r.status === 'in_progress')?.count || 0,
        resolved: results.find(r => r.status === 'resolved')?.count || 0
      };
    } catch (error) {
      console.error('Error fetching knowledge gap stats:', error);
      return { open: 0, inProgress: 0, resolved: 0 };
    }
  }

  // AI Training Queue operations
  async addToTrainingQueue(item: InsertAiTrainingQueue): Promise<AiTrainingQueue> {
    try {
      const [result] = await db.insert(aiTrainingQueue).values(item).returning();
      return result;
    } catch (error) {
      console.error('Error adding to training queue:', error);
      throw error;
    }
  }

  async getTrainingQueueItems(status?: string): Promise<AiTrainingQueue[]> {
    try {
      let query = db.select().from(aiTrainingQueue).$dynamic();
      
      if (status) {
        query = query.where(eq(aiTrainingQueue.status, status));
      }
      
      return await query.orderBy(desc(aiTrainingQueue.priority), desc(aiTrainingQueue.createdAt));
    } catch (error) {
      console.error('Error fetching training queue items:', error);
      return [];
    }
  }

  async updateTrainingQueueItem(id: string, updates: Partial<AiTrainingQueue>): Promise<void> {
    try {
      await db.update(aiTrainingQueue).set(updates).where(eq(aiTrainingQueue.id, id));
    } catch (error) {
      console.error('Error updating training queue item:', error);
      throw error;
    }
  }

  // AI Training & Correction operations
  async getAiLearningEntries(filters: { agentId?: string; limit?: number; offset?: number }): Promise<any[]> {
    try {
      let query = db
        .select({
          id: aiAgentLearning.id,
          agentId: aiAgentLearning.agentId,
          agentName: aiAgents.name,
          conversationId: aiAgentLearning.conversationId,
          customerQuery: aiAgentLearning.customerQuery,
          aiResponse: aiAgentLearning.aiResponse,
          confidence: aiAgentLearning.confidence,
          humanTookOver: aiAgentLearning.humanTookOver,
          customerSatisfaction: aiAgentLearning.customerSatisfaction,
          knowledgeUsed: aiAgentLearning.knowledgeUsed,
          improvementSuggestion: aiAgentLearning.improvementSuggestion,
          wasHelpful: aiAgentLearning.wasHelpful,
          createdAt: aiAgentLearning.createdAt,
        })
        .from(aiAgentLearning)
        .leftJoin(aiAgents, eq(aiAgentLearning.agentId, aiAgents.id))
        .$dynamic();

      // Apply agent filter if specified
      if (filters.agentId) {
        query = query.where(eq(aiAgentLearning.agentId, filters.agentId));
      }

      // Apply ordering
      query = query.orderBy(desc(aiAgentLearning.createdAt));

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.offset(filters.offset);
      }

      const results = await query;
      return results;
    } catch (error) {
      console.error('Error fetching AI learning entries:', error);
      return [];
    }
  }

  async getAiLearningEntriesFiltered(filters: { agentId?: string; intentCategory?: string }, startDate: Date): Promise<any[]> {
    try {
      let query = db
        .select()
        .from(aiAgentLearning)
        .$dynamic();

      // Build where conditions
      const whereConditions: any[] = [];

      // Filter by agentId if provided
      if (filters.agentId) {
        whereConditions.push(eq(aiAgentLearning.agentId, filters.agentId));
      }

      // Filter by intentCategory if provided
      if (filters.intentCategory) {
        whereConditions.push(eq(aiAgentLearning.intentCategory, filters.intentCategory));
      }

      // Filter by createdAt >= startDate
      whereConditions.push(gte(aiAgentLearning.createdAt, startDate));

      // Apply where conditions
      if (whereConditions.length > 0) {
        const whereClause = whereConditions.length === 1 ? whereConditions[0] : and(...whereConditions);
        query = query.where(whereClause);
      }

      // Order by createdAt DESC
      query = query.orderBy(desc(aiAgentLearning.createdAt));

      const results = await query;
      return results;
    } catch (error) {
      console.error('Error fetching filtered AI learning entries:', error);
      return [];
    }
  }

  async updateAiLearningFeedback(id: string, feedback: { wasHelpful?: boolean; improvementSuggestion?: string | null; customerSatisfaction?: number | null }): Promise<void> {
    try {
      await db.update(aiAgentLearning).set(feedback).where(eq(aiAgentLearning.id, id));
    } catch (error) {
      console.error('Error updating AI learning feedback:', error);
      throw error;
    }
  }

  async createAiResponseCorrection(correction: { learningEntryId: string; improvedResponse: string; reasoning: string; knowledgeToAdd?: string | null; submittedBy: string }): Promise<void> {
    try {
      // For now, we'll store corrections in the improvementSuggestion field
      // In a full implementation, you might want a separate corrections table
      const correctionText = `CORRECTION: ${correction.reasoning}\n\nImproved Response: ${correction.improvedResponse}${correction.knowledgeToAdd ? `\n\nSuggested Knowledge: ${correction.knowledgeToAdd}` : ''}`;
      
      await db.update(aiAgentLearning)
        .set({ 
          improvementSuggestion: correctionText,
          wasHelpful: false // Mark as not helpful since it needed correction
        })
        .where(eq(aiAgentLearning.id, correction.learningEntryId));
      
      // Log the correction activity for audit trail
      console.log(`AI response correction submitted by ${correction.submittedBy} for learning entry ${correction.learningEntryId}`);
    } catch (error) {
      console.error('Error creating AI response correction:', error);
      throw error;
    }
  }

  // Get active AI conversations with full details for staff takeover dashboard
  async getActiveAiConversations(): Promise<any[]> {
    try {
      return await db
        .select({
          sessionId: aiAgentSessions.id,
          conversationId: aiAgentSessions.conversationId,
          agentId: aiAgentSessions.agentId,
          status: aiAgentSessions.status,
          messageCount: aiAgentSessions.messageCount,
          avgConfidence: aiAgentSessions.avgConfidence,
          startedAt: aiAgentSessions.startedAt,
          conversation: {
            id: conversations.id,
            title: conversations.title,
            status: conversations.status,
            priority: conversations.priority,
            isAnonymous: conversations.isAnonymous,
            updatedAt: conversations.updatedAt,
          },
          customer: {
            id: customers.id,
            name: customers.name,
            email: customers.email,
            company: customers.company,
          },
          aiAgent: {
            id: aiAgents.id,
            name: aiAgents.name,
            autoTakeoverThreshold: aiAgents.autoTakeoverThreshold,
          }
        })
        .from(aiAgentSessions)
        .leftJoin(conversations, eq(aiAgentSessions.conversationId, conversations.id))
        .leftJoin(customers, eq(conversations.customerId, customers.id))
        .leftJoin(aiAgents, eq(aiAgentSessions.agentId, aiAgents.id))
        .where(eq(aiAgentSessions.status, 'active'))
        .orderBy(desc(aiAgentSessions.startedAt));
    } catch (error) {
      console.error('Error fetching active AI conversations:', error);
      return [];
    }
  }

  // AI Agent Session operations
  async getAiAgentSession(id: string): Promise<AiAgentSession | undefined> {
    try {
      const [session] = await db.select().from(aiAgentSessions).where(eq(aiAgentSessions.id, id));
      return session || undefined;
    } catch (error) {
      console.error('Error fetching AI agent session:', error);
      return undefined;
    }
  }

  async getAiAgentSessionByConversation(conversationId: string): Promise<AiAgentSession | undefined> {
    try {
      const [session] = await db.select().from(aiAgentSessions).where(eq(aiAgentSessions.conversationId, conversationId));
      return session || undefined;
    } catch (error) {
      console.error('Error fetching AI agent session by conversation:', error);
      return undefined;
    }
  }

  async getAiAgentSessionsByAgent(agentId: string): Promise<AiAgentSession[]> {
    try {
      return await db.select().from(aiAgentSessions).where(eq(aiAgentSessions.agentId, agentId)).orderBy(desc(aiAgentSessions.startedAt));
    } catch (error) {
      console.error('Error fetching AI agent sessions by agent:', error);
      return [];
    }
  }

  async createAiAgentSession(session: InsertAiAgentSession): Promise<AiAgentSession> {
    try {
      const [result] = await db.insert(aiAgentSessions).values(session).returning();
      return result;
    } catch (error) {
      console.error('Error creating AI agent session:', error);
      throw error;
    }
  }

  async updateAiAgentSession(id: string, updates: Partial<InsertAiAgentSession>): Promise<void> {
    try {
      await db.update(aiAgentSessions).set(updates).where(eq(aiAgentSessions.id, id));
    } catch (error) {
      console.error('Error updating AI agent session:', error);
      throw error;
    }
  }

  // Additional conversation operations
  async updateConversation(id: string, updates: Partial<InsertConversation>): Promise<void> {
    try {
      await db.update(conversations).set({ ...updates, updatedAt: new Date() }).where(eq(conversations.id, id));
    } catch (error) {
      console.error('Error updating conversation:', error);
      throw error;
    }
  }

  async toggleAiAssistance(conversationId: string, enabled: boolean): Promise<void> {
    try {
      await db.update(conversations)
        .set({ aiAssistanceEnabled: enabled, updatedAt: new Date() })
        .where(eq(conversations.id, conversationId));
    } catch (error) {
      console.error('Error toggling AI assistance:', error);
      throw error;
    }
  }

  async setConversationContextData(conversationId: string, contextData: Record<string, any>): Promise<void> {
    try {
      await db.update(conversations)
        .set({ contextData: JSON.stringify(contextData), updatedAt: new Date() })
        .where(eq(conversations.id, conversationId));
    } catch (error) {
      console.error('Error setting conversation context data:', error);
      throw error;
    }
  }

  // Analytics methods
  async getAgentAnalytics(dateFrom?: Date, dateTo?: Date): Promise<any> {
    const dateFilter = dateFrom && dateTo 
      ? sql`AND ${aiAgentLearning.createdAt} BETWEEN ${dateFrom} AND ${dateTo}`
      : sql``;

    // Get overall AI agent performance metrics
    const [overallStats] = await db.select({
      totalInteractions: sql<number>`count(*)`,
      avgConfidence: sql<number>`avg(${aiAgentLearning.confidence})`,
      avgSatisfaction: sql<number>`avg(${aiAgentLearning.customerSatisfaction})`,
      handoverRate: sql<number>`avg(case when ${aiAgentLearning.humanTookOver} then 1.0 else 0.0 end) * 100`,
      helpfulRate: sql<number>`avg(case when ${aiAgentLearning.wasHelpful} then 1.0 else 0.0 end) * 100`,
    }).from(aiAgentLearning).where(sql`1=1 ${dateFilter}`);

    // Get per-agent performance
    const agentPerformance = await db.select({
      agentId: aiAgentLearning.agentId,
      agentName: aiAgents.name,
      interactions: sql<number>`count(*)`,
      avgConfidence: sql<number>`avg(${aiAgentLearning.confidence})`,
      avgSatisfaction: sql<number>`avg(${aiAgentLearning.customerSatisfaction})`,
      handoverRate: sql<number>`avg(case when ${aiAgentLearning.humanTookOver} then 1.0 else 0.0 end) * 100`,
      helpfulRate: sql<number>`avg(case when ${aiAgentLearning.wasHelpful} then 1.0 else 0.0 end) * 100`,
    })
    .from(aiAgentLearning)
    .leftJoin(aiAgents, eq(aiAgentLearning.agentId, aiAgents.id))
    .where(sql`1=1 ${dateFilter}`)
    .groupBy(aiAgentLearning.agentId, aiAgents.name);

    // Get knowledge base effectiveness
    const knowledgeStats = await db.select({
      totalArticles: sql<number>`count(*)`,
      avgEffectiveness: sql<number>`avg(${knowledgeBase.effectiveness})`,
      totalUsage: sql<number>`sum(${knowledgeBase.usageCount})`,
      activeArticles: sql<number>`sum(case when ${knowledgeBase.isActive} then 1 else 0 end)`,
    }).from(knowledgeBase);

    // Get handover reasons frequency
    const handoverReasons = await db.select({
      reason: aiAgentSessions.handoverReason,
      count: sql<number>`count(*)`,
    })
    .from(aiAgentSessions)
    .where(sql`${aiAgentSessions.handoverReason} IS NOT NULL ${dateFilter ? sql`AND ${aiAgentSessions.startedAt} BETWEEN ${dateFrom} AND ${dateTo}` : sql``}`)
    .groupBy(aiAgentSessions.handoverReason);

    // Get trends over time (daily aggregates)
    const trendData = await db.select({
      date: sql<string>`date(${aiAgentLearning.createdAt})`,
      interactions: sql<number>`count(*)`,
      avgConfidence: sql<number>`avg(${aiAgentLearning.confidence})`,
      handovers: sql<number>`sum(case when ${aiAgentLearning.humanTookOver} then 1 else 0 end)`,
    })
    .from(aiAgentLearning)
    .where(sql`1=1 ${dateFilter}`)
    .groupBy(sql`date(${aiAgentLearning.createdAt})`)
    .orderBy(sql`date(${aiAgentLearning.createdAt})`);

    return {
      overall: overallStats,
      agentPerformance,
      knowledge: knowledgeStats[0] || {},
      handoverReasons,
      trends: trendData,
    };
  }

  async getTopKnowledgeArticles(limit: number = 10): Promise<any[]> {
    return await db.select({
      id: knowledgeBase.id,
      title: knowledgeBase.title,
      category: knowledgeBase.category,
      usageCount: knowledgeBase.usageCount,
      effectiveness: knowledgeBase.effectiveness,
      lastUsedAt: knowledgeBase.lastUsedAt,
    })
    .from(knowledgeBase)
    .where(eq(knowledgeBase.isActive, true))
    .orderBy(desc(knowledgeBase.usageCount))
    .limit(limit);
  }

  async getAgentWorkloadMetrics(): Promise<any[]> {
    return await db.select({
      agentId: agentWorkload.agentId,
      agentName: users.name,
      activeConversations: agentWorkload.activeConversations,
      maxCapacity: agentWorkload.maxCapacity,
      utilizationRate: sql<number>`(${agentWorkload.activeConversations}::float / ${agentWorkload.maxCapacity}::float) * 100`,
    })
    .from(agentWorkload)
    .leftJoin(users, eq(agentWorkload.agentId, users.id))
    .orderBy(desc(sql`(${agentWorkload.activeConversations}::float / ${agentWorkload.maxCapacity}::float)`));
  }

  // File Management operations
  async getUploadedFile(id: string): Promise<UploadedFile | undefined> {
    const [file] = await db.select().from(uploadedFiles).where(eq(uploadedFiles.id, id));
    return file || undefined;
  }

  async getUploadedFileByHash(sha256Hash: string): Promise<UploadedFile | undefined> {
    const [file] = await db.select().from(uploadedFiles).where(eq(uploadedFiles.sha256Hash, sha256Hash));
    return file || undefined;
  }

  async getAllUploadedFiles(options?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
    tags?: string[];
    sortBy?: 'createdAt' | 'originalName' | 'size';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ files: UploadedFile[]; total: number; page: number; totalPages: number }> {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      status,
      tags,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options || {};

    let query = db.select().from(uploadedFiles).$dynamic();
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(uploadedFiles).$dynamic();

    // Apply filters
    const whereConditions: any[] = [];
    
    if (search) {
      const searchLower = `%${search.toLowerCase()}%`;
      whereConditions.push(
        or(
          sql`lower(${uploadedFiles.originalName}) like ${searchLower}`,
          sql`lower(${uploadedFiles.category}) like ${searchLower}`
        )
      );
    }

    if (category && category !== 'all') {
      whereConditions.push(eq(uploadedFiles.category, category));
    }

    if (status && status !== 'all') {
      whereConditions.push(eq(uploadedFiles.status, status));
    }

    if (tags && tags.length > 0) {
      whereConditions.push(
        sql`${uploadedFiles.tags} && ${tags}`
      );
    }

    if (whereConditions.length > 0) {
      const whereClause = whereConditions.length === 1 ? whereConditions[0] : and(...whereConditions);
      query = query.where(whereClause);
      countQuery = countQuery.where(whereClause);
    }

    // Apply sorting
    const sortColumn = sortBy === 'createdAt' ? uploadedFiles.createdAt
                      : sortBy === 'originalName' ? uploadedFiles.originalName 
                      : uploadedFiles.size;
    
    query = query.orderBy(sortOrder === 'desc' ? desc(sortColumn) : sortColumn);

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);

    // Execute queries
    const [fileResults, countResult] = await Promise.all([
      query,
      countQuery
    ]);

    const total = countResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      files: fileResults,
      total,
      page,
      totalPages
    };
  }

  async createUploadedFile(file: InsertUploadedFile): Promise<UploadedFile> {
    const [uploadedFile] = await db
      .insert(uploadedFiles)
      .values({
        ...file,
        updatedAt: new Date(),
      })
      .returning();
    return uploadedFile;
  }

  async updateUploadedFile(id: string, updates: Partial<InsertUploadedFile>): Promise<void> {
    await db
      .update(uploadedFiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(uploadedFiles.id, id));
  }

  async deleteUploadedFile(id: string): Promise<void> {
    // Delete related records first
    await db.delete(knowledgeBaseFiles).where(eq(knowledgeBaseFiles.fileId, id));
    await db.delete(aiAgentFileUsage).where(eq(aiAgentFileUsage.fileId, id));
    // Then delete the file record
    await db.delete(uploadedFiles).where(eq(uploadedFiles.id, id));
  }

  // Knowledge Base File links
  async linkFileToKnowledgeBase(fileId: string, knowledgeBaseId: string): Promise<KnowledgeBaseFile> {
    const [link] = await db
      .insert(knowledgeBaseFiles)
      .values({ fileId, knowledgeBaseId })
      .returning();
    return link;
  }

  async unlinkFileFromKnowledgeBase(fileId: string, knowledgeBaseId: string): Promise<void> {
    await db
      .delete(knowledgeBaseFiles)
      .where(and(
        eq(knowledgeBaseFiles.fileId, fileId),
        eq(knowledgeBaseFiles.knowledgeBaseId, knowledgeBaseId)
      ));
  }

  async getFilesLinkedToKnowledgeBase(knowledgeBaseId: string): Promise<UploadedFile[]> {
    return await db
      .select({
        id: uploadedFiles.id,
        originalName: uploadedFiles.originalName,
        storedName: uploadedFiles.storedName,
        mimeType: uploadedFiles.mimeType,
        size: uploadedFiles.size,
        sha256Hash: uploadedFiles.sha256Hash,
        filePath: uploadedFiles.filePath,
        category: uploadedFiles.category,
        tags: uploadedFiles.tags,
        status: uploadedFiles.status,
        errorMessage: uploadedFiles.errorMessage,
        duplicateOfId: uploadedFiles.duplicateOfId,
        processedAt: uploadedFiles.processedAt,
        createdBy: uploadedFiles.createdBy,
        createdAt: uploadedFiles.createdAt,
        updatedAt: uploadedFiles.updatedAt,
      })
      .from(uploadedFiles)
      .innerJoin(knowledgeBaseFiles, eq(uploadedFiles.id, knowledgeBaseFiles.fileId))
      .where(eq(knowledgeBaseFiles.knowledgeBaseId, knowledgeBaseId));
  }

  async getKnowledgeBaseLinkedToFile(fileId: string): Promise<KnowledgeBase[]> {
    return await db
      .select({
        id: knowledgeBase.id,
        title: knowledgeBase.title,
        content: knowledgeBase.content,
        category: knowledgeBase.category,
        tags: knowledgeBase.tags,
        isActive: knowledgeBase.isActive,
        priority: knowledgeBase.priority,
        usageCount: knowledgeBase.usageCount,
        effectiveness: knowledgeBase.effectiveness,
        sourceType: knowledgeBase.sourceType,
        fileName: knowledgeBase.fileName,
        fileType: knowledgeBase.fileType,
        fileSize: knowledgeBase.fileSize,
        filePath: knowledgeBase.filePath,
        sourceUrl: knowledgeBase.sourceUrl,
        urlTitle: knowledgeBase.urlTitle,
        urlDescription: knowledgeBase.urlDescription,
        assignedAgentIds: knowledgeBase.assignedAgentIds,
        createdBy: knowledgeBase.createdBy,
        lastUsedAt: knowledgeBase.lastUsedAt,
        createdAt: knowledgeBase.createdAt,
        updatedAt: knowledgeBase.updatedAt,
      })
      .from(knowledgeBase)
      .innerJoin(knowledgeBaseFiles, eq(knowledgeBase.id, knowledgeBaseFiles.knowledgeBaseId))
      .where(eq(knowledgeBaseFiles.fileId, fileId));
  }

  // AI Agent File Usage tracking
  async incrementFileUsage(fileId: string, agentId: string): Promise<void> {
    // Try to update existing usage record
    const existing = await db
      .select()
      .from(aiAgentFileUsage)
      .where(and(
        eq(aiAgentFileUsage.fileId, fileId),
        eq(aiAgentFileUsage.agentId, agentId)
      ));

    if (existing.length > 0) {
      await db
        .update(aiAgentFileUsage)
        .set({
          usageCount: sql`${aiAgentFileUsage.usageCount} + 1`,
          lastUsedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(aiAgentFileUsage.fileId, fileId),
          eq(aiAgentFileUsage.agentId, agentId)
        ));
    } else {
      await db
        .insert(aiAgentFileUsage)
        .values({
          fileId,
          agentId,
          usageCount: 1,
          lastUsedAt: new Date(),
        });
    }
  }

  async getFileUsageByAgent(agentId: string): Promise<AiAgentFileUsage[]> {
    return await db
      .select()
      .from(aiAgentFileUsage)
      .where(eq(aiAgentFileUsage.agentId, agentId))
      .orderBy(desc(aiAgentFileUsage.lastUsedAt));
  }

  async getFileUsageByFile(fileId: string): Promise<AiAgentFileUsage[]> {
    return await db
      .select()
      .from(aiAgentFileUsage)
      .where(eq(aiAgentFileUsage.fileId, fileId))
      .orderBy(desc(aiAgentFileUsage.usageCount));
  }

  async getFileUsageStats(fileId: string): Promise<{ totalUsage: number; agentUsage: Array<{ agent: AiAgent; usage: AiAgentFileUsage }> }> {
    const usageRecords = await db
      .select({
        usage: aiAgentFileUsage,
        agent: aiAgents,
      })
      .from(aiAgentFileUsage)
      .innerJoin(aiAgents, eq(aiAgentFileUsage.agentId, aiAgents.id))
      .where(eq(aiAgentFileUsage.fileId, fileId))
      .orderBy(desc(aiAgentFileUsage.usageCount));

    const totalUsage = usageRecords.reduce((sum, record) => sum + record.usage.usageCount, 0);

    return {
      totalUsage,
      agentUsage: usageRecords.map(record => ({
        agent: record.agent,
        usage: record.usage,
      })),
    };
  }

  // File Analytics methods
  async getTopUsedFiles(limit: number, agentId?: string): Promise<Array<{ file: UploadedFile; totalUsage: number; lastUsed?: Date }>> {
    const baseQuery = db
      .select({
        file: uploadedFiles,
        totalUsage: sql<number>`COALESCE(SUM(${aiAgentFileUsage.usageCount}), 0)`,
        lastUsed: sql<Date | null>`MAX(${aiAgentFileUsage.lastUsedAt})`,
      })
      .from(uploadedFiles)
      .leftJoin(aiAgentFileUsage, eq(uploadedFiles.id, aiAgentFileUsage.fileId))
      .groupBy(uploadedFiles.id);
    
    // Apply agent filter if specified
    const query = agentId 
      ? baseQuery.where(eq(aiAgentFileUsage.agentId, agentId))
      : baseQuery;
    
    const results = await query
      .orderBy(sql`SUM(${aiAgentFileUsage.usageCount}) DESC NULLS LAST`)
      .limit(limit);

    return results.map(result => ({
      file: result.file,
      totalUsage: Number(result.totalUsage),
      lastUsed: result.lastUsed || undefined,
    }));
  }

  async getFileEffectivenessMetrics(limit: number): Promise<Array<{ file: UploadedFile; usageCount: number; effectivenessScore: number }>> {
    // Calculate effectiveness based on usage patterns and knowledge base integration
    const results = await db
      .select({
        file: uploadedFiles,
        usageCount: sql<number>`COALESCE(SUM(${aiAgentFileUsage.usageCount}), 0)`,
        knowledgeBaseCount: sql<number>`COUNT(DISTINCT ${knowledgeBaseFiles.knowledgeBaseId})`,
      })
      .from(uploadedFiles)
      .leftJoin(aiAgentFileUsage, eq(uploadedFiles.id, aiAgentFileUsage.fileId))
      .leftJoin(knowledgeBaseFiles, eq(uploadedFiles.id, knowledgeBaseFiles.fileId))
      .where(eq(uploadedFiles.status, 'processed'))
      .groupBy(uploadedFiles.id)
      .orderBy(sql`SUM(${aiAgentFileUsage.usageCount}) DESC NULLS LAST`)
      .limit(limit);

    return results.map(result => {
      const usageCount = Number(result.usageCount);
      const knowledgeBaseCount = Number(result.knowledgeBaseCount);
      
      // Calculate effectiveness score (0-100) based on usage and knowledge base integration
      const baseScore = Math.min(usageCount * 10, 70); // Usage contributes up to 70 points
      const integrationBonus = knowledgeBaseCount > 0 ? 30 : 0; // KB integration adds 30 points
      const effectivenessScore = Math.min(baseScore + integrationBonus, 100);
      
      return {
        file: result.file,
        usageCount,
        effectivenessScore,
      };
    });
  }

  async getAgentFileUsageSummary(): Promise<Array<{ agentId: string; agentName: string; fileCount: number; totalUsage: number }>> {
    const results = await db
      .select({
        agentId: aiAgents.id,
        agentName: aiAgents.name,
        fileCount: sql<number>`COUNT(DISTINCT ${aiAgentFileUsage.fileId})`,
        totalUsage: sql<number>`COALESCE(SUM(${aiAgentFileUsage.usageCount}), 0)`,
      })
      .from(aiAgents)
      .leftJoin(aiAgentFileUsage, eq(aiAgents.id, aiAgentFileUsage.agentId))
      .groupBy(aiAgents.id, aiAgents.name)
      .orderBy(sql`SUM(${aiAgentFileUsage.usageCount}) DESC NULLS LAST`);

    return results.map(result => ({
      agentId: result.agentId,
      agentName: result.agentName,
      fileCount: Number(result.fileCount),
      totalUsage: Number(result.totalUsage),
    }));
  }

  // ========================================
  // FEED MODULE IMPLEMENTATIONS
  // ========================================

  async createPost(insertPost: InsertPost): Promise<Post> {
    const [post] = await db
      .insert(posts)
      .values({
        ...insertPost,
        updatedAt: new Date(),
      })
      .returning();
    return post;
  }

  async getPost(id: string): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post || undefined;
  }

  async getPosts(options?: { 
    visibility?: string; 
    userId?: string; 
    userType?: 'staff' | 'customer';
    search?: string;
    tags?: string[];
    page?: number;
    limit?: number;
  }): Promise<{ posts: Post[]; total: number; page: number; totalPages: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const offset = (page - 1) * limit;

    let query = db.select().from(posts).$dynamic();
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(posts).$dynamic();

    const conditions: any[] = [];

    // Apply visibility filters
    if (options?.visibility === 'internal') {
      conditions.push(eq(posts.visibility, 'internal'));
    } else if (options?.visibility === 'all_customers') {
      conditions.push(eq(posts.visibility, 'all_customers'));
    } else if (options?.visibility === 'targeted' && options?.userId) {
      conditions.push(
        and(
          eq(posts.visibility, 'targeted'),
          sql`${options.userId} = ANY(${posts.targetedUserIds})`
        )
      );
    } else if (options?.userId && options?.userType) {
      // Show posts based on user type and visibility
      if (options.userType === 'staff') {
        // Staff can see internal posts and targeted posts for them
        conditions.push(
          or(
            eq(posts.visibility, 'internal'),
            and(
              eq(posts.visibility, 'targeted'),
              sql`${options.userId} = ANY(${posts.targetedUserIds})`
            )
          )
        );
      } else {
        // Customers can see all_customers posts and targeted posts for them
        conditions.push(
          or(
            eq(posts.visibility, 'all_customers'),
            and(
              eq(posts.visibility, 'targeted'),
              sql`${options.userId} = ANY(${posts.targetedUserIds})`
            )
          )
        );
      }
    }

    // Apply search filter
    if (options?.search) {
      conditions.push(sql`${posts.content} ILIKE ${'%' + options.search + '%'}`);
    }

    // Apply tag filter
    if (options?.tags && options.tags.length > 0) {
      conditions.push(sql`${posts.tags} && ARRAY[${sql.join(options.tags.map(tag => sql`${tag}`), sql`, `)}]::text[]`);
    }

    // Combine all conditions
    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    if (whereCondition) {
      query = query.where(whereCondition);
      countQuery = countQuery.where(whereCondition);
    }

    const [{ count }] = await countQuery;
    const total = Number(count);
    const totalPages = Math.ceil(total / limit);

    const postResults = await query
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      posts: postResults,
      total,
      page,
      totalPages,
    };
  }

  async updatePost(id: string, updates: Partial<InsertPost>): Promise<void> {
    await db
      .update(posts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(posts.id, id));
  }

  async deletePost(id: string): Promise<void> {
    await db.delete(posts).where(eq(posts.id, id));
  }

  async createPostComment(insertComment: InsertPostComment): Promise<PostComment> {
    const [comment] = await db
      .insert(postComments)
      .values({
        ...insertComment,
        updatedAt: new Date(),
      })
      .returning();
    return comment;
  }

  async getPostComments(postId: string): Promise<PostComment[]> {
    return await db
      .select()
      .from(postComments)
      .where(eq(postComments.postId, postId))
      .orderBy(desc(postComments.createdAt));
  }

  async deletePostComment(id: string): Promise<void> {
    await db.delete(postComments).where(eq(postComments.id, id));
  }

  async likePost(postId: string, userId: string, userType: 'staff' | 'customer'): Promise<PostLike> {
    const [like] = await db
      .insert(postLikes)
      .values({
        postId,
        userId,
        userType,
      })
      .returning();
    return like;
  }

  async unlikePost(postId: string, userId: string): Promise<void> {
    await db
      .delete(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));
  }

  async getPostLikes(postId: string): Promise<PostLike[]> {
    return await db
      .select()
      .from(postLikes)
      .where(eq(postLikes.postId, postId))
      .orderBy(desc(postLikes.createdAt));
  }

  async hasUserLikedPost(postId: string, userId: string): Promise<boolean> {
    const [like] = await db
      .select()
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));
    return !!like;
  }

  async recordPostView(postId: string, userId: string, userType: 'staff' | 'customer'): Promise<PostView> {
    const [view] = await db
      .insert(postViews)
      .values({
        postId,
        userId,
        userType,
      })
      .returning();
    return view;
  }

  async getPostViews(postId: string): Promise<PostView[]> {
    return await db
      .select()
      .from(postViews)
      .where(eq(postViews.postId, postId))
      .orderBy(desc(postViews.viewedAt));
  }

  async getPostStats(postId: string): Promise<{ views: number; likes: number; comments: number }> {
    const [viewCount] = await db
      .select({ count: sql<number>`count(DISTINCT ${postViews.userId})` })
      .from(postViews)
      .where(eq(postViews.postId, postId));

    const [likeCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(postLikes)
      .where(eq(postLikes.postId, postId));

    const [commentCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(postComments)
      .where(eq(postComments.postId, postId));

    return {
      views: Number(viewCount.count),
      likes: Number(likeCount.count),
      comments: Number(commentCount.count),
    };
  }

  async getAllTags(): Promise<string[]> {
    const result = await db
      .select({ tags: posts.tags })
      .from(posts)
      .where(sql`${posts.tags} IS NOT NULL`);

    const allTags = new Set<string>();
    result.forEach(row => {
      if (row.tags) {
        row.tags.forEach(tag => allTags.add(tag));
      }
    });

    return Array.from(allTags).sort();
  }

  async markPostAsRead(postId: string, userId: string): Promise<void> {
    await db
      .insert(postReads)
      .values({ postId, userId })
      .onConflictDoNothing();
  }

  async getUnreadPostsCount(userId: string, userType: 'staff' | 'customer'): Promise<number> {
    // Build visibility filter based on user type
    let visibilityCondition;
    if (userType === 'staff') {
      // Staff can see internal posts and targeted posts for them
      visibilityCondition = or(
        eq(posts.visibility, 'internal'),
        and(
          eq(posts.visibility, 'targeted'),
          sql`${userId} = ANY(${posts.targetedUserIds})`
        )
      );
    } else {
      // Customers can see all_customers posts and targeted posts for them
      visibilityCondition = or(
        eq(posts.visibility, 'all_customers'),
        and(
          eq(posts.visibility, 'targeted'),
          sql`${userId} = ANY(${posts.targetedUserIds})`
        )
      );
    }

    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .leftJoin(postReads, and(
        eq(posts.id, postReads.postId),
        eq(postReads.userId, userId)
      ))
      .where(and(
        isNull(postReads.id),
        visibilityCondition
      ));

    return Number(result.count);
  }

  async getUnreadPosts(userId: string): Promise<Post[]> {
    return await db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        content: posts.content,
        tags: posts.tags,
        images: posts.images,
        links: posts.links,
        attachedArticleIds: posts.attachedArticleIds,
        visibility: posts.visibility,
        targetedUserIds: posts.targetedUserIds,
        isUrgent: posts.isUrgent,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
      })
      .from(posts)
      .leftJoin(postReads, and(
        eq(posts.id, postReads.postId),
        eq(postReads.userId, userId)
      ))
      .where(isNull(postReads.id))
      .orderBy(desc(posts.createdAt));
  }

  async hasUserReadPost(postId: string, userId: string): Promise<boolean> {
    const [read] = await db
      .select()
      .from(postReads)
      .where(and(eq(postReads.postId, postId), eq(postReads.userId, userId)));
    return !!read;
  }

  // Conversation Rating operations
  async createConversationRating(rating: InsertConversationRating): Promise<ConversationRating> {
    const [newRating] = await db
      .insert(conversationRatings)
      .values(rating)
      .returning();
    return newRating;
  }

  async getConversationRating(conversationId: string): Promise<ConversationRating | undefined> {
    const [rating] = await db
      .select()
      .from(conversationRatings)
      .where(eq(conversationRatings.conversationId, conversationId));
    return rating || undefined;
  }

  async getRatingsByAgent(agentId: string): Promise<ConversationRating[]> {
    return await db
      .select()
      .from(conversationRatings)
      .where(eq(conversationRatings.primaryAgentId, agentId))
      .orderBy(desc(conversationRatings.createdAt));
  }

  async getAverageRatingByAgent(agentId: string): Promise<number | null> {
    const [result] = await db
      .select({ avg: sql<number>`AVG(${conversationRatings.rating})` })
      .from(conversationRatings)
      .where(eq(conversationRatings.primaryAgentId, agentId));
    
    return result?.avg ? Number(result.avg) : null;
  }

  async getCustomerFeedback(customerId: string): Promise<Array<{
    id: string;
    conversationId: string;
    conversationSubject: string;
    rating: number;
    feedback: string | null;
    sentiment: number | null;
    createdAt: string;
  }>> {
    const results = await db
      .select({
        id: conversationRatings.id,
        conversationId: conversationRatings.conversationId,
        conversationSubject: conversations.subject,
        rating: conversationRatings.rating,
        feedback: conversationRatings.feedback,
        sentiment: conversationRatings.aiSentimentScore,
        createdAt: conversationRatings.createdAt,
      })
      .from(conversationRatings)
      .innerJoin(conversations, eq(conversationRatings.conversationId, conversations.id))
      .where(eq(conversations.customerId, customerId))
      .orderBy(desc(conversationRatings.createdAt));

    return results.map(r => ({
      ...r,
      conversationSubject: r.conversationSubject || 'Untitled Conversation',
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async getAllFeedback(): Promise<Array<{
    id: string;
    conversationId: string;
    conversationSubject: string;
    customerName: string;
    customerEmail: string;
    rating: number;
    feedback: string | null;
    sentiment: number | null;
    customerTone: string | null;
    resolutionQuality: string | null;
    createdAt: string;
  }>> {
    const results = await db
      .select({
        id: conversationRatings.id,
        conversationId: conversationRatings.conversationId,
        conversationSubject: conversations.subject,
        customerName: customers.name,
        customerEmail: customers.email,
        rating: conversationRatings.rating,
        feedback: conversationRatings.feedback,
        sentiment: conversationRatings.aiSentimentScore,
        customerTone: conversationRatings.aiCustomerTone,
        resolutionQuality: conversationRatings.aiResolutionQuality,
        createdAt: conversationRatings.createdAt,
      })
      .from(conversationRatings)
      .innerJoin(conversations, eq(conversationRatings.conversationId, conversations.id))
      .innerJoin(customers, eq(conversations.customerId, customers.id))
      .orderBy(desc(conversationRatings.createdAt));

    return results.map(r => ({
      ...r,
      conversationSubject: r.conversationSubject || 'Untitled Conversation',
      createdAt: r.createdAt.toISOString(),
    }));
  }

  // Message Rating operations
  async rateMessage(messageId: string, userId: string | null, customerId: string | null, rating: 'like' | 'dislike'): Promise<MessageRating> {
    // Check if a rating already exists for this message and user/customer
    const existingRating = await this.getMessageRating(messageId, userId, customerId);

    if (existingRating) {
      // Update existing rating
      const [updatedRating] = await db
        .update(messageRatings)
        .set({ rating })
        .where(eq(messageRatings.id, existingRating.id))
        .returning();
      return updatedRating;
    }

    // Create new rating
    const [newRating] = await db
      .insert(messageRatings)
      .values({
        messageId,
        userId,
        customerId,
        rating,
      })
      .returning();
    return newRating;
  }

  async getMessageRating(messageId: string, userId: string | null, customerId: string | null): Promise<MessageRating | undefined> {
    let conditions = [eq(messageRatings.messageId, messageId)];
    
    if (userId) {
      conditions.push(eq(messageRatings.userId, userId));
    }
    if (customerId) {
      conditions.push(eq(messageRatings.customerId, customerId));
    }

    const [rating] = await db
      .select()
      .from(messageRatings)
      .where(and(...conditions));
    return rating || undefined;
  }

  async getMessageRatingSummary(messageId: string): Promise<{ likes: number; dislikes: number; userRating: 'like' | 'dislike' | null }> {
    const allRatings = await db
      .select()
      .from(messageRatings)
      .where(eq(messageRatings.messageId, messageId));

    const likes = allRatings.filter(r => r.rating === 'like').length;
    const dislikes = allRatings.filter(r => r.rating === 'dislike').length;

    return {
      likes,
      dislikes,
      userRating: null, // This will be determined by the API endpoint based on the current user
    };
  }

  // Agent Performance Stats operations
  async calculateAndStoreAgentStats(agentId: string, periodStart: Date, periodEnd: Date): Promise<AgentPerformanceStats> {
    // Get all conversations where agent was involved
    const agentConversations = await db
      .select()
      .from(conversations)
      .where(
        and(
          or(
            eq(conversations.assignedAgentId, agentId),
            sql`${conversations.id} IN (SELECT DISTINCT conversation_id FROM activity_logs WHERE agent_id = ${agentId})`
          ),
          sql`${conversations.createdAt} >= ${periodStart}`,
          sql`${conversations.createdAt} < ${periodEnd}`
        )
      );

    // Get ratings for this agent in the period
    const ratings = await db
      .select()
      .from(conversationRatings)
      .where(
        and(
          eq(conversationRatings.primaryAgentId, agentId),
          sql`${conversationRatings.createdAt} >= ${periodStart}`,
          sql`${conversationRatings.createdAt} < ${periodEnd}`
        )
      );

    // Calculate metrics
    const totalConversations = agentConversations.length;
    const primaryConversations = agentConversations.filter(c => c.assignedAgentId === agentId).length;
    const closedConversations = agentConversations.filter(c => c.status === 'closed' || c.status === 'resolved').length;
    
    const totalRatings = ratings.length;
    const fiveStarCount = ratings.filter(r => r.rating === 5).length;
    const fourStarCount = ratings.filter(r => r.rating === 4).length;
    const threeStarCount = ratings.filter(r => r.rating === 3).length;
    const twoStarCount = ratings.filter(r => r.rating === 2).length;
    const oneStarCount = ratings.filter(r => r.rating === 1).length;
    
    const averageRating = totalRatings > 0 
      ? Math.round((ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings) * 100) 
      : null;
    
    const ratingsWithSentiment = ratings.filter(r => r.aiSentimentScore !== null);
    const averageSentiment = ratingsWithSentiment.length > 0
      ? Math.round(ratingsWithSentiment.reduce((sum, r) => sum + (r.aiSentimentScore || 50), 0) / ratingsWithSentiment.length)
      : null;
    
    const positiveConversations = ratingsWithSentiment.filter(r => (r.aiSentimentScore || 50) >= 60).length;
    const neutralConversations = ratingsWithSentiment.filter(r => {
      const score = r.aiSentimentScore || 50;
      return score >= 40 && score < 60;
    }).length;
    const negativeConversations = ratingsWithSentiment.filter(r => (r.aiSentimentScore || 50) < 40).length;

    // Get message count for this agent in the period
    const [messageResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(
        and(
          eq(messages.senderId, agentId),
          sql`${messages.timestamp} >= ${periodStart}`,
          sql`${messages.timestamp} < ${periodEnd}`
        )
      );
    const totalMessages = Number(messageResult?.count || 0);

    // Create or update stats record
    const statsData: InsertAgentPerformanceStats = {
      agentId,
      periodStart,
      periodEnd,
      totalConversations,
      primaryConversations,
      contributedConversations: totalConversations - primaryConversations,
      closedConversations,
      averageRating,
      totalRatings,
      fiveStarCount,
      fourStarCount,
      threeStarCount,
      twoStarCount,
      oneStarCount,
      averageSentiment,
      positiveConversations,
      neutralConversations,
      negativeConversations,
      totalMessages,
    };

    const [stats] = await db
      .insert(agentPerformanceStats)
      .values(statsData)
      .returning();
    
    return stats;
  }

  async getAgentPerformanceStats(agentId: string, periodStart?: Date, periodEnd?: Date): Promise<AgentPerformanceStats[]> {
    if (periodStart && periodEnd) {
      return await db
        .select()
        .from(agentPerformanceStats)
        .where(
          and(
            eq(agentPerformanceStats.agentId, agentId),
            sql`${agentPerformanceStats.periodStart} >= ${periodStart}`,
            sql`${agentPerformanceStats.periodEnd} <= ${periodEnd}`
          )
        )
        .orderBy(desc(agentPerformanceStats.periodStart));
    }

    return await db
      .select()
      .from(agentPerformanceStats)
      .where(eq(agentPerformanceStats.agentId, agentId))
      .orderBy(desc(agentPerformanceStats.periodStart));
  }

  async getAllAgentsPerformanceStats(periodStart?: Date, periodEnd?: Date): Promise<Array<{ agent: User; stats: AgentPerformanceStats }>> {
    if (periodStart && periodEnd) {
      return await db
        .select({
          agent: users,
          stats: agentPerformanceStats,
        })
        .from(agentPerformanceStats)
        .innerJoin(users, eq(agentPerformanceStats.agentId, users.id))
        .where(
          and(
            sql`${agentPerformanceStats.periodStart} >= ${periodStart}`,
            sql`${agentPerformanceStats.periodEnd} <= ${periodEnd}`
          )
        )
        .orderBy(desc(agentPerformanceStats.averageRating));
    }

    return await db
      .select({
        agent: users,
        stats: agentPerformanceStats,
      })
      .from(agentPerformanceStats)
      .innerJoin(users, eq(agentPerformanceStats.agentId, users.id))
      .orderBy(desc(agentPerformanceStats.averageRating));
  }

  // Activity Notification operations
  async createActivityNotification(notification: InsertActivityNotification): Promise<ActivityNotification> {
    const [result] = await db.insert(activityNotifications).values(notification).returning();
    return result;
  }

  async getActivityNotifications(userId: string, options?: { unreadOnly?: boolean; limit?: number; search?: string }): Promise<ActivityNotification[]> {
    const { unreadOnly = false, limit = 50, search } = options || {};
    
    const conditions = [eq(activityNotifications.userId, userId)];
    
    if (unreadOnly) {
      conditions.push(eq(activityNotifications.isRead, false));
    }
    
    if (search) {
      conditions.push(
        or(
          sql`${activityNotifications.title} ILIKE ${`%${search}%`}`,
          sql`${activityNotifications.message} ILIKE ${`%${search}%`}`
        )!
      );
    }
    
    const results = await db
      .select()
      .from(activityNotifications)
      .where(and(...conditions))
      .orderBy(desc(activityNotifications.createdAt))
      .limit(limit);
    
    return results;
  }

  async getUnreadActivityCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(activityNotifications)
      .where(
        and(
          eq(activityNotifications.userId, userId),
          eq(activityNotifications.isRead, false)
        )
      );
    
    return Number(result?.count || 0);
  }

  async markActivityNotificationAsRead(id: string): Promise<void> {
    await db
      .update(activityNotifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(activityNotifications.id, id));
  }

  async markAllActivityNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(activityNotifications)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(activityNotifications.userId, userId),
          eq(activityNotifications.isRead, false)
        )
      );
  }

  async deleteActivityNotification(id: string): Promise<void> {
    await db.delete(activityNotifications).where(eq(activityNotifications.id, id));
  }

  // User Permission operations
  async getUserPermissions(userId: string): Promise<UserPermission[]> {
    return await db
      .select()
      .from(userPermissions)
      .where(eq(userPermissions.userId, userId));
  }

  async setUserPermission(userId: string, feature: string, permission: string): Promise<UserPermission> {
    const existing = await db
      .select()
      .from(userPermissions)
      .where(
        and(
          eq(userPermissions.userId, userId),
          eq(userPermissions.feature, feature)
        )
      );

    if (existing.length > 0) {
      await db
        .update(userPermissions)
        .set({ permission, updatedAt: new Date() })
        .where(
          and(
            eq(userPermissions.userId, userId),
            eq(userPermissions.feature, feature)
          )
        );
      
      const [updated] = await db
        .select()
        .from(userPermissions)
        .where(
          and(
            eq(userPermissions.userId, userId),
            eq(userPermissions.feature, feature)
          )
        );
      return updated;
    } else {
      const [created] = await db
        .insert(userPermissions)
        .values({ userId, feature, permission })
        .returning();
      return created;
    }
  }

  async deleteUserPermission(userId: string, feature: string): Promise<void> {
    await db
      .delete(userPermissions)
      .where(
        and(
          eq(userPermissions.userId, userId),
          eq(userPermissions.feature, feature)
        )
      );
  }

  async deleteAllUserPermissions(userId: string): Promise<void> {
    await db
      .delete(userPermissions)
      .where(eq(userPermissions.userId, userId));
  }

  async getUserPermissionForFeature(userId: string, feature: string): Promise<UserPermission | undefined> {
    const [permission] = await db
      .select()
      .from(userPermissions)
      .where(
        and(
          eq(userPermissions.userId, userId),
          eq(userPermissions.feature, feature)
        )
      );
    return permission;
  }

  async getAllUsersWithPermissions(): Promise<Array<{ user: User; permissions: UserPermission[] }>> {
    const allUsers = await this.getAllUsers();
    const result = [];

    for (const user of allUsers) {
      const permissions = await this.getUserPermissions(user.id);
      result.push({ user, permissions });
    }

    return result;
  }

  // Email Queue operations
  async createEmailQueueEntry(entry: InsertEmailQueue): Promise<EmailQueue> {
    const [created] = await db
      .insert(emailQueue)
      .values(entry)
      .returning();
    return created;
  }

  async getPendingEmails(scheduledBefore?: Date): Promise<EmailQueue[]> {
    const conditions = [eq(emailQueue.status, 'pending')];
    if (scheduledBefore) {
      conditions.push(lte(emailQueue.scheduledFor, scheduledBefore));
    }
    return await db
      .select()
      .from(emailQueue)
      .where(and(...conditions))
      .orderBy(asc(emailQueue.scheduledFor));
  }

  async getEmailQueueByConversation(conversationId: string, recipientId: string): Promise<EmailQueue | undefined> {
    const [entry] = await db
      .select()
      .from(emailQueue)
      .where(
        and(
          eq(emailQueue.conversationId, conversationId),
          eq(emailQueue.recipientId, recipientId),
          eq(emailQueue.status, 'pending')
        )
      );
    return entry;
  }

  async updateEmailQueueEntry(id: string, updates: Partial<EmailQueue>): Promise<void> {
    await db
      .update(emailQueue)
      .set(updates)
      .where(eq(emailQueue.id, id));
  }

  async cancelPendingEmailsForConversation(conversationId: string, recipientId: string): Promise<void> {
    await db
      .update(emailQueue)
      .set({ status: 'cancelled' })
      .where(
        and(
          eq(emailQueue.conversationId, conversationId),
          eq(emailQueue.recipientId, recipientId),
          eq(emailQueue.status, 'pending')
        )
      );
  }

  async markEmailAsSent(id: string): Promise<void> {
    await db
      .update(emailQueue)
      .set({ status: 'sent', sentAt: new Date() })
      .where(eq(emailQueue.id, id));
  }

  async markEmailAsFailed(id: string, errorMessage: string): Promise<void> {
    await db
      .update(emailQueue)
      .set({ 
        status: 'failed', 
        errorMessage,
        attempts: sql`${emailQueue.attempts} + 1`
      })
      .where(eq(emailQueue.id, id));
  }

  // Engagement Settings operations
  async getEngagementSettings(organizationId?: string): Promise<EngagementSettings | undefined> {
    const conditions = organizationId 
      ? [eq(engagementSettings.organizationId, organizationId)]
      : [isNull(engagementSettings.organizationId)];
    
    const [settings] = await db
      .select()
      .from(engagementSettings)
      .where(and(...conditions));
    return settings;
  }

  async upsertEngagementSettings(settings: InsertEngagementSettings): Promise<EngagementSettings> {
    const existing = await this.getEngagementSettings(settings.organizationId ?? undefined);
    
    if (existing) {
      const [updated] = await db
        .update(engagementSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(engagementSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(engagementSettings)
        .values(settings)
        .returning();
      return created;
    }
  }

  async updateEngagementSettings(id: string, updates: Partial<InsertEngagementSettings>): Promise<EngagementSettings> {
    const [updated] = await db
      .update(engagementSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(engagementSettings.id, id))
      .returning();
    return updated;
  }

  // Follow-up tracking operations
  async getConversationsNeedingFollowup(delayHours: number, maxFollowups: number): Promise<Conversation[]> {
    const cutoffTime = new Date(Date.now() - delayHours * 60 * 60 * 1000);
    
    return await db
      .select()
      .from(conversations)
      .where(
        and(
          or(eq(conversations.status, 'open'), eq(conversations.status, 'pending')),
          lt(conversations.autoFollowupCount, maxFollowups),
          lte(conversations.lastAgentReplyAt, cutoffTime),
          or(
            isNull(conversations.lastCustomerReplyAt),
            lt(conversations.lastCustomerReplyAt, conversations.lastAgentReplyAt)
          ),
          or(
            isNull(conversations.autoFollowupSentAt),
            lt(conversations.autoFollowupSentAt, conversations.lastAgentReplyAt)
          )
        )
      );
  }

  async getInactiveConversationsForAutoClose(inactiveDays: number): Promise<Conversation[]> {
    const cutoffTime = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000);
    
    return await db
      .select()
      .from(conversations)
      .where(
        and(
          or(eq(conversations.status, 'open'), eq(conversations.status, 'pending')),
          lte(conversations.updatedAt, cutoffTime)
        )
      );
  }

  // Multi-agent participation tracking
  async addParticipatingAgent(conversationId: string, agentId: string): Promise<void> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }
    
    const currentAgents = conversation.participatingAgentIds || [];
    if (!currentAgents.includes(agentId)) {
      await db
        .update(conversations)
        .set({
          participatingAgentIds: [...currentAgents, agentId],
          updatedAt: new Date()
        })
        .where(eq(conversations.id, conversationId));
    }
  }

  // ============================================================================
  // DOCUMENTATION FRAMEWORK IMPLEMENTATIONS
  // ============================================================================

  // Document Domain operations
  async getDocDomain(id: string): Promise<DocDomain | undefined> {
    const [domain] = await db.select().from(docDomains).where(eq(docDomains.id, id));
    return domain || undefined;
  }

  async getDocDomainsByWorkspace(workspaceId: string): Promise<DocDomain[]> {
    return await db
      .select()
      .from(docDomains)
      .where(eq(docDomains.workspaceId, workspaceId))
      .orderBy(asc(docDomains.displayOrder));
  }

  async createDocDomain(domain: InsertDocDomain): Promise<DocDomain> {
    const [created] = await db.insert(docDomains).values(domain).returning();
    return created;
  }

  async updateDocDomain(id: string, updates: Partial<InsertDocDomain>): Promise<DocDomain> {
    const [updated] = await db
      .update(docDomains)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(docDomains.id, id))
      .returning();
    return updated;
  }

  async deleteDocDomain(id: string): Promise<void> {
    await db.delete(docDomains).where(eq(docDomains.id, id));
  }

  // Document Intent operations
  async getDocIntent(id: string): Promise<DocIntent | undefined> {
    const [intent] = await db.select().from(docIntents).where(eq(docIntents.id, id));
    return intent || undefined;
  }

  async getDocIntentsByWorkspace(workspaceId: string): Promise<DocIntent[]> {
    return await db
      .select()
      .from(docIntents)
      .where(eq(docIntents.workspaceId, workspaceId))
      .orderBy(asc(docIntents.displayOrder));
  }

  async createDocIntent(intent: InsertDocIntent): Promise<DocIntent> {
    const [created] = await db.insert(docIntents).values(intent).returning();
    return created;
  }

  async updateDocIntent(id: string, updates: Partial<InsertDocIntent>): Promise<DocIntent> {
    const [updated] = await db
      .update(docIntents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(docIntents.id, id))
      .returning();
    return updated;
  }

  async deleteDocIntent(id: string): Promise<void> {
    await db.delete(docIntents).where(eq(docIntents.id, id));
  }

  // Document operations
  async getDocument(id: string): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc || undefined;
  }

  async getDocumentBySlug(slug: string, workspaceId: string): Promise<Document | undefined> {
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.slug, slug), eq(documents.workspaceId, workspaceId)));
    return doc || undefined;
  }

  async getDocumentsByWorkspace(
    workspaceId: string,
    filters?: { domainId?: string; intentId?: string; status?: string; search?: string }
  ): Promise<Document[]> {
    const conditions = [eq(documents.workspaceId, workspaceId)];
    
    if (filters?.domainId) {
      conditions.push(eq(documents.domainId, filters.domainId));
    }
    if (filters?.intentId) {
      conditions.push(eq(documents.intentId, filters.intentId));
    }
    if (filters?.status) {
      conditions.push(eq(documents.status, filters.status));
    }
    if (filters?.search) {
      conditions.push(
        or(
          sql`${documents.title} ILIKE ${'%' + filters.search + '%'}`,
          sql`${documents.summary} ILIKE ${'%' + filters.search + '%'}`
        )!
      );
    }

    return await db
      .select()
      .from(documents)
      .where(and(...conditions))
      .orderBy(desc(documents.updatedAt));
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const [created] = await db.insert(documents).values(doc).returning();
    return created;
  }

  async updateDocument(id: string, updates: Partial<InsertDocument>): Promise<Document> {
    const [updated] = await db
      .update(documents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return updated;
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  // Document Version operations
  async getDocumentVersion(id: string): Promise<DocumentVersion | undefined> {
    const [version] = await db.select().from(documentVersions).where(eq(documentVersions.id, id));
    return version || undefined;
  }

  async getDocumentVersionsByDocument(documentId: string): Promise<DocumentVersion[]> {
    return await db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(desc(documentVersions.versionNumber));
  }

  async getLatestDocumentVersion(documentId: string): Promise<DocumentVersion | undefined> {
    const [version] = await db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(desc(documentVersions.versionNumber))
      .limit(1);
    return version || undefined;
  }

  async createDocumentVersion(version: InsertDocumentVersion): Promise<DocumentVersion> {
    const [created] = await db.insert(documentVersions).values(version).returning();
    return created;
  }

  async updateDocumentVersion(id: string, updates: Partial<InsertDocumentVersion>): Promise<DocumentVersion> {
    const [updated] = await db
      .update(documentVersions)
      .set(updates)
      .where(eq(documentVersions.id, id))
      .returning();
    return updated;
  }

  async publishDocumentVersion(id: string): Promise<DocumentVersion> {
    const [published] = await db
      .update(documentVersions)
      .set({ status: 'published', publishedAt: new Date() })
      .where(eq(documentVersions.id, id))
      .returning();
    
    // Update the parent document's current version
    if (published) {
      await db
        .update(documents)
        .set({
          currentVersionId: published.id,
          currentVersion: published.version,
          status: 'active',
          updatedAt: new Date()
        })
        .where(eq(documents.id, published.documentId));
    }
    
    return published;
  }

  // Document Relationship operations
  async getDocumentRelationships(documentId: string): Promise<DocumentRelationship[]> {
    return await db
      .select()
      .from(documentRelationships)
      .where(
        or(
          eq(documentRelationships.sourceDocumentId, documentId),
          eq(documentRelationships.targetDocumentId, documentId)
        )
      )
      .orderBy(asc(documentRelationships.displayOrder));
  }

  async createDocumentRelationship(relationship: InsertDocumentRelationship): Promise<DocumentRelationship> {
    const [created] = await db.insert(documentRelationships).values(relationship).returning();
    return created;
  }

  async deleteDocumentRelationship(id: string): Promise<void> {
    await db.delete(documentRelationships).where(eq(documentRelationships.id, id));
  }

  // Document Review Queue operations
  async getDocumentReviewQueue(
    workspaceId: string,
    status?: string
  ): Promise<Array<DocumentReviewQueue & { version: DocumentVersion; document: Document }>> {
    const conditions = status ? [eq(documentReviewQueue.status, status)] : [];
    
    const results = await db
      .select({
        review: documentReviewQueue,
        version: documentVersions,
        document: documents
      })
      .from(documentReviewQueue)
      .innerJoin(documentVersions, eq(documentReviewQueue.documentVersionId, documentVersions.id))
      .innerJoin(documents, eq(documentVersions.documentId, documents.id))
      .where(
        and(
          eq(documents.workspaceId, workspaceId),
          ...conditions
        )
      )
      .orderBy(desc(documentReviewQueue.createdAt));
    
    return results.map(r => ({
      ...r.review,
      version: r.version,
      document: r.document
    }));
  }

  async createDocumentReviewQueueEntry(entry: InsertDocumentReviewQueue): Promise<DocumentReviewQueue> {
    const [created] = await db.insert(documentReviewQueue).values(entry).returning();
    return created;
  }

  async updateDocumentReviewQueueEntry(id: string, updates: Partial<InsertDocumentReviewQueue>): Promise<DocumentReviewQueue> {
    const [updated] = await db
      .update(documentReviewQueue)
      .set(updates)
      .where(eq(documentReviewQueue.id, id))
      .returning();
    return updated;
  }

  async approveDocumentReview(id: string, reviewerId: string, notes?: string): Promise<void> {
    // Get the review entry
    const [review] = await db
      .select()
      .from(documentReviewQueue)
      .where(eq(documentReviewQueue.id, id));
    
    if (!review) {
      throw new Error(`Review entry ${id} not found`);
    }

    // Update the review entry
    await db
      .update(documentReviewQueue)
      .set({
        status: 'approved',
        reviewerId,
        reviewNotes: notes,
        decidedAt: new Date()
      })
      .where(eq(documentReviewQueue.id, id));

    // Publish the document version
    await this.publishDocumentVersion(review.documentVersionId);
  }

  async rejectDocumentReview(id: string, reviewerId: string, notes: string): Promise<void> {
    const [review] = await db
      .select()
      .from(documentReviewQueue)
      .where(eq(documentReviewQueue.id, id));
    
    if (!review) {
      throw new Error(`Review entry ${id} not found`);
    }

    // Update the review entry
    await db
      .update(documentReviewQueue)
      .set({
        status: 'rejected',
        reviewerId,
        reviewNotes: notes,
        decidedAt: new Date()
      })
      .where(eq(documentReviewQueue.id, id));

    // Mark the version as rejected
    await db
      .update(documentVersions)
      .set({ status: 'rejected' })
      .where(eq(documentVersions.id, review.documentVersionId));
  }

  // Document Import Job operations
  async getDocumentImportJob(id: string): Promise<DocumentImportJob | undefined> {
    const [job] = await db.select().from(documentImportJobs).where(eq(documentImportJobs.id, id));
    return job || undefined;
  }

  async getDocumentImportJobsByWorkspace(workspaceId: string): Promise<DocumentImportJob[]> {
    return await db
      .select()
      .from(documentImportJobs)
      .where(eq(documentImportJobs.workspaceId, workspaceId))
      .orderBy(desc(documentImportJobs.createdAt));
  }

  async createDocumentImportJob(job: InsertDocumentImportJob): Promise<DocumentImportJob> {
    const [created] = await db.insert(documentImportJobs).values(job).returning();
    return created;
  }

  async updateDocumentImportJob(id: string, updates: Partial<InsertDocumentImportJob>): Promise<DocumentImportJob> {
    const [updated] = await db
      .update(documentImportJobs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(documentImportJobs.id, id))
      .returning();
    return updated;
  }

  // Document Chunk operations
  async getDocumentChunksByDocument(documentId: string): Promise<DocumentChunk[]> {
    return await db
      .select()
      .from(documentChunks)
      .where(eq(documentChunks.documentId, documentId))
      .orderBy(asc(documentChunks.chunkIndex));
  }

  async createDocumentChunk(chunk: InsertDocumentChunk): Promise<DocumentChunk> {
    const [created] = await db.insert(documentChunks).values(chunk).returning();
    return created;
  }

  async createDocumentChunksBatch(chunks: InsertDocumentChunk[]): Promise<DocumentChunk[]> {
    if (chunks.length === 0) return [];
    return await db.insert(documentChunks).values(chunks).returning();
  }

  async deleteDocumentChunksByVersion(versionId: string): Promise<void> {
    await db.delete(documentChunks).where(eq(documentChunks.documentVersionId, versionId));
  }

  async searchDocumentChunksByVector(
    queryEmbedding: number[],
    workspaceId: string,
    limit: number
  ): Promise<Array<{ chunk: DocumentChunk; similarity: number }>> {
    const embeddingStr = `[${queryEmbedding.join(',')}]`;
    
    const results = await db
      .select({
        chunk: documentChunks,
        similarity: sql<number>`1 - (${documentChunks.embedding} <=> ${embeddingStr}::vector)`.as('similarity')
      })
      .from(documentChunks)
      .innerJoin(documents, eq(documentChunks.documentId, documents.id))
      .where(eq(documents.workspaceId, workspaceId))
      .orderBy(sql`${documentChunks.embedding} <=> ${embeddingStr}::vector`)
      .limit(limit);
    
    return results;
  }

  // AI Export endpoint helper - Enhanced filtering for AI agents
  async getDocumentsForAIExport(
    workspaceId: string,
    filters?: { 
      domain?: string; 
      domainId?: string;
      intent?: string;
      intentId?: string;
      role?: string; // Role of the requester (for roleAccess filtering)
      status?: string;
      isPublic?: boolean;
      aiAgentId?: string; // Filter to docs assigned to specific AI agent
    }
  ): Promise<Array<Document & { 
    currentVersionContent: DocumentVersion | null; 
    relationships: DocumentRelationship[];
    domain?: DocDomain | null;
    intent?: DocIntent | null;
  }>> {
    const conditions: any[] = [
      eq(documents.workspaceId, workspaceId),
      eq(documents.status, filters?.status || 'active')
    ];

    // Filter by domain ID if provided
    if (filters?.domainId) {
      conditions.push(eq(documents.domainId, filters.domainId));
    }

    // Filter by intent ID if provided
    if (filters?.intentId) {
      conditions.push(eq(documents.intentId, filters.intentId));
    }

    // Filter by public access
    if (filters?.isPublic !== undefined) {
      conditions.push(eq(documents.isPublic, filters.isPublic));
    }

    const docs = await db
      .select()
      .from(documents)
      .where(and(...conditions));

    // Filter by role access (post-query since it's an array field)
    let filteredDocs = docs;
    if (filters?.role) {
      filteredDocs = docs.filter(doc => 
        doc.roleAccess?.includes(filters.role!) || doc.isPublic
      );
    }

    // Filter by AI agent ID (post-query since it's an array field)
    if (filters?.aiAgentId) {
      filteredDocs = filteredDocs.filter(doc =>
        doc.aiAgentIds?.includes(filters.aiAgentId!) || !doc.aiAgentIds?.length
      );
    }

    // Fetch versions, relationships, and taxonomy for each document
    const result = await Promise.all(
      filteredDocs.map(async (doc) => {
        const version = doc.currentVersionId
          ? await this.getDocumentVersion(doc.currentVersionId)
          : await this.getLatestDocumentVersion(doc.id);
        
        const relationships = await this.getDocumentRelationships(doc.id);
        
        // Fetch domain and intent names
        let domain: DocDomain | null = null;
        let intent: DocIntent | null = null;
        
        if (doc.domainId) {
          domain = await this.getDocDomain(doc.domainId);
        }
        if (doc.intentId) {
          intent = await this.getDocIntent(doc.intentId);
        }
        
        return {
          ...doc,
          currentVersionContent: version || null,
          relationships,
          domain,
          intent
        };
      })
    );

    return result;
  }

  // ============================================================================
  // AI TOKEN USAGE TRACKING IMPLEMENTATIONS
  // ============================================================================

  async createAiTokenUsage(usage: InsertAiTokenUsage): Promise<AiTokenUsage> {
    const [created] = await db.insert(aiTokenUsage).values(usage).returning();
    
    // Also update the daily summary
    const date = new Date().toISOString().split('T')[0];
    await this.updateOrCreateUsageSummary(
      usage.workspaceId || null,
      date,
      usage.model,
      {
        prompt: usage.promptTokens || 0,
        completion: usage.completionTokens || 0,
        total: usage.totalTokens || 0,
        cost: usage.costUsd || '0.00'
      }
    );
    
    return created;
  }

  async getAiTokenUsageByConversation(conversationId: string): Promise<AiTokenUsage[]> {
    return await db
      .select()
      .from(aiTokenUsage)
      .where(eq(aiTokenUsage.conversationId, conversationId))
      .orderBy(desc(aiTokenUsage.occurredAt));
  }

  async getAiTokenUsageByWorkspace(workspaceId: string, startDate?: Date, endDate?: Date): Promise<AiTokenUsage[]> {
    const conditions: any[] = [eq(aiTokenUsage.workspaceId, workspaceId)];
    
    if (startDate) {
      conditions.push(gte(aiTokenUsage.occurredAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(aiTokenUsage.occurredAt, endDate));
    }
    
    return await db
      .select()
      .from(aiTokenUsage)
      .where(and(...conditions))
      .orderBy(desc(aiTokenUsage.occurredAt));
  }

  async getAiTokenUsageSummary(workspaceId: string | null, startDate?: Date, endDate?: Date): Promise<AiTokenUsageSummary[]> {
    const conditions: any[] = [];
    
    if (workspaceId) {
      conditions.push(eq(aiTokenUsageSummary.workspaceId, workspaceId));
    }
    if (startDate) {
      conditions.push(gte(aiTokenUsageSummary.date, startDate.toISOString().split('T')[0]));
    }
    if (endDate) {
      conditions.push(lte(aiTokenUsageSummary.date, endDate.toISOString().split('T')[0]));
    }
    
    return await db
      .select()
      .from(aiTokenUsageSummary)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(aiTokenUsageSummary.date));
  }

  async updateOrCreateUsageSummary(
    workspaceId: string | null, 
    date: string, 
    model: string, 
    tokens: { prompt: number; completion: number; total: number; cost: string }
  ): Promise<void> {
    // Try to find existing summary
    const conditions: any[] = [
      eq(aiTokenUsageSummary.date, date),
      eq(aiTokenUsageSummary.model, model)
    ];
    
    if (workspaceId) {
      conditions.push(eq(aiTokenUsageSummary.workspaceId, workspaceId));
    } else {
      conditions.push(isNull(aiTokenUsageSummary.workspaceId));
    }
    
    const [existing] = await db
      .select()
      .from(aiTokenUsageSummary)
      .where(and(...conditions))
      .limit(1);
    
    if (existing) {
      // Update existing
      const newPrompt = existing.totalPromptTokens + tokens.prompt;
      const newCompletion = existing.totalCompletionTokens + tokens.completion;
      const newTotal = existing.totalTokens + tokens.total;
      const newCost = (parseFloat(existing.totalCostUsd) + parseFloat(tokens.cost)).toFixed(6);
      
      await db
        .update(aiTokenUsageSummary)
        .set({
          totalPromptTokens: newPrompt,
          totalCompletionTokens: newCompletion,
          totalTokens: newTotal,
          totalCostUsd: newCost,
          requestCount: existing.requestCount + 1,
          updatedAt: new Date()
        })
        .where(eq(aiTokenUsageSummary.id, existing.id));
    } else {
      // Create new
      await db.insert(aiTokenUsageSummary).values({
        workspaceId,
        date,
        model,
        totalPromptTokens: tokens.prompt,
        totalCompletionTokens: tokens.completion,
        totalTokens: tokens.total,
        totalCostUsd: tokens.cost,
        requestCount: 1
      });
    }
  }

  async getDailyTokenUsage(workspaceId: string | null, days: number): Promise<Array<{ date: string; model: string; totalTokens: number; totalCost: string; requestCount: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const conditions: any[] = [
      gte(aiTokenUsageSummary.date, startDate.toISOString().split('T')[0])
    ];
    
    if (workspaceId) {
      conditions.push(eq(aiTokenUsageSummary.workspaceId, workspaceId));
    }
    
    const results = await db
      .select({
        date: aiTokenUsageSummary.date,
        model: aiTokenUsageSummary.model,
        totalTokens: aiTokenUsageSummary.totalTokens,
        totalCost: aiTokenUsageSummary.totalCostUsd,
        requestCount: aiTokenUsageSummary.requestCount
      })
      .from(aiTokenUsageSummary)
      .where(and(...conditions))
      .orderBy(desc(aiTokenUsageSummary.date));
    
    return results.map(r => ({
      date: r.date,
      model: r.model,
      totalTokens: r.totalTokens,
      totalCost: r.totalCost,
      requestCount: r.requestCount
    }));
  }

  async getMonthlyTokenUsage(workspaceId: string | null, months: number): Promise<Array<{ month: string; totalTokens: number; totalCost: string; requestCount: number }>> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    
    const conditions: any[] = [
      gte(aiTokenUsageSummary.date, startDate.toISOString().split('T')[0])
    ];
    
    if (workspaceId) {
      conditions.push(eq(aiTokenUsageSummary.workspaceId, workspaceId));
    }
    
    // Get daily data and aggregate by month
    const dailyData = await db
      .select()
      .from(aiTokenUsageSummary)
      .where(and(...conditions));
    
    // Group by month
    const monthlyMap = new Map<string, { totalTokens: number; totalCost: number; requestCount: number }>();
    
    for (const row of dailyData) {
      const month = row.date.substring(0, 7); // YYYY-MM
      const existing = monthlyMap.get(month) || { totalTokens: 0, totalCost: 0, requestCount: 0 };
      existing.totalTokens += row.totalTokens;
      existing.totalCost += parseFloat(row.totalCostUsd);
      existing.requestCount += row.requestCount;
      monthlyMap.set(month, existing);
    }
    
    return Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        totalTokens: data.totalTokens,
        totalCost: data.totalCost.toFixed(6),
        requestCount: data.requestCount
      }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }

  // Billing & Usage Analytics implementations
  async getAiTokenUsageByUser(userId: string, startDate?: Date, endDate?: Date): Promise<AiTokenUsage[]> {
    const conditions: any[] = [eq(aiTokenUsage.userId, userId)];
    
    if (startDate) {
      conditions.push(gte(aiTokenUsage.occurredAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(aiTokenUsage.occurredAt, endDate));
    }
    
    return await db
      .select()
      .from(aiTokenUsage)
      .where(and(...conditions))
      .orderBy(desc(aiTokenUsage.occurredAt));
  }

  async getAiTokenUsageByOrganization(organizationId: string, startDate?: Date, endDate?: Date): Promise<AiTokenUsage[]> {
    const conditions: any[] = [eq(aiTokenUsage.organizationId, organizationId)];
    
    if (startDate) {
      conditions.push(gte(aiTokenUsage.occurredAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(aiTokenUsage.occurredAt, endDate));
    }
    
    return await db
      .select()
      .from(aiTokenUsage)
      .where(and(...conditions))
      .orderBy(desc(aiTokenUsage.occurredAt));
  }

  async getUsageStatsByUser(userId: string, startDate?: Date, endDate?: Date): Promise<{ totalTokens: number; totalCost: string; requestCount: number; byModel: Record<string, { tokens: number; cost: string; count: number }> }> {
    const usage = await this.getAiTokenUsageByUser(userId, startDate, endDate);
    
    let totalTokens = 0;
    let totalCost = 0;
    const byModel: Record<string, { tokens: number; cost: number; count: number }> = {};
    
    for (const record of usage) {
      totalTokens += record.totalTokens;
      totalCost += parseFloat(record.costUsd);
      
      if (!byModel[record.model]) {
        byModel[record.model] = { tokens: 0, cost: 0, count: 0 };
      }
      byModel[record.model].tokens += record.totalTokens;
      byModel[record.model].cost += parseFloat(record.costUsd);
      byModel[record.model].count += 1;
    }
    
    const byModelFormatted: Record<string, { tokens: number; cost: string; count: number }> = {};
    for (const [model, data] of Object.entries(byModel)) {
      byModelFormatted[model] = {
        tokens: data.tokens,
        cost: data.cost.toFixed(6),
        count: data.count
      };
    }
    
    return {
      totalTokens,
      totalCost: totalCost.toFixed(6),
      requestCount: usage.length,
      byModel: byModelFormatted
    };
  }

  async getUsageStatsByOrganization(organizationId: string, startDate?: Date, endDate?: Date): Promise<{ totalTokens: number; totalCost: string; requestCount: number; byModel: Record<string, { tokens: number; cost: string; count: number }>; byUser: Record<string, { userId: string; name: string; tokens: number; cost: string; count: number }> }> {
    const usage = await this.getAiTokenUsageByOrganization(organizationId, startDate, endDate);
    
    let totalTokens = 0;
    let totalCost = 0;
    const byModel: Record<string, { tokens: number; cost: number; count: number }> = {};
    const byUserMap: Record<string, { userId: string; tokens: number; cost: number; count: number }> = {};
    
    for (const record of usage) {
      totalTokens += record.totalTokens;
      totalCost += parseFloat(record.costUsd);
      
      if (!byModel[record.model]) {
        byModel[record.model] = { tokens: 0, cost: 0, count: 0 };
      }
      byModel[record.model].tokens += record.totalTokens;
      byModel[record.model].cost += parseFloat(record.costUsd);
      byModel[record.model].count += 1;
      
      if (record.userId) {
        if (!byUserMap[record.userId]) {
          byUserMap[record.userId] = { userId: record.userId, tokens: 0, cost: 0, count: 0 };
        }
        byUserMap[record.userId].tokens += record.totalTokens;
        byUserMap[record.userId].cost += parseFloat(record.costUsd);
        byUserMap[record.userId].count += 1;
      }
    }
    
    // Fetch user names
    const userIds = Object.keys(byUserMap);
    const userNames: Record<string, string> = {};
    for (const uid of userIds) {
      const user = await this.getUser(uid);
      userNames[uid] = user?.name || 'Unknown User';
    }
    
    const byModelFormatted: Record<string, { tokens: number; cost: string; count: number }> = {};
    for (const [model, data] of Object.entries(byModel)) {
      byModelFormatted[model] = {
        tokens: data.tokens,
        cost: data.cost.toFixed(6),
        count: data.count
      };
    }
    
    const byUserFormatted: Record<string, { userId: string; name: string; tokens: number; cost: string; count: number }> = {};
    for (const [uid, data] of Object.entries(byUserMap)) {
      byUserFormatted[uid] = {
        userId: data.userId,
        name: userNames[uid] || 'Unknown User',
        tokens: data.tokens,
        cost: data.cost.toFixed(6),
        count: data.count
      };
    }
    
    return {
      totalTokens,
      totalCost: totalCost.toFixed(6),
      requestCount: usage.length,
      byModel: byModelFormatted,
      byUser: byUserFormatted
    };
  }

  async getPlatformUsageStats(startDate?: Date, endDate?: Date): Promise<{ totalTokens: number; totalCost: string; requestCount: number; byOrganization: Record<string, { orgId: string; name: string; tokens: number; cost: string; count: number }> }> {
    const conditions: any[] = [];
    
    if (startDate) {
      conditions.push(gte(aiTokenUsage.occurredAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(aiTokenUsage.occurredAt, endDate));
    }
    
    const usage = conditions.length > 0 
      ? await db.select().from(aiTokenUsage).where(and(...conditions)).orderBy(desc(aiTokenUsage.occurredAt))
      : await db.select().from(aiTokenUsage).orderBy(desc(aiTokenUsage.occurredAt));
    
    let totalTokens = 0;
    let totalCost = 0;
    const byOrgMap: Record<string, { orgId: string; tokens: number; cost: number; count: number }> = {};
    
    for (const record of usage) {
      totalTokens += record.totalTokens;
      totalCost += parseFloat(record.costUsd);
      
      const orgId = record.organizationId || 'platform';
      if (!byOrgMap[orgId]) {
        byOrgMap[orgId] = { orgId, tokens: 0, cost: 0, count: 0 };
      }
      byOrgMap[orgId].tokens += record.totalTokens;
      byOrgMap[orgId].cost += parseFloat(record.costUsd);
      byOrgMap[orgId].count += 1;
    }
    
    // Fetch organization names
    const orgNames: Record<string, string> = { platform: 'Platform (No Org)' };
    for (const orgId of Object.keys(byOrgMap)) {
      if (orgId !== 'platform') {
        const org = await this.getOrganization(orgId);
        orgNames[orgId] = org?.name || 'Unknown Organization';
      }
    }
    
    const byOrgFormatted: Record<string, { orgId: string; name: string; tokens: number; cost: string; count: number }> = {};
    for (const [orgId, data] of Object.entries(byOrgMap)) {
      byOrgFormatted[orgId] = {
        orgId: data.orgId,
        name: orgNames[orgId] || 'Unknown Organization',
        tokens: data.tokens,
        cost: data.cost.toFixed(6),
        count: data.count
      };
    }
    
    return {
      totalTokens,
      totalCost: totalCost.toFixed(6),
      requestCount: usage.length,
      byOrganization: byOrgFormatted
    };
  }

  // ============================================================================
  // AI KNOWLEDGE LEARNING IMPLEMENTATIONS
  // ============================================================================

  async createAiKnowledgeFeedback(feedback: InsertAiKnowledgeFeedback): Promise<AiKnowledgeFeedback> {
    const [created] = await db.insert(aiKnowledgeFeedback).values(feedback).returning();
    
    // Update article metrics
    if (feedback.knowledgeBaseId) {
      await this.updateKnowledgeArticleMetrics(feedback.knowledgeBaseId, {
        incrementRetrieved: true,
        incrementUsed: feedback.wasUsedInResponse
      });
    }
    
    return created;
  }

  async getAiKnowledgeFeedbackByConversation(conversationId: string): Promise<AiKnowledgeFeedback[]> {
    return await db
      .select()
      .from(aiKnowledgeFeedback)
      .where(eq(aiKnowledgeFeedback.conversationId, conversationId))
      .orderBy(desc(aiKnowledgeFeedback.createdAt));
  }

  async getAiKnowledgeFeedbackByArticle(knowledgeBaseId: string): Promise<AiKnowledgeFeedback[]> {
    return await db
      .select()
      .from(aiKnowledgeFeedback)
      .where(eq(aiKnowledgeFeedback.knowledgeBaseId, knowledgeBaseId))
      .orderBy(desc(aiKnowledgeFeedback.createdAt));
  }

  async updateAiKnowledgeFeedback(id: string, updates: Partial<InsertAiKnowledgeFeedback>): Promise<void> {
    await db
      .update(aiKnowledgeFeedback)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(aiKnowledgeFeedback.id, id));
  }

  async updateKnowledgeFeedbackByConversation(conversationId: string, outcome: string, customerRating?: number): Promise<void> {
    const feedbackRecords = await this.getAiKnowledgeFeedbackByConversation(conversationId);
    
    for (const record of feedbackRecords) {
      await db
        .update(aiKnowledgeFeedback)
        .set({
          outcome,
          customerRating,
          conversationResolved: outcome === 'helpful',
          updatedAt: new Date()
        })
        .where(eq(aiKnowledgeFeedback.id, record.id));
      
      // Update article metrics based on outcome
      if (record.knowledgeBaseId) {
        await this.updateKnowledgeArticleMetrics(record.knowledgeBaseId, {
          markHelpful: outcome === 'helpful',
          markNotHelpful: outcome === 'not_helpful',
          markPartial: outcome === 'partial'
        });
      }
    }
  }

  async getKnowledgeArticleMetrics(knowledgeBaseId: string): Promise<KnowledgeArticleMetrics | undefined> {
    const [metrics] = await db
      .select()
      .from(knowledgeArticleMetrics)
      .where(eq(knowledgeArticleMetrics.knowledgeBaseId, knowledgeBaseId))
      .limit(1);
    return metrics;
  }

  async updateKnowledgeArticleMetrics(
    knowledgeBaseId: string, 
    updates: { 
      incrementRetrieved?: boolean; 
      incrementUsed?: boolean;
      incrementLinkClicked?: boolean;
      markHelpful?: boolean;
      markNotHelpful?: boolean;
      markPartial?: boolean;
    }
  ): Promise<void> {
    // Find or create metrics record
    let metrics = await this.getKnowledgeArticleMetrics(knowledgeBaseId);
    
    if (!metrics) {
      // Create new metrics record
      const [created] = await db.insert(knowledgeArticleMetrics).values({
        knowledgeBaseId,
        timesRetrieved: updates.incrementRetrieved ? 1 : 0,
        timesUsedInResponse: updates.incrementUsed ? 1 : 0,
        timesLinkClicked: updates.incrementLinkClicked ? 1 : 0,
        helpfulCount: updates.markHelpful ? 1 : 0,
        notHelpfulCount: updates.markNotHelpful ? 1 : 0,
        partialCount: updates.markPartial ? 1 : 0,
        lastUsedAt: new Date(),
        lastHelpfulAt: updates.markHelpful ? new Date() : undefined
      }).returning();
      metrics = created;
    } else {
      // Update existing
      const updateValues: any = { updatedAt: new Date() };
      
      if (updates.incrementRetrieved) {
        updateValues.timesRetrieved = metrics.timesRetrieved + 1;
        updateValues.lastUsedAt = new Date();
      }
      if (updates.incrementUsed) {
        updateValues.timesUsedInResponse = metrics.timesUsedInResponse + 1;
      }
      if (updates.incrementLinkClicked) {
        updateValues.timesLinkClicked = metrics.timesLinkClicked + 1;
      }
      if (updates.markHelpful) {
        updateValues.helpfulCount = metrics.helpfulCount + 1;
        updateValues.lastHelpfulAt = new Date();
      }
      if (updates.markNotHelpful) {
        updateValues.notHelpfulCount = metrics.notHelpfulCount + 1;
      }
      if (updates.markPartial) {
        updateValues.partialCount = metrics.partialCount + 1;
      }
      
      // Recalculate success rate
      const helpful = updateValues.helpfulCount ?? metrics.helpfulCount;
      const notHelpful = updateValues.notHelpfulCount ?? metrics.notHelpfulCount;
      const total = helpful + notHelpful;
      updateValues.successRate = total > 0 ? (helpful / total).toFixed(4) : '0';
      
      // Calculate relevance score (weighted by recency)
      const daysSinceLastHelpful = metrics.lastHelpfulAt 
        ? Math.floor((Date.now() - new Date(metrics.lastHelpfulAt).getTime()) / (1000 * 60 * 60 * 24))
        : 365;
      const decayFactor = Math.exp(-daysSinceLastHelpful / 30); // 30-day half-life
      updateValues.relevanceScore = (parseFloat(updateValues.successRate) * decayFactor * helpful).toFixed(4);
      
      await db
        .update(knowledgeArticleMetrics)
        .set(updateValues)
        .where(eq(knowledgeArticleMetrics.id, metrics.id));
    }
  }

  async getTopPerformingArticles(limit: number): Promise<Array<{ article: KnowledgeBase; metrics: KnowledgeArticleMetrics }>> {
    const results = await db
      .select({
        article: knowledgeBase,
        metrics: knowledgeArticleMetrics
      })
      .from(knowledgeArticleMetrics)
      .innerJoin(knowledgeBase, eq(knowledgeArticleMetrics.knowledgeBaseId, knowledgeBase.id))
      .orderBy(desc(sql`CAST(${knowledgeArticleMetrics.relevanceScore} AS FLOAT)`))
      .limit(limit);
    
    return results;
  }

  async getArticlesNeedingImprovement(limit: number): Promise<Array<{ article: KnowledgeBase; metrics: KnowledgeArticleMetrics }>> {
    // Articles with high usage but low success rate
    const results = await db
      .select({
        article: knowledgeBase,
        metrics: knowledgeArticleMetrics
      })
      .from(knowledgeArticleMetrics)
      .innerJoin(knowledgeBase, eq(knowledgeArticleMetrics.knowledgeBaseId, knowledgeBase.id))
      .where(
        and(
          gte(knowledgeArticleMetrics.timesUsedInResponse, 5), // At least 5 uses
          lt(sql`CAST(${knowledgeArticleMetrics.successRate} AS FLOAT)`, 0.5) // Less than 50% success
        )
      )
      .orderBy(asc(sql`CAST(${knowledgeArticleMetrics.successRate} AS FLOAT)`))
      .limit(limit);
    
    return results;
  }

  // ============================================
  // CONVERSATIONAL INTELLIGENCE OPERATIONS
  // ============================================

  // Customer Memory operations
  async getCustomerMemories(customerId: string): Promise<CustomerMemory[]> {
    return await db
      .select()
      .from(customerMemory)
      .where(and(
        eq(customerMemory.customerId, customerId),
        eq(customerMemory.isActive, true)
      ))
      .orderBy(desc(customerMemory.lastAccessed));
  }

  async getCustomerMemoryByKey(customerId: string, key: string): Promise<CustomerMemory | undefined> {
    const [memory] = await db
      .select()
      .from(customerMemory)
      .where(and(
        eq(customerMemory.customerId, customerId),
        eq(customerMemory.key, key),
        eq(customerMemory.isActive, true)
      ));
    return memory || undefined;
  }

  async createCustomerMemory(memory: InsertCustomerMemory): Promise<CustomerMemory> {
    const [created] = await db.insert(customerMemory).values(memory).returning();
    return created;
  }

  async updateCustomerMemory(id: string, updates: Partial<InsertCustomerMemory>): Promise<CustomerMemory> {
    const [updated] = await db
      .update(customerMemory)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(customerMemory.id, id))
      .returning();
    return updated;
  }

  async accessCustomerMemory(id: string): Promise<void> {
    const [memory] = await db.select().from(customerMemory).where(eq(customerMemory.id, id));
    if (memory) {
      await db
        .update(customerMemory)
        .set({ 
          lastAccessed: new Date(),
          accessCount: memory.accessCount + 1
        })
        .where(eq(customerMemory.id, id));
    }
  }

  async upsertCustomerMemory(customerId: string, key: string, value: string, source: string, conversationId?: string): Promise<CustomerMemory> {
    const existing = await this.getCustomerMemoryByKey(customerId, key);
    if (existing) {
      return await this.updateCustomerMemory(existing.id, {
        value,
        source,
        sourceConversationId: conversationId,
        lastAccessed: new Date(),
        accessCount: existing.accessCount + 1
      });
    } else {
      return await this.createCustomerMemory({
        customerId,
        memoryType: 'context',
        key,
        value,
        source,
        sourceConversationId: conversationId
      });
    }
  }

  // Sentiment Tracking operations
  async createSentimentTracking(sentiment: InsertSentimentTracking): Promise<SentimentTracking> {
    const [created] = await db.insert(sentimentTracking).values(sentiment).returning();
    return created;
  }

  async getConversationSentiments(conversationId: string): Promise<SentimentTracking[]> {
    return await db
      .select()
      .from(sentimentTracking)
      .where(eq(sentimentTracking.conversationId, conversationId))
      .orderBy(asc(sentimentTracking.createdAt));
  }

  async getLatestSentiment(conversationId: string): Promise<SentimentTracking | undefined> {
    const [sentiment] = await db
      .select()
      .from(sentimentTracking)
      .where(eq(sentimentTracking.conversationId, conversationId))
      .orderBy(desc(sentimentTracking.createdAt))
      .limit(1);
    return sentiment || undefined;
  }

  async getHighFrustrationConversations(threshold: number = 70): Promise<SentimentTracking[]> {
    return await db
      .select()
      .from(sentimentTracking)
      .where(gte(sentimentTracking.frustrationLevel, threshold))
      .orderBy(desc(sentimentTracking.createdAt))
      .limit(50);
  }

  // Conversation Intelligence operations
  async getConversationIntelligence(conversationId: string): Promise<ConversationIntelligence | undefined> {
    const [intel] = await db
      .select()
      .from(conversationIntelligence)
      .where(eq(conversationIntelligence.conversationId, conversationId));
    return intel || undefined;
  }

  async createConversationIntelligence(intel: InsertConversationIntelligence): Promise<ConversationIntelligence> {
    const [created] = await db.insert(conversationIntelligence).values(intel).returning();
    return created;
  }

  async updateConversationIntelligence(conversationId: string, updates: Partial<InsertConversationIntelligence>): Promise<ConversationIntelligence> {
    const [updated] = await db
      .update(conversationIntelligence)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(conversationIntelligence.conversationId, conversationId))
      .returning();
    return updated;
  }

  async upsertConversationIntelligence(conversationId: string, updates: Partial<InsertConversationIntelligence>): Promise<ConversationIntelligence> {
    const existing = await this.getConversationIntelligence(conversationId);
    if (existing) {
      return await this.updateConversationIntelligence(conversationId, updates);
    } else {
      return await this.createConversationIntelligence({
        conversationId,
        ...updates
      });
    }
  }

  // Proactive Suggestions operations
  async getProactiveSuggestions(intent?: string, category?: string): Promise<ProactiveSuggestions[]> {
    let query = db.select().from(proactiveSuggestions).where(eq(proactiveSuggestions.isActive, true));
    
    // We'll filter in memory since array_contains isn't straightforward
    const suggestions = await query.orderBy(desc(proactiveSuggestions.suggestionPriority));
    
    return suggestions.filter(s => {
      if (intent && s.applicableIntents && !s.applicableIntents.includes(intent)) return false;
      if (category && s.applicableCategories && !s.applicableCategories.includes(category)) return false;
      return true;
    });
  }

  async createProactiveSuggestion(suggestion: InsertProactiveSuggestions): Promise<ProactiveSuggestions> {
    const [created] = await db.insert(proactiveSuggestions).values(suggestion).returning();
    return created;
  }

  async updateProactiveSuggestionStats(id: string, accepted: boolean): Promise<void> {
    const [suggestion] = await db.select().from(proactiveSuggestions).where(eq(proactiveSuggestions.id, id));
    if (suggestion) {
      const newTimesShown = suggestion.timesShown + 1;
      const newTimesAccepted = accepted ? suggestion.timesAccepted + 1 : suggestion.timesAccepted;
      const newTimesIgnored = accepted ? suggestion.timesIgnored : suggestion.timesIgnored + 1;
      const successRate = newTimesShown > 0 ? Math.round((newTimesAccepted / newTimesShown) * 100) : 0;
      
      await db
        .update(proactiveSuggestions)
        .set({
          timesShown: newTimesShown,
          timesAccepted: newTimesAccepted,
          timesIgnored: newTimesIgnored,
          successRate,
          updatedAt: new Date()
        })
        .where(eq(proactiveSuggestions.id, id));
    }
  }

  // ============================================
  // REGION OPERATIONS
  // ============================================

  async getAllRegions(): Promise<Region[]> {
    return await db.select().from(regions).where(eq(regions.isActive, true)).orderBy(asc(regions.name));
  }

  async getRegion(id: string): Promise<Region | undefined> {
    const [region] = await db.select().from(regions).where(eq(regions.id, id));
    return region;
  }

  async getRegionByIsoCode(isoCode: string): Promise<Region | undefined> {
    const [region] = await db.select().from(regions).where(eq(regions.isoCode, isoCode.toUpperCase()));
    return region;
  }

  async createRegion(region: InsertRegion): Promise<Region> {
    const [created] = await db.insert(regions).values(region).returning();
    return created;
  }

  async updateRegion(id: string, updates: Partial<InsertRegion>): Promise<Region> {
    const [updated] = await db
      .update(regions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(regions.id, id))
      .returning();
    return updated;
  }

  async deleteRegion(id: string): Promise<void> {
    await db.update(regions).set({ isActive: false, updatedAt: new Date() }).where(eq(regions.id, id));
  }

  // ============================================
  // ORGANIZATION MEMBER OPERATIONS
  // ============================================

  async getOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
    return await db.select().from(organizationMembers).where(eq(organizationMembers.organizationId, organizationId));
  }

  async getOrganizationMember(id: string): Promise<OrganizationMember | undefined> {
    const [member] = await db.select().from(organizationMembers).where(eq(organizationMembers.id, id));
    return member;
  }

  async getOrganizationMemberByUser(organizationId: string, userId: string): Promise<OrganizationMember | undefined> {
    const [member] = await db.select().from(organizationMembers).where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId)
      )
    );
    return member;
  }

  async getUserOrganizations(userId: string): Promise<OrganizationMember[]> {
    return await db.select().from(organizationMembers).where(eq(organizationMembers.userId, userId));
  }

  async createOrganizationMember(member: InsertOrganizationMember): Promise<OrganizationMember> {
    const [created] = await db.insert(organizationMembers).values(member).returning();
    return created;
  }

  async updateOrganizationMember(id: string, updates: Partial<InsertOrganizationMember>): Promise<OrganizationMember> {
    const [updated] = await db
      .update(organizationMembers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(organizationMembers.id, id))
      .returning();
    return updated;
  }

  async deleteOrganizationMember(id: string): Promise<void> {
    await db.delete(organizationMembers).where(eq(organizationMembers.id, id));
  }

  // ============================================
  // KNOWLEDGE COLLECTION OPERATIONS
  // ============================================

  async getAllKnowledgeCollections(organizationId?: string): Promise<KnowledgeCollection[]> {
    if (organizationId) {
      return await db.select().from(knowledgeCollections).where(
        and(
          eq(knowledgeCollections.ownerOrganizationId, organizationId),
          eq(knowledgeCollections.isActive, true)
        )
      ).orderBy(asc(knowledgeCollections.name));
    }
    return await db.select().from(knowledgeCollections).where(eq(knowledgeCollections.isActive, true)).orderBy(asc(knowledgeCollections.name));
  }

  async getKnowledgeCollection(id: string): Promise<KnowledgeCollection | undefined> {
    const [collection] = await db.select().from(knowledgeCollections).where(eq(knowledgeCollections.id, id));
    return collection;
  }

  async getKnowledgeCollectionBySlug(slug: string, organizationId?: string): Promise<KnowledgeCollection | undefined> {
    if (organizationId) {
      const [collection] = await db.select().from(knowledgeCollections).where(
        and(
          eq(knowledgeCollections.slug, slug),
          eq(knowledgeCollections.ownerOrganizationId, organizationId)
        )
      );
      return collection;
    }
    const [collection] = await db.select().from(knowledgeCollections).where(eq(knowledgeCollections.slug, slug));
    return collection;
  }

  async createKnowledgeCollection(collection: InsertKnowledgeCollection): Promise<KnowledgeCollection> {
    const [created] = await db.insert(knowledgeCollections).values(collection).returning();
    return created;
  }

  async updateKnowledgeCollection(id: string, updates: Partial<InsertKnowledgeCollection>): Promise<KnowledgeCollection> {
    const [updated] = await db
      .update(knowledgeCollections)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(knowledgeCollections.id, id))
      .returning();
    return updated;
  }

  async deleteKnowledgeCollection(id: string): Promise<void> {
    await db.update(knowledgeCollections).set({ isActive: false, updatedAt: new Date() }).where(eq(knowledgeCollections.id, id));
  }

  // Knowledge Collection Articles
  async getCollectionArticles(collectionId: string): Promise<KnowledgeCollectionArticle[]> {
    return await db.select().from(knowledgeCollectionArticles)
      .where(eq(knowledgeCollectionArticles.collectionId, collectionId))
      .orderBy(asc(knowledgeCollectionArticles.sortOrder));
  }

  async addArticleToCollection(data: InsertKnowledgeCollectionArticle): Promise<KnowledgeCollectionArticle> {
    const [created] = await db.insert(knowledgeCollectionArticles).values(data).returning();
    return created;
  }

  async removeArticleFromCollection(collectionId: string, articleId: string): Promise<void> {
    await db.delete(knowledgeCollectionArticles).where(
      and(
        eq(knowledgeCollectionArticles.collectionId, collectionId),
        eq(knowledgeCollectionArticles.articleId, articleId)
      )
    );
  }

  async updateArticleInCollection(collectionId: string, articleId: string, updates: Partial<InsertKnowledgeCollectionArticle>): Promise<void> {
    await db.update(knowledgeCollectionArticles)
      .set(updates)
      .where(
        and(
          eq(knowledgeCollectionArticles.collectionId, collectionId),
          eq(knowledgeCollectionArticles.articleId, articleId)
        )
      );
  }

  // Workspace Knowledge Collections
  async getWorkspaceCollections(workspaceId: string): Promise<WorkspaceKnowledgeCollection[]> {
    return await db.select().from(workspaceKnowledgeCollections)
      .where(eq(workspaceKnowledgeCollections.workspaceId, workspaceId));
  }

  async addCollectionToWorkspace(data: InsertWorkspaceKnowledgeCollection): Promise<WorkspaceKnowledgeCollection> {
    const [created] = await db.insert(workspaceKnowledgeCollections).values(data).returning();
    return created;
  }

  async removeCollectionFromWorkspace(workspaceId: string, collectionId: string): Promise<void> {
    await db.delete(workspaceKnowledgeCollections).where(
      and(
        eq(workspaceKnowledgeCollections.workspaceId, workspaceId),
        eq(workspaceKnowledgeCollections.collectionId, collectionId)
      )
    );
  }

  async updateWorkspaceCollectionAccess(workspaceId: string, collectionId: string, accessLevel: string): Promise<void> {
    await db.update(workspaceKnowledgeCollections)
      .set({ accessLevel })
      .where(
        and(
          eq(workspaceKnowledgeCollections.workspaceId, workspaceId),
          eq(workspaceKnowledgeCollections.collectionId, collectionId)
        )
      );
  }

  // ============================================
  // RESOLUTION RECORDS OPERATIONS
  // ============================================

  async createResolutionRecord(record: InsertResolutionRecord): Promise<ResolutionRecord> {
    const [created] = await db.insert(resolutionRecords).values(record).returning();
    return created;
  }

  async getResolutionRecord(id: string): Promise<ResolutionRecord | undefined> {
    const [record] = await db.select().from(resolutionRecords)
      .where(and(eq(resolutionRecords.id, id), eq(resolutionRecords.isActive, true)));
    return record;
  }

  async getResolutionsByCustomer(customerId: string, limit = 10): Promise<ResolutionRecord[]> {
    return await db.select().from(resolutionRecords)
      .where(and(eq(resolutionRecords.customerId, customerId), eq(resolutionRecords.isActive, true)))
      .orderBy(desc(resolutionRecords.createdAt))
      .limit(limit);
  }

  async getResolutionsByCustomerIssue(customerId: string, issueCategory: string, limit = 5): Promise<ResolutionRecord[]> {
    return await db.select().from(resolutionRecords)
      .where(and(
        eq(resolutionRecords.customerId, customerId),
        eq(resolutionRecords.issueCategory, issueCategory),
        eq(resolutionRecords.isActive, true)
      ))
      .orderBy(desc(resolutionRecords.createdAt))
      .limit(limit);
  }

  async getSuccessfulResolutions(customerId: string, issueCategory?: string, limit = 3): Promise<ResolutionRecord[]> {
    const conditions = [
      eq(resolutionRecords.customerId, customerId),
      eq(resolutionRecords.outcome, 'resolved'),
      eq(resolutionRecords.isActive, true)
    ];
    
    if (issueCategory) {
      conditions.push(eq(resolutionRecords.issueCategory, issueCategory));
    }

    return await db.select().from(resolutionRecords)
      .where(and(...conditions))
      .orderBy(desc(resolutionRecords.createdAt))
      .limit(limit);
  }

  async getResolutionSummaryForCustomer(customerId: string): Promise<{
    totalIssues: number;
    resolvedCount: number;
    partiallyResolvedCount: number;
    notResolvedCount: number;
    commonIssueCategories: string[];
  }> {
    const records = await db.select().from(resolutionRecords)
      .where(and(eq(resolutionRecords.customerId, customerId), eq(resolutionRecords.isActive, true)));
    
    const categoryCount: Record<string, number> = {};
    let resolvedCount = 0;
    let partiallyResolvedCount = 0;
    let notResolvedCount = 0;

    for (const record of records) {
      categoryCount[record.issueCategory] = (categoryCount[record.issueCategory] || 0) + 1;
      if (record.outcome === 'resolved') resolvedCount++;
      else if (record.outcome === 'partially_resolved') partiallyResolvedCount++;
      else notResolvedCount++;
    }

    const commonIssueCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category);

    return {
      totalIssues: records.length,
      resolvedCount,
      partiallyResolvedCount,
      notResolvedCount,
      commonIssueCategories
    };
  }

  async updateResolutionRecord(id: string, updates: Partial<InsertResolutionRecord>): Promise<ResolutionRecord> {
    const [updated] = await db.update(resolutionRecords)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(resolutionRecords.id, id))
      .returning();
    return updated;
  }

  async updateResolutionOutcome(id: string, outcome: string, customerFeedback?: string): Promise<ResolutionRecord> {
    const [updated] = await db.update(resolutionRecords)
      .set({ outcome, customerFeedback, updatedAt: new Date() })
      .where(eq(resolutionRecords.id, id))
      .returning();
    return updated;
  }

  async deleteResolutionRecord(id: string): Promise<void> {
    await db.update(resolutionRecords)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(resolutionRecords.id, id));
  }

  async getResolutionsByWorkspace(workspaceId: string, options?: {
    outcome?: string;
    issueCategory?: string;
    limit?: number;
  }): Promise<ResolutionRecord[]> {
    const conditions = [
      eq(resolutionRecords.workspaceId, workspaceId),
      eq(resolutionRecords.isActive, true)
    ];

    if (options?.outcome) {
      conditions.push(eq(resolutionRecords.outcome, options.outcome));
    }
    if (options?.issueCategory) {
      conditions.push(eq(resolutionRecords.issueCategory, options.issueCategory));
    }

    return await db.select().from(resolutionRecords)
      .where(and(...conditions))
      .orderBy(desc(resolutionRecords.createdAt))
      .limit(options?.limit || 50);
  }

  async getTopSuccessfulResolutions(customerId: string, issueCategory: string, limit = 3): Promise<ResolutionRecord[]> {
    return await db.select().from(resolutionRecords)
      .where(and(
        eq(resolutionRecords.customerId, customerId),
        eq(resolutionRecords.issueCategory, issueCategory),
        eq(resolutionRecords.outcome, 'resolved'),
        eq(resolutionRecords.isActive, true)
      ))
      .orderBy(desc(resolutionRecords.createdAt))
      .limit(limit);
  }

  // ============================================
  // WORKFLOW PLAYBOOK OPERATIONS
  // ============================================

  async getWorkflowPlaybook(id: string): Promise<WorkflowPlaybook | undefined> {
    const [playbook] = await db.select().from(workflowPlaybooks).where(eq(workflowPlaybooks.id, id));
    return playbook || undefined;
  }

  async getWorkflowPlaybookBySlug(slug: string, workspaceId: string): Promise<WorkflowPlaybook | undefined> {
    const [playbook] = await db.select().from(workflowPlaybooks)
      .where(and(eq(workflowPlaybooks.slug, slug), eq(workflowPlaybooks.workspaceId, workspaceId)));
    return playbook || undefined;
  }

  async getWorkflowPlaybooks(workspaceId: string, options?: {
    status?: string;
    category?: string;
  }): Promise<WorkflowPlaybook[]> {
    const conditions = [eq(workflowPlaybooks.workspaceId, workspaceId)];
    if (options?.status) conditions.push(eq(workflowPlaybooks.status, options.status));
    if (options?.category) conditions.push(eq(workflowPlaybooks.category, options.category));
    
    return await db.select().from(workflowPlaybooks)
      .where(and(...conditions))
      .orderBy(desc(workflowPlaybooks.updatedAt));
  }

  async createWorkflowPlaybook(playbook: InsertWorkflowPlaybook): Promise<WorkflowPlaybook> {
    const [created] = await db.insert(workflowPlaybooks).values(playbook).returning();
    return created;
  }

  async updateWorkflowPlaybook(id: string, updates: Partial<InsertWorkflowPlaybook>): Promise<WorkflowPlaybook> {
    const [updated] = await db.update(workflowPlaybooks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(workflowPlaybooks.id, id))
      .returning();
    return updated;
  }

  async deleteWorkflowPlaybook(id: string): Promise<void> {
    await db.delete(workflowPlaybooks).where(eq(workflowPlaybooks.id, id));
  }

  async searchWorkflowsByKeywords(workspaceId: string, keywords: string[]): Promise<WorkflowPlaybook[]> {
    const playbooks = await db.select().from(workflowPlaybooks)
      .where(and(
        eq(workflowPlaybooks.workspaceId, workspaceId),
        eq(workflowPlaybooks.status, 'published')
      ));
    
    // Filter by trigger keywords match
    return playbooks.filter(p => {
      if (!p.triggerKeywords?.length) return false;
      return keywords.some(kw => 
        p.triggerKeywords!.some(tk => 
          tk.toLowerCase().includes(kw.toLowerCase()) || 
          kw.toLowerCase().includes(tk.toLowerCase())
        )
      );
    });
  }

  // Workflow Node operations
  async getWorkflowNode(id: string): Promise<WorkflowNode | undefined> {
    const [node] = await db.select().from(workflowNodes).where(eq(workflowNodes.id, id));
    return node || undefined;
  }

  async getWorkflowNodesByPlaybook(playbookId: string): Promise<WorkflowNode[]> {
    return await db.select().from(workflowNodes)
      .where(eq(workflowNodes.playbookId, playbookId))
      .orderBy(asc(workflowNodes.createdAt));
  }

  async createWorkflowNode(node: InsertWorkflowNode): Promise<WorkflowNode> {
    const [created] = await db.insert(workflowNodes).values(node).returning();
    return created;
  }

  async updateWorkflowNode(id: string, updates: Partial<InsertWorkflowNode>): Promise<WorkflowNode> {
    const [updated] = await db.update(workflowNodes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(workflowNodes.id, id))
      .returning();
    return updated;
  }

  async deleteWorkflowNode(id: string): Promise<void> {
    await db.delete(workflowNodes).where(eq(workflowNodes.id, id));
  }

  // Workflow Edge operations
  async getWorkflowEdge(id: string): Promise<WorkflowEdge | undefined> {
    const [edge] = await db.select().from(workflowEdges).where(eq(workflowEdges.id, id));
    return edge || undefined;
  }

  async getWorkflowEdgesByPlaybook(playbookId: string): Promise<WorkflowEdge[]> {
    return await db.select().from(workflowEdges)
      .where(eq(workflowEdges.playbookId, playbookId))
      .orderBy(asc(workflowEdges.priority));
  }

  async getWorkflowEdgesBySource(nodeId: string): Promise<WorkflowEdge[]> {
    return await db.select().from(workflowEdges)
      .where(eq(workflowEdges.sourceNodeId, nodeId))
      .orderBy(asc(workflowEdges.priority));
  }

  async createWorkflowEdge(edge: InsertWorkflowEdge): Promise<WorkflowEdge> {
    const [created] = await db.insert(workflowEdges).values(edge).returning();
    return created;
  }

  async deleteWorkflowEdge(id: string): Promise<void> {
    await db.delete(workflowEdges).where(eq(workflowEdges.id, id));
  }

  // Workflow Session operations
  async getWorkflowSession(id: string): Promise<WorkflowSession | undefined> {
    const [session] = await db.select().from(workflowSessions).where(eq(workflowSessions.id, id));
    return session || undefined;
  }

  async getWorkflowSessionByConversation(conversationId: string): Promise<WorkflowSession | undefined> {
    const [session] = await db.select().from(workflowSessions)
      .where(and(
        eq(workflowSessions.conversationId, conversationId),
        eq(workflowSessions.status, 'active')
      ));
    return session || undefined;
  }

  async createWorkflowSession(session: InsertWorkflowSession): Promise<WorkflowSession> {
    const [created] = await db.insert(workflowSessions).values(session).returning();
    return created;
  }

  async updateWorkflowSession(id: string, updates: Partial<InsertWorkflowSession>): Promise<WorkflowSession> {
    const [updated] = await db.update(workflowSessions)
      .set(updates)
      .where(eq(workflowSessions.id, id))
      .returning();
    return updated;
  }

  async completeWorkflowSession(id: string, outcome: string, notes?: string): Promise<WorkflowSession> {
    const [updated] = await db.update(workflowSessions)
      .set({
        status: 'completed',
        resolutionOutcome: outcome,
        resolutionNotes: notes,
        completedAt: new Date()
      })
      .where(eq(workflowSessions.id, id))
      .returning();
    return updated;
  }

  // Get full workflow with nodes and edges
  async getFullWorkflow(playbookId: string): Promise<{
    playbook: WorkflowPlaybook;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  } | undefined> {
    const playbook = await this.getWorkflowPlaybook(playbookId);
    if (!playbook) return undefined;

    const nodes = await this.getWorkflowNodesByPlaybook(playbookId);
    const edges = await this.getWorkflowEdgesByPlaybook(playbookId);

    return { playbook, nodes, edges };
  }

  // ============================================================================
  // LEGAL POLICY OPERATIONS
  // ============================================================================

  async createLegalPolicy(policy: InsertLegalPolicy): Promise<LegalPolicy> {
    const [created] = await db.insert(legalPolicies).values(policy).returning();
    return created;
  }

  async getLegalPolicy(id: string): Promise<LegalPolicy | undefined> {
    const [policy] = await db.select().from(legalPolicies).where(eq(legalPolicies.id, id));
    return policy || undefined;
  }

  async getLegalPoliciesByOrganization(organizationId: string | null): Promise<LegalPolicy[]> {
    if (organizationId === null) {
      return await db.select().from(legalPolicies).where(isNull(legalPolicies.organizationId)).orderBy(desc(legalPolicies.createdAt));
    }
    return await db.select().from(legalPolicies).where(eq(legalPolicies.organizationId, organizationId)).orderBy(desc(legalPolicies.createdAt));
  }

  async getLegalPolicyByTypeAndRegion(organizationId: string | null, type: string, region: string): Promise<LegalPolicy | undefined> {
    const conditions = organizationId === null 
      ? and(isNull(legalPolicies.organizationId), eq(legalPolicies.type, type), eq(legalPolicies.region, region))
      : and(eq(legalPolicies.organizationId, organizationId), eq(legalPolicies.type, type), eq(legalPolicies.region, region));
    
    const [policy] = await db.select().from(legalPolicies).where(conditions);
    return policy || undefined;
  }

  async updateLegalPolicy(id: string, updates: Partial<InsertLegalPolicy>): Promise<LegalPolicy> {
    const [updated] = await db.update(legalPolicies)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(legalPolicies.id, id))
      .returning();
    return updated;
  }

  async deleteLegalPolicy(id: string): Promise<void> {
    await db.delete(legalPolicies).where(eq(legalPolicies.id, id));
  }

  async getPublishedPolicies(organizationId: string | null): Promise<LegalPolicy[]> {
    const conditions = organizationId === null
      ? and(isNull(legalPolicies.organizationId), eq(legalPolicies.status, 'published'))
      : and(eq(legalPolicies.organizationId, organizationId), eq(legalPolicies.status, 'published'));
    
    return await db.select().from(legalPolicies).where(conditions).orderBy(asc(legalPolicies.type));
  }

  // ============================================================================
  // CLOUD STORAGE INTEGRATION OPERATIONS
  // ============================================================================

  async createCloudStorageConnection(connection: InsertCloudStorageConnection): Promise<CloudStorageConnection> {
    const [created] = await db.insert(cloudStorageConnections).values(connection).returning();
    return created;
  }

  async getCloudStorageConnection(id: string): Promise<CloudStorageConnection | undefined> {
    const [connection] = await db.select().from(cloudStorageConnections).where(eq(cloudStorageConnections.id, id));
    return connection || undefined;
  }

  async getCloudStorageConnectionsByWorkspace(workspaceId: string): Promise<CloudStorageConnection[]> {
    return await db.select().from(cloudStorageConnections)
      .where(eq(cloudStorageConnections.workspaceId, workspaceId))
      .orderBy(desc(cloudStorageConnections.createdAt));
  }

  async getCloudStorageConnectionsByOrganization(organizationId: string): Promise<CloudStorageConnection[]> {
    return await db.select().from(cloudStorageConnections)
      .where(eq(cloudStorageConnections.organizationId, organizationId))
      .orderBy(desc(cloudStorageConnections.createdAt));
  }

  async updateCloudStorageConnection(id: string, updates: Partial<InsertCloudStorageConnection>): Promise<CloudStorageConnection> {
    const [updated] = await db.update(cloudStorageConnections)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(cloudStorageConnections.id, id))
      .returning();
    return updated;
  }

  async deleteCloudStorageConnection(id: string): Promise<void> {
    await db.delete(cloudStorageConnections).where(eq(cloudStorageConnections.id, id));
  }

  async createCloudStorageFolder(folder: InsertCloudStorageFolder): Promise<CloudStorageFolder> {
    const [created] = await db.insert(cloudStorageFolders).values(folder).returning();
    return created;
  }

  async getCloudStorageFolder(id: string): Promise<CloudStorageFolder | undefined> {
    const [folder] = await db.select().from(cloudStorageFolders).where(eq(cloudStorageFolders.id, id));
    return folder || undefined;
  }

  async getCloudStorageFoldersByConnection(connectionId: string): Promise<CloudStorageFolder[]> {
    return await db.select().from(cloudStorageFolders)
      .where(eq(cloudStorageFolders.connectionId, connectionId))
      .orderBy(asc(cloudStorageFolders.folderPath));
  }

  async updateCloudStorageFolder(id: string, updates: Partial<InsertCloudStorageFolder>): Promise<CloudStorageFolder> {
    const [updated] = await db.update(cloudStorageFolders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(cloudStorageFolders.id, id))
      .returning();
    return updated;
  }

  async deleteCloudStorageFolder(id: string): Promise<void> {
    await db.delete(cloudStorageFolders).where(eq(cloudStorageFolders.id, id));
  }

  async createCloudStorageSyncRun(run: InsertCloudStorageSyncRun): Promise<CloudStorageSyncRun> {
    const [created] = await db.insert(cloudStorageSyncRuns).values(run).returning();
    return created;
  }

  async getCloudStorageSyncRun(id: string): Promise<CloudStorageSyncRun | undefined> {
    const [run] = await db.select().from(cloudStorageSyncRuns).where(eq(cloudStorageSyncRuns.id, id));
    return run || undefined;
  }

  async getCloudStorageSyncRunsByConnection(connectionId: string, limit = 10): Promise<CloudStorageSyncRun[]> {
    return await db.select().from(cloudStorageSyncRuns)
      .where(eq(cloudStorageSyncRuns.connectionId, connectionId))
      .orderBy(desc(cloudStorageSyncRuns.startedAt))
      .limit(limit);
  }

  async updateCloudStorageSyncRun(id: string, updates: Partial<InsertCloudStorageSyncRun>): Promise<CloudStorageSyncRun> {
    const [updated] = await db.update(cloudStorageSyncRuns)
      .set(updates)
      .where(eq(cloudStorageSyncRuns.id, id))
      .returning();
    return updated;
  }

  async createCloudStorageFile(file: InsertCloudStorageFile): Promise<CloudStorageFile> {
    const [created] = await db.insert(cloudStorageFiles).values(file).returning();
    return created;
  }

  async getCloudStorageFile(id: string): Promise<CloudStorageFile | undefined> {
    const [file] = await db.select().from(cloudStorageFiles).where(eq(cloudStorageFiles.id, id));
    return file || undefined;
  }

  async getCloudStorageFileByProviderId(connectionId: string, providerFileId: string): Promise<CloudStorageFile | undefined> {
    const [file] = await db.select().from(cloudStorageFiles)
      .where(and(
        eq(cloudStorageFiles.connectionId, connectionId),
        eq(cloudStorageFiles.providerFileId, providerFileId)
      ));
    return file || undefined;
  }

  async getCloudStorageFilesByFolder(folderId: string): Promise<CloudStorageFile[]> {
    return await db.select().from(cloudStorageFiles)
      .where(eq(cloudStorageFiles.folderId, folderId))
      .orderBy(asc(cloudStorageFiles.fileName));
  }

  async updateCloudStorageFile(id: string, updates: Partial<InsertCloudStorageFile>): Promise<CloudStorageFile> {
    const [updated] = await db.update(cloudStorageFiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(cloudStorageFiles.id, id))
      .returning();
    return updated;
  }

  async deleteCloudStorageFile(id: string): Promise<void> {
    await db.delete(cloudStorageFiles).where(eq(cloudStorageFiles.id, id));
  }

  // ============================================================================
  // AI RBAC (Role-Based Access Control) OPERATIONS
  // ============================================================================

  async createAiRole(role: InsertAiRole): Promise<AiRole> {
    const [created] = await db.insert(aiRoles).values(role).returning();
    return created;
  }

  async getAiRole(id: string): Promise<AiRole | undefined> {
    const [role] = await db.select().from(aiRoles).where(eq(aiRoles.id, id));
    return role || undefined;
  }

  async getAiRolesByOrganization(organizationId: string): Promise<AiRole[]> {
    return await db.select().from(aiRoles)
      .where(eq(aiRoles.organizationId, organizationId))
      .orderBy(asc(aiRoles.name));
  }

  async getDefaultAiRole(organizationId: string): Promise<AiRole | undefined> {
    const [role] = await db.select().from(aiRoles)
      .where(and(
        eq(aiRoles.organizationId, organizationId),
        eq(aiRoles.isDefault, true)
      ));
    return role || undefined;
  }

  async updateAiRole(id: string, updates: Partial<InsertAiRole>): Promise<AiRole> {
    const [updated] = await db.update(aiRoles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(aiRoles.id, id))
      .returning();
    return updated;
  }

  async deleteAiRole(id: string): Promise<void> {
    await db.delete(aiRoles).where(eq(aiRoles.id, id));
  }

  async createAiPermission(permission: InsertAiPermission): Promise<AiPermission> {
    const [created] = await db.insert(aiPermissions).values(permission).returning();
    return created;
  }

  async getAiPermission(id: string): Promise<AiPermission | undefined> {
    const [permission] = await db.select().from(aiPermissions).where(eq(aiPermissions.id, id));
    return permission || undefined;
  }

  async getAiPermissionsByOrganization(organizationId: string): Promise<AiPermission[]> {
    return await db.select().from(aiPermissions)
      .where(eq(aiPermissions.organizationId, organizationId))
      .orderBy(asc(aiPermissions.namespace), asc(aiPermissions.resource));
  }

  async updateAiPermission(id: string, updates: Partial<InsertAiPermission>): Promise<AiPermission> {
    const [updated] = await db.update(aiPermissions)
      .set(updates)
      .where(eq(aiPermissions.id, id))
      .returning();
    return updated;
  }

  async deleteAiPermission(id: string): Promise<void> {
    await db.delete(aiPermissions).where(eq(aiPermissions.id, id));
  }

  async createAiRolePermission(rolePermission: InsertAiRolePermission): Promise<AiRolePermission> {
    const [created] = await db.insert(aiRolePermissions).values(rolePermission).returning();
    return created;
  }

  async getAiRolePermissions(roleId: string): Promise<AiRolePermission[]> {
    return await db.select().from(aiRolePermissions)
      .where(eq(aiRolePermissions.roleId, roleId));
  }

  async deleteAiRolePermission(roleId: string, permissionId: string): Promise<void> {
    await db.delete(aiRolePermissions)
      .where(and(
        eq(aiRolePermissions.roleId, roleId),
        eq(aiRolePermissions.permissionId, permissionId)
      ));
  }

  async createAiUserRole(userRole: InsertAiUserRole): Promise<AiUserRole> {
    const [created] = await db.insert(aiUserRoles).values(userRole).returning();
    return created;
  }

  async getAiUserRoles(userId: string, organizationId: string): Promise<AiUserRole[]> {
    const userRoleRecords = await db.select().from(aiUserRoles)
      .where(eq(aiUserRoles.userId, userId));
    
    const validRoles: AiUserRole[] = [];
    for (const ur of userRoleRecords) {
      const role = await this.getAiRole(ur.roleId);
      if (role && role.organizationId === organizationId) {
        if (!ur.expiresAt || ur.expiresAt > new Date()) {
          validRoles.push(ur);
        }
      }
    }
    return validRoles;
  }

  async deleteAiUserRole(id: string): Promise<void> {
    await db.delete(aiUserRoles).where(eq(aiUserRoles.id, id));
  }

  async createAiResourceScope(scope: InsertAiResourceScope): Promise<AiResourceScope> {
    const [created] = await db.insert(aiResourceScopes).values(scope).returning();
    return created;
  }

  async getAiResourceScope(id: string): Promise<AiResourceScope | undefined> {
    const [scope] = await db.select().from(aiResourceScopes).where(eq(aiResourceScopes.id, id));
    return scope || undefined;
  }

  async getAiResourceScopesByOrganization(organizationId: string): Promise<AiResourceScope[]> {
    return await db.select().from(aiResourceScopes)
      .where(eq(aiResourceScopes.organizationId, organizationId))
      .orderBy(asc(aiResourceScopes.resource));
  }

  async getAiResourceScopeByResource(organizationId: string, resource: string): Promise<AiResourceScope | undefined> {
    const [scope] = await db.select().from(aiResourceScopes)
      .where(and(
        eq(aiResourceScopes.organizationId, organizationId),
        eq(aiResourceScopes.resource, resource),
        eq(aiResourceScopes.isActive, true)
      ));
    return scope || undefined;
  }

  async updateAiResourceScope(id: string, updates: Partial<InsertAiResourceScope>): Promise<AiResourceScope> {
    const [updated] = await db.update(aiResourceScopes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(aiResourceScopes.id, id))
      .returning();
    return updated;
  }

  async deleteAiResourceScope(id: string): Promise<void> {
    await db.delete(aiResourceScopes).where(eq(aiResourceScopes.id, id));
  }

  async createAiPolicyRule(rule: InsertAiPolicyRule): Promise<AiPolicyRule> {
    const [created] = await db.insert(aiPolicyRules).values(rule).returning();
    return created;
  }

  async getAiPolicyRule(id: string): Promise<AiPolicyRule | undefined> {
    const [rule] = await db.select().from(aiPolicyRules).where(eq(aiPolicyRules.id, id));
    return rule || undefined;
  }

  async getAiPolicyRulesByOrganization(organizationId: string): Promise<AiPolicyRule[]> {
    return await db.select().from(aiPolicyRules)
      .where(eq(aiPolicyRules.organizationId, organizationId))
      .orderBy(desc(aiPolicyRules.priority));
  }

  async getActiveAiPolicyRules(organizationId: string, agentId?: string): Promise<AiPolicyRule[]> {
    if (agentId) {
      return await db.select().from(aiPolicyRules)
        .where(and(
          eq(aiPolicyRules.organizationId, organizationId),
          eq(aiPolicyRules.isActive, true),
          or(
            eq(aiPolicyRules.agentId, agentId),
            isNull(aiPolicyRules.agentId)
          )
        ))
        .orderBy(desc(aiPolicyRules.priority));
    }
    return await db.select().from(aiPolicyRules)
      .where(and(
        eq(aiPolicyRules.organizationId, organizationId),
        eq(aiPolicyRules.isActive, true)
      ))
      .orderBy(desc(aiPolicyRules.priority));
  }

  async updateAiPolicyRule(id: string, updates: Partial<InsertAiPolicyRule>): Promise<AiPolicyRule> {
    const [updated] = await db.update(aiPolicyRules)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(aiPolicyRules.id, id))
      .returning();
    return updated;
  }

  async deleteAiPolicyRule(id: string): Promise<void> {
    await db.delete(aiPolicyRules).where(eq(aiPolicyRules.id, id));
  }

  async createAiAccessAudit(audit: InsertAiAccessAudit): Promise<AiAccessAudit> {
    const [created] = await db.insert(aiAccessAudit).values(audit).returning();
    return created;
  }

  async getAiAccessAuditsByOrganization(organizationId: string, limit = 100): Promise<AiAccessAudit[]> {
    return await db.select().from(aiAccessAudit)
      .where(eq(aiAccessAudit.organizationId, organizationId))
      .orderBy(desc(aiAccessAudit.createdAt))
      .limit(limit);
  }

  async getAiAccessAuditsByUser(userId: string, limit = 100): Promise<AiAccessAudit[]> {
    return await db.select().from(aiAccessAudit)
      .where(eq(aiAccessAudit.userId, userId))
      .orderBy(desc(aiAccessAudit.createdAt))
      .limit(limit);
  }

  // Email Integration Operations
  async getEmailIntegration(id: string): Promise<EmailIntegration | undefined> {
    const [integration] = await db.select().from(emailIntegrations).where(eq(emailIntegrations.id, id));
    return integration;
  }

  async getEmailIntegrationByEmail(email: string): Promise<EmailIntegration | undefined> {
    const [integration] = await db.select().from(emailIntegrations)
      .where(eq(emailIntegrations.inboundEmail, email));
    return integration;
  }

  async getEmailIntegrationsByOrganization(organizationId: string): Promise<EmailIntegration[]> {
    return await db.select().from(emailIntegrations)
      .where(eq(emailIntegrations.organizationId, organizationId))
      .orderBy(desc(emailIntegrations.createdAt));
  }

  async createEmailIntegration(integration: InsertEmailIntegration): Promise<EmailIntegration> {
    const [result] = await db.insert(emailIntegrations).values(integration).returning();
    return result;
  }

  async updateEmailIntegration(id: string, updates: Partial<InsertEmailIntegration>): Promise<EmailIntegration> {
    const [result] = await db.update(emailIntegrations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(emailIntegrations.id, id))
      .returning();
    return result;
  }

  async deleteEmailIntegration(id: string): Promise<void> {
    await db.delete(emailIntegrations).where(eq(emailIntegrations.id, id));
  }

  async updateEmailIntegrationPollingStatus(id: string, status: string, error?: string): Promise<void> {
    await db.update(emailIntegrations)
      .set({
        lastPolledAt: new Date(),
        lastSyncStatus: status,
        lastSyncError: error || null,
        updatedAt: new Date(),
      })
      .where(eq(emailIntegrations.id, id));
  }

  // Email Message Operations
  async getEmailMessage(id: string): Promise<EmailMessage | undefined> {
    const [message] = await db.select().from(emailMessages).where(eq(emailMessages.id, id));
    return message;
  }

  async getEmailMessageByMessageId(messageId: string, integrationId: string): Promise<EmailMessage | undefined> {
    const [message] = await db.select().from(emailMessages)
      .where(and(
        eq(emailMessages.messageId, messageId),
        eq(emailMessages.integrationId, integrationId)
      ));
    return message;
  }

  async getEmailMessagesByOrganization(organizationId: string, options?: { limit?: number; offset?: number; status?: string }): Promise<EmailMessage[]> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    
    let query = db.select().from(emailMessages)
      .where(eq(emailMessages.organizationId, organizationId));
    
    if (options?.status) {
      query = db.select().from(emailMessages)
        .where(and(
          eq(emailMessages.organizationId, organizationId),
          eq(emailMessages.status, options.status)
        ));
    }
    
    return await query
      .orderBy(desc(emailMessages.receivedAt))
      .limit(limit)
      .offset(offset);
  }

  async getEmailMessagesByIntegration(integrationId: string, options?: { limit?: number; offset?: number; status?: string }): Promise<EmailMessage[]> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    
    let query = db.select().from(emailMessages)
      .where(eq(emailMessages.integrationId, integrationId));
    
    if (options?.status) {
      query = db.select().from(emailMessages)
        .where(and(
          eq(emailMessages.integrationId, integrationId),
          eq(emailMessages.status, options.status)
        ));
    }
    
    return await query
      .orderBy(desc(emailMessages.receivedAt))
      .limit(limit)
      .offset(offset);
  }

  async getEmailMessagesByCustomer(customerId: string): Promise<EmailMessage[]> {
    return await db.select().from(emailMessages)
      .where(eq(emailMessages.customerId, customerId))
      .orderBy(desc(emailMessages.receivedAt));
  }

  async getEmailMessagesByThread(threadId: string): Promise<EmailMessage[]> {
    return await db.select().from(emailMessages)
      .where(eq(emailMessages.threadId, threadId))
      .orderBy(asc(emailMessages.receivedAt));
  }

  async createEmailMessage(message: InsertEmailMessage): Promise<EmailMessage> {
    const [result] = await db.insert(emailMessages).values(message).returning();
    return result;
  }

  async updateEmailMessage(id: string, updates: Partial<InsertEmailMessage>): Promise<EmailMessage> {
    const [result] = await db.update(emailMessages)
      .set(updates)
      .where(eq(emailMessages.id, id))
      .returning();
    return result;
  }

  async updateEmailMessageStatus(id: string, status: string): Promise<void> {
    await db.update(emailMessages)
      .set({ status, processedAt: new Date() })
      .where(eq(emailMessages.id, id));
  }

  // Email Attachment Operations
  async getEmailAttachmentsByMessage(messageId: string): Promise<EmailAttachment[]> {
    return await db.select().from(emailAttachments)
      .where(eq(emailAttachments.emailMessageId, messageId));
  }

  async createEmailAttachment(attachment: InsertEmailAttachment): Promise<EmailAttachment> {
    const [result] = await db.insert(emailAttachments).values(attachment).returning();
    return result;
  }

  // Email Auto-Reply Rules
  async getEmailAutoReplyRule(id: string): Promise<EmailAutoReplyRule | undefined> {
    const [rule] = await db.select().from(emailAutoReplyRules).where(eq(emailAutoReplyRules.id, id));
    return rule;
  }

  async getEmailAutoReplyRulesByOrganization(organizationId: string): Promise<EmailAutoReplyRule[]> {
    return await db.select().from(emailAutoReplyRules)
      .where(eq(emailAutoReplyRules.organizationId, organizationId))
      .orderBy(desc(emailAutoReplyRules.rulePriority));
  }

  async getEmailAutoReplyRulesByIntegration(integrationId: string): Promise<EmailAutoReplyRule[]> {
    return await db.select().from(emailAutoReplyRules)
      .where(eq(emailAutoReplyRules.integrationId, integrationId))
      .orderBy(desc(emailAutoReplyRules.rulePriority));
  }

  async getActiveEmailAutoReplyRules(organizationId: string): Promise<EmailAutoReplyRule[]> {
    return await db.select().from(emailAutoReplyRules)
      .where(and(
        eq(emailAutoReplyRules.organizationId, organizationId),
        eq(emailAutoReplyRules.isActive, true)
      ))
      .orderBy(desc(emailAutoReplyRules.rulePriority));
  }

  async createEmailAutoReplyRule(rule: InsertEmailAutoReplyRule): Promise<EmailAutoReplyRule> {
    const [result] = await db.insert(emailAutoReplyRules).values(rule).returning();
    return result;
  }

  async updateEmailAutoReplyRule(id: string, updates: Partial<InsertEmailAutoReplyRule>): Promise<EmailAutoReplyRule> {
    const [result] = await db.update(emailAutoReplyRules)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(emailAutoReplyRules.id, id))
      .returning();
    return result;
  }

  async deleteEmailAutoReplyRule(id: string): Promise<void> {
    await db.delete(emailAutoReplyRules).where(eq(emailAutoReplyRules.id, id));
  }

  async incrementRuleReplyCount(ruleId: string): Promise<void> {
    await db.update(emailAutoReplyRules)
      .set({
        repliesSentThisHour: sql`${emailAutoReplyRules.repliesSentThisHour} + 1`,
      })
      .where(eq(emailAutoReplyRules.id, ruleId));
  }

  // Email Processing Log
  async createEmailProcessingLog(log: InsertEmailProcessingLog): Promise<EmailProcessingLog> {
    const [result] = await db.insert(emailProcessingLog).values(log).returning();
    return result;
  }

  async getEmailProcessingLogsByMessage(messageId: string): Promise<EmailProcessingLog[]> {
    return await db.select().from(emailProcessingLog)
      .where(eq(emailProcessingLog.emailMessageId, messageId))
      .orderBy(asc(emailProcessingLog.createdAt));
  }

  // Email Templates
  async getEmailTemplate(id: string): Promise<EmailTemplate | undefined> {
    const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
    return template;
  }

  async getEmailTemplatesByOrganization(organizationId: string): Promise<EmailTemplate[]> {
    return await db.select().from(emailTemplates)
      .where(eq(emailTemplates.organizationId, organizationId))
      .orderBy(desc(emailTemplates.createdAt));
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const [result] = await db.insert(emailTemplates).values(template).returning();
    return result;
  }

  async updateEmailTemplate(id: string, updates: Partial<InsertEmailTemplate>): Promise<EmailTemplate> {
    const [result] = await db.update(emailTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(emailTemplates.id, id))
      .returning();
    return result;
  }

  async deleteEmailTemplate(id: string): Promise<void> {
    await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
  }

  async incrementTemplateUsage(templateId: string): Promise<void> {
    await db.update(emailTemplates)
      .set({
        usageCount: sql`${emailTemplates.usageCount} + 1`,
        lastUsedAt: new Date(),
      })
      .where(eq(emailTemplates.id, templateId));
  }
}

export const storage = new DatabaseStorage();
