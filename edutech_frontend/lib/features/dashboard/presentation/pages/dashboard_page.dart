// ignore_for_file: unused_element, unused_element_parameter

import 'package:education_frontend/app/router/app_routes.dart';
import 'package:education_frontend/core/network/api_error_message.dart';
import 'package:education_frontend/features/academics/presentation/providers/academic_setup_providers.dart';
import 'package:education_frontend/features/auth/domain/models/app_role.dart';
import 'package:education_frontend/features/auth/presentation/providers/auth_controller.dart';
import 'package:education_frontend/features/dashboard/domain/models/student_insight_summary.dart';
import 'package:education_frontend/features/dashboard/domain/models/teacher_dashboard_data.dart';
import 'package:education_frontend/features/dashboard/domain/models/teacher_insight_summary.dart';
import 'package:education_frontend/features/dashboard/domain/models/teacher_question_performance_item.dart';
import 'package:education_frontend/features/dashboard/presentation/providers/dashboard_providers.dart';
import 'package:education_frontend/features/dashboard/presentation/widgets/dashboard_shell.dart';
import 'package:education_frontend/features/notifications/domain/models/app_notification.dart';
import 'package:education_frontend/features/notifications/presentation/providers/notification_providers.dart';
import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:education_frontend/shared/presentation/widgets/placeholder_feature_view.dart';
import 'package:education_frontend/shared/widgets/app_badge.dart';
import 'package:education_frontend/shared/widgets/app_button.dart';
import 'package:education_frontend/shared/widgets/app_card.dart';
import 'package:education_frontend/shared/widgets/app_empty_state.dart';
import 'package:education_frontend/shared/widgets/app_error_state.dart';
import 'package:education_frontend/shared/widgets/app_loader.dart';
import 'package:education_frontend/shared/widgets/app_section_header.dart';
import 'package:education_frontend/shared/widgets/action_button_group_component.dart';
import 'package:education_frontend/shared/widgets/dashboard_stat_card.dart';
import 'package:education_frontend/shared/widgets/status_badge_component.dart';
import 'package:education_frontend/shared/widgets/workspace_page_components.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class DashboardPage extends ConsumerWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    if (user == null) {
      return const SizedBox.shrink();
    }

    return DashboardShell(
      title: '${user.role.label} Dashboard',
      user: user,
      currentRoute: AppRoutes.dashboard,
      onLogout: () => ref.read(authControllerProvider.notifier).logout(),
      body: switch (user.role) {
        AppRole.student => _StudentDashboard(userName: user.displayName),
        AppRole.teacher => _TeacherDashboard(userName: user.displayName),
        AppRole.platformAdmin => const _PlatformAdminDashboard(),
        AppRole.instituteAdmin => const _InstituteAdminDashboard(),
        AppRole.parent => const _StaticDashboard(
          title: 'Parent progress overview',
          description:
              'Parent accounts already reach the refreshed portal shell, and this surface can grow into a focused guardian view for progress, attendance, and communication.',
          highlights: [
            'The parent route is connected and role-protected.',
            'Student results and exam data can inform future guardian summaries.',
            'The new UI system is ready for a dedicated family-facing workspace.',
          ],
        ),
      },
    );
  }
}

class _StudentDashboard extends ConsumerWidget {
  const _StudentDashboard({required this.userName});

  final String userName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboard = ref.watch(studentDashboardProvider);
    final notifications = ref.watch(notificationListProvider);

