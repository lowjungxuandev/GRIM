import { randomUUID } from "node:crypto";
import type {
  ImportService as ImportServiceContract,
  ImportServiceDependencies,
  Logger
} from "../model/services.model";
import type { GrimUpload, ImportAcceptedResponse, ImportRequest } from "../model/import.model";

export class ImportService implements ImportServiceContract {
  private readonly logger: Logger;
  private readonly now: () => number;
  private readonly newId: () => string;

  constructor(private readonly deps: ImportServiceDependencies) {
    this.logger = deps.logger ?? console;
    this.now = deps.now ?? (() => Date.now());
    this.newId = deps.generateUploadId ?? (() => `upl_${randomUUID().replace(/-/g, "")}`);
  }

  async acceptImport(request: ImportRequest): Promise<ImportAcceptedResponse> {
    void this.runImportPipeline(request).catch((error) => {
      this.logger.error("import pipeline exited unexpectedly", error);
    });
    return {};
  }

  /**
   * Order: image storage → text extraction → final text → Realtime Database (single write) → FCM hint.
   * Does not write to the database until those steps succeed or fails with one error-shaped write.
   */
  private async runImportPipeline(request: ImportRequest): Promise<void> {
    const { uploadRepository, textExtractor, finalTextBuilder, imageStorage, notifier } = this.deps;
    const uploadId = this.newId();
    const createdAt = this.now();

    try {
      const image = await imageStorage.uploadImage(request.imageBuffer, uploadId);
      const extractedText = await textExtractor.extractTextFromImage(
        request.imageBuffer,
        request.imageMimeType
      );
      const finalText = await finalTextBuilder.buildFinalText(extractedText);

      await uploadRepository.createPendingUpload(uploadId, {
        createdAt,
        updatedAt: this.now(),
        extractedText,
        finalText,
        imageUrl: image.imageUrl,
        cloudinaryPublicId: image.cloudinaryPublicId
      });

      try {
        await notifier.broadcastNewResult();
      } catch (error) {
        this.logger.error("failed to send FCM topic broadcast", error);
      }
    } catch (error) {
      try {
        await uploadRepository.createPendingUpload(uploadId, {
          createdAt,
          updatedAt: this.now(),
          errorMessage:
            error instanceof Error && error.message.trim()
              ? error.message.trim().slice(0, 200)
              : "Processing failed"
        });
      } catch (persistError) {
        this.logger.error("failed to persist pipeline error", persistError);
      }

      this.logger.error("import pipeline failed", error);
    }
  }
}
