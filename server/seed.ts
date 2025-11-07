// Create this file: server/seed.ts
// Run this to initialize your database with real data
import 'dotenv/config';
import { db } from "./db";
import { categories, achievements, users } from "@shared/schema";
import { eq } from "drizzle-orm";

interface CategorySeed {
  name: string;
  description: string;
  slug: string;
  color: string;
  icon: string;
  level: number;
  orderIndex: number;
  isOfficial: boolean;
  parentSlug?: string; // For building hierarchy
}

interface AchievementSeed {
  name: string;
  description: string;
  icon: string;
  category: string;
  points: number;
  requirements: string;
}

const defaultCategories: CategorySeed[] = [
  // Level 0 - Main Forums
  {
    name: "General Discussion",
    description: "Open discussions about all aspects of caregiving",
    slug: "general-discussion",
    color: "#6B7280",
    icon: "MessageCircle",
    level: 0,
    orderIndex: 1,
    isOfficial: true
  },
  {
    name: "Medical & Health",
    description: "Medical questions, health management, and healthcare navigation",
    slug: "medical-health",
    color: "#EF4444",
    icon: "Heart",
    level: 0,
    orderIndex: 2,
    isOfficial: true
  },
  {
    name: "Daily Living",
    description: "Day-to-day caregiving challenges and solutions",
    slug: "daily-living",
    color: "#10B981",
    icon: "Home",
    level: 0,
    orderIndex: 3,
    isOfficial: true
  },
  {
    name: "Legal & Financial",
    description: "Legal matters, financial planning, and benefits",
    slug: "legal-financial",
    color: "#3B82F6",
    icon: "Scale",
    level: 0,
    orderIndex: 4,
    isOfficial: true
  },
  {
    name: "Self-Care & Support",
    description: "Taking care of yourself while caring for others",
    slug: "self-care",
    color: "#8B5CF6",
    icon: "User",
    level: 0,
    orderIndex: 5,
    isOfficial: true
  },
  {
    name: "Resources & Tools",
    description: "Helpful resources, tools, and recommendations",
    slug: "resources-tools",
    color: "#F59E0B",
    icon: "Bookmark",
    level: 0,
    orderIndex: 6,
    isOfficial: true
  },
  {
    name: "Care Professionals",
    description: "Connect with various care and retirement professionals",
    slug: "care-professionals",
    color: "#059669",
    icon: "Users",
    level: 0,
    orderIndex: 7,
    isOfficial: true
  },

  // Retirement Forums (Level 0)
  {
    name: "Advice Between Generations",
    description: "Sharing wisdom and advice across generations",
    slug: "advice-between-generations",
    color: "#1e3a5f",
    icon: "MessageCircle",
    level: 0,
    orderIndex: 10,
    isOfficial: true
  },
  {
    name: "My Favorite Places to Visit",
    description: "Share your favorite travel destinations and experiences",
    slug: "my-favorite-places-to-visit",
    color: "#1e3a5f",
    icon: "MapPin",
    level: 0,
    orderIndex: 11,
    isOfficial: true
  },
  {
    name: "My Favorite Recipes",
    description: "Share recipes and cooking tips",
    slug: "my-favorite-recipes",
    color: "#1e3a5f",
    icon: "Utensils",
    level: 0,
    orderIndex: 12,
    isOfficial: true
  },
  {
    name: "Should I Spend or Should I Save?",
    description: "Financial decisions and spending strategies in retirement",
    slug: "should-i-spend-or-should-i-save",
    color: "#1e3a5f",
    icon: "DollarSign",
    level: 0,
    orderIndex: 13,
    isOfficial: true
  },
  {
    name: "401Ks, IRAs, & Pensions",
    description: "Retirement account management and planning",
    slug: "401ks-iras-pensions",
    color: "#1e3a5f",
    icon: "PiggyBank",
    level: 0,
    orderIndex: 14,
    isOfficial: true
  },
  {
    name: "Financial Planning for Retirement",
    description: "Comprehensive financial planning for retirement",
    slug: "financial-planning-for-retirement",
    color: "#1e3a5f",
    icon: "TrendingUp",
    level: 0,
    orderIndex: 15,
    isOfficial: true
  },
  {
    name: "Social Security",
    description: "Social Security benefits, claiming strategies, and questions",
    slug: "social-security",
    color: "#1e3a5f",
    icon: "Shield",
    level: 0,
    orderIndex: 16,
    isOfficial: true
  },
  {
    name: "Wills, Trusts, & Estate Planning",
    description: "Estate planning, wills, trusts, and legacy planning",
    slug: "wills-trusts-estate-planning",
    color: "#1e3a5f",
    icon: "FileText",
    level: 0,
    orderIndex: 17,
    isOfficial: true
  },
  {
    name: "Accessory Dwelling Units",
    description: "ADUs, granny flats, and multi-generational housing",
    slug: "accessory-dwelling-units",
    color: "#1e3a5f",
    icon: "Home",
    level: 0,
    orderIndex: 18,
    isOfficial: true
  },
  {
    name: "Home Modifications",
    description: "Home modifications for aging in place",
    slug: "home-modifications",
    color: "#1e3a5f",
    icon: "Wrench",
    level: 0,
    orderIndex: 19,
    isOfficial: true
  },
  {
    name: "Buying & Selling a Home",
    description: "Real estate decisions in retirement",
    slug: "buying-selling-a-home",
    color: "#1e3a5f",
    icon: "Building",
    level: 0,
    orderIndex: 20,
    isOfficial: true
  },
  {
    name: "Empty Nest Decisions",
    description: "Decisions and adjustments when children leave home",
    slug: "empty-nest-decisions",
    color: "#1e3a5f",
    icon: "Home",
    level: 0,
    orderIndex: 21,
    isOfficial: true
  },
  {
    name: "Retirement & Senior Living Communities",
    description: "Retirement communities and senior living options",
    slug: "retirement-senior-living-communities",
    color: "#1e3a5f",
    icon: "Building2",
    level: 0,
    orderIndex: 22,
    isOfficial: true
  },
  {
    name: "Career Changes & Semi-Retirement",
    description: "Transitioning careers or working part-time in retirement",
    slug: "career-changes-semi-retirement",
    color: "#1e3a5f",
    icon: "Briefcase",
    level: 0,
    orderIndex: 23,
    isOfficial: true
  },
  {
    name: "Entrepreneurship in Retirement",
    description: "Starting businesses and ventures in retirement",
    slug: "entrepreneurship-in-retirement",
    color: "#1e3a5f",
    icon: "Lightbulb",
    level: 0,
    orderIndex: 24,
    isOfficial: true
  },
  {
    name: "Gig Life",
    description: "Gig work, freelancing, and flexible work in retirement",
    slug: "gig-life",
    color: "#1e3a5f",
    icon: "Briefcase",
    level: 0,
    orderIndex: 25,
    isOfficial: true
  },
  {
    name: "Grandchildren",
    description: "Grandparenting, relationships with grandchildren",
    slug: "grandchildren",
    color: "#1e3a5f",
    icon: "Heart",
    level: 0,
    orderIndex: 26,
    isOfficial: true
  },
  {
    name: "Family Dynamics",
    description: "Family relationships and dynamics in retirement",
    slug: "family-dynamics",
    color: "#1e3a5f",
    icon: "Users",
    level: 0,
    orderIndex: 27,
    isOfficial: true
  },
  {
    name: "Divorce",
    description: "Divorce and separation in later life",
    slug: "divorce",
    color: "#1e3a5f",
    icon: "Heart",
    level: 0,
    orderIndex: 28,
    isOfficial: true
  },
  {
    name: "Widowhood",
    description: "Support and resources for widows and widowers",
    slug: "widowhood",
    color: "#1e3a5f",
    icon: "Heart",
    level: 0,
    orderIndex: 29,
    isOfficial: true
  },
  {
    name: "General Health",
    description: "General health and wellness in retirement",
    slug: "general-health",
    color: "#1e3a5f",
    icon: "Activity",
    level: 0,
    orderIndex: 30,
    isOfficial: true
  },
  {
    name: "Navigating Medicare",
    description: "Medicare enrollment, coverage, and questions",
    slug: "navigating-medicare",
    color: "#1e3a5f",
    icon: "Shield",
    level: 0,
    orderIndex: 31,
    isOfficial: true
  },
  {
    name: "Navigating Medicaid",
    description: "Medicaid eligibility, benefits, and navigation",
    slug: "navigating-medicaid",
    color: "#1e3a5f",
    icon: "Shield",
    level: 0,
    orderIndex: 32,
    isOfficial: true
  },
  {
    name: "Solo Life",
    description: "Living alone and solo life in retirement",
    slug: "solo-life",
    color: "#1e3a5f",
    icon: "User",
    level: 0,
    orderIndex: 33,
    isOfficial: true
  },
  {
    name: "Travel in Retirement",
    description: "Travel planning, experiences, and tips for retirees",
    slug: "travel-in-retirement",
    color: "#1e3a5f",
    icon: "Plane",
    level: 0,
    orderIndex: 34,
    isOfficial: true
  },
  {
    name: "Taxes and Retirement",
    description: "Tax planning and strategies for retirees",
    slug: "taxes-and-retirement",
    color: "#1e3a5f",
    icon: "Receipt",
    level: 0,
    orderIndex: 35,
    isOfficial: true
  },
  {
    name: "Veteran Retirement & Benefits",
    description: "Veteran benefits, resources, and retirement planning",
    slug: "veteran-retirement-benefits",
    color: "#1e3a5f",
    icon: "Award",
    level: 0,
    orderIndex: 36,
    isOfficial: true
  },

  // Level 1 - Medical & Health subcategories
  {
    name: "Medication Management",
    description: "Questions about medications, dosages, and drug interactions",
    slug: "medication-management",
    color: "#EF4444",
    icon: "Pill",
    level: 1,
    orderIndex: 1,
    isOfficial: true,
    parentSlug: "medical-health"
  },
  {
    name: "Doctor Appointments",
    description: "Managing healthcare visits and communicating with providers",
    slug: "doctor-appointments",
    color: "#EF4444",
    icon: "Calendar",
    level: 1,
    orderIndex: 2,
    isOfficial: true,
    parentSlug: "medical-health"
  },
  {
    name: "Mental Health",
    description: "Depression, anxiety, dementia, and cognitive health",
    slug: "mental-health",
    color: "#EF4444",
    icon: "Brain",
    level: 1,
    orderIndex: 3,
    isOfficial: true,
    parentSlug: "medical-health"
  },
  {
    name: "Chronic Conditions",
    description: "Managing diabetes, heart disease, arthritis, and other conditions",
    slug: "chronic-conditions",
    color: "#EF4444",
    icon: "Activity",
    level: 1,
    orderIndex: 4,
    isOfficial: true,
    parentSlug: "medical-health"
  },

  // Level 1 - Daily Living subcategories
  {
    name: "Personal Care",
    description: "Bathing, dressing, grooming, and personal hygiene",
    slug: "personal-care",
    color: "#10B981",
    icon: "User",
    level: 1,
    orderIndex: 1,
    isOfficial: true,
    parentSlug: "daily-living"
  },
  {
    name: "Meal Planning & Nutrition",
    description: "Cooking, eating challenges, and nutritional needs",
    slug: "meal-nutrition",
    color: "#10B981",
    icon: "Utensils",
    level: 1,
    orderIndex: 2,
    isOfficial: true,
    parentSlug: "daily-living"
  },
  {
    name: "Home Safety & Mobility",
    description: "Fall prevention, assistive devices, and home modifications",
    slug: "home-safety",
    color: "#10B981",
    icon: "Shield",
    level: 1,
    orderIndex: 3,
    isOfficial: true,
    parentSlug: "daily-living"
  },
  {
    name: "Transportation",
    description: "Getting around safely and independently",
    slug: "transportation",
    color: "#10B981",
    icon: "Car",
    level: 1,
    orderIndex: 4,
    isOfficial: true,
    parentSlug: "daily-living"
  },

  // Level 1 - Legal & Financial subcategories
  {
    name: "Estate Planning",
    description: "Wills, trusts, power of attorney, and advance directives",
    slug: "estate-planning",
    color: "#3B82F6",
    icon: "FileText",
    level: 1,
    orderIndex: 1,
    isOfficial: true,
    parentSlug: "legal-financial"
  },
  {
    name: "Insurance & Benefits",
    description: "Medicare, Medicaid, social security, and insurance claims",
    slug: "insurance-benefits",
    color: "#3B82F6",
    icon: "Shield",
    level: 1,
    orderIndex: 2,
    isOfficial: true,
    parentSlug: "legal-financial"
  },
  {
    name: "Financial Planning",
    description: "Budgeting for care, managing finances, and cost concerns",
    slug: "financial-planning",
    color: "#3B82F6",
    icon: "DollarSign",
    level: 1,
    orderIndex: 3,
    isOfficial: true,
    parentSlug: "legal-financial"
  },

  // Level 1 - Self-Care subcategories
  {
    name: "Caregiver Stress",
    description: "Managing burnout, stress, and emotional challenges",
    slug: "caregiver-stress",
    color: "#8B5CF6",
    icon: "Heart",
    level: 1,
    orderIndex: 1,
    isOfficial: true,
    parentSlug: "self-care"
  },
  {
    name: "Support Groups",
    description: "Finding and connecting with other caregivers",
    slug: "support-groups",
    color: "#8B5CF6",
    icon: "Users",
    level: 1,
    orderIndex: 2,
    isOfficial: true,
    parentSlug: "self-care"
  },
  {
    name: "Time for Yourself",
    description: "Finding respite and maintaining your own well-being",
    slug: "time-yourself",
    color: "#8B5CF6",
    icon: "Coffee",
    level: 1,
    orderIndex: 3,
    isOfficial: true,
    parentSlug: "self-care"
  },

  // Level 1 - Care Professionals subcategories
  {
    name: "Accountants",
    description: "Financial accounting and tax professionals",
    slug: "accountants",
    color: "#059669",
    icon: "Calculator",
    level: 1,
    orderIndex: 1,
    isOfficial: true,
    parentSlug: "care-professionals"
  },
  {
    name: "Aging Life Care Professional",
    description: "Geriatric care managers and aging life specialists",
    slug: "aging-life-care",
    color: "#059669",
    icon: "Users",
    level: 1,
    orderIndex: 2,
    isOfficial: true,
    parentSlug: "care-professionals"
  },
  {
    name: "Bill Pay Managers",
    description: "Professional bill payment and financial management services",
    slug: "bill-pay-managers",
    color: "#059669",
    icon: "CreditCard",
    level: 1,
    orderIndex: 3,
    isOfficial: true,
    parentSlug: "care-professionals"
  },
  {
    name: "Certified Senior Advisor",
    description: "Certified professionals specializing in senior care",
    slug: "certified-senior-advisor",
    color: "#059669",
    icon: "Award",
    level: 1,
    orderIndex: 4,
    isOfficial: true,
    parentSlug: "care-professionals"
  },
  {
    name: "Certified Retirement Counselor",
    description: "Professional retirement planning and counseling",
    slug: "certified-retirement-counselor",
    color: "#059669",
    icon: "User",
    level: 1,
    orderIndex: 5,
    isOfficial: true,
    parentSlug: "care-professionals"
  },
  {
    name: "Certified Retirement Financial Advisor",
    description: "Specialized financial advisors for retirement planning",
    slug: "certified-retirement-financial-advisor",
    color: "#059669",
    icon: "TrendingUp",
    level: 1,
    orderIndex: 6,
    isOfficial: true,
    parentSlug: "care-professionals"
  },
  {
    name: "Certified Financial Planner",
    description: "Comprehensive financial planning professionals",
    slug: "certified-financial-planner",
    color: "#059669",
    icon: "PieChart",
    level: 1,
    orderIndex: 7,
    isOfficial: true,
    parentSlug: "care-professionals"
  },
  {
    name: "Elder Law Attorneys",
    description: "Legal professionals specializing in elder law",
    slug: "elder-law-attorneys",
    color: "#059669",
    icon: "Scale",
    level: 1,
    orderIndex: 8,
    isOfficial: true,
    parentSlug: "care-professionals"
  },
  {
    name: "Fiduciaries & Trustees",
    description: "Trust and fiduciary management professionals",
    slug: "fiduciaries-trustees",
    color: "#059669",
    icon: "Shield",
    level: 1,
    orderIndex: 9,
    isOfficial: true,
    parentSlug: "care-professionals"
  },
  {
    name: "Home Health Care Aides",
    description: "In-home care providers and health aides",
    slug: "home-health-care-aides",
    color: "#059669",
    icon: "Heart",
    level: 1,
    orderIndex: 10,
    isOfficial: true,
    parentSlug: "care-professionals"
  },
  {
    name: "Senior Living Placement Advisors",
    description: "Specialists helping with senior living transitions",
    slug: "senior-living-placement-advisors",
    color: "#059669",
    icon: "Home",
    level: 1,
    orderIndex: 11,
    isOfficial: true,
    parentSlug: "care-professionals"
  },
  {
    name: "Senior Real Estate Specialists (SRES)",
    description: "Real estate professionals specializing in senior transactions",
    slug: "senior-real-estate-specialists",
    color: "#059669",
    icon: "Building",
    level: 1,
    orderIndex: 12,
    isOfficial: true,
    parentSlug: "care-professionals"
  },
  {
    name: "Social Workers",
    description: "Licensed social workers and case managers",
    slug: "social-workers",
    color: "#059669",
    icon: "Users",
    level: 1,
    orderIndex: 13,
    isOfficial: true,
    parentSlug: "care-professionals"
  },
  {
    name: "Long-Term Care Insurance Claims Assistance",
    description: "Specialists helping with long-term care insurance claims",
    slug: "ltc-insurance-claims",
    color: "#059669",
    icon: "FileText",
    level: 1,
    orderIndex: 14,
    isOfficial: true,
    parentSlug: "care-professionals"
  }
];

