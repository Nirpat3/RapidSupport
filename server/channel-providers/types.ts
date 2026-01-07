import type { ChannelAccount, ChannelContact, ChannelMessage, ChannelTemplate } from "@shared/schema";

export interface InboundMessage {
  externalMessageId: string;
  externalConversationId?: string;
  senderId: string;
  senderName?: string;
  senderProfilePic?: string;
  messageType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact' | 'interactive';
  content: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  mediaSize?: number;
  timestamp: Date;
  replyToMessageId?: string;
  interactiveResponse?: {
    type: 'button_reply' | 'list_reply';
    buttonId?: string;
    buttonText?: string;
    listId?: string;
    listTitle?: string;
  };
}

export interface OutboundMessage {
  to: string;
  messageType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'template' | 'interactive';
  content?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  caption?: string;
  templateName?: string;
  templateLanguage?: string;
  templateComponents?: TemplateComponent[];
  interactiveMessage?: InteractiveMessage;
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters: TemplateParameter[];
}

export interface TemplateParameter {
  type: 'text' | 'image' | 'video' | 'document';
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  documentUrl?: string;
}

export interface InteractiveMessage {
  type: 'button' | 'list';
  header?: {
    type: 'text' | 'image' | 'video' | 'document';
    text?: string;
    mediaUrl?: string;
  };
  body: {
    text: string;
  };
  footer?: {
    text: string;
  };
  action: {
    buttons?: Array<{
      type: 'reply';
      reply: {
        id: string;
        title: string;
      };
    }>;
    button?: string;
    sections?: Array<{
      title: string;
      rows: Array<{
        id: string;
        title: string;
        description?: string;
      }>;
    }>;
  };
}

export interface SendMessageResult {
  success: boolean;
  externalMessageId?: string;
  error?: string;
  errorCode?: string;
}

export interface DeliveryStatus {
  externalMessageId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date;
  errorCode?: string;
  errorMessage?: string;
}

export interface WebhookPayload {
  provider: 'meta_cloud' | 'twilio';
  channelType: 'whatsapp' | 'facebook' | 'instagram';
  rawPayload: any;
}

export interface ChannelProvider {
  readonly providerName: 'meta_cloud' | 'twilio';
  readonly supportedChannels: readonly ('whatsapp' | 'facebook' | 'instagram')[];
  
  initialize(account: ChannelAccount): Promise<void>;
  
  validateWebhook(payload: any, signature?: string): boolean;
  
  parseInboundMessage(payload: any): InboundMessage | null;
  
  parseDeliveryStatus(payload: any): DeliveryStatus | null;
  
  sendMessage(account: ChannelAccount, message: OutboundMessage): Promise<SendMessageResult>;
  
  sendTemplate(account: ChannelAccount, to: string, template: ChannelTemplate, variables: Record<string, string>): Promise<SendMessageResult>;
  
  getMediaUrl(account: ChannelAccount, mediaId: string): Promise<string | null>;
  
  downloadMedia(account: ChannelAccount, mediaUrl: string): Promise<Buffer | null>;
  
  checkHealth(account: ChannelAccount): Promise<{ healthy: boolean; error?: string }>;
}

export interface ChannelProviderFactory {
  getProvider(providerName: 'meta_cloud' | 'twilio'): ChannelProvider;
}
