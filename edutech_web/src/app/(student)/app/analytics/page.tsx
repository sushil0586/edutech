import { cookies } from "next/headers";
import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import {
  fetchStudentInsightSummary,
  spendStarsForContent,
  startStudentAttempt,
} from "@/lib/api/student";
import { fetchCurrentAccountProfile } from "@/lib/auth/session";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { StatusPill } from "@/components/ui/status-pill";
import {
  buildAnalyticsActionsHref,
  buildAnalyticsQuestionTypeHref,
  buildAnalyticsResultsCompareHref,
  buildAnalyticsSourceHref,
  buildAnalyticsSubjectHref,
  buildAnalyticsTimelineHref,
  buildAnalyticsTopicHref,
  loadStudentAnalyticsBundle,
  scoreTone,
  sourceDescriptor,
} from "@/lib/student/analytics";
import { resolvePracticeFocusRecommendation } from "@/lib/student/practice";
import {
  benchmarkLabel,
  percentageLabel,
  peerRecordLabel,
  questionTypeLabel,
  signedPercentageLabel,
  studentDateTimeLabel,
  trendDirectionLabel,
} from "@/lib/student/formatters";
import {
  ALL_SOURCES_CONTEXT,
  ALL_SUBJECTS_CONTEXT,
  filterStudentExamsBySubject,
  filterStudentRecordsBySource,
  filterStudentRecordsByMetadataSubject,
  filterStudentSummaryBySource,
  filterStudentSummaryBySubject,
  getExamSubjectDisplayLabel,
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

function numericScore(value: string | number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildLineChartGeometry(values: number[]) {
  if (!values.length) {
    return {
      polylinePoints: "",
      areaPoints: "",
      points: [] as Array<{ x: number; y: number; value: number }>,
    };
  }

  const width = 520;
  const height = 170;
  const leftPad = 20;
  const rightPad = 20;
  const topPad = 18;
  const bottomPad = 28;
  const usableWidth = width - leftPad - rightPad;
  const usableHeight = height - topPad - bottomPad;

  const points = values.map((value, index) => {
    const x =
      leftPad + (values.length === 1 ? usableWidth / 2 : (usableWidth * index) / (values.length - 1));
    const y = topPad + ((100 - value) / 100) * usableHeight;
    return { x, y, value };
  });

  return {
    polylinePoints: points.map((point) => `${point.x},${point.y}`).join(" "),
    areaPoints: [
      `${leftPad},${height - bottomPad}`,
      ...points.map((point) => `${point.x},${point.y}`),
      `${width - rightPad},${height - bottomPad}`,
    ].join(" "),
    points,
  };
}

function AnalyticsGlyph({
  kind,
}: {
  kind: "score" | "accuracy" | "history" | "trend";
}) {
  if (kind === "score") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4 16L9 11L13 15L20 8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 8H20V13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (kind === "accuracy") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <circle cx="12" cy="12" r="2.1" fill="currentColor" />
        <path d="M12 12L16.5 7.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "history") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4 12H8L10.4 8L13.6 16L16 12H20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 15C6 15 6.5 9 8.5 9C10.5 9 11 15 13 15C15 15 15.5 9 17.5 9C19.5 9 20 15 20 15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function looksLikeAwsCertificationValue(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return (
    normalized.includes("aws") ||
    normalized.includes("cloud practitioner") ||
    normalized.includes("certification")
  );
}

function isAwsCertificationAnalyticsLane(params: {
  selectedSubjectLabel: string;
  sourceSummary:
    | {
        recent_exams?: Array<{
          subject_name: string | null;
          exam_title: string;
          exam_code: string;
          source_label: string;
          source_name: string;
        }>;
      }
    | null
    | undefined;
  scopedPracticeExams: Array<{
    subject_name: string;
    primary_subject_name?: string | null;
    section_subjects?: Array<{ name?: string | null }> | null;
    subject_summary?: {
      display_label?: string | null;
      subjects?: Array<{ name?: string | null }> | null;
    } | null;
    title: string;
    code: string;
    experience_profile: {
      assessment_family: string;
      assessment_family_label: string;
    };
  }>;
}) {
  if (looksLikeAwsCertificationValue(params.selectedSubjectLabel)) {
    return true;
  }

  if (
    params.scopedPracticeExams.some(
      (exam) =>
        exam.experience_profile.assessment_family === "certification" &&
        (looksLikeAwsCertificationValue(getExamSubjectDisplayLabel(exam)) ||
          looksLikeAwsCertificationValue(exam.title) ||
          looksLikeAwsCertificationValue(exam.code) ||
          looksLikeAwsCertificationValue(exam.experience_profile.assessment_family_label)),
    )
  ) {
    return true;
  }

  return (params.sourceSummary?.recent_exams ?? []).some(
    (exam) =>
      looksLikeAwsCertificationValue(exam.subject_name) ||
      looksLikeAwsCertificationValue(exam.exam_title) ||
      looksLikeAwsCertificationValue(exam.exam_code) ||
      looksLikeAwsCertificationValue(exam.source_label) ||
      looksLikeAwsCertificationValue(exam.source_name),
  );
}

async function startPracticeAction(formData: FormData) {
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
        : "Unable to start this practice set right now.";
    redirect(`/app/analytics?error=${message}`);
  }
}

