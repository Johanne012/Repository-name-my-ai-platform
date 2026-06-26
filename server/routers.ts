import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { stripeRouter } from "./stripe-routers";

export const appRouter = router({
  system: systemRouter,
  stripe: stripeRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

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
        model: z.string().default("gpt-4-mini"),
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

  subscriptions: router({
    getCurrent: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getUserSubscription(ctx.user.id);
      }),
  }),

  usage: router({
    getCurrent: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getUserUsageTracking(ctx.user.id);
      }),
  }),

  workflows: router({
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        nodes: z.array(z.object({
          agentId: z.number(),
          position: z.object({ x: z.number(), y: z.number() }),
        })),
        edges: z.array(z.object({
          from: z.number(),
          to: z.number(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        return { id: 1, name: input.name, status: "created", userId: ctx.user.id };
      }),
    
    execute: protectedProcedure
      .input(z.object({
        nodes: z.array(z.object({
          agentId: z.number(),
          position: z.object({ x: z.number(), y: z.number() }),
        })),
        edges: z.array(z.object({
          from: z.number(),
          to: z.number(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        return { id: 1, status: "executing", userId: ctx.user.id };
      }),
  }),

  notifications: router({
    list: protectedProcedure
      .query(async ({ ctx }) => {
        const database = await db.getDb();
        if (!database) return [];
        const { notifications } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        return database.select().from(notifications).where(eq(notifications.userId, ctx.user.id)).orderBy(t => t.createdAt).limit(20);
      }),
    
    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const database = await db.getDb();
        if (!database) return null;
        const { notifications } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        return database.update(notifications).set({ read: true }).where(eq(notifications.id, input.id));
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const database = await db.getDb();
        if (!database) return null;
        const { notifications } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        return database.delete(notifications).where(eq(notifications.id, input.id));
      }),
  }),
});

export type AppRouter = typeof appRouter;
