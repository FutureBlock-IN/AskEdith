import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  real,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  username: varchar("username").unique().notNull(),
  email: varchar("email").unique(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  communityName: varchar("community_name"),
  profileImageUrl: varchar("profile_image_url"),
  defaultProfileType: varchar("default_profile_type").default("daisy"), // "daisy" or "tree"
  city: varchar("city"),
  role: varchar("role", { length: 50 }).default("user").notNull(), // 'user', 'admin', 'expert'
  approved: varchar("approved", { length: 20 }).default("no").notNull(), // 'yes', 'no', 'not applicable'
  state: varchar("state"),
  timezone: varchar("timezone", { length: 100 }).default("UTC"), // IANA timezone identifier
  introduction: text("introduction"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  isPremium: boolean("is_premium").default(false),
  emailVerified: boolean("email_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Categories for discussions - now supports hierarchy
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  color: varchar("color", { length: 50 }).notNull(),
  icon: varchar("icon", { length: 50 }).notNull(),
  postCount: integer("post_count").default(0),
  parentId: integer("parent_id"), // For hierarchy - will add reference later
  level: integer("level").default(0), // 0=General, 1=Main, 2=Subtopic
  orderIndex: integer("order_index").default(0), // For sorting
  isOfficial: boolean("is_official").default(false), // Whether it appears in main sidebar
  createdBy: varchar("created_by").references(() => users.id), // User who created the forum
  createdAt: timestamp("created_at").defaultNow(),
});

// Posts/discussions
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  authorId: varchar("author_id").notNull().references(() => users.id),
  categoryId: integer("category_id").notNull().references(() => categories.id),
  helpfulVotes: integer("helpful_votes").default(0),
  commentCount: integer("comment_count").default(0),
  isResolved: boolean("is_resolved").default(false),
  isSticky: boolean("is_sticky").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_posts_author_id").on(table.authorId),
  index("idx_posts_category_id").on(table.categoryId),
  index("idx_posts_created_at").on(table.createdAt),
  index("idx_posts_sticky_created").on(table.isSticky, table.createdAt),
]);

// Comments on posts
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  authorId: varchar("author_id").notNull().references(() => users.id),
  postId: integer("post_id").notNull().references(() => posts.id),
  parentId: integer("parent_id"), // Self-reference - will add FK later
  helpfulVotes: integer("helpful_votes").default(0),
  isExpertResponse: boolean("is_expert_response").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Helpful votes tracking
export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  postId: integer("post_id").references(() => posts.id),
  commentId: integer("comment_id").references(() => comments.id),
  voteType: varchar("vote_type", { length: 10 }).notNull(), // 'up' or 'down'
  createdAt: timestamp("created_at").defaultNow(),
});

// Achievement system
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  badgeIcon: varchar("badge_icon", { length: 50 }),
  badgeColor: varchar("badge_color", { length: 50 }),
  criteria: jsonb("criteria"), // JSON criteria for earning the badge
  createdAt: timestamp("created_at").defaultNow(),
});

// User achievements (many-to-many)
export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  achievementId: integer("achievement_id").notNull().references(() => achievements.id),
  earnedAt: timestamp("earned_at").defaultNow(),
});

// Expert verifications
export const expertVerifications = pgTable("expert_verifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  profession: varchar("profession", { length: 100 }),
  expertiseArea: varchar("expertise_area"),
  credentials: text("credentials"),
  professionalTitle: varchar("professional_title"),
  company: varchar("company"),
  companyAddress: text("company_address"),
  companyWebsite: varchar("company_website"),
  companyEmail: varchar("company_email"),
  companyPhone: varchar("company_phone"),
  professionalAssociation: varchar("professional_association"),
  website: varchar("website"),
  linkedinUrl: varchar("linkedin_url"),
  blogUrl: varchar("blog_url"),
  booksUrl: varchar("books_url"),
  articlesUrl: varchar("articles_url"),
  profileImageUrl: varchar("profile_image_url"),
  licenseFileUrl: varchar("license_file_url"), // URL to uploaded license file
  bio: text("bio"),
  yearsExperience: integer("years_experience"),
  licenseNumber: varchar("license_number"),
  // Payment tracking
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  verificationFeeStatus: varchar("verification_fee_status", { length: 20 }).default("pending"), // pending, paid, failed
  verificationFeePaidAt: timestamp("verification_fee_paid_at"),
  // Status tracking
  verificationStatus: varchar("verification_status", { length: 20 }).default("pending"),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: varchar("verified_by"),
  featuredExpert: boolean("featured_expert").default(false),
  // Consultation settings
  consultationRate: integer("consultation_rate"), // hourly rate in cents
  consultationEnabled: boolean("consultation_enabled").default(false),
  availabilitySchedule: text("availability_schedule"), // JSON string for schedule
  // Stripe Connect integration
  stripeConnectAccountId: varchar("stripe_connect_account_id"),
  hourlyRate: integer("hourly_rate").default(10000), // hourly rate in cents, default $100
  // Appointment booking settings
  allowBooking: boolean("allow_booking").default(false), // Allow appointment booking after verification
  calendlyLink: text("calendly_link"), // Expert's Calendly link for booking appointments
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_expert_verifications_user_id").on(table.userId),
  index("idx_expert_verifications_status").on(table.verificationStatus),
  index("idx_expert_verifications_created_at").on(table.createdAt),
]);

