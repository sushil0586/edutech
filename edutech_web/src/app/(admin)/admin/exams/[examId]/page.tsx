import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { PlatformAdminPageHeader } from "@/components/ui/platform-admin-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import {
  configureTeacherExamEconomyAccess,
  fetchTeacherExamDetail,
  getTeacherApiState,
  runTeacherExamAction,
} from "@/lib/api/teacher";
import { fetchTeacherOptionCatalog } from "@/lib/api/teacher-builder";
import { requirePlatformAdminSession } from "@/lib/auth/session";
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

async function adminExamAction(formData: FormData) {
  "use server";

  const profile = await requirePlatformAdminSession();
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
    redirect(`/admin/exams/${examId}?error=${encodeURIComponent("Unsupported exam action.")}`);
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
        remarks: `Triggered from platform-admin web portal: ${action}`,
      },
    );

    successMessage = response.message ?? successMessage;
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to update this exam right now.";
    redirect(`/admin/exams/${examId}?error=${encodeURIComponent(message)}`);
  }

  redirect(`/admin/exams/${examId}?message=${encodeURIComponent(successMessage)}`);
}

async function adminExamEconomyAction(formData: FormData) {
  "use server";

  await requirePlatformAdminSession();

  const examId = String(formData.get("exam_id") ?? "").trim();
  if (!examId) {
    redirect("/admin/exams?error=Exam%20context%20is%20missing.");
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
    redirect(`/admin/exams/${examId}?error=${encodeURIComponent(message)}`);
  }

  redirect(`/admin/exams/${examId}?message=${encodeURIComponent("Exam access policy updated successfully.")}`);
}

async function loadTeacherExamDetail(examId: string) {
  const state = getTeacherApiState();

  if (!state.apiConfigured) {
    return {
      source: "unconfigured" as const,
      detail: null,
    };
  }

  try {
    const detail = await fetchTeacherExamDetail(examId);
    return {
      source: "live" as const,
      detail,
    };
  } catch {
    return {
      source: "error" as const,
      detail: null,
    };
  }
}

