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
import 'package:education_frontend/features/exams/domain/models/teacher_exam_builder_model.dart';
import 'package:education_frontend/features/exams/presentation/helpers/exam_builder_refresh.dart';
import 'package:education_frontend/features/exams/presentation/providers/student_exam_providers.dart';
import 'package:education_frontend/features/exams/presentation/providers/teacher_exam_builder_providers.dart';
import 'package:education_frontend/features/question_bank/data/repositories/question_bank_repository.dart';
import 'package:education_frontend/features/question_bank/domain/models/teacher_question_model.dart';
import 'package:education_frontend/shared/presentation/widgets/placeholder_feature_view.dart';
import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/widgets/app_card.dart';
import 'package:education_frontend/shared/widgets/app_dialog_shell.dart';
import 'package:education_frontend/shared/widgets/app_empty_state.dart';
import 'package:education_frontend/shared/widgets/app_error_state.dart';
import 'package:education_frontend/shared/widgets/app_loader.dart';
import 'package:education_frontend/shared/widgets/app_text_field.dart';
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
        _ => const PlaceholderFeatureView(
          title: 'Exam surface reserved',
          description:
              'This route is intentionally limited for the current role.',
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
              PlaceholderFeatureView(
                title: 'Exam availability',
                description:
                    'Track what is live now, what is coming up, and what is already completed without guessing the exam window.',
                highlights: [
                  'Available now: ${grouped['available_now']!.length}',
                  'Upcoming: ${grouped['upcoming']!.length}',
                  'Completed or pending results: ${grouped['completed']!.length}',
                  'Missed or expired: ${grouped['missed']!.length}',
                ],
              ),
              const SizedBox(height: 20),
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
                  padding: const EdgeInsets.only(bottom: 20),
                  child: AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 14),
                        ...items.map((exam) {
                          StudentAttempt? activeAttempt;
                          for (final attempt in attempts) {
                            if (attempt.examId == exam.id && attempt.isInProgress) {
                              activeAttempt = attempt;
                              break;
                            }
                          }
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 16),
                            child: _StudentExamCard(
                              exam: exam,
                              hasInProgressAttempt: activeAttempt != null,
                              onOpen: () => context.go(AppRoutes.studentExamDetail(exam.id)),
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
                                context.go(AppRoutes.studentExamDetail(exam.id));
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
        error: (error, _) =>
            AppErrorState(message: readApiErrorMessage(error)),
      ),
      loading: () => const AppLoader(label: 'Loading available exams'),
      error: (error, _) =>
          AppErrorState(message: readApiErrorMessage(error)),
    );
  }
}

class _TeacherExamBuilderView extends ConsumerStatefulWidget {
  const _TeacherExamBuilderView();

  @override
  ConsumerState<_TeacherExamBuilderView> createState() =>
      _TeacherExamBuilderViewState();
}

