import 'package:dio/dio.dart';
import 'package:education_frontend/core/network/api_client.dart';
import 'package:education_frontend/features/academics/domain/models/academic_setup_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final academicSetupRepositoryProvider = Provider<AcademicSetupRepository>((
  ref,
) {
  return DioAcademicSetupRepository(ref.watch(dioProvider));
});

abstract class AcademicSetupRepository {
  Future<List<InstituteAdminModel>> fetchInstitutes(SetupQuery query);
  Future<InstituteAdminModel> updateInstitute(
    String id,
    Map<String, dynamic> payload,
  );
  Future<List<AcademicYearAdminModel>> fetchAcademicYears(SetupQuery query);
  Future<List<ProgramAdminModel>> fetchPrograms(SetupQuery query);
  Future<List<CohortAdminModel>> fetchCohorts(SetupQuery query);
  Future<List<SubjectAdminModel>> fetchSubjects(SetupQuery query);
  Future<List<TopicAdminModel>> fetchTopics(SetupQuery query);
  Future<List<StudentProfileAdminModel>> fetchStudents(SetupQuery query);
  Future<List<TeacherProfileAdminModel>> fetchTeachers(SetupQuery query);
  Future<List<TeacherAssignmentAdminModel>> fetchTeacherAssignments(
    SetupQuery query,
  );

  Future<AcademicYearAdminModel> createAcademicYear(
    Map<String, dynamic> payload,
  );
  Future<AcademicYearAdminModel> updateAcademicYear(
    String id,
    Map<String, dynamic> payload,
  );
  Future<ProgramAdminModel> createProgram(Map<String, dynamic> payload);
  Future<ProgramAdminModel> updateProgram(
    String id,
    Map<String, dynamic> payload,
  );
  Future<CohortAdminModel> createCohort(Map<String, dynamic> payload);
  Future<CohortAdminModel> updateCohort(
    String id,
    Map<String, dynamic> payload,
  );
  Future<SubjectAdminModel> createSubject(Map<String, dynamic> payload);
  Future<SubjectAdminModel> updateSubject(
    String id,
    Map<String, dynamic> payload,
  );
  Future<TopicAdminModel> createTopic(Map<String, dynamic> payload);
  Future<TopicAdminModel> updateTopic(String id, Map<String, dynamic> payload);
  Future<StudentProfileAdminModel> createStudent(Map<String, dynamic> payload);
  Future<StudentProfileAdminModel> updateStudent(
    String id,
    Map<String, dynamic> payload,
  );
  Future<TeacherProfileAdminModel> createTeacher(Map<String, dynamic> payload);
  Future<TeacherProfileAdminModel> updateTeacher(
    String id,
    Map<String, dynamic> payload,
  );
  Future<TeacherAssignmentAdminModel> createTeacherAssignment(
    Map<String, dynamic> payload,
  );
  Future<TeacherAssignmentAdminModel> updateTeacherAssignment(
    String id,
    Map<String, dynamic> payload,
  );
  Future<CredentialActionResult> createStudentLogin(
    String studentId,
    Map<String, dynamic> payload,
  );
  Future<CredentialActionResult> createTeacherLogin(
    String teacherId,
    Map<String, dynamic> payload,
  );
  Future<CredentialActionResult> resetUserPassword(
    String userId,
    Map<String, dynamic> payload,
  );
  Future<CredentialActionResult> disableUserLogin(String userId);
  Future<CredentialActionResult> enableUserLogin(String userId);
  Future<Map<String, dynamic>> fetchStudentImportTemplate();
  Future<Map<String, dynamic>> fetchTeacherImportTemplate();
  Future<RosterImportPreview> previewStudentImport({
    required String instituteId,
    required MultipartFile file,
  });
  Future<RosterImportPreview> previewTeacherImport({
    required String instituteId,
    required MultipartFile file,
  });
  Future<BulkImportResult> finalizeStudentImport({
    required String instituteId,
    required RosterImportPreview preview,
  });
  Future<BulkImportResult> finalizeTeacherImport({
    required String instituteId,
    required RosterImportPreview preview,
  });
}

