import 'package:dio/dio.dart';
import 'package:education_frontend/core/network/api_client.dart';
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

final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) {
  return DioDashboardRepository(ref.watch(dioProvider));
});

abstract class DashboardRepository {
  Future<StudentDashboardData> fetchStudentDashboardData();
  Future<List<StudentExamItem>> fetchStudentAvailableExams();
  Future<List<StudentResultItem>> fetchStudentResults();
  Future<StudentInsightSummary> fetchStudentInsightSummary();
  Future<TeacherDashboardData> fetchTeacherDashboardData();
  Future<List<TeacherExamItem>> fetchTeacherExams();
  Future<List<TeacherQuestionItem>> fetchTeacherQuestions();
  Future<TeacherInsightSummary> fetchTeacherInsightSummary();
  Future<List<TeacherQuestionPerformanceItem>> fetchTeacherQuestionPerformance();
  Future<List<TeacherResultSummaryItem>> fetchTeacherResultSummaries();
}

class DioDashboardRepository implements DashboardRepository {
  DioDashboardRepository(this._dio);

  final Dio _dio;

  @override
  Future<StudentDashboardData> fetchStudentDashboardData() async {
    final exams = await fetchStudentAvailableExams();
    final results = await fetchStudentResults();
    final insightSummary = await fetchStudentInsightSummary();
    return StudentDashboardData(
      availableExams: exams,
      recentResults: results.take(5).toList(),
      insightSummary: insightSummary,
    );
  }

  @override
  Future<List<StudentExamItem>> fetchStudentAvailableExams() async {
    final response = await _dio.get<List<dynamic>>('student/exams/available/');
    final items = response.data ?? <dynamic>[];
    return items
        .whereType<Map<String, dynamic>>()
        .map(StudentExamItem.fromJson)
        .toList();
  }

  @override
  Future<List<StudentResultItem>> fetchStudentResults() async {
    final response = await _dio.get<List<dynamic>>('student/results/');
    final items = response.data ?? <dynamic>[];
    return items
        .whereType<Map<String, dynamic>>()
        .map(StudentResultItem.fromJson)
        .toList();
  }

  @override
  Future<StudentInsightSummary> fetchStudentInsightSummary() async {
    final response = await _dio.get<Map<String, dynamic>>(
      'student/insights/summary/',
    );
    return StudentInsightSummary.fromJson(
      response.data ?? <String, dynamic>{},
    );
  }

  @override
  Future<TeacherDashboardData> fetchTeacherDashboardData() async {
    final exams = await fetchTeacherExams();
    final questions = await fetchTeacherQuestions();
    final summaries = await fetchTeacherResultSummaries();
    final insightSummary = await fetchTeacherInsightSummary();
    final questionPerformance = await fetchTeacherQuestionPerformance();
    return TeacherDashboardData(
      exams: exams,
      questions: questions,
      resultSummaries: summaries,
      insightSummary: insightSummary,
      questionPerformance: questionPerformance,
    );
  }

  @override
  Future<List<TeacherExamItem>> fetchTeacherExams() async {
    final response = await _dio.get<List<dynamic>>('teacher/exams/');
    final items = response.data ?? <dynamic>[];
    return items
        .whereType<Map<String, dynamic>>()
        .map(TeacherExamItem.fromJson)
        .toList();
  }

  @override
  Future<List<TeacherQuestionItem>> fetchTeacherQuestions() async {
    final response = await _dio.get<List<dynamic>>('teacher/questions/');
    final items = response.data ?? <dynamic>[];
    return items
        .whereType<Map<String, dynamic>>()
        .map(TeacherQuestionItem.fromJson)
        .toList();
  }

  @override
  Future<TeacherInsightSummary> fetchTeacherInsightSummary() async {
    final response = await _dio.get<Map<String, dynamic>>(
      'teacher/insights/summary/',
    );
    return TeacherInsightSummary.fromJson(
      response.data ?? <String, dynamic>{},
    );
  }

  @override
  Future<List<TeacherQuestionPerformanceItem>> fetchTeacherQuestionPerformance() async {
    final response = await _dio.get<List<dynamic>>(
      'teacher/questions/performance/',
    );
    final items = response.data ?? <dynamic>[];
    return items
        .whereType<Map<String, dynamic>>()
        .map(TeacherQuestionPerformanceItem.fromJson)
        .toList();
  }

  @override
  Future<List<TeacherResultSummaryItem>> fetchTeacherResultSummaries() async {
    final response = await _dio.get<List<dynamic>>('teacher/results/summary/');
    final items = response.data ?? <dynamic>[];
    return items
        .whereType<Map<String, dynamic>>()
        .map(TeacherResultSummaryItem.fromJson)
        .toList();
  }
}
