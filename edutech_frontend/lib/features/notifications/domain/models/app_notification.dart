class AppNotification {
  const AppNotification({
    required this.id,
    required this.notificationType,
    required this.title,
    required this.message,
    required this.isRead,
    required this.createdAt,
    required this.metadata,
    this.relatedObjectType,
    this.relatedObjectId,
    this.readAt,
  });

  final String id;
  final String notificationType;
  final String title;
  final String message;
  final String? relatedObjectType;
  final String? relatedObjectId;
  final bool isRead;
  final DateTime? readAt;
  final DateTime? createdAt;
  final Map<String, dynamic> metadata;

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: (json['id'] ?? '').toString(),
      notificationType: json['notification_type'] as String? ?? 'exam_scheduled',
      title: json['title'] as String? ?? 'Notification',
      message: json['message'] as String? ?? '',
      relatedObjectType: json['related_object_type'] as String?,
      relatedObjectId: json['related_object_id'] as String?,
      isRead: json['is_read'] as bool? ?? false,
      readAt: DateTime.tryParse(json['read_at'] as String? ?? ''),
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? ''),
      metadata: (json['metadata'] as Map<String, dynamic>?) ?? <String, dynamic>{},
    );
  }
}
