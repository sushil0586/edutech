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
    required this.serverTime,
    required this.attemptsUsed,
    required this.remainingAttempts,
    required this.reviewAvailable,
    required this.resultPublished,
    required this.resultStatus,
    required this.availabilityState,
    required this.activeAttempt,
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
  final DateTime? serverTime;
  final int attemptsUsed;
  final int remainingAttempts;
  final bool reviewAvailable;
  final bool resultPublished;
  final String? resultStatus;
  final String availabilityState;
  final StudentExamActiveAttempt? activeAttempt;
  final List<StudentExamQuestion> examQuestions;

  int get activeQuestionCount =>
      examQuestions.where((question) => question.isActive).length;

  factory StudentExamDetail.fromJson(Map<String, dynamic> json) {
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
      examQuestions: examQuestions,
    );
  }
}

class StudentExamActiveAttempt {
  const StudentExamActiveAttempt({
    required this.id,
    required this.status,
    required this.startedAt,
    required this.expiresAt,
  });

  final String id;
  final String status;
  final DateTime? startedAt;
  final DateTime? expiresAt;

  factory StudentExamActiveAttempt.fromJson(Map<String, dynamic> json) {
    return StudentExamActiveAttempt(
      id: (json['id'] ?? '').toString(),
      status: (json['status'] ?? 'in_progress').toString(),
      startedAt: DateTime.tryParse(json['started_at']?.toString() ?? ''),
      expiresAt: DateTime.tryParse(json['expires_at']?.toString() ?? ''),
    );
  }
}

int _readInt(dynamic value) {
  if (value is int) {
    return value;
  }
  return int.tryParse(value?.toString() ?? '') ?? 0;
}
