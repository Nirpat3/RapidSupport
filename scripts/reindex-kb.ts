/**
 * reindex-kb.ts — Push pending KB articles into Qdrant vector store
 *
 * After import-gdrive-kb.ts inserts rows with indexingStatus='pending',
 * this script loops each and calls KnowledgeRetrievalService.reindexArticle
 * to generate embeddings + upload to Qdrant via shre-router.
 *
 * Usage (RapidSupport root):
 *   npx tsx scripts/reindex-kb.ts              # reindex all pending
 *   npx tsx scripts/reindex-kb.ts --all        # reindex everything (incl. indexed)
 *   npx tsx scripts/reindex-kb.ts --limit 50   # first N
 */

import { db } from '../server/db.js';
import { knowledgeBase } from '../shared/schema.js';
import { eq, or } from 'drizzle-orm';
import { KnowledgeRetrievalService } from '../server/knowledge-retrieval.js';

const args = process.argv.slice(2);
const ALL = args.includes('--all');
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : null;

async function main() {
  const svc = KnowledgeRetrievalService.getInstance();

  // Fetch pending (or all) articles
  const rows = ALL
    ? await db.select({ id: knowledgeBase.id, title: knowledgeBase.title }).from(knowledgeBase)
    : await db.select({ id: knowledgeBase.id, title: knowledgeBase.title })
        .from(knowledgeBase)
        .where(or(
          eq(knowledgeBase.indexingStatus, 'pending'),
          eq(knowledgeBase.indexingStatus, 'failed'),
        ));

  const target = LIMIT ? rows.slice(0, LIMIT) : rows;
  console.log(`Reindexing ${target.length} articles (${ALL ? 'all' : 'pending/failed only'})...\n`);

  let ok = 0, err = 0;
  for (let i = 0; i < target.length; i++) {
    const { id, title } = target[i];
    try {
      await db.update(knowledgeBase).set({ indexingStatus: 'indexing' }).where(eq(knowledgeBase.id, id));
      await svc.reindexArticle(id);
      await db.update(knowledgeBase).set({
        indexingStatus: 'indexed',
        indexedAt: new Date(),
        indexingError: null,
      }).where(eq(knowledgeBase.id, id));
      ok++;
      if (ok % 10 === 0) console.log(`  [${i + 1}/${target.length}] ok=${ok} err=${err}`);
    } catch (e: any) {
      err++;
      const msg = e.message?.slice(0, 200) || String(e);
      await db.update(knowledgeBase).set({
        indexingStatus: 'failed',
        indexingError: msg,
      }).where(eq(knowledgeBase.id, id));
      console.error(`  ❌ ${title?.slice(0, 60)}: ${msg.slice(0, 100)}`);
    }
  }

  console.log(`\n=== DONE === indexed: ${ok}, errors: ${err}, total: ${target.length}`);
  process.exit(err > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
