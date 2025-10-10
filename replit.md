# Support Board - Customer Support Platform

## Overview
Support Board is a full-stack customer support platform designed for real-time chat, conversation management, and comprehensive administrative oversight. It supports multiple user roles (admin, agent, customer) and features conversation assignment, status tracking, priority management, and detailed dashboard analytics. Key capabilities include an internal staff chat, an anonymous customer chat widget, an AI-powered knowledge base search, and advanced rich media input. The platform aims to deliver a modern, efficient, and user-friendly customer service solution with a business vision to enhance customer interaction and operational efficiency.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend utilizes React 18, TypeScript, and Vite. It employs Radix UI components styled with Tailwind CSS, following a shadcn/ui pattern for a custom design system that supports light/dark themes. The customer chat features a Perplexity-style redesign with a prominent hero input, progressive disclosure of customer information, suggested questions, and visual feature cards.

### Technical Implementations
The backend is a Node.js Express.js application in TypeScript, offering a RESTful API with Zod validation and rate limiting. Authentication is session-based using Passport.js (local strategy, bcrypt for hashing) and Express sessions with a PostgreSQL store. A custom WebSocket server enables real-time communication. PostgreSQL is the database, accessed via Drizzle ORM, with Neon serverless for connection pooling. Authentication includes role-based access control (Admin, Agent, Customer) and anonymous customer support via `sessionId` and IP tracking. A granular permission system allows admins to control staff access at the feature level (Hidden, View, Edit).

### Feature Specifications
- **Real-time Communication**: Custom WebSocket server for chat, user presence, conversation routing, message broadcasting, and typing indicators.
- **AI Capabilities**: Multi-agent AI response system (OpenAI GPT-4o-mini) for intent classification (sales, technical, billing, general), smart routing to specialized agents (Sales, Technical, Billing, General Support), and agent handoff based on confidence scores. It includes 4-dimensional quality analysis for AI responses, an AI Learning Dashboard for analytics, and continuous improvement mechanisms.
- **Knowledge Base Integration**: AI performs intelligent query analysis, multi-tiered search (keyword, semantic), context-aware responses prioritizing knowledge base content, and transparent handoff to human agents when confidence is low.
- **Rich Media Input**: Supports file attachments (drag-drop, multi-file), universal camera capture, emoji picker, and voice-to-text.
- **User Identification**: IP-based customer identification for returning users, coupled with `sessionId` tracking, for displaying "Continue Conversation" cards.
- **Unread Tracking & Notifications**: Comprehensive system for tracking message read status, providing unread counts, and real-time notifications via WebSockets.
- **Feed Module**: Allows post creation with visibility controls, urgent flags, links, images, and supports comments, likes, and views.
- **Conversation Rating & Feedback**: Enables customers to provide 1-5 star ratings and feedback, with AI-powered sentiment analysis and tracking of quality, tone, relevance, and completeness.
- **Staff Performance Tracking**: Tracks agent metrics (conversations handled, closure rates, ratings, AI sentiment scores) for individual and aggregate views.
- **Activity Notifications**: Notifies staff of mentions, tags, reminders, assignments, with a dedicated Activity page for management.
- **Customer Portal**: Provides authenticated customers with self-service access to support history, profile management, conversation history, and feedback.
- **External Channel Integration**: Supports WhatsApp Business API, Telegram Bot, and Facebook Messenger via webhooks for multi-channel customer support, with HMAC signature/secret token verification.
- **Agent Management System**: Admin interface for creating, editing, and deleting AI agents, configuring system prompts, temperature, max tokens, response format, and monitoring performance.

## External Dependencies

- **Database**: PostgreSQL (Neon serverless)
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Validation**: Zod
- **AI Services**: OpenAI GPT-4o-mini
- **Emoji Picker**: emoji-picker-react