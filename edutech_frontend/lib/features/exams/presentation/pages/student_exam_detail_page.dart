import 'package:education_frontend/app/router/app_routes.dart';
import 'package:education_frontend/core/network/api_error_message.dart';
import 'package:education_frontend/features/auth/presentation/providers/auth_controller.dart';
import 'package:education_frontend/features/dashboard/presentation/widgets/dashboard_shell.dart';
import 'package:education_frontend/features/exams/data/repositories/student_exam_repository.dart';
import 'package:education_frontend/features/exams/domain/models/student_exam_detail.dart';
import 'package:education_frontend/features/exams/presentation/providers/student_exam_providers.dart';
import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:education_frontend/shared/widgets/app_button.dart';
import 'package:education_frontend/shared/widgets/app_card.dart';
import 'package:education_frontend/shared/widgets/app_error_state.dart';
import 'package:education_frontend/shared/widgets/app_loader.dart';
import 'package:education_frontend/shared/widgets/app_rich_text_renderer.dart';
import 'package:education_frontend/shared/widgets/app_section_header.dart';
import 'package:education_frontend/shared/widgets/page_header_component.dart';
import 'package:education_frontend/shared/widgets/status_badge_component.dart';
import 'package:education_frontend/shared/utils/app_date_time.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class StudentExamDetailPage extends ConsumerStatefulWidget {
  const StudentExamDetailPage({required this.examId, super.key});

  final String examId;

  @override
  ConsumerState<StudentExamDetailPage> createState() =>
      _StudentExamDetailPageState();
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
    final inProgressAttempt = ref.watch(
      inProgressAttemptForExamProvider(widget.examId),
    );

    return DashboardShell(
      title: 'Exam Readiness',
      user: user,
      currentRoute: AppRoutes.exams,
      onLogout: () => ref.read(authControllerProvider.notifier).logout(),
      body: examValue.when(
        data: (exam) {
          final activeAttemptId =
              inProgressAttempt?.id ?? exam.activeAttempt?.id;
          final canResume =
              activeAttemptId != null && activeAttemptId.isNotEmpty;
          final canStartFresh =
              exam.availabilityState == 'available_now' &&
              !canResume &&
              exam.remainingAttempts > 0;
          return ListView(
            children: [
              PageHeaderComponent(
                eyebrow: 'Student exam start',
                title: exam.title,
                subtitle:
                    'Review the official exam brief, confirm the rules, and begin only when you are ready to stay focused.',
                breadcrumbs: const ['Student', 'Exams', 'Start'],
              ),
              const SizedBox(height: AppSpacing.lg),
              _ReadinessHero(
                exam: exam,
                canResume: canResume,
                canStartFresh: canStartFresh,
                isStarting: _isStarting,
                onPrimaryAction: (!canResume && !canStartFresh) || _isStarting
                    ? null
                    : () => _startOrResumeExam(
                        exam: exam,
                        userStudentId: user.studentProfileId,
                        activeAttemptId: activeAttemptId,
                      ),
              ),
              const SizedBox(height: 20),
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const AppSectionHeader(
                      title: 'Before you begin',
                      subtitle:
                          'Review the exam window, marks, structure, and instructions before starting the timer.',
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
                        _DetailTile(
                          label: 'Total marks',
                          value: exam.totalMarks,
                        ),
                        _DetailTile(
                          label: 'Passing marks',
                          value: exam.passingMarks,
                        ),
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
                    if (exam.sections.isNotEmpty) ...[
                      const SizedBox(height: 20),
                      Text(
                        'Exam structure',
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 8),
                      AppCard(
                        backgroundColor: AppColors.surfaceMuted,
                        child: Column(
                          children: exam.sections
                              .map(
                                (section) => Padding(
                                  padding: const EdgeInsets.only(bottom: 12),
                                  child: Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      CircleAvatar(
                                        radius: 18,
                                        child: Text('${section.sectionOrder}'),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              section.name,
                                              style: Theme.of(context)
                                                  .textTheme
                                                  .titleSmall
                                                  ?.copyWith(
                                                    fontWeight: FontWeight.w700,
                                                  ),
                                            ),
                                            if (section.instructions
                                                .trim()
                                                .isNotEmpty) ...[
                                              const SizedBox(height: 4),
                                              Text(section.instructions),
                                            ],
                                          ],
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Text(
                                        '${section.displayQuestionCount} questions',
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodySmall
                                            ?.copyWith(
                                              color: AppColors.textSecondary,
                                              fontWeight: FontWeight.w600,
                                            ),
                                      ),
                                    ],
                                  ),
                                ),
                              )
                              .toList(),
                        ),
                      ),
                    ],
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
        AppRoutes.studentAttempt(examId: exam.id, attemptId: activeAttemptId),
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
        AppRoutes.studentAttempt(examId: exam.id, attemptId: attempt.id),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(readApiErrorMessage(error))));
    } finally {
      if (mounted) {
        setState(() => _isStarting = false);
      }
    }
  }
}

