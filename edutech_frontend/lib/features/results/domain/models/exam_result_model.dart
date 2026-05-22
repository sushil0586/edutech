class ExamResultModel {
  const ExamResultModel({
    required this.id,
    required this.instituteId,
    required this.examId,
    required this.studentId,
    required this.attemptId,
    required this.resultStatus,
    required this.totalMarks,
    required this.score,
    required this.negativeScore,
    required this.finalScore,
    required this.percentage,
    required this.correctAnswers,
    required this.incorrectAnswers,
    required this.skippedQuestions,
    required this.timeTakenSeconds,
    required this.isPublished,
    required this.isActive,
    required this.examTitle,
    required this.examCode,
    required this.studentName,
    required this.studentAdmissionNo,
    this.rank,
    this.publishedAt,
  });

  final String id;
  final String instituteId;
  final String examId;
  final String studentId;
  final String attemptId;
  final String resultStatus;
  final String totalMarks;
  final String score;
  final String negativeScore;
  final String finalScore;
  final String percentage;
  final int correctAnswers;
  final int incorrectAnswers;
  final int skippedQuestions;
  final int timeTakenSeconds;
  final bool isPublished;
  final bool isActive;
  final String examTitle;
  final String examCode;
  final String studentName;
  final String studentAdmissionNo;
  final int? rank;
  final String? publishedAt;

  int get attemptedQuestions => correctAnswers + incorrectAnswers;

  factory ExamResultModel.fromJson(Map<String, dynamic> json) {
    return ExamResultModel(
      id: (json['id'] ?? '').toString(),
      instituteId: (json['institute'] ?? '').toString(),
      examId: (json['exam'] ?? '').toString(),
      studentId: (json['student'] ?? '').toString(),
      attemptId: (json['attempt'] ?? '').toString(),
      resultStatus: (json['result_status'] ?? 'pending').toString(),
      totalMarks: (json['total_marks'] ?? '0').toString(),
      score: (json['score'] ?? '0').toString(),
      negativeScore: (json['negative_score'] ?? '0').toString(),
      finalScore: (json['final_score'] ?? '0').toString(),
      percentage: (json['percentage'] ?? '0').toString(),
      correctAnswers: _readInt(json['correct_answers']),
      incorrectAnswers: _readInt(json['incorrect_answers']),
      skippedQuestions: _readInt(json['skipped_questions']),
      timeTakenSeconds: _readInt(json['time_taken_seconds']),
      isPublished: json['is_published'] as bool? ?? false,
      isActive: json['is_active'] as bool? ?? false,
      examTitle: (json['exam_title'] ?? 'Exam').toString(),
      examCode: (json['exam_code'] ?? '-').toString(),
      studentName: (json['student_name'] ?? 'Student').toString(),
      studentAdmissionNo: (json['student_admission_no'] ?? '-').toString(),
      rank: _readNullableInt(json['rank']),
      publishedAt: json['published_at']?.toString(),
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
