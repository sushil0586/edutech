import 'dart:async';

import 'package:education_frontend/app/router/app_routes.dart';
import 'package:education_frontend/core/network/api_error_message.dart';
import 'package:education_frontend/features/academics/domain/models/academic_lookup_option.dart';
import 'package:education_frontend/features/academics/presentation/providers/academic_lookup_providers.dart';
import 'package:education_frontend/features/auth/domain/models/app_role.dart';
import 'package:education_frontend/features/auth/presentation/providers/auth_controller.dart';
import 'package:education_frontend/features/dashboard/domain/models/teacher_question_item.dart';
import 'package:education_frontend/features/dashboard/presentation/providers/dashboard_providers.dart';
import 'package:education_frontend/features/dashboard/presentation/widgets/dashboard_shell.dart';
import 'package:education_frontend/features/exams/data/repositories/student_exam_repository.dart';
import 'package:education_frontend/features/exams/data/repositories/teacher_exam_builder_repository.dart';
import 'package:education_frontend/features/exams/domain/models/student_attempt.dart';
import 'package:education_frontend/features/exams/domain/models/student_exam_detail.dart';
import 'package:education_frontend/features/exams/domain/models/teacher_exam_builder_model.dart';
import 'package:education_frontend/features/exams/presentation/helpers/exam_builder_refresh.dart';
import 'package:education_frontend/features/exams/presentation/providers/student_exam_providers.dart';
import 'package:education_frontend/features/exams/presentation/providers/teacher_exam_builder_providers.dart';
import 'package:education_frontend/features/question_bank/data/repositories/question_bank_repository.dart';
import 'package:education_frontend/features/question_bank/domain/models/teacher_question_model.dart';
import 'package:education_frontend/features/results/data/repositories/results_repository.dart';
import 'package:education_frontend/features/results/domain/models/teacher_exam_attempt_model.dart';
import 'package:education_frontend/features/results/presentation/providers/results_providers.dart';
import 'package:education_frontend/shared/presentation/widgets/placeholder_feature_view.dart';
import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:education_frontend/shared/widgets/app_badge.dart';
import 'package:education_frontend/shared/widgets/app_button.dart';
import 'package:education_frontend/shared/widgets/app_card.dart';
import 'package:education_frontend/shared/widgets/app_dialog_shell.dart';
import 'package:education_frontend/shared/widgets/app_empty_state.dart';
import 'package:education_frontend/shared/widgets/app_error_state.dart';
import 'package:education_frontend/shared/widgets/app_loader.dart';
import 'package:education_frontend/shared/widgets/app_section_header.dart';
import 'package:education_frontend/shared/widgets/app_text_field.dart';
import 'package:education_frontend/shared/widgets/action_button_group_component.dart';
import 'package:education_frontend/shared/widgets/compact_action_menu_component.dart';
import 'package:education_frontend/shared/widgets/dashboard_stat_card.dart';
import 'package:education_frontend/shared/widgets/status_badge_component.dart';
import 'package:education_frontend/shared/widgets/workspace_page_components.dart';
import 'package:education_frontend/shared/utils/app_date_time.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class ExamsPage extends ConsumerWidget {
  const ExamsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    if (user == null) {
      return const SizedBox.shrink();
    }

    return DashboardShell(
      title: 'Exams',
      user: user,
      currentRoute: AppRoutes.exams,
      onLogout: () => ref.read(authControllerProvider.notifier).logout(),
      body: switch (user.role) {
        AppRole.student => const _StudentExamsView(),
        AppRole.teacher => const _TeacherExamBuilderView(),
        AppRole.instituteAdmin => const _TeacherExamBuilderView(
          workspaceLabel: 'Institute',
        ),
        _ => const PlaceholderFeatureView(
          title: 'Exam surface reserved',
          description:
              'This route is intentionally limited for the current role.',
          highlights: [
            'Student exam runtime is already connected and refreshed.',
            'Teacher and institute roles can manage exams end to end.',
            'Additional role-specific exam views can layer onto the same shell.',
          ],
          statusLabel: 'Limited by role',
          footerMessage:
              'The exam engine, section structure, and runtime UX already exist for active roles, so any later role expansion can reuse the same foundation instead of branching into a separate module.',
        ),
      },
    );
  }
}

class _StudentExamsView extends ConsumerWidget {
  const _StudentExamsView();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final examsValue = ref.watch(studentAvailableExamListProvider);
    final attemptsValue = ref.watch(studentAttemptsProvider);

    return examsValue.when(
      data: (exams) => attemptsValue.when(
        data: (attempts) {
          final grouped = {
            'available_now': <StudentExamDetailListItem>[],
            'upcoming': <StudentExamDetailListItem>[],
            'completed': <StudentExamDetailListItem>[],
            'missed': <StudentExamDetailListItem>[],
          };
          for (final exam in exams) {
            grouped[exam.availabilityState]?.add(exam);
          }
          return ListView(
            children: [
              _ExamOverviewHero(
                eyebrow: 'Student exam workspace',
                title: 'Exam availability',
                description:
                    'Track what is live now, what is coming up, and what is already completed without guessing the exam window.',
                highlights: [
                  'Live now: ${grouped['available_now']!.length}',
                  'Upcoming windows: ${grouped['upcoming']!.length}',
                  'Completed or pending results: ${grouped['completed']!.length}',
                  'Missed or expired: ${grouped['missed']!.length}',
                ],
              ),
              const SizedBox(height: AppSpacing.xl),
              _ExamMetricGrid(
                cards: [
                  DashboardStatCard(
                    label: 'Live now',
                    value: '${grouped['available_now']!.length}',
                    helper: 'Ready to start',
                    icon: Icons.play_circle_outline_rounded,
                    tint: AppColors.teal,
                  ),
                  DashboardStatCard(
                    label: 'Upcoming',
                    value: '${grouped['upcoming']!.length}',
                    helper: 'Scheduled windows',
                    icon: Icons.schedule_rounded,
                    tint: AppColors.amber,
                  ),
                  DashboardStatCard(
                    label: 'Completed',
                    value: '${grouped['completed']!.length}',
                    helper: 'Awaiting or showing results',
                    icon: Icons.task_alt_rounded,
                    tint: AppColors.accent,
                  ),
                  DashboardStatCard(
                    label: 'Missed',
                    value: '${grouped['missed']!.length}',
                    helper: 'Need follow-up',
                    icon: Icons.report_gmailerrorred_rounded,
                    tint: AppColors.rose,
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xl),
              ...[
                ('Available now', grouped['available_now']!),
                ('Upcoming', grouped['upcoming']!),
                ('Completed', grouped['completed']!),
                ('Missed / Expired', grouped['missed']!),
              ].map((section) {
                final title = section.$1;
                final items = section.$2;
                if (items.isEmpty) {
                  return const SizedBox.shrink();
                }
                return Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.lg),
                  child: AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        AppSectionHeader(
                          title: title,
                          subtitle:
                              'Review each exam window, scoring summary, and attempt state from one place.',
                        ),
                        const SizedBox(height: AppSpacing.md),
                        ...items.map((exam) {
                          StudentAttempt? activeAttempt;
                          for (final attempt in attempts) {
                            if (attempt.examId == exam.id &&
                                attempt.isInProgress) {
                              activeAttempt = attempt;
                              break;
                            }
                          }
                          return Padding(
                            padding: const EdgeInsets.only(
                              bottom: AppSpacing.md,
                            ),
                            child: _StudentExamCard(
                              exam: exam,
                              hasInProgressAttempt: activeAttempt != null,
                              onOpen: () => context.go(
                                AppRoutes.studentExamDetail(exam.id),
                              ),
                              onPrimaryAction: () {
                                if (activeAttempt != null) {
                                  context.go(
                                    AppRoutes.studentAttempt(
                                      examId: exam.id,
                                      attemptId: activeAttempt.id,
                                    ),
                                  );
                                  return;
                                }
                                context.go(
                                  AppRoutes.studentExamDetail(exam.id),
                                );
                              },
                            ),
                          );
                        }),
                      ],
                    ),
                  ),
                );
              }),
            ],
          );
        },
        loading: () => const AppLoader(label: 'Loading your attempt history'),
        error: (error, _) => AppErrorState(message: readApiErrorMessage(error)),
      ),
      loading: () => const AppLoader(label: 'Loading available exams'),
      error: (error, _) => AppErrorState(message: readApiErrorMessage(error)),
    );
  }
}

class _TeacherExamBuilderView extends ConsumerStatefulWidget {
  const _TeacherExamBuilderView({this.workspaceLabel = 'Teacher'});

  final String workspaceLabel;

  @override
  ConsumerState<_TeacherExamBuilderView> createState() =>
      _TeacherExamBuilderViewState();
}

