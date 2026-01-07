import { db } from './db';
import { eq, and, desc } from 'drizzle-orm';
import {
  channelAccounts,
  channelContacts,
  channelConversationMeta,
  channelMessages,
  channelTemplates,
  channelWebhookLogs,
  conversations,
  customers,
  messages,
  type ChannelAccount,
  type ChannelContact,
  type ChannelConversationMeta,
  type ChannelTemplate,
  type InsertChannelAccount,
  type InsertChannelContact,
  type InsertChannelConversationMeta,
  type InsertChannelMessage,
} from '@shared/schema';
import { channelProviderFactory, type InboundMessage, type OutboundMessage, type SendMessageResult } from './channel-providers';
import crypto from 'crypto';

export class ChannelService {
  
  // ============ Channel Account Management ============
  
  async createChannelAccount(data: InsertChannelAccount): Promise<ChannelAccount> {
    // Generate webhook verify token if not provided
    if (!data.webhookVerifyToken) {
      data.webhookVerifyToken = crypto.randomBytes(32).toString('hex');
    }
    
    const [account] = await db.insert(channelAccounts).values(data).returning();
    
    // Generate webhook URL based on the account
    const webhookUrl = `/api/webhooks/channel/${account.id}`;
    await db.update(channelAccounts)
      .set({ webhookUrl })
      .where(eq(channelAccounts.id, account.id));
    
    return { ...account, webhookUrl };
  }
  
  async getChannelAccount(id: string): Promise<ChannelAccount | null> {
    const [account] = await db.select().from(channelAccounts).where(eq(channelAccounts.id, id));
    return account || null;
  }
  
  async getChannelAccountsByOrganization(organizationId: string): Promise<ChannelAccount[]> {
    return db.select().from(channelAccounts)
      .where(eq(channelAccounts.organizationId, organizationId))
      .orderBy(desc(channelAccounts.createdAt));
  }
  
  async getChannelAccountsByWorkspace(workspaceId: string): Promise<ChannelAccount[]> {
    return db.select().from(channelAccounts)
      .where(eq(channelAccounts.workspaceId, workspaceId))
      .orderBy(desc(channelAccounts.createdAt));
  }
  
  async getAllActiveChannelAccounts(): Promise<ChannelAccount[]> {
    return db.select().from(channelAccounts)
      .where(eq(channelAccounts.isActive, true))
      .orderBy(desc(channelAccounts.createdAt));
  }
  
  async updateChannelAccount(id: string, data: Partial<InsertChannelAccount>): Promise<ChannelAccount | null> {
    const [updated] = await db.update(channelAccounts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(channelAccounts.id, id))
      .returning();
    return updated || null;
  }
  
  async deleteChannelAccount(id: string): Promise<boolean> {
    const result = await db.delete(channelAccounts).where(eq(channelAccounts.id, id));
    return true;
  }
  
