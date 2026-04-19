# OpenAI API - implementation notes

Key references:

- [OpenAI API overview](https://developers.openai.com/api/reference/overview)
- [Responses API reference](https://developers.openai.com/api/reference/responses)
- [Text generation guide](https://developers.openai.com/api/docs/guides/text)

Verified against the official docs on 2026-04-19.

## Current repo status

The backend calls OpenAI GPT-4o for image text extraction from **`OpenAIGpt4oImageTextExtractor`** in `backend/src/libs/openai/gpt-4o-image-text-extractor.ts`. The extractor uses the Responses API through the official `openai` Node SDK and sends the current `extractTextPrompt` plus the uploaded image as a data URL.

The final text stage still uses NVIDIA Integrate in:

- `backend/src/libs/nvidia/api.client.ts`
- `backend/src/libs/nvidia/step-3.5-flash.ts`

## Prereqs

- `OPENAI_API_KEY` in the server environment.
- Runtime dependency `openai`.
- Keep API keys server-side only. Do not expose OpenAI API keys in mobile, browser, or committed files.

Install:

```bash
cd backend
npm i openai
```

Suggested env addition:

```ts
export type ServerEnv = {
  // ...
  OPENAI_API_KEY: string;
};
```

## Recommended API

Use the **Responses API** for direct model calls. The official text generation guide uses `client.responses.create(...)` and reads generated text through `response.output_text`.

Minimal Node example:

```ts
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const response = await client.responses.create({
  model: "gpt-4o",
  input: "Rewrite this text into a concise final answer."
});

const text = response.output_text;
```

Use `instructions` for high-level behavior and keep user data in `input`:

```ts
const response = await client.responses.create({
  model: "gpt-4o",
  instructions: "Return only the final plain-text answer. Do not include markdown.",
  input: extractedText
});
```

## Vision input

The production extractor passes an input message with text plus an image input. Cloudinary upload remains separate; the model call receives the image bytes as a base64 data URL.

```ts
const imageBase64 = imageBuffer.toString("base64");

const response = await client.responses.create({
  model: "gpt-4o",
  input: [
    {
      role: "user",
      content: [
        { type: "input_text", text: extractPrompt },
        {
          type: "input_image",
          image_url: `data:${imageMimeType};base64,${imageBase64}`,
          detail: "auto"
        }
      ]
    }
  ]
});
```

## Streaming

For SSE-style responses, set `stream: true` on the Responses API request and forward text deltas through the existing SSE utility. Keep the controller contract stable: the `/import` endpoint should continue emitting Grim-specific status/data events rather than exposing raw OpenAI events directly.

## Error handling and observability

- Log OpenAI request IDs when available. The API overview documents `x-request-id` and rate-limit headers for production debugging.
- Do not persist raw prompts, images, or extracted text in logs.
- Treat rate limits and upstream model failures as transient dependency failures.
- Pin model versions when output stability matters, and cover prompt behavior with evals or focused unit tests.

## Fit for Grim

The provider lives under `backend/src/libs/openai/`:

- `gpt-4o-image-text-extractor.ts` implements `ImageTextExtractor`.

That keeps the existing `ImportService` dependency contract unchanged and makes provider switching a server composition concern in `backend/src/server.ts`.
