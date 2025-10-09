import OpenAI from 'openai';
import { Message, Conversation, AiTicketGeneration, AiAgent, KnowledgeBase, AiAgentSession, AiAgentLearning } from '@shared/schema';
import { storage } from './storage';
import { knowledgeRetrieval, type SearchResult, type RetrievalOptions } from './knowledge-retrieval';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ProofreadResult {
  originalText: string;
  suggestedText: string;
  improvements: string[];
  hasChanges: boolean;
}

export interface ConversationAnalysis {
  summary: string;
  suggestedTicketTitle: string;
  suggestedTicketDescription: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  keyIssues: string[];
  suggestedActions: string[];
}

export interface ConversationSentimentAnalysis {
  sentimentScore: number; // 0-100, 50 = neutral
  sentimentLabel: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
  summary: string; // AI summary of conversation tone and customer sentiment
  confidence: number; // AI confidence in sentiment analysis (0-100)
  customerSatisfactionIndicators: string[]; // Positive/negative indicators found in conversation
  recommendedFollowUp: string; // Suggested follow-up based on sentiment
}

export interface AIAgentResponse {
  response: string;
  confidence: number;
  requiresHumanTakeover: boolean;
  suggestedActions: string[];
  knowledgeUsed?: string[];
  agentId?: string;
  format?: 'regular' | 'steps'; // Format type for response presentation
}

export interface SmartAgentResponse extends AIAgentResponse {
  sessionId: string;
  messageCount: number;
  avgConfidence: number;
  shouldLearn: boolean;
}

export interface QueryAnalysis {
  type: 'instructional' | 'troubleshooting' | 'informational' | 'specific';
  intent: string;
  complexity: 'low' | 'medium' | 'high';
  wordCount: number;
  hasMultipleConcepts: boolean;
  hasQualifiers: boolean;
}

interface EnhancedSearchResult extends SearchResult {
  contextRelevance?: string;
}

export class AIService {
  /**
   * Proofread a message for grammar, clarity, and tone
   */
  static async proofreadMessage(message: string, context?: {
    isCustomerMessage?: boolean;
    conversationHistory?: string[];
  }): Promise<ProofreadResult> {
    try {
      const systemPrompt = context?.isCustomerMessage 
        ? `You are helping a customer improve their support message. Provide suggestions that:
- Fix grammar and spelling errors
- Improve clarity and readability
- Maintain a professional but friendly tone
- Keep the original meaning intact
- Make the message more effective for getting help`
        : `You are helping a support agent improve their response. Provide suggestions that:
- Fix grammar and spelling errors
- Improve professional tone and clarity
- Ensure empathetic and helpful language
- Make the response more effective and customer-friendly
- Maintain professionalism while being warm`;

      const userPrompt = `Please proofread this message and suggest improvements:

"${message}"

${context?.conversationHistory ? `
Context from conversation:
${context.conversationHistory.slice(-3).join('\n')}
` : ''}

Respond with a JSON object containing:
- originalText: the original message
- suggestedText: improved version (only if changes are needed)
- improvements: array of specific improvements made
- hasChanges: boolean indicating if any changes were suggested

If no improvements are needed, return hasChanges: false and suggestedText should be the same as originalText.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      // Parse AI response, handling markdown code blocks if present
      let responseContent = completion.choices[0].message.content || '{}';
      
      // Remove markdown code blocks if present (```json ... ```)
      responseContent = responseContent.replace(/```json\s*|\s*```/g, '').trim();
      
      const result = JSON.parse(responseContent);
      
      return {
        originalText: message,
        suggestedText: result.suggestedText || message,
        improvements: result.improvements || [],
        hasChanges: result.hasChanges || false,
      };
    } catch (error) {
      console.error('Error proofreading message:', error);
      return {
        originalText: message,
        suggestedText: message,
        improvements: [],
        hasChanges: false,
      };
    }
  }

  /**
   * Analyze a conversation and suggest ticket details
   */
  static async analyzeConversation(messages: Message[], customer?: any): Promise<ConversationAnalysis> {
    try {
      const conversationText = messages
        .map(msg => `${msg.senderType}: ${msg.content}`)
        .join('\n');

      const systemPrompt = `You are an AI assistant that analyzes customer support conversations to help create support tickets. 
Analyze the conversation and provide structured insights about the customer's issue.`;

      const userPrompt = `Analyze this customer support conversation and provide insights:

Conversation:
${conversationText}

${customer ? `Customer Info: ${customer.name} from ${customer.company || 'Unknown Company'}` : ''}

Provide a JSON response with:
- summary: Brief summary of the conversation (2-3 sentences)
- suggestedTicketTitle: Concise title for a support ticket
- suggestedTicketDescription: Detailed description for the ticket
- priority: "low", "medium", "high", or "urgent" based on urgency
- category: Category like "Technical Issue", "Billing", "Feature Request", etc.
- sentiment: "positive", "neutral", or "negative" customer sentiment
- keyIssues: Array of main issues identified
- suggestedActions: Array of recommended next steps`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1500,
      });

      // Parse AI response, handling markdown code blocks if present
      let responseContent = completion.choices[0].message.content || '{}';
      
      // Remove markdown code blocks if present (```json ... ```)
      responseContent = responseContent.replace(/```json\s*|\s*```/g, '').trim();
      
      const result = JSON.parse(responseContent);
      
