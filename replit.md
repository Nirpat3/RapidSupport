# Support Board - Customer Support Platform

## Overview
Support Board is a full-stack customer support platform for real-time chat, conversation management, and administrative oversight. It supports multiple user roles (admin, agent, customer) and includes features like conversation assignment, status tracking, priority management, and dashboard analytics. The platform offers internal staff chat, an anonymous customer chat widget, an AI-powered knowledge base search, and advanced rich media input to deliver an efficient and user-friendly customer service solution.

## Recent Changes (Dec 14, 2025)
- **Real-time Customer Portal Chat**:
  - Replaced 5-second polling with WebSocket for instant message updates
  - Added typing indicators (see when agents are typing)
  - Live connection status indicator (shows "Live" when connected)
  - WebSocket server now authenticates both staff and customer sessions
- **DDoS/Spam Protection**:
  - Global API rate limiter: 200 requests/minute per IP
  - Message rate limiter: 30 messages/minute per IP
  - Conversation creation limiter: 10 new conversations/hour per IP
  - Applied to customer portal and anonymous chat endpoints
- **Customer Portal Enhancements**:
  - Agent assignment status now displayed in conversations list (shows agent name or "Awaiting agent")
  - Priority badges (Urgent/High/Medium) shown on conversations
  - Conversations sorted by priority first, then by date
  - Fixed 403 error - agents can now reply to unassigned conversations
  - Added dedicated portal chat page (`/portal/chat`) for authenticated customers
  - New conversation creation form with subject and message fields
  - View and reply to existing conversations at `/portal/chat/:conversationId`
  - Fixed "Start New Conversation" button routing

## Previous Changes (Nov 30, 2025)
- **MAJOR REDESIGN**: Implemented "Conversation-First Intelligence" visual overhaul
  - Updated color system: Primary Indigo (243° 100% 40%), Accent Emerald (160° 84% 39%), highlights via Amber
  - Applied new color variables to both light and dark modes
  - Created comprehensive mockup viewer at `/mockup` with all page designs
  - Transitioned from cool grays to warm, professional Indigo-Emerald-Amber palette

## Test Credentials
**Super Admin:**
- Email: Admin@ris.com
- Password: Admin$123
- Permissions: Full system access, user management, all settings, dashboard

**Support Agent:**
- Email: Agent@rapidrms.com
- Password: Agent$123
- Permissions: Handle conversations, manage assigned cases, access staff features

**Customer (Portal Access):**
- Email: Customer@rms.com
- Password: Customer$123
- Permissions: Portal access (/portal), view support history, submit feedback

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React 18, TypeScript, and Vite, leveraging Radix UI with Tailwind CSS in a shadcn/ui pattern for a custom design system supporting light/dark themes. The customer chat features a Perplexity-style redesign with a prominent hero input, progressive disclosure, suggested questions, and visual feature cards. Design aesthetics now reflect Apple/Stripe-like refinement with the new Indigo/Emerald color scheme, refined typography, and comprehensive utilities. The layout ensures independent scrolling and mobile optimization for message input. Floating chat widgets are integrated for instant AI assistance.

The **Public Knowledge Base** (`/knowledge-base`) is a redesigned FAQ-style interface featuring a hero section with a search bar, visual category overview cards, an accordion layout for articles, and smart search capabilities. Articles open in new tabs (`/kb/{id}`) with share, print, and PDF export functionality. It includes "Popular" article badges and integrated AI support via a floating ChatWidget.

The **Staff Conversations Page** (`/conversations`) features a clean, mobile-first, 2-column layout on desktop that collapses to a single view on mobile. It includes a conversation list with search, status filtering, and unread tracking. The interface provides real-time updates via WebSockets and management controls for status and agent assignment.

### Technical Implementations
The backend is a Node.js Express.js application in TypeScript, providing a RESTful API with Zod validation and rate limiting. Authentication is session-based using Passport.js and Express sessions with a PostgreSQL store. A custom WebSocket server handles real-time communication. PostgreSQL is the database, accessed via Drizzle ORM, with Neon serverless for connection pooling. Authentication includes role-based access control (Admin, Agent, Customer) and anonymous customer support via `sessionId` and IP tracking.

