import OpenAI from "openai";
import type { FinalTextBuilder, ImageTextExtractor } from "../../api/v1/model/services.model";

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
export const OPENROUTER_DEFAULT_IMAGE_MODEL = "openrouter/free";

type OpenRouterMessage =
  | { role: "system"; content: string }
  | {
      role: "user";
      content:
        | string
        | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
    };

type OpenRouterChatResponse = {
  choices?: Array<{ message?: { content?: unknown } }>;
};

type OpenRouterChatClient = {
  chat: {
    completions: {
      create(input: {
        model: string;
        messages: OpenRouterMessage[];
        max_tokens: number;
        temperature: number;
      }): Promise<OpenRouterChatResponse>;
    };
  };
};

export class OpenRouterTextProcessor implements ImageTextExtractor, FinalTextBuilder {
  private readonly client: OpenRouterChatClient;

  constructor(
    apiKey: string,
    private readonly model: string,
    private readonly getExtractPromptText: () => string,
    private readonly getAnalyzingSystemPrompt: () => string,
    client: OpenRouterChatClient = new OpenAI({
      apiKey,
      baseURL: OPENROUTER_BASE_URL
    })
  ) {
    this.client = client;
  }

  async extractTextFromImage(imageBuffer: Buffer, imageMimeType: string): Promise<string> {
    const imageBase64 = imageBuffer.toString("base64");
    const dataUrl = `data:${normalizeImageMimeType(imageMimeType)};base64,${imageBase64}`;
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: this.getExtractPromptText().trimEnd() },
            { type: "image_url", image_url: { url: dataUrl } }
          ]
        }
      ],
      max_tokens: 4096,
      temperature: 0.15
    });

    return normalizeAssistantContent(response.choices?.[0]?.message?.content);
  }

  async buildFinalText(extractedText: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: this.getAnalyzingSystemPrompt().trimEnd() },
        {
          role: "user",
          content: extractedText
        }
      ],
      max_tokens: 4096,
      temperature: 0.15
    });

    return normalizeAssistantContent(response.choices?.[0]?.message?.content);
  }
}

function normalizeImageMimeType(imageMimeType: string): string {
  const mimeType = imageMimeType.toLowerCase();
  return mimeType === "image/jpg" ? "image/jpeg" : mimeType;
}

function normalizeAssistantContent(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (typeof part !== "object" || part === null) {
          return "";
        }
        const text = (part as { text?: unknown }).text;
        return typeof text === "string" ? text : "";
      })
      .join("\n")
      .trim();
  }

  return "";
}
