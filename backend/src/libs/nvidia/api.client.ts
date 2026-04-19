import axios from "axios";

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
