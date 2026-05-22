import 'package:education_frontend/app/router/app_routes.dart';
import 'package:education_frontend/features/auth/presentation/providers/auth_controller.dart';
import 'package:education_frontend/features/dashboard/presentation/widgets/dashboard_shell.dart';
import 'package:education_frontend/features/exams/presentation/providers/student_exam_providers.dart';
import 'package:education_frontend/shared/utils/app_date_time.dart';
import 'package:education_frontend/shared/widgets/app_button.dart';
import 'package:education_frontend/shared/widgets/app_error_state.dart';
import 'package:education_frontend/shared/widgets/app_loader.dart';
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
            Card(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      summary.examTitle,
                      style: Theme.of(context).textTheme.headlineSmall
                          ?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 8),
                    Text('Attempt #${summary.attemptNo} • ${summary.status}'),
                    const SizedBox(height: 20),
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
                          value: '${summary.correctAnswers}',
                        ),
                        _SummaryTile(
                          label: 'Incorrect',
                          value: '${summary.incorrectAnswers}',
                        ),
                        _SummaryTile(
                          label: 'Skipped',
                          value: '${summary.skippedQuestions}',
                        ),
                        _SummaryTile(
                          label: 'Final score',
                          value: summary.finalScore,
                        ),
                        _SummaryTile(
                          label: 'Percentage',
                          value: '${summary.percentage}%',
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
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
                    const SizedBox(height: 20),
                    Text(
                      'Time taken: ${_formatTimeTaken(summary.timeTakenSeconds)}',
                    ),
                    if (summary.isAutoSubmitted) ...[
                      const SizedBox(height: 8),
                      Text(
                        'This attempt was auto-submitted when the exam timer ended.',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ],
                    if (summary.status != 'in_progress') ...[
                      const SizedBox(height: 20),
                      Wrap(
                        spacing: 12,
                        runSpacing: 12,
                        children: [
                          AppButton(
                            label: 'Review attempt',
                            icon: Icons.menu_book_rounded,
                            onPressed: () => context.go(
                              AppRoutes.studentAttemptReview(
                                examId: examId,
                                attemptId: attemptId,
                              ),
                            ),
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
      child: Card(
        margin: EdgeInsets.zero,
        child: Padding(
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