const defaultAchievements: AchievementSeed[] = [
  // Participation achievements
  {
    name: "Welcome to the Community",
    description: "You've joined our caregiving community!",
    icon: "👋",
    category: "participation",
    points: 5,
    requirements: "Sign up for an account"
  },
  {
    name: "First Post",
    description: "You made your first post to help start a conversation!",
    icon: "📝",
    category: "participation",
    points: 10,
    requirements: "Create your first post"
  },
  {
    name: "Conversation Starter",
    description: "You're great at getting discussions going!",
    icon: "💬",
    category: "participation",
    points: 50,
    requirements: "Create 10 posts"
  },
  {
    name: "Community Regular",
    description: "You're a valued member of our community!",
    icon: "⭐",
    category: "participation",
    points: 100,
    requirements: "Create 25 posts"
  },

  // Helpfulness achievements
  {
    name: "Helpful Contributor",
    description: "Your posts are helping other caregivers!",
    icon: "👍",
    category: "helpfulness",
    points: 25,
    requirements: "Receive 10 upvotes"
  },
  {
    name: "Trusted Advisor",
    description: "People really value your advice and insights!",
    icon: "🌟",
    category: "helpfulness",
    points: 75,
    requirements: "Receive 50 upvotes"
  },
  {
    name: "Expert Helper",
    description: "You're a go-to source for caregiving wisdom!",
    icon: "🏆",
    category: "helpfulness",
    points: 150,
    requirements: "Receive 100 upvotes"
  },
  {
    name: "Community Hero",
    description: "Your contributions make a real difference!",
    icon: "🦸",
    category: "helpfulness",
    points: 300,
    requirements: "Receive 250 upvotes"
  },

  // Engagement achievements
  {
    name: "Good Listener",
    description: "You take time to read and engage with others!",
    icon: "👂",
    category: "engagement",
    points: 15,
    requirements: "Comment on 10 posts"
  },
  {
    name: "Active Participant",
    description: "You're actively engaged in community discussions!",
    icon: "💪",
    category: "engagement",
    points: 40,
    requirements: "Comment on 50 posts"
  },
  {
    name: "Discussion Champion",
    description: "You keep conversations alive and meaningful!",
    icon: "🗣️",
    category: "engagement",
    points: 80,
    requirements: "Comment on 100 posts"
  },

  // Leadership achievements
  {
    name: "Community Builder",
    description: "You created a forum to bring people together!",
    icon: "🏗️",
    category: "leadership",
    points: 100,
    requirements: "Create a community forum"
  },
  {
    name: "Forum Leader",
    description: "You're actively managing and growing your forum!",
    icon: "👑",
    category: "leadership",
    points: 200,
    requirements: "Have 50 posts in your created forums"
  },

  // Special achievements
  {
    name: "Early Supporter",
    description: "You joined during our early days!",
    icon: "🌱",
    category: "special",
    points: 50,
    requirements: "Join during beta period"
  },
  {
    name: "One Year Strong",
    description: "You've been part of our community for a full year!",
    icon: "🎂",
    category: "special",
    points: 100,
    requirements: "Active for 365 days"
  }
];

