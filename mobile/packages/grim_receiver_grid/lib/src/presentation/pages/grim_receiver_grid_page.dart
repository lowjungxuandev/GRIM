import 'package:flutter/material.dart';
import 'package:grim_core/grim_core.dart';
import 'package:grim_image_full_screen/grim_image_full_screen.dart';

class GrimReceiverGridPage extends StatelessWidget {
  const GrimReceiverGridPage({super.key});

  static const int _itemCount = 48;
  static const Color _tileA = Color(0xFF14161C);
  static const Color _tileB = Color(0xFF1C212A);
  static const Color _gap = Color(0xFF0A0C10);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 4, 20, 8),
              child: Row(
                children: [
                  Text(
                    '9:41',
                    style: TextStyle(
                      color: GrimColors.accentAlt,
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Spacer(),
                  _StatusDot(color: GrimColors.accentAlt, size: 6),
                  SizedBox(width: 5),
                  _StatusDot(color: GrimColors.accentAlt, size: 6),
                  SizedBox(width: 10),
                  Icon(
                    Icons.battery_6_bar,
                    color: GrimColors.accentAlt,
                    size: 22,
                  ),
                ],
              ),
            ),
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
                  itemCount: _itemCount,
                  itemBuilder: (context, index) {
                    final isA = (index ~/ 4 + index % 4) % 2 == 0;

                    return Material(
                      color: isA ? _tileA : _tileB,
                      child: InkWell(
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute<void>(
                              builder: (_) => GrimImageFullScreenPage(
                                imageUrl:
                                    'https://picsum.photos/seed/grim$index/400/600',
                              ),
                            ),
                          );
                        },
                        child: const SizedBox.expand(),
                      ),
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: GrimColors.accentAlt,
        foregroundColor: Colors.black,
        elevation: 6,
        onPressed: () {},
        child: const Icon(Icons.add, size: 28),
      ),
    );
  }
}

class _StatusDot extends StatelessWidget {
  const _StatusDot({required this.color, required this.size});

  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
    );
  }
}