class _TeacherExamBuilderViewState
    extends ConsumerState<_TeacherExamBuilderView> {
  bool _canForceLive(TeacherExamBuilderModel exam) {
    return exam.status != 'cancelled' && exam.status != 'completed';
  }

  bool _canCompleteExam(TeacherExamBuilderModel exam) {
    return exam.status != 'cancelled' && exam.status != 'completed';
  }

  bool _canCancelExam(TeacherExamBuilderModel exam) {
    return exam.status != 'cancelled';
  }

  bool _canGenerateResults(TeacherExamBuilderModel exam) {
    return exam.status != 'draft' && exam.status != 'cancelled';
  }

  bool _canCalculateRanks(TeacherExamBuilderModel exam) {
    return exam.status != 'draft' && exam.status != 'cancelled';
  }

  bool _canPublishResults(TeacherExamBuilderModel exam) {
    return exam.status == 'completed';
  }

  String _statusActionHint(TeacherExamBuilderModel exam) {
    return switch (exam.status) {
      'draft' =>
        'Draft exams can still change substantially. Publish them before relying on live monitoring or result operations.',
      'scheduled' =>
        'Scheduled exams follow their time window by default. Refresh status syncs with the window, while Start live overrides it operationally.',
      'live' =>
        'Live exams are open for attempts now. Mark completed once invigilation is done or the active window should be closed.',
      'completed' =>
        'Completed exams are closed for new attempts. Use result operations and analytics from here onward.',
      'cancelled' =>
        'Cancelled exams stay visible for history and reporting, but new attempt activity should stop.',
      _ =>
        'Review the current exam state carefully before changing its operational status.',
    };
  }

  String _resultActionHint(TeacherExamBuilderModel exam) {
    return switch (exam.status) {
      'draft' =>
        'Generate, rank, and publish result operations stay blocked while the exam is still a draft.',
      'scheduled' =>
        'Result generation is allowed once submissions exist, but publishing should wait until the exam is completed.',
      'live' =>
        'You can generate or recalculate results for completed attempts, but final publishing should wait until live activity is over.',
      'completed' =>
        'All result operations are available now, including final publication.',
      'cancelled' =>
        'Cancelled exams keep their history, but result operations are intentionally blocked.',
      _ =>
        'Use result operations carefully so scores, ranks, and publication state stay aligned.',
    };
  }

  Future<void> _openSectionDialog({
    required TeacherExamBuilderModel exam,
    TeacherExamSectionModel? section,
  }) async {
    final result = await Navigator.of(context).push<_ExamSectionDialogResult>(
      MaterialPageRoute(
        builder: (context) => _ExamSectionDialog(
          exam: exam,
          initialSection: section,
          fullPage: true,
        ),
      ),
    );

    if (result == null) {
      return;
    }

    try {
      final repository = ref.read(teacherExamBuilderRepositoryProvider);
      if (section == null) {
        await repository.createExamSection(result.payload);
      } else {
        await repository.updateExamSection(section.id, result.payload);
      }
      invalidateTeacherExamList(ref, examId: exam.id);
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(readApiErrorMessage(error))));
    }
  }

  Future<void> _deleteSection(
    TeacherExamBuilderModel exam,
    TeacherExamSectionModel section,
  ) async {
    final confirmed =
        await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Remove section?'),
            content: Text(
              'Questions linked to ${section.name} will remain in the exam and become unsectioned.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: const Text('Remove'),
              ),
            ],
          ),
        ) ??
        false;
    if (!confirmed) {
      return;
    }

    try {
      await ref
          .read(teacherExamBuilderRepositoryProvider)
          .deleteExamSection(section.id);
      invalidateTeacherExamList(ref, examId: exam.id);
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(readApiErrorMessage(error))));
    }
  }

  Future<void> _openExamDialog({TeacherExamBuilderModel? exam}) async {
    final user = ref.read(currentUserProvider);
    if (user == null) {
      return;
    }

    final years = ref
        .read(academicYearOptionsProvider)
        .maybeWhen(
          data: (items) => items,
          orElse: () => const <AcademicLookupOption>[],
        );
    final programs = ref
        .read(programOptionsProvider)
        .maybeWhen(
          data: (items) => items,
          orElse: () => const <AcademicLookupOption>[],
        );
    final cohorts = ref
        .read(cohortOptionsProvider)
        .maybeWhen(
          data: (items) => items,
          orElse: () => const <AcademicLookupOption>[],
        );
    final subjects = ref
        .read(subjectOptionsProvider)
        .maybeWhen(
          data: (items) => items,
          orElse: () => const <AcademicLookupOption>[],
        );

    final result = await Navigator.of(context).push<_ExamDialogResult>(
      MaterialPageRoute(
        builder: (context) => _ExamEditorDialog(
          instituteId: user.instituteId ?? '',
          years: years,
          programs: programs,
          cohorts: cohorts,
          subjects: subjects,
          initialExam: exam,
          fullPage: true,
        ),
      ),
    );

    if (result == null) {
      return;
    }

    try {
      final repository = ref.read(teacherExamBuilderRepositoryProvider);
      late final TeacherExamBuilderModel savedExam;
      if (exam == null) {
        savedExam = await repository.createExam(result.payload);
      } else {
        savedExam = await repository.updateExam(exam.id, result.payload);
      }
      selectAndRefreshTeacherExam(ref, examId: savedExam.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(exam == null ? 'Exam created.' : 'Exam updated.'),
          ),
        );
      }
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(readApiErrorMessage(error))));
    }
  }

  Future<void> _openAssignmentDialog(TeacherExamBuilderModel exam) async {
    try {
      final assignableStudents = await ref
          .read(teacherExamBuilderRepositoryProvider)
          .fetchAssignableStudents(
            academicYearId: exam.academicYearId,
            programId: exam.programId,
            cohortId: exam.cohortId,
          );
      if (!mounted) {
        return;
      }

      final result = await Navigator.of(context)
          .push<_ExamAssignmentDialogResult>(
            MaterialPageRoute(
              builder: (context) => _ExamAssignmentDialog(
                exam: exam,
                assignableStudents: assignableStudents,
                fullPage: true,
              ),
            ),
          );
      if (result == null) {
        return;
      }

      final updatedExam = await ref
          .read(teacherExamBuilderRepositoryProvider)
          .assignStudents(exam.id, result.payload);
      selectAndRefreshTeacherExam(ref, examId: updatedExam.id);
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Exam assignments updated.')),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(readApiErrorMessage(error))));
    }
  }

  Future<void> _openExamPreviewDialog(TeacherExamBuilderModel exam) async {
    try {
      final preview = await ref
          .read(teacherExamBuilderRepositoryProvider)
          .fetchExamPreview(exam.id);
      if (!mounted) {
        return;
      }
      await Navigator.of(context).push<void>(
        MaterialPageRoute(
          builder: (context) =>
              _TeacherExamPreviewDialog(exam: preview, fullPage: true),
        ),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(readApiErrorMessage(error))));
    }
  }

  Future<void> _openAddQuestionDialog(TeacherExamBuilderModel exam) async {
    final availableQuestions = await ref
        .read(questionBankRepositoryProvider)
        .fetchQuestionPage(
          const TeacherQuestionFilterState(
            ordering: '-usage_count',
            pageSize: 100,
          ),
        );
    if (!mounted) {
      return;
    }

    final result = await Navigator.of(context)
        .push<_BulkExamQuestionDialogResult>(
          MaterialPageRoute(
            builder: (context) => _BulkExamQuestionDialog(
              exam: exam,
              availableQuestions: availableQuestions.items,
              sections: exam.sections,
              fullPage: true,
            ),
          ),
        );

    if (result == null) {
      return;
    }

    try {
      final repository = ref.read(teacherExamBuilderRepositoryProvider);
      for (final payload in result.payloads) {
        await repository.addExamQuestion(payload);
      }
      invalidateTeacherExamList(ref, examId: exam.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              result.payloads.length == 1
                  ? 'Question added to exam.'
                  : '${result.payloads.length} questions added to exam.',
            ),
          ),
        );
      }
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(readApiErrorMessage(error))));
    }
  }

  Future<void> _editExamQuestion(
    TeacherExamBuilderModel exam,
    TeacherExamQuestionLinkModel link,
  ) async {
    final result = await showDialog<_ExamQuestionDialogResult>(
      context: context,
      barrierDismissible: false,
      builder: (context) => _ExamQuestionDialog(
        exam: exam,
        availableQuestions: const [],
        sections: exam.sections,
        initialLink: link,
      ),
    );

    if (result == null) {
      return;
    }

    try {
      await ref
          .read(teacherExamBuilderRepositoryProvider)
          .updateExamQuestion(link.id, result.payload);
      invalidateTeacherExamList(ref, examId: exam.id);
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(readApiErrorMessage(error))));
    }
  }

  Future<void> _deleteExamQuestion(
    TeacherExamBuilderModel exam,
    TeacherExamQuestionLinkModel link,
  ) async {
    try {
      await ref
          .read(teacherExamBuilderRepositoryProvider)
          .deleteExamQuestion(link.id);
      invalidateTeacherExamList(ref, examId: exam.id);
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(readApiErrorMessage(error))));
    }
  }

  Future<void> _moveQuestionOrder(
    TeacherExamBuilderModel exam,
    TeacherExamQuestionLinkModel current,
    int direction,
  ) async {
    final sorted = [...exam.examQuestions]
      ..sort((a, b) => a.questionOrder.compareTo(b.questionOrder));
    final currentIndex = sorted.indexWhere((item) => item.id == current.id);
    final targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= sorted.length) {
      return;
    }

    final target = sorted[targetIndex];
    final repository = ref.read(teacherExamBuilderRepositoryProvider);

    try {
      final tempOrder = sorted.length + 1000;
      await repository.updateExamQuestion(current.id, {
        'question_order': tempOrder,
      });
      await repository.updateExamQuestion(target.id, {
        'question_order': current.questionOrder,
      });
      await repository.updateExamQuestion(current.id, {
        'question_order': target.questionOrder,
      });
      invalidateTeacherExamList(ref, examId: exam.id);
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(readApiErrorMessage(error))));
    }
  }

  Future<void> _runExamResultOperation({
    required TeacherExamBuilderModel exam,
    required String successMessage,
    required Future<void> Function(ResultsRepository repository) operation,
  }) async {
    try {
      final repository = ref.read(resultsRepositoryProvider);
      await operation(repository);
      invalidateTeacherExamList(ref, examId: exam.id, includeDashboard: true);
      ref.invalidate(examSummaryRecordsProvider);
      ref.invalidate(teacherExamSummariesProvider);
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(successMessage)));
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(readApiErrorMessage(error))));
    }
  }

  Future<void> _runExamStateOperation({
    required TeacherExamBuilderModel exam,
    required String successMessage,
    String? confirmTitle,
    String? confirmMessage,
    required Future<TeacherExamBuilderModel> Function(
      TeacherExamBuilderRepository repository,
    )
    operation,
  }) async {
    if (confirmTitle != null && confirmMessage != null) {
      final confirmed =
          await showDialog<bool>(
            context: context,
            builder: (context) => AlertDialog(
              title: Text(confirmTitle),
              content: Text(confirmMessage),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  child: const Text('Cancel'),
                ),
                FilledButton(
                  onPressed: () => Navigator.of(context).pop(true),
                  child: const Text('Continue'),
                ),
              ],
            ),
          ) ??
          false;
      if (!confirmed) {
        return;
      }
    }

    try {
      final repository = ref.read(teacherExamBuilderRepositoryProvider);
      final updated = await operation(repository);
      selectAndRefreshTeacherExam(ref, examId: updated.id);
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(successMessage)));
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(readApiErrorMessage(error))));
    }
  }

  Future<void> _syncMarks(TeacherExamBuilderModel exam) async {
    try {
      await ref.read(teacherExamBuilderRepositoryProvider).syncMarks(exam.id);
      invalidateTeacherExamList(ref, examId: exam.id, includeDashboard: true);
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(readApiErrorMessage(error))));
    }
  }

  Future<void> _publishExam(TeacherExamBuilderModel exam) async {
    final teacherQuestions = ref
        .read(teacherQuestionsProvider)
        .maybeWhen(data: (items) => items, orElse: () => const []);
    final missingExplanationCount = exam.examQuestions.where((link) {
      dynamic question;
      for (final item in teacherQuestions) {
        if (item.id == link.questionId) {
          question = item;
          break;
        }
      }
      return question == null || question.explanation.trim().isEmpty;
    }).length;

    if (missingExplanationCount > 0) {
      final shouldContinue =
          await showDialog<bool>(
            context: context,
            builder: (context) => AlertDialog(
              title: const Text('Publish with limited explanations?'),
              content: Text(
                '$missingExplanationCount question(s) in this exam do not have a teacher explanation yet. Students can still take the exam, but review quality will be weaker.',
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  child: const Text('Review questions'),
                ),
                FilledButton(
                  onPressed: () => Navigator.of(context).pop(true),
                  child: const Text('Publish anyway'),
                ),
              ],
            ),
          ) ??
          false;
      if (!shouldContinue) {
        return;
      }
    }

    try {
      await ref.read(teacherExamBuilderRepositoryProvider).publishExam(exam.id);
      invalidateTeacherExamList(ref, examId: exam.id, includeDashboard: true);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Exam published.')));
      }
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(readApiErrorMessage(error))));
    }
  }

  @override
  Widget build(BuildContext context) {
    final examsValue = ref.watch(teacherExamListProvider);
    final selectedId = ref.watch(selectedTeacherExamIdProvider);
    final yearsValue = ref.watch(academicYearOptionsProvider);
    final programsValue = ref.watch(programOptionsProvider);
    final cohortsValue = ref.watch(cohortOptionsProvider);
    final subjectsValue = ref.watch(subjectOptionsProvider);

    final lookupsLoaded =
        yearsValue.hasValue &&
        programsValue.hasValue &&
        cohortsValue.hasValue &&
        subjectsValue.hasValue;

    return examsValue.when(
      data: (exams) {
        final effectiveSelectedId =
            selectedId ?? (exams.isNotEmpty ? exams.first.id : null);
        final detailValue = effectiveSelectedId == null
            ? null
            : ref.watch(teacherExamDetailProvider(effectiveSelectedId));
        final teacherQuestionsValue = ref.watch(teacherQuestionsProvider);

        final publishedCount = exams
            .where((item) => item.status == 'published')
            .length;
        final draftCount = exams.where((item) => item.status == 'draft').length;
        final liveCount = exams.where((item) => item.status == 'live').length;
        final pendingResultCount = exams
            .where(
              (item) =>
                  item.status == 'completed' &&
                  _examResultStatusLabel(item) != 'Blocked',
            )
            .length;
        final listPanel = AppCard(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: ListView(
              children: [
                AppSectionHeader(
                  eyebrow: 'Exam list',
                  title: 'Assessment records',
                  subtitle:
                      'Select an exam to inspect setup, live control, and result actions from the command panel.',
                  action: FilledButton.icon(
                    onPressed: lookupsLoaded ? () => _openExamDialog() : null,
                    icon: const Icon(Icons.add),
                    label: const Text('Create exam'),
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                if (exams.isEmpty)
                  const AppEmptyState(
                    title: 'No exams in this workspace yet',
                    message:
                        'Create the first exam draft to start assembling questions, syncing marks, and publishing an assessment.',
                  )
                else
                  ...List.generate(exams.length, (index) {
                    final exam = exams[index];
                    final isSelected = exam.id == effectiveSelectedId;
                    return Padding(
                      padding: EdgeInsets.only(
                        bottom: index == exams.length - 1 ? 0 : AppSpacing.sm,
                      ),
                      child: _TeacherExamListCard(
                        exam: exam,
                        isSelected: isSelected,
                        onTap: () {
                          ref
                              .read(selectedTeacherExamIdProvider.notifier)
                              .set(exam.id);
                        },
                        onPreview: () => _openExamPreviewDialog(exam),
                        onEdit: () => _openExamDialog(exam: exam),
                        onManageAssignments: () => _openAssignmentDialog(exam),
                      ),
                    );
                  }),
              ],
            ),
          ),
        );

        final detailPanel = detailValue == null
            ? const AppCard(
                child: Padding(
                  padding: EdgeInsets.all(20),
                  child: Text('Create an exam to begin the builder flow.'),
                ),
              )
            : detailValue.when(
                data: (exam) => AppCard(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: ListView(
                      children: [
                        Builder(
                          builder: (context) {
                            final teacherQuestions = teacherQuestionsValue
                                .maybeWhen(
                                  data: (items) => items,
                                  orElse: () => const <TeacherQuestionItem>[],
                                );
                            final questionMap = <String, TeacherQuestionItem>{
                              for (final question in teacherQuestions)
                                if (question.id.trim().isNotEmpty)
                                  question.id: question,
                            };
                            final missingExplanationCount = exam.examQuestions
                                .where(
                                  (link) =>
                                      (questionMap[link.questionId]?.explanation
                                          .trim()
                                          .isEmpty ??
                                      true),
                                )
                                .length;
                            if (missingExplanationCount == 0) {
                              return const SizedBox.shrink();
                            }
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 16),
                              child: Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFFF4D8),
                                  borderRadius: BorderRadius.circular(18),
                                  border: Border.all(
                                    color: AppColors.amber.withValues(
                                      alpha: 0.24,
                                    ),
                                  ),
                                ),
                                child: Text(
                                  '$missingExplanationCount linked question(s) are missing teacher explanations. Students can take the exam, but review quality will be lower until those explanations are added.',
                                ),
                              ),
                            );
                          },
                        ),
                        AppCard(
                          padding: const EdgeInsets.all(22),
                          child: LayoutBuilder(
                            builder: (context, constraints) {
                              final shouldStack = constraints.maxWidth < 1120;
                              final detailsColumn = Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            _ExamStatusBadge(
                                              status: exam.status,
                                            ),
                                            const SizedBox(
                                              height: AppSpacing.md,
                                            ),
                                            Text(
                                              exam.title,
                                              style: Theme.of(context)
                                                  .textTheme
                                                  .headlineSmall
                                                  ?.copyWith(
                                                    fontWeight: FontWeight.w700,
                                                  ),
                                            ),
                                            const SizedBox(height: 6),
                                            Text(
                                              '${exam.code} • ${exam.programName ?? 'Program'} • ${exam.subjectName ?? 'No subject'}',
                                              style: Theme.of(context)
                                                  .textTheme
                                                  .bodyMedium
                                                  ?.copyWith(
                                                    color:
                                                        AppColors.textSecondary,
                                                  ),
                                            ),
                                            const SizedBox(height: 8),
                                            Text(
                                              _examLifecycleHelper(exam),
                                              style: Theme.of(context)
                                                  .textTheme
                                                  .bodySmall
                                                  ?.copyWith(
                                                    color:
                                                        AppColors.textSecondary,
                                                  ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      const SizedBox(width: AppSpacing.lg),
                                      ConstrainedBox(
                                        constraints: const BoxConstraints(
                                          maxWidth: 280,
                                        ),
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            _ExamMetaChip(
                                              label: 'Schedule',
                                              value:
                                                  '${_formatDateTime(exam.startAt)} - ${_formatDateTime(exam.endAt)}',
                                            ),
                                            const SizedBox(
                                              height: AppSpacing.sm,
                                            ),
                                            _ExamMetaChip(
                                              label: 'Assigned',
                                              value:
                                                  exam.assignmentMode ==
                                                      'selected_students'
                                                  ? exam.assignedStudentCount
                                                  : 'All in scope',
                                            ),
                                            const SizedBox(
                                              height: AppSpacing.sm,
                                            ),
                                            _ExamMetaChip(
                                              label: 'Result status',
                                              value: _examResultStatusLabel(
                                                exam,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: AppSpacing.md),
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 8,
                                    children: [
                                      _ExamMetaChip(
                                        label: 'Class',
                                        value: exam.programName ?? 'Program',
                                      ),
                                      _ExamMetaChip(
                                        label: 'Subject',
                                        value: exam.subjectName ?? 'No subject',
                                      ),
                                      _ExamMetaChip(
                                        label: 'Audience',
                                        value:
                                            exam.assignmentMode ==
                                                'selected_students'
                                            ? 'Selected students'
                                            : 'Program scope',
                                      ),
                                      _ExamMetaChip(
                                        label: 'Questions',
                                        value: exam.examQuestions.length,
                                      ),
                                    ],
                                  ),
                                ],
                              );

                              final actionsRail = _ExamActionRail(
                                exam: exam,
                                canForceLive: _canForceLive(exam),
                                canCompleteExam: _canCompleteExam(exam),
                                canCancelExam: _canCancelExam(exam),
                                canGenerateResults: _canGenerateResults(exam),
                                canCalculateRanks: _canCalculateRanks(exam),
                                canPublishResults: _canPublishResults(exam),
                                statusActionHint: _statusActionHint(exam),
                                resultActionHint: _resultActionHint(exam),
                                onPublishExam: () => _publishExam(exam),
                                onEditDetails: () =>
                                    _openExamDialog(exam: exam),
                                onPreview: () => _openExamPreviewDialog(exam),
                                onManageAssignments: () =>
                                    _openAssignmentDialog(exam),
                                onAddQuestion: () =>
                                    _openAddQuestionDialog(exam),
                                onSyncMarks: () => _syncMarks(exam),
                                onRefreshStatus: () => _runExamStateOperation(
                                  exam: exam,
                                  successMessage: 'Exam status refreshed.',
                                  operation: (repository) =>
                                      repository.refreshExamStatus(exam.id),
                                ),
                                onStartLive: () => _runExamStateOperation(
                                  exam: exam,
                                  successMessage: 'Exam is now live.',
                                  confirmTitle: 'Start exam live now?',
                                  confirmMessage:
                                      'This moves the exam into the live state immediately. Students may begin attempting it if their scope and timing rules allow.',
                                  operation: (repository) =>
                                      repository.markExamLive(exam.id),
                                ),
                                onMarkCompleted: () => _runExamStateOperation(
                                  exam: exam,
                                  successMessage: 'Exam marked completed.',
                                  confirmTitle: 'Mark exam completed?',
                                  confirmMessage:
                                      'This will close the exam operationally and is best used when the live window is over.',
                                  operation: (repository) =>
                                      repository.markExamCompleted(exam.id),
                                ),
                                onCancelExam: () => _runExamStateOperation(
                                  exam: exam,
                                  successMessage: 'Exam cancelled.',
                                  confirmTitle: 'Cancel exam?',
                                  confirmMessage:
                                      'This will stop the exam from being used for new attempts. Existing reporting data is preserved.',
                                  operation: (repository) =>
                                      repository.cancelExam(exam.id),
                                ),
                                onGenerateResults: () => _runExamResultOperation(
                                  exam: exam,
                                  successMessage:
                                      'Results generated for the latest submitted attempts.',
                                  operation: (repository) => repository
                                      .generateResultsForExam(exam.id),
                                ),
                                onCalculateRanks: () => _runExamResultOperation(
                                  exam: exam,
                                  successMessage:
                                      'Ranks recalculated for this exam.',
                                  operation: (repository) =>
                                      repository.calculateRanks(exam.id),
                                ),
                                onPublishResults: () => _runExamResultOperation(
                                  exam: exam,
                                  successMessage: 'Exam results published.',
                                  operation: (repository) =>
                                      repository.publishExamResults(exam.id),
                                ),
                              );

                              if (shouldStack) {
                                return Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    detailsColumn,
                                    const SizedBox(height: AppSpacing.lg),
                                    actionsRail,
                                  ],
                                );
                              }

                              return Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(child: detailsColumn),
                                  const SizedBox(width: AppSpacing.lg),
                                  Flexible(
                                    child: ConstrainedBox(
                                      constraints: const BoxConstraints(
                                        maxWidth: 280,
                                      ),
                                      child: actionsRail,
                                    ),
                                  ),
                                ],
                              );
                            },
                          ),
                        ),
                        const SizedBox(height: AppSpacing.lg),
                        AppCard(
                          backgroundColor: AppColors.surfaceMuted,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const AppSectionHeader(
                                title: 'Exam details',
                                subtitle:
                                    'Schedule, scoring, runtime, and audience settings for the selected exam.',
                              ),
                              const SizedBox(height: 12),
                              Wrap(
                                spacing: 10,
                                runSpacing: 10,
                                children: [
                                  _ExamMetaChip(
                                    label: 'Type',
                                    value: exam.examType,
                                  ),
                                  _ExamMetaChip(
                                    label: 'Duration',
                                    value: '${exam.durationMinutes} min',
                                  ),
                                  _ExamMetaChip(
                                    label: 'Total',
                                    value: exam.totalMarks,
                                  ),
                                  _ExamMetaChip(
                                    label: 'Pass',
                                    value: exam.passingMarks,
                                  ),
                                  _ExamMetaChip(
                                    label: 'Timer',
                                    value: _runtimePolicyLabel(exam.timerMode),
                                  ),
                                  _ExamMetaChip(
                                    label: 'Navigation',
                                    value: _runtimePolicyLabel(
                                      exam.navigationMode,
                                    ),
                                  ),
                                  _ExamMetaChip(
                                    label: 'Attempt',
                                    value: _runtimePolicyLabel(
                                      exam.attemptPolicy,
                                    ),
                                  ),
                                  _ExamMetaChip(
                                    label: 'Security',
                                    value: _runtimePolicyLabel(
                                      exam.securityMode,
                                    ),
                                  ),
                                  AppBadge(
                                    label:
                                        'Results: ${_runtimePolicyLabel(exam.resultPublishMode)}',
                                  ),
                                  AppBadge(
                                    label:
                                        'Review: ${_runtimePolicyLabel(exam.reviewMode)}',
                                  ),
                                  AppBadge(
                                    label: exam.allowResume
                                        ? 'Resume enabled'
                                        : 'Resume blocked',
                                  ),
                                  AppBadge(
                                    label: exam.allowSectionSwitching
                                        ? 'Section switching enabled'
                                        : 'Section switching blocked',
                                  ),
                                  AppBadge(
                                    label: exam.allowReturnToPreviousSection
                                        ? 'Return to previous section allowed'
                                        : 'Return to previous section blocked',
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Text(
                                _examLifecycleHelper(exam),
                                style: Theme.of(context).textTheme.bodySmall
                                    ?.copyWith(color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: AppSpacing.lg),
                        AppSectionHeader(
                          title: 'Live exam monitor',
                          subtitle:
                              'Track live participation, progress, and recent attempt activity for this exam without leaving the builder.',
                        ),
                        const SizedBox(height: AppSpacing.md),
                        _LiveExamMonitorPanel(examId: exam.id),
                        const SizedBox(height: AppSpacing.lg),
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                'Sections',
                                style: Theme.of(context).textTheme.titleLarge
                                    ?.copyWith(fontWeight: FontWeight.w700),
                              ),
                            ),
                            OutlinedButton.icon(
                              onPressed: () => _openSectionDialog(exam: exam),
                              icon: const Icon(Icons.add),
                              label: const Text('Add section'),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.md),
                        if (exam.sections.isEmpty)
                          const AppCard(
                            backgroundColor: AppColors.surfaceMuted,
                            child: Text(
                              'No sections yet. You can still build a flat exam, or add sections to make the structure visible to teachers and students.',
                            ),
                          )
                        else
                          ...exam.sections.map(
                            (section) => Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: AppCard(
                                backgroundColor: AppColors.surfaceMuted,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                'Section ${section.sectionOrder}: ${section.name}',
                                                style: Theme.of(context)
                                                    .textTheme
                                                    .titleMedium
                                                    ?.copyWith(
                                                      fontWeight:
                                                          FontWeight.w700,
                                                    ),
                                              ),
                                              if (section.description
                                                  .trim()
                                                  .isNotEmpty) ...[
                                                const SizedBox(height: 6),
                                                Text(section.description),
                                              ],
                                            ],
                                          ),
                                        ),
                                        PopupMenuButton<String>(
                                          onSelected: (value) {
                                            if (value == 'edit') {
                                              _openSectionDialog(
                                                exam: exam,
                                                section: section,
                                              );
                                            } else if (value == 'remove') {
                                              _deleteSection(exam, section);
                                            }
                                          },
                                          itemBuilder: (context) => const [
                                            PopupMenuItem(
                                              value: 'edit',
                                              child: Text('Edit section'),
                                            ),
                                            PopupMenuItem(
                                              value: 'remove',
                                              child: Text('Remove section'),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 12),
                                    Wrap(
                                      spacing: 10,
                                      runSpacing: 10,
                                      children: [
                                        _ExamMetaChip(
                                          label: 'Questions',
                                          value:
                                              '${section.linkedQuestionsCount}',
                                        ),
                                        _ExamMetaChip(
                                          label: 'Planned',
                                          value: '${section.totalQuestions}',
                                        ),
                                        _ExamMetaChip(
                                          label: 'Marks',
                                          value:
                                              section.marksPerQuestion ?? '-',
                                        ),
                                        _ExamMetaChip(
                                          label: 'Negative',
                                          value:
                                              section
                                                  .negativeMarksPerQuestion ??
                                              '-',
                                        ),
                                        _ExamMetaChip(
                                          label: 'Timer',
                                          value: section.timerEnabled
                                              ? '${section.durationMinutes ?? '-'} min'
                                              : 'Shared exam timer',
                                        ),
                                        _ExamMetaChip(
                                          label: 'Flow',
                                          value: section.lockAfterSubmit
                                              ? 'Locks after submit'
                                              : 'Flexible submit',
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        const SizedBox(height: AppSpacing.sm),
                        AppSectionHeader(
                          title: 'Exam questions',
                          subtitle:
                              'Linked questions inherit the section structure but still keep the current flat runtime order.',
                          action: AppButton(
                            label: exam.examQuestions.isEmpty
                                ? 'Add questions'
                                : 'Manage questions',
                            icon: Icons.playlist_add_outlined,
                            onPressed: () => _openAddQuestionDialog(exam),
                            variant: AppButtonVariant.secondary,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.md),
                        if (exam.examQuestions.isEmpty)
                          AppEmptyState(
                            title: 'No questions linked yet',
                            message:
                                'Add questions from the bank to shape the structure and scoring of this exam.',
                            action: AppButton(
                              label: 'Add questions',
                              icon: Icons.playlist_add_outlined,
                              onPressed: () => _openAddQuestionDialog(exam),
                            ),
                          )
                        else
                          ...exam.examQuestions.map(
                            (link) => Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: AppCard(
                                padding: const EdgeInsets.all(18),
                                child: Padding(
                                  padding: EdgeInsets.zero,
                                  child: Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      CircleAvatar(
                                        radius: 20,
                                        child: Text('${link.questionOrder}'),
                                      ),
                                      const SizedBox(width: 14),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              link.questionTextSummary,
                                              style: Theme.of(context)
                                                  .textTheme
                                                  .titleMedium
                                                  ?.copyWith(
                                                    fontWeight: FontWeight.w700,
                                                  ),
                                            ),
                                            const SizedBox(height: 6),
                                            Wrap(
                                              spacing: 8,
                                              runSpacing: 8,
                                              children: [
                                                AppBadge(
                                                  label:
                                                      _examQuestionSectionLabel(
                                                        link,
                                                      ),
                                                ),
                                              ],
                                            ),
                                            const SizedBox(height: 6),
                                            Text(
                                              'Marks ${link.marks ?? '-'} • Negative ${link.negativeMarks ?? '-'}',
                                            ),
                                          ],
                                        ),
                                      ),
                                      Column(
                                        children: [
                                          IconButton(
                                            onPressed: () => _moveQuestionOrder(
                                              exam,
                                              link,
                                              -1,
                                            ),
                                            icon: const Icon(
                                              Icons.arrow_upward,
                                            ),
                                            tooltip: 'Move up',
                                          ),
                                          IconButton(
                                            onPressed: () => _moveQuestionOrder(
                                              exam,
                                              link,
                                              1,
                                            ),
                                            icon: const Icon(
                                              Icons.arrow_downward,
                                            ),
                                            tooltip: 'Move down',
                                          ),
                                        ],
                                      ),
                                      PopupMenuButton<String>(
                                        onSelected: (value) {
                                          if (value == 'edit') {
                                            _editExamQuestion(exam, link);
                                          } else if (value == 'remove') {
                                            _deleteExamQuestion(exam, link);
                                          }
                                        },
                                        itemBuilder: (context) => const [
                                          PopupMenuItem(
                                            value: 'edit',
                                            child: Text('Edit link'),
                                          ),
                                          PopupMenuItem(
                                            value: 'remove',
                                            child: Text('Remove'),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
                loading: () => const AppLoader(label: 'Loading exam builder'),
                error: (error, _) =>
                    AppErrorState(message: readApiErrorMessage(error)),
              );

        final leftPanelWidth = MediaQuery.sizeOf(context).width >= 1600
            ? 520.0
            : 460.0;
        final previewExam = exams.isNotEmpty ? exams.first : null;

        return ListView(
          children: [
            WorkspacePageIntro(
              eyebrow: '${widget.workspaceLabel} exams',
              title: 'Exam management workspace',
              subtitle:
                  'Manage draft setup, assignment scope, live controls, and result operations from one consistent assessment workspace.',
              breadcrumbs: [widget.workspaceLabel, 'Exams'],
              primaryAction: FilledButton.icon(
                onPressed: lookupsLoaded ? () => _openExamDialog() : null,
                icon: const Icon(Icons.add),
                label: const Text('Create exam'),
              ),
              secondaryActions: [
                OutlinedButton.icon(
                  onPressed: previewExam == null
                      ? null
                      : () => _openExamPreviewDialog(previewExam),
                  icon: const Icon(Icons.preview_outlined),
                  label: const Text('Preview layout'),
                ),
              ],
              metrics: [
                DashboardStatCard(
                  label: 'All exams',
                  value: '${exams.length}',
                  helper: 'Builder records',
                  icon: Icons.fact_check_outlined,
                ),
                DashboardStatCard(
                  label: 'Published',
                  value: '$publishedCount',
                  helper: 'Visible to students',
                  icon: Icons.verified_outlined,
                  tint: AppColors.teal,
                ),
                DashboardStatCard(
                  label: 'Live',
                  value: '$liveCount',
                  helper: 'Currently running',
                  icon: Icons.play_circle_fill_rounded,
                  tint: AppColors.info,
                ),
                DashboardStatCard(
                  label: 'Drafts',
                  value: '$draftCount',
                  helper: 'Still in setup',
                  icon: Icons.edit_note_rounded,
                  tint: AppColors.amber,
                ),
                DashboardStatCard(
                  label: 'Pending results',
                  value: '$pendingResultCount',
                  helper: 'Completed but not fully published',
                  icon: Icons.hourglass_bottom_rounded,
                  tint: AppColors.warning,
                ),
              ],
            ),
            WorkspaceSplitView(
              breakpoint: 1180,
              primaryFlex: 11,
              secondaryFlex: 15,
              primary: SizedBox(
                width: leftPanelWidth,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 840),
                  child: listPanel,
                ),
              ),
              secondary: SizedBox(height: 840, child: detailPanel),
            ),
          ],
        );
      },
      loading: () => AppLoader(
        label: 'Loading ${widget.workspaceLabel.toLowerCase()} exams',
      ),
      error: (error, _) => AppErrorState(message: readApiErrorMessage(error)),
    );
  }
}

class _StudentExamCard extends StatelessWidget {
  const _StudentExamCard({
    required this.exam,
    required this.hasInProgressAttempt,
    required this.onOpen,
    required this.onPrimaryAction,
  });

  final StudentExamDetailListItem exam;
  final bool hasInProgressAttempt;
  final VoidCallback onOpen;
  final VoidCallback onPrimaryAction;

  @override
  Widget build(BuildContext context) {
    final availabilityLabel = switch (exam.availabilityState) {
      'available_now' => 'Available now',
      'upcoming' => 'Upcoming',
      'missed' => 'Missed',
      _ => 'Completed',
    };
    return AppCard(
      gradient: LinearGradient(
        colors: [
          AppColors.surface,
          AppColors.surfaceStrong.withValues(alpha: 0.84),
        ],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: onOpen,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          exam.title,
                          style: Theme.of(context).textTheme.titleLarge
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          '${exam.code} • ${exam.subjectName ?? 'Subject pending'}',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ],
                    ),
                  ),
                ),
                FilledButton(
                  onPressed: exam.canStart || hasInProgressAttempt
                      ? onPrimaryAction
                      : onOpen,
                  child: Text(
                    hasInProgressAttempt
                        ? 'Resume'
                        : exam.canStart
                        ? 'Start Exam'
                        : 'View Details',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                _ExamMetaChip(label: 'Availability', value: availabilityLabel),
                _ExamMetaChip(
                  label: 'Duration',
                  value: '${exam.durationMinutes} min',
                ),
                _ExamMetaChip(label: 'Status', value: exam.status),
                _ExamMetaChip(label: 'Marks', value: exam.totalMarks),
                _ExamMetaChip(label: 'Pass', value: exam.passingMarks),
                _ExamMetaChip(
                  label: 'Attempts',
                  value:
                      '${exam.attemptsUsed}/${exam.attemptsUsed + exam.remainingAttempts}',
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              'Start: ${_formatDateTime(exam.startAt)}\nEnd: ${_formatDateTime(exam.endAt)}',
            ),
            const SizedBox(height: 12),
            Text(
              exam.canResume && exam.activeAttempt != null
                  ? 'Resume your in-progress attempt. Remaining time depends on the original countdown.'
                  : exam.availabilityState == 'upcoming'
                  ? 'Starts in ${_formatDurationLabel(exam.startsInSeconds)}'
                  : exam.availabilityState == 'available_now'
                  ? 'Ends in ${_formatDurationLabel(exam.endsInSeconds)}'
                  : exam.resultPublished
                  ? 'Result published${exam.reviewAvailable ? ' • Review available' : ''}'
                  : exam.resultStatus != null
                  ? 'Attempt completed • Result pending publish'
                  : 'This exam window has ended.',
            ),
          ],
        ),
      ),
    );
  }
}

