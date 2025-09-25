import {
  users,
  customers,
  conversations,
  messages,
  tickets,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or } from "drizzle-orm";

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

  async getAllCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.updatedAt));
  }

  // Conversation operations
  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async getConversationsByCustomer(customerId: string): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.customerId, customerId))
      .orderBy(desc(conversations.updatedAt));
  }

  async getConversationsByAgent(agentId: string): Promise<Conversation[]> {
    return await db
      .select({
        id: conversations.id,
        customerId: conversations.customerId,
        assignedAgentId: conversations.assignedAgentId,
        title: conversations.title,
        status: conversations.status,
        priority: conversations.priority,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        customer: {
          id: customers.id,
          name: customers.name,
          email: customers.email,
          status: customers.status
        }
      })
      .from(conversations)
      .leftJoin(customers, eq(conversations.customerId, customers.id))
      .where(eq(conversations.assignedAgentId, agentId))
      .orderBy(desc(conversations.updatedAt));
  }

  async getAllConversations(): Promise<Conversation[]> {
    return await db
      .select({
        id: conversations.id,
        customerId: conversations.customerId,
        assignedAgentId: conversations.assignedAgentId,
        title: conversations.title,
        status: conversations.status,
        priority: conversations.priority,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        customer: {
          id: customers.id,
          name: customers.name,
          email: customers.email,
          status: customers.status
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

}

export const storage = new DatabaseStorage();
