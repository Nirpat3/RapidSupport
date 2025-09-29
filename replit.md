# Support Board - Customer Support Platform

## Overview

Support Board is a modern, full-stack customer support platform built with React and Node.js. It provides real-time chat capabilities, conversation management, and an admin dashboard for seamless customer service operations. The platform supports multiple user roles (admin, agent, customer) with features like conversation assignment, status tracking, priority management, comprehensive dashboard analytics, internal staff chat for agent-to-agent communication, and an anonymous customer chat widget for public customer support.

## Recent Changes

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