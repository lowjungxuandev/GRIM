# Testing plan

Endpoints to test:

- `GET /health`
- `POST /api/v1/import`
- `GET /api/v1/export`

## Main rule

`POST /api/v1/import` returns **200** with **`text/event-stream`**. The response body is Server-Sent Events: synthetic status lines (`extracting_text`, `analyzing_text`), then a terminal JSON object (success row or `error`).

The handler must wait for **Cloudinary**, **Mistral Large** (vision extract), **Step**, **Realtime Database**, and (on success) **FCM** as part of that same request (stream ends after those steps).

## Unit tests

- request validation for `POST /api/v1/import`
- request validation for `GET /api/v1/export` (for example invalid `limit`)
- Mistral streaming SSE aggregation (`extractDeltaFromSseEventLine` / `postNvidiaChatCompletionStream`)
- Step response parsing
- Realtime DB read and write helpers
- FCM topic broadcast (`broadcastNewResult`) is invoked after a successful pipeline
- pipeline completion persists `finalText` / `imageUrl` on success and error detail on failure
- import stream emits status events in order and a terminal success or error payload

## Integration tests

- `GET /health` returns **200** with the integration report body
- `POST /api/v1/import` returns **200** `text/event-stream` with the expected SSE `data:` sequence when the pipeline is stubbed
- `GET /api/v1/export` returns `data` ordered newest-first with pagination metadata
- after a successful mocked pipeline, export includes `finalText` and `imageUrl` on the matching row
- after a failing mocked pipeline, export includes `errorMessage` on the matching row

## E2E tests

- import image → SSE stream completes → terminal payload includes `finalText` and `imageUrl` → export includes the same row
- import image → provider failure → SSE terminal `error` and export includes `errorMessage` on the matching row
- import image → after a successful pipeline, FCM topic broadcast runs → export still returns the canonical list from the HTTP API

## Tooling

The backend uses Vitest and Supertest (`backend/package.json`).
