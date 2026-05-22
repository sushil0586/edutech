import 'package:education_frontend/features/academics/data/repositories/academic_lookup_repository.dart';
import 'package:education_frontend/features/academics/domain/models/academic_lookup_option.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final academicYearOptionsProvider = FutureProvider<List<AcademicLookupOption>>((
  ref,
) {
  return ref.watch(academicLookupRepositoryProvider).fetchAcademicYears();
});

final programOptionsProvider = FutureProvider<List<AcademicLookupOption>>((
  ref,
) {
  return ref.watch(academicLookupRepositoryProvider).fetchPrograms();
});

final cohortOptionsProvider = FutureProvider<List<AcademicLookupOption>>((ref) {
  return ref.watch(academicLookupRepositoryProvider).fetchCohorts();
});

final subjectOptionsProvider = FutureProvider<List<AcademicLookupOption>>((
  ref,
) {
  return ref.watch(academicLookupRepositoryProvider).fetchSubjects();
});

final allTopicOptionsProvider = FutureProvider<List<AcademicLookupOption>>((
  ref,
) {
  return ref.watch(academicLookupRepositoryProvider).fetchTopics();
});
