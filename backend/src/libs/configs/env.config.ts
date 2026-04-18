export type ServerEnv = {
  PORT: number;
  CLOUDINARY_URL: string;
  GOOGLE_APPLICATION_CREDENTIALS: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_DATABASE_URL: string;
  NVAPI_KEY: string;
  /** Optional URL of a Scalar-hosted API Reference; local spec is always `GET /openapi.yaml`. */
  SCALAR_DOCS_URL?: string;
  /**
   * FCM topic for `broadcastNewResult` (default `grim_new_result`). Clients must subscribe to this topic.
   */
  GRIM_FCM_TOPIC?: string;
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
    NVAPI_KEY: readRequiredEnv("NVAPI_KEY"),
    SCALAR_DOCS_URL: readOptionalEnv("SCALAR_DOCS_URL"),
    GRIM_FCM_TOPIC: readOptionalEnv("GRIM_FCM_TOPIC")
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
