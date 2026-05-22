import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final sessionExpiryNotifierProvider = Provider<SessionExpiryNotifier>((ref) {
  final notifier = SessionExpiryNotifier();
  ref.onDispose(notifier.dispose);
  return notifier;
});

class SessionExpiryNotifier extends ChangeNotifier {
  String? _message;

  String? get message => _message;

  void notifySessionExpired([
    String message = 'Your session expired. Please sign in again.',
  ]) {
    _message = message;
    notifyListeners();
  }

  void clear() {
    _message = null;
  }
}
