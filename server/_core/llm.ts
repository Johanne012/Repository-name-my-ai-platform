/**
 * Multi-provider LLM client with adaptive fallback + self-learning ranking.
 *
 * Design goals:
 * - Add / remove providers by config only (no code change required for most cases)
 * - Enable / disable at runtime via env or temporary circuit-breaker
 * - Automatic error classification → skip / retry / disable temporarily
 * - Learn from success / latency / failure rates and reorder providers continuously
 * - Backward-compatible with the original Manus forge endpoint
 * - Built-in "demo" provider so the platform works with ZERO external keys
 */

import { ENV } from "./env";

// ---------------------------------------------------------------------------
// Public types (kept compatible with previous API)
// ---------------------------------------------------------------------------

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = { type: "text"; text: string };
export type ImageContent = {
  type: "image_url";
  image_url: { url: string; detail?: "auto" | "low" | "high" };
};
export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?:
      | "audio/mpeg"
      | "audio/wav"
      | "application/pdf"
      | "audio/mp4"
      | "video/mp4";
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: { name: string };
};
export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};
export type OutputSchema = JsonSchema;
export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  /** Force a specific provider id (optional) */
  provider?: string;
  /** Preferred model override (optional) */
  model?: string;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  /** Extra metadata added by our multi-provider layer */
  _provider?: string;
  _latencyMs?: number;
};

// ---------------------------------------------------------------------------
// Provider definition (declarative — add a new one here)
// ---------------------------------------------------------------------------

type ProviderId =
  | "demo"
  | "forge"
  | "gemini"
  | "groq"
  | "openrouter"
  | "nvidia"
  | "cerebras"
  | "mistral"
  | "github"
  | "cloudflare";

type ProviderConfig = {
  id: ProviderId;
  name: string;
  /** Whether the provider is currently enabled (env key present + not circuit-broken) */
  enabled: boolean;
  /** Base OpenAI-compatible URL (or special handler) */
  baseUrl: string;
  apiKey: string;
  /** Default model to use when caller does not specify one */
  defaultModel: string;
  /** Extra headers if needed */
  headers?: Record<string, string>;
  /** Priority weight used as initial ranking (higher = preferred) */
  baseScore: number;
  /** Local / offline handler — no network */
  local?: boolean;
  /** Special request adapter (optional) */
  adaptRequest?: (payload: Record<string, unknown>) => Record<string, unknown>;
  /** Special response adapter (optional) */
  adaptResponse?: (raw: unknown) => InvokeResult;
};

// ---------------------------------------------------------------------------
// Adaptive ranking / circuit-breaker state (in-memory, learns per instance)
// ---------------------------------------------------------------------------

type ProviderStats = {
  successes: number;
  failures: number;
  totalLatencyMs: number;
  lastSuccessAt: number;
  lastFailureAt: number;
  consecutiveFailures: number;
  /** Temporary disable until this timestamp (circuit breaker) */
  disabledUntil: number;
};

const stats = new Map<ProviderId, ProviderStats>();

function getStats(id: ProviderId): ProviderStats {
  let s = stats.get(id);
  if (!s) {
    s = {
      successes: 0,
      failures: 0,
      totalLatencyMs: 0,
      lastSuccessAt: 0,
      lastFailureAt: 0,
      consecutiveFailures: 0,
      disabledUntil: 0,
    };
    stats.set(id, s);
  }
  return s;
}

function recordSuccess(id: ProviderId, latencyMs: number) {
  const s = getStats(id);
  s.successes += 1;
  s.totalLatencyMs += latencyMs;
  s.lastSuccessAt = Date.now();
  s.consecutiveFailures = 0;
  if (s.disabledUntil > 0 && Date.now() > s.disabledUntil) {
    s.disabledUntil = 0;
  }
}

function recordFailure(id: ProviderId, isRateLimitOrTransient: boolean) {
  const s = getStats(id);
  s.failures += 1;
  s.lastFailureAt = Date.now();
  s.consecutiveFailures += 1;

  if (s.consecutiveFailures >= 3) {
    const cooldownMs = isRateLimitOrTransient ? 60_000 : 30_000;
    s.disabledUntil = Date.now() + cooldownMs;
  }
}

