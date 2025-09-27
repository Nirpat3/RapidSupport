import {
  users,
  customers,
  conversations,
  messages,
  tickets,
  attachments,
  activityLogs,
  agentWorkload,
  aiAgents,
  knowledgeBase,
  knowledgeBaseImages,
  aiAgentLearning,
  aiAgentSessions,
  uploadedFiles,
  knowledgeBaseFiles,
  aiAgentFileUsage,
  type User,
  type InsertUser,
  type Customer,
  type InsertCustomer,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
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
  type KnowledgeBase,
  type InsertKnowledgeBase,
  type KnowledgeBaseImage,
  type InsertKnowledgeBaseImage,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, isNull } from "drizzle-orm";

// Updated interface for all CRUD operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStatus(id: string, status: string): Promise<void>;
  getAllAgents(): Promise<User[]>;
  getAllUsers(): Promise<User[]>;

  // Customer operations
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomerStatus(id: string, status: string): Promise<void>;
  getAllCustomers(): Promise<Customer[]>;

  // Conversation operations
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversationWithCustomer(id: string): Promise<any | null>;
  getConversationsByCustomer(customerId: string): Promise<Conversation[]>;
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
  createAnonymousCustomer(customerData: AnonymousCustomer & { sessionId: string }): Promise<{ customerId: string; conversationId: string; customerInfo: AnonymousCustomer }>;
  getCustomerChatMessages(conversationId: string): Promise<Array<{ id: string; content: string; senderType: 'customer' | 'agent'; senderName: string; timestamp: string }>>;
  createCustomerMessage(messageData: { conversationId: string; customerId: string; content: string }): Promise<Message>;
  findExistingCustomer(email: string, phone: string, company: string): Promise<Customer | undefined>;

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
  createAiAgent(agent: InsertAiAgent): Promise<AiAgent>;
  updateAiAgent(id: string, updates: Partial<InsertAiAgent>): Promise<void>;
  deleteAiAgent(id: string): Promise<void>;

  // Knowledge Base operations
  getKnowledgeBase(id: string): Promise<KnowledgeBase | undefined>;
  getKnowledgeBaseArticles(ids: string[]): Promise<KnowledgeBase[]>;
  getAllKnowledgeBase(): Promise<KnowledgeBase[]>;
  createKnowledgeBase(knowledge: InsertKnowledgeBase): Promise<KnowledgeBase>;
  updateKnowledgeBase(id: string, updates: Partial<InsertKnowledgeBase>): Promise<void>;
  deleteKnowledgeBase(id: string): Promise<void>;
  updateKnowledgeBaseUsage(id: string): Promise<void>;

  // Knowledge Base Image operations
  getKnowledgeBaseImages(knowledgeBaseId: string): Promise<KnowledgeBaseImage[]>;
  createKnowledgeBaseImage(image: InsertKnowledgeBaseImage): Promise<KnowledgeBaseImage>;
  deleteKnowledgeBaseImage(id: string): Promise<void>;
  updateKnowledgeBaseImageOrder(id: string, displayOrder: number): Promise<void>;
  updateKnowledgeBaseEffectiveness(id: string, adjustment: number): Promise<void>;

  // AI Agent Learning operations
  getAiAgentLearning(id: string): Promise<AiAgentLearning | undefined>;
  getAiAgentLearningByConversation(conversationId: string): Promise<AiAgentLearning[]>;
  getAiAgentLearningByAgent(agentId: string): Promise<AiAgentLearning[]>;
  createAiAgentLearning(learning: InsertAiAgentLearning): Promise<AiAgentLearning>;
  updateAiAgentLearning(id: string, updates: Partial<InsertAiAgentLearning>): Promise<void>;
  
  // AI Training & Correction operations
  getAiLearningEntries(filters: { agentId?: string; limit?: number; offset?: number }): Promise<any[]>;
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

    let query = db.select().from(customers);
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(customers);

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
        isAnonymous: conversations.isAnonymous,
        sessionId: conversations.sessionId,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
      })
      .from(conversations)
      .where(eq(conversations.customerId, customerId))
      .orderBy(desc(conversations.updatedAt));
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
    // Default to public messages for backward compatibility
    return await db
      .select()
      .from(messages)
      .where(and(
        eq(messages.conversationId, conversationId),
        eq(messages.scope, 'public')
      ))
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
    
    // Internal messages don't update conversation timestamp (hidden from customer view)
    return message;
  }

  async updateMessageStatus(id: string, status: string): Promise<void> {
    await db
      .update(messages)
      .set({ status })
      .where(eq(messages.id, id));
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

  async findExistingCustomer(email: string, phone: string, company: string): Promise<Customer | undefined> {
    // Try to find existing customer by email and company, or email and phone
    const [customer] = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.email, email),
          or(
            eq(customers.company, company),
            eq(customers.phone, phone)
          )
        )
      );
    return customer || undefined;
  }

  async createAnonymousCustomer(customerData: AnonymousCustomer & { sessionId: string }, wsServer?: any): Promise<{ customerId: string; conversationId: string; customerInfo: AnonymousCustomer }> {
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
    const [conversation] = await db
      .insert(conversations)
      .values({
        customerId: customer.id,
        title: `Chat with ${customerData.name}`,
        isAnonymous: true,
        sessionId: customerData.sessionId,
        status: 'open',
        priority: 'medium',
      })
      .returning();

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

  async getCustomerChatMessages(conversationId: string): Promise<Array<{ id: string; content: string; senderType: 'customer' | 'agent'; senderName: string; timestamp: string }>> {
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

    return messageResults.map((result) => {
      const message = result.message;
      let senderName = 'Unknown';
      
      if (message.senderType === 'customer' && result.customer) {
        senderName = result.customer.name;
      } else if ((message.senderType === 'agent' || message.senderType === 'admin') && result.agent) {
        senderName = result.agent.name;
      }

      return {
        id: message.id,
        content: message.content,
        senderType: message.senderType as 'customer' | 'agent',
        senderName,
        timestamp: message.timestamp.toISOString(),
      };
    });
  }

  async createCustomerMessage(messageData: { conversationId: string; customerId: string; content: string }): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values({
        conversationId: messageData.conversationId,
        senderId: messageData.customerId,
        senderType: 'customer',
        content: messageData.content,
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
          createdAt: conversations.createdAt,
          updatedAt: conversations.updatedAt,
          customer: {
            id: customers.id,
            name: customers.name,
            email: customers.email,
            company: customers.company,
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
      if (ids.length === 0) return [];
      return await db.select().from(knowledgeBase).where(sql`${knowledgeBase.id} = ANY(${ids})`);
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
      return result;
    } catch (error) {
      console.error('Error creating knowledge base article:', error);
      throw error;
    }
  }

  async updateKnowledgeBase(id: string, updates: Partial<InsertKnowledgeBase>): Promise<void> {
    try {
      await db.update(knowledgeBase).set({ ...updates, updatedAt: new Date() }).where(eq(knowledgeBase.id, id));
    } catch (error) {
      console.error('Error updating knowledge base article:', error);
      throw error;
    }
  }

  async deleteKnowledgeBase(id: string): Promise<void> {
    try {
      await db.delete(knowledgeBase).where(eq(knowledgeBase.id, id));
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
        .orderBy(desc(aiAgentLearning.createdAt));

      if (filters.agentId) {
        query = query.where(eq(aiAgentLearning.agentId, filters.agentId));
      }

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

    let query = db.select().from(uploadedFiles);
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(uploadedFiles);

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
    let query = db
      .select({
        file: uploadedFiles,
        totalUsage: sql<number>`COALESCE(SUM(${aiAgentFileUsage.usageCount}), 0)`,
        lastUsed: sql<Date | null>`MAX(${aiAgentFileUsage.lastUsedAt})`,
      })
      .from(uploadedFiles)
      .leftJoin(aiAgentFileUsage, eq(uploadedFiles.id, aiAgentFileUsage.fileId))
      .groupBy(uploadedFiles.id);
    
    // Filter by agent if specified
    if (agentId) {
      query = query.where(eq(aiAgentFileUsage.agentId, agentId));
    }
    
    const results = await query
      .orderBy(sql`SUM(${aiAgentFileUsage.usageCount}) DESC NULLS LAST`)
      .limit(limit);

    return results.map(result => ({
      file: result.file,
      totalUsage: Number(result.totalUsage),
      lastUsed: result.lastUsed,
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

}

export const storage = new DatabaseStorage();
