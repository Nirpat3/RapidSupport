import crypto from 'crypto';
import type { ChannelAccount, ChannelTemplate } from "@shared/schema";
import type {
  ChannelProvider,
  InboundMessage,
  OutboundMessage,
  SendMessageResult,
  DeliveryStatus,
} from './types';

const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01';

export class TwilioProvider implements ChannelProvider {
  readonly providerName = 'twilio' as const;
  readonly supportedChannels: readonly ('whatsapp' | 'facebook' | 'instagram')[] = ['whatsapp', 'facebook'];

  async initialize(account: ChannelAccount): Promise<void> {
    if (!account.twilioAccountSid || !account.twilioAuthToken) {
      throw new Error('Twilio Account SID and Auth Token are required');
    }
    if (!account.twilioMessagingSid && !account.phoneNumber) {
      throw new Error('Either Messaging Service SID or Phone Number is required');
    }
  }

  validateWebhook(payload: any, signature?: string): boolean {
    if (!signature || !payload.authToken || !payload.url) {
      return false;
    }

    // Twilio signature validation
    const params = payload.body || {};
    const sortedKeys = Object.keys(params).sort();
    let dataString = payload.url;
    
    for (const key of sortedKeys) {
      dataString += key + params[key];
    }

    const expectedSignature = crypto
      .createHmac('sha1', payload.authToken)
      .update(Buffer.from(dataString, 'utf-8'))
      .digest('base64');

    return signature === expectedSignature;
  }

  parseInboundMessage(payload: any): InboundMessage | null {
    try {
      // Twilio webhook format for WhatsApp/SMS
      if (!payload.MessageSid) return null;

      const from = payload.From || '';
      const isWhatsApp = from.startsWith('whatsapp:');
      const senderId = isWhatsApp ? from.replace('whatsapp:', '') : from;

      // Determine message type
      let messageType: InboundMessage['messageType'] = 'text';
      let mediaUrl: string | undefined;
      let mediaMimeType: string | undefined;

      if (payload.NumMedia && parseInt(payload.NumMedia) > 0) {
        mediaUrl = payload.MediaUrl0;
        mediaMimeType = payload.MediaContentType0;
        
        if (mediaMimeType?.startsWith('image/')) {
          messageType = 'image';
        } else if (mediaMimeType?.startsWith('video/')) {
          messageType = 'video';
        } else if (mediaMimeType?.startsWith('audio/')) {
          messageType = 'audio';
        } else {
          messageType = 'document';
        }
      }

      // Handle button responses
      let interactiveResponse: InboundMessage['interactiveResponse'];
      if (payload.ButtonPayload) {
        messageType = 'interactive';
        interactiveResponse = {
          type: 'button_reply',
          buttonId: payload.ButtonPayload,
          buttonText: payload.ButtonText || payload.Body,
        };
      }

      return {
        externalMessageId: payload.MessageSid,
        externalConversationId: payload.ConversationSid,
        senderId,
        senderName: payload.ProfileName,
        messageType,
        content: payload.Body || '',
        mediaUrl,
        mediaMimeType,
        timestamp: new Date(),
        interactiveResponse,
      };
    } catch (error) {
      console.error('Error parsing Twilio inbound message:', error);
      return null;
    }
  }

  parseDeliveryStatus(payload: any): DeliveryStatus | null {
    try {
      if (!payload.MessageSid || !payload.MessageStatus) return null;

      return {
        externalMessageId: payload.MessageSid,
        status: this.mapTwilioStatus(payload.MessageStatus),
        timestamp: new Date(),
        errorCode: payload.ErrorCode?.toString(),
        errorMessage: payload.ErrorMessage,
      };
    } catch (error) {
      console.error('Error parsing Twilio delivery status:', error);
      return null;
    }
  }

