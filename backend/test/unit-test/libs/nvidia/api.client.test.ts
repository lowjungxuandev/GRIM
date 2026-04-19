import { describe, expect, it } from "vitest";
import { loadServerEnv } from "../../../../src/libs/configs/env.config";
import {
  NVIDIA_INTEGRATE_CHAT_URL,
  normalizeAssistantContent,
  parseChatCompletionContent,
  postNvidiaChatCompletion
} from "../../../../src/libs/nvidia/api.client";

describe("postNvidiaChatCompletion", () => {
  it("POSTs to the NVIDIA integrate endpoint using NVAPI_KEY from .env", async () => {
    const env = loadServerEnv();
    const body = {
      model: "stepfun-ai/step-3.5-flash",
      messages: [{ role: "user", content: "Reply with exactly: OK" }],
      max_tokens: 8,
      stream: false
    };
    const data = (await postNvidiaChatCompletion(env.NVAPI_KEY, body)) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    expect(data?.choices?.length).toBeGreaterThan(0);
    expect(data.choices![0].message).toBeDefined();
    const text = parseChatCompletionContent(data);
    expect(typeof text).toBe("string");
    expect(NVIDIA_INTEGRATE_CHAT_URL).toMatch(/^https:\/\//);
  });
});

describe("normalizeAssistantContent", () => {
  it("trims string content", () => {
    expect(normalizeAssistantContent("  hi  ")).toBe("hi");
  });

  it("joins array parts with newlines and trims", () => {
    expect(
      normalizeAssistantContent([
        "a",
        { text: "b" },
        { text: 1 as unknown as string },
        { other: true }
      ])
    ).toBe("a\nb");
  });

  it("returns empty string for unsupported shapes", () => {
    expect(normalizeAssistantContent(null)).toBe("");
    expect(normalizeAssistantContent(12)).toBe("");
  });
});

describe("parseChatCompletionContent", () => {
  it("reads choices[0].message.content", () => {
    expect(
      parseChatCompletionContent({
        choices: [{ message: { content: "  answer  " } }]
      })
    ).toBe("answer");
  });

  it("returns empty string when payload is malformed", () => {
    expect(parseChatCompletionContent({})).toBe("");
  });
});
