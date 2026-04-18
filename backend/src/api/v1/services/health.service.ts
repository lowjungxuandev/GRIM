import axios from "axios";
import type { Database } from "firebase-admin/database";
import { pingCloudinary } from "../../../libs/cloudinary/utils";
import type { DependencyCheck, HealthReport } from "../model/health.model";

const NVIDIA_NIM_MODELS_URL = "https://integrate.api.nvidia.com/v1/models";
const HEALTH_REQUEST_TIMEOUT_MS = 10_000;

export function createHealthRunner(database: Database, nvapiKey: string) {
  return async (): Promise<HealthReport> => {
    const [firebase, nvidiaNim, cloudinary] = await Promise.all([
      checkFirebaseRealtimeDb(database),
      checkNvidiaNimApi(nvapiKey),
      checkCloudinary()
    ]);
    return {
      ok: firebase.ok && nvidiaNim.ok && cloudinary.ok,
      firebase,
      nvidiaNim,
      cloudinary
    };
  };
}

async function checkFirebaseRealtimeDb(database: Database): Promise<DependencyCheck> {
  return runDependencyCheck(async () => {
    await database.ref("/.info/serverTimeOffset").once("value");
  });
}

async function checkNvidiaNimApi(apiKey: string): Promise<DependencyCheck> {
  return runDependencyCheck(async () => {
    const response = await axios.get(NVIDIA_NIM_MODELS_URL, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      timeout: HEALTH_REQUEST_TIMEOUT_MS,
      validateStatus: () => true
    });

    if (response.status >= 200 && response.status < 300) {
      return;
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error("NVIDIA NIM API rejected the API key (unauthorized)");
    }

    throw new Error(`NVIDIA NIM API returned HTTP ${response.status}`);
  });
}

async function checkCloudinary(): Promise<DependencyCheck> {
  return runDependencyCheck(pingCloudinary);
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
