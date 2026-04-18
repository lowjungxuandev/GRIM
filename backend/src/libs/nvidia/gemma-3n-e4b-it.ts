import type { ImageTextExtractor } from "../../api/v1/model/services.model";
import { parseChatCompletionContent, postNvidiaChatCompletion } from "./api.client";

export class NvidiaGemmaTextExtractor implements ImageTextExtractor {
  constructor(private readonly apiKey: string) {}

  async extractTextFromImage(imageBuffer: Buffer, imageMimeType: string): Promise<string> {
    const imageBase64 = imageBuffer.toString("base64");
    const data = await postNvidiaChatCompletion(this.apiKey, {
      model: "google/gemma-3n-e4b-it",
      messages: [
        {
          role: "user",
          content: [
            "Extract the visible text from this image.",
            "If there is no useful text, say that clearly.",
            `<img src="data:${imageMimeType};base64,${imageBase64}" />`
          ].join("\n")
        }
      ],
      max_tokens: 512,
      temperature: 0.2,
      top_p: 0.7,
      stream: false
    });
    return parseChatCompletionContent(data);
  }
}

export const parseGemmaExtractedText = parseChatCompletionContent;
