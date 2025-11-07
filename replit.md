# CaregiversCommunity

## Overview
CaregiversCommunity is a full-stack platform designed to connect family caregivers (primarily women aged 45-65) in a supportive community. It offers forum-style discussions, expert consultations, and AI-powered content moderation, optimized for both mobile and desktop experiences. The platform aims to provide a vital support system for caregivers.

## Recent Changes (2025-09-29)
### Critical Bug Fixes
- **Infinite 401 Loop Fixed**: Resolved infinite retry loop for `/api/user` endpoint that was breaking public page access for unauthenticated users.
  - Added 10-second timeout for Clerk initialization to prevent app deadlock
  - Updated loading state logic to allow public pages to render immediately
  - Modified Router component to only block authenticated users during auth resolution
- **Public Page Access Restored**: Unauthenticated users can now browse Community, Expert Directory, and other public pages without authentication.
- **Clerk Error Handling**: Added graceful fallback when Clerk fails to initialize - app continues with limited functionality rather than crashing.
- **Code Cleanup**: Removed debug console.log statements from registration flow.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript.
- **Routing**: Wouter.
- **State Management**: TanStack Query (React Query).
- **UI Components**: Radix UI primitives with Tailwind CSS.
- **Build Tool**: Vite.
- **Styling**: Tailwind CSS with a custom color system reflecting a warm, professional theme.

### Backend
- **Framework**: Express.js with TypeScript.
- **Database**: PostgreSQL with Drizzle ORM.
- **Caching**: Redis for session storage and query caching.
- **API Design**: Hybrid REST/GraphQL.
- **Authentication**: Passport.js with session-based authentication.
- **Content Moderation**: AI-powered using OpenAI GPT-4o.

### Data Storage
- **Primary Database**: PostgreSQL (Neon serverless).
- **Session Storage**: Redis with PostgreSQL fallback.
- **File Storage**: Supabase for profile images and expert documents.
  - **CRITICAL ISSUE**: Supabase project (tvesaresdbghbtocwpdj.supabase.co) is inaccessible - DNS resolution fails. Project may be deleted, paused, or require reconfiguration. Profile images and expert files will not load until Supabase is restored or replaced.
- **Cache Strategy**: Multi-layer caching with Redis.

### Key Features
- **User Management**: Session-based authentication, role-based access control (user, admin, expert), expert verification, customizable profiles.
- **Forum & Discussion**: Hierarchical categories, threaded discussions, AI-powered content moderation with human review, full-text search.
- **Expert Consultation**: Expert directory, native scheduling system (weekly recurring slots, timezone conversion, conflict detection), Stripe Connect integration for payments (planned commission and payouts), end-to-end booking.
- **Community Features**: Achievement system (points, badges), voting system, expert badges, real-time notifications.
- **Content Aggregation**: "This Week by..." feature curates content from various sources, RSS.app integration, expandable card UI.

### Deployment
- **Development**: Vite dev server, local PostgreSQL/Neon, local Redis.
- **Production**: PostgreSQL with read replicas, Redis cluster, CDN for static assets, HTTPS, comprehensive security.
- **Monitoring**: Health checks, error tracking, performance monitoring, automated backups.

### Critical Payment Implementation Note
The current payment system collects funds but does NOT properly distribute them (e.g., expert payouts, commission collection). Stripe Connect integration is required but not yet implemented for correct financial operations.

## External Dependencies
- **Stripe**: Payment processing (currently direct to platform owner, Stripe Connect needed for payouts/commissions).
- **SendGrid**: Email notifications.
- **OpenAI GPT-4o**: Content moderation.
- **Anthropic Claude**: AI assistance (planned).
- **Neon PostgreSQL**: Serverless database.
- **Redis**: Caching and session management.
- **Supabase Storage**: File uploads and media management (CURRENTLY UNAVAILABLE - see Data Storage section).
- **RSS.app**: Content aggregation.