class _TeacherExamBuilderViewState
    extends ConsumerState<_TeacherExamBuilderView> {
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

    final result = await showDialog<_ExamDialogResult>(
      context: context,
      barrierDismissible: false,
      builder: (context) => _ExamEditorDialog(
        instituteId: user.instituteId ?? '',
        years: years,
        programs: programs,
        cohorts: cohorts,
        subjects: subjects,
        initialExam: exam,
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

    final result = await showDialog<_BulkExamQuestionDialogResult>(
      context: context,
      barrierDismissible: false,
      builder: (context) => _BulkExamQuestionDialog(
        exam: exam,
        availableQuestions: availableQuestions.items,
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

        final isWide = MediaQuery.sizeOf(context).width >= 1100;

        final listPanel = Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Exam builder',
                        style: Theme.of(context).textTheme.headlineSmall
                            ?.copyWith(fontWeight: FontWeight.w700),
                      ),
                    ),
                    FilledButton.icon(
                      onPressed: lookupsLoaded ? () => _openExamDialog() : null,
                      icon: const Icon(Icons.add),
                      label: const Text('Create exam'),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  'Create exams, attach questions, reorder them, sync marks, and publish directly from the teacher workspace.',
                ),
                const SizedBox(height: 18),
                Expanded(
                  child: exams.isEmpty
                      ? const AppEmptyState(
                          title: 'No exams in this workspace yet',
                          message:
                              'Create the first exam draft to start assembling questions, syncing marks, and publishing an assessment.',
                        )
                      : ListView.separated(
                          itemCount: exams.length,
                          separatorBuilder: (context, index) =>
                              const SizedBox(height: 10),
                          itemBuilder: (context, index) {
                            final exam = exams[index];
                            final isSelected = exam.id == effectiveSelectedId;
                            return ListTile(
                              selected: isSelected,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(18),
                              ),
                              title: Text(exam.title),
                              subtitle: Text(
                                '${exam.code} • ${exam.subjectName ?? 'No subject'}\n${_examLifecycleHelper(exam)}',
                              ),
                              trailing: _ExamMetaChip(
                                label: 'Status',
                                value: exam.status,
                              ),
                              isThreeLine: true,
                              onTap: () {
                                ref
                                    .read(
                                      selectedTeacherExamIdProvider.notifier,
                                    )
                                    .set(exam.id);
                              },
                            );
                          },
                        ),
                ),
              ],
            ),
          ),
        );

        final detailPanel = detailValue == null
            ? const Card(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: Text('Create an exam to begin the builder flow.'),
                ),
              )
            : detailValue.when(
                data: (exam) => Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: ListView(
                      children: [
                        Builder(
                          builder: (context) {
                            final teacherQuestions = teacherQuestionsValue.maybeWhen(
                              data: (items) => items,
                              orElse: () => const <TeacherQuestionItem>[],
                            );
                            final questionMap = <String, TeacherQuestionItem>{
                              for (final question in teacherQuestions)
                                if (question.id.trim().isNotEmpty) question.id: question,
                            };
                            final missingExplanationCount = exam.examQuestions
                                .where(
                                  (link) =>
                                      (questionMap[link.questionId]
                                              ?.explanation
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
                                  color: const Color(0xFFFEF3C7),
                                  borderRadius: BorderRadius.circular(18),
                                ),
                                child: Text(
                                  '$missingExplanationCount linked question(s) are missing teacher explanations. Students can take the exam, but review quality will be lower until those explanations are added.',
                                ),
                              ),
                            );
                          },
                        ),
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    exam.title,
                                    style: Theme.of(context)
                                        .textTheme
                                        .headlineSmall
                                        ?.copyWith(fontWeight: FontWeight.w700),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    '${exam.code} • ${exam.programName ?? 'Program'} • ${exam.subjectName ?? 'No subject'}',
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    _examLifecycleHelper(exam),
                                    style: Theme.of(context).textTheme.bodySmall,
                                  ),
                                ],
                              ),
                            ),
                            Wrap(
                              spacing: 10,
                              runSpacing: 10,
                              children: [
                                OutlinedButton(
                                  onPressed: () => _openExamDialog(exam: exam),
                                  child: const Text('Edit details'),
                                ),
                                OutlinedButton(
                                  onPressed: () => _openAddQuestionDialog(exam),
                                  child: const Text('Add question'),
                                ),
                                OutlinedButton(
                                  onPressed: () => _syncMarks(exam),
                                  child: const Text('Sync marks'),
                                ),
                                FilledButton(
                                  onPressed: () => _publishExam(exam),
                                  child: const Text('Publish'),
                                ),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        Wrap(
                          spacing: 12,
                          runSpacing: 12,
                          children: [
                            _ExamMetaChip(label: 'Type', value: exam.examType),
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
                            _ExamMetaChip(label: 'Status', value: exam.status),
                          ],
                        ),
                        const SizedBox(height: 12),
                        AppCard(
                          backgroundColor: const Color(0xFFF8FAFC),
                          child: Text(_examLifecycleHelper(exam)),
                        ),
                        const SizedBox(height: 20),
                        Text(
                          'Exam questions',
                          style: Theme.of(context).textTheme.titleLarge
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 12),
                        if (exam.examQuestions.isEmpty)
                          const AppEmptyState(
                            title: 'No questions linked yet',
                            message:
                                'Add questions from the bank to shape the structure and scoring of this exam.',
                          )
                        else
                          ...exam.examQuestions.map(
                            (link) => Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: Card(
                                margin: EdgeInsets.zero,
                                child: Padding(
                                  padding: const EdgeInsets.all(16),
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

        if (!isWide) {
          return Column(
            children: [
              SizedBox(height: 360, child: listPanel),
              const SizedBox(height: 16),
              Expanded(child: detailPanel),
            ],
          );
        }

        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 360,
              child: SizedBox(height: 760, child: listPanel),
            ),
            const SizedBox(width: 16),
            Expanded(child: SizedBox(height: 760, child: detailPanel)),
          ],
        );
      },
      loading: () => const AppLoader(label: 'Loading teacher exams'),
      error: (error, _) =>
          AppErrorState(message: readApiErrorMessage(error)),
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
    return Card(
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
                  onPressed: exam.canStart || hasInProgressAttempt ? onPrimaryAction : onOpen,
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
                  value: '${exam.attemptsUsed}/${exam.attemptsUsed + exam.remainingAttempts}',
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
    return DecoratedBox(
      decoration: BoxDecoration(
        color: const Color(0xFFE6F2EF),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Text('$label: ${_displayValue(value)}'),
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
    this.initialExam,
  });

  final String instituteId;
  final List<AcademicLookupOption> years;
  final List<AcademicLookupOption> programs;
  final List<AcademicLookupOption> cohorts;
  final List<AcademicLookupOption> subjects;
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
  late final TextEditingController _passingMarksController;
  late final TextEditingController _startController;
  late final TextEditingController _endController;
  late final TextEditingController _instructionsController;
  String? _academicYearId;
  String? _programId;
  String? _cohortId;
  String? _subjectId;
  String _examType = 'test';
  String _deliveryMode = 'online';
  bool _allowLateSubmit = false;
  bool _randomizeQuestions = false;
  bool _randomizeOptions = false;
  bool _showResultImmediately = false;
  bool _allowReviewAfterSubmit = true;

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
    _academicYearId = exam?.academicYearId;
    _programId = exam?.programId;
    _cohortId = exam?.cohortId;
    _subjectId = exam?.subjectId;
    _examType = exam?.examType ?? 'test';
    _deliveryMode = exam?.deliveryMode ?? 'online';
    _allowLateSubmit = exam?.allowLateSubmit ?? false;
    _randomizeQuestions = exam?.randomizeQuestions ?? false;
    _randomizeOptions = exam?.randomizeOptions ?? false;
    _showResultImmediately = exam?.showResultImmediately ?? false;
    _allowReviewAfterSubmit = exam?.allowReviewAfterSubmit ?? true;
  }

  @override
  void dispose() {
    _titleController.dispose();
    _codeController.dispose();
    _descriptionController.dispose();
    _durationController.dispose();
    _passingMarksController.dispose();
    _startController.dispose();
    _endController.dispose();
    _instructionsController.dispose();
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

    return AppDialogShell(
      title: widget.initialExam == null ? 'Create exam' : 'Edit exam',
      subtitle:
          'Capture the essentials first. Question linking, mark syncing, and publishing continue in the builder after save.',
      eyebrow: 'Teacher workflow',
      onClose: () => Navigator.of(context).pop(),
      primaryActionLabel: widget.initialExam == null ? 'Create exam' : 'Save changes',
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
              'max_attempts': widget.initialExam?.maxAttempts ?? 1,
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
          children: [
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
                          decoration: const InputDecoration(
                            labelText: 'Description',
                          ),
                        ),
                        const SizedBox(height: 14),
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
                        const SizedBox(height: 14),
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
                                controller: _passingMarksController,
                                keyboardType:
                                    const TextInputType.numberWithOptions(
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
                        const SizedBox(height: 14),
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
                                    initialDateTime: parseDateTimeInput(_startController.text),
                                  );
                                  if (picked != null) {
                                    _startController.text = formatDateTimeForInput(picked);
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
                                    initialDateTime: parseDateTimeInput(_endController.text),
                                  );
                                  if (picked != null) {
                                    _endController.text = formatDateTimeForInput(picked);
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
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(color: AppColors.textSecondary),
                          ),
                        ),
                        const SizedBox(height: 14),
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
                                  _instructionsController.text = _defaultExamInstructionTemplate();
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
                        const SizedBox(height: 16),
                        SwitchListTile(
                          value: _allowLateSubmit,
                          title: const Text('Allow late submit'),
                          onChanged: (value) {
                            setState(() => _allowLateSubmit = value);
                          },
                        ),
                        SwitchListTile(
                          value: _randomizeQuestions,
                          title: const Text('Randomize questions'),
                          onChanged: (value) {
                            setState(() => _randomizeQuestions = value);
                          },
                        ),
                        SwitchListTile(
                          value: _randomizeOptions,
                          title: const Text('Randomize options'),
                          onChanged: (value) {
                            setState(() => _randomizeOptions = value);
                          },
                        ),
                        SwitchListTile(
                          value: _showResultImmediately,
                          title: const Text('Show result immediately'),
                          onChanged: (value) {
                            setState(() => _showResultImmediately = value);
                          },
                        ),
                        SwitchListTile(
                          value: _allowReviewAfterSubmit,
                          title: const Text('Allow review after submit'),
                          onChanged: (value) {
                            setState(() => _allowReviewAfterSubmit = value);
                          },
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
    this.initialLink,
  });

  final TeacherExamBuilderModel exam;
  final List<TeacherQuestionModel> availableQuestions;
  final TeacherExamQuestionLinkModel? initialLink;

  @override
  State<_ExamQuestionDialog> createState() => _ExamQuestionDialogState();
}

