/**
 * Multi-provider LLM client with adaptive fallback + self-learning ranking.
 *
 * Design goals:
 * - Add / remove providers by config only (no code change required for most cases)
 * - Enable / disable at runtime via env or temporary circuit-breaker
 * - Automatic error classification → skip / retry / disable temporarily
 * - Learn from success / latency / failure rates and reorder providers continuously
 * - Backward-compatible with the original Manus forge endpoint
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
  // Clear any previous circuit if it recovered
  if (s.disabledUntil > 0 && Date.now() > s.disabledUntil) {
    s.disabledUntil = 0;
  }
}

function recordFailure(id: ProviderId, isRateLimitOrTransient: boolean) {
  const s = getStats(id);
  s.failures += 1;
  s.lastFailureAt = Date.now();
  s.consecutiveFailures += 1;

  // Circuit breaker: after 3 consecutive failures, disable for a while
  if (s.consecutiveFailures >= 3) {
    // Longer cooldown for rate-limits
    const cooldownMs = isRateLimitOrTransient ? 60_000 : 30_000;
    s.disabledUntil = Date.now() + cooldownMs;
  }
}

/** Dynamic score used for ordering (higher is better) */
function dynamicScore(cfg: ProviderConfig): number {
  const s = getStats(cfg.id);
  if (s.disabledUntil > Date.now()) return -Infinity;

  const total = s.successes + s.failures;
  const successRate = total === 0 ? 0.85 : s.successes / total; // optimistic prior
  const avgLatency =
    s.successes === 0 ? 2500 : s.totalLatencyMs / s.successes;

  // Prefer high success rate + lower latency + base preference
  const latencyScore = Math.max(0, 5000 - avgLatency) / 5000;
  return cfg.baseScore * 0.4 + successRate * 40 + latencyScore * 20;
}

// ---------------------------------------------------------------------------
// Provider registry (easy to extend)
// ---------------------------------------------------------------------------

function buildProviders(): ProviderConfig[] {
  const providers: ProviderConfig[] = [];

  // 1. Legacy Manus forge (highest base score if present)
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

  // 2. Google Gemini (native OpenAI-compatible endpoint)
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

  // 4. OpenRouter (aggregator — many free models)
  if (ENV.openRouterApiKey) {
    providers.push({
      id: "openrouter",
      name: "OpenRouter",
      enabled: true,
      baseUrl: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: ENV.openRouterApiKey,
      defaultModel: "openrouter/auto",
      headers: {
        "HTTP-Referer": "https://github.com/Johanne012/Repository-name-my-ai-platform",
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

  // 9. Cloudflare Workers AI (OpenAI-compatible via AI Gateway style or direct)
  // Direct Workers AI uses a slightly different path; we use the OpenAI-compatible endpoint when available.
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

/** Returns providers ordered by adaptive score (best first) */
function getOrderedProviders(forceId?: string): ProviderConfig[] {
  const all = buildProviders().filter((p) => p.enabled);

  if (forceId) {
    const forced = all.find((p) => p.id === forceId);
    return forced ? [forced] : [];
  }

  // Optional static preferred order from env (comma-separated ids)
  const preferred = ENV.llmPreferredOrder
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const scored = all
    .map((p) => ({ p, score: dynamicScore(p) }))
    .filter((x) => x.score > -Infinity)
    .sort((a, b) => {
      // Respect explicit preferred order first
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
    throw new Error(
      "No LLM provider is configured or currently available. " +
        "Set at least one of: GEMINI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY, " +
        "NVIDIA_API_KEY, CEREBRAS_API_KEY, MISTRAL_API_KEY, GITHUB_TOKEN, " +
        "CLOUDFLARE_ACCOUNT_ID+CLOUDFLARE_API_TOKEN, or BUILT_IN_FORGE_API_KEY.",
    );
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

    // Special handling for forge which used extra fields historically
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

      // Attach metadata so callers / logs can see which provider won
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

      // Auth errors → skip this provider for a longer time
      if (isAuth) {
        getStats(provider.id).disabledUntil = Date.now() + 5 * 60_000;
      }

      // Continue to next provider
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
    defaultModel: p.defaultModel,
  }));
}
