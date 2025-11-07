// Path: /Users/alextoska/Desktop/CaregiversCommunity/server/storage.ts
import { withCache, invalidateCache, CacheKeys, CacheTTL, InvalidationPatterns } from "./cache";

// Add these interfaces
export interface Activity {
  id: number;
  type: 'post' | 'comment';
  title?: string;
  content: string;
  createdAt: Date;
  categoryName?: string;
}

import {
  users,
  posts,
  comments,
  categories,
  votes,
  achievements,
  userAchievements,
  expertVerifications,
  postSources,
  moderationResults,
  searchPhrases,
  consultations,
  contentSources,
  qaKnowledge,
  userFavoriteContentSources,
  userFavoritePosts,
  expertAvailability,
  appointments,
  calendarIntegrations,
  blockedTimeSlots,
  notificationPreferences,
  appointmentReviews,
  type User,
  type UserRole,
  type UpsertUser,
  type Post,
  type PostWithAuthorAndCategory,
  type PostWithExpertInfo,
  type Comment,
  type CommentWithAuthor,
  type Category,
  type Vote,
  type Achievement,
  type UserAchievement,
  type ExpertVerification,
  type CalendarIntegration,
  type InsertCalendarIntegration,
  type BlockedTimeSlot,
  type InsertBlockedTimeSlot,
  type NotificationPreference,
  type InsertNotificationPreference,
  type AppointmentReview,
  type InsertAppointmentReview,
  type PostSource,
  type ModerationResult,
  type SearchPhrase,
  type Consultation,
  type ContentSource,
  type InsertContentSource,
  type QaKnowledge,
  type InsertQaKnowledge,
  searchLogs,
  type SearchLog,
  type InsertSearchLog,
  type InsertPost,
  emailVerificationTokens,
  passwordResetTokens,
  type EmailVerificationToken,
  type InsertEmailVerificationToken,
  type PasswordResetToken,
  type InsertPasswordResetToken,
  socialMediaEmbeds,
  type SocialMediaEmbed,
  type InsertSocialMediaEmbed,
  type InsertComment,
  type InsertCategory,
  type InsertVote,
  type InsertAchievement,
  type InsertUserAchievement,
  type InsertExpertVerification,
  type InsertPostSource,
  type InsertModerationResult,
  type InsertSearchPhrase,
  type InsertConsultation,
  type ExpertAvailability,
  type InsertExpertAvailability,
  type Appointment,
  type InsertAppointment,
} from "@shared/schema";

// Extend the base User type to include role
type UserWithRole = User & {
  role: UserRole;
};
import { db } from "./db";
import { TimezoneService } from "./services/timezoneService";
import { eq, desc, and, sql, count, or, ilike, gte, lte, lt, ne, like } from "drizzle-orm";

