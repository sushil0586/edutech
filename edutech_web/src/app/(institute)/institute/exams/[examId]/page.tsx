import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { InstitutePageHeader } from "@/components/ui/institute-page-header";
import type { TeacherResultSummary } from "@/features/dashboard/types";
import {
  configureTeacherExamEconomyAccess,
  fetchTeacherExamDetail,
  fetchTeacherResultPublishReadiness,
  fetchTeacherResultSummary,
  getTeacherApiState,
  runTeacherExamAction,
} from "@/lib/api/teacher";
import { fetchTeacherOptionCatalog } from "@/lib/api/teacher-builder";
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

function examSubjectDisplayLabel(detail: {
  subject_name: string | null;
  subject_summary?: { display_label: string } | null;
}) {
  return detail.subject_summary?.display_label || detail.subject_name || "Subject pending";
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
    redirect(`/institute/exams/${examId}?error=${encodeURIComponent(message)}`);
  }

  redirect(`/institute/exams/${examId}?message=${encodeURIComponent("Exam access policy updated successfully.")}`);
}

async function loadInstituteExamDetail(examId: string) {
  const state = getTeacherApiState();

  if (!state.apiConfigured) {
    return {
      source: "unconfigured" as const,
      detail: null,
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
    return {
      source: "live" as const,
      detail,
      resultSummary: allResultSummaries.find((summary) => summary.exam === examId) ?? null,
      resultPublishReadiness,
    };
  } catch {
    return {
      source: "error" as const,
      detail: null,
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
  const { source, detail, resultSummary, resultPublishReadiness } = await loadInstituteExamDetail(examId);
  const optionCatalog = groupTeacherOptionCatalog(await fetchTeacherOptionCatalog().catch(() => []));
  const economyAccessPolicyOptions = optionCatalog.selectOptions("exam_economy_access_policy");
  const economyAccessPolicyLabels = optionCatalog.labelMap("exam_economy_access_policy");

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
      ? [{ action: "publish", idleLabel: "Publish Exam", pendingLabel: "Publishing..." }]
      : detail.status === "scheduled"
        ? [
            { action: "mark-live", idleLabel: "Mark Live", pendingLabel: "Marking Live..." },
            { action: "cancel", idleLabel: "Cancel Exam", pendingLabel: "Cancelling..." },
          ]
        : detail.status === "live"
          ? [{ action: "mark-completed", idleLabel: "Mark Completed", pendingLabel: "Completing..." }]
          : [];
  const readinessSnapshot = buildExamReadinessSnapshot({
    examStatus: detail.status,
    activeQuestionsCount: detail.active_questions_count,
    assignedStudentCount: detail.assigned_student_count,
    resultSummary,
  });

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
          <Link className="button buttonPrimary" href={`/institute/exams/${detail.id}/builder`}>
            Open Builder
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

      <section className="dashboardGrid">
        <article className="dashboardPanel insightPanel">
          <div className="sectionHeading">
            <strong>Exam Actions</strong>
            <Link href="/institute/exams">Back to Exams</Link>
          </div>
          <p className="emptyText">
            Use these live actions to move the exam through its backend-controlled delivery lifecycle.
          </p>
          <div className="resultCardActions examDetailActionGrid">
            <div className="examDetailActionLane examDetailActionLanePrimary">
              <Link className="button buttonPrimary" href={`/institute/exams/${detail.id}/builder?tab=questions`}>
                Link Questions
              </Link>
              <Link className="button buttonSecondary" href={`/institute/exams/${detail.id}/builder`}>
                Open Builder
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
          <form action={instituteExamEconomyAction} className="builderForm">
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
