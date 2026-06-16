import 'package:dio/dio.dart';
import 'package:education_frontend/core/network/api_client.dart';
import 'package:education_frontend/features/exams/domain/models/student_exam_detail.dart';
import 'package:education_frontend/features/exams/domain/models/teacher_exam_builder_model.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final teacherExamBuilderRepositoryProvider =
    Provider<TeacherExamBuilderRepository>((ref) {
      return DioTeacherExamBuilderRepository(ref.watch(dioProvider));
    });

abstract class TeacherExamBuilderRepository {
  Future<List<TeacherExamBuilderModel>> fetchExams();
  Future<TeacherExamBuilderModel> fetchExamDetail(String examId);
  Future<TeacherExamBuilderModel> createExam(Map<String, dynamic> payload);
  Future<TeacherExamBuilderModel> updateExam(
    String examId,
    Map<String, dynamic> payload,
  );
  Future<StudentExamDetail> fetchExamPreview(String examId);
  Future<TeacherExamQuestionLinkModel> addExamQuestion(
    Map<String, dynamic> payload,
  );
  Future<TeacherExamSectionModel> createExamSection(
    Map<String, dynamic> payload,
  );
  Future<TeacherExamSectionModel> updateExamSection(
    String sectionId,
    Map<String, dynamic> payload,
  );
  Future<void> deleteExamSection(String sectionId);
  Future<TeacherExamQuestionLinkModel> updateExamQuestion(
    String examQuestionId,
    Map<String, dynamic> payload,
  );
  Future<void> deleteExamQuestion(String examQuestionId);
  Future<TeacherExamBuilderModel> syncMarks(String examId);
  Future<TeacherExamBuilderModel> publishExam(String examId);
  Future<TeacherExamBuilderModel> refreshExamStatus(String examId);
  Future<TeacherExamBuilderModel> markExamLive(String examId);
  Future<TeacherExamBuilderModel> markExamCompleted(String examId);
  Future<TeacherExamBuilderModel> cancelExam(String examId);
  Future<List<AssignableStudentModel>> fetchAssignableStudents({
    required String academicYearId,
    required String programId,
    String? cohortId,
  });
  Future<TeacherExamBuilderModel> assignStudents(
    String examId,
    Map<String, dynamic> payload,
  );
}

class DioTeacherExamBuilderRepository implements TeacherExamBuilderRepository {
  DioTeacherExamBuilderRepository(this._dio);

  final Dio _dio;

  Map<String, dynamic> _extractActionData(Map<String, dynamic>? payload) {
    final raw = payload ?? <String, dynamic>{};
    final data = raw['data'];
    if (data is Map<String, dynamic>) {
      return data;
    }
    return raw;
  }

