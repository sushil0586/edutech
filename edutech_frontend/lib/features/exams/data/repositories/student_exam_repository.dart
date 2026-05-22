import 'package:dio/dio.dart';
import 'package:education_frontend/core/network/api_client.dart';
import 'package:education_frontend/features/exams/domain/models/student_attempt.dart';
import 'package:education_frontend/features/exams/domain/models/student_attempt_answer.dart';
import 'package:education_frontend/features/exams/domain/models/student_attempt_review.dart';
import 'package:education_frontend/features/exams/domain/models/student_attempt_summary.dart';
import 'package:education_frontend/features/exams/domain/models/student_exam_detail.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final studentExamRepositoryProvider = Provider<StudentExamRepository>((ref) {
  return DioStudentExamRepository(ref.watch(dioProvider));
});

abstract class StudentExamRepository {
  Future<List<StudentExamDetailListItem>> fetchAvailableExams();
  Future<StudentExamDetail> fetchExamDetail(String examId);
  Future<List<StudentAttempt>> fetchStudentAttempts();
  Future<StudentAttempt> fetchAttemptDetail(String attemptId);
  Future<StudentAttemptReview> fetchAttemptReview(String attemptId);
  Future<StudentAttempt> startAttempt({
    required String examId,
    required String studentId,
  });
  Future<StudentAttemptAnswer> saveAnswer({
    required String attemptId,
    required String questionId,
    String? selectedOptionId,
    String? answerText,
    bool isMarkedForReview,
    int? timeSpentSeconds,
    bool clearResponse,
    bool skip,
  });
  Future<StudentAttemptSummary> submitAttempt({
    required String attemptId,
    required bool autoSubmitted,
  });
  Future<StudentAttemptSummary> fetchAttemptSummary(String attemptId);
}

class DioStudentExamRepository implements StudentExamRepository {
  DioStudentExamRepository(this._dio);

  final Dio _dio;

  Map<String, dynamic> _extractActionData(Map<String, dynamic>? payload) {
    final raw = payload ?? <String, dynamic>{};
    final data = raw['data'];
    if (data is Map<String, dynamic>) {
      return data;
    }
    return raw;
  }

  @override
  Future<StudentExamDetail> fetchExamDetail(String examId) async {
    final response = await _dio.get<Map<String, dynamic>>(
      'student/exams/$examId/detail/',
    );
    return StudentExamDetail.fromJson(response.data ?? <String, dynamic>{});
  }

  @override
  Future<List<StudentExamDetailListItem>> fetchAvailableExams() async {
    final response = await _dio.get<List<dynamic>>('student/exams/available/');
    final items = response.data ?? <dynamic>[];
    return items
        .whereType<Map<String, dynamic>>()
        .map(StudentExamDetailListItem.fromJson)
        .toList();
  }

  @override
  Future<StudentAttemptSummary> fetchAttemptSummary(String attemptId) async {
    final response = await _dio.get<Map<String, dynamic>>(
      'attempts/$attemptId/summary/',
    );
    return StudentAttemptSummary.fromJson(response.data ?? <String, dynamic>{});
  }

  @override
  Future<StudentAttempt> fetchAttemptDetail(String attemptId) async {
    final response = await _dio.get<Map<String, dynamic>>(
      'attempts/$attemptId/detail/',
    );
    return StudentAttempt.fromJson(response.data ?? <String, dynamic>{});
  }

  @override
  Future<StudentAttemptReview> fetchAttemptReview(String attemptId) async {
    final response = await _dio.get<Map<String, dynamic>>(
      'attempts/$attemptId/review/',
    );
    return StudentAttemptReview.fromJson(
      response.data ?? <String, dynamic>{},
    );
  }

  @override
  Future<StudentAttemptAnswer> saveAnswer({
    required String attemptId,
    required String questionId,
    String? selectedOptionId,
    String? answerText,
    bool isMarkedForReview = false,
    int? timeSpentSeconds,
    bool clearResponse = false,
    bool skip = false,
  }) async {
    final payload = <String, dynamic>{
      'question': questionId,
      'is_marked_for_review': isMarkedForReview,
      'clear_response': clearResponse,
      'skip': skip,
    };
    if (selectedOptionId != null && selectedOptionId.isNotEmpty) {
      payload['selected_option'] = selectedOptionId;
    }
    if (answerText != null) {
      payload['answer_text'] = answerText;
    }
    if (timeSpentSeconds != null) {
      payload['time_spent_seconds'] = timeSpentSeconds;
    }

    final response = await _dio.post<Map<String, dynamic>>(
      'attempts/$attemptId/save-answer/',
      data: payload,
    );
    return StudentAttemptAnswer.fromJson(_extractActionData(response.data));
  }

