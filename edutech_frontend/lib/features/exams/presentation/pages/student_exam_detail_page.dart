import 'package:education_frontend/app/router/app_routes.dart';
import 'package:education_frontend/core/network/api_error_message.dart';
import 'package:education_frontend/features/auth/presentation/providers/auth_controller.dart';
import 'package:education_frontend/features/dashboard/presentation/widgets/dashboard_shell.dart';
import 'package:education_frontend/features/exams/data/repositories/student_exam_repository.dart';
import 'package:education_frontend/features/exams/domain/models/student_exam_detail.dart';
import 'package:education_frontend/features/exams/presentation/providers/student_exam_providers.dart';
import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:education_frontend/shared/widgets/app_badge.dart';
import 'package:education_frontend/shared/widgets/app_button.dart';
import 'package:education_frontend/shared/widgets/app_card.dart';
import 'package:education_frontend/shared/widgets/app_error_state.dart';
import 'package:education_frontend/shared/widgets/app_loader.dart';
import 'package:education_frontend/shared/widgets/app_rich_text_renderer.dart';
import 'package:education_frontend/shared/utils/app_date_time.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class StudentExamDetailPage extends ConsumerStatefulWidget {
  const StudentExamDetailPage({required this.examId, super.key});

  final String examId;

  @override
  ConsumerState<StudentExamDetailPage> createState() => _StudentExamDetailPageState();
}

class _StudentExamDetailPageState extends ConsumerState<StudentExamDetailPage> {
  bool _acceptedInstructions = false;
  bool _isStarting = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.invalidate(studentAvailableExamListProvider);
      ref.invalidate(studentAttemptsProvider);
      ref.invalidate(studentExamDetailProvider(widget.examId));
    });
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    if (user == null) {
      return const SizedBox.shrink();
    }

    final examValue = ref.watch(studentExamDetailProvider(widget.examId));
    final inProgressAttempt = ref.watch(inProgressAttemptForExamProvider(widget.examId));

    return DashboardShell(
      title: 'Exam Readiness',
      user: user,
      currentRoute: AppRoutes.exams,
      onLogout: () => ref.read(authControllerProvider.notifier).logout(),
      body: examValue.when(
        data: (exam) {
          final activeAttemptId = inProgressAttempt?.id ?? exam.activeAttempt?.id;
          final canResume = activeAttemptId != null && activeAttemptId.isNotEmpty;
          final canStartFresh = exam.availabilityState == 'available_now' &&
              !canResume &&
              exam.remainingAttempts > 0;
          return ListView(
            children: [
              AppCard(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            exam.title,
                            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Text(
                            exam.description.isEmpty
                                ? 'Review the readiness checklist before you begin.'
                                : exam.description,
                          ),
                          const SizedBox(height: 16),
                          Wrap(
                            spacing: 12,
                            runSpacing: 12,
                            children: [
                              _ReadinessChip(label: 'Status', value: exam.status),
                              _ReadinessChip(
                                label: 'Availability',
                                value: _availabilityLabel(exam.availabilityState),
                              ),
                              _ReadinessChip(
                                label: 'Duration',
                                value: '${exam.durationMinutes} min',
                              ),
                              _ReadinessChip(
                                label: 'Attempts',
                                value: '${exam.attemptsUsed}/${exam.attemptsUsed + exam.remainingAttempts}',
                              ),
                              _ReadinessChip(
                                label: 'Review',
                                value: exam.reviewAvailable ? 'Available later' : 'Restricted',
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: AppSpacing.lg),
                    ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 280),
                      child: AppCard(
                        backgroundColor: AppColors.backgroundSoft,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Readiness status',
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: AppSpacing.sm),
                            Text(_readinessMessage(exam, canResume)),
                            const SizedBox(height: AppSpacing.md),
                            AppButton(
                              label: canResume
                                  ? 'Resume attempt'
                                  : canStartFresh
                                  ? 'Begin exam'
                                  : 'Exam not available yet',
                              onPressed: (!canResume && !canStartFresh) || _isStarting
                                  ? null
                                  : () => _startOrResumeExam(
                                        exam: exam,
                                        userStudentId: user.studentProfileId,
                                        activeAttemptId: activeAttemptId,
                                      ),
                              isLoading: _isStarting,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Before you begin',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 16,
                      runSpacing: 16,
                      children: [
                        _DetailTile(label: 'Exam code', value: exam.code),
                        _DetailTile(
                          label: 'Window',
                          value:
                              '${_formatDateTime(exam.startAt)} - ${_formatDateTime(exam.endAt)}',
                        ),
                        _DetailTile(
                          label: 'Questions',
                          value: '${exam.activeQuestionCount}',
                        ),
                        _DetailTile(label: 'Total marks', value: exam.totalMarks),
                        _DetailTile(label: 'Passing marks', value: exam.passingMarks),
                        _DetailTile(
                          label: 'Remaining attempts',
                          value: '${exam.remainingAttempts}',
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      localTimezoneHelpText(),
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      'Instructions',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 8),
                    AppRichTextRenderer(
                      content: exam.instructions?.trim().isNotEmpty == true
                          ? exam.instructions!
                          : _defaultInstructionTemplate(exam),
                    ),
                    const SizedBox(height: 18),
                    AppCard(
                      backgroundColor: AppColors.surfaceMuted,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          _ChecklistItem(
                            title: 'Stable internet connection',
                            description:
                                'Keep a steady connection so answers sync properly while the timer is running.',
                          ),
                          _ChecklistItem(
                            title: 'Use fullscreen if possible',
                            description:
                                'Fullscreen reduces distractions and helps the exam workspace stay visible on screen.',
                          ),
                          _ChecklistItem(
                            title: 'The timer does not pause',
                            description:
                                'Once you begin, the countdown continues until you submit or the window ends.',
                          ),
                          _ChecklistItem(
                            title: 'Submit rules are final',
                            description:
                                'After submission, answers can no longer be changed and review depends on exam rules.',
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    CheckboxListTile(
                      value: _acceptedInstructions,
                      contentPadding: EdgeInsets.zero,
                      title: const Text(
                        'I have read the instructions and I am ready to begin.',
                      ),
                      onChanged: canResume
                          ? null
                          : (value) {
                              setState(() {
                                _acceptedInstructions = value ?? false;
                              });
                            },
                    ),
                  ],
                ),
              ),
            ],
          );
        },
        loading: () => const AppLoader(label: 'Preparing readiness details'),
        error: (error, _) => AppErrorState(message: readApiErrorMessage(error)),
      ),
    );
  }

  Future<void> _startOrResumeExam({
    required StudentExamDetail exam,
    required String? userStudentId,
    required String? activeAttemptId,
  }) async {
    if (activeAttemptId != null && activeAttemptId.isNotEmpty) {
      context.go(
        AppRoutes.studentAttempt(
          examId: exam.id,
          attemptId: activeAttemptId,
        ),
      );
      return;
    }

    if (!_acceptedInstructions) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Confirm the readiness checklist before starting.'),
        ),
      );
      return;
    }

    if (userStudentId == null || userStudentId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Student profile is not linked to this account.'),
        ),
      );
      return;
    }

    setState(() => _isStarting = true);
    try {
      final attempt = await ref
          .read(studentExamRepositoryProvider)
          .startAttempt(examId: exam.id, studentId: userStudentId);
      ref.invalidate(studentAttemptsProvider);
      if (!mounted) return;
      context.go(
        AppRoutes.studentAttempt(
          examId: exam.id,
          attemptId: attempt.id,
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(readApiErrorMessage(error))),
      );
    } finally {
      if (mounted) {
        setState(() => _isStarting = false);
      }
    }
  }
}