      return {
        summary: result.summary || 'Conversation analysis not available',
        suggestedTicketTitle: result.suggestedTicketTitle || 'Support Request',
        suggestedTicketDescription: result.suggestedTicketDescription || 'Please see conversation for details',
        priority: result.priority || 'medium',
        category: result.category || 'General',
        sentiment: result.sentiment || 'neutral',
        keyIssues: result.keyIssues || [],
        suggestedActions: result.suggestedActions || [],
      };
    } catch (error) {
      console.error('Error analyzing conversation:', error);
      return {
        summary: 'Error analyzing conversation',
        suggestedTicketTitle: 'Support Request',
        suggestedTicketDescription: 'Please see conversation for details',
        priority: 'medium',
        category: 'General',
        sentiment: 'neutral',
        keyIssues: [],
        suggestedActions: [],
      };
    }
  }

  /**
   * Analyze conversation sentiment for customer satisfaction tracking
   */
  static async analyzeConversationSentiment(messages: Message[], customerName?: string): Promise<ConversationSentimentAnalysis> {
    try {
      const conversationText = messages
        .map(msg => `${msg.senderType}: ${msg.content}`)
        .join('\n');

      const systemPrompt = `You are an AI assistant specialized in analyzing customer support conversations to understand customer sentiment and satisfaction. 
Analyze the conversation tone, customer emotions, and overall satisfaction level throughout the interaction.`;

      const userPrompt = `Analyze this customer support conversation for sentiment and satisfaction:

Conversation:
${conversationText}

${customerName ? `Customer: ${customerName}` : ''}

Provide a JSON response with:
- sentimentScore: Number from 0-100 where 0 is very negative, 50 is neutral, 100 is very positive
- sentimentLabel: One of "very_negative", "negative", "neutral", "positive", "very_positive"
- summary: A detailed analysis (2-3 sentences) of the conversation tone, customer emotions, and how they felt about the support
- confidence: Your confidence level in this analysis from 0-100
- customerSatisfactionIndicators: Array of specific phrases or behaviors that indicate satisfaction or dissatisfaction
- recommendedFollowUp: Suggested follow-up action based on the sentiment (e.g., "Send satisfaction survey", "Proactive check-in needed", "No follow-up needed")

Focus on:
- Customer's emotional tone throughout the conversation
- Whether their issue was resolved to their satisfaction
- Signs of frustration, confusion, or appreciation
- Overall quality of the support experience from customer's perspective`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      // Parse AI response, handling markdown code blocks if present
      let responseContent = completion.choices[0].message.content || '{}';
      
      // Remove markdown code blocks if present (```json ... ```)
      responseContent = responseContent.replace(/```json\s*|\s*```/g, '').trim();
      
      const result = JSON.parse(responseContent);
      
      return {
        sentimentScore: result.sentimentScore || 50,
        sentimentLabel: result.sentimentLabel || 'neutral',
        summary: result.summary || 'Unable to analyze conversation sentiment',
        confidence: result.confidence || 50,
        customerSatisfactionIndicators: result.customerSatisfactionIndicators || [],
        recommendedFollowUp: result.recommendedFollowUp || 'No specific follow-up needed',
      };
    } catch (error) {
      console.error('Error analyzing conversation sentiment:', error);
      return {
        sentimentScore: 50,
        sentimentLabel: 'neutral',
        summary: 'Unable to analyze conversation sentiment due to an error',
        confidence: 0,
        customerSatisfactionIndicators: [],
        recommendedFollowUp: 'Manual review recommended',
      };
    }
  }

  /**
   * Generate personalized suggested questions based on customer history
   */
  static async generatePersonalizedQuestions(customerId: string | null, sessionId: string, ipAddress: string): Promise<string[]> {
    try {
      const defaultQuestions = [
        "How do I reset my password?",
        "What are your pricing plans?",
        "How can I upgrade my account?",
        "I need help with billing",
      ];

      // If no customer ID or session ID, return default questions
      if (!customerId && !sessionId) {
        return defaultQuestions;
      }

      // Get customer's conversation history
      let conversations: any[] = [];
      
      if (customerId) {
        conversations = await storage.getConversationsByCustomer(customerId);
      } else if (sessionId) {
        const sessionConv = await storage.getConversationBySession(sessionId);
        if (sessionConv) {
          conversations = [sessionConv];
        }
      }

      // If no previous conversations, check by IP
      if (conversations.length === 0 && ipAddress) {
        const ipConv = await storage.getConversationByIP(ipAddress);
        if (!ipConv) {
          return defaultQuestions;
        }
        conversations = [ipConv];
      }

      // If still no conversations, return defaults
      if (conversations.length === 0) {
        return defaultQuestions;
      }

      // Get messages from recent conversations (last 3)
      const recentConversations = conversations.slice(-3);
      let allMessages: Message[] = [];
      
      for (const conv of recentConversations) {
        const messages = await storage.getMessagesByConversation(conv.id);
        allMessages.push(...messages);
      }

      // Filter out internal messages
      const publicMessages = allMessages.filter(msg => msg.scope !== 'internal');

      if (publicMessages.length === 0) {
        return defaultQuestions;
      }

      // Generate contextual questions using AI
      const conversationText = publicMessages
        .slice(-20) // Last 20 messages
        .map(msg => `${msg.senderType}: ${msg.content}`)
        .join('\n');

      const systemPrompt = `You are an AI assistant that generates relevant, personalized support questions based on a customer's previous conversation history.`;

      const userPrompt = `Based on this customer's previous conversation history, generate 4 relevant follow-up questions they might want to ask:

Previous Conversations:
${conversationText}

Generate questions that:
1. Relate to topics discussed in their previous conversations
2. Address potential follow-up concerns or related issues
3. Are specific and actionable
4. Help them continue their support journey

Provide ONLY an array of 4 question strings in JSON format:
["Question 1", "Question 2", "Question 3", "Question 4"]`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 300,
      });

      let responseContent = completion.choices[0].message.content || '[]';
      responseContent = responseContent.replace(/```json\s*|\s*```/g, '').trim();
      
      const questions = JSON.parse(responseContent);
      
      if (Array.isArray(questions) && questions.length > 0) {
        return questions.slice(0, 4);
      }

      return defaultQuestions;
    } catch (error) {
      console.error('Error generating personalized questions:', error);
      return [
        "How do I reset my password?",
        "What are your pricing plans?",
        "How can I upgrade my account?",
        "I need help with billing",
      ];
    }
  }

  /**
   * Generate AI agent response for customer queries
   */
  static async generateAgentResponse(
    customerMessage: string, 
    conversationHistory: string[],
    knowledgeBase?: string[]
  ): Promise<AIAgentResponse> {
    try {
      const systemPrompt = `You are Alex, a helpful customer support AI assistant. Act like a human agent with these guidelines:
- ONLY answer questions using the provided knowledge base information
- Maintain a professional, empathetic, and friendly tone like a human agent would
- When you need to escalate, say "Let me put you on a brief hold while I consult with my colleague for more details about this" 
- Never reveal you're an AI - act as a human support agent named Alex
- Never use general knowledge beyond what is provided

CRITICAL GUIDELINES:
- You MUST ONLY use information from the provided Knowledge Base
- If the knowledge base doesn't contain relevant information, use the colleague consultation phrase and require human takeover
- NEVER provide answers from general AI knowledge
- If confidence is low or no relevant knowledge base content exists, use human-like language and require human takeover
- Always respond as if you're a human agent who sometimes needs to check with colleagues`;

      const contextInfo = knowledgeBase?.length 
        ? `\nKnowledge Base:\n${knowledgeBase.join('\n')}\n`
        : '\nKnowledge Base: No relevant knowledge base articles available.\n';

      const conversationContext = conversationHistory.length 
        ? `\nConversation History:\n${conversationHistory.slice(-5).join('\n')}\n`
        : '';

      const userPrompt = `${contextInfo}${conversationContext}
Customer Message: "${customerMessage}"

Provide a JSON response with:
- response: Your helpful response to the customer (ONLY use knowledge base information)
- confidence: Number from 0-100 indicating confidence in your response
- requiresHumanTakeover: Boolean if human agent should take over
- suggestedActions: Array of recommended next steps
- format: Either "regular" or "steps" (use "steps" for instruction-based queries)

FORMATTING GUIDELINES:
- Use format: "steps" for how-to questions, tutorials, troubleshooting, setup instructions, or process explanations
- Use format: "regular" for simple answers, information requests, or general inquiries
- When using "steps" format, structure your response with numbered steps:
  "1. First step description\n2. Second step description\n3. Third step description"

IMPORTANT: If no relevant knowledge base information is available, set requiresHumanTakeover to true and explain that you need to connect them with a human agent who can help with their specific question.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.4,
        max_tokens: 1000,
      });

      // Parse AI response, handling markdown code blocks if present
      let responseContent = completion.choices[0].message.content || '{}';
      
      // Remove markdown code blocks if present (```json ... ```)
      responseContent = responseContent.replace(/```json\s*|\s*```/g, '').trim();
      
      const result = JSON.parse(responseContent);
      
      // Server-side fallback: Detect step-by-step content and instructional queries
      let finalFormat = result.format || 'regular';
      const response = result.response || 'Let me put you on a brief hold while I consult with my colleague for more details about this.';
      
      // Check if response contains numbered steps (1., 2., 3. or 1), 2), 3) or 1 -, 2 -, 3 -)
      // Handle both multi-line and single-line numbered formats
      const hasNumberedSteps = /\d+[.)]\s+.*(\n.*\d+[.)]\s+|\s+\d+[.)]\s+)/.test(response) || 
                               /\d+\s+-\s+.*(\n.*\d+\s+-\s+|\s+\d+\s+-\s+)/.test(response) ||
                               /\d+[.)]\s+.*\s+\d+[.)]\s+/.test(response); // Single line pattern
      
      // Check if customer message looks instructional
      const instructionalKeywords = /\b(how\s+(do\s+i|to)|setup|install|configure|reset|troubleshoot|steps|guide|tutorial|instructions|process)\b/i;
      const isInstructionalQuery = instructionalKeywords.test(customerMessage);
      
      // Override format if we detect step content or instructional query
      if ((hasNumberedSteps || isInstructionalQuery) && finalFormat === 'regular') {
        finalFormat = 'steps';
      }
      
      return {
        response,
        confidence: result.confidence || 50,
        requiresHumanTakeover: result.requiresHumanTakeover || true,
        suggestedActions: result.suggestedActions || ['Connect with human agent'],
        format: finalFormat,
      };
    } catch (error) {
      console.error('Error generating AI response:', error);
      return {
        response: 'Let me put you on a brief hold while I consult with my colleague for more details about this.',
        confidence: 0,
        requiresHumanTakeover: true,
        suggestedActions: ['Connect with human agent'],
        format: 'regular',
      };
    }
  }

  /**
   * Generate AI-powered ticket from conversation
   */
  static async generateTicketFromConversation(conversationId: string): Promise<AiTicketGeneration & { aiConfidenceScore: number }> {
    try {
      // Fetch conversation messages and customer info
      const messages = await storage.getMessagesByConversation(conversationId);
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        throw new Error('Conversation not found');
      }
      
      const customer = await storage.getCustomer(conversation.customerId);
      
      // Guard against empty messages array
      if (messages.length === 0) {
        return {
          conversationId,
          title: 'Support Request',
          description: 'No messages found in conversation',
          category: 'General',
          priority: 'medium',
          aiConfidenceScore: 20, // Low confidence due to no data
          conversationContext: 'Empty conversation with no messages',
        };
      }
      
      // Filter out internal messages to prevent data leakage
      const publicMessages = messages.filter(msg => msg.scope !== 'internal');
      
      if (publicMessages.length === 0) {
        return {
          conversationId,
          title: 'Support Request',
          description: 'Only internal messages found in conversation',
          category: 'General',
          priority: 'medium',
          aiConfidenceScore: 30, // Low confidence due to limited data
          conversationContext: 'Conversation contains only internal staff messages',
        };
      }
      
      // Truncate to last 20 messages to avoid token limits
      const recentMessages = publicMessages.slice(-20);
      
      // Use existing conversation analysis logic with filtered messages
      const analysis = await this.analyzeConversation(recentMessages, customer);
      
      // Calculate confidence score based on various factors
      let confidenceScore = 75; // Base confidence
      
      // Adjust based on message count (more messages = more context = higher confidence)
      if (recentMessages.length >= 5) confidenceScore += 10;
      else if (recentMessages.length < 2) confidenceScore -= 15;
      
      // Adjust based on content quality - guard against empty array
      const avgMessageLength = recentMessages.length > 0 
        ? recentMessages.reduce((sum, msg) => sum + msg.content.length, 0) / recentMessages.length
        : 0;
      if (avgMessageLength > 50) confidenceScore += 5; // Detailed messages
      if (avgMessageLength < 20) confidenceScore -= 10; // Very short messages
      
      // Adjust based on sentiment (neutral/positive = higher confidence)
      if (analysis.sentiment === 'negative') confidenceScore -= 5;
      else if (analysis.sentiment === 'positive') confidenceScore += 5;
      
      // Clamp confidence between 20-95
      confidenceScore = Math.max(20, Math.min(95, confidenceScore));
      
      // Generate conversation context summary
      const contextSummary = `Conversation with ${customer?.name || 'Customer'} (${recentMessages.length} public messages, ${messages.length} total). ${analysis.sentiment} sentiment. Key issues: ${analysis.keyIssues.join(', ')}.`;
      
      return {
        conversationId,
        title: analysis.suggestedTicketTitle,
        description: analysis.suggestedTicketDescription,
        category: analysis.category,
        priority: analysis.priority,
        aiConfidenceScore: confidenceScore,
        conversationContext: contextSummary,
      };
    } catch (error) {
      console.error('Error generating ticket from conversation:', error);
      throw error;
    }
  }

  /**
   * Proofread ticket content for clarity and professionalism
   */
  static async proofreadTicketContent(content: {
    title?: string;
    description?: string;
  }): Promise<{
    title?: ProofreadResult;
    description?: ProofreadResult;
  }> {
    try {
      const results: any = {};
      
      if (content.title) {
        results.title = await this.proofreadMessage(content.title, {
          isCustomerMessage: false,
        });
      }
      
      if (content.description) {
        results.description = await this.proofreadMessage(content.description, {
          isCustomerMessage: false,
        });
      }
      
      return results;
    } catch (error) {
      console.error('Error proofreading ticket content:', error);
      throw error;
    }
  }

  /**
   * Check if OpenAI service is available
   */
  static async checkServiceHealth(): Promise<boolean> {
    try {
      await openai.models.list();
      return true;
    } catch (error) {
      console.error('OpenAI service health check failed:', error);
      return false;
    }
  }

  /**
   * Generate smart AI agent response with learning and knowledge base integration
   */
  static async generateSmartAgentResponse(
    customerMessage: string,
    conversationId: string,
    agentId?: string
  ): Promise<SmartAgentResponse> {
    try {
      // Get or create AI agent session
      let session = await storage.getAiAgentSessionByConversation(conversationId);
      let agent: AiAgent | null = null;

      if (!session) {
        // Find the best agent for this conversation or use default
        agent = agentId ? (await storage.getAiAgent(agentId)) || null : await this.findBestAgent(customerMessage);
        
        if (agent) {
          session = await storage.createAiAgentSession({
            conversationId,
            agentId: agent.id,
            status: 'active',
            messageCount: 0,
            avgConfidence: 0,
          });
        }
      } else {
        agent = (await storage.getAiAgent(session.agentId)) || null;
      }

      if (!agent || !session) {
        // Fallback to basic response
        const fallbackResponse = await this.generateAgentResponse(customerMessage, []);
        return {
          ...fallbackResponse,
          sessionId: 'fallback',
          messageCount: 1,
          avgConfidence: fallbackResponse.confidence,
          shouldLearn: false,
        };
      }

      // Get conversation history
      const messages = await storage.getMessagesByConversation(conversationId);
      const conversationHistory = messages
        .filter(msg => msg.scope !== 'internal')
        .slice(-10)
        .map(msg => `${msg.senderType}: ${msg.content}`);

      // Get relevant knowledge base articles using enhanced retrieval
      const searchResults = await this.getRelevantKnowledge(customerMessage, agent.knowledgeBaseIds || []);

      // Generate response using agent's configuration
      const response = await this.generateAgentResponseWithConfig(
        customerMessage,
        conversationHistory,
        searchResults,
        agent
      );

      // Update session statistics
      const newMessageCount = session.messageCount + 1;
      const newAvgConfidence = Math.round(
        (session.avgConfidence * session.messageCount + response.confidence) / newMessageCount
      );

      await storage.updateAiAgentSession(session.id, {
        messageCount: newMessageCount,
        avgConfidence: newAvgConfidence,
      });

      // Determine if human takeover is needed
      const shouldTakeOver = response.confidence < agent.autoTakeoverThreshold || response.requiresHumanTakeover;

      if (shouldTakeOver) {
        await storage.updateAiAgentSession(session.id, {
          status: 'handed_over',
          handoverReason: `Low confidence (${response.confidence}%) or complex query requiring human assistance`,
        });
      }

      // Track file usage when knowledge base articles are used
      if (response.knowledgeUsed && response.knowledgeUsed.length > 0) {
        for (const knowledgeBaseId of response.knowledgeUsed) {
          try {
            // Get files linked to this knowledge base article
            const linkedFiles = await storage.getFilesLinkedToKnowledgeBase(knowledgeBaseId);
            
            // Increment usage count for each linked file
            for (const linkedFile of linkedFiles) {
              await storage.incrementFileUsage(linkedFile.id, agent.id);
            }
          } catch (error) {
            console.error(`Error tracking file usage for knowledge base ${knowledgeBaseId}:`, error);
            // Don't let usage tracking errors affect the response
          }
        }
      }

      // Record learning data
      const shouldLearn = newMessageCount <= 100; // Limit learning data collection
      if (shouldLearn) {
        await storage.createAiAgentLearning({
          agentId: agent.id,
          conversationId,
          customerQuery: customerMessage,
          aiResponse: response.response,
          confidence: response.confidence,
          humanTookOver: shouldTakeOver,
          knowledgeUsed: response.knowledgeUsed || [],
        });
      }

      return {
        ...response,
        sessionId: session.id,
        messageCount: newMessageCount,
        avgConfidence: newAvgConfidence,
        shouldLearn,
        agentId: agent.id,
      };

    } catch (error) {
      console.error('Error generating smart agent response:', error);
      
      // Fallback response
      return {
        response: 'Let me put you on a brief hold while I consult with my colleague for more details about this.',
        confidence: 0,
        requiresHumanTakeover: true,
        suggestedActions: ['Connect with human agent'],
        sessionId: 'error',
        messageCount: 1,
        avgConfidence: 0,
        shouldLearn: false,
      };
    }
  }

  /**
   * Generate response using specific AI agent configuration
   */
  private static async generateAgentResponseWithConfig(
    customerMessage: string,
    conversationHistory: string[],
    searchResults: SearchResult[],
    agent: AiAgent
  ): Promise<AIAgentResponse> {
    try {
      // Enhanced knowledge context formatting with better structure
      const knowledgeContext = searchResults.length 
        ? this.formatKnowledgeContext(searchResults)
        : '\nKnowledge Base: No relevant knowledge base articles available.\n';

      const conversationContext = conversationHistory.length 
        ? `\nConversation History:\n${conversationHistory.join('\n')}\n`
        : '';

      // Calculate knowledge quality score for confidence adjustment
      const knowledgeQuality = this.calculateKnowledgeQuality(searchResults);

      // Detect if customer message is too vague to provide helpful assistance
      const isVagueQuery = this.detectVagueQuery(customerMessage);
      
      console.log('=== AI Query Analysis Debug ===');
      console.log('Customer message:', customerMessage);
      console.log('Detected as vague query:', isVagueQuery);
      console.log('Knowledge context available:', searchResults.length > 0);
      console.log('Knowledge quality score:', knowledgeQuality.toFixed(2));
      console.log('Search results count:', searchResults.length);
      if (searchResults.length > 0) {
        console.log('Top search result score:', searchResults[0].score);
        console.log('Top search result title:', searchResults[0].chunk.title);
      }

      const userPrompt = `${knowledgeContext}${conversationContext}
Customer Message: "${customerMessage}"

Agent Role: ${agent.name} - ${agent.description}
Specializations: ${agent.specializations?.join(', ') || 'General Support'}

QUERY ANALYSIS:
- Is vague/needs clarification: ${isVagueQuery ? 'YES' : 'NO'}
- Previous conversation context: ${conversationHistory.length > 0 ? 'Available' : 'None'}
- Knowledge base results: ${searchResults.length} relevant chunks found
- Knowledge quality score: ${knowledgeQuality.toFixed(2)}/10

Respond according to your role and training. Provide a JSON response with:
- response: Your helpful response to the customer (follow guidelines below)
- confidence: Number from 0-100 indicating confidence in your response
- requiresHumanTakeover: Boolean if human agent should take over
- suggestedActions: Array of recommended next steps
- format: Either "regular" or "steps" (use "steps" for instruction-based queries)

MANDATORY RESPONSE STRATEGY - FOLLOW EXACTLY:

STEP 1: CHECK QUERY TYPE
- If "Is vague/needs clarification" = YES → GO TO VAGUE QUERY RESPONSE
- If "Is vague/needs clarification" = NO → GO TO SPECIFIC QUERY RESPONSE

VAGUE QUERY RESPONSE (only when query analysis shows vague = YES):
- DO NOT provide solutions or knowledge base information
- Ask 2-3 specific clarifying questions to understand their exact issue
- Be empathetic: "I'm here to help! To provide you with the best assistance..."
- Guide them to be more specific: "What specifically are you experiencing?"
- Use examples: "For example, are you having trouble with setup, connectivity, or error messages?"
- Set confidence to 70-85
- Set requiresHumanTakeover to false

SPECIFIC QUERY RESPONSE (only when query analysis shows vague = NO):
- If knowledge base results > 0 and quality score > 3.0 → PROVIDE KNOWLEDGE-BASED SOLUTION
- Use format: "steps" for how-to questions, tutorials, troubleshooting, setup instructions
- Use format: "regular" for simple answers, information requests, or general inquiries
- Reference specific knowledge base articles when appropriate
- Provide comprehensive solutions using ONLY the provided knowledge base information
- Set confidence to 70-95 based on knowledge quality
- Set requiresHumanTakeover to false

- If knowledge base results = 0 or quality score < 3.0 → ESCALATE TO HUMAN
- Set requiresHumanTakeover to true
- Explain you need to connect them with a specialist

CRITICAL RULES:
- NEVER ask clarifying questions when query analysis shows vague = NO
- NEVER provide knowledge-based solutions when query analysis shows vague = YES
- ONLY use information from the provided Knowledge Base chunks for solutions
- NEVER provide answers from general knowledge when giving solutions

Confidence scoring:
- For clarifying questions on vague queries: 70-85
- For knowledge-based solutions: 90-100 (highly relevant), 70-89 (good), 50-69 (moderate), 30-49 (low), 0-29 (very low)
- For human handoffs: 20-40

Example clarifying response for vague queries:
"I'm here to help! To provide you with the best assistance, could you tell me a bit more about what's happening? For example:
- Are you experiencing an error message? If so, what does it say?
- Is this related to setting up new equipment or troubleshooting existing setup?
- What specific step or process are you having trouble with?

The more details you can share, the better I can help you resolve this quickly!"`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: agent.systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: (agent.temperature || 30) / 100,
        max_tokens: agent.maxTokens || 1000,
      });

      // Parse AI response, handling markdown code blocks if present
      let responseContent = completion.choices[0].message.content || '{}';
      
      // Remove markdown code blocks if present (```json ... ```)
      responseContent = responseContent.replace(/```json\s*|\s*```/g, '').trim();
      
      const result = JSON.parse(responseContent);
      
      // Update knowledge base usage statistics (if storage methods exist)
      if (searchResults.length > 0) {
        for (const result of searchResults) {
          try {
            await storage.updateKnowledgeBaseUsage?.(result.chunk.knowledgeBaseId);
          } catch (e) {
            // Method may not exist yet, ignore
          }
        }
      }

      // Server-side fallback: Detect step-by-step content and instructional queries  
      let finalFormat = result.format || 'regular';
      const response = result.response || 'Let me put you on a brief hold while I consult with my colleague for more details about this.';
      
      // Check if response contains numbered steps (1., 2., 3. or 1), 2), 3) or 1 -, 2 -, 3 -)
      // Handle both multi-line and single-line numbered formats
      const hasNumberedSteps = /\d+[.)]\s+.*(\n.*\d+[.)]\s+|\s+\d+[.)]\s+)/.test(response) || 
                               /\d+\s+-\s+.*(\n.*\d+\s+-\s+|\s+\d+\s+-\s+)/.test(response) ||
                               /\d+[.)]\s+.*\s+\d+[.)]\s+/.test(response); // Single line pattern
      
      // Check if customer message looks instructional
      const instructionalKeywords = /\b(how\s+(do\s+i|to)|setup|install|configure|reset|troubleshoot|steps|guide|tutorial|instructions|process)\b/i;
      const isInstructionalQuery = instructionalKeywords.test(customerMessage);
      
      // Override format if we detect step content or instructional query
      if ((hasNumberedSteps || isInstructionalQuery) && finalFormat === 'regular') {
        finalFormat = 'steps';
      }

      // Force human takeover if no knowledge articles are available
      const shouldForceHumanTakeover = searchResults.length === 0;
      
      // Enhanced confidence calculation using knowledge quality
      let adjustedConfidence = result.confidence || 50;
      
      if (!shouldForceHumanTakeover && searchResults.length > 0) {
        // Adjust confidence based on knowledge quality score
        const qualityMultiplier = Math.min(1.2, 0.8 + (knowledgeQuality / 25)); // 0.8 to 1.2 range
        adjustedConfidence = Math.round(adjustedConfidence * qualityMultiplier);
        
        // Boost confidence for multiple high-quality sources
        if (searchResults.length > 1 && knowledgeQuality > 7) {
          adjustedConfidence = Math.min(95, adjustedConfidence + 5);
        }
        
        // Lower confidence for weak knowledge matches
        if (knowledgeQuality < 4) {
          adjustedConfidence = Math.max(20, adjustedConfidence - 15);
        }
      } else if (shouldForceHumanTakeover) {
        adjustedConfidence = Math.min(adjustedConfidence, 25);
      }
      
      return {
        response,
        confidence: Math.max(0, Math.min(100, adjustedConfidence)),
        requiresHumanTakeover: shouldForceHumanTakeover || result.requiresHumanTakeover || false,
        suggestedActions: result.suggestedActions || ['Connect with human agent'],
        knowledgeUsed: searchResults.map(result => result.chunk.knowledgeBaseId),
        agentId: agent.id,
        format: finalFormat,
      };
    } catch (error) {
      console.error('Error generating agent response with config:', error);
      return {
        response: 'Let me put you on a brief hold while I consult with my colleague for more details about this.',
        confidence: 0,
        requiresHumanTakeover: true,
        suggestedActions: ['Connect with human agent'],
        agentId: agent.id,
        format: 'regular',
      };
    }
  }

  /**
   * Find the best AI agent for a customer query
   */
  private static async findBestAgent(customerMessage: string): Promise<AiAgent | null> {
    try {
      const agents = await storage.getActiveAiAgents?.() || [];
      
      if (agents.length === 0) {
        return null;
      }

      // Simple keyword matching for specializations
      const message = customerMessage.toLowerCase();
      
      for (const agent of agents) {
        if (agent.specializations && agent.specializations.length > 0) {
          for (const specialization of agent.specializations) {
            if (message.includes(specialization.toLowerCase())) {
              return agent;
            }
          }
        }
      }

      // Return first active agent as fallback
      return agents[0];
    } catch (error) {
      console.error('Error finding best agent:', error);
      return null;
    }
  }

  /**
   * Get relevant knowledge base articles using enhanced retrieval system
   */
  private static async getRelevantKnowledge(query: string, knowledgeBaseIds: string[]): Promise<SearchResult[]> {
    try {
      if (knowledgeBaseIds.length === 0) {
        return [];
      }

      // Enhanced query analysis for better search optimization
      const queryAnalysis = this.analyzeQuery(query);
      
      // Dynamic search parameters based on query characteristics
      const searchOptions = this.getOptimalSearchOptions(queryAnalysis);
      
      console.log(`Query analysis - Type: ${queryAnalysis.type}, Intent: ${queryAnalysis.intent}, Complexity: ${queryAnalysis.complexity}`);
      
      // Multi-tiered search strategy
      let searchResults = await knowledgeRetrieval.search(query, knowledgeBaseIds, searchOptions);
      
      // If insufficient results for complex queries, try broader search
      if (searchResults.length < 2 && queryAnalysis.complexity === 'high') {
        console.log('Insufficient results for complex query, expanding search...');
        const broadSearchOptions = {
          ...searchOptions,
          minScore: Math.max(0.1, searchOptions.minScore! - 0.05),
          maxResults: 8,
          expandScope: true,
        };
        searchResults = await knowledgeRetrieval.search(query, knowledgeBaseIds, broadSearchOptions);
      }
      
      // Enhanced context filtering and ranking
      const filteredResults = this.filterAndRankResults(searchResults, queryAnalysis);
      
      console.log(`Knowledge retrieval for "${query}": found ${filteredResults.length} relevant chunks`);
      filteredResults.forEach((result, i) => {
        console.log(`  ${i + 1}. ${result.chunk.title} (${result.matchType}, score: ${result.score.toFixed(2)}, relevance: ${result.contextRelevance || 'N/A'})`);
      });

      return filteredResults;
    } catch (error) {
      console.error('Error getting relevant knowledge:', error);
      return [];
    }
  }

  /**
   * Hand over conversation from AI to human agent
   */
  static async handoverToHuman(
    conversationId: string,
    humanAgentId: string,
    reason: string
  ): Promise<boolean> {
    try {
      const session = await storage.getAiAgentSessionByConversation?.(conversationId);
      
      if (session && session.status === 'active') {
        await storage.updateAiAgentSession?.(session.id, {
          status: 'handed_over',
          humanAgentId,
          handoverReason: reason,
        });

        // Update conversation assignment
        await storage.updateConversation(conversationId, {
          assignedAgentId: humanAgentId,
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error handing over to human:', error);
      return false;
    }
  }

  /**
   * Analyze query characteristics for optimal search strategy
   */
  private static analyzeQuery(query: string): QueryAnalysis {
    const lowerQuery = query.toLowerCase();
    
    // Query type detection
    let type: 'instructional' | 'troubleshooting' | 'informational' | 'specific' = 'informational';
    let intent = 'general';
    let complexity: 'low' | 'medium' | 'high' = 'medium';
    
    // Instructional queries
    if (/\b(how\s+(do\s+i|to)|setup|install|configure|connect|pair|guide|tutorial|instructions|process|steps)\b/i.test(query)) {
      type = 'instructional';
      intent = 'learn_process';
    }
    
    // Troubleshooting queries
    else if (/\b(not\s+working|broken|error|problem|issue|trouble|fix|resolve|solve|help|stuck)\b/i.test(query)) {
      type = 'troubleshooting';
      intent = 'solve_problem';
    }
    
    // Specific queries
    else if (/\b(where|what\s+is|when|which|who|specific|exact|particular)\b/i.test(query)) {
      type = 'specific';
      intent = 'find_specific';
    }
    
    // Complexity assessment
    const wordCount = query.split(/\s+/).length;
    const hasMultipleConcepts = (query.match(/\b(and|or|also|plus|with|including)\b/g) || []).length > 0;
    const hasQualifiers = (query.match(/\b(if|when|while|during|after|before)\b/g) || []).length > 0;
    
    if (wordCount > 15 || hasMultipleConcepts || hasQualifiers) {
      complexity = 'high';
    } else if (wordCount < 5) {
      complexity = 'low';
    }
    
    return { type, intent, complexity, wordCount, hasMultipleConcepts, hasQualifiers };
  }

  /**
   * Get optimal search options based on query analysis
   */
  private static getOptimalSearchOptions(analysis: QueryAnalysis): RetrievalOptions {
    const baseOptions: RetrievalOptions = {
      useSemanticSearch: true,
      expandScope: false,
    };
    
    switch (analysis.type) {
      case 'instructional':
        return {
          ...baseOptions,
          maxResults: 6, // More results for learning
          minScore: 0.12, // Slightly lower threshold for comprehensive steps
          requireSteps: true,
          expandScope: true, // Instructional content might be in various articles
        };
        
      case 'troubleshooting':
        return {
          ...baseOptions,
          maxResults: 5,
          minScore: 0.2, // Higher threshold for problem-solving accuracy
          requireSteps: true, // Troubleshooting often involves steps
          expandScope: true, // Issues might span multiple topics
        };
        
      case 'specific':
        return {
          ...baseOptions,
          maxResults: 3, // Fewer, more precise results
          minScore: 0.25, // High threshold for specific answers
          expandScope: false, // Keep search focused
        };
        
      default: // informational
        return {
          ...baseOptions,
          maxResults: analysis.complexity === 'high' ? 6 : 4,
          minScore: analysis.complexity === 'high' ? 0.15 : 0.18,
          expandScope: analysis.complexity === 'high',
        };
    }
  }

  /**
   * Filter and rank search results based on query analysis
   */
  private static filterAndRankResults(results: SearchResult[], analysis: QueryAnalysis): EnhancedSearchResult[] {
    // Add context relevance scoring
    const enhancedResults = results.map(result => {
      let contextRelevance = 'medium';
      let adjustedScore = result.score;
      
      // Boost relevance based on query type and content characteristics
      if (analysis.type === 'instructional') {
        if (/\b(step|steps|first|second|third|next|then|finally)\b/i.test(result.chunk.content)) {
          contextRelevance = 'high';
          adjustedScore *= 1.2;
        }
      } else if (analysis.type === 'troubleshooting') {
        if (/\b(error|problem|issue|fix|resolve|solution|troubleshoot)\b/i.test(result.chunk.content)) {
          contextRelevance = 'high';
          adjustedScore *= 1.15;
        }
      }
      
      // Boost results with clear structure
      if (result.chunk.metadata.hasStructure) {
        adjustedScore *= 1.1;
      }
      
      return {
        ...result,
        score: adjustedScore,
        contextRelevance,
      };
    });
    
    // Re-sort by adjusted scores and filter low-relevance results
    return enhancedResults
      .sort((a, b) => b.score - a.score)
      .filter(result => {
        // More stringent filtering for complex queries
        if (analysis.complexity === 'high') {
          return result.score > 0.2;
        }
        return result.score > 0.15;
      })
      .slice(0, analysis.complexity === 'high' ? 6 : 5); // Limit results appropriately
  }

  /**
   * Format knowledge context for better AI consumption
   */
  private static formatKnowledgeContext(searchResults: SearchResult[]): string {
    if (searchResults.length === 0) {
      return '\nKnowledge Base: No relevant knowledge base articles available.\n';
    }

    const sections = searchResults.map((result, index) => {
      const relevanceLabel = result.score > 0.8 ? 'High' : 
                            result.score > 0.5 ? 'Medium' : 'Low';
      
      return `
--- Knowledge Source ${index + 1}: ${result.chunk.title} ---
Relevance: ${relevanceLabel} (${result.score.toFixed(2)})
Match Type: ${result.matchType}
Content:
${result.chunk.content}
${result.chunk.metadata.hasStructure ? '[Well-structured content]' : '[Unstructured content]'}
---`;
    });

    return `\nKnowledge Base Sources:\n${sections.join('\n')}\n`;
  }

  /**
   * Calculate overall knowledge quality score for confidence adjustment
   */
  private static calculateKnowledgeQuality(searchResults: SearchResult[]): number {
    if (searchResults.length === 0) return 0;

    const scores = searchResults.map(result => {
      let quality = result.score * 10; // Base score from 0-10
      
      // Boost for high-relevance matches
      if (result.score > 0.7) quality += 1;
      if (result.score > 0.9) quality += 1;
      
      // Boost for structured content
      if (result.chunk.metadata.hasStructure) quality += 0.5;
      
      // Boost for semantic matches (more reliable)
      if (result.matchType === 'semantic') quality += 0.5;
      
      return Math.min(10, quality);
    });

    // Average with bias toward higher scores
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const maxScore = Math.max(...scores);
    
    // Weighted average favoring the best result
    return (avgScore * 0.7 + maxScore * 0.3);
  }

  /**
   * Record customer feedback for learning
   */
  static async recordCustomerFeedback(
    conversationId: string,
    messageId: string,
    wasHelpful: boolean,
    customerSatisfaction?: number,
    improvementSuggestion?: string
  ): Promise<void> {
    try {
      // Find the learning entry for this message
      const learningEntries = await storage.getAiAgentLearningByConversation?.(conversationId) || [];
      const latestEntry = learningEntries[learningEntries.length - 1];

      if (latestEntry) {
        await storage.updateAiAgentLearning?.(latestEntry.id, {
          wasHelpful,
          customerSatisfaction,
          improvementSuggestion,
        });

        // Update knowledge base effectiveness if knowledge was used
        if (latestEntry.knowledgeUsed && latestEntry.knowledgeUsed.length > 0) {
          for (const kbId of latestEntry.knowledgeUsed) {
            try {
              await storage.updateKnowledgeBaseEffectiveness?.(
                kbId,
                wasHelpful ? 5 : -5 // Adjust effectiveness based on feedback
              );
            } catch (e) {
              // Method may not exist yet, ignore
            }
          }
        }
      }
    } catch (error) {
      console.error('Error recording customer feedback:', error);
    }
  }

  /**
   * Detect if a customer query is too vague to provide specific assistance
   */
  private static detectVagueQuery(customerMessage: string): boolean {
    const message = customerMessage.toLowerCase().trim();
    
    // Patterns that indicate vague queries
    const vagePatterns = [
      // Direct vague statements
      /^(i have an? )?issue$/,
      /^(i have an? )?problem$/,
      /^(need )?help$/,
      /^not working$/,
      /^it('s)? not working$/,
      /^broken$/,
      /^it('s)? broken$/,
      /^doesn('t)? work$/,
      /^won('t)? work$/,
      /^something('s)? wrong$/,
      /^there('s)? a problem$/,
      /^i('m)? having trouble$/,
      /^i('m)? having issues?$/,
      /^can('t)? get it to work$/,
      /^it('s)? not functioning$/,
      
      // Very short vague requests
      /^help me$/,
      /^fix it$/,
      /^fix this$/,
      /^what('s)? wrong$/,
      /^why not working$/,
      /^why isn('t)? it working$/,
      
      // Generic support requests
      /^i need support$/,
      /^i need assistance$/,
      /^can you help$/,
      /^can you help me$/,
      
      // Emergency-sounding but vague
      /^urgent$/,
      /^emergency$/,
      /^asap$/,
      /^important$/,
    ];
    
    // Check if message matches any vague pattern
    const isVague = vagePatterns.some(pattern => pattern.test(message));
    
    // Additional checks for vague characteristics
    if (!isVague) {
      // Very short messages (under 10 characters) are often vague
      if (message.length < 10) {
        return true;
      }
      
      // Messages with only pronouns and no specifics
      const hasOnlyPronouns = /^(it|this|that|they|them)(\s+(is|are|was|were|don('t)?|doesn('t)?|won('t)?|can('t)?|isn('t)?|aren('t)?|wasn('t)?|weren('t)?))?(\s+(work|working|function|functioning))?$/i.test(message);
      if (hasOnlyPronouns) {
        return true;
      }
    }
    
    return isVague;
  }
}