import { storage } from '../storage';
import { db } from '../db';
import { conversations, auditLog } from '@shared/schema';
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
