import OpenAI from "openai";
import type { ImageTextExtractor } from "../../api/v1/model/services.model";

const GPT_4O_MODEL = "gpt-4o";

type OpenAIResponsesClient = {
  responses: {
    create(input: {
      model: string;
      input: Array<{
        role: "user";
        content: Array<
          | { type: "input_text"; text: string }
          | { type: "input_image"; image_url: string; detail: "auto" }
        >;
      }>;
      max_output_tokens: number;
      temperature: number;
    }): Promise<{ output_text?: string | null }>;
  };
};

export class OpenAIGpt4oImageTextExtractor implements ImageTextExtractor {
  private readonly client: OpenAIResponsesClient;

  constructor(
    apiKey: string,
    private readonly getExtractPromptText: () => string,
    client: OpenAIResponsesClient = new OpenAI({ apiKey })
  ) {
    this.client = client;
  }

  async extractTextFromImage(imageBuffer: Buffer, imageMimeType: string): Promise<string> {
    const imageBase64 = imageBuffer.toString("base64");
    const response = await this.client.responses.create({
      model: GPT_4O_MODEL,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: this.getExtractPromptText().trimEnd() },
            {
              type: "input_image",
              image_url: `data:${normalizeImageMimeType(imageMimeType)};base64,${imageBase64}`,
              detail: "auto"
            }
          ]
        }
      ],
      max_output_tokens: 4096,
      temperature: 0.15
    });

    return (response.output_text ?? "").trim();
  }
}

function normalizeImageMimeType(imageMimeType: string): string {
  const mimeType = imageMimeType.toLowerCase();
  return mimeType === "image/jpg" ? "image/jpeg" : mimeType;
}
