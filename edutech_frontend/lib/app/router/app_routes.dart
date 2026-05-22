abstract final class AppRoutes {
  static const login = '/login';
  static const dashboard = '/dashboard';
  static const exams = '/exams';
  static const studentExamDetailPattern = '/exams/:examId';
  static const studentAttemptPattern = '/exams/:examId/attempts/:attemptId';
  static const studentAttemptSummaryPattern =
      '/exams/:examId/attempts/:attemptId/summary';
  static const studentAttemptReviewPattern =
      '/exams/:examId/attempts/:attemptId/review';
  static const questionBank = '/question-bank';
  static const results = '/results';
  static const academicSetup = '/academic-setup';

  static String studentExamDetail(String examId) => '/exams/$examId';

  static String studentAttempt({
    required String examId,
    required String attemptId,
  }) {
    return '/exams/$examId/attempts/$attemptId';
  }

  static String studentAttemptSummary({
    required String examId,
    required String attemptId,
  }) {
    return '/exams/$examId/attempts/$attemptId/summary';
  }

  static String studentAttemptReview({
    required String examId,
    required String attemptId,
  }) {
    return '/exams/$examId/attempts/$attemptId/review';
  }
}
