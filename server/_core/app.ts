import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerAgUiRoutes } from "./aguiEndpoint";
import { registerPublicApi } from "./publicApi";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { RequestLogger, ErrorHandler } from "../middleware";
import { isDemoOnlyMode } from "./llm";

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

const app = express();

app.disable("x-powered-by");
app.use(securityHeaders);
app.use(RequestLogger.middleware());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ limit: "2mb", extended: true }));

// Always healthy in zero-config mode — platform is usable without secrets
app.get("/health", (_req, res) => {
  const demoOnly = isDemoOnlyMode();
  const hasDb = Boolean(process.env.DATABASE_URL);
  const hasJwt = Boolean(process.env.JWT_SECRET);
  res.status(200).json({
    status: demoOnly ? "demo" : hasDb && hasJwt ? "ok" : "partial",
    ok: true,
    service: "agentic-ai",
    version: process.env.npm_package_version || "1.0.0",
    time: new Date().toISOString(),
    runtime: process.env.VERCEL ? "vercel-serverless" : "node",
    zeroConfig: demoOnly || !hasDb,
    publicApi: ["/api/public/chat", "/api/public/agents", "/api/ag-ui/run"],
  });
});

registerOAuthRoutes(app);
registerAgUiRoutes(app);
registerPublicApi(app);

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

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
