import 'dart:async';

import 'package:education_frontend/app/router/app_routes.dart';
import 'package:education_frontend/core/network/api_error_message.dart';
import 'package:education_frontend/features/auth/presentation/providers/auth_controller.dart';
import 'package:education_frontend/features/dashboard/presentation/widgets/dashboard_shell.dart';
import 'package:education_frontend/features/exams/data/repositories/student_exam_repository.dart';
import 'package:education_frontend/features/exams/domain/models/student_attempt.dart';
import 'package:education_frontend/features/exams/domain/models/student_attempt_answer.dart';
import 'package:education_frontend/features/exams/domain/models/student_exam_detail.dart';
import 'package:education_frontend/features/exams/domain/models/student_exam_option.dart';
import 'package:education_frontend/features/exams/domain/models/student_exam_question.dart';
import 'package:education_frontend/features/exams/presentation/providers/student_exam_providers.dart';
import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/theme/app_radius.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:education_frontend/shared/widgets/app_badge.dart';
import 'package:education_frontend/shared/widgets/app_button.dart';
import 'package:education_frontend/shared/widgets/app_card.dart';
import 'package:education_frontend/shared/widgets/app_empty_state.dart';
import 'package:education_frontend/shared/widgets/app_error_state.dart';
import 'package:education_frontend/shared/widgets/app_loader.dart';
import 'package:education_frontend/shared/widgets/app_rich_text_renderer.dart';
import 'package:education_frontend/shared/utils/app_date_time.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class StudentAttemptPage extends ConsumerStatefulWidget {
  const StudentAttemptPage({
    required this.examId,
    required this.attemptId,
    super.key,
  });

  final String examId;
  final String attemptId;

  @override
  ConsumerState<StudentAttemptPage> createState() => _StudentAttemptPageState();
}

enum _QuestionVisualState {
  notVisited,
  notAnswered,
  answered,
  markedForReview,
  answeredAndMarked,
  skipped,
  current,
}

enum _NavigatorFilter { all, answered, unanswered, reviewMarked }

enum _SaveIndicatorState { idle, saving, saved, error }

class _StudentAttemptPageState extends ConsumerState<StudentAttemptPage> {
  final Map<String, StudentAttemptAnswer> _answersByQuestion = {};
  final Set<String> _savingQuestionIds = <String>{};
  final Set<String> _visitedQuestionIds = <String>{};
  final Set<String> _skippedQuestionIds = <String>{};

  Timer? _timer;
  Duration _remaining = Duration.zero;
  Duration _serverOffset = Duration.zero;
  int _currentQuestionIndex = 0;
  String? _hydratedAttemptId;
  bool _isSubmitting = false;
  bool _autoSubmitTriggered = false;
  bool _isFullscreen = false;
  bool _showTabletNavigator = true;
  _NavigatorFilter _navigatorFilter = _NavigatorFilter.all;
  _SaveIndicatorState _saveIndicatorState = _SaveIndicatorState.idle;
  DateTime? _lastSyncedAt;
  String? _lastSaveError;
  String? _lastFailedQuestionId;

