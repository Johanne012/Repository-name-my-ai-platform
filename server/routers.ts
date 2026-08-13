import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { generateSecureApiKey } from "./apiKeys";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { runAgent } from "./_core/agentRunner";
import * as db from "./db";
import { stripeRouter } from "./stripe-routers";

export const appRouter = router({
  system: systemRouter,
  stripe: stripeRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  agents: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserAgents(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const agent = await db.getAgentByIdForUser(input.id, ctx.user.id);
        if (!agent) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
        }
        return agent;
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          description: z.string().optional(),
          systemPrompt: z.string().optional(),
          model: z.string().default("gpt-4o-mini"),
          tools: z.any().optional(),
          config: z.any().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        return db.createAgent({
          userId: ctx.user.id,
          ...input,
        });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).max(255).optional(),
          description: z.string().optional(),
          systemPrompt: z.string().optional(),
          status: z.enum(["active", "inactive", "archived"]).optional(),
          tools: z.any().optional(),
          config: z.any().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const result = await db.updateAgentForUser(id, ctx.user.id, data);
        if (result === undefined) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
        }
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.deleteAgentForUser(input.id, ctx.user.id);
        if (result === undefined) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
        }
        return { success: true };
      }),

    /** Run an agent with a user message (uses multi-provider LLM + AG-UI events internally) */
    run: protectedProcedure
      .input(
        z.object({
          agentId: z.number(),
          message: z.string().min(1),
          threadId: z.string().optional(),
          model: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const agent = await db.getAgentByIdForUser(input.agentId, ctx.user.id);
        if (!agent) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
        }
        if (agent.status !== "active") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Agent is not active",
          });
        }

        try {
          const result = await runAgent({
            userId: ctx.user.id,
            persist: true,
            input: {
              agentId: input.agentId,
              threadId: input.threadId,
              model: input.model,
              messages: [{ role: "user", content: input.message }],
            },
          });

          return {
            ok: true as const,
            threadId: result.threadId,
            runId: result.runId,
            output: result.output,
            model: result.model,
            provider: result.provider,
            latencyMs: result.latencyMs,
            tokensUsed: result.tokensUsed,
            executionId: result.executionId,
          };
        } catch (err: any) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: err?.message || "Agent run failed",
          });
        }
      }),
  }),

  executions: router({
    list: protectedProcedure
      .input(
        z.object({
          agentId: z.number(),
          limit: z.number().min(1).max(200).default(50),
        }),
      )
      .query(async ({ ctx, input }) => {
        const rows = await db.getAgentExecutionsForUser(
          input.agentId,
          ctx.user.id,
          input.limit,
        );
        if (rows === null) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
        }
        return rows;
      }),

    create: protectedProcedure
      .input(
        z.object({
          agentId: z.number(),
          input: z.string(),
          reactLogs: z.any().optional(),
          /** When true, immediately run the agent and return the result */
          runNow: z.boolean().optional().default(false),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const agent = await db.getAgentByIdForUser(input.agentId, ctx.user.id);
        if (!agent) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
        }

        if (!input.runNow) {
          return db.createExecution({
            agentId: input.agentId,
            userId: ctx.user.id,
            input: input.input,
            reactLogs: input.reactLogs,
            status: "pending",
          });
        }

        const result = await runAgent({
          userId: ctx.user.id,
          persist: true,
          input: {
            agentId: input.agentId,
            messages: [{ role: "user", content: input.input }],
          },
        });

        return {
          status: "completed",
          output: result.output,
          threadId: result.threadId,
          runId: result.runId,
          model: result.model,
          provider: result.provider,
          latencyMs: result.latencyMs,
          executionId: result.executionId,
        };
      }),
  }),

  apiKeys: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserApiKeysSafe(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(255) }))
      .mutation(async ({ ctx, input }) => {
        const { rawKey, keyPrefix, keyHash } = generateSecureApiKey();
        await db.createApiKey({
          userId: ctx.user.id,
          key: keyHash,
          keyPrefix,
          name: input.name,
          isActive: true,
        });
        return {
          rawKey,
          keyPrefix,
          name: input.name,
          warning: "Save this key now. It will not be shown again.",
        };
      }),

    revoke: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.revokeApiKeyForUser(input.id, ctx.user.id);
        if (!result) {
          throw new TRPCError({ code: "NOT_FOUND", message: "API key not found" });
        }
        return result;
      }),
  }),

  subscriptions: router({
    getCurrent: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserSubscription(ctx.user.id);
    }),
  }),

  usage: router({
    getCurrent: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserUsageTracking(ctx.user.id);
    }),
  }),

  workflows: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserWorkflows(ctx.user.id);
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          description: z.string().optional(),
          nodes: z
            .array(
              z.object({
                agentId: z.number(),
                position: z.object({ x: z.number(), y: z.number() }),
              }),
            )
            .optional(),
          edges: z
            .array(
              z.object({
                from: z.number(),
                to: z.number(),
              }),
            )
            .optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (input.nodes?.length) {
          for (const node of input.nodes) {
            const agent = await db.getAgentByIdForUser(node.agentId, ctx.user.id);
            if (!agent) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Agent ${node.agentId} not found or not owned by you`,
              });
            }
          }
        }

        await db.createWorkflow({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          agents: input.nodes ?? [],
          config: { edges: input.edges ?? [] },
          status: "active",
        });

        return { success: true, name: input.name };
      }),

    execute: protectedProcedure
      .input(
        z.object({
          nodes: z.array(
            z.object({
              agentId: z.number(),
              position: z.object({ x: z.number(), y: z.number() }),
            }),
          ),
          edges: z.array(
            z.object({
              from: z.number(),
              to: z.number(),
            }),
          ),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        for (const node of input.nodes) {
          const agent = await db.getAgentByIdForUser(node.agentId, ctx.user.id);
          if (!agent) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Agent ${node.agentId} not found or not owned by you`,
            });
          }
        }
        return {
          status: "accepted",
          message:
            "Workflow execution accepted. Full multi-agent runtime is not implemented yet.",
          userId: ctx.user.id,
          nodeCount: input.nodes.length,
        };
      }),
  }),

  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const database = await db.getDb();
      if (!database) return [];
      const { notifications } = await import("../drizzle/schema");
      const { eq, desc } = await import("drizzle-orm");
      return database
        .select()
        .from(notifications)
        .where(eq(notifications.userId, ctx.user.id))
        .orderBy(desc(notifications.createdAt))
        .limit(20);
    }),

    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) return null;
        const { notifications } = await import("../drizzle/schema");
        const { and, eq } = await import("drizzle-orm");
        return database
          .update(notifications)
          .set({ read: true })
          .where(
            and(eq(notifications.id, input.id), eq(notifications.userId, ctx.user.id)),
          );
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) return null;
        const { notifications } = await import("../drizzle/schema");
        const { and, eq } = await import("drizzle-orm");
        return database
          .delete(notifications)
          .where(
            and(eq(notifications.id, input.id), eq(notifications.userId, ctx.user.id)),
          );
      }),
  }),
});

export type AppRouter = typeof appRouter;
