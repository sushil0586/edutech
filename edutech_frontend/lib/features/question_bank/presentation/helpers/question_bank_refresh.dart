import 'package:education_frontend/features/dashboard/presentation/providers/dashboard_providers.dart';
import 'package:education_frontend/features/question_bank/presentation/providers/question_bank_providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';


void invalidateQuestionBankViews(WidgetRef ref) {
  ref.invalidate(questionPageProvider);
  ref.invalidate(filteredQuestionsProvider);
  ref.invalidate(teacherQuestionPerformanceProvider);
  ref.invalidate(teacherQuestionsProvider);
}


void invalidateQuestionBankListOnly(WidgetRef ref) {
  ref.invalidate(questionPageProvider);
  ref.invalidate(teacherQuestionsProvider);
}
