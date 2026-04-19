# Backend API specification (v1)

- `GET /health`
- `POST /api/v1/import`
- `GET /api/v1/export`

Authoritative request/response shapes: **`backend/openapi.yaml`** (served at `GET /openapi.yaml` when the server runs).

## `GET /health`

Integration checks (Firebase Realtime Database, OpenRouter, Cloudinary). Returns **200** when `ok` is true, **503** when `ok` is false. Response body matches OpenAPI schema **`IntegrationHealthReport`**.

## `POST /api/v1/import`

- `multipart/form-data`, required field **`image`**
- **200** with **`Content-Type: text/event-stream`** — Server-Sent Events until the pipeline finishes. Each `data:` line is JSON: first `{"status":"extracting_text"}`, then `{"status":"analyzing_text"}`, then either the success row (`id`, `createdAt`, `updatedAt`, `extractedText`, `finalText`, `imageUrl`, `cloudinaryPublicId`) or a terminal `{"error":{"code","message"}}`.
- Pipeline order on the server: **Cloudinary** (image) → **OpenRouter** (image text extraction) → **OpenRouter** (final text) → **Realtime Database** (one write under `uploads/{id}`) → **FCM** topic broadcast only after a successful DB write
- FCM defaults to topic name `grim_new_result` (override with server env `GRIM_FCM_TOPIC` — see `backend/src/libs/configs/env.config.ts` and `backend/src/libs/firebase/fcm.ts`)

Typical errors: **400**, **413**, **415**, **500** — codes and messages match OpenAPI `ErrorBody` examples.

## `GET /api/v1/export`

- Optional query **`page`** and **`limit`** (defaults and max: OpenAPI)
- **200** with `{ "data": [ ... ], "page", "limit", "is_next" }` — ordering and per-item fields: OpenAPI **`ExportListItem`**
