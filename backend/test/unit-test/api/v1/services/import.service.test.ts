import { describe, expect, it, vi } from "vitest";
import { ImportService } from "../../../../../src/api/v1/services/import.service";
import { InMemoryUploadRepository } from "../../../../in-memory-upload-repository";
import { ApiError } from "../../../../../src/libs/utils/api-error.util";

describe("ImportService", () => {
  it("emits status phases then success row after storage → extract → rewrite → RTDB → notifier", async () => {
    const uploadRepository = new InMemoryUploadRepository();
    const textExtractor = { extractTextFromImage: vi.fn(async () => "extracted") };
    const finalTextBuilder = { buildFinalText: vi.fn(async (t: string) => `final:${t}`) };
    const imageStorage = {
      uploadImage: vi.fn(async () => ({
        imageUrl: "https://img",
        cloudinaryPublicId: "pid"
      }))
    };
    const notifier = { broadcastNewResult: vi.fn(async () => {}) };
    const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
    const emit = vi.fn();

    const service = new ImportService({
      uploadRepository,
      textExtractor,
      finalTextBuilder,
      imageStorage,
      notifier,
      logger,
      now: () => 99,
      generateUploadId: () => "upl_testid"
    });

    await service.streamImport(
      { imageBuffer: Buffer.from("img"), imageMimeType: "image/png" },
      emit
    );

    expect(emit.mock.calls.map((c) => c[0])).toEqual([
      { status: "extracting_text" },
      { status: "analyzing_text" },
      {
        id: "upl_testid",
        createdAt: 99,
        updatedAt: 99,
        extractedText: "extracted",
        finalText: "final:extracted",
        imageUrl: "https://img",
        cloudinaryPublicId: "pid"
      }
    ]);

    expect(imageStorage.uploadImage).toHaveBeenCalledBefore(textExtractor.extractTextFromImage);
    expect(textExtractor.extractTextFromImage).toHaveBeenCalledWith(Buffer.from("img"), "image/png");
    expect(finalTextBuilder.buildFinalText).toHaveBeenCalledWith("extracted");
    expect(imageStorage.uploadImage).toHaveBeenCalledWith(Buffer.from("img"), "upl_testid");
    expect(notifier.broadcastNewResult).toHaveBeenCalled();

    const done = await uploadRepository.getUpload("upl_testid");
    expect(done?.createdAt).toBe(99);
    expect(done?.extractedText).toBe("extracted");
    expect(done?.finalText).toBe("final:extracted");
    expect(done?.imageUrl).toBe("https://img");
    expect(done?.cloudinaryPublicId).toBe("pid");
    expect(done?.updatedAt).toBe(99);
  });

  it("persists failure and emits error when the pipeline throws", async () => {
    const uploadRepository = new InMemoryUploadRepository();
    const textExtractor = {
      extractTextFromImage: vi.fn(async () => {
        throw new Error("vision failed");
      })
    };
    const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
    const emit = vi.fn();

    const service = new ImportService({
      uploadRepository,
      textExtractor,
      finalTextBuilder: { buildFinalText: vi.fn(async () => "") },
      imageStorage: { uploadImage: vi.fn(async () => ({ imageUrl: "u", cloudinaryPublicId: "p" })) },
      notifier: { broadcastNewResult: vi.fn() },
      logger,
      now: () => 7,
      generateUploadId: () => "upl_fail"
    });

    await service.streamImport({ imageBuffer: Buffer.from("x"), imageMimeType: "image/jpeg" }, emit);

    expect(emit.mock.calls.map((c) => c[0])).toEqual([
      { status: "extracting_text" },
      { error: { code: "INTERNAL_ERROR", message: "vision failed" } }
    ]);

    const row = await uploadRepository.getUpload("upl_fail");
    expect(row?.errorMessage).toBe("vision failed");
    expect(row?.updatedAt).toBe(7);
    expect(logger.error).toHaveBeenCalled();
  });

  it("emits ApiError code when pipeline throws ApiError", async () => {
    const uploadRepository = new InMemoryUploadRepository();
    const emit = vi.fn();
    const service = new ImportService({
      uploadRepository,
      textExtractor: {
        extractTextFromImage: vi.fn(async () => {
          throw new ApiError(503, "UPSTREAM", "nim down");
        })
      },
      finalTextBuilder: { buildFinalText: vi.fn() },
      imageStorage: { uploadImage: vi.fn(async () => ({ imageUrl: "u", cloudinaryPublicId: "p" })) },
      notifier: { broadcastNewResult: vi.fn() },
      logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
      generateUploadId: () => "upl_api"
    });

    await service.streamImport({ imageBuffer: Buffer.from("x"), imageMimeType: "image/png" }, emit);

    expect(emit).toHaveBeenLastCalledWith({
      error: { code: "UPSTREAM", message: "nim down" }
    });
  });
});
