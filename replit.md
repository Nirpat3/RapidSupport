# Support Board - Customer Support Platform

## Overview
Support Board is a full-stack customer support platform designed for real-time chat, conversation management, and comprehensive administrative oversight. It supports multiple user roles (admin, agent, customer) and features conversation assignment, status tracking, priority management, and detailed dashboard analytics. The platform includes an internal staff chat, an anonymous customer chat widget, an AI-powered knowledge base search, and advanced rich media input. Its purpose is to deliver a modern, efficient, and user-friendly customer service solution, enhancing customer interaction and operational efficiency.

## User Preferences
Preferred communication style: Simple, everyday language.

## Navigation Structure

### AI Management (Consolidated)
The platform features a streamlined AI management interface with three focused sections:

1. **AI Configuration** (`/ai-configuration`): Central hub for creating, editing, and deleting AI agents. Configure system prompts, temperature settings, max tokens, response formats, and monitor individual agent performance. Consolidates the former "AI Agents" and "Agent Management" pages.

2. **AI Performance Insights** (`/ai-performance`): Unified analytics dashboard for monitoring AI performance metrics across all agents. View conversation statistics, test agent responses, track learning analytics, and review quality scores. Consolidates the former "Staff AI Dashboard", "AI Training", and "AI Learning" pages.

3. **Human Oversight** (`/human-oversight`): Real-time monitoring of active AI conversations with the ability to intervene and take manual control when needed. View confidence scores, message counts, and initiate handoffs. Formerly known as "AI Takeover", renamed for clarity.

## System Architecture

### UI/UX Decisions
The frontend uses React 18, TypeScript, and Vite, leveraging Radix UI components with Tailwind CSS in a shadcn/ui pattern for a custom design system supporting light/dark themes. The customer chat features a Perplexity-style redesign with a prominent hero input, progressive disclosure of customer information, suggested questions, and visual feature cards. Design aesthetics are Apple/Stripe-like, utilizing SF Pro/Inter font stacks, refined letter-spacing, layered subtle shadows, elegant border radii, and comprehensive typography utilities. The layout ensures independent scrolling for conversation lists and chat interfaces across devices, and mobile message input has been optimized for small screens. Floating chat widgets are integrated into the main page and knowledge base for instant AI assistance.

**Public Knowledge Base** (`/knowledge-base`): Redesigned as a comprehensive FAQ-style interface serving as the primary self-service support destination. Features include:
- **Hero Section**: Gradient background with prominent "Knowledge Base" heading and full-width search bar for instant article discovery
- **Category Overview Cards**: Visual grid showcasing all categories with article counts, clickable for smooth scroll navigation to category sections
- **Accordion Layout**: Expandable category sections containing organized article cards, with first category auto-expanded by default for immediate content visibility
- **Smart Search**: Real-time filtering across article titles, categories, tags, and content with clear button and results summary
- **Article Links**: Articles open in new tabs at `/kb/{id}` with ExternalLink icons, enabling easy sharing and multitasking
- **Empty State Handling**: Helpful messaging when no articles exist or search yields no results
- **Usage Indicators**: "Popular" badges on frequently-accessed articles (usage count > 10) to highlight valuable content
- **Integrated AI Support**: Floating ChatWidget provides instant AI assistance alongside browsable articles
- **Mobile-Responsive**: Optimized layout and spacing for all screen sizes

**Article Detail Page** (`/kb/:id`): Dedicated page for viewing individual knowledge base articles with:
- **Share Functionality**: One-click button to copy article URL to clipboard with visual confirmation and toast notification
- **Print Support**: Optimized print layout with proper formatting and article metadata
- **PDF Export**: Save as PDF button for offline access
- **Navigation**: Back button to return to previous page
- **Rich Content**: Full HTML rendering with proper typography and spacing
- **Metadata Display**: Category badges, tags, and last updated date
- **Print-Optimized**: Hidden controls and enhanced layout for printed/PDF versions

