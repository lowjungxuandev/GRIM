import { describe, expect, it, vi } from "vitest";
import {
  OPENROUTER_DEFAULT_IMAGE_MODEL,
  OpenRouterImageTextExtractor
} from "../../../../src/libs/openrouter/image-text-extractor";

describe("OpenRouterImageTextExtractor", () => {
  it("calls OpenRouter chat completions with prompt text and a data URL image", async () => {
    const create = vi.fn(async () => ({
      choices: [{ message: { content: " extracted text \n" } }]
    }));
    const extractor = new OpenRouterImageTextExtractor(
      "test-key",
      OPENROUTER_DEFAULT_IMAGE_MODEL,
      () => "instruction line\n",
      { chat: { completions: { create } } }
    );

    const out = await extractor.extractTextFromImage(Buffer.from([1, 2, 3]), "image/jpg");

    expect(out).toBe("extracted text");
    expect(create).toHaveBeenCalledWith({
      model: "openrouter/free",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "instruction line" },
            {
              type: "image_url",
              image_url: { url: "data:image/jpeg;base64,AQID" }
            }
          ]
        }
      ],
      max_tokens: 4096,
      temperature: 0.15
    });
  });

  it("normalizes array content responses", async () => {
    const create = vi.fn(async () => ({
      choices: [{ message: { content: [{ text: "a" }, { text: "b" }] } }]
    }));
    const extractor = new OpenRouterImageTextExtractor(
      "test-key",
      "custom/model",
      () => "instruction",
      { chat: { completions: { create } } }
    );

    await expect(extractor.extractTextFromImage(Buffer.from("img"), "image/png")).resolves.toBe(
      "a\nb"
    );
  });
});
