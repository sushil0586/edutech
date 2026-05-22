import 'package:education_frontend/features/notifications/data/repositories/notification_repository.dart';
import 'package:education_frontend/features/notifications/domain/models/app_notification.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final notificationListProvider = FutureProvider.autoDispose<List<AppNotification>>((ref) {
  return ref.watch(notificationRepositoryProvider).fetchNotifications();
});

final notificationUnreadCountProvider = FutureProvider.autoDispose<int>((ref) {
  return ref.watch(notificationRepositoryProvider).fetchUnreadCount();
});

final notificationActionsProvider = Provider<NotificationActions>((ref) {
  return NotificationActions(ref);
});

class NotificationActions {
  const NotificationActions(this._ref);

  final Ref _ref;

  Future<void> markRead(String notificationId) async {
    await _ref.read(notificationRepositoryProvider).markRead(notificationId);
    _refresh();
  }

  Future<void> markAllRead() async {
    await _ref.read(notificationRepositoryProvider).markAllRead();
    _refresh();
  }

  void _refresh() {
    _ref.invalidate(notificationListProvider);
    _ref.invalidate(notificationUnreadCountProvider);
  }
}
