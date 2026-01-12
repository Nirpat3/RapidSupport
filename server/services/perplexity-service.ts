import { storage } from '../storage';

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  citations?: string[];
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface ExternalResearchResult {
  answer: string;
  citations: string[];
  confidence: number;
  tokensUsed: number;
  cached: boolean;
}

interface ExternalResearchSettings {
  allowedDomains?: string[];
  maxQueriesPerHour?: number;
  searchRecency?: 'hour' | 'day' | 'week' | 'month' | 'year';
}

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const DEFAULT_MODEL = 'llama-3.1-sonar-small-128k-online';
const MAX_QUERIES_PER_HOUR = 50;

const queryCache = new Map<string, { result: ExternalResearchResult; timestamp: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000;
const rateLimitCounters = new Map<string, { count: number; resetTime: number }>();

export class PerplexityService {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  private getCacheKey(query: string, context?: string): string {
    return `${query}:${context || ''}`.toLowerCase().trim();
  }

  private checkRateLimit(organizationId: string, maxQueries: number = MAX_QUERIES_PER_HOUR): boolean {
    const now = Date.now();
    const counter = rateLimitCounters.get(organizationId);
    
    if (!counter || now > counter.resetTime) {
      rateLimitCounters.set(organizationId, { count: 1, resetTime: now + 3600000 });
      return true;
    }
    
    if (counter.count >= maxQueries) {
      return false;
    }
    
    counter.count++;
    return true;
  }

  async search(
    query: string,
    context?: string,
    organizationId?: string,
    settings?: ExternalResearchSettings
  ): Promise<ExternalResearchResult> {
    if (!this.apiKey) {
      throw new Error('Perplexity API key not configured');
    }

    const cacheKey = this.getCacheKey(query, context);
    const cachedResult = queryCache.get(cacheKey);
    if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_TTL_MS) {
      console.log(`[PerplexityService] Cache hit for query: ${query.substring(0, 50)}...`);
      return { ...cachedResult.result, cached: true };
    }

    if (organizationId) {
      const maxQueries = settings?.maxQueriesPerHour || MAX_QUERIES_PER_HOUR;
      if (!this.checkRateLimit(organizationId, maxQueries)) {
        console.warn(`[PerplexityService] Rate limit exceeded for org: ${organizationId}`);
        throw new Error('External research rate limit exceeded. Please try again later.');
      }
    }

    const systemPrompt = context
      ? `You are a knowledgeable research assistant. Provide accurate, factual information based on real-time web search. Context: ${context}`
      : 'You are a knowledgeable research assistant. Provide accurate, factual information based on real-time web search. Be concise but thorough.';

    const messages: PerplexityMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query }
    ];

    const requestBody: any = {
      model: DEFAULT_MODEL,
      messages,
      temperature: 0.2,
      top_p: 0.9,
      return_images: false,
      return_related_questions: false,
      stream: false,
      presence_penalty: 0,
      frequency_penalty: 1
    };

    if (settings?.searchRecency) {
      requestBody.search_recency_filter = settings.searchRecency;
    }

    if (settings?.allowedDomains && settings.allowedDomains.length > 0) {
      requestBody.search_domain_filter = settings.allowedDomains;
    }

    try {
      console.log(`[PerplexityService] Querying external research for: ${query.substring(0, 50)}...`);
      
      const response = await fetch(PERPLEXITY_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[PerplexityService] API error: ${response.status} - ${errorText}`);
        throw new Error(`Perplexity API error: ${response.status}`);
      }

      const data: PerplexityResponse = await response.json();
      
      const result: ExternalResearchResult = {
        answer: data.choices[0]?.message?.content || '',
        citations: data.citations || [],
        confidence: 0.85,
        tokensUsed: data.usage?.total_tokens || 0,
        cached: false
      };

      queryCache.set(cacheKey, { result, timestamp: Date.now() });

      if (organizationId) {
        this.logUsage(organizationId, query, result).catch(err => 
          console.error('[PerplexityService] Failed to log usage:', err)
        );
      }

      console.log(`[PerplexityService] Research complete. Citations: ${result.citations.length}, Tokens: ${result.tokensUsed}`);
      return result;

    } catch (error) {
      console.error('[PerplexityService] Search failed:', error);
      throw error;
    }
  }

  async searchForCustomer(
    customerQuery: string,
    agentContext: {
      agentType: string;
      agentName: string;
      industryContext?: string;
    },
    organizationId?: string,
    settings?: ExternalResearchSettings
  ): Promise<ExternalResearchResult> {
    const contextPrompt = `
You are helping a customer as a ${agentContext.agentType} assistant named "${agentContext.agentName}".
${agentContext.industryContext ? `Industry context: ${agentContext.industryContext}` : ''}
Provide helpful, accurate information that would assist this customer.
Keep your response concise and actionable.
    `.trim();

    return this.search(customerQuery, contextPrompt, organizationId, settings);
  }

  private async logUsage(
    organizationId: string,
    query: string,
    result: ExternalResearchResult
  ): Promise<void> {
    try {
      await storage.createAiTokenUsage?.({
        organizationId,
        operation: 'external_research',
        model: DEFAULT_MODEL,
        promptTokens: Math.floor(result.tokensUsed * 0.3),
        completionTokens: Math.floor(result.tokensUsed * 0.7),
        totalTokens: result.tokensUsed,
        metadata: {
          query: query.substring(0, 200),
          citationCount: result.citations.length,
          cached: result.cached
        }
      });
    } catch (error) {
      console.error('[PerplexityService] Failed to log token usage:', error);
    }
  }

  formatResponseWithCitations(answer: string, citations: string[]): string {
    if (citations.length === 0) {
      return answer;
    }

    const citationList = citations
      .slice(0, 5)
      .map((url, i) => `[${i + 1}] ${url}`)
      .join('\n');

    return `${answer}\n\n📚 **Sources:**\n${citationList}`;
  }
}

export const perplexityService = new PerplexityService();
