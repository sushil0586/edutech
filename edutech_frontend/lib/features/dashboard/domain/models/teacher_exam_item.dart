class TeacherExamItem {
  const TeacherExamItem({
    required this.id,
    required this.title,
    required this.code,
    required this.status,
  });

  final String id;
  final String title;
  final String code;
  final String status;

  factory TeacherExamItem.fromJson(Map<String, dynamic> json) {
    return TeacherExamItem(
      id: (json['id'] ?? '').toString(),
      title: (json['title'] ?? 'Exam').toString(),
      code: (json['code'] ?? '-').toString(),
      status: (json['status'] ?? 'draft').toString(),
    );
  }
}
