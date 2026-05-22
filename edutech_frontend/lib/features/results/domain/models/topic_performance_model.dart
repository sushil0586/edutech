class TopicPerformanceModel {
  const TopicPerformanceModel({
    required this.id,
    required this.instituteId,
    required this.examId,
    required this.studentId,
    required this.subjectId,
    required this.subjectName,
    required this.totalQuestions,
    required this.attemptedQuestions,
    required this.correctAnswers,
    required this.incorrectAnswers,
    required this.skippedQuestions,
    required this.score,
    required this.negativeScore,
    required this.finalScore,
    required this.percentage,
    required this.isActive,
    required this.examTitle,
    this.topicId,
    this.topicName,
  });

  final String id;
  final String instituteId;
  final String examId;
  final String studentId;
  final String subjectId;
  final String subjectName;
  final int totalQuestions;
  final int attemptedQuestions;
  final int correctAnswers;
  final int incorrectAnswers;
  final int skippedQuestions;
  final String score;
  final String negativeScore;
  final String finalScore;
  final String percentage;
  final bool isActive;
  final String examTitle;
  final String? topicId;
  final String? topicName;

  factory TopicPerformanceModel.fromJson(Map<String, dynamic> json) {
    return TopicPerformanceModel(
      id: (json['id'] ?? '').toString(),
      instituteId: (json['institute'] ?? '').toString(),
      examId: (json['exam'] ?? '').toString(),
      studentId: (json['student'] ?? '').toString(),
      subjectId: (json['subject'] ?? '').toString(),
      subjectName: (json['subject_name'] ?? 'Subject').toString(),
      totalQuestions: _readInt(json['total_questions']),
      attemptedQuestions: _readInt(json['attempted_questions']),
      correctAnswers: _readInt(json['correct_answers']),
      incorrectAnswers: _readInt(json['incorrect_answers']),
      skippedQuestions: _readInt(json['skipped_questions']),
      score: (json['score'] ?? '0').toString(),
      negativeScore: (json['negative_score'] ?? '0').toString(),
      finalScore: (json['final_score'] ?? '0').toString(),
      percentage: (json['percentage'] ?? '0').toString(),
      isActive: json['is_active'] as bool? ?? false,
      examTitle: (json['exam_title'] ?? 'Exam').toString(),
      topicId: json['topic']?.toString(),
      topicName: json['topic_name']?.toString(),
    );
  }
}

int _readInt(dynamic value) {
  if (value is int) {
    return value;
  }
  return int.tryParse(value?.toString() ?? '') ?? 0;
}
