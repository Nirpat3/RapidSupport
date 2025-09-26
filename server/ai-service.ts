import OpenAI from 'openai';
import { Message, Conversation } from '@shared/schema';

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

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      
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

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      
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
- Provide helpful and accurate responses to customer queries
- Maintain a professional, empathetic, and friendly tone
- Escalate to human agents when necessary
- Use knowledge base information when available

Guidelines:
- If you cannot confidently answer a question, recommend human takeover
- For complex technical issues, suggest human agent assistance
- For billing or account-specific questions, require human verification
- Always be helpful and solution-oriented`;

      const contextInfo = knowledgeBase?.length 
        ? `\nKnowledge Base:\n${knowledgeBase.join('\n')}\n`
        : '';

      const conversationContext = conversationHistory.length 
        ? `\nConversation History:\n${conversationHistory.slice(-5).join('\n')}\n`
        : '';

      const userPrompt = `${contextInfo}${conversationContext}
Customer Message: "${customerMessage}"

Provide a JSON response with:
- response: Your helpful response to the customer
- confidence: Number from 0-100 indicating confidence in your response
- requiresHumanTakeover: Boolean if human agent should take over
- suggestedActions: Array of recommended next steps

If confidence is below 70 or the query requires sensitive information access, set requiresHumanTakeover to true.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.4,
        max_tokens: 1000,
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      
      return {
        response: result.response || 'I apologize, but I need to connect you with a human agent for assistance.',
        confidence: result.confidence || 50,
        requiresHumanTakeover: result.requiresHumanTakeover || true,
        suggestedActions: result.suggestedActions || ['Connect with human agent'],
      };
    } catch (error) {
      console.error('Error generating AI response:', error);
      return {
        response: 'I apologize, but I need to connect you with a human agent for assistance.',
        confidence: 0,
        requiresHumanTakeover: true,
        suggestedActions: ['Connect with human agent'],
      };
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
}