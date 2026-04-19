import axios from "axios";
import type { Database } from "firebase-admin/database";
import OpenAI from "openai";
import { pingCloudinary } from "../../../libs/cloudinary/utils";
import { OPENROUTER_BASE_URL } from "../../../libs/openrouter/text-processor";
import type { DependencyCheck, HealthReport } from "../model/health.model";

const HEALTH_REQUEST_TIMEOUT_MS = 10_000;

export function createHealthRunner(database: Database, openRouterApiKey: string) {
  const openRouterClient = new OpenAI({
    apiKey: openRouterApiKey,
    baseURL: OPENROUTER_BASE_URL,
    timeout: HEALTH_REQUEST_TIMEOUT_MS
  });

  return async (): Promise<HealthReport> => {
    const [firebase, openRouter, cloudinary] = await Promise.all([
      runDependencyCheck(async () => {
        await database.ref("/.info/serverTimeOffset").once("value");
      }),
      runDependencyCheck(async () => {
        await openRouterClient.models.list();
      }),
      runDependencyCheck(pingCloudinary)
    ]);

    return {
      ok: firebase.ok && openRouter.ok && cloudinary.ok,
      firebase,
      openRouter,
      cloudinary
    };
  };
}

async function runDependencyCheck(check: () => Promise<void>): Promise<DependencyCheck> {
  const startedAt = Date.now();
  try {
    await check();
    return { ok: true, latencyMs: Date.now() - startedAt };
  } catch (error) {
    return { ok: false, latencyMs: Date.now() - startedAt, error: summarizeError(error) };
  }
}

function summarizeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED") {
      return "request timed out";
    }
    if (error.response) {
      return `HTTP ${error.response.status}`;
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "unknown error";
}
