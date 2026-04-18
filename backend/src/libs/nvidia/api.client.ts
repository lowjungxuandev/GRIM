import axios from "axios";
import type { Readable } from "node:stream";

export const NVIDIA_INTEGRATE_CHAT_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

export async function postNvidiaChatCompletion(
  apiKey: string,
  body: Record<string, unknown>
): Promise<unknown> {
  const { data } = await axios.post(NVIDIA_INTEGRATE_CHAT_URL, body, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" }
  });
  return data;
}

/**
 * Returns concatenated `choices[0].delta.content` from one OpenAI-style SSE `data:` line.
 * Exported for unit tests.
 */
export function extractDeltaFromSseEventLine(line: string): string {
  const t = line.trimEnd();
  if (!t || t.startsWith(":")) {
    return "";
  }
  if (!t.startsWith("data:")) {
    return "";
  }
  const payload = t.slice(5).trimStart();
  if (payload === "[DONE]") {
    return "";
  }
  try {
    const json = JSON.parse(payload) as {
      choices?: Array<{ delta?: { content?: unknown }; message?: { content?: unknown } }>;
    };
    const delta = json.choices?.[0]?.delta?.content;
    if (delta !== undefined && delta !== null) {
      return typeof delta === "string" ? delta : normalizeAssistantContent(delta);
    }
    const message = json.choices?.[0]?.message?.content;
    if (message !== undefined && message !== null) {
      return typeof message === "string" ? message : normalizeAssistantContent(message);
    }
  } catch {
    return "";
  }
  return "";
}

export async function postNvidiaChatCompletionStream(
  apiKey: string,
  body: Record<string, unknown>
): Promise<string> {
  const { data, status } = await axios.post<Readable>(NVIDIA_INTEGRATE_CHAT_URL, body, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "text/event-stream",
      "Content-Type": "application/json"
    },
    responseType: "stream",
    validateStatus: () => true
  });

  if (status < 200 || status >= 300) {
    const errText = await readStreamToString(data);
    throw new Error(
      `NVIDIA chat completions returned HTTP ${status}${errText ? `: ${errText.slice(0, 500)}` : ""}`
    );
  }

  return consumeSseAssistantTextStream(data);
}

async function readStreamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function consumeSseAssistantTextStream(stream: Readable): Promise<string> {
  let assembled = "";
  let lineBuffer = "";

  await new Promise<void>((resolve, reject) => {
    stream.on("data", (chunk: Buffer | string) => {
      lineBuffer += typeof chunk === "string" ? chunk : chunk.toString("utf8");
      const parts = lineBuffer.split(/\r?\n/);
      lineBuffer = parts.pop() ?? "";
      for (const line of parts) {
        assembled += extractDeltaFromSseEventLine(line);
      }
    });
    stream.on("end", () => {
      if (lineBuffer.length > 0) {
        for (const line of lineBuffer.split(/\r?\n/)) {
          assembled += extractDeltaFromSseEventLine(line);
        }
      }
      resolve();
    });
    stream.on("error", reject);
  });

  return assembled.trim();
}

/** Normalizes `choices[0].message.content` from NVIDIA-style chat completion JSON. */
export function normalizeAssistantContent(content: unknown): string {
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

export function parseChatCompletionContent(payload: unknown): string {
  return normalizeAssistantContent(
    (payload as { choices?: Array<{ message?: { content?: unknown } }> })?.choices?.[0]?.message
      ?.content
  );
}
