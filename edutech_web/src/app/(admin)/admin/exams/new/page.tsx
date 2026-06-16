import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { PlatformAdminPageHeader } from "@/components/ui/platform-admin-page-header";
import { CreateExamWizard } from "@/components/ui/create-exam-wizard";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { fetchTeacherOptionCatalog, createTeacherExam } from "@/lib/api/teacher-builder";
import { configureTeacherExamEconomyAccess } from "@/lib/api/teacher";
import { fetchPortalList } from "@/lib/api/portal";
import { requirePlatformAdminSession } from "@/lib/auth/session";
import {
  benchmarkVisibilityModeOptions,
  percentileVisibilityModeOptions,
  rankFreezePolicyOptions,
  rankVisibilityModeOptions,
} from "@/lib/teacher/exam-visibility";
import { groupTeacherOptionCatalog } from "@/lib/teacher/option-catalog";

type InstituteRecord = {
  id: string;
  name: string;
  code: string;
  city: string;
  state: string;
  country: string;
  is_active: boolean;
};

type AcademicYearRecord = {
  id: string;
  name: string;
  is_active: boolean;
};

type ProgramRecord = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
};

type CohortRecord = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
};

type SubjectRecord = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
};

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

function normalizeSelectedInstitute(
  requestedInstituteId: string | undefined,
  institutes: InstituteRecord[],
) {
  if (requestedInstituteId) {
    const match = institutes.find((item) => item.id === requestedInstituteId);
    if (match) {
      return match.id;
    }
  }

  return institutes.find((item) => item.is_active)?.id ?? institutes[0]?.id ?? "";
}

