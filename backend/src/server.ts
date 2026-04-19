import path from "node:path";
import "dotenv/config";
import type { AppDependencies } from "./app";
import { createApp } from "./app";
import { createHealthRunner } from "./api/v1/services/health.service";
import { CaptureService } from "./api/v1/services/capture.service";
import { ExportService } from "./api/v1/services/export.service";
import { ImportService } from "./api/v1/services/import.service";
import { loadServerEnv, type ServerEnv } from "./libs/configs/env.config";
import { CloudinaryImageStore } from "./libs/cloudinary/utils";
import { DEFAULT_FCM_BROADCAST_TOPIC, FirebaseNotifier } from "./libs/firebase/fcm";
import { getFirebaseAdminApp } from "./libs/firebase/admin";
import { FirebaseUploadRepository, getRealtimeDb } from "./libs/firebase/realtime";
import { GrimPromptSettings } from "./libs/utils/prompt.util";
import {
  OPENROUTER_DEFAULT_IMAGE_MODEL,
  OpenRouterTextProcessor
} from "./libs/openrouter/text-processor";

function createProductionDependencies(env: ServerEnv): AppDependencies {
  const promptsDir = env.GRIM_PROMPTS_DIR ?? path.join(process.cwd(), "prompts");
  const promptSettings = GrimPromptSettings.loadFromDirectory(promptsDir);
  const firebaseApp = getFirebaseAdminApp(env);
  const realtimeDb = getRealtimeDb(firebaseApp);
  const uploadRepository = new FirebaseUploadRepository(realtimeDb);
  const exportService = new ExportService(uploadRepository);
  const notifier = new FirebaseNotifier(
    firebaseApp,
    env.GRIM_FCM_TOPIC ?? DEFAULT_FCM_BROADCAST_TOPIC
  );
  const captureService = new CaptureService(notifier);
  const openRouterModel =
    env.OPENROUTER_MODEL ?? env.OPENROUTER_IMAGE_MODEL ?? OPENROUTER_DEFAULT_IMAGE_MODEL;
  const openRouter = new OpenRouterTextProcessor(
    env.OPENROUTER_API_KEY,
    openRouterModel,
    () => promptSettings.getExtractTextPrompt(),
    () => promptSettings.getAnalyzingTextPrompt()
  );
  const importService = new ImportService({
    uploadRepository,
    textExtractor: openRouter,
    finalTextBuilder: openRouter,
    imageStorage: new CloudinaryImageStore(),
    notifier,
    logger: console
  });

  return {
    importService,
    exportService,
    captureService,
    runHealthChecks: createHealthRunner(realtimeDb, env.OPENROUTER_API_KEY),
    logger: console,
    promptSettings,
    promptAdminSecret: env.GRIM_PROMPT_ADMIN_SECRET
  };
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
