import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, UpsertUser, UserRole } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { emailService } from "./services/emailService";
import jwt from "jsonwebtoken";
import { loginLimiter, registrationLimiter, passwordResetLimiter } from "./middleware/rateLimiter";
import { clerkAuth } from "./middleware/clerkAuth";

// Extend Express User type to include role
declare global {
  namespace Express {
    interface User extends SelectUser {
      role: UserRole;
    }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Apply Clerk authentication middleware globally
  app.use(clerkAuth);
  
  // Use memory store as fallback if database connection fails
  let store;
  try {
    const PostgresSessionStore = connectPg(session);
    store = new PostgresSessionStore({
      conString: process.env.DATABASE_URL,
      tableName: "sessions",
      createTableIfMissing: false, // Drizzle ORM is responsible for schema management
    });
  } catch (error: any) {
    console.warn('Failed to connect to PostgreSQL session store, using memory store:', error?.message || String(error));
    // Memory store will be used as default
  }
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "askedith-dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log('Login attempt for username:', username);
        
        // Try to find user by username first
        let user = await storage.getUserByUsername(username);
        
        // If not found by username, try by email
        if (!user && username.includes('@')) {
          console.log('Trying to find user by email:', username);
          user = await storage.getUserByEmail(username);
        }
        
        if (!user) {
          console.log('User not found');
          return done(null, false);
        }
        
        console.log('User found:', user.username, 'Email:', user.email);
        const passwordMatch = await comparePasswords(password, user.password);
        console.log('Password match result:', passwordMatch);
        
        if (!passwordMatch) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        console.error('Passport auth error:', error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, null);
      }
      // Ensure the user has a role, default to 'user' if not set
      const userWithRole = {
        ...user,
        role: (user.role || 'user') as UserRole
      };
      done(null, userWithRole);
    } catch (error) {
      done(error);
    }
  });

  // In the /api/register route handler
  app.post("/api/register", registrationLimiter, async (req, res, next) => {
    try {
      const { 
        username, 
        email, 
        password, 
        firstName, 
        lastName, 
        role,
        communityName,
        city,
        state,
        introduction
      }: {
        username: string;
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        role?: string;
        communityName?: string;
        city?: string;
        state?: string;
        introduction?: string;
      } = req.body;

      // Check if username or email already exists
      const existingUser = await storage.getUserByUsername(username) || await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Username or email already exists" });
      }

      // Validate and set role
      const requestedRole = ["user", "expert"].includes(role || '') ? role as UserRole : "user";
      const defaultProfileType = requestedRole === "expert" ? "tree" : "daisy";

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user with the requested role
      const user = await storage.createUser({
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        username,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        communityName,
        city,
        state,
        introduction,
        role: requestedRole,
        defaultProfileType,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Generate verification token
      const verificationToken = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Save verification token
      await storage.createEmailVerificationToken({
        userId: user.id,
        token: verificationToken,
        expiresAt
      });

      // Send verification email
      await emailService.sendVerificationEmail(email, username, verificationToken);

      // Log in the user
      req.login(user, (err) => {
        if (err) return next(err);
        // Don't send back the password hash
        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", loginLimiter, (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Authentication error" });
      }
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      req.login(user, async (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed" });
        }
        try {
          const expertVerification = await storage.getExpertVerification(user.id);
          const { password: _, ...userWithoutPassword } = user;
          return res.status(200).json({ ...userWithoutPassword, expertVerification: expertVerification || null });
        } catch (error) {
          console.error("Error getting expert verification:", error);
          const { password: _, ...userWithoutPassword } = user;
          return res.status(200).json({ ...userWithoutPassword, expertVerification: null });
        }
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.redirect('/');
    });
  });

  app.get("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.redirect('/');
    });
  });

  // Updated /api/user endpoint to use Clerk authentication
  app.get("/api/user", async (req, res) => {
    try {
      // Force fresh data - user data can change
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      // Import Clerk functions and user sync
      const { getAuth } = await import("@clerk/express");
      const { getUserWithSync } = await import("./services/userSync");
      
      // Get auth info from Clerk middleware
      const auth = getAuth(req);
      
      if (!auth.isAuthenticated || !auth.userId) {
        return res.sendStatus(401);
      }

      // Get user from database with automatic sync from Clerk if needed
      const user = await getUserWithSync(auth.userId);
      const expertVerification = await storage.getExpertVerification(user.id);
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({
        ...userWithoutPassword,
        expertVerification: expertVerification || null,
      });
    } catch (error) {
      console.error("Error in /api/user endpoint:", error);
      res.status(500).json({ message: "Failed to get user data" });
    }
  });

  // Email verification request endpoint
  app.post("/api/request-verification", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.emailVerified) {
        return res.status(400).json({ message: "Email already verified" });
      }

      // Generate verification token
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Save token to database
      await storage.createEmailVerificationToken({
        userId: user.id,
        token,
        expiresAt
      });

      // Send verification email
      await emailService.sendVerificationEmail(user.email, user.username, token);

      res.json({ message: "Verification email sent" });
    } catch (error) {
      console.error("Verification request error:", error);
      res.status(500).json({ message: "Failed to send verification email" });
    }
  });

  // Email verification endpoint
  app.get("/api/verify-email", async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: "Invalid verification token" });
      }

      // Get token from database
      const verificationToken = await storage.getEmailVerificationToken(token);
      
      if (!verificationToken) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }

      // Check if token is expired
      if (new Date() > verificationToken.expiresAt) {
        await storage.deleteEmailVerificationToken(token);
        return res.status(400).json({ message: "Token has expired" });
      }

      // Verify user's email
      await storage.verifyUserEmail(verificationToken.userId);
      
      // Delete the used token
      await storage.deleteEmailVerificationToken(token);

      // Get user details for welcome email
      const user = await storage.getUser(verificationToken.userId);
      if (user) {
        await emailService.sendWelcomeEmail(user.email!, user.username);
      }

      res.redirect('/verify-success');
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ message: "Failed to verify email" });
    }
  });

  // Password reset request endpoint
  app.post("/api/forgot-password", passwordResetLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Don't reveal if email exists
        return res.json({ message: "If an account exists with this email, a password reset link has been sent" });
      }

      // Generate reset token
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Save token to database
      await storage.createPasswordResetToken({
        userId: user.id,
        token,
        expiresAt
      });

      // Send password reset email
      console.log('Sending password reset email to:', user.email);
      console.log('Username:', user.username);
      console.log('Token:', token);
      
      const emailSent = await emailService.sendPasswordResetEmail(user.email!, user.username, token);
      console.log('Email sent result:', emailSent);

      res.json({ message: "If an account exists with this email, a password reset link has been sent" });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Password reset endpoint
  app.post("/api/reset-password", async (req, res) => {
    try {
      console.log("Password reset request body:", req.body);
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      // Get token from database
      const resetToken = await storage.getPasswordResetToken(token);
      
      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }

      // Check if token is expired
      if (new Date() > resetToken.expiresAt) {
        await storage.deletePasswordResetToken(token);
        return res.status(400).json({ message: "Token has expired" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);
      console.log('Password reset - New password hashed, length:', hashedPassword.length);
      
      // Update user's password
      await storage.updateUserPassword(resetToken.userId, hashedPassword);
      console.log('Password updated for user:', resetToken.userId);
      
      // Delete the used token
      await storage.deletePasswordResetToken(token);

      res.json({ message: "Password reset successful" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });
}

// Authentication middleware - checks both Passport session auth and Clerk auth
export async function isAuthenticated(req: any, res: any, next: any) {
  // Check Passport session authentication first
  if (req.isAuthenticated()) {
    return next();
  }
  
  // Check Clerk authentication as fallback
  try {
    const { getAuth } = await import("@clerk/express");
    const { getUserWithSync } = await import("./services/userSync");
    const auth = getAuth(req);
    
    if (auth.isAuthenticated && auth.userId) {
      // Sync user from Clerk if needed
      const user = await getUserWithSync(auth.userId);
      req.userId = auth.userId;
      req.user = user;
      return next();
    }
  } catch (error) {
    console.error("Clerk auth check error:", error);
  }
  
  res.status(401).json({ message: "Unauthorized" });
}