/** Dynamic score used for ordering (higher is better) */
function dynamicScore(cfg: ProviderConfig): number {
  const s = getStats(cfg.id);
  if (s.disabledUntil > Date.now()) return -Infinity;

  const total = s.successes + s.failures;
  const successRate = total === 0 ? 0.85 : s.successes / total;
  const avgLatency =
    s.successes === 0 ? 2500 : s.totalLatencyMs / s.successes;

  const latencyScore = Math.max(0, 5000 - avgLatency) / 5000;
  return cfg.baseScore * 0.4 + successRate * 40 + latencyScore * 20;
}

// ---------------------------------------------------------------------------
// Built-in DEMO provider (zero external dependencies)
// ---------------------------------------------------------------------------

function extractLastUserText(messages: unknown): string {
  if (!Array.isArray(messages)) return "";
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i] as { role?: string; content?: unknown };
    if (m?.role !== "user") continue;
    const c = m.content;
    if (typeof c === "string") return c;
    if (Array.isArray(c)) {
      return c
        .map((p) =>
          typeof p === "string"
            ? p
            : p && typeof p === "object" && "text" in p
              ? String((p as { text: string }).text)
              : "",
        )
        .join(" ");
    }
  }
  return "";
}

function buildDemoReply(userText: string, systemHint: string): string {
  const q = (userText || "").trim();
  const lower = q.toLowerCase();

  // Arabic / English keyword responses for a usable demo experience
  if (!q) {
    return (
      "مرحباً! أنا وكيل العرض التوضيحي (Demo Agent) على منصة AgenticAI.\n" +
      "المنصة تعمل الآن بدون مفاتيح خارجية. أضف GEMINI_API_KEY أو GROQ_API_KEY في Vercel لتفعيل نماذج حقيقية.\n\n" +
      "Hello! I'm the built-in Demo Agent. The platform is live with zero external keys. " +
      "Add a real LLM key in Vercel env to unlock production models."
    );
  }

  if (
    lower.includes("health") ||
    lower.includes("status") ||
    q.includes("صحة") ||
    q.includes("حالة")
  ) {
    return (
      "✅ النظام في وضع Demo ويعمل.\n" +
      "- LLM: demo (محلي، بدون API)\n" +
      "- AG-UI: /api/ag-ui و /api/ag-ui/run متاحان\n" +
      "- عند إضافة مفتاح حقيقي يتم التبديل تلقائياً مع fallback ذكي.\n\n" +
      "System is healthy in Demo mode. Real providers activate automatically when keys are set."
    );
  }

  if (
    lower.includes("who are you") ||
    lower.includes("what are you") ||
    q.includes("من أنت") ||
    q.includes("ما أنت")
  ) {
    return (
      "أنا الوكيل التجريبي المدمج في منصة AgenticAI.\n" +
      "أدعم بروتوكول AG-UI، التشغيل متعدد المزودين، والدوائر الكهربائية (circuit breaker) والتعلم من الأداء.\n" +
      "حالياً أرد محلياً لأن لا يوجد مفتاح LLM مُعدّ."
    );
  }

  if (lower.includes("help") || q.includes("مساعدة") || q.includes("ساعدني")) {
    return (
      "يمكنك:\n" +
      "1) إرسال رسالة هنا — سأرد فوراً (وضع Demo)\n" +
      "2) استدعاء POST /api/ag-ui/run مع { messages: [{ role: 'user', content: '...' }] }\n" +
      "3) إضافة مفتاح مجاني (Gemini / Groq / OpenRouter) في متغيرات Vercel للردود الحقيقية\n" +
      "4) مراجعة /api/trpc/system.status و system.llmHealth"
    );
  }

  // Generic contextual echo with structure
  const preview = q.length > 280 ? q.slice(0, 280) + "…" : q;
  const sys =
    systemHint && systemHint.length > 20
      ? `\n\n(سياق النظام: ${systemHint.slice(0, 120)}${systemHint.length > 120 ? "…" : ""})`
      : "";

  return (
    `📦 **Demo Agent** (لا مفتاح خارجي)\n\n` +
    `فهمت طلبك:\n> ${preview}\n\n` +
    `هذا رد تجريبي من المنصة لإثبات أن مسار الوكيل + AG-UI يعمل بالكامل. ` +
    `بمجرد ضبط مفتاح LLM حقيقي (مثل GEMINI_API_KEY) سيتولى مزود حقيقي الرد مع نفس الواجهة والـ fallback الذكي.` +
    sys +
    `\n\n— AgenticAI · provider=demo`
  );
}

