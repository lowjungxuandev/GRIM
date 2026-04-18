import { applicationDefault, getApps, initializeApp, type App } from "firebase-admin/app";
import type { ServerEnv } from "../configs/env.config";

export function getFirebaseAdminApp(env: ServerEnv): App {
  const existing = getApps()[0];
  if (existing) {
    return existing;
  }
  return initializeApp({
    credential: applicationDefault(),
    projectId: env.FIREBASE_PROJECT_ID,
    databaseURL: env.FIREBASE_DATABASE_URL
  });
}
