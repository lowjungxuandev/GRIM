import { describe, expect, it } from "vitest";
import { v2 as cloudinary } from "cloudinary";
import {
  CloudinaryImageStore,
  configureCloudinarySecure,
  mapCloudinaryUpload,
  pingCloudinary
} from "../../../../src/libs/cloudinary/utils";

/** 1×1 transparent PNG */
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

describe("configureCloudinarySecure", () => {
  it("runs without error (uses CLOUDINARY_URL from .env)", () => {
    expect(() => configureCloudinarySecure()).not.toThrow();
  });
});

describe("mapCloudinaryUpload", () => {
  it("maps public_id and secure_url", () => {
    expect(
      mapCloudinaryUpload({
        public_id: "grim/x",
        secure_url: "https://res.cloudinary.com/x"
      })
    ).toEqual({
      cloudinaryPublicId: "grim/x",
      imageUrl: "https://res.cloudinary.com/x"
    });
  });

  it("throws when the upload response is incomplete", () => {
    expect(() => mapCloudinaryUpload(undefined)).toThrow(/public ID/);
    expect(() => mapCloudinaryUpload({ public_id: "", secure_url: "u" })).toThrow();
  });
});

describe("pingCloudinary", () => {
  it("succeeds against the configured Cloudinary account", async () => {
    await expect(pingCloudinary()).resolves.toBeUndefined();
  });
});

describe("CloudinaryImageStore", () => {
  it("uploads a buffer and returns mapped URLs, then deletes the asset", async () => {
    const publicId = `vitest_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const store = new CloudinaryImageStore();
    let uploadedPublicId: string | undefined;
    try {
      const out = await store.uploadImage(PNG_1X1, publicId);
      uploadedPublicId = out.cloudinaryPublicId;
      expect(out.imageUrl).toMatch(/^https:\/\//);
      expect(out.cloudinaryPublicId).toContain(publicId);
    } finally {
      if (uploadedPublicId) {
        await new Promise<void>((resolve, reject) => {
          cloudinary.uploader.destroy(uploadedPublicId!, (err) => (err ? reject(err) : resolve()));
        });
      }
    }
  });
});