// Post sources for expert content attribution
export const postSources = pgTable("post_sources", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  sourceType: varchar("source_type", { length: 50 }).notNull(), // 'linkedin', 'blog', 'book', 'article', 'original'
  sourceTitle: varchar("source_title"),
  sourceUrl: varchar("source_url"),
  publicationDate: timestamp("publication_date"),
  publisher: varchar("publisher"),
  isbn: varchar("isbn"), // for books
  createdAt: timestamp("created_at").defaultNow(),
});

// Content moderation
export const moderationResults = pgTable("moderation_results", {
  id: serial("id").primaryKey(),
  contentId: varchar("content_id").notNull(),
  contentType: varchar("content_type").notNull(), // 'post' or 'comment'
  moderationScore: real("moderation_score").notNull(),
  flaggedCategories: text("flagged_categories").array(),
  moderationStatus: varchar("moderation_status").notNull().default("approved"), // 'approved', 'flagged', 'rejected'
  aiResponse: text("ai_response"),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Consultation bookings
export const consultations = pgTable("consultations", {
  id: serial("id").primaryKey(),
  expertId: varchar("expert_id").notNull().references(() => users.id),
  clientId: varchar("client_id").notNull().references(() => users.id),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").notNull().default(60), // duration in minutes
  rate: integer("rate").notNull(), // rate in cents
  totalAmount: integer("total_amount").notNull(), // total amount in cents
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  paymentStatus: varchar("payment_status", { length: 20 }).default("pending"), // pending, paid, failed, refunded
  bookingStatus: varchar("booking_status", { length: 20 }).default("scheduled"), // scheduled, completed, cancelled, no_show
  meetingLink: varchar("meeting_link"), // Zoom/Google Meet link
  notes: text("notes"), // Client's request or expert's notes
  cancelledAt: timestamp("cancelled_at"),
  cancelledBy: varchar("cancelled_by"),
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Content Sources for "This Week by..."
export const contentSources = pgTable("content_sources", {
  id: serial("id").primaryKey(),
  categoryId: varchar("category_id", { length: 50 }).notNull(),
  categoryName: varchar("category_name", { length: 100 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  embedCode: text("embed_code"),
  websiteUrl: varchar("website_url", { length: 500 }),
  isActive: boolean("is_active").default(true),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Q&A Knowledge Base
export const qaKnowledge = pgTable("qa_knowledge", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: varchar("category", { length: 100 }),
  keywords: text("keywords").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

// RAG Embeddings for vector search
export const qaEmbeddings = pgTable("qa_embeddings", {
  id: serial("id").primaryKey(),
  chunkText: text("chunk_text").notNull(),
  embedding: text("embedding"), // Will be cast to vector(1536) in migration
  metadata: jsonb("metadata").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments),
  votes: many(votes),
  achievements: many(userAchievements),
  expertVerification: many(expertVerifications),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [posts.categoryId],
    references: [categories.id],
  }),
  comments: many(comments),
  votes: many(votes),
  source: one(postSources),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
  }),
  replies: many(comments),
  votes: many(votes),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  user: one(users, {
    fields: [votes.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [votes.postId],
    references: [posts.id],
  }),
  comment: one(comments, {
    fields: [votes.commentId],
    references: [comments.id],
  }),
}));

export const achievementsRelations = relations(achievements, ({ many }) => ({
  userAchievements: many(userAchievements),
}));

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, {
    fields: [userAchievements.userId],
    references: [users.id],
  }),
  achievement: one(achievements, {
    fields: [userAchievements.achievementId],
    references: [achievements.id],
  }),
}));

