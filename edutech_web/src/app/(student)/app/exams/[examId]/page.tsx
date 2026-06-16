import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { StatusPill } from "@/components/ui/status-pill";
import { StudentSecurityPolicy } from "@/features/dashboard/types";
import {
  fetchStudentExamDetail,
  fetchStudentInsightSummary,
  fetchStudentAttempts,
  getStudentApiState,
  spendStarsForContent,
  startStudentAttempt,
} from "@/lib/api/student";
import {
  questionTypeLabel,
  studentDateTimeLabel,
  titleCaseState,
} from "@/lib/student/formatters";

function examExperienceLabel(examType: string) {
  if (examType === "practice") return "practice set";
  if (examType === "mock_exam") return "mock test";
  return titleCaseState(examType);
}

function feedbackMessage(value: string | undefined) {
  if (!value) return "";
  return decodeURIComponent(value);
}

function examSourceDescriptor(detail: {
  source_type: string;
  source_label: string;
  source_name: string;
  source_teacher_name: string | null;
}) {
  if (detail.source_type === "teacher" && detail.source_teacher_name) {
    return `${detail.source_label} · ${detail.source_teacher_name}`;
  }

  if (detail.source_name && detail.source_name !== detail.source_label) {
    return `${detail.source_label} · ${detail.source_name}`;
  }

  return detail.source_label;
}

function securityTone(policy: StudentSecurityPolicy) {
  if (policy.violation_limit_enabled) {
    return "danger" as const;
  }
  if (policy.requires_fullscreen || policy.enhanced_monitoring) {
    return "warning" as const;
  }
  if (policy.tracks_focus_loss || policy.tracks_visibility_change) {
    return "demo" as const;
  }
  return "live" as const;
}

async function startAttemptAction(formData: FormData) {
  "use server";

  const examId = String(formData.get("exam_id") ?? "");
  if (!examId) return;

  try {
    const summary = await fetchStudentInsightSummary();
    const response = await startStudentAttempt(examId, summary.student_id);
    redirect(`/app/attempts/${response.data.id}`);
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? encodeURIComponent(error.message)
        : "Unable to start this attempt right now.";
    redirect(`/app/exams/${examId}?error=${message}`);
  }
}

async function unlockExamAction(formData: FormData) {
  "use server";

  const examId = String(formData.get("exam_id") ?? "");
  const contentType = String(formData.get("content_type") ?? "");
  const contentKey = String(formData.get("content_key") ?? "");
  const subject = String(formData.get("subject_id") ?? "").trim();

  if (!examId || !contentType || !contentKey) {
    redirect("/app/exams?error=Unable%20to%20resolve%20the%20selected%20exam.");
  }

  try {
    const response = await spendStarsForContent({
      content_type: contentType,
      content_key: contentKey,
      subject: subject || null,
    });
    redirect(
      `/app/exams/${examId}?message=${encodeURIComponent(
        response.data.message || "Exam unlocked successfully.",
      )}`,
    );
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? encodeURIComponent(error.message)
        : "Unable to unlock this exam right now.";
    redirect(`/app/exams/${examId}?error=${message}`);
  }
}

async function loadExamDetail(examId: string) {
  const state = getStudentApiState();

  if (!state.apiConfigured) {
    return { source: "unconfigured" as const, detail: null };
  }

  try {
    const detail = await fetchStudentExamDetail(examId);
    return { source: "live" as const, detail };
  } catch {
    return { source: "error" as const, detail: null };
  }
}

