import 'package:education_frontend/app/router/app_routes.dart';
import 'package:education_frontend/core/network/api_error_message.dart';
import 'package:education_frontend/features/auth/domain/models/app_role.dart';
import 'package:education_frontend/features/auth/domain/models/app_user.dart';
import 'package:education_frontend/features/auth/presentation/providers/auth_controller.dart';
import 'package:education_frontend/features/dashboard/presentation/widgets/dashboard_shell.dart';
import 'package:education_frontend/features/results/domain/models/exam_result_model.dart';
import 'package:education_frontend/features/results/domain/models/exam_summary_model.dart';
import 'package:education_frontend/features/results/domain/models/leaderboard_row_model.dart';
import 'package:education_frontend/features/results/domain/models/teacher_exam_attempt_model.dart';
import 'package:education_frontend/features/results/domain/models/teacher_question_analysis_model.dart';
import 'package:education_frontend/features/results/domain/models/topic_performance_model.dart';
import 'package:education_frontend/features/results/presentation/helpers/results_selection.dart';
import 'package:education_frontend/features/results/presentation/providers/results_providers.dart';
import 'package:education_frontend/shared/presentation/widgets/placeholder_feature_view.dart';
import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:education_frontend/shared/utils/app_date_time.dart';
import 'package:education_frontend/shared/widgets/app_badge.dart';
import 'package:education_frontend/shared/widgets/app_card.dart';
import 'package:education_frontend/shared/widgets/app_loader.dart';
import 'package:education_frontend/shared/widgets/action_button_group_component.dart';
import 'package:education_frontend/shared/widgets/app_section_header.dart';
import 'package:education_frontend/shared/widgets/empty_state_component.dart';
import 'package:education_frontend/shared/widgets/filter_bar_component.dart';
import 'package:education_frontend/shared/widgets/kpi_card_component.dart';
import 'package:education_frontend/shared/widgets/loading_skeleton_component.dart';
import 'package:education_frontend/shared/widgets/page_header_component.dart';
import 'package:education_frontend/shared/widgets/professional_card_component.dart';
import 'package:education_frontend/shared/widgets/professional_data_table_component.dart';
import 'package:education_frontend/shared/widgets/status_badge_component.dart';
import 'package:education_frontend/shared/widgets/workspace_page_components.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class ResultsPage extends ConsumerStatefulWidget {
  const ResultsPage({super.key});

  @override
  ConsumerState<ResultsPage> createState() => _ResultsPageState();
}

class _ResultsPageState extends ConsumerState<ResultsPage> {
  String? _selectedStudentResultId;
  String? _selectedTeacherExamId;

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    if (user == null) {
      return const SizedBox.shrink();
    }

    return DashboardShell(
      title: 'Results',
      user: user,
      currentRoute: AppRoutes.results,
      onLogout: () => ref.read(authControllerProvider.notifier).logout(),
      body: switch (user.role) {
        AppRole.student => _StudentResultsView(
          user: user,
          selectedResultId: _selectedStudentResultId,
          onSelectResult: (resultId) {
            setState(() => _selectedStudentResultId = resultId);
          },
        ),
        AppRole.teacher => _TeacherResultsView(
          selectedExamId: _selectedTeacherExamId,
          onSelectExam: (examId) {
            setState(() => _selectedTeacherExamId = examId);
          },
        ),
        AppRole.instituteAdmin => _TeacherResultsView(
          workspaceLabel: 'Institute',
          selectedExamId: _selectedTeacherExamId,
          onSelectExam: (examId) {
            setState(() => _selectedTeacherExamId = examId);
          },
        ),
        _ => const PlaceholderFeatureView(
          title: 'Results workspace reserved',
          description:
              'Results and analytics are enabled for student and teacher roles in this phase.',
          highlights: [
            'Student result history is already connected to the backend.',
            'Teacher analytics and leaderboard views are live now.',
            'Additional role-based reporting can extend this same design system.',
          ],
          statusLabel: 'Reporting scoped by role',
          footerMessage:
              'The current release keeps detailed results surfaces focused on the users who actively attempt exams or review performance, while preserving a clean foundation for future reporting roles.',
        ),
      },
    );
  }
}

class _StudentResultsView extends ConsumerWidget {
  const _StudentResultsView({
    required this.user,
    required this.selectedResultId,
    required this.onSelectResult,
  });

  final AppUser user;
  final String? selectedResultId;
  final ValueChanged<String> onSelectResult;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final resultsValue = ref.watch(studentResultRecordsProvider);
    final studentId = user.studentProfileId;
    final performanceValue = studentId == null || studentId.isEmpty
        ? null
        : ref.watch(studentPerformanceProvider(studentId));

