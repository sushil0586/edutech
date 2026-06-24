import Link from "next/link";
import { FilterSummaryPills } from "@/components/ui/filter-summary-pills";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { TeacherPageHeader } from "@/components/ui/teacher-page-header";
import type { StudentExamExperienceProfile } from "@/features/dashboard/types";
import {
  fetchTeacherInsightSummary,
  getTeacherApiState,
} from "@/lib/api/teacher";
import { buildFilterHref, formatFilterValue, resolveFilterValue } from "@/lib/workspace/filter-utils";

type TeacherDashboardLane = "all" | "delivery" | "weak_topics" | "students" | "questions";
type TeacherDashboardSortOption =
  | "recommended"
  | "score_low"
  | "score_high"
  | "attempts_high"
  | "wrong_high";

function percentage(value: string) {
  return `${Math.round(Number(value))}%`;
}

function resolveDashboardLane(value?: string): TeacherDashboardLane {
  return resolveFilterValue(value, ["delivery", "weak_topics", "students", "questions"], "all");
}

function resolveDashboardSortOption(value?: string): TeacherDashboardSortOption {
  return resolveFilterValue(value, ["score_low", "score_high", "attempts_high", "wrong_high"], "recommended");
}

function buildTeacherDashboardHref(args: {
  lane?: TeacherDashboardLane;
  sort?: TeacherDashboardSortOption;
  subject?: string;
}) {
  return buildFilterHref("/teacher/dashboard", [
    ["lane", args.lane, "all"],
    ["sort", args.sort, "recommended"],
    ["subject", args.subject, "all"],
  ]);
}

