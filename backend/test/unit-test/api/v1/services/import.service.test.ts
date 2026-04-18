import { describe, expect, it, vi } from "vitest";
import { ImportService } from "../../../../../src/api/v1/services/import.service";
import { InMemoryUploadRepository } from "../../../../in-memory-upload-repository";

describe("ImportService", () => {
  it("returns empty body immediately, then completes storage → extract → rewrite → RTDB → notifier", async () => {
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

    const res = await service.acceptImport({
      imageBuffer: Buffer.from("img"),
      imageMimeType: "image/png"
    });
    expect(res).toEqual({});

    await vi.waitFor(async () => {
      const row = await uploadRepository.getUpload("upl_testid");
      expect(row?.finalText).toBe("final:extracted");
    });

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

  it("persists failure when the pipeline throws", async () => {
    const uploadRepository = new InMemoryUploadRepository();
    const textExtractor = {
      extractTextFromImage: vi.fn(async () => {
        throw new Error("vision failed");
      })
    };
    const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };

    const service = new ImportService({
      uploadRepository,
      textExtractor,
      finalTextBuilder: { buildFinalText: vi.fn(async () => "") },
      imageStorage: { uploadImage: vi.fn() },
      notifier: { broadcastNewResult: vi.fn() },
      logger,
      now: () => 7,
      generateUploadId: () => "upl_fail"
    });

    await service.acceptImport({ imageBuffer: Buffer.from("x"), imageMimeType: "image/jpeg" });

    await vi.waitFor(async () => {
      const row = await uploadRepository.getUpload("upl_fail");
      expect(row?.errorMessage).toBe("vision failed");
    });

    const row = await uploadRepository.getUpload("upl_fail");
    expect(row?.updatedAt).toBe(7);
    expect(logger.error).toHaveBeenCalled();
  });
});
