import OpenAI from 'openai';
import { KnowledgeBase, InsertRagQueryTrace } from '@shared/schema';
import { storage } from './storage';
import { db } from './db';
import { ragQueryTraces } from '@shared/schema';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Knowledge chunk with embeddings
export interface KnowledgeChunk {
  id: string;
  knowledgeBaseId: string;
  title: string;
  content: string;
  chunkIndex: number;
  category: string;
  tags: string[];
  priority: number;
  embedding?: number[];
  metadata: {
    wordCount: number;
    sourceTitle: string;
    sourceCategory: string;
    chunkTitle?: string;
    hasStructure?: boolean;
  };
}

export interface SearchResult {
  chunk: KnowledgeChunk;
  score: number;
  matchType: 'keyword' | 'semantic' | 'hybrid';
  matchedTerms?: string[];
  rerankScore?: number; // Score after reranking
}

export interface RetrievalOptions {
  maxResults?: number;
  minScore?: number;
  useSemanticSearch?: boolean;
  expandScope?: boolean; // Search beyond agent's assigned KB IDs
  requireSteps?: boolean; // Prefer step-by-step content
  enableReranking?: boolean; // Apply reranking for better results
  diversityFactor?: number; // MMR diversity factor (0-1, higher = more diverse)
}

// RAG trace context for logging
export interface RagTraceContext {
  organizationId?: string;
  workspaceId?: string;
  conversationId?: string;
  customerId?: string;
}

// Enhanced search response with confidence signals
export interface EnhancedSearchResponse {
  results: SearchResult[];
  confidence: number; // 0-100
  hasHighQualityMatch: boolean;
  uncertaintyReason?: string;
  traceId?: string; // For debugging and evaluation
}

export class KnowledgeRetrievalService {
  private static instance: KnowledgeRetrievalService;
  private synonymMap = new Map<string, string[]>();

  private constructor() {
    this.initializeSynonyms();
  }

  public static getInstance(): KnowledgeRetrievalService {
    if (!KnowledgeRetrievalService.instance) {
      KnowledgeRetrievalService.instance = new KnowledgeRetrievalService();
    }
    return KnowledgeRetrievalService.instance;
  }

  /**
   * Initialize common synonyms for better matching
   */
  private initializeSynonyms() {
    // Device synonyms
    this.synonymMap.set('pax', ['pax', 'pax device', 'pax a920', 'pax a35', 'terminal', 'payment terminal', 'card reader']);
    this.synonymMap.set('ipad', ['ipad', 'ios', 'tablet', 'apple device', 'ios device']);
    this.synonymMap.set('iphone', ['iphone', 'ios', 'mobile', 'apple phone', 'ios phone']);
    
    // Printer synonyms (for hardware troubleshooting)
    this.synonymMap.set('printer', ['printer', 'receipt printer', 'thermal printer', 'pos printer', 'print', 'printing']);
    this.synonymMap.set('paper', ['paper', 'paper roll', 'receipt paper', 'thermal paper', 'roll']);
    this.synonymMap.set('offline', ['offline', 'not working', 'not printing', 'disconnected', 'not responding', 'down']);
    this.synonymMap.set('ip', ['ip', 'ip address', 'network address', 'address']);
    
    // Action synonyms  
    this.synonymMap.set('connect', ['connect', 'pair', 'link', 'sync', 'setup', 'configure', 'reconnect']);
    this.synonymMap.set('setup', ['setup', 'set up', 'install', 'configure', 'initialize']);
    this.synonymMap.set('troubleshoot', ['troubleshoot', 'debug', 'fix', 'resolve', 'solve', 'repair', 'help']);
    this.synonymMap.set('restart', ['restart', 'reboot', 'power cycle', 'reset', 'turn off and on']);
    
    // Connectivity synonyms
    this.synonymMap.set('bluetooth', ['bluetooth', 'bt', 'wireless', 'ble']);
    this.synonymMap.set('wifi', ['wifi', 'wi-fi', 'wireless', 'network']);
    
    // Common tech terms
    this.synonymMap.set('app', ['app', 'application', 'software', 'program']);
    this.synonymMap.set('settings', ['settings', 'configuration', 'config', 'preferences']);
    
    // Error/problem synonyms
    this.synonymMap.set('error', ['error', 'issue', 'problem', 'trouble', 'not working', 'broken', 'failure']);
    this.synonymMap.set('stuck', ['stuck', 'jammed', 'frozen', 'hanging', 'not responding']);
  }

  /**
   * Normalize and expand query text with synonyms
   */
  private expandQueryWithSynonyms(query: string): string[] {
    const normalizedQuery = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
    
    const words = normalizedQuery.split(' ');
    const expandedTerms = new Set<string>();
    
    // Add original terms
    expandedTerms.add(normalizedQuery);
    words.forEach(word => expandedTerms.add(word));
    
    // Add synonyms
    words.forEach(word => {
      const synonyms = this.synonymMap.get(word) || [];
      synonyms.forEach(synonym => {
        expandedTerms.add(synonym);
        // Also add synonym variations
        expandedTerms.add(synonym.replace(/\s+/g, ''));
      });
    });
    
    return Array.from(expandedTerms);
  }

  /**
   * Break knowledge article into smaller, focused chunks with intelligent splitting
   * ✅ PHASE 2 IMPROVEMENT: Optimized chunk size per RAG best practices (300-500 tokens ≈ 225-375 words)
   */
  private chunkDocument(article: KnowledgeBase): KnowledgeChunk[] {
    const chunks: KnowledgeChunk[] = [];
    const maxChunkSize = 400; // ✅ Reduced from 500 to 400 words (closer to optimal 300-500 tokens)
    const minChunkSize = 80; // ✅ Reduced from 100 to 80 words for better granularity
    const overlapSize = 60; // ✅ Reduced from 75 to 60 words (still ~15% overlap)
    
    // Clean and normalize content while preserving paragraph structure
    const cleanContent = article.content
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n') // Keep paragraph breaks but limit excessive newlines
      .trim();
    
    // Try intelligent splitting first
    const intelligentChunks = this.intelligentChunkSplit(article, cleanContent, maxChunkSize, minChunkSize);
    
    if (intelligentChunks.length > 0) {
      return intelligentChunks;
    }
    
    // Fallback to word-based splitting if intelligent splitting fails
    return this.wordBasedChunkSplit(article, cleanContent, maxChunkSize, overlapSize);
  }

