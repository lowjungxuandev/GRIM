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

Vitest loads **`backend/.env` first** (`test/setup-env.ts`). **Configure `.env` before you run tests** (same steps as [Setup](#setup): copy `.env.example` to `.env` and fill every required value). Several suites exercise Cloudinary, Firebase Admin (Realtime Database and FCM topic messaging), and OpenRouter against your real credentials; without a complete `.env`, those tests will fail with authentication or network errors from the vendors. **Library integration tests** under **`test/unit-test/libs/`** do not mock storage or the database—they create real rows/uploads and **must delete that test data** (see **`docs/code-rules/unit-test-rules.md`**).

Required environment variables:

- `CLOUDINARY_URL`
- `GOOGLE_APPLICATION_CREDENTIALS`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_DATABASE_URL`
- `OPENROUTER_API_KEY`

Optional:

- `OPENROUTER_MODEL` — OpenRouter model/router for both LLM stages (default `openrouter/free`)
- `OPENROUTER_IMAGE_MODEL` — legacy alias used when `OPENROUTER_MODEL` is unset
- `GRIM_FCM_TOPIC` — FCM topic for capture/import signals (default `grim_new_result`)

### API

- `GET /docs` — Scalar API Reference UI (loads `openapi.yaml` from this server)
- `GET /openapi.yaml` — OpenAPI 3 spec (health, import, capture, export, prompts)
- `GET /health`
  - integration checks (Firebase Realtime Database, OpenRouter, Cloudinary); **200** or **503**; JSON matches OpenAPI schema `IntegrationHealthReport`
- `POST /api/v1/capture`
  - receiver-triggered capture request
  - sends a silent FCM topic data message to sender devices: `kind: capture_request`, `notificationType: silent`, `role: sender`
  - returns `{ "ok": true }` after Firebase accepts the send request
- `POST /api/v1/import`
  - accepts `multipart/form-data` with exactly one file part named **`image`** (e.g. `<input name="image" type="file">`)
  - **curl:** use **`-F` / `--form`** and **do not** set `Content-Type` yourself — curl must add `boundary=…`. Use one part type, e.g. **`-F 'image=@photo.jpg;type=image/jpeg'`** (not a comma-separated list of MIME types)
  - **Scalar:** if “Try it” fails, remove a manual **`Content-Type: multipart/form-data`** header so the UI can send a proper boundary
  - returns **200** `text/event-stream` (SSE): status events, then terminal JSON (success row or `error`)
  - on success, writes the row to Realtime Database, then sends two receiver FCM signals on topic `grim_new_result` (or `GRIM_FCM_TOPIC`): visible `kind: new_result` and silent `kind: export_refresh` with `url: /api/v1/export?page=1&limit=20`
- `GET /api/v1/export`
  - optional `page` (default 1), optional `limit` (default 20, max 50)
  - returns `200` paginated JSON (`data`, `page`, `limit`, `is_next`); newest first by `createdAt`; completed rows add `finalText`, `imageUrl`, `updatedAt`; failed rows add `errorMessage`, `updatedAt`
- `GET /api/v1/prompts`, `PUT /api/v1/prompts` — read or overwrite extract / analyzing prompt templates (`backend/prompts/*.txt` by default; optional `GRIM_PROMPTS_DIR`, `GRIM_PROMPT_ADMIN_SECRET`). **PUT** accepts **`multipart/form-data`** with file or text fields **`extract_text`** and **`analyzing_text`**, or **`application/json`** with **`extractTextPrompt`** / **`analyzingTextPrompt`**.

### Docs

Reference docs used to design the current implementation and future follow-up work:

- **`docs/dependencies/`** — vendor integration notes (Cloudinary, OpenRouter via the OpenAI SDK, Scalar, Firebase); start at [`docs/dependencies/README.md`](../docs/dependencies/README.md).
- Repository **`docs/`** (top level): `workflow.md` (target end-to-end backend flow), `specification.md`, `testing-plan.md`, plus `code-rules/`, `instructions/`, `design/`.

The v1 backend wires Cloudinary, Firebase Admin / Realtime Database / FCM, and OpenRouter-backed LLM stages into **`backend/src/`**. OpenRouter calls use the official `openai` Node SDK with `baseURL: "https://openrouter.ai/api/v1"`; there is no direct OpenAI API key runtime path. Optional **`SCALAR_DOCS_URL`** only logs a link if you publish docs elsewhere; local Scalar UI is always **`/docs`** when the server runs.

---

**Updated:** 2026-04-19
**Applies to:** grim backend (`backend/package.json` -> version `0.1.0`)
**Doc version:** 2
