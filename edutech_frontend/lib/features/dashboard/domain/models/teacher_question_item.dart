class TeacherQuestionItem {
  const TeacherQuestionItem({
    required this.id,
    required this.questionText,
    required this.questionType,
    required this.difficultyLevel,
    required this.explanation,
  });

  final String id;
  final String questionText;
  final String questionType;
  final String difficultyLevel;
  final String explanation;

  factory TeacherQuestionItem.fromJson(Map<String, dynamic> json) {
    return TeacherQuestionItem(
      id: (json['id'] ?? '').toString(),
      questionText: (json['question_text'] ?? 'Question').toString(),
      questionType: (json['question_type'] ?? 'mcq_single').toString(),
      difficultyLevel: (json['difficulty_level'] ?? 'medium').toString(),
      explanation: (json['explanation'] ?? '').toString(),
    );
  }
}
