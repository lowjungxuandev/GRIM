import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final grimReceiverGridItemCountProvider =
    NotifierProvider<GrimReceiverGridItemCountNotifier, int>(
  GrimReceiverGridItemCountNotifier.new,
);

class GrimReceiverGridItemCountNotifier extends Notifier<int> {
  @override
  int build() => 48;
}

/// Receiver grid mockup with FAB; wraps its own [ProviderScope].
class GrimReceiverGridPage extends StatelessWidget {
  const GrimReceiverGridPage({super.key});

  @override
  Widget build(BuildContext context) {
    return ProviderScope(
      child: const _GrimReceiverGridScaffold(),
    );
  }
}

class _GrimReceiverGridScaffold extends ConsumerWidget {
  const _GrimReceiverGridScaffold();

  static const Color _accent = Color(0xFFDFFF4F);
  static const Color _tileA = Color(0xFF14161C);
  static const Color _tileB = Color(0xFF1C212A);
  static const Color _gap = Color(0xFF0A0C10);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(grimReceiverGridItemCountProvider);

    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const _FakeStatusBar(),
            Expanded(
              child: ColoredBox(
                color: _gap,
                child: GridView.builder(
                  padding: const EdgeInsets.all(2),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 4,
                    crossAxisSpacing: 2,
                    mainAxisSpacing: 2,
                    childAspectRatio: 0.85,
                  ),
                  itemCount: count,
                  itemBuilder: (context, index) {
                    final isA = (index ~/ 4 + index % 4) % 2 == 0;
                    return Container(
                      color: isA ? _tileA : _tileB,
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: _accent,
        foregroundColor: Colors.black,
        elevation: 6,
        onPressed: () {},
        child: const Icon(Icons.add, size: 28),
      ),
    );
  }
}

class _FakeStatusBar extends StatelessWidget {
  const _FakeStatusBar();

  static const Color _accent = Color(0xFFDFFF4F);

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.fromLTRB(20, 4, 20, 8),
      child: Row(
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
          Icon(Icons.battery_6_bar, color: _accent, size: 22),
        ],
      ),
    );
  }
}

class _StatusDot extends StatelessWidget {
  const _StatusDot();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 6,
      height: 6,
      decoration: const BoxDecoration(
        color: _FakeStatusBar._accent,
        shape: BoxShape.circle,
      ),
    );
  }
}
