import { chatCompletion } from './shre-gateway';
import { storage } from './storage';
import type { InsertKnowledgeBase, InsertKnowledgeBaseFaq } from '@shared/schema';

export interface DocumentationRequest {
  integrationName: string;
  integrationType: 'messaging_channel' | 'payment' | 'crm' | 'analytics' | 'other';
  providerName?: string;
  features?: string[];
  additionalContext?: string;
}

export interface GeneratedDocumentation {
  title: string;
  content: string;
  category: string;
  tags: string[];
  faqs: Array<{ question: string; answer: string }>;
}

export class DocumentationGeneratorService {
  private static instance: DocumentationGeneratorService;

  static getInstance(): DocumentationGeneratorService {
    if (!DocumentationGeneratorService.instance) {
      DocumentationGeneratorService.instance = new DocumentationGeneratorService();
    }
    return DocumentationGeneratorService.instance;
  }

  async generateIntegrationDocumentation(request: DocumentationRequest): Promise<GeneratedDocumentation> {
    const systemPrompt = `You are a technical documentation writer for Support Board, a customer support platform.
Create comprehensive setup documentation for integrations that includes:
1. Clear step-by-step setup instructions
2. Prerequisites and requirements
3. Configuration details with field descriptions
4. Troubleshooting tips
5. Best practices

Format the documentation in Markdown with proper headings and sections.
Be specific about what credentials are needed and where to find them.
Include security considerations and compliance notes where applicable.`;

    const userPrompt = `Generate comprehensive setup documentation for: ${request.integrationName}

Integration Type: ${request.integrationType}
${request.providerName ? `Provider: ${request.providerName}` : ''}
${request.features?.length ? `Key Features: ${request.features.join(', ')}` : ''}
${request.additionalContext || ''}

Please create:
1. A detailed setup guide with step-by-step instructions
2. 5-7 frequently asked questions with answers

Return the response as JSON with this exact structure:
{
  "title": "Setup Guide Title",
  "content": "Full markdown documentation content",
  "category": "Category name",
  "tags": ["tag1", "tag2"],
  "faqs": [
    {"question": "FAQ question?", "answer": "FAQ answer"}
  ]
}`;

    try {
      const response = await chatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });

      const content = response.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const parsed = JSON.parse(content) as GeneratedDocumentation;
      return parsed;
    } catch (error) {
      console.error('Error generating documentation:', error);
      throw new Error('Failed to generate documentation');
    }
  }

  async createAndSaveDocumentation(
    request: DocumentationRequest,
    createdBy?: string
  ): Promise<{ articleId: string; title: string }> {
    const generated = await this.generateIntegrationDocumentation(request);

    const articleData: InsertKnowledgeBase = {
      title: generated.title,
      content: generated.content,
      category: generated.category,
      tags: generated.tags,
      sourceType: 'manual',
      isActive: true,
      priority: 70,
      createdBy: createdBy || undefined
    };

    const article = await storage.createKnowledgeBase(articleData);

    if (generated.faqs && generated.faqs.length > 0) {
      const faqData: InsertKnowledgeBaseFaq[] = generated.faqs.map((faq, index) => ({
        knowledgeBaseId: article.id,
        question: faq.question,
        answer: faq.answer,
        displayOrder: index
      }));
      await storage.createKnowledgeBaseFaqsBatch(faqData);
    }

    return { articleId: article.id, title: article.title };
  }

  getChannelDefinitions() {
    return [
      {
        integrationName: 'WhatsApp Business',
        integrationType: 'messaging_channel' as const,
        providerName: 'Meta Cloud API & Twilio',
        features: ['24-hour session messaging', 'Template messages', 'Media attachments', 'Two-way conversations'],
        additionalContext: `Support Board supports two providers for WhatsApp:
1. Meta Cloud API (direct integration) - Requires Meta Business account and WhatsApp Business API access
2. Twilio - Requires Twilio account with WhatsApp Sender enabled

Key configuration fields in Support Board:
- Provider selection (Meta Cloud or Twilio)
- Phone Number ID (for Meta) or Twilio Phone Number
- Access Token or Twilio credentials
- Webhook URL for receiving messages
- 24-hour session window tracking for compliance`
      },
      {
        integrationName: 'Facebook Messenger',
        integrationType: 'messaging_channel' as const,
        providerName: 'Meta Graph API',
        features: ['Page messaging', 'Quick replies', 'Persistent menus', 'Handover protocol'],
        additionalContext: `Facebook Messenger integration requires:
- Facebook Business Page
- Meta Developer App with Messenger permissions
- Page Access Token with messaging permissions
- Webhook subscription for messages and messaging_postbacks

Support Board configuration fields:
- Page ID
- Page Access Token
- App Secret (for webhook verification)
- Webhook Verify Token`
      },
      {
        integrationName: 'Instagram Direct Messages',
        integrationType: 'messaging_channel' as const,
        providerName: 'Meta Graph API',
        features: ['Instagram DM responses', 'Story mentions', 'Media messaging'],
        additionalContext: `Instagram DM integration requirements:
- Instagram Professional/Business Account
- Connected Facebook Page
- Meta Developer App with Instagram API permissions
- Instagram Graph API access

Support Board configuration:
- Instagram Account ID
- Page Access Token (same as Messenger if pages are linked)
- Webhook for instagram_messaging events`
      },
      {
        integrationName: 'Twilio SMS & Voice',
        integrationType: 'messaging_channel' as const,
        providerName: 'Twilio',
        features: ['SMS messaging', 'Voice calls', 'Phone number management', 'Programmable messaging'],
        additionalContext: `Twilio integration for SMS/Voice:
- Account SID and Auth Token from Twilio Console
- Phone number(s) for sending/receiving
- Webhook URLs for incoming messages and calls
- TwiML configuration for call handling

Support Board configuration:
- Twilio Account SID
- Twilio Auth Token
- Phone Number(s)
- Webhook Endpoint URL`
      },
      {
        integrationName: 'Telegram Bot',
        integrationType: 'messaging_channel' as const,
        providerName: 'Telegram Bot API',
        features: ['Bot messaging', 'Inline keyboards', 'File sharing', 'Group support'],
        additionalContext: `Telegram Bot integration:
- Create bot via BotFather
- Bot Token for API authentication
- Webhook URL for receiving updates
- Optional: Custom keyboard configurations

Support Board configuration:
- Bot Token
- Webhook URL
- Bot username`
      }
    ];
  }

  async generateChannelSetupGuides(createdBy?: string): Promise<Array<{ articleId: string; title: string; error?: string }>> {
    const channels = this.getChannelDefinitions();

    const promises = channels.map(async (channel) => {
      try {
        const result = await this.createAndSaveDocumentation(channel, createdBy);
        console.log(`Created documentation: ${result.title}`);
        return result;
      } catch (error: any) {
        console.error(`Failed to create documentation for ${channel.integrationName}:`, error);
        return { articleId: '', title: channel.integrationName, error: error.message || 'Failed to generate' };
      }
    });

    const results = await Promise.all(promises);
    return results.filter(r => r.articleId !== '');
  }
}

export const documentationGeneratorService = DocumentationGeneratorService.getInstance();
