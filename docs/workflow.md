# End-to-end workflow

1. Mobile calls `POST /api/v1/import` with an image.
2. Backend responds **202** with `{}` as soon as the upload is accepted (the heavy work continues in the background on the server).
3. Backend runs the pipeline asynchronously in order: **Cloudinary** (store image) → **Gemma** (extract text) → **Step** (analyze / final text) → **Realtime Database** (`uploads/{id}`, one write when the row is ready or on failure). If the pipeline succeeds, it then sends an FCM **topic** data message (`kind: new_result`) so subscribed clients can refresh.
4. Mobile calls `GET /api/v1/export` for newest-first rows (see `backend/openapi.yaml` for `data`, `page`, `limit`, `is_next`).

## Routes

`GET /health`, `POST /api/v1/import`, `GET /api/v1/export`, `GET /openapi.yaml`, `GET /docs` (Scalar).

## Sequence

```mermaid
sequenceDiagram
  participant M as Mobile
  participant B as Backend
  participant C as Cloudinary
  participant G as Gemma
  participant S as Step
  participant R as Realtime DB
  participant F as FCM
  M->>B: POST /api/v1/import (image)
  B-->>M: 202 {}
  B->>C: upload image
  B->>G: extract text
  B->>S: final text
  B->>R: persist under uploads/
  alt pipeline succeeded
    B->>F: topic new_result
  end
  M->>B: GET /api/v1/export
  B-->>M: data page limit is_next
```

## Persisted shape (Realtime Database)

Under `uploads/{id}` the server stores JSON with at least `createdAt` and `updatedAt`; on success it adds `extractedText`, `finalText`, `imageUrl`, `cloudinaryPublicId`; on failure it adds `errorMessage`. Exact keys are defined by the TypeScript type `GrimUpload` in `backend/src/api/v1/model/import.model.ts`.

## Notes

- `POST /api/v1/import` returns **202** without waiting for Cloudinary, models, Realtime Database, or FCM; those steps run after the response is sent.
- Nothing is written under **`uploads/{id}`** until image storage and both text steps have run (or a single error record is written if the pipeline fails).
- `GET /api/v1/export` is the source of truth for list data; FCM is only a hint after success.
