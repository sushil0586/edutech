"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { RichContentRenderer } from "@/components/ui/rich-content-renderer";
import type { TeacherQuestion } from "@/lib/api/teacher-builder";

type BuilderQuestionPreviewTriggerProps = {
  questionId: string;
  questionText: string;
  explanation?: string | null;
  questionTypeLabel: string;
  difficultyLabel: string;
  marksLabel: string;
  negativeMarksLabel?: string | null;
  topicLabel?: string | null;
  sectionLabel?: string | null;
  questionOrderLabel?: string | null;
  mandatoryLabel?: string | null;
  buttonClassName?: string;
  buttonLabel?: string;
};

function renderAttachmentPreview(attachment: TeacherQuestion["attachments"][number]) {
  const source = attachment.file_url || attachment.file;

  if (!source) {
    return null;
  }

  if (attachment.attachment_type === "image" || attachment.attachment_type === "diagram") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={attachment.alt_text || attachment.title || "Question attachment"}
        className="questionPreviewAttachmentMedia"
        src={source}
      />
    );
  }

  if (attachment.attachment_type === "pdf") {
    return (
      <iframe
        className="questionPreviewAttachmentFrame"
        src={source}
        title={attachment.title || "Attachment preview"}
      />
    );
  }

  if (attachment.attachment_type === "audio") {
    return <audio className="questionPreviewAttachmentAudio" controls src={source} />;
  }

  if (attachment.attachment_type === "video") {
    return <video className="questionPreviewAttachmentVideo" controls src={source} />;
  }

  return null;
}

