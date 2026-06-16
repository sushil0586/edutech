class StudentExamItem {
  const StudentExamItem({
    required this.id,
    required this.title,
    required this.code,
    required this.availabilityState,
    this.subjectId,
    this.startAt,
    this.endAt,
  });

  final String id;
  final String title;
  final String code;
  final String availabilityState;
  final String? subjectId;
  final DateTime? startAt;
  final DateTime? endAt;

  factory StudentExamItem.fromJson(Map<String, dynamic> json) {
    return StudentExamItem(
      id: (json['id'] ?? '').toString(),
      title: (json['title'] ?? 'Untitled exam').toString(),
      code: (json['code'] ?? '-').toString(),
      availabilityState: (json['availability_state'] ?? 'upcoming').toString(),
      subjectId: json['subject']?.toString(),
      startAt: DateTime.tryParse(json['start_at']?.toString() ?? ''),
      endAt: DateTime.tryParse(json['end_at']?.toString() ?? ''),
    );
  }
}