async function createPlatformExamAction(formData: FormData) {
  "use server";

  await requirePlatformAdminSession();

  const institute = String(formData.get("institute") ?? "").trim();
  if (!institute) {
    redirect("/admin/exams/new?error=Select%20an%20institute%20scope%20before%20creating%20the%20exam.");
  }

  try {
    const payload = {
      institute,
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
    redirect(`/admin/exams?message=${encodeURIComponent("Platform exam shell created successfully.")}`);
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to create the exam right now.";
    redirect(`/admin/exams/new?institute=${encodeURIComponent(institute)}&error=${encodeURIComponent(message)}`);
  }
}

export default async function PlatformAdminNewExamPage({
  searchParams,
}: {
  searchParams: Promise<{ institute?: string; error?: string }>;
}) {
  await requirePlatformAdminSession();
  const { institute: requestedInstituteId, error } = await searchParams;

  const institutes = await fetchPortalList<InstituteRecord>("/api/v1/institutes/?page_size=100").catch(() => []);
  const selectedInstituteId = normalizeSelectedInstitute(requestedInstituteId, institutes);
  const selectedInstitute = institutes.find((item) => item.id === selectedInstituteId) ?? null;

  if (!selectedInstituteId) {
    return (
      <div className="studentPage studentDashboardModern">
        <PlatformAdminPageHeader
          title="Create Exam"
          description="Choose an institute scope first so platform-owned exam authoring stays tied to a real academic structure."
        />
        <StudentStatePanel
          eyebrow="No institute scope"
          title="An institute is required before platform exam creation can begin"
          description="Platform-owned exams still attach to academic structures, so at least one institute must exist before the wizard can load."
          ctaHref="/admin/institutes"
          ctaLabel="Open Institutes"
          statusLabel="Waiting for institute setup"
        />
      </div>
    );
  }

  const instituteQuery = `?institute=${selectedInstituteId}&is_active=true&page_size=200`;
  const [academicYears, programs, cohorts, subjects, optionCatalogEntries] = await Promise.all([
    fetchPortalList<AcademicYearRecord>(`/api/v1/academics/academic-years/${instituteQuery}`),
    fetchPortalList<ProgramRecord>(`/api/v1/academics/programs/${instituteQuery}`),
    fetchPortalList<CohortRecord>(`/api/v1/academics/cohorts/${instituteQuery}`),
    fetchPortalList<SubjectRecord>(`/api/v1/academics/subjects/?institute=${selectedInstituteId}&is_active=true&page_size=200`),
    fetchTeacherOptionCatalog(),
  ]);

  const selectedAcademicYear = academicYears[0]?.id ?? "";
  const selectedProgram = programs[0]?.id ?? "";
  const initialCohorts = selectedProgram
    ? cohorts.filter((cohort) => Boolean(cohort.id))
    : [];
  const initialSubjects = selectedProgram
    ? subjects.filter((subject) => Boolean(subject.id))
    : [];
  const optionCatalog = groupTeacherOptionCatalog(optionCatalogEntries);

  return (
    <div className="studentPage studentPageTight createExamPage">
      <PlatformAdminPageHeader
        title="Create Exam"
        description="Create a platform-owned or institute-owned exam shell inside a selected institute scope, then continue into downstream builder work."
      />

      {error ? <p className="feedbackBanner feedbackBannerError">{decodeURIComponent(error)}</p> : null}

      <section className="studentInsightHeroCard studentInsightHeroCardCompact">
        <div className="studentInsightHeroCopy">
          <span className="studentDashboardTag">Publishing governance</span>
          <strong>Choose the institute scope first, then decide whether this exam is platform-owned or institute-owned</strong>
          <p>
            Platform admin is the only lane that can intentionally choose between platform and institute publishing source
            during initial creation, while still using the same academic backbone as every other workspace.
          </p>
          <small>
            {selectedInstitute ? `${selectedInstitute.name} · ${selectedInstitute.code}` : "No institute selected"}
          </small>
        </div>
        <div className="studentInsightHeroActions">
          <Link className="button buttonSecondary" href="/admin/exams">
            Back to Exams
          </Link>
        </div>
      </section>

      <section className="dashboardPanel">
        <div className="studentPageTight">
          <span className="studentDashboardTag">Institute scope</span>
          <h3>Choose the academic lane this exam belongs to</h3>
          <div className="academicInstituteSelector">
            {institutes.map((institute) => (
              <Link
                className={`academicInstituteChip ${
                  institute.id === selectedInstituteId ? "academicInstituteChipActive" : ""
                }`}
                href={`/admin/exams/new?institute=${institute.id}`}
                key={institute.id}
              >
                <strong>{institute.name}</strong>
                <span>{institute.code}</span>
                <small>
                  {institute.city}, {institute.state}
                </small>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="builderSummaryGrid">
        <article className="builderSummaryCard">
          <span>Institute</span>
          <strong>{selectedInstitute?.code ?? "N/A"}</strong>
          <small>Current academic ownership lane for this exam shell</small>
        </article>
        <article className="builderSummaryCard">
          <span>Academic years</span>
          <strong>{academicYears.length}</strong>
          <small>Live year options in the selected institute</small>
        </article>
        <article className="builderSummaryCard">
          <span>Programs</span>
          <strong>{programs.length}</strong>
          <small>Program choices available before builder handoff</small>
        </article>
        <article className="builderSummaryCard">
          <span>Subjects</span>
          <strong>{subjects.length}</strong>
          <small>Subject lanes available inside the chosen institute scope</small>
        </article>
      </section>

      <section className="builderFlowContent builderFlowContentSolo">
        <CreateExamWizard
          academicYears={academicYears}
          academicsApiBasePath="/api/admin/academics"
          action={createPlatformExamAction}
          attemptPolicyOptions={optionCatalog.selectOptions("exam_attempt_policy")}
          cohorts={initialCohorts}
          deliveryModeOptions={optionCatalog.selectOptions("exam_delivery_mode")}
          economyAccessPolicyOptions={optionCatalog.selectOptions("exam_economy_access_policy")}
          examTypeOptions={optionCatalog.selectOptions("exam_type")}
          hiddenFields={[{ name: "institute", value: selectedInstituteId }]}
          navigationModeOptions={optionCatalog.selectOptions("exam_navigation_mode")}
            programs={programs}
            resultPublishModeOptions={optionCatalog.selectOptions("exam_result_publish_mode")}
            reviewModeOptions={optionCatalog.selectOptions("exam_review_mode")}
            rankVisibilityModeOptions={rankVisibilityModeOptions}
            percentileVisibilityModeOptions={percentileVisibilityModeOptions}
            benchmarkVisibilityModeOptions={benchmarkVisibilityModeOptions}
            rankFreezePolicyOptions={rankFreezePolicyOptions}
            scopeContextLabel="platform-admin scope"
            selectedAcademicYear={selectedAcademicYear}
          selectedProgram={selectedProgram}
          selectedSource="platform"
          securityModeOptions={optionCatalog.selectOptions("exam_security_mode")}
          sourceHelpText="Platform source makes the exam globally platform-owned in learner filtering. Institute source publishes it as institute-owned content from this same admin lane."
          sourceOptions={[
            { value: "platform", label: "Platform" },
            { value: "institute", label: "Institute" },
          ]}
          subjects={initialSubjects}
          timerModeOptions={optionCatalog.selectOptions("exam_timer_mode")}
        />
      </section>
    </div>
  );
}
