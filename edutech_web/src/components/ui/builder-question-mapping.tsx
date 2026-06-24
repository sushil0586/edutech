"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { BuilderQuestionPreviewTrigger } from "@/components/ui/builder-question-preview-trigger";
import { BuilderRapidAttach } from "@/components/ui/builder-rapid-attach";
import { RichContentRenderer } from "@/components/ui/rich-content-renderer";
import type { TeacherExamSection, TeacherExamQuestion } from "@/features/dashboard/types";
import type { LookupQuestion, LookupTopic } from "@/lib/api/teacher-builder";
import type { CatalogSelectOption } from "@/lib/teacher/option-catalog";

type BuilderAction = (formData: FormData) => void | Promise<void>;

type BuilderQuestionMappingProps = {
  examId: string;
  examTitle: string;
  examCode: string;
  examType: string;
  subjectName: string | null;
  durationMinutes: number | null;
  startAt: string | null;
  instructions: string | null;
  activeExamQuestions: TeacherExamQuestion[];
  activeSections: TeacherExamSection[];
  allQuestions: LookupQuestion[];
  availableQuestions: LookupQuestion[];
  topics: LookupTopic[];
  difficultyLabelMap: Record<string, string>;
  difficultyOptions: CatalogSelectOption[];
  questionTypeLabelMap: Record<string, string>;
  addQuestionLinkAction: BuilderAction;
  bulkAddQuestionLinksAction: BuilderAction;
  updateQuestionLinkAction: BuilderAction;
  deleteQuestionLinkAction: BuilderAction;
  academicSetupHref: string;
};

function titleCase(value: string) {
  return value.replaceAll("_", " ");
}

function qualityTone(signal: LookupQuestion["quality_signal"]) {
  if (signal === "ambiguous" || signal === "revision_candidate") return "statusDemo";
  if (signal === "skip_risk" || signal === "hard" || signal === "watch") return "statusWarning";
  if (signal === "healthy") return "statusLive";
  return "statusNeutral";
}

function questionPriorityScore(question: LookupQuestion) {
  const revisionWeightMap: Record<LookupQuestion["revision_priority"], number> = {
    urgent: 80,
    high: 60,
    medium: 35,
    watch: 15,
    none: 0,
  };
  const qualityWeightMap: Record<LookupQuestion["quality_signal"], number> = {
    ambiguous: 50,
    revision_candidate: 45,
    skip_risk: 30,
    hard: 20,
    watch: 12,
    emerging: 8,
    healthy: -20,
  };

  let score = 0;
  score += revisionWeightMap[question.revision_priority];
  score += qualityWeightMap[question.quality_signal];
  if (!question.is_verified) score += 12;
  if (!question.has_explanation) score += 18;
  return score;
}

