# CaregiversCommunity - Developer Handoff Document

## Project Overview

CaregiversCommunity is a comprehensive online platform designed for family caregivers (primarily women aged 45-65) that combines forum-style discussions, expert consultations, and content aggregation. The platform provides a safe space for sharing experiences, getting professional advice, and accessing curated retirement and caregiving resources.

## Architecture Summary

### Frontend Stack
- **React 18** with TypeScript for type safety
- **Wouter** for lightweight client-side routing
- **TanStack Query** for server state management and caching
- **Radix UI** primitives with **Tailwind CSS** for styling
- **Vite** as the build tool with path aliases

### Backend Stack
- **Express.js** with TypeScript
- **PostgreSQL** with **Drizzle ORM** for type-safe database operations
- **Redis** for session storage and caching
- **GraphQL** (Apollo Server) alongside REST endpoints
- **Passport.js** for session-based authentication
- **Stripe** for payment processing and expert consultations

### External Services
- **OpenAI GPT-4o** for content moderation
- **SendGrid** for email notifications
- **Supabase** for file storage
- **Google Calendar API** for expert scheduling

## Key Functionalities

### 1. User Management & Authentication
- **Session-based authentication** with role-based access control
- **Three user roles**: regular users, experts, and admins
- **Expert verification system** with document upload and manual approval
- **Profile management** with customizable avatars and community names

### 2. Forum & Discussion System
- **Hierarchical category structure** with retirement and caregiving sections
- **Post and comment system** with threaded discussions
- **Voting system** for helpful content
- **Real-time updates** and notifications
- **Search functionality** across posts and categories

### 3. Expert Consultation Platform
- **Verified expert directory** with specializations and ratings
- **Appointment booking system** with calendar integration
- **Stripe payment processing** with 10% platform commission
- **Review and rating system** for completed consultations

### 4. Content Aggregation ("This Week by...")
- **Curated content sources** from various retirement/care professionals
- **EmbedSocial integration** for displaying feeds
- **Expandable accordion interface** for content viewing
- **Admin panel** for managing content sources

### 5. AI-Powered Content Moderation
- **Automatic screening** of all posts and comments
- **Risk assessment** and flagging system
- **Admin review queue** for flagged content

## File Structure & Key Components

### Database Schema (`shared/schema.ts`)
- **Users table**: Authentication, profiles, and role management
- **Categories table**: Hierarchical forum structure with ordering
- **Posts & Comments tables**: Discussion content with voting
- **Expert-related tables**: Verifications, availability, appointments
- **Content Sources table**: For "This Week by..." aggregation
- **Moderation tables**: AI screening results and admin actions

### Server Architecture

#### Core Files
- `server/index.ts` - Main server entry point
- `server/routes.ts` - REST API endpoints
- `server/storage.ts` - Database operations layer
- `server/auth.ts` - Passport.js authentication setup
- `server/graphql/server.ts` - GraphQL server configuration

#### Services
- `server/services/stripeService.ts` - Payment processing
- `server/services/calendarService.ts` - Appointment scheduling
- `server/services/googleCalendarService.ts` - Google Calendar integration
- `server/moderation.ts` - AI content moderation

### Client Architecture

#### Core Files
- `client/src/App.tsx` - Main app routing and providers
- `client/src/hooks/useAuth.tsx` - Authentication state management
- `client/src/lib/queryClient.ts` - TanStack Query configuration

#### Key Pages
- `client/src/pages/home.tsx` - Community homepage with discussions
- `client/src/pages/ThisWeekBy.tsx` - Content aggregation interface
- `client/src/pages/ExpertDirectory.tsx` - Expert listings
- `client/src/pages/Dashboard.tsx` - User dashboard with statistics

#### Components
- `client/src/components/Header.tsx` - Navigation and search
- `client/src/components/MainLayout.tsx` - Layout system (25%-55%-20%)
- `client/src/components/DynamicDiscussionTopicsSidebar.tsx` - Forum navigation
- `client/src/components/PostCard.tsx` - Discussion post display

## Code Quality Assessment & Recommendations

### ✅ Strengths
1. **Type Safety**: Consistent TypeScript usage throughout
2. **Modern Stack**: Uses current best practices with React 18, Drizzle ORM
3. **Responsive Design**: Well-implemented mobile-first approach
4. **Caching Strategy**: Multi-layer caching with Redis
5. **Security**: Session-based auth, input validation, content moderation

### ⚠️ Areas for Improvement

#### 1. Static Data That Should Be Dynamic
- **Category ordering** in sidebar is hardcoded - should use database `orderIndex`
- **Default profile types** ("daisy", "tree") are hardcoded strings
- **Platform commission rate** (10%) is hardcoded in multiple places
- **Timezone handling** could be more robust with proper timezone detection
- **Email templates** are basic and could be more sophisticated

#### 2. Security Vulnerabilities
- **XSS Risk**: While DOMPurify is used, embed content from external sources needs careful sanitization
- **Rate Limiting**: No rate limiting on API endpoints (potential for abuse)
- **Session Security**: Sessions don't expire on logout client-side
- **File Upload**: No file size limits or type validation for expert documents
- **CORS Configuration**: Should be more restrictive in production

#### 3. Performance Issues
- **N+1 Queries**: Multiple favorite count queries per post (should batch)
- **Excessive API Calls**: Each post triggers multiple individual requests
- **No Pagination**: Large result sets could cause performance issues
- **Image Optimization**: No image resizing or optimization for profile photos
- **Bundle Size**: Large JavaScript bundle (913KB) needs code splitting

