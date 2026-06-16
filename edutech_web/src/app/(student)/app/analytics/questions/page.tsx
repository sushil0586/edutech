import Link from "next/link";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import {
  StudentAnalyticsDetailHero,
  StudentQuestionInsightList,
} from "@/components/ui/student-analytics-detail";
import { fetchStudentQuestionAnalytics, getStudentApiState } from "@/lib/api/student";
import {
  buildAnalyticsQuestionTypeHref,
  buildAnalyticsSubjectHref,
  buildAnalyticsTopicHref,
} from "@/lib/student/analytics";
import { percentageLabel, questionTypeLabel, titleCaseState } from "@/lib/student/formatters";

export default async function StudentQuestionAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{
    subject?: string;
    topic?: string;
    question_type?: string;
    source?: string;
    teacher?: string;
  }>;
}) {
  const params = await searchParams;
  const state = getStudentApiState();

  if (!state.apiConfigured) {
    return (
      <div className="studentPage studentDashboardModern">
        <StudentStatePanel
          eyebrow="Setup required"
          title="Question analytics are waiting for backend data"
          description="This drill-down page only works with the live student analytics API."
          bullets={["Student question analytics endpoint", "Active student session", "Published results"]}
          ctaHref="/app/analytics"
          ctaLabel="Back to Analytics"
          statusLabel="Configuration required"
        />
      </div>
    );
  }

  let data = null;
  try {
    data = await fetchStudentQuestionAnalytics({
      subject: params.subject ?? null,
      topic: params.topic ?? null,
      question_type: params.question_type ?? null,
      source: params.source ?? null,
      teacher: params.teacher ?? null,
    });
  } catch {
    data = null;
  }

  const titleParts = [
    params.subject?.trim() || null,
    params.question_type ? questionTypeLabel(params.question_type) : null,
  ].filter(Boolean);
  const title = titleParts.length ? `${titleParts.join(" · ")} Question Analytics` : "Question Analytics";
  const wrongCount = data?.questions.filter((item) => item.your_result === "wrong").length ?? 0;
  const skippedCount = data?.questions.filter((item) => item.your_result === "skipped").length ?? 0;
  const averageTime = data?.questions.length
    ? Math.round(
        data.questions.reduce(
          (total, item) => total + item.your_time_spent_seconds,
          0,
        ) / data.questions.length,
      )
    : 0;
  const activeFilterCount = [
    params.subject,
    params.topic,
    params.question_type,
    params.source,
    params.teacher,
  ].filter(Boolean).length;

  return (
    <div className="studentPage studentDashboardModern">
      <StudentPageHeader
        eyebrow="Question drill-down"
        title={title}
        description="Review real question-level outcomes, understand where marks are being lost, and move directly into a narrower analytics view when needed."
        statusLabel={data ? `${data.questions.length} questions analyzed` : "Unable to load question analytics"}
        statusTone={data ? "live" : "demo"}
        action={<Link className="button buttonGhost" href="/app/analytics">Back to Analytics</Link>}
      />

      {!data ? (
        <StudentStatePanel
          eyebrow="Load issue"
          title="Question analytics could not be loaded"
          description="The drill-down page depends on the question analytics contract and available scored answers."
          bullets={["Question analytics endpoint", "Published student results", "Backend connectivity"]}
          ctaHref="/app/analytics"
          ctaLabel="Back to Analytics"
          statusLabel="Retry after backend check"
        />
      ) : (
        <>
          <StudentAnalyticsDetailHero
            eyebrow="Question evidence"
            title={params.question_type ? questionTypeLabel(params.question_type) : "All tracked questions"}
            description={
              params.topic
                ? "This view is scoped to a topic and optionally a question type, so students can validate whether a specific pattern is repeatedly causing losses."
                : "This view shows the actual question-level evidence behind the analytics summary, including outcomes, time spent, and anonymous peer benchmarks."
            }
            badges={[
              params.subject ?? "All subjects",
              params.source ? `Source · ${titleCaseState(params.source)}` : "All sources",
              params.topic ? "Topic scoped" : "All tracked topics",
            ]}
            stats={[
              {
                label: "Filters",
                value: String(activeFilterCount || 1),
              },
              {
                label: "Wrong",
                value: String(wrongCount),
              },
              {
                label: "Skipped",
                value: String(skippedCount),
              },
              {
                label: "Average time",
                value: `${averageTime}s`,
              },
            ]}
            actions={
              <>
                <Link className="button buttonPrimary" href="/app/analytics">
                  Analytics Home
                </Link>
                <Link className="button buttonSecondary" href="/app/analytics/questions">
                  Reset Filters
                </Link>
              </>
            }
          />

          <section className="contentCard">
            <div className="sectionHeading">
              <strong>Active Filters</strong>
              <Link href="/app/analytics/questions">Clear filters</Link>
            </div>
            <div className="studentInsightHeroActions">
              {params.subject ? (
                <Link
                  className="studentDashboardMiniBadge"
                  href={buildAnalyticsSubjectHref(params.subject, {
                    source: params.source ?? null,
                    teacher: params.teacher ?? null,
                  })}
                >
                  Subject: {params.subject}
                </Link>
              ) : null}
              {params.question_type ? (
                <Link
                  className="studentDashboardMiniBadge"
                  href={buildAnalyticsQuestionTypeHref({
                    questionType: params.question_type,
                    subject: params.subject ?? null,
                    source: params.source ?? null,
                    teacher: params.teacher ?? null,
                  })}
                >
                  Type: {questionTypeLabel(params.question_type)}
                </Link>
              ) : null}
              {params.topic ? (
                <Link
                  className="studentDashboardMiniBadge"
                  href={buildAnalyticsTopicHref({
                    topicId: params.topic,
                    subject: params.subject ?? null,
                    source: params.source ?? null,
                    teacher: params.teacher ?? null,
                  })}
                >
                  Topic drill-down
                </Link>
              ) : null}
              {params.source ? (
                <span className="studentDashboardMiniBadge">
                  Source: {titleCaseState(params.source)}
                </span>
              ) : null}
              {params.teacher ? (
                <span className="studentDashboardMiniBadge">Teacher scoped</span>
              ) : null}
              {!activeFilterCount ? (
                <span className="studentDashboardMiniBadge">Overall question view</span>
              ) : null}
            </div>
          </section>

          <StudentKpiGrid
            items={[
              {
                label: "Questions Tracked",
                value: String(data.overview.question_count),
                note: "Questions matching the current filters",
                tone: "primary",
              },
              {
                label: "Your Attempts",
                value: String(data.overview.attempted_count),
                note: `${data.overview.skipped_count} skipped`,
              },
              {
                label: "Correct Answers",
                value: String(data.overview.correct_count),
                note: `${data.overview.wrong_count} wrong`,
              },
              {
                label: "Benchmark Scopes",
                value: String(data.benchmark_overview.length),
                note: "Anonymous peer comparison groups",
              },
            ]}
          />

          <section className="studentInsightsTwoColumn">
            <article className="contentCard">
              <div className="sectionHeading">
                <strong>Benchmark snapshot</strong>
                <span>{data.benchmark_overview.length} scopes</span>
              </div>
              <div className="studentTopicStack">
                {data.benchmark_overview.length ? (
                  data.benchmark_overview.map((benchmark) => (
                    <div className="studentTopicRow" key={benchmark.scope}>
                      <div>
                        <strong>{benchmark.label}</strong>
                        <span>{benchmark.participant_count} peer results</span>
                      </div>
                      <div className="studentTopicRowMeta">
                        <strong>{percentageLabel(benchmark.average_percentage)} peer average</strong>
                        <span>{percentageLabel(benchmark.accuracy_percentage)} peer accuracy</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="emptyText">Benchmark comparisons will appear when matching peer data is available.</p>
                )}
              </div>
            </article>

            <article className="contentCard">
              <div className="sectionHeading">
                <strong>Use this page well</strong>
                <span>Recommended checks</span>
              </div>
              <div className="analyticsChecklist">
                <div className="analyticsChecklistItem">
                  <strong>Question truthfulness</strong>
                  <span>Expand any item and confirm the summary, full text, explanation, and benchmark rows all describe the same question.</span>
                </div>
                <div className="analyticsChecklistItem">
                  <strong>Filter continuity</strong>
                  <span>Open subject, topic, and type views from an expanded question and make sure the next page stays aligned with the current context.</span>
                </div>
                <div className="analyticsChecklistItem">
                  <strong>Public-facing quality</strong>
                  <span>Check that the first screen reads cleanly before opening any detail card, with no broken alignment or empty dead space.</span>
                </div>
              </div>
            </article>
          </section>

          <section className="contentCard">
            <div className="sectionHeading">
              <strong>Question Evidence</strong>
              <span>{data.questions.length} items</span>
            </div>
            <StudentQuestionInsightList
              questions={data.questions}
              subject={params.subject ?? null}
              source={params.source ?? null}
              teacher={params.teacher ?? null}
              currentView="questions"
              currentTopicId={params.topic ?? null}
              currentQuestionType={params.question_type ?? null}
            />
          </section>
        </>
      )}
    </div>
  );
}
