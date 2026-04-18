import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import type { ImageStorage, UploadedImage } from "../../api/v1/model/services.model";

export function configureCloudinarySecure(): void {
  cloudinary.config({ secure: true });
}

export function mapCloudinaryUpload(
  result: Pick<UploadApiResponse, "public_id" | "secure_url"> | undefined
): UploadedImage {
  if (!result?.public_id || !result.secure_url) {
    throw new Error("Cloudinary upload did not return a public ID and secure URL");
  }
  return {
    cloudinaryPublicId: result.public_id,
    imageUrl: result.secure_url
  };
}

export async function pingCloudinary(): Promise<void> {
  configureCloudinarySecure();
  await new Promise<void>((resolve, reject) => {
    cloudinary.api.ping((error) => (error ? reject(error) : resolve()));
  });
}

export class CloudinaryImageStore implements ImageStorage {
  constructor() {
    configureCloudinarySecure();
  }

  async uploadImage(imageBuffer: Buffer, publicId: string): Promise<UploadedImage> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: "grim", public_id: publicId, resource_type: "image" },
          (error, result) => {
            if (error) {
              reject(error);
              return;
            }
            try {
              resolve(mapCloudinaryUpload(result));
            } catch (mappingError) {
              reject(mappingError);
            }
          }
        )
        .end(imageBuffer);
    });
  }
}
