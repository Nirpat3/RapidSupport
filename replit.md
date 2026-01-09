# Support Board - Customer Support Platform

## Overview
Support Board is a full-stack customer support platform designed for real-time chat, comprehensive conversation management, and administrative oversight. It supports various user roles (admin, agent, customer) and offers features such as conversation assignment, status tracking, priority management, and dashboard analytics. The platform includes internal staff chat, an anonymous customer chat widget, an AI-powered knowledge base with image extraction, and advanced rich media input to create an efficient and user-friendly customer service experience. The project aims to provide a robust solution for enhancing customer interaction and agent productivity.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend utilizes React 18, TypeScript, and Vite, built with Radix UI and Tailwind CSS following a shadcn/ui pattern for a custom, theme-aware design system (light/dark modes). The customer chat features a Perplexity-style interface with a hero input, progressive disclosure, suggested questions, and visual feature cards. The design incorporates an Indigo-Emerald-Amber color scheme, refined typography, independent scrolling, and mobile optimization. Floating chat widgets are integrated for AI assistance.

The Public Knowledge Base features a redesigned interface with tab navigation (Popular Articles/All Articles), category filter chips, and enhanced article cards. The "Popular Articles" tab displays the top 50 most-viewed articles sorted by usageCount, while "All Articles" shows all articles alphabetically. Article cards display metadata including category tags, last updated time, view count, and helpfulness percentage. Category filters work across both tabs. Search results show articles directly with all metadata. Article dialogs include print functionality and feedback buttons (thumbs up/down) for rating article helpfulness. The ChatWidget provides AI support.

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
    - **Conversational Intelligence System**: Advanced AI-powered customer understanding with:
        - **Customer Memory**: Persistent memory system tracking preferences, device types, past issues, and interaction patterns with confidence scores. Memories are automatically extracted from conversations and injected into AI prompts for personalized responses.
        - **Sentiment Analysis**: Real-time emotion detection analyzing frustration (0-100), urgency, satisfaction, and primary emotion. Automatic escalation triggers when frustration ≥ 75.
        - **Conversation Intelligence Tracking**: Monitors intent sequences, solution attempts, topic evolution, and proactive opportunities per conversation.
        - **Voice Emotion Detection**: Analyzes transcript word choice and patterns to infer emotional state during voice conversations.
        - **Database Tables**: customer_memory, sentiment_tracking, conversation_intelligence, proactive_suggestions
        - **Non-Blocking Processing**: Intelligence runs asynchronously (Promise.all) to avoid slowing response times
- **AI Management**: A central hub for configuring AI agents, monitoring performance, and overseeing human intervention in AI conversations.
- **Knowledge Base Integration**: AI analyzes uploaded documents (TXT, PDF, DOCX) to extract metadata, generate FAQs, and suggest agent assignments. Documents are automatically chunked and indexed with vector embeddings in PostgreSQL.
- **Rich Media Input**: Supports file attachments (drag-drop, multi-file), camera capture, emoji picker, and voice-to-text.
- **Voice Recognition Vocabulary Correction**: Domain-specific vocabulary correction system for voice input accuracy:
    - **Industry Vocabulary**: 30+ pre-defined industry terms (PAX, POS, EMV, NFC, API, etc.) with common misheard aliases
    - **Fuzzy Matching**: Levenshtein distance algorithm with 75% confidence threshold for automatic correction
    - **Multi-word Phrase Support**: Recognizes and corrects two-word phrases like "PAX terminal" and "POS system"
    - **KB Keywords Integration**: Automatically extracts keywords from knowledge base articles via `/api/knowledge-base/keywords`
    - **Custom Vocabulary**: Admin UI in Settings page to add/remove custom terms with aliases, persisted in localStorage
    - **Visual Feedback**: Correction indicator in VoiceConversationDialog shows what terms were auto-corrected with tooltip details
    - **Voice Modes**: Push-to-Talk (150ms hold threshold) and Continuous Listening (2500ms silence detection) with localStorage persistence