  @override
  void dispose() {
    _timer?.cancel();
    if (_isFullscreen) {
      unawaited(SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge));
    }
    super.dispose();
  }

  void _hydrateAttempt(StudentAttempt attempt, StudentExamDetail exam) {
    if (_hydratedAttemptId == attempt.id) {
      return;
    }

    _hydratedAttemptId = attempt.id;
    _answersByQuestion
      ..clear()
      ..addEntries(
        attempt.answers.map((answer) => MapEntry(answer.questionId, answer)),
      );
    _visitedQuestionIds
      ..clear()
      ..addAll(_answersByQuestion.keys);
    _skippedQuestionIds
      ..clear()
      ..addAll(
        exam.examQuestions
            .where((question) {
              final answer = _answersByQuestion[question.questionId];
              return answer != null &&
                  (answer.selectedOptionId == null ||
                      answer.selectedOptionId!.isEmpty) &&
                  !answer.isMarkedForReview;
            })
            .map((question) => question.questionId),
      );
    _currentQuestionIndex = _firstIncompleteIndex(exam);
    _markVisitedForCurrentQuestion(exam);
    _serverOffset = attempt.serverTime == null
        ? Duration.zero
        : attempt.serverTime!.difference(DateTime.now().toUtc());
    _startTimer(attempt.expiresAt);
  }

  int _firstIncompleteIndex(StudentExamDetail exam) {
    for (var i = 0; i < exam.examQuestions.length; i++) {
      final question = exam.examQuestions[i];
      final answer = _answersByQuestion[question.questionId];
      if (answer?.selectedOptionId == null ||
          answer!.selectedOptionId!.isEmpty) {
        return i;
      }
    }
    return 0;
  }

  void _markVisitedForCurrentQuestion(StudentExamDetail exam) {
    if (exam.examQuestions.isEmpty) {
      return;
    }
    _visitedQuestionIds.add(exam.examQuestions[_currentQuestionIndex].questionId);
  }

  void _startTimer(DateTime? expiresAt) {
    _timer?.cancel();
    _updateRemaining(expiresAt);
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      _updateRemaining(expiresAt);
    });
  }

  void _updateRemaining(DateTime? expiresAt) {
    if (expiresAt == null) {
      return;
    }

    final now = DateTime.now().toUtc().add(_serverOffset);
    final difference = expiresAt.difference(now);

    if (mounted) {
      setState(() {
        _remaining = difference.isNegative ? Duration.zero : difference;
      });
    }

    if (!difference.isNegative && difference > Duration.zero) {
      return;
    }

    if (_autoSubmitTriggered || _isSubmitting) {
      return;
    }

    _autoSubmitTriggered = true;
    unawaited(_submitAttempt(autoSubmitted: true));
  }

  Future<void> _saveAnswer({
    required StudentExamQuestion question,
    required String? optionId,
    required bool isMarkedForReview,
    bool trackSkip = false,
    bool clearResponse = false,
  }) async {
    setState(() {
      _savingQuestionIds.add(question.questionId);
      _visitedQuestionIds.add(question.questionId);
      _saveIndicatorState = _SaveIndicatorState.saving;
      _lastSaveError = null;
    });

    try {
      final updatedAnswer = await ref
          .read(studentExamRepositoryProvider)
          .saveAnswer(
            attemptId: widget.attemptId,
            questionId: question.questionId,
            selectedOptionId: optionId,
            clearResponse: clearResponse,
            skip: trackSkip,
            isMarkedForReview: isMarkedForReview,
          );
      if (!mounted) {
        return;
      }
      setState(() {
        _answersByQuestion[question.questionId] = updatedAnswer;
        if (trackSkip ||
            (optionId == null || optionId.isEmpty) && !isMarkedForReview) {
          _skippedQuestionIds.add(question.questionId);
        } else {
          _skippedQuestionIds.remove(question.questionId);
        }
        _saveIndicatorState = _SaveIndicatorState.saved;
        _lastSyncedAt = DateTime.now();
        _lastFailedQuestionId = null;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _saveIndicatorState = _SaveIndicatorState.error;
        _lastSaveError = readApiErrorMessage(error);
        _lastFailedQuestionId = question.questionId;
      });
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(readApiErrorMessage(error))));
    } finally {
      if (mounted) {
        setState(() {
          _savingQuestionIds.remove(question.questionId);
        });
      }
    }
  }

  Future<void> _selectOption({
    required StudentExamQuestion question,
    required String? optionId,
  }) async {
    await _saveAnswer(
      question: question,
      optionId: optionId,
      isMarkedForReview:
          _answersByQuestion[question.questionId]?.isMarkedForReview ?? false,
    );
  }

  Future<void> _toggleMarkForReview(StudentExamQuestion question) async {
    final existingAnswer = _answersByQuestion[question.questionId];
    await _saveAnswer(
      question: question,
      optionId: existingAnswer?.selectedOptionId,
      isMarkedForReview: !(existingAnswer?.isMarkedForReview ?? false),
    );
  }

  Future<void> _clearResponse(StudentExamQuestion question) async {
    final existingAnswer = _answersByQuestion[question.questionId];
    await _saveAnswer(
      question: question,
      optionId: null,
      isMarkedForReview: existingAnswer?.isMarkedForReview ?? false,
      clearResponse: true,
    );
  }

  Future<void> _skipQuestion(StudentExamQuestion question) async {
    await _saveAnswer(
      question: question,
      optionId: null,
      isMarkedForReview: false,
      trackSkip: true,
    );
  }

  Future<void> _retryLastSave(StudentExamDetail exam) async {
    if (_lastFailedQuestionId == null) {
      return;
    }
    final question = exam.examQuestions.firstWhere(
      (item) => item.questionId == _lastFailedQuestionId,
      orElse: () => exam.examQuestions[_currentQuestionIndex],
    );
    final answer = _answersByQuestion[question.questionId];
    await _saveAnswer(
      question: question,
      optionId: answer?.selectedOptionId,
      isMarkedForReview: answer?.isMarkedForReview ?? false,
      trackSkip: _skippedQuestionIds.contains(question.questionId),
    );
  }

  Future<void> _submitAttempt({required bool autoSubmitted}) async {
    if (_isSubmitting) {
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      await ref
          .read(studentExamRepositoryProvider)
          .submitAttempt(
            attemptId: widget.attemptId,
            autoSubmitted: autoSubmitted,
          );
      ref.invalidate(studentAttemptsProvider);
      ref.invalidate(studentAttemptSummaryProvider(widget.attemptId));
      if (!mounted) {
        return;
      }
      context.go(
        AppRoutes.studentAttemptSummary(
          examId: widget.examId,
          attemptId: widget.attemptId,
        ),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _autoSubmitTriggered = false;
      });
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(readApiErrorMessage(error))));
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  Future<void> _confirmSubmit(StudentExamDetail exam) async {
    final counts = _buildCounts(exam);
    final shouldSubmit =
        await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Ready to submit?'),
            content: SizedBox(
              width: 420,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Take a final look at your progress before sending this attempt for evaluation.',
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Wrap(
                    spacing: AppSpacing.sm,
                    runSpacing: AppSpacing.sm,
                    children: [
                      _SummaryChip(label: 'Total', value: '${counts.total}'),
                      _SummaryChip(
                        label: 'Answered',
                        value: '${counts.answered}',
                      ),
                      _SummaryChip(
                        label: 'Unanswered',
                        value: '${counts.unanswered}',
                      ),
                      _SummaryChip(
                        label: 'Review',
                        value: '${counts.reviewMarked}',
                      ),
                      _SummaryChip(
                        label: 'Answered + marked',
                        value: '${counts.answeredAndMarked}',
                      ),
                      _SummaryChip(
                        label: 'Skipped',
                        value: '${counts.skipped}',
                      ),
                      _SummaryChip(
                        label: 'Time left',
                        value: _formatDuration(_remaining),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('Review questions'),
              ),
              FilledButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: const Text('Final submit'),
              ),
            ],
          ),
        ) ??
        false;

    if (!shouldSubmit) {
      return;
    }

    await _submitAttempt(autoSubmitted: false);
  }

  Future<void> _toggleFullscreen() async {
    if (_isFullscreen) {
      await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
      if (!mounted) {
        return;
      }
      setState(() {
        _isFullscreen = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Exited focus mode.')),
      );
      return;
    }

    await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    if (!mounted) {
      return;
    }
    setState(() {
      _isFullscreen = true;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Focus mode enabled. Press Esc or use the button to exit.'),
      ),
    );
  }

  void _goToQuestion(StudentExamDetail exam, int index) {
    setState(() {
      _currentQuestionIndex = index;
      _markVisitedForCurrentQuestion(exam);
    });
  }

  void _nextQuestion(StudentExamDetail exam) {
    if (_currentQuestionIndex >= exam.examQuestions.length - 1) {
      return;
    }
    _goToQuestion(exam, _currentQuestionIndex + 1);
  }

  void _previousQuestion(StudentExamDetail exam) {
    if (_currentQuestionIndex <= 0) {
      return;
    }
    _goToQuestion(exam, _currentQuestionIndex - 1);
  }

  _QuestionVisualState _questionStateFor(
    StudentExamQuestion question, {
    required bool isCurrent,
  }) {
    if (isCurrent) {
      return _QuestionVisualState.current;
    }
    final answer = _answersByQuestion[question.questionId];
    final visited = _visitedQuestionIds.contains(question.questionId);
    final skipped = _skippedQuestionIds.contains(question.questionId);
    final marked = answer?.isMarkedForReview ?? false;
    final answered =
        answer?.selectedOptionId != null && answer!.selectedOptionId!.isNotEmpty;

    if (answered && marked) {
      return _QuestionVisualState.answeredAndMarked;
    }
    if (marked) {
      return _QuestionVisualState.markedForReview;
    }
    if (answered) {
      return _QuestionVisualState.answered;
    }
    if (skipped) {
      return _QuestionVisualState.skipped;
    }
    if (visited) {
      return _QuestionVisualState.notAnswered;
    }
    return _QuestionVisualState.notVisited;
  }

  _AttemptCounts _buildCounts(StudentExamDetail exam) {
    var answered = 0;
    var unanswered = 0;
    var reviewMarked = 0;
    var answeredAndMarked = 0;
    var skipped = 0;

    for (final question in exam.examQuestions) {
      final state = _questionStateFor(question, isCurrent: false);
      switch (state) {
        case _QuestionVisualState.answered:
          answered += 1;
        case _QuestionVisualState.answeredAndMarked:
          answered += 1;
          reviewMarked += 1;
          answeredAndMarked += 1;
        case _QuestionVisualState.markedForReview:
          reviewMarked += 1;
          unanswered += 1;
        case _QuestionVisualState.skipped:
          skipped += 1;
          unanswered += 1;
        case _QuestionVisualState.notAnswered:
          unanswered += 1;
        case _QuestionVisualState.notVisited:
          unanswered += 1;
        case _QuestionVisualState.current:
          unanswered += 1;
      }
    }

    return _AttemptCounts(
      total: exam.examQuestions.length,
      answered: answered,
      unanswered: unanswered,
      reviewMarked: reviewMarked,
      answeredAndMarked: answeredAndMarked,
      skipped: skipped,
    );
  }

  Future<void> _handleIntent(_ExamIntent intent, StudentExamDetail exam) async {
    final question = exam.examQuestions[_currentQuestionIndex];
    switch (intent) {
      case _NextIntent():
        _nextQuestion(exam);
      case _PreviousIntent():
        _previousQuestion(exam);
      case _MarkReviewIntent():
        if (!_savingQuestionIds.contains(question.questionId)) {
          await _toggleMarkForReview(question);
        }
      case _SkipIntent():
        if (!_savingQuestionIds.contains(question.questionId)) {
          await _skipQuestion(question);
        }
      case _SelectOptionIntent(index: final index):
        if (index < question.options.length &&
            !_savingQuestionIds.contains(question.questionId)) {
          await _selectOption(question: question, optionId: question.options[index].id);
        }
    }
  }

  Future<void> _openMobileNavigator(StudentExamDetail exam) async {
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) => SizedBox(
        height: MediaQuery.sizeOf(context).height * 0.62,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.md,
            0,
            AppSpacing.md,
            AppSpacing.md,
          ),
          child: _QuestionNavigatorPanel(
            questions: exam.examQuestions,
            currentQuestionIndex: _currentQuestionIndex,
            answersByQuestion: _answersByQuestion,
            visitedQuestionIds: _visitedQuestionIds,
            skippedQuestionIds: _skippedQuestionIds,
            navigatorFilter: _navigatorFilter,
            onFilterChanged: (value) {
              setState(() {
                _navigatorFilter = value;
              });
            },
            onSelectQuestion: (index) {
              Navigator.of(context).pop();
              _goToQuestion(exam, index);
            },
            onRetrySave: _lastSaveError != null ? () => _retryLastSave(exam) : null,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    if (user == null) {
      return const SizedBox.shrink();
    }

    final examValue = ref.watch(studentExamDetailProvider(widget.examId));
    final attemptsValue = ref.watch(studentAttemptsProvider);
    final attemptDetailValue = ref.watch(studentAttemptDetailProvider(widget.attemptId));

    return DashboardShell(
      title: 'Exam Workspace',
      user: user,
      currentRoute: AppRoutes.exams,
      onLogout: () => ref.read(authControllerProvider.notifier).logout(),
      body: examValue.when(
        data: (exam) => attemptDetailValue.when(
          data: (attemptDetail) => attemptsValue.when(
          data: (attempts) {
            StudentAttempt? attempt;
            for (final item in attempts) {
              if (item.id == widget.attemptId) {
                attempt = item;
                break;
              }
            }
            if (attempt == null) {
              return const AppEmptyState(
                title: 'Attempt unavailable',
                message:
                    'We could not find this exam attempt. Return to the exams list and open it again.',
              );
            }

            if (!attempt.isInProgress) {
              return Center(
                child: AppButton(
                  label: 'View attempt summary',
                  onPressed: () => context.go(
                    AppRoutes.studentAttemptSummary(
                      examId: widget.examId,
                      attemptId: widget.attemptId,
                    ),
                  ),
                ),
              );
            }

            final hydratedAttempt = attemptDetail.id.isNotEmpty ? attemptDetail : attempt;
            _hydrateAttempt(hydratedAttempt, exam);
            final question = exam.examQuestions[_currentQuestionIndex];
            final answer = _answersByQuestion[question.questionId];
            final counts = _buildCounts(exam);
            final width = MediaQuery.sizeOf(context).width;
            final isDesktop = width >= 1180;
            final isTablet = width >= 760 && width < 1180;

            final workspace = _ExamWorkspaceShortcuts(
              onIntent: (intent) => _handleIntent(intent, exam),
              child: Column(
                children: [
                  _ExamWorkspaceHeader(
                    examTitle: exam.title,
                    sectionName: question.sectionName,
                    remaining: _remaining,
                    counts: counts,
                    saveIndicatorState: _saveIndicatorState,
                    lastSyncedAt: _lastSyncedAt,
                    lastSaveError: _lastSaveError,
                    currentQuestionNumber: _currentQuestionIndex + 1,
                    totalQuestions: exam.examQuestions.length,
                    isFullscreen: _isFullscreen,
                    onToggleFullscreen: _toggleFullscreen,
                    onSubmit: _isSubmitting ? null : () => _confirmSubmit(exam),
                    onOpenNavigator: isDesktop
                        ? null
                        : () => _openMobileNavigator(exam),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Expanded(
                    child: isDesktop
                        ? Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                flex: 5,
                                child: _QuestionWorkspaceCard(
                                  question: question,
                                  answer: answer,
                                  questionNumber: _currentQuestionIndex + 1,
                                  totalQuestions: exam.examQuestions.length,
                                  isSaving:
                                      _savingQuestionIds.contains(
                                        question.questionId,
                                      ),
                                  onSelectOption: (option) => _selectOption(
                                    question: question,
                                    optionId: option.id,
                                  ),
                                ),
                              ),
                              const SizedBox(width: AppSpacing.lg),
                              SizedBox(
                                width: 312,
                                child: _QuestionNavigatorPanel(
                                  questions: exam.examQuestions,
                                  currentQuestionIndex: _currentQuestionIndex,
                                  answersByQuestion: _answersByQuestion,
                                  visitedQuestionIds: _visitedQuestionIds,
                                  skippedQuestionIds: _skippedQuestionIds,
                                  navigatorFilter: _navigatorFilter,
                                  onFilterChanged: (value) {
                                    setState(() {
                                      _navigatorFilter = value;
                                    });
                                  },
                                  onSelectQuestion: (index) =>
                                      _goToQuestion(exam, index),
                                  onRetrySave: _lastSaveError != null
                                      ? () => _retryLastSave(exam)
                                      : null,
                                ),
                              ),
                            ],
                          )
                        : Column(
                            children: [
                              if (isTablet) ...[
                                _NavigatorToggleCard(
                                  isExpanded: _showTabletNavigator,
                                  onToggle: () {
                                    setState(() {
                                      _showTabletNavigator =
                                          !_showTabletNavigator;
                                    });
                                  },
                                ),
                                const SizedBox(height: AppSpacing.md),
                                if (_showTabletNavigator)
                                  SizedBox(
                                    height: 280,
                                    child: _QuestionNavigatorPanel(
                                      questions: exam.examQuestions,
                                      currentQuestionIndex:
                                          _currentQuestionIndex,
                                      answersByQuestion: _answersByQuestion,
                                      visitedQuestionIds: _visitedQuestionIds,
                                      skippedQuestionIds: _skippedQuestionIds,
                                      navigatorFilter: _navigatorFilter,
                                      onFilterChanged: (value) {
                                        setState(() {
                                          _navigatorFilter = value;
                                        });
                                      },
                                      onSelectQuestion: (index) =>
                                          _goToQuestion(exam, index),
                                      onRetrySave: _lastSaveError != null
                                          ? () => _retryLastSave(exam)
                                          : null,
                                    ),
                                  ),
                                if (_showTabletNavigator)
                                  const SizedBox(height: AppSpacing.md),
                              ],
                              Expanded(
                                child: _QuestionWorkspaceCard(
                                  question: question,
                                  answer: answer,
                                  questionNumber: _currentQuestionIndex + 1,
                                  totalQuestions: exam.examQuestions.length,
                                  isSaving:
                                      _savingQuestionIds.contains(
                                        question.questionId,
                                      ),
                                  onSelectOption: (option) => _selectOption(
                                    question: question,
                                    optionId: option.id,
                                  ),
                                ),
                              ),
                            ],
                          ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  _AttemptActionBar(
                    isSaving: _savingQuestionIds.contains(question.questionId),
                    hasPrevious: _currentQuestionIndex > 0,
                    hasNext: _currentQuestionIndex < exam.examQuestions.length - 1,
                    isMarkedForReview: answer?.isMarkedForReview ?? false,
                    onPrevious: () => _previousQuestion(exam),
                    onSaveAndNext: () => _nextQuestion(exam),
                    onSkip: () async {
                      await _skipQuestion(question);
                      _nextQuestion(exam);
                    },
                    onMarkForReview: () => _toggleMarkForReview(question),
                    onClearResponse: () => _clearResponse(question),
                    onSubmit: _isSubmitting ? null : () => _confirmSubmit(exam),
                  ),
                ],
              ),
            );

            return workspace;
          },
          loading: () => const AppLoader(label: 'Loading attempt session'),
          error: (error, _) =>
              AppErrorState(message: readApiErrorMessage(error)),
        ),
          loading: () => const AppLoader(label: 'Syncing attempt state'),
          error: (error, _) =>
              AppErrorState(message: readApiErrorMessage(error)),
        ),
        loading: () => const AppLoader(label: 'Preparing exam workspace'),
        error: (error, _) =>
            AppErrorState(message: readApiErrorMessage(error)),
      ),
    );
  }
}

