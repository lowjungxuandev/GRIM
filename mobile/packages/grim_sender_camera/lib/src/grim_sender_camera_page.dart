import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum GrimCameraFeedState { idle, starting, live }

final grimCameraFeedStateProvider =
    NotifierProvider<GrimCameraFeedNotifier, GrimCameraFeedState>(
  GrimCameraFeedNotifier.new,
);

class GrimCameraFeedNotifier extends Notifier<GrimCameraFeedState> {
  @override
  GrimCameraFeedState build() => GrimCameraFeedState.idle;

  void setState(GrimCameraFeedState next) => state = next;
}

/// Sender camera mockup; wraps its own [ProviderScope].
class GrimSenderCameraPage extends StatelessWidget {
  const GrimSenderCameraPage({super.key});

  @override
  Widget build(BuildContext context) {
    return ProviderScope(
      child: const _GrimSenderCameraScaffold(),
    );
  }
}

class _GrimSenderCameraScaffold extends ConsumerWidget {
  const _GrimSenderCameraScaffold();

  static const Color _bg = Color(0xFF0B0E14);
  static const Color _label = Color(0xFF8B8B7A);
  static const Color _viewport = Color(0xFF12161F);
  static const Color _border = Color(0xFF2A2F38);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(grimCameraFeedStateProvider);

    return Scaffold(
      backgroundColor: _bg,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const _FakeStatusBar(),
              const SizedBox(height: 12),
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(28),
                  child: Container(
                    decoration: BoxDecoration(
                      color: _viewport,
                      borderRadius: BorderRadius.circular(28),
                      border: Border.all(color: _border, width: 1),
                    ),
                    child: const Stack(
                      children: [
                        Positioned(
                          left: 16,
                          top: 16,
                          child: Text(
                            'Live camera feed',
                            style: TextStyle(
                              color: _label,
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FakeStatusBar extends StatelessWidget {
  const _FakeStatusBar();

  static const Color _accent = Color(0xFFD9E92D);

  @override
  Widget build(BuildContext context) {
    return const Row(
      children: [
        Text(
          '9:41',
          style: TextStyle(
            color: _accent,
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
        ),
        Spacer(),
        _StatusDot(),
        SizedBox(width: 5),
        _StatusDot(),
        SizedBox(width: 10),
        Icon(Icons.battery_5_bar_outlined, color: _accent, size: 24),
      ],
    );
  }
}

class _StatusDot extends StatelessWidget {
  const _StatusDot();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 7,
      height: 7,
      decoration: const BoxDecoration(
        color: _FakeStatusBar._accent,
        shape: BoxShape.circle,
      ),
    );
  }
}
