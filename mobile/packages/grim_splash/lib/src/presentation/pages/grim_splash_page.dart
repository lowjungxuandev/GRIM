import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:grim_core/grim_core.dart';
import 'package:grim_role_select/grim_role_select.dart';

import '../../application/grim_splash_providers.dart';

class GrimSplashPage extends ConsumerStatefulWidget {
  const GrimSplashPage({super.key});

  @override
  ConsumerState<GrimSplashPage> createState() => _GrimSplashPageState();
}

class _GrimSplashPageState extends ConsumerState<GrimSplashPage> {
  @override
  void initState() {
    super.initState();
    Future<void>.delayed(const Duration(milliseconds: 900), () {
      if (!mounted) {
        return;
      }

      ref.read(grimSplashReadyProvider.notifier).markReady();
    });
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<bool>(grimSplashReadyProvider, (previous, next) {
      if (!next) {
        return;
      }

      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!context.mounted) {
          return;
        }

        Navigator.of(context).pushReplacement(
          MaterialPageRoute<void>(builder: (_) => const GrimRoleSelectPage()),
        );
      });
    });

    final ready = ref.watch(grimSplashReadyProvider);

    return Scaffold(
      backgroundColor: GrimColors.scaffold,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const GrimBrandLockup(
                  titleSize: 44,
                  titleLetterSpacing: 1.4,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  textAlign: TextAlign.center,
                  spacing: 12,
                ),
                const SizedBox(height: 40),
                SizedBox(
                  width: 120,
                  child: ready
                      ? const Icon(
                          Icons.check_circle_outline,
                          color: GrimColors.accent,
                          size: 32,
                        )
                      : const SizedBox(
                          height: 3,
                          child: LinearProgressIndicator(
                            backgroundColor: GrimColors.surfaceHigh,
                            color: GrimColors.accent,
                          ),
                        ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