    return dashboard.when(
      data: (data) {
        final activeExams = data.availableExams
            .where((exam) => exam.availabilityState == 'available_now')
            .toList();
        final upcomingExams = data.availableExams
            .where((exam) => exam.availabilityState == 'upcoming')
            .toList();
        final notificationsList = notifications.maybeWhen(
          data: (items) => items,
          orElse: () => const <AppNotification>[],
        );
        return ListView(
          children: [
            _DashboardIntroCard(
              title: 'Good to see you, $userName',
              subtitle:
                  'Track what is due next, resume active exams calmly, and review performance signals that need attention.',
              primaryActionLabel: 'Open exams',
              onPrimaryAction: () => context.go(AppRoutes.exams),
              secondaryActionLabel: 'View results',
              onSecondaryAction: () => context.go(AppRoutes.results),
            ),
            const SizedBox(height: AppSpacing.lg),
            _MetricGrid(
              children: [
                DashboardStatCard(
                  label: 'Upcoming exams',
                  value: '${upcomingExams.length}',
                  helper: 'Scheduled ahead',
                  icon: Icons.event_available_outlined,
                ),
                DashboardStatCard(
                  label: 'Active exams',
                  value: '${activeExams.length}',
                  helper: 'Ready right now',
                  icon: Icons.play_circle_outline_rounded,
                  tint: AppColors.info,
                ),
                DashboardStatCard(
                  label: 'Completed exams',
                  value: '${data.recentResultCount}',
                  helper: 'Published results',
                  icon: Icons.task_alt_outlined,
                  tint: AppColors.teal,
                ),
                DashboardStatCard(
                  label: 'Performance summary',
                  value: '${data.insightSummary.averagePercentage}%',
                  helper: 'Average score',
                  icon: Icons.trending_up_rounded,
                  tint: AppColors.accent,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),
            LayoutBuilder(
              builder: (context, constraints) {
                final isWide = constraints.maxWidth >= 1100;
                final left = Column(
                  children: [
                    _DashboardListSection(
                      title: 'Upcoming exams',
                      subtitle:
                          'Officially scheduled papers you should prepare for next.',
                      actionLabel: 'Open exams',
                      onActionTap: () => context.go(AppRoutes.exams),
                      items: upcomingExams,
                      emptyMessage: 'No upcoming exams are scheduled yet.',
                      itemBuilder: (exam) => _DashboardRecordTile(
                        title: exam.title,
                        subtitle: exam.code,
                        meta: _formatExamWindow(exam.startAt, exam.endAt),
                        badge: 'Upcoming',
                        trailing: const StatusBadgeComponent(label: 'Pending'),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    _DashboardListSection(
                      title: 'Active exams',
                      subtitle:
                          'Exams that are available right now for quick entry or resume.',
                      actionLabel: 'Go to exams',
                      onActionTap: () => context.go(AppRoutes.exams),
                      items: activeExams,
                      emptyMessage: 'No exams are active right now.',
                      itemBuilder: (exam) => _DashboardRecordTile(
                        title: exam.title,
                        subtitle: exam.code,
                        meta: _formatExamWindow(exam.startAt, exam.endAt),
                        badge: 'Active',
                        trailing: const StatusBadgeComponent(label: 'Live'),
                      ),
                    ),
                  ],
                );
                final right = Column(
                  children: [
                    _StudentPerformanceSummaryCard(
                      summary: data.insightSummary,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    _DashboardListSection(
                      title: 'Announcements',
                      subtitle:
                          'Latest reminders, updates, and exam-related notices visible to you.',
                      items: notificationsList.take(4).toList(),
                      emptyMessage:
                          'Announcements and reminders will appear here.',
                      itemBuilder: (item) =>
                          _NotificationRecordTile(notification: item),
                    ),
                  ],
                );
                if (!isWide) {
                  return Column(
                    children: [
                      left,
                      const SizedBox(height: AppSpacing.lg),
                      right,
                    ],
                  );
                }
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(flex: 7, child: left),
                    const SizedBox(width: AppSpacing.lg),
                    Expanded(flex: 5, child: right),
                  ],
                );
              },
            ),
          ],
        );
      },
      loading: () => const AppLoader(label: 'Loading student dashboard'),
      error: (error, _) => AppErrorState(message: readApiErrorMessage(error)),
    );
  }
}

class _TeacherDashboard extends ConsumerWidget {
  const _TeacherDashboard({required this.userName});

  final String userName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboard = ref.watch(teacherDashboardProvider);
    final notifications = ref.watch(notificationListProvider);

    return dashboard.when(
      data: (data) {
        final upcomingExams = data.exams
            .where((exam) => exam.status.toLowerCase().contains('scheduled'))
            .toList();
        final liveExams = data.exams
            .where((exam) => exam.status.toLowerCase().contains('live'))
            .toList();
        final notificationList = notifications.maybeWhen(
          data: (items) => items,
          orElse: () => const <AppNotification>[],
        );
        final pendingEvaluations = notificationList
            .where(
              (item) =>
                  !item.isRead &&
                  (item.notificationType.contains('submitted') ||
                      item.notificationType.contains('review') ||
                      item.title.toLowerCase().contains('evaluation')),
            )
            .toList();
        final recentSubmissions = notificationList
            .where(
              (item) =>
                  item.notificationType.contains('submitted') ||
                  item.title.toLowerCase().contains('submit'),
            )
            .take(5)
            .toList();

        final left = Column(
          children: [
            _DashboardListSection(
              title: 'Upcoming exams',
              subtitle: 'Papers that need preparation before they go live.',
              actionLabel: 'Manage exams',
              onActionTap: () => context.go(AppRoutes.exams),
              items: upcomingExams,
              emptyMessage: 'No upcoming exams are scheduled yet.',
              itemBuilder: (exam) => _DashboardRecordTile(
                title: exam.title,
                subtitle: exam.code,
                meta: exam.status,
                badge: 'Exam',
                trailing: StatusBadgeComponent(label: exam.status),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            _DashboardListSection(
              title: 'Live exams',
              subtitle: 'Fast access to exams currently in progress.',
              actionLabel: 'Open live monitor',
              onActionTap: () => context.go(AppRoutes.exams),
              items: liveExams,
              emptyMessage: 'No exams are live at the moment.',
              itemBuilder: (exam) => _DashboardRecordTile(
                title: exam.title,
                subtitle: exam.code,
                meta: 'Monitor in Exams workspace',
                badge: 'Live',
                trailing: StatusBadgeComponent(label: exam.status),
              ),
            ),
          ],
        );
        final right = Column(
          children: [
            _TeacherQuickActionsCard(
              examsCount: data.examsCount,
              questionsCount: data.questionsCount,
              resultSummaryCount: data.resultSummaryCount,
            ),
            const SizedBox(height: AppSpacing.lg),
            _DashboardListSection(
              title: 'Pending evaluations',
              subtitle: 'Unread submission or review cues that need action.',
              items: pendingEvaluations,
              emptyMessage: 'No pending evaluation signals right now.',
              itemBuilder: (item) =>
                  _NotificationRecordTile(notification: item),
            ),
            const SizedBox(height: AppSpacing.lg),
            _DashboardListSection(
              title: 'Recent submissions',
              subtitle: 'Latest student submission events from notifications.',
              items: recentSubmissions,
              emptyMessage: 'Recent submission activity will appear here.',
              itemBuilder: (item) =>
                  _NotificationRecordTile(notification: item),
            ),
          ],
        );

        return ListView(
          children: [
            WorkspacePageIntro(
              eyebrow: 'Teacher dashboard',
              title: 'Exam operations overview',
              subtitle:
                  'Keep exams moving, act on submission signals, and jump straight into the teacher tools that need attention.',
              breadcrumbs: const ['Teacher', 'Dashboard'],
              primaryAction: FilledButton.icon(
                onPressed: () => context.go(AppRoutes.exams),
                icon: const Icon(Icons.fact_check_outlined),
                label: const Text('Open exam workspace'),
              ),
              secondaryActions: [
                OutlinedButton.icon(
                  onPressed: () => context.go(AppRoutes.results),
                  icon: const Icon(Icons.analytics_outlined),
                  label: const Text('Open results'),
                ),
              ],
              metrics: [
                DashboardStatCard(
                  label: 'Upcoming exams',
                  value: '${upcomingExams.length}',
                  helper: 'Scheduled next',
                  icon: Icons.calendar_today_outlined,
                ),
                DashboardStatCard(
                  label: 'Live exams',
                  value: '${liveExams.length}',
                  helper: 'Currently running',
                  icon: Icons.play_circle_fill_rounded,
                  tint: AppColors.info,
                ),
                DashboardStatCard(
                  label: 'Pending evaluations',
                  value: '${pendingEvaluations.length}',
                  helper: 'Unread evaluation cues',
                  icon: Icons.assignment_late_outlined,
                  tint: AppColors.warning,
                ),
                DashboardStatCard(
                  label: 'Recent submissions',
                  value: '${recentSubmissions.length}',
                  helper: 'Latest submission events',
                  icon: Icons.outbox_outlined,
                  tint: AppColors.teal,
                ),
              ],
            ),
            WorkspaceSplitView(
              breakpoint: 1200,
              primaryFlex: 7,
              secondaryFlex: 5,
              primary: left,
              secondary: right,
            ),
          ],
        );
      },
      loading: () => const AppLoader(label: 'Loading teacher dashboard'),
      error: (error, _) => AppErrorState(message: readApiErrorMessage(error)),
    );
  }
}

class _InstituteAdminDashboard extends ConsumerWidget {
  const _InstituteAdminDashboard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final programs = ref.watch(setupProgramsProvider);
    final cohorts = ref.watch(setupCohortsProvider);
    final students = ref.watch(setupStudentsProvider);
    final teachers = ref.watch(setupTeachersProvider);
    final teacherDashboard = ref.watch(teacherDashboardProvider);
    final notifications = ref.watch(notificationListProvider);

    if ([
      programs,
      cohorts,
      students,
      teachers,
      teacherDashboard,
    ].any((value) => value.isLoading)) {
      return const AppLoader(label: 'Loading institute dashboard');
    }

    if ([
      programs,
      cohorts,
      students,
      teachers,
      teacherDashboard,
    ].any((value) => value.hasError)) {
      final error =
          programs.error ??
          cohorts.error ??
          students.error ??
          teachers.error ??
          teacherDashboard.error;
      return AppErrorState(
        message: readApiErrorMessage(
          error ?? Exception('Dashboard load failed'),
        ),
      );
    }

    final programsData = programs.value ?? const [];
    final cohortsData = cohorts.value ?? const [];
    final studentsData = students.value ?? const [];
    final teachersData = teachers.value ?? const [];
    final examData = teacherDashboard.value!;
    final recentNotifications = notifications.maybeWhen(
      data: (items) => items.take(5).toList(),
      orElse: () => const <AppNotification>[],
    );
    final alerts = recentNotifications.where((item) => !item.isRead).toList();

    return ListView(
      children: [
        _DashboardIntroCard(
          title: 'Institute operations',
          subtitle:
              'See setup health, exam activity, and recent operational signals in one place.',
          primaryActionLabel: 'Open academic setup',
          onPrimaryAction: () => context.go(AppRoutes.academicSetup),
          secondaryActionLabel: 'Open exams',
          onSecondaryAction: () => context.go(AppRoutes.exams),
        ),
        const SizedBox(height: AppSpacing.lg),
        _MetricGrid(
          children: [
            DashboardStatCard(
              label: 'Programs',
              value: '${programsData.length}',
              helper: 'Academic structures',
              icon: Icons.account_tree_outlined,
            ),
            DashboardStatCard(
              label: 'Classes & cohorts',
              value: '${cohortsData.length}',
              helper: 'Delivery groups',
              icon: Icons.groups_2_outlined,
              tint: AppColors.info,
            ),
            DashboardStatCard(
              label: 'Students',
              value: '${studentsData.length}',
              helper: 'Learners in scope',
              icon: Icons.school_outlined,
              tint: AppColors.teal,
            ),
            DashboardStatCard(
              label: 'Teachers',
              value: '${teachersData.length}',
              helper: 'Active teaching staff',
              icon: Icons.person_outline_rounded,
              tint: AppColors.accent,
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.lg),
        LayoutBuilder(
          builder: (context, constraints) {
            final isWide = constraints.maxWidth >= 1200;
            final left = Column(
              children: [
                _InstituteActivityCard(dashboardData: examData),
                const SizedBox(height: AppSpacing.lg),
                _DashboardListSection(
                  title: 'Recent actions',
                  subtitle: 'Latest institute activity and reminders.',
                  items: recentNotifications,
                  emptyMessage: 'Recent operational actions will appear here.',
                  itemBuilder: (item) =>
                      _NotificationRecordTile(notification: item),
                ),
              ],
            );
            final right = Column(
              children: [
                _DashboardListSection(
                  title: 'System alerts',
                  subtitle:
                      'Unread notifications or reminders that may need attention.',
                  items: alerts,
                  emptyMessage: 'No active alerts in the institute workspace.',
                  itemBuilder: (item) =>
                      _NotificationRecordTile(notification: item),
                ),
              ],
            );
            if (!isWide) {
              return Column(
                children: [
                  left,
                  const SizedBox(height: AppSpacing.lg),
                  right,
                ],
              );
            }
            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(flex: 7, child: left),
                const SizedBox(width: AppSpacing.lg),
                Expanded(flex: 5, child: right),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _PlatformAdminDashboard extends ConsumerWidget {
  const _PlatformAdminDashboard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final institutes = ref.watch(setupInstitutesProvider);
    final programs = ref.watch(setupProgramsProvider);
    final students = ref.watch(setupStudentsProvider);
    final teachers = ref.watch(setupTeachersProvider);
    final notifications = ref.watch(notificationListProvider);

    if ([
      institutes,
      programs,
      students,
      teachers,
    ].any((value) => value.isLoading)) {
      return const AppLoader(label: 'Loading platform dashboard');
    }
    if ([
      institutes,
      programs,
      students,
      teachers,
    ].any((value) => value.hasError)) {
      final error =
          institutes.error ??
          programs.error ??
          students.error ??
          teachers.error;
      return AppErrorState(
        message: readApiErrorMessage(
          error ?? Exception('Dashboard load failed'),
        ),
      );
    }

    final institutesData = institutes.value ?? const [];
    final programsData = programs.value ?? const [];
    final studentsData = students.value ?? const [];
    final teachersData = teachers.value ?? const [];
    final recentNotifications = notifications.maybeWhen(
      data: (items) => items.take(5).toList(),
      orElse: () => const <AppNotification>[],
    );
    final unreadAlerts = recentNotifications
        .where((item) => !item.isRead)
        .toList();

    return ListView(
      children: [
        _DashboardIntroCard(
          title: 'Platform operations',
          subtitle:
              'Monitor rollout scale, user footprint, and system-level reminders without leaving the admin shell.',
          primaryActionLabel: 'Open academic setup',
          onPrimaryAction: () => context.go(AppRoutes.academicSetup),
        ),
        const SizedBox(height: AppSpacing.lg),
        _MetricGrid(
          children: [
            DashboardStatCard(
              label: 'Institutes',
              value: '${institutesData.length}',
              helper: 'Tenant accounts',
              icon: Icons.apartment_outlined,
            ),
            DashboardStatCard(
              label: 'Classes & programs',
              value: '${programsData.length}',
              helper: 'Academic structures',
              icon: Icons.schema_outlined,
              tint: AppColors.info,
            ),
            DashboardStatCard(
              label: 'Students',
              value: '${studentsData.length}',
              helper: 'Users in rollout',
              icon: Icons.groups_outlined,
              tint: AppColors.teal,
            ),
            DashboardStatCard(
              label: 'Teachers',
              value: '${teachersData.length}',
              helper: 'Teaching users',
              icon: Icons.badge_outlined,
              tint: AppColors.accent,
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.lg),
        LayoutBuilder(
          builder: (context, constraints) {
            final isWide = constraints.maxWidth >= 1200;
            final left = Column(
              children: [
                _DashboardListSection(
                  title: 'Recent actions',
                  subtitle: 'Latest platform-level notifications and events.',
                  items: recentNotifications,
                  emptyMessage: 'Recent actions will appear here.',
                  itemBuilder: (item) =>
                      _NotificationRecordTile(notification: item),
                ),
              ],
            );
            final right = Column(
              children: [
                _DashboardListSection(
                  title: 'System alerts',
                  subtitle: 'Unread platform reminders or rollout issues.',
                  items: unreadAlerts,
                  emptyMessage: 'No active platform alerts right now.',
                  itemBuilder: (item) =>
                      _NotificationRecordTile(notification: item),
                ),
              ],
            );
            if (!isWide) {
              return Column(
                children: [
                  left,
                  const SizedBox(height: AppSpacing.lg),
                  right,
                ],
              );
            }
            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(flex: 7, child: left),
                const SizedBox(width: AppSpacing.lg),
                Expanded(flex: 5, child: right),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _StaticDashboard extends StatelessWidget {
  const _StaticDashboard({
    required this.title,
    required this.description,
    this.highlights = const [],
    this.actionLabel,
    this.actionRoute,
  });

  final String title;
  final String description;
  final List<String> highlights;
  final String? actionLabel;
  final String? actionRoute;

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        PlaceholderFeatureView(
          title: title,
          description: description,
          highlights: highlights,
          statusLabel: 'Role surface active',
          headerAction: actionLabel != null && actionRoute != null
              ? FilledButton(
                  onPressed: () => context.go(actionRoute!),
                  child: Text(actionLabel!),
                )
              : null,
          footerMessage:
              'This view already sits inside the new premium navigation shell, so future role-specific expansion can build on the same visual language without a separate redesign pass.',
        ),
      ],
    );
  }
}

class _DashboardIntroCard extends StatelessWidget {
  const _DashboardIntroCard({
    required this.title,
    required this.subtitle,
    this.primaryActionLabel,
    this.onPrimaryAction,
    this.secondaryActionLabel,
    this.onSecondaryAction,
  });

  final String title;
  final String subtitle;
  final String? primaryActionLabel;
  final VoidCallback? onPrimaryAction;
  final String? secondaryActionLabel;
  final VoidCallback? onSecondaryAction;

  @override
  Widget build(BuildContext context) {
    final isCompact = MediaQuery.sizeOf(context).width < 760;
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(
              context,
            ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            subtitle,
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
          ),
          if (primaryActionLabel != null || secondaryActionLabel != null) ...[
            const SizedBox(height: AppSpacing.lg),
            if (isCompact)
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (primaryActionLabel != null)
                    AppButton(
                      label: primaryActionLabel!,
                      onPressed: onPrimaryAction,
                    ),
                  if (secondaryActionLabel != null) ...[
                    const SizedBox(height: AppSpacing.sm),
                    AppButton(
                      label: secondaryActionLabel!,
                      onPressed: onSecondaryAction,
                      variant: AppButtonVariant.secondary,
                    ),
                  ],
                ],
              )
            else
              Wrap(
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.sm,
                children: [
                  if (primaryActionLabel != null)
                    AppButton(
                      label: primaryActionLabel!,
                      onPressed: onPrimaryAction,
                    ),
                  if (secondaryActionLabel != null)
                    AppButton(
                      label: secondaryActionLabel!,
                      onPressed: onSecondaryAction,
                      variant: AppButtonVariant.secondary,
                    ),
                ],
              ),
          ],
        ],
      ),
    );
  }
}

class _DashboardListSection extends StatelessWidget {
  const _DashboardListSection({
    required this.title,
    required this.subtitle,
    required this.items,
    required this.itemBuilder,
    required this.emptyMessage,
    this.actionLabel,
    this.onActionTap,
  });

  final String title;
  final String subtitle;
  final List<dynamic> items;
  final Widget Function(dynamic item) itemBuilder;
  final String emptyMessage;
  final String? actionLabel;
  final VoidCallback? onActionTap;

  @override
  Widget build(BuildContext context) {
    return WorkspaceSectionCard(
      title: title,
      subtitle: subtitle,
      actions: actionLabel == null
          ? null
          : [TextButton(onPressed: onActionTap, child: Text(actionLabel!))],
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (items.isEmpty)
            AppEmptyState(title: 'Nothing to show yet', message: emptyMessage)
          else
            ...items.take(5).map(itemBuilder),
        ],
      ),
    );
  }
}

class _StudentPerformanceSummaryCard extends StatelessWidget {
  const _StudentPerformanceSummaryCard({required this.summary});

  final StudentInsightSummary summary;

  @override
  Widget build(BuildContext context) {
    final strongest = summary.strongestSubjects.isEmpty
        ? 'Need more data'
        : '${summary.strongestSubjects.first.subjectName} • ${summary.strongestSubjects.first.averagePercentage}%';
    final weakest = summary.weakestSubjects.isEmpty
        ? 'Need more data'
        : '${summary.weakestSubjects.first.subjectName} • ${summary.weakestSubjects.first.averagePercentage}%';
    final weakTopic = summary.weakTopics.isEmpty
        ? 'No weak topic flagged yet'
        : '${summary.weakTopics.first.topicName} (${summary.weakTopics.first.subjectName})';

    return WorkspaceSectionCard(
      title: 'Performance summary',
      subtitle: 'A quick read on current score, accuracy, and focus areas.',
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [
              AppBadge(label: 'Average ${summary.averagePercentage}%'),
              AppBadge(label: 'Accuracy ${summary.accuracyPercentage}%'),
              AppBadge(label: 'Attempted ${summary.attemptedQuestions}'),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          _SummaryLine(
            label: 'Trend',
            value: summary.improvementTrend.direction,
          ),
          _SummaryLine(label: 'Strongest subject', value: strongest),
          _SummaryLine(label: 'Needs support', value: weakest),
          _SummaryLine(label: 'Topic to revisit', value: weakTopic),
        ],
      ),
    );
  }
}

class _TeacherQuickActionsCard extends StatelessWidget {
  const _TeacherQuickActionsCard({
    required this.examsCount,
    required this.questionsCount,
    required this.resultSummaryCount,
  });

  final int examsCount;
  final int questionsCount;
  final int resultSummaryCount;

  @override
  Widget build(BuildContext context) {
    return WorkspaceSectionCard(
      title: 'Quick actions',
      subtitle: 'Common teacher actions without digging through menus.',
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ActionButtonGroupComponent(
            expand: false,
            items: [
              ActionButtonGroupItem(
                label: 'Manage exams',
                onPressed: () => context.go(AppRoutes.exams),
                isPrimary: true,
                icon: Icons.fact_check_outlined,
              ),
              ActionButtonGroupItem(
                label: 'Question bank',
                onPressed: () => context.go(AppRoutes.questionBank),
                icon: Icons.library_books_outlined,
              ),
              ActionButtonGroupItem(
                label: 'Open results',
                onPressed: () => context.go(AppRoutes.results),
                icon: Icons.analytics_outlined,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [
              AppBadge(label: '$examsCount exams'),
              AppBadge(label: '$questionsCount questions'),
              AppBadge(label: '$resultSummaryCount summaries'),
            ],
          ),
        ],
      ),
    );
  }
}

class _InstituteActivityCard extends StatelessWidget {
  const _InstituteActivityCard({required this.dashboardData});

  final TeacherDashboardData dashboardData;

  @override
  Widget build(BuildContext context) {
    final liveCount = dashboardData.exams
        .where((exam) => exam.status.toLowerCase().contains('live'))
        .length;
    final completedCount = dashboardData.exams
        .where((exam) => exam.status.toLowerCase().contains('completed'))
        .length;

    return WorkspaceSectionCard(
      title: 'Exam activity',
      subtitle: 'Current exam operations across the institute workspace.',
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [
              AppBadge(label: '${dashboardData.examsCount} total exams'),
              AppBadge(label: '$liveCount live'),
              AppBadge(label: '$completedCount completed'),
              AppBadge(
                label:
                    '${dashboardData.insightSummary.overview.totalAttempts} attempts',
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          _SummaryLine(
            label: 'Average score',
            value:
                '${dashboardData.insightSummary.overview.averagePercentage}%',
          ),
          _SummaryLine(
            label: 'Accuracy',
            value:
                '${dashboardData.insightSummary.overview.accuracyPercentage}%',
          ),
          _SummaryLine(
            label: 'Tracked exams',
            value:
                '${dashboardData.insightSummary.overview.trackedExams} analytics records',
          ),
        ],
      ),
    );
  }
}

class _NotificationRecordTile extends StatelessWidget {
  const _NotificationRecordTile({required this.notification});

  final AppNotification notification;

  @override
  Widget build(BuildContext context) {
    return _DashboardRecordTile(
      title: notification.title,
      subtitle: notification.message,
      meta: _formatNotificationTime(notification.createdAt),
      badge: notification.notificationType.replaceAll('_', ' '),
      trailing: StatusBadgeComponent(
        label: notification.isRead ? 'Completed' : 'Pending',
      ),
    );
  }
}

class _SummaryLine extends StatelessWidget {
  const _SummaryLine({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 140,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              value,
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionCard<T> extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.subtitle,
    required this.items,
    required this.itemBuilder,
    this.actionLabel,
    this.onActionTap,
  });

  final String title;
  final String subtitle;
  final List<dynamic> items;
  final Widget Function(dynamic item) itemBuilder;
  final String? actionLabel;
  final VoidCallback? onActionTap;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppSectionHeader(
            title: title,
            subtitle: subtitle,
            action: actionLabel == null
                ? null
                : TextButton(onPressed: onActionTap, child: Text(actionLabel!)),
          ),
          const SizedBox(height: AppSpacing.md),
          if (items.isEmpty)
            const AppEmptyState(
              title: 'Nothing to show yet',
              message: 'This section will populate as data becomes available.',
            )
          else
            ...items.take(5).map(itemBuilder),
        ],
      ),
    );
  }
}

class _InsightMessageCard extends StatelessWidget {
  const _InsightMessageCard({required this.messages});

  final List<String> messages;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      gradient: LinearGradient(
        colors: [
          AppColors.surface,
          AppColors.surfaceStrong.withValues(alpha: 0.92),
        ],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const AppSectionHeader(
            title: 'Learning insights',
            subtitle: 'Short signals generated from your current exam data.',
          ),
          const SizedBox(height: AppSpacing.md),
          if (messages.isEmpty)
            Text(
              'Complete a few more exams to unlock stronger performance insights.',
              style: Theme.of(context).textTheme.bodyMedium,
            )
          else
            ...messages
                .take(4)
                .map(
                  (message) => Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(
                          Icons.auto_awesome_outlined,
                          size: 18,
                          color: AppColors.primary,
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(child: Text(message)),
                      ],
                    ),
                  ),
                ),
        ],
      ),
    );
  }
}

