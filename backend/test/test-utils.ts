import { createApp } from "../src/app";
import type { ImportServiceDependencies, Logger } from "../src/api/v1/model/services.model";
import type { HealthReport } from "../src/api/v1/model/health.model";
import type { ImportService } from "../src/api/v1/model/services.model";
import { ExportService } from "../src/api/v1/services/export.service";
import { ImportService as ImportServiceImpl } from "../src/api/v1/services/import.service";
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
    nvidiaNim: { ok: true, latencyMs: 0 },
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
  runHealthChecks?: () => Promise<HealthReport>;
  logger?: Logger;
};

const noopImportService: ImportService = {
  acceptImport: async () => ({})
};

export function buildTestApp(input: BuildTestAppInput = {}) {
  const importService = input.importService ?? noopImportService;
  const exportService = input.exportService ?? new ExportService(new InMemoryUploadRepository());
  const runHealthChecks = input.runHealthChecks ?? (async () => stableOkHealth());
  return createApp({
    importService,
    exportService,
    runHealthChecks,
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
    notifier: deps?.notifier ?? { broadcastNewResult: async () => {} },
    logger: deps?.logger ?? silentLogger,
    now: deps?.now ?? (() => 4242),
    generateUploadId: deps?.generateUploadId ?? (() => "integration_upload_id")
  });
}
