/**
 * Agent Runner — AG-UI compatible execution engine.
 *
 * Loads an agent from DB (or uses ad-hoc config), calls the multi-provider
 * invokeLLM, emits AG-UI events, and persists execution records.
 *
 * This is the single place Channels SDK / any AG-UI client will talk to.
 */

import { nanoid } from "nanoid";
import {
  EventType,
  type AgUiEvent,
  type RunAgentInput,
  nowTs,
} from "../../shared/ag-ui";
import { invokeLLM, type Message } from "./llm";
import * as db from "../db";

export type AgentRunOptions = {
  input: RunAgentInput;
  /** Authenticated user id (for ownership + execution row) */
  userId?: number;
  /** When true, write/update agentExecutions row */
  persist?: boolean;
  /** Existing execution id to update (optional) */
  executionId?: number;
  /** Callback for each AG-UI event (SSE, websocket, etc.) */
  onEvent?: (event: AgUiEvent) => void | Promise<void>;
};

export type AgentRunResult = {
  threadId: string;
  runId: string;
  output: string;
  model?: string;
  provider?: string;
  latencyMs?: number;
  tokensUsed?: number;
  executionId?: number;
  events: AgUiEvent[];
};

async function emit(
  events: AgUiEvent[],
  event: AgUiEvent,
  onEvent?: AgentRunOptions["onEvent"],
) {
  const full = { ...event, timestamp: event.timestamp ?? nowTs() };
  events.push(full);
  if (onEvent) await onEvent(full);
}

/**
 * Chunk a full text into smaller deltas so AG-UI clients can stream-render
 * even when the underlying provider returns the complete completion at once.
 */
