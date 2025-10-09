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

### User Permission System
A comprehensive granular permission system allows administrators to control staff access at the feature level. Each user can have permissions set for individual features with three levels: Hidden (feature is completely hidden from user), View (read-only access), and Edit (full access). Admins have full access to all features by default. The system includes a User Management page accessible only to admins, where permissions can be assigned per user per feature. The sidebar dynamically shows/hides menu items based on user permissions. Permission checking is enforced both on the frontend (UI hiding) and backend (API authorization).

### Real-time Features
A custom WebSocket server facilitates real-time chat for both staff and customers. It includes connection management, user presence tracking, conversation-based message routing, real-time message broadcasting with delivery status, and typing indicators. An anonymous customer widget supports information collection and session persistence.

### AI Capabilities
The system includes an AI response system for intelligent customer support, capable of detecting vague queries and generating knowledge-based solutions. Customer chat pages feature automatic AI response triggering - when a customer sends a message, the system automatically generates and displays an AI response with a realistic typing indicator (2-4 second delay). An AI Training Live Q&A feature allows staff to interactively train AI agents, submit corrections to knowledge base articles, and track version history. Public-facing knowledge base search is available with AI-powered article recommendations. Personalized suggested questions are dynamically generated based on customer conversation history, IP address, and sessionId, using AI to create contextual follow-up questions that relate to previously discussed topics.

### Rich Media Input System
The customer chat features a rich media input system supporting file attachments (drag-drop, multi-file upload up to 15 files/10MB each), universal camera capture (getUserMedia() with live preview, rear camera preference, proper error handling), an emoji picker, and voice-to-text via the Web Speech API. File attachments are stored in a dedicated `attachments` table.

### User Experience Enhancements
The customer chat features a Perplexity-style redesign with a prominent hero input for immediate question entry, progressive disclosure of customer information (collected after the first message), suggested questions, and visual feature cards. Session persistence is managed via localStorage. A "Continue Conversation Card" is prominently displayed for returning users to manually resume existing chats.

### IP-Based User Identification
The system automatically identifies returning customers using IP address detection. When a customer visits the support page, their IP is captured and checked against existing conversations. The system uses a priority-based fallback: first checking sessionId (localStorage), then matching by IP address for broader identification. The user's IP address is transparently displayed in both the hero view and chat header. When a returning customer is detected via IP match, the continue conversation card displays "(Identified by IP address)" messaging. This provides convenience for returning users while maintaining transparency about the identification method.

### Unread Tracking & Notifications
A comprehensive unread tracking system monitors message read status per user, utilizing a `messageReads` join table. Backend APIs provide unread counts and allow marking messages as read. WebSocket broadcasts `unread_count_update` events for real-time UI updates, with features like unread count badges and browser tab title updates.

### Feed Module
A comprehensive feed module allows for post creation with form validation, visibility controls (internal/all_customers/targeted), urgent flags, optional links, and images. It includes database schemas for posts, comments, likes, and views, with a UI for post listing and filtering.

### Conversation Rating & Feedback System
The platform includes a comprehensive conversation rating and feedback system to track customer satisfaction and agent performance. When a conversation is closed by staff, customers are presented with a rating dialog where they can provide a 1-5 star rating, optional written feedback, and contact information for follow-up. The system uses AI-powered sentiment analysis via OpenAI to analyze conversation tone and customer satisfaction, generating scores for sentiment (0-100), customer tone assessment, and resolution quality. All ratings are stored in a dedicated `conversationRatings` table with support for anonymous submissions.

### Staff Performance Tracking
A robust staff performance analytics system tracks detailed agent metrics including total conversations handled, primary vs. contributed conversations, closure rates, average ratings (with distribution across 1-5 stars), AI sentiment analysis scores, and message counts. Performance stats are calculated for customizable time periods and stored in the `agentPerformanceStats` table. The system provides both individual agent performance views (accessible by agents for their own stats) and admin-only aggregate views showing all agents' performance metrics for comparison and management insights.

### Activity Notifications System
A comprehensive activity notifications system enables staff to receive alerts for mentions, tags, reminders, assignments, and other important events. The system features a dedicated Activity page accessible via the sidebar Bell icon, displaying all notifications with search and filtering capabilities. Notifications support multiple types (mention, tag, reminder, assignment, comment, system) and include navigation links to source content. Real-time unread count badges appear in the sidebar, updating automatically every 30 seconds. The Activity page provides mark-as-read functionality, bulk operations (mark all read), and notification deletion. All notification icons use lucide-react components for consistent theming across light/dark modes.

### Customer Portal
A dedicated customer portal provides authenticated customers with self-service access to their support history and account management. The portal features a login system accessible from the customer chat page, session-based authentication with hasPortalAccess validation, and a comprehensive dashboard displaying conversation stats and recent activity. Customers can manage their profile information (name, email, company, phone) and change passwords. The conversations page shows complete conversation history with status filtering (open, closed, all) and the ability to start new conversations. The feedback page displays all submitted feedback on closed conversations with ratings and comments. The portal uses a dedicated layout with navigation between Dashboard, Profile, Conversations, Feedback, and Feed pages. Staff can review and analyze all customer feedback through the Feedback Evaluation page in the staff interface. All portal routes are protected with customer session validation, and the system includes backend API endpoints for stats retrieval, profile updates, password changes, and feedback management.

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