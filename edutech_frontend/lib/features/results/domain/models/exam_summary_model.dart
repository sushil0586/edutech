class ExamSummaryModel {
  const ExamSummaryModel({
    required this.id,
    required this.instituteId,
    required this.examId,
    required this.examTitle,
    required this.examCode,
    required this.totalStudents,
    required this.totalAttempted,
    required this.totalPassed,
    required this.totalFailed,
    required this.averageScore,
    required this.highestScore,
    required this.lowestScore,
    required this.averagePercentage,
    required this.isActive,
    this.lastCalculatedAt,
  });

  final String id;
  final String instituteId;
  final String examId;
  final String examTitle;
  final String examCode;
  final int totalStudents;
  final int totalAttempted;
  final int totalPassed;
  final int totalFailed;
  final String averageScore;
  final String highestScore;
  final String lowestScore;
  final String averagePercentage;
  final bool isActive;
  final String? lastCalculatedAt;

  factory ExamSummaryModel.fromJson(Map<String, dynamic> json) {
    return ExamSummaryModel(
      id: (json['id'] ?? '').toString(),
      instituteId: (json['institute'] ?? '').toString(),
      examId: (json['exam'] ?? '').toString(),
      examTitle: (json['exam_title'] ?? 'Exam').toString(),
      examCode: (json['exam_code'] ?? '-').toString(),
      totalStudents: _readInt(json['total_students']),
      totalAttempted: _readInt(json['total_attempted']),
      totalPassed: _readInt(json['total_passed']),
      totalFailed: _readInt(json['total_failed']),
      averageScore: (json['average_score'] ?? '0').toString(),
      highestScore: (json['highest_score'] ?? '0').toString(),
      lowestScore: (json['lowest_score'] ?? '0').toString(),
      averagePercentage: (json['average_percentage'] ?? '0').toString(),
      isActive: json['is_active'] as bool? ?? false,
      lastCalculatedAt: json['last_calculated_at']?.toString(),
    );
  }
}

int _readInt(dynamic value) {
  if (value is int) {
    return value;
  }
  return int.tryParse(value?.toString() ?? '') ?? 0;
}
