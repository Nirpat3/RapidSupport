import OpenAI from 'openai';
import { Message, Conversation, AiTicketGeneration, AiAgent, KnowledgeBase, AiAgentSession, AiAgentLearning, BrandConfig, KnowledgeBaseImage, InsertAiTokenUsage, InsertAiKnowledgeFeedback } from '@shared/schema';
import { storage } from './storage';
import { knowledgeRetrieval, type SearchResult, type RetrievalOptions } from './knowledge-retrieval';
import { conversationLogger } from './conversation-logger';

// Model pricing (per 1M tokens) - as of 2024
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'text-embedding-3-small': { input: 0.02, output: 0 },
  'text-embedding-3-large': { input: 0.13, output: 0 },
};

// Calculate cost based on model and token counts
function calculateCost(model: string, promptTokens: number, completionTokens: number): string {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4o-mini'];
  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  return (inputCost + outputCost).toFixed(6);
}

// Track token usage from OpenAI response
async function trackTokenUsage(
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | undefined,
  model: string,
  operation: string,
  context?: {
    conversationId?: string;
    messageId?: string;
    agentId?: string;
    workspaceId?: string;
    latencyMs?: number;
  }
): Promise<void> {
  if (!usage) return;
  
  try {
    const tokenRecord: InsertAiTokenUsage = {
      conversationId: context?.conversationId,
      messageId: context?.messageId,
      agentId: context?.agentId,
      workspaceId: context?.workspaceId,
      model,
      operation,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      costUsd: calculateCost(model, usage.prompt_tokens, usage.completion_tokens),
      latencyMs: context?.latencyMs,
      occurredAt: new Date()
    };
    
    await storage.createAiTokenUsage(tokenRecord);
  } catch (error) {
    console.error('[TokenUsage] Failed to track token usage:', error);
  }
}

// Track which KB articles were used in a response
async function trackKnowledgeFeedback(
  searchResults: SearchResult[],
  userQuery: string,
  context: {
    conversationId?: string;
    messageId?: string;
    agentId?: string;
    wasUsedInResponse: boolean;
    wasLinkProvided: boolean;
    requiredHumanTakeover: boolean;
  }
): Promise<void> {
  if (!searchResults.length) return;
  
  try {
    // Track top 3 articles used
    for (const result of searchResults.slice(0, 3)) {
      const feedback: InsertAiKnowledgeFeedback = {
        conversationId: context.conversationId,
        messageId: context.messageId,
        knowledgeBaseId: result.chunk.knowledgeBaseId,
        agentId: context.agentId,
        userQuery,
        similarityScore: result.similarity?.toFixed(4),
        wasUsedInResponse: context.wasUsedInResponse,
        wasLinkProvided: context.wasLinkProvided,
        outcome: 'pending',
        requiredHumanTakeover: context.requiredHumanTakeover
      };
      
      await storage.createAiKnowledgeFeedback(feedback);
    }
  } catch (error) {
    console.error('[KnowledgeFeedback] Failed to track feedback:', error);
  }
}

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

export interface IntentClassification {
  intent: 'sales' | 'technical' | 'billing' | 'general';
  confidence: number;
  reasoning: string;
}

export interface QualityScores {
  qualityScore: number;
  toneScore: number;
  relevanceScore: number;
  completenessScore: number;
}

export interface TranslationResult {
  translatedText: string;
  detectedLanguage: string;
  confidence: number;
}

const RESPONSE_FORMATS = {
  conversational: {
    prompt: "Respond in a friendly, conversational tone. Be warm and personable while maintaining professionalism. Use natural language and avoid overly formal phrasing. Structure with intro, details, and next steps.",
    example: "Hi there! I'd be happy to help you with that.\n\nLet me walk you through this process. Here's what you need to know:\n\n1. First, you'll need to access your account settings\n2. Then, locate the section you're looking for\n3. Finally, make your changes and save\n\nLet me know if you need any clarification on these steps!"
  },
  step_by_step: {
    prompt: "Provide clear numbered steps in a logical sequence. Each step should be actionable and easy to follow. Use imperative language (e.g., 'Click', 'Open', 'Enter'). Include context before steps and summary after.",
    example: "I'll guide you through this process step by step:\n\n1. Open the settings menu by clicking the gear icon in the top right\n2. Navigate to account preferences from the left sidebar\n3. Click on 'Update Password' in the security section\n4. Enter your new password and confirm it\n5. Click 'Save Changes' to apply\n\nYour password is now updated and you're all set!"
  },
  faq: {
    prompt: "Answer in FAQ format with clear Q&A pairs. Start with a question statement, then provide a concise answer with supporting details. Be direct and informative.",
    example: "Q: How do I reset my password?\n\nA: You can reset your password by following these steps:\n\n1. Click the 'Forgot Password' link on the login page\n2. Enter your email address\n3. Check your email for a reset link\n4. Follow the link and create a new password\n\nThe reset link expires after 24 hours for security."
  },
  technical: {
    prompt: "Provide detailed technical explanations with accurate terminology. Include technical details, specifications, and precise information. Assume the user has technical knowledge. Use lists for specifications.",
    example: "The authentication system implements the following:\n\n• JWT tokens with RS256 encryption\n• Token expiration: 24 hours\n• User claims: userId, email, roles\n• Refresh token rotation with secure storage\n\nFor implementation details, see: https://docs.example.com/auth"
  },
  bullet_points: {
    prompt: "Respond using concise bullet points. Each point should be brief and to the point. Use bullet points for lists, features, or key information. Group related points together.",
    example: "Here are the key features:\n\n• Automatic backups every 24 hours\n• 256-bit AES encryption for data security\n• Real-time sync across all your devices\n• 99.9% uptime guarantee\n\nPricing starts at $9.99/month with a 30-day free trial."
  }
} as const;

export class AIService {
  /**
   * Load brand configuration from database (singleton)
   */
  private static async loadBrandConfig(): Promise<BrandConfig | null> {
    try {
      const config = await storage.getBrandConfig?.();
      return config || null;
    } catch (error) {
      console.error('[Brand Voice] Error loading brand config:', error);
      return null;
    }
  }

  /**
   * Build brand voice prompt injection from configuration
   */
  private static buildBrandVoicePrompt(brandConfig: BrandConfig | null): string {
    if (!brandConfig || !brandConfig.isActive) {
      return ''; // No brand voice injection if disabled or not configured
    }

    const sections: string[] = [
      '\n=== BRAND VOICE GUIDELINES ===',
      `Company: ${brandConfig.companyName}`,
    ];

    if (brandConfig.industryVertical) {
      sections.push(`Industry: ${brandConfig.industryVertical}`);
    }

    // Core voice attributes
    sections.push(
      '',
      'TONE & STYLE:',
      `• Tone: ${brandConfig.tone}`,
      `• Voice: ${brandConfig.voice}`,
      `• Style: ${brandConfig.style}`,
      `• Formality Level: ${brandConfig.formalityLevel}/10`,
      `• Empathy Level: ${brandConfig.empathyLevel}/10`,
      `• Technical Depth: ${brandConfig.technicalDepth}/10`
    );

    // Do's and Don'ts
    if (brandConfig.dosList && brandConfig.dosList.length > 0) {
      sections.push('', 'ALWAYS DO:');
      brandConfig.dosList.forEach(item => sections.push(`• ${item}`));
    }

    if (brandConfig.dontsList && brandConfig.dontsList.length > 0) {
      sections.push('', 'NEVER DO:');
      brandConfig.dontsList.forEach(item => sections.push(`• ${item}`));
    }

    // Preferred/Avoided terms
    if (brandConfig.preferredTerms && brandConfig.preferredTerms.length > 0) {
      sections.push('', `PREFERRED TERMS: ${brandConfig.preferredTerms.join(', ')}`);
    }

    if (brandConfig.avoidedTerms && brandConfig.avoidedTerms.length > 0) {
      sections.push('', `AVOID TERMS: ${brandConfig.avoidedTerms.join(', ')}`);
    }

    // Example interactions (few-shot learning)
    if (brandConfig.exampleInteractions && brandConfig.exampleInteractions.length > 0) {
      sections.push('', 'EXAMPLE INTERACTIONS:');
      brandConfig.exampleInteractions.forEach((example, idx) => {
        sections.push(`${idx + 1}. ${example}`);
      });
    }

    sections.push('=== END BRAND VOICE GUIDELINES ===\n');

    return sections.join('\n');
  }

  /**
   * Classify customer message intent
   */
  static async classifyIntent(message: string): Promise<IntentClassification> {
    try {
      const systemPrompt = `You are an intent classification system for customer support. Analyze messages and classify them into one of these categories:

- sales: Questions about pricing, plans, purchasing, upgrades, demos, trials, product features for buying decisions
- technical: Technical issues, troubleshooting, setup help, configuration, errors, bugs, how-to questions
- billing: Payment issues, invoices, subscription management, refunds, billing disputes
- general: General inquiries, feedback, account questions, other topics not fitting above categories

Provide accurate classification with high confidence.`;

      const userPrompt = `Classify this customer message:

"${message}"

Provide a JSON response with:
- intent: One of "sales", "technical", "billing", or "general"
- confidence: Number from 0-100 indicating classification confidence
- reasoning: Brief explanation (1-2 sentences) of why you chose this category`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 200,
      });

      let responseContent = completion.choices[0].message.content || '{}';
      responseContent = responseContent.replace(/```json\s*|\s*```/g, '').trim();
      
