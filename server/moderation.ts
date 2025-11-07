import OpenAI from "openai";
import { db } from "./db";
import { moderationResults } from "@shared/schema";
import type { InsertModerationResult } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ModerationResponse {
  score: number;
  flaggedCategories: string[];
  status: "approved" | "flagged" | "rejected";
  reason: string;
}

export async function moderateContent(
  content: string,
  contentType: "post" | "comment",
  contentId: string
): Promise<ModerationResponse> {
  try {
    const prompt = `
You are a content moderator for a supportive caregiving community where family members help each other with eldercare challenges. Please analyze this ${contentType} for appropriateness.

Content to analyze: "${content}"

Evaluate for:
1. Harassment, bullying, or personal attacks
2. Hate speech or discrimination
3. Spam or promotional content
4. Medical misinformation that could be harmful
5. Personal information that should be protected
6. Off-topic content not related to caregiving
7. Inappropriate language or content

Respond in JSON format with:
{
  "score": (0-1, where 1 is most problematic),
  "flaggedCategories": ["category1", "category2"],
  "status": "approved|flagged|rejected",
  "reason": "brief explanation"
}

Guidelines:
- "approved": Safe, supportive content (score 0-0.3)
- "flagged": Needs human review (score 0.3-0.7)  
- "rejected": Clear violation (score 0.7-1.0)
- Be supportive of emotional expressions and vulnerable sharing
- Allow discussions of difficult caregiving situations
- Protect against harmful medical advice
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a content moderator focused on maintaining a safe, supportive caregiving community."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Store moderation result in database
    const moderationData: InsertModerationResult = {
      contentId,
      contentType,
      moderationScore: result.score || 0,
      flaggedCategories: result.flaggedCategories || [],
      moderationStatus: result.status || "approved",
      aiResponse: response.choices[0].message.content,
    };

    await db.insert(moderationResults).values(moderationData);

    return {
      score: result.score || 0,
      flaggedCategories: result.flaggedCategories || [],
      status: result.status || "approved",
      reason: result.reason || "Content reviewed successfully"
    };

  } catch (error) {
    console.error("Moderation error:", error);
    
    // Default to flagged for manual review if AI fails
    const fallbackData: InsertModerationResult = {
      contentId,
      contentType,
      moderationScore: 0.5,
      flaggedCategories: ["ai_error"],
      moderationStatus: "flagged",
      aiResponse: `AI moderation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };

    await db.insert(moderationResults).values(fallbackData);

    return {
      score: 0.5,
      flaggedCategories: ["ai_error"],
      status: "flagged",
      reason: "Automatic moderation unavailable, flagged for manual review"
    };
  }
}

export async function getModerationStatus(contentId: string): Promise<ModerationResponse | null> {
  try {
    const result = await db
      .select()
      .from(moderationResults)
      .where(eq(moderationResults.contentId, contentId))
      .orderBy(desc(moderationResults.createdAt))
      .limit(1);

    if (result.length === 0) return null;

    const mod = result[0];
    return {
      score: mod.moderationScore,
      flaggedCategories: mod.flaggedCategories || [],
      status: mod.moderationStatus as "approved" | "flagged" | "rejected",
      reason: mod.aiResponse || "No reason provided"
    };
  } catch (error) {
    console.error("Error getting moderation status:", error);
    return null;
  }
}