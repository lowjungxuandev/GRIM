import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/libs/utils/api-error.util";
import { buildTestApp, createImportServiceWithStubbedPipeline } from "../test-utils";
import { InMemoryUploadRepository } from "../in-memory-upload-repository";

describe("POST /api/v1/import (HTTP integration)", () => {
  it("returns 202 with an empty JSON object for a valid image upload", async () => {
    const acceptImport = vi.fn(async () => ({}));
    const app = buildTestApp({ importService: { acceptImport } });
    const res = await request(app)
      .post("/api/v1/import")
      .attach("image", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), {
        filename: "pixel.png",
        contentType: "image/png"
      })
      .expect(202);
    expect(res.body).toEqual({});
    expect(acceptImport).toHaveBeenCalledTimes(1);
    const arg = acceptImport.mock.calls[0]![0];
    expect(arg.imageMimeType).toBe("image/png");
    expect(Buffer.isBuffer(arg.imageBuffer)).toBe(true);
  });

  it("accepts .jpg when the client sends application/octet-stream (infers image/jpeg)", async () => {
    const acceptImport = vi.fn(async () => ({}));
    const app = buildTestApp({ importService: { acceptImport } });
    await request(app)
      .post("/api/v1/import")
      .attach("image", Buffer.from([0xff, 0xd8, 0xff]), {
        filename: "photo.jpg",
        contentType: "application/octet-stream"
      })
      .expect(202);
    expect(acceptImport).toHaveBeenCalledTimes(1);
    const arg = acceptImport.mock.calls[0]![0];
    expect(arg.imageMimeType).toBe("image/jpeg");
  });

  it("wires multipart into ImportService with stubbed pipeline deps (no vendors)", async () => {
    const repo = new InMemoryUploadRepository();
    const importService = createImportServiceWithStubbedPipeline({ uploadRepository: repo });
    const app = buildTestApp({ importService });
    await request(app)
      .post("/api/v1/import")
      .attach("image", Buffer.from("fake-jpeg"), { filename: "x.jpg", contentType: "image/jpeg" })
      .expect(202);
    await vi.waitFor(async () => {
      const row = await repo.getUpload("integration_upload_id");
      expect(row).not.toBeNull();
    });
    const row = await repo.getUpload("integration_upload_id");
    expect(row).toMatchObject({
      id: "integration_upload_id",
      createdAt: 4242,
      updatedAt: 4242,
      finalText: "final:extracted"
    });
  });

  it("returns 400 INVALID_REQUEST when the image field is missing", async () => {
    const app = buildTestApp();
    const res = await request(app).post("/api/v1/import").expect(400);
    expect(res.body).toEqual({
      error: { code: "INVALID_REQUEST", message: "image is required" }
    });
  });

  it("returns 415 when the file is not an image (multer fileFilter)", async () => {
    const app = buildTestApp();
    const res = await request(app)
      .post("/api/v1/import")
      .attach("image", Buffer.from("%PDF-1.4"), { filename: "x.pdf", contentType: "application/pdf" })
      .expect(415);
    expect(res.body).toEqual({
      error: { code: "UNSUPPORTED_FILE_TYPE", message: "Only image uploads are supported" }
    });
  });

  it("maps ApiError from acceptImport through the global error handler", async () => {
    const app = buildTestApp({
      importService: {
        acceptImport: async () => {
          throw new ApiError(409, "CONFLICT", "upload id collision");
        }
      }
    });
    const res = await request(app)
      .post("/api/v1/import")
      .attach("image", Buffer.from([0xff, 0xd8, 0xff]), { filename: "m.jpg", contentType: "image/jpeg" })
      .expect(409);
    expect(res.body).toEqual({
      error: { code: "CONFLICT", message: "upload id collision" }
    });
  });
});
