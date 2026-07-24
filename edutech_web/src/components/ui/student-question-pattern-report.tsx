"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export type StudentQuestionPatternRow = {
  id: string;
  questionLabel: string;
  subjectLabel: string;
  topicLabel: string;
  typeLabel: string;
  difficultyLabel: string;
  resultLabel: string;
  resultToneClass: string;
  timeLabel: string;
  benchmarkLabel: string;
  supportNote: string;
  explanation: string;
  subjectHref: string | null;
  topicHref: string | null;
  typeHref: string | null;
};

export function StudentQuestionPatternReport({
  rows,
  scopeLabel,
}: {
  rows: StudentQuestionPatternRow[];
  scopeLabel?: string | null;
}) {
  const [activeRow, setActiveRow] = useState<StudentQuestionPatternRow | null>(null);

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
          <strong>Question Pattern Report</strong>
          <span>{scopeLabel ?? `${rows.length} questions in scope`}</span>
        </div>
        <div className="studentResultsTableWrap">
          <table className="studentResultsTable studentQuestionPatternTable">
            <thead>
              <tr>
                <th>Question</th>
                <th>Subject</th>
                <th>Topic</th>
                <th>Type</th>
                <th>Difficulty</th>
                <th>Result</th>
                <th>Time</th>
                <th>Peer Signal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  className="studentResultsTableRow"
                  key={row.id}
                  onClick={() => setActiveRow(row)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setActiveRow(row);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <td>
                    <strong>{row.questionLabel}</strong>
                    <small>{row.supportNote}</small>
                  </td>
                  <td>{row.subjectLabel}</td>
                  <td>{row.topicLabel}</td>
                  <td>{row.typeLabel}</td>
                  <td>{row.difficultyLabel}</td>
                  <td>
                    <span className={`statusPill ${row.resultToneClass}`}>{row.resultLabel}</span>
                  </td>
                  <td>{row.timeLabel}</td>
                  <td>{row.benchmarkLabel}</td>
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
            aria-labelledby="student-question-pattern-modal-title"
          >
            <div className="studentResultsModalHeader">
              <div>
                <span className="studentDashboardTag">Question Pattern</span>
                <strong id="student-question-pattern-modal-title">{activeRow.questionLabel}</strong>
                <small>
                  {activeRow.subjectLabel} · {activeRow.topicLabel} · {activeRow.typeLabel}
                </small>
              </div>
              <button className="appTopbarAction" onClick={() => setActiveRow(null)} type="button">
                Close
              </button>
            </div>

            <div className="studentResultsModalBody">
              <section className="studentResultsModalSection">
                <div className="studentResultsModalSectionHeader">
                  <strong>Overview</strong>
                  <span className={`statusPill ${activeRow.resultToneClass}`}>{activeRow.resultLabel}</span>
                </div>
                <div className="studentResultsModalMetrics">
                  <div>
                    <span>Subject</span>
                    <strong>{activeRow.subjectLabel}</strong>
                  </div>
                  <div>
                    <span>Topic</span>
                    <strong>{activeRow.topicLabel}</strong>
                  </div>
                  <div>
                    <span>Difficulty</span>
                    <strong>{activeRow.difficultyLabel}</strong>
                  </div>
                  <div>
                    <span>Time spent</span>
                    <strong>{activeRow.timeLabel}</strong>
                  </div>
                </div>
              </section>

              <section className="studentResultsModalSection">
                <div className="studentResultsModalSectionHeader">
                  <strong>What This Means</strong>
                  <span>{activeRow.benchmarkLabel}</span>
                </div>
                <div className="studentInsightMessageStack">
                  <div className="studentInsightMessage">
                    <span className="placeholderDot" aria-hidden="true" />
                    <p>{activeRow.supportNote}</p>
                  </div>
                  <div className="studentInsightMessage">
                    <span className="placeholderDot" aria-hidden="true" />
                    <p>{activeRow.explanation}</p>
                  </div>
                </div>
              </section>
            </div>

            <div className="studentResultsModalFooter">
              {activeRow.subjectHref ? (
                <Link className="button buttonPrimary" href={activeRow.subjectHref}>
                  Open Subject View
                </Link>
              ) : null}
              {activeRow.topicHref ? (
                <Link className="button buttonSecondary" href={activeRow.topicHref}>
                  Open Topic View
                </Link>
              ) : null}
              {activeRow.typeHref ? (
                <Link className="button buttonGhost" href={activeRow.typeHref}>
                  Open Type View
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
