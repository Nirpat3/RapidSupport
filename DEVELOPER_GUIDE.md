# Support Board - Developer Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Database Schema](#database-schema)
4. [Backend API](#backend-api)
5. [Frontend Architecture](#frontend-architecture)
6. [WebSocket Communication](#websocket-communication)
7. [Authentication & Authorization](#authentication--authorization)
8. [AI Integration](#ai-integration)
9. [Third-Party Integrations](#third-party-integrations)
10. [Development Workflow](#development-workflow)
11. [Testing](#testing)
12. [Deployment](#deployment)

---

## Architecture Overview

Support Board follows a modern full-stack architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT (FRONTEND)                      │
│  React 18 + TypeScript + Vite + Tailwind CSS + Radix UI    │
│                                                             │
│  Pages: Conversations, Dashboard, Settings, Portal, etc.   │
│  Components: Chat, Forms, UI Elements                      │
│  State: TanStack Query + Context API                       │
└──────────────────┬─────────────────┬─────────────────────┘
                   │                 │
                   │ HTTP REST       │ WebSocket (ws://chat)
                   │                 │
┌──────────────────▼─────────────────▼─────────────────────┐
│                    SERVER (BACKEND)                       │
│         Node.js + Express + TypeScript                    │
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐           │
│  │   Auth   │  │  Routes  │  │  WebSocket   │           │
│  │ Passport │  │   REST   │  │    Server    │           │
│  └──────────┘  └──────────┘  └──────────────┘           │
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐           │
│  │ AI Service│  │ Storage  │  │   Webhooks   │           │
│  │  OpenAI  │  │ Drizzle  │  │ Multi-channel │           │
│  └──────────┘  └──────────┘  └──────────────┘           │
└────────────────────────┬──────────────────────────────────┘
                         │
                         │ Drizzle ORM
                         │
┌────────────────────────▼──────────────────────────────────┐
│              DATABASE (PostgreSQL/Neon)                   │
│                                                            │
│  Tables: users, customers, conversations, messages,       │
│          knowledge_base, ai_agents, api_keys, etc.       │
└────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Monorepo Structure**: Frontend and backend share types via `shared/schema.ts`
2. **Type Safety**: End-to-end TypeScript with Zod validation
3. **Real-time First**: WebSocket for live chat, presence, and notifications
4. **Multi-Tenant**: API key-based organization scoping
5. **AI-Powered**: Multi-agent AI system with intelligent routing
6. **Modular**: Clear separation of routes, storage, AI, and webhooks

---

## Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: 
  - TanStack Query v5 (server state)
  - React Context API (auth, notifications)
- **UI Components**: Radix UI primitives (accessible, unstyled)
- **Styling**: Tailwind CSS 3 with custom design tokens
- **Form Handling**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Rich Features**: 
  - emoji-picker-react
  - PDF parsing (pdf-parse)
  - Document processing (mammoth)
  - File compression (jszip)

### Backend
- **Runtime**: Node.js 20 with TypeScript
- **Framework**: Express.js
- **Database ORM**: Drizzle ORM
- **Database**: PostgreSQL (Neon serverless)
- **Authentication**: Passport.js (local strategy)
- **Session Store**: PostgreSQL (connect-pg-simple)
- **Password Hashing**: bcryptjs
- **Validation**: Zod
- **WebSocket**: ws library
- **AI**: OpenAI GPT-4o-mini
- **Security**: 
  - HTTP-only session cookies (XSS protection)
  - Secure cookies (HTTPS in production)
  - SameSite: 'lax' cookie policy (CSRF mitigation)
  - bcryptjs password hashing (10 rounds)
  - Passport.js authentication middleware
  - Role-based route protection (requireAuth, requireRole)

### Infrastructure
- **Database Connection**: Neon serverless pooling
- **Session Management**: PostgreSQL-backed sessions
- **File Storage**: Local filesystem (attachments, uploads)
- **Environment**: dotenv for configuration

---

## Database Schema

### Core Entities

#### Users (Agents/Admins)
```typescript
users {
  id: varchar (UUID primary key)
  email: text (unique)
  password: text (bcrypt hashed)
  name: text
  role: 'agent' | 'admin'
  status: 'online' | 'away' | 'busy' | 'offline'
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### Customers
```typescript
customers {
  id: varchar (UUID primary key)
  name: text
  email: text (unique)
  phone: text
  company: text
  ipAddress: text (for session tracking)
  tags: text[]
  status: 'online' | 'away' | 'busy' | 'offline'
  organizationId: varchar (multi-tenant scoping)
  // Portal Access
  portalPassword: text (hashed)
  hasPortalAccess: boolean
  portalLastLogin: timestamp
  // External Sync
  externalId: text
  externalSystem: text
  syncStatus: 'synced' | 'pending' | 'failed' | 'not_synced'
  lastSyncAt: timestamp
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### Conversations
```typescript
conversations {
  id: varchar (UUID primary key)
  customerId: varchar (FK -> customers)
  assignedAgentId: varchar (FK -> users)
  status: 'open' | 'pending' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  title: text
  isAnonymous: boolean
  sessionId: text (anonymous tracking)
  followupDate: timestamp
  aiAssistanceEnabled: boolean
  contextData: text (JSON from 3rd party integrations)
  organizationId: varchar (multi-tenant scoping)
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### Messages
```typescript
messages {
  id: varchar (UUID primary key)
  conversationId: varchar (FK -> conversations)
  senderId: varchar
  senderType: 'customer' | 'agent' | 'admin' | 'ai'
  content: text
  scope: 'public' | 'internal'
  timestamp: timestamp
  status: 'sent' | 'delivered' | 'read'
}
```

### AI & Knowledge Management

#### AI Agents
```typescript
ai_agents {
  id: varchar (UUID primary key)
  name: text
  type: 'sales' | 'technical' | 'billing' | 'general'
  systemPrompt: text
  temperature: real (0.0-1.0)
  maxTokens: integer
  responseFormat: 'text' | 'json'
  isActive: boolean
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### Knowledge Base
```typescript
knowledge_base {
  id: varchar (UUID primary key)
  title: text
  content: text
  category: text
  tags: text[]
  isPublished: boolean
  isPinned: boolean
  viewCount: integer
  createdBy: varchar (FK -> users)
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Multi-Tenant & API Keys

#### API Keys
```typescript
api_keys {
  id: varchar (UUID primary key)
  organizationId: varchar
  organizationName: text
  apiKey: text (unique)
  permissions: text[] (e.g., ['chat', 'history', 'tickets', 'feed'])
  allowedDomains: text[]
  isActive: boolean
  usageCount: integer
  lastUsedAt: timestamp
  createdBy: varchar (FK -> users)
  createdAt: timestamp
}
```

### Support & Ticketing

#### Tickets
```typescript
tickets {
  id: varchar (UUID primary key)
  customerId: varchar (FK -> customers)
  conversationId: varchar (FK -> conversations)
  title: text
  description: text
  category: text
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  assignedAgentId: varchar (FK -> users)
  organizationId: varchar
  externalId: text
  externalSystem: text
  syncStatus: text
  createdAt: timestamp
  updatedAt: timestamp
  resolvedAt: timestamp
}
```

### Feedback & Analytics

#### Conversation Ratings
```typescript
conversation_ratings {
  id: varchar (UUID primary key)
  conversationId: varchar (FK -> conversations)
  customerId: varchar (FK -> customers)
  rating: integer (1-5 stars)
  feedback: text
  // AI Sentiment Analysis
  sentimentScore: integer (-100 to 100)
  sentimentCategory: 'positive' | 'neutral' | 'negative'
  qualityScore: integer (1-10)
  toneScore: integer (1-10)
  relevanceScore: integer (1-10)
  completenessScore: integer (1-10)
  createdAt: timestamp
}
```

---

## Backend API

### Authentication Endpoints

#### POST `/api/auth/login`
Authenticate a staff user (agent/admin).

**Request:**
```json
{
  "email": "agent@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "id": "user-uuid",
  "email": "agent@example.com",
  "name": "John Doe",
  "role": "agent"
}
```

#### GET `/api/auth/me`
Get current authenticated user.

**Response:**
```json
{
  "id": "user-uuid",
  "email": "agent@example.com",
  "name": "John Doe",
  "role": "agent"
}
```

#### POST `/api/auth/logout`
Logout current user (destroys session).

**Response:**
```json
{ "message": "Logged out successfully" }
```

### Customer Portal Authentication

#### POST `/api/portal/auth/login`
Authenticate a customer for portal access.

**Request:**
```json
{
  "email": "customer@example.com",
  "password": "customerpassword"
}
```

**Response:**
```json
{
  "id": "customer-uuid",
  "email": "customer@example.com",
  "name": "Jane Smith",
  "hasPortalAccess": true
}
```

### Dashboard API

#### GET `/api/dashboard/stats`
Get dashboard statistics (requires auth).

**Response:**
```json
{
  "totalConversations": 150,
  "openConversations": 12,
  "pendingConversations": 5,
  "resolvedToday": 23,
  "activeCustomers": 45,
  "avgResponseTime": 180,
  "avgResolutionTime": 3600,
  "satisfactionScore": 4.5
}
```

### Conversation Management

#### GET `/api/conversations`
List all conversations with filtering.

**Query Parameters:**
- `status`: Filter by status (open, pending, resolved, closed)
- `priority`: Filter by priority (low, medium, high, urgent)
- `assignedTo`: Filter by agent ID
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response:**
```json
{
  "conversations": [
    {
      "id": "conv-uuid",
      "customerId": "customer-uuid",
      "customer": {
        "id": "customer-uuid",
        "name": "Jane Smith",
        "email": "jane@example.com"
      },
      "assignedAgentId": "agent-uuid",
      "status": "open",
      "priority": "high",
      "title": "Payment issue",
      "createdAt": "2024-01-01T12:00:00Z",
      "updatedAt": "2024-01-01T12:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

#### POST `/api/conversations`
Create a new conversation.

**Request:**
```json
{
  "customerId": "customer-uuid",
  "title": "Billing inquiry",
  "priority": "medium",
  "message": "I have a question about my invoice"
}
```

#### PUT `/api/conversations/:id/assign`
Assign conversation to an agent.

**Request:**
```json
{
  "agentId": "agent-uuid"
}
```

#### PUT `/api/conversations/:id/status`
Update conversation status.

**Request:**
```json
{
  "status": "resolved"
}
```

### Message API

#### POST `/api/messages`
Send a message in a conversation.

**Request:**
```json
{
  "conversationId": "conv-uuid",
  "content": "Thank you for your patience...",
  "scope": "public"
}
```

**Response:**
```json
{
  "id": "message-uuid",
  "conversationId": "conv-uuid",
  "senderId": "agent-uuid",
  "senderType": "agent",
  "content": "Thank you for your patience...",
  "scope": "public",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### POST `/api/conversations/:id/internal-messages`
Send internal staff-only message.

**Request:**
```json
{
  "content": "Customer seems frustrated, escalate to senior agent"
}
```

### AI Endpoints

#### POST `/api/ai/smart-response`
Generate AI response for customer chat.

**Request:**
```json
{
  "conversationId": "conv-uuid",
  "message": "How do I reset my password?"
}
```

**Response:**
```json
{
  "response": "To reset your password, please follow these steps...",
  "confidence": 0.95,
  "agentType": "technical",
  "sources": [
    {
      "id": "kb-article-uuid",
      "title": "Password Reset Guide",
      "relevanceScore": 0.98
    }
  ]
}
```

#### POST `/api/ai/auto-handover/:conversationId`
Handover AI conversation to human agent.

**Response:**
```json
{
  "message": "Conversation assigned to Agent: John Doe",
  "assignedAgent": {
    "id": "agent-uuid",
    "name": "John Doe"
  }
}
```

#### GET `/api/ai/agents`
List all AI agents.

**Response:**
```json
{
  "agents": [
    {
      "id": "agent-uuid",
      "name": "Technical Support Agent",
      "type": "technical",
      "systemPrompt": "You are a technical support specialist...",
      "temperature": 0.7,
      "maxTokens": 500,
      "isActive": true
    }
  ]
}
```

#### POST `/api/ai/agents`
Create new AI agent (Admin only).

**Request:**
```json
{
  "name": "Sales Assistant",
  "type": "sales",
  "systemPrompt": "You are a helpful sales assistant...",
  "temperature": 0.8,
  "maxTokens": 400
}
```

### Knowledge Base API

#### GET `/api/knowledge-base`
List all knowledge base articles.

**Query Parameters:**
- `category`: Filter by category
- `tags`: Filter by tags (comma-separated)
- `published`: Filter published articles (true/false)

**Response:**
```json
{
  "articles": [
    {
      "id": "kb-uuid",
      "title": "Getting Started Guide",
      "content": "<p>Welcome to our platform...</p>",
      "category": "onboarding",
      "tags": ["beginner", "setup"],
      "isPublished": true,
      "viewCount": 1250,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST `/api/knowledge-base`
Create knowledge base article.

**Request:**
```json
{
  "title": "How to Export Data",
  "content": "<p>Follow these steps...</p>",
  "category": "features",
  "tags": ["export", "data", "advanced"],
  "isPublished": true
}
```

#### POST `/api/knowledge-base/from-url`
Create article by scraping URL.

**Request:**
```json
{
  "url": "https://docs.example.com/guide",
  "category": "documentation",
  "tags": ["guide", "external"]
}
```

### Widget API (Authenticated with API Key)

All widget endpoints require `x-api-key` header for authentication.

#### POST `/api/widget/customer`
Create or get customer for widget.

**Headers:**
```
x-api-key: your-api-key-here
```

**Request:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+1234567890",
  "company": "Acme Inc",
  "contextData": {
    "page": "/pricing",
    "plan": "pro"
  }
}
```

**Response:**
```json
{
  "data": {
    "id": "customer-uuid",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "organizationId": "org-uuid"
  }
}
```

#### GET `/api/widget/conversations/:customerId`
Get customer's conversation history.

**Headers:**
```
x-api-key: your-api-key-here
```

**Response:**
```json
{
  "data": [
    {
      "id": "conv-uuid",
      "title": "Billing Question",
      "status": "resolved",
      "lastMessage": "Thank you for your help!",
      "updatedAt": "2024-01-01T15:30:00Z"
    }
  ]
}
```

**Required Permission:** `history`

#### GET `/api/widget/tickets/:customerId`
Get customer's support tickets.

**Headers:**
```
x-api-key: your-api-key-here
```

**Response:**
```json
{
  "data": [
    {
      "id": "ticket-uuid",
      "title": "Feature Request",
      "status": "open",
      "priority": "medium",
      "createdAt": "2024-01-01T10:00:00Z"
    }
  ]
}
```

**Required Permission:** `tickets`

#### GET `/api/widget/feed`
Get public feed posts.

**Headers:**
```
x-api-key: your-api-key-here
```

**Response:**
```json
{
  "data": [
    {
      "id": "post-uuid",
      "title": "New Feature Release",
      "content": "We're excited to announce...",
      "visibility": "public",
      "createdAt": "2024-01-01T09:00:00Z"
    }
  ]
}
```

**Required Permission:** `feed`

### Webhook Endpoints

#### POST `/webhooks/whatsapp`
Receive WhatsApp Business API messages.

**Verification (GET):**
```
?hub.mode=subscribe
&hub.challenge=challenge_string
&hub.verify_token=your_verify_token
```

**Message Webhook (POST):**
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "1234567890",
          "text": { "body": "Hello" }
        }]
      }
    }]
  }]
}
```

#### POST `/webhooks/telegram`
Receive Telegram Bot API updates.

**Request:**
```json
{
  "update_id": 123456,
  "message": {
    "chat": { "id": 789 },
    "from": { "username": "user123" },
    "text": "Hello bot"
  }
}
```

#### POST `/webhooks/messenger`
Receive Facebook Messenger messages.

**Verification (GET):**
```
?hub.mode=subscribe
&hub.challenge=challenge_string
&hub.verify_token=your_verify_token
```

**Message Webhook (POST):**
```json
{
  "object": "page",
  "entry": [{
    "messaging": [{
      "sender": { "id": "sender_id" },
      "message": { "text": "Hello" }
    }]
  }]
}
```

---

## Frontend Architecture

### Project Structure

```
client/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Shadcn/Radix primitives
│   │   ├── AppSidebar.tsx  # Main navigation
│   │   ├── ChatInterface.tsx
│   │   └── ...
│   ├── contexts/           # React Context providers
│   │   ├── AuthContext.tsx
│   │   └── NotificationContext.tsx
│   ├── hooks/              # Custom React hooks
│   │   └── use-toast.ts
│   ├── lib/                # Utilities
│   │   ├── queryClient.ts  # TanStack Query setup
│   │   └── utils.ts
│   ├── pages/              # Route components
│   │   ├── ConversationsPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── CustomerPortalLogin.tsx
│   │   └── ...
│   ├── App.tsx             # Main app & routing
│   └── main.tsx            # Entry point
├── index.html
└── ...

shared/
└── schema.ts              # Shared types (DB schema)
```

### State Management

#### Server State (TanStack Query)
```typescript
// Fetching data
const { data, isLoading } = useQuery({
  queryKey: ['/api/conversations'],
});

// Mutations
const mutation = useMutation({
  mutationFn: async (data) => {
    return apiRequest('/api/conversations', 'POST', data);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
  }
});
```

#### Global State (Context API)
```typescript
// AuthContext
const { user, login, logout } = useAuth();

// NotificationContext
const { notifications, markAsRead } = useNotifications();
```

### Routing (Wouter)

```typescript
// App.tsx
<Switch>
  <Route path="/conversations" component={ConversationsPage} />
  <Route path="/dashboard" component={DashboardPage} />
  <Route path="/portal/login" component={CustomerPortalLogin} />
  {/* ... */}
</Switch>

// Navigation
import { Link } from 'wouter';
<Link href="/conversations">Conversations</Link>

// Programmatic
import { useLocation } from 'wouter';
const [, setLocation] = useLocation();
setLocation('/dashboard');
```

### Form Handling

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertCustomerSchema } from '@shared/schema';

const form = useForm({
  resolver: zodResolver(insertCustomerSchema),
  defaultValues: {
    name: '',
    email: '',
  }
});

const onSubmit = async (data) => {
  await apiRequest('/api/customers', 'POST', data);
};
```

### Styling Patterns

#### Tailwind Utilities
```typescript
// Responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Dark mode support
<div className="bg-white dark:bg-gray-900 text-black dark:text-white">

// Custom hover/active states (from index.css)
<div className="hover-elevate active-elevate-2">
```

#### Component Composition
```typescript
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Dashboard</CardTitle>
  </CardHeader>
  <CardContent>
    {/* content */}
  </CardContent>
</Card>
```

---

## WebSocket Communication

### Connection Flow

1. **Client connects** to `ws://host/ws/chat`
2. **Server validates** session cookie
3. **Authentication** via session store
4. **User registered** in active connections map
5. **Real-time events** flow bidirectionally

### Message Types

#### Client → Server
```typescript
interface ClientMessage {
  type: 'join_conversation' | 'leave_conversation' | 'new_message' 
       | 'typing' | 'stop_typing';
  conversationId?: string;
  content?: string;
  scope?: 'public' | 'internal';
}
```

#### Server → Client
```typescript
interface ServerMessage {
  type: 'new_message' | 'typing' | 'stop_typing' 
       | 'user_online' | 'user_offline' | 'unread_count_update'
       | 'new_conversation';
  conversationId?: string;
  messageId?: string;
  content?: string;
  userId?: string;
  userName?: string;
  unreadCount?: number;
}
```

### Usage Examples

#### Frontend (Client)
```typescript
const ws = new WebSocket('ws://localhost:5000/ws/chat');

// Join conversation
ws.send(JSON.stringify({
  type: 'join_conversation',
  conversationId: 'conv-uuid'
}));

// Send message
ws.send(JSON.stringify({
  type: 'new_message',
  conversationId: 'conv-uuid',
  content: 'Hello!',
  scope: 'public'
}));

// Listen for messages
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'new_message') {
    // Update UI with new message
  }
};
```

#### Backend (Server)
```typescript
// Broadcast to conversation participants
this.broadcastToConversation(conversationId, {
  type: 'new_message',
  conversationId,
  messageId: message.id,
  content: message.content,
  userId: message.senderId,
  userName: user.name
});

// Broadcast user status
this.broadcast({
  type: 'user_online',
  userId: user.id,
  userName: user.name
});
```

### Connection Management

```typescript
class ChatWebSocketServer {
  // Map: userId -> Set<WebSocket>
  private connections: Map<string, Set<AuthenticatedWebSocket>>;
  
  // Map: conversationId -> Set<userId>
  private conversationConnections: Map<string, Set<string>>;
  
  broadcastToConversation(conversationId: string, message: any) {
    const participants = this.conversationConnections.get(conversationId);
    participants?.forEach(userId => {
      const userSockets = this.connections.get(userId);
      userSockets?.forEach(ws => ws.send(JSON.stringify(message)));
    });
  }
}
```

---

## Authentication & Authorization

### Staff Authentication (Passport.js)

#### Login Flow
1. User submits email/password to `/api/auth/login`
2. Passport validates credentials
3. bcrypt compares password hash
4. Session created and stored in PostgreSQL
5. Session ID returned as HTTP-only cookie
6. Subsequent requests include cookie for auth

#### Implementation
```typescript
// server/auth.ts
passport.use(new LocalStrategy(
  { usernameField: 'email', passwordField: 'password' },
  async (email, password, done) => {
    const user = await storage.getUserByEmail(email);
    if (!user) return done(null, false);
    
    const isValid = await compare(password, user.password);
    if (!isValid) return done(null, false);
    
    return done(null, user);
  }
));
```

#### Middleware
```typescript
// Require authentication
export const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Authentication required' });
};

// Require specific role
export const requireRole = (roles: string[]) => {
  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Usage
app.get('/api/admin/users', requireRole(['admin']), async (req, res) => {
  // Admin-only endpoint
});
```

### Customer Portal Authentication

Separate authentication system for customers:

```typescript
// POST /api/portal/auth/login
const customer = await storage.getCustomerByEmail(email);
const isValid = await compare(password, customer.portalPassword);

// Session stored separately from staff sessions
req.session.customerId = customer.id;
```

### Granular Permission System

Admins can control staff permissions at feature level:

```typescript
// user_permissions table
{
  userId: 'agent-uuid',
  feature: 'conversations',
  permission: 'edit' | 'view' | 'hidden'
}

// Middleware
const checkPermission = (feature: string, level: 'view' | 'edit') => {
  return async (req, res, next) => {
    const permission = await storage.getUserPermission(
      req.user.id, 
      feature
    );
    if (!permission || permission === 'hidden') {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (level === 'edit' && permission === 'view') {
      return res.status(403).json({ error: 'Read-only access' });
    }
    next();
  };
};
```

### API Key Authentication (Widget/3rd Party)

Multi-tenant scoping via API keys:

```typescript
// Middleware
const validateApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  const key = await storage.getApiKeyByKey(apiKey);
  if (!key || !key.isActive) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  // Attach to request
  req.apiKey = key;
  req.organizationId = key.organizationId;
  next();
};

// Permission check
const requireWidgetPermission = (permission: string) => {
  return (req, res, next) => {
    if (!req.apiKey.permissions.includes(permission)) {
      return res.status(403).json({ 
        error: `Missing permission: ${permission}` 
      });
    }
    next();
  };
};

// Usage
app.get('/api/widget/tickets/:customerId', 
  validateApiKey,
  requireWidgetPermission('tickets'),
  async (req, res) => {
    // Scoped to req.organizationId
  }
);
```

---

## AI Integration

### Multi-Agent System

#### Agent Types & Specialization
```typescript
interface AIAgent {
  type: 'sales' | 'technical' | 'billing' | 'general';
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

// Intent classification → Route to specialist
const classifyIntent = async (message: string) => {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'system',
      content: 'Classify customer intent: sales, technical, billing, or general'
    }, {
      role: 'user',
      content: message
    }],
    response_format: { type: 'json_object' }
  });
  
  return JSON.parse(response.choices[0].message.content);
};
```

#### Smart Routing
1. **Intent Classification**: Analyze customer message
2. **Agent Selection**: Route to specialized AI agent
3. **Knowledge Base Search**: Retrieve relevant articles
4. **Response Generation**: Generate contextual response
5. **Confidence Check**: Handoff to human if confidence < 0.7
6. **Quality Analysis**: 4-dimensional quality scoring

#### Knowledge Base Integration
```typescript
// AI-powered search
const searchKnowledgeBase = async (query: string) => {
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: query
  });
  
  // Semantic search in vector DB or keyword matching
  const articles = await storage.searchKnowledgeBase(
    query,
    embedding.data[0].embedding
  );
  
  return articles;
};

// Context-aware response
const generateResponse = async (message: string, articles: Article[]) => {
  const context = articles.map(a => a.content).join('\n\n');
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'system',
      content: `Answer using this knowledge base context:\n${context}`
    }, {
      role: 'user',
      content: message
    }],
    temperature: agent.temperature,
    max_tokens: agent.maxTokens
  });
  
  return response.choices[0].message.content;
};
```

### AI Quality Analysis

4-dimensional scoring system:

```typescript
interface QualityAnalysis {
  quality: number;      // 1-10: Overall quality
  tone: number;         // 1-10: Professional and empathetic
  relevance: number;    // 1-10: Addresses customer query
  completeness: number; // 1-10: Comprehensive answer
}

const analyzeQuality = async (question: string, response: string) => {
  const analysis = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'system',
      content: 'Analyze response quality on 4 dimensions: quality, tone, relevance, completeness (1-10 each)'
    }, {
      role: 'user',
      content: `Question: ${question}\nResponse: ${response}`
    }],
    response_format: { type: 'json_object' }
  });
  
  return JSON.parse(analysis.choices[0].message.content);
};
```

### AI Learning & Improvement

```typescript
// Record AI interactions
await storage.createAILearning({
  agentId: 'ai-agent-uuid',
  conversationId: 'conv-uuid',
  question: customerMessage,
  response: aiResponse,
  confidence: 0.95,
  sources: knowledgeArticles.map(a => a.id),
  feedback: null // Updated later by staff/customer
});

// Staff correction
await storage.updateAILearning({
  id: 'learning-uuid',
  feedback: 'negative',
  correction: 'Better response: ...',
  correctedBy: 'agent-uuid'
});

// Continuous improvement
const learningData = await storage.getAILearningWithFeedback();
// Use for fine-tuning or prompt improvement
```

---

## Third-Party Integrations

### WhatsApp Business API

#### Setup
1. Create WhatsApp Business account
2. Configure webhook URL: `https://your-domain.com/webhooks/whatsapp`
3. Set verify token in environment: `WHATSAPP_VERIFY_TOKEN`
4. Add access token: `WHATSAPP_ACCESS_TOKEN`

#### Webhook Verification
```typescript
app.get('/webhooks/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});
```

#### Receiving Messages
```typescript
app.post('/webhooks/whatsapp', async (req, res) => {
  const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message) return res.sendStatus(200);
  
  const phoneNumber = message.from;
  const messageText = message.text?.body;
  
  // Create/find customer
  const customer = await findOrCreateCustomer({ phone: phoneNumber });
  
  // Create conversation
  const conversation = await createConversation(customer.id);
  
  // Save message
  await createMessage({
    conversationId: conversation.id,
    senderId: customer.id,
    senderType: 'customer',
    content: messageText
  });
  
  res.sendStatus(200);
});
```

#### Sending Messages
```typescript
const sendWhatsAppMessage = async (phoneNumber: string, text: string) => {
  await fetch('https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phoneNumber,
      text: { body: text }
    })
  });
};
```

### Telegram Bot

#### Setup
1. Create bot via @BotFather
2. Get bot token: `TELEGRAM_BOT_TOKEN`
3. Set webhook: `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-domain.com/webhooks/telegram`

#### Receiving Updates
```typescript
app.post('/webhooks/telegram', async (req, res) => {
  const message = req.body.message;
  if (!message) return res.sendStatus(200);
  
  const chatId = message.chat.id;
  const username = message.from.username || message.from.first_name;
  const messageText = message.text;
  
  // Find/create customer
  const customer = await findOrCreateCustomer({ 
    name: username,
    email: `telegram_${chatId}@telegram.bot`
  });
  
  // Handle message...
  
  res.sendStatus(200);
});
```

#### Sending Messages
```typescript
const sendTelegramMessage = async (chatId: string, text: string) => {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text
    })
  });
};
```

### Facebook Messenger

#### Setup
1. Create Facebook App
2. Add Messenger product
3. Configure webhook: `https://your-domain.com/webhooks/messenger`
4. Set verify token: `MESSENGER_VERIFY_TOKEN`
5. Get page access token: `MESSENGER_PAGE_ACCESS_TOKEN`

#### Webhook Verification
```typescript
app.get('/webhooks/messenger', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (mode === 'subscribe' && token === process.env.MESSENGER_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});
```

#### Receiving Messages
```typescript
app.post('/webhooks/messenger', async (req, res) => {
  const messaging = req.body.entry?.[0]?.messaging?.[0];
  if (!messaging) return res.sendStatus(200);
  
  const senderId = messaging.sender.id;
  const messageText = messaging.message?.text;
  
  // Handle message...
  
  res.sendStatus(200);
});
```

#### Sending Messages
```typescript
const sendMessengerMessage = async (recipientId: string, text: string) => {
  await fetch('https://graph.facebook.com/v18.0/me/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    params: { access_token: process.env.MESSENGER_PAGE_ACCESS_TOKEN },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: text }
    })
  });
};
```

### OpenAI Integration

#### Environment Setup
```bash
OPENAI_API_KEY=sk-...
```

#### Client Initialization
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
```

#### Usage Patterns

**Text Generation:**
```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: 'You are a helpful assistant' },
    { role: 'user', content: 'Hello!' }
  ],
  temperature: 0.7,
  max_tokens: 500
});
```

**Structured Output:**
```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [...],
  response_format: { type: 'json_object' }
});

const data = JSON.parse(response.choices[0].message.content);
```

**Embeddings (Semantic Search):**
```typescript
const embedding = await openai.embeddings.create({
  model: 'text-embedding-ada-002',
  input: 'Search query text'
});

const vector = embedding.data[0].embedding; // 1536-dimensional vector
```

---

## Development Workflow

### Getting Started

1. **Clone & Install**
```bash
git clone <repo-url>
cd support-board
npm install
```

2. **Environment Setup**
```bash
cp .env.example .env
# Edit .env with your credentials
```

Required environment variables:
```bash
DATABASE_URL=postgresql://...
SESSION_SECRET=your-secret-key
OPENAI_API_KEY=sk-...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_VERIFY_TOKEN=...
TELEGRAM_BOT_TOKEN=...
MESSENGER_PAGE_ACCESS_TOKEN=...
MESSENGER_VERIFY_TOKEN=...
```

3. **Database Setup**
```bash
npm run db:push
```

4. **Start Development Server**
```bash
npm run dev
```

Frontend: http://localhost:5000
Backend API: http://localhost:5000/api
WebSocket: ws://localhost:5000/ws/chat

### Project Scripts

```bash
# Development
npm run dev              # Start dev server (Vite + Express)

# Database
npm run db:push          # Push schema changes to database
npm run db:push --force  # Force push (with data loss warning)
npm run db:studio        # Open Drizzle Studio (DB GUI)

# Build & Production
npm run build            # Build for production
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run type-check       # Run TypeScript compiler
```

### Code Organization Best Practices

1. **Shared Types**: Always define types in `shared/schema.ts`
```typescript
// shared/schema.ts
export const customers = pgTable('customers', { ... });
export type Customer = typeof customers.$inferSelect;
export const insertCustomerSchema = createInsertSchema(customers);
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
```

2. **Storage Layer**: All DB operations go through `server/storage.ts`
```typescript
// server/storage.ts
interface IStorage {
  getCustomer(id: string): Promise<Customer | null>;
  createCustomer(data: InsertCustomer): Promise<Customer>;
}
```

3. **Route Handlers**: Thin controllers in `server/routes.ts`
```typescript
app.post('/api/customers', requireAuth, async (req, res) => {
  const data = insertCustomerSchema.parse(req.body);
  const customer = await storage.createCustomer(data);
  res.json(customer);
});
```

4. **Frontend Data Fetching**: Use TanStack Query
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['/api/customers'],
});
```

5. **Form Validation**: Zod + React Hook Form
```typescript
const form = useForm({
  resolver: zodResolver(insertCustomerSchema),
  defaultValues: { name: '', email: '' }
});
```

### Adding New Features

#### Backend Feature (Example: Add Notes to Conversations)

1. **Update Schema** (`shared/schema.ts`)
```typescript
export const conversationNotes = pgTable('conversation_notes', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar('conversation_id').references(() => conversations.id),
  content: text('content').notNull(),
  createdBy: varchar('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow()
});

export const insertNoteSchema = createInsertSchema(conversationNotes);
export type InsertNote = z.infer<typeof insertNoteSchema>;
```

2. **Push to Database**
```bash
npm run db:push
```

3. **Update Storage** (`server/storage.ts`)
```typescript
interface IStorage {
  // ... existing methods
  createNote(data: InsertNote): Promise<Note>;
  getNotesByConversation(conversationId: string): Promise<Note[]>;
}

class DbStorage implements IStorage {
  async createNote(data: InsertNote) {
    const [note] = await db.insert(conversationNotes)
      .values(data)
      .returning();
    return note;
  }
  
  async getNotesByConversation(conversationId: string) {
    return db.select()
      .from(conversationNotes)
      .where(eq(conversationNotes.conversationId, conversationId));
  }
}
```

4. **Add Routes** (`server/routes.ts`)
```typescript
app.post('/api/conversations/:id/notes', requireAuth, async (req, res) => {
  const data = insertNoteSchema.parse({
    ...req.body,
    conversationId: req.params.id,
    createdBy: req.user.id
  });
  
  const note = await storage.createNote(data);
  res.json(note);
});

app.get('/api/conversations/:id/notes', requireAuth, async (req, res) => {
  const notes = await storage.getNotesByConversation(req.params.id);
  res.json(notes);
});
```

#### Frontend Feature

5. **Create Component** (`client/src/components/ConversationNotes.tsx`)
```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

export function ConversationNotes({ conversationId }: { conversationId: string }) {
  const { data: notes } = useQuery({
    queryKey: ['/api/conversations', conversationId, 'notes'],
  });
  
  const addNote = useMutation({
    mutationFn: (content: string) => 
      apiRequest(`/api/conversations/${conversationId}/notes`, 'POST', { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/conversations', conversationId, 'notes'] 
      });
    }
  });
  
  return (
    <div>
      {notes?.map(note => (
        <div key={note.id}>{note.content}</div>
      ))}
      <Button onClick={() => addNote.mutate('New note')}>
        Add Note
      </Button>
    </div>
  );
}
```

6. **Add to Page**
```typescript
// client/src/pages/ConversationsPage.tsx
import { ConversationNotes } from '@/components/ConversationNotes';

// In render:
<ConversationNotes conversationId={selectedConversation.id} />
```

---

## Testing

### Manual Testing Checklist

#### Authentication
- [ ] Staff login/logout
- [ ] Customer portal login/logout
- [ ] Session persistence
- [ ] Role-based access control
- [ ] Permission checks

#### Conversations
- [ ] Create conversation
- [ ] Send messages (public/internal)
- [ ] Assign to agent
- [ ] Update status
- [ ] Real-time updates via WebSocket

#### AI Features
- [ ] AI auto-response
- [ ] Intent classification
- [ ] Agent routing
- [ ] Knowledge base search
- [ ] Human handoff
- [ ] Quality analysis

#### Widget Integration
- [ ] API key authentication
- [ ] Customer provisioning
- [ ] Conversation history
- [ ] Ticket access
- [ ] Feed display
- [ ] Multi-tenant isolation

#### Multi-Channel
- [ ] WhatsApp message receive/send
- [ ] Telegram message receive/send
- [ ] Messenger message receive/send
- [ ] Webhook verification

### E2E Testing with Playwright

```typescript
// tests/conversations.spec.ts
import { test, expect } from '@playwright/test';

test('create and send message in conversation', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[data-testid="input-email"]', 'agent@example.com');
  await page.fill('[data-testid="input-password"]', 'password');
  await page.click('[data-testid="button-login"]');
  
  // Navigate to conversations
  await page.click('[data-testid="link-conversations"]');
  
  // Create conversation
  await page.click('[data-testid="button-new-conversation"]');
  await page.fill('[data-testid="input-title"]', 'Test Conversation');
  await page.click('[data-testid="button-create"]');
  
  // Send message
  await page.fill('[data-testid="input-message"]', 'Hello customer!');
  await page.click('[data-testid="button-send"]');
  
  // Verify message appears
  await expect(page.locator('[data-testid="message-content"]'))
    .toHaveText('Hello customer!');
});
```

### API Testing

```bash
# Using curl
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"agent@example.com","password":"password"}' \
  -c cookies.txt

curl -X GET http://localhost:5000/api/conversations \
  -b cookies.txt

# Using Postman/Insomnia
# Import collection from docs/api-collection.json
```

---

## Deployment

### Environment Variables (Production)

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Session
SESSION_SECRET=<strong-random-secret>
NODE_ENV=production

# OpenAI
OPENAI_API_KEY=sk-...

# WhatsApp
WHATSAPP_ACCESS_TOKEN=<token>
WHATSAPP_VERIFY_TOKEN=<token>
WHATSAPP_PHONE_NUMBER_ID=<id>

# Telegram
TELEGRAM_BOT_TOKEN=<token>

# Messenger
MESSENGER_PAGE_ACCESS_TOKEN=<token>
MESSENGER_VERIFY_TOKEN=<token>
```

### Build & Deploy

```bash
# Build frontend & backend
npm run build

# Start production server
npm start
```

### Replit Deployment

The project is configured for one-click deployment on Replit:

1. **Database**: Auto-provisioned PostgreSQL (Neon)
2. **Environment**: Variables set in Replit Secrets
3. **Publishing**: Click "Publish" button
4. **Domain**: `your-app.replit.app` or custom domain

### Production Checklist

- [ ] Set strong `SESSION_SECRET`
- [ ] Enable HTTPS (automatic on Replit)
- [ ] Configure CORS for widget domains
- [ ] Set up API key rate limiting
- [ ] Enable database backups
- [ ] Configure webhook URLs with production domain
- [ ] Test all integrations in production
- [ ] Monitor error logs
- [ ] Set up uptime monitoring

### Scaling Considerations

1. **Database**: Use connection pooling (Neon auto-scales)
2. **Sessions**: PostgreSQL session store handles distributed sessions
3. **WebSocket**: Consider Redis for multi-instance WebSocket sync
4. **File Storage**: Move to cloud storage (S3, Cloudflare R2)
5. **AI Requests**: Implement request queuing for high load
6. **Caching**: Add Redis for frequently accessed data

---

## Appendix

### Common Tasks

#### Reset Admin Password
```typescript
import { hash } from 'bcryptjs';

const newPassword = await hash('newpassword', 10);
await db.update(users)
  .set({ password: newPassword })
  .where(eq(users.email, 'admin@example.com'));
```

#### Clear Old Sessions
```bash
DELETE FROM user_sessions WHERE expire < NOW();
```

#### Regenerate API Key
```typescript
import { randomBytes } from 'crypto';

const newKey = randomBytes(32).toString('hex');
await db.update(apiKeys)
  .set({ apiKey: newKey })
  .where(eq(apiKeys.id, 'key-uuid'));
```

### Troubleshooting

**WebSocket not connecting:**
- Check session cookie is being sent
- Verify `SESSION_SECRET` matches
- Ensure WebSocket path is `/ws/chat`

**AI responses failing:**
- Verify `OPENAI_API_KEY` is set
- Check API quota/billing
- Review rate limiting

**Webhook not receiving messages:**
- Verify webhook URL is publicly accessible
- Check verify token matches
- Review webhook signature validation

**Database migration errors:**
- Use `npm run db:push --force` (last resort)
- Check for ID column type changes
- Verify no duplicate constraints

### Resources

- [Drizzle ORM Docs](https://orm.drizzle.team)
- [TanStack Query Docs](https://tanstack.com/query)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Messenger Platform](https://developers.facebook.com/docs/messenger-platform)

---

**Last Updated**: 2024-01-10
**Version**: 1.0.0
