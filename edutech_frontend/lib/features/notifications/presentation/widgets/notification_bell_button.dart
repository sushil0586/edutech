import 'package:education_frontend/app/router/app_routes.dart';
import 'package:education_frontend/core/network/api_error_message.dart';
import 'package:education_frontend/features/notifications/domain/models/app_notification.dart';
import 'package:education_frontend/features/notifications/presentation/providers/notification_providers.dart';
import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/theme/app_radius.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:education_frontend/shared/utils/app_date_time.dart';
import 'package:education_frontend/shared/widgets/app_badge.dart';
import 'package:education_frontend/shared/widgets/app_empty_state.dart';
import 'package:education_frontend/shared/widgets/app_loader.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class NotificationBellButton extends ConsumerWidget {
  const NotificationBellButton({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unreadCountValue = ref.watch(notificationUnreadCountProvider);
    final unreadCount = unreadCountValue.maybeWhen(
      data: (value) => value,
      orElse: () => 0,
    );

    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          decoration: BoxDecoration(
            color: AppColors.surfaceMuted,
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(color: AppColors.border.withValues(alpha: 0.8)),
          ),
          child: IconButton(
            onPressed: () => _openPanel(context),
            icon: const Icon(Icons.notifications_none_rounded, size: 20),
            color: AppColors.textSecondary,
            tooltip: 'Notifications',
          ),
        ),
        if (unreadCount > 0)
          Positioned(
            top: -4,
            right: -4,
            child: Container(
              constraints: const BoxConstraints(minWidth: 20),
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: AppColors.error,
                borderRadius: BorderRadius.circular(AppRadius.pill),
              ),
              child: Text(
                unreadCount > 99 ? '99+' : '$unreadCount',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
      ],
    );
  }

  void _openPanel(BuildContext context) {
    final isMobile = MediaQuery.sizeOf(context).width < 800;
    if (isMobile) {
      showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) => const _NotificationPanelSheet(),
      );
      return;
    }

    showDialog<void>(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.16),
      builder: (_) => const _NotificationPanelDialog(),
    );
  }
}

class _NotificationPanelDialog extends StatelessWidget {
  const _NotificationPanelDialog();

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.topRight,
      child: Padding(
        padding: const EdgeInsets.only(top: 88, right: 28),
        child: Material(
          color: Colors.transparent,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 380, maxHeight: 560),
            child: const _NotificationPanelBody(),
          ),
        ),
      ),
    );
  }
}

class _NotificationPanelSheet extends StatelessWidget {
  const _NotificationPanelSheet();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.sizeOf(context).height * 0.74,
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
      ),
      child: const SafeArea(
        top: false,
        child: _NotificationPanelBody(),
      ),
    );
  }
}

class _NotificationPanelBody extends ConsumerWidget {
  const _NotificationPanelBody();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notificationsValue = ref.watch(notificationListProvider);
    final unreadCountValue = ref.watch(notificationUnreadCountProvider);

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.xl),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: AppColors.textPrimary.withValues(alpha: 0.08),
            blurRadius: 28,
            spreadRadius: -12,
            offset: const Offset(0, 18),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Notifications',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                unreadCountValue.when(
                  data: (count) => count > 0
                      ? AppBadge(
                          label: '$count unread',
                          backgroundColor: AppColors.primary.withValues(alpha: 0.10),
                          foregroundColor: AppColors.primary,
                        )
                      : const SizedBox.shrink(),
                  loading: () => const SizedBox.shrink(),
                  error: (_, _) => const SizedBox.shrink(),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              'Exam reminders, result alerts, and teacher actions appear here.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: () => ref.read(notificationActionsProvider).markAllRead(),
                child: const Text('Mark all as read'),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Expanded(
              child: notificationsValue.when(
                data: (notifications) {
                  if (notifications.isEmpty) {
                    return const AppEmptyState(
                      title: 'No notifications yet',
                      message:
                          'You will see exam reminders, result updates, and teacher actions here.',
                    );
                  }
                  return ListView.separated(
                    itemCount: notifications.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final notification = notifications[index];
                      return _NotificationTile(notification: notification);
                    },
                  );
                },
                loading: () => const AppLoader(label: 'Loading notifications'),
                error: (error, _) => Center(
                  child: Text(
                    readApiErrorMessage(error),
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.error,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NotificationTile extends ConsumerWidget {
  const _NotificationTile({required this.notification});

  final AppNotification notification;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return InkWell(
      onTap: () async {
        if (!notification.isRead) {
          await ref.read(notificationActionsProvider).markRead(notification.id);
        }
        if (!context.mounted) {
          return;
        }
        Navigator.of(context, rootNavigator: true).maybePop();
        final route = _routeForNotification(notification);
        if (route != null && context.mounted) {
          context.go(route);
        }
      },
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: Ink(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: notification.isRead ? AppColors.surface : AppColors.primary.withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(
            color: notification.isRead
                ? AppColors.border
                : AppColors.primary.withValues(alpha: 0.20),
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 10,
              height: 10,
              margin: const EdgeInsets.only(top: 6),
              decoration: BoxDecoration(
                color: notification.isRead ? AppColors.textMuted : AppColors.primary,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    notification.title,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    notification.message,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Row(
                    children: [
                      AppBadge(
                        label: _typeLabel(notification.notificationType),
                        backgroundColor: AppColors.surfaceMuted,
                        foregroundColor: AppColors.textSecondary,
                      ),
                      const SizedBox(width: AppSpacing.xs),
                      Text(
                        _timeLabel(notification.createdAt),
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: AppColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

String _typeLabel(String type) {
  switch (type) {
    case 'exam_starting_soon':
      return 'Starting soon';
    case 'exam_live':
      return 'Exam live';
    case 'exam_submitted':
      return 'Submitted';
    case 'result_published':
      return 'Result';
    case 'teacher_review_needed':
      return 'Teacher action';
    case 'question_missing_explanation':
      return 'Improve question';
    default:
      return 'Scheduled';
  }
}

String _timeLabel(DateTime? value) {
  return formatRelativeTime(value);
}

String? _routeForNotification(AppNotification notification) {
  final examId = notification.metadata['exam_id']?.toString();
  final attemptId = notification.metadata['attempt_id']?.toString();
  switch (notification.notificationType) {
    case 'exam_scheduled':
    case 'exam_starting_soon':
    case 'exam_live':
      return examId == null ? AppRoutes.exams : AppRoutes.studentExamDetail(examId);
    case 'exam_submitted':
      if (examId != null && attemptId != null) {
        return AppRoutes.studentAttemptSummary(examId: examId, attemptId: attemptId);
      }
      return AppRoutes.exams;
    case 'result_published':
    case 'teacher_review_needed':
      return AppRoutes.results;
    case 'question_missing_explanation':
      return AppRoutes.questionBank;
    default:
      return AppRoutes.dashboard;
  }
}
