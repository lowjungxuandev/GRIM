export type GrimUpload = {
  createdAt: number;
  updatedAt: number;
  extractedText?: string;
  finalText?: string;
  imageUrl?: string;
  cloudinaryPublicId?: string;
  errorMessage?: string;
};

export type GrimUploadRow = GrimUpload & { id: string };

export type ImportAcceptedResponse = Record<string, never>;

export type ImportRequest = {
  imageBuffer: Buffer;
  imageMimeType: string;
};
