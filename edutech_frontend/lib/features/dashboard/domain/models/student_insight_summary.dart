class StudentInsightSummary {
  const StudentInsightSummary({
    required this.studentId,
    required this.averagePercentage,
    required this.accuracyPercentage,
    required this.attemptedQuestions,
    required this.skippedQuestions,
    required this.recentExams,
    required this.strongestSubjects,
    required this.weakestSubjects,
    required this.weakTopics,
    required this.improvementTrend,
    required this.weakQuestionTypes,
    required this.insightMessages,
  });

  final String studentId;
  final String averagePercentage;
  final String accuracyPercentage;
  final int attemptedQuestions;
  final int skippedQuestions;
  final List<StudentInsightExam> recentExams;
  final List<StudentSubjectInsight> strongestSubjects;
  final List<StudentSubjectInsight> weakestSubjects;
  final List<StudentTopicInsight> weakTopics;
  final StudentImprovementTrend improvementTrend;
  final List<StudentQuestionTypeInsight> weakQuestionTypes;
  final List<String> insightMessages;

  factory StudentInsightSummary.fromJson(Map<String, dynamic> json) {
    return StudentInsightSummary(
      studentId: (json['student_id'] ?? '').toString(),
      averagePercentage: (json['average_percentage'] ?? '0').toString(),
      accuracyPercentage: (json['accuracy_percentage'] ?? '0').toString(),
      attemptedQuestions: json['attempted_questions'] as int? ?? 0,
      skippedQuestions: json['skipped_questions'] as int? ?? 0,
      recentExams:
          (json['recent_exams'] as List<dynamic>? ?? const <dynamic>[])
              .whereType<Map<String, dynamic>>()
              .map(StudentInsightExam.fromJson)
              .toList(),
      strongestSubjects:
          (json['strongest_subjects'] as List<dynamic>? ?? const <dynamic>[])
              .whereType<Map<String, dynamic>>()
              .map(StudentSubjectInsight.fromJson)
              .toList(),
      weakestSubjects:
          (json['weakest_subjects'] as List<dynamic>? ?? const <dynamic>[])
              .whereType<Map<String, dynamic>>()
              .map(StudentSubjectInsight.fromJson)
              .toList(),
      weakTopics:
          (json['weak_topics'] as List<dynamic>? ?? const <dynamic>[])
              .whereType<Map<String, dynamic>>()
              .map(StudentTopicInsight.fromJson)
              .toList(),
      improvementTrend: StudentImprovementTrend.fromJson(
        json['improvement_trend'] as Map<String, dynamic>? ??
            const <String, dynamic>{},
      ),
      weakQuestionTypes:
          (json['weak_question_types'] as List<dynamic>? ?? const <dynamic>[])
              .whereType<Map<String, dynamic>>()
              .map(StudentQuestionTypeInsight.fromJson)
              .toList(),
      insightMessages:
          (json['insight_messages'] as List<dynamic>? ?? const <dynamic>[])
              .map((item) => item.toString())
              .toList(),
    );
  }
}

class StudentInsightExam {
  const StudentInsightExam({
    required this.examId,
    required this.examTitle,
    required this.examCode,
    required this.percentage,
    required this.finalScore,
    required this.resultStatus,
  });

  final String examId;
  final String examTitle;
  final String examCode;
  final String percentage;
  final String finalScore;
  final String resultStatus;

  factory StudentInsightExam.fromJson(Map<String, dynamic> json) {
    return StudentInsightExam(
      examId: (json['exam_id'] ?? '').toString(),
      examTitle: json['exam_title'] as String? ?? 'Exam',
      examCode: json['exam_code'] as String? ?? '-',
      percentage: (json['percentage'] ?? '0').toString(),
      finalScore: (json['final_score'] ?? '0').toString(),
      resultStatus: json['result_status'] as String? ?? 'pending',
    );
  }
}

class StudentSubjectInsight {
  const StudentSubjectInsight({
    required this.subjectId,
    required this.subjectName,
    required this.averagePercentage,
    required this.attemptedQuestions,
    required this.skippedQuestions,
  });

  final String subjectId;
  final String subjectName;
  final String averagePercentage;
  final int attemptedQuestions;
  final int skippedQuestions;

  factory StudentSubjectInsight.fromJson(Map<String, dynamic> json) {
    return StudentSubjectInsight(
      subjectId: (json['subject_id'] ?? '').toString(),
      subjectName: json['subject_name'] as String? ?? 'Subject',
      averagePercentage: (json['average_percentage'] ?? '0').toString(),
      attemptedQuestions: json['attempted_questions'] as int? ?? 0,
      skippedQuestions: json['skipped_questions'] as int? ?? 0,
    );
  }
}

class StudentTopicInsight {
  const StudentTopicInsight({
    required this.topicId,
    required this.topicName,
    required this.subjectName,
    required this.averagePercentage,
    required this.attemptedQuestions,
    required this.skippedQuestions,
  });

  final String topicId;
  final String topicName;
  final String subjectName;
  final String averagePercentage;
  final int attemptedQuestions;
  final int skippedQuestions;

  factory StudentTopicInsight.fromJson(Map<String, dynamic> json) {
    return StudentTopicInsight(
      topicId: (json['topic_id'] ?? '').toString(),
      topicName: json['topic_name'] as String? ?? 'Topic',
      subjectName: json['subject_name'] as String? ?? 'Subject',
      averagePercentage: (json['average_percentage'] ?? '0').toString(),
      attemptedQuestions: json['attempted_questions'] as int? ?? 0,
      skippedQuestions: json['skipped_questions'] as int? ?? 0,
    );
  }
}

class StudentImprovementTrend {
  const StudentImprovementTrend({
    required this.direction,
    required this.changePercentage,
  });

  final String direction;
  final String changePercentage;

  factory StudentImprovementTrend.fromJson(Map<String, dynamic> json) {
    return StudentImprovementTrend(
      direction: json['direction'] as String? ?? 'stable',
      changePercentage: (json['change_percentage'] ?? '0').toString(),
    );
  }
}

class StudentQuestionTypeInsight {
  const StudentQuestionTypeInsight({
    required this.questionType,
    required this.wrongPercentage,
    required this.skipPercentage,
    required this.wrongCount,
    required this.skippedCount,
    required this.total,
  });

  final String questionType;
  final String wrongPercentage;
  final String skipPercentage;
  final int wrongCount;
  final int skippedCount;
  final int total;

  factory StudentQuestionTypeInsight.fromJson(Map<String, dynamic> json) {
    return StudentQuestionTypeInsight(
      questionType: json['question_type'] as String? ?? 'mcq_single',
      wrongPercentage: (json['wrong_percentage'] ?? '0').toString(),
      skipPercentage: (json['skip_percentage'] ?? '0').toString(),
      wrongCount: json['wrong_count'] as int? ?? 0,
      skippedCount: json['skipped_count'] as int? ?? 0,
      total: json['total'] as int? ?? 0,
    );
  }
}
