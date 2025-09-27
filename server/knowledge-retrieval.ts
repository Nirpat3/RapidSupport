import OpenAI from 'openai';
import { KnowledgeBase } from '@shared/schema';
import { storage } from './storage';

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
  };
}

export interface SearchResult {
  chunk: KnowledgeChunk;
  score: number;
  matchType: 'keyword' | 'semantic' | 'hybrid';
  matchedTerms?: string[];
}

export interface RetrievalOptions {
  maxResults?: number;
  minScore?: number;
  useSemanticSearch?: boolean;
  expandScope?: boolean; // Search beyond agent's assigned KB IDs
  requireSteps?: boolean; // Prefer step-by-step content
}

export class KnowledgeRetrievalService {
  private static instance: KnowledgeRetrievalService;
  private chunksCache = new Map<string, KnowledgeChunk[]>();
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
    
    // Action synonyms  
    this.synonymMap.set('connect', ['connect', 'pair', 'link', 'sync', 'setup', 'configure']);
    this.synonymMap.set('setup', ['setup', 'set up', 'install', 'configure', 'initialize']);
    this.synonymMap.set('troubleshoot', ['troubleshoot', 'debug', 'fix', 'resolve', 'solve']);
    
    // Connectivity synonyms
    this.synonymMap.set('bluetooth', ['bluetooth', 'bt', 'wireless', 'ble']);
    this.synonymMap.set('wifi', ['wifi', 'wi-fi', 'wireless', 'network']);
    
