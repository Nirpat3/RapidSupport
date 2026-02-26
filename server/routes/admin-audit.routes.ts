import { type RouteContext } from './types';
import { db } from '../db';
import { auditLog, users, conversations, messages } from '@shared/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { requireAuth, requireRole } from '../auth';
import { z } from 'zod';
import { zodErrorResponse } from '../middleware/errors';
import { conversationMergeSchema } from '@shared/schema';

export function registerAdminAuditRoutes({ app }: RouteContext) {
  // GET /api/admin/audit-log
  app.get('/api/admin/audit-log', requireAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      const user = req.user as any;
      const {
        entityType,
        action,
        performedBy,
        from,
        to,
        page = '1',
        limit = '50'
      } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const offset = (pageNum - 1) * limitNum;

      const filters = [];
      
      // Multi-tenant scoping
      if (!user.isPlatformAdmin) {
        filters.push(eq(auditLog.organizationId, user.organizationId));
      }

      if (entityType) filters.push(eq(auditLog.entityType, entityType as string));
      if (action) filters.push(eq(auditLog.action, action as string));
      if (performedBy) filters.push(eq(auditLog.performedBy, performedBy as string));
      
      if (from) filters.push(sql`${auditLog.createdAt} >= ${new Date(from as string)}`);
      if (to) filters.push(sql`${auditLog.createdAt} <= ${new Date(to as string)}`);

      const query = db
        .select({
          id: auditLog.id,
          entityType: auditLog.entityType,
          entityId: auditLog.entityId,
          action: auditLog.action,
          performedBy: auditLog.performedBy,
          performedByType: auditLog.performedByType,
          organizationId: auditLog.organizationId,
          fieldName: auditLog.fieldName,
          oldValue: auditLog.oldValue,
          newValue: auditLog.newValue,
          entitySnapshot: auditLog.entitySnapshot,
          reason: auditLog.reason,
          metadata: auditLog.metadata,
          createdAt: auditLog.createdAt,
          performerName: users.name,
        })
        .from(auditLog)
        .leftJoin(users, eq(auditLog.performedBy, users.id))
        .where(filters.length > 0 ? and(...filters) : undefined)
        .orderBy(desc(auditLog.createdAt))
        .limit(limitNum)
        .offset(offset);

      const [logs, countResult] = await Promise.all([
        query,
        db
          .select({ count: sql<number>`count(*)` })
          .from(auditLog)
          .where(filters.length > 0 ? and(...filters) : undefined)
      ]);

      const total = Number(countResult[0]?.count || 0);

      res.json({
        logs,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        }
      });
    } catch (error) {
      console.error('Error fetching audit log:', error);
      res.status(500).json({ error: 'Failed to fetch audit log' });
    }
  });

  // POST /api/conversations/:id/merge
  app.post('/api/conversations/:id/merge', requireAuth, async (req: any, res) => {
    try {
      const sourceId = req.params.id;
      const { targetConversationId } = conversationMergeSchema.parse(req.body);

      if (sourceId === targetConversationId) {
        return res.status(400).json({ error: 'Cannot merge a conversation into itself' });
      }

      // 1. Validate both conversations exist and belong to the same org
      const [sourceConv] = await db.select().from(conversations).where(eq(conversations.id, sourceId));
      const [targetConv] = await db.select().from(conversations).where(eq(conversations.id, targetConversationId));

      if (!sourceConv || !targetConv) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      const user = req.user as any;
      if (sourceConv.organizationId !== user.organizationId || targetConv.organizationId !== user.organizationId) {
        return res.status(403).json({ error: 'Unauthorized: Conversations must belong to your organization' });
      }

      // 2. Perform merge in a transaction
      const updatedTarget = await db.transaction(async (tx) => {
        // Move all messages
        await tx
          .update(messages)
          .set({ conversationId: targetConversationId })
          .where(eq(messages.conversationId, sourceId));

        // Create system message in target
        await tx.insert(messages).values({
          conversationId: targetConversationId,
          content: `Conversation #${sourceConv.id} merged into this conversation`,
          senderType: 'system',
          senderId: user.id,
          status: 'sent',
        });

        // Mark source as closed
        await tx
          .update(conversations)
          .set({ 
            status: 'closed',
            updatedAt: new Date(),
          })
          .where(eq(conversations.id, sourceId));

        // Audit Log for source
        await tx.insert(auditLog).values({
          entityType: 'conversation',
          entityId: sourceId,
          action: 'update',
          performedBy: user.id,
          organizationId: user.organizationId,
          fieldName: 'status',
          oldValue: sourceConv.status,
          newValue: 'closed',
          reason: `Merged into conversation ${targetConversationId}`,
        });

        // Audit Log for target
        await tx.insert(auditLog).values({
          entityType: 'conversation',
          entityId: targetConversationId,
          action: 'update',
          performedBy: user.id,
          organizationId: user.organizationId,
          reason: `Merged from conversation ${sourceId}`,
        });

        // Return updated target conversation
        return tx.select().from(conversations).where(eq(conversations.id, targetConversationId));
      });

      res.json(updatedTarget[0]);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(zodErrorResponse(error));
      }
      console.error('Error merging conversations:', error);
      res.status(500).json({ error: 'Failed to merge conversations' });
    }
  });
}
