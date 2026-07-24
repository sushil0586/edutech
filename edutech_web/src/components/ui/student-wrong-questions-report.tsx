"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export type StudentWrongQuestionRow = {
  id: string;
  questionLabel: string;
  subjectLabel: string;
  topicLabel: string;
  typeLabel: string;
  difficultyLabel: string;
  timeLabel: string;
  benchmarkLabel: string;
  supportNote: string;
  recoveryNote: string;
  explanation: string;
  subjectHref: string | null;
  topicHref: string | null;
  typeHref: string | null;
};

export function StudentWrongQuestionsReport({
  rows,
  scopeLabel,
}: {
  rows: StudentWrongQuestionRow[];
  scopeLabel?: string | null;
}) {
  const [activeRow, setActiveRow] = useState<StudentWrongQuestionRow | null>(null);

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
          <strong>Wrong Questions Report</strong>
          <span>{scopeLabel ?? `${rows.length} wrong questions in scope`}</span>
        </div>
        <div className="studentResultsTableWrap">
          <table className="studentResultsTable studentWrongQuestionsTable">
            <thead>
              <tr>
                <th>Question</th>
                <th>Subject</th>
                <th>Topic</th>
                <th>Type</th>
                <th>Difficulty</th>
                <th>Time</th>
                <th>Peer Signal</th>
                <th>Recovery Path</th>
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
                  <td>{row.timeLabel}</td>
                  <td>{row.benchmarkLabel}</td>
                  <td>{row.recoveryNote}</td>
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
            aria-labelledby="student-wrong-question-modal-title"
          >
            <div className="studentResultsModalHeader">
              <div>
                <span className="studentDashboardTagWarm">Wrong Question</span>
                <strong id="student-wrong-question-modal-title">{activeRow.questionLabel}</strong>
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
                  <strong>What went wrong</strong>
                  <span className="statusPill statusDanger">Wrong</span>
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
                  <strong>Recovery guidance</strong>
                  <span>{activeRow.benchmarkLabel}</span>
                </div>
                <div className="studentInsightMessageStack">
                  <div className="studentInsightMessage">
                    <span className="placeholderDot" aria-hidden="true" />
                    <p>{activeRow.supportNote}</p>
                  </div>
                  <div className="studentInsightMessage">
                    <span className="placeholderDot" aria-hidden="true" />
                    <p>{activeRow.recoveryNote}</p>
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
