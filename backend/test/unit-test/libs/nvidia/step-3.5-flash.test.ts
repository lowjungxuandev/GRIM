import { describe, expect, it } from "vitest";
import { loadServerEnv } from "../../../../src/libs/configs/env.config";
import { NvidiaStepFinalTextBuilder, parseStepFinalText } from "../../../../src/libs/nvidia/step-3.5-flash";

describe("NvidiaStepFinalTextBuilder", () => {
  it("returns non-empty final text from the live Step model", async () => {
    const env = loadServerEnv();
    const builder = new NvidiaStepFinalTextBuilder(env.NVAPI_KEY);
    const text = await builder.buildFinalText("Summarize in one short phrase: unit tests.");
    expect(text.trim().length).toBeGreaterThan(0);
  });
});

describe("parseStepFinalText", () => {
  it("aliases parseChatCompletionContent", () => {
    expect(parseStepFinalText({ choices: [{ message: { content: "x" } }] })).toBe("x");
  });
});
