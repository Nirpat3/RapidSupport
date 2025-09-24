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
  company: text("company"), // Optional company name
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
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  status: text("status").notNull().default("sent"), // 'sent' | 'delivered' | 'read'
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

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
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
  company: true,
  tags: true,
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
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  senderId: true,
  senderType: true,
  content: true,
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
export type ExternalCustomerSync = z.infer<typeof externalCustomerSyncSchema>;
export type ExternalTicketSync = z.infer<typeof externalTicketSyncSchema>;
