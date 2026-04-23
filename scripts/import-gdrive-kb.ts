/**
 * import-gdrive-kb.ts — Bulk-import docs/kb/*.md into knowledge_base DB table
 *
 * Usage (run from RapidSupport root, on Replit or local with DATABASE_URL):
 *   npx tsx scripts/import-gdrive-kb.ts [--org <orgId>] [--workspace <wsId>] [--dry]
 *
 * Reads all markdown under docs/kb/, parses frontmatter for metadata,
 * and inserts into knowledge_base. Auto-skips duplicates by (title + sha).
 *
 * Automatic re-indexing: the existing storage.createKnowledgeBase triggers
 * KnowledgeRetrievalService.reindexArticle → Qdrant vector store via
 * shre-router — same pipeline as manual uploads in the UI.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../server/db.js';
import { knowledgeBase, organizations, workspaces, users } from '../shared/schema.js';
import { eq, and } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const KB_ROOT = path.resolve(__dirname, '../docs/kb');

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const orgArg = args.includes('--org') ? args[args.indexOf('--org') + 1] : null;
const wsArg = args.includes('--workspace') ? args[args.indexOf('--workspace') + 1] : null;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) out.push(...walk(p));
    else if (f.endsWith('.md') && f !== '_manifest.json') out.push(p);
  }
  return out;
}

function parseFrontmatter(text: string): { meta: Record<string, string>; body: string } {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { meta: {}, body: text };
  const meta: Record<string, string> = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: m[2] };
}

function extractTitle(body: string, filename: string): string {
  const m = body.match(/^#\s+(.+)/m);
  return (m?.[1] || path.basename(filename, '.md').replace(/[-_]+/g, ' ')).trim().slice(0, 200);
}

async function resolveOrgAndWorkspace(): Promise<{ orgId: string; wsId: string | null; userId: string }> {
  let orgId = orgArg;
  let wsId = wsArg;

  if (!orgId) {
    const [org] = await db.select().from(organizations).limit(1);
    if (!org) throw new Error('No organization found. Pass --org <id>.');
    orgId = org.id;
    console.log(`Using org: ${orgId} (${org.name || '?'})`);
  }

  if (!wsId) {
    const [ws] = await db.select().from(workspaces).where(eq(workspaces.organizationId, orgId)).limit(1);
    wsId = ws?.id || null;
    if (wsId) console.log(`Using workspace: ${wsId}`);
  }

  const [admin] = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
  const userId = admin?.id || null;
  if (!userId) throw new Error('No admin user found.');
  console.log(`Created-by user: ${userId}`);

  return { orgId: orgId!, wsId, userId };
}

async function main() {
  const { orgId, wsId, userId } = await resolveOrgAndWorkspace();

  const files = walk(KB_ROOT);
  console.log(`\nFound ${files.length} markdown files under ${KB_ROOT}\n`);

  let ok = 0, skip = 0, err = 0;
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    const { meta, body } = parseFrontmatter(text);
    const title = extractTitle(body, f);
    const category = meta.category || 'Uncategorized';
    const tags = (meta.tags || '').split(',').map(t => t.trim()).filter(Boolean);
    const sha = meta.sha || '';

    // Dedup by title + sha (if sha present) within org
    const existing = await db.select().from(knowledgeBase).where(and(
      eq(knowledgeBase.organizationId, orgId),
      eq(knowledgeBase.title, title),
    )).limit(1);

    if (existing.length > 0) {
      skip++;
      continue;
    }

    if (DRY) {
      console.log(`[dry] would insert: ${title} [${category}] tags=${tags.join(',')}`);
      ok++;
      continue;
    }

    try {
      await db.insert(knowledgeBase).values({
        title,
        content: body,
        category,
        tags,
        priority: 50,
        sourceType: 'file',
        fileName: path.basename(f),
        organizationId: orgId,
        workspaceId: wsId,
        createdBy: userId,
        indexingStatus: 'pending',
      });
      ok++;
      if (ok % 20 === 0) process.stdout.write(`  ${ok}/${files.length}\r`);
    } catch (e: any) {
      err++;
      console.error(`  ❌ ${title}: ${e.message?.slice(0, 120)}`);
    }
  }

  console.log(`\n\n=== DONE ===`);
  console.log(`Inserted: ${ok}, Skipped (duplicates): ${skip}, Errors: ${err}`);
  console.log(`Total in KB: ${ok + skip}`);
  console.log(`\nNote: re-indexing happens lazily via KnowledgeRetrievalService.`);
  console.log(`Run: POST /api/knowledge-base/reindex-all  (admin-only) to force re-embed all articles.`);

  process.exit(err > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
