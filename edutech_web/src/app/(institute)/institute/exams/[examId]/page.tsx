import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { InstitutePageHeader } from "@/components/ui/institute-page-header";
import type { TeacherResultSummary } from "@/features/dashboard/types";
import {
  configureTeacherExamEconomyAccess,
  createTeacherExamSlot,
  fetchTeacherExamDetail,
  fetchTeacherResultPublishReadiness,
  fetchTeacherResultSummary,
  getTeacherApiState,
  overrideTeacherExamStudentSlot,
  runTeacherExamAction,
  updateTeacherExamSlot,
} from "@/lib/api/teacher";
import { fetchTeacherCohorts, fetchTeacherOptionCatalog } from "@/lib/api/teacher-builder";
import { requireInstituteAdminSession } from "@/lib/auth/session";
import { groupTeacherOptionCatalog } from "@/lib/teacher/option-catalog";

function titleCase(value: string) {
  return value.replaceAll("_", " ");
}

function feedbackMessage(value: string | undefined) {
  if (!value) return "";
  return decodeURIComponent(value);
}

function economyPolicyLabel(value: string | null | undefined, labels: Record<string, string>) {
  if (!value) return "Open access";
  return labels[value] ?? titleCase(value);
}

const commercialPathValueMap: Record<string, string> = {
  free: "free",
  free_exam: "free",
  stars_only: "stars_only",
  star_unlock_exam: "stars_only",
  entitlement_only: "subscription_only",
  subscription_only: "subscription_only",
  subscription_covered_exam: "subscription_only",
  stars_or_entitlement: "subscription_or_stars",
  subscription_or_stars: "subscription_or_stars",
  subscription_or_stars_exam: "subscription_or_stars",
  institute_sponsored: "institute_sponsored",
  institute_sponsored_exam: "institute_sponsored",
  platform_managed: "platform_managed",
  platform_sponsored_exam: "platform_managed",
};

function normalizeCommercialPathValue(value: string | null | undefined) {
  return commercialPathValueMap[value ?? ""] ?? value ?? "";
}

function normalizeCommercialPathOptions(options: Array<{ value: string; label: string }>) {
  const canonicalOptions = [
    { value: "", label: "Open Access" },
    { value: "free", label: "Free" },
    { value: "stars_only", label: "Stars Only" },
    { value: "subscription_only", label: "Subscription Only" },
    { value: "subscription_or_stars", label: "Subscription Or Stars" },
    { value: "institute_sponsored", label: "Institute Sponsored" },
    { value: "platform_managed", label: "Platform Managed" },
  ];
  const availableValues = new Set(options.map((option) => normalizeCommercialPathValue(option.value)));
  return canonicalOptions.filter((option) => option.value === "" || availableValues.has(option.value));
}

function commercialPathLabels(baseLabels: Record<string, string>) {
  return {
    ...baseLabels,
    free: "Free",
    stars_only: "Stars Only",
    subscription_only: "Subscription Only",
    subscription_or_stars: "Subscription Or Stars",
    institute_sponsored: "Institute Sponsored",
    platform_managed: "Platform Managed",
  };
}

function examSubjectDisplayLabel(detail: {
  subject_name: string | null;
  subject_summary?: { display_label: string } | null;
}) {
  return detail.subject_summary?.display_label || detail.subject_name || "Subject pending";
}

