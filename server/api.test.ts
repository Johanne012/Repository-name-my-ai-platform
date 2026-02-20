import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

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
          model: "gpt-4.1-mini",
        });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.message).toContain("Too small");
      }
    });

    it("should create agent with valid data", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.agents.create({
        name: "Test Agent",
        description: "A test agent",
        systemPrompt: "You are a helpful assistant",
        model: "gpt-4.1-mini",
      });
      
      expect(result).toBeDefined();
    });
  });

  describe("apiKeys", () => {
    it("should list API keys for user", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.apiKeys.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should create API key with valid name", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.apiKeys.create({
        name: "Test API Key",
      });
      
      expect(result).toBeDefined();
    });

    it("should validate API key name", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);
      
      try {
        await caller.apiKeys.create({
          name: "",
        });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.message).toContain("Too small");
      }
    });
  });

  describe("subscriptions", () => {
    it("should get current subscription", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.subscriptions.getCurrent();
      // Result can be undefined if no subscription exists
      expect(result === undefined || typeof result === "object").toBe(true);
    });
  });

  describe("usage", () => {
    it("should get current usage tracking", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.usage.getCurrent();
      // Result can be undefined if no usage tracking exists
      expect(result === undefined || typeof result === "object").toBe(true);
    });
  });

  describe("executions", () => {
    it("should list executions for agent", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.executions.list({ agentId: 1, limit: 50 });
      expect(Array.isArray(result)).toBe(true);
    });

    it("should create execution with valid data", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.executions.create({
        agentId: 1,
        input: "Test input",
        reactLogs: [],
      });
      
      expect(result).toBeDefined();
    });
  });
});
