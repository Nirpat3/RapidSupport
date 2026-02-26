import type { RouteContext } from './types';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { fromZodError } from 'zod-validation-error';
import { storage } from '../storage';
import { AIService } from '../ai-service';
import { zodErrorResponse } from '../middleware/errors';
import {
  messageLimiter,
  customerChatUpload,
  createAnonymousCustomerSchema,
  sendCustomerMessageSchema
} from './shared';

export function registerCustomerChatRoutes({ app }: RouteContext) {
  const customerChatUploadDir = './uploads/customer-chat';
  
  app.get('/api/customer-chat/check-session/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      
      let conversation = await storage.getConversationBySession(sessionId);
      
      if (!conversation && clientIP !== 'unknown') {
        conversation = await storage.getConversationByIP(clientIP);
      }
      
      if (conversation) {
        res.json({
          ...conversation,
          ipAddress: clientIP
        });
      } else {
        res.json({
          conversationId: null,
          customerId: null,
          customerInfo: null,
          ipAddress: clientIP
        });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to check session' });
    }
  });

  app.get('/api/customer-chat/suggested-questions', async (req, res) => {
    try {
      const { customerId, sessionId } = req.query;
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      
      const questions = await AIService.generatePersonalizedQuestions(
        customerId as string | null,
        sessionId as string || '',
        clientIP
      );
      
      res.json({ questions });
    } catch (error) {
      console.error('Failed to generate personalized questions:', error);
      res.status(500).json({ 
        error: 'Failed to generate suggested questions',
        questions: [
          "How do I reset my password?",
          "What are your pricing plans?",
          "How can I upgrade my account?",
          "I need help with billing",
        ]
      });
    }
  });

  app.post('/api/customer-chat/create-customer', async (req, res) => {
    try {
      console.log('=== Customer Creation Request Started ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      if (!req.body.sessionId) {
        req.body.sessionId = randomUUID();
        console.log('Generated sessionId:', req.body.sessionId);
      }
      
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      req.body.ipAddress = clientIP;
      console.log('Client IP set to:', clientIP);
      
      console.log('Validating customer data with schema...');
      const customerData = createAnonymousCustomerSchema.parse(req.body);
      console.log('Schema validation passed:', JSON.stringify(customerData, null, 2));
      
      console.log('Calling storage.createAnonymousCustomer...');
      const wsServer = (app as any).wsServer;
      const dataToPass = {
        ...customerData,
        sessionId: req.body.sessionId
      };
      console.log('Data being passed to storage:', JSON.stringify(dataToPass, null, 2));
      const result = await storage.createAnonymousCustomer(dataToPass, wsServer);
      
      console.log('Customer created successfully - ID:', result.customerId);
      console.log('=== Customer Creation Request Completed ===');
      res.status(201).json(result);
    } catch (error) {
      console.error('=== Customer Creation Failed ===');
      console.error('Error type:', error instanceof z.ZodError ? 'Validation error' : 'Server error');
      console.error('Full error details:', error);
      
      if (error instanceof z.ZodError) {
        console.error('Zod validation errors:', error.errors);
        return res.status(400).json({ 
          error: 'Invalid customer data', 
          details: fromZodError(error).toString() 
        });
      }
      console.error('=== End Customer Creation Error ===');
      res.status(500).json({ error: 'Failed to create customer' });
    }
  });

  app.get('/api/customer-chat/messages/:conversationId', async (req, res) => {
    try {
      const { conversationId } = req.params;
      console.log(`[customer-chat/messages] Fetching messages for conversation: ${conversationId}`);
      const messages = await storage.getCustomerChatMessages(conversationId);
      console.log(`[customer-chat/messages] Returned ${messages.length} messages`);
      
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.json(messages);
    } catch (error) {
      console.error('[customer-chat/messages] Error fetching messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  app.post('/api/customer-chat/send-message', messageLimiter, async (req, res) => {
    try {
      const messageData = sendCustomerMessageSchema.parse(req.body);
      
      const existingConversation = await storage.getConversation(messageData.conversationId);
      if (existingConversation && existingConversation.status === 'closed') {
        console.log(`[send-message] Reopening closed conversation: ${messageData.conversationId}`);
        await storage.updateConversationStatus(messageData.conversationId, 'open');
      }
      
      let customerLanguage = (existingConversation as any)?.customerLanguage || 'en';
      let translatedContent: string | null = null;
      let originalLanguage: string | null = null;
      
      if (customerLanguage !== 'en') {
        console.log(`[send-message] Customer language is ${customerLanguage}, translating to English for agents`);
        const translation = await AIService.translateText(messageData.content, 'en', customerLanguage);
        translatedContent = translation.translatedText;
        originalLanguage = translation.detectedLanguage || customerLanguage;
      } else {
        if (messageData.content.length > 10) {
          const detection = await AIService.detectLanguage(messageData.content);
          if (detection.language !== 'en' && detection.confidence > 70) {
            console.log(`[send-message] Detected non-English language: ${detection.language}`);
            customerLanguage = detection.language;
            originalLanguage = detection.language;
            
            await storage.updateConversation(messageData.conversationId, {
              customerLanguage: customerLanguage
            });
            
            const translation = await AIService.translateText(messageData.content, 'en', customerLanguage);
            translatedContent = translation.translatedText;
          }
        }
      }
      
      const enhancedMessageData = {
        ...messageData,
        translatedContent,
        originalLanguage
      };
      
      const message = await storage.createCustomerMessage(enhancedMessageData);
      
      const conversation = await storage.getConversationWithCustomer(messageData.conversationId);
      if (conversation && conversation.customer) {
        await storage.createNotificationsForAllStaff(messageData.conversationId);
        
        const wsServer = (app as any).wsServer;
        if (wsServer && wsServer.broadcastNewMessageToStaff) {
          wsServer.broadcastNewMessageToStaff(conversation, conversation.customer, {
            id: message.id,
            content: message.content,
            translatedContent: (message as any).translatedContent,
            originalLanguage: (message as any).originalLanguage,
            senderType: message.senderType,
            timestamp: message.timestamp
          });
        }
        
        if (wsServer && wsServer.broadcastNewMessage) {
          wsServer.broadcastNewMessage(messageData.conversationId, {
            messageId: message.id,
            conversationId: message.conversationId,
            content: message.content,
            translatedContent: (message as any).translatedContent,
            originalLanguage: (message as any).originalLanguage,
            userId: message.senderId,
            userName: conversation.customer.name,
            userRole: 'customer',
            senderType: message.senderType,
            timestamp: message.timestamp,
            status: message.status
          });
          
          // Send push notifications to offline staff
          const allStaff = await storage.getAllUsers();
          const staffUserIds = allStaff.map((u: any) => u.id);
          wsServer.sendPushNotificationForMessage(
            messageData.conversationId,
            message.content,
            conversation.customer.name,
            { targetUserIds: staffUserIds }
          );
        }
      }
      
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(zodErrorResponse(error));
      }
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  app.post('/api/customer-chat/upload-files', customerChatUpload.array('files', 5), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const { messageId } = req.body;

      if (!messageId) {
        return res.status(400).json({ error: 'Message ID is required' });
      }

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const attachments = await Promise.all(
        files.map(async (file) => {
          return await storage.createAttachment({
            messageId,
            filename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            filePath: file.path,
          });
        })
      );

      res.status(201).json({ attachments });
    } catch (error) {
      console.error('Failed to upload customer chat files:', error);
      res.status(500).json({ error: 'Failed to upload files' });
    }
  });

  app.get('/api/customer-chat/files/:filename', (req, res) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(customerChatUploadDir, filename);
      
      const resolvedPath = path.resolve(filePath);
      const resolvedDir = path.resolve(customerChatUploadDir);
      
      if (!resolvedPath.startsWith(resolvedDir)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.sendFile(resolvedPath);
    } catch (error) {
      console.error('Failed to serve customer chat file:', error);
      res.status(500).json({ error: 'Failed to serve file' });
    }
  });

  app.post('/api/customer-chat/set-language', async (req, res) => {
    try {
      const { conversationId, language } = z.object({
        conversationId: z.string().uuid(),
        language: z.string().min(2).max(5),
      }).parse(req.body);
      
      console.log(`[set-language] Setting customer language to ${language} for conversation ${conversationId}`);
      
      await storage.updateConversation(conversationId, {
        customerLanguage: language
      });
      
      res.json({ success: true, language });
    } catch (error) {
      console.error('[set-language] Error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(zodErrorResponse(error));
      }
      res.status(500).json({ error: 'Failed to set language' });
    }
  });

  app.get('/api/customer-chat/conversation/:id/status', async (req, res) => {
    try {
      const conversationId = z.string().uuid().parse(req.params.id);
      
      console.log(`[GET /api/customer-chat/conversation/:id/status] Fetching status for conversation ${conversationId}`);
      
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        console.log(`[GET /api/customer-chat/conversation/:id/status] Conversation ${conversationId} not found`);
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      res.json({
        id: conversation.id,
        status: conversation.status,
        assignedAgentId: conversation.assignedAgentId
      });
    } catch (error) {
      console.error('[GET /api/customer-chat/conversation/:id/status] Error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(zodErrorResponse(error));
      }
      res.status(500).json({ error: 'Failed to fetch conversation status' });
    }
  });
}