function runDemoProvider(payload: Record<string, unknown>): InvokeResult {
  const messages = payload.messages;
  const userText = extractLastUserText(messages);
  let systemHint = "";
  if (Array.isArray(messages)) {
    for (const m of messages as Array<{ role?: string; content?: unknown }>) {
      if (m.role === "system") {
        systemHint =
          typeof m.content === "string"
            ? m.content
            : JSON.stringify(m.content ?? "");
        break;
      }
    }
  }

  const text = buildDemoReply(userText, systemHint);
  const id = `demo-${Date.now().toString(36)}`;

  return {
    id,
    created: Math.floor(Date.now() / 1000),
    model: "demo-agent-v1",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: text },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: Math.ceil((userText.length || 1) / 4),
      completion_tokens: Math.ceil(text.length / 4),
      total_tokens: Math.ceil(((userText.length || 1) + text.length) / 4),
    },
    _provider: "demo",
  };
}

// ---------------------------------------------------------------------------
// Provider registry (easy to extend)
// ---------------------------------------------------------------------------

function buildProviders(): ProviderConfig[] {
  const providers: ProviderConfig[] = [];

  // 0. Always-available local demo (lowest base score — used only as last resort
  //    unless no other provider is configured)
  providers.push({
    id: "demo",
    name: "Built-in Demo (zero-config)",
    enabled: true,
    baseUrl: "local://demo",
    apiKey: "demo",
    defaultModel: "demo-agent-v1",
    baseScore: 5,
    local: true,
  });

  // 1. Legacy Manus forge
  if (ENV.forgeApiKey) {
    const base =
      ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
        ? ENV.forgeApiUrl.replace(/\/$/, "")
        : "https://forge.manus.im";
    providers.push({
      id: "forge",
      name: "Manus Forge",
      enabled: true,
      baseUrl: `${base}/v1/chat/completions`,
      apiKey: ENV.forgeApiKey,
      defaultModel: "gemini-2.5-flash",
      baseScore: 100,
    });
  }

  // 2. Google Gemini
  if (ENV.geminiApiKey) {
    providers.push({
      id: "gemini",
      name: "Google Gemini",
      enabled: true,
      baseUrl:
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      apiKey: ENV.geminiApiKey,
      defaultModel: "gemini-2.5-flash",
      baseScore: 95,
    });
  }

  // 3. Groq
  if (ENV.groqApiKey) {
    providers.push({
      id: "groq",
      name: "Groq",
      enabled: true,
      baseUrl: "https://api.groq.com/openai/v1/chat/completions",
      apiKey: ENV.groqApiKey,
      defaultModel: "llama-3.3-70b-versatile",
      baseScore: 90,
    });
  }

  // 4. OpenRouter
  if (ENV.openRouterApiKey) {
    providers.push({
      id: "openrouter",
      name: "OpenRouter",
      enabled: true,
      baseUrl: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: ENV.openRouterApiKey,
      defaultModel: "openrouter/auto",
      headers: {
        "HTTP-Referer":
          "https://github.com/Johanne012/Repository-name-my-ai-platform",
        "X-Title": "AgenticAI Platform",
      },
      baseScore: 85,
    });
  }

  // 5. NVIDIA NIM
  if (ENV.nvidiaApiKey) {
    providers.push({
      id: "nvidia",
      name: "NVIDIA NIM",
      enabled: true,
      baseUrl: "https://integrate.api.nvidia.com/v1/chat/completions",
      apiKey: ENV.nvidiaApiKey,
      defaultModel: "meta/llama-3.3-70b-instruct",
      baseScore: 80,
    });
  }

  // 6. Cerebras
  if (ENV.cerebrasApiKey) {
    providers.push({
      id: "cerebras",
      name: "Cerebras",
      enabled: true,
      baseUrl: "https://api.cerebras.ai/v1/chat/completions",
      apiKey: ENV.cerebrasApiKey,
      defaultModel: "llama-3.3-70b",
      baseScore: 78,
    });
  }

  // 7. Mistral
  if (ENV.mistralApiKey) {
    providers.push({
      id: "mistral",
      name: "Mistral AI",
      enabled: true,
      baseUrl: "https://api.mistral.ai/v1/chat/completions",
      apiKey: ENV.mistralApiKey,
      defaultModel: "mistral-small-latest",
      baseScore: 75,
    });
  }

  // 8. GitHub Models
  if (ENV.githubToken) {
    providers.push({
      id: "github",
      name: "GitHub Models",
      enabled: true,
      baseUrl: "https://models.github.ai/inference/chat/completions",
      apiKey: ENV.githubToken,
      defaultModel: "gpt-4o-mini",
      baseScore: 70,
    });
  }

  // 9. Cloudflare Workers AI
  if (ENV.cloudflareAccountId && ENV.cloudflareApiToken) {
    providers.push({
      id: "cloudflare",
      name: "Cloudflare Workers AI",
      enabled: true,
      baseUrl: `https://api.cloudflare.com/client/v4/accounts/${ENV.cloudflareAccountId}/ai/v1/chat/completions`,
      apiKey: ENV.cloudflareApiToken,
      defaultModel: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      baseScore: 65,
    });
  }

  return providers;
}