class DioAcademicSetupRepository implements AcademicSetupRepository {
  DioAcademicSetupRepository(this._dio);

  final Dio _dio;

  @override
  Future<List<InstituteAdminModel>> fetchInstitutes(SetupQuery query) async {
    final response = await _dio.get<dynamic>(
      'institutes/',
      queryParameters: _queryParams(query),
    );
    return _mapCollection(response.data, InstituteAdminModel.fromJson);
  }

  @override
  Future<InstituteAdminModel> updateInstitute(
    String id,
    Map<String, dynamic> payload,
  ) async {
    return _update('institutes/$id/', payload, InstituteAdminModel.fromJson);
  }

  @override
  Future<List<AcademicYearAdminModel>> fetchAcademicYears(
    SetupQuery query,
  ) async {
    final response = await _dio.get<dynamic>(
      'academics/academic-years/',
      queryParameters: _queryParams(query),
    );
    return _mapCollection(response.data, AcademicYearAdminModel.fromJson);
  }

  @override
  Future<List<ProgramAdminModel>> fetchPrograms(SetupQuery query) async {
    final response = await _dio.get<dynamic>(
      'academics/programs/',
      queryParameters: _queryParams(query),
    );
    return _mapCollection(response.data, ProgramAdminModel.fromJson);
  }

  @override
  Future<List<CohortAdminModel>> fetchCohorts(SetupQuery query) async {
    final response = await _dio.get<dynamic>(
      'academics/cohorts/',
      queryParameters: _queryParams(query),
    );
    return _mapCollection(response.data, CohortAdminModel.fromJson);
  }

  @override
  Future<List<SubjectAdminModel>> fetchSubjects(SetupQuery query) async {
    final response = await _dio.get<dynamic>(
      'academics/subjects/',
      queryParameters: _queryParams(query),
    );
    return _mapCollection(response.data, SubjectAdminModel.fromJson);
  }

  @override
  Future<List<TopicAdminModel>> fetchTopics(SetupQuery query) async {
    final response = await _dio.get<dynamic>(
      'academics/topics/',
      queryParameters: _queryParams(query),
    );
    return _mapCollection(response.data, TopicAdminModel.fromJson);
  }

  @override
  Future<List<StudentProfileAdminModel>> fetchStudents(SetupQuery query) async {
    final response = await _dio.get<dynamic>(
      'students/',
      queryParameters: _queryParams(query),
    );
    return _mapCollection(response.data, StudentProfileAdminModel.fromJson);
  }

  @override
  Future<List<TeacherProfileAdminModel>> fetchTeachers(SetupQuery query) async {
    final response = await _dio.get<dynamic>(
      'teachers/',
      queryParameters: _queryParams(query),
    );
    return _mapCollection(response.data, TeacherProfileAdminModel.fromJson);
  }

  @override
  Future<List<TeacherAssignmentAdminModel>> fetchTeacherAssignments(
    SetupQuery query,
  ) async {
    final response = await _dio.get<dynamic>(
      'teachers/assignments/',
      queryParameters: _queryParams(query),
    );
    return _mapCollection(response.data, TeacherAssignmentAdminModel.fromJson);
  }

  @override
  Future<AcademicYearAdminModel> createAcademicYear(
    Map<String, dynamic> payload,
  ) async {
    return _create(
      'academics/academic-years/',
      payload,
      AcademicYearAdminModel.fromJson,
    );
  }

  @override
  Future<AcademicYearAdminModel> updateAcademicYear(
    String id,
    Map<String, dynamic> payload,
  ) async {
    return _update(
      'academics/academic-years/$id/',
      payload,
      AcademicYearAdminModel.fromJson,
    );
  }

  @override
  Future<ProgramAdminModel> createProgram(Map<String, dynamic> payload) async {
    return _create('academics/programs/', payload, ProgramAdminModel.fromJson);
  }

