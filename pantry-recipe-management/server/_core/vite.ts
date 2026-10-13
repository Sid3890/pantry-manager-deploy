import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export async function setupVite(app: Express, server: Server) {
  const projectRoot = path.resolve(import.meta.dirname, "../..");
  const viteConfig = {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_APP_ID': JSON.stringify(process.env.VITE_APP_ID || process.env.MANUS_PROJECT_ID || ''),
      'import.meta.env.VITE_OAUTH_PORTAL_URL': JSON.stringify(process.env.VITE_OAUTH_PORTAL_URL || process.env.MANUS_OAUTH_PORTAL_URL || ''),
    },
    root: path.resolve(projectRoot, "client"),
    resolve: {
      alias: {
        "@": path.resolve(projectRoot, "client", "src"),
        "@shared": path.resolve(projectRoot, "shared"),
        "@assets": path.resolve(projectRoot, "attached_assets"),
      },
    },
  };
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const candidates = process.env.NODE_ENV === "development"
    ? [path.resolve(import.meta.dirname, "../..", "dist", "public")]
    : [path.resolve(import.meta.dirname, "public"), path.resolve(import.meta.dirname, "../..", "dist", "public")];
  const distPath = candidates.find(candidate => fs.existsSync(candidate)) ?? candidates[0];
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
