class StudentAttemptSummary {
  const StudentAttemptSummary({
    required this.id,
    required this.examId,
    required this.examTitle,
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
  });

  final String id;
  final String examId;
  final String examTitle;
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

  factory StudentAttemptSummary.fromJson(Map<String, dynamic> json) {
    return StudentAttemptSummary(
      id: (json['id'] ?? '').toString(),
      examId: (json['exam'] ?? '').toString(),
      examTitle: (json['exam_title'] ?? 'Exam').toString(),
      studentId: (json['student'] ?? '').toString(),
      studentName: (json['student_name'] ?? 'Student').toString(),
      attemptNo: _readInt(json['attempt_no'], fallback: 1),
      status: (json['status'] ?? 'submitted').toString(),
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
