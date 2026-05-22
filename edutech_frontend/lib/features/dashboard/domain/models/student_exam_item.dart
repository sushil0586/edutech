class StudentExamItem {
  const StudentExamItem({
    required this.id,
    required this.title,
    required this.code,
    this.subjectId,
    this.startAt,
    this.endAt,
  });

  final String id;
  final String title;
  final String code;
  final String? subjectId;
  final DateTime? startAt;
  final DateTime? endAt;

  factory StudentExamItem.fromJson(Map<String, dynamic> json) {
    return StudentExamItem(
      id: (json['id'] ?? '').toString(),
      title: (json['title'] ?? 'Untitled exam').toString(),
      code: (json['code'] ?? '-').toString(),
      subjectId: json['subject']?.toString(),
      startAt: DateTime.tryParse(json['start_at']?.toString() ?? ''),
      endAt: DateTime.tryParse(json['end_at']?.toString() ?? ''),
    );
  }
}