/** Returns providers ordered by adaptive score (best first). Demo is last unless alone. */
function getOrderedProviders(forceId?: string): ProviderConfig[] {
  const all = buildProviders().filter((p) => p.enabled);

  if (forceId) {
    const forced = all.find((p) => p.id === forceId);
    return forced ? [forced] : [];
  }

  const real = all.filter((p) => p.id !== "demo");
  const demo = all.filter((p) => p.id === "demo");

  // If at least one real provider exists, use them first; demo only as ultimate fallback
  const pool = real.length > 0 ? [...real, ...demo] : demo;

  const preferred = ENV.llmPreferredOrder
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const scored = pool
    .map((p) => ({ p, score: dynamicScore(p) }))
    .filter((x) => x.score > -Infinity)
    .sort((a, b) => {
      // Demo always last among enabled scores unless it is the only one
      if (a.p.id === "demo" && b.p.id !== "demo") return 1;
      if (b.p.id === "demo" && a.p.id !== "demo") return -1;

      const ai = preferred.indexOf(a.p.id);
      const bi = preferred.indexOf(b.p.id);
      if (ai !== -1 || bi !== -1) {
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      }
      return b.score - a.score;
    });

  return scored.map((x) => x.p);
}

// ---------------------------------------------------------------------------
// Message / payload normalization (shared)
// ---------------------------------------------------------------------------

