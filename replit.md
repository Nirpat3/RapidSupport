# Support Board - Customer Support Platform

## Overview

Support Board is a modern, full-stack customer support platform built with React and Node.js. It provides real-time chat capabilities, conversation management, and an admin dashboard for seamless customer service operations. The platform supports multiple user roles (admin, agent, customer) with features like conversation assignment, status tracking, priority management, comprehensive dashboard analytics, internal staff chat for agent-to-agent communication, and an anonymous customer chat widget for public customer support.

## Recent Changes

**October 4, 2025 (Latest Session)**
- ✅ **Rich Media Input System**: Complete customer chat enhancement with file attachments, camera capture, emoji picker, and voice-to-text
- ✅ **File Attachments**: Drag-drop and multi-file upload support (up to 15 files, 10MB each) for images (JPG, PNG, GIF, WebP) and documents (PDF, TXT, DOCX)
- ✅ **Camera Capture**: HTML5 camera integration for mobile devices to capture and send photos directly from chat
- ✅ **Emoji Picker**: emoji-picker-react integration with modern emoji support and search functionality
- ✅ **Voice-to-Text**: Web Speech API integration for hands-free message dictation with browser compatibility detection
- ✅ **File Preview & Display**: Inline image previews, download links for documents, proper file metadata (filename, size, type)
- ✅ **Start New Conversation**: Clear button to reset chat session and begin fresh conversation while preserving customer data
- ✅ **Support Page**: Public-facing knowledge base search with Perplexity-style interface and AI-powered article recommendations
- ✅ **Public API**: Unauthenticated `/api/public/support/search` endpoint for knowledge base queries without login
- ✅ **Attachment Storage**: Dedicated `attachments` table with foreign keys to messages, file metadata, and secure file serving
- ✅ **Critical Bug Fixes**: 
  - Fixed file-only message validation - uses '[Attachment]' placeholder for messages with only files
  - Resolved state race condition with pending files during customer creation flow
  - Added `.trim()` safeguards to ensure proper content validation
- ✅ **End-to-End Testing**: Comprehensive validation confirms all scenarios work (text-only, file-only, text+files for new and existing customers)

**October 4, 2025 (Previous Session)**
- ✅ **Perplexity-Style Customer Chat Redesign**: Complete UX overhaul with modern, conversion-optimized interface
- ✅ **Hero Input Experience**: Large prominent search input on /customer-chat allows immediate question entry without widget interaction
- ✅ **Progressive Disclosure**: Customer info collection moved AFTER first message (not before) to reduce friction and improve conversion
- ✅ **Suggested Questions**: Pre-written question buttons for common inquiries (password reset, pricing, upgrades, billing)
- ✅ **Feature Cards**: Visual trust indicators (Instant Answers, Secure & Private, Fast Response) on hero page
- ✅ **Session Persistence**: localStorage-based session management with automatic chat rehydration on page reload
- ✅ **CustomerInfoForm Enhancement**: Added "bare" mode for dialog usage with icon-prefixed inputs and cleaner design
- ✅ **Critical Bug Fix**: Resolved state race condition where first message was lost - now uses API response IDs directly
- ✅ **Clean Modern Design**: Perplexity-inspired minimal interface with rounded message bubbles, better spacing, professional typography
- ✅ **Mobile Responsive**: Sticky header and input, auto-scroll to latest messages, optimized for all screen sizes
- ✅ **End-to-End Testing**: Comprehensive validation confirms progressive disclosure, session persistence, and first message delivery all working correctly

**October 3, 2025**
- ✅ **AI Training Live Q&A Feature**: Implemented comprehensive live Q&A system for staff to interactively train AI agents
- ✅ **Database Schema**: Added `knowledgeBaseVersions` table with version tracking (version number, content snapshots, change reasons, editor info)
- ✅ **Backend APIs**: 
  - POST /api/ai-training/ask - Ask questions to AI agents and receive responses with source file tracking
  - POST /api/ai-training/correct - Submit corrections that update knowledge base articles with automatic version creation and learning entry logging
  - GET /api/knowledge-base/:id/versions - Retrieve version history for knowledge base articles
- ✅ **Frontend Q&A Interface**: Built Live Q&A tab in AI Training page with agent selector, question input, response display with confidence scores, and source files list showing which KB articles were used
- ✅ **Correction Workflow**: Implemented QACorrectionForm component allowing staff to suggest corrections to source articles directly from Q&A responses
- ✅ **Version Control System**: All knowledge base updates create version snapshots with change reasons for full audit trail
- ✅ **Learning Analytics**: Corrections automatically create learning entries linking to affected KB articles for comprehensive training analytics
- ✅ **Type-Safe Implementation**: Fully typed interfaces (QAResponse with sources and relevance scores) ensure compile-time safety

**October 2, 2025**
- ✅ **Message-Level Unread Tracking System**: Implemented comprehensive unread notification system with per-message read tracking
- ✅ **Database Schema**: Added messageReads join table with composite unique constraint (messageId, userId) to track read status for each message
- ✅ **Backend API**: Added GET /api/unread-counts endpoint returning conversation-level unread counts and PUT /api/conversations/:id/mark-read for marking messages as read
- ✅ **Auto-Read Logic**: Messages automatically marked as read for sender when created; all messages marked as read when conversation is opened
- ✅ **Real-time Updates**: WebSocket broadcasts 'unread_count_update' events to affected users, triggering automatic UI updates via query cache invalidation
- ✅ **Frontend UI Features**: Unread count badges on conversation list items, browser tab title showing total unread count "(N) Support Board", auto-mark-as-read on conversation open
- ✅ **End-to-End Testing**: Comprehensive Playwright testing confirms all notification features work correctly including real-time updates, badge display, and read persistence

