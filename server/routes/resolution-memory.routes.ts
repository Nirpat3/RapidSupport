import { Express } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { requireAuth, requireRole } from '../auth';
import { AIService } from '../ai-service';
import { ResolutionMemoryService } from '../services/resolution-memory';
import { ImageErrorDetectionService } from '../services/image-error-detection';
import { AIDataProtectionService } from '../services/ai-data-protection';
import type { RouteContext } from './types';
import { zodErrorResponse } from '../middleware/errors';

function getSelectedOrgId(req: any): string | null {
  return (req.session as any)?.selectedOrganizationId || (req.user as any)?.organizationId || null;
}

export function registerResolutionMemoryRoutes({ app }: RouteContext) {

  // ============================================
  // RESOLUTION LEARNINGS
  // ============================================

  app.get('/api/admin/resolution-learnings', requireAuth, requireRole(['admin', 'supervisor']), async (req: any, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      if (!orgId) return res.status(400).json({ error: 'No organization selected' });

      const { issueCategory, stationId } = req.query;
      const learnings = await storage.getResolutionLearnings(orgId, issueCategory as string, stationId as string);
      res.json({ learnings });
    } catch (error) {
      console.error('Error fetching resolution learnings:', error);
      res.status(500).json({ error: 'Failed to fetch resolution learnings' });
    }
  });

  app.post('/api/admin/resolution-learnings', requireAuth, requireRole(['admin', 'supervisor']), async (req: any, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      if (!orgId) return res.status(400).json({ error: 'No organization selected' });

      const schema = z.object({
        issueCategory: z.string(),
        issueSignature: z.string(),
        learningType: z.enum(['what_worked', 'what_failed', 'what_to_avoid', 'prerequisite', 'tip']),
        content: z.string(),
        confidence: z.number().min(0).max(100).optional(),
        stationId: z.string().optional(),
        isGlobal: z.boolean().optional(),
      });

      const data = schema.parse(req.body);
      const learning = await storage.createResolutionLearning({
        organizationId: orgId,
        ...data,
        stationId: data.stationId || null,
        applicableStations: null,
        isGlobal: data.isGlobal ?? !data.stationId,
      });

      res.status(201).json({ learning });
    } catch (error: any) {
      console.error('Error creating resolution learning:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(zodErrorResponse(error));
      }
      res.status(500).json({ error: 'Failed to create resolution learning' });
    }
  });

  // ============================================
  // STATION RESOLUTION MEMORY
  // ============================================

  app.get('/api/admin/station-memory/:stationId', requireAuth, requireRole(['admin', 'supervisor']), async (req: any, res) => {
    try {
      const { stationId } = req.params;
      const { issueCategory } = req.query;
      const memory = await storage.getStationResolutionMemory(stationId, issueCategory as string);
      res.json({ memory });
    } catch (error) {
      console.error('Error fetching station memory:', error);
      res.status(500).json({ error: 'Failed to fetch station memory' });
    }
  });

  app.get('/api/admin/resolution-memory', requireAuth, requireRole(['admin', 'supervisor']), async (req: any, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      if (!orgId) return res.status(400).json({ error: 'No organization selected' });

      const { issueCategory } = req.query;
      const memory = await storage.getOrgResolutionMemory(orgId, issueCategory as string);
      res.json({ memory });
    } catch (error) {
      console.error('Error fetching org resolution memory:', error);
      res.status(500).json({ error: 'Failed to fetch organization resolution memory' });
    }
  });

  // ============================================
  // CONVERSATION RESOLUTION - Auto-extract learnings
  // ============================================

  app.post('/api/admin/conversations/:conversationId/extract-learnings', requireAuth, requireRole(['admin', 'supervisor', 'agent']), async (req: any, res) => {
    try {
      const { conversationId } = req.params;
      const orgId = getSelectedOrgId(req);
      if (!orgId) return res.status(400).json({ error: 'No organization selected' });

      const schema = z.object({
        issueCategory: z.string(),
        outcome: z.enum(['resolved', 'partially_resolved', 'not_resolved']),
        stationId: z.string().optional(),
      });

      const data = schema.parse(req.body);

      const messages = await storage.getMessages(conversationId);
      const formattedMessages = messages.map(m => ({
        role: m.senderId ? 'agent' : 'customer',
        content: m.content,
      }));

      await ResolutionMemoryService.analyzeConversationForLearnings(
        conversationId,
        orgId,
        data.issueCategory,
        formattedMessages,
        data.outcome,
        data.stationId
      );

      res.json({ success: true, message: 'Learnings extracted from conversation' });
    } catch (error: any) {
      console.error('Error extracting learnings:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(zodErrorResponse(error));
      }
      res.status(500).json({ error: 'Failed to extract learnings' });
    }
  });

  // ============================================
  // RESOLUTION STEPS - Save detailed resolution
  // ============================================

  app.post('/api/admin/resolutions/:resolutionId/steps', requireAuth, requireRole(['admin', 'supervisor', 'agent']), async (req: any, res) => {
    try {
      const { resolutionId } = req.params;
      const orgId = getSelectedOrgId(req);
      if (!orgId) return res.status(400).json({ error: 'No organization selected' });

      const schema = z.object({
        issueCategory: z.string(),
        issueDescription: z.string(),
        stationId: z.string().optional(),
        steps: z.array(z.object({
          action: z.string(),
          result: z.enum(['success', 'failed', 'partial', 'skipped']),
          details: z.string().optional(),
          errorMessage: z.string().optional(),
          toolUsed: z.string().optional(),
        })),
      });

      const data = schema.parse(req.body);

      await ResolutionMemoryService.saveResolutionWithLearnings(
        resolutionId,
        orgId,
        data.issueCategory,
        data.issueDescription,
        data.steps,
        data.stationId
      );

      res.json({ success: true, message: 'Resolution steps and learnings saved' });
    } catch (error: any) {
      console.error('Error saving resolution steps:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(zodErrorResponse(error));
      }
      res.status(500).json({ error: 'Failed to save resolution steps' });
    }
  });

  app.get('/api/admin/resolutions/:resolutionId/steps', requireAuth, async (req: any, res) => {
    try {
      const { resolutionId } = req.params;
      const steps = await storage.getResolutionSteps(resolutionId);
      res.json({ steps });
    } catch (error) {
      console.error('Error fetching resolution steps:', error);
      res.status(500).json({ error: 'Failed to fetch resolution steps' });
    }
  });

  // ============================================
  // IMAGE ERROR ANALYSIS
  // ============================================

  app.post('/api/analyze-image-error', requireAuth, async (req: any, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      if (!orgId) return res.status(400).json({ error: 'No organization selected' });

      const schema = z.object({
        imageUrl: z.string().url(),
        conversationId: z.string().optional(),
        customerId: z.string().optional(),
        stationId: z.string().optional(),
      });

      const data = schema.parse(req.body);

      const result = await ImageErrorDetectionService.analyzeErrorImage(
        data.imageUrl,
        orgId,
        data.conversationId,
        data.customerId,
        data.stationId
      );

      res.json({
        extractedText: result.extractedText,
        errorType: result.errorType,
        matchedSolution: result.matchedSolution ? {
          solution: result.matchedSolution.solution,
          steps: result.matchedSolution.steps,
          confidence: result.matchedSolution.confidence,
          source: result.matchedSolution.source,
        } : null,
      });
    } catch (error: any) {
      console.error('Error analyzing image:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(zodErrorResponse(error));
      }
      res.status(500).json({ error: 'Failed to analyze image' });
    }
  });

  app.get('/api/admin/image-error-signatures', requireAuth, requireRole(['admin', 'supervisor']), async (req: any, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      if (!orgId) return res.status(400).json({ error: 'No organization selected' });

      const signatures = await storage.getImageErrorSignaturesByOrg(orgId);
      res.json({ signatures });
    } catch (error) {
      console.error('Error fetching image error signatures:', error);
      res.status(500).json({ error: 'Failed to fetch image error signatures' });
    }
  });

  app.patch('/api/admin/image-error-signatures/:id/feedback', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { wasHelpful } = req.body;
      const updated = await storage.updateImageErrorSignature(id, { wasHelpful });
      res.json({ signature: updated });
    } catch (error) {
      console.error('Error updating image error signature:', error);
      res.status(500).json({ error: 'Failed to update feedback' });
    }
  });

  // ============================================
  // AI SENSITIVE DATA PROTECTION RULES
  // ============================================

  app.get('/api/admin/sensitive-data-rules', requireAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      const rules = await storage.getActiveSensitiveDataRules(orgId || undefined);
      res.json({ rules });
    } catch (error) {
      console.error('Error fetching sensitive data rules:', error);
      res.status(500).json({ error: 'Failed to fetch sensitive data rules' });
    }
  });

  app.post('/api/admin/sensitive-data-rules', requireAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      const orgId = getSelectedOrgId(req);

      const schema = z.object({
        ruleName: z.string(),
        ruleType: z.enum(['pattern', 'keyword', 'data_type', 'field_name']),
        pattern: z.string(),
        action: z.enum(['redact', 'block', 'mask', 'warn']),
        replacement: z.string().optional(),
        description: z.string().optional(),
        severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
      });

      const data = schema.parse(req.body);
      const rule = await storage.createSensitiveDataRule({
        ...data,
        organizationId: orgId,
        isSystemRule: false,
        replacement: data.replacement || '[REDACTED]',
        severity: data.severity || 'high',
      });

      AIDataProtectionService.clearRulesCache();
      res.status(201).json({ rule });
    } catch (error: any) {
      console.error('Error creating sensitive data rule:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(zodErrorResponse(error));
      }
      res.status(500).json({ error: 'Failed to create rule' });
    }
  });

  app.patch('/api/admin/sensitive-data-rules/:id', requireAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const schema = z.object({
        ruleName: z.string().optional(),
        pattern: z.string().optional(),
        action: z.enum(['redact', 'block', 'mask', 'warn']).optional(),
        replacement: z.string().optional(),
        description: z.string().optional(),
        severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
        isActive: z.boolean().optional(),
      });

      const data = schema.parse(req.body);
      const rule = await storage.updateSensitiveDataRule(id, data);
      AIDataProtectionService.clearRulesCache();
      res.json({ rule });
    } catch (error: any) {
      console.error('Error updating sensitive data rule:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(zodErrorResponse(error));
      }
      res.status(500).json({ error: 'Failed to update rule' });
    }
  });

  app.delete('/api/admin/sensitive-data-rules/:id', requireAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSensitiveDataRule(id);
      AIDataProtectionService.clearRulesCache();
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting sensitive data rule:', error);
      res.status(500).json({ error: 'Failed to delete rule' });
    }
  });

  // ============================================
  // AI DATA ACCESS AUDIT LOG
  // ============================================

  app.get('/api/admin/data-access-log', requireAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      if (!orgId) return res.status(400).json({ error: 'No organization selected' });

      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getDataAccessLogs(orgId, limit);
      res.json({ logs });
    } catch (error) {
      console.error('Error fetching data access logs:', error);
      res.status(500).json({ error: 'Failed to fetch data access logs' });
    }
  });

  // ============================================
  // RESOLUTION MEMORY CONTEXT PREVIEW (for testing)
  // ============================================

  app.post('/api/admin/resolution-memory/preview', requireAuth, requireRole(['admin', 'supervisor']), async (req: any, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      if (!orgId) return res.status(400).json({ error: 'No organization selected' });

      const schema = z.object({
        issueCategory: z.string(),
        issueDescription: z.string(),
        stationId: z.string().optional(),
      });

      const data = schema.parse(req.body);
      const context = await ResolutionMemoryService.getResolutionContext(
        orgId, data.issueCategory, data.issueDescription, data.stationId
      );
      const formatted = ResolutionMemoryService.formatContextForAI(context);

      res.json({ context, formattedPrompt: formatted });
    } catch (error: any) {
      console.error('Error previewing resolution memory:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(zodErrorResponse(error));
      }
      res.status(500).json({ error: 'Failed to preview' });
    }
  });
}
