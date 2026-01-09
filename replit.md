# Support Board - Customer Support Platform

## Overview
Support Board is a comprehensive customer support platform designed to streamline real-time chat, conversation management, and administrative tasks. It supports various user roles (admin, agent, customer) and offers features such as conversation assignment, status tracking, priority management, and analytics. The platform includes internal staff chat, an anonymous customer chat widget, an AI-powered knowledge base with image extraction, and advanced rich media input. It aims to enhance customer interaction and agent productivity through a robust, multi-tenant, multi-region architecture.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React 18, TypeScript, and Vite with Radix UI and Tailwind CSS (shadcn/ui pattern) for a custom, theme-aware design (light/dark modes). The customer chat features a Perplexity-style interface with a hero input, progressive disclosure, suggested questions, and visual feature cards. The design employs an Indigo-Emerald-Amber color scheme, refined typography, independent scrolling, and mobile optimization. The Public Knowledge Base has a redesigned interface with tab navigation (Popular Articles/All Articles), category filters, and enhanced article cards. The Staff Conversations Page features a clean, mobile-first 2-column layout on desktop.

### Technical Implementations
The backend is a Node.js Express.js application in TypeScript, providing a RESTful API with Zod validation and rate limiting. Authentication is session-based using Passport.js and Express sessions. A custom WebSocket server handles real-time communication. PostgreSQL, accessed via Drizzle ORM and Neon serverless, is the primary database. Authentication includes role-based access control (Admin, Agent, Customer) and anonymous customer support.

### Workspace Architecture
The platform supports a hierarchical architecture: Platform Admins → Organizations → Workspaces → Departments, with multi-region and reseller support. Core hierarchy tables manage regions, organizations, workspaces, and user assignments with roles. Multi-region support includes country-specific configurations and URL structuring. Knowledge collections allow for sharing content across workspaces with defined visibility levels. Organizations can view all conversations across their workspaces.

### Feature Specifications
- **Real-time Communication**: Custom WebSocket server for real-time chat, presence, routing, and typing indicators.
- **AI Capabilities**: A multi-agent AI system (OpenAI GPT-4o-mini) for intent classification, smart routing, and agent handoff, including a Centralized Brand Voice System and RAG optimization with a persistent `pgvector` database for knowledge chunks. Conversational Intelligence provides customer memory, sentiment analysis, and conversation tracking.
- **Knowledge Base Integration**: AI analyzes documents (TXT, PDF, DOCX) for metadata extraction, FAQ generation, and vector embedding for efficient retrieval.
- **Rich Media Input**: Supports file attachments, camera capture, emoji picker, and voice-to-text.
- **Voice Recognition Vocabulary Correction**: Domain-specific vocabulary correction using fuzzy matching and KB keyword integration.
- **User Identification**: IP-based identification and `sessionId` tracking.
- **Unread Tracking & Notifications**: Comprehensive system for message read status and real-time notifications.
- **AI Learning System**: Active learning pipeline for continuous AI improvement from human feedback.
- **Conversation Rating & Feedback**: Customer feedback with AI-powered sentiment analysis.
- **Staff Performance Tracking**: Monitors agent metrics.
- **Activity Notifications**: Notifies staff of mentions and assignments.
- **Customer Portal**: Authenticated self-service access.
- **External Channel Integration**: Supports WhatsApp Business API, Telegram Bot, and Facebook Messenger.
- **Third-Party Integration API**: RESTful API for embedding support chat.
- **White-Label Branding**: Customizable chat widget branding via URL parameters and dynamic PWA manifest generation.
- **Category-Based Customer Routing**: Customizable support categories for specialized AI agent routing.
- **Mobile-First Responsive Design**: All pages are responsive for optimal mobile experience.
- **PWA Support**: Installable Progressive Web App with manifest.json and app shortcuts.
- **Platform Assistant AI**: Intelligent assistant for navigation, KB queries, and administrative actions.
- **AI Documentation Generator**: Generates setup guides for new integrations.
- **Automatic Message Translation**: Bi-directional translation for human agent conversations using OpenAI.
- **SEO Optimization**: sitemap.xml and robots.txt configured for public content indexing.
- **Automatic Knowledge Base Reindexing**: Scheduled hourly processing of stale articles with vector embedding updates.
- **Documentation Framework**: Enterprise-grade structured documentation system for AI agents with controlled vocabulary, versioning, RBAC, document relationships, and an atomic document pipeline for AI export.
- **Resolution History Tracking**: Tracks successful issue resolutions per customer, enabling agents to see past solutions for recurring issues. AI automatically injects proven solutions into context for better suggestions. Supports issue categorization, solution sources (KB articles, manual steps, external links, agent actions), and outcome tracking (resolved, partially resolved, not resolved). Full multi-tenant scoping ensures data isolation between organizations.

## External Dependencies

- **Database**: PostgreSQL (Neon serverless)
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Validation**: Zod
- **AI Services**: OpenAI GPT-4o-mini
- **Emoji Picker**: emoji-picker-react