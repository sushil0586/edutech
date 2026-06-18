import { AdvancedExamBuilder } from "@/components/ui/advanced-exam-builder";
import { InstitutePageHeader } from "@/components/ui/institute-page-header";
import {
  fetchTeacherAcademicYears,
  fetchTeacherCohorts,
  fetchTeacherOptionCatalog,
  fetchTeacherPrograms,
  fetchTeacherSubjects,
  fetchTeacherTopics,
} from "@/lib/api/teacher-builder";
import { requireInstituteAdminSession } from "@/lib/auth/session";
import { groupTeacherOptionCatalog } from "@/lib/teacher/option-catalog";

const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "live", label: "Live" },
];

export default async function InstituteAdvancedExamBuilderPage() {
  const profile = await requireInstituteAdminSession();

  if (!profile.institute) {
    throw new Error("Institute scope is missing.");
  }

  const [academicYears, programs, optionCatalogEntries] = await Promise.all([
    fetchTeacherAcademicYears(),
    fetchTeacherPrograms(),
    fetchTeacherOptionCatalog(),
  ]);

  const selectedAcademicYear = academicYears[0]?.id ?? "";
  const selectedProgram = programs[0]?.id ?? "";

  const [cohorts, subjects] = await Promise.all([
    fetchTeacherCohorts({
      academic_year: selectedAcademicYear,
      program: selectedProgram,
    }),
    fetchTeacherSubjects({
      program: selectedProgram,
    }),
  ]);

  const initialSubject = subjects[0]?.id ?? null;
  const topics = initialSubject ? await fetchTeacherTopics({ subject: initialSubject }) : [];
  const optionCatalog = groupTeacherOptionCatalog(optionCatalogEntries);

  return (
    <div className="studentPage studentPageTight createExamPage instituteConsolePage instituteExamBuilderPageVivid">
      <InstitutePageHeader
        title="Advanced Exam Builder"
        description="Build institute-grade custom exams with topic quotas, structured sections, and premium access rules in a single restrained workflow."
      />

      <AdvancedExamBuilder
        academicYears={academicYears}
        assignmentModeOptions={optionCatalog.selectOptions("exam_assignment_mode")}
        audience="institute"
        defaultSource="institute"
        deliveryModeOptions={optionCatalog.selectOptions("exam_delivery_mode")}
        economyPolicyOptions={optionCatalog.selectOptions("exam_economy_access_policy")}
        examTypeOptions={optionCatalog.selectOptions("exam_type")}
        initialCohorts={cohorts}
        initialSubjects={subjects}
        initialTopics={topics}
        instituteCode=""
        navigationModeOptions={optionCatalog.selectOptions("exam_navigation_mode")}
        programs={programs}
        resultPublishModeOptions={optionCatalog.selectOptions("exam_result_publish_mode")}
        reviewModeOptions={optionCatalog.selectOptions("exam_review_mode")}
        scopeLabel="institute scope"
        securityModeOptions={optionCatalog.selectOptions("exam_security_mode")}
        sourceOptions={[{ value: "institute", label: "Institute" }]}
        statusOptions={statusOptions}
        successBasePath="/institute/exams"
        timerModeOptions={optionCatalog.selectOptions("exam_timer_mode")}
        attemptPolicyOptions={optionCatalog.selectOptions("exam_attempt_policy")}
      />
    </div>
  );
}
