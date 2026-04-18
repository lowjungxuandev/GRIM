# Project architecture (backend)

This document describes the **current** Grim backend layout under `backend/src/` as of the code-rules refresh. It is not a target design for unbuilt features.

## Entry points

- **`server.ts`** — loads environment (`loadServerEnv` from `libs/configs/env.config.ts`), builds production instances (local `createProductionDependencies`), calls `createApp(...)`, starts HTTP.
- **`app.ts`** — `createApp(deps)` returns a configured Express app: OpenAPI static file, Scalar docs, health router, `/api/v1` router (import + export), global error handler. Exports `AppDependencies`.

There is **no** separate `dependencies.ts`; composition for production lives next to startup in `server.ts`.

## HTTP API (`api/v1/`)

| Layer | Role | Examples (existing files) |
|--------|------|---------------------------|
| **`model/`** | Request/response shapes, persistence row types, shared port interfaces | `import.model.ts`, `export.model.ts`, `health.model.ts`, `services.model.ts` |
| **`services/`** | Use cases / orchestration | `import.service.ts`, `export.service.ts`, `health.service.ts` |
| **`controllers/`** | Map HTTP → service calls (thin) | `import.controller.ts`, `export.controller.ts`, `health.controller.ts` |
| **`routes/`** | Routers, middleware per route (e.g. multer on import) | `health.route.ts`, `import.route.ts`, `export.route.ts` |

**Mounted paths today (from `app.ts`):**

- `GET /health` — via `createHealthRouter` (not under `/api/v1`).
- `GET /openapi.yaml`, `GET /docs`, `GET /docs/` — defined in `app.ts`.
- `POST /api/v1/import`, `GET /api/v1/export` — under `express.Router()` mounted at `/api/v1`.

## Libraries (`libs/`)

| Area | Path | Purpose (as implemented) |
|------|------|----------------------------|
| Firebase | `libs/firebase/admin.ts` | Admin app init from env |
| | `libs/firebase/realtime.ts` | `getRealtimeDb`, `FirebaseUploadRepository` |
| | `libs/firebase/fcm.ts` | `FirebaseNotifier`, default topic constant |
| NVIDIA | `libs/nvidia/api.client.ts` | Shared chat HTTP + response normalization |
| | `libs/nvidia/gemma-3n-e4b-it.ts` | Gemma image text extraction |
| | `libs/nvidia/step-3.5-flash.ts` | Step final text |
| Cloudinary | `libs/cloudinary/utils.ts` | Upload store, mapping, ping used by health |
| Config | `libs/configs/env.config.ts` | `ServerEnv`, `loadServerEnv` |
| Constants | `libs/constants/limits.contant.ts` | Export/import size limits (filename is spelled **`contant`** in the repo) |
| Utils | `libs/utils/http.util.ts` | `wrapAsync`, `mapRequestError` |
| | `libs/utils/api-error.util.ts` | `ApiError` |
| | `libs/utils/sort-by-created-at.util.ts` | `sortByCreatedAtDesc` (used by Realtime repo + in-memory test repo) |

**Dependency direction (actual imports):** `libs/*` imports types and ports from `api/v1/model/*` where those contracts are defined (e.g. `UploadRepository`, `ImageStorage`). There is no separate `src/domain/` or `src/errors/` folder today.

## Spec and tests (outside `src/`)

- **`backend/openapi.yaml`** — HTTP contract referenced by Scalar and tests.
- **`backend/test/`** — Vitest + Supertest. **`test/setup-env.ts`** loads **`backend/.env`** before any test file. Root tests (e.g. **`app.test.ts`**) build **`createApp`** with in-memory repositories and doubles from **`test/test-utils.ts`** / **`test/in-memory-upload-repository.ts`**. **`test/unit-test/libs/**`** mirrors **`src/libs/**`** and runs **integration-style** checks against Cloudinary, Firebase, and NVIDIA; rules and prerequisites are in **`docs/code-rules/unit-test-rules.md`** and **`backend/README.md`** → **Testing**.

## Vendor integration write-ups

- **`docs/dependencies/`** — Cloudinary, NVIDIA, Scalar, Firebase implementation notes (`README.md` indexes the folder).

## What this document does not cover

- Mobile app layout, CI pipelines, deployment topology, or cloud account setup unless described elsewhere in `docs/`.
