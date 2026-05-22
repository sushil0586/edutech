class TeacherExamBuilderModel {
  const TeacherExamBuilderModel({
    required this.id,
    required this.instituteId,
    required this.academicYearId,
    required this.programId,
    required this.cohortId,
    required this.subjectId,
    required this.title,
    required this.code,
    required this.description,
    required this.examType,
    required this.deliveryMode,
    required this.status,
    required this.durationMinutes,
    required this.totalMarks,
    required this.passingMarks,
    required this.startAt,
    required this.endAt,
    required this.instructions,
    required this.allowLateSubmit,
    required this.randomizeQuestions,
    required this.randomizeOptions,
    required this.showResultImmediately,
    required this.allowReviewAfterSubmit,
    required this.maxAttempts,
    required this.subjectName,
    required this.programName,
    required this.examQuestions,
  });

  final String id;
  final String instituteId;
  final String academicYearId;
  final String programId;
  final String? cohortId;
  final String? subjectId;
  final String title;
  final String code;
  final String description;
  final String examType;
  final String deliveryMode;
  final String status;
  final int durationMinutes;
  final String totalMarks;
  final String passingMarks;
  final DateTime? startAt;
  final DateTime? endAt;
  final String instructions;
  final bool allowLateSubmit;
  final bool randomizeQuestions;
  final bool randomizeOptions;
  final bool showResultImmediately;
  final bool allowReviewAfterSubmit;
  final int maxAttempts;
  final String? subjectName;
  final String? programName;
  final List<TeacherExamQuestionLinkModel> examQuestions;

  factory TeacherExamBuilderModel.fromJson(Map<String, dynamic> json) {
    final examQuestions =
        (json['exam_questions'] as List<dynamic>? ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(TeacherExamQuestionLinkModel.fromJson)
            .toList()
          ..sort((a, b) => a.questionOrder.compareTo(b.questionOrder));

    return TeacherExamBuilderModel(
      id: (json['id'] ?? '').toString(),
      instituteId: (json['institute'] ?? '').toString(),
      academicYearId: (json['academic_year'] ?? '').toString(),
      programId: (json['program'] ?? '').toString(),
      cohortId: json['cohort']?.toString(),
      subjectId: json['subject']?.toString(),
      title: (json['title'] ?? 'Exam').toString(),
      code: (json['code'] ?? '-').toString(),
      description: (json['description'] ?? '').toString(),
      examType: (json['exam_type'] ?? 'test').toString(),
      deliveryMode: (json['delivery_mode'] ?? 'online').toString(),
      status: (json['status'] ?? 'draft').toString(),
      durationMinutes: _readInt(json['duration_minutes']),
      totalMarks: (json['total_marks'] ?? '0').toString(),
      passingMarks: (json['passing_marks'] ?? '0').toString(),
      startAt: DateTime.tryParse(json['start_at']?.toString() ?? ''),
      endAt: DateTime.tryParse(json['end_at']?.toString() ?? ''),
      instructions: (json['instructions'] ?? '').toString(),
      allowLateSubmit: json['allow_late_submit'] as bool? ?? false,
      randomizeQuestions: json['randomize_questions'] as bool? ?? false,
      randomizeOptions: json['randomize_options'] as bool? ?? false,
      showResultImmediately: json['show_result_immediately'] as bool? ?? false,
      allowReviewAfterSubmit:
          json['allow_review_after_submit'] as bool? ?? false,
      maxAttempts: _readInt(json['max_attempts'], fallback: 1),
      subjectName: json['subject_name']?.toString(),
      programName: json['program_name']?.toString(),
      examQuestions: examQuestions,
    );
  }
}

class TeacherExamQuestionLinkModel {
  const TeacherExamQuestionLinkModel({
    required this.id,
    required this.examId,
    required this.questionId,
    required this.questionTextSummary,
    required this.sectionName,
    required this.questionOrder,
    required this.marks,
    required this.negativeMarks,
    required this.isMandatory,
    required this.isActive,
  });

  final String id;
  final String examId;
  final String questionId;
  final String questionTextSummary;
  final String? sectionName;
  final int questionOrder;
  final String? marks;
  final String? negativeMarks;
  final bool isMandatory;
  final bool isActive;

  factory TeacherExamQuestionLinkModel.fromJson(Map<String, dynamic> json) {
    return TeacherExamQuestionLinkModel(
      id: (json['id'] ?? '').toString(),
      examId: (json['exam'] ?? '').toString(),
      questionId: (json['question'] ?? '').toString(),
      questionTextSummary: (json['question_text_summary'] ?? '').toString(),
      sectionName: json['section_name']?.toString(),
      questionOrder: _readInt(json['question_order']),
      marks: json['marks']?.toString(),
      negativeMarks: json['negative_marks']?.toString(),
      isMandatory: json['is_mandatory'] as bool? ?? false,
      isActive: json['is_active'] as bool? ?? true,
    );
  }
}

int _readInt(dynamic value, {int fallback = 0}) {
  if (value is int) {
    return value;
  }
  return int.tryParse(value?.toString() ?? '') ?? fallback;
}
