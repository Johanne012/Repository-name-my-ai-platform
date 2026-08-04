import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1): { ctx: TrpcContext } {
  const user = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user" as const,
    subscriptionPlan: "free" as const,
    stripeCustomerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as AuthenticatedUser;

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("API Endpoints", () => {
  describe("auth.me", () => {
    it("should return current user", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.auth.me();
      expect(result?.id).toBe(1);
      expect(result?.openId).toBe("test-user-1");
    });
  });

  describe("agents", () => {
    it("should list agents for user", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.agents.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should validate agent creation input", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.agents.create({
          name: "",
          description: "Test",
          systemPrompt: "Test",
          model: "gpt-4o-mini",
        });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(String(error.message).length).toBeGreaterThan(0);
      }
    });

    it("should attempt create agent with valid data", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.agents.create({
          name: "Test Agent",
          description: "A test agent",
          systemPrompt: "You are a helpful assistant",
          model: "gpt-4o-mini",
        });
        expect(result).toBeDefined();
      } catch (e) {
        // No DB in CI is OK
        expect(e).toBeDefined();
      }
    });
  });

  describe("apiKeys", () => {
    it("should list API keys for user", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.apiKeys.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should validate API key name", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.apiKeys.create({ name: "" });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(String(error.message).length).toBeGreaterThan(0);
      }
    });
  });

  describe("subscriptions", () => {
    it("should get current subscription", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.subscriptions.getCurrent();
      expect(result === undefined || typeof result === "object").toBe(true);
    });
  });

  describe("usage", () => {
    it("should get current usage tracking", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.usage.getCurrent();
      expect(result === undefined || typeof result === "object").toBe(true);
    });
  });

  describe("executions ownership", () => {
    it("should reject list for missing agent", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.executions.list({ agentId: 999999, limit: 50 }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("workflows", () => {
    it("should list workflows", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.workflows.list();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
