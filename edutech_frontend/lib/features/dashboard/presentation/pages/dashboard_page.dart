import 'package:education_frontend/app/router/app_routes.dart';
import 'package:education_frontend/core/network/api_error_message.dart';
import 'package:education_frontend/features/auth/domain/models/app_role.dart';
import 'package:education_frontend/features/auth/presentation/providers/auth_controller.dart';
import 'package:education_frontend/features/dashboard/domain/models/student_dashboard_data.dart';
import 'package:education_frontend/features/dashboard/domain/models/student_insight_summary.dart';
import 'package:education_frontend/features/dashboard/domain/models/teacher_dashboard_data.dart';
import 'package:education_frontend/features/dashboard/domain/models/teacher_insight_summary.dart';
import 'package:education_frontend/features/dashboard/domain/models/teacher_question_performance_item.dart';
import 'package:education_frontend/features/dashboard/presentation/providers/dashboard_providers.dart';
import 'package:education_frontend/features/dashboard/presentation/widgets/dashboard_shell.dart';
import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:education_frontend/shared/presentation/widgets/placeholder_feature_view.dart';
import 'package:education_frontend/shared/widgets/app_card.dart';
import 'package:education_frontend/shared/widgets/app_empty_state.dart';
import 'package:education_frontend/shared/widgets/app_error_state.dart';
import 'package:education_frontend/shared/widgets/app_section_header.dart';
import 'package:education_frontend/shared/widgets/dashboard_stat_card.dart';
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
        AppRole.platformAdmin => const _StaticDashboard(
          title: 'Platform operations',
          description:
              'Platform admins can now manage institute-scoped academic data and use the full demo flow from a controlled admin surface.',
          actionLabel: 'Open academic setup',
          actionRoute: AppRoutes.academicSetup,
        ),
        AppRole.instituteAdmin => const _StaticDashboard(
          title: 'Institute operations',
          description:
              'Institute admins can configure academic years, programs, cohorts, subjects, topics, students, teachers, and assignments from one place.',
          actionLabel: 'Manage academic setup',
          actionRoute: AppRoutes.academicSetup,
        ),
        AppRole.parent => const _StaticDashboard(
          title: 'Parent portal placeholder',
          description:
              'Parent accounts can sign in and reach a reserved dashboard foundation. Progress views and guardian communications can slot in here later.',
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

    return dashboard.when(
      data: (data) => ListView(
        children: [
          PlaceholderFeatureView(
            title: 'Welcome back, $userName',
            description:
                'Your student dashboard is connected to the backend and ready to surface live exam availability plus published result snapshots.',
            highlights: [
              'Available exams: ${data.availableExamCount}',
              'Recent results: ${data.recentResultCount}',
              'Use the exams and results tabs to drill into review and performance details.',
            ],
            headerAction: FilledButton(
              onPressed: () => context.go(AppRoutes.exams),
              child: const Text('Open exams'),
            ),
          ),
          const SizedBox(height: AppSpacing.xl),
          Wrap(
            spacing: AppSpacing.md,
            runSpacing: AppSpacing.md,
            children: [
              DashboardStatCard(
                label: 'Available exams',
                value: '${data.availableExamCount}',
                helper: 'Ready to attempt',
                icon: Icons.assignment_outlined,
              ),
              DashboardStatCard(
                label: 'Recent results',
                value: '${data.recentResultCount}',
                helper: 'Published snapshots',
                icon: Icons.analytics_outlined,
                tint: AppColors.accent,
              ),
              DashboardStatCard(
                label: 'Average %',
                value: '${data.insightSummary.averagePercentage}%',
                helper: 'Across recent results',
                icon: Icons.trending_up_rounded,
                tint: AppColors.secondary,
              ),
              DashboardStatCard(
                label: 'Accuracy',
                value: '${data.insightSummary.accuracyPercentage}%',
                helper: 'Correct vs attempted',
                icon: Icons.gpp_good_outlined,
                tint: AppColors.primary,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xl),
          _InsightMessageCard(messages: data.insightSummary.insightMessages),
          const SizedBox(height: AppSpacing.lg),
          _StudentInsightGrid(summary: data.insightSummary),
          const SizedBox(height: AppSpacing.lg),
          _SectionCard<StudentDashboardData>(
            title: 'Available exams',
            items: data.availableExams,
            itemBuilder: (exam) => ListTile(
              title: Text(exam.title),
              subtitle: Text(exam.code),
              trailing: Text(
                exam.startAt == null
                    ? 'Schedule pending'
                    : '${exam.startAt!.day}/${exam.startAt!.month} ${exam.startAt!.hour.toString().padLeft(2, '0')}:${exam.startAt!.minute.toString().padLeft(2, '0')}',
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          _SectionCard<StudentDashboardData>(
            title: 'Recent results',
            items: data.recentResults,
            itemBuilder: (result) => ListTile(
              title: Text(result.examTitle),
              subtitle: Text('${result.percentage}% • ${result.resultStatus}'),
              trailing: Text(result.finalScore),
            ),
          ),
        ],
      ),
      loading: () => const Center(child: CircularProgressIndicator()),
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

    return dashboard.when(
      data: (data) => ListView(
        children: [
          PlaceholderFeatureView(
            title: 'Teaching workspace',
            description:
                'This shell gives teachers quick access to institute exams, question repositories, and result-summary placeholders without exposing broader admin surfaces.',
            highlights: [
              'Exams: ${data.examsCount}',
              'Questions: ${data.questionsCount}',
              'Result summaries: ${data.resultSummaryCount}',
            ],
            headerAction: FilledButton(
              onPressed: () => context.go(AppRoutes.questionBank),
              child: const Text('Open question bank'),
            ),
          ),
          const SizedBox(height: AppSpacing.xl),
          Wrap(
            spacing: AppSpacing.md,
            runSpacing: AppSpacing.md,
            children: [
              DashboardStatCard(
                label: 'Exams',
                value: '${data.examsCount}',
                helper: 'Scoped to your institute',
                icon: Icons.fact_check_outlined,
              ),
              DashboardStatCard(
                label: 'Questions',
                value: '${data.questionsCount}',
                helper: 'Question bank records',
                icon: Icons.library_books_outlined,
                tint: AppColors.secondary,
              ),
              DashboardStatCard(
                label: 'Result summaries',
                value: '${data.resultSummaryCount}',
                helper: 'Analytics snapshots',
                icon: Icons.stacked_bar_chart_outlined,
                tint: AppColors.accent,
              ),
              DashboardStatCard(
                label: 'Average %',
                value: '${data.insightSummary.overview.averagePercentage}%',
                helper: 'Across evaluated exams',
                icon: Icons.auto_graph_rounded,
                tint: AppColors.primary,
              ),
              DashboardStatCard(
                label: 'Accuracy',
                value: '${data.insightSummary.overview.accuracyPercentage}%',
                helper: 'Across submitted answers',
                icon: Icons.checklist_rounded,
                tint: AppColors.secondary,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xl),
          _TeacherInsightPanel(summary: data.insightSummary),
          const SizedBox(height: AppSpacing.lg),
          _SectionCard<TeacherDashboardData>(
            title: 'Recent exams',
            items: data.exams,
            itemBuilder: (exam) => ListTile(
              title: Text(exam.title),
              subtitle: Text(exam.code),
              trailing: Text(exam.status),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          _SectionCard<TeacherDashboardData>(
            title: 'Question bank snapshot',
            items: data.questions,
            itemBuilder: (question) => ListTile(
              title: Text(
                question.questionText,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              subtitle: Text(question.questionType),
              trailing: Text(question.difficultyLevel),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          _QuestionQualitySnapshot(items: data.questionPerformance),
        ],
      ),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => AppErrorState(message: readApiErrorMessage(error)),
    );
  }
}

class _StaticDashboard extends StatelessWidget {
  const _StaticDashboard({
    required this.title,
    required this.description,
    this.actionLabel,
    this.actionRoute,
  });

  final String title;
  final String description;
  final String? actionLabel;
  final String? actionRoute;

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        PlaceholderFeatureView(
          title: title,
          description: description,
          highlights: const [
            'JWT auth is now wired to the backend.',
            'Role-based routing keeps each user in the right surface area.',
            'The responsive shell is ready for module expansion.',
          ],
          headerAction: actionLabel != null && actionRoute != null
              ? FilledButton(
                  onPressed: () => context.go(actionRoute!),
                  child: Text(actionLabel!),
                )
              : null,
        ),
      ],
    );
  }
}

class _SectionCard<T> extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.items,
    required this.itemBuilder,
  });

  final String title;
  final List<dynamic> items;
  final Widget Function(dynamic item) itemBuilder;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppSectionHeader(title: title),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const AppSectionHeader(title: 'Learning insights'),
          const SizedBox(height: AppSpacing.md),
          if (messages.isEmpty)
            Text(
              'Complete a few more exams to unlock stronger performance insights.',
              style: Theme.of(context).textTheme.bodyMedium,
            )
          else
            ...messages.take(4).map(
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
          entries: strongest
              .map((item) => '${item.subjectName} • ${item.averagePercentage}%')
              .toList(),
        ),
        _InsightListCard(
          title: 'Weakest subjects',
          entries: weakest
              .map((item) => '${item.subjectName} • ${item.averagePercentage}%')
              .toList(),
        ),
        _InsightListCard(
          title: 'Weak topics',
          entries: weakTopics
              .map(
                (item) =>
                    '${item.topicName} (${item.subjectName}) • ${item.averagePercentage}%',
              )
              .toList(),
        ),
        _InsightListCard(
          title: 'Attempt behavior',
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
              entries: summary.weakTopics
                  .map(
                    (item) =>
                        '${item.topicName ?? item.subjectName} • ${item.averagePercentage}%',
                  )
                  .toList(),
            ),
            _InsightListCard(
              title: 'Low-performing students',
              entries: summary.lowPerformingStudents
                  .map(
                    (item) =>
                        '${item.studentName} • ${item.averagePercentage}%',
                  )
                  .toList(),
            ),
            _InsightListCard(
              title: 'High-performing students',
              entries: summary.highPerformingStudents
                  .map(
                    (item) =>
                        '${item.studentName} • ${item.averagePercentage}%',
                  )
                  .toList(),
            ),
            _InsightListCard(
              title: 'Exam overview',
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
              entries: summary.mostSkippedQuestions
                  .map(
                    (item) =>
                        '${item.questionTextSummary} • ${item.skippedCount ?? 0} skipped',
                  )
                  .toList(),
            ),
            _InsightListCard(
              title: 'Most wrong questions',
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

class _QuestionQualitySnapshot extends StatelessWidget {
  const _QuestionQualitySnapshot({required this.items});

  final List<TeacherQuestionPerformanceItem> items;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const AppSectionHeader(title: 'Question quality signals'),
          const SizedBox(height: AppSpacing.md),
          if (items.isEmpty)
            const AppEmptyState(
              title: 'No question quality data yet',
              message: 'Question usage and difficulty signals will appear once students attempt them.',
            )
          else
            ...items.take(5).map(
              (item) => ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(item.questionTextSummary),
                subtitle: Text(
                  'Wrong ${item.wrongAttemptPercentage}% • Skip ${item.skipPercentage}% • Used ${item.usageCount} times',
                ),
                trailing: Text(item.difficultyLevel),
              ),
            ),
        ],
      ),
    );
  }
}

class _InsightListCard extends StatelessWidget {
  const _InsightListCard({required this.title, required this.entries});

  final String title;
  final List<String> entries;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 320,
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: AppSpacing.md),
            if (entries.isEmpty)
              Text(
                'Not enough data yet.',
                style: Theme.of(context).textTheme.bodyMedium,
              )
            else
              ...entries.take(5).map(
                (entry) => Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                  child: Text(entry),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
