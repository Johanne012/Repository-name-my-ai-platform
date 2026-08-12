import { z } from "zod";
import { notifyOwner } from "./notification";
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
    const ready = env.database && env.jwt;
    return {
      ok: ready,
      status: ready ? "ok" : "degraded",
      service: "agentic-ai",
      version: process.env.npm_package_version || "1.0.0",
      runtime: process.env.VERCEL ? "vercel-serverless" : "node",
      time: new Date().toISOString(),
      env,
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
