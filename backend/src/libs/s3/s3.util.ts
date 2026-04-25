import { randomUUID } from "node:crypto";
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { ImageStorage, UploadedImage } from "../../api/v1/model/services.model";

const DEFAULT_PRESIGN_TTL_SECONDS = 7 * 24 * 3600;

export type S3Config = {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  presignTtlSeconds?: number;
};

export function createS3Client(config: Pick<S3Config, "endpoint" | "accessKeyId" | "secretAccessKey" | "region">) {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  });
}

export async function ensureBucketExists(client: S3Client, bucket: string): Promise<void> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return;
  } catch (error) {
    if (!isNoSuchBucketError(error)) {
      throw error;
    }
  }

  try {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  } catch (error) {
    // Another instance may have created it between our HeadBucket and CreateBucket.
    if (isBucketAlreadyExistsError(error)) {
      return;
    }
    throw error;
  }
}

export async function pingS3(client: S3Client, bucket: string): Promise<void> {
  await ensureBucketExists(client, bucket);
  await client.send(new HeadBucketCommand({ Bucket: bucket }));
}

export class S3ImageStore implements ImageStorage {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly presignTtlSeconds: number;

  constructor(config: S3Config, client?: S3Client) {
    this.client = client ?? createS3Client(config);
    this.bucket = config.bucket;
    this.presignTtlSeconds = config.presignTtlSeconds ?? DEFAULT_PRESIGN_TTL_SECONDS;
  }

  async uploadImage(imageBuffer: Buffer, publicId: string): Promise<UploadedImage> {
    const objectKey = `uploads/${publicId}-${randomUUID().slice(0, 8)}`;

    await ensureBucketExists(this.client, this.bucket);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: imageBuffer
      })
    );

    const imageUrl = await getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      { expiresIn: 7 * 24 * 3600 }
    );

    return { imageUrl, bucket: this.bucket, objectKey };
  }
}

function isNoSuchBucketError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    ("$metadata" in error || "name" in error) &&
    (getErrorName(error) === "NotFound" ||
      getErrorName(error) === "NoSuchBucket" ||
      getErrorCode(error) === "NotFound" ||
      getErrorCode(error) === "NoSuchBucket" ||
      getHttpStatusCode(error) === 404)
  );
}

function isBucketAlreadyExistsError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (getErrorName(error) === "BucketAlreadyOwnedByYou" ||
      getErrorName(error) === "BucketAlreadyExists" ||
      getErrorCode(error) === "BucketAlreadyOwnedByYou" ||
      getErrorCode(error) === "BucketAlreadyExists")
  );
}

function getErrorName(error: object): string | undefined {
  const maybe = (error as { name?: unknown }).name;
  return typeof maybe === "string" ? maybe : undefined;
}

function getErrorCode(error: object): string | undefined {
  const maybe = (error as { Code?: unknown; code?: unknown }).Code ?? (error as { code?: unknown }).code;
  return typeof maybe === "string" ? maybe : undefined;
}

function getHttpStatusCode(error: object): number | undefined {
  const meta = (error as { $metadata?: unknown }).$metadata;
  if (!meta || typeof meta !== "object") return undefined;
  const status = (meta as { httpStatusCode?: unknown }).httpStatusCode;
  return typeof status === "number" ? status : undefined;
}