export default async function PlatformAdminExamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { examId } = await params;
  const { error, message } = await searchParams;
  const { source, detail } = await loadTeacherExamDetail(examId);
  const optionCatalog = groupTeacherOptionCatalog(await fetchTeacherOptionCatalog().catch(() => []));
  const economyAccessPolicyOptions = optionCatalog.selectOptions("exam_economy_access_policy");
  const economyAccessPolicyLabels = optionCatalog.labelMap("exam_economy_access_policy");

  if (!detail) {
    return (
      <div className="studentPage instituteConsolePage instituteExamsPageVivid">
        <PlatformAdminPageHeader
          title="Exam Detail"
          description="This route renders live platform-admin exam management data from the backend."
          statusLabel={source === "unconfigured" ? "Backend not configured" : "Unable to load exam detail"}
          statusTone={source === "unconfigured" ? "warning" : "demo"}
        />
        <StudentStatePanel
          eyebrow={source === "unconfigured" ? "Setup required" : "Load issue"}
          title={
            source === "unconfigured"
              ? "Waiting for platform-admin exam detail"
              : "Platform-admin exam detail could not be loaded"
          }
          description={
            source === "unconfigured"
              ? "Configure the API base URL and sign in with an active platform-admin account to load exam management data."
              : "The platform-admin exam detail route is connected to the backend, but the current request did not complete successfully."
          }
          bullets={
            source === "unconfigured"
              ? ["Platform exam endpoint", "Exam detail endpoint"]
              : ["Backend connectivity", "Platform-admin exam permissions"]
          }
          ctaHref="/admin/exams"
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
    <div className="studentPage studentDashboardModern instituteConsolePage instituteExamsPageVivid">
      <PlatformAdminPageHeader
        title={detail.title}
        description="Platform-admin exam setup, assignment, source governance, and lifecycle control backed by live exam APIs."
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
          <strong>Manage lifecycle, access, and assigned learners from one live exam view</strong>
          <p>
            This screen is the operational control surface for one exam. Use it to move the paper through
            backend lifecycle states and verify whether questions, students, and access settings are ready.
          </p>
          <small>
            {detail.source_label} source · {detail.active_questions_count} active questions · {detail.assigned_student_count} assigned learners
          </small>
        </div>
        <div className="studentInsightHeroActions">
          <Link className="button buttonPrimary" href={`/admin/exams/${detail.id}/builder`}>
            Open Builder
          </Link>
          <Link className="button buttonSecondary" href={`/admin/exams/${detail.id}/builder?tab=questions`}>
            Link Questions
          </Link>
          <Link className="button buttonSecondary" href="/admin/exams/advanced">
            Advanced Builder
          </Link>
          <Link className="button buttonSecondary" href="/admin/reports">
            Open Reports
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
          <span>Publishing Source</span>
          <strong>{detail.source_label}</strong>
          <small>{detail.source_teacher_name || detail.source_name}</small>
        </article>

        <article className="metricCard dashboardHeroCard">
          <span>Exam Access Key</span>
          <strong>{detail.access_key}</strong>
          <small>{detail.access_key_enabled ? "Quick entry enabled" : "Quick entry disabled"}</small>
        </article>
      </section>

      <section className="dashboardGrid">
        <article className="dashboardPanel insightPanel">
          <div className="sectionHeading">
            <strong>Exam Build</strong>
            <Link href="/admin/exams/advanced">Open advanced builder</Link>
          </div>
          <p className="emptyText">
            Keep build actions close to delivery control so platform admins can move from governance review into
            setup work without bouncing back to the exams list.
          </p>
          <div className="resultCardActions examDetailActionGrid">
            <Link className="button buttonPrimary" href={`/admin/exams/${detail.id}/builder`}>
              Open Setup Workspace
            </Link>
            <Link className="button buttonSecondary" href={`/admin/exams/${detail.id}/builder?tab=questions`}>
              Link Questions
            </Link>
            <Link className="button buttonGhost" href="/admin/exams/new">
              Quick Create Another
            </Link>
            <Link className="button buttonGhost" href="/admin/exams/advanced">
              Launch Advanced Builder
            </Link>
          </div>
          <div className="examMetaGrid">
            <div>
              <span>Sections</span>
              <strong>{detail.sections.length}</strong>
            </div>
            <div>
              <span>Configured questions</span>
              <strong>{detail.active_questions_count}</strong>
            </div>
            <div>
              <span>Assignment mode</span>
              <strong>{titleCase(detail.assignment_mode)}</strong>
            </div>
            <div>
              <span>Review mode</span>
              <strong>{titleCase(detail.review_mode)}</strong>
            </div>
          </div>
        </article>

        <article className="dashboardPanel insightPanel">
          <div className="sectionHeading">
            <strong>Exam Actions</strong>
            <Link href="/admin/exams">Back to Exams</Link>
          </div>
          <p className="emptyText">
            Use these live actions to move the exam through its backend-controlled delivery lifecycle.
          </p>
          <div className="resultCardActions examDetailActionGrid">
            <div className="examDetailActionLane examDetailActionLanePrimary">
              <Link className="button buttonPrimary" href={`/admin/exams/${detail.id}/builder?tab=questions`}>
                Link Questions
              </Link>
              <Link className="button buttonSecondary" href={`/admin/exams/${detail.id}/builder`}>
                Open Builder
              </Link>

              {actionButtons.map((item) => (
                <form action={adminExamAction} key={item.action}>
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
              <form action={adminExamAction}>
                <input name="exam_id" type="hidden" value={detail.id} />
                <input name="action" type="hidden" value="refresh-status" />
                <ActionSubmitButton
                  className="button buttonSecondary"
                  idleLabel="Refresh Status"
                  pendingLabel="Refreshing..."
                />
              </form>

              <form action={adminExamAction}>
                <input name="exam_id" type="hidden" value={detail.id} />
                <input name="action" type="hidden" value="sync-marks" />
                <ActionSubmitButton
                  className="button buttonGhost"
                  idleLabel="Sync Marks"
                  pendingLabel="Syncing..."
                />
              </form>

              <form action={adminExamAction}>
                <input name="exam_id" type="hidden" value={detail.id} />
                <input name="action" type="hidden" value="toggle-access-key" />
                <ActionSubmitButton
                  className="button buttonSecondary"
                  idleLabel={detail.access_key_enabled ? "Disable Key Entry" : "Enable Key Entry"}
                  pendingLabel={detail.access_key_enabled ? "Disabling..." : "Enabling..."}
                />
              </form>

              <form action={adminExamAction}>
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
                <strong>Source governance</strong>
                <span>{detail.source_label} ownership is currently attached to {detail.source_teacher_name || detail.source_name}.</span>
              </div>
              <div className="weakTopicMeta">
                <strong>{detail.source_type}</strong>
                <span>Source type</span>
              </div>
            </div>
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
          <form action={adminExamEconomyAction} className="builderForm">
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
