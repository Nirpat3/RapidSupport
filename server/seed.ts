import { db } from "./db";
import { users, customers, conversations, messages } from "@shared/schema";
import { hash } from "bcryptjs";

async function seed() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await db.delete(messages);
  await db.delete(conversations);
  await db.delete(customers);
  await db.delete(users);

  // Create admin user
  const hashedAdminPassword = await hash("admin", 10);
  const [adminUser] = await db.insert(users).values({
    email: "admin@supportboard.com",
    password: hashedAdminPassword,
    name: "Admin User",
    role: "admin",
    status: "online"
  }).returning();

  // Create agent users
  const hashedAgentPassword = await hash("agent123", 10);
  const [agentSarah] = await db.insert(users).values({
    email: "sarah.smith@supportboard.com",
    password: hashedAgentPassword,
    name: "Sarah Smith",
    role: "agent",
    status: "online"
  }).returning();

  const [agentTom] = await db.insert(users).values({
    email: "tom.wilson@supportboard.com",
    password: hashedAgentPassword,
    name: "Tom Wilson",
    role: "agent",
    status: "away"
  }).returning();

  // Create customers
  const [customerJohn] = await db.insert(customers).values({
    name: "John Doe",
    email: "john.doe@email.com",
    status: "online"
  }).returning();

  const [customerSarah] = await db.insert(customers).values({
    name: "Sarah Wilson",
    email: "sarah.wilson@email.com",
    status: "away"
  }).returning();

  const [customerMike] = await db.insert(customers).values({
    name: "Mike Johnson",
    email: "mike.johnson@email.com",
    status: "offline"
  }).returning();

  const [customerEmma] = await db.insert(customers).values({
    name: "Emma Davis",
    email: "emma.davis@email.com",
    status: "busy"
  }).returning();

  // Create conversations
  const [conv1] = await db.insert(conversations).values({
    customerId: customerJohn.id,
    assignedAgentId: agentSarah.id,
    status: "open",
    priority: "high",
    title: "Account setup issue"
  }).returning();

  const [conv2] = await db.insert(conversations).values({
    customerId: customerSarah.id,
    assignedAgentId: agentSarah.id,
    status: "resolved",
    priority: "low",
    title: "General inquiry"
  }).returning();

  const [conv3] = await db.insert(conversations).values({
    customerId: customerMike.id,
    assignedAgentId: agentTom.id,
    status: "pending",
    priority: "urgent",
    title: "Payment issue"
  }).returning();

  const [conv4] = await db.insert(conversations).values({
    customerId: customerEmma.id,
    assignedAgentId: agentSarah.id,
    status: "open",
    priority: "medium",
    title: "Pricing question"
  }).returning();

  // Create messages for conversation 1
  const conv1Messages = [
    {
      conversationId: conv1.id,
      senderId: customerJohn.id,
      senderType: "customer" as const,
      content: "Hello! I need help with my account setup.",
      timestamp: new Date(Date.now() - 1000 * 60 * 10)
    },
    {
      conversationId: conv1.id,
      senderId: agentSarah.id,
      senderType: "agent" as const,
      content: "Hi John! I'd be happy to help you with your account setup. What specific issue are you experiencing?",
      timestamp: new Date(Date.now() - 1000 * 60 * 8)
    },
    {
      conversationId: conv1.id,
      senderId: customerJohn.id,
      senderType: "customer" as const,
      content: "I'm having trouble uploading my profile picture. The upload button doesn't seem to work.",
      timestamp: new Date(Date.now() - 1000 * 60 * 5)
    }
  ];

  // Create messages for conversation 3 (payment issue)
  const conv3Messages = [
    {
      conversationId: conv3.id,
      senderId: customerMike.id,
      senderType: "customer" as const,
      content: "Hi, I'm having a payment issue with my subscription.",
      timestamp: new Date(Date.now() - 1000 * 60 * 30)
    },
    {
      conversationId: conv3.id,
      senderId: agentTom.id,
      senderType: "agent" as const,
      content: "I'm sorry to hear about the payment issue. Let me help you resolve this. Can you tell me what error message you're seeing?",
      timestamp: new Date(Date.now() - 1000 * 60 * 25)
    }
  ];

  // Insert all messages
  await db.insert(messages).values([...conv1Messages, ...conv3Messages]);

  console.log("✅ Database seeded successfully!");
  console.log("👤 Admin user: admin@supportboard.com / admin");
  console.log("👥 Agent users: sarah.smith@supportboard.com / agent123");
  console.log("               tom.wilson@supportboard.com / agent123");
}

seed().catch(console.error).finally(() => process.exit(0));
