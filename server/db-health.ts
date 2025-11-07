// server/db-health.ts
import 'dotenv/config';
import { db } from "./db";
import { users, posts, comments, categories, achievements, votes } from "@shared/schema";
import { sql } from "drizzle-orm";

async function checkDatabaseHealth() {
  console.log("🔍 Checking database health...");
  console.log("=".repeat(50));

  try {
    // Test basic database connection
    console.log("📡 Testing database connection...");
    await db.execute(sql`SELECT 1`);
    console.log("  ✅ Database connection successful");

    // Count records in each table
    console.log("\n📊 Table record counts:");
    
    const tables = [
      { name: "Users", table: users },
      { name: "Categories", table: categories },
      { name: "Posts", table: posts },
      { name: "Comments", table: comments },
      { name: "Votes", table: votes },
      { name: "Achievements", table: achievements }
    ];

    for (const { name, table } of tables) {
      try {
        const result = await db.select({ count: sql`count(*)` }).from(table);
        const count = Number(result[0].count);
        console.log(`  ${name.padEnd(12)}: ${count.toString().padStart(6)} records`);
      } catch (error) {
        console.log(`  ${name.padEnd(12)}: ❌ Error counting records`);
      }
    }

    // Check for required data
    console.log("\n🔍 Checking required data:");
    
    // Check if we have categories
    const categoryCount = await db.select({ count: sql`count(*)` }).from(categories);
    const catCount = Number(categoryCount[0].count);
    if (catCount > 0) {
      console.log("  ✅ Categories table populated");
    } else {
      console.log("  ⚠️  Categories table is empty - run 'npm run seed'");
    }

    // Check if we have achievements
    const achievementCount = await db.select({ count: sql`count(*)` }).from(achievements);
    const achCount = Number(achievementCount[0].count);
    if (achCount > 0) {
      console.log("  ✅ Achievements table populated");
    } else {
      console.log("  ⚠️  Achievements table is empty - run 'npm run seed'");
    }

    // Check for any users
    const userCount = await db.select({ count: sql`count(*)` }).from(users);
    const usrCount = Number(userCount[0].count);
    if (usrCount > 0) {
      console.log("  ✅ Users table has data");
    } else {
      console.log("  ℹ️  No users yet - this is normal for a new installation");
    }

    console.log("\n🎯 Database Health Summary:");
    console.log("=".repeat(50));
    console.log("✅ Database is healthy and ready for use!");
    
    if (catCount === 0 || achCount === 0) {
      console.log("\n💡 Recommendation: Run 'npm run seed' to populate initial data");
    }

    return {
      status: "healthy",
      users: usrCount,
      categories: catCount,
      posts: Number((await db.select({ count: sql`count(*)` }).from(posts))[0].count),
      comments: Number((await db.select({ count: sql`count(*)` }).from(comments))[0].count),
      achievements: achCount,
      votes: Number((await db.select({ count: sql`count(*)` }).from(votes))[0].count)
    };

  } catch (error) {
    console.error("❌ Database health check failed:", error);
    console.log("\n🚨 Database Issues Detected:");
    console.log("=" * 50);
    console.log("- Check your DATABASE_URL environment variable");
    console.log("- Ensure your database is running");
    console.log("- Run 'npm run db:push' to sync the schema");
    
    return {
      status: "unhealthy",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Run health check
checkDatabaseHealth()
  .then((result) => {
    if (result.status === "healthy") {
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("💥 Health check script failed:", error);
    process.exit(1);
  });