const ensureArray = (
  value: MessageContent | MessageContent[],
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent,
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") return { type: "text", text: part };
  if (part.type === "text" || part.type === "image_url" || part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map((part) => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");
    return { role, name, tool_call_id, content };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return { role, name, content: contentParts[0].text };
  }
  return { role, name, content: contentParts };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined,
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;
  if (toolChoice === "none" || toolChoice === "auto") return toolChoice;

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error("tool_choice 'required' was provided but no tools were configured");
    }
    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly",
      );
    }
    return { type: "function", function: { name: tools[0].function.name } };
  }

  if ("name" in toolChoice) {
    return { type: "function", function: { name: toolChoice.name } };
  }
  return toolChoice;
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}): ResponseFormat | undefined => {
  const explicit = responseFormat || response_format;
  if (explicit) {
    if (explicit.type === "json_schema" && !explicit.json_schema?.schema) {
      throw new Error("responseFormat json_schema requires a defined schema object");
    }
    return explicit;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return undefined;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

// ---------------------------------------------------------------------------
// Core invoke with fallback + learning
// ---------------------------------------------------------------------------

async function callProvider(
  provider: ProviderConfig,
  payload: Record<string, unknown>,
  timeoutMs: number,
): Promise<InvokeResult> {
  // Local demo — no network
  if (provider.local || provider.id === "demo") {
    return runDemoProvider(payload);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      authorization: `Bearer ${provider.apiKey}`,
      ...(provider.headers ?? {}),
    };

    const finalPayload = provider.adaptRequest
      ? provider.adaptRequest(payload)
      : payload;

    const response = await fetch(provider.baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(finalPayload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      const err = new Error(
        `LLM [${provider.id}] ${response.status} ${response.statusText} – ${errorText.slice(0, 400)}`,
      ) as Error & { status?: number; isRateLimit?: boolean };
      err.status = response.status;
      err.isRateLimit = response.status === 429 || response.status === 503;
      throw err;
    }

    const raw = await response.json();
    if (provider.adaptResponse) {
      return provider.adaptResponse(raw);
    }
    return raw as InvokeResult;
  } finally {
    clearTimeout(timer);
  }
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    provider: forceProvider,
    model: forceModel,
  } = params;

  const ordered = getOrderedProviders(forceProvider);
  if (ordered.length === 0) {
    // Should never happen — demo is always registered
    throw new Error("No LLM provider available (including built-in demo).");
  }

  const basePayload: Record<string, unknown> = {
    messages: messages.map(normalizeMessage),
  };

  if (tools && tools.length > 0) {
    basePayload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools,
  );
  if (normalizedToolChoice) {
    basePayload.tool_choice = normalizedToolChoice;
  }

  const maxTokens = params.maxTokens ?? params.max_tokens ?? 8192;
  basePayload.max_tokens = maxTokens;

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });
  if (normalizedResponseFormat) {
    basePayload.response_format = normalizedResponseFormat;
  }

  const timeoutMs = ENV.llmTimeoutMs;
  const errors: string[] = [];

  for (const provider of ordered) {
    const payload = {
      ...basePayload,
      model: forceModel || provider.defaultModel,
    };

    if (provider.id === "forge") {
      (payload as any).thinking = { budget_tokens: 128 };
      if (!forceModel) payload.model = "gemini-2.5-flash";
      if (!params.maxTokens && !params.max_tokens) {
        payload.max_tokens = 32768;
      }
    }

    const start = Date.now();
    try {
      const result = await callProvider(provider, payload, timeoutMs);
      const latency = Date.now() - start;
      recordSuccess(provider.id, latency);

      result._provider = provider.id;
      result._latencyMs = latency;
      return result;
    } catch (err: any) {
      const latency = Date.now() - start;
      const isRateLimit = Boolean(err?.isRateLimit || err?.status === 429);
      const isAuth = err?.status === 401 || err?.status === 403;
      const isAbort = err?.name === "AbortError";

      recordFailure(provider.id, isRateLimit || isAbort);

      const msg = `[${provider.id}] ${err?.message || String(err)} (${latency}ms)`;
      errors.push(msg);

      if (isAuth) {
        getStats(provider.id).disabledUntil = Date.now() + 5 * 60_000;
      }

      continue;
    }
  }

  throw new Error(
    `All LLM providers failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`,
  );
}

// ---------------------------------------------------------------------------
// Introspection helpers (used by systemRouter / health)
// ---------------------------------------------------------------------------

export function getProviderHealth() {
  const providers = buildProviders();
  return providers.map((p) => {
    const s = getStats(p.id);
    const total = s.successes + s.failures;
    return {
      id: p.id,
      name: p.name,
      enabled: p.enabled,
      local: Boolean(p.local),
      circuitOpen: s.disabledUntil > Date.now(),
      disabledUntil: s.disabledUntil || null,
      successes: s.successes,
      failures: s.failures,
      successRate: total === 0 ? null : Number((s.successes / total).toFixed(3)),
      avgLatencyMs:
        s.successes === 0
          ? null
          : Math.round(s.totalLatencyMs / s.successes),
      score: dynamicScore(p),
      defaultModel: p.defaultModel,
    };
  });
}

export function listAvailableProviders() {
  return buildProviders().map((p) => ({
    id: p.id,
    name: p.name,
    enabled: p.enabled,
    local: Boolean(p.local),
    defaultModel: p.defaultModel,
  }));
}

/** True when only the built-in demo provider is available (no real API keys). */
export function isDemoOnlyMode(): boolean {
  return buildProviders().filter((p) => p.enabled && p.id !== "demo").length === 0;
}