  async testChannelConnection(id: string): Promise<{ success: boolean; error?: string }> {
    const account = await this.getChannelAccount(id);
    if (!account) {
      return { success: false, error: 'Account not found' };
    }
    
    try {
      const provider = channelProviderFactory.getProvider(account.provider as 'meta_cloud' | 'twilio');
      const health = await provider.checkHealth(account);
      
      // Update account status
      await db.update(channelAccounts)
        .set({
          status: health.healthy ? 'connected' : 'error',
          lastError: health.error || null,
          lastHealthCheck: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(channelAccounts.id, id));
      
      return { success: health.healthy, error: health.error };
    } catch (error: any) {
      await db.update(channelAccounts)
        .set({
          status: 'error',
          lastError: error.message,
          lastHealthCheck: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(channelAccounts.id, id));
      
      return { success: false, error: error.message };
    }
  }
  
  // ============ Channel Contact Management ============
  
  async getOrCreateContact(
    channelAccountId: string,
    externalId: string,
    channelType: string,
    displayName?: string,
    profilePicUrl?: string,
    phoneNumber?: string
  ): Promise<ChannelContact> {
    // Try to find existing contact
    const [existing] = await db.select().from(channelContacts)
      .where(and(
        eq(channelContacts.channelAccountId, channelAccountId),
        eq(channelContacts.externalId, externalId)
      ));
    
    if (existing) {
      // Update last contact time and optional fields
      const updates: any = {
        lastContactAt: new Date(),
        messageCount: existing.messageCount + 1,
        updatedAt: new Date(),
      };
      
      if (displayName && displayName !== existing.displayName) {
        updates.displayName = displayName;
      }
      if (profilePicUrl && profilePicUrl !== existing.profilePicUrl) {
        updates.profilePicUrl = profilePicUrl;
      }
      
      const [updated] = await db.update(channelContacts)
        .set(updates)
        .where(eq(channelContacts.id, existing.id))
        .returning();
      
      return updated;
    }
    
    // Create new contact
    const [contact] = await db.insert(channelContacts).values({
      channelAccountId,
      externalId,
      channelType,
      displayName,
      profilePicUrl,
      phoneNumber: phoneNumber || (channelType === 'whatsapp' ? externalId : undefined),
      firstContactAt: new Date(),
      lastContactAt: new Date(),
      messageCount: 1,
    }).returning();
    
    return contact;
  }
  
  async getContactById(id: string): Promise<ChannelContact | null> {
    const [contact] = await db.select().from(channelContacts).where(eq(channelContacts.id, id));
    return contact || null;
  }
  
  async linkContactToCustomer(contactId: string, customerId: string): Promise<void> {
    await db.update(channelContacts)
      .set({ customerId, updatedAt: new Date() })
      .where(eq(channelContacts.id, contactId));
  }
  
  async updateContactLeadInfo(contactId: string, leadData: {
    leadStatus?: string;
    leadScore?: number;
    businessName?: string;
    businessType?: string;
    notes?: string;
    tags?: string[];
  }): Promise<void> {
    await db.update(channelContacts)
      .set({ ...leadData, updatedAt: new Date() })
      .where(eq(channelContacts.id, contactId));
  }
  
  // ============ Conversation Channel Metadata ============
  
  async getConversationMeta(conversationId: string): Promise<ChannelConversationMeta | null> {
    const [meta] = await db.select().from(channelConversationMeta)
      .where(eq(channelConversationMeta.conversationId, conversationId));
    return meta || null;
  }
  
  async getOrCreateConversationMeta(
    conversationId: string,
    channelAccountId: string,
    channelContactId: string,
    channelType: string
  ): Promise<ChannelConversationMeta> {
    // Try to find existing meta
    const [existing] = await db.select().from(channelConversationMeta)
      .where(eq(channelConversationMeta.conversationId, conversationId));
    
    if (existing) {
      return existing;
    }
    
    // Get channel account for default settings
    const account = await this.getChannelAccount(channelAccountId);
    
    // Create new meta
    const [meta] = await db.insert(channelConversationMeta).values({
      conversationId,
      channelAccountId,
      channelContactId,
      channelType,
      botMode: account?.defaultBotMode || 'auto',
      lastCustomerMessageAt: new Date(),
      sessionExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      isWithinSessionWindow: true,
      currentAiAgentId: account?.defaultAiAgentId,
    }).returning();
    
    return meta;
  }
  
  async updateConversationMeta(
    conversationId: string,
    updates: Partial<InsertChannelConversationMeta>
  ): Promise<void> {
    await db.update(channelConversationMeta)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(channelConversationMeta.conversationId, conversationId));
  }
  
  async refreshSessionWindow(conversationId: string): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    await db.update(channelConversationMeta)
      .set({
        lastCustomerMessageAt: now,
        sessionExpiresAt: expiresAt,
        isWithinSessionWindow: true,
        updatedAt: now,
      })
      .where(eq(channelConversationMeta.conversationId, conversationId));
  }
  
