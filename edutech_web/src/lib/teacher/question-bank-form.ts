type QuestionOptionPayload = {
  id?: string;
  content_format: string;
  option_text: string;
  option_order: number;
  is_correct: boolean;
  is_active: boolean;
};

function readCheckbox(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function readString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function readNullableString(formData: FormData, name: string) {
  const value = readString(formData, name);
  return value || null;
}

function readNumberString(formData: FormData, name: string, fallback: string) {
  const value = readString(formData, name);
  return value || fallback;
}

function readDelimitedValues(formData: FormData, name: string) {
  return String(formData.get(name) ?? "")
    .split(/\r?\n|,/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseOptionsPayload(formData: FormData) {
  const raw = readString(formData, "options_payload");
  const questionContentFormat = readString(formData, "content_format");
  if (!raw) {
    return [] as QuestionOptionPayload[];
  }

  try {
    const parsed = JSON.parse(raw) as QuestionOptionPayload[];
    return parsed.map((option, index) => ({
      ...(option.id ? { id: option.id } : {}),
      content_format: option.content_format || questionContentFormat,
      option_text: String(option.option_text ?? ""),
      option_order: index + 1,
      is_correct: Boolean(option.is_correct),
      is_active: option.is_active ?? true,
    }));
  } catch {
    return [];
  }
}

export function buildTeacherQuestionPayload(
  formData: FormData,
  context: {
    institute: string;
    teacherProfile: string | null;
  },
) {
  const assertionText = readString(formData, "assertion_text");
  const reasonText = readString(formData, "reason_text");
  const matrixLeftItems = readDelimitedValues(formData, "matrix_left_items");
  const matrixRightItems = readDelimitedValues(formData, "matrix_right_items");

  return {
    institute: context.institute,
    program: readNullableString(formData, "program"),
    subject: readString(formData, "subject"),
    topic: readNullableString(formData, "topic"),
    created_by_teacher: context.teacherProfile,
    passage: readNullableString(formData, "passage"),
    passage_order: (() => {
      const value = readString(formData, "passage_order");
      return value ? Number(value) : null;
    })(),
    question_type: readString(formData, "question_type"),
    difficulty_level: readString(formData, "difficulty_level"),
    content_format: readString(formData, "content_format"),
    question_text: readString(formData, "question_text"),
    assertion_text: assertionText,
    reason_text: reasonText,
    matrix_left_items: matrixLeftItems,
    matrix_right_items: matrixRightItems,
    explanation: readString(formData, "explanation"),
    accepted_answers: readDelimitedValues(formData, "accepted_answers"),
    numeric_tolerance: readNullableString(formData, "numeric_tolerance"),
    review_guidance: readString(formData, "review_guidance"),
    default_marks: readNumberString(formData, "default_marks", "1.00"),
    negative_marks: readNumberString(formData, "negative_marks", "0.00"),
    is_active: readCheckbox(formData, "is_active"),
    is_verified: readCheckbox(formData, "is_verified"),
    metadata: {
      is_draft: readCheckbox(formData, "is_draft"),
      ...(assertionText || reasonText
        ? {
            assertion_reason: {
              assertion_text: assertionText,
              reason_text: reasonText,
            },
          }
        : {}),
      ...(matrixLeftItems.length || matrixRightItems.length
        ? {
            matrix_match: {
              left_items: matrixLeftItems,
              right_items: matrixRightItems,
            },
          }
        : {}),
    },
    options: parseOptionsPayload(formData),
  };
}

export function buildTeacherQuestionPassagePayload(
  formData: FormData,
  context: {
    institute: string;
    teacherProfile: string | null;
  },
) {
  return {
    institute: context.institute,
    program: readNullableString(formData, "program"),
    subject: readString(formData, "subject"),
    topic: readNullableString(formData, "topic"),
    created_by_teacher: context.teacherProfile,
    title: readString(formData, "title"),
    content_format: readString(formData, "content_format"),
    passage_text: readString(formData, "passage_text"),
    description: readString(formData, "description"),
    is_active: readCheckbox(formData, "is_active"),
    metadata: {
      is_draft: readCheckbox(formData, "is_draft"),
    },
  };
}
