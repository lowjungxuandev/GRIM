export type ServerEnv = {
  PORT: number;
  CLOUDINARY_URL: string;
  GOOGLE_APPLICATION_CREDENTIALS: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_DATABASE_URL: string;
  IMAGE_EXTRACT_PROVIDER?: "openai" | "openrouter";
  OPENAI_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_IMAGE_MODEL?: string;
  NVAPI_KEY: string;
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

  return {
    PORT: port,
    CLOUDINARY_URL: readRequiredEnv("CLOUDINARY_URL"),
    GOOGLE_APPLICATION_CREDENTIALS: readRequiredEnv("GOOGLE_APPLICATION_CREDENTIALS"),
    FIREBASE_PROJECT_ID: readRequiredEnv("FIREBASE_PROJECT_ID"),
    FIREBASE_DATABASE_URL: readRequiredEnv("FIREBASE_DATABASE_URL"),
    IMAGE_EXTRACT_PROVIDER: readImageExtractProvider(),
    OPENAI_API_KEY: readOptionalEnv("OPENAI_API_KEY"),
    OPENROUTER_API_KEY: readOptionalEnv("OPENROUTER_API_KEY"),
    OPENROUTER_IMAGE_MODEL: readOptionalEnv("OPENROUTER_IMAGE_MODEL"),
    NVAPI_KEY: readRequiredEnv("NVAPI_KEY"),
    SCALAR_DOCS_URL: readOptionalEnv("SCALAR_DOCS_URL"),
    GRIM_FCM_TOPIC: readOptionalEnv("GRIM_FCM_TOPIC"),
    GRIM_PROMPTS_DIR: readOptionalEnv("GRIM_PROMPTS_DIR"),
    GRIM_PROMPT_ADMIN_SECRET: readOptionalEnv("GRIM_PROMPT_ADMIN_SECRET")
  };
}

function readImageExtractProvider(): "openai" | "openrouter" | undefined {
  const value = readOptionalEnv("IMAGE_EXTRACT_PROVIDER");
  if (value === undefined) {
    return undefined;
  }
  if (value === "openai" || value === "openrouter") {
    return value;
  }
  throw new Error(`Invalid IMAGE_EXTRACT_PROVIDER: ${value}`);
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
