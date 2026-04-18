import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final grimNotificationCopyPressedProvider =
    NotifierProvider<GrimNotificationCopyPressedNotifier, bool>(
  GrimNotificationCopyPressedNotifier.new,
);

class GrimNotificationCopyPressedNotifier extends Notifier<bool> {
  @override
  bool build() => false;

  void markPressed() => state = true;
}

/// Shows the compact-switch notification mockup inside a [ProviderScope].
Future<void> showGrimNotificationDialog(BuildContext context) {
  return showDialog<void>(
    context: context,
    barrierDismissible: true,
    builder: (dialogContext) {
      return ProviderScope(
        child: const _GrimNotificationDialogShell(),
      );
    },
  );
}

class _GrimNotificationDialogShell extends ConsumerWidget {
  const _GrimNotificationDialogShell();

  static const Color _shell = Color(0xFF1E2329);
  static const Color _body = Color(0xFF9BA3AF);
  static const Color _cta = Color(0xFFD9FF41);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Center(
      child: Material(
        color: Colors.transparent,
        child: Container(
          width: 320,
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: _shell,
            borderRadius: BorderRadius.circular(18),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.45),
                blurRadius: 24,
                offset: const Offset(0, 12),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: const SizedBox(
                  height: 180,
                  child: ColoredBox(color: Color(0xFF262E44)),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'You are about to switch to a compact mobile dialog optimized for one-hand controls. Streaming continues without disconnecting the session.',
                style: TextStyle(
                  color: _body,
                  fontSize: 13,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: _cta,
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: const StadiumBorder(),
                    textStyle: Theme.of(context).textTheme.labelLarge?.copyWith(
                          color: Colors.black,
                          fontSize: 12.5,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.5,
                          height: 1.15,
                        ) ??
                        const TextStyle(
                          color: Colors.black,
                          fontSize: 12.5,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.5,
                          height: 1.15,
                        ),
                  ),
                  onPressed: () {
                    ref
                        .read(grimNotificationCopyPressedProvider.notifier)
                        .markPressed();
                    Navigator.of(context).pop();
                  },
                  child: const Text('COPY'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