#### 4. Database Design Issues
- **Missing Indexes**: No indexes on frequently queried columns like `categoryId`, `authorId`
- **Soft Deletes**: No soft delete functionality - data is permanently lost
- **Audit Trail**: No tracking of who modified what and when
- **Cascade Deletes**: Unclear deletion behavior for related records

#### 5. Error Handling & Monitoring
- **Generic Error Messages**: Users get technical error messages
- **No Logging**: Limited error logging and monitoring
- **Failed Payment Handling**: Incomplete error handling for Stripe failures
- **Offline Handling**: No offline functionality or proper error states

### 🚀 User Engagement Recommendations

#### 1. Gamification Enhancements
- **Achievement System**: Implement the existing achievement schema
- **Points & Badges**: Reward helpful posts, comments, and community participation
- **Leaderboards**: Weekly/monthly top contributors
- **Streaks**: Encourage daily engagement

#### 2. Content Discovery
- **Personalized Feed**: AI-powered content recommendations
- **Trending Topics**: Highlight popular discussions
- **Related Posts**: Show similar content to keep users engaged
- **Expert Spotlights**: Feature expert contributions prominently

#### 3. Community Building
- **User Introductions**: Dedicated space for new member introductions
- **Local Groups**: Location-based subgroups
- **Mentorship Program**: Connect experienced caregivers with newcomers
- **Virtual Events**: Live Q&A sessions, webinars

#### 4. Mobile Experience
- **Push Notifications**: Real-time alerts for replies and mentions
- **Progressive Web App**: Offline functionality and app-like experience
- **Voice-to-Text**: Make posting easier for busy caregivers
- **Quick Actions**: One-tap common actions (helpful vote, bookmark)

#### 5. Content Quality
- **Expert Verification Badges**: More prominent expert indicators
- **Content Templates**: Guided post creation for better quality
- **FAQ Generation**: Auto-generate FAQs from popular discussions
- **Resource Library**: Curated collection of helpful resources

## Technical Debt & Immediate Actions Needed

### High Priority
1. **Fix N+1 Query Problem**: Batch favorite count queries
2. **Add Rate Limiting**: Implement on all API endpoints
3. **Database Indexes**: Add indexes on foreign keys and frequently queried columns
4. **Error Boundaries**: Add React error boundaries for better error handling
5. **Bundle Optimization**: Implement code splitting to reduce initial load

### Medium Priority
1. **Implement Cron Jobs**: For cleanup tasks, notifications, and data maintenance
2. **Admin Panel Enhancement**: More comprehensive content management tools
3. **Search Optimization**: Full-text search with PostgreSQL or external service
4. **Email System**: Rich HTML email templates with better formatting
5. **Testing Suite**: Unit tests for critical business logic

### Low Priority
1. **Dark Mode**: User preference for dark/light theme
2. **Accessibility**: ARIA labels and keyboard navigation
3. **Internationalization**: Multi-language support preparation
4. **Advanced Analytics**: User behavior tracking and insights

## Environment Variables Required

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Authentication
SESSION_SECRET=your-session-secret-key

# Stripe Payments
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# AI Services
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Email
SENDGRID_API_KEY=SG...

# Storage
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...

# Google Calendar (optional)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

## Deployment Notes

### Current Deployment Process
1. Run `./deploy.sh` to build and prepare static files
2. Production server uses `NODE_ENV=production node dist/index.js`
3. Static files are served from `server/public/` directory

### Production Recommendations
- **CDN**: Use CloudFlare or AWS CloudFront for static assets
- **Database**: Connection pooling with PgBouncer
- **Redis**: Redis Cluster for high availability
- **Monitoring**: Application monitoring with Sentry or DataDog
- **Backup**: Automated database backups with point-in-time recovery

## Getting Started for New Developers

### 1. Setup
```bash
npm install
cp .env.example .env  # Configure environment variables
npm run db:push       # Apply database schema
npm run dev          # Start development server
```

### 2. Key Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:push` - Apply schema changes
- `npm run db:studio` - Open database GUI
- `./deploy.sh` - Deploy to production

### 3. First Areas to Explore
1. **User Flow**: Start with registration and login in `useAuth.tsx`
2. **Data Layer**: Understand the database schema in `shared/schema.ts`
3. **API Layer**: Explore REST endpoints in `server/routes.ts`
4. **UI Components**: Look at the main layout in `MainLayout.tsx`
5. **State Management**: Understand caching in `queryClient.ts`

### 4. Testing the Application
- Create test accounts for different user roles
- Test the expert application and verification process
- Try booking a consultation and payment flow
- Explore the content aggregation features
- Test forum functionality and moderation

## Recent Changes & Current State

As of July 24, 2025:
- ✅ Production deployment issues resolved
- ✅ Responsive navigation implemented
- ✅ Layout system standardized (25%-55%-20% for community, 25%-75% for ThisWeekBy)
- ✅ Content aggregation platform functional
- ✅ Expert consultation system with Stripe payments working
- ⚠️ Content moderation temporarily disabled due to OpenAI quota issues
- ⚠️ Some TypeScript errors in routes.ts that need attention

## Support & Documentation

- **Technical Architecture**: See `replit.md` for detailed architecture notes
- **API Documentation**: REST endpoints documented in `CLAUDE.md`
- **Database Schema**: Fully documented in `shared/schema.ts`
- **Development Guidelines**: See `CLAUDE.md` for coding standards

---

*This document serves as a comprehensive handoff for developers taking over the CaregiversCommunity platform. It should be updated as the platform evolves.*