class _ExamMetaChip extends StatelessWidget {
  const _ExamMetaChip({required this.label, required this.value});

  final String label;
  final Object? value;

  @override
  Widget build(BuildContext context) {
    final tint = _chipTint(label, value);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: tint.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: tint.withValues(alpha: 0.12)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        child: Text(
          '$label: ${_displayValue(value)}',
          style: Theme.of(context).textTheme.labelLarge?.copyWith(color: tint),
        ),
      ),
    );
  }

  Color _chipTint(String label, Object? value) {
    final normalizedLabel = label.toLowerCase();
    final normalizedValue = _displayValue(value).toLowerCase();
    if (normalizedLabel.contains('status') ||
        normalizedLabel.contains('availability')) {
      if (normalizedValue.contains('publish') ||
          normalizedValue.contains('live') ||
          normalizedValue.contains('available')) {
        return AppColors.teal;
      }
      if (normalizedValue.contains('draft') ||
          normalizedValue.contains('upcoming')) {
        return AppColors.amber;
      }
      if (normalizedValue.contains('missed') ||
          normalizedValue.contains('cancel')) {
        return AppColors.rose;
      }
    }
    if (normalizedLabel.contains('marks') || normalizedLabel.contains('pass')) {
      return AppColors.secondary;
    }
    return AppColors.accent;
  }
}

class _ExamStatusBadge extends StatelessWidget {
  const _ExamStatusBadge({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    return StatusBadgeComponent(label: status);
  }
}

class _TeacherExamListCard extends StatelessWidget {
  const _TeacherExamListCard({
    required this.exam,
    required this.isSelected,
    required this.onTap,
    required this.onPreview,
    required this.onEdit,
    required this.onManageAssignments,
  });