**Staff Conversations Page** (`/conversations`): Redesigned with a clean, mobile-first approach featuring a 2-column layout (conversation list + chat area) on desktop that collapses to a single view on mobile (< 768px). The interface includes:
- **Conversation List**: Sidebar (320-384px wide) with search, status filtering, and scrollable list. Each conversation displays customer avatar, name, message preview, status icon, timestamp, and priority indicator.
- **Unread Tracking**: Visual indicators include red badge with count on avatar, bold text for unread conversations, and accent background. Conversations are automatically marked as read when viewed.
- **Mobile Navigation**: Single view mode that switches between list and chat with a back button to return to list.
- **Real-time Updates**: WebSocket integration for live message updates and unread count synchronization.
- **Management Controls**: Status dropdown (open, pending, resolved, closed) and agent assignment selector in chat header.
- **Safe Search**: Search filter safely handles missing customer data and message content with fallback empty strings.

### Technical Implementations
The backend is a Node.js Express.js application in TypeScript, providing a RESTful API with Zod validation and rate limiting. Authentication is session-based using Passport.js (local strategy, bcrypt for hashing) and Express sessions with a PostgreSQL store. A custom WebSocket server facilitates real-time communication. PostgreSQL is the database, accessed via Drizzle ORM, with Neon serverless for connection pooling. Authentication includes role-based access control (Admin, Agent, Customer) and anonymous customer support via `sessionId` and IP tracking, with a granular permission system for staff access control.

