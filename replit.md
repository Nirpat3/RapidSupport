# Nova AI - Your Intelligent Support Companion

## Overview
Nova AI is a multi-tenant customer support platform designed to optimize real-time chat, conversation management, and administrative tasks. It supports various user roles (admin, agent, customer) and features conversation assignment, status tracking, priority management, and analytics. Key capabilities include an internal staff chat, an anonymous customer chat widget, an AI-powered knowledge base, and a multi-agent AI system for intent classification and routing. The platform aims to enhance customer interaction and agent productivity through a robust, multi-region architecture, focusing on a comprehensive B2B solution.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React 18, TypeScript, Vite, Radix UI, and Tailwind CSS (shadcn/ui pattern) for a custom, theme-aware design (light/dark modes). The customer chat features a Perplexity-style interface with a hero input, progressive disclosure, suggested questions, and visual feature cards. Design elements include an Indigo-Emerald-Amber color scheme, refined typography, independent scrolling, and mobile optimization. The Public Knowledge Base has tab navigation and category filters, and the Staff Conversations Page uses a clean, mobile-first 2-column layout. All pages are responsive and support PWA features. Dual PWA support is implemented for staff and customer portals, each with distinct theming and shortcuts.

### Technical Implementations
The backend is a Node.js Express.js application in TypeScript, providing a RESTful API with Zod validation and rate limiting. Authentication is session-based using Passport.js and Express sessions, with role-based access control and anonymous customer support. A custom WebSocket server handles real-time communication. PostgreSQL, accessed via Drizzle ORM and Neon serverless, is the primary database. Security hardening is implemented using Helmet.js, production error sanitization, and DOMPurify.

### Workspace Architecture
The platform supports a hierarchical multi-tenant architecture: Platform Admins → Organizations (with parent-child sub-org hierarchy) → Workspaces → Departments → Users/Customers/Stations. Multi-region and reseller support is enabled. Knowledge collections allow content sharing across workspaces with defined visibility levels. Both staff and customer sessions track `selectedOrganizationId` for multi-org context switching.

### Feature Specifications
- **Real-time Communication**: Custom WebSocket server for chat, presence, routing, and typing indicators.
- **AI Capabilities**: A multi-agent AI system (OpenAI GPT-5) for intent classification, smart routing, agent handoff, and agentic tool use with a Centralized Brand Voice System and enhanced RAG optimization. Conversational Intelligence provides customer memory, sentiment analysis, and conversation tracking. This includes specialized AI agents for different categories, an enhanced RAG system with hybrid search and advanced retrieval methods, and an AI learning system for continuous improvement.
  - **Agentic AI System**: Autonomous AI agents with OpenAI function calling for multi-step reasoning and action execution. Features a configurable tool registry, per-agent tool assignments, configurable guardrails, agent workflows, multi-channel input connections, and multi-agent chaining. External tools support API calls with authentication.
- **Knowledge Base Integration**: AI analyzes documents (TXT, PDF, DOCX) for metadata, FAQ generation, and vector embedding, with automatic hourly reindexing.
- **Email Support Integration**: Comprehensive email integration with IMAP/SMTP, Gmail, or Outlook accounts for polling, AI-powered email analysis, auto-response generation, automatic ticket creation, templates, and auto-reply rules.
- **External Channel Integration**: Supports WhatsApp Business API, Telegram Bot, and Facebook Messenger.
- **Platform Assistant AI (Nova)**: Upgraded intelligent assistant using OpenAI GPT-4o with function calling tools to fetch real-time platform stats, list resources, execute platform tasks, and search documentation.
- **AI Data Protection & Safety**: Comprehensive sensitive data protection with pre-seeded and custom rules, pre-response blocking, post-response sanitization, security system prompt injection, encrypted data storage, and data access audit logging.
- **Resolution Memory System**: Intelligent learning from past resolutions with step-by-step tracking, learning extraction, station-level memory, and automatic injection of proven solutions into AI response pipelines.
- **Image Error Detection (OCR)**: OpenAI Vision API integration for analyzing error screenshots, error pattern normalization, three-tier solution matching, and automatic solution retrieval.
- **Communication Module**: Full internal communication system for both staff and customer portal, including Announcements, Feed, Community (channels), and Messages (DMs).
- **Customer Organizations**: Multi-user business accounts for customer portal access with role-based access, including a B2B landing page and organization application workflow.
- **Partner Integration Marketplace**: Third-party integration system with a marketplace catalog, org-level connections, and a public REST API for external systems to manage stations and users.
- **Billing & Usage Analytics**: Multi-level AI token usage tracking with role-based visibility, including token counts, cost estimates, request counts, and model breakdown.
- **Enterprise Deployment Features**: Production-ready monitoring, webhooks, and data management, including a system monitoring dashboard, rate limiting dashboard, webhook integration system, custom domain support, and data export system.

## External Dependencies

- **Database**: PostgreSQL (Neon serverless)
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Validation**: Zod
- **AI Services**: OpenAI GPT-5, OpenAI TTS-1, Perplexity API
- **Emoji Picker**: emoji-picker-react