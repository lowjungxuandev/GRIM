import path from "node:path";
import type { AppDependencies } from "./app";
import { createHealthRunner } from "./api/v1/services/health.service";
import { CaptureService } from "./api/v1/services/capture.service";
import { ExportService } from "./api/v1/services/export.service";
import { ImportService } from "./api/v1/services/import.service";
import type { ServerEnv } from "./libs/configs/env.config";
import { CloudinaryImageStore } from "./libs/cloudinary/utils";
import { DEFAULT_FCM_BROADCAST_TOPIC, FirebaseNotifier } from "./libs/firebase/fcm";
import { getFirebaseAdminApp } from "./libs/firebase/admin";
import { FirebaseUploadRepository, getRealtimeDb } from "./libs/firebase/realtime";
import { OpenAICompatibleTextProcessor } from "./libs/llm/text-processor";
import { GrimPromptSettings } from "./libs/utils/prompt.util";

export function createProductionDependencies(env: ServerEnv): AppDependencies {
  const promptsDir = env.GRIM_PROMPTS_DIR ?? path.resolve(__dirname, "..", "prompts");
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
  const extractLlmProcessor = new OpenAICompatibleTextProcessor({
    apiKey: env.EXTRACT_LLM.apiKey,
    model: env.EXTRACT_LLM.model,
    baseURL: env.EXTRACT_LLM.baseURL,
    getExtractPromptText: () => promptSettings.getExtractTextPrompt(),
    getAnalyzingSystemPrompt: () => promptSettings.getAnalyzingTextPrompt()
  });
  const finalLlmProcessor = new OpenAICompatibleTextProcessor({
    apiKey: env.FINAL_LLM.apiKey,
    model: env.FINAL_LLM.model,
    baseURL: env.FINAL_LLM.baseURL,
    getExtractPromptText: () => promptSettings.getExtractTextPrompt(),
    getAnalyzingSystemPrompt: () => promptSettings.getAnalyzingTextPrompt()
  });
  const importService = new ImportService({
    uploadRepository,
    textExtractor: extractLlmProcessor,
    finalTextBuilder: finalLlmProcessor,
    imageStorage: new CloudinaryImageStore(),
    notifier,
    logger: console
  });

  return {
    importService,
    exportService,
    captureService,
    runHealthChecks: createHealthRunner(realtimeDb, env.EXTRACT_LLM, env.FINAL_LLM),
    logger: console,
    promptSettings,
    promptAdminSecret: env.GRIM_PROMPT_ADMIN_SECRET
  };
}
