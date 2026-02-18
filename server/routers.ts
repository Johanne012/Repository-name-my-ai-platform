import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Agents Management
  agents: router({
    list: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getUserAgents(ctx.user.id);
      }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getAgentById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        systemPrompt: z.string().optional(),
        model: z.string().default("gpt-4.1-mini"),
        tools: z.any().optional(),
        config: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createAgent({
          userId: ctx.user.id,
          ...input,
        });
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        systemPrompt: z.string().optional(),
        status: z.enum(["active", "inactive", "archived"]).optional(),
        tools: z.any().optional(),
        config: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.updateAgent(input.id, input);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteAgent(input.id);
      }),
  }),

  // Agent Executions
  executions: router({
    list: protectedProcedure
      .input(z.object({ agentId: z.number(), limit: z.number().default(50) }))
      .query(async ({ input }) => {
        return db.getAgentExecutions(input.agentId, input.limit);
      }),
    
    create: protectedProcedure
      .input(z.object({
        agentId: z.number(),
        input: z.string(),
        reactLogs: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createExecution({
          agentId: input.agentId,
          userId: ctx.user.id,
          input: input.input,
          reactLogs: input.reactLogs,
          status: "pending",
        });
      }),
  }),

  // API Keys Management
  apiKeys: router({
    list: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getUserApiKeys(ctx.user.id);
      }),
    
    create: protectedProcedure
      .input(z.object({ name: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const key = `sk_${Math.random().toString(36).substr(2, 32)}`;
        return db.createApiKey({
          userId: ctx.user.id,
          key,
          name: input.name,
          isActive: true,
        });
      }),
  }),

  // Subscriptions
  subscriptions: router({
    getCurrent: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getUserSubscription(ctx.user.id);
      }),
  }),

  // Usage Tracking
  usage: router({
    getCurrent: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getUserUsageTracking(ctx.user.id);
      }),
  }),
});

export type AppRouter = typeof appRouter;
