import Link from "next/link";
import { ParentChildSwitcher } from "@/components/parent/parent-child-switcher";
import { ParentPageHeader } from "@/components/ui/parent-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import {
  fetchParentChildren,
  fetchParentDashboardSummary,
  getParentApiState,
} from "@/lib/api/parent";
import { requireParentSession } from "@/lib/auth/session";
import {
  formatDateTime,
  percentageLabel,
  titleCaseLabel,
  trendDirectionLabel,
} from "@/lib/parent/formatters";

async function loadParentDashboard(childId?: string) {
  const state = getParentApiState();

  if (!state.apiConfigured) {
    return {
      source: "unconfigured" as const,
      children: [],
      summary: null,
    };
  }

  try {
    const [children, summary] = await Promise.all([
      fetchParentChildren(),
      fetchParentDashboardSummary(childId),
    ]);

    return {
      source: "live" as const,
      children,
      summary,
    };
  } catch {
    return {
      source: "error" as const,
      children: [],
      summary: null,
    };
  }
}

export default async function ParentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ child_id?: string }>;
}) {
  const profile = await requireParentSession();
  const { child_id: childId } = await searchParams;
  const { source, children, summary } = await loadParentDashboard(childId);
  const displayName = profile.display_name || profile.username;
  const activeChild = summary?.child;
  const progress = summary?.progress_summary;

  return (
    <div className="studentPage studentDashboardModern">
      <ParentPageHeader
        title={`Family Dashboard for ${displayName}`}
        description="Monitor linked children, track exam performance movement, and surface weak-learning or risk alerts from the same data backbone used by the academic workspace."
        contextLabel={activeChild ? activeChild.student_name : undefined}
        statusLabel={
          source === "live"
            ? `${children.length} linked children`
            : source === "unconfigured"
              ? "Backend not configured"
              : "Unable to load parent data"
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
              ? "Waiting for parent workspace data"
              : "Parent workspace could not be loaded"
          }
          description={
            source === "unconfigured"
              ? "Configure the API base URL and sign in with an active parent account to load linked children, family alerts, and academic progress."
              : "The parent dashboard depends on live relationship, progress, and alert endpoints, and the current request did not complete successfully."
          }
          bullets={[
            "Parent children endpoint",
            "Parent dashboard summary endpoint",
            "Authenticated parent profile",
          ]}
          ctaHref="/login"
          ctaLabel="Back to Login"
          statusLabel={source === "unconfigured" ? "Configuration required" : "Retry after backend check"}
        />
      ) : children.length === 0 || !activeChild || !progress ? (
        <StudentStatePanel
          eyebrow="Family linking"
          title="No active child links are available yet"
          description="The parent workspace is live, but this account does not currently have an active child relationship with progress visibility."
          bullets={[
            "Create an active parent-child relationship",
            "Enable progress visibility on the relationship",
            "Return here to review academic summaries",
          ]}
          ctaHref="/parent/settings"
          ctaLabel="Open Settings"
          statusLabel="Waiting for active links"
        />
      ) : (
        <>
          <ParentChildSwitcher
            allLabel="Default Child View"
            basePath="/parent/dashboard"
            childRecords={children}
            currentChildId={activeChild.student_id}
          />

          <section className="studentInsightHeroCard">
            <div className="studentInsightHeroCopy">
              <span className="studentDashboardTag">Family Overview</span>
              <strong>
                {activeChild.student_name} is currently the active child in focus
              </strong>
              <p>
                Track recent result movement, alert intensity, and the next academic attention area
                without switching into separate reports or support tools.
              </p>
              <small>
                {activeChild.program_name} · {activeChild.academic_year_name}
                {activeChild.cohort_name ? ` · ${activeChild.cohort_name}` : ""}
              </small>
            </div>
            <div className="studentInsightHeroActions">
              <Link className="button buttonPrimary" href={`/parent/progress?child_id=${activeChild.student_id}`}>
                Open Progress
              </Link>
              <Link className="button buttonSecondary" href={`/parent/alerts?child_id=${activeChild.student_id}`}>
                Open Alerts
              </Link>
            </div>
          </section>

          <section className="resultsSummaryGrid">
            <article className="metricCard metricCardPrimary dashboardHeroCard">
              <span>Average Score</span>
              <strong>{percentageLabel(progress.average_percentage)}</strong>
              <small>{trendDirectionLabel(progress.improvement_trend.direction, progress.improvement_trend.change_percentage)}</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Accuracy</span>
              <strong>{percentageLabel(progress.accuracy_percentage)}</strong>
              <small>{progress.attempted_questions} attempted questions tracked</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Unread Alerts</span>
              <strong>{summary.alert_summary.unread}</strong>
              <small>{summary.alert_summary.high} high severity and {summary.alert_summary.warning} warning alerts</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Skipped Questions</span>
              <strong>{progress.skipped_questions}</strong>
              <small>Questions skipped across published result history</small>
            </article>
          </section>

          <section className="dashboardGrid">
            <article className="dashboardPanel">
              <div className="sectionHeading">
                <strong>Recent Results</strong>
                <Link href={`/parent/progress?child_id=${activeChild.student_id}`}>Detailed progress</Link>
              </div>
              <div className="weakTopicStack">
                {summary.recent_results.length ? (
                  summary.recent_results.map((result) => (
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
                  <p className="emptyText">Result history will appear here once published exams are available for this child.</p>
                )}
              </div>
            </article>

            <article className="dashboardPanel weakTopicsPanel">
              <div className="sectionHeading">
                <strong>Weak Topics</strong>
                <span>{summary.weak_topics.length} tracked</span>
              </div>
              <div className="weakTopicStack">
                {summary.weak_topics.length ? (
                  summary.weak_topics.map((topic) => (
                    <div className="weakTopicRow" key={topic.topic_id}>
                      <div>
                        <strong>{topic.topic_name}</strong>
                        <span>{topic.subject_name}</span>
                      </div>
                      <div className="weakTopicMeta">
                        <strong>{percentageLabel(topic.average_percentage)}</strong>
                        <span>{topic.attempted_questions} attempted</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="emptyText">Weak topic signals will appear once subject-topic performance data is generated.</p>
                )}
              </div>
            </article>
          </section>

          <section className="dashboardLowerGrid">
            <article className="dashboardPanel weakTopicsPanel">
              <div className="sectionHeading">
                <strong>Linked Children</strong>
                <Link href="/parent/children">Manage child scope</Link>
              </div>
              <div className="weakTopicStack">
                {children.map((child) => (
                  <div className="weakTopicRow" key={child.relationship_id}>
                    <div>
                      <strong>{child.student_name}</strong>
                      <span>
                        {titleCaseLabel(child.relationship_type)}
                        {child.is_primary_contact ? " · Primary contact" : ""}
                      </span>
                    </div>
                    <div className="weakTopicMeta">
                      <strong>{child.program_name}</strong>
                      <span>{child.permissions.can_view_progress ? "Progress enabled" : "Limited view"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="dashboardPanel weakTopicsPanel">
              <div className="sectionHeading">
                <strong>Family Insights</strong>
                <span>{summary.insight_messages.length} signals</span>
              </div>
              <div className="weakTopicStack">
                {summary.insight_messages.length ? (
                  summary.insight_messages.map((message) => (
                    <div className="weakTopicRow" key={message}>
                      <div>
                        <strong>{message}</strong>
                        <span>Generated from result and topic performance data</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="emptyText">Insight messages will appear once more academic data becomes available.</p>
                )}
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
}