class _StudentInsightGrid extends StatelessWidget {
  const _StudentInsightGrid({required this.summary});

  final StudentInsightSummary summary;

  @override
  Widget build(BuildContext context) {
    final strongest = summary.strongestSubjects;
    final weakest = summary.weakestSubjects;
    final weakTopics = summary.weakTopics;
    final weakTypes = summary.weakQuestionTypes;
    return Wrap(
      spacing: AppSpacing.md,
      runSpacing: AppSpacing.md,
      children: [
        _InsightListCard(
          title: 'Strongest subjects',
          tint: AppColors.teal,
          entries: strongest
              .map((item) => '${item.subjectName} • ${item.averagePercentage}%')
              .toList(),
        ),
        _InsightListCard(
          title: 'Weakest subjects',
          tint: AppColors.rose,
          entries: weakest
              .map((item) => '${item.subjectName} • ${item.averagePercentage}%')
              .toList(),
        ),
        _InsightListCard(
          title: 'Weak topics',
          tint: AppColors.amber,
          entries: weakTopics
              .map(
                (item) =>
                    '${item.topicName} (${item.subjectName}) • ${item.averagePercentage}%',
              )
              .toList(),
        ),
        _InsightListCard(
          title: 'Attempt behavior',
          tint: AppColors.accent,
          entries: [
            'Attempted questions: ${summary.attemptedQuestions}',
            'Skipped questions: ${summary.skippedQuestions}',
            'Trend: ${summary.improvementTrend.direction} (${summary.improvementTrend.changePercentage}%)',
            if (weakTypes.isNotEmpty)
              'Watch ${weakTypes.first.questionType.replaceAll('_', ' ')} mistakes',
          ],
        ),
      ],
    );
  }
}