class _ExamWorkspaceHeader extends StatelessWidget {
  const _ExamWorkspaceHeader({
    required this.examTitle,
    required this.sectionName,
    required this.remaining,
    required this.counts,
    required this.saveIndicatorState,
    required this.lastSyncedAt,
    required this.lastSaveError,
    required this.currentQuestionNumber,
    required this.totalQuestions,
    required this.isFullscreen,
    required this.onToggleFullscreen,
    required this.onSubmit,
    this.onOpenNavigator,
  });

  final String examTitle;
  final String? sectionName;
  final Duration remaining;
  final _AttemptCounts counts;
  final _SaveIndicatorState saveIndicatorState;
  final DateTime? lastSyncedAt;
  final String? lastSaveError;
  final int currentQuestionNumber;
  final int totalQuestions;
  final bool isFullscreen;
  final VoidCallback onToggleFullscreen;
  final VoidCallback? onSubmit;
  final VoidCallback? onOpenNavigator;

  @override
  Widget build(BuildContext context) {
    final progress = counts.total == 0 ? 0.0 : counts.answered / counts.total;
    final isCompact = MediaQuery.sizeOf(context).width < 900;
    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        children: [
          if (isCompact)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _HeaderTitleBlock(
                  examTitle: examTitle,
                  currentQuestionNumber: currentQuestionNumber,
                  totalQuestions: totalQuestions,
                  sectionName: sectionName,
                  counts: counts,
                  saveIndicatorState: saveIndicatorState,
                  lastSyncedAt: lastSyncedAt,
                  lastSaveError: lastSaveError,
                ),
                const SizedBox(height: AppSpacing.md),
                Row(
                  children: [
                    Expanded(child: _TimerCard(remaining: remaining)),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
                Wrap(
                  spacing: AppSpacing.sm,
                  runSpacing: AppSpacing.sm,
                  children: [
                    if (onOpenNavigator != null)
                      AppButton(
                        label: 'Palette',
                        onPressed: onOpenNavigator,
                        variant: AppButtonVariant.secondary,
                        icon: Icons.grid_view_rounded,
                      ),
                    AppButton(
                      label: isFullscreen ? 'Exit focus' : 'Focus',
                      onPressed: onToggleFullscreen,
                      variant: AppButtonVariant.ghost,
                      icon: isFullscreen
                          ? Icons.fullscreen_exit_rounded
                          : Icons.fullscreen_rounded,
                    ),
                    AppButton(
                      label: 'Submit',
                      onPressed: onSubmit,
                      icon: Icons.send_rounded,
                    ),
                  ],
                ),
              ],
            )
          else
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: _HeaderTitleBlock(
                    examTitle: examTitle,
                    currentQuestionNumber: currentQuestionNumber,
                    totalQuestions: totalQuestions,
                    sectionName: sectionName,
                    counts: counts,
                    saveIndicatorState: saveIndicatorState,
                    lastSyncedAt: lastSyncedAt,
                    lastSaveError: lastSaveError,
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    _TimerCard(remaining: remaining),
                    const SizedBox(height: AppSpacing.sm),
                    Wrap(
                      alignment: WrapAlignment.end,
                      spacing: AppSpacing.sm,
                      runSpacing: AppSpacing.sm,
                      children: [
                        if (onOpenNavigator != null)
                          AppButton(
                            label: 'Questions',
                            onPressed: onOpenNavigator,
                            variant: AppButtonVariant.secondary,
                            icon: Icons.grid_view_rounded,
                          ),
                        AppButton(
                          label: isFullscreen ? 'Exit focus' : 'Focus mode',
                          onPressed: onToggleFullscreen,
                          variant: AppButtonVariant.ghost,
                          icon: isFullscreen
                              ? Icons.fullscreen_exit_rounded
                              : Icons.fullscreen_rounded,
                        ),
                        AppButton(
                          label: 'Submit',
                          onPressed: onSubmit,
                          icon: Icons.send_rounded,
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          const SizedBox(height: AppSpacing.md),
          LinearProgressIndicator(
            value: progress,
            borderRadius: BorderRadius.circular(AppRadius.pill),
            minHeight: 8,
            backgroundColor: AppColors.surfaceStrong,
            color: AppColors.primary,
          ),
        ],
      ),
    );
  }
}

class _TimerCard extends StatelessWidget {
  const _TimerCard({required this.remaining});

  final Duration remaining;

  @override
  Widget build(BuildContext context) {
    final danger = remaining <= const Duration(minutes: 2);
    final warning = !danger && remaining <= const Duration(minutes: 10);
    final bg = danger
        ? AppColors.error.withValues(alpha: 0.14)
        : warning
        ? AppColors.warning.withValues(alpha: 0.14)
        : AppColors.primary.withValues(alpha: 0.1);
    final fg = danger
        ? AppColors.error
        : warning
        ? AppColors.warning
        : AppColors.primary;
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Time left',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: fg,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            _formatDuration(remaining),
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
              color: fg,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            localTimezoneLabel(),
            style: Theme.of(
              context,
            ).textTheme.labelSmall?.copyWith(color: fg.withValues(alpha: 0.78)),
          ),
        ],
      ),
    );
  }
}

