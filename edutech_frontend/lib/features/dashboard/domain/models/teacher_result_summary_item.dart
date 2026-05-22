class TeacherResultSummaryItem {
  const TeacherResultSummaryItem({
    required this.id,
    required this.examTitle,
    required this.examCode,
    required this.totalAttempted,
    required this.averagePercentage,
  });

  final String id;
  final String examTitle;
  final String examCode;
  final int totalAttempted;
  final String averagePercentage;

  factory TeacherResultSummaryItem.fromJson(Map<String, dynamic> json) {
    return TeacherResultSummaryItem(
      id: (json['id'] ?? '').toString(),
      examTitle: (json['exam_title'] ?? 'Exam').toString(),
      examCode: (json['exam_code'] ?? '-').toString(),
      totalAttempted: _readInt(json['total_attempted']),
      averagePercentage: (json['average_percentage'] ?? '0').toString(),
    );
  }
}

int _readInt(dynamic value) {
  if (value is int) {
    return value;
  }
  return int.tryParse(value?.toString() ?? '') ?? 0;
}