  @override
  Future<StudentAttempt> startAttempt({
    required String examId,
    required String studentId,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'attempts/start/',
      data: {'exam': examId, 'student': studentId},
    );
    return StudentAttempt.fromJson(_extractActionData(response.data));
  }

  @override
  Future<StudentAttemptSummary> submitAttempt({
    required String attemptId,
    required bool autoSubmitted,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'attempts/$attemptId/submit/',
      data: {'auto_submitted': autoSubmitted},
    );
    return StudentAttemptSummary.fromJson(_extractActionData(response.data));
  }

  @override
  Future<List<StudentAttempt>> fetchStudentAttempts() async {
    final response = await _dio.get<List<dynamic>>('student/attempts/');
    final items = response.data ?? <dynamic>[];
    return items
        .whereType<Map<String, dynamic>>()
        .map(StudentAttempt.fromJson)
        .toList();
  }
}

class StudentExamDetailListItem {
  const StudentExamDetailListItem({
    required this.id,
    required this.title,
    required this.code,
    required this.status,
    required this.subjectName,
    required this.durationMinutes,
    required this.startAt,
    required this.endAt,
    required this.totalMarks,
    required this.passingMarks,
    required this.instructions,
    required this.serverTime,
    required this.attemptsUsed,
    required this.remainingAttempts,
    required this.activeAttempt,
    required this.availabilityState,
    required this.startsInSeconds,
    required this.endsInSeconds,
    required this.canStart,
    required this.canResume,
    required this.reviewAvailable,
    required this.resultPublished,
    required this.resultStatus,
    required this.latestAttemptStatus,
  });

  final String id;
  final String title;
  final String code;
  final String status;
  final String? subjectName;
  final int durationMinutes;
  final DateTime? startAt;
  final DateTime? endAt;
  final String totalMarks;
  final String passingMarks;
  final String? instructions;
  final DateTime? serverTime;
  final int attemptsUsed;
  final int remainingAttempts;
  final StudentExamAvailabilityAttempt? activeAttempt;
  final String availabilityState;
  final int? startsInSeconds;
  final int? endsInSeconds;
  final bool canStart;
  final bool canResume;
  final bool reviewAvailable;
  final bool resultPublished;
  final String? resultStatus;
  final String? latestAttemptStatus;

  factory StudentExamDetailListItem.fromJson(Map<String, dynamic> json) {
    return StudentExamDetailListItem(
      id: (json['id'] ?? '').toString(),
      title: json['title'] as String? ?? 'Exam',
      code: json['code'] as String? ?? '-',
      status: json['status'] as String? ?? 'scheduled',
      subjectName: json['subject_name'] as String?,
      durationMinutes: json['duration_minutes'] as int? ?? 0,
      startAt: DateTime.tryParse(json['start_at'] as String? ?? ''),
      endAt: DateTime.tryParse(json['end_at'] as String? ?? ''),
      totalMarks: (json['total_marks'] ?? '0').toString(),
      passingMarks: (json['passing_marks'] ?? '0').toString(),
      instructions: json['instructions'] as String?,
      serverTime: DateTime.tryParse(json['server_time'] as String? ?? ''),
      attemptsUsed: json['attempts_used'] as int? ?? 0,
      remainingAttempts: json['remaining_attempts'] as int? ?? 0,
      activeAttempt: (json['active_attempt'] as Map<String, dynamic>?) == null
          ? null
          : StudentExamAvailabilityAttempt.fromJson(
              json['active_attempt'] as Map<String, dynamic>,
            ),
      availabilityState: json['availability_state'] as String? ?? 'upcoming',
      startsInSeconds: json['starts_in_seconds'] as int?,
      endsInSeconds: json['ends_in_seconds'] as int?,
      canStart: json['can_start'] as bool? ?? false,
      canResume: json['can_resume'] as bool? ?? false,
      reviewAvailable: json['review_available'] as bool? ?? false,
      resultPublished: json['result_published'] as bool? ?? false,
      resultStatus: json['result_status'] as String?,
      latestAttemptStatus: json['latest_attempt_status'] as String?,
    );
  }
}

class StudentExamAvailabilityAttempt {
  const StudentExamAvailabilityAttempt({
    required this.id,
    required this.status,
    required this.startedAt,
    required this.expiresAt,
  });

  final String id;
  final String status;
  final DateTime? startedAt;
  final DateTime? expiresAt;

  factory StudentExamAvailabilityAttempt.fromJson(Map<String, dynamic> json) {
    return StudentExamAvailabilityAttempt(
      id: (json['id'] ?? '').toString(),
      status: json['status'] as String? ?? 'in_progress',
      startedAt: DateTime.tryParse(json['started_at'] as String? ?? ''),
      expiresAt: DateTime.tryParse(json['expires_at'] as String? ?? ''),
    );
  }
}
