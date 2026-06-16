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
    required this.timerMode,
    required this.navigationMode,
    required this.attemptPolicy,
    required this.resultPublishMode,
    required this.reviewMode,
    required this.securityMode,
    required this.assignmentMode,
    required this.allowResume,
    required this.allowSectionSwitching,
    required this.allowReturnToPreviousSection,
    required this.resultPublishAt,
    required this.reviewAvailableFrom,
    required this.reviewAvailableUntil,
    required this.subjectName,
    required this.programName,
    required this.assignedStudentCount,
    required this.assignedStudents,
    required this.sections,
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
  final String timerMode;
  final String navigationMode;
  final String attemptPolicy;
  final String resultPublishMode;
  final String reviewMode;
  final String securityMode;
  final String assignmentMode;
  final bool allowResume;
  final bool allowSectionSwitching;
  final bool allowReturnToPreviousSection;
  final DateTime? resultPublishAt;
  final DateTime? reviewAvailableFrom;
  final DateTime? reviewAvailableUntil;
  final String? subjectName;
  final String? programName;
  final int assignedStudentCount;
  final List<AssignedStudentModel> assignedStudents;
  final List<TeacherExamSectionModel> sections;
  final List<TeacherExamQuestionLinkModel> examQuestions;

  factory TeacherExamBuilderModel.fromJson(Map<String, dynamic> json) {
    final sections =
        (json['sections'] as List<dynamic>? ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(TeacherExamSectionModel.fromJson)
            .where((section) => section.isActive)
            .toList()
          ..sort((a, b) => a.sectionOrder.compareTo(b.sectionOrder));
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
      timerMode: (json['timer_mode'] ?? 'global').toString(),
      navigationMode: (json['navigation_mode'] ?? 'free_exam').toString(),
      attemptPolicy: (json['attempt_policy'] ?? 'single').toString(),
      resultPublishMode: (json['result_publish_mode'] ?? 'after_review')
          .toString(),
      reviewMode: (json['review_mode'] ?? 'attempted_only').toString(),
      securityMode: (json['security_mode'] ?? 'normal').toString(),
      assignmentMode: (json['assignment_mode'] ?? 'scope').toString(),
      allowResume: json['allow_resume'] as bool? ?? true,
      allowSectionSwitching: json['allow_section_switching'] as bool? ?? true,
      allowReturnToPreviousSection:
          json['allow_return_to_previous_section'] as bool? ?? true,
      resultPublishAt: DateTime.tryParse(
        json['result_publish_at']?.toString() ?? '',
      ),
      reviewAvailableFrom: DateTime.tryParse(
        json['review_available_from']?.toString() ?? '',
      ),
      reviewAvailableUntil: DateTime.tryParse(
        json['review_available_until']?.toString() ?? '',
      ),
      subjectName: json['subject_name']?.toString(),
      programName: json['program_name']?.toString(),
      assignedStudentCount: _readInt(json['assigned_student_count']),
      assignedStudents:
          (json['assigned_students'] as List<dynamic>? ?? const [])
              .whereType<Map<String, dynamic>>()
              .map(AssignedStudentModel.fromJson)
              .toList(),
      sections: sections,
      examQuestions: examQuestions,
    );
  }
}

class AssignedStudentModel {
  const AssignedStudentModel({
    required this.id,
    required this.studentId,
    required this.fullName,
    required this.admissionNo,
    required this.cohortName,
  });

  final String id;
  final String studentId;
  final String fullName;
  final String admissionNo;
  final String? cohortName;

  factory AssignedStudentModel.fromJson(Map<String, dynamic> json) {
    return AssignedStudentModel(
      id: (json['id'] ?? '').toString(),
      studentId: (json['student'] ?? '').toString(),
      fullName: (json['full_name'] ?? 'Student').toString(),
      admissionNo: (json['admission_no'] ?? '-').toString(),
      cohortName: json['cohort_name']?.toString(),
    );
  }
}

class AssignableStudentModel {
  const AssignableStudentModel({
    required this.id,
    required this.fullName,
    required this.admissionNo,
    required this.programId,
    required this.cohortId,
    required this.cohortName,
    required this.academicYearId,
  });

  final String id;
  final String fullName;
  final String admissionNo;
  final String programId;
  final String? cohortId;
  final String? cohortName;
  final String academicYearId;

  factory AssignableStudentModel.fromJson(Map<String, dynamic> json) {
    return AssignableStudentModel(
      id: (json['id'] ?? '').toString(),
      fullName: (json['full_name'] ?? 'Student').toString(),
      admissionNo: (json['admission_no'] ?? '-').toString(),
      programId: (json['program'] ?? '').toString(),
      cohortId: json['cohort']?.toString(),
      cohortName: json['cohort_name']?.toString(),
      academicYearId: (json['academic_year'] ?? '').toString(),
    );
  }
}

class TeacherExamSectionModel {
  const TeacherExamSectionModel({
    required this.id,
    required this.examId,
    required this.name,
    required this.description,
    required this.sectionOrder,
    required this.instructions,
    required this.totalQuestions,
    required this.marksPerQuestion,
    required this.negativeMarksPerQuestion,
    required this.linkedQuestionsCount,
    required this.timerEnabled,
    required this.durationMinutes,
    required this.allowSkipSection,
    required this.lockAfterSubmit,
    required this.isActive,
  });

  final String id;
  final String examId;
  final String name;
  final String description;
  final int sectionOrder;
  final String instructions;
  final int totalQuestions;
  final String? marksPerQuestion;
  final String? negativeMarksPerQuestion;
  final int linkedQuestionsCount;
  final bool timerEnabled;
  final int? durationMinutes;
  final bool allowSkipSection;
  final bool lockAfterSubmit;
  final bool isActive;

  factory TeacherExamSectionModel.fromJson(Map<String, dynamic> json) {
    return TeacherExamSectionModel(
      id: (json['id'] ?? '').toString(),
      examId: (json['exam'] ?? '').toString(),
      name: (json['name'] ?? 'Section').toString(),
      description: (json['description'] ?? '').toString(),
      sectionOrder: _readInt(json['section_order'], fallback: 1),
      instructions: (json['instructions'] ?? '').toString(),
      totalQuestions: _readInt(json['total_questions']),
      marksPerQuestion: json['marks_per_question']?.toString(),
      negativeMarksPerQuestion: json['negative_marks_per_question']?.toString(),
      linkedQuestionsCount: _readInt(json['linked_questions_count']),
      timerEnabled: json['timer_enabled'] as bool? ?? false,
      durationMinutes: _readNullableInt(json['duration_minutes']),
      allowSkipSection: json['allow_skip_section'] as bool? ?? true,
      lockAfterSubmit: json['lock_after_submit'] as bool? ?? false,
      isActive: json['is_active'] as bool? ?? true,
    );
  }
}

class TeacherExamQuestionLinkModel {
  const TeacherExamQuestionLinkModel({
    required this.id,
    required this.examId,
    required this.questionId,
    required this.sectionId,
    required this.sectionTitle,
    required this.sectionOrder,
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
  final String? sectionId;
  final String? sectionTitle;
  final int? sectionOrder;
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
      sectionId: json['section']?.toString(),
      sectionTitle: json['section_title']?.toString(),
      sectionOrder: _readNullableInt(json['section_order']),
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

int? _readNullableInt(dynamic value) {
  if (value == null) {
    return null;
  }
  if (value is int) {
    return value;
  }
  return int.tryParse(value.toString());
}
