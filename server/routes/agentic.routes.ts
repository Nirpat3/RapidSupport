import type { RouteContext } from './types';
import { z } from 'zod';
import { requireAuth, requireRole } from '../auth';
import { storage } from '../storage';
import { zodErrorResponse } from '../middleware/errors';

function getSelectedOrgId(req: any): string | null {
  return (req.session as any)?.selectedOrganizationId || (req.user as any)?.organizationId || null;
}

export function registerAgenticRoutes({ app }: RouteContext) {

  app.get('/api/ai/tools', requireAuth, async (req, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      const tools = await storage.getAiToolsByOrganization((req.user as any)?.isPlatformAdmin ? null : orgId);
      res.json({ tools });
    } catch (error) {
      console.error('Error fetching AI tools:', error);
      res.status(500).json({ error: 'Failed to fetch AI tools' });
    }
  });

  app.get('/api/ai/tools/:id', requireAuth, async (req, res) => {
    try {
      const tool = await storage.getAiTool(req.params.id);
      if (!tool) return res.status(404).json({ error: 'Tool not found' });
      const orgId = getSelectedOrgId(req);
      if (orgId && tool.organizationId !== orgId && !tool.isSystemTool && !(req.user as any)?.isPlatformAdmin) {
        return res.status(403).json({ error: 'Access denied' });
      }
      res.json({ tool });
    } catch (error) {
      console.error('Error fetching AI tool:', error);
      res.status(500).json({ error: 'Failed to fetch AI tool' });
    }
  });

  app.post('/api/ai/tools', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      if (!orgId) return res.status(400).json({ error: 'Organization context required' });

      const data = z.object({
        name: z.string().min(1),
        displayName: z.string().min(1),
        description: z.string().optional(),
        toolType: z.enum(['internal', 'external_api', 'webhook', 'integration']),
        category: z.string().optional(),
        parametersSchema: z.any().optional(),
        requiresApproval: z.boolean().optional(),
        isDestructive: z.boolean().optional(),
        endpointUrl: z.string().optional(),
        httpMethod: z.string().optional(),
        headers: z.any().optional(),
        authType: z.string().optional(),
        authConfig: z.any().optional(),
        requestTemplate: z.any().optional(),
        responseMapping: z.any().optional(),
        timeoutMs: z.number().optional(),
        retryCount: z.number().optional(),
      }).parse(req.body);

      const tool = await storage.createAiTool({ ...data, organizationId: orgId });
      res.status(201).json({ tool });
    } catch (error) {
      console.error('Error creating AI tool:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(zodErrorResponse(error));
      }
      res.status(500).json({ error: 'Failed to create AI tool' });
    }
  });

  app.patch('/api/ai/tools/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const tool = await storage.getAiTool(req.params.id);
      if (!tool) return res.status(404).json({ error: 'Tool not found' });
      const orgId = getSelectedOrgId(req);
      if (orgId && tool.organizationId !== orgId && !(req.user as any)?.isPlatformAdmin) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const updates = z.object({
        name: z.string().min(1).optional(),
        displayName: z.string().min(1).optional(),
        description: z.string().optional(),
        toolType: z.enum(['internal', 'external_api', 'webhook', 'integration']).optional(),
        category: z.string().optional(),
        parametersSchema: z.any().optional(),
        requiresApproval: z.boolean().optional(),
        isDestructive: z.boolean().optional(),
        endpointUrl: z.string().optional(),
        httpMethod: z.string().optional(),
        headers: z.any().optional(),
        authType: z.string().optional(),
        authConfig: z.any().optional(),
        requestTemplate: z.any().optional(),
        responseMapping: z.any().optional(),
        timeoutMs: z.number().optional(),
        retryCount: z.number().optional(),
      }).parse(req.body);

      const updated = await storage.updateAiTool(req.params.id, updates);
      res.json({ tool: updated });
    } catch (error) {
      console.error('Error updating AI tool:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(zodErrorResponse(error));
      }
      res.status(500).json({ error: 'Failed to update AI tool' });
    }
  });

  app.delete('/api/ai/tools/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const tool = await storage.getAiTool(req.params.id);
      if (!tool) return res.status(404).json({ error: 'Tool not found' });
      if (tool.isSystemTool) return res.status(403).json({ error: 'Cannot delete system tools' });
      const orgId = getSelectedOrgId(req);
      if (orgId && tool.organizationId !== orgId && !(req.user as any)?.isPlatformAdmin) {
        return res.status(403).json({ error: 'Access denied' });
      }
      await storage.deleteAiTool(req.params.id);
      res.json({ message: 'Tool deleted' });
    } catch (error) {
      console.error('Error deleting AI tool:', error);
      res.status(500).json({ error: 'Failed to delete AI tool' });
    }
  });

  app.get('/api/ai/agents/:agentId/tools', requireAuth, async (req, res) => {
    try {
      const tools = await storage.getAgentToolsWithDetails(req.params.agentId);
      res.json({ tools });
    } catch (error) {
      console.error('Error fetching agent tools:', error);
      res.status(500).json({ error: 'Failed to fetch agent tools' });
    }
  });

  app.post('/api/ai/agents/:agentId/tools', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const data = z.object({
        toolId: z.string(),
        isEnabled: z.boolean().optional(),
        overrideParams: z.any().optional(),
        maxCallsPerConversation: z.number().optional(),
        requiresApprovalOverride: z.boolean().optional(),
        customInstructions: z.string().optional(),
        priority: z.number().optional(),
      }).parse(req.body);

      const assignment = await storage.assignToolToAgent({ ...data, agentId: req.params.agentId });
      res.status(201).json({ assignment });
    } catch (error) {
      console.error('Error assigning tool to agent:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(zodErrorResponse(error));
      }
      res.status(500).json({ error: 'Failed to assign tool to agent' });
    }
  });

  app.patch('/api/ai/agents/:agentId/tools/:assignmentId', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const updates = z.object({
        isEnabled: z.boolean().optional(),
        overrideParams: z.any().optional(),
        maxCallsPerConversation: z.number().optional(),
        requiresApprovalOverride: z.boolean().optional(),
        customInstructions: z.string().optional(),
        priority: z.number().optional(),
      }).parse(req.body);

      const updated = await storage.updateAgentToolAssignment(req.params.assignmentId, updates);
      res.json({ assignment: updated });
    } catch (error) {
      console.error('Error updating agent tool assignment:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(zodErrorResponse(error));
      }
      res.status(500).json({ error: 'Failed to update agent tool assignment' });
    }
  });

  app.delete('/api/ai/agents/:agentId/tools/:assignmentId', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      await storage.removeToolFromAgent(req.params.assignmentId);
      res.json({ message: 'Tool assignment removed' });
    } catch (error) {
      console.error('Error removing tool assignment:', error);
      res.status(500).json({ error: 'Failed to remove tool assignment' });
    }
  });

  app.get('/api/ai/agents/:agentId/guardrails', requireAuth, async (req, res) => {
    try {
      const guardrails = await storage.getGuardrailsByAgent(req.params.agentId);
      res.json({ guardrails });
    } catch (error) {
      console.error('Error fetching guardrails:', error);
      res.status(500).json({ error: 'Failed to fetch guardrails' });
    }
  });

  app.post('/api/ai/agents/:agentId/guardrails', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const data = z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        guardrailType: z.enum(['confidence_threshold', 'rate_limit', 'content_filter', 'action_allowlist', 'action_blocklist', 'escalation_rule', 'token_limit', 'topic_restriction']),
        config: z.record(z.any()),
        isActive: z.boolean().optional(),
        priority: z.number().optional(),
      }).parse(req.body);

      const orgId = getSelectedOrgId(req);
      const guardrail = await storage.createGuardrail({ ...data, config: data.config as any, agentId: req.params.agentId, organizationId: orgId || undefined });
      res.status(201).json({ guardrail });
    } catch (error) {
      console.error('Error creating guardrail:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(zodErrorResponse(error));
      }
      res.status(500).json({ error: 'Failed to create guardrail' });
    }
  });

  app.patch('/api/ai/agents/:agentId/guardrails/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const updates = z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        guardrailType: z.enum(['confidence_threshold', 'rate_limit', 'content_filter', 'action_allowlist', 'action_blocklist', 'escalation_rule', 'token_limit', 'topic_restriction']).optional(),
        config: z.any().optional(),
        isActive: z.boolean().optional(),
        priority: z.number().optional(),
      }).parse(req.body);

      const updated = await storage.updateGuardrail(req.params.id, updates);
      res.json({ guardrail: updated });
    } catch (error) {
      console.error('Error updating guardrail:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(zodErrorResponse(error));
      }
      res.status(500).json({ error: 'Failed to update guardrail' });
    }
  });

  app.delete('/api/ai/agents/:agentId/guardrails/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      await storage.deleteGuardrail(req.params.id);
      res.json({ message: 'Guardrail deleted' });
    } catch (error) {
      console.error('Error deleting guardrail:', error);
      res.status(500).json({ error: 'Failed to delete guardrail' });
    }
  });

  app.get('/api/ai/agents/:agentId/workflows', requireAuth, async (req, res) => {
    try {
      const workflows = await storage.getWorkflowsByAgent(req.params.agentId);
      res.json({ workflows });
    } catch (error) {
      console.error('Error fetching workflows:', error);
      res.status(500).json({ error: 'Failed to fetch workflows' });
    }
  });

  app.get('/api/ai/agents/:agentId/workflows/:id', requireAuth, async (req, res) => {
    try {
      const workflow = await storage.getWorkflow(req.params.id);
      if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
      if (workflow.agentId !== req.params.agentId) return res.status(404).json({ error: 'Workflow not found for this agent' });
      res.json({ workflow });
    } catch (error) {
      console.error('Error fetching workflow:', error);
      res.status(500).json({ error: 'Failed to fetch workflow' });
    }
  });

  app.post('/api/ai/agents/:agentId/workflows', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const data = z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        triggerType: z.string().optional(),
        triggerConditions: z.any().optional(),
        steps: z.array(z.any()),
        variables: z.any().optional(),
        maxExecutionSteps: z.number().optional(),
        timeoutSeconds: z.number().optional(),
      }).parse(req.body);

      const orgId = getSelectedOrgId(req);
      const workflow = await storage.createWorkflow({ ...data, steps: data.steps as any, agentId: req.params.agentId, organizationId: orgId || undefined });
      res.status(201).json({ workflow });
    } catch (error) {
      console.error('Error creating workflow:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(zodErrorResponse(error));
      }
      res.status(500).json({ error: 'Failed to create workflow' });
    }
  });

  app.patch('/api/ai/agents/:agentId/workflows/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const updates = z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        triggerType: z.string().optional(),
        triggerConditions: z.any().optional(),
        steps: z.any().optional(),
        variables: z.any().optional(),
        isActive: z.boolean().optional(),
        maxExecutionSteps: z.number().optional(),
        timeoutSeconds: z.number().optional(),
      }).parse(req.body);

      const updated = await storage.updateWorkflow(req.params.id, updates);
      res.json({ workflow: updated });
    } catch (error) {
      console.error('Error updating workflow:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(zodErrorResponse(error));
      }
      res.status(500).json({ error: 'Failed to update workflow' });
    }
  });

  app.delete('/api/ai/agents/:agentId/workflows/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      await storage.deleteWorkflow(req.params.id);
      res.json({ message: 'Workflow deleted' });
    } catch (error) {
      console.error('Error deleting workflow:', error);
      res.status(500).json({ error: 'Failed to delete workflow' });
    }
  });

  app.get('/api/ai/agents/:agentId/connections', requireAuth, async (req, res) => {
    try {
      const connections = await storage.getConnectionsByAgent(req.params.agentId);
      res.json({ connections });
    } catch (error) {
      console.error('Error fetching connections:', error);
      res.status(500).json({ error: 'Failed to fetch connections' });
    }
  });

  app.post('/api/ai/agents/:agentId/connections', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const data = z.object({
        channelType: z.enum(['chat_widget', 'email', 'form', 'whatsapp', 'telegram', 'messenger', 'api', 'webhook']),
        channelId: z.string().optional(),
        name: z.string().min(1),
        description: z.string().optional(),
        config: z.any().optional(),
        isActive: z.boolean().optional(),
        priority: z.number().optional(),
        filterRules: z.any().optional(),
      }).parse(req.body);

      const orgId = getSelectedOrgId(req);
      const connection = await storage.createConnection({ ...data, agentId: req.params.agentId, organizationId: orgId || undefined });
      res.status(201).json({ connection });
    } catch (error) {
      console.error('Error creating connection:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(zodErrorResponse(error));
      }
      res.status(500).json({ error: 'Failed to create connection' });
    }
  });

  app.patch('/api/ai/agents/:agentId/connections/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const updates = z.object({
        channelType: z.enum(['chat_widget', 'email', 'form', 'whatsapp', 'telegram', 'messenger', 'api', 'webhook']).optional(),
        channelId: z.string().optional(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        config: z.any().optional(),
        isActive: z.boolean().optional(),
        priority: z.number().optional(),
        filterRules: z.any().optional(),
      }).parse(req.body);

      const updated = await storage.updateConnection(req.params.id, updates);
      res.json({ connection: updated });
    } catch (error) {
      console.error('Error updating connection:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(zodErrorResponse(error));
      }
      res.status(500).json({ error: 'Failed to update connection' });
    }
  });

  app.delete('/api/ai/agents/:agentId/connections/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      await storage.deleteConnection(req.params.id);
      res.json({ message: 'Connection deleted' });
    } catch (error) {
      console.error('Error deleting connection:', error);
      res.status(500).json({ error: 'Failed to delete connection' });
    }
  });

  app.get('/api/ai/chains', requireAuth, async (req, res) => {
    try {
      const orgId = getSelectedOrgId(req);
      if (!orgId) return res.status(400).json({ error: 'Organization context required' });
      const chains = await storage.getChainsByOrganization(orgId);
      res.json({ chains });
    } catch (error) {
      console.error('Error fetching chains:', error);
      res.status(500).json({ error: 'Failed to fetch chains' });
    }
  });

  app.get('/api/ai/agents/:agentId/chains', requireAuth, async (req, res) => {
    try {
      const chains = await storage.getChainsBySourceAgent(req.params.agentId);
      res.json({ chains });
    } catch (error) {
      console.error('Error fetching agent chains:', error);
      res.status(500).json({ error: 'Failed to fetch agent chains' });
    }
  });

  app.post('/api/ai/chains', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const data = z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        sourceAgentId: z.string(),
        targetAgentId: z.string(),
        routingType: z.enum(['intent', 'keyword', 'condition', 'always', 'fallback']),
        routingConditions: z.record(z.any()),
        delegationMode: z.enum(['handoff', 'consult', 'parallel']).optional(),
        returnToSource: z.boolean().optional(),
        contextPassthrough: z.any().optional(),
        priority: z.number().optional(),
      }).parse(req.body);

      const orgId = getSelectedOrgId(req);
      if (!orgId) return res.status(400).json({ error: 'Organization context required' });
      const chain = await storage.createChain({ ...data, routingConditions: data.routingConditions as any, organizationId: orgId });
      res.status(201).json({ chain });
    } catch (error) {
      console.error('Error creating chain:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(zodErrorResponse(error));
      }
      res.status(500).json({ error: 'Failed to create chain' });
    }
  });

  app.patch('/api/ai/chains/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const updates = z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        sourceAgentId: z.string().optional(),
        targetAgentId: z.string().optional(),
        routingType: z.enum(['intent', 'keyword', 'condition', 'always', 'fallback']).optional(),
        routingConditions: z.any().optional(),
        delegationMode: z.enum(['handoff', 'consult', 'parallel']).optional(),
        returnToSource: z.boolean().optional(),
        contextPassthrough: z.any().optional(),
        priority: z.number().optional(),
        isActive: z.boolean().optional(),
      }).parse(req.body);

      const updated = await storage.updateChain(req.params.id, updates);
      res.json({ chain: updated });
    } catch (error) {
      console.error('Error updating chain:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json(zodErrorResponse(error));
      }
      res.status(500).json({ error: 'Failed to update chain' });
    }
  });

  app.delete('/api/ai/chains/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      await storage.deleteChain(req.params.id);
      res.json({ message: 'Chain deleted' });
    } catch (error) {
      console.error('Error deleting chain:', error);
      res.status(500).json({ error: 'Failed to delete chain' });
    }
  });

  app.get('/api/ai/agents/:agentId/runtime-config', requireAuth, async (req, res) => {
    try {
      const agentId = req.params.agentId;
      const agent = await storage.getAiAgent(agentId);
      if (!agent) return res.status(404).json({ error: 'Agent not found' });

      const [tools, guardrails, workflows, connections, chains] = await Promise.all([
        storage.getAgentToolsWithDetails(agentId),
        storage.getGuardrailsByAgent(agentId),
        storage.getWorkflowsByAgent(agentId),
        storage.getConnectionsByAgent(agentId),
        storage.getChainsBySourceAgent(agentId),
      ]);

      res.json({ agent, tools, guardrails, workflows, connections, chains });
    } catch (error) {
      console.error('Error fetching agent runtime config:', error);
      res.status(500).json({ error: 'Failed to fetch agent runtime config' });
    }
  });
}
