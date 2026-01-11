# Nova AI - Your Intelligent Support Companion

## Overview
Nova AI is a comprehensive, multi-tenant customer support platform designed to optimize real-time chat, conversation management, and administrative tasks. It supports various user roles (admin, agent, customer) and features conversation assignment, status tracking, priority management, and analytics. Key capabilities include an internal staff chat, an anonymous customer chat widget, an AI-powered knowledge base with advanced rich media input, and a multi-agent AI system for intent classification and routing. The platform aims to enhance customer interaction and agent productivity through a robust, multi-region architecture with a focus on a comprehensive B2B solution.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend is built with React 18, TypeScript, Vite, Radix UI, and Tailwind CSS (shadcn/ui pattern), offering a custom, theme-aware design (light/dark modes). The customer chat features a Perplexity-style interface with a hero input, progressive disclosure, suggested questions, and visual feature cards. The design employs an Indigo-Emerald-Amber color scheme, refined typography, independent scrolling, and mobile optimization. The Public Knowledge Base includes tab navigation and category filters. The Staff Conversations Page has a clean, mobile-first 2-column layout on desktop. All pages are responsive and support PWA features.

### Technical Implementations
The backend is a Node.js Express.js application in TypeScript, providing a RESTful API with Zod validation and rate limiting. Authentication is session-based using Passport.js and Express sessions, with role-based access control (Admin, Agent, Customer) and anonymous customer support. A custom WebSocket server handles real-time communication. PostgreSQL, accessed via Drizzle ORM and Neon serverless, is the primary database.

### Workspace Architecture
The platform supports a hierarchical architecture: Platform Admins → Organizations → Workspaces → Departments, with multi-region and reseller support. Knowledge collections allow content sharing across workspaces with defined visibility levels.

### Feature Specifications
- **Real-time Communication**: Custom WebSocket server for chat, presence, routing, and typing indicators.
- **AI Capabilities**: A multi-agent AI system (OpenAI GPT-5) for intent classification, smart routing, and agent handoff, with a Centralized Brand Voice System and enhanced RAG optimization. Conversational Intelligence provides customer memory, sentiment analysis, and conversation tracking.
- **Enhanced RAG System**: Industry-standard RAG with hybrid search (keyword + semantic), MMR reranking, confidence scoring with 70% human takeover threshold, and optimized chunking (300-500 words with 60-word overlap). Advanced capabilities include:
  - **Multi-Turn Memory**: Conversation context tracking with coreference resolution (resolves "it", "they", "that" to referenced entities)
  - **Voice Optimization**: Concise formatting for TTS, prosody hints, clarification prompts for ambiguous input
  - **Self-Correcting Retrieval**: Automatic query reformulation (up to 2 retries) when confidence <50%
  - **Multi-Hop Reasoning**: Decomposes complex queries into sub-queries (up to 3 hops) for information synthesis
  - **Tiered Retrieval**: Fast keyword-first search, semantic fallback only when needed (score <0.7 or <3 results)
  - **Hallucination Detection**: Citation verification, consistency checking, source grounding validation
  - **Confidence Calibration**: Tracks prediction accuracy by query type, adjusts confidence based on historical outcomes
  - **Time-Aware Retrieval**: Prioritizes recent articles, detects temporal relevance in queries
  - **Negative Retrieval**: Detects knowledge gaps and generates appropriate "I don't know" responses
- **Knowledge Base Integration**: AI analyzes documents (TXT, PDF, DOCX) for metadata, FAQ generation, and vector embedding. Includes automatic hourly reindexing.
- **Rich Media Input**: Supports file attachments, camera capture, emoji picker, and voice-to-text.
- **AI Learning System**: Active learning pipeline for continuous AI improvement from human feedback.
- **External Channel Integration**: Supports WhatsApp Business API, Telegram Bot, and Facebook Messenger.
- **White-Label Branding**: Customizable chat widget branding and dynamic PWA manifest generation.
- **Category-Based Customer Routing**: Customizable support categories for specialized AI agent routing.
- **Platform Assistant AI**: Intelligent assistant for navigation, KB queries, and administrative actions.
- **AI Documentation Generator**: Generates setup guides for new integrations.
- **Automatic Message Translation**: Bi-directional translation for human agent conversations.
- **Documentation Framework**: Enterprise-grade structured documentation system for AI agents with controlled vocabulary, versioning, RBAC, and an atomic document pipeline.
- **Resolution History Tracking**: Tracks successful issue resolutions per customer, with AI injecting proven solutions. Supports issue categorization and outcome tracking, with multi-tenant scoping.
- **Troubleshooting Workflows**: Guided decision-tree workflows for structured agent assistance, integrating with conversation views.
- **Customer Organizations (Business Accounts)**: Multi-user business accounts for customer portal access with role-based access ('admin', 'member') and multi-tenant scoping.
- **B2B Landing Page**: Professional landing page with Hero, Features, How It Works, Testimonials, Organization Marketplace, Pricing, and Footer. Includes staff login, organization signup, and customer registration forms.
- **Organization Applications**: Formal business application workflow with duplicate detection and status tracking.
- **AI-Powered Legal Policies**: OpenAI-powered generator for Terms of Service, Privacy Policy, and Cookie Policy across 9 regions, with admin interface and public display.
- **First-Time User Onboarding**: Interactive welcome page and PWA installation instructions for new users with a "Getting Started Checklist."
- **Quantum-Inspired Optimization**: Deterministic multi-factor optimization engine for intelligent customer routing (skill match, availability, workload, performance, affinity) and AI learning enhancement, with multi-tenant scoping.
- **Cloud Storage Marketplace**: Admin page allowing workspace users to connect Google Drive, OneDrive, and Dropbox for automatic knowledge base file syncing, with OAuth 2.0 authentication and multi-tenant isolation.
- **Embed Widget Security**: Ensures multi-tenant isolation through organization-scoped customers, token-based authentication using organization-specific embed secrets, and strict cross-tenant protection for customer assignment.
- **API Integration Admin Page**: Self-service console (`/api-integration`) for managing embed secrets, generating embed code snippets (web, server-side, mobile), and accessing comprehensive documentation for integrating the support chat.

## External Dependencies

- **Database**: PostgreSQL (Neon serverless)
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Validation**: Zod
- **AI Services**: OpenAI GPT-5, OpenAI TTS-1
- **Emoji Picker**: emoji-picker-react