export function BuilderQuestionPreviewTrigger({
  questionId,
  questionText,
  explanation,
  questionTypeLabel,
  difficultyLabel,
  marksLabel,
  negativeMarksLabel,
  topicLabel,
  sectionLabel,
  questionOrderLabel,
  mandatoryLabel,
  buttonClassName = "button buttonGhost",
  buttonLabel = "Preview",
}: BuilderQuestionPreviewTriggerProps) {
  const portalTarget = typeof document === "undefined" ? null : document.body;
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<TeacherQuestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const title = useMemo(
    () => questionText.replaceAll("\n", " ").trim() || "Untitled question",
    [questionText],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || detail || isLoading) {
      return;
    }

    const controller = new AbortController();

    async function loadDetail() {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/teacher/question-bank/questions/${questionId}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Unable to load full question details right now.");
        }

        const payload = (await response.json()) as TeacherQuestion;
        if (!controller.signal.aborted) {
          setDetail(payload);
        }
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          loadError instanceof Error && loadError.message
            ? loadError.message
            : "Unable to load full question details right now.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      controller.abort();
    };
  }, [detail, isLoading, open, questionId]);

  const modal = open && portalTarget
    ? createPortal(
        <div
          className="questionPreviewOverlay"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            aria-labelledby={`builder-question-preview-${questionId}`}
            aria-modal="true"
            className="questionPreviewDialog"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="questionPreviewHeader">
              <div>
                <span className="eyebrow">Question Preview</span>
                <h2 id={`builder-question-preview-${questionId}`}>{title}</h2>
              </div>
              <button
                className="button buttonGhost"
                onClick={() => setOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="questionPreviewBody">
              <div className="questionBankChipRow">
                {detail?.passage_detail?.title ? (
                  <span className="questionBankMetaChip">
                    Comprehension: {detail.passage_detail.title}
                  </span>
                ) : null}
                <span className="questionBankMetaChip">{questionTypeLabel}</span>
                <span className="questionBankMetaChip">{difficultyLabel}</span>
                <span className="questionBankMetaChip">{marksLabel}</span>
                {negativeMarksLabel ? (
                  <span className="questionBankMetaChip">{negativeMarksLabel}</span>
                ) : null}
                {topicLabel ? <span className="questionBankMetaChip">{topicLabel}</span> : null}
                {sectionLabel ? <span className="questionBankMetaChip">{sectionLabel}</span> : null}
                {questionOrderLabel ? <span className="questionBankMetaChip">{questionOrderLabel}</span> : null}
                {mandatoryLabel ? <span className="statusPill statusDemo">{mandatoryLabel}</span> : null}
              </div>

              {detail?.tag_maps.length ? (
                <div className="questionBankTagRow">
                  {detail.tag_maps.map((tagMap) => (
                    <span className="questionBankTagChip" key={tagMap.id}>
                      {tagMap.tag_detail.name}
                    </span>
                  ))}
                </div>
              ) : null}

              <section className="questionPreviewSection">
                <strong>Question text</strong>
                <p>{detail?.question_text.trim() || title || "No question text was provided."}</p>
              </section>

              {detail?.passage_detail?.passage_text ? (
                <section className="questionPreviewSection">
                  <strong>Shared passage</strong>
                  <RichContentRenderer
                    format={detail.passage_detail.content_format}
                    text={detail.passage_detail.passage_text.trim()}
                  />
                  {detail.passage_detail.description?.trim() ? (
                    <RichContentRenderer
                      className="emptyText"
                      format={detail.passage_detail.content_format}
                      text={detail.passage_detail.description.trim()}
                    />
                  ) : null}
                </section>
              ) : null}

              <section className="questionPreviewSection">
                <strong>Explanation</strong>
                <p>
                  {detail?.explanation.trim() ||
                    explanation?.trim() ||
                    "No teacher explanation has been added yet."}
                </p>
              </section>

              <section className="questionPreviewSection">
                <strong>Answer options</strong>
                {detail ? (
                  detail.options.length ? (
                    <div className="questionBankOptionsList">
                      {detail.options.map((option) => (
                        <div
                          className="questionBankOptionRow"
                          key={option.id ?? `${detail.id}-${option.option_order}`}
                        >
                          <span>{option.is_correct ? "✓" : "○"}</span>
                          <p>{option.option_text}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="emptyText">No options were returned for this question.</p>
                  )
                ) : isLoading ? (
                  <p className="emptyText">Loading full question details...</p>
                ) : error ? (
                  <p className="emptyText">{error}</p>
                ) : (
                  <p className="emptyText">Open preview to load answer options.</p>
                )}
              </section>

              {detail?.attachments.length ? (
                <section className="questionPreviewSection">
                  <strong>Attachments</strong>
                  <div className="questionPreviewAttachmentGrid">
                    {detail.attachments.map((attachment) => (
                      <article className="questionPreviewAttachmentCard" key={attachment.id}>
                        <div className="questionPreviewAttachmentCopy">
                          <strong>{attachment.title || "Attachment"}</strong>
                          <div className="questionBankChipRow">
                            <span className="questionBankMetaChip">{attachment.attachment_type}</span>
                            {attachment.is_inline ? (
                              <span className="questionBankTagChip">Inline enabled</span>
                            ) : null}
                          </div>
                          {renderAttachmentPreview(attachment)}
                          {attachment.alt_text ? <p>{attachment.alt_text}</p> : null}
                          <a
                            className="button buttonGhost"
                            href={attachment.file_url || attachment.file}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Open file
                          </a>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ) : detail && !detail.attachments.length ? null : isLoading ? (
                <section className="questionPreviewSection">
                  <strong>Attachments</strong>
                  <p className="emptyText">Loading attachment details...</p>
                </section>
              ) : null}
            </div>

            <div className="questionPreviewFooter">
              <button
                className="button buttonGhost"
                onClick={() => {
                  navigator.clipboard.writeText(detail?.question_text || questionText).catch(() => undefined);
                }}
                type="button"
              >
                Copy Question Text
              </button>
            </div>
          </div>
        </div>,
        portalTarget,
      )
    : null;

  return (
    <>
      <button
        className={buttonClassName}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        type="button"
      >
        {buttonLabel}
      </button>
      {modal}
    </>
  );
}
