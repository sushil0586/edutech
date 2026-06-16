import 'package:education_frontend/shared/domain/models/rich_attachment_model.dart';

class StudentAttemptReview {
  const StudentAttemptReview({
    required this.attemptId,
    required this.examId,
    required this.examTitle,
    required this.examCode,
    required this.studentId,
    required this.studentName,
    required this.attemptNo,
    required this.status,
    required this.startedAt,
    required this.submittedAt,
    required this.expiresAt,
    required this.serverTime,
    required this.totalQuestions,
    required this.attemptedQuestions,
    required this.correctAnswers,
    required this.incorrectAnswers,
    required this.skippedQuestions,
    required this.score,
    required this.negativeScore,
    required this.finalScore,
    required this.percentage,
    required this.timeTakenSeconds,
    required this.isAutoSubmitted,
    required this.reviewMode,
    required this.showCorrectAnswers,
    required this.showExplanations,
    required this.questions,
  });

  final String attemptId;
  final String examId;
  final String examTitle;
  final String examCode;
  final String studentId;
  final String studentName;
  final int attemptNo;
  final String status;
  final DateTime? startedAt;
  final DateTime? submittedAt;
  final DateTime? expiresAt;
  final DateTime? serverTime;
  final int totalQuestions;
  final int attemptedQuestions;
  final int correctAnswers;
  final int incorrectAnswers;
  final int skippedQuestions;
  final String score;
  final String negativeScore;
  final String finalScore;
  final String percentage;
  final int? timeTakenSeconds;
  final bool isAutoSubmitted;
  final String reviewMode;
  final bool showCorrectAnswers;
  final bool showExplanations;
  final List<StudentAttemptReviewQuestion> questions;

  factory StudentAttemptReview.fromJson(Map<String, dynamic> json) {
    final reviewQuestions =
        (json['review_questions'] as List<dynamic>? ?? const <dynamic>[])
            .whereType<Map<String, dynamic>>()
            .map(StudentAttemptReviewQuestion.fromJson)
            .toList()
          ..sort((a, b) => a.questionOrder.compareTo(b.questionOrder));

    return StudentAttemptReview(
      attemptId: (json['id'] ?? '').toString(),
      examId: (json['exam'] ?? '').toString(),
      examTitle: json['exam_title'] as String? ?? 'Exam',
      examCode: json['exam_code'] as String? ?? '-',
      studentId: (json['student'] ?? '').toString(),
      studentName: json['student_name'] as String? ?? 'Student',
      attemptNo: json['attempt_no'] as int? ?? 1,
      status: json['status'] as String? ?? 'submitted',
      startedAt: DateTime.tryParse(json['started_at'] as String? ?? ''),
      submittedAt: DateTime.tryParse(json['submitted_at'] as String? ?? ''),
      expiresAt: DateTime.tryParse(json['expires_at'] as String? ?? ''),
      serverTime: DateTime.tryParse(json['server_time'] as String? ?? ''),
      totalQuestions: json['total_questions'] as int? ?? 0,
      attemptedQuestions: json['attempted_questions'] as int? ?? 0,
      correctAnswers: json['correct_answers'] as int? ?? 0,
      incorrectAnswers: json['incorrect_answers'] as int? ?? 0,
      skippedQuestions: json['skipped_questions'] as int? ?? 0,
      score: (json['score'] ?? '0').toString(),
      negativeScore: (json['negative_score'] ?? '0').toString(),
      finalScore: (json['final_score'] ?? '0').toString(),
      percentage: (json['percentage'] ?? '0').toString(),
      timeTakenSeconds: json['time_taken_seconds'] as int?,
      isAutoSubmitted: json['is_auto_submitted'] as bool? ?? false,
      reviewMode: (json['review_mode'] ?? 'attempted_only').toString(),
      showCorrectAnswers: json['show_correct_answers'] as bool? ?? false,
      showExplanations: json['show_explanations'] as bool? ?? false,
      questions: reviewQuestions,
    );
  }
}

