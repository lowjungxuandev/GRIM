# Mistral Large 3 675B Instruct (NVIDIA Integrate) — implementation notes

Key references:

- [NVIDIA Integrate chat completions](https://docs.api.nvidia.com/nim/reference/llm-apis) (OpenAI-compatible `POST /v1/chat/completions`)
- Model id: **`mistralai/mistral-large-3-675b-instruct-2512`**

Verified against NVIDIA Integrate usage on 2026-04-19.

## Current repo status

The backend calls this model from **`NvidiaMistralLargeTextExtractor`** in `backend/src/libs/nvidia/mistral-large-3-675b-instruct.ts`, using **`postNvidiaChatCompletionStream`** in `backend/src/libs/nvidia/api.client.ts` (`axios` `POST` to `https://integrate.api.nvidia.com/v1/chat/completions` with **`Accept: text/event-stream`**, **`stream: true`**, and SSE `data:` lines aggregated into the final assistant string).

Non-streaming JSON completions still use **`postNvidiaChatCompletion`** with **`Accept: application/json`** (for example Step in `step-3.5-flash.ts`).

## Prereqs

- `NVAPI_KEY` in the server environment (see `backend/src/libs/configs/env.config.ts`)
- Runtime dependency **`axios`**

## What this model is used for

Vision extract step on the import pipeline:

- User message = current **`extractTextPrompt`** (from `extract_text_prompt.txt` or `PUT /api/v1/prompts`) plus a blank line and an inline image:

```html
<img src="data:{mime};base64,{...}" />
```

- Default prompt asks for **only JSON** (array of questions with `question`, `options`, `type`).

## Streaming vs JSON `Accept` header

When **`stream`** is **`true`**, the Integrate API expects:

```http
Accept: text/event-stream
```

When **`stream`** is **`false`**, use:

```http
Accept: application/json
```

The backend applies this split inside **`postNvidiaChatCompletionStream`** vs **`postNvidiaChatCompletion`**.

## Shell example (curl)

Use your real key from the environment; do not commit secrets.

```bash
stream=true

if [ "$stream" = true ]; then
    accept_header='Accept: text/event-stream'
else
    accept_header='Accept: application/json'
fi

image_b64=$( base64 < image.png | tr -d '\n' )

jq -n \
  --arg img "$image_b64" \
  '{
    "model": "mistralai/mistral-large-3-675b-instruct-2512",
    "messages": [
      {
        "role": "user",
        "content": ("…prompt text…\n\n" + "<img src=\"data:image/png;base64," + $img + "\" />")
      }
    ],
    "max_tokens": 2048,
    "temperature": 0.15,
    "top_p": 1.00,
    "frequency_penalty": 0.00,
    "presence_penalty": 0.00,
    "stream": true
  }' > payload.json

curl https://integrate.api.nvidia.com/v1/chat/completions \
  -H "Authorization: Bearer ${NVAPI_KEY}" \
  -H "Content-Type: application/json" \
  -H "$accept_header" \
  -d @payload.json
```

For **`stream: true`**, the response body is SSE: concatenate `choices[0].delta.content` from each `data:` JSON object until `data: [DONE]`.

## Notes

- Request parameters (`max_tokens`, `temperature`, `top_p`, penalties) match the production extractor in `mistral-large-3-675b-instruct.ts`.
- Large inline images: if you hit size limits, consider NVIDIA’s asset upload flow described in their docs instead of a huge data URL.
