import 'package:flutter/material.dart';
import 'package:grim_core/grim_core.dart';

class GrimSenderCameraPage extends StatelessWidget {
  const GrimSenderCameraPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: GrimColors.canvas,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Row(
                children: [
                  Text(
                    '9:41',
                    style: TextStyle(
                      color: GrimColors.statusAccent,
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Spacer(),
                  _StatusDot(),
                  SizedBox(width: 5),
                  _StatusDot(),
                  SizedBox(width: 10),
                  Icon(
                    Icons.battery_5_bar_outlined,
                    color: GrimColors.statusAccent,
                    size: 24,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(28),
                  child: Container(
                    decoration: BoxDecoration(
                      color: GrimColors.surface,
                      borderRadius: BorderRadius.circular(28),
                      border: Border.all(color: GrimColors.outline),
                    ),
                    child: const GrimCameraPreview(),
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

class _StatusDot extends StatelessWidget {
  const _StatusDot();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 7,
      height: 7,
      decoration: const BoxDecoration(
        color: GrimColors.statusAccent,
        shape: BoxShape.circle,
      ),
    );
  }
}
