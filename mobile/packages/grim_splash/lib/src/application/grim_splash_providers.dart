import 'package:flutter_riverpod/flutter_riverpod.dart';

final grimSplashReadyProvider =
    NotifierProvider.autoDispose<GrimSplashReadyNotifier, bool>(
      GrimSplashReadyNotifier.new,
    );

class GrimSplashReadyNotifier extends Notifier<bool> {
  @override
  bool build() => false;

  void markReady() => state = true;
}