  @override
  Future<ProgramAdminModel> updateProgram(
    String id,
    Map<String, dynamic> payload,
  ) async {
    return _update(
      'academics/programs/$id/',
      payload,
      ProgramAdminModel.fromJson,
    );
  }

  @override
  Future<CohortAdminModel> createCohort(Map<String, dynamic> payload) async {
    return _create('academics/cohorts/', payload, CohortAdminModel.fromJson);
  }

  @override
  Future<CohortAdminModel> updateCohort(
    String id,
    Map<String, dynamic> payload,
  ) async {
    return _update(
      'academics/cohorts/$id/',
      payload,
      CohortAdminModel.fromJson,
    );
  }

  @override
  Future<SubjectAdminModel> createSubject(Map<String, dynamic> payload) async {
    return _create('academics/subjects/', payload, SubjectAdminModel.fromJson);
  }

  @override
  Future<SubjectAdminModel> updateSubject(
    String id,
    Map<String, dynamic> payload,
  ) async {
    return _update(
      'academics/subjects/$id/',
      payload,
      SubjectAdminModel.fromJson,
    );
  }

  @override
  Future<TopicAdminModel> createTopic(Map<String, dynamic> payload) async {
    return _create('academics/topics/', payload, TopicAdminModel.fromJson);
  }

  @override
  Future<TopicAdminModel> updateTopic(
    String id,
    Map<String, dynamic> payload,
  ) async {
    return _update('academics/topics/$id/', payload, TopicAdminModel.fromJson);
  }

  @override
  Future<StudentProfileAdminModel> createStudent(
    Map<String, dynamic> payload,
  ) async {
    return _create('students/', payload, StudentProfileAdminModel.fromJson);
  }

  @override
  Future<StudentProfileAdminModel> updateStudent(
    String id,
    Map<String, dynamic> payload,
  ) async {
    return _update('students/$id/', payload, StudentProfileAdminModel.fromJson);
  }

  @override
  Future<TeacherProfileAdminModel> createTeacher(
    Map<String, dynamic> payload,
  ) async {
    return _create('teachers/', payload, TeacherProfileAdminModel.fromJson);
  }

  @override
  Future<TeacherProfileAdminModel> updateTeacher(
    String id,
    Map<String, dynamic> payload,
  ) async {
    return _update('teachers/$id/', payload, TeacherProfileAdminModel.fromJson);
  }

  @override
  Future<TeacherAssignmentAdminModel> createTeacherAssignment(
    Map<String, dynamic> payload,
  ) async {
    return _create(
      'teachers/assignments/',
      payload,
      TeacherAssignmentAdminModel.fromJson,
    );
  }

  @override
  Future<TeacherAssignmentAdminModel> updateTeacherAssignment(
    String id,
    Map<String, dynamic> payload,
  ) async {
    return _update(
      'teachers/assignments/$id/',
      payload,
      TeacherAssignmentAdminModel.fromJson,
    );
  }

