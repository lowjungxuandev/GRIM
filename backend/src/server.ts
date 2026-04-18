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
import { NvidiaGemmaTextExtractor } from "./libs/nvidia/gemma-3n-e4b-it";
import { NvidiaStepFinalTextBuilder } from "./libs/nvidia/step-3.5-flash";

function createProductionDependencies(env: ServerEnv): AppDependencies {
  const firebaseApp = getFirebaseAdminApp(env);
  const realtimeDb = getRealtimeDb(firebaseApp);
  const uploadRepository = new FirebaseUploadRepository(realtimeDb);
  const exportService = new ExportService(uploadRepository);
  const importService = new ImportService({
    uploadRepository,
    textExtractor: new NvidiaGemmaTextExtractor(env.NVAPI_KEY),
    finalTextBuilder: new NvidiaStepFinalTextBuilder(env.NVAPI_KEY),
    imageStorage: new CloudinaryImageStore(),
    notifier: new FirebaseNotifier(firebaseApp, env.GRIM_FCM_TOPIC ?? DEFAULT_FCM_BROADCAST_TOPIC),
    logger: console
  });

  return {
    importService,
    exportService,
    runHealthChecks: createHealthRunner(realtimeDb, env.NVAPI_KEY),
    logger: console
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
