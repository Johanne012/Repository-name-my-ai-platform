import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerAgUiRoutes } from "./aguiEndpoint";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { RequestLogger, ErrorHandler } from "../middleware";

function securityHeaders(
  _req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }
  next();
}

function resolvePublicDir(): string {
  const candidates = [
    path.resolve(process.cwd(), "dist", "public"),
    path.resolve(process.cwd(), "public"),
    path.resolve(process.cwd(), "dist"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "index.html"))) {
      return dir;
    }
  }
  return candidates[0];
}

function readiness() {
  return {
    database: Boolean(process.env.DATABASE_URL),
    jwt: Boolean(process.env.JWT_SECRET),
    oauth: Boolean(process.env.OAUTH_SERVER_URL),
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    forge: Boolean(
      process.env.BUILT_IN_FORGE_API_URL && process.env.BUILT_IN_FORGE_API_KEY,
    ),
  };
}

const app = express();

app.disable("x-powered-by");
app.use(securityHeaders);
app.use(RequestLogger.middleware());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ limit: "2mb", extended: true }));

app.get("/health", (_req, res) => {
  const env = readiness();
  const ready = env.database && env.jwt;
  res.status(ready ? 200 : 503).json({
    status: ready ? "ok" : "degraded",
    service: "agentic-ai",
    version: process.env.npm_package_version || "1.0.0",
    time: new Date().toISOString(),
    runtime: process.env.VERCEL ? "vercel-serverless" : "node",
    env,
  });
});

registerOAuthRoutes(app);
registerAgUiRoutes(app);

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

// Production static + SPA fallback (local `pnpm start`; on Vercel CDN serves static)
if (process.env.NODE_ENV === "production" && !process.env.VERCEL) {
  const distPath = resolvePublicDir();
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  } else {
    app.use(express.static(distPath, { index: false }));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api") || req.path === "/health") {
        return next();
      }
      res.sendFile(path.join(distPath, "index.html"), (err) => {
        if (err) next(err);
      });
    });
  }
}

app.use(ErrorHandler.middleware());

export default app;
