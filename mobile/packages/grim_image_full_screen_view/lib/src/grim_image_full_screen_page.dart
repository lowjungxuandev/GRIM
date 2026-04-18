import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum GrimMcOption { a, b, none }

/// Default dummy full-bleed image ([Lorem Picsum](https://picsum.photos/)).
const String kGrimDefaultDummyImageUrl = 'https://picsum.photos/200/300';

final grimMcSelectionProvider =
    NotifierProvider<GrimMcSelectionNotifier, GrimMcOption>(
  GrimMcSelectionNotifier.new,
);

class GrimMcSelectionNotifier extends Notifier<GrimMcOption> {
  @override
  GrimMcOption build() => GrimMcOption.none;

  void choose(GrimMcOption option) => state = option;
}

/// Full-screen image viewer: overlays match the GRIM mockup.
///
/// If [background] is null, loads [imageUrl] with [Image.network] (default
/// [kGrimDefaultDummyImageUrl]).
class GrimImageFullScreenPage extends StatelessWidget {
  const GrimImageFullScreenPage({
    super.key,
    this.background,
    this.imageUrl = kGrimDefaultDummyImageUrl,
    this.question = 'what is the highest mount in the world?',
    this.optionA = 'A. asdasd',
    this.optionB = 'B. asdasd',
    this.onClose,
    this.onLayers,
  });

  /// When set, used instead of the network dummy image.
  final Widget? background;

  /// Dummy / preview image URL when [background] is null.
  final String imageUrl;
  final String question;
  final String optionA;
  final String optionB;
  final VoidCallback? onClose;
  final VoidCallback? onLayers;

  @override
  Widget build(BuildContext context) {
    return ProviderScope(
      child: _GrimImageFullScreenBody(
        background: background,
        imageUrl: imageUrl,
        question: question,
        optionA: optionA,
        optionB: optionB,
        onClose: onClose,
        onLayers: onLayers,
      ),
    );
  }
}

class _GrimImageFullScreenBody extends ConsumerWidget {
  const _GrimImageFullScreenBody({
    this.background,
    required this.imageUrl,
    required this.question,
    required this.optionA,
    required this.optionB,
    this.onClose,
    this.onLayers,
  });

  final Widget? background;
  final String imageUrl;
  final String question;
  final String optionA;
  final String optionB;
  final VoidCallback? onClose;
  final VoidCallback? onLayers;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = ref.watch(grimMcSelectionProvider);
    final backdrop = background ?? _GrimNetworkDummyImage(url: imageUrl);

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        clipBehavior: Clip.hardEdge,
        children: [
          Positioned.fill(child: backdrop),
          Positioned(
            top: MediaQuery.paddingOf(context).top + 8,
            right: 16,
            child: Column(
              children: [
                _CircleIconButton(
                  icon: Icons.close,
                  onPressed:
                      onClose ?? () => Navigator.of(context).maybePop(),
                ),
                const SizedBox(height: 12),
                _CircleIconButton(
                  icon: Icons.layers_outlined,
                  onPressed: onLayers ?? () {},
                ),
              ],
            ),
          ),
          Positioned(
            left: 16,
            right: 64,
            bottom: MediaQuery.paddingOf(context).bottom + 20,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  question,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.72),
                    fontSize: 15,
                    height: 1.35,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 12),
                _McLine(
                  label: optionA,
                  active: selected == GrimMcOption.a,
                  onTap: () => ref
                      .read(grimMcSelectionProvider.notifier)
                      .choose(GrimMcOption.a),
                ),
                const SizedBox(height: 6),
                _McLine(
                  label: optionB,
                  active: selected == GrimMcOption.b,
                  onTap: () => ref
                      .read(grimMcSelectionProvider.notifier)
                      .choose(GrimMcOption.b),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _GrimNetworkDummyImage extends StatelessWidget {
  const _GrimNetworkDummyImage({required this.url});

  final String url;

  @override
  Widget build(BuildContext context) {
    return Image.network(
      url,
      fit: BoxFit.cover,
      alignment: Alignment.center,
      filterQuality: FilterQuality.medium,
      errorBuilder: (context, error, stackTrace) {
        return const ColoredBox(
          color: Color(0xFF1A1D22),
          child: Center(
            child: Icon(Icons.image_not_supported_outlined,
                color: Color(0xFF6B7280), size: 48),
          ),
        );
      },
      loadingBuilder: (context, child, loadingProgress) {
        if (loadingProgress == null) {
          return child;
        }
        return const ColoredBox(
          color: Color(0xFF0B0E14),
          child: Center(
            child: SizedBox(
              width: 28,
              height: 28,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Color(0xFFD2FF3A),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _CircleIconButton extends StatelessWidget {
  const _CircleIconButton({required this.icon, required this.onPressed});

  final IconData icon;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black.withValues(alpha: 0.45),
      shape: const CircleBorder(),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onPressed,
        child: SizedBox(
          width: 44,
          height: 44,
          child: Icon(icon, color: Colors.white, size: 22),
        ),
      ),
    );
  }
}

class _McLine extends StatelessWidget {
  const _McLine({
    required this.label,
    required this.active,
    required this.onTap,
  });

  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Text(
        label,
        style: TextStyle(
          color: active
              ? Colors.white.withValues(alpha: 0.9)
              : Colors.white.withValues(alpha: 0.55),
          fontSize: 14,
          fontWeight: active ? FontWeight.w600 : FontWeight.w400,
        ),
      ),
    );
  }
}
