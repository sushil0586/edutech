import { cookies } from "next/headers";
import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { StatusPill } from "@/components/ui/status-pill";
import {
  fetchStudentAttempts,
  fetchStudentWalletSummary,
  getStudentDashboardData,
  spendStarsForContent,
} from "@/lib/api/student";
import { fetchCurrentAccountProfile } from "@/lib/auth/session";
import {
  ALL_SOURCES_CONTEXT,
  ALL_SUBJECTS_CONTEXT,
  filterStudentRecordsBySource,
  filterStudentSummaryBySource,
  filterStudentExamsBySubject,
  filterStudentSummaryBySubject,
  getStudentSourceOptions,
  getStudentSubjectOptions,
  resolveSelectedStudentSource,
  resolveSelectedStudentSourceTeacher,
  resolveSelectedStudentSubject,
  selectedStudentSourceLabel,
  STUDENT_SOURCE_CONTEXT_COOKIE,
  STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE,
  STUDENT_SUBJECT_CONTEXT_COOKIE,
} from "@/lib/student/subject-context";
import { percentageLabel, trendDirectionLabel } from "@/lib/student/formatters";
import { StudentStatePanel } from "@/components/ui/student-state-panel";

function getContextValue(context: Record<string, unknown> | undefined, key: string) {
  const value = context?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function formatDisplayName(value: string | null | undefined) {
  if (!value) {
    return "Learner";
  }

  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function friendlyAvailabilityLabel(value: string) {
  return value.replaceAll("_", " ");
}

function examSourceDescriptor(exam: {
  source_type: string;
  source_label: string;
  source_name: string;
  source_teacher_name: string | null;
}) {
  if (exam.source_type === "teacher" && exam.source_teacher_name) {
    return `${exam.source_label} · ${exam.source_teacher_name}`;
  }

  if (exam.source_name && exam.source_name !== exam.source_label) {
    return `${exam.source_label} · ${exam.source_name}`;
  }

  return exam.source_label;
}

function dashboardActionForExam(
  exam:
    | {
        id: string;
        code: string;
        title: string;
        can_resume: boolean;
        can_start: boolean;
        active_attempt: { id: string } | null;
        availability_state: string;
        duration_minutes: number;
        subject_name: string;
        economy_access: {
          is_locked: boolean;
          can_unlock_with_stars: boolean;
          star_cost: number;
        };
        source_type: string;
        source_label: string;
        source_name: string;
        source_teacher_name: string | null;
      }
    | undefined,
) {
  if (!exam) {
    return {
      title: "Your next recommended test will appear here",
      reason: "As backend attempt and result data grows, the dashboard will prioritize the best next academic action.",
      primaryHref: "/app/exams",
      primaryLabel: "Browse Tests",
      secondaryHref: "/app/practice",
      secondaryLabel: "Open Practice",
    };
  }

  if (exam.can_resume && exam.active_attempt?.id) {
    return {
      title: exam.title,
      reason: `You already have an active ${examSourceDescriptor(exam)} ${exam.subject_name} attempt in progress.`,
      primaryHref: `/app/attempts/${exam.active_attempt.id}`,
      primaryLabel: "Resume Test",
      secondaryHref: `/app/exams/${exam.id}`,
      secondaryLabel: "View Details",
    };
  }

  if (exam.can_start) {
    return {
      title: exam.title,
      reason: `A ${examSourceDescriptor(exam)} ${exam.subject_name} test is ready right now, so you can start immediately from this dashboard.`,
      primaryHref: `/app/exams/${exam.id}`,
      primaryLabel: "Start Test",
      secondaryHref: "/app/exams",
      secondaryLabel: "View All Tests",
    };
  }

  if (exam.economy_access.is_locked && exam.economy_access.can_unlock_with_stars) {
    return {
      title: exam.title,
      reason: `This ${examSourceDescriptor(exam)} ${exam.subject_name} test needs ${exam.economy_access.star_cost} stars before it can be started.`,
      primaryHref: `/app/exams/${exam.id}`,
      primaryLabel: "Review Unlock",
      secondaryHref: "/app/wallet",
      secondaryLabel: "Open Wallet",
    };
  }

  return {
    title: exam.title,
    reason: `This ${examSourceDescriptor(exam)} ${exam.subject_name} test is currently ${friendlyAvailabilityLabel(exam.availability_state)}.`,
    primaryHref: `/app/exams/${exam.id}`,
    primaryLabel: "View Details",
    secondaryHref: "/app/exams",
    secondaryLabel: "Open Catalog",
  };
}

function examBadge(exam: {
  can_resume: boolean;
  can_start: boolean;
  availability_state: string;
  economy_access: {
    is_locked: boolean;
  };
}) {
  if (exam.economy_access.is_locked) return "Locked";
  if (exam.can_resume) return "Resume";
  if (exam.can_start) return "Ready";
  if (exam.availability_state === "upcoming") return "Upcoming";
  return "Scheduled";
}

async function unlockDashboardContentAction(formData: FormData) {
  "use server";

  const examId = String(formData.get("exam_id") ?? "");
  const contentType = String(formData.get("content_type") ?? "");
  const contentKey = String(formData.get("content_key") ?? "");
  const subject = String(formData.get("subject_id") ?? "").trim();

  if (!examId || !contentType || !contentKey) {
    redirect("/app/dashboard?error=Unable%20to%20resolve%20the%20selected%20content.");
  }

  try {
    const response = await spendStarsForContent({
      content_type: contentType,
      content_key: contentKey,
      subject: subject || null,
    });
    redirect(
      `/app/dashboard?message=${encodeURIComponent(
        response.data.message || "Content unlocked successfully.",
      )}`,
    );
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? encodeURIComponent(error.message)
        : "Unable to unlock this content right now.";
    redirect(`/app/dashboard?error=${message}`);
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const profile = await fetchCurrentAccountProfile();
  const registrationContext = profile?.registration_context ?? {};
  const subjectOptions = getStudentSubjectOptions(profile ?? registrationContext);
  const cookieStore = await cookies();
  const selectedSource = resolveSelectedStudentSource(
    cookieStore.get(STUDENT_SOURCE_CONTEXT_COOKIE)?.value ?? ALL_SOURCES_CONTEXT,
  );
  const selectedSubject = resolveSelectedStudentSubject(
    subjectOptions,
    cookieStore.get(STUDENT_SUBJECT_CONTEXT_COOKIE)?.value ?? ALL_SUBJECTS_CONTEXT,
  );
  const selectedSubjectLabel =
    subjectOptions.find((option) => option.value === selectedSubject)?.label ?? "All Subjects";

  const [dashboardData, walletResult, attemptsResult] = await Promise.all([
    getStudentDashboardData(),
    fetchStudentWalletSummary().catch(() => null),
    fetchStudentAttempts().catch(() => []),
  ]);

  const displayName = formatDisplayName(profile?.display_name ?? profile?.username);
  const classLevel = getContextValue(registrationContext, "class_level");
  const board = getContextValue(registrationContext, "board");

  if (!dashboardData.summary) {
    return (
      <div className="studentPage studentDashboardPage">
        <StudentStatePanel
          eyebrow={dashboardData.source === "unconfigured" ? "Setup required" : "Load issue"}
          title={
            dashboardData.source === "unconfigured"
              ? "Waiting for authenticated dashboard data"
              : "Dashboard data could not be loaded"
          }
          description={
            dashboardData.source === "unconfigured"
              ? "This dashboard does not use hardcoded learning metrics. Configure the API base URL and sign in with an active student account to load real exams, results, and star economy data."
              : "The student dashboard is wired to live backend services, but the current request did not complete successfully."
          }
          bullets={[
            "Student insight summary",
            "Available student exams",
            "Wallet summary",
          ]}
          ctaHref="/app/exams"
          ctaLabel="Open Tests"
          statusLabel={
            dashboardData.source === "unconfigured"
              ? "Configuration required"
              : "Retry after backend check"
          }
        />
      </div>
    );
  }

  const { teacherOptions } = getStudentSourceOptions([
    ...dashboardData.exams,
    ...dashboardData.summary.source_breakdown,
    ...dashboardData.summary.recent_exams,
  ]);
  const selectedTeacherId = resolveSelectedStudentSourceTeacher(
    teacherOptions,
    selectedSource,
    cookieStore.get(STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE)?.value ?? null,
  );
  const sourceScopedSummary = filterStudentSummaryBySource(
    dashboardData.summary,
    selectedSource,
    selectedTeacherId,
  );
  const scopedSummary = filterStudentSummaryBySubject(sourceScopedSummary, selectedSubject);
  const scopedExams = filterStudentExamsBySubject(
    filterStudentRecordsBySource(dashboardData.exams, selectedSource, selectedTeacherId),
    selectedSubject,
  );
  const recommendedExam =
    scopedExams.find((exam) => exam.can_resume) ??
    scopedExams.find((exam) => exam.can_start) ??
    scopedExams.find((exam) => !exam.economy_access.is_locked) ??
    scopedExams[0];
  const heroAction = dashboardActionForExam(recommendedExam);
  const availableExams = scopedExams
    .filter(
      (exam) =>
        !exam.economy_access.is_locked &&
        exam.id !== recommendedExam?.id,
    )
    .slice(0, 4);
  const lockedExams = scopedExams.filter((exam) => exam.economy_access.is_locked).slice(0, 4);
  const weakTopics = scopedSummary.weak_topics.slice(0, 3);
  const recentResults = scopedSummary.recent_exams.slice(0, 4);
  const attempts = filterStudentRecordsBySource(
    attemptsResult,
    selectedSource,
    selectedTeacherId,
  );

  return (
    <div className="studentPage studentDashboardPage studentDashboardModern">
      {message ? (
        <p className="feedbackBanner feedbackBannerSuccess">{decodeURIComponent(message)}</p>
      ) : null}
      {error ? (
        <p className="feedbackBanner feedbackBannerError">{decodeURIComponent(error)}</p>
      ) : null}

      <section className="studentDashboardHeroRow">
        <div className="studentDashboardWelcome studentDashboardWelcomeCompact">
          <div className="studentDashboardWelcomeCopy">
            <span className="studentDashboardEyebrow">Student Dashboard</span>
            <h1>Welcome back, {displayName}</h1>
            <p>
              {[classLevel ? `Class ${classLevel}` : "", board, selectedSubjectLabel]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <small>
              {selectedSource !== ALL_SOURCES_CONTEXT
                ? `${selectedStudentSourceLabel(selectedSource)} filter is active. `
                : ""}
              {recommendedExam
                ? "Your next recommended test is ready."
                : "Your dashboard will start recommending tests as soon as live content is available."}
            </small>
          </div>
          <div className="studentDashboardIllustration" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      </section>

      <section className="studentDashboardPrimaryGrid studentDashboardPrimaryGridCompact">
        <article className="studentDashboardCard studentDashboardCardCompact studentDashboardRecommendation">
          <div className="studentDashboardCardHead">
            <span className="studentDashboardTag">Recommended for you</span>
          </div>
          <strong>{heroAction.title}</strong>
          <p>{heroAction.reason}</p>
          {recommendedExam ? (
            <>
              <div className="studentInsightHeroActions">
                <StatusPill tone="default">{examSourceDescriptor(recommendedExam)}</StatusPill>
                {recommendedExam.subject_name ? (
                  <StatusPill tone="demo">{recommendedExam.subject_name}</StatusPill>
                ) : null}
              </div>
              <div className="studentDashboardMetaRow">
              <span>{recommendedExam.subject_name}</span>
              <span>{recommendedExam.duration_minutes} min</span>
              <span>{examBadge(recommendedExam)}</span>
              </div>
            </>
          ) : null}
          <div className="studentDashboardActionRow">
            <Link className="button buttonPrimary" href={heroAction.primaryHref}>
              {heroAction.primaryLabel}
            </Link>
            <Link className="studentDashboardTextLink" href={heroAction.secondaryHref}>
              {heroAction.secondaryLabel}
            </Link>
          </div>
        </article>

        <article className="studentDashboardCard studentDashboardCardCompact studentDashboardWalletCard">
          <div className="studentDashboardCardHead">
            <span className="studentDashboardTag studentDashboardTagWarm">Star Wallet</span>
          </div>
          <strong>
            {walletResult ? walletResult.available_stars.toLocaleString("en-IN") : "--"}
          </strong>
          <p>
            Use your available stars to unlock premium tests, practice sets, and follow-up learning paths.
          </p>
          <div className="studentDashboardActionRow">
            <Link className="button buttonSecondary" href="/app/wallet">
              Open Wallet
            </Link>
          </div>
        </article>
      </section>

      <section className="studentDashboardChipRow">
        {subjectOptions.map((option) => (
          <span
            key={option.value}
            className={
              option.value === selectedSubject
                ? "studentDashboardChip studentDashboardChipActive"
                : "studentDashboardChip"
            }
          >
            {option.label}
          </span>
        ))}
      </section>

      <section className="contentCard">
        <div className="sectionHeading">
          <strong>Available for You</strong>
          <Link href="/app/exams">View all</Link>
        </div>
        <div className="studentDashboardExamGrid">
          {availableExams.length ? (
            availableExams.map((exam) => {
              const linkedAttempt = attempts.find((attempt) => attempt.exam === exam.id);
              const actionHref =
                exam.can_resume && exam.active_attempt?.id
                  ? `/app/attempts/${exam.active_attempt.id}`
                  : exam.can_start
                    ? `/app/exams/${exam.id}`
                    : linkedAttempt
                      ? `/app/attempts/${linkedAttempt.id}/summary`
                      : `/app/exams/${exam.id}`;
              const actionLabel = exam.can_resume
                ? "Resume"
                : exam.can_start
                  ? "Start Now"
                  : "View Details";

              return (
                <article className="studentDashboardExamCard" key={exam.id}>
                  <div className="studentDashboardExamCardTop">
                    <span className="studentDashboardMiniBadge">{examBadge(exam)}</span>
                  </div>
                  <strong>{exam.title}</strong>
                  <p>{exam.subject_name}</p>
                  <div className="studentDashboardBadgeRow">
                    <StatusPill tone="default">{exam.source_label}</StatusPill>
                    {exam.source_type === "teacher" && exam.source_teacher_name ? (
                      <StatusPill tone="demo">{exam.source_teacher_name}</StatusPill>
                    ) : null}
                  </div>
                  <div className="studentDashboardMetaRow">
                    <span>{exam.exam_type.replaceAll("_", " ")}</span>
                    <span>{exam.duration_minutes} min</span>
                    {exam.economy_access.requires_unlock ? (
                      <span>
                        {exam.economy_access.is_unlocked
                          ? "Unlocked"
                          : `${exam.economy_access.star_cost} stars`}
                      </span>
                    ) : null}
                  </div>
                  <Link className="button buttonSecondary" href={actionHref}>
                    {actionLabel}
                  </Link>
                </article>
              );
            })
          ) : (
            <p className="emptyText">
              Available tests will appear here when the live catalog is ready for your current student scope.
            </p>
          )}
        </div>
      </section>

      <section className="contentCard studentDashboardPremiumSection">
        <div className="sectionHeading">
          <strong>Locked Content and Premium Access</strong>
          <Link href="/app/wallet">How it works</Link>
        </div>
        <div className="studentDashboardPremiumGrid">
          <div className="studentDashboardPremiumInfo">
            <strong>Premium access follows backend rules</strong>
            <p>
              Locked content shown here is driven by live access policy rules. If stars can unlock it,
              you will see the exact cost. If not, the next action will point you to the right detail or plan path.
            </p>
          </div>
          <div className="studentDashboardPremiumStats">
            <article className="detailCard">
              <span>Available Stars</span>
              <strong>{walletResult ? walletResult.available_stars.toLocaleString("en-IN") : "--"}</strong>
            </article>
            <article className="detailCard">
              <span>Lifetime Spent</span>
              <strong>{walletResult ? walletResult.lifetime_spent_stars.toLocaleString("en-IN") : "--"}</strong>
            </article>
          </div>
        </div>
        <div className="studentDashboardExamGrid">
          {lockedExams.length ? (
            lockedExams.map((exam) => (
              <article className="studentDashboardExamCard" key={exam.id}>
                <div className="studentDashboardExamCardTop">
                  <span className="studentDashboardMiniBadge">{examBadge(exam)}</span>
                </div>
                <strong>{exam.title}</strong>
                <p>{exam.subject_name}</p>
                <div className="studentDashboardBadgeRow">
                  <StatusPill tone="default">{exam.source_label}</StatusPill>
                  {exam.source_type === "teacher" && exam.source_teacher_name ? (
                    <StatusPill tone="demo">{exam.source_teacher_name}</StatusPill>
                  ) : null}
                </div>
                <div className="studentDashboardMetaRow">
                  <span>{exam.exam_type.replaceAll("_", " ")}</span>
                  <span>
                    {exam.economy_access.can_unlock_with_stars
                      ? `${exam.economy_access.star_cost} stars`
                      : "Restricted"}
                  </span>
                </div>
                <small className="emptyText">
                  {exam.economy_access.lock_reason_message ||
                    "This item is currently locked by the live premium access policy."}
                </small>
                <div className="studentDashboardActionRow">
                  {exam.economy_access.can_unlock_with_stars ? (
                    <form action={unlockDashboardContentAction}>
                      <input name="exam_id" type="hidden" value={exam.id} />
                      <input
                        name="content_type"
                        type="hidden"
                        value={exam.economy_access.content_type}
                      />
                      <input
                        name="content_key"
                        type="hidden"
                        value={exam.economy_access.content_key}
                      />
                      <input
                        name="subject_id"
                        type="hidden"
                        value={exam.economy_access.subject_id ?? ""}
                      />
                      <ActionSubmitButton
                        className="button buttonPrimary"
                        idleLabel={`Unlock with ${exam.economy_access.star_cost} Stars`}
                        pendingLabel="Unlocking..."
                      />
                    </form>
                  ) : (
                    <Link className="button buttonSecondary" href={`/app/exams/${exam.id}`}>
                      View Access Detail
                    </Link>
                  )}
                  <Link className="studentDashboardTextLink" href="/app/subscriptions">
                    View Plans
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <p className="emptyText">
              Locked premium items will appear here as soon as content access policies exist for
              your assigned catalog.
            </p>
          )}
        </div>
      </section>

      <section className="studentDashboardBottomGrid">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Your Progress</strong>
            <Link href="/app/analytics">View Detailed Report</Link>
          </div>
          <div className="studentDashboardProgressSummary">
            <div className="studentDashboardProgressRing">
              <span>{percentageLabel(scopedSummary.average_percentage)}</span>
              <small>{trendDirectionLabel(scopedSummary.improvement_trend.direction)}</small>
            </div>
            <div className="studentDashboardWeakList">
              {weakTopics.length ? (
                weakTopics.map((topic) => (
                  <div className="studentDashboardWeakRow" key={topic.topic_id}>
                    <strong>{topic.topic_name}</strong>
                    <span>{percentageLabel(topic.average_percentage)}</span>
                  </div>
                ))
              ) : (
                <p className="emptyText">Weak topics will appear as more scored attempts are completed.</p>
              )}
              <Link className="button buttonGhost" href="/app/weak-areas">
                Improve Weak Areas
              </Link>
            </div>
          </div>
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Latest Activity</strong>
            <Link href="/app/results">View All</Link>
          </div>
          <div className="dashboardRailStack">
            {recentResults.length ? (
              recentResults.map((result) => (
                <div className="dashboardRailRow" key={result.exam_id}>
                  <div>
                    <strong>{result.exam_title}</strong>
                    <span>Score {percentageLabel(result.percentage)}</span>
                  </div>
                  <span className="dashboardRailStat">{result.result_status.replaceAll("_", " ")}</span>
                </div>
              ))
            ) : (
              <p className="emptyText">
                Recent result activity will appear here once backend result records are available.
              </p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
