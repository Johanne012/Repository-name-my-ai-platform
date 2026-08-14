/**
 * Public zero-config HTTP API — no auth, no DATABASE_URL, no API keys required.
 * Powers the live playground and proves the platform runs for real.
 */

import type { Express, Request, Response } from "express";
import { runAgent } from "./agentRunner";
import {
  listMemoryAgents,
  getMemoryAgent,
  createMemoryAgent,
  addMemoryExecution,
  listMemoryExecutions,
} from "./memoryStore";

export function registerPublicApi(app: Express) {
  app.get("/api/public/agents", (_req: Request, res: Response) => {
    res.json({
      ok: true,
      mode: "zero-config",
      agents: listMemoryAgents(),
    });
  });

  app.post("/api/public/agents", (req: Request, res: Response) => {
    const name = String(req.body?.name || "").trim();
    if (!name) {
      res.status(400).json({ ok: false, error: "name is required" });
      return;
    }
    const agent = createMemoryAgent({
      name,
      description: String(req.body?.description || ""),
      systemPrompt: String(
        req.body?.systemPrompt ||
          "أنت وكيل مفيد على منصة AgenticAI. أجب بوضوح.",
      ),
      model: String(req.body?.model || "demo-agent-v1"),
    });
    res.status(201).json({ ok: true, agent });
  });

  app.get("/api/public/executions", (req: Request, res: Response) => {
    const agentId = req.query.agentId ? Number(req.query.agentId) : undefined;
    res.json({
      ok: true,
      executions: listMemoryExecutions(
        Number.isFinite(agentId) ? agentId : undefined,
      ),
    });
  });

  /** Simple chat — the main proof that the platform works */
  app.post("/api/public/chat", async (req: Request, res: Response) => {
    const message = String(req.body?.message || "").trim();
    if (!message) {
      res.status(400).json({ ok: false, error: "message is required" });
      return;
    }

    let agentId = req.body?.agentId != null ? Number(req.body.agentId) : undefined;
    let systemPrompt: string | undefined;

    if (agentId && Number.isFinite(agentId)) {
      const agent = getMemoryAgent(agentId);
      if (agent) systemPrompt = agent.systemPrompt;
    } else {
      const first = listMemoryAgents()[0];
      agentId = first?.id;
      systemPrompt = first?.systemPrompt;
    }

    try {
      const result = await runAgent({
        persist: false,
        input: {
          agentId,
          messages: [{ role: "user", content: message }],
          ...(systemPrompt
            ? {
                context: [
                  {
                    description: "system",
                    value: systemPrompt,
                  },
                ],
              }
            : {}),
        },
      });

      if (agentId) {
        addMemoryExecution({
          agentId,
          input: message,
          output: result.output,
          status: "completed",
          provider: result.provider,
          latencyMs: result.latencyMs,
        });
      }

      res.json({
        ok: true,
        agentId,
        threadId: result.threadId,
        runId: result.runId,
        output: result.output,
        model: result.model,
        provider: result.provider,
        latencyMs: result.latencyMs,
      });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        error: err?.message || "chat failed",
      });
    }
  });
}
