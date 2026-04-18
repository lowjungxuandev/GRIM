# Testing plan

Endpoints to test:

- `GET /health`
- `POST /api/v1/import`
- `GET /api/v1/export`

## Main rule

`POST /api/v1/import` must return quickly after the backend accepts the job.

It must not wait for:

- Gemma
- Step
- Cloudinary
- Realtime Database
- FCM

That long work should continue in the background.

## Unit tests

- request validation for `POST /api/v1/import`
- request validation for `GET /api/v1/export` (for example invalid `limit`)
- Gemma response parsing
- Step response parsing
- Realtime DB read and write helpers
- FCM topic broadcast (`broadcastNewResult`) is invoked after a successful pipeline
- pipeline completion persists `finalText` / `imageUrl` on success and error detail on failure

## Integration tests

- `GET /health` returns **200** with the integration report body
- `POST /api/v1/import` returns **202** immediately
- slow mocked AI providers do not delay the import response
- `GET /api/v1/export` returns `data` ordered newest-first with pagination metadata
- after a successful mocked pipeline, export includes `finalText` and `imageUrl` on the matching row
- after a failing mocked pipeline, export includes `errorMessage` on the matching row

## E2E tests

- import image → response is immediate → export later includes `finalText` and `imageUrl`
- import image → provider failure → export later includes `errorMessage`
- import image → after a successful pipeline, FCM topic broadcast runs → export still returns the canonical list from the HTTP API

## Tooling

The backend uses Vitest and Supertest (`backend/package.json`).
