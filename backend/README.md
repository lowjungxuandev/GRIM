## Backend (TypeScript)

Express backend for Grim's async import/export pipeline.

### Setup

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Server runs on `PORT` (default `3001`).

### Testing

```bash
npm test
```

Vitest loads **`backend/.env` first** (`test/setup-env.ts`). **Configure `.env` before you run tests** (same steps as [Setup](#setup): copy `.env.example` to `.env` and fill every required value). Several suites exercise Cloudinary, Firebase Admin (Realtime Database and FCM topic messaging), and the NVIDIA Integrate API against your real credentials; without a complete `.env`, those tests will fail with authentication or network errors from the vendors. **Library integration tests** under **`test/unit-test/libs/`** do not mock storage or the database—they create real rows/uploads and **must delete that test data** (see **`docs/code-rules/unit-test-rules.md`**).

Required environment variables:

- `CLOUDINARY_URL`
- `GOOGLE_APPLICATION_CREDENTIALS`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_DATABASE_URL`
- `NVAPI_KEY`

Optional:

- `GRIM_FCM_TOPIC` — FCM topic for completion broadcasts (default `grim_new_result`)

### API

- `GET /docs` — Scalar API Reference UI (loads `openapi.yaml` from this server)
- `GET /openapi.yaml` — OpenAPI 3 spec (health, import, export)
- `GET /health`
  - integration checks (Firebase Realtime Database, NVIDIA NIM, Cloudinary); **200** or **503**; JSON matches OpenAPI schema `IntegrationHealthReport`
- `POST /api/v1/import`
  - accepts `multipart/form-data`
  - required field: `image`
  - returns **202** with `{}` (empty JSON object)
  - on success, broadcasts FCM to topic `grim_new_result` (or `GRIM_FCM_TOPIC`) so subscribed devices can call export
- `GET /api/v1/export`
  - optional `limit` (default 20, max 50)
  - returns `200 { items }` — newest first by `createdAt`; completed rows add `finalText`, `imageUrl`, `updatedAt`; failed rows add `errorMessage`, `updatedAt`

### Docs

Reference docs used to design the current implementation and future follow-up work:

- **`docs/dependencies/`** — vendor integration notes (Cloudinary, NVIDIA, Scalar, Firebase); start at [`docs/dependencies/README.md`](../docs/dependencies/README.md).
- Repository **`docs/`** (top level): `workflow.md` (target end-to-end backend flow), `specification.md`, `testing-plan.md`, plus `code-rules/`, `instructions/`, `design/`.

The v1 backend wires Cloudinary, Firebase Admin / Realtime Database, NVIDIA Gemma, and NVIDIA Step into **`backend/src/`**. Optional **`SCALAR_DOCS_URL`** only logs a link if you publish docs elsewhere; local Scalar UI is always **`/docs`** when the server runs.
