# Step-3.5-Flash (NVIDIA Integrate) - implementation notes

Key references:

- [NVIDIA API reference: `stepfun-ai / step-3-5-flash`](https://docs.api.nvidia.com/nim/reference/stepfun-ai-step-3-5-flash)
- [NVIDIA model card: `step-3.5-flash`](https://build.nvidia.com/stepfun-ai/step-3.5-flash/modelcard)

Verified against the official docs on 2026-04-18.

## Current repo status

The backend calls this model from **`NvidiaStepFinalTextBuilder`** in `backend/src/libs/nvidia/step-3.5-flash.ts`, which uses **`postNvidiaChatCompletion`** in `backend/src/libs/nvidia/api.client.ts` (`axios` `POST` to `https://integrate.api.nvidia.com/v1/chat/completions` with header `Authorization: Bearer <NVAPI_KEY>`, same OpenAI-compatible JSON shape as other chat completion APIs on NVIDIA Integrate).

## Prereqs

- `NVAPI_KEY` in the server environment (see `backend/src/libs/configs/env.config.ts`)
- Runtime dependency **`axios`** (already used elsewhere in the backend)

## Role

Runs after Gemma has produced extracted text: rewrite / normalize into the final user-facing string.

## Notes

- Request uses `stream: false`.
- Response parsing is shared with Gemma-style payloads via `parseStepFinalText` / `parseGemmaExtractedText` (aliases of `parseChatCompletionContent`) and `normalizeAssistantContent` in `backend/src/libs/nvidia/api.client.ts`.
