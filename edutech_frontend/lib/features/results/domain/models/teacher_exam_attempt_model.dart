class TeacherExamAttemptModel {
  const TeacherExamAttemptModel({
    required this.id,
    required this.examId,
    required this.examTitle,
    required this.studentId,
    required this.studentName,
    required this.studentAdmissionNo,
    required this.attemptNo,
    required this.status,
    required this.startedAt,
    required this.submittedAt,
    required this.attemptedQuestions,
    required this.correctAnswers,
    required this.incorrectAnswers,
    required this.skippedQuestions,
    required this.finalScore,
    required this.percentage,
    required this.timeTakenSeconds,
    required this.isAutoSubmitted,
    required this.canForceSubmit,
    required this.forceSubmitBlockReason,
    required this.alerts,
  });

  final String id;
  final String examId;
  final String examTitle;
  final String studentId;
  final String studentName;
  final String studentAdmissionNo;
  final int attemptNo;
  final String status;
  final DateTime? startedAt;
  final DateTime? submittedAt;
  final int attemptedQuestions;
  final int correctAnswers;
  final int incorrectAnswers;
  final int skippedQuestions;
  final String finalScore;
  final String percentage;
  final int? timeTakenSeconds;
  final bool isAutoSubmitted;
  final bool canForceSubmit;
  final String? forceSubmitBlockReason;
  final List<AttemptMonitorAlertModel> alerts;

  bool get hasActiveAlerts => alerts.isNotEmpty;
  bool get hasHighPriorityAlert => alerts.any((alert) => alert.priority >= 3);
  bool get hasMediumPriorityAlert => alerts.any((alert) => alert.priority == 2);
  int get highestAlertPriority => alerts.fold(
    0,
    (highest, alert) => alert.priority > highest ? alert.priority : highest,
  );

  bool hasAlertCode(String code) => alerts.any((alert) => alert.code == code);

  factory TeacherExamAttemptModel.fromJson(Map<String, dynamic> json) {
    return TeacherExamAttemptModel(
      id: (json['id'] ?? '').toString(),
      examId: (json['exam'] ?? '').toString(),
      examTitle: (json['exam_title'] ?? 'Exam').toString(),
      studentId: (json['student'] ?? '').toString(),
      studentName: (json['student_name'] ?? 'Student').toString(),
      studentAdmissionNo: (json['student_admission_no'] ?? '-').toString(),
      attemptNo: _readInt(json['attempt_no'], fallback: 1),
      status: (json['status'] ?? 'submitted').toString(),
      startedAt: DateTime.tryParse(json['started_at']?.toString() ?? ''),
      submittedAt: DateTime.tryParse(json['submitted_at']?.toString() ?? ''),
      attemptedQuestions: _readInt(json['attempted_questions']),
      correctAnswers: _readInt(json['correct_answers']),
      incorrectAnswers: _readInt(json['incorrect_answers']),
      skippedQuestions: _readInt(json['skipped_questions']),
      finalScore: (json['final_score'] ?? '0').toString(),
      percentage: (json['percentage'] ?? '0').toString(),
      timeTakenSeconds: _readNullableInt(json['time_taken_seconds']),
      isAutoSubmitted: json['is_auto_submitted'] as bool? ?? false,
      canForceSubmit: json['can_force_submit'] as bool? ?? false,
      forceSubmitBlockReason:
          json['force_submit_block_reason']?.toString().trim().isEmpty ?? true
          ? null
          : json['force_submit_block_reason']?.toString(),
      alerts: (json['alerts'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(AttemptMonitorAlertModel.fromJson)
          .toList(),
    );
  }
}

class AttemptMonitorAlertModel {
  const AttemptMonitorAlertModel({
    required this.code,
    required this.label,
    required this.severity,
    required this.message,
  });

  final String code;
  final String label;
  final String severity;
  final String message;

  int get priority => switch (severity) {
    'high' => 3,
    'medium' => 2,
    'low' => 1,
    _ => 0,
  };

  factory AttemptMonitorAlertModel.fromJson(Map<String, dynamic> json) {
    return AttemptMonitorAlertModel(
      code: (json['code'] ?? '').toString(),
      label: (json['label'] ?? 'Alert').toString(),
      severity: (json['severity'] ?? 'medium').toString(),
      message: (json['message'] ?? '').toString(),
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
