import { Router, Request, Response } from 'express';
import type { IStorage } from './storage';
import { AIService } from './ai-service';

export function setupWebhooks(storage: IStorage): Router {
  const router = Router();

  /**
   * WhatsApp Business API Webhook
   * Receives messages from WhatsApp via Meta's Cloud API
   */
  router.post('/webhooks/whatsapp', async (req: Request, res: Response) => {
    try {
      const { object, entry } = req.body;

      // Verify it's a WhatsApp message
      if (object !== 'whatsapp_business_account') {
        return res.sendStatus(404);
      }

      for (const item of entry) {
        const changes = item.changes || [];
        
        for (const change of changes) {
          if (change.field === 'messages') {
            const messages = change.value.messages || [];
            
            for (const message of messages) {
              // Process incoming WhatsApp message
              await processWhatsAppMessage({
                from: message.from, // WhatsApp phone number
                messageId: message.id,
                text: message.text?.body || '',
                timestamp: message.timestamp,
                storage
              });
            }
          }
        }
      }

      res.sendStatus(200);
    } catch (error) {
      console.error('WhatsApp webhook error:', error);
      res.sendStatus(500);
    }
  });

  /**
   * WhatsApp Verification Webhook
   * Required by Meta for webhook setup
   */
  router.get('/webhooks/whatsapp', (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'support_board_verify';

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WhatsApp webhook verified');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  });

  /**
   * Telegram Bot Webhook
   * Receives messages from Telegram Bot API
   */
  router.post('/webhooks/telegram', async (req: Request, res: Response) => {
    try {
      const { message, callback_query } = req.body;

      if (message) {
        await processTelegramMessage({
          chatId: message.chat.id,
          messageId: message.message_id,
          from: message.from,
          text: message.text || message.caption || '',
          timestamp: message.date,
          storage
        });
      }

      if (callback_query) {
        // Handle button callbacks
        await processTelegramCallback({
          queryId: callback_query.id,
          chatId: callback_query.message.chat.id,
          from: callback_query.from,
          data: callback_query.data,
          storage
        });
      }

      res.sendStatus(200);
    } catch (error) {
      console.error('Telegram webhook error:', error);
      res.sendStatus(500);
    }
  });

  /**
   * Facebook Messenger Webhook
   * Receives messages from Facebook Messenger Platform
   */
  router.post('/webhooks/messenger', async (req: Request, res: Response) => {
    try {
      const { object, entry } = req.body;

      if (object !== 'page') {
        return res.sendStatus(404);
      }

      for (const item of entry) {
        const messaging = item.messaging || [];
        
        for (const event of messaging) {
          if (event.message) {
            await processMessengerMessage({
              senderId: event.sender.id,
              messageId: event.message.mid,
              text: event.message.text || '',
              timestamp: event.timestamp,
              storage
            });
          }
        }
      }

      res.sendStatus(200);
    } catch (error) {
      console.error('Messenger webhook error:', error);
      res.sendStatus(500);
    }
  });

  /**
   * Messenger Verification Webhook
   * Required by Facebook for webhook setup
   */
  router.get('/webhooks/messenger', (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const VERIFY_TOKEN = process.env.MESSENGER_VERIFY_TOKEN || 'support_board_verify';

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Messenger webhook verified');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  });

  return router;
}

/**
 * Process incoming WhatsApp message
 */
async function processWhatsAppMessage(params: {
  from: string;
  messageId: string;
  text: string;
  timestamp: string;
  storage: IStorage;
}) {
  const { from, messageId, text, storage } = params;

  // Find or create customer based on WhatsApp number
  let customer = await storage.getCustomers({ phone: from });
  
  if (!customer || customer.length === 0) {
    customer = [await storage.createCustomer({
      name: `WhatsApp User ${from.slice(-4)}`,
      phone: from,
      channel: 'whatsapp',
      hasPortalAccess: false
    })];
  }

  // Find or create conversation
  let conversations = await storage.getConversationsByCustomer(customer[0].id);
  let activeConversation = conversations.find(c => c.status === 'open' || c.status === 'pending');

  if (!activeConversation) {
    activeConversation = await storage.createConversation({
      customerId: customer[0].id,
      status: 'pending',
      priority: 'medium',
      title: `WhatsApp: ${text.substring(0, 50)}`,
      isAnonymous: false,
      aiAssistanceEnabled: true
    });
  }

  // Save customer message
  await storage.createMessage({
    conversationId: activeConversation.id,
    content: text,
    senderType: 'customer',
    scope: 'customer',
    externalMessageId: messageId
  });

  // Generate AI response
  const aiResponse = await AIService.generateSmartAgentResponse(
    text,
    activeConversation.id
  );

  // Save AI response
  await storage.createMessage({
    conversationId: activeConversation.id,
    content: aiResponse.response,
    senderType: 'system',
    scope: 'customer'
  });

  // Send response back to WhatsApp (requires WhatsApp Business API credentials)
  await sendWhatsAppMessage(from, aiResponse.response);

  console.log(`WhatsApp message processed for ${from}`);
}

/**
 * Process incoming Telegram message
 */
async function processTelegramMessage(params: {
  chatId: number;
  messageId: number;
  from: any;
  text: string;
  timestamp: number;
  storage: IStorage;
}) {
  const { chatId, messageId, from, text, storage } = params;
  const telegramId = `telegram_${chatId}`;

  // Find or create customer
  let customer = await storage.getCustomers({ email: `${telegramId}@telegram.local` });
  
  if (!customer || customer.length === 0) {
    customer = [await storage.createCustomer({
      name: from.first_name + (from.last_name ? ` ${from.last_name}` : ''),
      email: `${telegramId}@telegram.local`,
      channel: 'telegram',
      hasPortalAccess: false
    })];
  }

  // Find or create conversation
  let conversations = await storage.getConversationsByCustomer(customer[0].id);
  let activeConversation = conversations.find(c => c.status === 'open' || c.status === 'pending');

  if (!activeConversation) {
    activeConversation = await storage.createConversation({
      customerId: customer[0].id,
      status: 'pending',
      priority: 'medium',
      title: `Telegram: ${text.substring(0, 50)}`,
      isAnonymous: false,
      aiAssistanceEnabled: true
    });
  }

  // Save customer message
  await storage.createMessage({
    conversationId: activeConversation.id,
    content: text,
    senderType: 'customer',
    scope: 'customer',
    externalMessageId: String(messageId)
  });

  // Generate AI response
  const aiResponse = await AIService.generateSmartAgentResponse(
    text,
    activeConversation.id
  );

  // Save AI response
  await storage.createMessage({
    conversationId: activeConversation.id,
    content: aiResponse.response,
    senderType: 'system',
    scope: 'customer'
  });

  // Send response back to Telegram
  await sendTelegramMessage(chatId, aiResponse.response);

  console.log(`Telegram message processed for chat ${chatId}`);
}

/**
 * Process Telegram callback query (button press)
 */
async function processTelegramCallback(params: {
  queryId: string;
  chatId: number;
  from: any;
  data: string;
  storage: IStorage;
}) {
  const { queryId, chatId, data } = params;

  // Handle button actions (e.g., "rate_good", "rate_bad", "request_human")
  console.log(`Telegram callback: ${data} from chat ${chatId}`);
  
  // Answer callback query to remove loading state
  await answerTelegramCallback(queryId, 'Thank you for your feedback!');
}

/**
 * Process incoming Messenger message
 */
async function processMessengerMessage(params: {
  senderId: string;
  messageId: string;
  text: string;
  timestamp: number;
  storage: IStorage;
}) {
  const { senderId, messageId, text, storage } = params;
  const messengerId = `messenger_${senderId}`;

  // Find or create customer
  let customer = await storage.getCustomers({ email: `${messengerId}@messenger.local` });
  
  if (!customer || customer.length === 0) {
    customer = [await storage.createCustomer({
      name: `Messenger User ${senderId.slice(-4)}`,
      email: `${messengerId}@messenger.local`,
      channel: 'messenger',
      hasPortalAccess: false
    })];
  }

  // Find or create conversation
  let conversations = await storage.getConversationsByCustomer(customer[0].id);
  let activeConversation = conversations.find(c => c.status === 'open' || c.status === 'pending');

  if (!activeConversation) {
    activeConversation = await storage.createConversation({
      customerId: customer[0].id,
      status: 'pending',
      priority: 'medium',
      title: `Messenger: ${text.substring(0, 50)}`,
      isAnonymous: false,
      aiAssistanceEnabled: true
    });
  }

  // Save customer message
  await storage.createMessage({
    conversationId: activeConversation.id,
    content: text,
    senderType: 'customer',
    scope: 'customer',
    externalMessageId: messageId
  });

  // Generate AI response
  const aiResponse = await AIService.generateSmartAgentResponse(
    text,
    activeConversation.id
  );

  // Save AI response
  await storage.createMessage({
    conversationId: activeConversation.id,
    content: aiResponse.response,
    senderType: 'system',
    scope: 'customer'
  });

  // Send response back to Messenger
  await sendMessengerMessage(senderId, aiResponse.response);

  console.log(`Messenger message processed for ${senderId}`);
}

/**
 * Send message to WhatsApp
 * Requires WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN env vars
 */
async function sendWhatsAppMessage(to: string, text: string) {
  const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.warn('WhatsApp credentials not configured');
    return;
  }

  const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;
  
  await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      text: { body: text }
    })
  });
}

/**
 * Send message to Telegram
 * Requires TELEGRAM_BOT_TOKEN env var
 */
async function sendTelegramMessage(chatId: number, text: string) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

  if (!BOT_TOKEN) {
    console.warn('Telegram bot token not configured');
    return;
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown'
    })
  });
}

/**
 * Answer Telegram callback query
 */
async function answerTelegramCallback(queryId: string, text: string) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

  if (!BOT_TOKEN) return;

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`;
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: queryId,
      text
    })
  });
}

/**
 * Send message to Facebook Messenger
 * Requires MESSENGER_PAGE_ACCESS_TOKEN env var
 */
async function sendMessengerMessage(recipientId: string, text: string) {
  const PAGE_ACCESS_TOKEN = process.env.MESSENGER_PAGE_ACCESS_TOKEN;

  if (!PAGE_ACCESS_TOKEN) {
    console.warn('Messenger page access token not configured');
    return;
  }

  const url = `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text }
    })
  });
}
