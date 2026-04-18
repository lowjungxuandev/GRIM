import type { FinalTextBuilder } from "../../api/v1/model/services.model";
import { parseChatCompletionContent, postNvidiaChatCompletion } from "./api.client";

export class NvidiaStepFinalTextBuilder implements FinalTextBuilder {
  constructor(private readonly apiKey: string) {}

  async buildFinalText(extractedText: string): Promise<string> {
    const data = await postNvidiaChatCompletion(this.apiKey, {
      model: "stepfun-ai/step-3.5-flash",
      messages: [
        { role: "system", content: "Rewrite the extracted text into the final response." },
        { role: "user", content: extractedText }
      ],
      stream: false
    });
    return parseChatCompletionContent(data);
  }
}

export const parseStepFinalText = parseChatCompletionContent;
