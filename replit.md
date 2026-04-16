# Nova AI - Your Intelligent Support Companion

## Overview
Nova AI is a multi-tenant customer support platform designed to optimize real-time chat, conversation management, and administrative tasks. It supports various user roles and features conversation assignment, status tracking, priority management, and analytics. Key capabilities include an internal staff chat, an anonymous customer chat widget, an AI-powered knowledge base, and a multi-agent AI system for intent classification and routing. The platform aims to enhance customer interaction and agent productivity through a robust, multi-region architecture, focusing on a comprehensive B2B solution with significant market potential for optimizing customer service operations.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React 18, TypeScript, Vite, Radix UI, and Tailwind CSS (shadcn/ui pattern) for a custom, theme-aware design (light/dark modes). The customer chat features a Perplexity-style interface with a hero input, progressive disclosure, suggested questions, and visual feature cards. Design elements include an Indigo-Emerald-Amber color scheme, refined typography, independent scrolling, and mobile optimization. The Public Knowledge Base has tab navigation and category filters, and the Staff Conversations Page uses a clean, mobile-first 2-column layout. All pages are responsive and support PWA features with dual PWA support for staff and customer portals, each with distinct theming and shortcuts.

### Technical Implementations
The backend is a Node.js Express.js application in TypeScript, providing a RESTful API with Zod validation and rate limiting. Authentication is session-based using Passport.js and Express sessions, with role-based access control and anonymous customer support. A custom WebSocket server handles real-time communication. PostgreSQL, accessed via Drizzle ORM and Neon serverless, is the primary database. Security hardening is implemented using Helmet.js, production error sanitization, and DOMPurify.

### System Design Choices
The platform supports a hierarchical multi-tenant architecture: Platform Admins → Organizations (with parent-child sub-org hierarchy) → Workspaces → Departments → Users/Customers/Stations. Multi-region and reseller support is enabled. Knowledge collections allow content sharing across workspaces with defined visibility levels. Both staff and customer sessions track `selectedOrganizationId` for multi-org context switching.

### Feature Specifications
- **Real-time Communication**: Custom WebSocket server for chat, presence, routing, and typing indicators.
- **AI Capabilities**: A multi-agent AI system (OpenAI GPT-5) for intent classification, smart routing, agent handoff, and agentic tool use with a Centralized Brand Voice System and enhanced RAG optimization. Conversational Intelligence provides customer memory, sentiment analysis, and conversation tracking. This includes specialized AI agents, an enhanced RAG system with hybrid search, and an AI learning system for continuous improvement. The Agentic AI System supports OpenAI function calling for multi-step reasoning, configurable tool registry, per-agent tool assignments, guardrails, workflows, multi-channel input, and multi-agent chaining.
- **Knowledge Base Integration**: AI analyzes documents (TXT, PDF, DOCX) for metadata, FAQ generation, and vector embedding, with automatic hourly reindexing. Cloud storage sync from Google Drive, OneDrive, and Dropbox keeps the knowledge base updated.
- **Email Support Integration**: Comprehensive email integration (IMAP/SMTP, Gmail, Outlook) for polling, AI-powered analysis, auto-response generation, automatic ticket creation, and templates.
- **External Channel Integration**: Supports WhatsApp Business API, Telegram Bot, and Facebook Messenger.
- **Two-Factor Authentication (TOTP/2FA)**: Full setup flow with QR code, manual key, backup codes, and login step.
- **Global Search Command Palette (Cmd+K)**: Unified search across conversations, customers, articles, and users.
- **CSAT Surveys**: Auto-triggered on conversation resolution with public survey page and admin analytics.
- **Saved Replies / Canned Responses**: Admin management and quick-pick dialog usage in chat.
- **Conversation Tags**: Freeform tagging on conversations with autocomplete and filtering.
- **Agent Status Selector**: Agents set status (Available/Busy/Away/Offline) via sidebar, broadcasted via WebSocket.
- **Audit Log Admin UI**: Filterable, paginated log showing entity, action, performer, timestamp, and diffs.
- **Conversation Merge**: Move messages from one conversation to another, closing the original.
- **SLA Management**: Configurable policies for priority, response/resolution times, and business hours, with auto-calculated deadlines.
- **Platform Assistant AI (Nova)**: Upgraded intelligent assistant using OpenAI GPT-4o with function calling tools to fetch real-time platform stats, resources, execute tasks, and search documentation.
- **AI Data Protection & Safety**: Comprehensive sensitive data protection with pre-seeded/custom rules, blocking, sanitization, security prompt injection, and encrypted storage.
- **Resolution Memory System**: Intelligent learning from past resolutions, step-by-step tracking, and automatic injection into AI response pipelines.
- **Image Error Detection (OCR)**: OpenAI Vision API integration for analyzing error screenshots, pattern normalization, and solution retrieval.
- **Communication Module**: Internal communication system for staff and customer portals, including Announcements, Feed, Community, and Messages (DMs).
- **Customer Organizations**: Multi-user business accounts for customer portal access with role-based access.
- **Partner Integration Marketplace**: Third-party integration system with a marketplace catalog, org-level connections, and a public REST API.
- **Billing & Usage Analytics**: Multi-level AI token usage tracking with role-based visibility, including costs, request counts, and model breakdown.
- **Enterprise Deployment Features**: Production-ready monitoring, webhooks, custom domain support, and data export.
- **Customer Contact Panel**: Right-side panel in conversation view showing customer profile, stats, history, context-aware KB suggestions, and agent notes.
- **Shre AI Automated Agent**: Configurable integration with Shre AI as an automated support agent with connection, behavior, and system prompt settings.
- **Ticket Comment System**: Per-ticket threaded comment system with public/internal notes and customer replies.
- **Customer Portal Tickets**: Customer-facing ticket list and detail view for managing and replying to tickets.
- **SMS & Email Notifications**: Twilio SMS and SendGrid email services for ticket lifecycle notifications with customer opt-in/out.
- **Multi-Channel Messaging Gateway**: Unified inbox integration for WhatsApp Business API, Telegram Bot, and Facebook Messenger.
- **Pre-Chat Intake Form**: Customer chat widget with category selection and info-gathering before conversation starts.
- **Reseller Management System**: Multi-tier reseller organization support with customer assignment and escalation mechanisms.
- **Native Agent PWA & Push Notifications**: Full PWA support with install prompts, granular per-agent notification preferences, quiet hours, and push subscription management.
- **Business Ownership Transfer**: Full transfer mechanism for business sales, including all data, with audit trail.
- **External App Linking (3rd Party Integration)**: Link customer organizations to external systems (Shopify, Salesforce) via identifiers for data lookup and webhook sync.
- **Customer Organization Hub**: Portal page showing org announcements/posts, member directory with DM capability, and business transfer UI for admins.

## External Dependencies

- **Database**: PostgreSQL (Neon serverless)
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Validation**: Zod
- **AI Services**: OpenAI GPT-5, OpenAI TTS-1, Perplexity API
- **Emoji Picker**: emoji-picker-react