import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as apiClient from "../../../../src/libs/nvidia/api.client";
import { NvidiaMistralLargeTextExtractor } from "../../../../src/libs/nvidia/mistral-large-3-675b-instruct";

describe("NvidiaMistralLargeTextExtractor", () => {
  let spy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    spy = vi.spyOn(apiClient, "postNvidiaChatCompletionStream").mockResolvedValue('["ok"]');
  });

  afterEach(() => {
    spy.mockRestore();
  });

  it("calls streamed NVIDIA chat completions with Mistral Large and vision user content", async () => {
    const extractor = new NvidiaMistralLargeTextExtractor("test-key", () => "instruction line");
    const out = await extractor.extractTextFromImage(Buffer.from([1, 2, 3]), "image/png");
    expect(out).toBe('["ok"]');
    expect(spy).toHaveBeenCalledTimes(1);
    const [, body] = spy.mock.calls[0] as [string, Record<string, unknown>];
    expect(body.model).toBe("mistralai/mistral-large-3-675b-instruct-2512");
    expect(body.stream).toBe(true);
    expect(body.max_tokens).toBe(2048);
    expect(body.temperature).toBe(0.15);
    expect(body.top_p).toBe(1.0);
    expect(body.frequency_penalty).toBe(0.0);
    expect(body.presence_penalty).toBe(0.0);
    const messages = body.messages as Array<{ role: string; content: string }>;
    expect(messages[0].role).toBe("user");
    expect(messages[0].content).toContain("instruction line");
    expect(messages[0].content).toContain('<img src="data:image/png;base64,AQID" />');
  });
});