  /**
   * Intelligent chunking based on document structure
   */
  private intelligentChunkSplit(article: KnowledgeBase, content: string, maxChunkSize: number, minChunkSize: number): KnowledgeChunk[] {
    const chunks: KnowledgeChunk[] = [];
    
    // Split by natural boundaries (headers, paragraphs, lists)
    const sections = this.splitByStructure(content);
    
    let currentChunk = '';
    let chunkIndex = 0;
    let currentWordCount = 0;
    
    let currentChunkTitle: string | undefined;
    
    for (const section of sections) {
      const sectionWords = section.text.trim().split(/\s+/).length;
      
      // If adding this section would exceed max size, finalize current chunk
      if (currentWordCount > 0 && currentWordCount + sectionWords > maxChunkSize) {
        if (currentWordCount >= minChunkSize) {
          chunks.push(this.createChunk(article, currentChunk, chunkIndex, currentChunkTitle));
          chunkIndex++;
          
          // Add overlap from previous chunk for context preservation
          const sentences = currentChunk.split(/[.!?]+/).filter(s => s.trim());
          const overlapText = sentences.length > 1 ? sentences.slice(-1).join('.') + '.' : '';
          
          currentChunk = overlapText;
          currentWordCount = overlapText.trim().split(/\s+/).length;
          currentChunkTitle = undefined;
        } else {
          // Small chunk - keep the content intact and let post-add finalize handle it
          // Don't reset currentChunk or title to avoid content loss
        }
      }
      
      // Set title from first section with a title
      if (!currentChunkTitle && section.title) {
        currentChunkTitle = section.title;
      }
      
      // Add section to current chunk with small overlap
      const sectionContent = section.text;
      currentChunk += (currentChunk ? '\n\n' : '') + sectionContent;
      currentWordCount += sectionWords;
      
      // If this section alone is large enough, make it its own chunk
      if (currentWordCount >= maxChunkSize || section.isStandalone) {
        chunks.push(this.createChunk(article, currentChunk, chunkIndex, currentChunkTitle || section.title));
        chunkIndex++;
        
        // Add small overlap for context preservation
        const sentences = sectionContent.split(/[.!?]+/).filter(s => s.trim());
        const overlapText = sentences.length > 1 ? sentences.slice(-1).join('.') + '.' : '';
        
        currentChunk = overlapText;
        currentWordCount = overlapText.trim().split(/\s+/).length;
        currentChunkTitle = undefined;
      }
    }
    
    // Handle remaining content
    if (currentChunk.trim() && currentWordCount >= minChunkSize) {
      chunks.push(this.createChunk(article, currentChunk, chunkIndex, currentChunkTitle || 'Additional Information'));
    }
    
    return chunks;
  }

  /**
   * Split content by structural elements
   */
  private splitByStructure(content: string): Array<{text: string, title?: string, isStandalone: boolean}> {
    const sections: Array<{text: string, title?: string, isStandalone: boolean}> = [];
    
    // Split by headers first (markdown-style or HTML-style)
    const headerRegex = /^(#{1,6}\s+.+|<h[1-6]>.+?<\/h[1-6]>|\*\*[^*]+\*\*\s*$|\b[A-Z][A-Z\s]{3,}:\s*$)/gm;
    const headerMatches = Array.from(content.matchAll(headerRegex));
    
    if (headerMatches.length > 0) {
      let lastIndex = 0;
      
      for (const match of headerMatches) {
        // Add content before this header
        if (match.index! > lastIndex) {
          const beforeText = content.slice(lastIndex, match.index).trim();
          if (beforeText) {
            sections.push({
              text: beforeText,
              isStandalone: false
            });
          }
        }
        
        // Extract header title
        const headerText = match[0];
        const title = this.extractHeaderTitle(headerText);
        
        // Find content after this header
        const nextHeaderIndex = headerMatches[headerMatches.indexOf(match) + 1]?.index || content.length;
        const sectionContent = content.slice(match.index!, nextHeaderIndex).trim();
        
        sections.push({
          text: sectionContent,
          title,
          isStandalone: sectionContent.trim().split(/\s+/).length > 200 // Large sections are standalone
        });
        
        lastIndex = nextHeaderIndex;
      }
    } else {
      // No headers found, split by double line breaks (paragraphs)
      const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim());
      
      for (const paragraph of paragraphs) {
        sections.push({
          text: paragraph.trim(),
          isStandalone: paragraph.trim().split(/\s+/).length > 100
        });
      }
    }
    
    return sections;
  }

