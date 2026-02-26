export interface PageInfo {
  path: string;
  name: string;
  description: string;
  category: 'main' | 'ai' | 'management' | 'support' | 'admin' | 'public';
  feature: string;
  requiredRole?: 'admin' | 'agent' | 'customer';
  icon: string;
  keywords: string[];
  capabilities: string[];
  formFields?: FormFieldInfo[];
  relatedPages?: string[];
}

export interface FormFieldInfo {
  name: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'file' | 'number' | 'email' | 'password';
  label: string;
  description: string;
  required: boolean;
  options?: string[];
}

export interface ActionInfo {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  requiredRole?: 'admin' | 'agent';
  parameters?: { name: string; type: string; required: boolean; description: string }[];
}

export const PLATFORM_PAGES: PageInfo[] = [
  {
    path: '/conversations',
    name: 'Conversations',
    description: 'View and manage all customer support conversations. Handle live chats, respond to inquiries, assign agents, and track conversation status.',
    category: 'main',
    feature: 'conversations',
    icon: 'MessageSquare',
    keywords: ['chat', 'messages', 'support', 'tickets', 'inbox', 'customer inquiry'],
    capabilities: [
      'View all active and archived conversations',
      'Respond to customer messages in real-time',
      'Assign conversations to agents',
      'Change conversation status (open, pending, resolved, closed)',
      'Set priority levels (low, medium, high, urgent)',
      'View customer history and context',
      'Transfer conversations between agents',
      'Use AI-suggested responses'
    ],
    relatedPages: ['/customers', '/ai-configuration', '/human-oversight']
  },
  {
    path: '/activity',
    name: 'Activity',
    description: 'Track all platform activity including mentions, assignments, reminders, and team updates.',
    category: 'main',
    feature: 'activity',
    icon: 'Bell',
    keywords: ['notifications', 'alerts', 'mentions', 'updates', 'team activity'],
    capabilities: [
      'View recent activity notifications',
      'Track mentions and tags',
      'See assignment changes',
      'Monitor team activity'
    ],
    relatedPages: ['/conversations', '/feed']
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    description: 'Overview of support metrics, team performance, and key analytics at a glance.',
    category: 'main',
    feature: 'dashboard',
    icon: 'BarChart3',
    keywords: ['metrics', 'analytics', 'overview', 'statistics', 'performance', 'kpis'],
    capabilities: [
      'View conversation volume trends',
      'Monitor response time metrics',
      'Track resolution rates',
      'See agent performance summary',
      'View customer satisfaction scores'
    ],
    relatedPages: ['/analytics', '/ai-performance']
  },
  {
    path: '/customers',
    name: 'Customers',
    description: 'Manage customer profiles, view interaction history, and track customer information.',
    category: 'main',
    feature: 'customers',
    icon: 'Users',
    keywords: ['contacts', 'profiles', 'customer data', 'crm', 'customer management'],
    capabilities: [
      'Search and filter customers',
      'View customer conversation history',
      'Edit customer profiles',
      'Add notes and tags to customers',
      'Track customer satisfaction scores',
      'Export customer data'
    ],
    formFields: [
      { name: 'name', type: 'text', label: 'Customer Name', description: 'Full name of the customer', required: true },
      { name: 'email', type: 'email', label: 'Email Address', description: 'Primary email for communication', required: true },
      { name: 'phone', type: 'text', label: 'Phone Number', description: 'Contact phone number', required: false },
      { name: 'company', type: 'text', label: 'Company', description: 'Company or organization name', required: false }
    ],
    relatedPages: ['/conversations', '/leads']
  },
  {
    path: '/ai-configuration',
    name: 'AI Configuration',
    description: 'Configure AI agents, set response behaviors, define handoff thresholds, and manage AI personalities.',
    category: 'ai',
    feature: 'ai-agents',
    icon: 'Bot',
    keywords: ['ai settings', 'chatbot', 'automation', 'agent configuration', 'ai behavior'],
    capabilities: [
      'Create and configure AI agents',
      'Set agent personalities and tone',
      'Define confidence thresholds for handoff',
      'Configure greeting messages',
      'Set response templates',
      'Link AI agents to support categories',
      'Enable/disable AI for specific channels'
    ],
    formFields: [
      { name: 'name', type: 'text', label: 'Agent Name', description: 'Name of the AI agent', required: true },
      { name: 'description', type: 'textarea', label: 'Description', description: 'What this agent specializes in', required: false },
      { name: 'personality', type: 'select', label: 'Personality', description: 'Communication style', required: true, options: ['professional', 'friendly', 'casual', 'formal'] },
      { name: 'confidenceThreshold', type: 'number', label: 'Confidence Threshold', description: 'Minimum confidence to respond (0-100)', required: true },
      { name: 'greeting', type: 'textarea', label: 'Greeting Message', description: 'Initial message when conversation starts', required: false }
    ],
    relatedPages: ['/ai-performance', '/human-oversight', '/knowledge']
  },
  {
    path: '/ai-performance',
    name: 'AI Performance',
    description: 'Monitor AI agent performance, track accuracy metrics, and analyze AI-human handoff patterns.',
    category: 'ai',
    feature: 'ai-dashboard',
    icon: 'TrendingUp',
    keywords: ['ai analytics', 'performance metrics', 'accuracy', 'ai monitoring'],
    capabilities: [
      'View AI response accuracy rates',
      'Track handoff frequency',
      'Monitor customer satisfaction with AI',
      'Analyze response time metrics',
      'Review confidence score distributions',
      'Compare AI vs human performance'
    ],
    relatedPages: ['/ai-configuration', '/analytics']
  },
  {
    path: '/human-oversight',
    name: 'Human Oversight',
    description: 'Review AI responses, approve or correct AI suggestions, and manage the AI training queue.',
    category: 'ai',
    feature: 'ai-takeover',
    icon: 'UserCheck',
    keywords: ['ai review', 'training', 'oversight', 'corrections', 'quality control'],
    capabilities: [
      'Review pending AI responses',
      'Approve or reject AI suggestions',
      'Provide corrections to train AI',
      'View AI learning history',
      'Manage training queue priority',
      'Take over conversations from AI'
    ],
    relatedPages: ['/ai-configuration', '/conversations']
  },
  {
    path: '/knowledge',
    name: 'Knowledge Base',
    description: 'Create and manage knowledge base articles, FAQs, and documentation that powers AI responses.',
    category: 'management',
    feature: 'knowledge-base',
    icon: 'BookOpen',
    keywords: ['articles', 'faq', 'documentation', 'help center', 'content management'],
    capabilities: [
      'Create and edit articles',
      'Organize content by categories',
      'Upload and process documents',
      'Generate FAQs from documents',
      'Manage article visibility (public/internal)',
      'Track article performance and usage',
      'Configure AI to use specific articles'
    ],
    formFields: [
      { name: 'title', type: 'text', label: 'Article Title', description: 'Title of the knowledge base article', required: true },
      { name: 'content', type: 'textarea', label: 'Content', description: 'Article content in markdown', required: true },
      { name: 'category', type: 'select', label: 'Category', description: 'Article category', required: true },
      { name: 'isPublic', type: 'checkbox', label: 'Public', description: 'Make visible on public knowledge base', required: false }
    ],
    relatedPages: ['/files', '/ai-configuration']
  },
  {
    path: '/files',
    name: 'File Management',
    description: 'Upload, organize, and manage documents and files for knowledge base integration.',
    category: 'management',
    feature: 'file-management',
    icon: 'File',
    keywords: ['documents', 'uploads', 'files', 'attachments', 'media'],
    capabilities: [
      'Upload PDF, DOCX, TXT files',
      'Automatic document processing',
      'Extract text for AI training',
      'Organize files by category',
      'Search within documents',
      'Download and share files'
    ],
    relatedPages: ['/knowledge']
  },
  {
    path: '/analytics',
    name: 'Analytics',
    description: 'Detailed analytics on agent performance, response times, and customer satisfaction.',
    category: 'management',
    feature: 'analytics',
    icon: 'TrendingUp',
    keywords: ['reports', 'metrics', 'agent stats', 'performance tracking'],
    capabilities: [
      'View agent performance rankings',
      'Track response time trends',
      'Monitor resolution rates',
      'Analyze peak hours',
      'Compare team performance',
      'Export analytics reports'
    ],
    relatedPages: ['/dashboard', '/feedback']
  },
  {
    path: '/feedback',
    name: 'Feedback',
    description: 'Review customer feedback, ratings, and satisfaction surveys.',
    category: 'management',
    feature: 'feedback',
    icon: 'MessageSquare',
    keywords: ['ratings', 'reviews', 'satisfaction', 'csat', 'nps'],
    capabilities: [
      'View customer ratings (1-5 stars)',
      'Read feedback comments',
      'Track satisfaction trends',
      'Filter by agent or time period',
      'Identify improvement areas'
    ],
    relatedPages: ['/analytics', '/conversations']
  },
  {
    path: '/feed',
    name: 'Feed',
    description: 'Internal team communication feed for updates, announcements, and discussions.',
    category: 'main',
    feature: 'feed',
    icon: 'Rss',
    keywords: ['posts', 'updates', 'team chat', 'announcements', 'internal'],
    capabilities: [
      'Post updates and announcements',
      'Comment on team posts',
      'Like and react to content',
      'Share files and links',
      'Tag team members'
    ],
    relatedPages: ['/activity']
  },
  {
    path: '/user-management',
    name: 'User Management',
    description: 'Manage team members, roles, permissions, and access control.',
    category: 'admin',
    feature: 'user-management',
    requiredRole: 'admin',
    icon: 'Shield',
    keywords: ['users', 'roles', 'permissions', 'team', 'access control', 'staff'],
    capabilities: [
      'Add new team members',
      'Assign roles (admin, agent)',
      'Configure feature permissions',
      'View user activity logs',
      'Deactivate or remove users',
      'Reset user passwords'
    ],
    formFields: [
      { name: 'name', type: 'text', label: 'Full Name', description: 'Team member name', required: true },
      { name: 'email', type: 'email', label: 'Email', description: 'Login email address', required: true },
      { name: 'role', type: 'select', label: 'Role', description: 'User role', required: true, options: ['admin', 'agent'] },
      { name: 'password', type: 'password', label: 'Password', description: 'Initial password', required: true }
    ],
    relatedPages: ['/settings']
  },
  {
    path: '/support-categories',
    name: 'Support Categories',
    description: 'Configure support categories for routing customer inquiries to specialized AI agents.',
    category: 'admin',
    feature: 'support-categories',
    requiredRole: 'admin',
    icon: 'Tags',
    keywords: ['categories', 'routing', 'topics', 'departments', 'queues'],
    capabilities: [
      'Create support categories',
      'Link categories to AI agents',
      'Set suggested questions per category',
      'Configure category icons and colors',
      'Enable/disable categories'
    ],
    formFields: [
      { name: 'name', type: 'text', label: 'Category Name', description: 'Name of the support category', required: true },
      { name: 'description', type: 'textarea', label: 'Description', description: 'What this category covers', required: false },
      { name: 'aiAgentId', type: 'select', label: 'AI Agent', description: 'Specialized AI agent for this category', required: false }
    ],
    relatedPages: ['/ai-configuration']
  },
  {
    path: '/channels',
    name: 'External Channels',
    description: 'Configure WhatsApp, Facebook Messenger, and Instagram integrations.',
    category: 'admin',
    feature: 'settings',
    requiredRole: 'admin',
    icon: 'Share2',
    keywords: ['whatsapp', 'messenger', 'instagram', 'integrations', 'social media'],
    capabilities: [
      'Connect WhatsApp Business account',
      'Configure Facebook Messenger',
      'Set up Instagram DM integration',
      'Choose provider (Meta Cloud or Twilio)',
      'Test channel connections',
      'Manage webhook URLs'
    ],
    relatedPages: ['/leads', '/settings']
  },
  {
    path: '/leads',
    name: 'Lead Tracking',
    description: 'Track and qualify leads from external messaging channels.',
    category: 'admin',
    feature: 'customers',
    requiredRole: 'admin',
    icon: 'TrendingUp',
    keywords: ['leads', 'crm', 'sales', 'prospects', 'qualification'],
    capabilities: [
      'View leads from all channels',
      'Update lead status (new, contacted, qualified, converted, lost)',
      'Add qualification scores',
      'Track lead interactions',
      'Filter by channel source'
    ],
    relatedPages: ['/channels', '/customers']
  },
  {
    path: '/settings',
    name: 'Settings',
    description: 'Configure platform settings, branding, and system preferences.',
    category: 'admin',
    feature: 'settings',
    icon: 'Settings',
    keywords: ['configuration', 'preferences', 'branding', 'system settings'],
    capabilities: [
      'Configure brand voice for AI',
      'Set business hours',
      'Manage notification preferences',
      'Configure auto-responses',
      'Set up email integration'
    ],
    relatedPages: ['/user-management', '/widget-setup']
  },
  {
    path: '/widget-setup',
    name: 'Widget Setup',
    description: 'Get embed code and configure the customer chat widget for your website.',
    category: 'support',
    feature: 'settings',
    icon: 'Code',
    keywords: ['embed', 'widget', 'integration', 'website chat', 'installation'],
    capabilities: [
      'Generate embed code snippet',
      'Customize widget appearance',
      'Configure widget behavior',
      'Set up pre-chat forms',
      'Test widget functionality'
    ],
    relatedPages: ['/settings', '/documentation']
  },
  {
    path: '/documentation',
    name: 'Documentation',
    description: 'Platform documentation, API guides, and integration instructions.',
    category: 'support',
    feature: 'documentation',
    icon: 'FileText',
    keywords: ['docs', 'api', 'guides', 'help', 'reference'],
    capabilities: [
      'View API documentation',
      'Read integration guides',
      'Access webhook references',
      'Find troubleshooting tips'
    ],
    relatedPages: ['/widget-setup']
  },
  {
    path: '/install-app',
    name: 'Install App',
    description: 'Instructions for installing Nova AI as a Progressive Web App (PWA) on mobile and desktop.',
    category: 'support',
    feature: 'install',
    icon: 'Smartphone',
    keywords: ['pwa', 'mobile', 'install', 'app', 'download'],
    capabilities: [
      'Install on mobile devices',
      'Add to home screen',
      'Enable push notifications'
    ]
  },
  {
    path: '/saved-replies',
    name: 'Saved Replies',
    description: 'Manage canned responses and quick reply templates. Agents can insert saved replies into conversations to respond faster and more consistently.',
    category: 'management',
    feature: 'saved-replies',
    icon: 'FileText',
    keywords: ['canned responses', 'templates', 'quick replies', 'snippets', 'macros', 'shortcuts'],
    capabilities: [
      'Create and manage reply templates by category',
      'Search saved replies while in a conversation',
      'Use {{customerName}} and other variables in templates',
      'Track usage count per reply',
      'Share replies across all agents or keep personal',
      'Filter by category (General, Billing, Technical, etc.)'
    ],
    formFields: [
      { name: 'title', type: 'text', label: 'Reply Title', description: 'Short name for this reply (e.g. "Greeting")', required: true },
      { name: 'category', type: 'select', label: 'Category', description: 'Group for organizing replies', required: true, options: ['General', 'Billing', 'Technical', 'Sales'] },
      { name: 'content', type: 'textarea', label: 'Reply Content', description: 'Full text of the reply. Use {{customerName}} for personalization.', required: true },
      { name: 'isShared', type: 'checkbox', label: 'Share with all agents', description: 'If checked, all agents can use this reply', required: false }
    ],
    relatedPages: ['/conversations']
  },
  {
    path: '/sla-management',
    name: 'SLA Management',
    description: 'Configure Service Level Agreement (SLA) policies — set first-response and resolution time targets per conversation priority. Monitor breaches and compliance.',
    category: 'admin',
    feature: 'sla',
    icon: 'Clock',
    keywords: ['sla', 'service level', 'response time', 'deadline', 'breach', 'priority'],
    capabilities: [
      'Create SLA policies per priority level (low/medium/high/urgent)',
      'Set first-response time targets (e.g. 1 hour)',
      'Set resolution time targets (e.g. 8 hours)',
      'Toggle business-hours-only enforcement',
      'View SLA breach notifications and alerts',
      'Monitor compliance percentage in analytics'
    ],
    formFields: [
      { name: 'name', type: 'text', label: 'Policy Name', description: 'e.g. "Standard SLA" or "VIP SLA"', required: true },
      { name: 'priority', type: 'select', label: 'Priority', description: 'Applies to conversations with this priority', required: true, options: ['low', 'medium', 'high', 'urgent'] },
      { name: 'firstResponseMinutes', type: 'number', label: 'First Response (minutes)', description: 'Time limit for first agent reply, e.g. 60 for 1 hour', required: true },
      { name: 'resolutionMinutes', type: 'number', label: 'Resolution (minutes)', description: 'Time limit to resolve, e.g. 480 for 8 hours', required: true },
      { name: 'businessHoursOnly', type: 'checkbox', label: 'Business Hours Only', description: 'Only count business hours, not nights/weekends', required: false }
    ],
    requiredRole: 'admin',
    relatedPages: ['/conversations', '/analytics', '/monitoring']
  },
  {
    path: '/audit-log',
    name: 'Audit Log',
    description: 'View a complete record of all administrative actions performed on the platform — who did what and when. Filter by action type, entity, date, and user.',
    category: 'admin',
    feature: 'audit',
    icon: 'ClipboardList',
    keywords: ['audit', 'log', 'history', 'changes', 'activity', 'compliance', 'trail'],
    capabilities: [
      'Filter by entity type (conversation, user, customer, etc.)',
      'Filter by action (create, update, delete)',
      'Filter by who performed the action',
      'Filter by date range',
      'Expand rows to see before/after values',
      'Export audit log to CSV'
    ],
    requiredRole: 'admin',
    relatedPages: ['/monitoring', '/user-management']
  },
  {
    path: '/settings/security',
    name: 'Security Settings',
    description: 'Manage account security including Two-Factor Authentication (2FA/TOTP). Enable 2FA using authenticator apps like Google Authenticator or Authy.',
    category: 'admin',
    feature: 'security',
    icon: 'Shield',
    keywords: ['2fa', 'two factor', 'totp', 'security', 'authentication', 'mfa', 'authenticator', 'google authenticator'],
    capabilities: [
      'Enable Two-Factor Authentication (2FA)',
      'Scan QR code with authenticator app',
      'Save backup codes for account recovery',
      'Disable 2FA with password confirmation',
      'View session security information'
    ],
    relatedPages: ['/settings', '/user-management']
  },
  {
    path: '/analytics',
    name: 'Analytics',
    description: 'Comprehensive analytics hub — conversation volume, CSAT scores, agent performance, response times, and team metrics.',
    category: 'management',
    feature: 'analytics',
    icon: 'BarChart3',
    keywords: ['csat', 'analytics', 'reports', 'metrics', 'performance', 'statistics', 'survey', 'satisfaction'],
    capabilities: [
      'View CSAT survey scores and trends',
      'Track conversation volume over time',
      'Monitor average response times',
      'Compare agent performance',
      'View resolution rate metrics',
      'Export reports to CSV'
    ],
    relatedPages: ['/dashboard', '/ai-performance']
  }
];