### Feature Specifications
- **Real-time Communication**: Custom WebSocket server for chat, user presence, conversation routing, message broadcasting, and typing indicators. Closed conversations automatically reopen upon new messages, and system activity messages (e.g., status changes) are broadcast to all participants. Customer chat uses HTTP polling with cache-control headers to prevent 304 responses. Staff messages (scope='public') and AI messages are properly differentiated in customer chat responses (senderType='agent' for staff, 'ai' for AI system).
- **AI Capabilities**: Multi-agent AI response system (OpenAI GPT-4o-mini) for intent classification (sales, technical, billing, general), smart routing to specialized agents, and agent handoff based on confidence scores. Features include 4-dimensional quality analysis, an AI Learning Dashboard, and continuous improvement. Enhanced AI intelligence uses improved system prompts with explicit formatting guidelines. RAG Optimization (Phase 1 & 2) includes enhanced retrieval logging, answer grounding with source citations, confidence thresholds to prevent hallucinations, improved search parameters, metadata-aware filtering, query rewriting, MMR diversity filtering, and an optimized chunking strategy.
  - **Centralized Brand Voice System**: Production-grade brand configuration system that maintains consistent tone and style across all AI interactions. Features include: singleton `brand_config` table storing company identity (name, industry), voice attributes (tone, voice, style), behavioral guidelines (do/don't lists, preferred/avoided terms), personality levels (formality 1-10, empathy 1-10, technical depth 1-10), few-shot example interactions, and active/inactive toggle. Brand voice is automatically injected into every AI system prompt at runtime, ensuring immediate consistency without server restarts. Admin-only API endpoints (GET/PUT `/api/brand-config`) enable centralized management of AI personality and communication standards.
  - **Performance Optimization (Latest)**: Knowledge base retrieval optimized for speed with reduced maxResults (10→5-6 across all query types), increased quality thresholds (minScore: 0.25-0.35), and tighter filter limits. Expected performance improvement of ~20-40% in AI response times while maintaining answer quality.
  - **Reference Links (Latest)**: AI responses now automatically include a "📚 Learn More:" section with clickable markdown links to the top 3 most relevant knowledge base articles. Links use markdown syntax `[Article Title](/kb/{id})` and are rendered as clickable elements in the frontend. Internal links open in the same tab for seamless navigation. Articles are deduplicated by ID to ensure unique recommendations.
  - **Persistent Vector Database (Production-Grade RAG)**: Migrated from in-memory embeddings to PostgreSQL with pgvector extension for persistent vector storage. Knowledge chunks and their 1536-dimensional OpenAI embeddings are now stored in the `knowledge_chunks` table, eliminating the need to regenerate embeddings on every server restart. Benefits include: zero cold-start delays, consistent performance across deployments, automatic persistence of all indexed documents, efficient vector similarity search using PostgreSQL native operators (<=> cosine distance), and scalable architecture ready for production workloads.
- **Knowledge Base Integration**: AI performs intelligent query analysis, multi-tiered search (keyword, semantic), context-aware responses, and transparent handoff. AI automatically analyzes uploaded documents (TXT, PDF, DOCX) to extract metadata, generate FAQs, and suggest agent assignments.
  - **Automatic Indexing**: All uploaded documents are automatically chunked (400-word segments with intelligent section splitting) and indexed with vector embeddings immediately upon upload. Embeddings are persisted to the PostgreSQL database using pgvector, ensuring documents remain instantly searchable across server restarts without re-indexing. Automatic re-indexing occurs when articles are updated. Indexing includes: intelligent content chunking based on document structure (headers, paragraphs), OpenAI embeddings generation for semantic search, database persistence for reliability, and error handling with non-blocking fallback. Documents are immediately and permanently available for AI responses after upload.
- **Rich Media Input**: Supports file attachments (drag-drop, multi-file), universal camera capture, emoji picker, and voice-to-text.
- **User Identification**: IP-based customer identification and `sessionId` tracking for returning users and "Continue Conversation" cards.
- **Unread Tracking & Notifications**: Comprehensive system for tracking message read status, providing unread counts, and real-time notifications. Features include:
  - **Optimistic Badge Clearing**: Unread count badges clear instantly when clicking a conversation, with automatic rollback on error to ensure UI consistency
  - **Visual Message Highlighting**: Unread incoming messages display with subtle ring and shadow effects, excluding own messages and system messages
  - **Efficient Read Status**: Batch lookup using `inArray` for per-user, per-message read tracking via `messageReadStatus` table
  - **Real-time Sync**: Sidebar and tab badges display conversation counts (unread vs. total), with WebSocket updates for live synchronization
  - **Mark-as-Read API**: POST endpoint automatically creates read status records when conversation is viewed, enriching messages API with `isRead` flags
- **Feed Module**: Allows post creation with visibility controls, urgent flags, links, images, comments, likes, and views.
- **Conversation Rating & Feedback**: Customers provide 1-5 star ratings and feedback, with AI-powered sentiment analysis.
- **Staff Performance Tracking**: Tracks agent metrics (conversations handled, closure rates, ratings, AI sentiment scores).
- **Activity Notifications**: Notifies staff of mentions, tags, reminders, and assignments.
- **Customer Portal**: Provides authenticated customers with self-service access to support history, profile management, and feedback.
- **External Channel Integration**: Supports WhatsApp Business API, Telegram Bot, and Facebook Messenger via webhooks.
- **Third-Party Integration API**: A RESTful API endpoint enables external applications to embed support chat with pre-filled customer data, custom context data, and multi-tenant support using API key authentication and rate limiting.
- **AI Configuration**: Consolidated interface for creating, editing, and deleting AI agents, configuring system prompts, temperature, max tokens, response formats, and monitoring performance (replaces separate AI Agents and Agent Management pages).
- **AI Performance Insights**: Unified dashboard for monitoring AI performance metrics, testing agents, and reviewing learning analytics (consolidates Staff AI Dashboard, AI Training, and AI Learning pages into one comprehensive view).
- **Human Oversight**: Monitor active AI conversations and take control when needed (formerly AI Takeover, renamed for clarity).

## External Dependencies

- **Database**: PostgreSQL (Neon serverless)
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Validation**: Zod
- **AI Services**: OpenAI GPT-4o-mini
- **Emoji Picker**: emoji-picker-react