class _TeacherInsightPanel extends StatelessWidget {
  const _TeacherInsightPanel({required this.summary});

  final TeacherInsightSummary summary;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Wrap(
          spacing: AppSpacing.md,
          runSpacing: AppSpacing.md,
          children: [
            _InsightListCard(
              title: 'Weak topics',
              tint: AppColors.rose,
              entries: summary.weakTopics
                  .map(
                    (item) =>
                        '${item.topicName ?? item.subjectName} • ${item.averagePercentage}%',
                  )
                  .toList(),
            ),
            _InsightListCard(
              title: 'Low-performing students',
              tint: AppColors.amber,
              entries: summary.lowPerformingStudents
                  .map(
                    (item) =>
                        '${item.studentName} • ${item.averagePercentage}%',
                  )
                  .toList(),
            ),
            _InsightListCard(
              title: 'High-performing students',
              tint: AppColors.teal,
              entries: summary.highPerformingStudents
                  .map(
                    (item) =>
                        '${item.studentName} • ${item.averagePercentage}%',
                  )
                  .toList(),
            ),
            _InsightListCard(
              title: 'Exam overview',
              tint: AppColors.accent,
              entries: summary.examOverview
                  .map(
                    (item) =>
                        '${item.examTitle} • ${item.averagePercentage}% avg',
                  )
                  .toList(),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.lg),
        Wrap(
          spacing: AppSpacing.md,
          runSpacing: AppSpacing.md,
          children: [
            _InsightListCard(
              title: 'Most skipped questions',
              tint: AppColors.secondary,
              entries: summary.mostSkippedQuestions
                  .map(
                    (item) =>
                        '${item.questionTextSummary} • ${item.skippedCount ?? 0} skipped',
                  )
                  .toList(),
            ),
            _InsightListCard(
              title: 'Most wrong questions',
              tint: AppColors.rose,
              entries: summary.mostWrongQuestions
                  .map(
                    (item) =>
                        '${item.questionTextSummary} • ${item.wrongCount ?? 0} wrong',
                  )
                  .toList(),
            ),
          ],
        ),
      ],
    );
  }
}