export const PLATFORM_ACTIONS: ActionInfo[] = [
  {
    id: 'create_ai_agent',
    name: 'Create AI Agent',
    description: 'Create a new AI agent with specified configuration',
    endpoint: '/api/ai-agents',
    method: 'POST',
    requiredRole: 'admin',
    parameters: [
      { name: 'name', type: 'string', required: true, description: 'Name of the AI agent' },
      { name: 'description', type: 'string', required: false, description: 'Agent description' },
      { name: 'personality', type: 'string', required: false, description: 'Agent personality (professional, friendly, casual)' },
      { name: 'confidenceThreshold', type: 'number', required: false, description: 'Confidence threshold 0-100' }
    ]
  },
  {
    id: 'create_knowledge_article',
    name: 'Create Knowledge Article',
    description: 'Create a new knowledge base article',
    endpoint: '/api/knowledge',
    method: 'POST',
    requiredRole: 'agent',
    parameters: [
      { name: 'title', type: 'string', required: true, description: 'Article title' },
      { name: 'content', type: 'string', required: true, description: 'Article content in markdown' },
      { name: 'category', type: 'string', required: true, description: 'Article category' },
      { name: 'isPublic', type: 'boolean', required: false, description: 'Make article public' }
    ]
  },
  {
    id: 'create_support_category',
    name: 'Create Support Category',
    description: 'Create a new support category for routing',
    endpoint: '/api/support-categories',
    method: 'POST',
    requiredRole: 'admin',
    parameters: [
      { name: 'name', type: 'string', required: true, description: 'Category name' },
      { name: 'description', type: 'string', required: false, description: 'Category description' },
      { name: 'aiAgentId', type: 'string', required: false, description: 'Linked AI agent ID' }
    ]
  },
  {
    id: 'create_user',
    name: 'Create Team Member',
    description: 'Add a new team member to the platform',
    endpoint: '/api/users',
    method: 'POST',
    requiredRole: 'admin',
    parameters: [
      { name: 'name', type: 'string', required: true, description: 'Full name' },
      { name: 'email', type: 'string', required: true, description: 'Email address' },
      { name: 'password', type: 'string', required: true, description: 'Password' },
      { name: 'role', type: 'string', required: true, description: 'Role (admin or agent)' }
    ]
  },
  {
    id: 'update_brand_voice',
    name: 'Update Brand Voice',
    description: 'Configure the AI brand voice settings',
    endpoint: '/api/settings/brand-voice',
    method: 'PUT',
    requiredRole: 'admin',
    parameters: [
      { name: 'companyName', type: 'string', required: true, description: 'Company name' },
      { name: 'industry', type: 'string', required: false, description: 'Industry type' },
      { name: 'tone', type: 'string', required: false, description: 'Communication tone' }
    ]
  },
  {
    id: 'create_workspace',
    name: 'Create Workspace',
    description: 'Create a new workspace (project) for organizing support operations',
    endpoint: '/api/platform-assistant/execute-action',
    method: 'POST',
    requiredRole: 'admin',
    parameters: [
      { name: 'name', type: 'string', required: true, description: 'Workspace name (e.g., "Rapid")' },
      { name: 'description', type: 'string', required: false, description: 'Workspace description' }
    ]
  },
  {
    id: 'create_saved_reply',
    name: 'Create Saved Reply',
    description: 'Create a new canned response/saved reply template for agents to use in conversations',
    endpoint: '/api/saved-replies',
    method: 'POST',
    requiredRole: 'agent',
    parameters: [
      { name: 'title', type: 'string', required: true, description: 'Short name for the reply (e.g. "Greeting")' },
      { name: 'content', type: 'string', required: true, description: 'Full reply text. Use {{customerName}} for personalization.' },
      { name: 'category', type: 'string', required: false, description: 'Category (General, Billing, Technical, Sales)' }
    ]
  },
  {
    id: 'create_sla_policy',
    name: 'Create SLA Policy',
    description: 'Create a Service Level Agreement policy that sets response and resolution time targets for a conversation priority level',
    endpoint: '/api/sla-policies',
    method: 'POST',
    requiredRole: 'admin',
    parameters: [
      { name: 'name', type: 'string', required: true, description: 'Policy name (e.g. "Standard SLA")' },
      { name: 'priority', type: 'string', required: true, description: 'Priority level: low, medium, high, or urgent' },
      { name: 'firstResponseMinutes', type: 'number', required: true, description: 'Minutes until first response deadline (e.g. 60)' },
      { name: 'resolutionMinutes', type: 'number', required: true, description: 'Minutes until resolution deadline (e.g. 480)' }
    ]
  }
];

