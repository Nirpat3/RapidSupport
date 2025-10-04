# Support Board - Customer Support Platform

## Overview
Support Board is a full-stack customer support platform enabling real-time chat, conversation management, and an admin dashboard. It supports multiple user roles (admin, agent, customer) with features like conversation assignment, status tracking, priority management, comprehensive dashboard analytics, internal staff chat, and an anonymous customer chat widget. The platform aims to provide a modern, efficient, and user-friendly solution for customer service operations, including AI-powered knowledge base search and advanced rich media input capabilities.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with React 18 and TypeScript, using Vite for development. It leverages Radix UI components styled with Tailwind CSS, following a shadcn/ui pattern for a custom design system with light/dark theme support. State management is handled by React Query, routing by Wouter, and form handling with React Hook Form and Zod for validation.

### Backend Architecture
The backend is a Node.js Express.js application written in TypeScript. It features a RESTful API with rate limiting and Zod schema validation. Authentication is handled by Passport.js with a local strategy and bcrypt for hashing, and session management uses Express sessions with a PostgreSQL store. A custom WebSocket server provides real-time communication for chat functionalities. Security includes CSRF protection, HTTP-only cookies, and secure headers.

### Database Architecture
PostgreSQL is used as the database, accessed via Drizzle ORM for type-safe operations. The relational schema includes tables for users, customers, conversations, messages, posts, comments, likes, views, and attachment storage. Anonymous customer support is managed through customer matching logic based on business details and IP tracking. Drizzle Kit is used for schema migrations, and Neon serverless PostgreSQL provides connection pooling.

### Authentication & Authorization
The platform uses session-based authentication with role-based access control (Admin, Agent, Customer) and anonymous customer support. Anonymous customer sessions are tracked via `sessionId`. Security measures include bcrypt for password hashing, secure session configuration, CSRF protection, and PII-safe logging.

### Real-time Features
A custom WebSocket server facilitates real-time chat for both staff and customers. It includes connection management, user presence tracking, conversation-based message routing, real-time message broadcasting with delivery status, and typing indicators. An anonymous customer widget supports information collection and session persistence.

### AI Capabilities
The system includes an AI response system for intelligent customer support, capable of detecting vague queries and generating knowledge-based solutions. An AI Training Live Q&A feature allows staff to interactively train AI agents, submit corrections to knowledge base articles, and track version history. Public-facing knowledge base search is available with AI-powered article recommendations.

### Rich Media Input System
The customer chat features a rich media input system supporting file attachments (drag-drop, multi-file upload up to 15 files/10MB each), universal camera capture (getUserMedia() with live preview, rear camera preference, proper error handling), an emoji picker, and voice-to-text via the Web Speech API. File attachments are stored in a dedicated `attachments` table.

### User Experience Enhancements
The customer chat features a Perplexity-style redesign with a prominent hero input for immediate question entry, progressive disclosure of customer information (collected after the first message), suggested questions, and visual feature cards. Session persistence is managed via localStorage. A "Continue Conversation Card" is prominently displayed for returning users to manually resume existing chats.

### Unread Tracking & Notifications
A comprehensive unread tracking system monitors message read status per user, utilizing a `messageReads` join table. Backend APIs provide unread counts and allow marking messages as read. WebSocket broadcasts `unread_count_update` events for real-time UI updates, with features like unread count badges and browser tab title updates.

### Feed Module
A comprehensive feed module allows for post creation with form validation, visibility controls (internal/all_customers/targeted), urgent flags, optional links, and images. It includes database schemas for posts, comments, likes, and views, with a UI for post listing and filtering.

## External Dependencies

- **Database**: PostgreSQL (Neon serverless)
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS
- **Fonts**: Google Fonts (Inter, DM Sans, Fira Code, Geist Mono)
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Validation**: Zod
- **Development Tools**: Vite
- **Emoji Picker**: emoji-picker-react