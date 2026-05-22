import 'package:dio/dio.dart';
import 'package:education_frontend/core/network/api_client.dart';
import 'package:education_frontend/features/academics/domain/models/academic_lookup_option.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final academicLookupRepositoryProvider = Provider<AcademicLookupRepository>((
  ref,
) {
  return DioAcademicLookupRepository(ref.watch(dioProvider));
});

abstract class AcademicLookupRepository {
  Future<List<AcademicLookupOption>> fetchAcademicYears();
  Future<List<AcademicLookupOption>> fetchPrograms();
  Future<List<AcademicLookupOption>> fetchCohorts();
  Future<List<AcademicLookupOption>> fetchSubjects();
  Future<List<AcademicLookupOption>> fetchTopics({String? subjectId});
}

class DioAcademicLookupRepository implements AcademicLookupRepository {
  DioAcademicLookupRepository(this._dio);

  final Dio _dio;

  @override
  Future<List<AcademicLookupOption>> fetchAcademicYears() async {
    return _fetchOptions('academics/academic-years/');
  }

  @override
  Future<List<AcademicLookupOption>> fetchCohorts() async {
    return _fetchOptions('academics/cohorts/');
  }

  @override
  Future<List<AcademicLookupOption>> fetchPrograms() async {
    return _fetchOptions('academics/programs/');
  }

  @override
  Future<List<AcademicLookupOption>> fetchSubjects() async {
    return _fetchOptions('academics/subjects/');
  }

  @override
  Future<List<AcademicLookupOption>> fetchTopics({String? subjectId}) async {
    return _fetchOptions(
      'academics/topics/',
      queryParameters: subjectId == null ? null : {'subject': subjectId},
    );
  }

  Future<List<AcademicLookupOption>> _fetchOptions(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    final response = await _dio.get<Map<String, dynamic>>(
      path,
      queryParameters: queryParameters,
    );
    final rawItems = response.data?['results'] as List<dynamic>? ?? <dynamic>[];
    return rawItems
        .whereType<Map<String, dynamic>>()
        .map(AcademicLookupOption.fromJson)
        .toList();
  }
}
