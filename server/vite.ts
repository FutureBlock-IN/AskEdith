import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      // error: (msg, options) => {
      //   viteLogger.error(msg, options);
      //   process.exit(1);
      // }, // FB Setup
            error: (msg, options) => {
        viteLogger.error(msg, options);
      },

    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

// export function serveStatic(app: Express) {
   
//   const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");

//   if (!fs.existsSync(distPath)) {
//     throw new Error(
//       `Could not find the build directory: ${distPath}, make sure to build the client first`,
//     );
//   }

//   app.use(express.static(distPath));

  
//   app.use("*", (_req, res) => {
//     res.sendFile(path.resolve(distPath, "index.html"));
//   });
// }

// Production static file serving for built React/Vite app
export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find build directory: ${distPath}. Please run 'npm run build' first.`
    );
  }

  // Log which directory is being served
  log(`Static files directory: ${distPath}`);

  // Serve static files from dist/public with caching for assets
  app.use(express.static(distPath, {
    maxAge: "1y", // long cache for versioned assets
    etag: false,  // disable etag for versioned files
  }));

  // SPA fallback: serve index.html for all non-file routes
  app.use("*", (req, res) => {
    // Don't serve index.html for API routes (they should 404 if not handled)
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ message: "API endpoint not found" });
    }

    const indexPath = path.resolve(distPath, "index.html");
    
    if (!fs.existsSync(indexPath)) {
      log(`ERROR: index.html not found at ${indexPath}`);
      return res.status(500).json({ message: "Frontend not built" });
    }

    // Read and serve index.html with proper headers
    fs.readFile(indexPath, "utf-8", (err, data) => {
      if (err) {
        log(`ERROR: Failed to read index.html: ${err.message}`);
        return res.status(500).json({ message: "Failed to load frontend" });
      }

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.status(200).send(data);
    });
  });
}
