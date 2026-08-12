export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",

  // Legacy Manus forge (kept for backward compatibility)
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",

  // Multi-provider LLM keys (optional — only enabled providers are used)
  geminiApiKey: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "",
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  nvidiaApiKey: process.env.NVIDIA_API_KEY ?? "",
  cerebrasApiKey: process.env.CEREBRAS_API_KEY ?? "",
  mistralApiKey: process.env.MISTRAL_API_KEY ?? "",
  githubToken: process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? "",
  cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? "",
  cloudflareApiToken: process.env.CLOUDFLARE_API_TOKEN ?? "",

  // Global LLM behavior
  llmTimeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? 45_000),
  llmMaxRetries: Number(process.env.LLM_MAX_RETRIES ?? 1),
  llmPreferredOrder: process.env.LLM_PREFERRED_ORDER ?? "",
};
