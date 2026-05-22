import 'package:dio/dio.dart';
import 'package:education_frontend/core/network/api_client.dart';
import 'package:education_frontend/features/notifications/domain/models/app_notification.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final notificationRepositoryProvider = Provider<NotificationRepository>((ref) {
  return DioNotificationRepository(ref.watch(dioProvider));
});

abstract class NotificationRepository {
  Future<List<AppNotification>> fetchNotifications();
  Future<int> fetchUnreadCount();
  Future<AppNotification> markRead(String notificationId);
  Future<void> markAllRead();
}

class DioNotificationRepository implements NotificationRepository {
  DioNotificationRepository(this._dio);

  final Dio _dio;

  @override
  Future<List<AppNotification>> fetchNotifications() async {
    final response = await _dio.get<dynamic>('notifications/');
    final items = _extractItems(response.data);
    return items
        .whereType<Map<String, dynamic>>()
        .map(AppNotification.fromJson)
        .toList();
  }

  @override
  Future<int> fetchUnreadCount() async {
    final response = await _dio.get<Map<String, dynamic>>(
      'notifications/unread-count/',
    );
    return response.data?['unread_count'] as int? ?? 0;
  }

  @override
  Future<AppNotification> markRead(String notificationId) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'notifications/$notificationId/mark-read/',
    );
    return AppNotification.fromJson(_extractActionData(response.data));
  }

  @override
  Future<void> markAllRead() async {
    await _dio.post<void>('notifications/mark-all-read/');
  }

  List<dynamic> _extractItems(dynamic raw) {
    if (raw is List<dynamic>) {
      return raw;
    }
    if (raw is Map<String, dynamic>) {
      final results = raw['results'];
      if (results is List<dynamic>) {
        return results;
      }
    }
    return const <dynamic>[];
  }

  Map<String, dynamic> _extractActionData(dynamic raw) {
    if (raw is Map<String, dynamic>) {
      final data = raw['data'];
      if (data is Map<String, dynamic>) {
        return data;
      }
      return raw;
    }
    return const <String, dynamic>{};
  }
}
