import { storage } from '../storage';
import { db } from '../db';
import { conversations, auditLog } from '@shared/schema';
import type { AiTool, AiAgentTool, AiGuardrail } from '@shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import type { ChatCompletionTool } from 'openai/resources/chat/completions';

export interface ToolExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  actionTaken: string;
  requiresApproval?: boolean;
}

export interface ToolExecutionContext {
  conversationId: string;
  customerId?: string;
  agentId?: string;
  organizationId?: string;
  workspaceId?: string;
  sessionId?: string;
}

export interface ActionLogEntry {
  toolName: string;
  input: Record<string, unknown>;
  output: ToolExecutionResult;
  conversationId: string;
  agentId?: string;
  organizationId?: string;
  executedAt: Date;
  confidenceScore: number;
}

const DESTRUCTIVE_TOOLS = new Set([
  'create_ticket',
  'escalate_to_human',
  'update_conversation_priority',
  'update_conversation_status',
  'schedule_callback',
]);

const CONFIDENCE_THRESHOLD = 0.75;

export const AGENT_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_knowledge_base',
      description: 'Search the knowledge base for articles relevant to the customer query. Use this when you need to find documentation, guides, or FAQ answers.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query to find relevant knowledge base articles' },
          limit: { type: 'number', description: 'Maximum number of results to return (default 5)' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'lookup_customer',
      description: 'Look up customer information by their ID or email. Use this to retrieve customer details, history, or account status.',
      parameters: {
        type: 'object',
        properties: {
          customer_id: { type: 'string', description: 'The customer ID to look up' },
          email: { type: 'string', description: 'The customer email to look up (alternative to customer_id)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_conversation_history',
      description: 'Retrieve recent messages from the current conversation or a specific conversation. Useful for understanding context.',
      parameters: {
        type: 'object',
        properties: {
          conversation_id: { type: 'string', description: 'The conversation ID (defaults to current conversation)' },
          limit: { type: 'number', description: 'Number of recent messages to retrieve (default 10)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_ticket',
      description: 'Create a support ticket for tracking an issue. Use when a customer reports a bug, requests a feature, or has an issue that needs formal tracking.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Concise title for the ticket' },
          description: { type: 'string', description: 'Detailed description of the issue or request' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Ticket priority level' },
          category: { type: 'string', description: 'Category for the ticket (e.g. Bug, Feature Request, Account Issue)' },
        },
        required: ['title', 'description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'escalate_to_human',
      description: 'Escalate the conversation to a human agent. Use when the issue is too complex, the customer is frustrated, or you cannot resolve the problem.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Why this conversation needs human attention' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Urgency of escalation' },
          suggested_department: { type: 'string', description: 'Suggested department to handle this (e.g. billing, technical, sales)' },
        },
        required: ['reason'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_conversation_priority',
      description: 'Update the priority of the current conversation based on issue severity.',
      parameters: {
        type: 'object',
        properties: {
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'New priority level' },
          reason: { type: 'string', description: 'Why the priority should be changed' },
        },
        required: ['priority', 'reason'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_conversation_status',
      description: 'Update the status of the current conversation. Use resolved when the issue is fully addressed.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['open', 'pending', 'resolved'], description: 'New conversation status' },
          reason: { type: 'string', description: 'Why the status is being changed' },
        },
        required: ['status', 'reason'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_customer_tickets',
      description: 'Retrieve existing tickets for the current customer to check for related or duplicate issues.',
      parameters: {
        type: 'object',
        properties: {
          status_filter: { type: 'string', enum: ['open', 'in-progress', 'closed', 'all'], description: 'Filter tickets by status (default: all)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'schedule_callback',
      description: 'Schedule a follow-up for this conversation at a future date/time.',
      parameters: {
        type: 'object',
        properties: {
          followup_date: { type: 'string', description: 'ISO 8601 date string for when to follow up (e.g. 2025-12-20T10:00:00Z)' },
          note: { type: 'string', description: 'Note about what should happen during follow-up' },
        },
        required: ['followup_date', 'note'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_resolution_history',
      description: 'Check how similar issues were resolved in the past. Useful for finding proven solutions.',
      parameters: {
        type: 'object',
        properties: {
          issue_description: { type: 'string', description: 'Description of the issue to find similar resolutions for' },
          category: { type: 'string', description: 'Issue category to filter by' },
        },
        required: ['issue_description'],
      },
    },
  },
];

const actionLog: ActionLogEntry[] = [];

export function getActionLog(): ActionLogEntry[] {
  return [...actionLog];
}

export function getRecentActions(conversationId: string, limit = 10): ActionLogEntry[] {
  return actionLog
    .filter(a => a.conversationId === conversationId)
    .slice(-limit);
}

export function requiresApproval(toolName: string, confidence: number): boolean {
  return DESTRUCTIVE_TOOLS.has(toolName) && confidence < CONFIDENCE_THRESHOLD;
}

async function logAction(entry: ActionLogEntry): Promise<void> {
  actionLog.push(entry);
  if (actionLog.length > 1000) {
    actionLog.splice(0, actionLog.length - 500);
  }
  console.log(`[AI Action] ${entry.toolName}: ${entry.output.success ? 'SUCCESS' : 'FAILED'} | conv=${entry.conversationId} | agent=${entry.agentId}`);
  
  try {
    await db.insert(auditLog).values({
      entityType: 'ai_action',
      entityId: entry.conversationId,
      action: entry.toolName,
      performedBy: entry.agentId || null,
      performedByType: 'system',
      organizationId: entry.organizationId || null,
      reason: entry.output.actionTaken,
      metadata: {
        toolName: entry.toolName,
        input: entry.input,
        output: { success: entry.output.success, actionTaken: entry.output.actionTaken, requiresApproval: entry.output.requiresApproval },
        confidenceScore: entry.confidenceScore,
        conversationId: entry.conversationId,
      },
    });
  } catch (err) {
    console.error('[AI Action] Failed to persist audit log:', err);
  }
}

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  context: ToolExecutionContext,
  confidence: number = 1.0
): Promise<ToolExecutionResult> {
  if (requiresApproval(toolName, confidence)) {
    const result: ToolExecutionResult = {
      success: false,
      requiresApproval: true,
      actionTaken: `Action "${toolName}" requires human approval (confidence ${(confidence * 100).toFixed(0)}% below threshold ${(CONFIDENCE_THRESHOLD * 100).toFixed(0)}%)`,
    };
    logAction({ toolName, input: args, output: result, conversationId: context.conversationId, agentId: context.agentId, organizationId: context.organizationId, executedAt: new Date(), confidenceScore: confidence });
    return result;
  }

  try {
    const result = await executeToolInternal(toolName, args, context);
    logAction({ toolName, input: args, output: result, conversationId: context.conversationId, agentId: context.agentId, organizationId: context.organizationId, executedAt: new Date(), confidenceScore: confidence });
    return result;
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    const result: ToolExecutionResult = { success: false, error: errMsg, actionTaken: `Failed to execute ${toolName}: ${errMsg}` };
    logAction({ toolName, input: args, output: result, conversationId: context.conversationId, agentId: context.agentId, organizationId: context.organizationId, executedAt: new Date(), confidenceScore: confidence });
    return result;
  }
}

async function executeToolInternal(
  toolName: string,
  args: Record<string, unknown>,
  context: ToolExecutionContext
): Promise<ToolExecutionResult> {
  switch (toolName) {
    case 'search_knowledge_base': {
      const query = args.query as string;
      const limit = (args.limit as number) || 5;
      const { knowledgeRetrieval } = await import('../knowledge-retrieval');
      const results = await knowledgeRetrieval.search(query, [], { maxResults: limit });
      const simplified = results.map(r => ({
        title: r.chunk.title,
        content: r.chunk.content?.substring(0, 500),
        score: r.score,
      }));
      return { success: true, data: simplified, actionTaken: `Searched knowledge base for "${query}" — found ${results.length} articles` };
    }

    case 'lookup_customer': {
      const customerId = (args.customer_id as string) || context.customerId;
      const email = args.email as string;
      let customer;
      if (email) {
        customer = await storage.getCustomerByEmail(email);
      } else if (customerId) {
        customer = await storage.getCustomer(customerId);
      }
      if (!customer) {
        return { success: false, error: 'Customer not found', actionTaken: 'Customer lookup returned no results' };
      }
      if (context.organizationId && customer.organizationId && customer.organizationId !== context.organizationId) {
        return { success: false, error: 'Access denied: customer belongs to a different organization', actionTaken: 'Customer lookup blocked by tenant isolation' };
      }
      const safe = { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, company: customer.company, status: customer.status };
      return { success: true, data: safe, actionTaken: `Retrieved customer profile for ${customer.name}` };
    }

    case 'get_conversation_history': {
      const convId = (args.conversation_id as string) || context.conversationId;
      if (convId !== context.conversationId && context.organizationId) {
        const conv = await storage.getConversation(convId);
        if (conv && conv.organizationId && conv.organizationId !== context.organizationId) {
          return { success: false, error: 'Access denied: conversation belongs to a different organization', actionTaken: 'Conversation history blocked by tenant isolation' };
        }
      }
      const limit = (args.limit as number) || 10;
      const messages = await storage.getMessagesByConversation(convId);
      const recent = messages.slice(-limit).map(m => ({
        sender: m.senderType,
        content: m.content?.substring(0, 300),
        timestamp: m.timestamp,
      }));
      return { success: true, data: recent, actionTaken: `Retrieved ${recent.length} recent messages from conversation` };
    }

    case 'create_ticket': {
      const customerId = context.customerId;
      if (!customerId) {
        return { success: false, error: 'No customer ID available to create ticket', actionTaken: 'Ticket creation failed: missing customer' };
      }
      const ticket = await storage.createTicket({
        title: args.title as string,
        description: args.description as string,
        priority: (args.priority as string) || 'medium',
        category: (args.category as string) || 'General',
        customerId,
        conversationId: context.conversationId,
        isAiGenerated: true,
        aiConfidenceScore: Math.round((args._confidence as number || 0.9) * 100),
        aiGeneratedTitle: args.title as string,
        aiGeneratedDescription: args.description as string,
      });
      return { success: true, data: { ticketId: ticket.id, title: ticket.title }, actionTaken: `Created ticket #${ticket.id}: "${ticket.title}"` };
    }

    case 'escalate_to_human': {
      const reason = args.reason as string;
      const priority = (args.priority as string) || 'high';
      await storage.updateConversation(context.conversationId, {
        aiAssistanceEnabled: false,
        priority,
      });
      const systemMessage = await storage.createMessage({
        conversationId: context.conversationId,
        senderId: 'system',
        senderType: 'system',
        content: `[AI Escalation] This conversation has been escalated to a human agent. Reason: ${reason}`,
        scope: 'internal',
      });
      return { success: true, data: { escalated: true, messageId: systemMessage.id }, actionTaken: `Escalated to human agent: ${reason}` };
    }

    case 'update_conversation_priority': {
      const priority = args.priority as string;
      await storage.updateConversation(context.conversationId, { priority });
      return { success: true, data: { newPriority: priority }, actionTaken: `Updated conversation priority to ${priority}` };
    }

    case 'update_conversation_status': {
      const status = args.status as string;
      await storage.updateConversationStatus(context.conversationId, status);
      return { success: true, data: { newStatus: status }, actionTaken: `Updated conversation status to ${status}` };
    }

    case 'get_customer_tickets': {
      const customerId = context.customerId;
      if (!customerId) {
        return { success: false, error: 'No customer ID available', actionTaken: 'Ticket lookup failed: missing customer' };
      }
      const allTickets = await storage.getTicketsByCustomer(customerId);
      let filtered = allTickets;
      const statusFilter = args.status_filter as string;
      if (statusFilter && statusFilter !== 'all') {
        filtered = filtered.filter(t => t.status === statusFilter);
      }
      const simplified = filtered.slice(0, 10).map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        category: t.category,
        createdAt: t.createdAt,
      }));
      return { success: true, data: simplified, actionTaken: `Found ${simplified.length} tickets for customer` };
    }

    case 'schedule_callback': {
      const followupDate = new Date(args.followup_date as string);
      const note = args.note as string;
      await db.update(conversations).set({ followupDate: followupDate, updatedAt: new Date() }).where(eq(conversations.id, context.conversationId));
      await storage.createMessage({
        conversationId: context.conversationId,
        senderId: 'system',
        senderType: 'system',
        content: `[AI Scheduled Follow-up] Follow-up scheduled for ${followupDate.toISOString()}. Note: ${note}`,
        scope: 'internal',
      });
      return { success: true, data: { scheduledFor: followupDate.toISOString() }, actionTaken: `Scheduled follow-up for ${followupDate.toLocaleDateString()}` };
    }

    case 'check_resolution_history': {
      const description = args.issue_description as string;
      const { knowledgeRetrieval } = await import('../knowledge-retrieval');
      const results = await knowledgeRetrieval.search(`resolution: ${description}`, [], { maxResults: 3 });
      const resolutions = results.map(r => ({
        title: r.chunk.title,
        summary: r.chunk.content?.substring(0, 300),
        relevance: r.score,
      }));
      return { success: true, data: resolutions, actionTaken: `Found ${resolutions.length} similar past resolutions` };
    }

    default:
      return { success: false, error: `Unknown tool: ${toolName}`, actionTaken: `Tool "${toolName}" is not recognized` };
  }
}

export function convertAiToolToOpenAIFormat(tool: AiTool, assignment?: AiAgentTool): ChatCompletionTool {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: assignment?.customInstructions
        ? `${tool.description || ''} | Agent-specific: ${assignment.customInstructions}`
        : (tool.description || tool.displayName),
      parameters: (tool.parametersSchema as Record<string, unknown>) || {
        type: 'object',
        properties: {},
      },
    },
  };
}

export async function getAgentToolsAsOpenAI(agentId: string): Promise<{ tools: ChatCompletionTool[]; toolMap: Map<string, { tool: AiTool; assignment: AiAgentTool }> }> {
  const assignments = await storage.getAgentToolsWithDetails(agentId);
  const toolMap = new Map<string, { tool: AiTool; assignment: AiAgentTool }>();

  if (assignments.length === 0) {
    return { tools: AGENT_TOOLS, toolMap };
  }

  const tools: ChatCompletionTool[] = [];
  for (const a of assignments) {
    if (!a.isEnabled) continue;
    tools.push(convertAiToolToOpenAIFormat(a.tool, a));
    toolMap.set(a.tool.name, { tool: a.tool, assignment: a });
  }

  return { tools, toolMap };
}

export async function executeExternalTool(
  tool: AiTool,
  args: Record<string, unknown>,
  context: ToolExecutionContext
): Promise<ToolExecutionResult> {
  if (!tool.endpointUrl) {
    return { success: false, error: 'No endpoint URL configured', actionTaken: `External tool "${tool.name}" has no endpoint` };
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(tool.headers as Record<string, string> || {}),
    };

    if (tool.authType === 'bearer' && tool.authConfig) {
      const config = tool.authConfig as Record<string, string>;
      if (config.token) headers['Authorization'] = `Bearer ${config.token}`;
    } else if (tool.authType === 'api_key' && tool.authConfig) {
      const config = tool.authConfig as Record<string, string>;
      if (config.headerName && config.apiKey) {
        headers[config.headerName] = config.apiKey;
      }
    }

    let body: string | undefined;
    if (tool.requestTemplate) {
      const template = tool.requestTemplate as Record<string, unknown>;
      const merged = { ...template, ...args };
      body = JSON.stringify(merged);
    } else {
      body = JSON.stringify(args);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), tool.timeoutMs || 30000);

    const response = await fetch(tool.endpointUrl, {
      method: tool.httpMethod || 'POST',
      headers,
      body: tool.httpMethod === 'GET' ? undefined : body,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        actionTaken: `External tool "${tool.name}" returned error ${response.status}`,
      };
    }

    let data: unknown;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (tool.responseMapping) {
      const mapping = tool.responseMapping as Record<string, string>;
      if (mapping.resultField && typeof data === 'object' && data !== null) {
        data = (data as Record<string, unknown>)[mapping.resultField];
      }
    }

    return {
      success: true,
      data,
      actionTaken: `External tool "${tool.displayName}" executed successfully`,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: msg,
      actionTaken: `External tool "${tool.name}" failed: ${msg}`,
    };
  }
}

export async function executeToolWithAgentConfig(
  toolName: string,
  args: Record<string, unknown>,
  context: ToolExecutionContext,
  confidence: number = 1.0,
  toolMap?: Map<string, { tool: AiTool; assignment: AiAgentTool }>
): Promise<ToolExecutionResult> {
  const toolConfig = toolMap?.get(toolName);

  if (toolConfig) {
    const { tool, assignment } = toolConfig;

    const needsApproval = assignment.requiresApprovalOverride !== null
      ? assignment.requiresApprovalOverride
      : tool.requiresApproval;

    if (needsApproval && confidence < CONFIDENCE_THRESHOLD) {
      const result: ToolExecutionResult = {
        success: false,
        requiresApproval: true,
        actionTaken: `Action "${toolName}" requires human approval (confidence ${(confidence * 100).toFixed(0)}% below threshold)`,
      };
      logAction({ toolName, input: args, output: result, conversationId: context.conversationId, agentId: context.agentId, organizationId: context.organizationId, executedAt: new Date(), confidenceScore: confidence });
      return result;
    }

    if (tool.toolType === 'external_api' || tool.toolType === 'webhook') {
      const result = await executeExternalTool(tool, args, context);
      logAction({ toolName, input: args, output: result, conversationId: context.conversationId, agentId: context.agentId, organizationId: context.organizationId, executedAt: new Date(), confidenceScore: confidence });
      return result;
    }
  }

  return executeTool(toolName, args, context, confidence);
}

export interface GuardrailCheckResult {
  allowed: boolean;
  reason?: string;
  action?: 'block' | 'escalate' | 'warn' | 'redirect';
  targetAgentId?: string;
  warning?: string;
}

export async function checkGuardrails(
  agentId: string,
  toolName: string | null,
  message: string,
  tokenCount?: number
): Promise<GuardrailCheckResult> {
  const guardrails = await storage.getGuardrailsByAgent(agentId);
  if (guardrails.length === 0) return { allowed: true };

  for (const guardrail of guardrails) {
    const config = guardrail.config as Record<string, unknown>;

    switch (guardrail.guardrailType) {
      case 'action_blocklist': {
        const blockedTools = (config.blockedTools as string[]) || [];
        if (toolName && blockedTools.includes(toolName)) {
          return { allowed: false, reason: `Tool "${toolName}" is blocked by guardrail "${guardrail.name}"`, action: 'block' };
        }
        break;
      }

      case 'action_allowlist': {
        const allowedTools = (config.allowedTools as string[]) || [];
        if (toolName && allowedTools.length > 0 && !allowedTools.includes(toolName)) {
          return { allowed: false, reason: `Tool "${toolName}" is not in the allowed list`, action: 'block' };
        }
        break;
      }

      case 'content_filter': {
        const blockedPatterns = (config.blockedPatterns as string[]) || [];
        const blockedTopics = (config.blockedTopics as string[]) || [];
        const filterAction = (config.action as string) || 'block';
        const lowerMsg = message.toLowerCase();
        let matched = false;
        let matchReason = '';
        for (const pattern of blockedPatterns) {
          try {
            if (new RegExp(pattern, 'i').test(message)) {
              matched = true;
              matchReason = 'Message matches blocked pattern';
              break;
            }
          } catch {}
        }
        if (!matched) {
          for (const topic of blockedTopics) {
            if (lowerMsg.includes(topic.toLowerCase())) {
              matched = true;
              matchReason = `Message contains blocked topic: ${topic}`;
              break;
            }
          }
        }
        if (matched) {
          if (filterAction === 'warn') {
            return { allowed: true, warning: matchReason, action: 'warn' };
          }
          return { allowed: false, reason: matchReason, action: filterAction as any };
        }
        break;
      }

      case 'token_limit': {
        const maxTotal = config.maxTotalPerConversation as number;
        if (maxTotal && tokenCount && tokenCount > maxTotal) {
          return { allowed: false, reason: `Token limit exceeded (${tokenCount}/${maxTotal})`, action: 'escalate' };
        }
        break;
      }

      case 'topic_restriction': {
        const blockedTopics = (config.blockedTopics as string[]) || [];
        const restrictAction = (config.action as string) || 'redirect';
        const lMsg = message.toLowerCase();
        for (const topic of blockedTopics) {
          if (lMsg.includes(topic.toLowerCase())) {
            if (restrictAction === 'redirect') {
              const targetId = config.targetAgentId as string | undefined;
              return { allowed: false, reason: `Topic "${topic}" is restricted for this agent`, action: 'redirect', targetAgentId: targetId };
            }
            if (restrictAction === 'warn') {
              return { allowed: true, warning: `Topic "${topic}" is restricted`, action: 'warn' };
            }
            return { allowed: false, reason: `Topic "${topic}" is restricted for this agent`, action: 'block' };
          }
        }
        break;
      }

      case 'escalation_rule': {
        const conditions = (config.conditions as Record<string, unknown>[]) || [];
        const escalateTo = config.escalateTo as string;
        const targetAgentId = config.targetAgentId as string | undefined;
        for (const cond of conditions) {
          if (cond.type === 'keyword') {
            const keywords = (cond.keywords as string[]) || [];
            const lMsg = message.toLowerCase();
            if (keywords.some(k => lMsg.includes(k.toLowerCase()))) {
              return {
                allowed: false,
                reason: `Escalation triggered by keyword match`,
                action: 'escalate',
                targetAgentId: escalateTo === 'agent' ? targetAgentId : undefined,
              };
            }
          }
        }
        break;
      }
    }
  }

  return { allowed: true };
}

export async function evaluateChainRouting(
  sourceAgentId: string,
  intent: string,
  message: string
): Promise<{ shouldRoute: boolean; targetAgentId?: string; delegationMode?: string; contextPassthrough?: Record<string, unknown> }> {
  const chains = await storage.getChainsBySourceAgent(sourceAgentId);
  if (chains.length === 0) return { shouldRoute: false };

  for (const chain of chains) {
    const conditions = chain.routingConditions as Record<string, unknown>;

    switch (chain.routingType) {
      case 'always':
        return {
          shouldRoute: true,
          targetAgentId: chain.targetAgentId,
          delegationMode: chain.delegationMode,
          contextPassthrough: chain.contextPassthrough as Record<string, unknown> | undefined,
        };

      case 'intent': {
        const intents = (conditions.intents as string[]) || [];
        const minConfidence = (conditions.minConfidence as number) || 0;
        if (intents.some(i => i.toLowerCase() === intent.toLowerCase())) {
          return {
            shouldRoute: true,
            targetAgentId: chain.targetAgentId,
            delegationMode: chain.delegationMode,
            contextPassthrough: chain.contextPassthrough as Record<string, unknown> | undefined,
          };
        }
        break;
      }

      case 'keyword': {
        const keywords = (conditions.keywords as string[]) || [];
        const matchMode = (conditions.matchMode as string) || 'any';
        const lMsg = message.toLowerCase();
        const matches = keywords.filter(k => lMsg.includes(k.toLowerCase()));
        if (matchMode === 'all' ? matches.length === keywords.length : matches.length > 0) {
          return {
            shouldRoute: true,
            targetAgentId: chain.targetAgentId,
            delegationMode: chain.delegationMode,
            contextPassthrough: chain.contextPassthrough as Record<string, unknown> | undefined,
          };
        }
        break;
      }

      case 'condition': {
        const field = conditions.field as string;
        const operator = conditions.operator as string;
        const value = conditions.value as string;
        if (field === 'message_length' && operator === 'gt') {
          if (message.length > Number(value)) {
            return {
              shouldRoute: true,
              targetAgentId: chain.targetAgentId,
              delegationMode: chain.delegationMode,
              contextPassthrough: chain.contextPassthrough as Record<string, unknown> | undefined,
            };
          }
        }
        break;
      }

      case 'fallback':
        break;
    }
  }

  return { shouldRoute: false };
}
