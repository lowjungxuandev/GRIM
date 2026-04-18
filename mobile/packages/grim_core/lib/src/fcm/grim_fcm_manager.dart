import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

const grimDefaultFcmTopic = 'grim_new_result';

Future<FirebaseApp> _ensureFirebaseInitialized() async {
  if (Firebase.apps.isNotEmpty) {
    return Firebase.app();
  }

  return Firebase.initializeApp();
}

@pragma('vm:entry-point')
Future<void> grimFcmBackgroundHandler(RemoteMessage message) async {
  await _ensureFirebaseInitialized();
}

class GrimFcmManager {
  GrimFcmManager({FirebaseMessaging? messaging})
    : _messaging = messaging ?? FirebaseMessaging.instance;

  final FirebaseMessaging _messaging;

  Future<String?> initialize({
    String topic = grimDefaultFcmTopic,
    bool subscribeToTopic = true,
  }) async {
    await _ensureFirebaseInitialized();
    FirebaseMessaging.onBackgroundMessage(grimFcmBackgroundHandler);

    await _messaging.requestPermission(alert: true, badge: true, sound: true);

    await _messaging.setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );

    if (subscribeToTopic) {
      await _messaging.subscribeToTopic(topic);
    }

    return _messaging.getToken();
  }

  Future<RemoteMessage?> getInitialMessage() {
    return _messaging.getInitialMessage();
  }

  Stream<RemoteMessage> get onMessage => FirebaseMessaging.onMessage;

  Stream<RemoteMessage> get onMessageOpenedApp =>
      FirebaseMessaging.onMessageOpenedApp;

  Stream<String> get onTokenRefresh => _messaging.onTokenRefresh;

  Future<void> subscribeToTopic(String topic) {
    return _messaging.subscribeToTopic(topic);
  }
}
