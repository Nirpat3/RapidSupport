import type { RouteContext } from './types';
import { z } from 'zod';
import { storage } from '../storage';
import { requireAuth, requireRole } from '../auth';
import { zodErrorResponse } from '../middleware/errors';

async function resolveOrgId(user: any): Promise<string | null> {
  if (user?.organizationId) return user.organizationId;
  if (user?.isPlatformAdmin || user?.role === 'admin') {
    const orgs = await storage.getAllOrganizations();
    return orgs[0]?.id ?? null;
  }
  return null;
}

export function registerCsatRoutes({ app }: RouteContext) {
  // Public endpoint: Get survey info by token
  app.get('/api/csat/survey/:token', async (req, res) => {
    try {
      const { token } = req.params;
      const conversation = await storage.getConversationByToken(token);

      if (!conversation) {
        return res.status(404).json({ error: 'Survey not found' });
      }

      if (conversation.surveyStatus === 'completed') {
        return res.status(400).json({ error: 'Survey already completed' });
      }

      const organization = conversation.organizationId ? await storage.getOrganization(conversation.organizationId) : null;

      res.json({
        id: conversation.id,
        title: conversation.title,
        organizationName: organization?.name,
        organizationLogo: organization?.logo,
        primaryColor: organization?.primaryColor,
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

      const conversation = await storage.getConversationByToken(token);

      if (!conversation) {
        return res.status(404).json({ error: 'Survey not found' });
      }

      if (conversation.surveyStatus === 'completed') {
        return res.status(400).json({ error: 'Survey already completed' });
      }

      // Create rating record
      await storage.createConversationRating({
        conversationId: conversation.id,
        customerId: conversation.customerId,
        rating,
        feedback: feedback || null,
        primaryAgentId: conversation.assignedAgentId || null,
      });

      // Update conversation status
      await storage.updateConversation(conversation.id, { surveyStatus: 'completed' });

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
      const organizationId = await resolveOrgId(req.user as any);
      if (!organizationId) {
        return res.status(400).json({ error: 'User not associated with an organization' });
      }

      const stats = await storage.getCsatStats(organizationId);
      res.json(stats);
    } catch (error) {
      console.error('Failed to get CSAT stats:', error);
      res.status(500).json({ error: 'Failed to get CSAT stats' });
    }
  });

  // Admin endpoint: CSAT responses
  app.get('/api/admin/csat/responses', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const organizationId = await resolveOrgId(req.user as any);
      if (!organizationId) {
        return res.status(400).json({ error: 'User not associated with an organization' });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await storage.getCsatResponses(organizationId, page, limit);
      res.json(result);
    } catch (error) {
      console.error('Failed to get CSAT responses:', error);
      res.status(500).json({ error: 'Failed to get CSAT responses' });
    }
  });
}