    // Common tech terms
    this.synonymMap.set('app', ['app', 'application', 'software', 'program']);
    this.synonymMap.set('settings', ['settings', 'configuration', 'config', 'preferences']);
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
   * Break knowledge article into smaller, focused chunks
   */
  private chunkDocument(article: KnowledgeBase): KnowledgeChunk[] {
    const chunks: KnowledgeChunk[] = [];
    const maxChunkSize = 600; // words
    const overlapSize = 100; // words
    
    // Clean and normalize content
    const cleanContent = article.content
      .replace(/\s+/g, ' ')
      .trim();
    
    const words = cleanContent.split(' ');
    
    if (words.length <= maxChunkSize) {
      // Document is small enough, create single chunk
      chunks.push({
        id: `${article.id}_chunk_0`,
        knowledgeBaseId: article.id,
        title: article.title,
        content: cleanContent,
        chunkIndex: 0,
        category: article.category,
        tags: article.tags || [],
        priority: article.priority || 50,
        metadata: {
          wordCount: words.length,
          sourceTitle: article.title,
          sourceCategory: article.category,
        },
      });
    } else {
      // Split into chunks with overlap
      let chunkIndex = 0;
      let startIndex = 0;
      
      while (startIndex < words.length) {
        const endIndex = Math.min(startIndex + maxChunkSize, words.length);
        const chunkWords = words.slice(startIndex, endIndex);
        const chunkContent = chunkWords.join(' ');
        
        chunks.push({
          id: `${article.id}_chunk_${chunkIndex}`,
          knowledgeBaseId: article.id,
          title: article.title,
          content: chunkContent,
          chunkIndex,
          category: article.category,
          tags: article.tags || [],
          priority: article.priority || 50,
          metadata: {
            wordCount: chunkWords.length,
            sourceTitle: article.title,
            sourceCategory: article.category,
          },
        });
        
        // Move to next chunk with overlap
        chunkIndex++;
        startIndex = endIndex - overlapSize;
        
        // Prevent infinite loop
        if (startIndex >= endIndex - overlapSize || startIndex < 0) {
          break;
        }
      }
    }
    
    return chunks;
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
   */
  private async semanticSearch(chunks: KnowledgeChunk[], query: string): Promise<SearchResult[]> {
    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);
      if (queryEmbedding.length === 0) return [];
      
      const results: SearchResult[] = [];
      
      // Calculate similarity scores
      for (const chunk of chunks) {
        if (!chunk.embedding || chunk.embedding.length === 0) continue;
        
        const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
        if (similarity > 0.1) { // Minimum threshold
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
   * Get or create chunks for knowledge base articles
   */
  private async getChunks(knowledgeBaseIds: string[]): Promise<KnowledgeChunk[]> {
    const allChunks: KnowledgeChunk[] = [];
    
    // Get fresh articles from storage
    const articles = await storage.getKnowledgeBaseArticles?.(knowledgeBaseIds) || [];
    
    for (const article of articles) {
      if (!article.isActive) continue;
      
      // Check cache first
      let chunks = this.chunksCache.get(article.id);
      
      if (!chunks) {
        // Create and cache chunks
        chunks = this.chunkDocument(article);
        
        // Generate embeddings for each chunk
        for (const chunk of chunks) {
          const embeddingText = `${chunk.title}\n${chunk.content}`;
          chunk.embedding = await this.generateEmbedding(embeddingText);
        }
        
        this.chunksCache.set(article.id, chunks);
      }
      
      allChunks.push(...chunks);
    }
    
    return allChunks;
  }

  /**
   * Main search method combining all techniques
   */
  async search(
    query: string, 
    knowledgeBaseIds: string[], 
    options: RetrievalOptions = {}
  ): Promise<SearchResult[]> {
    try {
      const {
        maxResults = 5,
        minScore = 0.1,
        useSemanticSearch = true,
        expandScope = false,
        requireSteps = false,
      } = options;
      
      // Get chunks for the specified knowledge base IDs
      let chunks = await this.getChunks(knowledgeBaseIds);
      
      // If no results and expandScope is true, try with all available articles
      if (chunks.length === 0 && expandScope) {
        console.log('Expanding search scope to all knowledge base articles');
        const allArticles = await storage.getKnowledgeBaseArticles?.([]) || [];
        const allKbIds = allArticles.map(article => article.id);
        chunks = await this.getChunks(allKbIds);
      }
      
      if (chunks.length === 0) {
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
   * Clear cache for specific knowledge base ID (call when article is updated)
   */
  clearCache(knowledgeBaseId?: string) {
    if (knowledgeBaseId) {
      this.chunksCache.delete(knowledgeBaseId);
    } else {
      this.chunksCache.clear();
    }
  }

  /**
   * Reindex specific knowledge base articles (call when articles are created/updated)
   */
  async reindexArticle(articleId: string): Promise<void> {
    try {
      console.log(`Reindexing knowledge base article: ${articleId}`);
      
      // Clear cache for this specific article
      this.clearCache(articleId);
      
      // Get the fresh article from storage
      const articles = await storage.getKnowledgeBaseArticles?.([articleId]) || [];
      const article = articles[0];
      
      if (!article) {
        console.log(`Article ${articleId} not found for reindexing`);
        return;
      }
      
      if (!article.isActive) {
        console.log(`Article ${articleId} is inactive, skipping reindexing`);
        return;
      }
      
      // Create chunks and generate embeddings
      const chunks = this.chunkDocument(article);
      
      // Generate embeddings for each chunk
      for (const chunk of chunks) {
        const embeddingText = `${chunk.title}\n${chunk.content}`;
        chunk.embedding = await this.generateEmbedding(embeddingText);
      }
      
      // Cache the chunks
      this.chunksCache.set(article.id, chunks);
      
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
      this.chunksCache.clear();
      
      // Get all active articles
      const allArticles = await storage.getKnowledgeBaseArticles?.([]) || [];
      const activeArticles = allArticles.filter(article => article.isActive);
      
      console.log(`Reindexing ${activeArticles.length} knowledge base articles`);
      
      // Process in batches to avoid overwhelming OpenAI API
      const batchSize = 5;
      for (let i = 0; i < activeArticles.length; i += batchSize) {
        const batch = activeArticles.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async article => {
          const chunks = this.chunkDocument(article);
          
          // Generate embeddings for each chunk
          for (const chunk of chunks) {
            const embeddingText = `${chunk.title}\n${chunk.content}`;
            chunk.embedding = await this.generateEmbedding(embeddingText);
          }
          
          this.chunksCache.set(article.id, chunks);
        }));
        
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
}

// Export singleton instance
export const knowledgeRetrieval = KnowledgeRetrievalService.getInstance();