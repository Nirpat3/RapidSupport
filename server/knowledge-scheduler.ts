import { storage } from './storage';
import { KnowledgeRetrievalService } from './knowledge-retrieval';

let schedulerInterval: NodeJS.Timeout | null = null;
const SCHEDULER_INTERVAL_MS = 60 * 60 * 1000; // Check every hour
const STALE_THRESHOLD_HOURS = 24; // Re-index articles older than 24 hours

export interface KnowledgeSchedulerConfig {
  intervalMs?: number;
  staleThresholdHours?: number;
}

export class KnowledgeScheduler {
  private intervalMs: number;
  private staleThresholdHours: number;
  private isProcessing: boolean = false;

  constructor(config: KnowledgeSchedulerConfig = {}) {
    this.intervalMs = config.intervalMs || SCHEDULER_INTERVAL_MS;
    this.staleThresholdHours = config.staleThresholdHours || STALE_THRESHOLD_HOURS;
  }

  async processStaleArticles(): Promise<{ processed: number; errors: number }> {
    if (this.isProcessing) {
      console.log('[KnowledgeScheduler] Already processing, skipping');
      return { processed: 0, errors: 0 };
    }

    this.isProcessing = true;
    let processed = 0;
    let errors = 0;

    try {
      const allArticles = await storage.getKnowledgeBaseArticles?.([]) || [];
      const activeArticles = allArticles.filter(article => article.isActive);
      
      const staleThreshold = new Date(Date.now() - (this.staleThresholdHours * 60 * 60 * 1000));
      
      const staleArticles = activeArticles.filter(article => {
        if (!article.indexedAt) return true;
        if (article.indexingStatus === 'pending' || article.indexingStatus === 'failed') return true;
        const indexedAt = new Date(article.indexedAt);
        const updatedAt = article.updatedAt ? new Date(article.updatedAt) : null;
        if (updatedAt && updatedAt > indexedAt) return true;
        return indexedAt < staleThreshold;
      });

      if (staleArticles.length === 0) {
        console.log('[KnowledgeScheduler] No stale articles found');
        return { processed: 0, errors: 0 };
      }

      console.log(`[KnowledgeScheduler] Found ${staleArticles.length} stale articles to reindex`);

      const knowledgeRetrieval = KnowledgeRetrievalService.getInstance();

      for (const article of staleArticles) {
        try {
          await storage.updateKnowledgeBase(article.id, { indexingStatus: 'indexing' } as any);
          await knowledgeRetrieval.reindexArticle(article.id);
          await storage.updateKnowledgeBase(article.id, { 
            indexingStatus: 'indexed',
            indexedAt: new Date()
          } as any);
          processed++;
          console.log(`[KnowledgeScheduler] Reindexed article: ${article.title}`);
        } catch (err) {
          errors++;
          await storage.updateKnowledgeBase(article.id, { indexingStatus: 'failed' } as any);
          console.error(`[KnowledgeScheduler] Failed to reindex article ${article.id}:`, err);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log(`[KnowledgeScheduler] Completed: ${processed} processed, ${errors} errors`);
    } catch (error) {
      console.error('[KnowledgeScheduler] Error processing stale articles:', error);
    } finally {
      this.isProcessing = false;
    }

    return { processed, errors };
  }

  async forceReindexAll(): Promise<{ processed: number; errors: number }> {
    if (this.isProcessing) {
      console.log('[KnowledgeScheduler] Already processing, skipping force reindex');
      return { processed: 0, errors: 0 };
    }

    this.isProcessing = true;
    let processed = 0;
    let errors = 0;

    try {
      const allArticles = await storage.getKnowledgeBaseArticles?.([]) || [];
      const activeArticles = allArticles.filter(article => article.isActive);

      console.log(`[KnowledgeScheduler] Force reindexing ${activeArticles.length} articles`);

      const knowledgeRetrieval = KnowledgeRetrievalService.getInstance();

      for (const article of activeArticles) {
        try {
          await storage.updateKnowledgeBase(article.id, { indexingStatus: 'indexing' } as any);
          await knowledgeRetrieval.reindexArticle(article.id);
          await storage.updateKnowledgeBase(article.id, { 
            indexingStatus: 'indexed',
            indexedAt: new Date()
          } as any);
          processed++;
        } catch (err) {
          errors++;
          await storage.updateKnowledgeBase(article.id, { indexingStatus: 'failed' } as any);
          console.error(`[KnowledgeScheduler] Failed to reindex article ${article.id}:`, err);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log(`[KnowledgeScheduler] Force reindex completed: ${processed} processed, ${errors} errors`);
    } catch (error) {
      console.error('[KnowledgeScheduler] Error in force reindex:', error);
    } finally {
      this.isProcessing = false;
    }

    return { processed, errors };
  }

  start(): void {
    if (schedulerInterval) {
      console.log('[KnowledgeScheduler] Already running');
      return;
    }

    console.log(`[KnowledgeScheduler] Starting with ${this.intervalMs / 1000 / 60} minute interval`);

    this.processStaleArticles().catch(console.error);

    schedulerInterval = setInterval(() => {
      this.processStaleArticles().catch(console.error);
    }, this.intervalMs);
  }

  stop(): void {
    if (schedulerInterval) {
      clearInterval(schedulerInterval);
      schedulerInterval = null;
      console.log('[KnowledgeScheduler] Stopped');
    }
  }

  isRunning(): boolean {
    return schedulerInterval !== null;
  }

  getStatus(): { running: boolean; processing: boolean; intervalMs: number; staleThresholdHours: number } {
    return {
      running: this.isRunning(),
      processing: this.isProcessing,
      intervalMs: this.intervalMs,
      staleThresholdHours: this.staleThresholdHours,
    };
  }
}

let knowledgeSchedulerInstance: KnowledgeScheduler | null = null;

export function getKnowledgeScheduler(config?: KnowledgeSchedulerConfig): KnowledgeScheduler {
  if (!knowledgeSchedulerInstance) {
    knowledgeSchedulerInstance = new KnowledgeScheduler(config);
  }
  return knowledgeSchedulerInstance;
}

export function startKnowledgeScheduler(config?: KnowledgeSchedulerConfig): KnowledgeScheduler {
  const scheduler = getKnowledgeScheduler(config);
  scheduler.start();
  return scheduler;
}
