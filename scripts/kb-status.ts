/**
 * kb-status.ts — Show which org/workspace the imported KB articles landed in.
 * Also shows indexingStatus breakdown.
 */

import { db } from '../server/db.js';
import { knowledgeBase, organizations, workspaces } from '../shared/schema.js';
import { eq, sql } from 'drizzle-orm';

async function main() {
  // Org/workspace breakdown of KB articles
  const byOrg = await db.execute(sql`
    SELECT
      o.id AS org_id, o.name AS org_name,
      w.id AS ws_id, w.name AS ws_name,
      COUNT(kb.id)::int AS article_count,
      COUNT(CASE WHEN kb.indexing_status = 'indexed' THEN 1 END)::int AS indexed,
      COUNT(CASE WHEN kb.indexing_status = 'pending' THEN 1 END)::int AS pending,
      COUNT(CASE WHEN kb.indexing_status = 'failed' THEN 1 END)::int AS failed
    FROM knowledge_base kb
    LEFT JOIN organizations o ON kb.organization_id = o.id
    LEFT JOIN workspaces w ON kb.workspace_id = w.id
    GROUP BY o.id, o.name, w.id, w.name
    ORDER BY article_count DESC
  `);

  console.log('=== KB Articles by Org / Workspace ===\n');
  for (const row of byOrg.rows as any[]) {
    console.log(`  Org: ${row.org_name || '(none)'} (${row.org_id})`);
    console.log(`  Workspace: ${row.ws_name || '(none/null)'} (${row.ws_id || '—'})`);
    console.log(`  Articles: ${row.article_count} | indexed=${row.indexed}, pending=${row.pending}, failed=${row.failed}`);
    console.log('');
  }

  // All workspaces available
  const allWs = await db.select().from(workspaces);
  console.log('=== All Workspaces ===');
  for (const ws of allWs) {
    console.log(`  ${ws.name?.padEnd(30) || '(unnamed)'} org=${ws.organizationId} id=${ws.id}`);
  }

  console.log('\n=== All Organizations ===');
  const allOrg = await db.select().from(organizations);
  for (const o of allOrg) {
    console.log(`  ${o.name?.padEnd(30) || '(unnamed)'} id=${o.id}`);
  }

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