class StudentAttemptReviewQuestion {
  const StudentAttemptReviewQuestion({
    required this.examQuestionId,
    required this.questionId,
    required this.questionOrder,
    required this.sectionId,
    required this.sectionName,
    required this.sectionTitle,
    required this.sectionOrder,
    required this.questionText,
    required this.contentFormat,
    required this.questionType,
    required this.difficultyLevel,
    required this.subjectName,
    required this.topicName,
    required this.explanation,
    required this.selectedOptionId,
    required this.answerText,
    required this.isMarkedForReview,
    required this.marksAwarded,
    required this.negativeMarksApplied,
    required this.resultStatus,
    required this.options,
    required this.attachments,
  });

  final String examQuestionId;
  final String questionId;
  final int questionOrder;
  final String? sectionId;
  final String? sectionName;
  final String? sectionTitle;
  final int? sectionOrder;
  final String questionText;
  final String contentFormat;
  final String questionType;
  final String difficultyLevel;
  final String? subjectName;
  final String? topicName;
  final String explanation;
  final String? selectedOptionId;
  final String answerText;
  final bool isMarkedForReview;
  final String marksAwarded;
  final String negativeMarksApplied;
  final String resultStatus;
  final List<StudentAttemptReviewOption> options;
  final List<RichAttachmentModel> attachments;

  bool get wasSkipped => resultStatus == 'skipped';
  bool get wasCorrect => resultStatus == 'correct';
  bool get wasWrong => resultStatus == 'wrong';

  factory StudentAttemptReviewQuestion.fromJson(Map<String, dynamic> json) {
    final options =
        (json['options'] as List<dynamic>? ?? const <dynamic>[])
            .whereType<Map<String, dynamic>>()
            .map(StudentAttemptReviewOption.fromJson)
            .toList()
          ..sort((a, b) => a.optionOrder.compareTo(b.optionOrder));
    final attachments =
        (json['attachments'] as List<dynamic>? ?? const <dynamic>[])
            .whereType<Map<String, dynamic>>()
            .map(RichAttachmentModel.fromJson)
            .toList()
          ..sort((a, b) => a.displayOrder.compareTo(b.displayOrder));
    return StudentAttemptReviewQuestion(
      examQuestionId: (json['exam_question_id'] ?? '').toString(),
      questionId: (json['question_id'] ?? '').toString(),
      questionOrder: json['question_order'] as int? ?? 0,
      sectionId: json['section_id']?.toString(),
      sectionName: json['section_name'] as String?,
      sectionTitle: json['section_title'] as String?,
      sectionOrder: json['section_order'] as int?,
      questionText: json['question_text'] as String? ?? '',
      contentFormat: (json['content_format'] ?? 'markdown_latex').toString(),
      questionType: json['question_type'] as String? ?? 'mcq_single',
      difficultyLevel: json['difficulty_level'] as String? ?? 'intermediate',
      subjectName: json['subject_name'] as String?,
      topicName: json['topic_name'] as String?,
      explanation: json['explanation'] as String? ?? '',
      selectedOptionId: json['selected_option']?.toString(),
      answerText: json['answer_text'] as String? ?? '',
      isMarkedForReview: json['is_marked_for_review'] as bool? ?? false,
      marksAwarded: (json['marks_awarded'] ?? '0').toString(),
      negativeMarksApplied: (json['negative_marks_applied'] ?? '0').toString(),
      resultStatus: json['result_status'] as String? ?? 'skipped',
      options: options,
      attachments: attachments,
    );
  }
}

class StudentAttemptReviewOption {
  const StudentAttemptReviewOption({
    required this.id,
    required this.contentFormat,
    required this.optionText,
    required this.optionOrder,
    required this.isSelected,
    required this.isCorrect,
  });

  final String id;
  final String contentFormat;
  final String optionText;
  final int optionOrder;
  final bool isSelected;
  final bool isCorrect;

  factory StudentAttemptReviewOption.fromJson(Map<String, dynamic> json) {
    return StudentAttemptReviewOption(
      id: (json['id'] ?? '').toString(),
      contentFormat: (json['content_format'] ?? 'markdown_latex').toString(),
      optionText: json['option_text'] as String? ?? '',
      optionOrder: json['option_order'] as int? ?? 0,
      isSelected: json['is_selected'] as bool? ?? false,
      isCorrect: json['is_correct'] as bool? ?? false,
    );
  }
}
