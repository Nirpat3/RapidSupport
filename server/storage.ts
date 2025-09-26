import {
  users,
  customers,
  conversations,
  messages,
  tickets,
  attachments,
  activityLogs,
  agentWorkload,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql } from "drizzle-orm";

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
          id: 0, // Will be set by database
          agentId: result.user.id,
          activeConversations: 0,
          maxCapacity: 5,
          lastActivity: new Date(),
          updatedAt: new Date()
        };
      }
      
      // Only include agents with capacity
      if (workload.activeConversations < workload.maxCapacity) {
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
        agentId: null,
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

  async getUnassignedConversations(): Promise<any[]> {
    return await db
      .select({
        id: conversations.id,
        customerId: conversations.customerId,
        assignedAgentId: conversations.assignedAgentId,
        title: conversations.title,
        status: conversations.status,
        priority: conversations.priority,
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
        eq(conversations.assignedAgentId, null as any),
        eq(conversations.status, 'open')
      ))
      .orderBy(desc(conversations.createdAt));
  }

}

export const storage = new DatabaseStorage();
