import Link from "next/link";
import { ParentChildSwitcher } from "@/components/parent/parent-child-switcher";
import { ParentPageHeader } from "@/components/ui/parent-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import {
  fetchParentChildren,
  fetchParentProgress,
  getParentApiState,
} from "@/lib/api/parent";
import {
  formatDateTime,
  percentageLabel,
  trendDirectionLabel,
} from "@/lib/parent/formatters";

async function loadParentProgress(childId?: string) {
  const state = getParentApiState();

  if (!state.apiConfigured) {
    return {
      source: "unconfigured" as const,
      children: [],
      progress: null,
    };
  }

  try {
    const [children, progress] = await Promise.all([
      fetchParentChildren(),
      fetchParentProgress(childId),
    ]);

    return {
      source: "live" as const,
      children,
      progress,
    };
  } catch {
    return {
      source: "error" as const,
      children: [],
      progress: null,
    };
  }
}

export default async function ParentProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ child_id?: string }>;
}) {
  const { child_id: childId } = await searchParams;
  const { source, children, progress } = await loadParentProgress(childId);

  return (
    <div className="studentPage studentDashboardModern">
      <ParentPageHeader
        title="Academic Progress"
        description="Review subject strength, recent results, attempt behavior, and trend movement for the active child in the parent relationship scope."
        contextLabel={progress?.child?.student_name}
        statusLabel={
          source === "live"
            ? `${children.length} linked children`
            : source === "unconfigured"
              ? "Backend not configured"
              : "Unable to load progress"
        }
        statusTone={
          source === "live"
            ? "live"
            : source === "unconfigured"
              ? "warning"
              : "demo"
        }
      />

      {!progress ? (
        <StudentStatePanel
          eyebrow={source === "unconfigured" ? "Setup required" : "Load issue"}
          title={
            source === "unconfigured"
              ? "Waiting for parent progress data"
              : "Progress data could not be loaded"
          }
          description={
            source === "unconfigured"
              ? "Configure the parent API base URL to load academic summaries for linked children."
              : "The parent progress endpoint did not return successfully for this request."
          }
          bullets={[
            "Parent progress endpoint",
            "Parent-child visibility permissions",
          ]}
          ctaHref="/parent/children"
          ctaLabel="Open Children"
          statusLabel={source === "unconfigured" ? "Configuration required" : "Retry after backend check"}
        />
      ) : !progress.child ? (
        <StudentStatePanel
          eyebrow="Family linking"
          title="No child with progress visibility is available"
          description="This page activates when at least one linked child relationship includes progress visibility."
          bullets={[
            "Create an active relationship",
            "Enable progress visibility",
            "Return to review strength and weak-area signals",
          ]}
          ctaHref="/parent/children"
          ctaLabel="Open Children"
          statusLabel="Waiting for progress-enabled link"
        />
      ) : (
        <>
          <ParentChildSwitcher
            allLabel="Default Progress View"
            basePath="/parent/progress"
            childRecords={children}
            currentChildId={progress.child.student_id}
          />

          <section className="studentInsightHeroCard studentInsightHeroCardCompact">
            <div className="studentInsightHeroCopy">
              <span className="studentDashboardTag">Academic Snapshot</span>
              <strong>{progress.child.student_name} performance trend</strong>
              <small>{trendDirectionLabel(progress.improvement_trend.direction, progress.improvement_trend.change_percentage)}</small>
            </div>
            <div className="studentInsightHeroActions">
              <Link className="button buttonPrimary" href={`/parent/alerts?child_id=${progress.child.student_id}`}>
                Open Alerts
              </Link>
              <Link className="button buttonSecondary" href="/parent/children">
                Switch Child
              </Link>
            </div>
          </section>

          <section className="resultsSummaryGrid">
            <article className="metricCard metricCardPrimary dashboardHeroCard">
              <span>Average Score</span>
              <strong>{percentageLabel(progress.average_percentage)}</strong>
              <small>Published result average</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Accuracy</span>
              <strong>{percentageLabel(progress.accuracy_percentage)}</strong>
              <small>Attempted-answer correctness</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Attempts</span>
              <strong>{progress.attempt_behavior.attempt_count}</strong>
              <small>{progress.attempt_behavior.attempted_questions} questions attempted</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Skipped</span>
              <strong>{progress.attempt_behavior.skipped_questions}</strong>
              <small>Skipped questions across tracked attempts</small>
            </article>
          </section>

          <section className="dashboardGrid">
            <article className="dashboardPanel weakTopicsPanel">
              <div className="sectionHeading">
                <strong>Strongest Subjects</strong>
                <span>{progress.strongest_subjects.length} ranked</span>
              </div>
              <div className="weakTopicStack">
                {progress.strongest_subjects.length ? (
                  progress.strongest_subjects.map((subject) => (
                    <div className="weakTopicRow" key={subject.subject_id}>
                      <div>
                        <strong>{subject.subject_name}</strong>
                        <span>{subject.attempted_questions} questions attempted</span>
                      </div>
                      <div className="weakTopicMeta">
                        <strong>{percentageLabel(subject.average_percentage)}</strong>
                        <span>Average performance</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="emptyText">Subject-strength rankings will appear when subject performance rows are available.</p>
                )}
              </div>
            </article>

            <article className="dashboardPanel weakTopicsPanel">
              <div className="sectionHeading">
                <strong>Weakest Subjects</strong>
                <span>{progress.weakest_subjects.length} ranked</span>
              </div>
              <div className="weakTopicStack">
                {progress.weakest_subjects.length ? (
                  progress.weakest_subjects.map((subject) => (
                    <div className="weakTopicRow" key={subject.subject_id}>
                      <div>
                        <strong>{subject.subject_name}</strong>
                        <span>{subject.skipped_questions} skipped questions</span>
                      </div>
                      <div className="weakTopicMeta">
                        <strong>{percentageLabel(subject.average_percentage)}</strong>
                        <span>Average performance</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="emptyText">Weak-subject signals will appear when topic performance rows are available.</p>
                )}
              </div>
            </article>
          </section>

          <section className="dashboardLowerGrid">
            <article className="dashboardPanel weakTopicsPanel">
              <div className="sectionHeading">
                <strong>Weak Topics</strong>
                <span>{progress.weak_topics.length} tracked</span>
              </div>
              <div className="weakTopicStack">
                {progress.weak_topics.length ? (
                  progress.weak_topics.map((topic) => (
                    <div className="weakTopicRow" key={topic.topic_id}>
                      <div>
                        <strong>{topic.topic_name}</strong>
                        <span>{topic.subject_name}</span>
                      </div>
                      <div className="weakTopicMeta">
                        <strong>{percentageLabel(topic.average_percentage)}</strong>
                        <span>{topic.skipped_questions} skipped</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="emptyText">Topic-level intervention signals will appear once topic analytics are available.</p>
                )}
              </div>
            </article>

            <article className="dashboardPanel">
              <div className="sectionHeading">
                <strong>Recent Results</strong>
                <Link href={`/parent/dashboard?child_id=${progress.child.student_id}`}>Back to dashboard</Link>
              </div>
              <div className="weakTopicStack">
                {progress.recent_results.length ? (
                  progress.recent_results.map((result) => (
                    <div className="weakTopicRow" key={result.exam_id}>
                      <div>
                        <strong>{result.exam_title}</strong>
                        <span>{result.exam_code}</span>
                      </div>
                      <div className="weakTopicMeta">
                        <strong>{percentageLabel(result.percentage)}</strong>
                        <span>{formatDateTime(result.published_at)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="emptyText">Published exam results will appear here once available for this child.</p>
                )}
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
}