// Date validation helper function
function isValidDateFormat(date: string): boolean {
  // Check YYYY-MM-DD format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return false;
  }

  // Check if date is actually valid
  const parsedDate = new Date(date);
  return parsedDate instanceof Date &&
         !isNaN(parsedDate.getTime()) &&
         parsedDate.toISOString().slice(0, 10) === date;
}

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserStripeInfo(userId: string, stripeInfo: { customerId: string; subscriptionId: string }): Promise<User>;

  // Category operations
  getCategories(): Promise<Category[]>;
  getCategoriesByLevel(level: number): Promise<Category[]>;
  getCategoriesByParent(parentId: number): Promise<Category[]>;
  getCategoryHierarchy(): Promise<any[]>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategoryPostCount(categoryId: number): Promise<void>;

  // Post operations
  getPosts(categoryId?: number, limit?: number, offset?: number): Promise<PostWithAuthorAndCategory[]>;
  getPostsByAuthor(authorId: string, limit?: number, offset?: number): Promise<PostWithAuthorAndCategory[]>;
  getPost(id: number): Promise<PostWithAuthorAndCategory | undefined>;
  createPost(post: InsertPost): Promise<Post>;
  updatePostHelpfulVotes(postId: number, increment: number): Promise<void>;
  updatePostCommentCount(postId: number, increment: number): Promise<void>;

  // Comment operations
  getCommentsByPost(postId: number): Promise<CommentWithAuthor[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  updateCommentHelpfulVotes(commentId: number, increment: number): Promise<void>;

  // Vote operations
  getUserVote(userId: string, postId?: number, commentId?: number): Promise<Vote | undefined>;
  createVote(vote: InsertVote): Promise<Vote>;
  deleteVote(userId: string, postId?: number, commentId?: number): Promise<void>;

  // Achievement operations
  getAchievements(): Promise<Achievement[]>;
  getUserAchievements(userId: string): Promise<(UserAchievement & { achievement: Achievement })[]>;
  createUserAchievement(userAchievement: InsertUserAchievement): Promise<UserAchievement>;
  checkAndAwardAchievements(userId: string): Promise<void>;

  // Expert verification operations
  getExpertVerification(userId: string): Promise<ExpertVerification | undefined>;
  getVerifiedExperts(): Promise<(ExpertVerification & { user: User })[]>;
  getAllExperts(): Promise<(ExpertVerification & { user: User })[]>;
  getFeaturedExperts(): Promise<(ExpertVerification & { user: User })[]>;
  createExpertVerification(verification: InsertExpertVerification): Promise<ExpertVerification>;
  updateExpertVerification(id: number, updates: Partial<InsertExpertVerification>): Promise<ExpertVerification>;
  getPendingExpertVerifications(): Promise<(ExpertVerification & { user: User })[]>;
  updateExpertVerificationStatus(id: number, status: 'verified' | 'rejected', adminUserId: string): Promise<ExpertVerification>;

  // Post source operations
  getPostSource(postId: number): Promise<PostSource | undefined>;
  createPostSource(source: InsertPostSource): Promise<PostSource>;

  // Enhanced post operations with expert info
  getPostsWithExpertInfo(categoryId?: number, limit?: number, offset?: number, sortBy?: 'hot' | 'new' | 'top'): Promise<PostWithExpertInfo[]>;
  getPostWithExpertInfo(id: number): Promise<PostWithExpertInfo | undefined>;

  // Analytics operations
  getCommunityStats(): Promise<{
    totalUsers: number;
    totalPosts: number;
    totalComments: number;
    postsThisWeek: number;
  }>;

  // Moderation operations
  getModerationResult(contentId: string): Promise<ModerationResult | undefined>;
  createModerationResult(moderation: InsertModerationResult): Promise<ModerationResult>;
  getModerationQueue(): Promise<(ModerationResult & { content: any })[]>;
  updateModerationStatus(id: number, status: string, reviewedBy: string): Promise<void>;

  // Consultation operations
  createConsultation(consultation: InsertConsultation): Promise<Consultation>;
  getUserConsultations(userId: string): Promise<Consultation[]>;
  getExpertConsultations(expertId: string): Promise<Consultation[]>;
  updateConsultationStatus(id: number, status: string): Promise<Consultation>;

  // Search phrase operations
  getSearchPhrases(): Promise<SearchPhrase[]>;
  createSearchPhrase(phrase: InsertSearchPhrase): Promise<SearchPhrase>;
  updateSearchPhrase(id: number, updates: Partial<InsertSearchPhrase>): Promise<SearchPhrase>;
  deleteSearchPhrase(id: number): Promise<void>;

  // Forum operations
  getUserCreatedForums(userId: string): Promise<Category[]>;
  searchForums(query: string): Promise<Category[]>;

  // Appointment booking operations
  getExpertAvailability(expertId: string): Promise<ExpertAvailability[]>;
  createExpertAvailability(availability: InsertExpertAvailability): Promise<ExpertAvailability>;
  getAvailableTimeSlots(expertId: string, date: string): Promise<string[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  getExpertAppointments(expertId: string): Promise<Appointment[]>;
  getClientAppointments(clientId: string): Promise<Appointment[]>;
  updateAppointmentStatus(id: number, status: string): Promise<Appointment>;

  // Content Sources
  getContentSources(): Promise<ContentSource[]>;
  getAllContentSources(): Promise<ContentSource[]>;
  getContentSourcesByCategory(categoryId: string): Promise<ContentSource[]>;
  createContentSource(source: InsertContentSource): Promise<ContentSource>;
  updateContentSource(id: number, source: Partial<InsertContentSource>): Promise<ContentSource | undefined>;
  deleteContentSource(id: number): Promise<void>;
  reorderContentSources(categoryId: string, sourceIds: number[]): Promise<void>;

  // Q&A Knowledge operations
  searchQaKnowledge(query: string): Promise<QaKnowledge[]>;
  createQaKnowledge(qa: InsertQaKnowledge): Promise<QaKnowledge>;
  getAllQaKnowledge(): Promise<QaKnowledge[]>;

  // User favorite content source operations
  getUserFavoriteContentSources(userId: string): Promise<ContentSource[]>;
  toggleUserFavoriteContentSource(userId: string, contentSourceId: number): Promise<boolean>; // returns true if favorited, false if unfavorited
  isContentSourceFavoritedByUser(userId: string, contentSourceId: number): Promise<boolean>;

  // User favorite post operations
  getUserFavoritePosts(userId: string): Promise<Post[]>;
  toggleUserFavoritePost(userId: string, postId: number): Promise<boolean>; // returns true if favorited, false if unfavorited
  isPostFavoritedByUser(userId: string, postId: number): Promise<boolean>;
  getPostFavoriteCount(postId: number): Promise<number>;

  // Email verification operations
  createEmailVerificationToken(token: InsertEmailVerificationToken): Promise<EmailVerificationToken>;
  getEmailVerificationToken(token: string): Promise<EmailVerificationToken | undefined>;
  deleteEmailVerificationToken(token: string): Promise<void>;
  verifyUserEmail(userId: string): Promise<void>;

  // Password reset operations
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  deletePasswordResetToken(token: string): Promise<void>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<void>;

  // User approval operations
  getUnapprovedExperts(): Promise<User[]>;
  approveUser(userId: string): Promise<User>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<UserWithRole | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user ? { ...user, role: user.role as UserRole } : undefined;
  }

  async getUserByUsername(username: string): Promise<UserWithRole | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user ? { ...user, role: user.role as UserRole } : undefined;
  }

  async getUserByEmail(email: string): Promise<UserWithRole | undefined> {
    const [user] = await db.select().from(users).where(ilike(users.email, email));
    return user ? { ...user, role: user.role as UserRole } : undefined;
  }

  async createUser(userData: UpsertUser): Promise<UserWithRole> {
    const [newUser] = await db.insert(users).values({
      ...userData,
      role: (userData.role ?? 'user') as UserRole, // Use provided role or default to 'user'
    }).returning();
    return { ...newUser, role: newUser.role as UserRole };
  }

    async upsertUser(userData: UpsertUser): Promise<UserWithRole> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        role: (userData.role ?? 'user') as UserRole, // Use provided role or default to 'user'
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          username: userData.username,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          communityName: userData.communityName,
          profileImageUrl: userData.profileImageUrl,
          defaultProfileType: userData.defaultProfileType,
          city: userData.city,
          state: userData.state,
          introduction: userData.introduction,
          role: (userData.role ?? 'user') as UserRole, // Include role in update as well
          updatedAt: new Date(),
        },
      })
      .returning();
    return { ...user, role: user.role as UserRole };
  }

  async updateUserStripeInfo(userId: string, stripeInfo: { customerId: string; subscriptionId: string }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId: stripeInfo.customerId,
        stripeSubscriptionId: stripeInfo.subscriptionId,
        isPremium: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return { ...user, role: user.role as UserRole };
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories)
      .orderBy(categories.level, categories.orderIndex, categories.name);
  }

  async getCategoriesByLevel(level: number): Promise<Category[]> {
    if (level === 0) {
      // For top-level forums, only show official ones with real post counts
      const categoriesWithCounts = await db
        .select({
          id: categories.id,
          name: categories.name,
          createdAt: categories.createdAt,
          description: categories.description,
          slug: categories.slug,
          color: categories.color,
          icon: categories.icon,
          postCount: sql<number>`count(${posts.id})`.as('postCount'),
          parentId: categories.parentId,
          level: categories.level,
          orderIndex: categories.orderIndex,
          isOfficial: categories.isOfficial,
          createdBy: categories.createdBy,
        })
        .from(categories)
        .leftJoin(posts, eq(categories.id, posts.categoryId))
        .where(and(eq(categories.level, level), eq(categories.isOfficial, true)))
        .groupBy(categories.id)
        .orderBy(categories.orderIndex, categories.name);

      return categoriesWithCounts;
    } else {
      // For subcategories, show all regardless of isOfficial status
      return await db.select().from(categories)
        .where(eq(categories.level, level))
        .orderBy(categories.orderIndex, categories.name);
    }
  }

  async getCategoriesByParent(parentId: number): Promise<Category[]> {
    return await db.select().from(categories)
      .where(eq(categories.parentId, parentId))
      .orderBy(categories.orderIndex, categories.name);
  }

  async getCategoryHierarchy(): Promise<any[]> {
    // Get categories with real post counts for each level
    const categoriesWithCounts = await db
      .select({
        id: categories.id,
        name: categories.name,
        description: categories.description,
        slug: categories.slug,
        color: categories.color,
        icon: categories.icon,
        postCount: sql<number>`count(${posts.id})`.as('postCount'),
        parentId: categories.parentId,
        level: categories.level,
        orderIndex: categories.orderIndex,
        isOfficial: categories.isOfficial,
        createdBy: categories.createdBy,
      })
      .from(categories)
      .leftJoin(posts, eq(categories.id, posts.categoryId))
      .groupBy(categories.id)
      .orderBy(categories.level, categories.orderIndex, categories.name);

    // Build hierarchy: General (0) -> Main (1) -> Subtopic (2)
    const hierarchy: any[] = [];
    const generalTopics = categoriesWithCounts.filter(cat => cat.level === 0);

    for (const general of generalTopics) {
      const mainTopics = categoriesWithCounts.filter(cat => cat.level === 1 && cat.parentId === general.id)
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
      const generalWithChildren = {
        ...general,
        children: mainTopics.map(main => ({
          ...main,
          children: categoriesWithCounts.filter(cat => cat.level === 2 && cat.parentId === main.id)
            .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
        }))
      };
      hierarchy.push(generalWithChildren);
    }
    console.log('hierarchy', hierarchy);
    return hierarchy;
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.slug, slug));
    return category;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategoryPostCount(categoryId: number): Promise<void> {
    const [result] = await db
      .select({ count: count() })
      .from(posts)
      .where(eq(posts.categoryId, categoryId));

    await db
      .update(categories)
      .set({ postCount: result.count })
      .where(eq(categories.id, categoryId));
  }

  // Post operations
  async getPostsByAuthor(authorId: string, limit = 20, offset = 0): Promise<PostWithAuthorAndCategory[]> {
    const result = await db
      .select({
        id: posts.id,
        title: posts.title,
        content: posts.content,
        categoryId: posts.categoryId,
        authorId: posts.authorId,
        isResolved: posts.isResolved,
        isSticky: posts.isSticky,
        helpfulVotes: posts.helpfulVotes,
        commentCount: posts.commentCount,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        author: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          profileImageUrl: users.profileImageUrl,
        },
        category: {
          id: categories.id,
          name: categories.name,
          description: categories.description,
          slug: categories.slug,
          color: categories.color,
          postCount: categories.postCount,
        },
        source: {
          id: postSources.id,
          sourceType: postSources.sourceType,
          sourceTitle: postSources.sourceTitle,
          sourceUrl: postSources.sourceUrl,
          publisher: postSources.publisher,
        }
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .innerJoin(categories, eq(posts.categoryId, categories.id))
      .leftJoin(postSources, eq(posts.id, postSources.postId))
      .where(eq(posts.authorId, authorId))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);

    return result.map(post => ({
      ...post,
      author: { ...post.author, role: post.author.role as UserRole }
    }));
  }

  async getPosts(categoryId?: number, limit = 20, offset = 0): Promise<PostWithAuthorAndCategory[]> {
    const query = db
      .select({
        id: posts.id,
        title: posts.title,
        content: posts.content,
        authorId: posts.authorId,
        categoryId: posts.categoryId,
        helpfulVotes: posts.helpfulVotes,
        commentCount: posts.commentCount,
        isResolved: posts.isResolved,
        isSticky: posts.isSticky,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        author: users,
        category: categories,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .innerJoin(categories, eq(posts.categoryId, categories.id))
      .orderBy(desc(posts.isSticky), desc(posts.createdAt))
      .limit(limit)
      .offset(offset);

    const result = categoryId 
      ? await query.where(eq(posts.categoryId, categoryId))
      : await query;

    return result.map(post => ({
      ...post,
      author: { ...post.author, role: post.author.role as UserRole }
    }));
  }

  async getPost(id: number): Promise<PostWithAuthorAndCategory | undefined> {
    const [post] = await db
      .select({
        id: posts.id,
        title: posts.title,
        content: posts.content,
        authorId: posts.authorId,
        categoryId: posts.categoryId,
        helpfulVotes: posts.helpfulVotes,
        commentCount: posts.commentCount,
        isResolved: posts.isResolved,
        isSticky: posts.isSticky,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        author: users,
        category: categories,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .innerJoin(categories, eq(posts.categoryId, categories.id))
      .where(eq(posts.id, id));
    return post ? { ...post, author: { ...post.author, role: post.author.role as UserRole } } : undefined;
  }

  async createPost(post: InsertPost): Promise<Post> {
    const [newPost] = await db.insert(posts).values(post).returning();
    await this.updateCategoryPostCount(post.categoryId);
    return newPost;
  }

  async updatePostHelpfulVotes(postId: number, increment: number): Promise<void> {
    await db
      .update(posts)
      .set({ helpfulVotes: sql`${posts.helpfulVotes} + ${increment}` })
      .where(eq(posts.id, postId));
  }

  async updatePostCommentCount(postId: number, increment: number): Promise<void> {
    await db
      .update(posts)
      .set({ commentCount: sql`${posts.commentCount} + ${increment}` })
      .where(eq(posts.id, postId));
  }

  // Comment operations
  async getCommentsByPost(postId: number): Promise<CommentWithAuthor[]> {
    return await db
      .select({
        id: comments.id,
        content: comments.content,
        authorId: comments.authorId,
        postId: comments.postId,
        parentId: comments.parentId,
        helpfulVotes: comments.helpfulVotes,
        isExpertResponse: comments.isExpertResponse,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        author: users,
      })
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(eq(comments.postId, postId))
      .orderBy(comments.createdAt)
      .then(results => results.map(comment => ({
        ...comment,
        author: { ...comment.author, role: comment.author.role as UserRole }
      })));
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db.insert(comments).values(comment).returning();
    await this.updatePostCommentCount(comment.postId, 1);
    return newComment;
  }

  async updateCommentHelpfulVotes(commentId: number, increment: number): Promise<void> {
    await db
      .update(comments)
      .set({ helpfulVotes: sql`${comments.helpfulVotes} + ${increment}` })
      .where(eq(comments.id, commentId));
  }

  // Vote operations
  async getUserVote(userId: string, postId?: number, commentId?: number): Promise<Vote | undefined> {
    const conditions = [eq(votes.userId, userId)];
    
    if (postId) {
      conditions.push(eq(votes.postId, postId));
    }
    if (commentId) {
      conditions.push(eq(votes.commentId, commentId));
    }

    const [vote] = await db.select().from(votes).where(and(...conditions));
    return vote;
  }

  async createVote(vote: InsertVote): Promise<Vote> {
    const [newVote] = await db.insert(votes).values(vote).returning();

    // Update helpful votes count
    if (vote.postId) {
      await this.updatePostHelpfulVotes(vote.postId, 1);
    }
    if (vote.commentId) {
      await this.updateCommentHelpfulVotes(vote.commentId, 1);
    }

    return newVote;
  }

  async deleteVote(userId: string, postId?: number, commentId?: number): Promise<void> {
    const conditions = [eq(votes.userId, userId)];
    
    if (postId) {
      conditions.push(eq(votes.postId, postId));
      await this.updatePostHelpfulVotes(postId, -1);
    }
    if (commentId) {
      conditions.push(eq(votes.commentId, commentId));
      await this.updateCommentHelpfulVotes(commentId, -1);
    }

    await db.delete(votes).where(and(...conditions));
  }

  // Achievement operations
  async getAchievements(): Promise<Achievement[]> {
    return await db.select().from(achievements);
  }

  async getUserAchievements(userId: string): Promise<(UserAchievement & { achievement: Achievement })[]> {
    return await db
      .select({
        id: userAchievements.id,
        userId: userAchievements.userId,
        achievementId: userAchievements.achievementId,
        earnedAt: userAchievements.earnedAt,
        achievement: achievements,
      })
      .from(userAchievements)
      .innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
      .where(eq(userAchievements.userId, userId))
      .orderBy(desc(userAchievements.earnedAt));
  }

  async createUserAchievement(userAchievement: InsertUserAchievement): Promise<UserAchievement> {
    const [newUserAchievement] = await db.insert(userAchievements).values(userAchievement).returning();
    return newUserAchievement;
  }

  async checkAndAwardAchievements(userId: string): Promise<void> {
    // Implementation for checking and awarding achievements based on user activity
    // This would include logic for different badge criteria
    const userVotes = await db
      .select({ count: count() })
      .from(votes)
      .where(eq(votes.userId, userId));

    const userPosts = await db
      .select({ count: count() })
      .from(posts)
      .where(eq(posts.authorId, userId));

    // Example: Award "Welcome Wagon" badge for helping new members
    // Award "Wisdom Keeper" badge for 50+ helpful votes
    // etc.
  }

  // Expert verification operations
  async getExpertVerification(userId: string): Promise<ExpertVerification | undefined> {
    const [verification] = await db
      .select()
      .from(expertVerifications)
      .where(eq(expertVerifications.userId, userId));
    return verification;
  }

  async getVerifiedExperts(): Promise<(ExpertVerification & { user: User })[]> {
    const results = await db
      .select({
        expertVerification: expertVerifications,
        user: users
      })
      .from(expertVerifications)
      .innerJoin(users, eq(expertVerifications.userId, users.id))
      .where(eq(expertVerifications.verificationStatus, "verified"))
      .orderBy(desc(expertVerifications.verifiedAt));

    return results.map(result => ({
      ...result.expertVerification,
      user: { ...result.user, role: result.user.role as UserRole }
    }));
  }

  async getFeaturedExperts(): Promise<(ExpertVerification & { user: User })[]> {
    const results = await db
      .select({
        expertVerification: expertVerifications,
        user: users
      })
      .from(expertVerifications)
      .innerJoin(users, eq(expertVerifications.userId, users.id))
      .where(and(
        eq(expertVerifications.verificationStatus, "verified"),
        eq(expertVerifications.featuredExpert, true)
      ))
      .orderBy(desc(expertVerifications.verifiedAt));

    return results.map(result => ({
      ...result.expertVerification,
      user: { ...result.user, role: result.user.role as UserRole }
    }));
  }

  async getAllExperts(): Promise<(ExpertVerification & { user: User })[]> {
    const results = await db
      .select({
        expertVerification: expertVerifications,
        user: users
      })
      .from(users)
      .leftJoin(expertVerifications, eq(users.id, expertVerifications.userId))
      .where(eq(users.role, "expert"))
      .orderBy(users.firstName, users.lastName);

    return results.map(result => {
      // Determine the correct verification status based on both approval and verification
      let displayVerificationStatus: "verified" | "pending" | "rejected";
      
      if (result.user.approved === "no") {
        // If user not approved by admin, always show as pending regardless of verification status
        displayVerificationStatus = "pending";
      } else if (result.user.approved === "yes" && result.expertVerification?.verificationStatus === "verified") {
        // Only show as verified if both admin approved AND verification completed
        displayVerificationStatus = "verified";
      } else {
        // Default to pending for all other cases
        displayVerificationStatus = "pending";
      }

      // If they have expert verification data, return it in the expected format
      if (result.expertVerification) {
        return {
          ...result.expertVerification,
          verificationStatus: displayVerificationStatus, // Override with correct status
          user: { ...result.user, role: result.user.role as UserRole }
        };
      } 
      // If no expert verification, create a basic structure with all required fields
      else {
        return {
          id: null,
          userId: result.user.id,
          profession: "Expert",
          credentials: null,
          verificationStatus: displayVerificationStatus,
          expertiseArea: null,
          professionalTitle: null,
          company: null,
          bio: null,
          yearsExperience: null,
          licenseNumber: null,
          featuredExpert: false,
          consultationEnabled: false,
          hourlyRate: null,
          profileImageUrl: result.user.profileImageUrl,
          verificationDocumentUrl: null,
          verifiedAt: null,
          createdAt: result.user.createdAt,
          updatedAt: result.user.updatedAt,
          user: { ...result.user, role: result.user.role as UserRole }
        };
      }
    });
  }

  async createExpertVerification(verification: InsertExpertVerification): Promise<ExpertVerification> {
    const [newVerification] = await db.insert(expertVerifications).values(verification).returning();
    return newVerification;
  }

  async getPendingExpertVerifications(): Promise<(ExpertVerification & { user: User })[]> {
    const results = await db
      .select({
        expertVerification: expertVerifications, // Selects all columns from expertVerifications
        user: users
      })
      .from(expertVerifications)
      .innerJoin(users, eq(expertVerifications.userId, users.id))
      .where(eq(expertVerifications.verificationStatus, "pending"))
      .orderBy(desc(expertVerifications.createdAt));

    return results.map(result => ({
      ...result.expertVerification,
      user: { ...result.user, role: result.user.role as UserRole }
    }));
  }

  async updateExpertVerification(id: number, updates: Partial<InsertExpertVerification>): Promise<ExpertVerification> {
    const [updated] = await db
      .update(expertVerifications)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(expertVerifications.id, id))
      .returning();
    return updated;
  }

  async updateExpertVerificationStatus(id: number, status: 'verified' | 'rejected', adminUserId: string): Promise<ExpertVerification> {
    const [verified] = await db
      .update(expertVerifications)
      .set({
        verificationStatus: status,
        verifiedAt: status === 'verified' ? new Date() : null,
        verifiedBy: adminUserId,
        updatedAt: new Date()
      })
      .where(eq(expertVerifications.id, id))
      .returning();

    if (!verified) {
      throw new Error(`Expert verification with ID ${id} not found.`);
    }

    // Update the user's role and premium status based on verification outcome
    if (status === 'verified') {
      await db
        .update(users)
        .set({ isPremium: true, role: 'expert' })
        .where(eq(users.id, verified.userId));
    } else if (status === 'rejected') {
      // Revert role to 'user' and set isPremium to false upon rejection
      await db
        .update(users)
        .set({ isPremium: false, role: 'user' }) // Demote role upon rejection
        .where(eq(users.id, verified.userId));
    }

    return verified;
  }

  // Post source operations
  async getPostSource(postId: number): Promise<PostSource | undefined> {
    const [source] = await db
      .select()
      .from(postSources)
      .where(eq(postSources.postId, postId));
    return source;
  }

  async createPostSource(source: InsertPostSource): Promise<PostSource> {
    const [newSource] = await db.insert(postSources).values(source).returning();
    return newSource;
  }

  // Enhanced post operations with expert info
  async getPostsWithExpertInfo(categoryId?: number, limit = 20, offset = 0, sortBy: 'hot' | 'new' | 'top' = 'hot'): Promise<PostWithExpertInfo[]> {
    let query = db
      .select({
        post: posts,
        author: users,
        category: categories,
        source: postSources,
        expertVerification: expertVerifications,
        authorPostCount: sql<number>`(SELECT COUNT(*) FROM posts WHERE author_id = ${users.id})`,
        favoriteCount: sql<number>`(SELECT COUNT(*) FROM user_favorite_posts WHERE post_id = ${posts.id})`,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .innerJoin(categories, eq(posts.categoryId, categories.id))
      .leftJoin(postSources, eq(posts.id, postSources.postId))
      .leftJoin(expertVerifications, and(
        eq(users.id, expertVerifications.userId),
        eq(expertVerifications.verificationStatus, "verified")
      ));

    if (categoryId) {
      query = query.where(eq(posts.categoryId, categoryId));
    }

    // Apply sorting based on sortBy parameter
    if (sortBy === 'new') {
      query = query.orderBy(desc(posts.createdAt));
    } else if (sortBy === 'top') {
      // Sort by favorite count descending, then by created date
      query = query.orderBy(desc(sql`(SELECT COUNT(*) FROM user_favorite_posts WHERE post_id = ${posts.id})`), desc(posts.createdAt));
    } else {
      // 'hot' - default sorting by recent activity and engagement
      query = query.orderBy(desc(posts.createdAt));
    }

    query = query.limit(limit).offset(offset);

    const results = await query;

    return results.map(row => ({
      ...row.post,
      author: { ...row.author, role: row.author.role as UserRole },
      category: row.category,
      source: row.source || undefined,
      expertVerification: row.expertVerification || undefined,
      authorPostCount: row.authorPostCount,
      favoriteCount: row.favoriteCount,
    }));
  }

  async getPostWithExpertInfo(id: number): Promise<PostWithExpertInfo | undefined> {
    const [result] = await db
      .select({
        post: posts,
        author: users,
        category: categories,
        source: postSources,
        expertVerification: expertVerifications,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .innerJoin(categories, eq(posts.categoryId, categories.id))
      .leftJoin(postSources, eq(posts.id, postSources.postId))
      .leftJoin(expertVerifications, and(
        eq(users.id, expertVerifications.userId),
        eq(expertVerifications.verificationStatus, "verified")
      ))
      .where(eq(posts.id, id));

    if (!result) return undefined;

    return {
      ...result.post,
      author: { ...result.author, role: result.author.role as UserRole },
      category: result.category,
      source: result.source || undefined,
      expertVerification: result.expertVerification || undefined,
    };
  }

  async searchPosts(searchQuery: string, limit = 20, offset = 0): Promise<PostWithExpertInfo[]> {
    const searchTerm = `%${searchQuery}%`;
    
    // First, find matching post IDs from posts and comments
    const matchingPostIds = await db
      .selectDistinct({ postId: posts.id })
      .from(posts)
      .leftJoin(comments, eq(posts.id, comments.postId))
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .where(
        or(
          ilike(posts.title, searchTerm),
          ilike(posts.content, searchTerm),
          ilike(comments.content, searchTerm),
          ilike(categories.name, searchTerm)
        )
      );

    // If no matches found, return empty array
    if (matchingPostIds.length === 0) {
      return [];
    }

    const postIds = matchingPostIds.map(p => p.postId);

    // Fetch full post details with expert info and favorite count
    const results = await db
      .select({
        post: posts,
        author: users,
        category: categories,
        source: postSources,
        expertVerification: expertVerifications,
        authorPostCount: sql<number>`COUNT(DISTINCT p2.id) FILTER (WHERE p2.created_at >= NOW() - INTERVAL '365 days')`,
        favoriteCount: sql<number>`COUNT(DISTINCT ufp.user_id)`,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .innerJoin(categories, eq(posts.categoryId, categories.id))
      .leftJoin(postSources, eq(posts.id, postSources.postId))
      .leftJoin(expertVerifications, and(
        eq(users.id, expertVerifications.userId),
        eq(expertVerifications.verificationStatus, "verified")
      ))
      .leftJoin(sql`posts p2`, sql`p2.author_id = ${users.id}`)
      .leftJoin(sql`user_favorite_posts ufp`, sql`ufp.post_id = ${posts.id}`)
      .where(sql`${posts.id} IN (${sql.join(postIds.map(id => sql`${id}`), sql`, `)})`)
      .groupBy(
        posts.id,
        users.id,
        categories.id,
        postSources.id,
        expertVerifications.id
      )
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);

    return results.map(row => ({
      ...row.post,
      author: { ...row.author, role: row.author.role as UserRole },
      category: row.category,
      source: row.source || undefined,
      expertVerification: row.expertVerification || undefined,
      authorPostCount: row.authorPostCount,
      favoriteCount: row.favoriteCount,
    }));
  }

  // Analytics operations
  async getCommunityStats(): Promise<{
    totalUsers: number;
    totalPosts: number;
    totalComments: number;
    postsThisWeek: number;
  }> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [userCount] = await db.select({ count: count() }).from(users);
    const [postCount] = await db.select({ count: count() }).from(posts);
    const [commentCount] = await db.select({ count: count() }).from(comments);
    const [weeklyPostCount] = await db
      .select({ count: count() })
      .from(posts)
      .where(sql`${posts.createdAt} >= ${weekAgo}`);

    return {
      totalUsers: userCount.count,
      totalPosts: postCount.count,
      totalComments: commentCount.count,
      postsThisWeek: weeklyPostCount.count,
    };
  }

  // Moderation operations
  async getModerationResult(contentId: string): Promise<ModerationResult | undefined> {
    const [result] = await db
      .select()
      .from(moderationResults)
      .where(eq(moderationResults.contentId, contentId))
      .orderBy(desc(moderationResults.createdAt))
      .limit(1);
    return result;
  }

  async createModerationResult(moderation: InsertModerationResult): Promise<ModerationResult> {
    const [result] = await db
      .insert(moderationResults)
      .values(moderation)
      .returning();
    return result;
  }

  async getModerationQueue(): Promise<(ModerationResult & { content: any })[]> {
    const flaggedContent = await db
      .select()
      .from(moderationResults)
      .where(eq(moderationResults.moderationStatus, "flagged"))
      .orderBy(desc(moderationResults.createdAt));

    // Add content details for each moderation result
    const contentWithDetails = await Promise.all(
      flaggedContent.map(async (mod) => {
        let content = null;

        if (mod.contentType === "post") {
          const [post] = await db
            .select()
            .from(posts)
            .where(eq(posts.id, parseInt(mod.contentId)))
            .limit(1);
          content = post;
        } else if (mod.contentType === "comment") {
          const [comment] = await db
            .select()
            .from(comments)
            .where(eq(comments.id, parseInt(mod.contentId)))
            .limit(1);
          content = comment;
        }

        return { ...mod, content };
      })
    );

    return contentWithDetails;
  }

  async updateModerationStatus(id: number, status: string, reviewedBy: string): Promise<void> {
    await db
      .update(moderationResults)
      .set({
        moderationStatus: status,
        reviewedBy,
        reviewedAt: new Date(),
      })
      .where(eq(moderationResults.id, id));
  }

  // Consultation operations
  async createConsultation(consultation: InsertConsultation): Promise<Consultation> {
    const [newConsultation] = await db.insert(consultations).values(consultation).returning();
    return newConsultation;
  }

  async getUserConsultations(userId: string): Promise<any[]> {
    const userConsultations = await db
      .select({
        id: consultations.id,
        expertId: consultations.expertId,
        clientId: consultations.clientId,
        scheduledAt: consultations.scheduledAt,
        duration: consultations.duration,
        rate: consultations.rate,
        totalAmount: consultations.totalAmount,
        paymentStatus: consultations.paymentStatus,
        bookingStatus: consultations.bookingStatus,
        notes: consultations.notes,
        createdAt: consultations.createdAt,
        updatedAt: consultations.updatedAt,
        expert: {
          id: users.id,
          name: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
        }
      })
      .from(consultations)
      .leftJoin(users, eq(consultations.expertId, users.id))
      .where(eq(consultations.clientId, userId))
      .orderBy(desc(consultations.scheduledAt));
    return userConsultations;
  }

  async getExpertConsultations(expertId: string): Promise<Consultation[]> {
    const expertConsultations = await db
      .select()
      .from(consultations)
      .where(eq(consultations.expertId, expertId))
      .orderBy(desc(consultations.scheduledAt));
    return expertConsultations;
  }

  async updateConsultationStatus(id: number, status: string): Promise<Consultation> {
    const [updatedConsultation] = await db
      .update(consultations)
      .set({
        bookingStatus: status,
        updatedAt: new Date()
      })
      .where(eq(consultations.id, id))
      .returning();
    return updatedConsultation;
  }

  // Search phrase operations
  async getSearchPhrases(): Promise<SearchPhrase[]> {
    try {
      return await db
        .select()
        .from(searchPhrases)
        .where(eq(searchPhrases.isActive, true))
        .orderBy(searchPhrases.orderIndex, searchPhrases.createdAt);
    } catch (error) {
      console.error('Error fetching search phrases:', error);
      throw error;
    }
  }

  async createSearchPhrase(phrase: InsertSearchPhrase): Promise<SearchPhrase> {
    // Auto-format phrase to start with "Edith, " and lowercase
    let formattedPhrase = phrase.phrase.trim();

    // Remove existing "Edith, " if present
    if (formattedPhrase.toLowerCase().startsWith('edith, ')) {
      formattedPhrase = formattedPhrase.substring(7);
    }

    // Ensure first letter is lowercase
    if (formattedPhrase.length > 0) {
      formattedPhrase = formattedPhrase.charAt(0).toLowerCase() + formattedPhrase.slice(1);
    }

    // Add "Edith, " prefix
    formattedPhrase = 'Edith, ' + formattedPhrase;

    const [newPhrase] = await db
      .insert(searchPhrases)
      .values({ ...phrase, phrase: formattedPhrase })
      .returning();

    // await invalidateCache([CacheKeys.searchPhrases]);
    return newPhrase;
  }

  async updateSearchPhrase(id: number, updates: Partial<InsertSearchPhrase>): Promise<SearchPhrase> {
    // Auto-format phrase if being updated
    if (updates.phrase) {
      let formattedPhrase = updates.phrase.trim();

      // Remove existing "Edith, " if present
      if (formattedPhrase.toLowerCase().startsWith('edith, ')) {
        formattedPhrase = formattedPhrase.substring(7);
      }

      // Ensure first letter is lowercase
      if (formattedPhrase.length > 0) {
        formattedPhrase = formattedPhrase.charAt(0).toLowerCase() + formattedPhrase.slice(1);
      }

      // Add "Edith, " prefix
      updates.phrase = 'Edith, ' + formattedPhrase;
    }

    const [updatedPhrase] = await db
      .update(searchPhrases)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(searchPhrases.id, id))
      .returning();

    // await invalidateCache([CacheKeys.searchPhrases]);
    return updatedPhrase;
  }

  async deleteSearchPhrase(id: number): Promise<void> {
    await db
      .delete(searchPhrases)
      .where(eq(searchPhrases.id, id));

    // await invalidateCache([CacheKeys.searchPhrases]);
  }

  // Forum operations
  async getUserCreatedForums(userId: string): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .where(eq(categories.createdBy, userId))
      .orderBy(desc(categories.createdAt));
  }

  async searchForums(query: string): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .where(
        or(
          ilike(categories.name, `%${query}%`),
          ilike(categories.description, `%${query}%`)
        )
      )
      .orderBy(categories.name);
  }

  // Appointment booking operations
  async getExpertAvailability(expertId: string): Promise<ExpertAvailability[]> {
    return await db
      .select()
      .from(expertAvailability)
      .where(and(
        eq(expertAvailability.expertId, expertId),
        eq(expertAvailability.isActive, true)
      ))
      .orderBy(expertAvailability.dayOfWeek, expertAvailability.startTime);
  }

  async createExpertAvailability(availability: InsertExpertAvailability): Promise<ExpertAvailability> {
    const [newAvailability] = await db
      .insert(expertAvailability)
      .values(availability)
      .returning();
    return newAvailability;
  }


  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [newAppointment] = await db
      .insert(appointments)
      .values(appointment)
      .returning();
    return newAppointment;
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id));
    return appointment;
  }

  async getExpertAppointments(expertId: string): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(eq(appointments.expertId, expertId))
      .orderBy(desc(appointments.scheduledAt));
  }

  async getClientAppointments(clientId: string): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(eq(appointments.clientId, clientId))
      .orderBy(desc(appointments.scheduledAt));
  }

  async updateAppointmentStatus(id: number, status: string): Promise<Appointment> {
    const [updatedAppointment] = await db
      .update(appointments)
      .set({ status, updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();
    return updatedAppointment;
  }

  // VOTING SYSTEM METHODS
  async updateVote(voteId: number, voteType: string): Promise<Vote> {
    const [vote] = await db.update(votes)
      .set({ voteType })
      .where(eq(votes.id, voteId))
      .returning();
    return vote;
  }

  async updatePostVoteCount(postId: number, change: number): Promise<void> {
    await db.update(posts)
      .set({
        helpfulVotes: sql`GREATEST(0, ${posts.helpfulVotes} + ${change})`
      })
      .where(eq(posts.id, postId));
  }

  async updateCommentVoteCount(commentId: number, change: number): Promise<void> {
    await db.update(comments)
      .set({
        helpfulVotes: sql`GREATEST(0, ${comments.helpfulVotes} + ${change})`
      })
      .where(eq(comments.id, commentId));
  }

  // ACHIEVEMENT SYSTEM METHODS
  async getAchievementByName(name: string): Promise<Achievement | undefined> {
    const [achievement] = await db.select().from(achievements).where(eq(achievements.name, name));
    return achievement;
  }

  async getUserVotesReceived(userId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(votes)
      .leftJoin(posts, eq(votes.postId, posts.id))
      .leftJoin(comments, eq(votes.commentId, comments.id))
      .where(
        and(
          eq(votes.voteType, 'up'),
          or(
            eq(posts.authorId, userId),
            eq(comments.authorId, userId)
          )
        )
      );
    return result[0]?.count || 0;
  }

  // USER ACTIVITY METHODS
  async getUserActivity(userId: string, limit: number = 20, offset: number = 0): Promise<Activity[]> {
    // Get user's posts
    const userPosts = await db
      .select({
        id: posts.id,
        type: sql<'post'>`'post'`,
        title: posts.title,
        content: posts.content,
        createdAt: posts.createdAt,
        categoryName: categories.name
      })
      .from(posts)
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .where(eq(posts.authorId, userId))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);

    // Get user's comments
    const userComments = await db
      .select({
        id: comments.id,
        type: sql<'comment'>`'comment'`,
        title: sql<string | null>`NULL`,
        content: comments.content,
        createdAt: comments.createdAt,
        categoryName: sql<string | null>`NULL`
      })
      .from(comments)
      .where(eq(comments.authorId, userId))
      .orderBy(desc(comments.createdAt))
      .limit(limit)
      .offset(offset);

    // Combine and sort by date
    const allActivity = [...userPosts, ...userComments]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, limit);

    return allActivity as Activity[];
  }


  // USER PROFILE METHODS
  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return { ...user, role: user.role as UserRole };
  }

  async getUserStats(userId: string): Promise<{
    postCount: number;
    commentCount: number;
    votesReceived: number;
    achievementCount: number;
    forumsCreated: number;
  }> {
    const postCount = await db
      .select({ count: count() })
      .from(posts)
      .where(eq(posts.authorId, userId));

    const commentCount = await db
      .select({ count: count() })
      .from(comments)
      .where(eq(comments.authorId, userId));

    const votesReceived = await this.getUserVotesReceived(userId);

    const achievementCount = await db
      .select({ count: count() })
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId));

    const forumsCreated = await db
      .select({ count: count() })
      .from(categories)
      .where(eq(categories.createdBy, userId));

    return {
      postCount: postCount[0]?.count || 0,
      commentCount: commentCount[0]?.count || 0,
      votesReceived,
      achievementCount: achievementCount[0]?.count || 0,
      forumsCreated: forumsCreated[0]?.count || 0
    };
  }

  async getUserDashboardStats(userId: string): Promise<{
    postsCreated: number;
    helpfulVotes: number;
    commentsPosted: number;
    daysActive: number;
  }> {
    // Get posts created by user
    const postCount = await db
      .select({ count: count() })
      .from(posts)
      .where(eq(posts.authorId, userId));

    // Get comments posted by user
    const commentCount = await db
      .select({ count: count() })
      .from(comments)
      .where(eq(comments.authorId, userId));

    // Get helpful votes received by user (on their posts and comments)
    const postVotes = await db
      .select({ totalVotes: sql<number>`SUM(${posts.helpfulVotes})` })
      .from(posts)
      .where(eq(posts.authorId, userId));

    const commentVotes = await db
      .select({ totalVotes: sql<number>`SUM(${comments.helpfulVotes})` })
      .from(comments)
      .where(eq(comments.authorId, userId));

    const postVotesTotal = postVotes[0]?.totalVotes || 0;
    const commentVotesTotal = commentVotes[0]?.totalVotes || 0;
    const totalHelpfulVotes = postVotesTotal + commentVotesTotal;

    // Calculate days active (days since account creation)
    const user = await this.getUser(userId);
    const daysActive = user?.createdAt
      ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      postsCreated: postCount[0]?.count || 0,
      helpfulVotes: totalHelpfulVotes,
      commentsPosted: commentCount[0]?.count || 0,
      daysActive
    };
  }

  // CALENDAR INTEGRATION METHODS
  async createOrUpdateCalendarIntegration(data: InsertCalendarIntegration): Promise<CalendarIntegration> {
    // Check if integration already exists
    const existing = await this.getCalendarIntegration(data.expertId);

    if (existing) {
      // Update existing integration
      const [updated] = await db
        .update(calendarIntegrations)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(calendarIntegrations.expertId, data.expertId))
        .returning();
      return updated;
    } else {
      // Create new integration
      const [created] = await db
        .insert(calendarIntegrations)
        .values(data)
        .returning();
      return created;
    }
  }

  async getCalendarIntegration(expertId: string): Promise<CalendarIntegration | null> {
    const [integration] = await db
      .select()
      .from(calendarIntegrations)
      .where(and(
        eq(calendarIntegrations.expertId, expertId),
        eq(calendarIntegrations.isActive, true)
      ));
    return integration || null;
  }

  async updateCalendarIntegration(
    integrationId: number,
    updates: Partial<CalendarIntegration>
  ): Promise<CalendarIntegration> {
    const [updated] = await db
      .update(calendarIntegrations)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(calendarIntegrations.id, integrationId))
      .returning();
    return updated;
  }

  // BLOCKED TIME SLOTS METHODS
  async createBlockedTimeSlot(data: InsertBlockedTimeSlot): Promise<BlockedTimeSlot> {
    const [created] = await db
      .insert(blockedTimeSlots)
      .values(data)
      .returning();
    return created;
  }

  async getBlockedTimeSlots(
    expertId: string,
    startDate: Date,
    endDate: Date
  ): Promise<BlockedTimeSlot[]> {
    return await db
      .select()
      .from(blockedTimeSlots)
      .where(and(
        eq(blockedTimeSlots.expertId, expertId),
        lte(blockedTimeSlots.startDateTime, endDate),
        gte(blockedTimeSlots.endDateTime, startDate)
      ))
      .orderBy(blockedTimeSlots.startDateTime);
  }

  async deleteBlockedTimeSlot(slotId: number): Promise<void> {
    await db
      .delete(blockedTimeSlots)
      .where(eq(blockedTimeSlots.id, slotId));
  }

  // NOTIFICATION PREFERENCES METHODS
  async createOrUpdateNotificationPreferences(
    data: InsertNotificationPreference
  ): Promise<NotificationPreference> {
    const existing = await this.getNotificationPreferences(data.userId);

    if (existing) {
      const [updated] = await db
        .update(notificationPreferences)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(notificationPreferences.userId, data.userId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(notificationPreferences)
        .values(data)
        .returning();
      return created;
    }
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreference | null> {
    const [preferences] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));
    return preferences || null;
  }

  // APPOINTMENT REVIEWS METHODS
  async createAppointmentReview(data: InsertAppointmentReview): Promise<AppointmentReview> {
    const [created] = await db
      .insert(appointmentReviews)
      .values(data)
      .returning();
    return created;
  }

  async getAppointmentReviews(appointmentId: number): Promise<AppointmentReview[]> {
    return await db
      .select()
      .from(appointmentReviews)
      .where(eq(appointmentReviews.appointmentId, appointmentId))
      .orderBy(desc(appointmentReviews.createdAt));
  }

  async getExpertReviews(expertId: string, limit = 10): Promise<AppointmentReview[]> {
    return await db
      .select()
      .from(appointmentReviews)
      .where(and(
        eq(appointmentReviews.revieweeId, expertId),
        eq(appointmentReviews.isPublic, true)
      ))
      .orderBy(desc(appointmentReviews.createdAt))
      .limit(limit);
  }

  // ENHANCED APPOINTMENT METHODS
  async getAppointmentById(appointmentId: number): Promise<Appointment | null> {
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, appointmentId));
    return appointment || null;
  }

  async updateAppointment(appointmentId: number, updates: Partial<Appointment>): Promise<Appointment> {
    const [updated] = await db
      .update(appointments)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, appointmentId))
      .returning();
    return updated;
  }

  async getAvailableTimeSlots(expertId: string, date: string): Promise<string[]> {
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();

    // Get expert's availability for this day
    const availability = await db
      .select()
      .from(expertAvailability)
      .where(and(
        eq(expertAvailability.expertId, expertId),
        eq(expertAvailability.dayOfWeek, dayOfWeek),
        eq(expertAvailability.isActive, true)
      ));

    if (availability.length === 0) {
      return [];
    }

    // Get existing appointments for this date
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.expertId, expertId),
        gte(appointments.scheduledAt, startOfDay),
        lte(appointments.scheduledAt, endOfDay),
        ne(appointments.status, 'cancelled')
      ));

    // Get blocked time slots for this date
    const blockedSlots = await this.getBlockedTimeSlots(expertId, startOfDay, endOfDay);

    // Generate available time slots based on availability, appointments, and blocked slots
    const slots: string[] = [];

    for (const avail of availability) {
      const [startHour, startMinute] = avail.startTime.split(':').map(Number);
      const [endHour, endMinute] = avail.endTime.split(':').map(Number);

      const startTime = startHour * 60 + startMinute; // Convert to minutes
      const endTime = endHour * 60 + endMinute;

      // Generate 60-minute slots (can be made configurable)
      for (let time = startTime; time < endTime; time += 60) {
        const slotStart = new Date(targetDate);
        slotStart.setHours(Math.floor(time / 60), time % 60, 0, 0);

        const slotEnd = new Date(slotStart);
        slotEnd.setHours(slotEnd.getHours() + 1); // 1-hour slot

        // Check if slot conflicts with existing appointments
        const hasAppointmentConflict = existingAppointments.some(apt => {
          const aptStart = new Date(apt.scheduledAt);
          const aptEnd = new Date(aptStart.getTime() + apt.duration * 60 * 1000);
          return (slotStart < aptEnd && slotEnd > aptStart);
        });

        // Check if slot conflicts with blocked time
        const hasBlockedConflict = blockedSlots.some(blocked => {
          const blockedStart = new Date(blocked.startDateTime);
          const blockedEnd = new Date(blocked.endDateTime);
          return (slotStart < blockedEnd && slotEnd > blockedStart);
        });

        // Only add slot if no conflicts and it's in the future
        if (!hasAppointmentConflict && !hasBlockedConflict && slotStart > new Date()) {
          slots.push(slotStart.toISOString());
        }
      }
    }

    return slots.sort();
  }

  // TIMEZONE-AWARE AVAILABILITY METHODS
  async getAvailableTimeSlotsWithTimezone(
    expertId: string,
    date: string, // YYYY-MM-DD in client timezone
    clientTimezone: string
  ): Promise<{
    time: string; // Time in client timezone (HH:MM)
    utcTime: string; // ISO string for booking
    displayTime: string; // Formatted display time
  }[]> {
    // Get expert's timezone
    const expert = await this.getUser(expertId);
    if (!expert) throw new Error('Expert not found');

    const expertTimezone = expert.timezone || 'UTC';

    // Convert client date to expert's timezone to get correct day of week
    const clientDate = new Date(`${date}T12:00:00`);

    // Get day of week in expert's timezone
    const expertLocalDate = new Date(clientDate.toLocaleString("en-US", { timeZone: expertTimezone }));
    const dayOfWeek = expertLocalDate.getDay();

    // Get expert's availability for this day
    const availability = await db
      .select()
      .from(expertAvailability)
      .where(and(
        eq(expertAvailability.expertId, expertId),
        eq(expertAvailability.dayOfWeek, dayOfWeek),
        eq(expertAvailability.isActive, true)
      ));

    if (availability.length === 0) {
      return [];
    }

    // Generate time slots
    const slots: { time: string; utcTime: string; displayTime: string }[] = [];

    for (const avail of availability) {
      const [startHour, startMinute] = avail.startTime.split(':').map(Number);
      const [endHour, endMinute] = avail.endTime.split(':').map(Number);

      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      // Generate 30-minute slots
      for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
        const slotHour = Math.floor(minutes / 60);
        const slotMinute = minutes % 60;
        const expertLocalTime = `${slotHour.toString().padStart(2, '0')}:${slotMinute.toString().padStart(2, '0')}`;

        // Create datetime in expert's timezone
        const expertDateStr = expertLocalDate.toISOString().split('T')[0];
        const expertDateTime = new Date(`${expertDateStr}T${expertLocalTime}:00`);

        // Convert to UTC for storage
        const utcDateTime = new Date(expertDateTime.toLocaleString("en-US", { timeZone: "UTC" }));

        // Convert to client timezone for display
        const clientDateTime = new Date(utcDateTime.toLocaleString("en-US", { timeZone: clientTimezone }));
        const clientTime = `${clientDateTime.getHours().toString().padStart(2, '0')}:${clientDateTime.getMinutes().toString().padStart(2, '0')}`;

        // Format for display
        const displayTime = clientDateTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: clientTimezone
        });

        slots.push({
          time: clientTime,
          utcTime: utcDateTime.toISOString(),
          displayTime
        });
      }
    }

    // Filter out past time slots
    const now = new Date();
    return slots.filter(slot => new Date(slot.utcTime) > now).sort((a, b) => a.time.localeCompare(b.time));
  }

  async createAppointmentWithTimezone(
    appointmentData: Omit<InsertAppointment, 'scheduledAt'> & {
      scheduledAtUtc: string; // ISO string
      scheduledAtTimezone: string;
    }
  ): Promise<Appointment> {
    const { scheduledAtUtc, scheduledAtTimezone, ...rest } = appointmentData;

    const [created] = await db
      .insert(appointments)
      .values({
        ...rest,
        scheduledAt: new Date(scheduledAtUtc),
        scheduledAtTimezone,
      })
      .returning();

    return created;
  }

  // EXPERT AVAILABILITY METHODS

  async updateExpertAvailability(
    availabilityId: number,
    updates: Partial<ExpertAvailability>
  ): Promise<ExpertAvailability> {
    const [updated] = await db
      .update(expertAvailability)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(expertAvailability.id, availabilityId))
      .returning();
    return updated;
  }

  async deleteExpertAvailability(availabilityId: number): Promise<void> {
    await db
      .delete(expertAvailability)
      .where(eq(expertAvailability.id, availabilityId));
  }

  // DASHBOARD AND ANALYTICS METHODS
  async getAllAppointmentsWithDetails(): Promise<any[]> {
    // This would need a complex join query - for now, return basic appointments
    // In production, you'd want to optimize this with proper joins
    const allAppointments = await db
      .select()
      .from(appointments)
      .orderBy(desc(appointments.scheduledAt));

    // Enrich with expert and client details
    const enrichedAppointments = await Promise.all(
      allAppointments.map(async (appointment) => {
        let expertInfo = null;
        let clientInfo = null;

        try {
          const expert = await this.getUser(appointment.expertId);
          if (expert) {
            expertInfo = {
              id: expert.id,
              name: `${expert.firstName || ''} ${expert.lastName || ''}`.trim() || expert.username,
              email: expert.email
            };
          }
        } catch (error) {
          console.warn('Failed to get expert info:', error);
        }

        if (appointment.clientId) {
          try {
            const client = await this.getUser(appointment.clientId);
            if (client) {
              clientInfo = {
                id: client.id,
                name: `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.username,
                email: client.email
              };
            }
          } catch (error) {
            console.warn('Failed to get client info:', error);
          }
        }

        return {
          ...appointment,
          expert: expertInfo,
          client: clientInfo || {
            name: appointment.clientName,
            email: appointment.clientEmail
          },
          totalAmount: appointment.totalAmount / 100, // Convert to dollars
          platformFee: appointment.platformFee / 100,
          expertEarnings: appointment.expertEarnings / 100
        };
      })
    );

    return enrichedAppointments;
  }

  async getPlatformAnalytics(startDate: Date): Promise<any> {
    // Get all appointments from the period
    const appointmentsList = await db
      .select()
      .from(appointments)
      .where(gte(appointments.createdAt, startDate));

    // Get all experts
    const experts = await db
      .select()
      .from(expertVerifications)
      .where(eq(expertVerifications.verificationStatus, 'verified'));

    // Calculate metrics
    const totalAppointments = appointmentsList.length;
    const completedAppointments = appointmentsList.filter((apt: Appointment) => apt.status === 'completed').length;
    const cancelledAppointments = appointmentsList.filter((apt: Appointment) => apt.status === 'cancelled').length;
    const pendingAppointments = appointmentsList.filter((apt: Appointment) => apt.status === 'pending').length;

    const totalRevenue = appointmentsList
      .filter((apt: Appointment) => apt.status === 'completed')
      .reduce((sum: number, apt: Appointment) => sum + apt.totalAmount, 0);

    const platformRevenue = appointmentsList
      .filter((apt: Appointment) => apt.status === 'completed')
      .reduce((sum: number, apt: Appointment) => sum + apt.platformFee, 0);

    const expertRevenue = appointmentsList
      .filter((apt: Appointment) => apt.status === 'completed')
      .reduce((sum: number, apt: Appointment) => sum + apt.expertEarnings, 0);

    // Active experts (those with appointments in the period)
    const activeExpertIds = new Set(appointmentsList.map((apt: Appointment) => apt.expertId));
    const activeExperts = activeExpertIds.size;

    // Top performing experts
    const expertStats = appointmentsList
      .filter((apt: Appointment) => apt.status === 'completed')
      .reduce((acc: any, apt: Appointment) => {
        if (!acc[apt.expertId]) {
          acc[apt.expertId] = {
            expertId: apt.expertId,
            appointments: 0,
            revenue: 0
          };
        }
        acc[apt.expertId].appointments++;
        acc[apt.expertId].revenue += apt.expertEarnings;
        return acc;
      }, {} as any);

    const topExperts = Object.values(expertStats)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 10);

    // Daily breakdown
    const days = Math.ceil((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const dailyStats = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayAppointments = appointmentsList.filter((apt: Appointment) =>
        new Date(apt.scheduledAt).toISOString().split('T')[0] === dateStr
      );

      dailyStats.push({
        date: dateStr,
        appointments: dayAppointments.length,
        revenue: dayAppointments
          .filter((apt: Appointment) => apt.status === 'completed')
          .reduce((sum: number, apt: Appointment) => sum + apt.totalAmount, 0) / 100,
        platformFee: dayAppointments
          .filter((apt: Appointment) => apt.status === 'completed')
          .reduce((sum: number, apt: Appointment) => sum + apt.platformFee, 0) / 100
      });
    }

    return {
      summary: {
        totalExperts: experts.length,
        activeExperts,
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        pendingAppointments,
        totalRevenue: totalRevenue / 100,
        platformRevenue: platformRevenue / 100,
        expertRevenue: expertRevenue / 100,
        completionRate: totalAppointments > 0 ? (completedAppointments / totalAppointments * 100) : 0,
        cancellationRate: totalAppointments > 0 ? (cancelledAppointments / totalAppointments * 100) : 0,
        averageAppointmentValue: completedAppointments > 0 ? (totalRevenue / completedAppointments / 100) : 0
      },
      dailyStats,
      topExperts: topExperts.map((expert: any) => ({
        ...expert,
        revenue: expert.revenue / 100
      })),
      period: {
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString()
      }
    };
  }

  // Content Sources
  async getContentSources(): Promise<ContentSource[]> {
    return await db
      .select()
      .from(contentSources)
      .where(eq(contentSources.isActive, true))
      .orderBy(contentSources.orderIndex, contentSources.categoryName);
  }

  async getAllContentSources(): Promise<ContentSource[]> {
    return await db
      .select()
      .from(contentSources)
      .orderBy(contentSources.categoryId, contentSources.orderIndex, contentSources.name);
  }

  async getContentSourcesByCategory(categoryId: string): Promise<ContentSource[]> {
    return await db
      .select()
      .from(contentSources)
      .where(and(
        eq(contentSources.categoryId, categoryId),
        eq(contentSources.isActive, true)
      ))
      .orderBy(contentSources.orderIndex, contentSources.name);
  }

  async createContentSource(source: InsertContentSource): Promise<ContentSource> {
    const [newSource] = await db
      .insert(contentSources)
      .values(source)
      .returning();
    return newSource;
  }

  async updateContentSource(id: number, source: Partial<InsertContentSource>): Promise<ContentSource | undefined> {
    const [updatedSource] = await db
      .update(contentSources)
      .set({ ...source, updatedAt: new Date() })
      .where(eq(contentSources.id, id))
      .returning();
    return updatedSource;
  }

  async deleteContentSource(id: number): Promise<void> {
    await db
      .delete(contentSources)
      .where(eq(contentSources.id, id));
  }

  async reorderContentSources(categoryId: string, sourceIds: number[]): Promise<void> {
    // Update orderIndex for each source based on its position in the array
    const updatePromises = sourceIds.map((sourceId, index) =>
      db
        .update(contentSources)
        .set({ orderIndex: index })
        .where(eq(contentSources.id, sourceId))
    );

    await Promise.all(updatePromises);
  }

  // Q&A Knowledge operations
  async searchQaKnowledge(query: string): Promise<QaKnowledge[]> {
    const queryLower = query.toLowerCase().trim();

    // Get all Q&As for scoring
    const allQas = await db.select().from(qaKnowledge);

    // Common words to ignore in scoring
    const commonWords = new Set(['the', 'and', 'for', 'what', 'when', 'where', 'how', 'why', 'who', 'which', 'can', 'should', 'would', 'could', 'does', 'has', 'have', 'had', 'will', 'with', 'from', 'your', 'that', 'this', 'find', 'about', 'edith']);

    // Extract meaningful search terms
    const searchTerms = queryLower
      .split(' ')
      .filter(term => term.length > 2 && !commonWords.has(term));

    // Score each Q&A based on relevance
    const scoredResults = allQas.map(qa => {
      let score = 0;
      const questionLower = qa.question.toLowerCase();
      const answerLower = qa.answer.toLowerCase();

      // Check for exact phrase match first (highest priority)
      if (questionLower.includes(queryLower)) {
        score += 100;
      } else if (answerLower.includes(queryLower)) {
        score += 50;
      }

      // Then check individual terms
      searchTerms.forEach(term => {
        // Count occurrences in question (higher weight)
        const questionMatches = (questionLower.match(new RegExp(term, 'g')) || []).length;
        score += questionMatches * 10;

        // Count occurrences in answer (lower weight)
        const answerMatches = (answerLower.match(new RegExp(term, 'g')) || []).length;
        score += answerMatches * 5;

        // Bonus for exact word boundaries (not part of another word)
        const wordBoundaryRegex = new RegExp(`\\b${term}\\b`, 'gi');
        if (wordBoundaryRegex.test(questionLower)) {
          score += 15;
        }
        if (wordBoundaryRegex.test(answerLower)) {
          score += 8;
        }
      });

      // Special case handling for common queries
      if (queryLower.includes('medicare') && questionLower.includes('medicare')) {
        score += 200;
      }
      if (queryLower.includes('pension') && questionLower.includes('pension')) {
        score += 200;
      }
      if ((queryLower.includes('home care') || queryLower.includes('aging parent')) &&
          (questionLower.includes('home care') || questionLower.includes('aging parent'))) {
        score += 200;
      }

      return { qa, score };
    });

    // Filter and sort by score
    const results = scoredResults
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => item.qa);

    return results;
  }

  async createQaKnowledge(qa: InsertQaKnowledge): Promise<QaKnowledge> {
    const [newQa] = await db
      .insert(qaKnowledge)
      .values(qa)
      .returning();
    return newQa;
  }

  // Search log operations
  async createSearchLog(data: InsertSearchLog): Promise<SearchLog> {
    const [created] = await db
      .insert(searchLogs)
      .values(data)
      .returning();
    return created;
  }

  async getSearchLogs(limit = 100): Promise<SearchLog[]> {
    return await db
      .select()
      .from(searchLogs)
      .orderBy(desc(searchLogs.createdAt))
      .limit(limit);
  }

  async getSearchLogsByDateRange(startDate: Date, endDate: Date): Promise<SearchLog[]> {
    return await db
      .select()
      .from(searchLogs)
      .where(
        and(
          gte(searchLogs.createdAt, startDate),
          lte(searchLogs.createdAt, endDate)
        )
      )
      .orderBy(desc(searchLogs.createdAt));
  }

  async getAllQaKnowledge(): Promise<QaKnowledge[]> {
    return await db.select().from(qaKnowledge);
  }

  // User favorite content source operations
  async getUserFavoriteContentSources(userId: string): Promise<ContentSource[]> {
    const favorites = await db
      .select({
        contentSource: contentSources
      })
      .from(userFavoriteContentSources)
      .innerJoin(contentSources, eq(userFavoriteContentSources.contentSourceId, contentSources.id))
      .where(eq(userFavoriteContentSources.userId, userId))
      .orderBy(desc(userFavoriteContentSources.createdAt));

    return favorites.map(f => f.contentSource);
  }

  async toggleUserFavoriteContentSource(userId: string, contentSourceId: number): Promise<boolean> {
    // Check if already favorited
    const [existing] = await db
      .select()
      .from(userFavoriteContentSources)
      .where(and(
        eq(userFavoriteContentSources.userId, userId),
        eq(userFavoriteContentSources.contentSourceId, contentSourceId)
      ));

    if (existing) {
      // Remove favorite
      await db
        .delete(userFavoriteContentSources)
        .where(and(
          eq(userFavoriteContentSources.userId, userId),
          eq(userFavoriteContentSources.contentSourceId, contentSourceId)
        ));
      return false;
    } else {
      // Add favorite
      await db
        .insert(userFavoriteContentSources)
        .values({ userId, contentSourceId });
      return true;
    }
  }

  async isContentSourceFavoritedByUser(userId: string, contentSourceId: number): Promise<boolean> {
    const [favorite] = await db
      .select()
      .from(userFavoriteContentSources)
      .where(and(
        eq(userFavoriteContentSources.userId, userId),
        eq(userFavoriteContentSources.contentSourceId, contentSourceId)
      ));

    return !!favorite;
  }

  // User favorite post operations
  async getUserFavoritePosts(userId: string): Promise<Post[]> {
    const favorites = await db
      .select({
        post: posts
      })
      .from(userFavoritePosts)
      .innerJoin(posts, eq(userFavoritePosts.postId, posts.id))
      .where(eq(userFavoritePosts.userId, userId))
      .orderBy(desc(userFavoritePosts.createdAt));

    return favorites.map(f => f.post);
  }

  async toggleUserFavoritePost(userId: string, postId: number): Promise<boolean> {
    // Check if already favorited
    const [existing] = await db
      .select()
      .from(userFavoritePosts)
      .where(and(
        eq(userFavoritePosts.userId, userId),
        eq(userFavoritePosts.postId, postId)
      ));

    if (existing) {
      // Remove favorite
      await db
        .delete(userFavoritePosts)
        .where(and(
          eq(userFavoritePosts.userId, userId),
          eq(userFavoritePosts.postId, postId)
        ));
      return false;
    } else {
      // Add favorite
      await db
        .insert(userFavoritePosts)
        .values({ userId, postId });
      return true;
    }
  }

  async isPostFavoritedByUser(userId: string, postId: number): Promise<boolean> {
    const [favorite] = await db
      .select()
      .from(userFavoritePosts)
      .where(and(
        eq(userFavoritePosts.userId, userId),
        eq(userFavoritePosts.postId, postId)
      ));

    return !!favorite;
  }

  async getPostFavoriteCount(postId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(userFavoritePosts)
      .where(eq(userFavoritePosts.postId, postId));

    return result[0]?.count || 0;
  }

  // Email verification operations
  async createEmailVerificationToken(token: InsertEmailVerificationToken): Promise<EmailVerificationToken> {
    const [newToken] = await db.insert(emailVerificationTokens).values(token).returning();
    return newToken;
  }

  async getEmailVerificationToken(token: string): Promise<EmailVerificationToken | undefined> {
    const [verificationToken] = await db
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, token));
    return verificationToken;
  }

  async deleteEmailVerificationToken(token: string): Promise<void> {
    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.token, token));
  }

  async verifyUserEmail(userId: string): Promise<void> {
    await db.update(users).set({ emailVerified: true }).where(eq(users.id, userId));
  }

  // Password reset operations
  async createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [newToken] = await db.insert(passwordResetTokens).values(token).returning();
    return newToken;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return resetToken;
  }

  async deletePasswordResetToken(token: string): Promise<void> {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId));
  }

  // Social media embeds operations
  async getSocialMediaEmbeds(type: string): Promise<SocialMediaEmbed[]> {
    const embeds = await db
      .select()
      .from(socialMediaEmbeds)
      .where(and(
        eq(socialMediaEmbeds.type, type),
        eq(socialMediaEmbeds.isActive, true)
      ))
      .orderBy(socialMediaEmbeds.createdAt);
    return embeds;
  }

  async createSocialMediaEmbed(embed: InsertSocialMediaEmbed): Promise<SocialMediaEmbed> {
    const [created] = await db.insert(socialMediaEmbeds).values(embed).returning();
    return created;
  }

  async updateSocialMediaEmbed(id: number, embedCode: string): Promise<SocialMediaEmbed> {
    const [updated] = await db
      .update(socialMediaEmbeds)
      .set({
        embedCode,
        updatedAt: new Date()
      })
      .where(eq(socialMediaEmbeds.id, id))
      .returning();
    return updated;
  }

  async deleteSocialMediaEmbed(id: number): Promise<void> {
    await db.delete(socialMediaEmbeds).where(eq(socialMediaEmbeds.id, id));
  }

  // User approval operations
  async getUnapprovedExperts(): Promise<UserWithRole[]> {
    const unapprovedExperts = await db
      .select()
      .from(users)
      .where(and(
        eq(users.role, 'expert'),
        eq(users.approved, 'no')
      ))
      .orderBy(desc(users.createdAt));
    
    return unapprovedExperts.map(user => ({ ...user, role: user.role as UserRole }));
  }

  async approveUser(userId: string): Promise<UserWithRole> {
    const [approvedUser] = await db
      .update(users)
      .set({
        approved: 'yes',
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    return { ...approvedUser, role: approvedUser.role as UserRole };
  }
}

export const storage = new DatabaseStorage();
