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
  });
});