  @override
  Future<CredentialActionResult> createStudentLogin(
    String studentId,
    Map<String, dynamic> payload,
  ) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'accounts/students/$studentId/create-login/',
      data: payload,
    );
    return CredentialActionResult.fromJson(response.data ?? const {});
  }

  @override
  Future<CredentialActionResult> createTeacherLogin(
    String teacherId,
    Map<String, dynamic> payload,
  ) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'accounts/teachers/$teacherId/create-login/',
      data: payload,
    );
    return CredentialActionResult.fromJson(response.data ?? const {});
  }

  @override
  Future<CredentialActionResult> resetUserPassword(
    String userId,
    Map<String, dynamic> payload,
  ) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'accounts/users/$userId/reset-password/',
      data: payload,
    );
    return CredentialActionResult.fromJson(response.data ?? const {});
  }

  @override
  Future<CredentialActionResult> disableUserLogin(String userId) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'accounts/users/$userId/disable/',
      data: const {},
    );
    return CredentialActionResult.fromJson(response.data ?? const {});
  }

  @override
  Future<CredentialActionResult> enableUserLogin(String userId) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'accounts/users/$userId/enable/',
      data: const {},
    );
    return CredentialActionResult.fromJson(response.data ?? const {});
  }

  @override
  Future<Map<String, dynamic>> fetchStudentImportTemplate() async {
    final response = await _dio.get<Map<String, dynamic>>(
      'students/import-template/',
    );
    return response.data ?? <String, dynamic>{};
  }

  @override
  Future<Map<String, dynamic>> fetchTeacherImportTemplate() async {
    final response = await _dio.get<Map<String, dynamic>>(
      'teachers/import-template/',
    );
    return response.data ?? <String, dynamic>{};
  }

  @override
  Future<RosterImportPreview> previewStudentImport({
    required String instituteId,
    required MultipartFile file,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'students/preview-import/',
      data: FormData.fromMap({'institute': instituteId, 'file': file}),
    );
    return RosterImportPreview.fromJson(response.data ?? <String, dynamic>{});
  }

  @override
  Future<RosterImportPreview> previewTeacherImport({
    required String instituteId,
    required MultipartFile file,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'teachers/preview-import/',
      data: FormData.fromMap({'institute': instituteId, 'file': file}),
    );
    return RosterImportPreview.fromJson(response.data ?? <String, dynamic>{});
  }

  @override
  Future<BulkImportResult> finalizeStudentImport({
    required String instituteId,
    required RosterImportPreview preview,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'students/finalize-import/',
      data: {'institute': instituteId, 'valid_payloads': preview.validPayloads},
    );
    return BulkImportResult.fromJson(response.data ?? <String, dynamic>{});
  }

  @override
  Future<BulkImportResult> finalizeTeacherImport({
    required String instituteId,
    required RosterImportPreview preview,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'teachers/finalize-import/',
      data: {'institute': instituteId, 'valid_payloads': preview.validPayloads},
    );
    return BulkImportResult.fromJson(response.data ?? <String, dynamic>{});
  }

  Future<T> _create<T>(
    String path,
    Map<String, dynamic> payload,
    T Function(Map<String, dynamic>) fromJson,
  ) async {
    final response = await _dio.post<Map<String, dynamic>>(path, data: payload);
    return fromJson(response.data ?? <String, dynamic>{});
  }

  Future<T> _update<T>(
    String path,
    Map<String, dynamic> payload,
    T Function(Map<String, dynamic>) fromJson,
  ) async {
    final response = await _dio.patch<Map<String, dynamic>>(
      path,
      data: payload,
    );
    return fromJson(response.data ?? <String, dynamic>{});
  }

  Map<String, dynamic> _queryParams(SetupQuery query) {
    return {
      if (query.search.trim().isNotEmpty) 'search': query.search.trim(),
      if (query.isActive != null) 'is_active': query.isActive,
      if (query.instituteId != null && query.instituteId!.isNotEmpty)
        'institute': query.instituteId,
      'page_size': 100,
    };
  }

  List<T> _mapCollection<T>(
    dynamic raw,
    T Function(Map<String, dynamic>) fromJson,
  ) {
    if (raw is List) {
      return raw.whereType<Map<String, dynamic>>().map(fromJson).toList();
    }
    if (raw is Map<String, dynamic>) {
      final results = raw['results'];
      if (results is List) {
        return results.whereType<Map<String, dynamic>>().map(fromJson).toList();
      }
    }
    return <T>[];
  }
}

class CredentialActionResult {
  const CredentialActionResult({
    required this.userId,
    required this.username,
    this.generatedPassword,
    this.role,
    this.isActive,
  });

  final String? userId;
  final String? username;
  final String? generatedPassword;
  final String? role;
  final bool? isActive;

  factory CredentialActionResult.fromJson(Map<String, dynamic> json) {
    return CredentialActionResult(
      userId: json['user_id']?.toString(),
      username: json['username']?.toString(),
      generatedPassword: json['generated_password']?.toString(),
      role: json['role']?.toString(),
      isActive: json['is_active'] as bool?,
    );
  }
}