class _ChecklistItem extends StatelessWidget {
  const _ChecklistItem({
    required this.title,
    required this.description,
  });

  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.only(top: 2),
            child: Icon(Icons.check_circle_outline_rounded, size: 18),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(description),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ReadinessChip extends StatelessWidget {
  const _ReadinessChip({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return AppBadge(
      label: '$label: $value',
      backgroundColor: AppColors.primary.withValues(alpha: 0.10),
      foregroundColor: AppColors.primary,
    );
  }
}

class _DetailTile extends StatelessWidget {
  const _DetailTile({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 240,
      child: AppCard(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: Theme.of(context).textTheme.labelLarge),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

String _availabilityLabel(String state) {
  switch (state) {
    case 'available_now':
      return 'Available now';
    case 'upcoming':
      return 'Upcoming';
    case 'missed':
      return 'Missed / expired';
    default:
      return 'Completed';
  }
}

String _readinessMessage(StudentExamDetail exam, bool canResume) {
  if (canResume) {
    return 'You already have an in-progress attempt. Resume it to continue with the original timer.';
  }
  switch (exam.availabilityState) {
    case 'upcoming':
      return 'This exam is scheduled but not open yet. Review the instructions and come back when the window starts.';
    case 'missed':
      return 'The exam window has closed. New attempts are no longer allowed.';
    case 'completed':
      return exam.resultPublished
          ? 'Your attempt is complete and the published result is now available.'
          : 'Your attempt is complete. Result publication depends on teacher settings.';
    default:
      return 'The exam is live. Complete the checklist and begin when you are ready.';
  }
}

String _defaultInstructionTemplate(StudentExamDetail exam) {
  return 'This exam runs for ${exam.durationMinutes} minutes. '
      'Read each question carefully, keep an eye on the countdown, and submit before the window ends. '
      'Attempts remaining: ${exam.remainingAttempts}.';
}

String _formatDateTime(DateTime? value) {
  return formatLocalDateTime(value);
}
