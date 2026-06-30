"use client";

import { useMemo, useState } from "react";

type OverviewMetric = {
  label: string;
  value: string | number;
  helper: string;
  accent?: boolean;
};

type OverviewRow = {
  id: string;
  title: string;
  lines: string[];
  metaTitle: string;
  metaLines?: string[];
};

type OverviewLane = {
  key: string;
  eyebrow: string;
  title: string;
  description: string;
  emptyMessage: string;
  rows: OverviewRow[];
};

export function InstituteEconomyOverviewWorkspace({
  metrics,
  lanes,
}: {
  metrics: OverviewMetric[];
  lanes: OverviewLane[];
}) {
  const [laneFilter, setLaneFilter] = useState<string>("all");
  const [rowLimit, setRowLimit] = useState<"4" | "8" | "12">("4");

  const visibleLanes = useMemo(() => {
    if (laneFilter === "all") {
      return lanes;
    }
    return lanes.filter((lane) => lane.key === laneFilter);
  }, [laneFilter, lanes]);

  const totalVisibleRows = visibleLanes.reduce((sum, lane) => sum + lane.rows.length, 0);
  const visibleMetricCount =
    laneFilter === "all"
      ? metrics.length
      : metrics.filter((metric) =>
          laneFilter === "licensing"
            ? /package|feature|expiring/i.test(metric.label)
            : laneFilter === "policies"
              ? /exam|star|entitlement|cost/i.test(metric.label)
              : laneFilter === "usage"
                ? /usage|linked/i.test(metric.label)
                : true,
        ).length;
  const visibleMetrics = useMemo(() => {
    if (laneFilter === "all") {
      return metrics;
    }
    return metrics.filter((metric) =>
      laneFilter === "licensing"
        ? /package|feature|expiring/i.test(metric.label)
        : laneFilter === "policies"
          ? /exam|star|entitlement|cost/i.test(metric.label)
          : laneFilter === "usage"
            ? /usage|linked/i.test(metric.label)
            : true,
    );
  }, [laneFilter, metrics]);

  return (
    <section className="dashboardLowerGrid">
      <article className="dashboardPanel weakTopicsPanel">
        <div className="studentPageTight">
          <span className="studentDashboardTag">Overview filters</span>
          <h3>Review one economy lane at a time</h3>
          <p className="academicSectionDescription">
            Narrow the institute economy surface before reading package, policy, usage, or plan details. This keeps the working set intentionally small and makes the page easier to operate.
          </p>

          <div className="setupFormGrid setupFormGridDense" style={{ marginBottom: 16 }}>
            <label className="setupField">
              <span>Focus lane</span>
              <select
                aria-label="Institute economy focus lane"
                value={laneFilter}
                onChange={(event) => setLaneFilter(event.target.value)}
              >
                <option value="all">All overview lanes</option>
                {lanes.map((lane) => (
                  <option key={lane.key} value={lane.key}>
                    {lane.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="setupField">
              <span>Rows to show</span>
              <select
                aria-label="Institute economy rows to show"
                value={rowLimit}
                onChange={(event) => setRowLimit(event.target.value as "4" | "8" | "12")}
              >
                <option value="4">4 rows</option>
                <option value="8">8 rows</option>
                <option value="12">12 rows</option>
              </select>
            </label>
          </div>

          <section className="resultsSummaryGrid" style={{ marginBottom: 16 }}>
            <article className="metricCard metricCardPrimary dashboardHeroCard">
              <span>Visible lanes</span>
              <strong>{visibleLanes.length}</strong>
              <small>{laneFilter === "all" ? "Full economy overview." : "Focused operator lens."}</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Rows in current lens</span>
              <strong>{totalVisibleRows}</strong>
              <small>Before row trimming is applied.</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Metric cards in play</span>
              <strong>{visibleMetricCount}</strong>
              <small>High-level reading for this view.</small>
            </article>
          </section>

          <section className="resultsSummaryGrid" style={{ marginBottom: 16 }}>
            {visibleMetrics.map((metric, index) => (
              <article
                className={`metricCard dashboardHeroCard${
                  metric.accent || index === 0 ? " metricCardPrimary" : ""
                }`}
                key={metric.label}
              >
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.helper}</small>
              </article>
            ))}
          </section>
        </div>
      </article>

      {visibleLanes.map((lane) => (
        <article className="dashboardPanel weakTopicsPanel" key={lane.key}>
          <div className="studentPageTight">
            <span className="studentDashboardTag">{lane.eyebrow}</span>
            <h3>{lane.title}</h3>
            <p className="academicSectionDescription">{lane.description}</p>
            {lane.rows.length === 0 ? (
              <div className="featurePlaceholder">
                <p>{lane.emptyMessage}</p>
              </div>
            ) : (
              <div className="weakTopicStack">
                {lane.rows.slice(0, Number(rowLimit)).map((row) => (
                  <div className="weakTopicRow" key={row.id}>
                    <div>
                      <strong>{row.title}</strong>
                      {row.lines.map((line) => (
                        <span key={`${row.id}-${line}`}>{line}</span>
                      ))}
                    </div>
                    <div className="weakTopicMeta">
                      <strong>{row.metaTitle}</strong>
                      {(row.metaLines ?? []).map((line) => (
                        <span key={`${row.id}-meta-${line}`}>{line}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
