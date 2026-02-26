# Nova AI - Your Intelligent Support Companion

## Overview
Nova AI is a multi-tenant customer support platform designed to optimize real-time chat, conversation management, and administrative tasks. It supports various user roles (admin, agent, customer) and features conversation assignment, status tracking, priority management, and analytics. Key capabilities include an internal staff chat, an anonymous customer chat widget, an AI-powered knowledge base, and a multi-agent AI system for intent classification and routing. The platform aims to enhance customer interaction and agent productivity through a robust, multi-region architecture, focusing on a comprehensive B2B solution.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React 18, TypeScript, Vite, Radix UI, and Tailwind CSS (shadcn/ui pattern) for a custom, theme-aware design (light/dark modes). The customer chat features a Perplexity-style interface with a hero input, progressive disclosure, suggested questions, and visual feature cards. Design elements include an Indigo-Emerald-Amber color scheme, refined typography, independent scrolling, and mobile optimization. The Public Knowledge Base has tab navigation and category filters, and the Staff Conversations Page uses a clean, mobile-first 2-column layout. All pages are responsive and support PWA features.

### Technical Implementations
The backend is a Node.js Express.js application in TypeScript, providing a RESTful API with Zod validation and rate limiting. Authentication is session-based using Passport.js and Express sessions, with role-based access control and anonymous customer support. A custom WebSocket server handles real-time communication. PostgreSQL, accessed via Drizzle ORM and Neon serverless, is the primary database.

### Coding Standards (see STANDARDS.md for full detail)
- **Frontend HTTP calls**: All API requests must use `apiRequest(url, method, data?)` from `client/src/lib/queryClient.ts`. Raw `fetch()` is never used in components or service files. Service functions in `client/src/lib/api.ts` wrap `apiRequest`.
- **Backend authentication**: Staff routes use `requireAuth`/`requireRole` from `server/auth.ts`. Customer portal routes are protected by a single `app.use('/api/customer-portal', requireCustomerAuth)` middleware from `server/middleware/customerAuth.ts` — no inline session checks inside handlers.
- **Zod validation errors**: All catch blocks must use `zodErrorResponse(error)` from `server/middleware/errors.ts` to produce consistent `{ error, details }` 400 responses.
- **Global error handler**: `globalErrorHandler` from `server/middleware/errors.ts` is registered last in `registerRoutes` and normalizes all unhandled errors.
- **Route structure**: New routes go in `server/routes/<domain>.routes.ts`. The legacy `server/routes.ts` monolith is not extended with new code.

### Workspace Architecture
The platform supports a hierarchical multi-tenant architecture: Platform Admins → Organizations (with parent-child sub-org hierarchy) → Workspaces → Departments → Users/Customers/Stations. Multi-region and reseller support is enabled. Knowledge collections allow content sharing across workspaces with defined visibility levels. Both staff and customer sessions track `selectedOrganizationId` for multi-org context switching.

### Feature Specifications
- **Real-time Communication**: Custom WebSocket server for chat, presence, routing, and typing indicators.
- **AI Capabilities**: A multi-agent AI system (OpenAI GPT-5) for intent classification, smart routing, agent handoff, and agentic tool use with a Centralized Brand Voice System and enhanced RAG optimization. Conversational Intelligence provides customer memory, sentiment analysis, and conversation tracking.
  - **Agentic AI System**: Autonomous AI agents with OpenAI function calling for multi-step reasoning and action execution. Features a configurable tool registry (DB-backed `ai_tools` table with 10 system tools + custom per-org tools), per-agent tool assignments (`ai_agent_tools`), configurable guardrails (`ai_guardrails` with content filters, action allow/blocklists, rate limits, topic restrictions, escalation rules), agent workflows (`ai_workflows` with trigger-based decision trees), multi-channel input connections (`ai_agent_connections` for chat/email/form/webhook), and multi-agent chaining (`ai_agent_chains` with intent/keyword/condition routing, handoff/consult/parallel delegation modes). External tools support API calls with auth (bearer/api_key), request templates, and response mapping. Safety gating uses 75% confidence threshold for destructive actions plus per-agent guardrail enforcement.
  - **Specialized AI Agents**: Categorized agents (Sales, Support, Billing, General) with custom greetings, knowledge collection linking, and Perplexity API integration for external real-time research when the knowledge base lacks answers. Includes rate limiting and citation tracking.
  - **Enhanced RAG System**: Hybrid search (keyword + semantic), MMR reranking, confidence scoring with a 70% human takeover threshold, and optimized chunking. Advanced capabilities include multi-turn memory, voice optimization, self-correcting retrieval, multi-hop reasoning, tiered retrieval, hallucination detection, confidence calibration, time-aware retrieval, and negative retrieval.
