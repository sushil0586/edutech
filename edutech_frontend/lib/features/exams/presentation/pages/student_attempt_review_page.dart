import 'package:education_frontend/app/router/app_routes.dart';
import 'package:education_frontend/core/network/api_error_message.dart';
import 'package:education_frontend/features/auth/presentation/providers/auth_controller.dart';
import 'package:education_frontend/features/dashboard/domain/models/student_insight_summary.dart';
import 'package:education_frontend/features/dashboard/presentation/providers/dashboard_providers.dart';
import 'package:education_frontend/features/dashboard/presentation/widgets/dashboard_shell.dart';
import 'package:education_frontend/features/exams/domain/models/student_attempt_review.dart';
import 'package:education_frontend/features/exams/presentation/providers/student_exam_providers.dart';
import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:education_frontend/shared/utils/app_date_time.dart';
import 'package:education_frontend/shared/widgets/app_badge.dart';
import 'package:education_frontend/shared/widgets/app_card.dart';
import 'package:education_frontend/shared/widgets/app_empty_state.dart';
import 'package:education_frontend/shared/widgets/app_error_state.dart';
import 'package:education_frontend/shared/widgets/app_loader.dart';
import 'package:education_frontend/shared/widgets/app_rich_text_renderer.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class StudentAttemptReviewPage extends ConsumerStatefulWidget {
  const StudentAttemptReviewPage({
    required this.examId,
    required this.attemptId,
    super.key,
  });

  final String examId;
  final String attemptId;

  @override
  ConsumerState<StudentAttemptReviewPage> createState() =>
      _StudentAttemptReviewPageState();
}

enum _ReviewFilter { all, correct, wrong, skipped, marked }

class _StudentAttemptReviewPageState
    extends ConsumerState<StudentAttemptReviewPage> {
  _ReviewFilter _filter = _ReviewFilter.all;
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    if (user == null) {
      return const SizedBox.shrink();
    }

    final reviewValue = ref.watch(studentAttemptReviewProvider(widget.attemptId));
    final insightValue = ref.watch(studentInsightSummaryProvider);

    return DashboardShell(
      title: 'Attempt Review',
      user: user,
      currentRoute: AppRoutes.results,
      onLogout: () => ref.read(authControllerProvider.notifier).logout(),
      body: reviewValue.when(
        data: (review) {
          final filteredQuestions = review.questions.where((question) {
            return switch (_filter) {
              _ReviewFilter.all => true,
              _ReviewFilter.correct => question.wasCorrect,
              _ReviewFilter.wrong => question.wasWrong,
              _ReviewFilter.skipped => question.wasSkipped,
              _ReviewFilter.marked => question.isMarkedForReview,
            };
          }).toList();

          if (filteredQuestions.isEmpty) {
            return const AppEmptyState(
              title: 'No review items for this filter',
              message:
                  'Try a broader review filter to inspect question outcomes and explanations.',
            );
          }

          final safeIndex = _currentIndex.clamp(0, filteredQuestions.length - 1);
          final question = filteredQuestions[safeIndex];
          final isWide = MediaQuery.sizeOf(context).width >= 1180;
          final insightSummary = insightValue.maybeWhen(
            data: (summary) => summary,
            orElse: () => null,
          );

          final sidebar = AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  review.examTitle,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text('${review.examCode} • Attempt #${review.attemptNo}'),
                const SizedBox(height: AppSpacing.lg),
                Wrap(
                  spacing: AppSpacing.sm,
                  runSpacing: AppSpacing.sm,
                  children: [
                    _FilterChip(
                      label: 'All',
                      selected: _filter == _ReviewFilter.all,
                      onTap: () => setState(() => _filter = _ReviewFilter.all),
                    ),
                    _FilterChip(
                      label: 'Correct',
                      selected: _filter == _ReviewFilter.correct,
                      onTap: () =>
                          setState(() => _filter = _ReviewFilter.correct),
                    ),
                    _FilterChip(
                      label: 'Wrong',
                      selected: _filter == _ReviewFilter.wrong,
                      onTap: () => setState(() => _filter = _ReviewFilter.wrong),
                    ),
                    _FilterChip(
                      label: 'Skipped',
                      selected: _filter == _ReviewFilter.skipped,
                      onTap: () =>
                          setState(() => _filter = _ReviewFilter.skipped),
                    ),
                    _FilterChip(
                      label: 'Marked',
                      selected: _filter == _ReviewFilter.marked,
                      onTap: () =>
                          setState(() => _filter = _ReviewFilter.marked),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.lg),
                Expanded(
                  child: ListView.separated(
                    itemCount: filteredQuestions.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final item = filteredQuestions[index];
                      final selected = question.questionId == item.questionId;
                      return InkWell(
                        borderRadius: BorderRadius.circular(18),
                        onTap: () => setState(() => _currentIndex = index),
                        child: Ink(
                          decoration: BoxDecoration(
                            color: selected
                                ? AppColors.backgroundSoft
                                : AppColors.surface,
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(
                              color: selected
                                  ? AppColors.primary.withValues(alpha: 0.24)
                                  : AppColors.border,
                            ),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(AppSpacing.md),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    AppBadge(
                                      label: 'Q${item.questionOrder}',
                                      backgroundColor:
                                          AppColors.primary.withValues(
                                            alpha: 0.12,
                                          ),
                                      foregroundColor: AppColors.primary,
                                    ),
                                    const SizedBox(width: AppSpacing.sm),
                                    _ResultBadge(status: item.resultStatus),
                                  ],
                                ),
                                const SizedBox(height: AppSpacing.sm),
                                AppRichTextRenderer(
                                  content: item.questionText,
                                  contentFormat: item.contentFormat,
                                  compact: true,
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          );

          final detail = Column(
            children: [
              Expanded(
                child: _ReviewQuestionPanel(
                  review: review,
                  question: question,
                  questionCount: filteredQuestions.length,
                  currentIndex: safeIndex,
                  onPrevious: safeIndex == 0
                      ? null
                      : () => setState(() => _currentIndex = safeIndex - 1),
                  onNext: safeIndex >= filteredQuestions.length - 1
                      ? null
                      : () => setState(() => _currentIndex = safeIndex + 1),
                ),
              ),
              if (insightSummary != null) ...[
                const SizedBox(height: AppSpacing.lg),
                _WhatToImproveCard(summary: insightSummary),
              ],
            ],
          );

          if (isWide) {
            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(width: 340, child: sidebar),
                const SizedBox(width: AppSpacing.lg),
                Expanded(child: detail),
              ],
            );
          }

          return Column(
            children: [
              SizedBox(height: 320, child: sidebar),
              const SizedBox(height: AppSpacing.lg),
              Expanded(child: detail),
            ],
          );
        },
        loading: () => const AppLoader(label: 'Loading attempt review'),
        error: (error, _) => AppErrorState(message: readApiErrorMessage(error)),
      ),
    );
  }
}

class _WhatToImproveCard extends StatelessWidget {
  const _WhatToImproveCard({required this.summary});

  final StudentInsightSummary summary;

  @override
  Widget build(BuildContext context) {
    final topicEntries = summary.weakTopics
        .map((item) => '${item.topicName} (${item.subjectName})')
        .toList();
    final typeEntries = summary.weakQuestionTypes
        .map((item) => item.questionType.replaceAll('_', ' '))
        .toList();
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'What to improve',
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: AppSpacing.sm),
          if (topicEntries.isEmpty && typeEntries.isEmpty)
            Text(
              'Complete a few more reviewed exams to unlock targeted study advice.',
            )
          else ...[
            if (topicEntries.isNotEmpty) ...[
              Text(
                'Weak topics',
                style: Theme.of(
                  context,
                ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: AppSpacing.xs),
              ...topicEntries.take(3).map((entry) => Text('• $entry')),
              const SizedBox(height: AppSpacing.md),
            ],
            if (typeEntries.isNotEmpty) ...[
              Text(
                'Frequently wrong question types',
                style: Theme.of(
                  context,
                ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: AppSpacing.xs),
              ...typeEntries.take(2).map((entry) => Text('• $entry')),
            ],
          ],
        ],
      ),
    );
  }
}

