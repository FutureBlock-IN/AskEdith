import { Request, Response, NextFunction } from "express";
import { clerkMiddleware, getAuth, requireAuth } from "@clerk/express";
import { storage } from "../storage";
import { UserRole, User } from "@shared/schema";

// Extend Express Request to include Clerk properties
declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
    auth?: {
      userId?: string;
      sessionId?: string;
      isAuthenticated: boolean;
    };
  }
}

// Clerk base middleware - should be applied globally
// Use the same publishable key as frontend for consistency
const publishableKey = process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY;
export const clerkAuth = clerkMiddleware({
  publishableKey: publishableKey!,
  secretKey: process.env.CLERK_SECRET_KEY!,
});

// Enhanced middleware that syncs Clerk user with our database
export const clerkAuthWithSync = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get auth info from Clerk middleware (should be applied before this)
    const auth = getAuth(req);
    
    if (!auth.isAuthenticated || !auth.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Try to get user from our database
    let user = await storage.getUser(auth.userId);
    
    // If user doesn't exist in our database, sync from Clerk automatically
    if (!user) {
      console.log(`User not found in database, syncing from Clerk: ${auth.userId}`);
      
      // Import user sync service and sync the user
      const { syncUserWithDatabase } = await import("../services/userSync");
      user = await syncUserWithDatabase(auth.userId);
    }

    // Attach user to request
    req.userId = auth.userId;
    req.user = user;
    
    next();
  } catch (error) {
    console.error("Clerk authentication error:", error);
    res.status(401).json({ message: "Authentication failed" });
  }
};

// Lightweight auth check that only verifies JWT without database sync
export const requireClerkAuth = requireAuth();

// Simple auth middleware that adds user info to request if available
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const auth = getAuth(req);
  
  if (auth.isAuthenticated && auth.userId) {
    req.userId = auth.userId;
    req.auth = auth;
  }
  
  next();
};

// Admin access control middleware
export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = getAuth(req);
    
    if (!auth.isAuthenticated || !auth.userId) {
      return res.status(401).json({ message: "Unauthorized - not logged in" });
    }

    // Get user from database
    const user = await storage.getUser(auth.userId);
    
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }

    // Attach user to request
    req.userId = auth.userId;
    req.user = user;
    
    next();
  } catch (error) {
    console.error("Admin authorization error:", error);
    res.status(500).json({ message: "Authorization failed" });
  }
};