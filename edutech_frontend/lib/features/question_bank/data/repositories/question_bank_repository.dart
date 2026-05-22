import 'package:dio/dio.dart';
import 'package:education_frontend/core/network/api_client.dart';
import 'package:education_frontend/features/question_bank/domain/models/teacher_question_model.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final questionBankRepositoryProvider = Provider<QuestionBankRepository>((ref) {
  return DioQuestionBankRepository(ref.watch(dioProvider));
});

abstract class QuestionBankRepository {
  Future<List<TeacherQuestionModel>> fetchQuestions(
    TeacherQuestionFilterState filters,
  );
  Future<TeacherQuestionPage> fetchQuestionPage(
    TeacherQuestionFilterState filters,
  );
  Future<TeacherQuestionModel> createQuestion(Map<String, dynamic> payload);
  Future<TeacherQuestionModel> updateQuestion(
    String questionId,
    Map<String, dynamic> payload,
  );
  Future<void> createAttachment({
    required String questionId,
    required MultipartFile file,
    required String attachmentType,
    required String title,
    required int displayOrder,
    required String altText,
    required bool isInline,
  });
  Future<QuestionImportPreview> previewImport({
    required String instituteId,
    required MultipartFile file,
  });
  Future<Map<String, dynamic>> finalizeImport({
    required String instituteId,
    required QuestionImportPreview preview,
  });
  Future<Map<String, dynamic>> fetchImportTemplate();
  Future<Map<String, dynamic>> performBulkAction(Map<String, dynamic> payload);
  Future<List<QuestionTagLite>> fetchTags();
  Future<void> createTagMap({
    required String questionId,
    required String tagId,
  });
  Future<void> deleteTagMap(String tagMapId);
}

class DioQuestionBankRepository implements QuestionBankRepository {
  DioQuestionBankRepository(this._dio);

  final Dio _dio;

  @override
  Future<TeacherQuestionModel> createQuestion(
    Map<String, dynamic> payload,
  ) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'question-bank/questions/',
      data: payload,
    );
    return TeacherQuestionModel.fromJson(response.data ?? <String, dynamic>{});
  }

  @override
  Future<List<TeacherQuestionModel>> fetchQuestions(
    TeacherQuestionFilterState filters,
  ) async {
    final page = await fetchQuestionPage(filters);
    return page.items;
  }

  @override
  Future<TeacherQuestionPage> fetchQuestionPage(
    TeacherQuestionFilterState filters,
  ) async {
    final response = await _dio.get<Map<String, dynamic>>(
      'question-bank/questions/',
      queryParameters: filters.toQueryParameters(),
    );
    final rawItems = response.data?['results'] as List<dynamic>? ?? <dynamic>[];
    final items = rawItems
        .whereType<Map<String, dynamic>>()
        .map(TeacherQuestionModel.fromJson)
        .toList();
    return TeacherQuestionPage(
      items: items,
      totalCount: response.data?['count'] as int? ?? items.length,
      next: response.data?['next'] as String?,
      previous: response.data?['previous'] as String?,
    );
  }

  @override
  Future<TeacherQuestionModel> updateQuestion(
    String questionId,
    Map<String, dynamic> payload,
  ) async {
    final response = await _dio.patch<Map<String, dynamic>>(
      'question-bank/questions/$questionId/',
      data: payload,
    );
    return TeacherQuestionModel.fromJson(response.data ?? <String, dynamic>{});
  }

  @override
  Future<void> createAttachment({
    required String questionId,
    required MultipartFile file,
    required String attachmentType,
    required String title,
    required int displayOrder,
    required String altText,
    required bool isInline,
  }) async {
    await _dio.post(
      'question-bank/attachments/',
      data: FormData.fromMap({
        'question': questionId,
        'file': file,
        'attachment_type': attachmentType,
        'title': title,
        'display_order': displayOrder,
        'alt_text': altText,
        'is_inline': isInline,
        'is_active': true,
      }),
    );
  }

  @override
  Future<QuestionImportPreview> previewImport({
    required String instituteId,
    required MultipartFile file,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'question-bank/questions/preview-import/',
      data: FormData.fromMap({'institute': instituteId, 'file': file}),
    );
    return QuestionImportPreview.fromJson(
      response.data ?? <String, dynamic>{},
    );
  }

  @override
  Future<Map<String, dynamic>> finalizeImport({
    required String instituteId,
    required QuestionImportPreview preview,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'question-bank/questions/finalize-import/',
      data: {
        'institute': instituteId,
        'preview_rows': preview.rows
            .map(
              (row) => {
                'row_number': row.rowNumber,
                'status': row.status,
                'question_text': row.questionText,
                'subject_name': row.subjectName,
                'topic_name': row.topicName,
                'question_type': row.questionType,
                'difficulty_level': row.difficultyLevel,
                'tag_values': row.tagValues,
                'errors': row.errors,
              },
            )
            .toList(),
        'valid_payloads': preview.validPayloads,
      },
    );
    return response.data ?? <String, dynamic>{};
  }

  @override
  Future<Map<String, dynamic>> fetchImportTemplate() async {
    final response = await _dio.get<Map<String, dynamic>>(
      'question-bank/questions/import-template/',
    );
    return response.data ?? <String, dynamic>{};
  }

  @override
  Future<Map<String, dynamic>> performBulkAction(
    Map<String, dynamic> payload,
  ) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'question-bank/questions/bulk-action/',
      data: payload,
    );
    return response.data ?? <String, dynamic>{};
  }

  @override
  Future<List<QuestionTagLite>> fetchTags() async {
    final response = await _dio.get<Map<String, dynamic>>('question-bank/tags/');
    final rawItems = response.data?['results'] as List<dynamic>? ?? <dynamic>[];
    return rawItems
        .whereType<Map<String, dynamic>>()
        .map(QuestionTagLite.fromJson)
        .toList();
  }

  @override
  Future<void> createTagMap({
    required String questionId,
    required String tagId,
  }) async {
    await _dio.post(
      'question-bank/tag-maps/',
      data: {'question': questionId, 'tag': tagId, 'is_active': true},
    );
  }

  @override
  Future<void> deleteTagMap(String tagMapId) async {
    await _dio.delete('question-bank/tag-maps/$tagMapId/');
  }
}
