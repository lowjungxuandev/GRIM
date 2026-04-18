import { describe, expect, it } from "vitest";
import { loadServerEnv } from "../../../../src/libs/configs/env.config";
import { NvidiaGemmaTextExtractor, parseGemmaExtractedText } from "../../../../src/libs/nvidia/gemma-3n-e4b-it";

/** 1×1 transparent PNG */
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

describe("NvidiaGemmaTextExtractor", () => {
  it("returns a string from the live Gemma vision model", async () => {
    const env = loadServerEnv();
    const extractor = new NvidiaGemmaTextExtractor(env.NVAPI_KEY);
    const text = await extractor.extractTextFromImage(PNG_1X1, "image/png");
    expect(typeof text).toBe("string");
  });
});

describe("parseGemmaExtractedText", () => {
  it("aliases parseChatCompletionContent", () => {
    expect(parseGemmaExtractedText({ choices: [{ message: { content: "y" } }] })).toBe("y");
  });
});
