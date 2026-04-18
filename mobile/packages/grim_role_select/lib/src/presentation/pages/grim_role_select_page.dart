import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:grim_core/grim_core.dart';
import 'package:grim_receiver_grid/grim_receiver_grid.dart';
import 'package:grim_sender_camera/grim_sender_camera.dart';

import '../../application/grim_role_select_providers.dart';
import '../widgets/grim_role_card.dart';

class GrimRoleSelectPage extends ConsumerWidget {
  const GrimRoleSelectPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = ref.watch(grimRoleSelectionProvider);

    return Scaffold(
      backgroundColor: GrimColors.scaffold,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const GrimBrandLockup(),
              const SizedBox(height: 36),
              GrimRoleCard(
                title: 'SENDER',
                description: 'Capture and transmit photos',
                selected: selected == GrimRole.sender,
                onTap: () => ref
                    .read(grimRoleSelectionProvider.notifier)
                    .setRole(GrimRole.sender),
              ),
              const SizedBox(height: 16),
              GrimRoleCard(
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
                  onPressed: () {
                    final role = ref.read(grimRoleSelectionProvider);
                    final route = role == GrimRole.sender
                        ? MaterialPageRoute<void>(
                            builder: (_) => const GrimSenderCameraPage(),
                          )
                        : MaterialPageRoute<void>(
                            builder: (_) => const GrimReceiverGridPage(),
                          );

                    Navigator.of(context).push(route);
                  },
                  child: const Text('CONTINUE'),
                ),
              ),
              const SizedBox(height: 16),
              const Center(
                child: Text(
                  'Choose role to proceed',
                  style: TextStyle(color: GrimColors.muted, fontSize: 13),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