export const ONBOARDING_CHECKLIST = [
  {
    id: 'profile',
    title: 'Complete your profile',
    description: 'Add your name, avatar, and contact information',
    path: '/settings',
    isRequired: true,
    category: 'setup'
  },
  {
    id: 'knowledge',
    title: 'Add knowledge base articles',
    description: 'Create articles to power AI responses',
    path: '/knowledge',
    isRequired: true,
    category: 'content'
  },
  {
    id: 'ai_agent',
    title: 'Configure an AI agent',
    description: 'Set up AI personality and behavior',
    path: '/ai-configuration',
    isRequired: true,
    category: 'ai'
  },
  {
    id: 'category',
    title: 'Create support categories',
    description: 'Set up categories for routing inquiries',
    path: '/support-categories',
    isRequired: false,
    category: 'setup'
  },
  {
    id: 'channel',
    title: 'Connect a messaging channel',
    description: 'Set up WhatsApp, Messenger, or Instagram',
    path: '/channels',
    isRequired: false,
    category: 'channels'
  },
  {
    id: 'team',
    title: 'Invite team members',
    description: 'Add agents to handle conversations',
    path: '/user-management',
    isRequired: false,
    category: 'team'
  },
  {
    id: 'widget',
    title: 'Install chat widget',
    description: 'Embed the chat widget on your website',
    path: '/widget-setup',
    isRequired: false,
    category: 'channels'
  },
  {
    id: 'conversation',
    title: 'Handle first conversation',
    description: 'Respond to your first customer inquiry',
    path: '/conversations',
    isRequired: false,
    category: 'usage'
  }
];

export function getPageByPath(path: string): PageInfo | undefined {
  return PLATFORM_PAGES.find(p => p.path === path || path.startsWith(p.path + '/'));
}

export function searchPages(query: string): PageInfo[] {
  const lowerQuery = query.toLowerCase();
  return PLATFORM_PAGES.filter(page => 
    page.name.toLowerCase().includes(lowerQuery) ||
    page.description.toLowerCase().includes(lowerQuery) ||
    page.keywords.some(k => k.toLowerCase().includes(lowerQuery)) ||
    page.capabilities.some(c => c.toLowerCase().includes(lowerQuery))
  );
}

export function getPagesByCategory(category: PageInfo['category']): PageInfo[] {
  return PLATFORM_PAGES.filter(p => p.category === category);
}

export function getActionById(id: string): ActionInfo | undefined {
  return PLATFORM_ACTIONS.find(a => a.id === id);
}

export function searchActions(query: string): ActionInfo[] {
  const lowerQuery = query.toLowerCase();
  return PLATFORM_ACTIONS.filter(action =>
    action.name.toLowerCase().includes(lowerQuery) ||
    action.description.toLowerCase().includes(lowerQuery)
  );
}
