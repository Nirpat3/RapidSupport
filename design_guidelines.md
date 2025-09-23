# Design Guidelines: Support Board Customer Support Platform

## Design Approach
**Reference-Based Approach**: Drawing inspiration from modern support platforms like Intercom, Zendesk, and Freshdesk, focusing on clean professionalism with subtle modern touches. The design prioritizes utility and efficiency while maintaining visual appeal through thoughtful use of space and color.

## Core Design Elements

### Color Palette
**Primary Colors:**
- Light mode: 220 85% 20% (deep blue)
- Dark mode: 220 30% 85% (light blue-gray)

**Background Colors:**
- Light mode: 220 20% 98% (off-white with blue tint)
- Dark mode: 220 15% 12% (dark blue-gray)

**Accent Colors:**
- Success: 142 76% 36% (professional green)
- Warning: 38 92% 50% (amber)
- Error: 0 84% 60% (red)

### Typography
**Font Family:** Inter via Google Fonts
**Hierarchy:**
- Headlines: font-semibold text-2xl to text-4xl
- Body text: font-normal text-sm to text-base
- UI labels: font-medium text-xs to text-sm

### Layout System
**Spacing Units:** Consistent use of Tailwind units 2, 4, 6, and 8 (p-2, m-4, gap-6, h-8)
**Grid System:** 12-column grid with responsive breakpoints
**Container:** max-width constraints with centered alignment

## Component Library

### Navigation
- **Admin Sidebar:** Fixed left sidebar with collapsible menu items, user avatar, and status indicator
- **Top Bar:** Breadcrumbs, search functionality, and user profile dropdown
- **Mobile:** Hamburger menu with overlay navigation

### Chat Interface
- **Message Bubbles:** Rounded corners (rounded-lg), different colors for customer/agent messages
- **Input Area:** Sticky bottom positioning with attachment options and emoji picker
- **Conversation List:** Clean list view with user avatars, last message preview, and unread indicators

### Data Displays
- **Tables:** Zebra striping, sortable headers, and hover states
- **Cards:** Subtle shadows (shadow-sm) with hover elevation
- **Status Badges:** Rounded pills with appropriate color coding

### Forms
- **Input Fields:** Consistent border radius (rounded-md), focus states with ring utilities
- **Buttons:** Primary (filled), secondary (outline), and ghost variants
- **Form Groups:** Proper spacing and label alignment

### Dashboard Elements
- **Metrics Cards:** Clean white/dark cards with large numbers and trend indicators
- **Charts:** Minimal, data-focused visualizations using muted colors
- **Activity Feed:** Timeline-style layout with timestamps and user actions

## Key Design Principles

1. **Professional Clarity:** Clean lines, generous whitespace, and clear visual hierarchy
2. **Efficiency-First:** Quick access to common actions, keyboard shortcuts support
3. **Consistent Branding:** Subtle use of brand colors without overwhelming functionality
4. **Responsive Design:** Mobile-first approach with touch-friendly interactions
5. **Accessibility:** High contrast ratios, proper focus indicators, and screen reader support

## Animations
Minimal and purposeful animations only:
- Smooth transitions for hover states (transition-colors duration-200)
- Subtle slide-in animations for new messages
- Loading states with subtle pulse effects

This design system creates a professional, trustworthy support platform that prioritizes user efficiency while maintaining modern visual appeal.