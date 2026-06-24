"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { RichContentRenderer } from "@/components/ui/rich-content-renderer";

type ComprehensionPassageTriggerProps = {
  title: string;
  passageText: string;
  description?: string | null;
  buttonLabel?: string;
  buttonClassName?: string;
  badgeLabel?: string | null;
  contentFormat?: string | null;
  metaLabel?: string | null;
};

export function ComprehensionPassageTrigger({
  title,
  passageText,
  description,
  buttonLabel = "Open Passage",
  buttonClassName = "button buttonGhost",
  badgeLabel = "Comprehension",
  contentFormat,
  metaLabel,
}: ComprehensionPassageTriggerProps) {
  const portalTarget = typeof document === "undefined" ? null : document.body;
  const [open, setOpen] = useState(false);

  const normalizedTitle = useMemo(
    () => title.replaceAll("\n", " ").trim() || "Comprehension passage",
    [title],
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

  const modal = open && portalTarget
    ? createPortal(
        <div
          className="questionPreviewOverlay comprehensionPassageOverlay"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            aria-labelledby="comprehension-passage-title"
            aria-modal="true"
            className="questionPreviewDialog comprehensionPassageDialog"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="questionPreviewHeader comprehensionPassageHeader">
              <div>
                <span className="eyebrow">Shared Passage</span>
                <h2 id="comprehension-passage-title">{normalizedTitle}</h2>
              </div>
              <button
                className="button buttonGhost"
                onClick={() => setOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="questionPreviewBody comprehensionPassageBody">
              <div className="questionBankChipRow comprehensionPassageMetaRow">
                {badgeLabel ? <span className="questionBankMetaChip">{badgeLabel}</span> : null}
                {metaLabel ? <span className="questionBankMetaChip">{metaLabel}</span> : null}
              </div>

              <section className="questionPreviewSection comprehensionPassageSection">
                <strong>Passage</strong>
                <RichContentRenderer
                  className="comprehensionPassageCopy"
                  emptyFallback={<p>No passage text was provided.</p>}
                  format={contentFormat}
                  text={passageText}
                />
              </section>

              {description?.trim() ? (
                <section className="questionPreviewSection comprehensionPassageSection">
                  <strong>Notes</strong>
                  <RichContentRenderer
                    className="comprehensionPassageNotes"
                    format={contentFormat}
                    text={description.trim()}
                  />
                </section>
              ) : null}
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
