export type LlmProvider = "openrouter" | "openai" | "nim";

export const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
export const DEFAULT_OPENROUTER_MODEL = "openrouter/free";

export type LlmConfig = {
  provider: LlmProvider;
  apiKey: string;
  model: string;
  baseURL?: string;
};

export type ServerEnv = {
  PORT: number;
  CLOUDINARY_URL: string;
  GOOGLE_APPLICATION_CREDENTIALS?: string;
  FIREBASE_SERVICE_ACCOUNT_JSON_BASE64?: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_DATABASE_URL: string;
  EXTRACT_LLM: LlmConfig;
  FINAL_LLM: LlmConfig;
  /** Optional URL of a Scalar-hosted API Reference; local spec is always `GET /openapi.yaml`. */
  SCALAR_DOCS_URL?: string;
  /**
   * FCM topic for `broadcastNewResult` (default `grim_new_result`). Clients must subscribe to this topic.
   */
  GRIM_FCM_TOPIC?: string;
  /** Directory containing `extract_text_prompt.txt` and `analyzing_text_prompt.txt` (default `./prompts` from process cwd). */
  GRIM_PROMPTS_DIR?: string;
  /** When set, `GET`/`PUT /api/v1/prompts` require header `X-Grim-Prompt-Secret` with this exact value. */
  GRIM_PROMPT_ADMIN_SECRET?: string;
};

export function loadServerEnv(): ServerEnv {
  const portRaw = process.env.PORT ?? "3001";
  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Invalid PORT: ${portRaw}`);
  }

  const sharedLlm = loadSharedLlmEnv();

  return {
    PORT: port,
    CLOUDINARY_URL: readRequiredEnv("CLOUDINARY_URL"),
    ...loadFirebaseCredentialsEnv(),
    FIREBASE_PROJECT_ID: readRequiredEnv("FIREBASE_PROJECT_ID"),
    FIREBASE_DATABASE_URL: readRequiredEnv("FIREBASE_DATABASE_URL"),
    EXTRACT_LLM: loadStageLlmEnv("EXTRACT", sharedLlm),
    FINAL_LLM: loadStageLlmEnv("FINAL", sharedLlm),
    SCALAR_DOCS_URL: readOptionalEnv("SCALAR_DOCS_URL"),
    GRIM_FCM_TOPIC: readOptionalEnv("GRIM_FCM_TOPIC"),
    GRIM_PROMPTS_DIR: readOptionalEnv("GRIM_PROMPTS_DIR"),
    GRIM_PROMPT_ADMIN_SECRET: readOptionalEnv("GRIM_PROMPT_ADMIN_SECRET")
  };
}

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required env var ${name}`);
  }

  return value;
}

function loadFirebaseCredentialsEnv(): Pick<
  ServerEnv,
  "GOOGLE_APPLICATION_CREDENTIALS" | "FIREBASE_SERVICE_ACCOUNT_JSON_BASE64"
> {
  const credentialsPath = readOptionalEnv("GOOGLE_APPLICATION_CREDENTIALS");
  const serviceAccountBase64 = readOptionalEnv("FIREBASE_SERVICE_ACCOUNT_JSON_BASE64");

  if (!credentialsPath && !serviceAccountBase64) {
    throw new Error(
      "Missing Firebase credentials env: set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON_BASE64"
    );
  }

  return {
    GOOGLE_APPLICATION_CREDENTIALS: credentialsPath,
    FIREBASE_SERVICE_ACCOUNT_JSON_BASE64: serviceAccountBase64
  };
}

function loadSharedLlmEnv(): Partial<LlmConfig> {
  const explicitProvider = readOptionalEnv("LLM_PROVIDER");
  const llmProvider = explicitProvider
    ? parseLlmProvider(explicitProvider)
    : resolveDefaultProviderFromLegacyConfig();
  const apiKey = readOptionalEnv("LLM_API_KEY") ?? readOptionalEnv("OPENROUTER_API_KEY");
  const model =
    readOptionalEnv("LLM_MODEL") ??
    readOptionalEnv("OPENROUTER_MODEL") ??
    readOptionalEnv("OPENROUTER_IMAGE_MODEL") ??
    (llmProvider === "openrouter" ? DEFAULT_OPENROUTER_MODEL : undefined);
  const baseURL =
    readOptionalEnv("LLM_BASE_URL") ??
    (llmProvider === "openrouter" ? DEFAULT_OPENROUTER_BASE_URL : undefined);

  return {
    provider: apiKey || model || baseURL || explicitProvider ? llmProvider : undefined,
    apiKey,
    model,
    baseURL
  };
}

function parseLlmProvider(value: string): LlmProvider {
  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === "openrouter" || normalizedValue === "openai" || normalizedValue === "nim") {
    return normalizedValue;
  }

  throw new Error(`Invalid LLM_PROVIDER: ${value}`);
}

function resolveDefaultProviderFromLegacyConfig(): LlmProvider {
  const hasLegacyOpenRouterConfig = Boolean(
    readOptionalEnv("OPENROUTER_API_KEY") ||
      readOptionalEnv("OPENROUTER_MODEL") ||
      readOptionalEnv("OPENROUTER_IMAGE_MODEL")
  );

  if (hasLegacyOpenRouterConfig) {
    return "openrouter";
  }

  return "openrouter";
}

function loadStageLlmEnv(stage: "EXTRACT" | "FINAL", sharedLlm: Partial<LlmConfig>): LlmConfig {
  const stageProviderRaw = readOptionalEnv(`${stage}_LLM_PROVIDER`);
  const stageProvider = stageProviderRaw ? parseLlmProvider(stageProviderRaw) : undefined;
  const provider = stageProvider ?? sharedLlm.provider ?? resolveDefaultProviderFromLegacyConfig();
  const canInheritSharedFields = !stageProvider || stageProvider === sharedLlm.provider;
  const apiKey =
    readOptionalEnv(`${stage}_LLM_API_KEY`) ??
    (canInheritSharedFields ? sharedLlm.apiKey : undefined);
  if (!apiKey) {
    throw new Error(
      `Missing required env var ${stage}_LLM_API_KEY (or compatible shared fallback LLM_API_KEY / OPENROUTER_API_KEY)`
    );
  }

  const model =
    readOptionalEnv(`${stage}_LLM_MODEL`) ??
    (canInheritSharedFields ? sharedLlm.model : undefined) ??
    (provider === "openrouter" ? DEFAULT_OPENROUTER_MODEL : undefined);
  if (!model) {
    throw new Error(
      `Missing required env var ${stage}_LLM_MODEL (or compatible shared fallback LLM_MODEL)`
    );
  }

  const baseURL =
    readOptionalEnv(`${stage}_LLM_BASE_URL`) ??
    (canInheritSharedFields ? sharedLlm.baseURL : undefined) ??
    (provider === "openrouter" ? DEFAULT_OPENROUTER_BASE_URL : undefined);
  if (provider === "nim" && !baseURL) {
    throw new Error(
      `Missing required env var ${stage}_LLM_BASE_URL when ${stage}_LLM_PROVIDER=nim`
    );
  }

  return {
    provider,
    apiKey,
    model,
    baseURL
  };
}
