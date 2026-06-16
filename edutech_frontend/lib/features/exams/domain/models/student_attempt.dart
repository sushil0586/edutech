import 'package:education_frontend/features/exams/domain/models/student_attempt_answer.dart';

class StudentAttempt {
  const StudentAttempt({
    required this.id,
    required this.examId,
    required this.examTitle,
    required this.examCode,
    required this.studentId,
    required this.studentName,
    required this.attemptNo,
    required this.status,
    required this.startedAt,
    required this.submittedAt,
    required this.expiresAt,
    required this.totalQuestions,
    required this.attemptedQuestions,
    required this.correctAnswers,
    required this.incorrectAnswers,
    required this.skippedQuestions,
    required this.score,
    required this.negativeScore,
    required this.finalScore,
    required this.percentage,
    required this.timeTakenSeconds,
    required this.isAutoSubmitted,
    required this.answers,
    required this.sectionRuntime,
    this.serverTime,
  });

  final String id;
  final String examId;
  final String examTitle;
  final String examCode;
  final String studentId;
  final String studentName;
  final int attemptNo;
  final String status;
  final DateTime? startedAt;
  final DateTime? submittedAt;
  final DateTime? expiresAt;
  final int totalQuestions;
  final int attemptedQuestions;
  final int correctAnswers;
  final int incorrectAnswers;
  final int skippedQuestions;
  final String score;
  final String negativeScore;
  final String finalScore;
  final String percentage;
  final int? timeTakenSeconds;
  final bool isAutoSubmitted;
  final List<StudentAttemptAnswer> answers;
  final StudentAttemptSectionRuntime sectionRuntime;
  final DateTime? serverTime;

  bool get isInProgress => status == 'in_progress';

  factory StudentAttempt.fromJson(Map<String, dynamic> json) {
    final answers = (json['answers'] as List<dynamic>? ?? <dynamic>[])
        .whereType<Map<String, dynamic>>()
        .map(StudentAttemptAnswer.fromJson)
        .toList();

    return StudentAttempt(
      id: (json['id'] ?? '').toString(),
      examId: (json['exam'] ?? '').toString(),
      examTitle: (json['exam_title'] ?? 'Exam').toString(),
      examCode: (json['exam_code'] ?? '-').toString(),
      studentId: (json['student'] ?? '').toString(),
      studentName: (json['student_name'] ?? 'Student').toString(),
      attemptNo: _readInt(json['attempt_no'], fallback: 1),
      status: (json['status'] ?? 'in_progress').toString(),
      startedAt: DateTime.tryParse(json['started_at']?.toString() ?? ''),
      submittedAt: DateTime.tryParse(json['submitted_at']?.toString() ?? ''),
      expiresAt: DateTime.tryParse(json['expires_at']?.toString() ?? ''),
      totalQuestions: _readInt(json['total_questions']),
      attemptedQuestions: _readInt(json['attempted_questions']),
      correctAnswers: _readInt(json['correct_answers']),
      incorrectAnswers: _readInt(json['incorrect_answers']),
      skippedQuestions: _readInt(json['skipped_questions']),
      score: (json['score'] ?? '0').toString(),
      negativeScore: (json['negative_score'] ?? '0').toString(),
      finalScore: (json['final_score'] ?? '0').toString(),
      percentage: (json['percentage'] ?? '0').toString(),
      timeTakenSeconds: _readNullableInt(json['time_taken_seconds']),
      isAutoSubmitted: json['is_auto_submitted'] as bool? ?? false,
      answers: answers,
      sectionRuntime: StudentAttemptSectionRuntime.fromJson(
        (json['section_runtime'] as Map<String, dynamic>?) ??
            const <String, dynamic>{},
      ),
      serverTime: DateTime.tryParse(json['server_time']?.toString() ?? ''),
    );
  }
}

class StudentAttemptSectionRuntime {
  const StudentAttemptSectionRuntime({
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

  factory StudentAttemptSectionRuntime.fromJson(Map<String, dynamic> json) {
    return StudentAttemptSectionRuntime(
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
