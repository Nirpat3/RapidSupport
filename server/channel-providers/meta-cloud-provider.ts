import crypto from 'crypto';
import type { ChannelAccount, ChannelTemplate } from "@shared/schema";
import type {
  ChannelProvider,
  InboundMessage,
  OutboundMessage,
  SendMessageResult,
  DeliveryStatus,
  TemplateComponent,
} from './types';

const META_GRAPH_API_VERSION = 'v18.0';
const META_GRAPH_API_BASE = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;

export class MetaCloudProvider implements ChannelProvider {
  readonly providerName = 'meta_cloud' as const;
  readonly supportedChannels: readonly ('whatsapp' | 'facebook' | 'instagram')[] = ['whatsapp', 'facebook', 'instagram'];

  async initialize(account: ChannelAccount): Promise<void> {
    // Validate that required fields are present
    if (!account.accessToken) {
      throw new Error('Access token is required for Meta Cloud API');
    }
    if (account.channelType === 'whatsapp' && !account.phoneNumberId) {
      throw new Error('Phone Number ID is required for WhatsApp');
    }
    if ((account.channelType === 'facebook' || account.channelType === 'instagram') && !account.pageId) {
      throw new Error('Page ID is required for Facebook/Instagram');
    }
  }

  validateWebhook(payload: any, signature?: string): boolean {
    if (!signature || !payload.appSecret) {
      return false;
    }
    
    const expectedSignature = crypto
      .createHmac('sha256', payload.appSecret)
      .update(JSON.stringify(payload.body))
      .digest('hex');
    
    const providedSignature = signature.replace('sha256=', '');
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(providedSignature)
    );
  }

  parseInboundMessage(payload: any): InboundMessage | null {
    try {
      // Handle WhatsApp webhook format
      if (payload.object === 'whatsapp_business_account') {
        const entry = payload.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];
        
        if (!message) return null;

        const contact = value?.contacts?.[0];
        
        return {
          externalMessageId: message.id,
          externalConversationId: message.from,
          senderId: message.from,
          senderName: contact?.profile?.name,
          messageType: this.mapWhatsAppMessageType(message.type),
          content: this.extractWhatsAppContent(message),
          mediaUrl: message.image?.id || message.video?.id || message.audio?.id || message.document?.id,
          mediaMimeType: message.image?.mime_type || message.video?.mime_type || message.audio?.mime_type || message.document?.mime_type,
          timestamp: new Date(parseInt(message.timestamp) * 1000),
          replyToMessageId: message.context?.id,
          interactiveResponse: this.parseInteractiveResponse(message),
        };
      }

      // Handle Facebook Messenger webhook format
      if (payload.object === 'page') {
        const entry = payload.entry?.[0];
        const messaging = entry?.messaging?.[0];
        
        if (!messaging?.message) return null;

        return {
          externalMessageId: messaging.message.mid,
          externalConversationId: messaging.sender.id,
          senderId: messaging.sender.id,
          messageType: messaging.message.attachments ? this.mapFBAttachmentType(messaging.message.attachments[0]?.type) : 'text',
          content: messaging.message.text || '',
          mediaUrl: messaging.message.attachments?.[0]?.payload?.url,
          timestamp: new Date(messaging.timestamp),
        };
      }

      // Handle Instagram webhook format
      if (payload.object === 'instagram') {
        const entry = payload.entry?.[0];
        const messaging = entry?.messaging?.[0];
        
        if (!messaging?.message) return null;

        return {
          externalMessageId: messaging.message.mid,
          externalConversationId: messaging.sender.id,
          senderId: messaging.sender.id,
          messageType: messaging.message.attachments ? 'image' : 'text',
          content: messaging.message.text || '',
          mediaUrl: messaging.message.attachments?.[0]?.payload?.url,
          timestamp: new Date(messaging.timestamp),
        };
      }

      return null;
    } catch (error) {
      console.error('Error parsing inbound message:', error);
      return null;
    }
  }

  parseDeliveryStatus(payload: any): DeliveryStatus | null {
    try {
      // WhatsApp status updates
      if (payload.object === 'whatsapp_business_account') {
        const entry = payload.entry?.[0];
        const changes = entry?.changes?.[0];
        const statuses = changes?.value?.statuses?.[0];
        
        if (!statuses) return null;

        return {
          externalMessageId: statuses.id,
          status: this.mapWhatsAppStatus(statuses.status),
          timestamp: new Date(parseInt(statuses.timestamp) * 1000),
          errorCode: statuses.errors?.[0]?.code?.toString(),
          errorMessage: statuses.errors?.[0]?.message,
        };
      }

      // Facebook/Instagram delivery receipts
      if (payload.object === 'page' || payload.object === 'instagram') {
        const entry = payload.entry?.[0];
        const messaging = entry?.messaging?.[0];
        
        if (messaging?.delivery) {
          return {
            externalMessageId: messaging.delivery.mids?.[0] || '',
            status: 'delivered',
            timestamp: new Date(messaging.timestamp),
          };
        }
        
        if (messaging?.read) {
          return {
            externalMessageId: messaging.read.watermark || '',
            status: 'read',
            timestamp: new Date(messaging.timestamp),
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error parsing delivery status:', error);
      return null;
    }
  }

  async sendMessage(account: ChannelAccount, message: OutboundMessage): Promise<SendMessageResult> {
    try {
      if (account.channelType === 'whatsapp') {
        return await this.sendWhatsAppMessage(account, message);
      } else if (account.channelType === 'facebook' || account.channelType === 'instagram') {
        return await this.sendMessengerMessage(account, message);
      }
      
      return { success: false, error: 'Unsupported channel type' };
    } catch (error: any) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    }
  }

  async sendTemplate(
    account: ChannelAccount,
    to: string,
    template: ChannelTemplate,
    variables: Record<string, string>
  ): Promise<SendMessageResult> {
    try {
      if (account.channelType !== 'whatsapp') {
        return { success: false, error: 'Templates are only supported for WhatsApp' };
      }

      const components: any[] = [];
      
      // Build header component if needed
      if (template.headerType && template.headerType !== 'NONE') {
        const headerParams = this.buildTemplateParameters(template.headerText || '', variables);
        if (headerParams.length > 0) {
          components.push({
            type: 'header',
            parameters: headerParams,
          });
        }
      }
      
      // Build body component
      const bodyParams = this.buildTemplateParameters(template.bodyText, variables);
      if (bodyParams.length > 0) {
        components.push({
          type: 'body',
          parameters: bodyParams,
        });
      }

      const response = await fetch(`${META_GRAPH_API_BASE}/${account.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'template',
          template: {
            name: template.name,
            language: { code: template.language },
            components: components.length > 0 ? components : undefined,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || 'Failed to send template',
          errorCode: data.error?.code?.toString(),
        };
      }

      return {
        success: true,
        externalMessageId: data.messages?.[0]?.id,
      };
    } catch (error: any) {
      console.error('Error sending template:', error);
      return { success: false, error: error.message };
    }
  }

  async getMediaUrl(account: ChannelAccount, mediaId: string): Promise<string | null> {
    try {
      const response = await fetch(`${META_GRAPH_API_BASE}/${mediaId}`, {
        headers: {
          'Authorization': `Bearer ${account.accessToken}`,
        },
      });

      if (!response.ok) return null;

      const data = await response.json();
      return data.url || null;
    } catch (error) {
      console.error('Error getting media URL:', error);
      return null;
    }
  }

  async downloadMedia(account: ChannelAccount, mediaUrl: string): Promise<Buffer | null> {
    try {
      const response = await fetch(mediaUrl, {
        headers: {
          'Authorization': `Bearer ${account.accessToken}`,
        },
      });

      if (!response.ok) return null;

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('Error downloading media:', error);
      return null;
    }
  }

  async checkHealth(account: ChannelAccount): Promise<{ healthy: boolean; error?: string }> {
    try {
      let endpoint = '';
      
      if (account.channelType === 'whatsapp') {
        endpoint = `${META_GRAPH_API_BASE}/${account.phoneNumberId}`;
      } else {
        endpoint = `${META_GRAPH_API_BASE}/${account.pageId}`;
      }

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${account.accessToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        return { healthy: false, error: data.error?.message || 'API check failed' };
      }

      return { healthy: true };
    } catch (error: any) {
      return { healthy: false, error: error.message };
    }
  }

  // Private helper methods

  private async sendWhatsAppMessage(account: ChannelAccount, message: OutboundMessage): Promise<SendMessageResult> {
    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: message.to,
    };

    switch (message.messageType) {
      case 'text':
        payload.type = 'text';
        payload.text = { body: message.content };
        break;
      
      case 'image':
        payload.type = 'image';
        payload.image = {
          link: message.mediaUrl,
          caption: message.caption,
        };
        break;
      
      case 'video':
        payload.type = 'video';
        payload.video = {
          link: message.mediaUrl,
          caption: message.caption,
        };
        break;
      
      case 'audio':
        payload.type = 'audio';
        payload.audio = { link: message.mediaUrl };
        break;
      
      case 'document':
        payload.type = 'document';
        payload.document = {
          link: message.mediaUrl,
          caption: message.caption,
        };
        break;
      
      case 'interactive':
        payload.type = 'interactive';
        payload.interactive = message.interactiveMessage;
        break;
      
      default:
        return { success: false, error: 'Unsupported message type' };
    }

    const response = await fetch(`${META_GRAPH_API_BASE}/${account.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || 'Failed to send message',
        errorCode: data.error?.code?.toString(),
      };
    }

    return {
      success: true,
      externalMessageId: data.messages?.[0]?.id,
    };
  }

  private async sendMessengerMessage(account: ChannelAccount, message: OutboundMessage): Promise<SendMessageResult> {
    const payload: any = {
      recipient: { id: message.to },
    };

    if (message.messageType === 'text') {
      payload.message = { text: message.content };
    } else if (['image', 'video', 'audio', 'document'].includes(message.messageType)) {
      payload.message = {
        attachment: {
          type: message.messageType === 'document' ? 'file' : message.messageType,
          payload: { url: message.mediaUrl, is_reusable: true },
        },
      };
    } else {
      return { success: false, error: 'Unsupported message type for Messenger' };
    }

    const response = await fetch(`${META_GRAPH_API_BASE}/${account.pageId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || 'Failed to send message',
        errorCode: data.error?.code?.toString(),
      };
    }

    return {
      success: true,
      externalMessageId: data.message_id,
    };
  }

  private mapWhatsAppMessageType(type: string): InboundMessage['messageType'] {
    const typeMap: Record<string, InboundMessage['messageType']> = {
      text: 'text',
      image: 'image',
      video: 'video',
      audio: 'audio',
      document: 'document',
      location: 'location',
      contacts: 'contact',
      interactive: 'interactive',
      button: 'interactive',
    };
    return typeMap[type] || 'text';
  }

  private mapFBAttachmentType(type: string): InboundMessage['messageType'] {
    const typeMap: Record<string, InboundMessage['messageType']> = {
      image: 'image',
      video: 'video',
      audio: 'audio',
      file: 'document',
    };
    return typeMap[type] || 'document';
  }

  private extractWhatsAppContent(message: any): string {
    if (message.text) return message.text.body;
    if (message.image?.caption) return message.image.caption;
    if (message.video?.caption) return message.video.caption;
    if (message.document?.caption) return message.document.caption;
    if (message.interactive?.button_reply?.title) return message.interactive.button_reply.title;
    if (message.interactive?.list_reply?.title) return message.interactive.list_reply.title;
    if (message.location) {
      return `Location: ${message.location.latitude}, ${message.location.longitude}`;
    }
    return '';
  }

  private parseInteractiveResponse(message: any): InboundMessage['interactiveResponse'] {
    if (!message.interactive) return undefined;

    if (message.interactive.button_reply) {
      return {
        type: 'button_reply',
        buttonId: message.interactive.button_reply.id,
        buttonText: message.interactive.button_reply.title,
      };
    }

    if (message.interactive.list_reply) {
      return {
        type: 'list_reply',
        listId: message.interactive.list_reply.id,
        listTitle: message.interactive.list_reply.title,
      };
    }

    return undefined;
  }

  private mapWhatsAppStatus(status: string): DeliveryStatus['status'] {
    const statusMap: Record<string, DeliveryStatus['status']> = {
      sent: 'sent',
      delivered: 'delivered',
      read: 'read',
      failed: 'failed',
    };
    return statusMap[status] || 'sent';
  }

  private buildTemplateParameters(text: string, variables: Record<string, string>): any[] {
    const params: any[] = [];
    const regex = /\{\{(\d+)\}\}/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      const index = match[1];
      const value = variables[index] || variables[`var${index}`] || '';
      params.push({ type: 'text', text: value });
    }
    
    return params;
  }
}