  final TeacherExamBuilderModel exam;
  final bool isSelected;
  final VoidCallback onTap;
  final VoidCallback onPreview;
  final VoidCallback onEdit;
  final VoidCallback onManageAssignments;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(24),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.surface : AppColors.surfaceMuted,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: isSelected
                ? AppColors.accent.withValues(alpha: 0.28)
                : AppColors.border,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: AppColors.accent.withValues(alpha: 0.08),
                    blurRadius: 18,
                    spreadRadius: -10,
                    offset: const Offset(0, 12),
                  ),
                ]
              : null,
        ),
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
                        exam.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        '${exam.programName ?? 'Program'} • ${exam.subjectName ?? 'No subject'}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    _ExamStatusBadge(status: exam.status),
                    const SizedBox(height: AppSpacing.xs),
                    CompactActionMenuComponent(
                      tooltip: 'Exam quick actions',
                      items: [
                        CompactActionMenuItem(
                          value: 'preview',
                          label: 'Preview exam',
                          icon: Icons.visibility_outlined,
                          onSelected: onPreview,
                        ),
                        CompactActionMenuItem(
                          value: 'edit',
                          label: 'Edit exam details',
                          icon: Icons.edit_outlined,
                          onSelected: onEdit,
                        ),
                        CompactActionMenuItem(
                          value: 'assignments',
                          label: 'Manage assignments',
                          icon: Icons.groups_outlined,
                          onSelected: onManageAssignments,
                        ),
                      ],
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
                _ExamMetaChip(label: 'Code', value: exam.code),
                _ExamMetaChip(
                  label: 'Schedule',
                  value: _compactScheduleLabel(exam.startAt, exam.endAt),
                ),
                _ExamMetaChip(
                  label: 'Assigned',
                  value: exam.assignmentMode == 'selected_students'
                      ? exam.assignedStudentCount
                      : 'All in scope',
                ),
                _ExamMetaChip(
                  label: 'Results',
                  value: _examResultStatusLabel(exam),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ExamOverviewHero extends StatelessWidget {
  const _ExamOverviewHero({
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
    final isWide = MediaQuery.sizeOf(context).width >= 960;
    return AppCard(
      gradient: LinearGradient(
        colors: [
          AppColors.surface,
          AppColors.subtleAccent.withValues(alpha: 0.90),
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
                  child: _ExamHeroCopy(
                    eyebrow: eyebrow,
                    title: title,
                    description: description,
                  ),
                ),
                const SizedBox(width: AppSpacing.xl),
                Expanded(
                  flex: 2,
                  child: _ExamHeroHighlights(items: highlights),
                ),
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _ExamHeroCopy(
                  eyebrow: eyebrow,
                  title: title,
                  description: description,
                ),
                const SizedBox(height: AppSpacing.xl),
                _ExamHeroHighlights(items: highlights),
              ],
            ),
    );
  }
}

class _LiveExamMonitorPanel extends ConsumerStatefulWidget {
  const _LiveExamMonitorPanel({required this.examId});

  final String examId;

  @override
  ConsumerState<_LiveExamMonitorPanel> createState() =>
      _LiveExamMonitorPanelState();
}

class _LiveExamMonitorPanelState extends ConsumerState<_LiveExamMonitorPanel> {
  Timer? _pollTimer;

  Color _alertColor(String severity) {
    return switch (severity) {
      'high' => AppColors.rose,
      'medium' => AppColors.amber,
      'low' => AppColors.accent,
      _ => AppColors.textSecondary,
    };
  }

  List<Widget> _buildAlertBadges(TeacherExamAttemptModel attempt) {
    return attempt.alerts
        .map(
          (alert) => AppBadge(
            label: alert.label,
            backgroundColor: _alertColor(
              alert.severity,
            ).withValues(alpha: 0.12),
            foregroundColor: _alertColor(alert.severity),
          ),
        )
        .toList();
  }

  List<TeacherExamAttemptModel> _sortAttemptsBySeverity(
    List<TeacherExamAttemptModel> attempts,
  ) {
    final sorted = [...attempts];
    sorted.sort((a, b) {
      final severityCompare = b.highestAlertPriority.compareTo(
        a.highestAlertPriority,
      );
      if (severityCompare != 0) {
        return severityCompare;
      }
      final bTime =
          b.startedAt ??
          b.submittedAt ??
          DateTime.fromMillisecondsSinceEpoch(0);
      final aTime =
          a.startedAt ??
          a.submittedAt ??
          DateTime.fromMillisecondsSinceEpoch(0);
      return bTime.compareTo(aTime);
    });
    return sorted;
  }

  Future<void> _forceSubmitAttempt(
    BuildContext context,
    TeacherExamAttemptModel attempt,
  ) async {
    final messenger = ScaffoldMessenger.of(context);
    if (!attempt.canForceSubmit) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            attempt.forceSubmitBlockReason ??
                'This attempt cannot be force-submitted right now.',
          ),
        ),
      );
      return;
    }
    final confirmed =
        await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Force submit this attempt?'),
            content: Text(
              'This will auto-submit ${attempt.studentName}\'s in-progress attempt and lock further answers for Attempt ${attempt.attemptNo}.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: const Text('Force submit'),
              ),
            ],
          ),
        ) ??
        false;
    if (!confirmed || !mounted) {
      return;
    }

    try {
      await ref.read(resultsRepositoryProvider).forceSubmitAttempt(attempt.id);
      ref.invalidate(liveExamMonitorProvider(widget.examId));
      ref.invalidate(teacherExamAttemptsProvider(widget.examId));
      if (!mounted) {
        return;
      }
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            '${attempt.studentName}\'s attempt was force-submitted.',
          ),
        ),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      messenger.showSnackBar(
        SnackBar(content: Text(readApiErrorMessage(error))),
      );
    }
  }

  @override
  void initState() {
    super.initState();
    _pollTimer = Timer.periodic(const Duration(seconds: 20), (_) {
      if (!mounted) {
        return;
      }
      ref.invalidate(liveExamMonitorProvider(widget.examId));
      ref.invalidate(teacherExamAttemptsProvider(widget.examId));
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _openAttemptDrillDown(BuildContext context) async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) => _LiveExamAttemptDrillDownDialog(
          examId: widget.examId,
          fullPage: true,
        ),
      ),
    );
  }

  Future<void> _openHighPriorityReview(BuildContext context) async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) => _LiveExamAttemptDrillDownDialog(
          examId: widget.examId,
          initialFilter: 'high_priority',
          fullPage: true,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final value = ref.watch(liveExamMonitorProvider(widget.examId));
    return AppCard(
      child: value.when(
        data: (monitor) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    'Auto-refreshes every 20 seconds during active monitoring.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const Spacer(),
                  IconButton.outlined(
                    onPressed: () =>
                        ref.invalidate(liveExamMonitorProvider(widget.examId)),
                    icon: const Icon(Icons.refresh_rounded),
                    tooltip: 'Refresh monitor',
                  ),
                  const SizedBox(width: 8),
                  OutlinedButton(
                    onPressed: () => _openAttemptDrillDown(context),
                    child: const Text('View all attempts'),
                  ),
                  const SizedBox(width: 8),
                  FilledButton.tonal(
                    onPressed: () => _openHighPriorityReview(context),
                    child: const Text('Review high priority'),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  _ExamMetaChip(
                    label: 'Eligible',
                    value: monitor.totalStudents,
                  ),
                  _ExamMetaChip(
                    label: 'Started',
                    value: monitor.startedStudents,
                  ),
                  _ExamMetaChip(
                    label: 'In progress',
                    value: monitor.inProgressStudents,
                  ),
                  _ExamMetaChip(
                    label: 'Completed',
                    value: monitor.completedStudents,
                  ),
                  _ExamMetaChip(
                    label: 'Not started',
                    value: monitor.notStartedStudents,
                  ),
                  _ExamMetaChip(
                    label: 'Auto-submitted',
                    value: monitor.autoSubmittedStudents,
                  ),
                  _ExamMetaChip(
                    label: 'Alerts',
                    value: monitor.alertedAttempts,
                  ),
                  _ExamMetaChip(
                    label: 'High priority',
                    value: monitor.highAlertAttempts,
                  ),
                  _ExamMetaChip(
                    label: 'Medium priority',
                    value: monitor.mediumAlertAttempts,
                  ),
                  _ExamMetaChip(
                    label: 'Stalled',
                    value: monitor.stalledAttempts,
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(
                    child: _MonitorMetricBar(
                      label: 'Completion progress',
                      value:
                          '${monitor.completedStudents}/${monitor.totalStudents}',
                      percentage: monitor.completionPercentage,
                      color: AppColors.teal,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: _MonitorMetricBar(
                      label: 'Participation progress',
                      value:
                          '${monitor.startedStudents}/${monitor.totalStudents}',
                      percentage: monitor.submissionPercentage,
                      color: AppColors.accent,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (monitor.highAlertAttempts > 0)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: AppCard(
                    backgroundColor: AppColors.rose.withValues(alpha: 0.08),
                    borderColor: AppColors.rose.withValues(alpha: 0.20),
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: AppColors.rose.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: const Icon(
                            Icons.priority_high_rounded,
                            color: AppColors.rose,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${monitor.highAlertAttempts} attempt(s) need priority review',
                                style: Theme.of(context).textTheme.titleSmall
                                    ?.copyWith(fontWeight: FontWeight.w700),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Open the high-priority view to inspect stalled or risk-heavy attempts first.',
                                style: Theme.of(context).textTheme.bodySmall
                                    ?.copyWith(color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        OutlinedButton(
                          onPressed: () => _openHighPriorityReview(context),
                          child: const Text('Open queue'),
                        ),
                      ],
                    ),
                  ),
                ),
              Text(
                monitor.lastActivityAt == null
                    ? 'No attempt activity yet.'
                    : 'Last activity: ${_formatDateTime(monitor.lastActivityAt)}',
                style: Theme.of(
                  context,
                ).textTheme.bodySmall?.copyWith(color: AppColors.textSecondary),
              ),
              const SizedBox(height: 16),
              if (monitor.recentAttempts.isEmpty)
                const AppCard(
                  backgroundColor: AppColors.surfaceMuted,
                  child: Text(
                    'No live attempt activity is available yet for this exam.',
                  ),
                )
              else
                Column(
                  children: _sortAttemptsBySeverity(monitor.recentAttempts)
                      .map(
                        (attempt) => Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: AppCard(
                            backgroundColor: AppColors.surfaceMuted,
                            padding: const EdgeInsets.all(14),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        attempt.studentName,
                                        style: Theme.of(context)
                                            .textTheme
                                            .titleSmall
                                            ?.copyWith(
                                              fontWeight: FontWeight.w700,
                                            ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        '${attempt.studentAdmissionNo} • Attempt ${attempt.attemptNo}',
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodySmall
                                            ?.copyWith(
                                              color: AppColors.textSecondary,
                                            ),
                                      ),
                                      const SizedBox(height: 10),
                                      Wrap(
                                        spacing: 8,
                                        runSpacing: 8,
                                        children: [
                                          ..._buildAlertBadges(attempt),
                                          _ExamMetaChip(
                                            label: 'Status',
                                            value: attempt.status,
                                          ),
                                          _ExamMetaChip(
                                            label: 'Answered',
                                            value: attempt.attemptedQuestions,
                                          ),
                                          _ExamMetaChip(
                                            label: 'Score',
                                            value: attempt.finalScore,
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 16),
                                SizedBox(
                                  width: 168,
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        attempt.startedAt == null
                                            ? 'Started: -'
                                            : 'Started: ${_formatDateTime(attempt.startedAt)}',
                                        style: Theme.of(
                                          context,
                                        ).textTheme.bodySmall,
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        attempt.submittedAt == null
                                            ? 'Submission pending'
                                            : 'Submitted: ${_formatDateTime(attempt.submittedAt)}',
                                        style: Theme.of(
                                          context,
                                        ).textTheme.bodySmall,
                                      ),
                                      if (attempt.hasActiveAlerts) ...[
                                        const SizedBox(height: 6),
                                        Text(
                                          attempt.alerts.first.message,
                                          style: Theme.of(context)
                                              .textTheme
                                              .bodySmall
                                              ?.copyWith(
                                                color: _alertColor(
                                                  attempt.alerts.first.severity,
                                                ),
                                                fontWeight: FontWeight.w700,
                                              ),
                                        ),
                                      ],
                                      if (attempt.status == 'in_progress' ||
                                          attempt.forceSubmitBlockReason !=
                                              null) ...[
                                        const SizedBox(height: 10),
                                        SizedBox(
                                          width: double.infinity,
                                          child: OutlinedButton(
                                            onPressed: !attempt.canForceSubmit
                                                ? null
                                                : () => _forceSubmitAttempt(
                                                    context,
                                                    attempt,
                                                  ),
                                            child: const Text('Force submit'),
                                          ),
                                        ),
                                        if (attempt.forceSubmitBlockReason !=
                                            null) ...[
                                          const SizedBox(height: 6),
                                          Text(
                                            attempt.forceSubmitBlockReason!,
                                            style: Theme.of(context)
                                                .textTheme
                                                .bodySmall
                                                ?.copyWith(
                                                  color:
                                                      AppColors.textSecondary,
                                                ),
                                          ),
                                        ],
                                      ],
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      )
                      .toList(),
                ),
            ],
          );
        },
        loading: () => const AppLoader(label: 'Loading live exam monitor'),
        error: (error, _) => AppErrorState(message: readApiErrorMessage(error)),
      ),
    );
  }
}

class _LiveExamAttemptDrillDownDialog extends ConsumerStatefulWidget {
  const _LiveExamAttemptDrillDownDialog({
    required this.examId,
    this.initialFilter = 'all',
    this.fullPage = false,
  });

  final String examId;
  final String initialFilter;
  final bool fullPage;

  @override
  ConsumerState<_LiveExamAttemptDrillDownDialog> createState() =>
      _LiveExamAttemptDrillDownDialogState();
}

class _LiveExamAttemptDrillDownDialogState
    extends ConsumerState<_LiveExamAttemptDrillDownDialog> {
  late String _statusFilter;
  final Set<String> _selectedAttemptIds = <String>{};
  bool _bulkSubmitting = false;

  @override
  void initState() {
    super.initState();
    _statusFilter = widget.initialFilter;
  }

  Color _alertColor(String severity) {
    return switch (severity) {
      'high' => AppColors.rose,
      'medium' => AppColors.amber,
      'low' => AppColors.accent,
      _ => AppColors.textSecondary,
    };
  }

  List<Widget> _buildAlertBadges(TeacherExamAttemptModel attempt) {
    return attempt.alerts
        .map(
          (alert) => AppBadge(
            label: alert.label,
            backgroundColor: _alertColor(
              alert.severity,
            ).withValues(alpha: 0.12),
            foregroundColor: _alertColor(alert.severity),
          ),
        )
        .toList();
  }

  List<TeacherExamAttemptModel> _sortAttemptsBySeverity(
    List<TeacherExamAttemptModel> attempts,
  ) {
    final sorted = [...attempts];
    sorted.sort((a, b) {
      final severityCompare = b.highestAlertPriority.compareTo(
        a.highestAlertPriority,
      );
      if (severityCompare != 0) {
        return severityCompare;
      }
      final bTime =
          b.startedAt ??
          b.submittedAt ??
          DateTime.fromMillisecondsSinceEpoch(0);
      final aTime =
          a.startedAt ??
          a.submittedAt ??
          DateTime.fromMillisecondsSinceEpoch(0);
      return bTime.compareTo(aTime);
    });
    return sorted;
  }

  bool _isBulkSelectable(TeacherExamAttemptModel attempt) {
    return attempt.canForceSubmit;
  }

  void _toggleAttemptSelection(TeacherExamAttemptModel attempt, bool selected) {
    setState(() {
      if (selected) {
        _selectedAttemptIds.add(attempt.id);
      } else {
        _selectedAttemptIds.remove(attempt.id);
      }
    });
  }

  void _selectAllEligible(List<TeacherExamAttemptModel> attempts) {
    setState(() {
      _selectedAttemptIds
        ..clear()
        ..addAll(
          attempts.where(_isBulkSelectable).map((attempt) => attempt.id),
        );
    });
  }

  void _selectEligibleByPriority(
    List<TeacherExamAttemptModel> attempts, {
    required int minimumPriority,
  }) {
    setState(() {
      _selectedAttemptIds
        ..clear()
        ..addAll(
          attempts
              .where(_isBulkSelectable)
              .where(
                (attempt) => attempt.highestAlertPriority >= minimumPriority,
              )
              .map((attempt) => attempt.id),
        );
    });
  }

  void _clearSelection() {
    setState(() => _selectedAttemptIds.clear());
  }

  Future<void> _bulkForceSubmit(List<TeacherExamAttemptModel> attempts) async {
    final selectedAttempts = attempts
        .where((attempt) => _selectedAttemptIds.contains(attempt.id))
        .where(_isBulkSelectable)
        .toList();
    if (selectedAttempts.isEmpty || _bulkSubmitting) {
      return;
    }

    final confirmed =
        await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Force submit selected attempts?'),
            content: Text(
              'This will auto-submit ${selectedAttempts.length} selected in-progress attempt(s) and refresh the live monitor afterwards.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: const Text('Force submit all'),
              ),
            ],
          ),
        ) ??
        false;
    if (!confirmed || !mounted) {
      return;
    }

    setState(() => _bulkSubmitting = true);
    var successCount = 0;
    final failures = <String>[];
    try {
      final repository = ref.read(resultsRepositoryProvider);
      for (final attempt in selectedAttempts) {
        try {
          await repository.forceSubmitAttempt(attempt.id);
          successCount += 1;
        } catch (error) {
          failures.add('${attempt.studentName}: ${readApiErrorMessage(error)}');
        }
      }
      ref.invalidate(teacherExamAttemptsProvider(widget.examId));
      ref.invalidate(liveExamMonitorProvider(widget.examId));
      if (!mounted) {
        return;
      }
      _clearSelection();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            failures.isEmpty
                ? '$successCount attempt(s) were force-submitted.'
                : '$successCount attempt(s) were force-submitted. ${failures.length} failed.',
          ),
        ),
      );
      if (failures.isNotEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(failures.take(2).join('  ')),
            duration: const Duration(seconds: 6),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _bulkSubmitting = false);
      }
    }
  }

  Future<void> _forceSubmitAttempt(TeacherExamAttemptModel attempt) async {
    final messenger = ScaffoldMessenger.of(context);
    if (!attempt.canForceSubmit) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            attempt.forceSubmitBlockReason ??
                'This attempt cannot be force-submitted right now.',
          ),
        ),
      );
      return;
    }
    final confirmed =
        await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Force submit this attempt?'),
            content: Text(
              'This will auto-submit ${attempt.studentName}\'s in-progress attempt and immediately update the live monitor state.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: const Text('Force submit'),
              ),
            ],
          ),
        ) ??
        false;
    if (!confirmed || !mounted) {
      return;
    }

    try {
      await ref.read(resultsRepositoryProvider).forceSubmitAttempt(attempt.id);
      ref.invalidate(teacherExamAttemptsProvider(widget.examId));
      ref.invalidate(liveExamMonitorProvider(widget.examId));
      if (!mounted) {
        return;
      }
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            '${attempt.studentName}\'s attempt was force-submitted.',
          ),
        ),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      messenger.showSnackBar(
        SnackBar(content: Text(readApiErrorMessage(error))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final attemptsValue = ref.watch(teacherExamAttemptsProvider(widget.examId));
    return AppDialogShell(
      shellRoute: AppRoutes.exams,
      shellTitle: 'Exams',
      title: 'Live attempt activity',
      subtitle:
          'Inspect all scoped attempts for this exam, with a quick filter for active and completed states.',
      eyebrow: 'Live exam monitor',
      fullPage: widget.fullPage,
      onClose: () => Navigator.of(context).pop(),
      primaryActionLabel: 'Done',
      onPrimaryAction: () => Navigator.of(context).pop(),
      secondaryActionLabel: 'Refresh',
      onSecondaryAction: () {
        ref.invalidate(teacherExamAttemptsProvider(widget.examId));
        ref.invalidate(liveExamMonitorProvider(widget.examId));
      },
      maxWidth: 980,
      maxHeight: 760,
      scrollable: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              for (final filter in const [
                ('all', 'All'),
                ('in_progress', 'In progress'),
                ('submitted', 'Submitted'),
                ('auto_submitted', 'Auto-submitted'),
                ('alerts', 'Alerts'),
                ('high_priority', 'High priority'),
                ('medium_priority', 'Medium priority'),
              ])
                ChoiceChip(
                  label: Text(filter.$2),
                  selected: _statusFilter == filter.$1,
                  onSelected: (_) => setState(() => _statusFilter = filter.$1),
                ),
            ],
          ),
          const SizedBox(height: 16),
          Expanded(
            child: attemptsValue.when(
              data: (items) {
                final filtered = _statusFilter == 'all'
                    ? items
                    : _statusFilter == 'high_priority'
                    ? items.where((item) => item.hasHighPriorityAlert).toList()
                    : _statusFilter == 'medium_priority'
                    ? items
                          .where((item) => item.hasMediumPriorityAlert)
                          .toList()
                    : _statusFilter == 'alerts'
                    ? items.where((item) => item.hasActiveAlerts).toList()
                    : items
                          .where((item) => item.status == _statusFilter)
                          .toList();
                final ordered = _sortAttemptsBySeverity(filtered);
                if (filtered.isEmpty) {
                  return const AppEmptyState(
                    title: 'No attempts match this filter',
                    message:
                        'Try a broader status filter or wait for more attempt activity.',
                  );
                }
                final eligibleCount = ordered.where(_isBulkSelectable).length;
                final highPriorityEligibleCount = ordered
                    .where(_isBulkSelectable)
                    .where((attempt) => attempt.hasHighPriorityAlert)
                    .length;
                final alertEligibleCount = ordered
                    .where(_isBulkSelectable)
                    .where((attempt) => attempt.hasActiveAlerts)
                    .length;
                final selectedAttempts = ordered
                    .where(
                      (attempt) => _selectedAttemptIds.contains(attempt.id),
                    )
                    .toList();
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AppCard(
                      backgroundColor: AppColors.surfaceMuted,
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${_selectedAttemptIds.length} selected • $eligibleCount eligible for bulk action',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                          const SizedBox(height: 10),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              TextButton(
                                onPressed: eligibleCount == 0
                                    ? null
                                    : () => _selectAllEligible(ordered),
                                child: const Text('Select eligible'),
                              ),
                              TextButton(
                                onPressed: highPriorityEligibleCount == 0
                                    ? null
                                    : () => _selectEligibleByPriority(
                                        ordered,
                                        minimumPriority: 3,
                                      ),
                                child: Text(
                                  'Select high priority ($highPriorityEligibleCount)',
                                ),
                              ),
                              TextButton(
                                onPressed: alertEligibleCount == 0
                                    ? null
                                    : () => _selectEligibleByPriority(
                                        ordered,
                                        minimumPriority: 1,
                                      ),
                                child: Text(
                                  'Select alert queue ($alertEligibleCount)',
                                ),
                              ),
                              TextButton(
                                onPressed: _selectedAttemptIds.isEmpty
                                    ? null
                                    : _clearSelection,
                                child: const Text('Clear'),
                              ),
                              FilledButton.tonal(
                                onPressed:
                                    _selectedAttemptIds.isEmpty ||
                                        _bulkSubmitting
                                    ? null
                                    : () => _bulkForceSubmit(ordered),
                                child: Text(
                                  _bulkSubmitting
                                      ? 'Submitting...'
                                      : 'Bulk force submit',
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    if (selectedAttempts.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      AppCard(
                        backgroundColor: AppColors.surfaceMuted,
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Selected attempt summary',
                              style: Theme.of(context).textTheme.labelLarge
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Review the students and alert state below before running the bulk action.',
                              style: Theme.of(context).textTheme.bodySmall
                                  ?.copyWith(color: AppColors.textSecondary),
                            ),
                            const SizedBox(height: 12),
                            Wrap(
                              spacing: 10,
                              runSpacing: 10,
                              children: selectedAttempts.take(6).map((attempt) {
                                return Container(
                                  width: 220,
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: AppColors.surface,
                                    borderRadius: BorderRadius.circular(14),
                                    border: Border.all(
                                      color: AppColors.border.withValues(
                                        alpha: 0.7,
                                      ),
                                    ),
                                  ),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        attempt.studentName,
                                        style: Theme.of(context)
                                            .textTheme
                                            .labelLarge
                                            ?.copyWith(
                                              fontWeight: FontWeight.w700,
                                            ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Attempt ${attempt.attemptNo} • ${attempt.status}',
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodySmall
                                            ?.copyWith(
                                              color: AppColors.textSecondary,
                                            ),
                                      ),
                                      const SizedBox(height: 8),
                                      Wrap(
                                        spacing: 6,
                                        runSpacing: 6,
                                        children: [
                                          ..._buildAlertBadges(attempt),
                                          if (attempt.alerts.isEmpty)
                                            AppBadge(
                                              label: 'No active alerts',
                                              backgroundColor:
                                                  AppColors.surfaceMuted,
                                              foregroundColor:
                                                  AppColors.textSecondary,
                                            ),
                                        ],
                                      ),
                                    ],
                                  ),
                                );
                              }).toList(),
                            ),
                            if (selectedAttempts.length > 6) ...[
                              const SizedBox(height: 10),
                              Text(
                                '+${selectedAttempts.length - 6} more selected attempt(s)',
                                style: Theme.of(context).textTheme.bodySmall
                                    ?.copyWith(color: AppColors.textSecondary),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    Expanded(
                      child: ListView.separated(
                        itemBuilder: (context, index) {
                          final attempt = ordered[index];
                          final isSelected = _selectedAttemptIds.contains(
                            attempt.id,
                          );
                          return AppCard(
                            backgroundColor: isSelected
                                ? AppColors.subtleAccent.withValues(alpha: 0.18)
                                : AppColors.surfaceMuted,
                            borderColor: isSelected
                                ? AppColors.accent.withValues(alpha: 0.36)
                                : null,
                            padding: const EdgeInsets.all(14),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Checkbox(
                                  value: isSelected,
                                  onChanged: !_isBulkSelectable(attempt)
                                      ? null
                                      : (value) => _toggleAttemptSelection(
                                          attempt,
                                          value ?? false,
                                        ),
                                ),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        attempt.studentName,
                                        style: Theme.of(context)
                                            .textTheme
                                            .titleSmall
                                            ?.copyWith(
                                              fontWeight: FontWeight.w700,
                                            ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        '${attempt.studentAdmissionNo} • Attempt ${attempt.attemptNo}',
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodySmall
                                            ?.copyWith(
                                              color: AppColors.textSecondary,
                                            ),
                                      ),
                                      const SizedBox(height: 10),
                                      Wrap(
                                        spacing: 8,
                                        runSpacing: 8,
                                        children: [
                                          ..._buildAlertBadges(attempt),
                                          _ExamMetaChip(
                                            label: 'Status',
                                            value: attempt.status,
                                          ),
                                          _ExamMetaChip(
                                            label: 'Answered',
                                            value: attempt.attemptedQuestions,
                                          ),
                                          _ExamMetaChip(
                                            label: 'Correct',
                                            value: attempt.correctAnswers,
                                          ),
                                          _ExamMetaChip(
                                            label: 'Wrong',
                                            value: attempt.incorrectAnswers,
                                          ),
                                          _ExamMetaChip(
                                            label: 'Skipped',
                                            value: attempt.skippedQuestions,
                                          ),
                                          _ExamMetaChip(
                                            label: 'Score',
                                            value: attempt.finalScore,
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 16),
                                SizedBox(
                                  width: 196,
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        attempt.startedAt == null
                                            ? 'Started: -'
                                            : 'Started: ${_formatDateTime(attempt.startedAt)}',
                                        style: Theme.of(
                                          context,
                                        ).textTheme.bodySmall,
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        attempt.submittedAt == null
                                            ? 'Submission pending'
                                            : 'Submitted: ${_formatDateTime(attempt.submittedAt)}',
                                        style: Theme.of(
                                          context,
                                        ).textTheme.bodySmall,
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        attempt.timeTakenSeconds == null
                                            ? 'Time: -'
                                            : 'Time: ${_formatDurationLabel(attempt.timeTakenSeconds)}',
                                        style: Theme.of(
                                          context,
                                        ).textTheme.bodySmall,
                                      ),
                                      if (attempt.hasActiveAlerts) ...[
                                        const SizedBox(height: 6),
                                        Text(
                                          attempt.alerts.first.message,
                                          style: Theme.of(context)
                                              .textTheme
                                              .bodySmall
                                              ?.copyWith(
                                                color: _alertColor(
                                                  attempt.alerts.first.severity,
                                                ),
                                                fontWeight: FontWeight.w700,
                                              ),
                                        ),
                                      ],
                                      if (attempt.status == 'in_progress' ||
                                          attempt.forceSubmitBlockReason !=
                                              null) ...[
                                        const SizedBox(height: 10),
                                        SizedBox(
                                          width: double.infinity,
                                          child: OutlinedButton(
                                            onPressed: !attempt.canForceSubmit
                                                ? null
                                                : () => _forceSubmitAttempt(
                                                    attempt,
                                                  ),
                                            child: const Text('Force submit'),
                                          ),
                                        ),
                                        if (attempt.forceSubmitBlockReason !=
                                            null) ...[
                                          const SizedBox(height: 6),
                                          Text(
                                            attempt.forceSubmitBlockReason!,
                                            style: Theme.of(context)
                                                .textTheme
                                                .bodySmall
                                                ?.copyWith(
                                                  color:
                                                      AppColors.textSecondary,
                                                ),
                                          ),
                                        ],
                                      ],
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                        separatorBuilder: (_, _) => const SizedBox(height: 10),
                        itemCount: ordered.length,
                      ),
                    ),
                  ],
                );
              },
              loading: () => const AppLoader(label: 'Loading exam attempts'),
              error: (error, _) =>
                  AppErrorState(message: readApiErrorMessage(error)),
            ),
          ),
        ],
      ),
    );
  }
}

class _MonitorMetricBar extends StatelessWidget {
  const _MonitorMetricBar({
    required this.label,
    required this.value,
    required this.percentage,
    required this.color,
  });