class _ReviewQuestionPanel extends StatelessWidget {
  const _ReviewQuestionPanel({
    required this.review,
    required this.question,
    required this.questionCount,
    required this.currentIndex,
    required this.onPrevious,
    required this.onNext,
  });

  final StudentAttemptReview review;
  final StudentAttemptReviewQuestion question;
  final int questionCount;
  final int currentIndex;
  final VoidCallback? onPrevious;
  final VoidCallback? onNext;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: ListView(
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Question ${currentIndex + 1} of $questionCount',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Wrap(
                      spacing: AppSpacing.sm,
                      runSpacing: AppSpacing.sm,
                      children: [
                        if ((question.subjectName ?? '').isNotEmpty)
                          AppBadge(label: question.subjectName!),
                        if ((question.topicName ?? '').isNotEmpty)
                          AppBadge(label: question.topicName!),
                        AppBadge(label: question.difficultyLevel),
                        _ResultBadge(status: question.resultStatus),
                      ],
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: onPrevious,
                icon: const Icon(Icons.arrow_back_rounded),
              ),
              IconButton(
                onPressed: onNext,
                icon: const Icon(Icons.arrow_forward_rounded),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          LinearProgressIndicator(
            value: questionCount == 0 ? 0 : (currentIndex + 1) / questionCount,
            minHeight: 8,
            borderRadius: BorderRadius.circular(999),
            backgroundColor: AppColors.border,
            color: AppColors.primary,
          ),
          const SizedBox(height: AppSpacing.lg),
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: AppColors.surfaceMuted,
              borderRadius: BorderRadius.circular(18),
            ),
            child: Wrap(
              spacing: AppSpacing.md,
              runSpacing: AppSpacing.sm,
              children: [
                _ReviewStat(
                  label: 'Started at',
                  value: formatLocalDateTime(review.startedAt, fallback: '-'),
                ),
                _ReviewStat(
                  label: 'Submitted at',
                  value: formatLocalDateTime(review.submittedAt, fallback: '-'),
                ),
                _ReviewStat(
                  label: 'Time taken',
                  value: _formatSeconds(review.timeTakenSeconds),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          AppRichTextRenderer(
            content: question.questionText,
            contentFormat: question.contentFormat,
            attachments: question.attachments,
          ),
          const SizedBox(height: AppSpacing.lg),
          ...question.options.map(
            (option) => Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: option.isCorrect
                      ? AppColors.success.withValues(alpha: 0.12)
                      : option.isSelected
                      ? AppColors.warning.withValues(alpha: 0.12)
                      : AppColors.surface,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                    color: option.isCorrect
                        ? AppColors.success.withValues(alpha: 0.32)
                        : option.isSelected
                        ? AppColors.warning.withValues(alpha: 0.32)
                        : AppColors.border,
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: AppRichTextRenderer(
                        content: option.optionText,
                        contentFormat: option.contentFormat,
                        compact: true,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    if (option.isSelected)
                      const AppBadge(
                        label: 'Your answer',
                        backgroundColor: Color(0xFFFEF3C7),
                        foregroundColor: AppColors.warning,
                      ),
                    if (option.isCorrect) ...[
                      if (option.isSelected) const SizedBox(width: AppSpacing.xs),
                      const AppBadge(
                        label: 'Correct',
                        backgroundColor: Color(0xFFD1FAE5),
                        foregroundColor: AppColors.success,
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Your answer',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Builder(
                        builder: (context) {
                          final selectedOptions = question.options.where((item) => item.isSelected).toList();
                          if (selectedOptions.isEmpty) {
                            return const Text('No answer selected');
                          }
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: selectedOptions
                                .map(
                                  (item) => Padding(
                                    padding: const EdgeInsets.only(bottom: AppSpacing.xs),
                                    child: AppRichTextRenderer(
                                      content: item.optionText,
                                      contentFormat: item.contentFormat,
                                      compact: true,
                                    ),
                                  ),
                                )
                                .toList(),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Correct answer',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: question.options
                            .where((item) => item.isCorrect)
                            .map(
                              (item) => Padding(
                                padding: const EdgeInsets.only(bottom: AppSpacing.xs),
                                child: AppRichTextRenderer(
                                  content: item.optionText,
                                  contentFormat: item.contentFormat,
                                  compact: true,
                                ),
                              ),
                            )
                            .toList(),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: AppColors.surfaceMuted,
              borderRadius: BorderRadius.circular(18),
            ),
            child: Wrap(
              spacing: AppSpacing.md,
              runSpacing: AppSpacing.sm,
              children: [
                _ReviewStat(label: 'Score', value: question.marksAwarded),
                _ReviewStat(
                  label: 'Negative',
                  value: question.negativeMarksApplied,
                ),
                _ReviewStat(
                  label: 'Marked',
                  value: question.isMarkedForReview ? 'Yes' : 'No',
                ),
                _ReviewStat(
                  label: 'Time taken',
                  value: _formatSeconds(review.timeTakenSeconds),
                ),
              ],
            ),
          ),
          if (question.explanation.trim().isNotEmpty) ...[
            const SizedBox(height: AppSpacing.lg),
            AppCard(
              padding: const EdgeInsets.all(AppSpacing.lg),
              backgroundColor: AppColors.primary.withValues(alpha: 0.06),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Teacher explanation',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  AppRichTextRenderer(
                    content: question.explanation,
                    contentFormat: question.contentFormat,
                    compact: true,
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(999),
      onTap: onTap,
      child: Ink(
        decoration: BoxDecoration(
          color: selected ? AppColors.primary.withValues(alpha: 0.12) : null,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: selected ? AppColors.primary : AppColors.border,
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.sm,
          ),
          child: Text(label),
        ),
      ),
    );
  }
}

class _ResultBadge extends StatelessWidget {
  const _ResultBadge({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final (bg, fg, label) = switch (status) {
      'correct' => (
          AppColors.success.withValues(alpha: 0.12),
          AppColors.success,
          'Correct',
        ),
      'wrong' => (
          AppColors.error.withValues(alpha: 0.12),
          AppColors.error,
          'Wrong',
        ),
      _ => (
          AppColors.warning.withValues(alpha: 0.12),
          AppColors.warning,
          'Skipped',
        ),
    };
    return AppBadge(label: label, backgroundColor: bg, foregroundColor: fg);
  }
}

class _ReviewStat extends StatelessWidget {
  const _ReviewStat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 132,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: AppSpacing.xxs),
          Text(
            value,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

String _formatSeconds(int? value) {
  if (value == null) {
    return 'Pending';
  }
  final duration = Duration(seconds: value);
  final hours = duration.inHours;
  final minutes = duration.inMinutes.remainder(60);
  final seconds = duration.inSeconds.remainder(60);
  if (hours > 0) {
    return '${hours}h ${minutes}m ${seconds}s';
  }
  return '${minutes}m ${seconds.toString().padLeft(2, '0')}s';
}
