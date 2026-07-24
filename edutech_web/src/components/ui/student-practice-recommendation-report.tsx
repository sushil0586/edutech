"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export type StudentPracticeRecommendationRow = {
  id: string;
  title: string;
  code: string;
  subjectLabel: string;
  recommendationReason: string;
  durationLabel: string;
  availabilityLabel: string;
  accessLabel: string;
  actionLabel: string;
  toneClass: string;
  sourceLabel: string;
  supportNote: string;
  guidance: string;
  primaryHref: string;
  detailHref: string;
  weakAreasHref: string;
  resultsHref: string;
};

export function StudentPracticeRecommendationReport({
  rows,
  groupLabel,
}: {
  rows: StudentPracticeRecommendationRow[];
  groupLabel?: string | null;
}) {
  const [activeRow, setActiveRow] = useState<StudentPracticeRecommendationRow | null>(null);

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
          <strong>Practice Recommendation Report</strong>
          <span>{groupLabel ?? `${rows.length} practice sets in scope`}</span>
        </div>
        <div className="studentResultsTableWrap">
          <table className="studentResultsTable studentPracticeRecommendationTable">
            <thead>
              <tr>
                <th>Practice Set</th>
                <th>Subject</th>
                <th>Recommendation Reason</th>
                <th>Duration</th>
                <th>Availability</th>
                <th>Access</th>
                <th>Source</th>
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
                    <strong>{row.title}</strong>
                    <small>{row.code}</small>
                  </td>
                  <td>{row.subjectLabel}</td>
                  <td>{row.recommendationReason}</td>
                  <td>{row.durationLabel}</td>
                  <td>
                    <span className={`statusPill ${row.toneClass}`}>{row.availabilityLabel}</span>
                  </td>
                  <td>{row.accessLabel}</td>
                  <td>{row.sourceLabel}</td>
                  <td>
                    <span className="studentResultsTableAction">{row.actionLabel}</span>
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
            aria-labelledby="student-practice-recommendation-modal-title"
          >
            <div className="studentResultsModalHeader">
              <div>
                <span className="studentDashboardTag">Practice Recommendation</span>
                <strong id="student-practice-recommendation-modal-title">{activeRow.title}</strong>
                <small>{activeRow.code} · {activeRow.subjectLabel}</small>
              </div>
              <button className="appTopbarAction" onClick={() => setActiveRow(null)} type="button">
                Close
              </button>
            </div>

            <div className="studentResultsModalBody">
              <section className="studentResultsModalSection">
                <div className="studentResultsModalSectionHeader">
                  <strong>Overview</strong>
                  <span className={`statusPill ${activeRow.toneClass}`}>{activeRow.availabilityLabel}</span>
                </div>
                <div className="studentResultsModalMetrics">
                  <div>
                    <span>Subject</span>
                    <strong>{activeRow.subjectLabel}</strong>
                  </div>
                  <div>
                    <span>Duration</span>
                    <strong>{activeRow.durationLabel}</strong>
                  </div>
                  <div>
                    <span>Access</span>
                    <strong>{activeRow.accessLabel}</strong>
                  </div>
                  <div>
                    <span>Source</span>
                    <strong>{activeRow.sourceLabel}</strong>
                  </div>
                </div>
              </section>

              <section className="studentResultsModalSection">
                <div className="studentResultsModalSectionHeader">
                  <strong>Why This Next</strong>
                  <span>{activeRow.recommendationReason}</span>
                </div>
                <div className="studentInsightMessageStack">
                  <div className="studentInsightMessage">
                    <span className="placeholderDot" aria-hidden="true" />
                    <p>{activeRow.guidance}</p>
                  </div>
                  <div className="studentInsightMessage">
                    <span className="placeholderDot" aria-hidden="true" />
                    <p>{activeRow.supportNote}</p>
                  </div>
                </div>
              </section>
            </div>

            <div className="studentResultsModalFooter">
              <Link className="button buttonPrimary" href={activeRow.primaryHref}>
                {activeRow.actionLabel}
              </Link>
              <Link className="button buttonSecondary" href={activeRow.detailHref}>
                View Details
              </Link>
              <Link className="button buttonGhost" href={activeRow.weakAreasHref}>
                Open Weak Areas
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
