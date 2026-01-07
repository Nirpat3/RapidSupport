import OpenAI from 'openai';
import { db } from './db';
import { eq, desc, and, ilike, or } from 'drizzle-orm';
import { 
  platformAssistantConversations, 
  platformAssistantMessages,
  onboardingProgress,
  knowledgeBase,
  workspaces,
  type PlatformAssistantMessage,
  type PlatformAssistantConversation
} from '@shared/schema';
import { 
  PLATFORM_PAGES, 
  PLATFORM_ACTIONS, 
  ONBOARDING_CHECKLIST,
  searchPages,
  searchActions,
  getPageByPath,
  type PageInfo,
  type ActionInfo
} from '@shared/platform-documentation';
import { storage } from './storage';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface AssistantResponse {
  content: string;
  actionType?: 'navigate' | 'configure' | 'explain' | 'action';
  actionPayload?: {
    path?: string;
    prefillData?: Record<string, any>;
    actionId?: string;
    parameters?: Record<string, any>;
  };
  relatedPages?: string[];
  suggestedQuestions?: string[];
}

interface ConversationContext {
  userId: string;
  userRole: 'admin' | 'agent' | 'customer';
  currentPath?: string;
  organizationId?: string;
  workspaceId?: string;
}

export class PlatformAssistantService {
  private async searchKnowledgeBase(query: string): Promise<Array<{ id: string; title: string; category: string; summary: string }>> {
    try {
      const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      if (keywords.length === 0) return [];

      const primaryKeyword = keywords[0];
      const titleMatch = ilike(knowledgeBase.title, `%${primaryKeyword}%`);

      const results = await db.select({
        id: knowledgeBase.id,
        title: knowledgeBase.title,
        category: knowledgeBase.category,
      })
        .from(knowledgeBase)
        .where(and(
          eq(knowledgeBase.isActive, true),
          titleMatch
        ))
        .limit(3);

      return results.map(r => ({
        id: r.id,
        title: r.title,
        category: r.category,
        summary: `Knowledge base article about ${r.category}`
      }));
    } catch (error) {
      console.error('Knowledge base search error:', error);
      return [];
    }
  }

  private buildSystemPrompt(context: ConversationContext): string {
    const rolePermissions = context.userRole === 'admin' 
      ? 'full access to all features including user management, settings, and configuration'
      : 'access to conversations, customers, knowledge base, and analytics';

    const availablePages = PLATFORM_PAGES
      .filter(p => !p.requiredRole || p.requiredRole === context.userRole || context.userRole === 'admin')
      .map(p => `- ${p.name} (${p.path}): ${p.description}`)
      .join('\n');

    const availableActions = PLATFORM_ACTIONS
      .filter(a => !a.requiredRole || a.requiredRole === context.userRole || context.userRole === 'admin')
      .map(a => `- ${a.name}: ${a.description}`)
      .join('\n');

    return `You are the Support Board Platform Assistant, an AI helper that guides users through the platform.

## Your Role
- Help users navigate the platform and find features
- Answer questions about how to use Support Board
- Provide direct links to relevant pages
- Help configure settings and create resources
- Guide through onboarding steps

## User Context
- Role: ${context.userRole} (${rolePermissions})
- Current page: ${context.currentPath || 'unknown'}

## Available Pages
${availablePages}

## Available Actions You Can Help With
${availableActions}

## Response Format
When responding, you should:
1. Answer the user's question clearly and concisely
2. If relevant, provide a direct link using this format: [Page Name](/path)
3. If the user wants to create or configure something, offer to pre-fill a form
4. Suggest related pages or next steps when helpful

## Response JSON Structure
Always respond with valid JSON in this format:
{
  "content": "Your helpful response with [links](/path) embedded",
  "actionType": "navigate" | "configure" | "explain" | null,
  "actionPayload": {
    "path": "/path-to-navigate",
    "prefillData": { "field": "value" }
  },
  "relatedPages": ["/path1", "/path2"],
  "suggestedQuestions": ["How do I...", "What is..."]
}

## Guidelines
- Be concise and helpful
- Always provide actionable guidance
- Use markdown for formatting
- Include relevant links
- Suggest next steps
- For admin-only features, check user role before suggesting
- If user asks to do something they don't have permission for, explain politely`;
  }