class _BulkExamQuestionDialog extends StatefulWidget {
  const _BulkExamQuestionDialog({
    required this.exam,
    required this.availableQuestions,
  });

  final TeacherExamBuilderModel exam;
  final List<TeacherQuestionModel> availableQuestions;

  @override
  State<_BulkExamQuestionDialog> createState() => _BulkExamQuestionDialogState();
}

class _BulkExamQuestionDialogState extends State<_BulkExamQuestionDialog> {
  late final TextEditingController _searchController;
  final Set<String> _selectedIds = <String>{};
  String? _difficulty;
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
    final linkedIds = widget.exam.examQuestions.map((item) => item.questionId).toSet();
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
    return AppDialogShell(
      title: 'Add questions in bulk',
      subtitle:
          'Search the question bank, filter the list, and add multiple questions without leaving the builder.',
      eyebrow: 'Teacher productivity',
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
                  'section_name': '',
                  'question_order': startOrder + index,
                  'marks': null,
                  'negative_marks': null,
                  'is_mandatory': true,
                  'is_active': true,
                },
              );
              Navigator.of(context).pop(_BulkExamQuestionDialogResult(payloads: payloads));
            },
      maxWidth: 980,
      maxHeight: 760,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              SizedBox(
                width: 320,
                child: AppTextField(
                  controller: _searchController,
                  label: 'Search questions',
                  hint: 'Find by question text or explanation',
                  onChanged: (_) => setState(() {}),
                ),
              ),
              SizedBox(
                width: 220,
                child: DropdownButtonFormField<String?>(
                  initialValue: _difficulty,
                  decoration: const InputDecoration(labelText: 'Difficulty'),
                  items: const [
                    DropdownMenuItem<String?>(value: null, child: Text('All levels')),
                    DropdownMenuItem<String?>(value: 'foundation', child: Text('Foundation')),
                    DropdownMenuItem<String?>(value: 'intermediate', child: Text('Intermediate')),
                    DropdownMenuItem<String?>(value: 'advanced', child: Text('Advanced')),
                  ],
                  onChanged: (value) => setState(() => _difficulty = value),
                ),
              ),
              FilterChip(
                label: const Text('Missing explanation'),
                selected: _missingExplanationOnly,
                onSelected: (value) => setState(() => _missingExplanationOnly = value),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              _ExamMetaChip(label: 'Available', value: '${filteredQuestions.length}'),
              _ExamMetaChip(label: 'Selected', value: '${_selectedIds.length}'),
              _ExamMetaChip(label: 'Selected marks', value: _selectedMarksTotal),
            ],
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
                                  Text(
                                    question.questionText,
                                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                      fontWeight: FontWeight.w700,
                                    ),
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
                                        value: question.hasExplanation ? 'Ready' : 'Missing',
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
  late final TextEditingController _sectionController;
  late final TextEditingController _marksController;
  late final TextEditingController _negativeMarksController;
  String? _questionId;
  bool _isMandatory = true;

  bool get _isEditing => widget.initialLink != null;

  @override
  void initState() {
    super.initState();
    _sectionController = TextEditingController(
      text: widget.initialLink?.sectionName ?? '',
    );
    _marksController = TextEditingController(
      text: widget.initialLink?.marks ?? '',
    );
    _negativeMarksController = TextEditingController(
      text: widget.initialLink?.negativeMarks ?? '',
    );
    _questionId = widget.initialLink?.questionId;
    _isMandatory = widget.initialLink?.isMandatory ?? true;
  }

  @override
  void dispose() {
    _sectionController.dispose();
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

    return AppDialogShell(
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
          'section_name': _sectionController.text.trim(),
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
            if (_isEditing)
              AppCard(
                padding: const EdgeInsets.all(16),
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
            TextFormField(
              controller: _sectionController,
              decoration: const InputDecoration(labelText: 'Section name'),
            ),
            const SizedBox(height: 14),
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
              onChanged: (value) {
                setState(() => _isMandatory = value);
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _ExamDialogResult {
  const _ExamDialogResult({required this.payload});

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

String _formatDateTime(DateTime? value) {
  return formatLocalDateTime(value);
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
