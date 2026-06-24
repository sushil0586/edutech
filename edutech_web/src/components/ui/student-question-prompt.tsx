import { ComprehensionPassageTrigger } from "@/components/ui/comprehension-passage-trigger";
import { StudentQuestionMediaPanel } from "@/components/ui/student-question-media-panel";
import type {
  AssessmentQuestionTypeDefinition,
  StudentExamQuestionDetail,
} from "@/features/dashboard/types";
import { buildQuestionTypePresentationProfile } from "@/lib/assessment/question-type-presentation";

type StudentQuestionPromptData = {
  question_text: string;
  assertion_text?: string;
  reason_text?: string;
  matrix_left_items?: string[];
  matrix_right_items?: string[];
  question_type_definition: AssessmentQuestionTypeDefinition | null;
  passage_detail?: {
    title: string;
    content_format: string;
    passage_text: string;
    description: string;
  } | null;
  attachments?: StudentExamQuestionDetail["attachments"];
  media_context?: StudentExamQuestionDetail["media_context"];
};

type StudentQuestionPromptProps = {
  question: StudentQuestionPromptData;
  passageBadgeLabel?: string;
  passageButtonClassName?: string;
  passageButtonLabel?: string;
  passageMetaLabel?: string;
  showPassageTrigger?: boolean;
};

export function getStudentQuestionPromptTitle(question: StudentQuestionPromptData) {
  const presentationProfile = buildQuestionTypePresentationProfile(question.question_type_definition);

  if (
    presentationProfile.showsAssertionReasonFields &&
    (question.assertion_text || question.reason_text)
  ) {
    return "Assertion / Reason";
  }

  return question.question_text.trim() || "Question";
}

export function StudentQuestionPrompt({
  question,
  passageBadgeLabel = "Shared passage linked",
  passageButtonClassName = "button buttonGhost",
  passageButtonLabel = "Read Passage",
  passageMetaLabel,
  showPassageTrigger = false,
}: StudentQuestionPromptProps) {
  const presentationProfile = buildQuestionTypePresentationProfile(question.question_type_definition);

  return (
    <div className="attemptQuestionPrompt">
      {showPassageTrigger && question.passage_detail?.passage_text ? (
        <div className="questionBankChipRow">
          <span className="questionBankTagChip">{passageBadgeLabel}</span>
          <ComprehensionPassageTrigger
            badgeLabel="Comprehension"
            buttonClassName={passageButtonClassName}
            buttonLabel={passageButtonLabel}
            contentFormat={question.passage_detail.content_format}
            description={question.passage_detail.description}
            metaLabel={passageMetaLabel || question.passage_detail.title || "Shared context"}
            passageText={question.passage_detail.passage_text}
            title={question.passage_detail.title}
          />
        </div>
      ) : null}

      {presentationProfile.showsAssertionReasonFields &&
      (question.assertion_text || question.reason_text) ? (
        <div className="attemptQuestionStatementStack">
          {question.assertion_text ? (
            <div className="builderEmptyState">
              <strong>Assertion</strong>
              <p className="studentNotificationMessage">{question.assertion_text}</p>
            </div>
          ) : null}
          {question.reason_text ? (
            <div className="builderEmptyState">
              <strong>Reason</strong>
              <p className="studentNotificationMessage">{question.reason_text}</p>
            </div>
          ) : null}
        </div>
      ) : presentationProfile.showsMatrixMatchFields &&
        ((question.matrix_left_items?.length ?? 0) > 0 ||
          (question.matrix_right_items?.length ?? 0) > 0) ? (
        <div className="attemptQuestionStatementStack">
          <p className="studentNotificationMessage">{question.question_text}</p>
          <div className="builderGrid compact">
            <div className="builderEmptyState">
              <strong>Column I</strong>
              {question.matrix_left_items?.map((item, index) => (
                <p className="studentNotificationMessage" key={`left-${index}`}>
                  {String.fromCharCode(65 + index)}. {item}
                </p>
              ))}
            </div>
            <div className="builderEmptyState">
              <strong>Column II</strong>
              {question.matrix_right_items?.map((item, index) => (
                <p className="studentNotificationMessage" key={`right-${index}`}>
                  {index + 1}. {item}
                </p>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="studentNotificationMessage">{question.question_text}</p>
      )}

      {question.media_context?.has_media && question.attachments?.length ? (
        <StudentQuestionMediaPanel
          attachments={question.attachments}
          mediaContext={question.media_context}
        />
      ) : null}
    </div>
  );
}
