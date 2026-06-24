import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { TeacherPageHeader } from "@/components/ui/teacher-page-header";
import type { TeacherResultSummary } from "@/features/dashboard/types";
import {
  configureTeacherExamEconomyAccess,
  fetchTeacherExamDetail,
  fetchTeacherResultSummary,
  getTeacherApiState,
  runTeacherExamAction,
} from "@/lib/api/teacher";
import { fetchTeacherOptionCatalog } from "@/lib/api/teacher-builder";
import { requireTeacherSession } from "@/lib/auth/session";
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

async function teacherExamAction(formData: FormData) {
  "use server";

  const profile = await requireTeacherSession();
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
    redirect(`/teacher/exams/${examId}?error=${encodeURIComponent("Unsupported exam action.")}`);
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
        remarks: `Triggered from teacher web portal: ${action}`,
      },
    );

    successMessage = response.message ?? successMessage;
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to update this exam right now.";
    redirect(`/teacher/exams/${examId}?error=${encodeURIComponent(message)}`);
  }

  redirect(`/teacher/exams/${examId}?message=${encodeURIComponent(successMessage)}`);
}

async function teacherExamEconomyAction(formData: FormData) {
  "use server";

  await requireTeacherSession();

  const examId = String(formData.get("exam_id") ?? "").trim();
  if (!examId) {
    redirect("/teacher/exams?error=Exam%20context%20is%20missing.");
  }

  try {
    await configureTeacherExamEconomyAccess(examId, {
      policy_type: String(formData.get("policy_type") ?? "").trim(),
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
    redirect(`/teacher/exams/${examId}?error=${encodeURIComponent(message)}`);
  }

  redirect(`/teacher/exams/${examId}?message=${encodeURIComponent("Exam access policy updated successfully.")}`);
}

async function loadTeacherExamDetail(examId: string) {
  const state = getTeacherApiState();

  if (!state.apiConfigured) {
    return {
      source: "unconfigured" as const,
      detail: null,
      resultSummary: null as TeacherResultSummary | null,
    };
  }

  try {
    const [detail, allResultSummaries] = await Promise.all([
      fetchTeacherExamDetail(examId),
      fetchTeacherResultSummary(),
    ]);
    return {
      source: "live" as const,
      detail,
      resultSummary: allResultSummaries.find((summary) => summary.exam === examId) ?? null,
    };
  } catch {
    return {
      source: "error" as const,
      detail: null,
      resultSummary: null as TeacherResultSummary | null,
    };
  }
}

export default async function TeacherExamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { examId } = await params;
  const { error, message } = await searchParams;
  const { source, detail, resultSummary } = await loadTeacherExamDetail(examId);
  const optionCatalog = groupTeacherOptionCatalog(await fetchTeacherOptionCatalog().catch(() => []));
  const economyAccessPolicyOptions = optionCatalog.selectOptions("exam_economy_access_policy");
  const economyAccessPolicyLabels = optionCatalog.labelMap("exam_economy_access_policy");

  if (!detail) {
    return (
      <div className="studentPage teacherConsolePage teacherExamsPageVivid">
        <TeacherPageHeader
          title="Exam Detail"
          description="This route renders live teacher-scoped exam management data from the backend."
          statusLabel={source === "unconfigured" ? "Backend not configured" : "Unable to load exam detail"}
          statusTone={source === "unconfigured" ? "warning" : "demo"}
        />
        <StudentStatePanel
          eyebrow={source === "unconfigured" ? "Setup required" : "Load issue"}
          title={
            source === "unconfigured"
              ? "Waiting for teacher exam detail"
              : "Teacher exam detail could not be loaded"
          }
          description={
            source === "unconfigured"
              ? "Configure the API base URL and sign in with an active teacher account to load exam management data."
              : "The teacher exam detail route is connected to the backend, but the current request did not complete successfully."
          }
          bullets={
            source === "unconfigured"
              ? ["Teacher exams endpoint", "Exam detail endpoint"]
              : ["Backend connectivity", "Teacher exam permissions"]
          }
          ctaHref="/teacher/exams"
          ctaLabel="Back to Exams"
          statusLabel={source === "unconfigured" ? "Configuration required" : "Retry after backend check"}
        />
      </div>
    );
  }

  const actionButtons =
    detail.status === "draft"
      ? [{ action: "publish", idleLabel: "Publish Exam", pendingLabel: "Publishing..." }]
      : detail.status === "scheduled"
        ? [
            { action: "mark-live", idleLabel: "Mark Live", pendingLabel: "Marking Live..." },
            { action: "cancel", idleLabel: "Cancel Exam", pendingLabel: "Cancelling..." },
          ]
        : detail.status === "live"
          ? [{ action: "mark-completed", idleLabel: "Mark Completed", pendingLabel: "Completing..." }]
          : [];

  return (
    <div className="studentPage studentDashboardModern teacherConsolePage teacherExamsPageVivid">
      <TeacherPageHeader
        title={detail.title}
        description="Teacher-side exam setup, assignment, and state management backed by live exam APIs."
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
          <strong>Exam delivery and access</strong>
          <small>
            {detail.active_questions_count} active questions · {detail.assigned_student_count} assigned learners
            {resultSummary?.review_blocked
              ? ` · ${resultSummary.pending_review_tasks_count} review blocker${resultSummary.pending_review_tasks_count === 1 ? "" : "s"}`
              : resultSummary?.results_published
                ? " · results published"
                : resultSummary
                  ? " · results in progress"
                  : " · no result summary yet"}
          </small>
        </div>
        <div className="studentInsightHeroActions">
          <Link className="button buttonPrimary" href={`/teacher/exams/${detail.id}/builder`}>
            Open Builder
          </Link>
          <Link className="button buttonSecondary" href={`/teacher/results?exam=${detail.id}`}>
            Open Results
          </Link>
          <Link className="button buttonGhost" href={`/teacher/reviews?exam=${detail.id}`}>
            Open Reviews
          </Link>
        </div>
      </section>

      <section className="resultsSummaryGrid">
        <article className="metricCard metricCardPrimary dashboardHeroCard">
          <span>Exam Code</span>
          <strong>{detail.code}</strong>
          <small>{detail.subject_name ?? "Subject pending"}</small>
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
      </section>

      <section className="dashboardGrid">
        <article className="dashboardPanel insightPanel">
          <div className="sectionHeading">
            <strong>Exam Actions</strong>
            <Link href="/teacher/exams">Back to Exams</Link>
          </div>
          <p className="emptyText">
            Use these live actions to move the exam through its backend-controlled delivery lifecycle.
          </p>
          <div className="resultCardActions examDetailActionGrid">
            <div className="examDetailActionLane examDetailActionLanePrimary">
              <Link className="button buttonPrimary" href={`/teacher/exams/${detail.id}/builder?tab=questions`}>
                Link Questions
              </Link>
              <Link className="button buttonSecondary" href={`/teacher/exams/${detail.id}/builder`}>
                Open Builder
              </Link>

              {actionButtons.map((item) => (
                <form action={teacherExamAction} key={item.action}>
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
              <form action={teacherExamAction}>
                <input name="exam_id" type="hidden" value={detail.id} />
                <input name="action" type="hidden" value="refresh-status" />
                <ActionSubmitButton
                  className="button buttonSecondary"
                  idleLabel="Refresh Status"
                  pendingLabel="Refreshing..."
                />
              </form>

              <form action={teacherExamAction}>
                <input name="exam_id" type="hidden" value={detail.id} />
                <input name="action" type="hidden" value="sync-marks" />
                <ActionSubmitButton
                  className="button buttonGhost"
                  idleLabel="Sync Marks"
                  pendingLabel="Syncing..."
                />
              </form>

              <form action={teacherExamAction}>
                <input name="exam_id" type="hidden" value={detail.id} />
                <input name="action" type="hidden" value="toggle-access-key" />
                <ActionSubmitButton
                  className="button buttonSecondary"
                  idleLabel={detail.access_key_enabled ? "Disable Key Entry" : "Enable Key Entry"}
                  pendingLabel={detail.access_key_enabled ? "Disabling..." : "Enabling..."}
                />
              </form>

              <form action={teacherExamAction}>
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
                    ? `${economyPolicyLabel(detail.economy_policy.policy_type, economyAccessPolicyLabels)}${detail.economy_policy.star_cost > 0 ? ` · ${detail.economy_policy.star_cost} stars` : ""}`
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
          <form action={teacherExamEconomyAction} className="builderForm">
            <input name="exam_id" type="hidden" value={detail.id} />
            <div className="builderGrid compact">
              <label className="fieldStack">
                <span>Access policy</span>
                <select defaultValue={detail.economy_policy?.policy_type ?? ""} name="policy_type">
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
            <strong>Assigned Students</strong>
            <span>{detail.assigned_students.length} learners</span>
          </div>
          <div className="weakTopicStack">
            {detail.assigned_students.length ? (
              detail.assigned_students.map((student) => (
                <div className="weakTopicRow" key={student.id}>
                  <div>
                    <strong>{student.full_name}</strong>
                    <span>{student.admission_no}</span>
                  </div>
                  <div className="weakTopicMeta">
                    <strong>{student.cohort_name ?? "No cohort"}</strong>
                    <span>Assigned learner</span>
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
                <span>Section {section.section_order}</span>
              </div>
              <span className="statusPill statusDemo">{section.linked_questions_count} questions</span>
            </div>
            <p className="examInstructions">
              {section.instructions || section.description || "No section guidance provided."}
            </p>
            <div className="examCardFooter">
              <div className="examStateSummary">
                <strong>{section.duration_minutes ? `${section.duration_minutes} min` : "Shared timer"}</strong>
                <span>{section.timer_enabled ? "Section timer enabled" : "Timer disabled"}</span>
              </div>
              <div className="examStateSummary">
                <strong>{section.total_questions}</strong>
                <span>Total configured questions</span>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
