/**
 * AG-UI HTTP endpoint
 *
 * POST /api/ag-ui
 * Body: RunAgentInput (JSON)
 * Response: text/event-stream of AG-UI events
 *
 * Optional header: Authorization: Bearer <platform api key>
 * Optional query: ?agentId=123
 *
 * This endpoint is the integration point for:
 * - CopilotKit Channels SDK
 * - Any AG-UI client (HttpAgent)
 * - Custom messaging adapters
 */

import type { Express, Request, Response } from "express";
import { sseEncode, type RunAgentInput } from "../../shared/ag-ui";
import { runAgent } from "./agentRunner";
import { getApiKeyByRawKey } from "../db";

async function resolveUserId(req: Request): Promise<number | undefined> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return undefined;
  const raw = auth.slice(7).trim();
  if (!raw) return undefined;
  try {
    const row = await getApiKeyByRawKey(raw);
    return row?.userId;
  } catch {
    return undefined;
  }
}

export function registerAgUiRoutes(app: Express) {
  app.post("/api/ag-ui", async (req: Request, res: Response) => {
    const userId = await resolveUserId(req);

    // Accept both top-level body and { input: ... } shapes
    const body = (req.body ?? {}) as RunAgentInput & {
      input?: RunAgentInput;
    };
    const input: RunAgentInput = body.input ?? body;

    if (!input.messages || !Array.isArray(input.messages) || input.messages.length === 0) {
      res.status(400).json({
        error: "messages array is required",
      });
      return;
    }

    // agentId from body or query
    if (!input.agentId && req.query.agentId) {
      const n = Number(req.query.agentId);
      if (!Number.isNaN(n)) input.agentId = n;
    }

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const write = (chunk: string) => {
      res.write(chunk);
      // @ts-expect-error flush exists on some Node response types
      if (typeof res.flush === "function") res.flush();
    };

    try {
      await runAgent({
        input,
        userId,
        persist: Boolean(userId && input.agentId),
        onEvent: async (event) => {
          write(sseEncode(event));
        },
      });
    } catch (err: any) {
      // RUN_ERROR already emitted inside runAgent; ensure stream closes cleanly
      if (!res.writableEnded) {
        write(
          sseEncode({
            type: "RUN_ERROR",
            threadId: input.threadId || "unknown",
            runId: input.runId || "unknown",
            message: err?.message || "Agent run failed",
          } as any),
        );
      }
    } finally {
      if (!res.writableEnded) {
        res.write("data: [DONE]\n\n");
        res.end();
      }
    }
  });

  // Simple non-streaming JSON variant (useful for tests / simple clients)
  app.post("/api/ag-ui/run", async (req: Request, res: Response) => {
    const userId = await resolveUserId(req);
    const body = (req.body ?? {}) as RunAgentInput & { input?: RunAgentInput };
    const input: RunAgentInput = body.input ?? body;

    if (!input.messages?.length) {
      res.status(400).json({ error: "messages array is required" });
      return;
    }
    if (!input.agentId && req.query.agentId) {
      const n = Number(req.query.agentId);
      if (!Number.isNaN(n)) input.agentId = n;
    }

    try {
      const result = await runAgent({
        input,
        userId,
        persist: Boolean(userId && input.agentId),
      });
      res.json({
        ok: true,
        threadId: result.threadId,
        runId: result.runId,
        output: result.output,
        model: result.model,
        provider: result.provider,
        latencyMs: result.latencyMs,
        tokensUsed: result.tokensUsed,
        executionId: result.executionId,
      });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        error: err?.message || "Agent run failed",
      });
    }
  });
}