class _TeacherActionLane extends StatelessWidget {
  const _TeacherActionLane({
    required this.examsCount,
    required this.questionsCount,
    required this.resultSummaryCount,
  });

  final int examsCount;
  final int questionsCount;
  final int resultSummaryCount;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      gradient: LinearGradient(
        colors: [
          AppColors.surface,
          AppColors.surfaceStrong.withValues(alpha: 0.9),
        ],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const AppSectionHeader(
            eyebrow: 'Teacher control lane',
            title: 'Most-used actions',
            subtitle:
                'Jump into the operational flows teachers usually need first during testing and daily usage.',
          ),
          const SizedBox(height: AppSpacing.md),
          Wrap(
            spacing: AppSpacing.md,
            runSpacing: AppSpacing.md,
            children: [
              _TeacherActionCard(
                title: 'Run exam builder',
                description:
                    'Create, assign, publish, or monitor exams from the main teacher workspace.',
                badge: '$examsCount exams',
                icon: Icons.fact_check_outlined,
                tint: AppColors.accent,
                onTap: () => context.go(AppRoutes.exams),
              ),
              _TeacherActionCard(
                title: 'Curate question bank',
                description:
                    'Add more questions, improve explanations, and tighten question quality.',
                badge: '$questionsCount questions',
                icon: Icons.library_books_outlined,
                tint: AppColors.secondary,
                onTap: () => context.go(AppRoutes.questionBank),
              ),
              _TeacherActionCard(
                title: 'Review analytics',
                description:
                    'Check leaderboard movement, low performers, and question-level misses.',
                badge: '$resultSummaryCount summaries',
                icon: Icons.analytics_outlined,
                tint: AppColors.teal,
                onTap: () => context.go(AppRoutes.results),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TeacherActionCard extends StatelessWidget {
  const _TeacherActionCard({
    required this.title,
    required this.description,
    required this.badge,
    required this.icon,
    required this.tint,
    required this.onTap,
  });

  final String title;
  final String description;
  final String badge;
  final IconData icon;
  final Color tint;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 320,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        child: Ink(
          decoration: BoxDecoration(
            color: AppColors.surfaceMuted,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: tint.withValues(alpha: 0.18)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                        color: tint.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Icon(icon, color: tint),
                    ),
                    const Spacer(),
                    AppBadge(
                      label: badge,
                      backgroundColor: tint.withValues(alpha: 0.12),
                      foregroundColor: tint,
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  description,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _QuestionQualitySnapshot extends StatelessWidget {
  const _QuestionQualitySnapshot({required this.items});

  final List<TeacherQuestionPerformanceItem> items;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const AppSectionHeader(
            title: 'Question quality signals',
            subtitle:
                'Spot items that are confusing, skipped often, or consistently answered wrong.',
          ),
          const SizedBox(height: AppSpacing.md),
          if (items.isEmpty)
            const AppEmptyState(
              title: 'No question quality data yet',
              message:
                  'Question usage and difficulty signals will appear once students attempt them.',
            )
          else
            ...items
                .take(5)
                .map(
                  (item) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: CircleAvatar(
                      backgroundColor: AppColors.subtleAccent,
                      child: Text(
                        '${item.usageCount}',
                        style: Theme.of(context).textTheme.labelMedium
                            ?.copyWith(color: AppColors.accent),
                      ),
                    ),
                    title: Text(item.questionTextSummary),
                    subtitle: Text(
                      'Wrong ${item.wrongAttemptPercentage}% • Skip ${item.skipPercentage}% • Used ${item.usageCount} times',
                    ),
                    trailing: AppBadge(label: item.difficultyLevel),
                  ),
                ),
        ],
      ),
    );
  }
}

class _InsightListCard extends StatelessWidget {
  const _InsightListCard({
    required this.title,
    required this.entries,
    required this.tint,
  });

  final String title;
  final List<String> entries;
  final Color tint;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 320,
      child: AppCard(
        gradient: LinearGradient(
          colors: [AppColors.surface, tint.withValues(alpha: 0.08)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: tint,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Text(
                    title,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            if (entries.isEmpty)
              Text(
                'Not enough data yet.',
                style: Theme.of(context).textTheme.bodyMedium,
              )
            else
              ...entries
                  .take(5)
                  .map(
                    (entry) => Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.bolt_rounded, size: 16, color: tint),
                          const SizedBox(width: AppSpacing.xs),
                          Expanded(child: Text(entry)),
                        ],
                      ),
                    ),
                  ),
          ],
        ),
      ),
    );
  }
}

