import type { GrimUpload, GrimUploadRow, ImportRequest, ImportStreamSseData } from "./import.model";

export type UploadedImage = {
  imageUrl: string;
  cloudinaryPublicId: string;
};

export interface UploadRepository {
  createPendingUpload(id: string, upload: GrimUpload): Promise<void>;
  updateUpload(id: string, updates: Partial<GrimUpload>): Promise<void>;
  getUpload(id: string): Promise<GrimUploadRow | null>;
  listUploads(limit: number): Promise<GrimUploadRow[]>;
}

export interface ImageTextExtractor {
  extractTextFromImage(imageBuffer: Buffer, imageMimeType: string): Promise<string>;
}

export interface FinalTextBuilder {
  buildFinalText(extractedText: string): Promise<string>;
}

export interface ImageStorage {
  uploadImage(imageBuffer: Buffer, publicId: string): Promise<UploadedImage>;
}

export interface ResultNotifier {
  broadcastNewResult(): Promise<void>;
  broadcastCaptureRequest(): Promise<void>;
  broadcastExportRefresh(): Promise<void>;
}

export type Logger = Pick<Console, "error" | "warn" | "info">;

export type ImportServiceDependencies = {
  uploadRepository: UploadRepository;
  textExtractor: ImageTextExtractor;
  finalTextBuilder: FinalTextBuilder;
  imageStorage: ImageStorage;
  notifier: ResultNotifier;
  logger?: Logger;
  now?: () => number;
  generateUploadId?: () => string;
};

export type ImportStreamEmitter = (data: ImportStreamSseData) => void;

export interface ImportService {
  streamImport(request: ImportRequest, emit: ImportStreamEmitter): Promise<void>;
}

export interface CaptureService {
  sendCaptureNotification(): Promise<void>;
}
