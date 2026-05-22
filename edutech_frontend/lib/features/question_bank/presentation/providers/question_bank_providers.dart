import 'package:education_frontend/features/question_bank/data/repositories/question_bank_repository.dart';
import 'package:education_frontend/features/question_bank/domain/models/teacher_question_model.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final questionFilterProvider =
    NotifierProvider<QuestionFilterNotifier, TeacherQuestionFilterState>(
  QuestionFilterNotifier.new,
);

final filteredQuestionsProvider = FutureProvider<List<TeacherQuestionModel>>((
  ref,
) {
  final filters = ref.watch(questionFilterProvider);
  return ref.watch(questionBankRepositoryProvider).fetchQuestions(filters).then((
    questions,
  ) {
    if (!filters.missingExplanationOnly) {
      return questions;
    }
    return questions.where((question) => !question.hasExplanation).toList();
  });
});

final questionPageProvider = FutureProvider<TeacherQuestionPage>((ref) {
  final filters = ref.watch(questionFilterProvider);
  return ref.watch(questionBankRepositoryProvider).fetchQuestionPage(filters);
});

final selectedQuestionIdsProvider =
    NotifierProvider<SelectedQuestionIdsNotifier, Set<String>>(
      SelectedQuestionIdsNotifier.new,
    );

final compactQuestionViewProvider =
    NotifierProvider<CompactQuestionViewNotifier, bool>(
      CompactQuestionViewNotifier.new,
    );

class QuestionFilterNotifier extends Notifier<TeacherQuestionFilterState> {
  @override
  TeacherQuestionFilterState build() {
    return const TeacherQuestionFilterState();
  }

  void update(TeacherQuestionFilterState next) {
    state = next;
  }
}

class SelectedQuestionIdsNotifier extends Notifier<Set<String>> {
  @override
  Set<String> build() => <String>{};

  void toggle(String questionId) {
    final next = {...state};
    if (!next.add(questionId)) {
      next.remove(questionId);
    }
    state = next;
  }

  void clear() {
    state = <String>{};
  }

  void replaceAll(Iterable<String> ids) {
    state = {...ids};
  }
}

class CompactQuestionViewNotifier extends Notifier<bool> {
  @override
  bool build() => false;

  void set(bool value) {
    state = value;
  }
}
