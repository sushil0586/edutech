import { AdvancedExamBuilder } from "@/components/ui/advanced-exam-builder";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { TeacherPageHeader } from "@/components/ui/teacher-page-header";
import {
  fetchTeacherAcademicYears,
  fetchTeacherAssessmentRegistry,
  fetchTeacherCohorts,
  fetchTeacherOptionCatalog,
  fetchTeacherPrograms,
  fetchTeacherSubjects,
  fetchTeacherTopics,
} from "@/lib/api/teacher-builder";
import { fetchPortalList } from "@/lib/api/portal";
import { requireTeacherSession } from "@/lib/auth/session";
import { groupTeacherOptionCatalog } from "@/lib/teacher/option-catalog";

const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "live", label: "Live" },
];

const ADVANCED_BUILDER_FEATURE_CODE = "ADVANCED_EXAM_BUILDER";
const TEMPLATE_LIBRARY_FEATURE_CODE = "EXAM_BLUEPRINT_EXPORT";

type InstituteQuestionFeatureEntitlement = {
  id: string;
  feature_code: string;
  status: string;
};

export default async function TeacherAdvancedExamBuilderPage() {
  const profile = await requireTeacherSession();

  if (!profile.institute) {
    throw new Error("Teacher institute scope is missing.");
  }

  const featureEntitlements = await fetchPortalList<InstituteQuestionFeatureEntitlement>(
    "/api/v1/economy/admin/institute-question-bank-feature-entitlements/",
  ).catch(() => []);
  const hasAdvancedBuilderAccess = featureEntitlements.some(
    (entitlement) =>
      entitlement.feature_code === ADVANCED_BUILDER_FEATURE_CODE &&
      entitlement.status === "active",
  );
  const hasTemplateLibraryAccess = featureEntitlements.some(
    (entitlement) =>
      entitlement.feature_code === TEMPLATE_LIBRARY_FEATURE_CODE &&
      entitlement.status === "active",
  );

  if (!hasAdvancedBuilderAccess) {
    return (
      <div className="studentPage studentPageTight createExamPage teacherConsolePage teacherExamBuilderPageVivid">
        <TeacherPageHeader
          title="Advanced Exam Builder"
          description="Compose multi-section exams with explicit topic counts, difficulty mix, and premium access settings from one calm teacher workspace."
        />

        <StudentStatePanel
          eyebrow="Feature entitlement required"
          title="Advanced exam builder is not enabled for your institute yet"
          description="Teacher access to this workspace now follows the live institute feature entitlement. Ask your institute admin or platform operator to activate the Advanced Exam Builder feature through the licensed package or subscription plan."
          bullets={["Institute-level feature activation", "Teacher exam authoring unlock"]}
          ctaHref="/teacher/exams"
          ctaLabel="Back To Exams"
          statusLabel="Subscription controlled"
        />
      </div>
    );
  }

  const [academicYears, programs, optionCatalogEntries, assessmentRegistry] = await Promise.all([
    fetchTeacherAcademicYears(),
    fetchTeacherPrograms(),
    fetchTeacherOptionCatalog(),
    fetchTeacherAssessmentRegistry(),
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
        assessmentRegistry={assessmentRegistry}
        assignmentModeOptions={optionCatalog.selectOptions("exam_assignment_mode")}
        audience="teacher"
        defaultSource="teacher"
        deliveryModeOptions={optionCatalog.selectOptions("exam_delivery_mode")}
        economyPolicyOptions={optionCatalog.selectOptions("exam_economy_access_policy")}
        examTypeOptions={optionCatalog.selectOptions("exam_type")}
        hasTemplateLibraryAccess={hasTemplateLibraryAccess}
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
        templateLibraryDisabledMessage="Reusable advanced exam templates are controlled by the EXAM_BLUEPRINT_EXPORT feature entitlement. Ask your institute admin or platform operator to enable template-library access if you need save, import, export, or archive actions."
        timerModeOptions={optionCatalog.selectOptions("exam_timer_mode")}
        attemptPolicyOptions={optionCatalog.selectOptions("exam_attempt_policy")}
      />
    </div>
  );
}
