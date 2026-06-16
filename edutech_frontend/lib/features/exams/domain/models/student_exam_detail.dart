import 'package:education_frontend/features/exams/domain/models/student_exam_question.dart';

class StudentExamDetail {
  const StudentExamDetail({
    required this.id,
    required this.title,
    required this.code,
    required this.description,
    required this.status,
    required this.subjectName,
    required this.programName,
    required this.cohortName,
    required this.instructions,
    required this.durationMinutes,
    required this.totalMarks,
    required this.passingMarks,
    required this.startAt,
    required this.endAt,
    required this.randomizeQuestions,
    required this.randomizeOptions,
    required this.allowReviewAfterSubmit,
    required this.showResultImmediately,
    required this.allowLateSubmit,
    required this.timerMode,
    required this.navigationMode,
    required this.attemptPolicy,
    required this.resultPublishMode,
    required this.reviewMode,
    required this.securityMode,
    required this.allowResume,
    required this.allowSectionSwitching,
    required this.allowReturnToPreviousSection,
    required this.resultPublishAt,
    required this.reviewAvailableFrom,
    required this.reviewAvailableUntil,
    required this.serverTime,
    required this.attemptsUsed,
    required this.remainingAttempts,
    required this.reviewAvailable,
    required this.resultPublished,
    required this.resultStatus,
    required this.availabilityState,
    required this.activeAttempt,
    required this.sections,
    required this.examQuestions,
  });

  final String id;
  final String title;
  final String code;
  final String description;
  final String status;
  final String? subjectName;
  final String? programName;
  final String? cohortName;
  final String? instructions;
  final int durationMinutes;
  final String totalMarks;
  final String passingMarks;
  final DateTime? startAt;
  final DateTime? endAt;
  final bool randomizeQuestions;
  final bool randomizeOptions;
  final bool allowReviewAfterSubmit;
  final bool showResultImmediately;
  final bool allowLateSubmit;
  final String timerMode;
  final String navigationMode;
  final String attemptPolicy;
  final String resultPublishMode;
  final String reviewMode;
  final String securityMode;
  final bool allowResume;
  final bool allowSectionSwitching;
  final bool allowReturnToPreviousSection;
  final DateTime? resultPublishAt;
  final DateTime? reviewAvailableFrom;
  final DateTime? reviewAvailableUntil;
  final DateTime? serverTime;
  final int attemptsUsed;
  final int remainingAttempts;
  final bool reviewAvailable;
  final bool resultPublished;
  final String? resultStatus;
  final String availabilityState;
  final StudentExamActiveAttempt? activeAttempt;
  final List<StudentExamSection> sections;
  final List<StudentExamQuestion> examQuestions;

  int get activeQuestionCount =>
      examQuestions.where((question) => question.isActive).length;

  factory StudentExamDetail.fromJson(Map<String, dynamic> json) {
    final sections =
        (json['sections'] as List<dynamic>? ?? <dynamic>[])
            .whereType<Map<String, dynamic>>()
            .map(StudentExamSection.fromJson)
            .where((section) => section.isActive)
            .toList()
          ..sort((a, b) => a.sectionOrder.compareTo(b.sectionOrder));
    final examQuestions =
        (json['exam_questions'] as List<dynamic>? ?? <dynamic>[])
            .whereType<Map<String, dynamic>>()
            .map(StudentExamQuestion.fromJson)
            .where((question) => question.isActive)
            .toList()
          ..sort((a, b) => a.questionOrder.compareTo(b.questionOrder));

    return StudentExamDetail(
      id: (json['id'] ?? '').toString(),
      title: (json['title'] ?? 'Exam').toString(),
      code: (json['code'] ?? '-').toString(),
      description: (json['description'] ?? '').toString(),
      status: (json['status'] ?? 'scheduled').toString(),
      subjectName: json['subject_name']?.toString(),
      programName: json['program_name']?.toString(),
      cohortName: json['cohort_name']?.toString(),
      instructions: json['instructions']?.toString(),
      durationMinutes: _readInt(json['duration_minutes']),
      totalMarks: (json['total_marks'] ?? '0').toString(),
      passingMarks: (json['passing_marks'] ?? '0').toString(),
      startAt: DateTime.tryParse(json['start_at']?.toString() ?? ''),
      endAt: DateTime.tryParse(json['end_at']?.toString() ?? ''),
      randomizeQuestions: json['randomize_questions'] as bool? ?? false,
      randomizeOptions: json['randomize_options'] as bool? ?? false,
      allowReviewAfterSubmit:
          json['allow_review_after_submit'] as bool? ?? false,
      showResultImmediately: json['show_result_immediately'] as bool? ?? false,
      allowLateSubmit: json['allow_late_submit'] as bool? ?? false,
      timerMode: (json['timer_mode'] ?? 'global').toString(),
      navigationMode: (json['navigation_mode'] ?? 'free_exam').toString(),
      attemptPolicy: (json['attempt_policy'] ?? 'single').toString(),
      resultPublishMode: (json['result_publish_mode'] ?? 'after_review')
          .toString(),
      reviewMode: (json['review_mode'] ?? 'attempted_only').toString(),
      securityMode: (json['security_mode'] ?? 'normal').toString(),
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
      serverTime: DateTime.tryParse(json['server_time']?.toString() ?? ''),
      attemptsUsed: _readInt(json['attempts_used']),
      remainingAttempts: _readInt(json['remaining_attempts']),
      reviewAvailable: json['review_available'] as bool? ?? false,
      resultPublished: json['result_published'] as bool? ?? false,
      resultStatus: json['result_status']?.toString(),
      availabilityState: (json['availability_state'] ?? 'upcoming').toString(),
      activeAttempt: (json['active_attempt'] as Map<String, dynamic>?) == null
          ? null
          : StudentExamActiveAttempt.fromJson(
              json['active_attempt'] as Map<String, dynamic>,
            ),
      sections: sections,
      examQuestions: examQuestions,
    );
  }
}

