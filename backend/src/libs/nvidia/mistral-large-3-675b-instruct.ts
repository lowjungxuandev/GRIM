import type { ImageTextExtractor } from "../../api/v1/model/services.model";
import { postNvidiaChatCompletionStream } from "./api.client";

const MISTRAL_LARGE_MODEL = "mistralai/mistral-large-3-675b-instruct-2512";

export class NvidiaMistralLargeTextExtractor implements ImageTextExtractor {
  constructor(
    private readonly apiKey: string,
    private readonly getExtractPromptText: () => string
  ) {}

  async extractTextFromImage(imageBuffer: Buffer, imageMimeType: string): Promise<string> {
    const imageBase64 = imageBuffer.toString("base64");
    const instruction = this.getExtractPromptText().trimEnd();
    return postNvidiaChatCompletionStream(this.apiKey, {
      model: MISTRAL_LARGE_MODEL,
      messages: [
        {
          role: "user",
          content: [instruction, `<img src="data:${imageMimeType};base64,${imageBase64}" />`].join("\n\n")
        }
      ],
      max_tokens: 4096,
      temperature: 0.15,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
      stream: true
    });
  }
}