class _DashboardHeroCard extends StatelessWidget {
  const _DashboardHeroCard({
    required this.eyebrow,
    required this.title,
    required this.description,
    required this.insights,
    this.action,
  });

  final String eyebrow;
  final String title;
  final String description;
  final List<String> insights;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.sizeOf(context).width >= 980;
    final isCompact = MediaQuery.sizeOf(context).width < 600;
    final content = [
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppBadge(
            label: eyebrow,
            backgroundColor: AppColors.surface.withValues(alpha: 0.80),
            foregroundColor: AppColors.secondary,
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            title,
            style:
                (isCompact
                        ? Theme.of(context).textTheme.headlineSmall
                        : Theme.of(context).textTheme.headlineMedium)
                    ?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            description,
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
          ),
          if (action != null) ...[
            SizedBox(height: isCompact ? AppSpacing.lg : AppSpacing.xl),
            action!,
          ],
          const SizedBox(height: AppSpacing.lg),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: insights
                .take(3)
                .map(
                  (entry) => _HeroSignalChip(
                    label: entry.contains(':')
                        ? entry.split(':').first.trim()
                        : 'Signal',
                    value: entry.contains(':')
                        ? entry.split(':').sublist(1).join(':').trim()
                        : entry,
                  ),
                )
                .toList(),
          ),
        ],
      ),
      _HeroInsightRail(insights: insights),
    ];

    return AppCard(
      gradient: LinearGradient(
        colors: [
          AppColors.surface,
          AppColors.subtleAccent.withValues(alpha: 0.95),
          AppColors.surface,
        ],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      child: isWide
          ? Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(flex: 3, child: content[0]),
                const SizedBox(width: AppSpacing.xl),
                Expanded(flex: 2, child: content[1]),
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                content[0],
                const SizedBox(height: AppSpacing.xl),
                content[1],
              ],
            ),
    );
  }
}

