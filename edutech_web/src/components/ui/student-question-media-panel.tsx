import { StudentAttachmentPreviewTrigger } from "@/components/ui/student-attachment-preview-trigger";
import type { StudentExamQuestionDetail } from "@/features/dashboard/types";
import { titleCaseState } from "@/lib/student/formatters";

type StudentQuestionMediaPanelProps = {
  attachments: StudentExamQuestionDetail["attachments"];
  mediaContext: StudentExamQuestionDetail["media_context"];
};

function previewKindForAttachment(attachmentType: string) {
  switch (attachmentType) {
    case "image":
    case "diagram":
      return "image" as const;
    case "pdf":
      return "pdf" as const;
    case "audio":
      return "audio" as const;
    case "video":
      return "video" as const;
    default:
      return "other" as const;
  }
}

function resolveAttachmentHref(attachment: StudentExamQuestionDetail["attachments"][number]) {
  return attachment.file_url || attachment.file || "";
}

export function StudentQuestionMediaPanel({
  attachments,
  mediaContext,
}: StudentQuestionMediaPanelProps) {
  if (!attachments.length) {
    return null;
  }

  return (
    <section className="studentQuestionMediaPanel" aria-label="Question media">
      <div className="studentQuestionMediaPanelHeader">
        <div>
          <strong>Question media</strong>
          <p>
            {mediaContext.supports_audio_prompt
              ? "Play the prompt and keep this panel open while you answer."
              : "Open the linked references before submitting your response."}
          </p>
        </div>
        <div className="questionBankTagRow">
          <span className="questionBankTagChip">
            {mediaContext.total_attachments} attachment
            {mediaContext.total_attachments === 1 ? "" : "s"}
          </span>
          <span className="questionBankTagChip">
            {titleCaseState(mediaContext.delivery_mode)}
          </span>
          <span className="questionBankTagChip">
            {titleCaseState(mediaContext.preload_strategy)}
          </span>
        </div>
      </div>

      <div className="questionPreviewAttachmentGrid">
        {attachments.map((attachment) => (
          <article className="questionPreviewAttachmentCard" key={attachment.id}>
            <div className="questionPreviewAttachmentCopy">
              <div className="questionBankTagRow">
                <strong>{attachment.title || titleCaseState(attachment.attachment_type)}</strong>
                <span className="questionBankTagChip">
                  {titleCaseState(attachment.attachment_type)}
                </span>
                {attachment.is_inline ? (
                  <span className="questionBankTagChip">Inline enabled</span>
                ) : null}
              </div>
              <p>{attachment.alt_text || "Question reference media"}</p>
              <div className="studentQuestionMediaPanelActions">
                <StudentAttachmentPreviewTrigger
                  altText={attachment.alt_text || attachment.title || "Question media"}
                  href={resolveAttachmentHref(attachment)}
                  kind={previewKindForAttachment(attachment.attachment_type)}
                  title={attachment.title || titleCaseState(attachment.attachment_type)}
                />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
