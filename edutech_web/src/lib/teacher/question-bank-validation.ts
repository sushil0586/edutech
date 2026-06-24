import { TeacherBuilderApiError } from "@/lib/api/teacher-builder-error";

export type QuestionBankValidationErrors = Record<string, string[]>;

const GENERAL_FIELDS = new Set(["__all__", "non_field_errors", "detail"]);

function normalizeMessages(value: unknown): string[] {
  if (typeof value === "string") {
    return value.trim() ? [value.trim()] : [];
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : String(item ?? "").trim()))
      .filter(Boolean);
  }

  return [];
}

export function extractQuestionBankValidationErrors(error: unknown): QuestionBankValidationErrors {
  if (!(error instanceof TeacherBuilderApiError) || !error.payload) {
    return {};
  }

  const errors: QuestionBankValidationErrors = {};

  Object.entries(error.payload).forEach(([key, value]) => {
    const messages = normalizeMessages(value);
    if (messages.length) {
      errors[key] = messages;
    }
  });

  return errors;
}

export function getQuestionBankErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return fallbackMessage;
}

export function buildQuestionBankErrorSearch(error: unknown, fallbackMessage: string) {
  const params = new URLSearchParams();
  params.set("error", getQuestionBankErrorMessage(error, fallbackMessage));

  const validationErrors = extractQuestionBankValidationErrors(error);
  if (Object.keys(validationErrors).length) {
    params.set("validation", JSON.stringify(validationErrors));
  }

  return params.toString();
}

export function parseQuestionBankValidationErrors(
  raw: string | string[] | undefined,
): QuestionBankValidationErrors {
  const value = Array.isArray(raw) ? raw[0] ?? "" : raw ?? "";
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const normalized: QuestionBankValidationErrors = {};

    Object.entries(parsed).forEach(([key, fieldValue]) => {
      const messages = normalizeMessages(fieldValue);
      if (messages.length) {
        normalized[key] = messages;
      }
    });

    return normalized;
  } catch {
    return {};
  }
}

export function getQuestionBankFieldError(
  errors: QuestionBankValidationErrors | undefined,
  field: string,
) {
  const messages = errors?.[field];
  return messages?.length ? messages[0] : "";
}

export function getQuestionBankGeneralErrors(errors: QuestionBankValidationErrors | undefined) {
  if (!errors) {
    return [] as string[];
  }

  return Object.entries(errors)
    .filter(([field]) => GENERAL_FIELDS.has(field))
    .flatMap(([, messages]) => messages);
}

export function getQuestionBankFieldErrorEntries(errors: QuestionBankValidationErrors | undefined) {
  if (!errors) {
    return [] as Array<[string, string[]]>;
  }

  return Object.entries(errors).filter(([field]) => !GENERAL_FIELDS.has(field));
}

export function getQuestionBankFieldLabel(field: string) {
  switch (field) {
    case "program":
      return "Program";
    case "subject":
      return "Subject";
    case "topic":
      return "Topic";
    case "passage":
      return "Comprehension set";
    case "passage_order":
      return "Comprehension order";
    case "question_type":
      return "Question type";
    case "difficulty_level":
      return "Difficulty";
    case "content_format":
      return "Content format";
    case "question_text":
      return "Question text";
    case "explanation":
      return "Explanation";
    case "accepted_answers":
      return "Accepted answers";
    case "numeric_tolerance":
      return "Numeric tolerance";
    case "review_guidance":
      return "Review guidance";
    case "default_marks":
      return "Default marks";
    case "negative_marks":
      return "Negative marks";
    case "title":
      return "Set title";
    case "passage_text":
      return "Passage text";
    case "description":
      return "Teacher notes";
    default:
      return field.replaceAll("_", " ");
  }
}