**October 1, 2025**
- ✅ **Staff Notification Bug Fixed**: Resolved critical issue where staff weren't receiving notifications when customers replied to assigned conversations
- ✅ **WebSocket Notification Logic**: Now correctly notifies assigned agent + all admins for assigned conversations, and all staff for unassigned conversations
- ✅ **Assign Agent Button Fixed**: Button now properly calls the takeover API and assigns conversations to the current user
- ✅ **Button Implementation**: Added loading state, success/error toasts, and automatic cache invalidation after assignment
- ✅ **End-to-End Validation**: Comprehensive testing confirms both notification delivery and conversation assignment work correctly

**September 30, 2025**
- ✅ **Feed Post Creation Complete**: Implemented comprehensive post creation dialog with form validation, security measures, and full functionality
- ✅ **Security Hardening**: Added URL protocol validation (http/https only) on both client and server to prevent XSS and phishing attacks
- ✅ **Form Features**: Content validation (max 5000 chars), visibility controls (internal/all_customers/targeted), urgent flag, optional links and images
- ✅ **End-to-End Testing**: Verified post creation flow with admin login, form submission, cache invalidation, and proper tab filtering
- ✅ **Feed Module Backend Complete**: Database schema (posts, comments, likes, views), storage layer, and API routes fully implemented
- ✅ **Feed Page UI Complete**: Built complete Feed page with post list, tab filtering (All/Staff Only/Urgent), error handling, and type-safe implementation
- ✅ **Routing Conflicts Resolved**: Fixed route ordering using regex patterns - UUID routes use `:id([0-9a-f-]{36})`, filter routes use `:filter(all|internal|urgent)?` and are positioned after all :id routes

**September 29, 2025**
- ✅ **AI Response System Enhancement**: Successfully implemented and refined vague query detection system for intelligent customer support
- ✅ **Automated AI Response Generation**: Fixed critical bug where AI responses weren't automatically generated when customers sent messages - now triggers automatically
- ✅ **Smart Query Analysis**: AI now correctly differentiates between vague queries (requiring clarification) and specific queries (providing knowledge-based solutions)
- ✅ **Enhanced AI Prompt Logic**: Rewrote AI decision-making prompt with mandatory step-by-step strategy to eliminate ambiguity between clarification vs solution responses
- ✅ **End-to-End Validation**: Comprehensive testing confirms both vague and specific query handling work correctly with real-time WebSocket communication
- ✅ **Application Status**: Fully functional customer support system with intelligent AI assistant providing contextual responses

**September 27, 2025**
- ✅ **TypeScript Error Resolution**: Successfully resolved all 16+ LSP diagnostics in the storage layer
- ✅ **Drizzle ORM Fixes**: Applied `$dynamic()` method to conditional query building in `getAiLearningEntries`, `getAllCustomers`, and `getAllUploadedFiles` methods
- ✅ **Interface Alignment**: Fixed interface mismatches and added missing database fields (followupDate, errorMessage)
- ✅ **Zero Breaking Changes**: All existing API contracts maintained - routes already handled paginated responses correctly

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite for development and building
- **UI Framework**: Radix UI components with Tailwind CSS for styling
- **State Management**: React Query (TanStack Query) for server state management and caching
- **Routing**: Wouter for client-side routing
- **Component Architecture**: Component-based design with reusable UI components following shadcn/ui patterns
- **Design System**: Custom design system with light/dark theme support, consistent spacing, and professional color palette
- **Form Handling**: React Hook Form with Zod validation for type-safe forms

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy and bcrypt for password hashing
- **Session Management**: Express sessions with PostgreSQL session store
- **API Design**: RESTful API with rate limiting and input validation using Zod schemas
- **Real-time Communication**: WebSocket server for live chat functionality
- **Security**: CSRF protection, HTTP-only cookies, secure headers, and input sanitization

### Database Architecture
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Design**: Relational schema with users, customers, conversations, and messages tables supporting both authenticated and anonymous interactions
- **Anonymous Support**: Customer matching logic based on business name and contact details, IP address tracking, and session management
- **Migration System**: Drizzle Kit for database schema migrations
- **Connection**: Neon serverless PostgreSQL with connection pooling

### Authentication & Authorization
- **Strategy**: Session-based authentication with role-based access control plus anonymous customer support
- **Roles**: Admin, agent, and customer roles with different permission levels, plus anonymous customer sessions
- **Security**: Password hashing with bcrypt, secure session configuration, CSRF protection, and PII-safe logging
- **Session Storage**: PostgreSQL-backed session store for scalability with sessionId tracking for anonymous customers

### Real-time Features
- **WebSocket Implementation**: Custom WebSocket server for real-time chat supporting both staff and customer communications
- **Connection Management**: User presence tracking and conversation-based message routing for authenticated and anonymous users
- **Message Delivery**: Real-time message broadcasting with delivery status tracking across all user types
- **Typing Indicators**: Live typing status updates between participants
- **Anonymous Customer Widget**: Public chat widget with information collection and session persistence

## External Dependencies

- **Database**: PostgreSQL (Neon serverless) for data persistence
- **UI Components**: Radix UI primitives for accessible, unstyled components
- **Styling**: Tailwind CSS for utility-first styling with custom design tokens
- **Fonts**: Google Fonts (Inter, DM Sans, Fira Code, Geist Mono) for typography
- **Icons**: Lucide React for consistent iconography
- **Date Handling**: date-fns for date formatting and manipulation
- **Validation**: Zod for runtime type checking and schema validation
- **Development Tools**: Vite for fast development builds and HMR
- **Deployment**: Replit-optimized configuration with runtime error overlay