class _HeaderTitleBlock extends StatelessWidget {
  const _HeaderTitleBlock({
    required this.examTitle,
    required this.currentQuestionNumber,
    required this.totalQuestions,
    required this.sectionName,
    required this.counts,
    required this.saveIndicatorState,
    required this.lastSyncedAt,
    required this.lastSaveError,
  });

  final String examTitle;
  final int currentQuestionNumber;
  final int totalQuestions;
  final String? sectionName;
  final _AttemptCounts counts;
  final _SaveIndicatorState saveIndicatorState;
  final DateTime? lastSyncedAt;
  final String? lastSaveError;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          examTitle,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          'Question $currentQuestionNumber of $totalQuestions',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: AppColors.textSecondary,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        Wrap(
          spacing: AppSpacing.sm,
          runSpacing: AppSpacing.sm,
          children: [
            AppBadge(label: sectionName ?? 'General section'),
            AppBadge(
              label: '${counts.answered}/${counts.total} answered',
              backgroundColor: AppColors.success.withValues(alpha: 0.12),
              foregroundColor: AppColors.success,
            ),
            AppBadge(
              label: '${counts.skipped} skipped',
              backgroundColor: AppColors.secondary.withValues(alpha: 0.12),
              foregroundColor: AppColors.secondary,
            ),
            AppBadge(
              label: '${counts.reviewMarked} marked',
              backgroundColor: AppColors.warning.withValues(alpha: 0.12),
              foregroundColor: AppColors.warning,
            ),
            _SaveStatusBadge(
              state: saveIndicatorState,
              lastSyncedAt: lastSyncedAt,
              lastSaveError: lastSaveError,
            ),
          ],
        ),
      ],
    );
  }
}