- **Knowledge Base Integration**: AI analyzes documents (TXT, PDF, DOCX) for metadata, FAQ generation, and vector embedding, with automatic hourly reindexing.
- **Rich Media Input**: Supports file attachments, camera capture, emoji picker, and voice-to-text.
- **AI Learning System**: Active learning pipeline for continuous AI improvement from human feedback.
- **Email Support Integration**: Comprehensive email integration with IMAP/SMTP, Gmail, or Outlook accounts for polling, AI-powered email analysis (intent, sentiment, priority), auto-response generation, automatic ticket creation, templates, and auto-reply rules.
- **External Channel Integration**: Supports WhatsApp Business API, Telegram Bot, and Facebook Messenger.
- **White-Label Branding**: Customizable chat widget branding and dynamic PWA manifest generation.
- **Category-Based Customer Routing**: Customizable support categories for specialized AI agent routing.
- **Platform Assistant AI**: Intelligent assistant for navigation, KB queries, and administrative actions.
- **AI Documentation Generator**: Generates setup guides for new integrations.
- **Automatic Message Translation**: Bi-directional translation for human agent conversations.
- **Documentation Framework**: Enterprise-grade structured documentation system for AI agents with controlled vocabulary, versioning, RBAC, and an atomic document pipeline.
- **Resolution History Tracking**: Tracks successful issue resolutions per customer, with AI injecting proven solutions, issue categorization, and outcome tracking.
- **Troubleshooting Workflows**: Guided decision-tree workflows for structured agent assistance.
- **Customer Organizations (Business Accounts)**: Multi-user business accounts for customer portal access with role-based access.
- **B2B Landing Page**: Professional landing page with Hero, Features, How It Works, Testimonials, Organization Marketplace, Pricing, and Footer. Includes staff login, organization signup, and customer registration forms.
- **Organization Applications**: Formal business application workflow with duplicate detection and status tracking.
- **AI-Powered Legal Policies**: OpenAI-powered generator for Terms of Service, Privacy Policy, and Cookie Policy across 9 regions.
- **First-Time User Onboarding**: Interactive welcome page and PWA installation instructions.
- **Quantum-Inspired Optimization**: Deterministic multi-factor optimization engine for intelligent customer routing (skill match, availability, workload, performance, affinity) and AI learning enhancement.
- **Cloud Storage Marketplace**: Admin page for connecting Google Drive, OneDrive, and Dropbox for automatic knowledge base file syncing, using OAuth 2.0.
- **Embed Widget Security**: Ensures multi-tenant isolation through organization-scoped customers, token-based authentication using embed secrets, and strict cross-tenant protection.
- **API Integration Admin Page**: Self-service console for managing embed secrets, generating embed code snippets, and accessing documentation.
- **AI Data Access RBAC**: Role-based access control for AI assistance with external database integration, including a detailed RBAC schema, intent classification, access enforcement, external database connectors (Azure SQL, Cosmos DB, AWS RDS, DynamoDB), and audit logging.
- **Billing & Usage Analytics**: Multi-level AI token usage tracking with role-based visibility (personal, organization, platform), including token counts, cost estimates, request counts, and model breakdown, with date range filtering.
- **Progressive Web App (PWA)**: Full mobile app experience with a service worker, install prompt, mobile navigation, pull-to-refresh, safe area insets, touch optimization, and standalone mode.
- **Enterprise Deployment Features**: Production-ready monitoring, webhooks, and data management, including a system monitoring dashboard, rate limiting dashboard, webhook integration system, custom domain support, and data export system.
- **Partner Integration Marketplace**: Third-party integration system (like Intercom) with a marketplace catalog (`partner_integrations`), org-level connections with API key auth (`organization_partner_connections`), and a public REST API (`/api/partner/v1/`) for external systems (e.g., RapidRMS POS) to auto-register stations and users. Supports idempotent upserts, bulk registration, activation tokens for portal access, and station/user deactivation. Admin routes for managing partner catalog and org connections with API key rotation.
- **Resolution Memory System**: Intelligent learning from past resolutions with 6 DB tables (`resolution_steps`, `resolution_learnings`, `station_resolution_memory`, `image_error_signatures`, `ai_sensitive_data_rules`, `ai_data_access_log`). Features include: step-by-step resolution tracking with outcome analysis, learning extraction (what_worked/what_failed/what_to_avoid/prerequisite/tip), station-level memory for location-specific solutions, org-wide pattern matching via issue signatures, and automatic injection of proven solutions into AI response pipeline before generating new answers.
- **Image Error Detection (OCR)**: OpenAI Vision API integration for analyzing error screenshots. Error pattern normalization (replaces IPs, UUIDs, timestamps with placeholders), three-tier solution matching (exact match -> similar match -> AI-generated fallback), error signature storage with confidence scoring, and automatic solution retrieval from resolution memory.
- **AI Data Protection & Safety**: Comprehensive sensitive data protection with 12 pre-seeded system rules (passwords, API keys, credit cards, SSN, bearer tokens, private keys, connection strings, etc.). Features pre-response blocking of sensitive data requests, post-response sanitization via regex pattern matching, security system prompt injection into all AI agents, encrypted data storage (AES-256-GCM), data access audit logging, and admin CRUD for custom org-level protection rules. API routes at `/api/admin/sensitive-data-rules` and `/api/admin/data-access-log`.

## External Dependencies

- **Database**: PostgreSQL (Neon serverless)
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Validation**: Zod
- **AI Services**: OpenAI GPT-5, OpenAI TTS-1, Perplexity API
- **Emoji Picker**: emoji-picker-react