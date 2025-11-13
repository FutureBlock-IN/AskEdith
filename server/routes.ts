import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: any;
    }
  }
}
import Stripe from "stripe";
import { randomBytes } from "crypto";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import {
  insertPostSchema,
  insertCommentSchema,
  insertVoteSchema,
  insertCategorySchema,
  insertSocialMediaEmbedSchema,
} from "@shared/schema";
import { z } from "zod";
import { moderateContent } from "./moderation";
import { createRedisSessionStore } from "./sessionStore";
import { initializeRedis } from "./initRedis";
import { createGraphQLServer } from "./graphql/server";
import { calendarService } from "./services/calendarService";
import { stripeService } from "./services/stripeService";
import { TimezoneService } from "./services/timezoneService";
import { googleCalendarService } from "./services/googleCalendarService";
import { syncUserWithDatabase, updateClerkUserMetadata } from "./services/userSync";
import { UpsertUser, UserRole } from "@shared/schema";
import { clerkAuthWithSync, optionalAuth, isAdmin } from "./middleware/clerkAuth";
import { clerkClient } from "@clerk/express";
import { emailService } from "./services/emailService";
import { enforcePromptQuota } from "./middleware/enforcePromptQuota"; // QUOTA TABLE

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn(
    "STRIPE_SECRET_KEY not found - Stripe functionality will be disabled",
  );
}

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    })
  : null;

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  setupAuth(app);

  // Stripe status check
  app.get("/api/stripe/status", (req, res) => {
    res.json({
      stripe: stripe ? "configured" : "not configured",
      hasKey: !!process.env.STRIPE_SECRET_KEY,
    });
  });

  // Redis status check
  app.get("/api/redis/status", async (req, res) => {
    try {
      const RedisCache = (await import("./redis")).default;
      const testKey = "redis:health:check";
      const testValue = { timestamp: Date.now(), status: "healthy" };

      // Test Redis connection
      await RedisCache.set(testKey, testValue, 30);
      const retrieved = await RedisCache.get(testKey);
      await RedisCache.del(testKey);

      res.json({
        redis: "connected",
        cacheTest: retrieved ? "passed" : "failed",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.json({
        redis: "disconnected",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Cache management endpoints
  app.get("/api/redis/cache-info", async (req, res) => {
    try {
      const RedisCache = (await import("./redis")).default;
      const keys = await RedisCache.keys("*");

      const cacheInfo = {
        totalKeys: keys.length,
        keysByType: {
          posts: keys.filter((k) => k.startsWith("posts:")).length,
          categories: keys.filter((k) => k.startsWith("categories:")).length,
          users: keys.filter((k) => k.startsWith("user:")).length,
          stats: keys.filter((k) => k.startsWith("stats:")).length,
          sessions: keys.filter((k) => k.startsWith("sess:")).length,
          other: keys.filter(
            (k) => !k.match(/^(posts:|categories:|user:|stats:|sess:)/),
          ).length,
        },
        sampleKeys: keys.slice(0, 10),
      };

      res.json(cacheInfo);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/redis/cache", async (req, res) => {
    try {
      const RedisCache = (await import("./redis")).default;
      const { pattern } = req.query;

      if (pattern && typeof pattern === "string") {
        await RedisCache.delPattern(pattern);
        res.json({ message: `Cleared cache for pattern: ${pattern}` });
      } else {
        await RedisCache.flushAll();
        res.json({ message: "All cache cleared" });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Community stats (public)
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getCommunityStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch community stats" });
    }
  });

  // Categories (public)
  app.get("/api/categories", async (req, res) => {
    try {
      // Force fresh data - categories can change when forums are created
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Get hierarchical category structure
  app.get("/api/categories/hierarchy", async (req, res) => {
    try {
      // Force fresh data - categories can change when forums are created
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      const hierarchy = await storage.getCategoryHierarchy();
      res.json(hierarchy);
    } catch (error) {
      console.error("Error fetching category hierarchy:", error);
      res.status(500).json({ message: "Failed to fetch category hierarchy" });
    }
  });

  // Get categories by level (0=General, 1=Main, 2=Subtopic)
  app.get("/api/categories/level/:level", async (req, res) => {
    try {
      // Force fresh data - categories can change when forums are created
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      const level = parseInt(req.params.level);
      const categories = await storage.getCategoriesByLevel(level);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories by level:", error);
      res.status(500).json({ message: "Failed to fetch categories by level" });
    }
  });

  // Get subcategories by parent ID
  app.get("/api/categories/parent/:parentId", async (req, res) => {
    try {
      const parentId = parseInt(req.params.parentId);
      const categories = await storage.getCategoriesByParent(parentId);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      res.status(500).json({ message: "Failed to fetch subcategories" });
    }
  });

  app.get("/api/categories/:slug", async (req, res) => {
    try {
      const category = await storage.getCategoryBySlug(req.params.slug);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      console.error("Error fetching category:", error);
      res.status(500).json({ message: "Failed to fetch category" });
    }
  });

  // Create new user forum (authenticated users only)
  app.post("/api/forums/create", isAuthenticated, async (req: any, res) => {
    try {
      const { name, description } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ message: "Forum name is required" });
      }

      // Generate slug from name
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();

      // Check if slug already exists
      const existingForum = await storage.getCategoryBySlug(slug);
      if (existingForum) {
        return res
          .status(400)
          .json({ message: "A forum with this name already exists" });
      }

      const forumData = {
        name: name.trim(),
        description:
          description?.trim() || `Community forum for ${name.trim()}`,
        slug: slug,
        color: "#6B7280", // Gray color for user forums
        icon: "users",
        postCount: 0,
        level: 0,
        orderIndex: 999, // Put user forums at the end
        isOfficial: false,
        createdBy: req.user.id,
        parentId: null,
      };

      const forum = await storage.createCategory(forumData);
      res.status(201).json({
        success: true,
        message: "Forum created successfully",
        forum: forum,
      });
    } catch (error) {
      console.error("Error creating forum:", error);
      res.status(500).json({ message: "Failed to create forum" });
    }
  });

  // Get user's created forums
  app.get("/api/forums/my-forums", isAuthenticated, async (req: any, res) => {
    try {
      const userForums = await storage.getUserCreatedForums(req.user.id);
      res.json(userForums);
    } catch (error) {
      console.error("Error fetching user forums:", error);
      res.status(500).json({ message: "Failed to fetch your forums" });
    }
  });

  // Search forums (including user-created ones)
  app.get("/api/forums/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length < 2) {
        return res
          .status(400)
          .json({ message: "Search query must be at least 2 characters" });
      }

      const results = await storage.searchForums(query.trim());
      res.json(results);
    } catch (error) {
      console.error("Error searching forums:", error);
      res.status(500).json({ message: "Failed to search forums" });
    }
  });

  // Create new category (authenticated users only)
  app.post("/api/categories", isAuthenticated, async (req: any, res) => {
    try {
      // Add default values for required fields
      const categoryData = {
        ...req.body,
        color: req.body.color || "#487d7a", // Default teal color
        icon: req.body.icon || "folder", // Default icon
        postCount: 0,
      };

      const validatedData = insertCategorySchema.parse(categoryData);
      const category = await storage.createCategory(validatedData);

      // Ensure we return a proper JSON response
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({
          message: "Invalid category data",
          errors: error.errors,
        });
      } else {
        res.status(500).json({ message: "Failed to create category" });
      }
    }
  });

  // Posts (public for viewing, auth required for creating)
  app.get("/api/posts", async (req, res) => {
    try {
      // Force fresh data - expert badges in posts need real-time updates
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const categoryId = req.query.categoryId
        ? parseInt(req.query.categoryId as string)
        : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset
        ? parseInt(req.query.offset as string)
        : 0;
      const sortBy = (req.query.sortBy as "hot" | "new" | "top") || "hot";

      console.log("GET /api/posts params:", {
        categoryId,
        limit,
        offset,
        sortBy,
      });

      // Use enhanced posts with expert info for all post requests
      const posts = await storage.getPostsWithExpertInfo(
        categoryId,
        limit,
        offset,
        sortBy,
      );
      console.log(
        `Returning ${posts.length} posts${categoryId ? ` for category ${categoryId}` : ""}`,
      );
      res.json(posts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  app.get("/api/posts/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      
      if (!query || query.trim().length === 0) {
        return res.status(400).json({ message: "Search query is required" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      console.log(`Searching posts with query: "${query}"`);

      const results = await storage.searchPosts(query.trim(), limit, offset);
      
      console.log(`Found ${results.length} posts matching "${query}"`);
      res.json(results);
    } catch (error) {
      console.error("Error searching posts:", error);
      res.status(500).json({ message: "Failed to search posts" });
    }
  });

  app.get("/api/posts/:id", async (req, res) => {
    try {
      // Force fresh data - expert badges in post details need real-time updates
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) {
        return res.status(400).json({ message: "Invalid post ID" });
      }

      // Use enhanced post with expert info for consistency with list view
      const post = await storage.getPostWithExpertInfo(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      res.json(post);
    } catch (error) {
      console.error("Error fetching post:", error);
      res.status(500).json({ message: "Failed to fetch post" });
    }
  });

  app.post("/api/posts", clerkAuthWithSync, async (req: any, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = req.userId;
      const postData = insertPostSchema.parse({
        ...req.body,
        authorId: userId,
      });

      // Create post
      const post = await storage.createPost(postData);

      // Skip moderation temporarily due to OpenAI quota issues
      // TODO: Re-enable when quota is resolved
      console.log("Moderation skipped due to OpenAI quota issues");

      await storage.checkAndAwardAchievements(userId);

      // Notify admins about new post
      try {
        const admins = await storage.getAdmins();
        const author = await storage.getUser(userId);
        const adminEmails = admins.map((a: any) => a.email).filter(Boolean);
        if (adminEmails.length > 0) {
          const subject = `New post created (${process.env.ENV_TYPE}): ${post.title}`;
          const html = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #0B666B; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">New Post on AskEdith</h1>
        </div>

        <div style="padding: 30px; background-color: #f5f5f5;">
          <h2 style="color: #333;">Hi Admin,</h2>
          <p style="color: #666; line-height: 1.6;">
            A new post has been created by <strong>${author?.firstName || ''} ${author?.lastName || ''} (${author?.email || 'N/A'})</strong> on AskEdith.
          </p>

          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0B666B;">
            <h3 style="color: #333; margin-top: 0;">Post Title:</h3>
            <p style="color: #666; font-style: italic;">"${post.title}"</p>

            <h3 style="color: #333;">Post Content:</h3>
            <p style="color: #666;">${post.content}</p>

            <h3 style="color: #333;">Posted At:</h3>
            <p style="color: #666;">${post.createdAt}</p>
          </div>
            
        </div>  
      </div>
          `;
          await Promise.all(
            adminEmails.map((to: string) =>
              emailService.sendEmail({ to, subject, html })
            )
          );
        }
      } catch (notifyErr) {
        console.warn("Failed to send admin new-post notification:", notifyErr);
      }

      res.json(post);
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(400).json({ message: "Failed to create post" });
    }
  });

  // (share token endpoints removed to avoid referencing non-existent DB column)

  // Comments (public for viewing, auth required for creating)
  app.get("/api/posts/:id/comments", async (req, res) => {
    try {
      const comments = await storage.getCommentsByPost(parseInt(req.params.id));
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post(
    "/api/posts/:id/comments",
    clerkAuthWithSync,
    async (req: any, res) => {
      try {
        if (!req.userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }
        const userId = req.userId;
        const postId = parseInt(req.params.id);
        const commentData = insertCommentSchema.parse({
          ...req.body,
          authorId: userId,
          postId,
        });

        // Create comment first
        const comment = await storage.createComment(commentData);

        // Run AI moderation on the comment content
        const moderationResult = await moderateContent(
          commentData.content,
          "comment",
          comment.id.toString(),
        );

        // Handle moderation result
        if (moderationResult.status === "rejected") {
          res.status(400).json({
            message:
              "Comment cannot be published due to content policy violations",
            reason: moderationResult.reason,
          });
          return;
        }

        if (moderationResult.status === "flagged") {
          res.json({
            ...comment,
            moderationNote:
              "Comment is under review and may be removed if it violates community guidelines",
          });
          return;
        }

        await storage.checkAndAwardAchievements(userId);
        res.json(comment);
      } catch (error) {
        console.error("Error creating comment:", error);
        res.status(400).json({ message: "Failed to create comment" });
      }
    },
  );

  // Voting system
  app.post("/api/vote", clerkAuthWithSync, async (req: any, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = req.userId;
      const { postId, commentId } = req.body;

      // Check if user already voted
      const existingVote = await storage.getUserVote(userId, postId, commentId);

      if (existingVote) {
        // Remove vote
        await storage.deleteVote(userId, postId, commentId);
        res.json({ voted: false });
      } else {
        // Add vote
        const voteData = insertVoteSchema.parse({
          userId,
          postId: postId || null,
          commentId: commentId || null,
        });
        await storage.createVote(voteData);
        await storage.checkAndAwardAchievements(userId);
        res.json({ voted: true });
      }
    } catch (error) {
      console.error("Error handling vote:", error);
      res.status(400).json({ message: "Failed to handle vote" });
    }
  });

  app.get(
    "/api/vote/:postId?/:commentId?",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const postId = req.params.postId
          ? parseInt(req.params.postId)
          : undefined;
        const commentId = req.params.commentId
          ? parseInt(req.params.commentId)
          : undefined;

        const vote = await storage.getUserVote(userId, postId, commentId);
        res.json({ voted: !!vote });
      } catch (error) {
        console.error("Error checking vote:", error);
        res.status(500).json({ message: "Failed to check vote" });
      }
    },
  );

  // User achievements
  app.get("/api/user/achievements", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const achievements = await storage.getUserAchievements(userId);
      res.json(achievements);
    } catch (error) {
      console.error("Error fetching user achievements:", error);
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });

  // Stripe subscription endpoint (if Stripe is available)
  if (stripe) {
    // New endpoint for expert verification payment intent
    app.post(
      "/api/experts/create-verification-payment-intent",
      isAuthenticated,
      async (req: any, res) => {
        try {
          const userId = req.user?.id || req.user?.claims?.sub;
          if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
          }

          const { amount } = req.body; // Expect amount in cents, e.g., 10000 for $100

          if (!amount || typeof amount !== "number" || amount <= 0) {
            return res
              .status(400)
              .json({
                message: "Invalid amount specified for verification fee",
              });
          }

          console.log("Creating payment intent for expert verification:", {
            userId,
            amount,
          });

          const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: "usd",
            metadata: {
              type: "expert_verification_fee",
              userId: userId,
            },
            automatic_payment_methods: {
              enabled: true,
              allow_redirects: "always",
            },
          });

          console.log("Payment intent created:", {
            id: paymentIntent.id,
            status: paymentIntent.status,
            client_secret: paymentIntent.client_secret ? "present" : "missing",
          });

          res.json({ clientSecret: paymentIntent.client_secret });
        } catch (error: any) {
          console.error(
            "Error creating expert verification payment intent:",
            error,
          );
          res
            .status(500)
            .json({
              message: "Failed to create payment intent: " + error.message,
            });
        }
      },
    );

    // Confirm payment with payment method
    app.post(
      "/api/experts/confirm-verification-payment",
      isAuthenticated,
      async (req: any, res) => {
        try {
          const userId = req.user?.id || req.user?.claims?.sub;
          if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
          }

          const { paymentMethodId } = req.body;

          if (!paymentMethodId) {
            return res
              .status(400)
              .json({ message: "Payment method ID required" });
          }

          console.log(
            "Creating and confirming payment intent with method:",
            paymentMethodId,
          );

          // Create and confirm payment intent in one step
          const paymentIntent = await stripe.paymentIntents.create({
            amount: 10000, // $100.00
            currency: "usd",
            payment_method: paymentMethodId,
            confirm: true,
            metadata: {
              type: "expert_verification_fee",
              userId: userId,
            },
            automatic_payment_methods: {
              enabled: true,
              allow_redirects: "always",
            },
          });

          console.log("Payment intent result:", {
            id: paymentIntent.id,
            status: paymentIntent.status,
            requiresAction: paymentIntent.status === "requires_action",
          });

          if (paymentIntent.status === "requires_action") {
            // 3D Secure is required
            return res.json({
              requiresAction: true,
              clientSecret: paymentIntent.client_secret,
            });
          } else if (paymentIntent.status === "succeeded") {
            // Payment was successful
            return res.json({
              success: true,
              paymentIntentId: paymentIntent.id,
            });
          } else {
            // Payment failed
            return res.status(400).json({
              error: `Payment failed with status: ${paymentIntent.status}`,
            });
          }
        } catch (error: any) {
          console.error("Error confirming payment:", error);
          res
            .status(500)
            .json({ message: "Failed to process payment: " + error.message });
        }
      },
    );

    // Create Stripe checkout session for expert application
    app.post(
      "/api/experts/create-checkout-session",
      isAuthenticated,
      async (req: any, res) => {
        try {
          const userId = req.user?.id || req.user?.claims?.sub;
          if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
          }

          const { applicationData } = req.body;
          if (!applicationData) {
            return res
              .status(400)
              .json({ message: "Application data required" });
          }

          console.log("Creating checkout session for expert verification");

          // Store application data in session metadata (Stripe has limits on metadata size)
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
              {
                price_data: {
                  currency: "usd",
                  product_data: {
                    name: "Expert Verification Fee",
                    description: "One-time fee for expert profile verification",
                  },
                  unit_amount: 10000, // $100.00
                },
                quantity: 1,
              },
            ],
            mode: "payment",
            success_url: `${process.env.REPLIT_DOMAINS ? "https://" + process.env.REPLIT_DOMAINS : "http://localhost:5000"}/expert-application-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.REPLIT_DOMAINS ? "https://" + process.env.REPLIT_DOMAINS : "http://localhost:5000"}/expert-application-simple`,
            metadata: {
              userId: userId,
              type: "expert_verification",
              // Store essential data only due to Stripe metadata limits
              profession: applicationData.profession,
              company: applicationData.company,
            },
            client_reference_id: userId,
          });

          // We'll pass the application data through the success URL as a session parameter
          // The success page will retrieve the session and complete the application

          console.log("Checkout session created:", session.id);
          res.json({ url: session.url, sessionId: session.id });
        } catch (error: any) {
          console.error("Error creating checkout session:", error);
          res
            .status(500)
            .json({
              message: "Failed to create checkout session: " + error.message,
            });
        }
      },
    );

    // Simple payment intent creation without auto-confirm
    app.post(
      "/api/experts/create-simple-payment-intent",
      isAuthenticated,
      async (req: any, res) => {
        try {
          const userId = req.user?.id || req.user?.claims?.sub;
          if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
          }

          console.log("Creating simple payment intent for expert verification");

          // Create payment intent without confirming
          const paymentIntent = await stripe.paymentIntents.create({
            amount: 10000, // $100.00
            currency: "usd",
            metadata: {
              type: "expert_verification_fee",
              userId: userId,
            },
          });

          console.log("Simple payment intent created:", {
            id: paymentIntent.id,
            status: paymentIntent.status,
          });

          res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
          });
        } catch (error: any) {
          console.error("Error creating simple payment intent:", error);
          res
            .status(500)
            .json({
              message: "Failed to create payment intent: " + error.message,
            });
        }
      },
    );

    // Apply with payment method - simpler approach
    app.post(
      "/api/experts/apply-with-payment-method",
      isAuthenticated,
      async (req: any, res) => {
        try {
          const userId = req.user?.id || req.user?.claims?.sub;
          if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
          }

          const { paymentMethodId, ...applicationData } = req.body;

          if (!paymentMethodId) {
            return res
              .status(400)
              .json({ message: "Payment method ID required" });
          }

          console.log(
            "Processing expert application with payment method:",
            paymentMethodId,
          );

          // Create and confirm payment intent in one step
          const paymentIntent = await stripe.paymentIntents.create({
            amount: 10000, // $100.00
            currency: "usd",
            payment_method: paymentMethodId,
            confirm: true,
            metadata: {
              type: "expert_verification_fee",
              userId: userId,
            },
          });

          console.log("Payment intent result:", {
            id: paymentIntent.id,
            status: paymentIntent.status,
          });

          if (
            paymentIntent.status === "requires_action" &&
            paymentIntent.client_secret
          ) {
            // 3D Secure is required
            return res.json({
              requiresAction: true,
              clientSecret: paymentIntent.client_secret,
            });
          } else if (paymentIntent.status === "succeeded") {
            // Payment was successful, create the application
            const expertVerification = await storage.createExpertVerification({
              userId,
              ...applicationData,
              stripePaymentIntentId: paymentIntent.id,
              verificationStatus: "pending",
              isActive: false,
            });

            console.log("Expert verification created:", expertVerification.id);

            // Send confirmation email
            if (req.user?.email) {
              await emailService.sendExpertApplicationConfirmation(
                req.user.email,
                req.user.username || "Expert",
              );
            }

            return res.json({
              success: true,
              expertVerification,
            });
          } else {
            // Payment failed
            return res.status(400).json({
              error: `Payment failed with status: ${paymentIntent.status}`,
            });
          }
        } catch (error: any) {
          console.error(
            "Error processing expert application with payment:",
            error,
          );
          res
            .status(500)
            .json({
              message: "Failed to process application: " + error.message,
            });
        }
      },
    );

    // Check payment intent status
    app.post(
      "/api/experts/check-payment-status",
      isAuthenticated,
      async (req: any, res) => {
        try {
          const { paymentIntentId } = req.body;

          if (!paymentIntentId) {
            return res
              .status(400)
              .json({ message: "Payment intent ID required" });
          }

          const paymentIntent =
            await stripe.paymentIntents.retrieve(paymentIntentId);

          console.log("Payment intent status check:", {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            metadata: paymentIntent.metadata,
          });

          res.json({
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            metadata: paymentIntent.metadata,
          });
        } catch (error: any) {
          console.error("Error checking payment status:", error);
          res
            .status(500)
            .json({
              message: "Failed to check payment status: " + error.message,
            });
        }
      },
    );

    // Existing subscription endpoint
    app.post(
      "/api/get-or-create-subscription",
      isAuthenticated,
      async (req: any, res) => {
        try {
          const userId = req.user?.id || req.user?.claims?.sub;
          if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
          }

          let user = await storage.getUser(userId);

          if (!user) {
            return res.status(404).json({ message: "User not found" });
          }

          if (user.stripeSubscriptionId && user.isPremium) {
            try {
              const subscription = await stripe.subscriptions.retrieve(
                user.stripeSubscriptionId,
              );
              const invoice = await stripe.invoices.retrieve(
                subscription.latest_invoice as string,
              );

              res.json({
                subscriptionId: subscription.id,
                clientSecret: (invoice.payment_intent as any)?.client_secret,
              });
              return;
            } catch (error) {
              console.error("Error retrieving subscription:", error);
              // Continue to create new subscription if retrieval fails
            }
          }

          if (!user.email) {
            return res.status(400).json({ message: "No user email on file" });
          }

          try {
            let customer;
            if (user.stripeCustomerId) {
              customer = await stripe.customers.retrieve(user.stripeCustomerId);
            } else {
              customer = await stripe.customers.create({
                email: user.email,
                name: `${user.firstName} ${user.lastName}`.trim(),
              });

              user = await storage.upsertUser({
                ...user,
                stripeCustomerId: customer.id,
              });
            }

            // Create a price for $9.99/month if no price ID is set
            let priceId = process.env.STRIPE_PRICE_ID;
            if (!priceId) {
              const price = await stripe.prices.create({
                currency: "usd",
                unit_amount: 999, // $9.99 in cents
                recurring: { interval: "month" },
                product_data: {
                  name: "AskEdith Premium Membership",
                },
              });
              priceId = price.id;
            }

            const subscription = await stripe.subscriptions.create({
              customer: customer.id,
              items: [
                {
                  price: priceId,
                },
              ],
              payment_behavior: "default_incomplete",
              expand: ["latest_invoice.payment_intent"],
            });

            await storage.updateUserStripeInfo(userId, {
              customerId: customer.id,
              subscriptionId: subscription.id,
            });

            res.json({
              subscriptionId: subscription.id,
              clientSecret: (subscription.latest_invoice as any)?.payment_intent
                ?.client_secret,
            });
          } catch (error: any) {
            console.error("Error creating subscription:", error);
            return res.status(400).json({ error: { message: error.message } });
          }
        } catch (error: any) {
          console.error("Authentication or server error:", error);
          return res
            .status(500)
            .json({ message: "Failed to create subscription" });
        }
      },
    );
  } else {
    app.post("/api/get-or-create-subscription", (req, res) => {
      res.status(503).json({ message: "Stripe not configured" });
    });
  }

  // Initialize default categories if they don't exist
  (async () => {
    try {
      const existingCategories = await storage.getCategories();
      if (existingCategories.length === 0) {
        const defaultCategories = [
          {
            name: "Senior Living",
            description:
              "Assisted living, memory care, and housing decisions for aging parents.",
            slug: "senior-living",
            color: "rose",
            icon: "home",
          },
          {
            name: "Home Care",
            description:
              "In-home caregiving, daily routines, and managing care at home.",
            slug: "home-care",
            color: "blue",
            icon: "heart-handshake",
          },
          {
            name: "Government Resources",
            description:
              "Medicare, Medicaid, benefits, and navigating government programs.",
            slug: "government-resources",
            color: "emerald",
            icon: "landmark",
          },
          {
            name: "Legal & Attorneys",
            description:
              "Legal planning, estate matters, and working with attorneys.",
            slug: "legal-attorneys",
            color: "amber",
            icon: "scale",
          },
          {
            name: "Paying for Care",
            description:
              "Financial planning, insurance, and affording quality care options.",
            slug: "paying-for-care",
            color: "lime",
            icon: "dollar-sign",
          },
          {
            name: "Physical Therapy",
            description:
              "Rehabilitation, mobility, and physical therapy resources.",
            slug: "physical-therapy",
            color: "cyan",
            icon: "activity",
          },
          {
            name: "VA Benefits",
            description:
              "Veterans Affairs benefits and resources for military families.",
            slug: "va-benefits",
            color: "teal",
            icon: "shield",
          },
          {
            name: "Other Professionals",
            description:
              "Healthcare specialists, social workers, and other professional services.",
            slug: "other-professionals",
            color: "indigo",
            icon: "users",
          },
        ];

        for (const category of defaultCategories) {
          await storage.createCategory(category);
        }
        console.log("Default categories initialized");
      }
    } catch (error) {
      console.error("Error initializing categories:", error);
    }
  })();

  // Moderation dashboard routes (admin/moderator access)
  app.get("/api/moderation/queue", isAuthenticated, async (req: any, res) => {
    try {
      // In a production app, you'd check if user has moderator permissions
      const moderationQueue = await storage.getModerationQueue();
      res.json(moderationQueue);
    } catch (error) {
      console.error("Error fetching moderation queue:", error);
      res.status(500).json({ message: "Failed to fetch moderation queue" });
    }
  });

  app.post(
    "/api/moderation/:id/review",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const moderationId = parseInt(req.params.id);
        const { status } = req.body;

        if (!["approved", "rejected"].includes(status)) {
          return res.status(400).json({ message: "Invalid status" });
        }

        await storage.updateModerationStatus(moderationId, status, userId);
        res.json({ message: "Content review completed successfully" });
      } catch (error) {
        console.error("Error reviewing content:", error);
        res.status(500).json({ message: "Failed to review content" });
      }
    },
  );


  // Expert routes
  app.get("/api/experts", async (req, res) => {
    try {
      // Force fresh data - no caching for approval-sensitive data
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const experts = await storage.getAllExperts();
      res.json(experts);
    } catch (error) {
      console.error("Error fetching experts:", error);
      res.status(500).json({ message: "Failed to fetch experts" });
    }
  });

  app.get("/api/experts/verified", async (req, res) => {
    try {
      // Force fresh data - no caching for approval-sensitive data
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const experts = await storage.getVerifiedExperts();
      res.json(experts);
    } catch (error) {
      console.error("Error fetching verified experts:", error);
      res.status(500).json({ message: "Failed to fetch verified experts" });
    }
  });

  app.get("/api/experts/featured", async (req, res) => {
    try {
      // Force fresh data - no caching for approval-sensitive data
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const experts = await storage.getFeaturedExperts();
      res.json(experts);
    } catch (error) {
      console.error("Error fetching featured experts:", error);
      res.status(500).json({ message: "Failed to fetch featured experts" });
    }
  });

  app.get("/api/experts/me", isAuthenticated, async (req: any, res) => {
    try {
      const verification = await storage.getExpertVerification(req.user.id);
      if (!verification) {
        return res
          .status(404)
          .json({ message: "No expert verification found" });
      }
      res.json(verification);
    } catch (error) {
      console.error("Error fetching expert verification:", error);
      res.status(500).json({ message: "Failed to fetch expert verification" });
    }
  });

  // Admin routes for expert verification
  app.get("/api/admin/expert-applications", isAdmin, async (req, res) => {
    try {
      const pendingApplications = await storage.getPendingExpertVerifications();
      res.json(pendingApplications);
    } catch (error) {
      console.error("Error fetching pending expert applications:", error);
      res.status(500).json({ message: "Failed to fetch pending applications" });
    }
  });

  app.post(
    "/api/admin/expert-applications/:id/review",
    isAdmin,
    async (req: any, res) => {
      try {
        const { id } = req.params;
        const { status } = req.body; // 'verified' or 'rejected'

        if (!["verified", "rejected"].includes(status)) {
          return res.status(400).json({ message: "Invalid status" });
        }

        const updatedApplication = await storage.updateExpertVerificationStatus(
          parseInt(id),
          status,
          req.user.id,
        );

        // If expert is verified, also approve the user automatically
        if (status === 'verified' && updatedApplication?.userId) {
          try {
            await storage.approveUser(updatedApplication.userId);
            
            // Additional cache invalidation for real-time updates
            try {
              const { invalidateCache, InvalidationPatterns } = await import("./cache");
              await invalidateCache([
                InvalidationPatterns.experts,
                ...InvalidationPatterns.user(updatedApplication.userId),
                'experts:*',
                'posts:*',  // Add posts cache invalidation for expert badges in posts
                'admin:*'
              ]);
            } catch (cacheError) {
              console.log("Cache invalidation failed (non-critical):", cacheError.message);
            }
          } catch (error) {
            console.error("Failed to auto-approve user after verification:", error);
            // Don't fail the entire request if user approval fails
          }
        }

        res.json({
          message: `Application ${status} successfully.`,
          application: updatedApplication,
        });
      } catch (error) {
        console.error("Error reviewing expert application:", error);
        res.status(500).json({ message: "Failed to review application" });
      }
    },
  );

  app.get(
    "/api/experts/my-application",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const application = await storage.getExpertVerification(req.user.id);
        if (!application)
          return res.status(404).json({ message: "Application not found" });
        res.json(application);
      } catch (error) {
        console.error("Error fetching expert application:", error);
        res.status(500).json({ message: "Failed to fetch application" });
      }
    },
  );

  // Complete expert application after Stripe checkout
  app.post(
    "/api/experts/complete-checkout-application",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user?.id || req.user?.claims?.sub;
        if (!userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        const { sessionId, applicationData } = req.body;
        if (!sessionId || !applicationData) {
          return res
            .status(400)
            .json({ message: "Session ID and application data required" });
        }

        // Verify the checkout session
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (
          session.payment_status !== "paid" ||
          session.metadata?.userId !== userId
        ) {
          return res.status(400).json({ message: "Invalid or unpaid session" });
        }

        // Create the expert verification record
        const verification = await storage.createExpertVerification({
          userId,
          profession: applicationData.profession,
          expertiseArea: applicationData.expertiseArea,
          credentials: applicationData.credentials,
          bio: applicationData.bio,
          yearsExperience: parseInt(applicationData.yearsOfExperience),
          licenseNumber: applicationData.licenseNumber,
          company: applicationData.company,
          companyAddress: applicationData.companyAddress,
          companyWebsite: applicationData.companyWebsite || null,
          companyEmail: applicationData.companyEmail,
          website: applicationData.websiteUrl || null,
          linkedinUrl: applicationData.linkedinUrl || null,
          blogUrl: applicationData.blogUrl || null,
          booksUrl: applicationData.booksUrl || null,
          articlesUrl: applicationData.articlesUrl || null,
          profileImageUrl: null,
          licenseFileUrl: null,
          consultationRate: parseInt(applicationData.consultationRate) * 100, // Convert to cents
          consultationEnabled: true,
          verificationFeeStatus: "paid",
          verificationFeePaidAt: new Date(),
          verificationStatus: "pending",
          stripePaymentIntentId: session.payment_intent as string,
        });

        res.json({ success: true, verification });
      } catch (error: any) {
        console.error("Error completing checkout application:", error);
        res
          .status(500)
          .json({
            message: "Failed to complete application: " + error.message,
          });
      }
    },
  );

  // Expert application with payment
  app.post(
    "/api/experts/apply-with-payment",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const expertData = req.body;

        // Check if user already has a verification request
        const existing = await storage.getExpertVerification(userId);
        if (existing) {
          return res
            .status(400)
            .json({ message: "Expert verification already exists" });
        }

        // File URLs are now handled client-side and passed in the body
        const { profileImageUrl, licenseFileUrl, stripePaymentIntentId } =
          expertData;

        // Verify payment if stripePaymentIntentId is provided
        if (stripePaymentIntentId && stripe) {
          try {
            const paymentIntent = await stripe.paymentIntents.retrieve(
              stripePaymentIntentId,
            );
            console.log("Verifying payment intent:", {
              id: paymentIntent.id,
              status: paymentIntent.status,
              amount: paymentIntent.amount,
            });

            if (paymentIntent.status !== "succeeded") {
              return res.status(400).json({
                message: `Payment not completed. Status: ${paymentIntent.status}`,
              });
            }
          } catch (error) {
            console.error("Error verifying payment intent:", error);
            return res.status(400).json({
              message:
                "Invalid payment reference. Please complete payment first.",
            });
          }
        }

        const verification = await storage.createExpertVerification({
          userId,
          profession: expertData.profession,
          expertiseArea: expertData.expertiseArea,
          credentials: expertData.credentials,
          bio: expertData.bio,
          yearsExperience: parseInt(expertData.yearsOfExperience),
          licenseNumber: expertData.licenseNumber,
          company: expertData.company,
          companyAddress: expertData.companyAddress,
          companyWebsite: expertData.companyWebsite || null,
          companyEmail: expertData.companyEmail,
          website: expertData.websiteUrl || null,
          linkedinUrl: expertData.linkedinUrl || null,
          blogUrl: expertData.blogUrl || null,
          booksUrl: expertData.booksUrl || null,
          articlesUrl: expertData.articlesUrl || null,
          profileImageUrl: profileImageUrl || null,
          licenseFileUrl: licenseFileUrl || null,
          consultationRate: parseInt(expertData.consultationRate) * 100, // Convert to cents
          consultationEnabled: expertData.consultationEnabled === "true",
          verificationFeeStatus: "paid", // Assuming payment was successful
          verificationFeePaidAt: new Date(),
          verificationStatus: "pending",
          stripePaymentIntentId: stripePaymentIntentId || null,
        });

        res.json(verification);
      } catch (error) {
        console.error("Error creating expert verification:", error);
        res.status(500).json({ message: "Failed to submit application" });
      }
    },
  );

  app.post("/api/experts/apply", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const expertData = req.body;

      // Check if user already has a verification request
      const existing = await storage.getExpertVerification(userId);
      if (existing) {
        return res
          .status(400)
          .json({ message: "Expert verification already exists" });
      }

      const verification = await storage.createExpertVerification({
        userId,
        ...expertData,
        profileImageUrl: expertData.profileImageUrl || null,
        licenseFileUrl: expertData.licenseFileUrl || null,
        verificationStatus: "pending",
      });

      res.json(verification);
    } catch (error) {
      console.error("Error creating expert verification:", error);
      res.status(500).json({ message: "Failed to create expert verification" });
    }
  });

  // This endpoint is deprecated, use /api/admin/expert-applications/:id/review instead
  app.put(
    "/api/experts/:id/verify",
    isAuthenticated,
    isAdmin,
    async (req: any, res) => {
      try {
        const expertId = parseInt(req.params.id);
        const verification = await storage.updateExpertVerificationStatus(
          expertId,
          "verified",
          req.user.id,
        );
        res.json(verification);
      } catch (error) {
        console.error("Error verifying expert:", error);
        res.status(500).json({ message: "Failed to verify expert" });
      }
    },
  );

  // Enhanced posts with expert information
  app.get("/api/posts/with-experts", async (req, res) => {
    try {
      const { category, limit = 20, offset = 0, sortBy = "hot" } = req.query;
      const categoryId =
        category && !isNaN(parseInt(category as string))
          ? parseInt(category as string)
          : undefined;
      const limitNum = !isNaN(parseInt(limit as string))
        ? parseInt(limit as string)
        : 20;
      const offsetNum = !isNaN(parseInt(offset as string))
        ? parseInt(offset as string)
        : 0;
      const sortByParam = (sortBy as "hot" | "new" | "top") || "hot";

      const posts = await storage.getPostsWithExpertInfo(
        categoryId,
        limitNum,
        offsetNum,
        sortByParam,
      );

      res.json(posts);
    } catch (error) {
      console.error("Error fetching posts with expert info:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  // Posts by specific author
  app.get("/api/posts/by-author/:authorId", async (req, res) => {
    try {
      const { authorId } = req.params;
      const { limit = 20, offset = 0 } = req.query;
      const limitNum = !isNaN(parseInt(limit as string))
        ? parseInt(limit as string)
        : 20;
      const offsetNum = !isNaN(parseInt(offset as string))
        ? parseInt(offset as string)
        : 0;

      const posts = await storage.getPostsByAuthor(
        authorId,
        limitNum,
        offsetNum,
      );
      res.json(posts);
    } catch (error) {
      console.error("Error fetching posts by author:", error);
      res.status(500).json({ message: "Failed to fetch posts by author" });
    }
  });

  // Get current authenticated user
  app.get("/api/user", optionalAuth, async (req: Request, res: Response) => {
    try {
      // Force fresh data - user data can change
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      // If no user is authenticated, return 401
      if (!req.userId || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Check if user has expert verification
      let expertVerification = null;
      try {
        expertVerification = await storage.getExpertVerification(req.userId);
      } catch (error) {
        // Expert verification might not exist, that's ok
      }
      
      const userWithVerification = {
        ...req.user,
        expertVerification
      };
      
      res.json(userWithVerification);
    } catch (error) {
      console.error("Error getting current user:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });


  // Get user profile by ID
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get user dashboard statistics
  app.get(
    "/api/user/dashboard-stats",
    clerkAuthWithSync,
    async (req: any, res) => {
      try {
        if (!req.userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }
        const userId = req.userId;
        const stats = await storage.getUserDashboardStats(userId);
        res.json(stats);
      } catch (error) {
        console.error("Error fetching user dashboard stats:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch dashboard statistics" });
      }
    },
  );

  // Get posts by user ID (alias for posts/by-author for frontend convenience)
  app.get("/api/posts/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const { limit = 20, offset = 0 } = req.query;
      const limitNum = !isNaN(parseInt(limit as string))
        ? parseInt(limit as string)
        : 20;
      const offsetNum = !isNaN(parseInt(offset as string))
        ? parseInt(offset as string)
        : 0;

      const posts = await storage.getPostsByAuthor(userId, limitNum, offsetNum);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching user posts:", error);
      res.status(500).json({ message: "Failed to fetch user posts" });
    }
  });

  app.get("/api/posts/:id/with-expert", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getPostWithExpertInfo(postId);

      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      res.json(post);
    } catch (error) {
      console.error("Error fetching post with expert info:", error);
      res.status(500).json({ message: "Failed to fetch post" });
    }
  });

  // Post source management for expert content attribution
  app.post("/api/posts/:id/source", isAuthenticated, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const sourceData = req.body;

      const source = await storage.createPostSource({
        postId,
        ...sourceData,
      });

      res.json(source);
    } catch (error) {
      console.error("Error creating post source:", error);
      res.status(500).json({ message: "Failed to create post source" });
    }
  });

  app.get("/api/posts/:id/source", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const source = await storage.getPostSource(postId);

      if (!source) {
        return res.status(404).json({ message: "Post source not found" });
      }

      res.json(source);
    } catch (error) {
      console.error("Error fetching post source:", error);
      res.status(500).json({ message: "Failed to fetch post source" });
    }
  });

  // Development route to update existing expert with professional links
  app.post("/api/dev/update-expert", async (req, res) => {
    try {
      // Update existing expert verification with professional links
      const updatedExpert = await storage.updateExpertVerification(1, {
        website: "https://drchen-eldercare.com",
        linkedinUrl: "https://linkedin.com/in/drsarahchen",
        blogUrl: "https://drchen-eldercare.com/blog",
        booksUrl: "https://amazon.com/author/drsarahchen",
        articlesUrl: "https://drchen-eldercare.com/publications",
      });

      res.json({
        message: "Expert professional links updated successfully",
        expert: updatedExpert,
      });
    } catch (error) {
      console.error("Error updating expert:", error);
      res.status(500).json({ message: "Failed to update expert" });
    }
  });

  // Development route to create comprehensive expert data with posts
  app.post("/api/dev/seed-expert-complete", async (req, res) => {
    try {
      // Create a sample user first
      const sampleUser = await storage.upsertUser({
        id: "expert_001",
        email: "dr.chen@example.com",
        firstName: "Dr. Sarah",
        lastName: "Chen",
        profileImageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create expert verification with all professional links
      const expertVerification = await storage.createExpertVerification({
        userId: "expert_001",
        profession: "Geriatrician & Elder Care Specialist",
        expertiseArea:
          "dementia care, medication management, family support, aging in place",
        yearsExperience: 15,
        credentials:
          "MD - Internal Medicine, Harvard Medical School\nBoard Certified in Geriatric Medicine\nFellow, American Geriatrics Society\nCertified in Alzheimer's Disease and Related Disorders",
        bio: "Dr. Sarah Chen is a board-certified geriatrician with over 15 years of experience helping families navigate the complexities of aging. She specializes in dementia care, medication management, and creating comprehensive care plans that honor both the patient's dignity and family's needs. Dr. Chen has published extensively on aging in place strategies and frequently speaks at caregiving conferences nationwide.",
        website: "https://drchen-eldercare.com",
        linkedinUrl: "https://linkedin.com/in/drsarahchen",
        blogUrl: "https://drchen-eldercare.com/blog",
        booksUrl: "https://amazon.com/author/drsarahchen",
        articlesUrl: "https://drchen-eldercare.com/publications",
        verificationStatus: "verified",
        verifiedAt: new Date(),
        verifiedBy: "admin",
        featuredExpert: true,
      });

      // Create multiple sample posts with different source attributions
      const healthcareCategory = await storage.getCategoryBySlug("healthcare");
      const posts = [];

      if (healthcareCategory) {
        // Post 1: Blog-sourced content
        const post1 = await storage.createPost({
          title: "5 Warning Signs Your Loved One May Need More Support",
          content:
            "As our loved ones age, it's crucial to recognize early warning signs that they may need additional support. Here are five key indicators that shouldn't be ignored: 1) Difficulty managing medications, 2) Unexplained weight loss or changes in appetite, 3) Increased confusion or memory lapses, 4) Poor personal hygiene or neglected household tasks, 5) Social withdrawal or mood changes. Early intervention can make a significant difference in maintaining quality of life and safety.",
          categoryId: healthcareCategory.id,
          authorId: "expert_001",
          isResolved: false,
          helpfulVotes: 24,
          commentCount: 8,
        });

        await storage.createPostSource({
          postId: post1.id,
          sourceType: "blog",
          sourceTitle: "Early Intervention Strategies for Aging Adults",
          sourceUrl: "https://drchen-eldercare.com/blog/warning-signs-support",
          publisher: "Elder Care Insights",
        });

        // Post 2: LinkedIn-sourced content
        const post2 = await storage.createPost({
          title: "Managing Medication Complexity in Elderly Patients",
          content:
            "Medication management becomes increasingly complex as we age, with many seniors taking multiple prescriptions. Here's how families can help: Create a comprehensive medication list, use pill organizers, establish routine timing, communicate with all healthcare providers, and never stop medications abruptly. Regular medication reviews with your geriatrician can prevent dangerous interactions and optimize treatment effectiveness.",
          categoryId: healthcareCategory.id,
          authorId: "expert_001",
          isResolved: false,
          helpfulVotes: 18,
          commentCount: 5,
        });

        await storage.createPostSource({
          postId: post2.id,
          sourceType: "linkedin",
          sourceTitle: "Medication Safety for Seniors",
          sourceUrl:
            "https://linkedin.com/in/drsarahchen/posts/medication-safety",
          publisher: "LinkedIn Professional Post",
        });

        // Post 3: Book excerpt
        const post3 = await storage.createPost({
          title: "Creating a Dementia-Friendly Home Environment",
          content:
            "Environmental modifications can significantly improve quality of life for individuals with dementia. Key strategies include: reducing clutter and distractions, improving lighting throughout the home, using contrasting colors for important items, securing potentially dangerous areas, creating clear pathways, and maintaining familiar routines. These changes help reduce confusion and anxiety while promoting independence and safety.",
          categoryId: healthcareCategory.id,
          authorId: "expert_001",
          isResolved: false,
          helpfulVotes: 32,
          commentCount: 12,
        });

        await storage.createPostSource({
          postId: post3.id,
          sourceType: "book",
          sourceTitle: "Caring for Family: A Comprehensive Guide to Elder Care",
          sourceUrl: "https://amazon.com/author/drsarahchen",
          publisher: "Eldercare Publishing",
          isbn: "978-0-123-45678-9",
        });

        posts.push(post1, post2, post3);
      }

      res.json({
        message: "Complete expert data with posts created successfully",
        expert: expertVerification,
        user: sampleUser,
        posts: posts,
      });
    } catch (error) {
      console.error("Error creating complete expert data:", error);
      res
        .status(500)
        .json({ message: "Failed to create complete expert data" });
    }
  });

  // Consultation booking routes
  app.post(
    "/api/consultations/create-payment",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { expertId, duration, totalAmount } = req.body;

        console.log("Creating consultation payment intent:", {
          expertId,
          duration,
          totalAmount,
          userId: req.user?.id,
        });

        const result = await stripeService.createConsultationPaymentIntent({
          expertId,
          totalAmount,
          duration,
          clientId: req.user.id,
        });

        console.log(
          "Consultation payment intent created:",
          result.paymentIntentId,
        );

        res.json({
          clientSecret: result.clientSecret,
          applicationFeeAmount: result.applicationFeeAmount,
        });
      } catch (error: any) {
        console.error("Consultation payment intent creation error:", error);
        res
          .status(500)
          .json({ message: "Error creating payment intent: " + error.message });
      }
    },
  );

  app.post(
    "/api/consultations/finalize",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { expertId, scheduledAt, duration, notes } = req.body;
        const clientId = req.user.id;

        // For now, use a fixed rate of $100/hour
        const rate = 10000; // $100/hour in cents
        const totalAmount = Math.round((rate * duration) / 60);

        // Verify expert exists
        const expertUser = await storage.getUser(expertId);
        if (!expertUser) {
          return res.status(400).json({ message: "Expert not found" });
        }

        const consultation = await storage.createConsultation({
          expertId,
          clientId,
          scheduledAt: new Date(scheduledAt),
          duration,
          rate,
          totalAmount,
          paymentStatus: "paid",
          bookingStatus: "scheduled",
          notes: notes || null,
        });

        res.json(consultation);
      } catch (error) {
        console.error("Error finalizing consultation booking:", error);
        res.status(500).json({ message: "Failed to finalize booking" });
      }
    },
  );

  app.get(
    "/api/consultations/my-bookings",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const consultations = await storage.getUserConsultations(userId);
        res.json(consultations);
      } catch (error) {
        console.error("Error fetching user consultations:", error);
        res.status(500).json({ message: "Failed to fetch consultations" });
      }
    },
  );

  // Search phrases API routes
  app.get("/api/search-phrases", async (req, res) => {
    try {
      // Cache search phrases aggressively since they change rarely
      res.set({
        'Cache-Control': 'public, max-age=1800', // 30 minutes cache
        'ETag': '"search-phrases-v1"'
      });
      
      const phrases = await storage.getSearchPhrases();
      res.json(phrases);
    } catch (error) {
      console.error("Error fetching search phrases:", error);
      res.status(500).json({ message: "Failed to fetch search phrases" });
    }
  });

  app.post("/api/search-phrases", isAuthenticated, async (req: any, res) => {
    try {
      const { phrase, orderIndex } = req.body;

      if (!phrase) {
        return res.status(400).json({ message: "Phrase is required" });
      }

      const newPhrase = await storage.createSearchPhrase({
        phrase,
        orderIndex: orderIndex || 0,
        isActive: true,
      });

      res.json(newPhrase);
    } catch (error) {
      console.error("Error creating search phrase:", error);
      res.status(500).json({ message: "Failed to create search phrase" });
    }
  });

  app.put("/api/search-phrases/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;

      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid phrase ID" });
      }

      const updatedPhrase = await storage.updateSearchPhrase(id, updates);
      res.json(updatedPhrase);
    } catch (error) {
      console.error("Error updating search phrase:", error);
      res.status(500).json({ message: "Failed to update search phrase" });
    }
  });

  app.delete(
    "/api/search-phrases/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
          return res.status(400).json({ message: "Invalid phrase ID" });
        }

        await storage.deleteSearchPhrase(id);
        res.json({ message: "Search phrase deleted successfully" });
      } catch (error) {
        console.error("Error deleting search phrase:", error);
        res.status(500).json({ message: "Failed to delete search phrase" });
      }
    },
  );

  // Password reset endpoint
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json({
          message:
            "If an account with that email exists, you will receive reset instructions.",
        });
      }

      const resetToken = randomBytes(32).toString("hex");
      console.log(
        `Password reset requested for ${email}. Reset token: ${resetToken}`,
      );

      res.json({
        message:
          "If an account with that email exists, you will receive reset instructions.",
      });
    } catch (error) {
      console.error("Password reset error:", error);
      res
        .status(500)
        .json({ message: "Failed to process password reset request" });
    }
  });

  // Expert detail endpoint for booking
  app.get("/api/experts/:expertId", async (req, res) => {
    try {
      // Force fresh data - no caching for approval-sensitive data
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const { expertId } = req.params;

      // Get expert verification with user details
      const expert = await storage.getExpertVerification(expertId);
      if (!expert) {
        return res.status(404).json({ message: "Expert not found" });
      }

      const user = await storage.getUser(expertId);
      if (!user) {
        return res.status(404).json({ message: "Expert user not found" });
      }

      // Return properly structured expert data for booking page
      const expertData = {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl || expert.profileImageUrl,
        bio:
          expert.bio ||
          "Experienced healthcare professional specializing in elder care and family support.",
        expertise: expert.expertiseArea
          ? [expert.expertiseArea]
          : ["Elder Care", "Family Support"],
        hourlyRate: (expert.hourlyRate || 10000) / 100, // Convert cents to dollars
        stripeConnectAccountId: expert.stripeConnectAccountId,
        consultationEnabled: Boolean(expert.consultationEnabled),
        // Include verification and approval status for badge logic
        role: user.role,
        approved: user.approved,
        verificationStatus: expert.verificationStatus,
        profession: expert.profession,
        company: expert.company,
        expertiseArea: expert.expertiseArea,
        credentials: expert.credentials,
        linkedinUrl: expert.linkedinUrl,
        verifiedAt: expert.verifiedAt,
        // Appointment booking fields
        allowBooking: expert.allowBooking || false,
        calendlyLink: expert.calendlyLink,
      };

      res.json(expertData);
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Error fetching expert details: " + error.message });
    }
  });

  // Expert availability management routes
  app.get(
    "/api/experts/my-availability",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const expertId = req.user.id;
        const availability = await storage.getExpertAvailability(expertId);
        res.json(availability);
      } catch (error: any) {
        res
          .status(500)
          .json({ message: "Error fetching availability: " + error.message });
      }
    },
  );

  app.post(
    "/api/experts/availability",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const expertId = req.user.id;
        const { dayOfWeek, startTime, endTime, timezone } = req.body;

        // Validate expert
        const expert = await storage.getExpertVerification(expertId);
        if (!expert || expert.verificationStatus !== "verified") {
          return res
            .status(403)
            .json({ message: "Only verified experts can set availability" });
        }

        // Create availability
        const availability = await storage.createExpertAvailability({
          expertId,
          dayOfWeek,
          startTime,
          endTime,
          timezone: timezone || "UTC",
          isRecurring: true,
        });

        res.json(availability);
      } catch (error: any) {
        res
          .status(500)
          .json({ message: "Error creating availability: " + error.message });
      }
    },
  );

  app.delete(
    "/api/experts/availability/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const expertId = req.user.id;
        const availabilityId = parseInt(req.params.id);

        // Verify ownership
        const availability = await storage.getExpertAvailability(expertId);
        const slot = availability.find((a: any) => a.id === availabilityId);

        if (!slot) {
          return res
            .status(404)
            .json({ message: "Availability slot not found" });
        }

        await storage.deleteExpertAvailability(availabilityId);
        res.json({ message: "Availability deleted successfully" });
      } catch (error: any) {
        res
          .status(500)
          .json({ message: "Error deleting availability: " + error.message });
      }
    },
  );

  // Appointment booking routes with Stripe Connect
  app.get("/api/experts/:expertId/availability", async (req, res) => {
    try {
      const { expertId } = req.params;
      const availability = await storage.getExpertAvailability(expertId);
      res.json(availability);
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Error fetching availability: " + error.message });
    }
  });

  app.get("/api/experts/:expertId/available-slots/:date", async (req, res) => {
    try {
      const { expertId, date } = req.params;
      const clientTimezone = (req.query.timezone as string) || "UTC";

      // Use timezone-aware method if timezone is provided
      if (clientTimezone && clientTimezone !== "UTC") {
        const slots = await storage.getAvailableTimeSlotsWithTimezone(
          expertId,
          date,
          clientTimezone,
        );
        res.json({ slots, timezone: clientTimezone });
      } else {
        // Fallback to original method
        const slots = await storage.getAvailableTimeSlots(expertId, date);
        res.json({ slots });
      }
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Error fetching available slots: " + error.message });
    }
  });

  // Get available timezones
  app.get("/api/timezones", (req, res) => {
    try {
      const timezones = TimezoneService.getCommonTimezones();
      res.json({ timezones });
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Error fetching timezones: " + error.message });
    }
  });

  // Google Calendar Integration for Experts
  app.get(
    "/api/experts/calendar/connect",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const expertId = req.user.id;

        // Check if user is a verified expert
        const expert = await storage.getExpertVerification(expertId);
        if (!expert || expert.verificationStatus !== "verified") {
          return res
            .status(403)
            .json({ message: "Only verified experts can connect calendar" });
        }

        const authUrl = googleCalendarService.getAuthUrl(expertId);
        res.json({ authUrl });
      } catch (error: any) {
        console.error("Error generating calendar auth URL:", error);
        res
          .status(500)
          .json({ message: "Error connecting calendar: " + error.message });
      }
    },
  );

  // Google Calendar callback
  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      const { code, state: expertId } = req.query;

      if (!code || !expertId) {
        return res.redirect("/expert-dashboard?error=missing-params");
      }

      // Exchange code for tokens
      const tokens = await googleCalendarService.getTokens(code as string);

      // Store tokens securely (you might want to encrypt these)
      await storage.updateExpertCalendarTokens(expertId as string, tokens);

      res.redirect("/expert-dashboard?calendar=connected");
    } catch (error: any) {
      console.error("Error in Google callback:", error);
      res.redirect("/expert-dashboard?error=calendar-connection-failed");
    }
  });

  // Get expert's calendar availability
  app.get("/api/experts/:expertId/calendar-availability", async (req, res) => {
    try {
      const { expertId } = req.params;
      const { date } = req.query;

      if (!date) {
        return res.status(400).json({ message: "Date parameter required" });
      }

      // Get expert's calendar tokens
      const expert = await storage.getExpertWithCalendarTokens(expertId);

      if (!expert || !expert.googleCalendarTokens) {
        // Return default availability if calendar not connected
        const slots = await storage.getAvailableTimeSlots(
          expertId,
          date as string,
        );
        return res.json({ slots, source: "manual" });
      }

      // Get busy times from Google Calendar
      const startDate = new Date(date as string);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);

      const busyTimes = await googleCalendarService.getBusyTimes(
        expert.googleCalendarTokens,
        startDate,
        endDate,
      );

      // Generate available slots excluding busy times
      const availableSlots = generateAvailableSlotsExcludingBusy(
        busyTimes,
        startDate,
      );

      res.json({ slots: availableSlots, source: "google-calendar" });
    } catch (error: any) {
      console.error("Error fetching calendar availability:", error);
      res
        .status(500)
        .json({ message: "Error fetching availability: " + error.message });
    }
  });

  // Create Stripe Connect Express Account for expert
  app.post(
    "/api/experts/create-connect-account",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const expertId = req.user.id;
        const { refreshUrl, returnUrl } = req.body;

        const result = await stripeService.createConnectAccount(
          expertId,
          req.user.email,
          refreshUrl,
          returnUrl,
        );

        res.json(result);
      } catch (error: any) {
        console.error("Error creating Connect account:", error);
        res
          .status(500)
          .json({
            message: "Error creating Connect account: " + error.message,
          });
      }
    },
  );

  // Get Stripe Connect account status
  app.get(
    "/api/experts/connect-status",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const expertId = req.user.id;
        const expert = await storage.getExpertVerification(expertId);

        if (!expert || !expert.stripeConnectAccountId) {
          return res.json({
            connected: false,
            accountId: null,
            requiresAction: true,
          });
        }

        const status = await stripeService.getConnectAccountStatus(
          expert.stripeConnectAccountId,
        );

        res.json({
          connected: status.chargesEnabled && status.payoutsEnabled,
          accountId: expert.stripeConnectAccountId,
          requiresAction:
            !status.detailsSubmitted || status.requirements.length > 0,
          ...status,
        });
      } catch (error: any) {
        console.error("Error getting Connect status:", error);
        res
          .status(500)
          .json({ message: "Error getting Connect status: " + error.message });
      }
    },
  );

  // Get expert earnings and payout info
  app.get("/api/experts/earnings", isAuthenticated, async (req: any, res) => {
    try {
      const expertId = req.user.id;
      const payoutInfo = await stripeService.getExpertPayoutInfo(expertId);
      res.json(payoutInfo);
    } catch (error: any) {
      console.error("Error getting expert earnings:", error);
      res
        .status(500)
        .json({ message: "Error getting earnings: " + error.message });
    }
  });

  // Create instant payout
  app.post("/api/experts/payout", isAuthenticated, async (req: any, res) => {
    try {
      const expertId = req.user.id;
      const { amount } = req.body; // amount in cents

      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Valid amount is required" });
      }

      const payout = await stripeService.createInstantPayout(expertId, amount);
      res.json({
        success: true,
        payoutId: payout.id,
        amount: payout.amount,
        arrivalDate: new Date(payout.arrival_date * 1000),
      });
    } catch (error: any) {
      console.error("Error creating payout:", error);
      res
        .status(500)
        .json({ message: "Error creating payout: " + error.message });
    }
  });

  // Get Stripe Connect dashboard link
  app.get(
    "/api/experts/dashboard-link",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const expertId = req.user.id;
        const dashboardUrl =
          await stripeService.getConnectDashboardLink(expertId);
        res.json({ url: dashboardUrl });
      } catch (error: any) {
        console.error("Error creating dashboard link:", error);
        res
          .status(500)
          .json({ message: "Error creating dashboard link: " + error.message });
      }
    },
  );

  // Create appointment booking with Stripe Connect payment
  app.post("/api/appointments/book", async (req, res) => {
    try {
      const {
        expertId,
        clientName,
        clientEmail,
        scheduledAt,
        scheduledAtTimezone,
        duration,
        notes,
        totalAmount,
      } = req.body;

      // Validate required fields
      if (
        !expertId ||
        !clientName ||
        !clientEmail ||
        !scheduledAt ||
        !duration ||
        !totalAmount
      ) {
        return res
          .status(400)
          .json({ message: "Missing required booking information" });
      }

      // Check expert availability
      const expert = await storage.getExpertVerification(expertId);
      if (!expert || expert.verificationStatus !== "verified") {
        return res
          .status(400)
          .json({ message: "Expert not found or not verified" });
      }

      if (!expert.stripeConnectAccountId) {
        return res.status(400).json({
          message: "Expert must set up payment processing first",
        });
      }

      // Create appointment record first
      const platformFee = Math.round(totalAmount * 0.1);
      const expertEarnings = totalAmount - platformFee;

      // Use timezone-aware creation if timezone is provided
      const appointment = scheduledAtTimezone
        ? await storage.createAppointmentWithTimezone({
            expertId,
            clientId: req.user?.id || null,
            clientName,
            clientEmail,
            scheduledAtUtc: scheduledAt,
            scheduledAtTimezone,
            duration,
            notes: notes || null,
            status: "pending",
            totalAmount,
            platformFee,
            expertEarnings,
            stripePaymentIntentId: null,
            stripeConnectAccountId: expert.stripeConnectAccountId,
          })
        : await storage.createAppointment({
            expertId,
            clientId: req.user?.id || null,
            clientName,
            clientEmail,
            scheduledAt: new Date(scheduledAt),
            duration,
            notes: notes || null,
            status: "pending",
            totalAmount,
            platformFee,
            expertEarnings,
            stripePaymentIntentId: null,
            stripeConnectAccountId: expert.stripeConnectAccountId,
          });

      // Create payment intent using the service
      const paymentResult = await stripeService.createAppointmentPaymentIntent({
        expertId,
        totalAmount,
        duration,
        clientEmail,
        appointmentId: appointment.id,
      });

      // Update appointment with payment intent ID
      await storage.updateAppointment(appointment.id, {
        stripePaymentIntentId: paymentResult.paymentIntentId,
      });

      res.json({
        clientSecret: paymentResult.clientSecret,
        appointmentId: appointment.id,
        platformFee: paymentResult.applicationFeeAmount,
      });
    } catch (error: any) {
      console.error("Error creating appointment:", error);
      res
        .status(500)
        .json({ message: "Error creating appointment: " + error.message });
    }
  });

  // Update appointment status after payment
  app.post("/api/appointments/:id/confirm", async (req, res) => {
    try {
      const { id } = req.params;
      const appointmentId = parseInt(id);

      // Get the appointment details
      const appointment = await storage.getAppointmentById(appointmentId);

      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      // Update appointment status
      const confirmedAppointment = await storage.updateAppointmentStatus(
        appointmentId,
        "confirmed",
      );

      let meetingLink = `https://meet.google.com/new`;
      let calendarEventId = null;

      // Try to create calendar event if expert has Google Calendar connected
      try {
        const calendarResult = await calendarService.createAppointmentEvent(
          appointment.expertId,
          {
            id: appointment.id,
            clientName: appointment.clientName,
            clientEmail: appointment.clientEmail,
            scheduledAt: appointment.scheduledAt,
            duration: appointment.duration,
            notes: appointment.notes || undefined,
          },
        );

        if (calendarResult.meetingLink) {
          meetingLink = calendarResult.meetingLink;
        }
        calendarEventId = calendarResult.eventId;
      } catch (calendarError) {
        console.warn("Failed to create calendar event:", calendarError);
        // Continue without calendar integration
      }

      res.json({
        appointment: confirmedAppointment,
        meetingLink,
        calendarEventId,
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Error confirming appointment: " + error.message });
    }
  });

  // Get expert's appointments
  app.get(
    "/api/experts/:expertId/appointments",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { expertId } = req.params;

        // Verify the requesting user is the expert
        if (req.user.id !== expertId) {
          return res.status(403).json({ message: "Access denied" });
        }

        const appointments = await storage.getExpertAppointments(expertId);
        res.json(appointments);
      } catch (error: any) {
        res
          .status(500)
          .json({ message: "Error fetching appointments: " + error.message });
      }
    },
  );

  // Get client's appointments
  app.get(
    "/api/clients/:clientId/appointments",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { clientId } = req.params;

        // Verify the requesting user is the client
        if (req.user.id !== clientId) {
          return res.status(403).json({ message: "Access denied" });
        }

        const appointments = await storage.getClientAppointments(clientId);
        res.json(appointments);
      } catch (error: any) {
        res
          .status(500)
          .json({ message: "Error fetching appointments: " + error.message });
      }
    },
  );

  // VOTING SYSTEM ROUTES

  // Vote on posts
  app.post("/api/posts/:id/vote", clerkAuthWithSync, async (req: any, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = req.userId;
      const postId = parseInt(req.params.id);
      const { voteType } = req.body; // 'up' or 'down'

      if (!["up", "down"].includes(voteType)) {
        return res.status(400).json({ message: "Invalid vote type" });
      }

      // Check if user already voted
      const existingVote = await storage.getUserVote(userId, postId, "post");

      if (existingVote) {
        if (existingVote.voteType === voteType) {
          // Remove vote if same type (toggle off)
          await storage.deleteVote(existingVote.id);
          await storage.updatePostVoteCount(postId, voteType === "up" ? -1 : 1);
        } else {
          // Change vote type
          await storage.updateVote(existingVote.id, voteType);
          await storage.updatePostVoteCount(postId, voteType === "up" ? 2 : -2);
        }
      } else {
        // Create new vote
        await storage.createVote({
          userId,
          postId,
          voteType,
        });
        await storage.updatePostVoteCount(postId, voteType === "up" ? 1 : -1);
      }

      // Check for achievements after voting
      const post = await storage.getPost(postId);
      if (post && voteType === "up") {
        await storage.checkAndAwardAchievements(post.author.id);
      }

      const updatedPost = await storage.getPost(postId);
      res.json(updatedPost);
    } catch (error) {
      console.error("Error voting on post:", error);
      res.status(500).json({ message: "Failed to vote" });
    }
  });

  // Vote on comments
  app.post("/api/comments/:id/vote", clerkAuthWithSync, async (req: any, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = req.userId;
      const commentId = parseInt(req.params.id);
      const { voteType } = req.body; // 'up' or 'down'

      if (!["up", "down"].includes(voteType)) {
        return res.status(400).json({ message: "Invalid vote type" });
      }

      // Check if user already voted
      const existingVote = await storage.getUserVote(
        userId,
        commentId,
        "comment",
      );

      if (existingVote) {
        if (existingVote.voteType === voteType) {
          // Remove vote if same type (toggle off)
          await storage.deleteVote(existingVote.id);
          await storage.updateCommentVoteCount(
            commentId,
            voteType === "up" ? -1 : 1,
          );
        } else {
          // Change vote type
          await storage.updateVote(existingVote.id, voteType);
          await storage.updateCommentVoteCount(
            commentId,
            voteType === "up" ? 2 : -2,
          );
        }
      } else {
        // Create new vote
        await storage.createVote({
          userId,
          commentId,
          voteType,
        });
        await storage.updateCommentVoteCount(
          commentId,
          voteType === "up" ? 1 : -1,
        );
      }

      // Check for achievements after voting
      const comment = await storage.getComment(commentId);
      if (comment && voteType === "up") {
        await storage.checkAndAwardAchievements(comment.author.id);
      }

      const updatedComment = await storage.getComment(commentId);
      res.json(updatedComment);
    } catch (error) {
      console.error("Error voting on comment:", error);
      res.status(500).json({ message: "Failed to vote" });
    }
  });

  // Get user's vote on content
  app.get("/api/posts/:id/vote", clerkAuthWithSync, async (req: any, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = req.userId;
      const postId = parseInt(req.params.id);

      const vote = await storage.getUserVote(userId, postId, "post");
      res.json({ voteType: vote?.voteType || null });
    } catch (error) {
      console.error("Error fetching user vote:", error);
      res.status(500).json({ message: "Failed to fetch vote" });
    }
  });

  // ACHIEVEMENT SYSTEM ROUTES

  // Check and award achievements for user
  app.post(
    "/api/users/:id/check-achievements",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.params.id;
        if (req.user.id !== userId && req.user.role !== "admin") {
          return res.status(403).json({ message: "Unauthorized" });
        }

        const newAchievements = await storage.checkAndAwardAchievements(userId);
        res.json({ newAchievements });
      } catch (error) {
        console.error("Error checking achievements:", error);
        res.status(500).json({ message: "Failed to check achievements" });
      }
    },
  );

  // Get all achievements
  app.get("/api/achievements", async (req, res) => {
    try {
      const achievements = await storage.getAchievements();
      res.json(achievements);
    } catch (error) {
      console.error("Error fetching achievements:", error);
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });

  // Get user achievements
  app.get("/api/users/:id/achievements", async (req, res) => {
    try {
      const achievements = await storage.getUserAchievements(req.params.id);
      res.json(achievements);
    } catch (error) {
      console.error("Error fetching user achievements:", error);
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });

  // USER PROFILE ROUTES

  // Get user profile with stats
  app.get("/api/users/:id/profile", async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const stats = await storage.getUserStats(userId);
      const achievements = await storage.getUserAchievements(userId);

      res.json({
        ...user,
        stats,
        achievements,
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // Update user profile
  app.put("/api/users/:id/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.params.id;
      if (req.user.id !== userId && req.user.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const allowedUpdates = [
        "firstName",
        "lastName",
        "communityName",
        "introduction",
        "city",
        "state",
        "profileImageUrl",
        "defaultProfileType",
      ];

      const updates = Object.keys(req.body)
        .filter((key) => allowedUpdates.includes(key))
        .reduce((obj, key) => {
          obj[key] = req.body[key];
          return obj;
        }, {});

      const updatedUser = await storage.updateUser(userId, updates);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Get user activity feed
  app.get("/api/users/:id/activity", async (req, res) => {
    try {
      const userId = req.params.id;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const activity = await storage.getUserActivity(userId, limit, offset);
      res.json(activity);
    } catch (error) {
      console.error("Error fetching user activity:", error);
      res.status(500).json({ message: "Failed to fetch user activity" });
    }
  });

  // SEARCH ROUTES

  // Enhanced forum search
  app.get("/api/forums/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length < 2) {
        return res
          .status(400)
          .json({ message: "Search query must be at least 2 characters" });
      }

      const results = await storage.searchForums(query.trim());
      res.json(results);
    } catch (error) {
      console.error("Error searching forums:", error);
      res.status(500).json({ message: "Failed to search forums" });
    }
  });

  // Search posts
  app.get("/api/posts/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!query || query.trim().length < 2) {
        return res
          .status(400)
          .json({ message: "Search query must be at least 2 characters" });
      }

      const results = await storage.searchPosts(query.trim(), limit, offset);
      res.json(results);
    } catch (error) {
      console.error("Error searching posts:", error);
      res.status(500).json({ message: "Failed to search posts" });
    }
  });

  // ENHANCED POST ROUTES

  // Get posts with enhanced data including vote info
  app.get("/api/posts/enhanced", isAuthenticated, async (req: any, res) => {
    try {
      const categoryId = req.query.categoryId
        ? parseInt(req.query.categoryId as string)
        : undefined;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const userId = req.user?.id;

      let posts = await storage.getPosts(categoryId, limit, offset);

      // Add user vote information if authenticated
      if (userId) {
        posts = await Promise.all(
          posts.map(async (post) => {
            const userVote = await storage.getUserVote(userId, post.id, "post");
            return {
              ...post,
              userVote: userVote?.voteType || null,
            };
          }),
        );
      }

      res.json(posts);
    } catch (error) {
      console.error("Error fetching enhanced posts:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  // ADMIN ROUTES (if user has admin role)

  // Get community stats
  app.get("/api/admin/stats", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const stats = await storage.getCommunityStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Get moderation queue
  app.get("/api/admin/moderation", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== "admin" && req.user.role !== "moderator") {
        return res.status(403).json({ message: "Moderator access required" });
      }

      const queue = await storage.getModerationQueue();
      res.json(queue);
    } catch (error) {
      console.error("Error fetching moderation queue:", error);
      res.status(500).json({ message: "Failed to fetch moderation queue" });
    }
  });

  // Update moderation status
  app.put(
    "/api/admin/moderation/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        if (req.user.role !== "admin" && req.user.role !== "moderator") {
          return res.status(403).json({ message: "Moderator access required" });
        }

        const { status, reason } = req.body;
        await storage.updateModerationStatus(
          parseInt(req.params.id),
          status,
          req.user.id,
        );

        res.json({ success: true });
      } catch (error) {
        console.error("Error updating moderation status:", error);
        res.status(500).json({ message: "Failed to update moderation status" });
      }
    },
  );

  // User approval endpoints for admins
  // Get unapproved experts
  app.get("/api/admin/unapproved-experts", isAdmin, async (req: Request, res: Response) => {
    try {
      const unapprovedExperts = await storage.getUnapprovedExperts();
      res.json(unapprovedExperts);
    } catch (error) {
      console.error("Error fetching unapproved experts:", error);
      res.status(500).json({ message: "Failed to fetch unapproved experts" });
    }
  });

  // Approve a user (expert)
  app.post("/api/admin/approve-user/:userId", isAdmin, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const approvedUser = await storage.approveUser(userId);
      
      // Invalidate caches to ensure real-time updates
      try {
        const { invalidateCache, InvalidationPatterns } = await import("./cache");
        await invalidateCache([
          InvalidationPatterns.experts,
          ...InvalidationPatterns.user(userId),
          'experts:*',
          'posts:*',  // Add posts cache invalidation for expert badges in posts
          'admin:*'
        ]);
      } catch (cacheError) {
        console.log("Cache invalidation failed (non-critical):", cacheError.message);
        // Continue even if cache fails - database will have fresh data
      }
      
      res.json({ 
        success: true, 
        message: "User approved successfully",
        user: approvedUser 
      });
    } catch (error) {
      console.error("Error approving user:", error);
      res.status(500).json({ message: "Failed to approve user" });
    }
  });


  // STRIPE WEBHOOK ENDPOINT
  app.post("/api/stripe/webhook", async (req, res) => {
    const signature = req.headers["stripe-signature"] as string;

    try {
      // Stripe webhooks need raw body, so we handle it specially
      const payload = req.body;
      const event = stripeService.verifyWebhookSignature(payload, signature);

      await stripeService.handleWebhookEvent(event);

      res.json({ received: true });
    } catch (error: any) {
      console.error("Webhook error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Appointment cancellation and refund
  app.post(
    "/api/appointments/:id/cancel",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const appointmentId = parseInt(req.params.id);
        const { reason } = req.body;

        const appointment = await storage.getAppointmentById(appointmentId);
        if (!appointment) {
          return res.status(404).json({ message: "Appointment not found" });
        }

        // Check if user can cancel (expert or client)
        const userId = req.user.id;
        if (
          appointment.expertId !== userId &&
          appointment.clientId !== userId
        ) {
          return res
            .status(403)
            .json({ message: "Not authorized to cancel this appointment" });
        }

        // Process refund if payment was made
        if (
          appointment.stripePaymentIntentId &&
          appointment.status === "confirmed"
        ) {
          try {
            await stripeService.refundAppointment(
              appointment.stripePaymentIntentId,
              undefined, // Full refund
              reason,
            );
          } catch (refundError) {
            console.error("Refund failed:", refundError);
            // Continue with cancellation even if refund fails
          }
        }

        // Cancel calendar event if exists
        if (appointment.expertId === userId) {
          try {
            // We'd need to store the calendar event ID to delete it
            // For now, just log that we should cancel the calendar event
            console.log(
              `Should cancel calendar event for appointment ${appointmentId}`,
            );
          } catch (calendarError) {
            console.warn("Failed to cancel calendar event:", calendarError);
          }
        }

        // Update appointment status
        const cancelledAppointment = await storage.updateAppointment(
          appointmentId,
          {
            status: "cancelled",
            cancelledAt: new Date(),
            cancelReason: reason || "No reason provided",
          },
        );

        res.json({
          success: true,
          appointment: cancelledAppointment,
        });
      } catch (error: any) {
        console.error("Error cancelling appointment:", error);
        res
          .status(500)
          .json({ message: "Error cancelling appointment: " + error.message });
      }
    },
  );

  // GOOGLE CALENDAR INTEGRATION ROUTES

  // Initiate Google Calendar OAuth
  app.get(
    "/api/calendar/oauth/init",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const expertId = req.user.id;

        // Check if user is an expert
        const expert = await storage.getExpertVerification(expertId);
        if (!expert || expert.verificationStatus !== "verified") {
          return res
            .status(403)
            .json({ message: "Only verified experts can connect calendars" });
        }

        const authUrl = calendarService.generateAuthUrl(expertId);
        res.json({ authUrl });
      } catch (error: any) {
        console.error("Error initiating calendar OAuth:", error);
        res
          .status(500)
          .json({ message: "Failed to initiate calendar connection" });
      }
    },
  );

  // Handle Google Calendar OAuth callback
  app.get("/api/calendar/oauth/callback", async (req, res) => {
    try {
      const { code, state } = req.query;

      if (!code || !state) {
        return res
          .status(400)
          .json({ message: "Missing authorization code or state" });
      }

      const expertId = state as string;
      const integration = await calendarService.exchangeCodeForTokens(
        code as string,
        expertId,
      );

      // Redirect to success page
      res.redirect(
        `${process.env.CLIENT_URL || "http://localhost:5173"}/expert/calendar/success`,
      );
    } catch (error: any) {
      console.error("Error handling calendar OAuth callback:", error);
      res.redirect(
        `${process.env.CLIENT_URL || "http://localhost:5173"}/expert/calendar/error`,
      );
    }
  });

  // Get calendar integration status
  app.get("/api/calendar/status", isAuthenticated, async (req: any, res) => {
    try {
      const expertId = req.user.id;
      const integration = await storage.getCalendarIntegration(expertId);

      res.json({
        connected: !!integration?.isActive,
        calendarName: integration?.calendarName,
        lastSync: integration?.lastSyncAt,
        errors: integration?.syncErrors,
      });
    } catch (error: any) {
      console.error("Error getting calendar status:", error);
      res.status(500).json({ message: "Failed to get calendar status" });
    }
  });

  // Disconnect calendar
  app.delete(
    "/api/calendar/disconnect",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const expertId = req.user.id;
        await calendarService.disconnectCalendar(expertId);
        res.json({ message: "Calendar disconnected successfully" });
      } catch (error: any) {
        console.error("Error disconnecting calendar:", error);
        res.status(500).json({ message: "Failed to disconnect calendar" });
      }
    },
  );

  // Sync calendar availability
  app.post("/api/calendar/sync", isAuthenticated, async (req: any, res) => {
    try {
      const expertId = req.user.id;
      await calendarService.syncAvailability(expertId);
      res.json({ message: "Calendar sync completed successfully" });
    } catch (error: any) {
      console.error("Error syncing calendar:", error);
      res.status(500).json({ message: "Failed to sync calendar" });
    }
  });

  // Create blocked time slot
  app.post(
    "/api/calendar/blocked-slots",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const expertId = req.user.id;
        const { startDateTime, endDateTime, reason, isAllDay } = req.body;

        if (!startDateTime || !endDateTime) {
          return res
            .status(400)
            .json({ message: "Start and end times are required" });
        }

        const blockedSlot = await storage.createBlockedTimeSlot({
          expertId,
          startDateTime: new Date(startDateTime),
          endDateTime: new Date(endDateTime),
          reason: reason || "Blocked time",
          isAllDay: isAllDay || false,
          isRecurring: false,
        });

        res.json(blockedSlot);
      } catch (error: any) {
        console.error("Error creating blocked time slot:", error);
        res.status(500).json({ message: "Failed to create blocked time slot" });
      }
    },
  );

  // Get blocked time slots
  app.get(
    "/api/calendar/blocked-slots",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const expertId = req.user.id;
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
          return res
            .status(400)
            .json({ message: "Start and end dates are required" });
        }

        const blockedSlots = await storage.getBlockedTimeSlots(
          expertId,
          new Date(startDate as string),
          new Date(endDate as string),
        );

        res.json(blockedSlots);
      } catch (error: any) {
        console.error("Error getting blocked time slots:", error);
        res.status(500).json({ message: "Failed to get blocked time slots" });
      }
    },
  );

  // Delete blocked time slot
  app.delete(
    "/api/calendar/blocked-slots/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const slotId = parseInt(req.params.id);
        await storage.deleteBlockedTimeSlot(slotId);
        res.json({ message: "Blocked time slot deleted successfully" });
      } catch (error: any) {
        console.error("Error deleting blocked time slot:", error);
        res.status(500).json({ message: "Failed to delete blocked time slot" });
      }
    },
  );

  // EXPERT AVAILABILITY MANAGEMENT ROUTES

  // Set expert availability
  app.post(
    "/api/experts/availability",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const expertId = req.user.id;
        const { dayOfWeek, startTime, endTime, timezone } = req.body;

        // Validate expert status
        const expert = await storage.getExpertVerification(expertId);
        if (!expert || expert.verificationStatus !== "verified") {
          return res
            .status(403)
            .json({ message: "Only verified experts can set availability" });
        }

        // Validate required fields
        if (dayOfWeek === undefined || !startTime || !endTime) {
          return res
            .status(400)
            .json({
              message: "Day of week, start time, and end time are required",
            });
        }

        // Create availability slot
        const availability = await storage.createExpertAvailability({
          expertId,
          dayOfWeek,
          startTime,
          endTime,
          timezone: timezone || "America/New_York",
          isActive: true,
        });

        res.json(availability);
      } catch (error: any) {
        console.error("Error setting expert availability:", error);
        res.status(500).json({ message: "Failed to set availability" });
      }
    },
  );

  // Get expert availability
  app.get(
    "/api/experts/availability",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const expertId = req.user.id;
        const availability = await storage.getExpertAvailability(expertId);
        res.json(availability);
      } catch (error: any) {
        console.error("Error getting expert availability:", error);
        res.status(500).json({ message: "Failed to get availability" });
      }
    },
  );

  // Update expert availability
  app.put(
    "/api/experts/availability/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const expertId = req.user.id;
        const availabilityId = parseInt(req.params.id);
        const { dayOfWeek, startTime, endTime, timezone, isActive } = req.body;

        // Verify the availability belongs to the expert
        const existing = await storage.getExpertAvailability(expertId);
        const targetAvailability = existing.find(
          (a) => a.id === availabilityId,
        );

        if (!targetAvailability) {
          return res
            .status(404)
            .json({ message: "Availability slot not found" });
        }

        const updated = await storage.updateExpertAvailability(availabilityId, {
          dayOfWeek,
          startTime,
          endTime,
          timezone,
          isActive,
        });

        res.json(updated);
      } catch (error: any) {
        console.error("Error updating expert availability:", error);
        res.status(500).json({ message: "Failed to update availability" });
      }
    },
  );

  // Delete expert availability
  app.delete(
    "/api/experts/availability/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const expertId = req.user.id;
        const availabilityId = parseInt(req.params.id);

        // Verify the availability belongs to the expert
        const existing = await storage.getExpertAvailability(expertId);
        const targetAvailability = existing.find(
          (a) => a.id === availabilityId,
        );

        if (!targetAvailability) {
          return res
            .status(404)
            .json({ message: "Availability slot not found" });
        }

        await storage.deleteExpertAvailability(availabilityId);
        res.json({ message: "Availability slot deleted successfully" });
      } catch (error: any) {
        console.error("Error deleting expert availability:", error);
        res.status(500).json({ message: "Failed to delete availability" });
      }
    },
  );

  // Get available time slots for booking (public endpoint)
  app.get("/api/experts/:expertId/available-slots/:date", async (req, res) => {
    try {
      const { expertId, date } = req.params;

      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return res
          .status(400)
          .json({ message: "Invalid date format. Use YYYY-MM-DD" });
      }

      // Check if expert exists and is verified
      const expert = await storage.getExpertVerification(expertId);
      if (!expert || expert.verificationStatus !== "verified") {
        return res
          .status(404)
          .json({ message: "Expert not found or not verified" });
      }

      const slots = await storage.getAvailableTimeSlots(expertId, date);
      res.json({ slots });
    } catch (error: any) {
      console.error("Error getting available slots:", error);
      res.status(500).json({ message: "Failed to get available slots" });
    }
  });

  // Bulk update expert availability (set weekly schedule)
  app.put(
    "/api/experts/availability/bulk",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const expertId = req.user.id;
        const { schedule } = req.body; // Array of availability objects

        // Validate expert status
        const expert = await storage.getExpertVerification(expertId);
        if (!expert || expert.verificationStatus !== "verified") {
          return res
            .status(403)
            .json({ message: "Only verified experts can set availability" });
        }

        if (!Array.isArray(schedule)) {
          return res.status(400).json({ message: "Schedule must be an array" });
        }

        // Clear existing availability
        const existing = await storage.getExpertAvailability(expertId);
        for (const avail of existing) {
          await storage.deleteExpertAvailability(avail.id);
        }

        // Create new availability slots
        const newAvailability = [];
        for (const slot of schedule) {
          if (slot.startTime && slot.endTime && slot.dayOfWeek !== undefined) {
            const availability = await storage.createExpertAvailability({
              expertId,
              dayOfWeek: slot.dayOfWeek,
              startTime: slot.startTime,
              endTime: slot.endTime,
              timezone: slot.timezone || "America/New_York",
              isActive: true,
            });
            newAvailability.push(availability);
          }
        }

        res.json(newAvailability);
      } catch (error: any) {
        console.error("Error updating bulk availability:", error);
        res.status(500).json({ message: "Failed to update availability" });
      }
    },
  );

  // EXPERT PROFILE ENHANCEMENT ROUTES

  // Update expert consultation settings
  app.put("/api/experts/settings", isAuthenticated, async (req: any, res) => {
    try {
      const expertId = req.user.id;
      const {
        hourlyRate,
        consultationEnabled,
        bio,
        specializations,
        minSessionDuration,
        maxSessionDuration,
        bufferTime,
        advanceBookingDays,
        cancellationPolicy,
      } = req.body;

      // Validate expert status
      const expert = await storage.getExpertVerification(expertId);
      if (!expert || expert.verificationStatus !== "verified") {
        return res
          .status(403)
          .json({ message: "Only verified experts can update settings" });
      }

      // Validate hourly rate
      if (hourlyRate && (hourlyRate < 1000 || hourlyRate > 100000)) {
        // $10 - $1000 per hour
        return res
          .status(400)
          .json({ message: "Hourly rate must be between $10 and $1000" });
      }

      // Update expert verification with new settings
      const updatedExpert = await storage.updateExpertVerification(expert.id, {
        hourlyRate: hourlyRate
          ? Math.round(hourlyRate * 100)
          : expert.hourlyRate, // Convert to cents
        consultationEnabled:
          consultationEnabled !== undefined
            ? consultationEnabled
            : expert.consultationEnabled,
        bio: bio !== undefined ? bio : expert.bio,
        expertiseArea:
          specializations !== undefined
            ? specializations.join(", ")
            : expert.expertiseArea,
      });

      // Create or update expert settings (we could create a separate settings table if needed)
      const settings = {
        expertId,
        hourlyRate: Math.round((hourlyRate || expert.hourlyRate / 100) * 100),
        consultationEnabled:
          consultationEnabled !== undefined
            ? consultationEnabled
            : expert.consultationEnabled,
        minSessionDuration: minSessionDuration || 30, // Default 30 minutes
        maxSessionDuration: maxSessionDuration || 120, // Default 2 hours
        bufferTime: bufferTime || 15, // Default 15 minutes between sessions
        advanceBookingDays: advanceBookingDays || 30, // Default 30 days advance booking
        cancellationPolicy:
          cancellationPolicy || "24 hours notice required for full refund",
      };

      res.json({
        success: true,
        expert: updatedExpert,
        settings,
      });
    } catch (error: any) {
      console.error("Error updating expert settings:", error);
      res.status(500).json({ message: "Failed to update expert settings" });
    }
  });

  // Get expert consultation settings
  app.get("/api/experts/settings", isAuthenticated, async (req: any, res) => {
    try {
      const expertId = req.user.id;

      const expert = await storage.getExpertVerification(expertId);
      if (!expert) {
        return res
          .status(404)
          .json({ message: "Expert verification not found" });
      }

      const availability = await storage.getExpertAvailability(expertId);

      // Get calendar integration status
      const calendarIntegration =
        await storage.getCalendarIntegration(expertId);

      // Get Stripe Connect status
      let stripeStatus = null;
      if (expert.stripeConnectAccountId) {
        try {
          stripeStatus = await stripeService.getConnectAccountStatus(
            expert.stripeConnectAccountId,
          );
        } catch (error) {
          console.warn("Failed to get Stripe status:", error);
        }
      }

      res.json({
        expert: {
          id: expert.id,
          userId: expert.userId,
          hourlyRate: expert.hourlyRate ? expert.hourlyRate / 100 : 100, // Convert cents to dollars
          consultationEnabled: expert.consultationEnabled,
          bio: expert.bio,
          specializations: expert.expertiseArea
            ? expert.expertiseArea.split(", ")
            : [],
          verificationStatus: expert.verificationStatus,
          featuredExpert: expert.featuredExpert,
        },
        availability,
        calendar: {
          connected: !!calendarIntegration?.isActive,
          provider: calendarIntegration?.provider,
          lastSync: calendarIntegration?.lastSyncAt,
        },
        stripe: {
          connected: !!expert.stripeConnectAccountId,
          accountId: expert.stripeConnectAccountId,
          status: stripeStatus,
        },
        settings: {
          minSessionDuration: 30,
          maxSessionDuration: 120,
          bufferTime: 15,
          advanceBookingDays: 30,
          cancellationPolicy: "24 hours notice required for full refund",
        },
      });
    } catch (error: any) {
      console.error("Error getting expert settings:", error);
      res.status(500).json({ message: "Failed to get expert settings" });
    }
  });

  // Get expert profile for public booking (no auth required)
  app.get("/api/experts/:expertId/profile", async (req, res) => {
    try {
      // Force fresh data - no caching for approval-sensitive data
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const { expertId } = req.params;

      const expert = await storage.getExpertVerification(expertId);
      const user = await storage.getUser(expertId);
      
      if (!expert || !user || user.role !== 'expert') {
        return res
          .status(404)
          .json({ message: "Expert not found" });
      }

      // Allow viewing profiles of all experts (regardless of approval status)
      // Booking buttons will be hidden on frontend for non-approved experts

      // Get expert's reviews
      const reviews = await storage.getExpertReviews(expertId, 5);

      // Calculate average rating
      const averageRating =
        reviews.length > 0
          ? reviews.reduce((sum, review) => sum + review.rating, 0) /
            reviews.length
          : 0;

      // Get availability for next 7 days
      const today = new Date();
      const availability = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split("T")[0];

        try {
          const slots = await storage.getAvailableTimeSlots(expertId, dateStr);
          if (slots.length > 0) {
            availability.push({
              date: dateStr,
              availableSlots: slots.length,
              nextAvailable: slots[0],
            });
          }
        } catch (error) {
          // Skip this date if there's an error
        }
      }

      res.json({
        id: expert.userId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        bio: expert.bio,
        profession: expert.profession,
        company: expert.company,
        expertiseArea: expert.expertiseArea,
        credentials: expert.credentials,
        linkedinUrl: expert.linkedinUrl,
        verifiedAt: expert.verifiedAt,
        specializations: expert.expertiseArea
          ? expert.expertiseArea.split(", ")
          : [],
        hourlyRate: expert.consultationRate ? expert.consultationRate / 100 : 100,
        consultationEnabled: Boolean(expert.allowBooking),
        profileImageUrl: user.profileImageUrl || expert.profileImageUrl,
        yearsExperience: expert.yearsExperience,
        featuredExpert: expert.featuredExpert,
        // Role and verification fields needed for button logic
        role: user.role,
        approved: user.approved,
        verificationStatus: expert.verificationStatus,
        // Appointment booking fields
        allowBooking: expert.allowBooking || false,
        calendlyLink: expert.calendlyLink,
        rating: {
          average: Math.round(averageRating * 10) / 10,
          count: reviews.length,
        },
        reviews: reviews.map((review) => ({
          id: review.id,
          rating: review.rating,
          reviewText: review.reviewText,
          createdAt: review.createdAt,
        })),
        availability,
        nextAvailable:
          availability.length > 0 ? availability[0].nextAvailable : null,
      });
    } catch (error: any) {
      console.error("Error getting expert profile:", error);
      res.status(500).json({ message: "Failed to get expert profile" });
    }
  });

  // APPOINTMENT MANAGEMENT DASHBOARD ROUTES

  // Get expert dashboard analytics
  app.get(
    "/api/experts/dashboard/analytics",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const expertId = req.user.id;
        const { period = "30" } = req.query; // days

        // Validate expert
        const expert = await storage.getExpertVerification(expertId);
        if (!expert || expert.verificationStatus !== "verified") {
          return res
            .status(403)
            .json({ message: "Only verified experts can access dashboard" });
        }

        const days = parseInt(period as string);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Get all appointments for the period
        const appointments = await storage.getExpertAppointments(expertId);
        const periodAppointments = appointments.filter(
          (apt) => new Date(apt.createdAt) >= startDate,
        );

        // Calculate analytics
        const totalAppointments = periodAppointments.length;
        const completedAppointments = periodAppointments.filter(
          (apt) => apt.status === "completed",
        ).length;
        const cancelledAppointments = periodAppointments.filter(
          (apt) => apt.status === "cancelled",
        ).length;
        const pendingAppointments = periodAppointments.filter(
          (apt) => apt.status === "pending",
        ).length;
        const confirmedAppointments = periodAppointments.filter(
          (apt) => apt.status === "confirmed",
        ).length;

        const totalRevenue = periodAppointments
          .filter((apt) => apt.status === "completed")
          .reduce((sum, apt) => sum + apt.expertEarnings, 0);

        const averageSessionDuration =
          periodAppointments.length > 0
            ? periodAppointments.reduce((sum, apt) => sum + apt.duration, 0) /
              periodAppointments.length
            : 0;

        // Get reviews for the period
        const allReviews = await storage.getExpertReviews(expertId, 100);
        const periodReviews = allReviews.filter(
          (review) => new Date(review.createdAt) >= startDate,
        );

        const averageRating =
          periodReviews.length > 0
            ? periodReviews.reduce((sum, review) => sum + review.rating, 0) /
              periodReviews.length
            : 0;

        // Upcoming appointments (next 7 days)
        const upcomingDate = new Date();
        upcomingDate.setDate(upcomingDate.getDate() + 7);
        const upcomingAppointments = appointments.filter(
          (apt) =>
            new Date(apt.scheduledAt) >= new Date() &&
            new Date(apt.scheduledAt) <= upcomingDate &&
            ["confirmed", "pending"].includes(apt.status),
        ).length;

        // Daily breakdown for charts
        const dailyStats = [];
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split("T")[0];

          const dayAppointments = periodAppointments.filter(
            (apt) =>
              new Date(apt.scheduledAt).toISOString().split("T")[0] === dateStr,
          );

          dailyStats.push({
            date: dateStr,
            appointments: dayAppointments.length,
            revenue:
              dayAppointments
                .filter((apt) => apt.status === "completed")
                .reduce((sum, apt) => sum + apt.expertEarnings, 0) / 100, // Convert to dollars
            cancellations: dayAppointments.filter(
              (apt) => apt.status === "cancelled",
            ).length,
          });
        }

        res.json({
          summary: {
            totalAppointments,
            completedAppointments,
            cancelledAppointments,
            pendingAppointments,
            confirmedAppointments,
            totalRevenue: totalRevenue / 100, // Convert to dollars
            averageSessionDuration: Math.round(averageSessionDuration),
            averageRating: Math.round(averageRating * 10) / 10,
            upcomingAppointments,
            completionRate:
              totalAppointments > 0
                ? (completedAppointments / totalAppointments) * 100
                : 0,
            cancellationRate:
              totalAppointments > 0
                ? (cancelledAppointments / totalAppointments) * 100
                : 0,
          },
          dailyStats,
          period: {
            days,
            startDate: startDate.toISOString(),
            endDate: new Date().toISOString(),
          },
        });
      } catch (error: any) {
        console.error("Error getting expert analytics:", error);
        res.status(500).json({ message: "Failed to get dashboard analytics" });
      }
    },
  );

  // Get expert appointments with filtering and pagination
  app.get(
    "/api/experts/dashboard/appointments",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const expertId = req.user.id;
        const {
          status,
          startDate,
          endDate,
          page = 1,
          limit = 20,
          sortBy = "scheduledAt",
          sortOrder = "desc",
        } = req.query;

        // Validate expert
        const expert = await storage.getExpertVerification(expertId);
        if (!expert || expert.verificationStatus !== "verified") {
          return res
            .status(403)
            .json({ message: "Only verified experts can access appointments" });
        }

        let appointments = await storage.getExpertAppointments(expertId);

        // Apply filters
        if (status && status !== "all") {
          appointments = appointments.filter((apt) => apt.status === status);
        }

        if (startDate) {
          appointments = appointments.filter(
            (apt) => new Date(apt.scheduledAt) >= new Date(startDate as string),
          );
        }

        if (endDate) {
          appointments = appointments.filter(
            (apt) => new Date(apt.scheduledAt) <= new Date(endDate as string),
          );
        }

        // Sort appointments
        appointments.sort((a, b) => {
          const aValue = a[sortBy as keyof typeof a];
          const bValue = b[sortBy as keyof typeof b];

          if (sortOrder === "desc") {
            return aValue > bValue ? -1 : 1;
          } else {
            return aValue < bValue ? -1 : 1;
          }
        });

        // Pagination
        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const offset = (pageNum - 1) * limitNum;
        const paginatedAppointments = appointments.slice(
          offset,
          offset + limitNum,
        );

        // Get client information for each appointment
        const enrichedAppointments = await Promise.all(
          paginatedAppointments.map(async (appointment) => {
            let clientInfo = null;
            if (appointment.clientId) {
              try {
                const client = await storage.getUser(appointment.clientId);
                if (client) {
                  clientInfo = {
                    id: client.id,
                    name:
                      `${client.firstName || ""} ${client.lastName || ""}`.trim() ||
                      client.username,
                    email: client.email,
                  };
                }
              } catch (error) {
                console.warn("Failed to get client info:", error);
              }
            }

            return {
              ...appointment,
              client: clientInfo || {
                name: appointment.clientName,
                email: appointment.clientEmail,
              },
              revenue: appointment.expertEarnings / 100, // Convert to dollars
            };
          }),
        );

        res.json({
          appointments: enrichedAppointments,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: appointments.length,
            pages: Math.ceil(appointments.length / limitNum),
          },
          filters: {
            status: status || "all",
            startDate,
            endDate,
            sortBy,
            sortOrder,
          },
        });
      } catch (error: any) {
        console.error("Error getting expert appointments:", error);
        res.status(500).json({ message: "Failed to get appointments" });
      }
    },
  );

  // Update appointment details (expert only)
  app.put(
    "/api/experts/dashboard/appointments/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const expertId = req.user.id;
        const appointmentId = parseInt(req.params.id);
        const { notes, meetingLink, status } = req.body;

        const appointment = await storage.getAppointmentById(appointmentId);
        if (!appointment) {
          return res.status(404).json({ message: "Appointment not found" });
        }

        // Verify expert owns this appointment
        if (appointment.expertId !== expertId) {
          return res
            .status(403)
            .json({ message: "Not authorized to modify this appointment" });
        }

        // Prepare updates
        const updates: any = {};
        if (notes !== undefined) updates.notes = notes;
        if (meetingLink !== undefined) updates.meetingLink = meetingLink;
        if (
          status !== undefined &&
          ["pending", "confirmed", "completed", "cancelled"].includes(status)
        ) {
          updates.status = status;
        }

        const updatedAppointment = await storage.updateAppointment(
          appointmentId,
          updates,
        );

        res.json({
          success: true,
          appointment: updatedAppointment,
        });
      } catch (error: any) {
        console.error("Error updating appointment:", error);
        res.status(500).json({ message: "Failed to update appointment" });
      }
    },
  );

  // Admin dashboard - all appointments overview
  app.get(
    "/api/admin/dashboard/appointments",
    isAuthenticated,
    async (req: any, res) => {
      try {
        // Check admin permission
        if (req.user.role !== "admin") {
          return res.status(403).json({ message: "Admin access required" });
        }

        const {
          status,
          expertId,
          startDate,
          endDate,
          page = 1,
          limit = 50,
        } = req.query;

        // Get all appointments with expert and client info
        const appointments = await storage.getAllAppointmentsWithDetails();

        // Apply filters
        let filteredAppointments = appointments;

        if (status && status !== "all") {
          filteredAppointments = filteredAppointments.filter(
            (apt) => apt.status === status,
          );
        }

        if (expertId) {
          filteredAppointments = filteredAppointments.filter(
            (apt) => apt.expertId === expertId,
          );
        }

        if (startDate) {
          filteredAppointments = filteredAppointments.filter(
            (apt) => new Date(apt.scheduledAt) >= new Date(startDate as string),
          );
        }

        if (endDate) {
          filteredAppointments = filteredAppointments.filter(
            (apt) => new Date(apt.scheduledAt) <= new Date(endDate as string),
          );
        }

        // Sort by most recent
        filteredAppointments.sort(
          (a, b) =>
            new Date(b.scheduledAt).getTime() -
            new Date(a.scheduledAt).getTime(),
        );

        // Pagination
        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const offset = (pageNum - 1) * limitNum;
        const paginatedAppointments = filteredAppointments.slice(
          offset,
          offset + limitNum,
        );

        res.json({
          appointments: paginatedAppointments,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: filteredAppointments.length,
            pages: Math.ceil(filteredAppointments.length / limitNum),
          },
        });
      } catch (error: any) {
        console.error("Error getting admin appointments:", error);
        res.status(500).json({ message: "Failed to get admin appointments" });
      }
    },
  );

  // Admin analytics - platform overview
  app.get(
    "/api/admin/dashboard/analytics",
    isAuthenticated,
    async (req: any, res) => {
      try {
        // Check admin permission
        if (req.user.role !== "admin") {
          return res.status(403).json({ message: "Admin access required" });
        }

        const { period = "30" } = req.query;
        const days = parseInt(period as string);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Get platform statistics
        const stats = await storage.getPlatformAnalytics(startDate);

        res.json(stats);
      } catch (error: any) {
        console.error("Error getting admin analytics:", error);
        res.status(500).json({ message: "Failed to get admin analytics" });
      }
    },
  );

  // Get appointment reviews and feedback
  app.get(
    "/api/appointments/:id/reviews",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const appointmentId = parseInt(req.params.id);
        const userId = req.user.id;

        const appointment = await storage.getAppointmentById(appointmentId);
        if (!appointment) {
          return res.status(404).json({ message: "Appointment not found" });
        }

        // Check if user is involved in this appointment
        if (
          appointment.expertId !== userId &&
          appointment.clientId !== userId
        ) {
          return res
            .status(403)
            .json({ message: "Not authorized to view reviews" });
        }

        const reviews = await storage.getAppointmentReviews(appointmentId);
        res.json(reviews);
      } catch (error: any) {
        console.error("Error getting appointment reviews:", error);
        res.status(500).json({ message: "Failed to get appointment reviews" });
      }
    },
  );

  // Create appointment review
  app.post(
    "/api/appointments/:id/reviews",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const appointmentId = parseInt(req.params.id);
        const userId = req.user.id;
        const { rating, reviewText, isPublic = true } = req.body;

        if (!rating || rating < 1 || rating > 5) {
          return res
            .status(400)
            .json({ message: "Rating must be between 1 and 5" });
        }

        const appointment = await storage.getAppointmentById(appointmentId);
        if (!appointment) {
          return res.status(404).json({ message: "Appointment not found" });
        }

        // Check if user is involved in this appointment
        if (
          appointment.expertId !== userId &&
          appointment.clientId !== userId
        ) {
          return res
            .status(403)
            .json({ message: "Not authorized to review this appointment" });
        }

        // Check if appointment is completed
        if (appointment.status !== "completed") {
          return res
            .status(400)
            .json({ message: "Can only review completed appointments" });
        }

        // Determine who is being reviewed
        const revieweeId =
          appointment.expertId === userId
            ? appointment.clientId
            : appointment.expertId;
        if (!revieweeId) {
          return res
            .status(400)
            .json({ message: "Cannot determine review target" });
        }

        const review = await storage.createAppointmentReview({
          appointmentId,
          reviewerId: userId,
          revieweeId,
          rating,
          reviewText: reviewText || null,
          isPublic,
        });

        res.json({
          success: true,
          review,
        });
      } catch (error: any) {
        console.error("Error creating appointment review:", error);
        res.status(500).json({ message: "Failed to create review" });
      }
    },
  );

  // Content Sources routes
  app.get("/api/content-sources", async (req, res) => {
    try {
      const sources = await storage.getContentSources();
      res.json(sources);
    } catch (error: any) {
      console.error("Error getting content sources:", error);
      res.status(500).json({ message: "Failed to get content sources" });
    }
  });

  // Admin endpoint to get ALL content sources (including inactive)
  app.get(
    "/api/content-sources/all",
    isAdmin,
    async (req: any, res) => {
      try {
        const sources = await storage.getAllContentSources();
        res.json(sources);
      } catch (error: any) {
        console.error("Error getting all content sources:", error);
        res.status(500).json({ message: "Failed to get content sources" });
      }
    },
  );

  app.get("/api/content-sources/category/:categoryId", async (req, res) => {
    try {
      const { categoryId } = req.params;
      const sources = await storage.getContentSourcesByCategory(categoryId);
      res.json(sources);
    } catch (error: any) {
      console.error("Error getting content sources by category:", error);
      res.status(500).json({ message: "Failed to get content sources" });
    }
  });

  app.post("/api/content-sources", isAdmin, async (req: any, res) => {
    try {
      const source = await storage.createContentSource(req.body);
      res.json(source);
    } catch (error: any) {
      console.error("Error creating content source:", error);
      res.status(500).json({ message: "Failed to create content source" });
    }
  });

  app.put(
    "/api/content-sources/reorder",
    isAdmin,
    async (req: any, res) => {
      try {
        const { categoryId, sourceIds } = req.body;

        if (!categoryId || !Array.isArray(sourceIds)) {
          return res.status(400).json({ message: "Invalid request data" });
        }

        await storage.reorderContentSources(categoryId, sourceIds);
        res.json({ success: true });
      } catch (error: any) {
        console.error("Error reordering content sources:", error);
        res.status(500).json({ message: "Failed to reorder content sources" });
      }
    },
  );

  app.put(
    "/api/content-sources/:id",
    isAdmin,
    async (req: any, res) => {
      try {
        const id = parseInt(req.params.id);
        const source = await storage.updateContentSource(id, req.body);

        if (!source) {
          return res.status(404).json({ message: "Content source not found" });
        }

        res.json(source);
      } catch (error: any) {
        console.error("Error updating content source:", error);
        res.status(500).json({ message: "Failed to update content source" });
      }
    },
  );

  app.delete(
    "/api/content-sources/:id",
    isAdmin,
    async (req: any, res) => {
      try {
        const id = parseInt(req.params.id);
        await storage.deleteContentSource(id);
        res.json({ success: true });
      } catch (error: any) {
        console.error("Error deleting content source:", error);
        res.status(500).json({ message: "Failed to delete content source" });
      }
    },
  );

  // User favorite content sources routes
  app.get(
    "/api/content-sources/favorites",
    clerkAuthWithSync,
    async (req: any, res) => {
      try {
        if (!req.userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }
        const userId = req.userId;
        const favorites = await storage.getUserFavoriteContentSources(userId);
        res.json(favorites);
      } catch (error: any) {
        console.error("Error fetching favorite content sources:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch favorite content sources" });
      }
    },
  );

  app.post(
    "/api/content-sources/:id/favorite",
    clerkAuthWithSync,
    async (req: any, res) => {
      try {
        if (!req.userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }
        const userId = req.userId;
        const contentSourceId = parseInt(req.params.id);

        if (isNaN(contentSourceId)) {
          return res.status(400).json({ message: "Invalid content source ID" });
        }

        const isFavorited = await storage.toggleUserFavoriteContentSource(
          userId,
          contentSourceId,
        );
        res.json({ isFavorited });
      } catch (error: any) {
        console.error("Error toggling favorite:", error);
        res.status(500).json({ message: "Failed to toggle favorite" });
      }
    },
  );

  app.get(
    "/api/content-sources/:id/is-favorited",
    optionalAuth,
    async (req: any, res) => {
      try {
        const userId = req.userId;
        const contentSourceId = parseInt(req.params.id);

        if (isNaN(contentSourceId)) {
          return res.status(400).json({ message: "Invalid content source ID" });
        }

        if (!userId) {
          return res.json({ isFavorited: false });
        }

        const isFavorited = await storage.isContentSourceFavoritedByUser(
          userId,
          contentSourceId,
        );
        res.json({ isFavorited });
      } catch (error: any) {
        console.error("Error checking favorite status:", error);
        res.status(500).json({ message: "Failed to check favorite status" });
      }
    },
  );

  // Post favorite endpoints
  app.get("/api/posts/favorites", clerkAuthWithSync, async (req: any, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = req.userId;
      const favorites = await storage.getUserFavoritePosts(userId);
      res.json(favorites);
    } catch (error: any) {
      console.error("Error fetching favorite posts:", error);
      res.status(500).json({ message: "Failed to fetch favorite posts" });
    }
  });

  app.post(
    "/api/posts/:id/favorite",
    clerkAuthWithSync,
    async (req: any, res) => {
      try {
        if (!req.userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }
        const userId = req.userId;
        const postId = parseInt(req.params.id);

        if (isNaN(postId)) {
          return res.status(400).json({ message: "Invalid post ID" });
        }

        const isFavorited = await storage.toggleUserFavoritePost(
          userId,
          postId,
        );
        res.json({ isFavorited });
      } catch (error: any) {
        console.error("Error toggling post favorite:", error);
        res.status(500).json({ message: "Failed to toggle favorite" });
      }
    },
  );

  app.get(
    "/api/posts/:id/is-favorited",
    optionalAuth,
    async (req: any, res) => {
      try {
        const userId = req.userId;
        const postId = parseInt(req.params.id);

        if (isNaN(postId)) {
          return res.status(400).json({ message: "Invalid post ID" });
        }

        if (!userId) {
          return res.json({ isFavorited: false });
        }

        const isFavorited = await storage.isPostFavoritedByUser(userId, postId);
        res.json({ isFavorited });
      } catch (error: any) {
        console.error("Error checking post favorite status:", error);
        res.status(500).json({ message: "Failed to check favorite status" });
      }
    },
  );

  app.get("/api/posts/:id/favorite-count", async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);

      if (isNaN(postId)) {
        return res.status(400).json({ message: "Invalid post ID" });
      }

      const count = await storage.getPostFavoriteCount(postId);
      res.json({ count });
    } catch (error: any) {
      console.error("Error getting post favorite count:", error);
      res.status(500).json({ message: "Failed to get favorite count" });
    }
  });

  // Q&A Knowledge Routes
  app.post("/api/qa-search", async (req: any, res) => {
    try {
      const { query } = req.body;

      if (!query || query.trim().length === 0) {
        return res.status(400).json({ message: "Search query is required" });
      }

      const results = await storage.searchQaKnowledge(query);

      let answer: string;
      let resultFound: boolean;

      if (results.length > 0) {
        answer = results[0].answer;
        resultFound = true;
      } else {
        answer =
          "I don't have a specific answer to that question yet. Please try rephrasing your question or contact our support team for personalized assistance.";
        resultFound = false;
      }

      // Log the search query and answer
      try {
        await storage.createSearchLog({
          query: query.trim(),
          answer,
          userId: req.user?.id || null, // null for anonymous users
          source: "landing",
          resultFound,
        });
      } catch (logError) {
        console.error("Error logging search:", logError);
        // Don't fail the search if logging fails
      }

      // Return the most relevant result or null
      res.json({
        result: results.length > 0 ? results[0] : null,
        totalResults: results.length,
      });
    } catch (error: any) {
      console.error("Error searching Q&A knowledge:", error);
      res.status(500).json({ message: "Failed to search Q&A knowledge" });
    }
  });

  // RAG-powered Q&A Search
  app.post("/api/rag-search", optionalAuth, enforcePromptQuota, async (req: any, res) => {
    try {
      const { query } = req.body;

      if (!query || query.trim().length === 0) {
        return res.status(400).json({ message: "Search query is required" });
      }

      // Import RAG service dynamically to avoid circular dependencies
      const { generateRagAnswer } = await import("./services/rag");

      const ragResponse = await generateRagAnswer(query.trim());

      // Log the search query and answer
      try {
        await storage.createSearchLog({
          query: query.trim(),
          answer: ragResponse.answer,
          userId: req.user?.id || null,
          source: "rag",
          resultFound: ragResponse.confidence > 0.3,
        });
      } catch (logError) {
        console.error("Error logging RAG search:", logError);
      }

      res.json({
        answer: ragResponse.answer,
        confidence: ragResponse.confidence,
        sources: ragResponse.sources.map((source) => ({
          question: source.chunk.metadata.question,
          content: source.chunk.chunkText.substring(0, 200) + "...",
          score: source.score,
          source: source.source,
        })),
        totalSources: ragResponse.sources.length,
      });
    } catch (error: any) {
      console.error("Error in RAG search:", error);
      res.status(500).json({
        message: "Failed to process RAG search",
        error: error.message,
      });
    }
  });

  // Test streaming endpoint for debugging production issues
  app.get("/api/test-stream", async (req: any, res) => {
    try {
      console.log("Starting test stream...");

      // Set headers for Server-Sent Events - crucial for production streaming
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "Cache-Control");
      res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
      res.setHeader("Transfer-Encoding", "chunked"); // Enable chunked transfer

      // Send initial heartbeat
      res.write(
        'data: {"type":"heartbeat","message":"Connection established"}\n\n',
      );
      res.flush?.();

      // Send test messages with delays
      for (let i = 1; i <= 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
        res.write(
          `data: {"type":"test","message":"Test message ${i}","timestamp":"${new Date().toISOString()}"}\n\n`,
        );
        res.flush?.();
        console.log(`Sent test message ${i}`);
      }

      // Send end signal
      res.write('data: {"type":"end","message":"Stream complete"}\n\n');
      res.flush?.();
      console.log("Test stream completed");
      res.end();
    } catch (error: any) {
      console.error("Error in test stream:", error);
      res.write(`data: {"type":"error","error":"${error.message}"}\n\n`);
      res.end();
    }
  });

  // Helper function to safely stringify JSON for streaming
  const safeJsonStringify = (obj: any): string => {
    try {
      const jsonStr = JSON.stringify(obj);
      // Replace problematic Unicode characters that could break JSON parsing
      return jsonStr
        .replace(/â€™/g, "'") // Replace smart apostrophe
        .replace(/â€œ/g, '"') // Replace smart quote open
        .replace(/â€/g, '"') // Replace smart quote close
        .replace(/â€"/g, "-") // Replace em dash
        .replace(/â€"/g, "-"); // Replace en dash
    } catch (error) {
      console.error("Error stringifying JSON:", error);
      return JSON.stringify({
        type: "error",
        error: "Failed to serialize data",
      });
    }
  };

  // Helper function to send large objects in smaller chunks to avoid truncation
  const writeJsonSafely = (res: any, obj: any): void => {
    const jsonStr = safeJsonStringify(obj);

    // If the JSON is very large (>4KB), we might have issues
    if (jsonStr.length > 4096) {
      console.warn(`Large JSON payload detected: ${jsonStr.length} characters`);

      // For metadata objects, try to simplify them
      if (obj.type === "metadata" && obj.sources) {
        // Send simplified metadata first
        const simplifiedMetadata = {
          type: "metadata",
          confidence: obj.confidence,
          sourceCount: obj.sources.length,
        };
        res.write(`data: ${safeJsonStringify(simplifiedMetadata)}\n\n`);
        res.flush?.();

        // Then send sources separately if needed
        console.log("Sent simplified metadata due to large payload");
        return;
      }
    }

    res.write(`data: ${jsonStr}\n\n`);
    res.flush?.();
  };

  // RAG-powered Q&A Search with Streaming
  app.post("/api/rag-search-stream", optionalAuth, enforcePromptQuota, async (req: any, res) => { 
    try {
      const { query } = req.body;

      if (!query || query.trim().length === 0) {
        return res.status(400).json({ message: "Search query is required" });
      }

      // Set headers for Server-Sent Events - crucial for production streaming
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "Cache-Control");
      res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
      res.setHeader("Transfer-Encoding", "chunked"); // Enable chunked transfer

      // Import RAG service dynamically to avoid circular dependencies
      const { generateRagAnswerStream } = await import("./services/rag");

      let fullAnswer = "";
      let metadata: any = null;

      // Send initial heartbeat to establish connection
      res.write('data: {"type":"heartbeat"}\n\n');
      res.flush?.(); // Force flush if available

      for await (const chunk of generateRagAnswerStream(query.trim())) {
        if (chunk.type === "metadata") {
          metadata = chunk;
          writeJsonSafely(res, chunk);
        } else if (chunk.type === "content") {
          fullAnswer += (chunk as any).content;
          writeJsonSafely(res, chunk);
        } else if (chunk.type === "error") {
          writeJsonSafely(res, chunk);
          break;
        }
      }

      // Send end signal
      writeJsonSafely(res, { type: "end" });

      // Log the search query and answer
      try {
        await storage.createSearchLog({
          query: query.trim(),
          answer: fullAnswer,
          userId: req.user?.id || null,
          source: "rag_stream",
          resultFound: metadata?.confidence > 0.3,
        });
      } catch (logError) {
        console.error("Error logging RAG search:", logError);
      }

      res.end();
    } catch (error: any) {
      console.error("Error in RAG search stream:", error);
      res.write(
        `data: ${JSON.stringify({
          type: "error",
          message: "Failed to process RAG search",
          error: error.message,
        })}\n\n`,
      );
      res.end();
    }
  });

  // Email AI Answer to User
  app.post("/api/email-answer", async (req: any, res) => {
    try {
      const { firstName, email, question, answer } = req.body;

      // Validate required fields
      if (!firstName || !email || !question || !answer) {
        return res.status(400).json({
          message:
            "All fields are required: firstName, email, question, answer",
        });
      }

      // Basic email validation
      if (!email.includes("@") || !email.includes(".")) {
        return res.status(400).json({
          message: "Please provide a valid email address",
        });
      }

      // Trim input data
      const trimmedData = {
        firstName: firstName.trim(),
        email: email.trim(),
        question: question.trim(),
        answer: answer.trim(),
      };

      // Send email using the email service
      const { emailService } = await import("./services/emailService");
      const success = await emailService.sendAiAnswerEmail(
        trimmedData.firstName,
        trimmedData.email,
        trimmedData.question,
        trimmedData.answer,
      );

      if (!success) {
        console.error("Failed to send AI answer email to:", trimmedData.email);
        return res.status(500).json({
          message: "Failed to send email. Please try again later.",
        });
      }

      console.log(
        `AI answer email sent successfully to ${trimmedData.email} for user ${trimmedData.firstName}`,
      );

      // Log the email request (optional)
      try {
        await storage.createSearchLog({
          query: `Email request: ${trimmedData.question}`,
          answer: `Emailed to: ${trimmedData.email}`,
          userId: req.user?.id || null,
          source: "email_answer",
          resultFound: true,
        });
      } catch (logError) {
        console.error("Error logging email request:", logError);
        // Don't fail the request if logging fails
      }

      res.json({
        success: true,
        message: "Email sent successfully",
      });
    } catch (error: any) {
      console.error("Error sending AI answer email:", error);
      res.status(500).json({
        message: "Failed to send email. Please try again later.",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  });

  // RAG System Management Routes
  app.post("/api/rag/initialize", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { initializeRagSystem } = await import("./services/rag");
      await initializeRagSystem();

      res.json({ message: "RAG system initialized successfully" });
    } catch (error: any) {
      console.error("Error initializing RAG system:", error);
      res.status(500).json({
        message: "Failed to initialize RAG system",
        error: error.message,
      });
    }
  });

  app.get("/api/rag/stats", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { getRagStats } = await import("./services/rag");
      const stats = await getRagStats();

      res.json(stats);
    } catch (error: any) {
      console.error("Error getting RAG stats:", error);
      res.status(500).json({
        message: "Failed to get RAG stats",
        error: error.message,
      });
    }
  });

  app.post("/api/rag/test", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { testRagSystem } = await import("./services/rag");
      await testRagSystem();

      res.json({ message: "RAG system test completed successfully" });
    } catch (error: any) {
      console.error("Error testing RAG system:", error);
      res.status(500).json({
        message: "Failed to test RAG system",
        error: error.message,
      });
    }
  });

  // Admin route to add Q&A knowledge
  app.post("/api/qa-knowledge", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const qaItem = await storage.createQaKnowledge(req.body);
      res.json(qaItem);
    } catch (error: any) {
      console.error("Error creating Q&A knowledge:", error);
      res.status(500).json({ message: "Failed to create Q&A knowledge" });
    }
  });

  // Admin route to get search logs
  app.get("/api/admin/search-logs", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await storage.getSearchLogs(limit);
      res.json(logs);
    } catch (error: any) {
      console.error("Error fetching search logs:", error);
      res.status(500).json({ message: "Failed to fetch search logs" });
    }
  });

  // Social media embeds routes
  app.get("/api/social-media-embeds/:type", async (req, res) => {
    try {
      const { type } = req.params;
      const embeds = await storage.getSocialMediaEmbeds(type);
      res.json(embeds);
    } catch (error: any) {
      console.error("Error fetching social media embeds:", error);
      res.status(500).json({ message: "Failed to fetch social media embeds" });
    }
  });

  app.post(
    "/api/social-media-embeds",
    isAdmin,
    async (req: any, res) => {
      try {
        const validationResult = insertSocialMediaEmbedSchema.safeParse(req.body);
        if (!validationResult.success) {
          console.error("Validation error:", validationResult.error);
          return res.status(400).json({ 
            message: "Invalid embed data", 
            errors: validationResult.error.errors 
          });
        }

        const embed = await storage.createSocialMediaEmbed(validationResult.data);
        res.json(embed);
      } catch (error: any) {
        console.error("Error creating social media embed:", error);
        res
          .status(500)
          .json({ message: "Failed to create social media embed" });
      }
    },
  );

  app.put(
    "/api/social-media-embeds/:id",
    isAdmin,
    async (req: any, res) => {
      try {
        const id = parseInt(req.params.id);
        const { embedCode } = req.body;
        const embed = await storage.updateSocialMediaEmbed(id, embedCode);
        res.json(embed);
      } catch (error: any) {
        console.error("Error updating social media embed:", error);
        res
          .status(500)
          .json({ message: "Failed to update social media embed" });
      }
    },
  );

  app.delete(
    "/api/social-media-embeds/:id",
    isAdmin,
    async (req: any, res) => {
      try {
        const id = parseInt(req.params.id);
        await storage.deleteSocialMediaEmbed(id);
        res.json({ success: true });
      } catch (error: any) {
        console.error("Error deleting social media embed:", error);
        res
          .status(500)
          .json({ message: "Failed to delete social media embed" });
      }
    },
  );

  // Clerk user registration endpoints
  app.post("/api/update-clerk-metadata", async (req, res) => {
    try {
      const { clerkUserId, metadata } = req.body;
      
      if (!clerkUserId) {
        return res.status(400).json({ message: "Missing clerkUserId" });
      }

      await updateClerkUserMetadata(clerkUserId, metadata);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to update Clerk metadata:", error);
      res.status(500).json({ message: "Failed to update user metadata" });
    }
  });

  app.post("/api/register-clerk-user", async (req, res) => {
    try {
      const { 
        clerkUserId, 
        firstName, 
        lastName, 
        email, 
        isHealthcareProfessional,
        // Professional fields
        profession,
        professionalTitle,
        company,
        companyAddress,
        companyEmail,
        companyWebsite,
        credentials,
        licenseNumber,
        yearsExperience
      } = req.body;
      
      if (!clerkUserId || !email) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Create username from email
      const username = email.split('@')[0] || `user_${clerkUserId.slice(-8)}`;

      // Prepare user data for database
      const userData: UpsertUser = {
        id: clerkUserId,
        username: username,
        email: email,
        firstName: firstName,
        lastName: lastName,
        password: "clerk_managed_auth", // Placeholder since Clerk manages auth
        role: isHealthcareProfessional ? "expert" as UserRole : "user" as UserRole,
        emailVerified: true, // Clerk handles verification
        defaultProfileType: isHealthcareProfessional ? "tree" : undefined,
      };

      // Create user in our PostgreSQL database
      const newUser = await storage.upsertUser(userData);
      
      // If healthcare professional, create expert verification record
      if (isHealthcareProfessional && profession && professionalTitle && company) {
        await storage.createExpertVerification({
          userId: clerkUserId,
          profession: profession,
          professionalTitle: professionalTitle,
          company: company,
          companyAddress: companyAddress,
          companyEmail: companyEmail,
          companyWebsite: companyWebsite,
          credentials: credentials,
          licenseNumber: licenseNumber,
          yearsExperience: yearsExperience,
          verificationStatus: "pending", // Will need manual verification
        });
      }
      
      // Notify admins about professional signup
      try {
        if (isHealthcareProfessional) {
          const admins = await storage.getAdmins();
          const adminEmails = admins.map((a: any) => a.email).filter(Boolean);
          if (adminEmails.length > 0) {
            const subject = "New professional signup";
            const html = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
             
              <div style="background-color: #0B666B; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0;">New Professional Signup on AskEdith</h1>
              </div>

             
              <div style="padding: 30px; background-color: #f5f5f5;">
                <h2 style="color: #333;">Hi Admin,</h2>
                <p style="color: #555; line-height: 1.6;">
                  A new professional has just signed up on <strong>AskEdith</strong>.
                </p>

                 
                <div
                  style="background-color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0B666B;"
                >
                  <h3 style="color: #333; margin-top: 0;">👤 Professional Details</h3>

                  <p style="color: #666; margin: 8px 0;">
                    <strong>Full Name:</strong>
                    ${(firstName || '') + ' ' + (lastName || '')}
                  </p>

                  <p style="color: #666; margin: 8px 0;">
                    <strong>Community:</strong>
                    ${userData.communityName || 'N/A'}
                  </p>

                  <p style="color: #666; margin: 8px 0;">
                    <strong>Profession:</strong>
                    ${profession || 'N/A'}
                  </p>

                  <p style="color: #666; margin: 8px 0;">
                    <strong>createdAt:</strong>
                    ${userData.createdAt || 'N/A'} 
                  </p>

                  
                </div>              
               
              </div>

             
              <div
                style="background-color: #333; color: #999; padding: 20px; text-align: center; font-size: 12px;"
              >
                <p style="margin: 0;">© 2025 AskEdith. All rights reserved.</p>
              </div>
            </div>
            `;
            await Promise.all(
              adminEmails.map((to: string) =>
                emailService.sendEmail({ to, subject, html })
              )
            );
          }
        }
      } catch (notifyErr) {
        console.warn("Failed to send admin professional-signup notification:", notifyErr);
      }

      res.json({ 
        success: true, 
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
        }
      });
    } catch (error) {
      console.error("Failed to create user in database:", error);
      res.status(500).json({ message: "Failed to create user account" });
    }
  });

  // Check if user profile is complete
  app.get("/api/profile-complete", clerkAuthWithSync, async (req: Request, res: Response) => {
    try {
      // Force fresh data - profile completeness can change
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      // User is already attached to request by clerkAuthWithSync middleware
      const user = req.user;
      if (!user) {
        return res.json({ isComplete: false, reason: "User not found in database" });
      }

      // Define what makes a profile "complete" - all required fields
      const isComplete = !!(
        user.firstName && 
        user.lastName &&
        user.email &&
        user.communityName &&
        user.city &&
        user.state &&
        user.username
      );

      res.json({ 
        isComplete,
        user: isComplete ? user : null,
        reason: isComplete ? null : "Missing required profile information"
      });
    } catch (error) {
      console.error("Failed to check profile completeness:", error);
      res.status(500).json({ message: "Failed to check profile" });
    }
  });

  // Complete user profile after Clerk authentication
  app.post("/api/complete-profile", clerkAuthWithSync, async (req: Request, res: Response) => {
    try {
      // User is already attached to request by clerkAuthWithSync middleware
      const userId = req.userId!;
      const existingUser = req.user;

      const { 
        firstName, 
        lastName, 
        username,
        communityName, 
        city, 
        state, 
        timezone, 
        introduction,
        isProfessional,
        isHealthcareProfessional,
        company,
        companyWebsite,
        companyPhone,
        profession,
        licenseNumber,
        professionalAssociation,
        // Appointment booking fields
        allowBooking,
        calendlyLink,
        consultationRate
      } = req.body;

      if (!firstName || !lastName || !username || !communityName || !city || !state) {
        return res.status(400).json({ message: "First name, last name, username, community name, city, and state are required" });
      }

      // Validate professional fields if user selected professional
      if (isProfessional) {
        if (!company || company.trim() === "") {
          return res.status(400).json({ message: "Company/Organization is required for professionals" });
        }
        if (!profession || profession.trim() === "") {
          return res.status(400).json({ message: "Profession is required for professionals" });
        }
        if (companyWebsite && companyWebsite.trim() !== "") {
          try {
            new URL(companyWebsite);
          } catch {
            return res.status(400).json({ message: "Please enter a valid website URL" });
          }
        }
        
        // Validate appointment booking fields
        if (allowBooking && (!calendlyLink || calendlyLink.trim() === "")) {
          return res.status(400).json({ message: "Calendly link is required when appointment booking is enabled" });
        }

        if (allowBooking && (!consultationRate || consultationRate.trim() === "")) {
          return res.status(400).json({ message: "Hourly consultation rate is required when appointment booking is enabled" });
        }
        
        if (calendlyLink && calendlyLink.trim() !== "") {
          try {
            const url = new URL(calendlyLink);
            if (url.protocol !== 'https:') {
              return res.status(400).json({ message: "Calendly URL must use HTTPS" });
            }
            if (!(url.hostname === 'calendly.com' || url.hostname.endsWith('.calendly.com'))) {
              return res.status(400).json({ message: "Please enter a valid Calendly URL (e.g., https://calendly.com/your-username)" });
            }
          } catch {
            return res.status(400).json({ message: "Please enter a valid Calendly URL" });
          }
        }

        if (consultationRate && consultationRate.trim() !== "") {
          const rate = parseFloat(consultationRate.trim());
          if (isNaN(rate) || rate < 50 || rate > 500) {
            return res.status(400).json({ message: "Consultation rate must be between $50 and $500" });
          }
        }
      }

      // Check if username is already taken by another user
      if (existingUser?.username !== username) {
        const existingUserByUsername = await storage.getUserByUsername(username);
        if (existingUserByUsername && existingUserByUsername.id !== userId) {
          return res.status(409).json({ message: "Username is already taken. Please choose a different username." });
        }
      }

      // Get Clerk user's email
      const clerkUser = await clerkClient.users.getUser(userId);
      const clerkEmail = clerkUser.emailAddresses?.[0]?.emailAddress || existingUser?.email || "";

      // Normalize professional flag from different client payloads
      const professionalFlag = (typeof isProfessional !== 'undefined' ? isProfessional : isHealthcareProfessional) === true;

      // Set role and profile type based on professional status, preserving admin roles
      const userRole: UserRole = existingUser?.role === 'admin' 
        ? 'admin' 
        : (professionalFlag === true 
          ? 'expert' 
          : (professionalFlag === false 
            ? 'user' 
            : (existingUser?.role ?? 'user')));
      
      const profileType = userRole === 'expert' 
        ? 'tree' 
        : userRole === 'admin' 
          ? (existingUser?.defaultProfileType ?? 'daisy') 
          : (professionalFlag === false 
            ? 'daisy' 
            : (existingUser?.defaultProfileType ?? 'daisy'));

      const userData = {
        id: userId,
        username: username, // Use provided username
        email: clerkEmail, // Use Clerk email
        password: existingUser?.password || "clerk_managed_auth",
        firstName,
        lastName,
        communityName: communityName,
        city: city,
        state: state,
        timezone: timezone || "UTC",
        introduction: introduction || null,
        role: userRole,
        emailVerified: existingUser?.emailVerified ?? clerkUser.emailAddresses?.some(e => e.verification?.status === 'verified') ?? false,
        profileImageUrl: existingUser?.profileImageUrl || null,
        defaultProfileType: profileType,
        isPremium: existingUser?.isPremium || false,
        stripeCustomerId: existingUser?.stripeCustomerId || null,
        stripeSubscriptionId: existingUser?.stripeSubscriptionId || null,
      };

      const updatedUser = await storage.upsertUser(userData);
      
      // Update Clerk metadata to match the professional status (only if role changed)
      if (userRole !== existingUser?.role || profileType !== existingUser?.defaultProfileType) {
        try {
          await updateClerkUserMetadata(userId, {
            isExpert: userRole === 'expert',
            role: userRole,
            defaultProfileType: profileType
          });
        } catch (error) {
          console.error("Failed to update Clerk metadata:", error);
          // Don't fail the whole request if Clerk metadata update fails
        }
      }
      
      // Handle expert verification for professional users
      let expertVerification = null;
      if (professionalFlag) {
        try {
          // Check if expert verification already exists
          expertVerification = await storage.getExpertVerification(userId);
          
          if (expertVerification) {
            // Update existing expert verification record with new data
            const updateData = {
              profession: profession || null,
              company: company || null,
              companyWebsite: companyWebsite || null,
              companyPhone: companyPhone || null,
              licenseNumber: licenseNumber || null,
              professionalAssociation: professionalAssociation || null,
              // Appointment booking fields
              allowBooking: Boolean(allowBooking),
              calendlyLink: calendlyLink || null,
              // Consultation rate in cents
              consultationRate: consultationRate ? Math.round(parseFloat(consultationRate) * 100) : null,
              // Preserve existing verification status unless it's in a terminal failed state
              ...(expertVerification.verificationStatus !== 'verified' && 
                  expertVerification.verificationStatus !== 'rejected' && {
                verificationStatus: 'pending' as const
              }),
              // Reset fee status to pending if updating professional details
              ...(expertVerification.verificationFeeStatus !== 'paid' && {
                verificationFeeStatus: 'pending' as const
              })
            };
            
            expertVerification = await storage.updateExpertVerification(expertVerification.id, updateData);
          } else {
            // Create new expert verification record
            const expertData = {
              userId: userId,
              profession: profession || null,
              company: company || null,
              companyWebsite: companyWebsite || null,
              companyPhone: companyPhone || null,
              licenseNumber: licenseNumber || null,
              professionalAssociation: professionalAssociation || null,
              // Appointment booking fields
              allowBooking: Boolean(allowBooking),
              calendlyLink: calendlyLink || null,
              // Consultation rate in cents
              consultationRate: consultationRate ? Math.round(parseFloat(consultationRate) * 100) : null,
              verificationStatus: 'pending' as const,
              verificationFeeStatus: 'pending' as const,
            };
            
            expertVerification = await storage.createExpertVerification(expertData);
          }
        } catch (error) {
          console.error("Failed to handle expert verification:", error);
          // Don't fail the whole request if expert verification fails
        }
      } else {
        // Get existing expert verification if any (non-professional user)
        try {
          expertVerification = await storage.getExpertVerification(userId);
        } catch (error) {
          // Expert verification might not exist, that's ok for non-professional users
        }
      }
      
      // Notify admins when user is an expert (professional signup)
      try {
        if (userRole === 'expert') {
          const admins = await storage.getAdmins();
          const adminEmails = admins.map((a: any) => a.email).filter(Boolean);
          if (adminEmails.length > 0) {
            const subject = "New professional signup";
            const html = `
               <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
             
              <div style="background-color: #0B666B; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0;">New Professional Signup on AskEdith</h1>
              </div>

             
              <div style="padding: 30px; background-color: #f5f5f5;">
                <h2 style="color: #333;">Hi Admin,</h2>
                <p style="color: #555; line-height: 1.6;">
                  A new professional has just signed up on <strong>AskEdith</strong>.
                </p>

                 
                <div
                  style="background-color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0B666B;"
                >
                  <h3 style="color: #333; margin-top: 0;">👤 Professional Details</h3>

                  <p style="color: #666; margin: 8px 0;">
                    <strong>Full Name:</strong>
                    ${(firstName || '') + ' ' + (lastName || '')}
                  </p>

                  <p style="color: #666; margin: 8px 0;">
                    <strong>communityName:</strong>
                    ${communityName || 'N/A'}
                  </p>

                  <p style="color: #666; margin: 8px 0;">
                    <strong>Profession:</strong>
                    ${profession || 'N/A'}
                  </p>

                  <p style="color: #666; margin: 8px 0;">
                    <strong>Created:</strong>
                    ${userData.timezone || 'N/A'} 
                  </p>

                  
                </div>              
               
              </div>

             
              <div
                style="background-color: #333; color: #999; padding: 20px; text-align: center; font-size: 12px;"
              >
                <p style="margin: 0;">© 2025 AskEdith. All rights reserved.</p>
              </div>
            </div>

            `;
            await Promise.all(
              adminEmails.map((to: string) =>
                emailService.sendEmail({ to, subject, html })
              )
            );
          }
        }
      } catch (notifyErr) {
        console.warn("Failed to send admin professional-signup notification:", notifyErr);
      }

      const userWithVerification = {
        ...updatedUser,
        expertVerification
      };
      
      res.json(userWithVerification);
    } catch (error) {
      console.error("Failed to complete profile:", error);
      res.status(500).json({ message: "Failed to complete profile" });
    }
  });

  const httpServer = createServer(app);

  // Setup GraphQL server
  await createGraphQLServer(app, httpServer);

  return httpServer;
}

// Helper function to generate available slots excluding busy times
function generateAvailableSlotsExcludingBusy(busyTimes: any[], date: Date) {
  const slots = [];
  const workStart = 9; // 9 AM
  const workEnd = 17; // 5 PM
  const slotDuration = 30; // 30 minutes

  for (let hour = workStart; hour < workEnd; hour++) {
    for (let minute = 0; minute < 60; minute += slotDuration) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, minute, 0, 0);

      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

      // Check if this slot overlaps with any busy time
      const isBusy = busyTimes.some((busy) => {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        return slotStart < busyEnd && slotEnd > busyStart;
      });

      if (!isBusy) {
        slots.push({
          time: `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
          available: true,
        });
      }
    }
  }

  return slots;
}
