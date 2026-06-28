import Link from "next/link";
import { AdvancedExamBuilder } from "@/components/ui/advanced-exam-builder";
import { InstitutePageHeader } from "@/components/ui/institute-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
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
import { requireInstituteAdminSession } from "@/lib/auth/session";
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

export default async function InstituteAdvancedExamBuilderPage() {
  const profile = await requireInstituteAdminSession();

  if (!profile.institute) {
    throw new Error("Institute scope is missing.");
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
      <div className="studentPage studentPageTight createExamPage instituteConsolePage instituteExamBuilderPageVivid">
        <InstitutePageHeader
          title="Advanced Exam Builder"
          description="Build institute-grade custom exams with topic quotas, structured sections, and premium access rules in a single restrained workflow."
          action={
            <div className="pageHeaderActionGroup">
              <Link className="button buttonGhost" href="/institute/exams/preset-packs">
                Preset Library
              </Link>
            </div>
          }
        />

        <StudentStatePanel
          eyebrow="Feature entitlement required"
          title="Advanced exam builder is not enabled for this institute yet"
          description="This workspace now honors the live institute feature entitlement. Ask the platform operator to activate the Advanced Exam Builder feature through your question-bank package or subscription plan before using this lane."
          bullets={["Active institute feature entitlement", "Platform-managed package or subscription activation"]}
          ctaHref="/institute/economy"
          ctaLabel="Open Economy Oversight"
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
    <div className="studentPage studentPageTight createExamPage instituteConsolePage instituteExamBuilderPageVivid">
      <InstitutePageHeader
        title="Advanced Exam Builder"
        description="Build institute-grade custom exams with topic quotas, structured sections, and premium access rules in a single restrained workflow."
        action={
          <div className="pageHeaderActionGroup">
            <Link className="button buttonGhost" href="/institute/exams/preset-packs">
              Preset Library
            </Link>
          </div>
        }
      />

      <AdvancedExamBuilder
        academicYears={academicYears}
        assessmentRegistry={assessmentRegistry}
        assignmentModeOptions={optionCatalog.selectOptions("exam_assignment_mode")}
        audience="institute"
        defaultSource="institute"
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
        scopeLabel="institute scope"
        securityModeOptions={optionCatalog.selectOptions("exam_security_mode")}
        sourceOptions={[{ value: "institute", label: "Institute" }]}
        statusOptions={statusOptions}
        successBasePath="/institute/exams"
        templateLibraryDisabledMessage="Reusable advanced exam templates are controlled by the EXAM_BLUEPRINT_EXPORT feature entitlement. Ask the platform team to activate template-library access for this institute if you want save, import, export, or archive support."
        timerModeOptions={optionCatalog.selectOptions("exam_timer_mode")}
        attemptPolicyOptions={optionCatalog.selectOptions("exam_attempt_policy")}
      />
    </div>
  );
}
