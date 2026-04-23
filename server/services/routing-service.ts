/**
 * Routing service — picks an agent to assign a new conversation to.
 *
 * Strategy:
 *   1. If the store has a workspaceId, pick the least-loaded active agent
 *      in that workspace.
 *   2. Otherwise, pick the least-loaded active agent across the reseller org.
 *   3. "Load" = number of non-resolved, non-closed conversations currently
 *      assigned to each agent. Ties broken by most-recently-active.
 *
 * Returns null if no eligible agent exists — conversation stays unassigned
 * and waits for a human to pick it up.
 */
import { db } from '../db';
import {
  workspaceMembers, users, conversations,
} from '@shared/schema';
import { and, asc, desc, eq, inArray, notInArray, sql } from 'drizzle-orm';

export interface RoutingContext {
  organizationId: string; // reseller org
  workspaceId?: string | null;
}

export async function pickAgentForConversation(ctx: RoutingContext): Promise<string | null> {
  // Step 1: collect candidate agent userIds
  let candidateUserIds: string[] = [];

  if (ctx.workspaceId) {
    const rows = await db.select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(and(
        eq(workspaceMembers.workspaceId, ctx.workspaceId),
        eq(workspaceMembers.status, 'active'),
        // exclude 'viewer' — they can't handle tickets
        notInArray(workspaceMembers.role, ['viewer']),
      ));
    candidateUserIds = rows.map(r => r.userId);
  }

  if (candidateUserIds.length === 0) {
    // Fallback: any active user in the reseller org
    const rows = await db.select({ id: users.id })
      .from(users)
      .where(and(
        eq(users.organizationId, ctx.organizationId),
        eq(users.isActive, true),
      ));
    candidateUserIds = rows.map(r => r.id);
  }

  if (candidateUserIds.length === 0) return null;

  // Step 2: count open conversations per candidate
  const loadRows = await db.select({
    agentId: conversations.assignedAgentId,
    load: sql<number>`count(*)::int`,
  })
    .from(conversations)
    .where(and(
      inArray(conversations.assignedAgentId, candidateUserIds),
      notInArray(conversations.status, ['resolved', 'closed']),
    ))
    .groupBy(conversations.assignedAgentId);

  const loadMap = new Map<string, number>();
  for (const row of loadRows) {
    if (row.agentId) loadMap.set(row.agentId, row.load);
  }

  // Step 3: pick min-load — if tied, pick the one with most-recent lastAgentReplyAt
  let bestAgentId: string | null = null;
  let bestLoad = Infinity;
  const tiedCandidates: string[] = [];
  for (const agentId of candidateUserIds) {
    const load = loadMap.get(agentId) || 0;
    if (load < bestLoad) {
      bestAgentId = agentId;
      bestLoad = load;
      tiedCandidates.length = 0;
      tiedCandidates.push(agentId);
    } else if (load === bestLoad) {
      tiedCandidates.push(agentId);
    }
  }

  if (tiedCandidates.length > 1) {
    // Break tie by most-recent agent activity — query for last reply timestamp
    const recent = await db.select({
      agentId: conversations.assignedAgentId,
      lastReply: sql<Date | null>`max(${conversations.lastAgentReplyAt})`,
    })
      .from(conversations)
      .where(inArray(conversations.assignedAgentId, tiedCandidates))
      .groupBy(conversations.assignedAgentId)
      .orderBy(desc(sql`max(${conversations.lastAgentReplyAt})`))
      .limit(1);
    if (recent[0]?.agentId) bestAgentId = recent[0].agentId;
  }

  return bestAgentId;
}