function compactText(value: string, limit = 220) {
  const normalized = value.replaceAll("\n", " ").trim();
  if (normalized.length <= limit) {
    return normalized;
  }
  return `${normalized.slice(0, limit).trimEnd()}...`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function BuilderQuestionMapping({
  examId,
  examTitle,
  examCode,
  examType,
  subjectName,
  durationMinutes,
  startAt,
  instructions,
  activeExamQuestions,
  activeSections,
  allQuestions,
  availableQuestions,
  topics,
  difficultyLabelMap,
  difficultyOptions,
  questionTypeLabelMap,
  addQuestionLinkAction,
  bulkAddQuestionLinksAction,
  updateQuestionLinkAction,
  deleteQuestionLinkAction,
  academicSetupHref,
}: BuilderQuestionMappingProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;
  const sortedAllQuestions = useMemo(
    () => [...allQuestions].sort((left, right) => questionPriorityScore(left) - questionPriorityScore(right)),
    [allQuestions],
  );
  const sortedAvailableQuestions = useMemo(
    () => [...availableQuestions].sort((left, right) => questionPriorityScore(left) - questionPriorityScore(right)),
    [availableQuestions],
  );
  const questionLookupMap = new Map(sortedAllQuestions.map((question) => [question.id, question]));
  const topicNameMap = new Map(topics.map((topic) => [topic.id, topic.name]));
  const orderedLinkedQuestions = [...activeExamQuestions].sort((left, right) => left.question_order - right.question_order);
  const linkedQuestionDetails = orderedLinkedQuestions.map((question) => {
    const lookup = questionLookupMap.get(question.question);
    const topicLabel = question.topic_name
      ? question.topic_name
      : question.topic
        ? topicNameMap.get(question.topic) ?? "Unmapped topic"
        : lookup?.topic
          ? topicNameMap.get(lookup.topic) ?? "Unmapped topic"
          : "No topic";
    return {
      ...question,
      previewText: question.question_text
        ? compactText(question.question_text, 260)
        : lookup?.question_text
          ? compactText(lookup.question_text, 260)
          : question.question_text_summary,
      explanation: question.explanation
        ? compactText(question.explanation, 220)
        : lookup?.explanation
          ? compactText(lookup.explanation, 220)
          : "",
      topicLabel,
      typeLabel: question.question_type
        ? questionTypeLabelMap[question.question_type] ?? titleCase(question.question_type)
        : lookup
          ? questionTypeLabelMap[lookup.question_type] ?? titleCase(lookup.question_type)
          : "Linked question",
      difficultyLabel: question.difficulty_level
        ? difficultyLabelMap[question.difficulty_level] ?? titleCase(question.difficulty_level)
        : lookup
          ? difficultyLabelMap[lookup.difficulty_level] ?? titleCase(lookup.difficulty_level)
          : "Unknown difficulty",
      defaultMarks: lookup?.default_marks ?? null,
      hasExplanation: question.has_explanation ?? lookup?.has_explanation ?? false,
      passageTitle: question.passage_title ?? lookup?.passage_title ?? "",
      passageText: question.passage_text ?? "",
      passageContentFormat: question.passage_content_format ?? null,
    };
  });

  const mappedToSectionsCount = linkedQuestionDetails.filter((question) => Boolean(question.section)).length;
  const mandatoryCount = linkedQuestionDetails.filter((question) => question.is_mandatory).length;
  const optionalCount = linkedQuestionDetails.length - mandatoryCount;
  const unplacedCount = linkedQuestionDetails.length - mappedToSectionsCount;
  const availableHealthyCount = sortedAvailableQuestions.filter(
    (question) => question.quality_signal === "healthy" && question.is_verified && question.has_explanation,
  ).length;
  const availableRevisionQueueCount = sortedAvailableQuestions.filter(
    (question) => question.revision_priority === "urgent" || question.revision_priority === "high",
  ).length;
  const availableSkipRiskCount = sortedAvailableQuestions.filter(
    (question) => question.quality_signal === "skip_risk",
  ).length;
  const totalPages = Math.max(1, Math.ceil(linkedQuestionDetails.length / pageSize));
  const currentPageQuestions = useMemo(
    () => linkedQuestionDetails.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, linkedQuestionDetails],
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  function handleExportPdf() {
    if (typeof window === "undefined" || !linkedQuestionDetails.length) {
      return;
    }

    const sectionOrderMap = new Map(activeSections.map((section) => [section.id, section.section_order]));
    const groupedQuestions = new Map<string, typeof linkedQuestionDetails>();

    for (const question of linkedQuestionDetails) {
      const key = question.section ?? "unsectioned";
      const current = groupedQuestions.get(key);
      if (current) {
        current.push(question);
      } else {
        groupedQuestions.set(key, [question]);
      }
    }

    const sectionBlocks = Array.from(groupedQuestions.entries())
      .sort(([leftKey], [rightKey]) => {
        const leftOrder = leftKey === "unsectioned" ? Number.MAX_SAFE_INTEGER : sectionOrderMap.get(leftKey) ?? Number.MAX_SAFE_INTEGER - 1;
        const rightOrder = rightKey === "unsectioned" ? Number.MAX_SAFE_INTEGER : sectionOrderMap.get(rightKey) ?? Number.MAX_SAFE_INTEGER - 1;
        return leftOrder - rightOrder;
      })
      .map(([sectionKey, questions]) => {
        const sectionTitle = sectionKey === "unsectioned"
          ? "Questions without section"
          : questions[0]?.section_title || "Section";

        const rows = questions
          .map(
            (question, index) => `
              <section class="question-card">
                <div class="question-meta">
                  <span>Q${question.question_order}</span>
                  <span>${escapeHtml(question.typeLabel)}</span>
                  <span>${escapeHtml(question.difficultyLabel)}</span>
                  <span>${escapeHtml(question.topicLabel)}</span>
                </div>
                <h3>${index + 1}. ${escapeHtml(question.question_text_summary)}</h3>
                <p>${escapeHtml(question.previewText)}</p>
                <div class="question-detail-grid">
                  <div><strong>Marks</strong><span>${escapeHtml(String(question.marks ?? question.defaultMarks ?? "0.00"))}</span></div>
                  <div><strong>Negative Marks</strong><span>${escapeHtml(String(question.negative_marks ?? "0.00"))}</span></div>
                  <div><strong>Mode</strong><span>${question.is_mandatory ? "Mandatory" : "Optional"}</span></div>
                  <div><strong>Topic</strong><span>${escapeHtml(question.topicLabel)}</span></div>
                </div>
                ${
                  question.explanation
                    ? `<div class="question-explanation"><strong>Explanation</strong><p>${escapeHtml(question.explanation)}</p></div>`
                    : ""
                }
              </section>
            `,
          )
          .join("");

        return `
          <section class="section-block">
            <div class="section-header">
              <div>
                <span class="section-eyebrow">${sectionKey === "unsectioned" ? "Supplementary Group" : "Section"}</span>
                <h2>${escapeHtml(sectionTitle)}</h2>
              </div>
              <div class="section-summary">${questions.length} question(s)</div>
            </div>
            ${rows}
          </section>
        `;
      })
      .join("");

    const formattedStartAt = startAt ? new Date(startAt).toLocaleString("en-IN") : "Not scheduled";
    const safeInstructions = instructions?.trim() ? escapeHtml(instructions.trim()) : "No specific instructions added yet.";

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(examTitle)} - Exam PDF</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 32px;
              color: #0f172a;
              background: #ffffff;
            }
            h1 {
              margin: 0;
              font-size: 30px;
              line-height: 1.2;
            }
            h2 {
              margin: 0;
              font-size: 21px;
              line-height: 1.3;
            }
            h3 {
              font-size: 18px;
              margin: 0 0 10px;
              line-height: 1.45;
            }
            .paper-header {
              border: 2px solid #c9d8f2;
              border-radius: 20px;
              padding: 24px;
              margin-bottom: 24px;
              background: linear-gradient(180deg, #ffffff, #f7faff);
            }
            .paper-eyebrow {
              display: inline-block;
              margin-bottom: 10px;
              font-size: 12px;
              font-weight: 700;
              letter-spacing: 0.12em;
              text-transform: uppercase;
              color: #1d4ed8;
            }
            .paper-meta-grid {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 12px;
              margin-top: 18px;
            }
            .paper-meta-grid article,
            .instruction-card {
              border: 1px solid #dbe4f3;
              border-radius: 14px;
              padding: 14px 16px;
              background: #ffffff;
            }
            .paper-meta-grid strong,
            .instruction-card strong {
              display: block;
              margin-bottom: 6px;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: #64748b;
            }
            .paper-meta-grid span,
            .instruction-card p,
            .summary {
              color: #475569;
              font-size: 14px;
              line-height: 1.7;
            }
            .summary {
              margin: 16px 0 0;
            }
            .section-block {
              margin-bottom: 26px;
              page-break-inside: avoid;
            }
            .section-header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 16px;
              margin-bottom: 14px;
              padding: 18px 20px;
              border: 1px solid #dbe4f3;
              border-radius: 18px;
              background: #f8fbff;
            }
            .section-eyebrow {
              display: inline-block;
              margin-bottom: 6px;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.12em;
              text-transform: uppercase;
              color: #64748b;
            }
            .section-summary {
              border: 1px solid #dbe4f3;
              border-radius: 999px;
              padding: 8px 12px;
              font-size: 12px;
              color: #475569;
              white-space: nowrap;
            }
            .question-card {
              page-break-inside: avoid;
              break-inside: avoid;
              border: 1px solid #dbe4f3;
              border-radius: 16px;
              padding: 20px;
              margin-bottom: 18px;
            }
            .question-meta {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              margin-bottom: 12px;
              font-size: 12px;
              color: #475569;
            }
            .question-meta span {
              border: 1px solid #dbe4f3;
              border-radius: 999px;
              padding: 4px 10px;
            }
            p {
              line-height: 1.7;
              white-space: pre-wrap;
            }
            .question-detail-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 12px;
              margin-top: 16px;
            }
            .question-detail-grid div,
            .question-explanation {
              border: 1px solid #e5ebf5;
              border-radius: 12px;
              padding: 12px;
            }
            .question-detail-grid strong,
            .question-explanation strong {
              display: block;
              margin-bottom: 6px;
              font-size: 12px;
              text-transform: uppercase;
              color: #64748b;
            }
            @media print {
              body {
                margin: 20px;
              }
              .section-block {
                page-break-inside: auto;
              }
            }
          </style>
        </head>
        <body>
          <section class="paper-header">
            <span class="paper-eyebrow">Exam Export</span>
            <h1>${escapeHtml(examTitle)}</h1>
            <div class="summary">${linkedQuestionDetails.length} linked question(s) exported from the builder in exam-paper format.</div>
            <div class="paper-meta-grid">
              <article><strong>Exam Code</strong><span>${escapeHtml(examCode)}</span></article>
              <article><strong>Subject</strong><span>${escapeHtml(subjectName || "General")}</span></article>
              <article><strong>Exam Type</strong><span>${escapeHtml(examType.replaceAll("_", " "))}</span></article>
              <article><strong>Duration</strong><span>${escapeHtml(String(durationMinutes ?? 0))} min</span></article>
              <article><strong>Schedule</strong><span>${escapeHtml(formattedStartAt)}</span></article>
              <article><strong>Total Questions</strong><span>${linkedQuestionDetails.length}</span></article>
            </div>
            <div class="instruction-card" style="margin-top: 14px;">
              <strong>Instructions</strong>
              <p>${safeInstructions}</p>
            </div>
          </section>
          ${sectionBlocks}
          <script>
            window.addEventListener("load", () => {
              window.focus();
              setTimeout(() => window.print(), 150);
            });
          </script>
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const printWindow = window.open(blobUrl, "_blank", "noopener,noreferrer,width=960,height=1200");

    if (!printWindow) {
      URL.revokeObjectURL(blobUrl);
      return;
    }

    const cleanup = () => {
      URL.revokeObjectURL(blobUrl);
      printWindow.removeEventListener("afterprint", cleanup);
    };

    printWindow.addEventListener("afterprint", cleanup);
    setTimeout(() => {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch {
        // Ignore cleanup failures for closed popups.
      }
    }, 60_000);
  }

  return (
    <article className="dashboardPanel builderPanel" id="linked-questions">
      <div className="builderPanelHeader">
        <div>
          <span className="builderFlowLabel">Question mapping</span>
          <strong>Linked Questions</strong>
          <p>Attach question-bank items to the exam shell, preview what is already selected, and keep order, section placement, and scoring overrides under control.</p>
        </div>
        <div className="builderPanelMetrics">
          <article className="builderMetricChip">
            <span>Attached</span>
            <strong>{linkedQuestionDetails.length}</strong>
          </article>
          <article className="builderMetricChip">
            <span>Available in bank</span>
            <strong>{availableQuestions.length}</strong>
          </article>
          <article className="builderMetricChip">
            <span>Healthy</span>
            <strong>{availableHealthyCount}</strong>
          </article>
          <article className="builderMetricChip">
            <span>Revision queue</span>
            <strong>{availableRevisionQueueCount}</strong>
          </article>
          <article className="builderMetricChip">
            <span>Skip risk</span>
            <strong>{availableSkipRiskCount}</strong>
          </article>
        </div>
      </div>

      <div className="builderQuestionOverviewGrid">
        <article className="builderQuestionOverviewCard">
          <span>Section mapped</span>
          <strong>{mappedToSectionsCount}</strong>
          <p>{unplacedCount} still sitting outside a section.</p>
        </article>
        <article className="builderQuestionOverviewCard">
          <span>Mandatory</span>
          <strong>{mandatoryCount}</strong>
          <p>{optionalCount} optional question(s) remain flexible.</p>
        </article>
        <article className="builderQuestionOverviewCard">
          <span>Sequence coverage</span>
          <strong>{linkedQuestionDetails.length ? `Q1-Q${linkedQuestionDetails.length}` : "Empty"}</strong>
          <p>Ordered preview of the current exam flow.</p>
        </article>
      </div>

      <div className="builderQuestionToolbar">
        <div className="builderQuestionToolbarCopy">
          <strong>Question list view</strong>
          <span>
            Showing {linkedQuestionDetails.length ? (currentPage - 1) * pageSize + 1 : 0}-
            {Math.min(currentPage * pageSize, linkedQuestionDetails.length)} of {linkedQuestionDetails.length} linked question(s)
          </span>
        </div>
        <div className="builderQuestionToolbarActions">
          <button
            className="button buttonGhost"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            type="button"
          >
            Previous Page
          </button>
          <span className="builderQuestionPageIndicator">Page {totalPages ? currentPage : 0} of {totalPages}</span>
          <button
            className="button buttonGhost"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            type="button"
          >
            Next Page
          </button>
          <button
            className="button buttonSecondary"
            disabled={!linkedQuestionDetails.length}
            onClick={handleExportPdf}
            type="button"
          >
            Export as PDF
          </button>
        </div>
      </div>

      <div className="builderStack">
        {currentPageQuestions.map((question) => (
          <article className="builderQuestionCard" key={question.id}>
            <div className="builderQuestionCardHeader">
              <div className="builderQuestionCardCopy">
                <div className="builderQuestionTagRow">
                  <span className="statusPill statusLive">Q{question.question_order}</span>
                  <span className="statusPill statusDemo">{question.typeLabel}</span>
                  <span className="statusPill">{question.topicLabel}</span>
                  {question.passageTitle ? (
                    <span className="statusPill statusDemo">Comprehension</span>
                  ) : null}
                </div>
                <strong>{question.question_text_summary}</strong>
                <p>{question.previewText}</p>
              </div>
              <div className="builderQuestionStatStack">
                <span>{question.marks ?? question.defaultMarks ?? "0.00"} marks</span>
                <span>{question.negative_marks ?? "0.00"} negative</span>
                <span>{question.is_mandatory ? "Mandatory" : "Optional"}</span>
              </div>
            </div>

            <div className="builderQuestionInfoGrid">
              <div>
                <span>Section</span>
                <strong>{question.section_title || "No section"}</strong>
              </div>
              <div>
                <span>Difficulty</span>
                <strong>{question.difficultyLabel}</strong>
              </div>
              <div>
                <span>Explanation</span>
                <strong>{question.hasExplanation ? "Available" : "Missing"}</strong>
              </div>
              <div>
                <span>Passage</span>
                <strong>{question.passageTitle || "Standalone"}</strong>
              </div>
              <div>
                <span>Linked on</span>
                <strong>{new Date(question.created_at).toLocaleDateString("en-IN")}</strong>
              </div>
            </div>

            {question.passageTitle ? (
              <details className="builderQuestionPreviewPanel">
                <summary>Preview shared passage</summary>
                <strong>{question.passageTitle}</strong>
                <RichContentRenderer
                  emptyFallback={<p>Passage text will load from the linked comprehension set.</p>}
                  format={question.passageContentFormat}
                  text={question.passageText || ""}
                />
              </details>
            ) : null}

            {question.explanation ? (
              <details className="builderQuestionPreviewPanel">
                <summary>Preview explanation</summary>
                <p>{question.explanation}</p>
              </details>
            ) : null}

            <div className="builderQuestionPreviewActions">
              <BuilderQuestionPreviewTrigger
                buttonClassName="button buttonGhost"
                buttonLabel="Open Full Preview"
                difficultyLabel={question.difficultyLabel}
                explanation={question.explanation}
                mandatoryLabel={question.is_mandatory ? "Mandatory" : "Optional"}
                marksLabel={`${question.marks ?? question.defaultMarks ?? "0.00"} marks`}
                negativeMarksLabel={`${question.negative_marks ?? "0.00"} negative`}
                questionId={question.question}
                questionOrderLabel={`Q${question.question_order}`}
                questionText={question.previewText}
                questionTypeLabel={question.typeLabel}
                sectionLabel={question.section_title || "No section"}
                topicLabel={question.topicLabel}
              />
            </div>

            <div className="builderQuestionCardFooter">
              <form action={updateQuestionLinkAction} className="builderQuestionEditorGrid">
                <input name="exam_id" type="hidden" value={examId} />
                <input name="exam_question_id" type="hidden" value={question.id} />

                <label className="fieldStack">
                  <span>Section</span>
                  <select defaultValue={question.section ?? ""} name="section">
                    <option value="">No section</option>
                    {activeSections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="fieldStack">
                  <span>Order</span>
                  <input defaultValue={question.question_order} min="1" name="question_order" type="number" />
                </label>

                <label className="fieldStack">
                  <span>Marks</span>
                  <input defaultValue={question.marks ?? ""} min="0" name="marks" step="0.01" type="number" />
                </label>

                <label className="fieldStack">
                  <span>Negative marks</span>
                  <input defaultValue={question.negative_marks ?? ""} min="0" name="negative_marks" step="0.01" type="number" />
                </label>

                <label className="builderInlineCheckbox builderInlineCheckboxCard">
                  <input defaultChecked={question.is_mandatory} name="is_mandatory" type="checkbox" />
                  Mandatory question
                </label>

                <div className="builderQuestionActionRow">
                  <ActionSubmitButton
                    className="button buttonSecondary"
                    idleLabel="Save Changes"
                    pendingLabel="Saving..."
                  />
                </div>
              </form>

              <form action={deleteQuestionLinkAction} className="builderQuestionRemoveForm">
                <input name="exam_id" type="hidden" value={examId} />
                <input name="exam_question_id" type="hidden" value={question.id} />
                <ActionSubmitButton
                  className="button buttonGhost"
                  idleLabel="Remove"
                  pendingLabel="Removing..."
                />
              </form>
            </div>
          </article>
        ))}

        {!linkedQuestionDetails.length ? (
          <div className="builderEmptyState">
            <strong>No questions linked yet</strong>
            <p>Choose from the scoped question inventory below and start building the live paper order.</p>
          </div>
        ) : null}
      </div>

      {linkedQuestionDetails.length > pageSize ? (
        <div className="builderQuestionPaginationFooter">
          <button
            className="button buttonGhost"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            type="button"
          >
            Previous
          </button>
          <div className="builderQuestionPaginationNumbers">
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <button
                className={`button ${pageNumber === currentPage ? "buttonPrimary" : "buttonGhost"} builderQuestionPageButton`}
                key={pageNumber}
                onClick={() => setCurrentPage(pageNumber)}
                type="button"
              >
                {pageNumber}
              </button>
            ))}
          </div>
          <button
            className="button buttonGhost"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            type="button"
          >
            Next
          </button>
        </div>
      ) : null}

      <form action={addQuestionLinkAction} className="builderForm builderSubform">
        <input name="exam_id" type="hidden" value={examId} />

        <div className="builderMiniBanner">
          <div>
            <strong>Attach one question manually</strong>
            <span>Choose from the remaining scoped bank. Already linked questions stay visible above so you can avoid duplicate mapping mistakes.</span>
          </div>
          <Link className="button buttonGhost" href={academicSetupHref}>
            Open Academic Setup
          </Link>
        </div>

        <div className="builderGrid compact">
          <label className="fieldStack fieldStackFull">
            <span>Question</span>
            <select name="question" required>
              <option value="">Select a question</option>
              {sortedAvailableQuestions.map((question) => {
                const topicLabel = question.topic ? topicNameMap.get(question.topic) ?? "Unmapped topic" : "No topic";
                const typeLabel = questionTypeLabelMap[question.question_type] ?? titleCase(question.question_type);
                const difficultyLabel = difficultyLabelMap[question.difficulty_level] ?? titleCase(question.difficulty_level);

                return (
                  <option key={question.id} value={question.id}>
                    {topicLabel} · {typeLabel} · {difficultyLabel} · {titleCase(question.quality_signal)} · {titleCase(question.revision_priority)} · {compactText(question.question_text, 90)}
                    {question.passage_title ? ` · Comprehension: ${question.passage_title}` : ""}
                  </option>
                );
              })}
            </select>
          </label>

          <label className="fieldStack">
            <span>Section</span>
            <select name="section">
              <option value="">No section</option>
              {activeSections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </label>

          <label className="fieldStack">
            <span>Question order</span>
            <input defaultValue={linkedQuestionDetails.length + 1} min="1" name="question_order" required type="number" />
          </label>

          <label className="fieldStack">
            <span>Marks</span>
            <input min="0" name="marks" step="0.01" type="number" />
          </label>

          <label className="fieldStack">
            <span>Negative marks</span>
            <input min="0" name="negative_marks" step="0.01" type="number" />
          </label>
        </div>

        <div className="toggleGrid">
          <label><input defaultChecked name="is_mandatory" type="checkbox" /> Mandatory question</label>
        </div>

        <div className="builderAttachQualityGuide">
          <span className="statusPill statusLive">Healthy</span>
          <span className="statusPill statusWarning">Watch / Hard / Skip risk</span>
          <span className="statusPill statusDemo">Ambiguous / Revision candidate</span>
          <small>The attach list is ordered with the safest reusable questions first.</small>
        </div>

        <div className="settingsActionRow">
          <ActionSubmitButton
            className="button buttonSecondary"
            idleLabel="Attach Question"
            pendingLabel="Attaching..."
          />
        </div>
      </form>

      <BuilderRapidAttach
        action={bulkAddQuestionLinksAction}
        difficultyLabelMap={difficultyLabelMap}
        difficultyOptions={difficultyOptions}
        examId={examId}
        nextOrder={linkedQuestionDetails.length + 1}
        questionTypeLabelMap={questionTypeLabelMap}
        questions={availableQuestions}
        sections={activeSections.map((section) => ({ id: section.id, name: section.name }))}
        topics={topics}
      />
    </article>
  );
}
