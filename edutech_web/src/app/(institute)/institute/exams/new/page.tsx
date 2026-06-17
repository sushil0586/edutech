import { redirect, unstable_rethrow } from "next/navigation";
import Link from "next/link";
import { InstitutePageHeader } from "@/components/ui/institute-page-header";
import { CreateExamWizard } from "@/components/ui/create-exam-wizard";
import {
  fetchTeacherAcademicYears,
  fetchTeacherPrograms,
  fetchTeacherCohorts,
  fetchTeacherOptionCatalog,
  fetchTeacherSubjects,
  createTeacherExam,
} from "@/lib/api/teacher-builder";
import { configureTeacherExamEconomyAccess } from "@/lib/api/teacher";
import { requireInstituteAdminSession } from "@/lib/auth/session";
import {
  benchmarkVisibilityModeOptions,
  percentileVisibilityModeOptions,
  rankFreezePolicyOptions,
  rankVisibilityModeOptions,
} from "@/lib/teacher/exam-visibility";
import { groupTeacherOptionCatalog } from "@/lib/teacher/option-catalog";

function isChecked(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function asNullableValue(value: FormDataEntryValue | null) {
  const stringValue = String(value ?? "").trim();
  return stringValue ? stringValue : null;
}

function asIsoDateTime(value: FormDataEntryValue | null) {
  const stringValue = String(value ?? "").trim();
  if (!stringValue) return null;
  return new Date(stringValue).toISOString();
}

async function createExamAction(formData: FormData) {
  "use server";

  const profile = await requireInstituteAdminSession();

  if (!profile.institute) {
    redirect("/institute/exams?error=Institute%20scope%20is%20missing.");
  }

  try {
    const payload = {
      institute: profile.institute,
      academic_year: String(formData.get("academic_year") ?? "").trim(),
      program: String(formData.get("program") ?? "").trim(),
      cohort: asNullableValue(formData.get("cohort")),
      subject: asNullableValue(formData.get("subject")),
      source_type: String(formData.get("source_type") ?? "").trim(),
      title: String(formData.get("title") ?? "").trim(),
      code: String(formData.get("code") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      exam_type: String(formData.get("exam_type") ?? "").trim(),
      delivery_mode: String(formData.get("delivery_mode") ?? "").trim(),
      duration_minutes: Number(formData.get("duration_minutes") ?? 0),
      total_marks: String(formData.get("total_marks") ?? "0").trim() || "0",
      passing_marks: String(formData.get("passing_marks") ?? "0").trim() || "0",
      start_at: asIsoDateTime(formData.get("start_at")),
      end_at: asIsoDateTime(formData.get("end_at")),
      instructions: String(formData.get("instructions") ?? "").trim(),
      allow_late_submit: isChecked(formData, "allow_late_submit"),
      randomize_questions: isChecked(formData, "randomize_questions"),
      randomize_options: isChecked(formData, "randomize_options"),
      show_result_immediately: isChecked(formData, "show_result_immediately"),
      allow_review_after_submit: isChecked(formData, "allow_review_after_submit"),
      max_attempts: Number(formData.get("max_attempts") ?? 1),
      timer_mode: String(formData.get("timer_mode") ?? "").trim(),
      navigation_mode: String(formData.get("navigation_mode") ?? "").trim(),
      attempt_policy: String(formData.get("attempt_policy") ?? "").trim(),
      result_publish_mode: String(formData.get("result_publish_mode") ?? "").trim(),
      review_mode: String(formData.get("review_mode") ?? "").trim(),
      security_mode: String(formData.get("security_mode") ?? "").trim(),
      rank_visibility_mode: String(formData.get("rank_visibility_mode") ?? "").trim(),
      percentile_visibility_mode: String(formData.get("percentile_visibility_mode") ?? "").trim(),
      benchmark_visibility_mode: String(formData.get("benchmark_visibility_mode") ?? "").trim(),
      rank_freeze_policy: String(formData.get("rank_freeze_policy") ?? "").trim(),
      allow_resume: isChecked(formData, "allow_resume"),
      allow_section_switching: isChecked(formData, "allow_section_switching"),
      allow_return_to_previous_section: isChecked(formData, "allow_return_to_previous_section"),
      result_publish_at: asIsoDateTime(formData.get("result_publish_at")),
      review_available_from: asIsoDateTime(formData.get("review_available_from")),
      review_available_until: asIsoDateTime(formData.get("review_available_until")),
    };

    const exam = await createTeacherExam(payload);
    await configureTeacherExamEconomyAccess(exam.id, {
      policy_type: String(formData.get("economy_policy_type") ?? "").trim(),
      star_cost: Number(formData.get("economy_star_cost") ?? 0),
      entitlement_code: String(formData.get("economy_entitlement_code") ?? "").trim(),
      priority: Number(formData.get("economy_policy_priority") ?? 100),
    });
    redirect(`/institute/exams/${exam.id}?message=${encodeURIComponent("Exam created. Continue with builder, questions, and assignments.")}`);
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to create the exam right now.";
    redirect(`/institute/exams/new?error=${encodeURIComponent(message)}`);
  }
}

export default async function NewInstituteExamPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireInstituteAdminSession();
  const { error } = await searchParams;

  const [academicYears, programs] = await Promise.all([
    fetchTeacherAcademicYears(),
    fetchTeacherPrograms(),
  ]);

  const selectedAcademicYear = academicYears[0]?.id ?? "";
  const selectedProgram = programs[0]?.id ?? "";

  const [cohorts, subjects, optionCatalogEntries] = await Promise.all([
    fetchTeacherCohorts({
      academic_year: selectedAcademicYear,
      program: selectedProgram,
    }),
    fetchTeacherSubjects({
      program: selectedProgram,
    }),
    fetchTeacherOptionCatalog(),
  ]);
  const optionCatalog = groupTeacherOptionCatalog(optionCatalogEntries);

  return (
    <div className="studentPage studentPageTight createExamPage">
      <InstitutePageHeader
        title="Create Exam"
        description="Start a new institute exam shell with live academic scope data, then continue into builder, question linking, and learner assignment."
        action={
          <Link className="button buttonSecondary" href="/institute/exams/advanced">
            Open Advanced Builder
          </Link>
        }
      />

      {error ? <p className="feedbackBanner feedbackBannerError">{decodeURIComponent(error)}</p> : null}

      <section className="studentInsightHeroCard studentInsightHeroCardCompact">
        <div className="studentInsightHeroCopy">
          <span className="studentDashboardTag">Guided Authoring</span>
          <strong>Create exam shell</strong>
          <small>
            {academicYears.length} academic years · {programs.length} programs visible in scope
          </small>
        </div>
      </section>

      <section className="builderSummaryGrid">
        <article className="builderSummaryCard">
          <span>Scope ready</span>
          <strong>{academicYears.length}</strong>
          <small>Academic year options currently visible in institute scope</small>
        </article>
        <article className="builderSummaryCard">
          <span>Programs</span>
          <strong>{programs.length}</strong>
          <small>Live program choices available for the new exam shell</small>
        </article>
        <article className="builderSummaryCard">
          <span>Cohorts</span>
          <strong>{cohorts.length}</strong>
          <small>Immediate cohort audience options from the current program</small>
        </article>
        <article className="builderSummaryCard">
          <span>Subjects</span>
          <strong>{subjects.length}</strong>
          <small>Subjects you can attach before moving into questions and sections</small>
        </article>
      </section>

      <section className="builderFlowContent builderFlowContentSolo">
        <CreateExamWizard
          academicYears={academicYears}
          action={createExamAction}
          attemptPolicyOptions={optionCatalog.selectOptions("exam_attempt_policy")}
          cohorts={cohorts}
          deliveryModeOptions={optionCatalog.selectOptions("exam_delivery_mode")}
          economyAccessPolicyOptions={optionCatalog.selectOptions("exam_economy_access_policy")}
          examTypeOptions={optionCatalog.selectOptions("exam_type")}
          navigationModeOptions={optionCatalog.selectOptions("exam_navigation_mode")}
          programs={programs}
          resultPublishModeOptions={optionCatalog.selectOptions("exam_result_publish_mode")}
          reviewModeOptions={optionCatalog.selectOptions("exam_review_mode")}
          rankVisibilityModeOptions={rankVisibilityModeOptions}
          percentileVisibilityModeOptions={percentileVisibilityModeOptions}
          benchmarkVisibilityModeOptions={benchmarkVisibilityModeOptions}
          rankFreezePolicyOptions={rankFreezePolicyOptions}
          scopeContextLabel="institute scope"
          selectedSource="institute"
          securityModeOptions={optionCatalog.selectOptions("exam_security_mode")}
          selectedAcademicYear={selectedAcademicYear}
          selectedProgram={selectedProgram}
          sourceHelpText="Institute-created exams stay institute-owned for learner filtering and reporting."
          sourceOptions={[{ value: "institute", label: "Institute" }]}
          subjects={subjects}
          timerModeOptions={optionCatalog.selectOptions("exam_timer_mode")}
        />
      </section>
    </div>
  );
}