function normalizeOptionalText(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function normalizeOptionalNumber(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDateTimeLocalValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function normalizeDateTimeInput(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return normalized;
  return date.toISOString();
}

function summarizeRuntimeOps(detail: {
  access_mode: string;
  daily_start_cap: number | null;
  hourly_start_cap: number | null;
  concurrent_active_attempt_cap: number | null;
  access_slots: Array<{
    status: string;
    occupancy: {
      assignment_count: number;
      active_attempt_count: number;
      occupancy_state: string;
    };
  }>;
}) {
  const activeSlots = detail.access_slots.filter((slot) => slot.status === "active");
  const fullSlots = activeSlots.filter((slot) => slot.occupancy.occupancy_state === "full");
  const nearFullSlots = activeSlots.filter((slot) => slot.occupancy.occupancy_state === "near_full");
  const assignedLearners = activeSlots.reduce((sum, slot) => sum + slot.occupancy.assignment_count, 0);
  const liveAttempts = activeSlots.reduce((sum, slot) => sum + slot.occupancy.active_attempt_count, 0);
  const configuredCaps = [
    detail.daily_start_cap ? `Daily ${detail.daily_start_cap}` : null,
    detail.hourly_start_cap ? `Hourly ${detail.hourly_start_cap}` : null,
    detail.concurrent_active_attempt_cap ? `Concurrent ${detail.concurrent_active_attempt_cap}` : null,
  ].filter(Boolean) as string[];

  return {
    activeSlots: activeSlots.length,
    fullSlots: fullSlots.length,
    nearFullSlots: nearFullSlots.length,
    assignedLearners,
    liveAttempts,
    configuredCaps,
    accessModeLabel: titleCase(detail.access_mode),
    pressureLabel:
      fullSlots.length > 0
        ? `${fullSlots.length} full`
        : nearFullSlots.length > 0
          ? `${nearFullSlots.length} near full`
          : activeSlots.length > 0
            ? "Healthy"
            : "No active slots",
  };
}

function buildExamReadinessSnapshot(args: {
  examStatus: string;
  activeQuestionsCount: number;
  assignedStudentCount: number;
  resultSummary: TeacherResultSummary | null;
}) {
  const { examStatus, activeQuestionsCount, assignedStudentCount, resultSummary } = args;
  const blockers: string[] = [];
  const pending: string[] = [];
  const ready: string[] = [];

  if (activeQuestionsCount > 0) {
    ready.push(`${activeQuestionsCount} active question${activeQuestionsCount === 1 ? "" : "s"} linked.`);
  } else {
    blockers.push("No active questions are linked yet.");
  }

  if (assignedStudentCount > 0) {
    ready.push(`${assignedStudentCount} learner${assignedStudentCount === 1 ? "" : "s"} already assigned.`);
  } else {
    pending.push("No learners are assigned yet.");
  }

  if (examStatus === "completed") {
    ready.push("Exam lifecycle is completed.");
  } else if (examStatus === "live") {
    pending.push("Exam is still live. Complete the lifecycle before publishing results.");
  } else {
    pending.push(`Exam lifecycle is currently ${titleCase(examStatus)}.`);
  }

  if (!resultSummary) {
    pending.push("No result summary exists yet.");
  } else {
    ready.push("Result summary already exists for this exam.");
    if (resultSummary.review_blocked) {
      blockers.push(
        `${resultSummary.pending_review_tasks_count} review blocker${
          resultSummary.pending_review_tasks_count === 1 ? "" : "s"
        } still protect publication.`,
      );
    } else {
      ready.push("No review blocker is currently holding publication.");
    }

    if (resultSummary.recheck_review_tasks_count > 0) {
      pending.push(
        `${resultSummary.recheck_review_tasks_count} recheck task${
          resultSummary.recheck_review_tasks_count === 1 ? "" : "s"
        } still need closure.`,
      );
    }

    if (resultSummary.results_published) {
      ready.push("Results are already published to students.");
    } else {
      pending.push("Results are not published yet.");
    }
  }

  return { blockers, pending, ready };
}

function buildLifecycleChecklist(detail: {
  active_questions_count: number;
  assigned_student_count: number;
  start_at: string | null;
  end_at: string | null;
}) {
  return [
    {
      label: "Link questions",
      done: detail.active_questions_count > 0,
      description:
        detail.active_questions_count > 0
          ? `${detail.active_questions_count} active question${detail.active_questions_count === 1 ? "" : "s"} linked.`
          : "No active questions linked yet.",
    },
    {
      label: "Assign learners",
      done: detail.assigned_student_count > 0,
      description:
        detail.assigned_student_count > 0
          ? `${detail.assigned_student_count} learner${detail.assigned_student_count === 1 ? "" : "s"} assigned.`
          : "No learners assigned yet.",
    },
    {
      label: "Confirm schedule",
      done: Boolean(detail.start_at && detail.end_at),
      description:
        detail.start_at && detail.end_at
          ? `Delivery window is set from ${new Date(detail.start_at).toLocaleString("en-IN")} to ${new Date(detail.end_at).toLocaleString("en-IN")}.`
          : "Start and end time are still pending.",
    },
  ];
}

async function instituteExamAction(formData: FormData) {
  "use server";

  const profile = await requireInstituteAdminSession();
  const examId = String(formData.get("exam_id") ?? "");
  const action = String(formData.get("action") ?? "");

  if (!examId || !action) {
    return;
  }

  const supportedActions = new Set([
    "sync-marks",
    "publish",
    "refresh-status",
    "mark-live",
    "mark-completed",
    "cancel",
    "regenerate-access-key",
    "toggle-access-key",
  ]);

  if (!supportedActions.has(action)) {
    redirect(`/institute/exams/${examId}?error=${encodeURIComponent("Unsupported exam action.")}`);
  }

  let successMessage = "Exam action completed successfully.";

  try {
    const response = await runTeacherExamAction(
      examId,
      action as
        | "sync-marks"
        | "publish"
        | "refresh-status"
        | "mark-live"
        | "mark-completed"
        | "cancel"
        | "regenerate-access-key"
        | "toggle-access-key",
      {
        changed_by: profile.teacher_profile ?? undefined,
        remarks: `Triggered from institute web portal: ${action}`,
      },
    );

    successMessage = response.message ?? successMessage;
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to update this exam right now.";
    redirect(`/institute/exams/${examId}?error=${encodeURIComponent(message)}`);
  }

  redirect(`/institute/exams/${examId}?message=${encodeURIComponent(successMessage)}`);
}

async function instituteExamEconomyAction(formData: FormData) {
  "use server";

  await requireInstituteAdminSession();

  const examId = String(formData.get("exam_id") ?? "").trim();
  if (!examId) {
    redirect("/institute/exams?error=Exam%20context%20is%20missing.");
  }

  try {
    await configureTeacherExamEconomyAccess(examId, {
      commercial_path: String(formData.get("commercial_path") ?? "").trim(),
      star_cost: Number(formData.get("star_cost") ?? 0),
      entitlement_code: String(formData.get("entitlement_code") ?? "").trim(),
      priority: Number(formData.get("priority") ?? 100),
    });
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to update the exam access policy right now.";
    redirect(`/institute/exams/${examId}?error=${encodeURIComponent(message)}`);
  }

  redirect(`/institute/exams/${examId}?message=${encodeURIComponent("Exam access policy updated successfully.")}`);
}

async function instituteExamSlotCreateAction(formData: FormData) {
  "use server";

  await requireInstituteAdminSession();

  const examId = String(formData.get("exam_id") ?? "").trim();
  if (!examId) {
    redirect("/institute/exams?error=Exam%20context%20is%20missing.");
  }

  try {
    await createTeacherExamSlot(examId, {
      cohort: normalizeOptionalText(formData.get("cohort")) ?? undefined,
      slot_label: String(formData.get("slot_label") ?? "").trim(),
      slot_start_at: normalizeDateTimeInput(formData.get("slot_start_at")),
      slot_end_at: normalizeDateTimeInput(formData.get("slot_end_at")),
      grace_period_minutes: Number(formData.get("grace_period_minutes") ?? 0),
      assignment_capacity: normalizeOptionalNumber(formData.get("assignment_capacity")),
      start_capacity: normalizeOptionalNumber(formData.get("start_capacity")),
      status: String(formData.get("status") ?? "active").trim() || "active",
      metadata: {},
      is_active: String(formData.get("is_active") ?? "true") === "true",
    });
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to create the exam slot right now.";
    redirect(`/institute/exams/${examId}?error=${encodeURIComponent(message)}`);
  }

  redirect(`/institute/exams/${examId}?message=${encodeURIComponent("Exam slot created successfully.")}`);
}

async function instituteExamSlotUpdateAction(formData: FormData) {
  "use server";

  await requireInstituteAdminSession();

  const examId = String(formData.get("exam_id") ?? "").trim();
  const slotId = String(formData.get("slot_id") ?? "").trim();
  if (!examId || !slotId) {
    redirect("/institute/exams?error=Slot%20context%20is%20missing.");
  }

  try {
    await updateTeacherExamSlot(examId, slotId, {
      cohort: normalizeOptionalText(formData.get("cohort")),
      slot_label: String(formData.get("slot_label") ?? "").trim(),
      slot_start_at: normalizeDateTimeInput(formData.get("slot_start_at")),
      slot_end_at: normalizeDateTimeInput(formData.get("slot_end_at")),
      grace_period_minutes: Number(formData.get("grace_period_minutes") ?? 0),
      assignment_capacity: normalizeOptionalNumber(formData.get("assignment_capacity")),
      start_capacity: normalizeOptionalNumber(formData.get("start_capacity")),
      status: String(formData.get("status") ?? "active").trim() || "active",
      is_active: String(formData.get("is_active") ?? "true") === "true",
    });
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to update the exam slot right now.";
    redirect(`/institute/exams/${examId}?error=${encodeURIComponent(message)}`);
  }

  redirect(`/institute/exams/${examId}?message=${encodeURIComponent("Exam slot updated successfully.")}`);
}

async function instituteExamStudentSlotOverrideAction(formData: FormData) {
  "use server";

  await requireInstituteAdminSession();

  const examId = String(formData.get("exam_id") ?? "").trim();
  if (!examId) {
    redirect("/institute/exams?error=Exam%20context%20is%20missing.");
  }

  try {
    await overrideTeacherExamStudentSlot(examId, {
      student: String(formData.get("student") ?? "").trim(),
      access_slot: normalizeOptionalText(formData.get("access_slot")),
      notes: String(formData.get("notes") ?? "").trim(),
    });
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to update the student slot override right now.";
    redirect(`/institute/exams/${examId}?error=${encodeURIComponent(message)}`);
  }

  redirect(`/institute/exams/${examId}?message=${encodeURIComponent("Student slot override updated successfully.")}`);
}

async function loadInstituteExamDetail(examId: string) {
  const state = getTeacherApiState();

  if (!state.apiConfigured) {
    return {
      source: "unconfigured" as const,
      detail: null,
      cohorts: [],
      resultSummary: null as TeacherResultSummary | null,
      resultPublishReadiness: null,
    };
  }

  try {
    const [detail, allResultSummaries, resultPublishReadiness] = await Promise.all([
      fetchTeacherExamDetail(examId),
      fetchTeacherResultSummary(),
      fetchTeacherResultPublishReadiness(examId).catch(() => null),
    ]);
    const cohorts = await fetchTeacherCohorts({
      institute: detail.institute,
      academic_year: detail.academic_year,
      program: detail.program,
    }).catch(() => []);
    return {
      source: "live" as const,
      detail,
      cohorts,
      resultSummary: allResultSummaries.find((summary) => summary.exam === examId) ?? null,
      resultPublishReadiness,
    };
  } catch {
    return {
      source: "error" as const,
      detail: null,
      cohorts: [],
      resultSummary: null as TeacherResultSummary | null,
      resultPublishReadiness: null,
    };
  }
}

export default async function InstituteExamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  await requireInstituteAdminSession();
  const { examId } = await params;
  const { error, message } = await searchParams;
  const { source, detail, cohorts, resultSummary, resultPublishReadiness } = await loadInstituteExamDetail(examId);
  const optionCatalog = groupTeacherOptionCatalog(await fetchTeacherOptionCatalog().catch(() => []));
  const economyAccessPolicyOptions = normalizeCommercialPathOptions(
    optionCatalog.selectOptions("exam_economy_access_policy"),
  );
  const economyAccessPolicyLabels = commercialPathLabels(
    optionCatalog.labelMap("exam_economy_access_policy"),
  );

  if (!detail) {
    return (
      <div className="studentPage instituteConsolePage instituteExamsPageVivid">
        <InstitutePageHeader
          title="Exam Detail"
          description="This route renders live institute-scoped exam management data from the backend."
          statusLabel={source === "unconfigured" ? "Backend not configured" : "Unable to load exam detail"}
          statusTone={source === "unconfigured" ? "warning" : "demo"}
        />
        <StudentStatePanel
          eyebrow={source === "unconfigured" ? "Setup required" : "Load issue"}
          title={
            source === "unconfigured"
              ? "Waiting for institute exam detail"
              : "Institute exam detail could not be loaded"
          }
          description={
            source === "unconfigured"
              ? "Configure the API base URL and sign in with an active institute account to load exam management data."
              : "The institute exam detail route is connected to the backend, but the current request did not complete successfully."
          }
          bullets={
            source === "unconfigured"
              ? ["Institute exams endpoint", "Exam detail endpoint"]
              : ["Backend connectivity", "Institute exam permissions"]
          }
          ctaHref="/institute/exams"
          ctaLabel="Back to Exams"
          statusLabel={source === "unconfigured" ? "Configuration required" : "Retry after backend check"}
        />
      </div>
    );
  }

  const actionButtons =
    detail.status === "draft"
      ? [{ action: "publish", idleLabel: "Make Exam Available", pendingLabel: "Making Available..." }]
      : detail.status === "scheduled"
        ? [
            { action: "mark-live", idleLabel: "Start Exam Now", pendingLabel: "Starting Now..." },
            { action: "cancel", idleLabel: "Cancel Exam", pendingLabel: "Cancelling..." },
          ]
        : detail.status === "live"
          ? [{ action: "mark-completed", idleLabel: "Finish Exam Delivery", pendingLabel: "Finishing Delivery..." }]
          : [];
  const readinessSnapshot = buildExamReadinessSnapshot({
    examStatus: detail.status,
    activeQuestionsCount: detail.active_questions_count,
    assignedStudentCount: detail.assigned_student_count,
    resultSummary,
  });
  const runtimeOps = summarizeRuntimeOps(detail);
  const lifecycleChecklist = buildLifecycleChecklist(detail);
  const completedChecklistCount = lifecycleChecklist.filter((item) => item.done).length;
  const heroTitle =
    detail.status === "draft"
      ? "Continue setup before learners can enter"
      : detail.status === "scheduled"
        ? "Delivery is scheduled and ready for final checks"
        : detail.status === "live"
          ? "Learners can access this exam right now"
          : resultSummary?.results_published
            ? "Delivery is complete and results are already published"
            : "Review delivery, readiness, and results from one place";
  const heroDescription =
    detail.status === "draft"
      ? `${completedChecklistCount} of ${lifecycleChecklist.length} core setup steps are complete. Continue from the builder to finish the learner-ready setup.`
      : detail.status === "scheduled"
        ? "Review timing, learner targeting, and publication blockers before the delivery window opens."
        : detail.status === "live"
          ? "Watch attempt activity, confirm access rules, and prepare the results workflow after submissions begin."
          : resultSummary?.results_published
            ? "Use this view to confirm the final exam configuration and support learners after release."
            : "Use this page to move between setup, delivery, review, and results decisions without losing context.";

  return (
    <div className="studentPage studentDashboardModern instituteConsolePage instituteExamsPageVivid">
      <InstitutePageHeader
        title={detail.title}
        description="Institute-side exam setup, assignment, and state management backed by live exam APIs."
        statusLabel={titleCase(detail.status)}
        statusTone={
          detail.status === "live"
            ? "live"
            : detail.status === "scheduled"
              ? "warning"
              : detail.status === "draft"
                ? "demo"
                : "danger"
        }
      />

      {message ? <p className="feedbackBanner feedbackBannerSuccess">{feedbackMessage(message)}</p> : null}
      {error ? <p className="feedbackBanner feedbackBannerError">{feedbackMessage(error)}</p> : null}

      <section className="studentInsightHeroCard studentInsightHeroCardCompact">
        <div className="studentInsightHeroCopy">
          <span className="studentDashboardTag">Delivery Control</span>
          <strong>{heroTitle}</strong>
          <small>{heroDescription}</small>
        </div>
        <div className="studentInsightHeroActions">
          <Link className="button buttonPrimary" href={`/institute/exams/${detail.id}/builder`}>
            {detail.status === "draft" ? "Continue Setup" : "Open Builder"}
          </Link>
          <Link className="button buttonSecondary" href="#exam-actions">
            Jump to Delivery Actions
          </Link>
          <Link className="button buttonSecondary" href={`/institute/results?exam=${detail.id}`}>
            Open Results
          </Link>
          <Link className="button buttonGhost" href={`/institute/reviews?exam=${detail.id}`}>
            Open Reviews
          </Link>
          <Link className="button buttonSecondary" href="/institute/question-bank">
            Open Question Bank
          </Link>
        </div>
      </section>

      {detail.status === "draft" ? (
        <section className="contentCard examLifecycleGuideCard">
          <div className="sectionHeading">
            <strong>Next steps before learner release</strong>
            <span>
              Keep this draft simple: finish setup, confirm timing, then make the exam available when the paper is ready.
            </span>
          </div>
          <div className="examLifecycleGuideGrid">
            {lifecycleChecklist.map((item) => (
              <article className="examLifecycleGuideStep" key={item.label}>
                <div className="examLifecycleGuideStepTop">
                  <span className={`statusPill ${item.done ? "statusLive" : "statusWarning"}`}>
                    {item.done ? "Done" : "Pending"}
                  </span>
                  <strong>{item.label}</strong>
                </div>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
          <div className="workspaceFilterActions">
            <Link className="button buttonPrimary" href={`/institute/exams/${detail.id}/builder`}>
              Continue Setup
            </Link>
            <Link className="button buttonSecondary" href={`/institute/exams/${detail.id}/builder?tab=questions`}>
              Link Questions
            </Link>
            <Link className="button buttonSecondary" href={`/institute/exams/${detail.id}/builder?tab=assignment`}>
              Assign Learners
            </Link>
            <Link className="button buttonGhost" href="#exam-actions">
              Review Delivery Actions
            </Link>
          </div>
        </section>
      ) : null}

      <section className="resultsSummaryGrid">
        <article className="metricCard metricCardPrimary dashboardHeroCard">
          <span>Exam Code</span>
          <strong>{detail.code}</strong>
          <small>{examSubjectDisplayLabel(detail)}</small>
        </article>

        <article className="metricCard dashboardHeroCard">
          <span>Questions</span>
          <strong>{detail.active_questions_count}</strong>
          <small>{detail.sections.length} sections configured</small>
        </article>

        <article className="metricCard dashboardHeroCard">
          <span>Assigned Students</span>
          <strong>{detail.assigned_student_count}</strong>
          <small>{titleCase(detail.assignment_mode)}</small>
        </article>

        <article className="metricCard dashboardHeroCard">
          <span>Exam Access Key</span>
          <strong>{detail.access_key}</strong>
          <small>{detail.access_key_enabled ? "Quick entry enabled" : "Quick entry disabled"}</small>
        </article>

        <article className="metricCard dashboardHeroCard">
          <span>Result Status</span>
          <strong>
            {resultSummary?.results_published
              ? "Published"
              : resultSummary?.review_blocked
                ? "Review blocked"
                : resultSummary
                  ? "In progress"
                  : "No summary"}
          </strong>
          <small>
            {resultSummary?.review_blocked
              ? `${resultSummary.pending_review_tasks_count} review blocker(s) and ${resultSummary.recheck_review_tasks_count} recheck task(s)`
              : resultSummary
                ? `${resultSummary.total_attempted} attempts · ${resultSummary.total_passed + resultSummary.total_failed} evaluated`
              : "Generate results after learner submissions are ready"}
          </small>
        </article>

        <article className="metricCard dashboardHeroCard">
          <span>Access Mode</span>
          <strong>{runtimeOps.accessModeLabel}</strong>
          <small>{runtimeOps.activeSlots} active slots in current runtime layout</small>
        </article>

        <article className="metricCard dashboardHeroCard">
          <span>Live Pressure</span>
          <strong>{runtimeOps.liveAttempts}</strong>
          <small>{runtimeOps.pressureLabel} · {runtimeOps.assignedLearners} assigned through active slots</small>
        </article>

        <article className="metricCard dashboardHeroCard">
          <span>Runtime Caps</span>
          <strong>{runtimeOps.configuredCaps.length ? runtimeOps.configuredCaps.length : "None"}</strong>
          <small>{runtimeOps.configuredCaps.length ? runtimeOps.configuredCaps.join(" · ") : "No long-window threshold caps configured"}</small>
        </article>
      </section>

      <section className="teacherResultsReadinessBoard">
        <article className="teacherResultsReadinessHero">
          <span className="studentDashboardTag">Exam readiness</span>
          <strong>
            {resultSummary?.results_published
              ? "Published"
              : readinessSnapshot.blockers.length > 0
                ? "Blocked"
                : "Operationally clear"}
          </strong>
          <p>Use this page to see delivery, review, and result blockers without switching over to the results workspace.</p>
        </article>
        <article className="teacherResultsReadinessCard teacherResultsReadinessCardBlocked">
          <div className="teacherResultsReadinessCardTop">
            <strong>Hard blockers</strong>
            <span className="statusPill statusWarning">{readinessSnapshot.blockers.length}</span>
          </div>
          {readinessSnapshot.blockers.length ? (
            <ul>
              {readinessSnapshot.blockers.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>No hard blocker is visible on this exam right now.</p>
          )}
        </article>
        <article className="teacherResultsReadinessCard">
          <div className="teacherResultsReadinessCardTop">
            <strong>Still pending</strong>
            <span className="statusPill statusDemo">{readinessSnapshot.pending.length}</span>
          </div>
          {readinessSnapshot.pending.length ? (
            <ul>
              {readinessSnapshot.pending.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>No additional pending step stands out here.</p>
          )}
        </article>
        <article className="teacherResultsReadinessCard teacherResultsReadinessCardReady">
          <div className="teacherResultsReadinessCardTop">
            <strong>Already ready</strong>
            <span className="statusPill statusLive">{readinessSnapshot.ready.length}</span>
          </div>
          {readinessSnapshot.ready.length ? (
            <ul>
              {readinessSnapshot.ready.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>No readiness signal has been established yet.</p>
          )}
        </article>
      </section>

      <section className="dashboardGrid">
        <article className="dashboardPanel weakTopicsPanel">
          <div className="sectionHeading">
            <strong>Runtime Ops Snapshot</strong>
            <span>{runtimeOps.pressureLabel}</span>
          </div>
          <div className="questionBankTagRow">
            <span className={`statusPill ${runtimeOps.fullSlots > 0 ? "statusDanger" : runtimeOps.nearFullSlots > 0 ? "statusWarning" : "statusLive"}`}>
              {runtimeOps.pressureLabel}
            </span>
            <span className="statusPill statusDemo">{runtimeOps.activeSlots} active slot{runtimeOps.activeSlots === 1 ? "" : "s"}</span>
            <span className="statusPill statusDemo">{runtimeOps.liveAttempts} live attempt{runtimeOps.liveAttempts === 1 ? "" : "s"}</span>
          </div>
          <div className="weakTopicStack">
            <div className="weakTopicRow">
              <div>
                <strong>Delivery model</strong>
                <span>{runtimeOps.accessModeLabel} controls how this exam opens for learners.</span>
              </div>
              <div className="weakTopicMeta">
                <strong>{detail.access_slots.length}</strong>
                <span>Configured slots</span>
              </div>
            </div>
            <div className="weakTopicRow">
              <div>
                <strong>Capacity watch</strong>
                <span>Use this to catch crowding before students start hitting blocked start windows.</span>
              </div>
              <div className="weakTopicMeta">
                <strong>{runtimeOps.fullSlots}</strong>
                <span>Full · {runtimeOps.nearFullSlots} near full</span>
              </div>
            </div>
            <div className="weakTopicRow">
              <div>
                <strong>Threshold posture</strong>
                <span>{runtimeOps.configuredCaps.length ? runtimeOps.configuredCaps.join(" · ") : "No daily, hourly, or concurrent threshold caps are configured."}</span>
              </div>
              <div className="weakTopicMeta">
                <strong>{runtimeOps.configuredCaps.length}</strong>
                <span>Configured caps</span>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="dashboardGrid">
        <article className="dashboardPanel weakTopicsPanel">
          <div className="sectionHeading">
            <strong>Exam Publish Readiness</strong>
            <span>{detail.publish_readiness.ready ? "Ready" : "Blocked"}</span>
          </div>
          <div className="questionBankTagRow">
            <span className={`statusPill ${detail.publish_readiness.ready ? "statusLive" : "statusWarning"}`}>
              {detail.publish_readiness.blocker_count} blocker{detail.publish_readiness.blocker_count === 1 ? "" : "s"}
            </span>
            <span className={`statusPill ${detail.publish_readiness.warning_count > 0 ? "statusDemo" : "statusLive"}`}>
              {detail.publish_readiness.warning_count} warning{detail.publish_readiness.warning_count === 1 ? "" : "s"}
            </span>
          </div>
          <div className="weakTopicStack">
            {detail.publish_readiness.blockers.length ? (
              detail.publish_readiness.blockers.map((issue: (typeof detail.publish_readiness.blockers)[number]) => (
                <div className="weakTopicRow" key={`exam-blocker-${issue.code}`}>
                  <div>
                    <strong>{issue.code.replaceAll("_", " ")}</strong>
                    <span>{issue.message}</span>
                  </div>
                  <div className="weakTopicMeta">
                    <strong>Blocker</strong>
                    <span>{issue.field}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="weakTopicRow">
                <div>
                  <strong>No exam publish blocker remains</strong>
                  <span>This exam currently satisfies the backend publish-readiness checks.</span>
                </div>
                <div className="weakTopicMeta">
                  <strong>Ready</strong>
                  <span>Delivery allowed</span>
                </div>
              </div>
            )}
            {detail.publish_readiness.warnings.map((issue: (typeof detail.publish_readiness.warnings)[number]) => (
              <div className="weakTopicRow" key={`exam-warning-${issue.code}`}>
                <div>
                  <strong>{issue.code.replaceAll("_", " ")}</strong>
                  <span>{issue.message}</span>
                </div>
                <div className="weakTopicMeta">
                  <strong>Warning</strong>
                  <span>{issue.field}</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="dashboardPanel weakTopicsPanel">
          <div className="sectionHeading">
            <strong>Result Publish Readiness</strong>
            <span>{resultPublishReadiness?.ready ? "Ready" : "Review first"}</span>
          </div>
          {resultPublishReadiness ? (
            <>
              <div className="questionBankTagRow">
                <span className={`statusPill ${resultPublishReadiness.ready ? "statusLive" : "statusWarning"}`}>
                  {resultPublishReadiness.blocker_count} blocker{resultPublishReadiness.blocker_count === 1 ? "" : "s"}
                </span>
                <span className="statusPill statusDemo">
                  {resultPublishReadiness.generated_results_count} generated
                </span>
                <span className="statusPill statusLive">
                  {resultPublishReadiness.published_results_count} published
                </span>
              </div>
              <div className="weakTopicStack">
                {resultPublishReadiness.blockers.length ? (
                  resultPublishReadiness.blockers.map(
                    (issue: (typeof resultPublishReadiness.blockers)[number]) => (
                      <div className="weakTopicRow" key={`result-blocker-${issue.code}`}>
                        <div>
                          <strong>{issue.code.replaceAll("_", " ")}</strong>
                          <span>{issue.message}</span>
                        </div>
                        <div className="weakTopicMeta">
                          <strong>Blocker</strong>
                          <span>{issue.field}</span>
                        </div>
                      </div>
                    ),
                  )
                ) : (
                  <div className="weakTopicRow">
                    <div>
                      <strong>No result publish blocker remains</strong>
                      <span>Lifecycle, review state, and generated results are aligned for publication.</span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>Ready</strong>
                      <span>Publication allowed</span>
                    </div>
                  </div>
                )}
                {resultPublishReadiness.warnings.map(
                  (issue: (typeof resultPublishReadiness.warnings)[number]) => (
                    <div className="weakTopicRow" key={`result-warning-${issue.code}`}>
                      <div>
                        <strong>{issue.code.replaceAll("_", " ")}</strong>
                        <span>{issue.message}</span>
                      </div>
                      <div className="weakTopicMeta">
                        <strong>Warning</strong>
                        <span>{issue.field}</span>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </>
          ) : (
            <p className="emptyText">
              Result publish readiness is unavailable right now. Open the results workspace for the live publication view.
            </p>
          )}
        </article>
      </section>

      <section className="dashboardGrid" id="exam-actions">
        <article className="dashboardPanel insightPanel">
          <div className="sectionHeading">
            <strong>Delivery Actions</strong>
            <Link href="/institute/exams">Back to Exams</Link>
          </div>
          <p className="emptyText">
            Use these actions to move the exam through delivery safely after setup, assignment, and schedule checks are complete.
          </p>
          <div className="resultCardActions examDetailActionGrid">
            <div className="examDetailActionLane examDetailActionLanePrimary">
              <Link className="button buttonPrimary" href={`/institute/exams/${detail.id}/builder?tab=questions`}>
                Link Questions
              </Link>
              <Link className="button buttonSecondary" href={`/institute/exams/${detail.id}/builder`}>
                {detail.status === "draft" ? "Continue Setup" : "Open Builder"}
              </Link>

              {actionButtons.map((item) => (
                <form action={instituteExamAction} key={item.action}>
                  <input name="exam_id" type="hidden" value={detail.id} />
                  <input name="action" type="hidden" value={item.action} />
                  <ActionSubmitButton
                    className="button buttonPrimary"
                    idleLabel={item.idleLabel}
                    pendingLabel={item.pendingLabel}
                  />
                </form>
              ))}
            </div>

            <div className="examDetailActionLane examDetailActionLaneUtility">
              <form action={instituteExamAction}>
                <input name="exam_id" type="hidden" value={detail.id} />
                <input name="action" type="hidden" value="refresh-status" />
                <ActionSubmitButton
                  className="button buttonSecondary"
                  idleLabel="Refresh Status"
                  pendingLabel="Refreshing..."
                />
              </form>

              <form action={instituteExamAction}>
                <input name="exam_id" type="hidden" value={detail.id} />
                <input name="action" type="hidden" value="sync-marks" />
                <ActionSubmitButton
                  className="button buttonGhost"
                  idleLabel="Sync Marks"
                  pendingLabel="Syncing..."
                />
              </form>

              <form action={instituteExamAction}>
                <input name="exam_id" type="hidden" value={detail.id} />
                <input name="action" type="hidden" value="toggle-access-key" />
                <ActionSubmitButton
                  className="button buttonSecondary"
                  idleLabel={detail.access_key_enabled ? "Disable Key Entry" : "Enable Key Entry"}
                  pendingLabel={detail.access_key_enabled ? "Disabling..." : "Enabling..."}
                />
              </form>

              <form action={instituteExamAction}>
                <input name="exam_id" type="hidden" value={detail.id} />
                <input name="action" type="hidden" value="regenerate-access-key" />
                <ActionSubmitButton
                  className="button buttonGhost"
                  idleLabel="Regenerate Key"
                  pendingLabel="Regenerating..."
                />
              </form>
            </div>
          </div>
        </article>

        <article className="dashboardPanel weakTopicsPanel">
          <div className="sectionHeading">
            <strong>Exam Configuration</strong>
            <span>{titleCase(detail.exam_type)}</span>
          </div>
          <div className="weakTopicStack">
            <div className="weakTopicRow">
              <div>
                <strong>Exam access key</strong>
                <span>
                  Share <code>{detail.access_key}</code> with signed-in students for faster exam lookup.
                </span>
              </div>
              <div className="weakTopicMeta">
                <strong>{detail.access_key_enabled ? "Enabled" : "Disabled"}</strong>
                <span>Quick entry</span>
              </div>
            </div>
            <div className="weakTopicRow">
              <div>
                <strong>Schedule</strong>
                <span>{detail.start_at ? new Date(detail.start_at).toLocaleString("en-IN") : "Start time pending"}</span>
              </div>
              <div className="weakTopicMeta">
                <strong>{detail.duration_minutes} min</strong>
                <span>Duration</span>
              </div>
            </div>
            <div className="weakTopicRow">
              <div>
                <strong>Result policy</strong>
                <span>{titleCase(detail.result_publish_mode)}</span>
              </div>
              <div className="weakTopicMeta">
                <strong>{detail.total_marks}</strong>
                <span>Total marks</span>
              </div>
            </div>
            <div className="weakTopicRow">
              <div>
                <strong>Navigation</strong>
                <span>{titleCase(detail.navigation_mode)}</span>
              </div>
              <div className="weakTopicMeta">
                <strong>{detail.passing_marks}</strong>
                <span>Passing marks</span>
              </div>
            </div>
            <div className="weakTopicRow">
              <div>
                <strong>Student access policy</strong>
                <span>
                  {detail.economy_policy
                    ? `${economyPolicyLabel(detail.economy_policy.commercial_path, economyAccessPolicyLabels)}${detail.economy_policy.star_cost > 0 ? ` · ${detail.economy_policy.star_cost} stars` : ""}`
                    : "Open access with no premium gate"}
                </span>
              </div>
              <div className="weakTopicMeta">
                <strong>{detail.economy_policy?.priority ?? "Default"}</strong>
                <span>Policy priority</span>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="dashboardLowerGrid">
        <article className="dashboardPanel weakTopicsPanel">
          <div className="sectionHeading">
            <strong>Student Access and Stars</strong>
            <span>{detail.subject_name ?? "Exam policy"}</span>
          </div>
          <form action={instituteExamEconomyAction} className="builderForm">
            <input name="exam_id" type="hidden" value={detail.id} />
            <div className="builderGrid compact">
              <label className="fieldStack">
                <span>Access policy</span>
                <select defaultValue={normalizeCommercialPathValue(detail.economy_policy?.commercial_path ?? "")} name="commercial_path">
                  {economyAccessPolicyOptions.map((option) => (
                    <option key={option.value || "open-access"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Star cost</span>
                <input
                  defaultValue={detail.economy_policy?.star_cost ?? 0}
                  min="0"
                  name="star_cost"
                  step="1"
                  type="number"
                />
              </label>

              <label className="fieldStack">
                <span>Entitlement code</span>
                <input
                  defaultValue={detail.economy_policy?.entitlement_code ?? ""}
                  name="entitlement_code"
                  placeholder="premium_math_access"
                  type="text"
                />
              </label>

              <label className="fieldStack">
                <span>Priority</span>
                <input
                  defaultValue={detail.economy_policy?.priority ?? 100}
                  min="1"
                  name="priority"
                  step="1"
                  type="number"
                />
              </label>
            </div>
            <p className="emptyText">
              Define whether students get open access, need stars, need an entitlement, or can unlock through either route.
            </p>
            <div className="resultCardActions examDetailActionGrid">
              <ActionSubmitButton
                className="button buttonPrimary"
                idleLabel="Save Access Policy"
                pendingLabel="Saving Policy..."
              />
            </div>
          </form>
        </article>

        <article className="dashboardPanel weakTopicsPanel">
          <div className="sectionHeading">
            <strong>Access Slots</strong>
            <span>{detail.access_slots.length} configured</span>
          </div>
          <form action={instituteExamSlotCreateAction} className="builderForm">
            <input name="exam_id" type="hidden" value={detail.id} />
            <div className="builderGrid compact">
              <label className="fieldStack">
                <span>Slot label</span>
                <input defaultValue={`${detail.cohort_name ?? "General"} Slot`} name="slot_label" placeholder="Morning Batch" required type="text" />
              </label>
              <label className="fieldStack">
                <span>Cohort</span>
                <select defaultValue={detail.cohort ?? ""} name="cohort">
                  <option value="">All eligible cohorts</option>
                  {cohorts.map((cohort) => (
                    <option key={cohort.id} value={cohort.id}>
                      {cohort.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="fieldStack">
                <span>Slot start</span>
                <input defaultValue={toDateTimeLocalValue(detail.start_at)} name="slot_start_at" required type="datetime-local" />
              </label>
              <label className="fieldStack">
                <span>Slot end</span>
                <input defaultValue={toDateTimeLocalValue(detail.end_at)} name="slot_end_at" required type="datetime-local" />
              </label>
              <label className="fieldStack">
                <span>Grace period</span>
                <input defaultValue="15" min="0" name="grace_period_minutes" step="1" type="number" />
              </label>
              <label className="fieldStack">
                <span>Assignment capacity</span>
                <input defaultValue="" min="1" name="assignment_capacity" placeholder="Optional" step="1" type="number" />
              </label>
              <label className="fieldStack">
                <span>Concurrent start cap</span>
                <input defaultValue="" min="1" name="start_capacity" placeholder="Optional" step="1" type="number" />
              </label>
              <label className="fieldStack">
                <span>Status</span>
                <select defaultValue="active" name="status">
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
            </div>
            <p className="emptyText">
              Create slot-managed access windows to control when learners can start and how many can enter together.
            </p>
            <div className="resultCardActions examDetailActionGrid">
              <ActionSubmitButton className="button buttonPrimary" idleLabel="Create Slot" pendingLabel="Creating Slot..." />
            </div>
          </form>
          <div className="weakTopicStack">
            {detail.access_slots.length ? (
              detail.access_slots.map((slot) => (
                <form action={instituteExamSlotUpdateAction} className="weakTopicRow" key={slot.id}>
                  <input name="exam_id" type="hidden" value={detail.id} />
                  <input name="slot_id" type="hidden" value={slot.id} />
                  <input name="is_active" type="hidden" value={String(slot.is_active)} />
                  <div style={{ width: "100%" }}>
                    <div className="builderGrid compact">
                      <label className="fieldStack">
                        <span>Slot label</span>
                        <input defaultValue={slot.slot_label} name="slot_label" required type="text" />
                      </label>
                      <label className="fieldStack">
                        <span>Cohort</span>
                        <select defaultValue={slot.cohort ?? ""} name="cohort">
                          <option value="">All eligible cohorts</option>
                          {cohorts.map((cohort) => (
                            <option key={cohort.id} value={cohort.id}>
                              {cohort.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="fieldStack">
                        <span>Slot start</span>
                        <input defaultValue={toDateTimeLocalValue(slot.slot_start_at)} name="slot_start_at" required type="datetime-local" />
                      </label>
                      <label className="fieldStack">
                        <span>Slot end</span>
                        <input defaultValue={toDateTimeLocalValue(slot.slot_end_at)} name="slot_end_at" required type="datetime-local" />
                      </label>
                      <label className="fieldStack">
                        <span>Grace</span>
                        <input defaultValue={slot.grace_period_minutes} min="0" name="grace_period_minutes" step="1" type="number" />
                      </label>
                      <label className="fieldStack">
                        <span>Assignment cap</span>
                        <input defaultValue={slot.assignment_capacity ?? ""} min="1" name="assignment_capacity" placeholder="Optional" step="1" type="number" />
                      </label>
                      <label className="fieldStack">
                        <span>Start cap</span>
                        <input defaultValue={slot.start_capacity ?? ""} min="1" name="start_capacity" placeholder="Optional" step="1" type="number" />
                      </label>
                      <label className="fieldStack">
                        <span>Status</span>
                        <select defaultValue={slot.status} name="status">
                          <option value="active">Active</option>
                          <option value="paused">Paused</option>
                          <option value="archived">Archived</option>
                        </select>
                      </label>
                    </div>
                    <div className="questionBankTagRow">
                      <span className={`statusPill ${slot.occupancy.occupancy_state === "full" ? "statusDanger" : slot.occupancy.occupancy_state === "near_full" ? "statusWarning" : "statusLive"}`}>
                        {slot.occupancy.occupancy_state.replaceAll("_", " ")}
                      </span>
                      <span className="statusPill statusDemo">
                        {slot.occupancy.assignment_count}
                        {slot.occupancy.assignment_capacity !== null ? ` / ${slot.occupancy.assignment_capacity}` : ""} assigned
                      </span>
                      <span className="statusPill statusDemo">
                        {slot.occupancy.active_attempt_count}
                        {slot.occupancy.start_capacity !== null ? ` / ${slot.occupancy.start_capacity}` : ""} in progress
                      </span>
                    </div>
                    <p className="emptyText">
                      {slot.cohort_name ?? "All eligible cohorts"} · starts {new Date(slot.slot_start_at).toLocaleString("en-IN")} · ends {new Date(slot.slot_end_at).toLocaleString("en-IN")}
                    </p>
                    <div className="resultCardActions examDetailActionGrid">
                      <ActionSubmitButton className="button buttonSecondary" idleLabel="Update Slot" pendingLabel="Updating Slot..." />
                    </div>
                  </div>
                </form>
              ))
            ) : (
              <p className="emptyText">
                No slot-managed windows are configured yet. This exam still relies on the broad exam schedule.
              </p>
            )}
          </div>
        </article>

        <article className="dashboardPanel weakTopicsPanel">
          <div className="sectionHeading">
            <strong>Assigned Students</strong>
            <span>{detail.assigned_students.length} learners</span>
          </div>
          {detail.assignment_mode === "selected_students" && detail.assigned_students.length ? (
            <form action={instituteExamStudentSlotOverrideAction} className="builderForm">
              <input name="exam_id" type="hidden" value={detail.id} />
              <div className="builderGrid compact">
                <label className="fieldStack">
                  <span>Student</span>
                  <select defaultValue={detail.assigned_students[0]?.student ?? ""} name="student" required>
                    {detail.assigned_students.map((student) => (
                      <option key={student.id} value={student.student}>
                        {student.full_name} · {student.admission_no}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="fieldStack">
                  <span>Access slot</span>
                  <select defaultValue="" name="access_slot">
                    <option value="">Clear direct slot override</option>
                    {detail.access_slots.map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {slot.slot_label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="fieldStack">
                  <span>Notes</span>
                  <input defaultValue="" name="notes" placeholder="Support note or reason" type="text" />
                </label>
              </div>
              <p className="emptyText">
                Use direct overrides only when a selected student needs a different slot than the cohort default.
              </p>
              <div className="resultCardActions examDetailActionGrid">
                <ActionSubmitButton className="button buttonPrimary" idleLabel="Save Student Override" pendingLabel="Saving Override..." />
              </div>
            </form>
          ) : detail.assignment_mode === "selected_students" ? (
            <p className="emptyText">
              This exam is in selected-student mode, but no direct assignments exist yet to apply a slot override.
            </p>
          ) : (
            <p className="emptyText">
              Direct student slot overrides are available only when assignment mode is set to selected students.
            </p>
          )}
          <div className="weakTopicStack">
            {detail.assigned_students.length ? (
              detail.assigned_students.map((student) => (
                <div className="weakTopicRow" key={student.id}>
                  <div>
                    <strong>{student.full_name}</strong>
                    <span>
                      {student.admission_no}
                      {student.notes ? ` · ${student.notes}` : ""}
                    </span>
                  </div>
                  <div className="weakTopicMeta">
                    <strong>{student.access_slot_label ?? student.cohort_name ?? "No slot"}</strong>
                    <span>{student.access_slot_label ? "Direct slot override" : "Assigned learner"}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="emptyText">This exam currently has no directly assigned students.</p>
            )}
          </div>
        </article>

        <article className="dashboardPanel weakTopicsPanel">
          <div className="sectionHeading">
            <strong>Publish History</strong>
            <span>{detail.publish_logs.length} records</span>
          </div>
          <div className="weakTopicStack">
            {detail.publish_logs.length ? (
              detail.publish_logs.map((log) => (
                <div className="weakTopicRow" key={log.id}>
                  <div>
                    <strong>{titleCase(log.old_status)} to {titleCase(log.new_status)}</strong>
                    <span>{log.changed_by_name ?? "System action"}</span>
                  </div>
                  <div className="weakTopicMeta">
                    <strong>{new Date(log.created_at).toLocaleString("en-IN")}</strong>
                    <span>{log.remarks || "No remarks"}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="emptyText">No publish or lifecycle history has been recorded for this exam yet.</p>
            )}
          </div>
        </article>
      </section>

      <section className="examGrid">
        {detail.sections.map((section) => (
          <article className="examCard" key={section.id}>
            <div className="examCardTop">
              <div>
                <strong>{section.name}</strong>
                <span>{section.description || "No section description"}</span>
              </div>
              <span className="statusPill statusDemo">Order {section.section_order}</span>
            </div>
            <div className="examMetaGrid">
              <div>
                <span>Questions</span>
                <strong>{section.total_questions}</strong>
              </div>
              <div>
                <span>Duration</span>
                <strong>{section.duration_minutes ?? "N/A"}</strong>
              </div>
              <div>
                <span>Marks / Question</span>
                <strong>{section.marks_per_question ?? "N/A"}</strong>
              </div>
              <div>
                <span>Negative</span>
                <strong>{section.negative_marks_per_question ?? "N/A"}</strong>
              </div>
            </div>
            <p className="examInstructions">
              {section.instructions || "No section-level learner instructions provided yet."}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