  async sendMessage(account: ChannelAccount, message: OutboundMessage): Promise<SendMessageResult> {
    try {
      const credentials = Buffer.from(
        `${account.twilioAccountSid}:${account.twilioAuthToken}`
      ).toString('base64');

      const formData = new URLSearchParams();
      
      // Set From number (with whatsapp: prefix if needed)
      const from = account.channelType === 'whatsapp' 
        ? `whatsapp:${account.phoneNumber}` 
        : account.phoneNumber;
      
      const to = account.channelType === 'whatsapp' && !message.to.startsWith('whatsapp:')
        ? `whatsapp:${message.to}`
        : message.to;

      if (account.twilioMessagingSid) {
        formData.append('MessagingServiceSid', account.twilioMessagingSid);
      } else {
        formData.append('From', from!);
      }
      
      formData.append('To', to);

      if (message.messageType === 'text') {
        formData.append('Body', message.content || '');
      } else if (['image', 'video', 'audio', 'document'].includes(message.messageType)) {
        if (message.caption) {
          formData.append('Body', message.caption);
        }
        formData.append('MediaUrl', message.mediaUrl || '');
      }

      const response = await fetch(
        `${TWILIO_API_BASE}/Accounts/${account.twilioAccountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Failed to send message',
          errorCode: data.code?.toString(),
        };
      }

      return {
        success: true,
        externalMessageId: data.sid,
      };
    } catch (error: any) {
      console.error('Error sending Twilio message:', error);
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

      const credentials = Buffer.from(
        `${account.twilioAccountSid}:${account.twilioAuthToken}`
      ).toString('base64');

      // Build content variables for Twilio Content API
      const contentVariables: Record<string, string> = {};
      Object.entries(variables).forEach(([key, value], index) => {
        contentVariables[`${index + 1}`] = value;
      });

      const formData = new URLSearchParams();
      
      if (account.twilioMessagingSid) {
        formData.append('MessagingServiceSid', account.twilioMessagingSid);
      } else {
        formData.append('From', `whatsapp:${account.phoneNumber}`);
      }
      
      formData.append('To', to.startsWith('whatsapp:') ? to : `whatsapp:${to}`);
      formData.append('ContentSid', template.externalId || template.name);
      formData.append('ContentVariables', JSON.stringify(contentVariables));

      const response = await fetch(
        `${TWILIO_API_BASE}/Accounts/${account.twilioAccountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Failed to send template',
          errorCode: data.code?.toString(),
        };
      }

      return {
        success: true,
        externalMessageId: data.sid,
      };
    } catch (error: any) {
      console.error('Error sending Twilio template:', error);
      return { success: false, error: error.message };
    }
  }

  async getMediaUrl(account: ChannelAccount, mediaId: string): Promise<string | null> {
    // Twilio media URLs are directly accessible with auth
    return mediaId;
  }

  async downloadMedia(account: ChannelAccount, mediaUrl: string): Promise<Buffer | null> {
    try {
      const credentials = Buffer.from(
        `${account.twilioAccountSid}:${account.twilioAuthToken}`
      ).toString('base64');

      const response = await fetch(mediaUrl, {
        headers: {
          'Authorization': `Basic ${credentials}`,
        },
      });

      if (!response.ok) return null;

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('Error downloading Twilio media:', error);
      return null;
    }
  }

  async checkHealth(account: ChannelAccount): Promise<{ healthy: boolean; error?: string }> {
    try {
      const credentials = Buffer.from(
        `${account.twilioAccountSid}:${account.twilioAuthToken}`
      ).toString('base64');

      const response = await fetch(
        `${TWILIO_API_BASE}/Accounts/${account.twilioAccountSid}.json`,
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        return { healthy: false, error: data.message || 'API check failed' };
      }

      const data = await response.json();
      
      if (data.status !== 'active') {
        return { healthy: false, error: `Account status: ${data.status}` };
      }

      return { healthy: true };
    } catch (error: any) {
      return { healthy: false, error: error.message };
    }
  }

  private mapTwilioStatus(status: string): DeliveryStatus['status'] {
    const statusMap: Record<string, DeliveryStatus['status']> = {
      queued: 'sent',
      sending: 'sent',
      sent: 'sent',
      delivered: 'delivered',
      read: 'read',
      failed: 'failed',
      undelivered: 'failed',
    };
    return statusMap[status.toLowerCase()] || 'sent';
  }
}
