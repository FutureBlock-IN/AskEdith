import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { clerkAuth } from "./middleware/clerkAuth";
import { seedDatabase } from "./seed";
import fs from 'fs';
import path from 'path';

const app = express();

// Add Clerk authentication middleware first
app.use(clerkAuth);

// Special handling for Stripe webhooks - they need raw body
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// General JSON middleware for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Add process error handlers to prevent silent crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

(async () => {
  try {
    // Seed database on startup only if database is empty (first time only)
    try {
      const { storage } = await import("./storage");
      const existingCategories = await storage.getCategories();
      if (existingCategories.length === 0) {
        console.log("Database is empty, seeding initial data...");
        await seedDatabase();
        console.log("✓ Database seeding completed");
      } else {
        console.log(`✓ Database already has ${existingCategories.length} categories, skipping seed`);
      }
    } catch (error) {
      console.error("⚠️  Database seeding check error (continuing anyway):", error);
    }

    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    const isProduction = process.env.NODE_ENV === "production";
    
    // Check if built files exist to force production mode
    const distPublicDir = path.resolve(import.meta.dirname, '..', 'dist', 'public');
    const hasBuiltFiles = fs.existsSync(path.join(distPublicDir, 'index.html'));
    
    // Force production mode if built files exist, even if NODE_ENV isn't set
    // if (!isProduction && !hasBuiltFiles) {
    //   await setupVite(app, server);
    // } else {
    //   console.log(`Serving static files in ${isProduction ? 'production' : 'built'} mode`);
    //   serveStatic(app);
    // }
         // FB Setup 
        if (isProduction) {
      console.log("Serving static files in production mode");
      serveStatic(app);
    } else {
      console.log("Running Vite in development mode");
      await setupVite(app, server);
    }


    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = 5000;
    const host = "0.0.0.0";

    // Use standard Express app.listen() method instead of server.listen()
    app.listen(port, host, () => {
      log(`serving on ${host}:${port}`);
      console.log(`✓ Server successfully started on port ${port}`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})().catch((error) => {
  console.error('Unhandled startup error:', error);
  process.exit(1);
});
