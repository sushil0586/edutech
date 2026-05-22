import 'package:education_frontend/features/dashboard/data/repositories/dashboard_repository.dart';
import 'package:education_frontend/features/dashboard/domain/models/student_dashboard_data.dart';
import 'package:education_frontend/features/dashboard/domain/models/student_exam_item.dart';
import 'package:education_frontend/features/dashboard/domain/models/student_insight_summary.dart';
import 'package:education_frontend/features/dashboard/domain/models/student_result_item.dart';
import 'package:education_frontend/features/dashboard/domain/models/teacher_dashboard_data.dart';
import 'package:education_frontend/features/dashboard/domain/models/teacher_exam_item.dart';
import 'package:education_frontend/features/dashboard/domain/models/teacher_insight_summary.dart';
import 'package:education_frontend/features/dashboard/domain/models/teacher_question_item.dart';
import 'package:education_frontend/features/dashboard/domain/models/teacher_question_performance_item.dart';
import 'package:education_frontend/features/dashboard/domain/models/teacher_result_summary_item.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final studentDashboardProvider = FutureProvider<StudentDashboardData>((ref) {
  return ref.watch(dashboardRepositoryProvider).fetchStudentDashboardData();
});

final studentAvailableExamsProvider = FutureProvider<List<StudentExamItem>>((
  ref,
) {
  return ref.watch(dashboardRepositoryProvider).fetchStudentAvailableExams();
});

final studentResultsProvider = FutureProvider<List<StudentResultItem>>((ref) {
  return ref.watch(dashboardRepositoryProvider).fetchStudentResults();
});

final teacherDashboardProvider = FutureProvider<TeacherDashboardData>((ref) {
  return ref.watch(dashboardRepositoryProvider).fetchTeacherDashboardData();
});

final teacherExamsProvider = FutureProvider<List<TeacherExamItem>>((ref) {
  return ref.watch(dashboardRepositoryProvider).fetchTeacherExams();
});

final teacherQuestionsProvider = FutureProvider<List<TeacherQuestionItem>>((
  ref,
) {
  return ref.watch(dashboardRepositoryProvider).fetchTeacherQuestions();
});

final studentInsightSummaryProvider = FutureProvider<StudentInsightSummary>((ref) {
  return ref.watch(dashboardRepositoryProvider).fetchStudentInsightSummary();
});

final teacherInsightSummaryProvider = FutureProvider<TeacherInsightSummary>((ref) {
  return ref.watch(dashboardRepositoryProvider).fetchTeacherInsightSummary();
});

final teacherQuestionPerformanceProvider =
    FutureProvider<List<TeacherQuestionPerformanceItem>>((ref) {
      return ref
          .watch(dashboardRepositoryProvider)
          .fetchTeacherQuestionPerformance();
    });

final teacherResultSummaryProvider =
    FutureProvider<List<TeacherResultSummaryItem>>((ref) {
      return ref
          .watch(dashboardRepositoryProvider)
          .fetchTeacherResultSummaries();
    });
