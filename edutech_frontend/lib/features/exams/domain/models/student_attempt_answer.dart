class StudentAttemptAnswer {
  const StudentAttemptAnswer({
    required this.id,
    required this.questionId,
    required this.questionTextSummary,
    required this.selectedOptionId,
    required this.selectedOptionText,
    required this.answerText,
    required this.isMarkedForReview,
    this.isCorrect,
    this.marksAwarded,
    this.negativeMarksApplied,
  });

  final String id;
  final String questionId;
  final String questionTextSummary;
  final String? selectedOptionId;
  final String? selectedOptionText;
  final String answerText;
  final bool isMarkedForReview;
  final bool? isCorrect;
  final String? marksAwarded;
  final String? negativeMarksApplied;

  factory StudentAttemptAnswer.fromJson(Map<String, dynamic> json) {
    return StudentAttemptAnswer(
      id: (json['id'] ?? '').toString(),
      questionId: (json['question'] ?? '').toString(),
      questionTextSummary: json['question_text_summary'] as String? ?? '',
      selectedOptionId: json['selected_option']?.toString(),
      selectedOptionText: json['selected_option_text'] as String?,
      answerText: json['answer_text'] as String? ?? '',
      isMarkedForReview: json['is_marked_for_review'] as bool? ?? false,
      isCorrect: json['is_correct'] as bool?,
      marksAwarded: json['marks_awarded']?.toString(),
      negativeMarksApplied: json['negative_marks_applied']?.toString(),
    );
  }

  StudentAttemptAnswer copyWith({
    String? selectedOptionId,
    String? selectedOptionText,
    String? answerText,
    bool? isMarkedForReview,
    bool clearSelection = false,
  }) {
    return StudentAttemptAnswer(
      id: id,
      questionId: questionId,
      questionTextSummary: questionTextSummary,
      selectedOptionId: clearSelection
          ? null
          : (selectedOptionId ?? this.selectedOptionId),
      selectedOptionText: clearSelection
          ? null
          : (selectedOptionText ?? this.selectedOptionText),
      answerText: answerText ?? this.answerText,
      isMarkedForReview: isMarkedForReview ?? this.isMarkedForReview,
      isCorrect: isCorrect,
      marksAwarded: marksAwarded,
      negativeMarksApplied: negativeMarksApplied,
    );
  }
}
