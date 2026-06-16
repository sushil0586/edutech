import 'package:education_frontend/features/results/domain/models/teacher_exam_attempt_model.dart';

class LiveExamMonitorModel {
  const LiveExamMonitorModel({
    required this.examId,
    required this.examTitle,
    required this.examCode,
    required this.examStatus,
    required this.totalStudents,
    required this.startedStudents,
    required this.notStartedStudents,
    required this.inProgressStudents,
    required this.submittedStudents,
    required this.autoSubmittedStudents,
    required this.completedStudents,
    required this.alertedAttempts,
    required this.highAlertAttempts,
    required this.mediumAlertAttempts,
    required this.stalledAttempts,
    required this.completionPercentage,
    required this.submissionPercentage,
    required this.recentAttempts,
    this.lastActivityAt,
  });

  final String examId;
  final String examTitle;
  final String examCode;
  final String examStatus;
  final int totalStudents;
  final int startedStudents;
  final int notStartedStudents;
  final int inProgressStudents;
  final int submittedStudents;
  final int autoSubmittedStudents;
  final int completedStudents;
  final int alertedAttempts;
  final int highAlertAttempts;
  final int mediumAlertAttempts;
  final int stalledAttempts;
  final double completionPercentage;
  final double submissionPercentage;
  final DateTime? lastActivityAt;
  final List<TeacherExamAttemptModel> recentAttempts;

  factory LiveExamMonitorModel.fromJson(Map<String, dynamic> json) {
    return LiveExamMonitorModel(
      examId: (json['exam_id'] ?? '').toString(),
      examTitle: (json['exam_title'] ?? 'Exam').toString(),
      examCode: (json['exam_code'] ?? '-').toString(),
      examStatus: (json['exam_status'] ?? 'draft').toString(),
      totalStudents: _readInt(json['total_students']),
      startedStudents: _readInt(json['started_students']),
      notStartedStudents: _readInt(json['not_started_students']),
      inProgressStudents: _readInt(json['in_progress_students']),
      submittedStudents: _readInt(json['submitted_students']),
      autoSubmittedStudents: _readInt(json['auto_submitted_students']),
      completedStudents: _readInt(json['completed_students']),
      alertedAttempts: _readInt(json['alerted_attempts']),
      highAlertAttempts: _readInt(json['high_alert_attempts']),
      mediumAlertAttempts: _readInt(json['medium_alert_attempts']),
      stalledAttempts: _readInt(json['stalled_attempts']),
      completionPercentage: _readDouble(json['completion_percentage']),
      submissionPercentage: _readDouble(json['submission_percentage']),
      lastActivityAt: DateTime.tryParse(
        json['last_activity_at']?.toString() ?? '',
      ),
      recentAttempts: (json['recent_attempts'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(TeacherExamAttemptModel.fromJson)
          .toList(),
    );
  }
}

int _readInt(dynamic value) {
  if (value is int) {
    return value;
  }
  return int.tryParse(value?.toString() ?? '') ?? 0;
}

double _readDouble(dynamic value) {
  if (value is double) {
    return value;
  }
  if (value is int) {
    return value.toDouble();
  }
  return double.tryParse(value?.toString() ?? '') ?? 0;
}