- **User Identification**: IP-based identification and `sessionId` tracking for returning customers.
- **Unread Tracking & Notifications**: Comprehensive system for tracking message read status, unread counts, and real-time notifications with WebSocket synchronization.
- **AI Learning System**: An active learning pipeline for continuous AI improvement from human feedback, including a "Teach AI" feature and a Training Queue Dashboard.
- **Conversation Rating & Feedback**: Customers can provide 1-5 star ratings and feedback with AI-powered sentiment analysis.
- **Staff Performance Tracking**: Monitors agent metrics such as conversations handled, closure rates, and ratings.
- **Activity Notifications**: Notifies staff of mentions, tags, reminders, and assignments.
- **Customer Portal**: Authenticated self-service access for support history, profile management, and feedback.
- **External Channel Integration**: Supports WhatsApp Business API, Telegram Bot, and Facebook Messenger via webhooks.
- **Third-Party Integration API**: A RESTful API for embedding support chat with pre-filled customer data and multi-tenant support.
- **White-Label Branding**: Vendors can customize the chat widget with their own logo, colors, and welcome message. Organizations are configured via the admin Branding page (/branding) and applied to the customer chat via URL parameter (`/chat?org=<slug>`). Branding includes: logo URL, primary/secondary colors, and custom welcome messages. The PWA manifest is dynamically generated based on the `org` URL parameter, so when customers install the app, it uses the vendor's name, logo, and theme color.
- **Category-Based Customer Routing**: Customizable support categories allow customers to pre-select their issue, enabling specialized AI agent routing. Categories can be linked to specific AI agents and configured with suggested questions.
- **Mobile-First Responsive Design**: All pages use responsive grid patterns (grid-cols-1 sm:grid-cols-2 lg:grid-cols-4/5) for optimal mobile experience. Tab navigation uses horizontal scrolling on mobile.
- **PWA Support**: The app is installable as a Progressive Web App with manifest.json, theme colors (#6366f1), and app shortcuts. Install instructions available at /install-app.
- **Platform Assistant AI**: An intelligent assistant for navigation and learning that can query knowledge base articles (returns metadata only for security), execute admin actions (create workspaces, support categories), and guide users through the platform.
- **AI Documentation Generator**: Generates comprehensive setup guides for new integrations (WhatsApp Business, Facebook Messenger, Instagram DM) using OpenAI GPT-4o-mini with parallelized generation.
- **Automatic Message Translation**: Bi-directional translation pipeline for human agent conversations. Customer messages are automatically translated to English for agents; agent responses are translated to the customer's selected language. Messages store both original and translated content with originalLanguage metadata. UI provides a translation toggle button to view original text. Uses OpenAI with graceful fallback to original content on translation failure.
- **SEO Optimization**: sitemap.xml (public routes only) and robots.txt configured to block private paths while allowing public content indexing.
- **Automatic Knowledge Base Reindexing**: Scheduled hourly processing of stale articles with vector embedding updates. Includes admin API endpoints for manual control and a secure webhook for external system triggers (rate-limited, timestamp validation, secret authentication).
- **Documentation Framework**: Enterprise-grade structured documentation system separate from knowledge base, designed for AI agent integration. Features include:
    - **Controlled Vocabulary**: Domains (subject categories) and Intents (document purposes like How-To, Reference, Troubleshooting) with auto-creation from imports
    - **Semver Versioning**: Documents support semantic versioning with draft/published/archived states
    - **RBAC Access Control**: roleAccess array + isPublic flag with workspace scoping
    - **Document Relationships**: Link documents with relationship types (depends_on, related_to, emits, consumes)
    - **Atomic Document Pipeline**: One upload → AI splits into MULTIPLE atomic knowledge units (300-800 words each). Pipeline: Upload PDF/DOCX/TXT → Text extraction → Section analysis → Atomic doc generation → Taxonomy resolution → Review queue → Publish
    - **AI Actions**: Documents can include executable actions (aiActions array) that AI agents can perform (e.g., restart_service, check_status)
    - **Review Workflow**: AI-generated content goes through approval queue before publishing with approve/reject buttons
    - **Enhanced AI Export**: `/api/docs/ai-export` supports filtering by domain (name or ID), intent, role, status, isPublic, and aiAgentId. Returns AI-ready format with content, metadata, and relationships
    - **Vector Embeddings**: Document chunks stored with embeddings for RAG retrieval by AI agents
    - **Taxonomy Auto-Creation**: Domain/intent strings from AI are resolved to existing taxonomy IDs or auto-created
    - **Database Tables**: doc_domains, doc_intents, documents (with aiActions field), document_versions, document_relationships, document_review_queue, document_import_jobs, document_chunks
    - **API Endpoints**: /api/docs/domains, /api/docs/intents, /api/docs/documents, /api/docs/versions, /api/docs/relationships, /api/docs/review-queue, /api/docs/ai-export, /api/docs/import-jobs/upload

## External Dependencies

- **Database**: PostgreSQL (Neon serverless)
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Validation**: Zod
- **AI Services**: OpenAI GPT-4o-mini
- **Emoji Picker**: emoji-picker-react