# Firebase Cloud Messaging (FCM) - notification implementation

Key references:

- [Send a message using Firebase Admin SDK](https://firebase.google.com/docs/cloud-messaging/send/admin-sdk)
- [REST Resource: `projects.messages`](https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages)

Verified against the official docs on 2026-04-18.

## Current repo status

The backend can send FCM data messages through `FirebaseNotifier` (`backend/src/libs/firebase/fcm.ts`).

## Prereqs

- Enable the FCM HTTP v1 API for your Firebase project.
- Make service account credentials available to the backend.

Typical local setup:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/service-account.json"
export FIREBASE_PROJECT_ID="your-project-id"
```

## Install

```bash
cd backend
npm i firebase-admin
```

## Initialize once

Use one Firebase Admin app for both FCM and Realtime Database.

```ts
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";

export function getFirebaseAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}
```

## Broadcast to all subscribed devices (topic)

For Grim, FCM should be a small signal. The backend sends one **topic** message when an import finishes successfully; every client that subscribed to that topic receives it and can call `GET /api/v1/export` for the latest rows.

Default topic string in the server code: **`grim_new_result`**. Override on the server with env **`GRIM_FCM_TOPIC`** if you need a different name (must match what the app subscribes to).

```ts
import { getMessaging } from "firebase-admin/messaging";
import type { App } from "firebase-admin/app";

const BROADCAST_TOPIC = process.env.GRIM_FCM_TOPIC ?? "grim_new_result";

export async function broadcastNewResult(app: App) {
  return getMessaging(app).send({
    topic: BROADCAST_TOPIC,
    data: {
      kind: "new_result"
    }
  });
}
```

In this repo, `getFirebaseAdminApp` lives in `backend/src/libs/firebase/admin.ts` and takes the loaded server env object (see `backend/src/libs/configs/env.config.ts`); pass the resulting `App` into FCM helpers as above.

Notes:

- Firebase `data` payload values are strings.
- Keep the payload small.
- On the client, subscribe once (for example after sign-in or on app start): Firebase documentation describes **subscribeToTopic** for Android, iOS, and web.

## REST option

If you do not use `firebase-admin`, the HTTP v1 endpoint is:

- `POST https://fcm.googleapis.com/v1/projects/{project_id}/messages:send`

Example body for a topic send:

```json
{
  "message": {
    "topic": "grim_new_result",
    "data": {
      "kind": "new_result"
    }
  }
}
```

The REST API requires an OAuth2 access token. The Admin SDK handles that for you.
