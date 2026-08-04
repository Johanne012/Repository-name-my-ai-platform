import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  agents,
  agentExecutions,
  apiKeys,
  subscriptions,
  usageTracking,
  workflows,
  InsertAgent,
  InsertAgentExecution,
  InsertApiKey,
  InsertSubscription,
  InsertUsageTracking,
  InsertWorkflow,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Agent queries
export async function getUserAgents(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agents).where(eq(agents.userId, userId));
}

export async function getAgentById(agentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
  return result[0];
}

/** Get agent only if it belongs to the given user (prevents IDOR). */
export async function getAgentByIdForUser(agentId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.userId, userId)))
    .limit(1);
  return result[0];
}

export async function createAgent(data: InsertAgent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(agents).values(data);
  return result;
}

export async function updateAgent(agentId: number, data: Partial<InsertAgent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(agents).set(data).where(eq(agents.id, agentId));
}

/** Update agent only if owned by user. Returns undefined if not found / not owned. */
export async function updateAgentForUser(
  agentId: number,
  userId: number,
  data: Partial<InsertAgent>,
) {
  const existing = await getAgentByIdForUser(agentId, userId);
  if (!existing) return undefined;
  // Never allow changing ownership via update payload
  const { userId: _uid, id: _id, ...safe } = data as Partial<InsertAgent> & {
    userId?: number;
    id?: number;
  };
  void _uid;
  void _id;
  return updateAgent(agentId, safe);
}

export async function deleteAgent(agentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(agents).where(eq(agents.id, agentId));
}

/** Delete agent only if owned by user. */
export async function deleteAgentForUser(agentId: number, userId: number) {
  const existing = await getAgentByIdForUser(agentId, userId);
  if (!existing) return undefined;
  return deleteAgent(agentId);
}

// Execution queries
export async function getAgentExecutions(agentId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(agentExecutions)
    .where(eq(agentExecutions.agentId, agentId))
    .limit(limit);
}

/** List executions for an agent only if the agent belongs to the user. */
export async function getAgentExecutionsForUser(
  agentId: number,
  userId: number,
  limit = 50,
) {
  const agent = await getAgentByIdForUser(agentId, userId);
  if (!agent) return null;
  return getAgentExecutions(agentId, limit);
}

export async function createExecution(data: InsertAgentExecution) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(agentExecutions).values(data);
}

// API Key queries
export async function getUserApiKeys(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(apiKeys).where(eq(apiKeys.userId, userId));
}

export async function getApiKeyByKey(key: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(apiKeys).where(eq(apiKeys.key, key)).limit(1);
  return result[0];
}

// Subscription queries
export async function getUserSubscription(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  return result[0];
}

// API Key creation
export async function createApiKey(data: InsertApiKey) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(apiKeys).values(data);
}

// Usage tracking queries
export async function getUserUsageTracking(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(usageTracking)
    .where(eq(usageTracking.userId, userId))
    .limit(1);
  return result[0];
}

// Workflow queries
export async function createWorkflow(data: InsertWorkflow) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(workflows).values(data);
  return result;
}

export async function getUserWorkflows(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workflows).where(eq(workflows.userId, userId));
}