async function unlockPracticeAction(formData: FormData) {
  "use server";

  const examId = String(formData.get("exam_id") ?? "");
  const contentType = String(formData.get("content_type") ?? "");
  const contentKey = String(formData.get("content_key") ?? "");
  const subject = String(formData.get("subject_id") ?? "").trim();

  if (!examId || !contentType || !contentKey) {
    redirect("/app/analytics?error=Unable%20to%20resolve%20the%20selected%20practice%20set.");
  }

  try {
    const response = await spendStarsForContent({
      content_type: contentType,
      content_key: contentKey,
      subject: subject || null,
    });
    redirect(
      `/app/exams/${examId}?message=${encodeURIComponent(
        response.data.message || "Practice set unlocked successfully.",
      )}`,
    );
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? encodeURIComponent(error.message)
        : "Unable to unlock this practice set right now.";
    redirect(`/app/analytics?error=${message}`);
  }
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
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
    subjectOptions.find((option) => option.value === selectedSubject)?.label ?? "Overall";

  const { source, summary, results, topicPerformance, exams } = await loadStudentAnalyticsBundle();
  const { teacherOptions } = getStudentSourceOptions([
    ...results,
    ...exams,
    ...(summary?.source_breakdown ?? []),
    ...(summary?.recent_exams ?? []),
  ]);
  const selectedTeacherId = resolveSelectedStudentSourceTeacher(
    teacherOptions,
    selectedSource,
    cookieStore.get(STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE)?.value ?? null,
  );
  const sourceScopedSummary = summary
    ? filterStudentSummaryBySource(summary, selectedSource, selectedTeacherId)
    : null;
  const scopedSummary = summary
    ? filterStudentSummaryBySubject(sourceScopedSummary ?? summary, selectedSubject)
    : null;
  const scopedResults = filterStudentRecordsByMetadataSubject(
    filterStudentRecordsBySource(results, selectedSource, selectedTeacherId),
    selectedSubject,
  );
  const publishedResults = scopedResults.filter((result) => result.is_published);
  const scopedTopicPerformance = topicPerformance.filter((topic) =>
    selectedSubject === ALL_SUBJECTS_CONTEXT ? true : topic.subject_name === selectedSubject,
  );
  const weakTopics = [...scopedTopicPerformance]
    .sort((a, b) => Number(a.percentage) - Number(b.percentage))
    .slice(0, 5);
  const strongTopics = [...scopedTopicPerformance]
    .sort((a, b) => Number(b.percentage) - Number(a.percentage))
    .slice(0, 5);
  const topWeakTopic = weakTopics[0] ?? null;
  const scopedPracticeExams = filterStudentExamsBySubject(
    filterStudentRecordsBySource(
      exams.filter((exam) => exam.exam_type === "practice"),
      selectedSource,
      selectedTeacherId,
    ),
    selectedSubject,
  );
  const practiceFocus = resolvePracticeFocusRecommendation({
    exams: scopedPracticeExams,
    subjectName: topWeakTopic?.subject_name ?? null,
    topicName: topWeakTopic?.topic_name ?? null,
  });
  const practiceLocked = Boolean(practiceFocus.exam) && practiceFocus.action.mode === "unlock";
  const analyticsActionSequence = practiceLocked
    ? [
        {
          label: "Do this first",
          detail: "Open weak areas and verify the exact topic causing the latest score drop.",
        },
        {
          label: "Then next",
          detail: "Unlock the recommended practice set only after you confirm it matches the current weak topic.",
        },
        {
          label: "If blocked",
          detail: "If you do not want to spend stars yet, compare recent results first and keep mock attempts for later.",
        },
      ]
    : [
        {
          label: "Do this first",
          detail: "Open weak areas for the weakest ranked topic and move straight into the focused practice lane.",
        },
        {
          label: "Then next",
          detail: "Finish that targeted practice pass before booking another broad mock or switching subjects.",
        },
        {
          label: "If blocked",
          detail: "If the topic still feels unclear, compare recent results and review question evidence before retrying.",
        },
      ];
  const sourceBreakdown = scopedSummary?.source_breakdown ?? [];
  const sourceSubjectBreakdown = scopedSummary?.source_subject_breakdown ?? [];
  const dominantSource = sourceBreakdown[0] ?? null;
  const benchmarkOverview = scopedSummary?.benchmark_overview ?? [];
  const recentTrendBars = [...publishedResults]
    .sort((left, right) => {
      const leftTime = left.published_at ? new Date(left.published_at).getTime() : 0;
      const rightTime = right.published_at ? new Date(right.published_at).getTime() : 0;
      return leftTime - rightTime;
    })
    .slice(-6)
    .map((result) => ({
      id: result.id,
      label: result.exam_code,
      value: numericScore(result.percentage),
    }));
  const averageScoreValue = numericScore(scopedSummary?.average_percentage ?? 0);
  const accuracyScoreValue = numericScore(scopedSummary?.accuracy_percentage ?? 0);
  const answeredCount = scopedSummary?.attempt_behavior.attempted_questions ?? 0;
  const skippedCount = scopedSummary?.attempt_behavior.skipped_questions ?? 0;
  const totalResponseCount = answeredCount + skippedCount;
  const answeredShare = totalResponseCount ? Math.round((answeredCount / totalResponseCount) * 100) : 0;
  const skippedShare = Math.max(0, 100 - answeredShare);
  const trendToneClass =
    scopedSummary?.improvement_trend.direction === "improving"
      ? "analyticsTrendUp"
      : scopedSummary?.improvement_trend.direction === "declining"
        ? "analyticsTrendDown"
        : "analyticsTrendStable";
  const lineChart = buildLineChartGeometry(recentTrendBars.map((item) => item.value));
  const flatTrendSeries =
    recentTrendBars.length > 1 &&
    recentTrendBars.every((item) => Math.round(item.value) === Math.round(recentTrendBars[0]?.value ?? 0));
  const awsCertificationLane = isAwsCertificationAnalyticsLane({
    selectedSubjectLabel,
    sourceSummary: scopedSummary,
    scopedPracticeExams,
  });
  const analyticsCopy = awsCertificationLane
    ? {
        heroTag: "Certification Readiness",
        heroFallbackTitle: "Turn domain evidence into the next action",
        sourceDescription:
          selectedSubject === ALL_SUBJECTS_CONTEXT
            ? "A live certification-readiness workspace built from backend insights, published results, and domain performance data."
            : `A live certification-readiness workspace focused on ${selectedSubjectLabel}, using only matching backend subject records in this view.`,
        heroMetaAverage: "Average readiness",
        heroMetaAccuracy: "Domain accuracy",
        heroMetaHistory: "Session history",
        benchmarkTitle: "Readiness benchmark",
        averageCardTitle: "Readiness level",
        averageCardSuffix: "overall readiness",
        accuracyCardTitle: "Answer accuracy",
        topicMapTitle: "Domain coverage map",
        weakBadge: "Needs review",
        strongBadge: "Confident",
        recoveryLaneTitle: "Recommended Domain Recovery Lane",
        recoveryFirst:
          "Use certification analytics to isolate the weakest visible domain first, then move into focused practice before booking another full readiness pass.",
        recoverySecond:
          "A strong sequence is: review the weakest domain signal, run the targeted practice set, then return to results or comparison views before another broader certification simulation.",
        actionLogicThird:
          "If the latest result is already visible, compare readiness signals before another full-length attempt. If not, use domain gaps and focused practice as the safer next move.",
        focusWorkspaceLabel: "Open Targeted Domain Practice",
        weakAreasLabel: "Open Domain Gaps",
        kpiAverage: "Average Readiness",
        kpiTrend: "Readiness Trend",
        kpiHistory: "Session History",
        sourcePanelTitle: "Readiness by Source",
      }
    : {
        heroTag: "Analytics Focus",
        heroFallbackTitle: "Turn analytics into action",
        sourceDescription:
          selectedSubject === ALL_SUBJECTS_CONTEXT
            ? "A live analytics workspace built from backend insights, published results, and topic performance data."
            : `A live analytics workspace focused on ${selectedSubjectLabel}, using only matching backend subject records in this view.`,
        heroMetaAverage: "Average score",
        heroMetaAccuracy: "Accuracy",
        heroMetaHistory: "Attempt history",
        benchmarkTitle: "Benchmark pulse",
        averageCardTitle: "Average performance",
        averageCardSuffix: "overall score",
        accuracyCardTitle: "Accuracy pulse",
        topicMapTitle: "Topic pressure map",
        weakBadge: "Needs work",
        strongBadge: "Strong",
        recoveryLaneTitle: "Recommended Recovery Lane",
        recoveryFirst:
          "Use analytics to choose the weakest visible concept first, then move into practice before checking whether the next result trend improves.",
        recoverySecond:
          "A strong sequence is: open weak areas for the ranked topic, run the focused practice pass, then return to results or comparison views before scheduling another broad mock.",
        actionLogicThird:
          "If the latest result is already visible, compare recent results before another mock. If not, use weak areas and focused practice as the safer next move.",
        focusWorkspaceLabel: "Open Focused Practice Workspace",
        weakAreasLabel: "Open Weak Areas",
        kpiAverage: "Average Performance",
        kpiTrend: "Performance Trend",
        kpiHistory: "Attempt History",
        sourcePanelTitle: "Performance by Source",
      };

  return (
    <div className="studentPage studentDashboardModern studentLearnerPage studentLearnerAnalyticsPage">
      <StudentPageHeader
        title={
          selectedSubject === ALL_SUBJECTS_CONTEXT
            ? "Analytics"
            : `${selectedSubjectLabel} Analytics`
        }
        contextLabel={
          [
            selectedSource === ALL_SOURCES_CONTEXT
              ? null
              : `Source view · ${selectedStudentSourceLabel(selectedSource)}`,
            selectedSubject === ALL_SUBJECTS_CONTEXT
              ? null
              : `Subject view · ${selectedSubjectLabel}`,
          ]
            .filter(Boolean)
            .join(" · ") || undefined
        }
        description={
          analyticsCopy.sourceDescription
        }
        statusLabel={
          source === "live"
            ? `${scopedTopicPerformance.length} topic records loaded`
            : source === "unconfigured"
              ? "Backend not configured"
              : "Unable to load analytics"
        }
        statusTone={
          source === "live"
            ? "live"
            : source === "unconfigured"
              ? "warning"
              : "demo"
        }
      />

      {error ? (
        <p className="feedbackBanner feedbackBannerError">{decodeURIComponent(error)}</p>
      ) : null}

      {!scopedSummary ? (
        <StudentStatePanel
          eyebrow={source === "unconfigured" ? "Setup required" : "Load issue"}
          title={
            source === "unconfigured"
              ? "Waiting for student analytics data"
              : "Student analytics could not be loaded"
          }
          description={
            source === "unconfigured"
              ? "This screen only renders real insight and topic-performance data. Configure the API base URL and sign in with an active student account to unlock live readiness and analytics."
              : "The analytics workspace depends on live summary, results, and topic-performance endpoints, and the current request did not complete successfully."
          }
          bullets={
            source === "unconfigured"
              ? [
                  "Student insight summary endpoint",
                  "Student results endpoint",
                  "Topic performance endpoint",
                ]
              : ["Backend connectivity", "Analytics endpoints", "Student session validity"]
          }
          ctaHref="/app/dashboard"
          ctaLabel="Back to Dashboard"
          statusLabel={
            source === "unconfigured"
              ? "Configuration required"
              : "Retry after backend check"
          }
        />
      ) : (
        <>
          <section className="analyticsLandingHero">
            <div className="studentInsightHeroCard studentInsightHeroCardWarm analyticsLandingHeroMain">
              <div className="studentInsightHeroCopy analyticsLandingHeroCopy">
              <span className="studentDashboardTag studentDashboardTagWarm">
                {analyticsCopy.heroTag}
              </span>
              <strong>
                {topWeakTopic?.topic_name ?? analyticsCopy.heroFallbackTitle}
              </strong>
              <small>
                Trend: {trendDirectionLabel(scopedSummary.improvement_trend.direction)} ·{" "}
                {signedPercentageLabel(scopedSummary.improvement_trend.change_percentage)}
                  {dominantSource
                    ? ` · Most published activity from ${sourceDescriptor(dominantSource)}`
                    : ""}
                </small>
                <p className="sectionDescription">{practiceFocus.helper}</p>
                <div className="analyticsHeroMetaGrid">
                  <div className="analyticsHeroMetaCard">
                    <span className="analyticsHeroMetaIcon analyticsHeroMetaIconScore">
                      <AnalyticsGlyph kind="score" />
                    </span>
                    <span>{analyticsCopy.heroMetaAverage}</span>
                    <strong>{percentageLabel(scopedSummary.average_percentage)}</strong>
                  </div>
                  <div className="analyticsHeroMetaCard">
                    <span className="analyticsHeroMetaIcon analyticsHeroMetaIconAccuracy">
                      <AnalyticsGlyph kind="accuracy" />
                    </span>
                    <span>{analyticsCopy.heroMetaAccuracy}</span>
                    <strong>{percentageLabel(scopedSummary.accuracy_percentage)}</strong>
                  </div>
                  <div className="analyticsHeroMetaCard">
                    <span className="analyticsHeroMetaIcon analyticsHeroMetaIconHistory">
                      <AnalyticsGlyph kind="history" />
                    </span>
                    <span>{analyticsCopy.heroMetaHistory}</span>
                    <strong>{scopedSummary.attempt_behavior.attempt_count}</strong>
                  </div>
                </div>
                <div className="analyticsHeroSketch" aria-hidden="true">
                  <svg viewBox="0 0 220 120" className="analyticsHeroSketchSvg">
                    <path d="M18 94 L176 18 L176 94 Z" className="analyticsHeroSketchOutline" />
                    <path d="M70 94 L176 94" className="analyticsHeroSketchLine" />
                    <path d="M176 94 L176 18" className="analyticsHeroSketchLine" />
                    <path d="M18 94 L176 18" className="analyticsHeroSketchLine" />
                    <path d="M46 94 A26 26 0 0 1 63 70" className="analyticsHeroSketchArc" />
                    <path d="M131 44 l14 -14" className="analyticsHeroSketchTick" />
                    <path d="M141 54 l14 -14" className="analyticsHeroSketchTick" />
                    <path d="M90 94 l0 -12" className="analyticsHeroSketchTick" />
                    <path d="M108 94 l0 -12" className="analyticsHeroSketchTick" />
                    <g className="analyticsHeroSketchBars">
                      <rect x="186" y="76" width="8" height="24" rx="4" />
                      <rect x="200" y="60" width="8" height="40" rx="4" />
                      <rect x="214" y="40" width="8" height="60" rx="4" />
                    </g>
                  </svg>
                </div>
                <div className="studentInsightHeroActions analyticsLandingHeroActions">
                  <span className="studentDashboardTag studentDashboardTagWarm">
                    {practiceFocus.laneLabel}
                  </span>
                  {practiceFocus.exam ? (
                    practiceFocus.action.mode === "start" ? (
                      <form action={startPracticeAction}>
                        <input name="exam_id" type="hidden" value={practiceFocus.exam.id} />
                        <ActionSubmitButton
                          className="button buttonPrimary"
                          idleLabel={practiceFocus.action.label}
                          pendingLabel="Starting..."
                        />
                      </form>
                    ) : practiceFocus.action.mode === "unlock" ? (
                      <form action={unlockPracticeAction}>
                        <input name="exam_id" type="hidden" value={practiceFocus.exam.id} />
                        <input
                          name="content_type"
                          type="hidden"
                          value={practiceFocus.exam.economy_access.content_type}
                        />
                        <input
                          name="content_key"
                          type="hidden"
                          value={practiceFocus.exam.economy_access.content_key}
                        />
                        <input
                          name="subject_id"
                          type="hidden"
                          value={practiceFocus.exam.economy_access.subject_id ?? ""}
                        />
                        <ActionSubmitButton
                          className="button buttonPrimary"
                          idleLabel={practiceFocus.action.label}
                          pendingLabel="Unlocking..."
                        />
                      </form>
                    ) : (
                      <Link className="button buttonPrimary" href={practiceFocus.action.href}>
                        {practiceFocus.action.label}
                      </Link>
                    )
                  ) : (
                    <Link className="button buttonPrimary" href={practiceFocus.focusHref}>
                      {practiceFocus.focusLabel}
                    </Link>
                  )}
                  <Link className="button buttonSecondary" href="/app/results">
                    Check Results
                  </Link>
                  <Link className="button buttonGhost" href={buildAnalyticsActionsHref()}>
                    Open Action Center
                  </Link>
                </div>
              </div>
                <div className="analyticsHeroVisuals analyticsHeroVisualsCompact">
                  <div className="analyticsHeroTrendCard analyticsHeroInsightCard">
                    <div className="sectionHeading sectionHeadingCompact">
                      <strong>Recent score pulse</strong>
                      <span>{recentTrendBars.length || 0} exams</span>
                    </div>
                  <div className="analyticsLineChartSurface">
                    {recentTrendBars.length ? (
                      <>
                        {flatTrendSeries ? (
                          <div className="analyticsLineChartStableNote">
                            <strong>{percentageLabel(recentTrendBars[0]?.value ?? 0)}</strong>
                            <span>Stable across recent published results</span>
                          </div>
                        ) : null}
                        <svg
                          aria-hidden="true"
                          className={`analyticsLineChart ${flatTrendSeries ? "analyticsLineChartFlat" : ""}`}
                          viewBox="0 0 520 170"
                        >
                          <defs>
                            <linearGradient id="analyticsScoreArea" x1="0" x2="0" y1="0" y2="1">
                              <stop offset="0%" stopColor="rgba(43,99,255,0.28)" />
                              <stop offset="100%" stopColor="rgba(43,99,255,0.02)" />
                            </linearGradient>
                          </defs>
                          <line className="analyticsLineChartAxis" x1="20" y1="142" x2="500" y2="142" />
                          <line className="analyticsLineChartGrid" x1="20" y1="98" x2="500" y2="98" />
                          <line className="analyticsLineChartGrid" x1="20" y1="54" x2="500" y2="54" />
                          <polygon className="analyticsLineChartArea" points={lineChart.areaPoints} />
                          <polyline className="analyticsLineChartPath" points={lineChart.polylinePoints} />
                          {lineChart.points.map((point, index) => (
                            <g key={`${recentTrendBars[index]?.id}-point`}>
                              <circle className="analyticsLineChartPointHalo" cx={point.x} cy={point.y} r="8" />
                              <circle className="analyticsLineChartPoint" cx={point.x} cy={point.y} r="4.5" />
                            </g>
                          ))}
                        </svg>
                        <div className="analyticsLineChartLabels">
                          {recentTrendBars.map((item, index) => (
                            <div className="analyticsLineChartLabel" key={item.id}>
                              <strong>
                                {flatTrendSeries && index !== recentTrendBars.length - 1
                                  ? " "
                                  : `${Math.round(lineChart.points[index]?.value ?? item.value)}%`}
                              </strong>
                              <span>{item.label.replace(/^CLS7-/, "")}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="emptyText">Recent scored results will animate this trend strip.</p>
                    )}
                  </div>
                </div>
                  <div className="analyticsHeroBenchmarkCard analyticsHeroInsightCard">
                    <div className="sectionHeading sectionHeadingCompact">
                    <strong>{analyticsCopy.benchmarkTitle}</strong>
                    <span>{benchmarkOverview.length} scopes</span>
                  </div>
                  <div className="analyticsBenchmarkStack">
                    {benchmarkOverview.slice(0, 4).map((benchmark) => (
                      <div className="analyticsBenchmarkRow" key={benchmark.scope}>
                        <span className={`analyticsBenchmarkDot analyticsBenchmarkDot${benchmark.scope}`} />
                        <div className="analyticsBenchmarkMeta">
                          <strong>{benchmarkLabel(benchmark.label || benchmark.scope)}</strong>
                          <span>{peerRecordLabel(benchmark.participant_count)}</span>
                        </div>
                        <div className="analyticsBenchmarkProgress">
                          <span
                            className="analyticsBenchmarkProgressFill"
                            style={{
                              ["--benchmark-fill" as string]: `${numericScore(
                                benchmark.average_percentage,
                              )}%`,
                            }}
                          />
                        </div>
                        <div className="studentTopicRowMeta">
                          <strong>{percentageLabel(benchmark.average_percentage)}</strong>
                          <span>peer average</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="analyticsShowcaseGrid">
            <article className="analyticsShowcaseCard analyticsShowcaseCardScore">
              <div className="sectionHeading sectionHeadingCompact">
                <strong>{analyticsCopy.averageCardTitle}</strong>
                <span>{publishedResults.length} published</span>
              </div>
              <div className="analyticsGaugeCard">
                <div
                  className="analyticsGaugeRing"
                  style={{
                    ["--gauge-fill" as string]: `${averageScoreValue}%`,
                  }}
                >
                  <div>
                    <strong>{percentageLabel(scopedSummary.average_percentage)}</strong>
                    <span>{analyticsCopy.averageCardSuffix}</span>
                  </div>
                </div>
                <div className="analyticsGaugeMeta">
                  <strong className={trendToneClass}>
                    {trendDirectionLabel(scopedSummary.improvement_trend.direction)}
                  </strong>
                  <span>
                    {signedPercentageLabel(scopedSummary.improvement_trend.change_percentage)} across recent exams
                  </span>
                </div>
              </div>
            </article>

            <article className="analyticsShowcaseCard analyticsShowcaseCardAccuracy">
              <div className="sectionHeading sectionHeadingCompact">
                <strong>{analyticsCopy.accuracyCardTitle}</strong>
                <span>{scopedSummary.attempted_questions} attempted</span>
              </div>
              <div className="analyticsGaugeCard">
                <div
                  className="analyticsGaugeRing analyticsGaugeRingCool"
                  style={{
                    ["--gauge-fill" as string]: `${accuracyScoreValue}%`,
                  }}
                >
                  <div>
                    <strong>{percentageLabel(scopedSummary.accuracy_percentage)}</strong>
                    <span>accuracy</span>
                  </div>
                </div>
                <div className="analyticsSplitLegend">
                  <div>
                    <strong>{answeredShare}%</strong>
                    <span>answered share</span>
                  </div>
                  <div>
                    <strong>{skippedShare}%</strong>
                    <span>skip share</span>
                  </div>
                </div>
                <div className="analyticsStackedBar">
                  <span
                    className="analyticsStackedBarFill analyticsStackedBarAnswered"
                    style={{ ["--stack-size" as string]: `${answeredShare}%` }}
                  />
                  <span
                    className="analyticsStackedBarFill analyticsStackedBarSkipped"
                    style={{ ["--stack-size" as string]: `${skippedShare}%` }}
                  />
                </div>
              </div>
            </article>

            <article className="analyticsShowcaseCard analyticsShowcaseCardTopics">
              <div className="sectionHeading sectionHeadingCompact">
                <strong>{analyticsCopy.topicMapTitle}</strong>
                <span>{weakTopics.length + strongTopics.length} highlighted</span>
              </div>
              <div className="analyticsTopicMiniGrid">
                {weakTopics.slice(0, 3).map((topic) => (
                  <Link
                    className="analyticsTopicMiniCard analyticsTopicMiniCardWeak"
                    href={buildAnalyticsTopicHref({
                      topicId: topic.topic ?? "untagged",
                      subject: topic.subject_name,
                      label: topic.topic_name ?? null,
                      source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                      teacher: selectedSource === "teacher" ? selectedTeacherId : null,
                    })}
                    key={topic.id}
                  >
                    <span>{analyticsCopy.weakBadge}</span>
                    <strong>{topic.topic_name ?? "Untagged topic"}</strong>
                    <small>{percentageLabel(topic.percentage)}</small>
                  </Link>
                ))}
                {strongTopics.slice(0, 2).map((topic) => (
                  <Link
                    className="analyticsTopicMiniCard analyticsTopicMiniCardStrong"
                    href={buildAnalyticsTopicHref({
                      topicId: topic.topic ?? "untagged",
                      subject: topic.subject_name,
                      label: topic.topic_name ?? null,
                      source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                      teacher: selectedSource === "teacher" ? selectedTeacherId : null,
                    })}
                    key={topic.id}
                  >
                    <span>{analyticsCopy.strongBadge}</span>
                    <strong>{topic.topic_name ?? "Untagged topic"}</strong>
                    <small>{percentageLabel(topic.percentage)}</small>
                  </Link>
                ))}
              </div>
            </article>
          </section>

          <section className="studentInsightsTwoColumn">
            <article className="contentCard">
              <div className="sectionHeading">
                <strong>{analyticsCopy.recoveryLaneTitle}</strong>
                <span>{practiceFocus.focusLabel}</span>
              </div>
              <div className="studentInsightMessageStack">
                <div className="studentInsightMessage">
                  <span className="placeholderDot" aria-hidden="true" />
                  <p>{practiceFocus.helper}</p>
                </div>
                <div className="studentInsightMessage">
                  <span className="placeholderDot" aria-hidden="true" />
                  <p>{analyticsCopy.recoveryFirst}</p>
                </div>
                <div className="studentInsightMessage">
                  <span className="placeholderDot" aria-hidden="true" />
                  <p>{analyticsCopy.recoverySecond}</p>
                </div>
              </div>
              <div className="studentActionSequence" aria-label="Analytics recovery order">
                {analyticsActionSequence.map((step) => (
                  <div className="studentActionSequenceCard" key={step.label}>
                    <span>{step.label}</span>
                    <strong>{step.detail}</strong>
                  </div>
                ))}
              </div>
              <div className="studentInsightHeroActions">
                <Link className="button buttonSecondary" href={practiceFocus.focusHref}>
                  {analyticsCopy.focusWorkspaceLabel}
                </Link>
                <Link className="button buttonGhost" href="/app/weak-areas">
                  {analyticsCopy.weakAreasLabel}
                </Link>
              </div>
            </article>
            <article className="contentCard">
              <div className="sectionHeading">
                <strong>Action Logic</strong>
                <span>State-aware handoff</span>
              </div>
              <div className="studentInsightMessageStack">
                <div className="studentInsightMessage">
                  <span className="placeholderDot" aria-hidden="true" />
                  <p>The recommendation starts from the weakest topic visible in the current filtered analytics view.</p>
                </div>
                <div className="studentInsightMessage">
                  <span className="placeholderDot" aria-hidden="true" />
                  <p>The CTA then prefers resume, start, unlock, and detail states in that order so the action stays truthful to live backend access.</p>
                </div>
                <div className="studentInsightMessage">
                  <span className="placeholderDot" aria-hidden="true" />
                  <p>{analyticsCopy.actionLogicThird}</p>
                </div>
              </div>
              <div className="studentInsightHeroActions">
                <Link className="button buttonSecondary" href="/app/weak-areas">
                  {analyticsCopy.weakAreasLabel}
                </Link>
                <Link
                  className="button buttonGhost"
                  href={buildAnalyticsResultsCompareHref({
                    subject:
                      selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubjectLabel,
                    source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                    teacher: selectedSource === "teacher" ? selectedTeacherId : null,
                  })}
                >
                  Compare Results
                </Link>
              </div>
            </article>
          </section>

          <StudentKpiGrid
            className="resultsSummaryGrid analyticsKpiGrid"
            items={[
              {
                label: analyticsCopy.kpiAverage,
                value: percentageLabel(scopedSummary.average_percentage),
                note: `Based on ${publishedResults.length} published${publishedResults.length === 1 ? " result" : " results"}`,
                tone: "primary",
                icon: <AnalyticsGlyph kind="score" />,
                href: buildAnalyticsTimelineHref({
                  subject:
                    selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubjectLabel,
                  source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                  teacher: selectedSource === "teacher" ? selectedTeacherId : null,
                }),
              },
              {
                label: "Accuracy Rate",
                value: percentageLabel(scopedSummary.accuracy_percentage),
                note: `${scopedSummary.attempted_questions} attempted and ${scopedSummary.skipped_questions} skipped`,
                icon: <AnalyticsGlyph kind="accuracy" />,
                href: buildAnalyticsTimelineHref({
                  subject:
                    selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubjectLabel,
                  source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                  teacher: selectedSource === "teacher" ? selectedTeacherId : null,
                }),
              },
              {
                label: analyticsCopy.kpiTrend,
                value: trendDirectionLabel(scopedSummary.improvement_trend.direction),
                note: `Change of ${signedPercentageLabel(scopedSummary.improvement_trend.change_percentage)} across recent exams`,
                icon: <AnalyticsGlyph kind="trend" />,
                href: buildAnalyticsTimelineHref({
                  subject:
                    selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubjectLabel,
                  source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                  teacher: selectedSource === "teacher" ? selectedTeacherId : null,
                }),
              },
              {
                label: analyticsCopy.kpiHistory,
                value: scopedSummary.attempt_behavior.attempt_count,
                note: `${scopedSummary.attempt_behavior.attempted_questions} answered and ${scopedSummary.attempt_behavior.skipped_questions} skipped overall`,
                icon: <AnalyticsGlyph kind="history" />,
                href: buildAnalyticsTimelineHref({
                  subject:
                    selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubjectLabel,
                  source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                  teacher: selectedSource === "teacher" ? selectedTeacherId : null,
                }),
              },
            ]}
          />

          <section className="studentInsightsTwoColumn">
            <article className="contentCard analyticsPanel analyticsPanelSource">
              <div className="sectionHeading">
                <strong>{analyticsCopy.sourcePanelTitle}</strong>
                <span>{sourceBreakdown.length} sources tracked</span>
              </div>
              <div className="studentTopicStack">
                {sourceBreakdown.length ? (
                  sourceBreakdown.map((row) => {
                    const value = Number(row.average_percentage);
                    return (
                      <Link
                        className="studentTopicRow"
                        href={buildAnalyticsSourceHref({
                          sourceKey:
                            row.source_type === "platform"
                            || row.source_type === "institute"
                            || row.source_type === "teacher"
                              ? row.source_type
                              : "platform",
                          subject:
                            selectedSubject === ALL_SUBJECTS_CONTEXT
                              ? null
                              : selectedSubjectLabel,
                          teacher:
                            row.source_type === "teacher" ? row.source_teacher_id : null,
                          label: sourceDescriptor(row),
                        })}
                        key={`${row.source_type}-${row.source_name}`}
                      >
                        <div>
                          <div className="studentInsightHeroActions">
                            <StatusPill tone="default">{row.source_label}</StatusPill>
                            {row.source_type === "teacher" && row.source_teacher_name ? (
                              <StatusPill tone="demo">{row.source_teacher_name}</StatusPill>
                            ) : null}
                          </div>
                          <strong>{sourceDescriptor(row)}</strong>
                          <span>
                            {row.count} published {row.count === 1 ? "result" : "results"} ·{" "}
                            {row.attempted_questions} attempted
                          </span>
                          <div className="analyticsInlineProgress">
                            <span
                              className={`analyticsInlineProgressFill analyticsInlineProgressFill${scoreTone(value)}`}
                              style={{ ["--inline-progress" as string]: `${value}%` }}
                            />
                          </div>
                        </div>
                        <div className="studentTopicRowMeta">
                          <strong>{percentageLabel(row.average_percentage)}</strong>
                          <span>{value >= averageScoreValue ? "above average" : "below average"}</span>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <p className="emptyText">Source-level analytics will appear after published results are available.</p>
                )}
              </div>
            </article>

            <article className="contentCard analyticsPanel analyticsPanelMatrix">
              <div className="sectionHeading">
                <strong>Source and Subject Breakdown</strong>
                <span>{sourceSubjectBreakdown.length} combinations</span>
              </div>
              <div className="studentTopicStack">
                {sourceSubjectBreakdown.length ? (
                  sourceSubjectBreakdown.slice(0, 6).map((row) => (
                    <Link
                      className="studentTopicRow"
                      href={buildAnalyticsSourceHref({
                        sourceKey:
                          row.source_type === "platform"
                          || row.source_type === "institute"
                          || row.source_type === "teacher"
                            ? row.source_type
                            : "platform",
                        subject: row.subject_name,
                        teacher:
                          row.source_type === "teacher" ? row.source_teacher_id : null,
                        label: sourceDescriptor(row),
                      })}
                      key={`${row.source_type}-${row.source_name}-${row.subject_name}`}
                    >
                      <div>
                        <div className="studentInsightHeroActions">
                          <StatusPill tone="default">{row.source_label}</StatusPill>
                          {row.source_type === "teacher" && row.source_teacher_name ? (
                            <StatusPill tone="demo">{row.source_teacher_name}</StatusPill>
                          ) : null}
                        </div>
                        <strong>{row.subject_name}</strong>
                        <span>{sourceDescriptor(row)}</span>
                      </div>
                      <div className="studentTopicRowMeta">
                        <strong>{percentageLabel(row.average_percentage)}</strong>
                        <span>
                          {row.count} {row.count === 1 ? "subject record" : "subject records"}
                        </span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="emptyText">Combined source and subject insights will appear after scored results are published.</p>
                )}
              </div>
            </article>
          </section>

          <section className="studentInsightsTwoColumn">
            <article className="contentCard analyticsPanel analyticsPanelSubjects">
              <div className="sectionHeading">
                <strong>Subject Performance</strong>
                <Link href="/app/weak-areas">Open weak areas</Link>
              </div>
              <div className="studentInsightDualList">
                <div className="studentInsightColumn">
                  <div className="studentInsightColumnHeading">
                    <strong>Strongest subjects</strong>
                    <span>{scopedSummary.strongest_subjects.length} tracked</span>
                  </div>
                  {scopedSummary.strongest_subjects.length ? (
                    scopedSummary.strongest_subjects.map((subject) => {
                      const value = Number(subject.average_percentage);
                      return (
                        <div className="studentInsightScoreRow" key={subject.subject_id}>
                          <Link
                            href={buildAnalyticsSubjectHref(subject.subject_name, {
                              source:
                                selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                              teacher:
                                selectedSource === "teacher" ? selectedTeacherId : null,
                            })}
                          >
                            <strong>{subject.subject_name}</strong>
                            <span>{percentageLabel(subject.average_percentage)}</span>
                          </Link>
                          <div
                            className={`scoreBar scoreBar${scoreTone(value)}`}
                            style={{ ["--score-width" as string]: `${value}%` }}
                          />
                        </div>
                      );
                    })
                  ) : (
                    <p className="emptyText">No subject-level performance records are available yet.</p>
                  )}
                </div>

                <div className="studentInsightColumn">
                  <div className="studentInsightColumnHeading">
                    <strong>Weakest subjects</strong>
                    <span>{scopedSummary.weakest_subjects.length} tracked</span>
                  </div>
                  {scopedSummary.weakest_subjects.length ? (
                    scopedSummary.weakest_subjects.map((subject) => {
                      const value = Number(subject.average_percentage);
                      return (
                        <div className="studentInsightScoreRow" key={subject.subject_id}>
                          <Link
                            href={buildAnalyticsSubjectHref(subject.subject_name, {
                              source:
                                selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                              teacher:
                                selectedSource === "teacher" ? selectedTeacherId : null,
                            })}
                          >
                            <strong>{subject.subject_name}</strong>
                            <span>{percentageLabel(subject.average_percentage)}</span>
                          </Link>
                          <div
                            className={`scoreBar scoreBar${scoreTone(value)}`}
                            style={{ ["--score-width" as string]: `${value}%` }}
                          />
                        </div>
                      );
                    })
                  ) : (
                    <p className="emptyText">Weak subject insights will appear after enough completed exams.</p>
                  )}
                </div>
              </div>
            </article>

            <article className="contentCard analyticsPanel analyticsPanelResults">
              <div className="sectionHeading">
                <strong>Recent Published Results</strong>
                <Link
                  href={buildAnalyticsResultsCompareHref({
                    subject:
                      selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubjectLabel,
                    source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                    teacher: selectedSource === "teacher" ? selectedTeacherId : null,
                  })}
                >
                  Compare results
                </Link>
              </div>
              <div className="dashboardRailStack">
                {scopedSummary.recent_exams.length ? (
                  scopedSummary.recent_exams.slice(0, 4).map((exam) => {
                    const examSubjectLabel = getExamSubjectDisplayLabel(exam);
                    return (
                      <Link
                        className="dashboardRailRow"
                        href={buildAnalyticsResultsCompareHref({
                          subject:
                            selectedSubject === ALL_SUBJECTS_CONTEXT
                              ? examSubjectLabel
                              : selectedSubjectLabel,
                          source:
                            selectedSource === ALL_SOURCES_CONTEXT
                              ? exam.source_type
                              : selectedSource,
                          teacher:
                            exam.source_type === "teacher"
                              ? exam.source_teacher_id
                              : selectedSource === "teacher"
                                ? selectedTeacherId
                                : null,
                        })}
                        key={exam.exam_id}
                      >
                        <div>
                          <strong>{exam.exam_title}</strong>
                          <span>
                            {exam.exam_code} ·{" "}
                            {sourceDescriptor(exam)}
                            {examSubjectLabel ? ` · ${examSubjectLabel}` : ""} ·{" "}
                            {exam.published_at
                              ? studentDateTimeLabel(exam.published_at)
                              : "Awaiting publish"}
                          </span>
                        </div>
                        <div className="studentInsightHeroActions">
                          <StatusPill tone="default">{exam.source_label}</StatusPill>
                          {exam.source_type === "teacher" && exam.source_teacher_name ? (
                            <StatusPill tone="demo">{exam.source_teacher_name}</StatusPill>
                          ) : null}
                          <span className="dashboardRailStat">
                            {percentageLabel(exam.percentage)}
                          </span>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <p className="emptyText">Recent published results will appear here after scored attempts.</p>
                )}
              </div>
            </article>
          </section>

          <section className="studentInsightsTwoColumn">
            <article className="contentCard analyticsPanel analyticsPanelTopics">
              <div className="sectionHeading">
                <strong>Topic Performance</strong>
                <span>{weakTopics.length + strongTopics.length} highlighted</span>
              </div>
              <div className="studentInsightDualList">
                <div className="studentInsightColumn">
                  <div className="studentInsightColumnHeading">
                    <strong>Weak topics</strong>
                    <span>{weakTopics.length} items</span>
                  </div>
                  {weakTopics.length ? (
                    weakTopics.map((topic) => (
                      <Link
                        className="studentTopicRow"
                        href={buildAnalyticsTopicHref({
                          topicId: topic.topic ?? "untagged",
                          subject: topic.subject_name,
                          label: topic.topic_name ?? null,
                          source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                          teacher: selectedSource === "teacher" ? selectedTeacherId : null,
                        })}
                        key={topic.id}
                      >
                        <div>
                          <strong>{topic.topic_name ?? "Untagged topic"}</strong>
                          <span>{topic.subject_name}</span>
                        </div>
                        <div className="studentTopicRowMeta">
                          <strong>{percentageLabel(topic.percentage)}</strong>
                          <span>{topic.attempted_questions} attempted</span>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="emptyText">No topic-level analytics records are available yet.</p>
                  )}
                </div>

                <div className="studentInsightColumn">
                  <div className="studentInsightColumnHeading">
                    <strong>Top performing topics</strong>
                    <span>{strongTopics.length} items</span>
                  </div>
                  {strongTopics.length ? (
                    strongTopics.map((topic) => (
                      <Link
                        className="studentTopicRow"
                        href={buildAnalyticsTopicHref({
                          topicId: topic.topic ?? "untagged",
                          subject: topic.subject_name,
                          label: topic.topic_name ?? null,
                          source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                          teacher: selectedSource === "teacher" ? selectedTeacherId : null,
                        })}
                        key={topic.id}
                      >
                        <div>
                          <strong>{topic.topic_name ?? "Untagged topic"}</strong>
                          <span>{topic.subject_name}</span>
                        </div>
                        <div className="studentTopicRowMeta">
                          <strong>{percentageLabel(topic.percentage)}</strong>
                          <span>{topic.correct_answers} correct</span>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="emptyText">Strong topic insights will populate after scored attempts.</p>
                  )}
                </div>
              </div>
            </article>

            <article className="contentCard analyticsPanel analyticsPanelRisk">
              <div className="sectionHeading">
                <strong>Question-Type Risk</strong>
                <span>{scopedSummary.weak_question_types.length} tracked</span>
              </div>
              <div className="studentTopicStack">
                {scopedSummary.weak_question_types.length ? (
                  scopedSummary.weak_question_types.map((item) => (
                    <Link
                      className="studentTopicRow analyticsRiskRow"
                      href={buildAnalyticsQuestionTypeHref({
                        subject:
                          selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubjectLabel,
                        questionType: item.question_type,
                        source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                        teacher: selectedSource === "teacher" ? selectedTeacherId : null,
                      })}
                      key={item.question_type}
                    >
                      <div>
                        <strong>{questionTypeLabel(item.question_type)}</strong>
                        <span>{item.total} total responses</span>
                        <div className="analyticsRiskBar">
                          <span
                            className="analyticsRiskBarWrong"
                            style={{
                              ["--risk-size" as string]: `${numericScore(item.wrong_percentage)}%`,
                            }}
                          />
                          <span
                            className="analyticsRiskBarSkipped"
                            style={{
                              ["--risk-size" as string]: `${numericScore(item.skip_percentage)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="studentTopicRowMeta">
                        <strong>{percentageLabel(item.wrong_percentage)}</strong>
                        <span>{percentageLabel(item.skip_percentage)} skipped</span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="emptyText">Question-type risk will populate after enough completed attempts.</p>
                )}
              </div>
            </article>
          </section>

          <section className="contentCard analyticsPanel analyticsPanelInsights">
            <div className="sectionHeading">
              <strong>Insight Messages</strong>
              <span>{scopedSummary.insight_messages.length} generated</span>
            </div>
            <div className="studentInsightMessageStack">
              {scopedSummary.insight_messages.length ? (
                scopedSummary.insight_messages.map((message) => (
                  <div className="studentInsightMessage" key={message}>
                    <span className="placeholderDot" aria-hidden="true" />
                    <p>{message}</p>
                  </div>
                ))
              ) : (
                <p className="emptyText">No automated insight messages are available yet.</p>
              )}
            </div>
            <div className="studentInsightHeroActions">
              <Link className="button buttonSecondary" href="/app/weak-areas">
                Work On Weak Topics
              </Link>
              <Link className="button buttonGhost" href="/app/exams">
                Open Mock Tests
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
