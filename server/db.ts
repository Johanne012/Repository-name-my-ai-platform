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
  InsertWorkflow,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { hashApiKey } from "./apiKeys";

let _db: ReturnType<typeof drizzle> | null = null;

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
  return db.insert(agents).values(data);
}

export async function updateAgent(agentId: number, data: Partial<InsertAgent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(agents).set(data).where(eq(agents.id, agentId));
}

export async function updateAgentForUser(
  agentId: number,
  userId: number,
  data: Partial<InsertAgent>,
) {
  const existing = await getAgentByIdForUser(agentId, userId);
  if (!existing) return undefined;
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

export async function deleteAgentForUser(agentId: number, userId: number) {
  const existing = await getAgentByIdForUser(agentId, userId);
  if (!existing) return undefined;
  return deleteAgent(agentId);
}

export async function getAgentExecutions(agentId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(agentExecutions)
    .where(eq(agentExecutions.agentId, agentId))
    .limit(limit);
}

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

/** List API keys for UI — never expose full hash as if it were the raw key. */
export async function getUserApiKeysSafe(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(apiKeys).where(eq(apiKeys.userId, userId));
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    keyPrefix: row.keyPrefix || "sk_****",
    isActive: row.isActive,
    createdAt: row.createdAt,
    lastUsed: row.lastUsed,
    expiresAt: row.expiresAt,
  }));
}

export async function getApiKeyByRawKey(rawKey: string) {
  const db = await getDb();
  if (!db) return undefined;
  const keyHash = hashApiKey(rawKey);
  const result = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.key, keyHash), eq(apiKeys.isActive, true)))
    .limit(1);
  return result[0];
}

/** @deprecated use getApiKeyByRawKey — looks up by hash */
export async function getApiKeyByKey(key: string) {
  return getApiKeyByRawKey(key);
}

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

export async function createApiKey(data: InsertApiKey) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(apiKeys).values(data);
}

export async function revokeApiKeyForUser(keyId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)))
    .limit(1);
  if (!existing[0]) return undefined;
  await db
    .update(apiKeys)
    .set({ isActive: false })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)));
  return { success: true };
}

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

export async function createWorkflow(data: InsertWorkflow) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(workflows).values(data);
}

export async function getUserWorkflows(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workflows).where(eq(workflows.userId, userId));
}
