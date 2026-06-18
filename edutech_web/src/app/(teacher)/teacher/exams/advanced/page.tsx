import { AdvancedExamBuilder } from "@/components/ui/advanced-exam-builder";
import { TeacherPageHeader } from "@/components/ui/teacher-page-header";
import {
  fetchTeacherAcademicYears,
  fetchTeacherCohorts,
  fetchTeacherOptionCatalog,
  fetchTeacherPrograms,
  fetchTeacherSubjects,
  fetchTeacherTopics,
} from "@/lib/api/teacher-builder";
import { requireTeacherSession } from "@/lib/auth/session";
import { groupTeacherOptionCatalog } from "@/lib/teacher/option-catalog";

const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "live", label: "Live" },
];

export default async function TeacherAdvancedExamBuilderPage() {
  const profile = await requireTeacherSession();

  if (!profile.institute) {
    throw new Error("Teacher institute scope is missing.");
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
    <div className="studentPage studentPageTight createExamPage teacherConsolePage teacherExamBuilderPageVivid">
      <TeacherPageHeader
        title="Advanced Exam Builder"
        description="Compose multi-section exams with explicit topic counts, difficulty mix, and premium access settings from one calm teacher workspace."
      />

      <AdvancedExamBuilder
        academicYears={academicYears}
        assignmentModeOptions={optionCatalog.selectOptions("exam_assignment_mode")}
        audience="teacher"
        defaultSource="teacher"
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
        scopeLabel="teacher scope"
        securityModeOptions={optionCatalog.selectOptions("exam_security_mode")}
        sourceOptions={[
          { value: "teacher", label: "Teacher" },
          { value: "institute", label: "Institute" },
        ]}
        statusOptions={statusOptions}
        successBasePath="/teacher/exams"
        timerModeOptions={optionCatalog.selectOptions("exam_timer_mode")}
        attemptPolicyOptions={optionCatalog.selectOptions("exam_attempt_policy")}
      />
    </div>
  );
}