  /**
   * Extract clean title from header text
   */
  private extractHeaderTitle(headerText: string): string {
    return headerText
      .replace(/^#+\s*/, '') // Remove markdown headers
      .replace(/<\/?h[1-6]>/gi, '') // Remove HTML headers
      .replace(/\*\*/g, '') // Remove bold markdown
      .replace(/:$/, '') // Remove trailing colon
      .trim();
  }

  /**
   * Fallback word-based chunking
   */
  private wordBasedChunkSplit(article: KnowledgeBase, content: string, maxChunkSize: number, overlapSize: number): KnowledgeChunk[] {
    const chunks: KnowledgeChunk[] = [];
    const words = content.trim().split(/\s+/);
    
    if (words.length <= maxChunkSize) {
      return [this.createChunk(article, content, 0)];
    }
    
    let chunkIndex = 0;
    let startIndex = 0;
    
    while (startIndex < words.length) {
      const endIndex = Math.min(startIndex + maxChunkSize, words.length);
      const chunkWords = words.slice(startIndex, endIndex);
      const chunkContent = chunkWords.join(' ');
      
      chunks.push(this.createChunk(article, chunkContent, chunkIndex));
      
      chunkIndex++;
      
      // Move to next chunk with proper overlap handling
      const nextStart = endIndex - overlapSize;
      startIndex = Math.max(nextStart, startIndex + 1); // Ensure progress
      
      // Stop when we've processed all words
      if (startIndex >= words.length) {
        break;
      }
    }
    
    return chunks;
  }

  /**
   * Create a standardized chunk object
   */
  private createChunk(article: KnowledgeBase, content: string, index: number, chunkTitle?: string): KnowledgeChunk {
    const words = content.trim().split(/\s+/);
    const title = chunkTitle || this.generateChunkTitle(article.title, content);
    
    return {
      id: `${article.id}_chunk_${index}`,
      knowledgeBaseId: article.id,
      title,
      content: content.trim(),
      chunkIndex: index,
      category: article.category,
      tags: article.tags || [],
      priority: article.priority || 50,
      metadata: {
        wordCount: words.length,
        sourceTitle: article.title,
        sourceCategory: article.category,
        chunkTitle,
        hasStructure: !!chunkTitle,
      },
    };
  }

  /**
   * Generate meaningful chunk titles based on content
   */
  private generateChunkTitle(articleTitle: string, content: string): string {
    const firstSentence = content.split(/[.!?]/)[0]?.trim();
    
    if (!firstSentence || firstSentence.length < 10) {
      return articleTitle;
    }
    
    // Extract key phrases from the first sentence
    const keyPhrases = firstSentence
      .replace(/^(how to|to|the|a|an)\s+/i, '')
      .split(' ')
      .slice(0, 6)
      .join(' ');
    
    return keyPhrases.length > 3 ? keyPhrases : articleTitle;
  }

  /**
   * Generate embeddings for text using OpenAI
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.substring(0, 8000), // Limit input length
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      return [];
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Perform keyword-based search with enhanced matching
   */
  private keywordSearch(chunks: KnowledgeChunk[], expandedTerms: string[]): SearchResult[] {
    const results: SearchResult[] = [];
    
    chunks.forEach(chunk => {
      let score = 0;
      const matchedTerms: string[] = [];
      const searchText = `${chunk.title} ${chunk.content} ${chunk.tags.join(' ')}`.toLowerCase();
      
      expandedTerms.forEach(term => {
        const termLower = term.toLowerCase();
        if (searchText.includes(termLower)) {
          matchedTerms.push(term);
          
          // Score based on where the match occurs
          if (chunk.title.toLowerCase().includes(termLower)) {
            score += 10; // Title matches are most important
          } else if (chunk.tags.some(tag => tag.toLowerCase().includes(termLower))) {
            score += 5; // Tag matches are important
          } else {
            score += 1; // Content matches
          }
          
          // Boost for exact matches
          if (searchText.includes(termLower)) {
            score += 2;
          }
        }
      });
      
      if (score > 0) {
        // Apply priority boost
        const priorityBoost = (chunk.priority / 100) * 5;
        score += priorityBoost;
        
        results.push({
          chunk,
          score,
          matchType: 'keyword',
          matchedTerms,
        });
      }
    });
    
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Perform semantic search using embeddings
   * ✅ RAG ENHANCEMENT: Accepts precomputed embedding to leverage cache
   */
  private semanticSearchWithEmbedding(
    chunks: KnowledgeChunk[], 
    queryEmbedding: number[]
  ): SearchResult[] {
    if (queryEmbedding.length === 0) return [];
    
    const results: SearchResult[] = [];
    
    // Calculate similarity scores
    for (const chunk of chunks) {
      if (!chunk.embedding || chunk.embedding.length === 0) continue;
      
      const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
      if (similarity > 0.15) { // ✅ Threshold for quality matches
        const priorityBoost = (chunk.priority / 100) * 0.2;
        const finalScore = similarity + priorityBoost;
        
        results.push({
          chunk,
          score: finalScore,
          matchType: 'semantic',
        });
      }
    }
    
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Legacy semantic search - generates embedding internally
   * @deprecated Use semanticSearchWithEmbedding with cached embedding instead
   */
  private async semanticSearch(chunks: KnowledgeChunk[], query: string): Promise<SearchResult[]> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      return this.semanticSearchWithEmbedding(chunks, queryEmbedding);
    } catch (error) {
      console.error('Error in semantic search:', error);
      return [];
    }
  }

  /**
   * Combine keyword and semantic search results
   */
  private combineSearchResults(keywordResults: SearchResult[], semanticResults: SearchResult[]): SearchResult[] {
    const combinedMap = new Map<string, SearchResult>();
    
    // Add keyword results
    keywordResults.forEach(result => {
      combinedMap.set(result.chunk.id, {
        ...result,
        score: result.score * 0.7, // Weight keyword results
      });
    });
    
    // Add or combine semantic results
    semanticResults.forEach(result => {
      const existing = combinedMap.get(result.chunk.id);
      if (existing) {
        // Combine scores and mark as hybrid
        combinedMap.set(result.chunk.id, {
          ...existing,
          score: existing.score + (result.score * 0.3), // Weight semantic results
          matchType: 'hybrid',
        });
      } else {
        combinedMap.set(result.chunk.id, {
          ...result,
          score: result.score * 0.3,
        });
      }
    });
    
    return Array.from(combinedMap.values()).sort((a, b) => b.score - a.score);
  }

  /**
   * Maximal Marginal Relevance (MMR) reranking for diversity
   * Balances relevance with diversity to avoid redundant results
   */
  private mmrRerank(
    results: SearchResult[], 
    queryEmbedding: number[], 
    lambda: number = 0.7, // Higher = more relevance, lower = more diversity
    topK: number = 10
  ): SearchResult[] {
    if (results.length <= 1) return results;
    
    const selected: SearchResult[] = [];
    const remaining = [...results];
    
    // Select the most relevant result first
    if (remaining.length > 0) {
      const best = remaining.reduce((a, b) => a.score > b.score ? a : b);
      selected.push({ ...best, rerankScore: best.score });
      remaining.splice(remaining.indexOf(best), 1);
    }
    
    // Iteratively select results that maximize MMR
    while (selected.length < topK && remaining.length > 0) {
      let bestMMR = -Infinity;
      let bestIdx = 0;
      
      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        const candidateEmbedding = candidate.chunk.embedding;
        
        if (!candidateEmbedding || candidateEmbedding.length === 0) {
          continue;
        }
        
        // Calculate max similarity to already selected documents
        let maxSimToSelected = 0;
        for (const s of selected) {
          if (s.chunk.embedding && s.chunk.embedding.length > 0) {
            const sim = this.cosineSimilarity(candidateEmbedding, s.chunk.embedding);
            maxSimToSelected = Math.max(maxSimToSelected, sim);
          }
        }
        
        // Calculate query similarity (normalized score)
        const queryRelevance = candidate.score;
        
        // MMR formula: lambda * relevance - (1-lambda) * max_similarity_to_selected
        const mmrScore = lambda * queryRelevance - (1 - lambda) * maxSimToSelected;
        
        if (mmrScore > bestMMR) {
          bestMMR = mmrScore;
          bestIdx = i;
        }
      }
      
      const selectedResult = remaining[bestIdx];
      selected.push({ ...selectedResult, rerankScore: bestMMR });
      remaining.splice(bestIdx, 1);
    }
    
    return selected;
  }

  /**
   * Calculate confidence score based on search results quality
   */
  private calculateConfidence(results: SearchResult[]): { confidence: number; hasHighQualityMatch: boolean; uncertaintyReason?: string } {
    if (results.length === 0) {
      return { 
        confidence: 0, 
        hasHighQualityMatch: false, 
        uncertaintyReason: 'No relevant knowledge base content found for this query' 
      };
    }
    
    const topScore = results[0]?.score || 0;
    const topMatchType = results[0]?.matchType;
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    
    // High quality: top result has high score AND is a hybrid match
    const hasHighQualityMatch = topScore > 0.6 && topMatchType === 'hybrid';
    
    // Calculate base confidence from scores
    let confidence = Math.min(100, Math.round(topScore * 100));
    
    // Boost confidence if multiple good results agree
    const goodResults = results.filter(r => r.score > 0.4);
    if (goodResults.length >= 3) {
      confidence = Math.min(100, confidence + 10);
    }
    
    // Reduce confidence for low-quality matches
    let uncertaintyReason: string | undefined;
    
    if (topScore < 0.3) {
      confidence = Math.min(40, confidence);
      uncertaintyReason = 'Retrieved content has low relevance to the query';
    } else if (topMatchType === 'keyword' && topScore < 0.5) {
      confidence = Math.min(60, confidence);
      uncertaintyReason = 'Match based on keywords only, semantic relevance uncertain';
    } else if (results.length === 1 && topScore < 0.5) {
      confidence = Math.min(50, confidence);
      uncertaintyReason = 'Only one potentially relevant article found';
    }
    
    return { confidence, hasHighQualityMatch, uncertaintyReason };
  }

