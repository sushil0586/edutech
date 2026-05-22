import 'package:education_frontend/features/academics/presentation/providers/academic_setup_providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';


void invalidateAcademicSetupSection(WidgetRef ref, AcademicSetupSection section) {
  switch (section) {
    case AcademicSetupSection.academicYears:
      ref.invalidate(setupAcademicYearsProvider);
      return;
    case AcademicSetupSection.programs:
      ref.invalidate(setupProgramsProvider);
      return;
    case AcademicSetupSection.cohorts:
      ref.invalidate(setupCohortsProvider);
      return;
    case AcademicSetupSection.subjects:
      ref.invalidate(setupSubjectsProvider);
      return;
    case AcademicSetupSection.topics:
      ref.invalidate(setupTopicsProvider);
      return;
    case AcademicSetupSection.students:
      ref.invalidate(setupStudentsProvider);
      return;
    case AcademicSetupSection.teachers:
      ref.invalidate(setupTeachersProvider);
      return;
    case AcademicSetupSection.teacherAssignments:
      ref.invalidate(setupTeacherAssignmentsProvider);
      return;
  }
}


void invalidateAcademicCredentialSections(WidgetRef ref) {
  ref.invalidate(setupStudentsProvider);
  ref.invalidate(setupTeachersProvider);
}


void invalidateAcademicLookupCaches(WidgetRef ref, String? instituteId) {
  ref.invalidate(lookupAcademicYearsProvider(instituteId));
  ref.invalidate(lookupProgramsProvider(instituteId));
  ref.invalidate(lookupCohortsProvider(instituteId));
  ref.invalidate(lookupSubjectsProvider(instituteId));
  ref.invalidate(lookupTopicsProvider(instituteId));
  ref.invalidate(lookupTeachersProvider(instituteId));
}
