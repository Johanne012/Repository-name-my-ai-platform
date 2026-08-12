import { z } from "zod";
import { notifyOwner } from "./notification";
import { getProviderHealth, listAvailableProviders } from "./llm";
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
    const hasAnyLlm =
      env.forge ||
      env.gemini ||
      env.groq ||
      env.openrouter ||
      env.nvidia ||
      env.cerebras ||
      env.mistral ||
      env.githubModels ||
      env.cloudflare;

    const ready = env.database && env.jwt;
    return {
      ok: ready,
      status: ready ? (hasAnyLlm ? "ok" : "degraded") : "degraded",
      service: "agentic-ai",
      version: process.env.npm_package_version || "1.0.0",
      runtime: process.env.VERCEL ? "vercel-serverless" : "node",
      time: new Date().toISOString(),
      env,
      llm: {
        configured: llmProviders.length,
        providers: llmProviders,
      },
    } as const;
  }),

  /** Detailed adaptive ranking + circuit-breaker state for every LLM provider */
  llmHealth: publicProcedure.query(() => {
    return {
      time: new Date().toISOString(),
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
