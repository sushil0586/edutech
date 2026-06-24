import type { StudentSectionMediaContext } from "@/features/dashboard/types";
import { titleCaseState } from "@/lib/student/formatters";

type StudentSectionMediaPanelProps = {
  context: StudentSectionMediaContext;
};

function buildMediaHighlights(context: StudentSectionMediaContext) {
  const highlights: string[] = [];

  if (context.supports_audio_prompt) {
    highlights.push("Audio prompts");
  }
  if (context.supports_video_prompt) {
    highlights.push("Video prompts");
  }
  if (context.supports_document_prompt) {
    highlights.push("Reference documents");
  }
  if (context.supports_visual_prompt) {
    highlights.push("Visual references");
  }

  return highlights;
}

export function StudentSectionMediaPanel({
  context,
}: StudentSectionMediaPanelProps) {
  if (!context.has_media) {
    return null;
  }

  const highlights = buildMediaHighlights(context);
  const sectionLabel = context.section_name || "Current flow";

  return (
    <section className="studentSectionMediaPanel" aria-label="Section media guidance">
      <div className="studentSectionMediaPanelHeader">
        <div>
          <span className="studentSectionMediaPanelEyebrow">Section media guidance</span>
          <strong>{sectionLabel}</strong>
          <p>{context.learner_notice}</p>
        </div>
        <div className="questionBankTagRow">
          <span className="questionBankTagChip">
            {context.questions_with_media} of {context.question_count} question
            {context.question_count === 1 ? "" : "s"} use media
          </span>
          <span className="questionBankTagChip">
            {context.total_attachments} attachment
            {context.total_attachments === 1 ? "" : "s"}
          </span>
          <span className="questionBankTagChip">
            {titleCaseState(context.recommended_experience)}
          </span>
        </div>
      </div>

      <div className="studentSectionMediaPanelGrid">
        <article className="studentSectionMediaPanelCard">
          <span>Prompt types</span>
          <strong>{highlights.length ? highlights.join(" • ") : "Reference media"}</strong>
        </article>
        <article className="studentSectionMediaPanelCard">
          <span>Delivery</span>
          <strong>
            {context.delivery_modes.length
              ? context.delivery_modes.map((mode) => titleCaseState(mode)).join(" • ")
              : "Standard"}
          </strong>
        </article>
        <article className="studentSectionMediaPanelCard">
          <span>Preload strategy</span>
          <strong>
            {context.preload_strategies.length
              ? context.preload_strategies
                  .map((strategy) => titleCaseState(strategy))
                  .join(" • ")
              : "None"}
          </strong>
        </article>
      </div>
    </section>
  );
}
