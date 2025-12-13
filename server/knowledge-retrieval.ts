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
    chunkTitle?: string;
    hasStructure?: boolean;
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
   */
  /**
   * ✅ PHASE 1 IMPROVEMENT: Increased semantic similarity threshold for quality
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
        if (similarity > 0.15) { // ✅ Increased from 0.1 to 0.15 for better quality
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
}

// Export singleton instance
export const knowledgeRetrieval = KnowledgeRetrievalService.getInstance();