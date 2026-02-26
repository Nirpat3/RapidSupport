import type { RouteContext } from './types';
import { z } from 'zod';
import { storage } from '../storage';
import { requireAuth, requireRole } from '../auth';
import { zodErrorResponse } from '../middleware/errors';
import { conversations, conversationRatings } from '@shared/schema';
import { eq, and, avg, count } from 'drizzle-orm';
import { db } from '../db';

export function registerCsatRoutes({ app }: RouteContext) {
  // Public endpoint: Get survey info by token
  app.get('/api/csat/survey/:token', async (req, res) => {
    try {
      const { token } = req.params;
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.surveyToken, token),
        with: {
          organization: true,
        }
      }) as any;

      if (!conversation) {
        return res.status(404).json({ error: 'Survey not found' });
      }

      if (conversation.surveyStatus === 'completed') {
        return res.status(400).json({ error: 'Survey already completed' });
      }

      res.json({
        id: conversation.id,
        title: conversation.title,
        organizationName: conversation.organization?.name,
        organizationLogo: conversation.organization?.logo,
        primaryColor: conversation.organization?.primaryColor,
      });
    } catch (error) {
      console.error('Failed to get survey:', error);
      res.status(500).json({ error: 'Failed to get survey' });
    }
  });

  // Public endpoint: Submit survey
  app.post('/api/csat/survey/:token', async (req, res) => {
    try {
      const { token } = req.params;
      const schema = z.object({
        rating: z.number().int().min(1).max(5),
        feedback: z.string().optional(),
      });

      const { rating, feedback } = schema.parse(req.body);

      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.surveyToken, token),
      });

      if (!conversation) {
        return res.status(404).json({ error: 'Survey not found' });
      }

      if (conversation.surveyStatus === 'completed') {
        return res.status(400).json({ error: 'Survey already completed' });
      }

      // Create rating record
      await db.insert(conversationRatings).values({
        conversationId: conversation.id,
        customerId: conversation.customerId,
        rating,
        feedback,
        primaryAgentId: conversation.assignedAgentId,
      });

      // Update conversation status
      await db.update(conversations)
        .set({ surveyStatus: 'completed' })
        .where(eq(conversations.id, conversation.id));

      res.json({ message: 'Survey submitted successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(zodErrorResponse(error));
      }
      console.error('Failed to submit survey:', error);
      res.status(500).json({ error: 'Failed to submit survey' });
    }
  });

  // Admin endpoint: CSAT stats
  app.get('/api/admin/csat', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = req.user as any;
      const organizationId = user.organizationId;

      // This is a simplified version, ideally we'd filter by org
      // but the current conversationRatings table doesn't have orgId directly.
      // We join with conversations to filter by org.
      
      const stats = await db.select({
        averageRating: avg(conversationRatings.rating),
        totalSurveys: count(conversationRatings.id),
      })
      .from(conversationRatings)
      .innerJoin(conversations, eq(conversationRatings.conversationId, conversations.id))
      .where(eq(conversations.organizationId, organizationId));

      // Rating distribution
      const distribution = await db.select({
        rating: conversationRatings.rating,
        count: count(conversationRatings.id),
      })
      .from(conversationRatings)
      .innerJoin(conversations, eq(conversationRatings.conversationId, conversations.id))
      .where(eq(conversations.organizationId, organizationId))
      .groupBy(conversationRatings.rating);

      // Response rate
      const totalSent = await db.select({
        count: count(conversations.id),
      })
      .from(conversations)
      .where(and(
        eq(conversations.organizationId, organizationId),
        z.enum(['sent', 'completed']).safeParse(conversations.surveyStatus).success ? sql`${conversations.surveyStatus} IN ('sent', 'completed')` : sql`1=1`
      ));
      // Adjusting the above because surveyStatus might not be easily queryable with IN in this way with drizzle if not careful
      const totalSentCount = await db.select({ count: count() }).from(conversations).where(and(eq(conversations.organizationId, organizationId), sql`${conversations.surveyStatus} != 'not_sent'`));

      res.json({
        averageRating: Number(stats[0]?.averageRating || 0).toFixed(1),
        totalSurveys: stats[0]?.totalSurveys || 0,
        completedSurveys: stats[0]?.totalSurveys || 0,
        responseRate: totalSentCount[0]?.count ? Math.round((Number(stats[0]?.totalSurveys) / Number(totalSentCount[0].count)) * 100) : 0,
        ratingDistribution: distribution,
      });
    } catch (error) {
      console.error('Failed to get CSAT stats:', error);
      res.status(500).json({ error: 'Failed to get CSAT stats' });
    }
  });

  // Admin endpoint: CSAT responses
  app.get('/api/admin/csat/responses', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = req.user as any;
      const organizationId = user.organizationId;

      const responses = await db.query.conversationRatings.findMany({
        innerJoin: {
          conversation: {
            where: eq(conversations.organizationId, organizationId),
          }
        },
        with: {
          conversation: true,
        },
        orderBy: (conversationRatings, { desc }) => [desc(conversationRatings.createdAt)],
        limit: 50,
      });

      res.json(responses);
    } catch (error) {
      console.error('Failed to get CSAT responses:', error);
      res.status(500).json({ error: 'Failed to get CSAT responses' });
    }
  });
}