export default async function ExamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { examId } = await params;
  const { error, message } = await searchParams;
  const { source, detail } = await loadExamDetail(examId);

  if (!detail) {
    return (
      <div className="studentPage">
        <StudentPageHeader
          title="Exam Detail"
          description="This route only renders real exam readiness data from the backend."
          statusLabel={
            source === "unconfigured"
              ? "Backend not configured"
              : "Unable to load exam detail"
          }
          statusTone={source === "unconfigured" ? "warning" : "demo"}
        />
        <StudentStatePanel
          eyebrow={source === "unconfigured" ? "Setup required" : "Load issue"}
          title={
            source === "unconfigured"
              ? "Waiting for live exam detail"
              : "Exam detail could not be loaded"
          }
          description={
            source === "unconfigured"
              ? "This route only renders real exam readiness data from the backend. Configure the API base URL and sign in with an active student account to load the selected exam."
              : "The exam detail workspace is connected to the backend, but the current request did not complete successfully."
          }
          bullets={
            source === "unconfigured"
              ? ["Exam detail endpoint", "Active student web session"]
              : ["Backend connectivity", "Exam detail endpoint"]
          }
          ctaHref="/app/exams"
          ctaLabel="Back to Exams"
          statusLabel={
            source === "unconfigured"
              ? "Configuration required"
              : "Retry after backend check"
          }
        />
      </div>
    );
  }

  const canStart =
    detail.availability_state === "available_now" &&
    !detail.economy_access.is_locked &&
    !detail.active_attempt &&
    detail.remaining_attempts > 0;
  const canResume = Boolean(detail.active_attempt);
  const attempts = await fetchStudentAttempts().catch(() => []);
  const latestAttempt = attempts.find((attempt) => attempt.exam === detail.id) ?? null;
  const canOpenSummary = Boolean(latestAttempt);
  const canOpenReview = Boolean(latestAttempt && detail.review_available);
  const questionTypeCounts = detail.exam_questions.reduce<Record<string, number>>(
    (accumulator, question) => {
      const key = question.question_type;
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    },
    {},
  );
  const primaryActionLabel = canResume
    ? `Resume ${examExperienceLabel(detail.exam_type)}`
    : canStart
      ? `Start ${examExperienceLabel(detail.exam_type)}`
      : canOpenSummary
        ? "Open attempt summary"
        : detail.economy_access.is_locked && detail.economy_access.can_unlock_with_stars
          ? `Unlock with ${detail.economy_access.star_cost} stars`
          : "Not available yet";
  const actionGuidance = canResume
    ? `An active attempt already exists for this ${examExperienceLabel(detail.exam_type)}. Re-enter it directly instead of starting again.`
    : canStart
      ? `This ${examExperienceLabel(detail.exam_type)} is live and ready. Starting it will create a new backend attempt for your student profile.`
      : detail.economy_access.is_locked && detail.economy_access.can_unlock_with_stars
        ? `${detail.economy_access.star_cost} stars are required before this ${examExperienceLabel(detail.exam_type)} can be started. Unlock it once and the start action becomes available immediately.`
        : detail.economy_access.is_locked
          ? detail.economy_access.lock_reason_message ||
            `This ${examExperienceLabel(detail.exam_type)} is currently locked by access policy.`
      : canOpenReview
        ? "Your last attempt is complete and review is available by policy."
        : canOpenSummary
          ? "Your latest attempt is available in summary form, but review is still locked."
          : detail.availability_state === "upcoming"
            ? `This ${examExperienceLabel(detail.exam_type)} has been assigned but is not open yet.`
            : detail.remaining_attempts === 0
              ? "All available attempts have already been used."
              : `This ${examExperienceLabel(detail.exam_type)} is not startable right now under the current backend state.`;

  return (
    <div className="studentPage studentDashboardModern">
      <StudentPageHeader
        title={detail.title}
        description={`${titleCaseState(detail.exam_type)} detail backed by the student exam detail endpoint, with runtime rules and next actions surfaced clearly.`}
        action={<StatusPill tone="live">{titleCaseState(detail.availability_state)}</StatusPill>}
      />

      {message ? (
        <p className="feedbackBanner feedbackBannerSuccess">{feedbackMessage(message)}</p>
      ) : null}
      {error ? (
        <p className="feedbackBanner feedbackBannerError">{feedbackMessage(error)}</p>
      ) : null}

      <section className="studentInsightHeroCard">
        <div className="studentInsightHeroCopy">
          <span className="studentDashboardTag">Exam Readiness</span>
          <strong>{primaryActionLabel}</strong>
          <p>{actionGuidance}</p>
          <small>
            {detail.code} · {examSourceDescriptor(detail)} · {detail.subject_name ?? "Subject pending"} ·{" "}
            {detail.start_at ? studentDateTimeLabel(detail.start_at) : "Backend scheduled"}
          </small>
        </div>
        <div className="studentInsightHeroActions">
          <StatusPill tone="default">{detail.source_label}</StatusPill>
          {detail.source_type === "teacher" && detail.source_teacher_name ? (
            <StatusPill tone="demo">{detail.source_teacher_name}</StatusPill>
          ) : null}
          <Link className="button buttonSecondary" href="/app/exams">
            Back to Exams
          </Link>
        </div>
      </section>

      <StudentKpiGrid
        items={[
          {
            label: "Exam Code",
            value: detail.code,
            note: detail.subject_name ?? "Subject pending",
            tone: "primary",
          },
          {
            label: "Source",
            value: detail.source_label,
            note: detail.source_teacher_name || detail.source_name || "Backend source metadata",
          },
          {
            label: "Questions",
            value: detail.exam_questions.length,
            note: `${detail.sections.length} sections · ${Object.keys(questionTypeCounts).length} question formats`,
          },
          {
            label: "Attempts Left",
            value: detail.remaining_attempts,
            note: `${detail.attempts_used} used so far`,
          },
          {
            label: "Security",
            value: detail.security_policy.student_label,
            note: detail.security_policy.requires_fullscreen
              ? "Fullscreen required"
              : "Standard learner guidance",
          },
          {
            label: "Star Access",
            value: detail.economy_access.requires_unlock
              ? detail.economy_access.is_unlocked
                ? "Unlocked"
                : detail.economy_access.can_unlock_with_stars
                  ? `${detail.economy_access.star_cost} stars`
                  : "Policy locked"
              : "Free",
            note: detail.economy_access.lock_reason_message || "Economy policy synced from backend",
          },
        ]}
      />

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Availability and Runtime</strong>
            <StatusPill tone={securityTone(detail.security_policy)}>
              {detail.security_policy.student_label}
            </StatusPill>
          </div>

          <div className="studentResultStatGrid">
            <div className="studentResultStat">
              <span>Available from</span>
              <strong>
                {detail.start_at
                  ? studentDateTimeLabel(detail.start_at)
                  : "Backend scheduled"}
              </strong>
            </div>
            <div className="studentResultStat">
              <span>Available until</span>
              <strong>
                {detail.end_at
                  ? studentDateTimeLabel(detail.end_at)
                  : "Per backend policy"}
              </strong>
            </div>
            <div className="studentResultStat">
              <span>Navigation</span>
              <strong>
                {detail.allow_section_switching ? "Flexible sections" : "Sequential flow"}
              </strong>
            </div>
            <div className="studentResultStat">
              <span>Review state</span>
              <strong>{detail.review_available ? "Open" : "Policy-based"}</strong>
            </div>
            <div className="studentResultStat">
              <span>Star access</span>
              <strong>
                {detail.economy_access.requires_unlock
                  ? detail.economy_access.is_unlocked
                    ? "Unlocked"
                    : detail.economy_access.can_unlock_with_stars
                      ? `${detail.economy_access.star_cost} stars`
                      : "Restricted"
                  : "Free"}
              </strong>
            </div>
          </div>

          <div className="studentInsightMessageStack">
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>
                {detail.instructions ||
                  "No additional exam instructions were provided by the backend."}
              </p>
            </div>
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>
                Results are {detail.result_published ? "already published" : "not published yet"}, and review is{" "}
                {detail.review_available ? "currently open" : "still locked by policy"}.
              </p>
            </div>
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>{detail.security_policy.student_warning_copy}</p>
            </div>
            {detail.economy_access.requires_unlock ? (
              <div className="studentInsightMessage">
                <span className="placeholderDot" aria-hidden="true" />
                <p>
                  {detail.economy_access.is_unlocked
                    ? "This exam has already been unlocked for your student account."
                    : detail.economy_access.lock_reason_message ||
                      "This exam is governed by star-based access control."}
                </p>
              </div>
            ) : null}
          </div>
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Primary Action</strong>
            <StatusPill tone={canResume || canStart ? "live" : canOpenSummary ? "demo" : "warning"}>
              {primaryActionLabel}
            </StatusPill>
          </div>
          <div className="studentInsightMessageStack">
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>Check attempts left before starting a fresh run.</p>
            </div>
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>Resume always takes priority over creating a duplicate active attempt.</p>
            </div>
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>Summary and review are both controlled by backend lifecycle visibility.</p>
            </div>
          </div>

          <div className="studentInsightHeroActions">
            {canResume && detail.active_attempt ? (
              <Link className="button buttonPrimary" href={`/app/attempts/${detail.active_attempt.id}`}>
                {`Resume ${examExperienceLabel(detail.exam_type)}`}
              </Link>
            ) : null}

            {canStart ? (
              <form action={startAttemptAction}>
                <input name="exam_id" type="hidden" value={detail.id} />
                <ActionSubmitButton
                  className="button buttonPrimary"
                  idleLabel={`Start ${examExperienceLabel(detail.exam_type)}`}
                  pendingLabel="Starting..."
                />
              </form>
            ) : null}

            {!canResume &&
            !canStart &&
            detail.economy_access.is_locked &&
            detail.economy_access.can_unlock_with_stars ? (
              <>
                <form action={unlockExamAction}>
                  <input name="exam_id" type="hidden" value={detail.id} />
                  <input
                    name="content_type"
                    type="hidden"
                    value={detail.economy_access.content_type}
                  />
                  <input
                    name="content_key"
                    type="hidden"
                    value={detail.economy_access.content_key}
                  />
                  <input
                    name="subject_id"
                    type="hidden"
                    value={detail.economy_access.subject_id ?? ""}
                  />
                  <ActionSubmitButton
                    className="button buttonPrimary"
                    idleLabel={`Unlock with ${detail.economy_access.star_cost} Stars`}
                    pendingLabel="Unlocking..."
                  />
                </form>
                <Link className="button buttonSecondary" href="/app/wallet">
                  Open Wallet
                </Link>
              </>
            ) : null}

            {!canResume && !canStart && canOpenSummary && latestAttempt ? (
              <>
                <Link className="button buttonPrimary" href={`/app/attempts/${latestAttempt.id}/summary`}>
                  Open Attempt Summary
                </Link>
                {canOpenReview ? (
                  <Link className="button buttonSecondary" href={`/app/attempts/${latestAttempt.id}/review`}>
                    Review Attempt
                  </Link>
                ) : null}
              </>
            ) : null}

            {!canResume && !canStart && !canOpenSummary ? (
              <button className="button buttonSecondary" disabled type="button">
                Not Available Yet
              </button>
            ) : null}
          </div>
        </article>
      </section>

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Exam Rules</strong>
            <span>Before you begin</span>
          </div>
          <div className="studentTopicStack">
            <div className="studentTopicRow">
              <div>
                <strong>Duration</strong>
                <span>{detail.duration_minutes} minutes</span>
              </div>
              <div className="studentTopicRowMeta">
                <strong>{detail.total_marks}</strong>
                <span>Total marks</span>
              </div>
            </div>
            <div className="studentTopicRow">
              <div>
                <strong>Navigation</strong>
                <span>
                  {detail.allow_section_switching
                    ? "Section switching allowed"
                    : "Sequential sections"}
                </span>
              </div>
              <div className="studentTopicRowMeta">
                <strong>{detail.passing_marks}</strong>
                <span>Passing marks</span>
              </div>
            </div>
            <div className="studentTopicRow">
              <div>
                <strong>Review availability</strong>
                <span>
                  {detail.review_available
                    ? "Review currently available"
                    : "Review depends on result visibility"}
                </span>
              </div>
              <div className="studentTopicRowMeta">
                <strong>{detail.result_published ? "Published" : "Pending"}</strong>
                <span>Result visibility</span>
              </div>
            </div>
            <div className="studentTopicRow">
              <div>
                <strong>Question mix</strong>
                <span>
                  {Object.entries(questionTypeCounts)
                    .map(([type, count]) => `${count} ${questionTypeLabel(type).toLowerCase()}`)
                    .join(", ")}
                </span>
              </div>
              <div className="studentTopicRowMeta">
                <StatusPill tone={securityTone(detail.security_policy)}>
                  {detail.security_policy.student_label}
                </StatusPill>
              </div>
            </div>
          </div>
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Section Overview</strong>
            <span>{detail.sections.length} sections</span>
          </div>
          <div className="studentTopicStack">
            {detail.sections.map((section) => (
              <div className="studentTopicRow" key={section.id}>
                <div>
                  <strong>{section.name}</strong>
                  <span>
                    Section {section.section_order} · {section.linked_questions_count} questions
                  </span>
                </div>
                <div className="studentTopicRowMeta">
                  <strong>
                    {section.timer_enabled ? "Timed section" : "Shared timer"}
                  </strong>
                  <span>
                    {section.allow_skip_section ? "Skip allowed" : "Complete in sequence"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
