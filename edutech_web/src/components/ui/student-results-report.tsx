"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export type StudentResultsReportRow = {
  id: string;
  examTitle: string;
  examCode: string;
  subjectScope: string;
  sourceLabel: string;
  scoreLabel: string;
  percentageLabel: string;
  rankLabel: string;
  resultStatusLabel: string;
  reviewLabel: string;
  nextActionLabel: string;
  dateLabel: string;
  statusToneClass: string;
  statusBadgeLabel: string;
  summaryHref: string;
  reviewHref: string | null;
  practiceHref: string;
  stats: {
    finalScore: string;
    percentage: string;
    attemptedCount: string;
    correctAnswers: number;
    incorrectAnswers: number;
    skippedQuestions: number;
    timeTaken: string;
    publishedState: string;
  };
  insight: {
    headline: string;
    helper: string;
    progress: string;
  };
};

type StudentResultsReportGroup = {
  label: string;
  items: StudentResultsReportRow[];
};

export function StudentResultsReport({
  groups,
  showGroupHeadings,
}: {
  groups: StudentResultsReportGroup[];
  showGroupHeadings: boolean;
}) {
  const [activeRow, setActiveRow] = useState<StudentResultsReportRow | null>(null);

  useEffect(() => {
    if (!activeRow) {
      return;
    }

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
      <div className="studentResultsReportStack">
        {groups.map((group) => (
          <section className="contentCard studentResultsReportCard" key={group.label}>
            {showGroupHeadings ? (
              <div className="sectionHeading sectionHeadingCompact studentResultsReportGroupHeading">
                <strong>{group.label}</strong>
                <span>{group.items.length} results</span>
              </div>
            ) : null}
            <div className="studentResultsTableWrap">
              <table className="studentResultsTable">
                <thead>
                  <tr>
                    <th>Exam</th>
                    <th>Subject Scope</th>
                    <th>Source</th>
                    <th>Date</th>
                    <th>Score</th>
                    <th>Percentage</th>
                    <th>Rank</th>
                    <th>Status</th>
                    <th>Review</th>
                    <th>Next Action</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((row) => (
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
                        <strong>{row.examTitle}</strong>
                        <small>{row.examCode}</small>
                      </td>
                      <td>{row.subjectScope}</td>
                      <td>{row.sourceLabel}</td>
                      <td>{row.dateLabel}</td>
                      <td>{row.scoreLabel}</td>
                      <td>{row.percentageLabel}</td>
                      <td>{row.rankLabel}</td>
                      <td>
                        <span className={`statusPill ${row.statusToneClass}`}>{row.resultStatusLabel}</span>
                      </td>
                      <td>{row.reviewLabel}</td>
                      <td>
                        <span className="studentResultsTableAction">{row.nextActionLabel}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

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
            aria-labelledby="student-results-modal-title"
          >
            <div className="studentResultsModalHeader">
              <div>
                <span className="studentDashboardTag">Result Details</span>
                <strong id="student-results-modal-title">{activeRow.examTitle}</strong>
                <small>
                  {activeRow.examCode} · {activeRow.subjectScope} · {activeRow.sourceLabel}
                </small>
              </div>
              <button
                className="appTopbarAction"
                onClick={() => setActiveRow(null)}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="studentResultsModalBody">
              <section className="studentResultsModalSection">
                <div className="studentResultsModalSectionHeader">
                  <strong>Overview</strong>
                  <span className={`statusPill ${activeRow.statusToneClass}`}>{activeRow.statusBadgeLabel}</span>
                </div>
                <div className="studentResultsModalMetrics">
                  <div>
                    <span>Score</span>
                    <strong>{activeRow.stats.finalScore}</strong>
                  </div>
                  <div>
                    <span>Percentage</span>
                    <strong>{activeRow.stats.percentage}</strong>
                  </div>
                  <div>
                    <span>Rank</span>
                    <strong>{activeRow.rankLabel}</strong>
                  </div>
                  <div>
                    <span>Attempted</span>
                    <strong>{activeRow.stats.attemptedCount}</strong>
                  </div>
                  <div>
                    <span>Time Taken</span>
                    <strong>{activeRow.stats.timeTaken}</strong>
                  </div>
                  <div>
                    <span>Published State</span>
                    <strong>{activeRow.stats.publishedState}</strong>
                  </div>
                </div>
              </section>

              <section className="studentResultsModalSection">
                <div className="studentResultsModalSectionHeader">
                  <strong>Answer Breakdown</strong>
                  <span>{activeRow.dateLabel}</span>
                </div>
                <div className="studentResultsBreakdownStrip studentResultsModalBreakdown">
                  <div>
                    <span>Correct</span>
                    <strong>{activeRow.stats.correctAnswers}</strong>
                  </div>
                  <div>
                    <span>Incorrect</span>
                    <strong>{activeRow.stats.incorrectAnswers}</strong>
                  </div>
                  <div>
                    <span>Skipped</span>
                    <strong>{activeRow.stats.skippedQuestions}</strong>
                  </div>
                  <div>
                    <span>Review</span>
                    <strong>{activeRow.reviewLabel}</strong>
                  </div>
                </div>
              </section>

              <section className="studentResultsModalSection">
                <div className="studentResultsModalSectionHeader">
                  <strong>Next Step</strong>
                  <span>{activeRow.nextActionLabel}</span>
                </div>
                <div className="studentAttemptsNotice studentResultsModalNotice">
                  <strong>{activeRow.insight.headline}</strong>
                  <span>{activeRow.insight.helper}</span>
                  <small>{activeRow.insight.progress}</small>
                </div>
              </section>
            </div>

            <div className="studentResultsModalFooter">
              <Link className="button buttonPrimary" href={activeRow.summaryHref}>
                Open Summary
              </Link>
              {activeRow.reviewHref ? (
                <Link className="button buttonSecondary" href={activeRow.reviewHref}>
                  Open Answer Review
                </Link>
              ) : null}
              <Link className="button buttonGhost" href={activeRow.practiceHref}>
                {activeRow.nextActionLabel}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
