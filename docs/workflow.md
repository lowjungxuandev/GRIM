# End-to-end workflow

1. Receiver mobile calls `POST /api/v1/capture`.
2. Backend sends a silent FCM topic data message to sender devices: `kind: capture_request`, `notificationType: silent`, `role: sender`.
3. Sender camera listens for foreground `capture_request` messages, takes a photo, then calls `POST /api/v1/import` with that image.
4. Backend responds **200** with **`text/event-stream`** and streams JSON `data:` lines until processing finishes: progress `{"status":"extracting_text"}` and `{"status":"analyzing_text"}`, then either the full success row (same fields as under `uploads/{id}`) or `{"error":{…}}`.
5. Backend runs the import pipeline in order: **Cloudinary** (store image) → **extract-stage OpenAI-compatible LLM config** (image text extraction) → **final-stage OpenAI-compatible LLM config** (final text) → **Realtime Database** (`uploads/{id}`, one write when the row is ready or on failure). If the pipeline succeeds, it then sends receiver FCM topic signals: visible `kind: new_result` and silent `kind: export_refresh` with `url: /api/v1/export?page=1&limit=20`.
6. Receiver mobile reads canonical list data from `GET /api/v1/export` for newest-first rows (see `backend/openapi.yaml` for `data`, `page`, `limit`, `is_next`). In the current Flutter receiver grid, export refresh is available by pull-to-refresh / reload; the backend FCM payload carries the refresh hint.

## Routes

`GET /health`, `POST /api/v1/capture`, `POST /api/v1/import`, `GET /api/v1/export`, `GET /api/v1/prompts`, `PUT /api/v1/prompts`, `GET /openapi.yaml`, `GET /docs` (Scalar).

## Sequence

```mermaid
sequenceDiagram
  participant RCV as Receiver mobile
  participant SND as Sender mobile
  participant B as Backend
  participant F as FCM
  participant C as Cloudinary
  participant L as LLM provider
  participant DB as Realtime DB
  RCV->>B: POST /api/v1/capture
  B->>F: silent topic capture_request role=sender
  F-->>SND: foreground capture_request
  SND->>SND: take camera photo
  SND->>B: POST /api/v1/import (image)
  B->>C: upload image
  B-->>SND: SSE extracting_text
  B->>L: image text extraction
  B-->>SND: SSE analyzing_text
  B->>L: final text
  B->>DB: persist under uploads/
  B-->>SND: SSE final row or error
  alt pipeline succeeded
    B->>F: topic new_result role=receiver
    B->>F: silent topic export_refresh role=receiver
  end
  RCV->>B: GET /api/v1/export
  B-->>RCV: data page limit is_next
```

## Persisted shape (Realtime Database)

Under `uploads/{id}` the server stores JSON with at least `createdAt` and `updatedAt`; on success it adds `extractedText`, `finalText`, `imageUrl`, `cloudinaryPublicId`; on failure it adds `errorMessage`. Exact keys are defined by the TypeScript type `GrimUpload` in `backend/src/api/v1/model/import.model.ts`.

## Notes

- `POST /api/v1/import` keeps the HTTP connection open until **Cloudinary**, both configured LLM model steps, and the **Realtime Database** write complete (then receiver **FCM** on success). The two LLM stages may use different providers or models. Progress is indicated by SSE `data:` lines, not by returning before work finishes.
- Nothing is written under **`uploads/{id}`** until image storage and both text steps have run (or a single error record is written if the pipeline fails).
- `GET /api/v1/export` is the source of truth for list data; FCM is only a hint after success.
- Sender capture is implemented for the sender camera foreground flow. Background FCM delivery can wake Dart handlers, but taking a camera photo requires the active sender camera page.

---

**Updated:** 2026-04-24
**Applies to:** grim backend + Flutter capture/import flow (`backend/src/`, `mobile/packages/grim_sender_camera`, `mobile/packages/grim_receiver_grid`)
**Doc version:** 3
