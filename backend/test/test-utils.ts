import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createApp } from "../src/app";
import type {
  CaptureService,
  ImportServiceDependencies,
  Logger
} from "../src/api/v1/model/services.model";
import type { HealthReport } from "../src/api/v1/model/health.model";
import type { ImportService } from "../src/api/v1/model/services.model";
import { ExportService } from "../src/api/v1/services/export.service";
import { ImportService as ImportServiceImpl } from "../src/api/v1/services/import.service";
import { GrimPromptSettings } from "../src/libs/utils/prompt.util";
import { InMemoryUploadRepository } from "./in-memory-upload-repository";

export const silentLogger: Logger = {
  error: () => {},
  warn: () => {},
  info: () => {}
};

export function stableOkHealth(): HealthReport {
  return {
    ok: true,
    firebase: { ok: true, latencyMs: 0 },
    openRouter: { ok: true, latencyMs: 0 },
    cloudinary: { ok: true, latencyMs: 0 }
  };
}

export function stableDegradedHealth(overrides: Partial<Omit<HealthReport, "ok">>): HealthReport {
  return {
    ...stableOkHealth(),
    ...overrides,
    ok: false
  };
}

export type BuildTestAppInput = {
  importService?: ImportService;
  exportService?: ExportService;
  captureService?: CaptureService;
  runHealthChecks?: () => Promise<HealthReport>;
  logger?: Logger;
  /** When set, `GET`/`PUT /api/v1/prompts` require this secret via `X-Grim-Prompt-Secret`. */
  promptAdminSecret?: string;
  /** Seed file `extract_text_prompt.txt` in an isolated temp prompts directory (default short test string). */
  initialExtractPrompt?: string;
  /** Seed file `analyzing_text_prompt.txt` in an isolated temp prompts directory (default short test string). */
  initialAnalyzingPrompt?: string;
};

const noopImportService: ImportService = {
  streamImport: async (_request, emit) => {
    emit({ error: { code: "INTERNAL_ERROR", message: "Import not configured in this test shell" } });
  }
};

const noopCaptureService: CaptureService = {
  sendCaptureNotification: async () => {}
};

function createIsolatedPromptSettings(input: BuildTestAppInput): GrimPromptSettings {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "grim-prompts-"));
  fs.writeFileSync(
    path.join(dir, "extract_text_prompt.txt"),
    input.initialExtractPrompt ?? "test extract prompt",
    "utf8"
  );
  fs.writeFileSync(
    path.join(dir, "analyzing_text_prompt.txt"),
    input.initialAnalyzingPrompt ?? "test analyzing prompt",
    "utf8"
  );
  return GrimPromptSettings.loadFromDirectory(dir);
}

export function buildTestApp(input: BuildTestAppInput = {}) {
  const importService = input.importService ?? noopImportService;
  const exportService = input.exportService ?? new ExportService(new InMemoryUploadRepository());
  const captureService = input.captureService ?? noopCaptureService;
  const runHealthChecks = input.runHealthChecks ?? (async () => stableOkHealth());
  const promptSettings = createIsolatedPromptSettings(input);
  return createApp({
    importService,
    exportService,
    captureService,
    runHealthChecks,
    promptSettings,
    promptAdminSecret: input.promptAdminSecret,
    logger: input.logger ?? silentLogger
  });
}

/** Real {@link ImportServiceImpl} with stubbed pipeline deps and no vendor I/O. */
export function createImportServiceWithStubbedPipeline(deps?: Partial<ImportServiceDependencies>) {
  const uploadRepository = deps?.uploadRepository ?? new InMemoryUploadRepository();
  return new ImportServiceImpl({
    uploadRepository,
    textExtractor: deps?.textExtractor ?? { extractTextFromImage: async () => "extracted" },
    finalTextBuilder: deps?.finalTextBuilder ?? { buildFinalText: async (t) => `final:${t}` },
    imageStorage:
      deps?.imageStorage ??
      ({
        uploadImage: async () => ({
          imageUrl: "https://example.test/img",
          cloudinaryPublicId: "test_public_id"
        })
      } satisfies ImportServiceDependencies["imageStorage"]),
    notifier:
      deps?.notifier ??
      {
        broadcastNewResult: async () => {},
        broadcastCaptureRequest: async () => {},
        broadcastExportRefresh: async () => {}
      },
    logger: deps?.logger ?? silentLogger,
    now: deps?.now ?? (() => 4242),
    generateUploadId: deps?.generateUploadId ?? (() => "integration_upload_id")
  });
}
