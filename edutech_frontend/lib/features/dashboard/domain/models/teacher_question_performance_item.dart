class TeacherQuestionPerformanceItem {
  const TeacherQuestionPerformanceItem({
    required this.questionId,
    required this.questionTextSummary,
    required this.questionType,
    required this.difficultyLevel,
    required this.subjectName,
    required this.topicName,
    required this.hasExplanation,
    required this.isVerified,
    required this.usageCount,
    required this.correctAttemptPercentage,
    required this.wrongAttemptPercentage,
    required this.skipPercentage,
    required this.correctCount,
    required this.wrongCount,
    required this.skippedCount,
  });

  final String questionId;
  final String questionTextSummary;
  final String questionType;
  final String difficultyLevel;
  final String? subjectName;
  final String? topicName;
  final bool hasExplanation;
  final bool isVerified;
  final int usageCount;
  final String correctAttemptPercentage;
  final String wrongAttemptPercentage;
  final String skipPercentage;
  final int correctCount;
  final int wrongCount;
  final int skippedCount;

  factory TeacherQuestionPerformanceItem.fromJson(Map<String, dynamic> json) {
    return TeacherQuestionPerformanceItem(
      questionId: (json['question_id'] ?? '').toString(),
      questionTextSummary: (json['question_text_summary'] ?? 'Question').toString(),
      questionType: (json['question_type'] ?? 'mcq_single').toString(),
      difficultyLevel: (json['difficulty_level'] ?? 'intermediate').toString(),
      subjectName: json['subject_name']?.toString(),
      topicName: json['topic_name']?.toString(),
      hasExplanation: json['has_explanation'] as bool? ?? false,
      isVerified: json['is_verified'] as bool? ?? false,
      usageCount: _readInt(json['usage_count']),
      correctAttemptPercentage:
          (json['correct_attempt_percentage'] ?? '0').toString(),
      wrongAttemptPercentage:
          (json['wrong_attempt_percentage'] ?? '0').toString(),
      skipPercentage: (json['skip_percentage'] ?? '0').toString(),
      correctCount: _readInt(json['correct_count']),
      wrongCount: _readInt(json['wrong_count']),
      skippedCount: _readInt(json['skipped_count']),
    );
  }
}

int _readInt(dynamic value) {
  if (value is int) {
    return value;
  }
  return int.tryParse(value?.toString() ?? '') ?? 0;
}
