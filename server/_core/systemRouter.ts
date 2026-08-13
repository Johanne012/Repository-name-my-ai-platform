import { z } from "zod";
import { notifyOwner } from "./notification";
import {
  getProviderHealth,
  listAvailableProviders,
  isDemoOnlyMode,
} from "./llm";
import { adminProcedure, publicProcedure, router } from "./trpc";

function readiness() {
  return {
    database: Boolean(process.env.DATABASE_URL),
    jwt: Boolean(process.env.JWT_SECRET),
    oauth: Boolean(process.env.OAUTH_SERVER_URL),
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    forge: Boolean(
      process.env.BUILT_IN_FORGE_API_URL && process.env.BUILT_IN_FORGE_API_KEY,
    ),
    gemini: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
    groq: Boolean(process.env.GROQ_API_KEY),
    openrouter: Boolean(process.env.OPENROUTER_API_KEY),
    nvidia: Boolean(process.env.NVIDIA_API_KEY),
    cerebras: Boolean(process.env.CEREBRAS_API_KEY),
    mistral: Boolean(process.env.MISTRAL_API_KEY),
    githubModels: Boolean(process.env.GITHUB_TOKEN || process.env.GH_TOKEN),
    cloudflare: Boolean(
      process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN,
    ),
    demo: true, // always available
  };
}

export const systemRouter = router({
  health: publicProcedure
    .input(
      z
        .object({
          timestamp: z.number().min(0).optional(),
        })
        .optional(),
    )
    .query(() => ({
      ok: true,
      time: new Date().toISOString(),
    })),

  status: publicProcedure.query(() => {
    const env = readiness();
    const llmProviders = listAvailableProviders();
    const hasAnyRealLlm =
      env.forge ||
      env.gemini ||
      env.groq ||
      env.openrouter ||
      env.nvidia ||
      env.cerebras ||
      env.mistral ||
      env.githubModels ||
      env.cloudflare;

    const demoOnly = isDemoOnlyMode();

    // Platform is operational for agent runs even without DB/JWT/real LLM
    // (demo provider + public AG-UI endpoints).
    const agentRuntimeReady = true;
    const fullStackReady = env.database && env.jwt && hasAnyRealLlm;

    let status: "ok" | "demo" | "degraded" = "ok";
    if (demoOnly) status = "demo";
    else if (!fullStackReady) status = "degraded";

    return {
      ok: agentRuntimeReady,
      status,
      mode: demoOnly ? "demo" : hasAnyRealLlm ? "production-llm" : "partial",
      service: "agentic-ai",
      version: process.env.npm_package_version || "1.0.0",
      runtime: process.env.VERCEL ? "vercel-serverless" : "node",
      time: new Date().toISOString(),
      message: demoOnly
        ? "Running in zero-config Demo mode. Agent endpoints work. Add GEMINI_API_KEY (or other) + DATABASE_URL for full production."
        : fullStackReady
          ? "All systems ready."
          : "LLM configured; database or JWT still missing for full auth/persistence.",
      env,
      llm: {
        configured: llmProviders.length,
        realProviders: llmProviders.filter((p) => p.id !== "demo").length,
        demoOnly,
        providers: llmProviders,
      },
    } as const;
  }),

  /** Detailed adaptive ranking + circuit-breaker state for every LLM provider */
  llmHealth: publicProcedure.query(() => {
    return {
      time: new Date().toISOString(),
      demoOnly: isDemoOnlyMode(),
      providers: getProviderHealth(),
    } as const;
  }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      }),
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