  final String label;
  final String value;
  final double percentage;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final normalized = (percentage / 100).clamp(0, 1).toDouble();
    return AppCard(
      backgroundColor: AppColors.surfaceMuted,
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: Theme.of(
              context,
            ).textTheme.labelLarge?.copyWith(color: AppColors.textSecondary),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              minHeight: 8,
              value: normalized,
              backgroundColor: AppColors.surfaceStrong,
              valueColor: AlwaysStoppedAnimation<Color>(color),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '${percentage.toStringAsFixed(1)}%',
            style: Theme.of(
              context,
            ).textTheme.bodySmall?.copyWith(color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }
}

class _ExamHeroCopy extends StatelessWidget {
  const _ExamHeroCopy({
    required this.eyebrow,
    required this.title,
    required this.description,
  });

  final String eyebrow;
  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    return Column(
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
          style: Theme.of(
            context,
          ).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: AppSpacing.sm),
        Text(
          description,
          style: Theme.of(
            context,
          ).textTheme.bodyLarge?.copyWith(color: AppColors.textSecondary),
        ),
      ],
    );
  }
}

class _ExamHeroHighlights extends StatelessWidget {
  const _ExamHeroHighlights({required this.items});

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

class _ExamMetricGrid extends StatelessWidget {
  const _ExamMetricGrid({required this.cards});

  final List<Widget> cards;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        const minCardWidth = 220.0;
        final totalSpacing = AppSpacing.md * 2;
        final canShowThree = width >= (minCardWidth * 3) + totalSpacing;
        final canShowTwo = width >= (minCardWidth * 2) + AppSpacing.md;
        final preferredCardWidth = canShowThree
            ? (width - totalSpacing) / 3
            : canShowTwo
            ? (width - AppSpacing.md) / 2
            : double.infinity;
        return Wrap(
          spacing: AppSpacing.md,
          runSpacing: AppSpacing.md,
          children: cards
              .map((card) => SizedBox(width: preferredCardWidth, child: card))
              .toList(),
        );
      },
    );
  }
}

class _ExamActionRail extends StatelessWidget {
  const _ExamActionRail({
    required this.exam,
    required this.canForceLive,
    required this.canCompleteExam,
    required this.canCancelExam,
    required this.canGenerateResults,
    required this.canCalculateRanks,
    required this.canPublishResults,
    required this.statusActionHint,
    required this.resultActionHint,
    required this.onPublishExam,
    required this.onEditDetails,
    required this.onPreview,
    required this.onManageAssignments,
    required this.onAddQuestion,
    required this.onSyncMarks,
    required this.onRefreshStatus,
    required this.onStartLive,
    required this.onMarkCompleted,
    required this.onCancelExam,
    required this.onGenerateResults,
    required this.onCalculateRanks,
    required this.onPublishResults,
  });

  final TeacherExamBuilderModel exam;
  final bool canForceLive;
  final bool canCompleteExam;
  final bool canCancelExam;
  final bool canGenerateResults;
  final bool canCalculateRanks;
  final bool canPublishResults;
  final String statusActionHint;
  final String resultActionHint;
  final VoidCallback onPublishExam;
  final VoidCallback onEditDetails;
  final VoidCallback onPreview;
  final VoidCallback onManageAssignments;
  final VoidCallback onAddQuestion;
  final VoidCallback onSyncMarks;
  final VoidCallback onRefreshStatus;
  final VoidCallback onStartLive;
  final VoidCallback onMarkCompleted;
  final VoidCallback onCancelExam;
  final VoidCallback onGenerateResults;
  final VoidCallback onCalculateRanks;
  final VoidCallback onPublishResults;

  @override
  Widget build(BuildContext context) {
    final setupIsPrimary = exam.status == 'draft' || exam.status == 'scheduled';
    final liveIsPrimary = exam.status == 'live';
    final resultsIsPrimary = exam.status == 'completed';
    final setupActions = [
      ActionButtonGroupItem(
        label: exam.examQuestions.isEmpty
            ? 'Add questions'
            : 'Manage questions',
        onPressed: onAddQuestion,
        isPrimary: setupIsPrimary && exam.examQuestions.isEmpty,
        icon: Icons.playlist_add_outlined,
      ),
      ActionButtonGroupItem(
        label: 'Publish exam',
        onPressed: onPublishExam,
        isPrimary: setupIsPrimary && exam.examQuestions.isNotEmpty,
      ),
      ActionButtonGroupItem(
        label: 'Edit details',
        onPressed: onEditDetails,
        icon: Icons.edit_outlined,
      ),
      ActionButtonGroupItem(
        label: 'Preview',
        onPressed: onPreview,
        icon: Icons.preview_outlined,
      ),
      ActionButtonGroupItem(
        label: 'Sync marks',
        onPressed: onSyncMarks,
        icon: Icons.sync_alt_rounded,
      ),
      ActionButtonGroupItem(
        label: 'Manage assignments',
        onPressed: onManageAssignments,
        icon: Icons.groups_outlined,
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _ExamActionSection(
          title: 'Setup',
          subtitle:
              'Configure the paper, audience, and linked content before you move the exam operationally.',
          items: setupActions,
          maxVisibleActions: 6,
          isEmphasized: setupIsPrimary,
        ),
        const SizedBox(height: AppSpacing.md),
        _ExamActionSection(
          title: 'Live control',
          subtitle: statusActionHint,
          items: [
            ActionButtonGroupItem(
              label: 'Refresh status',
              onPressed: onRefreshStatus,
              icon: Icons.refresh_rounded,
            ),
            ActionButtonGroupItem(
              label: 'Start live',
              onPressed: canForceLive ? onStartLive : null,
              disabledReason: canForceLive
                  ? null
                  : 'This exam can no longer be moved to live.',
              isPrimary: liveIsPrimary,
              icon: Icons.play_arrow_rounded,
            ),
            ActionButtonGroupItem(
              label: 'Mark complete',
              onPressed: canCompleteExam ? onMarkCompleted : null,
              disabledReason: canCompleteExam
                  ? null
                  : 'This exam is already completed or cancelled.',
              icon: Icons.task_alt_rounded,
            ),
          ],
          maxVisibleActions: 3,
          isEmphasized: liveIsPrimary,
          destructiveItem: ActionButtonGroupItem(
            label: 'Cancel exam',
            onPressed: canCancelExam ? onCancelExam : null,
            disabledReason: canCancelExam
                ? null
                : 'Cancelled exams cannot be cancelled again.',
            isDestructive: true,
            icon: Icons.cancel_outlined,
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        _ExamActionSection(
          title: 'Results',
          subtitle: resultActionHint,
          items: [
            ActionButtonGroupItem(
              label: 'Generate results',
              onPressed: canGenerateResults ? onGenerateResults : null,
              disabledReason: canGenerateResults
                  ? null
                  : 'Draft or cancelled exams cannot generate results.',
              isPrimary: resultsIsPrimary,
              icon: Icons.auto_graph_rounded,
            ),
            ActionButtonGroupItem(
              label: 'Calculate ranks',
              onPressed: canCalculateRanks ? onCalculateRanks : null,
              disabledReason: canCalculateRanks
                  ? null
                  : 'Draft or cancelled exams cannot calculate ranks.',
              icon: Icons.leaderboard_outlined,
            ),
            ActionButtonGroupItem(
              label: 'Publish results',
              onPressed: canPublishResults ? onPublishResults : null,
              disabledReason: canPublishResults
                  ? null
                  : 'Results can only be published after the exam is completed.',
              icon: Icons.publish_outlined,
            ),
          ],
          maxVisibleActions: 3,
          isEmphasized: resultsIsPrimary,
        ),
      ],
    );
  }
}

class _ExamActionSection extends StatelessWidget {
  const _ExamActionSection({
    required this.title,
    required this.subtitle,
    required this.items,
    this.maxVisibleActions,
    this.isEmphasized = false,
    this.destructiveItem,
  });

  final String title;
  final String subtitle;
  final List<ActionButtonGroupItem> items;
  final int? maxVisibleActions;
  final bool isEmphasized;
  final ActionButtonGroupItem? destructiveItem;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      backgroundColor: isEmphasized
          ? AppColors.subtleAccent.withValues(alpha: 0.38)
          : AppColors.surfaceMuted,
      borderColor: isEmphasized
          ? AppColors.primary.withValues(alpha: 0.16)
          : AppColors.border,
      child: Column(
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
            ).textTheme.bodySmall?.copyWith(color: AppColors.textSecondary),
          ),
          const SizedBox(height: AppSpacing.md),
          ActionButtonGroupComponent(
            items: items,
            maxVisibleActions: maxVisibleActions,
          ),
          if (destructiveItem != null) ...[
            const SizedBox(height: AppSpacing.md),
            const Divider(height: 1),
            const SizedBox(height: AppSpacing.md),
            ActionButtonGroupComponent(
              items: [destructiveItem!],
              maxVisibleActions: 1,
            ),
          ],
        ],
      ),
    );
  }
}

class _ExamEditorDialog extends StatefulWidget {
  const _ExamEditorDialog({
    required this.instituteId,
    required this.years,
    required this.programs,
    required this.cohorts,
    required this.subjects,
    this.fullPage = false,
    this.initialExam,
  });

  final String instituteId;
  final List<AcademicLookupOption> years;
  final List<AcademicLookupOption> programs;
  final List<AcademicLookupOption> cohorts;
  final List<AcademicLookupOption> subjects;
  final bool fullPage;
  final TeacherExamBuilderModel? initialExam;

  @override
  State<_ExamEditorDialog> createState() => _ExamEditorDialogState();
}

