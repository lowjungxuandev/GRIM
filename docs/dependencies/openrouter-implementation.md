# OpenRouter via OpenAI SDK - implementation notes

Grim uses OpenRouter for both import LLM stages:

- image text extraction
- final text generation from the extracted text

The backend does not call the OpenAI API directly. It uses the official `openai` Node SDK with OpenRouter's OpenAI-compatible base URL.

## Current repo status

Implementation lives in `backend/src/libs/openrouter/text-processor.ts`.

Runtime composition happens in `backend/src/server.ts`:

- `OPENROUTER_API_KEY` is required.
- `OPENROUTER_MODEL` is optional and defaults to `openrouter/free`.
- `OPENROUTER_IMAGE_MODEL` is a legacy alias used only when `OPENROUTER_MODEL` is unset.
- Both `ImageTextExtractor` and `FinalTextBuilder` are served by the same `OpenRouterTextProcessor`.

The processor creates:

```ts
new OpenAI({
  apiKey,
  baseURL: "https://openrouter.ai/api/v1"
});
```

This matches OpenRouter's documented OpenAI SDK integration.

## Import pipeline fit

`ImportService` keeps provider details behind ports:

- `textExtractor.extractTextFromImage(...)`
- `finalTextBuilder.buildFinalText(...)`

The OpenRouter adapter returns opaque strings. The current prompts ask for structured JSON, but the HTTP API stores and returns `extractedText` and `finalText` as strings because model output format is prompt-controlled.

Pipeline order stays:

1. Cloudinary image upload.
2. OpenRouter image text extraction.
3. OpenRouter final text generation.
4. Realtime Database write under `uploads/{id}`.
5. FCM success signals.

## Health check

`backend/src/api/v1/services/health.service.ts` checks OpenRouter by creating the same SDK client with the OpenRouter base URL and calling `models.list()`.

## Notes

- Keep the OpenRouter API key server-side only.
- Do not add removed provider env vars back to runtime docs unless code starts reading them again.
- If OpenRouter returns provider-specific errors for a routed model, switch `OPENROUTER_MODEL` rather than adding a second vendor adapter.

---

**Updated:** 2026-04-19
**Applies to:** grim backend (`backend/src/libs/openrouter/`, `backend/package.json` -> version `0.1.0`)
**Doc version:** 1
**Upstream refs:**
- https://openrouter.ai/docs/guides/community/openai-sdk
