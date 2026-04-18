# Firebase Cloud Messaging (FCM) implementation

Implementation guide for receiving Firebase Cloud Messaging events in Grim's Flutter app.

Key references:

- https://firebase.google.com/docs/cloud-messaging/flutter/get-started
- https://firebase.google.com/docs/cloud-messaging/flutter/receive-messages
- https://pub.dev/packages/firebase_messaging
- https://pub.dev/documentation/firebase_messaging/latest/firebase_messaging/FirebaseMessaging-class.html

Vendor docs reviewed: 2026-04-19.

## Current repo status

- `mobile/pubspec.yaml` does not yet include `firebase_messaging`.
- `mobile/lib/main.dart` does not initialize Firebase yet.
- `mobile/ios/Runner.xcodeproj` is not yet configured for Push Notifications or Background Modes.
- `mobile/ios/Runner/Info.plist` and `mobile/android/app/src/main/AndroidManifest.xml` do not yet include app-specific notification wiring.
- The backend already publishes FCM topic messages; see `docs/dependencies/firebase/firebase-notification-implementation.md`.

## Required prerequisite

Finish the base FlutterFire setup first.

This doc assumes:

- `firebase_core` is installed
- `flutterfire configure` has been run from `mobile/`
- `mobile/lib/firebase_options.dart` exists
- `Firebase.initializeApp(...)` runs during app startup

See `flutter_fire_implementation.md` in this folder for the bootstrap layer.

## Install

From `mobile/`:

```bash
flutter pub add firebase_messaging
flutterfire configure
```

Firebase's Flutter setup docs explicitly recommend re-running `flutterfire configure` after adding a new Firebase product.

## Platform setup

### Apple platforms

Firebase's current FCM Flutter setup requires:

- enabling Push Notifications in Xcode
- enabling Background Modes, specifically Background fetch and Remote notifications
- uploading an APNs authentication key to the Firebase console

The same doc also states that method swizzling is required on Apple devices for the Flutter FCM plugin to handle token and notification plumbing correctly.

### Android

Firebase's FCM Flutter docs require a device with Google Play services or an emulator image that includes Google APIs.

### Web

The official FCM docs include VAPID-key and service-worker steps for Flutter web, but Grim does not currently have a `mobile/web/` target, so those steps are out of scope for this repo today.

## Minimal startup shape for Grim

Put message bootstrapping in `mobile/lib/main.dart`, not inside an individual feature screen.

Recommended structure:

```dart
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/grim_core_page.dart';
import 'firebase_options.dart';
import 'theme/grim_app_theme.dart';

const grimFcmTopic = 'grim_new_result';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  // Persist lightweight state or schedule local UI work here.
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

  final messaging = FirebaseMessaging.instance;

  await messaging.requestPermission(
    alert: true,
    badge: true,
    sound: true,
  );

  await messaging.setForegroundNotificationPresentationOptions(
    alert: true,
    badge: true,
    sound: true,
  );

  await messaging.subscribeToTopic(grimFcmTopic);
  final token = await messaging.getToken();
  // Send `token` to your API if you later need device-targeted notifications.

  runApp(
    const ProviderScope(
      child: MainApp(),
    ),
  );
}
```

The background handler requirements come directly from Firebase's receive-messages doc:

- it must not be anonymous
- it must be a top-level function
- on Flutter 3.3.0+, it should be annotated with `@pragma('vm:entry-point')`

## Handling message states

The current Firebase Flutter docs split handling by app state:

- Foreground: `FirebaseMessaging.onMessage`
- Background or terminated processing: `FirebaseMessaging.onBackgroundMessage(...)`
- Opened from background by tapping a notification: `FirebaseMessaging.onMessageOpenedApp`
- Opened from a terminated state by tapping a notification: `FirebaseMessaging.instance.getInitialMessage()`

Recommended app-level wiring:

```dart
void bindNotificationNavigation() {
  FirebaseMessaging.onMessageOpenedApp.listen(handleMessage);

  FirebaseMessaging.instance.getInitialMessage().then((message) {
    if (message != null) {
      handleMessage(message);
    }
  });
}
```

Keep `handleMessage(...)` app-specific and route through Grim's existing navigation or Riverpod state rather than making feature widgets listen to FCM directly.

## Foreground notification behavior

Firebase's receive-messages doc notes that notification messages arriving while the app is in the foreground do not show a visible notification by default.

Upstream guidance:

- Android: create a high-priority notification channel if you want visible foreground notifications
- Apple platforms: call `setForegroundNotificationPresentationOptions(...)`

For Grim, the important design decision is whether a foreground message should:

- show a system notification
- trigger an in-app dialog
- silently refresh export data

Make that behavior explicit before shipping FCM, because the default experience is easy to misread as "push is broken".

## Topic and token strategy for this repo

The backend spec says the server broadcasts to topic `grim_new_result` by default and can override it with `GRIM_FCM_TOPIC`.

That means the mobile app should:

- subscribe to the same topic the backend is using
- centralize the topic string in one place
- treat token retrieval and token refresh as app-level concerns

The `FirebaseMessaging` API also exposes:

- `getToken()` for the device FCM token
- `onTokenRefresh` for token rotation
- `getAPNSToken()` for Apple-platform troubleshooting

## Grim-specific recommendations

- Keep Firebase and FCM initialization in `mobile/lib/main.dart`.
- Convert raw `RemoteMessage` instances into app events before they reach feature packages.
- If the only current push use case is "new export result available", prefer a small data payload and trigger a fresh `GET /api/v1/export` rather than trying to carry large content inside the push itself.
- Match the mobile subscription topic to the backend topic documented in `docs/specification.md` and `docs/dependencies/firebase/firebase-notification-implementation.md`.

## References

- FCM Flutter get started: https://firebase.google.com/docs/cloud-messaging/flutter/get-started
- FCM Flutter receive messages: https://firebase.google.com/docs/cloud-messaging/flutter/receive-messages
- `firebase_messaging` package: https://pub.dev/packages/firebase_messaging
- `FirebaseMessaging` API: https://pub.dev/documentation/firebase_messaging/latest/firebase_messaging/FirebaseMessaging-class.html
- Existing backend FCM notes: `docs/dependencies/firebase/firebase-notification-implementation.md`

---

**Updated:** 2026-04-19  
**Applies to:** grim mobile (`mobile/`) receiving FCM events from the current grim backend  
**Doc version:** 1  
**Upstream refs:**  
- https://firebase.google.com/docs/cloud-messaging/flutter/get-started  
- https://firebase.google.com/docs/cloud-messaging/flutter/receive-messages  
- https://pub.dev/packages/firebase_messaging  
- https://pub.dev/documentation/firebase_messaging/latest/firebase_messaging/FirebaseMessaging-class.html
