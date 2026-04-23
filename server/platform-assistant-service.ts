import { chatCompletion } from './shre-gateway';
import { db } from './db';
import { eq, desc, and, ilike, count, sql, or, ne } from 'drizzle-orm';
import {
  platformAssistantConversations,
  platformAssistantMessages,
  onboardingProgress,
  knowledgeBase,
  workspaces,
  conversations,
  customers,
  users,
  aiAgents,
  savedReplies,
  slaPolicies,
  type PlatformAssistantMessage,
  type PlatformAssistantConversation
} from '@shared/schema';
import {
  PLATFORM_PAGES,
  PLATFORM_ACTIONS,
  ONBOARDING_CHECKLIST,
  searchPages,
  searchActions,
  type PageInfo,
  type ActionInfo
} from '@shared/platform-documentation';
import { storage } from './storage';

export interface AssistantResponse {
  content: string;
  steps?: string[];
  actionType?: 'navigate' | 'configure' | 'explain' | 'action_executed' | null;
  actionPayload?: {
    path?: string;
    label?: string;
    description?: string;
    prefillData?: Record<string, any>;
    actionId?: string;
    parameters?: Record<string, any>;
  };
  executedAction?: {
    success: boolean;
    message: string;
    data?: any;
  };
  relatedPages?: Array<{ path: string; label: string; description?: string }>;
  suggestedQuestions?: string[];
}

interface ConversationContext {
  userId: string;
  userRole: 'admin' | 'agent' | 'customer';
  currentPath?: string;
  organizationId?: string;
  workspaceId?: string;
}

// --- Tool definitions for OpenAI function calling ---

