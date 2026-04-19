import { describe, expect, it, vi } from "vitest";
import { OpenAIGpt4oImageTextExtractor } from "../../../../src/libs/openai/gpt-4o-image-text-extractor";

describe("OpenAIGpt4oImageTextExtractor", () => {
  it("calls OpenAI GPT-4o with prompt text and a data URL image", async () => {
    const create = vi.fn(async () => ({ output_text: " extracted text \n" }));
    const extractor = new OpenAIGpt4oImageTextExtractor(
      "test-key",
      () => "instruction line\n",
      { responses: { create } }
    );

    const out = await extractor.extractTextFromImage(Buffer.from([1, 2, 3]), "image/jpg");

    expect(out).toBe("extracted text");
    expect(create).toHaveBeenCalledWith({
      model: "gpt-4o",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: "instruction line" },
            {
              type: "input_image",
              image_url: "data:image/jpeg;base64,AQID",
              detail: "auto"
            }
          ]
        }
      ],
      max_output_tokens: 4096,
      temperature: 0.15
    });
  });

  it("returns an empty string when OpenAI returns no text", async () => {
    const create = vi.fn(async () => ({ output_text: null }));
    const extractor = new OpenAIGpt4oImageTextExtractor(
      "test-key",
      () => "instruction",
      { responses: { create } }
    );

    await expect(extractor.extractTextFromImage(Buffer.from("img"), "image/png")).resolves.toBe("");
  });
});
