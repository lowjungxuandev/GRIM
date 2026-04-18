import fs from "node:fs";
import path from "node:path";
import { ApiError } from "./api-error.util";

export type PromptBundle = {
  extractTextPrompt: string;
  analyzingTextPrompt: string;
};

export type PromptUpdateBody = Partial<{
  extractTextPrompt: string;
  analyzingTextPrompt: string;
}>;

export class GrimPromptSettings {
  private extractTextPrompt = "";
  private analyzingTextPrompt = "";

  private constructor(
    private readonly extractPath: string,
    private readonly analyzingPath: string
  ) {
    this.reloadFromDisk();
  }

  /**
   * Loads `extract_text_prompt.txt` and `analyzing_text_prompt.txt` from `promptsDir`.
   */
  static loadFromDirectory(promptsDir: string): GrimPromptSettings {
    const extractPath = path.join(promptsDir, "extract_text_prompt.txt");
    const analyzingPath = path.join(promptsDir, "analyzing_text_prompt.txt");
    return new GrimPromptSettings(extractPath, analyzingPath);
  }

  reloadFromDisk(): void {
    try {
      this.extractTextPrompt = fs.readFileSync(this.extractPath, "utf8");
      this.analyzingTextPrompt = fs.readFileSync(this.analyzingPath, "utf8");
    } catch (error) {
      const hint = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to read prompt files: ${hint}`);
    }
  }

  getSnapshot(): PromptBundle {
    return {
      extractTextPrompt: this.extractTextPrompt,
      analyzingTextPrompt: this.analyzingTextPrompt
    };
  }

  getExtractTextPrompt(): string {
    return this.extractTextPrompt;
  }

  getAnalyzingTextPrompt(): string {
    return this.analyzingTextPrompt;
  }

  /**
   * Overwrites one or both prompts on disk and refreshes the in-memory copy.
   */
  updatePrompts(body: PromptUpdateBody): void {
    if (body.extractTextPrompt === undefined && body.analyzingTextPrompt === undefined) {
      throw new ApiError(
        400,
        "INVALID_REQUEST",
        "Provide at least one prompt: JSON keys extractTextPrompt / analyzingTextPrompt, or multipart fields extract_text / analyzing_text (file or text)"
      );
    }

    if (body.extractTextPrompt !== undefined) {
      if (typeof body.extractTextPrompt !== "string") {
        throw new ApiError(400, "INVALID_REQUEST", "extractTextPrompt must be a string");
      }
      fs.writeFileSync(this.extractPath, body.extractTextPrompt, "utf8");
      this.extractTextPrompt = body.extractTextPrompt;
    }

    if (body.analyzingTextPrompt !== undefined) {
      if (typeof body.analyzingTextPrompt !== "string") {
        throw new ApiError(400, "INVALID_REQUEST", "analyzingTextPrompt must be a string");
      }
      fs.writeFileSync(this.analyzingPath, body.analyzingTextPrompt, "utf8");
      this.analyzingTextPrompt = body.analyzingTextPrompt;
    }
  }
}
