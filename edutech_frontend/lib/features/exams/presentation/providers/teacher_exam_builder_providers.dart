import 'package:education_frontend/features/exams/data/repositories/teacher_exam_builder_repository.dart';
import 'package:education_frontend/features/exams/domain/models/teacher_exam_builder_model.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final teacherExamListProvider = FutureProvider<List<TeacherExamBuilderModel>>((
  ref,
) {
  return ref.watch(teacherExamBuilderRepositoryProvider).fetchExams();
});

final teacherExamDetailProvider =
    FutureProvider.family<TeacherExamBuilderModel, String>((ref, examId) {
      return ref
          .watch(teacherExamBuilderRepositoryProvider)
          .fetchExamDetail(examId);
    });

final selectedTeacherExamIdProvider =
    NotifierProvider<SelectedTeacherExamIdNotifier, String?>(
  SelectedTeacherExamIdNotifier.new,
);

class SelectedTeacherExamIdNotifier extends Notifier<String?> {
  @override
  String? build() => null;

  void set(String? examId) {
    state = examId;
  }
}