function chunkText(text: string, size = 48): string[] {
  if (!text) return [];
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

export async function runAgent(
  options: AgentRunOptions,
): Promise<AgentRunResult> {
  const { input, userId, persist = false, executionId, onEvent } = options;
  const threadId = input.threadId || `thread_${nanoid(12)}`;
  const runId = input.runId || `run_${nanoid(12)}`;
  const events: AgUiEvent[] = [];
  const startedAt = Date.now();

  await emit(
    events,
    {
      type: EventType.RUN_STARTED,
      threadId,
      runId,
    },
    onEvent,
  );

  let executionRowId = executionId;

  try {
    // Resolve agent config
    let systemPrompt =
      "You are a helpful AI agent running on the AgenticAI platform.";
    let modelOverride = input.model;
    let agentRecord: Awaited<ReturnType<typeof db.getAgentById>> | undefined;

    if (input.agentId) {
      agentRecord = await db.getAgentById(input.agentId);
      if (!agentRecord) {
        throw new Error(`Agent ${input.agentId} not found`);
      }
      if (userId && agentRecord.userId !== userId) {
        throw new Error(`Agent ${input.agentId} not found or not owned by you`);
      }
      if (agentRecord.systemPrompt) {
        systemPrompt = agentRecord.systemPrompt;
      }
      if (!modelOverride && agentRecord.model) {
        modelOverride = agentRecord.model;
      }
    }

    // Persist pending execution
    if (persist && userId && input.agentId) {
      if (!executionRowId) {
        const userMessage =
          input.messages.filter((m) => m.role === "user").pop()?.content ?? "";
        await db.createExecution({
          agentId: input.agentId,
          userId,
          input: userMessage,
          status: "running",
        });
        // Re-fetch latest id is awkward without returning insertId cleanly;
        // we keep executionId optional and update by agent+user later if needed.
      } else {
        // status already set by caller
      }
    }

    await emit(
      events,
      {
        type: EventType.STEP_STARTED,
        stepId: "llm_invoke",
        stepName: "Generate response",
      },
      onEvent,
    );

    // Build messages for multi-provider LLM
    const messages: Message[] = [
      { role: "system", content: systemPrompt },
      ...input.messages.map((m) => ({
        role: m.role as Message["role"],
        content: m.content,
      })),
    ];

    // Context injection
    if (input.context?.length) {
      const ctxText = input.context
        .map((c) => `[${c.description}]: ${c.value}`)
        .join("\n");
      messages.splice(1, 0, {
        role: "system",
        content: `Additional context:\n${ctxText}`,
      });
    }

    const llmResult = await invokeLLM({
      messages,
      model: modelOverride,
    });

    const choice = llmResult.choices?.[0];
    const contentRaw = choice?.message?.content;
    const outputText =
      typeof contentRaw === "string"
        ? contentRaw
        : Array.isArray(contentRaw)
          ? contentRaw
              .map((p) => ("text" in p ? p.text : JSON.stringify(p)))
              .join("")
          : "";

    const messageId = `msg_${nanoid(10)}`;

    await emit(
      events,
      {
        type: EventType.TEXT_MESSAGE_START,
        messageId,
        role: "assistant",
      },
      onEvent,
    );

    for (const delta of chunkText(outputText)) {
      await emit(
        events,
        {
          type: EventType.TEXT_MESSAGE_CONTENT,
          messageId,
          delta,
        },
        onEvent,
      );
    }

    await emit(
      events,
      {
        type: EventType.TEXT_MESSAGE_END,
        messageId,
      },
      onEvent,
    );

    await emit(
      events,
      {
        type: EventType.STEP_FINISHED,
        stepId: "llm_invoke",
      },
      onEvent,
    );

    const latencyMs = Date.now() - startedAt;
    const tokensUsed = llmResult.usage?.total_tokens;

    // Update execution if we can
    if (persist && userId && input.agentId) {
      try {
        const database = await db.getDb();
        if (database) {
          const { agentExecutions } = await import("../../drizzle/schema");
          const { eq, and, desc } = await import("drizzle-orm");
          // Update the most recent running/pending execution for this agent+user
          const recent = await database
            .select()
            .from(agentExecutions)
            .where(
              and(
                eq(agentExecutions.agentId, input.agentId),
                eq(agentExecutions.userId, userId),
              ),
            )
            .orderBy(desc(agentExecutions.createdAt))
            .limit(1);
          if (recent[0]) {
            executionRowId = recent[0].id;
            await database
              .update(agentExecutions)
              .set({
                output: outputText,
                status: "completed",
                executionTime: latencyMs,
                tokensUsed: tokensUsed ?? null,
                completedAt: new Date(),
                reactLogs: {
                  provider: llmResult._provider,
                  model: llmResult.model,
                  eventsCount: events.length,
                },
              })
              .where(eq(agentExecutions.id, recent[0].id));
          }
        }
      } catch (persistErr) {
        console.warn("[agentRunner] failed to persist execution result", persistErr);
      }
    }

    await emit(
      events,
      {
        type: EventType.RUN_FINISHED,
        threadId,
        runId,
        result: {
          output: outputText,
          model: llmResult.model,
          provider: llmResult._provider,
          latencyMs,
          tokensUsed,
        },
      },
      onEvent,
    );

    return {
      threadId,
      runId,
      output: outputText,
      model: llmResult.model,
      provider: llmResult._provider,
      latencyMs,
      tokensUsed,
      executionId: executionRowId,
      events,
    };
  } catch (err: any) {
    const message = err?.message || String(err);
    await emit(
      events,
      {
        type: EventType.RUN_ERROR,
        threadId,
        runId,
        message,
        code: err?.code || "AGENT_RUN_FAILED",
      },
      onEvent,
    );

    if (persist && userId && input.agentId) {
      try {
        const database = await db.getDb();
        if (database) {
          const { agentExecutions } = await import("../../drizzle/schema");
          const { eq, and, desc } = await import("drizzle-orm");
          const recent = await database
            .select()
            .from(agentExecutions)
            .where(
              and(
                eq(agentExecutions.agentId, input.agentId),
                eq(agentExecutions.userId, userId),
              ),
            )
            .orderBy(desc(agentExecutions.createdAt))
            .limit(1);
          if (recent[0]) {
            await database
              .update(agentExecutions)
              .set({
                status: "failed",
                output: message,
                executionTime: Date.now() - startedAt,
                completedAt: new Date(),
              })
              .where(eq(agentExecutions.id, recent[0].id));
          }
        }
      } catch {
        /* ignore */
      }
    }

    throw err;
  }
}
