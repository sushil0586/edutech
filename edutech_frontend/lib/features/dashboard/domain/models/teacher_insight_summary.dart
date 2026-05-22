class TeacherInsightSummary {
  const TeacherInsightSummary({
    required this.overview,
    required this.examOverview,
    required this.highPerformingStudents,
    required this.lowPerformingStudents,
    required this.weakTopics,
    required this.mostWrongQuestions,
    required this.mostSkippedQuestions,
  });

  final TeacherInsightOverview overview;
  final List<TeacherInsightExamOverview> examOverview;
  final List<TeacherInsightStudent> highPerformingStudents;
  final List<TeacherInsightStudent> lowPerformingStudents;
  final List<TeacherInsightTopic> weakTopics;
  final List<TeacherInsightQuestion> mostWrongQuestions;
  final List<TeacherInsightQuestion> mostSkippedQuestions;

  factory TeacherInsightSummary.fromJson(Map<String, dynamic> json) {
    return TeacherInsightSummary(
      overview: TeacherInsightOverview.fromJson(
        json['overview'] as Map<String, dynamic>? ?? const <String, dynamic>{},
      ),
      examOverview:
          (json['exam_overview'] as List<dynamic>? ?? const <dynamic>[])
              .whereType<Map<String, dynamic>>()
              .map(TeacherInsightExamOverview.fromJson)
              .toList(),
      highPerformingStudents:
          (json['high_performing_students'] as List<dynamic>? ??
                  const <dynamic>[])
              .whereType<Map<String, dynamic>>()
              .map(TeacherInsightStudent.fromJson)
              .toList(),
      lowPerformingStudents:
          (json['low_performing_students'] as List<dynamic>? ??
                  const <dynamic>[])
              .whereType<Map<String, dynamic>>()
              .map(TeacherInsightStudent.fromJson)
              .toList(),
      weakTopics:
          (json['weak_topics'] as List<dynamic>? ?? const <dynamic>[])
              .whereType<Map<String, dynamic>>()
              .map(TeacherInsightTopic.fromJson)
              .toList(),
      mostWrongQuestions:
          (json['most_wrong_questions'] as List<dynamic>? ?? const <dynamic>[])
              .whereType<Map<String, dynamic>>()
              .map(TeacherInsightQuestion.fromJson)
              .toList(),
      mostSkippedQuestions:
          (json['most_skipped_questions'] as List<dynamic>? ??
                  const <dynamic>[])
              .whereType<Map<String, dynamic>>()
              .map(TeacherInsightQuestion.fromJson)
              .toList(),
    );
  }
}

class TeacherInsightOverview {
  const TeacherInsightOverview({
    required this.trackedExams,
    required this.totalAttempts,
    required this.averagePercentage,
    required this.accuracyPercentage,
    required this.averageTimeTakenSeconds,
  });

  final int trackedExams;
  final int totalAttempts;
  final String averagePercentage;
  final String accuracyPercentage;
  final int averageTimeTakenSeconds;

  factory TeacherInsightOverview.fromJson(Map<String, dynamic> json) {
    return TeacherInsightOverview(
      trackedExams: _readInt(json['tracked_exams']),
      totalAttempts: _readInt(json['total_attempts']),
      averagePercentage: (json['average_percentage'] ?? '0').toString(),
      accuracyPercentage: (json['accuracy_percentage'] ?? '0').toString(),
      averageTimeTakenSeconds: _readInt(json['average_time_taken_seconds']),
    );
  }
}

class TeacherInsightExamOverview {
  const TeacherInsightExamOverview({
    required this.examId,
    required this.examTitle,
    required this.examCode,
    required this.totalAttempted,
    required this.totalPassed,
    required this.totalFailed,
    required this.averagePercentage,
    required this.highestScore,
    required this.lowestScore,
  });

  final String examId;
  final String examTitle;
  final String examCode;
  final int totalAttempted;
  final int totalPassed;
  final int totalFailed;
  final String averagePercentage;
  final String highestScore;
  final String lowestScore;

  factory TeacherInsightExamOverview.fromJson(Map<String, dynamic> json) {
    return TeacherInsightExamOverview(
      examId: (json['exam_id'] ?? '').toString(),
      examTitle: (json['exam_title'] ?? 'Exam').toString(),
      examCode: (json['exam_code'] ?? '-').toString(),
      totalAttempted: _readInt(json['total_attempted']),
      totalPassed: _readInt(json['total_passed']),
      totalFailed: _readInt(json['total_failed']),
      averagePercentage: (json['average_percentage'] ?? '0').toString(),
      highestScore: (json['highest_score'] ?? '0').toString(),
      lowestScore: (json['lowest_score'] ?? '0').toString(),
    );
  }
}

class TeacherInsightStudent {
  const TeacherInsightStudent({
    required this.studentId,
    required this.studentName,
    required this.admissionNo,
    required this.averagePercentage,
    required this.count,
  });

  final String studentId;
  final String studentName;
  final String admissionNo;
  final String averagePercentage;
  final int count;

  factory TeacherInsightStudent.fromJson(Map<String, dynamic> json) {
    return TeacherInsightStudent(
      studentId: (json['student_id'] ?? '').toString(),
      studentName: (json['student_name'] ?? 'Student').toString(),
      admissionNo: (json['admission_no'] ?? '-').toString(),
      averagePercentage: (json['average_percentage'] ?? '0').toString(),
      count: _readInt(json['count']),
    );
  }
}

class TeacherInsightTopic {
  const TeacherInsightTopic({
    required this.subjectName,
    required this.topicName,
    required this.averagePercentage,
    required this.attemptedQuestions,
  });

  final String subjectName;
  final String? topicName;
  final String averagePercentage;
  final int attemptedQuestions;

  factory TeacherInsightTopic.fromJson(Map<String, dynamic> json) {
    return TeacherInsightTopic(
      subjectName: (json['subject_name'] ?? 'Subject').toString(),
      topicName: json['topic_name']?.toString(),
      averagePercentage: (json['average_percentage'] ?? '0').toString(),
      attemptedQuestions: _readInt(json['attempted_questions']),
    );
  }
}

class TeacherInsightQuestion {
  const TeacherInsightQuestion({
    required this.questionId,
    required this.questionTextSummary,
    required this.subjectName,
    required this.topicName,
    this.wrongCount,
    this.skippedCount,
    required this.totalAttempts,
  });

  final String questionId;
  final String questionTextSummary;
  final String? subjectName;
  final String? topicName;
  final int? wrongCount;
  final int? skippedCount;
  final int totalAttempts;

  factory TeacherInsightQuestion.fromJson(Map<String, dynamic> json) {
    return TeacherInsightQuestion(
      questionId: (json['question_id'] ?? '').toString(),
      questionTextSummary: (json['question_text_summary'] ?? 'Question').toString(),
      subjectName: json['subject_name']?.toString(),
      topicName: json['topic_name']?.toString(),
      wrongCount: _readNullableInt(json['wrong_count']),
      skippedCount: _readNullableInt(json['skipped_count']),
      totalAttempts: _readInt(json['total_attempts']),
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