### Feature Specifications
- **Real-time Communication**: Custom WebSocket server for chat, user presence, conversation routing, message broadcasting, and typing indicators. Closed conversations reopen on new messages, and system activity messages are broadcast. Customer chat uses HTTP polling.
- **AI Capabilities**: Multi-agent AI response system (OpenAI GPT-4o-mini) for intent classification, smart routing, and agent handoff based on confidence scores. Features include 4-dimensional quality analysis and an AI Learning Dashboard. Enhanced AI uses improved system prompts and RAG optimization (Phase 1 & 2) for retrieval logging, answer grounding, confidence thresholds, and optimized chunking.
  - **Centralized Brand Voice System**: Production-grade brand configuration system with a singleton `brand_config` table storing company identity, voice attributes, behavioral guidelines, and personality levels. This configuration is injected into every AI system prompt at runtime, managed via admin-only API endpoints.
  - **Performance Optimization**: Knowledge base retrieval is optimized for speed with reduced `maxResults`, increased `quality thresholds`, and tighter filter limits, aiming for 20-40% faster AI response times.
  - **Reference Links**: AI responses automatically include a "📚 Learn More:" section with clickable markdown links to the top 3 most relevant knowledge base articles, opening internal links in the same tab.
  - **Persistent Vector Database**: Migrated to PostgreSQL with `pgvector` for persistent storage of knowledge chunks and OpenAI embeddings in the `knowledge_chunks` table, ensuring zero cold-start delays and efficient similarity search.
- **AI Management (Consolidated)**:
    - **AI Configuration** (`/ai-configuration`): Central hub for creating, editing, and deleting AI agents, configuring system prompts, temperature, max tokens, response formats, and monitoring performance.
    - **AI Performance Insights** (`/ai-performance`): Unified analytics dashboard for monitoring AI performance, testing agents, tracking learning analytics, and reviewing quality scores.
    - **Human Oversight** (`/human-oversight`): Real-time monitoring of active AI conversations with intervention capabilities.
- **Knowledge Base Integration**: AI performs intelligent query analysis, multi-tiered search, context-aware responses, and transparent handoff. Automatically analyzes uploaded documents (TXT, PDF, DOCX) to extract metadata, generate FAQs, and suggest agent assignments.
  - **Automatic Indexing**: All uploaded documents are automatically chunked (400-word segments) and indexed with vector embeddings immediately upon upload and persisted to PostgreSQL using `pgvector`, ensuring instant searchability and re-indexing upon updates.
- **Rich Media Input**: Supports file attachments (drag-drop, multi-file), universal camera capture, emoji picker, and voice-to-text.
- **User Identification**: IP-based customer identification and `sessionId` tracking for returning users.
- **Unread Tracking & Notifications**: Comprehensive system for tracking message read status, unread counts, and real-time notifications with optimistic badge clearing, visual message highlighting, batch read status lookup, and WebSocket synchronization.
- **AI Learning System**: Production-grade active learning pipeline for continuous AI improvement from human feedback. Features a four-table infrastructure (`aiMessageFeedback`, `aiCorrections`, `knowledgeGaps`, `aiTrainingQueue`), a "Teach AI" feature for staff corrections, a Training Queue Dashboard for admin review and approval, and confidence-based gap detection.
- **Conversation Rating & Feedback**: Customer 1-5 star ratings and feedback with AI-powered sentiment analysis.
- **Staff Performance Tracking**: Tracks agent metrics (conversations handled, closure rates, ratings, AI sentiment scores).
- **Activity Notifications**: Notifies staff of mentions, tags, reminders, and assignments.
- **Customer Portal**: Authenticated self-service access to support history, profile management, and feedback.
- **External Channel Integration**: Supports WhatsApp Business API, Telegram Bot, and Facebook Messenger via webhooks.
- **Third-Party Integration API**: RESTful API for embedding support chat with pre-filled customer data, custom context, and multi-tenant support.
- **Category-Based Customer Routing**: Customers pre-select their support category before starting a conversation. Categories are fully customizable via the admin UI (`/support-categories`) with the ability to:
  - Create, edit, and delete categories with custom names, icons, colors, and descriptions
  - Toggle category visibility to show/hide from customer selection
  - Link categories to specific AI agents for specialized routing
  - Configure suggested questions per category
  - Categories are fetched dynamically from the API (`/api/support-categories/public`) with fallback to defaults
  - Selected category is passed as `contextData` to enable specialized AI agent routing throughout the chat experience

## Color Palette (New Design)
- **Primary Indigo**: 243° 100% 40% (bright, professional, trustworthy)
- **Accent Emerald**: 160° 84% 39% (success, AI-generated responses, growth)
- **Highlight Amber**: 45° 93% 51% (attention, important information, warmth)
- **Neutral Backgrounds**: 240° 10% (minimal saturation for calm, clean appearance)
- Applies consistently across light mode and dark mode variants

## External Dependencies

- **Database**: PostgreSQL (Neon serverless)
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Validation**: Zod
- **AI Services**: OpenAI GPT-4o-mini
- **Emoji Picker**: emoji-picker-react