class _ExamEditorDialogState extends State<_ExamEditorDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _titleController;
  late final TextEditingController _codeController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _durationController;
  late final TextEditingController _maxAttemptsController;
  late final TextEditingController _passingMarksController;
  late final TextEditingController _startController;
  late final TextEditingController _endController;
  late final TextEditingController _instructionsController;
  late final TextEditingController _resultPublishAtController;
  late final TextEditingController _reviewAvailableFromController;
  late final TextEditingController _reviewAvailableUntilController;
  String? _academicYearId;
  String? _programId;
  String? _cohortId;
  String? _subjectId;
  String _examType = 'test';
  String _deliveryMode = 'online';
  String _timerMode = 'global';
  String _navigationMode = 'free_exam';
  String _attemptPolicy = 'single';
  String _resultPublishMode = 'after_review';
  String _reviewMode = 'attempted_only';
  String _securityMode = 'normal';
  bool _allowLateSubmit = false;
  bool _randomizeQuestions = false;
  bool _randomizeOptions = false;
  bool _showResultImmediately = false;
  bool _allowReviewAfterSubmit = true;
  bool _allowResume = true;
  bool _allowSectionSwitching = true;
  bool _allowReturnToPreviousSection = true;

  @override
  void initState() {
    super.initState();
    final exam = widget.initialExam;
    _titleController = TextEditingController(text: exam?.title ?? '');
    _codeController = TextEditingController(text: exam?.code ?? '');
    _descriptionController = TextEditingController(
      text: exam?.description ?? '',
    );
    _durationController = TextEditingController(
      text: exam?.durationMinutes.toString() ?? '30',
    );
    _maxAttemptsController = TextEditingController(
      text: (exam?.maxAttempts ?? 1).toString(),
    );
    _passingMarksController = TextEditingController(
      text: exam?.passingMarks ?? '0.00',
    );
    _startController = TextEditingController(
      text: exam?.startAt == null ? '' : formatDateTimeForInput(exam!.startAt!),
    );
    _endController = TextEditingController(
      text: exam?.endAt == null ? '' : formatDateTimeForInput(exam!.endAt!),
    );
    _instructionsController = TextEditingController(
      text: exam?.instructions ?? '',
    );
    _resultPublishAtController = TextEditingController(
      text: exam?.resultPublishAt == null
          ? ''
          : formatDateTimeForInput(exam!.resultPublishAt!),
    );
    _reviewAvailableFromController = TextEditingController(
      text: exam?.reviewAvailableFrom == null
          ? ''
          : formatDateTimeForInput(exam!.reviewAvailableFrom!),
    );
    _reviewAvailableUntilController = TextEditingController(
      text: exam?.reviewAvailableUntil == null
          ? ''
          : formatDateTimeForInput(exam!.reviewAvailableUntil!),
    );
    _academicYearId = exam?.academicYearId;
    _programId = exam?.programId;
    _cohortId = exam?.cohortId;
    _subjectId = exam?.subjectId;
    _examType = exam?.examType ?? 'test';
    _deliveryMode = exam?.deliveryMode ?? 'online';
    _timerMode = exam?.timerMode ?? 'global';
    _navigationMode = exam?.navigationMode ?? 'free_exam';
    _attemptPolicy = exam?.attemptPolicy ?? 'single';
    _resultPublishMode = exam?.resultPublishMode ?? 'after_review';
    _reviewMode = exam?.reviewMode ?? 'attempted_only';
    _securityMode = exam?.securityMode ?? 'normal';
    _allowLateSubmit = exam?.allowLateSubmit ?? false;
    _randomizeQuestions = exam?.randomizeQuestions ?? false;
    _randomizeOptions = exam?.randomizeOptions ?? false;
    _showResultImmediately = exam?.showResultImmediately ?? false;
    _allowReviewAfterSubmit = exam?.allowReviewAfterSubmit ?? true;
    _allowResume = exam?.allowResume ?? true;
    _allowSectionSwitching = exam?.allowSectionSwitching ?? true;
    _allowReturnToPreviousSection = exam?.allowReturnToPreviousSection ?? true;
  }

  @override
  void dispose() {
    _titleController.dispose();
    _codeController.dispose();
    _descriptionController.dispose();
    _durationController.dispose();
    _maxAttemptsController.dispose();
    _passingMarksController.dispose();
    _startController.dispose();
    _endController.dispose();
    _instructionsController.dispose();
    _resultPublishAtController.dispose();
    _reviewAvailableFromController.dispose();
    _reviewAvailableUntilController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final filteredCohorts = widget.cohorts
        .where((cohort) => _programId == null || cohort.programId == _programId)
        .toList();
    final filteredSubjects = widget.subjects
        .where(
          (subject) => _programId == null || subject.programId == _programId,
        )
        .toList();
    final isCompact = MediaQuery.sizeOf(context).width < 720;

    return AppDialogShell(
      shellRoute: AppRoutes.exams,
      shellTitle: 'Exams',
      title: widget.initialExam == null ? 'Create exam' : 'Edit exam',
      subtitle:
          'Build the paper in clear sections: basic details, schedule, marks, runtime settings, and audience alignment.',
      eyebrow: 'Teacher workflow',
      fullPage: widget.fullPage,
      onClose: () => Navigator.of(context).pop(),
      primaryActionLabel: widget.initialExam == null
          ? 'Create exam'
          : 'Save changes',
      onPrimaryAction: () {
        if (!_formKey.currentState!.validate()) {
          return;
        }
        if (_academicYearId == null || _programId == null) {
          return;
        }
        Navigator.of(context).pop(
          _ExamDialogResult(
            payload: {
              'institute': widget.instituteId,
              'academic_year': _academicYearId,
              'program': _programId,
              'cohort': _cohortId,
              'subject': _subjectId,
              'title': _titleController.text.trim(),
              'code': _codeController.text.trim(),
              'description': _descriptionController.text.trim(),
              'exam_type': _examType,
              'delivery_mode': _deliveryMode,
              'status': widget.initialExam?.status ?? 'draft',
              'duration_minutes': int.parse(_durationController.text.trim()),
              'total_marks': widget.initialExam?.totalMarks ?? '0.00',
              'passing_marks': _passingMarksController.text.trim(),
              'start_at': parseDateTimeInput(
                _startController.text,
              )?.toUtc().toIso8601String(),
              'end_at': parseDateTimeInput(
                _endController.text,
              )?.toUtc().toIso8601String(),
              'instructions': _instructionsController.text.trim(),
              'allow_late_submit': _allowLateSubmit,
              'randomize_questions': _randomizeQuestions,
              'randomize_options': _randomizeOptions,
              'show_result_immediately': _showResultImmediately,
              'allow_review_after_submit': _allowReviewAfterSubmit,
              'max_attempts': int.parse(_maxAttemptsController.text.trim()),
              'timer_mode': _timerMode,
              'navigation_mode': _navigationMode,
              'attempt_policy': _attemptPolicy,
              'result_publish_mode': _resultPublishMode,
              'review_mode': _reviewMode,
              'security_mode': _securityMode,
              'allow_resume': _allowResume,
              'allow_section_switching': _allowSectionSwitching,
              'allow_return_to_previous_section': _allowReturnToPreviousSection,
              'result_publish_at': parseDateTimeInput(
                _resultPublishAtController.text,
              )?.toUtc().toIso8601String(),
              'review_available_from': parseDateTimeInput(
                _reviewAvailableFromController.text,
              )?.toUtc().toIso8601String(),
              'review_available_until': parseDateTimeInput(
                _reviewAvailableUntilController.text,
              )?.toUtc().toIso8601String(),
              'is_active': widget.initialExam == null
                  ? true
                  : widget.initialExam!.status != 'cancelled',
              'metadata': const <String, dynamic>{},
            },
          ),
        );
      },
      maxWidth: 880,
      maxHeight: 760,
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AppCard(
              backgroundColor: AppColors.surfaceMuted,
              child: Wrap(
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.sm,
                children: [
                  _ExamMetaChip(label: 'Mode', value: _deliveryMode),
                  _ExamMetaChip(label: 'Type', value: _examType),
                  _ExamMetaChip(
                    label: 'Timer',
                    value: _runtimePolicyLabel(_timerMode),
                  ),
                  _ExamMetaChip(
                    label: 'Navigation',
                    value: _runtimePolicyLabel(_navigationMode),
                  ),
                  _ExamMetaChip(
                    label: 'Status',
                    value: widget.initialExam?.status ?? 'draft',
                  ),
                  _ExamMetaChip(
                    label: 'Attempts',
                    value: _maxAttemptsController.text.trim().isEmpty
                        ? (widget.initialExam?.maxAttempts ?? 1)
                        : _maxAttemptsController.text.trim(),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            _BuilderPanel(
              title: 'Basic details',
              subtitle:
                  'Set the title, code, and short context teachers will recognize immediately.',
              child: Column(
                children: [
                  if (isCompact) ...[
                    TextFormField(
                      controller: _titleController,
                      decoration: const InputDecoration(labelText: 'Title'),
                      validator: _requiredValidator,
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _codeController,
                      decoration: const InputDecoration(labelText: 'Code'),
                      validator: _requiredValidator,
                    ),
                  ] else
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _titleController,
                            decoration: const InputDecoration(
                              labelText: 'Title',
                            ),
                            validator: _requiredValidator,
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: TextFormField(
                            controller: _codeController,
                            decoration: const InputDecoration(
                              labelText: 'Code',
                            ),
                            validator: _requiredValidator,
                          ),
                        ),
                      ],
                    ),
                  const SizedBox(height: 14),
                  TextFormField(
                    controller: _descriptionController,
                    maxLines: 2,
                    decoration: const InputDecoration(labelText: 'Description'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            _BuilderPanel(
              title: 'Audience and academic scope',
              subtitle:
                  'Anchor this exam to the academic structure before linking questions and scheduling attempts.',
              child: Column(
                children: [
                  if (isCompact) ...[
                    DropdownButtonFormField<String>(
                      initialValue: _academicYearId,
                      decoration: const InputDecoration(
                        labelText: 'Academic year',
                      ),
                      items: widget.years
                          .map(
                            (item) => DropdownMenuItem(
                              value: item.id,
                              child: Text(item.name),
                            ),
                          )
                          .toList(),
                      onChanged: (value) {
                        setState(() => _academicYearId = value);
                      },
                    ),
                    const SizedBox(height: 14),
                    DropdownButtonFormField<String>(
                      initialValue: _programId,
                      decoration: const InputDecoration(labelText: 'Program'),
                      items: widget.programs
                          .map(
                            (item) => DropdownMenuItem(
                              value: item.id,
                              child: Text(item.name),
                            ),
                          )
                          .toList(),
                      onChanged: (value) {
                        setState(() {
                          _programId = value;
                          _cohortId = null;
                          _subjectId = null;
                        });
                      },
                    ),
                    const SizedBox(height: 14),
                  ] else
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: _academicYearId,
                            decoration: const InputDecoration(
                              labelText: 'Academic year',
                            ),
                            items: widget.years
                                .map(
                                  (item) => DropdownMenuItem(
                                    value: item.id,
                                    child: Text(item.name),
                                  ),
                                )
                                .toList(),
                            onChanged: (value) {
                              setState(() => _academicYearId = value);
                            },
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: _programId,
                            decoration: const InputDecoration(
                              labelText: 'Program',
                            ),
                            items: widget.programs
                                .map(
                                  (item) => DropdownMenuItem(
                                    value: item.id,
                                    child: Text(item.name),
                                  ),
                                )
                                .toList(),
                            onChanged: (value) {
                              setState(() {
                                _programId = value;
                                _cohortId = null;
                                _subjectId = null;
                              });
                            },
                          ),
                        ),
                      ],
                    ),
                  if (isCompact) ...[
                    DropdownButtonFormField<String?>(
                      initialValue: _cohortId,
                      decoration: const InputDecoration(labelText: 'Cohort'),
                      items: [
                        const DropdownMenuItem<String?>(
                          value: null,
                          child: Text('No cohort'),
                        ),
                        ...filteredCohorts.map(
                          (item) => DropdownMenuItem<String?>(
                            value: item.id,
                            child: Text(item.name),
                          ),
                        ),
                      ],
                      onChanged: (value) {
                        setState(() => _cohortId = value);
                      },
                    ),
                    const SizedBox(height: 14),
                    DropdownButtonFormField<String?>(
                      initialValue: _subjectId,
                      decoration: const InputDecoration(labelText: 'Subject'),
                      items: [
                        const DropdownMenuItem<String?>(
                          value: null,
                          child: Text('No subject'),
                        ),
                        ...filteredSubjects.map(
                          (item) => DropdownMenuItem<String?>(
                            value: item.id,
                            child: Text(item.name),
                          ),
                        ),
                      ],
                      onChanged: (value) {
                        setState(() => _subjectId = value);
                      },
                    ),
                  ] else ...[
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String?>(
                            initialValue: _cohortId,
                            decoration: const InputDecoration(
                              labelText: 'Cohort',
                            ),
                            items: [
                              const DropdownMenuItem<String?>(
                                value: null,
                                child: Text('No cohort'),
                              ),
                              ...filteredCohorts.map(
                                (item) => DropdownMenuItem<String?>(
                                  value: item.id,
                                  child: Text(item.name),
                                ),
                              ),
                            ],
                            onChanged: (value) {
                              setState(() => _cohortId = value);
                            },
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: DropdownButtonFormField<String?>(
                            initialValue: _subjectId,
                            decoration: const InputDecoration(
                              labelText: 'Subject',
                            ),
                            items: [
                              const DropdownMenuItem<String?>(
                                value: null,
                                child: Text('No subject'),
                              ),
                              ...filteredSubjects.map(
                                (item) => DropdownMenuItem<String?>(
                                  value: item.id,
                                  child: Text(item.name),
                                ),
                              ),
                            ],
                            onChanged: (value) {
                              setState(() => _subjectId = value);
                            },
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            AppCard(
              backgroundColor: AppColors.surfaceMuted,
              child: Text(
                'Audience assignment is completed after save from the main exam workspace, where you can target cohorts or selected students without leaving the builder flow.',
                style: Theme.of(
                  context,
                ).textTheme.bodySmall?.copyWith(color: AppColors.textSecondary),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            _BuilderPanel(
              title: 'Schedule and marks',
              subtitle:
                  'Define the exam window, type, duration, attempts, and scoring thresholds before publishing.',
              child: Column(
                children: [
                  if (isCompact) ...[
                    DropdownButtonFormField<String>(
                      initialValue: _examType,
                      decoration: const InputDecoration(labelText: 'Exam type'),
                      items: const [
                        DropdownMenuItem(
                          value: 'practice',
                          child: Text('Practice'),
                        ),
                        DropdownMenuItem(value: 'quiz', child: Text('Quiz')),
                        DropdownMenuItem(value: 'test', child: Text('Test')),
                        DropdownMenuItem(
                          value: 'assessment',
                          child: Text('Assessment'),
                        ),
                        DropdownMenuItem(
                          value: 'mock_exam',
                          child: Text('Mock exam'),
                        ),
                        DropdownMenuItem(
                          value: 'final_exam',
                          child: Text('Final exam'),
                        ),
                      ],
                      onChanged: (value) {
                        if (value != null) {
                          setState(() => _examType = value);
                        }
                      },
                    ),
                    const SizedBox(height: 14),
                    DropdownButtonFormField<String>(
                      initialValue: _deliveryMode,
                      decoration: const InputDecoration(
                        labelText: 'Delivery mode',
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'online',
                          child: Text('Online'),
                        ),
                        DropdownMenuItem(
                          value: 'offline',
                          child: Text('Offline'),
                        ),
                        DropdownMenuItem(
                          value: 'hybrid',
                          child: Text('Hybrid'),
                        ),
                      ],
                      onChanged: (value) {
                        if (value != null) {
                          setState(() => _deliveryMode = value);
                        }
                      },
                    ),
                    const SizedBox(height: 14),
                  ] else
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: _examType,
                            decoration: const InputDecoration(
                              labelText: 'Exam type',
                            ),
                            items: const [
                              DropdownMenuItem(
                                value: 'practice',
                                child: Text('Practice'),
                              ),
                              DropdownMenuItem(
                                value: 'quiz',
                                child: Text('Quiz'),
                              ),
                              DropdownMenuItem(
                                value: 'test',
                                child: Text('Test'),
                              ),
                              DropdownMenuItem(
                                value: 'assessment',
                                child: Text('Assessment'),
                              ),
                              DropdownMenuItem(
                                value: 'mock_exam',
                                child: Text('Mock exam'),
                              ),
                              DropdownMenuItem(
                                value: 'final_exam',
                                child: Text('Final exam'),
                              ),
                            ],
                            onChanged: (value) {
                              if (value != null) {
                                setState(() => _examType = value);
                              }
                            },
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: _deliveryMode,
                            decoration: const InputDecoration(
                              labelText: 'Delivery mode',
                            ),
                            items: const [
                              DropdownMenuItem(
                                value: 'online',
                                child: Text('Online'),
                              ),
                              DropdownMenuItem(
                                value: 'offline',
                                child: Text('Offline'),
                              ),
                              DropdownMenuItem(
                                value: 'hybrid',
                                child: Text('Hybrid'),
                              ),
                            ],
                            onChanged: (value) {
                              if (value != null) {
                                setState(() => _deliveryMode = value);
                              }
                            },
                          ),
                        ),
                      ],
                    ),
                  if (isCompact) ...[
                    TextFormField(
                      controller: _durationController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Duration (minutes)',
                      ),
                      validator: _requiredValidator,
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _maxAttemptsController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Max attempts',
                      ),
                      validator: _requiredValidator,
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _passingMarksController,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      decoration: const InputDecoration(
                        labelText: 'Passing marks',
                      ),
                      validator: _requiredValidator,
                    ),
                  ] else ...[
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _durationController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'Duration (minutes)',
                            ),
                            validator: _requiredValidator,
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: TextFormField(
                            controller: _maxAttemptsController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'Max attempts',
                            ),
                            validator: _requiredValidator,
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: TextFormField(
                            controller: _passingMarksController,
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                            decoration: const InputDecoration(
                              labelText: 'Passing marks',
                            ),
                            validator: _requiredValidator,
                          ),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 14),
                  if (isCompact) ...[
                    TextFormField(
                      controller: _startController,
                      readOnly: true,
                      decoration: const InputDecoration(
                        labelText: 'Start at',
                        suffixIcon: Icon(Icons.calendar_today_outlined),
                      ),
                      onTap: () async {
                        final picked = await pickLocalDateTime(
                          context,
                          initialDateTime: parseDateTimeInput(
                            _startController.text,
                          ),
                        );
                        if (picked != null) {
                          _startController.text = formatDateTimeForInput(
                            picked,
                          );
                        }
                      },
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _endController,
                      readOnly: true,
                      decoration: const InputDecoration(
                        labelText: 'End at',
                        suffixIcon: Icon(Icons.event_available_outlined),
                      ),
                      onTap: () async {
                        final picked = await pickLocalDateTime(
                          context,
                          initialDateTime: parseDateTimeInput(
                            _endController.text,
                          ),
                        );
                        if (picked != null) {
                          _endController.text = formatDateTimeForInput(picked);
                        }
                      },
                    ),
                  ] else
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _startController,
                            readOnly: true,
                            decoration: const InputDecoration(
                              labelText: 'Start at',
                              suffixIcon: Icon(Icons.calendar_today_outlined),
                            ),
                            onTap: () async {
                              final picked = await pickLocalDateTime(
                                context,
                                initialDateTime: parseDateTimeInput(
                                  _startController.text,
                                ),
                              );
                              if (picked != null) {
                                _startController.text = formatDateTimeForInput(
                                  picked,
                                );
                              }
                            },
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: TextFormField(
                            controller: _endController,
                            readOnly: true,
                            decoration: const InputDecoration(
                              labelText: 'End at',
                              suffixIcon: Icon(Icons.event_available_outlined),
                            ),
                            onTap: () async {
                              final picked = await pickLocalDateTime(
                                context,
                                initialDateTime: parseDateTimeInput(
                                  _endController.text,
                                ),
                              );
                              if (picked != null) {
                                _endController.text = formatDateTimeForInput(
                                  picked,
                                );
                              }
                            },
                          ),
                        ),
                      ],
                    ),
                  const SizedBox(height: 14),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      localTimezoneHelpText(),
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            _BuilderPanel(
              title: 'Student instructions',
              subtitle:
                  'Add guidance about timing, submission, and how students should approach the exam.',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextFormField(
                    controller: _instructionsController,
                    maxLines: 6,
                    decoration: const InputDecoration(
                      labelText: 'Instructions',
                      helperText:
                          'Write student-facing guidance about timing, submission rules, and navigation behavior.',
                    ),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: [
                      OutlinedButton(
                        onPressed: () {
                          if (_instructionsController.text.trim().isEmpty) {
                            _instructionsController.text =
                                _defaultExamInstructionTemplate();
                            setState(() {});
                          }
                        },
                        child: const Text('Use default template'),
                      ),
                      OutlinedButton(
                        onPressed: () {
                          showDialog<void>(
                            context: context,
                            builder: (context) => AlertDialog(
                              title: const Text('Instruction preview'),
                              content: SingleChildScrollView(
                                child: Text(
                                  _instructionsController.text.trim().isEmpty
                                      ? _defaultExamInstructionTemplate()
                                      : _instructionsController.text.trim(),
                                ),
                              ),
                              actions: [
                                TextButton(
                                  onPressed: () => Navigator.of(context).pop(),
                                  child: const Text('Close'),
                                ),
                              ],
                            ),
                          );
                        },
                        child: const Text('Preview as student'),
                      ),
                    ],
                  ),
                  if (_instructionsController.text.trim().isEmpty) ...[
                    const SizedBox(height: 10),
                    Text(
                      'Instruction quality warning: this exam has no student-facing guidance yet.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: const Color(0xFFB45309),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            _BuilderPanel(
              title: 'Timer and runtime settings',
              subtitle:
                  'Configure the actual runtime contract teachers want students to experience, including timing, navigation, attempts, visibility, and security.',
              child: Column(
                children: [
                  if (isCompact) ...[
                    DropdownButtonFormField<String>(
                      initialValue: _timerMode,
                      decoration: const InputDecoration(
                        labelText: 'Timer mode',
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'global',
                          child: Text('Global timer'),
                        ),
                        DropdownMenuItem(
                          value: 'section',
                          child: Text('Section timer'),
                        ),
                        DropdownMenuItem(
                          value: 'hybrid',
                          child: Text('Hybrid timer'),
                        ),
                      ],
                      onChanged: (value) {
                        if (value != null) {
                          setState(() => _timerMode = value);
                        }
                      },
                    ),
                    const SizedBox(height: 14),
                    DropdownButtonFormField<String>(
                      initialValue: _navigationMode,
                      decoration: const InputDecoration(
                        labelText: 'Navigation mode',
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'free_exam',
                          child: Text('Free across exam'),
                        ),
                        DropdownMenuItem(
                          value: 'free_section',
                          child: Text('Free within section'),
                        ),
                        DropdownMenuItem(
                          value: 'sequential',
                          child: Text('Sequential'),
                        ),
                        DropdownMenuItem(
                          value: 'hybrid',
                          child: Text('Hybrid'),
                        ),
                      ],
                      onChanged: (value) {
                        if (value != null) {
                          setState(() => _navigationMode = value);
                        }
                      },
                    ),
                    const SizedBox(height: 14),
                    DropdownButtonFormField<String>(
                      initialValue: _attemptPolicy,
                      decoration: const InputDecoration(
                        labelText: 'Attempt policy',
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'single',
                          child: Text('Single attempt'),
                        ),
                        DropdownMenuItem(
                          value: 'latest',
                          child: Text('Latest attempt counted'),
                        ),
                        DropdownMenuItem(
                          value: 'best',
                          child: Text('Best attempt counted'),
                        ),
                        DropdownMenuItem(
                          value: 'unlimited_practice',
                          child: Text('Unlimited practice'),
                        ),
                      ],
                      onChanged: (value) {
                        if (value != null) {
                          setState(() => _attemptPolicy = value);
                        }
                      },
                    ),
                    const SizedBox(height: 14),
                    DropdownButtonFormField<String>(
                      initialValue: _securityMode,
                      decoration: const InputDecoration(
                        labelText: 'Security mode',
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'normal',
                          child: Text('Normal'),
                        ),
                        DropdownMenuItem(
                          value: 'focus',
                          child: Text('Focus mode'),
                        ),
                        DropdownMenuItem(
                          value: 'fullscreen',
                          child: Text('Fullscreen required'),
                        ),
                        DropdownMenuItem(
                          value: 'violation_limited',
                          child: Text('Violation limited'),
                        ),
                        DropdownMenuItem(
                          value: 'proctored',
                          child: Text('Proctored'),
                        ),
                      ],
                      onChanged: (value) {
                        if (value != null) {
                          setState(() => _securityMode = value);
                        }
                      },
                    ),
                  ] else
                    Column(
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: DropdownButtonFormField<String>(
                                initialValue: _timerMode,
                                decoration: const InputDecoration(
                                  labelText: 'Timer mode',
                                ),
                                items: const [
                                  DropdownMenuItem(
                                    value: 'global',
                                    child: Text('Global timer'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'section',
                                    child: Text('Section timer'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'hybrid',
                                    child: Text('Hybrid timer'),
                                  ),
                                ],
                                onChanged: (value) {
                                  if (value != null) {
                                    setState(() => _timerMode = value);
                                  }
                                },
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: DropdownButtonFormField<String>(
                                initialValue: _navigationMode,
                                decoration: const InputDecoration(
                                  labelText: 'Navigation mode',
                                ),
                                items: const [
                                  DropdownMenuItem(
                                    value: 'free_exam',
                                    child: Text('Free across exam'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'free_section',
                                    child: Text('Free within section'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'sequential',
                                    child: Text('Sequential'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'hybrid',
                                    child: Text('Hybrid'),
                                  ),
                                ],
                                onChanged: (value) {
                                  if (value != null) {
                                    setState(() => _navigationMode = value);
                                  }
                                },
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        Row(
                          children: [
                            Expanded(
                              child: DropdownButtonFormField<String>(
                                initialValue: _attemptPolicy,
                                decoration: const InputDecoration(
                                  labelText: 'Attempt policy',
                                ),
                                items: const [
                                  DropdownMenuItem(
                                    value: 'single',
                                    child: Text('Single attempt'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'latest',
                                    child: Text('Latest attempt counted'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'best',
                                    child: Text('Best attempt counted'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'unlimited_practice',
                                    child: Text('Unlimited practice'),
                                  ),
                                ],
                                onChanged: (value) {
                                  if (value != null) {
                                    setState(() => _attemptPolicy = value);
                                  }
                                },
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: DropdownButtonFormField<String>(
                                initialValue: _securityMode,
                                decoration: const InputDecoration(
                                  labelText: 'Security mode',
                                ),
                                items: const [
                                  DropdownMenuItem(
                                    value: 'normal',
                                    child: Text('Normal'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'focus',
                                    child: Text('Focus mode'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'fullscreen',
                                    child: Text('Fullscreen required'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'violation_limited',
                                    child: Text('Violation limited'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'proctored',
                                    child: Text('Proctored'),
                                  ),
                                ],
                                onChanged: (value) {
                                  if (value != null) {
                                    setState(() => _securityMode = value);
                                  }
                                },
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  const SizedBox(height: 14),
                  if (isCompact) ...[
                    DropdownButtonFormField<String>(
                      initialValue: _resultPublishMode,
                      decoration: const InputDecoration(
                        labelText: 'Result publish mode',
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'immediate',
                          child: Text('Immediate'),
                        ),
                        DropdownMenuItem(
                          value: 'scheduled',
                          child: Text('Scheduled'),
                        ),
                        DropdownMenuItem(
                          value: 'after_review',
                          child: Text('After review'),
                        ),
                      ],
                      onChanged: (value) {
                        if (value != null) {
                          setState(() => _resultPublishMode = value);
                        }
                      },
                    ),
                    const SizedBox(height: 14),
                    DropdownButtonFormField<String>(
                      initialValue: _reviewMode,
                      decoration: const InputDecoration(
                        labelText: 'Review mode',
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'none',
                          child: Text('No review'),
                        ),
                        DropdownMenuItem(
                          value: 'attempted_only',
                          child: Text('Attempted only'),
                        ),
                        DropdownMenuItem(
                          value: 'all_questions',
                          child: Text('All questions'),
                        ),
                        DropdownMenuItem(
                          value: 'solution_review',
                          child: Text('Solution review'),
                        ),
                      ],
                      onChanged: (value) {
                        if (value != null) {
                          setState(() => _reviewMode = value);
                        }
                      },
                    ),
                  ] else
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: _resultPublishMode,
                            decoration: const InputDecoration(
                              labelText: 'Result publish mode',
                            ),
                            items: const [
                              DropdownMenuItem(
                                value: 'immediate',
                                child: Text('Immediate'),
                              ),
                              DropdownMenuItem(
                                value: 'scheduled',
                                child: Text('Scheduled'),
                              ),
                              DropdownMenuItem(
                                value: 'after_review',
                                child: Text('After review'),
                              ),
                            ],
                            onChanged: (value) {
                              if (value != null) {
                                setState(() => _resultPublishMode = value);
                              }
                            },
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: _reviewMode,
                            decoration: const InputDecoration(
                              labelText: 'Review mode',
                            ),
                            items: const [
                              DropdownMenuItem(
                                value: 'none',
                                child: Text('No review'),
                              ),
                              DropdownMenuItem(
                                value: 'attempted_only',
                                child: Text('Attempted only'),
                              ),
                              DropdownMenuItem(
                                value: 'all_questions',
                                child: Text('All questions'),
                              ),
                              DropdownMenuItem(
                                value: 'solution_review',
                                child: Text('Solution review'),
                              ),
                            ],
                            onChanged: (value) {
                              if (value != null) {
                                setState(() => _reviewMode = value);
                              }
                            },
                          ),
                        ),
                      ],
                    ),
                  const SizedBox(height: 14),
                  if (isCompact) ...[
                    TextFormField(
                      controller: _resultPublishAtController,
                      readOnly: true,
                      decoration: const InputDecoration(
                        labelText: 'Result publish at',
                        suffixIcon: Icon(Icons.schedule_send_outlined),
                      ),
                      onTap: () async {
                        final picked = await pickLocalDateTime(
                          context,
                          initialDateTime: parseDateTimeInput(
                            _resultPublishAtController.text,
                          ),
                        );
                        if (picked != null) {
                          _resultPublishAtController.text =
                              formatDateTimeForInput(picked);
                        }
                      },
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _reviewAvailableFromController,
                      readOnly: true,
                      decoration: const InputDecoration(
                        labelText: 'Review available from',
                        suffixIcon: Icon(Icons.visibility_outlined),
                      ),
                      onTap: () async {
                        final picked = await pickLocalDateTime(
                          context,
                          initialDateTime: parseDateTimeInput(
                            _reviewAvailableFromController.text,
                          ),
                        );
                        if (picked != null) {
                          _reviewAvailableFromController.text =
                              formatDateTimeForInput(picked);
                        }
                      },
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _reviewAvailableUntilController,
                      readOnly: true,
                      decoration: const InputDecoration(
                        labelText: 'Review available until',
                        suffixIcon: Icon(Icons.event_busy_outlined),
                      ),
                      onTap: () async {
                        final picked = await pickLocalDateTime(
                          context,
                          initialDateTime: parseDateTimeInput(
                            _reviewAvailableUntilController.text,
                          ),
                        );
                        if (picked != null) {
                          _reviewAvailableUntilController.text =
                              formatDateTimeForInput(picked);
                        }
                      },
                    ),
                  ] else
                    Column(
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                controller: _resultPublishAtController,
                                readOnly: true,
                                decoration: const InputDecoration(
                                  labelText: 'Result publish at',
                                  suffixIcon: Icon(
                                    Icons.schedule_send_outlined,
                                  ),
                                ),
                                onTap: () async {
                                  final picked = await pickLocalDateTime(
                                    context,
                                    initialDateTime: parseDateTimeInput(
                                      _resultPublishAtController.text,
                                    ),
                                  );
                                  if (picked != null) {
                                    _resultPublishAtController.text =
                                        formatDateTimeForInput(picked);
                                  }
                                },
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: TextFormField(
                                controller: _reviewAvailableFromController,
                                readOnly: true,
                                decoration: const InputDecoration(
                                  labelText: 'Review available from',
                                  suffixIcon: Icon(Icons.visibility_outlined),
                                ),
                                onTap: () async {
                                  final picked = await pickLocalDateTime(
                                    context,
                                    initialDateTime: parseDateTimeInput(
                                      _reviewAvailableFromController.text,
                                    ),
                                  );
                                  if (picked != null) {
                                    _reviewAvailableFromController.text =
                                        formatDateTimeForInput(picked);
                                  }
                                },
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        TextFormField(
                          controller: _reviewAvailableUntilController,
                          readOnly: true,
                          decoration: const InputDecoration(
                            labelText: 'Review available until',
                            suffixIcon: Icon(Icons.event_busy_outlined),
                          ),
                          onTap: () async {
                            final picked = await pickLocalDateTime(
                              context,
                              initialDateTime: parseDateTimeInput(
                                _reviewAvailableUntilController.text,
                              ),
                            );
                            if (picked != null) {
                              _reviewAvailableUntilController.text =
                                  formatDateTimeForInput(picked);
                            }
                          },
                        ),
                      ],
                    ),
                  const SizedBox(height: 14),
                  SwitchListTile(
                    value: _allowLateSubmit,
                    title: const Text('Allow late submit'),
                    contentPadding: EdgeInsets.zero,
                    onChanged: (value) {
                      setState(() => _allowLateSubmit = value);
                    },
                  ),
                  SwitchListTile(
                    value: _randomizeQuestions,
                    title: const Text('Randomize questions'),
                    contentPadding: EdgeInsets.zero,
                    onChanged: (value) {
                      setState(() => _randomizeQuestions = value);
                    },
                  ),
                  SwitchListTile(
                    value: _randomizeOptions,
                    title: const Text('Randomize options'),
                    contentPadding: EdgeInsets.zero,
                    onChanged: (value) {
                      setState(() => _randomizeOptions = value);
                    },
                  ),
                  SwitchListTile(
                    value: _showResultImmediately,
                    title: const Text('Show result immediately'),
                    contentPadding: EdgeInsets.zero,
                    onChanged: (value) {
                      setState(() => _showResultImmediately = value);
                    },
                  ),
                  SwitchListTile(
                    value: _allowReviewAfterSubmit,
                    title: const Text('Allow review after submit'),
                    contentPadding: EdgeInsets.zero,
                    onChanged: (value) {
                      setState(() => _allowReviewAfterSubmit = value);
                    },
                  ),
                  SwitchListTile(
                    value: _allowResume,
                    title: const Text('Allow resume'),
                    contentPadding: EdgeInsets.zero,
                    onChanged: (value) {
                      setState(() => _allowResume = value);
                    },
                  ),
                  SwitchListTile(
                    value: _allowSectionSwitching,
                    title: const Text('Allow section switching'),
                    contentPadding: EdgeInsets.zero,
                    onChanged: (value) {
                      setState(() => _allowSectionSwitching = value);
                    },
                  ),
                  SwitchListTile(
                    value: _allowReturnToPreviousSection,
                    title: const Text('Allow return to previous section'),
                    contentPadding: EdgeInsets.zero,
                    onChanged: (value) {
                      setState(() => _allowReturnToPreviousSection = value);
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String? _requiredValidator(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'This field is required.';
    }
    return null;
  }
}

class _ExamQuestionDialog extends StatefulWidget {
  const _ExamQuestionDialog({
    required this.exam,
    required this.availableQuestions,
    required this.sections,
    this.initialLink,
  });

  final TeacherExamBuilderModel exam;
  final List<TeacherQuestionModel> availableQuestions;
  final List<TeacherExamSectionModel> sections;
  final TeacherExamQuestionLinkModel? initialLink;

  @override
  State<_ExamQuestionDialog> createState() => _ExamQuestionDialogState();
}

class _BulkExamQuestionDialog extends StatefulWidget {
  const _BulkExamQuestionDialog({
    required this.exam,
    required this.availableQuestions,
    required this.sections,
    this.fullPage = false,
  });

  final TeacherExamBuilderModel exam;
  final List<TeacherQuestionModel> availableQuestions;
  final List<TeacherExamSectionModel> sections;
  final bool fullPage;

  @override
  State<_BulkExamQuestionDialog> createState() =>
      _BulkExamQuestionDialogState();
}

class _BulkExamQuestionDialogState extends State<_BulkExamQuestionDialog> {
  late final TextEditingController _searchController;
  final Set<String> _selectedIds = <String>{};
  String? _difficulty;
  String? _selectedSectionId;
  bool _missingExplanationOnly = false;

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<TeacherQuestionModel> get _filteredQuestions {
    final linkedIds = widget.exam.examQuestions
        .map((item) => item.questionId)
        .toSet();
    final query = _searchController.text.trim().toLowerCase();
    return widget.availableQuestions.where((question) {
      if (linkedIds.contains(question.id)) {
        return false;
      }
      if (_difficulty != null && question.difficultyLevel != _difficulty) {
        return false;
      }
      if (_missingExplanationOnly && question.hasExplanation) {
        return false;
      }
      if (query.isEmpty) {
        return true;
      }
      return question.questionText.toLowerCase().contains(query) ||
          question.explanation.toLowerCase().contains(query);
    }).toList();
  }

  String get _selectedMarksTotal {
    double total = 0;
    for (final question in widget.availableQuestions) {
      if (_selectedIds.contains(question.id)) {
        total += double.tryParse(question.defaultMarks) ?? 0;
      }
    }
    return total.toStringAsFixed(2);
  }

  @override
  Widget build(BuildContext context) {
    final filteredQuestions = _filteredQuestions;
    final isCompact = MediaQuery.sizeOf(context).width < 720;
    return AppDialogShell(
      shellRoute: AppRoutes.exams,
      shellTitle: 'Exams',
      title: 'Add questions in bulk',
      subtitle:
          'Search the question bank, filter the list, and add multiple questions without leaving the builder.',
      eyebrow: 'Teacher productivity',
      fullPage: widget.fullPage,
      onClose: () => Navigator.of(context).pop(),
      scrollable: false,
      primaryActionLabel: 'Add selected',
      onPrimaryAction: _selectedIds.isEmpty
          ? null
          : () {
              final selectedQuestions = widget.availableQuestions
                  .where((question) => _selectedIds.contains(question.id))
                  .toList();
              final startOrder = widget.exam.examQuestions.length + 1;
              final payloads = List<Map<String, dynamic>>.generate(
                selectedQuestions.length,
                (index) => {
                  'exam': widget.exam.id,
                  'question': selectedQuestions[index].id,
                  'section': _selectedSectionId,
                  'question_order': startOrder + index,
                  'marks': null,
                  'negative_marks': null,
                  'is_mandatory': true,
                  'is_active': true,
                },
              );
              Navigator.of(
                context,
              ).pop(_BulkExamQuestionDialogResult(payloads: payloads));
            },
      maxWidth: 980,
      maxHeight: 760,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _BuilderPanel(
            title: 'Question bank filters',
            subtitle:
                'Narrow the list quickly, choose a target section, and build the paper without leaving this workflow.',
            child: Column(
              children: [
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    SizedBox(
                      width: isCompact ? double.infinity : 320,
                      child: AppTextField(
                        controller: _searchController,
                        label: 'Search questions',
                        hint: 'Find by question text or explanation',
                        onChanged: (_) => setState(() {}),
                      ),
                    ),
                    SizedBox(
                      width: isCompact ? double.infinity : 220,
                      child: DropdownButtonFormField<String?>(
                        initialValue: _difficulty,
                        decoration: const InputDecoration(
                          labelText: 'Difficulty',
                        ),
                        items: const [
                          DropdownMenuItem<String?>(
                            value: null,
                            child: Text('All levels'),
                          ),
                          DropdownMenuItem<String?>(
                            value: 'foundation',
                            child: Text('Foundation'),
                          ),
                          DropdownMenuItem<String?>(
                            value: 'intermediate',
                            child: Text('Intermediate'),
                          ),
                          DropdownMenuItem<String?>(
                            value: 'advanced',
                            child: Text('Advanced'),
                          ),
                        ],
                        onChanged: (value) =>
                            setState(() => _difficulty = value),
                      ),
                    ),
                    SizedBox(
                      width: isCompact ? double.infinity : 240,
                      child: DropdownButtonFormField<String?>(
                        initialValue: _selectedSectionId,
                        decoration: const InputDecoration(
                          labelText: 'Target section',
                        ),
                        items: [
                          const DropdownMenuItem<String?>(
                            value: null,
                            child: Text('Unsectioned'),
                          ),
                          ...widget.sections.map(
                            (section) => DropdownMenuItem<String?>(
                              value: section.id,
                              child: Text(
                                'Section ${section.sectionOrder}: ${section.name}',
                              ),
                            ),
                          ),
                        ],
                        onChanged: (value) =>
                            setState(() => _selectedSectionId = value),
                      ),
                    ),
                    FilterChip(
                      label: const Text('Missing explanation'),
                      selected: _missingExplanationOnly,
                      onSelected: (value) =>
                          setState(() => _missingExplanationOnly = value),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    _ExamMetaChip(
                      label: 'Available',
                      value: '${filteredQuestions.length}',
                    ),
                    _ExamMetaChip(
                      label: 'Selected',
                      value: '${_selectedIds.length}',
                    ),
                    _ExamMetaChip(
                      label: 'Selected marks',
                      value: _selectedMarksTotal,
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          if (filteredQuestions.isEmpty)
            const Expanded(
              child: AppEmptyState(
                title: 'No questions match these filters',
                message:
                    'Broaden the search or switch off explanation-only filtering to pull more question bank items into the builder.',
              ),
            )
          else
            Expanded(
              child: ListView.separated(
                itemCount: filteredQuestions.length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final question = filteredQuestions[index];
                  final isSelected = _selectedIds.contains(question.id);
                  return AppCard(
                    backgroundColor: isSelected
                        ? AppColors.subtleAccent.withValues(alpha: 0.42)
                        : null,
                    borderColor: isSelected
                        ? AppColors.primary
                        : AppColors.border,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(18),
                      onTap: () {
                        setState(() {
                          if (isSelected) {
                            _selectedIds.remove(question.id);
                          } else {
                            _selectedIds.add(question.id);
                          }
                        });
                      },
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Checkbox(
                              value: isSelected,
                              onChanged: (_) {
                                setState(() {
                                  if (isSelected) {
                                    _selectedIds.remove(question.id);
                                  } else {
                                    _selectedIds.add(question.id);
                                  }
                                });
                              },
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 8,
                                    children: [
                                      AppBadge(
                                        label: isSelected
                                            ? 'Ready to add'
                                            : 'Available',
                                        backgroundColor: isSelected
                                            ? AppColors.primary.withValues(
                                                alpha: 0.12,
                                              )
                                            : AppColors.surfaceMuted,
                                        foregroundColor: isSelected
                                            ? AppColors.primary
                                            : AppColors.secondary,
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    question.questionText,
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleMedium
                                        ?.copyWith(fontWeight: FontWeight.w700),
                                  ),
                                  const SizedBox(height: 8),
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 8,
                                    children: [
                                      _ExamMetaChip(
                                        label: 'Difficulty',
                                        value: question.difficultyLevel,
                                      ),
                                      _ExamMetaChip(
                                        label: 'Marks',
                                        value: question.defaultMarks,
                                      ),
                                      _ExamMetaChip(
                                        label: 'Usage',
                                        value: '${question.usageCount}',
                                      ),
                                      _ExamMetaChip(
                                        label: 'Explanation',
                                        value: question.hasExplanation
                                            ? 'Ready'
                                            : 'Missing',
                                      ),
                                    ],
                                  ),
                                ],
                              ),
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
  }
}

class _ExamQuestionDialogState extends State<_ExamQuestionDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _marksController;
  late final TextEditingController _negativeMarksController;
  String? _questionId;
  String? _sectionId;
  bool _isMandatory = true;

  bool get _isEditing => widget.initialLink != null;

  @override
  void initState() {
    super.initState();
    _marksController = TextEditingController(
      text: widget.initialLink?.marks ?? '',
    );
    _negativeMarksController = TextEditingController(
      text: widget.initialLink?.negativeMarks ?? '',
    );
    _questionId = widget.initialLink?.questionId;
    _sectionId = widget.initialLink?.sectionId;
    _isMandatory = widget.initialLink?.isMandatory ?? true;
  }

  @override
  void dispose() {
    _marksController.dispose();
    _negativeMarksController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final availableQuestions = widget.availableQuestions
        .where(
          (question) =>
              _isEditing ||
              widget.exam.examQuestions.every(
                (link) => link.questionId != question.id,
              ),
        )
        .toList();
    final isCompact = MediaQuery.sizeOf(context).width < 640;

    return AppDialogShell(
      shellRoute: AppRoutes.exams,
      shellTitle: 'Exams',
      title: _isEditing ? 'Edit exam question' : 'Add exam question',
      subtitle:
          'Link a question, adjust scoring when needed, and keep the section order clear for students.',
      eyebrow: 'Exam builder',
      onClose: () => Navigator.of(context).pop(),
      primaryActionLabel: _isEditing ? 'Save link' : 'Add question',
      onPrimaryAction: () {
        if (!_formKey.currentState!.validate()) {
          return;
        }
        final payload = {
          'exam': widget.exam.id,
          if (_questionId != null) 'question': _questionId,
          'section': _sectionId,
          'question_order':
              widget.initialLink?.questionOrder ??
              (widget.exam.examQuestions.length + 1),
          'marks': _marksController.text.trim().isEmpty
              ? null
              : _marksController.text.trim(),
          'negative_marks': _negativeMarksController.text.trim().isEmpty
              ? null
              : _negativeMarksController.text.trim(),
          'is_mandatory': _isMandatory,
          'is_active': true,
        };
        Navigator.of(context).pop(_ExamQuestionDialogResult(payload: payload));
      },
      maxWidth: 640,
      maxHeight: 520,
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _BuilderPanel(
              title: _isEditing ? 'Linked question' : 'Choose a question',
              subtitle:
                  'Keep the question, section, and scoring relationship explicit so the paper stays easy to review later.',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (_isEditing)
                    AppCard(
                      padding: const EdgeInsets.all(16),
                      backgroundColor: AppColors.surfaceMuted,
                      child: Text(widget.initialLink!.questionTextSummary),
                    )
                  else
                    DropdownButtonFormField<String>(
                      initialValue: _questionId,
                      decoration: const InputDecoration(labelText: 'Question'),
                      items: availableQuestions
                          .map(
                            (question) => DropdownMenuItem(
                              value: question.id,
                              child: Text(
                                question.questionText,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          )
                          .toList(),
                      onChanged: (value) {
                        setState(() => _questionId = value);
                      },
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Choose a question.';
                        }
                        return null;
                      },
                    ),
                  const SizedBox(height: 14),
                  DropdownButtonFormField<String?>(
                    initialValue: _sectionId,
                    decoration: const InputDecoration(labelText: 'Section'),
                    items: [
                      const DropdownMenuItem<String?>(
                        value: null,
                        child: Text('Unsectioned'),
                      ),
                      ...widget.sections.map(
                        (section) => DropdownMenuItem<String?>(
                          value: section.id,
                          child: Text(
                            'Section ${section.sectionOrder}: ${section.name}',
                          ),
                        ),
                      ),
                    ],
                    onChanged: (value) {
                      setState(() => _sectionId = value);
                    },
                  ),
                  const SizedBox(height: 14),
                  if (isCompact) ...[
                    TextFormField(
                      controller: _marksController,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      decoration: const InputDecoration(
                        labelText: 'Marks override',
                      ),
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _negativeMarksController,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      decoration: const InputDecoration(
                        labelText: 'Negative marks override',
                      ),
                    ),
                  ] else
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _marksController,
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                            decoration: const InputDecoration(
                              labelText: 'Marks override',
                            ),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: TextFormField(
                            controller: _negativeMarksController,
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                            decoration: const InputDecoration(
                              labelText: 'Negative marks override',
                            ),
                          ),
                        ),
                      ],
                    ),
                  const SizedBox(height: 10),
                  SwitchListTile(
                    value: _isMandatory,
                    title: const Text('Mandatory question'),
                    contentPadding: EdgeInsets.zero,
                    onChanged: (value) {
                      setState(() => _isMandatory = value);
                    },
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

class _ExamSectionDialog extends StatefulWidget {
  const _ExamSectionDialog({
    required this.exam,
    this.initialSection,
    this.fullPage = false,
  });

  final TeacherExamBuilderModel exam;
  final TeacherExamSectionModel? initialSection;
  final bool fullPage;

  @override
  State<_ExamSectionDialog> createState() => _ExamSectionDialogState();
}

class _ExamSectionDialogState extends State<_ExamSectionDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _instructionsController;
  late final TextEditingController _totalQuestionsController;
  late final TextEditingController _marksPerQuestionController;
  late final TextEditingController _negativeMarksController;
  late final TextEditingController _sectionOrderController;

  bool get _isEditing => widget.initialSection != null;

  @override
  void initState() {
    super.initState();
    final initial = widget.initialSection;
    _nameController = TextEditingController(text: initial?.name ?? '');
    _descriptionController = TextEditingController(
      text: initial?.description ?? '',
    );
    _instructionsController = TextEditingController(
      text: initial?.instructions ?? '',
    );
    _totalQuestionsController = TextEditingController(
      text: initial != null ? '${initial.totalQuestions}' : '',
    );
    _marksPerQuestionController = TextEditingController(
      text: initial?.marksPerQuestion ?? '',
    );
    _negativeMarksController = TextEditingController(
      text: initial?.negativeMarksPerQuestion ?? '',
    );
    _sectionOrderController = TextEditingController(
      text: initial != null
          ? '${initial.sectionOrder}'
          : '${widget.exam.sections.length + 1}',
    );
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _instructionsController.dispose();
    _totalQuestionsController.dispose();
    _marksPerQuestionController.dispose();
    _negativeMarksController.dispose();
    _sectionOrderController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isCompact = MediaQuery.sizeOf(context).width < 640;
    return AppDialogShell(
      shellRoute: AppRoutes.exams,
      shellTitle: 'Exams',
      title: _isEditing ? 'Edit section' : 'Create section',
      subtitle:
          'Give this part of the paper a clear label so the builder and student exam flow can reflect the intended structure.',
      eyebrow: 'Section setup',
      fullPage: widget.fullPage,
      onClose: () => Navigator.of(context).pop(),
      primaryActionLabel: _isEditing ? 'Save section' : 'Create section',
      onPrimaryAction: () {
        if (!_formKey.currentState!.validate()) {
          return;
        }
        Navigator.of(context).pop(
          _ExamSectionDialogResult(
            payload: {
              'exam': widget.exam.id,
              'name': _nameController.text.trim(),
              'description': _descriptionController.text.trim(),
              'section_order': _sectionOrderController.text.trim(),
              'instructions': _instructionsController.text.trim(),
              'total_questions': _totalQuestionsController.text.trim().isEmpty
                  ? 0
                  : _totalQuestionsController.text.trim(),
              'marks_per_question':
                  _marksPerQuestionController.text.trim().isEmpty
                  ? null
                  : _marksPerQuestionController.text.trim(),
              'negative_marks_per_question':
                  _negativeMarksController.text.trim().isEmpty
                  ? null
                  : _negativeMarksController.text.trim(),
              'is_active': true,
            },
          ),
        );
      },
      maxWidth: 720,
      maxHeight: 680,
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AppCard(
              backgroundColor: AppColors.surfaceMuted,
              child: Wrap(
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.sm,
                children: [
                  _ExamMetaChip(
                    label: 'Order',
                    value: _sectionOrderController.text.trim(),
                  ),
                  _ExamMetaChip(
                    label: 'Linked',
                    value: widget.initialSection?.linkedQuestionsCount ?? 0,
                  ),
                  _ExamMetaChip(
                    label: 'Planned',
                    value: _totalQuestionsController.text.trim().isEmpty
                        ? 0
                        : _totalQuestionsController.text.trim(),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            _BuilderPanel(
              title: 'Section details',
              subtitle:
                  'Give the section a clear label, order, and optional scoring defaults for the teacher workflow.',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  AppTextField(
                    controller: _nameController,
                    label: 'Section name',
                    hint: 'Section A',
                    validator: _requiredValidator,
                  ),
                  const SizedBox(height: 14),
                  AppTextField(
                    controller: _descriptionController,
                    label: 'Description',
                    hint: 'Short section summary for teachers',
                  ),
                  const SizedBox(height: 14),
                  if (isCompact) ...[
                    AppTextField(
                      controller: _sectionOrderController,
                      label: 'Section order',
                      keyboardType: TextInputType.number,
                      validator: _requiredValidator,
                    ),
                    const SizedBox(height: 14),
                    AppTextField(
                      controller: _totalQuestionsController,
                      label: 'Planned question count',
                      keyboardType: TextInputType.number,
                    ),
                    const SizedBox(height: 14),
                    AppTextField(
                      controller: _marksPerQuestionController,
                      label: 'Marks per question',
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                    ),
                    const SizedBox(height: 14),
                    AppTextField(
                      controller: _negativeMarksController,
                      label: 'Negative marks per question',
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                    ),
                  ] else ...[
                    Row(
                      children: [
                        Expanded(
                          child: AppTextField(
                            controller: _sectionOrderController,
                            label: 'Section order',
                            keyboardType: TextInputType.number,
                            validator: _requiredValidator,
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: AppTextField(
                            controller: _totalQuestionsController,
                            label: 'Planned question count',
                            keyboardType: TextInputType.number,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: AppTextField(
                            controller: _marksPerQuestionController,
                            label: 'Marks per question',
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: AppTextField(
                            controller: _negativeMarksController,
                            label: 'Negative marks per question',
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 14),
                  AppTextField(
                    controller: _instructionsController,
                    label: 'Section instructions',
                    hint: 'Optional guidance shown for this section later on',
                    maxLines: 4,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String? _requiredValidator(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'This field is required.';
    }
    return null;
  }
}

class _ExamDialogResult {
  const _ExamDialogResult({required this.payload});

  final Map<String, dynamic> payload;
}

class _ExamSectionDialogResult {
  const _ExamSectionDialogResult({required this.payload});

  final Map<String, dynamic> payload;
}

class _ExamQuestionDialogResult {
  const _ExamQuestionDialogResult({required this.payload});

  final Map<String, dynamic> payload;
}

class _BulkExamQuestionDialogResult {
  const _BulkExamQuestionDialogResult({required this.payloads});

  final List<Map<String, dynamic>> payloads;
}

class _ExamAssignmentDialogResult {
  const _ExamAssignmentDialogResult({required this.payload});

  final Map<String, dynamic> payload;
}

class _ExamAssignmentDialog extends StatefulWidget {
  const _ExamAssignmentDialog({
    required this.exam,
    required this.assignableStudents,
    this.fullPage = false,
  });

  final TeacherExamBuilderModel exam;
  final List<AssignableStudentModel> assignableStudents;
  final bool fullPage;

  @override
  State<_ExamAssignmentDialog> createState() => _ExamAssignmentDialogState();
}

class _ExamAssignmentDialogState extends State<_ExamAssignmentDialog> {
  late String _assignmentMode;
  late final Set<String> _selectedStudentIds;
  late final TextEditingController _searchController;

  @override
  void initState() {
    super.initState();
    _assignmentMode = widget.exam.assignmentMode;
    _selectedStudentIds = widget.exam.assignedStudents
        .map((student) => student.studentId)
        .toSet();
    _searchController = TextEditingController();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final query = _searchController.text.trim().toLowerCase();
    final filteredStudents = widget.assignableStudents.where((student) {
      if (query.isEmpty) {
        return true;
      }
      return student.fullName.toLowerCase().contains(query) ||
          student.admissionNo.toLowerCase().contains(query) ||
          (student.cohortName ?? '').toLowerCase().contains(query);
    }).toList()..sort((a, b) => a.fullName.compareTo(b.fullName));

    return AppDialogShell(
      shellRoute: AppRoutes.exams,
      shellTitle: 'Exams',
      title: 'Manage assignments',
      subtitle:
          'Choose whether this exam follows program/cohort scope or only specific students.',
      eyebrow: 'Exam audience',
      fullPage: widget.fullPage,
      onClose: () => Navigator.of(context).pop(),
      primaryActionLabel: 'Save assignments',
      onPrimaryAction: () {
        Navigator.of(context).pop(
          _ExamAssignmentDialogResult(
            payload: {
              'assignment_mode': _assignmentMode,
              'student_ids': _selectedStudentIds.toList(),
            },
          ),
        );
      },
      secondaryActionLabel: 'Cancel',
      onSecondaryAction: () => Navigator.of(context).pop(),
      maxWidth: 920,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppCard(
            backgroundColor: AppColors.surfaceMuted,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Assignment mode',
                  style: Theme.of(
                    context,
                  ).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    ChoiceChip(
                      label: const Text('Program / cohort scope'),
                      selected: _assignmentMode == 'scope',
                      onSelected: (_) {
                        setState(() => _assignmentMode = 'scope');
                      },
                    ),
                    ChoiceChip(
                      label: Text(
                        'Selected students (${_selectedStudentIds.length})',
                      ),
                      selected: _assignmentMode == 'selected_students',
                      onSelected: (_) {
                        setState(() => _assignmentMode = 'selected_students');
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  _assignmentMode == 'scope'
                      ? 'All students inside the exam program/cohort scope can access this exam.'
                      : 'Only the selected students below can access this exam, even if others match the general scope.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          AppCard(
            backgroundColor: AppColors.surfaceMuted,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Student audience',
                        style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    TextButton(
                      onPressed: _assignmentMode != 'selected_students'
                          ? null
                          : () {
                              setState(() {
                                _selectedStudentIds
                                  ..clear()
                                  ..addAll(
                                    widget.assignableStudents.map(
                                      (student) => student.id,
                                    ),
                                  );
                              });
                            },
                      child: const Text('Select all'),
                    ),
                    TextButton(
                      onPressed: _selectedStudentIds.isEmpty
                          ? null
                          : () => setState(_selectedStudentIds.clear),
                      child: const Text('Clear'),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _searchController,
                  onChanged: (_) => setState(() {}),
                  decoration: const InputDecoration(
                    hintText:
                        'Search students by name, admission no, or cohort',
                    prefixIcon: Icon(Icons.search_rounded),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  '${filteredStudents.length} student(s) in scope',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 12),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 360),
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: filteredStudents.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final student = filteredStudents[index];
                      final selected = _selectedStudentIds.contains(student.id);
                      return InkWell(
                        borderRadius: BorderRadius.circular(14),
                        onTap: _assignmentMode != 'selected_students'
                            ? null
                            : () {
                                setState(() {
                                  if (selected) {
                                    _selectedStudentIds.remove(student.id);
                                  } else {
                                    _selectedStudentIds.add(student.id);
                                  }
                                });
                              },
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: selected
                                ? AppColors.subtleAccent.withValues(alpha: 0.18)
                                : AppColors.surface,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: selected
                                  ? AppColors.accent.withValues(alpha: 0.36)
                                  : AppColors.border.withValues(alpha: 0.7),
                            ),
                          ),
                          child: Row(
                            children: [
                              Checkbox(
                                value: selected,
                                onChanged:
                                    _assignmentMode != 'selected_students'
                                    ? null
                                    : (value) {
                                        setState(() {
                                          if (value ?? false) {
                                            _selectedStudentIds.add(student.id);
                                          } else {
                                            _selectedStudentIds.remove(
                                              student.id,
                                            );
                                          }
                                        });
                                      },
                              ),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      student.fullName,
                                      style: Theme.of(context)
                                          .textTheme
                                          .labelLarge
                                          ?.copyWith(
                                            fontWeight: FontWeight.w700,
                                          ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      '${student.admissionNo} • ${student.cohortName ?? 'No cohort'}',
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall
                                          ?.copyWith(
                                            color: AppColors.textSecondary,
                                          ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TeacherExamPreviewDialog extends StatelessWidget {
  const _TeacherExamPreviewDialog({required this.exam, this.fullPage = false});

  final StudentExamDetail exam;
  final bool fullPage;

  @override
  Widget build(BuildContext context) {
    return AppDialogShell(
      shellRoute: AppRoutes.exams,
      shellTitle: 'Exams',
      title: exam.title,
      subtitle:
          'Student-style readiness preview for runtime, sections, and question delivery.',
      eyebrow: 'Exam preview',
      fullPage: fullPage,
      onClose: () => Navigator.of(context).pop(),
      primaryActionLabel: 'Close',
      onPrimaryAction: () => Navigator.of(context).pop(),
      maxWidth: 980,
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const AppSectionHeader(
                    title: 'Exam overview',
                    subtitle:
                        'This preview mirrors what a student sees before starting the exam.',
                  ),
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _ExamMetaChip(label: 'Code', value: exam.code),
                      _ExamMetaChip(
                        label: 'Duration',
                        value: '${exam.durationMinutes} min',
                      ),
                      _ExamMetaChip(
                        label: 'Questions',
                        value: exam.activeQuestionCount,
                      ),
                      _ExamMetaChip(label: 'Marks', value: exam.totalMarks),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    exam.description.trim().isEmpty
                        ? 'No exam description yet.'
                        : exam.description,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const AppSectionHeader(
                    title: 'Runtime preview',
                    subtitle:
                        'Timer, navigation, attempts, review, and security rules.',
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: [
                      _ExamMetaChip(
                        label: 'Timer mode',
                        value: exam.timerMode.replaceAll('_', ' '),
                      ),
                      _ExamMetaChip(
                        label: 'Navigation',
                        value: exam.navigationMode.replaceAll('_', ' '),
                      ),
                      _ExamMetaChip(
                        label: 'Attempts',
                        value: exam.attemptPolicy.replaceAll('_', ' '),
                      ),
                      _ExamMetaChip(
                        label: 'Review',
                        value: exam.reviewMode.replaceAll('_', ' '),
                      ),
                      _ExamMetaChip(
                        label: 'Security',
                        value: exam.securityMode.replaceAll('_', ' '),
                      ),
                      _ExamMetaChip(
                        label: 'Assignment',
                        value: exam.availabilityState.replaceAll('_', ' '),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    exam.instructions?.trim().isNotEmpty == true
                        ? exam.instructions!
                        : 'No custom instructions yet. The default student instructions will be shown.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const AppSectionHeader(
                    title: 'Sections',
                    subtitle:
                        'How the student will experience the structural grouping of the paper.',
                  ),
                  const SizedBox(height: 12),
                  if (exam.sections.isEmpty)
                    const Text('No sections configured yet.')
                  else
                    Column(
                      children: exam.sections
                          .map(
                            (section) => Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: AppCard(
                                backgroundColor: AppColors.surfaceMuted,
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            section.name,
                                            style: Theme.of(context)
                                                .textTheme
                                                .labelLarge
                                                ?.copyWith(
                                                  fontWeight: FontWeight.w700,
                                                ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            section.instructions.trim().isEmpty
                                                ? 'No section instructions.'
                                                : section.instructions,
                                            style: Theme.of(context)
                                                .textTheme
                                                .bodySmall
                                                ?.copyWith(
                                                  color:
                                                      AppColors.textSecondary,
                                                ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Wrap(
                                      spacing: 8,
                                      runSpacing: 8,
                                      children: [
                                        _ExamMetaChip(
                                          label: 'Questions',
                                          value: section.displayQuestionCount,
                                        ),
                                        _ExamMetaChip(
                                          label: 'Timer',
                                          value: section.timerEnabled
                                              ? '${section.durationMinutes ?? 0} min'
                                              : 'Shared',
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          )
                          .toList(),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const AppSectionHeader(
                    title: 'Question delivery preview',
                    subtitle:
                        'A sample of the linked questions in the order the student will receive them.',
                  ),
                  const SizedBox(height: 12),
                  if (exam.examQuestions.isEmpty)
                    const Text('No active questions linked yet.')
                  else
                    Column(
                      children: exam.examQuestions.take(8).map((question) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: AppCard(
                            backgroundColor: AppColors.surfaceMuted,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Q${question.questionOrder} • ${question.sectionTitle ?? 'Unsectioned'}',
                                  style: Theme.of(context).textTheme.labelLarge
                                      ?.copyWith(fontWeight: FontWeight.w700),
                                ),
                                const SizedBox(height: 8),
                                Text(question.questionText),
                                const SizedBox(height: 8),
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: [
                                    _ExamMetaChip(
                                      label: 'Type',
                                      value: question.questionType.replaceAll(
                                        '_',
                                        ' ',
                                      ),
                                    ),
                                    _ExamMetaChip(
                                      label: 'Marks',
                                      value: question.marks,
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  if (exam.examQuestions.length > 8) ...[
                    const SizedBox(height: 8),
                    Text(
                      '+${exam.examQuestions.length - 8} more question(s) in the full student view',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BuilderPanel extends StatelessWidget {
  const _BuilderPanel({
    required this.title,
    required this.subtitle,
    required this.child,
  });

  final String title;
  final String subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            subtitle,
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
          ),
          const SizedBox(height: AppSpacing.lg),
          child,
        ],
      ),
    );
  }
}

String _formatDateTime(DateTime? value) {
  return formatLocalDateTime(value);
}

String _examQuestionSectionLabel(TeacherExamQuestionLinkModel link) {
  final title = link.sectionTitle?.trim();
  if (title != null && title.isNotEmpty) {
    return title;
  }
  final name = link.sectionName?.trim();
  if (name != null && name.isNotEmpty) {
    return name;
  }
  return 'Unsectioned';
}

String _formatDurationLabel(int? seconds) {
  if (seconds == null) {
    return 'the exam window';
  }
  if (seconds <= 0) {
    return '0m';
  }
  final duration = Duration(seconds: seconds);
  final hours = duration.inHours;
  final minutes = duration.inMinutes.remainder(60);
  if (hours > 0) {
    return '${hours}h ${minutes}m';
  }
  return '${duration.inMinutes}m';
}

String _defaultExamInstructionTemplate() {
  return 'Read each question carefully before selecting an answer. '
      'The timer continues once the attempt starts, so submit before the exam window ends. '
      'If you leave a question unanswered, review it before final submission.';
}

String _displayValue(Object? value, {String fallback = '-'}) {
  final text = value?.toString().trim() ?? '';
  return text.isEmpty ? fallback : text;
}

String _runtimePolicyLabel(String value) {
  return switch (value) {
    'global' => 'Global timer',
    'section' => 'Section timer',
    'hybrid' => 'Hybrid',
    'free_exam' => 'Free across exam',
    'free_section' => 'Free within section',
    'sequential' => 'Sequential',
    'single' => 'Single attempt',
    'latest' => 'Latest counted',
    'best' => 'Best counted',
    'unlimited_practice' => 'Unlimited practice',
    'immediate' => 'Immediate',
    'scheduled' => 'Scheduled',
    'after_review' => 'After review',
    'none' => 'No review',
    'attempted_only' => 'Attempted only',
    'all_questions' => 'All questions',
    'solution_review' => 'Solution review',
    'normal' => 'Normal',
    'focus' => 'Focus mode',
    'fullscreen' => 'Fullscreen',
    'violation_limited' => 'Violation limited',
    'proctored' => 'Proctored',
    _ => value.replaceAll('_', ' '),
  };
}

String _examLifecycleHelper(TeacherExamBuilderModel exam) {
  switch (exam.status) {
    case 'draft':
      return 'This exam is still a draft. Students cannot see it yet.';
    case 'scheduled':
      return 'Scheduled exams are visible to students but only start during the exam window.';
    case 'live':
      return 'Live exams can accept attempts right now if the window is still open.';
    case 'completed':
      return 'The exam window has ended. New attempts are blocked and review depends on publish settings.';
    case 'cancelled':
      return 'This exam is cancelled and should not be used for new attempts.';
    default:
      return 'Review timing, publish state, and instructions before sharing this exam.';
  }
}

String _examResultStatusLabel(TeacherExamBuilderModel exam) {
  switch (exam.status) {
    case 'draft':
      return 'Not ready';
    case 'scheduled':
      return 'Waiting for submissions';
    case 'live':
      return 'In progress';
    case 'completed':
      return 'Ready for publish';
    case 'cancelled':
      return 'Blocked';
    default:
      return 'Pending';
  }
}

String _compactScheduleLabel(DateTime? startAt, DateTime? endAt) {
  if (startAt == null) {
    return 'Schedule pending';
  }
  final start =
      '${startAt.day.toString().padLeft(2, '0')}/${startAt.month.toString().padLeft(2, '0')}';
  if (endAt == null) {
    return start;
  }
  final end =
      '${endAt.day.toString().padLeft(2, '0')}/${endAt.month.toString().padLeft(2, '0')}';
  return '$start - $end';
}