  private async buildContextualPrompt(
    message: string, 
    context: ConversationContext,
    conversationHistory: PlatformAssistantMessage[]
  ): Promise<string> {
    const recentHistory = conversationHistory.slice(-10).map(m => 
      `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
    ).join('\n\n');

    const relevantPages = searchPages(message).slice(0, 5);
    const relevantActions = searchActions(message).slice(0, 3);
    const relevantDocs = await this.searchKnowledgeBase(message);

    let contextInfo = '';
    
    if (relevantPages.length > 0) {
      contextInfo += '\n\n## Relevant Pages Found:\n';
      contextInfo += relevantPages.map(p => 
        `- **${p.name}** (${p.path}): ${p.description}\n  Capabilities: ${p.capabilities.slice(0, 3).join(', ')}`
      ).join('\n');
    }

    if (relevantActions.length > 0) {
      contextInfo += '\n\n## Relevant Actions:\n';
      contextInfo += relevantActions.map(a => 
        `- **${a.name}**: ${a.description}\n  Endpoint: ${a.endpoint} (${a.method})`
      ).join('\n');
    }

    if (relevantDocs.length > 0) {
      contextInfo += '\n\n## Relevant Knowledge Base Articles:\n';
      contextInfo += relevantDocs.map(doc => {
        return `- **${doc.title}** (${doc.category})\n  [View Article](/knowledge-base?article=${doc.id})`;
      }).join('\n');
    }

    return `${recentHistory ? `## Previous Conversation:\n${recentHistory}\n\n` : ''}## User's Current Question:\n${message}${contextInfo}

Please respond with a JSON object as specified in the system prompt. If documentation is available, include relevant setup instructions and link to the knowledge base article.`;
  }

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
          title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
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
    const userPrompt = await this.buildContextualPrompt(message, context, conversationHistory);

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      let response: AssistantResponse;
      
      try {
        response = JSON.parse(responseText);
      } catch {
        response = { content: responseText };
      }

      await db.insert(platformAssistantMessages).values({
        conversationId: convId,
        role: 'assistant',
        content: response.content,
        actionType: response.actionType,
        actionPayload: response.actionPayload,
        relatedPages: response.relatedPages,
      });

      return { response, conversationId: convId };
    } catch (error) {
      console.error('Platform Assistant error:', error);
      const fallbackResponse: AssistantResponse = {
        content: 'I apologize, but I encountered an issue processing your request. Please try again or navigate using the sidebar menu.',
        suggestedQuestions: [
          'How do I navigate to conversations?',
          'What can I do in the dashboard?',
          'How do I configure AI agents?'
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

    return {
      completed: completedIds,
      pending,
      percentComplete
    };
  }

  async markOnboardingComplete(
    userId: string, 
    checklistItemId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await db.insert(onboardingProgress)
      .values({
        userId,
        checklistItemId,
        completed: true,
        completedAt: new Date(),
        metadata: metadata || null,
      })
      .onConflictDoUpdate({
        target: [onboardingProgress.userId, onboardingProgress.checklistItemId],
        set: {
          completed: true,
          completedAt: new Date(),
          metadata: metadata || null,
          updatedAt: new Date(),
        }
      });
  }

  async executeAction(
    actionId: string,
    parameters: Record<string, any>,
    context: ConversationContext
  ): Promise<{ success: boolean; message: string; data?: any }> {
    const action = PLATFORM_ACTIONS.find(a => a.id === actionId);
    
    if (!action) {
      return { success: false, message: 'Action not found' };
    }

    if (action.requiredRole === 'admin' && context.userRole !== 'admin') {
      return { success: false, message: 'You do not have permission to perform this action' };
    }

    try {
      switch (actionId) {
        case 'create_workspace': {
          if (!parameters.name) {
            return { success: false, message: 'Workspace name is required' };
          }
          if (!context.organizationId) {
            return { success: false, message: 'Organization context is required to create a workspace' };
          }
          const slug = parameters.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          const workspace = await storage.createWorkspace({
            name: parameters.name,
            description: parameters.description || `Workspace for ${parameters.name}`,
            slug,
            organizationId: context.organizationId,
          });
          return {
            success: true,
            message: `Successfully created workspace "${workspace.name}"!`,
            data: { workspace, redirectPath: '/workspaces' }
          };
        }

        case 'create_support_category': {
          if (!parameters.name) {
            return { success: false, message: 'Category name is required' };
          }
          const categorySlug = parameters.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          const category = await storage.createSupportCategory({
            name: parameters.name,
            slug: categorySlug,
            description: parameters.description || '',
            icon: parameters.icon || 'HelpCircle',
            color: parameters.color || '#6366f1',
            isActive: true,
          });
          return {
            success: true,
            message: `Successfully created support category "${category.name}"!`,
            data: { category, redirectPath: '/support-categories' }
          };
        }

        default:
          return {
            success: true,
            message: `To ${action.name.toLowerCase()}, please go to the appropriate page. I've prepared the data for you.`,
            data: {
              redirectPath: this.getPathForAction(actionId),
              prefillData: parameters
            }
          };
      }
    } catch (error: any) {
      console.error(`Failed to execute action ${actionId}:`, error);
      return { success: false, message: error.message || 'Failed to execute action' };
    }
  }

  private getPathForAction(actionId: string): string {
    const actionPaths: Record<string, string> = {
      'create_ai_agent': '/ai-configuration',
      'create_knowledge_article': '/knowledge',
      'create_support_category': '/support-categories',
      'create_user': '/user-management',
      'update_brand_voice': '/settings',
      'create_workspace': '/workspaces',
    };
    return actionPaths[actionId] || '/dashboard';
  }

  getSuggestedQuestions(userRole: 'admin' | 'agent' | 'customer'): string[] {
    const baseQuestions = [
      'How do I view my conversations?',
      'Where can I find customer information?',
      'How does the AI respond to customers?',
      'What analytics are available?',
    ];

    if (userRole === 'admin') {
      return [
        ...baseQuestions,
        'How do I add a new team member?',
        'How do I configure AI agents?',
        'How do I set up WhatsApp integration?',
        'How do I create support categories?',
      ];
    }

    return baseQuestions;
  }

  getQuickActions(userRole: 'admin' | 'agent' | 'customer'): Array<{
    id: string;
    label: string;
    path: string;
    icon: string;
  }> {
    const baseActions = [
      { id: 'conversations', label: 'View Conversations', path: '/conversations', icon: 'MessageSquare' },
      { id: 'dashboard', label: 'Go to Dashboard', path: '/dashboard', icon: 'BarChart3' },
      { id: 'knowledge', label: 'Knowledge Base', path: '/knowledge', icon: 'BookOpen' },
    ];

    if (userRole === 'admin') {
      return [
        ...baseActions,
        { id: 'ai-config', label: 'Configure AI', path: '/ai-configuration', icon: 'Bot' },
        { id: 'users', label: 'Manage Users', path: '/user-management', icon: 'Users' },
        { id: 'channels', label: 'External Channels', path: '/channels', icon: 'Share2' },
      ];
    }

    return baseActions;
  }
}

export const platformAssistantService = new PlatformAssistantService();
