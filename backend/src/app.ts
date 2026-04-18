import fs from "node:fs";
import path from "node:path";
import express, { type RequestHandler, type Response } from "express";
import type { ImportService, Logger } from "./api/v1/model/services.model";
import type { HealthReport } from "./api/v1/model/health.model";
import type { ExportService } from "./api/v1/services/export.service";
import { mapRequestError, wrapAsync } from "./libs/utils/http.util";
import { createHealthRouter } from "./api/v1/routes/health.route";
import { createImportRouter } from "./api/v1/routes/import.route";
import { createExportRouter } from "./api/v1/routes/export.route";
import { createPromptsRouter } from "./api/v1/routes/prompts.route";
import type { GrimPromptSettings } from "./libs/utils/prompt.util";

const OPENAPI_ROUTE = "/openapi.yaml";
const DOCS_ROUTE = "/docs";

export type AppDependencies = {
  importService: ImportService;
  exportService: ExportService;
  runHealthChecks: () => Promise<HealthReport>;
  logger?: Logger;
  promptSettings: GrimPromptSettings;
  /** When set, prompt routes require `X-Grim-Prompt-Secret`. */
  promptAdminSecret?: string;
};

export function createApp({
  importService,
  exportService,
  runHealthChecks,
  promptSettings,
  promptAdminSecret,
  logger = console
}: AppDependencies) {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  const openApiPath = path.resolve(__dirname, "..", "openapi.yaml");

  app.options(OPENAPI_ROUTE, (_req, res) => {
    applyOpenApiCors(res);
    res.status(204).end();
  });

  app.get(OPENAPI_ROUTE, (_req, res) => {
    applyOpenApiCors(res);
    if (!fs.existsSync(openApiPath)) {
      res.status(404).type("text/plain").send("OpenAPI spec not found");
      return;
    }
    res.type("application/yaml; charset=utf-8");
    res.sendFile(openApiPath);
  });

  let scalarHandler: RequestHandler | null = null;
  const docsHandler = wrapAsync(async (req, res, next) => {
    if (!scalarHandler) {
      const { apiReference } = await import("@scalar/express-api-reference");
      scalarHandler = apiReference({
        url: OPENAPI_ROUTE,
        pageTitle: "Grim API",
        theme: "default"
      }) as RequestHandler;
    }
    scalarHandler(req, res, next);
  });

  app.get(DOCS_ROUTE, docsHandler);
  app.get(`${DOCS_ROUTE}/`, docsHandler);

  app.use(createHealthRouter(runHealthChecks));

  const v1Router = express.Router();
  v1Router.use(createImportRouter(importService));
  v1Router.use(createExportRouter(exportService));
  v1Router.use(createPromptsRouter(promptSettings, { adminSecret: promptAdminSecret }));
  app.use("/api/v1", v1Router);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const apiError = mapRequestError(err);
    if (apiError.statusCode >= 500) {
      logger.error("request failed", err);
    }
    res.status(apiError.statusCode).json({
      error: { code: apiError.code, message: apiError.message }
    });
  });

  return app;
}

function applyOpenApiCors(res: Response): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Max-Age", "86400");
}
