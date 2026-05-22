import 'package:dio/dio.dart';
import 'package:education_frontend/core/network/api_client.dart';
import 'package:education_frontend/features/results/domain/models/exam_result_model.dart';
import 'package:education_frontend/features/results/domain/models/exam_summary_model.dart';
import 'package:education_frontend/features/results/domain/models/leaderboard_row_model.dart';
import 'package:education_frontend/features/results/domain/models/teacher_exam_attempt_model.dart';
import 'package:education_frontend/features/results/domain/models/teacher_question_analysis_model.dart';
import 'package:education_frontend/features/results/domain/models/topic_performance_model.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final resultsRepositoryProvider = Provider<ResultsRepository>((ref) {
  return DioResultsRepository(ref.watch(dioProvider));
});

abstract class ResultsRepository {
  Future<List<ExamResultModel>> fetchStudentResults();
  Future<List<ExamResultModel>> fetchStudentPerformance(String studentId);
  Future<List<ExamSummaryModel>> fetchTeacherResultSummaries();
  Future<List<ExamSummaryModel>> fetchExamSummaries();
  Future<List<LeaderboardRowModel>> fetchExamLeaderboard(String examId);
  Future<List<TeacherExamAttemptModel>> fetchExamAttempts(String examId);
  Future<List<TeacherQuestionAnalysisModel>> fetchQuestionAnalysis(String examId);
  Future<List<TopicPerformanceModel>> fetchTopicPerformance({
    String? examId,
    String? studentId,
  });
}

class DioResultsRepository implements ResultsRepository {
  DioResultsRepository(this._dio);

  final Dio _dio;

  @override
  Future<List<ExamResultModel>> fetchStudentResults() async {
    final response = await _dio.get<dynamic>('student/results/');
    return _mapList(_extractItems(response.data), ExamResultModel.fromJson);
  }

  @override
  Future<List<ExamResultModel>> fetchStudentPerformance(
    String studentId,
  ) async {
    final response = await _dio.get<dynamic>(
      'results/student/$studentId/performance/',
    );
    return _mapList(_extractItems(response.data), ExamResultModel.fromJson);
  }

  @override
  Future<List<ExamSummaryModel>> fetchTeacherResultSummaries() async {
    final response = await _dio.get<dynamic>('teacher/results/summary/');
    return _mapList(_extractItems(response.data), ExamSummaryModel.fromJson);
  }

  @override
  Future<List<ExamSummaryModel>> fetchExamSummaries() async {
    final response = await _dio.get<dynamic>('results/exam-summary/');
    return _mapList(_extractItems(response.data), ExamSummaryModel.fromJson);
  }

  @override
  Future<List<LeaderboardRowModel>> fetchExamLeaderboard(String examId) async {
    final response = await _dio.get<dynamic>(
      'results/exam/$examId/leaderboard/',
    );
    return _mapList(_extractItems(response.data), LeaderboardRowModel.fromJson);
  }

  @override
  Future<List<TeacherExamAttemptModel>> fetchExamAttempts(String examId) async {
    final response = await _dio.get<dynamic>(
      'results/exam/$examId/attempts/',
    );
    return _mapList(
      _extractItems(response.data),
      TeacherExamAttemptModel.fromJson,
    );
  }

  @override
  Future<List<TeacherQuestionAnalysisModel>> fetchQuestionAnalysis(
    String examId,
  ) async {
    final response = await _dio.get<dynamic>(
      'results/exam/$examId/question-analysis/',
    );
    return _mapList(
      _extractItems(response.data),
      TeacherQuestionAnalysisModel.fromJson,
    );
  }

  @override
  Future<List<TopicPerformanceModel>> fetchTopicPerformance({
    String? examId,
    String? studentId,
  }) async {
    final response = await _dio.get<dynamic>(
      'results/topic-performance/',
      queryParameters: {
        if (examId != null && examId.isNotEmpty) 'exam': examId,
        if (studentId != null && studentId.isNotEmpty) 'student': studentId,
      },
    );
    return _mapList(
      _extractItems(response.data),
      TopicPerformanceModel.fromJson,
    );
  }

  List<dynamic> _extractItems(dynamic raw) {
    if (raw is List<dynamic>) {
      return raw;
    }
    if (raw is Map<String, dynamic>) {
      final results = raw['results'];
      if (results is List<dynamic>) {
        return results;
      }
    }
    return const <dynamic>[];
  }

  List<T> _mapList<T>(
    List<dynamic> raw,
    T Function(Map<String, dynamic>) fromJson,
  ) {
    return raw.whereType<Map<String, dynamic>>().map(fromJson).toList();
  }
}
