import 'package:flutter/material.dart';
import 'package:grim_core/grim_core.dart';
import 'package:grim_role_select/grim_role_select.dart';

class GrimSplashPage extends StatefulWidget {
  const GrimSplashPage({super.key});

  @override
  State<GrimSplashPage> createState() => _GrimSplashPageState();
}

class _GrimSplashPageState extends State<GrimSplashPage> {
  static const Duration _delay = Duration(milliseconds: 900);

  bool _ready = false;

  @override
  void initState() {
    super.initState();
    Future<void>.delayed(_delay, _completeSplash);
  }

  void _completeSplash() {
    if (!mounted) return;
    setState(() => _ready = true);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      Navigator.of(context).pushReplacement(MaterialPageRoute<void>(builder: (_) => const GrimRoleSelectPage()));
    });
  }

  @override
  Widget build(BuildContext context) {
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
                  child: _ready
                      ? const Icon(Icons.check_circle_outline, color: GrimColors.accent, size: 32)
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