  @override
  Future<TeacherExamQuestionLinkModel> addExamQuestion(
    Map<String, dynamic> payload,
  ) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'exams/questions/',
      data: payload,
    );
    return TeacherExamQuestionLinkModel.fromJson(
      response.data ?? <String, dynamic>{},
    );
  }

  @override
  Future<TeacherExamBuilderModel> createExam(
    Map<String, dynamic> payload,
  ) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'exams/',
      data: payload,
    );
    return TeacherExamBuilderModel.fromJson(
      response.data ?? <String, dynamic>{},
    );
  }

  @override
  Future<TeacherExamSectionModel> createExamSection(
    Map<String, dynamic> payload,
  ) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'exams/sections/',
      data: payload,
    );
    return TeacherExamSectionModel.fromJson(
      response.data ?? <String, dynamic>{},
    );
  }

  @override
  Future<StudentExamDetail> fetchExamPreview(String examId) async {
    final response = await _dio.get<Map<String, dynamic>>(
      'exams/$examId/preview/',
    );
    return StudentExamDetail.fromJson(response.data ?? <String, dynamic>{});
  }

  @override
  Future<void> deleteExamQuestion(String examQuestionId) async {
    await _dio.delete('exams/questions/$examQuestionId/');
  }

  @override
  Future<void> deleteExamSection(String sectionId) async {
    await _dio.delete('exams/sections/$sectionId/');
  }

  @override
  Future<TeacherExamBuilderModel> fetchExamDetail(String examId) async {
    final response = await _dio.get<Map<String, dynamic>>('exams/$examId/');
    return TeacherExamBuilderModel.fromJson(
      response.data ?? <String, dynamic>{},
    );
  }

  @override
  Future<List<TeacherExamBuilderModel>> fetchExams() async {
    final response = await _dio.get<Map<String, dynamic>>('exams/');
    final rawItems = response.data?['results'] as List<dynamic>? ?? <dynamic>[];
    return rawItems
        .whereType<Map<String, dynamic>>()
        .map(TeacherExamBuilderModel.fromJson)
        .toList();
  }

  @override
  Future<TeacherExamBuilderModel> publishExam(String examId) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'exams/$examId/publish/',
      data: const {'remarks': 'Published from Flutter teacher builder'},
    );
    return TeacherExamBuilderModel.fromJson(_extractActionData(response.data));
  }

  @override
  Future<TeacherExamBuilderModel> refreshExamStatus(String examId) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'exams/$examId/refresh-status/',
      data: const {'remarks': 'Status refreshed from Flutter teacher builder'},
    );
    return TeacherExamBuilderModel.fromJson(_extractActionData(response.data));
  }

  @override
  Future<TeacherExamBuilderModel> markExamLive(String examId) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'exams/$examId/mark-live/',
      data: const {'remarks': 'Marked live from Flutter teacher builder'},
    );
    return TeacherExamBuilderModel.fromJson(_extractActionData(response.data));
  }

  @override
  Future<TeacherExamBuilderModel> markExamCompleted(String examId) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'exams/$examId/mark-completed/',
      data: const {'remarks': 'Marked completed from Flutter teacher builder'},
    );
    return TeacherExamBuilderModel.fromJson(_extractActionData(response.data));
  }

  @override
  Future<TeacherExamBuilderModel> cancelExam(String examId) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'exams/$examId/cancel/',
      data: const {'remarks': 'Cancelled from Flutter teacher builder'},
    );
    return TeacherExamBuilderModel.fromJson(_extractActionData(response.data));
  }

  @override
  Future<List<AssignableStudentModel>> fetchAssignableStudents({
    required String academicYearId,
    required String programId,
    String? cohortId,
  }) async {
    final response = await _dio.get<Map<String, dynamic>>(
      'students/',
      queryParameters: {
        'academic_year': academicYearId,
        'program': programId,
        if (cohortId != null && cohortId.isNotEmpty) 'cohort': cohortId,
        'is_active': true,
      },
    );
    final rawItems = response.data?['results'] as List<dynamic>? ?? <dynamic>[];
    return rawItems
        .whereType<Map<String, dynamic>>()
        .map(AssignableStudentModel.fromJson)
        .toList();
  }

  @override
  Future<TeacherExamBuilderModel> assignStudents(
    String examId,
    Map<String, dynamic> payload,
  ) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'exams/$examId/assign-students/',
      data: payload,
    );
    return TeacherExamBuilderModel.fromJson(_extractActionData(response.data));
  }

  @override
  Future<TeacherExamSectionModel> updateExamSection(
    String sectionId,
    Map<String, dynamic> payload,
  ) async {
    final response = await _dio.patch<Map<String, dynamic>>(
      'exams/sections/$sectionId/',
      data: payload,
    );
    return TeacherExamSectionModel.fromJson(
      response.data ?? <String, dynamic>{},
    );
  }

  @override
  Future<TeacherExamBuilderModel> syncMarks(String examId) async {
    await _dio.post<Map<String, dynamic>>('exams/$examId/sync-marks/');
    return fetchExamDetail(examId);
  }

  @override
  Future<TeacherExamBuilderModel> updateExam(
    String examId,
    Map<String, dynamic> payload,
  ) async {
    final response = await _dio.patch<Map<String, dynamic>>(
      'exams/$examId/',
      data: payload,
    );
    return TeacherExamBuilderModel.fromJson(
      response.data ?? <String, dynamic>{},
    );
  }

  @override
  Future<TeacherExamQuestionLinkModel> updateExamQuestion(
    String examQuestionId,
    Map<String, dynamic> payload,
  ) async {
    final response = await _dio.patch<Map<String, dynamic>>(
      'exams/questions/$examQuestionId/',
      data: payload,
    );
    return TeacherExamQuestionLinkModel.fromJson(
      response.data ?? <String, dynamic>{},
    );
  }
}
