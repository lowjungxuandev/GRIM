import 'package:flutter/material.dart';
import 'package:grim_image_full_screen_view/grim_image_full_screen_view.dart';
import 'package:grim_notification_dialog/grim_notification_dialog.dart';
import 'package:grim_receiver_grid/grim_receiver_grid.dart';
import 'package:grim_role_select/grim_role_select.dart';
import 'package:grim_sender_camera/grim_sender_camera.dart';

import '../theme/grim_theme_extension.dart';

/// App shell: GRIM branding and entry points into feature UIs.
class GrimCorePage extends StatelessWidget {
  const GrimCorePage({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.textTheme;
    final grim = context.grimExtension;

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
          children: [
            Text('GRIM', style: textTheme.headlineLarge),
            const SizedBox(height: 6),
            Text(
              'Secure visual relay',
              style: textTheme.bodyMedium?.copyWith(
                color: grim.subtitle,
                fontSize: 15,
              ),
            ),
            const SizedBox(height: 28),
            Text(
              'Screens',
              style: textTheme.labelLarge?.copyWith(
                color: grim.sectionLabel,
                fontSize: 13,
                letterSpacing: 0.6,
              ),
            ),
            const SizedBox(height: 12),
            _CoreNavTile(
              title: 'Role select',
              subtitle: 'Sender / receiver',
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const GrimRoleSelectPage(),
                ),
              ),
            ),
            _CoreNavTile(
              title: 'Receiver grid',
              subtitle: 'Placeholder tiles + FAB',
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const GrimReceiverGridPage(),
                ),
              ),
            ),
            _CoreNavTile(
              title: 'Sender camera',
              subtitle: 'Live feed shell',
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const GrimSenderCameraPage(),
                ),
              ),
            ),
            _CoreNavTile(
              title: 'Image full screen',
              subtitle: 'Overlay + multiple choice',
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const GrimImageFullScreenPage(),
                ),
              ),
            ),
            _CoreNavTile(
              title: 'Notification dialog',
              subtitle: 'Compact switch copy',
              onTap: () => showGrimNotificationDialog(context),
            ),
          ],
        ),
      ),
    );
  }
}

class _CoreNavTile extends StatelessWidget {
  const _CoreNavTile({
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final grim = context.grimExtension;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: grim.navTile,
        borderRadius: BorderRadius.circular(14),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: grim.navTileBorder),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        subtitle,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: grim.mutedText,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right, color: grim.chevron),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
