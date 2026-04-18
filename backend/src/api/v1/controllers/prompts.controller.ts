import type { Request, RequestHandler } from "express";
import type { GrimPromptSettings, PromptUpdateBody } from "../../../libs/utils/prompt.util";
import { ApiError } from "../../../libs/utils/api-error.util";

type MulterFieldFiles = Record<string, Express.Multer.File[] | undefined>;

function firstFile(files: MulterFieldFiles | undefined, field: string): Express.Multer.File | undefined {
  return files?.[field]?.[0];
}

function readStringField(body: Request["body"], key: string): string | undefined {
  const v = body?.[key];
  if (typeof v === "string" && v.length > 0) {
    return v;
  }
  return undefined;
}

function readUtf8FromFile(file: Express.Multer.File | undefined): string | undefined {
  if (!file?.buffer?.length) {
    return undefined;
  }
  return file.buffer.toString("utf8");
}

export function createGetPromptsHandler(settings: GrimPromptSettings): RequestHandler {
  return async (_req, res) => {
    res.json(settings.getSnapshot());
  };
}

/**
 * Supports **`application/json`** (`extractTextPrompt` / `analyzingTextPrompt`) or
 * **`multipart/form-data`** with optional file parts **`extract_text`** and **`analyzing_text`**
 * (and optional same-named text fields if no file for that slot).
 */
export function createPutPromptsHandler(settings: GrimPromptSettings): RequestHandler {
  return async (req, res) => {
    const ct = String(req.headers["content-type"] ?? "").toLowerCase();
    const isMultipart = ct.includes("multipart/form-data");

    let update: PromptUpdateBody;

    if (isMultipart) {
      const files = req.files as MulterFieldFiles | undefined;
      const extractFromFile = readUtf8FromFile(firstFile(files, "extract_text"));
      const analyzingFromFile = readUtf8FromFile(firstFile(files, "analyzing_text"));
      const extractFromField = readStringField(req.body, "extract_text");
      const analyzingFromField = readStringField(req.body, "analyzing_text");

      update = {
        extractTextPrompt: extractFromFile ?? extractFromField,
        analyzingTextPrompt: analyzingFromFile ?? analyzingFromField
      };
    } else {
      const body = req.body as unknown;
      if (body === null || typeof body !== "object" || Array.isArray(body)) {
        throw new ApiError(400, "INVALID_REQUEST", "Expected a JSON object body or multipart/form-data");
      }
      const json = body as PromptUpdateBody;
      update = {
        extractTextPrompt: json.extractTextPrompt,
        analyzingTextPrompt: json.analyzingTextPrompt
      };
    }

    settings.updatePrompts(update);
    res.status(200).json(settings.getSnapshot());
  };
}
