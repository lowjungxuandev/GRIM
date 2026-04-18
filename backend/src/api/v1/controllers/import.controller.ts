import type { Request, Response } from "express";
import { ApiError } from "../../../libs/utils/api-error.util";
import type { ImportService } from "../model/services.model";

export function createImportHandler(importService: ImportService) {
  return async (req: Request, res: Response) => {
    if (!req.file) {
      throw new ApiError(400, "INVALID_REQUEST", "image is required");
    }
    const body = await importService.acceptImport({
      imageBuffer: req.file.buffer,
      imageMimeType: req.file.mimetype
    });
    res.status(202).json(body);
  };
}
