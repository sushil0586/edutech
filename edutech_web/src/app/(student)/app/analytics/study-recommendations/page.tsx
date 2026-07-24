import { cookies } from "next/headers";
import Link from "next/link";
import { fetchCurrentAccountProfile } from "@/lib/auth/session";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentAnalyticsDetailHero } from "@/components/ui/student-analytics-detail";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import {
  StudentPracticeRecommendationReport,
  type StudentPracticeRecommendationRow,
} from "@/components/ui/student-practice-recommendation-report";
import { StudentReportFilters } from "@/components/ui/student-report-filters";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import {
  fetchStudentAttempts,
  fetchStudentAvailableExams,
  fetchStudentInsightSummary,
  getStudentApiState,
} from "@/lib/api/student";
import { buildAnalyticsTimelineHref } from "@/lib/student/analytics";
import {
  percentageLabel,
  questionTypeLabel,
  titleCaseState,
  trendDirectionLabel,
} from "@/lib/student/formatters";
import { resolvePracticeFocusRecommendation } from "@/lib/student/practice";
import {
  ALL_SOURCES_CONTEXT,
  ALL_SUBJECTS_CONTEXT,
  filterStudentExamsBySubject,
  filterStudentRecordsBySource,
  filterStudentSummaryBySource,
  filterStudentSummaryBySubject,
  getExamSubjectDisplayLabel,
  getStudentSourceOptions,
  getStudentSubjectOptions,
  resolveSelectedStudentSource,
  resolveSelectedStudentSourceTeacher,
  resolveSelectedStudentSubject,
  STUDENT_SOURCE_CONTEXT_COOKIE,
  STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE,
  STUDENT_SUBJECT_CONTEXT_COOKIE,
} from "@/lib/student/subject-context";

function latestAttemptForExam(
  attempts: Awaited<ReturnType<typeof fetchStudentAttempts>>,
  examId: string,
) {
  return (
    attempts
      .filter((attempt) => attempt.exam === examId)
      .sort(
        (left, right) =>
          new Date(right.started_at || right.created_at).getTime() -
          new Date(left.started_at || left.created_at).getTime(),
      )[0] ?? null
  );
}

export default async function StudentStudyRecommendationsPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; source?: string; teacher?: string }>;
}) {
  const query = await searchParams;
  const profile = await fetchCurrentAccountProfile();
  const registrationContext = profile?.registration_context ?? {};
  const subjectOptions = getStudentSubjectOptions(profile ?? registrationContext);
  const cookieStore = await cookies();
  const selectedSubject = resolveSelectedStudentSubject(
    subjectOptions,
    query.subject ?? cookieStore.get(STUDENT_SUBJECT_CONTEXT_COOKIE)?.value ?? ALL_SUBJECTS_CONTEXT,
  );
  const selectedSource = resolveSelectedStudentSource(
    query.source ?? cookieStore.get(STUDENT_SOURCE_CONTEXT_COOKIE)?.value ?? ALL_SOURCES_CONTEXT,
  );
  const state = getStudentApiState();

  if (!state.apiConfigured) {
    return (
      <div className="studentPage studentDashboardModern">
        <StudentStatePanel
          eyebrow="Setup required"
          title="AI study recommendations are not available yet"
          description="Sign in with your student account to load the recommendation report."
          bullets={["Student sign-in", "Weak topic insight", "Practice recommendations"]}
          ctaHref="/app/analytics"
          ctaLabel="Back to Analytics"
          statusLabel="Sign in to continue"
        />
      </div>
    );
  }

  let summary: Awaited<ReturnType<typeof fetchStudentInsightSummary>> | null = null;
  let exams: Awaited<ReturnType<typeof fetchStudentAvailableExams>> = [];
  let attempts: Awaited<ReturnType<typeof fetchStudentAttempts>> = [];

  try {
    [summary, exams, attempts] = await Promise.all([
      fetchStudentInsightSummary(),
      fetchStudentAvailableExams(),
      fetchStudentAttempts().catch(() => []),
    ]);
  } catch {
    summary = null;
  }

  if (!summary) {
    return (
      <div className="studentPage studentDashboardModern">
        <StudentStatePanel
          eyebrow="Load issue"
          title="AI study recommendations could not be loaded"
          description="We couldn't load the recommendation report right now."
          bullets={["Recommendation signals", "Practice readiness", "Connection check"]}
          ctaHref="/app/analytics"
          ctaLabel="Back to Analytics"
          statusLabel="Try again soon"
        />
      </div>
    );
  }

  const { teacherOptions } = getStudentSourceOptions([
    ...exams,
    ...attempts,
    ...(summary.source_breakdown ?? []),
    ...(summary.recent_exams ?? []),
  ]);
  const selectedTeacherId = resolveSelectedStudentSourceTeacher(
    teacherOptions,
    selectedSource,
    query.teacher ??
      cookieStore.get(STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE)?.value ??
      null,
  );

  const scopedSummary = filterStudentSummaryBySubject(
    filterStudentSummaryBySource(summary, selectedSource, selectedTeacherId),
    selectedSubject,
  );
  const practiceExams = filterStudentExamsBySubject(
    filterStudentRecordsBySource(
      exams.filter((exam) => exam.exam_type === "practice"),
      selectedSource,
      selectedTeacherId,
    ),
    selectedSubject,
  );
  const topWeakTopic = scopedSummary.weak_topics[0] ?? null;
  const topWeakSubject = scopedSummary.weakest_subjects[0] ?? null;
  const topWeakQuestionType = scopedSummary.weak_question_types[0] ?? null;
  const focusRecommendation = resolvePracticeFocusRecommendation({
    exams: practiceExams,
    subjectName: topWeakTopic?.subject_name ?? topWeakSubject?.subject_name ?? null,
    topicName: topWeakTopic?.topic_name ?? null,
  });

  const recommendationRows: StudentPracticeRecommendationRow[] = practiceExams
    .slice(0, 6)
    .map((exam) => {
      const latestAttemptId = latestAttemptForExam(attempts, exam.id)?.id ?? null;
      const canResume = Boolean(exam.active_attempt?.id) && exam.can_resume;
      const canStart = exam.can_start && !canResume;
      const hasAttemptHistory = Boolean(latestAttemptId);

      return {
        id: exam.id,
        title: exam.title,
        code: exam.code,
        subjectLabel: getExamSubjectDisplayLabel(exam) || "General",
        recommendationReason: canResume
          ? "Resume available"
          : canStart
            ? "Ready to start"
            : exam.review_available && hasAttemptHistory
              ? "Review available"
              : "Follow-up option",
        durationLabel: `${exam.duration_minutes}m`,
        availabilityLabel: exam.can_resume
          ? "Resume"
          : exam.can_start
            ? "Ready now"
            : titleCaseState(exam.availability_state),
        accessLabel: exam.economy_access.requires_unlock
          ? exam.economy_access.is_unlocked
            ? "Unlocked"
            : exam.economy_access.can_unlock_with_stars
              ? `${exam.economy_access.star_cost} stars`
              : "Restricted"
          : "Free",
        actionLabel: canResume
          ? "Resume Practice"
          : canStart
            ? "Start Practice"
            : exam.review_available && hasAttemptHistory
              ? "Review Practice"
              : "View Details",
        toneClass: canResume || canStart ? "statusLive" : "statusDemo",
        sourceLabel: exam.source_label,
        supportNote: topWeakTopic
          ? `${topWeakTopic.topic_name} is the current strongest recovery target in your academic signal.`
          : "This recommendation is being packaged from your current live student scope.",
        guidance: focusRecommendation.helper,
        primaryHref: canResume && exam.active_attempt?.id
          ? `/app/attempts/${exam.active_attempt.id}`
          : latestAttemptId && exam.review_available
            ? `/app/attempts/${latestAttemptId}/review`
            : `/app/exams/${exam.id}`,
        detailHref: `/app/exams/${exam.id}`,
        weakAreasHref: "/app/weak-areas",
        resultsHref: "/app/results",
      };
    });

  return (
    <div className="studentPage studentDashboardModern">
      <StudentPageHeader
        eyebrow="AI study recommendations"
        title="AI Study Recommendations"
        description="A packaged recommendation view that turns weak topics, risky formats, and practice readiness into one student-facing next-step report."
        statusLabel={`${recommendationRows.length} recommendation rows`}
        statusTone="live"
        action={
          <Link className="button buttonGhost" href="/app/analytics">
            Back to Analytics
          </Link>
        }
      />

      <StudentReportFilters
        basePath="/app/analytics/study-recommendations"
        title="Recommendation filters"
        helper="Scope recommendations by subject and source so suggested follow-up practice matches the student context you are reviewing."
        selectedSource={selectedSource}
        selectedSubject={selectedSubject}
        selectedTeacherId={selectedTeacherId}
        subjectOptions={subjectOptions}
        teacherOptions={teacherOptions}
      />

      <StudentAnalyticsDetailHero
        eyebrow="Recommendation snapshot"
        title={focusRecommendation.focusLabel}
        description={focusRecommendation.helper}
        badges={[
          topWeakTopic
            ? `${topWeakTopic.subject_name} · ${topWeakTopic.topic_name}`
            : "Weak topic pending",
          topWeakQuestionType
            ? questionTypeLabel(topWeakQuestionType.question_type)
            : "Format signal pending",
          trendDirectionLabel(scopedSummary.improvement_trend.direction),
        ]}
        stats={[
          { label: "Weak topics", value: String(scopedSummary.weak_topics.length) },
          { label: "Risky formats", value: String(scopedSummary.weak_question_types.length) },
          { label: "Practice sets", value: String(practiceExams.length) },
          { label: "Average score", value: percentageLabel(scopedSummary.average_percentage) },
        ]}
        actions={
          <>
            <Link className="button buttonPrimary" href="/app/practice">
              Open Practice Report
            </Link>
            <Link
              className="button buttonSecondary"
              href={buildAnalyticsTimelineHref({
                subject: selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubject,
                source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                teacher: selectedTeacherId,
              })}
            >
              Open Timeline
            </Link>
          </>
        }
      />

      <StudentKpiGrid
        items={[
          {
            label: "Primary Topic",
            value: topWeakTopic?.topic_name ?? "Pending",
            note: topWeakTopic
              ? `${percentageLabel(topWeakTopic.average_percentage)} in ${topWeakTopic.subject_name}`
              : "Weak-topic signal will appear here",
            tone: "primary",
          },
          {
            label: "Weakest Subject",
            value: topWeakSubject?.subject_name ?? "Pending",
            note: topWeakSubject
              ? `${percentageLabel(topWeakSubject.average_percentage)} current average`
              : "Subject signal will appear here",
          },
          {
            label: "Riskiest Format",
            value: topWeakQuestionType
              ? questionTypeLabel(topWeakQuestionType.question_type)
              : "Pending",
            note: topWeakQuestionType
              ? `${topWeakQuestionType.wrong_count} wrong · ${topWeakQuestionType.skipped_count} skipped`
              : "Question-type signal will appear here",
          },
          {
            label: "Recommendation Lane",
            value: focusRecommendation.laneLabel,
            note: "Live practice follow-up selected from current insight signals",
          },
        ]}
      />

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Why this is recommended</strong>
            <span>Current academic signals</span>
          </div>
          <div className="analyticsChecklist">
            <div className="analyticsChecklistItem">
              <strong>Weakest topic first</strong>
              <span>
                {topWeakTopic
                  ? `${topWeakTopic.topic_name} is currently the lowest visible topic in ${topWeakTopic.subject_name}.`
                  : "Weak-topic prioritization will appear here after more scored work is available."}
              </span>
            </div>
            <div className="analyticsChecklistItem">
              <strong>Format risk next</strong>
              <span>
                {topWeakQuestionType
                  ? `${questionTypeLabel(topWeakQuestionType.question_type)} is the most error-prone format in the current scope.`
                  : "Question-format prioritization will appear here when enough question analytics exist."}
              </span>
            </div>
            <div className="analyticsChecklistItem">
              <strong>Trend context matters</strong>
              <span>
                Recommendation urgency is being read alongside your current{" "}
                {trendDirectionLabel(scopedSummary.improvement_trend.direction).toLowerCase()} trend.
              </span>
            </div>
          </div>
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Recommended next routes</strong>
            <span>Drilldowns and follow-up</span>
          </div>
          <div className="studentInsightHeroActions">
            <Link className="button buttonPrimary" href="/app/weak-areas">
              Open Topic Mastery
            </Link>
            <Link className="button buttonSecondary" href="/app/analytics/actions">
              Open Action Center
            </Link>
            <Link className="button buttonGhost" href="/app/analytics/wrong-questions">
              Open Wrong Questions Report
            </Link>
          </div>
        </article>
      </section>

      <section className="studentResultsGroupedSection">
        <div className="sectionHeading">
          <strong>Recommendation ledger</strong>
          <span>{recommendationRows.length} packaged recommendations</span>
        </div>
        <StudentPracticeRecommendationReport
          rows={recommendationRows}
          groupLabel="Practice-backed study recommendations"
        />
      </section>
    </div>
  );
}
