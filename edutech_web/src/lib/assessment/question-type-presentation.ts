import {
  questionTypeIsAssertionReason,
  questionTypeIsFillInBlanks,
  questionTypeIsMatrixMatch,
  questionTypeIsNumericResponse,
  questionTypeIsTrueFalse,
  questionTypeRequiresManualReview,
  questionTypeSupportsAcceptedAnswers,
  questionTypeSupportsNumericTolerance,
  questionTypeSupportsOptions,
  questionTypeSupportsReviewGuidance,
  questionTypeSupportsTextAnswer,
  type AppQuestionTypeDefinition,
} from "@/lib/assessment/question-type";

export type QuestionTypePresentationProfile = {
  questionTextLabel: string;
  questionTextPlaceholder: string;
  questionTextRows: number;
  questionTextHidden: boolean;
  questionTextHelper: string | null;
  acceptedAnswersLabel: string;
  acceptedAnswersPlaceholder: string;
  acceptedAnswersHelper: string | null;
  responseInputPlaceholder: string;
  responseInputRows: number;
  responseInputHelper: string | null;
  reviewGuidanceLabel: string;
  reviewGuidancePlaceholder: string;
  reviewGuidanceHelper: string | null;
  showsAssertionReasonFields: boolean;
  showsMatrixMatchFields: boolean;
  showsRubricCriteria: boolean;
  supportsAcceptedAnswers: boolean;
  supportsNumericTolerance: boolean;
  supportsReviewGuidance: boolean;
  supportsOptions: boolean;
  supportsTextAnswer: boolean;
  optionsAreLocked: boolean;
  allowsAddOption: boolean;
  allowsRemoveOption: boolean;
  optionsHint: string | null;
};

export function buildQuestionTypePresentationProfile(
  definition: AppQuestionTypeDefinition,
): QuestionTypePresentationProfile {
  const isAssertionReason = questionTypeIsAssertionReason(definition);
  const isFillInBlanks = questionTypeIsFillInBlanks(definition);
  const isMatrixMatch = questionTypeIsMatrixMatch(definition);
  const isNumericAnswer = questionTypeIsNumericResponse(definition);
  const isTrueFalse = questionTypeIsTrueFalse(definition);
  const supportsOptions = questionTypeSupportsOptions(definition);
  const supportsTextAnswer = questionTypeSupportsTextAnswer(definition);
  const supportsAcceptedAnswers = questionTypeSupportsAcceptedAnswers(definition);
  const supportsNumericTolerance = questionTypeSupportsNumericTolerance(definition);
  const supportsReviewGuidance = questionTypeSupportsReviewGuidance(definition);
  const requiresManualReview = questionTypeRequiresManualReview(definition);

  const questionTextLabel = isAssertionReason ? "Question prompt" : "Question text";
  const questionTextPlaceholder = "Write the question prompt";
  const questionTextHidden = isAssertionReason;
  const questionTextHelper = isAssertionReason
    ? "This structured type builds the learner prompt from the assertion and reason blocks below."
    : null;

  const acceptedAnswersLabel = isNumericAnswer
    ? "Accepted numeric answers"
    : isFillInBlanks
      ? "Blank answers in order"
      : "Accepted answers";
  const acceptedAnswersPlaceholder = isNumericAnswer
    ? "Example: 42\n42.0"
    : isFillInBlanks
      ? "One accepted answer per blank.\nExample:\nS3\nobjects"
      : "One answer per line or separated by commas";
  const acceptedAnswersHelper = isNumericAnswer
    ? "Add one or more valid numeric answers. Each line is treated as an accepted value."
    : isFillInBlanks
      ? "Use [[blank]] markers inside the prompt and add one accepted answer per blank in the same order."
      : supportsAcceptedAnswers
        ? "Add one or more accepted responses. Each line becomes an allowed answer variant."
        : null;

  const responseInputPlaceholder = isFillInBlanks
    ? "Enter one answer per blank in order. Use | or a new line between blanks."
    : "Write your answer here";
  const responseInputRows = isFillInBlanks ? 3 : 5;
  const responseInputHelper = isFillInBlanks
    ? "This prompt uses blank placeholders. Submit answers in the same order as the blanks."
    : null;

  const reviewGuidanceLabel = "Review guidance";
  const reviewGuidancePlaceholder =
    "Add rubric notes, scoring expectations, structure hints, or reviewer checkpoints";
  const reviewGuidanceHelper = supportsReviewGuidance
    ? "This guidance helps teachers review essay responses consistently after submission."
    : null;

  const optionsAreLocked = isAssertionReason;
  const allowsAddOption = supportsOptions && !isTrueFalse && !isAssertionReason;
  const allowsRemoveOption = supportsOptions && !isTrueFalse && !isAssertionReason;
  const optionsHint = isAssertionReason
    ? "Assertion / Reason uses a fixed four-option pattern so comparison remains consistent across exams."
    : null;

  return {
    questionTextLabel,
    questionTextPlaceholder,
    questionTextRows: 5,
    questionTextHidden,
    questionTextHelper,
    acceptedAnswersLabel,
    acceptedAnswersPlaceholder,
    acceptedAnswersHelper,
    responseInputPlaceholder,
    responseInputRows,
    responseInputHelper,
    reviewGuidanceLabel,
    reviewGuidancePlaceholder,
    reviewGuidanceHelper,
    showsAssertionReasonFields: isAssertionReason,
    showsMatrixMatchFields: isMatrixMatch,
    showsRubricCriteria: requiresManualReview,
    supportsAcceptedAnswers,
    supportsNumericTolerance,
    supportsReviewGuidance,
    supportsOptions,
    supportsTextAnswer,
    optionsAreLocked,
    allowsAddOption,
    allowsRemoveOption,
    optionsHint,
  };
}
