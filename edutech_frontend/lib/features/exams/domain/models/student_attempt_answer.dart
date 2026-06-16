class StudentAttemptAnswer {
  const StudentAttemptAnswer({
    required this.id,
    required this.questionId,
    required this.questionTextSummary,
    required this.selectedOptionId,
    required this.selectedOptionText,
    required this.selectedOptionIds,
    required this.selectedOptionTexts,
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
  final List<String> selectedOptionIds;
  final List<String> selectedOptionTexts;
  final String answerText;
  final bool isMarkedForReview;
  final bool? isCorrect;
  final String? marksAwarded;
  final String? negativeMarksApplied;

  factory StudentAttemptAnswer.fromJson(Map<String, dynamic> json) {
    final selectedOptionIds =
        (json['selected_option_ids'] as List<dynamic>? ?? const <dynamic>[])
            .map((item) => item.toString())
            .where((item) => item.isNotEmpty)
            .toList();
    final selectedOptionTexts =
        (json['selected_option_texts'] as List<dynamic>? ?? const <dynamic>[])
            .map((item) => item.toString())
            .where((item) => item.isNotEmpty)
            .toList();
    final selectedOptionId = json['selected_option']?.toString();
    final selectedOptionText = json['selected_option_text'] as String?;
    return StudentAttemptAnswer(
      id: (json['id'] ?? '').toString(),
      questionId: (json['question'] ?? '').toString(),
      questionTextSummary: json['question_text_summary'] as String? ?? '',
      selectedOptionId:
          selectedOptionId ??
          (selectedOptionIds.isNotEmpty ? selectedOptionIds.first : null),
      selectedOptionText:
          selectedOptionText ??
          (selectedOptionTexts.isNotEmpty ? selectedOptionTexts.first : null),
      selectedOptionIds: selectedOptionIds,
      selectedOptionTexts: selectedOptionTexts,
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
    List<String>? selectedOptionIds,
    List<String>? selectedOptionTexts,
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
      selectedOptionIds: clearSelection
          ? const <String>[]
          : (selectedOptionIds ?? this.selectedOptionIds),
      selectedOptionTexts: clearSelection
          ? const <String>[]
          : (selectedOptionTexts ?? this.selectedOptionTexts),
      answerText: answerText ?? this.answerText,
      isMarkedForReview: isMarkedForReview ?? this.isMarkedForReview,
      isCorrect: isCorrect,
      marksAwarded: marksAwarded,
      negativeMarksApplied: negativeMarksApplied,
    );
  }
}
