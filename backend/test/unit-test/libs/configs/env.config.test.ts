import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadServerEnv } from "../../../../src/libs/configs/env.config";

const required = {
  CLOUDINARY_URL: "cloudinary://x",
  GOOGLE_APPLICATION_CREDENTIALS: "/path/cred.json",
  FIREBASE_PROJECT_ID: "proj",
  FIREBASE_DATABASE_URL: "https://proj.firebaseio.com",
  NVAPI_KEY: "nv-key"
} as const;

describe("loadServerEnv", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    for (const [k, v] of Object.entries(required)) {
      vi.stubEnv(k, v);
    }
    for (const key of [
      "IMAGE_EXTRACT_PROVIDER",
      "OPENAI_API_KEY",
      "OPENROUTER_API_KEY",
      "OPENROUTER_IMAGE_MODEL"
    ]) {
      vi.stubEnv(key, "");
      delete process.env[key];
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults PORT to 3001 when unset", () => {
    Reflect.deleteProperty(process.env, "PORT");
    const env = loadServerEnv();
    expect(env.PORT).toBe(3001);
  });

  it("parses PORT from the environment", () => {
    vi.stubEnv("PORT", "4000");
    expect(loadServerEnv().PORT).toBe(4000);
  });

  it("throws when PORT is not a positive number", () => {
    vi.stubEnv("PORT", "nope");
    expect(() => loadServerEnv()).toThrow(/Invalid PORT/);
  });

  it("throws when a required env var is missing", () => {
    vi.stubEnv("NVAPI_KEY", "");
    delete process.env.NVAPI_KEY;
    expect(() => loadServerEnv()).toThrow(/Missing required env var NVAPI_KEY/);
  });

  it("parses image extraction provider options", () => {
    vi.stubEnv("IMAGE_EXTRACT_PROVIDER", "openrouter");
    vi.stubEnv("OPENROUTER_API_KEY", "openrouter-key");
    vi.stubEnv("OPENROUTER_IMAGE_MODEL", "openrouter/free");
    const env = loadServerEnv();
    expect(env.IMAGE_EXTRACT_PROVIDER).toBe("openrouter");
    expect(env.OPENROUTER_API_KEY).toBe("openrouter-key");
    expect(env.OPENROUTER_IMAGE_MODEL).toBe("openrouter/free");
  });

  it("throws when image extraction provider is invalid", () => {
    vi.stubEnv("IMAGE_EXTRACT_PROVIDER", "bad");
    expect(() => loadServerEnv()).toThrow(/Invalid IMAGE_EXTRACT_PROVIDER/);
  });

  it("returns optional vars when set and undefined when blank", () => {
    vi.stubEnv("SCALAR_DOCS_URL", " https://docs.example ");
    vi.stubEnv("GRIM_FCM_TOPIC", "");
    delete process.env.GRIM_FCM_TOPIC;
    vi.stubEnv("GRIM_PROMPTS_DIR", "/tmp/prompts");
    const env = loadServerEnv();
    expect(env.SCALAR_DOCS_URL).toBe("https://docs.example");
    expect(env.GRIM_FCM_TOPIC).toBeUndefined();
    expect(env.GRIM_PROMPTS_DIR).toBe("/tmp/prompts");
    expect(env.GRIM_PROMPT_ADMIN_SECRET).toBeUndefined();
    expect(env.IMAGE_EXTRACT_PROVIDER).toBeUndefined();
    expect(env.OPENAI_API_KEY).toBeUndefined();
  });
});
