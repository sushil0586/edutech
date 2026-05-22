class StudentResultItem {
  const StudentResultItem({
    required this.id,
    required this.examTitle,
    required this.examCode,
    required this.resultStatus,
    required this.finalScore,
    required this.percentage,
    required this.isPublished,
    this.rank,
  });

  final String id;
  final String examTitle;
  final String examCode;
  final String resultStatus;
  final String finalScore;
  final String percentage;
  final bool isPublished;
  final int? rank;

  factory StudentResultItem.fromJson(Map<String, dynamic> json) {
    return StudentResultItem(
      id: (json['id'] ?? '').toString(),
      examTitle: (json['exam_title'] ?? 'Exam').toString(),
      examCode: (json['exam_code'] ?? '-').toString(),
      resultStatus: (json['result_status'] ?? 'pending').toString(),
      finalScore: (json['final_score'] ?? '0').toString(),
      percentage: (json['percentage'] ?? '0').toString(),
      isPublished: json['is_published'] as bool? ?? false,
      rank: _readNullableInt(json['rank']),
    );
  }
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
