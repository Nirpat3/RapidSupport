import OpenAI from 'openai';
import { Message, Conversation, AiTicketGeneration, AiAgent, KnowledgeBase, AiAgentSession, AiAgentLearning } from '@shared/schema';
import { storage } from './storage';

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
   * Generate AI agent response for customer queries
   */
  static async generateAgentResponse(
    customerMessage: string, 
    conversationHistory: string[],
    knowledgeBase?: string[]
  ): Promise<AIAgentResponse> {
    try {
      const systemPrompt = `You are a helpful customer support AI assistant. Your role is to:
- ONLY answer questions using the provided knowledge base information
- Maintain a professional, empathetic, and friendly tone
- Escalate to human agents when knowledge base cannot help
- Never use general knowledge beyond what is provided

CRITICAL GUIDELINES:
- You MUST ONLY use information from the provided Knowledge Base
- If the knowledge base doesn't contain relevant information, you MUST escalate to human agents
- NEVER provide answers from general AI knowledge
- If confidence is low or no relevant knowledge base content exists, require human takeover
- Always be helpful within the constraints of available knowledge`;

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
      const response = result.response || 'I apologize, but I need to connect you with a human agent for assistance.';
      
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
        response: 'I apologize, but I need to connect you with a human agent for assistance.',
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

      // Get relevant knowledge base articles
      const knowledgeArticles = await this.getRelevantKnowledge(customerMessage, agent.knowledgeBaseIds || []);

      // Generate response using agent's configuration
      const response = await this.generateAgentResponseWithConfig(
        customerMessage,
        conversationHistory,
        knowledgeArticles,
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
        response: 'I apologize, but I need to connect you with a human agent for assistance.',
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
    knowledgeArticles: KnowledgeBase[],
    agent: AiAgent
  ): Promise<AIAgentResponse> {
    try {
      const knowledgeContext = knowledgeArticles.length 
        ? `\nKnowledge Base:\n${knowledgeArticles.map(kb => `${kb.title}: ${kb.content}`).join('\n')}\n`
        : '\nKnowledge Base: No relevant knowledge base articles available.\n';

      const conversationContext = conversationHistory.length 
        ? `\nConversation History:\n${conversationHistory.join('\n')}\n`
        : '';

      const userPrompt = `${knowledgeContext}${conversationContext}
Customer Message: "${customerMessage}"

Respond according to your role and training. Provide a JSON response with:
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

CRITICAL GUIDELINES:
- You MUST ONLY use information from the provided Knowledge Base
- If no relevant knowledge base articles are available, set requiresHumanTakeover to true
- NEVER provide answers from general knowledge
- If confidence is low or no relevant knowledge exists, require human takeover

Confidence scoring:
- 90-100: Completely confident with relevant knowledge base information
- 70-89: Good confidence using knowledge base articles
- 50-69: Moderate confidence with limited knowledge base info
- 30-49: Low confidence, likely needs human help
- 0-29: Very low confidence, definitely needs human assistance

If no relevant knowledge base information is available, set requiresHumanTakeover to true and explain that you need to connect them with a human agent.`;

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
      if (knowledgeArticles.length > 0) {
        for (const kb of knowledgeArticles) {
          try {
            await storage.updateKnowledgeBaseUsage?.(kb.id);
          } catch (e) {
            // Method may not exist yet, ignore
          }
        }
      }

      // Server-side fallback: Detect step-by-step content and instructional queries  
      let finalFormat = result.format || 'regular';
      const response = result.response || 'I apologize, but I need to connect you with a human agent for assistance.';
      
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
      const shouldForceHumanTakeover = knowledgeArticles.length === 0;
      
      return {
        response,
        confidence: shouldForceHumanTakeover ? Math.min(result.confidence || 20, 20) : (result.confidence || 50),
        requiresHumanTakeover: shouldForceHumanTakeover || result.requiresHumanTakeover || false,
        suggestedActions: result.suggestedActions || ['Connect with human agent'],
        knowledgeUsed: knowledgeArticles.map(kb => kb.id),
        agentId: agent.id,
        format: finalFormat,
      };
    } catch (error) {
      console.error('Error generating agent response with config:', error);
      return {
        response: 'I apologize, but I need to connect you with a human agent for assistance.',
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
   * Get relevant knowledge base articles
   */
  private static async getRelevantKnowledge(query: string, knowledgeBaseIds: string[]): Promise<KnowledgeBase[]> {
    try {
      if (knowledgeBaseIds.length === 0) {
        return [];
      }

      const allArticles = await storage.getKnowledgeBaseArticles?.(knowledgeBaseIds) || [];
      
      // Simple relevance matching based on keywords
      const queryLower = query.toLowerCase();
      const relevantArticles = allArticles.filter((article: KnowledgeBase) => {
        const titleMatch = article.title.toLowerCase().includes(queryLower);
        const contentMatch = article.content.toLowerCase().includes(queryLower);
        const tagMatch = article.tags?.some((tag: string) => queryLower.includes(tag.toLowerCase()));
        
        return titleMatch || contentMatch || tagMatch;
      });

      // Sort by priority and return top 3
      return relevantArticles
        .sort((a: KnowledgeBase, b: KnowledgeBase) => (b.priority || 50) - (a.priority || 50))
        .slice(0, 3);
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
}