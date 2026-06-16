import 'package:education_frontend/app/router/app_routes.dart';
import 'package:education_frontend/features/auth/presentation/providers/auth_controller.dart';
import 'package:education_frontend/features/dashboard/presentation/widgets/dashboard_shell.dart';
import 'package:education_frontend/features/exams/presentation/providers/student_exam_providers.dart';
import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:education_frontend/shared/utils/app_date_time.dart';
import 'package:education_frontend/shared/widgets/app_card.dart';
import 'package:education_frontend/shared/widgets/app_button.dart';
import 'package:education_frontend/shared/widgets/app_error_state.dart';
import 'package:education_frontend/shared/widgets/app_loader.dart';
import 'package:education_frontend/shared/widgets/app_section_header.dart';
import 'package:education_frontend/shared/widgets/page_header_component.dart';
import 'package:education_frontend/shared/widgets/status_badge_component.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class StudentAttemptSummaryPage extends ConsumerWidget {
  const StudentAttemptSummaryPage({
    required this.examId,
    required this.attemptId,
    super.key,
  });

  final String examId;
  final String attemptId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    if (user == null) {
      return const SizedBox.shrink();
    }

    final summaryValue = ref.watch(studentAttemptSummaryProvider(attemptId));

    return DashboardShell(
      title: 'Attempt Summary',
      user: user,
      currentRoute: AppRoutes.exams,
      onLogout: () => ref.read(authControllerProvider.notifier).logout(),
      body: summaryValue.when(
        data: (summary) => ListView(
          children: [
            const PageHeaderComponent(
              eyebrow: 'Exam complete',
              title: 'Attempt summary',
              subtitle:
                  'Review your submission status, key numbers, and the next action available to you.',
              breadcrumbs: ['Student', 'Exams', 'Summary'],
            ),
            const SizedBox(height: AppSpacing.lg),
            _ExamJourneyHero(
              eyebrow: 'Attempt complete',
              title: summary.examTitle,
              description:
                  'Review how this attempt ended, how you scored, and what actions are available next.',
              highlights: [
                'Attempt #${summary.attemptNo}',
                'Status: ${summary.status}',
                summary.resultVisible
                    ? 'Final score: ${summary.finalScore}'
                    : 'Result visibility follows exam policy',
              ],
            ),
            const SizedBox(height: AppSpacing.xl),
            AppCard(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: AppSectionHeader(
                            title: summary.examTitle,
                            subtitle:
                                'Attempt #${summary.attemptNo} • ${summary.status}',
                          ),
                        ),
                        StatusBadgeComponent(label: summary.status),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    Wrap(
                      spacing: 16,
                      runSpacing: 16,
                      children: [
                        _SummaryTile(
                          label: 'Attempted',
                          value: '${summary.attemptedQuestions}',
                        ),
                        _SummaryTile(
                          label: 'Correct',
                          value: summary.resultVisible
                              ? '${summary.correctAnswers}'
                              : 'Hidden',
                        ),
                        _SummaryTile(
                          label: 'Incorrect',
                          value: summary.resultVisible
                              ? '${summary.incorrectAnswers}'
                              : 'Hidden',
                        ),
                        _SummaryTile(
                          label: 'Skipped',
                          value: summary.resultVisible
                              ? '${summary.skippedQuestions}'
                              : 'Hidden',
                        ),
                        _SummaryTile(
                          label: 'Final score',
                          value: summary.resultVisible
                              ? summary.finalScore
                              : 'Pending',
                        ),
                        _SummaryTile(
                          label: 'Percentage',
                          value: summary.resultVisible
                              ? '${summary.percentage}%'
                              : 'Pending',
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    Wrap(
                      spacing: 16,
                      runSpacing: 12,
                      children: [
                        _SummaryTile(
                          label: 'Started at',
                          value: formatLocalDateTime(
                            summary.startedAt,
                            fallback: '-',
                          ),
                        ),
                        _SummaryTile(
                          label: 'Submitted at',
                          value: formatLocalDateTime(
                            summary.submittedAt,
                            fallback: '-',
                          ),
                        ),
                        _SummaryTile(
                          label: 'Window ended',
                          value: formatLocalDateTime(
                            summary.expiresAt,
                            fallback: '-',
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    AppCard(
                      backgroundColor: AppColors.surfaceMuted,
                      child: Text(
                        'Time taken: ${_formatTimeTaken(summary.timeTakenSeconds)}',
                      ),
                    ),
                    if (!summary.resultVisible) ...[
                      const SizedBox(height: 8),
                      AppCard(
                        backgroundColor: AppColors.primary.withValues(
                          alpha: 0.08,
                        ),
                        child: Text(
                          'Detailed scoring is not visible yet. Result access will follow this exam’s publish policy.',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ),
                    ],
                    if (summary.isAutoSubmitted) ...[
                      const SizedBox(height: 8),
                      AppCard(
                        backgroundColor: AppColors.amber.withValues(
                          alpha: 0.12,
                        ),
                        child: Text(
                          'This attempt was auto-submitted when the exam timer ended.',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ),
                    ],
                    if (summary.resultVisible) ...[
                      const SizedBox(height: AppSpacing.lg),
                      AppCard(
                        backgroundColor: AppColors.surfaceMuted,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Performance feedback',
                              style: Theme.of(context).textTheme.titleMedium
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: AppSpacing.sm),
                            ..._summaryFeedback(summary).map(
                              (item) => Padding(
                                padding: const EdgeInsets.only(
                                  bottom: AppSpacing.xs,
                                ),
                                child: Text('• $item'),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    if (summary.status != 'in_progress') ...[
                      const SizedBox(height: AppSpacing.lg),
                      Wrap(
                        spacing: 12,
                        runSpacing: 12,
                        children: [
                          AppButton(
                            label: 'Review attempt',
                            icon: Icons.menu_book_rounded,
                            onPressed: summary.reviewAvailable
                                ? () => context.go(
                                    AppRoutes.studentAttemptReview(
                                      examId: examId,
                                      attemptId: attemptId,
                                    ),
                                  )
                                : null,
                          ),
                          AppButton(
                            label: 'Back to exams',
                            variant: AppButtonVariant.secondary,
                            onPressed: () => context.go(AppRoutes.exams),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
        loading: () => const AppLoader(label: 'Preparing attempt summary'),
        error: (error, _) => AppErrorState(message: error.toString()),
      ),
    );
  }
}

class _SummaryTile extends StatelessWidget {
  const _SummaryTile({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 180,
      child: AppCard(
        backgroundColor: AppColors.surfaceMuted,
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
            ),
          ],
        ),
      ),
    );
  }
}

class _ExamJourneyHero extends StatelessWidget {
  const _ExamJourneyHero({
    required this.eyebrow,
    required this.title,
    required this.description,
    required this.highlights,
  });

  final String eyebrow;
  final String title;
  final String description;
  final List<String> highlights;

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.sizeOf(context).width >= 980;
    return AppCard(
      backgroundColor: AppColors.surface,
      child: isWide
          ? Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  flex: 3,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      StatusBadgeComponent(label: eyebrow),
                      const SizedBox(height: AppSpacing.lg),
                      Text(
                        title,
                        style: Theme.of(context).textTheme.headlineMedium
                            ?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        description,
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: AppSpacing.xl),
                Expanded(flex: 2, child: _JourneyHighlights(items: highlights)),
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                StatusBadgeComponent(label: eyebrow),
                const SizedBox(height: AppSpacing.lg),
                Text(
                  title,
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  description,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: AppSpacing.xl),
                _JourneyHighlights(items: highlights),
              ],
            ),
    );
  }
}

class _JourneyHighlights extends StatelessWidget {
  const _JourneyHighlights({required this.items});

  final List<String> items;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.lg),
      backgroundColor: AppColors.surfaceMuted,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Summary pulse',
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: AppSpacing.md),
          ...items
              .take(4)
              .map(
                (item) => Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(
                        Icons.bolt_rounded,
                        size: 16,
                        color: AppColors.accent,
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(child: Text(item)),
                    ],
                  ),
                ),
              ),
        ],
      ),
    );
  }
}

String _formatTimeTaken(int? seconds) {
  if (seconds == null) {
    return 'Pending';
  }
  final duration = Duration(seconds: seconds);
  final minutes = duration.inMinutes;
  final remainingSeconds = duration.inSeconds.remainder(60);
  return '$minutes min ${remainingSeconds.toString().padLeft(2, '0')} sec';
}

List<String> _summaryFeedback(dynamic summary) {
  final percentage = double.tryParse(summary.percentage.toString()) ?? 0;
  if (percentage >= 85) {
    return const [
      'Strong attempt overall. Keep the same pace and revision discipline for your next paper.',
      'Use the review screen to turn marked questions into secure marks next time.',
    ];
  }
  if (percentage >= 60) {
    return const [
      'A balanced attempt with room to improve accuracy and answer confidence.',
      'Review incorrect and skipped questions first to find the biggest score gains.',
    ];
  }
  return const [
    'This attempt needs a focused revision plan before the next exam.',
    'Start with skipped and incorrect questions, then build confidence section by section.',
  ];
}
