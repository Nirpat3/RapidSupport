# Support Board - Customer Support Platform

## Overview
Support Board is a full-stack customer support platform designed for real-time chat, comprehensive conversation management, and administrative oversight. It supports various user roles (admin, agent, customer) and offers features such as conversation assignment, status tracking, priority management, and dashboard analytics. The platform includes internal staff chat, an anonymous customer chat widget, an AI-powered knowledge base with image extraction, and advanced rich media input to create an efficient and user-friendly customer service experience. The project aims to provide a robust solution for enhancing customer interaction and agent productivity.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend utilizes React 18, TypeScript, and Vite, built with Radix UI and Tailwind CSS following a shadcn/ui pattern for a custom, theme-aware design system (light/dark modes). The customer chat features a Perplexity-style interface with a hero input, progressive disclosure, suggested questions, and visual feature cards. The design incorporates an Indigo-Emerald-Amber color scheme, refined typography, independent scrolling, and mobile optimization. Floating chat widgets are integrated for AI assistance.

The Public Knowledge Base is an FAQ-style interface with a search bar, category overview cards, accordion-style articles, smart search, and AI support via a floating ChatWidget. Articles include share, print, and PDF export functionality.

The Staff Conversations Page features a clean, mobile-first 2-column layout on desktop, collapsing to a single view on mobile. It includes a conversation list with search, status filtering, unread tracking, real-time WebSocket updates, and controls for status and agent assignment.

### Technical Implementations
The backend is a Node.js Express.js application in TypeScript, providing a RESTful API with Zod validation and rate limiting. Authentication is session-based using Passport.js and Express sessions with a PostgreSQL store. A custom WebSocket server handles real-time communication. PostgreSQL, accessed via Drizzle ORM and Neon serverless for connection pooling, is the primary database. Authentication includes role-based access control (Admin, Agent, Customer) and anonymous customer support via `sessionId` and IP tracking.

### Workspace Architecture (Multi-Tenant)
The platform supports a hierarchical architecture: Platform Admins → Organizations → Workspaces.

**Database Tables:**
- `workspaces`: id, name, description, slug, organizationId, isDefault, settings (JSON)
- `workspace_members`: id, userId, workspaceId, role ('owner' | 'admin' | 'member' | 'viewer'), status, invitedBy, timestamps
- `users.isPlatformAdmin`: Boolean flag for platform-level administration

**Workspace Scoping:**
- AI agents (`ai_agents.workspaceId`) and knowledge base articles (`knowledge_base.workspaceId`) can be scoped to specific workspaces
- Users can belong to multiple workspaces across different organizations
- Platform admins see all workspaces; regular users see only their assigned workspaces

**API Endpoints:**
- `GET/POST /api/workspaces` - List/create workspaces (admin role required for POST)
- `GET/PUT/DELETE /api/workspaces/:id` - Read/update/delete workspace
- `GET/POST /api/workspaces/:id/members` - List/add workspace members
- `PUT/DELETE /api/workspace-members/:id` - Update/remove members
- `GET /api/users/:userId/workspaces` - Get all workspaces a user belongs to

**Platform Admin:** Admin@ris.com / Admin$123 (isPlatformAdmin=true)

### Feature Specifications
- **Real-time Communication**: A custom WebSocket server provides real-time chat, user presence, conversation routing, message broadcasting, and typing indicators.
- **AI Capabilities**: A multi-agent AI response system (OpenAI GPT-4o-mini) enables intent classification, smart routing, and agent handoff. Features include 4-dimensional quality analysis, an AI Learning Dashboard, and RAG optimization for retrieval logging, answer grounding, and confidence thresholds.
    - **Centralized Brand Voice System**: A production-grade brand configuration system allows injection of company identity, voice attributes, and behavioral guidelines into AI system prompts.
    - **Performance Optimization**: Knowledge base retrieval is optimized for faster AI response times.
    - **Reference Links**: AI responses automatically include clickable markdown links to relevant knowledge base articles.
    - **Persistent Vector Database**: Uses PostgreSQL with `pgvector` for persistent storage of knowledge chunks and OpenAI embeddings for efficient similarity search.
- **AI Management**: A central hub for configuring AI agents, monitoring performance, and overseeing human intervention in AI conversations.
- **Knowledge Base Integration**: AI analyzes uploaded documents (TXT, PDF, DOCX) to extract metadata, generate FAQs, and suggest agent assignments. Documents are automatically chunked and indexed with vector embeddings in PostgreSQL.
- **Rich Media Input**: Supports file attachments (drag-drop, multi-file), camera capture, emoji picker, and voice-to-text.
- **User Identification**: IP-based identification and `sessionId` tracking for returning customers.
- **Unread Tracking & Notifications**: Comprehensive system for tracking message read status, unread counts, and real-time notifications with WebSocket synchronization.
- **AI Learning System**: An active learning pipeline for continuous AI improvement from human feedback, including a "Teach AI" feature and a Training Queue Dashboard.
- **Conversation Rating & Feedback**: Customers can provide 1-5 star ratings and feedback with AI-powered sentiment analysis.
- **Staff Performance Tracking**: Monitors agent metrics such as conversations handled, closure rates, and ratings.
- **Activity Notifications**: Notifies staff of mentions, tags, reminders, and assignments.
- **Customer Portal**: Authenticated self-service access for support history, profile management, and feedback.
- **External Channel Integration**: Supports WhatsApp Business API, Telegram Bot, and Facebook Messenger via webhooks.
- **Third-Party Integration API**: A RESTful API for embedding support chat with pre-filled customer data and multi-tenant support.
- **White-Label Branding**: Vendors can customize the chat widget with their own logo, colors, and welcome message. Organizations are configured via the admin Branding page (/branding) and applied to the customer chat via URL parameter (`/chat?org=<slug>`). Branding includes: logo URL, primary/secondary colors, and custom welcome messages.
- **Category-Based Customer Routing**: Customizable support categories allow customers to pre-select their issue, enabling specialized AI agent routing. Categories can be linked to specific AI agents and configured with suggested questions.
- **Mobile-First Responsive Design**: All pages use responsive grid patterns (grid-cols-1 sm:grid-cols-2 lg:grid-cols-4/5) for optimal mobile experience. Tab navigation uses horizontal scrolling on mobile.
- **PWA Support**: The app is installable as a Progressive Web App with manifest.json, theme colors (#6366f1), and app shortcuts. Install instructions available at /install-app.
- **Platform Assistant AI**: An intelligent assistant for navigation and learning that can query knowledge base articles (returns metadata only for security), execute admin actions (create workspaces, support categories), and guide users through the platform.
- **AI Documentation Generator**: Generates comprehensive setup guides for new integrations (WhatsApp Business, Facebook Messenger, Instagram DM) using OpenAI GPT-4o-mini with parallelized generation.
- **SEO Optimization**: sitemap.xml (public routes only) and robots.txt configured to block private paths while allowing public content indexing.
- **Automatic Knowledge Base Reindexing**: Scheduled hourly processing of stale articles with vector embedding updates. Includes admin API endpoints for manual control and a secure webhook for external system triggers (rate-limited, timestamp validation, secret authentication).

## External Dependencies

- **Database**: PostgreSQL (Neon serverless)
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Validation**: Zod
- **AI Services**: OpenAI GPT-4o-mini
- **Emoji Picker**: emoji-picker-react