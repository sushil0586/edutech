class StudentExamOption {
  const StudentExamOption({
    required this.id,
    required this.contentFormat,
    required this.optionText,
    required this.optionOrder,
    required this.isActive,
  });

  final String id;
  final String contentFormat;
  final String optionText;
  final int optionOrder;
  final bool isActive;

  factory StudentExamOption.fromJson(Map<String, dynamic> json) {
    return StudentExamOption(
      id: (json['id'] ?? '').toString(),
      contentFormat: (json['content_format'] ?? 'markdown_latex').toString(),
      optionText: json['option_text'] as String? ?? '',
      optionOrder: json['option_order'] as int? ?? 0,
      isActive: json['is_active'] as bool? ?? true,
    );
  }
}