      const result = JSON.parse(responseContent);
      
      return {
        intent: result.intent || 'general',
        confidence: result.confidence || 50,
        reasoning: result.reasoning || 'Unable to determine specific intent',
      };
    } catch (error) {
      console.error('Error classifying intent:', error);
      return {
        intent: 'general',
        confidence: 30,
        reasoning: 'Error occurred during classification, defaulting to general',
      };
    }
  }

  /**
   * Translate text between languages using OpenAI
   * Used for automatic translation pipeline between customers and agents
   */
  static async translateText(
    text: string, 
    targetLanguage: string, 
    sourceLanguage?: string
  ): Promise<TranslationResult> {
    const languageNames: Record<string, string> = {
      'en': 'English',
      'es': 'Spanish',
      'de': 'German', 
      'fr': 'French',
      'zh': 'Chinese (Simplified)',
      'hi': 'Hindi',
      'gu': 'Gujarati'
    };

    const targetLangName = languageNames[targetLanguage] || targetLanguage;
    const sourceLangName = sourceLanguage ? (languageNames[sourceLanguage] || sourceLanguage) : 'auto-detected';

    try {
      const systemPrompt = `You are a professional translator. Translate the given text to ${targetLangName}. 
Preserve the meaning, tone, and formatting of the original text. 
If the text is already in ${targetLangName}, return it as-is.
Also detect the source language of the original text.

Respond with JSON format:
{
  "translatedText": "the translated text",
  "detectedLanguage": "ISO 639-1 code of source language (e.g., en, es, de, fr, zh, hi, gu)",
  "confidence": 0-100 confidence score
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Translate to ${targetLangName}:\n\n${text}` }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      let responseContent = completion.choices[0].message.content || '{}';
      responseContent = responseContent.replace(/```json\s*|\s*```/g, '').trim();
      
      const result = JSON.parse(responseContent);
      
      console.log(`[Translation] ${sourceLangName} → ${targetLangName}: "${text.substring(0, 50)}..." → "${result.translatedText?.substring(0, 50)}..."`);
      
      return {
        translatedText: result.translatedText || text,
        detectedLanguage: result.detectedLanguage || 'en',
        confidence: result.confidence || 80,
      };
    } catch (error) {
      console.error('[Translation] Error translating text:', error);
      return {
        translatedText: text,
        detectedLanguage: sourceLanguage || 'en',
        confidence: 0,
      };
    }
  }

  /**
   * Detect the language of given text
   */
  static async detectLanguage(text: string): Promise<{ language: string; confidence: number }> {
    try {
      const systemPrompt = `You are a language detection system. Analyze the given text and identify its language.
Respond with JSON format:
{
  "language": "ISO 639-1 code (e.g., en, es, de, fr, zh, hi, gu)",
  "confidence": 0-100 confidence score
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Detect language:\n\n${text}` }
        ],
        temperature: 0.1,
        max_tokens: 100,
      });

      let responseContent = completion.choices[0].message.content || '{}';
      responseContent = responseContent.replace(/```json\s*|\s*```/g, '').trim();
      
      const result = JSON.parse(responseContent);
      
      return {
        language: result.language || 'en',
        confidence: result.confidence || 50,
      };
    } catch (error) {
      console.error('[Language Detection] Error:', error);
      return { language: 'en', confidence: 0 };
    }
  }

  /**
   * Score response quality across multiple dimensions
   */
  static async scoreResponseQuality(query: string, response: string): Promise<QualityScores> {
    try {
      const systemPrompt = `You are a response quality evaluator for customer support. Analyze AI responses and score them across multiple quality dimensions.`;

      const userPrompt = `Evaluate this customer support interaction:

Customer Query: "${query}"

AI Response: "${response}"

Score the response on these dimensions (0-100 for each):

1. qualityScore: Grammar, spelling, clarity, coherence, accuracy, overall writing quality
2. toneScore: Appropriate tone, empathy, professionalism, friendliness, not too formal or casual
3. relevanceScore: How well the response addresses the specific query, stays on topic
4. completenessScore: Provides a complete answer vs partial, includes all necessary information

Provide a JSON response with all four scores:
{
  "qualityScore": 0-100,
  "toneScore": 0-100,
  "relevanceScore": 0-100,
  "completenessScore": 0-100
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 300,
      });

      let responseContent = completion.choices[0].message.content || '{}';
      responseContent = responseContent.replace(/```json\s*|\s*```/g, '').trim();
      
      const result = JSON.parse(responseContent);
      
      return {
        qualityScore: result.qualityScore || 50,
        toneScore: result.toneScore || 50,
        relevanceScore: result.relevanceScore || 50,
        completenessScore: result.completenessScore || 50,
      };
    } catch (error) {
      console.error('Error scoring response quality:', error);
      return {
        qualityScore: 50,
        toneScore: 50,
        relevanceScore: 50,
        completenessScore: 50,
      };
    }
  }

  /**
   * Select best agent for a given intent category
   */
  static async selectBestAgentForIntent(intent: string, message: string): Promise<AiAgent | null> {
    try {
      const agents = await storage.getActiveAiAgents?.() || [];
      
      if (agents.length === 0) {
        return null;
      }

      // Filter agents by specialization matching the intent
      const matchingAgents = agents.filter(agent => 
        agent.specializations && 
        agent.specializations.some(spec => 
          spec.toLowerCase().includes(intent.toLowerCase())
        )
      );

      if (matchingAgents.length === 0) {
        // No specialized agent found, return first active agent as fallback
        return agents[0];
      }

      // If multiple matches, prefer agents with higher effectiveness (if available)
      // For now, return the first matching agent
      // Future: Could add effectiveness scoring or load balancing
      return matchingAgents[0];
    } catch (error) {
      console.error('Error selecting best agent for intent:', error);
      return null;
    }
  }

  /**
   * Handoff conversation to a different AI agent
   */
  static async handoffToAgent(
    sessionId: string, 
    newAgentId: string, 
    reason: string
  ): Promise<AiAgentSession> {
    try {
      const session = await storage.getAiAgentSession(sessionId);
      
      if (!session) {
        throw new Error(`AI agent session ${sessionId} not found`);
      }

      const oldAgent = await storage.getAiAgent(session.agentId);
      const newAgent = await storage.getAiAgent(newAgentId);

      // Update session with new agent
      await storage.updateAiAgentSession(sessionId, {
        agentId: newAgentId,
        handoverReason: reason,
      });

      // Log the handoff activity
      await storage.createActivityLog({
        conversationId: session.conversationId,
        action: 'agent_handoff',
        details: `AI Agent handoff: ${oldAgent?.name || 'Unknown'} → ${newAgent?.name || 'Unknown'}. Reason: ${reason}`,
      });

      console.log(`✅ Agent handoff completed: ${oldAgent?.name} → ${newAgent?.name} (Reason: ${reason})`);

      // Return updated session
      const updatedSession = await storage.getAiAgentSession(sessionId);
      if (!updatedSession) {
        throw new Error('Failed to retrieve updated session after handoff');
      }
      
      return updatedSession;
    } catch (error) {
      console.error('Error during agent handoff:', error);
      throw error;
    }
  }

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
   * Writing assistance result interface
   */
  static async generateWritingAssistance(
    message: string,
    context?: {
      conversationHistory?: string[];
      customerQuery?: string;
    }
  ): Promise<{
    enhancedText: string;
    suggestions: Array<{ style: string; text: string; description: string }>;
    autoComplete: string;
    improvements: string[];
    hasChanges: boolean;
  }> {
    try {
      const brandConfig = await this.loadBrandConfig();
      const brandVoicePrompt = this.buildBrandVoicePrompt(brandConfig);

      const systemPrompt = `You are an AI writing assistant helping support agents craft better responses. Your role is to:
1. Fix grammar, spelling, and punctuation errors
2. Improve clarity and professional tone
3. Suggest alternative response styles
4. Provide auto-complete suggestions to help finish the message
${brandVoicePrompt}

Analyze the agent's draft message and provide helpful writing assistance.`;

      const contextInfo = context?.customerQuery 
        ? `Customer's question: "${context.customerQuery}"\n` 
        : '';
      
      const historyInfo = context?.conversationHistory?.length 
        ? `Recent conversation:\n${context.conversationHistory.slice(-3).join('\n')}\n` 
        : '';

      const userPrompt = `${contextInfo}${historyInfo}
Agent's draft message:
"${message}"

Provide a JSON response with:
- enhancedText: The improved version with grammar/clarity fixes (keep similar length)
- suggestions: Array of 3 alternative response styles, each with:
  - style: one of "formal", "friendly", "concise"
  - text: The rewritten message in that style
  - description: Brief explanation of this style (e.g., "More professional tone")
- autoComplete: If the message seems incomplete, suggest how to finish it (otherwise empty string)
- improvements: Array of specific improvements made to create enhancedText
- hasChanges: Boolean indicating if any changes were suggested

Keep all suggestions professional, helpful, and appropriate for customer support.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.4,
        max_tokens: 2000,
      });

      let responseContent = completion.choices[0].message.content || '{}';
      responseContent = responseContent.replace(/```json\s*|\s*```/g, '').trim();
      
      const result = JSON.parse(responseContent);
      
      return {
        enhancedText: result.enhancedText || message,
        suggestions: result.suggestions || [],
        autoComplete: result.autoComplete || '',
        improvements: result.improvements || [],
        hasChanges: result.hasChanges || false,
      };
    } catch (error) {
      console.error('Error generating writing assistance:', error);
      return {
        enhancedText: message,
        suggestions: [],
        autoComplete: '',
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
      const systemPrompt = `You are Alex, a helpful customer support AI assistant for RapidRMS POS system. Act like a human agent with these guidelines:
- ONLY answer questions using the provided knowledge base information
- Maintain a professional, empathetic, and friendly tone like a human agent would
- When you need to escalate, say "Let me put you on a brief hold while I consult with my colleague for more details about this" 
- Never reveal you're an AI - act as a human support agent named Alex
- Never use general knowledge beyond what is provided

🚨 ABSOLUTE RESTRICTIONS - FAILURE TO FOLLOW WILL RESULT IN INCORRECT RESPONSES:
1. You MUST ONLY use information EXPLICITLY stated in the provided Knowledge Base section below
2. You have NO access to the internet, web search, or external sources
3. NEVER use your general training knowledge to answer questions - you are ONLY a knowledge base lookup system
4. If the knowledge base does NOT contain the exact answer, you MUST say "Let me connect you with a specialist" and set requiresHumanTakeover to true
5. NEVER invent, guess, or fabricate any technical details, procedures, or troubleshooting steps
6. NEVER provide generic IT/tech support advice that isn't from the knowledge base
7. If asked about topics NOT in the knowledge base (like general printer troubleshooting not specific to RapidRMS), escalate immediately

CRITICAL GUIDELINES:
- You MUST ONLY use information from the provided Knowledge Base
- If the knowledge base doesn't contain relevant information, use the colleague consultation phrase and require human takeover
- NEVER provide answers from general AI knowledge - this includes generic troubleshooting steps
- If confidence is low or no relevant knowledge base content exists, use human-like language and require human takeover
- Always respond as if you're a human agent who sometimes needs to check with colleagues
- When in doubt, ALWAYS escalate to a human agent rather than guessing

FORMATTING BEST PRACTICES (Important for clarity and readability):
- For instructional content, ALWAYS use numbered lists: "1. First step\n2. Second step\n3. Third step"
- For feature lists or options, use bullet points: "• First option\n• Second option\n• Third option" 
- When mentioning resources, include full URLs when available from knowledge base
- Use clear paragraph breaks (double newlines) to separate different topics
- Structure complex answers with intro → details → summary/next steps`;

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
        confidence: result.confidence ?? 50,
        requiresHumanTakeover: result.requiresHumanTakeover ?? false,
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
   * @param customerMessage The customer's message
   * @param conversationId The conversation ID
   * @param agentId Optional agent ID to use
   * @param language Optional language code (e.g., 'en', 'es', 'de', 'fr', 'zh', 'hi') for response
   */
  static async generateSmartAgentResponse(
    customerMessage: string,
    conversationId: string,
    agentId?: string,
    language?: string
  ): Promise<SmartAgentResponse> {
    const startTime = Date.now();
    
    try {
      // Log customer message
      conversationLogger.logCustomerMessage(conversationId, customerMessage);
      
      // Classify intent to determine appropriate response format and agent routing
      const intentClassification = await this.classifyIntent(customerMessage);
      console.log(`Intent classification: ${intentClassification.intent} (confidence: ${intentClassification.confidence}%)`);
      console.log(`Intent reasoning: ${intentClassification.reasoning}`);

      // Get or create AI agent session
      let session = await storage.getAiAgentSessionByConversation(conversationId);
      let agent: AiAgent | null = null;

      if (!session) {
        // If explicit agentId provided, use it
        if (agentId) {
          agent = (await storage.getAiAgent(agentId)) || null;
          console.log(`Using explicitly provided agent: ${agent?.name || 'not found'}`);
        }
        
        // Otherwise, select best agent based on intent
        if (!agent) {
          agent = await this.selectBestAgentForIntent(intentClassification.intent, customerMessage);
          if (agent) {
            console.log(`Selected specialized agent for ${intentClassification.intent} intent: ${agent.name}`);
          } else {
            // Fallback to any available agent
            agent = await this.findBestAgent(customerMessage);
            console.log(`Using fallback agent: ${agent?.name || 'not found'}`);
          }
        }
        
        if (agent) {
          session = await storage.createAiAgentSession({
            conversationId,
            agentId: agent.id,
            status: 'active',
            messageCount: 0,
            avgConfidence: 0,
          });
          console.log(`Created new AI agent session with ${agent.name}`);
        }
      } else {
        // Session exists - check if we should handoff to a specialized agent
        agent = (await storage.getAiAgent(session.agentId)) || null;
        
        // If current agent doesn't specialize in this intent, consider handoff
        const currentAgentSpecializations = agent?.specializations || [];
        const isSpecializedForIntent = currentAgentSpecializations.some(spec => 
          spec.toLowerCase().includes(intentClassification.intent.toLowerCase())
        );
        
        if (!isSpecializedForIntent && intentClassification.confidence > 70) {
          const specializedAgent = await this.selectBestAgentForIntent(intentClassification.intent, customerMessage);
          
          if (specializedAgent && specializedAgent.id !== agent?.id) {
            console.log(`Handing off from ${agent?.name} to specialized agent: ${specializedAgent.name} for ${intentClassification.intent} intent`);
            session = await this.handoffToAgent(
              session.id, 
              specializedAgent.id, 
              `Intent changed to ${intentClassification.intent} (confidence: ${intentClassification.confidence}%)`
            );
            agent = specializedAgent;
          }
        }
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

      // Get conversation details including context data
      const conversation = await storage.getConversation(conversationId);
      let contextData: any = null;
      if (conversation?.contextData) {
        try {
          contextData = JSON.parse(conversation.contextData);
        } catch (e) {
          console.error('Failed to parse context data:', e);
        }
      }

      // Get conversation history
      const messages = await storage.getMessagesByConversation(conversationId);
      
      // ✅ DIAGNOSTIC FLOW: Handle custom greeting and diagnostic questions
      const diagnosticState = contextData?.diagnosticState || { currentQuestionId: null, answers: {}, completed: false };
      const diagnosticQuestions = agent.diagnosticQuestions as Array<{
        id: string;
        question: string;
        type: 'multiple_choice' | 'text' | 'yes_no';
        options?: string[];
        followUpQuestionId?: string;
      }> | null;
      
      // Check if this is the first AI response (greeting scenario)
      const isFirstResponse = session.messageCount === 0;
      
      // Handle diagnostic flow if enabled
      if (agent.diagnosticFlowEnabled && diagnosticQuestions && diagnosticQuestions.length > 0) {
        // Check if diagnostic flow is in progress or should start
        if (!diagnosticState.completed) {
          let responseText = '';
          let nextQuestionId: string | null = null;
          
          if (isFirstResponse) {
            // Start with greeting (if configured) and first diagnostic question
            const greeting = agent.greeting || `Hello! I'm ${agent.name}, here to help you.`;
            const firstQuestion = diagnosticQuestions[0];
            nextQuestionId = firstQuestion.id;
            
            responseText = `${greeting}\n\nTo help you better, I have a few quick questions:\n\n**${firstQuestion.question}**`;
            
            // Add options for multiple choice questions
            if (firstQuestion.type === 'multiple_choice' && firstQuestion.options) {
              responseText += '\n' + firstQuestion.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n');
            } else if (firstQuestion.type === 'yes_no') {
              responseText += '\n• Yes\n• No';
            }
            
            // Update diagnostic state
            const newState = { currentQuestionId: nextQuestionId, answers: {}, completed: false };
            await storage.updateConversation(conversationId, {
              contextData: JSON.stringify({ ...contextData, diagnosticState: newState })
            });
            
            // Update session
            await storage.updateAiAgentSession(session.id, {
              messageCount: 1,
              avgConfidence: 85,
            });
            
            console.log(`[Diagnostic Flow] Started with question: ${firstQuestion.id}`);
            
            return {
              response: responseText,
              confidence: 85,
              requiresHumanTakeover: false,
              suggestedActions: [],
              knowledgeUsed: [],
              agentId: agent.id,
              format: 'regular',
              sessionId: session.id,
              messageCount: 1,
              avgConfidence: 85,
              shouldLearn: false,
            };
          } else if (diagnosticState.currentQuestionId) {
            // Process answer to current question and move to next
            const currentQuestion = diagnosticQuestions.find(q => q.id === diagnosticState.currentQuestionId);
            
            if (currentQuestion) {
              // Store the answer
              diagnosticState.answers[currentQuestion.id] = customerMessage;
              
              // Find next question
              let nextQuestion = null;
              if (currentQuestion.followUpQuestionId) {
                nextQuestion = diagnosticQuestions.find(q => q.id === currentQuestion.followUpQuestionId);
              } else {
                // Get next in sequence
                const currentIdx = diagnosticQuestions.findIndex(q => q.id === currentQuestion.id);
                if (currentIdx < diagnosticQuestions.length - 1) {
                  nextQuestion = diagnosticQuestions[currentIdx + 1];
                }
              }
              
              if (nextQuestion) {
                // Ask next question
                responseText = `Got it, thank you!\n\n**${nextQuestion.question}**`;
                
                if (nextQuestion.type === 'multiple_choice' && nextQuestion.options) {
                  responseText += '\n' + nextQuestion.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n');
                } else if (nextQuestion.type === 'yes_no') {
                  responseText += '\n• Yes\n• No';
                }
                
                // Update diagnostic state
                const newState = { 
                  currentQuestionId: nextQuestion.id, 
                  answers: diagnosticState.answers, 
                  completed: false 
                };
                await storage.updateConversation(conversationId, {
                  contextData: JSON.stringify({ ...contextData, diagnosticState: newState })
                });
                
                console.log(`[Diagnostic Flow] Moving to question: ${nextQuestion.id}`);
                
                return {
                  response: responseText,
                  confidence: 85,
                  requiresHumanTakeover: false,
                  suggestedActions: [],
                  knowledgeUsed: [],
                  agentId: agent.id,
                  format: 'regular',
                  sessionId: session.id,
                  messageCount: session.messageCount + 1,
                  avgConfidence: 85,
                  shouldLearn: false,
                };
              } else {
                // Diagnostic flow complete - mark as done and proceed with normal response
                diagnosticState.completed = true;
                const newState = { 
                  currentQuestionId: null, 
                  answers: diagnosticState.answers, 
                  completed: true 
                };
                await storage.updateConversation(conversationId, {
                  contextData: JSON.stringify({ ...contextData, diagnosticState: newState })
                });
                
                console.log(`[Diagnostic Flow] Completed. Answers:`, diagnosticState.answers);
                
                // Enhance context data with diagnostic answers for AI response
                contextData = { ...contextData, diagnosticState: newState, diagnosticAnswers: diagnosticState.answers };
              }
            }
          }
        }
      } else if (isFirstResponse && agent.greeting) {
        // No diagnostic flow, but has custom greeting - prepend greeting to first response
        // This will be handled later when generating the response
        contextData = { ...contextData, includeGreeting: true, greeting: agent.greeting };
      }
      const conversationHistory = messages
        .filter(msg => msg.scope !== 'internal')
        .slice(-10)
        .map(msg => `${msg.senderType}: ${msg.content}`);

      // Determine response format based on intent
      let responseFormat: keyof typeof RESPONSE_FORMATS = 'conversational';
      if (intentClassification.intent === 'technical') {
        responseFormat = 'step_by_step';
      } else if (intentClassification.intent === 'billing') {
        responseFormat = 'bullet_points';
      } else if (intentClassification.intent === 'sales') {
        responseFormat = 'conversational';
      } else {
        responseFormat = 'conversational';
      }

      // Get relevant knowledge base articles using enhanced retrieval
      // ✅ PHASE 2: Pass conversation history for query rewriting
      const searchResults = await this.getRelevantKnowledge(customerMessage, agent.knowledgeBaseIds || [], conversationHistory);
      
      // ✅ PHASE 1 IMPROVEMENT: Enhanced Retrieval Logging
      // Log detailed retrieval information for debugging "AI not using docs" issues
      console.log('╔═══════════════════════════════════════════════════════════════════╗');
      console.log('║                   📚 RETRIEVAL LOG - DEBUG INFO                   ║');
      console.log('╚═══════════════════════════════════════════════════════════════════╝');
      console.log(`\n🔍 Query: "${customerMessage}"\n`);
      console.log(`📊 Results Retrieved: ${searchResults.length} chunks\n`);
      
      if (searchResults.length > 0) {
        console.log('📋 Top Retrieved Chunks:\n');
        searchResults.slice(0, 5).forEach((result, idx) => {
          console.log(`  ${idx + 1}. [Score: ${result.score.toFixed(3)}] [${result.matchType.toUpperCase()}]`);
          console.log(`     📄 Article: "${result.chunk.metadata.sourceTitle}"`);
          console.log(`     📌 Section: "${result.chunk.title || result.chunk.metadata.chunkTitle || 'N/A'}"`);
          console.log(`     🏷️  Category: ${result.chunk.category}`);
          console.log(`     🔖 Tags: ${result.chunk.tags.join(', ') || 'none'}`);
          console.log(`     📝 Content Preview: ${result.chunk.content.substring(0, 100).replace(/\n/g, ' ')}...`);
          if (result.matchedTerms && result.matchedTerms.length > 0) {
            console.log(`     🎯 Matched Terms: ${result.matchedTerms.slice(0, 5).join(', ')}`);
          }
          console.log('');
        });
        
        // ✅ Check if best score meets confidence threshold
        const bestScore = searchResults[0].score;
        console.log(`\n🎯 Best Retrieval Score: ${bestScore.toFixed(3)}`);
        if (bestScore < 0.3) {
          console.log(`⚠️  WARNING: Best score (${bestScore.toFixed(3)}) below confidence threshold (0.3)`);
          console.log('   → AI should abstain and suggest human agent\n');
        } else {
          console.log(`✅ Score above threshold - AI can provide grounded answer\n`);
        }
      } else {
        console.log('❌ No chunks retrieved - AI will escalate to human agent\n');
      }
      console.log('═══════════════════════════════════════════════════════════════════\n');
      
      // Log AI processing details
      conversationLogger.logAIProcessing(conversationId, {
        customerMessage,
        intentClassification,
        knowledgeSearch: {
          query: customerMessage,
          resultsCount: searchResults.length,
          topResults: searchResults.slice(0, 3).map(r => ({
            title: r.chunk.title,
            score: r.score,
            relevance: r.score,
            article: r.chunk.metadata.sourceTitle,
            section: r.chunk.metadata.chunkTitle,
            category: r.chunk.category,
            matchType: r.matchType
          }))
        },
        agentSelected: {
          agentId: agent.id,
          agentName: agent.name,
          specializations: agent.specializations || []
        }
      });

      // Generate response using agent's configuration with format guidance
      const response = await this.generateAgentResponseWithConfig(
        customerMessage,
        conversationHistory,
        searchResults,
        agent,
        responseFormat,
        contextData
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

      // Score response quality
      const qualityScores = await this.scoreResponseQuality(customerMessage, response.response);
      console.log('Response quality scores:', qualityScores);
      
      // Log AI response with duration
      const duration = Date.now() - startTime;
      conversationLogger.logAIResponse(conversationId, {
        response: response.response,
        confidence: response.confidence,
        requiresHumanTakeover: response.requiresHumanTakeover,
        suggestedActions: response.suggestedActions,
        knowledgeUsed: response.knowledgeUsed,
        format: response.format || 'regular'
      }, duration);

      // Record learning data with quality scores and intent
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
          responseFormat: responseFormat,
          intentCategory: intentClassification.intent,
          qualityScore: qualityScores.qualityScore,
          toneScore: qualityScores.toneScore,
          relevanceScore: qualityScores.relevanceScore,
          completenessScore: qualityScores.completenessScore,
        });
      }

      // Track knowledge gaps for low-confidence responses
      // This helps identify topics that need more documentation
      if (response.confidence < 50 && customerMessage.trim().length > 10) {
        try {
          await storage.createOrUpdateKnowledgeGap(customerMessage, response.confidence);
          console.log(`📚 Knowledge gap tracked: "${customerMessage.slice(0, 50)}..." (confidence: ${response.confidence}%)`);
        } catch (gapError) {
          console.error('Error tracking knowledge gap:', gapError);
          // Don't let gap tracking errors affect the response
        }
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
    agent: AiAgent,
    responseFormat: keyof typeof RESPONSE_FORMATS = 'conversational',
    contextData?: any
  ): Promise<AIAgentResponse> {
    try {
      // Fetch images for articles in search results (for visual aids in hardware manuals)
      const articleImages = searchResults.length > 0 
        ? await this.fetchImagesForArticles(searchResults)
        : new Map();
      
      // Enhanced knowledge context formatting with better structure and image references
      const knowledgeContext = searchResults.length 
        ? this.formatKnowledgeContext(searchResults, articleImages)
        : '\nKnowledge Base: No relevant knowledge base articles available.\n';

      const conversationContext = conversationHistory.length 
        ? `\nConversation History:\n${conversationHistory.join('\n')}\n`
        : '';

      // Add custom context data if provided
      const customContext = contextData 
        ? `\nCustom Context Data:\n${JSON.stringify(contextData, null, 2)}\n(Use this information to provide personalized, context-aware responses)\n`
        : '';

      // Extract language preference from context data
      const language = contextData?.language || 'en';

      // Calculate knowledge quality score for confidence adjustment
      const knowledgeQuality = this.calculateKnowledgeQuality(searchResults);

      // Detect if customer message is too vague to provide helpful assistance
      const isVagueQuery = this.detectVagueQuery(customerMessage);
      
      // ✅ PHASE 1 IMPROVEMENT: Confidence Threshold Check
      // If best retrieval score is below 0.3, AI should abstain and suggest human help
      const bestRetrievalScore = searchResults.length > 0 ? searchResults[0].score : 0;
      const meetsConfidenceThreshold = bestRetrievalScore >= 0.3;
      const shouldAbstain = !meetsConfidenceThreshold && searchResults.length > 0;
      
      console.log('=== AI Query Analysis Debug ===');
      console.log('Customer message:', customerMessage);
      console.log('Detected as vague query:', isVagueQuery);
      console.log('Knowledge context available:', searchResults.length > 0);
      console.log('Knowledge quality score:', knowledgeQuality.toFixed(2));
      console.log('Search results count:', searchResults.length);
      console.log('Confidence threshold check:', meetsConfidenceThreshold ? '✅ PASS' : '❌ FAIL');
      console.log('Should abstain from answering:', shouldAbstain ? 'YES (low retrieval score)' : 'NO');
      if (searchResults.length > 0) {
        console.log('Top search result score:', searchResults[0].score);
        console.log('Top search result title:', searchResults[0].chunk.title);
      }

      // Get the format template for this response
      const formatTemplate = RESPONSE_FORMATS[responseFormat];

      const userPrompt = `${knowledgeContext}${conversationContext}${customContext}
Customer Message: "${customerMessage}"

Agent Role: ${agent.name} - ${agent.description}
Specializations: ${agent.specializations?.join(', ') || 'General Support'}

RESPONSE FORMAT REQUIREMENT:
Format: ${responseFormat}
Instructions: ${formatTemplate.prompt}
Example: ${formatTemplate.example}

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

FORMATTING EXCELLENCE (Critical for customer understanding):
- For step-by-step instructions: Use numbered lists: "1. First step\n2. Second step\n3. Third step"
- For feature lists or options: Use bullet points: "• First option\n• Second option\n• Third option"
- For alternatives or choices: Use dashes: "- Option A: description\n- Option B: description"
- Include full URLs when referencing knowledge base articles or resources
- Use paragraph breaks (double newlines "\n\n") to separate distinct topics
- Start with context, provide details, end with next steps or summary
- Make content scannable and easy to follow

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

✅ CONFIDENCE THRESHOLD CHECK (NEW):
- Best retrieval score: ${bestRetrievalScore.toFixed(3)}
- Meets confidence threshold (≥0.3): ${meetsConfidenceThreshold ? 'YES' : 'NO'}
- Should abstain from answering: ${shouldAbstain ? 'YES' : 'NO'}

IF shouldAbstain = YES (retrieval score < 0.3):
- DO NOT attempt to answer the question
- Politely explain: "I don't have enough information in my knowledge base to provide an accurate answer to your specific question."
- Suggest: "Let me connect you with one of our specialists who can help you with this. Would that work for you?"
- Set requiresHumanTakeover to true
- Set confidence to 20-30

IF knowledge base results > 0 and quality score ≥ 3.0 and meetsConfidenceThreshold = YES:
→ PROVIDE KNOWLEDGE-BASED SOLUTION WITH CITATIONS
- Use format: "steps" for how-to questions, tutorials, troubleshooting, setup instructions
- Use format: "regular" for simple answers, information requests, or general inquiries
- ✅ MANDATORY: CITE sources using [Article → Section] format
- Example: "According to [PAX Terminal Setup → Bluetooth Connection], you should first..."
- Provide comprehensive solutions using ONLY the provided knowledge base information
- Quote exact config names, settings, or labels from the knowledge base when possible
- Set confidence to 70-95 based on knowledge quality
- Set requiresHumanTakeover to false

IF knowledge base results = 0 or quality score < 3.0:
→ ESCALATE TO HUMAN
- Set requiresHumanTakeover to true
- Explain you need to connect them with a specialist
- Suggest relevant knowledge base articles if available

CRITICAL RULES:
- NEVER ask clarifying questions when query analysis shows vague = NO
- NEVER provide knowledge-based solutions when query analysis shows vague = YES
- ONLY use information from the provided Knowledge Base chunks for solutions
- NEVER provide answers from general knowledge when giving solutions
- ✅ ALWAYS cite sources using [Article → Section] when providing solutions
- ✅ ABSTAIN from answering if retrieval score < 0.3 (low confidence threshold)

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

      // Build system prompt with optional language instruction
      let systemPrompt = agent.systemPrompt;
      if (language && language !== 'en') {
        const languageNames: Record<string, string> = {
          'es': 'Spanish',
          'de': 'German', 
          'fr': 'French',
          'zh': 'Chinese (Simplified)',
          'hi': 'Hindi',
          'gu': 'Gujarati'
        };
        const languageName = languageNames[language] || language;
        systemPrompt = `${agent.systemPrompt}\n\n**IMPORTANT LANGUAGE INSTRUCTION**: You MUST respond in ${languageName}. The user prefers ${languageName} language. Translate your entire response to ${languageName}.`;
      }

      const startTime = Date.now();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: (agent.temperature || 30) / 100,
        max_tokens: agent.maxTokens || 1000,
      });
      const latencyMs = Date.now() - startTime;

      // Track token usage
      await trackTokenUsage(
        completion.usage,
        "gpt-4o-mini",
        "chat_response",
        {
          conversationId: contextData?.conversationId,
          agentId: agent.id,
          latencyMs
        }
      );

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
      
      // Extract unique KB articles for reference links
      const uniqueArticles = new Map<string, { id: string; title: string }>();
      for (const result of searchResults.slice(0, 3)) { // Top 3 most relevant
        if (!uniqueArticles.has(result.chunk.knowledgeBaseId)) {
          uniqueArticles.set(result.chunk.knowledgeBaseId, {
            id: result.chunk.knowledgeBaseId,
            title: result.chunk.metadata.sourceTitle || result.chunk.title
          });
        }
      }
      
      // Format reference links section (only if agent setting allows)
      let responseWithReferences = response;
      const shouldIncludeLinks = agent.includeResourceLinks !== false; // Default to true
      if (uniqueArticles.size > 0 && !shouldForceHumanTakeover && shouldIncludeLinks) {
        const references = Array.from(uniqueArticles.values())
          .map(article => `• [${article.title}](/kb/${article.id})`)
          .join('\n');
        
        responseWithReferences = `${response}\n\n**📚 Learn More:**\n${references}`;
      }
      
      // Prepend greeting if configured (for first response without diagnostic flow)
      if (contextData?.includeGreeting && contextData?.greeting) {
        responseWithReferences = `${contextData.greeting}\n\n${responseWithReferences}`;
      }
      
      // Track which KB articles were used (for AI learning)
      await trackKnowledgeFeedback(
        searchResults,
        customerMessage,
        {
          conversationId: contextData?.conversationId,
          agentId: agent.id,
          wasUsedInResponse: searchResults.length > 0 && !shouldForceHumanTakeover,
          wasLinkProvided: shouldIncludeLinks && uniqueArticles.size > 0,
          requiredHumanTakeover: shouldForceHumanTakeover || result.requiresHumanTakeover || false
        }
      );
      
      return {
        response: responseWithReferences,
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
   * ✅ PHASE 2: Query Rewriting - Extract entities and build enhanced search query
   * Combines user query with conversation context for better retrieval
   */
  private static rewriteQuery(query: string, conversationHistory: string[]): string {
    const lowerQuery = query.toLowerCase();
    const context = conversationHistory.slice(-3).join(' ').toLowerCase(); // Last 3 messages
    
    // Extract entities from query and context
    const entities = {
      products: [] as string[],
      features: [] as string[],
      actions: [] as string[],
      errorCodes: [] as string[],
      issues: [] as string[]
    };
    
    // Common product patterns
    const productPatterns = /\b(pax|ipad|iphone|terminal|device|tablet|phone|app|application)\b/gi;
    const productMatches = [...query.matchAll(productPatterns), ...context.matchAll(productPatterns)];
    entities.products = [...new Set(productMatches.map(m => m[0].toLowerCase()))];
    
    // Feature patterns
    const featurePatterns = /\b(bluetooth|wifi|payment|sync|connection|settings|config|setup)\b/gi;
    const featureMatches = [...query.matchAll(featurePatterns), ...context.matchAll(featurePatterns)];
    entities.features = [...new Set(featureMatches.map(m => m[0].toLowerCase()))];
    
    // Action patterns
    const actionPatterns = /\b(connect|pair|setup|install|configure|fix|reset|troubleshoot|update)\b/gi;
    const actionMatches = [...query.matchAll(actionPatterns), ...context.matchAll(actionPatterns)];
    entities.actions = [...new Set(actionMatches.map(m => m[0].toLowerCase()))];
    
    // Error code patterns
    const errorPatterns = /\b(error|code|message|warning|alert)\s*:?\s*(\d+|[A-Z0-9]+)\b/gi;
    const errorMatches = [...query.matchAll(errorPatterns)];
    entities.errorCodes = [...new Set(errorMatches.map(m => `${m[1]} ${m[2]}`))];
    
    // Issue patterns
    const issuePatterns = /\b(not working|failed|broken|issue|problem|error|won't|can't|unable)\b/gi;
    const issueMatches = [...query.matchAll(issuePatterns)];
    entities.issues = [...new Set(issueMatches.map(m => m[0].toLowerCase()))];
    
    // Build enhanced query
    let enhancedQuery = query;
    
    // Add contextual entities if they're not already in the query
    const queryLower = query.toLowerCase();
    
    // Add products from context if relevant
    if (entities.products.length > 0 && !entities.products.some(p => queryLower.includes(p))) {
      const contextProducts = entities.products.filter(p => context.includes(p) && !queryLower.includes(p));
      if (contextProducts.length > 0) {
        enhancedQuery += ` ${contextProducts.join(' ')}`;
      }
    }
    
    // Add features from context if relevant to the action
    if (entities.actions.length > 0 && entities.features.length > 0) {
      const contextFeatures = entities.features.filter(f => context.includes(f) && !queryLower.includes(f));
      if (contextFeatures.length > 0 && contextFeatures.length <= 2) {
        enhancedQuery += ` ${contextFeatures.join(' ')}`;
      }
    }
    
    // Add error codes if found
    if (entities.errorCodes.length > 0) {
      enhancedQuery += ` ${entities.errorCodes.join(' ')}`;
    }
    
    return enhancedQuery.trim();
  }
  
  /**
   * ✅ PHASE 2: MMR (Maximal Marginal Relevance) - Promote diversity in search results
   * Avoids returning 10 near-identical chunks from the same article section
   */
  private static applyMMR(results: SearchResult[], lambda: number = 0.7): SearchResult[] {
    if (results.length <= 3) return results; // Too few to filter
    
    const selected: SearchResult[] = [];
    const remaining = [...results];
    
    // Always select the highest-scoring result first
    if (remaining.length > 0) {
      selected.push(remaining.shift()!);
    }
    
    // Iteratively select results that balance relevance and diversity
    while (remaining.length > 0 && selected.length < 10) {
      let bestScore = -Infinity;
      let bestIndex = -1;
      
      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        
        // Calculate diversity score (how different is this from selected results?)
        let maxSimilarity = 0;
        for (const selectedResult of selected) {
          const similarity = this.calculateChunkSimilarity(candidate, selectedResult);
          maxSimilarity = Math.max(maxSimilarity, similarity);
        }
        
        // MMR formula: lambda * relevance - (1 - lambda) * max_similarity
        const mmrScore = lambda * candidate.score - (1 - lambda) * maxSimilarity;
        
        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestIndex = i;
        }
      }
      
      if (bestIndex >= 0) {
        selected.push(remaining.splice(bestIndex, 1)[0]);
      } else {
        break;
      }
    }
    
    return selected;
  }
  
  /**
   * Calculate similarity between two chunks for MMR diversity
   */
  private static calculateChunkSimilarity(chunk1: SearchResult, chunk2: SearchResult): number {
    // Same article and close chunk indices = high similarity
    if (chunk1.chunk.knowledgeBaseId === chunk2.chunk.knowledgeBaseId) {
      const indexDiff = Math.abs(chunk1.chunk.chunkIndex - chunk2.chunk.chunkIndex);
      if (indexDiff === 0) return 1.0; // Same chunk
      if (indexDiff === 1) return 0.8; // Adjacent chunks
      if (indexDiff <= 2) return 0.6; // Close chunks
      return 0.3; // Same article, distant chunks
    }
    
    // Same category = moderate similarity
    if (chunk1.chunk.category === chunk2.chunk.category) {
      // Check tag overlap
      const tags1 = new Set(chunk1.chunk.tags);
      const tags2 = new Set(chunk2.chunk.tags);
      const overlap = [...tags1].filter(t => tags2.has(t)).length;
      const total = Math.max(tags1.size, tags2.size);
      
      if (total === 0) return 0.2;
      return 0.2 + (overlap / total) * 0.3; // 0.2-0.5 range
    }
    
    // Different articles and categories = low similarity
    return 0.1;
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
   * ✅ PHASE 2 IMPROVEMENT: Added query rewriting for better context understanding
   */
  private static async getRelevantKnowledge(query: string, knowledgeBaseIds: string[], conversationHistory?: string[]): Promise<SearchResult[]> {
    try {
      // If no KB IDs assigned to agent, search ALL available KB articles instead of returning empty
      const shouldExpandScope = knowledgeBaseIds.length === 0;
      
      if (shouldExpandScope) {
        console.log('⚠️  Agent has no KB articles assigned - searching ALL available knowledge base articles');
      } else {
        console.log(`🔍 Searching ${knowledgeBaseIds.length} assigned KB articles for agent: ${knowledgeBaseIds.join(', ')}`);
      }

      // ✅ PHASE 2: Query Rewriting - Extract entities and build enhanced search query
      const rewrittenQuery = this.rewriteQuery(query, conversationHistory || []);
      console.log(`\n🔄 Query Rewriting:`);
      console.log(`   Original: "${query}"`);
      console.log(`   Rewritten: "${rewrittenQuery}"`);
      
      // Use rewritten query for search
      const searchQuery = rewrittenQuery;

      // Enhanced query analysis for better search optimization
      const queryAnalysis = this.analyzeQuery(searchQuery);
      
      // Dynamic search parameters based on query characteristics
      const searchOptions = this.getOptimalSearchOptions(queryAnalysis);
      
      // CRITICAL FIX: Enable expandScope if agent has no assigned KB IDs
      // This ensures we search ALL knowledge base articles instead of returning empty results
      if (shouldExpandScope) {
        searchOptions.expandScope = true;
        searchOptions.maxResults = 6; // ⚡ Reduced from 10 to 6 for faster performance
        console.log('✅ expandScope ENABLED - will search all KB articles');
      }
      
      console.log(`Query analysis - Type: ${queryAnalysis.type}, Intent: ${queryAnalysis.intent}, Complexity: ${queryAnalysis.complexity}`);
      console.log(`Search options - expandScope: ${searchOptions.expandScope}, maxResults: ${searchOptions.maxResults}, minScore: ${searchOptions.minScore}`);
      
      // Multi-tiered search strategy
      let searchResults = await knowledgeRetrieval.search(searchQuery, knowledgeBaseIds, searchOptions);
      
      console.log(`📊 Initial search returned ${searchResults.length} results`);
      
      // If insufficient results for complex queries, try broader search
      if (searchResults.length < 2 && queryAnalysis.complexity === 'high') {
        console.log('Insufficient results for complex query, expanding search...');
        const broadSearchOptions = {
          ...searchOptions,
          minScore: Math.max(0.1, searchOptions.minScore! - 0.05),
          maxResults: 8,
          expandScope: true,
        };
        searchResults = await knowledgeRetrieval.search(searchQuery, knowledgeBaseIds, broadSearchOptions);
        console.log(`📊 Expanded search returned ${searchResults.length} results`);
      }
      
      // ✅ PHASE 2: Apply MMR (Maximal Marginal Relevance) for diversity
      const diverseResults = this.applyMMR(searchResults, 0.7); // Lambda = 0.7 balances relevance vs diversity
      console.log(`🎯 MMR applied: ${searchResults.length} → ${diverseResults.length} diverse results`);
      
      // Enhanced context filtering and ranking
      const filteredResults = this.filterAndRankResults(diverseResults, queryAnalysis);
      
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
   * ✅ PHASE 1 IMPROVEMENT: Increased top-k and min score thresholds per RAG best practices
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
          maxResults: 8, // Increased for better coverage
          minScore: 0.15, // Lowered to catch more relevant results
          requireSteps: true,
          expandScope: true, // Instructional content might be in various articles
        };
        
      case 'troubleshooting':
        return {
          ...baseOptions,
          maxResults: 8, // Increased for better coverage
          minScore: 0.15, // Lowered to catch more relevant results
          requireSteps: true, // Troubleshooting often involves steps
          expandScope: true, // Issues might span multiple topics
        };
        
      case 'specific':
        return {
          ...baseOptions,
          maxResults: 5, // ⚡ Reduced from 8 to 5 for faster performance
          minScore: 0.35, // ✅ Increased for precision
          expandScope: false, // Keep search focused
        };
        
      default: // informational
        return {
          ...baseOptions,
          maxResults: analysis.complexity === 'high' ? 6 : 5, // ⚡ Reduced from 10/8 to 6/5 for speed
          minScore: analysis.complexity === 'high' ? 0.25 : 0.3, // ✅ Balanced thresholds
          expandScope: analysis.complexity === 'high',
        };
    }
  }

  /**
   * Filter and rank search results based on query analysis
   * ✅ PHASE 1 IMPROVEMENT: Metadata-aware filtering and better thresholds
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
      
      // ✅ Boost high-priority articles
      if (result.chunk.priority > 75) {
        adjustedScore *= 1.05;
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
        // Relaxed thresholds to catch more relevant results
        if (analysis.type === 'instructional' || analysis.type === 'troubleshooting') {
          return result.score > 0.12; // Lower threshold for how-to queries
        }
        if (analysis.complexity === 'high') {
          return result.score > 0.18;
        }
        return result.score > 0.2;
      })
      .slice(0, analysis.complexity === 'high' ? 8 : 6);
  }

  /**
   * Fetch images for all articles referenced in search results
   */
  private static async fetchImagesForArticles(searchResults: SearchResult[]): Promise<Map<string, KnowledgeBaseImage[]>> {
    const imageMap = new Map<string, KnowledgeBaseImage[]>();
    
    // Get unique article IDs from search results
    const articleIds = [...new Set(searchResults.map(r => r.chunk.knowledgeBaseId))];
    
    // Fetch images for each article in parallel
    await Promise.all(articleIds.map(async (articleId) => {
      try {
        const images = await storage.getKnowledgeBaseImages(articleId);
        if (images.length > 0) {
          imageMap.set(articleId, images);
        }
      } catch (error) {
        console.error(`Error fetching images for article ${articleId}:`, error);
      }
    }));
    
    return imageMap;
  }

  /**
   * Format knowledge context for better AI consumption
   * ✅ PHASE 1 IMPROVEMENT: Enhanced formatting with source IDs for citations
   * ✅ Image references included for hardware manuals with visual aids
   */
  private static formatKnowledgeContext(
    searchResults: SearchResult[], 
    articleImages?: Map<string, KnowledgeBaseImage[]>
  ): string {
    if (searchResults.length === 0) {
      return '\nKnowledge Base: No relevant knowledge base articles available.\n';
    }

    const sections = searchResults.map((result, index) => {
      const relevanceLabel = result.score > 0.8 ? 'High' : 
                            result.score > 0.5 ? 'Medium' : 'Low';
      
      const sourceId = `SOURCE_${index + 1}`;
      const articleTitle = result.chunk.metadata.sourceTitle;
      const sectionTitle = result.chunk.title || result.chunk.metadata.chunkTitle || 'General';
      
      // Get images for this article if available
      const images = articleImages?.get(result.chunk.knowledgeBaseId) || [];
      let imageSection = '';
      
      if (images.length > 0) {
        const imageRefs = images.map((img, imgIndex) => {
          const description = img.description || img.originalName || `Image ${imgIndex + 1}`;
          // Use relative URL path that can be served by the backend
          const imageUrl = `/uploads/knowledge-base-images/${result.chunk.knowledgeBaseId}/${img.filename}`;
          return `  [IMAGE_${imgIndex + 1}]: ${description} - URL: ${imageUrl}`;
        }).join('\n');
        
        imageSection = `\nRelated Images (include these URLs when helpful for visual guidance):\n${imageRefs}\n`;
      }
      
      return `
--- ${sourceId}: [${articleTitle} → ${sectionTitle}] ---
Relevance: ${relevanceLabel} (${result.score.toFixed(2)})
Match Type: ${result.matchType}
Category: ${result.chunk.category}
Tags: ${result.chunk.tags.join(', ') || 'none'}
Content:
${result.chunk.content}
${result.chunk.metadata.hasStructure ? '[Well-structured content]' : '[Unstructured content]'}${imageSection}
---`;
    });

    // Add image usage instructions if any images were found
    const hasAnyImages = articleImages && articleImages.size > 0;
    const imageInstructions = hasAnyImages 
      ? `\n📷 IMAGE USAGE: When referencing steps that have related images, include the image URL in markdown format: ![Description](URL)
This helps customers visualize the instructions, especially for hardware setup and troubleshooting.`
      : '';

    return `\nKnowledge Base Sources (CITE THESE IN YOUR RESPONSE):\n${sections.join('\n')}\n
IMPORTANT: When using information from these sources, cite them as [Article → Section] in your response.
For example: "According to [PAX Terminal Setup → Bluetooth Connection], you should..."${imageInstructions}`;
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

  /**
   * Generate streaming AI agent response with real-time token delivery
   * Yields tokens as they arrive from OpenAI for ChatGPT-like experience
   */
  static async *generateSmartAgentResponseStream(
    customerMessage: string,
    conversationId: string,
    agentId?: string
  ): AsyncGenerator<{ type: 'token' | 'metadata'; data: any }, void, unknown> {
    const startTime = Date.now();
    
    try {
      // Log customer message
      conversationLogger.logCustomerMessage(conversationId, customerMessage);
      
      // Classify intent to determine appropriate response format and agent routing
      const intentClassification = await this.classifyIntent(customerMessage);
      console.log(`[Stream] Intent: ${intentClassification.intent} (${intentClassification.confidence}%)`);

      // Get or create AI agent session
      let session = await storage.getAiAgentSessionByConversation(conversationId);
      let agent: AiAgent | null = null;

      if (!session) {
        // Select or create agent (same logic as non-streaming version)
        if (agentId) {
          agent = (await storage.getAiAgent(agentId)) || null;
        }
        
        if (!agent) {
          agent = await this.selectBestAgentForIntent(intentClassification.intent, customerMessage);
          if (!agent) {
            agent = await this.findBestAgent(customerMessage);
          }
        }
        
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
        
        // Check for agent handoff
        const currentAgentSpecializations = agent?.specializations || [];
        const isSpecializedForIntent = currentAgentSpecializations.some(spec => 
          spec.toLowerCase().includes(intentClassification.intent.toLowerCase())
        );
        
        if (!isSpecializedForIntent && intentClassification.confidence > 70) {
          const specializedAgent = await this.selectBestAgentForIntent(intentClassification.intent, customerMessage);
          
          if (specializedAgent && specializedAgent.id !== agent?.id) {
            session = await this.handoffToAgent(
              session.id, 
              specializedAgent.id, 
              `Intent changed to ${intentClassification.intent}`
            );
            agent = specializedAgent;
          }
        }
      }

      if (!agent || !session) {
        // Fallback response
        yield {
          type: 'token',
          data: 'I apologize, but I need to connect you with a specialist to assist you properly.'
        };
        yield {
          type: 'metadata',
          data: {
            sessionId: 'fallback',
            confidence: 30,
            requiresHumanTakeover: true,
            agentId: null
          }
        };
        return;
      }

      // Get conversation context
      const conversation = await storage.getConversation(conversationId);
      let contextData: any = null;
      if (conversation?.contextData) {
        try {
          contextData = JSON.parse(conversation.contextData);
        } catch (e) {
          console.error('Failed to parse context data:', e);
        }
      }

      // Get conversation history
      const messages = await storage.getMessagesByConversation(conversationId);
      
      // ✅ DIAGNOSTIC FLOW (Streaming): Handle custom greeting and diagnostic questions
      const diagnosticState = contextData?.diagnosticState || { currentQuestionId: null, answers: {}, completed: false };
      const diagnosticQuestions = agent.diagnosticQuestions as Array<{
        id: string;
        question: string;
        type: 'multiple_choice' | 'text' | 'yes_no';
        options?: string[];
        followUpQuestionId?: string;
      }> | null;
      
      const isFirstResponse = session.messageCount === 0;
      
      // Handle diagnostic flow if enabled
      if (agent.diagnosticFlowEnabled && diagnosticQuestions && diagnosticQuestions.length > 0) {
        if (!diagnosticState.completed) {
          if (isFirstResponse) {
            // Start with greeting and first diagnostic question
            const greeting = agent.greeting || `Hello! I'm ${agent.name}, here to help you.`;
            const firstQuestion = diagnosticQuestions[0];
            
            let responseText = `${greeting}\n\nTo help you better, I have a few quick questions:\n\n**${firstQuestion.question}**`;
            
            if (firstQuestion.type === 'multiple_choice' && firstQuestion.options) {
              responseText += '\n' + firstQuestion.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n');
            } else if (firstQuestion.type === 'yes_no') {
              responseText += '\n• Yes\n• No';
            }
            
            const newState = { currentQuestionId: firstQuestion.id, answers: {}, completed: false };
            await storage.updateConversation(conversationId, {
              contextData: JSON.stringify({ ...contextData, diagnosticState: newState })
            });
            
            await storage.updateAiAgentSession(session.id, { messageCount: 1, avgConfidence: 85 });
            
            yield { type: 'token', data: responseText };
            yield { type: 'metadata', data: { confidence: 85, requiresHumanTakeover: false, agentId: agent.id, format: 'regular' } };
            return;
          } else if (diagnosticState.currentQuestionId) {
            const currentQuestion = diagnosticQuestions.find(q => q.id === diagnosticState.currentQuestionId);
            
            if (currentQuestion) {
              diagnosticState.answers[currentQuestion.id] = customerMessage;
              
              let nextQuestion = null;
              if (currentQuestion.followUpQuestionId) {
                nextQuestion = diagnosticQuestions.find(q => q.id === currentQuestion.followUpQuestionId);
              } else {
                const currentIdx = diagnosticQuestions.findIndex(q => q.id === currentQuestion.id);
                if (currentIdx < diagnosticQuestions.length - 1) {
                  nextQuestion = diagnosticQuestions[currentIdx + 1];
                }
              }
              
              if (nextQuestion) {
                let responseText = `Got it, thank you!\n\n**${nextQuestion.question}**`;
                
                if (nextQuestion.type === 'multiple_choice' && nextQuestion.options) {
                  responseText += '\n' + nextQuestion.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n');
                } else if (nextQuestion.type === 'yes_no') {
                  responseText += '\n• Yes\n• No';
                }
                
                const newState = { currentQuestionId: nextQuestion.id, answers: diagnosticState.answers, completed: false };
                await storage.updateConversation(conversationId, {
                  contextData: JSON.stringify({ ...contextData, diagnosticState: newState })
                });
                
                yield { type: 'token', data: responseText };
                yield { type: 'metadata', data: { confidence: 85, requiresHumanTakeover: false, agentId: agent.id, format: 'regular' } };
                return;
              } else {
                diagnosticState.completed = true;
                const newState = { currentQuestionId: null, answers: diagnosticState.answers, completed: true };
                await storage.updateConversation(conversationId, {
                  contextData: JSON.stringify({ ...contextData, diagnosticState: newState })
                });
                
                contextData = { ...contextData, diagnosticState: newState, diagnosticAnswers: diagnosticState.answers };
              }
            }
          }
        }
      } else if (isFirstResponse && agent.greeting) {
        contextData = { ...contextData, includeGreeting: true, greeting: agent.greeting };
      }
      
      const conversationHistory = messages
        .filter(msg => msg.scope !== 'internal')
        .slice(-10)
        .map(msg => `${msg.senderType}: ${msg.content}`);

      // Determine response format based on intent
      let responseFormat: keyof typeof RESPONSE_FORMATS = 'conversational';
      if (intentClassification.intent === 'technical') {
        responseFormat = 'step_by_step';
      } else if (intentClassification.intent === 'billing') {
        responseFormat = 'bullet_points';
      }

      // Get relevant knowledge base articles
      const searchResults = await this.getRelevantKnowledge(
        customerMessage, 
        agent.knowledgeBaseIds || [], 
        conversationHistory
      );
      
      console.log(`[Stream] Retrieved ${searchResults.length} knowledge chunks`);

      // Stream the response
      let fullResponse = '';
      let metadata: any = null;

      for await (const chunk of this.generateAgentResponseWithConfigStream(
        customerMessage,
        conversationHistory,
        searchResults,
        agent,
        responseFormat,
        contextData
      )) {
        if (chunk.type === 'token') {
          fullResponse += chunk.data;
          yield chunk;
        } else if (chunk.type === 'metadata') {
          metadata = chunk.data;
        }
      }

      // Update session statistics
      const newMessageCount = session.messageCount + 1;
      const confidence = metadata?.confidence || 50;
      const newAvgConfidence = Math.round(
        (session.avgConfidence * session.messageCount + confidence) / newMessageCount
      );

      await storage.updateAiAgentSession(session.id, {
        messageCount: newMessageCount,
        avgConfidence: newAvgConfidence,
      });

      // Check for human takeover
      const shouldTakeOver = confidence < agent.autoTakeoverThreshold || metadata?.requiresHumanTakeover;

      if (shouldTakeOver) {
        await storage.updateAiAgentSession(session.id, {
          status: 'handed_over',
          handoverReason: `Low confidence (${confidence}%) or complex query`,
        });
      }

      // Track file usage
      if (metadata?.knowledgeUsed && metadata.knowledgeUsed.length > 0) {
        for (const knowledgeBaseId of metadata.knowledgeUsed) {
          try {
            const linkedFiles = await storage.getFilesLinkedToKnowledgeBase(knowledgeBaseId);
            for (const linkedFile of linkedFiles) {
              await storage.incrementFileUsage(linkedFile.id, agent.id);
            }
          } catch (error) {
            console.error(`Error tracking file usage:`, error);
          }
        }
      }

      // Yield final metadata
      yield {
        type: 'metadata',
        data: {
          sessionId: session.id,
          messageCount: newMessageCount,
          avgConfidence: newAvgConfidence,
          shouldLearn: newMessageCount >= 5 && newAvgConfidence < 60,
          ...metadata,
          agentId: agent.id
        }
      };

    } catch (error) {
      console.error('[Stream] Error:', error);
      yield {
        type: 'token',
        data: 'I apologize for the technical difficulty. Let me connect you with a specialist.'
      };
      yield {
        type: 'metadata',
        data: {
          sessionId: 'error',
          confidence: 0,
          requiresHumanTakeover: true
        }
      };
    }
  }

  /**
   * Generate streaming agent response with OpenAI streaming API
   * Yields tokens as they arrive for real-time display
   */
  private static async *generateAgentResponseWithConfigStream(
    customerMessage: string,
    conversationHistory: string[],
    searchResults: SearchResult[],
    agent: AiAgent,
    responseFormat: keyof typeof RESPONSE_FORMATS = 'conversational',
    contextData?: any
  ): AsyncGenerator<{ type: 'token' | 'metadata'; data: any }, void, unknown> {
    try {
      // Load brand voice configuration
      const brandConfig = await this.loadBrandConfig();
      const brandVoicePrompt = this.buildBrandVoicePrompt(brandConfig);

      // Fetch images for articles in search results (for visual aids in hardware manuals)
      const articleImages = searchResults.length > 0 
        ? await this.fetchImagesForArticles(searchResults)
        : new Map();

      // Build the same context as non-streaming version with image references
      const knowledgeContext = searchResults.length 
        ? this.formatKnowledgeContext(searchResults, articleImages)
        : '\nKnowledge Base: No relevant knowledge base articles available.\n';

      const conversationContext = conversationHistory.length 
        ? `\nConversation History:\n${conversationHistory.join('\n')}\n`
        : '';

      const customContext = contextData 
        ? `\nCustom Context Data:\n${JSON.stringify(contextData, null, 2)}\n`
        : '';

      const knowledgeQuality = this.calculateKnowledgeQuality(searchResults);
      const isVagueQuery = this.detectVagueQuery(customerMessage);
      const bestRetrievalScore = searchResults.length > 0 ? searchResults[0].score : 0;
      const meetsConfidenceThreshold = bestRetrievalScore >= 0.3;
      const shouldAbstain = !meetsConfidenceThreshold && searchResults.length > 0;
      
      const formatTemplate = RESPONSE_FORMATS[responseFormat];

      // Build the prompt (same as non-streaming)
      const userPrompt = `${knowledgeContext}${conversationContext}${customContext}
Customer Message: "${customerMessage}"

Agent Role: ${agent.name} - ${agent.description}
Specializations: ${agent.specializations?.join(', ') || 'General Support'}

RESPONSE FORMAT REQUIREMENT:
Format: ${responseFormat}
Instructions: ${formatTemplate.prompt}

IMPORTANT: Provide a helpful, conversational response directly. Do NOT wrap your response in JSON. Just provide the natural language answer.

Knowledge available: ${searchResults.length} relevant chunks (score: ${bestRetrievalScore.toFixed(2)})
Query is vague: ${isVagueQuery ? 'YES - ask clarifying questions' : 'NO - provide solution'}
Confidence threshold met: ${meetsConfidenceThreshold ? 'YES' : 'NO'}

${shouldAbstain ? 'IMPORTANT: Insufficient information to answer confidently. Suggest human specialist.' : ''}
${isVagueQuery ? 'IMPORTANT: Query is too vague. Ask 2-3 clarifying questions.' : ''}
${searchResults.length > 0 && !shouldAbstain ? 'IMPORTANT: Use the provided knowledge base information and cite sources.' : ''}`;

      // Inject brand voice into system prompt
      const enhancedSystemPrompt = agent.systemPrompt + brandVoicePrompt;
      
      if (brandConfig) {
        console.log(`[Brand Voice] Injected brand voice configuration for ${brandConfig.companyName}`);
      }

      // Call OpenAI with streaming enabled
      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: enhancedSystemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: (agent.temperature || 30) / 100,
        max_tokens: agent.maxTokens || 1000,
        stream: true, // Enable streaming
      });

      // Stream greeting first if configured (for first response without diagnostic flow)
      let fullResponse = '';
      if (contextData?.includeGreeting && contextData?.greeting) {
        const greetingWithNewline = `${contextData.greeting}\n\n`;
        fullResponse += greetingWithNewline;
        yield {
          type: 'token',
          data: greetingWithNewline
        };
      }

      // Stream tokens as they arrive
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          yield {
            type: 'token',
            data: content
          };
        }
      }

      // Update knowledge base usage statistics
      if (searchResults.length > 0) {
        for (const result of searchResults) {
          try {
            await storage.updateKnowledgeBaseUsage?.(result.chunk.knowledgeBaseId);
          } catch (e) {
            // Ignore if method doesn't exist
          }
        }
      }

      // Calculate confidence and metadata after streaming completes
      const shouldForceHumanTakeover = searchResults.length === 0;
      
      // Estimate confidence based on knowledge quality
      let confidence = 50;
      if (!shouldForceHumanTakeover && searchResults.length > 0) {
        const qualityMultiplier = Math.min(1.2, 0.8 + (knowledgeQuality / 25));
        confidence = Math.round(75 * qualityMultiplier);
        
        if (searchResults.length > 1 && knowledgeQuality > 7) {
          confidence = Math.min(95, confidence + 5);
        }
        
        if (knowledgeQuality < 4) {
          confidence = Math.max(20, confidence - 15);
        }
      } else if (shouldForceHumanTakeover) {
        confidence = 25;
      }

      // Detect format from response
      const hasNumberedSteps = /\d+[.)]\s+.*(\n.*\d+[.)]\s+)/.test(fullResponse);
      const instructionalKeywords = /\b(how\s+(do\s+i|to)|setup|install|configure)\b/i;
      const isInstructionalQuery = instructionalKeywords.test(customerMessage);
      const finalFormat = (hasNumberedSteps || isInstructionalQuery) ? 'steps' : 'regular';

      // Add reference links (only if agent setting allows)
      const shouldIncludeLinks = agent.includeResourceLinks !== false; // Default to true
      const uniqueArticles = new Map<string, { id: string; title: string }>();
      for (const result of searchResults.slice(0, 3)) {
        if (!uniqueArticles.has(result.chunk.knowledgeBaseId)) {
          uniqueArticles.set(result.chunk.knowledgeBaseId, {
            id: result.chunk.knowledgeBaseId,
            title: result.chunk.metadata.sourceTitle || result.chunk.title
          });
        }
      }
      
      if (uniqueArticles.size > 0 && !shouldForceHumanTakeover && shouldIncludeLinks) {
        const references = Array.from(uniqueArticles.values())
          .map(article => `• [${article.title}](/kb/${article.id})`)
          .join('\n');
        
        const refSection = `\n\n**📚 Learn More:**\n${references}`;
        yield {
          type: 'token',
          data: refSection
        };
      }

      // Yield metadata at the end
      yield {
        type: 'metadata',
        data: {
          confidence: Math.max(0, Math.min(100, confidence)),
          requiresHumanTakeover: shouldForceHumanTakeover,
          suggestedActions: shouldForceHumanTakeover ? ['Connect with human agent'] : [],
          knowledgeUsed: searchResults.map(r => r.chunk.knowledgeBaseId),
          agentId: agent.id,
          format: finalFormat
        }
      };

    } catch (error) {
      console.error('[Stream Config] Error:', error);
      yield {
        type: 'token',
        data: 'I apologize, but I need to connect you with a specialist.'
      };
      yield {
        type: 'metadata',
        data: {
          confidence: 0,
          requiresHumanTakeover: true,
          suggestedActions: ['Connect with human agent'],
          agentId: agent.id,
          format: 'regular'
        }
      };
    }
  }
}