class _SaveStatusBadge extends StatelessWidget {
  const _SaveStatusBadge({
    required this.state,
    required this.lastSyncedAt,
    required this.lastSaveError,
  });

  final _SaveIndicatorState state;
  final DateTime? lastSyncedAt;
  final String? lastSaveError;

  @override
  Widget build(BuildContext context) {
    final (label, bg, fg) = switch (state) {
      _SaveIndicatorState.saving => (
          'Saving...',
          AppColors.warning.withValues(alpha: 0.14),
          AppColors.warning,
        ),
      _SaveIndicatorState.saved => (
          lastSyncedAt == null
              ? 'Saved'
              : 'Saved ${_formatSyncTime(lastSyncedAt!)}',
          AppColors.success.withValues(alpha: 0.14),
          AppColors.success,
        ),
      _SaveIndicatorState.error => (
          lastSaveError == null ? 'Save failed' : 'Retry needed',
          AppColors.error.withValues(alpha: 0.14),
          AppColors.error,
        ),
      _SaveIndicatorState.idle => (
          'Autosave ready',
          AppColors.surfaceStrong,
          AppColors.textSecondary,
        ),
    };

    return AppBadge(label: label, backgroundColor: bg, foregroundColor: fg);
  }
}

class _QuestionWorkspaceCard extends StatelessWidget {
  const _QuestionWorkspaceCard({
    required this.question,
    required this.answer,
    required this.questionNumber,
    required this.totalQuestions,
    required this.isSaving,
    required this.onSelectOption,
  });

