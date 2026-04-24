# OpenAI-compatible LLM providers via OpenAI SDK - implementation notes

Grim uses one adapter implementation for both import stages:

- image text extraction
- final text generation from the extracted text

The backend uses the official `openai` Node SDK and selects an OpenAI-compatible provider at runtime.

## Current repo status

Implementation lives in `backend/src/libs/llm/text-processor.ts`.

Runtime composition happens in `backend/src/server.ts`.

Primary env surface:

- `EXTRACT_LLM_PROVIDER` / `EXTRACT_LLM_API_KEY` / `EXTRACT_LLM_MODEL`
- `FINAL_LLM_PROVIDER` / `FINAL_LLM_API_KEY` / `FINAL_LLM_MODEL`
- `EXTRACT_LLM_BASE_URL` / `FINAL_LLM_BASE_URL` — optional for OpenRouter and OpenAI, required for NVIDIA NIM

Optional shared defaults:

- `LLM_PROVIDER`
- `LLM_API_KEY`
- `LLM_MODEL`
- `LLM_BASE_URL`

Legacy compatibility:

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `OPENROUTER_IMAGE_MODEL`

These legacy vars are still accepted when neither the stage-specific nor shared `LLM_*` vars are set.

The adapter uses the same SDK class for every provider:

```ts
new OpenAI({
  apiKey,
  ...(baseURL ? { baseURL } : {})
});
```

Current defaults:

- OpenRouter defaults to `https://openrouter.ai/api/v1` when a stage does not set `*_LLM_BASE_URL`
- OpenRouter defaults to `openrouter/free` when a stage does not set `*_LLM_MODEL`
- OpenAI uses the SDK default base URL when a stage does not set `*_LLM_BASE_URL`
- NVIDIA NIM requires an explicit stage base URL pointing at the deployed `/v1` API
- When both stages share a provider, shared `LLM_*` vars can provide defaults that each stage inherits

## Import pipeline fit

`ImportService` keeps provider details behind ports:

- `textExtractor.extractTextFromImage(...)`
- `finalTextBuilder.buildFinalText(...)`

The extract and final stages can be backed by different provider configs, but both use the same adapter class. The adapter returns opaque strings. The current prompts ask for structured JSON, but the HTTP API stores and returns `extractedText` and `finalText` as strings because model output format is prompt-controlled.

Pipeline order stays:

1. Cloudinary image upload.
2. LLM image text extraction.
3. LLM final text generation.
4. Realtime Database write under `uploads/{id}`.
5. FCM success signals.

## Health check

`backend/src/api/v1/services/health.service.ts` checks both stage configs by building SDK clients from resolved env and calling `models.list()`.

The public health JSON reports this dependency under `llm`; that field is an aggregate over the extract and final stage configs.

## Notes

- `chat.completions.create(...)` remains the shared request path because it is supported across the current providers used by this repo.
- Keep API keys server-side only.
- Prefer changing provider config over adding provider-specific orchestration paths unless behavior genuinely diverges.

---

**Updated:** 2026-04-24
**Applies to:** grim backend (`backend/src/libs/llm/`, `backend/package.json` -> version `0.1.0`)
**Doc version:** 1
**Upstream refs:**
- https://platform.openai.com/docs/libraries/javascript
- https://openrouter.ai/docs/guides/community/openai-sdk
- https://docs.nvidia.com/nim/large-language-models/latest/reference/api-reference.html
- https://docs.nvidia.com/nim/vision-language-models/latest/api-reference.html
