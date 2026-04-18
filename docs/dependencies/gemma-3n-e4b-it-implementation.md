# Gemma 3n e4b IT (NVIDIA Integrate) - implementation notes

Key references:
- [NVIDIA API reference: `google/gemma-3n-e4b-it`](https://docs.api.nvidia.com/nim/reference/google-gemma-3n-e4b-it-infer)
- [NVIDIA model card: `google/gemma-3n-e4b-it`](https://build.nvidia.com/google/gemma-3n-e4b-it/modelcard)

Verified against the official docs on 2026-04-18.

## Current repo status

The backend calls this model from **`NvidiaGemmaTextExtractor`** in `backend/src/libs/nvidia/gemma-3n-e4b-it.ts`, using **`postNvidiaChatCompletion`** in `backend/src/libs/nvidia/api.client.ts` against the same Integrate chat-completions URL as in the example below.

## Prereqs

```bash
export NVAPI_KEY="nvapi-..."
cd backend
npm i axios
```

## What this model is used for

Use Gemma for the image-understanding step:
- extract text from the image
- optionally describe the image briefly if there is little text

## Important NVIDIA note

NVIDIA's current API supports inline images with:

```html
<img src="data:image/png;base64,..." />
```

If the inline payload is larger than 200KB, the current docs say to use an uploaded NVCF asset instead of a large inline data URL.

## Simple example

```ts
import axios from "axios";

const invokeUrl = "https://integrate.api.nvidia.com/v1/chat/completions";

export async function extractTextFromImage(imageBytes: Buffer, mimeType: string) {
  const apiKey = process.env.NVAPI_KEY;
  if (!apiKey) {
    throw new Error("Missing NVAPI_KEY");
  }

  const imageB64 = imageBytes.toString("base64");

  const response = await axios.post(
    invokeUrl,
    {
      model: "google/gemma-3n-e4b-it",
      messages: [
        {
          role: "user",
          content: [
            "Extract the visible text from this image.",
            "If there is no useful text, say that clearly.",
            `<img src="data:${mimeType};base64,${imageB64}" />`
          ].join("\n")
        }
      ],
      max_tokens: 512,
      temperature: 0.2,
      top_p: 0.7,
      stream: false
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json"
      }
    }
  );

  return response.data?.choices?.[0]?.message?.content ?? "";
}
```

## Notes

- `stream: false` is the simplest starting point.
- Use the real image MIME type instead of hardcoding `image/png`.
- If you need structured output, ask for JSON in the prompt and parse it carefully.