  async checkSessionWindow(conversationId: string): Promise<boolean> {
    const [meta] = await db.select().from(channelConversationMeta)
      .where(eq(channelConversationMeta.conversationId, conversationId));
    
    if (!meta || !meta.sessionExpiresAt) return false;
    
    const isWithin = new Date() < new Date(meta.sessionExpiresAt);
    
    // Update if status changed
    if (meta.isWithinSessionWindow !== isWithin) {
      await db.update(channelConversationMeta)
        .set({ isWithinSessionWindow: isWithin, updatedAt: new Date() })
        .where(eq(channelConversationMeta.conversationId, conversationId));
    }
    
    return isWithin;
  }
  
  // ============ Bot Control ============
  
  async pauseBot(conversationId: string, userId: string, resumeInHours?: number): Promise<void> {
    const updates: any = {
      botMode: 'human_only',
      botPausedAt: new Date(),
      botPausedBy: userId,
      updatedAt: new Date(),
    };
    
    if (resumeInHours) {
      updates.botResumeAt = new Date(Date.now() + resumeInHours * 60 * 60 * 1000);
    }
    
    await db.update(channelConversationMeta)
      .set(updates)
      .where(eq(channelConversationMeta.conversationId, conversationId));
  }
  
  async resumeBot(conversationId: string): Promise<void> {
    await db.update(channelConversationMeta)
      .set({
        botMode: 'auto',
        botPausedAt: null,
        botPausedBy: null,
        botResumeAt: null,
        updatedAt: new Date(),
      })
      .where(eq(channelConversationMeta.conversationId, conversationId));
  }
  
  async setBotMode(conversationId: string, mode: 'auto' | 'handoff' | 'human_only'): Promise<void> {
    await db.update(channelConversationMeta)
      .set({ botMode: mode, updatedAt: new Date() })
      .where(eq(channelConversationMeta.conversationId, conversationId));
  }
  
  // ============ Message Sending ============
  
  async sendChannelMessage(
    conversationId: string,
    content: string,
    senderId: string,
    senderType: 'agent' | 'ai' | 'system'
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Get conversation meta
    const [meta] = await db.select().from(channelConversationMeta)
      .where(eq(channelConversationMeta.conversationId, conversationId));
    
    if (!meta || !meta.channelAccountId || !meta.channelContactId) {
      // This is a web conversation, just save to messages
      const [message] = await db.insert(messages).values({
        conversationId,
        senderId,
        senderType,
        content,
        scope: 'public',
        status: 'sent',
      }).returning();
      
      return { success: true, messageId: message.id };
    }
    
    // Get channel account and contact
    const account = await this.getChannelAccount(meta.channelAccountId);
    const contact = await this.getContactById(meta.channelContactId);
    
    if (!account || !contact) {
      return { success: false, error: 'Channel account or contact not found' };
    }
    
    // Check session window for WhatsApp
    if (account.channelType === 'whatsapp') {
      const withinWindow = await this.checkSessionWindow(conversationId);
      if (!withinWindow) {
        return { success: false, error: 'Outside 24-hour session window. Use a template message.' };
      }
    }
    
    // Get provider and send
    const provider = channelProviderFactory.getProvider(account.provider as 'meta_cloud' | 'twilio');
    
    const outboundMessage: OutboundMessage = {
      to: contact.externalId,
      messageType: 'text',
      content,
    };
    
    const result = await provider.sendMessage(account, outboundMessage);
    
    // Save message to database regardless of send status
    const [message] = await db.insert(messages).values({
      conversationId,
      senderId,
      senderType,
      content,
      scope: 'public',
      status: result.success ? 'sent' : 'sent', // We track delivery separately
    }).returning();
    
    // Save channel message metadata
    await db.insert(channelMessages).values({
      messageId: message.id,
      channelAccountId: account.id,
      externalMessageId: result.externalMessageId,
      direction: 'outbound',
      messageType: 'text',
      deliveryStatus: result.success ? 'sent' : 'failed',
      failureReason: result.error,
    });
    
    return {
      success: result.success,
      messageId: message.id,
      error: result.error,
    };
  }
  