function formatDuration(seconds: number) {
  if (!seconds) return "0m";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function formatCompactSeconds(seconds: number) {
  if (!seconds || seconds <= 0) return "0s";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return formatDuration(seconds);
}

function assessmentFamilyTone(assessmentFamily: string | null | undefined) {
  if (assessmentFamily === "competitive") return "statusWarning";
  if (assessmentFamily === "certification") return "statusLive";
  if (assessmentFamily === "language_proficiency") return "statusDemo";
  return "statusLive";
}

function normalizeLabel(value: string | null | undefined) {
  return value?.replaceAll("_", " ") ?? "";
}

function summarizeAssessmentFamily(profile: StudentExamExperienceProfile | null | undefined) {
  const familyCode = profile?.assessment_family ?? "general";
  const familyLabel = profile?.assessment_family_label ?? "General";
  const deliveryEmphasis = normalizeLabel(profile?.delivery_emphasis) || "balanced delivery";
  const summaryMap: Record<string, string> = {
    school: "Focus on concept mastery, chapter coverage, and which learners need reteaching next.",
    competitive: "Focus on speed, accuracy, rank pressure, and negative-marking decisions.",
    certification: "Focus on domain readiness, scenario judgment, and distractor quality.",
    language_proficiency: "Focus on skill bands, rubric evidence, and media-backed delivery quality.",
    general: "Focus on accuracy, topic mastery, and question-level risk.",
  };
  return {
    familyCode,
    familyLabel,
    deliveryEmphasis,
    summary: summaryMap[familyCode] ?? summaryMap.general,
  };
}

async function loadTeacherDashboard() {
  const state = getTeacherApiState();

  if (!state.apiConfigured) {
    return {
      source: "unconfigured" as const,
      summary: null,
    };
  }

  try {
    const summary = await fetchTeacherInsightSummary();

    return {
      source: "live" as const,
      summary,
    };
  } catch {
    return {
      source: "error" as const,
      summary: null,
    };
  }
}

export default async function TeacherDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ lane?: string; sort?: string; subject?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const { source, summary } = await loadTeacherDashboard();
  const lane = resolveDashboardLane(params.lane);
  const sortOption = resolveDashboardSortOption(params.sort);
  const subjectFilter = params.subject?.trim() || "all";
  const weakTopicSubjects = Array.from(
    new Set((summary?.weak_topics ?? []).map((topic) => topic.subject_name).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));

  const visibleExamOverview = [...(summary?.exam_overview ?? [])].sort((left, right) => {
    switch (sortOption) {
      case "score_low":
        return Number(left.average_percentage) - Number(right.average_percentage);
      case "score_high":
        return Number(right.average_percentage) - Number(left.average_percentage);
      case "attempts_high":
      case "wrong_high":
        return right.total_attempted - left.total_attempted;
      case "recommended":
      default:
        return Number(right.average_percentage) - Number(left.average_percentage);
    }
  });

  const visibleWeakTopics = (summary?.weak_topics ?? [])
    .filter((topic) => (subjectFilter === "all" ? true : topic.subject_name === subjectFilter))
    .sort((left, right) => {
      switch (sortOption) {
        case "attempts_high":
        case "wrong_high":
          return right.attempted_questions - left.attempted_questions;
        case "score_high":
          return Number(right.average_percentage) - Number(left.average_percentage);
        case "score_low":
        case "recommended":
        default:
          return Number(left.average_percentage) - Number(right.average_percentage);
      }
    });

  const visibleHighPerformers = [...(summary?.high_performing_students ?? [])].sort((left, right) => {
    switch (sortOption) {
      case "score_low":
        return Number(left.average_percentage) - Number(right.average_percentage);
      case "attempts_high":
      case "wrong_high":
      case "score_high":
      case "recommended":
      default:
        return Number(right.average_percentage) - Number(left.average_percentage);
    }
  });

  const visibleWrongQuestions = [...(summary?.most_wrong_questions ?? [])]
    .filter((question) => (subjectFilter === "all" ? true : (question.subject_name ?? "Unknown subject") === subjectFilter))
    .sort((left, right) => {
      switch (sortOption) {
        case "score_low":
        case "score_high":
        case "attempts_high":
          return right.total_attempts - left.total_attempts;
        case "wrong_high":
        case "recommended":
        default:
          return right.wrong_count - left.wrong_count;
      }
    });
  const familyCounts = visibleExamOverview.reduce<Record<string, { label: string; count: number }>>((acc, exam) => {
    const label = exam.experience_profile?.assessment_family_label ?? "General";
    const code = exam.experience_profile?.assessment_family ?? "general";
    acc[code] = {
      label,
      count: (acc[code]?.count ?? 0) + 1,
    };
    return acc;
  }, {});
  const dominantFamilyEntry =
    Object.entries(familyCounts)
      .sort((left, right) => right[1].count - left[1].count || left[1].label.localeCompare(right[1].label))[0] ?? null;
  const dominantFamilyProfile = visibleExamOverview.find(
    (exam) => (exam.experience_profile?.assessment_family ?? "general") === (dominantFamilyEntry?.[0] ?? ""),
  )?.experience_profile;
  const dominantFamilySummary = summarizeAssessmentFamily(dominantFamilyProfile);
  const aggregateScoreDistribution = visibleExamOverview.reduce<
    Array<{ label: string; count: number }>
  >((acc, exam) => {
    for (const bucket of exam.score_distribution ?? []) {
      const current = acc.find((item) => item.label === bucket.label);
      if (current) {
        current.count += bucket.count;
      } else {
        acc.push({ label: bucket.label, count: bucket.count });
      }
    }
    return acc;
  }, []);
  const totalDistributionCount = aggregateScoreDistribution.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="studentPage studentDashboardModern teacherConsolePage teacherDashboardPageVivid">
      <TeacherPageHeader
        title="Delivery Dashboard"
        description="Track the current exam pipeline, student attempt activity, and weak learning signals from your scoped backend data."
        statusLabel={
          source === "live"
            ? `${summary?.overview.tracked_exams ?? 0} exams in scope`
            : source === "unconfigured"
              ? "Backend not configured"
              : "Unable to load teacher data"
        }
        statusTone={
          source === "live"
            ? "live"
            : source === "unconfigured"
              ? "warning"
              : "demo"
        }
      />

      {!summary ? (
        <StudentStatePanel
          eyebrow={source === "unconfigured" ? "Setup required" : "Load issue"}
          title={
            source === "unconfigured"
              ? "Waiting for teacher insights"
              : "Teacher workspace could not be loaded"
          }
          description={
            source === "unconfigured"
              ? "Configure the API base URL and sign in with an active teacher account to load exam delivery and analytics data."
              : "The teacher dashboard depends on live exam and insight endpoints, and the current request did not complete successfully."
          }
          bullets={
            source === "unconfigured"
              ? ["Teacher insights summary endpoint", "Teacher exams endpoint"]
              : ["Backend connectivity", "Teacher-scoped exam endpoints"]
          }
          ctaHref="/login"
          ctaLabel="Back to Login"
          statusLabel={source === "unconfigured" ? "Configuration required" : "Retry after backend check"}
        />
      ) : (
        <>
          <section className="studentInsightHeroCard studentInsightHeroCardCompact">
            <div className="studentInsightHeroCopy">
              <span className="studentDashboardTag">Teaching Overview</span>
              <strong>Keep delivery, outcomes, and intervention signals in one workspace</strong>
              <p>
                This dashboard stays connected to your teacher-scoped backend data so exam movement,
                weak learning patterns, and performance trends remain visible without switching tools.
              </p>
              <small>
                {summary.overview.tracked_exams} tracked exams · {summary.overview.total_attempts} learner attempts · {summary.overview.pending_review_tasks} review tasks waiting
              </small>
              <div className="questionBankTagRow">
                <span className={`statusPill ${assessmentFamilyTone(dominantFamilySummary.familyCode)}`}>
                  {dominantFamilySummary.familyLabel} dominant
                </span>
                <span className="questionBankTagChip">{dominantFamilySummary.deliveryEmphasis}</span>
              </div>
            </div>
            <div className="studentInsightHeroActions">
              <Link className="button buttonPrimary" href="/teacher/exams">
                Open Exams
              </Link>
              <Link className="button buttonSecondary" href="/teacher/results">
                Open Results
              </Link>
              <Link className="button buttonGhost" href="/teacher/reviews">
                Open Reviews
              </Link>
            </div>
          </section>

          <section className="resultsSummaryGrid">
            <article className="metricCard metricCardPrimary dashboardHeroCard">
              <span>Tracked Exams</span>
              <strong>{summary.overview.tracked_exams}</strong>
              <small>{summary.exam_overview.length} recent exam summaries available</small>
            </article>

            <article className="metricCard dashboardHeroCard">
              <span>Total Attempts</span>
              <strong>{summary.overview.total_attempts}</strong>
              <small>{percentage(summary.overview.accuracy_percentage)} overall answer accuracy</small>
            </article>

            <article className="metricCard dashboardHeroCard">
              <span>Average Score</span>
              <strong>{percentage(summary.overview.average_percentage)}</strong>
              <small>{formatDuration(summary.overview.average_time_taken_seconds)} average completion time</small>
            </article>

            <article className="metricCard dashboardHeroCard">
              <span>Pending Reviews</span>
              <strong>{summary.review_summary.pending_tasks}</strong>
              <small>
                {summary.review_summary.blocked_exams} blocked exam(s) · {summary.review_summary.recheck_requested_tasks} recheck task(s) are back in the queue
              </small>
            </article>

            <article className="metricCard dashboardHeroCard">
              <span>Assessment lens</span>
              <strong>{dominantFamilySummary.familyLabel}</strong>
              <small>{dominantFamilySummary.summary}</small>
            </article>
          </section>

          <section className="contentCard workspaceFiltersCard">
            <div className="sectionHeading">
              <strong>Dashboard Controls</strong>
              <span>
                {visibleExamOverview.length} exam summaries · {visibleWeakTopics.length} weak topics
              </span>
            </div>
            <form className="workspaceFiltersForm" method="GET">
              <label className="workspaceFilterField">
                <span>Focus lane</span>
                <select defaultValue={lane} name="lane">
                  <option value="all">All lanes</option>
                  <option value="delivery">Delivery</option>
                  <option value="weak_topics">Weak topics</option>
                  <option value="students">Students</option>
                  <option value="questions">Questions</option>
                </select>
              </label>
              <label className="workspaceFilterField">
                <span>Subject</span>
                <select defaultValue={subjectFilter} name="subject">
                  <option value="all">All subjects</option>
                  {weakTopicSubjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </label>
              <label className="workspaceFilterField">
                <span>Sort by</span>
                <select defaultValue={sortOption} name="sort">
                  <option value="recommended">Recommended order</option>
                  <option value="score_low">Lowest score first</option>
                  <option value="score_high">Highest score first</option>
                  <option value="attempts_high">Most attempts</option>
                  <option value="wrong_high">Most wrong signals</option>
                </select>
              </label>
              <div className="workspaceFilterActions">
                <button className="button buttonPrimary" type="submit">
                  Apply filters
                </button>
                <Link className="button buttonSecondary" href="/teacher/dashboard">
                  Reset filters
                </Link>
              </div>
            </form>
            <div className="workspaceFilterQuickRow">
              <span className="workspaceFilterQuickLabel">Quick filters</span>
              <div className="workspaceFilterQuickChips">
                {[
                  { label: "All", href: buildTeacherDashboardHref({}), active: lane === "all" && sortOption === "recommended" && subjectFilter === "all" },
                  { label: "Delivery Risk", href: buildTeacherDashboardHref({ lane: "delivery", sort: "attempts_high", subject: subjectFilter }), active: lane === "delivery" && sortOption === "attempts_high" },
                  { label: "Weakest Topics", href: buildTeacherDashboardHref({ lane: "weak_topics", sort: "score_low", subject: subjectFilter }), active: lane === "weak_topics" && sortOption === "score_low" },
                  { label: "Top Students", href: buildTeacherDashboardHref({ lane: "students", sort: "score_high", subject: subjectFilter }), active: lane === "students" && sortOption === "score_high" },
                  { label: "Wrong Questions", href: buildTeacherDashboardHref({ lane: "questions", sort: "wrong_high", subject: subjectFilter }), active: lane === "questions" && sortOption === "wrong_high" },
                ].map((chip) => (
                  <Link
                    key={chip.label}
                    className={`workspaceQuickChip${chip.active ? " workspaceQuickChipActive" : ""}`}
                    href={chip.href}
                  >
                    {chip.label}
                  </Link>
                ))}
              </div>
            </div>
            <FilterSummaryPills
              items={[
                { label: "Lane", value: formatFilterValue(lane) },
                { label: "Subject", value: subjectFilter },
                { label: "Sort", value: formatFilterValue(sortOption) },
              ]}
            />
          </section>

          {lane === "all" || lane === "delivery" || lane === "weak_topics" ? (
          <section className="dashboardGrid">
            <article className="dashboardPanel">
              <div className="sectionHeading">
                <strong>Exam Delivery Snapshot</strong>
                <Link href="/teacher/exams">Open exams</Link>
              </div>
              <div className="weakTopicStack">
                {visibleExamOverview.length ? (
                  visibleExamOverview.map((exam) => (
                    <div className="weakTopicRow" key={exam.exam_id}>
                      <div>
                        <strong>{exam.exam_title}</strong>
                        <span>{exam.exam_code}</span>
                        <div className="questionBankTagRow">
                          <span className={`statusPill ${assessmentFamilyTone(exam.experience_profile?.assessment_family)}`}>
                            {exam.experience_profile?.assessment_family_label ?? "General"}
                          </span>
                          <span className="questionBankTagChip">
                            {normalizeLabel(exam.experience_profile?.delivery_emphasis) || "balanced delivery"}
                          </span>
                          {exam.section_performance?.length ? (
                            <span className="questionBankTagChip">
                              Weakest section:{" "}
                              {
                                exam.section_performance
                                  .slice()
                                  .sort((left, right) => left.accuracy_percentage - right.accuracy_percentage)[0]
                                  ?.section_name
                              }
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="weakTopicMeta">
                        <strong>{percentage(exam.average_percentage)}</strong>
                        <span>{exam.total_attempted} attempts</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="emptyText">Teacher exam summaries will appear here after exam activity is recorded.</p>
                )}
              </div>
            </article>

            <article className="dashboardPanel weakTopicsPanel">
              <div className="sectionHeading">
                <strong>Assessment Family Lens</strong>
                <span>{Object.keys(familyCounts).length} family profiles</span>
              </div>
              <div className="weakTopicStack">
                {Object.entries(familyCounts).length ? (
                  Object.entries(familyCounts)
                    .sort((left, right) => right[1].count - left[1].count || left[1].label.localeCompare(right[1].label))
                    .map(([code, item]) => (
                      <div className="weakTopicRow" key={code}>
                        <div>
                          <strong>{item.label}</strong>
                          <span>{summarizeAssessmentFamily(
                            visibleExamOverview.find(
                              (exam) => (exam.experience_profile?.assessment_family ?? "general") === code,
                            )?.experience_profile,
                          ).summary}</span>
                        </div>
                        <div className="weakTopicMeta">
                          <strong>{item.count}</strong>
                          <span>exam{item.count === 1 ? "" : "s"} in scope</span>
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="emptyText">Assessment-family guidance will appear once tracked exam summaries are available.</p>
                )}
              </div>
            </article>

            <article className="dashboardPanel weakTopicsPanel">
              <div className="sectionHeading">
                <strong>Cohort distribution</strong>
                <span>{totalDistributionCount} result rows</span>
              </div>
              <div className="weakTopicStack">
                {aggregateScoreDistribution.length ? (
                  aggregateScoreDistribution.map((bucket) => (
                    <div className="weakTopicRow" key={bucket.label}>
                      <div>
                        <strong>{bucket.label}</strong>
                        <span>
                          {totalDistributionCount > 0
                            ? `${Math.round((bucket.count / totalDistributionCount) * 100)}% of visible result rows`
                            : "No visible result rows"}
                        </span>
                      </div>
                      <div className="weakTopicMeta">
                        <strong>{bucket.count}</strong>
                        <span>learner results</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="emptyText">Score-distribution insights will appear once exam summaries are available.</p>
                )}
              </div>
            </article>

            <article className="dashboardPanel weakTopicsPanel">
              <div className="sectionHeading">
                <strong>Weak Topics Across Learners</strong>
                <span>{visibleWeakTopics.length} tracked</span>
              </div>
              <div className="weakTopicStack">
                {visibleWeakTopics.length ? (
                  visibleWeakTopics.map((topic) => (
                    <div className="weakTopicRow" key={`${topic.subject_name}-${topic.topic_name ?? "none"}`}>
                      <div>
                        <strong>{topic.topic_name ?? "Untagged topic"}</strong>
                        <span>{topic.subject_name}</span>
                      </div>
                      <div className="weakTopicMeta">
                        <strong>{percentage(topic.average_percentage)}</strong>
                        <span>{topic.attempted_questions} questions attempted</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="emptyText">Weak topic signals will appear after students submit attempts.</p>
                )}
              </div>
            </article>
          </section>
          ) : null}

          {lane === "all" || lane === "students" || lane === "questions" ? (
          <section className="dashboardLowerGrid">
            <article className="dashboardPanel weakTopicsPanel">
              <div className="sectionHeading">
                <strong>Top Performing Students</strong>
                <span>{visibleHighPerformers.length} ranked</span>
              </div>
              <div className="weakTopicStack">
                {visibleHighPerformers.length ? (
                  visibleHighPerformers.map((student) => (
                    <div className="weakTopicRow" key={student.student_id}>
                      <div>
                        <strong>{student.student_name}</strong>
                        <span>{student.admission_no}</span>
                      </div>
                      <div className="weakTopicMeta">
                        <strong>{percentage(student.average_percentage)}</strong>
                        <span>Average result</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="emptyText">High-performing students will be ranked once result summaries are available.</p>
                )}
              </div>
            </article>

            <article className="dashboardPanel weakTopicsPanel">
              <div className="sectionHeading">
                <strong>Section pressure highlights</strong>
                <span>{visibleExamOverview.length} exam summaries</span>
              </div>
              <div className="weakTopicStack">
                {visibleExamOverview.some((exam) => exam.section_performance?.length) ? (
                  visibleExamOverview
                    .filter((exam) => exam.section_performance?.length)
                    .map((exam) => {
                      const weakestSection = exam.section_performance
                        .slice()
                        .sort((left, right) => left.accuracy_percentage - right.accuracy_percentage)[0];
                      return (
                        <div className="weakTopicRow" key={`${exam.exam_id}-section`}>
                          <div>
                            <strong>{weakestSection?.section_name ?? "No section"}</strong>
                            <span>{exam.exam_title}</span>
                          </div>
                          <div className="weakTopicMeta">
                            <strong>{Math.round(weakestSection?.accuracy_percentage ?? 0)}%</strong>
                            <span>avg time {formatCompactSeconds(weakestSection?.average_time_seconds ?? 0)}</span>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <p className="emptyText">Section pressure indicators will appear when section-level summaries are available.</p>
                )}
              </div>
            </article>

            <article className="dashboardPanel weakTopicsPanel">
              <div className="sectionHeading">
                <strong>Most Wrong Questions</strong>
                <span>{visibleWrongQuestions.length} tracked</span>
              </div>
              <div className="weakTopicStack">
                {visibleWrongQuestions.length ? (
                  visibleWrongQuestions.map((question) => (
                    <div className="weakTopicRow" key={question.question_id}>
                      <div>
                        <strong>{question.question_text_summary}</strong>
                        <span>
                          {question.subject_name ?? "Unknown subject"}
                          {question.topic_name ? ` · ${question.topic_name}` : ""}
                        </span>
                      </div>
                      <div className="weakTopicMeta">
                        <strong>{question.wrong_count}</strong>
                        <span>{question.total_attempts} total attempts</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="emptyText">Question-level performance will appear here after learner attempts accumulate.</p>
                )}
              </div>
            </article>
          </section>
          ) : null}
        </>
      )}
    </div>
  );
}