class _ChecklistItem extends StatelessWidget {
  const _ChecklistItem({required this.title, required this.description});

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
                  style: Theme.of(
                    context,
                  ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
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

class _ReadinessHero extends StatelessWidget {
  const _ReadinessHero({
    required this.exam,
    required this.canResume,
    required this.canStartFresh,
    required this.isStarting,
    required this.onPrimaryAction,
  });

  final StudentExamDetail exam;
  final bool canResume;
  final bool canStartFresh;
  final bool isStarting;
  final VoidCallback? onPrimaryAction;

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.sizeOf(context).width >= 980;
    final isCompact = MediaQuery.sizeOf(context).width < 600;
    final availability = _availabilityLabel(exam.availabilityState);
    final rightRail = AppCard(
      padding: EdgeInsets.all(isCompact ? AppSpacing.md : AppSpacing.lg),
      backgroundColor: AppColors.surfaceMuted,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Start controls',
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            'Your exam timer begins only after you continue.',
            style: Theme.of(
              context,
            ).textTheme.bodySmall?.copyWith(color: AppColors.textSecondary),
          ),
          const SizedBox(height: AppSpacing.md),
          StatusBadgeComponent(label: availability),
          const SizedBox(height: AppSpacing.sm),
          Text(_readinessMessage(exam, canResume)),
          const SizedBox(height: AppSpacing.md),
          AppButton(
            label: canResume
                ? 'Resume attempt'
                : canStartFresh
                ? 'Begin exam'
                : 'Not available yet',
            onPressed: onPrimaryAction,
            isLoading: isStarting,
            expand: true,
            icon: canResume
                ? Icons.play_circle_outline_rounded
                : Icons.arrow_forward_rounded,
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            canResume
                ? 'You will return to the same attempt with the same timer.'
                : 'After you submit, visibility of answers and scores follows the exam policy.',
            style: Theme.of(
              context,
            ).textTheme.bodySmall?.copyWith(color: AppColors.textSecondary),
          ),
        ],
      ),
    );

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
                      const StatusBadgeComponent(label: 'Official exam brief'),
                      const SizedBox(height: AppSpacing.md),
                      Text(
                        exam.title,
                        style:
                            (isCompact
                                    ? Theme.of(context).textTheme.headlineSmall
                                    : Theme.of(
                                        context,
                                      ).textTheme.headlineMedium)
                                ?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        exam.description.isEmpty
                            ? 'Use this page as your final readiness check before you start.'
                            : exam.description,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      Wrap(
                        spacing: 12,
                        runSpacing: 12,
                        children: [
                          _ReadinessChip(label: 'Status', value: exam.status),
                          _ReadinessChip(
                            label: 'Availability',
                            value: availability,
                          ),
                          _ReadinessChip(
                            label: 'Duration',
                            value: '${exam.durationMinutes} min',
                          ),
                          _ReadinessChip(
                            label: 'Attempts',
                            value:
                                '${exam.attemptsUsed}/${exam.attemptsUsed + exam.remainingAttempts}',
                          ),
                          _ReadinessChip(
                            label: 'Review',
                            value: exam.reviewAvailable
                                ? 'After submit'
                                : 'Locked',
                          ),
                          if (canResume &&
                              (exam
                                          .activeAttempt
                                          ?.sectionRuntime
                                          .currentSectionName ??
                                      '')
                                  .isNotEmpty)
                            _ReadinessChip(
                              label: 'Current section',
                              value: exam
                                  .activeAttempt!
                                  .sectionRuntime
                                  .currentSectionName!,
                            ),
                          if (canResume &&
                              exam
                                      .activeAttempt
                                      ?.sectionRuntime
                                      .currentSectionExpiresAt !=
                                  null)
                            _ReadinessChip(
                              label: 'Section timer',
                              value: formatLocalDateTime(
                                exam
                                    .activeAttempt!
                                    .sectionRuntime
                                    .currentSectionExpiresAt,
                                fallback: '-',
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: AppSpacing.xl),
                Flexible(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 300),
                    child: rightRail,
                  ),
                ),
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const StatusBadgeComponent(label: 'Official exam brief'),
                const SizedBox(height: AppSpacing.md),
                Text(
                  exam.title,
                  style:
                      (isCompact
                              ? Theme.of(context).textTheme.headlineSmall
                              : Theme.of(context).textTheme.headlineMedium)
                          ?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  exam.description.isEmpty
                      ? 'Use this page as your final readiness check before you start.'
                      : exam.description,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    _ReadinessChip(label: 'Status', value: exam.status),
                    _ReadinessChip(label: 'Availability', value: availability),
                    _ReadinessChip(
                      label: 'Duration',
                      value: '${exam.durationMinutes} min',
                    ),
                    _ReadinessChip(
                      label: 'Attempts',
                      value:
                          '${exam.attemptsUsed}/${exam.attemptsUsed + exam.remainingAttempts}',
                    ),
                    _ReadinessChip(
                      label: 'Review',
                      value: exam.reviewAvailable ? 'After submit' : 'Locked',
                    ),
                    if (canResume &&
                        (exam
                                    .activeAttempt
                                    ?.sectionRuntime
                                    .currentSectionName ??
                                '')
                            .isNotEmpty)
                      _ReadinessChip(
                        label: 'Current section',
                        value: exam
                            .activeAttempt!
                            .sectionRuntime
                            .currentSectionName!,
                      ),
                    if (canResume &&
                        exam
                                .activeAttempt
                                ?.sectionRuntime
                                .currentSectionExpiresAt !=
                            null)
                      _ReadinessChip(
                        label: 'Section timer',
                        value: formatLocalDateTime(
                          exam
                              .activeAttempt!
                              .sectionRuntime
                              .currentSectionExpiresAt,
                          fallback: '-',
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xl),
                rightRail,
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
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppColors.border),
      ),
      child: RichText(
        text: TextSpan(
          style: Theme.of(
            context,
          ).textTheme.bodySmall?.copyWith(color: AppColors.textSecondary),
          children: [
            TextSpan(
              text: '$label: ',
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            TextSpan(
              text: value,
              style: const TextStyle(color: AppColors.textPrimary),
            ),
          ],
        ),
      ),
    );
  }
}

class _DetailTile extends StatelessWidget {
  const _DetailTile({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final isCompact = MediaQuery.sizeOf(context).width < 600;
    return SizedBox(
      width: isCompact ? double.infinity : 240,
      child: AppCard(
        padding: EdgeInsets.all(isCompact ? AppSpacing.md : AppSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: Theme.of(context).textTheme.labelLarge),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
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
    final sectionName = exam.activeAttempt?.sectionRuntime.currentSectionName;
    if (sectionName != null && sectionName.trim().isNotEmpty) {
      return 'You already have an in-progress attempt. Resume it to continue from $sectionName with the original timer.';
    }
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
