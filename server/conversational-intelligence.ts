import { chatCompletion } from "./shre-gateway";
import { storage } from "./storage";
import type {
  CustomerMemory,
  SentimentTracking,
  ConversationIntelligence,
  InsertSentimentTracking,
  InsertConversationIntelligence
} from "@shared/schema";

interface SentimentAnalysisResult {
  overallSentiment: number;
  frustrationLevel: number;
  urgencyLevel: number;
  satisfactionLevel: number;
  primaryEmotion: string;
  emotionConfidence: number;
  escalationTriggered: boolean;
  escalationReason?: string;
}

interface MemoryExtractionResult {
  memories: Array<{
    key: string;
    value: string;
    memoryType: string;
    confidence: number;
  }>;
}

interface ConversationContext {
  customerMemories: CustomerMemory[];
  conversationIntelligence: ConversationIntelligence | null;
  latestSentiment: SentimentTracking | null;
}

export class ConversationalIntelligenceService {
  private static FRUSTRATION_ESCALATION_THRESHOLD = 75;
  private static SENTIMENT_ANALYSIS_PROMPT = `Analyze the following customer message for sentiment and emotional indicators.
Return a JSON object with:
- overallSentiment: number from -100 (very negative) to 100 (very positive)
- frustrationLevel: number from 0 to 100
- urgencyLevel: number from 0 to 100  
- satisfactionLevel: number from 0 to 100
- primaryEmotion: one of "neutral", "happy", "frustrated", "confused", "angry", "anxious"
- emotionConfidence: number from 0 to 100
- escalationNeeded: boolean (true if customer seems very frustrated or requesting escalation)
- escalationReason: string or null (reason for escalation if needed)

Consider these frustration indicators:
- Repeated questions about same issue
- ALL CAPS or excessive punctuation
- Words like "still", "again", "already tried", "not working"
- Explicit frustration ("frustrated", "annoyed", "angry")
- Requests for supervisor/manager

Customer message:`;

  private static MEMORY_EXTRACTION_PROMPT = `Extract any memorable facts about the customer from this conversation exchange.
Focus on:
- Device/product types they use (e.g., "PAX terminal", "A920", "printer")
- Issues they've experienced before
- Their preferences or requirements
- Their technical skill level
- Their company or business type
- Their communication preferences

Return a JSON object with:
{
  "memories": [
    {
      "key": "device_type" | "past_issue" | "skill_level" | "business_type" | "preference" | "context",
      "value": "the specific value",
      "memoryType": "preference" | "issue" | "context",
      "confidence": 0-100
    }
  ]
}

Only include facts explicitly stated or strongly implied. If nothing memorable, return empty array.

Customer message:`;

