# Support Board - Customer Support Platform

## Overview
Support Board is a full-stack customer support platform designed for real-time chat, conversation management, and comprehensive administrative oversight. It supports multiple user roles (admin, agent, customer) and features conversation assignment, status tracking, priority management, and detailed dashboard analytics. Key capabilities include an internal staff chat, an anonymous customer chat widget, an AI-powered knowledge base search, and advanced rich media input. The platform aims to deliver a modern, efficient, and user-friendly customer service solution with a business vision to enhance customer interaction and operational efficiency.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend utilizes React 18, TypeScript, and Vite. It employs Radix UI components styled with Tailwind CSS, following a shadcn/ui pattern for a custom design system that supports light/dark themes. The customer chat features a Perplexity-style redesign with a prominent hero input, progressive disclosure of customer information, suggested questions, and visual feature cards.

**Recent UI/UX Improvements:**
- Support page Ask AI button repositioned from overlapping to adjacent layout for better mobile/tablet/desktop responsiveness
- Hero search: Button stacks below input on mobile, aligns horizontally on tablet/desktop
- Header search: Button positioned next to input with icon-only display on mobile, icon+text on desktop
- **Formatting Consistency**: Customer chat and staff UI now use unified message formatting. Both interfaces display AI responses with rich formatting including numbered lists, bullet points, clickable URLs, and proper paragraph spacing via shared `renderFormattedContent` utility.
- **Staff Conversation Header Cleanup**: Consolidated 10+ individual action buttons into a clean, organized dropdown menu with just 2 visible buttons (AI Toggle + Actions). The dropdown organizes actions into logical categories: Quick Actions (Create Ticket, Team Chat, Knowledge Base), Conversation (Schedule Follow-up, Assign to Me, Close), and Contact (Call, Video). All functionality preserved, including AI proofread in message composer. Schedule Follow-up converted from Popover to Dialog for better accessibility from dropdown menu.
- **Apple/Stripe-like Design System (Latest)**: Implemented premium design aesthetics throughout the app with SF Pro/Inter font stacks, refined letter-spacing (-0.011em to -0.015em for headlines), layered subtle shadows (replacing flat shadows), elegant border radii (12px/16px), and comprehensive typography utilities (text-display, text-headline, text-title, text-body, text-caption, text-label). Added transition helpers (transition-smooth, transition-smooth-slow) for consistent animations. All changes maintain backward compatibility with existing components.
- **Main Page ChatWidget**: Added floating chat widget on Support Center main page for instant AI-powered assistance. Features include: welcome screen with suggested questions, AI responses with knowledge base integration, related article cards displayed below responses, session-based conversation persistence via localStorage, error handling with user-friendly messages, loading states with typing indicator, and clean Apple/Stripe-inspired design with fixed bottom-right positioning.
- **Minimalistic Landing Pages (Latest)**: Redesigned SupportPage and CustomerChatPage for Google-like minimalism, reducing visual clutter by ~60%. Removed decorative icons, feature cards, trust indicators, and unnecessary text. Simplified search inputs, streamlined navigation, and created cleaner hero sections focused on core functionality.
- **Knowledge Base Floating Support (Latest)**: Added responsive floating chat widget to Customer Portal Knowledge Base page. Positioned in bottom-right corner with intelligent responsive sizing: mobile uses `min(28rem,calc(100vw-2rem))` width to prevent horizontal overflow, desktop uses standard 448px width. Height capped at 80vh to prevent content overlap on short screens. Widget maintains proper positioning across all device sizes with mobile (16px margins) and desktop (24px margins) spacing.
- **Independent Scrolling Fix (Latest)**: Fixed conversations page layout to provide completely independent scrolling for conversation list and chat interface. Main container now uses `h-screen overflow-hidden` for viewport-fixed height. Conversation list sidebar has overflow-hidden with tab content areas using `h-full overflow-y-auto` for independent scrolling. Chat interface maintains its own scroll region via ScrollArea component. Works seamlessly on both desktop (side-by-side) and mobile (full-screen toggle) layouts.

### Technical Implementations
The backend is a Node.js Express.js application in TypeScript, offering a RESTful API with Zod validation and rate limiting. Authentication is session-based using Passport.js (local strategy, bcrypt for hashing) and Express sessions with a PostgreSQL store. A custom WebSocket server enables real-time communication. PostgreSQL is the database, accessed via Drizzle ORM, with Neon serverless for connection pooling. Authentication includes role-based access control (Admin, Agent, Customer) and anonymous customer support via `sessionId` and IP tracking. A granular permission system allows admins to control staff access at the feature level (Hidden, View, Edit).

### Feature Specifications
- **Real-time Communication**: Custom WebSocket server for chat, user presence, conversation routing, message broadcasting, and typing indicators.
- **Auto-Reopen Closed Conversations (Latest)**: Closed conversations automatically reopen when new messages arrive from either customers or staff. Backend checks conversation status before message creation and updates status to 'open' if currently 'closed'. Frontend invalidates conversation list queries to reflect status changes in real-time. Reopened conversations automatically appear in Active tab and are removed from History tab.
- **AI Capabilities**: Multi-agent AI response system (OpenAI GPT-4o-mini) for intent classification (sales, technical, billing, general), smart routing to specialized agents (Sales, Technical, Billing, General Support), and agent handoff based on confidence scores. It includes 4-dimensional quality analysis for AI responses, an AI Learning Dashboard for analytics, and continuous improvement mechanisms.
  - **Enhanced AI Intelligence (Latest)**: Improved system prompts with explicit formatting guidelines for numbered lists, bullet points, URLs, and paragraph breaks. Response format templates enriched with structured examples showing intro → details → summary pattern. Formatting instructions ensure AI responses are scannable, well-organized, and customer-friendly.
- **Knowledge Base Integration**: AI performs intelligent query analysis, multi-tiered search (keyword, semantic), context-aware responses prioritizing knowledge base content, and transparent handoff to human agents when confidence is low.
  - **AI-Powered Document Analysis (Latest)**: When documents are uploaded to the knowledge base, AI automatically analyzes content to extract metadata, generate FAQs, and suggest agent assignments. Features include: automatic categorization, tag/keyword extraction, FAQ generation with answers based on document content, intelligent agent assignment based on category/specialization, and batch FAQ storage. Supports TXT, PDF, and DOCX formats. Analysis can be toggled on/off per upload.
- **Rich Media Input**: Supports file attachments (drag-drop, multi-file), universal camera capture, emoji picker, and voice-to-text.
- **User Identification**: IP-based customer identification for returning users, coupled with `sessionId` tracking, for displaying "Continue Conversation" cards.
- **Unread Tracking & Notifications**: Comprehensive system for tracking message read status, providing unread counts, and real-time notifications via WebSockets.
  - **Conversation Count Display (Latest)**: Sidebar header displays "New - X unread vs Y total" showing total unread messages vs total active conversations. Tab badges show unread/total format (e.g., "2/5") for Active, Mine, and Followup tabs, with History tab showing total count only. Counts automatically update when conversations are marked as read via query invalidation and refetch. Includes proper test IDs for automated testing.
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