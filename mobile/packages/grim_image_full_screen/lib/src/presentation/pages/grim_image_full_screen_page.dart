import 'package:flutter/material.dart';

import '../widgets/grim_circle_icon_button.dart';
import '../widgets/grim_mc_line.dart';
import '../widgets/grim_network_dummy_image.dart';

enum GrimMcOption { a, b, none }

const String kGrimDefaultDummyImageUrl = 'https://picsum.photos/200/300';

class GrimImageFullScreenPage extends StatefulWidget {
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

  final Widget? background;
  final String imageUrl;
  final String question;
  final String optionA;
  final String optionB;
  final VoidCallback? onClose;
  final VoidCallback? onLayers;

  @override
  State<GrimImageFullScreenPage> createState() =>
      _GrimImageFullScreenPageState();
}

class _GrimImageFullScreenPageState extends State<GrimImageFullScreenPage> {
  GrimMcOption _selected = GrimMcOption.none;

  @override
  Widget build(BuildContext context) {
    final backdrop =
        widget.background ?? GrimNetworkDummyImage(url: widget.imageUrl);

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
                GrimCircleIconButton(
                  icon: Icons.close,
                  onPressed:
                      widget.onClose ?? () => Navigator.of(context).maybePop(),
                ),
                const SizedBox(height: 12),
                GrimCircleIconButton(
                  icon: Icons.layers_outlined,
                  onPressed: widget.onLayers ?? () {},
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
                  widget.question,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.72),
                    fontSize: 15,
                    height: 1.35,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 12),
                GrimMcLine(
                  label: widget.optionA,
                  active: _selected == GrimMcOption.a,
                  onTap: () => setState(() => _selected = GrimMcOption.a),
                ),
                const SizedBox(height: 6),
                GrimMcLine(
                  label: widget.optionB,
                  active: _selected == GrimMcOption.b,
                  onTap: () => setState(() => _selected = GrimMcOption.b),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