const ASSISTANT_TOOLS: any[] = [
  {
    type: 'function',
    function: {
      name: 'fetch_platform_stats',
      description: 'Get real-time statistics from the platform database. Use this when the user asks about current numbers, counts, or status of anything on the platform.',
      parameters: {
        type: 'object',
        properties: {
          metrics: {
            type: 'array',
            items: {
              type: 'string',
              enum: [
                'open_conversations',
                'total_customers',
                'total_agents',
                'ai_agents_count',
                'knowledge_articles',
                'saved_replies_count',
                'pending_conversations',
                'resolved_today',
                'sla_policies_count',
                'active_workspaces'
              ]
            },
            description: 'Which metrics to fetch'
          }
        },
        required: ['metrics']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_platform_resources',
      description: 'List resources from the platform such as AI agents, saved replies, SLA policies, or workspaces. Use this when the user wants to see what exists.',
      parameters: {
        type: 'object',
        properties: {
          resource: {
            type: 'string',
            enum: ['ai_agents', 'saved_replies', 'sla_policies', 'workspaces', 'recent_conversations', 'team_members']
          },
          limit: { type: 'number', description: 'Max items to return (default 5)' }
        },
        required: ['resource']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'execute_platform_task',
      description: 'Execute a task on the platform such as creating a workspace, saved reply, SLA policy, or support category. Only use when the user explicitly requests creation.',
      parameters: {
        type: 'object',
        properties: {
          task: {
            type: 'string',
            enum: [
              'create_workspace',
              'create_support_category',
              'create_saved_reply',
              'create_sla_policy'
            ]
          },
          parameters: {
            type: 'object',
            description: 'Task-specific parameters. For create_workspace: {name, description}. For create_support_category: {name, description, icon, color}. For create_saved_reply: {title, content, category}. For create_sla_policy: {name, priority, firstResponseMinutes, resolutionMinutes}.'
          }
        },
        required: ['task', 'parameters']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_platform_help',
      description: 'Search platform documentation, page descriptions, and knowledge base for help articles. Use this to find step-by-step guides for any feature.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'What to search for' },
          include_knowledge_base: { type: 'boolean', description: 'Also search the org knowledge base' }
        },
        required: ['query']
      }
    }
  }
];

export class PlatformAssistantService {

  // --- Tool implementations ---

  private async toolFetchPlatformStats(metrics: string[], context: ConversationContext): Promise<Record<string, any>> {
    const result: Record<string, any> = {};

    for (const metric of metrics) {
      try {
        switch (metric) {
          case 'open_conversations': {
            const [row] = await db.select({ count: count() }).from(conversations)
              .where(and(
                ne(conversations.status, 'resolved'),
                ne(conversations.status, 'closed')
              ));
            result.open_conversations = row?.count ?? 0;
            break;
          }
          case 'pending_conversations': {
            const [row] = await db.select({ count: count() }).from(conversations)
              .where(eq(conversations.status, 'pending'));
            result.pending_conversations = row?.count ?? 0;
            break;
          }
          case 'resolved_today': {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const [row] = await db.select({ count: count() }).from(conversations)
              .where(and(
                eq(conversations.status, 'resolved'),
                sql`${conversations.updatedAt} >= ${today}`
              ));
            result.resolved_today = row?.count ?? 0;
            break;
          }
          case 'total_customers': {
            const [row] = await db.select({ count: count() }).from(customers);
            result.total_customers = row?.count ?? 0;
            break;
          }
          case 'total_agents': {
            const [row] = await db.select({ count: count() }).from(users)
              .where(or(eq(users.role, 'agent'), eq(users.role, 'admin')));
            result.total_agents = row?.count ?? 0;
            break;
          }
          case 'ai_agents_count': {
            const [row] = await db.select({ count: count() }).from(aiAgents)
              .where(eq(aiAgents.isActive, true));
            result.ai_agents_count = row?.count ?? 0;
            break;
          }
          case 'knowledge_articles': {
            const [row] = await db.select({ count: count() }).from(knowledgeBase)
              .where(eq(knowledgeBase.isActive, true));
            result.knowledge_articles = row?.count ?? 0;
            break;
          }
          case 'saved_replies_count': {
            try {
              const [row] = await db.select({ count: count() }).from(savedReplies);
              result.saved_replies_count = row?.count ?? 0;
            } catch { result.saved_replies_count = 'N/A'; }
            break;
          }
          case 'sla_policies_count': {
            try {
              const [row] = await db.select({ count: count() }).from(slaPolicies)
                .where(eq(slaPolicies.isActive, true));
              result.sla_policies_count = row?.count ?? 0;
            } catch { result.sla_policies_count = 'N/A'; }
            break;
          }
          case 'active_workspaces': {
            const [row] = await db.select({ count: count() }).from(workspaces);
            result.active_workspaces = row?.count ?? 0;
            break;
          }
        }
      } catch (err) {
        result[metric] = 'unavailable';
      }
    }

    return result;
  }

  private async toolListPlatformResources(resource: string, limit: number = 5, context: ConversationContext): Promise<any[]> {
    try {
      switch (resource) {
        case 'ai_agents': {
          const rows = await db.select({
            id: aiAgents.id,
            name: aiAgents.name,
            description: aiAgents.description,
            isActive: aiAgents.isActive,
          }).from(aiAgents).where(eq(aiAgents.isActive, true)).limit(limit);
          return rows;
        }
        case 'saved_replies': {
          try {
            const rows = await db.select({
              id: savedReplies.id,
              title: savedReplies.title,
              category: savedReplies.category,
              usageCount: savedReplies.usageCount,
            }).from(savedReplies).limit(limit);
            return rows;
          } catch { return []; }
        }
        case 'sla_policies': {
          try {
            const rows = await db.select({
              id: slaPolicies.id,
              name: slaPolicies.name,
              priority: slaPolicies.priority,
              firstResponseMinutes: slaPolicies.firstResponseMinutes,
              resolutionMinutes: slaPolicies.resolutionMinutes,
              isActive: slaPolicies.isActive,
            }).from(slaPolicies).limit(limit);
            return rows;
          } catch { return []; }
        }
        case 'workspaces': {
          const rows = await db.select({
            id: workspaces.id,
            name: workspaces.name,
            description: workspaces.description,
          }).from(workspaces).limit(limit);
          return rows;
        }
        case 'recent_conversations': {
          const rows = await db.select({
            id: conversations.id,
            title: conversations.title,
            status: conversations.status,
            priority: conversations.priority,
            createdAt: conversations.createdAt,
          }).from(conversations)
            .orderBy(desc(conversations.createdAt))
            .limit(limit);
          return rows;
        }
        case 'team_members': {
          const rows = await db.select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            status: users.status,
          }).from(users)
            .where(or(eq(users.role, 'agent'), eq(users.role, 'admin')))
            .limit(limit);
          return rows;
        }
        default:
          return [];
      }
    } catch (err) {
      console.error(`Failed to list resource ${resource}:`, err);
      return [];
    }
  }

  private async toolExecutePlatformTask(
    task: string,
    parameters: Record<string, any>,
    context: ConversationContext
  ): Promise<{ success: boolean; message: string; data?: any; redirectPath?: string }> {

    if (context.userRole !== 'admin' && ['create_workspace', 'create_support_category', 'create_sla_policy'].includes(task)) {
      return { success: false, message: 'This action requires admin permissions.' };
    }

    try {
      switch (task) {
        case 'create_workspace': {
          if (!parameters.name) return { success: false, message: 'Workspace name is required.' };
          if (!context.organizationId) return { success: false, message: 'Organization context is required.' };
          const slug = parameters.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          const workspace = await storage.createWorkspace({
            name: parameters.name,
            description: parameters.description || `Workspace for ${parameters.name}`,
            slug,
            organizationId: context.organizationId,
          });
          return {
            success: true,
            message: `Workspace "${workspace.name}" created successfully!`,
            data: workspace,
            redirectPath: '/workspaces'
          };
        }

        case 'create_support_category': {
          if (!parameters.name) return { success: false, message: 'Category name is required.' };
          const slug = parameters.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          const category = await storage.createSupportCategory({
            name: parameters.name,
            slug,
            description: parameters.description || '',
            icon: parameters.icon || 'HelpCircle',
            color: parameters.color || '#6366f1',
            isActive: true,
          });
          return {
            success: true,
            message: `Support category "${category.name}" created!`,
            data: category,
            redirectPath: '/support-categories'
          };
        }

        case 'create_saved_reply': {
          if (!parameters.title || !parameters.content) {
            return { success: false, message: 'Title and content are required for a saved reply.' };
          }
          const [reply] = await db.insert(savedReplies).values({
            title: parameters.title,
            content: parameters.content,
            category: parameters.category || 'General',
            organizationId: context.organizationId || '',
            createdById: context.userId,
            isShared: true,
          }).returning();
          return {
            success: true,
            message: `Saved reply "${reply.title}" created!`,
            data: reply,
            redirectPath: '/saved-replies'
          };
        }

        case 'create_sla_policy': {
          if (!parameters.name || !parameters.priority) {
            return { success: false, message: 'Policy name and priority are required.' };
          }
          const [policy] = await db.insert(slaPolicies).values({
            name: parameters.name,
            priority: parameters.priority,
            firstResponseMinutes: parameters.firstResponseMinutes || 60,
            resolutionMinutes: parameters.resolutionMinutes || 480,
            organizationId: context.organizationId || '',
            businessHoursOnly: parameters.businessHoursOnly || false,
            isActive: true,
          }).returning();
          return {
            success: true,
            message: `SLA policy "${policy.name}" created for ${policy.priority} priority conversations!`,
            data: policy,
            redirectPath: '/sla-management'
          };
        }

        default:
          return { success: false, message: `Unknown task: ${task}` };
      }
    } catch (error: any) {
      console.error(`Task execution failed for ${task}:`, error);
      return { success: false, message: error.message || 'Task failed. Please try again.' };
    }
  }

  private async toolSearchPlatformHelp(query: string, includeKnowledgeBase: boolean = false): Promise<{
    pages: PageInfo[];
    actions: ActionInfo[];
    knowledgeArticles: Array<{ id: string; title: string; category: string }>;
  }> {
    const pages = searchPages(query).slice(0, 5);
    const actions = searchActions(query).slice(0, 3);
    let knowledgeArticles: Array<{ id: string; title: string; category: string }> = [];

    if (includeKnowledgeBase) {
      try {
        const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        if (keywords.length > 0) {
          knowledgeArticles = await db.select({
            id: knowledgeBase.id,
            title: knowledgeBase.title,
            category: knowledgeBase.category,
          }).from(knowledgeBase)
            .where(and(
              eq(knowledgeBase.isActive, true),
              ilike(knowledgeBase.title, `%${keywords[0]}%`)
            ))
            .limit(3);
        }
      } catch { }
    }

    return { pages, actions, knowledgeArticles };
  }

  // --- System prompt ---

  private buildSystemPrompt(context: ConversationContext): string {
    const roleLabel = context.userRole === 'admin' ? 'Administrator' : 'Agent';
    const roleCapabilities = context.userRole === 'admin'
      ? 'full access: user management, settings, AI configuration, billing, all analytics, organization management'
      : 'conversations, customers, knowledge base, saved replies, analytics (limited)';

    const allPages = PLATFORM_PAGES
      .filter(p => !p.requiredRole || p.requiredRole === context.userRole || context.userRole === 'admin')
      .map(p => `• **${p.name}** → \`${p.path}\` — ${p.description.split('.')[0]}`)
      .join('\n');

    return `You are Nova, the intelligent Platform Assistant for Nova AI — a B2B customer support platform.

## Your Role
You help ${roleLabel}s navigate the platform, understand features, execute tasks, and follow step-by-step guides. You have tools to:
- Fetch live platform stats (conversation counts, customer numbers, AI agent status, etc.)
- List existing resources (saved replies, AI agents, SLA policies, workspaces, team members)
- Execute tasks directly (create workspaces, saved replies, SLA policies, support categories)
- Search platform documentation for setup guides

## User Context
- **Role**: ${roleLabel} (${roleCapabilities})
- **Current page**: ${context.currentPath || 'dashboard'}
- **Organization ID**: ${context.organizationId || 'default'}

## Platform Pages Available
${allPages}

## Key Features to Guide Users On
- **Conversations**: Real-time chat with customers. Assign, prioritize, tag, merge, resolve.
- **AI Agents**: Configure GPT-powered agents. Set personality, confidence thresholds, knowledge links.
- **Knowledge Base**: Articles power AI responses. Upload PDFs/DOCX for auto-processing.
- **Saved Replies**: Canned responses for common questions. Use {{customerName}} for variables.
- **SLA Management**: Set first-response + resolution deadlines per priority level.
- **CSAT Surveys**: Auto-sent when conversations are resolved. Track scores in Analytics.
- **Conversation Tags**: Freeform labels. Filter conversations by tags.
- **Agent Status**: Set Available/Away/Busy/Offline from the sidebar avatar.
- **Audit Log**: View all admin actions with timestamp, user, and change details.
- **2FA Security**: Enable TOTP two-factor authentication at Settings > Security.
- **Chat Widget**: Embed on any website via API Integration page. Copy the script tag.
- **External Channels**: Connect WhatsApp Business API, Telegram Bot, Facebook Messenger.
- **Email Integration**: Set up IMAP/SMTP for email-to-ticket conversion.

## Response Format (ALWAYS use this JSON structure)
\`\`\`json
{
  "content": "Your main response. Use **bold**, numbered lists (1. 2. 3.), and [link text](/path) for internal navigation. Keep it clear and actionable.",
  "steps": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
  "actionType": "navigate" | "configure" | "explain" | "action_executed" | null,
  "actionPayload": {
    "path": "/path-to-navigate",
    "label": "Human-readable button label",
    "description": "One line description of where this goes"
  },
  "relatedPages": [
    { "path": "/path", "label": "Page Name", "description": "Why visit this page" }
  ],
  "suggestedQuestions": ["Follow-up question 1?", "Follow-up question 2?"]
}
\`\`\`

## Guidelines
- **Always use tools first** when the user asks about live data (numbers, lists of existing items)
- **Be specific**: mention exact page names, button labels, and field names
- **Provide steps** when explaining how to do something (3-7 numbered steps)
- **Link everything**: include relatedPages for context
- **Execute when asked**: if the user says "create a workspace called X", use execute_platform_task
- **Confirm before executing** destructive/significant actions by asking for parameters if missing
- **Role-aware**: Don't suggest admin-only features to agents
- For navigation responses, always set actionPayload.path to the most relevant page`;
  }

  // --- Agentic tool call loop ---

  private async runAgentLoop(
    systemPrompt: string,
    userPrompt: string,
    context: ConversationContext,
    maxIterations: number = 3
  ): Promise<AssistantResponse> {
    const messages: Array<{ role: string; content: string; tool_calls?: any[]; tool_call_id?: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    let executedActionResult: { success: boolean; message: string; data?: any; redirectPath?: string } | null = null;
    let iterations = 0;

    while (iterations < maxIterations) {
      iterations++;

      const completion = await chatCompletion({
        messages: messages as any,
        tools: ASSISTANT_TOOLS,
        tool_choice: 'auto',
        temperature: 0.4,
        max_tokens: 1500,
        response_format: { type: 'json_object' }
      });

      const rawChoice = (completion as any)._raw?.choices?.[0];
      const hasToolCalls = completion.tool_calls && completion.tool_calls.length > 0;

      if (hasToolCalls && rawChoice) {
        messages.push(rawChoice.message);

        for (const toolCall of completion.tool_calls!) {
          const toolName = toolCall.function.name;
          let toolArgs: any;
          try {
            toolArgs = JSON.parse(toolCall.function.arguments);
          } catch {
            toolArgs = {};
          }

          let toolResult: any;

          try {
            if (toolName === 'fetch_platform_stats') {
              toolResult = await this.toolFetchPlatformStats(toolArgs.metrics || [], context);
            } else if (toolName === 'list_platform_resources') {
              toolResult = await this.toolListPlatformResources(toolArgs.resource, toolArgs.limit || 5, context);
            } else if (toolName === 'execute_platform_task') {
              executedActionResult = await this.toolExecutePlatformTask(toolArgs.task, toolArgs.parameters || {}, context);
              toolResult = executedActionResult;
            } else if (toolName === 'search_platform_help') {
              toolResult = await this.toolSearchPlatformHelp(toolArgs.query, toolArgs.include_knowledge_base);
            } else {
              toolResult = { error: 'Unknown tool' };
            }
          } catch (err: any) {
            toolResult = { error: err.message || 'Tool execution failed' };
          }

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult)
          });
        }

        continue;
      }

      const responseText = completion.content || '{}';
      let parsed: AssistantResponse;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        parsed = { content: responseText };
      }

      if (executedActionResult) {
        parsed.actionType = 'action_executed';
        parsed.executedAction = {
          success: executedActionResult.success,
          message: executedActionResult.message,
          data: executedActionResult.data
        };
        if (executedActionResult.redirectPath && !parsed.actionPayload?.path) {
          parsed.actionPayload = {
            path: executedActionResult.redirectPath,
            label: `Go to ${executedActionResult.redirectPath}`,
            description: 'View the result of the action'
          };
        }
      }

      return parsed;
    }

    return {
      content: "I've gathered the information and processed your request. If you need more help, feel free to ask!",
      suggestedQuestions: ['What else can I help with?', 'How do I navigate to a specific page?']
    };
  }

  // --- Main chat entry point ---

  async chat(
    message: string,
    context: ConversationContext,
    conversationId?: string
  ): Promise<{ response: AssistantResponse; conversationId: string }> {
    let convId = conversationId;
    let conversationHistory: PlatformAssistantMessage[] = [];

    if (!convId) {
      const [newConv] = await db.insert(platformAssistantConversations)
        .values({
          userId: context.userId,
          title: message.slice(0, 60) + (message.length > 60 ? '...' : ''),
        })
        .returning();
      convId = newConv.id;
    } else {
      conversationHistory = await db.select()
        .from(platformAssistantMessages)
        .where(eq(platformAssistantMessages.conversationId, convId))
        .orderBy(platformAssistantMessages.createdAt);
    }

    await db.insert(platformAssistantMessages).values({
      conversationId: convId,
      role: 'user',
      content: message,
    });

    const systemPrompt = this.buildSystemPrompt(context);

    const historyText = conversationHistory.slice(-8).map(m =>
      `${m.role === 'user' ? 'User' : 'Nova'}: ${m.content}`
    ).join('\n\n');

    const userPrompt = `${historyText ? `## Previous conversation:\n${historyText}\n\n---\n\n` : ''}## Current message:\n${message}

Respond with valid JSON matching the specified format. Use your tools to fetch live data or execute tasks as needed before responding.`;

    try {
      const response = await this.runAgentLoop(systemPrompt, userPrompt, context);

      await db.insert(platformAssistantMessages).values({
        conversationId: convId,
        role: 'assistant',
        content: response.content,
        actionType: response.actionType as any,
        actionPayload: response.actionPayload as any,
        relatedPages: Array.isArray(response.relatedPages)
          ? response.relatedPages.map(r => (typeof r === 'string' ? r : r.path))
          : response.relatedPages,
      });

      return { response, conversationId: convId };
    } catch (error) {
      console.error('Platform Assistant error:', error);
      const fallbackResponse: AssistantResponse = {
        content: 'I encountered an issue processing your request. Please try again, or use the sidebar to navigate manually.',
        relatedPages: [{ path: '/dashboard', label: 'Dashboard', description: 'Return to main view' }],
        suggestedQuestions: [
          'How do I view conversations?',
          'How do I configure AI agents?',
          'How do I add a team member?'
        ]
      };

      await db.insert(platformAssistantMessages).values({
        conversationId: convId,
        role: 'assistant',
        content: fallbackResponse.content,
      });

      return { response: fallbackResponse, conversationId: convId };
    }
  }

  async getConversations(userId: string): Promise<PlatformAssistantConversation[]> {
    return db.select()
      .from(platformAssistantConversations)
      .where(eq(platformAssistantConversations.userId, userId))
      .orderBy(desc(platformAssistantConversations.updatedAt));
  }

  async getConversationMessages(conversationId: string): Promise<PlatformAssistantMessage[]> {
    return db.select()
      .from(platformAssistantMessages)
      .where(eq(platformAssistantMessages.conversationId, conversationId))
      .orderBy(platformAssistantMessages.createdAt);
  }

  async getOnboardingProgress(userId: string): Promise<{
    completed: string[];
    pending: typeof ONBOARDING_CHECKLIST;
    percentComplete: number;
  }> {
    const progress = await db.select()
      .from(onboardingProgress)
      .where(and(
        eq(onboardingProgress.userId, userId),
        eq(onboardingProgress.completed, true)
      ));

    const completedIds = progress.map(p => p.checklistItemId);
    const pending = ONBOARDING_CHECKLIST.filter(item => !completedIds.includes(item.id));
    const percentComplete = Math.round((completedIds.length / ONBOARDING_CHECKLIST.length) * 100);

    return { completed: completedIds, pending, percentComplete };
  }

  getSuggestedQuestions(userRole: 'admin' | 'agent' | 'customer'): string[] {
    const agentQuestions = [
      'How do I view and respond to conversations?',
      'How do I use saved replies in a chat?',
      'Where can I find customer history?',
      'How does the AI respond to customers?',
    ];

    if (userRole === 'admin') {
      return [
        ...agentQuestions,
        'How do I configure an AI agent?',
        'How do I set up SLA policies?',
        'How do I add a new team member?',
        'How do I enable 2FA for my account?',
        'How do I connect WhatsApp?',
      ];
    }

    return agentQuestions;
  }

  getQuickActions(userRole: 'admin' | 'agent' | 'customer'): Array<{
    id: string;
    label: string;
    path: string;
    icon: string;
  }> {
    const base = [
      { id: 'conversations', label: 'View Conversations', path: '/conversations', icon: 'MessageSquare' },
      { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: 'BarChart3' },
      { id: 'knowledge', label: 'Knowledge Base', path: '/knowledge', icon: 'BookOpen' },
      { id: 'saved-replies', label: 'Saved Replies', path: '/saved-replies', icon: 'FileText' },
    ];

    if (userRole === 'admin') {
      return [
        ...base,
        { id: 'ai-config', label: 'Configure AI', path: '/ai-configuration', icon: 'Bot' },
        { id: 'sla', label: 'SLA Management', path: '/sla-management', icon: 'Clock' },
        { id: 'users', label: 'Team Members', path: '/user-management', icon: 'Users' },
        { id: 'security', label: 'Security Settings', path: '/settings/security', icon: 'Shield' },
      ];
    }

    return base;
  }
}

export const platformAssistantService = new PlatformAssistantService();
