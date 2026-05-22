class TeacherQuestionAnalysisModel {
  const TeacherQuestionAnalysisModel({
    required this.questionId,
    required this.questionTextSummary,
    required this.subjectName,
    required this.topicName,
    required this.totalAttempts,
    required this.correctCount,
    required this.wrongCount,
    required this.skippedCount,
    required this.markedForReviewCount,
  });

  final String questionId;
  final String questionTextSummary;
  final String? subjectName;
  final String? topicName;
  final int totalAttempts;
  final int correctCount;
  final int wrongCount;
  final int skippedCount;
  final int markedForReviewCount;

  double get wrongRate =>
      totalAttempts == 0 ? 0 : (wrongCount / totalAttempts) * 100;

  factory TeacherQuestionAnalysisModel.fromJson(Map<String, dynamic> json) {
    return TeacherQuestionAnalysisModel(
      questionId: (json['question_id'] ?? '').toString(),
      questionTextSummary: (json['question_text_summary'] ?? '').toString(),
      subjectName: json['subject_name']?.toString(),
      topicName: json['topic_name']?.toString(),
      totalAttempts: _readInt(json['total_attempts']),
      correctCount: _readInt(json['correct_count']),
      wrongCount: _readInt(json['wrong_count']),
      skippedCount: _readInt(json['skipped_count']),
      markedForReviewCount: _readInt(json['marked_for_review_count']),
    );
  }
}

int _readInt(dynamic value) {
  if (value is int) {
    return value;
  }
  return int.tryParse(value?.toString() ?? '') ?? 0;
}
