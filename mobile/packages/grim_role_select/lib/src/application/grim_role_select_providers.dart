import 'package:flutter_riverpod/flutter_riverpod.dart';

enum GrimRole { sender, receiver }

final grimRoleSelectionProvider =
    NotifierProvider.autoDispose<GrimRoleSelectionNotifier, GrimRole>(
      GrimRoleSelectionNotifier.new,
    );

class GrimRoleSelectionNotifier extends Notifier<GrimRole> {
  @override
  GrimRole build() => GrimRole.sender;

  void setRole(GrimRole role) => state = role;
}