    return resultsValue.when(
      data: (results) {
        if (results.isEmpty) {
          return const _EmptyStateCard(
            title: 'No published results yet',
            description:
                'Your result records will appear here once submitted exams are processed and published by the backend.',
          );
        }

        final selectedResult = resolveStudentResultSelection(
          results,
          performanceValue,
          selectedResultId,
        );
        final isWide = MediaQuery.sizeOf(context).width >= 1100;

        final listPanel = ListView(
          children: [
            const PageHeaderComponent(
              eyebrow: 'Student performance',
              title: 'Results and performance',
              subtitle:
                  'Review published marks, rank, percentages, and topic-level breakdowns from your completed exams.',
              breadcrumbs: ['Student', 'Results'],
            ),
            const SizedBox(height: AppSpacing.lg),
            _MetricWrap(
              metrics: [
                _MetricData(
                  label: 'Results',
                  value: '${results.length}',
                  helper: 'Exam records available',
                  icon: Icons.fact_check_outlined,
                ),
                _MetricData(
                  label: 'Published',
                  value: '${results.where((item) => item.isPublished).length}',
                  helper: 'Visible now',
                  icon: Icons.public_rounded,
                  variant: KpiCardVariant.info,
                ),
                _MetricData(
                  label: 'Passed',
                  value:
                      '${results.where((item) => item.resultStatus == 'pass').length}',
                  helper: 'Backend pass status',
                  icon: Icons.verified_rounded,
                  variant: KpiCardVariant.success,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),
            AppCard(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const AppSectionHeader(
                      title: 'Result history',
                      subtitle:
                          'Open any result to review score summary, timing, and topic-level performance returned by the backend.',
                    ),
                    const SizedBox(height: AppSpacing.md),
                    ...results.map(
                      (result) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _StudentResultCard(
                          result: result,
                          isSelected: selectedResult?.id == result.id,
                          onTap: () => onSelectResult(result.id),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        );

        final detailPanel = selectedResult == null
            ? const _EmptyStateCard(
                title: 'Select a result',
                description:
                    'Pick a result record from the list to review detailed performance.',
              )
            : _StudentResultDetailPanel(
                result: selectedResult,
                topicPerformanceValue: ref.watch(
                  topicPerformanceProvider(
                    TopicPerformanceQuery(
                      examId: selectedResult.examId,
                      studentId: selectedResult.studentId,
                    ),
                  ),
                ),
              );

        if (isWide) {
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(flex: 5, child: listPanel),
              const SizedBox(width: 20),
              Expanded(flex: 4, child: detailPanel),
            ],
          );
        }

        return ListView(
          children: [
            ..._extractListChildren(listPanel),
            const SizedBox(height: 20),
            detailPanel,
          ],
        );
      },
      loading: () => const AppLoader(label: 'Loading your results'),
      error: (error, _) => _ErrorStateCard(error: error),
    );
  }
}

class _TeacherResultsView extends ConsumerWidget {
  const _TeacherResultsView({
    this.workspaceLabel = 'Teacher',
    required this.selectedExamId,
    required this.onSelectExam,
  });

  final String workspaceLabel;
  final String? selectedExamId;
  final ValueChanged<String> onSelectExam;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryRecordsValue = ref.watch(examSummaryRecordsProvider);

    return summaryRecordsValue.when(
      data: (summaryRecords) {
        if (summaryRecords.isEmpty) {
          return const _EmptyStateCard(
            title: 'No exam analytics available yet',
            description:
                'Exam summaries, leaderboards, and topic performance will appear once results have been generated for an exam.',
          );
        }

        final effectiveExamId = selectedExamId ?? summaryRecords.first.examId;
        final selectedSummary = summaryRecords.firstWhere(
          (item) => item.examId == effectiveExamId,
          orElse: () => summaryRecords.first,
        );
        final leaderboardValue = ref.watch(
          examLeaderboardProvider(selectedSummary.examId),
        );
        final attemptRowsValue = ref.watch(
          teacherExamAttemptsProvider(selectedSummary.examId),
        );
        final questionAnalysisValue = ref.watch(
          teacherQuestionAnalysisProvider(selectedSummary.examId),
        );
        final topicPerformanceValue = ref.watch(
          topicPerformanceProvider(
            TopicPerformanceQuery(examId: selectedSummary.examId),
          ),
        );
        final submittedCount = selectedSummary.totalAttempted;
        final evaluatedCount = _evaluatedCount(selectedSummary);
        final pendingCount = _pendingCount(selectedSummary);

        final overviewPanel = ListView(
          children: [
            WorkspaceSectionCard(
              title: 'Exam results list',
              subtitle:
                  'Each row shows submission progress, evaluation readiness, and publication state for one exam.',
              body: Column(
                children: [
                  FilterBarComponent(
                    children: [
                      SizedBox(
                        width: 360,
                        child: DropdownButtonFormField<String>(
                          initialValue: selectedSummary.examId,
                          decoration: const InputDecoration(
                            labelText: 'Selected exam',
                            hintText: 'Choose an exam summary',
                          ),
                          items: summaryRecords
                              .map(
                                (summary) => DropdownMenuItem<String>(
                                  value: summary.examId,
                                  child: Text(
                                    '${summary.examTitle} (${summary.examCode})',
                                  ),
                                ),
                              )
                              .toList(),
                          onChanged: (value) {
                            if (value != null && value.isNotEmpty) {
                              onSelectExam(value);
                            }
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  ...summaryRecords.map(
                    (summary) => Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                      child: _TeacherSummaryCard(
                        summary: summary,
                        isSelected: summary.examId == selectedSummary.examId,
                        onTap: () => onSelectExam(summary.examId),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        );

        final detailPanel = _TeacherAnalyticsPanel(
          summary: selectedSummary,
          leaderboardValue: leaderboardValue,
          attemptRowsValue: attemptRowsValue,
          questionAnalysisValue: questionAnalysisValue,
          topicPerformanceValue: topicPerformanceValue,
        );

        return ListView(
          children: [
            WorkspacePageIntro(
              eyebrow: '$workspaceLabel analytics',
              title: 'Exam performance hub',
              subtitle:
                  'Review result readiness, publication status, and student performance for one exam at a time.',
              breadcrumbs: [workspaceLabel, 'Results'],
              primaryAction: OutlinedButton.icon(
                onPressed: () => context.go(AppRoutes.exams),
                icon: const Icon(Icons.fact_check_outlined),
                label: const Text('Open exam operations'),
              ),
              metrics: [
                KpiCardComponent(
                  label: 'Total students',
                  value: '${selectedSummary.totalStudents}',
                  helper: 'Students in scope',
                  icon: Icons.groups_2_outlined,
                ),
                KpiCardComponent(
                  label: 'Submitted',
                  value: '$submittedCount',
                  helper: 'Attempt records found',
                  icon: Icons.assignment_turned_in_outlined,
                  variant: KpiCardVariant.info,
                ),
                KpiCardComponent(
                  label: 'Evaluated',
                  value: '$evaluatedCount',
                  helper: 'Pass or fail published in summary',
                  icon: Icons.rule_rounded,
                  variant: KpiCardVariant.success,
                ),
                KpiCardComponent(
                  label: 'Pending',
                  value: '$pendingCount',
                  helper: 'Submitted but not fully evaluated',
                  icon: Icons.hourglass_bottom_rounded,
                  variant: pendingCount > 0
                      ? KpiCardVariant.warning
                      : KpiCardVariant.neutral,
                ),
              ],
            ),
            WorkspaceSplitView(
              breakpoint: 1180,
              primaryFlex: 5,
              secondaryFlex: 6,
              primary: SizedBox(height: 860, child: overviewPanel),
              secondary: detailPanel,
            ),
          ],
        );
      },
      loading: () => const AppLoader(label: 'Loading result analytics'),
      error: (error, _) => _ErrorStateCard(error: error),
    );
  }
}

class _StudentResultCard extends StatelessWidget {
  const _StudentResultCard({
    required this.result,
    required this.isSelected,
    required this.onTap,
  });

  final ExamResultModel result;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: onTap,
      child: Ink(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          color: isSelected ? AppColors.backgroundSoft : AppColors.surfaceMuted,
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.border,
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      result.examTitle,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  StatusBadgeComponent(label: result.resultStatus),
                ],
              ),
              const SizedBox(height: 8),
              Text('${result.examCode} • ${result.finalScore} marks'),
              const SizedBox(height: 12),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  _MiniPill(
                    label: 'Percentage',
                    value: '${result.percentage}%',
                  ),
                  _MiniPill(
                    label: 'Rank',
                    value: result.rank?.toString() ?? 'Pending',
                  ),
                  _MiniPill(
                    label: 'Published',
                    value: result.isPublished ? 'Yes' : 'No',
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StudentResultDetailPanel extends StatelessWidget {
  const _StudentResultDetailPanel({
    required this.result,
    required this.topicPerformanceValue,
  });

  final ExamResultModel result;
  final AsyncValue<List<TopicPerformanceModel>> topicPerformanceValue;

  @override
  Widget build(BuildContext context) {
    final passed = result.resultStatus.toLowerCase() == 'pass';
    return AppCard(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: ListView(
          shrinkWrap: true,
          children: [
            ProfessionalCardComponent(
              header: _SectionHeaderBlock(
                title: result.examTitle,
                subtitle: '${result.examCode} • Student result detail',
              ),
              actions: [
                StatusBadgeComponent(label: result.resultStatus),
                StatusBadgeComponent(
                  label: result.isPublished ? 'Published' : 'Pending',
                ),
              ],
              body: Wrap(
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.sm,
                children: [
                  _MiniPill(label: 'Marks', value: result.finalScore),
                  _MiniPill(label: 'Total marks', value: result.totalMarks),
                  _MiniPill(
                    label: 'Percentage',
                    value: '${result.percentage}%',
                  ),
                  _MiniPill(
                    label: 'Rank',
                    value: result.rank?.toString() ?? 'Pending',
                  ),
                  _MiniPill(label: 'Outcome', value: passed ? 'Pass' : 'Fail'),
                ],
              ),
            ),
            const SizedBox(height: 18),
            _MetricWrap(
              metrics: [
                _MetricData(
                  label: 'Marks',
                  value: result.finalScore,
                  helper: 'Final marks awarded',
                  icon: Icons.emoji_events_outlined,
                  variant: passed
                      ? KpiCardVariant.success
                      : KpiCardVariant.warning,
                ),
                _MetricData(
                  label: 'Percentage',
                  value: '${result.percentage}%',
                  helper: 'Overall percentage',
                  icon: Icons.percent_rounded,
                  variant: KpiCardVariant.info,
                ),
                _MetricData(
                  label: 'Rank',
                  value: result.rank?.toString() ?? 'Pending',
                  helper: 'When available',
                  icon: Icons.leaderboard_rounded,
                ),
                _MetricData(
                  label: 'Result',
                  value: passed ? 'Pass' : 'Fail',
                  helper: 'Backend result status',
                  icon: passed
                      ? Icons.check_circle_outline_rounded
                      : Icons.error_outline_rounded,
                  variant: passed
                      ? KpiCardVariant.success
                      : KpiCardVariant.danger,
                ),
              ],
            ),
            const SizedBox(height: 18),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                if (result.isPublished)
                  FilledButton.icon(
                    onPressed: () => context.go(
                      AppRoutes.studentAttemptReview(
                        examId: result.examId,
                        attemptId: result.attemptId,
                      ),
                    ),
                    icon: const Icon(Icons.menu_book_rounded),
                    label: const Text('Review answers'),
                  ),
                OutlinedButton(
                  onPressed: () => context.go(
                    AppRoutes.studentAttemptSummary(
                      examId: result.examId,
                      attemptId: result.attemptId,
                    ),
                  ),
                  child: const Text('Open attempt summary'),
                ),
              ],
            ),
            const SizedBox(height: 18),
            AppCard(
              padding: EdgeInsets.zero,
              backgroundColor: AppColors.surfaceMuted,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Wrap(
                  spacing: 16,
                  runSpacing: 12,
                  children: [
                    _DetailStat(
                      label: 'Attempted',
                      value: '${result.attemptedQuestions}',
                    ),
                    _DetailStat(
                      label: 'Correct',
                      value: '${result.correctAnswers}',
                    ),
                    _DetailStat(
                      label: 'Incorrect',
                      value: '${result.incorrectAnswers}',
                    ),
                    _DetailStat(
                      label: 'Skipped',
                      value: '${result.skippedQuestions}',
                    ),
                    _DetailStat(
                      label: 'Negative score',
                      value: result.negativeScore,
                    ),
                    _DetailStat(
                      label: 'Time taken',
                      value: _formatSeconds(result.timeTakenSeconds),
                    ),
                    _DetailStat(
                      label: 'Published at',
                      value: _formatTimestamp(result.publishedAt),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 18),
            Text(
              'Section and topic performance',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 10),
            topicPerformanceValue.when(
              data: (items) => items.isEmpty
                  ? const _InlineEmptyState(
                      message:
                          'No topic-wise breakdown is available for this result yet.',
                    )
                  : Column(
                      children: items
                          .map(
                            (item) => Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: _TopicPerformanceTile(item: item),
                            ),
                          )
                          .toList(),
                    ),
              loading: () => const ProfessionalDataTableComponent(
                table: SizedBox.shrink(),
                isLoading: true,
                loadingType: LoadingSkeletonType.table,
                loadingItemCount: 4,
              ),
              error: (error, _) => _InlineErrorState(error: error),
            ),
            const SizedBox(height: 18),
            AppCard(
              backgroundColor: AppColors.surfaceMuted,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Feedback and next steps',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  ..._studentFeedbackLines(result).map(
                    (line) => Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
                      child: Text('• $line'),
                    ),
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

List<String> _studentFeedbackLines(ExamResultModel result) {
  final percentage = double.tryParse(result.percentage) ?? 0;
  if (percentage >= 85) {
    return const [
      'Strong result overall. Keep the same pace and accuracy for the next exam.',
      'Use the review screen to confirm whether your marked questions can be converted into easy marks next time.',
    ];
  }
  if (percentage >= 60) {
    return const [
      'This is a stable result, but there is room to lift accuracy and reduce skipped questions.',
      'Review incorrect and marked questions first, then focus on weaker topics in the breakdown below.',
    ];
  }
  return const [
    'This result needs a focused revision pass before the next exam.',
    'Start with weak topics and question types, then revisit skipped questions to improve attempt strategy.',
  ];
}

class _TeacherSummaryCard extends StatelessWidget {
  const _TeacherSummaryCard({
    required this.summary,
    required this.isSelected,
    required this.onTap,
  });

  final ExamSummaryModel summary;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final submitted = summary.totalAttempted;
    final evaluated = _evaluatedCount(summary);
    final pending = _pendingCount(summary);
    final analyticsStatus = _analyticsStatus(summary);
    final publishLabel = summary.isActive ? 'Published' : 'Pending';
    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: onTap,
      child: Ink(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          color: isSelected ? AppColors.backgroundSoft : AppColors.surface,
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.border,
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          summary.examTitle,
                          style: Theme.of(context).textTheme.titleMedium
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          '${summary.examCode} • ${summary.totalStudents} students',
                          style: Theme.of(context).textTheme.bodyMedium
                              ?.copyWith(color: AppColors.textSecondary),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Wrap(
                          spacing: AppSpacing.sm,
                          runSpacing: AppSpacing.sm,
                          children: [
                            StatusBadgeComponent(label: analyticsStatus),
                            StatusBadgeComponent(label: publishLabel),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '${summary.averagePercentage}%',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        'Average score',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Wrap(
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.sm,
                children: [
                  _MiniPill(label: 'Submitted', value: submitted),
                  _MiniPill(label: 'Evaluated', value: evaluated),
                  _MiniPill(label: 'Pending', value: pending),
                  _MiniPill(label: 'Highest', value: summary.highestScore),
                  _MiniPill(label: 'Passed', value: summary.totalPassed),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TeacherResultsActionLane extends StatelessWidget {
  const _TeacherResultsActionLane({
    required this.summary,
    required this.onOpenExams,
    required this.onOpenQuestionBank,
  });

  final ExamSummaryModel summary;
  final VoidCallback onOpenExams;
  final VoidCallback onOpenQuestionBank;

  @override
  Widget build(BuildContext context) {
    return ProfessionalCardComponent(
      header: const _SectionHeaderBlock(
        title: 'Result operations',
        subtitle:
            'Publishing, result generation, and rank calculation stay separated from analytics so teachers can review state first and act second.',
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ActionButtonGroupComponent(
            expand: false,
            items: [
              ActionButtonGroupItem(
                label: 'Open exam operations',
                icon: Icons.fact_check_outlined,
                isPrimary: true,
                onPressed: onOpenExams,
              ),
              ActionButtonGroupItem(
                label: 'Inspect weak questions',
                icon: Icons.quiz_outlined,
                onPressed: onOpenQuestionBank,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Wrap(
            spacing: AppSpacing.md,
            runSpacing: AppSpacing.md,
            children: [
              _ResultsActionCard(
                title: 'Publish and ranking controls',
                description:
                    'Use the exam workspace for generate results, calculate ranks, publish results, or rerun related actions safely.',
                badge: summary.examCode,
                icon: Icons.publish_rounded,
                tint: AppColors.primary,
                onTap: onOpenExams,
              ),
              _ResultsActionCard(
                title: 'Inspect weak questions',
                description:
                    'Jump into the question bank to improve confusing or low-performing questions.',
                badge: '${summary.totalAttempted} attempts',
                icon: Icons.quiz_outlined,
                tint: AppColors.info,
                onTap: onOpenQuestionBank,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ResultsActionCard extends StatelessWidget {
  const _ResultsActionCard({
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
            border: Border.all(color: AppColors.border),
          ),
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: tint.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(14),
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

enum _AttemptFilterMode { all, lowPerformers, skippedHeavy }

enum _QuestionInsightFilterMode { all, hardQuestions, skippedOften }

class _TeacherAnalyticsPanel extends StatefulWidget {
  const _TeacherAnalyticsPanel({
    required this.summary,
    required this.leaderboardValue,
    required this.attemptRowsValue,
    required this.questionAnalysisValue,
    required this.topicPerformanceValue,
  });

  final ExamSummaryModel summary;
  final AsyncValue<List<LeaderboardRowModel>> leaderboardValue;
  final AsyncValue<List<TeacherExamAttemptModel>> attemptRowsValue;
  final AsyncValue<List<TeacherQuestionAnalysisModel>> questionAnalysisValue;
  final AsyncValue<List<TopicPerformanceModel>> topicPerformanceValue;

  @override
  State<_TeacherAnalyticsPanel> createState() => _TeacherAnalyticsPanelState();
}

class _TeacherAnalyticsPanelState extends State<_TeacherAnalyticsPanel> {
  _AttemptFilterMode _attemptFilter = _AttemptFilterMode.all;
  _QuestionInsightFilterMode _questionFilter = _QuestionInsightFilterMode.all;

  @override
  Widget build(BuildContext context) {
    final submitted = widget.summary.totalAttempted;
    final evaluated = _evaluatedCount(widget.summary);
    final pending = _pendingCount(widget.summary);
    final publishLabel = widget.summary.isActive ? 'Published' : 'Pending';

    return AppCard(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: ListView(
          shrinkWrap: true,
          children: [
            ProfessionalCardComponent(
              header: _SectionHeaderBlock(
                title: widget.summary.examTitle,
                subtitle:
                    '${widget.summary.examCode} • Result readiness, ranking, and performance analytics',
              ),
              actions: [
                StatusBadgeComponent(label: _analyticsStatus(widget.summary)),
                StatusBadgeComponent(label: publishLabel),
              ],
              body: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: AppSpacing.sm,
                    runSpacing: AppSpacing.sm,
                    children: [
                      _MiniPill(
                        label: 'Last updated',
                        value: _formatTimestamp(
                          widget.summary.lastCalculatedAt,
                        ),
                      ),
                      _MiniPill(
                        label: 'Average score',
                        value: widget.summary.averageScore,
                      ),
                      _MiniPill(
                        label: 'Score range',
                        value:
                            '${widget.summary.highestScore} / ${widget.summary.lowestScore}',
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            _MetricWrap(
              metrics: [
                _MetricData(
                  label: 'Submitted',
                  value: '$submitted',
                  helper: 'Students who submitted',
                  icon: Icons.assignment_turned_in_outlined,
                  variant: KpiCardVariant.info,
                ),
                _MetricData(
                  label: 'Evaluated',
                  value: '$evaluated',
                  helper: 'Pass/fail outcomes ready',
                  icon: Icons.how_to_reg_rounded,
                  variant: KpiCardVariant.success,
                ),
                _MetricData(
                  label: 'Pending',
                  value: '$pending',
                  helper: pending > 0
                      ? 'Evaluation or publication still pending'
                      : 'No pending result work',
                  icon: Icons.schedule_send_rounded,
                  variant: pending > 0
                      ? KpiCardVariant.warning
                      : KpiCardVariant.neutral,
                ),
                _MetricData(
                  label: 'Average %',
                  value: '${widget.summary.averagePercentage}%',
                  helper: 'Overall performance',
                  icon: Icons.insights_rounded,
                  variant: KpiCardVariant.primary,
                ),
              ],
            ),
            const SizedBox(height: 18),
            if (submitted == 0)
              const _ResultsAlertCard(
                title: 'No submissions yet',
                message:
                    'Students have not submitted this exam yet, so ranking and performance analytics will appear after submissions are received.',
                tone: _AlertTone.info,
              )
            else if (pending > 0)
              _ResultsAlertCard(
                title: 'Results still have pending work',
                message:
                    'Some submissions are still pending evaluation or publication. Open the Exams workspace to generate, calculate ranks, or publish results for this exam.',
                tone: _AlertTone.warning,
                action: FilledButton.icon(
                  onPressed: () => context.go(AppRoutes.exams),
                  icon: const Icon(Icons.open_in_new_rounded),
                  label: const Text('Open exam operations'),
                ),
              )
            else
              _ResultsAlertCard(
                title: 'Results are ready',
                message:
                    'This exam has evaluated outcomes and is ready for publishing or deeper analytics review.',
                tone: _AlertTone.success,
                action: OutlinedButton.icon(
                  onPressed: () => context.go(AppRoutes.exams),
                  icon: const Icon(Icons.rocket_launch_outlined),
                  label: const Text('Open publish controls'),
                ),
              ),
            const SizedBox(height: 18),
            _TeacherResultsActionLane(
              summary: widget.summary,
              onOpenExams: () => context.go(AppRoutes.exams),
              onOpenQuestionBank: () => context.go(AppRoutes.questionBank),
            ),
            const SizedBox(height: 20),
            Text(
              'Leaderboard',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Marks, percentage, rank, and pass/fail state for the selected exam.',
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
            ),
            const SizedBox(height: 10),
            widget.leaderboardValue.when(
              data: (rows) => rows.isEmpty
                  ? const _InlineEmptyState(
                      message:
                          'No ranked student results are available yet. Complete result generation and rank calculation first.',
                    )
                  : _LeaderboardTable(rows: rows),
              loading: () => const ProfessionalDataTableComponent(
                table: SizedBox.shrink(),
                isLoading: true,
                loadingType: LoadingSkeletonType.table,
                loadingItemCount: 4,
              ),
              error: (error, _) => _InlineErrorState(error: error),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Student attempts',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                Wrap(
                  spacing: 8,
                  children: [
                    ChoiceChip(
                      label: const Text('All'),
                      selected: _attemptFilter == _AttemptFilterMode.all,
                      onSelected: (_) => setState(
                        () => _attemptFilter = _AttemptFilterMode.all,
                      ),
                    ),
                    ChoiceChip(
                      label: const Text('Low performers'),
                      selected:
                          _attemptFilter == _AttemptFilterMode.lowPerformers,
                      onSelected: (_) => setState(
                        () => _attemptFilter = _AttemptFilterMode.lowPerformers,
                      ),
                    ),
                    ChoiceChip(
                      label: const Text('Skipped-heavy'),
                      selected:
                          _attemptFilter == _AttemptFilterMode.skippedHeavy,
                      onSelected: (_) => setState(
                        () => _attemptFilter = _AttemptFilterMode.skippedHeavy,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 10),
            widget.attemptRowsValue.when(
              data: (rows) {
                final filteredRows = rows.where((row) {
                  return switch (_attemptFilter) {
                    _AttemptFilterMode.all => true,
                    _AttemptFilterMode.lowPerformers =>
                      (double.tryParse(row.percentage) ?? 0) < 40,
                    _AttemptFilterMode.skippedHeavy =>
                      row.skippedQuestions >= 2,
                  };
                }).toList();
                if (rows.isEmpty) {
                  return const _InlineEmptyState(
                    message:
                        'No attempt summaries are available for this exam yet.',
                  );
                }
                if (filteredRows.isEmpty) {
                  return const _InlineEmptyState(
                    message: 'No students match this review filter right now.',
                  );
                }
                return _AttemptSummaryTable(rows: filteredRows);
              },
              loading: () => const ProfessionalDataTableComponent(
                table: SizedBox.shrink(),
                isLoading: true,
                loadingType: LoadingSkeletonType.table,
                loadingItemCount: 4,
              ),
              error: (error, _) => _InlineErrorState(error: error),
            ),
            const SizedBox(height: 20),
            Text(
              'Topic performance',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Section and topic-level performance returned by the backend for this exam.',
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
            ),
            const SizedBox(height: 10),
            widget.topicPerformanceValue.when(
              data: (rows) => rows.isEmpty
                  ? const _InlineEmptyState(
                      message:
                          'No topic performance rows are available for this exam.',
                    )
                  : Column(
                      children: rows
                          .map(
                            (item) => Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: _TopicPerformanceTile(item: item),
                            ),
                          )
                          .toList(),
                    ),
              loading: () => const LoadingSkeletonComponent(
                type: LoadingSkeletonType.list,
                itemCount: 4,
              ),
              error: (error, _) => _InlineErrorState(error: error),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Most missed questions',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                Wrap(
                  spacing: 8,
                  children: [
                    ChoiceChip(
                      label: const Text('All'),
                      selected:
                          _questionFilter == _QuestionInsightFilterMode.all,
                      onSelected: (_) => setState(
                        () => _questionFilter = _QuestionInsightFilterMode.all,
                      ),
                    ),
                    ChoiceChip(
                      label: const Text('Hard'),
                      selected:
                          _questionFilter ==
                          _QuestionInsightFilterMode.hardQuestions,
                      onSelected: (_) => setState(
                        () => _questionFilter =
                            _QuestionInsightFilterMode.hardQuestions,
                      ),
                    ),
                    ChoiceChip(
                      label: const Text('Skipped often'),
                      selected:
                          _questionFilter ==
                          _QuestionInsightFilterMode.skippedOften,
                      onSelected: (_) => setState(
                        () => _questionFilter =
                            _QuestionInsightFilterMode.skippedOften,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 10),
            widget.questionAnalysisValue.when(
              data: (rows) {
                final filteredRows = rows.where((row) {
                  return switch (_questionFilter) {
                    _QuestionInsightFilterMode.all => true,
                    _QuestionInsightFilterMode.hardQuestions =>
                      row.wrongRate >= 50,
                    _QuestionInsightFilterMode.skippedOften =>
                      row.skippedCount >= 2,
                  };
                }).toList();
                if (rows.isEmpty) {
                  return const _InlineEmptyState(
                    message:
                        'Question-level analysis appears after result generation creates enough attempt data for comparison.',
                  );
                }
                if (filteredRows.isEmpty) {
                  return const _InlineEmptyState(
                    message:
                        'No question insights match this filter right now.',
                  );
                }
                return _QuestionAnalysisTable(rows: filteredRows);
              },
              loading: () => const ProfessionalDataTableComponent(
                table: SizedBox.shrink(),
                isLoading: true,
                loadingType: LoadingSkeletonType.list,
                loadingItemCount: 4,
              ),
              error: (error, _) => _InlineErrorState(error: error),
            ),
          ],
        ),
      ),
    );
  }
}

class _AttemptSummaryTable extends StatelessWidget {
  const _AttemptSummaryTable({required this.rows});

  final List<TeacherExamAttemptModel> rows;

  @override
  Widget build(BuildContext context) {
    final isCompact = MediaQuery.sizeOf(context).width < 900;
    if (isCompact) {
      return Column(
        children: rows
            .map(
              (row) => Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                child: AppCard(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  backgroundColor: AppColors.surfaceMuted,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              row.studentName,
                              style: Theme.of(context).textTheme.titleSmall
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                          ),
                          StatusBadgeComponent(label: row.status),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        row.studentAdmissionNo,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Wrap(
                        spacing: AppSpacing.sm,
                        runSpacing: AppSpacing.sm,
                        children: [
                          _MiniPill(
                            label: 'Attempt',
                            value: '#${row.attemptNo}',
                          ),
                          _MiniPill(label: 'Score', value: row.finalScore),
                          _MiniPill(
                            label: 'Percentage',
                            value: '${row.percentage}%',
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        'Started ${formatLocalDateTime(row.startedAt, fallback: '-')}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      Text(
                        'Submitted ${formatLocalDateTime(row.submittedAt, fallback: '-')}',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            )
            .toList(),
      );
    }

    return ProfessionalDataTableComponent(
      table: DataTable(
        columns: const [
          DataColumn(label: Text('Student')),
          DataColumn(label: Text('Admission')),
          DataColumn(label: Text('Attempt')),
          DataColumn(label: Text('Started')),
          DataColumn(label: Text('Submitted')),
          DataColumn(label: Text('Score')),
          DataColumn(label: Text('Percentage')),
          DataColumn(label: Text('Status')),
        ],
        rows: rows
            .map(
              (row) => DataRow(
                cells: [
                  DataCell(
                    Text(
                      row.studentName,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  DataCell(Text(row.studentAdmissionNo)),
                  DataCell(Text('#${row.attemptNo}')),
                  DataCell(
                    Text(formatLocalDateTime(row.startedAt, fallback: '-')),
                  ),
                  DataCell(
                    Text(formatLocalDateTime(row.submittedAt, fallback: '-')),
                  ),
                  DataCell(Text(row.finalScore)),
                  DataCell(Text('${row.percentage}%')),
                  DataCell(StatusBadgeComponent(label: row.status)),
                ],
              ),
            )
            .toList(),
      ),
    );
  }
}

class _QuestionAnalysisTable extends StatelessWidget {
  const _QuestionAnalysisTable({required this.rows});

  final List<TeacherQuestionAnalysisModel> rows;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: rows.take(8).map((row) {
        final subtitle = [
          if ((row.subjectName ?? '').isNotEmpty) row.subjectName!,
          if ((row.topicName ?? '').isNotEmpty) row.topicName!,
        ].join(' • ');
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Card(
            margin: EdgeInsets.zero,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    row.questionTextSummary,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  if (subtitle.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(subtitle),
                  ],
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: [
                      _MiniPill(label: 'Wrong', value: '${row.wrongCount}'),
                      _MiniPill(label: 'Correct', value: '${row.correctCount}'),
                      _MiniPill(label: 'Skipped', value: '${row.skippedCount}'),
                      _MiniPill(
                        label: 'Marked',
                        value: '${row.markedForReviewCount}',
                      ),
                      _MiniPill(
                        label: 'Wrong rate',
                        value: '${row.wrongRate.toStringAsFixed(0)}%',
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  TextButton.icon(
                    onPressed: () => context.go(AppRoutes.questionBank),
                    icon: const Icon(Icons.open_in_new_rounded),
                    label: const Text('Open in question bank'),
                  ),
                ],
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}

class _LeaderboardTable extends StatelessWidget {
  const _LeaderboardTable({required this.rows});

  final List<LeaderboardRowModel> rows;

  @override
  Widget build(BuildContext context) {
    final isCompact = MediaQuery.sizeOf(context).width < 900;
    if (isCompact) {
      return Column(
        children: rows
            .map(
              (row) => Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                child: AppCard(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  backgroundColor: AppColors.surfaceMuted,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          AppBadge(
                            label: 'Rank ${row.rank?.toString() ?? '-'}',
                            backgroundColor: AppColors.accent.withValues(
                              alpha: 0.12,
                            ),
                            foregroundColor: AppColors.accent,
                          ),
                          const Spacer(),
                          StatusBadgeComponent(label: row.resultStatus),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        row.studentName,
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        row.studentAdmissionNo,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Wrap(
                        spacing: AppSpacing.sm,
                        runSpacing: AppSpacing.sm,
                        children: [
                          _MiniPill(label: 'Score', value: row.finalScore),
                          _MiniPill(
                            label: 'Percentage',
                            value: '${row.percentage}%',
                          ),
                          _MiniPill(
                            label: 'Time',
                            value: _formatSeconds(row.timeTakenSeconds),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            )
            .toList(),
      );
    }

    return ProfessionalDataTableComponent(
      table: DataTable(
        columns: const [
          DataColumn(label: Text('Rank')),
          DataColumn(label: Text('Student')),
          DataColumn(label: Text('Admission')),
          DataColumn(label: Text('Score')),
          DataColumn(label: Text('Percentage')),
          DataColumn(label: Text('Time')),
          DataColumn(label: Text('Status')),
        ],
        rows: rows
            .map(
              (row) => DataRow(
                cells: [
                  DataCell(
                    AppBadge(
                      label: row.rank?.toString() ?? '-',
                      backgroundColor: AppColors.accent.withValues(alpha: 0.12),
                      foregroundColor: AppColors.accent,
                    ),
                  ),
                  DataCell(
                    Text(
                      row.studentName,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  DataCell(Text(row.studentAdmissionNo)),
                  DataCell(Text(row.finalScore)),
                  DataCell(Text('${row.percentage}%')),
                  DataCell(Text(_formatSeconds(row.timeTakenSeconds))),
                  DataCell(StatusBadgeComponent(label: row.resultStatus)),
                ],
              ),
            )
            .toList(),
      ),
    );
  }
}

class _TopicPerformanceTile extends StatelessWidget {
  const _TopicPerformanceTile({required this.item});

  final TopicPerformanceModel item;

  @override
  Widget build(BuildContext context) {
    final title = item.topicName?.isNotEmpty == true
        ? '${item.subjectName} • ${item.topicName}'
        : item.subjectName;
    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.md),
      backgroundColor: AppColors.surfaceMuted,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: Theme.of(
                    context,
                  ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
              AppBadge(
                label: '${item.percentage}%',
                backgroundColor: AppColors.teal.withValues(alpha: 0.12),
                foregroundColor: AppColors.teal,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Wrap(
            spacing: 12,
            runSpacing: 10,
            children: [
              _MiniPill(label: 'Questions', value: '${item.totalQuestions}'),
              _MiniPill(
                label: 'Attempted',
                value: '${item.attemptedQuestions}',
              ),
              _MiniPill(label: 'Correct', value: '${item.correctAnswers}'),
              _MiniPill(label: 'Incorrect', value: '${item.incorrectAnswers}'),
              _MiniPill(label: 'Final score', value: item.finalScore),
            ],
          ),
        ],
      ),
    );
  }
}

class _MetricWrap extends StatelessWidget {
  const _MetricWrap({required this.metrics});

  final List<_MetricData> metrics;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 14,
      runSpacing: 14,
      children: metrics
          .map(
            (metric) => SizedBox(
              width: 220,
              child: KpiCardComponent(
                label: metric.label,
                value: metric.value,
                helper: metric.helper,
                icon: metric.icon,
                variant: metric.variant,
              ),
            ),
          )
          .toList(),
    );
  }
}

class _MiniPill extends StatelessWidget {
  const _MiniPill({required this.label, required this.value});

  final String label;
  final Object? value;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border.withValues(alpha: 0.84)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        child: Text(
          '$label: ${_safeLabel(value)}',
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
            color: AppColors.secondary,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}

class _DetailStat extends StatelessWidget {
  const _DetailStat({required this.label, required this.value});

  final String label;
  final Object? value;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 150,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: 4),
          Text(
            _safeLabel(value),
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

class _EmptyStateCard extends StatelessWidget {
  const _EmptyStateCard({required this.title, required this.description});

  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    return EmptyStateComponent(
      title: title,
      description: description,
      icon: Icons.bar_chart_rounded,
    );
  }
}

class _InlineEmptyState extends StatelessWidget {
  const _InlineEmptyState({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return ProfessionalCardComponent(
      body: Text(
        message,
        style: Theme.of(
          context,
        ).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
      ),
    );
  }
}

class _ErrorStateCard extends StatelessWidget {
  const _ErrorStateCard({required this.error});

  final Object error;

  @override
  Widget build(BuildContext context) {
    return _ResultsAlertCard(
      title: 'Unable to load results right now',
      message:
          '${readApiErrorMessage(error)}. Retry this screen or return to the Exams workspace if result generation is still pending.',
      tone: _AlertTone.danger,
    );
  }
}

class _InlineErrorState extends StatelessWidget {
  const _InlineErrorState({required this.error});

  final Object error;

  @override
  Widget build(BuildContext context) {
    return _ResultsAlertCard(
      title: 'Unable to load this analytics block',
      message:
          '${readApiErrorMessage(error)}. Retry after refreshing the screen or confirm the exam results have been generated.',
      tone: _AlertTone.danger,
    );
  }
}

class _SectionHeaderBlock extends StatelessWidget {
  const _SectionHeaderBlock({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(
            context,
          ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          subtitle,
          style: Theme.of(
            context,
          ).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
        ),
      ],
    );
  }
}

enum _AlertTone { info, success, warning, danger }

class _ResultsAlertCard extends StatelessWidget {
  const _ResultsAlertCard({
    required this.title,
    required this.message,
    required this.tone,
    this.action,
  });

  final String title;
  final String message;
  final _AlertTone tone;
  final Widget? action;

  Color get _color => switch (tone) {
    _AlertTone.info => AppColors.info,
    _AlertTone.success => AppColors.success,
    _AlertTone.warning => AppColors.warning,
    _AlertTone.danger => AppColors.danger,
  };

  IconData get _icon => switch (tone) {
    _AlertTone.info => Icons.info_outline_rounded,
    _AlertTone.success => Icons.check_circle_outline_rounded,
    _AlertTone.warning => Icons.warning_amber_rounded,
    _AlertTone.danger => Icons.error_outline_rounded,
  };

  @override
  Widget build(BuildContext context) {
    return ProfessionalCardComponent(
      backgroundColor: _color.withValues(alpha: 0.05),
      borderColor: _color.withValues(alpha: 0.22),
      body: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: _color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(_icon, size: 20, color: _color),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: Theme.of(
                    context,
                  ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  message,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                if (action != null) ...[
                  const SizedBox(height: AppSpacing.md),
                  action!,
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MetricData {
  const _MetricData({
    required this.label,
    required this.value,
    required this.helper,
    this.icon,
    this.variant = KpiCardVariant.neutral,
  });

  final String label;
  final String value;
  final String helper;
  final IconData? icon;
  final KpiCardVariant variant;
}

// ignore: unused_element
class _ResultsHero extends StatelessWidget {
  const _ResultsHero({
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
      gradient: LinearGradient(
        colors: [
          AppColors.surface,
          AppColors.subtleAccent.withValues(alpha: 0.88),
          AppColors.surface,
        ],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      child: isWide
          ? Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  flex: 3,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      AppBadge(
                        label: eyebrow,
                        backgroundColor: AppColors.surface.withValues(
                          alpha: 0.82,
                        ),
                        foregroundColor: AppColors.secondary,
                      ),
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
                Expanded(
                  flex: 2,
                  child: _ResultsHeroHighlights(items: highlights),
                ),
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AppBadge(
                  label: eyebrow,
                  backgroundColor: AppColors.surface.withValues(alpha: 0.82),
                  foregroundColor: AppColors.secondary,
                ),
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
                _ResultsHeroHighlights(items: highlights),
              ],
            ),
    );
  }
}

class _ResultsHeroHighlights extends StatelessWidget {
  const _ResultsHeroHighlights({required this.items});

  final List<String> items;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.lg),
      backgroundColor: AppColors.surface.withValues(alpha: 0.76),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Quick overview',
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

String _safeLabel(Object? value, {String fallback = '-'}) {
  final text = value?.toString().trim() ?? '';
  return text.isEmpty ? fallback : text;
}

int _evaluatedCount(ExamSummaryModel summary) {
  return summary.totalPassed + summary.totalFailed;
}

int _pendingCount(ExamSummaryModel summary) {
  final pending = summary.totalAttempted - _evaluatedCount(summary);
  return pending < 0 ? 0 : pending;
}

String _analyticsStatus(ExamSummaryModel summary) {
  if (summary.totalAttempted == 0) {
    return 'Pending';
  }
  if (_pendingCount(summary) > 0) {
    return 'In progress';
  }
  return 'Completed';
}

String _formatSeconds(int seconds) {
  final duration = Duration(seconds: seconds);
  final hours = duration.inHours;
  final minutes = duration.inMinutes.remainder(60);
  final secs = duration.inSeconds.remainder(60);
  if (hours > 0) {
    return '${hours}h ${minutes}m ${secs}s';
  }
  return '${minutes}m ${secs}s';
}

String _formatTimestamp(String? value) {
  if (value == null || value.trim().isEmpty) {
    return '-';
  }
  return formatLocalDateTime(DateTime.tryParse(value), fallback: '-');
}

List<Widget> _extractListChildren(ListView listView) {
  final delegate = listView.childrenDelegate;
  if (delegate is SliverChildListDelegate) {
    return delegate.children;
  }
  return [listView];
}
