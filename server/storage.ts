import {
  users,
  customers,
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
  organizations,
  type User,
  type Organization,
  type InsertOrganization,
  type InsertUser,
  type Workspace,
  type InsertWorkspace,
  type WorkspaceMember,
  type InsertWorkspaceMember,
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
  getAllAgents(): Promise<User[]>;
  getAllUsers(): Promise<User[]>;

  // Customer operations
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomerStatus(id: string, status: string): Promise<void>;
  getAllCustomers(options?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: 'createdAt' | 'updatedAt' | 'name';
    sortOrder?: 'asc' | 'desc';
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
  getAllWorkspaces(): Promise<Workspace[]>;
  createWorkspace(workspace: InsertWorkspace): Promise<Workspace>;
  updateWorkspace(id: string, updates: Partial<InsertWorkspace>): Promise<Workspace>;
  deleteWorkspace(id: string): Promise<void>;

  // Workspace Member operations
  getWorkspaceMember(id: string): Promise<WorkspaceMember | undefined>;
  getWorkspaceMembersByWorkspace(workspaceId: string): Promise<WorkspaceMember[]>;
  getWorkspaceMembersByUser(userId: string): Promise<WorkspaceMember[]>;
  getUserWorkspaces(userId: string): Promise<Array<{ workspace: Workspace; membership: WorkspaceMember }>>;
  addWorkspaceMember(member: InsertWorkspaceMember): Promise<WorkspaceMember>;
  updateWorkspaceMember(id: string, updates: Partial<InsertWorkspaceMember>): Promise<WorkspaceMember>;
  removeWorkspaceMember(id: string): Promise<void>;

  // Organization operations (for white-label branding)
  getOrganization(id: string): Promise<Organization | undefined>;
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  getAllOrganizations(): Promise<Organization[]>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: string, updates: Partial<InsertOrganization>): Promise<Organization>;

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
  getUnreadPostsCount(userId: string): Promise<number>;
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

  async getAllAgents(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, 'agent'));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.updatedAt));
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

  async getAllCustomers(options?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: 'createdAt' | 'updatedAt' | 'name';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ customers: Customer[]; total: number; page: number; totalPages: number }> {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options || {};

    let query = db.select().from(customers).$dynamic();
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(customers).$dynamic();

    // Apply filters
    const whereConditions: any[] = [];
    
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
    
    // First check if customer already exists
    const existingCustomer = await this.findExistingCustomer(
      customerData.email,
      customerData.phone,
      customerData.company
    );

    let customer: Customer;
    
    if (existingCustomer) {
      // Update existing customer with new IP address if provided
      const updateData: any = { updatedAt: new Date() };
      if (customerData.ipAddress) {
        updateData.ipAddress = customerData.ipAddress;
      }
      
      await db
        .update(customers)
        .set(updateData)
        .where(eq(customers.id, existingCustomer.id));
      
      customer = { ...existingCustomer, ...updateData };
    } else {
      // Create new customer
      [customer] = await db
        .insert(customers)
        .values({
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          company: customerData.company,
          ipAddress: customerData.ipAddress,
          status: 'online',
        })
        .returning();
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

  async getAllWorkspaces(): Promise<Workspace[]> {
    try {
      return await db.select().from(workspaces).orderBy(desc(workspaces.createdAt));
    } catch (error) {
      console.error('Error fetching all workspaces:', error);
      return [];
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

  async getAllOrganizations(): Promise<Organization[]> {
    try {
      return await db.select().from(organizations).orderBy(desc(organizations.createdAt));
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

  async updateOrganization(id: string, updates: Partial<InsertOrganization>): Promise<Organization> {
    try {
      const [updatedOrg] = await db.update(organizations)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(organizations.id, id))
        .returning();
      return updatedOrg;
    } catch (error) {
      console.error('Error updating organization:', error);
      throw error;
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
      const createdChunks = await db.insert(knowledgeChunks).values(chunks).returning();
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

  async getUnreadPostsCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .leftJoin(postReads, and(
        eq(posts.id, postReads.postId),
        eq(postReads.userId, userId)
      ))
      .where(isNull(postReads.id));

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

}

export const storage = new DatabaseStorage();
