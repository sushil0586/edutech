import 'package:education_frontend/features/results/domain/models/exam_result_model.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';


ExamResultModel? resolveStudentResultSelection(
  List<ExamResultModel> results,
  AsyncValue<List<ExamResultModel>>? performanceValue,
  String? requestedId,
) {
  final fallback = results.firstOrNull;
  final selected = results.firstWhere(
    (item) => item.id == requestedId,
    orElse: () => fallback ?? results.first,
  );
  final performanceItems = performanceValue?.maybeWhen(
    data: (items) => items,
    orElse: () => const <ExamResultModel>[],
  );
  return performanceItems?.firstWhere(
        (item) => item.id == selected.id,
        orElse: () => selected,
      ) ??
      selected;
}