  /**
   * Log RAG query trace for evaluation and improvement
   */
  private async logRagTrace(
    query: string,
    results: SearchResult[],
    options: {
      context?: RagTraceContext;
      expandedTerms?: string[];
      totalChunksSearched?: number;
      retrievalTimeMs?: number;
      searchType?: string;
      confidence?: number;
      uncertaintyDetected?: boolean;
      queryType?: string;
      queryTypeConfidence?: number;
    }
  ): Promise<string | undefined> {
    try {
      const traceData: Partial<InsertRagQueryTrace> = {
        query,
        organizationId: options.context?.organizationId || null,
        workspaceId: options.context?.workspaceId || null,
        conversationId: options.context?.conversationId || null,
        customerId: options.context?.customerId || null,
        expandedTerms: options.expandedTerms || [],
        retrievedChunkIds: results.map(r => r.chunk.id),
        retrievedScores: results.map(r => r.score.toFixed(4)),
        searchType: options.searchType || 'hybrid',
        totalChunksSearched: options.totalChunksSearched || 0,
        retrievalTimeMs: options.retrievalTimeMs || 0,
        confidenceScore: options.confidence || 0,
        uncertaintyDetected: options.uncertaintyDetected || false,
      };
      
      const [inserted] = await db.insert(ragQueryTraces).values(traceData as any).returning({ id: ragQueryTraces.id });
      return inserted?.id;
    } catch (error) {
      console.error('Error logging RAG trace:', error);
      return undefined;
    }
  }

  /**
   * Transform database chunk to KnowledgeChunk interface
   */
  private transformDbChunkToKnowledgeChunk(dbChunk: any): KnowledgeChunk {
    return {
      id: dbChunk.id,
      knowledgeBaseId: dbChunk.knowledgeBaseId,
      title: dbChunk.title,
      content: dbChunk.content,
      chunkIndex: dbChunk.chunkIndex,
      category: dbChunk.category,
      tags: dbChunk.tags || [],
      priority: dbChunk.priority,
      embedding: dbChunk.embedding || undefined,
      metadata: {
        wordCount: dbChunk.wordCount || 0,
        sourceTitle: dbChunk.sourceTitle || '',
        sourceCategory: dbChunk.sourceCategory || '',
        chunkTitle: dbChunk.chunkTitle,
        hasStructure: dbChunk.hasStructure || false,
      },
    };
  }

  /**
   * Get or create chunks for knowledge base articles (now using persistent database)
   * Handles mixed scenarios: some articles have chunks, some don't
   */
  private async getChunks(knowledgeBaseIds: string[]): Promise<KnowledgeChunk[]> {
    // Get all existing chunks from persistent database
    const rawDbChunks = await storage.getKnowledgeChunks?.(knowledgeBaseIds) || [];
    
    // Transform database chunks to KnowledgeChunk interface
    const dbChunks: KnowledgeChunk[] = rawDbChunks.map(chunk => this.transformDbChunkToKnowledgeChunk(chunk));
    
    // Determine which knowledge base IDs already have chunks
    const knowledgeBaseIdsWithChunks = new Set(dbChunks.map(chunk => chunk.knowledgeBaseId));
    
    // Find which knowledge base IDs need chunks created
    const knowledgeBaseIdsNeedingChunks = knowledgeBaseIds.filter(
      id => !knowledgeBaseIdsWithChunks.has(id)
    );
    
    // If all requested articles already have chunks, return them
    if (knowledgeBaseIdsNeedingChunks.length === 0) {
      return dbChunks;
    }
    
    // Get articles that need to be chunked and indexed
    const articles = await storage.getKnowledgeBaseArticles?.(knowledgeBaseIdsNeedingChunks) || [];
    const newChunks: KnowledgeChunk[] = [];
    
    for (const article of articles) {
      if (!article.isActive) continue;
      
      // Create chunks from article
      const chunks = this.chunkDocument(article);
      
      // Generate embeddings and prepare for database insertion
      const chunksToInsert = [];
      for (const chunk of chunks) {
        const embeddingText = `${chunk.title}\n${chunk.content}`;
        const embedding = await this.generateEmbedding(embeddingText);
        
        chunksToInsert.push({
          id: chunk.id,
          knowledgeBaseId: chunk.knowledgeBaseId,
          title: chunk.title,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
          category: chunk.category,
          tags: chunk.tags,
          priority: chunk.priority,
          wordCount: chunk.metadata.wordCount,
          sourceTitle: chunk.metadata.sourceTitle,
          sourceCategory: chunk.metadata.sourceCategory,
          chunkTitle: chunk.metadata.chunkTitle,
          hasStructure: chunk.metadata.hasStructure || false,
          embedding,
        });
      }
      
      // Batch insert into database for persistence
      if (chunksToInsert.length > 0) {
        const createdChunks = await storage.createKnowledgeChunksBatch?.(chunksToInsert) || [];
        // Transform created chunks to KnowledgeChunk interface
        newChunks.push(...createdChunks.map(chunk => this.transformDbChunkToKnowledgeChunk(chunk)));
        console.log(`Indexed article "${article.title}" with ${createdChunks.length} chunks`);
      }
    }
    
    // Combine existing chunks with newly created ones
    return [...dbChunks, ...newChunks];
  }