export async function seedDatabase() {
  console.log("Starting database seeding...");

  try {
    // 1. Seed Achievements
    console.log("Seeding achievements...");
    for (const achievement of defaultAchievements) {
      const existing = await db
        .select()
        .from(achievements)
        .where(eq(achievements.name, achievement.name))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(achievements).values({
          ...achievement,
          createdAt: new Date()
        });
        console.log(`  Created achievement: ${achievement.name}`);
      }
    }

    // 2. Seed Categories (in order to handle hierarchy)
    console.log("Seeding categories...");
    
    // First, create all level 0 categories
    const level0Categories = defaultCategories.filter(cat => cat.level === 0);
    for (const category of level0Categories) {
      const existing = await db
        .select()
        .from(categories)
        .where(eq(categories.slug, category.slug))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(categories).values({
          name: category.name,
          description: category.description,
          slug: category.slug,
          color: category.color,
          icon: category.icon,
          postCount: 0,
          parentId: null,
          level: category.level,
          orderIndex: category.orderIndex,
          isOfficial: category.isOfficial,
          createdBy: null,
          createdAt: new Date()
        });
        console.log(`  Created category: ${category.name}`);
      }
    }

    // Then create subcategories
    const subcategories = defaultCategories.filter(cat => cat.level > 0);
    for (const category of subcategories) {
      const existing = await db
        .select()
        .from(categories)
        .where(eq(categories.slug, category.slug))
        .limit(1);

      if (existing.length === 0 && category.parentSlug) {
        // Find parent category
        const parent = await db
          .select()
          .from(categories)
          .where(eq(categories.slug, category.parentSlug))
          .limit(1);

        if (parent.length > 0) {
          await db.insert(categories).values({
            name: category.name,
            description: category.description,
            slug: category.slug,
            color: category.color,
            icon: category.icon,
            postCount: 0,
            parentId: parent[0].id,
            level: category.level,
            orderIndex: category.orderIndex,
            isOfficial: category.isOfficial,
            createdBy: null,
            createdAt: new Date()
          });
          console.log(`  Created subcategory: ${category.name}`);
        }
      }
    }

    // 3. Create a demo user if needed
    console.log("Checking for demo user...");
    const demoUser = await db
      .select()
      .from(users)
      .where(eq(users.username, "demo"))
      .limit(1);

    if (demoUser.length === 0) {
      await db.insert(users).values({
        id: "demo-user-id",
        username: "demo",
        email: "demo@example.com",
        firstName: "Demo",
        lastName: "User",
        communityName: "Demo Caregiver",
        password: "demo-password", // Added placeholder password
        role: "user",
        introduction: "I'm a demo user here to show how the community works!",
        city: "Demo City",
        state: "Demo State",
        reputation: 50,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log("  Created demo user");
    }

    console.log("Database seeding completed successfully!");

  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}

// Function to reset database for testing
export async function resetDatabase() {
  console.log("Resetting database...");
  
  try {
    // Delete in reverse order of dependencies
    await db.delete(userAchievements);
    await db.delete(votes);
    await db.delete(comments);
    await db.delete(posts);
    await db.delete(categories);
    await db.delete(achievements);
    // Don't delete users in case there are real users
    
    console.log("Database reset completed!");
  } catch (error) {
    console.error("Error resetting database:", error);
    throw error;
  }
}

// Function to check database health
export async function checkDatabaseHealth() {
  try {
    const categoriesCount = await db.select({ count: sql`count(*)` }).from(categories);
    const achievementsCount = await db.select({ count: sql`count(*)` }).from(achievements);
    const usersCount = await db.select({ count: sql`count(*)` }).from(users);
    const postsCount = await db.select({ count: sql`count(*)` }).from(posts);
    
    console.log("Database Health Check:");
    console.log(`  Categories: ${categoriesCount[0].count}`);
    console.log(`  Achievements: ${achievementsCount[0].count}`);
    console.log(`  Users: ${usersCount[0].count}`);
    console.log(`  Posts: ${postsCount[0].count}`);
    
    return {
      categories: Number(categoriesCount[0].count),
      achievements: Number(achievementsCount[0].count),
      users: Number(usersCount[0].count),
      posts: Number(postsCount[0].count)
    };
  } catch (error) {
    console.error("Database health check failed:", error);
    throw error;
  }
}

// Run seeding if this file is executed directly (not when imported)
// Check if this file is being run directly vs imported
const isMainModule = import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/') || '') || 
                     process.argv[1]?.includes('seed.ts');

if (isMainModule) {
  const main = async () => {
    try {
      await seedDatabase();
      console.log("Database seeding completed successfully.");
      process.exit(0);
    } catch (error) {
      console.error("Database seeding failed:", error);
      process.exit(1);
    }
  };

  main();
}