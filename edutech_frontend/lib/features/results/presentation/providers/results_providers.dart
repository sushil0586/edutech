import 'package:education_frontend/features/results/data/repositories/results_repository.dart';
import 'package:education_frontend/features/results/domain/models/exam_result_model.dart';
import 'package:education_frontend/features/results/domain/models/exam_summary_model.dart';
import 'package:education_frontend/features/results/domain/models/leaderboard_row_model.dart';
import 'package:education_frontend/features/results/domain/models/teacher_exam_attempt_model.dart';
import 'package:education_frontend/features/results/domain/models/teacher_question_analysis_model.dart';
import 'package:education_frontend/features/results/domain/models/topic_performance_model.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final studentResultRecordsProvider = FutureProvider.autoDispose<List<ExamResultModel>>((
  ref,
) {
  return ref.watch(resultsRepositoryProvider).fetchStudentResults();
});

final studentPerformanceProvider =
    FutureProvider.autoDispose.family<List<ExamResultModel>, String>((ref, studentId) {
      return ref
          .watch(resultsRepositoryProvider)
          .fetchStudentPerformance(studentId);
    });

final teacherExamSummariesProvider = FutureProvider.autoDispose<List<ExamSummaryModel>>((
  ref,
) {
  return ref.watch(resultsRepositoryProvider).fetchTeacherResultSummaries();
});

final examSummaryRecordsProvider = FutureProvider.autoDispose<List<ExamSummaryModel>>((
  ref,
) {
  return ref.watch(resultsRepositoryProvider).fetchExamSummaries();
});

final examLeaderboardProvider =
    FutureProvider.autoDispose.family<List<LeaderboardRowModel>, String>((ref, examId) {
      return ref.watch(resultsRepositoryProvider).fetchExamLeaderboard(examId);
    });

final teacherExamAttemptsProvider =
    FutureProvider.autoDispose.family<List<TeacherExamAttemptModel>, String>((ref, examId) {
      return ref.watch(resultsRepositoryProvider).fetchExamAttempts(examId);
    });

final teacherQuestionAnalysisProvider =
    FutureProvider.autoDispose.family<List<TeacherQuestionAnalysisModel>, String>((
      ref,
      examId,
    ) {
      return ref.watch(resultsRepositoryProvider).fetchQuestionAnalysis(examId);
    });

final topicPerformanceProvider =
    FutureProvider.autoDispose.family<List<TopicPerformanceModel>, TopicPerformanceQuery>((
      ref,
      query,
    ) {
      return ref
          .watch(resultsRepositoryProvider)
          .fetchTopicPerformance(
            examId: query.examId,
            studentId: query.studentId,
          );
    });

class TopicPerformanceQuery {
  const TopicPerformanceQuery({this.examId, this.studentId});

  final String? examId;
  final String? studentId;

  @override
  bool operator ==(Object other) {
    return other is TopicPerformanceQuery &&
        other.examId == examId &&
        other.studentId == studentId;
  }

  @override
  int get hashCode => Object.hash(examId, studentId);
}