  static async analyzeSentiment(
    message: string,
    conversationId: string,
    customerId?: string,
    messageId?: string,
    modality: 'text' | 'voice' = 'text',
    voiceToneIndicators?: string[]
  ): Promise<SentimentTracking> {
    try {
      const completion = await chatCompletion({
        messages: [
          { role: "system", content: "You are a sentiment analysis expert. Always respond with valid JSON." },
          { role: "user", content: `${this.SENTIMENT_ANALYSIS_PROMPT}\n"${message}"` }
        ],
        temperature: 0.3,
        max_tokens: 300,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(completion.content || "{}") as SentimentAnalysisResult;

      const adjustedFrustration = modality === 'voice' && voiceToneIndicators?.length
        ? Math.min(100, result.frustrationLevel + (voiceToneIndicators.includes('rushed') ? 10 : 0) + 
                        (voiceToneIndicators.includes('emphatic') ? 15 : 0))
        : result.frustrationLevel;

      const escalationTriggered = adjustedFrustration >= this.FRUSTRATION_ESCALATION_THRESHOLD || 
                                   result.escalationTriggered;

      const sentimentData: InsertSentimentTracking = {
        conversationId,
        messageId,
        customerId,
        overallSentiment: result.overallSentiment || 0,
        frustrationLevel: adjustedFrustration || 0,
        urgencyLevel: result.urgencyLevel || 0,
        satisfactionLevel: result.satisfactionLevel || 50,
        primaryEmotion: result.primaryEmotion || 'neutral',
        emotionConfidence: result.emotionConfidence || 50,
        escalationTriggered,
        escalationReason: escalationTriggered ? (result.escalationReason || 'High frustration detected') : undefined,
        modality,
        voiceToneIndicators
      };

      const sentiment = await storage.createSentimentTracking(sentimentData);

      if (escalationTriggered) {
        await this.updateConversationIntelligence(conversationId, {
          frustrationPeaks: 1
        }, true);
        console.log(`[ConvIntel] Escalation triggered for conversation ${conversationId}: ${sentimentData.escalationReason}`);
      }

      return sentiment;
    } catch (error) {
      console.error('[ConvIntel] Sentiment analysis error:', error);
      return await storage.createSentimentTracking({
        conversationId,
        messageId,
        customerId,
        overallSentiment: 0,
        frustrationLevel: 0,
        urgencyLevel: 0,
        satisfactionLevel: 50,
        primaryEmotion: 'neutral',
        emotionConfidence: 30,
        escalationTriggered: false,
        modality
      });
    }
  }

  static async extractAndSaveMemories(
    message: string,
    customerId: string,
    conversationId: string,
    aiResponse?: string
  ): Promise<CustomerMemory[]> {
    try {
      const fullContext = aiResponse 
        ? `Customer: "${message}"\nAI Response: "${aiResponse}"`
        : `"${message}"`;

      const completion = await chatCompletion({
        messages: [
          { role: "system", content: "You are a customer context analyst. Extract memorable facts. Always respond with valid JSON." },
          { role: "user", content: `${this.MEMORY_EXTRACTION_PROMPT}\n${fullContext}` }
        ],
        temperature: 0.3,
        max_tokens: 400,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(completion.content || '{"memories":[]}') as MemoryExtractionResult;
      const savedMemories: CustomerMemory[] = [];

      for (const memory of result.memories || []) {
        if (memory.key && memory.value && memory.confidence >= 60) {
          const saved = await storage.upsertCustomerMemory(
            customerId,
            memory.key,
            memory.value,
            'inferred',
            conversationId
          );
          savedMemories.push(saved);
          console.log(`[ConvIntel] Saved memory for customer ${customerId}: ${memory.key}=${memory.value}`);
        }
      }

      return savedMemories;
    } catch (error) {
      console.error('[ConvIntel] Memory extraction error:', error);
      return [];
    }
  }

  static async getCustomerContext(customerId: string, conversationId: string): Promise<ConversationContext> {
    const [memories, intel, sentiment] = await Promise.all([
      storage.getCustomerMemories(customerId),
      storage.getConversationIntelligence(conversationId),
      storage.getLatestSentiment(conversationId)
    ]);

    for (const memory of memories) {
      await storage.accessCustomerMemory(memory.id);
    }

    return {
      customerMemories: memories,
      conversationIntelligence: intel || null,
      latestSentiment: sentiment || null
    };
  }

  static formatMemoriesForPrompt(memories: CustomerMemory[]): string {
    if (!memories.length) return '';

    const grouped: Record<string, string[]> = {};
    for (const memory of memories) {
      const category = memory.memoryType || 'context';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(`${memory.key}: ${memory.value}`);
    }

    let prompt = '\n\n📝 CUSTOMER MEMORY (previous interactions):\n';
    for (const [category, items] of Object.entries(grouped)) {
      prompt += `[${category.charAt(0).toUpperCase() + category.slice(1)}]\n`;
      prompt += items.map(item => `  - ${item}`).join('\n') + '\n';
    }
    prompt += '\nUse this context to personalize your response. Reference their past issues or preferences when relevant.\n';

    return prompt;
  }

  static async updateConversationIntelligence(
    conversationId: string,
    updates: Partial<InsertConversationIntelligence>,
    increment = false
  ): Promise<ConversationIntelligence> {
    const existing = await storage.getConversationIntelligence(conversationId);

    if (increment && existing) {
      if (updates.frustrationPeaks !== undefined) {
        updates.frustrationPeaks = existing.frustrationPeaks + updates.frustrationPeaks;
      }
    }

    return await storage.upsertConversationIntelligence(conversationId, updates);
  }

  static async trackIntent(
    conversationId: string,
    intent: string,
    problemStatement?: string,
    problemConfidence?: number
  ): Promise<void> {
    const existing = await storage.getConversationIntelligence(conversationId);
    const intentHistory = existing?.intentHistory || [];
    
    if (!intentHistory.includes(intent)) {
      intentHistory.push(intent);
    }

    await storage.upsertConversationIntelligence(conversationId, {
      currentIntent: intent,
      intentHistory,
      problemStatement: problemStatement || existing?.problemStatement,
      problemConfidence: problemConfidence ?? existing?.problemConfidence ?? 0
    });
  }

  static async trackSolutionAttempt(
    conversationId: string,
    solution: string,
    successful?: boolean
  ): Promise<void> {
    const existing = await storage.getConversationIntelligence(conversationId);
    const solutionsAttempted = existing?.solutionsAttempted || [];
    
    if (!solutionsAttempted.includes(solution)) {
      solutionsAttempted.push(solution);
    }

    await storage.upsertConversationIntelligence(conversationId, {
      solutionsAttempted,
      currentSolutionStep: (existing?.currentSolutionStep || 0) + 1,
      solutionSuccessful: successful
    });
  }

  static async predictNextIssues(
    customerId: string,
    currentIntent: string
  ): Promise<string[]> {
    const memories = await storage.getCustomerMemories(customerId);
    const deviceMemories = memories.filter(m => m.key === 'device_type');
    
    const predictions: string[] = [];
    
    if (currentIntent === 'technical' && deviceMemories.length > 0) {
      predictions.push('Follow-up questions about device configuration');
      predictions.push('Questions about software updates');
    }

    if (currentIntent === 'billing') {
      predictions.push('Questions about invoice details');
      predictions.push('Questions about payment methods');
    }

    return predictions;
  }

  static async getProactiveSuggestions(
    intent: string,
    category?: string
  ): Promise<Array<{ id: string; content: string; type: string; priority: number }>> {
    const suggestions = await storage.getProactiveSuggestions(intent, category);
    
    return suggestions.map(s => ({
      id: s.id,
      content: s.suggestionContent,
      type: s.suggestionType,
      priority: s.suggestionPriority
    }));
  }

  static async analyzeVoiceEmotionFromTranscript(
    transcript: string,
    hesitationMarkers: boolean = false,
    repeatedWords: boolean = false
  ): Promise<{ emotionIndicators: string[]; adjustedFrustration: number }> {
    const indicators: string[] = [];
    let frustrationAdjustment = 0;

    if (hesitationMarkers) {
      indicators.push('hesitant');
      frustrationAdjustment += 5;
    }

    if (repeatedWords) {
      indicators.push('emphatic');
      frustrationAdjustment += 10;
    }

    const rushIndicators = /\b(quickly|fast|urgent|asap|hurry|immediately|right now)\b/i;
    if (rushIndicators.test(transcript)) {
      indicators.push('rushed');
      frustrationAdjustment += 10;
    }

    const capitalsRatio = (transcript.match(/[A-Z]/g) || []).length / transcript.length;
    if (capitalsRatio > 0.5 && transcript.length > 10) {
      indicators.push('emphatic');
      frustrationAdjustment += 15;
    }

    return {
      emotionIndicators: indicators,
      adjustedFrustration: Math.min(100, frustrationAdjustment)
    };
  }
}

export const convIntel = ConversationalIntelligenceService;
