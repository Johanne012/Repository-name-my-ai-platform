# AG-UI Agent Runtime

This platform ships an **AG-UI compatible** agent runtime. Any client that speaks the [AG-UI protocol](https://docs.ag-ui.com) (including the [CopilotKit Channels SDK](https://github.com/CopilotKit/channels-sdk)) can connect to your agents without rewriting them.

## What was implemented

| Piece | Path | Role |
|-------|------|------|
| Event types | `shared/ag-ui.ts` | Protocol events (`RUN_STARTED`, `TEXT_MESSAGE_*`, …) |
| Agent runner | `server/_core/agentRunner.ts` | Loads agent → multi-provider LLM → emits AG-UI events → persists execution |
| HTTP SSE endpoint | `POST /api/ag-ui` | Streaming event stream for Channels SDK / HttpAgent |
| JSON endpoint | `POST /api/ag-ui/run` | Non-streaming convenience |
| tRPC | `agents.run` / `executions.create({ runNow: true })` | In-app execution |

## Endpoints

### Streaming (AG-UI)

```http
POST /api/ag-ui
Content-Type: application/json
Authorization: Bearer <your_platform_api_key>   # optional but recommended

{
  "agentId": 1,
  "threadId": "thread_optional",
  "messages": [
    { "role": "user", "content": "Summarize the last meeting" }
  ]
}
```

Response: `text/event-stream` of AG-UI events, ending with `data: [DONE]`.

### Non-streaming

```http
POST /api/ag-ui/run
Content-Type: application/json
Authorization: Bearer <your_platform_api_key>

{ "agentId": 1, "messages": [{ "role": "user", "content": "Hello" }] }
```

### From the web app (tRPC)

```ts
const result = await trpc.agents.run.mutate({
  agentId: 1,
  message: "Hello",
});
// result.output, result.provider, result.latencyMs, ...
```

## Connecting Channels SDK later (Slack / Teams)

When you are ready to put agents in Slack or Microsoft Teams:

1. Create a free CopilotKit Intelligence key (platform side of Slack/Teams is managed for you).
2. Point Channels SDK at your deployed URL:

```ts
import { createChannel } from "@copilotkit/channels";
import { CopilotRuntime, CopilotKitIntelligence } from "@copilotkit/runtime/v2";

// Your platform already exposes AG-UI at /api/ag-ui
// Use HttpAgent or equivalent that POSTs to that endpoint.

const channel = createChannel({
  name: "agentic-ai-bot",
  identifyUser: "platform",
  agent: /* AG-UI agent pointing to https://YOUR_DOMAIN/api/ag-ui */,
});
```

No change to agent logic, system prompts, or the multi-provider LLM layer is required.

## Auth

- **API key**: create one in the dashboard (`apiKeys.create`). Send as `Authorization: Bearer sk_...`.
- Ownership is enforced: an agent only runs for its owner (or when no key is provided for public/demo use).

## Multi-provider LLM

The runner uses the adaptive multi-provider client (`server/_core/llm.ts`).  
Whichever keys you configured (`GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, …) are used automatically with fallback and self-learning ranking.

## Extending

- Add tools: extend `runAgent` to emit `TOOL_CALL_*` events and execute tool handlers.
- Real token streaming: when a provider supports SSE, pipe chunks directly into `TEXT_MESSAGE_CONTENT` instead of post-chunking the full reply.
- Human-in-the-loop: emit a custom event and pause until an approval message arrives on the same `threadId`.
