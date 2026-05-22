import 'package:education_frontend/features/dashboard/domain/models/teacher_exam_item.dart';
import 'package:education_frontend/features/dashboard/domain/models/teacher_insight_summary.dart';
import 'package:education_frontend/features/dashboard/domain/models/teacher_question_item.dart';
import 'package:education_frontend/features/dashboard/domain/models/teacher_question_performance_item.dart';
import 'package:education_frontend/features/dashboard/domain/models/teacher_result_summary_item.dart';

class TeacherDashboardData {
  const TeacherDashboardData({
    required this.exams,
    required this.questions,
    required this.resultSummaries,
    required this.insightSummary,
    required this.questionPerformance,
  });

  final List<TeacherExamItem> exams;
  final List<TeacherQuestionItem> questions;
  final List<TeacherResultSummaryItem> resultSummaries;
  final TeacherInsightSummary insightSummary;
  final List<TeacherQuestionPerformanceItem> questionPerformance;

  int get examsCount => exams.length;
  int get questionsCount => questions.length;
  int get resultSummaryCount => resultSummaries.length;
}