export const expertVerificationsRelations = relations(expertVerifications, ({ one }) => ({
  user: one(users, {
    fields: [expertVerifications.userId],
    references: [users.id],
  }),
}));

export const consultationsRelations = relations(consultations, ({ one }) => ({
  expert: one(users, {
    fields: [consultations.expertId],
    references: [users.id],
  }),
  client: one(users, {
    fields: [consultations.clientId],
    references: [users.id],
  }),
}));

export const postSourcesRelations = relations(postSources, ({ one }) => ({
  post: one(posts, {
    fields: [postSources.postId],
    references: [posts.id],
  }),
}));

export const moderationResultsRelations = relations(moderationResults, ({ one }) => ({
  reviewer: one(users, {
    fields: [moderationResults.reviewedBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertPostSchema = createInsertSchema(posts);
export const insertCommentSchema = createInsertSchema(comments);
export const insertCategorySchema = createInsertSchema(categories);
export const insertVoteSchema = createInsertSchema(votes);
export const insertAchievementSchema = createInsertSchema(achievements);
export const insertUserAchievementSchema = createInsertSchema(userAchievements);
export const insertExpertVerificationSchema = createInsertSchema(expertVerifications);
export const insertPostSourceSchema = createInsertSchema(postSources);
export const insertModerationResultSchema = createInsertSchema(moderationResults);
export const insertConsultationSchema = createInsertSchema(consultations);
export const insertContentSourceSchema = createInsertSchema(contentSources).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertQaKnowledgeSchema = createInsertSchema(qaKnowledge).omit({
  id: true,
  createdAt: true,
});

export const insertQaEmbeddingsSchema = createInsertSchema(qaEmbeddings).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
// User role types
export type UserRole = 'user' | 'admin' | 'expert';

// User approval status types
export type ApprovalStatus = 'yes' | 'no' | 'not applicable';

export type User = typeof users.$inferSelect & {
  role: UserRole;
  expertVerification?: ExpertVerification | null;
};
export type Post = typeof posts.$inferSelect;
export type PostWithAuthorAndCategory = Post & {
  author: User;
  category: typeof categories.$inferSelect;
  source?: typeof postSources.$inferSelect;
};
export type PostWithExpertInfo = PostWithAuthorAndCategory & {
  expertVerification?: ExpertVerification;
};
export type Comment = typeof comments.$inferSelect;
export type CommentWithAuthor = Comment & { author: User };
export type Category = typeof categories.$inferSelect;
export type Vote = typeof votes.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type ExpertVerification = typeof expertVerifications.$inferSelect;
export type PostSource = typeof postSources.$inferSelect;

export type InsertPost = z.infer<typeof insertPostSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertVote = z.infer<typeof insertVoteSchema>;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;
export type InsertExpertVerification = z.infer<typeof insertExpertVerificationSchema>;
export type InsertPostSource = z.infer<typeof insertPostSourceSchema>;
// Search phrases for typewriter effect
export const searchPhrases = pgTable("search_phrases", {
  id: serial("id").primaryKey(),
  phrase: text("phrase").notNull(),
  isActive: boolean("is_active").default(true),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSearchPhraseSchema = createInsertSchema(searchPhrases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ModerationResult = typeof moderationResults.$inferSelect;
export type InsertModerationResult = z.infer<typeof insertModerationResultSchema>;
export type Consultation = typeof consultations.$inferSelect;
export type InsertConsultation = z.infer<typeof insertConsultationSchema>;
export type SearchPhrase = typeof searchPhrases.$inferSelect;
export type InsertSearchPhrase = z.infer<typeof insertSearchPhraseSchema>;

// Search query logs for analytics
export const searchLogs = pgTable("search_logs", {
  id: serial("id").primaryKey(),
  query: text("query").notNull(),
  answer: text("answer").notNull(),
  userId: text("user_id"), // Optional, null for anonymous searches
  source: text("source").notNull().default('landing'), // 'landing', 'community', etc
  resultFound: boolean("result_found").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSearchLogSchema = createInsertSchema(searchLogs).omit({
  id: true,
  createdAt: true,
});

export type SearchLog = typeof searchLogs.$inferSelect;
export type InsertSearchLog = z.infer<typeof insertSearchLogSchema>;
export type ContentSource = typeof contentSources.$inferSelect;
export type InsertContentSource = z.infer<typeof insertContentSourceSchema>;
export type QaKnowledge = typeof qaKnowledge.$inferSelect;
export type InsertQaKnowledge = z.infer<typeof insertQaKnowledgeSchema>;
export type QaEmbeddings = typeof qaEmbeddings.$inferSelect;
export type InsertQaEmbeddings = z.infer<typeof insertQaEmbeddingsSchema>;

// User favorite content sources
export const userFavoriteContentSources = pgTable("user_favorite_content_sources", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  contentSourceId: integer("content_source_id").notNull().references(() => contentSources.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userSourceUnique: unique().on(table.userId, table.contentSourceId),
}));

export const insertUserFavoriteContentSourceSchema = createInsertSchema(userFavoriteContentSources).omit({
  id: true,
  createdAt: true,
});

export type UserFavoriteContentSource = typeof userFavoriteContentSources.$inferSelect;
export type InsertUserFavoriteContentSource = z.infer<typeof insertUserFavoriteContentSourceSchema>;

// User favorite posts table
export const userFavoritePosts = pgTable("user_favorite_posts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  postId: integer("post_id").notNull().references(() => posts.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userPostUnique: unique().on(table.userId, table.postId),
}));

export const insertUserFavoritePostSchema = createInsertSchema(userFavoritePosts).omit({
  id: true,
  createdAt: true,
});

export type UserFavoritePost = typeof userFavoritePosts.$inferSelect;
export type InsertUserFavoritePost = z.infer<typeof insertUserFavoritePostSchema>;

// Expert availability schedule
export const expertAvailability = pgTable("expert_availability", {
  id: serial("id").primaryKey(),
  expertId: text("expert_id").notNull().references(() => users.id),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 1=Monday, etc.
  startTime: text("start_time").notNull(), // HH:MM format in expert's timezone
  endTime: text("end_time").notNull(), // HH:MM format in expert's timezone
  timezone: text("timezone").notNull().default("UTC"), // IANA timezone identifier for this availability
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Appointment bookings
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  expertId: text("expert_id").notNull().references(() => users.id),
  clientId: text("client_id").references(() => users.id), // null for non-registered users
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(), // Stored in UTC
  scheduledAtTimezone: text("scheduled_at_timezone").notNull().default("UTC"), // Original timezone for display
  duration: integer("duration").notNull(), // minutes
  notes: text("notes"),
  status: text("status").notNull().default("pending"), // pending, confirmed, completed, cancelled
  totalAmount: integer("total_amount").notNull(), // cents
  platformFee: integer("platform_fee").notNull(), // cents (10%)
  expertEarnings: integer("expert_earnings").notNull(), // cents (90%)
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeConnectAccountId: text("stripe_connect_account_id"),
  meetingLink: text("meeting_link"),
  cancelledAt: timestamp("cancelled_at"),
  cancelReason: text("cancel_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertExpertAvailabilitySchema = createInsertSchema(expertAvailability).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Google Calendar integration
export const calendarIntegrations = pgTable("calendar_integrations", {
  id: serial("id").primaryKey(),
  expertId: text("expert_id").notNull().references(() => users.id),
  provider: text("provider").notNull().default("google"), // 'google' for now
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  tokenExpiresAt: timestamp("token_expires_at").notNull(),
  calendarId: text("calendar_id"), // Google Calendar ID
  calendarName: text("calendar_name"),
  isActive: boolean("is_active").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  syncErrors: text("sync_errors"), // JSON string for error logging
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Blocked time slots for experts (vacations, breaks, etc.)
export const blockedTimeSlots = pgTable("blocked_time_slots", {
  id: serial("id").primaryKey(),
  expertId: text("expert_id").notNull().references(() => users.id),
  startDateTime: timestamp("start_date_time").notNull(),
  endDateTime: timestamp("end_date_time").notNull(),
  reason: text("reason"), // "vacation", "break", "meeting", etc.
  isAllDay: boolean("is_all_day").default(false),
  isRecurring: boolean("is_recurring").default(false),
  recurrenceRule: text("recurrence_rule"), // RRULE format for recurring blocks
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notification preferences for experts and clients
export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  emailNotifications: boolean("email_notifications").default(true),
  smsNotifications: boolean("sms_notifications").default(false),
  appointmentReminders: boolean("appointment_reminders").default(true),
  reminderTimeMinutes: integer("reminder_time_minutes").default(60), // minutes before appointment
  bookingConfirmations: boolean("booking_confirmations").default(true),
  cancellationNotifications: boolean("cancellation_notifications").default(true),
  phoneNumber: text("phone_number"), // for SMS notifications
  timezone: text("timezone").default("America/New_York"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Appointment reviews and ratings
export const appointmentReviews = pgTable("appointment_reviews", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").notNull().references(() => appointments.id),
  reviewerId: text("reviewer_id").notNull().references(() => users.id), // client or expert
  revieweeId: text("reviewee_id").notNull().references(() => users.id), // expert or client
  rating: integer("rating").notNull(), // 1-5 stars
  reviewText: text("review_text"),
  isPublic: boolean("is_public").default(true),
  isVerified: boolean("is_verified").default(false), // admin verified review
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCalendarIntegrationSchema = createInsertSchema(calendarIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBlockedTimeSlotSchema = createInsertSchema(blockedTimeSlots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAppointmentReviewSchema = createInsertSchema(appointmentReviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ExpertAvailability = typeof expertAvailability.$inferSelect;
export type InsertExpertAvailability = z.infer<typeof insertExpertAvailabilitySchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type CalendarIntegration = typeof calendarIntegrations.$inferSelect;
export type InsertCalendarIntegration = z.infer<typeof insertCalendarIntegrationSchema>;
export type BlockedTimeSlot = typeof blockedTimeSlots.$inferSelect;
export type InsertBlockedTimeSlot = z.infer<typeof insertBlockedTimeSlotSchema>;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>;
export type AppointmentReview = typeof appointmentReviews.$inferSelect;
export type InsertAppointmentReview = z.infer<typeof insertAppointmentReviewSchema>;

// Additional relations for new tables
export const expertAvailabilityRelations = relations(expertAvailability, ({ one }) => ({
  expert: one(users, {
    fields: [expertAvailability.expertId],
    references: [users.id],
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  expert: one(users, {
    fields: [appointments.expertId],
    references: [users.id],
  }),
  client: one(users, {
    fields: [appointments.clientId],
    references: [users.id],
  }),
  reviews: many(appointmentReviews),
}));

export const calendarIntegrationsRelations = relations(calendarIntegrations, ({ one }) => ({
  expert: one(users, {
    fields: [calendarIntegrations.expertId],
    references: [users.id],
  }),
}));

export const blockedTimeSlotsRelations = relations(blockedTimeSlots, ({ one }) => ({
  expert: one(users, {
    fields: [blockedTimeSlots.expertId],
    references: [users.id],
  }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}));

export const appointmentReviewsRelations = relations(appointmentReviews, ({ one }) => ({
  appointment: one(appointments, {
    fields: [appointmentReviews.appointmentId],
    references: [appointments.id],
  }),
  reviewer: one(users, {
    fields: [appointmentReviews.reviewerId],
    references: [users.id],
  }),
  reviewee: one(users, {
    fields: [appointmentReviews.revieweeId],
    references: [users.id],
  }),
}));

// Relations for userFavoritePosts
export const userFavoritePostsRelations = relations(userFavoritePosts, ({ one }) => ({
  user: one(users, {
    fields: [userFavoritePosts.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [userFavoritePosts.postId],
    references: [posts.id],
  }),
}));

// Email verification tokens
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Password reset tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Add email verified field to users
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type InsertEmailVerificationToken = z.infer<typeof insertEmailVerificationTokenSchema>;
export const insertEmailVerificationTokenSchema = createInsertSchema(emailVerificationTokens).omit({
  id: true,
  createdAt: true,
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

// Social media embeds table
export const socialMediaEmbeds = pgTable("social_media_embeds", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 50 }).notNull(), // 'todaysnews', 'linkedin', 'xposts'
  name: varchar("name", { length: 255 }).notNull(),
  embedCode: text("embed_code"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type SocialMediaEmbed = typeof socialMediaEmbeds.$inferSelect;
export type InsertSocialMediaEmbed = z.infer<typeof insertSocialMediaEmbedSchema>;
export const insertSocialMediaEmbedSchema = createInsertSchema(socialMediaEmbeds).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
