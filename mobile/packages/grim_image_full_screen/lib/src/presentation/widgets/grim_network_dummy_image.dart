import 'package:flutter/material.dart';
import 'package:grim_core/grim_core.dart';

class GrimNetworkDummyImage extends StatelessWidget {
  const GrimNetworkDummyImage({super.key, required this.url});

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
          color: GrimColors.surfaceHigh,
          child: Center(
            child: Icon(
              Icons.image_not_supported_outlined,
              color: GrimColors.placeholderIcon,
              size: 48,
            ),
          ),
        );
      },
      loadingBuilder: (context, child, loadingProgress) {
        if (loadingProgress == null) {
          return child;
        }

        return const ColoredBox(
          color: GrimColors.canvas,
          child: Center(
            child: SizedBox(
              width: 28,
              height: 28,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: GrimColors.accent,
              ),
            ),
          ),
        );
      },
    );
  }
}
