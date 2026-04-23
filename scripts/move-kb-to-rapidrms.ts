/**
 * move-kb-to-rapidrms.ts — Re-home 409 articles from Acme Corp → RapidRMS
 *
 * The bulk import picked the first org (Acme Corp) by default; this script
 * moves articles to the real RapidRMS org + its Default Workspace so they
 * show up on the correct tenant's /knowledge-base pages.
 *
 * Usage: npx tsx scripts/move-kb-to-rapidrms.ts [--dry]
 */

import { db } from '../server/db.js';
import { knowledgeBase, organizations, workspaces } from '../shared/schema.js';
import { eq, and } from 'drizzle-orm';

const DRY = process.argv.includes('--dry');

async function main() {
  const [acme] = await db.select().from(organizations).where(eq(organizations.name, 'Acme Corp'));
  const [rapid] = await db.select().from(organizations).where(eq(organizations.name, 'RapidRMS'));

  if (!acme) throw new Error('Acme Corp org not found — nothing to move?');
  if (!rapid) throw new Error('RapidRMS org not found — run with correct name');

  const [ws] = await db.select().from(workspaces).where(eq(workspaces.organizationId, rapid.id)).limit(1);
  if (!ws) throw new Error(`No workspace in RapidRMS org (${rapid.id})`);

  console.log(`Source org: Acme Corp   (${acme.id})`);
  console.log(`Target org: RapidRMS    (${rapid.id})`);
  console.log(`Target ws:  ${ws.name}  (${ws.id})\n`);

  const rows = await db.select({ id: knowledgeBase.id }).from(knowledgeBase).where(eq(knowledgeBase.organizationId, acme.id));
  console.log(`Articles to move: ${rows.length}`);
  if (!rows.length) { console.log('Nothing to do.'); process.exit(0); }

  if (DRY) {
    console.log('[dry] would run UPDATE knowledge_base SET organization_id=$rapid, workspace_id=$ws WHERE organization_id=$acme');
    process.exit(0);
  }

  const result = await db.update(knowledgeBase)
    .set({ organizationId: rapid.id, workspaceId: ws.id })
    .where(eq(knowledgeBase.organizationId, acme.id));

  console.log(`✅ Moved ${rows.length} articles to RapidRMS`);

  // Verify
  const after = await db.select({ id: knowledgeBase.id })
    .from(knowledgeBase)
    .where(and(eq(knowledgeBase.organizationId, rapid.id), eq(knowledgeBase.workspaceId, ws.id)));
  console.log(`Articles now in RapidRMS/${ws.name}: ${after.length}`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
