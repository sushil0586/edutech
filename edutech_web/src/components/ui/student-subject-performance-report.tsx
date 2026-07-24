"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export type StudentSubjectPerformanceRow = {
  id: string;
  subjectName: string;
  averagePercentageLabel: string;
  trendLabel: string;
  attemptedQuestionsLabel: string;
  skippedQuestionsLabel: string;
  weakTopicsLabel: string;
  sourceLabel: string;
  subjectStrengthLabel: string;
  toneClass: string;
  overview: string;
  subjectDrilldownHref: string;
  topicMasteryHref: string;
  resultsHref: string;
};

export function StudentSubjectPerformanceReport({
  rows,
}: {
  rows: StudentSubjectPerformanceRow[];
}) {
  const [activeRow, setActiveRow] = useState<StudentSubjectPerformanceRow | null>(null);

  useEffect(() => {
    if (!activeRow) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveRow(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeRow]);

  return (
    <>
      <article className="contentCard analyticsPanel analyticsPanelSubjects">
        <div className="sectionHeading">
          <strong>Subject Performance Report</strong>
          <span>{rows.length} subjects tracked</span>
        </div>
        <div className="studentResultsTableWrap">
          <table className="studentResultsTable studentSubjectPerformanceTable">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Average</th>
                <th>Trend</th>
                <th>Attempted</th>
                <th>Skipped</th>
                <th>Weak Topics</th>
                <th>Source Focus</th>
                <th>Current State</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  className="studentResultsTableRow"
                  key={row.id}
                  onClick={() => setActiveRow(row)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setActiveRow(row);
                    }
                  }}
                >
                  <td>
                    <strong>{row.subjectName}</strong>
                    <small>{row.overview}</small>
                  </td>
                  <td>{row.averagePercentageLabel}</td>
                  <td>{row.trendLabel}</td>
                  <td>{row.attemptedQuestionsLabel}</td>
                  <td>{row.skippedQuestionsLabel}</td>
                  <td>{row.weakTopicsLabel}</td>
                  <td>{row.sourceLabel}</td>
                  <td>
                    <span className={`statusPill ${row.toneClass}`}>{row.subjectStrengthLabel}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {activeRow ? (
        <div
          className="rosterImportOverlay studentResultsModalOverlay"
          onClick={() => setActiveRow(null)}
          role="presentation"
        >
          <div
            className="rosterImportDialog studentResultsModalCard"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-subject-performance-modal-title"
          >
            <div className="studentResultsModalHeader">
              <div>
                <span className="studentDashboardTag">Subject Performance</span>
                <strong id="student-subject-performance-modal-title">{activeRow.subjectName}</strong>
                <small>{activeRow.sourceLabel}</small>
              </div>
              <button className="appTopbarAction" onClick={() => setActiveRow(null)} type="button">
                Close
              </button>
            </div>

            <div className="studentResultsModalBody">
              <section className="studentResultsModalSection">
                <div className="studentResultsModalSectionHeader">
                  <strong>Overview</strong>
                  <span className={`statusPill ${activeRow.toneClass}`}>{activeRow.subjectStrengthLabel}</span>
                </div>
                <p className="sectionDescription">{activeRow.overview}</p>
                <div className="studentResultsModalMetrics">
                  <div>
                    <span>Average</span>
                    <strong>{activeRow.averagePercentageLabel}</strong>
                  </div>
                  <div>
                    <span>Trend</span>
                    <strong>{activeRow.trendLabel}</strong>
                  </div>
                  <div>
                    <span>Attempted</span>
                    <strong>{activeRow.attemptedQuestionsLabel}</strong>
                  </div>
                  <div>
                    <span>Skipped</span>
                    <strong>{activeRow.skippedQuestionsLabel}</strong>
                  </div>
                </div>
              </section>

              <section className="studentResultsModalSection">
                <div className="studentResultsModalSectionHeader">
                  <strong>Intervention View</strong>
                  <span>{activeRow.weakTopicsLabel}</span>
                </div>
                <div className="studentInsightMessageStack">
                  <div className="studentInsightMessage">
                    <span className="placeholderDot" aria-hidden="true" />
                    <p>Open topic mastery to inspect the weakest concepts inside this subject.</p>
                  </div>
                  <div className="studentInsightMessage">
                    <span className="placeholderDot" aria-hidden="true" />
                    <p>Compare subject results next if the average trend has started to decline.</p>
                  </div>
                  <div className="studentInsightMessage">
                    <span className="placeholderDot" aria-hidden="true" />
                    <p>Use the subject drilldown to inspect recent result evidence and recovery direction.</p>
                  </div>
                </div>
              </section>
            </div>

            <div className="studentResultsModalFooter">
              <Link className="button buttonPrimary" href={activeRow.subjectDrilldownHref}>
                Open Subject Drilldown
              </Link>
              <Link className="button buttonSecondary" href={activeRow.topicMasteryHref}>
                Open Topic Mastery
              </Link>
              <Link className="button buttonGhost" href={activeRow.resultsHref}>
                Open Results
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
