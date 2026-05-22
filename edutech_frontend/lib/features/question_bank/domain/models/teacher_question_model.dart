import 'package:education_frontend/shared/domain/models/rich_attachment_model.dart';

class TeacherQuestionModel {
  const TeacherQuestionModel({
    required this.id,
    required this.instituteId,
    required this.programId,
    required this.subjectId,
    required this.topicId,
    required this.createdByTeacherId,
    required this.questionType,
    required this.difficultyLevel,
    required this.contentFormat,
    required this.questionText,
    required this.explanation,
    required this.defaultMarks,
    required this.negativeMarks,
    required this.isActive,
    required this.isVerified,
    required this.options,
    this.attachments = const [],
    this.tags = const [],
    this.metadata = const <String, dynamic>{},
    this.usageCount = 0,
    this.correctCount = 0,
    this.wrongCount = 0,
    this.skippedCount = 0,
    this.correctAttemptPercentage = '0.00',
    this.wrongAttemptPercentage = '0.00',
    this.skipPercentage = '0.00',
    this.hasExplanationOverride,
  });

  final String id;
  final String instituteId;
  final String? programId;
  final String subjectId;
  final String? topicId;
  final String? createdByTeacherId;
  final String questionType;
  final String difficultyLevel;
  final String contentFormat;
  final String questionText;
  final String explanation;
  final String defaultMarks;
  final String negativeMarks;
  final bool isActive;
  final bool isVerified;
  final List<TeacherQuestionOptionModel> options;
  final List<RichAttachmentModel> attachments;
  final List<TeacherQuestionTagModel> tags;
  final Map<String, dynamic> metadata;
  final int usageCount;
  final int correctCount;
  final int wrongCount;
  final int skippedCount;
  final String correctAttemptPercentage;
  final String wrongAttemptPercentage;
  final String skipPercentage;
  final bool? hasExplanationOverride;

  bool get hasExplanation => hasExplanationOverride ?? explanation.trim().isNotEmpty;
  bool get hasCorrectOption => options.any((option) => option.isCorrect);
  bool get hasMinimumOptions =>
      questionType == 'true_false' ? options.length == 2 : options.length >= 2;
  bool get isQualityReady => hasCorrectOption && hasMinimumOptions && hasExplanation;
  bool get isDraft => metadata['is_draft'] == true;

