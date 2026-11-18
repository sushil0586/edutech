import {
  QUESTION_BANK_FIELD_NAMES,
  QUESTION_IMPORT_OPTION_COLUMNS,
} from "@/lib/teacher/question-bank-contract";

export const QUESTION_IMPORT_COLUMNS = [
  "subject",
  "topic",
  "passage_title",
  "passage_order",
  QUESTION_BANK_FIELD_NAMES.questionType,
  QUESTION_BANK_FIELD_NAMES.difficultyLevel,
  QUESTION_BANK_FIELD_NAMES.questionText,
  QUESTION_BANK_FIELD_NAMES.assertionText,
  QUESTION_BANK_FIELD_NAMES.reasonText,
  QUESTION_BANK_FIELD_NAMES.matrixLeftItems,
  QUESTION_BANK_FIELD_NAMES.matrixRightItems,
  ...QUESTION_IMPORT_OPTION_COLUMNS,
  "correct_answer",
  QUESTION_BANK_FIELD_NAMES.acceptedAnswers,
  QUESTION_BANK_FIELD_NAMES.numericTolerance,
  QUESTION_BANK_FIELD_NAMES.reviewGuidance,
  QUESTION_BANK_FIELD_NAMES.defaultMarks,
  QUESTION_BANK_FIELD_NAMES.negativeMarks,
  QUESTION_BANK_FIELD_NAMES.explanation,
  "tags",
] as const;

export const QUESTION_IMPORT_TYPE_GUIDANCE =
  "Use correct_answer for MCQ and true/false rows. Use accepted_answers for short-answer and numeric rows with pipe-separated values like 2.5|2.50. Use numeric_tolerance only for numeric rows and review_guidance only for essay manual-review rows. Use passage_title and passage_order only when a question should link to an existing comprehension set.";

export const QUESTION_IMPORT_FALLBACK_SAMPLE_ROW = [
  "Mathematics",
  "Algebra",
  "",
  "",
  "mcq_single",
  "foundation",
  "What is 2 + 2?",
  "",
  "",
  "",
  "",
  "3",
  "4",
  "",
  "",
  "2",
  "",
  "",
  "",
  "1.00",
  "0.00",
  "4 is the correct answer because 2 plus 2 equals 4.",
  "arithmetic|foundation",
] as const;
