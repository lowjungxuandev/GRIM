import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum GrimRole { sender, receiver }

final grimRoleSelectionProvider =
    NotifierProvider<GrimRoleSelectionNotifier, GrimRole>(
  GrimRoleSelectionNotifier.new,
);

class GrimRoleSelectionNotifier extends Notifier<GrimRole> {
  @override
  GrimRole build() => GrimRole.sender;

  void setRole(GrimRole role) => state = role;
}

/// Role select mockup; wraps its own [ProviderScope] for standalone use.
class GrimRoleSelectPage extends StatelessWidget {
  const GrimRoleSelectPage({super.key});

  @override
  Widget build(BuildContext context) {
    return ProviderScope(
      child: const _GrimRoleSelectScaffold(),
    );
  }
}

class _GrimRoleSelectScaffold extends ConsumerWidget {
  const _GrimRoleSelectScaffold();

  static const Color _bg = Color(0xFF080A0C);
  static const Color _accent = Color(0xFFD2FF3A);
  static const Color _subtitle = Color(0xFF6B7A52);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = ref.watch(grimRoleSelectionProvider);

    return Scaffold(
      backgroundColor: _bg,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'GRIM',
                style: TextStyle(
                  color: _accent,
                  fontSize: 36,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Secure visual relay',
                style: TextStyle(
                  color: _subtitle,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 36),
              _RoleCard(
                title: 'SENDER',
                description: 'Capture and transmit photos',
                selected: selected == GrimRole.sender,
                onTap: () => ref
                    .read(grimRoleSelectionProvider.notifier)
                    .setRole(GrimRole.sender),
              ),
              const SizedBox(height: 16),
              _RoleCard(
                title: 'RECEIVER',
                description: 'Receive photo intel in grid',
                selected: selected == GrimRole.receiver,
                onTap: () => ref
                    .read(grimRoleSelectionProvider.notifier)
                    .setRole(GrimRole.receiver),
              ),
              const Spacer(),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  onPressed: () {},
                  child: const Text('CONTINUE'),
                ),
              ),
              const SizedBox(height: 16),
              const Center(
                child: Text(
                  'Choose role to proceed',
                  style: TextStyle(color: Color(0xFF7A8088), fontSize: 13),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  const _RoleCard({
    required this.title,
    required this.description,
    required this.selected,
    required this.onTap,
  });

  final String title;
  final String description;
  final bool selected;
  final VoidCallback onTap;

  static const Color _accent = Color(0xFFD2FF3A);
  static const Color _cardBorderInactive = Color(0xFF2A3038);
  static const Color _body = Color(0xFFB8B8B8);

  @override
  Widget build(BuildContext context) {
    final borderColor = selected ? _accent : _cardBorderInactive;
    final titleColor =
        selected ? _accent : const Color(0xFFE8E8E8);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: borderColor, width: 1.5),
            color: const Color(0xFF0E1218),
          ),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: titleColor,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  description,
                  style: const TextStyle(color: _body, fontSize: 14, height: 1.3),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