  factory TeacherQuestionModel.fromJson(Map<String, dynamic> json) {
    final options =
        (json['options'] as List<dynamic>? ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(TeacherQuestionOptionModel.fromJson)
            .toList()
          ..sort((a, b) => a.optionOrder.compareTo(b.optionOrder));
    final tags =
        (json['tag_maps'] as List<dynamic>? ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(TeacherQuestionTagModel.fromJson)
            .toList();
    final attachments =
        (json['attachments'] as List<dynamic>? ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(RichAttachmentModel.fromJson)
            .toList()
          ..sort((a, b) => a.displayOrder.compareTo(b.displayOrder));

    return TeacherQuestionModel(
      id: (json['id'] ?? '').toString(),
      instituteId: (json['institute'] ?? '').toString(),
      programId: json['program']?.toString(),
      subjectId: (json['subject'] ?? '').toString(),
      topicId: json['topic']?.toString(),
      createdByTeacherId: json['created_by_teacher']?.toString(),
      questionType: json['question_type'] as String? ?? 'mcq_single',
      difficultyLevel: json['difficulty_level'] as String? ?? 'intermediate',
      contentFormat: json['content_format'] as String? ?? 'markdown_latex',
      questionText: json['question_text'] as String? ?? '',
      explanation: json['explanation'] as String? ?? '',
      defaultMarks: (json['default_marks'] ?? '0').toString(),
      negativeMarks: (json['negative_marks'] ?? '0').toString(),
      isActive: json['is_active'] as bool? ?? true,
      isVerified: json['is_verified'] as bool? ?? false,
      attachments: attachments,
      tags: tags,
      metadata: json['metadata'] as Map<String, dynamic>? ?? const <String, dynamic>{},
      usageCount: json['usage_count'] as int? ?? 0,
      correctCount: json['correct_count'] as int? ?? 0,
      wrongCount: json['wrong_count'] as int? ?? 0,
      skippedCount: json['skipped_count'] as int? ?? 0,
      correctAttemptPercentage:
          (json['correct_attempt_percentage'] ?? '0.00').toString(),
      wrongAttemptPercentage:
          (json['wrong_attempt_percentage'] ?? '0.00').toString(),
      skipPercentage: (json['skip_percentage'] ?? '0.00').toString(),
      hasExplanationOverride: json['has_explanation'] as bool?,
      options: options,
    );
  }
}

class TeacherQuestionTagModel {
  const TeacherQuestionTagModel({
    required this.mapId,
    required this.id,
    required this.name,
    required this.code,
  });

  final String mapId;
  final String id;
  final String name;
  final String code;

  factory TeacherQuestionTagModel.fromJson(Map<String, dynamic> json) {
    final detail = json['tag_detail'] as Map<String, dynamic>? ?? const <String, dynamic>{};
    return TeacherQuestionTagModel(
      mapId: (json['id'] ?? '').toString(),
      id: (json['tag'] ?? '').toString(),
      name: detail['name'] as String? ?? 'Tag',
      code: detail['code'] as String? ?? '-',
    );
  }
}

class TeacherQuestionOptionModel {
  const TeacherQuestionOptionModel({
    required this.id,
    required this.contentFormat,
    required this.optionText,
    required this.optionOrder,
    required this.isCorrect,
    required this.isActive,
  });

  final String? id;
  final String contentFormat;
  final String optionText;
  final int optionOrder;
  final bool isCorrect;
  final bool isActive;

  factory TeacherQuestionOptionModel.fromJson(Map<String, dynamic> json) {
    return TeacherQuestionOptionModel(
      id: json['id']?.toString(),
      contentFormat: json['content_format'] as String? ?? 'markdown_latex',
      optionText: json['option_text'] as String? ?? '',
      optionOrder: json['option_order'] as int? ?? 0,
      isCorrect: json['is_correct'] as bool? ?? false,
      isActive: json['is_active'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null && id!.isNotEmpty) 'id': id,
      'content_format': contentFormat,
      'option_text': optionText,
      'option_order': optionOrder,
      'is_correct': isCorrect,
      'is_active': isActive,
    };
  }
}

class TeacherQuestionFilterState {
  const TeacherQuestionFilterState({
    this.subjectId,
    this.topicId,
    this.questionType,
    this.difficultyLevel,
    this.missingExplanationOnly = false,
    this.ordering,
    this.page = 1,
    this.pageSize = 20,
    this.search = '',
  });

  final String? subjectId;
  final String? topicId;
  final String? questionType;
  final String? difficultyLevel;
  final bool missingExplanationOnly;
  final String? ordering;
  final int page;
  final int pageSize;
  final String search;

  TeacherQuestionFilterState copyWith({
    String? subjectId,
    bool clearSubject = false,
    String? topicId,
    bool clearTopic = false,
    String? questionType,
    bool clearQuestionType = false,
    String? difficultyLevel,
    bool clearDifficultyLevel = false,
    bool? missingExplanationOnly,
    String? ordering,
    bool clearOrdering = false,
    int? page,
    int? pageSize,
    String? search,
  }) {
    return TeacherQuestionFilterState(
      subjectId: clearSubject ? null : (subjectId ?? this.subjectId),
      topicId: clearTopic ? null : (topicId ?? this.topicId),
      questionType: clearQuestionType
          ? null
          : (questionType ?? this.questionType),
      difficultyLevel: clearDifficultyLevel
          ? null
          : (difficultyLevel ?? this.difficultyLevel),
      missingExplanationOnly:
          missingExplanationOnly ?? this.missingExplanationOnly,
      ordering: clearOrdering ? null : (ordering ?? this.ordering),
      page: page ?? this.page,
      pageSize: pageSize ?? this.pageSize,
      search: search ?? this.search,
    );
  }

  Map<String, dynamic> toQueryParameters() {
    return {
      if (subjectId != null && subjectId!.isNotEmpty) 'subject': subjectId,
      if (topicId != null && topicId!.isNotEmpty) 'topic': topicId,
      if (questionType != null && questionType!.isNotEmpty)
        'question_type': questionType,
      if (difficultyLevel != null && difficultyLevel!.isNotEmpty)
        'difficulty_level': difficultyLevel,
      if (ordering != null && ordering!.isNotEmpty) 'ordering': ordering,
      'page': page,
      'page_size': pageSize,
      if (missingExplanationOnly) 'missing_explanation': true,
      if (search.trim().isNotEmpty) 'search': search.trim(),
    };
  }
}

class TeacherQuestionPage {
  const TeacherQuestionPage({
    required this.items,
    required this.totalCount,
    required this.next,
    required this.previous,
  });

  final List<TeacherQuestionModel> items;
  final int totalCount;
  final String? next;
  final String? previous;
}

class QuestionImportPreview {
  const QuestionImportPreview({
    required this.totalRows,
    required this.validRows,
    required this.invalidRows,
    required this.rows,
    required this.validPayloads,
  });

  final int totalRows;
  final int validRows;
  final int invalidRows;
  final List<QuestionImportPreviewRow> rows;
  final List<Map<String, dynamic>> validPayloads;

  factory QuestionImportPreview.fromJson(Map<String, dynamic> json) {
    return QuestionImportPreview(
      totalRows: json['total_rows'] as int? ?? 0,
      validRows: json['valid_rows'] as int? ?? 0,
      invalidRows: json['invalid_rows'] as int? ?? 0,
      rows:
          (json['rows'] as List<dynamic>? ?? const <dynamic>[])
              .whereType<Map<String, dynamic>>()
              .map(QuestionImportPreviewRow.fromJson)
              .toList(),
      validPayloads:
          (json['valid_payloads'] as List<dynamic>? ?? const <dynamic>[])
              .whereType<Map<String, dynamic>>()
              .toList(),
    );
  }
}

class QuestionImportPreviewRow {
  const QuestionImportPreviewRow({
    required this.rowNumber,
    required this.status,
    required this.questionText,
    required this.subjectName,
    required this.topicName,
    required this.questionType,
    required this.difficultyLevel,
    required this.tagValues,
    required this.errors,
  });

  final int rowNumber;
  final String status;
  final String questionText;
  final String subjectName;
  final String topicName;
  final String questionType;
  final String difficultyLevel;
  final List<String> tagValues;
  final Map<String, dynamic> errors;

  bool get isValid => status == 'valid';

  factory QuestionImportPreviewRow.fromJson(Map<String, dynamic> json) {
    return QuestionImportPreviewRow(
      rowNumber: json['row_number'] as int? ?? 0,
      status: json['status'] as String? ?? 'invalid',
      questionText: json['question_text'] as String? ?? '',
      subjectName: json['subject_name'] as String? ?? '',
      topicName: json['topic_name'] as String? ?? '',
      questionType: json['question_type'] as String? ?? 'mcq_single',
      difficultyLevel: json['difficulty_level'] as String? ?? 'intermediate',
      tagValues:
          (json['tag_values'] as List<dynamic>? ?? const <dynamic>[])
              .map((item) => item.toString())
              .toList(),
      errors: json['errors'] as Map<String, dynamic>? ?? const {},
    );
  }
}

class QuestionTagLite {
  const QuestionTagLite({
    required this.id,
    required this.name,
    required this.code,
  });

  final String id;
  final String name;
  final String code;

  factory QuestionTagLite.fromJson(Map<String, dynamic> json) {
    return QuestionTagLite(
      id: (json['id'] ?? '').toString(),
      name: json['name'] as String? ?? 'Tag',
      code: json['code'] as String? ?? '-',
    );
  }
}