  async sendTemplateMessage(
    conversationId: string,
    templateId: string,
    variables: Record<string, string>,
    senderId: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Get conversation meta
    const [meta] = await db.select().from(channelConversationMeta)
      .where(eq(channelConversationMeta.conversationId, conversationId));
    
    if (!meta || !meta.channelAccountId || !meta.channelContactId) {
      return { success: false, error: 'Not a channel conversation' };
    }
    
    // Get template
    const [template] = await db.select().from(channelTemplates)
      .where(eq(channelTemplates.id, templateId));
    
    if (!template) {
      return { success: false, error: 'Template not found' };
    }
    
    if (template.status !== 'approved') {
      return { success: false, error: 'Template not approved' };
    }
    
    // Get channel account and contact
    const account = await this.getChannelAccount(meta.channelAccountId);
    const contact = await this.getContactById(meta.channelContactId);
    
    if (!account || !contact) {
      return { success: false, error: 'Channel account or contact not found' };
    }
    
    // Get provider and send
    const provider = channelProviderFactory.getProvider(account.provider as 'meta_cloud' | 'twilio');
    
    const result = await provider.sendTemplate(account, contact.externalId, template, variables);
    
    // Build message content from template
    let content = template.bodyText;
    Object.entries(variables).forEach(([key, value]) => {
      content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });
    
    // Save message
    const [message] = await db.insert(messages).values({
      conversationId,
      senderId,
      senderType: 'system',
      content: `[Template: ${template.name}] ${content}`,
      scope: 'public',
      status: 'sent',
    }).returning();
    
    // Save channel message metadata
    await db.insert(channelMessages).values({
      messageId: message.id,
      channelAccountId: account.id,
      externalMessageId: result.externalMessageId,
      direction: 'outbound',
      messageType: 'template',
      templateId: template.id,
      templateName: template.name,
      templateLanguage: template.language,
      deliveryStatus: result.success ? 'sent' : 'failed',
      failureReason: result.error,
    });
    
    // Update template usage count
    await db.update(channelTemplates)
      .set({
        usageCount: template.usageCount + 1,
        lastUsedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(channelTemplates.id, templateId));
    
    // Refresh session window since we're re-engaging
    await this.refreshSessionWindow(conversationId);
    
    return {
      success: result.success,
      messageId: message.id,
      error: result.error,
    };
  }
  
  // ============ Template Management ============
  
  async createTemplate(data: any): Promise<ChannelTemplate> {
    const [template] = await db.insert(channelTemplates).values(data).returning();
    return template;
  }
  
  async getTemplatesByAccount(channelAccountId: string): Promise<ChannelTemplate[]> {
    return db.select().from(channelTemplates)
      .where(eq(channelTemplates.channelAccountId, channelAccountId))
      .orderBy(desc(channelTemplates.createdAt));
  }
  
  async getApprovedTemplates(channelAccountId: string): Promise<ChannelTemplate[]> {
    return db.select().from(channelTemplates)
      .where(and(
        eq(channelTemplates.channelAccountId, channelAccountId),
        eq(channelTemplates.status, 'approved')
      ))
      .orderBy(desc(channelTemplates.usageCount));
  }
  
  // ============ Webhook Logging ============
  
  async logWebhook(
    channelAccountId: string | null,
    eventType: string,
    direction: 'inbound' | 'outbound',
    rawPayload: any,
    processedSuccessfully: boolean,
    errorMessage?: string,
    processingTimeMs?: number,
    relatedMessageId?: string,
    relatedConversationId?: string
  ): Promise<void> {
    await db.insert(channelWebhookLogs).values({
      channelAccountId,
      eventType,
      direction,
      rawPayload,
      processedSuccessfully,
      errorMessage,
      processingTimeMs,
      relatedMessageId,
      relatedConversationId,
    });
  }
}

export const channelService = new ChannelService();