class _HeroInsightRail extends StatelessWidget {
  const _HeroInsightRail({required this.insights});

  final List<String> insights;

  @override
  Widget build(BuildContext context) {
    final isCompact = MediaQuery.sizeOf(context).width < 600;
    return AppCard(
      padding: EdgeInsets.all(isCompact ? AppSpacing.md : AppSpacing.lg),
      backgroundColor: AppColors.surface.withValues(alpha: 0.74),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Today’s focus lane',
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: AppSpacing.md),
          ...insights
              .take(3)
              .map(
                (entry) => Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 10,
                        height: 10,
                        margin: const EdgeInsets.only(top: 6),
                        decoration: const BoxDecoration(
                          color: AppColors.accent,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(child: Text(entry)),
                    ],
                  ),
                ),
              ),
        ],
      ),
    );
  }
}

class _HeroSignalChip extends StatelessWidget {
  const _HeroSignalChip({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minWidth: 180, maxWidth: 260),
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: AppColors.surface.withValues(alpha: 0.78),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border.withValues(alpha: 0.72)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

class _MetricGrid extends StatelessWidget {
  const _MetricGrid({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final cardWidth = width >= 1400
        ? 232.0
        : width >= 1180
        ? 220.0
        : width >= 780
        ? 210.0
        : double.infinity;
    return Wrap(
      spacing: AppSpacing.md,
      runSpacing: AppSpacing.md,
      children: children
          .map((child) => SizedBox(width: cardWidth, child: child))
          .toList(),
    );
  }
}

class _DashboardRecordTile extends StatelessWidget {
  const _DashboardRecordTile({
    required this.title,
    required this.subtitle,
    required this.meta,
    required this.badge,
    this.trailing,
  });

  final String title;
  final String subtitle;
  final String meta;
  final String badge;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border.withValues(alpha: 0.85)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppBadge(label: badge),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          trailing ??
              Text(
                meta,
                style: Theme.of(
                  context,
                ).textTheme.labelLarge?.copyWith(color: AppColors.secondary),
              ),
        ],
      ),
    );
  }
}

String _formatExamWindow(DateTime? startAt, DateTime? endAt) {
  if (startAt == null) {
    return 'Schedule pending';
  }
  final start =
      '${startAt.day.toString().padLeft(2, '0')}/${startAt.month.toString().padLeft(2, '0')} ${startAt.hour.toString().padLeft(2, '0')}:${startAt.minute.toString().padLeft(2, '0')}';
  if (endAt == null) {
    return start;
  }
  final end =
      '${endAt.hour.toString().padLeft(2, '0')}:${endAt.minute.toString().padLeft(2, '0')}';
  return '$start • $end';
}

String _formatNotificationTime(DateTime? value) {
  if (value == null) {
    return 'Recent';
  }
  return '${value.day.toString().padLeft(2, '0')}/${value.month.toString().padLeft(2, '0')} ${value.hour.toString().padLeft(2, '0')}:${value.minute.toString().padLeft(2, '0')}';
}
