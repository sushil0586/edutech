import 'package:education_frontend/features/exams/domain/models/student_exam_option.dart';
import 'package:education_frontend/shared/domain/models/rich_attachment_model.dart';

class StudentExamQuestion {
  const StudentExamQuestion({
    required this.id,
    required this.questionId,
    required this.questionText,
    required this.questionTextSummary,
    required this.contentFormat,
    required this.questionType,
    required this.sectionName,
    required this.questionOrder,
    required this.marks,
    required this.negativeMarks,
    required this.isMandatory,
    required this.isActive,
    required this.options,
    required this.attachments,
  });

  final String id;
  final String questionId;
  final String questionText;
  final String questionTextSummary;
  final String contentFormat;
  final String questionType;
  final String? sectionName;
  final String marks;
  final String negativeMarks;
  final int questionOrder;
  final bool isMandatory;
  final bool isActive;
  final List<StudentExamOption> options;
  final List<RichAttachmentModel> attachments;

  bool get supportsChoiceOptions =>
      questionType == 'mcq_single' || questionType == 'true_false';

  factory StudentExamQuestion.fromJson(Map<String, dynamic> json) {
    final options =
        (json['options'] as List<dynamic>? ?? <dynamic>[])
            .whereType<Map<String, dynamic>>()
            .map(StudentExamOption.fromJson)
            .toList()
          ..sort((a, b) => a.optionOrder.compareTo(b.optionOrder));
    final attachments =
        (json['attachments'] as List<dynamic>? ?? <dynamic>[])
            .whereType<Map<String, dynamic>>()
            .map(RichAttachmentModel.fromJson)
            .toList()
          ..sort((a, b) => a.displayOrder.compareTo(b.displayOrder));

    return StudentExamQuestion(
      id: (json['id'] ?? '').toString(),
      questionId: (json['question'] ?? '').toString(),
      questionText: json['question_text'] as String? ?? '',
      questionTextSummary: json['question_text_summary'] as String? ?? '',
      contentFormat: (json['content_format'] ?? 'markdown_latex').toString(),
      questionType: json['question_type'] as String? ?? 'mcq_single',
      sectionName: json['section_name'] as String?,
      questionOrder: json['question_order'] as int? ?? 0,
      marks: (json['marks'] ?? '0').toString(),
      negativeMarks: (json['negative_marks'] ?? '0').toString(),
      isMandatory: json['is_mandatory'] as bool? ?? false,
      isActive: json['is_active'] as bool? ?? true,
      options: options,
      attachments: attachments,
    );
  }
}
