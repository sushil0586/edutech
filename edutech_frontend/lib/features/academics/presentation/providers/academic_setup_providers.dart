import 'package:education_frontend/features/academics/data/repositories/academic_setup_repository.dart';
import 'package:education_frontend/features/academics/domain/models/academic_setup_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum AcademicSetupSection {
  academicYears,
  programs,
  cohorts,
  subjects,
  topics,
  students,
  teachers,
  teacherAssignments,
}

final academicSetupSectionProvider =
    NotifierProvider<AcademicSetupSectionNotifier, AcademicSetupSection>(
      AcademicSetupSectionNotifier.new,
    );

final academicSetupSearchProvider =
    NotifierProvider<AcademicSetupSearchNotifier, String>(
      AcademicSetupSearchNotifier.new,
    );

final academicSetupActiveFilterProvider =
    NotifierProvider<AcademicSetupActiveFilterNotifier, bool?>(
      AcademicSetupActiveFilterNotifier.new,
    );

final academicSetupInstituteFilterProvider =
    NotifierProvider<AcademicSetupInstituteFilterNotifier, String?>(
      AcademicSetupInstituteFilterNotifier.new,
    );

final academicSetupQueryProvider = Provider<SetupQuery>((ref) {
  return SetupQuery(
    search: ref.watch(academicSetupSearchProvider),
    isActive: ref.watch(academicSetupActiveFilterProvider),
    instituteId: ref.watch(academicSetupInstituteFilterProvider),
  );
});

final setupInstitutesProvider = FutureProvider<List<InstituteAdminModel>>((
  ref,
) {
  return ref
      .watch(academicSetupRepositoryProvider)
      .fetchInstitutes(ref.watch(academicSetupQueryProvider));
});

final lookupInstitutesProvider = FutureProvider<List<InstituteAdminModel>>((
  ref,
) {
  return ref
      .watch(academicSetupRepositoryProvider)
      .fetchInstitutes(const SetupQuery(isActive: true));
});

final setupAcademicYearsProvider = FutureProvider<List<AcademicYearAdminModel>>(
  (ref) {
    return ref
        .watch(academicSetupRepositoryProvider)
        .fetchAcademicYears(ref.watch(academicSetupQueryProvider));
  },
);

final setupProgramsProvider = FutureProvider<List<ProgramAdminModel>>((ref) {
  return ref
      .watch(academicSetupRepositoryProvider)
      .fetchPrograms(ref.watch(academicSetupQueryProvider));
});

final setupCohortsProvider = FutureProvider<List<CohortAdminModel>>((ref) {
  return ref
      .watch(academicSetupRepositoryProvider)
      .fetchCohorts(ref.watch(academicSetupQueryProvider));
});

final setupSubjectsProvider = FutureProvider<List<SubjectAdminModel>>((ref) {
  return ref
      .watch(academicSetupRepositoryProvider)
      .fetchSubjects(ref.watch(academicSetupQueryProvider));
});

final setupTopicsProvider = FutureProvider<List<TopicAdminModel>>((ref) {
  return ref
      .watch(academicSetupRepositoryProvider)
      .fetchTopics(ref.watch(academicSetupQueryProvider));
});

final setupStudentsProvider = FutureProvider<List<StudentProfileAdminModel>>((
  ref,
) {
  return ref
      .watch(academicSetupRepositoryProvider)
      .fetchStudents(ref.watch(academicSetupQueryProvider));
});

final setupTeachersProvider = FutureProvider<List<TeacherProfileAdminModel>>((
  ref,
) {
  return ref
      .watch(academicSetupRepositoryProvider)
      .fetchTeachers(ref.watch(academicSetupQueryProvider));
});

final setupTeacherAssignmentsProvider =
    FutureProvider<List<TeacherAssignmentAdminModel>>((ref) {
      return ref
          .watch(academicSetupRepositoryProvider)
          .fetchTeacherAssignments(ref.watch(academicSetupQueryProvider));
    });

final lookupAcademicYearsProvider =
    FutureProvider.family<List<AcademicYearAdminModel>, String?>((
      ref,
      instituteId,
    ) {
      return ref
          .watch(academicSetupRepositoryProvider)
          .fetchAcademicYears(
            SetupQuery(instituteId: instituteId, isActive: true),
          );
    });

final lookupProgramsProvider =
    FutureProvider.family<List<ProgramAdminModel>, String?>((ref, instituteId) {
      return ref
          .watch(academicSetupRepositoryProvider)
          .fetchPrograms(SetupQuery(instituteId: instituteId, isActive: true));
    });

final lookupCohortsProvider =
    FutureProvider.family<List<CohortAdminModel>, String?>((ref, instituteId) {
      return ref
          .watch(academicSetupRepositoryProvider)
          .fetchCohorts(SetupQuery(instituteId: instituteId, isActive: true));
    });

final lookupSubjectsProvider =
    FutureProvider.family<List<SubjectAdminModel>, String?>((ref, instituteId) {
      return ref
          .watch(academicSetupRepositoryProvider)
          .fetchSubjects(SetupQuery(instituteId: instituteId, isActive: true));
    });

final lookupTopicsProvider =
    FutureProvider.family<List<TopicAdminModel>, String?>((ref, instituteId) {
      return ref
          .watch(academicSetupRepositoryProvider)
          .fetchTopics(SetupQuery(instituteId: instituteId, isActive: true));
    });

final lookupTeachersProvider =
    FutureProvider.family<List<TeacherProfileAdminModel>, String?>((
      ref,
      instituteId,
    ) {
      return ref
          .watch(academicSetupRepositoryProvider)
          .fetchTeachers(SetupQuery(instituteId: instituteId, isActive: true));
    });

class AcademicSetupSectionNotifier extends Notifier<AcademicSetupSection> {
  @override
  AcademicSetupSection build() => AcademicSetupSection.academicYears;

  void setSection(AcademicSetupSection section) {
    state = section;
  }
}

class AcademicSetupSearchNotifier extends Notifier<String> {
  @override
  String build() => '';

  void setSearch(String value) {
    state = value;
  }
}

class AcademicSetupActiveFilterNotifier extends Notifier<bool?> {
  @override
  bool? build() => true;

  void setActiveFilter(bool? value) {
    state = value;
  }
}

class AcademicSetupInstituteFilterNotifier extends Notifier<String?> {
  @override
  String? build() => null;

  void setInstitute(String? value) {
    state = value;
  }
}
