class RichAttachmentModel {
  const RichAttachmentModel({
    required this.id,
    required this.fileUrl,
    required this.attachmentType,
    required this.title,
    required this.displayOrder,
    required this.altText,
    required this.isInline,
    required this.isActive,
  });

  final String id;
  final String fileUrl;
  final String attachmentType;
  final String title;
  final int displayOrder;
  final String altText;
  final bool isInline;
  final bool isActive;

  factory RichAttachmentModel.fromJson(Map<String, dynamic> json) {
    return RichAttachmentModel(
      id: (json['id'] ?? '').toString(),
      fileUrl: (json['file_url'] ?? json['file'] ?? '').toString(),
      attachmentType: (json['attachment_type'] ?? 'other').toString(),
      title: (json['title'] ?? '').toString(),
      displayOrder: int.tryParse((json['display_order'] ?? '0').toString()) ?? 0,
      altText: (json['alt_text'] ?? '').toString(),
      isInline: json['is_inline'] as bool? ?? false,
      isActive: json['is_active'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'file_url': fileUrl,
      'attachment_type': attachmentType,
      'title': title,
      'display_order': displayOrder,
      'alt_text': altText,
      'is_inline': isInline,
      'is_active': isActive,
    };
  }
}
