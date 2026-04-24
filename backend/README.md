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

Vitest loads **`backend/.env` first** (`test/setup-env.ts`). **Configure `.env` before you run tests** (same steps as [Setup](#setup): copy `.env.example` to `.env` and fill every required value). Several suites exercise Cloudinary, Firebase Admin (Realtime Database and FCM topic messaging), and the configured OpenAI-compatible LLM provider against your real credentials; without a complete `.env`, those tests will fail with authentication or network errors from the vendors. **Library integration tests** under **`test/unit-test/libs/`** do not mock storage or the database—they create real rows/uploads and **must delete that test data** (see **`docs/code-rules/unit-test-rules.md`**).

Required environment variables:

- `CLOUDINARY_URL`
- Firebase Admin credentials: set either `GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_SERVICE_ACCOUNT_JSON_BASE64`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_DATABASE_URL`
- `EXTRACT_LLM_PROVIDER` — `openrouter`, `openai`, or `nim`
- `EXTRACT_LLM_API_KEY`
- `EXTRACT_LLM_MODEL`
- `FINAL_LLM_PROVIDER` — `openrouter`, `openai`, or `nim`
- `FINAL_LLM_API_KEY`
- `FINAL_LLM_MODEL`

Optional:

- `EXTRACT_LLM_BASE_URL` — optional for `openrouter` and `openai`; required for `nim`
- `FINAL_LLM_BASE_URL` — optional for `openrouter` and `openai`; required for `nim`
- Shared defaults: `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL` can be used when both stages share a provider or when one stage only needs a partial override.
- `GRIM_FCM_TOPIC` — FCM topic for capture/import signals (default `grim_new_result`)
- Legacy compatibility: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, and `OPENROUTER_IMAGE_MODEL` still work when neither the stage-specific nor shared `LLM_*` vars are set.

### API

- `GET /docs` — Scalar API Reference UI (loads `openapi.yaml` from this server)
- `GET /openapi.yaml` — OpenAPI 3 spec (health, import, capture, export, prompts)
- `GET /health`
  - integration checks (Firebase Realtime Database, extract/final LLM configs aggregated under `llm`, Cloudinary); **200** or **503**; JSON matches OpenAPI schema `IntegrationHealthReport` with top-level keys `ok`, `firebase`, `llm`, and `cloudinary`
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

- **`docs/dependencies/`** — vendor integration notes (Cloudinary, OpenAI-compatible LLM providers via the OpenAI SDK, Scalar, Firebase); start at [`docs/dependencies/README.md`](../docs/dependencies/README.md).
- Repository **`docs/`** (top level): `workflow.md` (target end-to-end backend flow), `specification.md`, `testing-plan.md`, plus `code-rules/`, `instructions/`, `design/`.

The v1 backend wires Cloudinary, Firebase Admin / Realtime Database / FCM, and one OpenAI-compatible adapter class into **`backend/src/`**. The extract and final-text stages can now use separate provider configs through `EXTRACT_LLM_*` and `FINAL_LLM_*`; shared `LLM_*` vars are still supported as defaults, and legacy OpenRouter env aliases remain accepted for compatibility. Current supported providers are OpenRouter, OpenAI, and NVIDIA NIM. Optional **`SCALAR_DOCS_URL`** only logs a link if you publish docs elsewhere; local Scalar UI is always **`/docs`** when the server runs.

### GitHub Actions / Vercel

This repo now includes **`.github/workflows/deploy-vercel.yml`** and deploys the **`backend/`** directory to Vercel using **GitHub repository variables** (`vars.*`), not GitHub Actions secrets.

Required GitHub repository variables for that workflow:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `CLOUDINARY_URL`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_DATABASE_URL`
- `FIREBASE_SERVICE_ACCOUNT_JSON_BASE64`
- `EXTRACT_LLM_PROVIDER`
- `EXTRACT_LLM_API_KEY`
- `EXTRACT_LLM_MODEL`
- `FINAL_LLM_PROVIDER`
- `FINAL_LLM_API_KEY`
- `FINAL_LLM_MODEL`

Optional GitHub repository variables:

- `EXTRACT_LLM_BASE_URL`
- `FINAL_LLM_BASE_URL`
- `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL`
- `GRIM_FCM_TOPIC`
- `GRIM_PROMPT_ADMIN_SECRET`
- `SCALAR_DOCS_URL`

The workflow passes those values to `vercel deploy` with `--env`, so you do not need to pre-create Vercel project env vars for this path.

---

**Updated:** 2026-04-24
**Applies to:** grim backend (`backend/package.json` -> version `0.1.0`)
**Doc version:** 4
