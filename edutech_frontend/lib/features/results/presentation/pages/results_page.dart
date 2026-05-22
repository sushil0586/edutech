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
import 'package:education_frontend/shared/utils/app_date_time.dart';
import 'package:education_frontend/shared/widgets/app_empty_state.dart';
import 'package:education_frontend/shared/widgets/app_error_state.dart';
import 'package:education_frontend/shared/widgets/app_loader.dart';
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
        _ => const PlaceholderFeatureView(
          title: 'Results placeholder',
          description:
              'Results and analytics are enabled for student and teacher roles in this phase.',
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
            _MetricWrap(
              metrics: [
                _MetricData(
                  label: 'Results',
                  value: '${results.length}',
                  helper: 'Exam records returned',
                ),
                _MetricData(
                  label: 'Published',
                  value: '${results.where((item) => item.isPublished).length}',
                  helper: 'Visible now',
                ),
                _MetricData(
                  label: 'Passed',
                  value:
                      '${results.where((item) => item.resultStatus == 'pass').length}',
                  helper: 'Backend pass status',
                ),
              ],
            ),
            const SizedBox(height: 20),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Result history',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Open any result to review score summary, timing, and topic-level performance returned by the backend.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    const SizedBox(height: 18),
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
    required this.selectedExamId,
    required this.onSelectExam,
  });

  final String? selectedExamId;
  final ValueChanged<String> onSelectExam;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryCardsValue = ref.watch(teacherExamSummariesProvider);
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
        final isWide = MediaQuery.sizeOf(context).width >= 1180;

        final overviewPanel = ListView(
          children: [
            summaryCardsValue.when(
              data: (summaryCards) => _MetricWrap(
                metrics: [
                  _MetricData(
                    label: 'Tracked exams',
                    value: '${summaryCards.length}',
                    helper: 'Scoped to this teacher',
                  ),
                  _MetricData(
                    label: 'Attempts',
                    value:
                        '${summaryCards.fold<int>(0, (sum, item) => sum + item.totalAttempted)}',
                    helper: 'Across current summaries',
                  ),
                  _MetricData(
                    label: 'Avg percentage',
                    value: _averagePercentage(summaryCards),
                    helper: 'Backend summary values',
                  ),
                ],
              ),
              loading: () => const SizedBox(
                height: 94,
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (error, _) => _ErrorStateCard(error: error),
            ),
            const SizedBox(height: 20),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Exam summaries',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Review attempt volume, pass/fail breakdown, and average performance for each exam.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    const SizedBox(height: 18),
                    ...summaryRecords.map(
                      (summary) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
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

        if (isWide) {
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(flex: 5, child: overviewPanel),
              const SizedBox(width: 20),
              Expanded(flex: 6, child: detailPanel),
            ],
          );
        }

        return ListView(
          children: [
            ..._extractListChildren(overviewPanel),
            const SizedBox(height: 20),
            detailPanel,
          ],
        );
      },
      loading: () => const AppLoader(label: 'Loading result analytics'),
      error: (error, _) => _ErrorStateCard(error: error),
    );
  }

  String _averagePercentage(List<ExamSummaryModel> items) {
    if (items.isEmpty) {
      return '0%';
    }
    final total = items.fold<double>(
      0,
      (sum, item) => sum + (double.tryParse(item.averagePercentage) ?? 0),
    );
    return '${(total / items.length).toStringAsFixed(1)}%';
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
          color: isSelected ? const Color(0xFFE6F2EF) : null,
          border: Border.all(
            color: isSelected
                ? const Color(0xFF2B7A70)
                : const Color(0xFFE2E8F0),
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
                  _StatusChip(
                    label: result.resultStatus,
                    color: result.resultStatus == 'pass'
                        ? const Color(0xFF2F855A)
                        : const Color(0xFFC05621),
                  ),
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
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: ListView(
          shrinkWrap: true,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        result.examTitle,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text('${result.examCode} • ${result.resultStatus}'),
                    ],
                  ),
                ),
                _StatusChip(
                  label: result.isPublished ? 'Published' : 'Restricted',
                  color: result.isPublished
                      ? const Color(0xFF2B7A70)
                      : const Color(0xFF6B7280),
                ),
              ],
            ),
            const SizedBox(height: 18),
            _MetricWrap(
              metrics: [
                _MetricData(
                  label: 'Final score',
                  value: result.finalScore,
                  helper: 'Backend final score',
                ),
                _MetricData(
                  label: 'Percentage',
                  value: '${result.percentage}%',
                  helper: 'Backend percentage',
                ),
                _MetricData(
                  label: 'Rank',
                  value: result.rank?.toString() ?? 'Pending',
                  helper: 'When available',
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
            Card(
              margin: EdgeInsets.zero,
              color: const Color(0xFFF8FAFC),
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
              'Topic-wise performance',
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
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (error, _) => _InlineErrorState(error: error),
            ),
          ],
        ),
      ),
    );
  }
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
    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: onTap,
      child: Ink(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          color: isSelected ? const Color(0xFFFFF4E8) : null,
          border: Border.all(
            color: isSelected
                ? const Color(0xFFCB7856)
                : const Color(0xFFE2E8F0),
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
                      summary.examTitle,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  Text('${summary.averagePercentage}%'),
                ],
              ),
              const SizedBox(height: 8),
              Text('${summary.examCode} • ${summary.totalAttempted} attempts'),
              const SizedBox(height: 12),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  _MiniPill(label: 'Passed', value: '${summary.totalPassed}'),
                  _MiniPill(label: 'Failed', value: '${summary.totalFailed}'),
                  _MiniPill(label: 'Highest', value: summary.highestScore),
                ],
              ),
            ],
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
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: ListView(
          shrinkWrap: true,
          children: [
            Text(
              widget.summary.examTitle,
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 6),
            Text('${widget.summary.examCode} • Exam analytics'),
            const SizedBox(height: 18),
            _MetricWrap(
              metrics: [
                _MetricData(
                  label: 'Attempted',
                  value: '${widget.summary.totalAttempted}',
                  helper: 'Students who attempted',
                ),
                _MetricData(
                  label: 'Average %',
                  value: '${widget.summary.averagePercentage}%',
                  helper: 'Backend average',
                ),
                _MetricData(
                  label: 'Highest / Lowest',
                  value: '${widget.summary.highestScore} / ${widget.summary.lowestScore}',
                  helper: 'Score range',
                ),
              ],
            ),
            const SizedBox(height: 18),
            Card(
              margin: EdgeInsets.zero,
              color: const Color(0xFFF8FAFC),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Wrap(
                  spacing: 16,
                  runSpacing: 12,
                  children: [
                    _DetailStat(
                      label: 'Total students',
                      value: '${widget.summary.totalStudents}',
                    ),
                    _DetailStat(
                      label: 'Passed',
                      value: '${widget.summary.totalPassed}',
                    ),
                    _DetailStat(
                      label: 'Failed',
                      value: '${widget.summary.totalFailed}',
                    ),
                    _DetailStat(
                      label: 'Average score',
                      value: widget.summary.averageScore,
                    ),
                    _DetailStat(
                      label: 'Last updated',
                      value: _formatTimestamp(widget.summary.lastCalculatedAt),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Leaderboard',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 10),
            widget.leaderboardValue.when(
              data: (rows) => rows.isEmpty
                  ? const _InlineEmptyState(
                      message: 'No leaderboard entries are available yet.',
                    )
                  : _LeaderboardTable(rows: rows),
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (error, _) => _InlineErrorState(error: error),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Student attempts',
                    style: Theme.of(
                      context,
                    ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                ),
                Wrap(
                  spacing: 8,
                  children: [
                    ChoiceChip(
                      label: const Text('All'),
                      selected: _attemptFilter == _AttemptFilterMode.all,
                      onSelected: (_) => setState(() => _attemptFilter = _AttemptFilterMode.all),
                    ),
                    ChoiceChip(
                      label: const Text('Low performers'),
                      selected: _attemptFilter == _AttemptFilterMode.lowPerformers,
                      onSelected: (_) => setState(() => _attemptFilter = _AttemptFilterMode.lowPerformers),
                    ),
                    ChoiceChip(
                      label: const Text('Skipped-heavy'),
                      selected: _attemptFilter == _AttemptFilterMode.skippedHeavy,
                      onSelected: (_) => setState(() => _attemptFilter = _AttemptFilterMode.skippedHeavy),
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
                    _AttemptFilterMode.skippedHeavy => row.skippedQuestions >= 2,
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
                    message:
                        'No students match this review filter right now.',
                  );
                }
                return _AttemptSummaryTable(rows: filteredRows);
              },
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
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
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (error, _) => _InlineErrorState(error: error),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Most missed questions',
                    style: Theme.of(
                      context,
                    ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                ),
                Wrap(
                  spacing: 8,
                  children: [
                    ChoiceChip(
                      label: const Text('All'),
                      selected: _questionFilter == _QuestionInsightFilterMode.all,
                      onSelected: (_) => setState(() => _questionFilter = _QuestionInsightFilterMode.all),
                    ),
                    ChoiceChip(
                      label: const Text('Hard'),
                      selected: _questionFilter == _QuestionInsightFilterMode.hardQuestions,
                      onSelected: (_) => setState(() => _questionFilter = _QuestionInsightFilterMode.hardQuestions),
                    ),
                    ChoiceChip(
                      label: const Text('Skipped often'),
                      selected: _questionFilter == _QuestionInsightFilterMode.skippedOften,
                      onSelected: (_) => setState(() => _questionFilter = _QuestionInsightFilterMode.skippedOften),
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
                    _QuestionInsightFilterMode.hardQuestions => row.wrongRate >= 50,
                    _QuestionInsightFilterMode.skippedOften => row.skippedCount >= 2,
                  };
                }).toList();
                if (rows.isEmpty) {
                  return const _InlineEmptyState(
                    message:
                        'Question-level miss analysis will appear after students submit this exam.',
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
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
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
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
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
                  DataCell(Text(row.studentName)),
                  DataCell(Text(row.studentAdmissionNo)),
                  DataCell(Text('#${row.attemptNo}')),
                  DataCell(Text(formatLocalDateTime(row.startedAt, fallback: '-'))),
                  DataCell(
                    Text(formatLocalDateTime(row.submittedAt, fallback: '-')),
                  ),
                  DataCell(Text(row.finalScore)),
                  DataCell(Text('${row.percentage}%')),
                  DataCell(Text(row.status)),
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
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
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
                  DataCell(Text(row.rank?.toString() ?? '-')),
                  DataCell(Text(row.studentName)),
                  DataCell(Text(row.studentAdmissionNo)),
                  DataCell(Text(row.finalScore)),
                  DataCell(Text('${row.percentage}%')),
                  DataCell(Text(_formatSeconds(row.timeTakenSeconds))),
                  DataCell(Text(row.resultStatus)),
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
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                Text('${item.percentage}%'),
              ],
            ),
            const SizedBox(height: 8),
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
                _MiniPill(
                  label: 'Incorrect',
                  value: '${item.incorrectAnswers}',
                ),
                _MiniPill(label: 'Final score', value: item.finalScore),
              ],
            ),
          ],
        ),
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
              child: Card(
                margin: EdgeInsets.zero,
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        metric.label,
                        style: Theme.of(context).textTheme.labelLarge,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        metric.value,
                        style: Theme.of(context).textTheme.headlineSmall
                            ?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 6),
                      Text(metric.helper),
                    ],
                  ),
                ),
              ),
            ),
          )
          .toList(),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.label, required this.color});

  final Object? label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        child: Text(
          _safeLabel(label).replaceAll('_', ' '),
          style: TextStyle(color: color, fontWeight: FontWeight.w700),
        ),
      ),
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
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        child: Text('$label: ${_safeLabel(value)}'),
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
    return AppEmptyState(title: title, message: description);
  }
}

class _InlineEmptyState extends StatelessWidget {
  const _InlineEmptyState({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(padding: const EdgeInsets.all(16), child: Text(message)),
    );
  }
}

class _ErrorStateCard extends StatelessWidget {
  const _ErrorStateCard({required this.error});

  final Object error;

  @override
  Widget build(BuildContext context) {
    return AppErrorState(message: readApiErrorMessage(error));
  }
}

class _InlineErrorState extends StatelessWidget {
  const _InlineErrorState({required this.error});

  final Object error;

  @override
  Widget build(BuildContext context) {
    return AppErrorState(message: readApiErrorMessage(error));
  }
}

class _MetricData {
  const _MetricData({
    required this.label,
    required this.value,
    required this.helper,
  });

  final String label;
  final String value;
  final String helper;
}

String _safeLabel(Object? value, {String fallback = '-'}) {
  final text = value?.toString().trim() ?? '';
  return text.isEmpty ? fallback : text;
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
