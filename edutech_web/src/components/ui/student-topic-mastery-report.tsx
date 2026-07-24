"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export type StudentTopicMasteryRow = {
  id: string;
  topicName: string;
  subjectName: string;
  masteryLabel: string;
  masteryToneClass: string;
  percentageLabel: string;
  attemptedLabel: string;
  skippedLabel: string;
  trendLabel: string;
  evidenceLabel: string;
  causes: string[];
  overview: string;
  practiceHref: string;
  topicDrilldownHref: string;
  questionEvidenceHref: string;
  stats: {
    correct: number;
    incorrect: number;
    skipped: number;
    attempted: number;
  };
};

export function StudentTopicMasteryReport({
  rows,
}: {
  rows: StudentTopicMasteryRow[];
}) {
  const [activeRow, setActiveRow] = useState<StudentTopicMasteryRow | null>(null);

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
      <section className="contentCard studentResultsReportCard">
        <div className="sectionHeading">
          <strong>Topic Mastery Report</strong>
          <span>{rows.length} topics ranked</span>
        </div>
        <div className="studentResultsTableWrap">
          <table className="studentResultsTable studentTopicMasteryTable">
            <thead>
              <tr>
                <th>Topic</th>
                <th>Subject</th>
                <th>Mastery</th>
                <th>Score</th>
                <th>Attempted</th>
                <th>Skipped</th>
                <th>Trend</th>
                <th>Evidence</th>
                <th>Next Action</th>
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
                    <strong>{row.topicName}</strong>
                    <small>{row.causes.join(" · ") || row.overview}</small>
                  </td>
                  <td>{row.subjectName}</td>
                  <td>
                    <span className={`statusPill ${row.masteryToneClass}`}>{row.masteryLabel}</span>
                  </td>
                  <td>{row.percentageLabel}</td>
                  <td>{row.attemptedLabel}</td>
                  <td>{row.skippedLabel}</td>
                  <td>{row.trendLabel}</td>
                  <td>{row.evidenceLabel}</td>
                  <td>
                    <span className="studentResultsTableAction">Open Topic Plan</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

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
            aria-labelledby="student-topic-mastery-modal-title"
          >
            <div className="studentResultsModalHeader">
              <div>
                <span className="studentDashboardTag">Topic Mastery</span>
                <strong id="student-topic-mastery-modal-title">{activeRow.topicName}</strong>
                <small>{activeRow.subjectName}</small>
              </div>
              <button className="appTopbarAction" onClick={() => setActiveRow(null)} type="button">
                Close
              </button>
            </div>

            <div className="studentResultsModalBody">
              <section className="studentResultsModalSection">
                <div className="studentResultsModalSectionHeader">
                  <strong>Overview</strong>
                  <span className={`statusPill ${activeRow.masteryToneClass}`}>{activeRow.masteryLabel}</span>
                </div>
                <p className="sectionDescription">{activeRow.overview}</p>
                <div className="studentResultsModalMetrics">
                  <div>
                    <span>Score</span>
                    <strong>{activeRow.percentageLabel}</strong>
                  </div>
                  <div>
                    <span>Attempted</span>
                    <strong>{activeRow.attemptedLabel}</strong>
                  </div>
                  <div>
                    <span>Skipped</span>
                    <strong>{activeRow.skippedLabel}</strong>
                  </div>
                  <div>
                    <span>Trend</span>
                    <strong>{activeRow.trendLabel}</strong>
                  </div>
                </div>
              </section>

              <section className="studentResultsModalSection">
                <div className="studentResultsModalSectionHeader">
                  <strong>Answer Mix</strong>
                  <span>{activeRow.evidenceLabel}</span>
                </div>
                <div className="studentResultsBreakdownStrip studentResultsModalBreakdown">
                  <div>
                    <span>Correct</span>
                    <strong>{activeRow.stats.correct}</strong>
                  </div>
                  <div>
                    <span>Wrong</span>
                    <strong>{activeRow.stats.incorrect}</strong>
                  </div>
                  <div>
                    <span>Skipped</span>
                    <strong>{activeRow.stats.skipped}</strong>
                  </div>
                  <div>
                    <span>Total</span>
                    <strong>{activeRow.stats.attempted}</strong>
                  </div>
                </div>
              </section>

              <section className="studentResultsModalSection">
                <div className="studentResultsModalSectionHeader">
                  <strong>Focus Signals</strong>
                  <span>{activeRow.causes.length} flags</span>
                </div>
                <div className="studentInsightMessageStack">
                  {activeRow.causes.map((cause) => (
                    <div className="studentInsightMessage" key={cause}>
                      <span className="placeholderDot" aria-hidden="true" />
                      <p>{cause}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="studentResultsModalFooter">
              <Link className="button buttonPrimary" href={activeRow.practiceHref}>
                Start Practice
              </Link>
              <Link className="button buttonSecondary" href={activeRow.topicDrilldownHref}>
                Open Topic Drilldown
              </Link>
              <Link className="button buttonGhost" href={activeRow.questionEvidenceHref}>
                Question Evidence
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
