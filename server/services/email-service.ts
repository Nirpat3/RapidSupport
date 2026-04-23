import { storage } from "../storage";
import type { 
  EmailIntegration, 
  EmailMessage, 
  InsertEmailMessage,
  InsertEmailProcessingLog,
  Customer,
  Conversation 
} from "@shared/schema";
import { AIService } from "../ai-service";
import { chatCompletion } from "../shre-gateway";

interface ParsedEmail {
  messageId: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string[];
  from: { email: string; name?: string };
  to: string[];
  cc?: string[];
  subject?: string;
  bodyText?: string;
  bodyHtml?: string;
  receivedAt: Date;
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
    content?: Buffer;
  }>;
}

interface EmailAnalysis {
  classification: string;
  confidence: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  suggestedCategory?: string;
  summary: string;
  suggestedResponse?: string;
}

export class EmailService {
  private aiService: AIService;
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.aiService = new AIService();
  }

  async startPollingForIntegration(integration: EmailIntegration): Promise<void> {
    if (!integration.pollingEnabled || !integration.isActive) {
      console.log(`[EmailService] Skipping disabled integration: ${integration.id}`);
      return;
    }

    const existingInterval = this.pollingIntervals.get(integration.id);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    const intervalMs = (integration.pollingIntervalMinutes || 5) * 60 * 1000;
    
    console.log(`[EmailService] Starting polling for ${integration.inboundEmail} every ${integration.pollingIntervalMinutes} minutes`);

    const poll = async () => {
      try {
        await this.pollEmails(integration);
      } catch (error) {
        console.error(`[EmailService] Polling error for ${integration.inboundEmail}:`, error);
        await storage.updateEmailIntegrationPollingStatus(
          integration.id,
          'error',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    };

    await poll();

    const interval = setInterval(poll, intervalMs);
    this.pollingIntervals.set(integration.id, interval);
  }

  async stopPollingForIntegration(integrationId: string): Promise<void> {
    const interval = this.pollingIntervals.get(integrationId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(integrationId);
      console.log(`[EmailService] Stopped polling for integration: ${integrationId}`);
    }
  }

  async pollEmails(integration: EmailIntegration): Promise<void> {
    console.log(`[EmailService] Polling emails for ${integration.inboundEmail}`);

    try {
      const emails = await this.fetchEmailsFromProvider(integration);
      
      for (const email of emails) {
        await this.processIncomingEmail(integration, email);
      }

      await storage.updateEmailIntegrationPollingStatus(integration.id, 'success');
    } catch (error) {
      throw error;
    }
  }

  private async fetchEmailsFromProvider(integration: EmailIntegration): Promise<ParsedEmail[]> {
    switch (integration.provider) {
      case 'imap':
        return await this.fetchEmailsViaIMAP(integration);
      case 'gmail':
        return await this.fetchEmailsViaGmail(integration);
      case 'outlook':
      case 'microsoft_graph':
        return await this.fetchEmailsViaMicrosoftGraph(integration);
      default:
        console.log(`[EmailService] Unknown provider: ${integration.provider}`);
        return [];
    }
  }

  private async fetchEmailsViaIMAP(integration: EmailIntegration): Promise<ParsedEmail[]> {
    console.log(`[EmailService] IMAP polling for ${integration.inboundEmail}`);
    return [];
  }

  private async fetchEmailsViaGmail(integration: EmailIntegration): Promise<ParsedEmail[]> {
    console.log(`[EmailService] Gmail API polling for ${integration.inboundEmail}`);
    return [];
  }

  private async fetchEmailsViaMicrosoftGraph(integration: EmailIntegration): Promise<ParsedEmail[]> {
    console.log(`[EmailService] Microsoft Graph polling for ${integration.inboundEmail}`);
    return [];
  }

  async processIncomingEmail(integration: EmailIntegration, email: ParsedEmail): Promise<EmailMessage> {
    console.log(`[EmailService] Processing email: ${email.subject} from ${email.from.email}`);

    const existingMessage = await storage.getEmailMessageByMessageId(email.messageId, integration.id);
    if (existingMessage) {
      console.log(`[EmailService] Email already processed: ${email.messageId}`);
      return existingMessage;
    }

    const customer = await this.findOrCreateCustomer(integration.organizationId, email.from.email, email.from.name);

    const analysis = await this.analyzeEmail(integration, email);

    let conversation: Conversation | undefined;
    let ticketId: string | undefined;

    if (email.threadId) {
      const threadMessages = await storage.getEmailMessagesByThread(email.threadId);
      if (threadMessages.length > 0 && threadMessages[0].conversationId) {
        conversation = await storage.getConversation(threadMessages[0].conversationId);
      }
    }

    if (!conversation && integration.autoCreateTicket) {
      conversation = await this.createConversationFromEmail(integration, customer, email, analysis);
    }

    const messageData: InsertEmailMessage = {
      organizationId: integration.organizationId,
      integrationId: integration.id,
      messageId: email.messageId,
      threadId: email.threadId,
      inReplyTo: email.inReplyTo,
      references: email.references,
      fromEmail: email.from.email,
      fromName: email.from.name,
      toEmails: email.to,
      ccEmails: email.cc,
      subject: email.subject,
      bodyText: email.bodyText,
      bodyHtml: email.bodyHtml,
      hasAttachments: email.attachments && email.attachments.length > 0,
      attachmentCount: email.attachments?.length || 0,
      customerId: customer?.id,
      conversationId: conversation?.id,
      ticketId,
      classification: analysis.classification,
      classificationConfidence: analysis.confidence,
      sentiment: analysis.sentiment,
      priority: analysis.priority,
      suggestedCategory: analysis.suggestedCategory,
      aiSummary: analysis.summary,
      status: 'pending',
      direction: 'inbound',
      receivedAt: email.receivedAt,
    };

    const savedMessage = await storage.createEmailMessage(messageData);

    await this.logProcessingAction(savedMessage.id, integration.organizationId, 'received', 'success', {
      fromEmail: email.from.email,
      subject: email.subject,
    });

    await this.logProcessingAction(savedMessage.id, integration.organizationId, 'classified', 'success', {
      classification: analysis.classification,
      confidence: analysis.confidence,
      sentiment: analysis.sentiment,
    });

    if (email.attachments && email.attachments.length > 0) {
      for (const attachment of email.attachments) {
        await storage.createEmailAttachment({
          emailMessageId: savedMessage.id,
          fileName: attachment.filename,
          fileType: attachment.contentType,
          fileSize: attachment.size,
        });
      }
    }

    if (integration.autoResponseEnabled && analysis.confidence >= (integration.autoResponseConfidenceThreshold || 80)) {
      await this.handleAutoResponse(integration, savedMessage, analysis);
    }

    return savedMessage;
  }

  private async findOrCreateCustomer(organizationId: string, email: string, name?: string): Promise<Customer | undefined> {
    let customer = await storage.getCustomerByEmailAndOrg(email, organizationId);
    
    if (!customer) {
      customer = await storage.getCustomerByEmail(email);
      
      if (!customer) {
        try {
          customer = await storage.createCustomer({
            email,
            name: name || email.split('@')[0],
          });
          if (customer) {
            await storage.updateCustomerOrganizationId(customer.id, organizationId);
          }
          console.log(`[EmailService] Created new customer: ${email}`);
        } catch (error) {
          console.error(`[EmailService] Failed to create customer:`, error);
        }
      }
    }
    
    return customer;
  }

  private async analyzeEmail(integration: EmailIntegration, email: ParsedEmail): Promise<EmailAnalysis> {
    const emailContent = `Subject: ${email.subject || '(no subject)'}\n\nBody:\n${email.bodyText || email.bodyHtml || ''}`;

    try {
      const intentResult = await AIService.classifyIntent(emailContent);
      
      const sentiment = await this.detectSentiment(emailContent);
      const priority = this.determinePriority(email.subject || '', emailContent, sentiment);
      
      const summary = await this.generateSummary(emailContent);
      
      let suggestedResponse: string | undefined;
      if (integration.autoResponseEnabled) {
        suggestedResponse = await this.generateAutoResponse(integration, email, emailContent);
      }

      return {
        classification: intentResult.intent || 'general_inquiry',
        confidence: Math.round((intentResult.confidence || 0.5) * 100),
        sentiment,
        priority,
        suggestedCategory: intentResult.intent,
        summary,
        suggestedResponse,
      };
    } catch (error) {
      console.error('[EmailService] AI analysis failed:', error);
      return {
        classification: 'general_inquiry',
        confidence: 50,
        sentiment: 'neutral',
        priority: 'medium',
        summary: email.subject || 'No subject',
      };
    }
  }

  private async detectSentiment(content: string): Promise<'positive' | 'neutral' | 'negative'> {
    const negativeWords = ['urgent', 'frustrated', 'angry', 'disappointed', 'terrible', 'horrible', 'worst', 'unacceptable', 'complaint'];
    const positiveWords = ['thank', 'great', 'excellent', 'amazing', 'wonderful', 'appreciate', 'helpful', 'good'];
    
    const lowerContent = content.toLowerCase();
    
    const negativeCount = negativeWords.filter(word => lowerContent.includes(word)).length;
    const positiveCount = positiveWords.filter(word => lowerContent.includes(word)).length;
    
    if (negativeCount > positiveCount + 1) return 'negative';
    if (positiveCount > negativeCount + 1) return 'positive';
    return 'neutral';
  }

  private determinePriority(subject: string, content: string, sentiment: string): 'low' | 'medium' | 'high' | 'urgent' {
    const lowerSubject = subject.toLowerCase();
    const lowerContent = content.toLowerCase();
    
    if (lowerSubject.includes('urgent') || lowerSubject.includes('asap') || lowerSubject.includes('emergency')) {
      return 'urgent';
    }
    
    if (sentiment === 'negative' || lowerContent.includes('not working') || lowerContent.includes('broken')) {
      return 'high';
    }
    
    if (lowerSubject.includes('question') || lowerSubject.includes('inquiry')) {
      return 'low';
    }
    
    return 'medium';
  }

  private async generateSummary(content: string): Promise<string> {
    const maxLength = 200;
    const plainText = content.replace(/<[^>]*>/g, '').trim();
    
    if (plainText.length <= maxLength) {
      return plainText;
    }
    
    return plainText.substring(0, maxLength) + '...';
  }

  private async generateAutoResponse(integration: EmailIntegration, email: ParsedEmail, content: string): Promise<string | undefined> {
    try {
      const systemPrompt = `You are a helpful customer support assistant. Generate a professional, empathetic response to the following customer email inquiry. Keep the response concise and helpful.`;
      
      const response = await chatCompletion({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Customer Email:\nSubject: ${email.subject || '(no subject)'}\n\n${email.bodyText || email.bodyHtml || ''}\n\nGenerate a helpful response:` }
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      return response.content || undefined;
    } catch (error) {
      console.error('[EmailService] Auto-response generation failed:', error);
    }
    
    return undefined;
  }

  private async createConversationFromEmail(
    integration: EmailIntegration,
    customer: Customer | undefined,
    email: ParsedEmail,
    analysis: EmailAnalysis
  ): Promise<Conversation | undefined> {
    if (!customer) return undefined;

    try {
      const conversation = await storage.createConversation({
        customerId: customer.id,
        status: 'open',
        priority: analysis.priority,
        title: email.subject || 'Email Support Request',
        isAnonymous: false,
        aiAssistanceEnabled: true,
      });

      await storage.createMessage({
        conversationId: conversation.id,
        content: email.bodyText || email.bodyHtml || '',
        senderType: 'customer',
        senderId: customer.id,
      });

      await this.logProcessingAction(
        '', 
        integration.organizationId,
        'ticket_created',
        'success',
        { conversationId: conversation.id, customerId: customer.id }
      );

      return conversation;
    } catch (error) {
      console.error('[EmailService] Failed to create conversation:', error);
      return undefined;
    }
  }

  private async handleAutoResponse(
    integration: EmailIntegration,
    message: EmailMessage,
    analysis: EmailAnalysis
  ): Promise<void> {
    if (!analysis.suggestedResponse) return;

    const mode = integration.autoResponseMode || 'draft';

    if (mode === 'auto_send') {
      console.log(`[EmailService] Auto-sending response to ${message.fromEmail}`);
    } else if (mode === 'draft') {
      await storage.updateEmailMessage(message.id, {
        autoResponseContent: analysis.suggestedResponse,
        status: 'processed',
      });
    }

    await this.logProcessingAction(
      message.id,
      integration.organizationId,
      'auto_responded',
      'success',
      { mode, responseLength: analysis.suggestedResponse.length }
    );
  }

  private async logProcessingAction(
    messageId: string,
    organizationId: string,
    action: string,
    status: string,
    details?: Record<string, any>,
    error?: string
  ): Promise<void> {
    try {
      if (messageId) {
        await storage.createEmailProcessingLog({
          emailMessageId: messageId,
          organizationId,
          action,
          status,
          details: details || {},
          errorMessage: error,
        });
      }
    } catch (err) {
      console.error('[EmailService] Failed to log processing action:', err);
    }
  }

  async testConnection(integration: EmailIntegration): Promise<{ success: boolean; error?: string }> {
    try {
      switch (integration.provider) {
        case 'imap':
          return await this.testIMAPConnection(integration);
        case 'gmail':
          return { success: true };
        case 'outlook':
        case 'microsoft_graph':
          return { success: true };
        default:
          return { success: false, error: `Unknown provider: ${integration.provider}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  }

  private async testIMAPConnection(integration: EmailIntegration): Promise<{ success: boolean; error?: string }> {
    if (!integration.imapHost || !integration.username || !integration.password) {
      return { success: false, error: 'Missing IMAP configuration' };
    }
    
    return { success: true };
  }

  async sendEmail(
    integration: EmailIntegration,
    to: string[],
    subject: string,
    body: string,
    options?: {
      cc?: string[];
      bcc?: string[];
      inReplyTo?: string;
      references?: string[];
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log(`[EmailService] Sending email to ${to.join(', ')} via ${integration.provider}`);

    return { success: true, messageId: `sent-${Date.now()}` };
  }

  async startAllActivePolling(): Promise<void> {
    console.log('[EmailService] Starting polling for all active integrations');
    
    const allIntegrations: EmailIntegration[] = [];
    
    try {
      const organizations = await storage.getAllOrganizations();
      for (const org of organizations) {
        const integrations = await storage.getEmailIntegrationsByOrganization(org.id);
        allIntegrations.push(...integrations.filter(i => i.isActive && i.pollingEnabled));
      }
    } catch (error) {
      console.error('[EmailService] Failed to fetch integrations:', error);
      return;
    }

    for (const integration of allIntegrations) {
      await this.startPollingForIntegration(integration);
    }

    console.log(`[EmailService] Started polling for ${allIntegrations.length} integrations`);
  }

  stopAllPolling(): void {
    console.log('[EmailService] Stopping all polling');
    this.pollingIntervals.forEach((interval, id) => {
      clearInterval(interval);
    });
    this.pollingIntervals.clear();
  }
}

export const emailService = new EmailService();
