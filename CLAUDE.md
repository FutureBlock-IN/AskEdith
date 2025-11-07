# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CaregiversCommunity is a full-stack caregivers support platform built with React, Express.js, GraphQL, PostgreSQL, Redis, and Stripe. It provides a forum for caregivers to connect, share resources, get expert advice, and book consultations with verified professionals.

## Architecture

### Frontend (client/)
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight routing
- **State Management**: TanStack Query (React Query) for server state
- **UI Components**: Radix UI primitives with Tailwind CSS
- **Authentication**: Session-based with custom useAuth hook
- **Build Tool**: Vite with path aliases (@/ for client/src, @shared/ for shared)

### Backend (server/)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Caching**: Redis for sessions and performance
- **API**: Both REST endpoints and GraphQL (Apollo Server)
- **Authentication**: Passport.js with local strategy
- **Payments**: Stripe for expert consultations and premium features
- **Moderation**: AI-powered content moderation
- **File Storage**: Integration for profile images and license documents

### Database Schema (shared/schema.ts)
Key entities include:
- Users (with roles: user, admin, expert)
- Categories (hierarchical forum structure)
- Posts and Comments (with voting system)
- Expert Verifications (for professional credentials)
- Consultations/Appointments (for expert bookings)
- Achievements (gamification system)
- Moderation Results (AI content moderation)

## Development Commands

```bash
# Development
npm run dev                    # Start development server (client + server)

# Database
npm run db:push               # Push schema changes to database
npm run seed                  # Seed database with initial data
npm run db:health             # Check database connection

# Build & Deploy
npm run build                 # Build for production
npm run start                 # Start production server
npm run check                 # TypeScript type checking
```

## Key Development Patterns

### File Structure
- `client/src/pages/` - Route components
- `client/src/components/` - Reusable UI components
- `client/src/hooks/` - Custom React hooks
- `client/src/lib/` - Utilities and configurations
- `server/routes.ts` - REST API endpoints
- `server/graphql/` - GraphQL schema and resolvers
- `shared/schema.ts` - Database schema and types

### Authentication Flow
Authentication uses session-based auth with Passport.js:
- `useAuth()` hook provides user state
- `isAuthenticated` middleware protects routes
- User roles determine access levels (user/admin/expert)

### Data Fetching
- Use TanStack Query for server state management
- GraphQL for complex queries, REST for simple operations
- Mutations use optimistic updates where appropriate

### UI Components
- All components use Tailwind CSS for styling
- Radix UI provides accessible primitives
- Components follow the shadcn/ui pattern in `client/src/components/ui/`

### Database Operations
- Use Drizzle ORM for type-safe database queries
- All queries go through proper error handling
- Transactions for complex operations

## Environment Setup

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string (optional, falls back to in-memory)
- `STRIPE_SECRET_KEY` - Stripe API key for payments
- `ANTHROPIC_API_KEY` - For AI content moderation
- `SESSION_SECRET` - Session encryption key

## Testing

The project does not currently have a test suite configured. When adding tests, consider:
- Unit tests for utilities and pure functions
- Integration tests for API endpoints
- Component tests for React components
- E2E tests for critical user flows

## Deployment Notes

- Server runs on port 5001 by default
- Production build serves static files from Express
- Database migrations are handled via Drizzle Kit
- Redis is optional but recommended for production

## Common Tasks

### Adding New Features
1. Update database schema in `shared/schema.ts`
2. Run `npm run db:push` to apply schema changes
3. Add API endpoints in `server/routes.ts` or GraphQL resolvers
4. Create React components and pages
5. Update TypeScript types as needed

### Working with Authentication
- User authentication state is managed in `client/src/hooks/useAuth.tsx`
- Protected routes check user roles and authentication status
- Expert verification requires manual admin approval

### Content Moderation
- All posts and comments are automatically moderated via AI
- Moderation results are stored in the database
- Admins can review flagged content

### Payment Integration
- Stripe handles all payment processing
- Expert consultations use Stripe Connect for marketplace payments
- Premium subscriptions are managed through Stripe billing