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

### Technical Implementations
The backend is a Node.js Express.js application in TypeScript, providing a RESTful API with Zod validation and rate limiting. Authentication is session-based using Passport.js (local strategy, bcrypt for hashing) and Express sessions with a PostgreSQL store. A custom WebSocket server facilitates real-time communication. PostgreSQL is the database, accessed via Drizzle ORM, with Neon serverless for connection pooling. Authentication includes role-based access control (Admin, Agent, Customer) and anonymous customer support via `sessionId` and IP tracking, with a granular permission system for staff access control.

### Feature Specifications
- **Real-time Communication**: Custom WebSocket server for chat, user presence, conversation routing, message broadcasting, and typing indicators. Closed conversations automatically reopen upon new messages, and system activity messages (e.g., status changes) are broadcast to all participants.
- **AI Capabilities**: Multi-agent AI response system (OpenAI GPT-4o-mini) for intent classification (sales, technical, billing, general), smart routing to specialized agents, and agent handoff based on confidence scores. Features include 4-dimensional quality analysis, an AI Learning Dashboard, and continuous improvement. Enhanced AI intelligence uses improved system prompts with explicit formatting guidelines. RAG Optimization (Phase 1 & 2) includes enhanced retrieval logging, answer grounding with source citations, confidence thresholds to prevent hallucinations, improved search parameters, metadata-aware filtering, query rewriting, MMR diversity filtering, and an optimized chunking strategy.
- **Knowledge Base Integration**: AI performs intelligent query analysis, multi-tiered search (keyword, semantic), context-aware responses, and transparent handoff. AI automatically analyzes uploaded documents (TXT, PDF, DOCX) to extract metadata, generate FAQs, and suggest agent assignments.
  - **Automatic Indexing (Latest)**: All uploaded documents are automatically chunked (400-word segments with intelligent section splitting) and indexed with vector embeddings immediately upon upload. This ensures documents are instantly searchable by AI without manual intervention. Automatic re-indexing occurs when articles are updated. Indexing includes: intelligent content chunking based on document structure (headers, paragraphs), OpenAI embeddings generation for semantic search, caching for performance, and error handling with non-blocking fallback. Documents are immediately available for AI responses after upload, eliminating the "consult with colleagues" responses caused by un-indexed documents.
- **Rich Media Input**: Supports file attachments (drag-drop, multi-file), universal camera capture, emoji picker, and voice-to-text.
- **User Identification**: IP-based customer identification and `sessionId` tracking for returning users and "Continue Conversation" cards.
- **Unread Tracking & Notifications**: Comprehensive system for tracking message read status, providing unread counts, and real-time notifications. Sidebar and tab badges display conversation counts (unread vs. total).
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