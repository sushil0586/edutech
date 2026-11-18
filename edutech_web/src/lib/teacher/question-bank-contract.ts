export const QUESTION_BANK_FIELD_NAMES = {
  assertionText: "assertion_text",
  reasonText: "reason_text",
  matrixLeftItems: "matrix_left_items",
  matrixRightItems: "matrix_right_items",
  acceptedAnswers: "accepted_answers",
  numericTolerance: "numeric_tolerance",
  reviewGuidance: "review_guidance",
  questionType: "question_type",
  difficultyLevel: "difficulty_level",
  questionText: "question_text",
  explanation: "explanation",
  defaultMarks: "default_marks",
  negativeMarks: "negative_marks",
} as const;

export const QUESTION_BANK_METADATA_KEYS = {
  assertionReason: "assertion_reason",
  matrixMatch: "matrix_match",
  leftItems: "left_items",
  rightItems: "right_items",
} as const;

export const QUESTION_BANK_FIELD_LABELS: Record<string, string> = {
  program: "Program",
  subject: "Subject",
  topic: "Topic",
  passage: "Comprehension set",
  passage_order: "Comprehension order",
  [QUESTION_BANK_FIELD_NAMES.questionType]: "Question type",
  [QUESTION_BANK_FIELD_NAMES.difficultyLevel]: "Difficulty",
  content_format: "Content format",
  [QUESTION_BANK_FIELD_NAMES.questionText]: "Question text",
  [QUESTION_BANK_FIELD_NAMES.explanation]: "Explanation",
  [QUESTION_BANK_FIELD_NAMES.acceptedAnswers]: "Accepted answers",
  [QUESTION_BANK_FIELD_NAMES.numericTolerance]: "Numeric tolerance",
  [QUESTION_BANK_FIELD_NAMES.reviewGuidance]: "Review guidance",
  [QUESTION_BANK_FIELD_NAMES.defaultMarks]: "Default marks",
  [QUESTION_BANK_FIELD_NAMES.negativeMarks]: "Negative marks",
  title: "Set title",
  passage_text: "Passage text",
  description: "Teacher notes",
};

export const QUESTION_IMPORT_OPTION_COLUMNS = [
  "option_1",
  "option_2",
  "option_3",
  "option_4",
] as const;
