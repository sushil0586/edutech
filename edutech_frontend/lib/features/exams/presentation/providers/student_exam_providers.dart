import 'package:education_frontend/features/exams/data/repositories/student_exam_repository.dart';
import 'package:education_frontend/features/exams/domain/models/student_attempt.dart';
import 'package:education_frontend/features/exams/domain/models/student_attempt_review.dart';
import 'package:education_frontend/features/exams/domain/models/student_attempt_summary.dart';
import 'package:education_frontend/features/exams/domain/models/student_exam_detail.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final studentAvailableExamListProvider =
    FutureProvider.autoDispose<List<StudentExamDetailListItem>>((ref) {
      return ref.watch(studentExamRepositoryProvider).fetchAvailableExams();
    });

final studentExamDetailProvider =
    FutureProvider.autoDispose.family<StudentExamDetail, String>((ref, examId) {
      return ref.watch(studentExamRepositoryProvider).fetchExamDetail(examId);
    });

final studentAttemptsProvider = FutureProvider.autoDispose<List<StudentAttempt>>((ref) {
  return ref.watch(studentExamRepositoryProvider).fetchStudentAttempts();
});

final studentAttemptSummaryProvider =
    FutureProvider.autoDispose.family<StudentAttemptSummary, String>((ref, attemptId) {
      return ref
          .watch(studentExamRepositoryProvider)
          .fetchAttemptSummary(attemptId);
    });

final studentAttemptDetailProvider =
    FutureProvider.autoDispose.family<StudentAttempt, String>((ref, attemptId) {
      return ref.watch(studentExamRepositoryProvider).fetchAttemptDetail(attemptId);
    });

final studentAttemptReviewProvider =
    FutureProvider.autoDispose.family<StudentAttemptReview, String>((ref, attemptId) {
      return ref.watch(studentExamRepositoryProvider).fetchAttemptReview(attemptId);
    });

final inProgressAttemptForExamProvider =
    Provider.family<StudentAttempt?, String>((ref, examId) {
      final attempts = ref
          .watch(studentAttemptsProvider)
          .maybeWhen(
            data: (attempts) => attempts,
            orElse: () => const <StudentAttempt>[],
          );
      for (final attempt in attempts) {
        if (attempt.examId == examId && attempt.isInProgress) {
          return attempt;
        }
      }
      return null;
    });
