import 'package:education_frontend/features/dashboard/presentation/providers/dashboard_providers.dart';
import 'package:education_frontend/features/exams/presentation/providers/teacher_exam_builder_providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';


void invalidateTeacherExamList(WidgetRef ref, {String? examId, bool includeDashboard = false}) {
  ref.invalidate(teacherExamListProvider);
  if (examId != null && examId.isNotEmpty) {
    ref.invalidate(teacherExamDetailProvider(examId));
  }
  if (includeDashboard) {
    ref.invalidate(teacherExamsProvider);
  }
}


void selectAndRefreshTeacherExam(
  WidgetRef ref, {
  required String examId,
  bool includeDashboard = true,
}) {
  invalidateTeacherExamList(ref, examId: examId, includeDashboard: includeDashboard);
  ref.read(selectedTeacherExamIdProvider.notifier).set(examId);
}
