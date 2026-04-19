import path from "node:path";
import "dotenv/config";
import type { AppDependencies } from "./app";
import { createApp } from "./app";
import { createHealthRunner } from "./api/v1/services/health.service";
import { ExportService } from "./api/v1/services/export.service";
import { ImportService } from "./api/v1/services/import.service";
import { loadServerEnv, type ServerEnv } from "./libs/configs/env.config";
import { CloudinaryImageStore } from "./libs/cloudinary/utils";
import { DEFAULT_FCM_BROADCAST_TOPIC, FirebaseNotifier } from "./libs/firebase/fcm";
import { getFirebaseAdminApp } from "./libs/firebase/admin";
import { FirebaseUploadRepository, getRealtimeDb } from "./libs/firebase/realtime";
import { GrimPromptSettings } from "./libs/utils/prompt.util";
import { NvidiaStepFinalTextBuilder } from "./libs/nvidia/step-3.5-flash";
import { OpenAIGpt4oImageTextExtractor } from "./libs/openai/gpt-4o-image-text-extractor";
import type { ImageTextExtractor } from "./api/v1/model/services.model";
import {
  OPENROUTER_DEFAULT_IMAGE_MODEL,
  OpenRouterImageTextExtractor
} from "./libs/openrouter/image-text-extractor";

function createProductionDependencies(env: ServerEnv): AppDependencies {
  const promptsDir = env.GRIM_PROMPTS_DIR ?? path.join(process.cwd(), "prompts");
  const promptSettings = GrimPromptSettings.loadFromDirectory(promptsDir);
  const firebaseApp = getFirebaseAdminApp(env);
  const realtimeDb = getRealtimeDb(firebaseApp);
  const uploadRepository = new FirebaseUploadRepository(realtimeDb);
  const exportService = new ExportService(uploadRepository);
  const importService = new ImportService({
    uploadRepository,
    textExtractor: createImageTextExtractor(env, promptSettings),
    finalTextBuilder: new NvidiaStepFinalTextBuilder(env.NVAPI_KEY, () => promptSettings.getAnalyzingTextPrompt()),
    imageStorage: new CloudinaryImageStore(),
    notifier: new FirebaseNotifier(firebaseApp, env.GRIM_FCM_TOPIC ?? DEFAULT_FCM_BROADCAST_TOPIC),
    logger: console
  });

  return {
    importService,
    exportService,
    runHealthChecks: createHealthRunner(realtimeDb, env.NVAPI_KEY),
    logger: console,
    promptSettings,
    promptAdminSecret: env.GRIM_PROMPT_ADMIN_SECRET
  };
}

function createImageTextExtractor(env: ServerEnv, promptSettings: GrimPromptSettings): ImageTextExtractor {
  const provider = env.IMAGE_EXTRACT_PROVIDER ?? "openai";
  if (provider === "openrouter") {
    if (!env.OPENROUTER_API_KEY) {
      throw new Error("Missing required env var OPENROUTER_API_KEY");
    }
    return new OpenRouterImageTextExtractor(
      env.OPENROUTER_API_KEY,
      env.OPENROUTER_IMAGE_MODEL ?? OPENROUTER_DEFAULT_IMAGE_MODEL,
      () => promptSettings.getExtractTextPrompt()
    );
  }

  if (!env.OPENAI_API_KEY) {
    throw new Error("Missing required env var OPENAI_API_KEY");
  }
  return new OpenAIGpt4oImageTextExtractor(env.OPENAI_API_KEY, () =>
    promptSettings.getExtractTextPrompt()
  );
}

const env = loadServerEnv();
const app = createApp(createProductionDependencies(env));

app.listen(env.PORT, () => {
  const baseUrl = `http://localhost:${env.PORT}`;
  console.log(`backend listening on ${baseUrl}`);
  console.log(`Scalar API docs UI: ${baseUrl}/docs`);
  console.log(`OpenAPI spec (YAML): ${baseUrl}/openapi.yaml`);

  if (env.SCALAR_DOCS_URL) {
    console.log(`Scalar-hosted API reference (optional): ${env.SCALAR_DOCS_URL}`);
  }
});
