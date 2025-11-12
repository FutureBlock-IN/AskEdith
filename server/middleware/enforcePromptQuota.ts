import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

function getClientIp(req: Request): string {
  const xfwd = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim();
  return xfwd || (req.ip as string) || (req.socket.remoteAddress as string) || "unknown";
}

export async function enforcePromptQuota(req: Request, res: Response, next: NextFunction) {
  try {
    // Check if user is logged in
    const userId = (req as any).userId || (req as any).user?.id;
    const ip = getClientIp(req);

    // Logged-in users: unlimited prompts, but still track in database
    if (userId) {
      if (ip && ip !== "unknown") {
        await storage.ensurePromptUsageRecord(ip, userId);
      }
      return next();
    }

    // Guest users: enforce 2-prompt limit
    if (!ip || ip === "unknown") {
      console.warn("Could not determine IP address for guest prompt quota check");
      return res.status(429).json({ 
        message: "Your quota is over. Please sign in or sign up for more prompts." 
      });
    }

    // Get current usage for this IP
    const usage = await storage.getPromptUsageByIp(ip);

    // If usage exists, check if 24h window has expired
    if (usage?.firstUsedAt) {
      const first = new Date(usage.firstUsedAt);
      const now = new Date();
      const elapsedMs = now.getTime() - first.getTime();
      
      // Reset if more than 24 hours have passed
      if (elapsedMs > 24 * 60 * 60 * 1000) {
        await storage.resetPromptUsage(usage.id);
        // After reset, count starts at 0, so allow this prompt and increment
        await storage.incrementPromptUsageForIp(ip);
        return next();
      }
    }

    // Check quota BEFORE incrementing (block if already at or above limit)
    if (usage && usage.promptCount >= 2) {
      return res.status(429).json({
        message: "Your quota is over. Please sign in or sign up for more prompts.",
      });
    }

    // Increment count for this prompt (this will create record if it doesn't exist)
    await storage.incrementPromptUsageForIp(ip);
    
    return next();
  } catch (err) {
    console.error("Error in enforcePromptQuota:", err);
    // Fail closed to prevent abuse if storage fails
    return res.status(429).json({
      message: "Your quota is over. Please sign in or sign up for more prompts.",
    });
  }
}