  /**
   * Main search method combining all techniques
   * ✅ PHASE 1 IMPROVEMENT: Updated defaults per RAG best practices
   */
  async search(
    query: string, 
    knowledgeBaseIds: string[], 
    options: RetrievalOptions = {}
  ): Promise<SearchResult[]> {
    try {
      const {
        maxResults = 10, // ✅ Increased from 5 to 10 (RAG guide recommends 8-12)
        minScore = 0.2, // ✅ Increased from 0.1 to 0.2 for better quality filtering
        useSemanticSearch = true,
        expandScope = false,
        requireSteps = false,
      } = options;
      
      // Get chunks for the specified knowledge base IDs
      let chunks = await this.getChunks(knowledgeBaseIds);
      console.log(`Initial chunks from specified IDs: ${chunks.length}`);
      
      // If no results and expandScope is true, try with all available articles
      if (chunks.length === 0 && expandScope) {
        console.log('Expanding search scope to all knowledge base articles');
        const allArticles = await storage.getKnowledgeBaseArticles?.([]) || [];
        console.log(`Found ${allArticles.length} total knowledge base articles`);
        const allKbIds = allArticles.map(article => article.id);
        chunks = await this.getChunks(allKbIds);
        console.log(`Chunks after expanding scope: ${chunks.length}`);
      }
      
      if (chunks.length === 0) {
        console.log('No chunks available for search');
        return [];
      }
      
      // Expand query with synonyms
      const expandedTerms = this.expandQueryWithSynonyms(query);
      
      // Perform keyword search
      const keywordResults = this.keywordSearch(chunks, expandedTerms);
      
      let finalResults: SearchResult[] = keywordResults;
      
      // Perform semantic search if enabled
      if (useSemanticSearch) {
        const semanticResults = await this.semanticSearch(chunks, query);
        finalResults = this.combineSearchResults(keywordResults, semanticResults);
      }
      
      // Filter by minimum score
      finalResults = finalResults.filter(result => result.score >= minScore);
      
      // Boost results that contain step-by-step content if requested
      if (requireSteps) {
        finalResults.forEach(result => {
          const content = result.chunk.content.toLowerCase();
          const hasSteps = /\b(step|steps|instructions|tutorial|guide|how\s+to)\b/.test(content) ||
                           /\d+[.)]\s/.test(result.chunk.content) ||
                           /\n\d+\.\s/.test(result.chunk.content);
          
          if (hasSteps) {
            result.score *= 1.5; // Boost step-by-step content
          }
        });
        
        finalResults.sort((a, b) => b.score - a.score);
      }
      
      // Return top results
      return finalResults.slice(0, maxResults);
      
    } catch (error) {
      console.error('Error in knowledge retrieval search:', error);
      return [];
    }
  }

  /**
   * Enhanced search with reranking, confidence scoring, and RAG trace logging
   * ✅ RAG BEST PRACTICES: Hybrid search + MMR reranking + confidence + logging + query classification
   */
  async searchEnhanced(
    query: string,
    knowledgeBaseIds: string[],
    options: RetrievalOptions & { context?: RagTraceContext; enableLogging?: boolean } = {}
  ): Promise<EnhancedSearchResponse> {
    const startTime = Date.now();
    
    try {
      const {
        maxResults = 10,
        minScore = 0.2,
        useSemanticSearch = true,
        expandScope = false,
        requireSteps = false,
        enableReranking = true,
        diversityFactor = 0.3,
        context,
        enableLogging = true,
      } = options;
      
      // ✅ RAG ENHANCEMENT: Classify query type for optimized retrieval
      const queryClassification = this.classifyQuery(query);
      
      // Get chunks for the specified knowledge base IDs
      let chunks = await this.getChunks(knowledgeBaseIds);
      
      // If no results and expandScope is true, try with all available articles
      if (chunks.length === 0 && expandScope) {
        const allArticles = await storage.getKnowledgeBaseArticles?.([]) || [];
        const allKbIds = allArticles.map(article => article.id);
        chunks = await this.getChunks(allKbIds);
      }
      
      const totalChunksSearched = chunks.length;
      
      if (chunks.length === 0) {
        const emptyResult: EnhancedSearchResponse = {
          results: [],
          confidence: 0,
          hasHighQualityMatch: false,
          uncertaintyReason: 'No knowledge base content available to search',
        };
        return emptyResult;
      }
      
      // Expand query with synonyms
      const expandedTerms = this.expandQueryWithSynonyms(query);
      
      // Perform keyword search
      const keywordResults = this.keywordSearch(chunks, expandedTerms);
      
      let finalResults: SearchResult[] = keywordResults;
      let queryEmbedding: number[] = [];
      
      // Perform semantic search if enabled (use cached embeddings for performance)
      if (useSemanticSearch) {
        queryEmbedding = await this.getOrCreateEmbedding(query);
        const semanticResults = this.semanticSearchWithEmbedding(chunks, queryEmbedding);
        finalResults = this.combineSearchResults(keywordResults, semanticResults);
      }
      
      // ✅ RAG ENHANCEMENT: Boost results based on query type
      if (queryClassification.type === 'procedural' || queryClassification.type === 'troubleshooting') {
        // Boost step-by-step content for procedural/troubleshooting queries
        finalResults.forEach(result => {
          const content = result.chunk.content.toLowerCase();
          const hasSteps = /\b(step|steps|instructions|tutorial|guide|how\s+to)\b/.test(content) ||
                           /\d+[.)]\s/.test(result.chunk.content);
          if (hasSteps) {
            result.score *= 1.3;
          }
        });
      } else if (queryClassification.type === 'factual') {
        // Boost concise definitions for factual queries
        finalResults.forEach(result => {
          const wordCount = result.chunk.content.split(/\s+/).length;
          if (wordCount < 200) { // Prefer concise answers
            result.score *= 1.1;
          }
        });
      }
      
      // Filter by minimum score
      finalResults = finalResults.filter(result => result.score >= minScore);
      
      // Check if any candidates have embeddings for MMR reranking
      const candidatesWithEmbeddings = finalResults.filter(
        r => r.chunk.embedding && r.chunk.embedding.length > 0
      ).length;
      
      // Apply MMR reranking for diversity (only when semantic search is enabled AND embeddings exist)
      if (enableReranking && finalResults.length > 1 && useSemanticSearch && 
          queryEmbedding.length > 0 && candidatesWithEmbeddings >= 2) {
        const lambda = 1 - diversityFactor; // Convert diversity to relevance weight
        finalResults = this.mmrRerank(finalResults, queryEmbedding, lambda, maxResults * 2);
      }
      
      // Boost results that contain step-by-step content if requested
      if (requireSteps) {
        finalResults.forEach(result => {
          const content = result.chunk.content.toLowerCase();
          const hasSteps = /\b(step|steps|instructions|tutorial|guide|how\s+to)\b/.test(content) ||
                           /\d+[.)]\s/.test(result.chunk.content) ||
                           /\n\d+\.\s/.test(result.chunk.content);
          
          if (hasSteps) {
            result.score *= 1.5;
          }
        });
        
        finalResults.sort((a, b) => b.score - a.score);
      }
      
      // Limit to max results
      finalResults = finalResults.slice(0, maxResults);
      
      // Calculate confidence and uncertainty
      const { confidence, hasHighQualityMatch, uncertaintyReason } = this.calculateConfidence(finalResults);
      
      const retrievalTimeMs = Date.now() - startTime;
      
      // Log RAG trace for evaluation (includes query type)
      let traceId: string | undefined;
      if (enableLogging) {
        traceId = await this.logRagTrace(query, finalResults, {
          context,
          expandedTerms: Array.from(expandedTerms),
          totalChunksSearched,
          retrievalTimeMs,
          searchType: useSemanticSearch ? 'hybrid' : 'keyword',
          confidence,
          uncertaintyDetected: !hasHighQualityMatch || confidence < 50,
          queryType: queryClassification.type,
          queryTypeConfidence: queryClassification.confidence,
        });
      }
      
      return {
        results: finalResults,
        confidence,
        hasHighQualityMatch,
        uncertaintyReason,
        traceId,
      };
      
    } catch (error) {
      console.error('Error in enhanced knowledge retrieval search:', error);
      return {
        results: [],
        confidence: 0,
        hasHighQualityMatch: false,
        uncertaintyReason: 'Search failed due to an internal error',
      };
    }
  }

  /**
   * Clear chunks from database for specific knowledge base ID (call when article is updated)
   */
  async clearCache(knowledgeBaseId?: string): Promise<void> {
    try {
      if (knowledgeBaseId && storage.deleteKnowledgeChunksByArticle) {
        await storage.deleteKnowledgeChunksByArticle(knowledgeBaseId);
        console.log(`Cleared existing chunks for article: ${knowledgeBaseId}`);
      }
    } catch (error) {
      console.error('Error clearing knowledge chunks:', error);
      throw error; // Re-throw to prevent duplicate inserts
    }
  }

  /**
   * Reindex specific knowledge base articles (call when articles are created/updated)
   * This deletes old chunks and creates new ones with fresh embeddings
   */
  async reindexArticle(articleId: string): Promise<void> {
    try {
      console.log(`Reindexing knowledge base article: ${articleId}`);
      
      // Delete old chunks from database
      await this.clearCache(articleId);
      
      // Get the fresh article from storage
      const articles = await storage.getKnowledgeBaseArticles?.([articleId]) || [];
      const article = articles[0];
      
      if (!article) {
        console.log(`Article ${articleId} not found for reindexing`);
        return;
      }
      
      if (!article.isActive) {
        console.log(`Article ${articleId} is inactive, skipping reindexing`);
        await this.clearCache(articleId); // Remove chunks for inactive articles
        return;
      }
      
      // Create chunks and generate embeddings
      const chunks = this.chunkDocument(article);
      const chunksToInsert = [];
      
      // Generate embeddings for each chunk
      for (const chunk of chunks) {
        const embeddingText = `${chunk.title}\n${chunk.content}`;
        const embedding = await this.generateEmbedding(embeddingText);
        
        chunksToInsert.push({
          id: chunk.id,
          knowledgeBaseId: chunk.knowledgeBaseId,
          title: chunk.title,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
          category: chunk.category,
          tags: chunk.tags,
          priority: chunk.priority,
          wordCount: chunk.metadata.wordCount,
          sourceTitle: chunk.metadata.sourceTitle,
          sourceCategory: chunk.metadata.sourceCategory,
          chunkTitle: chunk.metadata.chunkTitle,
          hasStructure: chunk.metadata.hasStructure || false,
          embedding,
        });
      }
      
      // Batch insert into database for persistence
      if (chunksToInsert.length > 0) {
        await storage.createKnowledgeChunksBatch?.(chunksToInsert);
      }
      
      console.log(`Successfully reindexed article: ${article.title} with ${chunks.length} chunks`);
    } catch (error) {
      console.error(`Error reindexing article ${articleId}:`, error);
    }
  }

  /**
   * Reindex all knowledge base articles (call periodically or on bulk updates)
   */
  async reindexAll(): Promise<void> {
    try {
      console.log('Starting knowledge base reindexing...');
      
      // Get all active articles
      const allArticles = await storage.getKnowledgeBaseArticles?.([]) || [];
      const activeArticles = allArticles.filter(article => article.isActive);
      
      console.log(`Reindexing ${activeArticles.length} knowledge base articles`);
      
      // Process each article using reindexArticle (which persists to database)
      const batchSize = 5;
      for (let i = 0; i < activeArticles.length; i += batchSize) {
        const batch = activeArticles.slice(i, i + batchSize);
        
        await Promise.all(batch.map(article => this.reindexArticle(article.id)));
        
        // Small delay to respect rate limits
        if (i + batchSize < activeArticles.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log('Knowledge base reindexing completed');
    } catch (error) {
      console.error('Error during knowledge base reindexing:', error);
    }
  }

  /**
   * Analyze document quality for RAG optimization
   * Returns quality metrics and improvement suggestions
   */
  analyzeDocumentQuality(article: KnowledgeBase): {
    hasHeadings: boolean;
    hasFAQs: boolean;
    hasStepByStep: boolean;
    hasImages: boolean;
    structureScore: number;
    wordCount: number;
    readabilityScore: number;
    contentScore: number;
    overallScore: number;
    issues: string[];
    suggestions: string[];
  } {
    const content = article.content || '';
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    // Check for structural elements
    const hasHeadings = /^#{1,6}\s+.+|<h[1-6]>.+?<\/h[1-6]>|\*\*[^*]+\*\*\s*$/gm.test(content);
    const hasFAQs = /\b(faq|frequently asked|question|q:)/i.test(content);
    const hasStepByStep = /\d+[.)]\s+|step\s*\d+/i.test(content);
    const hasImages = /\!\[.*\]\(.*\)|<img\s/i.test(content);
    
    // Calculate structure score
    let structureScore = 0;
    if (hasHeadings) structureScore += 30;
    if (hasFAQs) structureScore += 25;
    if (hasStepByStep) structureScore += 25;
    if (hasImages) structureScore += 20;
    
    // Word count analysis
    const words = content.trim().split(/\s+/);
    const wordCount = words.length;
    
    // Readability (simple heuristic based on sentence length)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.length > 0 ? wordCount / sentences.length : 0;
    
    // Optimal sentence length is 15-20 words
    let readabilityScore = 100;
    if (avgSentenceLength > 30) {
      readabilityScore -= 30;
      issues.push('Sentences are too long (average >30 words)');
      suggestions.push('Break up long sentences for better readability');
    } else if (avgSentenceLength < 8) {
      readabilityScore -= 20;
      issues.push('Sentences are too short (average <8 words)');
      suggestions.push('Combine short sentences for better flow');
    }
    
    // Content score
    let contentScore = 0;
    if (wordCount >= 100) contentScore += 30;
    else {
      issues.push('Article is too short (<100 words)');
      suggestions.push('Add more detailed content for better retrieval');
    }
    
    if (wordCount <= 2000) contentScore += 20;
    else {
      issues.push('Article is very long (>2000 words)');
      suggestions.push('Consider splitting into multiple focused articles');
    }
    
    if (article.tags && article.tags.length >= 2) contentScore += 25;
    else {
      issues.push('Article lacks tags');
      suggestions.push('Add 2-4 relevant tags for better searchability');
    }
    
    if (article.category && article.category.trim()) contentScore += 25;
    
    // Structure issues
    if (!hasHeadings) {
      issues.push('No headings found');
      suggestions.push('Add markdown headings (## Section Title) to structure content');
    }
    
    if (!hasStepByStep && /\b(how to|guide|tutorial|setup|install)\b/i.test(article.title || '')) {
      issues.push('Tutorial/guide title but no step-by-step format');
      suggestions.push('Use numbered steps (1. 2. 3.) for procedural content');
    }
    
    // Calculate overall score
    const overallScore = Math.round(
      (structureScore * 0.4) + (contentScore * 0.4) + (readabilityScore * 0.2)
    );
    
    return {
      hasHeadings,
      hasFAQs,
      hasStepByStep,
      hasImages,
      structureScore,
      wordCount,
      readabilityScore,
      contentScore,
      overallScore,
      issues,
      suggestions,
    };
  }

  /**
   * Get document quality scores for knowledge base articles
   */
  async getDocumentQualityReport(knowledgeBaseIds?: string[]): Promise<Array<{
    articleId: string;
    title: string;
    overallScore: number;
    issues: string[];
    suggestions: string[];
  }>> {
    const articles = await storage.getKnowledgeBaseArticles?.(knowledgeBaseIds || []) || [];
    
    return articles.map(article => {
      const quality = this.analyzeDocumentQuality(article);
      return {
        articleId: article.id,
        title: article.title,
        overallScore: quality.overallScore,
        issues: quality.issues,
        suggestions: quality.suggestions,
      };
    });
  }

  // ============================================
  // RAG ENHANCEMENTS - Query Processing
  // ============================================

  /**
   * Query embedding cache for performance optimization
   */
  private queryEmbeddingCache = new Map<string, { embedding: number[]; timestamp: number }>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached embedding or generate new one
   */
  async getOrCreateEmbedding(query: string): Promise<number[]> {
    const normalizedQuery = query.toLowerCase().trim();
    const cached = this.queryEmbeddingCache.get(normalizedQuery);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.embedding;
    }
    
    const embedding = await this.generateEmbedding(query);
    this.queryEmbeddingCache.set(normalizedQuery, { embedding, timestamp: Date.now() });
    
    // Clean up old cache entries periodically
    if (this.queryEmbeddingCache.size > 1000) {
      const now = Date.now();
      const entries = Array.from(this.queryEmbeddingCache.entries());
      for (const [key, value] of entries) {
        if (now - value.timestamp > this.CACHE_TTL_MS) {
          this.queryEmbeddingCache.delete(key);
        }
      }
    }
    
    return embedding;
  }

  /**
   * Query Classification - Detect query type for optimized retrieval
   * Types: factual (what/who), procedural (how-to), comparison, troubleshooting, general
   */
  classifyQuery(query: string): {
    type: 'factual' | 'procedural' | 'comparison' | 'troubleshooting' | 'general';
    confidence: number;
    signals: string[];
  } {
    const lowerQuery = query.toLowerCase();
    const signals: string[] = [];
    let type: 'factual' | 'procedural' | 'comparison' | 'troubleshooting' | 'general' = 'general';
    let maxScore = 0;
    
    // Factual patterns (what, who, when, where, which)
    const factualScore = this.matchPatterns(lowerQuery, [
      /^what\s+(is|are|was|were)\b/,
      /^who\s+(is|are|was|were)\b/,
      /^when\s+(did|does|is|was)\b/,
      /^where\s+(is|are|can)\b/,
      /^which\s+/,
      /\b(definition|meaning|explain)\b/,
    ]);
    if (factualScore > maxScore) {
      maxScore = factualScore;
      type = 'factual';
      signals.push('factual_keywords');
    }
    
    // Procedural patterns (how to, steps, guide)
    const proceduralScore = this.matchPatterns(lowerQuery, [
      /^how\s+(do\s+i|to|can\s+i)\b/,
      /\b(steps?\s+to|guide|tutorial|instructions?)\b/,
      /\b(setup|set\s+up|install|configure|create)\b/,
      /\bcan\s+you\s+(show|tell|help)\b/,
    ]);
    if (proceduralScore > maxScore) {
      maxScore = proceduralScore;
      type = 'procedural';
      signals.push('procedural_keywords');
    }
    
    // Comparison patterns
    const comparisonScore = this.matchPatterns(lowerQuery, [
      /\b(vs|versus|compared?\s+to|difference\s+between)\b/,
      /\b(better|best|worse|which\s+one)\b/,
      /\bor\b.*\?$/,
    ]);
    if (comparisonScore > maxScore) {
      maxScore = comparisonScore;
      type = 'comparison';
      signals.push('comparison_keywords');
    }
    
    // Troubleshooting patterns
    const troubleshootingScore = this.matchPatterns(lowerQuery, [
      /\b(not\s+working|broken|error|issue|problem|fail|stuck)\b/,
      /\b(fix|solve|resolve|troubleshoot|debug)\b/,
      /\bwhy\s+(is|does|can'?t|won'?t)\b/,
      /\b(doesn'?t|can'?t|won'?t|isn'?t)\s+work/,
    ]);
    if (troubleshootingScore > maxScore) {
      maxScore = troubleshootingScore;
      type = 'troubleshooting';
      signals.push('troubleshooting_keywords');
    }
    
    return {
      type,
      confidence: Math.min(100, maxScore * 25),
      signals,
    };
  }

  private matchPatterns(text: string, patterns: RegExp[]): number {
    let matches = 0;
    for (const pattern of patterns) {
      if (pattern.test(text)) matches++;
    }
    return matches;
  }

  /**
   * LLM-based query expansion for better recall
   * Generates semantically related queries
   */
  async expandQueryWithLLM(query: string): Promise<{
    originalQuery: string;
    expandedQueries: string[];
    keywords: string[];
  }> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
          {
            role: 'system',
            content: `You are a query expansion assistant. Given a user query, generate 2-3 alternative phrasings and extract key search terms.
            
Respond in JSON format:
{
  "alternatives": ["alternative query 1", "alternative query 2"],
  "keywords": ["key", "search", "terms"]
}

Keep alternatives concise and semantically similar to the original.`,
          },
          {
            role: 'user',
            content: query,
          },
        ],
        temperature: 0.3,
        max_tokens: 150,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        return {
          originalQuery: query,
          expandedQueries: parsed.alternatives || [],
          keywords: parsed.keywords || [],
        };
      }
    } catch (error) {
      console.error('[QueryExpansion] LLM expansion failed:', error);
    }
    
    // Fallback to synonym-based expansion
    return {
      originalQuery: query,
      expandedQueries: [],
      keywords: this.expandQueryWithSynonyms(query).slice(0, 10),
    };
  }

  // ============================================
  // RAG ENHANCEMENTS - Answer Quality
  // ============================================

  /**
   * Calculate answer grounding score - how well the answer is supported by retrieved chunks
   */
  calculateGroundingScore(
    answer: string,
    retrievedChunks: SearchResult[]
  ): {
    score: number; // 0-100
    groundedClaims: number;
    ungroundedClaims: number;
    citationCoverage: number;
  } {
    if (!answer || retrievedChunks.length === 0) {
      return { score: 0, groundedClaims: 0, ungroundedClaims: 0, citationCoverage: 0 };
    }
    
    // Extract factual claims from the answer (sentences with specific information)
    const sentences = answer.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const claims = sentences.filter(s => {
      const lower = s.toLowerCase();
      // Filter out meta-statements and hedging
      return !lower.includes('i can help') &&
             !lower.includes("i'm not sure") &&
             !lower.includes('let me') &&
             !lower.includes('please ') &&
             s.trim().length > 20;
    });
    
    if (claims.length === 0) {
      return { score: 100, groundedClaims: 0, ungroundedClaims: 0, citationCoverage: 100 };
    }
    
    // Combine all retrieved content for matching
    const sourceContent = retrievedChunks
      .map(r => r.chunk.content.toLowerCase())
      .join(' ');
    
    // Check each claim for grounding
    let groundedCount = 0;
    for (const claim of claims) {
      const claimWords = claim.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const matchingWords = claimWords.filter(w => sourceContent.includes(w));
      const matchRatio = matchingWords.length / claimWords.length;
      
      if (matchRatio >= 0.4) { // 40% word overlap indicates grounding
        groundedCount++;
      }
    }
    
    const ungroundedCount = claims.length - groundedCount;
    const groundingScore = Math.round((groundedCount / claims.length) * 100);
    
    // Citation coverage - what % of top sources contributed to the answer
    const usedSources = new Set<string>();
    for (const chunk of retrievedChunks.slice(0, 3)) {
      const chunkContent = chunk.chunk.content.toLowerCase();
      for (const claim of claims) {
        const claimWords = claim.toLowerCase().split(/\s+/).filter(w => w.length > 4);
        if (claimWords.some(w => chunkContent.includes(w))) {
          usedSources.add(chunk.chunk.knowledgeBaseId);
          break;
        }
      }
    }
    const citationCoverage = Math.round((usedSources.size / Math.min(3, retrievedChunks.length)) * 100);
    
    return {
      score: groundingScore,
      groundedClaims: groundedCount,
      ungroundedClaims: ungroundedCount,
      citationCoverage,
    };
  }

  /**
   * Verify citations - check that referenced content matches source documents
   */
  verifyCitations(
    answer: string,
    retrievedChunks: SearchResult[]
  ): {
    isVerified: boolean;
    verificationScore: number;
    issues: string[];
  } {
    const issues: string[] = [];
    
    if (!answer || retrievedChunks.length === 0) {
      return { isVerified: false, verificationScore: 0, issues: ['No sources available'] };
    }
    
    // Check for potential hallucination indicators
    const hallucIndicators = [
      /\b(according to|the documentation states|as per the guide)\b/i,
      /\b(step \d+)\b/i,
      /\b(version \d+\.\d+)\b/i,
      /\b(in \d{4})\b/i, // Year references
    ];
    
    const sourceContent = retrievedChunks.map(r => r.chunk.content).join(' ');
    let verificationsNeeded = 0;
    let verificationsFound = 0;
    
    for (const indicator of hallucIndicators) {
      const matches = answer.match(indicator);
      if (matches) {
        verificationsNeeded++;
        // Check if this claim exists in sources
        if (indicator.test(sourceContent)) {
          verificationsFound++;
        } else {
          issues.push(`Claim "${matches[0]}" not found in sources`);
        }
      }
    }
    
    // Check for specific numbers or statistics
    const numberPattern = /\b\d+(\.\d+)?%?(\s*(minutes?|hours?|days?|steps?|users?|customers?))?\b/g;
    const answerNumbers = answer.match(numberPattern) || [];
    
    for (const num of answerNumbers.slice(0, 5)) { // Check first 5 numbers
      verificationsNeeded++;
      if (sourceContent.includes(num)) {
        verificationsFound++;
      } else {
        issues.push(`Number "${num}" not verified in sources`);
      }
    }
    
    const verificationScore = verificationsNeeded === 0 
      ? 100 
      : Math.round((verificationsFound / verificationsNeeded) * 100);
    
    return {
      isVerified: issues.length === 0 || verificationScore >= 80,
      verificationScore,
      issues,
    };
  }

  // ============================================
  // RAG ENHANCEMENTS - User Feedback Integration
  // ============================================

  /**
   * Record user feedback on AI response quality
   */
  async recordResponseFeedback(
    conversationId: string,
    messageId: string,
    feedback: {
      rating: 'helpful' | 'not_helpful' | 'partial';
      knowledgeBaseIds: string[];
      agentId?: string;
      userQuery: string;
      comment?: string;
    }
  ): Promise<void> {
    try {
      // Update AI knowledge feedback for each knowledge base article used
      for (const kbId of feedback.knowledgeBaseIds) {
        await storage.createAiKnowledgeFeedback?.({
          conversationId,
          messageId,
          knowledgeBaseId: kbId,
          agentId: feedback.agentId || null,
          userQuery: feedback.userQuery,
          outcome: feedback.rating,
          agentFeedback: feedback.comment || null,
          wasUsedInResponse: true,
          requiredHumanTakeover: feedback.rating === 'not_helpful',
        });
        
        // Update aggregated metrics
        await this.updateArticleMetrics(kbId, feedback.rating);
      }
    } catch (error) {
      console.error('[Feedback] Error recording response feedback:', error);
    }
  }

  /**
   * Update aggregated article metrics based on feedback
   */
  private async updateArticleMetrics(
    knowledgeBaseId: string,
    outcome: 'helpful' | 'not_helpful' | 'partial'
  ): Promise<void> {
    try {
      // Check if storage methods exist
      if (!storage.getKnowledgeArticleMetrics || !storage.updateKnowledgeArticleMetrics) {
        console.log('[Metrics] Article metrics storage methods not available');
        return;
      }
      
      const existing = await storage.getKnowledgeArticleMetrics(knowledgeBaseId);
      
      if (existing) {
        const updates: Record<string, unknown> = {
          timesUsedInResponse: existing.timesUsedInResponse + 1,
          lastUsedAt: new Date(),
        };
        
        if (outcome === 'helpful') {
          updates.helpfulCount = existing.helpfulCount + 1;
          updates.lastHelpfulAt = new Date();
        } else if (outcome === 'not_helpful') {
          updates.notHelpfulCount = existing.notHelpfulCount + 1;
        } else {
          updates.partialCount = existing.partialCount + 1;
        }
        
        // Recalculate success rate
        const helpfulCount = (updates.helpfulCount as number) || existing.helpfulCount;
        const notHelpfulCount = (updates.notHelpfulCount as number) || existing.notHelpfulCount;
        const partialCount = (updates.partialCount as number) || existing.partialCount;
        const totalRated = helpfulCount + notHelpfulCount + partialCount;
        if (totalRated > 0) {
          updates.successRate = ((helpfulCount + partialCount * 0.5) / totalRated * 100).toFixed(1);
        }
        
        await storage.updateKnowledgeArticleMetrics(knowledgeBaseId, updates);
      }
      // Note: Creating new metrics entries requires additional storage method
    } catch (error) {
      console.error('[Metrics] Error updating article metrics:', error);
    }
  }

  /**
   * Get top performing knowledge articles based on feedback
   * Note: Requires storage.getAllKnowledgeArticleMetrics to be implemented
   */
  async getTopPerformingArticles(limit: number = 10): Promise<Array<{
    articleId: string;
    title: string;
    successRate: number;
    usageCount: number;
  }>> {
    try {
      // This method would require a storage method to fetch all metrics sorted by success rate
      // For now, return empty until the storage method is implemented
      console.log('[Metrics] getTopPerformingArticles - storage method not yet implemented');
      return [];
    } catch (error) {
      console.error('[Metrics] Error getting top articles:', error);
      return [];
    }
  }
}

// Export singleton instance
export const knowledgeRetrieval = KnowledgeRetrievalService.getInstance();