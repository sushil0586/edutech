import { questionTypeLabel } from "@/lib/student/formatters";

type ReviewGuidancePanelProps = {
  questionText: string;
  questionType: string;
  questionTypeLabelOverride?: string | null;
  questionMarks: string;
  reviewGuidance: string;
  rubricChecklist: string[];
};

export function ReviewGuidancePanel({
  questionText,
  questionType,
  questionTypeLabelOverride,
  questionMarks,
  reviewGuidance,
  rubricChecklist,
}: ReviewGuidancePanelProps) {
  const resolvedQuestionTypeLabel =
    questionTypeLabelOverride?.trim() || questionTypeLabel(questionType);

  return (
    <section className="attemptReviewGuidancePanel">
      <div className="sectionHeading">
        <strong>Reviewer guidance</strong>
        <span>{questionMarks} marks</span>
      </div>

      <div className="questionBankTagRow">
        <span className="questionBankTagChip">{resolvedQuestionTypeLabel}</span>
        <span className="questionBankTagChip">Max marks: {questionMarks}</span>
      </div>

      <div className="attemptReviewGuidanceBlock">
        <strong>Prompt</strong>
        <p>{questionText}</p>
      </div>

      {reviewGuidance ? (
        <div className="attemptReviewGuidanceBlock">
          <strong>Scoring notes</strong>
          <p>{reviewGuidance}</p>
        </div>
      ) : null}

      {rubricChecklist.length ? (
        <div className="attemptReviewGuidanceBlock">
          <strong>Checklist</strong>
          <ul className="attemptReviewChecklist">
            {rubricChecklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