class StudentExamSection {
  const StudentExamSection({
    required this.id,
    required this.name,
    required this.sectionOrder,
    required this.instructions,
    required this.totalQuestions,
    required this.linkedQuestionsCount,
    required this.timerEnabled,
    required this.durationMinutes,
    required this.allowSkipSection,
    required this.lockAfterSubmit,
    required this.isActive,
  });

  final String id;
  final String name;
  final int sectionOrder;
  final String instructions;
  final int totalQuestions;
  final int linkedQuestionsCount;
  final bool timerEnabled;
  final int? durationMinutes;
  final bool allowSkipSection;
  final bool lockAfterSubmit;
  final bool isActive;

  int get displayQuestionCount =>
      linkedQuestionsCount > 0 ? linkedQuestionsCount : totalQuestions;

  factory StudentExamSection.fromJson(Map<String, dynamic> json) {
    return StudentExamSection(
      id: (json['id'] ?? '').toString(),
      name: (json['name'] ?? 'Section').toString(),
      sectionOrder: _readInt(json['section_order']),
      instructions: (json['instructions'] ?? '').toString(),
      totalQuestions: _readInt(json['total_questions']),
      linkedQuestionsCount: _readInt(json['linked_questions_count']),
      timerEnabled: json['timer_enabled'] as bool? ?? false,
      durationMinutes: _readNullableInt(json['duration_minutes']),
      allowSkipSection: json['allow_skip_section'] as bool? ?? true,
      lockAfterSubmit: json['lock_after_submit'] as bool? ?? false,
      isActive: json['is_active'] as bool? ?? true,
    );
  }
}

class StudentExamActiveAttempt {
  const StudentExamActiveAttempt({
    required this.id,
    required this.status,
    required this.startedAt,
    required this.expiresAt,
    required this.sectionRuntime,
  });

  final String id;
  final String status;
  final DateTime? startedAt;
  final DateTime? expiresAt;
  final StudentExamActiveAttemptSectionRuntime sectionRuntime;

  factory StudentExamActiveAttempt.fromJson(Map<String, dynamic> json) {
    return StudentExamActiveAttempt(
      id: (json['id'] ?? '').toString(),
      status: (json['status'] ?? 'in_progress').toString(),
      startedAt: DateTime.tryParse(json['started_at']?.toString() ?? ''),
      expiresAt: DateTime.tryParse(json['expires_at']?.toString() ?? ''),
      sectionRuntime: StudentExamActiveAttemptSectionRuntime.fromJson(
        (json['section_runtime'] as Map<String, dynamic>?) ??
            const <String, dynamic>{},
      ),
    );
  }
}

class StudentExamActiveAttemptSectionRuntime {
  const StudentExamActiveAttemptSectionRuntime({
    required this.currentSectionId,
    required this.currentSectionName,
    required this.currentSectionOrder,
    required this.currentSectionStartedAt,
    required this.currentSectionExpiresAt,
    required this.currentSectionTimerEnabled,
    required this.visitedSectionIds,
    required this.highestSectionOrderReached,
  });

  final String? currentSectionId;
  final String? currentSectionName;
  final int? currentSectionOrder;
  final DateTime? currentSectionStartedAt;
  final DateTime? currentSectionExpiresAt;
  final bool currentSectionTimerEnabled;
  final List<String> visitedSectionIds;
  final int? highestSectionOrderReached;

  factory StudentExamActiveAttemptSectionRuntime.fromJson(
    Map<String, dynamic> json,
  ) {
    return StudentExamActiveAttemptSectionRuntime(
      currentSectionId: json['current_section_id']?.toString(),
      currentSectionName: json['current_section_name']?.toString(),
      currentSectionOrder: _readNullableInt(json['current_section_order']),
      currentSectionStartedAt: DateTime.tryParse(
        json['current_section_started_at']?.toString() ?? '',
      ),
      currentSectionExpiresAt: DateTime.tryParse(
        json['current_section_expires_at']?.toString() ?? '',
      ),
      currentSectionTimerEnabled:
          json['current_section_timer_enabled'] as bool? ?? false,
      visitedSectionIds:
          (json['visited_section_ids'] as List<dynamic>? ?? const [])
              .map((item) => item.toString())
              .toList(),
      highestSectionOrderReached: _readNullableInt(
        json['highest_section_order_reached'],
      ),
    );
  }
}

int _readInt(dynamic value) {
  if (value is int) {
    return value;
  }
  return int.tryParse(value?.toString() ?? '') ?? 0;
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
