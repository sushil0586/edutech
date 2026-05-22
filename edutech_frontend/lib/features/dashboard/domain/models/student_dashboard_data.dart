import 'package:education_frontend/features/dashboard/domain/models/student_exam_item.dart';
import 'package:education_frontend/features/dashboard/domain/models/student_insight_summary.dart';
import 'package:education_frontend/features/dashboard/domain/models/student_result_item.dart';

class StudentDashboardData {
  const StudentDashboardData({
    required this.availableExams,
    required this.recentResults,
    required this.insightSummary,
  });

  final List<StudentExamItem> availableExams;
  final List<StudentResultItem> recentResults;
  final StudentInsightSummary insightSummary;

  int get availableExamCount => availableExams.length;
  int get recentResultCount => recentResults.length;
}