  final StudentExamQuestion question;
  final StudentAttemptAnswer? answer;
  final int questionNumber;
  final int totalQuestions;
  final bool isSaving;
  final ValueChanged<StudentExamOption> onSelectOption;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                AppBadge(label: 'Question $questionNumber of $totalQuestions'),
                if (question.isMandatory) ...[
                  const SizedBox(width: AppSpacing.sm),
                  AppBadge(
                    label: 'Mandatory',
                    backgroundColor: AppColors.error.withValues(alpha: 0.12),
                    foregroundColor: AppColors.error,
                  ),
                ],
                const Spacer(),
                Text(
                  '${question.marks} marks',
                  style: Theme.of(context).textTheme.labelLarge,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 220),
              child: Column(
                key: ValueKey(question.questionId),
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  AppRichTextRenderer(
                    content: question.questionText,
                    contentFormat: question.contentFormat,
                    attachments: question.attachments,
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  if (question.supportsChoiceOptions)
                    ...List.generate(question.options.length, (index) {
                      final option = question.options[index];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.md),
                        child: _OptionTile(
                          index: index,
                          labelWidget: AppRichTextRenderer(
                            content: option.optionText,
                            contentFormat: option.contentFormat,
                            compact: true,
                          ),
                          isSelected: answer?.selectedOptionId == option.id,
                          isSaving: isSaving,
                          onTap: () => onSelectOption(option),
                        ),
                      );
                    })
                  else
                    const AppEmptyState(
                      title: 'Unsupported question type',
                      message:
                          'This workspace currently supports single-choice and true/false questions only.',
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

class _QuestionNavigatorPanel extends StatelessWidget {
  const _QuestionNavigatorPanel({
    required this.questions,
    required this.currentQuestionIndex,
    required this.answersByQuestion,
    required this.visitedQuestionIds,
    required this.skippedQuestionIds,
    required this.navigatorFilter,
    required this.onFilterChanged,
    required this.onSelectQuestion,
    this.onRetrySave,
  });

  final List<StudentExamQuestion> questions;
  final int currentQuestionIndex;
  final Map<String, StudentAttemptAnswer> answersByQuestion;
  final Set<String> visitedQuestionIds;
  final Set<String> skippedQuestionIds;
  final _NavigatorFilter navigatorFilter;
  final ValueChanged<_NavigatorFilter> onFilterChanged;
  final ValueChanged<int> onSelectQuestion;
  final VoidCallback? onRetrySave;

  @override
  Widget build(BuildContext context) {
    final visibleIndexes = <int>[];
    for (var index = 0; index < questions.length; index++) {
      final state = _stateFor(index);
      if (_matchesFilter(state)) {
        visibleIndexes.add(index);
      }
    }

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Question palette',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              if (onRetrySave != null)
                TextButton.icon(
                  onPressed: onRetrySave,
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Retry save'),
                ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Use the color states to review progress and jump to any question quickly.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: AppSpacing.md),
          Wrap(
            spacing: AppSpacing.xs,
            runSpacing: AppSpacing.xs,
            children: [
              for (final filter in _NavigatorFilter.values)
                ChoiceChip(
                  label: Text(_labelForFilter(filter)),
                  selected: navigatorFilter == filter,
                  onSelected: (_) => onFilterChanged(filter),
                ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: const [
              _LegendChip(
                label: 'Current',
                color: AppColors.primary,
              ),
              _LegendChip(
                label: 'Answered',
                color: AppColors.success,
              ),
              _LegendChip(
                label: 'Not answered',
                color: AppColors.textSecondary,
              ),
              _LegendChip(
                label: 'Skipped',
                color: AppColors.error,
              ),
              _LegendChip(
                label: 'Marked for review',
                color: AppColors.warning,
              ),
              _LegendChip(
                label: 'Answered + marked',
                color: Color(0xFFB45309),
              ),
              _LegendChip(
                label: 'Not visited',
                color: AppColors.textMuted,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Expanded(
            child: SingleChildScrollView(
              child: Wrap(
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.sm,
                children: [
                  for (final index in visibleIndexes)
                    _NavigatorButton(
                      index: index,
                      state: _stateFor(index),
                      onTap: () => onSelectQuestion(index),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  _QuestionVisualState _stateFor(int index) {
    final question = questions[index];
    if (index == currentQuestionIndex) {
      return _QuestionVisualState.current;
    }
    final answer = answersByQuestion[question.questionId];
    final visited = visitedQuestionIds.contains(question.questionId);
    final skipped = skippedQuestionIds.contains(question.questionId);
    final marked = answer?.isMarkedForReview ?? false;
    final answered =
        answer?.selectedOptionId != null && answer!.selectedOptionId!.isNotEmpty;

    if (answered && marked) {
      return _QuestionVisualState.answeredAndMarked;
    }
    if (marked) {
      return _QuestionVisualState.markedForReview;
    }
    if (answered) {
      return _QuestionVisualState.answered;
    }
    if (skipped) {
      return _QuestionVisualState.skipped;
    }
    if (visited) {
      return _QuestionVisualState.notAnswered;
    }
    return _QuestionVisualState.notVisited;
  }

  bool _matchesFilter(_QuestionVisualState state) {
    return switch (navigatorFilter) {
      _NavigatorFilter.all => true,
      _NavigatorFilter.answered =>
        state == _QuestionVisualState.answered ||
            state == _QuestionVisualState.answeredAndMarked ||
            state == _QuestionVisualState.current,
      _NavigatorFilter.unanswered =>
        state == _QuestionVisualState.notAnswered ||
            state == _QuestionVisualState.notVisited ||
            state == _QuestionVisualState.skipped,
      _NavigatorFilter.reviewMarked =>
        state == _QuestionVisualState.markedForReview ||
            state == _QuestionVisualState.answeredAndMarked,
    };
  }

  String _labelForFilter(_NavigatorFilter filter) {
    return switch (filter) {
      _NavigatorFilter.all => 'All',
      _NavigatorFilter.answered => 'Answered',
      _NavigatorFilter.unanswered => 'Unanswered',
      _NavigatorFilter.reviewMarked => 'Review',
    };
  }
}

class _NavigatorButton extends StatelessWidget {
  const _NavigatorButton({
    required this.index,
    required this.state,
    required this.onTap,
  });

  final int index;
  final _QuestionVisualState state;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final style = _navigatorStyleFor(state);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadius.md),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        width: 48,
        height: 48,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: style.background,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: style.border),
          boxShadow: style.isCurrent
              ? [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.18),
                    blurRadius: 20,
                    spreadRadius: -8,
                    offset: const Offset(0, 10),
                  ),
                ]
              : null,
        ),
        child: Text(
          '${index + 1}',
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
            color: style.foreground,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

class _LegendChip extends StatelessWidget {
  const _LegendChip({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(999),
          ),
        ),
        const SizedBox(width: AppSpacing.xs),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}

class _NavigatorToggleCard extends StatelessWidget {
  const _NavigatorToggleCard({
    required this.isExpanded,
    required this.onToggle,
  });

  final bool isExpanded;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.md,
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              'Question palette',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          AppButton(
            label: isExpanded ? 'Hide palette' : 'Show palette',
            onPressed: onToggle,
            variant: AppButtonVariant.secondary,
            icon: isExpanded
                ? Icons.unfold_less_rounded
                : Icons.grid_view_rounded,
          ),
        ],
      ),
    );
  }
}

class _AttemptActionBar extends StatelessWidget {
  const _AttemptActionBar({
    required this.isSaving,
    required this.hasPrevious,
    required this.hasNext,
    required this.isMarkedForReview,
    required this.onPrevious,
    required this.onSaveAndNext,
    required this.onSkip,
    required this.onMarkForReview,
    required this.onClearResponse,
    required this.onSubmit,
  });

  final bool isSaving;
  final bool hasPrevious;
  final bool hasNext;
  final bool isMarkedForReview;
  final VoidCallback onPrevious;
  final VoidCallback onSaveAndNext;
  final VoidCallback onSkip;
  final VoidCallback onMarkForReview;
  final VoidCallback onClearResponse;
  final VoidCallback? onSubmit;

  @override
  Widget build(BuildContext context) {
    final isCompact = MediaQuery.sizeOf(context).width < 700;
    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Wrap(
        alignment: WrapAlignment.spaceBetween,
        runSpacing: AppSpacing.sm,
        spacing: AppSpacing.sm,
        children: [
          AppButton(
            label: 'Previous',
            onPressed: hasPrevious && !isSaving ? onPrevious : null,
            variant: AppButtonVariant.secondary,
            icon: Icons.arrow_back_rounded,
          ),
          AppButton(
            label: 'Clear Response',
            onPressed: !isSaving ? onClearResponse : null,
            variant: AppButtonVariant.ghost,
            icon: Icons.restart_alt_rounded,
          ),
          AppButton(
            label: isCompact
                ? (isMarkedForReview ? 'Marked' : 'Mark Review')
                : (isMarkedForReview ? 'Review Marked' : 'Mark for Review'),
            onPressed: !isSaving ? onMarkForReview : null,
            variant: AppButtonVariant.ghost,
            icon: isMarkedForReview
                ? Icons.bookmark_rounded
                : Icons.bookmark_border_rounded,
          ),
          AppButton(
            label: isCompact ? 'Skip' : 'Skip Question',
            onPressed: !isSaving ? onSkip : null,
            variant: AppButtonVariant.secondary,
            icon: Icons.fast_forward_rounded,
          ),
          AppButton(
            label: 'Save & Next',
            onPressed: hasNext && !isSaving ? onSaveAndNext : null,
            icon: Icons.arrow_forward_rounded,
          ),
          AppButton(
            label: 'Submit',
            onPressed: !isSaving ? onSubmit : null,
            icon: Icons.send_rounded,
          ),
        ],
      ),
    );
  }
}

class _OptionTile extends StatelessWidget {
  const _OptionTile({
    required this.index,
    required this.labelWidget,
    required this.isSelected,
    required this.isSaving,
    required this.onTap,
  });

  final int index;
  final Widget labelWidget;
  final bool isSelected;
  final bool isSaving;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: isSaving ? null : onTap,
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: Ink(
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primary.withValues(alpha: 0.08)
              : AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.border,
            width: isSelected ? 1.4 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: AppColors.textPrimary.withValues(alpha: 0.03),
              blurRadius: 18,
              spreadRadius: -10,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg,
            vertical: AppSpacing.lg,
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 34,
                height: 34,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: isSelected
                      ? AppColors.primary
                      : AppColors.surfaceStrong,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                child: Text(
                  '${index + 1}',
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    color: isSelected ? Colors.white : AppColors.textSecondary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(child: labelWidget),
              const SizedBox(width: AppSpacing.sm),
              Icon(
                isSelected
                    ? Icons.radio_button_checked_rounded
                    : Icons.radio_button_off_rounded,
                color: isSelected ? AppColors.primary : AppColors.textMuted,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SummaryChip extends StatelessWidget {
  const _SummaryChip({required this.label, required this.value});

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
        color: AppColors.surfaceStrong,
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 2),
          Text(
            value,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _AttemptCounts {
  const _AttemptCounts({
    required this.total,
    required this.answered,
    required this.unanswered,
    required this.reviewMarked,
    required this.answeredAndMarked,
    required this.skipped,
  });

  final int total;
  final int answered;
  final int unanswered;
  final int reviewMarked;
  final int answeredAndMarked;
  final int skipped;
}

class _NavigatorStyle {
  const _NavigatorStyle({
    required this.background,
    required this.border,
    required this.foreground,
    this.isCurrent = false,
  });

  final Color background;
  final Color border;
  final Color foreground;
  final bool isCurrent;
}

_NavigatorStyle _navigatorStyleFor(_QuestionVisualState state) {
  return switch (state) {
    _QuestionVisualState.current => const _NavigatorStyle(
        background: AppColors.primary,
        border: AppColors.primary,
        foreground: Colors.white,
        isCurrent: true,
      ),
    _QuestionVisualState.answered => _NavigatorStyle(
        background: AppColors.success.withValues(alpha: 0.14),
        border: AppColors.success.withValues(alpha: 0.34),
        foreground: AppColors.success,
      ),
    _QuestionVisualState.answeredAndMarked => _NavigatorStyle(
        background: AppColors.warning.withValues(alpha: 0.18),
        border: AppColors.warning.withValues(alpha: 0.38),
        foreground: AppColors.warning,
      ),
    _QuestionVisualState.markedForReview => _NavigatorStyle(
        background: AppColors.warning.withValues(alpha: 0.14),
        border: AppColors.warning.withValues(alpha: 0.34),
        foreground: AppColors.warning,
      ),
    _QuestionVisualState.skipped => _NavigatorStyle(
        background: AppColors.error.withValues(alpha: 0.12),
        border: AppColors.error.withValues(alpha: 0.28),
        foreground: AppColors.error,
      ),
    _QuestionVisualState.notAnswered => _NavigatorStyle(
        background: AppColors.surfaceStrong,
        border: AppColors.border,
        foreground: AppColors.textSecondary,
      ),
    _QuestionVisualState.notVisited => _NavigatorStyle(
        background: AppColors.surface,
        border: AppColors.border.withValues(alpha: 0.9),
        foreground: AppColors.textMuted,
      ),
  };
}

String _formatDuration(Duration duration) {
  final hours = duration.inHours;
  final minutes = duration.inMinutes.remainder(60);
  final seconds = duration.inSeconds.remainder(60);

  if (hours > 0) {
    return '$hours:${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }
  return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
}

String _formatSyncTime(DateTime dateTime) {
  return formatLocalTime(dateTime);
}

sealed class _ExamIntent extends Intent {
  const _ExamIntent();
}

class _NextIntent extends _ExamIntent {
  const _NextIntent();
}

class _PreviousIntent extends _ExamIntent {
  const _PreviousIntent();
}

class _MarkReviewIntent extends _ExamIntent {
  const _MarkReviewIntent();
}

class _SkipIntent extends _ExamIntent {
  const _SkipIntent();
}

class _SelectOptionIntent extends _ExamIntent {
  const _SelectOptionIntent(this.index);

  final int index;
}

class _ExamWorkspaceShortcuts extends StatelessWidget {
  const _ExamWorkspaceShortcuts({
    required this.child,
    required this.onIntent,
  });

  final Widget child;
  final Future<void> Function(_ExamIntent intent) onIntent;

  @override
  Widget build(BuildContext context) {
    return Focus(
      autofocus: true,
      child: Shortcuts(
        shortcuts: const <ShortcutActivator, Intent>{
          SingleActivator(LogicalKeyboardKey.arrowRight): _NextIntent(),
          SingleActivator(LogicalKeyboardKey.arrowLeft): _PreviousIntent(),
          SingleActivator(LogicalKeyboardKey.keyN): _NextIntent(),
          SingleActivator(LogicalKeyboardKey.keyP): _PreviousIntent(),
          SingleActivator(LogicalKeyboardKey.keyM): _MarkReviewIntent(),
          SingleActivator(LogicalKeyboardKey.keyS): _SkipIntent(),
          SingleActivator(LogicalKeyboardKey.digit1): _SelectOptionIntent(0),
          SingleActivator(LogicalKeyboardKey.digit2): _SelectOptionIntent(1),
          SingleActivator(LogicalKeyboardKey.digit3): _SelectOptionIntent(2),
          SingleActivator(LogicalKeyboardKey.digit4): _SelectOptionIntent(3),
        },
        child: Actions(
          actions: <Type, Action<Intent>>{
            _NextIntent: CallbackAction<_NextIntent>(
              onInvoke: (intent) => onIntent(intent),
            ),
            _PreviousIntent: CallbackAction<_PreviousIntent>(
              onInvoke: (intent) => onIntent(intent),
            ),
            _MarkReviewIntent: CallbackAction<_MarkReviewIntent>(
              onInvoke: (intent) => onIntent(intent),
            ),
            _SkipIntent: CallbackAction<_SkipIntent>(
              onInvoke: (intent) => onIntent(intent),
            ),
            _SelectOptionIntent: CallbackAction<_SelectOptionIntent>(
              onInvoke: (intent) => onIntent(intent),
            ),
          },
          child: child,
        ),
      ),
    );
  }
}
